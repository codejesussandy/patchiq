//go:build windows

package collectors

import (
	"log"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/patchify/agent/internal/models"
)

// WindowsPeripheralCollector collects peripheral info on Windows
type WindowsPeripheralCollector struct{}

// NewWindowsPeripheralCollector creates a new peripheral collector for Windows
func NewWindowsPeripheralCollector() *WindowsPeripheralCollector {
	return &WindowsPeripheralCollector{}
}

// Name returns the collector name
func (c *WindowsPeripheralCollector) Name() string {
	return "peripherals"
}

// Collect gathers peripheral information
func (c *WindowsPeripheralCollector) Collect() (interface{}, error) {
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

func (c *WindowsPeripheralCollector) collectMonitors() []models.Monitor {
	var monitors []models.Monitor

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
				if len(fields) >= 6 {
					if h, err := strconv.Atoi(strings.TrimSpace(fields[5])); err == nil && h > 0 {
						monitor.HeightPx = h
					}
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
	} else {
		log.Printf("[peripheral] Failed to get monitor info: %v", err)
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

	return monitors
}

func (c *WindowsPeripheralCollector) collectUSBDevices() []models.USBDevice {
	var devices []models.USBDevice

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
	} else {
		log.Printf("[peripheral] Failed to get USB devices: %v", err)
	}

	return devices
}

func (c *WindowsPeripheralCollector) collectPrinters() []models.Printer {
	var printers []models.Printer

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

	return printers
}

func (c *WindowsPeripheralCollector) collectAudioDevices() []models.AudioDevice {
	var devices []models.AudioDevice

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

	return devices
}

func (c *WindowsPeripheralCollector) collectBluetoothDevices() []models.BluetoothDevice {
	var devices []models.BluetoothDevice

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

	return devices
}
