package server

import (
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/patchify/agent/internal/collectors"
	"github.com/patchify/agent/internal/config"
	"github.com/patchify/agent/internal/models"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"golang.org/x/crypto/bcrypt"
)

//go:embed templates/*
var templatesFS embed.FS

// BackendStatusInfo represents current backend connection status
type BackendStatusInfo struct {
	Registered        bool
	AgentID           string
	ServerURL         string
	LastHeartbeat     time.Time
	LastInventory     time.Time
	LastTelemetry     time.Time
	LastError         string
	ConsecutiveErrors int
}

// JobHistoryEntry represents a completed job/command
type JobHistoryEntry struct {
	ID           string      `json:"id"`
	Type         string      `json:"type"`
	Payload      interface{} `json:"payload,omitempty"`
	Status       string      `json:"status"`
	Result       string      `json:"result,omitempty"`
	ErrorMessage string      `json:"errorMessage,omitempty"`
	StartedAt    time.Time   `json:"startedAt"`
	CompletedAt  time.Time   `json:"completedAt,omitempty"`
	Duration     string      `json:"duration,omitempty"`
}

// JobsStatus represents the current jobs status
type JobsStatus struct {
	ActiveJobs   []JobHistoryEntry `json:"activeJobs"`
	JobHistory   []JobHistoryEntry `json:"jobHistory"`
	TotalPending int               `json:"totalPending"`
	TotalRunning int               `json:"totalRunning"`
}

// RollbackInfo represents information about a rollback option
type RollbackInfo struct {
	ID               string `json:"id"`
	PackageName      string `json:"packageName"`
	PreviousVersion  string `json:"previousVersion,omitempty"`
	InstalledVersion string `json:"installedVersion"`
	InstallSource    string `json:"installSource"`
	WasInstalled     bool   `json:"wasInstalled"`
	InstalledAt      string `json:"installedAt"`
	CommandID        string `json:"commandId,omitempty"`
	SupportsRollback bool   `json:"supportsRollback"`
}

// ExecutionResult represents the result of an execution
type ExecutionResult struct {
	Success      bool   `json:"success"`
	Message      string `json:"message"`
	ErrorMessage string `json:"errorMessage,omitempty"`
}

// DownloadProgress tracks the progress of an active download
type DownloadProgress struct {
	ID              string    `json:"id"`
	FileName        string    `json:"fileName"`
	TotalBytes      int64     `json:"totalBytes"`
	DownloadedBytes int64     `json:"downloadedBytes"`
	Percentage      float64   `json:"percentage"`
	Speed           int64     `json:"speed"` // bytes per second
	StartTime       time.Time `json:"startTime"`
	EstimatedTime   int64     `json:"estimatedTime"` // seconds remaining
}

// BackendStatus interface for accessing backend manager status
type BackendStatus interface {
	IsRegistered() bool
	GetAgentID() string
	GetStatus(ctx context.Context) *BackendStatusInfo
	GetJobsStatus() *JobsStatus
	GetRollbacks(ctx context.Context) ([]RollbackInfo, error)
	ExecuteRollback(ctx context.Context, rollbackID string, force bool) ExecutionResult
	GetDownloadProgress() map[string]*DownloadProgress
}

// Server represents the agent web server
type Server struct {
	config     *config.Config
	collectors *collectors.CollectorManager
	templates  *template.Template
	backendMgr BackendStatus

	// Cached data
	mu            sync.RWMutex
	lastInventory *models.FullInventory
	lastTelemetry *models.Telemetry
	agentInfo     *models.AgentInfo
	startTime     time.Time
}

// New creates a new server instance
func New(cfg *config.Config) (*Server, error) {
	// Parse templates with functions
	funcMap := template.FuncMap{
		"json": func(v interface{}) string {
			b, _ := json.MarshalIndent(v, "", "  ")
			return string(b)
		},
		"divf": func(a, b int64) float64 {
			if b == 0 {
				return 0
			}
			return float64(a) / float64(b)
		},
	}

	tmpl, err := template.New("").Funcs(funcMap).ParseFS(templatesFS, "templates/*.html")
	if err != nil {
		return nil, fmt.Errorf("failed to parse templates: %w", err)
	}

	s := &Server{
		config:     cfg,
		collectors: collectors.NewCollectorManager(),
		templates:  tmpl,
		startTime:  time.Now(),
	}

	// Initialize agent info
	s.agentInfo = s.getAgentInfo()

	return s, nil
}

// basicAuthMiddleware implements HTTP Basic Authentication for WebUI
func (s *Server) basicAuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip auth if disabled
		if !s.config.EnableWebUIAuth {
			next.ServeHTTP(w, r)
			return
		}

		// Get credentials from request
		username, password, ok := r.BasicAuth()
		if !ok {
			w.Header().Set("WWW-Authenticate", `Basic realm="PatchIQ Agent"`)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Check username
		if username != s.config.WebUIUsername {
			w.Header().Set("WWW-Authenticate", `Basic realm="PatchIQ Agent"`)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Check password hash
		if err := bcrypt.CompareHashAndPassword([]byte(s.config.WebUIPasswordHash), []byte(password)); err != nil {
			w.Header().Set("WWW-Authenticate", `Basic realm="PatchIQ Agent"`)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Authentication successful
		next.ServeHTTP(w, r)
	})
}

// Start starts the HTTP server
func (s *Server) Start() error {
	mux := http.NewServeMux()

	// Web UI routes (protected by auth middleware)
	mux.Handle("/", s.basicAuthMiddleware(http.HandlerFunc(s.handleDashboard)))
	mux.Handle("/hardware", s.basicAuthMiddleware(http.HandlerFunc(s.handleHardware)))
	mux.Handle("/software", s.basicAuthMiddleware(http.HandlerFunc(s.handleSoftware)))
	mux.Handle("/network", s.basicAuthMiddleware(http.HandlerFunc(s.handleNetwork)))
	mux.Handle("/security", s.basicAuthMiddleware(http.HandlerFunc(s.handleSecurity)))
	mux.Handle("/peripherals", s.basicAuthMiddleware(http.HandlerFunc(s.handlePeripherals)))
	mux.Handle("/telemetry", s.basicAuthMiddleware(http.HandlerFunc(s.handleTelemetryPage)))
	mux.Handle("/jobs", s.basicAuthMiddleware(http.HandlerFunc(s.handleJobs)))
	mux.Handle("/settings", s.basicAuthMiddleware(http.HandlerFunc(s.handleSettings)))

	// API routes (protected by auth middleware)
	mux.Handle("/api/collect", s.basicAuthMiddleware(http.HandlerFunc(s.handleCollect)))
	mux.Handle("/api/collect/hardware", s.basicAuthMiddleware(http.HandlerFunc(s.handleCollectHardware)))
	mux.Handle("/api/collect/software", s.basicAuthMiddleware(http.HandlerFunc(s.handleCollectSoftware)))
	mux.Handle("/api/collect/network", s.basicAuthMiddleware(http.HandlerFunc(s.handleCollectNetwork)))
	mux.Handle("/api/collect/security", s.basicAuthMiddleware(http.HandlerFunc(s.handleCollectSecurity)))
	mux.Handle("/api/collect/peripherals", s.basicAuthMiddleware(http.HandlerFunc(s.handleCollectPeripherals)))
	mux.Handle("/api/collect/telemetry", s.basicAuthMiddleware(http.HandlerFunc(s.handleCollectTelemetry)))
	mux.Handle("/api/inventory", s.basicAuthMiddleware(http.HandlerFunc(s.handleGetInventory)))
	mux.Handle("/api/telemetry", s.basicAuthMiddleware(http.HandlerFunc(s.handleGetTelemetry)))
	mux.Handle("/api/agent", s.basicAuthMiddleware(http.HandlerFunc(s.handleGetAgent)))
	mux.Handle("/api/config", s.basicAuthMiddleware(http.HandlerFunc(s.handleGetConfig)))
	mux.Handle("/api/status", s.basicAuthMiddleware(http.HandlerFunc(s.handleGetStatus)))
	mux.Handle("/api/jobs", s.basicAuthMiddleware(http.HandlerFunc(s.handleGetJobs)))
	mux.Handle("/api/rollbacks", s.basicAuthMiddleware(http.HandlerFunc(s.handleGetRollbacks)))
	mux.Handle("/api/rollbacks/execute", s.basicAuthMiddleware(http.HandlerFunc(s.handleExecuteRollback)))
	mux.Handle("/api/downloads", s.basicAuthMiddleware(http.HandlerFunc(s.handleGetDownloads)))

	// Telemetry SSE stream (protected by auth)
	mux.Handle("/api/telemetry/stream", s.basicAuthMiddleware(http.HandlerFunc(s.handleTelemetryStream)))

	// Public endpoints (no auth required)
	// Metrics endpoint for Prometheus
	mux.Handle("/metrics", promhttp.Handler())
	// Health endpoint (enhanced for update verification)
	mux.HandleFunc("/health", s.handleHealth)

	// Try configured port, then fallback to next ports if busy
	port := s.config.WebUIPort
	for i := 0; i < 10; i++ {
		addr := fmt.Sprintf(":%d", port)
		ln, err := net.Listen("tcp", addr)
		if err != nil {
			log.Printf("Port %d in use, trying %d...", port, port+1)
			port++
			continue
		}
		log.Printf("Starting agent web UI on http://localhost:%d", port)
		return http.Serve(ln, mux)
	}
	return fmt.Errorf("could not find an available port (tried %d-%d)", s.config.WebUIPort, port-1)
}

// SetBackendManager sets the backend manager for status display
func (s *Server) SetBackendManager(mgr BackendStatus) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.backendMgr = mgr
}

// StartBackgroundCollection starts background data collection
func (s *Server) StartBackgroundCollection() {
	// Initial collection
	go func() {
		time.Sleep(2 * time.Second)
		s.collectAll()
	}()

	// Periodic telemetry collection
	go func() {
		ticker := time.NewTicker(time.Duration(s.config.TelemetryInterval) * time.Second)
		defer ticker.Stop()

		for range ticker.C {
			s.collectTelemetry()
		}
	}()
}

func (s *Server) collectAll() {
	log.Println("Starting full inventory collection...")
	start := time.Now()

	inventory := s.collectors.CollectAll()
	inventory.AgentID = s.agentInfo.ID

	s.mu.Lock()
	s.lastInventory = inventory
	s.mu.Unlock()

	log.Printf("Full inventory collection completed in %dms", time.Since(start).Milliseconds())
}

func (s *Server) collectTelemetry() {
	telemetry, err := s.collectors.CollectTelemetry()
	if err != nil {
		log.Printf("Error collecting telemetry: %v", err)
		return
	}

	s.mu.Lock()
	s.lastTelemetry = telemetry
	s.mu.Unlock()
}

func (s *Server) getAgentInfo() *models.AgentInfo {
	hostname, _ := os.Hostname()

	osName := runtime.GOOS
	osVersion := ""

	if runtime.GOOS == "darwin" {
		if out, err := exec.Command("sw_vers", "-productVersion").Output(); err == nil {
			osVersion = strings.TrimSpace(string(out))
		}
		osName = "macOS"
	} else if runtime.GOOS == "linux" {
		if data, err := os.ReadFile("/etc/os-release"); err == nil {
			lines := strings.Split(string(data), "\n")
			for _, line := range lines {
				if strings.HasPrefix(line, "PRETTY_NAME=") {
					osName = strings.Trim(strings.TrimPrefix(line, "PRETTY_NAME="), "\"")
				} else if strings.HasPrefix(line, "VERSION_ID=") {
					osVersion = strings.Trim(strings.TrimPrefix(line, "VERSION_ID="), "\"")
				}
			}
		}
	}

	return &models.AgentInfo{
		ID:        "local-agent",
		MachineID: getMachineID(),
		Name:      "Patchify Agent",
		Hostname:  hostname,
		OS:        osName,
		OSVersion: osVersion,
		Version:   "1.0.4",
		Status:    "Running",
		StartedAt: s.startTime.Format(time.RFC3339),
	}
}

// ServerConnectionInfo holds server connection data for templates
type ServerConnectionInfo struct {
	URL               string
	Registered        bool
	AgentID           string
	LastHeartbeat     string
	LastHeartbeatAgo  string
	LastInventory     string
	LastInventoryAgo  string
	LastError         string
	ConsecutiveErrors int
	Status            string // "connected", "connecting", "disconnected", "disabled"
}

// Web handlers
func (s *Server) handleDashboard(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}

	s.mu.RLock()

	// Build server connection info
	var serverInfo *ServerConnectionInfo
	if s.backendMgr != nil {
		status := s.backendMgr.GetStatus(r.Context())
		if status != nil {
			serverInfo = &ServerConnectionInfo{
				URL:               s.config.ServerURL,
				Registered:        status.Registered,
				AgentID:           status.AgentID,
				LastError:         status.LastError,
				ConsecutiveErrors: status.ConsecutiveErrors,
			}

			if !status.LastHeartbeat.IsZero() {
				serverInfo.LastHeartbeat = status.LastHeartbeat.Format("15:04:05")
				serverInfo.LastHeartbeatAgo = formatTimeAgo(status.LastHeartbeat)
			}
			if !status.LastInventory.IsZero() {
				serverInfo.LastInventory = status.LastInventory.Format("15:04:05")
				serverInfo.LastInventoryAgo = formatTimeAgo(status.LastInventory)
			}

			// Determine connection status
			if status.Registered {
				if status.ConsecutiveErrors > 0 {
					serverInfo.Status = "error"
				} else {
					serverInfo.Status = "connected"
				}
			} else {
				serverInfo.Status = "connecting"
			}
		}
	} else if s.config.ServerURL == "" {
		serverInfo = &ServerConnectionInfo{
			Status: "disabled",
		}
	} else {
		serverInfo = &ServerConnectionInfo{
			URL:    s.config.ServerURL,
			Status: "not_started",
		}
	}

	data := struct {
		Agent     *models.AgentInfo
		Inventory *models.FullInventory
		Telemetry *models.Telemetry
		Uptime    string
		Server    *ServerConnectionInfo
		Config    *config.Config
	}{
		Agent:     s.agentInfo,
		Inventory: s.lastInventory,
		Telemetry: s.lastTelemetry,
		Uptime:    formatUptime(time.Since(s.startTime)),
		Server:    serverInfo,
		Config:    s.config,
	}
	s.mu.RUnlock()

	s.renderTemplate(w, "dashboard.html", data)
}

func formatTimeAgo(t time.Time) string {
	d := time.Since(t)
	if d < time.Minute {
		return fmt.Sprintf("%ds ago", int(d.Seconds()))
	}
	if d < time.Hour {
		return fmt.Sprintf("%dm ago", int(d.Minutes()))
	}
	if d < 24*time.Hour {
		return fmt.Sprintf("%dh %dm ago", int(d.Hours()), int(d.Minutes())%60)
	}
	return t.Format("Jan 2, 15:04")
}

func (s *Server) handleHardware(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	var hardware *models.Hardware
	if s.lastInventory != nil {
		hardware = s.lastInventory.Hardware
	}
	s.mu.RUnlock()

	s.renderTemplate(w, "hardware.html", hardware)
}

func (s *Server) handleSoftware(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	var software *models.Software
	if s.lastInventory != nil {
		software = s.lastInventory.Software
	}
	s.mu.RUnlock()

	s.renderTemplate(w, "software.html", software)
}

func (s *Server) handleNetwork(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	var network *models.Network
	if s.lastInventory != nil {
		network = s.lastInventory.Network
	}
	s.mu.RUnlock()

	s.renderTemplate(w, "network.html", network)
}

func (s *Server) handleSecurity(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	var security *models.Security
	if s.lastInventory != nil {
		security = s.lastInventory.Security
	}
	s.mu.RUnlock()

	s.renderTemplate(w, "security.html", security)
}

func (s *Server) handlePeripherals(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	var peripherals *models.Peripherals
	if s.lastInventory != nil {
		peripherals = s.lastInventory.Peripherals
	}
	s.mu.RUnlock()

	s.renderTemplate(w, "peripherals.html", peripherals)
}

func (s *Server) handleTelemetryPage(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	telemetry := s.lastTelemetry
	s.mu.RUnlock()

	s.renderTemplate(w, "telemetry.html", telemetry)
}

// API handlers
func (s *Server) handleCollect(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	go s.collectAll()
	s.jsonResponse(w, map[string]string{"status": "collection started"})
}

func (s *Server) handleCollectHardware(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	hardware, err := s.collectors.CollectHardware()
	if err != nil {
		s.jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	s.mu.Lock()
	if s.lastInventory == nil {
		s.lastInventory = &models.FullInventory{}
	}
	s.lastInventory.Hardware = hardware
	s.mu.Unlock()

	s.jsonResponse(w, hardware)
}

func (s *Server) handleCollectSoftware(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	software, err := s.collectors.CollectSoftware()
	if err != nil {
		s.jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	s.mu.Lock()
	if s.lastInventory == nil {
		s.lastInventory = &models.FullInventory{}
	}
	s.lastInventory.Software = software
	s.mu.Unlock()

	s.jsonResponse(w, software)
}

func (s *Server) handleCollectNetwork(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	network, err := s.collectors.CollectNetwork()
	if err != nil {
		s.jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	s.mu.Lock()
	if s.lastInventory == nil {
		s.lastInventory = &models.FullInventory{}
	}
	s.lastInventory.Network = network
	s.mu.Unlock()

	s.jsonResponse(w, network)
}

func (s *Server) handleCollectSecurity(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	security, err := s.collectors.CollectSecurity()
	if err != nil {
		s.jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	s.mu.Lock()
	if s.lastInventory == nil {
		s.lastInventory = &models.FullInventory{}
	}
	s.lastInventory.Security = security
	s.mu.Unlock()

	s.jsonResponse(w, security)
}

func (s *Server) handleCollectPeripherals(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	peripherals, err := s.collectors.CollectPeripherals()
	if err != nil {
		s.jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	s.mu.Lock()
	if s.lastInventory == nil {
		s.lastInventory = &models.FullInventory{}
	}
	s.lastInventory.Peripherals = peripherals
	s.mu.Unlock()

	s.jsonResponse(w, peripherals)
}

func (s *Server) handleCollectTelemetry(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	telemetry, err := s.collectors.CollectTelemetry()
	if err != nil {
		s.jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	s.mu.Lock()
	s.lastTelemetry = telemetry
	s.mu.Unlock()

	s.jsonResponse(w, telemetry)
}

func (s *Server) handleGetInventory(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	inventory := s.lastInventory
	s.mu.RUnlock()

	if inventory == nil {
		s.jsonError(w, "No inventory data available. Run collection first.", http.StatusNotFound)
		return
	}

	s.jsonResponse(w, inventory)
}

func (s *Server) handleGetTelemetry(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	telemetry := s.lastTelemetry
	s.mu.RUnlock()

	if telemetry == nil {
		s.jsonError(w, "No telemetry data available", http.StatusNotFound)
		return
	}

	s.jsonResponse(w, telemetry)
}

// handleTelemetryStream streams telemetry data via Server-Sent Events
func (s *Server) handleTelemetryStream(w http.ResponseWriter, r *http.Request) {
	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Check if response writer supports flushing
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "SSE not supported", http.StatusInternalServerError)
		return
	}

	// Create ticker for periodic updates (every 5 seconds)
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	// Send initial telemetry data immediately
	s.mu.RLock()
	telemetry := s.lastTelemetry
	s.mu.RUnlock()

	if telemetry != nil {
		data, _ := json.Marshal(telemetry)
		fmt.Fprintf(w, "data: %s\n\n", data)
		flusher.Flush()
	}

	// Stream updates
	for {
		select {
		case <-ticker.C:
			// Get current telemetry
			s.mu.RLock()
			telemetry := s.lastTelemetry
			s.mu.RUnlock()

			if telemetry != nil {
				data, err := json.Marshal(telemetry)
				if err != nil {
					log.Printf("Failed to marshal telemetry for SSE: %v", err)
					continue
				}

				// Send as SSE event
				fmt.Fprintf(w, "data: %s\n\n", data)
				flusher.Flush()
			}

		case <-r.Context().Done():
			// Client disconnected
			log.Println("Telemetry SSE client disconnected")
			return
		}
	}
}

func (s *Server) handleGetAgent(w http.ResponseWriter, r *http.Request) {
	s.jsonResponse(w, s.agentInfo)
}

func (s *Server) handleSettings(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()

	// Build server connection info
	var serverInfo *ServerConnectionInfo
	if s.backendMgr != nil {
		status := s.backendMgr.GetStatus(r.Context())
		if status != nil {
			serverInfo = &ServerConnectionInfo{
				URL:               s.config.ServerURL,
				Registered:        status.Registered,
				AgentID:           status.AgentID,
				LastError:         status.LastError,
				ConsecutiveErrors: status.ConsecutiveErrors,
			}
			if !status.LastHeartbeat.IsZero() {
				serverInfo.LastHeartbeat = status.LastHeartbeat.Format("15:04:05")
				serverInfo.LastHeartbeatAgo = formatTimeAgo(status.LastHeartbeat)
			}
			if !status.LastInventory.IsZero() {
				serverInfo.LastInventory = status.LastInventory.Format("15:04:05")
				serverInfo.LastInventoryAgo = formatTimeAgo(status.LastInventory)
			}
			if status.Registered {
				if status.ConsecutiveErrors > 0 {
					serverInfo.Status = "error"
				} else {
					serverInfo.Status = "connected"
				}
			} else {
				serverInfo.Status = "connecting"
			}
		}
	}

	data := struct {
		Config *config.Config
		Server *ServerConnectionInfo
		Agent  *models.AgentInfo
	}{
		Config: s.config,
		Server: serverInfo,
		Agent:  s.agentInfo,
	}
	s.mu.RUnlock()

	s.renderTemplate(w, "settings.html", data)
}

func (s *Server) handleGetConfig(w http.ResponseWriter, r *http.Request) {
	s.jsonResponse(w, s.config)
}

func (s *Server) handleJobs(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()

	// Get jobs data
	var jobsData *JobsStatus
	if s.backendMgr != nil {
		jobsData = s.backendMgr.GetJobsStatus()
	}

	// Get rollback data
	var rollbacks []RollbackInfo
	if s.backendMgr != nil {
		if rb, err := s.backendMgr.GetRollbacks(r.Context()); err == nil {
			rollbacks = rb
		}
	}

	// Build server connection info for header
	var serverInfo *ServerConnectionInfo
	if s.backendMgr != nil {
		status := s.backendMgr.GetStatus(r.Context())
		if status != nil {
			serverInfo = &ServerConnectionInfo{
				URL:               s.config.ServerURL,
				Registered:        status.Registered,
				AgentID:           status.AgentID,
				ConsecutiveErrors: status.ConsecutiveErrors,
			}
			if status.Registered {
				if status.ConsecutiveErrors > 0 {
					serverInfo.Status = "error"
				} else {
					serverInfo.Status = "connected"
				}
			} else {
				serverInfo.Status = "connecting"
			}
		}
	}

	// Count stats
	completedCount := 0
	failedCount := 0
	if jobsData != nil {
		for _, job := range jobsData.JobHistory {
			if job.Status == "completed" {
				completedCount++
			} else if job.Status == "failed" {
				failedCount++
			}
		}
	}

	data := struct {
		Agent          *models.AgentInfo
		Jobs           *JobsStatus
		Rollbacks      []RollbackInfo
		Server         *ServerConnectionInfo
		CompletedCount int
		FailedCount    int
	}{
		Agent:          s.agentInfo,
		Jobs:           jobsData,
		Rollbacks:      rollbacks,
		Server:         serverInfo,
		CompletedCount: completedCount,
		FailedCount:    failedCount,
	}
	s.mu.RUnlock()

	s.renderTemplate(w, "jobs.html", data)
}

func (s *Server) handleGetJobs(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.backendMgr == nil {
		s.jsonResponse(w, &JobsStatus{
			ActiveJobs: []JobHistoryEntry{},
			JobHistory: []JobHistoryEntry{},
		})
		return
	}

	s.jsonResponse(w, s.backendMgr.GetJobsStatus())
}

func (s *Server) handleGetRollbacks(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.backendMgr == nil {
		s.jsonResponse(w, []RollbackInfo{})
		return
	}

	rollbacks, err := s.backendMgr.GetRollbacks(r.Context())
	if err != nil {
		s.jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	s.jsonResponse(w, rollbacks)
}

func (s *Server) handleExecuteRollback(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.backendMgr == nil {
		s.jsonError(w, "Backend not available", http.StatusServiceUnavailable)
		return
	}

	// Parse request body
	var req struct {
		RollbackID string `json:"rollbackId"`
		Force      bool   `json:"force"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.jsonError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.RollbackID == "" {
		s.jsonError(w, "rollbackId is required", http.StatusBadRequest)
		return
	}

	result := s.backendMgr.ExecuteRollback(r.Context(), req.RollbackID, req.Force)
	s.jsonResponse(w, result)
}

func (s *Server) handleGetDownloads(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.backendMgr == nil {
		s.jsonResponse(w, map[string]*DownloadProgress{})
		return
	}

	downloads := s.backendMgr.GetDownloadProgress()
	s.jsonResponse(w, downloads)
}

func (s *Server) handleGetStatus(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	status := struct {
		Agent  *models.AgentInfo     `json:"agent"`
		Config *config.Config        `json:"config"`
		Server *ServerConnectionInfo `json:"server,omitempty"`
		Uptime string                `json:"uptime"`
	}{
		Agent:  s.agentInfo,
		Config: s.config,
		Uptime: formatUptime(time.Since(s.startTime)),
	}

	if s.backendMgr != nil {
		backendStatus := s.backendMgr.GetStatus(r.Context())
		if backendStatus != nil {
			status.Server = &ServerConnectionInfo{
				URL:               s.config.ServerURL,
				Registered:        backendStatus.Registered,
				AgentID:           backendStatus.AgentID,
				ConsecutiveErrors: backendStatus.ConsecutiveErrors,
				LastError:         backendStatus.LastError,
			}
			if !backendStatus.LastHeartbeat.IsZero() {
				status.Server.LastHeartbeat = backendStatus.LastHeartbeat.Format(time.RFC3339)
			}
			if backendStatus.Registered {
				status.Server.Status = "connected"
			} else {
				status.Server.Status = "connecting"
			}
		}
	}

	s.jsonResponse(w, status)
}

// Helper methods
func (s *Server) renderTemplate(w http.ResponseWriter, name string, data interface{}) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	if err := s.templates.ExecuteTemplate(w, name, data); err != nil {
		log.Printf("Error rendering template %s: %v", name, err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
	}
}

func (s *Server) jsonResponse(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Printf("Error encoding JSON: %v", err)
	}
}

func (s *Server) jsonError(w http.ResponseWriter, message string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}

// getMachineID returns a unique machine identifier
func getMachineID() string {
	switch runtime.GOOS {
	case "darwin":
		out, err := exec.Command("ioreg", "-rd1", "-c", "IOPlatformExpertDevice").Output()
		if err == nil {
			for _, line := range strings.Split(string(out), "\n") {
				if strings.Contains(line, "IOPlatformUUID") {
					parts := strings.Split(line, "\"")
					if len(parts) >= 4 {
						return parts[3]
					}
				}
			}
		}
	case "linux":
		if data, err := os.ReadFile("/etc/machine-id"); err == nil {
			return strings.TrimSpace(string(data))
		}
	}
	return "unknown"
}

func formatUptime(d time.Duration) string {
	days := int(d.Hours() / 24)
	hours := int(d.Hours()) % 24
	minutes := int(d.Minutes()) % 60
	seconds := int(d.Seconds()) % 60

	if days > 0 {
		return fmt.Sprintf("%dd %dh %dm", days, hours, minutes)
	}
	if hours > 0 {
		return fmt.Sprintf("%dh %dm %ds", hours, minutes, seconds)
	}
	if minutes > 0 {
		return fmt.Sprintf("%dm %ds", minutes, seconds)
	}
	return fmt.Sprintf("%ds", seconds)
}

// handleHealth provides enhanced health check for update verification
func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Build health response
	health := map[string]interface{}{
		"healthy": true,
		"status":  "healthy",
		"version": s.agentInfo.Version,
		"uptime":  time.Since(s.startTime).Seconds(),
	}

	// Add backend connectivity status
	if s.backendMgr != nil {
		status := s.backendMgr.GetStatus(r.Context())
		if status != nil {
			backendHealthy := status.Registered && status.ConsecutiveErrors == 0
			health["backend"] = map[string]interface{}{
				"connected":   backendHealthy,
				"registered":  status.Registered,
				"agentId":     status.AgentID,
				"serverUrl":   status.ServerURL,
				"lastError":   status.LastError,
			}
		} else {
			health["backend"] = map[string]interface{}{
				"connected": false,
			}
		}
	}

	// Add system metrics
	if s.lastTelemetry != nil {
		health["system"] = map[string]interface{}{
			"cpuPercent":    s.lastTelemetry.CPUPercent,
			"memoryPercent": s.lastTelemetry.MemoryPercent,
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(health)
}
