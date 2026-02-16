package testutil

import (
	"context"
	"errors"
	"testing"
	"time"
)

// TestMockCommandExecutor tests the mock command executor
func TestMockCommandExecutor(t *testing.T) {
	t.Run("records executed commands", func(t *testing.T) {
		mock := NewMockCommandExecutor()
		mock.SetOutput("test", "output")

		_, _ = mock.ExecuteCommand(context.Background(), "test", "arg1", "arg2")

		commands := mock.GetCommands()
		if len(commands) != 1 {
			t.Errorf("Expected 1 command, got %d", len(commands))
		}
		if commands[0] != "test arg1 arg2" {
			t.Errorf("Expected 'test arg1 arg2', got %q", commands[0])
		}
	})

	t.Run("returns configured output", func(t *testing.T) {
		mock := NewMockCommandExecutor()
		mock.SetOutput("echo hello", "hello")

		output, err := mock.ExecuteCommand(context.Background(), "echo", "hello")

		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}
		if output != "hello" {
			t.Errorf("Expected 'hello', got %q", output)
		}
	})

	t.Run("returns configured error", func(t *testing.T) {
		mock := NewMockCommandExecutor()
		expectedErr := errors.New("command failed")
		mock.SetOutput("fail", "error output")
		mock.SetError("fail", expectedErr)

		output, err := mock.ExecuteCommand(context.Background(), "fail")

		if err != expectedErr {
			t.Errorf("Expected error %v, got %v", expectedErr, err)
		}
		if output != "error output" {
			t.Errorf("Expected 'error output', got %q", output)
		}
	})

	t.Run("handles pattern matching", func(t *testing.T) {
		mock := NewMockCommandExecutor()
		mock.SetOutput("powershell", "PS output")

		output, _ := mock.ExecuteCommand(context.Background(), "powershell", "-Command", "Get-Process")

		if output != "PS output" {
			t.Errorf("Expected 'PS output', got %q", output)
		}
	})

	t.Run("resets state", func(t *testing.T) {
		mock := NewMockCommandExecutor()
		mock.SetOutput("test", "output")
		_, _ = mock.ExecuteCommand(context.Background(), "test")

		mock.Reset()

		commands := mock.GetCommands()
		if len(commands) != 0 {
			t.Errorf("Expected 0 commands after reset, got %d", len(commands))
		}
	})
}

// TestMockHTTPClient tests the mock HTTP client
func TestMockHTTPClient(t *testing.T) {
	t.Run("returns configured response", func(t *testing.T) {
		mock := NewMockHTTPClient()
		mock.SetResponse("/api/test", []byte(`{"success":true}`), 200)

		// Note: In real usage, you'd create an http.Request and call Do()
		// For this test, we're just verifying the mock setup
		resp, ok := mock.Responses["/api/test"]
		if !ok {
			t.Error("Expected response to be configured")
		}
		if resp.StatusCode != 200 {
			t.Errorf("Expected status 200, got %d", resp.StatusCode)
		}
	})

	t.Run("records requests", func(t *testing.T) {
		mock := NewMockHTTPClient()
		// Verify requests slice is initialized
		requests := mock.GetRequests()
		if requests == nil {
			t.Error("Expected requests slice to be initialized")
		}
	})

	t.Run("resets state", func(t *testing.T) {
		mock := NewMockHTTPClient()
		mock.SetResponse("/api/test", []byte("test"), 200)

		mock.Reset()

		if len(mock.Responses) != 0 {
			t.Errorf("Expected 0 responses after reset, got %d", len(mock.Responses))
		}
	})
}

// TestHelperFunctions tests the assertion helper functions
func TestHelperFunctions(t *testing.T) {
	t.Run("AssertEqual with matching values", func(t *testing.T) {
		// This should not panic
		AssertEqual(t, "test", "test", "Values should match")
	})

	t.Run("AssertNotEqual with different values", func(t *testing.T) {
		// This should not panic
		AssertNotEqual(t, "test1", "test2", "Values should differ")
	})

	t.Run("AssertContains with substring", func(t *testing.T) {
		// This should not panic
		AssertContains(t, "hello world", "world", "Should contain substring")
	})

	t.Run("AssertTrue with true value", func(t *testing.T) {
		// This should not panic
		AssertTrue(t, true, "Value should be true")
	})

	t.Run("AssertFalse with false value", func(t *testing.T) {
		// This should not panic
		AssertFalse(t, false, "Value should be false")
	})
}

// TestWithContext tests context creation helpers
func TestWithContext(t *testing.T) {
	t.Run("creates context with timeout", func(t *testing.T) {
		ctx, cancel := WithContext(1 * time.Second)
		defer cancel()

		if ctx == nil {
			t.Error("Expected non-nil context")
		}

		// Verify deadline is set
		_, ok := ctx.Deadline()
		if !ok {
			t.Error("Expected deadline to be set")
		}
	})

	t.Run("creates cancellable context", func(t *testing.T) {
		ctx, cancel := WithCancelContext()
		defer cancel()

		if ctx == nil {
			t.Error("Expected non-nil context")
		}
	})
}

// TestMeasureExecutionTime tests execution time measurement
func TestMeasureExecutionTime(t *testing.T) {
	duration := MeasureExecutionTime(func() {
		time.Sleep(50 * time.Millisecond)
	})

	if duration < 50*time.Millisecond {
		t.Errorf("Expected duration >= 50ms, got %v", duration)
	}
	if duration > 100*time.Millisecond {
		t.Errorf("Expected duration < 100ms, got %v", duration)
	}
}

// TestWaitForCondition tests condition waiting helper
func TestWaitForCondition(t *testing.T) {
	t.Run("succeeds when condition becomes true", func(t *testing.T) {
		counter := 0
		result := WaitForCondition(1*time.Second, func() bool {
			counter++
			return counter >= 3
		})

		if !result {
			t.Error("Expected condition to become true")
		}
	})

	t.Run("fails when timeout is reached", func(t *testing.T) {
		result := WaitForCondition(100*time.Millisecond, func() bool {
			return false
		})

		if result {
			t.Error("Expected condition to timeout")
		}
	})
}

// TestMockFileSystem tests the mock file system
func TestMockFileSystem(t *testing.T) {
	t.Run("writes and reads files", func(t *testing.T) {
		fs := NewMockFileSystem()

		err := fs.WriteFile("/test/file.txt", []byte("content"))
		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}

		data, err := fs.ReadFile("/test/file.txt")
		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}
		if string(data) != "content" {
			t.Errorf("Expected 'content', got %q", string(data))
		}
	})

	t.Run("checks file existence", func(t *testing.T) {
		fs := NewMockFileSystem()
		fs.WriteFile("/test.txt", []byte("data"))

		if !fs.FileExists("/test.txt") {
			t.Error("Expected file to exist")
		}
		if fs.FileExists("/nonexistent.txt") {
			t.Error("Expected file to not exist")
		}
	})

	t.Run("creates directories", func(t *testing.T) {
		fs := NewMockFileSystem()

		err := fs.MkdirAll("/test/dir")
		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}

		if !fs.DirExists("/test/dir") {
			t.Error("Expected directory to exist")
		}
	})

	t.Run("resets state", func(t *testing.T) {
		fs := NewMockFileSystem()
		fs.WriteFile("/test.txt", []byte("data"))
		fs.MkdirAll("/test/dir")

		fs.Reset()

		if fs.FileExists("/test.txt") {
			t.Error("Expected file to be cleared after reset")
		}
		if fs.DirExists("/test/dir") {
			t.Error("Expected directory to be cleared after reset")
		}
	})
}
