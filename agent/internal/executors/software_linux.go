//go:build linux

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

// LinuxSoftwareExecutor handles Linux software installation
type LinuxSoftwareExecutor struct {
	packageManager string
}

// NewLinuxSoftwareExecutor creates a new Linux software executor
func NewLinuxSoftwareExecutor() *LinuxSoftwareExecutor {
	return &LinuxSoftwareExecutor{
		packageManager: detectPackageManager(),
	}
}

// InstallSoftware installs software on Linux
func (e *LinuxSoftwareExecutor) InstallSoftware(pkg models.SoftwarePackage) models.ExecutionResult {
	startTime := time.Now()

	switch strings.ToLower(pkg.Source) {
	case "apt", "apt-get":
		return e.installWithApt(pkg, startTime)
	case "dnf":
		return e.installWithDnf(pkg, startTime)
	case "yum":
		return e.installWithYum(pkg, startTime)
	case "snap":
		return e.installWithSnap(pkg, startTime)
	case "flatpak":
		return e.installWithFlatpak(pkg, startTime)
	case "deb":
		return e.installDeb(pkg, startTime)
	case "rpm":
		return e.installRpm(pkg, startTime)
	case "url":
		return e.installFromURL(pkg, startTime)
	case "auto", "":
		// Use system default package manager
		return e.installWithSystemPackageManager(pkg, startTime)
	default:
		return models.ExecutionResult{
			Success:      false,
			Message:      fmt.Sprintf("Unknown installation source: %s", pkg.Source),
			ErrorMessage: "Supported sources: apt, dnf, yum, snap, flatpak, deb, rpm, url",
			Duration:     time.Since(startTime).Milliseconds(),
		}
	}
}

// installWithApt installs using apt
func (e *LinuxSoftwareExecutor) installWithApt(pkg models.SoftwarePackage, startTime time.Time) models.ExecutionResult {
	result := models.ExecutionResult{Success: false}

	// Update package list
	exec.Command("apt-get", "update", "-qq").Run()

	// Build install command
	args := []string{"install", "-y"}
	if pkg.Version != "" {
		args = append(args, fmt.Sprintf("%s=%s", pkg.Name, pkg.Version))
	} else {
		args = append(args, pkg.Name)
	}

	cmd := exec.Command("apt-get", args...)
	output, err := cmd.CombinedOutput()

	result.Duration = time.Since(startTime).Milliseconds()
	result.Output = string(output)

	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitErr.ExitCode()
		}
		result.ErrorMessage = err.Error()
		result.Message = fmt.Sprintf("Failed to install %s via apt", pkg.Name)
		return result
	}

	result.Success = true
	result.ExitCode = 0
	result.Message = fmt.Sprintf("Successfully installed %s via apt", pkg.Name)
	return result
}

// installWithDnf installs using dnf
func (e *LinuxSoftwareExecutor) installWithDnf(pkg models.SoftwarePackage, startTime time.Time) models.ExecutionResult {
	result := models.ExecutionResult{Success: false}

	args := []string{"install", "-y"}
	if pkg.Version != "" {
		args = append(args, fmt.Sprintf("%s-%s", pkg.Name, pkg.Version))
	} else {
		args = append(args, pkg.Name)
	}

	cmd := exec.Command("dnf", args...)
	output, err := cmd.CombinedOutput()

	result.Duration = time.Since(startTime).Milliseconds()
	result.Output = string(output)

	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitErr.ExitCode()
		}
		result.ErrorMessage = err.Error()
		result.Message = fmt.Sprintf("Failed to install %s via dnf", pkg.Name)
		return result
	}

	result.Success = true
	result.ExitCode = 0
	result.Message = fmt.Sprintf("Successfully installed %s via dnf", pkg.Name)
	return result
}

// installWithYum installs using yum
func (e *LinuxSoftwareExecutor) installWithYum(pkg models.SoftwarePackage, startTime time.Time) models.ExecutionResult {
	result := models.ExecutionResult{Success: false}

	args := []string{"install", "-y"}
	if pkg.Version != "" {
		args = append(args, fmt.Sprintf("%s-%s", pkg.Name, pkg.Version))
	} else {
		args = append(args, pkg.Name)
	}

	cmd := exec.Command("yum", args...)
	output, err := cmd.CombinedOutput()

	result.Duration = time.Since(startTime).Milliseconds()
	result.Output = string(output)

	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitErr.ExitCode()
		}
		result.ErrorMessage = err.Error()
		result.Message = fmt.Sprintf("Failed to install %s via yum", pkg.Name)
		return result
	}

	result.Success = true
	result.ExitCode = 0
	result.Message = fmt.Sprintf("Successfully installed %s via yum", pkg.Name)
	return result
}

// installWithSnap installs using snap
func (e *LinuxSoftwareExecutor) installWithSnap(pkg models.SoftwarePackage, startTime time.Time) models.ExecutionResult {
	result := models.ExecutionResult{Success: false}

	snapPath, err := exec.LookPath("snap")
	if err != nil {
		result.ErrorMessage = "snap is not installed"
		result.Message = "Cannot install via snap - snap not found"
		result.Duration = time.Since(startTime).Milliseconds()
		return result
	}

	args := []string{"install", pkg.Name}
	if pkg.Arguments != "" {
		args = append(args, strings.Fields(pkg.Arguments)...)
	}

	cmd := exec.Command(snapPath, args...)
	output, err := cmd.CombinedOutput()

	result.Duration = time.Since(startTime).Milliseconds()
	result.Output = string(output)

	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitErr.ExitCode()
		}
		result.ErrorMessage = err.Error()
		result.Message = fmt.Sprintf("Failed to install %s via snap", pkg.Name)
		return result
	}

	result.Success = true
	result.ExitCode = 0
	result.Message = fmt.Sprintf("Successfully installed %s via snap", pkg.Name)
	return result
}

// installWithFlatpak installs using flatpak
func (e *LinuxSoftwareExecutor) installWithFlatpak(pkg models.SoftwarePackage, startTime time.Time) models.ExecutionResult {
	result := models.ExecutionResult{Success: false}

	flatpakPath, err := exec.LookPath("flatpak")
	if err != nil {
		result.ErrorMessage = "flatpak is not installed"
		result.Message = "Cannot install via flatpak - flatpak not found"
		result.Duration = time.Since(startTime).Milliseconds()
		return result
	}

	cmd := exec.Command(flatpakPath, "install", "-y", pkg.Name)
	output, err := cmd.CombinedOutput()

	result.Duration = time.Since(startTime).Milliseconds()
	result.Output = string(output)

	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitErr.ExitCode()
		}
		result.ErrorMessage = err.Error()
		result.Message = fmt.Sprintf("Failed to install %s via flatpak", pkg.Name)
		return result
	}

	result.Success = true
	result.ExitCode = 0
	result.Message = fmt.Sprintf("Successfully installed %s via flatpak", pkg.Name)
	return result
}

// installDeb installs a .deb package
func (e *LinuxSoftwareExecutor) installDeb(pkg models.SoftwarePackage, startTime time.Time) models.ExecutionResult {
	result := models.ExecutionResult{Success: false}

	debPath := pkg.PackageURL
	tempFile := ""

	// Download if URL provided
	if strings.HasPrefix(pkg.PackageURL, "http://") || strings.HasPrefix(pkg.PackageURL, "https://") {
		var err error
		tempFile, err = downloadFile(pkg.PackageURL, pkg.Checksum)
		if err != nil {
			result.ErrorMessage = err.Error()
			result.Message = "Failed to download deb package"
			result.Duration = time.Since(startTime).Milliseconds()
			return result
		}
		debPath = tempFile
		defer os.Remove(tempFile)
	}

	// Install using dpkg
	cmd := exec.Command("dpkg", "-i", debPath)
	output, err := cmd.CombinedOutput()

	// Try to fix dependencies if dpkg fails
	if err != nil {
		fixCmd := exec.Command("apt-get", "install", "-f", "-y")
		fixOutput, _ := fixCmd.CombinedOutput()
		output = append(output, fixOutput...)
	}

	result.Duration = time.Since(startTime).Milliseconds()
	result.Output = string(output)

	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitErr.ExitCode()
		}
		result.ErrorMessage = err.Error()
		result.Message = fmt.Sprintf("Failed to install deb: %s", pkg.Name)
		return result
	}

	result.Success = true
	result.ExitCode = 0
	result.Message = fmt.Sprintf("Successfully installed %s", pkg.Name)
	return result
}

// installRpm installs an .rpm package
func (e *LinuxSoftwareExecutor) installRpm(pkg models.SoftwarePackage, startTime time.Time) models.ExecutionResult {
	result := models.ExecutionResult{Success: false}

	rpmPath := pkg.PackageURL
	tempFile := ""

	// Download if URL provided
	if strings.HasPrefix(pkg.PackageURL, "http://") || strings.HasPrefix(pkg.PackageURL, "https://") {
		var err error
		tempFile, err = downloadFile(pkg.PackageURL, pkg.Checksum)
		if err != nil {
			result.ErrorMessage = err.Error()
			result.Message = "Failed to download rpm package"
			result.Duration = time.Since(startTime).Milliseconds()
			return result
		}
		rpmPath = tempFile
		defer os.Remove(tempFile)
	}

	// Try dnf/yum first, then rpm
	var cmd *exec.Cmd
	if _, err := exec.LookPath("dnf"); err == nil {
		cmd = exec.Command("dnf", "install", "-y", rpmPath)
	} else if _, err := exec.LookPath("yum"); err == nil {
		cmd = exec.Command("yum", "install", "-y", rpmPath)
	} else {
		cmd = exec.Command("rpm", "-i", rpmPath)
	}

	output, err := cmd.CombinedOutput()

	result.Duration = time.Since(startTime).Milliseconds()
	result.Output = string(output)

	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitErr.ExitCode()
		}
		result.ErrorMessage = err.Error()
		result.Message = fmt.Sprintf("Failed to install rpm: %s", pkg.Name)
		return result
	}

	result.Success = true
	result.ExitCode = 0
	result.Message = fmt.Sprintf("Successfully installed %s", pkg.Name)
	return result
}

// installFromURL downloads and installs based on file extension
func (e *LinuxSoftwareExecutor) installFromURL(pkg models.SoftwarePackage, startTime time.Time) models.ExecutionResult {
	url := pkg.PackageURL
	if url == "" {
		return models.ExecutionResult{
			Success:      false,
			Message:      "No URL provided",
			ErrorMessage: "packageUrl is required for url source",
			Duration:     time.Since(startTime).Milliseconds(),
		}
	}

	lowerURL := strings.ToLower(url)
	switch {
	case strings.HasSuffix(lowerURL, ".deb"):
		pkg.Source = "deb"
		return e.installDeb(pkg, startTime)
	case strings.HasSuffix(lowerURL, ".rpm"):
		pkg.Source = "rpm"
		return e.installRpm(pkg, startTime)
	default:
		return models.ExecutionResult{
			Success:      false,
			Message:      "Unknown file type",
			ErrorMessage: "URL must point to .deb or .rpm file",
			Duration:     time.Since(startTime).Milliseconds(),
		}
	}
}

// installWithSystemPackageManager uses the detected system package manager
func (e *LinuxSoftwareExecutor) installWithSystemPackageManager(pkg models.SoftwarePackage, startTime time.Time) models.ExecutionResult {
	switch e.packageManager {
	case "apt-get":
		return e.installWithApt(pkg, startTime)
	case "dnf":
		return e.installWithDnf(pkg, startTime)
	case "yum":
		return e.installWithYum(pkg, startTime)
	default:
		return models.ExecutionResult{
			Success:      false,
			Message:      "No supported package manager found",
			ErrorMessage: "Could not detect apt, dnf, or yum",
			Duration:     time.Since(startTime).Milliseconds(),
		}
	}
}

// UninstallSoftware removes software on Linux
func (e *LinuxSoftwareExecutor) UninstallSoftware(name string) models.ExecutionResult {
	startTime := time.Now()
	result := models.ExecutionResult{Success: false}

	var cmd *exec.Cmd

	switch e.packageManager {
	case "apt-get":
		cmd = exec.Command("apt-get", "remove", "-y", name)
	case "dnf":
		cmd = exec.Command("dnf", "remove", "-y", name)
	case "yum":
		cmd = exec.Command("yum", "remove", "-y", name)
	default:
		result.ErrorMessage = "No supported package manager"
		result.Message = "Cannot uninstall - package manager not found"
		result.Duration = time.Since(startTime).Milliseconds()
		return result
	}

	output, err := cmd.CombinedOutput()

	result.Duration = time.Since(startTime).Milliseconds()
	result.Output = string(output)

	if err != nil {
		// Try snap
		if snapPath, _ := exec.LookPath("snap"); snapPath != "" {
			snapCmd := exec.Command(snapPath, "remove", name)
			snapOutput, snapErr := snapCmd.CombinedOutput()
			if snapErr == nil {
				result.Success = true
				result.Message = fmt.Sprintf("Uninstalled %s via snap", name)
				result.Output = string(snapOutput)
				return result
			}
		}

		// Try flatpak
		if flatpakPath, _ := exec.LookPath("flatpak"); flatpakPath != "" {
			flatpakCmd := exec.Command(flatpakPath, "uninstall", "-y", name)
			flatpakOutput, flatpakErr := flatpakCmd.CombinedOutput()
			if flatpakErr == nil {
				result.Success = true
				result.Message = fmt.Sprintf("Uninstalled %s via flatpak", name)
				result.Output = string(flatpakOutput)
				return result
			}
		}

		if exitErr, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitErr.ExitCode()
		}
		result.ErrorMessage = err.Error()
		result.Message = fmt.Sprintf("Failed to uninstall %s", name)
		return result
	}

	result.Success = true
	result.ExitCode = 0
	result.Message = fmt.Sprintf("Successfully uninstalled %s", name)
	return result
}

// GetInstalledVersion returns the installed version of software
func (e *LinuxSoftwareExecutor) GetInstalledVersion(name string) (string, error) {
	var cmd *exec.Cmd
	var parseVersion func(string) string

	switch e.packageManager {
	case "apt-get":
		cmd = exec.Command("dpkg-query", "-W", "-f=${Version}", name)
		parseVersion = func(s string) string { return strings.TrimSpace(s) }

	case "dnf", "yum":
		cmd = exec.Command("rpm", "-q", "--queryformat", "%{VERSION}", name)
		parseVersion = func(s string) string { return strings.TrimSpace(s) }

	default:
		return "", fmt.Errorf("unsupported package manager: %s", e.packageManager)
	}

	output, err := cmd.Output()
	if err == nil {
		return parseVersion(string(output)), nil
	}

	// Try snap
	if snapPath, _ := exec.LookPath("snap"); snapPath != "" {
		snapCmd := exec.Command(snapPath, "info", name)
		snapOutput, err := snapCmd.Output()
		if err == nil {
			lines := strings.Split(string(snapOutput), "\n")
			for _, line := range lines {
				if strings.HasPrefix(line, "installed:") {
					parts := strings.Fields(line)
					if len(parts) >= 2 {
						return parts[1], nil
					}
				}
			}
		}
	}

	return "", fmt.Errorf("version not found for %s", name)
}

// downloadFile downloads a file and optionally verifies checksum
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
