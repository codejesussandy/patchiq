package collectors

import (
	"time"

	"github.com/patchify/agent/internal/models"
)

// Collector interface for all data collectors
type Collector interface {
	Name() string
	Collect() (interface{}, error)
}

// CollectorManager manages all collectors
type CollectorManager struct {
	hardware        Collector
	software        Collector
	network         Collector
	security        Collector
	peripherals     Collector
	telemetry       Collector
	powerManagement Collector
}

// CollectAll collects all inventory data
func (cm *CollectorManager) CollectAll() *models.FullInventory {
	startTime := time.Now()
	inventory := &models.FullInventory{
		CollectedAt:  time.Now().UTC().Format(time.RFC3339),
		AgentVersion: "1.0.4",
	}

	// Collect hardware
	if hw, err := cm.hardware.Collect(); err == nil {
		if hwData, ok := hw.(*models.Hardware); ok {
			inventory.Hardware = hwData
		}
	} else {
		inventory.Errors = append(inventory.Errors, models.CollectionError{
			Category: "hardware",
			Error:    err.Error(),
		})
	}

	// Collect software
	if sw, err := cm.software.Collect(); err == nil {
		if swData, ok := sw.(*models.Software); ok {
			inventory.Software = swData
		}
	} else {
		inventory.Errors = append(inventory.Errors, models.CollectionError{
			Category: "software",
			Error:    err.Error(),
		})
	}

	// Collect network
	if nw, err := cm.network.Collect(); err == nil {
		if nwData, ok := nw.(*models.Network); ok {
			inventory.Network = nwData
		}
	} else {
		inventory.Errors = append(inventory.Errors, models.CollectionError{
			Category: "network",
			Error:    err.Error(),
		})
	}

	// Collect security
	if sec, err := cm.security.Collect(); err == nil {
		if secData, ok := sec.(*models.Security); ok {
			inventory.Security = secData
		}
	} else {
		inventory.Errors = append(inventory.Errors, models.CollectionError{
			Category: "security",
			Error:    err.Error(),
		})
	}

	// Collect peripherals
	if per, err := cm.peripherals.Collect(); err == nil {
		if perData, ok := per.(*models.Peripherals); ok {
			inventory.Peripherals = perData
		}
	} else {
		inventory.Errors = append(inventory.Errors, models.CollectionError{
			Category: "peripherals",
			Error:    err.Error(),
		})
	}

	// Collect power management
	if pm, err := cm.powerManagement.Collect(); err == nil {
		if pmData, ok := pm.(*models.PowerManagement); ok {
			inventory.PowerManagement = pmData
		}
	} else {
		inventory.Errors = append(inventory.Errors, models.CollectionError{
			Category: "powerManagement",
			Error:    err.Error(),
		})
	}

	inventory.CollectionDurationMs = time.Since(startTime).Milliseconds()
	return inventory
}

// CollectHardware collects hardware data
func (cm *CollectorManager) CollectHardware() (*models.Hardware, error) {
	data, err := cm.hardware.Collect()
	if err != nil {
		return nil, err
	}
	return data.(*models.Hardware), nil
}

// CollectSoftware collects software data
func (cm *CollectorManager) CollectSoftware() (*models.Software, error) {
	data, err := cm.software.Collect()
	if err != nil {
		return nil, err
	}
	return data.(*models.Software), nil
}

// CollectNetwork collects network data
func (cm *CollectorManager) CollectNetwork() (*models.Network, error) {
	data, err := cm.network.Collect()
	if err != nil {
		return nil, err
	}
	return data.(*models.Network), nil
}

// CollectSecurity collects security data
func (cm *CollectorManager) CollectSecurity() (*models.Security, error) {
	data, err := cm.security.Collect()
	if err != nil {
		return nil, err
	}
	return data.(*models.Security), nil
}

// CollectPeripherals collects peripheral data
func (cm *CollectorManager) CollectPeripherals() (*models.Peripherals, error) {
	data, err := cm.peripherals.Collect()
	if err != nil {
		return nil, err
	}
	return data.(*models.Peripherals), nil
}

// CollectTelemetry collects telemetry data
func (cm *CollectorManager) CollectTelemetry() (*models.Telemetry, error) {
	data, err := cm.telemetry.Collect()
	if err != nil {
		return nil, err
	}
	return data.(*models.Telemetry), nil
}

// CollectPowerManagement collects power management data
func (cm *CollectorManager) CollectPowerManagement() (*models.PowerManagement, error) {
	data, err := cm.powerManagement.Collect()
	if err != nil {
		return nil, err
	}
	return data.(*models.PowerManagement), nil
}
