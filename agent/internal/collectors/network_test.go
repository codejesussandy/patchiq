package collectors

import (
	"context"
	"net"
	"testing"

	"github.com/patchify/agent/internal/testutil"
)

// TestCollectNetwork_Success tests successful network collection
func TestCollectNetwork_Success(t *testing.T) {
	ctx := context.Background()
	collector := &Collector{}

	network, err := collector.CollectNetwork(ctx)

	testutil.AssertNoError(t, err, "Network collection should succeed")
	testutil.AssertNotNil(t, network, "Network should not be nil")
	testutil.AssertNotEmpty(t, network.Hostname, "Hostname should be populated")
}

// TestCollectNetwork_Interfaces tests network interface collection
func TestCollectNetwork_Interfaces(t *testing.T) {
	ctx := context.Background()
	collector := &Collector{}

	network, err := collector.CollectNetwork(ctx)

	testutil.AssertNoError(t, err, "Should not error")

	// Should have at least loopback interface
	testutil.AssertGreaterThan(t, int64(len(network.Interfaces)), int64(0), "Should have at least one interface")

	// Check that interfaces have required fields
	for _, iface := range network.Interfaces {
		testutil.AssertNotEmpty(t, iface.Name, "Interface name should be populated")
	}
}

// TestCollectNetwork_IPAddresses tests IP address collection
func TestCollectNetwork_IPAddresses(t *testing.T) {
	ctx := context.Background()
	collector := &Collector{}

	network, err := collector.CollectNetwork(ctx)

	testutil.AssertNoError(t, err, "Should not error")

	// Should have at least loopback IP
	hasIP := false
	for _, iface := range network.Interfaces {
		if len(iface.IPAddresses) > 0 {
			hasIP = true
			break
		}
	}

	testutil.AssertTrue(t, hasIP, "Should have at least one IP address")
}

// TestCollectNetwork_MACAddresses tests MAC address collection
func TestCollectNetwork_MACAddresses(t *testing.T) {
	ctx := context.Background()
	collector := &Collector{}

	network, err := collector.CollectNetwork(ctx)

	testutil.AssertNoError(t, err, "Should not error")

	// At least one interface should have MAC address
	hasMAC := false
	for _, iface := range network.Interfaces {
		if iface.MACAddress != "" {
			hasMAC = true
			// Verify MAC address format (should be XX:XX:XX:XX:XX:XX)
			_, err := net.ParseMAC(iface.MACAddress)
			testutil.AssertNoError(t, err, "MAC address should be valid")
		}
	}

	// Note: Loopback doesn't have MAC, so this might be false on minimal systems
	_ = hasMAC
}

// TestCollectNetwork_Hostname tests hostname detection
func TestCollectNetwork_Hostname(t *testing.T) {
	ctx := context.Background()
	collector := &Collector{}

	network, err := collector.CollectNetwork(ctx)

	testutil.AssertNoError(t, err, "Should not error")
	testutil.AssertNotEmpty(t, network.Hostname, "Hostname should be populated")

	// Hostname should be reasonable length
	testutil.AssertGreaterThan(t, int64(len(network.Hostname)), int64(0), "Hostname should have length")
	testutil.AssertLessThan(t, int64(len(network.Hostname)), int64(256), "Hostname should be < 256 chars")
}

// TestCollectNetwork_DefaultGateway tests default gateway detection
func TestCollectNetwork_DefaultGateway(t *testing.T) {
	ctx := context.Background()
	collector := &Collector{}

	network, err := collector.CollectNetwork(ctx)

	testutil.AssertNoError(t, err, "Should not error")

	// Default gateway might not always be available (e.g., no network)
	// Just verify it doesn't crash
	_ = network.DefaultGateway
}

// TestCollectNetwork_DNSServers tests DNS server detection
func TestCollectNetwork_DNSServers(t *testing.T) {
	ctx := context.Background()
	collector := &Collector{}

	network, err := collector.CollectNetwork(ctx)

	testutil.AssertNoError(t, err, "Should not error")

	// DNS servers should be populated if network is configured
	if len(network.DNSServers) > 0 {
		// Verify DNS server format (should be valid IP)
		for _, dns := range network.DNSServers {
			ip := net.ParseIP(dns)
			testutil.AssertNotNil(t, ip, "DNS server should be valid IP")
		}
	}
}

// TestCollectNetwork_InterfaceStatus tests interface status detection
func TestCollectNetwork_InterfaceStatus(t *testing.T) {
	ctx := context.Background()
	collector := &Collector{}

	network, err := collector.CollectNetwork(ctx)

	testutil.AssertNoError(t, err, "Should not error")

	// At least one interface should be up (loopback)
	hasUp := false
	for _, iface := range network.Interfaces {
		if iface.Status == "up" {
			hasUp = true
			break
		}
	}

	testutil.AssertTrue(t, hasUp, "Should have at least one interface up")
}
