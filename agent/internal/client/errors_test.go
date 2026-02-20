package client

import (
	"errors"
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ---- ErrAuth ----

func TestErrAuth_Error(t *testing.T) {
	t.Parallel()
	err := &ErrAuth{StatusCode: 401, Message: "invalid token"}
	assert.Equal(t, "auth failed (status 401): invalid token", err.Error())
}

func TestErrAuth_Error_403(t *testing.T) {
	t.Parallel()
	err := &ErrAuth{StatusCode: 403, Message: "forbidden"}
	assert.Contains(t, err.Error(), "403")
	assert.Contains(t, err.Error(), "forbidden")
}

func TestErrAuth_IsDetectedByErrorsAs(t *testing.T) {
	t.Parallel()
	original := &ErrAuth{StatusCode: 401, Message: "test"}
	wrapped := fmt.Errorf("wrapped: %w", original)

	var target *ErrAuth
	require.True(t, errors.As(wrapped, &target))
	assert.Equal(t, 401, target.StatusCode)
}

// ---- AgentError ----

func TestAgentError_Error_WithCause(t *testing.T) {
	t.Parallel()
	cause := errors.New("network timeout")
	e := &AgentError{
		Code:    "CONN_001",
		Message: "Failed to connect",
		Cause:   cause,
	}
	msg := e.Error()
	assert.Contains(t, msg, "CONN_001")
	assert.Contains(t, msg, "Failed to connect")
	assert.Contains(t, msg, "network timeout")
}

func TestAgentError_Error_WithHint(t *testing.T) {
	t.Parallel()
	e := &AgentError{
		Code:    "AUTH_001",
		Message: "Authentication failed",
		Hint:    "Check your credentials",
	}
	msg := e.Error()
	assert.Contains(t, msg, "AUTH_001")
	assert.Contains(t, msg, "Authentication failed")
	assert.Contains(t, msg, "Check your credentials")
}

func TestAgentError_Error_NoCauseNoHint(t *testing.T) {
	t.Parallel()
	e := &AgentError{
		Code:    "REG_001",
		Message: "Registration failed",
	}
	msg := e.Error()
	assert.Equal(t, "[REG_001] Registration failed", msg)
}

func TestAgentError_Unwrap(t *testing.T) {
	t.Parallel()
	cause := errors.New("root cause")
	e := &AgentError{Code: "X", Message: "msg", Cause: cause}

	assert.Equal(t, cause, e.Unwrap())
	assert.True(t, errors.Is(e, cause))
}

func TestAgentError_WithCause(t *testing.T) {
	t.Parallel()
	base := &AgentError{Code: "DL_001", Message: "Download failed", Hint: "Check disk"}
	cause := errors.New("no space left")
	derived := base.WithCause(cause)

	assert.Equal(t, base.Code, derived.Code)
	assert.Equal(t, base.Message, derived.Message)
	assert.Equal(t, base.Hint, derived.Hint)
	assert.Equal(t, cause, derived.Cause)
	// Base should be unmodified
	assert.Nil(t, base.Cause)
}

// ---- Predefined errors ----

func TestPredefinedErrors_NotNil(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name string
		err  *AgentError
	}{
		{"ErrConnectionFailed", ErrConnectionFailed},
		{"ErrAuthFailed", ErrAuthFailed},
		{"ErrRegistrationFailed", ErrRegistrationFailed},
		{"ErrDownloadFailed", ErrDownloadFailed},
		{"ErrChecksumMismatch", ErrChecksumMismatch},
		{"ErrConfigLoad", ErrConfigLoad},
	}
	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			require.NotNil(t, tt.err)
			assert.NotEmpty(t, tt.err.Code)
			assert.NotEmpty(t, tt.err.Message)
			assert.NotEmpty(t, tt.err.Hint)
		})
	}
}

func TestPredefinedErrors_Codes(t *testing.T) {
	t.Parallel()
	assert.Equal(t, "CONN_001", ErrConnectionFailed.Code)
	assert.Equal(t, "AUTH_001", ErrAuthFailed.Code)
	assert.Equal(t, "REG_001", ErrRegistrationFailed.Code)
	assert.Equal(t, "DL_001", ErrDownloadFailed.Code)
	assert.Equal(t, "DL_002", ErrChecksumMismatch.Code)
	assert.Equal(t, "CFG_001", ErrConfigLoad.Code)
}

func TestPredefinedErrors_WithCause_DoesNotMutate(t *testing.T) {
	t.Parallel()
	cause := errors.New("something went wrong")
	wrapped := ErrConnectionFailed.WithCause(cause)

	assert.Nil(t, ErrConnectionFailed.Cause, "WithCause must not mutate original error")
	assert.Equal(t, cause, wrapped.Cause)
	assert.Equal(t, ErrConnectionFailed.Code, wrapped.Code)
}

func TestAgentError_ImplementsError(t *testing.T) {
	t.Parallel()
	var _ error = &AgentError{}
}
