package config

import (
	"encoding/json"
	"os"
	"path/filepath"
)

// Config represents agent configuration
type Config struct {
	// Agent settings
	AgentID   string `json:"agentId,omitempty"`
	AgentName string `json:"agentName,omitempty"`

	// Server settings
	ServerURL  string `json:"serverUrl"`
	WebUIPort  int    `json:"webUiPort"`
	EnableWebUI bool  `json:"enableWebUi"`

	// Collection intervals (seconds)
	HeartbeatInterval   int `json:"heartbeatIntervalSeconds"`
	InventoryInterval   int `json:"inventoryIntervalSeconds"`
	TelemetryInterval   int `json:"telemetryIntervalSeconds"`

	// Collection toggles
	CollectHardware    bool `json:"collectHardware"`
	CollectSoftware    bool `json:"collectSoftware"`
	CollectNetwork     bool `json:"collectNetwork"`
	CollectSecurity    bool `json:"collectSecurity"`
	CollectPeripherals bool `json:"collectPeripherals"`
	CollectTelemetry   bool `json:"collectTelemetry"`

	// Logging
	LogLevel string `json:"logLevel"`
	LogFile  string `json:"logFile,omitempty"`

	// Data storage
	DataDir string `json:"dataDir"`
}

// DefaultConfig returns the default configuration
func DefaultConfig() *Config {
	homeDir, _ := os.UserHomeDir()
	dataDir := filepath.Join(homeDir, ".patchify-agent")

	return &Config{
		ServerURL:           "http://localhost:3000/api",
		WebUIPort:           8080,
		EnableWebUI:         true,
		HeartbeatInterval:   60,
		InventoryInterval:   21600, // 6 hours
		TelemetryInterval:   60,
		CollectHardware:     true,
		CollectSoftware:     true,
		CollectNetwork:      true,
		CollectSecurity:     true,
		CollectPeripherals:  true,
		CollectTelemetry:    true,
		LogLevel:            "info",
		DataDir:             dataDir,
	}
}

// Load loads configuration from a file
func Load(path string) (*Config, error) {
	config := DefaultConfig()

	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return config, nil
		}
		return nil, err
	}

	if err := json.Unmarshal(data, config); err != nil {
		return nil, err
	}

	return config, nil
}

// Save saves configuration to a file
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
