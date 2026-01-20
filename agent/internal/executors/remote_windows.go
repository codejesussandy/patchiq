//go:build windows

package executors

import (
	"fmt"
	"os/exec"
	"strings"
	"time"

	"github.com/patchify/agent/internal/models"
)

// WindowsRemoteAccessExecutor handles Windows Remote Desktop (RDP)
type WindowsRemoteAccessExecutor struct{}

// NewWindowsRemoteAccessExecutor creates a new Windows remote access executor
func NewWindowsRemoteAccessExecutor() *WindowsRemoteAccessExecutor {
	return &WindowsRemoteAccessExecutor{}
}

// Enable enables Windows Remote Desktop
func (e *WindowsRemoteAccessExecutor) Enable(config models.RemoteAccessConfig) models.ExecutionResult {
	startTime := time.Now()
	result := models.ExecutionResult{Success: false}

	// PowerShell script to enable RDP
	psScript := `
		$ErrorActionPreference = 'Stop'
		try {
			# Enable RDP via registry
			Set-ItemProperty -Path 'HKLM:\System\CurrentControlSet\Control\Terminal Server' -Name "fDenyTSConnections" -Value 0

			# Enable firewall rules for RDP
			Enable-NetFirewallRule -DisplayGroup "Remote Desktop" -ErrorAction SilentlyContinue

			# Alternative: Enable via netsh if Enable-NetFirewallRule fails
			netsh advfirewall firewall set rule group="remote desktop" new enable=Yes 2>$null

			# Ensure Network Level Authentication is configured appropriately
			Set-ItemProperty -Path 'HKLM:\System\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp' -Name "UserAuthentication" -Value 1

			# Start the Remote Desktop Services
			Set-Service -Name TermService -StartupType Automatic
			Start-Service -Name TermService

			Write-Output "Remote Desktop enabled successfully"
		} catch {
			Write-Error $_.Exception.Message
			exit 1
		}
	`

	cmd := exec.Command("powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", psScript)
	output, err := cmd.CombinedOutput()

	result.Duration = time.Since(startTime).Milliseconds()
	result.Output = string(output)

	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitErr.ExitCode()
		}
		result.ErrorMessage = err.Error()
		result.Message = "Failed to enable Remote Desktop"
		return result
	}

	// Configure port if specified
	if config.Port > 0 && config.Port != 3389 {
		portResult := e.setRDPPort(config.Port)
		if !portResult.Success {
			result.Output += "\nWarning: Failed to change RDP port: " + portResult.ErrorMessage
		}
	}

	result.Success = true
	result.ExitCode = 0
	result.Message = "Remote Desktop enabled successfully"
	return result
}

// Disable disables Windows Remote Desktop
func (e *WindowsRemoteAccessExecutor) Disable() models.ExecutionResult {
	startTime := time.Now()
	result := models.ExecutionResult{Success: false}

	psScript := `
		$ErrorActionPreference = 'Stop'
		try {
			# Disable RDP via registry
			Set-ItemProperty -Path 'HKLM:\System\CurrentControlSet\Control\Terminal Server' -Name "fDenyTSConnections" -Value 1

			# Disable firewall rules for RDP
			Disable-NetFirewallRule -DisplayGroup "Remote Desktop" -ErrorAction SilentlyContinue

			# Alternative: Disable via netsh
			netsh advfirewall firewall set rule group="remote desktop" new enable=No 2>$null

			Write-Output "Remote Desktop disabled successfully"
		} catch {
			Write-Error $_.Exception.Message
			exit 1
		}
	`

	cmd := exec.Command("powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", psScript)
	output, err := cmd.CombinedOutput()

	result.Duration = time.Since(startTime).Milliseconds()
	result.Output = string(output)

	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitErr.ExitCode()
		}
		result.ErrorMessage = err.Error()
		result.Message = "Failed to disable Remote Desktop"
		return result
	}

	result.Success = true
	result.ExitCode = 0
	result.Message = "Remote Desktop disabled successfully"
	return result
}

// GetStatus returns the current status of Remote Desktop
func (e *WindowsRemoteAccessExecutor) GetStatus() models.RemoteAccessStatus {
	status := models.RemoteAccessStatus{
		Protocol:    "RDP",
		Port:        3389,
		ServiceName: "TermService",
	}

	// Check if RDP is enabled
	psScript := `
		try {
			$rdpEnabled = (Get-ItemProperty -Path 'HKLM:\System\CurrentControlSet\Control\Terminal Server' -Name "fDenyTSConnections").fDenyTSConnections -eq 0
			$service = Get-Service -Name TermService -ErrorAction SilentlyContinue
			$serviceRunning = $service -and $service.Status -eq 'Running'

			if ($rdpEnabled -and $serviceRunning) {
				Write-Output "Enabled"
			} else {
				Write-Output "Disabled"
			}
		} catch {
			Write-Output "Unknown"
		}
	`

	cmd := exec.Command("powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", psScript)
	output, _ := cmd.Output()

	status.Enabled = strings.TrimSpace(string(output)) == "Enabled"

	// Get current port
	status.Port = e.getRDPPort()

	// Get allowed users
	status.AllowedUsers = e.getRDPUsers()

	return status
}

// SetPassword is not applicable for RDP (uses Windows user credentials)
func (e *WindowsRemoteAccessExecutor) SetPassword(password string) models.ExecutionResult {
	return models.ExecutionResult{
		Success:      false,
		Message:      "RDP uses Windows user credentials",
		ErrorMessage: "To set RDP access, configure Windows user accounts instead",
	}
}

// setRDPPort changes the RDP listening port
func (e *WindowsRemoteAccessExecutor) setRDPPort(port int) models.ExecutionResult {
	result := models.ExecutionResult{Success: false}

	psScript := fmt.Sprintf(`
		$ErrorActionPreference = 'Stop'
		try {
			Set-ItemProperty -Path 'HKLM:\System\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp' -Name "PortNumber" -Value %d

			# Update firewall rule
			$existingRule = Get-NetFirewallRule -DisplayName "Remote Desktop - User Mode (TCP-In)" -ErrorAction SilentlyContinue
			if ($existingRule) {
				Set-NetFirewallRule -DisplayName "Remote Desktop - User Mode (TCP-In)" -LocalPort %d
			}

			# Restart service to apply
			Restart-Service -Name TermService -Force

			Write-Output "RDP port changed to %d"
		} catch {
			Write-Error $_.Exception.Message
			exit 1
		}
	`, port, port, port)

	cmd := exec.Command("powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", psScript)
	output, err := cmd.CombinedOutput()

	result.Output = string(output)

	if err != nil {
		result.ErrorMessage = err.Error()
		result.Message = fmt.Sprintf("Failed to change RDP port to %d", port)
		return result
	}

	result.Success = true
	result.Message = fmt.Sprintf("RDP port changed to %d", port)
	return result
}

// getRDPPort returns the current RDP port
func (e *WindowsRemoteAccessExecutor) getRDPPort() int {
	psScript := `
		try {
			$port = (Get-ItemProperty -Path 'HKLM:\System\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp' -Name "PortNumber").PortNumber
			Write-Output $port
		} catch {
			Write-Output "3389"
		}
	`

	cmd := exec.Command("powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", psScript)
	output, _ := cmd.Output()

	var port int
	fmt.Sscanf(strings.TrimSpace(string(output)), "%d", &port)
	if port == 0 {
		port = 3389
	}
	return port
}

// getRDPUsers returns users with RDP access
func (e *WindowsRemoteAccessExecutor) getRDPUsers() []string {
	psScript := `
		try {
			$members = Get-LocalGroupMember -Group "Remote Desktop Users" -ErrorAction SilentlyContinue
			$members | ForEach-Object { Write-Output $_.Name }
		} catch {
			# Group might not exist or no members
		}
	`

	cmd := exec.Command("powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", psScript)
	output, _ := cmd.Output()

	var users []string
	for _, line := range strings.Split(string(output), "\n") {
		user := strings.TrimSpace(line)
		if user != "" {
			users = append(users, user)
		}
	}
	return users
}
