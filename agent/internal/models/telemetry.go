package models

// Telemetry represents real-time performance metrics
type Telemetry struct {
	Timestamp        string            `json:"timestamp"`
	AgentID          string            `json:"agentId,omitempty"`
	Interval         int               `json:"intervalSeconds,omitempty"`
	CPU              CPUTelemetry      `json:"cpu"`
	Memory           MemoryTelemetry   `json:"memory"`
	Disk             DiskTelemetry     `json:"disk"`
	Network          NetworkTelemetry  `json:"network,omitempty"`
	Processes        ProcessStats      `json:"processes,omitempty"`
	SystemErrors     SystemErrors      `json:"systemErrors,omitempty"`
	AgentUtilization *AgentUtilization `json:"agentUtilization,omitempty"`
	Thermal          *ThermalTelemetry `json:"thermal,omitempty"`
	Power            *PowerTelemetry   `json:"power,omitempty"`
	SystemUptime     *SystemUptime     `json:"systemUptime,omitempty"`
	Uptime           int64             `json:"uptime,omitempty"` // System uptime in seconds (for backend compatibility)
}

// SystemUptime represents system uptime information
type SystemUptime struct {
	UptimeSeconds int64  `json:"uptimeSeconds"`
	UptimeHuman   string `json:"uptimeHuman"`
	BootTime      string `json:"bootTime,omitempty"`
}

// ThermalTelemetry represents temperature readings from various sensors
type ThermalTelemetry struct {
	CPUTemperature  float64         `json:"cpuTemperature,omitempty"`  // Celsius
	GPUTemperature  float64         `json:"gpuTemperature,omitempty"`  // Celsius
	BatteryTemp     float64         `json:"batteryTemp,omitempty"`     // Celsius
	AmbientTemp     float64         `json:"ambientTemp,omitempty"`     // Celsius
	Sensors         []ThermalSensor `json:"sensors,omitempty"`
	Throttled       bool            `json:"throttled"`
	ThrottleReason  string          `json:"throttleReason,omitempty"` // Thermal, Power, VRM
}

// ThermalSensor represents a single temperature sensor
type ThermalSensor struct {
	Name         string  `json:"name"`
	Location     string  `json:"location,omitempty"` // CPU, GPU, SSD, Battery, Chassis, Ambient
	Temperature  float64 `json:"temperature"`        // Celsius
	CriticalTemp float64 `json:"criticalTemp,omitempty"`
	WarningTemp  float64 `json:"warningTemp,omitempty"`
	Status       string  `json:"status,omitempty"` // Normal, Warning, Critical
}

// PowerTelemetry represents power and battery metrics
type PowerTelemetry struct {
	ACConnected      bool             `json:"acConnected"`
	BatteryPresent   bool             `json:"batteryPresent"`
	BatteryCharging  bool             `json:"batteryCharging,omitempty"`
	BatteryPercent   float64          `json:"batteryPercent,omitempty"`
	BatteryHealth    float64          `json:"batteryHealth,omitempty"`    // Percent of design capacity
	TimeRemaining    int              `json:"timeRemaining,omitempty"`    // Minutes
	TimeToFull       int              `json:"timeToFull,omitempty"`       // Minutes if charging
	PowerDrawWatts   float64          `json:"powerDrawWatts,omitempty"`   // Current system power draw
	CPUPowerWatts    float64          `json:"cpuPowerWatts,omitempty"`
	GPUPowerWatts    float64          `json:"gpuPowerWatts,omitempty"`
	VoltageReadings  []VoltageReading `json:"voltageReadings,omitempty"`
	PowerSource      string           `json:"powerSource,omitempty"` // AC, Battery, UPS
}

// VoltageReading represents a voltage sensor reading
type VoltageReading struct {
	Name    string  `json:"name"`    // CPU Vcore, DRAM, +12V, +5V, +3.3V
	Voltage float64 `json:"voltage"` // Volts
	Min     float64 `json:"min,omitempty"`
	Max     float64 `json:"max,omitempty"`
	Status  string  `json:"status,omitempty"` // Normal, Warning, Critical
}

// AgentUtilization represents the agent's own resource consumption
type AgentUtilization struct {
	PID               int     `json:"pid"`
	CPUPercent        float64 `json:"cpuPercent"`
	MemoryBytes       int64   `json:"memoryBytes"`
	MemoryPercent     float64 `json:"memoryPercent"`
	MemoryHuman       string  `json:"memoryHuman,omitempty"`
	DiskUsageBytes    int64   `json:"diskUsageBytes,omitempty"`    // Agent data directory size
	DiskUsageHuman    string  `json:"diskUsageHuman,omitempty"`
	OpenFileHandles   int     `json:"openFileHandles,omitempty"`
	Goroutines        int     `json:"goroutines"`
	ThreadCount       int     `json:"threadCount,omitempty"`
	UptimeSeconds     int64   `json:"uptimeSeconds"`
	UptimeHuman       string  `json:"uptimeHuman,omitempty"`
	LastCollectionMs  int64   `json:"lastCollectionMs,omitempty"`  // Duration of last full collection
	CollectionErrors  int     `json:"collectionErrors24h,omitempty"`
	NetworkBytesSent  int64   `json:"networkBytesSent,omitempty"`  // Cumulative bytes sent
	NetworkBytesRecv  int64   `json:"networkBytesRecv,omitempty"`  // Cumulative bytes received
	Version           string  `json:"version"`
}

// CPUTelemetry represents CPU usage metrics
type CPUTelemetry struct {
	UsagePercent float64   `json:"usagePercent"`
	UserPercent  float64   `json:"userPercent,omitempty"`
	SystemPercent float64  `json:"systemPercent,omitempty"`
	IdlePercent  float64   `json:"idlePercent,omitempty"`
	PerCoreUsage []float64 `json:"perCoreUsage,omitempty"`
	LoadAverage  []float64 `json:"loadAverage,omitempty"` // 1, 5, 15 min
	Temperature  float64   `json:"temperature,omitempty"` // Celsius
	Throttled    bool      `json:"throttled,omitempty"`
}

// MemoryTelemetry represents memory usage metrics
type MemoryTelemetry struct {
	UsagePercent    float64 `json:"usagePercent"`
	UsedBytes       int64   `json:"usedBytes"`
	AvailableBytes  int64   `json:"availableBytes"`
	TotalBytes      int64   `json:"totalBytes"`
	UsedHuman       string  `json:"usedHuman,omitempty"`
	AvailableHuman  string  `json:"availableHuman,omitempty"`
	SwapUsagePercent float64 `json:"swapUsagePercent,omitempty"`
	SwapUsedBytes   int64   `json:"swapUsedBytes,omitempty"`
	SwapTotalBytes  int64   `json:"swapTotalBytes,omitempty"`
	PageFaultsPerSec int64  `json:"pageFaultsPerSec,omitempty"`
}

// DiskTelemetry represents disk I/O metrics
type DiskTelemetry struct {
	Drives []DriveTelemetry `json:"drives"`
}

// DriveTelemetry represents metrics for a single drive
type DriveTelemetry struct {
	Name             string  `json:"name"`
	MountPoint       string  `json:"mountPoint"`
	UsagePercent     float64 `json:"usagePercent"`
	UsedBytes        int64   `json:"usedBytes"`
	AvailableBytes   int64   `json:"availableBytes"`
	TotalBytes       int64   `json:"totalBytes"`
	UsedHuman        string  `json:"usedHuman,omitempty"`
	AvailableHuman   string  `json:"availableHuman,omitempty"`
	ReadBytesPerSec  int64   `json:"readBytesPerSec,omitempty"`
	WriteBytesPerSec int64   `json:"writeBytesPerSec,omitempty"`
	ReadOpsPerSec    int64   `json:"readOpsPerSec,omitempty"`
	WriteOpsPerSec   int64   `json:"writeOpsPerSec,omitempty"`
	LatencyMs        float64 `json:"latencyMs,omitempty"`
}

// NetworkTelemetry represents network I/O metrics
type NetworkTelemetry struct {
	BytesSentPerSec     int64   `json:"bytesSentPerSec"`
	BytesReceivedPerSec int64   `json:"bytesReceivedPerSec"`
	PacketsSentPerSec   int64   `json:"packetsSentPerSec,omitempty"`
	PacketsReceivedPerSec int64 `json:"packetsReceivedPerSec,omitempty"`
	ErrorsIn            int64   `json:"errorsIn,omitempty"`
	ErrorsOut           int64   `json:"errorsOut,omitempty"`
	LatencyMs           float64 `json:"latencyMs,omitempty"`
	Adapters            []AdapterTelemetry `json:"adapters,omitempty"`
}

// AdapterTelemetry represents metrics for a single network adapter
type AdapterTelemetry struct {
	Name            string `json:"name"`
	BytesSent       int64  `json:"bytesSent"`
	BytesReceived   int64  `json:"bytesReceived"`
	PacketsSent     int64  `json:"packetsSent"`
	PacketsReceived int64  `json:"packetsReceived"`
}

// ProcessStats represents process statistics
type ProcessStats struct {
	TotalCount   int           `json:"totalCount"`
	RunningCount int           `json:"runningCount"`
	SleepingCount int          `json:"sleepingCount,omitempty"`
	TopByCPU     []ProcessInfo `json:"topByCPU,omitempty"`
	TopByMemory  []ProcessInfo `json:"topByMemory,omitempty"`
}

// ProcessInfo represents a single process
type ProcessInfo struct {
	PID           int     `json:"pid"`
	Name          string  `json:"name"`
	CPUPercent    float64 `json:"cpuPercent"`
	MemoryPercent float64 `json:"memoryPercent"`
	MemoryBytes   int64   `json:"memoryBytes,omitempty"`
	Status        string  `json:"status,omitempty"`
	User          string  `json:"user,omitempty"`
}

// SystemErrors represents system error metrics
type SystemErrors struct {
	ApplicationCrashCount24h int          `json:"applicationCrashCount24h"`
	BSODCount30d             int          `json:"bsodCount30d,omitempty"` // Windows
	KernelPanicCount30d      int          `json:"kernelPanicCount30d,omitempty"` // macOS/Linux
	LastCrash                *CrashInfo   `json:"lastCrash,omitempty"`
}

// CrashInfo represents information about a crash
type CrashInfo struct {
	Timestamp   string `json:"timestamp"`
	Application string `json:"application"`
	ErrorCode   string `json:"errorCode,omitempty"`
	Description string `json:"description,omitempty"`
}
