package integration

import (
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/patchify/agent/internal/update"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestRollbackStatePersistence tests saving and loading rollback state
func TestRollbackStatePersistence(t *testing.T) {
	// Create test rollback state
	state := &update.RollbackState{
		CurrentVersion:     "1.2.0",
		PreviousVersion:    "1.1.0",
		PreviousBinaryPath: "/path/to/agent.bak",
		UpdateStartedAt:    time.Now(),
		HealthCheckFailed:  false,
		RollbackReason:     "",
		Platform:           "linux",
		Architecture:       "amd64",
	}

	// Save state
	err := update.SaveRollbackState(state)
	require.NoError(t, err, "Failed to save rollback state")

	// Load state
	loadedState, err := update.LoadRollbackState()
	require.NoError(t, err, "Failed to load rollback state")

	// Verify state
	assert.Equal(t, state.CurrentVersion, loadedState.CurrentVersion)
	assert.Equal(t, state.PreviousVersion, loadedState.PreviousVersion)
	assert.Equal(t, state.PreviousBinaryPath, loadedState.PreviousBinaryPath)
	assert.Equal(t, state.Platform, loadedState.Platform)

	// Clean up
	update.ClearRollbackState()
}

// TestConfigBackupRestore tests config file backup and restore
func TestConfigBackupRestore(t *testing.T) {
	// Create temporary config directory
	homeDir, err := os.UserHomeDir()
	require.NoError(t, err)

	configDir := filepath.Join(homeDir, ".patchify-agent")
	err = os.MkdirAll(configDir, 0755)
	require.NoError(t, err)

	// Create test config file
	testConfig := filepath.Join(configDir, "config.json")
	testContent := []byte(`{"serverUrl":"http://test.com","webUiPort":4504}`)
	err = os.WriteFile(testConfig, testContent, 0600)
	require.NoError(t, err)

	// Backup config files
	backupDir, err := update.BackupConfigFiles()
	require.NoError(t, err, "Failed to backup config files")
	assert.NotEmpty(t, backupDir)

	// Verify backup exists
	backupFile := filepath.Join(backupDir, "config.json")
	_, err = os.Stat(backupFile)
	assert.NoError(t, err, "Backup file should exist")

	// Modify original file
	modifiedContent := []byte(`{"serverUrl":"http://modified.com","webUiPort":5000}`)
	err = os.WriteFile(testConfig, modifiedContent, 0600)
	require.NoError(t, err)

	// Restore from backup
	err = update.RestoreConfigFiles(backupDir)
	require.NoError(t, err, "Failed to restore config files")

	// Verify restoration
	restoredContent, err := os.ReadFile(testConfig)
	require.NoError(t, err)
	assert.Equal(t, testContent, restoredContent, "Config should be restored to original")

	// Clean up
	os.RemoveAll(filepath.Join(configDir, "backup"))
}

// TestRollbackTimeout tests rollback timeout detection
func TestRollbackTimeout(t *testing.T) {
	// Create state with old update time
	state := &update.RollbackState{
		CurrentVersion:  "1.2.0",
		PreviousVersion: "1.1.0",
		UpdateStartedAt: time.Now().Add(-10 * time.Minute),
	}

	// Check timeout with 5 minute limit
	shouldRollback := update.CheckRollbackTimeout(state, 5*time.Minute)
	assert.True(t, shouldRollback, "Should trigger rollback after timeout")

	// Create recent state
	recentState := &update.RollbackState{
		CurrentVersion:  "1.2.0",
		PreviousVersion: "1.1.0",
		UpdateStartedAt: time.Now().Add(-2 * time.Minute),
	}

	// Check recent state
	shouldRollback = update.CheckRollbackTimeout(recentState, 5*time.Minute)
	assert.False(t, shouldRollback, "Should not trigger rollback before timeout")
}

// TestPreUpdateChecks tests pre-update verification
func TestPreUpdateChecks(t *testing.T) {
	result := update.PreUpdateChecks()

	// Should pass on a normal system
	assert.True(t, result.Passed, "Pre-update checks should pass")
	assert.NotNil(t, result.Details)

	// Check that required fields are present
	assert.Contains(t, result.Details, "diskSpaceGB")
	assert.Contains(t, result.Details, "networkConnectivity")
	assert.Contains(t, result.Details, "writePermissions")
}

// TestCorruptionDetection tests corruption detection on binaries
func TestCorruptionDetection(t *testing.T) {
	// Create a temporary test file
	tmpDir := t.TempDir()
	testFile := filepath.Join(tmpDir, "test-binary")

	testContent := []byte("This is a test binary content")
	err := os.WriteFile(testFile, testContent, 0755)
	require.NoError(t, err)

	// Calculate expected checksum
	expectedChecksum := "f8a8b28d8f7d1e0c2a9b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5"

	// Test truncated download (wrong size)
	report := update.DetectCorruption(testFile, 1000, "")
	assert.True(t, report.Detected, "Should detect truncated download")
	assert.Equal(t, update.CorruptionTruncated, report.Type)

	// Test with correct size but wrong checksum
	report = update.DetectCorruption(testFile, int64(len(testContent)), expectedChecksum)
	assert.True(t, report.Detected, "Should detect checksum mismatch")
	assert.Equal(t, update.CorruptionChecksum, report.Type)

	// Test with no validation (should pass)
	report = update.DetectCorruption(testFile, 0, "")
	assert.False(t, report.Detected, "Should not detect corruption without validation")
}

// TestRolloutBucketing tests hash-based rollout bucketing
func TestRolloutBucketing(t *testing.T) {
	// Test cases with known agent IDs
	testCases := []struct {
		agentID          string
		rolloutPercentage int
		expectedUpdate    bool
	}{
		{"agent-001", 100, true},  // 100% always updates
		{"agent-002", 0, false},   // 0% never updates
		{"agent-003", 50, true},   // Should be deterministic based on hash
	}

	for _, tc := range testCases {
		t.Run(tc.agentID, func(t *testing.T) {
			shouldUpdate := update.ShouldUpdate(tc.agentID, tc.rolloutPercentage)

			if tc.rolloutPercentage == 100 {
				assert.True(t, shouldUpdate, "100%% rollout should always update")
			} else if tc.rolloutPercentage == 0 {
				assert.False(t, shouldUpdate, "0%% rollout should never update")
			}

			// Test determinism - same agent ID should always get same result
			shouldUpdate2 := update.ShouldUpdate(tc.agentID, tc.rolloutPercentage)
			assert.Equal(t, shouldUpdate, shouldUpdate2, "Rollout decision should be deterministic")
		})
	}
}

// TestRolloutConsistency tests that the same agent always gets the same bucket
func TestRolloutConsistency(t *testing.T) {
	agentID := "test-agent-123"

	// Get initial bucket assignment
	firstResult := update.ShouldUpdate(agentID, 50)

	// Call multiple times and verify consistency
	for i := 0; i < 100; i++ {
		result := update.ShouldUpdate(agentID, 50)
		assert.Equal(t, firstResult, result, "Rollout decision should be consistent")
	}
}

// TestRolloutDistribution tests that rollout percentage is approximately correct
func TestRolloutDistribution(t *testing.T) {
	rolloutPercentage := 50
	numAgents := 1000
	updateCount := 0

	// Generate test agent IDs and check how many would update
	for i := 0; i < numAgents; i++ {
		agentID := fmt.Sprintf("agent-%d", i)
		if update.ShouldUpdate(agentID, rolloutPercentage) {
			updateCount++
		}
	}

	// Calculate actual percentage
	actualPercentage := float64(updateCount) / float64(numAgents) * 100

	// Should be within 10% of target (due to hash distribution)
	tolerance := 10.0
	assert.InDelta(t, float64(rolloutPercentage), actualPercentage, tolerance,
		"Actual rollout percentage should be close to target")
}

// TestDeploymentGroupValidation tests deployment group validation
func TestDeploymentGroupValidation(t *testing.T) {
	validGroups := []string{"canary", "beta", "production"}
	invalidGroups := []string{"invalid", "test", ""}

	for _, group := range validGroups {
		assert.True(t, update.ValidateDeploymentGroup(group),
			"Should accept valid deployment group: %s", group)
	}

	for _, group := range invalidGroups {
		assert.False(t, update.ValidateDeploymentGroup(group),
			"Should reject invalid deployment group: %s", group)
	}
}

// TestEvaluateRollout tests complete rollout evaluation logic
func TestEvaluateRollout(t *testing.T) {
	// Test manual override
	config := update.RolloutConfig{
		ManualOverride:    true,
		CurrentVersion:    "1.0.0",
		TargetVersion:     "1.1.0",
		DeploymentGroup:   update.DeploymentGroupProduction,
		RolloutPercentage: 0,
	}

	shouldUpdate, reason := update.EvaluateRollout(config, "test-agent")
	assert.True(t, shouldUpdate, "Manual override should force update")
	assert.Contains(t, reason, "manual override")

	// Test already on target version
	config = update.RolloutConfig{
		CurrentVersion:    "1.1.0",
		TargetVersion:     "1.1.0",
		DeploymentGroup:   update.DeploymentGroupProduction,
		RolloutPercentage: 100,
	}

	shouldUpdate, reason = update.EvaluateRollout(config, "test-agent")
	assert.False(t, shouldUpdate, "Should not update if already on target version")
	assert.Contains(t, reason, "already on target version")

	// Test normal rollout
	config = update.RolloutConfig{
		CurrentVersion:    "1.0.0",
		TargetVersion:     "1.1.0",
		DeploymentGroup:   update.DeploymentGroupProduction,
		RolloutPercentage: 100,
	}

	shouldUpdate, reason = update.EvaluateRollout(config, "test-agent")
	assert.True(t, shouldUpdate, "Should update when in rollout")
	assert.Contains(t, reason, "rollout")
}

// TestCleanOldBackups tests cleanup of old backup directories
func TestCleanOldBackups(t *testing.T) {
	homeDir, err := os.UserHomeDir()
	require.NoError(t, err)

	backupBaseDir := filepath.Join(homeDir, ".patchify-agent", "backup")
	err = os.MkdirAll(backupBaseDir, 0755)
	require.NoError(t, err)

	// Create multiple backup directories
	for i := 1; i <= 5; i++ {
		backupDir := filepath.Join(backupBaseDir, fmt.Sprintf("pre-update-%d", time.Now().Unix()-int64(i*1000)))
		err = os.MkdirAll(backupDir, 0755)
		require.NoError(t, err)
	}

	// Keep only 2 most recent backups
	err = update.CleanOldBackups(2)
	require.NoError(t, err)

	// Count remaining backups
	entries, err := os.ReadDir(backupBaseDir)
	require.NoError(t, err)

	count := 0
	for _, entry := range entries {
		if entry.IsDir() {
			count++
		}
	}

	assert.LessOrEqual(t, count, 2, "Should keep at most 2 backups")

	// Clean up
	os.RemoveAll(backupBaseDir)
}
