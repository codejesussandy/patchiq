package client

// RegisterRequest represents the registration payload sent to the backend
type RegisterRequest struct {
	MachineID    string `json:"machineId"`
	Hostname     string `json:"hostname"`
	OS           string `json:"os"`
	OSVersion    string `json:"osVersion"`
	OSBuild      string `json:"osBuild,omitempty"`
	Architecture string `json:"architecture"`
	AgentVersion string `json:"agentVersion"`
	SerialNumber string `json:"serialNumber,omitempty"`
	Manufacturer string `json:"manufacturer,omitempty"`
	Model        string `json:"model,omitempty"`
	IPAddress    string `json:"ipAddress,omitempty"`
	MACAddress   string `json:"macAddress,omitempty"`
	Timezone     string `json:"timezone,omitempty"`
	Locale       string `json:"locale,omitempty"`
}

// RegisterResponse represents the registration response from the backend
type RegisterResponse struct {
	AgentID          string      `json:"agentId"`
	AssetID          string      `json:"assetId"`
	AccessToken      string      `json:"accessToken"`
	RefreshToken     string      `json:"refreshToken"`
	TokenExpiresIn   int         `json:"tokenExpiresIn"`
	Config           AgentConfig `json:"config"`
	IsReRegistration bool        `json:"isReRegistration"`
	Message          string      `json:"message,omitempty"`
}

// AgentConfig represents configuration sent from the backend
type AgentConfig struct {
	HeartbeatIntervalSeconds int    `json:"heartbeatIntervalSeconds"`
	InventoryScheduleCron    string `json:"inventoryScheduleCron"`
	TelemetryIntervalSeconds int    `json:"telemetryIntervalSeconds"`
	TelemetryEnabled         bool   `json:"telemetryEnabled"`
	PatchScanScheduleCron    string `json:"patchScanScheduleCron"`
	LogLevel                 string `json:"logLevel"`
}

// HeartbeatRequest represents the heartbeat payload sent to the backend
type HeartbeatRequest struct {
	Timestamp     string  `json:"timestamp"`
	Status        string  `json:"status"` // healthy, degraded, error
	Uptime        int64   `json:"uptime"`
	AgentUptime   int64   `json:"agentUptime"`
	CPUUsage      float64 `json:"cpuUsage"`
	MemoryUsage   float64 `json:"memoryUsage"`
	DiskUsage     float64 `json:"diskUsage"`
	PendingReboot bool    `json:"pendingReboot"`
	IPAddress     string  `json:"ipAddress,omitempty"`
	LastError     *string `json:"lastError,omitempty"`
}

// HeartbeatResponse represents the heartbeat response from the backend
type HeartbeatResponse struct {
	Acknowledged       bool   `json:"acknowledged"`
	ServerTime         string `json:"serverTime"`
	CommandsPending    bool   `json:"commandsPending"`
	ConfigUpdated      bool   `json:"configUpdated"`
	InventoryRequested bool   `json:"inventoryRequested"`
}

// PendingCommand represents a command waiting to be executed
type PendingCommand struct {
	ID        string      `json:"id"`
	Type      string      `json:"type"`
	Payload   interface{} `json:"payload,omitempty"`
	CreatedAt string      `json:"createdAt"`
}

// CommandResultRequest represents the result of command execution
type CommandResultRequest struct {
	Status       string `json:"status"` // completed, failed
	Result       string `json:"result,omitempty"`
	ErrorMessage string `json:"errorMessage,omitempty"`
}

// InventoryRequest represents the inventory payload sent to the backend
type InventoryRequest struct {
	CollectedAt string      `json:"collectedAt"`
	Hardware    interface{} `json:"hardware,omitempty"`
	Software    interface{} `json:"software,omitempty"`
	Network     interface{} `json:"network,omitempty"`
	Security    interface{} `json:"security,omitempty"`
	Peripherals interface{} `json:"peripherals,omitempty"`
}

// TelemetryRequest represents the telemetry payload sent to the backend
type TelemetryRequest struct {
	CollectedAt      string      `json:"collectedAt"`
	CPU              interface{} `json:"cpu,omitempty"`
	Memory           interface{} `json:"memory,omitempty"`
	Disk             interface{} `json:"disk,omitempty"`
	Network          interface{} `json:"network,omitempty"`
	Processes        interface{} `json:"processes,omitempty"`
	SystemUptime     interface{} `json:"systemUptime,omitempty"`
	Thermal          interface{} `json:"thermal,omitempty"`
	Power            interface{} `json:"power,omitempty"`
	AgentUtilization interface{} `json:"agentUtilization,omitempty"`
	SystemErrors     interface{} `json:"systemErrors,omitempty"`
}

// ErrorResponse represents an error response from the backend
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
	Code    string `json:"code,omitempty"`
}

// TokenRefreshResponse represents the token refresh response
type TokenRefreshResponse struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
}

// ============================================
// Patch Repository (MinIO) Types
// ============================================

// PatchDownloadRequest represents a request to get download URLs for patches
type PatchDownloadRequest struct {
	AgentID  string   `json:"agentId"`
	PatchIDs []string `json:"patchIds"`
}

// PatchDownloadInfo represents download information for a single patch
type PatchDownloadInfo struct {
	PatchID      string `json:"patchId"`
	FileName     string `json:"fileName"`
	DownloadURL  string `json:"downloadUrl"`  // Presigned MinIO URL
	Checksum     string `json:"checksum"`     // SHA256 checksum
	ChecksumType string `json:"checksumType"` // "sha256"
	Size         int64  `json:"size"`         // File size in bytes
	ExpiresAt    string `json:"expiresAt"`    // URL expiration time
}

// PatchDownloadResponse represents the response containing download URLs
type PatchDownloadResponse struct {
	Success bool                `json:"success"`
	Data    []PatchDownloadInfo `json:"data"`
}

// PatchInstallCommand represents a patch installation command from the backend
type PatchInstallCommand struct {
	PatchID       string `json:"patchId"`
	DownloadURL   string `json:"downloadUrl,omitempty"`   // Direct URL if provided
	UseRepository bool   `json:"useRepository,omitempty"` // Use central MinIO repository
	Force         bool   `json:"force,omitempty"`
	AllowReboot   bool   `json:"allowReboot,omitempty"`
	Checksum      string `json:"checksum,omitempty"`
	ChecksumType  string `json:"checksumType,omitempty"`
}
