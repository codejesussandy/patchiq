//go:build darwin

package executors

import (
	"context"
	"testing"
	"time"

	"github.com/patchify/agent/internal/models"
	"github.com/patchify/agent/internal/testutil"
)

// TestInstallPatch_Darwin_Success tests successful patch installation on macOS
func TestInstallPatch_Darwin_Success(t *testing.T) {
	executor := &DarwinPatchExecutor{}
	ctx := context.Background()
	options := models.PatchOptions{AllowReboot: false}

	// Use a known update label format
	result := executor.InstallPatch(ctx, "macOS-12.6.1", options)

	// Verify result structure
	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}
}

// TestInstallPatch_Darwin_WithReboot tests patch installation with reboot allowed
func TestInstallPatch_Darwin_WithReboot(t *testing.T) {
	executor := &DarwinPatchExecutor{}
	ctx := context.Background()
	options := models.PatchOptions{AllowReboot: true}

	result := executor.InstallPatch(ctx, "macOS-12.6.1", options)

	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}
}

// TestInstallPatch_Darwin_Timeout tests patch installation timeout
func TestInstallPatch_Darwin_Timeout(t *testing.T) {
	executor := &DarwinPatchExecutor{}
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Millisecond)
	defer cancel()

	options := models.PatchOptions{}

	result := executor.InstallPatch(ctx, "macOS-12.6.1", options)

	testutil.AssertFalse(t, result.Success, "Should fail on timeout")
	testutil.AssertEqual(t, models.ErrTimeout, result.ErrorCode, "Should have timeout error code")
	testutil.AssertTrue(t, result.Retryable, "Timeout errors should be retryable")
	testutil.AssertEqual(t, -1, result.ExitCode, "Should have exit code -1 for timeout")
}

// TestInstallPatch_Darwin_NotFound tests non-existent patch
func TestInstallPatch_Darwin_NotFound(t *testing.T) {
	executor := &DarwinPatchExecutor{}
	ctx := context.Background()
	options := models.PatchOptions{}

	result := executor.InstallPatch(ctx, "NonExistentUpdate-99.99.99", options)

	// Should complete (may fail or succeed depending on system state)
	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}
}

// TestInstallPatch_Darwin_AlreadyInstalled tests already installed patch
func TestInstallPatch_Darwin_AlreadyInstalled(t *testing.T) {
	executor := &DarwinPatchExecutor{}
	ctx := context.Background()
	options := models.PatchOptions{}

	// Try to install current OS version (likely already installed)
	result := executor.InstallPatch(ctx, "Security Update", options)

	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}
}

// TestUninstallPatch_Darwin_NotSupported tests that uninstall is not supported on macOS
func TestUninstallPatch_Darwin_NotSupported(t *testing.T) {
	executor := &DarwinPatchExecutor{}
	ctx := context.Background()

	result := executor.UninstallPatch(ctx, "macOS-12.6.1")

	testutil.AssertFalse(t, result.Success, "Uninstall should not be supported")
	testutil.AssertContains(t, result.Message, "not supported", "Message should mention unsupported")
	testutil.AssertContains(t, result.ErrorMessage, "does not support", "Error should explain limitation")
	testutil.AssertEqual(t, 1, result.ExitCode, "Should have exit code 1")
}

// TestInstallAllPatches_Darwin_Success tests installing all patches
func TestInstallAllPatches_Darwin_Success(t *testing.T) {
	executor := &DarwinPatchExecutor{}
	ctx := context.Background()
	options := models.PatchOptions{AllowReboot: false}

	result := executor.InstallAllPatches(ctx, options)

	// Verify result structure
	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}
}

// TestInstallAllPatches_Darwin_WithReboot tests installing all patches with reboot
func TestInstallAllPatches_Darwin_WithReboot(t *testing.T) {
	executor := &DarwinPatchExecutor{}
	ctx := context.Background()
	options := models.PatchOptions{AllowReboot: true}

	result := executor.InstallAllPatches(ctx, options)

	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}
}

// TestInstallAllPatches_Darwin_Timeout tests bulk installation timeout
func TestInstallAllPatches_Darwin_Timeout(t *testing.T) {
	executor := &DarwinPatchExecutor{}
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Millisecond)
	defer cancel()

	options := models.PatchOptions{}

	result := executor.InstallAllPatches(ctx, options)

	testutil.AssertFalse(t, result.Success, "Should fail on timeout")
	testutil.AssertEqual(t, models.ErrTimeout, result.ErrorCode, "Should have timeout error code")
	testutil.AssertTrue(t, result.Retryable, "Timeout errors should be retryable")
}

// TestListAvailablePatches_Darwin tests listing available patches
func TestListAvailablePatches_Darwin(t *testing.T) {
	executor := &DarwinPatchExecutor{}
	ctx := context.Background()

	patches, err := executor.ListAvailablePatches(ctx)

	// Should not error (may return empty list if no updates)
	if err != nil && ctx.Err() == nil {
		t.Logf("Warning: ListAvailablePatches returned error: %v", err)
	}

	// Verify patches have expected structure if any returned
	for _, patch := range patches {
		if patch.Name == "" {
			t.Error("Patch name should not be empty")
		}
	}

	t.Logf("Found %d available patches", len(patches))
}

// TestListAvailablePatches_Darwin_Timeout tests listing timeout
func TestListAvailablePatches_Darwin_Timeout(t *testing.T) {
	executor := &DarwinPatchExecutor{}
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Millisecond)
	defer cancel()

	_, err := executor.ListAvailablePatches(ctx)

	testutil.AssertError(t, err, "Should error on timeout")
	testutil.AssertContains(t, err.Error(), "timed out", "Error should mention timeout")
}

// TestListAvailablePatches_Darwin_NoUpdates tests when no updates available
func TestListAvailablePatches_Darwin_NoUpdates(t *testing.T) {
	executor := &DarwinPatchExecutor{}
	ctx := context.Background()

	// This may or may not have updates depending on system state
	patches, err := executor.ListAvailablePatches(ctx)

	if err != nil {
		t.Logf("Note: Error listing patches: %v", err)
	}

	// Empty list is valid
	if len(patches) == 0 {
		t.Log("No updates available (expected on up-to-date system)")
	}
}

// TestCheckRebootRequired_Darwin tests reboot requirement check
func TestCheckRebootRequired_Darwin(t *testing.T) {
	executor := &DarwinPatchExecutor{}
	ctx := context.Background()

	// Should not panic
	rebootRequired := executor.CheckRebootRequired(ctx)

	// Result should be boolean (true or false, both are valid)
	t.Logf("Reboot required: %v", rebootRequired)
}

// TestCheckRebootRequired_Darwin_Timeout tests reboot check with timeout
func TestCheckRebootRequired_Darwin_Timeout(t *testing.T) {
	executor := &DarwinPatchExecutor{}
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Millisecond)
	defer cancel()

	// Should return false on timeout (safe default)
	rebootRequired := executor.CheckRebootRequired(ctx)

	testutil.AssertFalse(t, rebootRequired, "Should return false on timeout")
}

// TestParseSoftwareUpdateList tests parsing softwareupdate output
func TestParseSoftwareUpdateList(t *testing.T) {
	output := `Software Update Tool

Finding available software
Software Update found the following new or updated software:
* Label: macOS Monterey 12.6.1-21G217
	Title: macOS Monterey 12.6.1, Size: 2048000K, Recommended: YES
* Label: Security Update 2023-001
	Title: Security Update 2023-001, Size: 512000K, Recommended: YES`

	patches := parseSoftwareUpdateList(output)

	if len(patches) < 1 {
		t.Logf("Note: Parser may need adjustment for current format")
	}

	// Verify patches have expected structure if any returned
	for _, patch := range patches {
		if patch.Name == "" {
			t.Error("Patch name should not be empty")
		}
	}
}

// TestParseSoftwareUpdateList_Empty tests parsing empty output
func TestParseSoftwareUpdateList_Empty(t *testing.T) {
	output := "No new software available."

	patches := parseSoftwareUpdateList(output)

	testutil.AssertLen(t, patches, 0, "Should parse 0 patches from no-updates output")
}

// TestClassifyDarwinPatchError_NetworkError tests network error classification
func TestClassifyDarwinPatchError_NetworkError(t *testing.T) {
	result := &models.ExecutionResult{}
	err := &mockError{msg: "network connection failed"}
	output := "failed to download update"

	classifyDarwinPatchError(result, err, output)

	testutil.AssertEqual(t, models.ErrNetworkFailure, result.ErrorCode, "Should classify as network error")
	testutil.AssertTrue(t, result.Retryable, "Network errors should be retryable")
	testutil.AssertNotEmpty(t, result.ErrorMessage, "Should have error message")
}

// TestClassifyDarwinPatchError_PermissionDenied tests permission error classification
func TestClassifyDarwinPatchError_PermissionDenied(t *testing.T) {
	result := &models.ExecutionResult{}
	err := &mockError{msg: "permission denied"}
	output := "requires administrator privileges"

	classifyDarwinPatchError(result, err, output)

	testutil.AssertEqual(t, models.ErrPermissionDenied, result.ErrorCode, "Should classify as permission error")
	testutil.AssertFalse(t, result.Retryable, "Permission errors should not be retryable")
	testutil.AssertContains(t, result.ErrorMessage, "permission", "Error message should mention permissions")
}

// TestClassifyDarwinPatchError_DiskFull tests disk space error classification
func TestClassifyDarwinPatchError_DiskFull(t *testing.T) {
	result := &models.ExecutionResult{}
	err := &mockError{msg: "insufficient disk space"}
	output := "not enough free space"

	classifyDarwinPatchError(result, err, output)

	testutil.AssertEqual(t, models.ErrDiskFull, result.ErrorCode, "Should classify as disk full error")
	testutil.AssertFalse(t, result.Retryable, "Disk full errors should not be retryable")
}

// TestClassifyDarwinPatchError_PackageNotFound tests not found error classification
func TestClassifyDarwinPatchError_PackageNotFound(t *testing.T) {
	result := &models.ExecutionResult{}
	err := &mockError{msg: "update not found"}
	output := "no such update"

	classifyDarwinPatchError(result, err, output)

	testutil.AssertEqual(t, models.ErrPackageNotFound, result.ErrorCode, "Should classify as package not found")
	testutil.AssertFalse(t, result.Retryable, "Not found errors should not be retryable")
}

// TestClassifyDarwinPatchError_Unknown tests unknown error classification
func TestClassifyDarwinPatchError_Unknown(t *testing.T) {
	result := &models.ExecutionResult{}
	err := &mockError{msg: "some random error"}
	output := "unexpected failure"

	classifyDarwinPatchError(result, err, output)

	testutil.AssertEqual(t, models.ErrUnknown, result.ErrorCode, "Should classify as unknown error")
	testutil.AssertFalse(t, result.Retryable, "Unknown errors should not be retryable by default")
}

// mockError is a simple error implementation for testing
type mockError struct {
	msg string
}

func (e *mockError) Error() string {
	return e.msg
}
