//go:build linux

package executors

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewExecutorManager(t *testing.T) {
	t.Parallel()

	em := NewExecutorManager(nil)
	require.NotNil(t, em)

	assert.NotNil(t, em.Patch())
	assert.NotNil(t, em.Software())
	assert.NotNil(t, em.RemoteAccess())
	assert.NotNil(t, em.Rollback())
	assert.NotNil(t, em.Script())
}

func TestExecutorManagerWithDownloadConfig(t *testing.T) {
	t.Parallel()

	cfg := &DownloadConfig{
		MaxDownloadSpeedMBps: 10,
		EnableDownloadResume: true,
	}
	em := NewExecutorManager(cfg)
	require.NotNil(t, em)

	assert.NotNil(t, em.Script())
}
