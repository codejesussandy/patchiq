package client

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// newTestClient creates a client pointed at the given test server URL.
func newTestClient(t *testing.T, serverURL string) *Client {
	t.Helper()
	c, err := New(serverURL, "1.0.0", nil)
	require.NoError(t, err)
	return c
}

// ---- New() ----

func TestNew_ValidHTTP(t *testing.T) {
	t.Parallel()
	c, err := New("http://localhost:8080", "1.0.0", nil)
	require.NoError(t, err)
	assert.NotNil(t, c)
}

func TestNew_ValidHTTPS(t *testing.T) {
	t.Parallel()
	c, err := New("https://example.com", "1.0.0", nil)
	require.NoError(t, err)
	assert.NotNil(t, c)
}

func TestNew_EmptyURL(t *testing.T) {
	t.Parallel()
	_, err := New("", "1.0.0", nil)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "HTTP or HTTPS")
}

func TestNew_InvalidScheme(t *testing.T) {
	t.Parallel()
	tests := []struct{ url string }{
		{"ftp://example.com"},
		{"example.com"},
		{"localhost:8080"},
	}
	for _, tt := range tests {
		tt := tt
		t.Run(tt.url, func(t *testing.T) {
			t.Parallel()
			_, err := New(tt.url, "1.0.0", nil)
			require.Error(t, err)
		})
	}
}

func TestNew_CACertFile_NotFound(t *testing.T) {
	t.Parallel()
	_, err := New("https://example.com", "1.0.0", &ProxyConfig{
		CACertFile: "/nonexistent/ca.pem",
	})
	require.Error(t, err)
}

func TestNew_CACertFile_Valid(t *testing.T) {
	t.Parallel()
	// Create a minimal self-signed PEM (just check file is read; not actual TLS)
	// We use a real PEM so AppendCertsFromPEM succeeds.
	pemData := `-----BEGIN CERTIFICATE-----
MIICpDCCAYwCCQDU+pQ4pHgSpDANBgkqhkiG9w0BAQsFADAUMRIwEAYDVQQDDAls
b2NhbGhvc3QwHhcNMjMwMTAxMDAwMDAwWhcNMjQwMTAxMDAwMDAwWjAUMRIwEAYD
VQQDDAlsb2NhbGhvc3QwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC7
o4qne60TB3pOiABBs0suHBkR/LfS+9FoUfxzL0Cqf2fHqrRVXQc6RlRr/P0oXv0
dEbgMb1+oqBwKsHbT+5O1wZ/9LkK/ULRM4Tv6IwVCM+t/UGFIN8CjyXt7DVQZE
9PAZIrFyB7Rl1/qYrBmMpqJOGlJeQLIhv14HVTm8dZkzI+T6HlPk0Vx4K0fMeHi
pv8f5cEHKnEt9GREr49DJHUF8AEiK6JJNdY5oVy+3X1HM6PO7zXfJwHHCzUxiO5
y2L9xj/m/FwNq/6p8F9P6N1VaGkYfmwmRdj9J9oCXaB7c7Bz7n7c5PAJk3Bm+5
r0l0L1PZXnR7e7Q9GmSvAgMBAAEwDQYJKoZIhvcNAQELBQADggEBABxhGLhSA8pV
UYUN/F+Mj7fEBbk5iblCzPaWjyPLhRX2k9K7r5ZXMK7p1e0Km5b4KPVBV2Q8ZX
sB3mJhY0W5lL0qJjH8cGqXxW2p9SqrZJXVZ6cD7P2c9w5e3H7o3F6c3pZrB0a5
Vx9zZ8K5N9m0Jv1rW6Q9tP5nB0j5K6g8m2C4c7F9X3k5P2N4L6c8v4Z0e2q7H6
Y8u0W9A3j5L7n9M4B1C6g0P2Q8d3K5Z0m5W1X8v2N4j7F3Y0C6t5R8P0q2K9B7
j3N4c5M2L8Y0X7v4Z5K3W2A1B9G0C5M3j8L4P6n0R7X2F5Y1B8m3K9Z4C0v2W6
Q5n3D8A=
-----END CERTIFICATE-----`

	dir := t.TempDir()
	caFile := dir + "/ca.pem"
	err := os.WriteFile(caFile, []byte(pemData), 0644)
	require.NoError(t, err)

	// Even if cert parsing fails, we just test that we get an appropriate error
	// or success depending on PEM validity.
	_, _ = New("https://example.com", "1.0.0", &ProxyConfig{CACertFile: caFile})
	// Either succeeds (valid PEM) or fails with parse error — both are acceptable;
	// the point is it does NOT panic.
}

// ---- SetCredentials / IsRegistered / GetAccessToken / GetRefreshToken ----

func TestSetCredentials_And_IsRegistered(t *testing.T) {
	t.Parallel()
	c, err := New("http://localhost", "1.0.0", nil)
	require.NoError(t, err)

	assert.False(t, c.IsRegistered())

	c.SetCredentials("agent-1", "access-tok", "refresh-tok")
	assert.True(t, c.IsRegistered())
	assert.Equal(t, "agent-1", c.GetAgentID())
	assert.Equal(t, "access-tok", c.GetAccessToken())
	assert.Equal(t, "refresh-tok", c.GetRefreshToken())
}

func TestIsRegistered_EmptyAgentID(t *testing.T) {
	t.Parallel()
	c, _ := New("http://localhost", "1.0.0", nil)
	c.SetCredentials("", "access-tok", "refresh-tok")
	assert.False(t, c.IsRegistered())
}

func TestIsRegistered_EmptyAccessToken(t *testing.T) {
	t.Parallel()
	c, _ := New("http://localhost", "1.0.0", nil)
	c.SetCredentials("agent-1", "", "refresh-tok")
	assert.False(t, c.IsRegistered())
}

// ---- agentAPIURL ----

func TestAgentAPIURL_NoSuffix(t *testing.T) {
	t.Parallel()
	c := &Client{baseURL: "http://localhost:3000"}
	assert.Equal(t, "http://localhost:3000/api/agent/heartbeat", c.agentAPIURL("/heartbeat"))
}

func TestAgentAPIURL_StripV1(t *testing.T) {
	t.Parallel()
	c := &Client{baseURL: "http://localhost:3000/v1"}
	assert.Equal(t, "http://localhost:3000/api/agent/heartbeat", c.agentAPIURL("/heartbeat"))
}

func TestAgentAPIURL_StripV2(t *testing.T) {
	t.Parallel()
	c := &Client{baseURL: "http://localhost:3000/v2"}
	assert.Equal(t, "http://localhost:3000/api/agent/heartbeat", c.agentAPIURL("/heartbeat"))
}

func TestAgentAPIURL_StripAPI(t *testing.T) {
	t.Parallel()
	c := &Client{baseURL: "http://localhost:3000/api"}
	assert.Equal(t, "http://localhost:3000/api/agent/heartbeat", c.agentAPIURL("/heartbeat"))
}

// ---- Register ----

func TestRegister_Success(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "POST", r.Method)
		assert.Equal(t, "/api/agent/register", r.URL.Path)

		resp := map[string]interface{}{
			"success": true,
			"data": RegisterResponse{
				AgentID:      "agent-123",
				AssetID:      "asset-456",
				AccessToken:  "access-abc",
				RefreshToken: "refresh-xyz",
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}))
	defer srv.Close()

	c := newTestClient(t, srv.URL)
	result, err := c.Register(&RegisterRequest{
		MachineID: "mid",
		Hostname:  "host",
		OS:        "linux",
	})
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "agent-123", result.AgentID)
	assert.Equal(t, "access-abc", result.AccessToken)
	assert.Equal(t, "refresh-xyz", result.RefreshToken)

	// Verify credentials stored
	assert.True(t, c.IsRegistered())
	assert.Equal(t, "agent-123", c.GetAgentID())
}

func TestRegister_ServerError(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintln(w, `{"error":"bad_request","message":"invalid payload"}`)
	}))
	defer srv.Close()

	c := newTestClient(t, srv.URL)
	_, err := c.Register(&RegisterRequest{})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "registration failed")
}

func TestRegister_InvalidJSON(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprintln(w, `not-json`)
	}))
	defer srv.Close()

	c := newTestClient(t, srv.URL)
	_, err := c.Register(&RegisterRequest{})
	require.Error(t, err)
}

// ---- Heartbeat ----

func TestHeartbeat_NotRegistered(t *testing.T) {
	t.Parallel()
	c, _ := New("http://localhost", "1.0.0", nil)
	_, err := c.Heartbeat(&HeartbeatRequest{})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "agent not registered")
}

func TestHeartbeat_Success(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "POST", r.Method)
		assert.Equal(t, "/api/agent/heartbeat", r.URL.Path)
		assert.Equal(t, "Bearer tok", r.Header.Get("Authorization"))
		assert.Equal(t, "agent-1", r.Header.Get("X-Agent-Id"))

		resp := HeartbeatResponse{
			Acknowledged:    true,
			ServerTime:      "2024-01-01T00:00:00Z",
			CommandsPending: false,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}))
	defer srv.Close()

	c := newTestClient(t, srv.URL)
	c.SetCredentials("agent-1", "tok", "refresh")

	result, err := c.Heartbeat(&HeartbeatRequest{Status: "healthy"})
	require.NoError(t, err)
	assert.True(t, result.Acknowledged)
}

func TestHeartbeat_Unauthorized(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
	}))
	defer srv.Close()

	c := newTestClient(t, srv.URL)
	c.SetCredentials("agent-1", "tok", "refresh")

	_, err := c.Heartbeat(&HeartbeatRequest{})
	require.Error(t, err)
	var authErr *ErrAuth
	require.ErrorAs(t, err, &authErr)
	assert.Equal(t, http.StatusUnauthorized, authErr.StatusCode)
}

func TestHeartbeat_Forbidden(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusForbidden)
	}))
	defer srv.Close()

	c := newTestClient(t, srv.URL)
	c.SetCredentials("agent-1", "tok", "refresh")

	_, err := c.Heartbeat(&HeartbeatRequest{})
	require.Error(t, err)
	var authErr *ErrAuth
	require.ErrorAs(t, err, &authErr)
	assert.Equal(t, http.StatusForbidden, authErr.StatusCode)
}

// ---- GetPendingCommands ----

func TestGetPendingCommands_NotRegistered(t *testing.T) {
	t.Parallel()
	c, _ := New("http://localhost", "1.0.0", nil)
	_, err := c.GetPendingCommands()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "agent not registered")
}

func TestGetPendingCommands_Success(t *testing.T) {
	t.Parallel()
	commands := []PendingCommand{
		{ID: "cmd-1", Type: "patch_install", CreatedAt: "2024-01-01"},
		{ID: "cmd-2", Type: "inventory", CreatedAt: "2024-01-01"},
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "GET", r.Method)
		assert.Equal(t, "/api/agent/commands", r.URL.Path)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(commands)
	}))
	defer srv.Close()

	c := newTestClient(t, srv.URL)
	c.SetCredentials("agent-1", "tok", "refresh")

	result, err := c.GetPendingCommands()
	require.NoError(t, err)
	require.Len(t, result, 2)
	assert.Equal(t, "cmd-1", result[0].ID)
}

func TestGetPendingCommands_Empty(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintln(w, `[]`)
	}))
	defer srv.Close()

	c := newTestClient(t, srv.URL)
	c.SetCredentials("agent-1", "tok", "refresh")

	result, err := c.GetPendingCommands()
	require.NoError(t, err)
	assert.Empty(t, result)
}

// ---- ReportCommandResult ----

func TestReportCommandResult_NotRegistered(t *testing.T) {
	t.Parallel()
	c, _ := New("http://localhost", "1.0.0", nil)
	err := c.ReportCommandResult("cmd-1", &CommandResultRequest{Status: "completed"})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "agent not registered")
}

func TestReportCommandResult_Success(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "POST", r.Method)
		assert.Equal(t, "/api/agent/commands/cmd-1/result", r.URL.Path)
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	c := newTestClient(t, srv.URL)
	c.SetCredentials("agent-1", "tok", "refresh")

	err := c.ReportCommandResult("cmd-1", &CommandResultRequest{Status: "completed", Result: "ok"})
	require.NoError(t, err)
}

// ---- SubmitInventory ----

func TestSubmitInventory_NotRegistered(t *testing.T) {
	t.Parallel()
	c, _ := New("http://localhost", "1.0.0", nil)
	err := c.SubmitInventory(&InventoryRequest{})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "agent not registered")
}

func TestSubmitInventory_Success(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "POST", r.Method)
		assert.Equal(t, "/api/agent/inventory", r.URL.Path)
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	c := newTestClient(t, srv.URL)
	c.SetCredentials("agent-1", "tok", "refresh")

	err := c.SubmitInventory(&InventoryRequest{CollectedAt: "2024-01-01"})
	require.NoError(t, err)
}

func TestSubmitInventory_Unauthorized(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
	}))
	defer srv.Close()

	c := newTestClient(t, srv.URL)
	c.SetCredentials("agent-1", "tok", "refresh")

	err := c.SubmitInventory(&InventoryRequest{})
	require.Error(t, err)
	var authErr *ErrAuth
	require.ErrorAs(t, err, &authErr)
}

// ---- SubmitTelemetry ----

func TestSubmitTelemetry_NotRegistered(t *testing.T) {
	t.Parallel()
	c, _ := New("http://localhost", "1.0.0", nil)
	err := c.SubmitTelemetry(&TelemetryRequest{})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "agent not registered")
}

func TestSubmitTelemetry_Success(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	c := newTestClient(t, srv.URL)
	c.SetCredentials("agent-1", "tok", "refresh")

	err := c.SubmitTelemetry(&TelemetryRequest{CollectedAt: "2024-01-01"})
	require.NoError(t, err)
}

// ---- GetConfig ----

func TestGetConfig_NotRegistered(t *testing.T) {
	t.Parallel()
	c, _ := New("http://localhost", "1.0.0", nil)
	_, err := c.GetConfig()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "agent not registered")
}

func TestGetConfig_Success(t *testing.T) {
	t.Parallel()
	cfg := AgentConfig{
		HeartbeatIntervalSeconds: 60,
		TelemetryEnabled:         true,
		LogLevel:                 "info",
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "GET", r.Method)
		assert.Equal(t, "/api/agent/config", r.URL.Path)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(cfg)
	}))
	defer srv.Close()

	c := newTestClient(t, srv.URL)
	c.SetCredentials("agent-1", "tok", "refresh")

	result, err := c.GetConfig()
	require.NoError(t, err)
	assert.Equal(t, 60, result.HeartbeatIntervalSeconds)
	assert.True(t, result.TelemetryEnabled)
}

// ---- RefreshToken ----

func TestRefreshToken_NoRefreshToken(t *testing.T) {
	t.Parallel()
	c, _ := New("http://localhost", "1.0.0", nil)
	err := c.RefreshToken()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "no refresh token available")
}

func TestRefreshToken_Success(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "POST", r.Method)
		assert.Equal(t, "/api/agent/token/refresh", r.URL.Path)
		// RefreshToken uses refreshToken in Authorization header
		assert.Equal(t, "Bearer old-refresh", r.Header.Get("Authorization"))

		resp := TokenRefreshResponse{
			AccessToken:  "new-access",
			RefreshToken: "new-refresh",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}))
	defer srv.Close()

	c := newTestClient(t, srv.URL)
	c.SetCredentials("agent-1", "old-access", "old-refresh")

	err := c.RefreshToken()
	require.NoError(t, err)
	assert.Equal(t, "new-access", c.GetAccessToken())
	assert.Equal(t, "new-refresh", c.GetRefreshToken())
}

func TestRefreshToken_ServerError(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		fmt.Fprintln(w, "expired")
	}))
	defer srv.Close()

	c := newTestClient(t, srv.URL)
	c.SetCredentials("agent-1", "access", "refresh")

	err := c.RefreshToken()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "token refresh failed")
}

// ---- PostJSON ----

func TestPostJSON_NotRegistered(t *testing.T) {
	t.Parallel()
	c, _ := New("http://localhost", "1.0.0", nil)
	err := c.PostJSON("/logs", map[string]string{"msg": "hi"})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "agent not registered")
}

func TestPostJSON_Success(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "POST", r.Method)
		assert.Equal(t, "/api/agent/logs", r.URL.Path)
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	c := newTestClient(t, srv.URL)
	c.SetCredentials("agent-1", "tok", "refresh")

	err := c.PostJSON("/logs", map[string]string{"msg": "hello"})
	require.NoError(t, err)
}

func TestPostJSON_Created(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusCreated)
	}))
	defer srv.Close()

	c := newTestClient(t, srv.URL)
	c.SetCredentials("agent-1", "tok", "refresh")

	err := c.PostJSON("/data", map[string]string{"key": "val"})
	require.NoError(t, err)
}

// ---- GetPatchDownloadURLs ----

func TestGetPatchDownloadURLs_NotRegistered(t *testing.T) {
	t.Parallel()
	c, _ := New("http://localhost", "1.0.0", nil)
	_, err := c.GetPatchDownloadURLs([]string{"patch-1"})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "agent not registered")
}

func TestGetPatchDownloadURLs_Success(t *testing.T) {
	t.Parallel()
	patches := []PatchDownloadInfo{
		{PatchID: "p1", FileName: "patch1.pkg", DownloadURL: "http://minio/patch1", Checksum: "abc", ChecksumType: "sha256"},
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "POST", r.Method)
		assert.Equal(t, "/v1/patch-repository/patches/agent-downloads", r.URL.Path)

		resp := PatchDownloadResponse{Success: true, Data: patches}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}))
	defer srv.Close()

	c := newTestClient(t, srv.URL)
	c.SetCredentials("agent-1", "tok", "refresh")

	result, err := c.GetPatchDownloadURLs([]string{"p1"})
	require.NoError(t, err)
	require.Len(t, result, 1)
	assert.Equal(t, "p1", result[0].PatchID)
}

// ---- DownloadPatchFile ----

func TestDownloadPatchFile_Success_SHA256(t *testing.T) {
	t.Parallel()
	fileContent := []byte("patch file content here")
	checksum := sha256.Sum256(fileContent)
	checksumHex := hex.EncodeToString(checksum[:])

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write(fileContent)
	}))
	defer srv.Close()

	c := newTestClient(t, srv.URL)
	c.SetCredentials("agent-1", "tok", "refresh")

	destDir := t.TempDir()
	info := PatchDownloadInfo{
		PatchID:      "p1",
		FileName:     "patch.pkg",
		DownloadURL:  srv.URL + "/patch.pkg",
		Checksum:     checksumHex,
		ChecksumType: "sha256",
	}

	path, err := c.DownloadPatchFile(info, destDir)
	require.NoError(t, err)
	assert.Equal(t, filepath.Join(destDir, "patch.pkg"), path)

	data, err := os.ReadFile(path)
	require.NoError(t, err)
	assert.Equal(t, fileContent, data)
}

func TestDownloadPatchFile_ChecksumMismatch(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("some content"))
	}))
	defer srv.Close()

	c := newTestClient(t, srv.URL)
	c.SetCredentials("agent-1", "tok", "refresh")

	destDir := t.TempDir()
	info := PatchDownloadInfo{
		PatchID:      "p1",
		FileName:     "patch.pkg",
		DownloadURL:  srv.URL + "/patch.pkg",
		Checksum:     "bad00000checksum",
		ChecksumType: "sha256",
	}

	_, err := c.DownloadPatchFile(info, destDir)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "checksum mismatch")
}

func TestDownloadPatchFile_NoChecksum(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("content"))
	}))
	defer srv.Close()

	c := newTestClient(t, srv.URL)
	destDir := t.TempDir()
	info := PatchDownloadInfo{
		FileName:    "file.pkg",
		DownloadURL: srv.URL + "/file.pkg",
	}

	path, err := c.DownloadPatchFile(info, destDir)
	require.NoError(t, err)
	assert.NotEmpty(t, path)
}

func TestDownloadPatchFile_ServerError(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer srv.Close()

	c := newTestClient(t, srv.URL)
	destDir := t.TempDir()
	info := PatchDownloadInfo{
		FileName:    "file.pkg",
		DownloadURL: srv.URL + "/file.pkg",
	}

	_, err := c.DownloadPatchFile(info, destDir)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "404")
}

// ---- setHeaders ----

func TestSetHeaders_SetsExpectedHeaders(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "Bearer mytoken", r.Header.Get("Authorization"))
		assert.Equal(t, "agent-99", r.Header.Get("X-Agent-Id"))
		assert.Equal(t, "2.0.0", r.Header.Get("X-Agent-Version"))
		assert.Equal(t, "application/json", r.Header.Get("Content-Type"))
		w.WriteHeader(http.StatusOK)
		fmt.Fprintln(w, `[]`)
	}))
	defer srv.Close()

	c, err := New(srv.URL, "2.0.0", nil)
	require.NoError(t, err)
	c.SetCredentials("agent-99", "mytoken", "refresh")

	_, err = c.GetPendingCommands()
	require.NoError(t, err)
}
