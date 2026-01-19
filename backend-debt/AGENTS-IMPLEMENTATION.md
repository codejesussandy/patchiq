# Agents API Implementation Guide

## API Contract
**Spec**: `backend-debt/agents-api.yaml` - OpenAPI 3.0 specification (source of truth)

## Endpoint Overview
```
# Agents
GET    /v1/agents              - List all agents
GET    /v1/agents/:id          - Get agent details
DELETE /v1/agents/:id          - Delete agent
GET    /v1/agents/:id/commands - Get agent command history

# Agent Downloads
GET    /v1/agents/downloads    - List available agent downloads

# Agent Versions
GET    /v1/agent-versions            - List all agent versions
GET    /v1/agent-versions/:id/download - Download specific agent version
```

## Reference Implementation
- **Frontend**: `frontend/src/pages/discovery/Agents.tsx`
- **API Service**: `frontend/src/services/agent.service.ts`
- **Mock Handlers**: `frontend/src/mocks/handlers/agent.handlers.ts`
- **Types**: `frontend/src/types/agent.types.ts`

---

## Data Models

### Agent
```typescript
{
  id: string;                     // UUID
  machineId: string;              // Unique machine identifier
  name: string;                   // Display name
  status: 'Connected' | 'Disconnected' | 'Pending' | 'Error';
  os: 'Windows' | 'MacOS' | 'Linux';
  osVersion: string;              // e.g., "14.5", "11 22H2"
  agentVersion: string;           // e.g., "2.1.0"
  lastHeartbeat: string;          // ISO 8601 timestamp
  lastHeartbeatRelative: string;  // e.g., "2 minutes ago"
  registeredAt: string;           // ISO 8601 timestamp
  ipAddress: string;
  hostname: string;
  serialNumber: string;
  assetId?: string;               // FK to assets (linked asset)
  tags: string[];                 // Tag names
  groups: {
    id: string;
    name: string;
  }[];
  capabilities: ('scan' | 'deploy' | 'reboot' | 'update')[];
}
```

### Command
```typescript
{
  id: string;
  agentId: string;
  type: 'scan' | 'deploy' | 'reboot' | 'update';
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;              // ISO 8601 timestamp
  executedAt?: string;            // ISO 8601 timestamp (when completed)
  result?: string;                // Command output or error message
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

### AgentVersion
```typescript
{
  id: string;
  platform: 'Linux' | 'Windows' | 'Mac';
  architecture: 'x86' | 'amd64' | 'arm64';
  version: string;
  lastUpdatedAt: string;          // ISO 8601 timestamp
}
```

---

## TDD Test Scenarios

### GET /v1/agents

**Query Parameters**
| Param | Type | Description |
|-------|------|-------------|
| status | string | Filter by status |
| os | string | Filter by OS |
| search | string | Search by name, hostname |

**Success Case** (200)
```json
[
  {
    "id": "1",
    "machineId": "MACH-001-ABC",
    "name": "MacOS 01",
    "status": "Connected",
    "os": "MacOS",
    "osVersion": "14.5",
    "agentVersion": "2.1.0",
    "lastHeartbeat": "2024-01-13T10:15:00Z",
    "lastHeartbeatRelative": "2 minutes ago",
    "registeredAt": "2024-01-01T09:00:00Z",
    "ipAddress": "192.168.1.100",
    "hostname": "macbook-pro-01",
    "serialNumber": "C0265B8FGL14",
    "assetId": "ASSET-001",
    "tags": ["development", "team-a"],
    "groups": [
      { "id": "g1", "name": "Dev Team" },
      { "id": "g2", "name": "Critical Systems" }
    ],
    "capabilities": ["scan", "deploy", "reboot"]
  }
]
```

**Tests**
- Valid token → return all agents with current status
- Filter by status → return only matching agents
- Filter by OS → return only matching OS agents
- Search → return matching name/hostname
- Missing token → 401 `{ "error": "Authentication required" }`
- Empty list → 200 `[]`

---

### GET /v1/agents/:id

**Success Case** (200)
```json
{
  "id": "1",
  "machineId": "MACH-001-ABC",
  "name": "MacOS 01",
  "status": "Connected",
  "os": "MacOS",
  "osVersion": "14.5",
  "agentVersion": "2.1.0",
  "lastHeartbeat": "2024-01-13T10:15:00Z",
  "lastHeartbeatRelative": "2 minutes ago",
  "registeredAt": "2024-01-01T09:00:00Z",
  "ipAddress": "192.168.1.100",
  "hostname": "macbook-pro-01",
  "serialNumber": "C0265B8FGL14",
  "assetId": "ASSET-001",
  "tags": ["development", "team-a"],
  "groups": [
    { "id": "g1", "name": "Dev Team" }
  ],
  "capabilities": ["scan", "deploy", "reboot"]
}
```

**Error Cases**
| Case | Status | Response |
|------|--------|----------|
| Not found | 404 | `{ "error": "Agent not found" }` |
| Invalid ID | 400 | `{ "error": "Invalid agent ID" }` |

---

### GET /v1/agents/:id/commands

**Success Case** (200)
```json
[
  {
    "id": "cmd-1",
    "agentId": "1",
    "type": "scan",
    "status": "completed",
    "createdAt": "2024-01-13T09:00:00Z",
    "executedAt": "2024-01-13T09:02:00Z",
    "result": "Scan completed: 45 patches available"
  },
  {
    "id": "cmd-2",
    "agentId": "1",
    "type": "deploy",
    "status": "pending",
    "createdAt": "2024-01-13T10:00:00Z"
  }
]
```

**Error Cases**
| Case | Status | Response |
|------|--------|----------|
| Agent not found | 404 | `{ "error": "Agent not found" }` |

---

### GET /v1/agents/downloads

**Success Case** (200)
```json
[
  {
    "os": "Windows 11",
    "version": "2.1.0",
    "releaseDate": "25/12/24",
    "downloadUrl": "/downloads/windows-agent.exe"
  },
  {
    "os": "MacOS",
    "version": "2.1.0",
    "releaseDate": "25/12/24",
    "downloadUrl": "/downloads/macos-agent.dmg"
  },
  {
    "os": "Linux",
    "version": "2.0.5",
    "releaseDate": "20/12/24",
    "downloadUrl": "/downloads/linux-agent.deb"
  }
]
```

---

### DELETE /v1/agents/:id

**Success Case** (200)
```json
{
  "success": true,
  "message": "Agent deleted successfully"
}
```

**Error Cases**
| Case | Status | Response |
|------|--------|----------|
| Not found | 404 | `{ "error": "Agent not found" }` |
| Invalid ID | 400 | `{ "error": "Invalid agent ID" }` |

---

### GET /v1/agent-versions

Returns list of available agent versions for different platforms.

**Success Case** (200)
```json
[
  {
    "id": "1",
    "platform": "Linux",
    "architecture": "x86",
    "version": "5.0.12",
    "lastUpdatedAt": "2024-01-15T14:30:00Z"
  },
  {
    "id": "2",
    "platform": "Linux",
    "architecture": "amd64",
    "version": "5.0.12",
    "lastUpdatedAt": "2024-01-15T14:30:00Z"
  },
  {
    "id": "3",
    "platform": "Windows",
    "architecture": "x86",
    "version": "5.0.12",
    "lastUpdatedAt": "2024-01-15T14:30:00Z"
  },
  {
    "id": "4",
    "platform": "Windows",
    "architecture": "amd64",
    "version": "5.0.12",
    "lastUpdatedAt": "2024-01-15T14:30:00Z"
  },
  {
    "id": "5",
    "platform": "Mac",
    "architecture": "x86",
    "version": "5.0.12",
    "lastUpdatedAt": "2024-01-15T14:30:00Z"
  },
  {
    "id": "6",
    "platform": "Mac",
    "architecture": "amd64",
    "version": "5.0.12",
    "lastUpdatedAt": "2024-01-15T14:30:00Z"
  }
]
```

---

### GET /v1/agent-versions/:id/download

Downloads binary file for specified agent version.

**Success Case** (200)
- Content-Type: `application/octet-stream`
- Content-Disposition: `attachment; filename="agent-{platform}-{arch}-v{version}"`

**Error Cases**
| Case | Status | Response |
|------|--------|----------|
| Not found | 404 | `{ "error": "Version not found" }` |

---

## Database Schema

```sql
-- Agents
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'Pending',
  os VARCHAR(50) NOT NULL,
  os_version VARCHAR(100),
  agent_version VARCHAR(50),
  last_heartbeat TIMESTAMP,
  registered_at TIMESTAMP DEFAULT NOW(),
  ip_address INET,
  hostname VARCHAR(255),
  serial_number VARCHAR(100),
  asset_id UUID REFERENCES assets(id),
  capabilities TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_agents_machine_id ON agents(machine_id);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_asset ON agents(asset_id);

-- Agent Tags (many-to-many)
CREATE TABLE agent_tags (
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  tag VARCHAR(100) NOT NULL,
  PRIMARY KEY (agent_id, tag)
);

-- Agent Groups (many-to-many)
CREATE TABLE agent_group_memberships (
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  group_id UUID REFERENCES agent_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (agent_id, group_id)
);

-- Agent Groups
CREATE TABLE agent_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Commands
CREATE TABLE agent_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  executed_at TIMESTAMP,
  result TEXT
);
CREATE INDEX idx_commands_agent ON agent_commands(agent_id);
CREATE INDEX idx_commands_status ON agent_commands(status);

-- Agent Downloads (static/seed data)
CREATE TABLE agent_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os VARCHAR(50) NOT NULL,
  version VARCHAR(50) NOT NULL,
  release_date DATE NOT NULL,
  download_url TEXT NOT NULL,
  file_size BIGINT,
  checksum VARCHAR(64),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Agent Versions (for downloads page)
CREATE TABLE agent_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(50) NOT NULL,
  architecture VARCHAR(20) NOT NULL,
  version VARCHAR(50) NOT NULL,
  last_updated_at TIMESTAMP DEFAULT NOW(),
  download_url TEXT,
  file_size BIGINT,
  checksum VARCHAR(64),
  UNIQUE(platform, architecture, version)
);
```

---

## Frontend Expectations

**API Base URL**: `/v1` (see `frontend/src/services/agent.service.ts`)

**Auto-behaviors**:
- Frontend sends `Authorization: Bearer <token>` on every API call
- Frontend intercepts 401 responses → redirects to /login
- On DELETE success → removes agent from UI list
- On GET /agents → displays in table with status badges

**Agent Status Colors**:
- Connected: Green
- Disconnected: Red
- Pending: Orange
- Error: Red

---

## Implementation Order (TDD)

1. Write tests first for each endpoint (success + all error cases)
2. Implement full Agent model with all fields
3. Implement GET /v1/agents endpoint (list with filtering)
4. Implement GET /v1/agents/:id endpoint (single agent)
5. Implement GET /v1/agents/:id/commands endpoint
6. Implement GET /v1/agents/downloads endpoint
7. Implement DELETE /v1/agents/:id endpoint
8. Implement GET /v1/agent-versions endpoint
9. Implement GET /v1/agent-versions/:id/download endpoint
10. Add agent registration/heartbeat mechanism
11. Add asset linking (agent ↔ asset relationship)
12. Add integration tests with real DB

---

## Notes
- Base URL: `/v1` (not `/api`)
- All timestamps: ISO 8601 format
- All IDs: UUIDs
- lastHeartbeatRelative: Computed field (e.g., "2 minutes ago")
- Status updates: Consider WebSocket/SSE for real-time agent status
- Agent capabilities determine which commands can be sent
- Agents can be linked to assets via assetId field
