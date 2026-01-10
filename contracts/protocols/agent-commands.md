# Agent Commands Protocol

## Overview

The backend can queue commands for agents to execute. Agents poll for pending commands and report execution results.

## Command Flow

```
┌──────────┐                                          ┌──────────┐
│  Agent   │                                          │ Backend  │
└────┬─────┘                                          └────┬─────┘
     │                                                     │
     │  Heartbeat indicates commandsPending: true          │
     │                                                     │
     │  GET /api/agent/commands                            │
     │  ────────────────────────────────────────────────►  │
     │                                                     │
     │  200 OK                                             │
     │  ◄────────────────────────────────────────────────  │
     │  [{id, type, payload, priority, timeout}]           │
     │                                                     │
     │  Execute command                                    │
     │                                                     │
     │  POST /api/agent/commands/{id}/result               │
     │  ────────────────────────────────────────────────►  │
     │  {status, output, error, startedAt, completedAt}    │
     │                                                     │
     │  200 OK                                             │
     │  ◄────────────────────────────────────────────────  │
     │                                                     │
```

## Command Types

| Type | Description |
|------|-------------|
| `inventory_full` | Collect and send full inventory |
| `inventory_hardware` | Collect hardware inventory only |
| `inventory_software` | Collect software inventory only |
| `inventory_security` | Collect security compliance data |
| `patch_scan` | Scan for missing patches |
| `patch_install` | Install specific patch(es) |
| `patch_rollback` | Rollback specific patch(es) |
| `reboot` | Reboot the system |
| `shutdown` | Shutdown the system |
| `script` | Execute custom script |
| `config_update` | Update agent configuration |
| `agent_update` | Update agent software |
| `uninstall` | Uninstall agent |

## Fetch Commands

**Endpoint:** `GET /api/agent/commands`

**Headers:**
```
Authorization: Bearer {accessToken}
X-Agent-Id: {agentId}
```

**Response (200 OK):**
```json
{
  "commands": [
    {
      "id": "cmd-123",
      "type": "patch_install",
      "payload": {
        "patchIds": ["patch-1", "patch-2"],
        "rebootIfRequired": true,
        "rebootDelay": 300
      },
      "priority": "high",
      "timeout": 3600,
      "createdAt": "2025-01-10T10:00:00Z",
      "expiresAt": "2025-01-10T22:00:00Z",
      "retryCount": 0,
      "maxRetries": 3
    }
  ]
}
```

## Command Priority

| Priority | Description | Execution |
|----------|-------------|-----------|
| `critical` | Security-critical, execute immediately | Interrupt other tasks |
| `high` | Important, execute soon | Next in queue |
| `normal` | Standard priority | FIFO |
| `low` | Background task | When idle |

## Report Command Result

**Endpoint:** `POST /api/agent/commands/{commandId}/result`

**Headers:**
```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "success",
  "output": "Patch KB5063709 installed successfully",
  "error": null,
  "startedAt": "2025-01-10T10:05:00Z",
  "completedAt": "2025-01-10T10:15:00Z",
  "metadata": {
    "rebootRequired": true,
    "rebootScheduledAt": "2025-01-10T10:20:00Z"
  }
}
```

### Status Values

| Status | Description |
|--------|-------------|
| `pending` | Command received, not yet started |
| `running` | Command currently executing |
| `success` | Command completed successfully |
| `failed` | Command failed (include error) |
| `timeout` | Command exceeded timeout |
| `cancelled` | Command was cancelled |
| `skipped` | Command skipped (e.g., already applied) |

## Command Payloads

### inventory_full
```json
{
  "type": "inventory_full",
  "payload": {
    "includeHardware": true,
    "includeSoftware": true,
    "includeNetwork": true,
    "includeSecurity": true,
    "includePeripherals": true
  }
}
```

### patch_scan
```json
{
  "type": "patch_scan",
  "payload": {
    "scope": "all",
    "categories": ["security", "critical"],
    "reportImmediately": true
  }
}
```

### patch_install
```json
{
  "type": "patch_install",
  "payload": {
    "patchIds": ["patch-uuid-1", "patch-uuid-2"],
    "kbNumbers": ["KB5063709"],
    "rebootIfRequired": true,
    "rebootDelay": 300,
    "forceReboot": false,
    "downloadOnly": false,
    "maintenanceWindow": {
      "start": "02:00",
      "end": "05:00",
      "timezone": "America/New_York"
    }
  }
}
```

### script
```json
{
  "type": "script",
  "payload": {
    "scriptType": "powershell",
    "script": "Get-Process | Where-Object {$_.CPU -gt 100}",
    "timeout": 60,
    "runAs": "system",
    "captureOutput": true
  }
}
```

Supported script types:
- `powershell` (Windows)
- `cmd` (Windows)
- `bash` (macOS/Linux)
- `zsh` (macOS)
- `python`

### reboot
```json
{
  "type": "reboot",
  "payload": {
    "delay": 60,
    "message": "System will reboot in 60 seconds for maintenance",
    "force": false
  }
}
```

### agent_update
```json
{
  "type": "agent_update",
  "payload": {
    "version": "1.1.0",
    "downloadUrl": "https://downloads.patchify.io/agent/1.1.0/agent-windows-x64.exe",
    "checksum": "sha256:abc123...",
    "autoRestart": true
  }
}
```

## Command Execution Rules

### Timeout Handling
1. Command has a `timeout` field (seconds)
2. If execution exceeds timeout, agent should:
   - Attempt graceful termination
   - Wait 30 seconds
   - Force terminate if still running
   - Report status as `timeout`

### Retry Logic
1. If command fails and `retryCount < maxRetries`:
   - Wait exponential backoff: 2^retryCount minutes
   - Re-execute command
   - Increment retryCount
2. If all retries exhausted, report final failure

### Expiration
1. Commands have `expiresAt` timestamp
2. Expired commands should be skipped
3. Report status as `skipped` with reason "expired"

## Security Considerations

1. **Script Signing:** Production should require signed scripts
2. **Script Restrictions:** Limit what scripts can do
3. **Audit Logging:** Log all command executions
4. **Approval Flow:** Critical commands may require approval
5. **Rollback Plan:** Have rollback strategy for patches

## Maintenance Windows

Certain commands respect maintenance windows:

```json
{
  "maintenanceWindow": {
    "enabled": true,
    "start": "02:00",
    "end": "05:00",
    "timezone": "America/New_York",
    "daysOfWeek": ["Saturday", "Sunday"]
  }
}
```

Commands with `respectMaintenanceWindow: true` will:
1. Queue until maintenance window opens
2. Execute during window
3. Pause/resume if window closes mid-execution (configurable)

## Command Acknowledgment

For long-running commands, agents should send progress updates:

```
POST /api/agent/commands/{id}/progress

{
  "status": "running",
  "progress": 45,
  "message": "Installing patch 2 of 5..."
}
```
