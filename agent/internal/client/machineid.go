package client

import (
	"crypto/sha256"
	"encoding/hex"
	"os"
	"os/exec"
	"runtime"
	"strings"
)

// GetMachineID returns a unique identifier for this machine
func GetMachineID() (string, error) {
	var id string
	var err error

	switch runtime.GOOS {
	case "darwin":
		id, err = getMacOSMachineID()
	case "linux":
		id, err = getLinuxMachineID()
	case "windows":
		id, err = getWindowsMachineID()
	default:
		id, err = getFallbackMachineID()
	}

	if err != nil || id == "" {
		id, err = getFallbackMachineID()
	}

	if err != nil {
		return "", err
	}

	// Hash the ID for privacy
	hash := sha256.Sum256([]byte(id))
	return hex.EncodeToString(hash[:16]), nil
}

func getMacOSMachineID() (string, error) {
	// Try IOPlatformUUID first
	cmd := exec.Command("ioreg", "-rd1", "-c", "IOPlatformExpertDevice")
	output, err := cmd.Output()
	if err == nil {
		lines := strings.Split(string(output), "\n")
		for _, line := range lines {
			if strings.Contains(line, "IOPlatformUUID") {
				parts := strings.Split(line, "=")
				if len(parts) == 2 {
					uuid := strings.TrimSpace(parts[1])
					uuid = strings.Trim(uuid, "\"")
					if uuid != "" {
						return uuid, nil
					}
				}
			}
		}
	}

	// Fallback to hardware UUID
	cmd = exec.Command("system_profiler", "SPHardwareDataType")
	output, err = cmd.Output()
	if err == nil {
		lines := strings.Split(string(output), "\n")
		for _, line := range lines {
			if strings.Contains(line, "Hardware UUID") {
				parts := strings.Split(line, ":")
				if len(parts) == 2 {
					return strings.TrimSpace(parts[1]), nil
				}
			}
		}
	}

	return "", err
}

func getLinuxMachineID() (string, error) {
	// Try /etc/machine-id first
	data, err := os.ReadFile("/etc/machine-id")
	if err == nil {
		id := strings.TrimSpace(string(data))
		if id != "" {
			return id, nil
		}
	}

	// Try /var/lib/dbus/machine-id
	data, err = os.ReadFile("/var/lib/dbus/machine-id")
	if err == nil {
		id := strings.TrimSpace(string(data))
		if id != "" {
			return id, nil
		}
	}

	// Try DMI product UUID
	data, err = os.ReadFile("/sys/class/dmi/id/product_uuid")
	if err == nil {
		id := strings.TrimSpace(string(data))
		if id != "" {
			return id, nil
		}
	}

	return "", err
}

func getWindowsMachineID() (string, error) {
	// Try getting the Machine GUID from registry
	cmd := exec.Command("reg", "query", `HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Cryptography`, "/v", "MachineGuid")
	output, err := cmd.Output()
	if err == nil {
		lines := strings.Split(string(output), "\n")
		for _, line := range lines {
			if strings.Contains(line, "MachineGuid") {
				fields := strings.Fields(line)
				if len(fields) >= 3 {
					return fields[len(fields)-1], nil
				}
			}
		}
	}

	// Try SMBIOS UUID via PowerShell Get-CimInstance (replaces deprecated wmic)
	cmd = exec.Command("powershell", "-NoProfile", "-Command", "(Get-CimInstance Win32_ComputerSystemProduct).UUID")
	output, err = cmd.Output()
	if err == nil {
		uuid := strings.TrimSpace(string(output))
		if uuid != "" && uuid != "UUID" {
			return uuid, nil
		}
	}

	return "", err
}

func getFallbackMachineID() (string, error) {
	hostname, err := os.Hostname()
	if err != nil {
		hostname = "unknown"
	}

	// Create a pseudo-ID from hostname and other system info
	info := hostname + "-" + runtime.GOOS + "-" + runtime.GOARCH

	// Try to add some unique system info
	if homeDir, err := os.UserHomeDir(); err == nil {
		info += "-" + homeDir
	}

	return info, nil
}
