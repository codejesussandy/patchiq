# Discovery & Network Implementation Guide

## API Contract
**Spec**: `backend-debt/discovery-api.yaml`

## Endpoints Overview
```
# IP Discovery
GET    /v1/discovery/ip-ranges         - List IP ranges
GET    /v1/discovery/ip-ranges/:id     - Get IP range
POST   /v1/discovery/ip-ranges         - Create IP range
PUT    /v1/discovery/ip-ranges/:id     - Update IP range
DELETE /v1/discovery/ip-ranges/:id     - Delete IP range
POST   /v1/discovery/ip-ranges/:id/scan - Scan IP range

# Device Credentials
GET    /v1/discovery/credentials       - List credentials
GET    /v1/discovery/credentials/:id   - Get credential
POST   /v1/discovery/credentials       - Create credential
PUT    /v1/discovery/credentials/:id   - Update credential
DELETE /v1/discovery/credentials/:id   - Delete credential
POST   /v1/discovery/credentials/:id/test - Test credential

# Agents (see AGENTS-IMPLEMENTATION.md for full details)
GET    /v1/agents                     - List agents
GET    /v1/agents/:id                 - Get agent details
GET    /v1/agents/:id/commands        - Get agent commands
DELETE /v1/agents/:id                 - Delete agent
GET    /v1/agents/downloads           - Get agent downloads
GET    /v1/agent-versions             - Get available versions
```

## Reference Implementation
- **IP Discovery**: `frontend/src/pages/discovery/IPDiscovery.tsx`
- **Credentials**: `frontend/src/pages/discovery/DeviceCredentials.tsx`
- **Agents**: `frontend/src/pages/discovery/Agents.tsx`
- **Service**: `frontend/src/services/discovery.service.ts`, `agent.service.ts`
- **Mock**: `frontend/src/mocks/handlers/discovery.handlers.ts`, `agent.handlers.ts`

---

## Data Models

### IPRange
```typescript
{
  id: string;
  name: string;
  range: string;                  // CIDR notation (e.g., "192.168.1.0/24")
  description?: string;
  lastScanned?: string;           // ISO datetime
  deviceCount: number;            // Discovered devices
  createdAt?: string;
}
```

### DeviceCredential
```typescript
{
  id: string;
  name: string;
  type: 'SSH' | 'Windows' | 'SNMP';
  username: string;
  password: string;               // Encrypted at rest
  description?: string;
  lastUsed?: string;              // ISO datetime
  createdAt?: string;
}
```

### Agent (Extended)
```typescript
{
  id: string;
  machineId: string;              // Unique machine identifier
  name: string;
  status: 'Connected' | 'Disconnected' | 'Pending' | 'Error';
  os: 'Windows' | 'MacOS' | 'Linux';
  osVersion: string;
  agentVersion: string;
  lastHeartbeat: string;          // ISO datetime
  lastHeartbeatRelative: string;  // "2 minutes ago"
  registeredAt: string;
  ipAddress?: string;
  hostname?: string;
  serialNumber?: string;
  assetId?: string;               // Link to Asset
  tags?: string[];
  groups?: Array<{ id: string; name: string }>;
  capabilities?: string[];        // ["scanning", "patching"]
}
```

### AgentCommand
```typescript
{
  id: string;
  agentId: string;
  type: 'scan' | 'update' | 'deploy' | 'reboot';
  status: 'pending' | 'sent' | 'completed' | 'failed';
  createdAt: string;
  executedAt?: string;
  result?: string;
}
```

### AgentDownload
```typescript
{
  os: 'Windows 11' | 'MacOS' | 'Linux';
  version: string;
  releaseDate: string;
  downloadUrl: string;
}
```

---

## TDD Scenarios

### IP Range CRUD

**GET /v1/discovery/ip-ranges**
```json
Response (200):
{
  "data": [
    {
      "id": "uuid",
      "name": "Corporate Network",
      "range": "192.168.1.0/24",
      "description": "Main office network",
      "lastScanned": "2024-01-15T10:00:00Z",
      "deviceCount": 45
    }
  ],
  "total": 10
}
```

**POST /v1/discovery/ip-ranges**
```json
Request:
{
  "name": "DMZ Network",
  "range": "10.0.0.0/24",
  "description": "Demilitarized zone"
}

Response (201):
{
  "id": "new_uuid",
  "name": "DMZ Network",
  "range": "10.0.0.0/24",
  "deviceCount": 0
}
```

**Validations**
- name: required, min 2 chars
- range: required, valid CIDR notation
- No overlapping ranges allowed

**POST /v1/discovery/ip-ranges/:id/scan**
```json
Response (202):
{
  "jobId": "scan-job-uuid",
  "status": "initiated",
  "message": "IP range scan started"
}
```

---

### Device Credentials CRUD

**GET /v1/discovery/credentials**
```json
Response (200):
{
  "data": [
    {
      "id": "uuid",
      "name": "Windows Admin",
      "type": "Windows",
      "username": "admin",
      "lastUsed": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 5
}
```

**Note**: Password is never returned in list view

**POST /v1/discovery/credentials**
```json
Request:
{
  "name": "SSH Root",
  "type": "SSH",
  "username": "root",
  "password": "secure_password",
  "description": "Root access for Linux servers"
}

Response (201):
{
  "id": "new_uuid",
  "name": "SSH Root",
  "type": "SSH",
  "username": "root"
}
```

**GET /v1/discovery/credentials/:id** (with password visibility)
```json
Response (200):
{
  "id": "uuid",
  "name": "SSH Root",
  "type": "SSH",
  "username": "root",
  "password": "********",        // Masked by default
  "description": "Root access"
}

// With ?showPassword=true (requires elevated permission)
{
  "password": "actual_password"
}
```

**POST /v1/discovery/credentials/:id/test**
```json
Request:
{
  "targetHost": "192.168.1.100"
}

Response (200):
{
  "success": true,
  "message": "Connection successful"
}

Response (400):
{
  "success": false,
  "message": "Connection failed: Authentication error"
}
```

---

### Agents

**GET /v1/agents**
```json
Response (200):
[
  {
    "id": "uuid",
    "machineId": "machine-unique-id",
    "name": "DESKTOP-ABC123",
    "status": "Connected",
    "os": "Windows",
    "osVersion": "Windows 11 Pro",
    "agentVersion": "1.0.0",
    "lastHeartbeat": "2024-01-15T10:30:00Z",
    "lastHeartbeatRelative": "5 minutes ago",
    "ipAddress": "192.168.1.50",
    "hostname": "desktop-abc123.local",
    "groups": [
      { "id": "grp1", "name": "Engineering" }
    ],
    "assetId": "asset-uuid"
  }
]
```

**Table Filters**
- Status: Connected, Disconnected, Pending, Error
- OS: Windows, MacOS, Linux

**GET /v1/agents/:id/commands**
```json
Response (200):
[
  {
    "id": "cmd-uuid",
    "type": "scan",
    "status": "completed",
    "createdAt": "2024-01-15T10:00:00Z",
    "executedAt": "2024-01-15T10:00:05Z",
    "result": "Scan completed successfully"
  }
]
```

**GET /v1/agents/downloads**
```json
Response (200):
[
  {
    "os": "Windows 11",
    "version": "1.0.0",
    "releaseDate": "2024-01-01",
    "downloadUrl": "/downloads/agent-windows-1.0.0.exe"
  },
  {
    "os": "MacOS",
    "version": "1.0.0",
    "releaseDate": "2024-01-01",
    "downloadUrl": "/downloads/agent-macos-1.0.0.dmg"
  },
  {
    "os": "Linux",
    "version": "1.0.0",
    "releaseDate": "2024-01-01",
    "downloadUrl": "/downloads/agent-linux-1.0.0.deb"
  }
]
```

---

## Database Schema

```sql
-- IP Ranges
CREATE TABLE ip_ranges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  range VARCHAR(50) NOT NULL,
  description TEXT,
  last_scanned TIMESTAMP,
  device_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_ip_ranges_name ON ip_ranges(name);

-- Device Credentials
CREATE TABLE device_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL,
  username VARCHAR(100) NOT NULL,
  password_encrypted TEXT NOT NULL,    -- AES-256 encrypted
  description TEXT,
  last_used TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Agents
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'Pending',
  os VARCHAR(50) NOT NULL,
  os_version VARCHAR(100),
  agent_version VARCHAR(50),
  last_heartbeat TIMESTAMP,
  registered_at TIMESTAMP DEFAULT NOW(),
  ip_address VARCHAR(45),
  hostname VARCHAR(255),
  serial_number VARCHAR(100),
  asset_id UUID REFERENCES assets(id),
  capabilities TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_machine_id ON agents(machine_id);

-- Agent Groups (many-to-many)
CREATE TABLE agent_groups (
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  PRIMARY KEY (agent_id, group_id)
);

-- Agent Commands
CREATE TABLE agent_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  executed_at TIMESTAMP,
  result TEXT
);
CREATE INDEX idx_agent_commands_agent ON agent_commands(agent_id);

-- Agent Downloads (static/admin-managed)
CREATE TABLE agent_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os VARCHAR(50) NOT NULL,
  version VARCHAR(50) NOT NULL,
  release_date DATE,
  download_url TEXT NOT NULL,
  file_size BIGINT,
  checksum VARCHAR(64),
  is_active BOOLEAN DEFAULT true
);
```

---

## Security Considerations

### Credential Storage
- Encrypt passwords using AES-256
- Store encryption key in secure vault (e.g., HashiCorp Vault)
- Never log passwords
- Audit all credential access

### Agent Communication
- Use TLS 1.3 for all agent traffic
- Authenticate agents using certificate-based auth
- Validate machine ID to prevent spoofing

---

## Agent Protocol Reference

See `contracts/protocols/` for detailed protocols:
- `agent-registration.md` - Registration flow
- `agent-heartbeat.md` - Heartbeat interval (30s)
- `agent-commands.md` - Command queue protocol
- `data-collection.md` - Data collection scheduling

---

## Export Format

**IP Ranges CSV:**
- ID, Name, IP Range, Description, Last Scanned, Devices Found

**Credentials CSV:**
- ID, Name, Type, Username, Last Used
- **Note**: Password never exported

---

## Implementation Order

1. IP Ranges CRUD
2. IP Range scanning (background job)
3. Device Credentials CRUD
4. Credential encryption/decryption
5. Credential testing
6. Agents table + CRUD
7. Agent heartbeat endpoint
8. Agent commands queue
9. Agent downloads management
10. Agent-Asset linking
