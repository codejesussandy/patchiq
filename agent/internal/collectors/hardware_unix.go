//go:build darwin || linux

package collectors

import (
	"os"
	"os/exec"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/patchify/agent/internal/models"
)

// UnixHardwareCollector collects hardware info on macOS and Linux
type UnixHardwareCollector struct{}

// NewUnixHardwareCollector creates a new hardware collector for Unix systems (macOS/Linux)
func NewUnixHardwareCollector() *UnixHardwareCollector {
	return &UnixHardwareCollector{}
}

// Backward compatibility aliases
type DarwinHardwareCollector = UnixHardwareCollector

func NewDarwinHardwareCollector() *UnixHardwareCollector {
	return NewUnixHardwareCollector()
}

// Name returns the collector name
func (c *UnixHardwareCollector) Name() string {
	return "hardware"
}

// Collect gathers hardware information
func (c *UnixHardwareCollector) Collect() (interface{}, error) {
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

func (c *UnixHardwareCollector) collectSystemIdentity() models.SystemIdentity {
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

func (c *UnixHardwareCollector) collectBIOS() models.BIOS {
	bios := models.BIOS{
		FirmwareType: "UEFI",
	}

	switch runtime.GOOS {
	case "darwin":
		// macOS uses EFI/UEFI
		bios.Vendor = "Apple Inc."
		out, err := exec.Command("system_profiler", "SPHardwareDataType").Output()
		if err == nil {
			lines := strings.Split(string(out), "\n")
			for _, line := range lines {
				line = strings.TrimSpace(line)
				// On Apple Silicon, it's "System Firmware Version"
				// On Intel Macs, it's "Boot ROM Version"
				if strings.HasPrefix(line, "System Firmware Version:") {
					bios.Version = strings.TrimSpace(strings.TrimPrefix(line, "System Firmware Version:"))
				} else if strings.HasPrefix(line, "Boot ROM Version:") && bios.Version == "" {
					bios.Version = strings.TrimSpace(strings.TrimPrefix(line, "Boot ROM Version:"))
				}
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

func (c *UnixHardwareCollector) collectProcessor() models.Processor {
	proc := models.Processor{
		Architecture: runtime.GOARCH,
	}

	switch runtime.GOOS {
	case "darwin":
		// First try Intel-style brand string
		out, err := exec.Command("sysctl", "-n", "machdep.cpu.brand_string").Output()
		if err == nil && len(strings.TrimSpace(string(out))) > 0 {
			proc.Name = strings.TrimSpace(string(out))
		}

		// If no brand string (Apple Silicon), get from system_profiler
		if proc.Name == "" {
			if out, err := exec.Command("system_profiler", "SPHardwareDataType").Output(); err == nil {
				lines := strings.Split(string(out), "\n")
				for _, line := range lines {
					line = strings.TrimSpace(line)
					if strings.HasPrefix(line, "Chip:") {
						proc.Name = strings.TrimSpace(strings.TrimPrefix(line, "Chip:"))
					}
				}
			}
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

		// Get CPU frequency (only works on Intel Macs)
		if out, err := exec.Command("sysctl", "-n", "hw.cpufrequency").Output(); err == nil {
			freqStr := strings.TrimSpace(string(out))
			if freqStr != "" {
				if freq, err := strconv.ParseInt(freqStr, 10, 64); err == nil && freq > 0 {
					proc.ClockSpeedMHz = int(freq / 1000000)
				}
			}
		}

		// For Apple Silicon, set known base speeds (approximate)
		if proc.ClockSpeedMHz == 0 && strings.Contains(proc.Name, "Apple") {
			// Apple Silicon has dynamic frequency, these are approximate max values
			if strings.Contains(proc.Name, "M4") {
				proc.ClockSpeedMHz = 4400 // M4 performance cores max ~4.4 GHz
			} else if strings.Contains(proc.Name, "M3") {
				proc.ClockSpeedMHz = 4000
			} else if strings.Contains(proc.Name, "M2") {
				proc.ClockSpeedMHz = 3500
			} else if strings.Contains(proc.Name, "M1") {
				proc.ClockSpeedMHz = 3200
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

func (c *UnixHardwareCollector) collectMemory() models.Memory {
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

func (c *UnixHardwareCollector) collectStorageDrives() []models.StorageDrive {
	var drives []models.StorageDrive

	switch runtime.GOOS {
	case "darwin":
		// Get actual physical disk size using diskutil
		var physicalDiskSizeGB float64
		if out, err := exec.Command("diskutil", "info", "disk0").Output(); err == nil {
			lines := strings.Split(string(out), "\n")
			for _, line := range lines {
				if strings.Contains(line, "Disk Size:") {
					// Format: "Disk Size:                 500.3 GB (500277792768 Bytes)"
					re := regexp.MustCompile(`([\d.]+)\s*GB`)
					if matches := re.FindStringSubmatch(line); len(matches) > 1 {
						if size, err := strconv.ParseFloat(matches[1], 64); err == nil {
							physicalDiskSizeGB = size
						}
					}
				}
			}
		}

		// Use df to get mounted filesystems for usage info
		out, err := exec.Command("df", "-h").Output()
		if err == nil {
			lines := strings.Split(string(out), "\n")
			// Track the main drive index to update with Data volume stats
			mainDriveIndex := -1

			for _, line := range lines {
				fields := strings.Fields(line)
				if len(fields) >= 6 && strings.HasPrefix(fields[0], "/dev/") {
					// Skip small system volumes
					if strings.Contains(fields[0], "devfs") || strings.Contains(fields[0], "map") {
						continue
					}

					mountPoint := fields[len(fields)-1]

					// For macOS APFS, only include the main Data volume as the primary drive
					// Skip system volumes like VM, Preboot, Update, xarts, etc.
					isSystemVolume := strings.HasPrefix(mountPoint, "/System/Volumes/") &&
						mountPoint != "/System/Volumes/Data"

					if isSystemVolume {
						continue
					}

					// For macOS: prefer /System/Volumes/Data for accurate usage stats
					// because that's where user data actually resides
					if mountPoint == "/" {
						// Create main drive entry, but may update with Data volume stats later
						drive := models.StorageDrive{
							DeviceID:   fields[0],
							MountPoint: "/",
							Name:       "Macintosh HD",
							Type:       "SSD",
							FileSystem: "APFS",
						}
						if physicalDiskSizeGB > 0 {
							drive.CapacityGB = physicalDiskSizeGB
						} else {
							drive.CapacityGB = parseSize(fields[1])
						}
						usedGB := parseSize(fields[2])
						drive.FreeSpaceGB = drive.CapacityGB - usedGB

						if drive.CapacityGB > 0 {
							mainDriveIndex = len(drives)
							drives = append(drives, drive)
						}
					} else if mountPoint == "/System/Volumes/Data" {
						// This is where actual user data lives - use this for accurate usage
						usedGB := parseSize(fields[2])
						if mainDriveIndex >= 0 {
							// Update the main drive with Data volume usage stats
							drives[mainDriveIndex].FreeSpaceGB = drives[mainDriveIndex].CapacityGB - usedGB
						} else {
							// Data volume seen before root - create entry
							drive := models.StorageDrive{
								DeviceID:   fields[0],
								MountPoint: "/",
								Name:       "Macintosh HD",
								Type:       "SSD",
								FileSystem: "APFS",
							}
							if physicalDiskSizeGB > 0 {
								drive.CapacityGB = physicalDiskSizeGB
							} else {
								drive.CapacityGB = parseSize(fields[1])
							}
							drive.FreeSpaceGB = drive.CapacityGB - usedGB

							if drive.CapacityGB > 0 {
								mainDriveIndex = len(drives)
								drives = append(drives, drive)
							}
						}
					} else {
						// External drives or disk images
						drive := models.StorageDrive{
							DeviceID:   fields[0],
							MountPoint: mountPoint,
							Type:       "SSD",
						}
						drive.CapacityGB = parseSize(fields[1])
						usedGB := parseSize(fields[2])
						drive.FreeSpaceGB = drive.CapacityGB - usedGB

						if drive.CapacityGB > 0 {
							drives = append(drives, drive)
						}
					}
				}
			}
		}

		// Get filesystem type from diskutil
		if out, err := exec.Command("diskutil", "list").Output(); err == nil && len(drives) > 0 {
			lines := strings.Split(string(out), "\n")
			for _, line := range lines {
				if strings.Contains(line, "Apple_APFS") || strings.Contains(line, "APFS Container") {
					for i := range drives {
						if drives[i].FileSystem == "" {
							drives[i].FileSystem = "APFS"
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

func (c *UnixHardwareCollector) collectBattery() *models.Battery {
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

func (c *UnixHardwareCollector) collectGraphicsAdapters() []models.GraphicsAdapter {
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
