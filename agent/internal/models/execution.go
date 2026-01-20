package models

// ExecutionResult represents the result of any execution operation
type ExecutionResult struct {
	Success      bool   `json:"success"`
	Message      string `json:"message"`
	ErrorMessage string `json:"errorMessage,omitempty"`
	Output       string `json:"output,omitempty"`
	ExitCode     int    `json:"exitCode"`
	Duration     int64  `json:"durationMs"`
}

// PatchOptions configures patch installation behavior
type PatchOptions struct {
	Force        bool   `json:"force"`
	AllowReboot  bool   `json:"allowReboot"`
	ScheduleTime string `json:"scheduleTime,omitempty"`
}

// PatchInfo represents available patch information
type PatchInfo struct {
	ID             string `json:"id"`
	Name           string `json:"name"`
	Version        string `json:"version"`
	Severity       string `json:"severity"`
	Size           int64  `json:"size"`
	RebootRequired bool   `json:"rebootRequired"`
	Recommended    bool   `json:"recommended"`
	Description    string `json:"description,omitempty"`
}

// SoftwarePackage defines a software installation request
type SoftwarePackage struct {
	Name       string `json:"name"`
	Version    string `json:"version,omitempty"`
	Source     string `json:"source"`               // url, brew, apt, winget, pkg, dmg, msi, etc.
	PackageURL string `json:"packageUrl,omitempty"` // Direct download URL
	Silent     bool   `json:"silent"`
	Arguments  string `json:"arguments,omitempty"` // Custom installer arguments
	Checksum   string `json:"checksum,omitempty"`  // SHA256 checksum for verification
}

// RemoteAccessStatus represents the status of remote access services
type RemoteAccessStatus struct {
	Enabled      bool     `json:"enabled"`
	Protocol     string   `json:"protocol"`              // VNC, RDP, SSH
	Port         int      `json:"port"`
	LocalOnly    bool     `json:"localOnly"`
	AllowedUsers []string `json:"allowedUsers,omitempty"`
	ServiceName  string   `json:"serviceName,omitempty"`
}

// RemoteAccessConfig configures remote access settings
type RemoteAccessConfig struct {
	Password     string   `json:"password,omitempty"`
	Port         int      `json:"port,omitempty"`
	LocalOnly    bool     `json:"localOnly"`
	AllowedUsers []string `json:"allowedUsers,omitempty"`
}
