package collectors

import (
	"os"
	"os/exec"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/patchify/agent/internal/models"
)

// DarwinTelemetryCollector collects telemetry on macOS
type DarwinTelemetryCollector struct{}

// NewDarwinTelemetryCollector creates a new telemetry collector for macOS
func NewDarwinTelemetryCollector() *DarwinTelemetryCollector {
	return &DarwinTelemetryCollector{}
}

// Name returns the collector name
func (c *DarwinTelemetryCollector) Name() string {
	return "telemetry"
}

// agentStartTime tracks when the agent started (set on first collection)
var agentStartTime time.Time

// Collect gathers telemetry data
func (c *DarwinTelemetryCollector) Collect() (interface{}, error) {
	tel := &models.Telemetry{
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}

	// Collect CPU metrics
	tel.CPU = c.collectCPUTelemetry()

	// Collect memory metrics
	tel.Memory = c.collectMemoryTelemetry()

	// Collect disk metrics
	tel.Disk = c.collectDiskTelemetry()

	// Collect network metrics
	tel.Network = c.collectNetworkTelemetry()

	// Collect process stats
	tel.Processes = c.collectProcessStats()

	// Collect system errors
	tel.SystemErrors = c.collectSystemErrors()

	// Collect agent's own utilization metrics
	tel.AgentUtilization = c.collectAgentUtilization()

	// Collect thermal/temperature data
	tel.Thermal = c.collectThermalTelemetry()

	// Collect power/battery data
	tel.Power = c.collectPowerTelemetry()

	return tel, nil
}

func (c *DarwinTelemetryCollector) collectCPUTelemetry() models.CPUTelemetry {
	cpu := models.CPUTelemetry{}

	switch runtime.GOOS {
	case "darwin":
		// Use top for CPU usage
		out, err := exec.Command("top", "-l", "1", "-n", "0", "-s", "0").Output()
		if err == nil {
			lines := strings.Split(string(out), "\n")
			for _, line := range lines {
				if strings.Contains(line, "CPU usage:") {
					// Format: CPU usage: 5.26% user, 10.52% sys, 84.21% idle
					parts := strings.Split(line, ",")
					for _, part := range parts {
						part = strings.TrimSpace(part)
						if strings.Contains(part, "user") {
							if pct := extractPercent(part); pct >= 0 {
								cpu.UserPercent = pct
							}
						} else if strings.Contains(part, "sys") {
							if pct := extractPercent(part); pct >= 0 {
								cpu.SystemPercent = pct
							}
						} else if strings.Contains(part, "idle") {
							if pct := extractPercent(part); pct >= 0 {
								cpu.IdlePercent = pct
							}
						}
					}
					cpu.UsagePercent = cpu.UserPercent + cpu.SystemPercent
				}
			}
		}

		// Get load average
		if out, err := exec.Command("sysctl", "-n", "vm.loadavg").Output(); err == nil {
			// Format: { 1.25 1.50 1.75 }
			loadStr := strings.Trim(string(out), "{ }\n")
			parts := strings.Fields(loadStr)
			for i, part := range parts {
				if i >= 3 {
					break
				}
				if load, err := strconv.ParseFloat(part, 64); err == nil {
					cpu.LoadAverage = append(cpu.LoadAverage, load)
				}
			}
		}

		// Get CPU temperature using powermetrics (requires sudo) or osx-cpu-temp if available
		// Try osx-cpu-temp first (can be installed via homebrew)
		if out, err := exec.Command("osx-cpu-temp", "-C").Output(); err == nil {
			tempStr := strings.TrimSpace(string(out))
			tempStr = strings.TrimSuffix(tempStr, "°C")
			if temp, err := strconv.ParseFloat(tempStr, 64); err == nil {
				cpu.Temperature = temp
			}
		}

	case "windows":
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
				// Windows uses processor queue length instead of load average
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

	default:
		// Linux: Read from /proc/stat
		data, err := os.ReadFile("/proc/stat")
		if err == nil {
			lines := strings.Split(string(data), "\n")
			for _, line := range lines {
				if strings.HasPrefix(line, "cpu ") {
					fields := strings.Fields(line)
					if len(fields) >= 5 {
						user, _ := strconv.ParseFloat(fields[1], 64)
						nice, _ := strconv.ParseFloat(fields[2], 64)
						system, _ := strconv.ParseFloat(fields[3], 64)
						idle, _ := strconv.ParseFloat(fields[4], 64)

						total := user + nice + system + idle
						if total > 0 {
							cpu.UserPercent = (user + nice) / total * 100
							cpu.SystemPercent = system / total * 100
							cpu.IdlePercent = idle / total * 100
							cpu.UsagePercent = cpu.UserPercent + cpu.SystemPercent
						}
					}
					break
				}
			}
		}

		// Get load average
		if data, err := os.ReadFile("/proc/loadavg"); err == nil {
			parts := strings.Fields(string(data))
			for i := 0; i < 3 && i < len(parts); i++ {
				if load, err := strconv.ParseFloat(parts[i], 64); err == nil {
					cpu.LoadAverage = append(cpu.LoadAverage, load)
				}
			}
		}

		// Get CPU temperature from thermal zones
		tempFiles, _ := os.ReadDir("/sys/class/thermal")
		for _, f := range tempFiles {
			if strings.HasPrefix(f.Name(), "thermal_zone") {
				tempPath := "/sys/class/thermal/" + f.Name() + "/temp"
				if data, err := os.ReadFile(tempPath); err == nil {
					if temp, err := strconv.ParseFloat(strings.TrimSpace(string(data)), 64); err == nil {
						cpu.Temperature = temp / 1000 // Convert from millidegrees
						break
					}
				}
			}
		}
	}

	return cpu
}

func (c *DarwinTelemetryCollector) collectMemoryTelemetry() models.MemoryTelemetry {
	mem := models.MemoryTelemetry{}

	switch runtime.GOOS {
	case "darwin":
		// Get total memory
		if out, err := exec.Command("sysctl", "-n", "hw.memsize").Output(); err == nil {
			if total, err := strconv.ParseInt(strings.TrimSpace(string(out)), 10, 64); err == nil {
				mem.TotalBytes = total
			}
		}

		// Get memory usage using vm_stat
		if out, err := exec.Command("vm_stat").Output(); err == nil {
			lines := strings.Split(string(out), "\n")
			pageSize := int64(4096) // Default page size

			var freePages, activePages, inactivePages, wiredPages, compressedPages int64

			for _, line := range lines {
				if strings.HasPrefix(line, "Mach Virtual Memory Statistics") {
					// Extract page size if present
					continue
				}

				parts := strings.Split(line, ":")
				if len(parts) != 2 {
					continue
				}

				key := strings.TrimSpace(parts[0])
				valueStr := strings.TrimSpace(strings.TrimSuffix(parts[1], "."))
				value, _ := strconv.ParseInt(valueStr, 10, 64)

				switch key {
				case "Pages free":
					freePages = value
				case "Pages active":
					activePages = value
				case "Pages inactive":
					inactivePages = value
				case "Pages wired down":
					wiredPages = value
				case "Pages occupied by compressor":
					compressedPages = value
				}
			}

			freeBytes := freePages * pageSize
			usedBytes := (activePages + wiredPages + compressedPages) * pageSize

			mem.AvailableBytes = freeBytes + (inactivePages * pageSize)
			mem.UsedBytes = usedBytes

			if mem.TotalBytes > 0 {
				mem.UsagePercent = float64(usedBytes) / float64(mem.TotalBytes) * 100
			}
		}

		// Get swap info
		if out, err := exec.Command("sysctl", "-n", "vm.swapusage").Output(); err == nil {
			// Format: total = 2048.00M  used = 500.00M  free = 1548.00M  (encrypted)
			parts := strings.Fields(string(out))
			for i, part := range parts {
				if part == "total" && i+2 < len(parts) {
					if size := parseMemorySize(parts[i+2]); size > 0 {
						mem.SwapTotalBytes = size
					}
				} else if part == "used" && i+2 < len(parts) {
					if size := parseMemorySize(parts[i+2]); size > 0 {
						mem.SwapUsedBytes = size
					}
				}
			}
			if mem.SwapTotalBytes > 0 {
				mem.SwapUsagePercent = float64(mem.SwapUsedBytes) / float64(mem.SwapTotalBytes) * 100
			}
		}

	case "windows":
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
						mem.AvailableBytes = kb * 1024
					}
				}
			}
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

		mem.UsedBytes = mem.TotalBytes - mem.AvailableBytes
		if mem.TotalBytes > 0 {
			mem.UsagePercent = float64(mem.UsedBytes) / float64(mem.TotalBytes) * 100
		}
		if mem.SwapTotalBytes > 0 {
			mem.SwapUsagePercent = float64(mem.SwapUsedBytes) / float64(mem.SwapTotalBytes) * 100
		}

	default:
		// Linux: Read from /proc/meminfo
		data, err := os.ReadFile("/proc/meminfo")
		if err == nil {
			lines := strings.Split(string(data), "\n")
			for _, line := range lines {
				parts := strings.Fields(line)
				if len(parts) < 2 {
					continue
				}

				key := strings.TrimSuffix(parts[0], ":")
				value, _ := strconv.ParseInt(parts[1], 10, 64)
				value *= 1024 // Convert from KB to bytes

				switch key {
				case "MemTotal":
					mem.TotalBytes = value
				case "MemAvailable":
					mem.AvailableBytes = value
				case "SwapTotal":
					mem.SwapTotalBytes = value
				case "SwapFree":
					mem.SwapUsedBytes = mem.SwapTotalBytes - value
				}
			}

			mem.UsedBytes = mem.TotalBytes - mem.AvailableBytes
			if mem.TotalBytes > 0 {
				mem.UsagePercent = float64(mem.UsedBytes) / float64(mem.TotalBytes) * 100
			}
			if mem.SwapTotalBytes > 0 {
				mem.SwapUsagePercent = float64(mem.SwapUsedBytes) / float64(mem.SwapTotalBytes) * 100
			}
		}
	}

	mem.UsedHuman = formatBytes(mem.UsedBytes)
	mem.AvailableHuman = formatBytes(mem.AvailableBytes)

	return mem
}

func (c *DarwinTelemetryCollector) collectDiskTelemetry() models.DiskTelemetry {
	disk := models.DiskTelemetry{}

	// Use df for disk usage
	out, err := exec.Command("df", "-k").Output()
	if err != nil {
		return disk
	}

	lines := strings.Split(string(out), "\n")
	for i, line := range lines {
		if i == 0 { // Skip header
			continue
		}

		fields := strings.Fields(line)
		if len(fields) < 6 {
			continue
		}

		// Skip non-physical drives
		if !strings.HasPrefix(fields[0], "/dev/") {
			continue
		}

		// Skip small/system volumes
		if strings.Contains(fields[0], "devfs") || strings.Contains(fields[0], "map") {
			continue
		}

		drive := models.DriveTelemetry{
			Name:       fields[0],
			MountPoint: fields[len(fields)-1],
		}

		// Parse sizes (in KB)
		if total, err := strconv.ParseInt(fields[1], 10, 64); err == nil {
			drive.TotalBytes = total * 1024
		}
		if used, err := strconv.ParseInt(fields[2], 10, 64); err == nil {
			drive.UsedBytes = used * 1024
		}
		if avail, err := strconv.ParseInt(fields[3], 10, 64); err == nil {
			drive.AvailableBytes = avail * 1024
		}

		if drive.TotalBytes > 0 {
			drive.UsagePercent = float64(drive.UsedBytes) / float64(drive.TotalBytes) * 100
		}

		drive.UsedHuman = formatBytes(drive.UsedBytes)
		drive.AvailableHuman = formatBytes(drive.AvailableBytes)

		disk.Drives = append(disk.Drives, drive)
	}

	return disk
}

func (c *DarwinTelemetryCollector) collectNetworkTelemetry() models.NetworkTelemetry {
	net := models.NetworkTelemetry{}

	// Measure network latency first
	net.LatencyMs = c.measureNetworkLatency()

	switch runtime.GOOS {
	case "darwin":
		// Use netstat for network stats
		out, err := exec.Command("netstat", "-ib").Output()
		if err != nil {
			return net
		}

		lines := strings.Split(string(out), "\n")
		for i, line := range lines {
			if i == 0 { // Skip header
				continue
			}

			fields := strings.Fields(line)
			if len(fields) < 10 {
				continue
			}

			// Skip loopback
			if fields[0] == "lo0" {
				continue
			}

			// Only count active interfaces
			if fields[2] == "0" {
				continue
			}

			adapter := models.AdapterTelemetry{
				Name: fields[0],
			}

			if recv, err := strconv.ParseInt(fields[6], 10, 64); err == nil {
				adapter.BytesReceived = recv
				net.BytesReceivedPerSec += recv
			}
			if sent, err := strconv.ParseInt(fields[9], 10, 64); err == nil {
				adapter.BytesSent = sent
				net.BytesSentPerSec += sent
			}

			net.Adapters = append(net.Adapters, adapter)
		}

	case "windows":
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
					// Skip loopback
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

	default:
		// Linux: Read from /proc/net/dev
		data, err := os.ReadFile("/proc/net/dev")
		if err != nil {
			return net
		}

		lines := strings.Split(string(data), "\n")
		for i, line := range lines {
			if i < 2 { // Skip headers
				continue
			}

			parts := strings.Split(line, ":")
			if len(parts) != 2 {
				continue
			}

			name := strings.TrimSpace(parts[0])
			if name == "lo" { // Skip loopback
				continue
			}

			fields := strings.Fields(parts[1])
			if len(fields) < 9 {
				continue
			}

			adapter := models.AdapterTelemetry{
				Name: name,
			}

			if recv, err := strconv.ParseInt(fields[0], 10, 64); err == nil {
				adapter.BytesReceived = recv
				net.BytesReceivedPerSec += recv
			}
			if sent, err := strconv.ParseInt(fields[8], 10, 64); err == nil {
				adapter.BytesSent = sent
				net.BytesSentPerSec += sent
			}

			net.Adapters = append(net.Adapters, adapter)
		}
	}

	return net
}

// measureNetworkLatency measures round-trip time to a reliable endpoint
func (c *DarwinTelemetryCollector) measureNetworkLatency() float64 {
	// List of targets to try (in order of preference)
	targets := []string{
		"8.8.8.8",         // Google DNS (highly reliable)
		"1.1.1.1",         // Cloudflare DNS
		"208.67.222.222",  // OpenDNS
	}

	for _, target := range targets {
		latency := c.pingHost(target)
		if latency > 0 {
			return latency
		}
	}

	return 0
}

// pingHost pings a host and returns the average latency in milliseconds
func (c *DarwinTelemetryCollector) pingHost(host string) float64 {
	var cmd *exec.Cmd

	switch runtime.GOOS {
	case "darwin", "linux":
		// Send 3 pings with 1 second timeout
		cmd = exec.Command("ping", "-c", "3", "-W", "1", host)
	case "windows":
		// Windows: -n count, -w timeout in milliseconds
		cmd = exec.Command("ping", "-n", "3", "-w", "1000", host)
	default:
		return 0
	}

	output, err := cmd.Output()
	if err != nil {
		return 0
	}

	return c.parsePingOutput(string(output))
}

// parsePingOutput extracts average latency from ping command output
func (c *DarwinTelemetryCollector) parsePingOutput(output string) float64 {
	switch runtime.GOOS {
	case "darwin", "linux":
		// macOS/Linux format: "round-trip min/avg/max/stddev = 10.123/15.456/20.789/3.456 ms"
		// or: "rtt min/avg/max/mdev = 10.123/15.456/20.789/3.456 ms"
		lines := strings.Split(output, "\n")
		for _, line := range lines {
			line = strings.ToLower(line)
			if strings.Contains(line, "round-trip") || strings.Contains(line, "rtt") {
				// Extract the statistics part after "="
				parts := strings.Split(line, "=")
				if len(parts) >= 2 {
					stats := strings.TrimSpace(parts[1])
					// Format: min/avg/max/stddev ms
					statParts := strings.Split(stats, "/")
					if len(statParts) >= 2 {
						// statParts[1] is the average
						avgStr := strings.TrimSpace(statParts[1])
						if avg, err := strconv.ParseFloat(avgStr, 64); err == nil {
							return avg
						}
					}
				}
			}
		}

	case "windows":
		// Windows format: "Average = 15ms" or "Average = 15 ms"
		lines := strings.Split(output, "\n")
		for _, line := range lines {
			line = strings.ToLower(line)
			if strings.Contains(line, "average") {
				// Extract number from "Average = 15ms"
				re := regexp.MustCompile(`average\s*=\s*(\d+)`)
				if matches := re.FindStringSubmatch(line); len(matches) > 1 {
					if avg, err := strconv.ParseFloat(matches[1], 64); err == nil {
						return avg
					}
				}
			}
		}
	}

	return 0
}

func (c *DarwinTelemetryCollector) collectProcessStats() models.ProcessStats {
	stats := models.ProcessStats{}

	switch runtime.GOOS {
	case "darwin":
		// Use ps for process info
		out, err := exec.Command("ps", "-axo", "pid,pcpu,pmem,state,comm").Output()
		if err != nil {
			return stats
		}

		lines := strings.Split(string(out), "\n")
		var processes []models.ProcessInfo

		for i, line := range lines {
			if i == 0 { // Skip header
				continue
			}

			fields := strings.Fields(line)
			if len(fields) < 5 {
				continue
			}

			proc := models.ProcessInfo{}
			if pid, err := strconv.Atoi(fields[0]); err == nil {
				proc.PID = pid
			}
			if cpu, err := strconv.ParseFloat(fields[1], 64); err == nil {
				proc.CPUPercent = cpu
			}
			if mem, err := strconv.ParseFloat(fields[2], 64); err == nil {
				proc.MemoryPercent = mem
			}
			proc.Status = fields[3]
			proc.Name = fields[4]

			stats.TotalCount++
			if proc.Status == "R" {
				stats.RunningCount++
			} else if proc.Status == "S" {
				stats.SleepingCount++
			}

			processes = append(processes, proc)
		}

		// Sort and get top by CPU
		sortByCPU(processes)
		if len(processes) > 5 {
			stats.TopByCPU = processes[:5]
		} else {
			stats.TopByCPU = processes
		}

		// Sort and get top by memory
		sortByMemory(processes)
		if len(processes) > 5 {
			stats.TopByMemory = processes[:5]
		} else {
			stats.TopByMemory = processes
		}

	case "windows":
		// Windows: Use tasklist or wmic process
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
					if memBytes, err := strconv.ParseInt(strings.TrimSpace(fields[4]), 10, 64); err == nil && totalMem > 0 {
						proc.MemoryPercent = float64(memBytes) / float64(totalMem) * 100
					}

					stats.TotalCount++
					stats.RunningCount++ // Windows processes are typically running

					processes = append(processes, proc)
				}
			}
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

			// Update CPU percentages (approximate based on CPU time)
			for i := range processes {
				if cpuTime, ok := cpuProcesses[processes[i].PID]; ok {
					processes[i].CPUPercent = cpuTime / 100 // Rough approximation
				}
			}
		}

		// Sort and get top by CPU
		sortByCPU(processes)
		if len(processes) > 5 {
			stats.TopByCPU = processes[:5]
		} else {
			stats.TopByCPU = processes
		}

		// Sort and get top by memory
		sortByMemory(processes)
		if len(processes) > 5 {
			stats.TopByMemory = processes[:5]
		} else {
			stats.TopByMemory = processes
		}

	default:
		// Linux: Use ps
		out, err := exec.Command("ps", "-eo", "pid,pcpu,pmem,stat,comm", "--no-headers").Output()
		if err != nil {
			return stats
		}

		lines := strings.Split(string(out), "\n")
		var processes []models.ProcessInfo

		for _, line := range lines {
			fields := strings.Fields(line)
			if len(fields) < 5 {
				continue
			}

			proc := models.ProcessInfo{}
			if pid, err := strconv.Atoi(fields[0]); err == nil {
				proc.PID = pid
			}
			if cpu, err := strconv.ParseFloat(fields[1], 64); err == nil {
				proc.CPUPercent = cpu
			}
			if mem, err := strconv.ParseFloat(fields[2], 64); err == nil {
				proc.MemoryPercent = mem
			}
			proc.Status = fields[3]
			proc.Name = fields[4]

			stats.TotalCount++
			if strings.HasPrefix(proc.Status, "R") {
				stats.RunningCount++
			} else if strings.HasPrefix(proc.Status, "S") {
				stats.SleepingCount++
			}

			processes = append(processes, proc)
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
	}

	return stats
}

func (c *DarwinTelemetryCollector) collectSystemErrors() models.SystemErrors {
	errors := models.SystemErrors{}

	switch runtime.GOOS {
	case "darwin":
		// Check for kernel panics in last 30 days
		// Kernel panic logs are in /Library/Logs/DiagnosticReports
		panicDir := "/Library/Logs/DiagnosticReports"
		files, err := os.ReadDir(panicDir)
		if err == nil {
			thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
			for _, f := range files {
				if strings.Contains(f.Name(), "panic") {
					if info, err := f.Info(); err == nil {
						if info.ModTime().After(thirtyDaysAgo) {
							errors.KernelPanicCount30d++
						}
					}
				}
			}
		}

		// Check for application crashes in last 24 hours
		// Crash logs are also in /Library/Logs/DiagnosticReports
		if files != nil {
			twentyFourHoursAgo := time.Now().Add(-24 * time.Hour)
			for _, f := range files {
				if strings.HasSuffix(f.Name(), ".crash") || strings.HasSuffix(f.Name(), ".ips") {
					if info, err := f.Info(); err == nil {
						if info.ModTime().After(twentyFourHoursAgo) {
							errors.ApplicationCrashCount24h++

							// Record last crash
							if errors.LastCrash == nil {
								errors.LastCrash = &models.CrashInfo{
									Timestamp:   info.ModTime().Format(time.RFC3339),
									Application: strings.TrimSuffix(f.Name(), ".crash"),
								}
							}
						}
					}
				}
			}
		}

	case "windows":
		// Windows: Check Windows Event Log for errors
		// Query for critical and error events in last 30 days for kernel-related issues
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
							// Try to extract application name from message
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

	default:
		// Linux: Check dmesg and journalctl for errors
		out, err := exec.Command("journalctl", "--since", "30 days ago", "-p", "err", "-q", "--no-pager").Output()
		if err == nil {
			lines := strings.Split(string(out), "\n")
			for _, line := range lines {
				if strings.Contains(line, "kernel panic") || strings.Contains(line, "Kernel panic") {
					errors.KernelPanicCount30d++
				}
			}
		}

		// Check for crashes in coredump
		out, err = exec.Command("coredumpctl", "list", "--since", "24 hours ago", "--no-pager").Output()
		if err == nil {
			lines := strings.Split(string(out), "\n")
			for _, line := range lines {
				if strings.TrimSpace(line) != "" && !strings.HasPrefix(line, "TIME") {
					errors.ApplicationCrashCount24h++
				}
			}
		}
	}

	return errors
}

func (c *DarwinTelemetryCollector) collectAgentUtilization() *models.AgentUtilization {
	util := &models.AgentUtilization{
		PID:        os.Getpid(),
		Goroutines: runtime.NumGoroutine(),
		Version:    "1.0.0",
	}

	// Initialize agent start time if not set
	if agentStartTime.IsZero() {
		agentStartTime = time.Now()
	}

	// Calculate uptime
	util.UptimeSeconds = int64(time.Since(agentStartTime).Seconds())
	util.UptimeHuman = formatDuration(time.Since(agentStartTime))

	pid := os.Getpid()

	switch runtime.GOOS {
	case "darwin":
		// Use ps to get CPU and memory usage for this process
		out, err := exec.Command("ps", "-p", strconv.Itoa(pid), "-o", "pcpu,pmem,rss").Output()
		if err == nil {
			lines := strings.Split(string(out), "\n")
			if len(lines) >= 2 {
				fields := strings.Fields(lines[1])
				if len(fields) >= 3 {
					if cpu, err := strconv.ParseFloat(fields[0], 64); err == nil {
						util.CPUPercent = cpu
					}
					if memPct, err := strconv.ParseFloat(fields[1], 64); err == nil {
						util.MemoryPercent = memPct
					}
					// RSS is in KB
					if rss, err := strconv.ParseInt(fields[2], 10, 64); err == nil {
						util.MemoryBytes = rss * 1024
						util.MemoryHuman = formatBytes(util.MemoryBytes)
					}
				}
			}
		}

		// Get open file handles using lsof
		if out, err := exec.Command("lsof", "-p", strconv.Itoa(pid)).Output(); err == nil {
			lines := strings.Split(string(out), "\n")
			util.OpenFileHandles = len(lines) - 1 // Subtract header line
		}

	case "windows":
		// Windows: Use wmic process or PowerShell
		cmdStr := `Get-Process -Id ` + strconv.Itoa(pid) + ` | Select-Object CPU, WorkingSet64, Threads | ConvertTo-Json`
		if out, err := exec.Command("powershell", "-Command", cmdStr).Output(); err == nil {
			output := string(out)

			// Parse WorkingSet64 for memory
			if strings.Contains(output, "WorkingSet64") {
				re := regexp.MustCompile(`"WorkingSet64"\s*:\s*(\d+)`)
				if matches := re.FindStringSubmatch(output); len(matches) > 1 {
					if memBytes, err := strconv.ParseInt(matches[1], 10, 64); err == nil {
						util.MemoryBytes = memBytes
						util.MemoryHuman = formatBytes(util.MemoryBytes)
					}
				}
			}

			// Parse thread count
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

	default:
		// Linux: Read from /proc/[pid]/stat and /proc/[pid]/status
		pidStr := strconv.Itoa(pid)

		// Read memory from /proc/[pid]/status
		if data, err := os.ReadFile("/proc/" + pidStr + "/status"); err == nil {
			lines := strings.Split(string(data), "\n")
			for _, line := range lines {
				parts := strings.Fields(line)
				if len(parts) < 2 {
					continue
				}
				key := strings.TrimSuffix(parts[0], ":")
				switch key {
				case "VmRSS":
					// RSS in KB
					if kb, err := strconv.ParseInt(parts[1], 10, 64); err == nil {
						util.MemoryBytes = kb * 1024
						util.MemoryHuman = formatBytes(util.MemoryBytes)
					}
				case "Threads":
					if threads, err := strconv.Atoi(parts[1]); err == nil {
						util.ThreadCount = threads
					}
				}
			}
		}

		// Get total memory for percentage calculation
		if data, err := os.ReadFile("/proc/meminfo"); err == nil {
			for _, line := range strings.Split(string(data), "\n") {
				if strings.HasPrefix(line, "MemTotal:") {
					parts := strings.Fields(line)
					if len(parts) >= 2 {
						if kb, err := strconv.ParseInt(parts[1], 10, 64); err == nil {
							totalMem := kb * 1024
							if totalMem > 0 && util.MemoryBytes > 0 {
								util.MemoryPercent = float64(util.MemoryBytes) / float64(totalMem) * 100
							}
						}
					}
					break
				}
			}
		}

		// Read CPU time from /proc/[pid]/stat
		if data, err := os.ReadFile("/proc/" + pidStr + "/stat"); err == nil {
			fields := strings.Fields(string(data))
			if len(fields) >= 15 {
				// fields[13] = utime, fields[14] = stime (in clock ticks)
				utime, _ := strconv.ParseInt(fields[13], 10, 64)
				stime, _ := strconv.ParseInt(fields[14], 10, 64)
				totalTicks := utime + stime

				// Get clock ticks per second (usually 100)
				clkTck := int64(100) // sysconf(_SC_CLK_TCK) default

				// Calculate CPU percentage (rough estimate based on uptime)
				if util.UptimeSeconds > 0 {
					cpuSeconds := float64(totalTicks) / float64(clkTck)
					util.CPUPercent = (cpuSeconds / float64(util.UptimeSeconds)) * 100
				}
			}
		}

		// Count open file descriptors
		fdPath := "/proc/" + pidStr + "/fd"
		if entries, err := os.ReadDir(fdPath); err == nil {
			util.OpenFileHandles = len(entries)
		}
	}

	return util
}

func (c *DarwinTelemetryCollector) collectThermalTelemetry() *models.ThermalTelemetry {
	thermal := &models.ThermalTelemetry{}
	var sensors []models.ThermalSensor

	switch runtime.GOOS {
	case "darwin":
		// macOS: Try to get temperatures from SMC via third-party tools or IOKit
		// osx-cpu-temp if available
		if out, err := exec.Command("osx-cpu-temp", "-C").Output(); err == nil {
			tempStr := strings.TrimSpace(string(out))
			tempStr = strings.TrimSuffix(tempStr, "°C")
			if temp, err := strconv.ParseFloat(tempStr, 64); err == nil {
				thermal.CPUTemperature = temp
				sensors = append(sensors, models.ThermalSensor{
					Name:        "CPU",
					Location:    "CPU",
					Temperature: temp,
					Status:      getThermalStatus(temp, 80, 95),
				})
			}
		}

		// Try powermetrics for more detailed thermal info (requires sudo)
		// This will usually fail without privileges, so we handle it gracefully

	case "windows":
		// Windows: Use WMI for thermal zone temperatures
		cmd := `Get-WmiObject MSAcpi_ThermalZoneTemperature -Namespace "root/wmi" 2>$null | Select-Object InstanceName, CurrentTemperature | ConvertTo-Json`
		if out, err := exec.Command("powershell", "-Command", cmd).Output(); err == nil {
			output := strings.TrimSpace(string(out))
			if output != "" && output != "null" {
				// Parse temperature (in tenths of Kelvin)
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
				// Parse sensor values
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

	default:
		// Linux: Read from /sys/class/thermal and /sys/class/hwmon
		// Thermal zones
		thermalDir := "/sys/class/thermal"
		if entries, err := os.ReadDir(thermalDir); err == nil {
			for _, entry := range entries {
				if strings.HasPrefix(entry.Name(), "thermal_zone") {
					tempPath := thermalDir + "/" + entry.Name() + "/temp"
					typePath := thermalDir + "/" + entry.Name() + "/type"

					var sensorType string
					if data, err := os.ReadFile(typePath); err == nil {
						sensorType = strings.TrimSpace(string(data))
					}

					if data, err := os.ReadFile(tempPath); err == nil {
						if temp, err := strconv.ParseFloat(strings.TrimSpace(string(data)), 64); err == nil {
							tempC := temp / 1000 // Convert from millidegrees
							location := "Unknown"

							if strings.Contains(strings.ToLower(sensorType), "cpu") ||
								strings.Contains(strings.ToLower(sensorType), "x86") ||
								strings.Contains(strings.ToLower(sensorType), "core") {
								location = "CPU"
								if thermal.CPUTemperature == 0 {
									thermal.CPUTemperature = tempC
								}
							} else if strings.Contains(strings.ToLower(sensorType), "gpu") {
								location = "GPU"
								thermal.GPUTemperature = tempC
							} else if strings.Contains(strings.ToLower(sensorType), "acpi") {
								location = "Chassis"
							}

							sensors = append(sensors, models.ThermalSensor{
								Name:        sensorType,
								Location:    location,
								Temperature: tempC,
								Status:      getThermalStatus(tempC, 80, 95),
							})
						}
					}
				}
			}
		}

		// Hardware monitors for more sensors
		hwmonDir := "/sys/class/hwmon"
		if entries, err := os.ReadDir(hwmonDir); err == nil {
			for _, entry := range entries {
				hwmonPath := hwmonDir + "/" + entry.Name()

				// Get sensor name
				var hwmonName string
				if data, err := os.ReadFile(hwmonPath + "/name"); err == nil {
					hwmonName = strings.TrimSpace(string(data))
				}

				// Find all temp inputs
				for i := 1; i <= 20; i++ {
					tempPath := hwmonPath + "/temp" + strconv.Itoa(i) + "_input"
					if data, err := os.ReadFile(tempPath); err == nil {
						if temp, err := strconv.ParseFloat(strings.TrimSpace(string(data)), 64); err == nil {
							tempC := temp / 1000

							// Get label if available
							labelPath := hwmonPath + "/temp" + strconv.Itoa(i) + "_label"
							label := hwmonName
							if data, err := os.ReadFile(labelPath); err == nil {
								label = strings.TrimSpace(string(data))
							}

							// Determine location based on both hwmonName and label
							location := "Unknown"
							hwmonLower := strings.ToLower(hwmonName)
							labelLower := strings.ToLower(label)

							if hwmonLower == "coretemp" || hwmonLower == "k10temp" || hwmonLower == "zenpower" ||
								strings.Contains(labelLower, "core") || strings.Contains(labelLower, "cpu") ||
								strings.Contains(labelLower, "package") || strings.Contains(labelLower, "tctl") {
								location = "CPU"
								if thermal.CPUTemperature == 0 || strings.Contains(labelLower, "package") {
									thermal.CPUTemperature = tempC
								}
							} else if hwmonLower == "amdgpu" || hwmonLower == "nouveau" ||
								strings.Contains(hwmonLower, "gpu") || strings.Contains(labelLower, "gpu") {
								location = "GPU"
								if thermal.GPUTemperature == 0 {
									thermal.GPUTemperature = tempC
								}
							} else if hwmonLower == "nvme" || strings.Contains(hwmonLower, "nvme") ||
								strings.Contains(labelLower, "composite") || strings.Contains(labelLower, "ssd") {
								location = "SSD"
							} else if hwmonLower == "acpitz" || strings.Contains(hwmonLower, "acpi") {
								location = "Chassis"
							} else if strings.Contains(hwmonLower, "iwlwifi") || strings.Contains(hwmonLower, "wifi") {
								location = "WiFi"
							}

							// Get critical temp if available
							var critTemp float64
							critPath := hwmonPath + "/temp" + strconv.Itoa(i) + "_crit"
							if data, err := os.ReadFile(critPath); err == nil {
								if crit, err := strconv.ParseFloat(strings.TrimSpace(string(data)), 64); err == nil {
									critTemp = crit / 1000
								}
							}

							sensors = append(sensors, models.ThermalSensor{
								Name:         label,
								Location:     location,
								Temperature:  tempC,
								CriticalTemp: critTemp,
								Status:       getThermalStatus(tempC, 80, critTemp),
							})
						}
					}
				}
			}
		}

		// Check CPU throttling
		throttlePath := "/sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq"
		maxFreqPath := "/sys/devices/system/cpu/cpu0/cpufreq/scaling_max_freq"
		if curData, err := os.ReadFile(throttlePath); err == nil {
			if maxData, err := os.ReadFile(maxFreqPath); err == nil {
				curFreq, _ := strconv.ParseInt(strings.TrimSpace(string(curData)), 10, 64)
				maxFreq, _ := strconv.ParseInt(strings.TrimSpace(string(maxData)), 10, 64)
				if maxFreq > 0 && curFreq < maxFreq*90/100 {
					thermal.Throttled = true
					thermal.ThrottleReason = "Thermal"
				}
			}
		}
	}

	thermal.Sensors = sensors

	// Return nil if no thermal data was collected
	if thermal.CPUTemperature == 0 && thermal.GPUTemperature == 0 && len(sensors) == 0 {
		return nil
	}

	return thermal
}

func (c *DarwinTelemetryCollector) collectPowerTelemetry() *models.PowerTelemetry {
	power := &models.PowerTelemetry{}

	switch runtime.GOOS {
	case "darwin":
		// macOS: Use pmset and ioreg for power info
		if out, err := exec.Command("pmset", "-g", "batt").Output(); err == nil {
			output := string(out)

			// Check power source
			if strings.Contains(output, "AC Power") {
				power.ACConnected = true
				power.PowerSource = "AC"
			} else if strings.Contains(output, "Battery Power") {
				power.PowerSource = "Battery"
			}

			// Parse battery percentage
			re := regexp.MustCompile(`(\d+)%`)
			if matches := re.FindStringSubmatch(output); len(matches) > 1 {
				if pct, err := strconv.ParseFloat(matches[1], 64); err == nil {
					power.BatteryPresent = true
					power.BatteryPercent = pct
				}
			}

			// Check charging status
			if strings.Contains(output, "charging") && !strings.Contains(output, "not charging") {
				power.BatteryCharging = true
			}

			// Parse time remaining
			re = regexp.MustCompile(`(\d+):(\d+) remaining`)
			if matches := re.FindStringSubmatch(output); len(matches) > 2 {
				hours, _ := strconv.Atoi(matches[1])
				mins, _ := strconv.Atoi(matches[2])
				power.TimeRemaining = hours*60 + mins
			}
		}

		// Get battery health from ioreg
		if out, err := exec.Command("ioreg", "-r", "-c", "AppleSmartBattery").Output(); err == nil {
			output := string(out)

			// MaxCapacity vs DesignCapacity for health
			var maxCap, designCap int64
			re := regexp.MustCompile(`"MaxCapacity"\s*=\s*(\d+)`)
			if matches := re.FindStringSubmatch(output); len(matches) > 1 {
				maxCap, _ = strconv.ParseInt(matches[1], 10, 64)
			}
			re = regexp.MustCompile(`"DesignCapacity"\s*=\s*(\d+)`)
			if matches := re.FindStringSubmatch(output); len(matches) > 1 {
				designCap, _ = strconv.ParseInt(matches[1], 10, 64)
			}
			if designCap > 0 && maxCap > 0 {
				power.BatteryHealth = float64(maxCap) / float64(designCap) * 100
			}

			// Battery temperature
			re = regexp.MustCompile(`"Temperature"\s*=\s*(\d+)`)
			if matches := re.FindStringSubmatch(output); len(matches) > 1 {
				if temp, err := strconv.ParseInt(matches[1], 10, 64); err == nil {
					// Temperature is in centi-degrees Celsius
					_ = float64(temp) / 100 // Battery temp stored in thermal
				}
			}
		}

	case "windows":
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
					if mins, err := strconv.Atoi(matches[1]); err == nil && mins < 71582788 { // Filter out "calculating"
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

	default:
		// Linux: Read from /sys/class/power_supply
		powerDir := "/sys/class/power_supply"
		if entries, err := os.ReadDir(powerDir); err == nil {
			for _, entry := range entries {
				supplyPath := powerDir + "/" + entry.Name()
				typePath := supplyPath + "/type"

				var supplyType string
				if data, err := os.ReadFile(typePath); err == nil {
					supplyType = strings.TrimSpace(string(data))
				}

				if supplyType == "Mains" || supplyType == "USB" {
					// AC adapter
					onlinePath := supplyPath + "/online"
					if data, err := os.ReadFile(onlinePath); err == nil {
						if strings.TrimSpace(string(data)) == "1" {
							power.ACConnected = true
							power.PowerSource = "AC"
						}
					}
				} else if supplyType == "Battery" {
					power.BatteryPresent = true
					if !power.ACConnected {
						power.PowerSource = "Battery"
					}

					// Capacity percentage
					capPath := supplyPath + "/capacity"
					if data, err := os.ReadFile(capPath); err == nil {
						if cap, err := strconv.ParseFloat(strings.TrimSpace(string(data)), 64); err == nil {
							power.BatteryPercent = cap
						}
					}

					// Charging status
					statusPath := supplyPath + "/status"
					if data, err := os.ReadFile(statusPath); err == nil {
						status := strings.TrimSpace(string(data))
						if status == "Charging" {
							power.BatteryCharging = true
						}
					}

					// Battery health
					var energyFull, energyFullDesign int64
					if data, err := os.ReadFile(supplyPath + "/energy_full"); err == nil {
						energyFull, _ = strconv.ParseInt(strings.TrimSpace(string(data)), 10, 64)
					}
					if data, err := os.ReadFile(supplyPath + "/energy_full_design"); err == nil {
						energyFullDesign, _ = strconv.ParseInt(strings.TrimSpace(string(data)), 10, 64)
					}
					if energyFullDesign > 0 && energyFull > 0 {
						power.BatteryHealth = float64(energyFull) / float64(energyFullDesign) * 100
					}

					// Power draw (current_now * voltage_now)
					var currentNow, voltageNow int64
					if data, err := os.ReadFile(supplyPath + "/current_now"); err == nil {
						currentNow, _ = strconv.ParseInt(strings.TrimSpace(string(data)), 10, 64)
					}
					if data, err := os.ReadFile(supplyPath + "/voltage_now"); err == nil {
						voltageNow, _ = strconv.ParseInt(strings.TrimSpace(string(data)), 10, 64)
					}
					if currentNow > 0 && voltageNow > 0 {
						// Convert from microamps and microvolts to watts
						power.PowerDrawWatts = float64(currentNow) * float64(voltageNow) / 1e12
					}

					// Alternative: power_now (in microwatts)
					if power.PowerDrawWatts == 0 {
						if data, err := os.ReadFile(supplyPath + "/power_now"); err == nil {
							if powerNow, err := strconv.ParseInt(strings.TrimSpace(string(data)), 10, 64); err == nil {
								power.PowerDrawWatts = float64(powerNow) / 1e6
							}
						}
					}
				}
			}
		}

		// If no battery found and no AC status, assume desktop on AC
		if !power.BatteryPresent && !power.ACConnected {
			power.ACConnected = true
			power.PowerSource = "AC"
		}
	}

	return power
}

// getThermalStatus returns a status string based on temperature thresholds
func getThermalStatus(temp, warning, critical float64) string {
	if critical > 0 && temp >= critical {
		return "Critical"
	}
	if warning > 0 && temp >= warning {
		return "Warning"
	}
	return "Normal"
}

// Helper functions

func extractPercent(s string) float64 {
	s = strings.TrimSpace(s)
	parts := strings.Fields(s)
	for _, part := range parts {
		if strings.HasSuffix(part, "%") {
			numStr := strings.TrimSuffix(part, "%")
			if pct, err := strconv.ParseFloat(numStr, 64); err == nil {
				return pct
			}
		}
	}
	return -1
}

func parseMemorySize(s string) int64 {
	s = strings.TrimSpace(s)
	s = strings.ToUpper(s)

	var multiplier int64 = 1
	if strings.HasSuffix(s, "G") {
		multiplier = 1024 * 1024 * 1024
		s = strings.TrimSuffix(s, "G")
	} else if strings.HasSuffix(s, "M") {
		multiplier = 1024 * 1024
		s = strings.TrimSuffix(s, "M")
	} else if strings.HasSuffix(s, "K") {
		multiplier = 1024
		s = strings.TrimSuffix(s, "K")
	}

	if size, err := strconv.ParseFloat(s, 64); err == nil {
		return int64(size * float64(multiplier))
	}
	return 0
}

func sortByCPU(procs []models.ProcessInfo) {
	// Simple bubble sort for small lists
	for i := 0; i < len(procs)-1; i++ {
		for j := 0; j < len(procs)-i-1; j++ {
			if procs[j].CPUPercent < procs[j+1].CPUPercent {
				procs[j], procs[j+1] = procs[j+1], procs[j]
			}
		}
	}
}

func sortByMemory(procs []models.ProcessInfo) {
	for i := 0; i < len(procs)-1; i++ {
		for j := 0; j < len(procs)-i-1; j++ {
			if procs[j].MemoryPercent < procs[j+1].MemoryPercent {
				procs[j], procs[j+1] = procs[j+1], procs[j]
			}
		}
	}
}
