//go:build darwin

package service

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"github.com/rs/zerolog/log"
)

const (
	launchAgentLabel      = "io.patchiq.agent"
	restartTimeoutSeconds = 120 // 2 minutes
)

// RestartService restarts the macOS LaunchAgent
func RestartService() error {
	log.Info().Msg("Initiating macOS LaunchAgent restart")

	plistPath := getLaunchAgentPlistPath()

	// Unload the LaunchAgent
	if err := unloadLaunchAgent(plistPath); err != nil {
		return fmt.Errorf("failed to unload LaunchAgent: %w", err)
	}

	// Wait for service to fully stop
	log.Info().Msg("Waiting for service to stop")
	time.Sleep(3 * time.Second)

	// Load the LaunchAgent
	if err := loadLaunchAgent(plistPath); err != nil {
		return fmt.Errorf("failed to load LaunchAgent: %w", err)
	}

	log.Info().Msg("macOS LaunchAgent restarted successfully")
	return nil
}

// getLaunchAgentPlistPath returns the path to the plist file for the agent service.
// The installer deploys to /Library/LaunchDaemons (system-level, runs as root).
// If not found there, fall back to the per-user LaunchAgents location.
func getLaunchAgentPlistPath() string {
	// System LaunchDaemon (installed by build.sh / PKG installer)
	daemonPath := filepath.Join("/Library", "LaunchDaemons", launchAgentLabel+".plist")
	if _, err := os.Stat(daemonPath); err == nil {
		return daemonPath
	}
	// Per-user LaunchAgent fallback (dev/manual installs)
	homeDir, _ := os.UserHomeDir()
	return filepath.Join(homeDir, "Library", "LaunchAgents", launchAgentLabel+".plist")
}

// launchctlDomain returns the launchctl domain target for the given plist path.
// System LaunchDaemons use the "system" domain; per-user LaunchAgents use "gui/<uid>".
func launchctlDomain(plistPath string) string {
	if contains(plistPath, "/Library/LaunchDaemons/") {
		return "system"
	}
	return fmt.Sprintf("gui/%d", os.Getuid())
}

// unloadLaunchAgent unloads the LaunchAgent/LaunchDaemon using launchctl
func unloadLaunchAgent(plistPath string) error {
	domain := launchctlDomain(plistPath)

	// Try unload with bootout (newer macOS)
	cmd := exec.Command("launchctl", "bootout", domain, plistPath)
	output, err := cmd.CombinedOutput()

	if err != nil {
		// Fall back to unload (older macOS)
		log.Debug().Msg("Trying legacy launchctl unload")
		cmd = exec.Command("launchctl", "unload", plistPath)
		output, err = cmd.CombinedOutput()

		if err != nil {
			// Check if error is because service is already unloaded
			if string(output) != "" && (contains(string(output), "Could not find") ||
				contains(string(output), "not loaded")) {
				log.Debug().Msg("LaunchAgent already unloaded")
				return nil
			}
			return fmt.Errorf("launchctl unload failed: %w, output: %s", err, string(output))
		}
	}

	log.Debug().Str("output", string(output)).Msg("LaunchAgent unload command executed")
	return nil
}

// loadLaunchAgent loads the LaunchAgent/LaunchDaemon using launchctl
func loadLaunchAgent(plistPath string) error {
	// Verify plist exists
	if _, err := os.Stat(plistPath); os.IsNotExist(err) {
		return fmt.Errorf("LaunchAgent plist not found: %s", plistPath)
	}

	domain := launchctlDomain(plistPath)

	// Try load with bootstrap (newer macOS)
	cmd := exec.Command("launchctl", "bootstrap", domain, plistPath)
	output, err := cmd.CombinedOutput()

	if err != nil {
		// Fall back to load (older macOS)
		log.Debug().Msg("Trying legacy launchctl load")
		cmd = exec.Command("launchctl", "load", plistPath)
		output, err = cmd.CombinedOutput()

		if err != nil {
			// Check if error is because service is already loaded
			if string(output) != "" && contains(string(output), "already loaded") {
				log.Debug().Msg("LaunchAgent already loaded")
				return nil
			}
			return fmt.Errorf("launchctl load failed: %w, output: %s", err, string(output))
		}
	}

	log.Debug().Str("output", string(output)).Msg("LaunchAgent load command executed")
	return nil
}

// GracefulShutdown performs graceful shutdown with connection drainage
func GracefulShutdown(shutdownFunc func() error) error {
	log.Info().Msg("Initiating graceful shutdown")

	// Give in-flight operations time to complete
	drainDuration := 5 * time.Second
	log.Info().Dur("duration", drainDuration).Msg("Draining connections")
	time.Sleep(drainDuration)

	// Call the shutdown function
	if err := shutdownFunc(); err != nil {
		return fmt.Errorf("shutdown function failed: %w", err)
	}

	log.Info().Msg("Graceful shutdown completed")
	return nil
}

// WaitForServiceStart waits for the service to start with timeout
func WaitForServiceStart(timeout time.Duration) error {
	deadline := time.Now().Add(timeout)

	for time.Now().Before(deadline) {
		// Check if process is running by listing launchctl services
		cmd := exec.Command("launchctl", "list")
		output, err := cmd.CombinedOutput()

		if err == nil && contains(string(output), launchAgentLabel) {
			log.Info().Msg("LaunchAgent is running")
			return nil
		}

		time.Sleep(2 * time.Second)
	}

	return fmt.Errorf("service start timeout after %v", timeout)
}

// LogToSyslog logs update events to syslog
func LogToSyslog(priority, message string) error {
	// Use logger command to write to syslog
	cmd := exec.Command("logger", "-t", "PatchIQAgent", "-p", priority, message)
	if err := cmd.Run(); err != nil {
		log.Warn().Err(err).Msg("Failed to write to syslog")
		return err
	}

	return nil
}

// contains checks if a string contains a substring
func contains(s, substr string) bool {
	return len(s) >= len(substr) && indexOf(s, substr) >= 0
}

// indexOf finds the index of a substring in a string
func indexOf(s, substr string) int {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return i
		}
	}
	return -1
}
