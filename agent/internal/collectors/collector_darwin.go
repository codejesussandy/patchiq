//go:build darwin

package collectors

// NewCollectorManager creates a new collector manager for macOS
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
