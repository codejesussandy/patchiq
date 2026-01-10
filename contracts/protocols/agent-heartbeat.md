# Agent Heartbeat Protocol

## Overview

Heartbeats are periodic status updates sent by agents to indicate they are online and functioning. The backend uses heartbeats to track agent connectivity and can use the response to signal actions to the agent.

## Heartbeat Flow

```
┌──────────┐                                          ┌──────────┐
│  Agent   │                                          │ Backend  │
└────┬─────┘                                          └────┬─────┘
     │                                                     │
     │  Every N seconds (default 60)                       │
     │                                                     │
     │  POST /api/agent/heartbeat                          │
     │  ────────────────────────────────────────────────►  │
     │  Authorization: Bearer {accessToken}                │
     │  {timestamp, status, uptime, cpuUsage, ...}         │
     │                                                     │
     │                                                     │  Update agent status
     │                                                     │  Check for pending actions
     │                                                     │
     │  200 OK                                             │
     │  ◄────────────────────────────────────────────────  │
     │  {acknowledged, commandsPending, configUpdated}     │
     │                                                     │
     │  If commandsPending: fetch commands                 │
     │  If configUpdated: fetch new config                 │
     │                                                     │
```

## Heartbeat Interval

- **Default:** 60 seconds
- **Minimum:** 10 seconds
- **Maximum:** 3600 seconds (1 hour)
- **Configurable:** Via `config.heartbeatIntervalSeconds`

### Adaptive Heartbeat

Agents MAY implement adaptive heartbeat intervals:
- During active user session: Normal interval (60s)
- When idle: Extended interval (5-15 minutes)
- When on battery: Extended interval
- After error: Exponential backoff

## Heartbeat Request

**Endpoint:** `POST /api/agent/heartbeat`

**Headers:**
```
Authorization: Bearer {accessToken}
Content-Type: application/json
X-Agent-Id: {agentId}
```

**Request Body:**
```json
{
  "timestamp": "2025-01-10T10:30:00.000Z",
  "status": "healthy",
  "uptime": 86400,
  "agentUptime": 3600,
  "cpuUsage": 15.5,
  "memoryUsage": 45.2,
  "diskUsage": 60.0,
  "pendingReboot": false,
  "ipAddress": "192.168.1.100",
  "lastError": null
}
```

### Status Values

| Status | Description |
|--------|-------------|
| `healthy` | Agent functioning normally |
| `degraded` | Agent working but with issues (e.g., can't collect some data) |
| `error` | Agent experiencing errors (include `lastError` field) |

## Heartbeat Response

**Success (200 OK):**
```json
{
  "acknowledged": true,
  "serverTime": "2025-01-10T10:30:00.500Z",
  "commandsPending": true,
  "configUpdated": false,
  "inventoryRequested": false,
  "message": null
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `acknowledged` | boolean | Whether heartbeat was processed |
| `serverTime` | string | Server timestamp for clock sync |
| `commandsPending` | boolean | Agent should poll for commands |
| `configUpdated` | boolean | Agent should fetch new config |
| `inventoryRequested` | boolean | Backend wants immediate inventory |
| `message` | string | Optional message for agent |

## Agent Actions Based on Response

```
if (response.commandsPending) {
  // Fetch and execute pending commands
  GET /api/agent/commands
}

if (response.configUpdated) {
  // Fetch and apply new configuration
  GET /api/agent/config
}

if (response.inventoryRequested) {
  // Collect and send full inventory immediately
  POST /api/agent/inventory
}
```

## Timeout Handling

### Agent Side
- **Heartbeat timeout:** 30 seconds
- **Retry on failure:** 3 attempts with exponential backoff
- **Backoff sequence:** 5s, 15s, 45s
- **After max retries:** Continue with next scheduled heartbeat

### Backend Side
- **Agent considered offline:** No heartbeat for 3x interval (default 3 minutes)
- **Agent status update:** Automatic transition to "Disconnected"
- **Notification:** Optional alert to admins for critical assets

## Backend Offline Detection

```
Agent Status Transitions:

Connected ──────────────────────────────────► Disconnected
           (No heartbeat for 3x interval)

Disconnected ────────────────────────────────► Connected
             (Heartbeat received)
```

## Token Refresh

If the access token is near expiration (within 5 minutes), agent should refresh:

```
POST /api/agent/token/refresh
Authorization: Bearer {refreshToken}

Response:
{
  "accessToken": "new-access-token",
  "refreshToken": "new-refresh-token",
  "expiresIn": 3600
}
```

## Error Responses

| Code | Description | Agent Action |
|------|-------------|--------------|
| 200 | Success | Process response |
| 401 | Unauthorized | Re-register |
| 403 | Forbidden | Log error, continue |
| 429 | Rate limited | Back off, retry later |
| 500 | Server error | Retry with backoff |
| 503 | Service unavailable | Retry with backoff |

## Implementation Notes

### Agent
1. Run heartbeat in background thread/goroutine
2. Don't block main agent operations on heartbeat
3. Handle network interruptions gracefully
4. Log heartbeat failures for troubleshooting

### Backend
1. Update `lastHeartbeat` timestamp on agent record
2. Calculate `lastHeartbeatRelative` for UI display
3. Update agent status (Connected/Disconnected)
4. Check for pending commands/config changes
5. Store heartbeat metrics for historical analysis

## Metrics Collection

Heartbeats provide lightweight metrics between full telemetry reports:

| Metric | Purpose |
|--------|---------|
| cpuUsage | Quick health indicator |
| memoryUsage | Detect memory pressure |
| diskUsage | Detect low disk space |
| pendingReboot | Flag for patch management |
| uptime | Detect unexpected reboots |
