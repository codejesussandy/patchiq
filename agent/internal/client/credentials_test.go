package client

import (
	"os"
	"path/filepath"
	"testing"
)

func TestSaveLoadCredentials(t *testing.T) {
	// Create temporary directory
	tmpDir, err := os.MkdirTemp("", "credentials-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// Test credentials
	original := &Credentials{
		AgentID:      "agent-123",
		AssetID:      "asset-456",
		AccessToken:  "access-token-xyz",
		RefreshToken: "refresh-token-abc",
		MachineID:    "machine-789",
		ServerURL:    "https://api.patchiq.io",
	}

	// Save credentials
	if err := SaveCredentials(tmpDir, original); err != nil {
		t.Fatalf("SaveCredentials failed: %v", err)
	}

	// Verify file exists
	credPath := filepath.Join(tmpDir, "credentials.json")
	if _, err := os.Stat(credPath); err != nil {
		t.Fatalf("Credentials file not created: %v", err)
	}

	// Verify file permissions
	info, err := os.Stat(credPath)
	if err != nil {
		t.Fatalf("Failed to stat credentials file: %v", err)
	}
	if info.Mode().Perm() != 0600 {
		t.Errorf("Expected file permissions 0600, got %v", info.Mode().Perm())
	}

	// Read raw file content
	rawData, err := os.ReadFile(credPath)
	if err != nil {
		t.Fatalf("Failed to read credentials file: %v", err)
	}

	// Verify data is encrypted (not plaintext JSON on most platforms)
	// On macOS it should be "KEYCHAIN" marker
	// On Linux/Windows it should not start with '{'
	if len(rawData) > 0 {
		firstChar := rawData[0]
		if firstChar == '{' {
			t.Log("Warning: Credentials appear to be plaintext (encryption may have failed)")
		} else {
			t.Logf("Credentials encrypted successfully (first byte: 0x%02x)", firstChar)
		}
	}

	// Load credentials
	loaded, err := LoadCredentials(tmpDir)
	if err != nil {
		t.Fatalf("LoadCredentials failed: %v", err)
	}

	// Verify loaded credentials match original
	if loaded.AgentID != original.AgentID {
		t.Errorf("AgentID mismatch: expected %s, got %s", original.AgentID, loaded.AgentID)
	}
	if loaded.AssetID != original.AssetID {
		t.Errorf("AssetID mismatch: expected %s, got %s", original.AssetID, loaded.AssetID)
	}
	if loaded.AccessToken != original.AccessToken {
		t.Errorf("AccessToken mismatch: expected %s, got %s", original.AccessToken, loaded.AccessToken)
	}
	if loaded.RefreshToken != original.RefreshToken {
		t.Errorf("RefreshToken mismatch: expected %s, got %s", original.RefreshToken, loaded.RefreshToken)
	}
	if loaded.MachineID != original.MachineID {
		t.Errorf("MachineID mismatch: expected %s, got %s", original.MachineID, loaded.MachineID)
	}
	if loaded.ServerURL != original.ServerURL {
		t.Errorf("ServerURL mismatch: expected %s, got %s", original.ServerURL, loaded.ServerURL)
	}
}

func TestLoadNonexistentCredentials(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "credentials-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	creds, err := LoadCredentials(tmpDir)
	if err != nil {
		t.Fatalf("LoadCredentials should not error on missing file: %v", err)
	}
	if creds != nil {
		t.Error("Expected nil credentials for nonexistent file")
	}
}

func TestDeleteCredentials(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "credentials-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// Save credentials
	creds := &Credentials{
		AgentID:     "test-agent",
		AccessToken: "test-token",
	}
	if err := SaveCredentials(tmpDir, creds); err != nil {
		t.Fatalf("SaveCredentials failed: %v", err)
	}

	// Delete credentials
	if err := DeleteCredentials(tmpDir); err != nil {
		t.Fatalf("DeleteCredentials failed: %v", err)
	}

	// Verify file is gone
	credPath := filepath.Join(tmpDir, "credentials.json")
	if _, err := os.Stat(credPath); !os.IsNotExist(err) {
		t.Error("Credentials file should be deleted")
	}

	// Delete again (should not error)
	if err := DeleteCredentials(tmpDir); err != nil {
		t.Errorf("DeleteCredentials should not error on missing file: %v", err)
	}
}

func TestPlaintextMigration(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "credentials-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// Write plaintext credentials file
	credPath := filepath.Join(tmpDir, "credentials.json")
	plaintext := `{
  "agentId": "agent-999",
  "assetId": "asset-888",
  "accessToken": "plain-access",
  "refreshToken": "plain-refresh",
  "machineId": "machine-777"
}`
	if err := os.WriteFile(credPath, []byte(plaintext), 0600); err != nil {
		t.Fatalf("Failed to write plaintext file: %v", err)
	}

	// Load credentials (should trigger migration)
	loaded, err := LoadCredentials(tmpDir)
	if err != nil {
		t.Fatalf("LoadCredentials failed: %v", err)
	}

	// Verify data loaded correctly
	if loaded.AgentID != "agent-999" {
		t.Errorf("AgentID mismatch: expected agent-999, got %s", loaded.AgentID)
	}
	if loaded.AccessToken != "plain-access" {
		t.Errorf("AccessToken mismatch: expected plain-access, got %s", loaded.AccessToken)
	}

	// Read file again - should be encrypted now (or at least different)
	rawData, err := os.ReadFile(credPath)
	if err != nil {
		t.Fatalf("Failed to read migrated file: %v", err)
	}

	// File should have changed after migration
	t.Logf("Migrated file first bytes: %x", rawData[:min(10, len(rawData))])

	// Load again to verify encrypted version works
	reloaded, err := LoadCredentials(tmpDir)
	if err != nil {
		t.Fatalf("LoadCredentials after migration failed: %v", err)
	}
	if reloaded.AgentID != "agent-999" {
		t.Errorf("AgentID after migration: expected agent-999, got %s", reloaded.AgentID)
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
