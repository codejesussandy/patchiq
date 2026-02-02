package collectors

import (
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/patchify/agent/internal/models"
)

// sharedCollectUsageSummary generates a usage summary from the running processes.
// This is a package-level function so both platform collectors can call it.
func sharedCollectUsageSummary(processes []models.RunningProcess) *models.UsageSummary {
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
