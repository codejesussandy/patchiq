package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"

	"github.com/patchify/agent/internal/backend"
	"github.com/patchify/agent/internal/collectors"
	"github.com/patchify/agent/internal/config"
	"github.com/patchify/agent/internal/executors"
	"github.com/patchify/agent/internal/server"
)

var (
	version   = "1.0.0"
	buildDate = "unknown"
)

func main() {
	// Parse command line flags
	configPath := flag.String("config", "", "Path to config file")
	port := flag.Int("port", 8080, "Web UI port")
	serverURL := flag.String("server", "", "Backend server URL (e.g., http://localhost:3000/api)")
	showVersion := flag.Bool("version", false, "Show version")
	noBackend := flag.Bool("no-backend", false, "Disable backend communication (local mode)")
	flag.Parse()

	if *showVersion {
		fmt.Printf("Patchify Agent v%s (built %s)\n", version, buildDate)
		os.Exit(0)
	}

	// Print banner
	fmt.Println(`
╔═══════════════════════════════════════════════════╗
║         Patchify Agent v` + version + `                  ║
║    Endpoint Inventory & Telemetry Collection      ║
╚═══════════════════════════════════════════════════╝
`)

	// Load configuration
	var cfg *config.Config
	var err error

	if *configPath != "" {
		cfg, err = config.Load(*configPath)
		if err != nil {
			log.Fatalf("Failed to load config: %v", err)
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

	// Override settings from command line
	if *port != 8080 {
		cfg.WebUIPort = *port
	}
	if *serverURL != "" {
		cfg.ServerURL = *serverURL
	}

	// Ensure data directory exists
	if err := os.MkdirAll(cfg.DataDir, 0755); err != nil {
		log.Printf("Warning: Could not create data directory: %v", err)
	}

	// Create shared collector manager
	cm := collectors.NewCollectorManager()

	// Create shared executor manager
	em := executors.NewExecutorManager()

	// Create local web server
	srv, err := server.New(cfg)
	if err != nil {
		log.Fatalf("Failed to create server: %v", err)
	}

	// Start background collection for local web UI
	srv.StartBackgroundCollection()

	// Create and start backend manager (unless disabled)
	var backendMgr *backend.Manager
	if !*noBackend && cfg.ServerURL != "" {
		backendMgr = backend.New(cfg, cm, em)
		if err := backendMgr.Start(); err != nil {
			log.Printf("Warning: Failed to start backend communication: %v", err)
		} else {
			log.Printf("Backend communication started (server: %s)", cfg.ServerURL)
		}
	} else {
		log.Println("Running in local-only mode (no backend communication)")
	}

	// Handle graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigChan
		log.Println("\nShutting down agent...")
		if backendMgr != nil {
			backendMgr.Stop()
		}
		os.Exit(0)
	}()

	// Print status
	log.Printf("Agent ID: %s", getAgentID(backendMgr))
	log.Printf("Web UI: http://localhost:%d", cfg.WebUIPort)
	log.Printf("Backend: %s", getBackendStatus(backendMgr, cfg))
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
