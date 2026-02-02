//go:build windows

package collectors

// NewCollectorManager creates a new collector manager for Windows
func NewCollectorManager() *CollectorManager {
	return &CollectorManager{
		hardware:        NewWindowsHardwareCollector(),
		software:        NewWindowsSoftwareCollector(),
		network:         NewWindowsNetworkCollector(),
		security:        NewWindowsSecurityCollector(),
		peripherals:     NewWindowsPeripheralCollector(),
		telemetry:       NewWindowsTelemetryCollector(),
		powerManagement: NewWindowsPowerCollector(),
	}
}
