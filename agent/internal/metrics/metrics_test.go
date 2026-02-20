package metrics

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestMetricVars_NonNil(t *testing.T) {
	t.Parallel()
	assert.NotNil(t, AgentUp)
	assert.NotNil(t, HeartbeatSuccess)
	assert.NotNil(t, HeartbeatFailures)
	assert.NotNil(t, HeartbeatDuration)
	assert.NotNil(t, CommandsExecuted)
	assert.NotNil(t, CommandDuration)
	assert.NotNil(t, CommandQueueSize)
	assert.NotNil(t, CommandsDropped)
	assert.NotNil(t, InventorySubmissions)
	assert.NotNil(t, InventorySkipped)
	assert.NotNil(t, InventoryDuration)
	assert.NotNil(t, TelemetryCollectionDuration)
	assert.NotNil(t, DownloadBytes)
	assert.NotNil(t, BackoffDuration)
	assert.NotNil(t, UpdateSuccess)
	assert.NotNil(t, UpdateFailure)
	assert.NotNil(t, RollbackTotal)
	assert.NotNil(t, UpdateDuration)
	assert.NotNil(t, UpdateCorruption)
}

func TestGauges_SetDoesNotPanic(t *testing.T) {
	t.Parallel()
	assert.NotPanics(t, func() { AgentUp.Set(1) })
	assert.NotPanics(t, func() { AgentUp.Set(0) })
	assert.NotPanics(t, func() { CommandQueueSize.Set(42) })
	assert.NotPanics(t, func() { BackoffDuration.Set(3.14) })
}

func TestCounters_IncDoesNotPanic(t *testing.T) {
	t.Parallel()
	assert.NotPanics(t, func() { HeartbeatSuccess.Inc() })
	assert.NotPanics(t, func() { HeartbeatFailures.Inc() })
	assert.NotPanics(t, func() { CommandsDropped.Inc() })
	assert.NotPanics(t, func() { InventorySubmissions.Inc() })
	assert.NotPanics(t, func() { InventorySkipped.Inc() })
	assert.NotPanics(t, func() { UpdateSuccess.Inc() })
}

func TestHistograms_ObserveDoesNotPanic(t *testing.T) {
	t.Parallel()
	assert.NotPanics(t, func() { HeartbeatDuration.Observe(0.5) })
	assert.NotPanics(t, func() { InventoryDuration.Observe(1.2) })
	assert.NotPanics(t, func() { TelemetryCollectionDuration.Observe(0.1) })
	assert.NotPanics(t, func() { UpdateDuration.Observe(30) })
}

func TestCounterVecs_WithLabelValuesDoesNotPanic(t *testing.T) {
	t.Parallel()
	assert.NotPanics(t, func() { CommandsExecuted.WithLabelValues("install", "success").Inc() })
	assert.NotPanics(t, func() { CommandsExecuted.WithLabelValues("patch", "failed").Inc() })
	assert.NotPanics(t, func() { DownloadBytes.WithLabelValues("binary").Add(1024) })
	assert.NotPanics(t, func() { UpdateFailure.WithLabelValues("checksum").Inc() })
	assert.NotPanics(t, func() { RollbackTotal.WithLabelValues("corruption").Inc() })
	assert.NotPanics(t, func() { UpdateCorruption.WithLabelValues("binary").Inc() })
}

func TestHistogramVecs_WithLabelValuesDoesNotPanic(t *testing.T) {
	t.Parallel()
	assert.NotPanics(t, func() { CommandDuration.WithLabelValues("install").Observe(1.5) })
	assert.NotPanics(t, func() { CommandDuration.WithLabelValues("patch").Observe(0.3) })
}
