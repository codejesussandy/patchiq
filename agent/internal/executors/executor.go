package executors

import (
	"github.com/patchify/agent/internal/models"
)

// PatchExecutor handles OS patch operations
type PatchExecutor interface {
	// InstallPatch installs a specific patch by ID
	InstallPatch(patchID string, options models.PatchOptions) models.ExecutionResult
	// UninstallPatch removes a specific patch by ID
	UninstallPatch(patchID string) models.ExecutionResult
	// InstallAllPatches installs all available patches
	InstallAllPatches(options models.PatchOptions) models.ExecutionResult
	// ListAvailablePatches returns available patches
	ListAvailablePatches() ([]models.PatchInfo, error)
	// CheckRebootRequired checks if a reboot is pending
	CheckRebootRequired() bool
}

// SoftwareExecutor handles software installation operations
type SoftwareExecutor interface {
	// InstallSoftware installs a software package
	InstallSoftware(pkg models.SoftwarePackage) models.ExecutionResult
	// UninstallSoftware removes installed software
	UninstallSoftware(name string) models.ExecutionResult
	// GetInstalledVersion returns the installed version of software
	GetInstalledVersion(name string) (string, error)
}

// RemoteAccessExecutor handles remote access configuration
type RemoteAccessExecutor interface {
	// Enable enables remote access service
	Enable(config models.RemoteAccessConfig) models.ExecutionResult
	// Disable disables remote access service
	Disable() models.ExecutionResult
	// GetStatus returns current remote access status
	GetStatus() models.RemoteAccessStatus
	// SetPassword sets the VNC/RDP password
	SetPassword(password string) models.ExecutionResult
}

// ExecutorManager provides access to all executors
type ExecutorManager struct {
	patch        PatchExecutor
	software     SoftwareExecutor
	remoteAccess RemoteAccessExecutor
}

// NewExecutorManager is defined in platform-specific files:
// - executor_darwin.go
// - executor_windows.go
// - executor_linux.go

// Patch returns the patch executor
func (em *ExecutorManager) Patch() PatchExecutor {
	return em.patch
}

// Software returns the software executor
func (em *ExecutorManager) Software() SoftwareExecutor {
	return em.software
}

// RemoteAccess returns the remote access executor
func (em *ExecutorManager) RemoteAccess() RemoteAccessExecutor {
	return em.remoteAccess
}
