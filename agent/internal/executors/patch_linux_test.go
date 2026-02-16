//go:build linux

package executors

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/patchify/agent/internal/models"
	"github.com/patchify/agent/internal/testutil"
)

// TestInstallPatch_Apt_Success tests successful patch installation via apt
func TestInstallPatch_Apt_Success(t *testing.T) {
	mock := testutil.NewMockCommandExecutor()
	mock.SetOutput("apt-get update", "Reading package lists... Done\n")
	mock.SetOutput("apt-get install", "Reading package lists...\nDone\n1 upgraded, 0 newly installed")

	executor := &LinuxPatchExecutor{packageManager: "apt-get"}
	ctx := context.Background()
	options := models.PatchOptions{AllowReboot: false}

	result := executor.InstallPatch(ctx, "security-update", options)

	testutil.AssertTrue(t, result.Success, "Expected success")
	testutil.AssertContains(t, result.Message, "Successfully", "Expected success message")
	testutil.AssertEqual(t, 0, result.ExitCode, "Expected exit code 0")
	testutil.AssertGreaterThan(t, result.Duration, int64(0), "Expected non-zero duration")
}

// TestInstallPatch_Apt_UpdateError tests apt update failure
func TestInstallPatch_Apt_UpdateError(t *testing.T) {
	executor := &LinuxPatchExecutor{packageManager: "apt-get"}
	ctx := context.Background()
	options := models.PatchOptions{}

	// This test will actually run apt-get commands, so it should handle errors gracefully
	result := executor.InstallPatch(ctx, "nonexistent-package-12345xyz", options)

	// Expect failure for non-existent package
	testutil.AssertFalse(t, result.Success, "Should fail for non-existent package")
	testutil.AssertNotEmpty(t, result.Output, "Should have output")
}

// TestInstallPatch_Apt_RepoError tests repository connection failure
func TestInstallPatch_Apt_RepoError(t *testing.T) {
	executor := &LinuxPatchExecutor{packageManager: "apt-get"}

	// Use very short timeout to simulate network error
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Nanosecond)
	defer cancel()

	result := executor.InstallPatch(ctx, "pkg", models.PatchOptions{})

	testutil.AssertFalse(t, result.Success, "Expected failure")
	testutil.AssertEqual(t, models.ErrTimeout, result.ErrorCode, "Expected timeout error")
	testutil.AssertTrue(t, result.Retryable, "Network errors should be retryable")
}

// TestInstallPatch_Apt_Timeout tests installation timeout
func TestInstallPatch_Apt_Timeout(t *testing.T) {
	executor := &LinuxPatchExecutor{packageManager: "apt-get"}

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Microsecond)
	defer cancel()

	time.Sleep(2 * time.Microsecond) // Ensure context is already cancelled

	result := executor.InstallPatch(ctx, "some-package", models.PatchOptions{})

	testutil.AssertFalse(t, result.Success, "Should fail on timeout")
	testutil.AssertEqual(t, models.ErrTimeout, result.ErrorCode, "Should have timeout error code")
	testutil.AssertTrue(t, result.Retryable, "Timeout errors should be retryable")
	testutil.AssertContains(t, result.Message, "timed out", "Should mention timeout")
}

// TestInstallPatch_Dnf_Success tests successful patch installation via dnf
func TestInstallPatch_Dnf_Success(t *testing.T) {
	executor := &LinuxPatchExecutor{packageManager: "dnf"}
	ctx := context.Background()

	// This will run actual dnf command on dnf-based systems
	result := executor.InstallPatch(ctx, "bash", models.PatchOptions{})

	// Verify result structure
	testutil.AssertNotEmpty(t, result.Message, "Should have message")
	testutil.AssertGreaterThan(t, result.Duration, int64(0), "Expected non-zero duration")
}

// TestInstallPatch_Yum_Success tests successful patch installation via yum
func TestInstallPatch_Yum_Success(t *testing.T) {
	executor := &LinuxPatchExecutor{packageManager: "yum"}
	ctx := context.Background()

	result := executor.InstallPatch(ctx, "coreutils", models.PatchOptions{})

	testutil.AssertNotEmpty(t, result.Message, "Should have message")
	testutil.AssertGreaterThan(t, result.Duration, int64(0), "Expected non-zero duration")
}

// TestInstallPatch_Yum_NetworkError tests yum network failure
func TestInstallPatch_Yum_NetworkError(t *testing.T) {
	executor := &LinuxPatchExecutor{packageManager: "yum"}

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Nanosecond)
	defer cancel()

	result := executor.InstallPatch(ctx, "pkg", models.PatchOptions{})

	testutil.AssertFalse(t, result.Success, "Expected failure")
	testutil.AssertEqual(t, models.ErrTimeout, result.ErrorCode, "Expected timeout error")
}

// TestInstallPatch_Dnf_DependencyError tests dnf dependency issues
func TestInstallPatch_Dnf_DependencyError(t *testing.T) {
	executor := &LinuxPatchExecutor{packageManager: "dnf"}
	ctx := context.Background()

	// Try to install a package that likely doesn't exist
	result := executor.InstallPatch(ctx, "nonexistent-package-xyz123", models.PatchOptions{})

	testutil.AssertFalse(t, result.Success, "Should fail for non-existent package")
	testutil.AssertNotEmpty(t, result.ErrorMessage, "Should have error message")
}

// TestInstallPatch_Zypper_Success tests zypper package manager
func TestInstallPatch_Zypper_Success(t *testing.T) {
	executor := &LinuxPatchExecutor{packageManager: "zypper"}
	ctx := context.Background()

	result := executor.InstallPatch(ctx, "bash", models.PatchOptions{})

	testutil.AssertNotEmpty(t, result.Message, "Should have message")
}

// TestInstallPatch_Pacman_Success tests pacman package manager
func TestInstallPatch_Pacman_Success(t *testing.T) {
	executor := &LinuxPatchExecutor{packageManager: "pacman"}
	ctx := context.Background()

	result := executor.InstallPatch(ctx, "bash", models.PatchOptions{})

	testutil.AssertNotEmpty(t, result.Message, "Should have message")
}

// TestInstallPatch_UnsupportedPackageManager tests unsupported package manager
func TestInstallPatch_UnsupportedPackageManager(t *testing.T) {
	executor := &LinuxPatchExecutor{packageManager: "unknown-pm"}
	ctx := context.Background()

	result := executor.InstallPatch(ctx, "pkg", models.PatchOptions{})

	testutil.AssertFalse(t, result.Success, "Should fail for unsupported package manager")
	testutil.AssertContains(t, result.ErrorMessage, "Unsupported", "Should mention unsupported")
}

// TestUninstallPatch tests patch uninstallation (not supported on Linux)
func TestUninstallPatch(t *testing.T) {
	executor := &LinuxPatchExecutor{packageManager: "apt-get"}
	ctx := context.Background()

	result := executor.UninstallPatch(ctx, "some-package")

	testutil.AssertFalse(t, result.Success, "Uninstall should not be supported")
	testutil.AssertContains(t, result.Message, "not supported", "Should mention not supported")
}

// TestInstallAllPatches_Apt_Success tests installing all updates via apt
func TestInstallAllPatches_Apt_Success(t *testing.T) {
	executor := &LinuxPatchExecutor{packageManager: "apt-get"}
	ctx := context.Background()

	result := executor.InstallAllPatches(ctx, models.PatchOptions{AllowReboot: false})

	testutil.AssertNotEmpty(t, result.Message, "Should have message")
	testutil.AssertGreaterThan(t, result.Duration, int64(0), "Expected non-zero duration")
}

// TestInstallAllPatches_Apt_WithReboot tests dist-upgrade with reboot allowed
func TestInstallAllPatches_Apt_WithReboot(t *testing.T) {
	executor := &LinuxPatchExecutor{packageManager: "apt-get"}
	ctx := context.Background()

	result := executor.InstallAllPatches(ctx, models.PatchOptions{AllowReboot: true})

	testutil.AssertNotEmpty(t, result.Message, "Should have message")
}

// TestInstallAllPatches_Timeout tests timeout during mass update
func TestInstallAllPatches_Timeout(t *testing.T) {
	executor := &LinuxPatchExecutor{packageManager: "apt-get"}

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Nanosecond)
	defer cancel()

	result := executor.InstallAllPatches(ctx, models.PatchOptions{})

	testutil.AssertFalse(t, result.Success, "Should fail on timeout")
	testutil.AssertEqual(t, models.ErrTimeout, result.ErrorCode, "Should have timeout error")
}

// TestListAvailablePatches_Apt tests listing available updates via apt
func TestListAvailablePatches_Apt(t *testing.T) {
	executor := &LinuxPatchExecutor{packageManager: "apt-get"}
	ctx := context.Background()

	patches, err := executor.ListAvailablePatches(ctx)

	testutil.AssertNoError(t, err, "Should not error")
	// patches may be empty or have items depending on system state
	testutil.AssertNotNil(t, patches, "Patches should not be nil")
}

// TestListAvailablePatches_Timeout tests timeout during list operation
func TestListAvailablePatches_Timeout(t *testing.T) {
	executor := &LinuxPatchExecutor{packageManager: "apt-get"}

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Nanosecond)
	defer cancel()

	_, err := executor.ListAvailablePatches(ctx)

	testutil.AssertError(t, err, "Should error on timeout")
}

// TestCheckRebootRequired tests reboot detection
func TestCheckRebootRequired(t *testing.T) {
	executor := &LinuxPatchExecutor{packageManager: "apt-get"}
	ctx := context.Background()

	rebootNeeded := executor.CheckRebootRequired(ctx)

	// Result will vary based on system state, just verify it doesn't panic
	_ = rebootNeeded
}

// TestClassifyPatchError tests error classification
func TestClassifyPatchError(t *testing.T) {
	tests := []struct {
		name          string
		err           error
		output        string
		expectedCode  string
		expectedRetry bool
	}{
		{
			name:          "Permission denied",
			err:           errors.New("permission denied"),
			output:        "",
			expectedCode:  models.ErrPermissionDenied,
			expectedRetry: false,
		},
		{
			name:          "Package not found",
			err:           errors.New("unable to locate package"),
			output:        "",
			expectedCode:  models.ErrPackageNotFound,
			expectedRetry: false,
		},
		{
			name:          "Network failure",
			err:           errors.New("failed to fetch"),
			output:        "",
			expectedCode:  models.ErrNetworkFailure,
			expectedRetry: true,
		},
		{
			name:          "Disk full",
			err:           errors.New("no space left on device"),
			output:        "",
			expectedCode:  models.ErrDiskFull,
			expectedRetry: false,
		},
		{
			name:          "Dependency error",
			err:           errors.New("unmet dependencies"),
			output:        "",
			expectedCode:  models.ErrDependencyMissing,
			expectedRetry: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			code, _ := classifyPatchError(tt.err, tt.output)
			testutil.AssertEqual(t, tt.expectedCode, code, "Error code should match")

			retryable := models.IsRetryableError(code)
			testutil.AssertEqual(t, tt.expectedRetry, retryable, "Retryable should match")
		})
	}
}
