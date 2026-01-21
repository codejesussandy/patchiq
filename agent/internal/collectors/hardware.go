package collectors

import (
	"bytes"
	"os"
	"os/exec"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/patchify/agent/internal/models"
)

// DarwinHardwareCollector collects hardware info on macOS
type DarwinHardwareCollector struct{}

// NewDarwinHardwareCollector creates a new hardware collector for macOS
func NewDarwinHardwareCollector() *DarwinHardwareCollector {
	return &DarwinHardwareCollector{}
}

// Name returns the collector name
func (c *DarwinHardwareCollector) Name() string {
	return "hardware"
}

// Collect gathers hardware information
func (c *DarwinHardwareCollector) Collect() (interface{}, error) {
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

func (c *DarwinHardwareCollector) collectSystemIdentity() models.SystemIdentity {
	si := models.SystemIdentity{}

	switch runtime.GOOS {
	case "darwin":
		// Get hardware info using system_profiler
		out, err := exec.Command("system_profiler", "SPHardwareDataType", "-detailLevel", "basic").Output()
		if err == nil {
			lines := strings.Split(string(out), "\n")
			for _, line := range lines {
				line = strings.TrimSpace(line)
				if strings.HasPrefix(line, "Model Name:") {
					si.Model = strings.TrimSpace(strings.TrimPrefix(line, "Model Name:"))
				} else if strings.HasPrefix(line, "Model Identifier:") {
					if si.Model == "" {
						si.Model = strings.TrimSpace(strings.TrimPrefix(line, "Model Identifier:"))
					}
				} else if strings.HasPrefix(line, "Serial Number") {
					si.SerialNumber = strings.TrimSpace(strings.TrimPrefix(line, "Serial Number (system):"))
				} else if strings.HasPrefix(line, "Hardware UUID:") {
					si.UUID = strings.TrimSpace(strings.TrimPrefix(line, "Hardware UUID:"))
				}
			}
		}
		si.Manufacturer = "Apple Inc."

	case "windows":
		// Windows: Use wmic for system identity
		if out, err := exec.Command("wmic", "computersystem", "get", "manufacturer", "/value").Output(); err == nil {
			si.Manufacturer = parseWmicValue(string(out), "Manufacturer")
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

	default:
		// Linux fallback using dmidecode or /sys
		si.Manufacturer = readFileContent("/sys/class/dmi/id/sys_vendor")
		si.Model = readFileContent("/sys/class/dmi/id/product_name")
		si.SerialNumber = readFileContent("/sys/class/dmi/id/product_serial")
		si.UUID = readFileContent("/sys/class/dmi/id/product_uuid")
		si.SKU = readFileContent("/sys/class/dmi/id/product_sku")
	}

	return si
}

func (c *DarwinHardwareCollector) collectBIOS() models.BIOS {
	bios := models.BIOS{
		FirmwareType: "UEFI",
	}

	switch runtime.GOOS {
	case "darwin":
		// macOS uses EFI
		bios.Vendor = "Apple Inc."
		out, err := exec.Command("system_profiler", "SPHardwareDataType").Output()
		if err == nil {
			lines := strings.Split(string(out), "\n")
			for _, line := range lines {
				line = strings.TrimSpace(line)
				if strings.HasPrefix(line, "Boot ROM Version:") {
					bios.Version = strings.TrimSpace(strings.TrimPrefix(line, "Boot ROM Version:"))
				}
			}
		}

	case "windows":
		// Windows: Use wmic for BIOS info
		if out, err := exec.Command("wmic", "bios", "get", "manufacturer", "/value").Output(); err == nil {
			bios.Vendor = parseWmicValue(string(out), "Manufacturer")
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

	default:
		// Linux
		bios.Vendor = readFileContent("/sys/class/dmi/id/bios_vendor")
		bios.Version = readFileContent("/sys/class/dmi/id/bios_version")
		bios.ReleaseDate = readFileContent("/sys/class/dmi/id/bios_date")
	}

	return bios
}

func (c *DarwinHardwareCollector) collectProcessor() models.Processor {
	proc := models.Processor{
		Architecture: runtime.GOARCH,
	}

	switch runtime.GOOS {
	case "darwin":
		out, err := exec.Command("sysctl", "-n", "machdep.cpu.brand_string").Output()
		if err == nil {
			proc.Name = strings.TrimSpace(string(out))
		}

		// Get core count
		if out, err := exec.Command("sysctl", "-n", "hw.physicalcpu").Output(); err == nil {
			if cores, err := strconv.Atoi(strings.TrimSpace(string(out))); err == nil {
				proc.CoreCount = cores
			}
		}

		// Get thread count
		if out, err := exec.Command("sysctl", "-n", "hw.logicalcpu").Output(); err == nil {
			if threads, err := strconv.Atoi(strings.TrimSpace(string(out))); err == nil {
				proc.ThreadCount = threads
			}
		}

		// Get CPU frequency
		if out, err := exec.Command("sysctl", "-n", "hw.cpufrequency").Output(); err == nil {
			if freq, err := strconv.ParseInt(strings.TrimSpace(string(out)), 10, 64); err == nil {
				proc.ClockSpeedMHz = int(freq / 1000000)
			}
		}

		// Determine manufacturer from name
		if strings.Contains(proc.Name, "Intel") {
			proc.Manufacturer = "Intel"
		} else if strings.Contains(proc.Name, "Apple") {
			proc.Manufacturer = "Apple"
		} else if strings.Contains(proc.Name, "AMD") {
			proc.Manufacturer = "AMD"
		}

	case "windows":
		// Windows: Use wmic for CPU info
		if out, err := exec.Command("wmic", "cpu", "get", "name", "/value").Output(); err == nil {
			proc.Name = parseWmicValue(string(out), "Name")
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

	default:
		// Linux: read from /proc/cpuinfo
		data, err := os.ReadFile("/proc/cpuinfo")
		if err == nil {
			lines := strings.Split(string(data), "\n")
			coreCount := 0
			for _, line := range lines {
				if strings.HasPrefix(line, "model name") {
					parts := strings.SplitN(line, ":", 2)
					if len(parts) == 2 {
						proc.Name = strings.TrimSpace(parts[1])
					}
				}
				if strings.HasPrefix(line, "cpu MHz") {
					parts := strings.SplitN(line, ":", 2)
					if len(parts) == 2 {
						if mhz, err := strconv.ParseFloat(strings.TrimSpace(parts[1]), 64); err == nil {
							proc.ClockSpeedMHz = int(mhz)
						}
					}
				}
				if strings.HasPrefix(line, "processor") {
					coreCount++
				}
			}
			proc.CoreCount = coreCount
			proc.ThreadCount = coreCount
		}
		// Determine manufacturer from name
		if strings.Contains(proc.Name, "Intel") {
			proc.Manufacturer = "Intel"
		} else if strings.Contains(proc.Name, "AMD") {
			proc.Manufacturer = "AMD"
		}
	}

	return proc
}

func (c *DarwinHardwareCollector) collectMemory() models.Memory {
	mem := models.Memory{}

	switch runtime.GOOS {
	case "darwin":
		out, err := exec.Command("sysctl", "-n", "hw.memsize").Output()
		if err == nil {
			if bytes, err := strconv.ParseInt(strings.TrimSpace(string(out)), 10, 64); err == nil {
				mem.TotalPhysicalGB = float64(bytes) / (1024 * 1024 * 1024)
			}
		}

		// Try to get memory modules from system_profiler
		out, err = exec.Command("system_profiler", "SPMemoryDataType").Output()
		if err == nil {
			lines := strings.Split(string(out), "\n")
			var currentModule *models.MemoryModule
			for _, line := range lines {
				line = strings.TrimSpace(line)
				if strings.HasPrefix(line, "BANK") || strings.HasPrefix(line, "DIMM") || strings.HasPrefix(line, "Slot") {
					if currentModule != nil {
						mem.Modules = append(mem.Modules, *currentModule)
					}
					currentModule = &models.MemoryModule{
						Slot: line,
					}
				} else if currentModule != nil {
					if strings.HasPrefix(line, "Size:") {
						sizeStr := strings.TrimPrefix(line, "Size:")
						sizeStr = strings.TrimSpace(sizeStr)
						if strings.Contains(sizeStr, "GB") {
							if size, err := strconv.ParseFloat(strings.TrimSuffix(sizeStr, " GB"), 64); err == nil {
								currentModule.CapacityGB = size
							}
						}
					} else if strings.HasPrefix(line, "Type:") {
						currentModule.Type = strings.TrimSpace(strings.TrimPrefix(line, "Type:"))
					} else if strings.HasPrefix(line, "Speed:") {
						speedStr := strings.TrimSpace(strings.TrimPrefix(line, "Speed:"))
						if speed, err := strconv.Atoi(strings.TrimSuffix(speedStr, " MHz")); err == nil {
							currentModule.SpeedMHz = speed
						}
					} else if strings.HasPrefix(line, "Manufacturer:") {
						currentModule.Manufacturer = strings.TrimSpace(strings.TrimPrefix(line, "Manufacturer:"))
					}
				}
			}
			if currentModule != nil && currentModule.CapacityGB > 0 {
				mem.Modules = append(mem.Modules, *currentModule)
			}
		}

	case "windows":
		// Windows: Use wmic for memory info
		if out, err := exec.Command("wmic", "computersystem", "get", "totalphysicalmemory", "/value").Output(); err == nil {
			if bytes, err := strconv.ParseInt(parseWmicValue(string(out), "TotalPhysicalMemory"), 10, 64); err == nil {
				mem.TotalPhysicalGB = float64(bytes) / (1024 * 1024 * 1024)
			}
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

	default:
		// Linux: read from /proc/meminfo
		data, err := os.ReadFile("/proc/meminfo")
		if err == nil {
			lines := strings.Split(string(data), "\n")
			for _, line := range lines {
				if strings.HasPrefix(line, "MemTotal:") {
					parts := strings.Fields(line)
					if len(parts) >= 2 {
						if kb, err := strconv.ParseInt(parts[1], 10, 64); err == nil {
							mem.TotalPhysicalGB = float64(kb) / (1024 * 1024)
						}
					}
				}
			}
		}

		// Try to get memory module info from dmidecode (requires root)
		if out, err := exec.Command("dmidecode", "-t", "memory").Output(); err == nil {
			lines := strings.Split(string(out), "\n")
			var currentModule *models.MemoryModule
			for _, line := range lines {
				line = strings.TrimSpace(line)
				if strings.HasPrefix(line, "Memory Device") {
					if currentModule != nil && currentModule.CapacityGB > 0 {
						mem.Modules = append(mem.Modules, *currentModule)
					}
					currentModule = &models.MemoryModule{}
				} else if currentModule != nil {
					if strings.HasPrefix(line, "Size:") {
						sizeStr := strings.TrimPrefix(line, "Size:")
						sizeStr = strings.TrimSpace(sizeStr)
						if strings.Contains(sizeStr, "GB") {
							if size, err := strconv.ParseFloat(strings.TrimSuffix(sizeStr, " GB"), 64); err == nil {
								currentModule.CapacityGB = size
							}
						} else if strings.Contains(sizeStr, "MB") {
							if size, err := strconv.ParseFloat(strings.TrimSuffix(sizeStr, " MB"), 64); err == nil {
								currentModule.CapacityGB = size / 1024
							}
						}
					} else if strings.HasPrefix(line, "Type:") {
						currentModule.Type = strings.TrimSpace(strings.TrimPrefix(line, "Type:"))
					} else if strings.HasPrefix(line, "Speed:") {
						speedStr := strings.TrimSpace(strings.TrimPrefix(line, "Speed:"))
						if speed, err := strconv.Atoi(strings.TrimSuffix(speedStr, " MT/s")); err == nil {
							currentModule.SpeedMHz = speed
						}
					} else if strings.HasPrefix(line, "Manufacturer:") {
						currentModule.Manufacturer = strings.TrimSpace(strings.TrimPrefix(line, "Manufacturer:"))
					} else if strings.HasPrefix(line, "Locator:") {
						currentModule.Slot = strings.TrimSpace(strings.TrimPrefix(line, "Locator:"))
					}
				}
			}
			if currentModule != nil && currentModule.CapacityGB > 0 {
				mem.Modules = append(mem.Modules, *currentModule)
			}
		}
	}

	mem.UsedSlots = len(mem.Modules)
	return mem
}

func (c *DarwinHardwareCollector) collectStorageDrives() []models.StorageDrive {
	var drives []models.StorageDrive

	switch runtime.GOOS {
	case "darwin":
		// Use df to get mounted filesystems
		out, err := exec.Command("df", "-h").Output()
		if err == nil {
			lines := strings.Split(string(out), "\n")
			for _, line := range lines {
				fields := strings.Fields(line)
				if len(fields) >= 6 && strings.HasPrefix(fields[0], "/dev/") {
					// Skip small system volumes
					if strings.Contains(fields[0], "devfs") || strings.Contains(fields[0], "map") {
						continue
					}

					drive := models.StorageDrive{
						DeviceID:   fields[0],
						MountPoint: fields[len(fields)-1],
					}

					// Parse capacity
					drive.CapacityGB = parseSize(fields[1])
					usedGB := parseSize(fields[2])
					drive.FreeSpaceGB = drive.CapacityGB - usedGB

					// Determine type
					if strings.Contains(fields[0], "disk") {
						drive.Type = "SSD" // Most Macs use SSD
						drive.Name = "Macintosh HD"
					}

					if drive.CapacityGB > 0 {
						drives = append(drives, drive)
					}
				}
			}
		}

		// Get more details from diskutil
		out, err = exec.Command("diskutil", "list").Output()
		if err == nil && len(drives) > 0 {
			// Update drive names from diskutil output if available
			lines := strings.Split(string(out), "\n")
			for _, line := range lines {
				if strings.Contains(line, "Apple_APFS") || strings.Contains(line, "APFS Container") {
					for i := range drives {
						drives[i].FileSystem = "APFS"
					}
				}
			}
		}

	case "windows":
		// Windows: Use wmic for disk info
		out, err := exec.Command("wmic", "logicaldisk", "get", "deviceid,drivetype,filesystem,freespace,size,volumename", "/format:csv").Output()
		if err == nil {
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

	default:
		// Linux: use lsblk or df
		out, err := exec.Command("df", "-h", "--output=source,fstype,size,used,avail,target").Output()
		if err == nil {
			lines := strings.Split(string(out), "\n")
			for i, line := range lines {
				if i == 0 { // Skip header
					continue
				}
				fields := strings.Fields(line)
				if len(fields) >= 6 && strings.HasPrefix(fields[0], "/dev/") {
					drive := models.StorageDrive{
						DeviceID:   fields[0],
						FileSystem: fields[1],
						MountPoint: fields[5],
						Name:       fields[0],
					}

					drive.CapacityGB = parseSize(fields[2])
					usedGB := parseSize(fields[3])
					drive.FreeSpaceGB = drive.CapacityGB - usedGB

					// Determine type from device name
					if strings.Contains(fields[0], "nvme") {
						drive.Type = "NVMe"
					} else if strings.Contains(fields[0], "sd") {
						drive.Type = "SSD" // Assume SSD, could be HDD
					}

					if drive.CapacityGB > 0 {
						drives = append(drives, drive)
					}
				}
			}
		}
	}

	return drives
}

func (c *DarwinHardwareCollector) collectBattery() *models.Battery {
	switch runtime.GOOS {
	case "darwin":
		// macOS battery info
		out, err := exec.Command("pmset", "-g", "batt").Output()
		if err != nil {
			return nil
		}

		outputStr := string(out)
		if !strings.Contains(outputStr, "InternalBattery") {
			return nil // Desktop Mac, no battery
		}

		battery := &models.Battery{Present: true}

		// Parse battery percentage
		re := regexp.MustCompile(`(\d+)%`)
		if matches := re.FindStringSubmatch(outputStr); len(matches) > 1 {
			if level, err := strconv.ParseFloat(matches[1], 64); err == nil {
				battery.ChargeLevel = level
			}
		}

		// Parse charging status
		if strings.Contains(outputStr, "charging") && !strings.Contains(outputStr, "discharging") {
			battery.ChargingStatus = "Charging"
		} else if strings.Contains(outputStr, "discharging") {
			battery.ChargingStatus = "Discharging"
		} else if strings.Contains(outputStr, "charged") {
			battery.ChargingStatus = "Full"
		}

		// Get detailed battery info using ioreg
		out, err = exec.Command("ioreg", "-l", "-w", "0").Output()
		if err == nil {
			lines := strings.Split(string(out), "\n")
			for _, line := range lines {
				if strings.Contains(line, "CycleCount") {
					re := regexp.MustCompile(`"CycleCount" = (\d+)`)
					if matches := re.FindStringSubmatch(line); len(matches) > 1 {
						if cycles, err := strconv.Atoi(matches[1]); err == nil {
							battery.CycleCount = cycles
						}
					}
				}
				if strings.Contains(line, "MaxCapacity") {
					re := regexp.MustCompile(`"MaxCapacity" = (\d+)`)
					if matches := re.FindStringSubmatch(line); len(matches) > 1 {
						if cap, err := strconv.Atoi(matches[1]); err == nil {
							battery.CurrentCapacity = cap
						}
					}
				}
				if strings.Contains(line, "DesignCapacity") {
					re := regexp.MustCompile(`"DesignCapacity" = (\d+)`)
					if matches := re.FindStringSubmatch(line); len(matches) > 1 {
						if cap, err := strconv.Atoi(matches[1]); err == nil {
							battery.DesignCapacity = cap
						}
					}
				}
			}
		}

		// Calculate health
		if battery.DesignCapacity > 0 && battery.CurrentCapacity > 0 {
			battery.HealthPercent = float64(battery.CurrentCapacity) / float64(battery.DesignCapacity) * 100
		}

		return battery

	case "windows":
		// Windows: Use wmic for battery info
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

	default:
		// Linux: Check if battery exists
		if _, err := os.Stat("/sys/class/power_supply/BAT0"); os.IsNotExist(err) {
			return nil
		}

		battery := &models.Battery{Present: true}

		// Read capacity
		if data, err := os.ReadFile("/sys/class/power_supply/BAT0/capacity"); err == nil {
			if level, err := strconv.ParseFloat(strings.TrimSpace(string(data)), 64); err == nil {
				battery.ChargeLevel = level
			}
		}

		// Read status
		if data, err := os.ReadFile("/sys/class/power_supply/BAT0/status"); err == nil {
			battery.ChargingStatus = strings.TrimSpace(string(data))
		}

		// Read design capacity
		if data, err := os.ReadFile("/sys/class/power_supply/BAT0/energy_full_design"); err == nil {
			if cap, err := strconv.Atoi(strings.TrimSpace(string(data))); err == nil {
				battery.DesignCapacity = cap / 1000 // Convert from uWh to mWh
			}
		}

		// Read current capacity
		if data, err := os.ReadFile("/sys/class/power_supply/BAT0/energy_full"); err == nil {
			if cap, err := strconv.Atoi(strings.TrimSpace(string(data))); err == nil {
				battery.CurrentCapacity = cap / 1000
			}
		}

		// Read cycle count
		if data, err := os.ReadFile("/sys/class/power_supply/BAT0/cycle_count"); err == nil {
			if cycles, err := strconv.Atoi(strings.TrimSpace(string(data))); err == nil {
				battery.CycleCount = cycles
			}
		}

		if battery.DesignCapacity > 0 && battery.CurrentCapacity > 0 {
			battery.HealthPercent = float64(battery.CurrentCapacity) / float64(battery.DesignCapacity) * 100
		}

		return battery
	}
}

func (c *DarwinHardwareCollector) collectGraphicsAdapters() []models.GraphicsAdapter {
	var adapters []models.GraphicsAdapter

	switch runtime.GOOS {
	case "darwin":
		out, err := exec.Command("system_profiler", "SPDisplaysDataType").Output()
		if err == nil {
			lines := strings.Split(string(out), "\n")
			var currentAdapter *models.GraphicsAdapter
			for _, line := range lines {
				line = strings.TrimSpace(line)

				// New adapter starts with a name that ends with ":"
				if strings.HasSuffix(line, ":") && !strings.Contains(line, "Displays:") && !strings.Contains(line, "Graphics") {
					if currentAdapter != nil {
						adapters = append(adapters, *currentAdapter)
					}
					currentAdapter = &models.GraphicsAdapter{
						Name: strings.TrimSuffix(line, ":"),
					}
				} else if currentAdapter != nil {
					if strings.HasPrefix(line, "Chipset Model:") {
						currentAdapter.Name = strings.TrimSpace(strings.TrimPrefix(line, "Chipset Model:"))
					} else if strings.HasPrefix(line, "Vendor:") {
						currentAdapter.Manufacturer = strings.TrimSpace(strings.TrimPrefix(line, "Vendor:"))
					} else if strings.HasPrefix(line, "VRAM") {
						vramStr := strings.TrimSpace(strings.TrimPrefix(line, "VRAM (Dynamic, Max):"))
						vramStr = strings.TrimSpace(strings.TrimPrefix(vramStr, "VRAM (Total):"))
						if strings.Contains(vramStr, "GB") {
							if gb, err := strconv.Atoi(strings.TrimSuffix(vramStr, " GB")); err == nil {
								currentAdapter.MemoryMB = gb * 1024
							}
						} else if strings.Contains(vramStr, "MB") {
							if mb, err := strconv.Atoi(strings.TrimSuffix(vramStr, " MB")); err == nil {
								currentAdapter.MemoryMB = mb
							}
						}
					} else if strings.HasPrefix(line, "Resolution:") {
						currentAdapter.Resolution = strings.TrimSpace(strings.TrimPrefix(line, "Resolution:"))
					}
				}
			}
			if currentAdapter != nil {
				adapters = append(adapters, *currentAdapter)
			}
		}

	case "windows":
		// Windows: Use wmic for GPU info
		out, err := exec.Command("wmic", "path", "win32_videocontroller", "get", "name,adapterram,driverversion,videoprocessor", "/format:csv").Output()
		if err == nil {
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

	default:
		// Linux: Try lspci
		out, err := exec.Command("lspci").Output()
		if err == nil {
			lines := strings.Split(string(out), "\n")
			for _, line := range lines {
				if strings.Contains(line, "VGA") || strings.Contains(line, "3D") || strings.Contains(line, "Display") {
					parts := strings.SplitN(line, ":", 2)
					if len(parts) == 2 {
						adapter := models.GraphicsAdapter{
							Name: strings.TrimSpace(parts[1]),
						}
						if strings.Contains(adapter.Name, "Intel") {
							adapter.Manufacturer = "Intel"
						} else if strings.Contains(adapter.Name, "NVIDIA") {
							adapter.Manufacturer = "NVIDIA"
						} else if strings.Contains(adapter.Name, "AMD") || strings.Contains(adapter.Name, "ATI") {
							adapter.Manufacturer = "AMD"
						}
						adapters = append(adapters, adapter)
					}
				}
			}
		}
	}

	return adapters
}

// Helper functions

func readFileContent(path string) string {
	data, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(data))
}

// parseWmicValue extracts the value from wmic /value output format (Key=Value)
func parseWmicValue(output, key string) string {
	lines := strings.Split(output, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, key+"=") {
			return strings.TrimSpace(strings.TrimPrefix(line, key+"="))
		}
	}
	return ""
}

func parseSize(sizeStr string) float64 {
	sizeStr = strings.TrimSpace(sizeStr)
	sizeStr = strings.ToUpper(sizeStr)

	var multiplier float64 = 1
	if strings.HasSuffix(sizeStr, "T") || strings.HasSuffix(sizeStr, "TI") || strings.HasSuffix(sizeStr, "TB") || strings.HasSuffix(sizeStr, "TIB") {
		multiplier = 1024
		// Trim secondary suffixes first (I, B), then primary (T)
		sizeStr = strings.TrimSuffix(sizeStr, "B")
		sizeStr = strings.TrimSuffix(sizeStr, "I")
		sizeStr = strings.TrimSuffix(sizeStr, "T")
	} else if strings.HasSuffix(sizeStr, "G") || strings.HasSuffix(sizeStr, "GI") || strings.HasSuffix(sizeStr, "GB") || strings.HasSuffix(sizeStr, "GIB") {
		multiplier = 1
		// Trim secondary suffixes first (I, B), then primary (G)
		sizeStr = strings.TrimSuffix(sizeStr, "B")
		sizeStr = strings.TrimSuffix(sizeStr, "I")
		sizeStr = strings.TrimSuffix(sizeStr, "G")
	} else if strings.HasSuffix(sizeStr, "M") || strings.HasSuffix(sizeStr, "MI") || strings.HasSuffix(sizeStr, "MB") || strings.HasSuffix(sizeStr, "MIB") {
		multiplier = 1.0 / 1024
		// Trim secondary suffixes first (I, B), then primary (M)
		sizeStr = strings.TrimSuffix(sizeStr, "B")
		sizeStr = strings.TrimSuffix(sizeStr, "I")
		sizeStr = strings.TrimSuffix(sizeStr, "M")
	} else if strings.HasSuffix(sizeStr, "K") || strings.HasSuffix(sizeStr, "KI") || strings.HasSuffix(sizeStr, "KB") || strings.HasSuffix(sizeStr, "KIB") {
		multiplier = 1.0 / (1024 * 1024)
		// Trim secondary suffixes first (I, B), then primary (K)
		sizeStr = strings.TrimSuffix(sizeStr, "B")
		sizeStr = strings.TrimSuffix(sizeStr, "I")
		sizeStr = strings.TrimSuffix(sizeStr, "K")
	}

	size, _ := strconv.ParseFloat(strings.TrimSpace(sizeStr), 64)
	return size * multiplier
}

func runCommand(name string, args ...string) (string, error) {
	cmd := exec.Command(name, args...)
	var out bytes.Buffer
	cmd.Stdout = &out
	err := cmd.Run()
	return out.String(), err
}
