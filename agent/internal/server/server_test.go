package server

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/patchify/agent/internal/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
)

// mockBackendStatus implements BackendStatus for testing
type mockBackendStatus struct {
	registered bool
	agentID    string
}

func (m *mockBackendStatus) IsRegistered() bool {
	return m.registered
}

func (m *mockBackendStatus) GetAgentID() string {
	return m.agentID
}

func (m *mockBackendStatus) GetStatus(ctx context.Context) *BackendStatusInfo {
	return &BackendStatusInfo{
		Registered:        m.registered,
		AgentID:           m.agentID,
		ServerURL:         "http://test-server",
		LastHeartbeat:     time.Time{},
		ConsecutiveErrors: 0,
	}
}

func (m *mockBackendStatus) GetJobsStatus() *JobsStatus {
	return &JobsStatus{
		ActiveJobs: []JobHistoryEntry{},
		JobHistory: []JobHistoryEntry{},
	}
}

func (m *mockBackendStatus) GetRollbacks(ctx context.Context) ([]RollbackInfo, error) {
	return []RollbackInfo{}, nil
}

func (m *mockBackendStatus) ExecuteRollback(ctx context.Context, rollbackID string, force bool) ExecutionResult {
	return ExecutionResult{Success: false, ErrorMessage: "not implemented in mock"}
}

func (m *mockBackendStatus) GetDownloadProgress() map[string]*DownloadProgress {
	return map[string]*DownloadProgress{}
}

func TestHandleHealthPublicEndpoint(t *testing.T) {
	t.Parallel()

	// Create server via New() - this will use embedded templates
	cfg := config.DefaultConfig()
	cfg.ServerURL = "http://localhost:8080"
	cfg.TelemetryInterval = 60

	srv, err := New(cfg)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()

	srv.handleHealth(w, req)

	resp := w.Result()
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Equal(t, "application/json", resp.Header.Get("Content-Type"))

	var body map[string]interface{}
	err = json.NewDecoder(resp.Body).Decode(&body)
	require.NoError(t, err)

	assert.Equal(t, true, body["healthy"])
	assert.Equal(t, "healthy", body["status"])
}

func TestHandleHealthWithBackendMgr(t *testing.T) {
	t.Parallel()

	cfg := config.DefaultConfig()
	cfg.TelemetryInterval = 60

	srv, err := New(cfg)
	require.NoError(t, err)

	mock := &mockBackendStatus{registered: true, agentID: "test-agent-id"}
	srv.SetBackendManager(mock)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()

	srv.handleHealth(w, req)

	resp := w.Result()
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var body map[string]interface{}
	err = json.NewDecoder(resp.Body).Decode(&body)
	require.NoError(t, err)

	assert.Equal(t, true, body["healthy"])
	backend, ok := body["backend"].(map[string]interface{})
	require.True(t, ok)
	assert.Equal(t, true, backend["registered"])
}

func TestHandleGetStatusNoBackend(t *testing.T) {
	t.Parallel()

	cfg := config.DefaultConfig()
	cfg.TelemetryInterval = 60

	srv, err := New(cfg)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodGet, "/api/status", nil)
	w := httptest.NewRecorder()

	srv.handleGetStatus(w, req)

	resp := w.Result()
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var body map[string]interface{}
	err = json.NewDecoder(resp.Body).Decode(&body)
	require.NoError(t, err)
	assert.NotNil(t, body["agent"])
}

func TestHandleGetStatusWithBackend(t *testing.T) {
	t.Parallel()

	cfg := config.DefaultConfig()
	cfg.TelemetryInterval = 60

	srv, err := New(cfg)
	require.NoError(t, err)

	mock := &mockBackendStatus{registered: true, agentID: "agent-123"}
	srv.SetBackendManager(mock)

	req := httptest.NewRequest(http.MethodGet, "/api/status", nil)
	w := httptest.NewRecorder()

	srv.handleGetStatus(w, req)

	resp := w.Result()
	assert.Equal(t, http.StatusOK, resp.StatusCode)
}

func TestHandleGetJobsNoBackend(t *testing.T) {
	t.Parallel()

	cfg := config.DefaultConfig()
	cfg.TelemetryInterval = 60

	srv, err := New(cfg)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodGet, "/api/jobs", nil)
	w := httptest.NewRecorder()

	srv.handleGetJobs(w, req)

	resp := w.Result()
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var body map[string]interface{}
	err = json.NewDecoder(resp.Body).Decode(&body)
	require.NoError(t, err)
	// Should return empty job lists
	assert.NotNil(t, body["activeJobs"])
}

func TestHandleGetJobsWithBackend(t *testing.T) {
	t.Parallel()

	cfg := config.DefaultConfig()
	cfg.TelemetryInterval = 60

	srv, err := New(cfg)
	require.NoError(t, err)

	mock := &mockBackendStatus{}
	srv.SetBackendManager(mock)

	req := httptest.NewRequest(http.MethodGet, "/api/jobs", nil)
	w := httptest.NewRecorder()

	srv.handleGetJobs(w, req)

	resp := w.Result()
	assert.Equal(t, http.StatusOK, resp.StatusCode)
}

func TestBasicAuthMiddlewareDisabled(t *testing.T) {
	t.Parallel()

	cfg := config.DefaultConfig()
	cfg.EnableWebUIAuth = false
	cfg.TelemetryInterval = 60

	srv, err := New(cfg)
	require.NoError(t, err)

	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	handler := srv.basicAuthMiddleware(inner)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestBasicAuthMiddlewareEnabled(t *testing.T) {
	t.Parallel()

	hash, err := bcrypt.GenerateFromPassword([]byte("testpass"), bcrypt.MinCost)
	require.NoError(t, err)

	cfg := config.DefaultConfig()
	cfg.EnableWebUIAuth = true
	cfg.WebUIUsername = "admin"
	cfg.WebUIPasswordHash = string(hash)
	cfg.TelemetryInterval = 60

	srv, err := New(cfg)
	require.NoError(t, err)

	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	handler := srv.basicAuthMiddleware(inner)

	t.Run("no credentials", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, req)
		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("wrong password", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.SetBasicAuth("admin", "wrongpass")
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, req)
		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("correct credentials", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.SetBasicAuth("admin", "testpass")
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, req)
		assert.Equal(t, http.StatusOK, w.Code)
	})
}

func TestSetBackendManager(t *testing.T) {
	t.Parallel()

	cfg := config.DefaultConfig()
	cfg.TelemetryInterval = 60

	srv, err := New(cfg)
	require.NoError(t, err)

	assert.Nil(t, srv.backendMgr)

	mock := &mockBackendStatus{registered: false}
	srv.SetBackendManager(mock)

	assert.NotNil(t, srv.backendMgr)
}
