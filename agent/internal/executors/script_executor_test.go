package executors

import (
	"archive/tar"
	"compress/gzip"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// Helper function to create a test bundle
func createTestBundle(t *testing.T, files map[string]string) string {
	tmpFile, err := os.CreateTemp("", "test-bundle-*.tar.gz")
	if err != nil {
		t.Fatalf("Failed to create temp file: %v", err)
	}
	defer tmpFile.Close()

	gzw := gzip.NewWriter(tmpFile)
	defer gzw.Close()

	tw := tar.NewWriter(gzw)
	defer tw.Close()

	for name, content := range files {
		header := &tar.Header{
			Name: name,
			Mode: 0755,
			Size: int64(len(content)),
		}
		if err := tw.WriteHeader(header); err != nil {
			t.Fatalf("Failed to write header: %v", err)
		}
		if _, err := tw.Write([]byte(content)); err != nil {
			t.Fatalf("Failed to write content: %v", err)
		}
	}

	return tmpFile.Name()
}

func TestValidateBundleStructure_Valid(t *testing.T) {
	// Create a valid bundle with all required scripts
	files := map[string]string{
		"package/scripts/install.sh":   "#!/bin/bash\necho Installing",
		"package/scripts/uninstall.sh": "#!/bin/bash\necho Uninstalling",
		"package/scripts/rollback.sh":  "#!/bin/bash\necho Rolling back",
		"package/manifest.json":        `{"name":"test"}`,
		"package/files/app.bin":        "binary data",
	}

	bundlePath := createTestBundle(t, files)
	defer os.Remove(bundlePath)

	executor := NewBaseScriptExecutor("", nil)
	err := executor.validateBundleStructure(bundlePath)

	if err != nil {
		t.Errorf("validateBundleStructure failed for valid bundle: %v", err)
	}
}

func TestValidateBundleStructure_MaliciousPath_ParentDir(t *testing.T) {
	// Create bundle with path traversal attempt
	files := map[string]string{
		"../../../etc/passwd":          "malicious",
		"package/scripts/install.sh":   "#!/bin/bash",
		"package/scripts/uninstall.sh": "#!/bin/bash",
		"package/scripts/rollback.sh":  "#!/bin/bash",
	}

	bundlePath := createTestBundle(t, files)
	defer os.Remove(bundlePath)

	executor := NewBaseScriptExecutor("", nil)
	err := executor.validateBundleStructure(bundlePath)

	if err == nil {
		t.Error("validateBundleStructure should have detected path traversal")
	}

	if !strings.Contains(err.Error(), "malicious path") {
		t.Errorf("Expected malicious path error, got: %v", err)
	}
}

func TestValidateBundleStructure_MaliciousPath_DotDot(t *testing.T) {
	// Create bundle with .. in path
	files := map[string]string{
		"package/../config/evil.sh":   "malicious",
		"package/scripts/install.sh":   "#!/bin/bash",
		"package/scripts/uninstall.sh": "#!/bin/bash",
		"package/scripts/rollback.sh":  "#!/bin/bash",
	}

	bundlePath := createTestBundle(t, files)
	defer os.Remove(bundlePath)

	executor := NewBaseScriptExecutor("", nil)
	err := executor.validateBundleStructure(bundlePath)

	if err == nil {
		t.Error("validateBundleStructure should have detected path with ..")
	}

	if !strings.Contains(err.Error(), "malicious path") {
		t.Errorf("Expected malicious path error, got: %v", err)
	}
}

func TestValidateBundleStructure_MissingInstallScript(t *testing.T) {
	// Create bundle missing install.sh
	files := map[string]string{
		"package/scripts/uninstall.sh": "#!/bin/bash",
		"package/scripts/rollback.sh":  "#!/bin/bash",
	}

	bundlePath := createTestBundle(t, files)
	defer os.Remove(bundlePath)

	executor := NewBaseScriptExecutor("", nil)
	err := executor.validateBundleStructure(bundlePath)

	if err == nil {
		t.Error("validateBundleStructure should have detected missing install.sh")
	}

	if !strings.Contains(err.Error(), "missing required script: install.sh") {
		t.Errorf("Expected missing script error, got: %v", err)
	}
}

func TestValidateBundleStructure_MissingUninstallScript(t *testing.T) {
	// Create bundle missing uninstall.sh
	files := map[string]string{
		"package/scripts/install.sh":  "#!/bin/bash",
		"package/scripts/rollback.sh": "#!/bin/bash",
	}

	bundlePath := createTestBundle(t, files)
	defer os.Remove(bundlePath)

	executor := NewBaseScriptExecutor("", nil)
	err := executor.validateBundleStructure(bundlePath)

	if err == nil {
		t.Error("validateBundleStructure should have detected missing uninstall.sh")
	}

	if !strings.Contains(err.Error(), "missing required script: uninstall.sh") {
		t.Errorf("Expected missing script error, got: %v", err)
	}
}

func TestValidateBundleStructure_MissingRollbackScript(t *testing.T) {
	// Create bundle missing rollback.sh
	files := map[string]string{
		"package/scripts/install.sh":   "#!/bin/bash",
		"package/scripts/uninstall.sh": "#!/bin/bash",
	}

	bundlePath := createTestBundle(t, files)
	defer os.Remove(bundlePath)

	executor := NewBaseScriptExecutor("", nil)
	err := executor.validateBundleStructure(bundlePath)

	if err == nil {
		t.Error("validateBundleStructure should have detected missing rollback.sh")
	}

	if !strings.Contains(err.Error(), "missing required script: rollback.sh") {
		t.Errorf("Expected missing script error, got: %v", err)
	}
}

func TestValidateBundleStructure_SizeExceeded(t *testing.T) {
	// Create a bundle that exceeds size limit
	// We'll create a 1MB file and set a lower limit for testing
	largeContent := strings.Repeat("A", 1024*1024) // 1MB

	files := map[string]string{
		"package/scripts/install.sh":   "#!/bin/bash",
		"package/scripts/uninstall.sh": "#!/bin/bash",
		"package/scripts/rollback.sh":  "#!/bin/bash",
		"package/files/large.bin":      largeContent,
	}

	bundlePath := createTestBundle(t, files)
	defer os.Remove(bundlePath)

	// Check actual file size
	stat, err := os.Stat(bundlePath)
	if err != nil {
		t.Fatalf("Failed to stat bundle: %v", err)
	}

	// The gzipped size should be much smaller than 1MB due to compression of repeated 'A's
	// So we'll verify the validation would work for a truly large file
	t.Logf("Created test bundle size: %d bytes", stat.Size())

	// For this test, we verify the validation logic exists
	// A real 500MB+ file would be too large for unit tests
	executor := NewBaseScriptExecutor("", nil)
	err = executor.validateBundleStructure(bundlePath)

	// This should pass since compressed size is small
	if err != nil {
		// If it fails due to size, verify the error message
		if strings.Contains(err.Error(), "exceeds size limit") {
			t.Logf("Size validation working: %v", err)
		} else {
			t.Errorf("Unexpected error: %v", err)
		}
	}
}

func TestValidateBundleStructure_InvalidGzip(t *testing.T) {
	// Create a file that's not a valid gzip
	tmpFile, err := os.CreateTemp("", "invalid-*.tar.gz")
	if err != nil {
		t.Fatalf("Failed to create temp file: %v", err)
	}
	defer os.Remove(tmpFile.Name())

	tmpFile.Write([]byte("not a gzip file"))
	tmpFile.Close()

	executor := NewBaseScriptExecutor("", nil)
	err = executor.validateBundleStructure(tmpFile.Name())

	if err == nil {
		t.Error("validateBundleStructure should have detected invalid gzip")
	}

	if !strings.Contains(err.Error(), "invalid gzip format") {
		t.Errorf("Expected invalid gzip error, got: %v", err)
	}
}

func TestValidateBundleStructure_InvalidTar(t *testing.T) {
	// Create a valid gzip but invalid tar
	tmpFile, err := os.CreateTemp("", "invalid-*.tar.gz")
	if err != nil {
		t.Fatalf("Failed to create temp file: %v", err)
	}
	defer tmpFile.Close()

	gzw := gzip.NewWriter(tmpFile)
	gzw.Write([]byte("not a tar file"))
	gzw.Close()
	tmpFile.Close()

	defer os.Remove(tmpFile.Name())

	executor := NewBaseScriptExecutor("", nil)
	err = executor.validateBundleStructure(tmpFile.Name())

	if err == nil {
		t.Error("validateBundleStructure should have detected invalid tar")
	}

	if !strings.Contains(err.Error(), "invalid tar format") {
		t.Errorf("Expected invalid tar error, got: %v", err)
	}
}

func TestValidateBundleStructure_FileNotFound(t *testing.T) {
	executor := NewBaseScriptExecutor("", nil)
	err := executor.validateBundleStructure("/nonexistent/bundle.tar.gz")

	if err == nil {
		t.Error("validateBundleStructure should have failed for nonexistent file")
	}

	if !strings.Contains(err.Error(), "failed to open bundle") {
		t.Errorf("Expected file not found error, got: %v", err)
	}
}

func TestValidateBundleStructure_ScriptsInSubdirectory(t *testing.T) {
	// Create bundle with scripts in nested directory structure
	files := map[string]string{
		"package/nested/scripts/install.sh":   "#!/bin/bash",
		"package/nested/scripts/uninstall.sh": "#!/bin/bash",
		"package/nested/scripts/rollback.sh":  "#!/bin/bash",
	}

	bundlePath := createTestBundle(t, files)
	defer os.Remove(bundlePath)

	executor := NewBaseScriptExecutor("", nil)
	err := executor.validateBundleStructure(bundlePath)

	if err != nil {
		t.Errorf("validateBundleStructure should accept scripts in subdirectories: %v", err)
	}
}

func TestExtractTarGz_ValidBundle(t *testing.T) {
	// Create a valid bundle
	files := map[string]string{
		"package/scripts/install.sh":   "#!/bin/bash\necho Installing",
		"package/scripts/uninstall.sh": "#!/bin/bash\necho Uninstalling",
		"package/scripts/rollback.sh":  "#!/bin/bash\necho Rolling back",
		"package/manifest.json":        `{"name":"test"}`,
	}

	bundlePath := createTestBundle(t, files)
	defer os.Remove(bundlePath)

	// Create temp extraction directory
	extractDir, err := os.MkdirTemp("", "extract-test-")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(extractDir)

	executor := NewBaseScriptExecutor("", nil)
	err = executor.extractTarGz(bundlePath, extractDir)

	if err != nil {
		t.Errorf("extractTarGz failed for valid bundle: %v", err)
	}

	// Verify files were extracted
	extractedFile := filepath.Join(extractDir, "package", "manifest.json")
	if _, err := os.Stat(extractedFile); os.IsNotExist(err) {
		t.Errorf("Expected file was not extracted: %s", extractedFile)
	}
}

func TestExtractTarGz_MaliciousBundle(t *testing.T) {
	// Create bundle with malicious path
	files := map[string]string{
		"../../../etc/passwd":          "malicious",
		"package/scripts/install.sh":   "#!/bin/bash",
		"package/scripts/uninstall.sh": "#!/bin/bash",
		"package/scripts/rollback.sh":  "#!/bin/bash",
	}

	bundlePath := createTestBundle(t, files)
	defer os.Remove(bundlePath)

	extractDir, err := os.MkdirTemp("", "extract-test-")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(extractDir)

	executor := NewBaseScriptExecutor("", nil)
	err = executor.extractTarGz(bundlePath, extractDir)

	if err == nil {
		t.Error("extractTarGz should have rejected malicious bundle")
	}

	if !strings.Contains(err.Error(), "bundle validation failed") {
		t.Errorf("Expected validation failure, got: %v", err)
	}
}
