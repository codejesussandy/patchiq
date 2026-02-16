# PatchIQ Agent Testing Guide

## Overview

The PatchIQ agent has comprehensive test coverage (270+ tests) across unit, integration, and E2E tests. This document provides guidance on running tests, writing new tests, and understanding the test structure.

## Test Structure

```
agent/
├── internal/
│   ├── testutil/              # Test framework and helpers
│   │   ├── mocks.go          # Mock implementations
│   │   ├── fixtures.go       # Test data fixtures
│   │   └── helpers.go        # Test helper functions
│   ├── executors/
│   │   ├── *_test.go         # Executor unit tests (120 tests)
│   ├── collectors/
│   │   ├── *_test.go         # Collector tests (50 tests)
│   └── backend/
│       └── *_test.go         # Backend tests (40 tests)
└── test/
    ├── integration/           # Integration tests (20 tests)
    │   ├── deployment_integration_test.go
    │   ├── communication_integration_test.go
    │   └── update_integration_test.go
    └── e2e/                   # End-to-end tests (40 tests)
        ├── deployment_test.go
        ├── windows_test.go
        ├── linux_test.go
        └── darwin_test.go
```

## Running Tests

### All Tests

```bash
cd agent
go test ./...
```

### Unit Tests Only

```bash
cd agent
go test ./internal/...
```

### With Coverage

```bash
cd agent
go test -coverprofile=coverage.txt -covermode=atomic ./...
go tool cover -html=coverage.txt
```

### Specific Modules

```bash
# Executor tests
go test -v ./internal/executors/...

# Collector tests
go test -v ./internal/collectors/...

# Integration tests
go test -v ./test/integration/...

# E2E tests
go test -v ./test/e2e/...
```

### Platform-Specific Tests

```bash
# Only run Linux tests
go test -v ./internal/executors/... -run Linux

# Only run Windows tests
go test -v ./internal/executors/... -run Windows

# Only run macOS/Darwin tests
go test -v ./internal/executors/... -run Darwin
```

### Skip Long-Running Tests

```bash
# Skip integration and E2E tests
go test -short ./...
```

### Verbose Output

```bash
go test -v ./...
```

### Race Detection

```bash
go test -race ./...
```

## Writing Tests

### Use Test Helpers

The `testutil` package provides helpful assertion functions:

```go
import "github.com/patchify/agent/internal/testutil"

func TestMyFunction(t *testing.T) {
    result := MyFunction("input")

    testutil.AssertNoError(t, err, "Should not error")
    testutil.AssertEqual(t, "expected", result, "Values should match")
    testutil.AssertContains(t, result, "substring", "Should contain substring")
    testutil.AssertTrue(t, condition, "Condition should be true")
    testutil.AssertGreaterThan(t, value, 0, "Should be positive")
}
```

### Mock External Dependencies

Use the mock implementations in `testutil/mocks.go`:

```go
func TestWithMockedCommand(t *testing.T) {
    mock := testutil.NewMockCommandExecutor()
    mock.SetOutput("apt-get update", "Reading package lists...\nDone")
    mock.SetError("failing-command", errors.New("command failed"))

    executor := &LinuxPatchExecutor{cmdExecutor: mock}

    result := executor.InstallPatch(ctx, "package", models.PatchOptions{})

    testutil.AssertTrue(t, result.Success, "Should succeed")
}
```

### Table-Driven Tests

For testing multiple scenarios:

```go
func TestMultipleScenarios(t *testing.T) {
    tests := []struct {
        name     string
        input    string
        expected string
        wantErr  bool
    }{
        {
            name:     "happy path",
            input:    "valid-input",
            expected: "expected-output",
            wantErr:  false,
        },
        {
            name:     "error case",
            input:    "invalid",
            expected: "",
            wantErr:  true,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result, err := MyFunction(tt.input)

            if tt.wantErr {
                testutil.AssertError(t, err, "Should error")
            } else {
                testutil.AssertNoError(t, err, "Should not error")
                testutil.AssertEqual(t, tt.expected, result, "Should match")
            }
        })
    }
}
```

### Platform-Specific Tests

Use build tags for platform-specific tests:

```go
//go:build linux

package executors

import "testing"

func TestLinuxSpecificFeature(t *testing.T) {
    // This test only runs on Linux
}
```

### Integration Tests

Mark long-running tests to skip in short mode:

```go
func TestIntegration_FullWorkflow(t *testing.T) {
    if testing.Short() {
        t.Skip("Skipping integration test in short mode")
    }

    // Full integration test here
}
```

## Test Naming Convention

Follow the pattern: `Test<FunctionName>_<Scenario>_<ExpectedOutcome>`

```go
func TestInstallPatch_ValidPackage_Success(t *testing.T) { }
func TestInstallPatch_NetworkFailure_Retry(t *testing.T) { }
func TestInstallPatch_PermissionDenied_NoRetry(t *testing.T) { }
```

## Coverage Targets

- **Executors:** 70%+
- **Collectors:** 60%+
- **Backend:** 60%+
- **Overall:** 60%+

## CI/CD

Tests run automatically on:
- Every push to `main` or `full-dev-*` branches
- Every pull request to `main`
- All platforms: Linux, macOS, Windows

View results: https://github.com/your-org/patchiq/actions

### GitHub Actions Workflows

**`.github/workflows/agent-tests.yml`**
- Runs on all platforms (Linux, macOS, Windows)
- Executes unit tests with race detection
- Runs integration tests (except on Windows)
- Generates and uploads coverage reports
- Runs linting with golangci-lint
- Verifies builds complete successfully

**`.github/workflows/agent-release.yml`**
- Triggered on version tags (e.g., `v1.0.0`)
- Builds binaries for all platforms and architectures
- Creates GitHub releases with binaries and checksums
- Runs full test suite before releasing

## Test Categories

### Unit Tests (240 tests)

**Executors (120 tests)**
- `patch_windows_test.go` - Windows Update tests (20 tests)
- `patch_linux_test.go` - Linux package manager tests (20 tests)
- `patch_darwin_test.go` - macOS softwareupdate tests (20 tests)
- `software_windows_test.go` - Windows software installation (20 tests)
- `software_linux_test.go` - Linux software installation (20 tests)
- `software_darwin_test.go` - macOS software installation (20 tests)

**Collectors (50 tests)**
- `hardware_test.go` - Hardware info collection (10 tests)
- `software_test.go` - Software inventory (10 tests)
- `network_test.go` - Network configuration (8 tests)
- `security_test.go` - Security status (8 tests)
- `peripheral_test.go` - Peripheral devices (7 tests)
- `telemetry_test.go` - System telemetry (7 tests)

**Backend (40 tests)**
- `backend_test.go` - Server communication (40 tests)

**Other (30 tests)**
- `script_executor_test.go` - Script execution (15 tests)
- `rollback_test.go` - Rollback functionality (15 tests)

### Integration Tests (20 tests)

- `deployment_integration_test.go` - Full deployment workflows (8 tests)
- `communication_integration_test.go` - Server communication (7 tests)
- `update_integration_test.go` - Self-update process (5 tests)

### E2E Tests (40 tests)

- `deployment_test.go` - End-to-end deployments (10 tests)
- Platform-specific E2E tests (30 tests)

## Debugging Tests

### Run Single Test

```bash
go test -v -run TestSpecificFunction ./internal/executors/
```

### Debug with Delve

```bash
dlv test ./internal/executors/ -- -test.run TestSpecificFunction
```

### Print Test Output

```bash
go test -v ./... 2>&1 | tee test-output.log
```

## Common Issues

### Tests Failing on CI but Passing Locally

- Check platform-specific code paths
- Verify build tags are correct
- Check for timing-dependent tests

### Flaky Tests

- Avoid sleep-based synchronization
- Use timeouts appropriately
- Mock external dependencies

### Coverage Gaps

- Use `go test -cover` to identify uncovered code
- Focus on critical paths first
- Don't aim for 100% coverage on trivial code

## Best Practices

1. **Keep tests fast** - Unit tests should complete in milliseconds
2. **Test behavior, not implementation** - Focus on what, not how
3. **Use meaningful test names** - Test names should describe the scenario
4. **One assertion per test** - Makes failures easier to diagnose
5. **Clean up resources** - Use `t.TempDir()` and `defer` for cleanup
6. **Avoid test interdependence** - Each test should run independently
7. **Mock external dependencies** - Don't rely on network, external services
8. **Test edge cases** - Empty inputs, nil values, boundary conditions

## Resources

- [Go Testing Package](https://pkg.go.dev/testing)
- [Table Driven Tests](https://go.dev/wiki/TableDrivenTests)
- [Testify Documentation](https://github.com/stretchr/testify)
- [Coverage Tool](https://go.dev/blog/cover)

## Getting Help

If tests are failing or you need help writing tests:
1. Check the test output for specific error messages
2. Review similar tests in the codebase
3. Consult this testing guide
4. Ask in the team Slack channel

---

**Last Updated:** 2026-02-14
**Maintained By:** PatchIQ Engineering Team
