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

// JobHistoryEntry represents a completed job/command
type JobHistoryEntry struct {
	ID           string      `json:"id"`
	Type         string      `json:"type"`
	Payload      interface{} `json:"payload,omitempty"`
	Status       string      `json:"status"` // completed, failed, in_progress
	Result       string      `json:"result,omitempty"`
	ErrorMessage string      `json:"errorMessage,omitempty"`
	StartedAt    time.Time   `json:"startedAt"`
	CompletedAt  time.Time   `json:"completedAt,omitempty"`
	Duration     string      `json:"duration,omitempty"`
}

// Manager handles communication with the PatchIQ backend
type Manager struct {
	config       *config.Config
	client       *client.Client
	collectors   *collectors.CollectorManager
	executors    *executors.ExecutorManager
	agentVersion string

	mu               sync.RWMutex
	registered       bool
	lastHeartbeat    time.Time
	lastInventory    time.Time
	lastTelemetry    time.Time
	lastError        string
	startTime        time.Time
	consecutiveErrors int
	tokenExpiresAt   time.Time

	// Job tracking
	jobHistory     []JobHistoryEntry
	activeJobs     map[string]*JobHistoryEntry
	maxJobHistory  int

	stopCh           chan struct{}
	resetHeartbeat   chan struct{}
	resetTelemetry   chan struct{}
	resetInventory   chan struct{}
	wg               sync.WaitGroup
}

// New creates a new backend manager
func New(cfg *config.Config, cm *collectors.CollectorManager, em *executors.ExecutorManager, agentVersion string) *Manager {
	// Build proxy and download config from agent config
	proxyConfig := &client.ProxyConfig{
		ProxyURL:             cfg.ProxyURL,
		Username:             cfg.ProxyUser,
		Password:             cfg.ProxyPassword,
		NoProxy:              cfg.NoProxy,
		MaxDownloadSpeedMBps: cfg.MaxDownloadSpeedMBps,
		EnableDownloadResume: cfg.EnableDownloadResume,
	}

	return &Manager{
		config:        cfg,
		client:        client.New(cfg.ServerURL, agentVersion, proxyConfig),
		agentVersion:  agentVersion,
		collectors:    cm,
		executors:     em,
		startTime:      time.Now(),
		stopCh:         make(chan struct{}),
		resetHeartbeat: make(chan struct{}, 1),
		resetTelemetry: make(chan struct{}, 1),
		resetInventory: make(chan struct{}, 1),
		jobHistory:    make([]JobHistoryEntry, 0),
		activeJobs:    make(map[string]*JobHistoryEntry),
		maxJobHistory: 100, // Keep last 100 jobs
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
		// Invalidate credentials if server URL changed or missing (legacy/stale credentials)
		if creds.ServerURL == "" || creds.ServerURL != m.config.ServerURL {
			if creds.ServerURL == "" {
				log.Printf("Credentials missing server URL (legacy), clearing stale credentials")
			} else {
				log.Printf("Server URL changed (%s -> %s), clearing old credentials", creds.ServerURL, m.config.ServerURL)
			}
			_ = client.DeleteCredentials(m.config.DataDir)
			creds = nil
		}
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
		AgentVersion: m.agentVersion,
		IPAddress:    ipAddress,
	}

	resp, err := m.client.Register(req)
	if err != nil {
		return err
	}

	// Save credentials (include server URL so we can detect server changes)
	creds := &client.Credentials{
		AgentID:      resp.AgentID,
		AssetID:      resp.AssetID,
		AccessToken:  resp.AccessToken,
		RefreshToken: resp.RefreshToken,
		MachineID:    machineID,
		ServerURL:    m.config.ServerURL,
	}

	if err := client.SaveCredentials(m.config.DataDir, creds); err != nil {
		log.Printf("Warning: Failed to save credentials: %v", err)
	}

	m.mu.Lock()
	m.registered = true
	m.mu.Unlock()

	// Track token expiry for proactive refresh (refresh at 80% of lifetime)
	if resp.TokenExpiresIn > 0 {
		m.mu.Lock()
		m.tokenExpiresAt = time.Now().Add(time.Duration(resp.TokenExpiresIn) * time.Second)
		m.mu.Unlock()
	}

	if resp.IsReRegistration {
		log.Printf("Re-registered with backend, agent ID: %s", resp.AgentID)
	} else {
		log.Printf("Registered with backend, agent ID: %s, asset ID: %s", resp.AgentID, resp.AssetID)
	}

	// Apply server config if provided and signal loops to reset tickers
	if resp.Config.HeartbeatIntervalSeconds > 0 && resp.Config.HeartbeatIntervalSeconds != m.config.HeartbeatInterval {
		m.config.HeartbeatInterval = resp.Config.HeartbeatIntervalSeconds
		select {
		case m.resetHeartbeat <- struct{}{}:
		default:
		}
	}
	if resp.Config.TelemetryIntervalSeconds > 0 && resp.Config.TelemetryIntervalSeconds != m.config.TelemetryInterval {
		m.config.TelemetryInterval = resp.Config.TelemetryIntervalSeconds
		select {
		case m.resetTelemetry <- struct{}{}:
		default:
		}
	}
	if resp.Config.InventoryIntervalSeconds > 0 && resp.Config.InventoryIntervalSeconds != m.config.InventoryInterval {
		m.config.InventoryInterval = resp.Config.InventoryIntervalSeconds
		select {
		case m.resetInventory <- struct{}{}:
		default:
		}
	}

	// Check for newer agent version
	if resp.Config.LatestAgentVersion != "" && resp.Config.LatestAgentVersion != m.agentVersion {
		log.Printf("New agent version available: %s (current: %s)", resp.Config.LatestAgentVersion, m.agentVersion)
		if resp.Config.AgentDownloadURL != "" {
			log.Printf("Download: %s", resp.Config.AgentDownloadURL)
		}
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

				// Immediately re-register on auth errors (401/403) or after 5 consecutive failures
				needsReregister := false
				if _, ok := err.(*client.ErrAuth); ok {
					log.Println("Authentication rejected, re-registering immediately...")
					_ = client.DeleteCredentials(m.config.DataDir)
					needsReregister = true
				} else if m.consecutiveErrors >= 5 {
					log.Println("Too many heartbeat failures, attempting re-registration...")
					needsReregister = true
				}

				if needsReregister {
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
		case <-m.resetHeartbeat:
			ticker.Reset(time.Duration(m.config.HeartbeatInterval) * time.Second)
			log.Printf("Heartbeat interval updated to %ds", m.config.HeartbeatInterval)
		case <-m.stopCh:
			return
		}
	}
}

func (m *Manager) refreshTokenIfNeeded() {
	m.mu.RLock()
	expiresAt := m.tokenExpiresAt
	m.mu.RUnlock()

	if expiresAt.IsZero() {
		return
	}

	// Refresh when 80% of the token lifetime has elapsed
	timeLeft := time.Until(expiresAt)
	if timeLeft > 10*time.Minute {
		return
	}

	log.Println("Access token expiring soon, refreshing...")
	if err := m.client.RefreshToken(); err != nil {
		log.Printf("Token refresh failed: %v, will re-register on next auth error", err)
		return
	}

	// Update expiry (assume same lifetime as original)
	m.mu.Lock()
	m.tokenExpiresAt = time.Now().Add(1 * time.Hour)
	m.mu.Unlock()

	// Persist new tokens
	creds, _ := client.LoadCredentials(m.config.DataDir)
	if creds != nil {
		creds.AccessToken = m.client.GetAccessToken()
		creds.RefreshToken = m.client.GetRefreshToken()
		_ = client.SaveCredentials(m.config.DataDir, creds)
	}

	log.Println("Token refreshed successfully")
}

func (m *Manager) sendHeartbeat() error {
	if !m.client.IsRegistered() {
		return m.register()
	}

	// Proactively refresh token before it expires
	m.refreshTokenIfNeeded()

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
		case <-m.resetInventory:
			ticker.Reset(time.Duration(m.config.InventoryInterval) * time.Second)
			log.Printf("Inventory interval updated to %ds", m.config.InventoryInterval)
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
		case <-m.resetTelemetry:
			ticker.Reset(time.Duration(m.config.TelemetryInterval) * time.Second)
			log.Printf("Telemetry interval updated to %ds", m.config.TelemetryInterval)
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

	// Send the complete telemetry data, not just summaries
	req := &client.TelemetryRequest{
		CollectedAt: time.Now().UTC().Format(time.RFC3339),
		CPU:         telemetry.CPU,
		Memory:      telemetry.Memory,
		Disk:        telemetry.Disk,
		Network:     telemetry.Network,
		Processes:   telemetry.Processes,
		SystemUptime: telemetry.SystemUptime,
		Thermal:     telemetry.Thermal,
		Power:       telemetry.Power,
		AgentUtilization: telemetry.AgentUtilization,
		SystemErrors: telemetry.SystemErrors,
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
	// Start tracking this job
	job := &JobHistoryEntry{
		ID:        cmd.ID,
		Type:      cmd.Type,
		Payload:   cmd.Payload,
		Status:    "in_progress",
		StartedAt: time.Now(),
	}

	m.mu.Lock()
	m.activeJobs[cmd.ID] = job
	m.mu.Unlock()

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
		// Support both array format { patches: [...] } and legacy single format { patchId, options }
		var arrayParams struct {
			Patches []struct {
				PatchID        string             `json:"patchId"`
				KBNumber       string             `json:"kbNumber"`
				PackageName    string             `json:"packageName"`
				DownloadURL    string             `json:"downloadUrl"`
				Checksum       string             `json:"checksum"`
				ChecksumType   string             `json:"checksumType"`
				RebootRequired bool               `json:"rebootRequired"`
				ForceReboot    bool               `json:"forceReboot"`
			} `json:"patches"`
		}
		var singleParams struct {
			PatchID string             `json:"patchId"`
			Options models.PatchOptions `json:"options"`
		}

		if err := parsePayload(cmd.Payload, &arrayParams); err == nil && len(arrayParams.Patches) > 0 {
			// Array format from deployment executor
			var allSuccess = true
			var messages []string
			var lastErr string
			for _, p := range arrayParams.Patches {
				patchID := p.PatchID
				if patchID == "" {
					patchID = p.KBNumber
				}
				if patchID == "" {
					patchID = p.PackageName
				}
				opts := models.PatchOptions{
					Force:       p.ForceReboot,
					AllowReboot: p.RebootRequired,
				}
				execResult := m.executors.Patch().InstallPatch(patchID, opts)
				if !execResult.Success {
					allSuccess = false
					if execResult.ErrorMessage != "" {
						lastErr = execResult.ErrorMessage
					}
				}
				messages = append(messages, fmt.Sprintf("%s: %s", patchID, execResult.Message))
			}
			result.Status = boolToStatus(allSuccess)
			result.Result = strings.Join(messages, "; ")
			result.ErrorMessage = lastErr
		} else if err := parsePayload(cmd.Payload, &singleParams); err == nil && singleParams.PatchID != "" {
			// Legacy single-patch format
			execResult := m.executors.Patch().InstallPatch(singleParams.PatchID, singleParams.Options)
			result.Status = boolToStatus(execResult.Success)
			result.Result = execResult.Message
			result.ErrorMessage = execResult.ErrorMessage
		} else {
			result.Status = "failed"
			result.ErrorMessage = "Invalid payload: expected { patches: [...] } or { patchId: \"...\" }"
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
			// Create rollback info before installation
			rollbackInfo, _ := m.executors.Rollback().CreateRollbackInfoForInstall(
				params.Name, params.Source, cmd.ID, m.executors.Software())

			// Execute installation
			execResult := m.executors.Software().InstallSoftware(params)
			result.Status = boolToStatus(execResult.Success)
			result.Result = execResult.Message
			result.ErrorMessage = execResult.ErrorMessage

			// Save rollback info if installation succeeded
			if execResult.Success && rollbackInfo != nil {
				// Get installed version
				if version, err := m.executors.Software().GetInstalledVersion(params.Name); err == nil {
					rollbackInfo.InstalledVersion = version
				}
				m.executors.Rollback().SaveRollbackInfo(*rollbackInfo)
			}
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

	// Rollback commands
	case "rollback_execute":
		var params struct {
			RollbackID string `json:"rollbackId"`
			Force      bool   `json:"force"`
		}
		if err := parsePayload(cmd.Payload, &params); err != nil {
			result.Status = "failed"
			result.ErrorMessage = "Invalid payload: " + err.Error()
		} else {
			execResult := m.executors.Rollback().ExecuteRollback(params.RollbackID, params.Force)
			result.Status = boolToStatus(execResult.Success)
			result.Result = execResult.Message
			result.ErrorMessage = execResult.ErrorMessage
		}

	case "rollback_list":
		rollbacks, err := m.executors.Rollback().ListRollbackInfo()
		if err != nil {
			result.Status = "failed"
			result.ErrorMessage = err.Error()
		} else {
			rollbackJSON, _ := json.Marshal(rollbacks)
			result.Result = string(rollbackJSON)
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

	// Script bundle commands (Hub-centric approach)
	case "script_bundle", "hub_install", "hub_update", "hub_rollback", "hub_uninstall", "hub_patch_install", "hub_patch_rollback":
		var params models.ScriptBundleRequest
		if err := parsePayload(cmd.Payload, &params); err != nil {
			result.Status = "failed"
			result.ErrorMessage = "Invalid payload: " + err.Error()
		} else {
			// Determine operation type from command type if not set in payload
			if params.OperationType == "" {
				switch cmd.Type {
				case "hub_install", "hub_patch_install":
					params.OperationType = "install"
				case "hub_update":
					params.OperationType = "update"
				case "hub_rollback", "hub_patch_rollback":
					params.OperationType = "rollback"
				case "hub_uninstall":
					params.OperationType = "uninstall"
				default:
					params.OperationType = "install" // default
				}
			}

			// Create rollback info before installation (for install/update operations)
			var rollbackInfo *models.RollbackInfo
			if params.OperationType == "install" || params.OperationType == "update" {
				rollbackInfo, _ = m.executors.Rollback().CreateRollbackInfoForInstall(
					params.PackageName, "script_bundle", cmd.ID, m.executors.Software())
			}

			// Execute script bundle
			execResult := m.executors.Script().ExecuteBundle(params)
			result.Status = boolToStatus(execResult.Success)
			result.Result = execResult.Message
			result.ErrorMessage = execResult.ErrorMessage
			result.Output = execResult.Output

			// Save rollback info if successful
			if execResult.Success && rollbackInfo != nil {
				rollbackInfo.InstalledVersion = params.Version
				rollbackInfo.SupportsRollback = params.Manifest != nil && params.Manifest.Scripts.Rollback != ""
				m.executors.Rollback().SaveRollbackInfo(*rollbackInfo)
			}
		}

	// Inline script execution
	case "script_inline":
		var params struct {
			Script        string            `json:"script"`
			OperationType string            `json:"operationType"`
			RequiresRoot  bool              `json:"requiresRoot"`
			Environment   map[string]string `json:"environment,omitempty"`
		}
		if err := parsePayload(cmd.Payload, &params); err != nil {
			result.Status = "failed"
			result.ErrorMessage = "Invalid payload: " + err.Error()
		} else if params.Script == "" {
			result.Status = "failed"
			result.ErrorMessage = "Script content is required"
		} else {
			execResult := m.executors.Script().ExecuteInlineScript(
				params.Script,
				params.OperationType,
				params.RequiresRoot,
				params.Environment,
			)
			result.Status = boolToStatus(execResult.Success)
			result.Result = execResult.Message
			result.ErrorMessage = execResult.ErrorMessage
			result.Output = execResult.Output
		}

	default:
		result.Status = "failed"
		result.ErrorMessage = "Unknown command type: " + cmd.Type
	}

	if err := m.client.ReportCommandResult(cmd.ID, result); err != nil {
		log.Printf("Failed to report command result: %v", err)
	}

	// Update job history
	m.mu.Lock()
	job.Status = result.Status
	job.Result = result.Result
	job.ErrorMessage = result.ErrorMessage
	job.CompletedAt = time.Now()
	job.Duration = formatDuration(job.CompletedAt.Sub(job.StartedAt))

	// Move from active to history
	delete(m.activeJobs, cmd.ID)
	m.jobHistory = append([]JobHistoryEntry{*job}, m.jobHistory...)

	// Trim history if needed
	if len(m.jobHistory) > m.maxJobHistory {
		m.jobHistory = m.jobHistory[:m.maxJobHistory]
	}
	m.mu.Unlock()
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
		ServerURL:         m.config.ServerURL,
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
	ServerURL         string
	LastHeartbeat     time.Time
	LastInventory     time.Time
	LastTelemetry     time.Time
	LastError         string
	ConsecutiveErrors int
}

// JobsStatus represents the current jobs status
type JobsStatus struct {
	ActiveJobs   []JobHistoryEntry `json:"activeJobs"`
	JobHistory   []JobHistoryEntry `json:"jobHistory"`
	TotalPending int               `json:"totalPending"`
	TotalRunning int               `json:"totalRunning"`
}

// GetJobsStatus returns the current jobs status
func (m *Manager) GetJobsStatus() *JobsStatus {
	m.mu.RLock()
	defer m.mu.RUnlock()

	activeJobs := make([]JobHistoryEntry, 0, len(m.activeJobs))
	for _, job := range m.activeJobs {
		activeJobs = append(activeJobs, *job)
	}

	historyCopy := make([]JobHistoryEntry, len(m.jobHistory))
	copy(historyCopy, m.jobHistory)

	return &JobsStatus{
		ActiveJobs:   activeJobs,
		JobHistory:   historyCopy,
		TotalRunning: len(activeJobs),
	}
}

// GetRollbacks returns available rollback options
func (m *Manager) GetRollbacks() ([]models.RollbackInfo, error) {
	return m.executors.Rollback().ListRollbackInfo()
}

// ExecuteRollback executes a rollback operation
func (m *Manager) ExecuteRollback(rollbackID string, force bool) models.ExecutionResult {
	return m.executors.Rollback().ExecuteRollback(rollbackID, force)
}

// formatDuration formats a duration for display
func formatDuration(d time.Duration) string {
	if d < time.Second {
		return fmt.Sprintf("%dms", d.Milliseconds())
	}
	if d < time.Minute {
		return fmt.Sprintf("%.1fs", d.Seconds())
	}
	if d < time.Hour {
		m := int(d.Minutes())
		s := int(d.Seconds()) % 60
		return fmt.Sprintf("%dm %ds", m, s)
	}
	h := int(d.Hours())
	m := int(d.Minutes()) % 60
	return fmt.Sprintf("%dh %dm", h, m)
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
