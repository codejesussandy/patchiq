package models

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFullInventory_JSONMarshalUnmarshal(t *testing.T) {
	t.Parallel()
	inv := FullInventory{
		CollectedAt:          "2024-01-01T00:00:00Z",
		AgentID:              "agent-123",
		AgentVersion:         "1.0.0",
		CollectionDurationMs: 500,
		Errors: []CollectionError{
			{Category: "hardware", Error: "access denied", Code: ErrPermissionDenied},
		},
	}

	data, err := json.Marshal(inv)
	require.NoError(t, err)
	assert.Contains(t, string(data), "agent-123")

	var out FullInventory
	require.NoError(t, json.Unmarshal(data, &out))
	assert.Equal(t, inv.AgentID, out.AgentID)
	assert.Equal(t, inv.AgentVersion, out.AgentVersion)
	assert.Equal(t, inv.CollectionDurationMs, out.CollectionDurationMs)
	assert.Len(t, out.Errors, 1)
	assert.Equal(t, "hardware", out.Errors[0].Category)
}

func TestCollectionError_Serialize(t *testing.T) {
	t.Parallel()
	ce := CollectionError{
		Category: "network",
		Error:    "interface unavailable",
		Code:     "NETWORK_FAILURE",
	}

	data, err := json.Marshal(ce)
	require.NoError(t, err)

	var out CollectionError
	require.NoError(t, json.Unmarshal(data, &out))
	assert.Equal(t, ce.Category, out.Category)
	assert.Equal(t, ce.Error, out.Error)
	assert.Equal(t, ce.Code, out.Code)
}

func TestDashboardData_Serialize(t *testing.T) {
	t.Parallel()
	dd := DashboardData{
		Agent: AgentInfo{
			ID:       "agent-1",
			Name:     "Test Agent",
			Hostname: "myhost",
			OS:       "linux",
			Status:   "online",
		},
		Collections: []CollectionStatus{
			{Category: "hardware", Status: "completed", Duration: 100},
		},
		LastUpdated: "2024-01-01T00:00:00Z",
	}

	data, err := json.Marshal(dd)
	require.NoError(t, err)
	assert.Contains(t, string(data), "agent-1")
	assert.Contains(t, string(data), "myhost")

	var out DashboardData
	require.NoError(t, json.Unmarshal(data, &out))
	assert.Equal(t, dd.Agent.ID, out.Agent.ID)
	assert.Equal(t, dd.Agent.Hostname, out.Agent.Hostname)
	assert.Len(t, out.Collections, 1)
	assert.Equal(t, "hardware", out.Collections[0].Category)
}

func TestFullInventory_OptionalFieldsOmitted(t *testing.T) {
	t.Parallel()
	inv := FullInventory{
		CollectedAt: "2024-01-01T00:00:00Z",
		AgentID:     "agent-only",
	}

	data, err := json.Marshal(inv)
	require.NoError(t, err)

	// nil optional fields should be omitted
	assert.NotContains(t, string(data), `"hardware"`)
	assert.NotContains(t, string(data), `"software"`)
	assert.NotContains(t, string(data), `"errors"`)
}
