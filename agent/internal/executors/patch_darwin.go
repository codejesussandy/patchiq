//go:build darwin

package executors

import (
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
func (e *DarwinPatchExecutor) InstallPatch(patchID string, options models.PatchOptions) models.ExecutionResult {
	startTime := time.Now()
	result := models.ExecutionResult{
		Success: false,
	}

	// Build command arguments
	args := []string{"--install", patchID}
	if options.AllowReboot {
		args = append(args, "--restart")
	}

	cmd := exec.Command("softwareupdate", args...)
	output, err := cmd.CombinedOutput()

	result.Duration = time.Since(startTime).Milliseconds()
	result.Output = string(output)

	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitErr.ExitCode()
		}
		result.ErrorMessage = err.Error()
		result.Message = fmt.Sprintf("Failed to install patch: %s", patchID)
		return result
	}

	result.Success = true
	result.ExitCode = 0
	result.Message = fmt.Sprintf("Successfully installed patch: %s", patchID)
	return result
}

// UninstallPatch is not supported on macOS
func (e *DarwinPatchExecutor) UninstallPatch(patchID string) models.ExecutionResult {
	return models.ExecutionResult{
		Success:      false,
		Message:      "Patch uninstallation is not supported on macOS",
		ErrorMessage: "macOS does not support uninstalling system updates",
		ExitCode:     1,
	}
}

// InstallAllPatches installs all available macOS updates
func (e *DarwinPatchExecutor) InstallAllPatches(options models.PatchOptions) models.ExecutionResult {
	startTime := time.Now()
	result := models.ExecutionResult{
		Success: false,
	}

	// Build command arguments
	args := []string{"--install", "--all"}
	if options.AllowReboot {
		args = append(args, "--restart")
	}

	cmd := exec.Command("softwareupdate", args...)
	output, err := cmd.CombinedOutput()

	result.Duration = time.Since(startTime).Milliseconds()
	result.Output = string(output)

	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitErr.ExitCode()
		}
		result.ErrorMessage = err.Error()
		result.Message = "Failed to install all patches"
		return result
	}

	result.Success = true
	result.ExitCode = 0
	result.Message = "Successfully installed all available patches"
	return result
}

// ListAvailablePatches lists available macOS software updates
func (e *DarwinPatchExecutor) ListAvailablePatches() ([]models.PatchInfo, error) {
	cmd := exec.Command("softwareupdate", "--list")
	output, err := cmd.CombinedOutput()
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
func (e *DarwinPatchExecutor) CheckRebootRequired() bool {
	// Check for pending restart file
	if _, err := os.Stat("/var/db/.AppleUpgrade"); err == nil {
		return true
	}

	// Check softwareupdate restart required
	cmd := exec.Command("softwareupdate", "--list")
	output, _ := cmd.CombinedOutput()
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
