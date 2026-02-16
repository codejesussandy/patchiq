package testutil

import (
	"context"
	"strings"
	"testing"
	"time"
)

// RunWithTimeout runs a function with timeout
func RunWithTimeout(t *testing.T, timeout time.Duration, fn func()) {
	done := make(chan struct{})
	go func() {
		fn()
		close(done)
	}()

	select {
	case <-done:
		// Success
	case <-time.After(timeout):
		t.Fatal("Test timed out")
	}
}

// AssertNoError fails test if error is not nil
func AssertNoError(t *testing.T, err error, msg string) {
	t.Helper()
	if err != nil {
		t.Fatalf("%s: %v", msg, err)
	}
}

// AssertError fails test if error is nil
func AssertError(t *testing.T, err error, msg string) {
	t.Helper()
	if err == nil {
		t.Fatalf("%s: expected error but got nil", msg)
	}
}

// AssertEqual fails test if values are not equal
func AssertEqual(t *testing.T, expected, actual interface{}, msg string) {
	t.Helper()
	if expected != actual {
		t.Fatalf("%s: expected %v, got %v", msg, expected, actual)
	}
}

// AssertNotEqual fails test if values are equal
func AssertNotEqual(t *testing.T, expected, actual interface{}, msg string) {
	t.Helper()
	if expected == actual {
		t.Fatalf("%s: expected values to be different, but both are %v", msg, expected)
	}
}

// AssertContains fails test if string doesn't contain substring
func AssertContains(t *testing.T, str, substr, msg string) {
	t.Helper()
	if !strings.Contains(str, substr) {
		t.Fatalf("%s: expected string to contain %q, got %q", msg, substr, str)
	}
}

// AssertNotContains fails test if string contains substring
func AssertNotContains(t *testing.T, str, substr, msg string) {
	t.Helper()
	if strings.Contains(str, substr) {
		t.Fatalf("%s: expected string to NOT contain %q, got %q", msg, substr, str)
	}
}

// AssertTrue fails test if value is not true
func AssertTrue(t *testing.T, value bool, msg string) {
	t.Helper()
	if !value {
		t.Fatalf("%s: expected true, got false", msg)
	}
}

// AssertFalse fails test if value is not false
func AssertFalse(t *testing.T, value bool, msg string) {
	t.Helper()
	if value {
		t.Fatalf("%s: expected false, got true", msg)
	}
}

// AssertNil fails test if value is not nil
func AssertNil(t *testing.T, value interface{}, msg string) {
	t.Helper()
	if value != nil {
		t.Fatalf("%s: expected nil, got %v", msg, value)
	}
}

// AssertNotNil fails test if value is nil
func AssertNotNil(t *testing.T, value interface{}, msg string) {
	t.Helper()
	if value == nil {
		t.Fatalf("%s: expected non-nil value", msg)
	}
}

// AssertGreaterThan fails test if value is not greater than threshold
func AssertGreaterThan(t *testing.T, value, threshold int64, msg string) {
	t.Helper()
	if value <= threshold {
		t.Fatalf("%s: expected value > %d, got %d", msg, threshold, value)
	}
}

// AssertLessThan fails test if value is not less than threshold
func AssertLessThan(t *testing.T, value, threshold int64, msg string) {
	t.Helper()
	if value >= threshold {
		t.Fatalf("%s: expected value < %d, got %d", msg, threshold, value)
	}
}

// AssertBetween fails test if value is not between min and max
func AssertBetween(t *testing.T, value, min, max int64, msg string) {
	t.Helper()
	if value < min || value > max {
		t.Fatalf("%s: expected value between %d and %d, got %d", msg, min, max, value)
	}
}

// AssertEmpty fails test if string is not empty
func AssertEmpty(t *testing.T, str string, msg string) {
	t.Helper()
	if str != "" {
		t.Fatalf("%s: expected empty string, got %q", msg, str)
	}
}

// AssertNotEmpty fails test if string is empty
func AssertNotEmpty(t *testing.T, str string, msg string) {
	t.Helper()
	if str == "" {
		t.Fatalf("%s: expected non-empty string", msg)
	}
}

// AssertLen fails test if slice/array length doesn't match expected
func AssertLen(t *testing.T, slice interface{}, expectedLen int, msg string) {
	t.Helper()
	// This is a simplified version - in production you'd use reflection
	// For now, we'll just provide a helper that works with string slices
	switch v := slice.(type) {
	case []string:
		if len(v) != expectedLen {
			t.Fatalf("%s: expected length %d, got %d", msg, expectedLen, len(v))
		}
	case []int:
		if len(v) != expectedLen {
			t.Fatalf("%s: expected length %d, got %d", msg, expectedLen, len(v))
		}
	default:
		t.Fatalf("%s: unsupported type for AssertLen", msg)
	}
}

// WithContext creates a context with timeout for tests
func WithContext(timeout time.Duration) (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), timeout)
}

// WithCancelContext creates a cancellable context for tests
func WithCancelContext() (context.Context, context.CancelFunc) {
	return context.WithCancel(context.Background())
}

// MeasureExecutionTime measures the execution time of a function
func MeasureExecutionTime(fn func()) time.Duration {
	start := time.Now()
	fn()
	return time.Since(start)
}

// AssertDurationBetween fails test if duration is not between min and max
func AssertDurationBetween(t *testing.T, duration, min, max time.Duration, msg string) {
	t.Helper()
	if duration < min || duration > max {
		t.Fatalf("%s: expected duration between %v and %v, got %v", msg, min, max, duration)
	}
}

// AssertDurationLessThan fails test if duration is not less than threshold
func AssertDurationLessThan(t *testing.T, duration, threshold time.Duration, msg string) {
	t.Helper()
	if duration >= threshold {
		t.Fatalf("%s: expected duration < %v, got %v", msg, threshold, duration)
	}
}

// AssertDurationGreaterThan fails test if duration is not greater than threshold
func AssertDurationGreaterThan(t *testing.T, duration, threshold time.Duration, msg string) {
	t.Helper()
	if duration <= threshold {
		t.Fatalf("%s: expected duration > %v, got %v", msg, threshold, duration)
	}
}

// RetryUntilSuccess retries a function until it succeeds or timeout is reached
func RetryUntilSuccess(t *testing.T, timeout time.Duration, interval time.Duration, fn func() error) error {
	t.Helper()
	deadline := time.Now().Add(timeout)
	var lastErr error

	for time.Now().Before(deadline) {
		if err := fn(); err == nil {
			return nil
		} else {
			lastErr = err
		}
		time.Sleep(interval)
	}

	return lastErr
}

// ExpectPanic fails test if function doesn't panic
func ExpectPanic(t *testing.T, fn func(), msg string) {
	t.Helper()
	defer func() {
		if r := recover(); r == nil {
			t.Fatalf("%s: expected panic but function completed normally", msg)
		}
	}()
	fn()
}

// AssertStringSliceEqual fails test if string slices are not equal
func AssertStringSliceEqual(t *testing.T, expected, actual []string, msg string) {
	t.Helper()
	if len(expected) != len(actual) {
		t.Fatalf("%s: slice lengths differ - expected %d, got %d", msg, len(expected), len(actual))
	}
	for i, exp := range expected {
		if actual[i] != exp {
			t.Fatalf("%s: element %d differs - expected %q, got %q", msg, i, exp, actual[i])
		}
	}
}

// AssertMapContainsKey fails test if map doesn't contain key
func AssertMapContainsKey(t *testing.T, m map[string]interface{}, key string, msg string) {
	t.Helper()
	if _, ok := m[key]; !ok {
		t.Fatalf("%s: map doesn't contain key %q", msg, key)
	}
}

// AssertMapNotContainsKey fails test if map contains key
func AssertMapNotContainsKey(t *testing.T, m map[string]interface{}, key string, msg string) {
	t.Helper()
	if _, ok := m[key]; ok {
		t.Fatalf("%s: map should not contain key %q", msg, key)
	}
}
