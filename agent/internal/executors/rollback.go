package executors

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"context"
	"github.com/patchify/agent/internal/models"
	"github.com/rs/zerolog/log"
)

// RollbackState stores detailed information needed to rollback an installation
// This is saved separately from RollbackInfo to handle cases where the original
// package is no longer available
type RollbackState struct {
	JobID            string            `json:"jobId"`
	PackageName      string            `json:"packageName"`
	PreviousVersion  string            `json:"previousVersion,omitempty"`
	InstalledVersion string            `json:"installedVersion"`
	InstallPath      string            `json:"installPath,omitempty"`
	RegistryKeys     []string          `json:"registryKeys,omitempty"`  // Windows registry keys
	InstalledFiles   []string          `json:"installedFiles,omitempty"` // List of installed files
	InstallSource    string            `json:"installSource"`
	Timestamp        time.Time         `json:"timestamp"`
	Metadata         map[string]string `json:"metadata,omitempty"`
}

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
func (e *BaseRollbackExecutor) SaveRollbackInfo(ctx context.Context, info models.RollbackInfo) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	if info.ID == "" {
		info.ID = generateRollbackID()
	}

	e.rollbackInfos[info.ID] = info
	return e.saveRollbackData()
}

// GetRollbackInfo retrieves rollback information by ID
func (e *BaseRollbackExecutor) GetRollbackInfo(ctx context.Context, rollbackID string) (*models.RollbackInfo, error) {
	e.mu.RLock()
	defer e.mu.RUnlock()

	info, ok := e.rollbackInfos[rollbackID]
	if !ok {
		return nil, fmt.Errorf("rollback not found: %s", rollbackID)
	}

	return &info, nil
}

// ListRollbackInfo returns all available rollbacks
func (e *BaseRollbackExecutor) ListRollbackInfo(ctx context.Context) ([]models.RollbackInfo, error) {
	e.mu.RLock()
	defer e.mu.RUnlock()

	rollbacks := make([]models.RollbackInfo, 0, len(e.rollbackInfos))
	for _, r := range e.rollbackInfos {
		rollbacks = append(rollbacks, r)
	}

	return rollbacks, nil
}

// DeleteRollbackInfo removes a rollback entry
func (e *BaseRollbackExecutor) DeleteRollbackInfo(ctx context.Context, rollbackID string) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	delete(e.rollbackInfos, rollbackID)
	return e.saveRollbackData()
}

// CreateRollbackInfoForInstall captures pre-install state for potential rollback
func (e *BaseRollbackExecutor) CreateRollbackInfoForInstall(ctx context.Context, packageName, source, commandID string, software SoftwareExecutor) (*models.RollbackInfo, error) {
	// Check if package is already installed and get version
	previousVersion, err := software.GetInstalledVersion(ctx, packageName)
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

// validateRollbackID validates that a rollback ID exists and is valid
func (e *BaseRollbackExecutor) validateRollbackID(rollbackID string) (*models.RollbackInfo, error) {
	e.mu.RLock()
	defer e.mu.RUnlock()

	info, ok := e.rollbackInfos[rollbackID]
	if !ok {
		return nil, fmt.Errorf("invalid rollback ID: %s - no rollback information found", rollbackID)
	}

	// Additional validation: check if rollback ID format is valid
	if !strings.HasPrefix(rollbackID, "RB-") {
		return nil, fmt.Errorf("invalid rollback ID format: %s - expected format: RB-<timestamp>", rollbackID)
	}

	return &info, nil
}

// saveRollbackState saves detailed rollback state to disk for recovery
func (e *BaseRollbackExecutor) saveRollbackState(rollbackID string, state RollbackState) error {
	stateDir := filepath.Join(e.dataDir, "rollback", "states")
	if err := os.MkdirAll(stateDir, 0755); err != nil {
		return fmt.Errorf("failed to create rollback state directory: %w", err)
	}

	stateFile := filepath.Join(stateDir, rollbackID+".json")
	data, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal rollback state: %w", err)
	}

	if err := os.WriteFile(stateFile, data, 0600); err != nil {
		return fmt.Errorf("failed to write rollback state: %w", err)
	}

	log.Info().
		Str("rollbackID", rollbackID).
		Str("package", state.PackageName).
		Msg("Saved rollback state")

	return nil
}

// loadRollbackState loads detailed rollback state from disk
func (e *BaseRollbackExecutor) loadRollbackState(rollbackID string) (*RollbackState, error) {
	stateFile := filepath.Join(e.dataDir, "rollback", "states", rollbackID+".json")

	data, err := os.ReadFile(stateFile)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, fmt.Errorf("rollback state not found for ID: %s", rollbackID)
		}
		return nil, fmt.Errorf("failed to read rollback state: %w", err)
	}

	var state RollbackState
	if err := json.Unmarshal(data, &state); err != nil {
		return nil, fmt.Errorf("failed to parse rollback state: %w", err)
	}

	return &state, nil
}

// cleanupRollbackFiles removes rollback state and temporary files
func (e *BaseRollbackExecutor) cleanupRollbackFiles(rollbackID string) error {
	// Remove rollback state file
	stateFile := filepath.Join(e.dataDir, "rollback", "states", rollbackID+".json")
	if err := os.Remove(stateFile); err != nil && !os.IsNotExist(err) {
		log.Warn().
			Err(err).
			Str("rollbackID", rollbackID).
			Msg("Failed to remove rollback state file")
	}

	// Remove any temp files associated with rollback
	tempDir := filepath.Join(os.TempDir(), "patchiq-rollback-"+rollbackID)
	if err := os.RemoveAll(tempDir); err != nil {
		log.Warn().
			Err(err).
			Str("rollbackID", rollbackID).
			Msg("Failed to remove rollback temp directory")
	}

	// Remove in-progress marker if it exists
	e.markRollbackComplete(rollbackID)

	log.Info().
		Str("rollbackID", rollbackID).
		Msg("Rollback cleanup complete")

	return nil
}

// markRollbackInProgress creates a marker file to track ongoing rollback
func (e *BaseRollbackExecutor) markRollbackInProgress(rollbackID string) error {
	markerDir := filepath.Join(e.dataDir, "rollback", "in-progress")
	if err := os.MkdirAll(markerDir, 0755); err != nil {
		return fmt.Errorf("failed to create marker directory: %w", err)
	}

	markerFile := filepath.Join(markerDir, rollbackID+".marker")
	markerData := fmt.Sprintf("Started: %s\nPackage: %s",
		time.Now().Format(time.RFC3339), rollbackID)

	if err := os.WriteFile(markerFile, []byte(markerData), 0600); err != nil {
		return fmt.Errorf("failed to create marker file: %w", err)
	}

	log.Info().
		Str("rollbackID", rollbackID).
		Msg("Marked rollback as in-progress")

	return nil
}

// markRollbackComplete removes the in-progress marker
func (e *BaseRollbackExecutor) markRollbackComplete(rollbackID string) {
	markerFile := filepath.Join(e.dataDir, "rollback", "in-progress", rollbackID+".marker")
	if err := os.Remove(markerFile); err != nil && !os.IsNotExist(err) {
		log.Warn().
			Err(err).
			Str("rollbackID", rollbackID).
			Msg("Failed to remove in-progress marker")
	}
}

// RecoverIncompleteRollbacks checks for and resumes incomplete rollbacks
// This should be called during agent startup
func (e *BaseRollbackExecutor) RecoverIncompleteRollbacks(ctx context.Context) []models.ExecutionResult {
	rollbackDir := filepath.Join(e.dataDir, "rollback", "in-progress")

	files, err := os.ReadDir(rollbackDir)
	if err != nil {
		if !os.IsNotExist(err) {
			log.Warn().
				Err(err).
				Msg("Failed to read in-progress rollback directory")
		}
		return nil
	}

	var results []models.ExecutionResult

	for _, file := range files {
		if file.IsDir() || !strings.HasSuffix(file.Name(), ".marker") {
			continue
		}

		rollbackID := strings.TrimSuffix(file.Name(), ".marker")

		log.Warn().
			Str("rollbackID", rollbackID).
			Msg("Resuming incomplete rollback from previous session")

		// Resume rollback with force=false
		result := e.ExecuteRollback(ctx, rollbackID, false)

		if result.Success {
			log.Info().
				Str("rollbackID", rollbackID).
				Msg("Successfully recovered incomplete rollback")
		} else {
			log.Error().
				Str("rollbackID", rollbackID).
				Str("error", result.ErrorMessage).
				Msg("Failed to recover incomplete rollback")
		}

		results = append(results, result)
	}

	return results
}

// ExecuteRollback performs a rollback to previous state
func (e *BaseRollbackExecutor) ExecuteRollback(ctx context.Context, rollbackID string, force bool) models.ExecutionResult {
	startTime := time.Now()

	// Validate rollback ID first
	info, err := e.validateRollbackID(rollbackID)
	if err != nil {
		return models.NewErrorResult(
			models.ErrInvalidInput,
			err.Error(),
			time.Since(startTime).Milliseconds(),
		)
	}

	// Mark rollback as in-progress for crash recovery
	if err := e.markRollbackInProgress(rollbackID); err != nil {
		log.Warn().
			Err(err).
			Str("rollbackID", rollbackID).
			Msg("Failed to mark rollback in-progress, continuing anyway")
	}

	// Ensure cleanup happens on completion (success or failure)
	defer func() {
		if err := e.cleanupRollbackFiles(rollbackID); err != nil {
			log.Warn().
				Err(err).
				Str("rollbackID", rollbackID).
				Msg("Failed to cleanup rollback files")
		}
	}()

	if !info.SupportsRollback && !force {
		return models.NewErrorResult(
			models.ErrInvalidInput,
			"This installation does not support rollback. Use force=true to attempt anyway.",
			time.Since(startTime).Milliseconds(),
		)
	}

	var result models.ExecutionResult

	// Try to load rollback state first (handles cases where original package unavailable)
	state, stateErr := e.loadRollbackState(rollbackID)
	if stateErr != nil {
		log.Warn().
			Err(stateErr).
			Str("rollbackID", rollbackID).
			Msg("No rollback state found, using basic rollback info")
	}

	// If package was not installed before, uninstall it
	if !info.WasInstalled {
		result = e.software.UninstallSoftware(ctx, info.PackageName)
		if result.Success {
			result.Message = fmt.Sprintf("Rolled back %s by uninstalling (was not previously installed)", info.PackageName)
			// Remove rollback info after successful rollback
			e.DeleteRollbackInfo(ctx, rollbackID)
		} else {
			// Even if uninstall failed, try to use state-based cleanup
			if state != nil && len(state.InstalledFiles) > 0 {
				log.Info().
					Str("rollbackID", rollbackID).
					Int("fileCount", len(state.InstalledFiles)).
					Msg("Attempting state-based file cleanup after uninstall failure")

				removed := 0
				for _, filePath := range state.InstalledFiles {
					if err := os.Remove(filePath); err == nil {
						removed++
					}
				}

				if removed > 0 {
					result.Success = true
					result.Message = fmt.Sprintf("Rolled back %s by removing %d installed files", info.PackageName, removed)
					e.DeleteRollbackInfo(ctx, rollbackID)
				}
			}
		}
		result.Duration = time.Since(startTime).Milliseconds()
		return result
	}

	// Package was installed before - try to downgrade to previous version
	if info.PreviousVersion != "" {
		pkg := models.SoftwarePackage{
			Name:    info.PackageName,
			Version: info.PreviousVersion,
			Source:  info.InstallSource,
		}
		result = e.software.InstallSoftware(ctx, pkg)
		if result.Success {
			result.Message = fmt.Sprintf("Rolled back %s from %s to %s",
				info.PackageName, info.InstalledVersion, info.PreviousVersion)
			// Remove rollback info after successful rollback
			e.DeleteRollbackInfo(ctx, rollbackID)
		} else {
			// If package manager rollback failed and we have state, try state-based rollback
			if state != nil {
				log.Info().
					Str("rollbackID", rollbackID).
					Msg("Package manager rollback failed, attempting state-based recovery")

				result.Message = fmt.Sprintf("Cannot rollback %s: original package unavailable and state-based recovery not yet implemented", info.PackageName)
				result.ErrorCode = models.ErrPackageNotFound
				result.ErrorMessage = "Original package version not available for rollback"
			}
		}
		result.Duration = time.Since(startTime).Milliseconds()
		return result
	}

	// No previous version info, just uninstall
	result = e.software.UninstallSoftware(ctx, info.PackageName)
	if result.Success {
		result.Message = fmt.Sprintf("Rolled back %s by uninstalling (no previous version info)", info.PackageName)
		// Remove rollback info after successful rollback
		e.DeleteRollbackInfo(ctx, rollbackID)
	}

	result.Duration = time.Since(startTime).Milliseconds()
	return result
}
