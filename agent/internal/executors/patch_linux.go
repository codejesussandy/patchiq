//go:build linux

package executors

import (
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
func (e *LinuxPatchExecutor) InstallPatch(patchID string, options models.PatchOptions) models.ExecutionResult {
	startTime := time.Now()
	result := models.ExecutionResult{
		Success: false,
	}

	var cmd *exec.Cmd

	switch e.packageManager {
	case "apt-get":
		// Update package list first
		exec.Command("apt-get", "update", "-qq").Run()
		cmd = exec.Command("apt-get", "install", "-y", "--only-upgrade", patchID)

	case "dnf":
		cmd = exec.Command("dnf", "update", "-y", patchID)

	case "yum":
		cmd = exec.Command("yum", "update", "-y", patchID)

	case "zypper":
		cmd = exec.Command("zypper", "--non-interactive", "update", patchID)

	case "pacman":
		cmd = exec.Command("pacman", "-Syu", "--noconfirm", patchID)

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
		if exitErr, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitErr.ExitCode()
		}
		result.ErrorMessage = err.Error()
		result.Message = fmt.Sprintf("Failed to update package: %s", patchID)
		return result
	}

	result.Success = true
	result.ExitCode = 0
	result.Message = fmt.Sprintf("Successfully updated package: %s", patchID)
	return result
}

// UninstallPatch removes a package (downgrade not typically supported)
func (e *LinuxPatchExecutor) UninstallPatch(patchID string) models.ExecutionResult {
	return models.ExecutionResult{
		Success:      false,
		Message:      "Patch uninstallation not supported on Linux",
		ErrorMessage: "Use software uninstall to remove packages instead",
		ExitCode:     1,
	}
}

// InstallAllPatches installs all available updates
func (e *LinuxPatchExecutor) InstallAllPatches(options models.PatchOptions) models.ExecutionResult {
	startTime := time.Now()
	result := models.ExecutionResult{
		Success: false,
	}

	var cmd *exec.Cmd

	switch e.packageManager {
	case "apt-get":
		// Update and upgrade
		exec.Command("apt-get", "update", "-qq").Run()
		if options.AllowReboot {
			cmd = exec.Command("apt-get", "dist-upgrade", "-y")
		} else {
			cmd = exec.Command("apt-get", "upgrade", "-y")
		}

	case "dnf":
		cmd = exec.Command("dnf", "upgrade", "-y")

	case "yum":
		cmd = exec.Command("yum", "update", "-y")

	case "zypper":
		cmd = exec.Command("zypper", "--non-interactive", "update")

	case "pacman":
		cmd = exec.Command("pacman", "-Syu", "--noconfirm")

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
func (e *LinuxPatchExecutor) ListAvailablePatches() ([]models.PatchInfo, error) {
	var patches []models.PatchInfo

	switch e.packageManager {
	case "apt-get":
		// Update package list
		exec.Command("apt-get", "update", "-qq").Run()

		// List upgradable packages
		cmd := exec.Command("apt", "list", "--upgradable")
		output, err := cmd.Output()
		if err != nil {
			return nil, fmt.Errorf("failed to list updates: %v", err)
		}
		patches = parseAptList(string(output))

	case "dnf":
		cmd := exec.Command("dnf", "check-update", "--quiet")
		output, _ := cmd.Output() // dnf returns exit code 100 when updates are available
		patches = parseDnfList(string(output))

	case "yum":
		cmd := exec.Command("yum", "check-update", "--quiet")
		output, _ := cmd.Output()
		patches = parseYumList(string(output))

	case "zypper":
		cmd := exec.Command("zypper", "--non-interactive", "list-updates")
		output, err := cmd.Output()
		if err != nil {
			return nil, fmt.Errorf("failed to list updates: %v", err)
		}
		patches = parseZypperList(string(output))

	case "pacman":
		cmd := exec.Command("pacman", "-Qu")
		output, _ := cmd.Output()
		patches = parsePacmanList(string(output))
	}

	return patches, nil
}

// CheckRebootRequired checks if a reboot is required
func (e *LinuxPatchExecutor) CheckRebootRequired() bool {
	// Check for reboot-required file (Debian/Ubuntu)
	if _, err := os.Stat("/var/run/reboot-required"); err == nil {
		return true
	}

	// Check needs-restarting (RHEL/CentOS/Fedora)
	if cmd, err := exec.LookPath("needs-restarting"); err == nil {
		if exec.Command(cmd, "-r").Run() != nil {
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
