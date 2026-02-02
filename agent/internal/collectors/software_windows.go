//go:build windows

package collectors

import (
	"encoding/json"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/patchify/agent/internal/models"
)

// WindowsSoftwareCollector collects software info on Windows
type WindowsSoftwareCollector struct{}

// NewWindowsSoftwareCollector creates a new software collector for Windows
func NewWindowsSoftwareCollector() *WindowsSoftwareCollector {
	return &WindowsSoftwareCollector{}
}

// Name returns the collector name
func (c *WindowsSoftwareCollector) Name() string {
	return "software"
}

// Collect gathers software information
func (c *WindowsSoftwareCollector) Collect() (interface{}, error) {
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

func (c *WindowsSoftwareCollector) collectOperatingSystem() models.OperatingSystem {
	osInfo := models.OperatingSystem{
		Architecture: "amd64",
	}

	hostname, _ := os.Hostname()
	osInfo.Hostname = hostname

	// Windows OS info
	osInfo.Name = "Microsoft Windows"

	if out, err := exec.Command("wmic", "os", "get", "caption", "/value").Output(); err == nil {
		osInfo.Name = parseWmicValueSoftware(string(out), "Caption")
	} else {
		log.Printf("[software] Failed to get OS info: %v", err)
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

	return osInfo
}

func (c *WindowsSoftwareCollector) collectApplications() []models.Application {
	var apps []models.Application

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
	} else {
		log.Printf("[software] Failed to query wmic product: %v", err)
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

	return apps
}

func (c *WindowsSoftwareCollector) collectServices() []models.Service {
	var services []models.Service

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
	} else {
		log.Printf("[software] Failed to get services: %v", err)
	}

	return services
}

func (c *WindowsSoftwareCollector) collectStartupPrograms() []models.StartupProgram {
	var programs []models.StartupProgram

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

	return programs
}

// collectRunningProcesses collects information about all running processes
func (c *WindowsSoftwareCollector) collectRunningProcesses() []models.RunningProcess {
	var processes []models.RunningProcess

	// Use PowerShell to get process info
	psCmd := `Get-Process | Select-Object Id,ProcessName,CPU,WorkingSet64,StartTime,Threads,PriorityClass,Path | ConvertTo-Json`
	out, err := exec.Command("powershell", "-Command", psCmd).Output()
	if err != nil {
		log.Printf("[software] Failed to get running processes: %v", err)
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

// detectLicense attempts to detect license information for an application
func (c *WindowsSoftwareCollector) detectLicense(app *models.Application) *models.SoftwareLicense {
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

	return c.detectLicenseWindows(app)
}

// detectLicenseWindows detects license info on Windows
func (c *WindowsSoftwareCollector) detectLicenseWindows(app *models.Application) *models.SoftwareLicense {
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
