package executors

import (
	"context"
	"github.com/patchify/agent/internal/models"
)

// PatchExecutor handles OS patch operations
type PatchExecutor interface {
	// InstallPatch installs a specific patch by ID
	InstallPatch(ctx context.Context, patchID string, options models.PatchOptions) models.ExecutionResult
	// UninstallPatch removes a specific patch by ID
	UninstallPatch(ctx context.Context, patchID string) models.ExecutionResult
	// InstallAllPatches installs all available patches
	InstallAllPatches(ctx context.Context, options models.PatchOptions) models.ExecutionResult
	// ListAvailablePatches returns available patches
	ListAvailablePatches(ctx context.Context) ([]models.PatchInfo, error)
	// CheckRebootRequired checks if a reboot is pending
	CheckRebootRequired(ctx context.Context) bool
}

// SoftwareExecutor handles software installation operations
type SoftwareExecutor interface {
	// InstallSoftware installs a software package
	InstallSoftware(ctx context.Context, pkg models.SoftwarePackage) models.ExecutionResult
	// UpgradeSoftware upgrades an already-installed software package
	UpgradeSoftware(ctx context.Context, pkg models.SoftwarePackage) models.ExecutionResult
	// UninstallSoftware removes installed software
	UninstallSoftware(ctx context.Context, name string) models.ExecutionResult
	// GetInstalledVersion returns the installed version of software
	GetInstalledVersion(ctx context.Context, name string) (string, error)
}

// RemoteAccessExecutor handles remote access configuration
type RemoteAccessExecutor interface {
	// Enable enables remote access service
	Enable(ctx context.Context, config models.RemoteAccessConfig) models.ExecutionResult
	// Disable disables remote access service
	Disable(ctx context.Context) models.ExecutionResult
	// GetStatus returns current remote access status
	GetStatus(ctx context.Context) models.RemoteAccessStatus
	// SetPassword sets the VNC/RDP password
	SetPassword(ctx context.Context, password string) models.ExecutionResult
}

// RollbackExecutor handles rollback operations
type RollbackExecutor interface {
	// SaveRollbackInfo stores rollback information for a software installation
	SaveRollbackInfo(ctx context.Context, info models.RollbackInfo) error
	// GetRollbackInfo retrieves rollback information by ID
	GetRollbackInfo(ctx context.Context, rollbackID string) (*models.RollbackInfo, error)
	// ListRollbackInfo returns all available rollbacks
	ListRollbackInfo(ctx context.Context) ([]models.RollbackInfo, error)
	// ExecuteRollback performs a rollback to previous state
	ExecuteRollback(ctx context.Context, rollbackID string, force bool) models.ExecutionResult
	// DeleteRollbackInfo removes a rollback entry
	DeleteRollbackInfo(ctx context.Context, rollbackID string) error
	// CreateRollbackInfoForInstall creates and saves rollback info before installation
	CreateRollbackInfoForInstall(ctx context.Context, packageName, source, commandID string, software SoftwareExecutor) (*models.RollbackInfo, error)
}

// ScriptExecutor handles script-based package installation (Hub-centric approach)
// This executor downloads bundles from the Hub and executes the appropriate script
type ScriptExecutor interface {
	// ExecuteBundle downloads a bundle, extracts it, and runs the specified script
	ExecuteBundle(ctx context.Context, request models.ScriptBundleRequest) models.ExecutionResult
	// ExecuteInlineScript runs a script directly (without bundle download)
	ExecuteInlineScript(ctx context.Context, script string, operationType string, requiresRoot bool, env map[string]string) models.ExecutionResult
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
