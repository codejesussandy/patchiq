//go:build windows

package executors

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"time"

	"github.com/patchify/agent/internal/models"
)

// WindowsSoftwareExecutor handles Windows software installation
type WindowsSoftwareExecutor struct{}

// NewWindowsSoftwareExecutor creates a new Windows software executor
func NewWindowsSoftwareExecutor() *WindowsSoftwareExecutor {
	return &WindowsSoftwareExecutor{}
}

// InstallSoftware installs software on Windows
func (e *WindowsSoftwareExecutor) InstallSoftware(pkg models.SoftwarePackage) models.ExecutionResult {
	startTime := time.Now()

	switch strings.ToLower(pkg.Source) {
	case "winget":
		return e.installWithWinget(pkg, startTime)
	case "choco", "chocolatey":
		return e.installWithChocolatey(pkg, startTime)
	case "msi":
		return e.installMSI(pkg, startTime)
	case "exe":
		return e.installEXE(pkg, startTime)
	case "url":
		return e.installFromURL(pkg, startTime)
	default:
		return models.ExecutionResult{
			Success:      false,
			Message:      fmt.Sprintf("Unknown installation source: %s", pkg.Source),
			ErrorMessage: "Supported sources: winget, choco, msi, exe, url",
			Duration:     time.Since(startTime).Milliseconds(),
		}
	}
}

// installWithWinget installs using Windows Package Manager (winget)
func (e *WindowsSoftwareExecutor) installWithWinget(pkg models.SoftwarePackage, startTime time.Time) models.ExecutionResult {
	result := models.ExecutionResult{Success: false}

	// Check if winget is available
	wingetPath, err := exec.LookPath("winget")
	if err != nil {
		result.ErrorMessage = "winget is not installed or not in PATH"
		result.Message = "Cannot install via winget - winget not found"
		result.Duration = time.Since(startTime).Milliseconds()
		return result
	}

	// Build install command
	// Use --id if the name looks like a winget ID (contains a dot, e.g. "7zip.7zip"),
	// otherwise use --name for display name matching (e.g. "7-Zip")
	nameFlag := "--name"
	if strings.Contains(pkg.Name, ".") {
		nameFlag = "--id"
	}
	args := []string{"install", nameFlag, pkg.Name, "--silent", "--accept-package-agreements", "--accept-source-agreements"}

	if pkg.Version != "" {
		args = append(args, "--version", pkg.Version)
	}

	cmd := exec.Command(wingetPath, args...)
	output, err := cmd.CombinedOutput()

	result.Duration = time.Since(startTime).Milliseconds()
	result.Output = string(output)

	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitErr.ExitCode()
			// 0x8a15002b = package already installed / no update available — treat as success
			if exitErr.ExitCode() == 0x8a15002b {
				result.Success = true
				result.Message = fmt.Sprintf("%s is already installed (up to date)", pkg.Name)
				return result
			}
		}
		result.ErrorMessage = err.Error()
		result.Message = fmt.Sprintf("Failed to install %s via winget", pkg.Name)
		return result
	}

	result.Success = true
	result.ExitCode = 0
	result.Message = fmt.Sprintf("Successfully installed %s via winget", pkg.Name)
	return result
}

// installWithChocolatey installs using Chocolatey
func (e *WindowsSoftwareExecutor) installWithChocolatey(pkg models.SoftwarePackage, startTime time.Time) models.ExecutionResult {
	result := models.ExecutionResult{Success: false}

	// Check if choco is available
	chocoPath, err := exec.LookPath("choco")
	if err != nil {
		result.ErrorMessage = "Chocolatey is not installed"
		result.Message = "Cannot install via Chocolatey - choco not found"
		result.Duration = time.Since(startTime).Milliseconds()
		return result
	}

	// Build install command
	args := []string{"install", pkg.Name, "-y"}

	if pkg.Version != "" {
		args = append(args, "--version", pkg.Version)
	}

	cmd := exec.Command(chocoPath, args...)
	output, err := cmd.CombinedOutput()

	result.Duration = time.Since(startTime).Milliseconds()
	result.Output = string(output)

	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitErr.ExitCode()
		}
		result.ErrorMessage = err.Error()
		result.Message = fmt.Sprintf("Failed to install %s via Chocolatey", pkg.Name)
		return result
	}

	result.Success = true
	result.ExitCode = 0
	result.Message = fmt.Sprintf("Successfully installed %s via Chocolatey", pkg.Name)
	return result
}

// installMSI installs an MSI package
func (e *WindowsSoftwareExecutor) installMSI(pkg models.SoftwarePackage, startTime time.Time) models.ExecutionResult {
	result := models.ExecutionResult{Success: false}

	msiPath := pkg.PackageURL
	tempFile := ""

	// Download if URL provided
	if strings.HasPrefix(pkg.PackageURL, "http://") || strings.HasPrefix(pkg.PackageURL, "https://") {
		var err error
		tempFile, err = downloadFile(pkg.PackageURL, pkg.Checksum)
		if err != nil {
			result.ErrorMessage = err.Error()
			result.Message = "Failed to download MSI"
			result.Duration = time.Since(startTime).Milliseconds()
			return result
		}
		msiPath = tempFile
		defer os.Remove(tempFile)
	}

	// Verify file exists
	if _, err := os.Stat(msiPath); os.IsNotExist(err) {
		result.ErrorMessage = fmt.Sprintf("MSI file not found: %s", msiPath)
		result.Message = "MSI file does not exist"
		result.Duration = time.Since(startTime).Milliseconds()
		return result
	}

	// Build msiexec command
	args := []string{"/i", msiPath, "/quiet", "/norestart"}

	// Add custom arguments if provided
	if pkg.Arguments != "" {
		args = append(args, strings.Fields(pkg.Arguments)...)
	}

	cmd := exec.Command("msiexec", args...)
	output, err := cmd.CombinedOutput()

	result.Duration = time.Since(startTime).Milliseconds()
	result.Output = string(output)

	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitErr.ExitCode()
		}
		result.ErrorMessage = err.Error()
		result.Message = fmt.Sprintf("Failed to install MSI: %s", pkg.Name)
		return result
	}

	result.Success = true
	result.ExitCode = 0
	result.Message = fmt.Sprintf("Successfully installed %s", pkg.Name)
	return result
}

// installEXE installs an EXE installer
func (e *WindowsSoftwareExecutor) installEXE(pkg models.SoftwarePackage, startTime time.Time) models.ExecutionResult {
	result := models.ExecutionResult{Success: false}

	exePath := pkg.PackageURL
	tempFile := ""

	// Download if URL provided
	if strings.HasPrefix(pkg.PackageURL, "http://") || strings.HasPrefix(pkg.PackageURL, "https://") {
		var err error
		tempFile, err = downloadFile(pkg.PackageURL, pkg.Checksum)
		if err != nil {
			result.ErrorMessage = err.Error()
			result.Message = "Failed to download installer"
			result.Duration = time.Since(startTime).Milliseconds()
			return result
		}
		exePath = tempFile
		defer os.Remove(tempFile)
	}

	// Verify file exists
	if _, err := os.Stat(exePath); os.IsNotExist(err) {
		result.ErrorMessage = fmt.Sprintf("Installer not found: %s", exePath)
		result.Message = "Installer file does not exist"
		result.Duration = time.Since(startTime).Milliseconds()
		return result
	}

	// Build arguments - try common silent flags
	args := []string{}
	if pkg.Arguments != "" {
		args = strings.Fields(pkg.Arguments)
	} else if pkg.Silent {
		// Try common silent install flags
		args = []string{"/S", "/silent", "/quiet", "/VERYSILENT"}
	}

	cmd := exec.Command(exePath, args...)
	output, err := cmd.CombinedOutput()

	result.Duration = time.Since(startTime).Milliseconds()
	result.Output = string(output)

	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitErr.ExitCode()
		}
		result.ErrorMessage = err.Error()
		result.Message = fmt.Sprintf("Failed to install: %s", pkg.Name)
		return result
	}

	result.Success = true
	result.ExitCode = 0
	result.Message = fmt.Sprintf("Successfully installed %s", pkg.Name)
	return result
}

// installFromURL downloads and installs based on file extension
func (e *WindowsSoftwareExecutor) installFromURL(pkg models.SoftwarePackage, startTime time.Time) models.ExecutionResult {
	url := pkg.PackageURL
	if url == "" {
		return models.ExecutionResult{
			Success:      false,
			Message:      "No URL provided",
			ErrorMessage: "packageUrl is required for url source",
			Duration:     time.Since(startTime).Milliseconds(),
		}
	}

	// Determine type from URL
	lowerURL := strings.ToLower(url)
	switch {
	case strings.HasSuffix(lowerURL, ".msi"):
		pkg.Source = "msi"
		return e.installMSI(pkg, startTime)
	case strings.HasSuffix(lowerURL, ".exe"):
		pkg.Source = "exe"
		return e.installEXE(pkg, startTime)
	default:
		return models.ExecutionResult{
			Success:      false,
			Message:      "Unknown file type",
			ErrorMessage: "URL must point to .msi or .exe file",
			Duration:     time.Since(startTime).Milliseconds(),
		}
	}
}

// UninstallSoftware removes software on Windows
func (e *WindowsSoftwareExecutor) UninstallSoftware(name string) models.ExecutionResult {
	startTime := time.Now()
	result := models.ExecutionResult{Success: false}

	// Try winget first with fully silent/non-interactive flags
	wingetPath, err := exec.LookPath("winget")
	if err == nil {
		// Use --force to bypass interactive uninstallers, --disable-interactivity to suppress prompts
		// Use --name if no dot (display name), --id if dot-separated (winget ID)
		nameFlag := "--name"
		if strings.Contains(name, ".") {
			nameFlag = "--id"
		}
		cmd := exec.Command(wingetPath, "uninstall", nameFlag, name,
			"--silent", "--force", "--disable-interactivity",
			"--accept-source-agreements")
		output, err := cmd.CombinedOutput()
		if err == nil {
			result.Success = true
			result.Message = fmt.Sprintf("Uninstalled %s via winget", name)
			result.Output = string(output)
			result.Duration = time.Since(startTime).Milliseconds()
			return result
		}
	}

	// Try Chocolatey
	chocoPath, err := exec.LookPath("choco")
	if err == nil {
		cmd := exec.Command(chocoPath, "uninstall", name, "-y", "--force")
		output, err := cmd.CombinedOutput()
		if err == nil {
			result.Success = true
			result.Message = fmt.Sprintf("Uninstalled %s via Chocolatey", name)
			result.Output = string(output)
			result.Duration = time.Since(startTime).Milliseconds()
			return result
		}
	}

	// Try registry-based silent uninstall (more reliable than WMI for most apps)
	psScript := fmt.Sprintf(`
		$ErrorActionPreference = 'Stop'
		$paths = @(
			'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*',
			'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*',
			'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*'
		)
		$app = Get-ItemProperty $paths -ErrorAction SilentlyContinue |
			Where-Object { $_.DisplayName -like '*%s*' } |
			Select-Object -First 1

		if (-not $app) {
			Write-Error "Application '%s' not found in registry"
			exit 1
		}

		Write-Host "Found: $($app.DisplayName) ($($app.DisplayVersion))"
		$uninstallStr = $app.QuietUninstallString
		if (-not $uninstallStr) { $uninstallStr = $app.UninstallString }
		if (-not $uninstallStr) {
			Write-Error "No uninstall command found"
			exit 1
		}

		Write-Host "Uninstall command: $uninstallStr"

		# Add silent flags if not already present
		if ($uninstallStr -match 'msiexec') {
			# MSI uninstall — force quiet mode
			if ($uninstallStr -notmatch '/quiet|/qn') {
				$uninstallStr = $uninstallStr + ' /quiet /norestart'
			}
		} else {
			# EXE uninstall — try common silent flags
			if ($uninstallStr -notmatch '/S|/silent|/quiet|--silent') {
				$uninstallStr = $uninstallStr + ' /S'
			}
		}

		Write-Host "Running: $uninstallStr"
		cmd /c $uninstallStr 2>&1
		if ($LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq 3010) {
			Write-Host "Uninstalled successfully"
		} else {
			Write-Error "Uninstall exited with code $LASTEXITCODE"
			exit $LASTEXITCODE
		}
	`, name, name)

	cmd := exec.Command("powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", psScript)
	output, err := cmd.CombinedOutput()

	result.Duration = time.Since(startTime).Milliseconds()
	result.Output = string(output)

	if err != nil {
		result.ErrorMessage = "Software not found or uninstall failed"
		result.Message = fmt.Sprintf("Failed to uninstall %s", name)
		return result
	}

	result.Success = true
	result.Message = fmt.Sprintf("Uninstalled %s", name)
	return result
}

// GetInstalledVersion returns the installed version of software
func (e *WindowsSoftwareExecutor) GetInstalledVersion(name string) (string, error) {
	// Try winget
	wingetPath, err := exec.LookPath("winget")
	if err == nil {
		cmd := exec.Command(wingetPath, "list", "--id", name)
		output, err := cmd.Output()
		if err == nil {
			lines := strings.Split(string(output), "\n")
			for _, line := range lines {
				if strings.Contains(line, name) {
					fields := strings.Fields(line)
					if len(fields) >= 2 {
						return fields[len(fields)-1], nil
					}
				}
			}
		}
	}

	// Try registry
	psScript := fmt.Sprintf(`
		$paths = @(
			'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*',
			'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'
		)

		foreach ($path in $paths) {
			$app = Get-ItemProperty $path -ErrorAction SilentlyContinue |
				Where-Object { $_.DisplayName -like '*%s*' } |
				Select-Object -First 1

			if ($app.DisplayVersion) {
				Write-Output $app.DisplayVersion
				exit 0
			}
		}
		exit 1
	`, name)

	cmd := exec.Command("powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", psScript)
	output, err := cmd.Output()
	if err == nil {
		version := strings.TrimSpace(string(output))
		if version != "" {
			return version, nil
		}
	}

	return "", fmt.Errorf("version not found for %s", name)
}

// downloadFile downloads a file from URL and verifies checksum if provided
func downloadFile(url string, expectedChecksum string) (string, error) {
	resp, err := http.Get(url)
	if err != nil {
		return "", fmt.Errorf("download failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("download failed with status: %d", resp.StatusCode)
	}

	// Create temp file
	tmpFile, err := os.CreateTemp("", "download-*")
	if err != nil {
		return "", fmt.Errorf("failed to create temp file: %v", err)
	}
	defer tmpFile.Close()

	// Download with checksum calculation
	hasher := sha256.New()
	writer := io.MultiWriter(tmpFile, hasher)

	if _, err := io.Copy(writer, resp.Body); err != nil {
		os.Remove(tmpFile.Name())
		return "", fmt.Errorf("failed to write file: %v", err)
	}

	// Verify checksum if provided
	if expectedChecksum != "" {
		actualChecksum := hex.EncodeToString(hasher.Sum(nil))
		if !strings.EqualFold(actualChecksum, expectedChecksum) {
			os.Remove(tmpFile.Name())
			return "", fmt.Errorf("checksum mismatch: expected %s, got %s", expectedChecksum, actualChecksum)
		}
	}

	return tmpFile.Name(), nil
}
