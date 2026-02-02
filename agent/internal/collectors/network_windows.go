//go:build windows

package collectors

import (
	"log"
	"net"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/patchify/agent/internal/models"
)

// WindowsNetworkCollector collects network info on Windows
type WindowsNetworkCollector struct{}

// NewWindowsNetworkCollector creates a new network collector for Windows
func NewWindowsNetworkCollector() *WindowsNetworkCollector {
	return &WindowsNetworkCollector{}
}

// Name returns the collector name
func (c *WindowsNetworkCollector) Name() string {
	return "network"
}

// Collect gathers network information
func (c *WindowsNetworkCollector) Collect() (interface{}, error) {
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

func (c *WindowsNetworkCollector) collectNetworkIdentity() models.NetworkIdentity {
	identity := models.NetworkIdentity{}

	hostname, _ := exec.Command("hostname").Output()
	identity.Hostname = strings.TrimSpace(string(hostname))

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

	return identity
}

func (c *WindowsNetworkCollector) collectNetworkAdapters() []models.NetworkAdapter {
	var adapters []models.NetworkAdapter

	// Use Go's net package for cross-platform interface enumeration
	interfaces, err := net.Interfaces()
	if err != nil {
		log.Printf("[network] Failed to enumerate network interfaces: %v", err)
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

		// Get additional info from Windows commands
		c.enrichAdapterInfoWindows(&adapter)

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

func (c *WindowsNetworkCollector) enrichAdapterInfoWindows(adapter *models.NetworkAdapter) {
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

func (c *WindowsNetworkCollector) collectWiFiConnection() *models.WiFiConnection {
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
}

func (c *WindowsNetworkCollector) collectVPNConnections() []models.VPNConnection {
	var vpns []models.VPNConnection

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

	return vpns
}

func (c *WindowsNetworkCollector) getDefaultGateway() string {
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
	return ""
}

func (c *WindowsNetworkCollector) collectProxyConfiguration() *models.ProxyConfiguration {
	proxy := &models.ProxyConfiguration{}

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

	// Return nil if no proxy is configured
	if !proxy.Enabled && proxy.Server == "" && proxy.PACUrl == "" {
		return nil
	}

	return proxy
}
