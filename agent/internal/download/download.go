// Package download provides utilities for rate-limited and progress-tracked file downloads.
// It includes wrappers for io.Reader that add bandwidth throttling and progress reporting.
package download

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"math"
	"os"
	"sync/atomic"
	"time"
)

// RateLimitedReader wraps an io.Reader with bandwidth throttling.
// Uses a simple sleep-based approach (no external dependencies).
// bytesPerSecond of 0 means unlimited.
type RateLimitedReader struct {
	reader      io.Reader
	bytesPerSec int64
	bytesRead   int64
	startTime   time.Time
}

// NewRateLimitedReader creates a rate-limited reader that throttles download speed.
// If bytesPerSecond <= 0, returns the original reader without rate limiting.
// Uses sleep-based throttling to maintain the target download speed.
func NewRateLimitedReader(reader io.Reader, bytesPerSecond int) io.Reader {
	if bytesPerSecond <= 0 {
		return reader
	}
	return &RateLimitedReader{
		reader:      reader,
		bytesPerSec: int64(bytesPerSecond),
		startTime:   time.Now(),
	}
}

func (r *RateLimitedReader) Read(p []byte) (int, error) {
	n, err := r.reader.Read(p)
	if n <= 0 {
		return n, err
	}

	r.bytesRead += int64(n)

	// Calculate how long we should have taken at the target rate
	expectedDuration := time.Duration(float64(r.bytesRead) / float64(r.bytesPerSec) * float64(time.Second))
	actualDuration := time.Since(r.startTime)

	if sleepTime := expectedDuration - actualDuration; sleepTime > 0 {
		time.Sleep(sleepTime)
	}

	return n, err
}

// ProgressReader wraps an io.Reader and reports download progress.
type ProgressReader struct {
	reader     io.Reader
	total      int64
	downloaded int64
	lastReport time.Time
	startTime  time.Time
	onProgress func(downloaded int64, total int64, bytesPerSec float64)
}

// NewProgressReader creates a progress-tracking reader that reports download statistics.
// The onProgress callback is called at most every 2 seconds with:
//   - downloaded: bytes downloaded so far
//   - total: total file size in bytes
//   - bytesPerSec: current download speed
// If onProgress is nil, returns the original reader without progress tracking.
func NewProgressReader(reader io.Reader, total int64, onProgress func(downloaded int64, total int64, bytesPerSec float64)) io.Reader {
	if onProgress == nil {
		return reader
	}
	now := time.Now()
	return &ProgressReader{
		reader:     reader,
		total:      total,
		lastReport: now,
		startTime:  now,
		onProgress: onProgress,
	}
}

func (r *ProgressReader) Read(p []byte) (int, error) {
	n, err := r.reader.Read(p)
	if n > 0 {
		atomic.AddInt64(&r.downloaded, int64(n))

		if time.Since(r.lastReport) > 2*time.Second {
			elapsed := time.Since(r.startTime).Seconds()
			var bps float64
			if elapsed > 0 {
				bps = float64(r.downloaded) / elapsed
			}
			r.onProgress(r.downloaded, r.total, bps)
			r.lastReport = time.Now()
		}
	}
	return n, err
}

// VerifyChecksum validates the SHA256 checksum of a file.
// Returns an error if the file cannot be read or if the checksum does not match.
func VerifyChecksum(filePath, expectedSHA256 string) error {
	file, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("failed to open file for checksum verification: %w", err)
	}
	defer file.Close()

	hash := sha256.New()
	if _, err := io.Copy(hash, file); err != nil {
		return fmt.Errorf("failed to calculate checksum: %w", err)
	}

	actualSHA256 := hex.EncodeToString(hash.Sum(nil))
	if actualSHA256 != expectedSHA256 {
		return fmt.Errorf("checksum mismatch: expected %s, got %s", expectedSHA256, actualSHA256)
	}

	return nil
}

// RetryConfig specifies retry behavior for downloads.
type RetryConfig struct {
	MaxAttempts int           // Maximum number of attempts (default: 3)
	InitialWait time.Duration // Initial wait time (default: 1 second)
}

// DefaultRetryConfig returns the default retry configuration.
// Retry pattern: 1s, 4s, 9s (exponential backoff using squares: 1², 2², 3²)
func DefaultRetryConfig() RetryConfig {
	return RetryConfig{
		MaxAttempts: 3,
		InitialWait: 1 * time.Second,
	}
}

// RetryWithBackoff executes a function with exponential backoff retry logic.
// The wait time follows the pattern: 1s, 4s, 9s (n² seconds where n is attempt number).
// Returns the result of the first successful attempt or the last error encountered.
func RetryWithBackoff(config RetryConfig, operation func() error) error {
	var lastErr error

	if config.MaxAttempts <= 0 {
		config.MaxAttempts = 3
	}
	if config.InitialWait <= 0 {
		config.InitialWait = 1 * time.Second
	}

	for attempt := 1; attempt <= config.MaxAttempts; attempt++ {
		lastErr = operation()

		// Success - return immediately
		if lastErr == nil {
			return nil
		}

		// Last attempt - don't wait, just return the error
		if attempt == config.MaxAttempts {
			break
		}

		// Calculate exponential backoff: n² seconds (1s, 4s, 9s)
		waitTime := time.Duration(math.Pow(float64(attempt), 2)) * config.InitialWait
		time.Sleep(waitTime)
	}

	return fmt.Errorf("operation failed after %d attempts: %w", config.MaxAttempts, lastErr)
}
