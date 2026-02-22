package backend

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"os"
	"os/exec"
	"runtime"
	"sort"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"context"
	"github.com/patchify/agent/internal/client"
	"github.com/patchify/agent/internal/collectors"
	"github.com/patchify/agent/internal/config"
	"github.com/patchify/agent/internal/executors"
	"github.com/patchify/agent/internal/metrics"
	"github.com/patchify/agent/internal/models"
	"github.com/patchify/agent/internal/update"
	"github.com/patchify/agent/internal/storage"
	"path/filepath"

	"github.com/prometheus/client_golang/prometheus"
)

// commandPriority defines execution priority for different command types (lower = higher priority)
var commandPriority = map[string]int{
	"agent_update":     1, // Highest priority - agent updates should execute immediately
	"inventory_full":   2,
	"inventory_hardware": 2,
	"inventory_software": 2,
	"inventory_security": 2,
	"patch_install":    3,
	"patch_uninstall":  3,
	"patch_install_all": 3,
	"software_install": 3,
	"software_uninstall": 3,
	"software_upgrade": 3,
	"script_bundle":    4,
	"script_inline":    4,
	"hub_install":      4,
	"hub_update":       4,
	"hub_rollback":     4,
	"hub_uninstall":    4,
	"config_update":    5,
	"remote_access_enable": 5,
	"remote_access_disable": 5,
}


// DownloadProgress tracks the progress of an active download operation.
// It provides real-time metrics including download speed, completion percentage,
// and estimated time remaining.
type DownloadProgress struct {
	ID              string    `json:"id"`              // Unique identifier for the download
	FileName        string    `json:"fileName"`        // Name of the file being downloaded
	TotalBytes      int64     `json:"totalBytes"`      // Total size of the file in bytes
	DownloadedBytes int64     `json:"downloadedBytes"` // Bytes downloaded so far
	Percentage      float64   `json:"percentage"`      // Download completion percentage (0-100)
	Speed           int64     `json:"speed"`           // Current download speed in bytes per second
	StartTime       time.Time `json:"startTime"`       // When the download started
	EstimatedTime   int64     `json:"estimatedTime"`   // Seconds remaining until completion
}

// Manager handles communication with the PatchIQ backend server.
// It manages agent registration, heartbeat synchronization, inventory collection,
// telemetry reporting, and command execution with retry logic and exponential backoff.
type Manager struct {
	config       *config.Config
	client       *client.Client
	collectors   *collectors.CollectorManager
	executors    *executors.ExecutorManager
	agentVersion string

	mu                sync.RWMutex
	registered        bool
	lastHeartbeat     time.Time
	lastInventory     time.Time
	lastTelemetry     time.Time
	lastError         string
	startTime         time.Time
	consecutiveErrors int
	tokenExpiresAt    time.Time

	// Job tracking
	jobStore *storage.JobStore
	activeJobs map[string]*storage.JobHistoryEntry

	stopCh         chan struct{}
	resetHeartbeat chan struct{}
	resetTelemetry chan struct{}
	resetInventory chan struct{}
	wg             sync.WaitGroup

	// Command queue and workers
	commandQueue chan client.PendingCommand
	workers      int // Number of worker goroutines

	// Exponential backoff for heartbeat failures
	backoffDuration time.Duration
	maxBackoff      time.Duration
	backoffMutex    sync.RWMutex

	// Inventory deduplication
	lastInventoryChecksum string
	lastForcedSubmission  time.Time
	inventoryMutex        sync.RWMutex // Protect inventory fields

	// Command retry configuration
	maxRetries int // Number of retry attempts for retryable errors (default: 3)

	// Download progress tracking
	downloadProgress map[string]*DownloadProgress
	progressMutex    sync.RWMutex

	// Atomic flag to prevent concurrent fetchAndExecuteCommands
	fetchingCommands int32

	// Log upload tracking
	heartbeatCount int
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

	// Initialize job store
	// Ensure data directory exists
	if err := os.MkdirAll(cfg.DataDir, 0755); err != nil {
		log.Printf("Warning: Failed to create data directory %s: %v", cfg.DataDir, err)
	}

	dbPath := filepath.Join(cfg.DataDir, "jobs.db")
	log.Printf("Initializing job store at: %s", dbPath)
	jobStore, err := storage.NewJobStore(dbPath)
	if err != nil {
		log.Printf("Warning: Failed to initialize job store: %v (jobs will not persist)", err)
		jobStore = nil
	} else {
		log.Printf("Job store initialized successfully")
	}

	// Initialize client
	httpClient, err := client.New(cfg.ServerURL, agentVersion, proxyConfig)
	if err != nil {
		log.Printf("Warning: Failed to initialize client: %v", err)
		// Create a basic client without proxy config as fallback
		httpClient, _ = client.New(cfg.ServerURL, agentVersion, nil)
	}

	return &Manager{
		jobStore:              jobStore,
		config:                cfg,
		client:                httpClient,
		agentVersion:          agentVersion,
		collectors:            cm,
		executors:             em,
		startTime:             time.Now(),
		stopCh:                make(chan struct{}),
		resetHeartbeat:        make(chan struct{}, 1),
		resetTelemetry:        make(chan struct{}, 1),
		resetInventory:        make(chan struct{}, 1),
		activeJobs:            make(map[string]*storage.JobHistoryEntry),
		commandQueue:          make(chan client.PendingCommand, 500), // Buffer size: 500
		workers:               3,                                     // Default: 3 concurrent workers
		maxRetries:            3,                                     // Default: 3 retry attempts for transient failures
		backoffDuration:       0,
		maxBackoff:            5 * time.Minute,
		lastInventoryChecksum: "",
		lastForcedSubmission:  time.Time{},
		downloadProgress:      make(map[string]*DownloadProgress),
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

	// Start command worker pool
	for i := 0; i < m.workers; i++ {
		m.wg.Add(1)
		go m.commandWorker(i)
	}

	// Start background loops
	m.wg.Add(4)
	go m.heartbeatLoop()
	go m.inventoryLoop()
	go m.telemetryLoop()
	go m.cleanupJobsLoop()

	return nil
}

// Stop gracefully stops all backend communication with a 30-second timeout
func (m *Manager) Stop() error {
	log.Println("Initiating shutdown...")

	// Close command queue (signals workers to stop after draining)
	if m.commandQueue != nil {
		close(m.commandQueue)
	}

	// Signal all goroutines to stop
	close(m.stopCh)

	// Wait for graceful shutdown with timeout
	done := make(chan struct{})
	go func() {
		m.wg.Wait() // Wait for all goroutines to finish
		close(done)
	}()

	select {
	case <-done:
		log.Println("Clean shutdown completed")
		
		// Close job store
		if m.jobStore != nil {
			if err := m.jobStore.Close(); err != nil {
				log.Printf("Failed to close job store: %v", err)
			}
		}
		
		return nil
	case <-time.After(30 * time.Second):
		log.Println("Warning: Shutdown timeout after 30s, forcing exit")
		return fmt.Errorf("shutdown timeout exceeded")
	}
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

				// Apply exponential backoff
				m.backoffMutex.Lock()
				if m.backoffDuration == 0 {
					m.backoffDuration = 5 * time.Second
				} else {
					m.backoffDuration = m.backoffDuration * 2
					if m.backoffDuration > m.maxBackoff {
						m.backoffDuration = m.maxBackoff
					}
				}

				// Add jitter (±10%)
				jitterRange := float64(m.backoffDuration) * 0.1
				jitter := time.Duration(rand.Float64()*2*jitterRange - jitterRange)
				actualBackoff := m.backoffDuration + jitter

				// Update backoff duration metric
				metrics.BackoffDuration.Set(m.backoffDuration.Seconds())
				m.backoffMutex.Unlock()

				log.Printf("Heartbeat failed, backing off for %v", actualBackoff)

				// Sleep with backoff, but remain responsive to stop signal
				select {
				case <-time.After(actualBackoff):
				case <-m.stopCh:
					return
				}

			} else {
				// Success - reset backoff
				m.backoffMutex.Lock()
				if m.backoffDuration > 0 {
					log.Println("Heartbeat recovered, resetting backoff")
					m.backoffDuration = 0
				}
				m.backoffMutex.Unlock()

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
	// Start heartbeat duration timer
	timer := prometheus.NewTimer(metrics.HeartbeatDuration)
	defer timer.ObserveDuration()

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
		// Increment heartbeat failures counter
		metrics.HeartbeatFailures.Inc()
		return err
	}

	// Increment heartbeat success counter and reset backoff
	metrics.HeartbeatSuccess.Inc()
	metrics.BackoffDuration.Set(0)

	m.mu.Lock()
	m.lastHeartbeat = time.Now()
	m.heartbeatCount++
	count := m.heartbeatCount
	m.mu.Unlock()

	// Upload logs every 10th heartbeat or when there's an error
	if count%10 == 0 || lastErr != "" {
		go m.uploadLogs()
	}

	// Handle response flags
	if resp.CommandsPending {
		if atomic.CompareAndSwapInt32(&m.fetchingCommands, 0, 1) {
			go func() {
				defer atomic.StoreInt32(&m.fetchingCommands, 0)
				m.fetchAndExecuteCommands()
			}()
		}
	}

	if resp.ConfigUpdated {
		log.Println("Config update signaled by backend, fetching new config...")
		go m.fetchAndUpdateConfig()
	}

	if resp.InventoryRequested {
		go m.submitInventoryNow(true) // Force on backend request
	}

	return nil
}

func (m *Manager) fetchAndUpdateConfig() {
	cfg, err := m.client.GetConfig()
	if err != nil {
		log.Printf("Failed to fetch config update: %v", err)
		return
	}
	m.config.HeartbeatInterval = cfg.HeartbeatIntervalSeconds
	m.config.TelemetryInterval = cfg.TelemetryIntervalSeconds
	log.Printf("Config updated: heartbeat=%ds, telemetry=%ds", cfg.HeartbeatIntervalSeconds, cfg.TelemetryIntervalSeconds)
}

func (m *Manager) uploadLogs() {
	logPath := filepath.Join(m.config.DataDir, "agent.log")

	data, err := os.ReadFile(logPath)
	if err != nil {
		log.Printf("No log file to upload: %v", err)
		return
	}

	lines := strings.Split(string(data), "\n")
	startIdx := 0
	if len(lines) > 500 {
		startIdx = len(lines) - 500
	}
	logContent := strings.Join(lines[startIdx:], "\n")

	hostname, _ := os.Hostname()
	payload := map[string]interface{}{
		"logs":         logContent,
		"agentVersion": m.agentVersion,
		"os":           runtime.GOOS,
		"architecture": runtime.GOARCH,
		"hostname":     hostname,
		"timestamp":    time.Now().UTC().Format(time.RFC3339),
	}

	if err := m.client.PostJSON("/logs", payload); err != nil {
		log.Printf("Failed to upload logs: %v", err)
	} else {
		log.Println("Logs uploaded successfully")
	}
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
	m.submitInventoryNow(false) // Initial inventory

	// Then every 6 hours (or as configured)
	interval := time.Duration(m.config.InventoryInterval) * time.Second
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			m.submitInventoryNow(false) // Periodic inventory
		case <-m.resetInventory:
			ticker.Reset(time.Duration(m.config.InventoryInterval) * time.Second)
			log.Printf("Inventory interval updated to %ds", m.config.InventoryInterval)
		case <-m.stopCh:
			return
		}
	}
}

func (m *Manager) submitInventoryNow(force bool) {
	// Start inventory duration timer
	timer := prometheus.NewTimer(metrics.InventoryDuration)
	defer timer.ObserveDuration()

	if !m.client.IsRegistered() {
		return
	}

	log.Println("Collecting inventory...")
	start := time.Now()

	inventory := m.collectors.CollectAll()

	req := &client.InventoryRequest{
		CollectedAt: time.Now().UTC().Format(time.RFC3339),
		Hardware:    inventory.Hardware,
		Software:    inventory.Software,
		Network:     inventory.Network,
		Security:    inventory.Security,
		Peripherals: inventory.Peripherals,
	}

	// Compute SHA256 checksum of inventory
	data, err := json.Marshal(req)
	if err != nil {
		log.Printf("Failed to marshal inventory: %v", err)
		return
	}

	checksum := sha256.Sum256(data)
	checksumStr := hex.EncodeToString(checksum[:])

	// Check if we should skip submission
	m.inventoryMutex.RLock()
	shouldSkip := checksumStr == m.lastInventoryChecksum &&
		!force &&
		time.Since(m.lastForcedSubmission) < 24*time.Hour
	lastChecksum := m.lastInventoryChecksum
	m.inventoryMutex.RUnlock()

	if shouldSkip {
		log.Printf("Inventory unchanged (checksum: %s...), skipping submission",
			checksumStr[:8])
		// Increment inventory skipped counter
		metrics.InventorySkipped.Inc()
		return
	}

	// Log reason for submission
	if force {
		log.Println("Forcing inventory submission (manual trigger)")
	} else if time.Since(m.lastForcedSubmission) >= 24*time.Hour {
		log.Println("Forcing inventory submission (24h periodic)")
	} else if lastChecksum == "" {
		log.Println("First inventory submission")
	} else {
		log.Printf("Inventory changed (old: %s..., new: %s...), submitting",
			lastChecksum[:8], checksumStr[:8])
	}

	if err := m.client.SubmitInventory(req); err != nil {
		log.Printf("Failed to submit inventory: %v", err)
		return
	}

	// Increment inventory submissions counter
	metrics.InventorySubmissions.Inc()

	// Update checksum and forced timestamp
	m.inventoryMutex.Lock()
	m.lastInventoryChecksum = checksumStr
	if force || time.Since(m.lastForcedSubmission) >= 24*time.Hour {
		m.lastForcedSubmission = time.Now()
	}
	m.inventoryMutex.Unlock()

	m.mu.Lock()
	m.lastInventory = time.Now()
	m.mu.Unlock()

	duration := time.Since(start)
	log.Printf("Inventory submitted successfully (checksum: %s..., duration: %v)",
		checksumStr[:8], duration)
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
		CollectedAt:      time.Now().UTC().Format(time.RFC3339),
		CPU:              telemetry.CPU,
		Memory:           telemetry.Memory,
		Disk:             telemetry.Disk,
		Network:          telemetry.Network,
		Processes:        telemetry.Processes,
		SystemUptime:     telemetry.SystemUptime,
		Thermal:          telemetry.Thermal,
		Power:            telemetry.Power,
		AgentUtilization: telemetry.AgentUtilization,
		SystemErrors:     telemetry.SystemErrors,
	}

	if err := m.client.SubmitTelemetry(req); err != nil {
		log.Printf("Failed to submit telemetry: %v", err)
		return
	}

	m.mu.Lock()
	m.lastTelemetry = time.Now()
	m.mu.Unlock()
}

// commandWorker processes commands from the command queue
func (m *Manager) commandWorker(workerID int) {
	defer m.wg.Done()

	log.Printf("Command worker %d started", workerID)

	for {
		select {
		case cmd, ok := <-m.commandQueue:
			if !ok {
				log.Printf("Command worker %d stopped (queue closed)", workerID)
				return
			}

			log.Printf("Worker %d executing command %s (type: %s)",
				workerID, cmd.ID, cmd.Type)

			// Execute command
			m.executeCommandWithRetry(cmd)

		case <-m.stopCh:
			log.Printf("Command worker %d stopped (shutdown signal)", workerID)
			return
		}
	}
}

func (m *Manager) fetchAndExecuteCommands() {
	commands, err := m.client.GetPendingCommands()
	if err != nil {
		log.Printf("Failed to fetch commands: %v", err)
		return
	}

	if len(commands) == 0 {
		return
	}

	// Sort commands by priority (lower number = higher priority)
	sort.Slice(commands, func(i, j int) bool {
		priI, okI := commandPriority[commands[i].Type]
		priJ, okJ := commandPriority[commands[j].Type]

		// Commands with defined priority come first
		if okI && !okJ {
			return true
		}
		if !okI && okJ {
			return false
		}

		// Both have priority - compare values
		if okI && okJ {
			if priI != priJ {
				return priI < priJ
			}
		}

		// Same priority or both undefined - maintain order (FIFO)
		return false
	})

	log.Printf("Fetched %d commands, processing in priority order", len(commands))

	for _, cmd := range commands {
		pri, ok := commandPriority[cmd.Type]
		if ok {
			log.Printf("Queuing command %s (type: %s, priority: %d)", cmd.ID, cmd.Type, pri)
		} else {
			log.Printf("Queuing command %s (type: %s, priority: default)", cmd.ID, cmd.Type)
		}

		select {
		case m.commandQueue <- cmd:
			log.Printf("Command %s queued successfully", cmd.ID)
			// Update command queue size metric
			metrics.CommandQueueSize.Set(float64(len(m.commandQueue)))
		default:
			// Queue full - log warning and report error to backend
			log.Printf("Warning: Command queue full, dropping command %s (type: %s)",
				cmd.ID, cmd.Type)

			// Increment commands dropped counter
			metrics.CommandsDropped.Inc()

			// Report failure to backend
			result := &client.CommandResultRequest{
				Status:       "failed",
				ErrorMessage: "Command queue full",
			}
			m.reportCommandResult(cmd.ID, result)
		}
	}
}


// executeCommandWithRetry wraps command execution with intelligent retry logic for transient failures
func (m *Manager) executeCommandWithRetry(cmd client.PendingCommand) {
	// Start command duration timer
	timer := prometheus.NewTimer(metrics.CommandDuration.WithLabelValues(cmd.Type))
	defer timer.ObserveDuration()

	var lastResult *client.CommandResultRequest

	for attempt := 1; attempt <= m.maxRetries; attempt++ {
		// Execute command and get result
		result := m.executeCommandInternal(cmd)
		lastResult = result

		// Success - report and return
		if result.Status == "completed" {
			if attempt > 1 {
				log.Printf("Command %s succeeded on attempt %d/%d", cmd.ID, attempt, m.maxRetries)
			}
			// Increment commands executed counter with success status
			metrics.CommandsExecuted.WithLabelValues(cmd.Type, "completed").Inc()
			m.reportCommandResult(cmd.ID, result)
			m.updateJobHistory(cmd.ID, result)
			// Update command queue size after execution
			metrics.CommandQueueSize.Set(float64(len(m.commandQueue)))
			return
		}

		// Check if error is retryable
		isRetryable := m.isRetryableError(result.ErrorMessage)

		// Non-retryable error - report and return
		if !isRetryable {
			log.Printf("Command %s failed with non-retryable error: %s", cmd.ID, result.ErrorMessage)
			// Increment commands executed counter with failed status
			metrics.CommandsExecuted.WithLabelValues(cmd.Type, "failed").Inc()
			m.reportCommandResult(cmd.ID, result)
			m.updateJobHistory(cmd.ID, result)
			// Update command queue size after execution
			metrics.CommandQueueSize.Set(float64(len(m.commandQueue)))
			return
		}

		// Last attempt - report failure and return
		if attempt >= m.maxRetries {
			log.Printf("Command %s failed after %d attempts: %s", cmd.ID, m.maxRetries, result.ErrorMessage)
			// Increment commands executed counter with failed status
			metrics.CommandsExecuted.WithLabelValues(cmd.Type, "failed").Inc()
			m.reportCommandResult(cmd.ID, result)
			m.updateJobHistory(cmd.ID, result)
			// Update command queue size after execution
			metrics.CommandQueueSize.Set(float64(len(m.commandQueue)))
			return
		}

		// Calculate exponential backoff (1s, 2s, 4s, ...)
		backoff := time.Duration(1<<uint(attempt-1)) * time.Second
		log.Printf("Command %s failed (attempt %d/%d), retrying in %v: %s",
			cmd.ID, attempt, m.maxRetries, backoff, result.ErrorMessage)

		time.Sleep(backoff)
	}

	// Fallback - should never reach here
	if lastResult != nil {
		// Increment commands executed counter with failed status
		metrics.CommandsExecuted.WithLabelValues(cmd.Type, "failed").Inc()
		m.reportCommandResult(cmd.ID, lastResult)
		m.updateJobHistory(cmd.ID, lastResult)
		// Update command queue size after execution
		metrics.CommandQueueSize.Set(float64(len(m.commandQueue)))
	}
}

// isRetryableError determines if an error message indicates a transient failure
func (m *Manager) isRetryableError(errMsg string) bool {
	if errMsg == "" {
		return false
	}
	
	errLower := strings.ToLower(errMsg)
	
	// Check for known retryable error patterns
	retryablePatterns := []string{
		"timeout",
		"timed out",
		"deadline exceeded",
		"network",
		"connection refused",
		"connection reset",
		"connection timed out",
		"temporary failure",
		"service unavailable",
		"502 bad gateway",
		"503 service unavailable",
		"504 gateway timeout",
		"dial tcp",
		"no route to host",
		"host is down",
	}
	
	for _, pattern := range retryablePatterns {
		if strings.Contains(errLower, pattern) {
			return true
		}
	}
	
	return false
}

// updateJobHistory updates the job tracking information
func (m *Manager) updateJobHistory(commandID string, result *client.CommandResultRequest) {
	m.mu.Lock()
	defer m.mu.Unlock()
	
	job, exists := m.activeJobs[commandID]
	if !exists {
		return
	}
	
	job.Status = result.Status
	if result.Result != "" {
		job.Result = map[string]interface{}{"message": result.Result}
	}
	job.ErrorMessage = result.ErrorMessage
	completedTime := time.Now()
	job.CompletedAt = &completedTime
	
	// Move from active to history and persist
	delete(m.activeJobs, commandID)
	
	// Save to persistent store
	if m.jobStore != nil {
		if err := m.jobStore.Save(*job); err != nil {
			log.Printf("Failed to save job %s to store: %v", job.ID, err)
		}
	}
}

func (m *Manager) executeCommandInternal(cmd client.PendingCommand) *client.CommandResultRequest {
	// Start tracking this job
	job := &storage.JobHistoryEntry{
		ID:        cmd.ID,
		Type:      cmd.Type,
		Payload:   func() map[string]interface{} {
			if p, ok := cmd.Payload.(map[string]interface{}); ok {
				return p
			}
			return nil
		}(),
		Status:    "in_progress",
		StartedAt: time.Now(),
	}

	m.mu.Lock()
	m.activeJobs[cmd.ID] = job
	m.mu.Unlock()

	// Create context with configured timeout
	timeout := time.Duration(m.config.CommandTimeoutSeconds) * time.Second
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	result := &client.CommandResultRequest{
		Status: "completed",
	}

	switch cmd.Type {
	case "inventory_full", "inventory_hardware", "inventory_software", "inventory_security":
		m.submitInventoryNow(true) // Force on manual command
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
				PatchID        string `json:"patchId"`
				KBNumber       string `json:"kbNumber"`
				PackageName    string `json:"packageName"`
				DownloadURL    string `json:"downloadUrl"`
				Checksum       string `json:"checksum"`
				ChecksumType   string `json:"checksumType"`
				RebootRequired bool   `json:"rebootRequired"`
				ForceReboot    bool   `json:"forceReboot"`
			} `json:"patches"`
		}
		var singleParams struct {
			PatchID string              `json:"patchId"`
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
				execResult := m.executors.Patch().InstallPatch(ctx, patchID, opts)
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
			execResult := m.executors.Patch().InstallPatch(ctx, singleParams.PatchID, singleParams.Options)
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
			execResult := m.executors.Patch().UninstallPatch(ctx, params.PatchID)
			result.Status = boolToStatus(execResult.Success)
			result.Result = execResult.Message
			result.ErrorMessage = execResult.ErrorMessage
		}

	case "patch_install_all":
		var params struct {
			Options models.PatchOptions `json:"options"`
		}
		parsePayload(cmd.Payload, &params) // Options are optional
		execResult := m.executors.Patch().InstallAllPatches(ctx, params.Options)
		result.Status = boolToStatus(execResult.Success)
		result.Result = execResult.Message
		result.ErrorMessage = execResult.ErrorMessage

	case "patch_list":
		patches, err := m.executors.Patch().ListAvailablePatches(ctx)
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
			rollbackInfo, _ := m.executors.Rollback().CreateRollbackInfoForInstall(ctx,
				params.Name, params.Source, cmd.ID, m.executors.Software())

			// Execute installation
			execResult := m.executors.Software().InstallSoftware(ctx, params)
			result.Status = boolToStatus(execResult.Success)
			result.Result = execResult.Message
			result.ErrorMessage = execResult.ErrorMessage

			// Save rollback info if installation succeeded
			if execResult.Success && rollbackInfo != nil {
				// Get installed version
				if version, err := m.executors.Software().GetInstalledVersion(ctx, params.Name); err == nil {
					rollbackInfo.InstalledVersion = version
				}
				m.executors.Rollback().SaveRollbackInfo(ctx, *rollbackInfo)
			}
		}

	case "software_upgrade":
		var params models.SoftwarePackage
		if err := parsePayload(cmd.Payload, &params); err != nil {
			result.Status = "failed"
			result.ErrorMessage = "Invalid payload: " + err.Error()
		} else {
			execResult := m.executors.Software().UpgradeSoftware(ctx, params)
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
			execResult := m.executors.Software().UninstallSoftware(ctx, params.Name)
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
			execResult := m.executors.Rollback().ExecuteRollback(ctx, params.RollbackID, params.Force)
			result.Status = boolToStatus(execResult.Success)
			result.Result = execResult.Message
			result.ErrorMessage = execResult.ErrorMessage
		}

	case "rollback_list":
		rollbacks, err := m.executors.Rollback().ListRollbackInfo(ctx)
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
		execResult := m.executors.RemoteAccess().Enable(ctx, params)
		result.Status = boolToStatus(execResult.Success)
		result.Result = execResult.Message
		result.ErrorMessage = execResult.ErrorMessage

	case "remote_access_disable":
		execResult := m.executors.RemoteAccess().Disable(ctx)
		result.Status = boolToStatus(execResult.Success)
		result.Result = execResult.Message
		result.ErrorMessage = execResult.ErrorMessage

	case "remote_access_status":
		status := m.executors.RemoteAccess().GetStatus(ctx)
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
			execResult := m.executors.RemoteAccess().SetPassword(ctx, params.Password)
			result.Status = boolToStatus(execResult.Success)
			result.Result = execResult.Message
			result.ErrorMessage = execResult.ErrorMessage
		}

	// Reboot check
	case "check_reboot_required":
		rebootRequired := m.executors.Patch().CheckRebootRequired(ctx)
		result.Result = fmt.Sprintf(`{"rebootRequired":%t}`, rebootRequired)

	// Script bundle commands (Hub-centric approach)
	case "script_bundle", "hub_install", "hub_update", "hub_rollback", "hub_uninstall", "hub_patch_install", "hub_patch_rollback", "hub_patch_verify":
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
				case "hub_patch_verify":
					params.OperationType = "verify"
				default:
					params.OperationType = "install" // default
				}
			}

			// Create rollback info before installation (for install/update operations)
			var rollbackInfo *models.RollbackInfo
			if params.OperationType == "install" || params.OperationType == "update" {
				rollbackInfo, _ = m.executors.Rollback().CreateRollbackInfoForInstall(ctx,
					params.PackageName, "script_bundle", cmd.ID, m.executors.Software())
			}

			// Execute script bundle
			execResult := m.executors.Script().ExecuteBundle(ctx, params)
			result.Status = boolToStatus(execResult.Success)
			result.Result = execResult.Message
			result.ErrorMessage = execResult.ErrorMessage
			result.Output = execResult.Output

			// Save rollback info if successful
			if execResult.Success && rollbackInfo != nil {
				rollbackInfo.InstalledVersion = params.Version
				rollbackInfo.SupportsRollback = params.Manifest != nil && params.Manifest.Scripts.Rollback != ""
				m.executors.Rollback().SaveRollbackInfo(ctx, *rollbackInfo)
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
			execResult := m.executors.Script().ExecuteInlineScript(ctx,
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

	// Agent self-update
	case "agent_update":
		var params update.Request
		if err := parsePayload(cmd.Payload, &params); err != nil {
			result.Status = "failed"
			result.ErrorMessage = "Invalid payload: " + err.Error()
		} else {
			updateResult := update.Perform(params)
			if updateResult.Success {
				result.Status = "completed"
				result.Result = updateResult.Message
				// Report result before exiting — os.Exit prevents the retry wrapper from reporting
				m.reportCommandResult(cmd.ID, result)
				log.Printf("[Update] Result reported. Exiting for restart...")
				time.Sleep(1 * time.Second)
				os.Exit(0)
				return result // unreachable but satisfies return type
			}
			result.Status = "failed"
			result.ErrorMessage = updateResult.ErrorMessage
		}

	default:
		result.Status = "failed"
		result.ErrorMessage = "Unknown command type: " + cmd.Type
	}

	// Return the result (job tracking and reporting handled by executeCommandWithRetry)
	return result
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

// reportCommandResult reports command execution result to backend
func (m *Manager) reportCommandResult(commandID string, result *client.CommandResultRequest) {
	if err := m.client.ReportCommandResult(commandID, result); err != nil {
		log.Printf("Failed to report command result for %s: %v", commandID, err)
	} else {
		log.Printf("Successfully reported result for command %s (status: %s)", commandID, result.Status)
	}
}

// boolToStatus converts boolean success to status string
func boolToStatus(success bool) string {
	if success {
		return "completed"
	}
	return "failed"
}

// GetStatus returns the current backend communication status
func (m *Manager) GetStatus(ctx context.Context) *Status {
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
	ActiveJobs   []storage.JobHistoryEntry `json:"activeJobs"`
	JobHistory   []storage.JobHistoryEntry `json:"jobHistory"`
	TotalPending int               `json:"totalPending"`
	TotalRunning int               `json:"totalRunning"`
}

// GetJobsStatus returns the current jobs status
func (m *Manager) GetJobsStatus() *JobsStatus {
	m.mu.RLock()
	activeJobs := make([]storage.JobHistoryEntry, 0, len(m.activeJobs))
	for _, job := range m.activeJobs {
		activeJobs = append(activeJobs, *job)
	}
	m.mu.RUnlock()

	// Get job history from store
	var jobHistory []storage.JobHistoryEntry
	if m.jobStore != nil {
		history, err := m.jobStore.List(100, 0)
		if err != nil {
			log.Printf("Failed to get job history: %v", err)
			jobHistory = []storage.JobHistoryEntry{}
		} else {
			jobHistory = history
		}
	} else {
		jobHistory = []storage.JobHistoryEntry{}
	}

	return &JobsStatus{
		ActiveJobs:   activeJobs,
		JobHistory:   jobHistory,
		TotalRunning: len(activeJobs),
	}
}

// GetRollbacks returns available rollback options
func (m *Manager) GetRollbacks(ctx context.Context) ([]models.RollbackInfo, error) {
	return m.executors.Rollback().ListRollbackInfo(ctx)
}

// ExecuteRollback executes a rollback operation
func (m *Manager) ExecuteRollback(ctx context.Context, rollbackID string, force bool) models.ExecutionResult {
	return m.executors.Rollback().ExecuteRollback(ctx, rollbackID, force)
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
		osName := "MACOS"
		osVersion := ""
		if out, err := exec.Command("sw_vers", "-productVersion").Output(); err == nil {
			osVersion = strings.TrimSpace(string(out))
		}
		return osName, osVersion

	case "linux":
		osName := "LINUX"
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
		return "WINDOWS", ""

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

// cleanupJobsLoop periodically cleans up old jobs based on retention policy
func (m *Manager) cleanupJobsLoop() {
	defer m.wg.Done()

	ticker := time.NewTicker(24 * time.Hour)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			if m.jobStore != nil {
				deleted, err := m.jobStore.Cleanup(m.config.JobRetentionDays)
				if err != nil {
					log.Printf("Failed to cleanup old jobs: %v", err)
				} else if deleted > 0 {
					log.Printf("Cleaned up %d jobs older than %d days", deleted, m.config.JobRetentionDays)
				}
			}
		case <-m.stopCh:
			return
		}
	}
}

// GetDownloadProgress returns current download progress for all active downloads.
// Returns a thread-safe copy of the download progress map to avoid race conditions.
func (m *Manager) GetDownloadProgress() map[string]*DownloadProgress {
	m.progressMutex.RLock()
	defer m.progressMutex.RUnlock()

	// Create a copy to avoid race conditions
	result := make(map[string]*DownloadProgress, len(m.downloadProgress))
	for k, v := range m.downloadProgress {
		// Deep copy the progress
		progress := *v
		result[k] = &progress
	}
	return result
}

// UpdateDownloadProgress updates progress metrics for a specific download.
// Creates a new progress entry if one doesn't exist. Calculates percentage
// and estimated time remaining based on current speed.
func (m *Manager) UpdateDownloadProgress(id string, downloaded, total int64, speed float64) {
	m.progressMutex.Lock()
	defer m.progressMutex.Unlock()

	progress, exists := m.downloadProgress[id]
	if !exists {
		// Create new progress entry
		progress = &DownloadProgress{
			ID:        id,
			StartTime: time.Now(),
		}
		m.downloadProgress[id] = progress
	}

	progress.DownloadedBytes = downloaded
	progress.TotalBytes = total
	progress.Speed = int64(speed)

	if total > 0 {
		progress.Percentage = float64(downloaded) / float64(total) * 100
	}

	// Calculate ETA
	if speed > 0 && total > downloaded {
		remaining := total - downloaded
		progress.EstimatedTime = int64(float64(remaining) / speed)
	} else {
		progress.EstimatedTime = 0
	}
}

// RemoveDownloadProgress removes a completed or failed download from tracking.
// Should be called after a download completes or fails to clean up progress state.
func (m *Manager) RemoveDownloadProgress(id string) {
	m.progressMutex.Lock()
	defer m.progressMutex.Unlock()

	delete(m.downloadProgress, id)
}
