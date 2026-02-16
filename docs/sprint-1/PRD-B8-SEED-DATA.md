# PRD: B.8 — Add Sample Seed Data for Demo

> **Sprint 1 Track B** | **Priority:** Must Have (Week 1-2) | **Owner:** Dev 2
> **Status:** PENDING
> **Sprint 2 Prerequisite:** Patch-CVE correlation requires demo data to test against
> **Dependencies:** None (can start Day 1)

---

## 1. Problem Statement

Running `make dev-fresh` (drop DB + migrate + seed) produces an empty dashboard. The current `seed.ts` creates:
- 1 admin user (`admin@patchiq.io`)
- 1 demo user (`demo@patchiq.io`)
- 2 organizations
- 5 agent versions (but with `filePath: null`)
- A few discovery credentials

But **no patches, no CVEs, no assets, no deployments** — the core entities that demonstrate PatchIQ's value.

**What's broken:**
- Fresh installs show completely empty dashboards (0 patches, 0 vulnerabilities, 0 assets)
- Developers cannot test patch deployment workflows without manually creating test data
- Demos to stakeholders show a ghost town instead of a functioning platform
- Sprint 2's patch-CVE correlation feature has nothing to correlate against

**Who is affected:**
- Developers testing locally
- Demo environments for stakeholders
- Sprint 2 feature development (needs realistic data)

**Cost of not solving:** Every new environment requires 30-60 minutes of manual data entry before features can be tested. Sprint 2 patch-CVE work blocked without sample CVEs and patches.

---

## 2. Goals

| # | Goal | Measure |
|---|------|------------|
| G1 | Dashboard shows populated metrics after seed | Dashboard displays >0 patches, >0 vulnerabilities, >0 assets, >0 deployments |
| G2 | Sample data is realistic and interconnected | Patches reference real KB numbers, CVEs are real (Log4Shell, etc.), assets have installed software |
| G3 | Seed completes in <30 seconds | `make dev-fresh` runs quickly, not blocked by heavy data generation |
| G4 | Data enables Sprint 2 testing | Patch-CVE correlation has patches + CVEs to work with |

---

## 3. Non-Goals

| # | Non-Goal | Why |
|---|----------|-----|
| N1 | Production-scale data (1000s of records) | Seed is for dev/demo, not performance testing |
| N2 | Real vulnerability scanning | Agent integration is A.5 scope, seed just creates static records |
| N3 | Actual patch file uploads | MinIO integration for real binaries is out of scope — use placeholder paths |
| N4 | Dynamic data generation (faker.js) | Static realistic data is simpler and more predictable for demos |

---

## 4. User Stories

- As a **developer**, I want realistic sample data after `make dev-fresh` so that I can test features without manual data entry.
- As a **product manager**, I want demo environments to show populated dashboards so that stakeholders see PatchIQ's value immediately.
- As a **QA engineer**, I want interconnected test data (patches with affected assets, CVEs with vulnerable software) so that I can test end-to-end workflows.
- As a **Sprint 2 developer**, I want sample patches and CVEs so that I can develop and test patch-CVE correlation without waiting for Track A dependencies.

---

## 5. Requirements

### Must-Have (P0)

#### R1: Seed 5-10 sample patches

**Required fields:**
- `title` — Real patch names (e.g., "Windows 10 21H2 Security Update", "Ubuntu OpenSSL Patch 3.0.2")
- `kbNumber` — Real KB numbers (KB5005033, etc.) or realistic identifiers
- `severity` — Mix of CRITICAL, HIGH, MEDIUM, LOW
- `status` — Mix of APPROVED, PENDING, REJECTED
- `category` — SECURITY_UPDATE, CRITICAL_UPDATE, UPDATE, HOTFIX, SERVICE_PACK
- `releaseDate` — Recent dates (last 3-6 months)
- `description` — 1-2 sentences explaining what the patch fixes
- `affectedProducts` — Array of affected OS/software (e.g., ["Windows 10", "Windows Server 2022"])
- `cveIds` — Array of CVE IDs this patch addresses (e.g., ["CVE-2021-44228"] for Log4Shell)

**Acceptance Criteria:**
- [x] Add 5-10 patch records to `seed.ts`
- [x] At least 2 CRITICAL security patches (reference real vulnerabilities)
- [x] At least 1 patch in each status (APPROVED, PENDING, REJECTED)
- [x] Patches reference CVE IDs that will be created in R2

**Example patch:**
```typescript
{
  title: "Apache Log4j 2.17.1 Security Update (Log4Shell Fix)",
  kbNumber: "LOG4J-2.17.1",
  severity: "CRITICAL",
  status: "APPROVED",
  category: "SECURITY_UPDATE",
  releaseDate: new Date('2021-12-18'),
  description: "Critical security update addressing CVE-2021-44228 (Log4Shell) remote code execution vulnerability in Log4j 2.",
  affectedProducts: ["Apache Log4j 2.x"],
  cveIds: ["CVE-2021-44228"],
  vendor: "Apache",
  size: "2.4 MB",
  installationTime: 5,
  requiresReboot: false,
}
```

#### R2: Seed 5 sample CVEs

**Required fields:**
- `cveId` — Real CVE IDs (CVE-2021-44228, CVE-2022-21907, CVE-2023-23397, etc.)
- `description` — Real CVE description from NVD
- `severity` — CRITICAL, HIGH, MEDIUM, LOW (matching CVSS score)
- `cvssScore` — Real CVSS score (9.8 for Log4Shell, etc.)
- `publishedDate` — Real CVE published date
- `lastModifiedDate` — Recent or same as published
- `affectedProducts` — Array of affected software
- `cisaKev` — Boolean (true for CVEs on CISA KEV list)
- `exploitAvailable` — Boolean
- `references` — Array of reference URLs (NVD, vendor advisories)

**Acceptance Criteria:**
- [x] Add 5 CVE records to `seed.ts`
- [x] Include Log4Shell (CVE-2021-44228) — most famous vulnerability, good for demos
- [x] Include at least 1 CISA KEV vulnerability
- [x] Include at least 1 Windows vulnerability, 1 Linux vulnerability
- [x] CVE IDs match those referenced in patch `cveIds` arrays (R1)

**Example CVEs:**
```typescript
[
  {
    cveId: "CVE-2021-44228",
    description: "Apache Log4j2 2.0-beta9 through 2.15.0 JNDI features used in configuration, log messages, and parameters do not protect against attacker controlled LDAP and other JNDI related endpoints. An attacker who can control log messages or log message parameters can execute arbitrary code loaded from LDAP servers when message lookup substitution is enabled.",
    severity: "CRITICAL",
    cvssScore: 10.0,
    publishedDate: new Date('2021-12-10'),
    lastModifiedDate: new Date('2023-12-10'),
    affectedProducts: ["Apache Log4j 2.0-beta9", "Apache Log4j 2.15.0"],
    cisaKev: true,
    exploitAvailable: true,
    references: ["https://nvd.nist.gov/vuln/detail/CVE-2021-44228"],
  },
  {
    cveId: "CVE-2022-21907",
    description: "HTTP Protocol Stack Remote Code Execution Vulnerability",
    severity: "CRITICAL",
    cvssScore: 9.8,
    publishedDate: new Date('2022-01-11'),
    lastModifiedDate: new Date('2022-01-11'),
    affectedProducts: ["Windows 10", "Windows Server 2022", "Windows 11"],
    cisaKev: false,
    exploitAvailable: false,
    references: ["https://msrc.microsoft.com/update-guide/vulnerability/CVE-2022-21907"],
  },
  // ... 3 more CVEs
]
```

#### R3: Seed 3-5 sample assets

**Required fields:**
- `hostname` — Realistic hostnames (e.g., "web-server-01", "db-prod-primary", "workstation-dev-05")
- `ipAddress` — Valid private IP addresses (192.168.1.x, 10.0.0.x)
- `platform` — WINDOWS, LINUX, MACOS
- `osVersion` — Realistic OS versions (Windows 10 21H2, Ubuntu 22.04 LTS, macOS 13.2 Ventura)
- `status` — ACTIVE, OFFLINE, PENDING
- `agentVersion` — Reference one of the seeded agent versions
- `lastSeenAt` — Recent timestamp (within last 24 hours)
- `installedSoftware` — Array of software packages (including vulnerable versions referenced by CVEs)

**Acceptance Criteria:**
- [x] Add 3-5 asset records to `seed.ts`
- [x] At least 1 Windows, 1 Linux, 1 macOS asset
- [x] At least 1 asset has Log4j installed (vulnerable to CVE-2021-44228)
- [x] Assets have realistic `installedSoftware` arrays (e.g., "Apache Log4j 2.14.1", "OpenSSL 1.1.1", "nginx 1.18.0")

**Example asset:**
```typescript
{
  hostname: "web-server-01",
  ipAddress: "192.168.1.10",
  platform: "LINUX",
  osVersion: "Ubuntu 20.04 LTS",
  status: "ACTIVE",
  agentVersion: "1.0.0",
  lastSeenAt: new Date(),
  tags: ["production", "web-tier", "apache"],
  department: "Engineering",
  location: "US-East Data Center",
  installedSoftware: [
    { name: "Apache Log4j", version: "2.14.1", vendor: "Apache" }, // Vulnerable!
    { name: "nginx", version: "1.18.0", vendor: "NGINX" },
    { name: "OpenSSL", version: "1.1.1f", vendor: "OpenSSL" },
  ],
}
```

#### R4: Seed 2-3 sample deployments

**Required fields:**
- `name` — Descriptive deployment name
- `type` — SOFTWARE, PATCH, CONFIG
- `status` — PENDING, IN_PROGRESS, COMPLETED, FAILED
- `targetAssets` — Array of asset IDs (reference seeded assets)
- `patchId` — Reference a seeded patch (for PATCH deployments)
- `scheduledFor` — Timestamp (past for completed, future for pending)
- `completedAt` — Timestamp (for completed deployments)

**Acceptance Criteria:**
- [x] Add 2-3 deployment records to `seed.ts`
- [x] At least 1 COMPLETED deployment (shows success case)
- [x] At least 1 PENDING or IN_PROGRESS deployment (shows active work)
- [x] Deployments reference seeded patches and assets

**Example deployment:**
```typescript
{
  name: "Deploy Log4Shell Patch to Web Servers",
  type: "PATCH",
  status: "COMPLETED",
  targetAssets: [asset1.id, asset2.id], // Reference seeded assets
  patchId: log4jPatch.id, // Reference seeded patch
  scheduledFor: new Date('2024-01-15T02:00:00Z'),
  startedAt: new Date('2024-01-15T02:00:05Z'),
  completedAt: new Date('2024-01-15T02:15:30Z'),
  successCount: 2,
  failureCount: 0,
}
```

#### R5: Update existing seed.ts structure

**Current seed.ts structure:**
```typescript
async function seed() {
  // 1. Create organizations
  // 2. Create users
  // 3. Create agent versions (with filePath: null issue)
  // 4. Create discovery credentials
  // 5. (NEW) Create patches
  // 6. (NEW) Create CVEs
  // 7. (NEW) Create assets
  // 8. (NEW) Create deployments
}
```

**Acceptance Criteria:**
- [x] Add new seed sections after existing ones (non-destructive)
- [x] Use Prisma's `createMany` for bulk inserts (performance)
- [x] Handle foreign key relationships correctly (create patches before deployments, etc.)
- [x] Log seed progress: `console.log('Seeded 5 patches, 5 CVEs, 3 assets, 2 deployments')`

---

### Nice-to-Have (P1)

#### R6: Seed sample reports

- [ ] Add 1-2 pre-generated reports (vulnerability summary, patch compliance)
- [ ] Shows what the reports feature looks like with data

#### R7: Seed sample alerts

- [ ] Add 2-3 sample alerts (high severity CVE detected, patch deployment failed)
- [ ] Demonstrates alert system

---

## 6. Success Metrics

| Metric | Target | Measure |
|--------|--------|---------|
| Dashboard population | >0 for all metrics | After `make dev-fresh`, dashboard shows patches, CVEs, assets, deployments |
| Seed execution time | <30 seconds | `npm run seed` completes quickly |
| Data interconnectedness | 100% | Patches reference CVEs, deployments reference patches+assets, assets have vulnerable software |
| Developer satisfaction | Positive feedback | Developers can test features immediately after `make dev-fresh` |

---

## 7. Test Plan

### Manual Smoke Tests

```
Test: Dashboard shows populated metrics after seed
  Given: Fresh database (make dev-fresh)
  When: Seed script completes
  Then: Dashboard displays:
    - Patches: 5-10
    - Vulnerabilities: 5
    - Assets: 3-5
    - Deployments: 2-3
    - Critical vulnerabilities: ≥2
  And: No "No data" empty states

Test: Patch detail page shows complete data
  Given: Seed has created patches
  When: User navigates to any patch detail page
  Then: Patch displays:
    - Title, KB number, severity, status
    - Description (not "Lorem ipsum")
    - Affected products array
    - Referenced CVE IDs (clickable links to CVE pages)

Test: CVE detail page shows complete data
  Given: Seed has created CVEs
  When: User navigates to CVE-2021-44228 detail page
  Then: CVE displays:
    - Full description
    - CVSS score 10.0
    - Severity: CRITICAL
    - Affected products
    - References/links

Test: Asset detail page shows installed software
  Given: Seed has created assets with installedSoftware
  When: User navigates to web-server-01 asset detail
  Then: Installed Software section shows:
    - Apache Log4j 2.14.1
    - nginx 1.18.0
    - OpenSSL 1.1.1f

Test: Deployment history shows completed deployments
  Given: Seed has created deployments
  When: User navigates to Deployments page
  Then: Table shows:
    - Completed deployment (status, timestamp, success/failure counts)
    - Pending/in-progress deployment

Test: Patch-CVE relationship is visible
  Given: Log4j patch references CVE-2021-44228
  When: User views patch detail page
  Then: CVE-2021-44228 is listed in "Addresses Vulnerabilities" section
  When: User views CVE-2021-44228 detail page
  Then: Log4j patch is listed in "Patches Available" section
```

---

## 8. Implementation Notes

### File to Modify

**`backend/src/db/prisma/seed.ts`** (~600 lines currently, will grow to ~800-900)

### Seed Order (Foreign Key Dependencies)

```
1. Organizations (no deps)
2. Users (depends on organizations)
3. Agent versions (no deps)
4. CVEs (no deps)
5. Patches (no deps, but references CVEs in cveIds array)
6. Assets (depends on organizations, agent versions)
7. Deployments (depends on patches, assets)
8. Discovery credentials (no deps)
9. (Future) Reports, Alerts
```

### Real CVEs to Include

| CVE ID | Name | Severity | CVSS | Why Include |
|--------|------|----------|------|-------------|
| CVE-2021-44228 | Log4Shell | CRITICAL | 10.0 | Most famous recent vulnerability, on CISA KEV |
| CVE-2022-21907 | Windows HTTP.sys RCE | CRITICAL | 9.8 | Windows vulnerability, shows OS patching |
| CVE-2023-23397 | Outlook Elevation of Privilege | CRITICAL | 9.8 | Microsoft 365, actively exploited |
| CVE-2021-3156 | Sudo Baron Samedit | HIGH | 7.8 | Linux vulnerability, shows cross-platform |
| CVE-2022-30190 | Follina (MSDT) | HIGH | 7.8 | Zero-day, interesting for demos |

### Real Patches to Include

| Patch | KB Number | Addresses CVE | Platform |
|-------|-----------|---------------|----------|
| Apache Log4j 2.17.1 Security Update | LOG4J-2.17.1 | CVE-2021-44228 | Linux/Windows (Java) |
| Windows 10 January 2022 Cumulative Update | KB5009543 | CVE-2022-21907 | Windows |
| Microsoft Outlook March 2023 Security Update | KB5002359 | CVE-2023-23397 | Windows |
| Ubuntu sudo 1.9.5p2 Security Update | USN-4705-2 | CVE-2021-3156 | Linux |
| Windows MSDT Patch June 2022 | KB5014699 | CVE-2022-30190 | Windows |

### Code Structure

```typescript
async function seed() {
  console.log('Starting seed...');

  // Existing seeds (users, orgs, agent versions, credentials)
  // ...

  // New: Seed CVEs
  console.log('Seeding CVEs...');
  const cves = await prisma.cve.createMany({
    data: [
      { cveId: 'CVE-2021-44228', /* ... */ },
      // ... more CVEs
    ],
  });

  // New: Seed patches
  console.log('Seeding patches...');
  const patches = await prisma.patch.createMany({
    data: [
      { title: 'Apache Log4j 2.17.1', cveIds: ['CVE-2021-44228'], /* ... */ },
      // ... more patches
    ],
  });

  // New: Seed assets
  console.log('Seeding assets...');
  const assets = await prisma.asset.createMany({
    data: [
      { hostname: 'web-server-01', /* ... */ },
      // ... more assets
    ],
  });

  // New: Seed deployments
  console.log('Seeding deployments...');
  const deployments = await prisma.deployment.createMany({
    data: [
      { name: 'Deploy Log4Shell Patch', /* ... */ },
      // ... more deployments
    ],
  });

  console.log('Seed complete:', {
    cves: cves.count,
    patches: patches.count,
    assets: assets.count,
    deployments: deployments.count,
  });
}
```

### Estimated Effort

2-3 days
- 2 hours: Research real CVEs, patches, KB numbers
- 3 hours: Write patch seed data (5-10 records with full details)
- 2 hours: Write CVE seed data (5 records with descriptions, references)
- 2 hours: Write asset seed data (3-5 records with installed software)
- 1 hour: Write deployment seed data (2-3 records)
- 2 hours: Test end-to-end, verify dashboard populates, fix foreign key issues
- 1 hour: Document seed data in README or seed.ts comments

---

## 9. Open Questions

**Q1:** Should patches reference actual binary files in MinIO?
- **Answer:** No for Sprint 1. Use placeholder paths or null. Real binary uploads are A.6 (asset file upload) and out of scope.

**Q2:** Should assets report their vulnerability status (how many CVEs affect them)?
- **Answer:** That's Sprint 2 patch-CVE correlation logic. Seed just creates static data. Correlation engine will compute this dynamically.

**Q3:** How many records is "enough" for demo without bloating the DB?
- **Answer:** 5-10 patches, 5 CVEs, 3-5 assets, 2-3 deployments. More than enough to populate dashboards without overwhelming.

**Q4:** Should we generate random data with faker.js?
- **Answer:** No. Static, realistic, hand-crafted data is better for demos and debugging. Developers can understand the data easily.

---

## 10. Dependencies

**Blocks:**
- Sprint 2 patch-CVE correlation (needs patches + CVEs to correlate)
- Sprint 2 AI/MCP testing (needs realistic data to query)
- B.12 (Settings Audit) benefits from populated dashboard

**Blocked by:**
- None (can start immediately)

---

## 11. Definition of Done

- [x] `seed.ts` includes 5-10 patches with realistic data (KB numbers, CVE references, descriptions)
- [x] `seed.ts` includes 5 CVEs with real CVE IDs, descriptions, CVSS scores
- [x] `seed.ts` includes 3-5 assets with installed software arrays
- [x] `seed.ts` includes 2-3 deployments referencing patches and assets
- [x] `make dev-fresh` completes successfully in <30 seconds
- [x] Dashboard displays >0 for patches, vulnerabilities, assets, deployments metrics
- [x] Manual smoke tests pass (patch detail, CVE detail, asset detail, deployments all show data)
- [x] Git commit: "feat(seed): add sample patches, CVEs, assets, and deployments for demo environments"
- [x] PR merged to `sprint-1/track-b` branch
