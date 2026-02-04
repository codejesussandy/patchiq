//go:build darwin || linux

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

// UnixTelemetryCollector collects telemetry on macOS and Linux
type UnixTelemetryCollector struct{}

// NewUnixTelemetryCollector creates a new telemetry collector for Unix systems (macOS/Linux)
func NewUnixTelemetryCollector() *UnixTelemetryCollector {
	return &UnixTelemetryCollector{}
}

// Backward compatibility aliases
type DarwinTelemetryCollector = UnixTelemetryCollector

func NewDarwinTelemetryCollector() *UnixTelemetryCollector {
	return NewUnixTelemetryCollector()
}

// Name returns the collector name
func (c *UnixTelemetryCollector) Name() string {
	return "telemetry"
}

// Collect gathers telemetry data
func (c *UnixTelemetryCollector) Collect() (interface{}, error) {
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

// Note: formatDuration is defined in software.go and is reused here

func (c *UnixTelemetryCollector) collectCPUTelemetry() models.CPUTelemetry {
	cpu := models.CPUTelemetry{}

	switch runtime.GOOS {
	case "darwin":
		// Use top for CPU usage
		out, err := exec.Command("top", "-l", "1", "-n", "0", "-s", "0").Output()
		if err == nil {
			lines := strings.Split(string(out), "\n")
			for _, line := range lines {
				if strings.Contains(line, "CPU usage:") {
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

		// Get CPU temperature
		if out, err := exec.Command("osx-cpu-temp", "-C").Output(); err == nil {
			tempStr := strings.TrimSpace(string(out))
			tempStr = strings.TrimSuffix(tempStr, "°C")
			if temp, err := strconv.ParseFloat(tempStr, 64); err == nil {
				cpu.Temperature = temp
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
					if len(fields) >= 8 {
						user, _ := strconv.ParseInt(fields[1], 10, 64)
						nice, _ := strconv.ParseInt(fields[2], 10, 64)
						system, _ := strconv.ParseInt(fields[3], 10, 64)
						idle, _ := strconv.ParseInt(fields[4], 10, 64)
						iowait, _ := strconv.ParseInt(fields[5], 10, 64)
						irq, _ := strconv.ParseInt(fields[6], 10, 64)
						softirq, _ := strconv.ParseInt(fields[7], 10, 64)
						var steal int64
						if len(fields) >= 9 {
							steal, _ = strconv.ParseInt(fields[8], 10, 64)
						}

						total := user + nice + system + idle + iowait + irq + softirq + steal

						if prevCPUTotal > 0 && total > prevCPUTotal {
							deltaTotal := float64(total - prevCPUTotal)
							deltaUser := float64((user + nice) - (prevCPUUser + prevCPUNice))
							deltaSystem := float64((system + irq + softirq) - (prevCPUSystem + prevCPUIrq + prevCPUSoftirq))
							deltaIdle := float64((idle + iowait) - (prevCPUIdle + prevCPUIowait))

							if deltaTotal > 0 {
								cpu.UserPercent = (deltaUser / deltaTotal) * 100
								cpu.SystemPercent = (deltaSystem / deltaTotal) * 100
								cpu.IdlePercent = (deltaIdle / deltaTotal) * 100
								cpu.UsagePercent = 100 - cpu.IdlePercent
							}
						} else {
							totalFloat := float64(total)
							if totalFloat > 0 {
								cpu.UserPercent = float64(user+nice) / totalFloat * 100
								cpu.SystemPercent = float64(system+irq+softirq) / totalFloat * 100
								cpu.IdlePercent = float64(idle+iowait) / totalFloat * 100
								cpu.UsagePercent = 100 - cpu.IdlePercent
							}
						}

						prevCPUUser = user
						prevCPUNice = nice
						prevCPUSystem = system
						prevCPUIdle = idle
						prevCPUIowait = iowait
						prevCPUIrq = irq
						prevCPUSoftirq = softirq
						prevCPUSteal = steal
						prevCPUTotal = total
						prevCPUTime = time.Now()
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
						cpu.Temperature = temp / 1000
						break
					}
				}
			}
		}
	}

	return cpu
}

func (c *UnixTelemetryCollector) collectMemoryTelemetry() models.MemoryTelemetry {
	mem := models.MemoryTelemetry{}

	switch runtime.GOOS {
	case "darwin":
		if out, err := exec.Command("sysctl", "-n", "hw.memsize").Output(); err == nil {
			if total, err := strconv.ParseInt(strings.TrimSpace(string(out)), 10, 64); err == nil {
				mem.TotalBytes = total
			}
		}

		if out, err := exec.Command("vm_stat").Output(); err == nil {
			lines := strings.Split(string(out), "\n")
			pageSize := int64(4096)

			var freePages, activePages, inactivePages, wiredPages, compressedPages, speculativePages int64

			for _, line := range lines {
				if strings.HasPrefix(line, "Mach Virtual Memory Statistics") {
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
				case "Pages speculative":
					speculativePages = value
				case "Pages wired down":
					wiredPages = value
				case "Pages occupied by compressor":
					compressedPages = value
				}
			}

			mem.FreeBytes = freePages * pageSize
			mem.UsedBytes = mem.TotalBytes - mem.FreeBytes
			mem.AvailableBytes = (freePages + inactivePages + speculativePages) * pageSize
			mem.ApplicationUsedBytes = (activePages + wiredPages + compressedPages) * pageSize
			mem.CachedBytes = inactivePages * pageSize

			if mem.TotalBytes > 0 {
				mem.UsagePercent = float64(mem.UsedBytes) / float64(mem.TotalBytes) * 100
			}
		}

		if out, err := exec.Command("sysctl", "-n", "vm.swapusage").Output(); err == nil {
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
				value *= 1024

				switch key {
				case "MemTotal":
					mem.TotalBytes = value
				case "MemFree":
					mem.FreeBytes = value
				case "MemAvailable":
					mem.AvailableBytes = value
				case "Buffers":
					mem.BuffersBytes = value
				case "Cached":
					mem.CachedBytes = value
				case "SwapTotal":
					mem.SwapTotalBytes = value
				case "SwapFree":
					mem.SwapUsedBytes = mem.SwapTotalBytes - value
				}
			}

			mem.UsedBytes = mem.TotalBytes - mem.FreeBytes
			mem.ApplicationUsedBytes = mem.TotalBytes - mem.AvailableBytes

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

func (c *UnixTelemetryCollector) collectDiskTelemetry() models.DiskTelemetry {
	disk := models.DiskTelemetry{}

	out, err := exec.Command("df", "-k").Output()
	if err != nil {
		return disk
	}

	lines := strings.Split(string(out), "\n")
	for i, line := range lines {
		if i == 0 {
			continue
		}

		fields := strings.Fields(line)
		if len(fields) < 6 {
			continue
		}

		if !strings.HasPrefix(fields[0], "/dev/") {
			continue
		}

		if strings.Contains(fields[0], "devfs") || strings.Contains(fields[0], "map") {
			continue
		}

		drive := models.DriveTelemetry{
			Name:       fields[0],
			MountPoint: fields[len(fields)-1],
		}

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

func (c *UnixTelemetryCollector) collectNetworkTelemetry() models.NetworkTelemetry {
	net := models.NetworkTelemetry{}

	net.LatencyMs = c.measureNetworkLatency()

	switch runtime.GOOS {
	case "darwin":
		out, err := exec.Command("netstat", "-ib").Output()
		if err != nil {
			return net
		}

		lines := strings.Split(string(out), "\n")
		for i, line := range lines {
			if i == 0 {
				continue
			}

			fields := strings.Fields(line)
			if len(fields) < 10 {
				continue
			}

			if fields[0] == "lo0" {
				continue
			}

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

	default:
		// Linux: Read from /proc/net/dev
		data, err := os.ReadFile("/proc/net/dev")
		if err != nil {
			return net
		}

		lines := strings.Split(string(data), "\n")
		for i, line := range lines {
			if i < 2 {
				continue
			}

			parts := strings.Split(line, ":")
			if len(parts) != 2 {
				continue
			}

			name := strings.TrimSpace(parts[0])
			if name == "lo" {
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

func (c *UnixTelemetryCollector) measureNetworkLatency() float64 {
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

func (c *UnixTelemetryCollector) pingHost(host string) float64 {
	// Send 3 pings with 1 second timeout
	cmd := exec.Command("ping", "-c", "3", "-W", "1", host)

	output, err := cmd.Output()
	if err != nil {
		return 0
	}

	return c.parsePingOutput(string(output))
}

func (c *UnixTelemetryCollector) parsePingOutput(output string) float64 {
	// macOS/Linux format: "round-trip min/avg/max/stddev = 10.123/15.456/20.789/3.456 ms"
	// or: "rtt min/avg/max/mdev = 10.123/15.456/20.789/3.456 ms"
	lines := strings.Split(output, "\n")
	for _, line := range lines {
		line = strings.ToLower(line)
		if strings.Contains(line, "round-trip") || strings.Contains(line, "rtt") {
			parts := strings.Split(line, "=")
			if len(parts) >= 2 {
				stats := strings.TrimSpace(parts[1])
				statParts := strings.Split(stats, "/")
				if len(statParts) >= 2 {
					avgStr := strings.TrimSpace(statParts[1])
					if avg, err := strconv.ParseFloat(avgStr, 64); err == nil {
						return avg
					}
				}
			}
		}
	}
	return 0
}

func (c *UnixTelemetryCollector) collectProcessStats() models.ProcessStats {
	stats := models.ProcessStats{}

	switch runtime.GOOS {
	case "darwin":
		out, err := exec.Command("ps", "-axo", "pid,pcpu,pmem,state,comm").Output()
		if err != nil {
			return stats
		}

		lines := strings.Split(string(out), "\n")
		var processes []models.ProcessInfo

		for i, line := range lines {
			if i == 0 {
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

func (c *UnixTelemetryCollector) collectSystemErrors() models.SystemErrors {
	errors := models.SystemErrors{}

	switch runtime.GOOS {
	case "darwin":
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

		if files != nil {
			twentyFourHoursAgo := time.Now().Add(-24 * time.Hour)
			for _, f := range files {
				if strings.HasSuffix(f.Name(), ".crash") || strings.HasSuffix(f.Name(), ".ips") {
					if info, err := f.Info(); err == nil {
						if info.ModTime().After(twentyFourHoursAgo) {
							errors.ApplicationCrashCount24h++

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

func (c *UnixTelemetryCollector) collectAgentUtilization() *models.AgentUtilization {
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

	switch runtime.GOOS {
	case "darwin":
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
					if rss, err := strconv.ParseInt(fields[2], 10, 64); err == nil {
						util.MemoryBytes = rss * 1024
						util.MemoryHuman = formatBytes(util.MemoryBytes)
					}
				}
			}
		}

		if out, err := exec.Command("lsof", "-p", strconv.Itoa(pid)).Output(); err == nil {
			lines := strings.Split(string(out), "\n")
			util.OpenFileHandles = len(lines) - 1
		}

	default:
		// Linux: Read from /proc/[pid]/stat and /proc/[pid]/status
		pidStr := strconv.Itoa(pid)

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

		if data, err := os.ReadFile("/proc/" + pidStr + "/stat"); err == nil {
			fields := strings.Fields(string(data))
			if len(fields) >= 15 {
				utime, _ := strconv.ParseInt(fields[13], 10, 64)
				stime, _ := strconv.ParseInt(fields[14], 10, 64)
				totalTicks := utime + stime

				clkTck := int64(100)

				if util.UptimeSeconds > 0 {
					cpuSeconds := float64(totalTicks) / float64(clkTck)
					util.CPUPercent = (cpuSeconds / float64(util.UptimeSeconds)) * 100
				}
			}
		}

		fdPath := "/proc/" + pidStr + "/fd"
		if entries, err := os.ReadDir(fdPath); err == nil {
			util.OpenFileHandles = len(entries)
		}
	}

	return util
}

func (c *UnixTelemetryCollector) collectThermalTelemetry() *models.ThermalTelemetry {
	thermal := &models.ThermalTelemetry{}
	var sensors []models.ThermalSensor

	switch runtime.GOOS {
	case "darwin":
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

	default:
		// Linux: Read from /sys/class/thermal and /sys/class/hwmon
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
							tempC := temp / 1000
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

		// Hardware monitors
		hwmonDir := "/sys/class/hwmon"
		if entries, err := os.ReadDir(hwmonDir); err == nil {
			for _, entry := range entries {
				hwmonPath := hwmonDir + "/" + entry.Name()

				var hwmonName string
				if data, err := os.ReadFile(hwmonPath + "/name"); err == nil {
					hwmonName = strings.TrimSpace(string(data))
				}

				for i := 1; i <= 20; i++ {
					tempPath := hwmonPath + "/temp" + strconv.Itoa(i) + "_input"
					if data, err := os.ReadFile(tempPath); err == nil {
						if temp, err := strconv.ParseFloat(strings.TrimSpace(string(data)), 64); err == nil {
							tempC := temp / 1000

							labelPath := hwmonPath + "/temp" + strconv.Itoa(i) + "_label"
							label := hwmonName
							if data, err := os.ReadFile(labelPath); err == nil {
								label = strings.TrimSpace(string(data))
							}

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

	if thermal.CPUTemperature == 0 && thermal.GPUTemperature == 0 && len(sensors) == 0 {
		return nil
	}

	return thermal
}

func (c *UnixTelemetryCollector) collectPowerTelemetry() *models.PowerTelemetry {
	power := &models.PowerTelemetry{}

	switch runtime.GOOS {
	case "darwin":
		if out, err := exec.Command("pmset", "-g", "batt").Output(); err == nil {
			output := string(out)

			if strings.Contains(output, "AC Power") {
				power.ACConnected = true
				power.PowerSource = "AC"
			} else if strings.Contains(output, "Battery Power") {
				power.PowerSource = "Battery"
			}

			re := regexp.MustCompile(`(\d+)%`)
			if matches := re.FindStringSubmatch(output); len(matches) > 1 {
				if pct, err := strconv.ParseFloat(matches[1], 64); err == nil {
					power.BatteryPresent = true
					power.BatteryPercent = pct
				}
			}

			if strings.Contains(output, "charging") && !strings.Contains(output, "not charging") {
				power.BatteryCharging = true
			}

			re = regexp.MustCompile(`(\d+):(\d+) remaining`)
			if matches := re.FindStringSubmatch(output); len(matches) > 2 {
				hours, _ := strconv.Atoi(matches[1])
				mins, _ := strconv.Atoi(matches[2])
				power.TimeRemaining = hours*60 + mins
			}
		}

		if out, err := exec.Command("ioreg", "-r", "-c", "AppleSmartBattery").Output(); err == nil {
			output := string(out)

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

			re = regexp.MustCompile(`"Temperature"\s*=\s*(\d+)`)
			if matches := re.FindStringSubmatch(output); len(matches) > 1 {
				if temp, err := strconv.ParseInt(matches[1], 10, 64); err == nil {
					_ = float64(temp) / 100
				}
			}
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

					capPath := supplyPath + "/capacity"
					if data, err := os.ReadFile(capPath); err == nil {
						if cap, err := strconv.ParseFloat(strings.TrimSpace(string(data)), 64); err == nil {
							power.BatteryPercent = cap
						}
					}

					statusPath := supplyPath + "/status"
					if data, err := os.ReadFile(statusPath); err == nil {
						status := strings.TrimSpace(string(data))
						if status == "Charging" {
							power.BatteryCharging = true
						}
					}

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

					var currentNow, voltageNow int64
					if data, err := os.ReadFile(supplyPath + "/current_now"); err == nil {
						currentNow, _ = strconv.ParseInt(strings.TrimSpace(string(data)), 10, 64)
					}
					if data, err := os.ReadFile(supplyPath + "/voltage_now"); err == nil {
						voltageNow, _ = strconv.ParseInt(strings.TrimSpace(string(data)), 10, 64)
					}
					if currentNow > 0 && voltageNow > 0 {
						power.PowerDrawWatts = float64(currentNow) * float64(voltageNow) / 1e12
					}

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

		if !power.BatteryPresent && !power.ACConnected {
			power.ACConnected = true
			power.PowerSource = "AC"
		}
	}

	return power
}

func (c *UnixTelemetryCollector) collectSystemUptime() *models.SystemUptime {
	uptime := &models.SystemUptime{}

	switch runtime.GOOS {
	case "darwin":
		out, err := exec.Command("sysctl", "-n", "kern.boottime").Output()
		if err == nil {
			output := string(out)
			re := regexp.MustCompile(`sec\s*=\s*(\d+)`)
			if matches := re.FindStringSubmatch(output); len(matches) > 1 {
				if bootTimeSec, err := strconv.ParseInt(matches[1], 10, 64); err == nil {
					bootTime := time.Unix(bootTimeSec, 0)
					uptime.BootTime = bootTime.Format(time.RFC3339)
					uptime.UptimeSeconds = int64(time.Since(bootTime).Seconds())
					uptime.UptimeHuman = formatDuration(time.Since(bootTime))
				}
			}
		}

	default:
		// Linux: Read from /proc/uptime
		data, err := os.ReadFile("/proc/uptime")
		if err == nil {
			fields := strings.Fields(string(data))
			if len(fields) >= 1 {
				if upSec, err := strconv.ParseFloat(fields[0], 64); err == nil {
					uptime.UptimeSeconds = int64(upSec)
					uptime.UptimeHuman = formatDuration(time.Duration(upSec) * time.Second)
					bootTime := time.Now().Add(-time.Duration(upSec) * time.Second)
					uptime.BootTime = bootTime.Format(time.RFC3339)
				}
			}
		}
	}

	if uptime.UptimeSeconds == 0 {
		return nil
	}

	return uptime
}
