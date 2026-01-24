package executors

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/patchify/agent/internal/models"
)

// BaseRollbackExecutor provides common rollback functionality
type BaseRollbackExecutor struct {
	mu            sync.RWMutex
	dataDir       string
	rollbackFile  string
	rollbackInfos map[string]models.RollbackInfo
	software      SoftwareExecutor
}

// NewBaseRollbackExecutor creates a new base rollback executor
func NewBaseRollbackExecutor(dataDir string, software SoftwareExecutor) *BaseRollbackExecutor {
	homeDir, _ := os.UserHomeDir()
	if dataDir == "" {
		dataDir = filepath.Join(homeDir, ".patchify-agent")
	}

	executor := &BaseRollbackExecutor{
		dataDir:       dataDir,
		rollbackFile:  filepath.Join(dataDir, "rollbacks.json"),
		rollbackInfos: make(map[string]models.RollbackInfo),
		software:      software,
	}

	// Ensure data directory exists
	os.MkdirAll(dataDir, 0755)

	// Load existing rollback data
	executor.loadRollbackData()

	return executor
}

// loadRollbackData loads rollback information from disk
func (e *BaseRollbackExecutor) loadRollbackData() {
	data, err := os.ReadFile(e.rollbackFile)
	if err != nil {
		return // No file yet, start fresh
	}

	var rollbacks []models.RollbackInfo
	if err := json.Unmarshal(data, &rollbacks); err != nil {
		return
	}

	for _, r := range rollbacks {
		e.rollbackInfos[r.ID] = r
	}
}

// saveRollbackData persists rollback information to disk
func (e *BaseRollbackExecutor) saveRollbackData() error {
	rollbacks := make([]models.RollbackInfo, 0, len(e.rollbackInfos))
	for _, r := range e.rollbackInfos {
		rollbacks = append(rollbacks, r)
	}

	data, err := json.MarshalIndent(rollbacks, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal rollback data: %w", err)
	}

	return os.WriteFile(e.rollbackFile, data, 0644)
}

// generateRollbackID generates a unique rollback ID
func generateRollbackID() string {
	return fmt.Sprintf("RB-%d", time.Now().UnixNano())
}

// SaveRollbackInfo stores rollback information
func (e *BaseRollbackExecutor) SaveRollbackInfo(info models.RollbackInfo) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	if info.ID == "" {
		info.ID = generateRollbackID()
	}

	e.rollbackInfos[info.ID] = info
	return e.saveRollbackData()
}

// GetRollbackInfo retrieves rollback information by ID
func (e *BaseRollbackExecutor) GetRollbackInfo(rollbackID string) (*models.RollbackInfo, error) {
	e.mu.RLock()
	defer e.mu.RUnlock()

	info, ok := e.rollbackInfos[rollbackID]
	if !ok {
		return nil, fmt.Errorf("rollback not found: %s", rollbackID)
	}

	return &info, nil
}

// ListRollbackInfo returns all available rollbacks
func (e *BaseRollbackExecutor) ListRollbackInfo() ([]models.RollbackInfo, error) {
	e.mu.RLock()
	defer e.mu.RUnlock()

	rollbacks := make([]models.RollbackInfo, 0, len(e.rollbackInfos))
	for _, r := range e.rollbackInfos {
		rollbacks = append(rollbacks, r)
	}

	return rollbacks, nil
}

// DeleteRollbackInfo removes a rollback entry
func (e *BaseRollbackExecutor) DeleteRollbackInfo(rollbackID string) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	delete(e.rollbackInfos, rollbackID)
	return e.saveRollbackData()
}

// CreateRollbackInfoForInstall captures pre-install state for potential rollback
func (e *BaseRollbackExecutor) CreateRollbackInfoForInstall(packageName, source, commandID string, software SoftwareExecutor) (*models.RollbackInfo, error) {
	// Check if package is already installed and get version
	previousVersion, err := software.GetInstalledVersion(packageName)
	wasInstalled := err == nil && previousVersion != ""

	info := models.RollbackInfo{
		ID:               generateRollbackID(),
		PackageName:      packageName,
		PreviousVersion:  previousVersion,
		WasInstalled:     wasInstalled,
		InstallSource:    source,
		InstalledAt:      time.Now().UTC().Format(time.RFC3339),
		CommandID:        commandID,
		SupportsRollback: true, // Most package managers support rollback
	}

	return &info, nil
}

// ExecuteRollback performs a rollback to previous state
func (e *BaseRollbackExecutor) ExecuteRollback(rollbackID string, force bool) models.ExecutionResult {
	startTime := time.Now()

	e.mu.Lock()
	info, ok := e.rollbackInfos[rollbackID]
	e.mu.Unlock()

	if !ok {
		return models.ExecutionResult{
			Success:      false,
			Message:      "Rollback not found",
			ErrorMessage: fmt.Sprintf("No rollback information found for ID: %s", rollbackID),
			Duration:     time.Since(startTime).Milliseconds(),
		}
	}

	if !info.SupportsRollback && !force {
		return models.ExecutionResult{
			Success:      false,
			Message:      "Rollback not supported",
			ErrorMessage: "This installation does not support rollback. Use force=true to attempt anyway.",
			Duration:     time.Since(startTime).Milliseconds(),
		}
	}

	var result models.ExecutionResult

	// If package was not installed before, uninstall it
	if !info.WasInstalled {
		result = e.software.UninstallSoftware(info.PackageName)
		if result.Success {
			result.Message = fmt.Sprintf("Rolled back %s by uninstalling (was not previously installed)", info.PackageName)
			// Remove rollback info after successful rollback
			e.DeleteRollbackInfo(rollbackID)
		}
		return result
	}

	// Package was installed before - try to downgrade to previous version
	if info.PreviousVersion != "" {
		pkg := models.SoftwarePackage{
			Name:    info.PackageName,
			Version: info.PreviousVersion,
			Source:  info.InstallSource,
		}
		result = e.software.InstallSoftware(pkg)
		if result.Success {
			result.Message = fmt.Sprintf("Rolled back %s from %s to %s",
				info.PackageName, info.InstalledVersion, info.PreviousVersion)
			// Remove rollback info after successful rollback
			e.DeleteRollbackInfo(rollbackID)
		}
		return result
	}

	// No previous version info, just uninstall
	result = e.software.UninstallSoftware(info.PackageName)
	if result.Success {
		result.Message = fmt.Sprintf("Rolled back %s by uninstalling (no previous version info)", info.PackageName)
		// Remove rollback info after successful rollback
		e.DeleteRollbackInfo(rollbackID)
	}

	return result
}
