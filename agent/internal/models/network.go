package models

// Network represents all network configuration data
type Network struct {
	CollectedAt    string              `json:"collectedAt"`
	Identity       NetworkIdentity     `json:"identity"`
	Adapters       []NetworkAdapter    `json:"adapters"`
	WiFiConnection *WiFiConnection     `json:"wifiConnection,omitempty"`
	VPNConnections []VPNConnection     `json:"vpnConnections,omitempty"`
	Proxy          *ProxyConfiguration `json:"proxy,omitempty"`
}

// ProxyConfiguration represents system proxy settings
type ProxyConfiguration struct {
	Enabled      bool     `json:"enabled"`
	Type         string   `json:"type,omitempty"`   // HTTP, HTTPS, SOCKS4, SOCKS5, PAC, Auto
	Server       string   `json:"server,omitempty"`
	Port         int      `json:"port,omitempty"`
	PACUrl       string   `json:"pacUrl,omitempty"`       // Proxy Auto-Config URL
	BypassList   []string `json:"bypassList,omitempty"`   // Hosts that bypass proxy
	AuthRequired bool     `json:"authRequired,omitempty"`
	Username     string   `json:"username,omitempty"`     // If auth required (no password stored)
	SystemWide   bool     `json:"systemWide"`             // System-wide vs per-app
	Source       string   `json:"source,omitempty"`       // Manual, DHCP, GPO, EnvVar, WPAD
}

// NetworkIdentity represents network identity information
type NetworkIdentity struct {
	Hostname       string `json:"hostname"`
	FQDN           string `json:"fqdn,omitempty"`
	DomainName     string `json:"domainName,omitempty"`
	Workgroup      string `json:"workgroup,omitempty"`
	IsDomainJoined bool   `json:"isDomainJoined"`
}

// NetworkAdapter represents a network interface
type NetworkAdapter struct {
	Name            string          `json:"name"`
	DisplayName     string          `json:"displayName,omitempty"`
	Type            string          `json:"type"` // Ethernet, WiFi, Virtual, VPN, Loopback
	MACAddress      string          `json:"macAddress"`
	Status          string          `json:"status"` // Up, Down, Disconnected
	SpeedMbps       int             `json:"speedMbps,omitempty"`
	IsDefault       bool            `json:"isDefault"`
	IPConfiguration *IPConfiguration `json:"ipConfiguration,omitempty"`
}

// IPConfiguration represents IP settings for an adapter
type IPConfiguration struct {
	IPv4Address string   `json:"ipv4Address,omitempty"`
	IPv4Subnet  string   `json:"ipv4Subnet,omitempty"`
	IPv4Gateway string   `json:"ipv4Gateway,omitempty"`
	IPv6Address string   `json:"ipv6Address,omitempty"`
	DHCPEnabled bool     `json:"dhcpEnabled"`
	DHCPServer  string   `json:"dhcpServer,omitempty"`
	DNSServers  []string `json:"dnsServers,omitempty"`
	DNSSuffix   string   `json:"dnsSuffix,omitempty"`
}

// WiFiConnection represents current WiFi connection
type WiFiConnection struct {
	SSID           string `json:"ssid"`
	BSSID          string `json:"bssid,omitempty"`
	SignalStrength int    `json:"signalStrength"` // 0-100
	RSSI           int    `json:"rssi,omitempty"` // dBm
	SecurityType   string `json:"securityType"` // WPA2, WPA3, Open, etc.
	Channel        int    `json:"channel,omitempty"`
	Band           string `json:"band,omitempty"` // 2.4GHz, 5GHz, 6GHz
	Protocol       string `json:"protocol,omitempty"` // 802.11ac, 802.11ax
	TxRate         int    `json:"txRate,omitempty"` // Mbps
	RxRate         int    `json:"rxRate,omitempty"` // Mbps
}

// VPNConnection represents a VPN connection
type VPNConnection struct {
	Name      string `json:"name"`
	Type      string `json:"type,omitempty"` // IKEv2, L2TP, OpenVPN, etc.
	Status    string `json:"status"` // Connected, Disconnected
	ServerIP  string `json:"serverIp,omitempty"`
}
