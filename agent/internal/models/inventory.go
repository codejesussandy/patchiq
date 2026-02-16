package models

// FullInventory represents complete inventory data
type FullInventory struct {
	CollectedAt          string            `json:"collectedAt"`
	AgentID              string            `json:"agentId"`
	AgentVersion         string            `json:"agentVersion"`
	CollectionDurationMs int64             `json:"collectionDurationMs"`
	Hardware             *Hardware         `json:"hardware,omitempty"`
	Software             *Software         `json:"software,omitempty"`
	Network              *Network          `json:"network,omitempty"`
	Security             *Security         `json:"security,omitempty"`
	Peripherals          *Peripherals      `json:"peripherals,omitempty"`
	PowerManagement      *PowerManagement  `json:"powerManagement,omitempty"`
	Errors               []CollectionError `json:"errors,omitempty"`
}

// CollectionError represents an error during data collection
type CollectionError struct {
	Category string `json:"category"`
	Error    string `json:"error"`
	Code     string `json:"code,omitempty"`
}

// AgentInfo represents agent metadata
type AgentInfo struct {
	ID          string   `json:"id"`
	MachineID   string   `json:"machineId"`
	Name        string   `json:"name"`
	Hostname    string   `json:"hostname"`
	OS          string   `json:"os"`
	OSVersion   string   `json:"osVersion"`
	Version     string   `json:"version"`
	Status      string   `json:"status"`
	StartedAt   string   `json:"startedAt"`
	UptimeHuman string   `json:"uptimeHuman"`
	IPAddress   string   `json:"ipAddress,omitempty"`
	Tags        []string `json:"tags,omitempty"`
}

// CollectionStatus represents the status of data collection
type CollectionStatus struct {
	Category      string `json:"category"`
	LastCollected string `json:"lastCollected,omitempty"`
	Status        string `json:"status"` // idle, collecting, completed, error
	Duration      int64  `json:"durationMs,omitempty"`
	Error         string `json:"error,omitempty"`
}

// DashboardData represents data for the agent dashboard UI
type DashboardData struct {
	Agent       AgentInfo          `json:"agent"`
	Collections []CollectionStatus `json:"collections"`
	Hardware    *Hardware          `json:"hardware,omitempty"`
	Software    *Software          `json:"software,omitempty"`
	Network     *Network           `json:"network,omitempty"`
	Security    *Security          `json:"security,omitempty"`
	Peripherals *Peripherals       `json:"peripherals,omitempty"`
	Telemetry   *Telemetry         `json:"telemetry,omitempty"`
	LastUpdated string             `json:"lastUpdated"`
}
