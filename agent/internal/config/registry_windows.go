//go:build windows
// +build windows

// Package config provides Windows registry-based configuration handling.
// This file is only compiled on Windows platforms.
package config

import (
	"fmt"

	"github.com/rs/zerolog/log"
	"golang.org/x/sys/windows/registry"
)

const (
	// registryPath is the registry key path for PatchIQ Agent configuration
	registryPath = `SOFTWARE\PatchIQ\Agent`
)

// LoadFromRegistry loads configuration from Windows Registry at HKLM\SOFTWARE\PatchIQ\Agent.
// Returns an error if the registry key cannot be opened or read.
// Returns a Config with default values for any missing registry entries.
func LoadFromRegistry() (*Config, error) {
	log.Debug().Str("path", registryPath).Msg("Loading configuration from Windows Registry")

	// Open registry key for reading
	key, err := registry.OpenKey(registry.LOCAL_MACHINE, registryPath, registry.QUERY_VALUE)
	if err != nil {
		return nil, fmt.Errorf("failed to open registry key HKLM\\%s: %w", registryPath, err)
	}
	defer key.Close()

	// Start with default configuration
	cfg := DefaultConfig()

	// Load ServerURL (string)
	if val, _, err := key.GetStringValue("ServerURL"); err == nil {
		cfg.ServerURL = val
		log.Debug().Str("ServerURL", val).Msg("Loaded ServerURL from registry")
	} else {
		log.Debug().Err(err).Msg("ServerURL not found in registry, using default")
	}

	// Load DataDir (string)
	if val, _, err := key.GetStringValue("DataDir"); err == nil {
		cfg.DataDir = val
		log.Debug().Str("DataDir", val).Msg("Loaded DataDir from registry")
	} else {
		log.Debug().Err(err).Msg("DataDir not found in registry, using default")
	}

	// Load LogLevel (string)
	if val, _, err := key.GetStringValue("LogLevel"); err == nil {
		cfg.LogLevel = val
		log.Debug().Str("LogLevel", val).Msg("Loaded LogLevel from registry")
	} else {
		log.Debug().Err(err).Msg("LogLevel not found in registry, using default")
	}

	// Load HeartbeatInterval (DWORD -> int)
	if val, _, err := key.GetIntegerValue("HeartbeatInterval"); err == nil {
		cfg.HeartbeatInterval = int(val)
		log.Debug().Int("HeartbeatInterval", int(val)).Msg("Loaded HeartbeatInterval from registry")
	} else {
		log.Debug().Err(err).Msg("HeartbeatInterval not found in registry, using default")
	}

	// Load WebUIPort (DWORD -> int) if present
	if val, _, err := key.GetIntegerValue("WebUIPort"); err == nil {
		cfg.WebUIPort = int(val)
		log.Debug().Int("WebUIPort", int(val)).Msg("Loaded WebUIPort from registry")
	}

	// Load InventoryInterval (DWORD -> int) if present
	if val, _, err := key.GetIntegerValue("InventoryInterval"); err == nil {
		cfg.InventoryInterval = int(val)
		log.Debug().Int("InventoryInterval", int(val)).Msg("Loaded InventoryInterval from registry")
	}

	// Load TelemetryInterval (DWORD -> int) if present
	if val, _, err := key.GetIntegerValue("TelemetryInterval"); err == nil {
		cfg.TelemetryInterval = int(val)
		log.Debug().Int("TelemetryInterval", int(val)).Msg("Loaded TelemetryInterval from registry")
	}

	// Load LogFormat (string) if present
	if val, _, err := key.GetStringValue("LogFormat"); err == nil {
		cfg.LogFormat = val
		log.Debug().Str("LogFormat", val).Msg("Loaded LogFormat from registry")
	}

	log.Info().Msg("Configuration loaded from Windows Registry")
	return cfg, nil
}

// SaveToRegistry saves the current configuration to Windows Registry.
// Creates the registry key if it doesn't exist.
// Returns an error if the registry cannot be written to (requires admin privileges).
func SaveToRegistry(cfg *Config) error {
	log.Debug().Str("path", registryPath).Msg("Saving configuration to Windows Registry")

	// Create or open registry key for writing
	key, _, err := registry.CreateKey(registry.LOCAL_MACHINE, registryPath, registry.SET_VALUE)
	if err != nil {
		return fmt.Errorf("failed to create/open registry key HKLM\\%s (requires admin): %w", registryPath, err)
	}
	defer key.Close()

	// Save ServerURL
	if err := key.SetStringValue("ServerURL", cfg.ServerURL); err != nil {
		return fmt.Errorf("failed to set ServerURL: %w", err)
	}
	log.Debug().Str("ServerURL", cfg.ServerURL).Msg("Saved ServerURL to registry")

	// Save DataDir
	if err := key.SetStringValue("DataDir", cfg.DataDir); err != nil {
		return fmt.Errorf("failed to set DataDir: %w", err)
	}
	log.Debug().Str("DataDir", cfg.DataDir).Msg("Saved DataDir to registry")

	// Save LogLevel
	if err := key.SetStringValue("LogLevel", cfg.LogLevel); err != nil {
		return fmt.Errorf("failed to set LogLevel: %w", err)
	}
	log.Debug().Str("LogLevel", cfg.LogLevel).Msg("Saved LogLevel to registry")

	// Save LogFormat
	if err := key.SetStringValue("LogFormat", cfg.LogFormat); err != nil {
		return fmt.Errorf("failed to set LogFormat: %w", err)
	}
	log.Debug().Str("LogFormat", cfg.LogFormat).Msg("Saved LogFormat to registry")

	// Save HeartbeatInterval (int -> DWORD)
	if err := key.SetDWordValue("HeartbeatInterval", uint32(cfg.HeartbeatInterval)); err != nil {
		return fmt.Errorf("failed to set HeartbeatInterval: %w", err)
	}
	log.Debug().Int("HeartbeatInterval", cfg.HeartbeatInterval).Msg("Saved HeartbeatInterval to registry")

	// Save WebUIPort (int -> DWORD)
	if err := key.SetDWordValue("WebUIPort", uint32(cfg.WebUIPort)); err != nil {
		return fmt.Errorf("failed to set WebUIPort: %w", err)
	}
	log.Debug().Int("WebUIPort", cfg.WebUIPort).Msg("Saved WebUIPort to registry")

	// Save InventoryInterval (int -> DWORD)
	if err := key.SetDWordValue("InventoryInterval", uint32(cfg.InventoryInterval)); err != nil {
		return fmt.Errorf("failed to set InventoryInterval: %w", err)
	}
	log.Debug().Int("InventoryInterval", cfg.InventoryInterval).Msg("Saved InventoryInterval to registry")

	// Save TelemetryInterval (int -> DWORD)
	if err := key.SetDWordValue("TelemetryInterval", uint32(cfg.TelemetryInterval)); err != nil {
		return fmt.Errorf("failed to set TelemetryInterval: %w", err)
	}
	log.Debug().Int("TelemetryInterval", cfg.TelemetryInterval).Msg("Saved TelemetryInterval to registry")

	log.Info().Msg("Configuration saved to Windows Registry")
	return nil
}

// RegistryExists checks if the PatchIQ Agent registry key exists.
// Returns true if the registry key exists, false otherwise.
func RegistryExists() bool {
	key, err := registry.OpenKey(registry.LOCAL_MACHINE, registryPath, registry.QUERY_VALUE)
	if err != nil {
		return false
	}
	key.Close()
	return true
}
