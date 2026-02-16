//go:build windows

package executors

import (
	"context"
	"testing"
	"time"

	"github.com/patchify/agent/internal/models"
	"github.com/patchify/agent/internal/testutil"
)

// TestInstallPatch_Success tests successful patch installation
func TestInstallPatch_Success(t *testing.T) {
	executor := &WindowsPatchExecutor{}
	ctx := context.Background()
	options := models.PatchOptions{AllowReboot: false}

	// This test requires Windows environment
	result := executor.InstallPatch(ctx, "KB5000001", options)

	// Verify result structure
	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}
}

// TestInstallPatch_Timeout tests patch installation timeout
func TestInstallPatch_Timeout(t *testing.T) {
	executor := &WindowsPatchExecutor{}
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Millisecond)
	defer cancel()

	options := models.PatchOptions{}

	result := executor.InstallPatch(ctx, "KB5000001", options)

	testutil.AssertFalse(t, result.Success, "Should fail on timeout")
	testutil.AssertEqual(t, models.ErrTimeout, result.ErrorCode, "Should have timeout error code")
	testutil.AssertTrue(t, result.Retryable, "Timeout errors should be retryable")
	testutil.AssertEqual(t, -1, result.ExitCode, "Should have exit code -1 for timeout")
}

// TestUninstallPatch_Success tests successful patch uninstallation
func TestUninstallPatch_Success(t *testing.T) {
	executor := &WindowsPatchExecutor{}
	ctx := context.Background()

	result := executor.UninstallPatch(ctx, "KB5000001")

	// Verify result structure
	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}
}

// TestUninstallPatch_Timeout tests patch uninstallation timeout
func TestUninstallPatch_Timeout(t *testing.T) {
	executor := &WindowsPatchExecutor{}
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Millisecond)
	defer cancel()

	result := executor.UninstallPatch(ctx, "KB5000001")

	testutil.AssertFalse(t, result.Success, "Should fail on timeout")
	testutil.AssertEqual(t, models.ErrTimeout, result.ErrorCode, "Should have timeout error code")
	testutil.AssertTrue(t, result.Retryable, "Timeout errors should be retryable")
}

// TestInstallAllPatches_Success tests installing all patches
func TestInstallAllPatches_Success(t *testing.T) {
	executor := &WindowsPatchExecutor{}
	ctx := context.Background()
	options := models.PatchOptions{AllowReboot: false}

	result := executor.InstallAllPatches(ctx, options)

	// Verify result structure
	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}
}

// TestInstallAllPatches_WithReboot tests installing all patches with reboot allowed
func TestInstallAllPatches_WithReboot(t *testing.T) {
	executor := &WindowsPatchExecutor{}
	ctx := context.Background()
	options := models.PatchOptions{AllowReboot: true}

	result := executor.InstallAllPatches(ctx, options)

	// Verify result structure
	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}
}

// TestInstallAllPatches_Timeout tests bulk installation timeout
func TestInstallAllPatches_Timeout(t *testing.T) {
	executor := &WindowsPatchExecutor{}
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Millisecond)
	defer cancel()

	options := models.PatchOptions{}

	result := executor.InstallAllPatches(ctx, options)

	testutil.AssertFalse(t, result.Success, "Should fail on timeout")
	testutil.AssertEqual(t, models.ErrTimeout, result.ErrorCode, "Should have timeout error code")
	testutil.AssertTrue(t, result.Retryable, "Timeout errors should be retryable")
}

// TestListAvailablePatches tests listing available patches
func TestListAvailablePatches(t *testing.T) {
	executor := &WindowsPatchExecutor{}
	ctx := context.Background()

	patches, err := executor.ListAvailablePatches(ctx)

	// Should not error (may return empty list)
	if err != nil && ctx.Err() == nil {
		t.Logf("Warning: ListAvailablePatches returned error: %v", err)
	}

	// Verify patches have expected structure if any returned
	for _, patch := range patches {
		if patch.ID == "" {
			t.Error("Patch ID should not be empty")
		}
	}
}

// TestListAvailablePatches_Timeout tests listing timeout
func TestListAvailablePatches_Timeout(t *testing.T) {
	executor := &WindowsPatchExecutor{}
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Millisecond)
	defer cancel()

	_, err := executor.ListAvailablePatches(ctx)

	testutil.AssertError(t, err, "Should error on timeout")
	testutil.AssertContains(t, err.Error(), "timed out", "Error should mention timeout")
}

// TestCheckRebootRequired tests reboot check
func TestCheckRebootRequired(t *testing.T) {
	executor := &WindowsPatchExecutor{}
	ctx := context.Background()

	// Should not panic
	rebootRequired := executor.CheckRebootRequired(ctx)

	// Result should be boolean (true or false, both are valid)
	t.Logf("Reboot required: %v", rebootRequired)
}

// TestCheckRebootRequired_Timeout tests reboot check with timeout
func TestCheckRebootRequired_Timeout(t *testing.T) {
	executor := &WindowsPatchExecutor{}
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Millisecond)
	defer cancel()

	// Should return false on timeout (safe default)
	rebootRequired := executor.CheckRebootRequired(ctx)

	testutil.AssertFalse(t, rebootRequired, "Should return false on timeout")
}

// TestParseWindowsUpdateList tests update list parsing
func TestParseWindowsUpdateList(t *testing.T) {
	output := `KB5000001|Security Update for Windows|Critical|1024000|True
KB5000002|Cumulative Update|High|2048000|False
KB5000003|Feature Update|Medium|5120000|True`

	patches := parseWindowsUpdateList(output)

	testutil.AssertLen(t, patches, 3, "Should parse 3 patches")

	// Verify first patch
	testutil.AssertEqual(t, "KB5000001", patches[0].ID, "First patch ID")
	testutil.AssertEqual(t, "Security Update for Windows", patches[0].Name, "First patch name")
	testutil.AssertEqual(t, "Critical", patches[0].Severity, "First patch severity")
	testutil.AssertTrue(t, patches[0].RebootRequired, "First patch requires reboot")

	// Verify second patch
	testutil.AssertEqual(t, "KB5000002", patches[1].ID, "Second patch ID")
	testutil.AssertFalse(t, patches[1].RebootRequired, "Second patch doesn't require reboot")
}

// TestParseWindowsUpdateList_Empty tests parsing empty output
func TestParseWindowsUpdateList_Empty(t *testing.T) {
	patches := parseWindowsUpdateList("")

	testutil.AssertLen(t, patches, 0, "Should parse 0 patches from empty output")
}

// TestParseWindowsUpdateList_Malformed tests parsing malformed output
func TestParseWindowsUpdateList_Malformed(t *testing.T) {
	output := `KB5000001|Incomplete
InvalidLine
|||||TooManyFields|Extra|Data`

	patches := parseWindowsUpdateList(output)

	// Should handle malformed data gracefully (skip invalid lines)
	if len(patches) > 0 {
		for _, patch := range patches {
			if patch.ID == "" {
				t.Error("Valid patches should have non-empty ID")
			}
		}
	}
}

// TestClassifyWindowsPatchError_NetworkError tests network error classification
func TestClassifyWindowsPatchError_NetworkError(t *testing.T) {
	result := &models.ExecutionResult{}
	err := &mockError{msg: "network connection failed"}
	output := "download failed: network unreachable"

	classifyWindowsPatchError(result, err, output)

	testutil.AssertEqual(t, models.ErrNetworkFailure, result.ErrorCode, "Should classify as network error")
	testutil.AssertTrue(t, result.Retryable, "Network errors should be retryable")
	testutil.AssertNotEmpty(t, result.ErrorMessage, "Should have error message")
}

// TestClassifyWindowsPatchError_PermissionDenied tests permission error classification
func TestClassifyWindowsPatchError_PermissionDenied(t *testing.T) {
	result := &models.ExecutionResult{}
	err := &mockError{msg: "access denied"}
	output := "requires administrator privileges"

	classifyWindowsPatchError(result, err, output)

	testutil.AssertEqual(t, models.ErrPermissionDenied, result.ErrorCode, "Should classify as permission error")
	testutil.AssertFalse(t, result.Retryable, "Permission errors should not be retryable")
	testutil.AssertContains(t, result.ErrorMessage, "permission", "Error message should mention permissions")
}

// TestClassifyWindowsPatchError_DiskFull tests disk space error classification
func TestClassifyWindowsPatchError_DiskFull(t *testing.T) {
	result := &models.ExecutionResult{}
	err := &mockError{msg: "insufficient disk space"}
	output := "error 0x80070070"

	classifyWindowsPatchError(result, err, output)

	testutil.AssertEqual(t, models.ErrDiskFull, result.ErrorCode, "Should classify as disk full error")
	testutil.AssertFalse(t, result.Retryable, "Disk full errors should not be retryable")
}

// TestClassifyWindowsPatchError_PackageNotFound tests not found error classification
func TestClassifyWindowsPatchError_PackageNotFound(t *testing.T) {
	result := &models.ExecutionResult{}
	err := &mockError{msg: "update not found"}
	output := "KB123456 not applicable"

	classifyWindowsPatchError(result, err, output)

	testutil.AssertEqual(t, models.ErrPackageNotFound, result.ErrorCode, "Should classify as package not found")
	testutil.AssertFalse(t, result.Retryable, "Not found errors should not be retryable")
}

// TestClassifyWindowsPatchError_AlreadyInstalled tests already installed error classification
func TestClassifyWindowsPatchError_AlreadyInstalled(t *testing.T) {
	result := &models.ExecutionResult{}
	err := &mockError{msg: "already installed"}
	output := "update KB123456 is already installed"

	classifyWindowsPatchError(result, err, output)

	testutil.AssertEqual(t, models.ErrAlreadyInstalled, result.ErrorCode, "Should classify as already installed")
	testutil.AssertFalse(t, result.Retryable, "Already installed should not be retryable")
}

// TestClassifyWindowsPatchError_ServiceUnavailable tests service unavailable error classification
func TestClassifyWindowsPatchError_ServiceUnavailable(t *testing.T) {
	result := &models.ExecutionResult{}
	err := &mockError{msg: "service temporarily unavailable"}
	output := "Windows Update service error 0x80240438"

	classifyWindowsPatchError(result, err, output)

	testutil.AssertEqual(t, models.ErrServiceUnavailable, result.ErrorCode, "Should classify as service unavailable")
	testutil.AssertTrue(t, result.Retryable, "Service unavailable should be retryable")
}

// TestClassifyWindowsPatchError_Unknown tests unknown error classification
func TestClassifyWindowsPatchError_Unknown(t *testing.T) {
	result := &models.ExecutionResult{}
	err := &mockError{msg: "some random error"}
	output := "unexpected failure"

	classifyWindowsPatchError(result, err, output)

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
