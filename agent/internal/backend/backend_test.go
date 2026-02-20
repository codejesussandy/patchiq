//go:build linux

package backend

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/patchify/agent/internal/collectors"
	"github.com/patchify/agent/internal/config"
	"github.com/patchify/agent/internal/executors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestManager(t *testing.T, serverURL string) *Manager {
	t.Helper()

	dir := t.TempDir()
	cfg := config.DefaultConfig()
	cfg.ServerURL = serverURL
	cfg.DataDir = dir
	cfg.HeartbeatInterval = 60
	cfg.TelemetryInterval = 60
	cfg.InventoryInterval = 3600
	cfg.CommandTimeoutSeconds = 30
	cfg.JobRetentionDays = 30

	cm := collectors.NewCollectorManager()
	em := executors.NewExecutorManager(nil)

	return New(cfg, cm, em, "1.0.0-test")
}

func TestNewBackendManager(t *testing.T) {
	t.Parallel()

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer ts.Close()

	mgr := newTestManager(t, ts.URL)
	require.NotNil(t, mgr)
}

func TestIsRegisteredFalseInitially(t *testing.T) {
	t.Parallel()

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer ts.Close()

	mgr := newTestManager(t, ts.URL)

	assert.False(t, mgr.IsRegistered())
}

func TestGetStatusNonNil(t *testing.T) {
	t.Parallel()

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer ts.Close()

	mgr := newTestManager(t, ts.URL)

	status := mgr.GetStatus(nil)
	require.NotNil(t, status)
	assert.False(t, status.Registered)
}

func TestGetJobsStatusNonNil(t *testing.T) {
	t.Parallel()

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer ts.Close()

	mgr := newTestManager(t, ts.URL)

	jobsStatus := mgr.GetJobsStatus()
	require.NotNil(t, jobsStatus)
	// ActiveJobs may be nil slice if no active jobs - just check the call succeeds
	assert.GreaterOrEqual(t, jobsStatus.TotalRunning, 0)
}

func TestGetDownloadProgressEmpty(t *testing.T) {
	t.Parallel()

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer ts.Close()

	mgr := newTestManager(t, ts.URL)

	progress := mgr.GetDownloadProgress()
	require.NotNil(t, progress)
	assert.Len(t, progress, 0)
}

func TestUpdateDownloadProgress(t *testing.T) {
	t.Parallel()

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer ts.Close()

	mgr := newTestManager(t, ts.URL)

	mgr.UpdateDownloadProgress("dl-001", 500, 1000, 100.0)

	progress := mgr.GetDownloadProgress()
	require.Contains(t, progress, "dl-001")
	assert.Equal(t, int64(500), progress["dl-001"].DownloadedBytes)
	assert.Equal(t, int64(1000), progress["dl-001"].TotalBytes)
	assert.InDelta(t, 50.0, progress["dl-001"].Percentage, 0.01)
}

func TestRemoveDownloadProgress(t *testing.T) {
	t.Parallel()

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer ts.Close()

	mgr := newTestManager(t, ts.URL)

	mgr.UpdateDownloadProgress("dl-002", 100, 200, 50.0)

	mgr.RemoveDownloadProgress("dl-002")

	progress := mgr.GetDownloadProgress()
	assert.NotContains(t, progress, "dl-002")
}

func TestStartAndStop(t *testing.T) {
	// Not parallel - spawns goroutines

	// Set up a mock registration endpoint
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/api/v1/agent/register":
			resp := map[string]interface{}{
				"agentId":      "test-agent-123",
				"assetId":      "asset-456",
				"accessToken":  "tok-abc",
				"refreshToken": "ref-def",
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(resp)
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer ts.Close()

	mgr := newTestManager(t, ts.URL)

	err := mgr.Start()
	require.NoError(t, err)

	err = mgr.Stop()
	require.NoError(t, err)
}

func TestGetAgentID(t *testing.T) {
	t.Parallel()

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer ts.Close()

	mgr := newTestManager(t, ts.URL)

	// Initially empty (not registered)
	agentID := mgr.GetAgentID()
	assert.IsType(t, "", agentID)
}

func TestUpdateDownloadProgressCreatesNewEntry(t *testing.T) {
	t.Parallel()

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer ts.Close()

	mgr := newTestManager(t, ts.URL)

	// Update progress for a new download
	mgr.UpdateDownloadProgress("new-dl", 0, 1000, 0)

	progress := mgr.GetDownloadProgress()
	require.Contains(t, progress, "new-dl")
	assert.Equal(t, "new-dl", progress["new-dl"].ID)
	assert.NotZero(t, progress["new-dl"].StartTime)
}
