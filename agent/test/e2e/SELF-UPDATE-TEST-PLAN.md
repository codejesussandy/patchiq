# Self-Update Test Plan

## Overview

This document outlines the comprehensive test plan for validating the PatchIQ agent self-update mechanism. Self-update is a critical feature that allows agents to update themselves without manual intervention, enabling seamless feature rollouts and security patches.

**Testing Priority:** Must Have
**Estimated Time:** 6-8 hours
**Platforms:** All (Windows, macOS, Linux)

---

## Test Scenarios

### Scenario 1: Basic Self-Update (v1.0.0 → v1.1.0)

**Objective:** Verify successful update from one version to the next

**Prerequisites:**
- Agents running v1.0.0
- Update manifest published for v1.1.0
- v1.1.0 binaries available in MinIO

**Test Steps:**
1. Deploy v1.0.0 agents on all platforms
2. Verify agents are running and healthy
3. Publish update manifest for v1.1.0
4. Wait for agents to detect update (check interval: 5 minutes)
5. Monitor update process via logs and backend API
6. Verify agents restart with v1.1.0
7. Verify agents re-register successfully
8. Verify no data loss (configuration, logs)

**Expected Results:**
- Update manifest downloaded and parsed correctly
- Binary checksum validated
- Signature verified (when signed)
- Old binary backed up
- New binary installed
- Service restarted automatically
- Agent version updated in backend
- No downtime > 10 seconds
- Configuration preserved
- Logs intact

**Success Criteria:**
- 100% of agents update successfully
- No service interruption > 10 seconds
- All agents reconnect within 30 seconds
- Version number reflects v1.1.0

---

### Scenario 2: Phased Rollout (10% → 50% → 100%)

**Objective:** Verify phased rollout mechanism prevents mass failures

**Prerequisites:**
- 30+ agents running v1.0.0
- Update manifest configured for phased rollout
- Rollout percentages: 10%, 50%, 100%

**Test Steps:**

**Phase 1: 10% Rollout**
1. Publish manifest with `rollout_percentage: 10`
2. Wait 10 minutes
3. Verify ~3 agents (10% of 30) updated
4. Verify agent bucketing is consistent (same agents always in 10%)
5. Monitor for errors

**Phase 2: 50% Rollout**
1. Update manifest to `rollout_percentage: 50`
2. Wait 10 minutes
3. Verify ~15 agents (50% of 30) updated
4. Verify original 10% agents still in rollout group
5. Monitor for errors

**Phase 3: 100% Rollout**
1. Update manifest to `rollout_percentage: 100`
2. Wait 10 minutes
3. Verify all 30 agents updated
4. Verify no agents left behind

**Expected Results:**
- Agent bucketing is deterministic (based on agent ID hash)
- Same agents always selected for given percentage
- Percentages are approximate (±5%)
- No race conditions
- Rollout groups expand progressively (10% ⊂ 50% ⊂ 100%)

**Success Criteria:**
- Rollout percentages accurate within ±5%
- Agent bucketing consistent across checks
- No agents update outside their rollout group
- All agents eventually updated at 100%

---

### Scenario 3: Failed Update Rollback

**Objective:** Verify automatic rollback on update failure

**Prerequisites:**
- Agents running v1.0.0
- Intentionally broken v1.1.0 binary (corrupt checksum)

**Test Steps:**
1. Publish manifest with incorrect checksum
2. Wait for agents to attempt update
3. Verify checksum validation fails
4. Verify agents do NOT install broken binary
5. Verify agents remain on v1.0.0
6. Verify service continues running
7. Check logs for rollback messages

**Expected Results:**
- Checksum validation detects mismatch
- Update aborted before binary replacement
- Agent remains on v1.0.0
- Service never stops
- Error logged but agent healthy
- Backend notified of update failure

**Success Criteria:**
- No agents install corrupt binary
- 100% of agents remain functional
- Error rate reported to backend
- Logs show clear failure reason

---

### Scenario 4: Update Manifest Verification

**Objective:** Verify manifest parsing and validation

**Prerequisites:**
- Update manifest server running
- Sample manifests (valid and invalid)

**Test Steps:**
1. Publish valid manifest
2. Verify agents download and parse correctly
3. Publish manifest with missing fields
4. Verify agents reject invalid manifest
5. Publish manifest with invalid signature (when signed)
6. Verify agents reject unsigned/invalid manifests
7. Test manifest with unsupported platform
8. Verify agents skip updates for other platforms

**Expected Results:**
- Valid manifests accepted
- Invalid manifests rejected
- Signature verification enforced (when enabled)
- Platform filtering works
- Architecture filtering works (amd64 vs arm64)

**Success Criteria:**
- Schema validation catches all invalid manifests
- No agents crash on malformed manifests
- Signature verification prevents tampering
- Platform-specific updates only applied to matching agents

---

### Scenario 5: Update During Active Deployment

**Objective:** Verify update doesn't interfere with active deployments

**Prerequisites:**
- Agent running v1.0.0
- Long-running deployment in progress
- Update available

**Test Steps:**
1. Start a long deployment (10+ minute package install)
2. During deployment, publish update manifest
3. Verify agent defers update until deployment completes
4. Wait for deployment to finish
5. Verify agent updates after deployment success
6. Verify deployment result preserved

**Expected Results:**
- Update postponed during active deployment
- Deployment completes successfully
- Update proceeds after deployment
- No deployment state corruption

**Success Criteria:**
- Deployment success not affected
- Update deferred until safe
- No race conditions
- Deployment results logged correctly

---

### Scenario 6: Service Restart Health Check

**Objective:** Verify service restarts cleanly after update

**Prerequisites:**
- Agents running v1.0.0
- Update to v1.1.0 available
- Backend monitoring health checks

**Test Steps:**
1. Monitor pre-update health (heartbeat, inventory)
2. Trigger update
3. Monitor service restart
4. Measure downtime
5. Verify agent re-registers
6. Verify heartbeat resumes
7. Check for orphaned processes
8. Verify file handles closed properly

**Expected Results:**
- Service stops gracefully
- New service starts successfully
- Downtime < 10 seconds
- No orphaned processes
- No file descriptor leaks
- Configuration reloaded correctly
- TLS connections re-established

**Success Criteria:**
- Downtime < 10 seconds
- Health check passes within 30 seconds
- No zombie processes
- No resource leaks

---

### Scenario 7: Binary Backup and Restore

**Objective:** Verify old binary backed up for manual rollback

**Prerequisites:**
- Agent running v1.0.0
- Update to v1.1.0 available

**Test Steps:**
1. Note v1.0.0 binary location and checksum
2. Trigger update to v1.1.0
3. Verify old binary backed up to `/opt/patchiq/backups/` (Linux/macOS) or `C:\ProgramData\PatchIQ\backups\` (Windows)
4. Verify backup filename includes version and timestamp
5. Verify backup binary checksum matches original
6. Manually restore from backup
7. Verify service runs with restored binary

**Expected Results:**
- Old binary backed up before replacement
- Backup filename: `patchiq-agent-v1.0.0-<timestamp>` (Linux/macOS) or `patchiq-agent-v1.0.0-<timestamp>.exe` (Windows)
- Backup directory created if not exists
- Backup retains execute permissions
- Manual restore works

**Success Criteria:**
- Backup created for every update
- Backup binary is valid and executable
- Restore procedure documented
- Old backups cleaned up (keep last 3 versions)

---

### Scenario 8: Cross-Platform Update

**Objective:** Verify updates work on all supported platforms

**Prerequisites:**
- Agents on Windows, macOS, Linux
- Platform-specific binaries in MinIO
- Manifest with all platform entries

**Test Steps:**
1. Deploy v1.0.0 on Windows, macOS (Intel/ARM), Ubuntu, RHEL
2. Publish universal manifest with all platforms
3. Verify each platform downloads correct binary
4. Verify architecture matching (amd64 vs arm64)
5. Verify platform-specific execution permissions
6. Verify service restart mechanism per platform

**Expected Results:**
- Windows downloads `.exe` from manifest
- macOS Intel downloads `darwin-amd64` binary
- macOS ARM downloads `darwin-arm64` binary
- Linux downloads `linux-amd64` binary
- Execute permissions set correctly
- Service restart uses platform-specific method (sc.exe, launchctl, systemctl)

**Success Criteria:**
- No platform installs wrong binary
- No architecture mismatches
- All platforms restart successfully
- Platform-specific quirks handled

---

### Scenario 9: Update Frequency and Timing

**Objective:** Verify update check interval respects configuration

**Prerequisites:**
- Agents with configurable update check interval
- Default: 5 minutes

**Test Steps:**
1. Configure agent with 1-minute check interval
2. Publish update manifest
3. Verify agent checks within 1-2 minutes
4. Reconfigure agent with 60-minute interval
5. Publish new update
6. Verify agent waits ~60 minutes before checking
7. Test with randomized jitter

**Expected Results:**
- Check interval respected
- Jitter prevents thundering herd (±10% randomization)
- Manual update check available via API
- Update check doesn't block other operations

**Success Criteria:**
- Check interval configurable
- Jitter implemented (prevents all agents checking simultaneously)
- Manual check works
- No performance impact from checks

---

### Scenario 10: Network Failure During Update

**Objective:** Verify graceful handling of network failures

**Prerequisites:**
- Agent running v1.0.0
- Update available
- Network simulation tool (tc, pfctl)

**Test Steps:**
1. Start update download
2. Simulate network interruption (drop packets)
3. Verify download retries
4. Restore network
5. Verify download resumes or restarts
6. Verify agent doesn't install partial binary
7. Verify agent remains healthy on v1.0.0

**Expected Results:**
- Download retries with exponential backoff
- Partial downloads cleaned up
- Checksum prevents partial installs
- Agent remains operational
- Update retries later

**Success Criteria:**
- No service disruption from network issues
- Retries succeed when network restored
- No partial/corrupt binaries installed
- Agent logs network errors clearly

---

## Test Data Requirements

### Update Manifests

**Valid Manifest (v1.1.0):**
```json
{
  "version": "1.1.0",
  "releaseDate": "2026-02-14T00:00:00Z",
  "platforms": {
    "windows": {
      "amd64": {
        "url": "https://minio/updates/patchiq-agent-windows-amd64-v1.1.0.exe",
        "checksum": "sha256:abc123...",
        "size": 20971520
      }
    },
    "darwin": {
      "amd64": {
        "url": "https://minio/updates/patchiq-agent-darwin-amd64-v1.1.0",
        "checksum": "sha256:def456...",
        "size": 19922944
      },
      "arm64": {
        "url": "https://minio/updates/patchiq-agent-darwin-arm64-v1.1.0",
        "checksum": "sha256:ghi789...",
        "size": 18874368
      }
    },
    "linux": {
      "amd64": {
        "url": "https://minio/updates/patchiq-agent-linux-amd64-v1.1.0",
        "checksum": "sha256:jkl012...",
        "size": 21495808
      }
    }
  },
  "rolloutPercentage": 10,
  "minVersion": "1.0.0",
  "critical": false,
  "changelog": "Bug fixes and performance improvements"
}
```

**Invalid Manifests (for testing):**
- Missing version field
- Invalid checksum format
- Missing platform
- Malformed JSON
- Invalid signature

### Test Binaries

**Versions Needed:**
- v1.0.0 (baseline)
- v1.1.0 (update target)
- v1.0.5 (rollback test)
- v1.2.0 (multi-hop update)

**Platform Binaries:**
- Windows: `.exe` (code-signed)
- macOS: Mach-O (notarized)
- Linux: ELF (no special signing)

---

## Metrics to Collect

**Update Performance:**
- Time to detect update (seconds)
- Time to download binary (seconds)
- Time to verify checksum (milliseconds)
- Service downtime (seconds)
- Time to re-register (seconds)

**Update Success Rates:**
- Overall success rate (target: 100%)
- Per-platform success rate
- Retry success rate
- Rollback success rate

**Error Rates:**
- Checksum failures
- Download failures
- Service restart failures
- Registration failures

---

## Edge Cases to Test

1. **Disk Space Exhaustion:**
   - Update fails if insufficient disk space
   - Error message clear
   - Agent remains healthy

2. **Permissions Issues:**
   - Update fails if binary not writable
   - Service can't restart if permissions wrong
   - Clear error messages

3. **Concurrent Updates:**
   - Multiple agents updating simultaneously
   - Backend handles load
   - No download bottlenecks

4. **Version Downgrades:**
   - Manifest with lower version ignored
   - Only upgrades allowed
   - Downgrades require manual intervention

5. **Same Version Update:**
   - Manifest with same version skipped
   - No unnecessary restarts

6. **Very Large Binaries:**
   - Test with 100+ MB binary
   - Progress tracking works
   - Timeout handling

---

## Test Environment Setup

**Backend Requirements:**
- Update manifest endpoint (`/api/v1/agent-versions/current`)
- MinIO with update binaries
- Monitoring dashboard for tracking updates

**Agent Configuration:**
- Update check interval: 1 minute (for testing)
- Update manifest URL configured
- TLS verification enabled

**Monitoring Tools:**
- Backend API for agent status
- Log aggregation (track update progress)
- Metrics dashboard (update success rates)

---

## Success Criteria (Overall)

- **Reliability:** 100% update success rate on stable network
- **Safety:** 0% chance of breaking agents
- **Performance:** < 10 seconds downtime per update
- **Observability:** All updates logged and tracked
- **Rollback:** Automatic rollback on any failure
- **Phased Rollout:** Gradual rollout prevents mass failures

---

## Known Issues / Limitations

1. **macOS Gatekeeper:**
   - Updated binaries may trigger Gatekeeper warnings
   - Mitigation: Notarization required

2. **Windows Defender:**
   - May quarantine updated binaries
   - Mitigation: Code signing required

3. **SELinux (RHEL/Fedora):**
   - May block binary replacement
   - Mitigation: Proper file contexts

4. **Active Deployments:**
   - Updates deferred during active deployments
   - May delay urgent security updates

5. **Network Latency:**
   - Slow networks delay updates
   - Large binaries take time to download

---

## Test Execution Checklist

- [ ] All test scenarios executed
- [ ] All platforms tested (Windows, macOS, Linux)
- [ ] Edge cases validated
- [ ] Performance metrics collected
- [ ] Success rate calculated
- [ ] Rollback mechanism verified
- [ ] Phased rollout tested
- [ ] Documentation updated
- [ ] Issues logged in bug tracker
- [ ] Go/no-go decision made

---

**Document Version:** 1.0
**Last Updated:** 2026-02-14
**Owner:** Pipeline 7 - Production Validation
