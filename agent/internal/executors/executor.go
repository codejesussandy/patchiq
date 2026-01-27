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

// RollbackExecutor handles rollback operations
type RollbackExecutor interface {
	// SaveRollbackInfo stores rollback information for a software installation
	SaveRollbackInfo(info models.RollbackInfo) error
	// GetRollbackInfo retrieves rollback information by ID
	GetRollbackInfo(rollbackID string) (*models.RollbackInfo, error)
	// ListRollbackInfo returns all available rollbacks
	ListRollbackInfo() ([]models.RollbackInfo, error)
	// ExecuteRollback performs a rollback to previous state
	ExecuteRollback(rollbackID string, force bool) models.ExecutionResult
	// DeleteRollbackInfo removes a rollback entry
	DeleteRollbackInfo(rollbackID string) error
	// CreateRollbackInfoForInstall creates and saves rollback info before installation
	CreateRollbackInfoForInstall(packageName, source, commandID string, software SoftwareExecutor) (*models.RollbackInfo, error)
}

// ScriptExecutor handles script-based package installation (Hub-centric approach)
// This executor downloads bundles from the Hub and executes the appropriate script
type ScriptExecutor interface {
	// ExecuteBundle downloads a bundle, extracts it, and runs the specified script
	ExecuteBundle(request models.ScriptBundleRequest) models.ExecutionResult
	// ExecuteInlineScript runs a script directly (without bundle download)
	ExecuteInlineScript(script string, operationType string, requiresRoot bool, env map[string]string) models.ExecutionResult
}

// ExecutorManager provides access to all executors
type ExecutorManager struct {
	patch        PatchExecutor
	software     SoftwareExecutor
	remoteAccess RemoteAccessExecutor
	rollback     RollbackExecutor
	script       ScriptExecutor
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

// Rollback returns the rollback executor
func (em *ExecutorManager) Rollback() RollbackExecutor {
	return em.rollback
}

// Script returns the script executor for Hub-centric package installation
func (em *ExecutorManager) Script() ScriptExecutor {
	return em.script
}
