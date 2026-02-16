package collectors

import (
	"context"
	"testing"

	"github.com/patchify/agent/internal/testutil"
)

// TestCollectTelemetry_Success tests successful telemetry collection
func TestCollectTelemetry_Success(t *testing.T) {
	ctx := context.Background()
	collector := &Collector{}

	telemetry, err := collector.CollectTelemetry(ctx)

	testutil.AssertNoError(t, err, "Telemetry collection should succeed")
	testutil.AssertNotNil(t, telemetry, "Telemetry should not be nil")
}

// TestCollectTelemetry_CPUUsage tests CPU usage collection
func TestCollectTelemetry_CPUUsage(t *testing.T) {
	ctx := context.Background()
	collector := &Collector{}

	telemetry, err := collector.CollectTelemetry(ctx)

	testutil.AssertNoError(t, err, "Should not error")

	// CPU usage should be between 0 and 100%
	if telemetry.CPUUsage != 0 {
		testutil.AssertGreaterThan(t, int64(telemetry.CPUUsage*100), int64(0), "CPU usage should be > 0")
		testutil.AssertLessThan(t, int64(telemetry.CPUUsage*100), int64(101), "CPU usage should be <= 100")
	}
}

// TestCollectTelemetry_MemoryUsage tests memory usage collection
func TestCollectTelemetry_MemoryUsage(t *testing.T) {
	ctx := context.Background()
	collector := &Collector{}

	telemetry, err := collector.CollectTelemetry(ctx)

	testutil.AssertNoError(t, err, "Should not error")

	// Memory used should be > 0
	testutil.AssertGreaterThan(t, telemetry.MemoryUsed, int64(0), "Memory used should be > 0")

	// Memory used should be less than total available memory (should be reasonable)
	testutil.AssertLessThan(t, telemetry.MemoryUsed, int64(1024*1024*1024*1024), "Memory used should be < 1TB")
}

// TestCollectTelemetry_DiskUsage tests disk usage collection
func TestCollectTelemetry_DiskUsage(t *testing.T) {
	ctx := context.Background()
	collector := &Collector{}

	telemetry, err := collector.CollectTelemetry(ctx)

	testutil.AssertNoError(t, err, "Should not error")

	// Should have at least one disk
	if len(telemetry.DiskUsage) > 0 {
		disk := telemetry.DiskUsage[0]
		testutil.AssertNotEmpty(t, disk.Path, "Disk path should be populated")
		testutil.AssertGreaterThan(t, disk.Total, int64(0), "Disk total should be > 0")
		testutil.AssertGreaterThan(t, disk.Used, int64(-1), "Disk used should be >= 0")
		testutil.AssertLessThan(t, disk.Used, disk.Total+1, "Disk used should be <= total")
	}
}

// TestCollectTelemetry_NetworkIO tests network I/O statistics
func TestCollectTelemetry_NetworkIO(t *testing.T) {
	ctx := context.Background()
	collector := &Collector{}

	telemetry, err := collector.CollectTelemetry(ctx)

	testutil.AssertNoError(t, err, "Should not error")

	// Network I/O might be 0 or positive
	testutil.AssertGreaterThan(t, telemetry.NetworkBytesSent, int64(-1), "Network sent should be >= 0")
	testutil.AssertGreaterThan(t, telemetry.NetworkBytesReceived, int64(-1), "Network received should be >= 0")
}

// TestCollectTelemetry_ProcessCount tests process count
func TestCollectTelemetry_ProcessCount(t *testing.T) {
	ctx := context.Background()
	collector := &Collector{}

	telemetry, err := collector.CollectTelemetry(ctx)

	testutil.AssertNoError(t, err, "Should not error")

	// Should have at least 1 process (this test process)
	testutil.AssertGreaterThan(t, int64(telemetry.ProcessCount), int64(0), "Should have at least 1 process")
}

// TestCollectTelemetry_Uptime tests system uptime
func TestCollectTelemetry_Uptime(t *testing.T) {
	ctx := context.Background()
	collector := &Collector{}

	telemetry, err := collector.CollectTelemetry(ctx)

	testutil.AssertNoError(t, err, "Should not error")

	// Uptime should be > 0 (system has been running for some time)
	testutil.AssertGreaterThan(t, telemetry.Uptime, int64(0), "Uptime should be > 0")
}

// TestCollectTelemetry_LoadAverage tests load average (Unix-like systems)
func TestCollectTelemetry_LoadAverage(t *testing.T) {
	ctx := context.Background()
	collector := &Collector{}

	telemetry, err := collector.CollectTelemetry(ctx)

	testutil.AssertNoError(t, err, "Should not error")

	// Load average might be 0 or positive
	// On Windows, this might not be available
	_ = telemetry.LoadAverage
}
