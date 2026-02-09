package download

import (
	"io"
	"sync/atomic"
	"time"
)

// RateLimitedReader wraps an io.Reader with bandwidth throttling.
// Uses a simple sleep-based approach (no external dependencies).
// bytesPerSecond of 0 means unlimited.
type RateLimitedReader struct {
	reader       io.Reader
	bytesPerSec  int64
	bytesRead    int64
	startTime    time.Time
}

// NewRateLimitedReader creates a rate-limited reader.
// bytesPerSecond <= 0 means unlimited.
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

// NewProgressReader creates a progress-tracking reader.
// onProgress is called periodically (at most every 2 seconds) with current stats.
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
