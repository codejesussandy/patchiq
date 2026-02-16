// Package service provides platform-agnostic service management for the PatchIQ agent.
// It abstracts Windows Service, systemd (Linux), and launchd (macOS) service operations
// behind a common interface for installation and management.
//
// The service package provides two sets of APIs:
//
// 1. Legacy functions (IsWindowsService, RunAsService) for Windows Service compatibility
// 2. ServiceManager interface for future cross-platform service management
package service

// ServiceManager defines platform-independent service operations for installing,
// managing, and controlling the PatchIQ agent as a system service.
//
// This interface is reserved for future implementation when cross-platform
// service management is needed (systemd on Linux, launchd on macOS, etc.).
type ServiceManager interface {
	// Install registers the agent as a system service
	Install() error

	// Uninstall removes the agent system service
	Uninstall() error

	// Start begins the agent service
	Start() error

	// Stop halts the agent service
	Stop() error

	// Restart stops and then starts the agent service
	Restart() error

	// Status returns the current service status ("running", "stopped", "unknown")
	Status() (string, error)
}

// Note: IsWindowsService() and RunAsService() are defined in platform-specific files:
// - service_windows.go (Windows implementation)
// - service_other.go (stub for non-Windows platforms)
