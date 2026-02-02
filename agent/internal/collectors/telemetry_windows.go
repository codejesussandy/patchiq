//go:build windows

package collectors

import (
	"os"
	"log"
	"os/exec"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/patchify/agent/internal/models"
)

// WindowsTelemetryCollector collects telemetry on Windows
type WindowsTelemetryCollector struct{}

// NewWindowsTelemetryCollector creates a new telemetry collector for Windows
func NewWindowsTelemetryCollector() *WindowsTelemetryCollector {
	return &WindowsTelemetryCollector{}
}

// Name returns the collector name
func (c *WindowsTelemetryCollector) Name() string {
	return "telemetry"
}

// Collect gathers telemetry data
func (c *WindowsTelemetryCollector) Collect() (interface{}, error) {
	tel := &models.Telemetry{
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}

	tel.CPU = c.collectCPUTelemetry()
	tel.Memory = c.collectMemoryTelemetry()
	tel.Disk = c.collectDiskTelemetry()
	tel.Network = c.collectNetworkTelemetry()
	tel.Processes = c.collectProcessStats()
	tel.SystemErrors = c.collectSystemErrors()
	tel.AgentUtilization = c.collectAgentUtilization()
	tel.Thermal = c.collectThermalTelemetry()
	tel.Power = c.collectPowerTelemetry()
	tel.SystemUptime = c.collectSystemUptime()
	if tel.SystemUptime != nil {
		tel.Uptime = tel.SystemUptime.UptimeSeconds
	}

	return tel, nil
}

func (c *WindowsTelemetryCollector) collectCPUTelemetry() models.CPUTelemetry {
	cpu := models.CPUTelemetry{}

	// Windows: Use wmic cpu for load percentage
	out, err := exec.Command("wmic", "cpu", "get", "LoadPercentage", "/value").Output()
	if err == nil {
		for _, line := range strings.Split(string(out), "\n") {
			line = strings.TrimSpace(line)
			if strings.HasPrefix(line, "LoadPercentage=") {
				if pct, err := strconv.ParseFloat(strings.TrimPrefix(line, "LoadPercentage="), 64); err == nil {
					cpu.UsagePercent = pct
					cpu.IdlePercent = 100 - pct
				}
			}
		}
	} else {
		log.Printf("[telemetry] Failed to get CPU load: %v", err)
	}

	// Get more detailed CPU usage via PowerShell
	if psOut, err := exec.Command("powershell", "-Command", "(Get-Counter '\\Processor(_Total)\\% Processor Time').CounterSamples.CookedValue").Output(); err == nil {
		if pct, err := strconv.ParseFloat(strings.TrimSpace(string(psOut)), 64); err == nil {
			cpu.UsagePercent = pct
			cpu.IdlePercent = 100 - pct
		}
	}

	// Windows doesn't have load average, but we can use processor queue length as an analog
	if psOut, err := exec.Command("powershell", "-Command", "(Get-Counter '\\System\\Processor Queue Length').CounterSamples.CookedValue").Output(); err == nil {
		if queueLen, err := strconv.ParseFloat(strings.TrimSpace(string(psOut)), 64); err == nil {
			cpu.LoadAverage = []float64{queueLen}
		}
	}

	// Get CPU temperature via WMI (may not work on all systems)
	if psOut, err := exec.Command("powershell", "-Command", `Get-WmiObject MSAcpi_ThermalZoneTemperature -Namespace "root/wmi" 2>$null | Select-Object -First 1 -ExpandProperty CurrentTemperature`).Output(); err == nil {
		if temp, err := strconv.ParseFloat(strings.TrimSpace(string(psOut)), 64); err == nil {
			// Convert from tenths of Kelvin to Celsius
			cpu.Temperature = (temp / 10) - 273.15
		}
	}

	return cpu
}

func (c *WindowsTelemetryCollector) collectMemoryTelemetry() models.MemoryTelemetry {
	mem := models.MemoryTelemetry{}

	// Windows: Use wmic for memory info
	out, err := exec.Command("wmic", "OS", "get", "TotalVisibleMemorySize,FreePhysicalMemory", "/value").Output()
	if err == nil {
		for _, line := range strings.Split(string(out), "\n") {
			line = strings.TrimSpace(line)
			if strings.HasPrefix(line, "TotalVisibleMemorySize=") {
				if kb, err := strconv.ParseInt(strings.TrimPrefix(line, "TotalVisibleMemorySize="), 10, 64); err == nil {
					mem.TotalBytes = kb * 1024
				}
			} else if strings.HasPrefix(line, "FreePhysicalMemory=") {
				if kb, err := strconv.ParseInt(strings.TrimPrefix(line, "FreePhysicalMemory="), 10, 64); err == nil {
					mem.FreeBytes = kb * 1024
					mem.AvailableBytes = kb * 1024
				}
			}
		}
	} else {
		log.Printf("[telemetry] Failed to get memory info: %v", err)
	}

	// Get swap/page file info
	if swapOut, err := exec.Command("wmic", "pagefile", "get", "AllocatedBaseSize,CurrentUsage", "/value").Output(); err == nil {
		for _, line := range strings.Split(string(swapOut), "\n") {
			line = strings.TrimSpace(line)
			if strings.HasPrefix(line, "AllocatedBaseSize=") {
				if mb, err := strconv.ParseInt(strings.TrimPrefix(line, "AllocatedBaseSize="), 10, 64); err == nil {
					mem.SwapTotalBytes = mb * 1024 * 1024
				}
			} else if strings.HasPrefix(line, "CurrentUsage=") {
				if mb, err := strconv.ParseInt(strings.TrimPrefix(line, "CurrentUsage="), 10, 64); err == nil {
					mem.SwapUsedBytes = mb * 1024 * 1024
				}
			}
		}
	}

	// UsedBytes = Total - Free (matches what Task Manager shows)
	mem.UsedBytes = mem.TotalBytes - mem.FreeBytes
	mem.ApplicationUsedBytes = mem.UsedBytes

	if mem.TotalBytes > 0 {
		mem.UsagePercent = float64(mem.UsedBytes) / float64(mem.TotalBytes) * 100
	}
	if mem.SwapTotalBytes > 0 {
		mem.SwapUsagePercent = float64(mem.SwapUsedBytes) / float64(mem.SwapTotalBytes) * 100
	}

	mem.UsedHuman = formatBytes(mem.UsedBytes)
	mem.AvailableHuman = formatBytes(mem.AvailableBytes)

	return mem
}

func (c *WindowsTelemetryCollector) collectDiskTelemetry() models.DiskTelemetry {
	disk := models.DiskTelemetry{}

	// Windows: Use wmic logicaldisk for disk usage
	out, err := exec.Command("wmic", "logicaldisk", "where", "drivetype=3", "get", "DeviceID,FreeSpace,Size", "/format:csv").Output()
	if err != nil {
		log.Printf("[telemetry] Failed to get disk info: %v", err)
		return disk
	}

	lines := strings.Split(string(out), "\n")
	for i, line := range lines {
		if i == 0 || strings.TrimSpace(line) == "" {
			continue
		}

		fields := strings.Split(line, ",")
		if len(fields) < 4 {
			continue
		}

		drive := models.DriveTelemetry{
			Name:       strings.TrimSpace(fields[1]),
			MountPoint: strings.TrimSpace(fields[1]),
		}

		if freeBytes, err := strconv.ParseInt(strings.TrimSpace(fields[2]), 10, 64); err == nil {
			drive.AvailableBytes = freeBytes
		}
		if totalBytes, err := strconv.ParseInt(strings.TrimSpace(fields[3]), 10, 64); err == nil {
			drive.TotalBytes = totalBytes
		}

		drive.UsedBytes = drive.TotalBytes - drive.AvailableBytes
		if drive.TotalBytes > 0 {
			drive.UsagePercent = float64(drive.UsedBytes) / float64(drive.TotalBytes) * 100
		}

		drive.UsedHuman = formatBytes(drive.UsedBytes)
		drive.AvailableHuman = formatBytes(drive.AvailableBytes)

		if drive.TotalBytes > 0 {
			disk.Drives = append(disk.Drives, drive)
		}
	}

	return disk
}

func (c *WindowsTelemetryCollector) collectNetworkTelemetry() models.NetworkTelemetry {
	net := models.NetworkTelemetry{}

	net.LatencyMs = c.measureNetworkLatency()

	// Windows: Use wmic nic or netstat
	out, err := exec.Command("wmic", "path", "Win32_PerfRawData_Tcpip_NetworkInterface", "get", "Name,BytesReceivedPersec,BytesSentPersec", "/format:csv").Output()
	if err == nil {
		lines := strings.Split(string(out), "\n")
		for i, line := range lines {
			if i == 0 || strings.TrimSpace(line) == "" {
				continue
			}
			fields := strings.Split(line, ",")
			if len(fields) >= 4 {
				name := strings.TrimSpace(fields[3])
				if strings.Contains(strings.ToLower(name), "loopback") {
					continue
				}

				adapter := models.AdapterTelemetry{
					Name: name,
				}

				if recv, err := strconv.ParseInt(strings.TrimSpace(fields[1]), 10, 64); err == nil {
					adapter.BytesReceived = recv
					net.BytesReceivedPerSec += recv
				}
				if sent, err := strconv.ParseInt(strings.TrimSpace(fields[2]), 10, 64); err == nil {
					adapter.BytesSent = sent
					net.BytesSentPerSec += sent
				}

				net.Adapters = append(net.Adapters, adapter)
			}
		}
	}

	// Alternative: use netstat -e for total statistics
	if len(net.Adapters) == 0 {
		if out, err := exec.Command("netstat", "-e").Output(); err == nil {
			lines := strings.Split(string(out), "\n")
			for _, line := range lines {
				fields := strings.Fields(line)
				if len(fields) >= 3 && fields[0] == "Bytes" {
					if recv, err := strconv.ParseInt(fields[1], 10, 64); err == nil {
						net.BytesReceivedPerSec = recv
					}
					if sent, err := strconv.ParseInt(fields[2], 10, 64); err == nil {
						net.BytesSentPerSec = sent
					}
				}
			}
		}
	}

	return net
}

func (c *WindowsTelemetryCollector) measureNetworkLatency() float64 {
	targets := []string{
		"8.8.8.8",
		"1.1.1.1",
		"208.67.222.222",
	}

	for _, target := range targets {
		latency := c.pingHost(target)
		if latency > 0 {
			return latency
		}
	}

	return 0
}

func (c *WindowsTelemetryCollector) pingHost(host string) float64 {
	// Windows: -n count, -w timeout in milliseconds
	cmd := exec.Command("ping", "-n", "3", "-w", "1000", host)

	output, err := cmd.Output()
	if err != nil {
		return 0
	}

	return c.parsePingOutput(string(output))
}

func (c *WindowsTelemetryCollector) parsePingOutput(output string) float64 {
	// Windows format: "Average = 15ms" or "Average = 15 ms"
	lines := strings.Split(output, "\n")
	for _, line := range lines {
		line = strings.ToLower(line)
		if strings.Contains(line, "average") {
			re := regexp.MustCompile(`average\s*=\s*(\d+)`)
			if matches := re.FindStringSubmatch(line); len(matches) > 1 {
				if avg, err := strconv.ParseFloat(matches[1], 64); err == nil {
					return avg
				}
			}
		}
	}
	return 0
}

func (c *WindowsTelemetryCollector) collectProcessStats() models.ProcessStats {
	stats := models.ProcessStats{}

	var processes []models.ProcessInfo

	// Get process list with memory info
	out, err := exec.Command("wmic", "process", "get", "ProcessId,Name,WorkingSetSize", "/format:csv").Output()
	if err == nil {
		// Get total memory for calculating percentages
		var totalMem int64
		if memOut, err := exec.Command("wmic", "OS", "get", "TotalVisibleMemorySize", "/value").Output(); err == nil {
			for _, line := range strings.Split(string(memOut), "\n") {
				if strings.HasPrefix(strings.TrimSpace(line), "TotalVisibleMemorySize=") {
					if kb, err := strconv.ParseInt(strings.TrimPrefix(strings.TrimSpace(line), "TotalVisibleMemorySize="), 10, 64); err == nil {
						totalMem = kb * 1024
					}
				}
			}
		}

		lines := strings.Split(string(out), "\n")
		for i, line := range lines {
			if i == 0 || strings.TrimSpace(line) == "" {
				continue
			}
			fields := strings.Split(line, ",")
			if len(fields) >= 4 {
				proc := models.ProcessInfo{
					Name:   strings.TrimSpace(fields[2]),
					Status: "Running",
				}

				if pid, err := strconv.Atoi(strings.TrimSpace(fields[3])); err == nil {
					proc.PID = pid
				}

				// WorkingSetSize is in bytes
				if len(fields) >= 5 {
					if memBytes, err := strconv.ParseInt(strings.TrimSpace(fields[4]), 10, 64); err == nil && totalMem > 0 {
						proc.MemoryPercent = float64(memBytes) / float64(totalMem) * 100
					}
				}

				stats.TotalCount++
				stats.RunningCount++

				processes = append(processes, proc)
			}
		}
	} else {
		log.Printf("[telemetry] Failed to get process list: %v", err)
	}

	// Get CPU usage per process via PowerShell (more accurate)
	if psOut, err := exec.Command("powershell", "-Command", "Get-Process | Sort-Object CPU -Descending | Select-Object -First 10 Id,ProcessName,CPU | Format-List").Output(); err == nil {
		blocks := strings.Split(string(psOut), "\n\n")
		cpuProcesses := make(map[int]float64)

		for _, block := range blocks {
			if strings.TrimSpace(block) == "" {
				continue
			}
			var pid int
			var cpuTime float64

			for _, line := range strings.Split(block, "\n") {
				if strings.Contains(line, "Id") {
					parts := strings.SplitN(line, ":", 2)
					if len(parts) == 2 {
						pid, _ = strconv.Atoi(strings.TrimSpace(parts[1]))
					}
				} else if strings.Contains(line, "CPU") && !strings.Contains(line, "ProcessName") {
					parts := strings.SplitN(line, ":", 2)
					if len(parts) == 2 {
						cpuTime, _ = strconv.ParseFloat(strings.TrimSpace(parts[1]), 64)
					}
				}
			}

			if pid > 0 {
				cpuProcesses[pid] = cpuTime
			}
		}

		for i := range processes {
			if cpuTime, ok := cpuProcesses[processes[i].PID]; ok {
				processes[i].CPUPercent = cpuTime / 100
			}
		}
	}

	sortByCPU(processes)
	if len(processes) > 5 {
		stats.TopByCPU = processes[:5]
	} else {
		stats.TopByCPU = processes
	}

	sortByMemory(processes)
	if len(processes) > 5 {
		stats.TopByMemory = processes[:5]
	} else {
		stats.TopByMemory = processes
	}

	return stats
}

func (c *WindowsTelemetryCollector) collectSystemErrors() models.SystemErrors {
	errors := models.SystemErrors{}

	// Windows: Check Windows Event Log for errors
	thirtyDaysAgoStr := time.Now().AddDate(0, 0, -30).Format("2006-01-02T15:04:05")
	if out, err := exec.Command("powershell", "-Command", `Get-WinEvent -FilterHashtable @{LogName='System'; Level=1,2; StartTime='`+thirtyDaysAgoStr+`'} -ErrorAction SilentlyContinue | Where-Object {$_.ProviderName -like '*kernel*' -or $_.Message -like '*blue screen*' -or $_.Message -like '*bugcheck*'} | Measure-Object | Select-Object -ExpandProperty Count`).Output(); err == nil {
		if count, err := strconv.Atoi(strings.TrimSpace(string(out))); err == nil {
			errors.KernelPanicCount30d = count
		}
	}

	// Check for application crashes in last 24 hours
	twentyFourHoursAgoStr := time.Now().Add(-24 * time.Hour).Format("2006-01-02T15:04:05")
	if out, err := exec.Command("powershell", "-Command", `Get-WinEvent -FilterHashtable @{LogName='Application'; Level=1,2; StartTime='`+twentyFourHoursAgoStr+`'} -ErrorAction SilentlyContinue | Where-Object {$_.ProviderName -eq 'Application Error' -or $_.ProviderName -eq 'Windows Error Reporting'} | Measure-Object | Select-Object -ExpandProperty Count`).Output(); err == nil {
		if count, err := strconv.Atoi(strings.TrimSpace(string(out))); err == nil {
			errors.ApplicationCrashCount24h = count
		}
	}

	// Get last crash info
	if out, err := exec.Command("powershell", "-Command", `Get-WinEvent -FilterHashtable @{LogName='Application'; Level=1,2} -MaxEvents 1 -ErrorAction SilentlyContinue | Where-Object {$_.ProviderName -eq 'Application Error'} | Select-Object TimeCreated, Message | Format-List`).Output(); err == nil {
		output := string(out)
		if strings.TrimSpace(output) != "" {
			crashInfo := &models.CrashInfo{}

			for _, line := range strings.Split(output, "\n") {
				if strings.Contains(line, "TimeCreated") {
					parts := strings.SplitN(line, ":", 2)
					if len(parts) == 2 {
						crashInfo.Timestamp = strings.TrimSpace(parts[1])
					}
				} else if strings.Contains(line, "Message") {
					parts := strings.SplitN(line, ":", 2)
					if len(parts) == 2 {
						msg := strings.TrimSpace(parts[1])
						if idx := strings.Index(msg, ","); idx > 0 {
							crashInfo.Application = strings.TrimSpace(msg[:idx])
						} else {
							crashInfo.Application = msg
						}
					}
				}
			}

			if crashInfo.Application != "" {
				errors.LastCrash = crashInfo
			}
		}
	}

	return errors
}

func (c *WindowsTelemetryCollector) collectAgentUtilization() *models.AgentUtilization {
	util := &models.AgentUtilization{
		PID:        os.Getpid(),
		Goroutines: runtime.NumGoroutine(),
		Version:    "1.0.0",
	}

	if agentStartTime.IsZero() {
		agentStartTime = time.Now()
	}

	util.UptimeSeconds = int64(time.Since(agentStartTime).Seconds())
	util.UptimeHuman = formatDuration(time.Since(agentStartTime))

	pid := os.Getpid()

	// Windows: Use wmic process or PowerShell
	cmdStr := `Get-Process -Id ` + strconv.Itoa(pid) + ` | Select-Object CPU, WorkingSet64, Threads | ConvertTo-Json`
	if out, err := exec.Command("powershell", "-Command", cmdStr).Output(); err == nil {
		output := string(out)

		if strings.Contains(output, "WorkingSet64") {
			re := regexp.MustCompile(`"WorkingSet64"\s*:\s*(\d+)`)
			if matches := re.FindStringSubmatch(output); len(matches) > 1 {
				if memBytes, err := strconv.ParseInt(matches[1], 10, 64); err == nil {
					util.MemoryBytes = memBytes
					util.MemoryHuman = formatBytes(util.MemoryBytes)
				}
			}
		}

		re := regexp.MustCompile(`"Threads"\s*:\s*\[\s*.*?\]|"Count"\s*:\s*(\d+)`)
		if matches := re.FindStringSubmatch(output); len(matches) > 1 && matches[1] != "" {
			if threads, err := strconv.Atoi(matches[1]); err == nil {
				util.ThreadCount = threads
			}
		}
	}

	// Get total system memory for percentage calculation
	if out, err := exec.Command("wmic", "OS", "get", "TotalVisibleMemorySize", "/value").Output(); err == nil {
		for _, line := range strings.Split(string(out), "\n") {
			if strings.HasPrefix(strings.TrimSpace(line), "TotalVisibleMemorySize=") {
				if kb, err := strconv.ParseInt(strings.TrimPrefix(strings.TrimSpace(line), "TotalVisibleMemorySize="), 10, 64); err == nil {
					totalMem := kb * 1024
					if totalMem > 0 && util.MemoryBytes > 0 {
						util.MemoryPercent = float64(util.MemoryBytes) / float64(totalMem) * 100
					}
				}
			}
		}
	}

	// Get handle count using PowerShell
	handleCmd := `(Get-Process -Id ` + strconv.Itoa(pid) + `).HandleCount`
	if out, err := exec.Command("powershell", "-Command", handleCmd).Output(); err == nil {
		if handles, err := strconv.Atoi(strings.TrimSpace(string(out))); err == nil {
			util.OpenFileHandles = handles
		}
	}

	return util
}

func (c *WindowsTelemetryCollector) collectThermalTelemetry() *models.ThermalTelemetry {
	thermal := &models.ThermalTelemetry{}
	var sensors []models.ThermalSensor

	// Windows: Use WMI for thermal zone temperatures
	cmd := `Get-WmiObject MSAcpi_ThermalZoneTemperature -Namespace "root/wmi" 2>$null | Select-Object InstanceName, CurrentTemperature | ConvertTo-Json`
	if out, err := exec.Command("powershell", "-Command", cmd).Output(); err == nil {
		output := strings.TrimSpace(string(out))
		if output != "" && output != "null" {
			re := regexp.MustCompile(`"CurrentTemperature"\s*:\s*(\d+)`)
			matches := re.FindAllStringSubmatch(output, -1)
			for i, match := range matches {
				if len(match) > 1 {
					if temp, err := strconv.ParseFloat(match[1], 64); err == nil {
						tempC := (temp / 10) - 273.15
						if i == 0 {
							thermal.CPUTemperature = tempC
						}
						sensors = append(sensors, models.ThermalSensor{
							Name:        "ThermalZone" + strconv.Itoa(i),
							Location:    "CPU",
							Temperature: tempC,
							Status:      getThermalStatus(tempC, 80, 95),
						})
					}
				}
			}
		}
	}

	// Try Open Hardware Monitor / LibreHardwareMonitor WMI if available
	cmd = `Get-WmiObject -Namespace "root/OpenHardwareMonitor" -Class Sensor 2>$null | Where-Object {$_.SensorType -eq 'Temperature'} | Select-Object Name, Value | ConvertTo-Json`
	if out, err := exec.Command("powershell", "-Command", cmd).Output(); err == nil {
		output := strings.TrimSpace(string(out))
		if output != "" && output != "null" {
			re := regexp.MustCompile(`"Name"\s*:\s*"([^"]+)"[^}]*"Value"\s*:\s*([\d.]+)`)
			matches := re.FindAllStringSubmatch(output, -1)
			for _, match := range matches {
				if len(match) > 2 {
					name := match[1]
					if temp, err := strconv.ParseFloat(match[2], 64); err == nil {
						location := "Unknown"
						if strings.Contains(strings.ToLower(name), "cpu") {
							location = "CPU"
							if thermal.CPUTemperature == 0 {
								thermal.CPUTemperature = temp
							}
						} else if strings.Contains(strings.ToLower(name), "gpu") {
							location = "GPU"
							if thermal.GPUTemperature == 0 {
								thermal.GPUTemperature = temp
							}
						}
						sensors = append(sensors, models.ThermalSensor{
							Name:        name,
							Location:    location,
							Temperature: temp,
							Status:      getThermalStatus(temp, 80, 95),
						})
					}
				}
			}
		}
	}

	thermal.Sensors = sensors

	if thermal.CPUTemperature == 0 && thermal.GPUTemperature == 0 && len(sensors) == 0 {
		return nil
	}

	return thermal
}

func (c *WindowsTelemetryCollector) collectPowerTelemetry() *models.PowerTelemetry {
	power := &models.PowerTelemetry{}

	// Windows: Use WMI for battery info
	cmd := `Get-WmiObject Win32_Battery 2>$null | Select-Object BatteryStatus, EstimatedChargeRemaining, EstimatedRunTime, DesignCapacity, FullChargeCapacity | ConvertTo-Json`
	if out, err := exec.Command("powershell", "-Command", cmd).Output(); err == nil {
		output := strings.TrimSpace(string(out))
		if output != "" && output != "null" {
			// EstimatedChargeRemaining
			re := regexp.MustCompile(`"EstimatedChargeRemaining"\s*:\s*(\d+)`)
			if matches := re.FindStringSubmatch(output); len(matches) > 1 {
				if pct, err := strconv.ParseFloat(matches[1], 64); err == nil {
					power.BatteryPresent = true
					power.BatteryPercent = pct
				}
			}

			// BatteryStatus: 1=Discharging, 2=AC, 3-5=Charging variants
			re = regexp.MustCompile(`"BatteryStatus"\s*:\s*(\d+)`)
			if matches := re.FindStringSubmatch(output); len(matches) > 1 {
				status, _ := strconv.Atoi(matches[1])
				if status >= 2 {
					power.ACConnected = true
					power.PowerSource = "AC"
				}
				if status >= 3 && status <= 5 {
					power.BatteryCharging = true
				}
			}

			// EstimatedRunTime in minutes
			re = regexp.MustCompile(`"EstimatedRunTime"\s*:\s*(\d+)`)
			if matches := re.FindStringSubmatch(output); len(matches) > 1 {
				if mins, err := strconv.Atoi(matches[1]); err == nil && mins < 71582788 {
					power.TimeRemaining = mins
				}
			}

			// Battery health from capacity comparison
			var designCap, fullCap int64
			re = regexp.MustCompile(`"DesignCapacity"\s*:\s*(\d+)`)
			if matches := re.FindStringSubmatch(output); len(matches) > 1 {
				designCap, _ = strconv.ParseInt(matches[1], 10, 64)
			}
			re = regexp.MustCompile(`"FullChargeCapacity"\s*:\s*(\d+)`)
			if matches := re.FindStringSubmatch(output); len(matches) > 1 {
				fullCap, _ = strconv.ParseInt(matches[1], 10, 64)
			}
			if designCap > 0 && fullCap > 0 {
				power.BatteryHealth = float64(fullCap) / float64(designCap) * 100
			}
		}
	}

	// Check if on AC power (no battery or AC connected)
	if !power.BatteryPresent {
		power.ACConnected = true
		power.PowerSource = "AC"
	}

	return power
}

func (c *WindowsTelemetryCollector) collectSystemUptime() *models.SystemUptime {
	uptime := &models.SystemUptime{}

	// Windows: Use wmic to get LastBootUpTime
	out, err := exec.Command("wmic", "os", "get", "LastBootUpTime", "/value").Output()
	if err == nil {
		for _, line := range strings.Split(string(out), "\n") {
			line = strings.TrimSpace(line)
			if strings.HasPrefix(line, "LastBootUpTime=") {
				bootStr := strings.TrimPrefix(line, "LastBootUpTime=")
				// Format: 20231215123456.123456+000
				if len(bootStr) >= 14 {
					year, _ := strconv.Atoi(bootStr[0:4])
					month, _ := strconv.Atoi(bootStr[4:6])
					day, _ := strconv.Atoi(bootStr[6:8])
					hour, _ := strconv.Atoi(bootStr[8:10])
					minute, _ := strconv.Atoi(bootStr[10:12])
					second, _ := strconv.Atoi(bootStr[12:14])

					bootTime := time.Date(year, time.Month(month), day, hour, minute, second, 0, time.Local)
					uptime.BootTime = bootTime.Format(time.RFC3339)
					uptime.UptimeSeconds = int64(time.Since(bootTime).Seconds())
					uptime.UptimeHuman = formatDuration(time.Since(bootTime))
				}
			}
		}
	}

	if uptime.UptimeSeconds == 0 {
		return nil
	}

	return uptime
}
