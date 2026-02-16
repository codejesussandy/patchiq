# Pipeline 1: Core Deployment Engine Completion

## Overview

- **Priority:** Critical
- **Estimated Effort:** 32-38 hours
- **Dependencies:** None (foundational)
- **Platform Scope:** All (Windows, Linux, macOS)
- **Target Completion:** Week 2
- **Current Completion:** 90%

## Business Justification

The deployment engine is the **core value proposition** of PatchIQ. While 90% complete, the remaining 10% includes critical edge cases that could cause production failures:
- Bundle corruption leading to failed deployments
- Incomplete rollback leaving systems in broken state
- Hub download failures with no retry logic

**Value Delivered:**
- 100% reliable patch and software deployment
- Confidence to ship to production customers
- Foundation for all other pipelines

---

## Requirements

### R1: Hub-Centric Download Reliability

- **Description:** Complete the MinIO download functionality with corruption detection and retry logic
- **Acceptance Criteria:**
  - [ ] Download resumes on network interruption
  - [ ] Checksum validation for all downloads (SHA256)
  - [ ] Retry logic: 3 attempts with exponential backoff (1s, 4s, 9s)
  - [ ] Corrupted bundles rejected before extraction
  - [ ] Download progress reporting (% complete)
- **Platform:** All
- **Priority:** Must Have
- **Files to Modify:**
  - `agent/internal/download/download.go` - Add corruption detection
  - `agent/internal/executors/script_executor.go` - Integrate checksum validation

### R2: Bundle Extraction Safety

- **Description:** Validate bundle structure before extraction to prevent malformed archives
- **Acceptance Criteria:**
  - [ ] Validate tar.gz structure before extracting
  - [ ] Detect and reject malicious paths (e.g., `../../../etc/passwd`)
  - [ ] Verify required scripts exist (install.sh, uninstall.sh, rollback.sh)
  - [ ] Size limits enforced (max 500MB per bundle)
  - [ ] Extraction to isolated temp directory
- **Platform:** All
- **Priority:** Must Have
- **Files to Modify:**
  - `agent/internal/executors/script_executor.go` - Add extraction validation

### R3: Rollback Edge Cases

- **Description:** Complete rollback mechanism for all failure scenarios
- **Acceptance Criteria:**
  - [ ] Rollback works for partial installations
  - [ ] Rollback works when original package unavailable
  - [ ] Rollback cleans up temporary files
  - [ ] Rollback survives process crash (resume on restart)
  - [ ] Rollback ID validation (prevent invalid rollback IDs)
- **Platform:** All
- **Priority:** Must Have
- **Files to Modify:**
  - `agent/internal/executors/rollback.go` - Add edge case handling

### R4: End-to-End Executor Validation

- **Description:** Validate all platform executors work end-to-end with real packages
- **Acceptance Criteria:**
  - [ ] Windows: winget, choco, MSI, EXE all work
  - [ ] Linux: apt, yum, dnf, deb, rpm all work
  - [ ] macOS: brew, mas, pkg, dmg all work
  - [ ] Hub-centric script bundles work on all platforms
  - [ ] Error handling correct for all failure modes
- **Platform:** All
- **Priority:** Must Have

### R5: Error Classification

- **Description:** Standardize error codes across all executors
- **Acceptance Criteria:**
  - [ ] All executors use error codes from `agent/internal/models/execution.go`
  - [ ] Retryable vs non-retryable errors properly flagged
  - [ ] Error messages include actionable context
  - [ ] Network errors trigger retry, permission errors don't
- **Platform:** All
- **Priority:** Should Have

---

## Implementation Plan

### Task 1.1: Download Reliability (4-6 hours)

**Owner:** Teammate 3
**Files:** `agent/internal/download/download.go`

- Implement `VerifyChecksum(path, sha256)` function
- Add retry logic with exponential backoff
- Add progress reporting callback
- Write unit tests

### Task 1.2: Bundle Validation (4-5 hours)

**Owner:** Teammate 3
**Files:** `agent/internal/executors/script_executor.go`

- Implement `validateBundleStructure()` function
- Add path traversal detection
- Add script existence checks
- Write unit tests

### Task 1.3: Rollback Edge Cases (6-8 hours)

**Owner:** Teammate 4
**Files:** `agent/internal/executors/rollback.go`

- Add rollback ID validation
- Handle missing original package
- Add crash recovery logic
- Write integration tests

### Task 1.4: Executor Validation (12-16 hours)

**Owner:** Teammate 4 + Manual Testing
**Files:** All executor files

- Test all package managers with real packages
- Document test matrix (10 packages × 3 platforms)
- Fix discovered bugs

### Task 1.5: Error Standardization (4-6 hours)

**Owner:** Teammate 3
**Files:** All executor files (6 files)

- Audit all error returns
- Replace generic errors with error codes
- Add retryable flags
- Improve error messages

---

## Test Plan

### Unit Tests (15+ tests)

- Download checksum validation
- Bundle structure validation
- Rollback edge cases
- Error code usage

**Coverage Target:** 70%+

### Integration Tests (10+ tests)

- Download failure recovery
- Bundle corruption detection
- Rollback recovery after crash

### E2E Tests (18 tests)

| Package | Windows | Linux | macOS |
|---------|---------|-------|-------|
| 7-Zip | winget | - | - |
| VLC | choco | - | brew |
| Firefox | MSI | deb | pkg |
| Node.js | EXE | yum | mas |
| VSCode | url | rpm | dmg |
| Custom | script | script | script |

---

## Exit Criteria

- [ ] All functional requirements (R1-R5) implemented
- [ ] 15+ unit tests passing
- [ ] 10+ integration tests passing
- [ ] E2E test matrix complete (18/18 passing)
- [ ] No regressions
- [ ] Code reviewed
- [ ] Documentation updated

---

## Timeline

- **Planning:** 4 hours
- **Implementation:** 32 hours (2 teammates)
- **Testing:** 8 hours
- **QA:** 4 hours
- **Buffer:** 6 hours
- **Total:** 38 hours = **1 week** with 2 teammates

---

**Document Status:** APPROVED
**Last Updated:** 2026-02-14
