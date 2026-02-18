//go:build linux

package service

import (
	"fmt"
	"os/exec"
	"time"

	"github.com/rs/zerolog/log"
)

const (
	serviceName           = "patchiq-agent"
	restartTimeoutSeconds = 120 // 2 minutes
)

// RestartService restarts the systemd service
func RestartService() error {
	log.Info().Msg("Initiating systemd service restart")

	// Use systemctl restart which is atomic (stop + start)
	cmd := exec.Command("systemctl", "restart", serviceName)
	output, err := cmd.CombinedOutput()

	if err != nil {
		return fmt.Errorf("systemctl restart failed: %w, output: %s", err, string(output))
	}

	log.Info().Str("output", string(output)).Msg("Systemd service restarted successfully")
	return nil
}

// StopService stops the systemd service
func StopService() error {
	log.Info().Msg("Stopping systemd service")

	cmd := exec.Command("systemctl", "stop", serviceName)
	output, err := cmd.CombinedOutput()

	if err != nil {
		// Check if error is because service is already stopped
		if string(output) != "" && contains(string(output), "not loaded") {
			log.Debug().Msg("Service already stopped")
			return nil
		}
		return fmt.Errorf("systemctl stop failed: %w, output: %s", err, string(output))
	}

	log.Debug().Str("output", string(output)).Msg("Service stop command executed")
	return nil
}

// StartService starts the systemd service
func StartService() error {
	log.Info().Msg("Starting systemd service")

	cmd := exec.Command("systemctl", "start", serviceName)
	output, err := cmd.CombinedOutput()

	if err != nil {
		// Check if error is because service is already running
		if string(output) != "" && contains(string(output), "already active") {
			log.Debug().Msg("Service already running")
			return nil
		}
		return fmt.Errorf("systemctl start failed: %w, output: %s", err, string(output))
	}

	log.Debug().Str("output", string(output)).Msg("Service start command executed")
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
		// Query service status
		cmd := exec.Command("systemctl", "is-active", serviceName)
		output, err := cmd.CombinedOutput()

		status := string(output)
		if err == nil && contains(status, "active") {
			log.Info().Msg("Service is active")
			return nil
		}

		// Check for failure states
		if contains(status, "failed") || contains(status, "inactive") {
			// Get more details
			cmd = exec.Command("systemctl", "status", serviceName)
			statusOutput, _ := cmd.CombinedOutput()
			return fmt.Errorf("service failed to start: %s", string(statusOutput))
		}

		time.Sleep(2 * time.Second)
	}

	return fmt.Errorf("service start timeout after %v", timeout)
}

// ReloadSystemdDaemon reloads systemd daemon configuration
func ReloadSystemdDaemon() error {
	log.Info().Msg("Reloading systemd daemon")

	cmd := exec.Command("systemctl", "daemon-reload")
	output, err := cmd.CombinedOutput()

	if err != nil {
		return fmt.Errorf("systemctl daemon-reload failed: %w, output: %s", err, string(output))
	}

	log.Debug().Msg("Systemd daemon reloaded")
	return nil
}

// EnableService enables the systemd service to start on boot
func EnableService() error {
	log.Info().Msg("Enabling systemd service")

	cmd := exec.Command("systemctl", "enable", serviceName)
	output, err := cmd.CombinedOutput()

	if err != nil {
		return fmt.Errorf("systemctl enable failed: %w, output: %s", err, string(output))
	}

	log.Info().Msg("Service enabled for autostart")
	return nil
}

// GetServiceStatus returns the current status of the service
func GetServiceStatus() (string, error) {
	cmd := exec.Command("systemctl", "status", serviceName)
	output, err := cmd.CombinedOutput()

	// systemctl status returns non-zero if service is not running,
	// but we still want the output
	return string(output), err
}

// LogToSyslog logs update events to syslog
func LogToSyslog(priority, message string) error {
	// Use logger command to write to syslog
	cmd := exec.Command("logger", "-t", "patchiq-agent", "-p", priority, message)
	if err := cmd.Run(); err != nil {
		log.Warn().Err(err).Msg("Failed to write to syslog")
		return err
	}

	return nil
}

// IsWindowsService always returns false on Linux.
func IsWindowsService() (bool, error) {
	return false, nil
}

// RunAsService is a no-op on Linux.
func RunAsService(startFunc func() error, stopFunc func()) error {
	return nil
}

// InstallService is handled by systemd on Linux.
func InstallService() error {
	return nil
}

// UninstallService is handled by systemd on Linux.
func UninstallService() error {
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
