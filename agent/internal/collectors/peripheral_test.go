package collectors

import (
	"context"
	"testing"

	"github.com/patchify/agent/internal/testutil"
)

// TestCollectPeripherals_Success tests successful peripheral collection
func TestCollectPeripherals_Success(t *testing.T) {
	ctx := context.Background()
	collector := &Collector{}

	peripherals, err := collector.CollectPeripherals(ctx)

	testutil.AssertNoError(t, err, "Peripheral collection should succeed")
	testutil.AssertNotNil(t, peripherals, "Peripherals should not be nil")
}

// TestCollectPeripherals_Printers tests printer detection
func TestCollectPeripherals_Printers(t *testing.T) {
	ctx := context.Background()
	collector := &Collector{}

	peripherals, err := collector.CollectPeripherals(ctx)

	testutil.AssertNoError(t, err, "Should not error")

	// Printers list might be empty or populated
	// Just verify it doesn't crash
	for _, printer := range peripherals.Printers {
		testutil.AssertNotEmpty(t, printer.Name, "Printer should have name")
	}
}

// TestCollectPeripherals_Monitors tests monitor detection
func TestCollectPeripherals_Monitors(t *testing.T) {
	ctx := context.Background()
	collector := &Collector{}

	peripherals, err := collector.CollectPeripherals(ctx)

	testutil.AssertNoError(t, err, "Should not error")

	// Monitors list might be empty (headless server) or populated
	for _, monitor := range peripherals.Monitors {
		testutil.AssertNotEmpty(t, monitor.Name, "Monitor should have name")
	}
}

// TestCollectPeripherals_USBDevices tests USB device detection
func TestCollectPeripherals_USBDevices(t *testing.T) {
	ctx := context.Background()
	collector := &Collector{}

	peripherals, err := collector.CollectPeripherals(ctx)

	testutil.AssertNoError(t, err, "Should not error")

	// USB devices list might vary
	for _, usb := range peripherals.USBDevices {
		testutil.AssertNotEmpty(t, usb.Name, "USB device should have name")
	}
}

// TestCollectPeripherals_AudioDevices tests audio device detection
func TestCollectPeripherals_AudioDevices(t *testing.T) {
	ctx := context.Background()
	collector := &Collector{}

	peripherals, err := collector.CollectPeripherals(ctx)

	testutil.AssertNoError(t, err, "Should not error")

	// Audio devices might be present or not
	_ = peripherals.AudioDevices
}

// TestCollectPeripherals_BluetoothDevices tests Bluetooth device detection
func TestCollectPeripherals_BluetoothDevices(t *testing.T) {
	ctx := context.Background()
	collector := &Collector{}

	peripherals, err := collector.CollectPeripherals(ctx)

	testutil.AssertNoError(t, err, "Should not error")

	// Bluetooth devices might be present or not
	_ = peripherals.BluetoothDevices
}

// TestCollectPeripherals_EmptySystem tests peripheral collection on minimal system
func TestCollectPeripherals_EmptySystem(t *testing.T) {
	ctx := context.Background()
	collector := &Collector{}

	peripherals, err := collector.CollectPeripherals(ctx)

	testutil.AssertNoError(t, err, "Should not error even with no peripherals")
	testutil.AssertNotNil(t, peripherals, "Should return empty struct, not nil")
}
