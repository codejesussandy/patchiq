# PatchIQ Agent CLI Reference

## Overview

This document provides a complete reference for all PatchIQ agent command-line options.

## Basic Usage

```bash
patchiq-agent [OPTIONS]
```

## Global Options

### Version Information

```bash
patchiq-agent --version
```

Shows agent version and build date.

**Example Output:**
```
Patchify Agent v1.2.0 (built 2026-02-14)
```

### Configuration

```bash
patchiq-agent --config /path/to/config.json
```

Load configuration from a specific file.

**Default Locations:**
- `~/.patchify-agent/config.json`
- `/etc/patchify-agent/config.json`

### Server URL

```bash
patchiq-agent --server http://your-server:5173/api
```

Override backend server URL.

**Environment Variable:** `PATCHIQ_SERVER_URL`

### Web UI Port

```bash
patchiq-agent --port 4504
```

Override Web UI port (default: 4504).

**Environment Variable:** `PATCHIQ_WEBUI_PORT`

### Local Mode

```bash
patchiq-agent --no-backend
```

Run in local-only mode without backend communication.

## Service Management (Windows)

### Install Service

```bash
patchiq-agent --install-service
```

Installs the agent as a Windows Service.

**Requires:** Administrator privileges

**Example:**
```powershell
# Run as Administrator
patchiq-agent.exe --install-service
```

### Uninstall Service

```bash
patchiq-agent --uninstall-service
```

Removes the agent Windows Service.

**Requires:** Administrator privileges

### Start Service

```bash
patchiq-agent --start-service
```

Starts the Windows Service.

**Equivalent:**
```powershell
sc start PatchIQAgent
```

### Stop Service

```bash
patchiq-agent --stop-service
```

Stops the Windows Service.

**Equivalent:**
```powershell
sc stop PatchIQAgent
```

## Agent Status

### Show Status

```bash
patchiq-agent --status
```

Displays agent registration status, configuration, and data directory.

**Example Output:**
```
╔═══════════════════════════════════════════════════╗
║         Patchify Agent Status                     ║
╚═══════════════════════════════════════════════════╝

Configuration:
  ✓ Config file: /home/user/.patchify-agent/config.json
    Server URL:  http://server:5173/api
    Web UI Port: 4504

Registration:
  ✓ Registered with server
    Agent ID:   agent-abc123
    Asset ID:   asset-xyz789
    Machine ID: 1234-5678-90ab-cdef

Data Directory:
  /home/user/.patchify-agent
  ✓ Directory exists
```

## Interactive Setup

### Setup Wizard

```bash
patchiq-agent --setup
```

Runs interactive setup wizard to configure the agent.

**Prompts for:**
- Backend server URL
- Web UI port
- Proxy settings (if needed)
- Agent name (optional)

**Example:**
```bash
$ patchiq-agent --setup

╔═══════════════════════════════════════════════════╗
║         PatchIQ Agent Setup Wizard                ║
╚═══════════════════════════════════════════════════╝

Enter backend server URL: http://my-server:5173/api
Enter Web UI port (default 4504):
Use proxy? (yes/no): no
Enter agent name (optional): Production Server 1

Configuration saved to: /home/user/.patchify-agent/config.json
```

## Proxy Configuration

### Test Proxy

```bash
patchiq-agent --test-proxy
```

Tests proxy connectivity and configuration.

**With explicit proxy:**
```bash
patchiq-agent --proxy http://proxy:8080 --test-proxy
```

**Example Output:**
```
╔═══════════════════════════════════════════════════╗
║         Patchify Agent Proxy Test                 ║
╚═══════════════════════════════════════════════════╝

  Proxy URL: http://proxy:8080
  Testing connectivity through proxy...
  OK: External connectivity via proxy (status 200)

  Testing proxy connection to PatchIQ server (http://server:5173/api)...
  OK: Server reachable via proxy (status 200)

  Proxy test completed.
```

### Proxy Options

```bash
--proxy <URL>              # Proxy URL (http://proxy:8080)
--proxy-user <username>    # Proxy authentication username
--proxy-password <pass>    # Proxy authentication password
--no-proxy <hosts>         # Comma-separated bypass list
```

**Example:**
```bash
patchiq-agent \
  --proxy http://proxy.company.com:8080 \
  --proxy-user myuser \
  --proxy-password mypass \
  --no-proxy localhost,127.0.0.1,.internal.net
```

**Environment Variables:**
- `PATCHIQ_PROXY_URL` or `HTTPS_PROXY`
- `PATCHIQ_PROXY_USER`
- `PATCHIQ_PROXY_PASSWORD`
- `NO_PROXY`

## Update & Rollback

### List Available Rollbacks

```bash
patchiq-agent --list-rollbacks
```

Lists all available agent version backups for rollback.

**Example Output:**
```
╔═══════════════════════════════════════════════════╗
║      Available Agent Rollback Versions            ║
╚═══════════════════════════════════════════════════╝

  Found 2 backup version(s):

  1. patchiq-agent.bak
     Size: 15728640 bytes
     Modified: 2026-02-14 10:30:00

  2. patchiq-agent.v1.1.0
     Size: 15234560 bytes
     Modified: 2026-02-10 15:45:30

  To rollback, run: patchiq-agent --rollback
```

### Rollback to Previous Version

```bash
patchiq-agent --rollback
```

Rolls back the agent to the previous version.

**With confirmation prompt:**
```bash
$ patchiq-agent --rollback

╔═══════════════════════════════════════════════════╗
║         Agent Version Rollback                    ║
╚═══════════════════════════════════════════════════╝

  Current Version: 1.2.0
  Previous Version: 1.1.0

  Rolling back from: /usr/local/bin/patchiq-agent
  Rolling back to:   /usr/local/bin/patchiq-agent.bak

  Are you sure you want to rollback? (yes/no): yes

  Performing rollback...
  ✓ Rollback completed successfully!

  The agent has been rolled back to the previous version.
  Restart the agent service to use the rolled back version.
```

### Rollback to Specific Version

```bash
patchiq-agent --rollback-version 1.1.0
```

Rolls back to a specific version (if backup exists).

### Force Rollback

```bash
patchiq-agent --rollback --force
```

Performs rollback without confirmation prompt.

**Use case:** Automated scripts or emergency rollback

**Example:**
```bash
# Emergency rollback script
patchiq-agent --rollback --force && systemctl restart patchiq-agent
```

## Configuration File Format

**Location:** `~/.patchify-agent/config.json`

**Full Example:**
```json
{
  "serverUrl": "http://server:5173/api",
  "webUiPort": 4504,
  "enableWebUi": true,
  "heartbeatIntervalSeconds": 60,
  "inventoryIntervalSeconds": 21600,
  "telemetryIntervalSeconds": 60,
  "collectHardware": true,
  "collectSoftware": true,
  "collectNetwork": true,
  "collectSecurity": true,
  "collectPeripherals": true,
  "collectTelemetry": true,
  "commandTimeoutSeconds": 900,
  "proxyUrl": "http://proxy:8080",
  "proxyUser": "username",
  "proxyPassword": "password",
  "noProxy": "localhost,127.0.0.1",
  "maxDownloadSpeedMbps": 0,
  "enableDownloadResume": true,
  "logLevel": "info",
  "logFormat": "json",
  "dataDir": "/var/lib/patchiq-agent",
  "jobRetentionDays": 30,
  "deploymentGroup": "production",
  "enableWebUiAuth": true,
  "webUiUsername": "admin",
  "webUiPasswordHash": "$2a$10$..."
}
```

## Environment Variables

All configuration options can be set via environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PATCHIQ_SERVER_URL` | Backend server URL | — |
| `PATCHIQ_WEBUI_PORT` | Web UI port | 4504 |
| `PATCHIQ_LOG_LEVEL` | Log level (debug, info, warn, error) | info |
| `PATCHIQ_LOG_FORMAT` | Log format (json, text) | json |
| `PATCHIQ_DATA_DIR` | Data storage directory | ~/.patchify-agent |
| `PATCHIQ_PROXY_URL` | Proxy URL | — |
| `PATCHIQ_PROXY_USER` | Proxy username | — |
| `PATCHIQ_PROXY_PASSWORD` | Proxy password | — |
| `PATCHIQ_DEPLOYMENT_GROUP` | Deployment group | production |
| `HTTP_PROXY` / `HTTPS_PROXY` | Standard proxy variables | — |
| `NO_PROXY` | Proxy bypass list | — |

**Example:**
```bash
export PATCHIQ_SERVER_URL=http://server:5173/api
export PATCHIQ_LOG_LEVEL=debug
export PATCHIQ_DEPLOYMENT_GROUP=canary

patchiq-agent
```

## Exit Codes

| Code | Description |
|------|-------------|
| 0 | Success |
| 1 | General error |
| 2 | Configuration error |
| 3 | Network error |
| 4 | Permission denied |
| 5 | Service management error |

## Logging

### Log Locations

**Linux (systemd):**
```bash
journalctl -u patchiq-agent -f
```

**macOS:**
```bash
tail -f ~/Library/Logs/patchiq-agent.log
```

**Windows:**
```
Event Viewer > Application > PatchIQAgent
```

### Log Levels

- **debug** — Verbose debugging information
- **info** — General informational messages
- **warn** — Warning messages
- **error** — Error messages

**Set via CLI:**
```bash
export PATCHIQ_LOG_LEVEL=debug
patchiq-agent
```

**Set in config:**
```json
{
  "logLevel": "debug"
}
```

### Structured Logging

Logs are in JSON format by default:

```json
{
  "level": "info",
  "time": "2026-02-14T10:30:00Z",
  "message": "Agent started",
  "version": "1.2.0",
  "agentId": "agent-abc123"
}
```

**Human-readable format:**
```json
{
  "logFormat": "text"
}
```

## Advanced Usage

### Custom Data Directory

```bash
patchiq-agent --config /custom/path/config.json
```

### Multiple Agents on Same Host

```bash
# Agent 1
patchiq-agent --port 4504 --config /opt/agent1/config.json

# Agent 2
patchiq-agent --port 4505 --config /opt/agent2/config.json
```

### Development Mode

```bash
# Local backend, debug logging
export PATCHIQ_SERVER_URL=http://localhost:3000/api
export PATCHIQ_LOG_LEVEL=debug
patchiq-agent
```

## Troubleshooting

### Agent won't start

**Check logs:**
```bash
journalctl -u patchiq-agent -n 50
```

**Check config:**
```bash
patchiq-agent --status
```

**Verify permissions:**
```bash
ls -l /usr/local/bin/patchiq-agent
```

### Can't connect to backend

**Test network:**
```bash
curl http://server:5173/api/health
```

**Test proxy:**
```bash
patchiq-agent --test-proxy
```

### Update failed

**Check rollback state:**
```bash
cat ~/.patchify-agent/update/agent-update-rollback.json
```

**Rollback:**
```bash
patchiq-agent --rollback --force
```

## See Also

- `docs/agent/SELF-UPDATE.md` — Self-update mechanism
- `docs/PHASED-ROLLOUT.md` — Gradual rollout strategies
- `docs/agent/INSTALLATION.md` — Installation guide
