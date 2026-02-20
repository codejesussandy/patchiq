// Package integration provides a mock PatchIQ backend server for integration testing.
// The mock server replicates the exact JSON request/response formats of the real backend,
// including envelope wrapping, header validation, and endpoint-specific behaviors.
package integration

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"time"
)

// ---------- Request/Response types matching real backend ----------

// SuccessEnvelope wraps responses in { "success": true, "data": ... }
// Used by: POST /register, POST /commands/:id/result, POST /inventory,
//          POST /telemetry, POST /logs, POST /v1/patch-repository/patches/agent-downloads
type SuccessEnvelope struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data"`
}

// RegisterRequest matches agent/internal/client/types.go RegisterRequest
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

// RegisterResponseData matches the backend's registration response
type RegisterResponseData struct {
	AgentID          string      `json:"agentId"`
	AssetID          string      `json:"assetId"`
	AccessToken      string      `json:"accessToken"`
	RefreshToken     string      `json:"refreshToken"`
	TokenExpiresIn   int         `json:"tokenExpiresIn"`
	IsReRegistration bool        `json:"isReRegistration"`
	Status           string      `json:"status"`
	Message          string      `json:"message"`
	Config           AgentConfig `json:"config"`
}

// AgentConfig matches the backend config shape
type AgentConfig struct {
	HeartbeatIntervalSeconds int    `json:"heartbeatIntervalSeconds"`
	InventoryScheduleCron    string `json:"inventoryScheduleCron"`
	TelemetryIntervalSeconds int    `json:"telemetryIntervalSeconds"`
	TelemetryEnabled         bool   `json:"telemetryEnabled"`
	PatchScanScheduleCron    string `json:"patchScanScheduleCron"`
	LogLevel                 string `json:"logLevel"`
	LatestAgentVersion       string `json:"latestAgentVersion,omitempty"`
	AgentDownloadURL         string `json:"agentDownloadUrl,omitempty"`
}

// HeartbeatRequest matches agent heartbeat payload
type HeartbeatRequest struct {
	Timestamp     string   `json:"timestamp"`
	Status        string   `json:"status"`
	Uptime        int64    `json:"uptime"`
	AgentUptime   int64    `json:"agentUptime"`
	CPUUsage      float64  `json:"cpuUsage"`
	MemoryUsage   float64  `json:"memoryUsage"`
	DiskUsage     float64  `json:"diskUsage"`
	PendingReboot bool     `json:"pendingReboot"`
	IPAddress     string   `json:"ipAddress,omitempty"`
	LastError     *string  `json:"lastError,omitempty"`
}

// HeartbeatResponseData matches the backend heartbeat response
// NOTE: The Go agent client parses this directly (no envelope unwrap)
type HeartbeatResponseData struct {
	Acknowledged       bool   `json:"acknowledged"`
	ServerTime         string `json:"serverTime"`
	CommandsPending    bool   `json:"commandsPending"`
	ConfigUpdated      bool   `json:"configUpdated"`
	InventoryRequested bool   `json:"inventoryRequested"`
}

// PendingCommand matches the backend command format
// NOTE: GET /commands returns a raw array, NOT wrapped in envelope
type PendingCommand struct {
	ID        string      `json:"id"`
	Type      string      `json:"type"`
	Payload   interface{} `json:"payload,omitempty"`
	CreatedAt string      `json:"createdAt"`
}

// CommandResultRequest matches what the agent sends to report results
type CommandResultRequest struct {
	Status       string `json:"status"`
	Result       string `json:"result,omitempty"`
	ErrorMessage string `json:"errorMessage,omitempty"`
	Output       string `json:"output,omitempty"`
}

// TokenRefreshResponseData matches the token refresh response
// NOTE: The Go agent client parses this directly (no envelope unwrap)
type TokenRefreshResponseData struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
}

// PatchDownloadInfo matches backend patch download response items
type PatchDownloadInfo struct {
	PatchID      string `json:"patchId"`
	FileName     string `json:"fileName"`
	DownloadURL  string `json:"downloadUrl"`
	Checksum     string `json:"checksum"`
	ChecksumType string `json:"checksumType"`
	Size         int64  `json:"size"`
	ExpiresAt    string `json:"expiresAt"`
}

// LogUploadRequest matches the agent's log upload payload
type LogUploadRequest struct {
	Logs         string `json:"logs"`
	AgentVersion string `json:"agentVersion"`
	OS           string `json:"os"`
	Architecture string `json:"architecture"`
	Hostname     string `json:"hostname"`
	Timestamp    string `json:"timestamp"`
}

// ---------- Mock backend state ----------

// AgentRecord represents a registered agent in the mock backend
type AgentRecord struct {
	AgentID      string
	AssetID      string
	AccessToken  string
	RefreshToken string
	MachineID    string
	Hostname     string
	OS           string
	AgentVersion string
	RegisteredAt time.Time
}

// CallRecord records a request received by the mock backend
type CallRecord struct {
	Method    string
	Path      string
	Headers   http.Header
	Body      json.RawMessage
	Timestamp time.Time
}

// MockBackend is a fully-featured mock PatchIQ backend server.
// It tracks state (registered agents, commands, results) and validates
// request formats identically to the real backend.
type MockBackend struct {
	Server *httptest.Server
	URL    string

	mu sync.RWMutex

	// State
	agents          map[string]*AgentRecord // keyed by agentID
	agentsByMachine map[string]string       // machineID -> agentID
	pendingCommands []PendingCommand        // commands waiting to be fetched
	commandResults  map[string]*CommandResultRequest
	inventories     []json.RawMessage
	telemetries     []json.RawMessage
	logUploads      []LogUploadRequest
	calls           []CallRecord

	// Configurable behavior
	nextAgentID       string // Override auto-generated agent ID
	nextAssetID       string
	config            AgentConfig
	commandsPending   bool // Whether heartbeat should signal commands pending
	inventoryRequested bool
	configUpdated     bool
	rejectAuth        bool   // Return 401 for all authenticated requests
	serverError       bool   // Return 500 for all requests
	tokenExpiresIn    int    // Token lifetime in seconds
	registrationCount int    // Number of times registration was called

	// Update binary serving
	updateBinaryData     []byte  // Binary data to serve for agent update downloads
	updateBinaryChecksum string  // Pre-computed SHA256 of the binary

	// Patch download serving
	patchFiles map[string][]byte // patchID -> file content
}

// NewMockBackend creates a new mock backend with sensible defaults
func NewMockBackend() *MockBackend {
	mb := &MockBackend{
		agents:          make(map[string]*AgentRecord),
		agentsByMachine: make(map[string]string),
		commandResults:  make(map[string]*CommandResultRequest),
		config: AgentConfig{
			HeartbeatIntervalSeconds: 60,
			InventoryScheduleCron:    "0 */6 * * *",
			TelemetryIntervalSeconds: 60,
			TelemetryEnabled:         true,
			PatchScanScheduleCron:    "0 2 * * *",
			LogLevel:                 "info",
		},
		tokenExpiresIn: 3600,
		patchFiles:     make(map[string][]byte),
	}

	mux := http.NewServeMux()

	// Agent API endpoints
	mux.HandleFunc("/api/agent/register", mb.handleRegister)
	mux.HandleFunc("/api/agent/heartbeat", mb.handleHeartbeat)
	mux.HandleFunc("/api/agent/commands", mb.handleCommands)
	mux.HandleFunc("/api/agent/inventory", mb.handleInventory)
	mux.HandleFunc("/api/agent/telemetry", mb.handleTelemetry)
	mux.HandleFunc("/api/agent/config", mb.handleConfig)
	mux.HandleFunc("/api/agent/token/refresh", mb.handleTokenRefresh)
	mux.HandleFunc("/api/agent/logs", mb.handleLogs)

	// Command result endpoint (pattern: /api/agent/commands/{id}/result)
	mux.HandleFunc("/api/agent/commands/", mb.handleCommandsSubpath)

	// Patch repository endpoint
	mux.HandleFunc("/v1/patch-repository/patches/agent-downloads", mb.handlePatchDownloads)

	// Update binary download endpoint
	mux.HandleFunc("/api/agent/update/binary/", mb.handleUpdateBinary)

	// Patch file download (simulates presigned MinIO URLs)
	mux.HandleFunc("/patches/", mb.handlePatchFileDownload)

	mb.Server = httptest.NewServer(mux)
	mb.URL = mb.Server.URL

	return mb
}

// Close shuts down the mock server
func (mb *MockBackend) Close() {
	mb.Server.Close()
}

// ---------- State inspection methods ----------

// GetCalls returns all recorded API calls
func (mb *MockBackend) GetCalls() []CallRecord {
	mb.mu.RLock()
	defer mb.mu.RUnlock()
	result := make([]CallRecord, len(mb.calls))
	copy(result, mb.calls)
	return result
}

// GetCallsByPath returns calls matching the given path prefix
func (mb *MockBackend) GetCallsByPath(pathPrefix string) []CallRecord {
	mb.mu.RLock()
	defer mb.mu.RUnlock()
	var result []CallRecord
	for _, c := range mb.calls {
		if strings.HasPrefix(c.Path, pathPrefix) {
			result = append(result, c)
		}
	}
	return result
}

// GetCommandResults returns all reported command results
func (mb *MockBackend) GetCommandResults() map[string]*CommandResultRequest {
	mb.mu.RLock()
	defer mb.mu.RUnlock()
	result := make(map[string]*CommandResultRequest)
	for k, v := range mb.commandResults {
		result[k] = v
	}
	return result
}

// GetCommandResult returns the result for a specific command
func (mb *MockBackend) GetCommandResult(cmdID string) *CommandResultRequest {
	mb.mu.RLock()
	defer mb.mu.RUnlock()
	return mb.commandResults[cmdID]
}

// GetInventories returns all submitted inventories
func (mb *MockBackend) GetInventories() []json.RawMessage {
	mb.mu.RLock()
	defer mb.mu.RUnlock()
	result := make([]json.RawMessage, len(mb.inventories))
	copy(result, mb.inventories)
	return result
}

// GetTelemetries returns all submitted telemetry payloads
func (mb *MockBackend) GetTelemetries() []json.RawMessage {
	mb.mu.RLock()
	defer mb.mu.RUnlock()
	result := make([]json.RawMessage, len(mb.telemetries))
	copy(result, mb.telemetries)
	return result
}

// GetLogUploads returns all uploaded logs
func (mb *MockBackend) GetLogUploads() []LogUploadRequest {
	mb.mu.RLock()
	defer mb.mu.RUnlock()
	result := make([]LogUploadRequest, len(mb.logUploads))
	copy(result, mb.logUploads)
	return result
}

// GetRegistrationCount returns number of registrations
func (mb *MockBackend) GetRegistrationCount() int {
	mb.mu.RLock()
	defer mb.mu.RUnlock()
	return mb.registrationCount
}

// GetAgent returns a registered agent by ID
func (mb *MockBackend) GetAgent(agentID string) *AgentRecord {
	mb.mu.RLock()
	defer mb.mu.RUnlock()
	return mb.agents[agentID]
}

// ---------- Configuration methods ----------

// SetCommandsPending controls whether heartbeat response signals pending commands
func (mb *MockBackend) SetCommandsPending(pending bool) {
	mb.mu.Lock()
	defer mb.mu.Unlock()
	mb.commandsPending = pending
}

// SetInventoryRequested controls whether heartbeat response requests inventory
func (mb *MockBackend) SetInventoryRequested(requested bool) {
	mb.mu.Lock()
	defer mb.mu.Unlock()
	mb.inventoryRequested = requested
}

// SetConfigUpdated controls whether heartbeat response signals config update
func (mb *MockBackend) SetConfigUpdated(updated bool) {
	mb.mu.Lock()
	defer mb.mu.Unlock()
	mb.configUpdated = updated
}

// SetRejectAuth makes all authenticated endpoints return 401
func (mb *MockBackend) SetRejectAuth(reject bool) {
	mb.mu.Lock()
	defer mb.mu.Unlock()
	mb.rejectAuth = reject
}

// SetServerError makes all endpoints return 500
func (mb *MockBackend) SetServerError(fail bool) {
	mb.mu.Lock()
	defer mb.mu.Unlock()
	mb.serverError = fail
}

// SetConfig sets the agent config returned by /config and in registration
func (mb *MockBackend) SetConfig(cfg AgentConfig) {
	mb.mu.Lock()
	defer mb.mu.Unlock()
	mb.config = cfg
}

// SetTokenExpiresIn sets the token lifetime returned in registration
func (mb *MockBackend) SetTokenExpiresIn(seconds int) {
	mb.mu.Lock()
	defer mb.mu.Unlock()
	mb.tokenExpiresIn = seconds
}

// EnqueueCommand adds a command to the pending queue
func (mb *MockBackend) EnqueueCommand(cmd PendingCommand) {
	mb.mu.Lock()
	defer mb.mu.Unlock()
	if cmd.CreatedAt == "" {
		cmd.CreatedAt = time.Now().UTC().Format(time.RFC3339)
	}
	mb.pendingCommands = append(mb.pendingCommands, cmd)
	mb.commandsPending = true
}

// EnqueueCommands adds multiple commands at once
func (mb *MockBackend) EnqueueCommands(cmds []PendingCommand) {
	for _, cmd := range cmds {
		mb.EnqueueCommand(cmd)
	}
}

// SetUpdateBinary sets the binary data to serve for agent update downloads
func (mb *MockBackend) SetUpdateBinary(data []byte) {
	mb.mu.Lock()
	defer mb.mu.Unlock()
	mb.updateBinaryData = data
	checksum := sha256.Sum256(data)
	mb.updateBinaryChecksum = fmt.Sprintf("%x", checksum)
}

// GetUpdateBinaryChecksum returns the SHA256 of the currently set update binary
func (mb *MockBackend) GetUpdateBinaryChecksum() string {
	mb.mu.RLock()
	defer mb.mu.RUnlock()
	return mb.updateBinaryChecksum
}

// SetPatchFile sets a downloadable patch file
func (mb *MockBackend) SetPatchFile(patchID string, data []byte) {
	mb.mu.Lock()
	defer mb.mu.Unlock()
	mb.patchFiles[patchID] = data
}

// SetNextAgentID overrides the auto-generated agent ID for the next registration
func (mb *MockBackend) SetNextAgentID(id string) {
	mb.mu.Lock()
	defer mb.mu.Unlock()
	mb.nextAgentID = id
}

// ResetCalls clears all recorded calls
func (mb *MockBackend) ResetCalls() {
	mb.mu.Lock()
	defer mb.mu.Unlock()
	mb.calls = nil
}

// ResetState clears all state (agents, commands, results, etc.)
func (mb *MockBackend) ResetState() {
	mb.mu.Lock()
	defer mb.mu.Unlock()
	mb.agents = make(map[string]*AgentRecord)
	mb.agentsByMachine = make(map[string]string)
	mb.pendingCommands = nil
	mb.commandResults = make(map[string]*CommandResultRequest)
	mb.inventories = nil
	mb.telemetries = nil
	mb.logUploads = nil
	mb.calls = nil
	mb.commandsPending = false
	mb.inventoryRequested = false
	mb.configUpdated = false
	mb.rejectAuth = false
	mb.serverError = false
	mb.registrationCount = 0
}

// ---------- Internal helpers ----------

func (mb *MockBackend) recordCall(r *http.Request) {
	body, _ := io.ReadAll(r.Body)
	// Reset the body so handlers can read it
	r.Body = io.NopCloser(strings.NewReader(string(body)))

	mb.mu.Lock()
	defer mb.mu.Unlock()
	mb.calls = append(mb.calls, CallRecord{
		Method:    r.Method,
		Path:      r.URL.Path,
		Headers:   r.Header.Clone(),
		Body:      json.RawMessage(body),
		Timestamp: time.Now(),
	})
}

func (mb *MockBackend) checkAuth(w http.ResponseWriter, r *http.Request) bool {
	mb.mu.RLock()
	reject := mb.rejectAuth
	mb.mu.RUnlock()

	if reject {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error":   "Unauthorized",
			"message": "Invalid or expired token",
			"code":    "AUTH_FAILED",
		})
		return false
	}

	agentID := r.Header.Get("X-Agent-Id")
	authHeader := r.Header.Get("Authorization")

	if agentID == "" || authHeader == "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error":   "Unauthorized",
			"message": "Missing agent credentials",
		})
		return false
	}

	// Validate token format
	if !strings.HasPrefix(authHeader, "Bearer ") {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error":   "Unauthorized",
			"message": "Invalid authorization header format",
		})
		return false
	}

	// Validate agent exists
	mb.mu.RLock()
	_, exists := mb.agents[agentID]
	mb.mu.RUnlock()

	if !exists {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error":   "Forbidden",
			"message": "Agent not registered",
			"code":    "AGENT_NOT_FOUND",
		})
		return false
	}

	return true
}

func (mb *MockBackend) checkServerError(w http.ResponseWriter) bool {
	mb.mu.RLock()
	fail := mb.serverError
	mb.mu.RUnlock()

	if fail {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error":   "Internal Server Error",
			"message": "Service unavailable",
		})
		return true
	}
	return false
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeEnvelope(w http.ResponseWriter, status int, data interface{}) {
	writeJSON(w, status, SuccessEnvelope{Success: true, Data: data})
}

// ---------- Handler implementations ----------

func (mb *MockBackend) handleRegister(w http.ResponseWriter, r *http.Request) {
	mb.recordCall(r)
	if mb.checkServerError(w) {
		return
	}

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error":   "Bad Request",
			"message": "Invalid JSON: " + err.Error(),
		})
		return
	}

	// Validate required fields (matching backend validators)
	if req.MachineID == "" || req.Hostname == "" || req.OS == "" || req.Architecture == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error":   "Validation Error",
			"message": "machineId, hostname, os, and architecture are required",
		})
		return
	}

	// Validate OS enum
	validOS := map[string]bool{"WINDOWS": true, "MACOS": true, "LINUX": true}
	if !validOS[req.OS] {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error":   "Validation Error",
			"message": "os must be one of: WINDOWS, MACOS, LINUX",
		})
		return
	}

	mb.mu.Lock()
	defer mb.mu.Unlock()

	mb.registrationCount++

	// Check for re-registration
	isReReg := false
	agentID := mb.nextAgentID
	if agentID == "" {
		agentID = fmt.Sprintf("agent-%s", req.MachineID[:8])
	}
	mb.nextAgentID = ""

	assetID := mb.nextAssetID
	if assetID == "" {
		assetID = fmt.Sprintf("asset-%s", req.MachineID[:8])
	}
	mb.nextAssetID = ""

	if existingID, ok := mb.agentsByMachine[req.MachineID]; ok {
		agentID = existingID
		isReReg = true
	}

	accessToken := fmt.Sprintf("access-token-%s-%d", agentID, time.Now().UnixNano())
	refreshToken := fmt.Sprintf("refresh-token-%s-%d", agentID, time.Now().UnixNano())

	agent := &AgentRecord{
		AgentID:      agentID,
		AssetID:      assetID,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		MachineID:    req.MachineID,
		Hostname:     req.Hostname,
		OS:           req.OS,
		AgentVersion: req.AgentVersion,
		RegisteredAt: time.Now(),
	}

	mb.agents[agentID] = agent
	mb.agentsByMachine[req.MachineID] = agentID

	status := http.StatusCreated
	msg := "Agent registered successfully"
	if isReReg {
		status = http.StatusOK
		msg = "Agent re-registered successfully"
	}

	resp := RegisterResponseData{
		AgentID:          agentID,
		AssetID:          assetID,
		AccessToken:      accessToken,
		RefreshToken:     refreshToken,
		TokenExpiresIn:   mb.tokenExpiresIn,
		IsReRegistration: isReReg,
		Status:           "CONNECTED",
		Message:          msg,
		Config:           mb.config,
	}

	writeEnvelope(w, status, resp)
}

func (mb *MockBackend) handleHeartbeat(w http.ResponseWriter, r *http.Request) {
	mb.recordCall(r)
	if mb.checkServerError(w) {
		return
	}

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	if !mb.checkAuth(w, r) {
		return
	}

	var req HeartbeatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error":   "Bad Request",
			"message": "Invalid JSON: " + err.Error(),
		})
		return
	}

	mb.mu.RLock()
	cmdsPending := mb.commandsPending
	invRequested := mb.inventoryRequested
	cfgUpdated := mb.configUpdated
	mb.mu.RUnlock()

	// Heartbeat response is returned WITHOUT envelope wrapper
	// (the Go client parses HeartbeatResponse directly)
	resp := HeartbeatResponseData{
		Acknowledged:       true,
		ServerTime:         time.Now().UTC().Format(time.RFC3339),
		CommandsPending:    cmdsPending,
		ConfigUpdated:      cfgUpdated,
		InventoryRequested: invRequested,
	}

	// Clear one-shot flags
	mb.mu.Lock()
	mb.inventoryRequested = false
	mb.configUpdated = false
	mb.mu.Unlock()

	writeJSON(w, http.StatusOK, resp)
}

func (mb *MockBackend) handleCommands(w http.ResponseWriter, r *http.Request) {
	mb.recordCall(r)
	if mb.checkServerError(w) {
		return
	}

	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	if !mb.checkAuth(w, r) {
		return
	}

	mb.mu.Lock()
	commands := make([]PendingCommand, len(mb.pendingCommands))
	copy(commands, mb.pendingCommands)
	mb.pendingCommands = nil // Commands are consumed on fetch
	mb.commandsPending = false
	mb.mu.Unlock()

	// Commands endpoint returns a RAW ARRAY, not wrapped in envelope
	writeJSON(w, http.StatusOK, commands)
}

func (mb *MockBackend) handleCommandsSubpath(w http.ResponseWriter, r *http.Request) {
	mb.recordCall(r)
	if mb.checkServerError(w) {
		return
	}

	// Parse: /api/agent/commands/{id}/result
	path := r.URL.Path
	parts := strings.Split(strings.TrimPrefix(path, "/api/agent/commands/"), "/")
	if len(parts) < 2 || parts[1] != "result" {
		// Not a result endpoint, delegate to handleCommands for GET
		if r.Method == http.MethodGet && len(parts) == 0 {
			mb.handleCommands(w, r)
			return
		}
		w.WriteHeader(http.StatusNotFound)
		return
	}

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	if !mb.checkAuth(w, r) {
		return
	}

	commandID := parts[0]

	var req CommandResultRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error":   "Bad Request",
			"message": "Invalid JSON: " + err.Error(),
		})
		return
	}

	mb.mu.Lock()
	mb.commandResults[commandID] = &req
	mb.mu.Unlock()

	writeEnvelope(w, http.StatusOK, nil)
}

func (mb *MockBackend) handleInventory(w http.ResponseWriter, r *http.Request) {
	mb.recordCall(r)
	if mb.checkServerError(w) {
		return
	}

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	if !mb.checkAuth(w, r) {
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	mb.mu.Lock()
	mb.inventories = append(mb.inventories, json.RawMessage(body))
	mb.mu.Unlock()

	writeEnvelope(w, http.StatusOK, nil)
}

func (mb *MockBackend) handleTelemetry(w http.ResponseWriter, r *http.Request) {
	mb.recordCall(r)
	if mb.checkServerError(w) {
		return
	}

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	if !mb.checkAuth(w, r) {
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	mb.mu.Lock()
	mb.telemetries = append(mb.telemetries, json.RawMessage(body))
	mb.mu.Unlock()

	writeEnvelope(w, http.StatusOK, nil)
}

func (mb *MockBackend) handleConfig(w http.ResponseWriter, r *http.Request) {
	mb.recordCall(r)
	if mb.checkServerError(w) {
		return
	}

	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	if !mb.checkAuth(w, r) {
		return
	}

	// Config endpoint: Go client parses directly (no envelope unwrap)
	mb.mu.RLock()
	cfg := mb.config
	mb.mu.RUnlock()

	writeJSON(w, http.StatusOK, cfg)
}

func (mb *MockBackend) handleTokenRefresh(w http.ResponseWriter, r *http.Request) {
	mb.recordCall(r)
	if mb.checkServerError(w) {
		return
	}

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	// Token refresh uses refresh token in Authorization header
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error":   "Unauthorized",
			"message": "Missing or invalid refresh token",
		})
		return
	}

	mb.mu.RLock()
	reject := mb.rejectAuth
	mb.mu.RUnlock()

	if reject {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error":   "Unauthorized",
			"message": "Refresh token expired",
		})
		return
	}

	// Token refresh response: Go client parses directly (no envelope)
	resp := TokenRefreshResponseData{
		AccessToken:  fmt.Sprintf("new-access-token-%d", time.Now().UnixNano()),
		RefreshToken: fmt.Sprintf("new-refresh-token-%d", time.Now().UnixNano()),
	}

	writeJSON(w, http.StatusOK, resp)
}

func (mb *MockBackend) handleLogs(w http.ResponseWriter, r *http.Request) {
	mb.recordCall(r)
	if mb.checkServerError(w) {
		return
	}

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	if !mb.checkAuth(w, r) {
		return
	}

	var req LogUploadRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	mb.mu.Lock()
	mb.logUploads = append(mb.logUploads, req)
	mb.mu.Unlock()

	writeEnvelope(w, http.StatusOK, map[string]string{"message": "Logs received"})
}

func (mb *MockBackend) handlePatchDownloads(w http.ResponseWriter, r *http.Request) {
	mb.recordCall(r)
	if mb.checkServerError(w) {
		return
	}

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	if !mb.checkAuth(w, r) {
		return
	}

	var req struct {
		AgentID  string   `json:"agentId"`
		PatchIDs []string `json:"patchIds"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	mb.mu.RLock()
	var downloads []PatchDownloadInfo
	for _, patchID := range req.PatchIDs {
		if data, ok := mb.patchFiles[patchID]; ok {
			checksum := sha256.Sum256(data)
			downloads = append(downloads, PatchDownloadInfo{
				PatchID:      patchID,
				FileName:     patchID + ".pkg",
				DownloadURL:  mb.URL + "/patches/" + patchID,
				Checksum:     fmt.Sprintf("%x", checksum),
				ChecksumType: "sha256",
				Size:         int64(len(data)),
				ExpiresAt:    time.Now().Add(1 * time.Hour).UTC().Format(time.RFC3339),
			})
		}
	}
	mb.mu.RUnlock()

	writeEnvelope(w, http.StatusOK, downloads)
}

func (mb *MockBackend) handleUpdateBinary(w http.ResponseWriter, r *http.Request) {
	mb.recordCall(r)
	if mb.checkServerError(w) {
		return
	}

	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	mb.mu.RLock()
	data := mb.updateBinaryData
	mb.mu.RUnlock()

	if data == nil {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", `attachment; filename="patchiq-agent"`)
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}

func (mb *MockBackend) handlePatchFileDownload(w http.ResponseWriter, r *http.Request) {
	mb.recordCall(r)

	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	patchID := strings.TrimPrefix(r.URL.Path, "/patches/")

	mb.mu.RLock()
	data, ok := mb.patchFiles[patchID]
	mb.mu.RUnlock()

	if !ok {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/octet-stream")
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}
