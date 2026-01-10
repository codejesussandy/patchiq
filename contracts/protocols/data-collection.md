# Data Collection Protocol

## Overview

Agents collect various types of data from endpoints and transmit them to the backend. This document describes what data is collected, when, and how.

## Data Categories

| Category | Schema | Frequency | Triggered By |
|----------|--------|-----------|--------------|
| Hardware Inventory | `hardware.schema.json` | Every 6 hours | Schedule, On-demand |
| Software Inventory | `software.schema.json` | Every 6 hours | Schedule, On-demand |
| Network Configuration | `network.schema.json` | Every 6 hours | Schedule, On-demand, Network change |
| Security Compliance | `security.schema.json` | Every 6 hours | Schedule, On-demand |
| Peripherals | `peripheral.schema.json` | Every 6 hours | Schedule, USB connect/disconnect |
| Telemetry | `telemetry.schema.json` | Every 1-5 minutes | Schedule |
| Patch Scan Results | API-specific | Daily | Schedule, On-demand |

## Full Inventory Collection

### Schedule

Default: Every 6 hours (`0 */6 * * *`)

Configurable via `config.inventoryScheduleCron`

### Collection Order

1. Hardware (typically fastest)
2. Software (can be slow with many apps)
3. Network
4. Security
5. Peripherals

### Endpoint

**POST** `/api/agent/inventory`

### Request Body

```json
{
  "collectedAt": "2025-01-10T10:00:00Z",
  "agentId": "agent-uuid",
  "agentVersion": "1.0.0",
  "collectionDurationMs": 5420,
  "hardware": { /* hardware.schema.json */ },
  "software": { /* software.schema.json */ },
  "network": { /* network.schema.json */ },
  "security": { /* security.schema.json */ },
  "peripherals": { /* peripheral.schema.json */ }
}
```

### Partial Collection

If a category fails to collect, send what succeeded:

```json
{
  "collectedAt": "2025-01-10T10:00:00Z",
  "agentId": "agent-uuid",
  "hardware": { /* ... */ },
  "software": { /* ... */ },
  "network": null,
  "security": { /* ... */ },
  "peripherals": null,
  "errors": [
    {
      "category": "network",
      "error": "Permission denied accessing network interfaces",
      "code": "EACCES"
    },
    {
      "category": "peripherals",
      "error": "USB enumeration failed",
      "code": "USB_ERROR"
    }
  ]
}
```

## Telemetry Collection

### Schedule

Default: Every 60 seconds

Configurable via `config.telemetryIntervalSeconds`

### Endpoint

**POST** `/api/agent/telemetry`

### Request Body

See `telemetry.schema.json`

### Batching

Telemetry can be batched to reduce API calls:

```json
{
  "agentId": "agent-uuid",
  "batch": [
    { "timestamp": "2025-01-10T10:00:00Z", "cpu": {...}, "memory": {...} },
    { "timestamp": "2025-01-10T10:01:00Z", "cpu": {...}, "memory": {...} },
    { "timestamp": "2025-01-10T10:02:00Z", "cpu": {...}, "memory": {...} }
  ]
}
```

Batching recommended when:
- Network is metered
- High latency connection
- Offline periods (batch and send when reconnected)

## Patch Scan Collection

### Schedule

Default: Daily at 2 AM local time (`0 2 * * *`)

Configurable via `config.patchScanScheduleCron`

### Endpoint

**POST** `/api/agent/patch-scan`

### Request Body

```json
{
  "scannedAt": "2025-01-10T02:00:00Z",
  "agentId": "agent-uuid",
  "scanDurationMs": 45000,
  "osPatches": {
    "total": 150,
    "installed": 145,
    "missing": 5,
    "missingPatches": [
      {
        "id": "KB5063709",
        "title": "2025-01 Cumulative Update for Windows 11",
        "severity": "Critical",
        "releaseDate": "2025-01-09",
        "size": 721100000,
        "rebootRequired": true,
        "categories": ["Security Updates"]
      }
    ]
  },
  "thirdPartyPatches": {
    "total": 45,
    "installed": 42,
    "missing": 3,
    "missingPatches": [
      {
        "application": "Google Chrome",
        "currentVersion": "125.0.6422.100",
        "availableVersion": "125.0.6422.150",
        "severity": "High"
      }
    ]
  }
}
```

## Event-Based Collection

Some data is collected when events occur:

### Network Change

When network configuration changes:
1. Detect IP address change
2. Detect new network adapter
3. Detect Wi-Fi SSID change

Action: Send network inventory update

### USB Device Connect/Disconnect

1. Detect USB device event
2. Update peripheral inventory
3. Send peripheral update (optional based on config)

### Software Install/Uninstall

1. Monitor application install events
2. Update software inventory
3. Send software inventory update

### Security State Change

1. Monitor firewall enable/disable
2. Monitor AV definition updates
3. Monitor encryption status changes

Action: Send security inventory update

## Delta Updates

For efficiency, agents can send delta updates instead of full inventory:

### Endpoint

**PATCH** `/api/agent/inventory`

### Request Body

```json
{
  "agentId": "agent-uuid",
  "timestamp": "2025-01-10T10:00:00Z",
  "changes": [
    {
      "category": "software",
      "operation": "add",
      "path": "applications",
      "value": {
        "name": "Slack",
        "version": "4.35.126",
        "vendor": "Slack Technologies",
        "installDate": "2025-01-10"
      }
    },
    {
      "category": "software",
      "operation": "remove",
      "path": "applications",
      "filter": { "name": "Slack", "version": "4.34.100" }
    },
    {
      "category": "hardware",
      "operation": "update",
      "path": "memory.availableGB",
      "value": 8.5
    }
  ]
}
```

## Collection Priority

When resources are limited, prioritize:

1. **Critical:** Security compliance (encryption, AV status)
2. **High:** Patch scan results
3. **Normal:** Hardware, Software inventory
4. **Low:** Peripherals, Telemetry

## Offline Handling

When offline:

1. Continue collecting data on schedule
2. Store locally (max 24 hours of data)
3. When connection restored:
   - Send most recent full inventory
   - Batch and send stored telemetry
   - Report any missed patch scans

## Compression

Large payloads should be compressed:

```
Content-Encoding: gzip
```

Compress when:
- Payload > 10 KB
- Network is slow/metered
- Batching multiple records

## Rate Limiting

Backend may rate limit data uploads:

```
HTTP 429 Too Many Requests
Retry-After: 60
```

Agent should:
1. Respect `Retry-After` header
2. Queue data for later submission
3. Use exponential backoff if no header

## Data Privacy

Agents should:
1. Not collect passwords or sensitive credentials
2. Redact personal data when possible
3. Respect user privacy settings
4. Allow admin to configure what's collected

Configurable collection:
```json
{
  "collection": {
    "hardwareEnabled": true,
    "softwareEnabled": true,
    "networkEnabled": true,
    "securityEnabled": true,
    "peripheralsEnabled": true,
    "telemetryEnabled": true,
    "collectUserAccounts": false,
    "collectBrowserHistory": false,
    "collectRunningProcesses": true
  }
}
```
