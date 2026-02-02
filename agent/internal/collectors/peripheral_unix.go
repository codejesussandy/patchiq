//go:build darwin || linux

package collectors

import (
	"os/exec"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/patchify/agent/internal/models"
)

// DarwinPeripheralCollector collects peripheral info on macOS
type DarwinPeripheralCollector struct{}

// NewDarwinPeripheralCollector creates a new peripheral collector for macOS
func NewDarwinPeripheralCollector() *DarwinPeripheralCollector {
	return &DarwinPeripheralCollector{}
}

// Name returns the collector name
func (c *DarwinPeripheralCollector) Name() string {
	return "peripherals"
}

// Collect gathers peripheral information
func (c *DarwinPeripheralCollector) Collect() (interface{}, error) {
	per := &models.Peripherals{
		CollectedAt: time.Now().UTC().Format(time.RFC3339),
	}

	per.Monitors = c.collectMonitors()
	per.USBDevices = c.collectUSBDevices()
	per.Printers = c.collectPrinters()
	per.AudioDevices = c.collectAudioDevices()
	per.BluetoothDevices = c.collectBluetoothDevices()

	return per, nil
}

func (c *DarwinPeripheralCollector) collectMonitors() []models.Monitor {
	var monitors []models.Monitor

	switch runtime.GOOS {
	case "darwin":
		out, err := exec.Command("system_profiler", "SPDisplaysDataType").Output()
		if err != nil {
			return monitors
		}

		lines := strings.Split(string(out), "\n")
		var currentMonitor *models.Monitor
		inDisplaySection := false

		for _, line := range lines {
			line = strings.TrimSpace(line)

			if strings.HasSuffix(line, ":") && !strings.Contains(line, "Graphics") && !strings.Contains(line, "Displays") {
				if inDisplaySection {
					if currentMonitor != nil && currentMonitor.Name != "" {
						monitors = append(monitors, *currentMonitor)
					}
					currentMonitor = &models.Monitor{
						Name: strings.TrimSuffix(line, ":"),
					}
				}
			}

			if strings.Contains(line, "Displays:") {
				inDisplaySection = true
			}

			if currentMonitor == nil {
				continue
			}

			if strings.HasPrefix(line, "Display Type:") {
				displayType := strings.TrimSpace(strings.TrimPrefix(line, "Display Type:"))
				if strings.Contains(displayType, "Built-in") {
					currentMonitor.IsBuiltIn = true
				}
			} else if strings.HasPrefix(line, "Resolution:") {
				res := strings.TrimSpace(strings.TrimPrefix(line, "Resolution:"))
				currentMonitor.Resolution = res

				re := regexp.MustCompile(`(\d+)\s*x\s*(\d+)`)
				if matches := re.FindStringSubmatch(res); len(matches) > 2 {
					if w, err := strconv.Atoi(matches[1]); err == nil {
						currentMonitor.WidthPx = w
					}
					if h, err := strconv.Atoi(matches[2]); err == nil {
						currentMonitor.HeightPx = h
					}
				}
			} else if strings.HasPrefix(line, "Main Display:") {
				if strings.Contains(line, "Yes") {
					currentMonitor.IsPrimary = true
				}
			} else if strings.HasPrefix(line, "Connection Type:") {
				currentMonitor.ConnectionType = strings.TrimSpace(strings.TrimPrefix(line, "Connection Type:"))
			} else if strings.HasPrefix(line, "Manufacturer:") {
				currentMonitor.Manufacturer = strings.TrimSpace(strings.TrimPrefix(line, "Manufacturer:"))
			}
		}

		if currentMonitor != nil && currentMonitor.Name != "" {
			monitors = append(monitors, *currentMonitor)
		}

	default:
		// Linux: Use xrandr
		out, err := exec.Command("xrandr", "--query").Output()
		if err != nil {
			return monitors
		}

		lines := strings.Split(string(out), "\n")
		for _, line := range lines {
			if strings.Contains(line, " connected") {
				monitor := models.Monitor{}

				parts := strings.Fields(line)
				if len(parts) > 0 {
					monitor.Name = parts[0]
				}

				if strings.Contains(line, "primary") {
					monitor.IsPrimary = true
				}

				re := regexp.MustCompile(`(\d+)x(\d+)`)
				if matches := re.FindStringSubmatch(line); len(matches) > 2 {
					if w, err := strconv.Atoi(matches[1]); err == nil {
						monitor.WidthPx = w
					}
					if h, err := strconv.Atoi(matches[2]); err == nil {
						monitor.HeightPx = h
					}
					monitor.Resolution = matches[1] + "x" + matches[2]
				}

				name := strings.ToUpper(monitor.Name)
				if strings.Contains(name, "HDMI") {
					monitor.ConnectionType = "HDMI"
				} else if strings.Contains(name, "DP") {
					monitor.ConnectionType = "DisplayPort"
				} else if strings.Contains(name, "VGA") {
					monitor.ConnectionType = "VGA"
				} else if strings.Contains(name, "EDP") {
					monitor.ConnectionType = "eDP"
					monitor.IsBuiltIn = true
				}

				if monitor.Name != "" {
					monitors = append(monitors, monitor)
				}
			}
		}
	}

	return monitors
}

func (c *DarwinPeripheralCollector) collectUSBDevices() []models.USBDevice {
	var devices []models.USBDevice

	switch runtime.GOOS {
	case "darwin":
		out, err := exec.Command("system_profiler", "SPUSBDataType").Output()
		if err != nil {
			return devices
		}

		lines := strings.Split(string(out), "\n")
		var currentDevice *models.USBDevice

		for _, line := range lines {
			line = strings.TrimSpace(line)

			if strings.HasSuffix(line, ":") && !strings.Contains(line, "USB") {
				if currentDevice != nil && currentDevice.Name != "" && currentDevice.VendorID != "" {
					devices = append(devices, *currentDevice)
				}
				currentDevice = &models.USBDevice{
					Name: strings.TrimSuffix(line, ":"),
				}
			}

			if currentDevice == nil {
				continue
			}

			if strings.HasPrefix(line, "Product ID:") {
				currentDevice.ProductID = strings.TrimSpace(strings.TrimPrefix(line, "Product ID:"))
			} else if strings.HasPrefix(line, "Vendor ID:") {
				vid := strings.TrimSpace(strings.TrimPrefix(line, "Vendor ID:"))
				if idx := strings.Index(vid, "("); idx > 0 {
					currentDevice.VendorID = strings.TrimSpace(vid[:idx])
					currentDevice.Manufacturer = strings.Trim(vid[idx:], "()")
				} else {
					currentDevice.VendorID = vid
				}
			} else if strings.HasPrefix(line, "Manufacturer:") {
				currentDevice.Manufacturer = strings.TrimSpace(strings.TrimPrefix(line, "Manufacturer:"))
			} else if strings.HasPrefix(line, "Serial Number:") {
				currentDevice.SerialNumber = strings.TrimSpace(strings.TrimPrefix(line, "Serial Number:"))
			} else if strings.HasPrefix(line, "Speed:") {
				currentDevice.Speed = strings.TrimSpace(strings.TrimPrefix(line, "Speed:"))
			}

			nameLower := strings.ToLower(currentDevice.Name)
			if strings.Contains(nameLower, "keyboard") {
				currentDevice.DeviceType = "Keyboard"
			} else if strings.Contains(nameLower, "mouse") || strings.Contains(nameLower, "trackpad") {
				currentDevice.DeviceType = "Mouse"
			} else if strings.Contains(nameLower, "hub") {
				currentDevice.DeviceType = "Hub"
			} else if strings.Contains(nameLower, "storage") || strings.Contains(nameLower, "disk") {
				currentDevice.DeviceType = "Storage"
			} else if strings.Contains(nameLower, "camera") || strings.Contains(nameLower, "webcam") {
				currentDevice.DeviceType = "Camera"
			} else if strings.Contains(nameLower, "audio") || strings.Contains(nameLower, "headset") {
				currentDevice.DeviceType = "Audio"
			}
		}

		if currentDevice != nil && currentDevice.Name != "" && currentDevice.VendorID != "" {
			devices = append(devices, *currentDevice)
		}

	default:
		// Linux: Use lsusb
		out, err := exec.Command("lsusb").Output()
		if err != nil {
			return devices
		}

		lines := strings.Split(string(out), "\n")
		for _, line := range lines {
			re := regexp.MustCompile(`Bus (\d+) Device (\d+): ID ([0-9a-fA-F]+):([0-9a-fA-F]+)\s*(.*)`)
			matches := re.FindStringSubmatch(line)
			if len(matches) > 5 {
				device := models.USBDevice{
					VendorID:  matches[3],
					ProductID: matches[4],
					Name:      strings.TrimSpace(matches[5]),
				}

				if bus, err := strconv.Atoi(matches[1]); err == nil {
					device.BusNumber = bus
				}
				if devNum, err := strconv.Atoi(matches[2]); err == nil {
					device.DeviceNumber = devNum
				}

				if device.Name != "" {
					devices = append(devices, device)
				}
			}
		}
	}

	return devices
}

func (c *DarwinPeripheralCollector) collectPrinters() []models.Printer {
	var printers []models.Printer

	switch runtime.GOOS {
	case "darwin":
		out, err := exec.Command("lpstat", "-p").Output()
		if err != nil {
			return printers
		}

		defaultPrinter := ""
		if defOut, err := exec.Command("lpstat", "-d").Output(); err == nil {
			parts := strings.Split(string(defOut), ":")
			if len(parts) > 1 {
				defaultPrinter = strings.TrimSpace(parts[1])
			}
		}

		lines := strings.Split(string(out), "\n")
		for _, line := range lines {
			if strings.HasPrefix(line, "printer") {
				parts := strings.Fields(line)
				if len(parts) >= 2 {
					printer := models.Printer{
						Name: parts[1],
					}

					if strings.Contains(line, "idle") || strings.Contains(line, "enabled") {
						printer.Status = "Ready"
					} else if strings.Contains(line, "disabled") {
						printer.Status = "Offline"
					} else {
						printer.Status = "Unknown"
					}

					if printer.Name == defaultPrinter {
						printer.IsDefault = true
					}

					printer.ConnectionType = "Unknown"

					printers = append(printers, printer)
				}
			}
		}

	default:
		// Linux: Use lpstat
		out, err := exec.Command("lpstat", "-p", "-d").Output()
		if err != nil {
			return printers
		}

		defaultPrinter := ""
		lines := strings.Split(string(out), "\n")

		for _, line := range lines {
			if strings.Contains(line, "system default destination:") {
				parts := strings.Split(line, ":")
				if len(parts) > 1 {
					defaultPrinter = strings.TrimSpace(parts[1])
				}
			} else if strings.HasPrefix(line, "printer") {
				parts := strings.Fields(line)
				if len(parts) >= 2 {
					printer := models.Printer{
						Name:      parts[1],
						IsDefault: parts[1] == defaultPrinter,
					}

					if strings.Contains(line, "idle") {
						printer.Status = "Ready"
					} else if strings.Contains(line, "disabled") {
						printer.Status = "Offline"
					}

					printers = append(printers, printer)
				}
			}
		}
	}

	return printers
}

func (c *DarwinPeripheralCollector) collectAudioDevices() []models.AudioDevice {
	var devices []models.AudioDevice

	switch runtime.GOOS {
	case "darwin":
		out, err := exec.Command("system_profiler", "SPAudioDataType").Output()
		if err != nil {
			return devices
		}

		lines := strings.Split(string(out), "\n")
		var currentDevice *models.AudioDevice
		deviceSection := ""

		for _, line := range lines {
			line = strings.TrimSpace(line)

			if strings.Contains(line, "Output:") {
				deviceSection = "Output"
			} else if strings.Contains(line, "Input:") {
				deviceSection = "Input"
			}

			if strings.HasSuffix(line, ":") && deviceSection != "" &&
				!strings.Contains(line, "Output") && !strings.Contains(line, "Input") &&
				!strings.Contains(line, "Audio") {

				if currentDevice != nil && currentDevice.Name != "" {
					devices = append(devices, *currentDevice)
				}

				currentDevice = &models.AudioDevice{
					Name: strings.TrimSuffix(line, ":"),
					Type: deviceSection,
				}
			}

			if currentDevice == nil {
				continue
			}

			if strings.HasPrefix(line, "Manufacturer:") {
				currentDevice.Manufacturer = strings.TrimSpace(strings.TrimPrefix(line, "Manufacturer:"))
			} else if strings.HasPrefix(line, "Default Output Device:") {
				if strings.Contains(line, "Yes") {
					currentDevice.IsDefault = true
				}
			} else if strings.HasPrefix(line, "Default Input Device:") {
				if strings.Contains(line, "Yes") {
					currentDevice.IsDefault = true
				}
			}

			nameLower := strings.ToLower(currentDevice.Name)
			if strings.Contains(nameLower, "built-in") || strings.Contains(nameLower, "internal") {
				currentDevice.IsBuiltIn = true
			}
		}

		if currentDevice != nil && currentDevice.Name != "" {
			devices = append(devices, *currentDevice)
		}

	default:
		// Linux: Use pactl or aplay/arecord
		out, err := exec.Command("pactl", "list", "sinks", "short").Output()
		if err == nil {
			lines := strings.Split(string(out), "\n")
			for _, line := range lines {
				parts := strings.Fields(line)
				if len(parts) >= 2 {
					device := models.AudioDevice{
						Name: parts[1],
						Type: "Output",
					}
					devices = append(devices, device)
				}
			}
		}

		out, err = exec.Command("pactl", "list", "sources", "short").Output()
		if err == nil {
			lines := strings.Split(string(out), "\n")
			for _, line := range lines {
				parts := strings.Fields(line)
				if len(parts) >= 2 {
					if strings.Contains(parts[1], ".monitor") {
						continue
					}
					device := models.AudioDevice{
						Name: parts[1],
						Type: "Input",
					}
					devices = append(devices, device)
				}
			}
		}
	}

	return devices
}

func (c *DarwinPeripheralCollector) collectBluetoothDevices() []models.BluetoothDevice {
	var devices []models.BluetoothDevice

	switch runtime.GOOS {
	case "darwin":
		out, err := exec.Command("system_profiler", "SPBluetoothDataType").Output()
		if err != nil {
			return devices
		}

		lines := strings.Split(string(out), "\n")
		var currentDevice *models.BluetoothDevice
		inDevicesSection := false

		for _, line := range lines {
			line = strings.TrimSpace(line)

			if strings.Contains(line, "Devices (Paired, Configured, etc.):") ||
				strings.Contains(line, "Devices:") {
				inDevicesSection = true
				continue
			}

			if !inDevicesSection {
				continue
			}

			if strings.HasSuffix(line, ":") &&
				!strings.Contains(line, "Address") &&
				!strings.Contains(line, "Services") {

				if currentDevice != nil && currentDevice.Name != "" {
					devices = append(devices, *currentDevice)
				}

				currentDevice = &models.BluetoothDevice{
					Name:   strings.TrimSuffix(line, ":"),
					Paired: true,
				}
			}

			if currentDevice == nil {
				continue
			}

			if strings.HasPrefix(line, "Address:") {
				currentDevice.Address = strings.TrimSpace(strings.TrimPrefix(line, "Address:"))
			} else if strings.HasPrefix(line, "Connected:") {
				if strings.Contains(line, "Yes") {
					currentDevice.Connected = true
				}
			} else if strings.HasPrefix(line, "Minor Type:") || strings.HasPrefix(line, "Type:") {
				typeStr := strings.TrimSpace(strings.TrimPrefix(line, "Minor Type:"))
				typeStr = strings.TrimSpace(strings.TrimPrefix(typeStr, "Type:"))
				currentDevice.Type = typeStr
			}
		}

		if currentDevice != nil && currentDevice.Name != "" {
			devices = append(devices, *currentDevice)
		}

	default:
		// Linux: Use bluetoothctl
		out, err := exec.Command("bluetoothctl", "devices").Output()
		if err != nil {
			return devices
		}

		lines := strings.Split(string(out), "\n")
		for _, line := range lines {
			if strings.HasPrefix(line, "Device") {
				parts := strings.Fields(line)
				if len(parts) >= 3 {
					device := models.BluetoothDevice{
						Address: parts[1],
						Name:    strings.Join(parts[2:], " "),
						Paired:  true,
					}

					infoOut, err := exec.Command("bluetoothctl", "info", parts[1]).Output()
					if err == nil {
						if strings.Contains(string(infoOut), "Connected: yes") {
							device.Connected = true
						}
					}

					devices = append(devices, device)
				}
			}
		}
	}

	return devices
}
