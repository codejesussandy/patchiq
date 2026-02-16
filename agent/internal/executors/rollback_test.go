package executors

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/patchify/agent/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// MockSoftwareExecutor implements SoftwareExecutor for testing
type MockSoftwareExecutor struct {
	installedPackages map[string]string // name -> version
	installError      error
	uninstallError    error
	versionError      error
}

func NewMockSoftwareExecutor() *MockSoftwareExecutor {
	return &MockSoftwareExecutor{
		installedPackages: make(map[string]string),
	}
}

func (m *MockSoftwareExecutor) InstallSoftware(ctx context.Context, pkg models.SoftwarePackage) models.ExecutionResult {
	if m.installError != nil {
		return models.ExecutionResult{
			Success:      false,
			ErrorMessage: m.installError.Error(),
		}
	}

	m.installedPackages[pkg.Name] = pkg.Version
	return models.ExecutionResult{
		Success: true,
		Message: "Installed successfully",
	}
}

func (m *MockSoftwareExecutor) UninstallSoftware(ctx context.Context, name string) models.ExecutionResult {
	if m.uninstallError != nil {
		return models.ExecutionResult{
			Success:      false,
			ErrorMessage: m.uninstallError.Error(),
		}
	}

	delete(m.installedPackages, name)
	return models.ExecutionResult{
		Success: true,
		Message: "Uninstalled successfully",
	}
}

func (m *MockSoftwareExecutor) GetInstalledVersion(ctx context.Context, name string) (string, error) {
	if m.versionError != nil {
		return "", m.versionError
	}

	version, ok := m.installedPackages[name]
	if !ok {
		return "", os.ErrNotExist
	}

	return version, nil
}

// setupTestExecutor creates a test rollback executor with temp directory
func setupTestExecutor(t *testing.T) (*BaseRollbackExecutor, string, func()) {
	tempDir := t.TempDir()

	mockSoftware := NewMockSoftwareExecutor()
	executor := NewBaseRollbackExecutor(tempDir, mockSoftware)

	cleanup := func() {
		os.RemoveAll(tempDir)
	}

	return executor, tempDir, cleanup
}

// TestRollbackInvalidID tests validation of invalid rollback IDs
func TestRollbackInvalidID(t *testing.T) {
	executor, _, cleanup := setupTestExecutor(t)
	defer cleanup()

	ctx := context.Background()

	testCases := []struct {
		name       string
		rollbackID string
		wantError  bool
	}{
		{
			name:       "non-existent ID",
			rollbackID: "RB-999999999999",
			wantError:  true,
		},
		{
			name:       "invalid format",
			rollbackID: "INVALID-123",
			wantError:  true,
		},
		{
			name:       "empty ID",
			rollbackID: "",
			wantError:  true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := executor.ExecuteRollback(ctx, tc.rollbackID, false)

			assert.False(t, result.Success, "Rollback should fail for invalid ID")
			assert.NotEmpty(t, result.ErrorMessage, "Error message should be present")
			assert.Equal(t, models.ErrInvalidInput, result.ErrorCode, "Should return invalid input error")
			assert.False(t, result.Retryable, "Invalid input errors should not be retryable")
		})
	}
}

// TestRollbackMissingOriginalPackage tests rollback when original package unavailable
func TestRollbackMissingOriginalPackage(t *testing.T) {
	executor, tempDir, cleanup := setupTestExecutor(t)
	defer cleanup()

	ctx := context.Background()

	// Create rollback info
	info := models.RollbackInfo{
		ID:               "RB-1234567890",
		PackageName:      "test-package",
		PreviousVersion:  "1.0.0",
		InstalledVersion: "2.0.0",
		WasInstalled:     true,
		InstallSource:    "test",
		InstalledAt:      time.Now().Format(time.RFC3339),
		SupportsRollback: true,
	}

	err := executor.SaveRollbackInfo(ctx, info)
	require.NoError(t, err, "Should save rollback info")

	// Save rollback state with file list
	state := RollbackState{
		JobID:            "RB-1234567890",
		PackageName:      "test-package",
		PreviousVersion:  "1.0.0",
		InstalledVersion: "2.0.0",
		InstallSource:    "test",
		InstalledFiles: []string{
			filepath.Join(tempDir, "file1.txt"),
			filepath.Join(tempDir, "file2.txt"),
		},
		Timestamp: time.Now(),
	}

	err = executor.saveRollbackState(info.ID, state)
	require.NoError(t, err, "Should save rollback state")

	// Simulate package manager failure by setting install error
	mockSoftware := executor.software.(*MockSoftwareExecutor)
	mockSoftware.installError = os.ErrNotExist

	// Execute rollback
	result := executor.ExecuteRollback(ctx, info.ID, false)

	// Should fail gracefully with proper error
	assert.False(t, result.Success, "Rollback should fail when package unavailable")
	assert.Contains(t, result.ErrorMessage, "not available", "Error should mention unavailability")
}

// TestRollbackCleanupTempFiles tests cleanup of temporary files after rollback
func TestRollbackCleanupTempFiles(t *testing.T) {
	executor, tempDir, cleanup := setupTestExecutor(t)
	defer cleanup()

	ctx := context.Background()

	// Create rollback info
	info := models.RollbackInfo{
		ID:               "RB-cleanup-test",
		PackageName:      "cleanup-package",
		PreviousVersion:  "",
		InstalledVersion: "1.0.0",
		WasInstalled:     false,
		InstallSource:    "test",
		InstalledAt:      time.Now().Format(time.RFC3339),
		SupportsRollback: true,
	}

	err := executor.SaveRollbackInfo(ctx, info)
	require.NoError(t, err, "Should save rollback info")

	// Save rollback state
	state := RollbackState{
		JobID:       "RB-cleanup-test",
		PackageName: "cleanup-package",
		Timestamp:   time.Now(),
	}

	err = executor.saveRollbackState(info.ID, state)
	require.NoError(t, err, "Should save rollback state")

	// Create marker file
	err = executor.markRollbackInProgress(info.ID)
	require.NoError(t, err, "Should create marker file")

	// Verify files exist before rollback
	stateFile := filepath.Join(tempDir, "rollback", "states", info.ID+".json")
	markerFile := filepath.Join(tempDir, "rollback", "in-progress", info.ID+".marker")

	_, err = os.Stat(stateFile)
	assert.NoError(t, err, "State file should exist before rollback")

	_, err = os.Stat(markerFile)
	assert.NoError(t, err, "Marker file should exist before rollback")

	// Execute rollback (should succeed since package wasn't installed)
	result := executor.ExecuteRollback(ctx, info.ID, false)
	assert.True(t, result.Success, "Rollback should succeed")

	// Verify cleanup happened
	_, err = os.Stat(stateFile)
	assert.True(t, os.IsNotExist(err), "State file should be removed after rollback")

	_, err = os.Stat(markerFile)
	assert.True(t, os.IsNotExist(err), "Marker file should be removed after rollback")
}

// TestRollbackCrashRecovery tests recovery of incomplete rollbacks
func TestRollbackCrashRecovery(t *testing.T) {
	executor, tempDir, cleanup := setupTestExecutor(t)
	defer cleanup()

	ctx := context.Background()

	// Create multiple incomplete rollbacks
	rollbackIDs := []string{"RB-crash-1", "RB-crash-2"}

	for _, id := range rollbackIDs {
		// Create rollback info
		info := models.RollbackInfo{
			ID:               id,
			PackageName:      "crash-package-" + id,
			PreviousVersion:  "",
			InstalledVersion: "1.0.0",
			WasInstalled:     false,
			InstallSource:    "test",
			InstalledAt:      time.Now().Format(time.RFC3339),
			SupportsRollback: true,
		}

		err := executor.SaveRollbackInfo(ctx, info)
		require.NoError(t, err, "Should save rollback info")

		// Create marker file to simulate incomplete rollback
		err = executor.markRollbackInProgress(id)
		require.NoError(t, err, "Should create marker file")
	}

	// Verify marker files exist
	for _, id := range rollbackIDs {
		markerFile := filepath.Join(tempDir, "rollback", "in-progress", id+".marker")
		_, err := os.Stat(markerFile)
		assert.NoError(t, err, "Marker file should exist before recovery")
	}

	// Run crash recovery
	results := executor.RecoverIncompleteRollbacks(ctx)

	// Should recover all incomplete rollbacks
	assert.Equal(t, len(rollbackIDs), len(results), "Should recover all incomplete rollbacks")

	// All recoveries should succeed (since packages weren't installed)
	for i, result := range results {
		assert.True(t, result.Success, "Recovery %d should succeed", i)
	}

	// Verify all marker files are removed
	for _, id := range rollbackIDs {
		markerFile := filepath.Join(tempDir, "rollback", "in-progress", id+".marker")
		_, err := os.Stat(markerFile)
		assert.True(t, os.IsNotExist(err), "Marker file should be removed after recovery")
	}
}

// TestRollbackStateManagement tests saving and loading rollback state
func TestRollbackStateManagement(t *testing.T) {
	executor, tempDir, cleanup := setupTestExecutor(t)
	defer cleanup()

	rollbackID := "RB-state-test"

	// Create detailed rollback state
	originalState := RollbackState{
		JobID:            rollbackID,
		PackageName:      "state-test-package",
		PreviousVersion:  "1.0.0",
		InstalledVersion: "2.0.0",
		InstallPath:      "/opt/test-package",
		RegistryKeys:     []string{"HKLM\\Software\\Test", "HKCU\\Software\\Test"},
		InstalledFiles: []string{
			"/opt/test-package/bin/test",
			"/opt/test-package/lib/libtest.so",
		},
		InstallSource: "deb",
		Timestamp:     time.Now(),
		Metadata: map[string]string{
			"architecture": "amd64",
			"maintainer":   "test@example.com",
		},
	}

	// Save state
	err := executor.saveRollbackState(rollbackID, originalState)
	require.NoError(t, err, "Should save rollback state")

	// Load state
	loadedState, err := executor.loadRollbackState(rollbackID)
	require.NoError(t, err, "Should load rollback state")

	// Verify all fields
	assert.Equal(t, originalState.JobID, loadedState.JobID)
	assert.Equal(t, originalState.PackageName, loadedState.PackageName)
	assert.Equal(t, originalState.PreviousVersion, loadedState.PreviousVersion)
	assert.Equal(t, originalState.InstalledVersion, loadedState.InstalledVersion)
	assert.Equal(t, originalState.InstallPath, loadedState.InstallPath)
	assert.Equal(t, originalState.RegistryKeys, loadedState.RegistryKeys)
	assert.Equal(t, originalState.InstalledFiles, loadedState.InstalledFiles)
	assert.Equal(t, originalState.InstallSource, loadedState.InstallSource)
	assert.Equal(t, originalState.Metadata, loadedState.Metadata)

	// Verify state file exists
	stateFile := filepath.Join(tempDir, "rollback", "states", rollbackID+".json")
	_, err = os.Stat(stateFile)
	assert.NoError(t, err, "State file should exist")

	// Test loading non-existent state
	_, err = executor.loadRollbackState("RB-nonexistent")
	assert.Error(t, err, "Should error when loading non-existent state")
}

// TestRollbackUninstallNewPackage tests rollback by uninstalling newly installed package
func TestRollbackUninstallNewPackage(t *testing.T) {
	executor, _, cleanup := setupTestExecutor(t)
	defer cleanup()

	ctx := context.Background()

	// Simulate a package that was NOT installed before
	info := models.RollbackInfo{
		ID:               "RB-new-package",
		PackageName:      "new-package",
		PreviousVersion:  "",
		InstalledVersion: "1.0.0",
		WasInstalled:     false, // Key: package was new
		InstallSource:    "brew",
		InstalledAt:      time.Now().Format(time.RFC3339),
		SupportsRollback: true,
	}

	err := executor.SaveRollbackInfo(ctx, info)
	require.NoError(t, err, "Should save rollback info")

	// "Install" the package in mock
	mockSoftware := executor.software.(*MockSoftwareExecutor)
	mockSoftware.installedPackages["new-package"] = "1.0.0"

	// Execute rollback
	result := executor.ExecuteRollback(ctx, info.ID, false)

	// Should succeed
	assert.True(t, result.Success, "Rollback should succeed")
	assert.Contains(t, result.Message, "uninstalling", "Should uninstall new package")

	// Package should be removed
	_, exists := mockSoftware.installedPackages["new-package"]
	assert.False(t, exists, "Package should be uninstalled")

	// Rollback info should be deleted
	_, err = executor.GetRollbackInfo(ctx, info.ID)
	assert.Error(t, err, "Rollback info should be deleted after successful rollback")
}

// TestRollbackDowngradePreviousVersion tests rollback by downgrading to previous version
func TestRollbackDowngradePreviousVersion(t *testing.T) {
	executor, _, cleanup := setupTestExecutor(t)
	defer cleanup()

	ctx := context.Background()

	// Simulate a package that was upgraded from 1.0.0 to 2.0.0
	info := models.RollbackInfo{
		ID:               "RB-downgrade",
		PackageName:      "upgrade-package",
		PreviousVersion:  "1.0.0",
		InstalledVersion: "2.0.0",
		WasInstalled:     true, // Key: package existed before
		InstallSource:    "apt",
		InstalledAt:      time.Now().Format(time.RFC3339),
		SupportsRollback: true,
	}

	err := executor.SaveRollbackInfo(ctx, info)
	require.NoError(t, err, "Should save rollback info")

	// Package currently at version 2.0.0
	mockSoftware := executor.software.(*MockSoftwareExecutor)
	mockSoftware.installedPackages["upgrade-package"] = "2.0.0"

	// Execute rollback
	result := executor.ExecuteRollback(ctx, info.ID, false)

	// Should succeed
	assert.True(t, result.Success, "Rollback should succeed")
	assert.Contains(t, result.Message, "1.0.0", "Should mention downgrade to 1.0.0")

	// Package should be at previous version
	version := mockSoftware.installedPackages["upgrade-package"]
	assert.Equal(t, "1.0.0", version, "Package should be downgraded to 1.0.0")

	// Rollback info should be deleted
	_, err = executor.GetRollbackInfo(ctx, info.ID)
	assert.Error(t, err, "Rollback info should be deleted after successful rollback")
}

// TestRollbackForceMode tests rollback with force flag
func TestRollbackForceMode(t *testing.T) {
	executor, _, cleanup := setupTestExecutor(t)
	defer cleanup()

	ctx := context.Background()

	// Create rollback info that doesn't support rollback
	info := models.RollbackInfo{
		ID:               "RB-force",
		PackageName:      "no-rollback-package",
		PreviousVersion:  "",
		InstalledVersion: "1.0.0",
		WasInstalled:     false,
		InstallSource:    "manual",
		InstalledAt:      time.Now().Format(time.RFC3339),
		SupportsRollback: false, // Key: rollback not supported
	}

	err := executor.SaveRollbackInfo(ctx, info)
	require.NoError(t, err, "Should save rollback info")

	// Without force, should fail
	result := executor.ExecuteRollback(ctx, info.ID, false)
	assert.False(t, result.Success, "Rollback should fail without force")
	assert.Contains(t, result.ErrorMessage, "not support rollback", "Should mention rollback not supported")

	// With force, should attempt rollback
	result = executor.ExecuteRollback(ctx, info.ID, true)
	assert.True(t, result.Success, "Rollback should succeed with force")
}

// TestCreateRollbackInfoForInstall tests creating rollback info before installation
func TestCreateRollbackInfoForInstall(t *testing.T) {
	executor, _, cleanup := setupTestExecutor(t)
	defer cleanup()

	ctx := context.Background()
	mockSoftware := executor.software.(*MockSoftwareExecutor)

	// Test 1: Package not installed
	info, err := executor.CreateRollbackInfoForInstall(ctx, "new-pkg", "brew", "cmd-123", mockSoftware)
	require.NoError(t, err, "Should create rollback info")
	assert.Equal(t, "new-pkg", info.PackageName)
	assert.False(t, info.WasInstalled, "Should mark as not installed")
	assert.Empty(t, info.PreviousVersion, "Should have no previous version")

	// Test 2: Package already installed
	mockSoftware.installedPackages["existing-pkg"] = "1.0.0"
	info, err = executor.CreateRollbackInfoForInstall(ctx, "existing-pkg", "apt", "cmd-456", mockSoftware)
	require.NoError(t, err, "Should create rollback info")
	assert.Equal(t, "existing-pkg", info.PackageName)
	assert.True(t, info.WasInstalled, "Should mark as previously installed")
	assert.Equal(t, "1.0.0", info.PreviousVersion, "Should capture previous version")
}
