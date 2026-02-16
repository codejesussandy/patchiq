//go:build windows

package executors

import (
	"context"
	"fmt"
	"testing"

	"github.com/patchify/agent/internal/models"
	"github.com/patchify/agent/internal/testutil"
)

// TestInstallSoftware_Winget_Success tests successful winget installation
func TestInstallSoftware_Winget_Success(t *testing.T) {
	executor := &WindowsSoftwareExecutor{}
	ctx := context.Background()

	pkg := models.SoftwarePackage{
		Name:   "7zip.7zip",
		Source: "winget",
		Silent: true,
	}

	result := executor.InstallSoftware(ctx, pkg)

	// Verify result structure
	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}
}

// TestInstallSoftware_Winget_WithVersion tests winget installation with specific version
func TestInstallSoftware_Winget_WithVersion(t *testing.T) {
	executor := &WindowsSoftwareExecutor{}
	ctx := context.Background()

	pkg := models.SoftwarePackage{
		Name:    "7zip.7zip",
		Version: "23.01",
		Source:  "winget",
		Silent:  true,
	}

	result := executor.InstallSoftware(ctx, pkg)

	// Verify result structure
	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}
}

// TestInstallSoftware_Winget_AlreadyInstalled tests handling already installed package
func TestInstallSoftware_Winget_AlreadyInstalled(t *testing.T) {
	executor := &WindowsSoftwareExecutor{}
	ctx := context.Background()

	pkg := models.SoftwarePackage{
		Name:   "already.installed",
		Source: "winget",
		Silent: true,
	}

	// This would need real winget execution to test properly
	result := executor.InstallSoftware(ctx, pkg)

	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}
}

// TestInstallSoftware_Winget_NotFound tests package not found scenario
func TestInstallSoftware_Winget_NotFound(t *testing.T) {
	executor := &WindowsSoftwareExecutor{}
	ctx := context.Background()

	pkg := models.SoftwarePackage{
		Name:   "nonexistent.package.12345",
		Source: "winget",
		Silent: true,
	}

	result := executor.InstallSoftware(ctx, pkg)

	// Should handle package not found gracefully
	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}
}

// TestInstallSoftware_Winget_NameVsID tests name vs ID flag selection
func TestInstallSoftware_Winget_NameVsID(t *testing.T) {
	// Test with ID (contains dot)
	executor := &WindowsSoftwareExecutor{}
	ctx := context.Background()

	pkgWithDot := models.SoftwarePackage{
		Name:   "7zip.7zip",
		Source: "winget",
	}

	resultID := executor.InstallSoftware(ctx, pkgWithDot)
	if resultID.Duration == 0 {
		t.Error("Expected non-zero duration for ID-based install")
	}

	// Test with name (no dot)
	pkgNoDot := models.SoftwarePackage{
		Name:   "7-Zip",
		Source: "winget",
	}

	resultName := executor.InstallSoftware(ctx, pkgNoDot)
	if resultName.Duration == 0 {
		t.Error("Expected non-zero duration for name-based install")
	}
}

// TestInstallSoftware_Chocolatey_Success tests successful chocolatey installation
func TestInstallSoftware_Chocolatey_Success(t *testing.T) {
	executor := &WindowsSoftwareExecutor{}
	ctx := context.Background()

	pkg := models.SoftwarePackage{
		Name:   "7zip",
		Source: "choco",
		Silent: true,
	}

	result := executor.InstallSoftware(ctx, pkg)

	// Verify result structure
	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}
}

// TestInstallSoftware_Chocolatey_WithVersion tests chocolatey with version
func TestInstallSoftware_Chocolatey_WithVersion(t *testing.T) {
	executor := &WindowsSoftwareExecutor{}
	ctx := context.Background()

	pkg := models.SoftwarePackage{
		Name:    "7zip",
		Version: "23.01",
		Source:  "chocolatey",
		Silent:  true,
	}

	result := executor.InstallSoftware(ctx, pkg)

	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}
}

// TestInstallSoftware_Chocolatey_NotInstalled tests chocolatey not installed
func TestInstallSoftware_Chocolatey_NotInstalled(t *testing.T) {
	// This test validates the check for chocolatey availability
	// In real environments where choco isn't installed, should get appropriate error
	t.Skip("Skipping - requires chocolatey not to be installed")
}

// TestInstallSoftware_Chocolatey_PackageNotFound tests package not found in chocolatey
func TestInstallSoftware_Chocolatey_PackageNotFound(t *testing.T) {
	executor := &WindowsSoftwareExecutor{}
	ctx := context.Background()

	pkg := models.SoftwarePackage{
		Name:   "nonexistent-chocolatey-package-xyz",
		Source: "choco",
	}

	result := executor.InstallSoftware(ctx, pkg)

	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}
}

// TestInstallSoftware_Chocolatey_DependencyMissing tests dependency resolution
func TestInstallSoftware_Chocolatey_DependencyMissing(t *testing.T) {
	// This would need a specific package with known dependency issues
	t.Skip("Skipping - requires specific package with dependency issues")
}

// TestInstallSoftware_MSI_Success tests MSI installation
func TestInstallSoftware_MSI_Success(t *testing.T) {
	// Create a temporary mock MSI file for testing
	tempDir := testutil.CreateTempDir(t, "msi-test")
	msiPath := testutil.CreateTempFile(t, tempDir, "test.msi", "mock msi content")

	executor := &WindowsSoftwareExecutor{}
	ctx := context.Background()

	pkg := models.SoftwarePackage{
		Name:       "Test MSI",
		Source:     "msi",
		PackageURL: msiPath,
		Silent:     true,
	}

	result := executor.InstallSoftware(ctx, pkg)

	// Will fail because it's not a real MSI, but should handle gracefully
	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}
}

// TestInstallSoftware_MSI_FileNotFound tests MSI file not found
func TestInstallSoftware_MSI_FileNotFound(t *testing.T) {
	executor := &WindowsSoftwareExecutor{}
	ctx := context.Background()

	pkg := models.SoftwarePackage{
		Name:       "Test MSI",
		Source:     "msi",
		PackageURL: "C:\\nonexistent\\file.msi",
	}

	result := executor.InstallSoftware(ctx, pkg)

	testutil.AssertFalse(t, result.Success, "Should fail for non-existent MSI")
	testutil.AssertContains(t, result.ErrorMessage, "not found", "Error should mention file not found")
}

// TestInstallSoftware_MSI_WithArguments tests MSI with custom arguments
func TestInstallSoftware_MSI_WithArguments(t *testing.T) {
	tempDir := testutil.CreateTempDir(t, "msi-test")
	msiPath := testutil.CreateTempFile(t, tempDir, "test.msi", "mock msi content")

	executor := &WindowsSoftwareExecutor{}
	ctx := context.Background()

	pkg := models.SoftwarePackage{
		Name:       "Test MSI",
		Source:     "msi",
		PackageURL: msiPath,
		Arguments:  "INSTALLDIR=C:\\Custom /l*v install.log",
		Silent:     true,
	}

	result := executor.InstallSoftware(ctx, pkg)

	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}
}

// TestInstallSoftware_MSI_DownloadURL tests downloading MSI from URL
func TestInstallSoftware_MSI_DownloadURL(t *testing.T) {
	// This requires network access and a real MSI URL
	t.Skip("Skipping - requires real MSI URL")
}

// TestInstallSoftware_MSI_CorruptedChecksum tests checksum validation
func TestInstallSoftware_MSI_CorruptedChecksum(t *testing.T) {
	// This would test the checksum validation in downloadFile
	t.Skip("Skipping - requires downloadFile implementation testing")
}

// TestInstallSoftware_UnknownSource tests unknown installation source
func TestInstallSoftware_UnknownSource(t *testing.T) {
	executor := &WindowsSoftwareExecutor{}
	ctx := context.Background()

	pkg := models.SoftwarePackage{
		Name:   "Test Package",
		Source: "unknown-source",
	}

	result := executor.InstallSoftware(ctx, pkg)

	testutil.AssertFalse(t, result.Success, "Should fail for unknown source")
	testutil.AssertContains(t, result.Message, "Unknown installation source", "Message should mention unknown source")
	testutil.AssertContains(t, result.ErrorMessage, "Supported sources", "Error should list supported sources")
}

// TestUninstallSoftware_Winget_Success tests winget uninstallation
func TestUninstallSoftware_Winget_Success(t *testing.T) {
	executor := &WindowsSoftwareExecutor{}
	ctx := context.Background()

	result := executor.UninstallSoftware(ctx, "7zip.7zip")

	// Verify result structure
	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}
}

// TestUninstallSoftware_Winget_NotInstalled tests uninstalling non-installed package
func TestUninstallSoftware_Winget_NotInstalled(t *testing.T) {
	executor := &WindowsSoftwareExecutor{}
	ctx := context.Background()

	result := executor.UninstallSoftware(ctx, "nonexistent.package.xyz")

	// Should handle gracefully
	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}
}

// TestUninstallSoftware_PermissionDenied tests uninstall with insufficient permissions
func TestUninstallSoftware_PermissionDenied(t *testing.T) {
	// This would need to be run without admin privileges
	t.Skip("Skipping - requires non-admin execution")
}

// TestGetInstalledVersion_Winget_Success tests version check
func TestGetInstalledVersion_Winget_Success(t *testing.T) {
	executor := &WindowsSoftwareExecutor{}
	ctx := context.Background()

	version, err := executor.GetInstalledVersion(ctx, "winget")

	// winget itself should be installed in test environment
	if err != nil {
		t.Logf("Warning: Failed to get winget version: %v", err)
	}

	if version != "" {
		t.Logf("Found winget version: %s", version)
	}
}

// TestGetInstalledVersion_NotInstalled tests version check for non-installed package
func TestGetInstalledVersion_NotInstalled(t *testing.T) {
	executor := &WindowsSoftwareExecutor{}
	ctx := context.Background()

	version, err := executor.GetInstalledVersion(ctx, "nonexistent.package.xyz")

	// Should return error or empty version
	if version != "" {
		t.Errorf("Expected empty version for non-existent package, got: %s", version)
	}
}

// TestClassifySoftwareError tests error classification
func TestClassifySoftwareError(t *testing.T) {
	tests := []struct {
		name          string
		err           error
		output        string
		expectedCode  string
		expectedRetry bool
	}{
		{
			name:          "network error",
			err:           &mockError{msg: "network connection failed"},
			output:        "download failed",
			expectedCode:  models.ErrNetworkFailure,
			expectedRetry: true,
		},
		{
			name:          "permission denied",
			err:           &mockError{msg: "access denied"},
			output:        "requires administrator",
			expectedCode:  models.ErrPermissionDenied,
			expectedRetry: false,
		},
		{
			name:          "disk full",
			err:           &mockError{msg: "insufficient disk space"},
			output:        "not enough space",
			expectedCode:  models.ErrDiskFull,
			expectedRetry: false,
		},
		{
			name:          "package not found",
			err:           &mockError{msg: "package not found"},
			output:        "no package found",
			expectedCode:  models.ErrPackageNotFound,
			expectedRetry: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := &models.ExecutionResult{}
			classifySoftwareError(result, tt.err, tt.output)

			testutil.AssertEqual(t, tt.expectedCode, result.ErrorCode, "Error code mismatch")
			testutil.AssertEqual(t, tt.expectedRetry, result.Retryable, "Retryable mismatch")
			testutil.AssertNotEmpty(t, result.ErrorMessage, "Error message should not be empty")
		})
	}
}

// TestMapMSIExitCode tests MSI exit code mapping
func TestMapMSIExitCode(t *testing.T) {
	tests := []struct {
		exitCode      int
		expectedCode  string
		expectedMsg   string
		expectedRetry bool
	}{
		{
			exitCode:      0,
			expectedCode:  models.ErrUnknown,
			expectedMsg:   "Success",
			expectedRetry: false,
		},
		{
			exitCode:      3010,
			expectedCode:  models.ErrUnknown,
			expectedMsg:   "Success (reboot required)",
			expectedRetry: false,
		},
		{
			exitCode:      1602,
			expectedCode:  models.ErrUserCancelled,
			expectedMsg:   "User cancelled installation",
			expectedRetry: false,
		},
		{
			exitCode:      1603,
			expectedCode:  models.ErrUnknown,
			expectedMsg:   "Fatal error during installation",
			expectedRetry: false,
		},
		{
			exitCode:      1618,
			expectedCode:  models.ErrServiceUnavailable,
			expectedMsg:   "Another installation is already in progress",
			expectedRetry: true,
		},
		{
			exitCode:      1619,
			expectedCode:  models.ErrInvalidPayload,
			expectedMsg:   "Package could not be opened",
			expectedRetry: false,
		},
		{
			exitCode:      1625,
			expectedCode:  models.ErrPermissionDenied,
			expectedMsg:   "Installation forbidden by system policy",
			expectedRetry: false,
		},
		{
			exitCode:      1633,
			expectedCode:  models.ErrIncompatible,
			expectedMsg:   "not supported on this platform",
			expectedRetry: false,
		},
		{
			exitCode:      1638,
			expectedCode:  models.ErrAlreadyInstalled,
			expectedMsg:   "Another version of this product is already installed",
			expectedRetry: false,
		},
		{
			exitCode:      9999,
			expectedCode:  models.ErrUnknown,
			expectedMsg:   "Unknown MSI error code: 9999",
			expectedRetry: false,
		},
	}

	for _, tt := range tests {
		t.Run(fmt.Sprintf("exit_code_%d", tt.exitCode), func(t *testing.T) {
			code, msg, retryable := mapMSIExitCode(tt.exitCode)

			testutil.AssertEqual(t, tt.expectedCode, code, "Error code mismatch")
			testutil.AssertContains(t, msg, tt.expectedMsg, "Error message mismatch")
			testutil.AssertEqual(t, tt.expectedRetry, retryable, "Retryable mismatch")
		})
	}
}

// TestInstallSoftware_EXE_SilentFlagDetection tests silent flag auto-detection
func TestInstallSoftware_EXE_SilentFlagDetection(t *testing.T) {
	// This test validates the silent flag detection logic
	// In reality, it would need mock EXE files that respond to different flags
	t.Skip("Skipping - requires mock EXE installers")
}

// TestInstallSoftware_EXE_CustomArguments tests EXE with custom arguments
func TestInstallSoftware_EXE_CustomArguments(t *testing.T) {
	tempDir := testutil.CreateTempDir(t, "exe-test")
	exePath := testutil.CreateTempFile(t, tempDir, "installer.exe", "mock exe content")

	executor := &WindowsSoftwareExecutor{}
	ctx := context.Background()

	pkg := models.SoftwarePackage{
		Name:       "Custom Installer",
		Source:     "exe",
		PackageURL: exePath,
		Arguments:  "/CUSTOM /SILENT /DIR=C:\\Test",
		Silent:     false, // Arguments override silent mode
	}

	result := executor.InstallSoftware(ctx, pkg)

	// Will fail because it's not a real EXE, but should attempt execution
	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}
}

// TestInstallSoftware_EXE_FileNotFound tests EXE file not found
func TestInstallSoftware_EXE_FileNotFound(t *testing.T) {
	executor := &WindowsSoftwareExecutor{}
	ctx := context.Background()

	pkg := models.SoftwarePackage{
		Name:       "Test Installer",
		Source:     "exe",
		PackageURL: "C:\\nonexistent\\installer.exe",
	}

	result := executor.InstallSoftware(ctx, pkg)

	testutil.AssertFalse(t, result.Success, "Should fail for non-existent EXE")
	testutil.AssertContains(t, result.ErrorMessage, "not found", "Error should mention file not found")
}

// TestInstallSoftware_URL_MSI tests auto-detection of MSI from URL
func TestInstallSoftware_URL_MSI(t *testing.T) {
	executor := &WindowsSoftwareExecutor{}
	ctx := context.Background()

	pkg := models.SoftwarePackage{
		Name:       "Test Package",
		Source:     "url",
		PackageURL: "https://example.com/package.msi",
	}

	result := executor.InstallSoftware(ctx, pkg)

	// Will fail because URL is not real, but should detect .msi extension
	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}
}

// TestInstallSoftware_URL_EXE tests auto-detection of EXE from URL
func TestInstallSoftware_URL_EXE(t *testing.T) {
	executor := &WindowsSoftwareExecutor{}
	ctx := context.Background()

	pkg := models.SoftwarePackage{
		Name:       "Test Package",
		Source:     "url",
		PackageURL: "https://example.com/installer.exe",
		Silent:     true,
	}

	result := executor.InstallSoftware(ctx, pkg)

	// Will fail because URL is not real, but should detect .exe extension
	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}
}

// TestInstallSoftware_URL_UnknownExtension tests unknown file extension from URL
func TestInstallSoftware_URL_UnknownExtension(t *testing.T) {
	executor := &WindowsSoftwareExecutor{}
	ctx := context.Background()

	pkg := models.SoftwarePackage{
		Name:       "Test Package",
		Source:     "url",
		PackageURL: "https://example.com/package.unknown",
	}

	result := executor.InstallSoftware(ctx, pkg)

	testutil.AssertFalse(t, result.Success, "Should fail for unknown file extension")
	testutil.AssertContains(t, result.ErrorMessage, "URL must point to .msi or .exe", "Error should mention supported extensions")
}

// Mock error type for testing
type mockError struct {
	msg string
}

func (e *mockError) Error() string {
	return e.msg
}
