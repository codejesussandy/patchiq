//go:build !windows
// +build !windows

// Package config provides stub implementations for non-Windows platforms.
// These functions are only compiled on Linux, macOS, and other non-Windows platforms.
package config

import "errors"

var (
	// ErrRegistryNotSupported is returned when registry functions are called on non-Windows platforms
	ErrRegistryNotSupported = errors.New("Windows Registry is not supported on this platform")
)

// LoadFromRegistry is a stub that returns an error on non-Windows platforms.
func LoadFromRegistry() (*Config, error) {
	return nil, ErrRegistryNotSupported
}

// SaveToRegistry is a stub that returns an error on non-Windows platforms.
func SaveToRegistry(cfg *Config) error {
	return ErrRegistryNotSupported
}

// RegistryExists always returns false on non-Windows platforms.
func RegistryExists() bool {
	return false
}
