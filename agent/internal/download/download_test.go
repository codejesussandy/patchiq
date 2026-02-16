package download

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"os"
	"testing"
	"time"
)

func TestVerifyChecksum_Valid(t *testing.T) {
	// Create temp file with known content
	content := []byte("test content for checksum validation")
	tmpFile, err := os.CreateTemp("", "checksum-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp file: %v", err)
	}
	defer os.Remove(tmpFile.Name())
	defer tmpFile.Close()

	if _, err := tmpFile.Write(content); err != nil {
		t.Fatalf("Failed to write to temp file: %v", err)
	}
	tmpFile.Close()

	// Calculate expected checksum
	hash := sha256.New()
	hash.Write(content)
	expectedChecksum := hex.EncodeToString(hash.Sum(nil))

	// Verify checksum
	err = VerifyChecksum(tmpFile.Name(), expectedChecksum)
	if err != nil {
		t.Errorf("VerifyChecksum failed with valid checksum: %v", err)
	}
}

func TestVerifyChecksum_Invalid(t *testing.T) {
	// Create temp file
	content := []byte("test content")
	tmpFile, err := os.CreateTemp("", "checksum-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp file: %v", err)
	}
	defer os.Remove(tmpFile.Name())
	defer tmpFile.Close()

	if _, err := tmpFile.Write(content); err != nil {
		t.Fatalf("Failed to write to temp file: %v", err)
	}
	tmpFile.Close()

	// Use wrong checksum
	wrongChecksum := "0000000000000000000000000000000000000000000000000000000000000000"

	// Verify checksum
	err = VerifyChecksum(tmpFile.Name(), wrongChecksum)
	if err == nil {
		t.Error("VerifyChecksum should have failed with invalid checksum")
	}

	if !contains(err.Error(), "checksum mismatch") {
		t.Errorf("Expected 'checksum mismatch' error, got: %v", err)
	}
}

func TestVerifyChecksum_FileNotFound(t *testing.T) {
	err := VerifyChecksum("/nonexistent/file.txt", "dummy-checksum")
	if err == nil {
		t.Error("VerifyChecksum should have failed for nonexistent file")
	}

	if !contains(err.Error(), "failed to open file") {
		t.Errorf("Expected 'failed to open file' error, got: %v", err)
	}
}

func TestRetryWithBackoff_Success(t *testing.T) {
	attempts := 0
	config := DefaultRetryConfig()

	// Operation succeeds on first attempt
	err := RetryWithBackoff(config, func() error {
		attempts++
		return nil
	})

	if err != nil {
		t.Errorf("RetryWithBackoff failed: %v", err)
	}

	if attempts != 1 {
		t.Errorf("Expected 1 attempt, got %d", attempts)
	}
}

func TestRetryWithBackoff_SuccessOnSecondAttempt(t *testing.T) {
	attempts := 0
	config := DefaultRetryConfig()

	// Operation fails first time, succeeds second time
	err := RetryWithBackoff(config, func() error {
		attempts++
		if attempts == 1 {
			return errors.New("temporary failure")
		}
		return nil
	})

	if err != nil {
		t.Errorf("RetryWithBackoff failed: %v", err)
	}

	if attempts != 2 {
		t.Errorf("Expected 2 attempts, got %d", attempts)
	}
}

func TestRetryWithBackoff_Failure(t *testing.T) {
	attempts := 0
	config := DefaultRetryConfig()

	// Operation always fails
	err := RetryWithBackoff(config, func() error {
		attempts++
		return errors.New("persistent failure")
	})

	if err == nil {
		t.Error("RetryWithBackoff should have failed")
	}

	if attempts != config.MaxAttempts {
		t.Errorf("Expected %d attempts, got %d", config.MaxAttempts, attempts)
	}

	if !contains(err.Error(), "operation failed after 3 attempts") {
		t.Errorf("Expected retry exhaustion message, got: %v", err)
	}
}

func TestRetryWithBackoff_ExponentialBackoff(t *testing.T) {
	attempts := 0
	config := RetryConfig{
		MaxAttempts: 3,
		InitialWait: 10 * time.Millisecond, // Shorter for testing
	}

	startTime := time.Now()
	timestamps := []time.Time{}

	// Operation always fails
	RetryWithBackoff(config, func() error {
		attempts++
		timestamps = append(timestamps, time.Now())
		return errors.New("test failure")
	})

	if attempts != 3 {
		t.Errorf("Expected 3 attempts, got %d", attempts)
	}

	// Verify backoff timing (1x, 4x, no wait after last)
	// First wait: ~10ms (1² × 10ms)
	// Second wait: ~40ms (2² × 10ms)
	// Total expected: ~50ms minimum

	totalDuration := time.Since(startTime)
	expectedMinDuration := 50 * time.Millisecond

	if totalDuration < expectedMinDuration {
		t.Errorf("Expected at least %v total duration, got %v", expectedMinDuration, totalDuration)
	}

	// Verify individual wait times (with tolerance for timing variance)
	if len(timestamps) >= 2 {
		firstWait := timestamps[1].Sub(timestamps[0])
		tolerance := 20 * time.Millisecond

		expectedFirstWait := 10 * time.Millisecond
		if firstWait < expectedFirstWait || firstWait > expectedFirstWait+tolerance {
			t.Logf("First wait duration: %v (expected ~%v)", firstWait, expectedFirstWait)
		}
	}

	if len(timestamps) >= 3 {
		secondWait := timestamps[2].Sub(timestamps[1])
		tolerance := 30 * time.Millisecond

		expectedSecondWait := 40 * time.Millisecond
		if secondWait < expectedSecondWait || secondWait > expectedSecondWait+tolerance {
			t.Logf("Second wait duration: %v (expected ~%v)", secondWait, expectedSecondWait)
		}
	}
}

func TestRetryWithBackoff_CustomConfig(t *testing.T) {
	attempts := 0
	config := RetryConfig{
		MaxAttempts: 5,
		InitialWait: 100 * time.Millisecond,
	}

	// Operation always fails
	err := RetryWithBackoff(config, func() error {
		attempts++
		return errors.New("test failure")
	})

	if err == nil {
		t.Error("RetryWithBackoff should have failed")
	}

	if attempts != 5 {
		t.Errorf("Expected 5 attempts, got %d", attempts)
	}
}

func TestRetryWithBackoff_ZeroConfig(t *testing.T) {
	attempts := 0
	config := RetryConfig{} // Zero values should use defaults

	// Operation always fails
	RetryWithBackoff(config, func() error {
		attempts++
		return errors.New("test failure")
	})

	// Should default to 3 attempts
	if attempts != 3 {
		t.Errorf("Expected 3 attempts with zero config, got %d", attempts)
	}
}

// Helper function to check if a string contains a substring
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 ||
		(len(s) > len(substr) && findSubstring(s, substr)))
}

func findSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
