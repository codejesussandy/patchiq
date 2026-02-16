//go:build windows

package service

import (
	"fmt"
	"os/exec"
	"time"

	"github.com/rs/zerolog/log"
)

const (
	serviceName           = "PatchIQAgent"
	restartTimeoutSeconds = 120 // 2 minutes
)

// RestartService restarts the Windows service
func RestartService() error {
	log.Info().Msg("Initiating Windows service restart")

	// Stop the service
	if err := stopWindowsService(); err != nil {
		return fmt.Errorf("failed to stop service: %w", err)
	}

	// Wait for service to fully stop
	log.Info().Msg("Waiting for service to stop")
	time.Sleep(3 * time.Second)

	// Start the service
	if err := startWindowsService(); err != nil {
		return fmt.Errorf("failed to start service: %w", err)
	}

	log.Info().Msg("Windows service restarted successfully")
	return nil
}

// stopWindowsService stops the Windows service using sc.exe
func stopWindowsService() error {
	cmd := exec.Command("sc", "stop", serviceName)
	output, err := cmd.CombinedOutput()

	if err != nil {
		// Check if error is because service is already stopped
		if string(output) != "" && contains(string(output), "not started") {
			log.Debug().Msg("Service already stopped")
			return nil
		}
		return fmt.Errorf("sc stop failed: %w, output: %s", err, string(output))
	}

	log.Debug().Str("output", string(output)).Msg("Service stop command executed")
	return nil
}

// startWindowsService starts the Windows service using sc.exe
func startWindowsService() error {
	cmd := exec.Command("sc", "start", serviceName)
	output, err := cmd.CombinedOutput()

	if err != nil {
		// Check if error is because service is already running
		if string(output) != "" && contains(string(output), "already running") {
			log.Debug().Msg("Service already running")
			return nil
		}
		return fmt.Errorf("sc start failed: %w, output: %s", err, string(output))
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
		cmd := exec.Command("sc", "query", serviceName)
		output, err := cmd.CombinedOutput()

		if err == nil && contains(string(output), "RUNNING") {
			log.Info().Msg("Service is running")
			return nil
		}

		// Check for failure states
		if contains(string(output), "STOPPED") && contains(string(output), "ERROR") {
			return fmt.Errorf("service failed to start")
		}

		time.Sleep(2 * time.Second)
	}

	return fmt.Errorf("service start timeout after %v", timeout)
}

// LogToEventLog logs update events to Windows Event Log
func LogToEventLog(eventType, message string) error {
	// Use PowerShell to write to event log
	script := fmt.Sprintf(`
		$source = "PatchIQAgent"
		if (-not [System.Diagnostics.EventLog]::SourceExists($source)) {
			New-EventLog -LogName Application -Source $source
		}
		Write-EventLog -LogName Application -Source $source -EventID 1000 -EntryType %s -Message "%s"
	`, eventType, message)

	cmd := exec.Command("powershell", "-Command", script)
	if err := cmd.Run(); err != nil {
		log.Warn().Err(err).Msg("Failed to write to Event Log")
		return err
	}

	return nil
}

// contains checks if a string contains a substring (case-insensitive helper)
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > len(substr) &&
		(s[:len(substr)] == substr || s[len(s)-len(substr):] == substr ||
		 indexOf(s, substr) >= 0))
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
