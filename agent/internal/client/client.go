package client

import (
	"bytes"
	"crypto/md5"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

// Client handles communication with the PatchIQ backend
type Client struct {
	baseURL      string
	httpClient   *http.Client
	agentID      string
	accessToken  string
	refreshToken string
	agentVersion string
}

// New creates a new backend client
func New(baseURL string, agentVersion string) *Client {
	return &Client{
		baseURL:      baseURL,
		agentVersion: agentVersion,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
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

	var result RegisterResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("failed to parse registration response: %w", err)
	}

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

	// Use the v1 API endpoint
	httpReq, err := http.NewRequest("POST", c.baseURL+"/../v1/patch-repository/patches/agent-downloads", bytes.NewBuffer(body))
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

// DownloadPatchFile downloads a patch file from a presigned URL and returns the local file path
func (c *Client) DownloadPatchFile(info PatchDownloadInfo, destDir string) (string, error) {
	// Create the HTTP request with extended timeout for large files
	downloadClient := &http.Client{
		Timeout: 30 * time.Minute, // Allow up to 30 minutes for large patches
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

	// Read response body
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read download response: %w", err)
	}

	// Verify checksum if provided
	if info.Checksum != "" {
		checksum := calculateChecksum(data, info.ChecksumType)
		if checksum != info.Checksum {
			return "", fmt.Errorf("checksum mismatch: expected %s, got %s", info.Checksum, checksum)
		}
	}

	// Ensure destination directory exists
	if err := ensureDir(destDir); err != nil {
		return "", fmt.Errorf("failed to create destination directory: %w", err)
	}

	// Write to file
	destPath := destDir + "/" + info.FileName
	if err := writeFile(destPath, data); err != nil {
		return "", fmt.Errorf("failed to write file: %w", err)
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
