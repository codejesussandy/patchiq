package models

// Peripherals represents all connected peripheral devices
type Peripherals struct {
	CollectedAt      string            `json:"collectedAt"`
	Monitors         []Monitor         `json:"monitors"`
	USBDevices       []USBDevice       `json:"usbDevices"`
	Printers         []Printer         `json:"printers,omitempty"`
	AudioDevices     []AudioDevice     `json:"audioDevices,omitempty"`
	BluetoothDevices []BluetoothDevice `json:"bluetoothDevices,omitempty"`
	DockingStations  []DockingStation  `json:"dockingStations,omitempty"`
}

// Monitor represents a connected display
type Monitor struct {
	Name           string `json:"name"`
	Manufacturer   string `json:"manufacturer,omitempty"`
	Model          string `json:"model,omitempty"`
	SerialNumber   string `json:"serialNumber,omitempty"`
	Resolution     string `json:"resolution"` // e.g., "2560x1440"
	RefreshRate    int    `json:"refreshRate,omitempty"`
	WidthPx        int    `json:"widthPx"`
	HeightPx       int    `json:"heightPx"`
	ScaleFactor    float64 `json:"scaleFactor,omitempty"`
	ConnectionType string `json:"connectionType,omitempty"` // HDMI, DisplayPort, USB-C, Thunderbolt
	IsPrimary      bool   `json:"isPrimary"`
	IsBuiltIn      bool   `json:"isBuiltIn"`
}

// USBDevice represents a connected USB device
type USBDevice struct {
	Name         string `json:"name"`
	Manufacturer string `json:"manufacturer,omitempty"`
	ProductID    string `json:"productId"`
	VendorID     string `json:"vendorId"`
	DeviceClass  string `json:"deviceClass,omitempty"`
	DeviceType   string `json:"deviceType,omitempty"` // Keyboard, Mouse, Storage, Hub, etc.
	SerialNumber string `json:"serialNumber,omitempty"`
	Speed        string `json:"speed,omitempty"` // USB 2.0, USB 3.0, etc.
	BusNumber    int    `json:"busNumber,omitempty"`
	DeviceNumber int    `json:"deviceNumber,omitempty"`
}

// Printer represents a connected printer
type Printer struct {
	Name           string   `json:"name"`
	Driver         string   `json:"driver,omitempty"`
	PortName       string   `json:"portName,omitempty"`
	ConnectionType string   `json:"connectionType"` // USB, Network, WiFi, Bluetooth
	Status         string   `json:"status"` // Ready, Offline, Error
	IsDefault      bool     `json:"isDefault"`
	IsShared       bool     `json:"isShared,omitempty"`
	Capabilities   []string `json:"capabilities,omitempty"` // Color, Duplex, etc.
}

// AudioDevice represents an audio input/output device
type AudioDevice struct {
	Name         string `json:"name"`
	Manufacturer string `json:"manufacturer,omitempty"`
	Type         string `json:"type"` // Input, Output, Both
	IsDefault    bool   `json:"isDefault"`
	IsBuiltIn    bool   `json:"isBuiltIn"`
	SampleRate   int    `json:"sampleRate,omitempty"`
	Channels     int    `json:"channels,omitempty"`
}

// BluetoothDevice represents a connected Bluetooth device
type BluetoothDevice struct {
	Name          string `json:"name"`
	Address       string `json:"address,omitempty"`
	Type          string `json:"type,omitempty"` // Keyboard, Mouse, Headphones, etc.
	Connected     bool   `json:"connected"`
	Paired        bool   `json:"paired"`
	BatteryLevel  int    `json:"batteryLevel,omitempty"` // 0-100
}

// DockingStation represents a connected docking station
type DockingStation struct {
	Name              string   `json:"name"`
	Manufacturer      string   `json:"manufacturer,omitempty"`
	Model             string   `json:"model,omitempty"`
	FirmwareVersion   string   `json:"firmwareVersion,omitempty"`
	SerialNumber      string   `json:"serialNumber,omitempty"`
	PowerDeliveryWatts int     `json:"powerDeliveryWatts,omitempty"`
	AvailablePorts    []string `json:"availablePorts,omitempty"` // USB-A, USB-C, HDMI, etc.
}
