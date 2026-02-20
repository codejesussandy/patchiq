//go:build linux

package collectors

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewCollectorManager(t *testing.T) {
	t.Parallel()

	cm := NewCollectorManager()
	require.NotNil(t, cm)
}

func TestCollectAll(t *testing.T) {
	t.Parallel()

	cm := NewCollectorManager()
	inventory := cm.CollectAll()

	require.NotNil(t, inventory)
	assert.NotEmpty(t, inventory.CollectedAt)
	assert.NotEmpty(t, inventory.AgentVersion)
}

func TestCollectAllHasCollectionDuration(t *testing.T) {
	t.Parallel()

	cm := NewCollectorManager()
	inventory := cm.CollectAll()
	require.NotNil(t, inventory)
	assert.GreaterOrEqual(t, inventory.CollectionDurationMs, int64(0))
}

func TestCollectHardware(t *testing.T) {
	t.Parallel()

	cm := NewCollectorManager()
	hw, err := cm.CollectHardware()
	require.NoError(t, err)
	assert.NotNil(t, hw)
}

func TestCollectSoftware(t *testing.T) {
	t.Parallel()

	cm := NewCollectorManager()
	sw, err := cm.CollectSoftware()
	require.NoError(t, err)
	assert.NotNil(t, sw)
}

func TestCollectNetwork(t *testing.T) {
	t.Parallel()

	cm := NewCollectorManager()
	nw, err := cm.CollectNetwork()
	require.NoError(t, err)
	assert.NotNil(t, nw)
}

func TestCollectSecurity(t *testing.T) {
	t.Parallel()

	cm := NewCollectorManager()
	sec, err := cm.CollectSecurity()
	require.NoError(t, err)
	assert.NotNil(t, sec)
}

func TestCollectPeripherals(t *testing.T) {
	t.Parallel()

	cm := NewCollectorManager()
	per, err := cm.CollectPeripherals()
	require.NoError(t, err)
	assert.NotNil(t, per)
}

func TestCollectTelemetry(t *testing.T) {
	t.Parallel()

	cm := NewCollectorManager()
	tel, err := cm.CollectTelemetry()
	require.NoError(t, err)
	assert.NotNil(t, tel)
}

func TestCollectPowerManagement(t *testing.T) {
	t.Parallel()

	cm := NewCollectorManager()
	pm, err := cm.CollectPowerManagement()
	require.NoError(t, err)
	assert.NotNil(t, pm)
}
