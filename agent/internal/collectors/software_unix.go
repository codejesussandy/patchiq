//go:build darwin || linux

package collectors

import (
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/patchify/agent/internal/models"
)

// UnixSoftwareCollector collects software info on macOS and Linux
type UnixSoftwareCollector struct{}

// NewUnixSoftwareCollector creates a new software collector for Unix systems (macOS/Linux)
func NewUnixSoftwareCollector() *UnixSoftwareCollector {
	return &UnixSoftwareCollector{}
}

// Backward compatibility aliases
type DarwinSoftwareCollector = UnixSoftwareCollector

func NewDarwinSoftwareCollector() *UnixSoftwareCollector {
	return NewUnixSoftwareCollector()
}

// Name returns the collector name
func (c *UnixSoftwareCollector) Name() string {
	return "software"
}

// Collect gathers software information
func (c *UnixSoftwareCollector) Collect() (interface{}, error) {
	sw := &models.Software{
		CollectedAt: time.Now().UTC().Format(time.RFC3339),
	}

	// Collect OS info
	sw.OperatingSystem = c.collectOperatingSystem()

	// Collect installed applications
	sw.Applications = c.collectApplications()

	// Collect services
	sw.Services = c.collectServices()

	// Collect startup programs
	sw.StartupPrograms = c.collectStartupPrograms()

	// Collect running processes and usage metering
	sw.RunningProcesses = c.collectRunningProcesses()
	sw.UsageSummary = sharedCollectUsageSummary(sw.RunningProcesses)

	return sw, nil
}

func (c *UnixSoftwareCollector) collectOperatingSystem() models.OperatingSystem {
	osInfo := models.OperatingSystem{
		Architecture: runtime.GOARCH,
	}

	hostname, _ := os.Hostname()
	osInfo.Hostname = hostname

	switch runtime.GOOS {
	case "darwin":
		// Get macOS version
		out, err := exec.Command("sw_vers", "-productName").Output()
		if err == nil {
			osInfo.Name = strings.TrimSpace(string(out))
		}

		out, err = exec.Command("sw_vers", "-productVersion").Output()
		if err == nil {
			osInfo.Version = strings.TrimSpace(string(out))
		}

		out, err = exec.Command("sw_vers", "-buildVersion").Output()
		if err == nil {
			osInfo.BuildNumber = strings.TrimSpace(string(out))
		}

		// Get kernel version
		out, err = exec.Command("uname", "-r").Output()
		if err == nil {
			osInfo.Kernel = strings.TrimSpace(string(out))
		}

		// Get boot time
		out, err = exec.Command("sysctl", "-n", "kern.boottime").Output()
		if err == nil {
			// Parse boot time from format: { sec = 1234567890, usec = 0 }
			bootStr := string(out)
			if strings.Contains(bootStr, "sec =") {
				parts := strings.Split(bootStr, "sec =")
				if len(parts) > 1 {
					secStr := strings.Split(parts[1], ",")[0]
					if sec, err := strconv.ParseInt(strings.TrimSpace(secStr), 10, 64); err == nil {
						bootTime := time.Unix(sec, 0)
						osInfo.LastBootTime = bootTime.Format(time.RFC3339)
						osInfo.Uptime = int64(time.Since(bootTime).Seconds())
						osInfo.UptimeHuman = formatDuration(time.Since(bootTime))
					}
				}
			}
		}

		// Get timezone
		out, err = exec.Command("date", "+%Z").Output()
		if err == nil {
			osInfo.Timezone = strings.TrimSpace(string(out))
		}

		// Get locale
		out, err = exec.Command("defaults", "read", "-g", "AppleLocale").Output()
		if err == nil {
			osInfo.Locale = strings.TrimSpace(string(out))
		}

		// Check for pending reboot (software update pending)
		if _, err := os.Stat("/var/db/.SoftwareUpdatePending"); err == nil {
			osInfo.PendingReboot = true
		}

	default:
		// Linux
		osInfo.Name = "Linux"

		// Try to get distribution info
		if data, err := os.ReadFile("/etc/os-release"); err == nil {
			lines := strings.Split(string(data), "\n")
			for _, line := range lines {
				if strings.HasPrefix(line, "PRETTY_NAME=") {
					osInfo.Name = strings.Trim(strings.TrimPrefix(line, "PRETTY_NAME="), "\"")
				} else if strings.HasPrefix(line, "VERSION_ID=") {
					osInfo.Version = strings.Trim(strings.TrimPrefix(line, "VERSION_ID="), "\"")
				}
			}
		}

		// Get kernel version
		out, err := exec.Command("uname", "-r").Output()
		if err == nil {
			osInfo.Kernel = strings.TrimSpace(string(out))
		}

		// Get uptime
		if data, err := os.ReadFile("/proc/uptime"); err == nil {
			fields := strings.Fields(string(data))
			if len(fields) > 0 {
				if uptime, err := strconv.ParseFloat(fields[0], 64); err == nil {
					osInfo.Uptime = int64(uptime)
					osInfo.UptimeHuman = formatDuration(time.Duration(uptime) * time.Second)
				}
			}
		}

		// Get timezone
		if link, err := os.Readlink("/etc/localtime"); err == nil {
			osInfo.Timezone = filepath.Base(link)
		}

		// Check for pending reboot
		if _, err := os.Stat("/var/run/reboot-required"); err == nil {
			osInfo.PendingReboot = true
		}
	}

	return osInfo
}

func (c *UnixSoftwareCollector) collectApplications() []models.Application {
	var apps []models.Application

	switch runtime.GOOS {
	case "darwin":
		// Use system_profiler for comprehensive app list
		out, err := exec.Command("system_profiler", "SPApplicationsDataType", "-json").Output()
		if err == nil {
			var data map[string][]map[string]interface{}
			if json.Unmarshal(out, &data) == nil {
				if appList, ok := data["SPApplicationsDataType"]; ok {
					for _, appInfo := range appList {
						app := models.Application{}

						if name, ok := appInfo["_name"].(string); ok {
							app.Name = name
						}
						if version, ok := appInfo["version"].(string); ok {
							app.Version = version
						}
						if path, ok := appInfo["path"].(string); ok {
							app.Path = path
						}
						if vendor, ok := appInfo["obtained_from"].(string); ok {
							if vendor == "apple" {
								app.Vendor = "Apple Inc."
								app.InstallSource = "Pre-installed"
							} else if vendor == "identified_developer" {
								app.InstallSource = "Developer"
							} else if vendor == "mac_app_store" {
								app.InstallSource = "App Store"
							}
						}

						// Get bundle ID from Info.plist if path exists
						if app.Path != "" {
							plistPath := filepath.Join(app.Path, "Contents", "Info.plist")
							if out, err := exec.Command("defaults", "read", plistPath, "CFBundleIdentifier").Output(); err == nil {
								app.BundleID = strings.TrimSpace(string(out))
							}
						}

						if app.Name != "" {
							// Detect license information
							app.License = c.detectLicense(&app)
							apps = append(apps, app)
						}
					}
				}
			}
		}

		// If system_profiler didn't work, scan /Applications
		if len(apps) == 0 {
			appDirs := []string{"/Applications", "/System/Applications"}
			for _, dir := range appDirs {
				entries, err := os.ReadDir(dir)
				if err != nil {
					continue
				}
				for _, entry := range entries {
					if strings.HasSuffix(entry.Name(), ".app") {
						appPath := filepath.Join(dir, entry.Name())
						app := models.Application{
							Name: strings.TrimSuffix(entry.Name(), ".app"),
							Path: appPath,
						}

						// Read Info.plist for version
						plistPath := filepath.Join(appPath, "Contents", "Info.plist")
						if out, err := exec.Command("defaults", "read", plistPath, "CFBundleShortVersionString").Output(); err == nil {
							app.Version = strings.TrimSpace(string(out))
						}
						if out, err := exec.Command("defaults", "read", plistPath, "CFBundleIdentifier").Output(); err == nil {
							app.BundleID = strings.TrimSpace(string(out))
						}

						// Get app size
						if info, err := os.Stat(appPath); err == nil {
							if info.IsDir() {
								size := getDirSize(appPath)
								app.SizeBytes = size
								app.SizeHuman = formatBytes(size)
							}
						}

						// Detect license information
						app.License = c.detectLicense(&app)

						apps = append(apps, app)
					}
				}
			}
		}

	default:
		// Linux: Try different package managers
		// dpkg (Debian/Ubuntu)
		out, err := exec.Command("dpkg-query", "-W", "-f=${Package}|${Version}|${Installed-Size}\n").Output()
		if err == nil {
			lines := strings.Split(string(out), "\n")
			for _, line := range lines {
				parts := strings.Split(line, "|")
				if len(parts) >= 2 {
					app := models.Application{
						Name:    parts[0],
						Version: parts[1],
					}
					if len(parts) >= 3 {
						if size, err := strconv.ParseInt(parts[2], 10, 64); err == nil {
							app.SizeBytes = size * 1024 // dpkg reports in KB
							app.SizeHuman = formatBytes(app.SizeBytes)
						}
					}
					if app.Name != "" {
						// Detect license information
						app.License = c.detectLicense(&app)
						apps = append(apps, app)
					}
				}
			}
		}

		// rpm (RHEL/Fedora)
		if len(apps) == 0 {
			out, err := exec.Command("rpm", "-qa", "--qf", "%{NAME}|%{VERSION}|%{SIZE}\n").Output()
			if err == nil {
				lines := strings.Split(string(out), "\n")
				for _, line := range lines {
					parts := strings.Split(line, "|")
					if len(parts) >= 2 {
						app := models.Application{
							Name:    parts[0],
							Version: parts[1],
						}
						if len(parts) >= 3 {
							if size, err := strconv.ParseInt(parts[2], 10, 64); err == nil {
								app.SizeBytes = size
								app.SizeHuman = formatBytes(app.SizeBytes)
							}
						}
						if app.Name != "" {
							// Detect license information
							app.License = c.detectLicense(&app)
							apps = append(apps, app)
						}
					}
				}
			}
		}
	}

	return apps
}

func (c *UnixSoftwareCollector) collectServices() []models.Service {
	var services []models.Service

	switch runtime.GOOS {
	case "darwin":
		// List launchd services
		out, err := exec.Command("launchctl", "list").Output()
		if err == nil {
			lines := strings.Split(string(out), "\n")
			for i, line := range lines {
				if i == 0 { // Skip header
					continue
				}
				fields := strings.Fields(line)
				if len(fields) >= 3 {
					service := models.Service{
						Name: fields[2],
					}

					// Determine status from PID column
					if fields[0] != "-" {
						service.Status = "Running"
						if pid, err := strconv.Atoi(fields[0]); err == nil {
							service.PID = pid
						}
					} else {
						service.Status = "Stopped"
					}

					// Filter out system noise
					if strings.HasPrefix(service.Name, "com.apple") ||
						strings.HasPrefix(service.Name, "application.") ||
						strings.Contains(service.Name, ".") {
						services = append(services, service)
					}
				}
			}
		}

	default:
		// Linux: Use systemctl
		out, err := exec.Command("systemctl", "list-units", "--type=service", "--all", "--no-pager", "--plain").Output()
		if err == nil {
			lines := strings.Split(string(out), "\n")
			for _, line := range lines {
				fields := strings.Fields(line)
				if len(fields) >= 4 && strings.HasSuffix(fields[0], ".service") {
					service := models.Service{
						Name:        strings.TrimSuffix(fields[0], ".service"),
						DisplayName: strings.TrimSuffix(fields[0], ".service"),
					}

					// Parse status
					if fields[2] == "active" {
						service.Status = "Running"
					} else if fields[2] == "inactive" {
						service.Status = "Stopped"
					} else {
						service.Status = fields[2]
					}

					services = append(services, service)
				}
			}
		}
	}

	return services
}

func (c *UnixSoftwareCollector) collectStartupPrograms() []models.StartupProgram {
	var programs []models.StartupProgram

	switch runtime.GOOS {
	case "darwin":
		// Check login items using osascript
		out, err := exec.Command("osascript", "-e",
			`tell application "System Events" to get the name of every login item`).Output()
		if err == nil {
			items := strings.Split(strings.TrimSpace(string(out)), ", ")
			for _, item := range items {
				if item != "" {
					programs = append(programs, models.StartupProgram{
						Name:     item,
						Location: "Login Items",
						Enabled:  true,
					})
				}
			}
		}

		// Check LaunchAgents
		launchAgentDirs := []string{
			"/Library/LaunchAgents",
			filepath.Join(os.Getenv("HOME"), "Library/LaunchAgents"),
		}

		for _, dir := range launchAgentDirs {
			entries, err := os.ReadDir(dir)
			if err != nil {
				continue
			}
			for _, entry := range entries {
				if strings.HasSuffix(entry.Name(), ".plist") {
					programs = append(programs, models.StartupProgram{
						Name:     strings.TrimSuffix(entry.Name(), ".plist"),
						Location: dir,
						Enabled:  true,
					})
				}
			}
		}

	default:
		// Linux: Check systemd user services and autostart
		autostartDir := filepath.Join(os.Getenv("HOME"), ".config/autostart")
		entries, err := os.ReadDir(autostartDir)
		if err == nil {
			for _, entry := range entries {
				if strings.HasSuffix(entry.Name(), ".desktop") {
					programs = append(programs, models.StartupProgram{
						Name:     strings.TrimSuffix(entry.Name(), ".desktop"),
						Location: autostartDir,
						Enabled:  true,
					})
				}
			}
		}

		// Check systemd user services
		userServicesDir := filepath.Join(os.Getenv("HOME"), ".config/systemd/user")
		if entries, err := os.ReadDir(userServicesDir); err == nil {
			for _, entry := range entries {
				if strings.HasSuffix(entry.Name(), ".service") {
					programs = append(programs, models.StartupProgram{
						Name:     strings.TrimSuffix(entry.Name(), ".service"),
						Location: userServicesDir,
						Enabled:  true,
					})
				}
			}
		}
	}

	return programs
}

// collectRunningProcesses collects information about all running processes
func (c *UnixSoftwareCollector) collectRunningProcesses() []models.RunningProcess {
	var processes []models.RunningProcess

	switch runtime.GOOS {
	case "linux":
		processes = c.collectRunningProcessesLinux()
	case "darwin":
		processes = c.collectRunningProcessesDarwin()
	}

	return processes
}

// collectRunningProcessesLinux collects process info from /proc filesystem
func (c *UnixSoftwareCollector) collectRunningProcessesLinux() []models.RunningProcess {
	var processes []models.RunningProcess

	// Get system boot time for calculating process start times
	var bootTime time.Time
	if data, err := os.ReadFile("/proc/stat"); err == nil {
		for _, line := range strings.Split(string(data), "\n") {
			if strings.HasPrefix(line, "btime ") {
				if bt, err := strconv.ParseInt(strings.TrimPrefix(line, "btime "), 10, 64); err == nil {
					bootTime = time.Unix(bt, 0)
				}
				break
			}
		}
	}

	// Get clock ticks per second for time calculations
	clkTck := int64(100) // default
	if out, err := exec.Command("getconf", "CLK_TCK").Output(); err == nil {
		if tck, err := strconv.ParseInt(strings.TrimSpace(string(out)), 10, 64); err == nil {
			clkTck = tck
		}
	}

	// Get total memory for percentage calculation
	var totalMem int64
	if data, err := os.ReadFile("/proc/meminfo"); err == nil {
		for _, line := range strings.Split(string(data), "\n") {
			if strings.HasPrefix(line, "MemTotal:") {
				fields := strings.Fields(line)
				if len(fields) >= 2 {
					if mem, err := strconv.ParseInt(fields[1], 10, 64); err == nil {
						totalMem = mem * 1024 // Convert from KB to bytes
					}
				}
				break
			}
		}
	}

	// Read /proc to find all process directories
	procDir, err := os.Open("/proc")
	if err != nil {
		return processes
	}
	defer procDir.Close()

	entries, err := procDir.Readdirnames(-1)
	if err != nil {
		return processes
	}

	for _, entry := range entries {
		// Only process numeric directories (PIDs)
		pid, err := strconv.Atoi(entry)
		if err != nil {
			continue
		}

		proc := models.RunningProcess{
			PID: pid,
		}

		procPath := "/proc/" + entry

		// Read process name and state from /proc/[pid]/stat
		if data, err := os.ReadFile(procPath + "/stat"); err == nil {
			statLine := string(data)
			// Parse: pid (comm) state ...
			// comm can contain spaces and parentheses, so we need to find the last )
			start := strings.Index(statLine, "(")
			end := strings.LastIndex(statLine, ")")
			if start >= 0 && end > start {
				proc.Name = statLine[start+1 : end]
				// Parse the rest of the fields after the closing parenthesis
				rest := strings.Fields(statLine[end+2:])
				if len(rest) >= 20 {
					// Field 0: state
					switch rest[0] {
					case "R":
						proc.State = "Running"
					case "S":
						proc.State = "Sleeping"
					case "D":
						proc.State = "DiskSleep"
					case "Z":
						proc.State = "Zombie"
					case "T":
						proc.State = "Stopped"
					case "I":
						proc.State = "Idle"
					default:
						proc.State = rest[0]
					}

					// Field 1: ppid
					if ppid, err := strconv.Atoi(rest[1]); err == nil {
						proc.ParentPID = ppid
					}

					// Field 16: priority
					if pri, err := strconv.Atoi(rest[15]); err == nil {
						proc.Priority = pri
					}

					// Field 17: nice
					// Field 19: num_threads
					if threads, err := strconv.Atoi(rest[17]); err == nil {
						proc.ThreadCount = threads
					}

					// Field 21: starttime (in clock ticks since boot)
					if startTicks, err := strconv.ParseInt(rest[19], 10, 64); err == nil && !bootTime.IsZero() {
						startSecs := startTicks / clkTck
						startTime := bootTime.Add(time.Duration(startSecs) * time.Second)
						proc.StartTime = startTime.Format(time.RFC3339)
						proc.RuntimeSecs = int64(time.Since(startTime).Seconds())
						proc.RuntimeHuman = formatDuration(time.Since(startTime))
					}
				}
			}
		}

		// Read command line from /proc/[pid]/cmdline
		if data, err := os.ReadFile(procPath + "/cmdline"); err == nil {
			cmdline := strings.ReplaceAll(string(data), "\x00", " ")
			proc.CommandLine = strings.TrimSpace(cmdline)
		}

		// Read memory info from /proc/[pid]/status
		if data, err := os.ReadFile(procPath + "/status"); err == nil {
			for _, line := range strings.Split(string(data), "\n") {
				if strings.HasPrefix(line, "VmRSS:") {
					fields := strings.Fields(line)
					if len(fields) >= 2 {
						if rss, err := strconv.ParseInt(fields[1], 10, 64); err == nil {
							proc.MemoryBytes = rss * 1024 // Convert from KB to bytes
							proc.MemoryHuman = formatBytes(proc.MemoryBytes)
							if totalMem > 0 {
								proc.MemoryPercent = float64(proc.MemoryBytes) / float64(totalMem) * 100
							}
						}
					}
				} else if strings.HasPrefix(line, "Uid:") {
					fields := strings.Fields(line)
					if len(fields) >= 2 {
						if uid, err := strconv.Atoi(fields[1]); err == nil {
							// Try to resolve username
							if out, err := exec.Command("getent", "passwd", strconv.Itoa(uid)).Output(); err == nil {
								parts := strings.Split(string(out), ":")
								if len(parts) > 0 {
									proc.User = parts[0]
								}
							}
						}
					}
				}
			}
		}

		// Get CPU usage (requires sampling - we'll use /proc/[pid]/stat utime+stime)
		// For simplicity, we just get the current CPU time ratio
		// A more accurate measure would require two samples

		// Determine process category
		proc.Category = categorizeProcess(proc.Name, proc.CommandLine)

		// Get parent name
		if proc.ParentPID > 0 {
			if data, err := os.ReadFile("/proc/" + strconv.Itoa(proc.ParentPID) + "/comm"); err == nil {
				proc.ParentName = strings.TrimSpace(string(data))
			}
		}

		// Skip kernel threads (those with empty cmdline and ppid=2 or pid=2)
		if proc.CommandLine == "" && (proc.ParentPID == 2 || proc.PID == 2) {
			continue
		}

		processes = append(processes, proc)
	}

	return processes
}

// collectRunningProcessesDarwin collects process info on macOS
func (c *UnixSoftwareCollector) collectRunningProcessesDarwin() []models.RunningProcess {
	var processes []models.RunningProcess

	// Use ps command to get process info
	out, err := exec.Command("ps", "-axo", "pid,ppid,user,state,pri,nlwp,rss,vsz,etime,command").Output()
	if err != nil {
		return processes
	}

	// Get total memory
	var totalMem int64
	if memOut, err := exec.Command("sysctl", "-n", "hw.memsize").Output(); err == nil {
		if mem, err := strconv.ParseInt(strings.TrimSpace(string(memOut)), 10, 64); err == nil {
			totalMem = mem
		}
	}

	lines := strings.Split(string(out), "\n")
	for i, line := range lines {
		if i == 0 || strings.TrimSpace(line) == "" {
			continue // Skip header
		}

		fields := strings.Fields(line)
		if len(fields) < 10 {
			continue
		}

		pid, err := strconv.Atoi(fields[0])
		if err != nil {
			continue
		}

		proc := models.RunningProcess{
			PID: pid,
		}

		if ppid, err := strconv.Atoi(fields[1]); err == nil {
			proc.ParentPID = ppid
		}
		proc.User = fields[2]
		proc.State = parseDarwinState(fields[3])
		if pri, err := strconv.Atoi(fields[4]); err == nil {
			proc.Priority = pri
		}
		if threads, err := strconv.Atoi(fields[5]); err == nil {
			proc.ThreadCount = threads
		}
		if rss, err := strconv.ParseInt(fields[6], 10, 64); err == nil {
			proc.MemoryBytes = rss * 1024 // RSS is in KB
			proc.MemoryHuman = formatBytes(proc.MemoryBytes)
			if totalMem > 0 {
				proc.MemoryPercent = float64(proc.MemoryBytes) / float64(totalMem) * 100
			}
		}

		// Parse elapsed time (etime format: [[DD-]hh:]mm:ss)
		proc.RuntimeSecs = parseEtime(fields[8])
		if proc.RuntimeSecs > 0 {
			proc.RuntimeHuman = formatDuration(time.Duration(proc.RuntimeSecs) * time.Second)
			proc.StartTime = time.Now().Add(-time.Duration(proc.RuntimeSecs) * time.Second).Format(time.RFC3339)
		}

		// Command is everything from field 9 onwards
		proc.CommandLine = strings.Join(fields[9:], " ")
		proc.Name = filepath.Base(strings.Split(proc.CommandLine, " ")[0])

		proc.Category = categorizeProcess(proc.Name, proc.CommandLine)

		processes = append(processes, proc)
	}

	return processes
}

// detectLicense attempts to detect license information for an application
func (c *UnixSoftwareCollector) detectLicense(app *models.Application) *models.SoftwareLicense {
	if app.Name == "" {
		return nil
	}

	// Check known open source / freeware applications
	if isOpenSourceApp(app.Name, app.BundleID) {
		return &models.SoftwareLicense{
			Type:   "OpenSource",
			Status: "Licensed",
		}
	}

	// Check known freeware applications
	if isFreewareApp(app.Name, app.BundleID) {
		return &models.SoftwareLicense{
			Type:   "Freeware",
			Status: "Licensed",
		}
	}

	switch runtime.GOOS {
	case "darwin":
		return c.detectLicenseDarwin(app)
	default:
		return c.detectLicenseLinux(app)
	}
}

// detectLicenseDarwin detects license info on macOS
func (c *UnixSoftwareCollector) detectLicenseDarwin(app *models.Application) *models.SoftwareLicense {
	license := &models.SoftwareLicense{
		Type:   "Unknown",
		Status: "Unknown",
	}

	// Check if app is from Mac App Store (has receipt)
	if app.Path != "" {
		receiptPath := filepath.Join(app.Path, "Contents", "_MASReceipt", "receipt")
		if _, err := os.Stat(receiptPath); err == nil {
			license.Type = "Perpetual"
			license.Status = "Licensed"
			license.Channel = "App Store"
			return license
		}
	}

	// Check for known subscription apps by bundle ID
	if app.BundleID != "" {
		if licInfo := detectSubscriptionAppDarwin(app.BundleID); licInfo != nil {
			return licInfo
		}
	}

	// Check for Microsoft Office license
	if strings.Contains(strings.ToLower(app.Name), "microsoft") {
		return detectMicrosoftLicenseDarwin(app.Name)
	}

	// Check for Adobe apps
	if strings.Contains(strings.ToLower(app.Name), "adobe") ||
		strings.HasPrefix(app.BundleID, "com.adobe") {
		return detectAdobeLicenseDarwin()
	}

	// Check if it's an Apple system app
	if strings.HasPrefix(app.BundleID, "com.apple.") ||
		(app.Path != "" && strings.HasPrefix(app.Path, "/System/")) {
		license.Type = "OEM"
		license.Status = "Licensed"
		license.Channel = "Pre-installed"
		return license
	}

	// Try to detect from preferences
	if app.BundleID != "" {
		prefsPath := filepath.Join(os.Getenv("HOME"), "Library/Preferences", app.BundleID+".plist")
		if _, err := os.Stat(prefsPath); err == nil {
			// Read plist for license keys
			if out, err := exec.Command("defaults", "read", prefsPath, "LicenseKey").Output(); err == nil {
				key := strings.TrimSpace(string(out))
				if key != "" {
					license.Type = "Perpetual"
					license.Status = "Licensed"
					license.Key = maskLicenseKey(key)
					return license
				}
			}
			// Check for registration/license status
			for _, keyName := range []string{"registered", "licensed", "isRegistered", "isLicensed", "proVersion"} {
				if out, err := exec.Command("defaults", "read", prefsPath, keyName).Output(); err == nil {
					val := strings.TrimSpace(string(out))
					if val == "1" || val == "true" || val == "YES" {
						license.Type = "Perpetual"
						license.Status = "Licensed"
						return license
					}
				}
			}
		}
	}

	return nil
}

// detectLicenseLinux detects license info on Linux
func (c *UnixSoftwareCollector) detectLicenseLinux(app *models.Application) *models.SoftwareLicense {
	appNameLower := strings.ToLower(app.Name)

	// Check for JetBrains IDEs (subscription) first
	if strings.Contains(appNameLower, "intellij") ||
		strings.Contains(appNameLower, "pycharm") ||
		strings.Contains(appNameLower, "webstorm") ||
		strings.Contains(appNameLower, "goland") ||
		strings.Contains(appNameLower, "clion") ||
		strings.Contains(appNameLower, "rider") ||
		strings.Contains(appNameLower, "phpstorm") ||
		strings.Contains(appNameLower, "rubymine") ||
		strings.Contains(appNameLower, "datagrip") {
		return &models.SoftwareLicense{
			Type:   "Subscription",
			Status: "Unknown",
		}
	}

	// Debian/Ubuntu: Read license from copyright file
	copyrightPath := "/usr/share/doc/" + app.Name + "/copyright"
	if data, err := os.ReadFile(copyrightPath); err == nil {
		content := string(data)
		license := &models.SoftwareLicense{
			Status: "Licensed",
		}

		// Look for License: field in debian copyright format
		contentLower := strings.ToLower(content)
		if strings.Contains(contentLower, "license:") {
			// Check for open source licenses
			if strings.Contains(contentLower, "gpl") ||
				strings.Contains(contentLower, "gnu general public license") {
				license.Type = "OpenSource"
				return license
			}
			if strings.Contains(contentLower, "mit") {
				license.Type = "OpenSource"
				return license
			}
			if strings.Contains(contentLower, "apache") {
				license.Type = "OpenSource"
				return license
			}
			if strings.Contains(contentLower, "bsd") {
				license.Type = "OpenSource"
				return license
			}
			if strings.Contains(contentLower, "lgpl") {
				license.Type = "OpenSource"
				return license
			}
			if strings.Contains(contentLower, "mpl") || strings.Contains(contentLower, "mozilla public license") {
				license.Type = "OpenSource"
				return license
			}
			if strings.Contains(contentLower, "public domain") {
				license.Type = "OpenSource"
				return license
			}
			if strings.Contains(contentLower, "proprietary") ||
				strings.Contains(contentLower, "commercial") {
				license.Type = "Perpetual"
				return license
			}
			// Found license info but type unknown
			license.Type = "Unknown"
			return license
		}
	}

	// rpm-based systems: Query license from rpm database
	out, err := exec.Command("rpm", "-q", "--qf", "%{LICENSE}", app.Name).Output()
	if err == nil {
		licenseStr := strings.TrimSpace(string(out))
		if licenseStr != "" && !strings.Contains(licenseStr, "not installed") && !strings.Contains(licenseStr, "is not installed") {
			license := &models.SoftwareLicense{
				Status: "Licensed",
			}
			licenseLower := strings.ToLower(licenseStr)
			if strings.Contains(licenseLower, "gpl") ||
				strings.Contains(licenseLower, "mit") ||
				strings.Contains(licenseLower, "apache") ||
				strings.Contains(licenseLower, "bsd") ||
				strings.Contains(licenseLower, "lgpl") ||
				strings.Contains(licenseLower, "mpl") {
				license.Type = "OpenSource"
			} else if strings.Contains(licenseLower, "proprietary") ||
				strings.Contains(licenseLower, "commercial") {
				license.Type = "Perpetual"
			} else {
				license.Type = "Unknown"
			}
			return license
		}
	}

	return nil
}

// detectSubscriptionAppDarwin checks for known subscription-based apps on macOS
func detectSubscriptionAppDarwin(bundleID string) *models.SoftwareLicense {
	subscriptionApps := map[string]bool{
		"com.spotify.client":       true,
		"com.netflix.Netflix":      true,
		"com.1password.1password":  true,
		"com.setapp.DesktopClient": true,
		"com.notion.id":            true,
		"com.figma.Desktop":        true,
		"com.slack.Slack":          true,
		"com.dropbox.client":       true,
	}

	if subscriptionApps[bundleID] {
		return &models.SoftwareLicense{
			Type:   "Subscription",
			Status: "Unknown",
		}
	}
	return nil
}

// detectMicrosoftLicenseDarwin detects Microsoft Office license on macOS
func detectMicrosoftLicenseDarwin(appName string) *models.SoftwareLicense {
	license := &models.SoftwareLicense{
		Type:   "Unknown",
		Status: "Unknown",
	}

	// Check for Microsoft 365 subscription status
	licensePath := filepath.Join(os.Getenv("HOME"), "Library/Group Containers/UBF8T346G9.Office/Licenses")
	if entries, err := os.ReadDir(licensePath); err == nil && len(entries) > 0 {
		license.Type = "Subscription"
		license.Status = "Licensed"
		license.Channel = "Microsoft 365"
		return license
	}

	// Check for volume license
	vlPath := "/Library/Preferences/com.microsoft.office.licensingV2.plist"
	if _, err := os.Stat(vlPath); err == nil {
		license.Type = "Volume"
		license.Status = "Licensed"
		return license
	}

	return license
}

// detectAdobeLicenseDarwin detects Adobe license on macOS
func detectAdobeLicenseDarwin() *models.SoftwareLicense {
	license := &models.SoftwareLicense{
		Type:   "Subscription",
		Status: "Unknown",
	}

	// Adobe CC apps are subscription-based
	// Check for Creative Cloud licensing
	adobeLibPath := filepath.Join(os.Getenv("HOME"), "Library/Application Support/Adobe")
	if _, err := os.Stat(adobeLibPath); err == nil {
		// Look for license files
		filepath.Walk(adobeLibPath, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return nil
			}
			if strings.Contains(info.Name(), "License") || strings.Contains(info.Name(), "subscription") {
				license.Status = "Licensed"
				return filepath.SkipAll
			}
			return nil
		})
	}

	return license
}
