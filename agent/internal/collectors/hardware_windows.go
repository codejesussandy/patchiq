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

	// Use PowerShell Get-CimInstance (replaces deprecated wmic)
	psCmd := `Get-CimInstance Win32_ComputerSystem | Select-Object Manufacturer,Model | Format-List`
	if out, err := exec.Command("powershell", "-NoProfile", "-Command", psCmd).Output(); err == nil {
		si.Manufacturer = parsePSKeyValue(string(out), "Manufacturer")
		si.Model = parsePSKeyValue(string(out), "Model")
	} else {
		log.Printf("[hardware] Failed to get system info: %v", err)
	}

	// Get serial number from BIOS
	psCmd = `Get-CimInstance Win32_BIOS | Select-Object SerialNumber | Format-List`
	if out, err := exec.Command("powershell", "-NoProfile", "-Command", psCmd).Output(); err == nil {
		si.SerialNumber = parsePSKeyValue(string(out), "SerialNumber")
	}

	// Get UUID and SKU from ComputerSystemProduct
	psCmd = `Get-CimInstance Win32_ComputerSystemProduct | Select-Object UUID,SKUNumber | Format-List`
	if out, err := exec.Command("powershell", "-NoProfile", "-Command", psCmd).Output(); err == nil {
		si.UUID = parsePSKeyValue(string(out), "UUID")
		si.SKU = parsePSKeyValue(string(out), "SKUNumber")
	}

	return si
}

func (c *WindowsHardwareCollector) collectBIOS() models.BIOS {
	bios := models.BIOS{
		FirmwareType: "UEFI",
	}

	// Use PowerShell Get-CimInstance (replaces deprecated wmic)
	psCmd := `Get-CimInstance Win32_BIOS | Select-Object Manufacturer,SMBIOSBIOSVersion,ReleaseDate | Format-List`
	if out, err := exec.Command("powershell", "-NoProfile", "-Command", psCmd).Output(); err == nil {
		bios.Vendor = parsePSKeyValue(string(out), "Manufacturer")
		bios.Version = parsePSKeyValue(string(out), "SMBIOSBIOSVersion")
		dateStr := parsePSKeyValue(string(out), "ReleaseDate")
		// PowerShell returns dates in a readable format, parse it
		if dateStr != "" {
			// Try to extract date portion (format may vary)
			if len(dateStr) >= 10 {
				bios.ReleaseDate = dateStr[:10]
			}
		}
	} else {
		log.Printf("[hardware] Failed to get BIOS info: %v", err)
	}

	return bios
}

func (c *WindowsHardwareCollector) collectProcessor() models.Processor {
	proc := models.Processor{
		Architecture: "amd64",
	}

	// Use PowerShell Get-CimInstance (replaces deprecated wmic)
	psCmd := `Get-CimInstance Win32_Processor | Select-Object Name,Manufacturer,NumberOfCores,NumberOfLogicalProcessors,MaxClockSpeed | Format-List`
	if out, err := exec.Command("powershell", "-NoProfile", "-Command", psCmd).Output(); err == nil {
		proc.Name = parsePSKeyValue(string(out), "Name")
		proc.Manufacturer = parsePSKeyValue(string(out), "Manufacturer")
		if cores, err := strconv.Atoi(parsePSKeyValue(string(out), "NumberOfCores")); err == nil {
			proc.CoreCount = cores
		}
		if threads, err := strconv.Atoi(parsePSKeyValue(string(out), "NumberOfLogicalProcessors")); err == nil {
			proc.ThreadCount = threads
		}
		if speed, err := strconv.Atoi(parsePSKeyValue(string(out), "MaxClockSpeed")); err == nil {
			proc.ClockSpeedMHz = speed
		}
	} else {
		log.Printf("[hardware] Failed to get processor info: %v", err)
	}

	return proc
}

func (c *WindowsHardwareCollector) collectMemory() models.Memory {
	mem := models.Memory{}

	// Use PowerShell Get-CimInstance (replaces deprecated wmic)
	psCmd := `Get-CimInstance Win32_ComputerSystem | Select-Object TotalPhysicalMemory | Format-List`
	if out, err := exec.Command("powershell", "-NoProfile", "-Command", psCmd).Output(); err == nil {
		if bytes, err := strconv.ParseInt(parsePSKeyValue(string(out), "TotalPhysicalMemory"), 10, 64); err == nil {
			mem.TotalPhysicalGB = float64(bytes) / (1024 * 1024 * 1024)
		}
	} else {
		log.Printf("[hardware] Failed to get total physical memory: %v", err)
	}

	// Get memory modules
	psCmd = `Get-CimInstance Win32_PhysicalMemory | Select-Object BankLabel,Capacity,Manufacturer,Speed,SMBIOSMemoryType | ConvertTo-Csv -NoTypeInformation`
	if out, err := exec.Command("powershell", "-NoProfile", "-Command", psCmd).Output(); err == nil {
		lines := strings.Split(string(out), "\n")
		for i, line := range lines {
			if i == 0 || strings.TrimSpace(line) == "" { // Skip header
				continue
			}
			fields := parseCSVLine(line)
			if len(fields) >= 5 {
				module := models.MemoryModule{
					Slot:         strings.TrimSpace(fields[0]),
					Manufacturer: strings.TrimSpace(fields[2]),
				}
				if capacity, err := strconv.ParseInt(strings.TrimSpace(fields[1]), 10, 64); err == nil {
					module.CapacityGB = float64(capacity) / (1024 * 1024 * 1024)
				}
				if speed, err := strconv.Atoi(strings.TrimSpace(fields[3])); err == nil {
					module.SpeedMHz = speed
				}
				// SMBIOSMemoryType: 24=DDR3, 26=DDR4, 34=DDR5
				memType := strings.TrimSpace(fields[4])
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

	// Use PowerShell Get-CimInstance (replaces deprecated wmic)
	psCmd := `Get-CimInstance Win32_LogicalDisk | Select-Object DeviceID,DriveType,FileSystem,FreeSpace,Size,VolumeName | ConvertTo-Csv -NoTypeInformation`
	out, err := exec.Command("powershell", "-NoProfile", "-Command", psCmd).Output()
	if err != nil {
		log.Printf("[hardware] Failed to get storage drives: %v", err)
	} else {
		lines := strings.Split(string(out), "\n")
		for i, line := range lines {
			if i == 0 || strings.TrimSpace(line) == "" { // Skip header
				continue
			}
			fields := parseCSVLine(line)
			if len(fields) >= 6 {
				driveType := strings.TrimSpace(fields[1])
				// Only include local disks (type 3)
				if driveType != "3" {
					continue
				}

				drive := models.StorageDrive{
					DeviceID:   strings.TrimSpace(fields[0]),
					MountPoint: strings.TrimSpace(fields[0]),
					FileSystem: strings.TrimSpace(fields[2]),
					Name:       strings.TrimSpace(fields[5]),
				}

				if freeBytes, err := strconv.ParseInt(strings.TrimSpace(fields[3]), 10, 64); err == nil {
					drive.FreeSpaceGB = float64(freeBytes) / (1024 * 1024 * 1024)
				}
				if totalBytes, err := strconv.ParseInt(strings.TrimSpace(fields[4]), 10, 64); err == nil {
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
	psCmd = `Get-CimInstance Win32_DiskDrive | Select-Object MediaType,Model | ConvertTo-Csv -NoTypeInformation`
	if out, err := exec.Command("powershell", "-NoProfile", "-Command", psCmd).Output(); err == nil {
		lines := strings.Split(string(out), "\n")
		for i, line := range lines {
			if i == 0 || strings.TrimSpace(line) == "" { // Skip header
				continue
			}
			fields := parseCSVLine(line)
			if len(fields) >= 2 {
				mediaType := strings.ToLower(strings.TrimSpace(fields[0]))
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
	// Use PowerShell Get-CimInstance (replaces deprecated wmic)
	psCmd := `Get-CimInstance Win32_Battery | Select-Object BatteryStatus,DesignCapacity,EstimatedChargeRemaining,FullChargeCapacity | ConvertTo-Csv -NoTypeInformation`
	out, err := exec.Command("powershell", "-NoProfile", "-Command", psCmd).Output()
	if err != nil {
		return nil
	}

	lines := strings.Split(string(out), "\n")
	for i, line := range lines {
		if i == 0 || strings.TrimSpace(line) == "" { // Skip header
			continue
		}
		fields := parseCSVLine(line)
		if len(fields) >= 4 {
			battery := &models.Battery{Present: true}

			// Battery status: 1=Discharging, 2=AC, 3=Full, 4=Low, 5=Critical
			status := strings.TrimSpace(fields[0])
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

			if charge, err := strconv.ParseFloat(strings.TrimSpace(fields[2]), 64); err == nil {
				battery.ChargeLevel = charge
			}
			if design, err := strconv.Atoi(strings.TrimSpace(fields[1])); err == nil {
				battery.DesignCapacity = design
			}
			if full, err := strconv.Atoi(strings.TrimSpace(fields[3])); err == nil {
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

	// Use PowerShell Get-CimInstance (replaces deprecated wmic)
	psCmd := `Get-CimInstance Win32_VideoController | Select-Object AdapterRAM,DriverVersion,Name,VideoProcessor | ConvertTo-Csv -NoTypeInformation`
	out, err := exec.Command("powershell", "-NoProfile", "-Command", psCmd).Output()
	if err != nil {
		log.Printf("[hardware] Failed to get graphics adapters: %v", err)
	} else {
		lines := strings.Split(string(out), "\n")
		for i, line := range lines {
			if i == 0 || strings.TrimSpace(line) == "" { // Skip header
				continue
			}
			fields := parseCSVLine(line)
			if len(fields) >= 4 {
				adapter := models.GraphicsAdapter{
					Name:          strings.TrimSpace(fields[2]),
					DriverVersion: strings.TrimSpace(fields[1]),
				}

				// Parse adapter RAM (in bytes)
				if ram, err := strconv.ParseInt(strings.TrimSpace(fields[0]), 10, 64); err == nil && ram > 0 {
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
