# Frontend Conflicts & Required Changes

This document lists all conflicts between the current frontend implementation and the new contracts, along with required changes to achieve full compatibility.

## Summary

| Category | Severity | Files Affected | Effort |
|----------|----------|----------------|--------|
| Agent Type Expansion | 🔴 High | 5 files | Medium |
| Asset/Endpoint Unification | 🔴 High | 8 files | High |
| Security Data Addition | 🔴 High | 4 files | Medium |
| Network Data Expansion | 🟡 Medium | 3 files | Low |
| Peripheral Data Addition | 🟡 Medium | 3 files | Medium |
| Telemetry Infrastructure | 🟡 Medium | 4 files | Medium |
| API Endpoint Changes | 🔴 High | 10 files | Medium |

---

## 1. Agent Type Conflicts

### Current Implementation (`agent.types.ts`)
```typescript
type Agent = {
  id: string;
  name: string;
  status: 'Connected' | 'Disconnected';
  lastConnectedTime: string;
  os: string;
  version: string;
};
```

### Required Changes

The Agent type is severely underspecified. It needs to be expanded to match `contracts/schemas/agent.schema.json`.

**Files to Update:**
- `frontend/src/types/agent.types.ts`
- `frontend/src/services/agent.service.ts`
- `frontend/src/mocks/handlers/agent.handlers.ts`
- `frontend/src/pages/discovery/Agents.tsx`

**New Agent Type:**
```typescript
type AgentStatus = 'Connected' | 'Disconnected' | 'Pending' | 'Error';
type OSFamily = 'Windows' | 'MacOS' | 'Linux';

type Agent = {
  id: string;
  machineId: string;
  name: string;
  status: AgentStatus;
  os: OSFamily;
  osVersion: string;
  agentVersion: string;
  lastHeartbeat: string; // ISO 8601
  lastHeartbeatRelative: string; // "2 minutes ago"
  registeredAt: string;
  ipAddress?: string;
  hostname?: string;
  serialNumber?: string;
  assetId?: string; // Link to asset
  tags?: string[];
  groups?: Array<{ id: string; name: string }>;
  capabilities?: string[];
};
```

**Breaking Changes:**
- `lastConnectedTime` → `lastHeartbeat` (ISO format) + `lastHeartbeatRelative` (display string)
- `os` → `os` (now typed enum) + `osVersion` (full version string)
- `version` → `agentVersion`

**UI Impact:**
- Agents.tsx table columns need updating
- Status display needs new states ('Pending', 'Error')
- Add link to associated Asset

---

## 2. Asset/Endpoint Unification

### Current Problem

The codebase has two overlapping types:
1. `Asset` in `asset.types.ts` - Used in Assets pages
2. `EndpointDetails` in `patch.service.ts` - Used in Patches pages

These represent the **same entity** (a managed device) but with different fields.

### Required Changes

**Option A (Recommended): Unify to Asset**
- `EndpointDetails` becomes a view of `Asset`
- Add `patchStatus` to Asset
- `Endpoint` in patches context references `Asset.id`

**Files to Update:**
- `frontend/src/types/asset.types.ts` - Add patch-related fields
- `frontend/src/services/patch.service.ts` - Remove duplicate EndpointDetails
- `frontend/src/components/patches/EndpointDetailsDrawer.tsx` - Use Asset type
- `frontend/src/mocks/handlers/patch.handlers.ts` - Update mock data

**Asset Type Additions:**
```typescript
// Add to Asset type
type Asset = {
  // ... existing fields ...

  // Agent Link
  agentId?: string;
  agentName?: string;
  agentVersion?: string;
  agentStatus?: 'Connected' | 'Disconnected';

  // Patch Status (computed from patch scan)
  patchStatus?: {
    total: number;
    installed: number;
    missing: number;
    failed: number;
    pending: number;
    lastScanDate: string;
    criticalMissing: number;
    securityMissing: number;
  };

  // Groups for patch deployment targeting
  groups?: Array<{ id: string; name: string }>;
};
```

**Remove from patch.service.ts:**
```typescript
// DELETE these - merge into Asset
export type EndpointDetails = { ... };
export type Endpoint = { ... };
```

---

## 3. Security Data Missing

### Current State

The `Asset` and `Hardware` types have **no security compliance data**. The user requirements specify:
- Drive encryption (BitLocker/FileVault)
- Firewall status
- Antivirus status
- Local user accounts
- Patch compliance status

### Required Changes

**Files to Update:**
- `frontend/src/types/asset.types.ts` - Add Security type
- `frontend/src/services/asset.service.ts` - Add getAssetSecurity()
- `frontend/src/mocks/handlers/asset.handlers.ts` - Add mock security data
- Create new component: `frontend/src/pages/assets/components/SecurityTab.tsx`

**New Type:**
```typescript
// Add to asset.types.ts
export type SecurityStatus = {
  encryption: {
    driveEncryptionEnabled: boolean;
    encryptionType: 'BitLocker' | 'FileVault' | 'LUKS' | 'None';
    systemDriveEncrypted: boolean;
    encryptionPercentage?: number;
  };
  firewall: {
    enabled: boolean;
    productName: string;
    activeProfile?: string;
  };
  antivirus: {
    installed: boolean;
    products: Array<{
      name: string;
      enabled: boolean;
      realTimeProtection: boolean;
      definitionVersion: string;
      definitionDate: string;
      lastScanDate?: string;
    }>;
  };
  userAccounts: {
    localAdminCount: number;
    localAdminAccounts: string[];
    guestAccountEnabled: boolean;
  };
  compliance: {
    secureBootEnabled: boolean;
    uacEnabled?: boolean; // Windows
    sipEnabled?: boolean; // macOS
    screenLockEnabled: boolean;
    screenLockTimeout?: number;
  };
};
```

**New API Endpoint:**
```typescript
// asset.service.ts
async getAssetSecurity(assetId: string): Promise<SecurityStatus> {
  const response = await api.get(`/api/assets/${assetId}/security`);
  return response.data;
}
```

---

## 4. Network Data Expansion

### Current State

`NetworkAdapter` is minimal:
```typescript
type NetworkAdapter = {
  id: string;
  name: string;
  ipAddressV4?: string;
  ipAddressV6?: string;
  macAddress: string;
  dhcpServer?: string;
};
```

### Required Additions

Match `contracts/schemas/network.schema.json`:

```typescript
type NetworkAdapter = {
  // ... existing fields ...

  // New fields
  type: 'Ethernet' | 'WiFi' | 'Virtual' | 'VPN' | 'Unknown';
  status: 'Up' | 'Down' | 'Disconnected';
  speedMbps?: number;
  subnetMask?: string;
  defaultGateway?: string;
  dnsServers?: string[];
};

// New type for Wi-Fi
type WiFiConnection = {
  ssid: string;
  signalStrength: number; // 0-100
  rssi?: number; // dBm
  securityType: 'WPA2' | 'WPA3' | 'Open' | 'Unknown';
  channel?: number;
  band?: '2.4GHz' | '5GHz' | '6GHz';
};

// Add to Asset
type Asset = {
  // ... existing ...
  network?: {
    hostname: string;
    domainName?: string;
    isDomainJoined: boolean;
    adapters: NetworkAdapter[];
    wifiConnection?: WiFiConnection;
    vpnConnected?: boolean;
  };
};
```

**Files to Update:**
- `frontend/src/types/asset.types.ts`
- `frontend/src/mocks/handlers/asset.handlers.ts`
- Asset details Hardware tab (add network section)

---

## 5. Peripheral Data Missing

### Current State

No peripheral tracking (monitors, USB devices, printers, docking stations).

### Required Additions

**New Type (`asset.types.ts`):**
```typescript
export type Monitor = {
  id: string;
  name: string;
  manufacturer?: string;
  serialNumber?: string;
  resolution: string;
  connectionType: 'HDMI' | 'DisplayPort' | 'USB-C' | 'Internal';
  isPrimary: boolean;
  isBuiltIn: boolean;
};

export type USBDevice = {
  id: string;
  name: string;
  manufacturer?: string;
  deviceType: 'Keyboard' | 'Mouse' | 'Storage' | 'Printer' | 'Other';
  vendorId: string;
  productId: string;
};

export type Printer = {
  id: string;
  name: string;
  connectionType: 'USB' | 'Network' | 'WiFi';
  status: 'Ready' | 'Offline' | 'Error';
  isDefault: boolean;
};

export type Peripherals = {
  monitors: Monitor[];
  usbDevices: USBDevice[];
  printers: Printer[];
  bluetoothDevices: Array<{
    name: string;
    type: string;
    connected: boolean;
  }>;
};
```

**New API:**
```typescript
// asset.service.ts
async getAssetPeripherals(assetId: string): Promise<Peripherals>
```

**New UI Component:**
- `frontend/src/pages/assets/components/PeripheralsTab.tsx`

---

## 6. Telemetry Infrastructure Missing

### Current State

`Performance` type is static snapshot:
```typescript
type Performance = {
  systemUptime: string;
  memoryUtilization: number;
  cpuUtilization: number;
  diskUtilization: number;
};
```

### Required Changes

For real-time telemetry, need:

1. **WebSocket connection** for live updates
2. **Time-series storage** for historical data
3. **Charts/graphs** for visualization

**New Types:**
```typescript
export type TelemetryPoint = {
  timestamp: string;
  cpu: number;
  memory: number;
  disk: number;
  network?: {
    bytesIn: number;
    bytesOut: number;
  };
};

export type TelemetryHistory = {
  assetId: string;
  interval: '1h' | '24h' | '7d' | '30d';
  points: TelemetryPoint[];
};

export type SystemErrors = {
  applicationCrashes24h: number;
  bsodCount30d?: number;
  kernelPanicCount30d?: number;
  lastCrash?: {
    timestamp: string;
    application: string;
    errorCode?: string;
  };
};
```

**New APIs:**
```typescript
// asset.service.ts
async getAssetTelemetryHistory(assetId: string, interval: string): Promise<TelemetryHistory>
async getAssetErrors(assetId: string): Promise<SystemErrors>
```

**UI Changes:**
- Add real-time telemetry dashboard component
- Add historical charts (use Chart.js or Recharts)
- Add system errors section

---

## 7. API Endpoint Changes

### Current API Structure
```
/api/agents
/api/agents/downloads
/api/agents/:id

/api/assets
/api/assets/:id
/api/assets/:id/hardware
/api/assets/:id/software
/api/assets/:id/lifecycle
/api/assets/:id/audit-log
```

### Required New Endpoints
```
# Agent Management (expanded)
/api/agent/register          # Agent registration (agent-facing)
/api/agent/heartbeat         # Heartbeat (agent-facing)
/api/agent/commands          # Command queue (agent-facing)
/api/agent/inventory         # Inventory upload (agent-facing)
/api/agent/telemetry         # Telemetry upload (agent-facing)

# Management API (UI-facing)
/api/agents                  # List agents (existing)
/api/agents/:id              # Agent details (expand response)
/api/agents/:id/commands     # View command history

# Asset API (expanded)
/api/assets/:id/security     # NEW: Security compliance
/api/assets/:id/network      # NEW: Network details
/api/assets/:id/peripherals  # NEW: Peripheral inventory
/api/assets/:id/telemetry    # NEW: Telemetry history
/api/assets/:id/errors       # NEW: System errors
/api/assets/:id/patches      # NEW: Patch status for asset

# Unified Endpoint
/api/endpoints/:id           # Returns asset with patch context
```

### Service Updates Required

**agent.service.ts:**
```typescript
// Add new methods
getAgentDetails(id: string): Promise<Agent>
getAgentCommands(id: string): Promise<Command[]>
```

**asset.service.ts:**
```typescript
// Add new methods
getAssetSecurity(id: string): Promise<SecurityStatus>
getAssetNetwork(id: string): Promise<NetworkConfiguration>
getAssetPeripherals(id: string): Promise<Peripherals>
getAssetTelemetry(id: string, interval: string): Promise<TelemetryHistory>
getAssetErrors(id: string): Promise<SystemErrors>
getAssetPatches(id: string): Promise<PatchStatus>
```

---

## 8. Hardware Type Expansions

### Current State (Partial)
```typescript
type Drive = {
  name: string;
  drive: string;
  capacity: string;
  used: string;
  format: string;
  type: string;
  serialNumber: string;
};
```

### Required Additions

**SMART Health Status:**
```typescript
type DriveSmartStatus = {
  healthy: boolean;
  status: 'OK' | 'Warning' | 'Critical' | 'Unknown';
  temperature?: number;
  powerOnHours?: number;
  wearLevelingCount?: number; // SSDs
};

type Drive = {
  // ... existing ...
  smartStatus?: DriveSmartStatus;
  freeSpace: string; // NEW
  usagePercent: number; // NEW
};
```

**Memory Expansion:**
```typescript
type MemorySlot = {
  // ... existing ...
  totalSlots?: number; // NEW: System total
  usedSlots?: number;  // NEW: Populated slots
  maxCapacityGB?: number; // NEW
};
```

---

## 9. MSW Handler Updates

All mock handlers need updating to return data matching new schemas.

**Priority Order:**
1. `agent.handlers.ts` - Expand agent data
2. `asset.handlers.ts` - Add security, network, peripheral endpoints
3. `patch.handlers.ts` - Update endpoint references to use asset

---

## 10. UI Component Updates

### Agents Page (`Agents.tsx`)

**Current Columns:**
- Agent Name
- Status
- Last Connected Time
- OS
- Agent Version

**Add Columns:**
- IP Address
- Hostname
- Linked Asset (clickable)
- Groups

**Add Features:**
- Agent details drawer (similar to EndpointDetailsDrawer)
- Link to Asset page
- View command history

### Asset Details Page

**Current Tabs:**
- Overview
- Hardware
- Software
- Life Cycle
- Audit Log

**Add Tabs:**
- Security (encryption, firewall, AV)
- Network (detailed network config)
- Peripherals (monitors, USB, printers)
- Telemetry (real-time + historical)
- Patches (patch compliance for this asset)

### EndpointDetailsDrawer

**Update to use Asset type:**
- Reference Asset.id instead of separate Endpoint.id
- Pull security status from Asset
- Show agent link from Asset.agentId

---

## Migration Path

### Phase 1: Type Updates (Non-breaking)
1. Expand Agent type with optional new fields
2. Expand Asset type with optional new fields
3. Update MSW handlers to include new data
4. Update UI to display new data when available

### Phase 2: New Features
1. Add Security tab to Asset details
2. Add Peripherals tab to Asset details
3. Add Telemetry tab with charts
4. Expand Agent details

### Phase 3: Unification (Breaking)
1. Merge EndpointDetails into Asset
2. Update all Patches pages to use Asset
3. Remove duplicate types
4. Update all API calls

### Phase 4: Real-time Features
1. Add WebSocket for telemetry
2. Add real-time agent status updates
3. Add notification for offline agents

---

## Estimated Impact

| Component | Changes Required | Risk Level |
|-----------|-----------------|------------|
| Types | 4 files, extensive | Medium |
| Services | 2 files, add methods | Low |
| MSW Handlers | 3 files, extensive | Medium |
| Pages | 5 files, moderate | Medium |
| New Components | 4 new files | Low |
| Existing Components | 3 files, minor | Low |

**Total Effort Estimate:** 3-5 days of frontend work

---

## Backward Compatibility

The new contracts are designed to be backward compatible:
- All new fields are optional
- Existing API endpoints continue to work
- UI gracefully handles missing data
- Migration can be phased

Frontend can start using new fields as backend implements them.
