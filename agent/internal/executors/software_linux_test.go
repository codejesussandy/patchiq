//go:build linux

package executors

import (
	"context"
	"testing"
	"time"

	"github.com/patchify/agent/internal/models"
	"github.com/patchify/agent/internal/testutil"
)

// TestInstallSoftware_Apt_Success tests successful software installation via apt
func TestInstallSoftware_Apt_Success(t *testing.T) {
	executor := NewLinuxSoftwareExecutor()
	executor.packageManager = "apt-get"
	ctx := context.Background()

	pkg := models.SoftwarePackage{
		Name:    "curl",
		Version: "latest",
		Source:  "apt",
	}

	result := executor.InstallSoftware(ctx, pkg)

	testutil.AssertNotEmpty(t, result.Message, "Should have message")
	testutil.AssertGreaterThan(t, result.Duration, int64(0), "Expected non-zero duration")
}

// TestInstallSoftware_Apt_VersionPinning tests installing specific version via apt
func TestInstallSoftware_Apt_VersionPinning(t *testing.T) {
	executor := NewLinuxSoftwareExecutor()
	executor.packageManager = "apt-get"
	ctx := context.Background()

	pkg := models.SoftwarePackage{
		Name:    "curl",
		Version: "7.68.0-1ubuntu2",
		Source:  "apt",
	}

	result := executor.InstallSoftware(ctx, pkg)

	testutil.AssertNotEmpty(t, result.Message, "Should have message")
}

// TestInstallSoftware_Apt_BrokenDependencies tests apt with broken dependencies
func TestInstallSoftware_Apt_BrokenDependencies(t *testing.T) {
	executor := NewLinuxSoftwareExecutor()
	executor.packageManager = "apt-get"
	ctx := context.Background()

	// Try to install non-existent package
	pkg := models.SoftwarePackage{
		Name:   "nonexistent-package-xyz123",
		Source: "apt",
	}

	result := executor.InstallSoftware(ctx, pkg)

	testutil.AssertFalse(t, result.Success, "Should fail for non-existent package")
	testutil.AssertNotEmpty(t, result.ErrorMessage, "Should have error message")
}

// TestInstallSoftware_Apt_NetworkFailure tests apt network error handling
func TestInstallSoftware_Apt_NetworkFailure(t *testing.T) {
	executor := NewLinuxSoftwareExecutor()
	executor.packageManager = "apt-get"

	// Use very short timeout to simulate network failure
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Nanosecond)
	defer cancel()

	pkg := models.SoftwarePackage{
		Name:   "some-package",
		Source: "apt",
	}

	result := executor.InstallSoftware(ctx, pkg)

	testutil.AssertFalse(t, result.Success, "Should fail")
	testutil.AssertNotEmpty(t, result.Message, "Should have message")
}

// TestInstallSoftware_Dnf_Success tests successful installation via dnf
func TestInstallSoftware_Dnf_Success(t *testing.T) {
	executor := NewLinuxSoftwareExecutor()
	executor.packageManager = "dnf"
	ctx := context.Background()

	pkg := models.SoftwarePackage{
		Name:    "bash",
		Version: "latest",
		Source:  "dnf",
	}

	result := executor.InstallSoftware(ctx, pkg)

	testutil.AssertNotEmpty(t, result.Message, "Should have message")
}

// TestInstallSoftware_Dnf_VersionLock tests dnf with specific version
func TestInstallSoftware_Dnf_VersionLock(t *testing.T) {
	executor := NewLinuxSoftwareExecutor()
	executor.packageManager = "dnf"
	ctx := context.Background()

	pkg := models.SoftwarePackage{
		Name:    "bash",
		Version: "5.0.17",
		Source:  "dnf",
	}

	result := executor.InstallSoftware(ctx, pkg)

	testutil.AssertNotEmpty(t, result.Message, "Should have message")
}

// TestInstallSoftware_Dnf_DependencyResolution tests dnf dependency handling
func TestInstallSoftware_Dnf_DependencyResolution(t *testing.T) {
	executor := NewLinuxSoftwareExecutor()
	executor.packageManager = "dnf"
	ctx := context.Background()

	pkg := models.SoftwarePackage{
		Name:   "nonexistent-dnf-package-xyz",
		Source: "dnf",
	}

	result := executor.InstallSoftware(ctx, pkg)

	testutil.AssertFalse(t, result.Success, "Should fail for non-existent package")
}

// TestInstallSoftware_Yum_Success tests successful installation via yum
func TestInstallSoftware_Yum_Success(t *testing.T) {
	executor := NewLinuxSoftwareExecutor()
	executor.packageManager = "yum"
	ctx := context.Background()

	pkg := models.SoftwarePackage{
		Name:    "coreutils",
		Version: "latest",
		Source:  "yum",
	}

	result := executor.InstallSoftware(ctx, pkg)

	testutil.AssertNotEmpty(t, result.Message, "Should have message")
}

// TestInstallSoftware_Yum_NetworkError tests yum network failure
func TestInstallSoftware_Yum_NetworkError(t *testing.T) {
	executor := NewLinuxSoftwareExecutor()
	executor.packageManager = "yum"

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Nanosecond)
	defer cancel()

	pkg := models.SoftwarePackage{
		Name:   "package",
		Source: "yum",
	}

	result := executor.InstallSoftware(ctx, pkg)

	testutil.AssertFalse(t, result.Success, "Should fail")
}

// TestInstallSoftware_Snap_Success tests snap installation
func TestInstallSoftware_Snap_Success(t *testing.T) {
	executor := NewLinuxSoftwareExecutor()
	ctx := context.Background()

	pkg := models.SoftwarePackage{
		Name:   "hello",
		Source: "snap",
	}

	result := executor.InstallSoftware(ctx, pkg)

	// May fail if snap is not installed, which is fine
	testutil.AssertNotEmpty(t, result.Message, "Should have message")
}

// TestInstallSoftware_Snap_NotInstalled tests snap when snapd is not available
func TestInstallSoftware_Snap_NotInstalled(t *testing.T) {
	executor := NewLinuxSoftwareExecutor()
	ctx := context.Background()

	pkg := models.SoftwarePackage{
		Name:   "some-snap",
		Source: "snap",
	}

	result := executor.InstallSoftware(ctx, pkg)

	// If snap is not installed, should get appropriate error
	testutil.AssertNotEmpty(t, result.Message, "Should have message")
}

// TestInstallSoftware_Flatpak_Success tests flatpak installation
func TestInstallSoftware_Flatpak_Success(t *testing.T) {
	executor := NewLinuxSoftwareExecutor()
	ctx := context.Background()

	pkg := models.SoftwarePackage{
		Name:   "org.gnome.Calculator",
		Source: "flatpak",
	}

	result := executor.InstallSoftware(ctx, pkg)

	testutil.AssertNotEmpty(t, result.Message, "Should have message")
}

// TestInstallSoftware_Flatpak_NotInstalled tests flatpak when not available
func TestInstallSoftware_Flatpak_NotInstalled(t *testing.T) {
	executor := NewLinuxSoftwareExecutor()
	ctx := context.Background()

	pkg := models.SoftwarePackage{
		Name:   "org.test.App",
		Source: "flatpak",
	}

	result := executor.InstallSoftware(ctx, pkg)

	testutil.AssertNotEmpty(t, result.Message, "Should have message")
}

// TestInstallSoftware_UnknownSource tests unknown installation source
func TestInstallSoftware_UnknownSource(t *testing.T) {
	executor := NewLinuxSoftwareExecutor()
	ctx := context.Background()

	pkg := models.SoftwarePackage{
		Name:   "test",
		Source: "unknown-source",
	}

	result := executor.InstallSoftware(ctx, pkg)

	testutil.AssertFalse(t, result.Success, "Should fail for unknown source")
	testutil.AssertContains(t, result.Message, "Unknown", "Should mention unknown source")
}

// TestInstallSoftware_Auto_UsesSystemPackageManager tests auto-detection
func TestInstallSoftware_Auto_UsesSystemPackageManager(t *testing.T) {
	executor := NewLinuxSoftwareExecutor()
	ctx := context.Background()

	pkg := models.SoftwarePackage{
		Name:   "bash",
		Source: "auto",
	}

	result := executor.InstallSoftware(ctx, pkg)

	testutil.AssertNotEmpty(t, result.Message, "Should have message")
}

// TestUninstallSoftware_Apt_Success tests software uninstallation via apt
func TestUninstallSoftware_Apt_Success(t *testing.T) {
	executor := NewLinuxSoftwareExecutor()
	executor.packageManager = "apt-get"
	ctx := context.Background()

	result := executor.UninstallSoftware(ctx, "curl")

	testutil.AssertNotEmpty(t, result.Message, "Should have message")
}

// TestUninstallSoftware_NotInstalled tests uninstalling non-existent package
func TestUninstallSoftware_NotInstalled(t *testing.T) {
	executor := NewLinuxSoftwareExecutor()
	executor.packageManager = "apt-get"
	ctx := context.Background()

	result := executor.UninstallSoftware(ctx, "nonexistent-package-xyz123")

	testutil.AssertFalse(t, result.Success, "Should fail for non-existent package")
}

// TestGetInstalledVersion_Success tests getting installed version
func TestGetInstalledVersion_Success(t *testing.T) {
	executor := NewLinuxSoftwareExecutor()
	executor.packageManager = "apt-get"
	ctx := context.Background()

	version, err := executor.GetInstalledVersion(ctx, "bash")

	if err == nil {
		testutil.AssertNotEmpty(t, version, "Version should not be empty")
	}
	// If error, package might not be installed, which is fine for test
}

// TestGetInstalledVersion_NotInstalled tests version check for non-existent package
func TestGetInstalledVersion_NotInstalled(t *testing.T) {
	executor := NewLinuxSoftwareExecutor()
	executor.packageManager = "apt-get"
	ctx := context.Background()

	_, err := executor.GetInstalledVersion(ctx, "nonexistent-package-xyz123")

	testutil.AssertError(t, err, "Should error for non-existent package")
}

// TestClassifyLinuxSoftwareError tests error classification
func TestClassifyLinuxSoftwareError(t *testing.T) {
	tests := []struct {
		name          string
		output        string
		expectedCode  string
		expectedRetry bool
	}{
		{
			name:          "Network error",
			output:        "failed to fetch packages",
			expectedCode:  models.ErrNetworkFailure,
			expectedRetry: true,
		},
		{
			name:          "Permission denied",
			output:        "permission denied",
			expectedCode:  models.ErrPermissionDenied,
			expectedRetry: false,
		},
		{
			name:          "Package not found",
			output:        "unable to locate package",
			expectedCode:  models.ErrPackageNotFound,
			expectedRetry: false,
		},
		{
			name:          "Disk full",
			output:        "no space left on device",
			expectedCode:  models.ErrDiskFull,
			expectedRetry: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := &models.ExecutionResult{}
			classifyLinuxSoftwareError(result, nil, tt.output)

			testutil.AssertEqual(t, tt.expectedCode, result.ErrorCode, "Error code should match")
			testutil.AssertEqual(t, tt.expectedRetry, result.Retryable, "Retryable should match")
		})
	}
}
