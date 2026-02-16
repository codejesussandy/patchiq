# Agent Test Suite

This directory contains integration and E2E tests for the PatchIQ agent.

## Directory Structure

```
test/
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

## Integration Tests

Integration tests verify that multiple components work together correctly. They use real files and processes but mock external services.

### Running Integration Tests

```bash
# All integration tests
go test -v ./test/integration/...

# Single integration test file
go test -v ./test/integration/deployment_integration_test.go

# Skip in short mode
go test -short ./...  # Integration tests will be skipped
```

### Integration Test Categories

**Deployment Integration (8 tests)**
- Bundle creation and extraction
- Checksum verification
- Script execution
- Multi-step deployment workflows

**Communication Integration (7 tests)**
- Agent registration
- Heartbeat mechanism
- Command polling
- Error retry logic
- Connection timeout handling

**Update Integration (5 tests)**
- Update checking
- Update download
- Checksum verification
- Backup and restore
- Agent restart

## E2E Tests

End-to-end tests verify complete workflows on real systems. They require appropriate permissions and may modify system state.

### Running E2E Tests

```bash
# All E2E tests
go test -v ./test/e2e/...

# Platform-specific E2E tests
go test -v ./test/e2e/ -run Windows  # Windows only
go test -v ./test/e2e/ -run Linux    # Linux only
go test -v ./test/e2e/ -run Darwin   # macOS only
```

### E2E Test Requirements

- **Permissions:** May require root/admin privileges for some operations
- **Clean State:** Tests should clean up after themselves
- **Isolation:** Should not interfere with system packages

### E2E Test Categories

**Deployment E2E (10 tests)**
- Full package deployment workflow
- Rollback scenarios
- Error recovery

**Platform-Specific E2E (30 tests)**
- Windows-specific operations (10 tests)
- Linux-specific operations (10 tests)
- macOS-specific operations (10 tests)

## Test Execution Time

- **Integration tests:** ~30-60 seconds
- **E2E tests:** ~2-5 minutes per platform

## Writing New Tests

### Integration Test Template

```go
package integration

import (
    "testing"
    "time"
)

func TestIntegration_YourFeature(t *testing.T) {
    if testing.Short() {
        t.Skip("Skipping integration test in short mode")
    }

    // Setup
    tempDir := t.TempDir()  // Automatically cleaned up

    // Test logic
    result := YourFunction()

    // Assertions
    if !result.Success {
        t.Errorf("Expected success, got failure: %s", result.ErrorMessage)
    }
}
```

### E2E Test Template

```go
//go:build !integration

package e2e

import (
    "runtime"
    "testing"
)

func TestE2E_YourFeature(t *testing.T) {
    if runtime.GOOS != "linux" {
        t.Skip("Skipping Linux-specific E2E test")
    }

    // Run actual system command
    result := ExecuteRealCommand()

    // Cleanup
    defer Cleanup()

    // Assertions
    if result.ExitCode != 0 {
        t.Errorf("Command failed: %s", result.Output)
    }
}
```

## CI/CD Execution

Integration tests run on CI for all platforms except Windows (due to longer execution times).
E2E tests run selectively based on platform.

## Troubleshooting

### Tests Timeout

Increase timeout for long-running tests:
```bash
go test -timeout 10m ./test/integration/...
```

### Permission Issues

Some tests require elevated privileges:
```bash
sudo go test ./test/e2e/...
```

### Platform-Specific Failures

Check build tags and platform guards:
```go
//go:build linux
```

### Cleanup Issues

Always use `t.TempDir()` for temporary files:
```go
tempDir := t.TempDir()  // Automatically cleaned up after test
```

## Best Practices

1. **Use t.TempDir()** for all temporary files
2. **Skip appropriately** using `testing.Short()` or platform checks
3. **Clean up resources** with `defer` statements
4. **Isolate tests** - don't depend on execution order
5. **Use timeouts** to prevent hanging tests
6. **Mock external services** in integration tests
7. **Document prerequisites** for E2E tests

## Contributing

When adding new integration or E2E tests:

1. Place in appropriate directory (integration vs e2e)
2. Add build tags if platform-specific
3. Use `testing.Short()` for skippable tests
4. Update test counts in this README
5. Ensure cleanup is handled properly

## Test Metrics

Current test counts:
- Integration tests: **20**
- E2E tests: **40**
- Total test files: **7**

See `../TESTING.md` for complete testing documentation.
