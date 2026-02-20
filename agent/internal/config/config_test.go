package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// clearConfigEnv unsets all environment variables that DefaultConfig reads.
func clearConfigEnv(t *testing.T) {
	t.Helper()
	for _, key := range []string{
		"PATCHIQ_SERVER_URL", "PATCHIQ_WEBUI_PORT", "PATCHIQ_LOG_LEVEL",
		"PATCHIQ_LOG_FORMAT", "PATCHIQ_DATA_DIR", "PATCHIQ_PROXY_URL",
		"PATCHIQ_PROXY_USER", "PATCHIQ_PROXY_PASSWORD",
		"HTTPS_PROXY", "HTTP_PROXY", "NO_PROXY",
	} {
		t.Setenv(key, "unset-placeholder")
		os.Unsetenv(key)
	}
}

func TestDefaultConfig_Defaults(t *testing.T) {
	clearConfigEnv(t)
	cfg := DefaultConfig()
	assert.Equal(t, 60, cfg.HeartbeatInterval)
	assert.Equal(t, 3006, cfg.WebUIPort)
	assert.NotEmpty(t, cfg.DataDir)
	assert.Equal(t, "info", cfg.LogLevel)
	assert.Equal(t, "json", cfg.LogFormat)
	assert.Equal(t, 30, cfg.JobRetentionDays)
	assert.True(t, cfg.EnableWebUI)
	assert.True(t, cfg.CollectHardware)
	assert.True(t, cfg.CollectSoftware)
	assert.True(t, cfg.CollectNetwork)
	assert.True(t, cfg.CollectSecurity)
	assert.True(t, cfg.EnableDownloadResume)
	assert.Equal(t, 900, cfg.CommandTimeoutSeconds)
	assert.Equal(t, "production", cfg.DeploymentGroup)
}

func TestDefaultConfig_EnvOverrides(t *testing.T) {
	t.Setenv("PATCHIQ_SERVER_URL", "https://example.com")
	t.Setenv("PATCHIQ_WEBUI_PORT", "9090")
	t.Setenv("PATCHIQ_LOG_LEVEL", "debug")
	t.Setenv("PATCHIQ_LOG_FORMAT", "text")
	t.Setenv("PATCHIQ_DATA_DIR", "/tmp/mydata")

	cfg := DefaultConfig()
	assert.Equal(t, "https://example.com", cfg.ServerURL)
	assert.Equal(t, 9090, cfg.WebUIPort)
	assert.Equal(t, "debug", cfg.LogLevel)
	assert.Equal(t, "text", cfg.LogFormat)
	assert.Equal(t, "/tmp/mydata", cfg.DataDir)
}

func TestDefaultConfig_ProxyEnv(t *testing.T) {
	t.Setenv("PATCHIQ_PROXY_URL", "http://proxy.example.com:8080")
	t.Setenv("PATCHIQ_PROXY_USER", "user")
	t.Setenv("PATCHIQ_PROXY_PASSWORD", "pass")
	t.Setenv("NO_PROXY", "localhost")

	cfg := DefaultConfig()
	assert.Equal(t, "http://proxy.example.com:8080", cfg.ProxyURL)
	assert.Equal(t, "user", cfg.ProxyUser)
	assert.Equal(t, "pass", cfg.ProxyPassword)
	assert.Equal(t, "localhost", cfg.NoProxy)
}

func TestDefaultConfig_ProxyFallback(t *testing.T) {
	t.Setenv("HTTPS_PROXY", "https://fallback.com")
	cfg := DefaultConfig()
	assert.Equal(t, "https://fallback.com", cfg.ProxyURL)
}

func TestDefaultConfig_InvalidWebUIPort(t *testing.T) {
	clearConfigEnv(t)
	t.Setenv("PATCHIQ_WEBUI_PORT", "not-a-number")
	cfg := DefaultConfig()
	// Invalid port keeps the hardcoded default
	assert.Equal(t, 3006, cfg.WebUIPort)
}

func TestLoad_NonExistentReturnsDefaults(t *testing.T) {
	clearConfigEnv(t)
	cfg, err := Load("/nonexistent/path/config.json")
	require.NoError(t, err)
	require.NotNil(t, cfg)
	assert.Equal(t, 60, cfg.HeartbeatInterval)
	assert.Equal(t, 3006, cfg.WebUIPort)
}

func TestLoad_ValidJSON(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()
	cfgPath := filepath.Join(dir, "config.json")

	data := map[string]interface{}{
		"serverUrl":              "https://srv.example.com",
		"webUiPort":              8080,
		"heartbeatIntervalSeconds": 120,
		"logLevel":               "debug",
	}
	b, err := json.Marshal(data)
	require.NoError(t, err)
	require.NoError(t, os.WriteFile(cfgPath, b, 0644))

	cfg, err := Load(cfgPath)
	require.NoError(t, err)
	assert.Equal(t, "https://srv.example.com", cfg.ServerURL)
	assert.Equal(t, 8080, cfg.WebUIPort)
	assert.Equal(t, 120, cfg.HeartbeatInterval)
	assert.Equal(t, "debug", cfg.LogLevel)
}

func TestLoad_InvalidJSON(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()
	cfgPath := filepath.Join(dir, "bad.json")
	require.NoError(t, os.WriteFile(cfgPath, []byte("{invalid json}"), 0644))

	_, err := Load(cfgPath)
	assert.Error(t, err)
}

func TestSaveLoad_Roundtrip(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()
	cfgPath := filepath.Join(dir, "config.json")

	original := DefaultConfig()
	original.ServerURL = "https://roundtrip.example.com"
	original.WebUIPort = 5555
	original.LogLevel = "warn"
	original.AgentID = "test-agent-id"

	require.NoError(t, original.Save(cfgPath))

	loaded, err := Load(cfgPath)
	require.NoError(t, err)
	assert.Equal(t, original.ServerURL, loaded.ServerURL)
	assert.Equal(t, original.WebUIPort, loaded.WebUIPort)
	assert.Equal(t, original.LogLevel, loaded.LogLevel)
	assert.Equal(t, original.AgentID, loaded.AgentID)
}

func TestSave_CreatesParentDirectory(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()
	cfgPath := filepath.Join(dir, "subdir", "nested", "config.json")

	cfg := DefaultConfig()
	require.NoError(t, cfg.Save(cfgPath))

	_, err := os.Stat(cfgPath)
	assert.NoError(t, err)
}

