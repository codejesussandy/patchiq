# PatchIQ Agent Improvements - Implementation Plan

> **Status**: Implementation in Progress
> **Created**: 2026-02-14
> **Last Updated**: 2026-02-14
> **Effort**: 68-86 hours (approximately 2 months @ 50% capacity)

---

## Executive Summary

The PatchIQ Go agent is **87% production-ready** with 19,258 lines of functional code. Comprehensive analysis revealed **no stub code**—all collectors, executors, and backend communication are working implementations. This plan addresses critical gaps in reliability, observability, and maintainability to achieve full production-grade status.

### Current State
- **Collectors**: 100% complete (7 collectors, 63 files, cross-platform)
- **Executors**: 95% complete (hub-centric architecture, 4,188 lines)
- **Backend Communication**: 80% complete (critical gaps identified)
- **WebUI & Main**: 87% complete (missing observability features)

### Key Issues to Address
1. ❌ No command timeout enforcement (commands can hang indefinitely)
2. ❌ Fire-and-forget error handling (silent failures)
3. ❌ No exponential backoff on heartbeat failures (hammers server during outages)
4. ❌ Graceful shutdown missing timeout (can hang on service restart)
5. ❌ Inventory sent every 6h even if unchanged (bandwidth waste)
6. ❌ No structured logging (hard to parse logs)
7. ❌ No metrics endpoint (cannot monitor agent health)
8. ❌ Tokens stored in plaintext (security risk)
9. ❌ Job history in-memory only (lost on restart)

---

## Implementation Roadmap

```
┌─────────────────────────────────────────────────────────────┐
│ Week 1: Priority 1 - Critical Fixes (16-20 hours)          │
├─────────────────────────────────────────────────────────────┤
│ ✓ Command timeout enforcement                              │
│ ✓ Exponential backoff on heartbeat                         │
│ ✓ Graceful shutdown with timeout                           │
│ ✓ Fix fire-and-forget error handling                       │
│ ✓ Inventory deduplication                                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Week 2: Priority 2 - High Priority (24-30 hours)           │
├─────────────────────────────────────────────────────────────┤
│ ✓ Structured logging (zerolog)                             │
│ ✓ Metrics/observability endpoint (Prometheus)              │
│ ✓ Token encryption at rest (OS-native)                     │
│ ✓ Job persistence (SQLite)                                 │
│ ✓ Enhanced error propagation                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Week 3: Priority 3 & 4 - Polish (14-18 hours)              │
├─────────────────────────────────────────────────────────────┤
│ ✓ Command batching & prioritization                        │
│ ✓ WebUI authentication (optional)                          │
│ ✓ Setup wizard validation                                  │
│ ✓ Telemetry SSE optimization                               │
│ ✓ Download progress tracking                               │
│ ✓ Service code deduplication                               │
│ ✓ Godoc comments                                            │
│ ✓ Unit tests (60% coverage)                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Week 4: Testing & Validation (8-10 hours)                  │
├─────────────────────────────────────────────────────────────┤
│ ✓ Windows platform testing                                 │
│ ✓ Linux platform testing                                   │
│ ✓ macOS platform testing                                   │
│ ✓ Integration testing                                      │
│ ✓ Load testing                                              │
│ ✓ Verification checklist                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Workflow

For each priority level, I'm using the following workflow with teammates (Task agents):

### Workflow for Each Task

```
┌──────────────────────────────────────────────────────────┐
│ 1. PLANNING PHASE                                        │
├──────────────────────────────────────────────────────────┤
│ • Read current implementation (Read tool)                │
│ • Understand existing patterns                           │
│ • Identify files to modify                               │
│ • Design implementation approach                         │
└──────────────────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────────────────┐
│ 2. IMPLEMENTATION PHASE (using Bash agent)               │
├──────────────────────────────────────────────────────────┤
│ • Create new files if needed (Write tool)                │
│ • Modify existing files (Edit tool)                      │
│ • Update dependencies (go get, go mod tidy)              │
│ • Follow Go best practices                               │
│ • Add error handling                                     │
└──────────────────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────────────────┐
│ 3. VALIDATION PHASE (using Explore agent)                │
├──────────────────────────────────────────────────────────┤
│ • Verify syntax (go build)                               │
│ • Run tests (go test)                                    │
│ • Check for errors                                       │
│ • Validate cross-platform compatibility                  │
└──────────────────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────────────────┐
│ 4. TESTING PHASE (using general-purpose agent)           │
├──────────────────────────────────────────────────────────┤
│ • Unit tests for new functionality                       │
│ • Integration tests for workflows                        │
│ • Platform-specific tests (Windows/Linux/macOS)          │
│ • Performance/load tests where applicable                │
└──────────────────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────────────────┐
│ 5. VERIFICATION PHASE                                    │
├──────────────────────────────────────────────────────────┤
│ • Run verification commands from plan                    │
│ • Check success criteria                                 │
│ • Update task status to completed                        │
│ • Document any issues or learnings                       │
└──────────────────────────────────────────────────────────┘
```

### Priority-Specific Workflows

#### Priority 1 (Critical Fixes) - Sequential Implementation
```
Task 1: Command Timeout          (3-4 hours)
  ├─ Bash agent: Implement context timeout in backend.go
  ├─ Bash agent: Update executor interfaces
  ├─ Bash agent: Modify platform executors (Windows/Linux/macOS)
  └─ Explore agent: Validate build, test timeout behavior

Task 2: Exponential Backoff      (1-2 hours)
  ├─ Bash agent: Add backoff fields to Manager struct
  ├─ Bash agent: Implement backoff logic in heartbeatLoop
  └─ Explore agent: Test consecutive failures, verify progression

Task 3: Graceful Shutdown         (2-3 hours)
  ├─ Bash agent: Add timeout to Manager.Stop()
  ├─ Bash agent: Update signal handling in main.go
  └─ General-purpose agent: Test SIGTERM during active command

Task 4: Fix Fire-and-Forget      (3-4 hours)
  ├─ Bash agent: Add command queue and worker pool
  ├─ Bash agent: Replace goroutine launches with queue
  └─ Explore agent: Test 100 concurrent commands

Task 5: Inventory Deduplication   (1-2 hours)
  ├─ Bash agent: Add checksum computation to submitInventoryNow
  ├─ Bash agent: Implement skip logic based on checksum
  └─ General-purpose agent: Test bandwidth reduction

After All P1 Tasks:
  └─ General-purpose agent: Comprehensive P1 validation
      ├─ Build agent for all platforms
      ├─ Run integration tests
      └─ Verify all P1 success criteria
```

#### Priority 2 (High Priority) - Parallel where possible
```
Task 6: Structured Logging        (6-8 hours)
  ├─ Bash agent: Create logger package with zerolog
  ├─ Bash agent: Batch update all files (search-replace pattern)
  ├─ Bash agent: Update main.go to initialize logger
  └─ Explore agent: Verify JSON output, test jq filtering

Task 7: Metrics Endpoint          (4-5 hours)
  ├─ Bash agent: Create metrics package with Prometheus
  ├─ Bash agent: Add /metrics endpoint to server
  ├─ Bash agent: Instrument critical paths
  └─ General-purpose agent: Scrape metrics, verify format

Task 8: Token Encryption          (4-5 hours)
  ├─ Bash agent: Create crypto package (platform-specific)
  ├─ Bash agent: Update credentials.go with encryption
  └─ Explore agent: Test Windows/Linux/macOS encryption

Task 9: Job Persistence           (6-8 hours)
  ├─ Bash agent: Create storage package with SQLite
  ├─ Bash agent: Replace in-memory slice with JobStore
  └─ General-purpose agent: Test persistence across restarts

Task 10: Error Propagation        (5-6 hours)
  ├─ Bash agent: Enhance ExecutionResult struct
  ├─ Bash agent: Update all 15 executor files
  └─ Explore agent: Test retry logic for each error type

After All P2 Tasks:
  └─ General-purpose agent: Comprehensive P2 validation
      ├─ Verify metrics endpoint operational
      ├─ Test structured logs in production format
      ├─ Validate job persistence
      └─ Check all P2 success criteria
```

#### Priority 3 & 4 (Polish & Quality) - Batched implementation
```
Task 11: Medium Priority Features (8-10 hours)
  ├─ Bash agent: Command batching & prioritization
  ├─ Bash agent: WebUI authentication
  ├─ Bash agent: Setup wizard validation
  ├─ Bash agent: Telemetry SSE
  └─ Bash agent: Download progress tracking

Task 11: Code Quality             (6-8 hours)
  ├─ Bash agent: Service code deduplication
  ├─ Bash agent: Extract setup wizard
  ├─ General-purpose agent: Add godoc comments (automated)
  └─ General-purpose agent: Write unit tests (60% coverage)

After All P3/P4 Tasks:
  └─ Explore agent: Code quality validation
      ├─ Run golangci-lint
      ├─ Verify test coverage
      └─ Check all P3/P4 success criteria
```

#### Final Testing Phase - Parallel platform testing
```
Task 12: Comprehensive Testing    (8-10 hours)
  ├─ General-purpose agent: Windows platform tests
  │   ├─ Service install/start/stop
  │   ├─ Windows Update patching
  │   ├─ Software install (winget, choco, msi, exe)
  │   ├─ RDP remote access
  │   └─ All 7 collectors + metrics
  │
  ├─ General-purpose agent: Linux platform tests (parallel)
  │   ├─ apt/dnf/yum patching
  │   ├─ Software install (snap, flatpak, deb, rpm)
  │   ├─ VNC remote access
  │   └─ All 7 collectors + metrics
  │
  └─ General-purpose agent: macOS platform tests (parallel)
      ├─ softwareupdate patching
      ├─ Software install (brew, pkg, dmg, mas)
      ├─ Screen Sharing
      ├─ Apple Silicon support
      └─ All 7 collectors + metrics

Final Validation:
  └─ Explore agent: Integration & load testing
      ├─ 100 concurrent commands
      ├─ 10GB download test
      ├─ 24-hour soak test
      ├─ Memory leak detection
      └─ Complete verification checklist
```

### Agent Usage Strategy

**Bash Agent** (for implementation):
- Modifying Go source files
- Creating new packages
- Running go commands (build, test, mod tidy)
- Batch file updates (log migration)

**Explore Agent** (for validation):
- Checking build errors
- Verifying syntax
- Quick functionality checks
- Reading implementation to understand patterns

**General-Purpose Agent** (for complex testing):
- Integration testing
- Platform-specific testing
- Performance/load testing
- Multi-step validation workflows

---

## Priority 1: Critical Fixes (16-20 hours)

### 1.1 Command Timeout Enforcement (3-4 hours)

**Problem**: Commands execute with no timeout enforcement. Long-running commands can hang indefinitely, blocking the agent.

**Solution**: Add context-based timeout to all command executions with configurable duration (default 15 minutes).

**Files to Modify**:
```
agent/internal/backend/backend.go (executeCommand, lines 547-906)
agent/internal/executors/executor.go (interface definitions)
agent/internal/executors/patch_linux.go
agent/internal/executors/patch_darwin.go
agent/internal/executors/patch_windows.go
agent/internal/executors/software_linux.go
agent/internal/executors/software_darwin.go
agent/internal/executors/software_windows.go
agent/internal/executors/script_executor.go
agent/internal/config/config.go (add CommandTimeoutSeconds field)
```

**Implementation Steps**:
1. Add `CommandTimeoutSeconds int` to Config struct (default: 900)
2. Wrap `executeCommand()` with `context.WithTimeout`:
   ```go
   ctx, cancel := context.WithTimeout(context.Background(),
       time.Duration(m.config.CommandTimeoutSeconds)*time.Second)
   defer cancel()
   ```
3. Update all executor interfaces to accept `context.Context` as first parameter
4. Modify platform-specific executors to respect `ctx.Done()` channel
5. Return `TIMEOUT` error code in `ExecutionResult` on context cancellation

**Testing**:
- Unit: Create mock command that sleeps 20s, set 1s timeout, verify cancellation
- Integration: Deploy patch with 5s timeout on test machine, verify clean cancellation
- Platform: Test on Windows, Linux, macOS to ensure cross-platform compatibility

**Success Criteria**:
- ✅ All commands respect timeout configuration
- ✅ Timeout errors logged with error code `TIMEOUT`
- ✅ Agent remains responsive after timeout
- ✅ No zombie processes created

---

### 1.2 Exponential Backoff on Heartbeat Failures (1-2 hours)

**Problem**: `heartbeatLoop()` retries immediately on failure with fixed 60-second interval. During outages, this creates log spam and unnecessary server load.

**Solution**: Implement exponential backoff with jitter (5s → 10s → 20s → ... → 5min max).

**Files to Modify**:
```
agent/internal/backend/backend.go (Manager struct, heartbeatLoop lines 246-303)
```

**Implementation Steps**:
1. Add fields to `Manager` struct:
   ```go
   backoffDuration time.Duration
   maxBackoff      time.Duration // 5 minutes
   ```
2. Modify `heartbeatLoop()`:
   ```go
   // On error:
   m.backoffDuration = min(m.backoffDuration * 2, m.maxBackoff)
   jitter := time.Duration(rand.Float64() * 0.1 * float64(m.backoffDuration))
   time.Sleep(m.backoffDuration + jitter)

   // On success:
   m.backoffDuration = 0
   ```
3. Log backoff duration on each retry for observability

**Testing**:
- Unit: Simulate 10 consecutive failures, verify backoff progression
- Integration: Stop backend server, monitor agent logs for backoff behavior
- Recovery: Restart backend, verify agent reconnects immediately on next attempt

**Success Criteria**:
- ✅ Backoff increases exponentially: 5s, 10s, 20s, 40s, 80s, 160s, 300s (max)
- ✅ Jitter prevents thundering herd (±10% variance)
- ✅ Backoff resets to 0 on successful heartbeat
- ✅ Logs show backoff duration on each retry

---

### 1.3 Graceful Shutdown with Timeout (2-3 hours)

**Problem**: Signal handler waits indefinitely for `backendMgr.Stop()`. If a command is running, shutdown can hang, preventing clean service restarts.

**Solution**: Add 30-second timeout to shutdown process with forced exit.

**Files to Modify**:
```
agent/cmd/agent/main.go (signal handling, lines 245-256)
agent/internal/backend/backend.go (Stop method)
```

**Implementation Steps**:
1. Update `Manager.Stop()` with timeout:
   ```go
   func (m *Manager) Stop() error {
       close(m.stopCh)
       done := make(chan struct{})
       go func() {
           m.wg.Wait()
           close(done)
       }()
       select {
       case <-done:
           log.Info().Msg("Clean shutdown completed")
           return nil
       case <-time.After(30 * time.Second):
           log.Warn().Msg("Shutdown timeout after 30s, forcing exit")
           return fmt.Errorf("shutdown timeout exceeded")
       }
   }
   ```
2. In `main.go`, log error if timeout occurs but still exit:
   ```go
   if err := backendMgr.Stop(); err != nil {
       log.Warn().Err(err).Msg("Shutdown error")
   }
   os.Exit(0)
   ```
3. Propagate shutdown signal to active commands via context cancellation

**Testing**:
- Unit: Mock long-running `Stop()` operation, verify 30s timeout
- Integration: Send SIGTERM during active patch deployment, verify exit within 30s
- Manual: Ctrl+C during download, verify clean exit

**Success Criteria**:
- ✅ Clean shutdown within 30 seconds in all cases
- ✅ Active commands cancelled gracefully
- ✅ Partial results saved before exit
- ✅ No zombie processes left running

---

### 1.4 Fix Fire-and-Forget Error Handling (3-4 hours)

**Problem**: `fetchAndExecuteCommands()` launches commands with `go m.executeCommand(cmd)` without waiting for results. Errors are silently lost, breaking audit trail.

**Solution**: Replace with command queue and worker pool pattern.

**Files to Modify**:
```
agent/internal/backend/backend.go (fetchAndExecuteCommands, executeCommand)
```

**Implementation Steps**:
1. Add command queue to `Manager`:
   ```go
   type Manager struct {
       commandQueue chan client.PendingCommand
       workers      int // default: 3
   }
   ```
2. Initialize queue in `Start()`:
   ```go
   m.commandQueue = make(chan client.PendingCommand, 100)
   for i := 0; i < m.workers; i++ {
       m.wg.Add(1)
       go m.commandWorker(i)
   }
   ```
3. Implement worker:
   ```go
   func (m *Manager) commandWorker(id int) {
       defer m.wg.Done()
       for cmd := range m.commandQueue {
           result := m.executeCommand(cmd)
           m.reportCommandResult(cmd.ID, result) // Always report
       }
   }
   ```
4. Enqueue commands instead of spawning goroutines:
   ```go
   select {
   case m.commandQueue <- cmd:
       log.Debug().Str("commandID", cmd.ID).Msg("Command queued")
   default:
       log.Warn().Str("commandID", cmd.ID).Msg("Queue full, dropping command")
   }
   ```

**Testing**:
- Unit: Enqueue 10 commands, verify all execute and report results
- Integration: Queue 100 commands rapidly, verify none dropped
- Error: Kill agent mid-command, verify partial result reported before exit

**Success Criteria**:
- ✅ All command results reported to backend (0% silent failures)
- ✅ Queue handles 100+ concurrent commands
- ✅ Worker pool prevents resource exhaustion
- ✅ Dropped commands logged (if queue full)

---

### 1.5 Inventory Deduplication with Checksums (1-2 hours)

**Problem**: `submitInventoryNow()` submits full inventory every 6 hours even if nothing changed, wasting bandwidth and backend processing.

**Solution**: Compute SHA256 checksum and skip submission if unchanged.

**Files to Modify**:
```
agent/internal/backend/backend.go (submitInventoryNow lines 442-470, Manager struct)
```

**Implementation Steps**:
1. Add fields to `Manager`:
   ```go
   lastInventoryChecksum string
   lastForcedSubmission  time.Time
   ```
2. Before submission, compute checksum:
   ```go
   data, _ := json.Marshal(inventory)
   checksum := sha256.Sum256(data)
   checksumStr := hex.EncodeToString(checksum[:])

   // Skip if unchanged (unless forced or 24h elapsed)
   if checksumStr == m.lastInventoryChecksum && !force &&
      time.Since(m.lastForcedSubmission) < 24*time.Hour {
       log.Debug().Msg("Inventory unchanged, skipping submission")
       return nil
   }

   // Submit and update
   err := m.client.SubmitInventory(ctx, inventory)
   if err == nil {
       m.lastInventoryChecksum = checksumStr
       if force {
           m.lastForcedSubmission = time.Now()
       }
   }
   ```
3. Manual collections always force submission (set `force = true`)

**Testing**:
- Unit: Collect inventory twice with no changes, verify single submission
- Integration: Install software, verify inventory re-submitted (checksum changed)
- Performance: Monitor bandwidth usage over 24h, expect 75% reduction

**Success Criteria**:
- ✅ Unchanged inventory not submitted (logged)
- ✅ Changed inventory always submitted
- ✅ Force submission every 24h regardless
- ✅ Bandwidth reduced by ~75% in stable environments

---

## Priority 2: High Priority Improvements (24-30 hours)

### 2.1 Structured Logging with zerolog (6-8 hours)

**Problem**: All code uses stdlib `log` package with unstructured strings. No log levels, no correlation IDs, hard to parse.

**Solution**: Migrate to zerolog for structured JSON logging with correlation IDs.

**Files to Modify**:
```
Create: agent/internal/logger/logger.go
Update: All 78 Go files using stdlib log
agent/internal/config/config.go (add LogFormat, LogLevel fields)
agent/cmd/agent/main.go (initialize logger)
```

**Implementation Steps**:
1. Add dependency: `go get github.com/rs/zerolog`
2. Create logger factory:
   ```go
   package logger

   import (
       "io"
       "os"
       "github.com/rs/zerolog"
       "github.com/rs/zerolog/log"
   )

   func Init(level, format, file string) error {
       l, _ := zerolog.ParseLevel(level)
       zerolog.SetGlobalLevel(l)

       var output io.Writer = os.Stdout
       if file != "" {
           f, err := os.OpenFile(file, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
           if err != nil {
               return err
           }
           output = f
       }

       if format == "text" {
           output = zerolog.ConsoleWriter{Out: output, TimeFormat: time.RFC3339}
       }

       log.Logger = zerolog.New(output).With().Timestamp().Caller().Logger()
       return nil
   }

   func WithComponent(component string) zerolog.Logger {
       return log.With().Str("component", component).Logger()
   }

   func WithCommandID(commandID string) zerolog.Logger {
       return log.With().Str("commandID", commandID).Logger()
   }
   ```
3. Replace log imports:
   ```go
   // Old:
   import "log"

   // New:
   import "github.com/rs/zerolog/log"
   ```
4. Replace log calls:
   ```go
   // Old:
   log.Printf("Heartbeat failed: %v", err)

   // New:
   log.Error().Err(err).Msg("Heartbeat failed")
   ```
5. Add correlation IDs to command execution context

**Migration Pattern**:
```bash
# Find all log.Printf calls
grep -r "log\.Printf" agent/

# Replace patterns:
log.Printf("msg")        → log.Info().Msg("msg")
log.Printf("msg %v", x)  → log.Info().Interface("x", x).Msg("msg")
log.Printf("err: %v", e) → log.Error().Err(e).Msg("msg")
log.Println("msg")       → log.Info().Msg("msg")
log.Fatalf("msg %v", e)  → log.Fatal().Err(e).Msg("msg")
```

**Testing**:
- Unit: Verify log output contains JSON fields (timestamp, level, component, caller)
- Integration: Trigger error, verify structured error with stack trace
- Manual: Tail log file, use jq to filter by level

**Success Criteria**:
- ✅ All logs output as structured JSON (or human-readable text if configured)
- ✅ Correlation IDs present in command execution logs
- ✅ Log levels properly set (debug, info, warn, error, fatal)
- ✅ Logs parseable by jq/Splunk/Elasticsearch

**Verification**:
```bash
# JSON format
./patchiq-agent --log-format json --log-level debug

# Filter errors with jq
tail -f ~/.patchify-agent/agent.log | jq 'select(.level=="error")'

# Filter by component
tail -f ~/.patchify-agent/agent.log | jq 'select(.component=="heartbeat")'
```

---

### 2.2 Metrics/Observability Endpoint (4-5 hours)

**Problem**: No Prometheus-compatible metrics endpoint. Operators cannot monitor agent health without parsing logs.

**Solution**: Add `/metrics` endpoint with Prometheus metrics.

**Files to Modify**:
```
Create: agent/internal/metrics/metrics.go
agent/internal/server/server.go (add /metrics endpoint)
agent/internal/backend/backend.go (instrument heartbeat, commands)
agent/internal/executors/script_executor.go (instrument downloads)
agent/cmd/agent/main.go (set agent_up gauge)
```

**Implementation Steps**:
1. Add dependency: `go get github.com/prometheus/client_golang`
2. Define metrics:
   ```go
   package metrics

   import (
       "github.com/prometheus/client_golang/prometheus"
       "github.com/prometheus/client_golang/prometheus/promauto"
   )

   var (
       AgentUp = promauto.NewGauge(prometheus.GaugeOpts{
           Name: "agent_up",
           Help: "1 if agent is running, 0 otherwise",
       })

       HeartbeatSuccess = promauto.NewCounter(prometheus.CounterOpts{
           Name: "agent_heartbeat_success_total",
           Help: "Total number of successful heartbeats",
       })

       HeartbeatFailures = promauto.NewCounter(prometheus.CounterOpts{
           Name: "agent_heartbeat_failures_total",
           Help: "Total number of failed heartbeats",
       })

       CommandsExecuted = promauto.NewCounterVec(
           prometheus.CounterOpts{
               Name: "agent_commands_executed_total",
               Help: "Total commands executed by type and status",
           },
           []string{"type", "status"},
       )

       CommandDuration = promauto.NewHistogramVec(
           prometheus.HistogramOpts{
               Name: "agent_command_duration_seconds",
               Help: "Command execution duration",
               Buckets: prometheus.DefBuckets,
           },
           []string{"type"},
       )

       InventoryDuration = promauto.NewHistogram(prometheus.HistogramOpts{
           Name: "agent_inventory_submission_duration_seconds",
           Help: "Inventory submission duration",
           Buckets: prometheus.DefBuckets,
       })

       TelemetryCollectionDuration = promauto.NewHistogram(prometheus.HistogramOpts{
           Name: "agent_telemetry_collection_duration_seconds",
           Help: "Telemetry collection duration",
           Buckets: prometheus.DefBuckets,
       })

       DownloadBytes = promauto.NewCounterVec(
           prometheus.CounterOpts{
               Name: "agent_download_bytes_total",
               Help: "Total bytes downloaded",
           },
           []string{"file_type"},
       )
   )
   ```
3. Add endpoint in server.go:
   ```go
   import "github.com/prometheus/client_golang/prometheus/promhttp"

   func (s *Server) setupRoutes() {
       // Existing routes...

       // Metrics endpoint
       s.mux.Handle("/metrics", promhttp.Handler())
   }
   ```
4. Instrument code:
   ```go
   // main.go
   metrics.AgentUp.Set(1)

   // heartbeatLoop
   err := m.client.Heartbeat(...)
   if err != nil {
       metrics.HeartbeatFailures.Inc()
   } else {
       metrics.HeartbeatSuccess.Inc()
   }

   // executeCommand
   timer := prometheus.NewTimer(metrics.CommandDuration.WithLabelValues(cmd.Type))
   defer timer.ObserveDuration()

   result := m.doExecuteCommand(cmd)
   status := "success"
   if !result.Success {
       status = "failure"
   }
   metrics.CommandsExecuted.WithLabelValues(cmd.Type, status).Inc()
   ```

**Testing**:
- Unit: Trigger command, verify counter incremented
- Integration: Scrape `/metrics`, verify Prometheus format
- Load: Run 1000 commands, verify metrics overhead < 1% CPU

**Success Criteria**:
- ✅ `/metrics` endpoint returns Prometheus format
- ✅ All defined metrics exported
- ✅ Metrics update in real-time
- ✅ Overhead negligible (<1% CPU)

**Verification**:
```bash
# Access metrics
curl http://localhost:4504/metrics

# Verify specific metrics
curl http://localhost:4504/metrics | grep agent_up
curl http://localhost:4504/metrics | grep agent_heartbeat_success_total

# Scrape with Prometheus
# prometheus.yml:
scrape_configs:
  - job_name: 'patchiq-agents'
    static_configs:
      - targets: ['localhost:4504']
```

---

### 2.3 Token Encryption at Rest (4-5 hours)

**Problem**: `credentials.json` stores access/refresh tokens in plaintext. Security risk if file system compromised.

**Solution**: Use OS-native secret storage for encryption.

**Files to Modify**:
```
Create: agent/internal/crypto/encryption.go (platform-specific)
Create: agent/internal/crypto/encryption_windows.go
Create: agent/internal/crypto/encryption_darwin.go
Create: agent/internal/crypto/encryption_linux.go
agent/internal/client/credentials.go (SaveCredentials, LoadCredentials)
```

**Implementation Steps**:

1. **Windows (DPAPI)**:
   ```go
   //go:build windows

   package crypto

   import (
       "golang.org/x/sys/windows"
   )

   func Encrypt(data []byte) ([]byte, error) {
       blob := windows.NewBlob(data)
       return windows.CryptProtectData(blob, nil, nil, 0, nil, 0)
   }

   func Decrypt(data []byte) ([]byte, error) {
       blob := windows.NewBlob(data)
       result, err := windows.CryptUnprotectData(blob, nil, nil, 0, nil, 0)
       if err != nil {
           return nil, err
       }
       return result.ToByteArray(), nil
   }
   ```

2. **macOS (Keychain)**:
   ```go
   //go:build darwin

   package crypto

   import (
       "github.com/keybase/go-keychain"
   )

   const (
       serviceName = "patchiq-agent"
       accountName = "credentials"
   )

   func Encrypt(data []byte) ([]byte, error) {
       item := keychain.NewItem()
       item.SetSecClass(keychain.SecClassGenericPassword)
       item.SetService(serviceName)
       item.SetAccount(accountName)
       item.SetData(data)
       item.SetSynchronizable(keychain.SynchronizableNo)
       item.SetAccessible(keychain.AccessibleWhenUnlocked)

       return nil, keychain.AddItem(item)
   }

   func Decrypt(data []byte) ([]byte, error) {
       query := keychain.NewItem()
       query.SetSecClass(keychain.SecClassGenericPassword)
       query.SetService(serviceName)
       query.SetAccount(accountName)
       query.SetMatchLimit(keychain.MatchLimitOne)
       query.SetReturnData(true)

       results, err := keychain.QueryItem(query)
       if err != nil {
           return nil, err
       }
       if len(results) == 0 {
           return nil, fmt.Errorf("credentials not found")
       }
       return results[0].Data, nil
   }
   ```

3. **Linux (encrypted file with machine key)**:
   ```go
   //go:build linux

   package crypto

   import (
       "crypto/aes"
       "crypto/cipher"
       "crypto/rand"
       "io"
       "os"
   )

   func getMachineKey() ([]byte, error) {
       // Use machine-id as encryption key
       data, err := os.ReadFile("/etc/machine-id")
       if err != nil {
           return nil, err
       }
       // Derive 32-byte key from machine-id
       hash := sha256.Sum256(data)
       return hash[:], nil
   }

   func Encrypt(data []byte) ([]byte, error) {
       key, err := getMachineKey()
       if err != nil {
           return nil, err
       }

       block, err := aes.NewCipher(key)
       if err != nil {
           return nil, err
       }

       gcm, err := cipher.NewGCM(block)
       if err != nil {
           return nil, err
       }

       nonce := make([]byte, gcm.NonceSize())
       if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
           return nil, err
       }

       return gcm.Seal(nonce, nonce, data, nil), nil
   }

   func Decrypt(data []byte) ([]byte, error) {
       key, err := getMachineKey()
       if err != nil {
           return nil, err
       }

       block, err := aes.NewCipher(key)
       if err != nil {
           return nil, err
       }

       gcm, err := cipher.NewGCM(block)
       if err != nil {
           return nil, err
       }

       nonceSize := gcm.NonceSize()
       nonce, ciphertext := data[:nonceSize], data[nonceSize:]
       return gcm.Open(nil, nonce, ciphertext, nil)
   }
   ```

4. **Update credentials.go**:
   ```go
   func SaveCredentials(dataDir string, creds *Credentials) error {
       plaintext, _ := json.Marshal(creds)

       encrypted, err := crypto.Encrypt(plaintext)
       if err != nil {
           log.Warn().Err(err).Msg("Encryption unavailable, falling back to plaintext")
           encrypted = plaintext
       }

       credPath := filepath.Join(dataDir, "credentials.json")
       return os.WriteFile(credPath, encrypted, 0600)
   }

   func LoadCredentials(dataDir string) (*Credentials, error) {
       credPath := filepath.Join(dataDir, "credentials.json")
       data, err := os.ReadFile(credPath)
       if err != nil {
           return nil, err
       }

       // Try decryption first
       decrypted, err := crypto.Decrypt(data)
       if err != nil {
           // Fallback: assume plaintext (for migration)
           log.Warn().Msg("Decryption failed, assuming plaintext (will re-encrypt)")
           decrypted = data
       }

       var creds Credentials
       if err := json.Unmarshal(decrypted, &creds); err != nil {
           return nil, err
       }

       // Re-encrypt if it was plaintext
       if err == nil && bytes.Equal(data, decrypted) {
           SaveCredentials(dataDir, &creds)
       }

       return &creds, nil
   }
   ```

**Testing**:
- Unit: Save/load credentials, verify round-trip
- Integration: Restart agent, verify credentials still work
- Security: Verify plaintext not in file (hexdump check)
- Migration: Start with plaintext file, verify auto-migration

**Success Criteria**:
- ✅ Credentials encrypted on disk (not readable as JSON)
- ✅ Decryption successful on agent restart
- ✅ Auto-migration from plaintext
- ✅ Fallback to plaintext if encryption unavailable (logged)

---

### 2.4 Job Persistence with SQLite (6-8 hours)

**Problem**: Job history stored in-memory, lost on agent restart. Limits audit capability.

**Solution**: Use SQLite for persistent job storage.

**Files to Modify**:
```
Create: agent/internal/storage/job_store.go
agent/internal/backend/backend.go (replace jobHistory slice)
agent/go.mod (add sqlite dependency)
```

**Implementation Steps**:

1. Add dependency:
   ```bash
   go get github.com/mattn/go-sqlite3
   ```

2. Create JobStore:
   ```go
   package storage

   import (
       "database/sql"
       "encoding/json"
       "time"

       _ "github.com/mattn/go-sqlite3"
       "github.com/patchify/agent/internal/models"
   )

   type JobStore struct {
       db *sql.DB
   }

   func NewJobStore(dbPath string) (*JobStore, error) {
       db, err := sql.Open("sqlite3", dbPath)
       if err != nil {
           return nil, err
       }

       // Create schema
       schema := `
       CREATE TABLE IF NOT EXISTS jobs (
           id TEXT PRIMARY KEY,
           type TEXT NOT NULL,
           payload TEXT,
           status TEXT NOT NULL,
           result TEXT,
           error_message TEXT,
           started_at TIMESTAMP NOT NULL,
           completed_at TIMESTAMP,
           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
       );

       CREATE INDEX IF NOT EXISTS idx_started_at ON jobs(started_at DESC);
       CREATE INDEX IF NOT EXISTS idx_status ON jobs(status);
       CREATE INDEX IF NOT EXISTS idx_type ON jobs(type);
       `

       if _, err := db.Exec(schema); err != nil {
           return nil, err
       }

       return &JobStore{db: db}, nil
   }

   func (s *JobStore) Save(job models.JobHistoryEntry) error {
       payloadJSON, _ := json.Marshal(job.Payload)
       resultJSON, _ := json.Marshal(job.Result)

       query := `
       INSERT OR REPLACE INTO jobs
       (id, type, payload, status, result, error_message, started_at, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       `

       _, err := s.db.Exec(query,
           job.ID, job.Type, string(payloadJSON), job.Status,
           string(resultJSON), job.ErrorMessage,
           job.StartedAt, job.CompletedAt,
       )
       return err
   }

   func (s *JobStore) Get(id string) (*models.JobHistoryEntry, error) {
       query := `SELECT id, type, payload, status, result, error_message, started_at, completed_at FROM jobs WHERE id = ?`

       var job models.JobHistoryEntry
       var payloadJSON, resultJSON string

       err := s.db.QueryRow(query, id).Scan(
           &job.ID, &job.Type, &payloadJSON, &job.Status,
           &resultJSON, &job.ErrorMessage,
           &job.StartedAt, &job.CompletedAt,
       )

       if err != nil {
           return nil, err
       }

       json.Unmarshal([]byte(payloadJSON), &job.Payload)
       json.Unmarshal([]byte(resultJSON), &job.Result)

       return &job, nil
   }

   func (s *JobStore) List(limit, offset int) ([]models.JobHistoryEntry, error) {
       query := `
       SELECT id, type, payload, status, result, error_message, started_at, completed_at
       FROM jobs
       ORDER BY started_at DESC
       LIMIT ? OFFSET ?
       `

       rows, err := s.db.Query(query, limit, offset)
       if err != nil {
           return nil, err
       }
       defer rows.Close()

       var jobs []models.JobHistoryEntry
       for rows.Next() {
           var job models.JobHistoryEntry
           var payloadJSON, resultJSON string

           err := rows.Scan(
               &job.ID, &job.Type, &payloadJSON, &job.Status,
               &resultJSON, &job.ErrorMessage,
               &job.StartedAt, &job.CompletedAt,
           )
           if err != nil {
               continue
           }

           json.Unmarshal([]byte(payloadJSON), &job.Payload)
           json.Unmarshal([]byte(resultJSON), &job.Result)

           jobs = append(jobs, job)
       }

       return jobs, nil
   }

   func (s *JobStore) Cleanup(retentionDays int) error {
       query := `DELETE FROM jobs WHERE started_at < ?`
       cutoff := time.Now().AddDate(0, 0, -retentionDays)
       _, err := s.db.Exec(query, cutoff)
       return err
   }

   func (s *JobStore) Close() error {
       return s.db.Close()
   }
   ```

3. Update backend.go:
   ```go
   type Manager struct {
       // Remove: jobHistory []JobHistoryEntry
       // Add:
       jobStore *storage.JobStore
   }

   func NewManager(config *config.Config, ...) (*Manager, error) {
       // Initialize job store
       dbPath := filepath.Join(config.DataDir, "jobs.db")
       jobStore, err := storage.NewJobStore(dbPath)
       if err != nil {
           return nil, err
       }

       m := &Manager{
           jobStore: jobStore,
           // ...
       }

       // Start cleanup task
       go m.cleanupJobsLoop()

       return m, nil
   }

   func (m *Manager) addJobHistory(job JobHistoryEntry) {
       // Old: append to slice
       // New: save to database
       if err := m.jobStore.Save(job); err != nil {
           log.Error().Err(err).Str("jobID", job.ID).Msg("Failed to save job")
       }
   }

   func (m *Manager) getJobHistory() []JobHistoryEntry {
       // Old: return m.jobHistory
       // New: query database
       jobs, err := m.jobStore.List(100, 0)
       if err != nil {
           log.Error().Err(err).Msg("Failed to get job history")
           return []JobHistoryEntry{}
       }
       return jobs
   }

   func (m *Manager) cleanupJobsLoop() {
       ticker := time.NewTicker(24 * time.Hour)
       defer ticker.Stop()

       for {
           select {
           case <-ticker.C:
               if err := m.jobStore.Cleanup(30); err != nil {
                   log.Error().Err(err).Msg("Failed to cleanup old jobs")
               } else {
                   log.Info().Msg("Cleaned up jobs older than 30 days")
               }
           case <-m.stopCh:
               return
           }
       }
   }
   ```

**Testing**:
- Unit: Save 1000 jobs, query with pagination, verify results
- Integration: Restart agent mid-command, verify job still in history
- Performance: Query 10,000 jobs in <100ms
- Cleanup: Verify jobs older than 30 days deleted

**Success Criteria**:
- ✅ Job history persists across restarts
- ✅ Database handles 10,000+ jobs efficiently
- ✅ Cleanup removes old jobs automatically
- ✅ SQLite file created in DataDir

**Verification**:
```bash
# Check database
sqlite3 ~/.patchify-agent/jobs.db "SELECT COUNT(*) FROM jobs"

# View recent jobs
sqlite3 ~/.patchify-agent/jobs.db "SELECT id, type, status FROM jobs ORDER BY started_at DESC LIMIT 10"

# Restart agent, verify jobs persist
./patchiq-agent &
PID=$!
kill $PID
./patchiq-agent --status
```

---

### 2.5 Enhanced Error Propagation (5-6 hours)

**Problem**: `ExecutionResult` only has `ErrorMessage` string. No structured error info, no retry classification.

**Solution**: Add error codes and retryable flag for intelligent error handling.

**Files to Modify**:
```
agent/internal/models/execution.go (ExecutionResult struct)
All executor files (15 files in executors/)
agent/internal/backend/backend.go (retry logic)
```

**Implementation Steps**:

1. Enhance ExecutionResult:
   ```go
   package models

   type ExecutionResult struct {
       Success      bool              `json:"success"`
       Message      string            `json:"message"`
       ErrorMessage string            `json:"errorMessage,omitempty"`
       ErrorCode    string            `json:"errorCode,omitempty"`
       Retryable    bool              `json:"retryable"`
       ExitCode     int               `json:"exitCode,omitempty"`
       Duration     int64             `json:"duration"`
       Output       string            `json:"output,omitempty"`
       Metadata     map[string]string `json:"metadata,omitempty"`
   }

   // Error codes
   const (
       ErrTimeout           = "TIMEOUT"
       ErrPermissionDenied  = "PERMISSION_DENIED"
       ErrDiskFull          = "DISK_FULL"
       ErrNetworkFailure    = "NETWORK_FAILURE"
       ErrChecksumMismatch  = "CHECKSUM_MISMATCH"
       ErrScriptNotFound    = "SCRIPT_NOT_FOUND"
       ErrDependencyMissing = "DEPENDENCY_MISSING"
       ErrInvalidPayload    = "INVALID_PAYLOAD"
       ErrPackageNotFound   = "PACKAGE_NOT_FOUND"
       ErrServiceUnavailable = "SERVICE_UNAVAILABLE"
   )

   // IsRetryable determines if error code warrants retry
   func IsRetryableError(code string) bool {
       retryable := map[string]bool{
           ErrTimeout:            true,
           ErrNetworkFailure:     true,
           ErrServiceUnavailable: true,
           ErrDiskFull:           false,
           ErrPermissionDenied:   false,
           ErrChecksumMismatch:   false,
           ErrScriptNotFound:     false,
           ErrInvalidPayload:     false,
       }
       return retryable[code]
   }
   ```

2. Update executors to set error codes (example for script_executor.go):
   ```go
   func (e *ScriptExecutor) ExecuteBundle(ctx context.Context, req ScriptBundleRequest) models.ExecutionResult {
       start := time.Now()
       result := models.ExecutionResult{Duration: 0}

       // Download bundle
       bundlePath, err := e.downloadBundle(ctx, req.BundleURL, req.BundleChecksum)
       if err != nil {
           if errors.Is(err, context.DeadlineExceeded) {
               result.ErrorCode = models.ErrTimeout
               result.Retryable = true
           } else if isNetworkError(err) {
               result.ErrorCode = models.ErrNetworkFailure
               result.Retryable = true
           } else if strings.Contains(err.Error(), "checksum") {
               result.ErrorCode = models.ErrChecksumMismatch
               result.Retryable = false
           } else {
               result.ErrorCode = "DOWNLOAD_FAILED"
               result.Retryable = true
           }
           result.Success = false
           result.ErrorMessage = err.Error()
           result.Duration = time.Since(start).Milliseconds()
           return result
       }

       // ... rest of execution

       result.Duration = time.Since(start).Milliseconds()
       return result
   }
   ```

3. Add retry logic in backend.go:
   ```go
   func (m *Manager) executeCommandWithRetry(cmd client.PendingCommand) models.ExecutionResult {
       maxRetries := 3
       var result models.ExecutionResult

       for attempt := 1; attempt <= maxRetries; attempt++ {
           result = m.executeCommand(cmd)

           if result.Success {
               return result
           }

           // Check if retryable
           if !models.IsRetryableError(result.ErrorCode) && !result.Retryable {
               log.Warn().
                   Str("commandID", cmd.ID).
                   Str("errorCode", result.ErrorCode).
                   Msg("Error not retryable, failing immediately")
               return result
           }

           if attempt < maxRetries {
               backoff := time.Duration(attempt*attempt) * time.Second
               log.Info().
                   Str("commandID", cmd.ID).
                   Str("errorCode", result.ErrorCode).
                   Int("attempt", attempt).
                   Dur("backoff", backoff).
                   Msg("Retrying command after error")
               time.Sleep(backoff)
           }
       }

       return result
   }
   ```

**Testing**:
- Unit: Trigger each error code, verify classification
- Integration: Simulate network error, verify 3 retries
- E2E: Simulate permission error, verify no retry (permanent failure)

**Success Criteria**:
- ✅ All error codes defined and documented
- ✅ Retryable flag set correctly for each error type
- ✅ Backend retries transient errors (max 3 attempts)
- ✅ Permanent errors fail immediately (no retry)

---

## Priority 3 & 4: Medium Priority and Code Quality (14-18 hours)

### 3.1 Command Batching & Prioritization (2-3 hours)

**Implementation**: Define priority map, sort commands before queueing, worker pool processes high-priority first.

### 3.2 WebUI Authentication (3-4 hours)

**Implementation**: HTTP Basic Auth middleware, bcrypt password hashing, disabled by default.

### 3.3 Setup Wizard Validation (2-3 hours)

**Implementation**: Add validateURL/validatePort functions, re-prompt on invalid input, test connectivity.

### 3.4 Telemetry SSE (3-4 hours)

**Implementation**: Add `/api/telemetry/stream` endpoint, update WebUI to use EventSource.

### 3.5 Download Progress Tracking (3-4 hours)

**Implementation**: Add DownloadProgress tracker, expose `/api/downloads` endpoint, WebUI polls for progress.

### 4.1 Service Code Deduplication (1-2 hours)

**Implementation**: Extract ServiceManager interface, platform-specific implementations, factory function.

### 4.2 Godoc Comments (4-5 hours)

**Implementation**: Run golangci-lint with godot, add comments to all exported functions.

### 4.3 Extract Setup Wizard (1 hour)

**Implementation**: Move runSetupWizard to separate setup.go file.

### 4.4 Unit Tests (8-10 hours)

**Implementation**: Create test files for backend, client, executors. Target 60% coverage.

---

## Testing & Validation (8-10 hours)

### Platform-Specific Testing

**Windows**:
- [ ] Install as Windows Service
- [ ] Windows Update patching
- [ ] winget, choco, msi, exe installs
- [ ] RDP remote access
- [ ] All 7 collectors
- [ ] Metrics endpoint

**Linux**:
- [ ] apt/dnf/yum patching
- [ ] snap/flatpak installs
- [ ] VNC remote access
- [ ] All 7 collectors
- [ ] Systemd integration

**macOS**:
- [ ] softwareupdate patching
- [ ] brew/pkg/dmg/mas installs
- [ ] Screen Sharing
- [ ] Apple Silicon support
- [ ] All 7 collectors

### Integration Testing

- [ ] Registration flow
- [ ] Heartbeat with backoff
- [ ] Command queue (100 concurrent)
- [ ] Inventory deduplication
- [ ] Token refresh
- [ ] Graceful shutdown
- [ ] Job persistence across restarts

### Load Testing

- [ ] 100 concurrent commands
- [ ] 10GB file download
- [ ] 24-hour continuous operation
- [ ] Memory leak detection (heap profiling)

---

## Success Criteria

### Reliability
- ✅ Zero hung commands (all timeout correctly)
- ✅ Clean shutdowns within 30s (100% of SIGTERM)
- ✅ All command results reported (0% silent failures)
- ✅ Heartbeat reconnects after outages

### Observability
- ✅ Prometheus metrics available 24/7
- ✅ Structured logs parseable by jq/Splunk
- ✅ Job history retained for 30 days
- ✅ Error codes classify all failures

### Performance
- ✅ Bandwidth reduced 75% (inventory deduplication)
- ✅ Metrics overhead < 1% CPU
- ✅ Command queue processes 100+ concurrent
- ✅ SQLite queries < 100ms (10k jobs)

### Quality
- ✅ 60% unit test coverage
- ✅ Zero godoc linter errors
- ✅ All platforms verified functional
- ✅ No regressions in existing functionality

---

## Rollout Strategy

1. **Staging Deployment** (Priority 1)
   - Deploy to 3-5 test agents
   - Monitor for 3 days
   - Validate timeout, backoff, shutdown

2. **Staging Deployment** (Priority 2)
   - Add observability features
   - Set up Prometheus scraping
   - Validate structured logs

3. **Canary Release** (10% production)
   - Monitor metrics for 1 week
   - Compare error rates vs baseline
   - Validate all platforms

4. **Full Rollout** (100% production)
   - Gradual rollout over 2 weeks
   - Monitor dashboards continuously
   - Ready to rollback on issues

---

## Documentation Updates

1. **README.md**:
   - New config options
   - Metrics endpoint documentation
   - Troubleshooting guide

2. **OPERATIONS.md** (new):
   - Deployment guide
   - Monitoring setup
   - Alert thresholds

3. **DEVELOPMENT.md** (new):
   - Testing guide
   - Contribution guidelines
   - Architecture overview

---

## References

- **Plan File**: `/Users/shandesh/.claude/plans/peaceful-finding-coral.md`
- **Analysis Reports**: See exploration agent outputs
- **Critical Files**: See plan for full list of files to modify

---

**Next Steps**: Start implementation with Priority 1, Task #1 (Command Timeout Enforcement)
