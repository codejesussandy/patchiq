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

	// Collect monitors
	per.Monitors = c.collectMonitors()

	// Collect USB devices
	per.USBDevices = c.collectUSBDevices()

	// Collect printers
	per.Printers = c.collectPrinters()

	// Collect audio devices
	per.AudioDevices = c.collectAudioDevices()

	// Collect Bluetooth devices
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

			// Look for display entries
			if strings.HasSuffix(line, ":") && !strings.Contains(line, "Graphics") && !strings.Contains(line, "Displays") {
				// Check if we're in a displays section
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

				// Parse width x height
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

	case "windows":
		// Windows: Use wmic desktopmonitor and PowerShell for more details
		out, err := exec.Command("wmic", "desktopmonitor", "get", "Name,MonitorManufacturer,ScreenWidth,ScreenHeight,PNPDeviceID", "/format:csv").Output()
		if err == nil {
			lines := strings.Split(string(out), "\n")
			for i, line := range lines {
				if i == 0 || strings.TrimSpace(line) == "" {
					continue
				}
				fields := strings.Split(line, ",")
				if len(fields) >= 5 {
					monitor := models.Monitor{
						Manufacturer: strings.TrimSpace(fields[2]),
						Name:         strings.TrimSpace(fields[3]),
					}

					if monitor.Name == "" {
						monitor.Name = "Monitor " + strconv.Itoa(i)
					}

					// Parse dimensions
					if w, err := strconv.Atoi(strings.TrimSpace(fields[4])); err == nil && w > 0 {
						monitor.WidthPx = w
					}
					if h, err := strconv.Atoi(strings.TrimSpace(fields[5])); err == nil && h > 0 {
						monitor.HeightPx = h
					}
					if monitor.WidthPx > 0 && monitor.HeightPx > 0 {
						monitor.Resolution = strconv.Itoa(monitor.WidthPx) + "x" + strconv.Itoa(monitor.HeightPx)
					}

					// First monitor is typically primary
					if len(monitors) == 0 {
						monitor.IsPrimary = true
					}

					// Determine connection type from PNP device ID
					pnpID := strings.ToUpper(strings.TrimSpace(fields[1]))
					if strings.Contains(pnpID, "HDMI") {
						monitor.ConnectionType = "HDMI"
					} else if strings.Contains(pnpID, "DP") || strings.Contains(pnpID, "DISPLAYPORT") {
						monitor.ConnectionType = "DisplayPort"
					} else if strings.Contains(pnpID, "VGA") {
						monitor.ConnectionType = "VGA"
					} else if strings.Contains(pnpID, "LVDS") || strings.Contains(pnpID, "EDP") {
						monitor.ConnectionType = "Internal"
						monitor.IsBuiltIn = true
					}

					monitors = append(monitors, monitor)
				}
			}
		}

		// Get current screen resolution via PowerShell (more reliable)
		if psOut, err := exec.Command("powershell", "-Command", "[System.Windows.Forms.Screen]::PrimaryScreen.Bounds | Select-Object Width,Height | Format-List").Output(); err == nil {
			output := string(psOut)
			for _, line := range strings.Split(output, "\n") {
				if strings.Contains(line, "Width") {
					parts := strings.SplitN(line, ":", 2)
					if len(parts) == 2 {
						if w, err := strconv.Atoi(strings.TrimSpace(parts[1])); err == nil && len(monitors) > 0 {
							monitors[0].WidthPx = w
						}
					}
				} else if strings.Contains(line, "Height") {
					parts := strings.SplitN(line, ":", 2)
					if len(parts) == 2 {
						if h, err := strconv.Atoi(strings.TrimSpace(parts[1])); err == nil && len(monitors) > 0 {
							monitors[0].HeightPx = h
							monitors[0].Resolution = strconv.Itoa(monitors[0].WidthPx) + "x" + strconv.Itoa(monitors[0].HeightPx)
						}
					}
				}
			}
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

				// Parse monitor name
				parts := strings.Fields(line)
				if len(parts) > 0 {
					monitor.Name = parts[0]
				}

				// Check if primary
				if strings.Contains(line, "primary") {
					monitor.IsPrimary = true
				}

				// Parse resolution
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

				// Determine connection type from name
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

			// New device starts with name and colon
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
				// May contain vendor name in parentheses
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

			// Determine device type from name
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

	case "windows":
		// Windows: Use wmic to get USB devices
		out, err := exec.Command("wmic", "path", "Win32_PnPEntity", "where", "PNPDeviceID like 'USB%'", "get", "Name,Manufacturer,DeviceID,Status", "/format:csv").Output()
		if err == nil {
			lines := strings.Split(string(out), "\n")
			for i, line := range lines {
				if i == 0 || strings.TrimSpace(line) == "" {
					continue
				}
				fields := strings.Split(line, ",")
				if len(fields) >= 4 {
					deviceID := strings.TrimSpace(fields[1])
					name := strings.TrimSpace(fields[3])

					// Skip generic USB hubs unless they have a name
					if name == "" || name == "USB Root Hub" || strings.Contains(name, "USB Composite Device") {
						continue
					}

					device := models.USBDevice{
						Name:         name,
						Manufacturer: strings.TrimSpace(fields[2]),
					}

					// Extract VID and PID from device ID (e.g., USB\VID_046D&PID_C52B)
					vidRe := regexp.MustCompile(`VID_([0-9A-Fa-f]+)`)
					pidRe := regexp.MustCompile(`PID_([0-9A-Fa-f]+)`)

					if matches := vidRe.FindStringSubmatch(deviceID); len(matches) > 1 {
						device.VendorID = matches[1]
					}
					if matches := pidRe.FindStringSubmatch(deviceID); len(matches) > 1 {
						device.ProductID = matches[1]
					}

					// Determine device type from name
					nameLower := strings.ToLower(device.Name)
					if strings.Contains(nameLower, "keyboard") {
						device.DeviceType = "Keyboard"
					} else if strings.Contains(nameLower, "mouse") || strings.Contains(nameLower, "pointing") {
						device.DeviceType = "Mouse"
					} else if strings.Contains(nameLower, "hub") {
						device.DeviceType = "Hub"
					} else if strings.Contains(nameLower, "storage") || strings.Contains(nameLower, "disk") || strings.Contains(nameLower, "flash") {
						device.DeviceType = "Storage"
					} else if strings.Contains(nameLower, "camera") || strings.Contains(nameLower, "webcam") {
						device.DeviceType = "Camera"
					} else if strings.Contains(nameLower, "audio") || strings.Contains(nameLower, "headset") || strings.Contains(nameLower, "speaker") {
						device.DeviceType = "Audio"
					}

					devices = append(devices, device)
				}
			}
		}

	default:
		// Linux: Use lsusb
		out, err := exec.Command("lsusb").Output()
		if err != nil {
			return devices
		}

		lines := strings.Split(string(out), "\n")
		for _, line := range lines {
			// Format: Bus 001 Device 002: ID 1234:5678 Manufacturer Product
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

		// Get default printer
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

					// Check status
					if strings.Contains(line, "idle") || strings.Contains(line, "enabled") {
						printer.Status = "Ready"
					} else if strings.Contains(line, "disabled") {
						printer.Status = "Offline"
					} else {
						printer.Status = "Unknown"
					}

					// Check if default
					if printer.Name == defaultPrinter {
						printer.IsDefault = true
					}

					// Determine connection type (would need more info)
					printer.ConnectionType = "Unknown"

					printers = append(printers, printer)
				}
			}
		}

	case "windows":
		// Windows: Use wmic printer
		out, err := exec.Command("wmic", "printer", "get", "Name,DriverName,PortName,Default,PrinterStatus,Local,Network", "/format:csv").Output()
		if err == nil {
			lines := strings.Split(string(out), "\n")
			for i, line := range lines {
				if i == 0 || strings.TrimSpace(line) == "" {
					continue
				}
				fields := strings.Split(line, ",")
				if len(fields) >= 7 {
					printer := models.Printer{
						Name:   strings.TrimSpace(fields[5]),
						Driver: strings.TrimSpace(fields[2]),
					}

					// Check if default
					if strings.ToLower(strings.TrimSpace(fields[1])) == "true" {
						printer.IsDefault = true
					}

					// Determine connection type
					isLocal := strings.ToLower(strings.TrimSpace(fields[3])) == "true"
					isNetwork := strings.ToLower(strings.TrimSpace(fields[4])) == "true"
					portName := strings.TrimSpace(fields[6])

					if isNetwork {
						printer.ConnectionType = "Network"
					} else if isLocal {
						if strings.HasPrefix(portName, "USB") {
							printer.ConnectionType = "USB"
						} else if strings.HasPrefix(portName, "LPT") {
							printer.ConnectionType = "Parallel"
						} else {
							printer.ConnectionType = "Local"
						}
					}

					// Parse printer status (0 = Ready, 1 = Paused, etc.)
					statusCode := strings.TrimSpace(fields[7])
					switch statusCode {
					case "0", "1":
						printer.Status = "Ready"
					case "2":
						printer.Status = "Paused"
					case "3":
						printer.Status = "Error"
					case "4":
						printer.Status = "Pending Deletion"
					case "5":
						printer.Status = "Paper Jam"
					case "6":
						printer.Status = "Paper Out"
					default:
						printer.Status = "Unknown"
					}

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

			// New device
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

			// Check if built-in
			nameLower := strings.ToLower(currentDevice.Name)
			if strings.Contains(nameLower, "built-in") || strings.Contains(nameLower, "internal") {
				currentDevice.IsBuiltIn = true
			}
		}

		if currentDevice != nil && currentDevice.Name != "" {
			devices = append(devices, *currentDevice)
		}

	case "windows":
		// Windows: Use wmic sounddev for audio devices
		out, err := exec.Command("wmic", "sounddev", "get", "Name,Manufacturer,Status", "/format:csv").Output()
		if err == nil {
			lines := strings.Split(string(out), "\n")
			for i, line := range lines {
				if i == 0 || strings.TrimSpace(line) == "" {
					continue
				}
				fields := strings.Split(line, ",")
				if len(fields) >= 3 {
					device := models.AudioDevice{
						Manufacturer: strings.TrimSpace(fields[1]),
						Name:         strings.TrimSpace(fields[2]),
						Type:         "Output", // Default to output, Windows doesn't distinguish easily
					}

					// Determine type from name
					nameLower := strings.ToLower(device.Name)
					if strings.Contains(nameLower, "microphone") || strings.Contains(nameLower, "input") || strings.Contains(nameLower, "recording") {
						device.Type = "Input"
					}

					// Check if built-in
					if strings.Contains(nameLower, "realtek") || strings.Contains(nameLower, "high definition audio") {
						device.IsBuiltIn = true
					}

					// First device of each type is typically default
					isFirstOutput := device.Type == "Output"
					isFirstInput := device.Type == "Input"
					for _, d := range devices {
						if d.Type == device.Type {
							if d.Type == "Output" {
								isFirstOutput = false
							} else {
								isFirstInput = false
							}
						}
					}
					if isFirstOutput || isFirstInput {
						device.IsDefault = true
					}

					if device.Name != "" {
						devices = append(devices, device)
					}
				}
			}
		}

		// Also get playback/recording devices via PowerShell for better accuracy
		if psOut, err := exec.Command("powershell", "-Command", "Get-WmiObject Win32_SoundDevice | Select-Object Name, Manufacturer | Format-List").Output(); err == nil {
			// Just use this to enhance existing data if needed
			_ = psOut
		}

	default:
		// Linux: Use pactl or aplay/arecord
		// Output devices
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

		// Input devices
		out, err = exec.Command("pactl", "list", "sources", "short").Output()
		if err == nil {
			lines := strings.Split(string(out), "\n")
			for _, line := range lines {
				parts := strings.Fields(line)
				if len(parts) >= 2 {
					// Skip monitor sources
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

			// New device
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

	case "windows":
		// Windows: Use PowerShell to get Bluetooth devices
		out, err := exec.Command("powershell", "-Command", `Get-PnpDevice -Class Bluetooth | Where-Object {$_.Status -eq 'OK'} | Select-Object FriendlyName, InstanceId, Status | Format-List`).Output()
		if err == nil {
			output := string(out)
			blocks := strings.Split(output, "\n\n")

			for _, block := range blocks {
				if strings.TrimSpace(block) == "" {
					continue
				}

				device := models.BluetoothDevice{
					Paired: true,
				}

				lines := strings.Split(block, "\n")
				for _, line := range lines {
					if strings.Contains(line, "FriendlyName") {
						parts := strings.SplitN(line, ":", 2)
						if len(parts) == 2 {
							device.Name = strings.TrimSpace(parts[1])
						}
					} else if strings.Contains(line, "InstanceId") {
						parts := strings.SplitN(line, ":", 2)
						if len(parts) == 2 {
							instanceId := strings.TrimSpace(parts[1])
							// Extract MAC address from instance ID if present
							macRe := regexp.MustCompile(`([0-9A-Fa-f]{2}[_:]){5}[0-9A-Fa-f]{2}`)
							if matches := macRe.FindString(instanceId); matches != "" {
								device.Address = strings.ReplaceAll(matches, "_", ":")
							}
						}
					} else if strings.Contains(line, "Status") {
						parts := strings.SplitN(line, ":", 2)
						if len(parts) == 2 && strings.TrimSpace(parts[1]) == "OK" {
							device.Connected = true
						}
					}
				}

				// Determine device type from name
				if device.Name != "" {
					nameLower := strings.ToLower(device.Name)
					if strings.Contains(nameLower, "keyboard") {
						device.Type = "Keyboard"
					} else if strings.Contains(nameLower, "mouse") {
						device.Type = "Mouse"
					} else if strings.Contains(nameLower, "headphone") || strings.Contains(nameLower, "airpod") || strings.Contains(nameLower, "earphone") || strings.Contains(nameLower, "audio") {
						device.Type = "Audio"
					} else if strings.Contains(nameLower, "speaker") {
						device.Type = "Speaker"
					} else if strings.Contains(nameLower, "controller") || strings.Contains(nameLower, "gamepad") {
						device.Type = "Controller"
					}

					// Skip generic Bluetooth adapters
					if !strings.Contains(nameLower, "adapter") && !strings.Contains(nameLower, "radio") {
						devices = append(devices, device)
					}
				}
			}
		}

		// Alternative: Use wmic for paired devices
		if len(devices) == 0 {
			out, err := exec.Command("wmic", "path", "Win32_PnPEntity", "where", "PNPDeviceID like 'BTHENUM%'", "get", "Name,PNPDeviceID", "/format:csv").Output()
			if err == nil {
				lines := strings.Split(string(out), "\n")
				for i, line := range lines {
					if i == 0 || strings.TrimSpace(line) == "" {
						continue
					}
					fields := strings.Split(line, ",")
					if len(fields) >= 2 {
						name := strings.TrimSpace(fields[1])
						if name != "" && !strings.Contains(strings.ToLower(name), "bluetooth") {
							device := models.BluetoothDevice{
								Name:   name,
								Paired: true,
							}
							devices = append(devices, device)
						}
					}
				}
			}
		}

	default:
		// Linux: Use bluetoothctl
		out, err := exec.Command("bluetoothctl", "devices").Output()
		if err != nil {
			return devices
		}

		lines := strings.Split(string(out), "\n")
		for _, line := range lines {
			// Format: Device XX:XX:XX:XX:XX:XX Name
			if strings.HasPrefix(line, "Device") {
				parts := strings.Fields(line)
				if len(parts) >= 3 {
					device := models.BluetoothDevice{
						Address: parts[1],
						Name:    strings.Join(parts[2:], " "),
						Paired:  true,
					}

					// Check if connected
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
