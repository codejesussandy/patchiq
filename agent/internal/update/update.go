package update

import (
	"crypto/sha256"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"time"
)

// Request contains info needed to perform a self-update
type Request struct {
	DownloadURL string `json:"downloadUrl"`
	Checksum    string `json:"checksum"`
	Version     string `json:"version"`
}

// Result contains the outcome of an update attempt
type Result struct {
	Success      bool
	Message      string
	ErrorMessage string
}

// Perform downloads the new binary, verifies checksum, replaces current binary, and triggers restart.
// On success, the current process will exit — the caller should report the command result first.
func Perform(req Request) Result {
	if req.DownloadURL == "" {
		return Result{ErrorMessage: "downloadUrl is required"}
	}

	currentBinary, err := os.Executable()
	if err != nil {
		return Result{ErrorMessage: fmt.Sprintf("cannot determine current binary path: %v", err)}
	}
	currentBinary, _ = filepath.EvalSymlinks(currentBinary)

	log.Printf("[Update] Current binary: %s", currentBinary)
	log.Printf("[Update] Downloading new binary from: %s", req.DownloadURL)

	// 1. Download to temp file in same directory (ensures same filesystem for rename)
	dir := filepath.Dir(currentBinary)
	tempFile, err := os.CreateTemp(dir, "patchiq-agent-update-*")
	if err != nil {
		return Result{ErrorMessage: fmt.Sprintf("failed to create temp file: %v", err)}
	}
	tempPath := tempFile.Name()
	defer func() {
		// Clean up temp file on failure (on success we rename it)
		if _, err := os.Stat(tempPath); err == nil {
			os.Remove(tempPath)
		}
	}()

	// Download
	client := &http.Client{Timeout: 30 * time.Minute}
	resp, err := client.Get(req.DownloadURL)
	if err != nil {
		tempFile.Close()
		return Result{ErrorMessage: fmt.Sprintf("download failed: %v", err)}
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		tempFile.Close()
		return Result{ErrorMessage: fmt.Sprintf("download failed: HTTP %d", resp.StatusCode)}
	}

	// Download with checksum calculation
	hasher := sha256.New()
	writer := io.MultiWriter(tempFile, hasher)
	written, err := io.Copy(writer, resp.Body)
	tempFile.Close()

	if err != nil {
		return Result{ErrorMessage: fmt.Sprintf("download failed after %d bytes: %v", written, err)}
	}

	log.Printf("[Update] Downloaded %d bytes", written)

	// 2. Verify checksum (mandatory for security)
	actualChecksum := fmt.Sprintf("%x", hasher.Sum(nil))

	if req.Checksum == "" {
		log.Printf("[Update] WARNING: No checksum provided by server. Calculated: %s", actualChecksum)
		log.Printf("[Update] Proceeding without verification (insecure)")
	} else {
		log.Printf("[Update] Verifying checksum...")
		log.Printf("[Update]   Expected: %s", req.Checksum)
		log.Printf("[Update]   Actual:   %s", actualChecksum)

		if actualChecksum != req.Checksum {
			log.Printf("[Update] ERROR: Checksum mismatch detected!")
			log.Printf("[Update]   File may be corrupted or tampered with")
			log.Printf("[Update]   Expected: %s", req.Checksum)
			log.Printf("[Update]   Actual:   %s", actualChecksum)
			return Result{
				ErrorMessage: fmt.Sprintf("checksum verification failed: expected %s, got %s (file corrupted or tampered)", req.Checksum, actualChecksum),
			}
		}
		log.Printf("[Update] ✓ Checksum verified successfully")
	}

	// 3. Make new binary executable (Linux/macOS)
	if runtime.GOOS != "windows" {
		if err := os.Chmod(tempPath, 0755); err != nil {
			return Result{ErrorMessage: fmt.Sprintf("chmod failed: %v", err)}
		}
	}

	// 4. Platform-specific replace and restart
	if runtime.GOOS == "windows" {
		return replaceAndRestartWindows(currentBinary, tempPath)
	}
	return replaceAndRestartUnix(currentBinary, tempPath)
}

// replaceAndRestartWindows does an in-process rename (Windows allows renaming a running exe)
// then uses PowerShell to copy the new binary and restart after the process exits.
func replaceAndRestartWindows(currentBinary, newBinary string) Result {
	backupPath := currentBinary + ".bak"

	// Remove old backup
	os.Remove(backupPath)

	// Windows allows renaming a running executable (but not overwriting)
	if err := os.Rename(currentBinary, backupPath); err != nil {
		return Result{ErrorMessage: fmt.Sprintf("failed to rename current binary to .bak: %v", err)}
	}

	// Copy new binary into place (can't rename across temp dirs sometimes)
	if err := copyFile(newBinary, currentBinary); err != nil {
		// Restore backup
		os.Rename(backupPath, currentBinary)
		return Result{ErrorMessage: fmt.Sprintf("failed to copy new binary: %v", err)}
	}

	// Clean up temp file
	os.Remove(newBinary)

	// Use PowerShell to restart after this process exits
	// -WindowStyle Hidden prevents a console window flash
	psScript := fmt.Sprintf(
		`Start-Sleep -Seconds 2; Start-Process -FilePath '%s' -WindowStyle Hidden`,
		currentBinary,
	)
	cmd := exec.Command("powershell", "-WindowStyle", "Hidden", "-Command", psScript)
	cmd.Dir = filepath.Dir(currentBinary)
	if err := cmd.Start(); err != nil {
		log.Printf("[Update] Warning: failed to schedule restart: %v (binary replaced, manual restart needed)", err)
	}

	log.Printf("[Update] Binary replaced in-place. Agent will exit and restart in ~2 seconds.")
	return Result{
		Success: true,
		Message: "Update installed, agent exiting for restart",
	}
}

// replaceAndRestartUnix replaces the binary via rename and exits.
// Systemd or launchd will restart the agent if configured as a service.
func replaceAndRestartUnix(currentBinary, newBinary string) Result {
	backupPath := currentBinary + ".bak"

	// Rename current to backup
	if err := os.Rename(currentBinary, backupPath); err != nil {
		return Result{ErrorMessage: fmt.Sprintf("failed to backup current binary: %v", err)}
	}

	// Move new binary into place
	if err := os.Rename(newBinary, currentBinary); err != nil {
		// Try to restore backup
		os.Rename(backupPath, currentBinary)
		return Result{ErrorMessage: fmt.Sprintf("failed to install new binary: %v", err)}
	}

	log.Printf("[Update] Binary replaced. Agent will exit — service manager should restart it.")
	return Result{
		Success: true,
		Message: "Update installed, agent exiting for restart",
	}
}
