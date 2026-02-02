//go:build windows

package collectors

import (
	"log"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"github.com/patchify/agent/internal/models"
)

// WindowsHardwareCollector collects hardware info on Windows
type WindowsHardwareCollector struct{}

// NewWindowsHardwareCollector creates a new hardware collector for Windows
func NewWindowsHardwareCollector() *WindowsHardwareCollector {
	return &WindowsHardwareCollector{}
}

// Name returns the collector name
func (c *WindowsHardwareCollector) Name() string {
	return "hardware"
}

// Collect gathers hardware information
func (c *WindowsHardwareCollector) Collect() (interface{}, error) {
	hw := &models.Hardware{
		CollectedAt: time.Now().UTC().Format(time.RFC3339),
	}

	// Collect system identity
	hw.SystemIdentity = c.collectSystemIdentity()

	// Collect BIOS/Firmware info
	hw.BIOS = c.collectBIOS()

	// Collect processor info
	hw.Processor = c.collectProcessor()

	// Collect memory info
	hw.Memory = c.collectMemory()

	// Collect storage drives
	hw.StorageDrives = c.collectStorageDrives()

	// Collect battery info (for laptops)
	if battery := c.collectBattery(); battery != nil {
		hw.Battery = battery
	}

	// Collect graphics adapters
	hw.GraphicsAdapters = c.collectGraphicsAdapters()

	return hw, nil
}

func (c *WindowsHardwareCollector) collectSystemIdentity() models.SystemIdentity {
	si := models.SystemIdentity{}

	if out, err := exec.Command("wmic", "computersystem", "get", "manufacturer", "/value").Output(); err == nil {
		si.Manufacturer = parseWmicValue(string(out), "Manufacturer")
	} else {
		log.Printf("[hardware] Failed to get system manufacturer: %v", err)
	}
	if out, err := exec.Command("wmic", "computersystem", "get", "model", "/value").Output(); err == nil {
		si.Model = parseWmicValue(string(out), "Model")
	}
	if out, err := exec.Command("wmic", "bios", "get", "serialnumber", "/value").Output(); err == nil {
		si.SerialNumber = parseWmicValue(string(out), "SerialNumber")
	}
	if out, err := exec.Command("wmic", "csproduct", "get", "uuid", "/value").Output(); err == nil {
		si.UUID = parseWmicValue(string(out), "UUID")
	}
	// Get SKU Number from csproduct
	if out, err := exec.Command("wmic", "csproduct", "get", "skunumber", "/value").Output(); err == nil {
		si.SKU = parseWmicValue(string(out), "SKUNumber")
	}

	return si
}

func (c *WindowsHardwareCollector) collectBIOS() models.BIOS {
	bios := models.BIOS{
		FirmwareType: "UEFI",
	}

	if out, err := exec.Command("wmic", "bios", "get", "manufacturer", "/value").Output(); err == nil {
		bios.Vendor = parseWmicValue(string(out), "Manufacturer")
	} else {
		log.Printf("[hardware] Failed to get BIOS vendor: %v", err)
	}
	if out, err := exec.Command("wmic", "bios", "get", "smbiosbiosversion", "/value").Output(); err == nil {
		bios.Version = parseWmicValue(string(out), "SMBIOSBIOSVersion")
	}
	if out, err := exec.Command("wmic", "bios", "get", "releasedate", "/value").Output(); err == nil {
		dateStr := parseWmicValue(string(out), "ReleaseDate")
		if len(dateStr) >= 8 {
			bios.ReleaseDate = dateStr[:4] + "-" + dateStr[4:6] + "-" + dateStr[6:8]
		}
	}

	return bios
}

func (c *WindowsHardwareCollector) collectProcessor() models.Processor {
	proc := models.Processor{
		Architecture: "amd64",
	}

	if out, err := exec.Command("wmic", "cpu", "get", "name", "/value").Output(); err == nil {
		proc.Name = parseWmicValue(string(out), "Name")
	} else {
		log.Printf("[hardware] Failed to get processor name: %v", err)
	}
	if out, err := exec.Command("wmic", "cpu", "get", "manufacturer", "/value").Output(); err == nil {
		proc.Manufacturer = parseWmicValue(string(out), "Manufacturer")
	}
	if out, err := exec.Command("wmic", "cpu", "get", "numberofcores", "/value").Output(); err == nil {
		if cores, err := strconv.Atoi(parseWmicValue(string(out), "NumberOfCores")); err == nil {
			proc.CoreCount = cores
		}
	}
	if out, err := exec.Command("wmic", "cpu", "get", "numberoflogicalprocessors", "/value").Output(); err == nil {
		if threads, err := strconv.Atoi(parseWmicValue(string(out), "NumberOfLogicalProcessors")); err == nil {
			proc.ThreadCount = threads
		}
	}
	if out, err := exec.Command("wmic", "cpu", "get", "maxclockspeed", "/value").Output(); err == nil {
		if speed, err := strconv.Atoi(parseWmicValue(string(out), "MaxClockSpeed")); err == nil {
			proc.ClockSpeedMHz = speed
		}
	}

	return proc
}

func (c *WindowsHardwareCollector) collectMemory() models.Memory {
	mem := models.Memory{}

	if out, err := exec.Command("wmic", "computersystem", "get", "totalphysicalmemory", "/value").Output(); err == nil {
		if bytes, err := strconv.ParseInt(parseWmicValue(string(out), "TotalPhysicalMemory"), 10, 64); err == nil {
			mem.TotalPhysicalGB = float64(bytes) / (1024 * 1024 * 1024)
		}
	} else {
		log.Printf("[hardware] Failed to get total physical memory: %v", err)
	}

	// Get memory modules
	if out, err := exec.Command("wmic", "memorychip", "get", "banklabel,capacity,manufacturer,speed,memorytype", "/format:csv").Output(); err == nil {
		lines := strings.Split(string(out), "\n")
		for i, line := range lines {
			if i == 0 || strings.TrimSpace(line) == "" {
				continue
			}
			fields := strings.Split(line, ",")
			if len(fields) >= 5 {
				module := models.MemoryModule{
					Slot:         strings.TrimSpace(fields[1]),
					Manufacturer: strings.TrimSpace(fields[3]),
				}
				if capacity, err := strconv.ParseInt(strings.TrimSpace(fields[2]), 10, 64); err == nil {
					module.CapacityGB = float64(capacity) / (1024 * 1024 * 1024)
				}
				if speed, err := strconv.Atoi(strings.TrimSpace(fields[4])); err == nil {
					module.SpeedMHz = speed
				}
				// Memory type from wmic is numeric, convert common ones
				memType := strings.TrimSpace(fields[5])
				switch memType {
				case "24":
					module.Type = "DDR3"
				case "26":
					module.Type = "DDR4"
				case "34":
					module.Type = "DDR5"
				default:
					module.Type = "Unknown"
				}
				if module.CapacityGB > 0 {
					mem.Modules = append(mem.Modules, module)
				}
			}
		}
	}

	mem.UsedSlots = len(mem.Modules)
	return mem
}

func (c *WindowsHardwareCollector) collectStorageDrives() []models.StorageDrive {
	var drives []models.StorageDrive

	out, err := exec.Command("wmic", "logicaldisk", "get", "deviceid,drivetype,filesystem,freespace,size,volumename", "/format:csv").Output()
	if err != nil {
		log.Printf("[hardware] Failed to get storage drives: %v", err)
	} else {
		lines := strings.Split(string(out), "\n")
		for i, line := range lines {
			if i == 0 || strings.TrimSpace(line) == "" {
				continue
			}
			fields := strings.Split(line, ",")
			if len(fields) >= 6 {
				driveType := strings.TrimSpace(fields[2])
				// Only include local disks (type 3)
				if driveType != "3" {
					continue
				}

				drive := models.StorageDrive{
					DeviceID:   strings.TrimSpace(fields[1]),
					MountPoint: strings.TrimSpace(fields[1]),
					FileSystem: strings.TrimSpace(fields[3]),
					Name:       strings.TrimSpace(fields[6]),
				}

				if freeBytes, err := strconv.ParseInt(strings.TrimSpace(fields[4]), 10, 64); err == nil {
					drive.FreeSpaceGB = float64(freeBytes) / (1024 * 1024 * 1024)
				}
				if totalBytes, err := strconv.ParseInt(strings.TrimSpace(fields[5]), 10, 64); err == nil {
					drive.CapacityGB = float64(totalBytes) / (1024 * 1024 * 1024)
				}

				if drive.Name == "" {
					drive.Name = "Local Disk"
				}

				if drive.CapacityGB > 0 {
					drives = append(drives, drive)
				}
			}
		}
	}

	// Get physical disk info for drive type
	if out, err := exec.Command("wmic", "diskdrive", "get", "mediatype,model", "/format:csv").Output(); err == nil {
		lines := strings.Split(string(out), "\n")
		for i, line := range lines {
			if i == 0 || strings.TrimSpace(line) == "" {
				continue
			}
			fields := strings.Split(line, ",")
			if len(fields) >= 3 {
				mediaType := strings.ToLower(strings.TrimSpace(fields[1]))
				for j := range drives {
					if strings.Contains(mediaType, "ssd") || strings.Contains(mediaType, "solid") {
						drives[j].Type = "SSD"
					} else if strings.Contains(mediaType, "fixed") {
						drives[j].Type = "HDD"
					}
				}
			}
		}
	}

	return drives
}

func (c *WindowsHardwareCollector) collectBattery() *models.Battery {
	out, err := exec.Command("wmic", "path", "Win32_Battery", "get", "BatteryStatus,EstimatedChargeRemaining,DesignCapacity,FullChargeCapacity", "/format:csv").Output()
	if err != nil {
		return nil
	}

	lines := strings.Split(string(out), "\n")
	for i, line := range lines {
		if i == 0 || strings.TrimSpace(line) == "" {
			continue
		}
		fields := strings.Split(line, ",")
		if len(fields) >= 4 {
			battery := &models.Battery{Present: true}

			// Battery status: 1=Discharging, 2=AC, 3=Full, 4=Low, 5=Critical
			status := strings.TrimSpace(fields[1])
			switch status {
			case "1":
				battery.ChargingStatus = "Discharging"
			case "2":
				battery.ChargingStatus = "Charging"
			case "3":
				battery.ChargingStatus = "Full"
			case "4", "5":
				battery.ChargingStatus = "Low"
			}

			if charge, err := strconv.ParseFloat(strings.TrimSpace(fields[3]), 64); err == nil {
				battery.ChargeLevel = charge
			}
			if design, err := strconv.Atoi(strings.TrimSpace(fields[2])); err == nil {
				battery.DesignCapacity = design
			}
			if full, err := strconv.Atoi(strings.TrimSpace(fields[4])); err == nil {
				battery.CurrentCapacity = full
			}

			if battery.DesignCapacity > 0 && battery.CurrentCapacity > 0 {
				battery.HealthPercent = float64(battery.CurrentCapacity) / float64(battery.DesignCapacity) * 100
			}

			return battery
		}
	}
	return nil
}

func (c *WindowsHardwareCollector) collectGraphicsAdapters() []models.GraphicsAdapter {
	var adapters []models.GraphicsAdapter

	out, err := exec.Command("wmic", "path", "win32_videocontroller", "get", "name,adapterram,driverversion,videoprocessor", "/format:csv").Output()
	if err != nil {
		log.Printf("[hardware] Failed to get graphics adapters: %v", err)
	} else {
		lines := strings.Split(string(out), "\n")
		for i, line := range lines {
			if i == 0 || strings.TrimSpace(line) == "" {
				continue
			}
			fields := strings.Split(line, ",")
			if len(fields) >= 4 {
				adapter := models.GraphicsAdapter{
					Name:          strings.TrimSpace(fields[3]),
					DriverVersion: strings.TrimSpace(fields[2]),
				}

				// Parse adapter RAM (in bytes)
				if ram, err := strconv.ParseInt(strings.TrimSpace(fields[1]), 10, 64); err == nil && ram > 0 {
					adapter.MemoryMB = int(ram / (1024 * 1024))
				}

				// Determine manufacturer from name
				if strings.Contains(adapter.Name, "Intel") {
					adapter.Manufacturer = "Intel"
				} else if strings.Contains(adapter.Name, "NVIDIA") {
					adapter.Manufacturer = "NVIDIA"
				} else if strings.Contains(adapter.Name, "AMD") || strings.Contains(adapter.Name, "Radeon") {
					adapter.Manufacturer = "AMD"
				}

				if adapter.Name != "" {
					adapters = append(adapters, adapter)
				}
			}
		}
	}

	return adapters
}
