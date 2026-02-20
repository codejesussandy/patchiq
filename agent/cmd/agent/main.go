package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	urlpkg "net/url"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/patchify/agent/internal/backend"
	"github.com/patchify/agent/internal/collectors"
	"github.com/patchify/agent/internal/config"
	"github.com/patchify/agent/internal/executors"
	"github.com/patchify/agent/internal/logger"
	"github.com/patchify/agent/internal/metrics"
	"github.com/patchify/agent/internal/server"
	agentsvc "github.com/patchify/agent/internal/service"
)

var (
	version          = "0.1.0"
	buildDate        = "unknown"
	defaultServerURL = ""
)


// convertResultToString converts storage result map to string
func convertResultToString(result map[string]interface{}) string {
	if result == nil {
		return ""
	}
	if msg, ok := result["message"].(string); ok {
		return msg
	}
	// Fallback to JSON encoding
	if b, err := json.Marshal(result); err == nil {
		return string(b)
	}
	return ""
}

// formatDuration formats a duration as a human-readable string
func formatDuration(d time.Duration) string {
	if d < time.Second {
		return fmt.Sprintf("%dms", d.Milliseconds())
	}
	if d < time.Minute {
		return fmt.Sprintf("%.1fs", d.Seconds())
	}
	if d < time.Hour {
		return fmt.Sprintf("%.1fm", d.Minutes())
	}
	return fmt.Sprintf("%.1fh", d.Hours())
}

func main() {
	// Detect if running as Windows Service (before flag parsing)
	if isService, svcErr := agentsvc.IsWindowsService(); svcErr != nil {
		log.Fatalf("Failed to detect service mode: %v", svcErr)
	} else if isService {
		runAsWindowsService()
		return
	}

	// Parse command line flags
	configPath := flag.String("config", "", "Path to config file")
	port := flag.Int("port", 3006, "Web UI port")
	// Server URL priority: env var → ldflags value (set at build time) → must be provided via --server flag
	envServerURL := os.Getenv("PATCHIQ_SERVER_URL")
	if envServerURL != "" {
		defaultServerURL = envServerURL
	}
	serverURL := flag.String("server", defaultServerURL, "Backend server URL (e.g., http://your-server:3500/api)")
	proxyURL := flag.String("proxy", "", "HTTP/HTTPS proxy URL (e.g., http://proxy:8080)")
	proxyUser := flag.String("proxy-user", "", "Proxy authentication username")
	proxyPassword := flag.String("proxy-password", "", "Proxy authentication password")
	noProxy := flag.String("no-proxy", "", "Comma-separated list of hosts to bypass proxy")
	testProxy := flag.Bool("test-proxy", false, "Test proxy connectivity and exit")
	showVersion := flag.Bool("version", false, "Show version")
	noBackend := flag.Bool("no-backend", false, "Disable backend communication (local mode)")
	setup := flag.Bool("setup", false, "Run interactive setup wizard")
	showStatus := flag.Bool("status", false, "Show agent connection status")
	installService := flag.Bool("install-service", false, "Install as Windows Service (requires admin)")
	uninstallService := flag.Bool("uninstall-service", false, "Uninstall Windows Service (requires admin)")
	startService := flag.Bool("start-service", false, "Start Windows Service")
	stopService := flag.Bool("stop-service", false, "Stop Windows Service")
	rollback := flag.Bool("rollback", false, "Rollback agent to previous version")
	rollbackVersion := flag.String("rollback-version", "", "Specific version to rollback to (optional)")
	forceRollback := flag.Bool("force", false, "Force rollback without confirmation")
	listRollbacks := flag.Bool("list-rollbacks", false, "List available rollback versions")
	flag.Parse()

	if *showVersion {
		fmt.Printf("Patchify Agent v%s (built %s)\n", version, buildDate)
		os.Exit(0)
	}

	// Handle service management commands (Windows only, no-ops on other platforms)
	if *installService {
		if err := agentsvc.InstallService(); err != nil {
			log.Fatalf("Failed to install service: %v", err)
		}
		fmt.Println("Service installed successfully.")
		fmt.Println("Start with: patchiq-agent --start-service  (or: sc start PatchIQAgent)")
		os.Exit(0)
	}
	if *uninstallService {
		if err := agentsvc.UninstallService(); err != nil {
			log.Fatalf("Failed to uninstall service: %v", err)
		}
		fmt.Println("Service uninstalled successfully.")
		os.Exit(0)
	}
	if *startService {
		if err := agentsvc.StartService(); err != nil {
			log.Fatalf("Failed to start service: %v", err)
		}
		fmt.Println("Service started.")
		os.Exit(0)
	}
	if *stopService {
		if err := agentsvc.StopService(); err != nil {
			log.Fatalf("Failed to stop service: %v", err)
		}
		fmt.Println("Service stopped.")
		os.Exit(0)
	}

	// Handle test-proxy command
	if *testProxy {
		runTestProxy(*proxyURL, *proxyUser, *proxyPassword)
		os.Exit(0)
	}

	// Handle setup command
	if *setup {
		runSetupWizard()
		os.Exit(0)
	}

	// Handle status command
	if *showStatus {
		showAgentStatus()
		os.Exit(0)
	}

	// Handle list-rollbacks command
	if *listRollbacks {
		listAvailableRollbacks()
		os.Exit(0)
	}

	// Handle rollback command
	if *rollback {
		runRollback(*rollbackVersion, *forceRollback)
		os.Exit(0)
	}

	// Print banner
	fmt.Println(`
╔═══════════════════════════════════════════════════╗
║         Patchify Agent v` + version + `                  ║
║    Endpoint Inventory & Telemetry Collection      ║
╚═══════════════════════════════════════════════════╝
`)

	// Detect which flags were explicitly passed on the command line
	explicitFlags := map[string]bool{}
	flag.Visit(func(f *flag.Flag) { explicitFlags[f.Name] = true })

	// Load configuration
	var cfg *config.Config
	var err error

	if *configPath != "" {
		cfg, err = config.Load(*configPath)
		if err != nil {
			log.Fatalf("Failed to load config: %v", err)
		}
		log.Printf("Loaded config from %s", *configPath)
		// Also save to default location so future runs without -config use the same settings
		homeDir, _ := os.UserHomeDir()
		defaultConfigPath := filepath.Join(homeDir, ".patchify-agent", "config.json")
		if err := cfg.Save(defaultConfigPath); err != nil {
			log.Printf("Warning: Could not save config to %s: %v", defaultConfigPath, err)
		} else {
			log.Printf("Configuration saved to %s", defaultConfigPath)
		}
	} else {
		// Try default locations
		homeDir, _ := os.UserHomeDir()
		defaultPaths := []string{
			filepath.Join(homeDir, ".patchify-agent", "config.json"),
			"/etc/patchify-agent/config.json",
		}

		for _, path := range defaultPaths {
			if _, err := os.Stat(path); err == nil {
				cfg, err = config.Load(path)
				if err == nil {
					log.Printf("Loaded config from %s", path)
					break
				}
			}
		}

		if cfg == nil {
			cfg = config.DefaultConfig()
			log.Println("Using default configuration")
		}
	}

	// Override settings from command line ONLY if explicitly passed
	if explicitFlags["port"] {
		cfg.WebUIPort = *port
	}
	if explicitFlags["server"] {
		cfg.ServerURL = *serverURL
		// Auto-save config when server URL is explicitly provided via CLI
		homeDir, _ := os.UserHomeDir()
		configSavePath := filepath.Join(homeDir, ".patchify-agent", "config.json")
		if err := cfg.Save(configSavePath); err != nil {
			log.Printf("Warning: Could not save config: %v", err)
		} else {
			log.Printf("Configuration saved to %s", configSavePath)
		}
	} else if cfg.ServerURL == "" {
		// No config file had a server URL — use the built-in default (from ldflags/env)
		cfg.ServerURL = *serverURL
	}

	// Override proxy settings from CLI flags (only if explicitly passed)
	if explicitFlags["proxy"] {
		cfg.ProxyURL = *proxyURL
	}
	if explicitFlags["proxy-user"] {
		cfg.ProxyUser = *proxyUser
	}
	if explicitFlags["proxy-password"] {
		cfg.ProxyPassword = *proxyPassword
	}
	if explicitFlags["no-proxy"] {
		cfg.NoProxy = *noProxy
	}

	// Initialize structured logger
	if err := logger.Init(cfg.LogLevel, cfg.LogFormat, cfg.LogFile); err != nil {
		log.Fatalf("Failed to initialize logger: %v", err)
	}

	// Ensure data directory exists
	if err := os.MkdirAll(cfg.DataDir, 0755); err != nil {
		log.Printf("Warning: Could not create data directory: %v", err)
	}

	// Create shared collector manager
	cm := collectors.NewCollectorManager()

	// Create shared executor manager with download config
	dlCfg := &executors.DownloadConfig{
		MaxDownloadSpeedMBps: cfg.MaxDownloadSpeedMBps,
		EnableDownloadResume: cfg.EnableDownloadResume,
		ProxyURL:             cfg.ProxyURL,
		ProxyUser:            cfg.ProxyUser,
		ProxyPassword:        cfg.ProxyPassword,
	}
	em := executors.NewExecutorManager(dlCfg)

	// Create local web server
	srv, err := server.New(cfg)
	if err != nil {
		log.Fatalf("Failed to create server: %v", err)
	}

	// Start background collection for local web UI
	srv.StartBackgroundCollection()

	// Set Prometheus agent_up metric
	metrics.AgentUp.Set(1)

	// Create and start backend manager (unless disabled)
	var backendMgr *backend.Manager
	if !*noBackend && cfg.ServerURL == "" {
		log.Println("WARNING: No server URL configured. Agent cannot communicate with backend.")
		log.Println("  Set PATCHIQ_SERVER_URL environment variable, use --server flag,")
		log.Println("  or run 'patchiq-agent --setup' to configure.")
		log.Println("  Running in local-only mode.")
	}
	if !*noBackend && cfg.ServerURL != "" {
		backendMgr = backend.New(cfg, cm, em, version)
		if err := backendMgr.Start(); err != nil {
			log.Printf("Warning: Failed to start backend communication: %v", err)
		} else {
			log.Printf("Backend communication started (server: %s)", cfg.ServerURL)
		}
		// Connect backend to server for status display
		srv.SetBackendManager(&BackendAdapter{mgr: backendMgr})
	} else {
		log.Println("Running in local-only mode (no backend communication)")
	}

	// Handle graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		sig := <-sigChan
		log.Printf("\nReceived shutdown signal: %s", sig.String())
		log.Println("Shutting down agent...")

		// Stop backend manager with timeout
		if backendMgr != nil {
			if err := backendMgr.Stop(); err != nil {
				log.Printf("Warning: Shutdown error: %v (forcing exit)", err)
			}
		}

		// Exit cleanly
		log.Println("Agent stopped")
		os.Exit(0)
	}()

	// Print status
	log.Printf("Agent ID: %s", getAgentID(backendMgr))
	log.Printf("Web UI: http://localhost:%d", cfg.WebUIPort)
	log.Printf("Backend: %s", getBackendStatus(backendMgr, cfg))
	if cfg.ProxyURL != "" {
		log.Printf("Proxy: %s", cfg.ProxyURL)
	}
	log.Printf("API Endpoints:")
	log.Printf("  GET  /api/agent       - Agent info")
	log.Printf("  GET  /api/inventory   - Full inventory")
	log.Printf("  GET  /api/telemetry   - Current telemetry")
	log.Printf("  POST /api/collect     - Trigger full collection")
	log.Println()

	// Start web server (blocks)
	if err := srv.Start(); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}

func getAgentID(mgr *backend.Manager) string {
	if mgr != nil && mgr.IsRegistered() {
		return mgr.GetAgentID()
	}
	return "local-agent"
}

func getBackendStatus(mgr *backend.Manager, cfg *config.Config) string {
	if mgr == nil {
		return "disabled"
	}
	if mgr.IsRegistered() {
		return fmt.Sprintf("%s (registered)", cfg.ServerURL)
	}
	return fmt.Sprintf("%s (connecting...)", cfg.ServerURL)
}

func parseInt(s string) (int, error) {
	var n int
	_, err := fmt.Sscanf(s, "%d", &n)
	return n, err
}

func showAgentStatus() {
	fmt.Println(`
╔═══════════════════════════════════════════════════╗
║         Patchify Agent Status                     ║
╚═══════════════════════════════════════════════════╝`)

	homeDir, _ := os.UserHomeDir()
	dataDir := filepath.Join(homeDir, ".patchify-agent")
	configPath := filepath.Join(dataDir, "config.json")
	credPath := filepath.Join(dataDir, "credentials.json")

	// Check config
	fmt.Println("Configuration:")
	if cfg, err := config.Load(configPath); err == nil && cfg != nil {
		fmt.Printf("  ✓ Config file: %s\n", configPath)
		fmt.Printf("    Server URL:  %s\n", cfg.ServerURL)
		fmt.Printf("    Web UI Port: %d\n", cfg.WebUIPort)
	} else {
		fmt.Printf("  ✗ No configuration found at %s\n", configPath)
		fmt.Println("    Run './patchify-agent --setup' to configure")
	}

	// Check credentials
	fmt.Println("\nRegistration:")
	if data, err := os.ReadFile(credPath); err == nil {
		var creds struct {
			AgentID   string `json:"agentId"`
			AssetID   string `json:"assetId"`
			MachineID string `json:"machineId"`
		}
		if err := parseJSON(data, &creds); err == nil && creds.AgentID != "" {
			fmt.Printf("  ✓ Registered with server\n")
			fmt.Printf("    Agent ID:   %s\n", creds.AgentID)
			fmt.Printf("    Asset ID:   %s\n", creds.AssetID)
			fmt.Printf("    Machine ID: %s\n", creds.MachineID)
		} else {
			fmt.Println("  ✗ Invalid credentials file")
		}
	} else {
		fmt.Println("  ✗ Not registered (no credentials found)")
		fmt.Println("    The agent will register automatically when started")
	}

	// Show data directory
	fmt.Println("\nData Directory:")
	fmt.Printf("  %s\n", dataDir)
	if info, err := os.Stat(dataDir); err == nil && info.IsDir() {
		fmt.Println("  ✓ Directory exists")
	} else {
		fmt.Println("  ✗ Directory does not exist (will be created on first run)")
	}
}

func parseJSON(data []byte, v interface{}) error {
	return json.Unmarshal(data, v)
}

func runAsWindowsService() {
	// Load config from standard service locations
	var cfg *config.Config
	homeDir, _ := os.UserHomeDir()
	servicePaths := []string{
		filepath.Join(homeDir, ".patchify-agent", "config.json"),
	}

	for _, path := range servicePaths {
		if _, err := os.Stat(path); err == nil {
			if loadedCfg, err := config.Load(path); err == nil {
				cfg = loadedCfg
				log.Printf("Service: loaded config from %s", path)
				break
			}
		}
	}
	if cfg == nil {
		cfg = config.DefaultConfig()
		log.Println("Service: using default configuration")
	}

	// Initialize logger for Windows service
	if err := logger.Init(cfg.LogLevel, cfg.LogFormat, cfg.LogFile); err != nil {
		log.Printf("Warning: Failed to initialize logger: %v", err)
	}

	if err := os.MkdirAll(cfg.DataDir, 0755); err != nil {
		log.Printf("Warning: could not create data directory: %v", err)
	}

	var backendMgr *backend.Manager

	err := agentsvc.RunAsService(
		func() error {
			cm := collectors.NewCollectorManager()
			dlCfg := &executors.DownloadConfig{
				MaxDownloadSpeedMBps: cfg.MaxDownloadSpeedMBps,
				EnableDownloadResume: cfg.EnableDownloadResume,
				ProxyURL:             cfg.ProxyURL,
				ProxyUser:            cfg.ProxyUser,
				ProxyPassword:        cfg.ProxyPassword,
			}
			em := executors.NewExecutorManager(dlCfg)

			backendMgr = backend.New(cfg, cm, em, version)
			return backendMgr.Start()
		},
		func() {
			if backendMgr != nil {
				if err := backendMgr.Stop(); err != nil {
					log.Printf("Warning: Shutdown error: %v", err)
				}
			}
		},
	)
	if err != nil {
		log.Fatalf("Service failed: %v", err)
	}
}

func runTestProxy(proxyURLStr, proxyUser, proxyPassword string) {
	fmt.Print(`
╔═══════════════════════════════════════════════════╗
║         Patchify Agent Proxy Test                 ║
╚═══════════════════════════════════════════════════╝
`)

	if proxyURLStr == "" {
		// Check environment
		if v := os.Getenv("PATCHIQ_PROXY_URL"); v != "" {
			proxyURLStr = v
		} else if v := os.Getenv("HTTPS_PROXY"); v != "" {
			proxyURLStr = v
		} else if v := os.Getenv("HTTP_PROXY"); v != "" {
			proxyURLStr = v
		}
	}

	if proxyURLStr == "" {
		fmt.Println("  No proxy configured.")
		fmt.Println("  Use --proxy <url> or set HTTPS_PROXY / HTTP_PROXY environment variable.")
		os.Exit(1)
	}

	fmt.Printf("  Proxy URL: %s\n", proxyURLStr)
	if proxyUser != "" {
		fmt.Printf("  Proxy Auth: %s:****\n", proxyUser)
	}

	proxyURL, err := urlpkg.Parse(proxyURLStr)
	if err != nil {
		fmt.Printf("\n  FAIL: Invalid proxy URL: %v\n", err)
		os.Exit(1)
	}
	if proxyUser != "" {
		proxyURL.User = urlpkg.UserPassword(proxyUser, proxyPassword)
	}

	transport := &http.Transport{
		Proxy: http.ProxyURL(proxyURL),
	}
	testClient := &http.Client{
		Timeout:   15 * time.Second,
		Transport: transport,
	}

	fmt.Println("\n  Testing connectivity through proxy...")

	// Test 1: reach an external host
	resp, err := testClient.Get("https://httpbin.org/ip")
	if err != nil {
		fmt.Printf("  FAIL: Could not connect through proxy: %v\n", err)
		os.Exit(1)
	}
	resp.Body.Close()
	fmt.Printf("  OK: External connectivity via proxy (status %d)\n", resp.StatusCode)

	// Load config to test server URL
	homeDir, _ := os.UserHomeDir()
	configPath := filepath.Join(homeDir, ".patchify-agent", "config.json")
	cfg := config.DefaultConfig()
	if existingCfg, err := config.Load(configPath); err == nil && existingCfg != nil {
		cfg = existingCfg
	}

	if cfg.ServerURL != "" {
		fmt.Printf("\n  Testing proxy connection to PatchIQ server (%s)...\n", cfg.ServerURL)
		resp2, err := testClient.Get(cfg.ServerURL)
		if err != nil {
			fmt.Printf("  WARN: Could not reach server through proxy: %v\n", err)
		} else {
			resp2.Body.Close()
			fmt.Printf("  OK: Server reachable via proxy (status %d)\n", resp2.StatusCode)
		}
	}

	fmt.Println("\n  Proxy test completed.")
}

// listAvailableRollbacks lists all available agent version rollbacks
func listAvailableRollbacks() {
	fmt.Println(`
╔═══════════════════════════════════════════════════╗
║      Available Agent Rollback Versions            ║
╚═══════════════════════════════════════════════════╝`)

	// Get current binary directory
	currentBinary, err := os.Executable()
	if err != nil {
		fmt.Printf("  Error: Cannot determine binary location: %v\n", err)
		return
	}
	currentBinary, _ = filepath.EvalSymlinks(currentBinary)
	dir := filepath.Dir(currentBinary)

	// List backup versions
	pattern := filepath.Join(dir, "*.bak*")
	matches, err := filepath.Glob(pattern)
	if err != nil {
		fmt.Printf("  Error: Cannot list backup versions: %v\n", err)
		return
	}

	if len(matches) == 0 {
		fmt.Println("  No backup versions found.")
		fmt.Println("  Backup versions are created automatically during agent updates.")
		return
	}

	fmt.Printf("  Found %d backup version(s):\n\n", len(matches))

	for i, backupPath := range matches {
		info, err := os.Stat(backupPath)
		if err != nil {
			continue
		}

		// Version detection would require executing the binary with --version
		// For now, just show the file info

		fmt.Printf("  %d. %s\n", i+1, filepath.Base(backupPath))
		fmt.Printf("     Size: %d bytes\n", info.Size())
		fmt.Printf("     Modified: %s\n", info.ModTime().Format("2006-01-02 15:04:05"))
		fmt.Println()
	}

	fmt.Println("  To rollback, run: patchiq-agent --rollback")
}

// runRollback performs agent version rollback
func runRollback(targetVersion string, force bool) {
	fmt.Println(`
╔═══════════════════════════════════════════════════╗
║         Agent Version Rollback                    ║
╚═══════════════════════════════════════════════════╝`)

	// Load rollback state if available
	homeDir, _ := os.UserHomeDir()
	stateDir := filepath.Join(homeDir, ".patchify-agent", "update")
	stateFile := filepath.Join(stateDir, "agent-update-rollback.json")

	var rollbackState struct {
		CurrentVersion     string `json:"currentVersion"`
		PreviousVersion    string `json:"previousVersion"`
		PreviousBinaryPath string `json:"previousBinaryPath"`
	}

	// Try to load rollback state
	if data, err := os.ReadFile(stateFile); err == nil {
		if err := json.Unmarshal(data, &rollbackState); err == nil {
			fmt.Printf("  Current Version: %s\n", rollbackState.CurrentVersion)
			fmt.Printf("  Previous Version: %s\n", rollbackState.PreviousVersion)
			fmt.Println()
		}
	}

	// Get current binary path
	currentBinary, err := os.Executable()
	if err != nil {
		fmt.Printf("  Error: Cannot determine binary location: %v\n", err)
		os.Exit(1)
	}
	currentBinary, _ = filepath.EvalSymlinks(currentBinary)

	// Determine rollback source
	var rollbackSource string
	if targetVersion != "" {
		// Specific version requested
		rollbackSource = currentBinary + ".v" + targetVersion
		if _, err := os.Stat(rollbackSource); os.IsNotExist(err) {
			// Try .bak suffix
			rollbackSource = currentBinary + ".bak"
		}
	} else if rollbackState.PreviousBinaryPath != "" {
		// Use rollback state
		rollbackSource = rollbackState.PreviousBinaryPath
	} else {
		// Default to .bak file
		rollbackSource = currentBinary + ".bak"
	}

	// Verify rollback source exists
	if _, err := os.Stat(rollbackSource); os.IsNotExist(err) {
		fmt.Printf("  Error: Rollback source not found: %s\n", rollbackSource)
		fmt.Println("\n  Run 'patchiq-agent --list-rollbacks' to see available versions.")
		os.Exit(1)
	}

	fmt.Printf("  Rolling back from: %s\n", currentBinary)
	fmt.Printf("  Rolling back to:   %s\n", rollbackSource)
	fmt.Println()

	// Confirmation prompt (unless force flag)
	if !force {
		fmt.Print("  Are you sure you want to rollback? (yes/no): ")
		var response string
		fmt.Scanln(&response)
		if response != "yes" && response != "y" {
			fmt.Println("\n  Rollback cancelled.")
			os.Exit(0)
		}
		fmt.Println()
	}

	// Perform rollback
	fmt.Println("  Performing rollback...")

	// Backup current binary (in case rollback fails)
	failedBackup := currentBinary + ".failed"
	if err := copyFileSimple(currentBinary, failedBackup); err != nil {
		fmt.Printf("  Warning: Could not backup current binary: %v\n", err)
	}

	// Copy rollback source to current binary
	if err := copyFileSimple(rollbackSource, currentBinary); err != nil {
		fmt.Printf("  Error: Rollback failed: %v\n", err)
		os.Exit(1)
	}

	// Make executable (Unix)
	if err := os.Chmod(currentBinary, 0755); err != nil {
		fmt.Printf("  Warning: Could not set executable permissions: %v\n", err)
	}

	// Clear rollback state
	os.Remove(stateFile)

	fmt.Println("  ✓ Rollback completed successfully!")
	fmt.Println()
	fmt.Println("  The agent has been rolled back to the previous version.")
	fmt.Println("  Restart the agent service to use the rolled back version.")
	fmt.Println()
}

// copyFileSimple copies a file from src to dst
func copyFileSimple(src, dst string) error {
	sourceFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	destFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destFile.Close()

	if _, err := io.Copy(destFile, sourceFile); err != nil {
		return err
	}

	return destFile.Sync()
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

	// Convert backend.JobHistoryEntry to server.JobHistoryEntry
	activeJobs := make([]server.JobHistoryEntry, len(jobsStatus.ActiveJobs))
	for i, job := range jobsStatus.ActiveJobs {
		var completedAt time.Time
		var duration string
		if job.CompletedAt != nil {
			completedAt = *job.CompletedAt
			duration = formatDuration(completedAt.Sub(job.StartedAt))
		}
		
		activeJobs[i] = server.JobHistoryEntry{
			ID:           job.ID,
			Type:         job.Type,
			Payload:      job.Payload,
			Status:       job.Status,
			Result:       convertResultToString(job.Result),
			ErrorMessage: job.ErrorMessage,
			StartedAt:    job.StartedAt,
			CompletedAt:  completedAt,
			Duration:     duration,
		}
	}

	jobHistory := make([]server.JobHistoryEntry, len(jobsStatus.JobHistory))
	for i, job := range jobsStatus.JobHistory {
		var completedAt time.Time
		var duration string
		if job.CompletedAt != nil {
			completedAt = *job.CompletedAt
			duration = formatDuration(completedAt.Sub(job.StartedAt))
		}
		
		jobHistory[i] = server.JobHistoryEntry{
			ID:           job.ID,
			Type:         job.Type,
			Payload:      job.Payload,
			Status:       job.Status,
			Result:       convertResultToString(job.Result),
			ErrorMessage: job.ErrorMessage,
			StartedAt:    job.StartedAt,
			CompletedAt:  completedAt,
			Duration:     duration,
		}
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
	// Convert backend.DownloadProgress to server.DownloadProgress
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
