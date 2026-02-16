//go:build linux

package executors

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"time"

	"github.com/patchify/agent/internal/models"
)

// LinuxPatchExecutor handles Linux package updates
type LinuxPatchExecutor struct {
	packageManager string
}

// NewLinuxPatchExecutor creates a new Linux patch executor
func NewLinuxPatchExecutor() *LinuxPatchExecutor {
	return &LinuxPatchExecutor{
		packageManager: detectPackageManager(),
	}
}

// detectPackageManager determines which package manager is available
func detectPackageManager() string {
	managers := []string{"apt-get", "dnf", "yum", "zypper", "pacman"}
	for _, mgr := range managers {
		if _, err := exec.LookPath(mgr); err == nil {
			return mgr
		}
	}
	return "apt-get" // Default fallback
}

// InstallPatch installs a specific package update
func (e *LinuxPatchExecutor) InstallPatch(ctx context.Context, patchID string, options models.PatchOptions) models.ExecutionResult {
	startTime := time.Now()
	result := models.ExecutionResult{
		Success: false,
	}

	// Check for timeout before starting
	select {
	case <-ctx.Done():
		result.ErrorCode = models.ErrTimeout
		result.ErrorMessage = "Operation timed out"
		result.Retryable = true
		result.Message = "Command timed out before execution"
		result.Duration = time.Since(startTime).Milliseconds()
		return result
	default:
	}

	var cmd *exec.Cmd

	switch e.packageManager {
	case "apt-get":
		// Update package list first
		updateCmd := exec.CommandContext(ctx, "apt-get", "update", "-qq")
		updateCmd.Run()
		cmd = exec.CommandContext(ctx, "apt-get", "install", "-y", "--only-upgrade", patchID)

	case "dnf":
		cmd = exec.CommandContext(ctx, "dnf", "update", "-y", patchID)

	case "yum":
		cmd = exec.CommandContext(ctx, "yum", "update", "-y", patchID)

	case "zypper":
		cmd = exec.CommandContext(ctx, "zypper", "--non-interactive", "update", patchID)

	case "pacman":
		cmd = exec.CommandContext(ctx, "pacman", "-Syu", "--noconfirm", patchID)

	default:
		result.ErrorMessage = fmt.Sprintf("Unsupported package manager: %s", e.packageManager)
		result.Message = "Package manager not supported"
		result.Duration = time.Since(startTime).Milliseconds()
		return result
	}

	output, err := cmd.CombinedOutput()

	result.Duration = time.Since(startTime).Milliseconds()
	result.Output = string(output)

	if err != nil {
		// Check if context was cancelled (timeout)
		if ctx.Err() == context.DeadlineExceeded {
			result.ErrorCode = models.ErrTimeout
		result.ErrorMessage = "Operation timed out"
		result.Retryable = true
			result.Message = "Command execution timed out"
			result.ExitCode = -1
			return result
		}

		if exitErr, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitErr.ExitCode()
		}
		// Classify the error and set appropriate error code
		setPatchErrorResult(&result, err, string(output), time.Since(startTime).Milliseconds())
		result.Message = fmt.Sprintf("Failed to update package: %s", patchID)
		return result
	}

	result.Success = true
	result.ExitCode = 0
	result.Message = fmt.Sprintf("Successfully updated package: %s", patchID)
	return result
}

// UninstallPatch removes a package (downgrade not typically supported)
func (e *LinuxPatchExecutor) UninstallPatch(ctx context.Context, patchID string) models.ExecutionResult {
	return models.ExecutionResult{
		Success:      false,
		Message:      "Patch uninstallation not supported on Linux",
		ErrorMessage: "Use software uninstall to remove packages instead",
		ExitCode:     1,
	}
}

// InstallAllPatches installs all available updates
func (e *LinuxPatchExecutor) InstallAllPatches(ctx context.Context, options models.PatchOptions) models.ExecutionResult {
	startTime := time.Now()
	result := models.ExecutionResult{
		Success: false,
	}

	// Check for timeout before starting
	select {
	case <-ctx.Done():
		result.ErrorCode = models.ErrTimeout
		result.ErrorMessage = "Operation timed out"
		result.Retryable = true
		result.Message = "Command timed out before execution"
		result.Duration = time.Since(startTime).Milliseconds()
		return result
	default:
	}

	var cmd *exec.Cmd

	switch e.packageManager {
	case "apt-get":
		// Update and upgrade
		updateCmd := exec.CommandContext(ctx, "apt-get", "update", "-qq")
		updateCmd.Run()
		if options.AllowReboot {
			cmd = exec.CommandContext(ctx, "apt-get", "dist-upgrade", "-y")
		} else {
			cmd = exec.CommandContext(ctx, "apt-get", "upgrade", "-y")
		}

	case "dnf":
		cmd = exec.CommandContext(ctx, "dnf", "upgrade", "-y")

	case "yum":
		cmd = exec.CommandContext(ctx, "yum", "update", "-y")

	case "zypper":
		cmd = exec.CommandContext(ctx, "zypper", "--non-interactive", "update")

	case "pacman":
		cmd = exec.CommandContext(ctx, "pacman", "-Syu", "--noconfirm")

	default:
		result.ErrorMessage = fmt.Sprintf("Unsupported package manager: %s", e.packageManager)
		result.Message = "Package manager not supported"
		result.Duration = time.Since(startTime).Milliseconds()
		return result
	}

	output, err := cmd.CombinedOutput()

	result.Duration = time.Since(startTime).Milliseconds()
	result.Output = string(output)

	if err != nil {
		// Check if context was cancelled (timeout)
		if ctx.Err() == context.DeadlineExceeded {
			result.ErrorCode = models.ErrTimeout
		result.ErrorMessage = "Operation timed out"
		result.Retryable = true
			result.Message = "Command execution timed out"
			result.ExitCode = -1
			return result
		}

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

// ListAvailablePatches lists available package updates
func (e *LinuxPatchExecutor) ListAvailablePatches(ctx context.Context) ([]models.PatchInfo, error) {
	var patches []models.PatchInfo

	switch e.packageManager {
	case "apt-get":
		// Update package list
		updateCmd := exec.CommandContext(ctx, "apt-get", "update", "-qq")
		updateCmd.Run()

		// List upgradable packages
		cmd := exec.CommandContext(ctx, "apt", "list", "--upgradable")
		output, err := cmd.Output()
		if err != nil {
			if ctx.Err() == context.DeadlineExceeded {
				return nil, fmt.Errorf("command timed out")
			}
			return nil, fmt.Errorf("failed to list updates: %v", err)
		}
		patches = parseAptList(string(output))

	case "dnf":
		cmd := exec.CommandContext(ctx, "dnf", "check-update", "--quiet")
		output, _ := cmd.Output() // dnf returns exit code 100 when updates are available
		if ctx.Err() == context.DeadlineExceeded {
			return nil, fmt.Errorf("command timed out")
		}
		patches = parseDnfList(string(output))

	case "yum":
		cmd := exec.CommandContext(ctx, "yum", "check-update", "--quiet")
		output, _ := cmd.Output()
		if ctx.Err() == context.DeadlineExceeded {
			return nil, fmt.Errorf("command timed out")
		}
		patches = parseYumList(string(output))

	case "zypper":
		cmd := exec.CommandContext(ctx, "zypper", "--non-interactive", "list-updates")
		output, err := cmd.Output()
		if err != nil {
			if ctx.Err() == context.DeadlineExceeded {
				return nil, fmt.Errorf("command timed out")
			}
			return nil, fmt.Errorf("failed to list updates: %v", err)
		}
		patches = parseZypperList(string(output))

	case "pacman":
		cmd := exec.CommandContext(ctx, "pacman", "-Qu")
		output, _ := cmd.Output()
		if ctx.Err() == context.DeadlineExceeded {
			return nil, fmt.Errorf("command timed out")
		}
		patches = parsePacmanList(string(output))
	}

	return patches, nil
}

// CheckRebootRequired checks if a reboot is required
func (e *LinuxPatchExecutor) CheckRebootRequired(ctx context.Context) bool {
	// Check for reboot-required file (Debian/Ubuntu)
	if _, err := os.Stat("/var/run/reboot-required"); err == nil {
		return true
	}

	// Check needs-restarting (RHEL/CentOS/Fedora)
	if cmd, err := exec.LookPath("needs-restarting"); err == nil {
		if exec.CommandContext(ctx, cmd, "-r").Run() != nil {
			return true
		}
	}

	// Check /run/reboot-required (some distros)
	if _, err := os.Stat("/run/reboot-required"); err == nil {
		return true
	}

	return false
}

// parseAptList parses apt list --upgradable output
func parseAptList(output string) []models.PatchInfo {
	var patches []models.PatchInfo
	lines := strings.Split(output, "\n")

	for _, line := range lines {
		if strings.Contains(line, "upgradable from") || strings.Contains(line, "/") {
			// Format: package/repo version arch [upgradable from: oldversion]
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				nameRepo := strings.Split(parts[0], "/")
				patches = append(patches, models.PatchInfo{
					ID:      nameRepo[0],
					Name:    nameRepo[0],
					Version: parts[1],
				})
			}
		}
	}
	return patches
}

// parseDnfList parses dnf check-update output
func parseDnfList(output string) []models.PatchInfo {
	var patches []models.PatchInfo
	lines := strings.Split(output, "\n")

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "Last metadata") {
			continue
		}

		parts := strings.Fields(line)
		if len(parts) >= 2 {
			patches = append(patches, models.PatchInfo{
				ID:      parts[0],
				Name:    parts[0],
				Version: parts[1],
			})
		}
	}
	return patches
}

// parseYumList parses yum check-update output
func parseYumList(output string) []models.PatchInfo {
	return parseDnfList(output) // Same format
}

// parseZypperList parses zypper list-updates output
func parseZypperList(output string) []models.PatchInfo {
	var patches []models.PatchInfo
	lines := strings.Split(output, "\n")

	inTable := false
	for _, line := range lines {
		if strings.Contains(line, "---") {
			inTable = true
			continue
		}
		if !inTable || line == "" {
			continue
		}

		parts := strings.Split(line, "|")
		if len(parts) >= 4 {
			patches = append(patches, models.PatchInfo{
				ID:      strings.TrimSpace(parts[2]),
				Name:    strings.TrimSpace(parts[2]),
				Version: strings.TrimSpace(parts[4]),
			})
		}
	}
	return patches
}

// parsePacmanList parses pacman -Qu output
func parsePacmanList(output string) []models.PatchInfo {
	var patches []models.PatchInfo
	lines := strings.Split(output, "\n")

	for _, line := range lines {
		parts := strings.Fields(line)
		if len(parts) >= 4 {
			// Format: package oldversion -> newversion
			patches = append(patches, models.PatchInfo{
				ID:      parts[0],
				Name:    parts[0],
				Version: parts[3],
			})
		}
	}
	return patches
}

// classifyPatchError determines the appropriate error code for patch installation errors
func classifyPatchError(err error, output string) (string, string) {
	if err == nil {
		return "", ""
	}
	
	errStr := err.Error()
	errLower := strings.ToLower(errStr)
	outputLower := strings.ToLower(output)
	
	// Check output for specific error patterns
	combined := errLower + " " + outputLower
	
	// Permission errors
	if strings.Contains(combined, "permission denied") || 
	   strings.Contains(combined, "are you root") ||
	   strings.Contains(combined, "operation not permitted") {
		return models.ErrPermissionDenied, "Insufficient permissions to install patch. Root/sudo access required."
	}
	
	// Package not found
	if strings.Contains(combined, "unable to locate package") ||
	   strings.Contains(combined, "no package") ||
	   strings.Contains(combined, "not found") ||
	   strings.Contains(combined, "package not available") {
		return models.ErrPackageNotFound, fmt.Sprintf("Package not found: %s", errStr)
	}
	
	// Disk space errors
	if strings.Contains(combined, "no space left") ||
	   strings.Contains(combined, "disk full") ||
	   strings.Contains(combined, "insufficient disk space") {
		return models.ErrDiskFull, "Insufficient disk space for installation"
	}
	
	// Network errors
	if strings.Contains(combined, "failed to fetch") ||
	   strings.Contains(combined, "could not download") ||
	   strings.Contains(combined, "temporary failure resolving") ||
	   strings.Contains(combined, "connection") ||
	   strings.Contains(combined, "network") ||
	   strings.Contains(combined, "unreachable") {
		return models.ErrNetworkFailure, fmt.Sprintf("Network error during package download: %s", errStr)
	}
	
	// Dependency errors
	if strings.Contains(combined, "depends") ||
	   strings.Contains(combined, "dependency") ||
	   strings.Contains(combined, "unmet dependencies") {
		return models.ErrDependencyMissing, fmt.Sprintf("Unmet dependencies: %s", errStr)
	}
	
	// Already installed
	if strings.Contains(combined, "already installed") ||
	   strings.Contains(combined, "already the newest") {
		return models.ErrAlreadyInstalled, "Package is already installed"
	}
	
	// Timeout
	if strings.Contains(combined, "timeout") ||
	   strings.Contains(combined, "deadline exceeded") {
		return models.ErrTimeout, "Installation timed out"
	}
	
	return models.ErrUnknown, errStr
}

// setPatchErrorResult sets an error result with proper error code classification
func setPatchErrorResult(result *models.ExecutionResult, err error, output string, duration int64) {
	errorCode, errorMsg := classifyPatchError(err, output)
	result.Success = false
	result.ErrorCode = errorCode
	result.ErrorMessage = errorMsg
	result.Retryable = models.IsRetryableError(errorCode)
	result.Duration = duration
	result.Output = output
}

