package client

import "fmt"

// AgentError provides structured error messages with hints for troubleshooting.
type AgentError struct {
	Code    string
	Message string
	Hint    string
	Cause   error
}

func (e *AgentError) Error() string {
	msg := fmt.Sprintf("[%s] %s", e.Code, e.Message)
	if e.Cause != nil {
		msg += ": " + e.Cause.Error()
	}
	if e.Hint != "" {
		msg += "\n  Hint: " + e.Hint
	}
	return msg
}

func (e *AgentError) Unwrap() error {
	return e.Cause
}

// WithCause returns a copy of the error with the given cause attached.
func (e *AgentError) WithCause(err error) *AgentError {
	return &AgentError{
		Code:    e.Code,
		Message: e.Message,
		Hint:    e.Hint,
		Cause:   err,
	}
}

// Common agent errors with actionable hints.
var (
	ErrConnectionFailed = &AgentError{
		Code:    "CONN_001",
		Message: "Failed to connect to server",
		Hint:    "Check network connectivity and proxy settings. Use --test-proxy to diagnose.",
	}

	ErrAuthFailed = &AgentError{
		Code:    "AUTH_001",
		Message: "Authentication failed",
		Hint:    "Credentials may be invalid. Delete ~/.patchify-agent/credentials.json and restart.",
	}

	ErrRegistrationFailed = &AgentError{
		Code:    "REG_001",
		Message: "Registration failed",
		Hint:    "Verify the server URL is correct and the server is accepting new agents.",
	}

	ErrDownloadFailed = &AgentError{
		Code:    "DL_001",
		Message: "Download failed",
		Hint:    "Check network connection and available disk space. Downloads will auto-resume.",
	}

	ErrChecksumMismatch = &AgentError{
		Code:    "DL_002",
		Message: "Download checksum mismatch",
		Hint:    "The downloaded file is corrupted. It will be re-downloaded automatically.",
	}

	ErrConfigLoad = &AgentError{
		Code:    "CFG_001",
		Message: "Failed to load configuration",
		Hint:    "Check config file permissions and JSON syntax. Run --setup to reconfigure.",
	}
)
