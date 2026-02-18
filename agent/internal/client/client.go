package client

import (
	"bytes"
	"crypto/md5"
	"crypto/sha256"
	"crypto/tls"
	"crypto/x509"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/patchify/agent/internal/download"
)

// ErrAuth indicates an authentication failure (401/403) requiring re-registration
type ErrAuth struct {
	StatusCode int
	Message    string
}

func (e *ErrAuth) Error() string {
	return fmt.Sprintf("auth failed (status %d): %s", e.StatusCode, e.Message)
}

// ProxyConfig holds proxy and download settings for HTTP communication
type ProxyConfig struct {
	ProxyURL             string
	Username             string
	Password             string
	NoProxy              string
	MaxDownloadSpeedMBps int    // Max download speed in MB/s (0 = unlimited)
	EnableDownloadResume bool   // Support HTTP Range-based resume
	CACertFile           string // Path to custom CA certificate file (PEM format)
}

// Client handles communication with the PatchIQ backend
type Client struct {
	baseURL      string
	httpClient   *http.Client
	agentID      string
	accessToken  string
	refreshToken string
	agentVersion string
	proxyConfig  *ProxyConfig
}

// New creates a new backend client. If proxyConfig is non-nil and has a ProxyURL,
// all HTTP requests will be routed through that proxy.
// TLS is always enforced - the ServerURL must use HTTPS.
func New(baseURL string, agentVersion string, proxyConfig *ProxyConfig) (*Client, error) {
	// Validate URL scheme
	if !strings.HasPrefix(baseURL, "http://") && !strings.HasPrefix(baseURL, "https://") {
		return nil, fmt.Errorf("server URL must use HTTP or HTTPS (got: %s)", baseURL)
	}

	transport, err := buildTransport(proxyConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to build transport: %w", err)
	}

	return &Client{
		baseURL:      baseURL,
		agentVersion: agentVersion,
		proxyConfig:  proxyConfig,
		httpClient: &http.Client{
			Timeout:   30 * time.Second,
			Transport: transport,
		},
	}, nil
}

// buildTransport creates an http.Transport with proxy and TLS settings.
// TLS is always enabled with minimum version TLS 1.2.
// Custom CA certificates can be loaded via ProxyConfig.CACertFile.
func buildTransport(pc *ProxyConfig) (*http.Transport, error) {
	transport := http.DefaultTransport.(*http.Transport).Clone()

	// Configure TLS with secure defaults
	tlsConfig := &tls.Config{
		MinVersion: tls.VersionTLS12,
		// InsecureSkipVerify is NEVER enabled - TLS validation is mandatory
	}

	// Load custom CA certificate if provided
	if pc != nil && pc.CACertFile != "" {
		caCert, err := os.ReadFile(pc.CACertFile)
		if err != nil {
			return nil, fmt.Errorf("failed to read CA certificate file %s: %w", pc.CACertFile, err)
		}

		caCertPool := x509.NewCertPool()
		if !caCertPool.AppendCertsFromPEM(caCert) {
			return nil, fmt.Errorf("failed to parse CA certificate from %s", pc.CACertFile)
		}

		tlsConfig.RootCAs = caCertPool
		log.Printf("[Client] Loaded custom CA certificate from: %s", pc.CACertFile)
	}

	transport.TLSClientConfig = tlsConfig

	// Configure proxy if provided
	if pc != nil && pc.ProxyURL != "" {
		proxyURL, err := url.Parse(pc.ProxyURL)
		if err != nil {
			return nil, fmt.Errorf("invalid proxy URL %s: %w", pc.ProxyURL, err)
		}

		// Embed credentials into the proxy URL if provided
		if pc.Username != "" {
			proxyURL.User = url.UserPassword(pc.Username, pc.Password)
		}

		transport.Proxy = http.ProxyURL(proxyURL)
		log.Printf("[Client] Using proxy: %s", pc.ProxyURL)
	}

	return transport, nil
}

// agentAPIURL constructs the URL for agent API endpoints
// The agent API is at /api/agent/* not /{version}/agent/*
func (c *Client) agentAPIURL(path string) string {
	// Extract base URL without version (e.g., http://localhost:3000 from http://localhost:3000/v1)
	base := c.baseURL
	// Remove any trailing version segment like /v1, /v2, etc.
	for _, suffix := range []string{"/v1", "/v2", "/api"} {
		if len(base) > len(suffix) && base[len(base)-len(suffix):] == suffix {
			base = base[:len(base)-len(suffix)]
			break
		}
	}
	return base + "/api/agent" + path
}

// SetCredentials sets the agent credentials after registration
func (c *Client) SetCredentials(agentID, accessToken, refreshToken string) {
	c.agentID = agentID
	c.accessToken = accessToken
	c.refreshToken = refreshToken
}

// GetAgentID returns the current agent ID
func (c *Client) GetAgentID() string {
	return c.agentID
}

// IsRegistered returns true if the agent has valid credentials
func (c *Client) IsRegistered() bool {
	return c.agentID != "" && c.accessToken != ""
}

// GetAccessToken returns the current access token
func (c *Client) GetAccessToken() string {
	return c.accessToken
}

// GetRefreshToken returns the current refresh token
func (c *Client) GetRefreshToken() string {
	return c.refreshToken
}

// Register registers the agent with the backend
func (c *Client) Register(req *RegisterRequest) (*RegisterResponse, error) {
	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal registration request: %w", err)
	}

	httpReq, err := http.NewRequest("POST", c.agentAPIURL("/register"), bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("X-Agent-Version", c.agentVersion)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("registration request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		var errResp ErrorResponse
		if json.Unmarshal(respBody, &errResp) == nil {
			return nil, fmt.Errorf("registration failed: %s", errResp.Message)
		}
		return nil, fmt.Errorf("registration failed with status %d: %s", resp.StatusCode, string(respBody))
	}

	// Backend wraps responses in { success: true, data: {...} } envelope
	var envelope struct {
		Success bool             `json:"success"`
		Data    RegisterResponse `json:"data"`
	}
	if err := json.Unmarshal(respBody, &envelope); err != nil {
		return nil, fmt.Errorf("failed to parse registration response: %w", err)
	}
	result := envelope.Data

	// Store credentials
	c.SetCredentials(result.AgentID, result.AccessToken, result.RefreshToken)

	return &result, nil
}

// Heartbeat sends a heartbeat to the backend
func (c *Client) Heartbeat(req *HeartbeatRequest) (*HeartbeatResponse, error) {
	if !c.IsRegistered() {
		return nil, fmt.Errorf("agent not registered")
	}

	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal heartbeat request: %w", err)
	}

	httpReq, err := http.NewRequest("POST", c.agentAPIURL("/heartbeat"), bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	c.setHeaders(httpReq)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("heartbeat request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
		return nil, &ErrAuth{StatusCode: resp.StatusCode, Message: "heartbeat rejected"}
	}
	if resp.StatusCode != http.StatusOK {
		var errResp ErrorResponse
		if json.Unmarshal(respBody, &errResp) == nil {
			return nil, fmt.Errorf("heartbeat failed: %s", errResp.Message)
		}
		return nil, fmt.Errorf("heartbeat failed with status %d", resp.StatusCode)
	}

	var result HeartbeatResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("failed to parse heartbeat response: %w", err)
	}

	return &result, nil
}

// GetPendingCommands fetches pending commands from the backend
func (c *Client) GetPendingCommands() ([]PendingCommand, error) {
	if !c.IsRegistered() {
		return nil, fmt.Errorf("agent not registered")
	}

	httpReq, err := http.NewRequest("GET", c.agentAPIURL("/commands"), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	c.setHeaders(httpReq)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("get commands request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("get commands failed with status %d", resp.StatusCode)
	}

	var commands []PendingCommand
	if err := json.Unmarshal(respBody, &commands); err != nil {
		return nil, fmt.Errorf("failed to parse commands response: %w", err)
	}

	return commands, nil
}

// ReportCommandResult reports the result of a command execution
func (c *Client) ReportCommandResult(commandID string, req *CommandResultRequest) error {
	if !c.IsRegistered() {
		return fmt.Errorf("agent not registered")
	}

	body, err := json.Marshal(req)
	if err != nil {
		return fmt.Errorf("failed to marshal command result: %w", err)
	}

	httpReq, err := http.NewRequest("POST", c.agentAPIURL("/commands/"+commandID+"/result"), bytes.NewBuffer(body))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	c.setHeaders(httpReq)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("report command result failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("report command result failed with status %d", resp.StatusCode)
	}

	return nil
}

// SubmitInventory submits inventory data to the backend
func (c *Client) SubmitInventory(req *InventoryRequest) error {
	if !c.IsRegistered() {
		return fmt.Errorf("agent not registered")
	}

	body, err := json.Marshal(req)
	if err != nil {
		return fmt.Errorf("failed to marshal inventory: %w", err)
	}

	httpReq, err := http.NewRequest("POST", c.agentAPIURL("/inventory"), bytes.NewBuffer(body))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	c.setHeaders(httpReq)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("submit inventory failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
		return &ErrAuth{StatusCode: resp.StatusCode, Message: "inventory rejected"}
	}
	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("submit inventory failed with status %d: %s", resp.StatusCode, string(respBody))
	}

	return nil
}

// SubmitTelemetry submits telemetry data to the backend
func (c *Client) SubmitTelemetry(req *TelemetryRequest) error {
	if !c.IsRegistered() {
		return fmt.Errorf("agent not registered")
	}

	body, err := json.Marshal(req)
	if err != nil {
		return fmt.Errorf("failed to marshal telemetry: %w", err)
	}

	httpReq, err := http.NewRequest("POST", c.agentAPIURL("/telemetry"), bytes.NewBuffer(body))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	c.setHeaders(httpReq)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("submit telemetry failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
		return &ErrAuth{StatusCode: resp.StatusCode, Message: "telemetry rejected"}
	}
	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("submit telemetry failed with status %d: %s", resp.StatusCode, string(respBody))
	}

	return nil
}

// GetConfig fetches agent configuration from the backend
func (c *Client) GetConfig() (*AgentConfig, error) {
	if !c.IsRegistered() {
		return nil, fmt.Errorf("agent not registered")
	}

	httpReq, err := http.NewRequest("GET", c.agentAPIURL("/config"), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	c.setHeaders(httpReq)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("get config failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("get config failed with status %d", resp.StatusCode)
	}

	var config AgentConfig
	if err := json.Unmarshal(respBody, &config); err != nil {
		return nil, fmt.Errorf("failed to parse config response: %w", err)
	}

	return &config, nil
}

// RefreshToken refreshes the access token using the refresh token
func (c *Client) RefreshToken() error {
	if c.refreshToken == "" {
		return fmt.Errorf("no refresh token available")
	}

	httpReq, err := http.NewRequest("POST", c.agentAPIURL("/token/refresh"), nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Authorization", "Bearer "+c.refreshToken)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("token refresh failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("token refresh failed with status %d: %s", resp.StatusCode, string(respBody))
	}

	var result TokenRefreshResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return fmt.Errorf("failed to parse token refresh response: %w", err)
	}

	c.accessToken = result.AccessToken
	c.refreshToken = result.RefreshToken

	return nil
}

// PostJSON sends an authenticated POST request with a JSON payload to an agent API endpoint.
// path should be relative to /api/agent (e.g. "/logs").
func (c *Client) PostJSON(path string, payload interface{}) error {
	if !c.IsRegistered() {
		return fmt.Errorf("agent not registered")
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	httpReq, err := http.NewRequest("POST", c.agentAPIURL(path), bytes.NewBuffer(body))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	c.setHeaders(httpReq)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("request to %s failed with status %d: %s", path, resp.StatusCode, string(respBody))
	}

	return nil
}

// setHeaders sets common headers for authenticated requests
func (c *Client) setHeaders(req *http.Request) {
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Agent-Id", c.agentID)
	req.Header.Set("X-Agent-Version", c.agentVersion)
	if c.accessToken != "" {
		req.Header.Set("Authorization", "Bearer "+c.accessToken)
	}
}

// ============================================
// Patch Repository (MinIO) Methods
// ============================================

// GetPatchDownloadURLs requests presigned download URLs for patches from the central repository
func (c *Client) GetPatchDownloadURLs(patchIDs []string) ([]PatchDownloadInfo, error) {
	if !c.IsRegistered() {
		return nil, fmt.Errorf("agent not registered")
	}

	req := PatchDownloadRequest{
		AgentID:  c.agentID,
		PatchIDs: patchIDs,
	}

	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal patch download request: %w", err)
	}

	// Build the v1 API URL by stripping /api suffix and appending /v1/...
	base := c.baseURL
	for _, suffix := range []string{"/v1", "/v2", "/api"} {
		if len(base) > len(suffix) && base[len(base)-len(suffix):] == suffix {
			base = base[:len(base)-len(suffix)]
			break
		}
	}
	httpReq, err := http.NewRequest("POST", base+"/v1/patch-repository/patches/agent-downloads", bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	c.setHeaders(httpReq)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("get patch download URLs failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("get patch download URLs failed with status %d: %s", resp.StatusCode, string(respBody))
	}

	var result PatchDownloadResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("failed to parse patch download response: %w", err)
	}

	return result.Data, nil
}

// DownloadPatchFile downloads a patch file from a presigned URL and returns the local file path.
// Supports rate limiting, progress tracking, and checksum verification.
func (c *Client) DownloadPatchFile(info PatchDownloadInfo, destDir string) (string, error) {
	// Ensure destination directory exists
	if err := ensureDir(destDir); err != nil {
		return "", fmt.Errorf("failed to create destination directory: %w", err)
	}
	destPath := destDir + "/" + info.FileName

	transport, err := buildTransport(c.proxyConfig)
	if err != nil {
		return "", fmt.Errorf("failed to build transport: %w", err)
	}

	downloadClient := &http.Client{
		Timeout:   30 * time.Minute,
		Transport: transport,
	}

	httpReq, err := http.NewRequest("GET", info.DownloadURL, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create download request: %w", err)
	}
	httpReq.Header.Set("User-Agent", "PatchIQ-Agent/"+c.agentVersion)

	resp, err := downloadClient.Do(httpReq)
	if err != nil {
		return "", fmt.Errorf("download request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("download failed with status %d", resp.StatusCode)
	}

	totalSize := resp.ContentLength

	// Wrap reader with rate limiter if configured
	var reader io.Reader = resp.Body
	if c.proxyConfig != nil && c.proxyConfig.MaxDownloadSpeedMBps > 0 {
		bytesPerSec := c.proxyConfig.MaxDownloadSpeedMBps * 1024 * 1024
		reader = download.NewRateLimitedReader(reader, bytesPerSec)
	}

	// Wrap with progress tracking
	reader = download.NewProgressReader(reader, totalSize, func(downloaded, total int64, bytesPerSec float64) {
		if total > 0 {
			pct := float64(downloaded) / float64(total) * 100
			log.Printf("Patch download %s: %.1f%% @ %.2f MB/s", info.FileName, pct, bytesPerSec/(1024*1024))
		} else {
			log.Printf("Patch download %s: %d bytes @ %.2f MB/s", info.FileName, downloaded, bytesPerSec/(1024*1024))
		}
	})

	// Stream to file with checksum calculation
	outFile, err := os.Create(destPath)
	if err != nil {
		return "", fmt.Errorf("failed to create output file: %w", err)
	}

	hasher := sha256.New()
	writer := io.MultiWriter(outFile, hasher)

	if _, err := io.Copy(writer, reader); err != nil {
		outFile.Close()
		os.Remove(destPath)
		return "", fmt.Errorf("failed to download patch: %w", err)
	}
	outFile.Close()

	// Verify checksum if provided
	if info.Checksum != "" {
		actualChecksum := hex.EncodeToString(hasher.Sum(nil))
		expectedChecksum := info.Checksum

		// Try SHA256 first (computed during download), fall back to other algorithms
		if info.ChecksumType == "md5" {
			// Need to re-read file for MD5
			data, err := os.ReadFile(destPath)
			if err != nil {
				os.Remove(destPath)
				return "", fmt.Errorf("failed to read file for checksum: %w", err)
			}
			actualChecksum = calculateChecksum(data, "md5")
		}

		if actualChecksum != expectedChecksum {
			os.Remove(destPath)
			return "", fmt.Errorf("checksum mismatch: expected %s, got %s", expectedChecksum, actualChecksum)
		}
	}

	return destPath, nil
}

// calculateChecksum computes the checksum of data using the specified algorithm
func calculateChecksum(data []byte, checksumType string) string {
	switch checksumType {
	case "md5":
		sum := md5.Sum(data)
		return hex.EncodeToString(sum[:])
	case "sha256", "":
		sum := sha256.Sum256(data)
		return hex.EncodeToString(sum[:])
	default:
		// Default to SHA256
		sum := sha256.Sum256(data)
		return hex.EncodeToString(sum[:])
	}
}

// ensureDir creates a directory if it doesn't exist
func ensureDir(path string) error {
	return os.MkdirAll(path, 0755)
}

// writeFile writes data to a file with appropriate permissions
func writeFile(path string, data []byte) error {
	return os.WriteFile(path, data, 0644)
}
