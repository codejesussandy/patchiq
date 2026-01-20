//go:build darwin

package executors

import (
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

// DarwinSoftwareExecutor handles macOS software installation
type DarwinSoftwareExecutor struct{}

// NewDarwinSoftwareExecutor creates a new macOS software executor
func NewDarwinSoftwareExecutor() *DarwinSoftwareExecutor {
	return &DarwinSoftwareExecutor{}
}

// InstallSoftware installs software on macOS
func (e *DarwinSoftwareExecutor) InstallSoftware(pkg models.SoftwarePackage) models.ExecutionResult {
	startTime := time.Now()

	switch strings.ToLower(pkg.Source) {
	case "brew", "homebrew":
		return e.installWithBrew(pkg, startTime)
	case "pkg":
		return e.installPKG(pkg, startTime)
	case "dmg":
		return e.installDMG(pkg, startTime)
	case "mas", "appstore":
		return e.installFromAppStore(pkg, startTime)
	case "url":
		return e.installFromURL(pkg, startTime)
	default:
		return models.ExecutionResult{
			Success:      false,
			Message:      fmt.Sprintf("Unknown installation source: %s", pkg.Source),
			ErrorMessage: "Supported sources: brew, pkg, dmg, mas, url",
			Duration:     time.Since(startTime).Milliseconds(),
		}
	}
}

// installWithBrew installs software using Homebrew
func (e *DarwinSoftwareExecutor) installWithBrew(pkg models.SoftwarePackage, startTime time.Time) models.ExecutionResult {
	result := models.ExecutionResult{Success: false}

	// Check if Homebrew is installed
	brewPath, err := exec.LookPath("brew")
	if err != nil {
		result.ErrorMessage = "Homebrew is not installed"
		result.Message = "Cannot install via Homebrew - Homebrew not found"
		result.Duration = time.Since(startTime).Milliseconds()
		return result
	}

	// Build install command
	args := []string{"install"}
	if pkg.Version != "" {
		args = append(args, fmt.Sprintf("%s@%s", pkg.Name, pkg.Version))
	} else {
		args = append(args, pkg.Name)
	}

	cmd := exec.Command(brewPath, args...)
	output, err := cmd.CombinedOutput()

	result.Duration = time.Since(startTime).Milliseconds()
	result.Output = string(output)

	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitErr.ExitCode()
		}
		result.ErrorMessage = err.Error()
		result.Message = fmt.Sprintf("Failed to install %s via Homebrew", pkg.Name)
		return result
	}

	result.Success = true
	result.ExitCode = 0
	result.Message = fmt.Sprintf("Successfully installed %s via Homebrew", pkg.Name)
	return result
}

// installPKG installs a .pkg file
func (e *DarwinSoftwareExecutor) installPKG(pkg models.SoftwarePackage, startTime time.Time) models.ExecutionResult {
	result := models.ExecutionResult{Success: false}

	pkgPath := pkg.PackageURL
	tempFile := ""

	// Download if URL provided
	if strings.HasPrefix(pkg.PackageURL, "http://") || strings.HasPrefix(pkg.PackageURL, "https://") {
		var err error
		tempFile, err = downloadFile(pkg.PackageURL, pkg.Checksum)
		if err != nil {
			result.ErrorMessage = err.Error()
			result.Message = "Failed to download package"
			result.Duration = time.Since(startTime).Milliseconds()
			return result
		}
		pkgPath = tempFile
		defer os.Remove(tempFile)
	}

	// Verify file exists
	if _, err := os.Stat(pkgPath); os.IsNotExist(err) {
		result.ErrorMessage = fmt.Sprintf("Package file not found: %s", pkgPath)
		result.Message = "Package file does not exist"
		result.Duration = time.Since(startTime).Milliseconds()
		return result
	}

	// Install using installer command
	args := []string{"-pkg", pkgPath, "-target", "/"}
	if pkg.Arguments != "" {
		args = append(args, strings.Fields(pkg.Arguments)...)
	}

	cmd := exec.Command("installer", args...)
	output, err := cmd.CombinedOutput()

	result.Duration = time.Since(startTime).Milliseconds()
	result.Output = string(output)

	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitErr.ExitCode()
		}
		result.ErrorMessage = err.Error()
		result.Message = fmt.Sprintf("Failed to install PKG: %s", pkg.Name)
		return result
	}

	result.Success = true
	result.ExitCode = 0
	result.Message = fmt.Sprintf("Successfully installed %s", pkg.Name)
	return result
}

// installDMG installs an application from a .dmg file
func (e *DarwinSoftwareExecutor) installDMG(pkg models.SoftwarePackage, startTime time.Time) models.ExecutionResult {
	result := models.ExecutionResult{Success: false}

	dmgPath := pkg.PackageURL
	tempFile := ""

	// Download if URL provided
	if strings.HasPrefix(pkg.PackageURL, "http://") || strings.HasPrefix(pkg.PackageURL, "https://") {
		var err error
		tempFile, err = downloadFile(pkg.PackageURL, pkg.Checksum)
		if err != nil {
			result.ErrorMessage = err.Error()
			result.Message = "Failed to download DMG"
			result.Duration = time.Since(startTime).Milliseconds()
			return result
		}
		dmgPath = tempFile
		defer os.Remove(tempFile)
	}

	// Create temp mount point
	mountPoint, err := os.MkdirTemp("", "dmg-mount-")
	if err != nil {
		result.ErrorMessage = err.Error()
		result.Message = "Failed to create mount point"
		result.Duration = time.Since(startTime).Milliseconds()
		return result
	}
	defer os.RemoveAll(mountPoint)

	// Mount DMG
	mountCmd := exec.Command("hdiutil", "attach", dmgPath, "-mountpoint", mountPoint, "-nobrowse", "-quiet")
	if output, err := mountCmd.CombinedOutput(); err != nil {
		result.ErrorMessage = fmt.Sprintf("Failed to mount DMG: %v - %s", err, string(output))
		result.Message = "Failed to mount DMG"
		result.Duration = time.Since(startTime).Milliseconds()
		return result
	}

	// Ensure unmount on exit
	defer exec.Command("hdiutil", "detach", mountPoint, "-quiet").Run()

	// Find .app in mounted DMG
	entries, err := os.ReadDir(mountPoint)
	if err != nil {
		result.ErrorMessage = err.Error()
		result.Message = "Failed to read mounted DMG"
		result.Duration = time.Since(startTime).Milliseconds()
		return result
	}

	var appPath string
	for _, entry := range entries {
		if strings.HasSuffix(entry.Name(), ".app") {
			appPath = filepath.Join(mountPoint, entry.Name())
			break
		}
	}

	if appPath == "" {
		result.ErrorMessage = "No .app found in DMG"
		result.Message = "DMG does not contain an application"
		result.Duration = time.Since(startTime).Milliseconds()
		return result
	}

	// Copy .app to /Applications
	destPath := filepath.Join("/Applications", filepath.Base(appPath))

	// Remove existing if present
	os.RemoveAll(destPath)

	copyCmd := exec.Command("cp", "-R", appPath, "/Applications/")
	if output, err := copyCmd.CombinedOutput(); err != nil {
		result.ErrorMessage = fmt.Sprintf("Failed to copy app: %v - %s", err, string(output))
		result.Message = "Failed to install application"
		result.Duration = time.Since(startTime).Milliseconds()
		return result
	}

	result.Success = true
	result.ExitCode = 0
	result.Message = fmt.Sprintf("Successfully installed %s to /Applications", filepath.Base(appPath))
	result.Duration = time.Since(startTime).Milliseconds()
	return result
}

// installFromAppStore installs from Mac App Store using mas-cli
func (e *DarwinSoftwareExecutor) installFromAppStore(pkg models.SoftwarePackage, startTime time.Time) models.ExecutionResult {
	result := models.ExecutionResult{Success: false}

	// Check if mas is installed
	masPath, err := exec.LookPath("mas")
	if err != nil {
		result.ErrorMessage = "mas-cli is not installed. Install with: brew install mas"
		result.Message = "Cannot install from App Store - mas-cli not found"
		result.Duration = time.Since(startTime).Milliseconds()
		return result
	}

	// Install using mas
	cmd := exec.Command(masPath, "install", pkg.Name) // pkg.Name should be app ID
	output, err := cmd.CombinedOutput()

	result.Duration = time.Since(startTime).Milliseconds()
	result.Output = string(output)

	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitErr.ExitCode()
		}
		result.ErrorMessage = err.Error()
		result.Message = fmt.Sprintf("Failed to install %s from App Store", pkg.Name)
		return result
	}

	result.Success = true
	result.ExitCode = 0
	result.Message = fmt.Sprintf("Successfully installed %s from App Store", pkg.Name)
	return result
}

// installFromURL downloads and installs based on file extension
func (e *DarwinSoftwareExecutor) installFromURL(pkg models.SoftwarePackage, startTime time.Time) models.ExecutionResult {
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
	case strings.HasSuffix(lowerURL, ".pkg"):
		pkg.Source = "pkg"
		return e.installPKG(pkg, startTime)
	case strings.HasSuffix(lowerURL, ".dmg"):
		pkg.Source = "dmg"
		return e.installDMG(pkg, startTime)
	default:
		return models.ExecutionResult{
			Success:      false,
			Message:      "Unknown file type",
			ErrorMessage: "URL must point to .pkg or .dmg file",
			Duration:     time.Since(startTime).Milliseconds(),
		}
	}
}

// UninstallSoftware removes software on macOS
func (e *DarwinSoftwareExecutor) UninstallSoftware(name string) models.ExecutionResult {
	startTime := time.Now()
	result := models.ExecutionResult{Success: false}

	// Try Homebrew first
	brewPath, err := exec.LookPath("brew")
	if err == nil {
		cmd := exec.Command(brewPath, "uninstall", name)
		output, err := cmd.CombinedOutput()
		if err == nil {
			result.Success = true
			result.Message = fmt.Sprintf("Uninstalled %s via Homebrew", name)
			result.Output = string(output)
			result.Duration = time.Since(startTime).Milliseconds()
			return result
		}
	}

	// Try removing from /Applications
	appPath := filepath.Join("/Applications", name)
	if !strings.HasSuffix(appPath, ".app") {
		appPath += ".app"
	}

	if _, err := os.Stat(appPath); err == nil {
		cmd := exec.Command("rm", "-rf", appPath)
		output, err := cmd.CombinedOutput()
		if err != nil {
			result.ErrorMessage = err.Error()
			result.Message = fmt.Sprintf("Failed to remove %s", appPath)
			result.Output = string(output)
			result.Duration = time.Since(startTime).Milliseconds()
			return result
		}
		result.Success = true
		result.Message = fmt.Sprintf("Removed %s from Applications", name)
		result.Duration = time.Since(startTime).Milliseconds()
		return result
	}

	result.ErrorMessage = fmt.Sprintf("Software not found: %s", name)
	result.Message = "Software not found in Homebrew or Applications"
	result.Duration = time.Since(startTime).Milliseconds()
	return result
}

// GetInstalledVersion returns the installed version of software
func (e *DarwinSoftwareExecutor) GetInstalledVersion(name string) (string, error) {
	// Try Homebrew
	brewPath, err := exec.LookPath("brew")
	if err == nil {
		cmd := exec.Command(brewPath, "list", "--versions", name)
		output, err := cmd.Output()
		if err == nil {
			parts := strings.Fields(string(output))
			if len(parts) >= 2 {
				return parts[1], nil
			}
		}
	}

	// Try checking app bundle
	appPath := filepath.Join("/Applications", name)
	if !strings.HasSuffix(appPath, ".app") {
		appPath += ".app"
	}

	plistPath := filepath.Join(appPath, "Contents", "Info.plist")
	if _, err := os.Stat(plistPath); err == nil {
		cmd := exec.Command("defaults", "read", plistPath, "CFBundleShortVersionString")
		output, err := cmd.Output()
		if err == nil {
			return strings.TrimSpace(string(output)), nil
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
