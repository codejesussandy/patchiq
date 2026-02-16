//go:build darwin

package executors

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"regexp"
	"strings"
	"time"

	"github.com/patchify/agent/internal/models"
)

// DarwinPatchExecutor handles macOS software updates
type DarwinPatchExecutor struct{}

// NewDarwinPatchExecutor creates a new macOS patch executor
func NewDarwinPatchExecutor() *DarwinPatchExecutor {
	return &DarwinPatchExecutor{}
}

// InstallPatch installs a specific macOS software update
func (e *DarwinPatchExecutor) InstallPatch(ctx context.Context, patchID string, options models.PatchOptions) models.ExecutionResult {
	startTime := time.Now()
	result := models.ExecutionResult{
		Success: false,
	}

	// Build command arguments
	args := []string{"--install", patchID}
	if options.AllowReboot {
		args = append(args, "--restart")
	}

	cmd := exec.CommandContext(ctx, "softwareupdate", args...)
	output, err := cmd.CombinedOutput()

	result.Duration = time.Since(startTime).Milliseconds()
	result.Output = string(output)

	// Check for timeout
	if ctx.Err() == context.DeadlineExceeded {
		result.ErrorCode = models.ErrTimeout
		result.ErrorMessage = "Patch installation timed out"
		result.Retryable = true
		result.Message = "Command execution timed out"
		result.ExitCode = -1
		return result
	}

	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitErr.ExitCode()
		}
		classifyDarwinPatchError(&result, err, string(output))
		result.Message = fmt.Sprintf("Failed to install patch: %s", patchID)
		return result
	}

	result.Success = true
	result.ExitCode = 0
	result.Message = fmt.Sprintf("Successfully installed patch: %s", patchID)
	return result
}

// UninstallPatch is not supported on macOS
func (e *DarwinPatchExecutor) UninstallPatch(ctx context.Context, patchID string) models.ExecutionResult {
	return models.ExecutionResult{
		Success:      false,
		Message:      "Patch uninstallation is not supported on macOS",
		ErrorMessage: "macOS does not support uninstalling system updates",
		ExitCode:     1,
	}
}

// InstallAllPatches installs all available macOS updates
func (e *DarwinPatchExecutor) InstallAllPatches(ctx context.Context, options models.PatchOptions) models.ExecutionResult {
	startTime := time.Now()
	result := models.ExecutionResult{
		Success: false,
	}

	// Build command arguments
	args := []string{"--install", "--all"}
	if options.AllowReboot {
		args = append(args, "--restart")
	}

	cmd := exec.CommandContext(ctx, "softwareupdate", args...)
	output, err := cmd.CombinedOutput()

	result.Duration = time.Since(startTime).Milliseconds()
	result.Output = string(output)

	// Check for timeout
	if ctx.Err() == context.DeadlineExceeded {
		result.ErrorCode = models.ErrTimeout
		result.ErrorMessage = "Bulk patch installation timed out"
		result.Retryable = true
		result.Message = "Command execution timed out"
		result.ExitCode = -1
		return result
	}

	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitErr.ExitCode()
		}
		classifyDarwinPatchError(&result, err, string(output))
		result.Message = "Failed to install all patches"
		return result
	}

	result.Success = true
	result.ExitCode = 0
	result.Message = "Successfully installed all available patches"
	return result
}

// ListAvailablePatches lists available macOS software updates
func (e *DarwinPatchExecutor) ListAvailablePatches(ctx context.Context) ([]models.PatchInfo, error) {
	cmd := exec.CommandContext(ctx, "softwareupdate", "--list")
	output, err := cmd.CombinedOutput()

	// Check for timeout
	if ctx.Err() == context.DeadlineExceeded {
		return nil, fmt.Errorf("command timed out")
	}

	if err != nil {
		// If no updates available, softwareupdate may return non-zero
		if strings.Contains(string(output), "No new software available") {
			return []models.PatchInfo{}, nil
		}
		return nil, fmt.Errorf("failed to list patches: %v", err)
	}

	return parseSoftwareUpdateList(string(output)), nil
}

// CheckRebootRequired checks if a reboot is required on macOS
func (e *DarwinPatchExecutor) CheckRebootRequired(ctx context.Context) bool {
	// Check for pending restart file
	if _, err := os.Stat("/var/db/.AppleUpgrade"); err == nil {
		return true
	}

	// Check softwareupdate restart required
	cmd := exec.CommandContext(ctx, "softwareupdate", "--list")
	output, err := cmd.CombinedOutput()

	// If timeout or error, assume no reboot required (safer default)
	if err != nil || ctx.Err() == context.DeadlineExceeded {
		return false
	}

	return strings.Contains(string(output), "[restart]")
}

// parseSoftwareUpdateList parses the output of softwareupdate --list
func parseSoftwareUpdateList(output string) []models.PatchInfo {
	var patches []models.PatchInfo

	lines := strings.Split(output, "\n")

	// Pattern to match update entries
	// Example: "* Label: macOS Sonoma 14.2-23C71"
	labelRegex := regexp.MustCompile(`^\s*\*\s*Label:\s*(.+)$`)
	titleRegex := regexp.MustCompile(`^\s*Title:\s*(.+),\s*Version:\s*(.+),\s*Size:\s*(.+)$`)
	recommendedRegex := regexp.MustCompile(`\[recommended\]`)
	restartRegex := regexp.MustCompile(`\[restart\]`)

	var currentPatch *models.PatchInfo

	for _, line := range lines {
		// Check for Label line (patch identifier)
		if matches := labelRegex.FindStringSubmatch(line); len(matches) > 1 {
			if currentPatch != nil {
				patches = append(patches, *currentPatch)
			}
			currentPatch = &models.PatchInfo{
				ID:   strings.TrimSpace(matches[1]),
				Name: strings.TrimSpace(matches[1]),
			}
			currentPatch.Recommended = recommendedRegex.MatchString(line)
			currentPatch.RebootRequired = restartRegex.MatchString(line)
			continue
		}

		// Check for Title line (additional details)
		if matches := titleRegex.FindStringSubmatch(line); len(matches) > 3 && currentPatch != nil {
			currentPatch.Name = strings.TrimSpace(matches[1])
			currentPatch.Version = strings.TrimSpace(matches[2])
			// Size is in matches[3] but we'd need to parse it
			continue
		}

		// Check for recommended/restart flags on separate lines
		if currentPatch != nil {
			if recommendedRegex.MatchString(line) {
				currentPatch.Recommended = true
			}
			if restartRegex.MatchString(line) {
				currentPatch.RebootRequired = true
			}
		}
	}

	// Don't forget the last patch
	if currentPatch != nil {
		patches = append(patches, *currentPatch)
	}

	return patches
}

// classifyDarwinPatchError determines the appropriate error code for macOS update failures
func classifyDarwinPatchError(result *models.ExecutionResult, err error, output string) {
	if err == nil {
		return
	}

	errStr := err.Error()
	errLower := strings.ToLower(errStr)
	outputLower := strings.ToLower(output)

	// Check output for specific error patterns
	combined := errLower + " " + outputLower

	// Network errors
	if strings.Contains(combined, "network") ||
	   strings.Contains(combined, "connection") ||
	   strings.Contains(combined, "download") ||
	   strings.Contains(combined, "unreachable") ||
	   strings.Contains(combined, "failed to contact") {
		result.ErrorCode = models.ErrNetworkFailure
		result.ErrorMessage = fmt.Sprintf("Network error during update: %s", errStr)
		result.Retryable = true
		return
	}

	// Permission errors
	if strings.Contains(combined, "permission denied") ||
	   strings.Contains(combined, "not authorized") ||
	   strings.Contains(combined, "requires admin") ||
	   strings.Contains(combined, "root") {
		result.ErrorCode = models.ErrPermissionDenied
		result.ErrorMessage = "Insufficient permissions. Run as root/sudo."
		result.Retryable = false
		return
	}

	// Disk space errors
	if strings.Contains(combined, "disk") ||
	   strings.Contains(combined, "space") ||
	   strings.Contains(combined, "no space left") {
		result.ErrorCode = models.ErrDiskFull
		result.ErrorMessage = "Insufficient disk space for update"
		result.Retryable = false
		return
	}

	// Update not found
	if strings.Contains(combined, "not found") ||
	   strings.Contains(combined, "no updates") ||
	   strings.Contains(combined, "no such update") {
		result.ErrorCode = models.ErrPackageNotFound
		result.ErrorMessage = fmt.Sprintf("Update not found: %s", errStr)
		result.Retryable = false
		return
	}

	// Already installed
	if strings.Contains(combined, "already installed") ||
	   strings.Contains(combined, "up to date") {
		result.ErrorCode = models.ErrAlreadyInstalled
		result.ErrorMessage = "Update is already installed"
		result.Retryable = false
		return
	}

	// Service unavailable
	if strings.Contains(combined, "service") ||
	   strings.Contains(combined, "unavailable") ||
	   strings.Contains(combined, "server") {
		result.ErrorCode = models.ErrServiceUnavailable
		result.ErrorMessage = fmt.Sprintf("Software Update service unavailable: %s", errStr)
		result.Retryable = true
		return
	}

	// Default unknown error
	result.ErrorCode = models.ErrUnknown
	result.ErrorMessage = errStr
	result.Retryable = false
}

