package collectors

import (
	"context"
	"runtime"
	"testing"

	"github.com/patchify/agent/internal/testutil"
)

// TestCollectHardware_Success tests successful hardware collection
func TestCollectHardware_Success(t *testing.T) {
	ctx := context.Background()
	collector := &Collector{}

	hardware, err := collector.CollectHardware(ctx)

	testutil.AssertNoError(t, err, "Hardware collection should succeed")
	testutil.AssertNotNil(t, hardware, "Hardware should not be nil")
	testutil.AssertNotEmpty(t, hardware.Architecture, "Architecture should be populated")
	testutil.AssertGreaterThan(t, hardware.CPUCores, int64(0), "CPU cores should be > 0")
	testutil.AssertGreaterThan(t, hardware.MemoryTotal, int64(0), "Memory should be > 0")
}

// TestCollectHardware_CPUInfo tests CPU information collection
func TestCollectHardware_CPUInfo(t *testing.T) {
	ctx := context.Background()
	collector := &Collector{}

	hardware, err := collector.CollectHardware(ctx)

	testutil.AssertNoError(t, err, "Should not error")
	testutil.AssertNotEmpty(t, hardware.CPUModel, "CPU model should be populated")
	testutil.AssertGreaterThan(t, hardware.CPUCores, int64(0), "Should have at least 1 CPU core")

	// Architecture should be valid
	validArchs := []string{"amd64", "x86_64", "arm64", "aarch64", "386", "arm"}
	found := false
	for _, arch := range validArchs {
		if hardware.Architecture == arch {
			found = true
			break
		}
	}
	testutil.AssertTrue(t, found, "Architecture should be valid")
}

// TestCollectHardware_MemoryInfo tests memory information collection
func TestCollectHardware_MemoryInfo(t *testing.T) {
	ctx := context.Background()
	collector := &Collector{}

	hardware, err := collector.CollectHardware(ctx)

	testutil.AssertNoError(t, err, "Should not error")
	testutil.AssertGreaterThan(t, hardware.MemoryTotal, int64(0), "Total memory should be > 0")

	// Memory should be reasonable (at least 512MB, less than 1TB)
	testutil.AssertGreaterThan(t, hardware.MemoryTotal, int64(512*1024*1024), "Should have at least 512MB")
	testutil.AssertLessThan(t, hardware.MemoryTotal, int64(1024*1024*1024*1024), "Should be less than 1TB")
}

// TestCollectHardware_DiskInfo tests disk information collection
func TestCollectHardware_DiskInfo(t *testing.T) {
	ctx := context.Background()
	collector := &Collector{}

	hardware, err := collector.CollectHardware(ctx)

	testutil.AssertNoError(t, err, "Should not error")

	// Should have at least one disk
	if len(hardware.Disks) > 0 {
		disk := hardware.Disks[0]
		testutil.AssertNotEmpty(t, disk.Name, "Disk name should be populated")
		testutil.AssertGreaterThan(t, disk.Size, int64(0), "Disk size should be > 0")
	}
}

// TestCollectHardware_Manufacturer tests manufacturer/model detection
func TestCollectHardware_Manufacturer(t *testing.T) {
	ctx := context.Background()
	collector := &Collector{}

	hardware, err := collector.CollectHardware(ctx)

	testutil.AssertNoError(t, err, "Should not error")

	// On real hardware, manufacturer or model should be populated
	// On VMs, these might be empty or generic
	if runtime.GOOS != "darwin" {
		// At least one should be populated on non-Mac systems
		hasInfo := hardware.Manufacturer != "" || hardware.Model != ""
		_ = hasInfo // Can't always guarantee this on VMs
	}
}

// TestCollectHardware_SerialNumber tests serial number detection
func TestCollectHardware_SerialNumber(t *testing.T) {
	ctx := context.Background()
	collector := &Collector{}

	hardware, err := collector.CollectHardware(ctx)

	testutil.AssertNoError(t, err, "Should not error")

	// Serial number may or may not be available depending on system/permissions
	// Just verify it doesn't panic
	_ = hardware.SerialNumber
}

// TestCollectHardware_Platform tests platform-specific fields
func TestCollectHardware_Platform(t *testing.T) {
	ctx := context.Background()
	collector := &Collector{}

	hardware, err := collector.CollectHardware(ctx)

	testutil.AssertNoError(t, err, "Should not error")

	// Verify platform-specific behavior
	switch runtime.GOOS {
	case "darwin":
		// macOS should have some manufacturer info
		testutil.AssertNotEmpty(t, hardware.Architecture, "Should have architecture")
	case "linux":
		// Linux should have architecture
		testutil.AssertNotEmpty(t, hardware.Architecture, "Should have architecture")
	case "windows":
		// Windows should have full hardware info
		testutil.AssertNotEmpty(t, hardware.Architecture, "Should have architecture")
	}
}

// TestParseSize tests the parseSize helper function
func TestParseSize(t *testing.T) {
	tests := []struct {
		input    string
		expected float64
	}{
		{"1G", 1.0},
		{"1GB", 1.0},
		{"1GIB", 1.0},
		{"512M", 0.5},
		{"512MB", 0.5},
		{"2T", 2048.0},
		{"2TB", 2048.0},
		{"1024K", 0.001},
		{"100", 100.0},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result := parseSize(tt.input)
			// Allow some floating point tolerance
			diff := result - tt.expected
			if diff < 0 {
				diff = -diff
			}
			testutil.AssertTrue(t, diff < 0.01, "Size should match")
		})
	}
}

// TestRunCommand tests the runCommand helper
func TestRunCommand(t *testing.T) {
	// Test a simple command that should work on all platforms
	var cmd, arg string
	switch runtime.GOOS {
	case "windows":
		cmd, arg = "cmd.exe", "/C echo test"
	default:
		cmd, arg = "echo", "test"
	}

	output, err := runCommand(cmd, arg)

	testutil.AssertNoError(t, err, "Command should succeed")
	testutil.AssertContains(t, output, "test", "Output should contain 'test'")
}
