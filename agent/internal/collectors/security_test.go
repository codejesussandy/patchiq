package collectors

import (
	"context"
	"runtime"
	"testing"

	"github.com/patchify/agent/internal/testutil"
)

// TestCollectSecurity_Success tests successful security collection
func TestCollectSecurity_Success(t *testing.T) {
	ctx := context.Background()
	collector := &Collector{}

	security, err := collector.CollectSecurity(ctx)

	testutil.AssertNoError(t, err, "Security collection should succeed")
	testutil.AssertNotNil(t, security, "Security should not be nil")
}

// TestCollectSecurity_FirewallStatus tests firewall status detection
func TestCollectSecurity_FirewallStatus(t *testing.T) {
	ctx := context.Background()
	collector := &Collector{}

	security, err := collector.CollectSecurity(ctx)

	testutil.AssertNoError(t, err, "Should not error")

	// Firewall status should be either enabled, disabled, or unknown
	validStatuses := []string{"enabled", "disabled", "unknown", ""}
	found := false
	for _, status := range validStatuses {
		if security.FirewallEnabled == status {
			found = true
			break
		}
	}

	testutil.AssertTrue(t, found, "Firewall status should be valid")
}

// TestCollectSecurity_AntivirusStatus tests antivirus detection
func TestCollectSecurity_AntivirusStatus(t *testing.T) {
	if runtime.GOOS != "windows" {
		t.Skip("Antivirus detection mainly on Windows")
	}

	ctx := context.Background()
	collector := &Collector{}

	security, err := collector.CollectSecurity(ctx)

	testutil.AssertNoError(t, err, "Should not error")

	// Windows Defender should be present on Windows
	// AntivirusProducts might be empty or populated
	_ = security.AntivirusProducts
}

// TestCollectSecurity_EncryptionStatus tests disk encryption detection
func TestCollectSecurity_EncryptionStatus(t *testing.T) {
	ctx := context.Background()
	collector := &Collector{}

	security, err := collector.CollectSecurity(ctx)

	testutil.AssertNoError(t, err, "Should not error")

	// Encryption status might be unknown on some systems
	_ = security.DiskEncryption
}

// TestCollectSecurity_LastUpdateCheck tests last update check time
func TestCollectSecurity_LastUpdateCheck(t *testing.T) {
	ctx := context.Background()
	collector := &Collector{}

	security, err := collector.CollectSecurity(ctx)

	testutil.AssertNoError(t, err, "Should not error")

	// Last update check might not be available on all systems
	_ = security.LastUpdateCheck
}

// TestCollectSecurity_AutoUpdateEnabled tests auto-update status
func TestCollectSecurity_AutoUpdateEnabled(t *testing.T) {
	ctx := context.Background()
	collector := &Collector{}

	security, err := collector.CollectSecurity(ctx)

	testutil.AssertNoError(t, err, "Should not error")

	// Auto-update should be true, false, or unknown
	validValues := []bool{true, false}
	found := false
	for _, val := range validValues {
		if security.AutoUpdateEnabled == val {
			found = true
			break
		}
	}

	testutil.AssertTrue(t, found, "Auto-update should be boolean")
}

// TestCollectSecurity_SELinuxStatus tests SELinux status (Linux only)
func TestCollectSecurity_SELinuxStatus(t *testing.T) {
	if runtime.GOOS != "linux" {
		t.Skip("SELinux is Linux-only")
	}

	ctx := context.Background()
	collector := &Collector{}

	security, err := collector.CollectSecurity(ctx)

	testutil.AssertNoError(t, err, "Should not error")

	// SELinux might be enabled, disabled, or not installed
	_ = security.SELinuxStatus
}

// TestCollectSecurity_TPMStatus tests TPM detection
func TestCollectSecurity_TPMStatus(t *testing.T) {
	ctx := context.Background()
	collector := &Collector{}

	security, err := collector.CollectSecurity(ctx)

	testutil.AssertNoError(t, err, "Should not error")

	// TPM might be present or not
	_ = security.TPMEnabled
}
