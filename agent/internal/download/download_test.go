package download

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"io"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRateLimitedReader_ContentMatches(t *testing.T) {
	t.Parallel()
	data := []byte("hello rate limited world")
	r := NewRateLimitedReader(bytes.NewReader(data), 1024*1024) // 1MB/s

	got, err := io.ReadAll(r)
	require.NoError(t, err)
	assert.Equal(t, data, got)
}

func TestRateLimitedReader_ZeroReturnsOriginal(t *testing.T) {
	t.Parallel()
	original := bytes.NewReader([]byte("data"))
	r := NewRateLimitedReader(original, 0)
	// Should return the original reader, not wrapped
	assert.Equal(t, original, r)
}

func TestRateLimitedReader_NegativeReturnsOriginal(t *testing.T) {
	t.Parallel()
	original := bytes.NewReader([]byte("data"))
	r := NewRateLimitedReader(original, -5)
	assert.Equal(t, original, r)
}

func TestProgressReader_ContentMatches(t *testing.T) {
	t.Parallel()
	data := []byte("progress reader data")
	called := false
	r := NewProgressReader(bytes.NewReader(data), int64(len(data)), func(downloaded, total int64, bps float64) {
		called = true
		assert.LessOrEqual(t, downloaded, total)
	})

	got, err := io.ReadAll(r)
	require.NoError(t, err)
	assert.Equal(t, data, got)
	_ = called // callback may not fire if read completes in <2s (by design)
}

func TestProgressReader_NilCallbackReturnsOriginal(t *testing.T) {
	t.Parallel()
	original := bytes.NewReader([]byte("data"))
	r := NewProgressReader(original, 4, nil)
	assert.Equal(t, original, r)
}

func TestVerifyChecksum_Correct(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()
	file := filepath.Join(dir, "file.bin")
	content := []byte("checksum content")
	require.NoError(t, os.WriteFile(file, content, 0644))

	h := sha256.Sum256(content)
	expected := hex.EncodeToString(h[:])

	err := VerifyChecksum(file, expected)
	assert.NoError(t, err)
}

func TestVerifyChecksum_Wrong(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()
	file := filepath.Join(dir, "file.bin")
	require.NoError(t, os.WriteFile(file, []byte("content"), 0644))

	err := VerifyChecksum(file, "0000000000000000000000000000000000000000000000000000000000000000")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "checksum mismatch")
}

func TestVerifyChecksum_NonExistentFile(t *testing.T) {
	t.Parallel()
	err := VerifyChecksum("/nonexistent/file.bin", "abc123")
	assert.Error(t, err)
}

func TestDefaultRetryConfig(t *testing.T) {
	t.Parallel()
	cfg := DefaultRetryConfig()
	assert.Equal(t, 3, cfg.MaxAttempts)
	assert.Equal(t, 1*time.Second, cfg.InitialWait)
}

func TestRetryWithBackoff_Success(t *testing.T) {
	t.Parallel()
	calls := 0
	err := RetryWithBackoff(RetryConfig{MaxAttempts: 3, InitialWait: time.Millisecond}, func() error {
		calls++
		return nil
	})
	assert.NoError(t, err)
	assert.Equal(t, 1, calls)
}

func TestRetryWithBackoff_RetriesThenSucceeds(t *testing.T) {
	t.Parallel()
	calls := 0
	err := RetryWithBackoff(RetryConfig{MaxAttempts: 3, InitialWait: time.Millisecond}, func() error {
		calls++
		if calls < 3 {
			return errors.New("temporary error")
		}
		return nil
	})
	assert.NoError(t, err)
	assert.Equal(t, 3, calls)
}

func TestRetryWithBackoff_AllFail(t *testing.T) {
	t.Parallel()
	calls := 0
	err := RetryWithBackoff(RetryConfig{MaxAttempts: 3, InitialWait: time.Millisecond}, func() error {
		calls++
		return errors.New("always fails")
	})
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "operation failed after 3 attempts")
	assert.Equal(t, 3, calls)
}

func TestRetryWithBackoff_ZeroAttemptsDefaultsTo3(t *testing.T) {
	t.Parallel()
	calls := 0
	err := RetryWithBackoff(RetryConfig{MaxAttempts: 0, InitialWait: time.Millisecond}, func() error {
		calls++
		return errors.New("fail")
	})
	assert.Error(t, err)
	assert.Equal(t, 3, calls)
}
