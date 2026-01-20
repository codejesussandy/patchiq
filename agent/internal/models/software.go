package models

// Software represents all software inventory data
type Software struct {
	CollectedAt      string            `json:"collectedAt"`
	OperatingSystem  OperatingSystem   `json:"operatingSystem"`
	Applications     []Application     `json:"applications"`
	Services         []Service         `json:"services,omitempty"`
	StartupPrograms  []StartupProgram  `json:"startupPrograms,omitempty"`
	InstalledUpdates []InstalledUpdate `json:"installedUpdates,omitempty"`
	RunningProcesses []RunningProcess  `json:"runningProcesses,omitempty"`
	UsageSummary     *UsageSummary     `json:"usageSummary,omitempty"`
}

// OperatingSystem represents OS information
type OperatingSystem struct {
	Name          string `json:"name"`
	Version       string `json:"version"`
	BuildNumber   string `json:"buildNumber,omitempty"`
	Architecture  string `json:"architecture"` // x64, arm64
	Kernel        string `json:"kernel,omitempty"`
	InstallDate   string `json:"installDate,omitempty"`
	LastBootTime  string `json:"lastBootTime,omitempty"`
	Uptime        int64  `json:"uptime,omitempty"` // seconds
	UptimeHuman   string `json:"uptimeHuman,omitempty"`
	PendingReboot bool   `json:"pendingReboot"`
	LicenseStatus string `json:"licenseStatus,omitempty"`
	Hostname      string `json:"hostname"`
	Timezone      string `json:"timezone"`
	Locale        string `json:"locale"`
}

// Application represents an installed application
type Application struct {
	Name          string           `json:"name"`
	Version       string           `json:"version"`
	Vendor        string           `json:"vendor,omitempty"`
	InstallDate   string           `json:"installDate,omitempty"`
	SizeBytes     int64            `json:"sizeBytes,omitempty"`
	SizeHuman     string           `json:"sizeHuman,omitempty"`
	InstallSource string           `json:"installSource,omitempty"` // AppStore, MSI, PKG, etc.
	Path          string           `json:"path,omitempty"`
	BundleID      string           `json:"bundleId,omitempty"`    // macOS
	ProductCode   string           `json:"productCode,omitempty"` // Windows
	License       *SoftwareLicense `json:"license,omitempty"`
}

// SoftwareLicense represents license information for an application
type SoftwareLicense struct {
	Type           string `json:"type"`                     // Perpetual, Subscription, Trial, Freeware, OpenSource, OEM, Volume, Unknown
	Status         string `json:"status"`                   // Licensed, Expired, Trial, GracePeriod, Unlicensed, Unknown
	Key            string `json:"key,omitempty"`            // Partial/masked license key
	ExpirationDate string `json:"expirationDate,omitempty"` // ISO8601 for subscription/trial
	DaysRemaining  int    `json:"daysRemaining,omitempty"`  // Days until expiration
	LicensedTo     string `json:"licensedTo,omitempty"`     // User/organization name
	ProductID      string `json:"productId,omitempty"`      // Vendor product ID
	Channel        string `json:"channel,omitempty"`        // Retail, Volume, OEM, NFR
}

// Service represents a system service
type Service struct {
	Name        string `json:"name"`
	DisplayName string `json:"displayName,omitempty"`
	Description string `json:"description,omitempty"`
	Status      string `json:"status"` // Running, Stopped, Unknown
	StartupType string `json:"startupType,omitempty"` // Automatic, Manual, Disabled
	Path        string `json:"path,omitempty"`
	PID         int    `json:"pid,omitempty"`
}

// StartupProgram represents a startup/login item
type StartupProgram struct {
	Name     string `json:"name"`
	Command  string `json:"command,omitempty"`
	Location string `json:"location,omitempty"` // Registry key, plist, etc.
	Enabled  bool   `json:"enabled"`
	Vendor   string `json:"vendor,omitempty"`
}

// InstalledUpdate represents an installed system update
type InstalledUpdate struct {
	ID          string `json:"id"`
	Title       string `json:"title,omitempty"`
	Description string `json:"description,omitempty"`
	InstalledOn string `json:"installedOn"`
	Type        string `json:"type,omitempty"` // Security, Critical, Feature
}

// RunningProcess represents a currently running process with usage metrics
type RunningProcess struct {
	PID           int     `json:"pid"`
	Name          string  `json:"name"`
	CommandLine   string  `json:"commandLine,omitempty"`
	User          string  `json:"user,omitempty"`
	StartTime     string  `json:"startTime,omitempty"`           // ISO8601
	RuntimeSecs   int64   `json:"runtimeSecs,omitempty"`         // How long process has been running
	RuntimeHuman  string  `json:"runtimeHuman,omitempty"`        // Human readable runtime
	CPUPercent    float64 `json:"cpuPercent,omitempty"`          // Current CPU usage
	MemoryBytes   int64   `json:"memoryBytes,omitempty"`         // Current memory usage
	MemoryPercent float64 `json:"memoryPercent,omitempty"`       // Memory usage as percentage
	MemoryHuman   string  `json:"memoryHuman,omitempty"`         // Human readable memory
	State         string  `json:"state,omitempty"`               // Running, Sleeping, Zombie, etc.
	Priority      int     `json:"priority,omitempty"`            // Process priority/nice value
	ThreadCount   int     `json:"threadCount,omitempty"`         // Number of threads
	IsForeground  bool    `json:"isForeground,omitempty"`        // Whether process is in foreground
	ParentPID     int     `json:"parentPid,omitempty"`           // Parent process ID
	ParentName    string  `json:"parentName,omitempty"`          // Parent process name
	Category      string  `json:"category,omitempty"`            // Browser, IDE, Office, Media, etc.
}

// UsageSummary provides aggregated usage statistics
type UsageSummary struct {
	TotalProcesses   int                   `json:"totalProcesses"`
	TotalThreads     int                   `json:"totalThreads"`
	TotalMemoryBytes int64                 `json:"totalMemoryBytes"`
	TotalMemoryHuman string                `json:"totalMemoryHuman,omitempty"`
	TopCPUProcesses  []ProcessUsageEntry   `json:"topCpuProcesses,omitempty"`  // Top 10 by CPU
	TopMemProcesses  []ProcessUsageEntry   `json:"topMemProcesses,omitempty"`  // Top 10 by Memory
	CategorySummary  []CategoryUsageEntry  `json:"categorySummary,omitempty"`  // Usage by category
}

// ProcessUsageEntry represents a process in usage rankings
type ProcessUsageEntry struct {
	PID         int     `json:"pid"`
	Name        string  `json:"name"`
	Value       float64 `json:"value"`       // CPU% or Memory%
	ValueHuman  string  `json:"valueHuman"`  // Human readable value
}

// CategoryUsageEntry represents usage statistics by category
type CategoryUsageEntry struct {
	Category      string  `json:"category"`
	ProcessCount  int     `json:"processCount"`
	TotalCPU      float64 `json:"totalCpu"`       // Sum of CPU%
	TotalMemBytes int64   `json:"totalMemBytes"`
	TotalMemHuman string  `json:"totalMemHuman,omitempty"`
}
