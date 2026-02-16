//go:build windows

package executors

import (
	"bytes"
	"context"
	"fmt"
	"os/exec"
	"strings"
	"time"
)

// PowerShellExecutor provides utilities for executing PowerShell scripts and commands on Windows
type PowerShellExecutor struct {
	execPolicy string // Execution policy to use (default: Bypass)
	usePwsh    bool   // Use PowerShell 7+ (pwsh.exe) instead of PowerShell 5.x (powershell.exe)
}

// NewPowerShellExecutor creates a new PowerShell executor
// If usePwsh is true, tries to use PowerShell 7+ (pwsh.exe), falls back to powershell.exe
func NewPowerShellExecutor(usePwsh bool) *PowerShellExecutor {
	return &PowerShellExecutor{
		execPolicy: "Bypass",
		usePwsh:    usePwsh,
	}
}

// ExecuteScript executes a PowerShell script string with the given timeout
// Returns stdout, stderr, exit code, and error
func (p *PowerShellExecutor) ExecuteScript(ctx context.Context, script string, timeout time.Duration) (string, string, int, error) {
	// Determine which PowerShell executable to use
	psExe := "powershell"
	if p.usePwsh {
		if _, err := exec.LookPath("pwsh"); err == nil {
			psExe = "pwsh"
		}
	}

	// Create context with timeout if specified
	var cmd *exec.Cmd
	if timeout > 0 {
		timeoutCtx, cancel := context.WithTimeout(ctx, timeout)
		defer cancel()
		cmd = exec.CommandContext(timeoutCtx, psExe, "-NoProfile", "-ExecutionPolicy", p.execPolicy, "-Command", script)
	} else {
		cmd = exec.CommandContext(ctx, psExe, "-NoProfile", "-ExecutionPolicy", p.execPolicy, "-Command", script)
	}

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	exitCode := 0
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			exitCode = exitErr.ExitCode()
		} else {
			exitCode = -1
		}
	}

	return stdout.String(), stderr.String(), exitCode, err
}

// ExecuteCommand executes a PowerShell command (shorter syntax than ExecuteScript)
func (p *PowerShellExecutor) ExecuteCommand(ctx context.Context, command string) (string, error) {
	stdout, stderr, exitCode, err := p.ExecuteScript(ctx, command, 0)
	if err != nil {
		if stderr != "" {
			return stdout, fmt.Errorf("powershell failed (exit %d): %s", exitCode, stderr)
		}
		return stdout, fmt.Errorf("powershell failed (exit %d): %w", exitCode, err)
	}
	return stdout, nil
}

// ExecuteScriptFile executes a PowerShell script file (.ps1)
func (p *PowerShellExecutor) ExecuteScriptFile(ctx context.Context, scriptPath string, timeout time.Duration) (string, string, int, error) {
	psExe := "powershell"
	if p.usePwsh {
		if _, err := exec.LookPath("pwsh"); err == nil {
			psExe = "pwsh"
		}
	}

	var cmd *exec.Cmd
	if timeout > 0 {
		timeoutCtx, cancel := context.WithTimeout(ctx, timeout)
		defer cancel()
		cmd = exec.CommandContext(timeoutCtx, psExe, "-NoProfile", "-ExecutionPolicy", p.execPolicy, "-File", scriptPath)
	} else {
		cmd = exec.CommandContext(ctx, psExe, "-NoProfile", "-ExecutionPolicy", p.execPolicy, "-File", scriptPath)
	}

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	exitCode := 0
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			exitCode = exitErr.ExitCode()
		} else {
			exitCode = -1
		}
	}

	return stdout.String(), stderr.String(), exitCode, err
}

// IsAdministrator checks if the current process is running with administrator privileges
func (p *PowerShellExecutor) IsAdministrator(ctx context.Context) bool {
	script := `
		$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
		$currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
	`

	output, _, _, err := p.ExecuteScript(ctx, script, 5*time.Second)
	if err != nil {
		return false
	}

	return strings.TrimSpace(output) == "True"
}

// GetPowerShellVersion returns the PowerShell version (e.g., "5.1.19041.4412" or "7.4.1")
func (p *PowerShellExecutor) GetPowerShellVersion(ctx context.Context) (string, error) {
	output, err := p.ExecuteCommand(ctx, "$PSVersionTable.PSVersion.ToString()")
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(output), nil
}

// CheckModuleAvailable checks if a PowerShell module is available
func (p *PowerShellExecutor) CheckModuleAvailable(ctx context.Context, moduleName string) bool {
	script := fmt.Sprintf("(Get-Module -ListAvailable -Name %s) -ne $null", moduleName)
	output, _, _, err := p.ExecuteScript(ctx, script, 10*time.Second)
	if err != nil {
		return false
	}
	return strings.TrimSpace(output) == "True"
}

// InstallModule attempts to install a PowerShell module from PSGallery
// Requires administrator privileges
func (p *PowerShellExecutor) InstallModule(ctx context.Context, moduleName string) error {
	script := fmt.Sprintf(`
		$ErrorActionPreference = 'Stop'
		try {
			Install-Module -Name %s -Force -AllowClobber -Scope CurrentUser -ErrorAction Stop
			Write-Output "Module installed successfully"
		} catch {
			Write-Error $_.Exception.Message
			exit 1
		}
	`, moduleName)

	_, stderr, exitCode, err := p.ExecuteScript(ctx, script, 120*time.Second)
	if err != nil {
		if stderr != "" {
			return fmt.Errorf("failed to install module %s (exit %d): %s", moduleName, exitCode, stderr)
		}
		return fmt.Errorf("failed to install module %s: %w", moduleName, err)
	}
	return nil
}

// GetRegistryValue reads a registry value
// Example: keyPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion", valueName = "ProgramFilesDir"
func (p *PowerShellExecutor) GetRegistryValue(ctx context.Context, keyPath, valueName string) (string, error) {
	script := fmt.Sprintf(`
		try {
			$value = Get-ItemPropertyValue -Path "%s" -Name "%s" -ErrorAction Stop
			Write-Output $value
		} catch {
			exit 1
		}
	`, keyPath, valueName)

	output, _, _, err := p.ExecuteScript(ctx, script, 5*time.Second)
	if err != nil {
		return "", fmt.Errorf("registry value not found: %s\\%s", keyPath, valueName)
	}
	return strings.TrimSpace(output), nil
}

// SetRegistryValue sets a registry value
// valueType can be: "String", "DWord", "QWord", "Binary", "MultiString", "ExpandString"
func (p *PowerShellExecutor) SetRegistryValue(ctx context.Context, keyPath, valueName, value, valueType string) error {
	script := fmt.Sprintf(`
		$ErrorActionPreference = 'Stop'
		try {
			if (-not (Test-Path "%s")) {
				New-Item -Path "%s" -Force | Out-Null
			}
			Set-ItemProperty -Path "%s" -Name "%s" -Value "%s" -Type %s
			Write-Output "Registry value set successfully"
		} catch {
			Write-Error $_.Exception.Message
			exit 1
		}
	`, keyPath, keyPath, keyPath, valueName, value, valueType)

	_, stderr, exitCode, err := p.ExecuteScript(ctx, script, 10*time.Second)
	if err != nil {
		if stderr != "" {
			return fmt.Errorf("failed to set registry value (exit %d): %s", exitCode, stderr)
		}
		return fmt.Errorf("failed to set registry value: %w", err)
	}
	return nil
}

// AddFirewallRule adds a Windows Firewall rule
// This requires administrator privileges
func (p *PowerShellExecutor) AddFirewallRule(ctx context.Context, ruleName, program string, port int, protocol string) error {
	var ruleCmd string
	if program != "" {
		// Program-based rule
		ruleCmd = fmt.Sprintf(`
			New-NetFirewallRule -DisplayName "%s" -Direction Inbound -Program "%s" -Action Allow -Profile Any
		`, ruleName, program)
	} else if port > 0 {
		// Port-based rule
		ruleCmd = fmt.Sprintf(`
			New-NetFirewallRule -DisplayName "%s" -Direction Inbound -LocalPort %d -Protocol %s -Action Allow -Profile Any
		`, ruleName, port, protocol)
	} else {
		return fmt.Errorf("either program or port must be specified")
	}

	script := fmt.Sprintf(`
		$ErrorActionPreference = 'Stop'
		try {
			# Check if rule already exists
			$existing = Get-NetFirewallRule -DisplayName "%s" -ErrorAction SilentlyContinue
			if ($existing) {
				Write-Output "Firewall rule already exists"
				exit 0
			}

			%s
			Write-Output "Firewall rule added successfully"
		} catch {
			Write-Error $_.Exception.Message
			exit 1
		}
	`, ruleName, ruleCmd)

	_, stderr, exitCode, err := p.ExecuteScript(ctx, script, 30*time.Second)
	if err != nil {
		if stderr != "" {
			return fmt.Errorf("failed to add firewall rule (exit %d): %s", exitCode, stderr)
		}
		return fmt.Errorf("failed to add firewall rule: %w", err)
	}
	return nil
}

// RemoveFirewallRule removes a Windows Firewall rule by name
func (p *PowerShellExecutor) RemoveFirewallRule(ctx context.Context, ruleName string) error {
	script := fmt.Sprintf(`
		$ErrorActionPreference = 'Stop'
		try {
			Remove-NetFirewallRule -DisplayName "%s" -ErrorAction Stop
			Write-Output "Firewall rule removed successfully"
		} catch {
			# Ignore if rule doesn't exist
			if ($_.Exception.Message -notlike "*No MSFT_NetFirewallRule objects found*") {
				Write-Error $_.Exception.Message
				exit 1
			}
		}
	`, ruleName)

	_, stderr, exitCode, err := p.ExecuteScript(ctx, script, 10*time.Second)
	if err != nil {
		if stderr != "" && !strings.Contains(stderr, "No MSFT_NetFirewallRule objects found") {
			return fmt.Errorf("failed to remove firewall rule (exit %d): %s", exitCode, stderr)
		}
		// Ignore "rule not found" errors
	}
	return nil
}
