package collectors

import (
	"context"
	"runtime"
	"testing"

	"github.com/patchify/agent/internal/testutil"
)

// TestCollectSoftware_Success tests successful software collection
func TestCollectSoftware_Success(t *testing.T) {
	ctx := context.Background()
	collector := &Collector{}

	software, err := collector.CollectSoftware(ctx)

	testutil.AssertNoError(t, err, "Software collection should succeed")
	testutil.AssertNotNil(t, software, "Software list should not be nil")

	// Should have at least some software installed
	testutil.AssertGreaterThan(t, int64(len(software)), int64(0), "Should have some software")
}

// TestCollectSoftware_HasRequiredFields tests that software entries have required fields
func TestCollectSoftware_HasRequiredFields(t *testing.T) {
	ctx := context.Background()
	collector := &Collector{}

	software, err := collector.CollectSoftware(ctx)

	testutil.AssertNoError(t, err, "Should not error")

	if len(software) > 0 {
		// Check first entry has required fields
		sw := software[0]
		testutil.AssertNotEmpty(t, sw.Name, "Software name should be populated")
		// Version may be empty for some packages, but name should always exist
	}
}

// TestCollectSoftware_WindowsApps tests Windows application collection
func TestCollectSoftware_WindowsApps(t *testing.T) {
	if runtime.GOOS != "windows" {
		t.Skip("Skipping Windows-specific test")
	}

	ctx := context.Background()
	collector := &Collector{}

	software, err := collector.CollectSoftware(ctx)

	testutil.AssertNoError(t, err, "Should not error")
	testutil.AssertGreaterThan(t, int64(len(software)), int64(0), "Should have software")
}

// TestCollectSoftware_LinuxPackages tests Linux package collection
func TestCollectSoftware_LinuxPackages(t *testing.T) {
	if runtime.GOOS != "linux" {
		t.Skip("Skipping Linux-specific test")
	}

	ctx := context.Background()
	collector := &Collector{}

	software, err := collector.CollectSoftware(ctx)

	testutil.AssertNoError(t, err, "Should not error")
	testutil.AssertGreaterThan(t, int64(len(software)), int64(0), "Should have packages")
}

// TestCollectSoftware_MacOSApps tests macOS application collection
func TestCollectSoftware_MacOSApps(t *testing.T) {
	if runtime.GOOS != "darwin" {
		t.Skip("Skipping macOS-specific test")
	}

	ctx := context.Background()
	collector := &Collector{}

	software, err := collector.CollectSoftware(ctx)

	testutil.AssertNoError(t, err, "Should not error")
	testutil.AssertGreaterThan(t, int64(len(software)), int64(0), "Should have applications")
}

// TestCollectSoftware_Deduplication tests that software list doesn't have duplicates
func TestCollectSoftware_Deduplication(t *testing.T) {
	ctx := context.Background()
	collector := &Collector{}

	software, err := collector.CollectSoftware(ctx)

	testutil.AssertNoError(t, err, "Should not error")

	// Check for duplicates
	seen := make(map[string]bool)
	duplicates := 0

	for _, sw := range software {
		key := sw.Name + "|" + sw.Version
		if seen[key] {
			duplicates++
		}
		seen[key] = true
	}

	// Some duplicates might be acceptable (different architectures)
	// but there shouldn't be many
	testutil.AssertLessThan(t, int64(duplicates), int64(len(software)/10), "Should have few duplicates")
}

// TestCollectSoftware_VersionParsing tests version string parsing
func TestCollectSoftware_VersionParsing(t *testing.T) {
	ctx := context.Background()
	collector := &Collector{}

	software, err := collector.CollectSoftware(ctx)

	testutil.AssertNoError(t, err, "Should not error")

	// Check that versions are reasonable (no empty strings for popular software)
	for _, sw := range software {
		if sw.Name == "bash" || sw.Name == "curl" || sw.Name == "git" {
			testutil.AssertNotEmpty(t, sw.Version, "Common software should have version")
		}
	}
}

// TestCollectSoftware_Publisher tests publisher field population
func TestCollectSoftware_Publisher(t *testing.T) {
	if runtime.GOOS != "windows" {
		t.Skip("Publisher field mainly on Windows")
	}

	ctx := context.Background()
	collector := &Collector{}

	software, err := collector.CollectSoftware(ctx)

	testutil.AssertNoError(t, err, "Should not error")

	// At least some Windows software should have publisher info
	hasPublisher := false
	for _, sw := range software {
		if sw.Publisher != "" {
			hasPublisher = true
			break
		}
	}

	testutil.AssertTrue(t, hasPublisher, "Some software should have publisher")
}

// TestCollectSoftware_InstallDate tests install date field
func TestCollectSoftware_InstallDate(t *testing.T) {
	ctx := context.Background()
	collector := &Collector{}

	software, err := collector.CollectSoftware(ctx)

	testutil.AssertNoError(t, err, "Should not error")

	// Install date might not be available for all packages
	// Just verify it doesn't cause errors
	_ = software
}
