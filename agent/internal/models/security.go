package models

// Security represents all security compliance data
type Security struct {
	CollectedAt string           `json:"collectedAt"`
	Encryption  EncryptionStatus `json:"encryption"`
	Firewall    FirewallStatus   `json:"firewall"`
	Antivirus   AntivirusStatus  `json:"antivirus"`
	LocalUsers  []LocalUser      `json:"localUsers,omitempty"`
	Compliance  ComplianceStatus `json:"compliance"`
	PatchStatus PatchStatus      `json:"patchStatus,omitempty"`
}

// EncryptionStatus represents disk encryption status
type EncryptionStatus struct {
	DriveEncryptionEnabled bool              `json:"driveEncryptionEnabled"`
	EncryptionType         string            `json:"encryptionType"` // BitLocker, FileVault, LUKS, None
	SystemDriveEncrypted   bool              `json:"systemDriveEncrypted"`
	Drives                 []DriveEncryption `json:"drives,omitempty"`
}

// DriveEncryption represents encryption status for a specific drive
type DriveEncryption struct {
	DriveName            string  `json:"driveName"`
	IsEncrypted          bool    `json:"isEncrypted"`
	EncryptionMethod     string  `json:"encryptionMethod,omitempty"`
	EncryptionPercentage float64 `json:"encryptionPercentage"`
	ProtectionStatus     string  `json:"protectionStatus,omitempty"`
}

// FirewallStatus represents firewall configuration
type FirewallStatus struct {
	Enabled       bool              `json:"enabled"`
	ProductName   string            `json:"productName,omitempty"`
	Profiles      []FirewallProfile `json:"profiles,omitempty"`
	ActiveProfile string            `json:"activeProfile,omitempty"`
	StealthMode   bool              `json:"stealthMode,omitempty"`
}

// FirewallProfile represents a firewall profile (Windows)
type FirewallProfile struct {
	Name    string `json:"name"` // Domain, Private, Public
	Enabled bool   `json:"enabled"`
}

// AntivirusStatus represents antivirus configuration
type AntivirusStatus struct {
	Installed bool               `json:"installed"`
	Products  []AntivirusProduct `json:"products"`
}

// AntivirusProduct represents an installed antivirus product
type AntivirusProduct struct {
	Name               string `json:"name"`
	Vendor             string `json:"vendor,omitempty"`
	Enabled            bool   `json:"enabled"`
	IsDefault          bool   `json:"isDefault,omitempty"`
	RealTimeProtection bool   `json:"realTimeProtection"`
	DefinitionVersion  string `json:"definitionVersion,omitempty"`
	DefinitionDate     string `json:"definitionDate,omitempty"`
	LastUpdate         string `json:"lastUpdate,omitempty"`
	LastScanDate       string `json:"lastScanDate,omitempty"`
	LastScanType       string `json:"lastScanType,omitempty"`
}

// LocalUser represents a local user account
type LocalUser struct {
	Username        string   `json:"username"`
	FullName        string   `json:"fullName,omitempty"`
	IsAdmin         bool     `json:"isAdmin"`
	IsEnabled       bool     `json:"isEnabled"`
	PasswordLastSet string   `json:"passwordLastSet,omitempty"`
	PasswordAge     int      `json:"passwordAge,omitempty"` // days
	LastLogon       string   `json:"lastLogon,omitempty"`
	Groups          []string `json:"groups,omitempty"`
}

// ComplianceStatus represents security compliance settings
type ComplianceStatus struct {
	SecureBootEnabled  bool `json:"secureBootEnabled"`
	UACEnabled         bool `json:"uacEnabled,omitempty"`         // Windows
	BitLockerEnabled   bool `json:"bitLockerEnabled,omitempty"`   // Windows
	SmartScreenEnabled bool `json:"smartScreenEnabled,omitempty"` // Windows
	SIPEnabled         bool `json:"sipEnabled,omitempty"`         // macOS System Integrity Protection
	GatekeeperEnabled  bool `json:"gatekeeperEnabled,omitempty"`  // macOS
	FileVaultEnabled   bool `json:"fileVaultEnabled,omitempty"`   // macOS
	ScreenLockEnabled  bool `json:"screenLockEnabled"`
	ScreenLockTimeout  int  `json:"screenLockTimeout,omitempty"` // seconds
	AutoLoginDisabled  bool `json:"autoLoginDisabled"`
	RemoteLoginEnabled bool `json:"remoteLoginEnabled,omitempty"`
}

// PatchStatus represents patch compliance status
type PatchStatus struct {
	LastScanDate     string         `json:"lastScanDate,omitempty"`
	TotalUpdates     int            `json:"totalUpdates"`
	InstalledUpdates int            `json:"installedUpdates"`
	PendingUpdates   int            `json:"pendingUpdates"`
	CriticalMissing  int            `json:"criticalMissing"`
	SecurityMissing  int            `json:"securityMissing"`
	MissingPatches   []MissingPatch `json:"missingPatches,omitempty"`
}

// MissingPatch represents a missing system update
type MissingPatch struct {
	ID             string `json:"id"`
	Title          string `json:"title"`
	Severity       string `json:"severity"` // Critical, Important, Moderate, Low
	Category       string `json:"category,omitempty"`
	ReleaseDate    string `json:"releaseDate,omitempty"`
	SizeBytes      int64  `json:"sizeBytes,omitempty"`
	RebootRequired bool   `json:"rebootRequired"`
}
