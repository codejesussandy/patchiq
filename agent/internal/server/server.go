package server

import (
	"embed"
	"encoding/json"
	"fmt"
	"html/template"
	"log"
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
)

//go:embed templates/*
var templatesFS embed.FS

// Server represents the agent web server
type Server struct {
	config        *config.Config
	collectors    *collectors.CollectorManager
	templates     *template.Template

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

// Start starts the HTTP server
func (s *Server) Start() error {
	mux := http.NewServeMux()

	// Web UI routes
	mux.HandleFunc("/", s.handleDashboard)
	mux.HandleFunc("/hardware", s.handleHardware)
	mux.HandleFunc("/software", s.handleSoftware)
	mux.HandleFunc("/network", s.handleNetwork)
	mux.HandleFunc("/security", s.handleSecurity)
	mux.HandleFunc("/peripherals", s.handlePeripherals)
	mux.HandleFunc("/telemetry", s.handleTelemetryPage)

	// API routes
	mux.HandleFunc("/api/collect", s.handleCollect)
	mux.HandleFunc("/api/collect/hardware", s.handleCollectHardware)
	mux.HandleFunc("/api/collect/software", s.handleCollectSoftware)
	mux.HandleFunc("/api/collect/network", s.handleCollectNetwork)
	mux.HandleFunc("/api/collect/security", s.handleCollectSecurity)
	mux.HandleFunc("/api/collect/peripherals", s.handleCollectPeripherals)
	mux.HandleFunc("/api/collect/telemetry", s.handleCollectTelemetry)
	mux.HandleFunc("/api/inventory", s.handleGetInventory)
	mux.HandleFunc("/api/telemetry", s.handleGetTelemetry)
	mux.HandleFunc("/api/agent", s.handleGetAgent)

	addr := fmt.Sprintf(":%d", s.config.WebUIPort)
	log.Printf("Starting agent web UI on http://localhost%s", addr)

	return http.ListenAndServe(addr, mux)
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
		Version:   "1.0.0",
		Status:    "Running",
		StartedAt: s.startTime.Format(time.RFC3339),
	}
}

// Web handlers
func (s *Server) handleDashboard(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}

	s.mu.RLock()
	data := struct {
		Agent     *models.AgentInfo
		Inventory *models.FullInventory
		Telemetry *models.Telemetry
		Uptime    string
	}{
		Agent:     s.agentInfo,
		Inventory: s.lastInventory,
		Telemetry: s.lastTelemetry,
		Uptime:    formatUptime(time.Since(s.startTime)),
	}
	s.mu.RUnlock()

	s.renderTemplate(w, "dashboard.html", data)
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

func (s *Server) handleGetAgent(w http.ResponseWriter, r *http.Request) {
	s.jsonResponse(w, s.agentInfo)
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
