package models

// PowerManagement represents system power settings and policies
type PowerManagement struct {
	CollectedAt     string           `json:"collectedAt"`
	PowerPlan       PowerPlan        `json:"powerPlan"`
	SleepSettings   SleepSettings    `json:"sleepSettings"`
	BatteryPolicies *BatteryPolicies `json:"batteryPolicies,omitempty"`
	WakeSettings    WakeSettings     `json:"wakeSettings"`
	PowerEvents     []PowerEvent     `json:"powerEvents,omitempty"` // Recent events
}

// PowerPlan represents the active power plan/profile
type PowerPlan struct {
	Name        string `json:"name"`                  // Balanced, High Performance, Power Saver, Custom
	GUID        string `json:"guid,omitempty"`        // Windows power plan GUID
	Description string `json:"description,omitempty"`
	IsActive    bool   `json:"isActive"`
	Source      string `json:"source,omitempty"` // System, GPO, User
}

// SleepSettings represents sleep/hibernate configuration
type SleepSettings struct {
	SleepEnabled       bool `json:"sleepEnabled"`
	HibernateEnabled   bool `json:"hibernateEnabled"`
	HybridSleepEnabled bool `json:"hybridSleepEnabled,omitempty"` // Windows

	// Timeouts in minutes (0 = never)
	SleepTimeoutAC      int `json:"sleepTimeoutAC,omitempty"`      // On AC power
	SleepTimeoutBattery int `json:"sleepTimeoutBattery,omitempty"` // On battery
	HibernateTimeout    int `json:"hibernateTimeout,omitempty"`
	DisplayOffAC        int `json:"displayOffAC,omitempty"`
	DisplayOffBattery   int `json:"displayOffBattery,omitempty"`

	// macOS specific
	StandbyEnabled bool `json:"standbyEnabled,omitempty"` // Deep sleep
	PowerNap       bool `json:"powerNap,omitempty"`       // Wake for network/updates

	// Linux specific
	SuspendMode string `json:"suspendMode,omitempty"` // s2idle, deep, disk
}

// WakeSettings represents wake-on events configuration
type WakeSettings struct {
	WakeOnLAN       bool `json:"wakeOnLAN"`
	WakeOnRing      bool `json:"wakeOnRing,omitempty"`      // Modem
	WakeOnUSB       bool `json:"wakeOnUSB,omitempty"`       // USB devices
	WakeOnBluetooth bool `json:"wakeOnBluetooth,omitempty"` // Bluetooth devices
	WakeTimers      bool `json:"wakeTimers"`                // Scheduled tasks
	WakeOnTouch     bool `json:"wakeOnTouch,omitempty"`     // Touchpad/keyboard
	LidOpenWake     bool `json:"lidOpenWake,omitempty"`     // Laptops
}

// BatteryPolicies represents battery-specific power policies
type BatteryPolicies struct {
	LowBatteryLevel     int    `json:"lowBatteryLevel"`           // Percent
	LowBatteryAction    string `json:"lowBatteryAction"`          // Nothing, Sleep, Hibernate, Shutdown
	CriticalLevel       int    `json:"criticalLevel"`             // Percent
	CriticalAction      string `json:"criticalAction"`            // Nothing, Sleep, Hibernate, Shutdown
	ReserveLevel        int    `json:"reserveLevel,omitempty"`    // Windows reserve level
	OptimizedCharging   bool   `json:"optimizedCharging"`         // macOS/modern laptops
	ChargingLimit       int    `json:"chargingLimit,omitempty"`   // Max charge percent (if supported)
	BatterySaver        bool   `json:"batterySaver"`              // Battery saver mode active
	BatterySaverLevel   int    `json:"batterySaverLevel,omitempty"` // Threshold to enable battery saver
}

// PowerEvent represents a power-related event
type PowerEvent struct {
	Timestamp string `json:"timestamp"`
	Type      string `json:"type"`             // Sleep, Wake, Hibernate, Shutdown, Reboot, LidClose, LidOpen
	Source    string `json:"source,omitempty"` // UserInitiated, Idle, LowBattery, Scheduled, LidClose, Button
	Duration  int    `json:"duration,omitempty"` // Duration in seconds (for sleep events)
}
