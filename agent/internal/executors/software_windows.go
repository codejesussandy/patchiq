//go:build windows

package executors

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
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
func (e *WindowsSoftwareExecutor) InstallSoftware(ctx context.Context, pkg models.SoftwarePackage) models.ExecutionResult {
	startTime := time.Now()

	switch strings.ToLower(pkg.Source) {
	case "winget":
		return e.installWithWinget(ctx, pkg, startTime)
	case "choco", "chocolatey":
		return e.installWithChocolatey(ctx, pkg, startTime)
	case "msi":
		return e.installMSI(ctx, pkg, startTime)
	case "exe":
		return e.installEXE(ctx, pkg, startTime)
	case "url":
		return e.installFromURL(ctx, pkg, startTime)
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
func (e *WindowsSoftwareExecutor) installWithWinget(ctx context.Context, pkg models.SoftwarePackage, startTime time.Time) models.ExecutionResult {
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

	cmd := exec.CommandContext(ctx, wingetPath, args...)
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
		if ctx.Err() == context.DeadlineExceeded {
			result.ErrorCode = models.ErrTimeout
			result.Retryable = true
			result.ErrorMessage = "Command timeout exceeded"
		} else {
			classifySoftwareError(&result, err, string(output))
		}
		result.Message = fmt.Sprintf("Failed to install %s via winget", pkg.Name)
		return result
	}

	result.Success = true
	result.ExitCode = 0
	result.Message = fmt.Sprintf("Successfully installed %s via winget", pkg.Name)
	return result
}

// installWithChocolatey installs using Chocolatey
func (e *WindowsSoftwareExecutor) installWithChocolatey(ctx context.Context, pkg models.SoftwarePackage, startTime time.Time) models.ExecutionResult {
	result := models.ExecutionResult{Success: false}

	// Check if choco is available
	chocoPath, err := exec.LookPath("choco")
	if err != nil {
		result.ErrorMessage = "Chocolatey is not installed"
		result.Message = "Cannot install via Chocolatey - choco not found"
		result.Duration = time.Since(startTime).Milliseconds()
		return result
	}

	// Build install command with dependency handling
	// -y = auto-confirm all prompts (non-interactive mode)
	args := []string{"install", pkg.Name, "-y"}

	if pkg.Version != "" {
		args = append(args, "--version", pkg.Version)
		// Allow downgrades if version is specified and lower than installed
		args = append(args, "--allow-downgrade")
	}

	// Limit output for cleaner logs
	args = append(args, "--no-progress")

	// Note: Chocolatey handles dependencies automatically by default, which is what we want
	// No need to add --ignore-dependencies unless specifically requested via pkg.Arguments

	cmd := exec.CommandContext(ctx, chocoPath, args...)
	output, err := cmd.CombinedOutput()

	result.Duration = time.Since(startTime).Milliseconds()
	result.Output = string(output)

	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitErr.ExitCode()
		}
		if ctx.Err() == context.DeadlineExceeded {
			result.ErrorCode = models.ErrTimeout
			result.Retryable = true
			result.ErrorMessage = "Command timeout exceeded"
		} else {
			classifySoftwareError(&result, err, string(output))
		}
		result.Message = fmt.Sprintf("Failed to install %s via Chocolatey", pkg.Name)
		return result
	}

	result.Success = true
	result.ExitCode = 0
	result.Message = fmt.Sprintf("Successfully installed %s via Chocolatey", pkg.Name)
	return result
}

// installMSI installs an MSI package
func (e *WindowsSoftwareExecutor) installMSI(ctx context.Context, pkg models.SoftwarePackage, startTime time.Time) models.ExecutionResult {
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
	// /qn = fully silent (no UI), /norestart = don't restart automatically
	args := []string{"/i", msiPath, "/qn", "/norestart"}

	// Add verbose logging to temp file for troubleshooting
	logFile := filepath.Join(os.TempDir(), fmt.Sprintf("msi-install-%d.log", time.Now().UnixNano()))
	args = append(args, "/l*v", logFile)

	// Add custom arguments/properties if provided (e.g., INSTALLDIR="C:\Custom\Path")
	if pkg.Arguments != "" {
		args = append(args, strings.Fields(pkg.Arguments)...)
	}

	cmd := exec.CommandContext(ctx, "msiexec", args...)
	output, err := cmd.CombinedOutput()

	// Append log file contents to output for better debugging
	if logData, logErr := os.ReadFile(logFile); logErr == nil {
		output = append(output, []byte("\n\n=== MSI Install Log ===\n")...)
		output = append(output, logData...)
	}
	defer os.Remove(logFile) // Clean up log file

	result.Duration = time.Since(startTime).Milliseconds()
	result.Output = string(output)

	// Handle exit codes
	exitCode := 0
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			exitCode = exitErr.ExitCode()
			result.ExitCode = exitCode
		} else {
			result.ExitCode = -1
		}

		// Check for context timeout
		if ctx.Err() == context.DeadlineExceeded {
			result.ErrorCode = models.ErrTimeout
			result.Retryable = true
			result.ErrorMessage = "Command timeout exceeded"
			result.Message = fmt.Sprintf("Failed to install MSI: %s (timeout)", pkg.Name)
			return result
		}

		// Map MSI-specific exit codes
		errorCode, errorMsg, retryable := mapMSIExitCode(exitCode)

		// Special case: exit code 3010 means success with reboot required
		if exitCode == 3010 {
			result.Success = true
			result.Message = fmt.Sprintf("Successfully installed %s (reboot required)", pkg.Name)
			result.Metadata = map[string]string{"rebootRequired": "true"}
			return result
		}

		result.ErrorCode = errorCode
		result.ErrorMessage = errorMsg
		result.Retryable = retryable
		result.Message = fmt.Sprintf("Failed to install MSI: %s (code %d)", pkg.Name, exitCode)
		return result
	}

	result.Success = true
	result.ExitCode = 0
	result.Message = fmt.Sprintf("Successfully installed %s", pkg.Name)
	return result
}

// installEXE installs an EXE installer
func (e *WindowsSoftwareExecutor) installEXE(ctx context.Context, pkg models.SoftwarePackage, startTime time.Time) models.ExecutionResult {
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

	// Build arguments
	var args []string
	if pkg.Arguments != "" {
		// Use custom arguments if provided
		args = strings.Fields(pkg.Arguments)
	} else if pkg.Silent {
		// Auto-detect and try common silent install flags ONE AT A TIME
		// Different installers use different flags, trying all at once causes failures
		silentFlags := [][]string{
			{"/S"},                    // NSIS installers (Nullsoft)
			{"/silent"},               // InstallShield
			{"/quiet"},                // Generic
			{"/VERYSILENT"},           // Inno Setup
			{"/qn"},                   // MSI-based EXE wrappers
			{"--silent"},              // Some modern installers
			{"-s"},                    // Rare but used by some
			{"/passive"},              // Shows minimal UI
		}

		// Try each silent flag until one succeeds
		for i, flagSet := range silentFlags {
			cmd := exec.CommandContext(ctx, exePath, flagSet...)
			output, err := cmd.CombinedOutput()

			if err == nil {
				// Success with this flag
				result.Success = true
				result.ExitCode = 0
				result.Output = string(output)
				result.Duration = time.Since(startTime).Milliseconds()
				result.Message = fmt.Sprintf("Successfully installed %s (silent flag: %v)", pkg.Name, flagSet)
				return result
			}

			// Log the attempt for debugging
			if i == len(silentFlags)-1 {
				// Last attempt failed, return error
				result.Output = string(output)
				result.Duration = time.Since(startTime).Milliseconds()
				if exitErr, ok := err.(*exec.ExitError); ok {
					result.ExitCode = exitErr.ExitCode()
				}
				if ctx.Err() == context.DeadlineExceeded {
					result.ErrorCode = models.ErrTimeout
					result.Retryable = true
					result.ErrorMessage = "Command timeout exceeded"
				} else {
					classifySoftwareError(&result, err, string(output))
				}
				result.Message = fmt.Sprintf("Failed to install: %s (tried all silent flags)", pkg.Name)
				return result
			}
		}
	}

	// Non-silent installation or custom arguments
	cmd := exec.CommandContext(ctx, exePath, args...)
	output, err := cmd.CombinedOutput()

	result.Duration = time.Since(startTime).Milliseconds()
	result.Output = string(output)

	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitErr.ExitCode()
		}
		if ctx.Err() == context.DeadlineExceeded {
			result.ErrorCode = models.ErrTimeout
			result.Retryable = true
			result.ErrorMessage = "Command timeout exceeded"
		} else {
			classifySoftwareError(&result, err, string(output))
		}
		result.Message = fmt.Sprintf("Failed to install: %s", pkg.Name)
		return result
	}

	result.Success = true
	result.ExitCode = 0
	result.Message = fmt.Sprintf("Successfully installed %s", pkg.Name)
	return result
}

// installFromURL downloads and installs based on file extension
func (e *WindowsSoftwareExecutor) installFromURL(ctx context.Context, pkg models.SoftwarePackage, startTime time.Time) models.ExecutionResult {
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
		return e.installMSI(ctx, pkg, startTime)
	case strings.HasSuffix(lowerURL, ".exe"):
		pkg.Source = "exe"
		return e.installEXE(ctx, pkg, startTime)
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
func (e *WindowsSoftwareExecutor) UninstallSoftware(ctx context.Context, name string) models.ExecutionResult {
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
		cmd := exec.CommandContext(ctx, wingetPath, "uninstall", nameFlag, name,
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
		cmd := exec.CommandContext(ctx, chocoPath, "uninstall", name, "-y", "--force")
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

	cmd := exec.CommandContext(ctx, "powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", psScript)
	output, err := cmd.CombinedOutput()

	result.Duration = time.Since(startTime).Milliseconds()
	result.Output = string(output)

	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			result.ErrorCode = models.ErrTimeout
			result.Retryable = true
			result.ErrorMessage = "Command timeout exceeded"
		} else {
			result.ErrorMessage = "Software not found or uninstall failed"
		}
		result.Message = fmt.Sprintf("Failed to uninstall %s", name)
		return result
	}

	result.Success = true
	result.Message = fmt.Sprintf("Uninstalled %s", name)
	return result
}

// GetInstalledVersion returns the installed version of software
func (e *WindowsSoftwareExecutor) GetInstalledVersion(ctx context.Context, name string) (string, error) {
	// Try winget
	wingetPath, err := exec.LookPath("winget")
	if err == nil {
		cmd := exec.CommandContext(ctx, wingetPath, "list", "--id", name)
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

	cmd := exec.CommandContext(ctx, "powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", psScript)
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

// mapMSIExitCode maps msiexec exit codes to human-readable error messages
func mapMSIExitCode(exitCode int) (string, string, bool) {
	// Reference: https://learn.microsoft.com/en-us/windows/win32/msi/error-codes
	codeMap := map[int]struct {
		code      string
		message   string
		retryable bool
	}{
		0:    {models.ErrUnknown, "Success", false},
		1259: {models.ErrInvalidInput, "This network connection does not exist", false},
		1601: {models.ErrPermissionDenied, "Windows Installer service could not be accessed", true},
		1602: {models.ErrUserCancelled, "User cancelled installation", false},
		1603: {models.ErrUnknown, "Fatal error during installation", false},
		1604: {models.ErrNotInstalled, "Installation suspended (incomplete)", false},
		1605: {models.ErrNotInstalled, "This action is only valid for products that are currently installed", false},
		1606: {models.ErrInvalidInput, "Feature ID not registered", false},
		1607: {models.ErrInvalidInput, "Component ID not registered", false},
		1608: {models.ErrInvalidInput, "Unknown property", false},
		1609: {models.ErrInvalidInput, "Handle is in an invalid state", false},
		1610: {models.ErrInvalidInput, "Configuration data corrupt", false},
		1611: {models.ErrInvalidInput, "Component qualifier not present", false},
		1612: {models.ErrInvalidInput, "Install source unavailable", true},
		1613: {models.ErrInvalidPayload, "Package cannot be installed by Windows Installer service", false},
		1618: {models.ErrServiceUnavailable, "Another installation is already in progress", true},
		1619: {models.ErrInvalidPayload, "Package could not be opened (verify it's a valid MSI)", false},
		1620: {models.ErrInvalidPayload, "This package is for a different platform", false},
		1621: {models.ErrInvalidInput, "There was an error starting Windows Installer", true},
		1622: {models.ErrInvalidPayload, "Error opening installation log file", false},
		1623: {models.ErrInvalidPayload, "This language is not supported", false},
		1624: {models.ErrInvalidPayload, "Error applying transforms", false},
		1625: {models.ErrPermissionDenied, "Installation forbidden by system policy", false},
		1626: {models.ErrInvalidPayload, "Function could not be executed", false},
		1627: {models.ErrInvalidPayload, "Function failed during execution", false},
		1628: {models.ErrInvalidInput, "Invalid or unknown table specified", false},
		1629: {models.ErrInvalidInput, "Data supplied is wrong type", false},
		1630: {models.ErrInvalidInput, "Data of this type is not supported", false},
		1631: {models.ErrServiceUnavailable, "Windows Installer service could not be started", true},
		1632: {models.ErrInvalidPayload, "Temp folder is full or inaccessible", false},
		1633: {models.ErrIncompatible, "This installation package is not supported on this platform", false},
		1634: {models.ErrInvalidInput, "Component not used on this machine", false},
		1635: {models.ErrInvalidPayload, "This patch package could not be opened", false},
		1636: {models.ErrInvalidPayload, "This patch package could not be applied", false},
		1637: {models.ErrInvalidPayload, "This patch is not applicable to this product", false},
		1638: {models.ErrAlreadyInstalled, "Another version of this product is already installed", false},
		1639: {models.ErrInvalidInput, "Invalid command line argument", false},
		1640: {models.ErrPermissionDenied, "Installation from a Remote Desktop Connection not permitted", false},
		1641: {models.ErrUnknown, "Installer initiated restart (reboot pending)", false},
		1642: {models.ErrInvalidPayload, "Installer cannot install upgrade patch", false},
		1643: {models.ErrInvalidPayload, "Patch package is not permitted by system policy", false},
		1644: {models.ErrInvalidPayload, "One or more customizations are not permitted", false},
		1645: {models.ErrPermissionDenied, "Windows Installer does not permit install from Remote Desktop", false},
		1646: {models.ErrInvalidPayload, "Patch package is not a removable patch", false},
		1647: {models.ErrInvalidPayload, "Patch is not applied to this product", false},
		1648: {models.ErrInvalidInput, "No valid sequence could be found for the set of patches", false},
		1649: {models.ErrInvalidPayload, "Patch removal was disallowed by policy", false},
		1650: {models.ErrInvalidPayload, "Invalid patch XML", false},
		1651: {models.ErrPermissionDenied, "Admin user required for patch installation", false},
		3010: {models.ErrUnknown, "Success (reboot required)", false}, // Not really an error
	}

	if info, exists := codeMap[exitCode]; exists {
		return info.code, info.message, info.retryable
	}

	return models.ErrUnknown, fmt.Sprintf("Unknown MSI error code: %d", exitCode), false
}

// classifySoftwareError determines the appropriate error code for software installation failures
func classifySoftwareError(result *models.ExecutionResult, err error, output string) {
	if err == nil {
		return
	}

	errStr := err.Error()
	errLower := strings.ToLower(errStr)
	outputLower := strings.ToLower(output)

	// Check output for specific error patterns
	combined := errLower + " " + outputLower

	// Network errors
	if strings.Contains(combined, "download") ||
	   strings.Contains(combined, "network") ||
	   strings.Contains(combined, "connection") ||
	   strings.Contains(combined, "unreachable") ||
	   strings.Contains(combined, "failed to fetch") ||
	   strings.Contains(combined, "timeout") {
		result.ErrorCode = models.ErrNetworkFailure
		result.ErrorMessage = fmt.Sprintf("Network error during download: %s", errStr)
		result.Retryable = true
		return
	}

	// Permission errors
	if strings.Contains(combined, "access denied") ||
	   strings.Contains(combined, "permission denied") ||
	   strings.Contains(combined, "administrator") ||
	   strings.Contains(combined, "privilege") ||
	   strings.Contains(combined, "0x80070005") { // ERROR_ACCESS_DENIED
		result.ErrorCode = models.ErrPermissionDenied
		result.ErrorMessage = "Insufficient permissions. Run as Administrator."
		result.Retryable = false
		return
	}

	// Disk space errors
	if strings.Contains(combined, "disk") ||
	   strings.Contains(combined, "space") ||
	   strings.Contains(combined, "0x80070070") { // ERROR_DISK_FULL
		result.ErrorCode = models.ErrDiskFull
		result.ErrorMessage = "Insufficient disk space for installation"
		result.Retryable = false
		return
	}

	// Package not found
	if strings.Contains(combined, "not found") ||
	   strings.Contains(combined, "no package") ||
	   strings.Contains(combined, "could not find") ||
	   strings.Contains(combined, "0x8a15000f") { // APPINSTALLER_CLI_ERROR_NO_APPLICABLE_INSTALLER
		result.ErrorCode = models.ErrPackageNotFound
		result.ErrorMessage = fmt.Sprintf("Package not found: %s", errStr)
		result.Retryable = false
		return
	}

	// Already installed
	if strings.Contains(combined, "already installed") ||
	   strings.Contains(combined, "0x8a15002b") { // APPINSTALLER_CLI_ERROR_UPDATE_NOT_APPLICABLE
		result.ErrorCode = models.ErrAlreadyInstalled
		result.ErrorMessage = "Package is already installed"
		result.Retryable = false
		return
	}

	// Checksum mismatch
	if strings.Contains(combined, "checksum") ||
	   strings.Contains(combined, "hash") ||
	   strings.Contains(combined, "integrity") {
		result.ErrorCode = models.ErrChecksumMismatch
		result.ErrorMessage = fmt.Sprintf("Package integrity check failed: %s", errStr)
		result.Retryable = false
		return
	}

	// Dependency errors
	if strings.Contains(combined, "dependency") ||
	   strings.Contains(combined, "depends") ||
	   strings.Contains(combined, "prerequisite") {
		result.ErrorCode = models.ErrDependencyMissing
		result.ErrorMessage = fmt.Sprintf("Missing dependencies: %s", errStr)
		result.Retryable = false
		return
	}

	// Default unknown error
	result.ErrorCode = models.ErrUnknown
	result.ErrorMessage = errStr
	result.Retryable = false
}

