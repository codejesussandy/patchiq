//go:build windows

package executors

import (
	"context"
	"fmt"
	"testing"

	"github.com/patchify/agent/internal/models"
	"github.com/patchify/agent/internal/testutil"
)

// TestInstallPatch_PSWindowsUpdate tests patch installation with PSWindowsUpdate module
func TestInstallPatch_PSWindowsUpdate(t *testing.T) {
	executor := NewWindowsPatchExecutor()
	ctx := context.Background()

	options := models.PatchOptions{
		AllowReboot: false,
		Force:       false,
	}

	// Test with a KB number
	result := executor.InstallPatch(ctx, "KB5000001", options)

	// Verify result structure
	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}

	// Log output for debugging
	t.Logf("Result: success=%v, message=%s, exitCode=%d", result.Success, result.Message, result.ExitCode)
	if result.Output != "" {
		t.Logf("Output: %s", result.Output)
	}
}

// TestInstallPatch_UpdateNotFound tests handling of non-existent update
func TestInstallPatch_UpdateNotFound(t *testing.T) {
	executor := NewWindowsPatchExecutor()
	ctx := context.Background()

	options := models.PatchOptions{
		AllowReboot: false,
	}

	// Use a KB number that definitely doesn't exist
	result := executor.InstallPatch(ctx, "KB9999999", options)

	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}

	// Should handle gracefully with appropriate error
	if result.Success {
		t.Log("Update might have been found (unlikely) or already installed")
	}
}

// TestInstallAllPatches tests installing all available patches
func TestInstallAllPatches(t *testing.T) {
	executor := NewWindowsPatchExecutor()
	ctx := context.Background()

	options := models.PatchOptions{
		AllowReboot: false,
	}

	result := executor.InstallAllPatches(ctx, options)

	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}

	t.Logf("Result: success=%v, message=%s", result.Success, result.Message)
}

// TestInstallAllPatches_WithReboot tests allowing reboot
func TestInstallAllPatches_WithReboot(t *testing.T) {
	// This test is dangerous as it might actually reboot the system
	t.Skip("Skipping - would reboot system if patches require it")

	executor := NewWindowsPatchExecutor()
	ctx := context.Background()

	options := models.PatchOptions{
		AllowReboot: true,
	}

	result := executor.InstallAllPatches(ctx, options)

	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}
}

// TestListAvailablePatches tests listing available updates
func TestListAvailablePatches(t *testing.T) {
	executor := NewWindowsPatchExecutor()
	ctx := context.Background()

	patches, err := executor.ListAvailablePatches(ctx)
	if err != nil {
		t.Fatalf("Failed to list patches: %v", err)
	}

	t.Logf("Found %d available patches", len(patches))

	for i, patch := range patches {
		if i >= 5 {
			t.Logf("... and %d more", len(patches)-5)
			break
		}
		t.Logf("Patch: %s - %s (severity: %s, reboot: %v, size: %d bytes)",
			patch.ID, patch.Name, patch.Severity, patch.RebootRequired, patch.Size)
	}
}

// TestCheckRebootRequired tests reboot detection
func TestCheckRebootRequired(t *testing.T) {
	executor := NewWindowsPatchExecutor()
	ctx := context.Background()

	rebootRequired := executor.CheckRebootRequired(ctx)

	t.Logf("System reboot required: %v", rebootRequired)

	// This is informational, not asserting anything as it depends on system state
}

// TestUninstallPatch tests patch uninstallation
func TestUninstallPatch(t *testing.T) {
	executor := NewWindowsPatchExecutor()
	ctx := context.Background()

	// Try to uninstall a patch (will likely fail as patch isn't installed)
	result := executor.UninstallPatch(ctx, "KB9999999")

	if result.Duration == 0 {
		t.Error("Expected non-zero duration")
	}

	t.Logf("Uninstall result: success=%v, message=%s", result.Success, result.Message)
}

// TestUninstallPatch_InvalidKB tests uninstalling with invalid KB format
func TestUninstallPatch_InvalidKB(t *testing.T) {
	executor := NewWindowsPatchExecutor()
	ctx := context.Background()

	// Test with KB prefix
	result1 := executor.UninstallPatch(ctx, "KB1234567")
	if result1.Duration == 0 {
		t.Error("Expected non-zero duration for KB prefix test")
	}

	// Test without KB prefix (should be handled)
	result2 := executor.UninstallPatch(ctx, "1234567")
	if result2.Duration == 0 {
		t.Error("Expected non-zero duration for number-only test")
	}
}

// TestClassifyWindowsPatchError tests Windows patch error classification
func TestClassifyWindowsPatchError(t *testing.T) {
	tests := []struct {
		name          string
		err           error
		output        string
		expectedCode  string
		expectedRetry bool
	}{
		{
			name:          "network error",
			err:           &mockError{msg: "connection failed"},
			output:        "unreachable",
			expectedCode:  models.ErrNetworkFailure,
			expectedRetry: true,
		},
		{
			name:          "permission denied",
			err:           &mockError{msg: "access denied"},
			output:        "administrator required",
			expectedCode:  models.ErrPermissionDenied,
			expectedRetry: false,
		},
		{
			name:          "disk full",
			err:           &mockError{msg: "insufficient space"},
			output:        "0x80070070",
			expectedCode:  models.ErrDiskFull,
			expectedRetry: false,
		},
		{
			name:          "update not found",
			err:           &mockError{msg: "update not found"},
			output:        "0x80240017",
			expectedCode:  models.ErrPackageNotFound,
			expectedRetry: false,
		},
		{
			name:          "already installed",
			err:           &mockError{msg: "already installed"},
			output:        "0x80240006",
			expectedCode:  models.ErrAlreadyInstalled,
			expectedRetry: false,
		},
		{
			name:          "service unavailable",
			err:           &mockError{msg: "service error"},
			output:        "0x80240438",
			expectedCode:  models.ErrServiceUnavailable,
			expectedRetry: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := &models.ExecutionResult{}
			classifyWindowsPatchError(result, tt.err, tt.output)

			testutil.AssertEqual(t, tt.expectedCode, result.ErrorCode, "Error code mismatch")
			testutil.AssertEqual(t, tt.expectedRetry, result.Retryable, "Retryable mismatch")
			testutil.AssertNotEmpty(t, result.ErrorMessage, "Error message should not be empty")
		})
	}
}

// TestInstallPatch_Timeout tests timeout handling
func TestInstallPatch_Timeout(t *testing.T) {
	executor := NewWindowsPatchExecutor()

	// Create a context with very short timeout
	ctx, cancel := context.WithTimeout(context.Background(), 1)
	defer cancel()

	options := models.PatchOptions{
		AllowReboot: false,
	}

	result := executor.InstallPatch(ctx, "KB5000001", options)

	// Should timeout
	if result.Success {
		t.Error("Expected timeout, but got success")
	}

	if result.ErrorCode != models.ErrTimeout {
		t.Logf("Expected timeout error code, got: %s", result.ErrorCode)
	}
}

// TestParseWindowsUpdateList tests parsing Windows Update output
func TestParseWindowsUpdateList(t *testing.T) {
	output := `KB5000001|Security Update for Windows|Critical|1048576|True
KB5000002|Update for Windows Defender|Important|524288|False
KB5000003|Quality Update|Moderate|2097152|True`

	patches := parseWindowsUpdateList(output)

	testutil.AssertEqual(t, 3, len(patches), "Should parse 3 patches")

	// Verify first patch
	testutil.AssertEqual(t, "KB5000001", patches[0].ID, "First patch ID mismatch")
	testutil.AssertEqual(t, "Security Update for Windows", patches[0].Name, "First patch name mismatch")
	testutil.AssertEqual(t, "Critical", patches[0].Severity, "First patch severity mismatch")
	testutil.AssertEqual(t, int64(1048576), patches[0].Size, "First patch size mismatch")
	testutil.AssertEqual(t, true, patches[0].RebootRequired, "First patch reboot flag mismatch")

	// Verify second patch
	testutil.AssertEqual(t, false, patches[1].RebootRequired, "Second patch should not require reboot")

	// Verify third patch
	testutil.AssertEqual(t, int64(2097152), patches[2].Size, "Third patch size mismatch")
}

// TestParseWindowsUpdateList_Empty tests empty output
func TestParseWindowsUpdateList_Empty(t *testing.T) {
	output := ""
	patches := parseWindowsUpdateList(output)

	testutil.AssertEqual(t, 0, len(patches), "Should return empty list for empty input")
}

// TestParseWindowsUpdateList_Malformed tests malformed output
func TestParseWindowsUpdateList_Malformed(t *testing.T) {
	output := `KB5000001|Security Update`
	patches := parseWindowsUpdateList(output)

	// Should handle gracefully (skip malformed lines)
	t.Logf("Parsed %d patches from malformed input", len(patches))
}

// Benchmark patch listing
func BenchmarkListAvailablePatches(b *testing.B) {
	executor := NewWindowsPatchExecutor()
	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		executor.ListAvailablePatches(ctx)
	}
}

// Benchmark reboot check
func BenchmarkCheckRebootRequired(b *testing.B) {
	executor := NewWindowsPatchExecutor()
	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		executor.CheckRebootRequired(ctx)
	}
}
