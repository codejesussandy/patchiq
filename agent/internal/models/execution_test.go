package models

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNewSuccessResult(t *testing.T) {
	t.Parallel()
	r := NewSuccessResult("operation completed", 500)
	assert.True(t, r.Success)
	assert.Equal(t, "operation completed", r.Message)
	assert.Equal(t, int64(500), r.Duration)
	assert.Empty(t, r.ErrorCode)
	assert.Empty(t, r.ErrorMessage)
	assert.False(t, r.Retryable)
}

func TestNewErrorResult(t *testing.T) {
	t.Parallel()
	r := NewErrorResult(ErrTimeout, "timed out", 1000)
	assert.False(t, r.Success)
	assert.Equal(t, ErrTimeout, r.ErrorCode)
	assert.Equal(t, "timed out", r.ErrorMessage)
	assert.Equal(t, int64(1000), r.Duration)
	assert.True(t, r.Retryable)
}

func TestNewErrorResult_NonRetryable(t *testing.T) {
	t.Parallel()
	r := NewErrorResult(ErrPermissionDenied, "access denied", 100)
	assert.False(t, r.Success)
	assert.False(t, r.Retryable)
	assert.Equal(t, ErrPermissionDenied, r.ErrorCode)
}

func TestIsRetryableError_Retryable(t *testing.T) {
	t.Parallel()
	assert.True(t, IsRetryableError(ErrTimeout))
	assert.True(t, IsRetryableError(ErrNetworkFailure))
	assert.True(t, IsRetryableError(ErrServiceUnavailable))
}

func TestIsRetryableError_NotRetryable(t *testing.T) {
	t.Parallel()
	notRetryable := []string{
		ErrPermissionDenied,
		ErrDiskFull,
		ErrChecksumMismatch,
		ErrScriptNotFound,
		ErrDependencyMissing,
		ErrInvalidPayload,
		ErrInvalidInput,
		ErrPackageNotFound,
		ErrAlreadyInstalled,
		ErrNotInstalled,
		ErrIncompatible,
		ErrUserCancelled,
		ErrUnknown,
	}
	for _, code := range notRetryable {
		assert.False(t, IsRetryableError(code), "expected %s to be non-retryable", code)
	}
}

func TestIsRetryableError_UnknownCode(t *testing.T) {
	t.Parallel()
	assert.False(t, IsRetryableError("SOME_UNKNOWN_ERROR_CODE"))
}

func TestErrorCodeConstants_NonEmpty(t *testing.T) {
	t.Parallel()
	codes := []string{
		ErrTimeout,
		ErrPermissionDenied,
		ErrDiskFull,
		ErrNetworkFailure,
		ErrChecksumMismatch,
		ErrScriptNotFound,
		ErrDependencyMissing,
		ErrInvalidPayload,
		ErrInvalidInput,
		ErrPackageNotFound,
		ErrServiceUnavailable,
		ErrAlreadyInstalled,
		ErrNotInstalled,
		ErrIncompatible,
		ErrUserCancelled,
		ErrUnknown,
	}
	for _, c := range codes {
		assert.NotEmpty(t, c)
	}
}
