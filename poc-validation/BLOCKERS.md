# PatchIQ POC Blockers

> Critical issues that must be fixed for POC demo

---

## BLOCKER-001: Asset Details Page Crashes

**Severity**: Critical - Blocks asset visibility demo

**Symptom**:
- Clicking on any asset in the Assets list causes white screen crash
- Browser console shows: `TypeError: Cannot read properties of undefined (reading 'systemUptime')`

**Root Cause**:
- Frontend code accesses `asset.performance.systemUptime` without null checks
- Backend API `/v1/assets/:id` doesn't return a `performance` object
- File: `frontend/src/pages/assets/components/AssetDetails.tsx:2031`

**Code at fault**:
```tsx
// Line 2031 - crashes because asset.performance is undefined
<Text strong>{asset.performance.systemUptime}</Text>
```

**Backend Response** (actual):
```json
{
  "id": "e742c94a-d6b0-42be-99f7-89527cb8fc2e",
  "assetId": "E742C94A",
  "name": "192.168.1.2",
  "status": "In Use",
  "operationalStatus": "Connected",
  "osType": "MacOS",
  "osVersion": "26.1"
  // NO performance object!
}
```

**Frontend Expects**:
```json
{
  ...
  "performance": {
    "systemUptime": "2 day, 24 hrs, 15 min, 30 sec",
    "memoryUtilization": 45,
    "cpuUtilization": 30,
    "diskUtilization": 60
  }
}
```

**Fix Options**:

### Option A: Fix Frontend (Quick Fix)
Add optional chaining to prevent crash:
```tsx
// Before
<Text strong>{asset.performance.systemUptime}</Text>

// After
<Text strong>{asset.performance?.systemUptime ?? 'N/A'}</Text>
```

Apply similar fix to all `asset.performance.*` accesses in AssetDetails.tsx.

### Option B: Fix Backend (Proper Fix)
Include `performance` data in the asset response, either:
1. From `asset_hardware` table (if it has telemetry)
2. From `agent_telemetry` table (latest telemetry)
3. Add default values when no telemetry exists

**Recommended**: Do both - frontend should handle missing data gracefully, AND backend should return complete data.

**Files to Fix**:
- `frontend/src/pages/assets/components/AssetDetails.tsx` - Lines 2031-2060 (Performance section)

---

## BLOCKER-002: Hardware Endpoint Returns Incomplete Data

**Severity**: Medium - Affects asset detail display

**Symptom**:
- Hardware tab would show mostly empty data
- Agent collected data not appearing in API response

**Backend Response** (actual):
```json
{
  "bios": {},
  "processor": {},
  "storage": [{"name": "Primary Drive", "type": "SSD"}],
  "memory": [{"slot": "Slot 1"}],
  "networkAdapters": []
}
```

**Expected**:
- Full BIOS info (vendor, version, date)
- Full processor info (model, cores, speed)
- Full storage info (capacity, health, SMART status)
- Full memory info (total, type, speed)

**Investigation Needed**:
1. Is the agent sending complete hardware data?
2. Is the backend storing it correctly?
3. Is the API returning all stored data?

---

## Summary

| ID | Issue | Severity | Status | Fix Effort |
|----|-------|----------|--------|------------|
| BLOCKER-001 | Asset Details crashes | Critical | Open | 30 min |
| BLOCKER-002 | Incomplete hardware data | Medium | Open | TBD |

---

## Next Steps

1. **Fix BLOCKER-001 first** - Add null checks to AssetDetails.tsx
2. Run agent on fresh machine to verify data collection
3. Check backend asset service for data transformation
4. Re-test Asset Details page
