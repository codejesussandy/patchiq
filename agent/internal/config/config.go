// Package config provides configuration management for the PatchIQ agent.
// It handles loading, saving, and merging configuration from files, environment variables,
// and on Windows, the Windows Registry.
package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"strconv"

	"github.com/rs/zerolog/log"
)

// Config represents the complete agent configuration including server connection,
// collection intervals, proxy settings, authentication, and operational parameters.
type Config struct {
	// Agent settings
	AgentID   string `json:"agentId,omitempty"`
	AgentName string `json:"agentName,omitempty"`

	// Server settings
	ServerURL   string `json:"serverUrl"`
	WebUIPort   int    `json:"webUiPort"`
	EnableWebUI bool   `json:"enableWebUi"`

	// Collection intervals (seconds)
	HeartbeatInterval int `json:"heartbeatIntervalSeconds"`
	InventoryInterval int `json:"inventoryIntervalSeconds"`
	TelemetryInterval int `json:"telemetryIntervalSeconds"`

	// Collection toggles
	CollectHardware    bool `json:"collectHardware"`
	CollectSoftware    bool `json:"collectSoftware"`
	CollectNetwork     bool `json:"collectNetwork"`
	CollectSecurity    bool `json:"collectSecurity"`
	CollectPeripherals bool `json:"collectPeripherals"`
	CollectTelemetry   bool `json:"collectTelemetry"`

	// Command execution timeout (seconds)
	CommandTimeoutSeconds int `json:"commandTimeoutSeconds"`

	// Proxy configuration
	ProxyURL      string `json:"proxyUrl,omitempty"`
	ProxyUser     string `json:"proxyUser,omitempty"`
	ProxyPassword string `json:"proxyPassword,omitempty"`
	NoProxy       string `json:"noProxy,omitempty"`

	// TLS configuration
	CACertFile string `json:"caCertFile,omitempty"` // Path to custom CA certificate (PEM format)

	// Download configuration
	MaxDownloadSpeedMBps int  `json:"maxDownloadSpeedMbps"`
	EnableDownloadResume bool `json:"enableDownloadResume"`

	// Logging
	LogLevel  string `json:"logLevel"`
	LogFormat string `json:"logFormat"` // "json" or "text"
	LogFile   string `json:"logFile,omitempty"`

	// Data storage
	DataDir string `json:"dataDir"`

	// Job retention
	JobRetentionDays int `json:"jobRetentionDays"` // Default: 30

	// WebUI authentication
	EnableWebUIAuth    bool   `json:"enableWebUiAuth"`     // Enable HTTP Basic Auth for WebUI
	WebUIUsername      string `json:"webUiUsername"`       // Username for WebUI access
	WebUIPasswordHash  string `json:"webUiPasswordHash"`   // Bcrypt hash of WebUI password

	// Update rollout configuration
	DeploymentGroup string `json:"deploymentGroup,omitempty"` // Deployment group: canary, beta, production
}

// DefaultConfig returns the default configuration with sensible defaults.
// Environment variables take precedence over defaults:
//   - PATCHIQ_SERVER_URL: backend server URL
//   - PATCHIQ_WEBUI_PORT: web UI port (default: 4504)
//   - PATCHIQ_LOG_LEVEL: log verbosity (default: "info")
//   - PATCHIQ_DATA_DIR: data storage directory
//   - HTTP_PROXY/HTTPS_PROXY: proxy configuration
func DefaultConfig() *Config {
	homeDir, _ := os.UserHomeDir()
	dataDir := filepath.Join(homeDir, ".patchify-agent")

	cfg := &Config{
		ServerURL:             "",
		WebUIPort:             4504,
		EnableWebUI:           true,
		HeartbeatInterval:     60,
		InventoryInterval:     21600, // 6 hours
		TelemetryInterval:     60,
		CollectHardware:       true,
		CollectSoftware:       true,
		CollectNetwork:        true,
		CollectSecurity:       true,
		CollectPeripherals:    true,
		CollectTelemetry:      true,
		EnableDownloadResume:  true,   // Enable resume by default
		CommandTimeoutSeconds: 900,    // 15 minutes
		LogLevel:              "info",
		LogFormat:             "json",
		DataDir:               dataDir,
		JobRetentionDays:      30,         // Keep jobs for 30 days
		DeploymentGroup:       "production", // Default to production deployment group
	}

	// Override defaults from environment variables
	if v := os.Getenv("PATCHIQ_SERVER_URL"); v != "" {
		cfg.ServerURL = v
	}
	if v := os.Getenv("PATCHIQ_WEBUI_PORT"); v != "" {
		if port, err := strconv.Atoi(v); err == nil {
			cfg.WebUIPort = port
		}
	}
	if v := os.Getenv("PATCHIQ_LOG_LEVEL"); v != "" {
		cfg.LogLevel = v
	}
	if v := os.Getenv("PATCHIQ_LOG_FORMAT"); v != "" {
		cfg.LogFormat = v
	}
	if v := os.Getenv("PATCHIQ_DATA_DIR"); v != "" {
		cfg.DataDir = v
	}

	// Proxy settings from environment (standard HTTP_PROXY / HTTPS_PROXY / NO_PROXY,
	// plus PatchIQ-specific PATCHIQ_PROXY_URL which takes precedence)
	if v := os.Getenv("PATCHIQ_PROXY_URL"); v != "" {
		cfg.ProxyURL = v
	} else if v := os.Getenv("HTTPS_PROXY"); v != "" {
		cfg.ProxyURL = v
	} else if v := os.Getenv("HTTP_PROXY"); v != "" {
		cfg.ProxyURL = v
	}
	if v := os.Getenv("PATCHIQ_PROXY_USER"); v != "" {
		cfg.ProxyUser = v
	}
	if v := os.Getenv("PATCHIQ_PROXY_PASSWORD"); v != "" {
		cfg.ProxyPassword = v
	}
	if v := os.Getenv("NO_PROXY"); v != "" {
		cfg.NoProxy = v
	}

	return cfg
}

// Load loads configuration from the best available source.
// On Windows, tries Windows Registry first, then falls back to config file.
// On other platforms, loads directly from config file.
// If the file doesn't exist, returns the default configuration.
// Returns an error if the file exists but cannot be parsed.
func Load(path string) (*Config, error) {
	var config *Config
	var err error

	// On Windows, try loading from registry first
	if runtime.GOOS == "windows" {
		if RegistryExists() {
			log.Info().Msg("Registry configuration found, loading from registry")
			config, err = LoadFromRegistry()
			if err != nil {
				log.Warn().Err(err).Msg("Failed to load from registry, falling back to config file")
			} else {
				log.Info().Msg("Configuration loaded from Windows Registry")
				// Registry load successful, but still merge with file if it exists
				// This allows file-based overrides of registry values
				if fileConfig, fileErr := loadFromFile(path); fileErr == nil {
					log.Debug().Msg("Merging config file values over registry values")
					config = mergeConfigs(config, fileConfig)
				}
				return config, nil
			}
		} else {
			log.Debug().Msg("Registry configuration not found, will load from config file")
		}
	}

	// Fall back to file-based configuration (or primary load on non-Windows)
	config, err = loadFromFile(path)
	if err != nil {
		return nil, err
	}

	return config, nil
}

// loadFromFile loads configuration from a JSON file at the specified path.
// Internal helper function used by Load().
func loadFromFile(path string) (*Config, error) {
	config := DefaultConfig()

	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			log.Debug().Str("path", path).Msg("Config file not found, using defaults")
			return config, nil
		}
		return nil, err
	}

	if err := json.Unmarshal(data, config); err != nil {
		return nil, err
	}

	log.Debug().Str("path", path).Msg("Configuration loaded from file")
	return config, nil
}

// mergeConfigs merges file-based config values into registry-based config.
// File values override registry values only if they differ from defaults.
func mergeConfigs(registry, file *Config) *Config {
	defaults := DefaultConfig()

	// Only override registry values with file values if file value differs from default
	if file.ServerURL != defaults.ServerURL && file.ServerURL != "" {
		registry.ServerURL = file.ServerURL
	}
	if file.WebUIPort != defaults.WebUIPort && file.WebUIPort != 0 {
		registry.WebUIPort = file.WebUIPort
	}
	if file.LogLevel != defaults.LogLevel && file.LogLevel != "" {
		registry.LogLevel = file.LogLevel
	}
	if file.LogFormat != defaults.LogFormat && file.LogFormat != "" {
		registry.LogFormat = file.LogFormat
	}
	if file.DataDir != defaults.DataDir && file.DataDir != "" {
		registry.DataDir = file.DataDir
	}
	if file.HeartbeatInterval != defaults.HeartbeatInterval && file.HeartbeatInterval != 0 {
		registry.HeartbeatInterval = file.HeartbeatInterval
	}
	if file.InventoryInterval != defaults.InventoryInterval && file.InventoryInterval != 0 {
		registry.InventoryInterval = file.InventoryInterval
	}
	if file.TelemetryInterval != defaults.TelemetryInterval && file.TelemetryInterval != 0 {
		registry.TelemetryInterval = file.TelemetryInterval
	}

	// For other fields, always prefer file values if set
	if file.AgentID != "" {
		registry.AgentID = file.AgentID
	}
	if file.AgentName != "" {
		registry.AgentName = file.AgentName
	}
	if file.ProxyURL != "" {
		registry.ProxyURL = file.ProxyURL
	}
	if file.ProxyUser != "" {
		registry.ProxyUser = file.ProxyUser
	}
	if file.ProxyPassword != "" {
		registry.ProxyPassword = file.ProxyPassword
	}
	if file.NoProxy != "" {
		registry.NoProxy = file.NoProxy
	}
	if file.CACertFile != "" {
		registry.CACertFile = file.CACertFile
	}

	// Boolean and toggle values
	registry.EnableWebUI = file.EnableWebUI
	registry.CollectHardware = file.CollectHardware
	registry.CollectSoftware = file.CollectSoftware
	registry.CollectNetwork = file.CollectNetwork
	registry.CollectSecurity = file.CollectSecurity
	registry.CollectPeripherals = file.CollectPeripherals
	registry.CollectTelemetry = file.CollectTelemetry
	registry.EnableDownloadResume = file.EnableDownloadResume
	registry.EnableWebUIAuth = file.EnableWebUIAuth

	if file.WebUIUsername != "" {
		registry.WebUIUsername = file.WebUIUsername
	}
	if file.WebUIPasswordHash != "" {
		registry.WebUIPasswordHash = file.WebUIPasswordHash
	}

	return registry
}

// Save writes the configuration to a JSON file at the specified path.
// Creates the parent directory if it doesn't exist.
// The configuration is formatted with 2-space indentation for readability.
func (c *Config) Save(path string) error {
	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return err
	}

	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	return os.WriteFile(path, data, 0644)
}
