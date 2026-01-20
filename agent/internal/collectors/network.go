package collectors

import (
	"net"
	"os"
	"os/exec"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/patchify/agent/internal/models"
)

// DarwinNetworkCollector collects network info on macOS
type DarwinNetworkCollector struct{}

// NewDarwinNetworkCollector creates a new network collector for macOS
func NewDarwinNetworkCollector() *DarwinNetworkCollector {
	return &DarwinNetworkCollector{}
}

// Name returns the collector name
func (c *DarwinNetworkCollector) Name() string {
	return "network"
}

// Collect gathers network information
func (c *DarwinNetworkCollector) Collect() (interface{}, error) {
	nw := &models.Network{
		CollectedAt: time.Now().UTC().Format(time.RFC3339),
	}

	// Collect network identity
	nw.Identity = c.collectNetworkIdentity()

	// Collect network adapters
	nw.Adapters = c.collectNetworkAdapters()

	// Collect WiFi connection
	if wifi := c.collectWiFiConnection(); wifi != nil {
		nw.WiFiConnection = wifi
	}

	// Collect VPN connections
	nw.VPNConnections = c.collectVPNConnections()

	// Collect proxy configuration
	if proxy := c.collectProxyConfiguration(); proxy != nil {
		nw.Proxy = proxy
	}

	return nw, nil
}

func (c *DarwinNetworkCollector) collectNetworkIdentity() models.NetworkIdentity {
	identity := models.NetworkIdentity{}

	hostname, _ := os.Hostname()
	identity.Hostname = hostname

	switch runtime.GOOS {
	case "darwin":
		// Get computer name
		if out, err := exec.Command("scutil", "--get", "ComputerName").Output(); err == nil {
			identity.Hostname = strings.TrimSpace(string(out))
		}

		// Get local hostname (Bonjour name)
		if out, err := exec.Command("scutil", "--get", "LocalHostName").Output(); err == nil {
			localHost := strings.TrimSpace(string(out))
			identity.FQDN = localHost + ".local"
		}

		// Check if domain joined (typically via Active Directory)
		if out, err := exec.Command("dsconfigad", "-show").Output(); err == nil {
			if strings.Contains(string(out), "Active Directory Domain") {
				lines := strings.Split(string(out), "\n")
				for _, line := range lines {
					if strings.Contains(line, "Active Directory Domain") {
						parts := strings.SplitN(line, "=", 2)
						if len(parts) == 2 {
							identity.DomainName = strings.TrimSpace(parts[1])
							identity.IsDomainJoined = true
						}
					}
				}
			}
		}

	case "windows":
		// Windows: Get computer name and domain info
		if out, err := exec.Command("wmic", "computersystem", "get", "name", "/value").Output(); err == nil {
			identity.Hostname = parseWmicValueNetwork(string(out), "Name")
		}
		if out, err := exec.Command("wmic", "computersystem", "get", "domain", "/value").Output(); err == nil {
			domain := parseWmicValueNetwork(string(out), "Domain")
			if domain != "" && domain != "WORKGROUP" {
				identity.DomainName = domain
				identity.IsDomainJoined = true
			}
		}
		if out, err := exec.Command("wmic", "computersystem", "get", "dnshostname", "/value").Output(); err == nil {
			dnsHostname := parseWmicValueNetwork(string(out), "DNSHostName")
			if identity.DomainName != "" {
				identity.FQDN = dnsHostname + "." + identity.DomainName
			}
		}

	default:
		// Linux
		if out, err := exec.Command("hostname", "-f").Output(); err == nil {
			identity.FQDN = strings.TrimSpace(string(out))
		}

		// Check domain membership
		if out, err := exec.Command("realm", "list").Output(); err == nil {
			if strings.Contains(string(out), "domain-name") {
				identity.IsDomainJoined = true
				lines := strings.Split(string(out), "\n")
				for _, line := range lines {
					if strings.Contains(line, "domain-name:") {
						parts := strings.SplitN(line, ":", 2)
						if len(parts) == 2 {
							identity.DomainName = strings.TrimSpace(parts[1])
						}
					}
				}
			}
		}
	}

	return identity
}

func (c *DarwinNetworkCollector) collectNetworkAdapters() []models.NetworkAdapter {
	var adapters []models.NetworkAdapter

	// Use Go's net package for cross-platform interface enumeration
	interfaces, err := net.Interfaces()
	if err != nil {
		return adapters
	}

	for _, iface := range interfaces {
		// Skip loopback
		if iface.Flags&net.FlagLoopback != 0 {
			continue
		}

		adapter := models.NetworkAdapter{
			Name:       iface.Name,
			MACAddress: iface.HardwareAddr.String(),
		}

		// Determine adapter type
		adapter.Type = determineAdapterType(iface.Name)

		// Determine status
		if iface.Flags&net.FlagUp != 0 {
			adapter.Status = "Up"
		} else {
			adapter.Status = "Down"
		}

		// Get IP configuration
		addrs, err := iface.Addrs()
		if err == nil && len(addrs) > 0 {
			ipConfig := &models.IPConfiguration{}
			for _, addr := range addrs {
				ipNet, ok := addr.(*net.IPNet)
				if !ok {
					continue
				}

				if ipNet.IP.To4() != nil {
					ipConfig.IPv4Address = ipNet.IP.String()
					ipConfig.IPv4Subnet = net.IP(ipNet.Mask).String()
				} else {
					ipConfig.IPv6Address = ipNet.IP.String()
				}
			}
			adapter.IPConfiguration = ipConfig
		}

		// Get additional info from system commands
		switch runtime.GOOS {
		case "darwin":
			c.enrichAdapterInfoDarwin(&adapter)
		case "windows":
			c.enrichAdapterInfoWindows(&adapter)
		default:
			c.enrichAdapterInfoLinux(&adapter)
		}

		adapters = append(adapters, adapter)
	}

	// Mark default adapter
	defaultGateway := c.getDefaultGateway()
	for i := range adapters {
		if adapters[i].IPConfiguration != nil {
			adapters[i].IPConfiguration.IPv4Gateway = defaultGateway
			if adapters[i].Status == "Up" && adapters[i].IPConfiguration.IPv4Address != "" {
				adapters[i].IsDefault = true
				break
			}
		}
	}

	return adapters
}

func (c *DarwinNetworkCollector) enrichAdapterInfoDarwin(adapter *models.NetworkAdapter) {
	// Get display name and speed using networksetup
	out, err := exec.Command("networksetup", "-listallhardwareports").Output()
	if err == nil {
		lines := strings.Split(string(out), "\n")
		for i, line := range lines {
			if strings.Contains(line, adapter.Name) && i > 0 {
				// Previous line contains the display name
				prevLine := lines[i-1]
				if strings.HasPrefix(prevLine, "Hardware Port:") {
					adapter.DisplayName = strings.TrimSpace(strings.TrimPrefix(prevLine, "Hardware Port:"))
				}
			}
		}
	}

	// Get DNS servers
	if out, err := exec.Command("scutil", "--dns").Output(); err == nil {
		lines := strings.Split(string(out), "\n")
		dnsServers := []string{}
		for _, line := range lines {
			if strings.Contains(line, "nameserver[") {
				parts := strings.Split(line, ":")
				if len(parts) == 2 {
					dns := strings.TrimSpace(parts[1])
					if dns != "" && !contains(dnsServers, dns) {
						dnsServers = append(dnsServers, dns)
					}
				}
			}
		}
		if adapter.IPConfiguration != nil && len(dnsServers) > 0 {
			adapter.IPConfiguration.DNSServers = dnsServers
		}
	}

	// Check DHCP
	if out, err := exec.Command("ipconfig", "getpacket", adapter.Name).Output(); err == nil {
		if strings.Contains(string(out), "server_identifier") {
			if adapter.IPConfiguration != nil {
				adapter.IPConfiguration.DHCPEnabled = true
				// Extract DHCP server
				re := regexp.MustCompile(`server_identifier.*?: (\d+\.\d+\.\d+\.\d+)`)
				if matches := re.FindStringSubmatch(string(out)); len(matches) > 1 {
					adapter.IPConfiguration.DHCPServer = matches[1]
				}
			}
		}
	}
}

func (c *DarwinNetworkCollector) enrichAdapterInfoLinux(adapter *models.NetworkAdapter) {
	// Get speed using ethtool
	if out, err := exec.Command("ethtool", adapter.Name).Output(); err == nil {
		lines := strings.Split(string(out), "\n")
		for _, line := range lines {
			if strings.Contains(line, "Speed:") {
				speedStr := strings.TrimSpace(strings.TrimPrefix(line, "Speed:"))
				speedStr = strings.TrimSuffix(speedStr, "Mb/s")
				speedStr = strings.TrimSuffix(speedStr, "Gb/s")
				if strings.HasSuffix(line, "Gb/s") {
					if speed, err := strconv.Atoi(speedStr); err == nil {
						adapter.SpeedMbps = speed * 1000
					}
				} else if speed, err := strconv.Atoi(speedStr); err == nil {
					adapter.SpeedMbps = speed
				}
			}
		}
	}

	// Get DNS from resolv.conf
	if data, err := os.ReadFile("/etc/resolv.conf"); err == nil {
		lines := strings.Split(string(data), "\n")
		dnsServers := []string{}
		for _, line := range lines {
			if strings.HasPrefix(line, "nameserver") {
				parts := strings.Fields(line)
				if len(parts) >= 2 {
					dnsServers = append(dnsServers, parts[1])
				}
			}
		}
		if adapter.IPConfiguration != nil && len(dnsServers) > 0 {
			adapter.IPConfiguration.DNSServers = dnsServers
		}
	}
}

func (c *DarwinNetworkCollector) enrichAdapterInfoWindows(adapter *models.NetworkAdapter) {
	// Use wmic to get network adapter details
	out, err := exec.Command("wmic", "nic", "where", "Name like '%"+adapter.Name+"%'", "get", "speed,netconnectionid", "/format:csv").Output()
	if err == nil {
		lines := strings.Split(string(out), "\n")
		for i, line := range lines {
			if i == 0 || strings.TrimSpace(line) == "" {
				continue
			}
			fields := strings.Split(line, ",")
			if len(fields) >= 3 {
				adapter.DisplayName = strings.TrimSpace(fields[1])
				if speed, err := strconv.ParseInt(strings.TrimSpace(fields[2]), 10, 64); err == nil && speed > 0 {
					adapter.SpeedMbps = int(speed / 1000000)
				}
			}
		}
	}

	// Get DNS servers using ipconfig
	if out, err := exec.Command("ipconfig", "/all").Output(); err == nil {
		lines := strings.Split(string(out), "\n")
		inAdapter := false
		dnsServers := []string{}

		for _, line := range lines {
			line = strings.TrimSpace(line)

			// Check if we're in the right adapter section
			if strings.Contains(line, adapter.Name) || (adapter.DisplayName != "" && strings.Contains(line, adapter.DisplayName)) {
				inAdapter = true
				continue
			}

			// New adapter section
			if inAdapter && strings.Contains(line, "adapter") && strings.HasSuffix(line, ":") {
				break
			}

			if inAdapter {
				if strings.HasPrefix(line, "DNS Servers") {
					parts := strings.SplitN(line, ":", 2)
					if len(parts) == 2 {
						dns := strings.TrimSpace(parts[1])
						if dns != "" {
							dnsServers = append(dnsServers, dns)
						}
					}
				} else if len(dnsServers) > 0 && !strings.Contains(line, ":") && line != "" {
					// Additional DNS servers are on continuation lines
					dnsServers = append(dnsServers, line)
				}
				if strings.HasPrefix(line, "DHCP Enabled") {
					if strings.Contains(line, "Yes") && adapter.IPConfiguration != nil {
						adapter.IPConfiguration.DHCPEnabled = true
					}
				}
				if strings.HasPrefix(line, "DHCP Server") {
					parts := strings.SplitN(line, ":", 2)
					if len(parts) == 2 && adapter.IPConfiguration != nil {
						adapter.IPConfiguration.DHCPServer = strings.TrimSpace(parts[1])
					}
				}
			}
		}

		if adapter.IPConfiguration != nil && len(dnsServers) > 0 {
			adapter.IPConfiguration.DNSServers = dnsServers
		}
	}
}

func (c *DarwinNetworkCollector) collectWiFiConnection() *models.WiFiConnection {
	switch runtime.GOOS {
	case "darwin":
		// macOS WiFi using airport command
		airportPath := "/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport"
		out, err := exec.Command(airportPath, "-I").Output()
		if err != nil {
			return nil
		}

		wifi := &models.WiFiConnection{}
		lines := strings.Split(string(out), "\n")

		for _, line := range lines {
			line = strings.TrimSpace(line)
			parts := strings.SplitN(line, ":", 2)
			if len(parts) != 2 {
				continue
			}

			key := strings.TrimSpace(parts[0])
			value := strings.TrimSpace(parts[1])

			switch key {
			case "SSID":
				wifi.SSID = value
			case "BSSID":
				wifi.BSSID = value
			case "agrCtlRSSI":
				if rssi, err := strconv.Atoi(value); err == nil {
					wifi.RSSI = rssi
					wifi.SignalStrength = rssiToPercent(rssi)
				}
			case "channel":
				chanStr := strings.Split(value, ",")[0]
				if ch, err := strconv.Atoi(chanStr); err == nil {
					wifi.Channel = ch
					if ch <= 14 {
						wifi.Band = "2.4GHz"
					} else if ch <= 177 {
						wifi.Band = "5GHz"
					} else {
						wifi.Band = "6GHz"
					}
				}
			case "link auth":
				wifi.SecurityType = value
			case "lastTxRate":
				if rate, err := strconv.Atoi(value); err == nil {
					wifi.TxRate = rate
				}
			case "maxRate":
				if rate, err := strconv.Atoi(value); err == nil {
					wifi.RxRate = rate
				}
			}
		}

		if wifi.SSID == "" {
			return nil
		}
		return wifi

	case "windows":
		// Windows WiFi using netsh
		out, err := exec.Command("netsh", "wlan", "show", "interfaces").Output()
		if err != nil {
			return nil
		}

		wifi := &models.WiFiConnection{}
		lines := strings.Split(string(out), "\n")

		for _, line := range lines {
			line = strings.TrimSpace(line)
			parts := strings.SplitN(line, ":", 2)
			if len(parts) != 2 {
				continue
			}

			key := strings.TrimSpace(parts[0])
			value := strings.TrimSpace(parts[1])

			switch key {
			case "SSID":
				wifi.SSID = value
			case "BSSID":
				wifi.BSSID = value
			case "Signal":
				// Format: "85%"
				signalStr := strings.TrimSuffix(value, "%")
				if signal, err := strconv.Atoi(signalStr); err == nil {
					wifi.SignalStrength = signal
					// Convert percentage to approximate dBm
					wifi.RSSI = -100 + (signal * 70 / 100)
				}
			case "Channel":
				if ch, err := strconv.Atoi(value); err == nil {
					wifi.Channel = ch
					if ch <= 14 {
						wifi.Band = "2.4GHz"
					} else if ch <= 177 {
						wifi.Band = "5GHz"
					} else {
						wifi.Band = "6GHz"
					}
				}
			case "Authentication":
				wifi.SecurityType = value
			case "Receive rate (Mbps)":
				if rate, err := strconv.ParseFloat(value, 64); err == nil {
					wifi.RxRate = int(rate)
				}
			case "Transmit rate (Mbps)":
				if rate, err := strconv.ParseFloat(value, 64); err == nil {
					wifi.TxRate = int(rate)
				}
			}
		}

		if wifi.SSID == "" {
			return nil
		}
		return wifi

	default:
		// Linux WiFi detection
		out, err := exec.Command("iwconfig").Output()
		if err != nil {
			return nil
		}

		wifi := &models.WiFiConnection{}
		lines := strings.Split(string(out), "\n")

		for _, line := range lines {
			if strings.Contains(line, "ESSID:") {
				re := regexp.MustCompile(`ESSID:"([^"]*)"`)
				if matches := re.FindStringSubmatch(line); len(matches) > 1 {
					wifi.SSID = matches[1]
				}
			}
			if strings.Contains(line, "Signal level") {
				re := regexp.MustCompile(`Signal level[=:](-?\d+)`)
				if matches := re.FindStringSubmatch(line); len(matches) > 1 {
					if rssi, err := strconv.Atoi(matches[1]); err == nil {
						wifi.RSSI = rssi
						wifi.SignalStrength = rssiToPercent(rssi)
					}
				}
			}
		}

		if wifi.SSID != "" {
			return wifi
		}
		return nil
	}
}

func (c *DarwinNetworkCollector) collectVPNConnections() []models.VPNConnection {
	var vpns []models.VPNConnection

	switch runtime.GOOS {
	case "darwin":
		// Check for VPN using scutil
		out, err := exec.Command("scutil", "--nc", "list").Output()
		if err == nil {
			lines := strings.Split(string(out), "\n")
			for _, line := range lines {
				if strings.Contains(line, "VPN") || strings.Contains(line, "IPSec") {
					vpn := models.VPNConnection{}

					re := regexp.MustCompile(`"([^"]+)"`)
					if matches := re.FindStringSubmatch(line); len(matches) > 1 {
						vpn.Name = matches[1]
					}

					if strings.Contains(line, "Connected") {
						vpn.Status = "Connected"
					} else {
						vpn.Status = "Disconnected"
					}

					if strings.Contains(line, "IKEv2") {
						vpn.Type = "IKEv2"
					} else if strings.Contains(line, "IPSec") {
						vpn.Type = "IPSec"
					} else if strings.Contains(line, "L2TP") {
						vpn.Type = "L2TP"
					}

					if vpn.Name != "" {
						vpns = append(vpns, vpn)
					}
				}
			}
		}

	case "windows":
		// Windows: Use rasdial to list VPN connections
		out, err := exec.Command("rasdial").Output()
		if err == nil {
			lines := strings.Split(string(out), "\n")
			for _, line := range lines {
				line = strings.TrimSpace(line)
				if line != "" && !strings.Contains(line, "No connections") && !strings.Contains(line, "Command completed") {
					vpn := models.VPNConnection{
						Name:   line,
						Status: "Connected",
					}
					vpns = append(vpns, vpn)
				}
			}
		}

		// Also check for VPN adapters via ipconfig
		if out, err := exec.Command("ipconfig", "/all").Output(); err == nil {
			lines := strings.Split(string(out), "\n")
			for _, line := range lines {
				// Look for VPN adapter types
				if strings.Contains(line, "PPP") || strings.Contains(line, "VPN") || strings.Contains(line, "Tunnel") {
					parts := strings.Split(line, "adapter")
					if len(parts) == 2 {
						name := strings.TrimSuffix(strings.TrimSpace(parts[1]), ":")
						// Check if we already have this
						found := false
						for _, existing := range vpns {
							if existing.Name == name {
								found = true
								break
							}
						}
						if !found && name != "" {
							vpn := models.VPNConnection{
								Name:   name,
								Status: "Active",
							}
							vpns = append(vpns, vpn)
						}
					}
				}
			}
		}

	default:
		// Linux: Check for common VPN interfaces
		interfaces, _ := net.Interfaces()
		for _, iface := range interfaces {
			if strings.HasPrefix(iface.Name, "tun") || strings.HasPrefix(iface.Name, "tap") ||
				strings.HasPrefix(iface.Name, "wg") {
				vpn := models.VPNConnection{
					Name: iface.Name,
				}
				if iface.Flags&net.FlagUp != 0 {
					vpn.Status = "Connected"
				} else {
					vpn.Status = "Disconnected"
				}
				if strings.HasPrefix(iface.Name, "wg") {
					vpn.Type = "WireGuard"
				} else {
					vpn.Type = "OpenVPN"
				}
				vpns = append(vpns, vpn)
			}
		}
	}

	return vpns
}

func (c *DarwinNetworkCollector) getDefaultGateway() string {
	switch runtime.GOOS {
	case "darwin":
		out, err := exec.Command("route", "-n", "get", "default").Output()
		if err == nil {
			lines := strings.Split(string(out), "\n")
			for _, line := range lines {
				if strings.Contains(line, "gateway:") {
					parts := strings.Split(line, ":")
					if len(parts) == 2 {
						return strings.TrimSpace(parts[1])
					}
				}
			}
		}

	case "windows":
		out, err := exec.Command("route", "print", "0.0.0.0").Output()
		if err == nil {
			lines := strings.Split(string(out), "\n")
			for _, line := range lines {
				fields := strings.Fields(line)
				// Look for default route: 0.0.0.0 0.0.0.0 gateway ...
				if len(fields) >= 4 && fields[0] == "0.0.0.0" && fields[1] == "0.0.0.0" {
					return fields[2]
				}
			}
		}
		// Alternative: use ipconfig
		if out, err := exec.Command("ipconfig").Output(); err == nil {
			lines := strings.Split(string(out), "\n")
			for _, line := range lines {
				if strings.Contains(line, "Default Gateway") {
					parts := strings.SplitN(line, ":", 2)
					if len(parts) == 2 {
						gw := strings.TrimSpace(parts[1])
						if gw != "" {
							return gw
						}
					}
				}
			}
		}

	default:
		// Linux
		out, err := exec.Command("ip", "route", "show", "default").Output()
		if err == nil {
			fields := strings.Fields(string(out))
			for i, field := range fields {
				if field == "via" && i+1 < len(fields) {
					return fields[i+1]
				}
			}
		}
	}
	return ""
}

func (c *DarwinNetworkCollector) collectProxyConfiguration() *models.ProxyConfiguration {
	proxy := &models.ProxyConfiguration{}

	switch runtime.GOOS {
	case "darwin":
		// macOS: Use networksetup to get proxy settings for active service
		// First, get the active network service
		activeService := ""
		if out, err := exec.Command("networksetup", "-listnetworkserviceorder").Output(); err == nil {
			lines := strings.Split(string(out), "\n")
			for i, line := range lines {
				// Look for the first enabled service (not preceded by *)
				if strings.Contains(line, "Hardware Port") && i > 0 {
					prevLine := lines[i-1]
					if !strings.HasPrefix(prevLine, "*") && strings.Contains(prevLine, ")") {
						// Extract service name: "(1) Wi-Fi" -> "Wi-Fi"
						parts := strings.SplitN(prevLine, ")", 2)
						if len(parts) == 2 {
							activeService = strings.TrimSpace(parts[1])
							break
						}
					}
				}
			}
		}

		if activeService == "" {
			activeService = "Wi-Fi" // Fallback
		}

		// Check HTTP proxy
		if out, err := exec.Command("networksetup", "-getwebproxy", activeService).Output(); err == nil {
			proxyInfo := parseNetworkSetupProxy(string(out))
			if proxyInfo["Enabled"] == "Yes" {
				proxy.Enabled = true
				proxy.Type = "HTTP"
				proxy.Server = proxyInfo["Server"]
				if port, err := strconv.Atoi(proxyInfo["Port"]); err == nil {
					proxy.Port = port
				}
				if proxyInfo["Authenticated Proxy Enabled"] == "1" {
					proxy.AuthRequired = true
					proxy.Username = proxyInfo["Username"]
				}
				proxy.Source = "Manual"
				proxy.SystemWide = true
			}
		}

		// Check HTTPS proxy (secure web proxy)
		if !proxy.Enabled {
			if out, err := exec.Command("networksetup", "-getsecurewebproxy", activeService).Output(); err == nil {
				proxyInfo := parseNetworkSetupProxy(string(out))
				if proxyInfo["Enabled"] == "Yes" {
					proxy.Enabled = true
					proxy.Type = "HTTPS"
					proxy.Server = proxyInfo["Server"]
					if port, err := strconv.Atoi(proxyInfo["Port"]); err == nil {
						proxy.Port = port
					}
					proxy.Source = "Manual"
					proxy.SystemWide = true
				}
			}
		}

		// Check SOCKS proxy
		if !proxy.Enabled {
			if out, err := exec.Command("networksetup", "-getsocksfirewallproxy", activeService).Output(); err == nil {
				proxyInfo := parseNetworkSetupProxy(string(out))
				if proxyInfo["Enabled"] == "Yes" {
					proxy.Enabled = true
					proxy.Type = "SOCKS5"
					proxy.Server = proxyInfo["Server"]
					if port, err := strconv.Atoi(proxyInfo["Port"]); err == nil {
						proxy.Port = port
					}
					proxy.Source = "Manual"
					proxy.SystemWide = true
				}
			}
		}

		// Check auto proxy (PAC)
		if out, err := exec.Command("networksetup", "-getautoproxyurl", activeService).Output(); err == nil {
			proxyInfo := parseNetworkSetupProxy(string(out))
			if proxyInfo["Enabled"] == "Yes" && proxyInfo["URL"] != "(null)" && proxyInfo["URL"] != "" {
				proxy.Enabled = true
				proxy.Type = "PAC"
				proxy.PACUrl = proxyInfo["URL"]
				proxy.Source = "PAC"
				proxy.SystemWide = true
			}
		}

		// Get bypass list
		if out, err := exec.Command("networksetup", "-getproxybypassdomains", activeService).Output(); err == nil {
			lines := strings.Split(strings.TrimSpace(string(out)), "\n")
			var bypassList []string
			for _, line := range lines {
				line = strings.TrimSpace(line)
				if line != "" && !strings.HasPrefix(line, "There aren't") {
					bypassList = append(bypassList, line)
				}
			}
			if len(bypassList) > 0 {
				proxy.BypassList = bypassList
			}
		}

	case "windows":
		// Windows: Use registry or netsh
		// Try PowerShell to get Internet Settings
		cmd := `Get-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings' | Select-Object ProxyEnable,ProxyServer,ProxyOverride,AutoConfigURL | ConvertTo-Json`
		if out, err := exec.Command("powershell", "-Command", cmd).Output(); err == nil {
			output := strings.TrimSpace(string(out))
			if output != "" && output != "{}" {
				// Parse JSON-like output (simple parsing since we know the structure)
				if strings.Contains(output, `"ProxyEnable":1`) || strings.Contains(output, `"ProxyEnable": 1`) {
					proxy.Enabled = true
					proxy.Source = "Manual"
					proxy.SystemWide = true

					// Extract ProxyServer
					re := regexp.MustCompile(`"ProxyServer"\s*:\s*"([^"]+)"`)
					if matches := re.FindStringSubmatch(output); len(matches) > 1 {
						serverPort := matches[1]
						// Format can be: server:port or http=server:port;https=server:port
						if strings.Contains(serverPort, "=") {
							// Multiple proxies per protocol
							parts := strings.Split(serverPort, ";")
							for _, part := range parts {
								if strings.HasPrefix(part, "http=") {
									serverPort = strings.TrimPrefix(part, "http=")
									proxy.Type = "HTTP"
									break
								}
							}
						}
						if strings.Contains(serverPort, ":") {
							parts := strings.SplitN(serverPort, ":", 2)
							proxy.Server = parts[0]
							if port, err := strconv.Atoi(parts[1]); err == nil {
								proxy.Port = port
							}
						} else {
							proxy.Server = serverPort
						}
						if proxy.Type == "" {
							proxy.Type = "HTTP"
						}
					}

					// Extract ProxyOverride (bypass list)
					re = regexp.MustCompile(`"ProxyOverride"\s*:\s*"([^"]+)"`)
					if matches := re.FindStringSubmatch(output); len(matches) > 1 {
						bypass := matches[1]
						proxy.BypassList = strings.Split(bypass, ";")
					}
				}

				// Check for PAC URL
				re := regexp.MustCompile(`"AutoConfigURL"\s*:\s*"([^"]+)"`)
				if matches := re.FindStringSubmatch(output); len(matches) > 1 {
					pacUrl := matches[1]
					if pacUrl != "" {
						proxy.Enabled = true
						proxy.Type = "PAC"
						proxy.PACUrl = pacUrl
						proxy.Source = "PAC"
						proxy.SystemWide = true
					}
				}
			}
		}

		// Alternative: Use netsh winhttp
		if !proxy.Enabled {
			if out, err := exec.Command("netsh", "winhttp", "show", "proxy").Output(); err == nil {
				output := string(out)
				if strings.Contains(output, "Proxy Server") && !strings.Contains(output, "Direct access") {
					proxy.Enabled = true
					proxy.SystemWide = true
					proxy.Source = "WinHTTP"

					re := regexp.MustCompile(`Proxy Server\(s\)\s*:\s*(\S+)`)
					if matches := re.FindStringSubmatch(output); len(matches) > 1 {
						serverPort := matches[1]
						if strings.Contains(serverPort, ":") {
							parts := strings.SplitN(serverPort, ":", 2)
							proxy.Server = parts[0]
							if port, err := strconv.Atoi(parts[1]); err == nil {
								proxy.Port = port
							}
						} else {
							proxy.Server = serverPort
						}
						proxy.Type = "HTTP"
					}

					re = regexp.MustCompile(`Bypass List\s*:\s*(\S+)`)
					if matches := re.FindStringSubmatch(output); len(matches) > 1 {
						bypass := matches[1]
						if bypass != "(none)" {
							proxy.BypassList = strings.Split(bypass, ";")
						}
					}
				}
			}
		}

	default:
		// Linux: Check environment variables and gsettings
		// Check HTTP_PROXY, HTTPS_PROXY, http_proxy, https_proxy
		envVars := []string{"HTTP_PROXY", "http_proxy", "HTTPS_PROXY", "https_proxy"}
		for _, envVar := range envVars {
			if proxyUrl := os.Getenv(envVar); proxyUrl != "" {
				proxy.Enabled = true
				proxy.Source = "EnvVar"
				proxy.SystemWide = false

				// Parse proxy URL: http://user:pass@server:port or server:port
				proxyUrl = strings.TrimPrefix(proxyUrl, "http://")
				proxyUrl = strings.TrimPrefix(proxyUrl, "https://")

				// Check for auth
				if strings.Contains(proxyUrl, "@") {
					parts := strings.SplitN(proxyUrl, "@", 2)
					authPart := parts[0]
					proxyUrl = parts[1]
					proxy.AuthRequired = true
					if strings.Contains(authPart, ":") {
						proxy.Username = strings.SplitN(authPart, ":", 2)[0]
					}
				}

				if strings.Contains(proxyUrl, ":") {
					parts := strings.SplitN(proxyUrl, ":", 2)
					proxy.Server = parts[0]
					// Remove any trailing path
					portStr := strings.Split(parts[1], "/")[0]
					if port, err := strconv.Atoi(portStr); err == nil {
						proxy.Port = port
					}
				} else {
					proxy.Server = proxyUrl
				}

				if strings.HasPrefix(envVar, "HTTPS") || strings.HasPrefix(envVar, "https") {
					proxy.Type = "HTTPS"
				} else {
					proxy.Type = "HTTP"
				}
				break
			}
		}

		// Check NO_PROXY for bypass list
		if noProxy := os.Getenv("NO_PROXY"); noProxy == "" {
			noProxy = os.Getenv("no_proxy")
		}
		if noProxy := os.Getenv("NO_PROXY"); noProxy != "" {
			proxy.BypassList = strings.Split(noProxy, ",")
		} else if noProxy := os.Getenv("no_proxy"); noProxy != "" {
			proxy.BypassList = strings.Split(noProxy, ",")
		}

		// Try gsettings for GNOME desktop
		if !proxy.Enabled {
			if out, err := exec.Command("gsettings", "get", "org.gnome.system.proxy", "mode").Output(); err == nil {
				mode := strings.Trim(strings.TrimSpace(string(out)), "'")
				if mode == "manual" {
					proxy.Enabled = true
					proxy.Source = "GNOME"
					proxy.SystemWide = true

					// Get HTTP proxy
					if out, err := exec.Command("gsettings", "get", "org.gnome.system.proxy.http", "host").Output(); err == nil {
						proxy.Server = strings.Trim(strings.TrimSpace(string(out)), "'")
						proxy.Type = "HTTP"
					}
					if out, err := exec.Command("gsettings", "get", "org.gnome.system.proxy.http", "port").Output(); err == nil {
						if port, err := strconv.Atoi(strings.TrimSpace(string(out))); err == nil {
							proxy.Port = port
						}
					}
				} else if mode == "auto" {
					// PAC URL
					if out, err := exec.Command("gsettings", "get", "org.gnome.system.proxy", "autoconfig-url").Output(); err == nil {
						pacUrl := strings.Trim(strings.TrimSpace(string(out)), "'")
						if pacUrl != "" {
							proxy.Enabled = true
							proxy.Type = "PAC"
							proxy.PACUrl = pacUrl
							proxy.Source = "GNOME"
							proxy.SystemWide = true
						}
					}
				}
			}
		}
	}

	// Return nil if no proxy is configured
	if !proxy.Enabled && proxy.Server == "" && proxy.PACUrl == "" {
		return nil
	}

	return proxy
}

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
