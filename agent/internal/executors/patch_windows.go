//go:build windows

package executors

import (
	"fmt"
	"os/exec"
	"strings"
	"time"

	"github.com/patchify/agent/internal/models"
)

// WindowsPatchExecutor handles Windows Update operations
type WindowsPatchExecutor struct{}

// NewWindowsPatchExecutor creates a new Windows patch executor
func NewWindowsPatchExecutor() *WindowsPatchExecutor {
	return &WindowsPatchExecutor{}
}

// InstallPatch installs a specific Windows update by KB number
func (e *WindowsPatchExecutor) InstallPatch(patchID string, options models.PatchOptions) models.ExecutionResult {
	startTime := time.Now()
	result := models.ExecutionResult{
		Success: false,
	}

	// Try PSWindowsUpdate module first (most reliable)
	psScript := fmt.Sprintf(`
		$ErrorActionPreference = 'Stop'
		try {
			Import-Module PSWindowsUpdate -ErrorAction SilentlyContinue
			if (Get-Module PSWindowsUpdate) {
				Install-WindowsUpdate -KBArticleID %s -AcceptAll -IgnoreReboot -Confirm:$false
				Write-Output "Update installed successfully"
			} else {
				# Fallback to Windows Update Agent COM
				$Session = New-Object -ComObject Microsoft.Update.Session
				$Searcher = $Session.CreateUpdateSearcher()
				$SearchResult = $Searcher.Search("IsInstalled=0 and Type='Software'")
				$UpdatesToInstall = New-Object -ComObject Microsoft.Update.UpdateColl

				foreach ($Update in $SearchResult.Updates) {
					foreach ($KB in $Update.KBArticleIDs) {
						if ($KB -eq '%s' -or $Update.Title -like '*%s*') {
							$UpdatesToInstall.Add($Update)
							break
						}
					}
				}

				if ($UpdatesToInstall.Count -eq 0) {
					throw "Update %s not found"
				}

				$Installer = $Session.CreateUpdateInstaller()
				$Installer.Updates = $UpdatesToInstall
				$InstallResult = $Installer.Install()

				if ($InstallResult.ResultCode -eq 2) {
					Write-Output "Update installed successfully"
				} else {
					throw "Installation failed with code: $($InstallResult.ResultCode)"
				}
			}
		} catch {
			Write-Error $_.Exception.Message
			exit 1
		}
	`, patchID, patchID, patchID, patchID)

	cmd := exec.Command("powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", psScript)
	output, err := cmd.CombinedOutput()

	result.Duration = time.Since(startTime).Milliseconds()
	result.Output = string(output)

	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitErr.ExitCode()
		}
		result.ErrorMessage = err.Error()
		result.Message = fmt.Sprintf("Failed to install update: %s", patchID)
		return result
	}

	result.Success = true
	result.ExitCode = 0
	result.Message = fmt.Sprintf("Successfully installed update: %s", patchID)
	return result
}

// UninstallPatch removes a Windows update by KB number
func (e *WindowsPatchExecutor) UninstallPatch(patchID string) models.ExecutionResult {
	startTime := time.Now()
	result := models.ExecutionResult{
		Success: false,
	}

	// Use WUSA to uninstall
	kbNumber := strings.TrimPrefix(strings.ToUpper(patchID), "KB")
	cmd := exec.Command("wusa", "/uninstall", "/kb:"+kbNumber, "/quiet", "/norestart")
	output, err := cmd.CombinedOutput()

	result.Duration = time.Since(startTime).Milliseconds()
	result.Output = string(output)

	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitErr.ExitCode()
		}
		result.ErrorMessage = err.Error()
		result.Message = fmt.Sprintf("Failed to uninstall update: KB%s", kbNumber)
		return result
	}

	result.Success = true
	result.ExitCode = 0
	result.Message = fmt.Sprintf("Successfully uninstalled update: KB%s", kbNumber)
	return result
}

// InstallAllPatches installs all available Windows updates
func (e *WindowsPatchExecutor) InstallAllPatches(options models.PatchOptions) models.ExecutionResult {
	startTime := time.Now()
	result := models.ExecutionResult{
		Success: false,
	}

	rebootFlag := "-IgnoreReboot"
	if options.AllowReboot {
		rebootFlag = "-AutoReboot"
	}

	psScript := fmt.Sprintf(`
		$ErrorActionPreference = 'Stop'
		try {
			Import-Module PSWindowsUpdate -ErrorAction SilentlyContinue
			if (Get-Module PSWindowsUpdate) {
				Install-WindowsUpdate -AcceptAll %s -Confirm:$false
				Write-Output "All updates installed successfully"
			} else {
				# Fallback to Windows Update Agent COM
				$Session = New-Object -ComObject Microsoft.Update.Session
				$Searcher = $Session.CreateUpdateSearcher()
				$SearchResult = $Searcher.Search("IsInstalled=0 and Type='Software'")

				if ($SearchResult.Updates.Count -eq 0) {
					Write-Output "No updates available"
					exit 0
				}

				$Installer = $Session.CreateUpdateInstaller()
				$Installer.Updates = $SearchResult.Updates
				$InstallResult = $Installer.Install()

				Write-Output "Installed $($InstallResult.Updates.Count) updates"
				if ($InstallResult.RebootRequired) {
					Write-Output "Reboot required"
				}
			}
		} catch {
			Write-Error $_.Exception.Message
			exit 1
		}
	`, rebootFlag)

	cmd := exec.Command("powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", psScript)
	output, err := cmd.CombinedOutput()

	result.Duration = time.Since(startTime).Milliseconds()
	result.Output = string(output)

	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitErr.ExitCode()
		}
		result.ErrorMessage = err.Error()
		result.Message = "Failed to install all updates"
		return result
	}

	result.Success = true
	result.ExitCode = 0
	result.Message = "Successfully installed all available updates"
	return result
}

// ListAvailablePatches lists available Windows updates
func (e *WindowsPatchExecutor) ListAvailablePatches() ([]models.PatchInfo, error) {
	psScript := `
		$ErrorActionPreference = 'Stop'
		$Session = New-Object -ComObject Microsoft.Update.Session
		$Searcher = $Session.CreateUpdateSearcher()
		$SearchResult = $Searcher.Search("IsInstalled=0 and Type='Software'")

		foreach ($Update in $SearchResult.Updates) {
			$kb = ""
			if ($Update.KBArticleIDs.Count -gt 0) {
				$kb = "KB" + $Update.KBArticleIDs[0]
			}

			$severity = "Unknown"
			switch ($Update.MsrcSeverity) {
				"Critical" { $severity = "Critical" }
				"Important" { $severity = "High" }
				"Moderate" { $severity = "Medium" }
				"Low" { $severity = "Low" }
			}

			Write-Output "$kb|$($Update.Title)|$severity|$($Update.MaxDownloadSize)|$($Update.RebootRequired)"
		}
	`

	cmd := exec.Command("powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", psScript)
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to list updates: %v", err)
	}

	return parseWindowsUpdateList(string(output)), nil
}

// CheckRebootRequired checks if Windows needs a reboot
func (e *WindowsPatchExecutor) CheckRebootRequired() bool {
	// Check multiple registry keys for pending reboot
	psScript := `
		$rebootRequired = $false

		# Check Component Based Servicing
		if (Test-Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending") {
			$rebootRequired = $true
		}

		# Check Windows Update
		if (Test-Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired") {
			$rebootRequired = $true
		}

		# Check Pending File Rename Operations
		$pendingRename = (Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager" -Name PendingFileRenameOperations -ErrorAction SilentlyContinue).PendingFileRenameOperations
		if ($pendingRename) {
			$rebootRequired = $true
		}

		Write-Output $rebootRequired
	`

	cmd := exec.Command("powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", psScript)
	output, _ := cmd.Output()
	return strings.TrimSpace(string(output)) == "True"
}

// parseWindowsUpdateList parses the PowerShell output
func parseWindowsUpdateList(output string) []models.PatchInfo {
	var patches []models.PatchInfo

	lines := strings.Split(strings.TrimSpace(output), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		parts := strings.Split(line, "|")
		if len(parts) >= 5 {
			var size int64
			fmt.Sscanf(parts[3], "%d", &size)

			patches = append(patches, models.PatchInfo{
				ID:             parts[0],
				Name:           parts[1],
				Severity:       parts[2],
				Size:           size,
				RebootRequired: parts[4] == "True",
			})
		}
	}

	return patches
}
