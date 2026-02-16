package executors

import (
	"archive/tar"
	"compress/gzip"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/patchify/agent/internal/download"
	"github.com/patchify/agent/internal/models"
)

// DownloadConfig holds download-related settings for script execution
type DownloadConfig struct {
	MaxDownloadSpeedMBps int
	EnableDownloadResume bool
	ProxyURL             string
	ProxyUser            string
	ProxyPassword        string
}

// BaseScriptExecutor handles script-based package installation (Hub-centric approach)
// This executor downloads bundles from the Hub and executes the appropriate script
type BaseScriptExecutor struct {
	bundleDir      string // Temporary directory for extracted bundles
	dataDir        string // Persistent data directory (~/.patchify-agent)
	downloadConfig *DownloadConfig
}

// NewBaseScriptExecutor creates a new script executor
func NewBaseScriptExecutor(dataDir string, dlCfg *DownloadConfig) *BaseScriptExecutor {
	if dataDir == "" {
		homeDir, _ := os.UserHomeDir()
		dataDir = filepath.Join(homeDir, ".patchify-agent")
	}

	bundleDir := filepath.Join(dataDir, "bundles")
	os.MkdirAll(bundleDir, 0755)

	return &BaseScriptExecutor{
		bundleDir:      bundleDir,
		dataDir:        dataDir,
		downloadConfig: dlCfg,
	}
}

// ExecuteBundle downloads a bundle, extracts it, and runs the specified script
func (e *BaseScriptExecutor) ExecuteBundle(ctx context.Context, request models.ScriptBundleRequest) models.ExecutionResult {
	startTime := time.Now()
	result := models.ExecutionResult{Success: false}

	// Validate request
	if request.BundleURL == "" && request.Script == "" {
		result.ErrorMessage = "Either bundleUrl or script must be provided"
		result.Message = "Invalid request"
		result.Duration = time.Since(startTime).Milliseconds()
		return result
	}

	// If both inline script and bundle URL provided, download the file first
	// then run the inline script with PATCHIQ_DOWNLOAD_PATH set to the downloaded file.
	// This is the path for patch deployments (raw installer + installer-aware script).
	if request.Script != "" && request.BundleURL != "" {
		downloadPath, err := e.downloadInstaller(request.BundleURL, request.BundleChecksum)
		if err != nil {
			setErrorResult(&result, err, "Failed to download installer for inline script", time.Since(startTime).Milliseconds())
			return result
		}
		defer os.Remove(downloadPath)

		if request.Environment == nil {
			request.Environment = make(map[string]string)
		}
		request.Environment["PATCHIQ_DOWNLOAD_PATH"] = downloadPath

		execResult := e.ExecuteInlineScript(ctx, request.Script, request.OperationType, request.RequiresRoot, request.Environment)
		execResult.Duration = time.Since(startTime).Milliseconds()
		return execResult
	}

	// If inline script is provided (no bundle), use it directly
	if request.Script != "" {
		return e.ExecuteInlineScript(ctx, request.Script, request.OperationType, request.RequiresRoot, request.Environment)
	}

	// Download and execute bundle
	return e.executeFromBundle(request, startTime)
}

// executeFromBundle handles the bundle download, extraction, and script execution
func (e *BaseScriptExecutor) executeFromBundle(request models.ScriptBundleRequest, startTime time.Time) models.ExecutionResult {
	result := models.ExecutionResult{Success: false}

	// 1. Download bundle
	bundlePath, err := e.downloadBundle(request.BundleURL, request.BundleChecksum)
	if err != nil {
		setErrorResult(&result, err, "Failed to download bundle", time.Since(startTime).Milliseconds())
		return result
	}
	defer os.Remove(bundlePath)

	// 2. Extract bundle
	extractDir := filepath.Join(e.bundleDir, fmt.Sprintf("bundle-%d", time.Now().UnixNano()))
	if err := e.extractTarGz(bundlePath, extractDir); err != nil {
		result.ErrorMessage = err.Error()
		result.Message = "Failed to extract bundle"
		result.Duration = time.Since(startTime).Milliseconds()
		return result
	}
	defer os.RemoveAll(extractDir)

	// 3. Parse manifest.json
	manifest, bundleRoot, err := e.parseManifest(extractDir, request.Manifest)
	if err != nil {
		result.ErrorMessage = err.Error()
		result.Message = "Failed to parse manifest"
		result.Duration = time.Since(startTime).Milliseconds()
		return result
	}

	// 4. Get script path based on operation type
	scriptPath, err := e.getScriptPath(manifest, bundleRoot, request.OperationType)
	if err != nil {
		result.ErrorMessage = err.Error()
		result.Message = fmt.Sprintf("Script for '%s' not found", request.OperationType)
		result.Duration = time.Since(startTime).Milliseconds()
		return result
	}

	// 5. Set PATCHIQ_DOWNLOAD_PATH to the installer file in the bundle's files/ directory
	filesDir := filepath.Join(bundleRoot, "files")
	log.Printf("[ScriptExec] Looking for installer in: %s", filesDir)
	if entries, err := os.ReadDir(filesDir); err == nil && len(entries) > 0 {
		installerPath := filepath.Join(filesDir, entries[0].Name())
		log.Printf("[ScriptExec] Found installer: %s (%d files total)", installerPath, len(entries))
		if request.Environment == nil {
			request.Environment = make(map[string]string)
		}
		request.Environment["PATCHIQ_DOWNLOAD_PATH"] = installerPath
	} else if err != nil {
		log.Printf("[ScriptExec] WARNING: files dir not found: %v", err)
	} else {
		log.Printf("[ScriptExec] WARNING: files dir empty")
	}

	// 6. Merge environment variables
	env := e.mergeEnvironment(manifest.Environment, request.Environment)

	// 7. Execute script
	requiresRoot := request.RequiresRoot || manifest.RequiresRoot
	execResult := e.runScript(scriptPath, bundleRoot, requiresRoot, env, request.Timeout)

	execResult.Duration = time.Since(startTime).Milliseconds()

	if execResult.Success {
		execResult.Message = fmt.Sprintf("Successfully executed %s for %s v%s",
			request.OperationType, manifest.Name, manifest.Version)
	} else {
		execResult.Message = fmt.Sprintf("Failed to execute %s for %s v%s",
			request.OperationType, manifest.Name, manifest.Version)
	}

	return execResult
}

// ExecuteInlineScript runs a script directly without bundle download
func (e *BaseScriptExecutor) ExecuteInlineScript(ctx context.Context, script string, operationType string, requiresRoot bool, env map[string]string) models.ExecutionResult {
	startTime := time.Now()
	result := models.ExecutionResult{Success: false}

	// Create temp directory for script
	tempDir, err := os.MkdirTemp(e.bundleDir, "inline-script-")
	if err != nil {
		result.ErrorMessage = err.Error()
		result.Message = "Failed to create temp directory"
		result.Duration = time.Since(startTime).Milliseconds()
		return result
	}
	defer os.RemoveAll(tempDir)

	// Determine script extension based on OS
	var scriptPath string
	if runtime.GOOS == "windows" {
		scriptPath = filepath.Join(tempDir, "script.ps1")
	} else {
		scriptPath = filepath.Join(tempDir, "script.sh")
	}

	// Write script to file
	if err := os.WriteFile(scriptPath, []byte(script), 0755); err != nil {
		result.ErrorMessage = err.Error()
		result.Message = "Failed to write script file"
		result.Duration = time.Since(startTime).Milliseconds()
		return result
	}

	// Execute script
	execResult := e.runScript(scriptPath, tempDir, requiresRoot, env, 0)
	execResult.Duration = time.Since(startTime).Milliseconds()

	if execResult.Success {
		execResult.Message = fmt.Sprintf("Successfully executed inline %s script", operationType)
	} else {
		execResult.Message = fmt.Sprintf("Failed to execute inline %s script", operationType)
	}

	return execResult
}

// downloadInstaller downloads an installer file, preserving the original file extension
// from the URL (e.g. .exe, .msi, .deb). This is critical on Windows where file extension
// determines how the OS handles the file.
func (e *BaseScriptExecutor) downloadInstaller(bundleURL string, expectedChecksum string) (string, error) {
	req, err := http.NewRequest("GET", bundleURL, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	httpClient := &http.Client{Timeout: 30 * time.Minute}
	resp, err := httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to download installer: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("failed to download installer: HTTP %d", resp.StatusCode)
	}

	// Determine file extension from Content-Disposition header, URL, or default
	ext := ""
	if cd := resp.Header.Get("Content-Disposition"); cd != "" {
		if idx := strings.Index(cd, "filename="); idx != -1 {
			fname := strings.Trim(cd[idx+9:], "\" ")
			if semi := strings.Index(fname, ";"); semi != -1 {
				fname = fname[:semi]
			}
			ext = filepath.Ext(fname)
		}
	}
	if ext == "" {
		urlPath := bundleURL
		if idx := strings.Index(urlPath, "?"); idx != -1 {
			urlPath = urlPath[:idx]
		}
		ext = filepath.Ext(urlPath)
	}
	if ext == "" {
		ext = ".bin"
	}

	tempFile, err := os.CreateTemp(e.bundleDir, "installer-*"+ext)
	if err != nil {
		return "", fmt.Errorf("failed to create temp file: %w", err)
	}
	tempPath := tempFile.Name()

	log.Printf("Downloading installer to: %s (ext: %s)", tempPath, ext)

	// Download with checksum calculation
	hasher := sha256.New()
	writer := io.MultiWriter(tempFile, hasher)

	written, err := io.Copy(writer, resp.Body)
	tempFile.Close()

	if err != nil {
		os.Remove(tempPath)
		return "", fmt.Errorf("failed to save installer: %w", err)
	}

	log.Printf("Installer downloaded: %s (%d bytes)", tempPath, written)

	// Verify checksum if provided
	if expectedChecksum != "" {
		actualChecksum := hex.EncodeToString(hasher.Sum(nil))
		if !strings.EqualFold(actualChecksum, expectedChecksum) {
			os.Remove(tempPath)
			return "", fmt.Errorf("checksum mismatch: expected %s, got %s", expectedChecksum, actualChecksum)
		}
	}

	return tempPath, nil
}

// downloadBundle downloads a bundle file with optional resume, rate limiting,
// progress tracking, and checksum verification.
func (e *BaseScriptExecutor) downloadBundle(bundleURL string, expectedChecksum string) (string, error) {
	// Create temp file (or reuse existing partial download)
	tempFile, err := os.CreateTemp(e.bundleDir, "bundle-*.tar.gz")
	if err != nil {
		return "", fmt.Errorf("failed to create temp file: %w", err)
	}
	tempPath := tempFile.Name()

	// Check for partial download when resume is enabled
	var existingSize int64
	enableResume := e.downloadConfig != nil && e.downloadConfig.EnableDownloadResume
	if enableResume {
		if info, err := tempFile.Stat(); err == nil {
			existingSize = info.Size()
		}
	}

	// Build request with Range header if resuming
	req, err := http.NewRequest("GET", bundleURL, nil)
	if err != nil {
		tempFile.Close()
		os.Remove(tempPath)
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	if existingSize > 0 {
		req.Header.Set("Range", fmt.Sprintf("bytes=%d-", existingSize))
		log.Printf("Resuming download from byte %d", existingSize)
		if _, err := tempFile.Seek(0, io.SeekEnd); err != nil {
			tempFile.Close()
			os.Remove(tempPath)
			return "", fmt.Errorf("failed to seek: %w", err)
		}
	}

	httpClient := &http.Client{
		Timeout: 30 * time.Minute,
	}

	resp, err := httpClient.Do(req)
	if err != nil {
		tempFile.Close()
		os.Remove(tempPath)
		return "", fmt.Errorf("failed to download bundle: %w", err)
	}
	defer resp.Body.Close()

	// 200 = full download, 206 = partial content (resume)
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusPartialContent {
		tempFile.Close()
		os.Remove(tempPath)
		return "", fmt.Errorf("failed to download bundle: HTTP %d", resp.StatusCode)
	}

	// If server doesn't support range and we had partial data, start fresh
	if existingSize > 0 && resp.StatusCode == http.StatusOK {
		tempFile.Seek(0, io.SeekStart)
		tempFile.Truncate(0)
		existingSize = 0
	}

	// Determine total size from Content-Length or Content-Range
	totalSize := resp.ContentLength
	if resp.StatusCode == http.StatusPartialContent {
		if cr := resp.Header.Get("Content-Range"); cr != "" {
			parts := strings.Split(cr, "/")
			if len(parts) == 2 {
				if size, err := strconv.ParseInt(parts[1], 10, 64); err == nil {
					totalSize = size
				}
			}
		}
	}

	// Wrap reader with rate limiter
	var reader io.Reader = resp.Body
	if e.downloadConfig != nil && e.downloadConfig.MaxDownloadSpeedMBps > 0 {
		bytesPerSec := e.downloadConfig.MaxDownloadSpeedMBps * 1024 * 1024
		reader = download.NewRateLimitedReader(reader, bytesPerSec)
	}

	// Wrap with progress tracking
	reader = download.NewProgressReader(reader, totalSize, func(downloaded, total int64, bytesPerSec float64) {
		if total > 0 {
			pct := float64(downloaded) / float64(total) * 100
			log.Printf("Bundle download: %.1f%% (%d/%d bytes) @ %.2f MB/s", pct, downloaded, total, bytesPerSec/(1024*1024))
		} else {
			log.Printf("Bundle download: %d bytes @ %.2f MB/s", downloaded, bytesPerSec/(1024*1024))
		}
	})

	// Download with checksum calculation
	hasher := sha256.New()
	writer := io.MultiWriter(tempFile, hasher)

	_, err = io.Copy(writer, reader)
	tempFile.Close()

	if err != nil {
		// Keep partial file for resume if enabled
		if !enableResume {
			os.Remove(tempPath)
		}
		return "", fmt.Errorf("failed to save bundle: %w", err)
	}

	// Verify checksum if provided
	if expectedChecksum != "" {
		actualChecksum := hex.EncodeToString(hasher.Sum(nil))
		if !strings.EqualFold(actualChecksum, expectedChecksum) {
			os.Remove(tempPath)
			return "", fmt.Errorf("checksum mismatch: expected %s, got %s", expectedChecksum, actualChecksum)
		}
	}

	log.Printf("Bundle downloaded successfully: %s", tempPath)
	return tempPath, nil
}

// validateBundleStructure performs security validation on a bundle before extraction.
// It checks for:
// - Malicious path traversal attempts (e.g., ../../../etc/passwd)
// - Required scripts (install.sh, uninstall.sh, rollback.sh)
// - Size limits (max 500MB)
// Returns an error if any validation fails.
func (e *BaseScriptExecutor) validateBundleStructure(bundlePath string) error {
	file, err := os.Open(bundlePath)
	if err != nil {
		return fmt.Errorf("failed to open bundle for validation: %w", err)
	}
	defer file.Close()

	// Check file size (500MB limit)
	stat, err := file.Stat()
	if err != nil {
		return fmt.Errorf("failed to stat bundle: %w", err)
	}

	const maxBundleSize = 500 * 1024 * 1024 // 500MB
	if stat.Size() > maxBundleSize {
		return fmt.Errorf("bundle exceeds size limit: %d bytes (max %d bytes)", stat.Size(), maxBundleSize)
	}

	// Open gzip reader
	gzr, err := gzip.NewReader(file)
	if err != nil {
		return fmt.Errorf("invalid gzip format: %w", err)
	}
	defer gzr.Close()

	// Open tar reader
	tr := tar.NewReader(gzr)

	// Track found scripts
	foundScripts := make(map[string]bool)
	requiredScripts := []string{"install.sh", "uninstall.sh", "rollback.sh"}

	// Scan all entries
	for {
		header, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("invalid tar format: %w", err)
		}

		// Detect path traversal attacks
		cleanPath := filepath.Clean(header.Name)

		// Check for absolute paths
		if filepath.IsAbs(header.Name) {
			return fmt.Errorf("malicious absolute path detected: %s", header.Name)
		}

		// Check for parent directory references
		if strings.HasPrefix(cleanPath, "..") || strings.Contains(cleanPath, "../") {
			return fmt.Errorf("malicious path traversal detected: %s", header.Name)
		}

		// Check for paths that would escape the extraction directory
		if strings.Contains(header.Name, ".."+string(os.PathSeparator)) {
			return fmt.Errorf("malicious path detected: %s", header.Name)
		}

		// Track required scripts (check both with and without directory prefix)
		baseName := filepath.Base(header.Name)
		for _, script := range requiredScripts {
			if baseName == script {
				foundScripts[script] = true
			}
		}
	}

	// Verify all required scripts are present
	for _, script := range requiredScripts {
		if !foundScripts[script] {
			return fmt.Errorf("missing required script: %s", script)
		}
	}

	return nil
}

// extractTarGz extracts a tar.gz archive
func (e *BaseScriptExecutor) extractTarGz(tarGzPath string, destDir string) error {
	// Validate bundle structure before extraction
	if err := e.validateBundleStructure(tarGzPath); err != nil {
		return fmt.Errorf("bundle validation failed: %w", err)
	}

	file, err := os.Open(tarGzPath)
	if err != nil {
		return fmt.Errorf("failed to open archive: %w", err)
	}
	defer file.Close()

	gzipReader, err := gzip.NewReader(file)
	if err != nil {
		return fmt.Errorf("failed to create gzip reader: %w", err)
	}
	defer gzipReader.Close()

	tarReader := tar.NewReader(gzipReader)

	if err := os.MkdirAll(destDir, 0755); err != nil {
		return fmt.Errorf("failed to create destination directory: %w", err)
	}

	for {
		header, err := tarReader.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("failed to read tar entry: %w", err)
		}

		// Sanitize path to prevent directory traversal
		targetPath := filepath.Join(destDir, header.Name)
		if !strings.HasPrefix(targetPath, filepath.Clean(destDir)+string(os.PathSeparator)) {
			return fmt.Errorf("invalid tar entry path: %s", header.Name)
		}

		switch header.Typeflag {
		case tar.TypeDir:
			if err := os.MkdirAll(targetPath, 0755); err != nil {
				return fmt.Errorf("failed to create directory: %w", err)
			}
		case tar.TypeReg:
			if err := os.MkdirAll(filepath.Dir(targetPath), 0755); err != nil {
				return fmt.Errorf("failed to create parent directory: %w", err)
			}
			outFile, err := os.Create(targetPath)
			if err != nil {
				return fmt.Errorf("failed to create file: %w", err)
			}
			if _, err := io.Copy(outFile, tarReader); err != nil {
				outFile.Close()
				return fmt.Errorf("failed to write file: %w", err)
			}
			outFile.Close()
			// Preserve executable permission
			if header.Mode&0111 != 0 {
				os.Chmod(targetPath, 0755)
			}
		case tar.TypeSymlink:
			if err := os.Symlink(header.Linkname, targetPath); err != nil {
				// Ignore symlink errors on Windows
				if runtime.GOOS != "windows" {
					return fmt.Errorf("failed to create symlink: %w", err)
				}
			}
		}
	}

	return nil
}

// parseManifest finds and parses the manifest.json file
func (e *BaseScriptExecutor) parseManifest(extractDir string, providedManifest *models.ScriptManifest) (*models.ScriptManifest, string, error) {
	// If manifest was provided from backend, use it and just find the bundle root
	if providedManifest != nil {
		bundleRoot, err := e.findBundleRoot(extractDir)
		if err != nil {
			return nil, "", err
		}
		return providedManifest, bundleRoot, nil
	}

	// Find manifest.json in the extracted directory
	manifestPath, bundleRoot, err := e.findManifest(extractDir)
	if err != nil {
		return nil, "", err
	}

	// Parse manifest
	manifestData, err := os.ReadFile(manifestPath)
	if err != nil {
		return nil, "", fmt.Errorf("failed to read manifest: %w", err)
	}

	var manifest models.ScriptManifest
	if err := json.Unmarshal(manifestData, &manifest); err != nil {
		return nil, "", fmt.Errorf("failed to parse manifest: %w", err)
	}

	return &manifest, bundleRoot, nil
}

// findManifest searches for manifest.json in the extracted directory
func (e *BaseScriptExecutor) findManifest(dir string) (string, string, error) {
	var manifestPath string
	var bundleRoot string

	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.Name() == "manifest.json" && !info.IsDir() {
			manifestPath = path
			bundleRoot = filepath.Dir(path)
			return filepath.SkipAll
		}
		return nil
	})

	if err != nil && err != filepath.SkipAll {
		return "", "", fmt.Errorf("error searching for manifest: %w", err)
	}

	if manifestPath == "" {
		return "", "", fmt.Errorf("manifest.json not found in bundle")
	}

	return manifestPath, bundleRoot, nil
}

// findBundleRoot finds the root directory containing scripts
func (e *BaseScriptExecutor) findBundleRoot(dir string) (string, error) {
	// Look for manifest.json or scripts directory
	entries, err := os.ReadDir(dir)
	if err != nil {
		return "", err
	}

	// If there's only one directory entry, descend into it
	if len(entries) == 1 && entries[0].IsDir() {
		return e.findBundleRoot(filepath.Join(dir, entries[0].Name()))
	}

	// Check if this directory contains manifest.json or scripts
	for _, entry := range entries {
		if entry.Name() == "manifest.json" || entry.Name() == "scripts" {
			return dir, nil
		}
	}

	return dir, nil
}

// getScriptPath returns the path to the script for the given operation
func (e *BaseScriptExecutor) getScriptPath(manifest *models.ScriptManifest, bundleRoot string, operationType string) (string, error) {
	var scriptRelPath string

	switch operationType {
	case "install":
		scriptRelPath = manifest.Scripts.Install
	case "update":
		scriptRelPath = manifest.Scripts.Update
	case "rollback":
		scriptRelPath = manifest.Scripts.Rollback
	case "uninstall":
		scriptRelPath = manifest.Scripts.Uninstall
	default:
		return "", fmt.Errorf("unknown operation type: %s", operationType)
	}

	if scriptRelPath == "" {
		return "", fmt.Errorf("no script defined for operation: %s", operationType)
	}

	scriptPath := filepath.Join(bundleRoot, scriptRelPath)

	// Verify script exists
	if _, err := os.Stat(scriptPath); err != nil {
		return "", fmt.Errorf("script not found: %s", scriptRelPath)
	}

	return scriptPath, nil
}

// mergeEnvironment merges manifest and request environment variables
func (e *BaseScriptExecutor) mergeEnvironment(manifestEnv, requestEnv map[string]string) map[string]string {
	env := make(map[string]string)

	// Add manifest environment variables first
	for k, v := range manifestEnv {
		env[k] = v
	}

	// Override with request environment variables
	for k, v := range requestEnv {
		env[k] = v
	}

	return env
}

// isRunningAsRoot checks if the current process has elevated privileges
func isRunningAsRoot() bool {
	if runtime.GOOS == "windows" {
		// On Windows, check if running as administrator
		// This is a simplified check - in production you'd use Windows API
		// For now, we check if we can write to a protected location
		_, err := os.Create(`C:\Windows\Temp\.patchiq-admin-check`)
		if err == nil {
			os.Remove(`C:\Windows\Temp\.patchiq-admin-check`)
			return true
		}
		return false
	}
	// On Linux/macOS, check if UID is 0 (root)
	return os.Getuid() == 0
}

// runScript executes a script with the given parameters
func (e *BaseScriptExecutor) runScript(scriptPath string, workDir string, requiresRoot bool, env map[string]string, timeoutSec int) models.ExecutionResult {
	result := models.ExecutionResult{Success: false}

	// Make script executable
	if err := os.Chmod(scriptPath, 0755); err != nil {
		result.ErrorMessage = fmt.Sprintf("failed to make script executable: %v", err)
		return result
	}

	// Check if we're already running with elevated privileges
	alreadyElevated := isRunningAsRoot()

	// Build command based on OS
	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		// PowerShell on Windows
		// If running as admin/SYSTEM, just execute directly
		// If not admin and requiresRoot, log warning (can't auto-elevate non-interactively)
		if requiresRoot && !alreadyElevated {
			log.Println("WARNING: Script requires admin but agent is not running as administrator")
			log.Println("Consider running the agent as a Windows Service with LocalSystem account")
		}
		cmd = exec.Command("powershell", "-ExecutionPolicy", "Bypass", "-File", scriptPath)
	} else {
		// Bash on Linux/macOS
		if requiresRoot && !alreadyElevated {
			// Not running as root, need to use sudo
			cmd = exec.Command("sudo", "bash", scriptPath)
		} else {
			// Either doesn't need root, or we're already root
			cmd = exec.Command("bash", scriptPath)
		}
	}

	cmd.Dir = workDir

	// Set environment variables
	cmd.Env = os.Environ()
	for k, v := range env {
		cmd.Env = append(cmd.Env, fmt.Sprintf("%s=%s", k, v))
	}

	// Add standard PatchIQ variables
	cmd.Env = append(cmd.Env, fmt.Sprintf("PATCHIQ_WORK_DIR=%s", workDir))
	cmd.Env = append(cmd.Env, fmt.Sprintf("PATCHIQ_SCRIPT_PATH=%s", scriptPath))

	// Execute with timeout (default 15 minutes if not specified)
	effectiveTimeout := timeoutSec
	if effectiveTimeout <= 0 {
		effectiveTimeout = 900 // 15 minutes default
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(effectiveTimeout)*time.Second)
	defer cancel()

	// Replace cmd with context-aware version
	ctxCmd := exec.CommandContext(ctx, cmd.Path, cmd.Args[1:]...)
	ctxCmd.Dir = cmd.Dir
	ctxCmd.Env = cmd.Env

	output, err := ctxCmd.CombinedOutput()
	result.Output = string(output)

	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitErr.ExitCode()
		} else {
			result.ExitCode = -1
		}
		result.ErrorMessage = err.Error()
		return result
	}

	result.Success = true
	result.ExitCode = 0
	return result
}

// isNetworkError checks if an error is network-related
func isNetworkError(err error) bool {
	if err == nil {
		return false
	}
	errStr := strings.ToLower(err.Error())
	return strings.Contains(errStr, "network") ||
		strings.Contains(errStr, "connection") ||
		strings.Contains(errStr, "timeout") ||
		strings.Contains(errStr, "dial tcp") ||
		strings.Contains(errStr, "unreachable") ||
		strings.Contains(errStr, "no route to host") ||
		strings.Contains(errStr, "host is down") ||
		strings.Contains(errStr, "tls handshake") ||
		strings.Contains(errStr, "EOF")
}

// classifyDownloadError determines the appropriate error code for download failures
func classifyDownloadError(err error) (string, string) {
	if err == nil {
		return "", ""
	}
	
	errStr := err.Error()
	errLower := strings.ToLower(errStr)
	
	if isNetworkError(err) {
		return models.ErrNetworkFailure, fmt.Sprintf("Network error during download: %v", err)
	}
	
	if strings.Contains(errLower, "timeout") || strings.Contains(errLower, "deadline exceeded") {
		return models.ErrTimeout, fmt.Sprintf("Download timed out: %v", err)
	}
	
	if strings.Contains(errLower, "checksum") || strings.Contains(errLower, "hash") {
		return models.ErrChecksumMismatch, errStr
	}
	
	if strings.Contains(errLower, "404") || strings.Contains(errLower, "not found") {
		return models.ErrPackageNotFound, fmt.Sprintf("Package not found: %v", err)
	}
	
	if strings.Contains(errLower, "403") || strings.Contains(errLower, "unauthorized") || 
	   strings.Contains(errLower, "permission denied") {
		return models.ErrPermissionDenied, fmt.Sprintf("Access denied: %v", err)
	}
	
	if strings.Contains(errLower, "503") || strings.Contains(errLower, "service unavailable") {
		return models.ErrServiceUnavailable, fmt.Sprintf("Service unavailable: %v", err)
	}
	
	if strings.Contains(errLower, "disk") || strings.Contains(errLower, "no space") {
		return models.ErrDiskFull, errStr
	}
	
	return models.ErrUnknown, errStr
}

// setErrorResult sets an error result with proper error code classification
func setErrorResult(result *models.ExecutionResult, err error, defaultMsg string, duration int64) {
	errorCode, errorMsg := classifyDownloadError(err)
	result.Success = false
	result.ErrorCode = errorCode
	result.ErrorMessage = errorMsg
	if errorMsg == "" {
		result.ErrorMessage = defaultMsg
	}
	result.Retryable = models.IsRetryableError(errorCode)
	result.Duration = duration
}

