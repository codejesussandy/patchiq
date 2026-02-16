package e2e

import (
	"context"
	"os"
	"runtime"
	"testing"
	"time"

	"github.com/patchify/agent/internal/executors"
	"github.com/patchify/agent/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestDeploymentWindows tests Windows package managers
func TestDeploymentWindows(t *testing.T) {
	if runtime.GOOS != "windows" {
		t.Skip("Windows only test")
	}

	ctx := context.Background()
	executor := executors.NewExecutorManager(&executors.DownloadConfig{})

	t.Run("winget install and uninstall", func(t *testing.T) {
		pkg := models.SoftwarePackage{
			Name:   "7zip.7zip",
			Source: "winget",
			Silent: true,
		}

		// Install
		result := executor.Software().InstallSoftware(ctx, pkg)
		require.True(t, result.Success, "Installation should succeed: %s", result.ErrorMessage)
		assert.Contains(t, result.Message, "Success", "Should indicate success")

		// Verify installation
		version, err := executor.Software().GetInstalledVersion(ctx, "7zip.7zip")
		assert.NoError(t, err, "Should find installed package")
		assert.NotEmpty(t, version, "Should return version")

		// Uninstall
		uninstallResult := executor.Software().UninstallSoftware(ctx, "7zip.7zip")
		require.True(t, uninstallResult.Success, "Uninstall should succeed: %s", uninstallResult.ErrorMessage)

		// Verify removal
		_, err = executor.Software().GetInstalledVersion(ctx, "7zip.7zip")
		assert.Error(t, err, "Package should no longer be installed")
	})
}

// TestDeploymentLinux tests Linux package managers
func TestDeploymentLinux(t *testing.T) {
	if runtime.GOOS != "linux" {
		t.Skip("Linux only test")
	}

	ctx := context.Background()
	executor := executors.NewExecutorManager(&executors.DownloadConfig{})

	// Detect package manager
	var pkgManager string
	if _, err := os.Stat("/etc/debian_version"); err == nil {
		pkgManager = "apt"
	} else if _, err := os.Stat("/etc/redhat-release"); err == nil {
		if _, err := os.Stat("/usr/bin/dnf"); err == nil {
			pkgManager = "dnf"
		} else {
			pkgManager = "yum"
		}
	} else {
		t.Skip("Unsupported Linux distribution")
	}

	t.Run(pkgManager+" install and uninstall", func(t *testing.T) {
		// Use a small, safe package for testing
		packageName := "curl"

		pkg := models.SoftwarePackage{
			Name:   packageName,
			Source: pkgManager,
		}

		// Check if already installed
		initialVersion, _ := executor.Software().GetInstalledVersion(ctx, packageName)
		wasInstalled := initialVersion != ""

		// If not installed, install it
		if !wasInstalled {
			result := executor.Software().InstallSoftware(ctx, pkg)
			if !result.Success && result.ErrorCode == models.ErrPermissionDenied {
				t.Skip("Test requires root/sudo privileges")
			}
			require.True(t, result.Success, "Installation should succeed: %s", result.ErrorMessage)

			// Verify installation
			version, err := executor.Software().GetInstalledVersion(ctx, packageName)
			assert.NoError(t, err, "Should find installed package")
			assert.NotEmpty(t, version, "Should return version")
		}

		// Uninstall
		uninstallResult := executor.Software().UninstallSoftware(ctx, packageName)
		if !uninstallResult.Success && uninstallResult.ErrorCode == models.ErrPermissionDenied {
			t.Skip("Test requires root/sudo privileges")
		}
		require.True(t, uninstallResult.Success, "Uninstall should succeed: %s", uninstallResult.ErrorMessage)

		// Verify removal
		_, err := executor.Software().GetInstalledVersion(ctx, packageName)
		assert.Error(t, err, "Package should no longer be installed")

		// Restore if it was installed before
		if wasInstalled {
			executor.Software().InstallSoftware(ctx, pkg)
		}
	})
}

// TestDeploymentMacOS tests macOS package managers
func TestDeploymentMacOS(t *testing.T) {
	if runtime.GOOS != "darwin" {
		t.Skip("macOS only test")
	}

	ctx := context.Background()
	executor := executors.NewExecutorManager(&executors.DownloadConfig{})

	t.Run("brew install and uninstall", func(t *testing.T) {
		// Use a small, safe package for testing
		packageName := "wget"

		pkg := models.SoftwarePackage{
			Name:   packageName,
			Source: "brew",
		}

		// Check if already installed
		initialVersion, _ := executor.Software().GetInstalledVersion(ctx, packageName)
		wasInstalled := initialVersion != ""

		// If not installed, install it
		if !wasInstalled {
			result := executor.Software().InstallSoftware(ctx, pkg)
			if !result.Success && result.ErrorCode == models.ErrDependencyMissing {
				t.Skip("Homebrew not installed")
			}
			require.True(t, result.Success, "Installation should succeed: %s", result.ErrorMessage)

			// Verify installation
			version, err := executor.Software().GetInstalledVersion(ctx, packageName)
			assert.NoError(t, err, "Should find installed package")
			assert.NotEmpty(t, version, "Should return version")
		}

		// Uninstall
		uninstallResult := executor.Software().UninstallSoftware(ctx, packageName)
		require.True(t, uninstallResult.Success, "Uninstall should succeed: %s", uninstallResult.ErrorMessage)

		// Verify removal
		_, err := executor.Software().GetInstalledVersion(ctx, packageName)
		assert.Error(t, err, "Package should no longer be installed")

		// Restore if it was installed before
		if wasInstalled {
			executor.Software().InstallSoftware(ctx, pkg)
		}
	})
}

// TestRollbackWorkflow tests the complete rollback workflow
func TestRollbackWorkflow(t *testing.T) {
	ctx := context.Background()
	executor := executors.NewExecutorManager(&executors.DownloadConfig{})

	// This test is cross-platform but uses different packages per platform
	var pkg models.SoftwarePackage

	switch runtime.GOOS {
	case "darwin":
		pkg = models.SoftwarePackage{
			Name:   "jq",
			Source: "brew",
		}
	case "linux":
		pkg = models.SoftwarePackage{
			Name:   "jq",
			Source: "apt", // Assuming debian-based
		}
	case "windows":
		pkg = models.SoftwarePackage{
			Name:   "jq",
			Source: "winget",
		}
	default:
		t.Skip("Unsupported platform")
	}

	// 1. Check if package is installed
	initialVersion, _ := executor.Software().GetInstalledVersion(ctx, pkg.Name)
	wasInstalled := initialVersion != ""

	// 2. Create rollback info before installation
	rollbackInfo, err := executor.Rollback().CreateRollbackInfoForInstall(
		ctx,
		pkg.Name,
		pkg.Source,
		"test-cmd-123",
		executor.Software(),
	)
	require.NoError(t, err, "Should create rollback info")

	// 3. Save rollback info
	err = executor.Rollback().SaveRollbackInfo(ctx, *rollbackInfo)
	require.NoError(t, err, "Should save rollback info")

	// 4. Install package (skip if already installed)
	if !wasInstalled {
		installResult := executor.Software().InstallSoftware(ctx, pkg)
		if !installResult.Success && (installResult.ErrorCode == models.ErrPermissionDenied || installResult.ErrorCode == models.ErrDependencyMissing) {
			t.Skip("Test requires privileges or dependencies")
		}
		require.True(t, installResult.Success, "Installation should succeed: %s", installResult.ErrorMessage)
	}

	// 5. Execute rollback
	rollbackResult := executor.Rollback().ExecuteRollback(ctx, rollbackInfo.ID, false)
	require.True(t, rollbackResult.Success, "Rollback should succeed: %s", rollbackResult.ErrorMessage)

	// 6. Verify rollback worked
	if wasInstalled {
		// Should still be installed but at previous version
		version, err := executor.Software().GetInstalledVersion(ctx, pkg.Name)
		assert.NoError(t, err, "Package should still be installed")
		if initialVersion != "" {
			assert.Equal(t, initialVersion, version, "Should be at original version")
		}
	} else {
		// Should be uninstalled
		_, err := executor.Software().GetInstalledVersion(ctx, pkg.Name)
		assert.Error(t, err, "Package should be uninstalled")
	}

	// 7. Verify rollback info was deleted
	_, err = executor.Rollback().GetRollbackInfo(ctx, rollbackInfo.ID)
	assert.Error(t, err, "Rollback info should be deleted after successful rollback")
}

// TestScriptBundleExecution tests hub-centric script bundle execution
func TestScriptBundleExecution(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping bundle execution test in short mode")
	}

	ctx := context.Background()
	executor := executors.NewExecutorManager(&executors.DownloadConfig{})

	// Create a simple inline script for testing
	var script string
	var operationType string = "install"
	var requiresRoot bool = false

	switch runtime.GOOS {
	case "windows":
		script = `
Write-Host "Test script execution on Windows"
$testFile = "$env:TEMP\patchiq-test.txt"
"Test content" | Out-File -FilePath $testFile
if (Test-Path $testFile) {
    Write-Host "File created successfully"
    exit 0
} else {
    Write-Host "Failed to create file"
    exit 1
}
`
	default: // Unix-like systems
		script = `
#!/bin/bash
echo "Test script execution on $(uname -s)"
TEST_FILE="/tmp/patchiq-test.txt"
echo "Test content" > "$TEST_FILE"
if [ -f "$TEST_FILE" ]; then
    echo "File created successfully"
    exit 0
else
    echo "Failed to create file"
    exit 1
fi
`
	}

	// Execute inline script
	result := executor.Script().ExecuteInlineScript(ctx, script, operationType, requiresRoot, nil)

	assert.True(t, result.Success, "Script execution should succeed: %s", result.ErrorMessage)
	assert.Contains(t, result.Output, "Test script execution", "Should contain script output")
	assert.Equal(t, 0, result.ExitCode, "Exit code should be 0")
}

// TestErrorHandling tests error classification and handling
func TestErrorHandling(t *testing.T) {
	ctx := context.Background()
	executor := executors.NewExecutorManager(&executors.DownloadConfig{})

	t.Run("package not found", func(t *testing.T) {
		pkg := models.SoftwarePackage{
			Name:   "nonexistent-package-12345",
			Source: "brew",
		}

		result := executor.Software().InstallSoftware(ctx, pkg)

		assert.False(t, result.Success, "Installation should fail")
		assert.NotEmpty(t, result.ErrorCode, "Should have error code")
		assert.False(t, result.Retryable, "Package not found errors should not be retryable")
	})

	t.Run("invalid rollback ID", func(t *testing.T) {
		result := executor.Rollback().ExecuteRollback(ctx, "invalid-id-123", false)

		assert.False(t, result.Success, "Rollback should fail")
		assert.Equal(t, models.ErrInvalidInput, result.ErrorCode, "Should be invalid input error")
		assert.False(t, result.Retryable, "Invalid input should not be retryable")
	})
}

// TestConcurrentOperations tests thread safety
func TestConcurrentOperations(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping concurrent operations test in short mode")
	}

	ctx := context.Background()
	executor := executors.NewExecutorManager(&executors.DownloadConfig{})

	// Test concurrent rollback info operations
	done := make(chan bool, 10)

	for i := 0; i < 10; i++ {
		go func(idx int) {
			defer func() { done <- true }()

			info := models.RollbackInfo{
				PackageName:      "test-concurrent",
				InstalledVersion: "1.0.0",
				WasInstalled:     false,
				InstallSource:    "test",
				InstalledAt:      time.Now().Format(time.RFC3339),
				SupportsRollback: true,
			}

			err := executor.Rollback().SaveRollbackInfo(ctx, info)
			assert.NoError(t, err, "Concurrent save should work")

			if info.ID != "" {
				_, err := executor.Rollback().GetRollbackInfo(ctx, info.ID)
				assert.NoError(t, err, "Concurrent get should work")

				err = executor.Rollback().DeleteRollbackInfo(ctx, info.ID)
				assert.NoError(t, err, "Concurrent delete should work")
			}
		}(i)
	}

	// Wait for all goroutines
	for i := 0; i < 10; i++ {
		<-done
	}
}

// TestPerformance tests basic performance metrics
func TestPerformance(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping performance test in short mode")
	}

	ctx := context.Background()
	executor := executors.NewExecutorManager(&executors.DownloadConfig{})

	// Test rollback info list performance
	start := time.Now()

	// Create 100 rollback entries
	for i := 0; i < 100; i++ {
		info := models.RollbackInfo{
			PackageName:      "test-perf",
			InstalledVersion: "1.0.0",
			WasInstalled:     false,
			InstallSource:    "test",
			InstalledAt:      time.Now().Format(time.RFC3339),
			SupportsRollback: true,
		}
		executor.Rollback().SaveRollbackInfo(ctx, info)
	}

	// List all
	list, err := executor.Rollback().ListRollbackInfo(ctx)
	assert.NoError(t, err, "List should succeed")

	duration := time.Since(start)
	t.Logf("Created and listed 100 rollback entries in %v", duration)

	// Should complete in reasonable time (< 1 second)
	assert.Less(t, duration, 1*time.Second, "Should be performant")

	// Cleanup
	for _, info := range list {
		if info.PackageName == "test-perf" {
			executor.Rollback().DeleteRollbackInfo(ctx, info.ID)
		}
	}
}
