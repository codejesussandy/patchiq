//go:build !windows
// +build !windows

package config

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestRegistryExists_FalseOnNonWindows(t *testing.T) {
	t.Parallel()
	assert.False(t, RegistryExists())
}

func TestLoadFromRegistry_ErrorOnNonWindows(t *testing.T) {
	t.Parallel()
	_, err := LoadFromRegistry()
	assert.Error(t, err)
	assert.Equal(t, ErrRegistryNotSupported, err)
}
