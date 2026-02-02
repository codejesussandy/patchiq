package collectors

import (
	"strings"
)

// parseNetworkSetupProxy parses the output of networksetup proxy commands
func parseNetworkSetupProxy(output string) map[string]string {
	result := make(map[string]string)
	lines := strings.Split(output, "\n")
	for _, line := range lines {
		parts := strings.SplitN(line, ":", 2)
		if len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			value := strings.TrimSpace(parts[1])
			result[key] = value
		}
	}
	return result
}

// Helper functions

func determineAdapterType(name string) string {
	name = strings.ToLower(name)
	switch {
	case strings.HasPrefix(name, "en0"):
		return "WiFi"
	case strings.HasPrefix(name, "en") || strings.HasPrefix(name, "eth"):
		return "Ethernet"
	case strings.HasPrefix(name, "wl"):
		return "WiFi"
	case strings.HasPrefix(name, "bridge") || strings.HasPrefix(name, "br"):
		return "Virtual"
	case strings.HasPrefix(name, "tun") || strings.HasPrefix(name, "tap"):
		return "VPN"
	case strings.HasPrefix(name, "docker") || strings.HasPrefix(name, "veth"):
		return "Virtual"
	case strings.HasPrefix(name, "utun"):
		return "VPN"
	default:
		return "Unknown"
	}
}

func rssiToPercent(rssi int) int {
	// Convert RSSI (dBm) to percentage
	// -30 dBm = 100%, -90 dBm = 0%
	if rssi >= -30 {
		return 100
	}
	if rssi <= -90 {
		return 0
	}
	return (rssi + 90) * 100 / 60
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// parseWmicValueNetwork extracts the value from wmic /value output format (Key=Value)
func parseWmicValueNetwork(output, key string) string {
	lines := strings.Split(output, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, key+"=") {
			return strings.TrimSpace(strings.TrimPrefix(line, key+"="))
		}
	}
	return ""
}
