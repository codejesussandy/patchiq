package update

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func withTempHome(t *testing.T) string {
	t.Helper()
	tmpDir := t.TempDir()
	t.Setenv("HOME", tmpDir)
	return tmpDir
}

func TestSaveAndLoadRollbackState(t *testing.T) {
	withTempHome(t)

	state := &RollbackState{
		CurrentVersion:     "2.0.0",
		PreviousVersion:    "1.0.0",
		PreviousBinaryPath: "/usr/local/bin/agent.bak",
		UpdateStartedAt:    time.Now().UTC().Truncate(time.Second),
		HealthCheckFailed:  false,
		RollbackReason:     "",
		Platform:           "linux",
		Architecture:       "amd64",
	}

	err := SaveRollbackState(state)
	require.NoError(t, err)

	loaded, err := LoadRollbackState()
	require.NoError(t, err)

	assert.Equal(t, state.CurrentVersion, loaded.CurrentVersion)
	assert.Equal(t, state.PreviousVersion, loaded.PreviousVersion)
	assert.Equal(t, state.PreviousBinaryPath, loaded.PreviousBinaryPath)
	assert.Equal(t, state.Platform, loaded.Platform)
	assert.Equal(t, state.Architecture, loaded.Architecture)
}

func TestLoadRollbackState_NotFound(t *testing.T) {
	withTempHome(t)

	_, err := LoadRollbackState()
	assert.Error(t, err)
}

func TestClearRollbackState(t *testing.T) {
	withTempHome(t)

	state := &RollbackState{
		CurrentVersion:  "2.0.0",
		PreviousVersion: "1.0.0",
		UpdateStartedAt: time.Now(),
		Platform:        "linux",
		Architecture:    "amd64",
	}

	err := SaveRollbackState(state)
	require.NoError(t, err)

	err = ClearRollbackState()
	require.NoError(t, err)

	_, err = LoadRollbackState()
	assert.Error(t, err)
}

func TestClearRollbackState_AlreadyCleared(t *testing.T) {
	withTempHome(t)

	// Should not error if file doesn't exist
	err := ClearRollbackState()
	assert.NoError(t, err)
}

func TestCheckRollbackTimeout_Exceeded(t *testing.T) {
	state := &RollbackState{
		UpdateStartedAt: time.Now().Add(-10 * time.Minute),
	}

	result := CheckRollbackTimeout(state, 5*time.Minute)
	assert.True(t, result)
}

func TestCheckRollbackTimeout_WithinTimeout(t *testing.T) {
	state := &RollbackState{
		UpdateStartedAt: time.Now().Add(-1 * time.Minute),
	}

	result := CheckRollbackTimeout(state, 5*time.Minute)
	assert.False(t, result)
}

func TestCheckRollbackTimeout_NilState(t *testing.T) {
	result := CheckRollbackTimeout(nil, 5*time.Minute)
	assert.False(t, result)
}

func TestBackupAndRestoreConfigFiles(t *testing.T) {
	tmpHome := withTempHome(t)

	configDir := filepath.Join(tmpHome, ".patchify-agent")
	err := os.MkdirAll(configDir, 0755)
	require.NoError(t, err)

	// Create fake config files
	err = os.WriteFile(filepath.Join(configDir, "config.json"), []byte(`{"key":"value"}`), 0600)
	require.NoError(t, err)
	err = os.WriteFile(filepath.Join(configDir, "credentials.json"), []byte(`{"token":"secret"}`), 0600)
	require.NoError(t, err)

	backupDir, err := BackupConfigFiles()
	require.NoError(t, err)
	assert.NotEmpty(t, backupDir)

	// Verify backup files exist
	_, err = os.Stat(filepath.Join(backupDir, "config.json"))
	assert.NoError(t, err)
	_, err = os.Stat(filepath.Join(backupDir, "credentials.json"))
	assert.NoError(t, err)

	// Remove originals and restore
	os.Remove(filepath.Join(configDir, "config.json"))
	os.Remove(filepath.Join(configDir, "credentials.json"))

	err = RestoreConfigFiles(backupDir)
	require.NoError(t, err)

	// Verify restored
	data, err := os.ReadFile(filepath.Join(configDir, "config.json"))
	require.NoError(t, err)
	assert.Equal(t, `{"key":"value"}`, string(data))
}

func TestBackupConfigFiles_NoFiles(t *testing.T) {
	tmpHome := withTempHome(t)

	configDir := filepath.Join(tmpHome, ".patchify-agent")
	err := os.MkdirAll(configDir, 0755)
	require.NoError(t, err)

	// No config files exist - should error
	_, err = BackupConfigFiles()
	assert.Error(t, err)
}

func TestRestoreConfigFiles_EmptyBackupDir(t *testing.T) {
	err := RestoreConfigFiles("")
	assert.Error(t, err)
}
