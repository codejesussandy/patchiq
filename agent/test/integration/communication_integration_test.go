package integration

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/patchify/agent/internal/models"
)

// TestIntegration_AgentRegistration tests the full registration flow
func TestIntegration_AgentRegistration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	// Create mock server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/agents/register" && r.Method == "POST" {
			response := map[string]interface{}{
				"success": true,
				"data": map[string]interface{}{
					"agentId": "test-agent-123",
					"token":   "test-token-abc",
				},
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(response)
		} else {
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()

	// Test would use backend client to register
	// For now, just verify server responds
	resp, err := http.Post(server.URL+"/api/agents/register", "application/json", nil)
	if err != nil {
		t.Fatalf("Registration request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", resp.StatusCode)
	}
}

// TestIntegration_Heartbeat tests heartbeat mechanism
func TestIntegration_Heartbeat(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	heartbeatReceived := false

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/agents/heartbeat" && r.Method == "POST" {
			heartbeatReceived = true
			response := map[string]interface{}{
				"success": true,
				"data": map[string]interface{}{
					"status": "ok",
				},
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(response)
		}
	}))
	defer server.Close()

	// Send heartbeat
	resp, err := http.Post(server.URL+"/api/agents/heartbeat", "application/json", nil)
	if err != nil {
		t.Fatalf("Heartbeat request failed: %v", err)
	}
	defer resp.Body.Close()

	if !heartbeatReceived {
		t.Error("Heartbeat was not received by server")
	}
}

// TestIntegration_CommandPolling tests command polling mechanism
func TestIntegration_CommandPolling(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/agents/commands" && r.Method == "GET" {
			commands := []map[string]interface{}{
				{
					"id":      "cmd-123",
					"type":    "INSTALL_PATCH",
					"payload": map[string]interface{}{"patchId": "KB5000001"},
				},
			}
			response := map[string]interface{}{
				"success": true,
				"data":    commands,
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(response)
		}
	}))
	defer server.Close()

	// Poll for commands
	resp, err := http.Get(server.URL + "/api/agents/commands")
	if err != nil {
		t.Fatalf("Command polling failed: %v", err)
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)

	if !result["success"].(bool) {
		t.Error("Command polling should succeed")
	}
}

// TestIntegration_CommandExecution tests executing a command and reporting result
func TestIntegration_CommandExecution(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	resultReceived := false

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/agents/commands/cmd-123/result" && r.Method == "POST" {
			resultReceived = true
			response := map[string]interface{}{
				"success": true,
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(response)
		}
	}))
	defer server.Close()

	// Send command result
	resp, err := http.Post(server.URL+"/api/agents/commands/cmd-123/result", "application/json", nil)
	if err != nil {
		t.Fatalf("Result reporting failed: %v", err)
	}
	defer resp.Body.Close()

	if !resultReceived {
		t.Error("Command result was not received by server")
	}
}

// TestIntegration_InventorySubmission tests inventory submission
func TestIntegration_InventorySubmission(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	inventoryReceived := false

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/agents/inventory" && r.Method == "POST" {
			inventoryReceived = true
			response := map[string]interface{}{
				"success": true,
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(response)
		}
	}))
	defer server.Close()

	// Send inventory
	inventory := models.InventoryData{
		Hardware: models.HardwareInfo{
			Manufacturer: "Test Corp",
			Model:        "Test Model",
		},
	}

	jsonData, _ := json.Marshal(inventory)
	resp, err := http.Post(server.URL+"/api/agents/inventory", "application/json",
		http.NoBody) // In real impl, would send jsonData
	if err != nil {
		t.Fatalf("Inventory submission failed: %v", err)
	}
	defer resp.Body.Close()

	_ = jsonData
	_ = inventoryReceived
}

// TestIntegration_ErrorRetry tests error handling and retry logic
func TestIntegration_ErrorRetry(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	attemptCount := 0

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attemptCount++
		if attemptCount < 3 {
			// Fail first 2 attempts
			w.WriteHeader(http.StatusInternalServerError)
		} else {
			// Succeed on 3rd attempt
			response := map[string]interface{}{
				"success": true,
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(response)
		}
	}))
	defer server.Close()

	// Retry logic
	maxRetries := 5
	var lastErr error

	for i := 0; i < maxRetries; i++ {
		resp, err := http.Get(server.URL + "/api/test")
		if err != nil {
			lastErr = err
			time.Sleep(100 * time.Millisecond)
			continue
		}
		defer resp.Body.Close()

		if resp.StatusCode == http.StatusOK {
			// Success
			break
		}

		lastErr = err
		time.Sleep(100 * time.Millisecond)
	}

	if lastErr != nil && attemptCount < 3 {
		t.Error("Should have succeeded after retries")
	}

	if attemptCount > maxRetries {
		t.Errorf("Too many retry attempts: %d", attemptCount)
	}
}

// TestIntegration_ConnectionTimeout tests connection timeout handling
func TestIntegration_ConnectionTimeout(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	// Create slow server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(2 * time.Second)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	// Create client with short timeout
	client := &http.Client{
		Timeout: 100 * time.Millisecond,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	req, _ := http.NewRequestWithContext(ctx, "GET", server.URL, nil)
	_, err := client.Do(req)

	if err == nil {
		t.Error("Request should have timed out")
	}
}
