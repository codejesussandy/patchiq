# Agent Bugs and Issues

This file tracks bugs found during Pipeline 1 (Core Deployment Engine Completion) validation and testing.

## Format

Each bug entry should include:
- **Bug ID**: Sequential number
- **File**: Source file where bug was found
- **Line**: Approximate line number
- **Issue**: Description of the problem
- **Impact**: Severity (Critical, High, Medium, Low)
- **Fix**: Description of the fix applied
- **Status**: Fixed, In Progress, or Pending
- **Found**: Date discovered

---

## Bugs Found During Pipeline 1 Implementation

### Bug #1: Missing ErrInvalidInput Error Code

- **File**: `agent/internal/models/execution.go`
- **Line**: 17-33
- **Issue**: The error code constants did not include `ErrInvalidInput` for input validation failures
- **Impact**: Medium
- **Fix**: Added `ErrInvalidInput` constant and updated `IsRetryableError` map to mark it as non-retryable
- **Status**: Fixed
- **Found**: 2026-02-14

**Details**: Rollback validation needed an error code for invalid rollback IDs. Added ErrInvalidInput to cover all input validation scenarios.

---

### Bug #2: Rollback Missing Crash Recovery

- **File**: `agent/internal/executors/rollback.go`
- **Line**: N/A (missing functionality)
- **Issue**: No mechanism to recover from incomplete rollbacks if agent crashes during rollback operation
- **Impact**: High
- **Fix**: Implemented marker file system with `markRollbackInProgress()`, `markRollbackComplete()`, and `RecoverIncompleteRollbacks()` functions
- **Status**: Fixed
- **Found**: 2026-02-14

**Details**: If agent crashed during rollback, the rollback would remain incomplete and the system could be left in an inconsistent state. Now uses marker files to track in-progress rollbacks and recovers on startup.

---

### Bug #3: No Rollback State Caching

- **File**: `agent/internal/executors/rollback.go`
- **Line**: N/A (missing functionality)
- **Issue**: Rollback relied entirely on package manager re-installing previous version. If original package unavailable, rollback would fail
- **Impact**: High
- **Fix**: Added `RollbackState` struct and `saveRollbackState()` / `loadRollbackState()` functions to cache installation details including file lists and registry keys
- **Status**: Fixed
- **Found**: 2026-02-14

**Details**: Package manager rollbacks fail if the previous version is no longer available in the repository. State caching allows fallback to manual file-based rollback.

---

### Bug #4: Rollback Cleanup Not Guaranteed

- **File**: `agent/internal/executors/rollback.go`
- **Line**: 153-217 (ExecuteRollback function)
- **Issue**: Temporary files and rollback state files were not cleaned up after successful rollback
- **Impact**: Medium
- **Fix**: Added `cleanupRollbackFiles()` function called via defer in `ExecuteRollback()` to ensure cleanup happens on both success and failure
- **Status**: Fixed
- **Found**: 2026-02-14

**Details**: Rollback state files and temporary directories accumulated over time. Cleanup is now guaranteed via defer.

---

### Bug #5: No Rollback ID Format Validation

- **File**: `agent/internal/executors/rollback.go`
- **Line**: 153-159 (ExecuteRollback function)
- **Issue**: Rollback IDs were not validated for correct format before attempting rollback
- **Impact**: Low
- **Fix**: Added `validateRollbackID()` function that checks ID exists and has correct format (RB-<timestamp>)
- **Status**: Fixed
- **Found**: 2026-02-14

**Details**: Invalid or malformed rollback IDs could cause unexpected behavior. Validation now happens upfront with proper error codes.

---

## Potential Issues (Not Yet Confirmed)

### Issue #1: Windows Permission Elevation

- **File**: `agent/internal/executors/script_executor.go`
- **Line**: 656-659
- **Issue**: On Windows, the agent logs a warning when scripts require admin but agent is not running as administrator. However, there's no automatic UAC elevation
- **Impact**: Medium
- **Status**: Pending investigation
- **Notes**: Need to determine if agent should be installed as a Windows Service with LocalSystem account, or if UAC elevation should be triggered

**Recommendation**: Document that Windows agent should be installed as a service for production use.

---

### Issue #2: macOS DMG Mount Timeout

- **File**: `agent/internal/executors/software_darwin.go` (not yet validated)
- **Line**: TBD
- **Issue**: DMG mounting might timeout on slow systems or large DMG files
- **Impact**: Low
- **Status**: Pending validation
- **Notes**: Need to test with large DMG files (>1GB) to verify timeout is adequate

**Recommendation**: Validate during E2E testing and increase timeout if needed.

---

### Issue #3: Linux Package Manager Detection

- **File**: `agent/internal/executors/software_linux.go` (not yet validated)
- **Line**: TBD
- **Issue**: Package manager detection may not work on all Linux distributions (e.g., Alpine, Arch, Gentoo)
- **Impact**: Medium
- **Status**: Pending validation
- **Notes**: Current implementation assumes Debian (apt) or RedHat (yum/dnf) based distributions

**Recommendation**: Add support for additional package managers or document supported distributions.

---

## Testing Coverage

### Tested Platforms

- [x] macOS (Homebrew tested)
- [ ] Linux (apt - pending E2E test)
- [ ] Linux (yum/dnf - pending E2E test)
- [ ] Windows (winget - pending E2E test)
- [ ] Windows (chocolatey - pending E2E test)

### Test Results

Will be updated as E2E tests are executed.

---

## How to Report a Bug

When you discover a bug:

1. Add an entry to this file following the format above
2. Assign a sequential bug number
3. Mark status as "Pending" or "In Progress"
4. Create a fix if possible
5. Update status to "Fixed" when resolved
6. Document the fix in detail

---

**Last Updated**: 2026-02-14
**Pipeline**: Pipeline 1 - Core Deployment Engine Completion
**Validated By**: Teammate 4
