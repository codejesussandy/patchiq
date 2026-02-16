package backend

import (
	"testing"
	"time"

	"github.com/patchify/agent/internal/collectors"
	"github.com/patchify/agent/internal/config"
	"github.com/patchify/agent/internal/executors"
	"github.com/patchify/agent/internal/testutil"
)

// TestNew tests creating a new backend manager
func TestNew(t *testing.T) {
	cfg := createTestConfig()
	cm := &collectors.CollectorManager{}
	em := executors.NewExecutorManager(createTestDownloadConfig())

	manager := New(cfg, cm, em, "1.0.0-test")

	testutil.AssertNotNil(t, manager, "Manager should not be nil")
	testutil.AssertNotNil(t, manager.config, "Config should not be nil")
	testutil.AssertNotNil(t, manager.client, "Client should not be nil")
	testutil.AssertNotNil(t, manager.collectors, "Collectors should not be nil")
	testutil.AssertNotNil(t, manager.executors, "Executors should not be nil")
	testutil.AssertEqual(t, "1.0.0-test", manager.agentVersion, "Agent version mismatch")
}

// TestIsRegistered tests registration status check
func TestIsRegistered(t *testing.T) {
	cfg := createTestConfig()
	cm := &collectors.CollectorManager{}
	em := executors.NewExecutorManager(createTestDownloadConfig())

	manager := New(cfg, cm, em, "1.0.0-test")

	// Initially should not be registered
	testutil.AssertFalse(t, manager.IsRegistered(), "Should not be registered initially")

	// Simulate registration
	manager.mu.Lock()
	manager.registered = true
	manager.mu.Unlock()

	testutil.AssertTrue(t, manager.IsRegistered(), "Should be registered after setting flag")
}

// TestGetAgentID tests retrieving agent ID
func TestGetAgentID(t *testing.T) {
	cfg := createTestConfig()
	cm := &collectors.CollectorManager{}
	em := executors.NewExecutorManager(createTestDownloadConfig())

	manager := New(cfg, cm, em, "1.0.0-test")

	// Initially should be empty
	agentID := manager.GetAgentID()
	if agentID != "" {
		t.Logf("Note: Agent ID is %s (may have loaded credentials)", agentID)
	}
}

// TestStop tests graceful shutdown
func TestStop(t *testing.T) {
	cfg := createTestConfig()
	cm := &collectors.CollectorManager{}
	em := executors.NewExecutorManager(createTestDownloadConfig())

	manager := New(cfg, cm, em, "1.0.0-test")

	// Start the manager
	if err := manager.Start(); err != nil {
		t.Logf("Warning: Failed to start manager: %v", err)
	}

	// Give it a moment to initialize
	time.Sleep(100 * time.Millisecond)

	// Stop should complete within timeout
	start := time.Now()
	err := manager.Stop()
	duration := time.Since(start)

	testutil.AssertNoError(t, err, "Stop should not error")
	testutil.AssertDurationLessThan(t, duration, 5*time.Second, "Stop should complete quickly")
}

// TestCommandPriority tests command priority values
func TestCommandPriority(t *testing.T) {
	tests := []struct {
		commandType      string
		expectedPriority int
	}{
		{"agent_update", 1},
		{"inventory_full", 2},
		{"patch_install", 3},
		{"script_bundle", 4},
		{"config_update", 5},
	}

	for _, tt := range tests {
		t.Run(tt.commandType, func(t *testing.T) {
			if priority, ok := commandPriority[tt.commandType]; ok {
				testutil.AssertEqual(t, tt.expectedPriority, priority, "Priority mismatch")
			} else {
				t.Errorf("Command type %s not found in priority map", tt.commandType)
			}
		})
	}
}

// TestGetOSInfo tests OS information retrieval
func TestGetOSInfo(t *testing.T) {
	osName, osVersion := getOSInfo()

	testutil.AssertNotEmpty(t, osName, "OS name should not be empty")
	testutil.AssertNotEmpty(t, osVersion, "OS version should not be empty")

	t.Logf("OS: %s %s", osName, osVersion)
}

// TestGetPrimaryIPAddress tests IP address retrieval
func TestGetPrimaryIPAddress(t *testing.T) {
	ipAddress := getPrimaryIPAddress()

	testutil.AssertNotEmpty(t, ipAddress, "IP address should not be empty")
	t.Logf("Primary IP: %s", ipAddress)
}

// TestDownloadProgress tests download progress tracking structure
func TestDownloadProgress(t *testing.T) {
	cfg := createTestConfig()
	cm := &collectors.CollectorManager{}
	em := executors.NewExecutorManager(createTestDownloadConfig())

	manager := New(cfg, cm, em, "1.0.0-test")

	// Create download progress
	progress := &DownloadProgress{
		ID:              "test-download-1",
		FileName:        "test.pkg",
		TotalBytes:      1024000,
		DownloadedBytes: 512000,
		Percentage:      50.0,
		Speed:           102400,
		StartTime:       time.Now(),
		EstimatedTime:   5,
	}

	manager.progressMutex.Lock()
	manager.downloadProgress[progress.ID] = progress
	manager.progressMutex.Unlock()

	// Verify progress is tracked
	manager.progressMutex.RLock()
	tracked := manager.downloadProgress[progress.ID]
	manager.progressMutex.RUnlock()

	testutil.AssertNotNil(t, tracked, "Progress should be tracked")
	testutil.AssertEqual(t, "test.pkg", tracked.FileName, "Filename mismatch")
	testutil.AssertEqual(t, 50.0, tracked.Percentage, "Percentage mismatch")
}

// TestCommandQueue tests command queue initialization
func TestCommandQueue(t *testing.T) {
	cfg := createTestConfig()
	cm := &collectors.CollectorManager{}
	em := executors.NewExecutorManager(createTestDownloadConfig())

	manager := New(cfg, cm, em, "1.0.0-test")

	// Queue should be initialized
	testutil.AssertNotNil(t, manager.commandQueue, "Command queue should not be nil")

	// Check queue capacity
	if cap(manager.commandQueue) != 100 {
		t.Errorf("Expected queue capacity 100, got %d", cap(manager.commandQueue))
	}
}

// TestWorkerCount tests worker pool size
func TestWorkerCount(t *testing.T) {
	cfg := createTestConfig()
	cm := &collectors.CollectorManager{}
	em := executors.NewExecutorManager(createTestDownloadConfig())

	manager := New(cfg, cm, em, "1.0.0-test")

	testutil.AssertEqual(t, 3, manager.workers, "Default worker count should be 3")
}

// TestMaxRetries tests retry configuration
func TestMaxRetries(t *testing.T) {
	cfg := createTestConfig()
	cm := &collectors.CollectorManager{}
	em := executors.NewExecutorManager(createTestDownloadConfig())

	manager := New(cfg, cm, em, "1.0.0-test")

	testutil.AssertEqual(t, 3, manager.maxRetries, "Default max retries should be 3")
}

// TestBackoffConfiguration tests backoff settings
func TestBackoffConfiguration(t *testing.T) {
	cfg := createTestConfig()
	cm := &collectors.CollectorManager{}
	em := executors.NewExecutorManager(createTestDownloadConfig())

	manager := New(cfg, cm, em, "1.0.0-test")

	manager.backoffMutex.RLock()
	backoff := manager.backoffDuration
	maxBackoff := manager.maxBackoff
	manager.backoffMutex.RUnlock()

	testutil.AssertEqual(t, time.Duration(0), backoff, "Initial backoff should be 0")
	testutil.AssertEqual(t, 5*time.Minute, maxBackoff, "Max backoff should be 5 minutes")
}

// TestActiveJobs tests job tracking map initialization
func TestActiveJobs(t *testing.T) {
	cfg := createTestConfig()
	cm := &collectors.CollectorManager{}
	em := executors.NewExecutorManager(createTestDownloadConfig())

	manager := New(cfg, cm, em, "1.0.0-test")

	testutil.AssertNotNil(t, manager.activeJobs, "Active jobs map should not be nil")
}

// TestStopChannels tests control channel initialization
func TestStopChannels(t *testing.T) {
	cfg := createTestConfig()
	cm := &collectors.CollectorManager{}
	em := executors.NewExecutorManager(createTestDownloadConfig())

	manager := New(cfg, cm, em, "1.0.0-test")

	testutil.AssertNotNil(t, manager.stopCh, "Stop channel should not be nil")
	testutil.AssertNotNil(t, manager.resetHeartbeat, "Reset heartbeat channel should not be nil")
	testutil.AssertNotNil(t, manager.resetTelemetry, "Reset telemetry channel should not be nil")
	testutil.AssertNotNil(t, manager.resetInventory, "Reset inventory channel should not be nil")
}

// TestStartStopCycle tests starting and stopping manager
func TestStartStopCycle(t *testing.T) {
	cfg := createTestConfig()
	cm := &collectors.CollectorManager{}
	em := executors.NewExecutorManager(createTestDownloadConfig())

	manager := New(cfg, cm, em, "1.0.0-test")

	// Should not be registered initially
	testutil.AssertFalse(t, manager.IsRegistered(), "Should not be registered before start")

	// Start
	if err := manager.Start(); err != nil {
		t.Logf("Note: Start returned error (expected if backend not running): %v", err)
	}

	// Give goroutines time to start
	time.Sleep(200 * time.Millisecond)

	// Stop
	err := manager.Stop()
	testutil.AssertNoError(t, err, "Stop should not error")
}

// TestConcurrentAccess tests thread-safe access to manager state
func TestConcurrentAccess(t *testing.T) {
	cfg := createTestConfig()
	cm := &collectors.CollectorManager{}
	em := executors.NewExecutorManager(createTestDownloadConfig())

	manager := New(cfg, cm, em, "1.0.0-test")

	// Test concurrent reads
	done := make(chan bool, 10)
	for i := 0; i < 10; i++ {
		go func() {
			_ = manager.IsRegistered()
			_ = manager.GetAgentID()
			done <- true
		}()
	}

	// Wait for all goroutines
	for i := 0; i < 10; i++ {
		<-done
	}

	// Should not panic
	t.Log("Concurrent access test passed")
}

// Helper function to create test config
func createTestConfig() *config.Config {
	return &config.Config{
		ServerURL:            "http://localhost:3000",
		HeartbeatInterval:    60,
		TelemetryInterval:    300,
		InventoryInterval:    3600,
		DataDir:              "/tmp/patchify-test",
		ProxyURL:             "",
		MaxDownloadSpeedMBps: 0,
		EnableDownloadResume: true,
	}
}

// Helper function to create test download config
func createTestDownloadConfig() *executors.DownloadConfig {
	return &executors.DownloadConfig{
		MaxDownloadSpeedMBps: 0,
		EnableDownloadResume: true,
		ProxyURL:             "",
		ProxyUser:            "",
		ProxyPassword:        "",
	}
}
