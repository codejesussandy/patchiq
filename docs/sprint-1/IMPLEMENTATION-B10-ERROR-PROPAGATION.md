# Implementation: Priority 2, Task 10 - Enhanced Error Propagation

## Overview
Implemented structured error codes with retryable classification for intelligent error handling and automatic retry logic in the PatchIQ Go agent.

## Changes Made

### 1. Enhanced ExecutionResult Model
**File**: `/agent/internal/models/execution.go`

**New Fields**:
- `ErrorCode string` - Structured error code (e.g., "TIMEOUT", "NETWORK_FAILURE")
- `Retryable bool` - Whether the error is retryable
- `Metadata map[string]string` - Additional error context

**Error Code Constants** (15 total):
- `ErrTimeout` - Operation timed out (retryable)
- `ErrPermissionDenied` - Insufficient permissions (not retryable)
- `ErrDiskFull` - Insufficient disk space (not retryable)
- `ErrNetworkFailure` - Network connection issues (retryable)
- `ErrChecksumMismatch` - File checksum verification failed (not retryable)
- `ErrScriptNotFound` - Script file missing (not retryable)
- `ErrDependencyMissing` - Missing dependencies (not retryable)
- `ErrInvalidPayload` - Invalid request payload (not retryable)
- `ErrPackageNotFound` - Package not found (not retryable)
- `ErrServiceUnavailable` - Service temporarily unavailable (retryable)
- `ErrAlreadyInstalled` - Package already installed (not retryable)
- `ErrNotInstalled` - Package not installed (not retryable)
- `ErrIncompatible` - Incompatible version (not retryable)
- `ErrUserCancelled` - User cancelled operation (not retryable)
- `ErrUnknown` - Unknown error (not retryable)

**Helper Functions**:
- `IsRetryableError(code string) bool` - Determines if error code is retryable
- `NewSuccessResult(message string, duration int64) ExecutionResult` - Creates success result
- `NewErrorResult(errorCode, errorMessage string, duration int64) ExecutionResult` - Creates error result with proper classification

### 2. Backend Retry Logic
**File**: `/agent/internal/backend/backend.go`

**Manager Struct Enhancement**:
- Added `maxRetries int` field (default: 3)

**New Functions**:

#### `executeCommandWithRetry(cmd client.PendingCommand)`
Main retry wrapper with exponential backoff:
- Attempts command execution up to `maxRetries` times
- Implements exponential backoff (1s, 2s, 4s, ...)
- Only retries transient failures (network, timeout, service unavailable)
- Reports results and updates job history after final attempt or success
- Logs retry attempts for debugging

#### `isRetryableError(errMsg string) bool`
Pattern-based error classification for backward compatibility:
- Checks error message for retryable patterns
- Patterns: "timeout", "network", "connection refused", "service unavailable", etc.
- Returns `true` for transient failures, `false` otherwise

#### `updateJobHistory(commandID string, result *CommandResultRequest)`
Centralized job tracking update:
- Updates job status, result, and completion time
- Moves job from active to history
- Persists to job store

#### `executeCommandInternal(cmd client.PendingCommand) *CommandResultRequest`
Refactored from `executeCommand`:
- Executes command and returns result without reporting
- Job tracking initialization only (completion handled by retry wrapper)
- Supports all existing command types

**Retry Behavior**:
1. Execute command
2. If successful → report and return
3. If error is non-retryable → report and return
4. If retryable and attempts remaining → wait (exponential backoff) and retry
5. If max retries reached → report final failure

**Exponential Backoff Schedule**:
- Attempt 1: Immediate
- Attempt 2: 1 second wait
- Attempt 3: 2 seconds wait
- Total worst case: 3 attempts over ~3 seconds

### 3. Script Executor Error Classification
**File**: `/agent/internal/executors/script_executor.go`

**New Helper Functions**:

#### `isNetworkError(err error) bool`
Detects network-related errors by checking for patterns:
- "network", "connection", "timeout", "dial tcp", "unreachable", "no route to host", etc.

#### `classifyDownloadError(err error) (string, string)`
Classifies download errors into appropriate error codes:
- Network errors → `ErrNetworkFailure`
- Timeouts → `ErrTimeout`
- Checksum failures → `ErrChecksumMismatch`
- 404 errors → `ErrPackageNotFound`
- 403 errors → `ErrPermissionDenied`
- 503 errors → `ErrServiceUnavailable`
- Disk errors → `ErrDiskFull`
- Unknown → `ErrUnknown`

#### `setErrorResult(result *ExecutionResult, err error, defaultMsg string, duration int64)`
Sets error result with automatic classification:
- Calls `classifyDownloadError()` to determine error code
- Sets `ErrorCode`, `ErrorMessage`, `Retryable`, and `Duration` fields
- Ensures consistent error handling across executor

**Updated Error Cases**:
- Download errors for inline scripts
- Bundle download errors
- Bundle extraction errors (disk full detection)
- Script not found errors

### 4. Patch Executor Error Classification (Linux)
**File**: `/agent/internal/executors/patch_linux.go`

**New Helper Functions**:

#### `classifyPatchError(err error, output string) (string, string)`
Classifies patch installation errors by analyzing both error and command output:
- Permission errors → `ErrPermissionDenied`
- Package not found → `ErrPackageNotFound`
- Disk space → `ErrDiskFull`
- Network failures → `ErrNetworkFailure`
- Dependency issues → `ErrDependencyMissing`
- Already installed → `ErrAlreadyInstalled`
- Timeout → `ErrTimeout`
- Unknown → `ErrUnknown`

#### `setPatchErrorResult(result *ExecutionResult, err error, output string, duration int64)`
Sets patch error result with classification:
- Analyzes both error and command output for better accuracy
- Sets all error fields consistently
- Includes command output for debugging

**Updated Error Cases**:
- `InstallPatch()` - Package installation failures
- `UninstallPatch()` - Package removal failures
- Timeout handling with proper error codes

## Retry Logic Flow

```
┌─────────────────────────────┐
│ executeCommandWithRetry()   │
└──────────┬──────────────────┘
           │
           ├─> Attempt 1 ─────┐
           │                  │
           ├─> Check Result   │
           │    ├─ Success ──> Report & Return
           │    ├─ Non-Retryable ──> Report & Return
           │    └─ Retryable ──> Wait 1s
           │
           ├─> Attempt 2 ─────┐
           │                  │
           ├─> Check Result   │
           │    ├─ Success ──> Report & Return
           │    ├─ Non-Retryable ──> Report & Return
           │    └─ Retryable ──> Wait 2s
           │
           ├─> Attempt 3 ─────┐
           │                  │
           └─> Report Final Result
```

## Testing Recommendations

### Unit Tests
1. **ExecutionResult helpers**:
   - Test `IsRetryableError()` for all error codes
   - Test `NewSuccessResult()` and `NewErrorResult()`
   - Verify `Retryable` field matches error code classification

2. **Error classification**:
   - Test `classifyDownloadError()` with various error types
   - Test `classifyPatchError()` with real package manager output
   - Verify correct error codes are assigned

3. **Retry logic**:
   - Test retry behavior with transient failures
   - Test non-retryable errors skip retry
   - Test exponential backoff timing
   - Test max retry limit enforcement

### Integration Tests
1. **Network failures**:
   - Simulate network timeout during download
   - Verify retry with backoff
   - Verify success on second attempt

2. **Patch installation**:
   - Test permission denied (no retry)
   - Test network failure (retry)
   - Test package not found (no retry)

3. **Script execution**:
   - Test bundle download timeout (retry)
   - Test checksum mismatch (no retry)
   - Test script not found (no retry)

## Success Criteria Status

### Minimum (Required) ✅
- ✅ ExecutionResult has `ErrorCode` and `Retryable` fields
- ✅ Error code constants defined (15 codes)
- ✅ `IsRetryableError()` function implemented
- ✅ `NewSuccessResult()` and `NewErrorResult()` helpers
- ✅ Build succeeds

### Optional (Implemented) ✅
- ✅ Backend retry logic with exponential backoff
- ✅ Script executor error classification
- ✅ Patch executor error classification (Linux)
- ✅ Helper functions for error detection

## Files Modified

1. `/agent/internal/models/execution.go` - Enhanced ExecutionResult model
2. `/agent/internal/backend/backend.go` - Retry logic and error detection
3. `/agent/internal/executors/script_executor.go` - Download error classification
4. `/agent/internal/executors/patch_linux.go` - Patch error classification

## Backward Compatibility

All changes are backward compatible:
- Existing code without error codes continues to work
- New fields are optional in JSON responses
- Error message fallback for systems that don't check error codes
- Pattern-based retry detection works with old error messages

## Future Enhancements

1. **Structured error metadata**: Add details like HTTP status codes, package names, etc.
2. **Error metrics**: Track retry rates, error code frequencies
3. **Configurable retry policy**: Make `maxRetries` and backoff configurable per command type
4. **Windows/macOS error classification**: Extend to other patch executors
5. **Circuit breaker**: Prevent retry storms for systemic failures
6. **Error code propagation**: Pass error codes through full stack to frontend

## Example Usage

### Creating a Success Result
```go
result := models.NewSuccessResult("Package installed successfully", 1500)
// result.Success = true
// result.Message = "Package installed successfully"
// result.Duration = 1500
```

### Creating an Error Result
```go
result := models.NewErrorResult(
    models.ErrNetworkFailure,
    "Failed to download package: connection timeout",
    2000,
)
// result.Success = false
// result.ErrorCode = "NETWORK_FAILURE"
// result.ErrorMessage = "Failed to download package: connection timeout"
// result.Retryable = true
// result.Duration = 2000
```

### Checking Retryability
```go
if models.IsRetryableError(result.ErrorCode) {
    log.Printf("Error is retryable, will retry...")
}
```

## Conclusion

The enhanced error propagation system provides:
1. **Structured error handling** with 15 well-defined error codes
2. **Intelligent retry logic** that only retries transient failures
3. **Exponential backoff** to prevent overwhelming failing services
4. **Comprehensive error classification** for downloads and patch operations
5. **Full backward compatibility** with existing error handling

All changes compile successfully and are ready for testing.
