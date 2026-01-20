package backend

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/patchify/agent/internal/client"
	"github.com/patchify/agent/internal/collectors"
	"github.com/patchify/agent/internal/config"
	"github.com/patchify/agent/internal/executors"
	"github.com/patchify/agent/internal/models"
)

// Manager handles communication with the PatchIQ backend
type Manager struct {
	config     *config.Config
	client     *client.Client
	collectors *collectors.CollectorManager
	executors  *executors.ExecutorManager

	mu               sync.RWMutex
	registered       bool
	lastHeartbeat    time.Time
	lastInventory    time.Time
	lastTelemetry    time.Time
	lastError        string
	startTime        time.Time
	consecutiveErrors int

	stopCh chan struct{}
	wg     sync.WaitGroup
}

// New creates a new backend manager
func New(cfg *config.Config, cm *collectors.CollectorManager, em *executors.ExecutorManager) *Manager {
	return &Manager{
		config:     cfg,
		client:     client.New(cfg.ServerURL, "1.0.0"),
		collectors: cm,
		executors:  em,
		startTime:  time.Now(),
		stopCh:     make(chan struct{}),
	}
}

// Start begins backend communication
func (m *Manager) Start() error {
	// Try to load existing credentials
	creds, err := client.LoadCredentials(m.config.DataDir)
	if err != nil {
		log.Printf("Warning: Failed to load credentials: %v", err)
	}

	if creds != nil && creds.AgentID != "" {
		log.Printf("Found existing credentials, agent ID: %s", creds.AgentID)
		m.client.SetCredentials(creds.AgentID, creds.AccessToken, creds.RefreshToken)
		m.registered = true
	} else {
		// Register with the backend
		if err := m.register(); err != nil {
			log.Printf("Warning: Failed to register with backend: %v", err)
			// Continue anyway, will retry in heartbeat loop
		}
	}

	// Start background loops
	m.wg.Add(3)
	go m.heartbeatLoop()
	go m.inventoryLoop()
	go m.telemetryLoop()

	return nil
}

// Stop gracefully stops all backend communication
func (m *Manager) Stop() {
	close(m.stopCh)
	m.wg.Wait()
}

// IsRegistered returns whether the agent is registered
func (m *Manager) IsRegistered() bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.registered
}

// GetAgentID returns the agent ID
func (m *Manager) GetAgentID() string {
	return m.client.GetAgentID()
}

func (m *Manager) register() error {
	log.Println("Registering with backend...")

	machineID, err := client.GetMachineID()
	if err != nil {
		return err
	}

	hostname, _ := os.Hostname()
	osName, osVersion := getOSInfo()
	ipAddress := getPrimaryIPAddress()

	req := &client.RegisterRequest{
		MachineID:    machineID,
		Hostname:     hostname,
		OS:           osName,
		OSVersion:    osVersion,
		Architecture: runtime.GOARCH,
		AgentVersion: "1.0.0",
		IPAddress:    ipAddress,
	}

	resp, err := m.client.Register(req)
	if err != nil {
		return err
	}

	// Save credentials
	creds := &client.Credentials{
		AgentID:      resp.AgentID,
		AssetID:      resp.AssetID,
		AccessToken:  resp.AccessToken,
		RefreshToken: resp.RefreshToken,
		MachineID:    machineID,
	}

	if err := client.SaveCredentials(m.config.DataDir, creds); err != nil {
		log.Printf("Warning: Failed to save credentials: %v", err)
	}

	m.mu.Lock()
	m.registered = true
	m.mu.Unlock()

	if resp.IsReRegistration {
		log.Printf("Re-registered with backend, agent ID: %s", resp.AgentID)
	} else {
		log.Printf("Registered with backend, agent ID: %s, asset ID: %s", resp.AgentID, resp.AssetID)
	}

	// Apply server config if provided
	if resp.Config.HeartbeatIntervalSeconds > 0 {
		m.config.HeartbeatInterval = resp.Config.HeartbeatIntervalSeconds
	}
	if resp.Config.TelemetryIntervalSeconds > 0 {
		m.config.TelemetryInterval = resp.Config.TelemetryIntervalSeconds
	}

	return nil
}

func (m *Manager) heartbeatLoop() {
	defer m.wg.Done()

	// Initial delay
	select {
	case <-time.After(5 * time.Second):
	case <-m.stopCh:
		return
	}

	ticker := time.NewTicker(time.Duration(m.config.HeartbeatInterval) * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			if err := m.sendHeartbeat(); err != nil {
				m.mu.Lock()
				m.consecutiveErrors++
				m.lastError = err.Error()
				m.mu.Unlock()

				log.Printf("Heartbeat failed: %v (consecutive errors: %d)", err, m.consecutiveErrors)

				// If we have too many errors, try to re-register
				if m.consecutiveErrors >= 5 {
					log.Println("Too many heartbeat failures, attempting re-registration...")
					if err := m.register(); err != nil {
						log.Printf("Re-registration failed: %v", err)
					} else {
						m.mu.Lock()
						m.consecutiveErrors = 0
						m.mu.Unlock()
					}
				}
			} else {
				m.mu.Lock()
				m.consecutiveErrors = 0
				m.lastError = ""
				m.mu.Unlock()
			}
		case <-m.stopCh:
			return
		}
	}
}

func (m *Manager) sendHeartbeat() error {
	if !m.client.IsRegistered() {
		return m.register()
	}

	// Collect current metrics for heartbeat
	telemetry, _ := m.collectors.CollectTelemetry()

	cpuUsage := 0.0
	memUsage := 0.0
	diskUsage := 0.0

	if telemetry != nil {
		cpuUsage = telemetry.CPU.UsagePercent
		memUsage = telemetry.Memory.UsagePercent
		if len(telemetry.Disk.Drives) > 0 {
			diskUsage = telemetry.Disk.Drives[0].UsagePercent
		}
	}

	systemUptime := getSystemUptime()
	agentUptime := int64(time.Since(m.startTime).Seconds())

	m.mu.RLock()
	lastErr := m.lastError
	m.mu.RUnlock()

	var lastErrPtr *string
	if lastErr != "" {
		lastErrPtr = &lastErr
	}

	req := &client.HeartbeatRequest{
		Timestamp:     time.Now().UTC().Format(time.RFC3339),
		Status:        "healthy",
		Uptime:        systemUptime,
		AgentUptime:   agentUptime,
		CPUUsage:      cpuUsage,
		MemoryUsage:   memUsage,
		DiskUsage:     diskUsage,
		PendingReboot: false,
		IPAddress:     getPrimaryIPAddress(),
		LastError:     lastErrPtr,
	}

	resp, err := m.client.Heartbeat(req)
	if err != nil {
		return err
	}

	m.mu.Lock()
	m.lastHeartbeat = time.Now()
	m.mu.Unlock()

	// Handle response flags
	if resp.CommandsPending {
		go m.fetchAndExecuteCommands()
	}

	if resp.InventoryRequested {
		go m.submitInventoryNow()
	}

	return nil
}

func (m *Manager) inventoryLoop() {
	defer m.wg.Done()

	// Initial inventory after 30 seconds
	select {
	case <-time.After(30 * time.Second):
	case <-m.stopCh:
		return
	}

	// Submit initial inventory
	m.submitInventoryNow()

	// Then every 6 hours (or as configured)
	interval := time.Duration(m.config.InventoryInterval) * time.Second
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			m.submitInventoryNow()
		case <-m.stopCh:
			return
		}
	}
}

func (m *Manager) submitInventoryNow() {
	if !m.client.IsRegistered() {
		return
	}

	log.Println("Collecting and submitting inventory...")

	inventory := m.collectors.CollectAll()

	req := &client.InventoryRequest{
		CollectedAt: time.Now().UTC().Format(time.RFC3339),
		Hardware:    inventory.Hardware,
		Software:    inventory.Software,
		Network:     inventory.Network,
		Security:    inventory.Security,
		Peripherals: inventory.Peripherals,
	}

	if err := m.client.SubmitInventory(req); err != nil {
		log.Printf("Failed to submit inventory: %v", err)
		return
	}

	m.mu.Lock()
	m.lastInventory = time.Now()
	m.mu.Unlock()

	log.Println("Inventory submitted successfully")
}

func (m *Manager) telemetryLoop() {
	defer m.wg.Done()

	// Initial delay
	select {
	case <-time.After(10 * time.Second):
	case <-m.stopCh:
		return
	}

	ticker := time.NewTicker(time.Duration(m.config.TelemetryInterval) * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			m.submitTelemetryNow()
		case <-m.stopCh:
			return
		}
	}
}

func (m *Manager) submitTelemetryNow() {
	if !m.client.IsRegistered() {
		return
	}

	telemetry, err := m.collectors.CollectTelemetry()
	if err != nil {
		log.Printf("Failed to collect telemetry: %v", err)
		return
	}

	req := &client.TelemetryRequest{
		CollectedAt: time.Now().UTC().Format(time.RFC3339),
		CPU: map[string]interface{}{
			"usage": telemetry.CPU.UsagePercent,
		},
		Memory: map[string]interface{}{
			"usage": telemetry.Memory.UsagePercent,
		},
		Disk: map[string]interface{}{
			"usage": getDiskUsage(telemetry),
		},
		Network: map[string]interface{}{
			"bytesSentPerSec":     telemetry.Network.BytesSentPerSec,
			"bytesReceivedPerSec": telemetry.Network.BytesReceivedPerSec,
		},
	}

	if err := m.client.SubmitTelemetry(req); err != nil {
		log.Printf("Failed to submit telemetry: %v", err)
		return
	}

	m.mu.Lock()
	m.lastTelemetry = time.Now()
	m.mu.Unlock()
}

func (m *Manager) fetchAndExecuteCommands() {
	commands, err := m.client.GetPendingCommands()
	if err != nil {
		log.Printf("Failed to fetch commands: %v", err)
		return
	}

	for _, cmd := range commands {
		log.Printf("Executing command: %s (type: %s)", cmd.ID, cmd.Type)
		m.executeCommand(cmd)
	}
}

func (m *Manager) executeCommand(cmd client.PendingCommand) {
	result := &client.CommandResultRequest{
		Status: "completed",
	}

	switch cmd.Type {
	case "inventory_full", "inventory_hardware", "inventory_software", "inventory_security":
		m.submitInventoryNow()
		result.Result = "Inventory collection completed"

	case "config_update":
		// Refresh config from server
		cfg, err := m.client.GetConfig()
		if err != nil {
			result.Status = "failed"
			result.ErrorMessage = err.Error()
		} else {
			m.config.HeartbeatInterval = cfg.HeartbeatIntervalSeconds
			m.config.TelemetryInterval = cfg.TelemetryIntervalSeconds
			result.Result = "Configuration updated"
		}

	// Patch commands
	case "patch_install":
		var params struct {
			PatchID string             `json:"patchId"`
			Options models.PatchOptions `json:"options"`
		}
		if err := parsePayload(cmd.Payload, &params); err != nil {
			result.Status = "failed"
			result.ErrorMessage = "Invalid payload: " + err.Error()
		} else {
			execResult := m.executors.Patch().InstallPatch(params.PatchID, params.Options)
			result.Status = boolToStatus(execResult.Success)
			result.Result = execResult.Message
			result.ErrorMessage = execResult.ErrorMessage
		}

	case "patch_uninstall":
		var params struct {
			PatchID string `json:"patchId"`
		}
		if err := parsePayload(cmd.Payload, &params); err != nil {
			result.Status = "failed"
			result.ErrorMessage = "Invalid payload: " + err.Error()
		} else {
			execResult := m.executors.Patch().UninstallPatch(params.PatchID)
			result.Status = boolToStatus(execResult.Success)
			result.Result = execResult.Message
			result.ErrorMessage = execResult.ErrorMessage
		}

	case "patch_install_all":
		var params struct {
			Options models.PatchOptions `json:"options"`
		}
		parsePayload(cmd.Payload, &params) // Options are optional
		execResult := m.executors.Patch().InstallAllPatches(params.Options)
		result.Status = boolToStatus(execResult.Success)
		result.Result = execResult.Message
		result.ErrorMessage = execResult.ErrorMessage

	case "patch_list":
		patches, err := m.executors.Patch().ListAvailablePatches()
		if err != nil {
			result.Status = "failed"
			result.ErrorMessage = err.Error()
		} else {
			patchJSON, _ := json.Marshal(patches)
			result.Result = string(patchJSON)
		}

	// Software commands
	case "software_install":
		var params models.SoftwarePackage
		if err := parsePayload(cmd.Payload, &params); err != nil {
			result.Status = "failed"
			result.ErrorMessage = "Invalid payload: " + err.Error()
		} else {
			execResult := m.executors.Software().InstallSoftware(params)
			result.Status = boolToStatus(execResult.Success)
			result.Result = execResult.Message
			result.ErrorMessage = execResult.ErrorMessage
		}

	case "software_uninstall":
		var params struct {
			Name string `json:"name"`
		}
		if err := parsePayload(cmd.Payload, &params); err != nil {
			result.Status = "failed"
			result.ErrorMessage = "Invalid payload: " + err.Error()
		} else {
			execResult := m.executors.Software().UninstallSoftware(params.Name)
			result.Status = boolToStatus(execResult.Success)
			result.Result = execResult.Message
			result.ErrorMessage = execResult.ErrorMessage
		}

	// Remote access commands
	case "remote_access_enable":
		var params models.RemoteAccessConfig
		parsePayload(cmd.Payload, &params) // Config is optional
		execResult := m.executors.RemoteAccess().Enable(params)
		result.Status = boolToStatus(execResult.Success)
		result.Result = execResult.Message
		result.ErrorMessage = execResult.ErrorMessage

	case "remote_access_disable":
		execResult := m.executors.RemoteAccess().Disable()
		result.Status = boolToStatus(execResult.Success)
		result.Result = execResult.Message
		result.ErrorMessage = execResult.ErrorMessage

	case "remote_access_status":
		status := m.executors.RemoteAccess().GetStatus()
		statusJSON, _ := json.Marshal(status)
		result.Result = string(statusJSON)

	case "remote_access_set_password":
		var params struct {
			Password string `json:"password"`
		}
		if err := parsePayload(cmd.Payload, &params); err != nil {
			result.Status = "failed"
			result.ErrorMessage = "Invalid payload: " + err.Error()
		} else {
			execResult := m.executors.RemoteAccess().SetPassword(params.Password)
			result.Status = boolToStatus(execResult.Success)
			result.Result = execResult.Message
			result.ErrorMessage = execResult.ErrorMessage
		}

	// Reboot check
	case "check_reboot_required":
		rebootRequired := m.executors.Patch().CheckRebootRequired()
		result.Result = fmt.Sprintf(`{"rebootRequired":%t}`, rebootRequired)

	default:
		result.Status = "failed"
		result.ErrorMessage = "Unknown command type: " + cmd.Type
	}

	if err := m.client.ReportCommandResult(cmd.ID, result); err != nil {
		log.Printf("Failed to report command result: %v", err)
	}
}

// parsePayload converts command payload to typed struct
func parsePayload(payload interface{}, target interface{}) error {
	if payload == nil {
		return nil
	}
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, target)
}

// boolToStatus converts boolean success to status string
func boolToStatus(success bool) string {
	if success {
		return "completed"
	}
	return "failed"
}

// GetStatus returns the current backend communication status
func (m *Manager) GetStatus() *Status {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return &Status{
		Registered:        m.registered,
		AgentID:           m.client.GetAgentID(),
		LastHeartbeat:     m.lastHeartbeat,
		LastInventory:     m.lastInventory,
		LastTelemetry:     m.lastTelemetry,
		LastError:         m.lastError,
		ConsecutiveErrors: m.consecutiveErrors,
	}
}

// Status represents the current backend communication status
type Status struct {
	Registered        bool
	AgentID           string
	LastHeartbeat     time.Time
	LastInventory     time.Time
	LastTelemetry     time.Time
	LastError         string
	ConsecutiveErrors int
}

// Helper functions

func getOSInfo() (string, string) {
	switch runtime.GOOS {
	case "darwin":
		osName := "MacOS"
		osVersion := ""
		if out, err := exec.Command("sw_vers", "-productVersion").Output(); err == nil {
			osVersion = strings.TrimSpace(string(out))
		}
		return osName, osVersion

	case "linux":
		osName := "Linux"
		osVersion := ""
		if data, err := os.ReadFile("/etc/os-release"); err == nil {
			lines := strings.Split(string(data), "\n")
			for _, line := range lines {
				if strings.HasPrefix(line, "VERSION_ID=") {
					osVersion = strings.Trim(strings.TrimPrefix(line, "VERSION_ID="), "\"")
				}
			}
		}
		return osName, osVersion

	case "windows":
		return "Windows", ""

	default:
		return runtime.GOOS, ""
	}
}

func getPrimaryIPAddress() string {
	// This is a simplified version - the collectors have more sophisticated logic
	if out, err := exec.Command("hostname", "-I").Output(); err == nil {
		parts := strings.Fields(string(out))
		if len(parts) > 0 {
			return parts[0]
		}
	}

	// macOS
	if out, err := exec.Command("ipconfig", "getifaddr", "en0").Output(); err == nil {
		return strings.TrimSpace(string(out))
	}

	return ""
}

func getSystemUptime() int64 {
	switch runtime.GOOS {
	case "darwin":
		// Use sysctl to get boot time
		out, err := exec.Command("sysctl", "-n", "kern.boottime").Output()
		if err == nil {
			// Parse boot time: { sec = 1234567890, usec = 0 } ...
			str := string(out)
			if idx := strings.Index(str, "sec = "); idx != -1 {
				str = str[idx+6:]
				if endIdx := strings.Index(str, ","); endIdx != -1 {
					bootTimeStr := str[:endIdx]
					var bootTime int64
					if n, _ := fmt.Sscanf(bootTimeStr, "%d", &bootTime); n == 1 {
						return time.Now().Unix() - bootTime
					}
				}
			}
		}
	case "linux":
		if data, err := os.ReadFile("/proc/uptime"); err == nil {
			parts := strings.Fields(string(data))
			if len(parts) > 0 {
				var uptime float64
				if n, _ := fmt.Sscanf(parts[0], "%f", &uptime); n == 1 {
					return int64(uptime)
				}
			}
		}
	}
	return 0
}

func getDiskUsage(t *models.Telemetry) float64 {
	if t == nil || len(t.Disk.Drives) == 0 {
		return 0
	}
	return t.Disk.Drives[0].UsagePercent
}
