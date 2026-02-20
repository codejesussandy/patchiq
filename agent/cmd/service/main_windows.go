//go:build windows

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"golang.org/x/sys/windows/svc"
	"golang.org/x/sys/windows/svc/debug"
	"golang.org/x/sys/windows/svc/eventlog"
	"golang.org/x/sys/windows/svc/mgr"

	"github.com/patchify/agent/internal/backend"
	"github.com/patchify/agent/internal/collectors"
	"github.com/patchify/agent/internal/config"
	"github.com/patchify/agent/internal/executors"
	"github.com/patchify/agent/internal/server"
	"github.com/patchify/agent/internal/storage"
)

const serviceName = "PatchIQAgent"
const serviceDisplayName = "PatchIQ Agent"
const serviceDescription = "PatchIQ Endpoint Management Agent - Collects inventory, telemetry and executes deployment jobs"

var elog debug.Log

type patchiqService struct {
	cfg        *config.Config
	backendMgr *backend.Manager
	webServer  *server.Server
	httpServer *http.Server
	stopCh     chan struct{}
}

func (s *patchiqService) Execute(args []string, r <-chan svc.ChangeRequest, changes chan<- svc.Status) (ssec bool, errno uint32) {
	const cmdsAccepted = svc.AcceptStop | svc.AcceptShutdown | svc.AcceptPauseAndContinue

	changes <- svc.Status{State: svc.StartPending}
	elog.Info(1, "PatchIQ Agent service starting")

	// Initialize components
	if err := s.initialize(); err != nil {
		elog.Error(1, fmt.Sprintf("Failed to initialize: %v", err))
		return false, 1
	}

	// Start the agent
	go s.run()

	changes <- svc.Status{State: svc.Running, Accepts: cmdsAccepted}
	elog.Info(1, "PatchIQ Agent service started successfully")

loop:
	for {
		select {
		case c := <-r:
			switch c.Cmd {
			case svc.Interrogate:
				changes <- c.CurrentStatus
			case svc.Stop, svc.Shutdown:
				elog.Info(1, "PatchIQ Agent service stopping")
				changes <- svc.Status{State: svc.StopPending}
				close(s.stopCh)
				break loop
			case svc.Pause:
				changes <- svc.Status{State: svc.Paused, Accepts: cmdsAccepted}
			case svc.Continue:
				changes <- svc.Status{State: svc.Running, Accepts: cmdsAccepted}
			default:
				elog.Error(1, fmt.Sprintf("Unexpected control request: %v", c))
			}
		}
	}

	s.shutdown()
	changes <- svc.Status{State: svc.Stopped}
	return false, 0
}

func (s *patchiqService) initialize() error {
	// Load configuration
	cfg, err := loadConfiguration()
	if err != nil {
		return fmt.Errorf("failed to load config: %w", err)
	}
	s.cfg = cfg

	// Ensure data directory exists
	if err := os.MkdirAll(cfg.DataDir, 0755); err != nil {
		elog.Warning(1, fmt.Sprintf("Could not create data directory: %v", err))
	}

	// Create shared collector manager
	cm := collectors.NewCollectorManager()

	// Create shared executor manager
	em := executors.NewExecutorManager(nil)

	// Create local web server
	srv, err := server.New(cfg)
	if err != nil {
		return fmt.Errorf("failed to create server: %w", err)
	}
	s.webServer = srv

	// Start background collection for local web UI
	srv.StartBackgroundCollection()

	// Create and start backend manager (unless server URL is empty)
	if cfg.ServerURL != "" {
		s.backendMgr = backend.New(cfg, cm, em, "1.0.0")
		// Connect backend to server for status display
		srv.SetBackendManager(&BackendAdapter{mgr: s.backendMgr})
	}

	s.stopCh = make(chan struct{})

	return nil
}

func (s *patchiqService) run() {
	// Start backend manager (handles registration, heartbeat, inventory, telemetry)
	if s.backendMgr != nil {
		if err := s.backendMgr.Start(); err != nil {
			elog.Warning(1, fmt.Sprintf("Failed to start backend communication: %v", err))
		} else {
			elog.Info(1, fmt.Sprintf("Backend communication started (server: %s)", s.cfg.ServerURL))
		}
	}

	// Start web UI server
	if s.webServer != nil && s.cfg.EnableWebUI {
		go func() {
			elog.Info(1, fmt.Sprintf("Starting agent web UI on port %d", s.cfg.WebUIPort))
			if err := s.webServer.Start(); err != nil && err != http.ErrServerClosed {
				elog.Error(1, fmt.Sprintf("Web server error: %v", err))
			}
		}()
	}

	// Wait for stop signal
	<-s.stopCh
}

func (s *patchiqService) shutdown() {
	elog.Info(1, "Shutting down PatchIQ Agent")

	if s.backendMgr != nil {
		s.backendMgr.Stop()
	}
}

func main() {
	// Check if running as service
	isWindowsService, err := svc.IsWindowsService()
	if err != nil {
		log.Fatalf("Failed to determine if running as service: %v", err)
	}

	if len(os.Args) > 1 {
		cmd := os.Args[1]
		switch cmd {
		case "install":
			installService()
			return
		case "uninstall", "remove":
			uninstallService()
			return
		case "start":
			startService()
			return
		case "stop":
			stopService()
			return
		case "status":
			queryService()
			return
		case "run":
			// Run interactively (for debugging)
			isWindowsService = false
		}
	}

	if isWindowsService {
		runService(false)
	} else {
		runService(true) // Debug mode
	}
}

func runService(isDebug bool) {
	var err error

	if isDebug {
		elog = debug.New(serviceName)
	} else {
		elog, err = eventlog.Open(serviceName)
		if err != nil {
			log.Fatalf("Failed to open event log: %v", err)
		}
	}
	defer elog.Close()

	elog.Info(1, fmt.Sprintf("Starting %s service", serviceName))

	patchiqSvc := &patchiqService{}

	if isDebug {
		err = debug.Run(serviceName, patchiqSvc)
	} else {
		err = svc.Run(serviceName, patchiqSvc)
	}

	if err != nil {
		elog.Error(1, fmt.Sprintf("%s service failed: %v", serviceName, err))
	}
}

func installService() {
	exePath, err := os.Executable()
	if err != nil {
		log.Fatalf("Failed to get executable path: %v", err)
	}

	m, err := mgr.Connect()
	if err != nil {
		log.Fatalf("Failed to connect to service manager: %v", err)
	}
	defer m.Disconnect()

	s, err := m.OpenService(serviceName)
	if err == nil {
		s.Close()
		log.Fatalf("Service %s already exists", serviceName)
	}

	s, err = m.CreateService(serviceName, exePath, mgr.Config{
		DisplayName:      serviceDisplayName,
		Description:      serviceDescription,
		StartType:        mgr.StartAutomatic,
		ServiceStartName: "LocalSystem",
	}, "is", "auto-started")
	if err != nil {
		log.Fatalf("Failed to create service: %v", err)
	}
	defer s.Close()

	// Set recovery actions
	recoveryActions := []mgr.RecoveryAction{
		{Type: mgr.ServiceRestart, Delay: 60 * time.Second},
		{Type: mgr.ServiceRestart, Delay: 60 * time.Second},
		{Type: mgr.ServiceRestart, Delay: 60 * time.Second},
	}
	err = s.SetRecoveryActions(recoveryActions, 86400) // Reset after 1 day
	if err != nil {
		log.Printf("Warning: Failed to set recovery actions: %v", err)
	}

	// Create event log source
	err = eventlog.InstallAsEventCreate(serviceName, eventlog.Error|eventlog.Warning|eventlog.Info)
	if err != nil {
		log.Printf("Warning: Failed to install event log source: %v", err)
	}

	fmt.Printf("Service %s installed successfully\n", serviceName)
}

func uninstallService() {
	m, err := mgr.Connect()
	if err != nil {
		log.Fatalf("Failed to connect to service manager: %v", err)
	}
	defer m.Disconnect()

	s, err := m.OpenService(serviceName)
	if err != nil {
		log.Fatalf("Service %s not found: %v", serviceName, err)
	}
	defer s.Close()

	// Stop service first
	s.Control(svc.Stop)
	time.Sleep(2 * time.Second)

	err = s.Delete()
	if err != nil {
		log.Fatalf("Failed to delete service: %v", err)
	}

	// Remove event log source
	eventlog.Remove(serviceName)

	fmt.Printf("Service %s uninstalled successfully\n", serviceName)
}

func startService() {
	m, err := mgr.Connect()
	if err != nil {
		log.Fatalf("Failed to connect to service manager: %v", err)
	}
	defer m.Disconnect()

	s, err := m.OpenService(serviceName)
	if err != nil {
		log.Fatalf("Failed to open service: %v", err)
	}
	defer s.Close()

	err = s.Start()
	if err != nil {
		log.Fatalf("Failed to start service: %v", err)
	}

	fmt.Printf("Service %s started\n", serviceName)
}

func stopService() {
	m, err := mgr.Connect()
	if err != nil {
		log.Fatalf("Failed to connect to service manager: %v", err)
	}
	defer m.Disconnect()

	s, err := m.OpenService(serviceName)
	if err != nil {
		log.Fatalf("Failed to open service: %v", err)
	}
	defer s.Close()

	status, err := s.Control(svc.Stop)
	if err != nil {
		log.Fatalf("Failed to stop service: %v", err)
	}

	timeout := time.Now().Add(30 * time.Second)
	for status.State != svc.Stopped {
		if time.Now().After(timeout) {
			log.Fatalf("Timeout waiting for service to stop")
		}
		time.Sleep(500 * time.Millisecond)
		status, err = s.Query()
		if err != nil {
			log.Fatalf("Failed to query service: %v", err)
		}
	}

	fmt.Printf("Service %s stopped\n", serviceName)
}

func queryService() {
	m, err := mgr.Connect()
	if err != nil {
		log.Fatalf("Failed to connect to service manager: %v", err)
	}
	defer m.Disconnect()

	s, err := m.OpenService(serviceName)
	if err != nil {
		fmt.Printf("Service %s: Not installed\n", serviceName)
		return
	}
	defer s.Close()

	status, err := s.Query()
	if err != nil {
		log.Fatalf("Failed to query service: %v", err)
	}

	stateStr := "Unknown"
	switch status.State {
	case svc.Stopped:
		stateStr = "Stopped"
	case svc.StartPending:
		stateStr = "Starting"
	case svc.StopPending:
		stateStr = "Stopping"
	case svc.Running:
		stateStr = "Running"
	case svc.ContinuePending:
		stateStr = "Continue Pending"
	case svc.PausePending:
		stateStr = "Pause Pending"
	case svc.Paused:
		stateStr = "Paused"
	}

	fmt.Printf("Service %s: %s\n", serviceName, stateStr)

	// Also show configuration
	cfg, err := s.Config()
	if err == nil {
		fmt.Printf("  Display Name: %s\n", cfg.DisplayName)
		fmt.Printf("  Description: %s\n", cfg.Description)
		fmt.Printf("  Executable: %s\n", cfg.BinaryPathName)
	}
}

func loadConfiguration() (*config.Config, error) {
	// Check for config in ProgramData
	dataDir := getDataDir()
	configPath := filepath.Join(dataDir, "config", "config.json")

	if _, err := os.Stat(configPath); err == nil {
		return config.Load(configPath)
	}

	// Fall back to default config
	cfg := config.DefaultConfig()
	cfg.DataDir = dataDir
	return cfg, nil
}

func getDataDir() string {
	// Check environment variable first
	if dir := os.Getenv("PATCHIQ_DATA_DIR"); dir != "" {
		return dir
	}

	// Default to ProgramData
	programData := os.Getenv("ProgramData")
	if programData == "" {
		programData = "C:\\ProgramData"
	}

	return filepath.Join(programData, "PatchIQ")
}

// BackendAdapter adapts backend.Manager to server.BackendStatus interface
type BackendAdapter struct {
	mgr *backend.Manager
}

func (a *BackendAdapter) IsRegistered() bool {
	return a.mgr.IsRegistered()
}

func (a *BackendAdapter) GetAgentID() string {
	return a.mgr.GetAgentID()
}

func (a *BackendAdapter) GetStatus(ctx context.Context) *server.BackendStatusInfo {
	status := a.mgr.GetStatus(ctx)
	if status == nil {
		return nil
	}
	return &server.BackendStatusInfo{
		Registered:        status.Registered,
		AgentID:           status.AgentID,
		ServerURL:         status.ServerURL,
		LastHeartbeat:     status.LastHeartbeat,
		LastInventory:     status.LastInventory,
		LastTelemetry:     status.LastTelemetry,
		LastError:         status.LastError,
		ConsecutiveErrors: status.ConsecutiveErrors,
	}
}

func (a *BackendAdapter) GetJobsStatus() *server.JobsStatus {
	jobsStatus := a.mgr.GetJobsStatus()
	if jobsStatus == nil {
		return nil
	}

	// Convert storage.JobHistoryEntry to server.JobHistoryEntry
	convertJob := func(job storage.JobHistoryEntry) server.JobHistoryEntry {
		var completedAt time.Time
		var duration string
		if job.CompletedAt != nil {
			completedAt = *job.CompletedAt
			duration = job.CompletedAt.Sub(job.StartedAt).String()
		}
		var resultStr string
		if job.Result != nil {
			if b, err := json.Marshal(job.Result); err == nil {
				resultStr = string(b)
			}
		}
		return server.JobHistoryEntry{
			ID:           job.ID,
			Type:         job.Type,
			Payload:      job.Payload,
			Status:       job.Status,
			Result:       resultStr,
			ErrorMessage: job.ErrorMessage,
			StartedAt:    job.StartedAt,
			CompletedAt:  completedAt,
			Duration:     duration,
		}
	}

	activeJobs := make([]server.JobHistoryEntry, len(jobsStatus.ActiveJobs))
	for i, job := range jobsStatus.ActiveJobs {
		activeJobs[i] = convertJob(job)
	}

	jobHistory := make([]server.JobHistoryEntry, len(jobsStatus.JobHistory))
	for i, job := range jobsStatus.JobHistory {
		jobHistory[i] = convertJob(job)
	}

	return &server.JobsStatus{
		ActiveJobs:   activeJobs,
		JobHistory:   jobHistory,
		TotalPending: jobsStatus.TotalPending,
		TotalRunning: jobsStatus.TotalRunning,
	}
}

func (a *BackendAdapter) GetRollbacks(ctx context.Context) ([]server.RollbackInfo, error) {
	rollbacks, err := a.mgr.GetRollbacks(ctx)
	if err != nil {
		return nil, err
	}

	// Convert models.RollbackInfo to server.RollbackInfo
	result := make([]server.RollbackInfo, len(rollbacks))
	for i, r := range rollbacks {
		result[i] = server.RollbackInfo{
			ID:               r.ID,
			PackageName:      r.PackageName,
			PreviousVersion:  r.PreviousVersion,
			InstalledVersion: r.InstalledVersion,
			InstallSource:    r.InstallSource,
			WasInstalled:     r.WasInstalled,
			InstalledAt:      r.InstalledAt,
			CommandID:        r.CommandID,
			SupportsRollback: r.SupportsRollback,
		}
	}

	return result, nil
}

func (a *BackendAdapter) ExecuteRollback(ctx context.Context, rollbackID string, force bool) server.ExecutionResult {
	result := a.mgr.ExecuteRollback(ctx, rollbackID, force)
	return server.ExecutionResult{
		Success:      result.Success,
		Message:      result.Message,
		ErrorMessage: result.ErrorMessage,
	}
}

func (a *BackendAdapter) GetDownloadProgress() map[string]*server.DownloadProgress {
	progress := a.mgr.GetDownloadProgress()
	if progress == nil {
		return nil
	}
	result := make(map[string]*server.DownloadProgress, len(progress))
	for k, v := range progress {
		result[k] = &server.DownloadProgress{
			ID:              v.ID,
			FileName:        v.FileName,
			TotalBytes:      v.TotalBytes,
			DownloadedBytes: v.DownloadedBytes,
			Percentage:      v.Percentage,
			Speed:           v.Speed,
			StartTime:       v.StartTime,
			EstimatedTime:   v.EstimatedTime,
		}
	}
	return result
}

