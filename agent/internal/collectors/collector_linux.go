//go:build linux

package collectors

// NewCollectorManager creates a new collector manager for Linux
// Uses shared Unix collectors that support both Linux and macOS via runtime.GOOS
func NewCollectorManager() *CollectorManager {
	return &CollectorManager{
		hardware:        NewUnixHardwareCollector(),
		software:        NewUnixSoftwareCollector(),
		network:         NewUnixNetworkCollector(),
		security:        NewUnixSecurityCollector(),
		peripherals:     NewUnixPeripheralCollector(),
		telemetry:       NewUnixTelemetryCollector(),
		powerManagement: NewUnixPowerCollector(),
	}
}
