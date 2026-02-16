# Phased Rollout for Agent Updates

## Overview

PatchIQ supports phased (canary) rollouts for agent updates, allowing you to gradually deploy new agent versions to reduce risk and detect issues early.

## Deployment Groups

Agents can be assigned to one of three deployment groups:

- **canary** — Early adopters, typically 1-5% of fleet
- **beta** — Early majority, typically 10-25% of fleet
- **production** — General availability, remainder of fleet

### Configuring Deployment Group

**Via Configuration File:**
```json
{
  "deploymentGroup": "production"
}
```

**Via Environment Variable:**
```bash
export PATCHIQ_DEPLOYMENT_GROUP=beta
```

**Default:** `production`

## How Phased Rollout Works

### Hash-Based Bucketing

PatchIQ uses consistent hash-based bucketing to determine which agents should update:

1. Each agent ID is hashed using SHA256
2. The hash is mapped to a bucket from 0-99
3. If the bucket is less than the rollout percentage, the agent updates

**Key Properties:**
- **Deterministic:** Same agent always gets same bucket (consistent across restarts)
- **Uniform:** Agents are evenly distributed across buckets
- **Independent:** Rollout decisions don't require coordination between agents

### Rollout Percentage

The backend controls rollout percentage (0-100%):

- **0%** — No agents update
- **10%** — 10% of agents in the deployment group update
- **50%** — 50% of agents update
- **100%** — All agents in the deployment group update

### Example Rollout Strategy

**Phase 1: Canary (1% of fleet)**
```json
{
  "targetVersion": "1.2.0",
  "deploymentGroup": "canary",
  "rolloutPercentage": 100
}
```
Wait 24-48 hours, monitor for issues.

**Phase 2: Beta (10% of fleet)**
```json
{
  "targetVersion": "1.2.0",
  "deploymentGroup": "beta",
  "rolloutPercentage": 100
}
```
Wait 48-72 hours, monitor metrics and error rates.

**Phase 3: Production - Early (25% of fleet)**
```json
{
  "targetVersion": "1.2.0",
  "deploymentGroup": "production",
  "rolloutPercentage": 25
}
```
Wait 24 hours.

**Phase 4: Production - Full (100% of fleet)**
```json
{
  "targetVersion": "1.2.0",
  "deploymentGroup": "production",
  "rolloutPercentage": 100
}
```

## Backend API

### Endpoint: `GET /v1/agent-versions/current`

**Request:**
```json
{
  "agentId": "agent-abc123",
  "currentVersion": "1.1.0",
  "platform": "linux",
  "architecture": "amd64",
  "deploymentGroup": "production"
}
```

**Response:**
```json
{
  "latestVersion": "1.2.0",
  "shouldUpdate": true,
  "rolloutGroup": "production",
  "rolloutPercentage": 50,
  "downloadUrl": "https://updates.patchiq.io/agent/1.2.0/patchiq-agent-linux-amd64",
  "checksum": "sha256:abc123..."
}
```

### Response Fields

- **`latestVersion`** — Latest available version for this deployment group
- **`shouldUpdate`** — Whether this specific agent should update (based on hash bucket)
- **`rolloutPercentage`** — Current rollout percentage (informational)
- **`downloadUrl`** — URL to download the update
- **`checksum`** — SHA256 checksum for verification

## Agent Update Decision Logic

```go
func shouldUpdate(response UpdateResponse) bool {
    // Already on latest version
    if currentVersion == response.LatestVersion {
        return false
    }

    // Backend says not to update (outside rollout percentage)
    if !response.ShouldUpdate {
        return false
    }

    // All checks passed - update
    return true
}
```

## Manual Override

To force an agent to update regardless of rollout settings:

**Via CLI:**
```bash
patchiq-agent --force-update
```

**Via Backend API:**
```json
{
  "forceUpdate": true
}
```

## Rollback

If issues are detected after rollout, you can:

1. **Pause rollout** — Set `rolloutPercentage: 0` to stop new updates
2. **Rollback agents** — Deploy rollback command to affected agents
3. **Fix and re-release** — Deploy patched version with same phased strategy

### Manual Rollback

```bash
patchiq-agent --rollback
```

See `CLI-REFERENCE.md` for full rollback options.

## Monitoring Rollout Progress

### Metrics to Monitor

- **Update success rate** — Should be >95%
- **Rollback rate** — Should be <5%
- **Health check failures** — Monitor post-update health checks
- **Error logs** — Check for new error patterns after update

### Prometheus Metrics

```promql
# Update success rate
rate(agent_update_success_total[5m]) / rate(agent_update_attempts_total[5m])

# Rollback rate
rate(agent_rollback_total[5m])

# Agents per version
count by (version) (agent_info)
```

## Best Practices

1. **Start small** — Begin with 1-5% canary rollout
2. **Monitor closely** — Watch metrics for 24-48 hours between phases
3. **Automate rollback** — Set up automated rollback triggers for critical metrics
4. **Test thoroughly** — Always test updates in canary environment first
5. **Communicate** — Notify team before starting production rollout
6. **Have a rollback plan** — Know how to rollback before starting rollout
7. **Document changes** — Maintain changelog for each version

## Troubleshooting

### Agent not updating when expected

**Check deployment group:**
```bash
patchiq-agent --status | grep "Deployment Group"
```

**Check rollout percentage:**
```bash
curl http://localhost:4504/api/agent | jq '.deploymentGroup'
```

**Force update:**
```bash
patchiq-agent --force-update
```

### Updates failing

**Check logs:**
```bash
journalctl -u patchiq-agent -f
```

**Check disk space:**
```bash
df -h
```

**Verify network connectivity:**
```bash
patchiq-agent --test-proxy
```

### Rollout stuck

1. Check backend API is returning correct `shouldUpdate` values
2. Verify agents are checking for updates (heartbeat logs)
3. Check for network issues preventing download
4. Verify download URLs are accessible

## Security Considerations

1. **Signed binaries** — All agent binaries should be signed (see Pipeline 4)
2. **Checksum verification** — Always verify checksums before installing
3. **TLS enforcement** — Use HTTPS for all update downloads
4. **Access control** — Limit who can trigger rollouts
5. **Audit logging** — Log all rollout decisions and outcomes

## Related Documentation

- `docs/agent/SELF-UPDATE.md` — Self-update mechanism details
- `docs/agent/CLI-REFERENCE.md` — CLI command reference
- `backend/src/modules/agent-versions/README.md` — Backend API documentation
