# Command Timeout Enforcement Implementation

## Summary
Implemented Priority 1, Task 1: Command Timeout Enforcement for the PatchIQ Go agent. Commands now have a configurable timeout (default 15 minutes) that prevents indefinite execution.

## Changes Made

### 1. Configuration (`agent/internal/config/config.go`)
- **Added**: `CommandTimeoutSeconds int` field to `Config` struct
- **Default**: 900 seconds (15 minutes) in `DefaultConfig()`
- Configurable via config file: `"commandTimeoutSeconds": 900`

### 2. Error Codes (`agent/internal/models/execution.go`)
- **Added**: `ErrTimeout = "TIMEOUT"` constant for timeout error identification
- Timeout errors will have `ErrorMessage: "TIMEOUT"` and `ExitCode: -1`

### 3. Executor Interfaces (`agent/internal/executors/executor.go`)
Updated all executor interfaces to accept `context.Context` as first parameter:

#### PatchExecutor
- `InstallPatch(ctx context.Context, patchID string, options models.PatchOptions)`
- `UninstallPatch(ctx context.Context, patchID string)`
- `InstallAllPatches(ctx context.Context, options models.PatchOptions)`
- `ListAvailablePatches(ctx context.Context)`
- `CheckRebootRequired(ctx context.Context)`

#### SoftwareExecutor
- `InstallSoftware(ctx context.Context, pkg models.SoftwarePackage)`
- `UninstallSoftware(ctx context.Context, name string)`
- `GetInstalledVersion(ctx context.Context, name string)`

#### RemoteAccessExecutor
- `Enable(ctx context.Context, config models.RemoteAccessConfig)`
- `Disable(ctx context.Context)`
- `GetStatus(ctx context.Context)`
- `SetPassword(ctx context.Context, password string)`

#### RollbackExecutor
- `SaveRollbackInfo(ctx context.Context, info models.RollbackInfo)`
- `GetRollbackInfo(ctx context.Context, rollbackID string)`
- `ListRollbackInfo(ctx context.Context)`
- `ExecuteRollback(ctx context.Context, rollbackID string, force bool)`
- `DeleteRollbackInfo(ctx context.Context, rollbackID string)`
- `CreateRollbackInfoForInstall(ctx context.Context, packageName, source, commandID string, software SoftwareExecutor)`

#### ScriptExecutor
- `ExecuteBundle(ctx context.Context, request models.ScriptBundleRequest)`
- `ExecuteInlineScript(ctx context.Context, script string, operationType string, requiresRoot bool, env map[string]string)`

### 4. Executor Implementations
Updated all platform-specific executor implementations to accept and use context:

#### Patch Executors
- `agent/internal/executors/patch_linux.go` - Manually updated with timeout handling
- `agent/internal/executors/patch_darwin.go` - Updated signatures
- `agent/internal/executors/patch_windows.go` - Updated signatures

#### Software Executors
- `agent/internal/executors/software_linux.go`
- `agent/internal/executors/software_darwin.go`
- `agent/internal/executors/software_windows.go`

#### Remote Access Executors
- `agent/internal/executors/remote_linux.go`
- `agent/internal/executors/remote_darwin.go`
- `agent/internal/executors/remote_windows.go`

#### Other Executors
- `agent/internal/executors/rollback.go`
- `agent/internal/executors/script_executor.go`

**Note**: The Linux patch executor (`patch_linux.go`) includes full timeout handling with:
- Context timeout checks before execution
- `exec.CommandContext()` for automatic process termination
- `ctx.Err() == context.DeadlineExceeded` detection
- Proper error messages using `models.ErrTimeout`

Other platform executors have context signatures but may need similar timeout handling added.

### 5. Backend Manager (`agent/internal/backend/backend.go`)
- **Added**: Context import
- **Modified**: `executeCommand()` function now creates context with timeout:
  ```go
  timeout := time.Duration(m.config.CommandTimeoutSeconds) * time.Second
  ctx, cancel := context.WithTimeout(context.Background(), timeout)
  defer cancel()
  ```
- **Updated**: All executor method calls to pass `ctx` as first parameter
- **Modified**: `GetRollbacks(ctx context.Context)` to accept context parameter

### 6. Server Package (`agent/internal/server/server.go`)
- **Updated**: `BackendStatus` interface to include context in method signatures
- **Modified**: All HTTP handlers to pass request context (`r.Context()`) to backend manager methods

### 7. Main Entry Point (`agent/cmd/agent/main.go`)
- **Added**: Context import
- **Updated**: `BackendAdapter` methods to accept and use context
- **Modified**: All backend manager method calls to pass context

## Timeout Behavior

### Command Execution Flow
1. Command received from backend server
2. `executeCommand()` creates context with configured timeout (default 15 min)
3. Context passed to executor methods
4. Executor uses `exec.CommandContext(ctx, ...)` for OS commands
5. If timeout exceeded:
   - Command process automatically killed
   - Executor returns result with:
     - `Success: false`
     - `ErrorMessage: "TIMEOUT"`
     - `Message: "Command execution timed out"`
     - `ExitCode: -1`
6. Timeout error reported back to backend server

### Configuration Example
```json
{
  "commandTimeoutSeconds": 900,
  "heartbeatIntervalSeconds": 60,
  "inventoryIntervalSeconds": 21600
}
```

## Testing Recommendations

1. **Verify timeout works**: Run long-running command with short timeout
2. **Test default behavior**: Ensure commands complete normally within timeout
3. **Check error reporting**: Verify timeout errors are properly reported to backend
4. **Platform testing**: Test on Linux, macOS, and Windows
5. **Edge cases**: 
   - Commands that complete just before timeout
   - Commands that hang indefinitely
   - Multiple concurrent commands with different timeouts

## Build Verification
```bash
cd agent
go build ./...                    # Build all packages
go build -o patchify-agent ./cmd/agent  # Build agent binary
```

Build completed successfully with no errors.

## Files Modified
- `agent/internal/config/config.go`
- `agent/internal/models/execution.go`
- `agent/internal/executors/executor.go`
- `agent/internal/executors/patch_linux.go`
- `agent/internal/executors/patch_darwin.go`
- `agent/internal/executors/patch_windows.go`
- `agent/internal/executors/software_linux.go`
- `agent/internal/executors/software_darwin.go`
- `agent/internal/executors/software_windows.go`
- `agent/internal/executors/remote_linux.go`
- `agent/internal/executors/remote_darwin.go`
- `agent/internal/executors/remote_windows.go`
- `agent/internal/executors/rollback.go`
- `agent/internal/executors/script_executor.go`
- `agent/internal/backend/backend.go`
- `agent/internal/server/server.go`
- `agent/cmd/agent/main.go`

## Next Steps
1. Add full timeout handling to Darwin and Windows patch executors (similar to Linux)
2. Add timeout handling to software and script executors
3. Add integration tests for timeout scenarios
4. Document timeout configuration in user-facing documentation
5. Consider adding per-command timeout overrides in addition to global config
