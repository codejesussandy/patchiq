package logger

import (
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestInit_DefaultLevel(t *testing.T) {
	err := Init("info", "json", "")
	assert.NoError(t, err)
}

func TestInit_DebugLevel(t *testing.T) {
	err := Init("debug", "json", "")
	assert.NoError(t, err)
}

func TestInit_TextFormat(t *testing.T) {
	err := Init("info", "text", "")
	assert.NoError(t, err)
}

func TestInit_InvalidLevel_DefaultsToInfo(t *testing.T) {
	// Invalid level should default to info with no error
	err := Init("notavalidlevel", "json", "")
	assert.NoError(t, err)
}

func TestInit_LogFile(t *testing.T) {
	dir := t.TempDir()
	logFile := filepath.Join(dir, "test.log")

	err := Init("info", "json", logFile)
	require.NoError(t, err)
}

func TestInit_InvalidLogFilePath(t *testing.T) {
	err := Init("info", "json", "/nonexistent/path/that/does/not/exist/test.log")
	assert.Error(t, err)
}

func TestWithComponent_ReturnsLogger(t *testing.T) {
	require.NoError(t, Init("info", "json", ""))
	l := WithComponent("mycomponent")
	// Should be usable without panic
	assert.NotPanics(t, func() {
		l.Info().Msg("test message from component")
	})
}

func TestWithCommandID_ReturnsLogger(t *testing.T) {
	require.NoError(t, Init("info", "json", ""))
	l := WithCommandID("cmd-abc-123")
	assert.NotPanics(t, func() {
		l.Info().Msg("test message with command id")
	})
}

func TestWithFields_ReturnsLogger(t *testing.T) {
	require.NoError(t, Init("info", "json", ""))
	l := WithFields(map[string]interface{}{
		"key1": "value1",
		"key2": 42,
	})
	assert.NotPanics(t, func() {
		l.Info().Msg("test message with fields")
	})
}

func TestWithFields_EmptyMap(t *testing.T) {
	require.NoError(t, Init("info", "json", ""))
	l := WithFields(map[string]interface{}{})
	assert.NotPanics(t, func() {
		l.Info().Msg("test")
	})
}
