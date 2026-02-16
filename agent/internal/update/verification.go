package update

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
	"time"

	"github.com/rs/zerolog/log"
)

// VerificationResult contains the outcome of a verification check
type VerificationResult struct {
	Passed       bool
	ErrorMessage string
	Details      map[string]interface{}
}

// PreUpdateChecks performs checks before downloading the update
func PreUpdateChecks() VerificationResult {
	result := VerificationResult{
		Passed:  true,
		Details: make(map[string]interface{}),
	}

	// Check 1: Disk space
	diskSpaceOK, availableGB := checkDiskSpace()
	result.Details["diskSpaceGB"] = availableGB
	if !diskSpaceOK {
		result.Passed = false
		result.ErrorMessage = fmt.Sprintf("insufficient disk space: %.2f GB available, need at least 0.5 GB", availableGB)
		return result
	}

	// Check 2: Network connectivity
	networkOK := checkNetworkConnectivity()
	result.Details["networkConnectivity"] = networkOK
	if !networkOK {
		result.Passed = false
		result.ErrorMessage = "no network connectivity"
		return result
	}

	// Check 3: Write permissions
	writeOK, err := checkWritePermissions()
	result.Details["writePermissions"] = writeOK
	if !writeOK {
		result.Passed = false
		result.ErrorMessage = fmt.Sprintf("no write permissions: %v", err)
		return result
	}

	log.Info().
		Float64("diskSpaceGB", availableGB).
		Bool("network", networkOK).
		Bool("writePermissions", writeOK).
		Msg("Pre-update checks passed")

	return result
}

// checkDiskSpace checks if there's enough disk space for the update
func checkDiskSpace() (bool, float64) {
	executable, err := os.Executable()
	if err != nil {
		log.Warn().Err(err).Msg("Failed to get executable path for disk space check")
		return true, 0 // Don't block update
	}

	var stat syscall.Statfs_t
	if err := syscall.Statfs(executable, &stat); err != nil {
		log.Warn().Err(err).Msg("Failed to get disk stats")
		return true, 0 // Don't block update
	}

	// Available space in GB
	availableGB := float64(stat.Bavail*uint64(stat.Bsize)) / (1024 * 1024 * 1024)

	// Require at least 500MB
	minRequiredGB := 0.5
	return availableGB >= minRequiredGB, availableGB
}

// checkNetworkConnectivity checks if we can reach the internet
func checkNetworkConnectivity() bool {
	client := &http.Client{Timeout: 5 * time.Second}

	// Try multiple endpoints for redundancy
	endpoints := []string{
		"https://www.google.com",
		"https://www.cloudflare.com",
		"https://1.1.1.1",
	}

	for _, endpoint := range endpoints {
		resp, err := client.Get(endpoint)
		if err == nil {
			resp.Body.Close()
			return true
		}
	}

	return false
}

// checkWritePermissions checks if we can write to the binary directory
func checkWritePermissions() (bool, error) {
	executable, err := os.Executable()
	if err != nil {
		return false, err
	}

	dir := filepath.Dir(executable)
	testFile := filepath.Join(dir, ".patchiq-write-test")

	// Try to create a test file
	if err := os.WriteFile(testFile, []byte("test"), 0644); err != nil {
		return false, err
	}

	// Clean up
	os.Remove(testFile)
	return true, nil
}

// PostDownloadVerification verifies the downloaded binary
func PostDownloadVerification(binaryPath, expectedVersion string) VerificationResult {
	result := VerificationResult{
		Passed:  true,
		Details: make(map[string]interface{}),
	}

	// Check 1: File exists and has size
	fileInfo, err := os.Stat(binaryPath)
	if err != nil {
		result.Passed = false
		result.ErrorMessage = fmt.Sprintf("binary not found: %v", err)
		return result
	}

	fileSize := fileInfo.Size()
	result.Details["fileSizeBytes"] = fileSize

	// Binary should be at least 1MB (sanity check)
	if fileSize < 1024*1024 {
		result.Passed = false
		result.ErrorMessage = fmt.Sprintf("binary too small: %d bytes (possible corruption)", fileSize)
		return result
	}

	// Check 2: File is executable (Unix-like systems)
	if runtime.GOOS != "windows" {
		mode := fileInfo.Mode()
		if mode&0111 == 0 {
			result.Passed = false
			result.ErrorMessage = "binary not executable"
			return result
		}
		result.Details["executable"] = true
	}

	// Check 3: Verify version (try to run --version)
	actualVersion, err := getBinaryVersion(binaryPath)
	if err != nil {
		log.Warn().Err(err).Msg("Could not verify binary version")
		// Don't fail on this, it's informational
		result.Details["versionCheckError"] = err.Error()
	} else {
		result.Details["actualVersion"] = actualVersion
		result.Details["expectedVersion"] = expectedVersion

		// Normalize versions for comparison (remove 'v' prefix if present)
		actualNorm := strings.TrimPrefix(actualVersion, "v")
		expectedNorm := strings.TrimPrefix(expectedVersion, "v")

		if actualNorm != expectedNorm {
			result.Passed = false
			result.ErrorMessage = fmt.Sprintf("version mismatch: expected %s, got %s", expectedVersion, actualVersion)
			return result
		}
	}

	log.Info().
		Str("binaryPath", binaryPath).
		Int64("size", fileSize).
		Str("version", actualVersion).
		Msg("Post-download verification passed")

	return result
}

// getBinaryVersion executes the binary with --version flag to get version
func getBinaryVersion(binaryPath string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, binaryPath, "--version")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("failed to get version: %w", err)
	}

	// Parse version from output (e.g., "Patchify Agent v1.2.3")
	versionStr := strings.TrimSpace(string(output))

	// Extract version number
	parts := strings.Fields(versionStr)
	for _, part := range parts {
		if strings.HasPrefix(part, "v") || strings.Contains(part, ".") {
			return part, nil
		}
	}

	return versionStr, nil
}

// PostUpdateValidation performs health checks after update
func PostUpdateValidation(healthCheckURL string, timeout time.Duration) VerificationResult {
	result := VerificationResult{
		Passed:  true,
		Details: make(map[string]interface{}),
	}

	// Wait for service to start (give it a few seconds)
	time.Sleep(3 * time.Second)

	// Retry logic for health check
	maxRetries := 5
	retryDelay := 2 * time.Second

	var lastErr error
	for i := 0; i < maxRetries; i++ {
		if i > 0 {
			log.Debug().Int("attempt", i+1).Msg("Retrying health check")
			time.Sleep(retryDelay)
		}

		healthy, healthDetails, err := performHealthCheck(healthCheckURL, timeout)
		if err == nil && healthy {
			result.Details = healthDetails
			log.Info().
				Int("attempts", i+1).
				Interface("health", healthDetails).
				Msg("Post-update health check passed")
			return result
		}

		lastErr = err
	}

	result.Passed = false
	if lastErr != nil {
		result.ErrorMessage = fmt.Sprintf("health check failed after %d attempts: %v", maxRetries, lastErr)
	} else {
		result.ErrorMessage = fmt.Sprintf("health check unhealthy after %d attempts", maxRetries)
	}

	log.Error().
		Err(lastErr).
		Int("attempts", maxRetries).
		Msg("Post-update health check failed")

	return result
}

// performHealthCheck performs a single health check request
func performHealthCheck(healthCheckURL string, timeout time.Duration) (bool, map[string]interface{}, error) {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "GET", healthCheckURL, nil)
	if err != nil {
		return false, nil, fmt.Errorf("failed to create health check request: %w", err)
	}

	client := &http.Client{Timeout: timeout}
	resp, err := client.Do(req)
	if err != nil {
		return false, nil, fmt.Errorf("health check request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return false, nil, fmt.Errorf("health check returned status %d", resp.StatusCode)
	}

	// Parse health check response
	var healthData map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&healthData); err != nil {
		return false, nil, fmt.Errorf("failed to parse health response: %w", err)
	}

	// Check if healthy field exists and is true
	if healthy, ok := healthData["healthy"].(bool); ok && !healthy {
		return false, healthData, fmt.Errorf("agent reported unhealthy")
	}

	// Check if status field exists and is "healthy"
	if status, ok := healthData["status"].(string); ok && status != "healthy" {
		return false, healthData, fmt.Errorf("agent status: %s", status)
	}

	return true, healthData, nil
}

// VerifyBackendConnectivity checks if agent can connect to backend
func VerifyBackendConnectivity(backendURL string, timeout time.Duration) VerificationResult {
	result := VerificationResult{
		Passed:  true,
		Details: make(map[string]interface{}),
	}

	if backendURL == "" {
		result.Details["backendConfigured"] = false
		return result // Skip if no backend configured
	}

	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "GET", backendURL, nil)
	if err != nil {
		result.Passed = false
		result.ErrorMessage = fmt.Sprintf("failed to create backend request: %v", err)
		return result
	}

	client := &http.Client{Timeout: timeout}
	resp, err := client.Do(req)
	if err != nil {
		result.Passed = false
		result.ErrorMessage = fmt.Sprintf("backend connectivity failed: %v", err)
		return result
	}
	defer resp.Body.Close()

	result.Details["backendConfigured"] = true
	result.Details["backendStatus"] = resp.StatusCode
	result.Details["backendReachable"] = true

	log.Info().
		Str("backendURL", backendURL).
		Int("statusCode", resp.StatusCode).
		Msg("Backend connectivity verified")

	return result
}

// VerifyChecksum verifies file checksum (reuses existing logic from update.go)
func VerifyChecksum(filePath, expectedChecksum string) VerificationResult {
	result := VerificationResult{
		Passed:  true,
		Details: make(map[string]interface{}),
	}

	if expectedChecksum == "" {
		result.Details["checksumProvided"] = false
		return result // Skip if no checksum provided
	}

	file, err := os.Open(filePath)
	if err != nil {
		result.Passed = false
		result.ErrorMessage = fmt.Sprintf("failed to open file: %v", err)
		return result
	}
	defer file.Close()

	hasher := sha256.New()
	if _, err := io.Copy(hasher, file); err != nil {
		result.Passed = false
		result.ErrorMessage = fmt.Sprintf("failed to calculate checksum: %v", err)
		return result
	}

	actualChecksum := fmt.Sprintf("%x", hasher.Sum(nil))
	result.Details["expectedChecksum"] = expectedChecksum
	result.Details["actualChecksum"] = actualChecksum

	if actualChecksum != expectedChecksum {
		result.Passed = false
		result.ErrorMessage = fmt.Sprintf("checksum mismatch: expected %s, got %s", expectedChecksum, actualChecksum)
		return result
	}

	log.Info().
		Str("file", filePath).
		Str("checksum", actualChecksum).
		Msg("Checksum verification passed")

	return result
}
