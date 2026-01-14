// Network Configuration Types
// Based on contracts/schemas/network.schema.json

// Network Identity Types
export type DomainRole =
  | 'StandaloneWorkstation'
  | 'MemberWorkstation'
  | 'StandaloneServer'
  | 'MemberServer'
  | 'BackupDomainController'
  | 'PrimaryDomainController';

export type NetworkIdentity = {
  hostname: string;
  fqdn?: string;
  domainName?: string;
  workgroup?: string;
  isDomainJoined?: boolean;
  domainRole?: DomainRole;
};

// IP Configuration Types
export type IPConfiguration = {
  ipv4Address?: string;
  ipv4SubnetMask?: string;
  ipv4Gateway?: string;
  ipv6Address?: string;
  ipv6PrefixLength?: number;
  ipv6Gateway?: string;
  dhcpEnabled?: boolean;
  dhcpServer?: string;
  dhcpLeaseObtained?: string;
  dhcpLeaseExpires?: string;
  dnsServers?: string[];
  dnsSuffix?: string;
  winsServers?: string[];
};

// Network Adapter Types
export type NetworkAdapterType =
  | 'Ethernet'
  | 'WiFi'
  | 'Virtual'
  | 'Loopback'
  | 'Bluetooth'
  | 'VPN'
  | 'Bridge'
  | 'Unknown';

export type NetworkAdapterStatus = 'Up' | 'Down' | 'Disconnected' | 'Unknown';

export type NetworkAdapterExpanded = {
  id?: string;
  name: string;
  description?: string;
  type: NetworkAdapterType;
  macAddress: string;
  status?: NetworkAdapterStatus;
  speedMbps?: number;
  mtu?: number;
  ipConfiguration?: IPConfiguration;
  driverVersion?: string;
  driverDate?: string;
  manufacturer?: string;
  isPhysical?: boolean;
  isEnabled?: boolean;
};

// WiFi Types
export type WiFiBand = '2.4GHz' | '5GHz' | '6GHz';
export type WiFiSecurityType =
  | 'Open'
  | 'WEP'
  | 'WPA'
  | 'WPA2'
  | 'WPA3'
  | 'WPA2-Enterprise'
  | 'WPA3-Enterprise'
  | 'Unknown';
export type WiFiAuthenticationType = 'Open' | 'PSK' | 'EAP' | 'SAE' | 'Unknown';
export type WiFiEncryptionType = 'None' | 'WEP' | 'TKIP' | 'CCMP' | 'GCMP' | 'Unknown';
export type WiFiProtocol =
  | '802.11a'
  | '802.11b'
  | '802.11g'
  | '802.11n'
  | '802.11ac'
  | '802.11ax'
  | '802.11be';

export type WiFiConnection = {
  ssid?: string;
  bssid?: string;
  signalStrength?: number;
  rssi?: number;
  noiseLevel?: number;
  channel?: number;
  frequency?: number;
  band?: WiFiBand;
  securityType?: WiFiSecurityType;
  authentication?: WiFiAuthenticationType;
  encryption?: WiFiEncryptionType;
  linkSpeed?: string;
  protocol?: WiFiProtocol;
  profileName?: string;
};

// Complete Network Configuration Type
export type NetworkConfiguration = {
  collectedAt: string;
  identity: NetworkIdentity;
  adapters: NetworkAdapterExpanded[];
  primaryAdapter?: string;
  wifiConnection?: WiFiConnection;
  publicIpAddress?: string;
  vpnConnected?: boolean;
  vpnName?: string;
  proxyConfigured?: boolean;
  proxyServer?: string;
  proxyPort?: number;
};

// Export aliases for backward compatibility
export type {
  NetworkAdapterExpanded as ExtendedNetworkAdapter,
  IPConfiguration as NetworkIPConfiguration,
  WiFiConnection as NetworkWiFiConnection,
  NetworkIdentity as NetworkHostIdentity,
};
