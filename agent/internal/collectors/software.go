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

// DarwinSoftwareCollector collects software info on macOS
type DarwinSoftwareCollector struct{}

// NewDarwinSoftwareCollector creates a new software collector for macOS
func NewDarwinSoftwareCollector() *DarwinSoftwareCollector {
	return &DarwinSoftwareCollector{}
}

// Name returns the collector name
func (c *DarwinSoftwareCollector) Name() string {
	return "software"
}

// Collect gathers software information
func (c *DarwinSoftwareCollector) Collect() (interface{}, error) {
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
	sw.UsageSummary = c.collectUsageSummary(sw.RunningProcesses)

	return sw, nil
}

func (c *DarwinSoftwareCollector) collectOperatingSystem() models.OperatingSystem {
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

	case "windows":
		// Windows OS info
		osInfo.Name = "Microsoft Windows"

		if out, err := exec.Command("wmic", "os", "get", "caption", "/value").Output(); err == nil {
			osInfo.Name = parseWmicValueSoftware(string(out), "Caption")
		}
		if out, err := exec.Command("wmic", "os", "get", "version", "/value").Output(); err == nil {
			osInfo.Version = parseWmicValueSoftware(string(out), "Version")
		}
		if out, err := exec.Command("wmic", "os", "get", "buildnumber", "/value").Output(); err == nil {
			osInfo.BuildNumber = parseWmicValueSoftware(string(out), "BuildNumber")
		}

		// Get last boot time
		if out, err := exec.Command("wmic", "os", "get", "lastbootuptime", "/value").Output(); err == nil {
			bootStr := parseWmicValueSoftware(string(out), "LastBootUpTime")
			if len(bootStr) >= 14 {
				// Parse WMI date format: 20240115123456.000000+000
				year, _ := strconv.Atoi(bootStr[0:4])
				month, _ := strconv.Atoi(bootStr[4:6])
				day, _ := strconv.Atoi(bootStr[6:8])
				hour, _ := strconv.Atoi(bootStr[8:10])
				min, _ := strconv.Atoi(bootStr[10:12])
				sec, _ := strconv.Atoi(bootStr[12:14])
				bootTime := time.Date(year, time.Month(month), day, hour, min, sec, 0, time.Local)
				osInfo.LastBootTime = bootTime.Format(time.RFC3339)
				osInfo.Uptime = int64(time.Since(bootTime).Seconds())
				osInfo.UptimeHuman = formatDuration(time.Since(bootTime))
			}
		}

		// Get timezone
		if out, err := exec.Command("wmic", "timezone", "get", "caption", "/value").Output(); err == nil {
			osInfo.Timezone = parseWmicValueSoftware(string(out), "Caption")
		}

		// Get locale
		if out, err := exec.Command("wmic", "os", "get", "locale", "/value").Output(); err == nil {
			osInfo.Locale = parseWmicValueSoftware(string(out), "Locale")
		}

		// Check for pending reboot (Windows Update)
		if out, err := exec.Command("reg", "query", "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\WindowsUpdate\\Auto Update\\RebootRequired").Output(); err == nil {
			if len(out) > 0 {
				osInfo.PendingReboot = true
			}
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

func (c *DarwinSoftwareCollector) collectApplications() []models.Application {
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

	case "windows":
		// Windows: Query installed programs from registry via wmic
		out, err := exec.Command("wmic", "product", "get", "name,version,vendor,installdate", "/format:csv").Output()
		if err == nil {
			lines := strings.Split(string(out), "\n")
			for i, line := range lines {
				if i == 0 || strings.TrimSpace(line) == "" {
					continue
				}
				fields := strings.Split(line, ",")
				if len(fields) >= 4 {
					app := models.Application{
						Name:    strings.TrimSpace(fields[2]),
						Vendor:  strings.TrimSpace(fields[4]),
						Version: strings.TrimSpace(fields[3]),
					}

					// Parse install date (YYYYMMDD)
					dateStr := strings.TrimSpace(fields[1])
					if len(dateStr) == 8 {
						app.InstallDate = dateStr[:4] + "-" + dateStr[4:6] + "-" + dateStr[6:8]
					}

					if app.Name != "" {
						// Detect license information
						app.License = c.detectLicense(&app)
						apps = append(apps, app)
					}
				}
			}
		}

		// Also check Add/Remove Programs via registry (faster than wmic product)
		regPaths := []string{
			`HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall`,
			`HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall`,
		}

		for _, regPath := range regPaths {
			out, err := exec.Command("reg", "query", regPath).Output()
			if err != nil {
				continue
			}

			subkeys := strings.Split(string(out), "\n")
			for _, subkey := range subkeys {
				subkey = strings.TrimSpace(subkey)
				if subkey == "" || !strings.HasPrefix(subkey, "HKEY_") {
					continue
				}

				// Query each subkey for DisplayName and DisplayVersion
				if queryOut, err := exec.Command("reg", "query", subkey, "/v", "DisplayName").Output(); err == nil {
					name := extractRegValue(string(queryOut))
					if name == "" {
						continue
					}

					app := models.Application{Name: name}

					if verOut, err := exec.Command("reg", "query", subkey, "/v", "DisplayVersion").Output(); err == nil {
						app.Version = extractRegValue(string(verOut))
					}
					if pubOut, err := exec.Command("reg", "query", subkey, "/v", "Publisher").Output(); err == nil {
						app.Vendor = extractRegValue(string(pubOut))
					}
					if locOut, err := exec.Command("reg", "query", subkey, "/v", "InstallLocation").Output(); err == nil {
						app.Path = extractRegValue(string(locOut))
					}

					// Avoid duplicates
					isDupe := false
					for _, existing := range apps {
						if existing.Name == app.Name && existing.Version == app.Version {
							isDupe = true
							break
						}
					}
					if !isDupe && app.Name != "" {
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

func (c *DarwinSoftwareCollector) collectServices() []models.Service {
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

	case "windows":
		// Windows: Use sc query or wmic
		out, err := exec.Command("wmic", "service", "get", "name,displayname,state,processid,startmode", "/format:csv").Output()
		if err == nil {
			lines := strings.Split(string(out), "\n")
			for i, line := range lines {
				if i == 0 || strings.TrimSpace(line) == "" {
					continue
				}
				fields := strings.Split(line, ",")
				if len(fields) >= 5 {
					service := models.Service{
						Name:        strings.TrimSpace(fields[2]),
						DisplayName: strings.TrimSpace(fields[1]),
						StartupType: strings.TrimSpace(fields[4]),
					}

					// Parse state
					state := strings.TrimSpace(fields[3])
					switch state {
					case "Running":
						service.Status = "Running"
					case "Stopped":
						service.Status = "Stopped"
					default:
						service.Status = state
					}

					// Parse PID
					if pid, err := strconv.Atoi(strings.TrimSpace(fields[5])); err == nil && pid > 0 {
						service.PID = pid
					}

					if service.Name != "" {
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

func (c *DarwinSoftwareCollector) collectStartupPrograms() []models.StartupProgram {
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

	case "windows":
		// Windows: Check startup registry keys
		startupRegKeys := []string{
			`HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run`,
			`HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce`,
			`HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run`,
			`HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce`,
		}

		for _, regKey := range startupRegKeys {
			out, err := exec.Command("reg", "query", regKey).Output()
			if err != nil {
				continue
			}

			lines := strings.Split(string(out), "\n")
			for _, line := range lines {
				line = strings.TrimSpace(line)
				if line == "" || strings.HasPrefix(line, "HKEY_") {
					continue
				}

				// Parse registry entry: Name    REG_SZ    Value
				fields := strings.Fields(line)
				if len(fields) >= 3 {
					program := models.StartupProgram{
						Name:     fields[0],
						Location: regKey,
						Command:  strings.Join(fields[2:], " "),
						Enabled:  true,
					}
					programs = append(programs, program)
				}
			}
		}

		// Check startup folder
		startupFolders := []string{
			filepath.Join(os.Getenv("APPDATA"), `Microsoft\Windows\Start Menu\Programs\Startup`),
			`C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Startup`,
		}

		for _, folder := range startupFolders {
			entries, err := os.ReadDir(folder)
			if err != nil {
				continue
			}
			for _, entry := range entries {
				if strings.HasSuffix(entry.Name(), ".lnk") || strings.HasSuffix(entry.Name(), ".exe") {
					programs = append(programs, models.StartupProgram{
						Name:     strings.TrimSuffix(strings.TrimSuffix(entry.Name(), ".lnk"), ".exe"),
						Location: folder,
						Enabled:  true,
					})
				}
			}
		}

		// Check scheduled tasks that run at startup
		out, err := exec.Command("schtasks", "/query", "/fo", "csv", "/v").Output()
		if err == nil {
			lines := strings.Split(string(out), "\n")
			for i, line := range lines {
				if i == 0 { // Skip header
					continue
				}
				fields := strings.Split(line, ",")
				if len(fields) > 5 {
					// Check if task runs at logon
					triggers := strings.ToLower(fields[4])
					if strings.Contains(triggers, "logon") || strings.Contains(triggers, "startup") {
						taskName := strings.Trim(fields[1], `"`)
						programs = append(programs, models.StartupProgram{
							Name:     taskName,
							Location: "Scheduled Tasks",
							Enabled:  strings.Trim(fields[3], `"`) == "Ready",
						})
					}
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
func (c *DarwinSoftwareCollector) collectRunningProcesses() []models.RunningProcess {
	var processes []models.RunningProcess

	switch runtime.GOOS {
	case "linux":
		processes = c.collectRunningProcessesLinux()
	case "darwin":
		processes = c.collectRunningProcessesDarwin()
	case "windows":
		processes = c.collectRunningProcessesWindows()
	}

	return processes
}

// collectRunningProcessesLinux collects process info from /proc filesystem
func (c *DarwinSoftwareCollector) collectRunningProcessesLinux() []models.RunningProcess {
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
func (c *DarwinSoftwareCollector) collectRunningProcessesDarwin() []models.RunningProcess {
	var processes []models.RunningProcess

	// Use ps command to get process info
	out, err := exec.Command("ps", "-axo", "pid,ppid,user,state,pri,nlwp,rss,vsz,etime,command").Output()
	if err != nil {
		return processes
	}

	// Get total memory
	var totalMem int64
	if out, err := exec.Command("sysctl", "-n", "hw.memsize").Output(); err == nil {
		if mem, err := strconv.ParseInt(strings.TrimSpace(string(out)), 10, 64); err == nil {
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

// collectRunningProcessesWindows collects process info on Windows
func (c *DarwinSoftwareCollector) collectRunningProcessesWindows() []models.RunningProcess {
	var processes []models.RunningProcess

	// Use PowerShell to get process info
	psCmd := `Get-Process | Select-Object Id,ProcessName,CPU,WorkingSet64,StartTime,Threads,PriorityClass,Path | ConvertTo-Json`
	out, err := exec.Command("powershell", "-Command", psCmd).Output()
	if err != nil {
		return processes
	}

	var procList []map[string]interface{}
	if err := json.Unmarshal(out, &procList); err != nil {
		// Try as single object
		var singleProc map[string]interface{}
		if err := json.Unmarshal(out, &singleProc); err == nil {
			procList = []map[string]interface{}{singleProc}
		} else {
			return processes
		}
	}

	// Get total memory
	var totalMem int64
	if memOut, err := exec.Command("wmic", "os", "get", "totalvisiblememorysize", "/value").Output(); err == nil {
		memStr := parseWmicValueSoftware(string(memOut), "TotalVisibleMemorySize")
		if mem, err := strconv.ParseInt(memStr, 10, 64); err == nil {
			totalMem = mem * 1024 // Convert KB to bytes
		}
	}

	for _, p := range procList {
		proc := models.RunningProcess{}

		if id, ok := p["Id"].(float64); ok {
			proc.PID = int(id)
		}
		if name, ok := p["ProcessName"].(string); ok {
			proc.Name = name
		}
		if path, ok := p["Path"].(string); ok {
			proc.CommandLine = path
		}
		if ws, ok := p["WorkingSet64"].(float64); ok {
			proc.MemoryBytes = int64(ws)
			proc.MemoryHuman = formatBytes(proc.MemoryBytes)
			if totalMem > 0 {
				proc.MemoryPercent = float64(proc.MemoryBytes) / float64(totalMem) * 100
			}
		}
		if threads, ok := p["Threads"].([]interface{}); ok {
			proc.ThreadCount = len(threads)
		}
		if startTime, ok := p["StartTime"].(string); ok {
			if t, err := time.Parse(time.RFC3339, startTime); err == nil {
				proc.StartTime = startTime
				proc.RuntimeSecs = int64(time.Since(t).Seconds())
				proc.RuntimeHuman = formatDuration(time.Since(t))
			}
		}

		proc.Category = categorizeProcess(proc.Name, proc.CommandLine)
		proc.State = "Running"

		processes = append(processes, proc)
	}

	return processes
}

// collectUsageSummary generates a usage summary from the running processes
func (c *DarwinSoftwareCollector) collectUsageSummary(processes []models.RunningProcess) *models.UsageSummary {
	if len(processes) == 0 {
		return nil
	}

	summary := &models.UsageSummary{
		TotalProcesses: len(processes),
	}

	// Calculate totals
	var totalMem int64
	var totalThreads int
	categoryStats := make(map[string]*models.CategoryUsageEntry)

	for _, p := range processes {
		totalMem += p.MemoryBytes
		totalThreads += p.ThreadCount

		// Aggregate by category
		cat := p.Category
		if cat == "" {
			cat = "Other"
		}
		if _, exists := categoryStats[cat]; !exists {
			categoryStats[cat] = &models.CategoryUsageEntry{
				Category: cat,
			}
		}
		categoryStats[cat].ProcessCount++
		categoryStats[cat].TotalCPU += p.CPUPercent
		categoryStats[cat].TotalMemBytes += p.MemoryBytes
	}

	summary.TotalThreads = totalThreads
	summary.TotalMemoryBytes = totalMem
	summary.TotalMemoryHuman = formatBytes(totalMem)

	// Get top 10 by memory
	memSorted := make([]models.RunningProcess, len(processes))
	copy(memSorted, processes)
	// Sort by memory descending
	for i := 0; i < len(memSorted)-1; i++ {
		for j := i + 1; j < len(memSorted); j++ {
			if memSorted[j].MemoryBytes > memSorted[i].MemoryBytes {
				memSorted[i], memSorted[j] = memSorted[j], memSorted[i]
			}
		}
	}
	for i := 0; i < 10 && i < len(memSorted); i++ {
		summary.TopMemProcesses = append(summary.TopMemProcesses, models.ProcessUsageEntry{
			PID:        memSorted[i].PID,
			Name:       memSorted[i].Name,
			Value:      memSorted[i].MemoryPercent,
			ValueHuman: memSorted[i].MemoryHuman,
		})
	}

	// Get top 10 by CPU
	cpuSorted := make([]models.RunningProcess, len(processes))
	copy(cpuSorted, processes)
	for i := 0; i < len(cpuSorted)-1; i++ {
		for j := i + 1; j < len(cpuSorted); j++ {
			if cpuSorted[j].CPUPercent > cpuSorted[i].CPUPercent {
				cpuSorted[i], cpuSorted[j] = cpuSorted[j], cpuSorted[i]
			}
		}
	}
	for i := 0; i < 10 && i < len(cpuSorted); i++ {
		summary.TopCPUProcesses = append(summary.TopCPUProcesses, models.ProcessUsageEntry{
			PID:        cpuSorted[i].PID,
			Name:       cpuSorted[i].Name,
			Value:      cpuSorted[i].CPUPercent,
			ValueHuman: strconv.FormatFloat(cpuSorted[i].CPUPercent, 'f', 1, 64) + "%",
		})
	}

	// Build category summary
	for _, cat := range categoryStats {
		cat.TotalMemHuman = formatBytes(cat.TotalMemBytes)
		summary.CategorySummary = append(summary.CategorySummary, *cat)
	}

	return summary
}

// categorizeProcess determines the category of a process based on its name
func categorizeProcess(name, cmdline string) string {
	nameLower := strings.ToLower(name)
	cmdLower := strings.ToLower(cmdline)

	// Browsers
	browsers := []string{"chrome", "firefox", "safari", "edge", "opera", "brave", "chromium", "vivaldi"}
	for _, b := range browsers {
		if strings.Contains(nameLower, b) {
			return "Browser"
		}
	}

	// IDEs and Editors
	ides := []string{"code", "vscode", "sublime", "atom", "intellij", "pycharm", "webstorm", "goland",
		"rider", "clion", "phpstorm", "vim", "nvim", "emacs", "xcode", "android-studio", "eclipse"}
	for _, ide := range ides {
		if strings.Contains(nameLower, ide) {
			return "IDE"
		}
	}

	// Office
	office := []string{"word", "excel", "powerpoint", "outlook", "libreoffice", "openoffice",
		"writer", "calc", "impress", "pages", "numbers", "keynote"}
	for _, o := range office {
		if strings.Contains(nameLower, o) {
			return "Office"
		}
	}

	// Media
	media := []string{"vlc", "spotify", "music", "video", "player", "audacity", "gimp", "inkscape",
		"blender", "obs", "kdenlive", "ffmpeg", "mpv"}
	for _, m := range media {
		if strings.Contains(nameLower, m) {
			return "Media"
		}
	}

	// Communication
	comm := []string{"slack", "teams", "zoom", "discord", "skype", "telegram", "signal", "whatsapp", "messenger"}
	for _, c := range comm {
		if strings.Contains(nameLower, c) {
			return "Communication"
		}
	}

	// Development tools
	devtools := []string{"docker", "node", "python", "ruby", "java", "go", "cargo", "npm", "yarn",
		"git", "kubectl", "terraform", "ansible", "make", "cmake", "gcc", "clang"}
	for _, d := range devtools {
		if strings.Contains(nameLower, d) {
			return "Development"
		}
	}

	// Database
	db := []string{"mysql", "postgres", "mongodb", "redis", "sqlite", "mariadb", "cassandra"}
	for _, d := range db {
		if strings.Contains(nameLower, d) {
			return "Database"
		}
	}

	// System
	system := []string{"systemd", "init", "kernel", "kworker", "ksoftirq", "migration", "watchdog",
		"kthreadd", "sshd", "cron", "rsyslog", "journald", "dbus", "udev", "polkit"}
	for _, s := range system {
		if strings.Contains(nameLower, s) || strings.Contains(cmdLower, s) {
			return "System"
		}
	}

	// Network
	network := []string{"nginx", "apache", "httpd", "haproxy", "caddy", "traefik", "envoy"}
	for _, n := range network {
		if strings.Contains(nameLower, n) {
			return "Web Server"
		}
	}

	return "Other"
}

// parseDarwinState converts macOS process state to human readable
func parseDarwinState(state string) string {
	if len(state) == 0 {
		return "Unknown"
	}
	switch state[0] {
	case 'R':
		return "Running"
	case 'S':
		return "Sleeping"
	case 'U':
		return "Uninterruptible"
	case 'Z':
		return "Zombie"
	case 'T':
		return "Stopped"
	default:
		return state
	}
}

// parseEtime parses elapsed time format [[DD-]hh:]mm:ss to seconds
func parseEtime(etime string) int64 {
	var days, hours, minutes, seconds int64

	// Check for days
	if strings.Contains(etime, "-") {
		parts := strings.Split(etime, "-")
		if len(parts) == 2 {
			days, _ = strconv.ParseInt(parts[0], 10, 64)
			etime = parts[1]
		}
	}

	// Parse remaining time
	parts := strings.Split(etime, ":")
	switch len(parts) {
	case 3:
		hours, _ = strconv.ParseInt(parts[0], 10, 64)
		minutes, _ = strconv.ParseInt(parts[1], 10, 64)
		seconds, _ = strconv.ParseInt(parts[2], 10, 64)
	case 2:
		minutes, _ = strconv.ParseInt(parts[0], 10, 64)
		seconds, _ = strconv.ParseInt(parts[1], 10, 64)
	case 1:
		seconds, _ = strconv.ParseInt(parts[0], 10, 64)
	}

	return days*86400 + hours*3600 + minutes*60 + seconds
}

// Helper functions

func formatDuration(d time.Duration) string {
	days := int(d.Hours() / 24)
	hours := int(d.Hours()) % 24
	minutes := int(d.Minutes()) % 60

	if days > 0 {
		return strconv.Itoa(days) + "d " + strconv.Itoa(hours) + "h " + strconv.Itoa(minutes) + "m"
	}
	if hours > 0 {
		return strconv.Itoa(hours) + "h " + strconv.Itoa(minutes) + "m"
	}
	return strconv.Itoa(minutes) + "m"
}

func formatBytes(bytes int64) string {
	const (
		KB = 1024
		MB = KB * 1024
		GB = MB * 1024
	)

	switch {
	case bytes >= GB:
		return strconv.FormatFloat(float64(bytes)/float64(GB), 'f', 2, 64) + " GB"
	case bytes >= MB:
		return strconv.FormatFloat(float64(bytes)/float64(MB), 'f', 2, 64) + " MB"
	case bytes >= KB:
		return strconv.FormatFloat(float64(bytes)/float64(KB), 'f', 2, 64) + " KB"
	default:
		return strconv.FormatInt(bytes, 10) + " B"
	}
}

func getDirSize(path string) int64 {
	var size int64
	filepath.Walk(path, func(_ string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if !info.IsDir() {
			size += info.Size()
		}
		return nil
	})
	return size
}

// parseWmicValueSoftware extracts the value from wmic /value output format (Key=Value)
func parseWmicValueSoftware(output, key string) string {
	lines := strings.Split(output, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, key+"=") {
			return strings.TrimSpace(strings.TrimPrefix(line, key+"="))
		}
	}
	return ""
}

// extractRegValue extracts the value from reg query output
func extractRegValue(output string) string {
	lines := strings.Split(output, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "HKEY_") {
			continue
		}
		// Format: Name    REG_SZ    Value
		// We need to find REG_SZ or REG_EXPAND_SZ and get what follows
		if strings.Contains(line, "REG_SZ") || strings.Contains(line, "REG_EXPAND_SZ") {
			parts := strings.SplitN(line, "REG_SZ", 2)
			if len(parts) == 2 {
				return strings.TrimSpace(parts[1])
			}
			parts = strings.SplitN(line, "REG_EXPAND_SZ", 2)
			if len(parts) == 2 {
				return strings.TrimSpace(parts[1])
			}
		}
	}
	return ""
}

// detectLicense attempts to detect license information for an application
func (c *DarwinSoftwareCollector) detectLicense(app *models.Application) *models.SoftwareLicense {
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
	case "windows":
		return c.detectLicenseWindows(app)
	default:
		return c.detectLicenseLinux(app)
	}
}

// detectLicenseDarwin detects license info on macOS
func (c *DarwinSoftwareCollector) detectLicenseDarwin(app *models.Application) *models.SoftwareLicense {
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

// detectLicenseWindows detects license info on Windows
func (c *DarwinSoftwareCollector) detectLicenseWindows(app *models.Application) *models.SoftwareLicense {
	license := &models.SoftwareLicense{
		Type:   "Unknown",
		Status: "Unknown",
	}

	appNameLower := strings.ToLower(app.Name)

	// Microsoft Office detection
	if strings.Contains(appNameLower, "microsoft office") || strings.Contains(appNameLower, "microsoft 365") {
		return detectMicrosoftLicenseWindows()
	}

	// Adobe products
	if strings.Contains(appNameLower, "adobe") {
		return detectAdobeLicenseWindows()
	}

	// Windows itself
	if strings.Contains(appNameLower, "windows") && app.Vendor == "Microsoft Corporation" {
		return detectWindowsLicense()
	}

	// Check common registry locations for license keys
	if app.ProductCode != "" {
		regPath := `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\` + app.ProductCode
		if out, err := exec.Command("reg", "query", regPath, "/v", "ProductID").Output(); err == nil {
			productID := extractRegValue(string(out))
			if productID != "" {
				license.ProductID = productID
				license.Type = "Perpetual"
				license.Status = "Licensed"
			}
		}
	}

	// Check for known vendors with subscription models
	vendorLower := strings.ToLower(app.Vendor)
	if strings.Contains(vendorLower, "jetbrains") {
		license.Type = "Subscription"
		license.Status = "Unknown"
		return license
	}

	if strings.Contains(vendorLower, "autodesk") {
		license.Type = "Subscription"
		license.Status = "Unknown"
		return license
	}

	if license.ProductID != "" || license.Status == "Licensed" {
		return license
	}

	return nil
}

// detectLicenseLinux detects license info on Linux
func (c *DarwinSoftwareCollector) detectLicenseLinux(app *models.Application) *models.SoftwareLicense {
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

// detectMicrosoftLicenseWindows detects Microsoft Office license on Windows
func detectMicrosoftLicenseWindows() *models.SoftwareLicense {
	license := &models.SoftwareLicense{
		Type:   "Unknown",
		Status: "Unknown",
	}

	// Check Office license using ospp.vbs
	officePaths := []string{
		`C:\Program Files\Microsoft Office\Office16`,
		`C:\Program Files (x86)\Microsoft Office\Office16`,
		`C:\Program Files\Microsoft Office\Office15`,
	}

	for _, officePath := range officePaths {
		osppPath := filepath.Join(officePath, "ospp.vbs")
		if _, err := os.Stat(osppPath); err == nil {
			out, err := exec.Command("cscript", "//nologo", osppPath, "/dstatus").Output()
			if err == nil {
				output := string(out)
				if strings.Contains(output, "LICENSE STATUS:  ---LICENSED---") {
					license.Status = "Licensed"
					if strings.Contains(output, "SUBSCRIPTION") || strings.Contains(output, "365") {
						license.Type = "Subscription"
					} else if strings.Contains(output, "VOLUME") {
						license.Type = "Volume"
					} else {
						license.Type = "Perpetual"
					}

					// Extract partial product key
					if idx := strings.Index(output, "Last 5 characters of installed product key:"); idx != -1 {
						keyLine := output[idx:]
						if endIdx := strings.Index(keyLine, "\n"); endIdx != -1 {
							keyPart := strings.TrimSpace(keyLine[44:endIdx])
							license.Key = "XXXXX-XXXXX-XXXXX-XXXXX-" + keyPart
						}
					}
					return license
				}
			}
			break
		}
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

// detectAdobeLicenseWindows detects Adobe license on Windows
func detectAdobeLicenseWindows() *models.SoftwareLicense {
	license := &models.SoftwareLicense{
		Type:   "Subscription",
		Status: "Unknown",
	}

	// Check Adobe licensing registry
	regPath := `HKLM\SOFTWARE\Adobe`
	if out, err := exec.Command("reg", "query", regPath, "/s").Output(); err == nil {
		if strings.Contains(string(out), "Subscription") {
			license.Status = "Licensed"
		}
	}

	return license
}

// detectWindowsLicense detects Windows OS license
func detectWindowsLicense() *models.SoftwareLicense {
	license := &models.SoftwareLicense{
		Type:   "OEM",
		Status: "Unknown",
	}

	// Use slmgr to get Windows license status
	out, err := exec.Command("powershell", "-Command",
		"(Get-WmiObject SoftwareLicensingProduct -Filter \"Name like 'Windows%'\" | Where-Object { $_.PartialProductKey }).LicenseStatus").Output()
	if err == nil {
		status := strings.TrimSpace(string(out))
		switch status {
		case "1":
			license.Status = "Licensed"
		case "2":
			license.Status = "GracePeriod"
		case "3":
			license.Status = "Trial"
		case "4":
			license.Status = "GracePeriod"
		case "5":
			license.Status = "Unlicensed"
		case "6":
			license.Status = "GracePeriod"
		}
	}

	// Get partial product key
	out, err = exec.Command("powershell", "-Command",
		"(Get-WmiObject SoftwareLicensingProduct -Filter \"Name like 'Windows%'\" | Where-Object { $_.PartialProductKey }).PartialProductKey").Output()
	if err == nil {
		key := strings.TrimSpace(string(out))
		if key != "" {
			license.Key = "XXXXX-XXXXX-XXXXX-XXXXX-" + key
		}
	}

	// Determine license type
	out, err = exec.Command("powershell", "-Command",
		"(Get-WmiObject SoftwareLicensingProduct -Filter \"Name like 'Windows%'\" | Where-Object { $_.PartialProductKey }).Description").Output()
	if err == nil {
		desc := strings.ToLower(string(out))
		if strings.Contains(desc, "oem") {
			license.Type = "OEM"
			license.Channel = "OEM"
		} else if strings.Contains(desc, "volume") || strings.Contains(desc, "kms") {
			license.Type = "Volume"
			license.Channel = "Volume"
		} else if strings.Contains(desc, "retail") {
			license.Type = "Perpetual"
			license.Channel = "Retail"
		}
	}

	return license
}

// isOpenSourceApp checks if an app is known to be open source
func isOpenSourceApp(name, bundleID string) bool {
	openSourceApps := map[string]bool{
		// Browsers
		"firefox": true, "chromium": true, "brave browser": true,
		// Editors
		"visual studio code": true, "vs code": true, "code": true,
		"atom": true, "sublime text": false, "vim": true, "neovim": true,
		"emacs": true, "nano": true,
		// Dev tools
		"git": true, "github desktop": true, "sourcetree": false,
		"docker": true, "docker desktop": true,
		"iterm": true, "iterm2": true, "terminal": true,
		"postman": false, "insomnia": true,
		// Media
		"vlc": true, "vlc media player": true, "audacity": true, "gimp": true,
		"inkscape": true, "blender": true, "obs": true, "obs studio": true,
		"handbrake": true, "kdenlive": true,
		// Productivity
		"libreoffice": true, "openoffice": true, "thunderbird": true,
		"keepassxc": true, "bitwarden": true,
		// Utilities
		"7-zip": true, "7zip": true, "p7zip": true,
		"filezilla": true, "putty": true, "wireshark": true,
		"virtualbox": true, "qemu": true,
		// Messaging
		"signal": true, "element": true, "jitsi": true,
	}

	nameLower := strings.ToLower(name)
	if openSourceApps[nameLower] {
		return true
	}

	// Check bundle ID patterns
	openSourceBundlePatterns := []string{
		"org.mozilla.", "org.chromium.", "org.videolan.",
		"org.gimp.", "org.inkscape.", "org.blender.",
		"org.libreoffice.", "org.apache.openoffice",
		"com.github.", "io.github.",
	}

	bundleIDLower := strings.ToLower(bundleID)
	for _, pattern := range openSourceBundlePatterns {
		if strings.HasPrefix(bundleIDLower, pattern) {
			return true
		}
	}

	return false
}

// isFreewareApp checks if an app is known to be freeware
func isFreewareApp(name, bundleID string) bool {
	freewareApps := map[string]bool{
		// Communication
		"zoom": true, "zoom.us": true, "discord": true, "skype": true,
		"telegram": true, "whatsapp": true, "messenger": true,
		"slack": true,
		// Cloud storage (free tier)
		"google drive": true, "onedrive": true, "dropbox": true,
		// Utilities
		"the unarchiver": true, "unarchiver": true, "appcleaner": true,
		"ccleaner": true, "malwarebytes": true,
		"teamviewer": true, "anydesk": true,
		// Media
		"spotify": true, "itunes": true, "music": true,
		// Browsers
		"google chrome": true, "chrome": true, "google-chrome-stable": true,
		"microsoft edge": true, "edge": true, "microsoft-edge-stable": true,
		"opera": true, "safari": true, "opera-stable": true,
		// PDF
		"adobe acrobat reader": true, "acrobat reader": true,
		"foxit reader": true, "sumatra pdf": true,
		// Containers (free tier)
		"docker": true, "docker-ce": true, "docker-ce-cli": true,
		"docker-compose": true, "docker-desktop": true,
		"containerd": true, "containerd.io": true,
	}

	nameLower := strings.ToLower(name)
	if freewareApps[nameLower] {
		return true
	}

	// Check if name starts with any freeware prefix
	freewarePrefixes := []string{
		"google-chrome", "microsoft-edge", "opera-", "zoom",
		"docker-", "containerd",
	}
	for _, prefix := range freewarePrefixes {
		if strings.HasPrefix(nameLower, prefix) {
			return true
		}
	}

	return false
}

// maskLicenseKey masks a license key, showing only last few characters
func maskLicenseKey(key string) string {
	if len(key) <= 5 {
		return "XXXXX"
	}
	// Show only last 5 characters
	return strings.Repeat("X", len(key)-5) + key[len(key)-5:]
}
