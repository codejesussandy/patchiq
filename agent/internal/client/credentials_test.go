package client

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSaveAndLoadCredentials_RoundTrip(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()

	creds := &Credentials{
		AgentID:      "agent-abc",
		AssetID:      "asset-xyz",
		AccessToken:  "access-tok",
		RefreshToken: "refresh-tok",
		MachineID:    "machine-001",
		ServerURL:    "https://api.example.com",
	}

	err := SaveCredentials(dir, creds)
	require.NoError(t, err)

	loaded, err := LoadCredentials(dir)
	require.NoError(t, err)
	require.NotNil(t, loaded)

	assert.Equal(t, creds.AgentID, loaded.AgentID)
	assert.Equal(t, creds.AssetID, loaded.AssetID)
	assert.Equal(t, creds.AccessToken, loaded.AccessToken)
	assert.Equal(t, creds.RefreshToken, loaded.RefreshToken)
	assert.Equal(t, creds.MachineID, loaded.MachineID)
	assert.Equal(t, creds.ServerURL, loaded.ServerURL)
}

func TestLoadCredentials_NonExistent(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()

	creds, err := LoadCredentials(dir)
	require.NoError(t, err)
	assert.Nil(t, creds)
}

func TestSaveCredentials_CreatesDirectory(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()
	subDir := filepath.Join(dir, "nested", "config")

	creds := &Credentials{AgentID: "a1", AccessToken: "tok"}
	err := SaveCredentials(subDir, creds)
	require.NoError(t, err)

	_, err = os.Stat(subDir)
	require.NoError(t, err)
}

func TestSaveCredentials_FilePermissions(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("Unix file permissions not enforced on Windows")
	}
	t.Parallel()
	dir := t.TempDir()

	creds := &Credentials{AgentID: "a1", AccessToken: "tok"}
	err := SaveCredentials(dir, creds)
	require.NoError(t, err)

	info, err := os.Stat(filepath.Join(dir, "credentials.json"))
	require.NoError(t, err)
	// File should be 0600 (owner read/write only)
	assert.Equal(t, os.FileMode(0600), info.Mode().Perm())
}

func TestDeleteCredentials_Existing(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()

	creds := &Credentials{AgentID: "a1", AccessToken: "tok"}
	require.NoError(t, SaveCredentials(dir, creds))

	err := DeleteCredentials(dir)
	require.NoError(t, err)

	// After deletion, LoadCredentials should return nil,nil
	loaded, err := LoadCredentials(dir)
	require.NoError(t, err)
	assert.Nil(t, loaded)
}

func TestDeleteCredentials_NonExistent(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()

	// Deleting non-existent file should not error
	err := DeleteCredentials(dir)
	require.NoError(t, err)
}

func TestLoadCredentials_PlaintextJSON_Migration(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()

	// Write plaintext JSON credentials (simulating pre-encryption format)
	plaintext := `{
  "agentId": "legacy-agent",
  "assetId": "legacy-asset",
  "accessToken": "legacy-access",
  "refreshToken": "legacy-refresh",
  "machineId": "legacy-machine"
}`
	credPath := filepath.Join(dir, "credentials.json")
	err := os.WriteFile(credPath, []byte(plaintext), 0600)
	require.NoError(t, err)

	loaded, err := LoadCredentials(dir)
	require.NoError(t, err)
	require.NotNil(t, loaded)
	assert.Equal(t, "legacy-agent", loaded.AgentID)
	assert.Equal(t, "legacy-access", loaded.AccessToken)
}

func TestSaveCredentials_Overwrites(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()

	creds1 := &Credentials{AgentID: "agent-1", AccessToken: "tok-1"}
	require.NoError(t, SaveCredentials(dir, creds1))

	creds2 := &Credentials{AgentID: "agent-2", AccessToken: "tok-2"}
	require.NoError(t, SaveCredentials(dir, creds2))

	loaded, err := LoadCredentials(dir)
	require.NoError(t, err)
	require.NotNil(t, loaded)
	assert.Equal(t, "agent-2", loaded.AgentID)
}
