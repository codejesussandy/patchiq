//go:build darwin

package executors

import (
	"fmt"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"github.com/patchify/agent/internal/models"
)

// DarwinRemoteAccessExecutor handles macOS Screen Sharing (VNC)
type DarwinRemoteAccessExecutor struct{}

// NewDarwinRemoteAccessExecutor creates a new macOS remote access executor
func NewDarwinRemoteAccessExecutor() *DarwinRemoteAccessExecutor {
	return &DarwinRemoteAccessExecutor{}
}

// Enable enables macOS Screen Sharing
func (e *DarwinRemoteAccessExecutor) Enable(config models.RemoteAccessConfig) models.ExecutionResult {
	startTime := time.Now()
	result := models.ExecutionResult{Success: false}

	// Method 1: Try using kickstart (Apple Remote Desktop)
	kickstartPath := "/System/Library/CoreServices/RemoteManagement/ARDAgent.app/Contents/Resources/kickstart"

	// Build kickstart arguments
	args := []string{
		"-activate",
		"-configure",
		"-access", "-on",
		"-restart", "-agent",
		"-privs", "-all",
	}

	// Try kickstart first
	cmd := exec.Command(kickstartPath, args...)
	output, err := cmd.CombinedOutput()

	if err != nil {
		// Method 2: Try using launchctl to enable screen sharing service
		loadCmd := exec.Command("launchctl", "load", "-w", "/System/Library/LaunchDaemons/com.apple.screensharing.plist")
		loadOutput, loadErr := loadCmd.CombinedOutput()

		if loadErr != nil {
			// Method 3: Try systemsetup (older macOS)
			setupCmd := exec.Command("systemsetup", "-setremotelogin", "on")
			setupOutput, setupErr := setupCmd.CombinedOutput()

			if setupErr != nil {
				result.ErrorMessage = fmt.Sprintf("All methods failed. kickstart: %v, launchctl: %v, systemsetup: %v",
					err, loadErr, setupErr)
				result.Output = fmt.Sprintf("kickstart: %s\nlaunchctl: %s\nsystemsetup: %s",
					string(output), string(loadOutput), string(setupOutput))
				result.Message = "Failed to enable Screen Sharing"
				result.Duration = time.Since(startTime).Milliseconds()
				return result
			}
			output = setupOutput
		} else {
			output = loadOutput
		}
	}

	// Set VNC password if provided
	if config.Password != "" {
		passResult := e.SetPassword(config.Password)
		if !passResult.Success {
			result.Output = string(output) + "\nPassword setting failed: " + passResult.ErrorMessage
		}
	}

	result.Success = true
	result.ExitCode = 0
	result.Message = "Screen Sharing enabled successfully"
	result.Output = string(output)
	result.Duration = time.Since(startTime).Milliseconds()
	return result
}

// Disable disables macOS Screen Sharing
func (e *DarwinRemoteAccessExecutor) Disable() models.ExecutionResult {
	startTime := time.Now()
	result := models.ExecutionResult{Success: false}

	// Method 1: Try using kickstart
	kickstartPath := "/System/Library/CoreServices/RemoteManagement/ARDAgent.app/Contents/Resources/kickstart"
	cmd := exec.Command(kickstartPath, "-deactivate", "-stop")
	output, err := cmd.CombinedOutput()

	if err != nil {
		// Method 2: Try using launchctl
		unloadCmd := exec.Command("launchctl", "unload", "-w", "/System/Library/LaunchDaemons/com.apple.screensharing.plist")
		unloadOutput, unloadErr := unloadCmd.CombinedOutput()

		if unloadErr != nil {
			result.ErrorMessage = fmt.Sprintf("Both methods failed. kickstart: %v, launchctl: %v", err, unloadErr)
			result.Output = fmt.Sprintf("kickstart: %s\nlaunchctl: %s", string(output), string(unloadOutput))
			result.Message = "Failed to disable Screen Sharing"
			result.Duration = time.Since(startTime).Milliseconds()
			return result
		}
		output = unloadOutput
	}

	result.Success = true
	result.ExitCode = 0
	result.Message = "Screen Sharing disabled successfully"
	result.Output = string(output)
	result.Duration = time.Since(startTime).Milliseconds()
	return result
}

// GetStatus returns the current status of Screen Sharing
func (e *DarwinRemoteAccessExecutor) GetStatus() models.RemoteAccessStatus {
	status := models.RemoteAccessStatus{
		Protocol:    "VNC",
		Port:        5900,
		ServiceName: "com.apple.screensharing",
	}

	// Check if Screen Sharing is running
	// Method 1: Check launchctl
	cmd := exec.Command("launchctl", "list")
	output, err := cmd.Output()
	if err == nil && strings.Contains(string(output), "com.apple.screensharing") {
		status.Enabled = true
	}

	// Method 2: Check if port 5900 is listening
	if !status.Enabled {
		netstatCmd := exec.Command("netstat", "-an")
		netstatOutput, err := netstatCmd.Output()
		if err == nil && strings.Contains(string(netstatOutput), ".5900") && strings.Contains(string(netstatOutput), "LISTEN") {
			status.Enabled = true
		}
	}

	// Method 3: Check with lsof
	if !status.Enabled {
		lsofCmd := exec.Command("lsof", "-i", ":5900")
		if lsofOutput, err := lsofCmd.Output(); err == nil && len(lsofOutput) > 0 {
			status.Enabled = true
		}
	}

	// Get actual port if different
	status.Port = e.getVNCPort()

	return status
}

// SetPassword sets the VNC password for Screen Sharing
func (e *DarwinRemoteAccessExecutor) SetPassword(password string) models.ExecutionResult {
	startTime := time.Now()
	result := models.ExecutionResult{Success: false}

	// Method 1: Use kickstart to set VNC password
	kickstartPath := "/System/Library/CoreServices/RemoteManagement/ARDAgent.app/Contents/Resources/kickstart"

	cmd := exec.Command(kickstartPath,
		"-configure",
		"-clientopts",
		"-setvnclegacy", "-vnclegacy", "yes",
		"-setvncpw", "-vncpw", password,
	)
	output, err := cmd.CombinedOutput()

	if err != nil {
		// Method 2: Try writing to VNC settings directly (requires sudo)
		// This writes a hashed password to the preferences
		writeCmd := exec.Command("defaults", "write",
			"/Library/Preferences/com.apple.VNCSettings.txt",
			"VNCPassword", "-data", password)
		writeOutput, writeErr := writeCmd.CombinedOutput()

		if writeErr != nil {
			result.ErrorMessage = fmt.Sprintf("Failed to set VNC password: kickstart: %v, defaults: %v", err, writeErr)
			result.Output = fmt.Sprintf("kickstart: %s\ndefaults: %s", string(output), string(writeOutput))
			result.Message = "Failed to set VNC password"
			result.Duration = time.Since(startTime).Milliseconds()
			return result
		}
		output = writeOutput
	}

	result.Success = true
	result.ExitCode = 0
	result.Message = "VNC password set successfully"
	result.Output = string(output)
	result.Duration = time.Since(startTime).Milliseconds()
	return result
}

// getVNCPort tries to determine the actual VNC port
func (e *DarwinRemoteAccessExecutor) getVNCPort() int {
	// Check for custom port in defaults
	cmd := exec.Command("defaults", "read", "/Library/Preferences/com.apple.RemoteManagement", "VNCPort")
	if output, err := cmd.Output(); err == nil {
		portStr := strings.TrimSpace(string(output))
		if port, err := strconv.Atoi(portStr); err == nil {
			return port
		}
	}
	return 5900 // Default VNC port
}
