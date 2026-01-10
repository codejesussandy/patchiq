# Agent Registration Protocol

## Overview

When an agent is first installed on an endpoint, it must register with the backend server to receive credentials and configuration. This document describes the registration flow.

## Registration Flow

```
┌──────────┐                                          ┌──────────┐
│  Agent   │                                          │ Backend  │
└────┬─────┘                                          └────┬─────┘
     │                                                     │
     │  1. Generate Machine ID                             │
     │  ◄──────────────────────────────────────────────────┤
     │                                                     │
     │  2. POST /api/agent/register                        │
     │  ────────────────────────────────────────────────►  │
     │  {machineId, hostname, os, osVersion, agentVersion} │
     │                                                     │
     │                                                     │  3. Validate request
     │                                                     │  4. Create/find agent record
     │                                                     │  5. Create/link asset record
     │                                                     │  6. Generate tokens
     │                                                     │
     │  7. 201 Created                                     │
     │  ◄────────────────────────────────────────────────  │
     │  {agentId, assetId, accessToken, refreshToken,      │
     │   config}                                           │
     │                                                     │
     │  8. Store credentials securely                      │
     │  9. Apply configuration                             │
     │  10. Start heartbeat                                │
     │                                                     │
```

## Machine ID Generation

The agent must generate a unique, persistent machine identifier. This ID should survive OS reinstalls if possible.

### Windows
```
Priority order:
1. SMBIOS UUID from WMI: Win32_ComputerSystemProduct.UUID
2. Machine GUID from registry: HKLM\SOFTWARE\Microsoft\Cryptography\MachineGuid
3. Combination of: Motherboard serial + CPU ID + MAC address (hashed)
```

### macOS
```
Priority order:
1. Hardware UUID: system_profiler SPHardwareDataType | grep "Hardware UUID"
2. IOPlatformUUID from IOKit
3. Serial number from system_profiler
```

### Linux
```
Priority order:
1. /etc/machine-id (systemd)
2. /var/lib/dbus/machine-id
3. DMI product UUID: /sys/class/dmi/id/product_uuid (requires root)
4. Generated UUID stored in /etc/patchify-agent/machine-id
```

## Registration Request

**Endpoint:** `POST /api/agent/register`

**Headers:**
```
Content-Type: application/json
X-Agent-Version: 1.0.0
```

**Request Body:**
```json
{
  "machineId": "550e8400-e29b-41d4-a716-446655440000",
  "hostname": "DESKTOP-ABC123",
  "os": "Windows",
  "osVersion": "Windows 11 Pro 23H2",
  "osBuild": "22631.2506",
  "architecture": "x64",
  "agentVersion": "1.0.0",
  "serialNumber": "XPS039542192893",
  "manufacturer": "Dell Inc.",
  "model": "XPS 15 9520",
  "ipAddress": "192.168.1.100",
  "macAddress": "00:09:0F:FE:00:01",
  "timezone": "America/New_York",
  "locale": "en-US"
}
```

## Registration Response

**Success (201 Created):**
```json
{
  "agentId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "assetId": "asset-uuid-here",
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
  "tokenExpiresIn": 3600,
  "config": {
    "heartbeatIntervalSeconds": 60,
    "inventoryScheduleCron": "0 */6 * * *",
    "telemetryIntervalSeconds": 60,
    "telemetryEnabled": true,
    "patchScanScheduleCron": "0 2 * * *",
    "logLevel": "info",
    "serverUrl": "https://api.patchify.io"
  }
}
```

**Already Registered (200 OK):**
If the machineId already exists, return existing agent info:
```json
{
  "agentId": "existing-agent-uuid",
  "assetId": "existing-asset-uuid",
  "accessToken": "new-access-token",
  "refreshToken": "new-refresh-token",
  "tokenExpiresIn": 3600,
  "config": { ... },
  "message": "Agent re-registered successfully"
}
```

**Error Responses:**

- `400 Bad Request` - Invalid request body
- `401 Unauthorized` - Invalid registration (if using pre-shared keys)
- `429 Too Many Requests` - Rate limited
- `500 Internal Server Error` - Server error

## Credential Storage

Agents must store credentials securely:

### Windows
- Use Windows Credential Manager (DPAPI)
- Or encrypted file in `%ProgramData%\Patchify\credentials.enc`

### macOS
- Use Keychain Services
- Store in System Keychain for daemon access

### Linux
- Use libsecret if available
- Or encrypted file in `/etc/patchify-agent/credentials.enc`
- File permissions: 600, owned by root

## Re-registration

Agents should re-register when:
1. First startup after installation
2. Stored credentials are missing or corrupted
3. Server returns 401 on any API call
4. Hostname or major OS version changes
5. Manual re-registration triggered by admin

## Security Considerations

1. **Transport Security**: Always use HTTPS
2. **Certificate Pinning**: Optionally pin backend certificate
3. **Rate Limiting**: Backend should rate-limit registration attempts
4. **Duplicate Detection**: Backend should detect and handle duplicate registrations
5. **Audit Logging**: All registrations should be logged

## Backend Implementation Notes

1. On registration, check if machineId exists
2. If exists, update agent record with new info and generate new tokens
3. If not exists, create new agent and asset records
4. Link agent to asset via `agentId` field on asset
5. Return configuration based on policies applied to agent/asset
