# PRD: A.5 + A.6 + A.7 — Network Discovery, Asset Import & Credential Testing

> **Sprint:** 1 (Track A — Backend & Platform)
> **Priority:** Should Have (Week 3-4)
> **Owner:** Dev 1
> **Last Updated:** 2026-02-13
> **Blocks:** B.10 (Asset Import UI), B.11 (Discovery Results UI)

---

## 1. Problem Statement

Three core platform features are fully scaffolded (routes, controllers, validators, Prisma models) but contain **zero working business logic**:

1. **Network discovery** (`triggerScan()`) creates a database record and returns a mock job ID but never scans anything. Discovery is the **#1 advertised feature** of PatchIQ and it does not work.
2. **Asset file upload & CSV import** — four endpoints return HTTP 501. Bulk onboarding of software inventory, software licenses, and OS licenses requires manual data entry.
3. **Credential testing** (`testCredential()`) always returns `{ success: true }` regardless of input. Users get false confidence and deployments fail at runtime.

**Who is affected:** Every admin who tries to discover network devices, import asset data in bulk, or validate credentials before deploying patches. These are day-1 workflows.

**Cost of not solving:** The platform cannot be demoed as a functional product. Sprint 2 themes (Patch-CVE correlation, AI/MCP access) depend on real asset and vulnerability data flowing through the system.

---

## 2. Goals

| # | Goal | Measure |
|---|------|---------|
| G1 | Network discovery finds real devices on the network | A scan of a /24 subnet returns at least the host machine and any other live IPs |
| G2 | CSV import creates real database records | Importing a 100-row CSV produces 100 records (or N valid + error report for invalid) |
| G3 | Credential testing gives honest pass/fail results | Testing an invalid SSH key returns `success: false` with a meaningful error |
| G4 | All three features follow existing patterns | BullMQ workers, MinIO service, Zod validation, standard error envelope |
| G5 | Frontend pages work end-to-end after backend ships | B.10 and B.11 can integrate without additional backend changes |

---

## 3. Non-Goals

| # | Non-Goal | Reason |
|---|----------|--------|
| N1 | Agent-based discovery (push from Go agent) | Current architecture is hub-initiated scan; agent-based is Sprint 2+ |
| N2 | SNMP v3 credential testing | Only v2c community string testing in v1; v3 adds auth/priv complexity |
| N3 | Automatic asset creation from discovered devices | Discovery populates `DiscoveredDevice`; promoting to `Asset` is a separate workflow |
| N4 | Excel/XLSX import support | CSV only for v1; Excel parsing adds a library dependency for marginal gain |
| N5 | Scheduled/recurring discovery scans | Manual trigger only in v1; scheduling infrastructure is in the model but deferred |
| N6 | Credential vault integration (HashiCorp Vault, etc.) | Existing `passwordEnc` field with app-level encryption is sufficient for v1 |

---

## 4. User Stories

### A.5 — Network Discovery

- **US-5.1:** As a network admin, I want to trigger a scan of an IP range so that I can see which devices are live on my network.
- **US-5.2:** As a network admin, I want to see the progress of a running scan so that I know when results will be available.
- **US-5.3:** As a network admin, I want scan results to include IP address, hostname, MAC address, open ports, and device type so that I can identify what's on the network.
- **US-5.4:** As a network admin, I want failed scans to report errors (e.g., "subnet unreachable") so that I can troubleshoot network issues.

### A.6 — Asset File Upload & CSV Import

- **US-6.1:** As an IT admin, I want to upload a CSV file of software inventory so that I can bulk-onboard hundreds of software records without manual entry.
- **US-6.2:** As an IT admin, I want to upload a CSV of software licenses so that I can track license compliance in bulk.
- **US-6.3:** As an IT admin, I want to upload a CSV of OS licenses so that I can register operating system entitlements.
- **US-6.4:** As an IT admin, I want to see which rows failed validation (with line numbers and reasons) so that I can fix and re-import them.
- **US-6.5:** As an IT admin, I want to attach files (PDFs, images, documents) to an asset record so that I can store supporting documentation alongside the asset.

### A.7 — Credential Testing

- **US-7.1:** As a deployment engineer, I want to test SSH credentials against a target host so that I know my credentials work before attempting a deployment.
- **US-7.2:** As a deployment engineer, I want to test WinRM credentials against a Windows host so that I can validate Windows access.
- **US-7.3:** As a deployment engineer, I want to test SNMP credentials against a network device so that I can verify monitoring access.
- **US-7.4:** As a deployment engineer, I want clear error messages when a credential test fails (auth failure vs. host unreachable vs. timeout) so that I can diagnose the issue.

---

## 5. Requirements

### A.5 — Network Discovery Scanning

#### Must Have (P0)

| ID | Requirement | Details |
|----|-------------|---------|
| R5.1 | **BullMQ discovery worker** | New file `backend/src/workers/discovery-scan.worker.ts`. Follows the pattern in `cve-sync.worker.ts`: lazy Prisma init, concurrency 1, 3 retries with exponential backoff. Queue name: `discovery-scan`. |
| R5.2 | **ICMP ping sweep** | Worker receives `{ scanId, ipRangeId }` job data. Reads the CIDR range from `IPRange` table. Performs ping sweep across all IPs in range. Records live hosts. |
| R5.3 | **TCP port scan on live hosts** | For each host that responds to ping, scan common ports (22, 80, 135, 443, 445, 3389, 5985, 8080, 8443). Store open ports as JSON array on `DiscoveredDevice.openPorts`. |
| R5.4 | **Device record creation** | For each discovered host, create/update a `DiscoveredDevice` record with: `ipAddress`, `hostname` (reverse DNS if available), `openPorts`, `status: 'ONLINE'`, `lastSeen`, `scanId`. |
| R5.5 | **Scan status tracking** | Update `DiscoveryScan` record: `status` transitions `PENDING → IN_PROGRESS → COMPLETED/FAILED`, set `devicesFound` count, `completedAt` timestamp. |
| R5.6 | **Wire triggerScan() to queue** | Replace the TODO block in `discovery.service.ts:224-229` with a call to `discoveryQueue.add('scan', { scanId, ipRangeId })`. Return the scan ID to the caller. |
| R5.7 | **Error handling and timeouts** | Per-host timeout of 5 seconds for ping, 3 seconds per port. Overall scan timeout of 10 minutes. On failure, update scan status to `FAILED` with error message. |

**Acceptance Criteria — R5.1-R5.7:**

- [x] `POST /discovery/ip-ranges/:id/scan` queues a BullMQ job and returns `{ success: true, data: { scanId, message: "Scan queued" } }`
- [x] Worker picks up the job within 5 seconds of queuing
- [x] Scanning a /24 subnet completes in under 2 minutes
- [x] At minimum, the host machine's own IP appears in results
- [x] Each `DiscoveredDevice` record has: `ipAddress`, `openPorts` (array), `status`, `lastSeen`
- [x] `DiscoveryScan.status` is `COMPLETED` after a successful scan with accurate `devicesFound` count
- [x] `DiscoveryScan.status` is `FAILED` with `errorMessage` if scan encounters a fatal error
- [x] `GET /discovery/scans/:id` returns the scan with its discovered devices
- [x] Worker logs scan start, progress (every 10%), and completion via Pino logger
- [x] Worker does not crash on invalid CIDR notation — returns `FAILED` with descriptive message

#### Nice to Have (P1)

| ID | Requirement | Details |
|----|-------------|---------|
| R5.8 | **OS fingerprinting** | Infer OS from open ports heuristic (445+3389 → Windows, 22 → Linux/macOS). Set `DiscoveredDevice.os`. |
| R5.9 | **Device type classification** | Classify as SERVER, WORKSTATION, NETWORK_DEVICE, PRINTER, UNKNOWN based on port profile. Set `DiscoveredDevice.deviceType`. |
| R5.10 | **Hostname resolution** | Attempt reverse DNS lookup for each discovered IP. Set `DiscoveredDevice.hostname`. |
| R5.11 | **MAC address discovery** | Read ARP table for local subnet devices. Set `DiscoveredDevice.macAddress`. |

**Acceptance Criteria — R5.8-R5.11:**

- [x] Devices with port 22 open are tagged with `os: 'LINUX'` (or `'MACOS'` if also 5900)
- [x] Devices with ports 135+445+3389 open are tagged with `os: 'WINDOWS'`
- [x] Devices with hostname from rDNS have `hostname` populated (not null)
- [x] Devices on local subnet have `macAddress` populated from ARP table

#### Future Considerations (P2)

| ID | Requirement | Details |
|----|-------------|---------|
| R5.12 | Scheduled recurring scans | Use `IPRange.scanInterval` field (already in schema) to create repeatable BullMQ jobs |
| R5.13 | Credential-authenticated scanning | Use linked `DeviceCredential` to SSH into devices and collect detailed inventory |
| R5.14 | Agent-based discovery | Push scan requests to Go agents for scanning from their local network |

---

### A.6 — Asset File Upload & CSV Import

#### Must Have (P0)

| ID | Requirement | Details |
|----|-------------|---------|
| R6.1 | **Multer middleware for file uploads** | Configure `multer` with memory storage and sensible limits: 10MB max file size, single file per request. Reuse across all four endpoints. |
| R6.2 | **Asset attachment upload** | `POST /assets/:id/attachments` — accept file via multipart form, upload to MinIO using existing `minioStorage.uploadBuffer()`, create a record linking file metadata to the asset. Bucket: `asset-attachments`. |
| R6.3 | **Software inventory CSV import** | `POST /software-inventory/import` — parse CSV, validate rows against schema (name, version, vendor are required; installedDate, size optional), create `SoftwareInventory` records. |
| R6.4 | **Software license CSV import** | `POST /software-licenses/import` — parse CSV, validate rows (licenseName, licenseKey, vendor required; expirationDate, seats optional), create `SoftwareLicense` records. |
| R6.5 | **OS license CSV import** | `POST /os-licenses/import` — parse CSV, validate rows (osName, licenseKey required; activationDate, expirationDate optional), create `OSLicense` records. |
| R6.6 | **CSV validation and error reporting** | Each import endpoint returns a structured result: `{ imported: number, failed: number, errors: [{ row: number, field: string, message: string }] }`. Valid rows are imported even if some rows fail (partial import). |
| R6.7 | **Zod schemas for CSV rows** | Define Zod schemas for each CSV type: `softwareInventoryRowSchema`, `softwareLicenseRowSchema`, `osLicenseRowSchema`. Use for per-row validation. |
| R6.8 | **Database model for asset attachments** | Add `AssetAttachment` model to Prisma schema if not present, or use existing mechanism. Fields: `id`, `assetId`, `fileName`, `fileSize`, `mimeType`, `storageKey` (MinIO object key), `uploadedAt`, `uploadedBy`. |

**Acceptance Criteria — R6.1-R6.8:**

- [x] `POST /assets/:id/attachments` with a PDF file returns `{ success: true, data: { id, fileName, fileSize, downloadUrl } }`
- [x] Uploaded file is retrievable from MinIO via the returned `downloadUrl` (presigned URL)
- [x] Files over 10MB are rejected with `413 Payload Too Large` and descriptive error
- [x] Non-existent asset ID returns 404 (not 500)
- [x] `POST /software-inventory/import` with a valid 100-row CSV creates 100 `SoftwareInventory` records
- [x] Import with 95 valid + 5 invalid rows creates 95 records and returns error details for the 5 failures
- [x] Error response includes row number, field name, and validation message for each failed row
- [x] CSV with no valid rows returns `{ imported: 0, failed: N, errors: [...] }` — not a 500
- [x] Empty CSV file (headers only) returns `{ imported: 0, failed: 0, errors: [] }` — not an error
- [x] CSV with missing required columns returns a clear error listing which columns are missing
- [x] Each import endpoint follows the standard `{ success, data, meta?, error? }` envelope
- [x] All three CSV import endpoints have Zod validation on the multipart request
- [x] Prisma migration runs cleanly: `npx prisma migrate dev` succeeds

#### Nice to Have (P1)

| ID | Requirement | Details |
|----|-------------|---------|
| R6.9 | **Duplicate detection on import** | If a CSV row matches an existing record (by name+version for software, by licenseKey for licenses), skip or update instead of creating a duplicate. Return `{ imported, updated, skipped, failed }`. |
| R6.10 | **CSV template download** | `GET /assets/import-templates/:type` returns a CSV template file with headers and one example row for each import type. |
| R6.11 | **Import history** | Track each import as a record: timestamp, filename, row counts, user who imported. Queryable via `GET /assets/imports`. |

**Acceptance Criteria — R6.9-R6.11:**

- [ ] Re-importing the same CSV doesn't create duplicates — records are skipped or updated
- [ ] Template download returns a valid CSV with correct headers for the requested type
- [ ] Import history lists past imports with success/failure counts

#### Future Considerations (P2)

| ID | Requirement | Details |
|----|-------------|---------|
| R6.12 | Excel/XLSX import support | Add xlsx parsing library alongside CSV |
| R6.13 | Async import for large files | Queue import as BullMQ job for files > 1000 rows, return job ID for polling |
| R6.14 | Asset attachment listing and deletion | `GET /assets/:id/attachments` and `DELETE /assets/:id/attachments/:attachmentId` |

---

### A.7 — Credential Testing

#### Must Have (P0)

| ID | Requirement | Details |
|----|-------------|---------|
| R7.1 | **SSH credential testing** | When `credential.type === 'SSH'`: decrypt `passwordEnc` using existing `decrypt()` utility, attempt SSH connection to `targetHost` on `credential.port` (default 22), authenticate with `username` + password, disconnect on success. |
| R7.2 | **WinRM credential testing** | When `credential.type === 'WINRM'`: decrypt password, attempt WinRM connection to `targetHost` on `credential.port` (default 5985), authenticate with `username` + password (include `domain` if set), disconnect on success. |
| R7.3 | **SNMP v2c credential testing** | When `credential.type === 'SNMP'`: attempt SNMP GET of `sysDescr.0` (OID 1.3.6.1.2.1.1.1.0) using `credential.snmpCommunity` string against `targetHost` on `credential.port` (default 161). Success = valid response. |
| R7.4 | **Connection timeout** | All connection attempts timeout after 10 seconds. Return `{ success: false, message: "Connection timed out after 10s" }` on timeout. |
| R7.5 | **Error categorization** | Return structured errors that distinguish: `AUTH_FAILED` (credentials rejected), `HOST_UNREACHABLE` (can't connect), `TIMEOUT` (connection timed out), `UNKNOWN` (unexpected error). Response shape: `{ success: boolean, message: string, errorCode?: string, latencyMs?: number }`. |
| R7.6 | **Latency reporting** | On success, return `latencyMs` — the time from connection initiation to successful authentication. Helps users judge network quality. |
| R7.7 | **Update credential metadata** | On test completion (pass or fail), update `DeviceCredential.lastUsed` to `new Date()`. This already exists but should happen after the real test, not before. |

**Acceptance Criteria — R7.1-R7.7:**

- [x] `POST /discovery/credentials/:id/test` with `{ targetHost: "192.168.1.1" }` against an SSH credential attempts a real SSH connection
- [x] Valid SSH credentials return `{ success: true, message: "SSH authentication successful", latencyMs: <number> }`
- [x] Invalid SSH password returns `{ success: false, message: "Authentication failed", errorCode: "AUTH_FAILED" }`
- [x] Unreachable host returns `{ success: false, message: "Host unreachable", errorCode: "HOST_UNREACHABLE" }` within 10 seconds
- [x] WinRM test against a Windows host with valid credentials returns success
- [x] SNMP test against a device with valid community string returns success (sysDescr response)
- [x] SNMP test with wrong community string returns `{ success: false, errorCode: "AUTH_FAILED" }`
- [x] Non-existent credential ID returns 404
- [x] Invalid `targetHost` (not a valid IP) is rejected by Zod validation before hitting the service
- [x] `DeviceCredential.lastUsed` is updated after each test attempt
- [x] Credential password is never logged (even at debug level)
- [x] Concurrent credential tests don't block each other (no global locks)
- [x] Response follows standard `{ success, data, meta?, error? }` envelope

#### Nice to Have (P1)

| ID | Requirement | Details |
|----|-------------|---------|
| R7.8 | **SSH key-based authentication** | Support testing with SSH private key (stored encrypted) in addition to password auth. |
| R7.9 | **Batch credential testing** | `POST /discovery/credentials/test-batch` — test multiple credentials against the same host in one request. |

**Acceptance Criteria — R7.8-R7.9:**

- [ ] SSH key auth: upload a private key, test against host using key instead of password
- [ ] Batch test: send array of credential IDs + targetHost, get array of results

#### Future Considerations (P2)

| ID | Requirement | Details |
|----|-------------|---------|
| R7.10 | SNMP v3 support | Auth (MD5/SHA) + privacy (DES/AES) parameters for SNMPv3 |
| R7.11 | Credential health monitoring | Periodic background testing of all credentials, alert on failures |
| R7.12 | Sudo/elevation testing | After SSH auth, verify that the user can `sudo` (needed for deployments) |

---

## 6. Technical Design

### Shared Dependencies (New)

| Package | Purpose | Used By |
|---------|---------|---------|
| `csv-parse` | Streaming CSV parser (part of csv ecosystem) | A.6 |
| `ssh2` | SSH client for Node.js | A.5 (optional), A.7 |
| `net-ping` or raw ICMP via `child_process` | ICMP ping implementation | A.5 |
| `snmp-native` or `net-snmp` | SNMP client | A.7 |
| `multer` | Multipart form-data parsing | A.6 |

> **Note:** For ICMP ping (A.5), raw sockets require root privileges. Use `child_process.exec('ping -c 1 -W 1 <ip>')` as a portable alternative that works without elevated privileges. For TCP port scanning, use Node.js `net.Socket` with `connect()` — no external library needed.

### File Structure (New Files)

```
backend/src/
├── workers/
│   └── discovery-scan.worker.ts          # A.5 — BullMQ worker
├── modules/
│   ├── discovery/
│   │   └── discovery.service.ts          # A.5, A.7 — modify existing
│   └── assets/
│       ├── assets.controller.ts          # A.6 — modify existing (replace 501s)
│       ├── assets.service.ts             # A.6 — add import/upload methods
│       ├── assets.validators.ts          # A.6 — add CSV row schemas
│       └── assets.routes.ts              # A.6 — add multer middleware
├── shared/
│   └── utils/
│       ├── csv-parser.ts                 # A.6 — generic CSV parse + validate helper
│       ├── network-scanner.ts            # A.5 — ping sweep + port scan utilities
│       └── credential-tester.ts          # A.7 — SSH/WinRM/SNMP test functions
└── db/prisma/
    └── schema.prisma                     # A.6 — add AssetAttachment model (if needed)
```

### Existing Files Modified

| File | Changes |
|------|---------|
| `discovery.service.ts` | R5.6: Wire `triggerScan()` to BullMQ queue. R7.1-R7.3: Replace mock in `testCredential()` with real connection tests. |
| `assets.controller.ts` | R6.2-R6.5: Replace four 501 responses with real implementations. |
| `assets.service.ts` | R6.2-R6.5: Add `uploadAttachment()`, `importSoftwareInventory()`, `importSoftwareLicenses()`, `importOSLicenses()` methods. |
| `assets.validators.ts` | R6.7: Add CSV row Zod schemas. |
| `assets.routes.ts` | R6.1: Add multer middleware to upload/import routes. |
| `schema.prisma` | R6.8: Add `AssetAttachment` model if not present. |

### BullMQ Worker Pattern (A.5)

Follow the established pattern from `cve-sync.worker.ts`:

```typescript
// Pseudocode — discovery-scan.worker.ts
const worker = new Worker('discovery-scan', async (job) => {
  const { scanId, ipRangeId } = job.data;

  // 1. Load IP range from DB
  // 2. Update scan status to IN_PROGRESS
  // 3. Expand CIDR to IP list
  // 4. Ping sweep (parallel, batched)
  // 5. Port scan live hosts (parallel, batched)
  // 6. Create/update DiscoveredDevice records
  // 7. Update scan status to COMPLETED with device count
}, {
  connection: redisConnection,
  concurrency: 1,
  limiter: { max: 1, duration: 1000 },
});
```

### CSV Import Pattern (A.6)

```typescript
// Pseudocode — import flow
async importSoftwareInventory(fileBuffer: Buffer): Promise<ImportResult> {
  const rows = await parseCsv(fileBuffer);       // csv-parse
  const results = { imported: 0, failed: 0, errors: [] };

  for (const [index, row] of rows.entries()) {
    const parsed = softwareInventoryRowSchema.safeParse(row);
    if (!parsed.success) {
      results.failed++;
      results.errors.push({ row: index + 2, ...formatZodError(parsed.error) });
      continue;
    }
    await prisma.softwareInventory.create({ data: parsed.data });
    results.imported++;
  }

  return results;
}
```

### Credential Test Pattern (A.7)

```typescript
// Pseudocode — credential test dispatch
async testCredential(id: string, data: TestCredentialInput): Promise<TestResult> {
  const credential = await prisma.deviceCredential.findUniqueOrThrow({ where: { id } });
  const password = decrypt(credential.passwordEnc);
  const start = Date.now();

  switch (credential.type) {
    case 'SSH':   return testSSH(data.targetHost, credential.port, credential.username, password);
    case 'WINRM': return testWinRM(data.targetHost, credential.port, credential.username, password, credential.domain);
    case 'SNMP':  return testSNMP(data.targetHost, credential.port, credential.snmpCommunity);
  }
}
```

---

## 7. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Discovery scan completion rate** | > 90% of triggered scans reach COMPLETED status | `SELECT COUNT(*) FROM discovery_scan WHERE status = 'COMPLETED'` / total |
| **Discovery accuracy** | Scanner finds the host machine's own IP in every local scan | Manual test: scan the Docker host's subnet |
| **CSV import success rate** | > 95% of rows in a well-formed CSV import successfully | Import result `imported / (imported + failed)` |
| **Credential test honesty** | 0% false positives (never returns success for bad credentials) | Test with known-bad credentials against test hosts |
| **Credential test latency** | < 15s for any single test (including timeout case) | `latencyMs` field in response |
| **Zero 501 responses** | All four import/upload endpoints return real responses | `grep -r "501" assets.controller.ts` returns 0 matches |

---

## 8. Test Plan

### Unit Tests

#### A.5 — Discovery

| Test | File | What It Verifies |
|------|------|-----------------|
| `triggerScan queues BullMQ job` | `tests/unit/discovery/discovery.service.test.ts` | Service calls `queue.add()` with correct job data |
| `triggerScan rejects invalid IP range` | same | Returns error for non-existent IP range ID |
| `expandCIDR generates correct IP list` | `tests/unit/utils/network-scanner.test.ts` | `/24` produces 254 IPs, `/32` produces 1, `/16` produces 65534 |
| `ping sweep handles unreachable hosts` | same | Unreachable IPs return `{ alive: false }`, no unhandled exceptions |
| `port scan detects open ports` | same | Mock TCP connect for port 22 → open, port 12345 → closed |
| `worker updates scan status on completion` | `tests/unit/workers/discovery-scan.worker.test.ts` | After processing, `DiscoveryScan.status === 'COMPLETED'` |
| `worker updates scan status on failure` | same | On error, `DiscoveryScan.status === 'FAILED'` with error message |
| `worker respects timeout` | same | Scan aborts after configured timeout, marks as FAILED |

#### A.6 — Asset Import

| Test | File | What It Verifies |
|------|------|-----------------|
| `parseCsv handles valid CSV` | `tests/unit/utils/csv-parser.test.ts` | Returns array of row objects with correct field mapping |
| `parseCsv handles empty CSV` | same | Returns empty array, no error |
| `parseCsv rejects non-CSV content` | same | Binary file or malformed content returns descriptive error |
| `softwareInventoryRowSchema validates required fields` | `tests/unit/assets/assets.validators.test.ts` | Missing `name` fails, all required fields present passes |
| `importSoftwareInventory creates records` | `tests/unit/assets/assets.service.test.ts` | 10 valid rows → 10 `prisma.create` calls |
| `importSoftwareInventory reports row errors` | same | Mixed valid/invalid → correct `imported` and `failed` counts |
| `importSoftwareInventory handles empty file` | same | Returns `{ imported: 0, failed: 0, errors: [] }` |
| `uploadAttachment calls MinIO` | same | Service calls `minioStorage.uploadBuffer()` with correct bucket and key |
| `uploadAttachment rejects oversized file` | same | > 10MB returns 413 error |
| `uploadAttachment rejects non-existent asset` | same | Unknown asset ID returns 404 |
| `importSoftwareLicenses validates licenseKey` | same | Missing `licenseKey` returns row-level error |
| `importOSLicenses validates required fields` | same | Missing `osName` or `licenseKey` returns row-level error |

#### A.7 — Credential Testing

| Test | File | What It Verifies |
|------|------|-----------------|
| `testSSH succeeds with valid credentials` | `tests/unit/utils/credential-tester.test.ts` | Mock SSH2 connection → `{ success: true, latencyMs }` |
| `testSSH fails on auth error` | same | Mock SSH2 auth failure → `{ success: false, errorCode: 'AUTH_FAILED' }` |
| `testSSH fails on unreachable host` | same | Mock connection refused → `{ success: false, errorCode: 'HOST_UNREACHABLE' }` |
| `testSSH respects timeout` | same | Mock hanging connection → `{ success: false, errorCode: 'TIMEOUT' }` after 10s |
| `testWinRM succeeds with valid credentials` | same | Mock WinRM session → success |
| `testWinRM includes domain in auth` | same | When `credential.domain` is set, it's included in the auth request |
| `testSNMP succeeds with valid community string` | same | Mock SNMP GET → success with sysDescr |
| `testSNMP fails with wrong community string` | same | Mock SNMP timeout → `{ success: false, errorCode: 'AUTH_FAILED' }` |
| `testCredential dispatches by type` | `tests/unit/discovery/discovery.service.test.ts` | SSH credential → calls `testSSH`, WINRM → `testWinRM`, SNMP → `testSNMP` |
| `testCredential decrypts password` | same | Service calls `decrypt(credential.passwordEnc)` before testing |
| `testCredential never logs password` | same | Logger mock not called with password string |
| `testCredential updates lastUsed` | same | `prisma.deviceCredential.update` called with `lastUsed` |
| `testCredential returns 404 for missing credential` | same | Non-existent ID → `NotFoundError` |

### Integration Tests (Require `make dev-services`)

| Test | What It Verifies |
|------|-----------------|
| `POST /discovery/ip-ranges/:id/scan → 200 + scan record created` | End-to-end scan triggering |
| `GET /discovery/scans/:id returns scan with devices` | Scan results queryable after completion |
| `POST /assets/:id/attachments with file → 200 + file in MinIO` | File upload end-to-end |
| `GET presigned URL for attachment → file downloadable` | MinIO presigned URL works |
| `POST /software-inventory/import with CSV → records created` | CSV import end-to-end |
| `POST /software-licenses/import with CSV → records created` | License import end-to-end |
| `POST /os-licenses/import with CSV → records created` | OS license import end-to-end |
| `POST /discovery/credentials/:id/test → real connection attempt` | Credential test dispatches correctly |
| `CSV import with mixed valid/invalid rows → partial import` | Error reporting works end-to-end |

### Manual Smoke Tests

| # | Test | Steps | Expected |
|---|------|-------|----------|
| S1 | Discovery scan on local network | 1. Create IP range for your local /24 subnet. 2. Trigger scan. 3. Wait for completion. 4. Check discovered devices. | At least the host machine appears in results with correct IP and open ports. |
| S2 | CSV import happy path | 1. Download/create a CSV with 5 valid software records. 2. POST to `/software-inventory/import`. 3. Check database. | 5 records created, response shows `imported: 5, failed: 0`. |
| S3 | CSV import error handling | 1. Create a CSV with 3 valid + 2 invalid rows. 2. Import. 3. Check response. | `imported: 3, failed: 2`, errors array has 2 entries with row numbers. |
| S4 | File attachment upload | 1. Upload a PDF to an existing asset. 2. Use returned URL to download. | File downloads successfully, matches uploaded content. |
| S5 | SSH credential test (valid) | 1. Create SSH credential with valid creds for a test host. 2. Test against host. | `success: true` with `latencyMs`. |
| S6 | SSH credential test (invalid) | 1. Create SSH credential with wrong password. 2. Test against host. | `success: false, errorCode: 'AUTH_FAILED'`. |
| S7 | Credential test (unreachable) | 1. Test any credential against `192.0.2.1` (TEST-NET, unreachable). | `success: false, errorCode: 'HOST_UNREACHABLE'` or `'TIMEOUT'` within 10s. |

---

## 9. Open Questions

| # | Question | Owner | Blocking? |
|---|----------|-------|-----------|
| Q1 | Does the Docker network allow ICMP ping from the backend container? May need `--cap-add=NET_RAW` or use TCP-only scan as fallback. | Engineering | **Yes** — affects A.5 implementation approach |
| Q2 | Should `AssetAttachment` be a new Prisma model, or should we use the existing `Asset` model's JSON fields? | Engineering | **Yes** — affects A.6 migration |
| Q3 | Do we need to install `ssh2`, `net-snmp`, and a WinRM library, or should we shell out to system commands (`ssh`, `snmpget`) for A.7? | Engineering | **No** — library approach is preferred but both work |
| Q4 | What are the exact CSV column headers the frontend expects for each import type? Need alignment with B.10. | Frontend Dev | **No** — can define headers and frontend adapts |
| Q5 | Is there a test SSH/WinRM host available in the Docker environment for integration testing? | Engineering | **No** — unit tests with mocks are sufficient for Sprint 1 |

---

## 10. Timeline Considerations

| Constraint | Detail |
|------------|--------|
| **B.10 blocked by A.6** | Frontend asset import wizard (B.10) cannot start until CSV import endpoints return real data |
| **B.11 blocked by A.5** | Frontend discovery results UI (B.11) needs real scan data to display |
| **Sprint 2 dependency** | Patch-CVE correlation needs assets in the system — A.6 CSV import is the fastest way to seed real asset data |
| **Suggested order** | A.7 (smallest, ~1 day) → A.6 (medium, ~2-3 days) → A.5 (largest, ~3-4 days) |

---

## 11. Implementation Checklist

### Pre-Implementation
- [ ] Resolve Q1: Verify ICMP ping works from Docker container
- [ ] Resolve Q2: Decide on AssetAttachment model approach
- [ ] Install new npm packages: `csv-parse`, `ssh2`, `net-snmp`, `multer` (if not already present)

### A.7 — Credential Testing (~1 day)
- [ ] Create `backend/src/shared/utils/credential-tester.ts` with `testSSH()`, `testWinRM()`, `testSNMP()`
- [ ] Modify `discovery.service.ts:testCredential()` — replace mock with real dispatch
- [ ] Add connection timeout handling (10s)
- [ ] Add error categorization (AUTH_FAILED, HOST_UNREACHABLE, TIMEOUT)
- [ ] Write unit tests for all three credential types + error cases
- [ ] Verify `targetHost` Zod validation still works
- [ ] Manual smoke test: test valid + invalid SSH creds

### A.6 — Asset File Upload & CSV Import (~2-3 days)
- [ ] Create `backend/src/shared/utils/csv-parser.ts` with generic `parseCsv()` helper
- [ ] Add Zod schemas for CSV rows in `assets.validators.ts`
- [ ] Add multer middleware to upload/import routes in `assets.routes.ts`
- [ ] Implement `uploadAttachment()` in `assets.service.ts` (MinIO integration)
- [ ] Implement `importSoftwareInventory()` in `assets.service.ts`
- [ ] Implement `importSoftwareLicenses()` in `assets.service.ts`
- [ ] Implement `importOSLicenses()` in `assets.service.ts`
- [ ] Replace four 501 responses in `assets.controller.ts` with real calls
- [ ] Add/run Prisma migration if new model needed
- [ ] Write unit tests for CSV parsing, validation, and import logic
- [ ] Manual smoke test: import valid CSV, import mixed CSV, upload file

### A.5 — Network Discovery Scanning (~3-4 days)
- [ ] Create `backend/src/shared/utils/network-scanner.ts` with `expandCIDR()`, `pingSweep()`, `portScan()`
- [ ] Create `backend/src/workers/discovery-scan.worker.ts` (BullMQ worker)
- [ ] Modify `discovery.service.ts:triggerScan()` — wire to BullMQ queue
- [ ] Implement ping sweep (process-based or raw socket)
- [ ] Implement TCP port scan on common ports
- [ ] Implement scan status tracking (PENDING → IN_PROGRESS → COMPLETED/FAILED)
- [ ] Implement device record creation in `DiscoveredDevice` table
- [ ] Add timeout handling (per-host and overall)
- [ ] P1: Add OS fingerprinting heuristic
- [ ] P1: Add reverse DNS hostname resolution
- [ ] Write unit tests for CIDR expansion, scan logic, worker lifecycle
- [ ] Manual smoke test: scan local /24 subnet

### Post-Implementation
- [ ] Run `make check-all` (types + lint + build)
- [ ] Run `cd backend && npm test` — no new test failures
- [ ] Run integration tests with `make dev-services`
- [ ] Update sprint-1 ROADMAP.md: mark A.5, A.6, A.7 as `COMPLETED`
- [ ] Notify Dev 2: B.10 and B.11 are unblocked

---

*This PRD is a living document. Update acceptance criteria checkboxes as implementation progresses.*
