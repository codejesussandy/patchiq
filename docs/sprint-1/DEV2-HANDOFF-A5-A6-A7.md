# Dev 2 Handoff: A.5 + A.6 + A.7 Backend Changes

> **Date:** 2026-02-13
> **From:** Dev 1 (Track A)
> **To:** Dev 2 (Track B)
> **Full PRD:** `docs/sprint-1/PRD-A5-A6-A7-DISCOVERY-IMPORT-CREDENTIALS.md`

---

## What's Being Built

Dev 1 is implementing three backend features that were previously stubbed/mocked. Here's what changes and what you need to know.

---

## A.5 — Network Discovery Scanning

**Before:** `POST /discovery/ip-ranges/:id/scan` creates a DB record, returns a fake job ID, never scans.
**After:** Queues a real BullMQ job that performs ICMP ping sweep + TCP port scan, populates `DiscoveredDevice` table.

### What Changes for You

**Unblocks: B.11 (Discovery Results UI)**

| Endpoint | Response Shape |
|----------|---------------|
| `POST /discovery/ip-ranges/:id/scan` | `{ success: true, data: { scanId: string, message: "Scan queued" } }` |
| `GET /discovery/scans/:id` | Returns scan record with `status` (`PENDING` / `IN_PROGRESS` / `COMPLETED` / `FAILED`), `devicesFound` count, `completedAt` |

**New data in `DiscoveredDevice` records:**

```typescript
{
  id: string;
  ipAddress: string;          // always populated
  hostname: string | null;    // from reverse DNS (P1, may be null in v1)
  macAddress: string | null;  // from ARP table (P1, may be null in v1)
  openPorts: number[];        // e.g. [22, 80, 443]
  deviceType: string | null;  // SERVER, WORKSTATION, NETWORK_DEVICE, PRINTER, UNKNOWN (P1)
  os: string | null;          // LINUX, WINDOWS, MACOS, UNKNOWN (P1)
  status: "ONLINE";
  lastSeen: Date;
  scanId: string;
}
```

**Frontend considerations:**
- Scan is async — the POST returns immediately, results populate over time
- Poll `GET /discovery/scans/:id` for status updates, or use the existing `usePolling` hook
- A /24 scan takes up to ~2 minutes. Show a progress indicator
- `status: 'FAILED'` will include an `errorMessage` field — display it to the user

---

## A.6 — Asset File Upload & CSV Import

**Before:** Four endpoints return `501 Not Implemented`.
**After:** All four accept real files and return structured results.

### What Changes for You

**Unblocks: B.10 (Asset Import UI Wizard)**

#### 1. File Attachment Upload

| Endpoint | Method | Content-Type |
|----------|--------|--------------|
| `/assets/:id/attachments` | POST | `multipart/form-data` |

**Request:** Single file field (any name), max 10MB.

**Response:**
```typescript
{
  success: true,
  data: {
    id: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    downloadUrl: string;   // presigned MinIO URL, valid ~1 hour
  }
}
```

**Error cases:**
- File > 10MB → `413` with message
- Asset not found → `404`

#### 2. CSV Imports (All Three)

| Endpoint | What It Imports |
|----------|----------------|
| `POST /software-inventory/import` | Software inventory records |
| `POST /software-licenses/import` | Software license records |
| `POST /os-licenses/import` | OS license records |

**Request:** `multipart/form-data` with a single CSV file.

**Response (all three share this shape):**
```typescript
{
  success: true,
  data: {
    imported: number;
    failed: number;
    errors: Array<{
      row: number;      // 1-indexed row number (excluding header)
      field: string;    // which column failed
      message: string;  // human-readable reason
    }>;
  }
}
```

**CSV Column Headers:**

Software Inventory:
```
name,version,vendor,installedDate,size
```
- Required: `name`, `version`, `vendor`
- Optional: `installedDate`, `size`

Software Licenses:
```
licenseName,licenseKey,vendor,expirationDate,seats
```
- Required: `licenseName`, `licenseKey`, `vendor`
- Optional: `expirationDate`, `seats`

OS Licenses:
```
osName,licenseKey,activationDate,expirationDate
```
- Required: `osName`, `licenseKey`
- Optional: `activationDate`, `expirationDate`

**Frontend considerations:**
- Partial imports are supported: 95 valid + 5 invalid = 95 created + error report
- Display the `errors` array as a table with row number, field, and message
- Empty CSV (headers only) returns `{ imported: 0, failed: 0, errors: [] }` — not an error
- Show `imported` / `failed` counts as a summary after upload completes
- The existing `assetService` methods (`importSoftwareInventory`, `importSoftwareLicenses`, `importOSLicenses`, `uploadAssetAttachment`) already use the correct URLs — no service changes needed

---

## A.7 — Credential Testing

**Before:** `POST /discovery/credentials/:id/test` always returns `{ success: true }`.
**After:** Performs a real SSH/WinRM/SNMP connection test.

### What Changes for You

**No direct frontend blocker**, but the discovery pages display credential test results.

| Endpoint | Method |
|----------|--------|
| `/discovery/credentials/:id/test` | POST |

**Request body (unchanged):**
```typescript
{ targetHost: string }  // must be a valid IP address
```

**New response shape:**
```typescript
{
  success: true,
  data: {
    success: boolean;
    message: string;
    errorCode?: "AUTH_FAILED" | "HOST_UNREACHABLE" | "TIMEOUT" | "UNKNOWN";
    latencyMs?: number;   // milliseconds, only on success
  }
}
```

**Frontend considerations:**
- Tests can take up to 10 seconds (timeout). Show a loading state
- Use `errorCode` to display targeted help:
  - `AUTH_FAILED` → "Check username and password"
  - `HOST_UNREACHABLE` → "Verify the host is online and accessible"
  - `TIMEOUT` → "Connection timed out — check firewall rules"
- `latencyMs` on success can be shown as a small detail (e.g., "Connected in 245ms")

---

## Existing Frontend Service Methods (No Changes Needed)

These service calls already exist and use the correct URLs:

| Service File | Method | Backend Endpoint |
|-------------|--------|------------------|
| `asset.service.ts:241` | `uploadAssetAttachment(id, file)` | `POST /assets/:id/attachments` |
| `asset.service.ts:268` | `importSoftwareInventory(file)` | `POST /software-inventory/import` |
| `asset.service.ts:303` | `importSoftwareLicenses(file)` | `POST /software-licenses/import` |
| `asset.service.ts:338` | `importOSLicenses(file)` | `POST /os-licenses/import` |
| `discovery.service.ts:95` | `testCredential(id)` | `POST /discovery/credentials/:id/test` |

The URLs won't change. Only the responses go from 501/mocked to real data.

---

## When to Expect These

| Item | Est. Completion | Your Unblocked Item |
|------|----------------|---------------------|
| A.7 (Credential Testing) | Day 1 | — (no blocker) |
| A.6 (CSV Import + Upload) | Day 2-3 | **B.10** — Asset Import UI Wizard |
| A.5 (Network Discovery) | Day 4-7 | **B.11** — Discovery Results UI |

Dev 1 will notify on merge to main for each item. Rebase `track-b` onto `main` after each merge.

---

## Questions? Conflicts?

- If you need different CSV column names, raise it before A.6 lands
- If the discovery response shape doesn't work for B.11, flag it early
- Full acceptance criteria and test plan: `docs/sprint-1/PRD-A5-A6-A7-DISCOVERY-IMPORT-CREDENTIALS.md`
