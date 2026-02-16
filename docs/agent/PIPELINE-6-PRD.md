# Pipeline 6: Self-Update Hardening

## Overview

- **Priority:** Medium-High
- **Estimated Effort:** 24-29 hours
- **Dependencies:** Pipeline 1 (rollback mechanism must exist)
- **Platform Scope:** All (Windows, Linux, macOS)
- **Target Completion:** Week 4
- **Current Completion:** 80%

## Business Justification

**Self-update is critical for agent lifecycle management.** A broken self-update mechanism means:
- Manual updates required (operational burden)
- Agents stuck on old versions (security risk)
- Failed updates leave agents in broken state
- No ability to patch critical security bugs quickly

**Current State:**
- Basic self-update implemented
- Rollback mechanism exists but untested
- No phased rollout support
- Service restart logic is basic
- No update verification beyond checksum

**Target State:**
- Robust rollback on failed updates
- Phased rollout support (canary, staged)
- Graceful service restart
- Pre-update and post-update validation
- Rollback on corruption or crash

**Value Delivered:**
- Zero-downtime updates
- Safe rollback on failures
- Gradual rollout reduces risk
- Production confidence for updates

---

## Requirements

### R1: Rollback Testing & Hardening

**Description:** Thoroughly test and harden the existing rollback mechanism

**Acceptance Criteria:**
- [ ] Test rollback on failed update
- [ ] Test rollback on corrupted binary
- [ ] Test rollback on service crash after update
- [ ] Test rollback persistence across reboots
- [ ] Add pre-update snapshot of config files
- [ ] Add post-update validation (health check)
- [ ] Add rollback timeout (auto-rollback after 5 minutes if unhealthy)
- [ ] Document rollback scenarios

**Platform:** All
**Priority:** Must Have
**Estimated Hours:** 6-8

---

### R2: Phased Rollout Support

**Description:** Add support for canary and staged rollouts

**Acceptance Criteria:**
- [ ] Agent sends deployment group to backend
- [ ] Backend API supports rollout groups (canary, beta, stable)
- [ ] Agent only updates if in target rollout group
- [ ] Support percentage-based rollouts (e.g., 10%, 50%, 100%)
- [ ] Support manual rollout group override
- [ ] Log rollout group membership
- [ ] Document phased rollout configuration

**Platform:** All
**Priority:** Should Have
**Estimated Hours:** 6-8

---

### R3: Service Restart Handling

**Description:** Improve service restart logic for seamless updates

**Acceptance Criteria:**
- [ ] Windows: Service restart via `sc stop` and `sc start`
- [ ] macOS: LaunchAgent restart via `launchctl`
- [ ] Linux: systemd restart via `systemctl restart`
- [ ] Graceful shutdown (wait for in-flight operations)
- [ ] Connection drainage (finish pending HTTP requests)
- [ ] Restart timeout (fail if restart takes > 2 minutes)
- [ ] Log restart events to Event Log (Windows) or syslog (Linux/macOS)

**Platform:** All
**Priority:** Must Have
**Estimated Hours:** 4-6

---

### R4: Update Verification

**Description:** Add comprehensive update verification steps

**Acceptance Criteria:**
- [ ] Pre-update: Verify disk space (>500MB free)
- [ ] Pre-update: Verify network connectivity
- [ ] Download: Verify checksum (already implemented in Pipeline 1)
- [ ] Post-download: Verify binary is executable
- [ ] Post-download: Verify binary version matches expected
- [ ] Post-update: Health check (HTTP /health endpoint)
- [ ] Post-update: Verify agent can connect to backend
- [ ] Rollback if any verification fails

**Platform:** All
**Priority:** Must Have
**Estimated Hours:** 4-6

---

### R5: Rollback on Corruption

**Description:** Detect and rollback corrupted binaries automatically

**Acceptance Criteria:**
- [ ] Verify binary signature after download (if signed)
- [ ] Detect truncated downloads (partial file)
- [ ] Detect corrupted binaries (checksum mismatch)
- [ ] Auto-rollback on corruption detection
- [ ] Keep 2 previous versions for rollback
- [ ] Log corruption details for debugging
- [ ] Alert backend on corruption events

**Platform:** All
**Priority:** Must Have
**Estimated Hours:** 3-4

---

### R6: Update Logging & Observability

**Description:** Add comprehensive logging for update operations

**Acceptance Criteria:**
- [ ] Log update initiation (version, source)
- [ ] Log download progress (percentage)
- [ ] Log verification steps (checksum, signature, etc.)
- [ ] Log service restart events
- [ ] Log rollback triggers and outcomes
- [ ] Structured logging with correlation IDs
- [ ] Send update metrics to backend (success rate, duration)

**Platform:** All
**Priority:** Should Have
**Estimated Hours:** 3-4

---

### R7: Emergency Rollback CLI

**Description:** Add CLI command for manual emergency rollback

**Acceptance Criteria:**
- [ ] CLI command: `patchiq-agent rollback`
- [ ] List available rollback versions
- [ ] Rollback to specific version
- [ ] Rollback to previous version (default)
- [ ] Require confirmation (unless `--force` flag)
- [ ] Log rollback action to backend
- [ ] Document rollback CLI in user guide

**Platform:** All
**Priority:** Should Have
**Estimated Hours:** 2-3

---

## Technical Approach

### Rollback State Management

**File: `agent/internal/update/rollback_state.go`**

```go
package update

import (
    "encoding/json"
    "os"
    "time"
)

type RollbackState struct {
    CurrentVersion     string    `json:"currentVersion"`
    PreviousVersion    string    `json:"previousVersion"`
    PreviousBinaryPath string    `json:"previousBinaryPath"`
    UpdateStartedAt    time.Time `json:"updateStartedAt"`
    HealthCheckFailed  bool      `json:"healthCheckFailed"`
    RollbackReason     string    `json:"rollbackReason"`
}

func SaveRollbackState(state *RollbackState) error {
    data, _ := json.Marshal(state)
    return os.WriteFile("/var/lib/patchiq-agent/rollback.json", data, 0600)
}

func LoadRollbackState() (*RollbackState, error) {
    data, err := os.ReadFile("/var/lib/patchiq-agent/rollback.json")
    if err != nil {
        return nil, err
    }
    var state RollbackState
    json.Unmarshal(data, &state)
    return &state, nil
}
```

---

### Update Flow with Rollback

```
1. Pre-Update Checks
   ├── Check disk space (>500MB)
   ├── Check network connectivity
   └── Backup current binary

2. Download New Version
   ├── Download from backend
   ├── Verify checksum
   ├── Verify signature (if signed)
   └── Save to temp directory

3. Pre-Deployment Validation
   ├── Verify binary is executable
   ├── Verify version matches expected
   └── Test binary execution (--version flag)

4. Deploy Update
   ├── Save rollback state
   ├── Stop current service
   ├── Replace binary
   ├── Start new service
   └── Wait for startup (max 2 minutes)

5. Post-Update Validation
   ├── HTTP health check (/health)
   ├── Backend connectivity test
   ├── Verify heartbeat success
   └── Auto-rollback if fails within 5 minutes

6. Finalize Update
   ├── Delete rollback state
   ├── Clean up old binaries (keep last 2)
   ├── Log success to backend
   └── Update local version file
```

---

### Phased Rollout Configuration

**Backend API:** `/v1/agent-versions/current`

**Request:**
```json
{
  "agentId": "agent-123",
  "currentVersion": "1.0.0",
  "platform": "linux",
  "architecture": "amd64",
  "deploymentGroup": "production"  // canary, beta, production
}
```

**Response:**
```json
{
  "latestVersion": "1.2.3",
  "shouldUpdate": true,
  "rolloutGroup": "canary",
  "rolloutPercentage": 10,
  "downloadUrl": "https://...",
  "checksum": "abc123..."
}
```

**Agent Logic:**
```go
// Check if agent should update based on rollout group
func ShouldUpdate(agentID string, rolloutPercentage int) bool {
    // Hash agent ID to get consistent assignment
    hash := sha256.Sum256([]byte(agentID))
    bucket := int(hash[0]) % 100  // 0-99

    // Update if agent falls into rollout percentage
    return bucket < rolloutPercentage
}
```

---

### Service Restart per Platform

**Windows (Service):**
```go
func RestartService() error {
    cmd := exec.Command("sc", "stop", "PatchIQAgent")
    cmd.Run()
    time.Sleep(2 * time.Second)
    cmd = exec.Command("sc", "start", "PatchIQAgent")
    return cmd.Run()
}
```

**macOS (LaunchAgent):**
```bash
#!/bin/bash
# Restart via launchctl
launchctl unload ~/Library/LaunchAgents/io.patchiq.agent.plist
sleep 2
launchctl load ~/Library/LaunchAgents/io.patchiq.agent.plist
```

**Linux (systemd):**
```bash
#!/bin/bash
# Restart via systemctl
systemctl restart patchiq-agent
```

---

### Health Check Endpoint

**File: `agent/internal/server/server.go`**

```go
// Add /health endpoint
func (s *Server) healthHandler(w http.ResponseWriter, r *http.Request) {
    status := map[string]interface{}{
        "healthy": true,
        "version": version.Version,
        "uptime":  time.Since(s.startTime).Seconds(),
        "backend": s.backend.IsConnected(),
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(status)
}
```

**Post-Update Health Check:**
```go
func HealthCheck(timeout time.Duration) error {
    ctx, cancel := context.WithTimeout(context.Background(), timeout)
    defer cancel()

    req, _ := http.NewRequestWithContext(ctx, "GET", "http://localhost:4504/health", nil)
    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return fmt.Errorf("health check failed: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != 200 {
        return fmt.Errorf("health check failed: status %d", resp.StatusCode)
    }

    var health map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&health)

    if healthy, ok := health["healthy"].(bool); !ok || !healthy {
        return fmt.Errorf("agent unhealthy")
    }

    return nil
}
```

---

## Implementation Plan

### Task 6.1: Rollback Testing & Hardening (6-8 hours)

**Owner:** Teammate 3
**Files:**
- `agent/internal/update/rollback.go` (enhance)
- `agent/test/integration/update_rollback_test.go` (new)

**Steps:**
1. Test rollback on failed update
2. Test rollback on corrupted binary
3. Test rollback persistence across reboots
4. Add config file snapshot
5. Add post-update validation
6. Add auto-rollback timeout
7. Write integration tests
8. Document rollback scenarios

---

### Task 6.2: Phased Rollout Support (6-8 hours)

**Owner:** Teammate 3
**Files:**
- `agent/internal/update/rollout.go` (new)
- `backend/src/modules/agent-versions/rollout.service.ts` (new)
- `agent/internal/config/config.go` (add DeploymentGroup field)

**Steps:**
1. Add DeploymentGroup to agent config
2. Implement ShouldUpdate() logic (hash-based)
3. Backend API: Add rollout group support
4. Agent: Check rollout before update
5. Write unit tests
6. Document phased rollout

---

### Task 6.3: Service Restart Handling (4-6 hours)

**Owner:** Teammate 3
**Files:**
- `agent/internal/service/restart_windows.go` (new)
- `agent/internal/service/restart_darwin.go` (new)
- `agent/internal/service/restart_linux.go` (new)

**Steps:**
1. Implement Windows service restart
2. Implement macOS LaunchAgent restart
3. Implement Linux systemd restart
4. Add graceful shutdown
5. Add restart timeout
6. Test on each platform
7. Document restart process

---

### Task 6.4: Update Verification (4-6 hours)

**Owner:** Teammate 3
**Files:**
- `agent/internal/update/verification.go` (new)

**Steps:**
1. Implement pre-update checks (disk space, network)
2. Implement post-download verification (executable, version)
3. Implement post-update health check
4. Add backend connectivity test
5. Rollback on verification failure
6. Write unit tests
7. Document verification steps

---

### Task 6.5: Rollback on Corruption (3-4 hours)

**Owner:** Teammate 3
**Files:**
- `agent/internal/update/corruption_detection.go` (new)

**Steps:**
1. Detect truncated downloads
2. Detect checksum mismatches (already exists)
3. Detect signature verification failures
4. Auto-rollback on corruption
5. Keep 2 previous versions
6. Log corruption events
7. Alert backend

---

### Task 6.6: Update Logging & Observability (3-4 hours)

**Owner:** Teammate 3
**Files:**
- `agent/internal/update/update.go` (add logging)
- `agent/internal/metrics/metrics.go` (add update metrics)

**Steps:**
1. Add structured logging to update flow
2. Add correlation IDs
3. Add download progress logging
4. Add metrics (update_success, update_duration, rollback_count)
5. Send metrics to backend
6. Document logging format

---

### Task 6.7: Emergency Rollback CLI (2-3 hours)

**Owner:** Teammate 3
**Files:**
- `agent/cmd/agent/main.go` (add rollback command)
- `agent/docs/CLI-REFERENCE.md` (document)

**Steps:**
1. Add `rollback` subcommand
2. List available rollback versions
3. Rollback to specific version
4. Add confirmation prompt
5. Log to backend
6. Write unit tests
7. Document CLI usage

---

## Parallelization Strategy

```
Week 1-2 (Sequential - single teammate):
└── Teammate 3: All tasks
    ├── Task 6.1: Rollback testing (6-8h)
    ├── Task 6.2: Phased rollout (6-8h)
    ├── Task 6.3: Service restart (4-6h)
    ├── Task 6.4: Update verification (4-6h)
    ├── Task 6.5: Corruption detection (3-4h)
    ├── Task 6.6: Logging (3-4h)
    └── Task 6.7: CLI rollback (2-3h)
    Total: 28-39 hours
```

**Total: 28-39 hours with 1 teammate**
**Timeline: ~2 weeks (runs in parallel with Pipeline 4)**

---

## Exit Criteria

- [ ] Rollback mechanism tested on all platforms
- [ ] Phased rollout support working
- [ ] Service restart works on all platforms
- [ ] Pre-update and post-update validation working
- [ ] Auto-rollback on corruption
- [ ] Update logging comprehensive
- [ ] Emergency rollback CLI working
- [ ] Integration tests passing

---

## Test Metrics

**Test Scenarios:**
- Failed update → rollback success
- Corrupted binary → rollback success
- Service crash post-update → rollback success
- Phased rollout (10%, 50%, 100%)
- Service restart on all platforms
- Health check failure → rollback

**Test Count:** 15+ integration tests

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Service restart fails | High | Add restart timeout, fallback to manual restart |
| Rollback leaves agent broken | Critical | Keep 2 previous versions, test thoroughly |
| Phased rollout bugs | Medium | Start with 1% rollout, monitor closely |
| Update during active deployment | Medium | Graceful shutdown, wait for operations to finish |

---

## Dependencies

**Internal:**
- Pipeline 1 complete (rollback mechanism exists)
- Pipeline 4 (optional, for signature verification)

**External:**
- Service manager (systemd, launchd, Windows Service)

---

## Timeline

- **Planning:** 3 hours
- **Implementation:** 28-39 hours (with 1 teammate)
- **Testing:** 6 hours
- **QA:** 3 hours
- **Buffer:** 5 hours
- **Total:** 29 hours = **2 weeks** with 1 teammate (runs in parallel with Pipeline 4)

---

## Success Metrics

- **Rollback Success Rate:** 100% in test scenarios
- **Update Success Rate:** 95%+ in production
- **Service Restart:** < 30 seconds downtime
- **Health Check:** Passes within 5 minutes post-update

---

**Document Status:** APPROVED
**Last Updated:** 2026-02-14
**Implementation Start:** Now (runs in parallel with Pipeline 4)
