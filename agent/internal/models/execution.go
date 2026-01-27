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

// RollbackInfo stores information needed to rollback an installation
type RollbackInfo struct {
	ID               string `json:"id"`
	PackageName      string `json:"packageName"`
	PreviousVersion  string `json:"previousVersion,omitempty"` // Empty if was not installed
	InstalledVersion string `json:"installedVersion"`
	InstallSource    string `json:"installSource"` // apt, brew, etc.
	WasInstalled     bool   `json:"wasInstalled"`  // True if package existed before
	InstalledAt      string `json:"installedAt"`
	CommandID        string `json:"commandId,omitempty"` // Original command that installed this
	SupportsRollback bool   `json:"supportsRollback"`
	RollbackCommand  string `json:"rollbackCommand,omitempty"`
}

// RollbackRequest represents a request to rollback an installation
type RollbackRequest struct {
	RollbackID string `json:"rollbackId"`
	Force      bool   `json:"force"`
}

// ============================================
// Script Bundle Types (Hub-Centric Approach)
// ============================================

// ScriptManifest represents the manifest.json structure inside a package bundle
type ScriptManifest struct {
	ID           string            `json:"id"`
	Name         string            `json:"name"`
	DisplayName  string            `json:"displayName"`
	Version      string            `json:"version"`
	Vendor       string            `json:"vendor,omitempty"`
	Category     string            `json:"category,omitempty"`
	Platform     string            `json:"platform"` // windows, macos, linux, cross-platform
	Architecture string            `json:"architecture,omitempty"`
	Description  string            `json:"description,omitempty"`
	RequiresRoot bool              `json:"requiresRoot"`
	RequiresReboot bool            `json:"requiresReboot"`
	Scripts      ScriptPaths       `json:"scripts"`
	Environment  map[string]string `json:"environment,omitempty"`
	Dependencies []string          `json:"dependencies,omitempty"`
	Conflicts    []string          `json:"conflicts,omitempty"`
}

// ScriptPaths contains paths to scripts within the bundle
type ScriptPaths struct {
	Install   string `json:"install,omitempty"`
	Update    string `json:"update,omitempty"`
	Rollback  string `json:"rollback,omitempty"`
	Uninstall string `json:"uninstall,omitempty"`
}

// ScriptBundleRequest represents a request to execute a script bundle
type ScriptBundleRequest struct {
	OperationType string            `json:"operationType"` // install, update, rollback, uninstall
	PackageID     string            `json:"packageId"`
	PackageName   string            `json:"packageName"`
	Version       string            `json:"version"`
	BundleURL     string            `json:"bundleUrl,omitempty"`     // URL to download bundle
	BundleChecksum string           `json:"bundleChecksum,omitempty"` // SHA256 of bundle
	Manifest      *ScriptManifest   `json:"manifest,omitempty"`      // Manifest from backend
	Script        string            `json:"script,omitempty"`        // Inline script (alternative to bundle)
	RequiresRoot  bool              `json:"requiresRoot"`
	Timeout       int               `json:"timeout,omitempty"`       // seconds
	Environment   map[string]string `json:"environment,omitempty"`
}
