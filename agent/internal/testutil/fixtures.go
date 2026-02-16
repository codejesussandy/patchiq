package testutil

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/patchify/agent/internal/models"
)

// CreateTempDir creates a temporary directory for tests
func CreateTempDir(t *testing.T, prefix string) string {
	dir, err := os.MkdirTemp("", prefix)
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	t.Cleanup(func() {
		os.RemoveAll(dir)
	})
	return dir
}

// CreateTempFile creates a temporary file with content
func CreateTempFile(t *testing.T, dir, name, content string) string {
	path := filepath.Join(dir, name)
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		t.Fatalf("Failed to create temp file: %v", err)
	}
	return path
}

// CreateTempScript creates an executable script file
func CreateTempScript(t *testing.T, dir, name, content string) string {
	path := filepath.Join(dir, name)
	if err := os.WriteFile(path, []byte(content), 0755); err != nil {
		t.Fatalf("Failed to create temp script: %v", err)
	}
	return path
}

// SamplePackageManifest returns sample package manifest JSON
func SamplePackageManifest() string {
	return `{
	"name": "test-package",
	"version": "1.0.0",
	"description": "Test package for unit tests",
	"vendor": "Test Vendor",
	"checksum": "abc123def456"
}`
}

// SampleInventoryData returns sample inventory data
func SampleInventoryData() map[string]interface{} {
	return map[string]interface{}{
		"hostname":     "test-host",
		"os":           "TestOS",
		"version":      "1.0",
		"architecture": "x86_64",
		"software":     []string{"pkg1", "pkg2", "pkg3"},
	}
}

// SampleSoftwarePackage returns a sample software package
func SampleSoftwarePackage() models.SoftwarePackage {
	return models.SoftwarePackage{
		Name:    "test-package",
		Version: "1.0.0",
		Source:  "winget",
		Silent:  true,
	}
}

// SamplePatchOptions returns sample patch options
func SamplePatchOptions() models.PatchOptions {
	return models.PatchOptions{
		Force:       false,
		AllowReboot: false,
	}
}

// SampleExecutionResult returns a sample successful execution result
func SampleExecutionResult() models.ExecutionResult {
	return models.ExecutionResult{
		Success:  true,
		Message:  "Operation completed successfully",
		ExitCode: 0,
		Duration: 1000,
	}
}

// SampleErrorResult returns a sample error execution result
func SampleErrorResult(errorCode string) models.ExecutionResult {
	return models.ExecutionResult{
		Success:      false,
		Message:      "Operation failed",
		ErrorMessage: "An error occurred",
		ErrorCode:    errorCode,
		Retryable:    models.IsRetryableError(errorCode),
		ExitCode:     1,
		Duration:     500,
	}
}

// WaitForCondition waits for a condition to become true with timeout
func WaitForCondition(timeout time.Duration, check func() bool) bool {
	deadline := time.Now().Add(timeout)
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()

	for {
		if check() {
			return true
		}
		if time.Now().After(deadline) {
			return false
		}
		<-ticker.C
	}
}

// SampleBundleManifest returns a sample bundle manifest for script executor tests
func SampleBundleManifest() string {
	return `{
	"name": "test-bundle",
	"version": "1.0.0",
	"description": "Test bundle for integration tests",
	"vendor": "Test Vendor",
	"scripts": {
		"install": "install.sh",
		"uninstall": "uninstall.sh",
		"update": "update.sh",
		"rollback": "rollback.sh"
	},
	"checksum": "test-checksum-123"
}`
}

// SampleInstallScript returns a sample installation script
func SampleInstallScript() string {
	return `#!/bin/bash
echo "Installing test package..."
exit 0
`
}

// SampleUninstallScript returns a sample uninstallation script
func SampleUninstallScript() string {
	return `#!/bin/bash
echo "Uninstalling test package..."
exit 0
`
}

// SampleUpdateScript returns a sample update script
func SampleUpdateScript() string {
	return `#!/bin/bash
echo "Updating test package..."
exit 0
`
}

// SampleRollbackScript returns a sample rollback script
func SampleRollbackScript() string {
	return `#!/bin/bash
echo "Rolling back test package..."
exit 0
`
}

// SampleFailingScript returns a script that exits with error
func SampleFailingScript() string {
	return `#!/bin/bash
echo "This script will fail"
exit 1
`
}

// CreateTestBundle creates a complete test bundle with scripts
func CreateTestBundle(t *testing.T, dir string) string {
	bundleDir := filepath.Join(dir, "test-bundle")
	if err := os.MkdirAll(bundleDir, 0755); err != nil {
		t.Fatalf("Failed to create bundle dir: %v", err)
	}

	// Create manifest
	CreateTempFile(t, bundleDir, "manifest.json", SampleBundleManifest())

	// Create scripts
	CreateTempScript(t, bundleDir, "install.sh", SampleInstallScript())
	CreateTempScript(t, bundleDir, "uninstall.sh", SampleUninstallScript())
	CreateTempScript(t, bundleDir, "update.sh", SampleUpdateScript())
	CreateTempScript(t, bundleDir, "rollback.sh", SampleRollbackScript())

	return bundleDir
}

// SampleHeartbeatResponse returns a sample heartbeat API response
func SampleHeartbeatResponse() string {
	return `{
	"success": true,
	"data": {
		"timestamp": "2026-02-14T12:00:00Z",
		"nextHeartbeat": 60
	}
}`
}

// SampleCommandResponse returns a sample pending command API response
func SampleCommandResponse(commandType string) string {
	return `{
	"success": true,
	"data": [
		{
			"id": "cmd-123",
			"type": "` + commandType + `",
			"payload": {},
			"createdAt": "2026-02-14T12:00:00Z"
		}
	]
}`
}

// SampleInventorySubmissionResponse returns a sample inventory submission API response
func SampleInventorySubmissionResponse() string {
	return `{
	"success": true,
	"data": {
		"inventoryId": "inv-123",
		"receivedAt": "2026-02-14T12:00:00Z"
	}
}`
}

// SampleRegistrationResponse returns a sample agent registration API response
func SampleRegistrationResponse() string {
	return `{
	"success": true,
	"data": {
		"agentId": "agent-123",
		"accessToken": "access-token-abc",
		"refreshToken": "refresh-token-xyz",
		"expiresIn": 3600
	}
}`
}

// SampleTokenRefreshResponse returns a sample token refresh API response
func SampleTokenRefreshResponse() string {
	return `{
	"success": true,
	"data": {
		"accessToken": "new-access-token",
		"refreshToken": "new-refresh-token",
		"expiresIn": 3600
	}
}`
}
