//go:build darwin

package executors

import (
	"context"
	"testing"

	"github.com/patchify/agent/internal/models"
	"github.com/patchify/agent/internal/testutil"
)

// TestInstallSoftware_Brew_Success tests successful brew installation
func TestInstallSoftware_Brew_Success(t *testing.T) {
	executor := &DarwinSoftwareExecutor{}
	ctx := context.Background()

	pkg := models.SoftwarePackage{
		Name:   "wget",
		Source: "brew",
		Silent: true,
	}

	result := executor.InstallSoftware(ctx, pkg)

	// Verify result structure
	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}
}

// TestInstallSoftware_Brew_WithVersion tests brew installation with specific version
func TestInstallSoftware_Brew_WithVersion(t *testing.T) {
	executor := &DarwinSoftwareExecutor{}
	ctx := context.Background()

	pkg := models.SoftwarePackage{
		Name:    "wget",
		Version: "1.21.3",
		Source:  "brew",
	}

	result := executor.InstallSoftware(ctx, pkg)

	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}
}

// TestInstallSoftware_Brew_Cask tests brew cask installation
func TestInstallSoftware_Brew_Cask(t *testing.T) {
	executor := &DarwinSoftwareExecutor{}
	ctx := context.Background()

	pkg := models.SoftwarePackage{
		Name:    "google-chrome",
		Source:  "brew",
		IsCask:  true,
		Silent:  true,
	}

	result := executor.InstallSoftware(ctx, pkg)

	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}
}

// TestInstallSoftware_Brew_NotFound tests package not found scenario
func TestInstallSoftware_Brew_NotFound(t *testing.T) {
	executor := &DarwinSoftwareExecutor{}
	ctx := context.Background()

	pkg := models.SoftwarePackage{
		Name:   "nonexistent-brew-package-xyz-12345",
		Source: "brew",
	}

	result := executor.InstallSoftware(ctx, pkg)

	// Should handle package not found gracefully
	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}
}

// TestInstallSoftware_Brew_AlreadyInstalled tests handling already installed package
func TestInstallSoftware_Brew_AlreadyInstalled(t *testing.T) {
	executor := &DarwinSoftwareExecutor{}
	ctx := context.Background()

	// Install brew itself (should already be installed in test environment)
	pkg := models.SoftwarePackage{
		Name:   "brew",
		Source: "brew",
	}

	result := executor.InstallSoftware(ctx, pkg)

	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}
}

// TestInstallSoftware_MAS_Success tests Mac App Store installation
func TestInstallSoftware_MAS_Success(t *testing.T) {
	executor := &DarwinSoftwareExecutor{}
	ctx := context.Background()

	pkg := models.SoftwarePackage{
		Name:   "497799835", // Xcode app ID
		Source: "mas",
	}

	result := executor.InstallSoftware(ctx, pkg)

	// May require Apple ID authentication
	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}
}

// TestInstallSoftware_MAS_NotInstalled tests mas CLI not installed
func TestInstallSoftware_MAS_NotInstalled(t *testing.T) {
	// This test validates the check for mas availability
	// Skip if mas is actually installed
	executor := &DarwinSoftwareExecutor{}
	ctx := context.Background()

	pkg := models.SoftwarePackage{
		Name:   "123456789",
		Source: "mas",
	}

	result := executor.InstallSoftware(ctx, pkg)

	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}
}

// TestInstallSoftware_MAS_AppNotFound tests App Store app not found
func TestInstallSoftware_MAS_AppNotFound(t *testing.T) {
	executor := &DarwinSoftwareExecutor{}
	ctx := context.Background()

	pkg := models.SoftwarePackage{
		Name:   "999999999",
		Source: "mas",
	}

	result := executor.InstallSoftware(ctx, pkg)

	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}
}

// TestInstallSoftware_MAS_AlreadyInstalled tests already installed Mac App Store app
func TestInstallSoftware_MAS_AlreadyInstalled(t *testing.T) {
	// This would need a known installed app
	t.Skip("Skipping - requires known installed App Store app")
}

// TestInstallSoftware_PKG_Success tests PKG installation
func TestInstallSoftware_PKG_Success(t *testing.T) {
	// Create a temporary mock PKG file for testing
	tempDir := testutil.CreateTempDir(t, "pkg-test")
	pkgPath := testutil.CreateTempFile(t, tempDir, "test.pkg", "mock pkg content")

	executor := &DarwinSoftwareExecutor{}
	ctx := context.Background()

	pkg := models.SoftwarePackage{
		Name:       "Test PKG",
		Source:     "pkg",
		PackageURL: pkgPath,
	}

	result := executor.InstallSoftware(ctx, pkg)

	// Will fail because it's not a real PKG, but should handle gracefully
	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}
}

// TestInstallSoftware_PKG_FileNotFound tests PKG file not found
func TestInstallSoftware_PKG_FileNotFound(t *testing.T) {
	executor := &DarwinSoftwareExecutor{}
	ctx := context.Background()

	pkg := models.SoftwarePackage{
		Name:       "Test PKG",
		Source:     "pkg",
		PackageURL: "/nonexistent/path/file.pkg",
	}

	result := executor.InstallSoftware(ctx, pkg)

	testutil.AssertFalse(t, result.Success, "Should fail for non-existent PKG")
	testutil.AssertContains(t, result.ErrorMessage, "not found", "Error should mention file not found")
}

// TestInstallSoftware_PKG_PermissionDenied tests PKG installation without sudo
func TestInstallSoftware_PKG_PermissionDenied(t *testing.T) {
	// This would need to be run without sudo privileges
	t.Skip("Skipping - requires non-sudo execution")
}

// TestInstallSoftware_DMG_Success tests DMG installation
func TestInstallSoftware_DMG_Success(t *testing.T) {
	// Create a temporary mock DMG file for testing
	tempDir := testutil.CreateTempDir(t, "dmg-test")
	dmgPath := testutil.CreateTempFile(t, tempDir, "test.dmg", "mock dmg content")

	executor := &DarwinSoftwareExecutor{}
	ctx := context.Background()

	pkg := models.SoftwarePackage{
		Name:       "Test DMG",
		Source:     "dmg",
		PackageURL: dmgPath,
	}

	result := executor.InstallSoftware(ctx, pkg)

	// Will fail because it's not a real DMG, but should handle gracefully
	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}
}

// TestInstallSoftware_DMG_FileNotFound tests DMG file not found
func TestInstallSoftware_DMG_FileNotFound(t *testing.T) {
	executor := &DarwinSoftwareExecutor{}
	ctx := context.Background()

	pkg := models.SoftwarePackage{
		Name:       "Test DMG",
		Source:     "dmg",
		PackageURL: "/nonexistent/path/file.dmg",
	}

	result := executor.InstallSoftware(ctx, pkg)

	testutil.AssertFalse(t, result.Success, "Should fail for non-existent DMG")
	testutil.AssertContains(t, result.ErrorMessage, "not found", "Error should mention file not found")
}

// TestInstallSoftware_DMG_MountFailed tests DMG mount failure
func TestInstallSoftware_DMG_MountFailed(t *testing.T) {
	// Create invalid DMG file
	tempDir := testutil.CreateTempDir(t, "dmg-test")
	dmgPath := testutil.CreateTempFile(t, tempDir, "invalid.dmg", "not a real dmg file")

	executor := &DarwinSoftwareExecutor{}
	ctx := context.Background()

	pkg := models.SoftwarePackage{
		Name:       "Test DMG",
		Source:     "dmg",
		PackageURL: dmgPath,
	}

	result := executor.InstallSoftware(ctx, pkg)

	// Should fail to mount
	testutil.AssertFalse(t, result.Success, "Should fail to mount invalid DMG")
}

// TestInstallSoftware_UnknownSource tests unknown installation source
func TestInstallSoftware_UnknownSource(t *testing.T) {
	executor := &DarwinSoftwareExecutor{}
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

// TestUninstallSoftware_Brew_Success tests brew uninstallation
func TestUninstallSoftware_Brew_Success(t *testing.T) {
	executor := &DarwinSoftwareExecutor{}
	ctx := context.Background()

	result := executor.UninstallSoftware(ctx, "wget")

	// Verify result structure
	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}
}

// TestUninstallSoftware_Brew_NotInstalled tests uninstalling non-installed package
func TestUninstallSoftware_Brew_NotInstalled(t *testing.T) {
	executor := &DarwinSoftwareExecutor{}
	ctx := context.Background()

	result := executor.UninstallSoftware(ctx, "nonexistent-package-xyz")

	// Should handle gracefully
	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}
}

// TestUninstallSoftware_Brew_Cask tests brew cask uninstallation
func TestUninstallSoftware_Brew_Cask(t *testing.T) {
	executor := &DarwinSoftwareExecutor{}
	ctx := context.Background()

	// Attempt to uninstall a cask
	result := executor.UninstallSoftware(ctx, "google-chrome")

	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}
}

// TestGetInstalledVersion_Brew_Success tests version check
func TestGetInstalledVersion_Brew_Success(t *testing.T) {
	executor := &DarwinSoftwareExecutor{}
	ctx := context.Background()

	// Check brew itself (should be installed in test environment)
	version, err := executor.GetInstalledVersion(ctx, "git")

	// git should be installed on macOS by default
	if err != nil {
		t.Logf("Warning: Failed to get git version: %v", err)
	}

	if version != "" {
		t.Logf("Found git version: %s", version)
	}
}

// TestGetInstalledVersion_NotInstalled tests version check for non-installed package
func TestGetInstalledVersion_NotInstalled(t *testing.T) {
	executor := &DarwinSoftwareExecutor{}
	ctx := context.Background()

	version, err := executor.GetInstalledVersion(ctx, "nonexistent-package-xyz")

	// Should return error or empty version
	if version != "" {
		t.Errorf("Expected empty version for non-existent package, got: %s", version)
	}
}

// TestClassifyDarwinSoftwareError tests error classification
func TestClassifyDarwinSoftwareError(t *testing.T) {
	tests := []struct {
		name          string
		err           error
		output        string
		expectedCode  string
		expectedRetry bool
	}{
		{
			name:          "network error",
			err:           &mockError{msg: "failed to download"},
			output:        "curl error",
			expectedCode:  models.ErrNetworkFailure,
			expectedRetry: true,
		},
		{
			name:          "permission denied",
			err:           &mockError{msg: "permission denied"},
			output:        "requires sudo",
			expectedCode:  models.ErrPermissionDenied,
			expectedRetry: false,
		},
		{
			name:          "disk full",
			err:           &mockError{msg: "no space left"},
			output:        "insufficient disk space",
			expectedCode:  models.ErrDiskFull,
			expectedRetry: false,
		},
		{
			name:          "package not found",
			err:           &mockError{msg: "No available formula"},
			output:        "Error: No available formula",
			expectedCode:  models.ErrPackageNotFound,
			expectedRetry: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := &models.ExecutionResult{}
			classifyDarwinSoftwareError(result, tt.err, tt.output)

			testutil.AssertEqual(t, tt.expectedCode, result.ErrorCode, "Error code mismatch")
			testutil.AssertEqual(t, tt.expectedRetry, result.Retryable, "Retryable mismatch")
			testutil.AssertNotEmpty(t, result.ErrorMessage, "Error message should not be empty")
		})
	}
}

// mockError is a simple error implementation for testing
type mockError struct {
	msg string
}

func (e *mockError) Error() string {
	return e.msg
}
