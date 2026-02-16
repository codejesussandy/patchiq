# Agent Self-Update Documentation

## Overview

The PatchIQ agent supports fully automated self-updates with robust rollback capabilities, ensuring zero-downtime updates and safe recovery from failed updates.

## Update Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. Pre-Update Checks                                       │
│     ✓ Disk space (>500MB)                                   │
│     ✓ Network connectivity                                  │
│     ✓ Write permissions                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  2. Download New Version                                    │
│     • Download from backend URL                             │
│     • Verify checksum (SHA256)                              │
│     • Verify signature (if enabled)                         │
│     • Save to temp directory                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  3. Post-Download Verification                              │
│     ✓ File size validation                                  │
│     ✓ Binary is executable                                  │
│     ✓ Version matches expected                              │
│     ✓ Corruption detection                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  4. Create Rollback State                                   │
│     • Backup current binary                                 │
│     • Backup config files                                   │
│     • Save rollback metadata                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  5. Deploy Update                                           │
│     • Stop service (gracefully)                             │
│     • Replace binary                                        │
│     • Start service                                         │
│     • Wait for startup (max 2 min)                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  6. Post-Update Validation                                  │
│     ✓ HTTP health check (/health)                           │
│     ✓ Backend connectivity test                             │
│     ✓ Heartbeat success                                     │
│     ⚠ Auto-rollback if fails (within 5 min)                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  7. Finalize                                                │
│     • Delete rollback state                                 │
│     • Clean up old binaries (keep last 2)                   │
│     • Log success to backend                                │
│     • Update version file                                   │
└─────────────────────────────────────────────────────────────┘
```

## Rollback Scenarios

### Automatic Rollback Triggers

1. **Failed Download**
   - Checksum mismatch
   - Truncated download
   - Network timeout

2. **Corrupted Binary**
   - File size mismatch
   - Not executable
   - Signature verification failed

3. **Failed Health Check**
   - Service won't start within 2 minutes
   - Health endpoint returns error
   - Backend connectivity lost
   - Heartbeat fails

4. **Service Crash**
   - Service exits unexpectedly after update
   - Crash within 5 minutes of update

### Manual Rollback

```bash
# List available rollback versions
patchiq-agent --list-rollbacks

# Rollback to previous version
patchiq-agent --rollback

# Rollback to specific version
patchiq-agent --rollback-version 1.1.0

# Force rollback without confirmation
patchiq-agent --rollback --force
```

## Rollback State

Rollback state is persisted to disk at:
- **Linux/macOS:** `~/.patchify-agent/update/agent-update-rollback.json`
- **Windows:** `%USERPROFILE%\.patchify-agent\update\agent-update-rollback.json`

### State Structure

```json
{
  "currentVersion": "1.2.0",
  "previousVersion": "1.1.0",
  "previousBinaryPath": "/usr/local/bin/patchiq-agent.bak",
  "updateStartedAt": "2026-02-14T10:30:00Z",
  "healthCheckFailed": false,
  "rollbackReason": "",
  "configBackupPath": "/home/user/.patchify-agent/backup/pre-update-1234567890",
  "platform": "linux",
  "architecture": "amd64"
}
```

## Configuration File Backup

Before each update, the following config files are backed up:
- `config.json`
- `credentials.json`

**Backup Location:** `~/.patchify-agent/backup/pre-update-{timestamp}/`

**Retention:** Last 3 backups are kept

## Binary Version Management

The agent keeps the last 2 binary versions for rollback:

```
/usr/local/bin/patchiq-agent       # Current version
/usr/local/bin/patchiq-agent.bak   # Previous version
/usr/local/bin/patchiq-agent.v1.1.0 # Older version (if exists)
```

## Service Restart

### Linux (systemd)

```bash
systemctl restart patchiq-agent
```

The agent uses `systemctl restart` which is atomic (stop + start).

### macOS (LaunchAgent)

```bash
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/io.patchiq.agent.plist
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/io.patchiq.agent.plist
```

### Windows (Service)

```powershell
sc stop PatchIQAgent
sc start PatchIQAgent
```

## Health Check Endpoint

**URL:** `http://localhost:4504/health`

**Response:**
```json
{
  "healthy": true,
  "status": "healthy",
  "version": "1.2.0",
  "uptime": 123.45,
  "backend": {
    "connected": true,
    "registered": true,
    "agentId": "agent-abc123",
    "serverUrl": "http://server:5173/api"
  },
  "system": {
    "cpuPercent": 5.2,
    "memoryPercent": 45.8
  }
}
```

## Corruption Detection

### Truncated Downloads

Detects when downloaded file size is less than expected:

```go
if actualSize < expectedSize {
    // Trigger rollback
}
```

### Checksum Mismatch

Verifies SHA256 checksum of downloaded binary:

```go
if actualChecksum != expectedChecksum {
    // Trigger rollback
}
```

### Signature Verification Failure

Verifies code signature (Windows Authenticode, macOS codesign):

```go
if !verifySignature(binary) {
    // Trigger rollback
}
```

## Logging & Observability

### Structured Logs

All update operations are logged with structured fields:

```json
{
  "level": "info",
  "time": "2026-02-14T10:30:00Z",
  "message": "Starting agent update",
  "currentVersion": "1.1.0",
  "targetVersion": "1.2.0",
  "updateId": "update-abc123",
  "deploymentGroup": "production",
  "rolloutPercentage": 50
}
```

### Correlation IDs

Each update has a unique correlation ID for tracking through logs:

```bash
grep "update-abc123" /var/log/patchiq-agent.log
```

### Prometheus Metrics

```promql
# Update success rate
agent_update_success_total

# Update failures by reason
agent_update_failure_total{reason="checksum_mismatch"}
agent_update_failure_total{reason="health_check_failed"}

# Rollback count by reason
agent_rollback_total{reason="corruption"}
agent_rollback_total{reason="service_crash"}

# Update duration
histogram_quantile(0.95, agent_update_duration_seconds_bucket)

# Corruption detection
agent_update_corruption_total{type="truncated_download"}
agent_update_corruption_total{type="checksum_mismatch"}
```

## Phased Rollout Integration

See `docs/PHASED-ROLLOUT.md` for details on:
- Deployment groups (canary, beta, production)
- Hash-based bucketing
- Rollout percentages
- Gradual rollout strategies

## Error Handling

### Update Failures

| Error | Action | Rollback |
|-------|--------|----------|
| Download failed | Retry 3 times | No |
| Checksum mismatch | No retry | Yes |
| No disk space | Abort | No |
| Service won't start | Wait 2 min | Yes |
| Health check failed | Wait 5 min | Yes |

### Rollback Failures

If rollback fails:
1. Log critical error
2. Alert backend
3. Preserve failed binary for debugging (`.failed` suffix)
4. Manual intervention required

## Testing Rollback

### Simulate Failed Update

```bash
# Create a corrupted update file
dd if=/dev/zero of=/tmp/fake-agent bs=1M count=1

# Trigger update with bad checksum
curl -X POST http://localhost:4504/api/update \
  -H "Content-Type: application/json" \
  -d '{
    "downloadUrl": "file:///tmp/fake-agent",
    "checksum": "invalid",
    "version": "999.999.999"
  }'

# Verify rollback occurred
patchiq-agent --version
```

### Test Health Check Timeout

```bash
# Stop agent service
systemctl stop patchiq-agent

# Wait for health check timeout (5 minutes)
# Rollback should trigger automatically
```

## Troubleshooting

### Update stuck in progress

**Check rollback state:**
```bash
cat ~/.patchify-agent/update/agent-update-rollback.json
```

**Manually trigger rollback:**
```bash
patchiq-agent --rollback --force
```

### Rollback not working

**Check previous binary exists:**
```bash
ls -la /usr/local/bin/patchiq-agent.bak
```

**Check logs:**
```bash
journalctl -u patchiq-agent -f
```

**Restore from backup manually:**
```bash
cp /usr/local/bin/patchiq-agent.bak /usr/local/bin/patchiq-agent
systemctl restart patchiq-agent
```

### Service won't restart after update

**Check service status:**
```bash
systemctl status patchiq-agent
```

**Check binary permissions:**
```bash
ls -l /usr/local/bin/patchiq-agent
chmod +x /usr/local/bin/patchiq-agent
```

**Check dependencies:**
```bash
ldd /usr/local/bin/patchiq-agent
```

## Best Practices

1. **Always test updates in canary environment first**
2. **Monitor metrics closely during rollout**
3. **Have SSH/physical access to critical systems before updating**
4. **Keep at least 2 previous versions for rollback**
5. **Clean up old backups regularly (automated)**
6. **Document all manual interventions**
7. **Set up automated alerts for update failures**

## Security Considerations

1. **Verify signatures** — Always verify binary signatures before installing
2. **Use HTTPS** — Download updates over encrypted connections only
3. **Validate checksums** — Never skip checksum verification
4. **Audit logs** — Log all update decisions and outcomes
5. **Access control** — Limit who can trigger manual updates
6. **Secure storage** — Protect rollback state files (0600 permissions)

## Related Documentation

- `docs/PHASED-ROLLOUT.md` — Gradual rollout strategies
- `docs/agent/CLI-REFERENCE.md` — CLI command reference
- `docs/agent/PIPELINE-4-PRD.md` — Code signing details
- `backend/src/modules/agent-versions/README.md` — Backend API
