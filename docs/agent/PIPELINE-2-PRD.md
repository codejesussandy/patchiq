# Pipeline 2: Testing Infrastructure

## Overview

- **Priority:** Critical
- **Estimated Effort:** 70-77 hours
- **Dependencies:** None (runs in parallel with Pipeline 1)
- **Platform Scope:** All (Windows, Linux, macOS)
- **Target Completion:** Week 3
- **Current Completion:** 5% (only 2 test files exist)

## Business Justification

**Testing infrastructure is the #1 blocker to production.** Without comprehensive tests:
- Cannot validate Windows platform changes (Pipeline 3)
- Cannot verify security hardening (Pipeline 4)
- Cannot confidently ship to production (Pipeline 7)
- Quality issues compound with every new feature

**Current State:**
- Only 2 test files: `encryption_test.go` (27 tests), `credentials_test.go` (minimal)
- 0% coverage on executors (the most critical code)
- 0% coverage on collectors
- ~5% coverage on backend

**Target State:**
- 270+ tests across all critical modules
- 60%+ code coverage
- Automated CI/CD testing
- Platform-specific test matrix
- Confidence to ship production-grade agent

**Value Delivered:**
- Quality gates for all future work
- Early bug detection
- Regression prevention
- Production confidence

---

## Requirements

### R1: Unit Test Framework

**Description:** Establish comprehensive unit test framework with test helpers and mocks

**Acceptance Criteria:**
- [ ] Test helper package created (`agent/internal/testutil/`)
- [ ] Mock implementations for common interfaces
- [ ] Test fixtures for common scenarios
- [ ] Documentation on writing tests

**Platform:** All
**Priority:** Must Have
**Estimated Hours:** 4-6

---

### R2: Executor Unit Tests (Critical - 150+ tests)

**Description:** Write comprehensive unit tests for all platform-specific executors

**Test Breakdown:**
- **Patch Executors** (60 tests):
  - `patch_windows.go` - 20 tests
  - `patch_linux.go` - 20 tests
  - `patch_darwin.go` - 20 tests

- **Software Executors** (60 tests):
  - `software_windows.go` - 20 tests
  - `software_linux.go` - 20 tests
  - `software_darwin.go` - 20 tests

- **Script Executor** (15 tests):
  - Bundle extraction
  - Script execution
  - Error handling

- **Rollback Executor** (15 tests):
  - Already have 9, need 6 more
  - Edge case coverage

**Acceptance Criteria:**
- [ ] 150+ executor tests written
- [ ] All test happy paths + error scenarios
- [ ] Mock command execution (no real package installs in unit tests)
- [ ] 70%+ coverage on executor code

**Platform:** All
**Priority:** Must Have
**Estimated Hours:** 30-40

---

### R3: Collector Unit Tests (50+ tests)

**Description:** Write unit tests for all inventory collectors

**Test Breakdown:**
- `hardware_collector.go` - 10 tests
- `software_collector.go` - 10 tests
- `network_collector.go` - 8 tests
- `security_collector.go` - 8 tests
- `peripheral_collector.go` - 7 tests
- `telemetry_collector.go` - 7 tests

**Acceptance Criteria:**
- [ ] 50+ collector tests written
- [ ] Mock OS-specific calls
- [ ] Test data parsing and formatting
- [ ] 60%+ coverage on collector code

**Platform:** All
**Priority:** Should Have
**Estimated Hours:** 12-16

---

### R4: Backend Unit Tests (40+ tests)

**Description:** Write unit tests for backend communication logic

**Test Areas:**
- Heartbeat mechanism (10 tests)
- Command polling (10 tests)
- Inventory submission (8 tests)
- Error handling (8 tests)
- Token refresh (4 tests)

**Acceptance Criteria:**
- [ ] 40+ backend tests written
- [ ] Mock HTTP client
- [ ] Test retry logic and backoff
- [ ] 60%+ coverage on backend code

**Platform:** All
**Priority:** Should Have
**Estimated Hours:** 10-14

---

### R5: Integration Test Suite (20+ tests)

**Description:** Create integration tests for multi-component workflows

**Test Scenarios:**
- Download → Validate → Extract → Execute flow
- Registration → Heartbeat → Command execution
- Inventory collection → Submission
- Self-update flow
- Rollback workflow

**Acceptance Criteria:**
- [ ] 20+ integration tests
- [ ] Use real files (not mocked)
- [ ] Test component interactions
- [ ] All critical workflows covered

**Platform:** All
**Priority:** Should Have
**Estimated Hours:** 8-12

---

### R6: E2E Test Harness (10+ tests)

**Description:** Create end-to-end test framework for full deployment scenarios

**Test Coverage:**
- Fresh agent installation
- Package deployment (software + patches)
- Agent self-update
- Error recovery scenarios
- Platform-specific workflows

**Acceptance Criteria:**
- [ ] E2E test framework in `agent/test/e2e/`
- [ ] 10+ E2E test scenarios
- [ ] Runnable on CI/CD
- [ ] Platform-specific tests (conditional execution)

**Platform:** All
**Priority:** Should Have
**Estimated Hours:** 10-14

---

### R7: CI/CD Automation

**Description:** Set up automated testing in GitHub Actions

**Components:**
- Workflow file (`.github/workflows/agent-tests.yml`)
- Multi-platform testing (Linux, macOS, Windows)
- Coverage reporting
- Test failure notifications

**Acceptance Criteria:**
- [ ] GitHub Actions workflow created
- [ ] Tests run on every PR
- [ ] Tests run on push to main
- [ ] Coverage report generated
- [ ] Failing tests block merge

**Platform:** All
**Priority:** Must Have
**Estimated Hours:** 6-8

---

### R8: Test Documentation

**Description:** Document testing strategy and how to write tests

**Deliverables:**
- `agent/TESTING.md` - Testing guide
- `agent/test/README.md` - Test structure
- Code coverage targets
- How to run tests

**Acceptance Criteria:**
- [ ] Testing guide written
- [ ] Examples provided
- [ ] Coverage targets documented
- [ ] CI/CD usage explained

**Platform:** All
**Priority:** Should Have
**Estimated Hours:** 2-4

---

## Technical Approach

### Test Structure

```
agent/
├── internal/
│   ├── executors/
│   │   ├── patch_windows.go
│   │   ├── patch_windows_test.go       ← NEW (20 tests)
│   │   ├── patch_linux.go
│   │   ├── patch_linux_test.go         ← NEW (20 tests)
│   │   ├── patch_darwin.go
│   │   ├── patch_darwin_test.go        ← NEW (20 tests)
│   │   ├── software_windows.go
│   │   ├── software_windows_test.go    ← NEW (20 tests)
│   │   ├── software_linux.go
│   │   ├── software_linux_test.go      ← NEW (20 tests)
│   │   ├── software_darwin.go
│   │   ├── software_darwin_test.go     ← NEW (20 tests)
│   │   ├── script_executor.go
│   │   ├── script_executor_test.go     ← Enhanced (15 tests)
│   │   └── rollback_test.go            ← Enhanced (15 tests)
│   ├── collectors/
│   │   ├── hardware_test.go            ← NEW (10 tests)
│   │   ├── software_test.go            ← NEW (10 tests)
│   │   ├── network_test.go             ← NEW (8 tests)
│   │   ├── security_test.go            ← NEW (8 tests)
│   │   ├── peripheral_test.go          ← NEW (7 tests)
│   │   └── telemetry_test.go           ← NEW (7 tests)
│   ├── backend/
│   │   └── backend_test.go             ← NEW (40 tests)
│   └── testutil/                       ← NEW
│       ├── mocks.go
│       ├── fixtures.go
│       └── helpers.go
├── test/
│   ├── integration/                    ← NEW
│   │   ├── deployment_test.go
│   │   ├── communication_test.go
│   │   └── update_test.go
│   └── e2e/                            ← Enhanced
│       ├── deployment_test.go          ← Already created in Pipeline 1
│       ├── windows_test.go             ← NEW
│       ├── linux_test.go               ← NEW
│       └── darwin_test.go              ← NEW
└── TESTING.md                          ← NEW
```

### Mock Strategy

**What to Mock:**
- OS command execution (`exec.Command`)
- HTTP requests (Hub communication)
- File system operations (for some tests)
- Time (for retry/backoff tests)

**What NOT to Mock:**
- Integration tests use real files
- E2E tests use real processes
- Platform-specific tests use real OS calls

### Test Naming Convention

```go
// Pattern: Test<FunctionName>_<Scenario>_<ExpectedOutcome>

func TestInstallPatch_ValidPackage_Success(t *testing.T) { }
func TestInstallPatch_NetworkFailure_Retry(t *testing.T) { }
func TestInstallPatch_PermissionDenied_NoRetry(t *testing.T) { }
```

---

## Implementation Plan

### Task 2.1: Test Framework Setup (4-6 hours)

**Owner:** Teammate 1
**Files:** `agent/internal/testutil/`

**Create:**
1. `testutil/mocks.go` - Mock implementations
2. `testutil/fixtures.go` - Test data fixtures
3. `testutil/helpers.go` - Test helper functions

**Example Mocks:**

```go
// Mock command executor
type MockCommandExecutor struct {
    Commands []string
    Outputs  map[string]string
    Errors   map[string]error
}

func (m *MockCommandExecutor) ExecuteCommand(ctx context.Context, cmd string, args ...string) (string, error) {
    key := cmd + " " + strings.Join(args, " ")
    m.Commands = append(m.Commands, key)

    if err, ok := m.Errors[key]; ok {
        return "", err
    }

    if output, ok := m.Outputs[key]; ok {
        return output, nil
    }

    return "", nil
}
```

---

### Task 2.2: Executor Tests - Windows (12-15 hours)

**Owner:** Teammate 1
**Files:**
- `patch_windows_test.go` (20 tests)
- `software_windows_test.go` (20 tests)

**Test Coverage:**
- InstallPatch (8 tests): success, network error, permission error, checksum mismatch, timeout, already installed, invalid package, disk full
- UninstallPatch (6 tests): success, not found, permission error, partial uninstall, registry cleanup, files in use
- RollbackPatch (6 tests): success, invalid ID, cleanup, crash recovery, missing state, partial rollback
- InstallSoftware - winget (5 tests): success, not found, already installed, upgrade available, network error
- InstallSoftware - chocolatey (5 tests): success, not found, dependency missing, version conflict, timeout
- InstallSoftware - MSI (5 tests): success, corrupted file, silent install, custom args, unattended
- UninstallSoftware (5 tests): success, not found, permission error, force uninstall, clean registry

---

### Task 2.3: Executor Tests - Linux (12-15 hours)

**Owner:** Teammate 2
**Files:**
- `patch_linux_test.go` (20 tests)
- `software_linux_test.go` (20 tests)

**Test Coverage:**
- InstallPatch - apt (8 tests)
- InstallPatch - yum/dnf (8 tests)
- UninstallPatch (4 tests)
- InstallSoftware - apt (7 tests)
- InstallSoftware - yum/dnf (7 tests)
- InstallSoftware - snap/flatpak (6 tests)

---

### Task 2.4: Executor Tests - macOS (12-15 hours)

**Owner:** Teammate 1
**Files:**
- `patch_darwin_test.go` (20 tests)
- `software_darwin_test.go` (20 tests)

**Test Coverage:**
- InstallPatch - softwareupdate (10 tests)
- UninstallPatch (10 tests)
- InstallSoftware - brew (10 tests)
- InstallSoftware - mas/pkg/dmg (10 tests)

---

### Task 2.5: Collector Tests (12-16 hours)

**Owner:** Teammate 2
**Files:** 6 collector test files (50 tests)

**Per Collector:**
- Test data collection
- Test data parsing
- Test error handling
- Test platform-specific logic

---

### Task 2.6: Backend Tests (10-14 hours)

**Owner:** Teammate 1
**Files:** `backend/backend_test.go` (40 tests)

**Coverage:**
- Heartbeat with retry
- Command polling
- Inventory submission
- Token refresh
- Error propagation

---

### Task 2.7: Integration Tests (8-12 hours)

**Owner:** Teammate 2
**Files:** `test/integration/*.go` (20 tests)

**Workflows:**
- Download → Validate → Extract → Execute
- Registration → Heartbeat → Commands
- Inventory → Deduplication → Submission

---

### Task 2.8: E2E Tests (10-14 hours)

**Owner:** Teammate 1
**Files:** `test/e2e/*.go` (10 tests)

**Scenarios:**
- Fresh install
- Package deployment
- Self-update
- Error recovery

---

### Task 2.9: CI/CD Setup (6-8 hours)

**Owner:** Teammate 2
**Files:** `.github/workflows/agent-tests.yml`

**Workflow:**
```yaml
name: Agent Tests

on: [push, pull_request]

jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        go: ['1.22']

    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: ${{ matrix.go }}

      - name: Run Tests
        run: |
          cd agent
          go test -v -race -coverprofile=coverage.txt ./...

      - name: Upload Coverage
        uses: codecov/codecov-action@v4
        with:
          file: ./agent/coverage.txt
```

---

### Task 2.10: Documentation (2-4 hours)

**Owner:** Teammate 2
**Files:** `TESTING.md`, `test/README.md`

---

## Parallelization Strategy

```
Week 1 (Parallel):
├── Teammate 1: Task 2.1 → 2.2 → 2.4 → 2.6 → 2.8
│   ├── Test framework (4-6h)
│   ├── Windows executor tests (12-15h)
│   ├── macOS executor tests (12-15h)
│   ├── Backend tests (10-14h)
│   └── E2E tests (10-14h)
│   Total: 48-64 hours
│
└── Teammate 2: Task 2.3 → 2.5 → 2.7 → 2.9 → 2.10
    ├── Linux executor tests (12-15h)
    ├── Collector tests (12-16h)
    ├── Integration tests (8-12h)
    ├── CI/CD setup (6-8h)
    └── Documentation (2-4h)
    Total: 40-55 hours
```

**Total: 88-119 hours with 2 teammates = 44-60 hours per teammate**
**Timeline: ~1.5-2 weeks**

---

## Exit Criteria

- [ ] 270+ total tests written
- [ ] All tests passing
- [ ] 60%+ code coverage achieved
- [ ] CI/CD pipeline operational
- [ ] Coverage reports generated
- [ ] Documentation complete
- [ ] No regressions introduced

---

## Test Metrics

**Coverage Targets:**
- Executors: 70%+
- Collectors: 60%+
- Backend: 60%+
- Overall: 60%+

**Test Count Goals:**
- Unit tests: 240+
- Integration tests: 20+
- E2E tests: 10+
- **Total: 270+**

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Writing 270+ tests takes longer than estimated | High | Prioritize executor tests (most critical) |
| Platform-specific tests fail on CI | Medium | Use platform-conditional compilation |
| Mocking complexity for OS calls | Medium | Use testutil helpers, keep mocks simple |
| Coverage tool overhead slows tests | Low | Run coverage only on CI, not locally |

---

## Timeline

- **Planning:** 6 hours
- **Implementation:** 88-119 hours (with 2 teammates: 44-60 hours each)
- **Testing:** 12 hours (testing the tests!)
- **QA:** 6 hours
- **Buffer:** 13 hours
- **Total:** 125 hours = **1.5-2 weeks** with 2 teammates

---

## Success Metrics

- **Test Count:** 270+ tests written
- **Coverage:** 60%+ overall
- **CI/CD:** All tests run automatically on PR
- **Quality:** 0 flaky tests, all deterministic
- **Speed:** Test suite completes in < 5 minutes

---

**Document Status:** APPROVED
**Last Updated:** 2026-02-14
**Implementation Start:** Now
