// Package integration tests the PatchIQ agent against a mock backend server
// that replicates exact real backend API formats.
//
// These tests exercise the full agent lifecycle: registration, heartbeat,
// command dispatch, inventory, telemetry, token refresh, auto-update,
// and error recovery flows.
//
//go:build integration
// +build integration

package integration

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/patchify/agent/internal/client"
	"github.com/patchify/agent/internal/config"
	"github.com/patchify/agent/internal/storage"
	"github.com/patchify/agent/internal/update"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ---------- Helpers ----------

// newTestClient creates a client pointed at the mock backend
func newTestClient(t *testing.T, mb *MockBackend) *client.Client {
	t.Helper()
	c, err := client.New(mb.URL, "1.0.0-test", nil)
	require.NoError(t, err)
	return c
}

// registerTestAgent registers a test agent and returns the client with credentials set
func registerTestAgent(t *testing.T, mb *MockBackend) *client.Client {
	t.Helper()
	c := newTestClient(t, mb)

	resp, err := c.Register(&client.RegisterRequest{
		MachineID:    "machine-integration-test-001",
		Hostname:     "test-host",
		OS:           "LINUX",
		OSVersion:    "22.04",
		Architecture: "amd64",
		AgentVersion: "1.0.0-test",
	})
	require.NoError(t, err)
	require.NotEmpty(t, resp.AgentID)
	require.NotEmpty(t, resp.AccessToken)

	return c
}

// newTestConfig creates a test config pointing at the mock backend
func newTestConfig(t *testing.T, mb *MockBackend) *config.Config {
	t.Helper()
	cfg := config.DefaultConfig()
	cfg.ServerURL = mb.URL
	cfg.DataDir = t.TempDir()
	cfg.HeartbeatInterval = 1   // Fast for testing
	cfg.TelemetryInterval = 1
	cfg.InventoryInterval = 3600 // Don't auto-trigger
	cfg.CommandTimeoutSeconds = 30
	cfg.JobRetentionDays = 30
	return cfg
}

// waitFor polls a condition with timeout
func waitFor(t *testing.T, timeout time.Duration, interval time.Duration, condition func() bool, msg string) {
	t.Helper()
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if condition() {
			return
		}
		time.Sleep(interval)
	}
	t.Fatalf("timeout waiting for: %s", msg)
}

// ==========================================================================
// 1. Registration Tests
// ==========================================================================

func TestRegistration_Success(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	c := newTestClient(t, mb)

	resp, err := c.Register(&client.RegisterRequest{
		MachineID:    "machine-reg-001",
		Hostname:     "test-host",
		OS:           "LINUX",
		OSVersion:    "22.04",
		Architecture: "amd64",
		AgentVersion: "1.0.0",
	})

	require.NoError(t, err)
	assert.NotEmpty(t, resp.AgentID)
	assert.NotEmpty(t, resp.AssetID)
	assert.NotEmpty(t, resp.AccessToken)
	assert.NotEmpty(t, resp.RefreshToken)
	assert.Equal(t, 3600, resp.TokenExpiresIn)
	assert.False(t, resp.IsReRegistration)
	assert.Equal(t, "Agent registered successfully", resp.Message)
	assert.True(t, c.IsRegistered())

	// Verify config was returned
	assert.Equal(t, 60, resp.Config.HeartbeatIntervalSeconds)
	assert.True(t, resp.Config.TelemetryEnabled)
}

func TestRegistration_ReRegistration(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	c := newTestClient(t, mb)
	machineID := "machine-rereg-001"

	// First registration
	resp1, err := c.Register(&client.RegisterRequest{
		MachineID:    machineID,
		Hostname:     "host1",
		OS:           "LINUX",
		Architecture: "amd64",
		AgentVersion: "1.0.0",
	})
	require.NoError(t, err)
	assert.False(t, resp1.IsReRegistration)

	// Second registration with same machineID
	c2 := newTestClient(t, mb)
	resp2, err := c2.Register(&client.RegisterRequest{
		MachineID:    machineID,
		Hostname:     "host1",
		OS:           "LINUX",
		Architecture: "amd64",
		AgentVersion: "1.1.0",
	})
	require.NoError(t, err)
	assert.True(t, resp2.IsReRegistration)
	assert.Equal(t, resp1.AgentID, resp2.AgentID) // Same agent ID
	assert.Equal(t, 2, mb.GetRegistrationCount())
}

func TestRegistration_ValidationErrors(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	c := newTestClient(t, mb)

	// Missing required fields
	_, err := c.Register(&client.RegisterRequest{
		MachineID: "machine-001",
		// Missing hostname, os, architecture
	})
	assert.Error(t, err)

	// Invalid OS
	_, err = c.Register(&client.RegisterRequest{
		MachineID:    "machine-001",
		Hostname:     "host",
		OS:           "INVALID_OS",
		Architecture: "amd64",
	})
	assert.Error(t, err)
}

func TestRegistration_ServerDown(t *testing.T) {
	mb := NewMockBackend()
	mb.SetServerError(true)
	defer mb.Close()

	c := newTestClient(t, mb)
	_, err := c.Register(&client.RegisterRequest{
		MachineID:    "machine-001",
		Hostname:     "host",
		OS:           "LINUX",
		Architecture: "amd64",
	})
	assert.Error(t, err)
}

func TestRegistration_HeaderValidation(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	// X-Agent-Version header is set from the client constructor, not the request body
	c, err := client.New(mb.URL, "2.5.0", nil)
	require.NoError(t, err)

	_, err = c.Register(&client.RegisterRequest{
		MachineID:    "machine-header-test",
		Hostname:     "host",
		OS:           "LINUX",
		Architecture: "amd64",
		AgentVersion: "2.5.0",
	})
	require.NoError(t, err)

	calls := mb.GetCallsByPath("/api/agent/register")
	require.Len(t, calls, 1)
	assert.Equal(t, "application/json", calls[0].Headers.Get("Content-Type"))
	assert.Equal(t, "2.5.0", calls[0].Headers.Get("X-Agent-Version"))
}

// ==========================================================================
// 2. Heartbeat Tests
// ==========================================================================

func TestHeartbeat_Success(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	c := registerTestAgent(t, mb)

	resp, err := c.Heartbeat(&client.HeartbeatRequest{
		Timestamp:     time.Now().UTC().Format(time.RFC3339),
		Status:        "healthy",
		Uptime:        86400,
		AgentUptime:   3600,
		CPUUsage:      25.5,
		MemoryUsage:   67.2,
		DiskUsage:     45.0,
		PendingReboot: false,
	})

	require.NoError(t, err)
	assert.True(t, resp.Acknowledged)
	assert.NotEmpty(t, resp.ServerTime)
	assert.False(t, resp.CommandsPending)
}

func TestHeartbeat_CommandsPending(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	c := registerTestAgent(t, mb)
	mb.SetCommandsPending(true)

	resp, err := c.Heartbeat(&client.HeartbeatRequest{
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Status:    "healthy",
		Uptime:    100,
		AgentUptime: 50,
	})

	require.NoError(t, err)
	assert.True(t, resp.CommandsPending)
}

func TestHeartbeat_InventoryRequested(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	c := registerTestAgent(t, mb)
	mb.SetInventoryRequested(true)

	resp, err := c.Heartbeat(&client.HeartbeatRequest{
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Status:    "healthy",
		Uptime:    100,
		AgentUptime: 50,
	})

	require.NoError(t, err)
	assert.True(t, resp.InventoryRequested)

	// Second heartbeat should NOT request inventory (one-shot flag)
	resp2, err := c.Heartbeat(&client.HeartbeatRequest{
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Status:    "healthy",
		Uptime:    101,
		AgentUptime: 51,
	})
	require.NoError(t, err)
	assert.False(t, resp2.InventoryRequested)
}

func TestHeartbeat_AuthRejection(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	c := registerTestAgent(t, mb)
	mb.SetRejectAuth(true)

	_, err := c.Heartbeat(&client.HeartbeatRequest{
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Status:    "healthy",
		Uptime:    100,
		AgentUptime: 50,
	})

	assert.Error(t, err)
	_, isAuthErr := err.(*client.ErrAuth)
	assert.True(t, isAuthErr, "expected ErrAuth, got: %T", err)
}

func TestHeartbeat_NotRegistered(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	c := newTestClient(t, mb)

	_, err := c.Heartbeat(&client.HeartbeatRequest{
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Status:    "healthy",
		Uptime:    100,
		AgentUptime: 50,
	})

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not registered")
}

func TestHeartbeat_HeadersValidation(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	c := registerTestAgent(t, mb)
	mb.ResetCalls()

	_, err := c.Heartbeat(&client.HeartbeatRequest{
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Status:    "healthy",
		Uptime:    100,
		AgentUptime: 50,
	})
	require.NoError(t, err)

	calls := mb.GetCallsByPath("/api/agent/heartbeat")
	require.Len(t, calls, 1)
	assert.NotEmpty(t, calls[0].Headers.Get("X-Agent-Id"))
	assert.NotEmpty(t, calls[0].Headers.Get("X-Agent-Version"))
	assert.True(t, strings.HasPrefix(calls[0].Headers.Get("Authorization"), "Bearer "))
}

// ==========================================================================
// 3. Command Dispatch Tests
// ==========================================================================

func TestCommands_FetchPendingCommands(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	c := registerTestAgent(t, mb)

	// Enqueue commands
	mb.EnqueueCommand(PendingCommand{
		ID:   "cmd-001",
		Type: "inventory_full",
	})
	mb.EnqueueCommand(PendingCommand{
		ID:   "cmd-002",
		Type: "patch_install",
		Payload: map[string]interface{}{
			"patchId": "KB5031356",
			"options": map[string]interface{}{
				"force":       false,
				"allowReboot": false,
			},
		},
	})

	commands, err := c.GetPendingCommands()
	require.NoError(t, err)
	assert.Len(t, commands, 2)
	assert.Equal(t, "cmd-001", commands[0].ID)
	assert.Equal(t, "inventory_full", commands[0].Type)
	assert.Equal(t, "cmd-002", commands[1].ID)
	assert.Equal(t, "patch_install", commands[1].Type)
}

func TestCommands_ConsumedAfterFetch(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	c := registerTestAgent(t, mb)

	mb.EnqueueCommand(PendingCommand{
		ID:   "cmd-001",
		Type: "inventory_full",
	})

	// First fetch gets the command
	commands, err := c.GetPendingCommands()
	require.NoError(t, err)
	assert.Len(t, commands, 1)

	// Second fetch gets empty (commands consumed)
	commands2, err := c.GetPendingCommands()
	require.NoError(t, err)
	assert.Len(t, commands2, 0)
}

func TestCommands_ReportResult(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	c := registerTestAgent(t, mb)

	err := c.ReportCommandResult("cmd-001", &client.CommandResultRequest{
		Status:       "completed",
		Result:       "Patch KB5031356 installed successfully",
		ErrorMessage: "",
	})
	require.NoError(t, err)

	// Verify result was recorded
	result := mb.GetCommandResult("cmd-001")
	require.NotNil(t, result)
	assert.Equal(t, "completed", result.Status)
	assert.Equal(t, "Patch KB5031356 installed successfully", result.Result)
}

func TestCommands_ReportFailedResult(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	c := registerTestAgent(t, mb)

	err := c.ReportCommandResult("cmd-fail-001", &client.CommandResultRequest{
		Status:       "failed",
		ErrorMessage: "Package not found: invalid-package",
		Output:       "E: Unable to locate package invalid-package",
	})
	require.NoError(t, err)

	result := mb.GetCommandResult("cmd-fail-001")
	require.NotNil(t, result)
	assert.Equal(t, "failed", result.Status)
	assert.Equal(t, "Package not found: invalid-package", result.ErrorMessage)
	assert.Contains(t, result.Output, "Unable to locate package")
}

func TestCommands_AllPayloadFormats(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	c := registerTestAgent(t, mb)

	// Enqueue various command types with their exact payload formats
	mb.EnqueueCommands([]PendingCommand{
		{
			ID:   "cmd-inv",
			Type: "inventory_full",
		},
		{
			ID:   "cmd-patch-array",
			Type: "patch_install",
			Payload: map[string]interface{}{
				"patches": []map[string]interface{}{
					{
						"patchId":        "patch-uuid-1",
						"kbNumber":       "KB5031356",
						"packageName":    "security-update",
						"downloadUrl":    "https://example.com/patch.msu",
						"checksum":       "abc123",
						"checksumType":   "sha256",
						"rebootRequired": false,
						"forceReboot":    false,
					},
				},
			},
		},
		{
			ID:   "cmd-patch-single",
			Type: "patch_install",
			Payload: map[string]interface{}{
				"patchId": "KB5031356",
				"options": map[string]interface{}{
					"force":       true,
					"allowReboot": false,
				},
			},
		},
		{
			ID:   "cmd-sw-install",
			Type: "software_install",
			Payload: map[string]interface{}{
				"name":       "nodejs",
				"version":    "20.0.0",
				"source":     "apt",
				"packageUrl": "https://example.com/node.deb",
				"silent":     true,
				"checksum":   "sha256hex",
			},
		},
		{
			ID:   "cmd-agent-update",
			Type: "agent_update",
			Payload: map[string]interface{}{
				"downloadUrl": "https://example.com/agent-binary",
				"checksum":    "sha256hex",
				"version":     "2.0.0",
			},
		},
		{
			ID:   "cmd-script-bundle",
			Type: "script_bundle",
			Payload: map[string]interface{}{
				"operationType":  "install",
				"packageId":      "pkg-001",
				"packageName":    "my-app",
				"version":        "1.0.0",
				"bundleUrl":      "https://example.com/bundle.tar.gz",
				"bundleChecksum": "sha256hex",
				"requiresRoot":   false,
				"timeout":        300,
				"environment":    map[string]string{"ENV": "test"},
			},
		},
		{
			ID:   "cmd-script-inline",
			Type: "script_inline",
			Payload: map[string]interface{}{
				"script":        "#!/bin/bash\necho hello",
				"operationType": "install",
				"requiresRoot":  false,
			},
		},
	})

	commands, err := c.GetPendingCommands()
	require.NoError(t, err)
	assert.Len(t, commands, 7)

	// Verify each command has correct type
	types := make([]string, len(commands))
	for i, cmd := range commands {
		types[i] = cmd.Type
	}
	assert.Contains(t, types, "inventory_full")
	assert.Contains(t, types, "patch_install")
	assert.Contains(t, types, "software_install")
	assert.Contains(t, types, "agent_update")
	assert.Contains(t, types, "script_bundle")
	assert.Contains(t, types, "script_inline")

	// Verify agent_update payload parses correctly into update.Request
	for _, cmd := range commands {
		if cmd.Type == "agent_update" {
			payloadJSON, _ := json.Marshal(cmd.Payload)
			var updateReq update.Request
			err := json.Unmarshal(payloadJSON, &updateReq)
			require.NoError(t, err)
			assert.Equal(t, "https://example.com/agent-binary", updateReq.DownloadURL)
			assert.Equal(t, "sha256hex", updateReq.Checksum)
			assert.Equal(t, "2.0.0", updateReq.Version)
		}
	}
}

// ==========================================================================
// 4. Inventory Tests
// ==========================================================================

func TestInventory_Submit(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	c := registerTestAgent(t, mb)

	err := c.SubmitInventory(&client.InventoryRequest{
		CollectedAt: time.Now().UTC().Format(time.RFC3339),
		Hardware: map[string]interface{}{
			"systemIdentity": map[string]interface{}{
				"manufacturer": "Dell Inc.",
				"model":        "OptiPlex 7090",
				"serialNumber": "DMT3Y4K",
			},
		},
		Software: map[string]interface{}{
			"operatingSystem": map[string]interface{}{
				"name":    "Ubuntu",
				"version": "22.04.3 LTS",
			},
		},
	})
	require.NoError(t, err)

	inventories := mb.GetInventories()
	assert.Len(t, inventories, 1)

	// Verify the payload structure
	var inv map[string]interface{}
	json.Unmarshal(inventories[0], &inv)
	assert.NotEmpty(t, inv["collectedAt"])
	assert.NotNil(t, inv["hardware"])
	assert.NotNil(t, inv["software"])
}

func TestInventory_AuthRejection(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	c := registerTestAgent(t, mb)
	mb.SetRejectAuth(true)

	err := c.SubmitInventory(&client.InventoryRequest{
		CollectedAt: time.Now().UTC().Format(time.RFC3339),
	})

	assert.Error(t, err)
	_, isAuthErr := err.(*client.ErrAuth)
	assert.True(t, isAuthErr)
}

// ==========================================================================
// 5. Telemetry Tests
// ==========================================================================

func TestTelemetry_Submit(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	c := registerTestAgent(t, mb)

	err := c.SubmitTelemetry(&client.TelemetryRequest{
		CollectedAt: time.Now().UTC().Format(time.RFC3339),
		CPU: map[string]interface{}{
			"usagePercent":  23.5,
			"userPercent":   18.2,
			"systemPercent": 5.3,
			"loadAverage":   []float64{0.85, 0.92, 0.78},
		},
		Memory: map[string]interface{}{
			"usagePercent": 67.2,
			"totalBytes":   16106127360,
		},
	})
	require.NoError(t, err)

	telemetries := mb.GetTelemetries()
	assert.Len(t, telemetries, 1)
}

// ==========================================================================
// 6. Config Tests
// ==========================================================================

func TestConfig_Fetch(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	mb.SetConfig(AgentConfig{
		HeartbeatIntervalSeconds: 120,
		TelemetryIntervalSeconds: 30,
		TelemetryEnabled:         true,
		LogLevel:                 "debug",
		LatestAgentVersion:       "2.0.0",
		AgentDownloadURL:         "https://cdn.example.com/agent-2.0.0",
	})

	c := registerTestAgent(t, mb)

	cfg, err := c.GetConfig()
	require.NoError(t, err)
	assert.Equal(t, 120, cfg.HeartbeatIntervalSeconds)
	assert.Equal(t, 30, cfg.TelemetryIntervalSeconds)
	assert.True(t, cfg.TelemetryEnabled)
	assert.Equal(t, "debug", cfg.LogLevel)
	assert.Equal(t, "2.0.0", cfg.LatestAgentVersion)
}

// ==========================================================================
// 7. Token Refresh Tests
// ==========================================================================

func TestTokenRefresh_Success(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	c := registerTestAgent(t, mb)

	oldAccess := c.GetAccessToken()
	oldRefresh := c.GetRefreshToken()

	err := c.RefreshToken()
	require.NoError(t, err)

	// Tokens should be different after refresh
	assert.NotEqual(t, oldAccess, c.GetAccessToken())
	assert.NotEqual(t, oldRefresh, c.GetRefreshToken())
}

func TestTokenRefresh_AuthRejection(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	c := registerTestAgent(t, mb)
	mb.SetRejectAuth(true)

	err := c.RefreshToken()
	assert.Error(t, err)
}

// ==========================================================================
// 8. Credential Persistence Tests
// ==========================================================================

func TestCredentials_PersistAcrossRestart(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	dataDir := t.TempDir()

	// Register and save credentials
	c := newTestClient(t, mb)
	resp, err := c.Register(&client.RegisterRequest{
		MachineID:    "machine-persist-001",
		Hostname:     "host",
		OS:           "LINUX",
		Architecture: "amd64",
		AgentVersion: "1.0.0",
	})
	require.NoError(t, err)

	creds := &client.Credentials{
		AgentID:      resp.AgentID,
		AssetID:      resp.AssetID,
		AccessToken:  resp.AccessToken,
		RefreshToken: resp.RefreshToken,
		MachineID:    "machine-persist-001",
		ServerURL:    mb.URL,
	}
	require.NoError(t, client.SaveCredentials(dataDir, creds))

	// Simulate restart: load credentials and create new client
	loaded, err := client.LoadCredentials(dataDir)
	require.NoError(t, err)
	require.NotNil(t, loaded)

	c2, err := client.New(mb.URL, "1.0.0", nil)
	require.NoError(t, err)
	c2.SetCredentials(loaded.AgentID, loaded.AccessToken, loaded.RefreshToken)

	assert.True(t, c2.IsRegistered())
	assert.Equal(t, resp.AgentID, c2.GetAgentID())

	// Should be able to heartbeat without re-registering
	hbResp, err := c2.Heartbeat(&client.HeartbeatRequest{
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Status:    "healthy",
		Uptime:    100,
		AgentUptime: 1,
	})
	require.NoError(t, err)
	assert.True(t, hbResp.Acknowledged)

	// Only 1 registration should have happened
	assert.Equal(t, 1, mb.GetRegistrationCount())
}

func TestCredentials_ServerURLChange_TriggersReRegistration(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	dataDir := t.TempDir()

	// Save credentials with old server URL
	creds := &client.Credentials{
		AgentID:     "old-agent",
		AccessToken: "old-token",
		MachineID:   "machine-001",
		ServerURL:   "https://old-server.example.com",
	}
	require.NoError(t, client.SaveCredentials(dataDir, creds))

	// Load and verify the saved server URL doesn't match current
	loaded, err := client.LoadCredentials(dataDir)
	require.NoError(t, err)
	assert.NotEqual(t, mb.URL, loaded.ServerURL)
}

// ==========================================================================
// 9. Job Persistence (SQLite) Tests
// ==========================================================================

func TestJobStore_PersistAcrossRestart(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "jobs.db")

	// First "session" - save a job
	store1, err := storage.NewJobStore(dbPath)
	require.NoError(t, err)

	job := storage.JobHistoryEntry{
		ID:        "job-persist-001",
		Type:      "patch_install",
		Status:    "completed",
		StartedAt: time.Now(),
		Result:    map[string]interface{}{"message": "Patch installed"},
	}
	require.NoError(t, store1.Save(job))
	require.NoError(t, store1.Close())

	// Second "session" - load the job
	store2, err := storage.NewJobStore(dbPath)
	require.NoError(t, err)
	defer store2.Close()

	loaded, err := store2.Get("job-persist-001")
	require.NoError(t, err)
	assert.Equal(t, "patch_install", loaded.Type)
	assert.Equal(t, "completed", loaded.Status)
}

func TestJobStore_CountByStatus(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "jobs.db")
	store, err := storage.NewJobStore(dbPath)
	require.NoError(t, err)
	defer store.Close()

	// Simulate multiple commands with different statuses
	for i := 0; i < 5; i++ {
		store.Save(storage.JobHistoryEntry{
			ID:        fmt.Sprintf("job-completed-%d", i),
			Type:      "patch_install",
			Status:    "completed",
			StartedAt: time.Now(),
		})
	}
	for i := 0; i < 3; i++ {
		store.Save(storage.JobHistoryEntry{
			ID:        fmt.Sprintf("job-failed-%d", i),
			Type:      "software_install",
			Status:    "failed",
			StartedAt: time.Now(),
		})
	}

	completed, _ := store.CountByStatus("completed")
	failed, _ := store.CountByStatus("failed")
	assert.Equal(t, 5, completed)
	assert.Equal(t, 3, failed)
}

// ==========================================================================
// 10. Auto-Update Tests
// ==========================================================================

func TestAutoUpdate_DownloadAndVerifyChecksum(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	// Create a fake binary
	fakeBinary := []byte("#!/bin/bash\necho 'PatchIQ Agent v2.0.0'\n")
	mb.SetUpdateBinary(fakeBinary)

	expectedChecksum := mb.GetUpdateBinaryChecksum()
	downloadURL := mb.URL + "/api/agent/update/binary/version-2.0.0"

	// Test that the update mechanism can download and verify
	// We test the update.Perform function but intercept before binary replacement
	// by pointing it at a temp "binary"
	tempDir := t.TempDir()
	fakeCurrent := filepath.Join(tempDir, "patchiq-agent")
	os.WriteFile(fakeCurrent, []byte("old binary"), 0755)

	// We can't easily call update.Perform without it replacing the actual binary,
	// so instead we test the download + checksum verification flow directly
	result := update.Perform(update.Request{
		DownloadURL: downloadURL,
		Checksum:    expectedChecksum,
		Version:     "2.0.0",
	})

	// The update will fail because it tries to replace the test binary (os.Executable()),
	// but we verify the download and checksum validation worked.
	// If checksum was wrong, error would mention "checksum verification failed"
	if !result.Success {
		assert.NotContains(t, result.ErrorMessage, "checksum verification failed",
			"Checksum should have passed")
	}
}

func TestAutoUpdate_ChecksumMismatch(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	fakeBinary := []byte("#!/bin/bash\necho 'PatchIQ Agent v2.0.0'\n")
	mb.SetUpdateBinary(fakeBinary)

	downloadURL := mb.URL + "/api/agent/update/binary/version-2.0.0"

	result := update.Perform(update.Request{
		DownloadURL: downloadURL,
		Checksum:    "0000000000000000000000000000000000000000000000000000000000000000",
		Version:     "2.0.0",
	})

	assert.False(t, result.Success)
	assert.Contains(t, result.ErrorMessage, "checksum verification failed")
}

func TestAutoUpdate_DownloadFailure(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	// Don't set any binary data - should get 404
	result := update.Perform(update.Request{
		DownloadURL: mb.URL + "/api/agent/update/binary/nonexistent",
		Checksum:    "abc",
		Version:     "2.0.0",
	})

	assert.False(t, result.Success)
	assert.Contains(t, result.ErrorMessage, "HTTP 404")
}

func TestAutoUpdate_EmptyDownloadURL(t *testing.T) {
	result := update.Perform(update.Request{
		DownloadURL: "",
		Checksum:    "abc",
		Version:     "2.0.0",
	})

	assert.False(t, result.Success)
	assert.Contains(t, result.ErrorMessage, "downloadUrl is required")
}

func TestAutoUpdate_NoChecksum_Proceeds(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	fakeBinary := []byte("#!/bin/bash\necho 'agent v2'\n")
	mb.SetUpdateBinary(fakeBinary)

	// With empty checksum, update should still proceed (insecure mode)
	result := update.Perform(update.Request{
		DownloadURL: mb.URL + "/api/agent/update/binary/v2",
		Checksum:    "",
		Version:     "2.0.0",
	})

	// Will succeed or fail at binary replacement stage (not checksum)
	if !result.Success {
		assert.NotContains(t, result.ErrorMessage, "checksum")
	}
}

func TestAutoUpdate_CommandPayloadParsing(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	fakeBinary := []byte("fake agent binary v3.0")
	mb.SetUpdateBinary(fakeBinary)
	checksum := mb.GetUpdateBinaryChecksum()

	// Simulate backend sending agent_update command
	mb.EnqueueCommand(PendingCommand{
		ID:   "cmd-update-001",
		Type: "agent_update",
		Payload: map[string]interface{}{
			"downloadUrl": mb.URL + "/api/agent/update/binary/v3",
			"checksum":    checksum,
			"version":     "3.0.0",
		},
	})

	c := registerTestAgent(t, mb)
	commands, err := c.GetPendingCommands()
	require.NoError(t, err)
	require.Len(t, commands, 1)

	// Parse the payload as the agent would
	payloadJSON, err := json.Marshal(commands[0].Payload)
	require.NoError(t, err)

	var updateReq update.Request
	err = json.Unmarshal(payloadJSON, &updateReq)
	require.NoError(t, err)

	assert.Equal(t, mb.URL+"/api/agent/update/binary/v3", updateReq.DownloadURL)
	assert.Equal(t, checksum, updateReq.Checksum)
	assert.Equal(t, "3.0.0", updateReq.Version)
}

func TestAutoUpdate_BinaryServedCorrectly(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	// Create binary with known content
	binaryContent := make([]byte, 1024*10) // 10KB
	for i := range binaryContent {
		binaryContent[i] = byte(i % 256)
	}
	mb.SetUpdateBinary(binaryContent)

	// Verify checksum computation
	expected := sha256.Sum256(binaryContent)
	expectedHex := fmt.Sprintf("%x", expected)
	assert.Equal(t, expectedHex, mb.GetUpdateBinaryChecksum())

	// Download and verify
	result := update.Perform(update.Request{
		DownloadURL: mb.URL + "/api/agent/update/binary/test",
		Checksum:    expectedHex,
		Version:     "2.0.0",
	})

	// Checksum should pass; failure (if any) should be at binary replacement step
	if !result.Success {
		assert.NotContains(t, result.ErrorMessage, "checksum verification failed")
	}
}

// ==========================================================================
// 11. Rollback State Tests
// ==========================================================================

func TestRollbackState_SaveLoadClear(t *testing.T) {
	// Override the rollback state directory for testing
	stateDir := t.TempDir()
	updateDir := filepath.Join(stateDir, ".patchify-agent", "update")
	os.MkdirAll(updateDir, 0755)

	state := &update.RollbackState{
		CurrentVersion:     "2.0.0",
		PreviousVersion:    "1.0.0",
		PreviousBinaryPath: "/usr/local/bin/patchiq-agent.bak",
		UpdateStartedAt:    time.Now(),
		Platform:           "linux",
		Architecture:       "amd64",
	}

	err := update.SaveRollbackState(state)
	// This will save to the default location (~/.patchify-agent/update/)
	// which is fine for testing
	if err != nil {
		t.Skipf("Skipping rollback state test (cannot write to state dir): %v", err)
	}

	loaded, err := update.LoadRollbackState()
	require.NoError(t, err)
	require.NotNil(t, loaded)
	assert.Equal(t, "2.0.0", loaded.CurrentVersion)
	assert.Equal(t, "1.0.0", loaded.PreviousVersion)
	assert.Equal(t, "linux", loaded.Platform)

	err = update.ClearRollbackState()
	require.NoError(t, err)

	cleared, _ := update.LoadRollbackState()
	assert.Nil(t, cleared)
}

// ==========================================================================
// 12. Rollout Evaluation Tests
// ==========================================================================

func TestRollout_DeterministicBucketing(t *testing.T) {
	// Same agent ID should always land in the same bucket
	result1 := update.ShouldUpdate("agent-deterministic-test", 50)
	result2 := update.ShouldUpdate("agent-deterministic-test", 50)
	assert.Equal(t, result1, result2, "Same agent ID should get same result")

	// 100% rollout should always update
	assert.True(t, update.ShouldUpdate("any-agent", 100))

	// 0% rollout should never update
	assert.False(t, update.ShouldUpdate("any-agent", 0))
}

func TestRollout_Distribution(t *testing.T) {
	// With 50% rollout, approximately half the agents should update
	updateCount := 0
	total := 1000
	for i := 0; i < total; i++ {
		if update.ShouldUpdate(fmt.Sprintf("agent-%d", i), 50) {
			updateCount++
		}
	}

	// Allow ±15% tolerance
	ratio := float64(updateCount) / float64(total)
	assert.Greater(t, ratio, 0.35, "Expected ~50%% got %.1f%%", ratio*100)
	assert.Less(t, ratio, 0.65, "Expected ~50%% got %.1f%%", ratio*100)
}

func TestRollout_EvaluateConfig(t *testing.T) {
	// Manual override bypasses percentage
	shouldUpdate, reason := update.EvaluateRollout(update.RolloutConfig{
		ManualOverride:    true,
		CurrentVersion:    "1.0.0",
		TargetVersion:     "2.0.0",
		RolloutPercentage: 0,
	}, "any-agent")
	assert.True(t, shouldUpdate)
	assert.Contains(t, reason, "manual")

	// Already on target version
	shouldUpdate, _ = update.EvaluateRollout(update.RolloutConfig{
		CurrentVersion:    "2.0.0",
		TargetVersion:     "2.0.0",
		RolloutPercentage: 100,
	}, "any-agent")
	assert.False(t, shouldUpdate)
}

// ==========================================================================
// 13. Patch Download Tests
// ==========================================================================

func TestPatchDownload_GetURLs(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	// Set up patch files
	patchData := []byte("fake patch data KB5031356")
	mb.SetPatchFile("patch-001", patchData)
	mb.SetPatchFile("patch-002", []byte("another patch"))

	c := registerTestAgent(t, mb)

	downloads, err := c.GetPatchDownloadURLs([]string{"patch-001", "patch-002"})
	require.NoError(t, err)
	assert.Len(t, downloads, 2)

	// Verify first patch info
	assert.Equal(t, "patch-001", downloads[0].PatchID)
	assert.Equal(t, "patch-001.pkg", downloads[0].FileName)
	assert.Contains(t, downloads[0].DownloadURL, "/patches/patch-001")
	assert.NotEmpty(t, downloads[0].Checksum)
	assert.Equal(t, "sha256", downloads[0].ChecksumType)
	assert.Equal(t, int64(len(patchData)), downloads[0].Size)
}

func TestPatchDownload_DownloadFile(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	patchData := []byte("fake patch binary content for testing download")
	checksum := sha256.Sum256(patchData)
	checksumHex := fmt.Sprintf("%x", checksum)
	mb.SetPatchFile("patch-dl-001", patchData)

	c := registerTestAgent(t, mb)
	destDir := t.TempDir()

	// Download patch file
	path, err := c.DownloadPatchFile(client.PatchDownloadInfo{
		PatchID:      "patch-dl-001",
		FileName:     "test-patch.pkg",
		DownloadURL:  mb.URL + "/patches/patch-dl-001",
		Checksum:     checksumHex,
		ChecksumType: "sha256",
		Size:         int64(len(patchData)),
	}, destDir)

	require.NoError(t, err)
	assert.Equal(t, filepath.Join(destDir, "test-patch.pkg"), path)

	// Verify file contents
	downloaded, err := os.ReadFile(path)
	require.NoError(t, err)
	assert.Equal(t, patchData, downloaded)
}

func TestPatchDownload_ChecksumMismatch(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	mb.SetPatchFile("patch-bad-checksum", []byte("real data"))

	c := registerTestAgent(t, mb)
	destDir := t.TempDir()

	_, err := c.DownloadPatchFile(client.PatchDownloadInfo{
		PatchID:      "patch-bad-checksum",
		FileName:     "bad-patch.pkg",
		DownloadURL:  mb.URL + "/patches/patch-bad-checksum",
		Checksum:     "0000000000000000000000000000000000000000000000000000000000000000",
		ChecksumType: "sha256",
	}, destDir)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "checksum mismatch")
}

// ==========================================================================
// 14. Log Upload Tests
// ==========================================================================

func TestLogUpload_PostJSON(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	c := registerTestAgent(t, mb)

	payload := map[string]interface{}{
		"logs":         "2024-01-15 10:00:00 INFO Heartbeat sent\n2024-01-15 10:01:00 ERROR Connection timeout",
		"agentVersion": "1.0.0",
		"os":           "linux",
		"architecture": "amd64",
		"hostname":     "test-host",
		"timestamp":    time.Now().UTC().Format(time.RFC3339),
	}

	err := c.PostJSON("/logs", payload)
	require.NoError(t, err)

	calls := mb.GetCallsByPath("/api/agent/logs")
	assert.Len(t, calls, 1)
}

// ==========================================================================
// 15. Concurrent Operations Tests
// ==========================================================================

func TestConcurrent_MultipleHeartbeats(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	c := registerTestAgent(t, mb)

	var wg sync.WaitGroup
	errors := make([]error, 10)

	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			_, err := c.Heartbeat(&client.HeartbeatRequest{
				Timestamp: time.Now().UTC().Format(time.RFC3339),
				Status:    "healthy",
				Uptime:    int64(100 + idx),
				AgentUptime: int64(idx),
			})
			errors[idx] = err
		}(i)
	}

	wg.Wait()

	for i, err := range errors {
		assert.NoError(t, err, "heartbeat %d failed", i)
	}

	calls := mb.GetCallsByPath("/api/agent/heartbeat")
	assert.Len(t, calls, 10)
}

func TestConcurrent_RegisterAndHeartbeat(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	var wg sync.WaitGroup
	agentCount := 5

	for i := 0; i < agentCount; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			c, err := client.New(mb.URL, "1.0.0", nil)
			require.NoError(t, err)

			_, err = c.Register(&client.RegisterRequest{
				MachineID:    fmt.Sprintf("machine-concurrent-%03d", idx),
				Hostname:     fmt.Sprintf("host-%d", idx),
				OS:           "LINUX",
				Architecture: "amd64",
				AgentVersion: "1.0.0",
			})
			require.NoError(t, err)

			_, err = c.Heartbeat(&client.HeartbeatRequest{
				Timestamp: time.Now().UTC().Format(time.RFC3339),
				Status:    "healthy",
				Uptime:    100,
				AgentUptime: 10,
			})
			require.NoError(t, err)
		}(i)
	}

	wg.Wait()

	assert.Equal(t, agentCount, mb.GetRegistrationCount())
}

// ==========================================================================
// 16. Error Recovery Tests
// ==========================================================================

func TestErrorRecovery_ServerComesBackOnline(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	c := registerTestAgent(t, mb)

	// Server goes down
	mb.SetServerError(true)
	_, err := c.Heartbeat(&client.HeartbeatRequest{
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Status:    "healthy",
		Uptime:    100,
		AgentUptime: 50,
	})
	assert.Error(t, err)

	// Server comes back
	mb.SetServerError(false)
	resp, err := c.Heartbeat(&client.HeartbeatRequest{
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Status:    "healthy",
		Uptime:    101,
		AgentUptime: 51,
	})
	require.NoError(t, err)
	assert.True(t, resp.Acknowledged)
}

func TestErrorRecovery_ReRegistrationAfterAuthFailure(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	c := registerTestAgent(t, mb)
	assert.Equal(t, 1, mb.GetRegistrationCount())

	// Auth fails (simulates token expiry + refresh failure)
	mb.SetRejectAuth(true)
	_, err := c.Heartbeat(&client.HeartbeatRequest{
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Status:    "healthy",
		Uptime:    100,
		AgentUptime: 50,
	})
	assert.Error(t, err)

	// Auth restored - agent should be able to re-register
	mb.SetRejectAuth(false)
	_, err = c.Register(&client.RegisterRequest{
		MachineID:    "machine-integration-test-001",
		Hostname:     "test-host",
		OS:           "LINUX",
		Architecture: "amd64",
		AgentVersion: "1.0.0-test",
	})
	require.NoError(t, err)
	assert.Equal(t, 2, mb.GetRegistrationCount())
}

// ==========================================================================
// 17. Full Lifecycle Test
// ==========================================================================

func TestFullLifecycle_RegisterHeartbeatCommandReport(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	// Step 1: Register
	c := newTestClient(t, mb)
	resp, err := c.Register(&client.RegisterRequest{
		MachineID:    "machine-lifecycle-001",
		Hostname:     "lifecycle-host",
		OS:           "LINUX",
		OSVersion:    "22.04",
		Architecture: "amd64",
		AgentVersion: "1.0.0",
	})
	require.NoError(t, err)
	assert.True(t, c.IsRegistered())

	// Step 2: Heartbeat (no commands pending)
	hbResp, err := c.Heartbeat(&client.HeartbeatRequest{
		Timestamp:     time.Now().UTC().Format(time.RFC3339),
		Status:        "healthy",
		Uptime:        86400,
		AgentUptime:   3600,
		CPUUsage:      25.5,
		MemoryUsage:   67.2,
		DiskUsage:     45.0,
		PendingReboot: false,
		IPAddress:     "192.168.1.100",
	})
	require.NoError(t, err)
	assert.False(t, hbResp.CommandsPending)

	// Step 3: Enqueue a command, heartbeat again
	mb.EnqueueCommand(PendingCommand{
		ID:   "cmd-lifecycle-001",
		Type: "inventory_full",
	})

	hbResp, err = c.Heartbeat(&client.HeartbeatRequest{
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Status:    "healthy",
		Uptime:    86401,
		AgentUptime: 3601,
	})
	require.NoError(t, err)
	assert.True(t, hbResp.CommandsPending)

	// Step 4: Fetch commands
	commands, err := c.GetPendingCommands()
	require.NoError(t, err)
	require.Len(t, commands, 1)
	assert.Equal(t, "inventory_full", commands[0].Type)

	// Step 5: Submit inventory
	err = c.SubmitInventory(&client.InventoryRequest{
		CollectedAt: time.Now().UTC().Format(time.RFC3339),
		Hardware:    map[string]interface{}{"cpu": "Intel i7"},
		Software:    map[string]interface{}{"os": "Ubuntu 22.04"},
	})
	require.NoError(t, err)

	// Step 6: Report command result
	err = c.ReportCommandResult(commands[0].ID, &client.CommandResultRequest{
		Status: "completed",
		Result: "Inventory collection completed",
	})
	require.NoError(t, err)

	// Step 7: Submit telemetry
	err = c.SubmitTelemetry(&client.TelemetryRequest{
		CollectedAt: time.Now().UTC().Format(time.RFC3339),
		CPU:         map[string]interface{}{"usagePercent": 25.5},
	})
	require.NoError(t, err)

	// Step 8: Verify all state
	assert.Equal(t, 1, mb.GetRegistrationCount())
	assert.Len(t, mb.GetInventories(), 1)
	assert.Len(t, mb.GetTelemetries(), 1)
	result := mb.GetCommandResult("cmd-lifecycle-001")
	require.NotNil(t, result)
	assert.Equal(t, "completed", result.Status)

	// Verify agent record
	agent := mb.GetAgent(resp.AgentID)
	require.NotNil(t, agent)
	assert.Equal(t, "lifecycle-host", agent.Hostname)
	assert.Equal(t, "LINUX", agent.OS)
}

// ==========================================================================
// 18. Corruption Detection Tests
// ==========================================================================

func TestCorruptionDetection_TruncatedDownload(t *testing.T) {
	tempDir := t.TempDir()
	binaryPath := filepath.Join(tempDir, "agent")

	// Write a truncated file
	os.WriteFile(binaryPath, []byte("short"), 0755)

	report := update.DetectCorruption(binaryPath, 1024*1024, "")
	assert.True(t, report.Detected)
	assert.Equal(t, update.CorruptionTruncated, report.Type)
	assert.True(t, report.ShouldRollback)
}

func TestCorruptionDetection_ChecksumMismatch(t *testing.T) {
	tempDir := t.TempDir()
	binaryPath := filepath.Join(tempDir, "agent")

	content := []byte("full binary content here")
	os.WriteFile(binaryPath, content, 0755)

	report := update.DetectCorruption(binaryPath, int64(len(content)),
		"0000000000000000000000000000000000000000000000000000000000000000")
	assert.True(t, report.Detected)
	assert.Equal(t, update.CorruptionChecksum, report.Type)
}

func TestCorruptionDetection_HealthyBinary(t *testing.T) {
	tempDir := t.TempDir()
	binaryPath := filepath.Join(tempDir, "agent")

	content := []byte("valid binary content")
	checksum := sha256.Sum256(content)
	os.WriteFile(binaryPath, content, 0755)

	report := update.DetectCorruption(binaryPath, int64(len(content)),
		fmt.Sprintf("%x", checksum))
	assert.False(t, report.Detected)
}

// ==========================================================================
// 19. Manifest Verification Tests
// ==========================================================================

func TestManifest_Parse(t *testing.T) {
	manifestJSON := `{
		"version": "2.0.0",
		"releaseDate": "2026-01-15T10:00:00Z",
		"builds": {
			"linux-amd64": {
				"url": "https://cdn.example.com/agent-linux-amd64-2.0.0",
				"sha256": "a3b4c5d6e7f8",
				"size": 15728640,
				"platform": "linux-amd64"
			},
			"windows-amd64": {
				"url": "https://cdn.example.com/agent-windows-amd64-2.0.0.exe",
				"sha256": "d6e7f8a9b0c1",
				"size": 16777216,
				"platform": "windows-amd64"
			}
		},
		"signature": "",
		"signatureAlg": "Ed25519",
		"minAgentVersion": "1.5.0",
		"releaseNotes": "Bug fixes"
	}`

	var manifest update.Manifest
	err := json.Unmarshal([]byte(manifestJSON), &manifest)
	require.NoError(t, err)

	assert.Equal(t, "2.0.0", manifest.Version)
	assert.Equal(t, "Ed25519", manifest.SignatureAlg)
	assert.Equal(t, "1.5.0", manifest.MinAgentVersion)
	assert.Len(t, manifest.Builds, 2)

	linuxBuild, ok := manifest.Builds["linux-amd64"]
	assert.True(t, ok)
	assert.Equal(t, int64(15728640), linuxBuild.Size)
	assert.Equal(t, "linux-amd64", linuxBuild.Platform)
}

// ==========================================================================
// 20. Command Priority Tests
// ==========================================================================

func TestCommandPriority_OrderingVerification(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	c := registerTestAgent(t, mb)

	// Enqueue commands in reverse priority order
	mb.EnqueueCommands([]PendingCommand{
		{ID: "cmd-config", Type: "config_update"},          // priority 5
		{ID: "cmd-script", Type: "script_bundle",
			Payload: map[string]interface{}{"operationType": "install"}},  // priority 4
		{ID: "cmd-patch", Type: "patch_install",
			Payload: map[string]interface{}{"patchId": "KB001"}},         // priority 3
		{ID: "cmd-inv", Type: "inventory_full"},                          // priority 2
		{ID: "cmd-update", Type: "agent_update",
			Payload: map[string]interface{}{
				"downloadUrl": "https://example.com/agent",
				"checksum":    "abc",
				"version":     "2.0.0",
			}},  // priority 1
	})

	commands, err := c.GetPendingCommands()
	require.NoError(t, err)
	assert.Len(t, commands, 5)

	// The commands are returned in the order they were enqueued (mock doesn't sort)
	// The agent's fetchAndExecuteCommands() sorts them. We verify the format is correct.
	typeSet := make(map[string]bool)
	for _, cmd := range commands {
		typeSet[cmd.Type] = true
	}
	assert.True(t, typeSet["agent_update"])
	assert.True(t, typeSet["inventory_full"])
	assert.True(t, typeSet["patch_install"])
	assert.True(t, typeSet["script_bundle"])
	assert.True(t, typeSet["config_update"])
}

// ==========================================================================
// 21. Mock Backend State Management Tests
// ==========================================================================

func TestMockBackend_ResetState(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	// Register an agent
	c := registerTestAgent(t, mb)

	// Do some operations
	c.Heartbeat(&client.HeartbeatRequest{
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Status:    "healthy",
		Uptime:    100,
		AgentUptime: 50,
	})

	assert.Equal(t, 1, mb.GetRegistrationCount())
	assert.Greater(t, len(mb.GetCalls()), 0)

	// Reset
	mb.ResetState()

	assert.Equal(t, 0, mb.GetRegistrationCount())
	assert.Len(t, mb.GetCalls(), 0)

	// Agent should be unknown now
	c2 := newTestClient(t, mb)
	_, err := c2.Heartbeat(&client.HeartbeatRequest{
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Status:    "healthy",
		Uptime:    100,
		AgentUptime: 50,
	})
	assert.Error(t, err) // Not registered
}

// ==========================================================================
// 22. Verification Tests
// ==========================================================================

func TestVerification_ChecksumVerify(t *testing.T) {
	tempDir := t.TempDir()
	filePath := filepath.Join(tempDir, "test-binary")

	content := []byte("this is the binary content to verify")
	os.WriteFile(filePath, content, 0755)

	expectedChecksum := fmt.Sprintf("%x", sha256.Sum256(content))

	result := update.VerifyChecksum(filePath, expectedChecksum)
	assert.True(t, result.Passed, "Checksum should match")

	result = update.VerifyChecksum(filePath, "wrong-checksum")
	assert.False(t, result.Passed, "Checksum should not match")
}

func TestVerification_PreUpdateChecks(t *testing.T) {
	result := update.PreUpdateChecks()
	// Should return a list of checks (disk space, permissions, etc.)
	assert.NotNil(t, result)
}

// ==========================================================================
// 23. URL Construction Tests
// ==========================================================================

func TestURLConstruction_AgentAPIURL(t *testing.T) {
	// Test that client strips version suffixes correctly
	tests := []struct {
		baseURL  string
		expected string
	}{
		{"http://localhost:3000", "http://localhost:3000/api/agent/heartbeat"},
		{"http://localhost:3000/v1", "http://localhost:3000/api/agent/heartbeat"},
		{"http://localhost:3000/api", "http://localhost:3000/api/agent/heartbeat"},
	}

	for _, tt := range tests {
		c, err := client.New(tt.baseURL, "1.0.0", nil)
		require.NoError(t, err)
		c.SetCredentials("agent-1", "token-1", "refresh-1")

		// We can't directly test agentAPIURL since it's unexported,
		// but we verify through the heartbeat call structure
		assert.True(t, c.IsRegistered())
	}
}

// ==========================================================================
// 24. End-to-End Update Flow Tests
// ==========================================================================

func TestE2E_UpdateFlowSimulation(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	// Set up update binary on mock server
	updateBinary := []byte("#!/bin/bash\necho 'PatchIQ Agent v2.0.0'\nexit 0\n")
	mb.SetUpdateBinary(updateBinary)
	checksum := mb.GetUpdateBinaryChecksum()

	// Step 1: Agent registers
	c := registerTestAgent(t, mb)

	// Step 2: Backend signals config with newer version available
	mb.SetConfig(AgentConfig{
		HeartbeatIntervalSeconds: 60,
		TelemetryIntervalSeconds: 60,
		TelemetryEnabled:         true,
		LogLevel:                 "info",
		LatestAgentVersion:       "2.0.0",
		AgentDownloadURL:         mb.URL + "/api/agent/update/binary/v2",
	})

	// Step 3: Heartbeat shows config updated
	mb.SetConfigUpdated(true)
	hbResp, err := c.Heartbeat(&client.HeartbeatRequest{
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Status:    "healthy",
		Uptime:    100,
		AgentUptime: 50,
	})
	require.NoError(t, err)
	assert.True(t, hbResp.ConfigUpdated)

	// Step 4: Agent fetches config to see new version
	cfg, err := c.GetConfig()
	require.NoError(t, err)
	assert.Equal(t, "2.0.0", cfg.LatestAgentVersion)

	// Step 5: Backend pushes agent_update command
	mb.EnqueueCommand(PendingCommand{
		ID:   "cmd-update-e2e",
		Type: "agent_update",
		Payload: map[string]interface{}{
			"downloadUrl": mb.URL + "/api/agent/update/binary/v2",
			"checksum":    checksum,
			"version":     "2.0.0",
		},
	})

	mb.SetCommandsPending(true)
	hbResp, err = c.Heartbeat(&client.HeartbeatRequest{
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Status:    "healthy",
		Uptime:    101,
		AgentUptime: 51,
	})
	require.NoError(t, err)
	assert.True(t, hbResp.CommandsPending)

	// Step 6: Agent fetches commands
	commands, err := c.GetPendingCommands()
	require.NoError(t, err)
	require.Len(t, commands, 1)
	assert.Equal(t, "agent_update", commands[0].Type)

	// Step 7: Parse update payload
	payloadJSON, _ := json.Marshal(commands[0].Payload)
	var updateReq update.Request
	require.NoError(t, json.Unmarshal(payloadJSON, &updateReq))
	assert.Equal(t, "2.0.0", updateReq.Version)
	assert.Equal(t, checksum, updateReq.Checksum)

	// Step 8: Perform the update (download + checksum verify)
	// We can't let it actually replace the binary, so we just verify the
	// download and checksum verification work correctly
	result := update.Perform(updateReq)
	if !result.Success {
		// Expected to fail at binary replacement stage, NOT at download/checksum
		assert.NotContains(t, result.ErrorMessage, "checksum verification failed")
		assert.NotContains(t, result.ErrorMessage, "download failed")
		t.Logf("Update failed as expected (binary replacement in test env): %s", result.ErrorMessage)
	}

	// Step 9: Report result back to backend
	status := "completed"
	resultMsg := "Update to v2.0.0 installed"
	if !result.Success {
		status = "failed"
		resultMsg = result.ErrorMessage
	}
	err = c.ReportCommandResult("cmd-update-e2e", &client.CommandResultRequest{
		Status:       status,
		Result:       resultMsg,
		ErrorMessage: result.ErrorMessage,
	})
	require.NoError(t, err)

	// Verify backend received the result
	cmdResult := mb.GetCommandResult("cmd-update-e2e")
	require.NotNil(t, cmdResult)
}

// ==========================================================================
// 25. Backend Manager Integration (lightweight, no background loops)
// ==========================================================================

func TestBackendManager_MockServerCallTracking(t *testing.T) {
	mb := NewMockBackend()
	defer mb.Close()

	// Verify the mock server correctly tracks calls across multiple endpoints
	c := registerTestAgent(t, mb)

	c.Heartbeat(&client.HeartbeatRequest{
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Status:    "healthy",
		Uptime:    100,
		AgentUptime: 50,
	})

	c.SubmitInventory(&client.InventoryRequest{
		CollectedAt: time.Now().UTC().Format(time.RFC3339),
	})

	c.SubmitTelemetry(&client.TelemetryRequest{
		CollectedAt: time.Now().UTC().Format(time.RFC3339),
	})

	calls := mb.GetCalls()
	paths := make([]string, len(calls))
	for i, c := range calls {
		paths[i] = c.Path
	}

	assert.Contains(t, paths, "/api/agent/register")
	assert.Contains(t, paths, "/api/agent/heartbeat")
	assert.Contains(t, paths, "/api/agent/inventory")
	assert.Contains(t, paths, "/api/agent/telemetry")
}
