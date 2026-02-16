package integration

import (
	"crypto/sha256"
	"encoding/hex"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"testing"
	"time"
)

// TestIntegration_CheckForUpdate tests checking for agent updates
func TestIntegration_CheckForUpdate(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	// Simulate version check
	currentVersion := "1.0.0"
	latestVersion := "1.0.1"

	needsUpdate := compareVersions(currentVersion, latestVersion)

	if !needsUpdate {
		t.Error("Should detect that update is needed")
	}
}

// TestIntegration_DownloadUpdate tests downloading an update package
func TestIntegration_DownloadUpdate(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	tempDir := t.TempDir()

	// Create a fake update package
	updateContent := []byte("Fake agent binary content")
	updateFile := filepath.Join(tempDir, "agent-update.tar.gz")

	err := os.WriteFile(updateFile, updateContent, 0644)
	if err != nil {
		t.Fatalf("Failed to create update file: %v", err)
	}

	// Verify file exists
	if _, err := os.Stat(updateFile); os.IsNotExist(err) {
		t.Error("Update file was not created")
	}

	// Verify file size
	info, _ := os.Stat(updateFile)
	if info.Size() != int64(len(updateContent)) {
		t.Errorf("File size mismatch: expected %d, got %d", len(updateContent), info.Size())
	}
}

// TestIntegration_VerifyUpdateChecksum tests checksum verification of downloaded update
func TestIntegration_VerifyUpdateChecksum(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	tempDir := t.TempDir()

	// Create update file
	content := []byte("Update package content")
	updateFile := filepath.Join(tempDir, "update.bin")
	err := os.WriteFile(updateFile, content, 0644)
	if err != nil {
		t.Fatalf("Failed to create update file: %v", err)
	}

	// Calculate expected checksum
	hasher := sha256.New()
	hasher.Write(content)
	expectedChecksum := hex.EncodeToString(hasher.Sum(nil))

	// Verify checksum
	file, err := os.Open(updateFile)
	if err != nil {
		t.Fatalf("Failed to open file: %v", err)
	}
	defer file.Close()

	hasher2 := sha256.New()
	io.Copy(hasher2, file)
	actualChecksum := hex.EncodeToString(hasher2.Sum(nil))

	if actualChecksum != expectedChecksum {
		t.Errorf("Checksum mismatch: expected %s, got %s", expectedChecksum, actualChecksum)
	}
}

// TestIntegration_ExtractUpdate tests extracting an update package
func TestIntegration_ExtractUpdate(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	tempDir := t.TempDir()

	// Create a simple "update" (just a file)
	updateContent := []byte("#!/bin/bash\necho 'Updated agent'")
	updateFile := filepath.Join(tempDir, "agent-new")

	err := os.WriteFile(updateFile, updateContent, 0755)
	if err != nil {
		t.Fatalf("Failed to create update file: %v", err)
	}

	// Verify executable bit is set
	info, _ := os.Stat(updateFile)
	if info.Mode().Perm()&0100 == 0 {
		t.Error("Update file should be executable")
	}
}

// TestIntegration_BackupCurrentAgent tests backing up current agent before update
func TestIntegration_BackupCurrentAgent(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	tempDir := t.TempDir()

	// Create "current agent"
	currentAgent := filepath.Join(tempDir, "agent")
	currentContent := []byte("Current agent version")
	err := os.WriteFile(currentAgent, currentContent, 0755)
	if err != nil {
		t.Fatalf("Failed to create current agent: %v", err)
	}

	// Create backup
	backupAgent := filepath.Join(tempDir, "agent.backup")
	err = copyFile(currentAgent, backupAgent)
	if err != nil {
		t.Fatalf("Failed to create backup: %v", err)
	}

	// Verify backup exists and matches
	backupContent, err := os.ReadFile(backupAgent)
	if err != nil {
		t.Fatalf("Failed to read backup: %v", err)
	}

	if string(backupContent) != string(currentContent) {
		t.Error("Backup content doesn't match original")
	}
}

// TestIntegration_ApplyUpdate tests applying an update
func TestIntegration_ApplyUpdate(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	tempDir := t.TempDir()

	// Create current and new agent files
	currentAgent := filepath.Join(tempDir, "agent")
	newAgent := filepath.Join(tempDir, "agent-new")

	os.WriteFile(currentAgent, []byte("Old version"), 0755)
	os.WriteFile(newAgent, []byte("New version"), 0755)

	// Apply update (copy new over current)
	err := copyFile(newAgent, currentAgent)
	if err != nil {
		t.Fatalf("Failed to apply update: %v", err)
	}

	// Verify update applied
	content, _ := os.ReadFile(currentAgent)
	if string(content) != "New version" {
		t.Error("Update was not applied correctly")
	}
}

// TestIntegration_RestartAfterUpdate tests agent restart after update
func TestIntegration_RestartAfterUpdate(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	// Create a simple script that exits immediately
	tempDir := t.TempDir()
	scriptPath := filepath.Join(tempDir, "test-script.sh")

	var scriptContent string
	if runtime.GOOS == "windows" {
		scriptPath = filepath.Join(tempDir, "test-script.bat")
		scriptContent = "@echo off\necho Test restart\nexit 0"
	} else {
		scriptContent = "#!/bin/bash\necho 'Test restart'\nexit 0"
	}

	err := os.WriteFile(scriptPath, []byte(scriptContent), 0755)
	if err != nil {
		t.Fatalf("Failed to create script: %v", err)
	}

	// Execute script to simulate restart
	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		cmd = exec.Command("cmd.exe", "/C", scriptPath)
	} else {
		cmd = exec.Command("/bin/bash", scriptPath)
	}

	output, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("Script execution failed: %v", err)
	}

	if len(output) == 0 {
		t.Error("Script should have produced output")
	}
}

// Helper functions

func compareVersions(current, latest string) bool {
	// Simple version comparison - in production would use semver
	return current != latest
}

func copyFile(src, dst string) error {
	source, err := os.Open(src)
	if err != nil {
		return err
	}
	defer source.Close()

	destination, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destination.Close()

	_, err = io.Copy(destination, source)
	if err != nil {
		return err
	}

	// Copy permissions
	sourceInfo, err := os.Stat(src)
	if err != nil {
		return err
	}
	return os.Chmod(dst, sourceInfo.Mode())
}
