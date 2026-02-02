//go:build linux

package collectors

// NewCollectorManager creates a new collector manager for Linux
// TODO: Implement Linux-specific collectors
func NewCollectorManager() *CollectorManager {
	return &CollectorManager{
		hardware:        NewDarwinHardwareCollector(),
		software:        NewDarwinSoftwareCollector(),
		network:         NewDarwinNetworkCollector(),
		security:        NewDarwinSecurityCollector(),
		peripherals:     NewDarwinPeripheralCollector(),
		telemetry:       NewDarwinTelemetryCollector(),
		powerManagement: NewDarwinPowerCollector(),
	}
}
