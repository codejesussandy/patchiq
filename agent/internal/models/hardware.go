package models

// Hardware represents all hardware inventory data
type Hardware struct {
	CollectedAt      string           `json:"collectedAt"`
	SystemIdentity   SystemIdentity   `json:"systemIdentity"`
	BIOS             BIOS             `json:"bios"`
	Processor        Processor        `json:"processor"`
	Memory           Memory           `json:"memory"`
	StorageDrives    []StorageDrive   `json:"storageDrives"`
	Battery          *Battery         `json:"battery,omitempty"`
	GraphicsAdapters []GraphicsAdapter `json:"graphicsAdapters"`
}

// SystemIdentity represents hardware identity information
type SystemIdentity struct {
	Manufacturer string `json:"manufacturer"`
	Model        string `json:"model"`
	SerialNumber string `json:"serialNumber"`
	UUID         string `json:"uuid"`
	AssetTag     string `json:"assetTag,omitempty"`
}

// BIOS represents BIOS/UEFI information
type BIOS struct {
	Vendor            string `json:"vendor"`
	Version           string `json:"version"`
	ReleaseDate       string `json:"releaseDate,omitempty"`
	FirmwareType      string `json:"firmwareType"` // BIOS or UEFI
	SecureBootEnabled bool   `json:"secureBootEnabled"`
	TPMVersion        string `json:"tpmVersion,omitempty"`
}

// Processor represents CPU information
type Processor struct {
	Name          string  `json:"name"`
	Manufacturer  string  `json:"manufacturer"`
	Architecture  string  `json:"architecture"` // x64, arm64, etc.
	CoreCount     int     `json:"coreCount"`
	ThreadCount   int     `json:"threadCount"`
	ClockSpeedMHz int     `json:"clockSpeedMHz"`
	MaxSpeedMHz   int     `json:"maxSpeedMHz,omitempty"`
	L2CacheKB     int     `json:"l2CacheKB,omitempty"`
	L3CacheKB     int     `json:"l3CacheKB,omitempty"`
}

// Memory represents RAM information
type Memory struct {
	TotalPhysicalGB float64        `json:"totalPhysicalGB"`
	TotalSlots      int            `json:"totalSlots,omitempty"`
	UsedSlots       int            `json:"usedSlots,omitempty"`
	MaxCapacityGB   float64        `json:"maxCapacityGB,omitempty"`
	Modules         []MemoryModule `json:"modules,omitempty"`
}

// MemoryModule represents a single RAM module
type MemoryModule struct {
	Slot         string  `json:"slot"`
	Manufacturer string  `json:"manufacturer"`
	PartNumber   string  `json:"partNumber,omitempty"`
	SerialNumber string  `json:"serialNumber,omitempty"`
	CapacityGB   float64 `json:"capacityGB"`
	Type         string  `json:"type"` // DDR4, DDR5, etc.
	SpeedMHz     int     `json:"speedMHz"`
}

// StorageDrive represents a storage device
type StorageDrive struct {
	Name        string       `json:"name"`
	DeviceID    string       `json:"deviceId"`
	Type        string       `json:"type"` // HDD, SSD, NVMe
	MediaType   string       `json:"mediaType,omitempty"`
	Interface   string       `json:"interface,omitempty"` // SATA, NVMe, USB
	CapacityGB  float64      `json:"capacityGB"`
	FreeSpaceGB float64      `json:"freeSpaceGB"`
	FileSystem  string       `json:"fileSystem,omitempty"`
	MountPoint  string       `json:"mountPoint,omitempty"`
	SmartStatus *SmartStatus `json:"smartStatus,omitempty"`
}

// SmartStatus represents SMART health status
type SmartStatus struct {
	Healthy           bool `json:"healthy"`
	Status            string `json:"status"` // OK, Warning, Critical
	Temperature       int    `json:"temperature,omitempty"`
	PowerOnHours      int    `json:"powerOnHours,omitempty"`
	WearLevelingCount int    `json:"wearLevelingCount,omitempty"`
}

// Battery represents battery information (laptops)
type Battery struct {
	Present        bool    `json:"present"`
	HealthPercent  float64 `json:"healthPercent"`
	CycleCount     int     `json:"cycleCount"`
	ChargeLevel    float64 `json:"chargeLevel"`
	ChargingStatus string  `json:"chargingStatus"` // Charging, Discharging, Full, NotCharging
	DesignCapacity int     `json:"designCapacity,omitempty"`
	CurrentCapacity int    `json:"currentCapacity,omitempty"`
}

// GraphicsAdapter represents GPU information
type GraphicsAdapter struct {
	Name         string `json:"name"`
	Manufacturer string `json:"manufacturer"`
	DriverVersion string `json:"driverVersion,omitempty"`
	MemoryMB     int    `json:"memoryMB,omitempty"`
	Resolution   string `json:"resolution,omitempty"`
}
