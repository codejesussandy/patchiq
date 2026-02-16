package integration

import (
	"archive/tar"
	"compress/gzip"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/patchify/agent/internal/executors"
)

// TestIntegration_CreateBundle tests creating a test bundle
func TestIntegration_CreateBundle(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	bundleDir := t.TempDir()

	// Create test scripts
	scripts := map[string]string{
		"install.sh":   "#!/bin/bash\necho 'Installation complete'",
		"uninstall.sh": "#!/bin/bash\necho 'Uninstallation complete'",
		"update.sh":    "#!/bin/bash\necho 'Update complete'",
		"rollback.sh":  "#!/bin/bash\necho 'Rollback complete'",
	}

	for name, content := range scripts {
		path := filepath.Join(bundleDir, name)
		err := os.WriteFile(path, []byte(content), 0755)
		if err != nil {
			t.Fatalf("Failed to write script %s: %v", name, err)
		}
	}

	// Verify all files created
	for name := range scripts {
		path := filepath.Join(bundleDir, name)
		if _, err := os.Stat(path); os.IsNotExist(err) {
			t.Errorf("Script %s was not created", name)
		}
	}
}

// TestIntegration_BundleCreationAndExtraction tests creating and extracting a tarball
func TestIntegration_BundleCreationAndExtraction(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	// Create bundle
	bundleDir := t.TempDir()
	tarFile := filepath.Join(bundleDir, "test-bundle.tar.gz")

	// Create test content
	contentDir := filepath.Join(bundleDir, "content")
	os.MkdirAll(contentDir, 0755)
	testFile := filepath.Join(contentDir, "install.sh")
	testContent := "#!/bin/bash\necho 'test'"
	os.WriteFile(testFile, []byte(testContent), 0755)

	// Create tarball
	err := createTarball(tarFile, contentDir)
	if err != nil {
		t.Fatalf("Failed to create tarball: %v", err)
	}

	// Extract it
	extractDir := filepath.Join(bundleDir, "extracted")
	os.MkdirAll(extractDir, 0755)

	err = extractTarball(tarFile, extractDir)
	if err != nil {
		t.Fatalf("Failed to extract tarball: %v", err)
	}

	// Verify extracted content
	extractedFile := filepath.Join(extractDir, "install.sh")
	content, err := os.ReadFile(extractedFile)
	if err != nil {
		t.Fatalf("Failed to read extracted file: %v", err)
	}

	if string(content) != testContent {
		t.Errorf("Extracted content doesn't match: expected %q, got %q", testContent, string(content))
	}
}

// TestIntegration_ChecksumVerification tests checksum calculation and verification
func TestIntegration_ChecksumVerification(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	tempDir := t.TempDir()
	testFile := filepath.Join(tempDir, "test.txt")
	content := []byte("Test content for checksum")

	err := os.WriteFile(testFile, content, 0644)
	if err != nil {
		t.Fatalf("Failed to write test file: %v", err)
	}

	// Calculate checksum
	checksum, err := calculateFileChecksum(testFile)
	if err != nil {
		t.Fatalf("Failed to calculate checksum: %v", err)
	}

	// Verify it's not empty
	if checksum == "" {
		t.Error("Checksum should not be empty")
	}

	// Calculate again - should match
	checksum2, err := calculateFileChecksum(testFile)
	if err != nil {
		t.Fatalf("Failed to calculate checksum second time: %v", err)
	}

	if checksum != checksum2 {
		t.Errorf("Checksums don't match: %s != %s", checksum, checksum2)
	}

	// Modify file - checksum should change
	os.WriteFile(testFile, []byte("Different content"), 0644)
	checksum3, _ := calculateFileChecksum(testFile)

	if checksum == checksum3 {
		t.Error("Checksum should change when file content changes")
	}
}

// TestIntegration_ScriptExecution tests executing a bundle script
func TestIntegration_ScriptExecution(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	bundleDir := t.TempDir()

	// Create install script
	scriptPath := filepath.Join(bundleDir, "install.sh")
	scriptContent := "#!/bin/bash\necho 'Installation successful'\nexit 0"

	err := os.WriteFile(scriptPath, []byte(scriptContent), 0755)
	if err != nil {
		t.Fatalf("Failed to write script: %v", err)
	}

	// Execute script
	executor := executors.NewScriptExecutor()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	result := executor.ExecuteScript(ctx, bundleDir, "install.sh")

	if !result.Success {
		t.Errorf("Script execution failed: %s", result.ErrorMessage)
	}

	if result.ExitCode != 0 {
		t.Errorf("Expected exit code 0, got %d", result.ExitCode)
	}
}

// TestIntegration_FailedScriptExecution tests handling of failed script execution
func TestIntegration_FailedScriptExecution(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	bundleDir := t.TempDir()

	// Create failing script
	scriptPath := filepath.Join(bundleDir, "install.sh")
	scriptContent := "#!/bin/bash\necho 'Error occurred'\nexit 1"

	err := os.WriteFile(scriptPath, []byte(scriptContent), 0755)
	if err != nil {
		t.Fatalf("Failed to write script: %v", err)
	}

	// Execute script
	executor := executors.NewScriptExecutor()
	ctx := context.Background()

	result := executor.ExecuteScript(ctx, bundleDir, "install.sh")

	if result.Success {
		t.Error("Script should have failed")
	}

	if result.ExitCode == 0 {
		t.Error("Exit code should be non-zero for failed script")
	}
}

// TestIntegration_ScriptTimeout tests script execution timeout
func TestIntegration_ScriptTimeout(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	bundleDir := t.TempDir()

	// Create long-running script
	scriptPath := filepath.Join(bundleDir, "install.sh")
	scriptContent := "#!/bin/bash\nsleep 30"

	err := os.WriteFile(scriptPath, []byte(scriptContent), 0755)
	if err != nil {
		t.Fatalf("Failed to write script: %v", err)
	}

	// Execute with short timeout
	executor := executors.NewScriptExecutor()
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	result := executor.ExecuteScript(ctx, bundleDir, "install.sh")

	if result.Success {
		t.Error("Script should have timed out")
	}
}

// TestIntegration_MultiStepDeployment tests a complete deployment workflow
func TestIntegration_MultiStepDeployment(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	bundleDir := t.TempDir()

	// Create all required scripts
	scripts := map[string]string{
		"install.sh":   "#!/bin/bash\necho 'Installed' > /tmp/deployment-test-state.txt",
		"update.sh":    "#!/bin/bash\necho 'Updated' >> /tmp/deployment-test-state.txt",
		"rollback.sh":  "#!/bin/bash\nrm -f /tmp/deployment-test-state.txt",
		"uninstall.sh": "#!/bin/bash\nrm -f /tmp/deployment-test-state.txt",
	}

	for name, content := range scripts {
		path := filepath.Join(bundleDir, name)
		err := os.WriteFile(path, []byte(content), 0755)
		if err != nil {
			t.Fatalf("Failed to write script %s: %v", name, err)
		}
	}

	executor := executors.NewScriptExecutor()
	ctx := context.Background()

	// Step 1: Install
	result := executor.ExecuteScript(ctx, bundleDir, "install.sh")
	if !result.Success {
		t.Fatalf("Install failed: %s", result.ErrorMessage)
	}

	// Step 2: Update
	result = executor.ExecuteScript(ctx, bundleDir, "update.sh")
	if !result.Success {
		t.Fatalf("Update failed: %s", result.ErrorMessage)
	}

	// Step 3: Rollback (cleanup)
	result = executor.ExecuteScript(ctx, bundleDir, "rollback.sh")
	if !result.Success {
		t.Fatalf("Rollback failed: %s", result.ErrorMessage)
	}
}

// Helper function to create a tarball
func createTarball(tarPath, sourceDir string) error {
	file, err := os.Create(tarPath)
	if err != nil {
		return err
	}
	defer file.Close()

	gzWriter := gzip.NewWriter(file)
	defer gzWriter.Close()

	tarWriter := tar.NewWriter(gzWriter)
	defer tarWriter.Close()

	return filepath.Walk(sourceDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if info.IsDir() {
			return nil
		}

		header, err := tar.FileInfoHeader(info, "")
		if err != nil {
			return err
		}

		relPath, err := filepath.Rel(sourceDir, path)
		if err != nil {
			return err
		}
		header.Name = relPath

		if err := tarWriter.WriteHeader(header); err != nil {
			return err
		}

		file, err := os.Open(path)
		if err != nil {
			return err
		}
		defer file.Close()

		_, err = io.Copy(tarWriter, file)
		return err
	})
}

// Helper function to extract a tarball
func extractTarball(tarPath, destDir string) error {
	file, err := os.Open(tarPath)
	if err != nil {
		return err
	}
	defer file.Close()

	gzReader, err := gzip.NewReader(file)
	if err != nil {
		return err
	}
	defer gzReader.Close()

	tarReader := tar.NewReader(gzReader)

	for {
		header, err := tarReader.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}

		path := filepath.Join(destDir, header.Name)

		switch header.Typeflag {
		case tar.TypeDir:
			os.MkdirAll(path, 0755)
		case tar.TypeReg:
			os.MkdirAll(filepath.Dir(path), 0755)
			outFile, err := os.Create(path)
			if err != nil {
				return err
			}
			if _, err := io.Copy(outFile, tarReader); err != nil {
				outFile.Close()
				return err
			}
			outFile.Close()
		}
	}

	return nil
}

// Helper function to calculate file checksum
func calculateFileChecksum(filePath string) (string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	hasher := sha256.New()
	if _, err := io.Copy(hasher, file); err != nil {
		return "", err
	}

	return hex.EncodeToString(hasher.Sum(nil)), nil
}
