# PRD: B.9 — Agent Version Seed File Paths

> **Sprint 1 Track B** | **Priority:** Must Have (Week 1-2) | **Owner:** Dev 2
> **Status:** PENDING
> **Sprint 2 Prerequisite:** Agent downloads must work for testing deployment workflows
> **Dependencies:** None (can start Day 1)

---

## 1. Problem Statement

The `seed.ts` script creates 5 agent versions (Windows x64, Windows x86, Linux x64, Linux ARM64, macOS ARM64) at line ~379, but all have `filePath: null`. When users attempt to download an agent binary from the Agent Versions settings page or the DownloadAgentModal, the download fails because there's no file to fetch from MinIO.

**What's broken:**
- Agent download buttons appear functional but clicking them fails with 404 or null pointer errors
- Fresh installs cannot deploy agents to new assets
- Testing agent registration workflows requires manually uploading binaries to MinIO first
- Seed script creates unusable agent version records

**Who is affected:**
- Developers testing agent deployment locally
- Demo environments where agent downloads are shown to stakeholders
- QA testing end-to-end agent registration workflows

**Cost of not solving:** Agent download feature appears broken. Testing agent workflows requires 15-30 minutes of manual MinIO file uploads per environment reset.

---

## 2. Goals

| # | Goal | Measure |
|---|------|------------|
| G1 | Agent binaries are downloadable after seed | Clicking "Download Agent" succeeds (downloads a file, not a 404) |
| G2 | Seed script includes real or placeholder binaries | `filePath` is non-null and points to valid MinIO objects |
| G3 | Setup process is documented | README or seed.ts comments explain how to populate agent binaries |

---

## 3. Non-Goals

| # | Non-Goal | Why |
|---|----------|-----|
| N1 | Automatically build agent binaries during seed | Building Go binaries for 5 platforms is slow and requires cross-compilation tooling |
| N2 | Commit agent binaries to git repo | Binaries are large (5-20 MB each) and don't belong in version control |
| N3 | Download agent binaries from production | Security risk, and we want self-contained dev environments |
| N4 | Implement auto-updater logic | Agent auto-update is Sprint 2 scope |

---

## 4. User Stories

- As a **developer**, I want agent binaries to be available after `make dev-fresh` so that I can test agent downloads without manual setup.
- As a **QA engineer**, I want to download agents from the UI and verify they install correctly on test VMs.
- As a **product manager**, I want demo environments to have working agent downloads so that stakeholders see the full registration workflow.
- As a **new team member**, I want clear documentation on how to populate agent binaries so that I can set up my dev environment quickly.

---

## 5. Requirements

### Must-Have (P0)

#### R1: Create placeholder agent binaries

Since building real Go binaries is expensive, create lightweight placeholder binaries for seed environments:

**Approach:** Create small text files that mimic agent binaries (for dev/test only).

```bash
# In backend/src/db/prisma/seed-helpers/ (new directory)
echo "PatchIQ Agent v1.0.0 Windows x64 (placeholder)" > patchify-agent-windows-x64.exe
echo "PatchIQ Agent v1.0.0 Windows x86 (placeholder)" > patchify-agent-windows-x86.exe
echo "PatchIQ Agent v1.0.0 Linux x64 (placeholder)" > patchify-agent-linux-x64
echo "PatchIQ Agent v1.0.0 Linux ARM64 (placeholder)" > patchify-agent-linux-arm64
echo "PatchIQ Agent v1.0.0 macOS ARM64 (placeholder)" > patchify-agent-macos-arm64
```

**Acceptance Criteria:**
- [x] Create `backend/src/db/prisma/seed-helpers/` directory
- [x] Generate 5 placeholder files (one per platform)
- [x] Files are small (<1 KB each) so seed remains fast
- [x] Files have correct extensions (.exe for Windows, no extension for Unix)

**Alternative (Optional):** If real binaries exist in `agent/dist/`, copy them. Otherwise use placeholders.

#### R2: Upload placeholder binaries to MinIO during seed

Modify `seed.ts` to upload placeholder binaries to MinIO before creating agent version records:

```typescript
import { minioService } from '@shared/services/minio.service';
import fs from 'fs';
import path from 'path';

async function seedAgentVersions() {
  console.log('Uploading agent binaries to MinIO...');

  const seedHelpersDir = path.join(__dirname, 'seed-helpers');
  const binaries = [
    { file: 'patchify-agent-windows-x64.exe', platform: 'windows', arch: 'x64' },
    { file: 'patchify-agent-windows-x86.exe', platform: 'windows', arch: 'x86' },
    { file: 'patchify-agent-linux-x64', platform: 'linux', arch: 'x64' },
    { file: 'patchify-agent-linux-arm64', platform: 'linux', arch: 'arm64' },
    { file: 'patchify-agent-macos-arm64', platform: 'darwin', arch: 'arm64' },
  ];

  for (const binary of binaries) {
    const localPath = path.join(seedHelpersDir, binary.file);
    const minioPath = `agents/v1.0.0/${binary.file}`;

    if (fs.existsSync(localPath)) {
      await minioService.uploadFile(
        'patchiq-agents', // Bucket name
        minioPath,
        fs.createReadStream(localPath),
        {
          'Content-Type': 'application/octet-stream',
        }
      );
      console.log(`  Uploaded ${binary.file} to MinIO`);
    } else {
      console.warn(`  ⚠ Placeholder binary not found: ${localPath}`);
    }
  }

  // Now create agent version records with valid filePaths
  const agentVersions = await prisma.agentVersion.createMany({
    data: binaries.map((binary) => ({
      version: '1.0.0',
      platform: binary.platform,
      architecture: binary.arch,
      filePath: `agents/v1.0.0/${binary.file}`, // ✅ Non-null path
      releaseDate: new Date('2024-01-15'),
      isActive: true,
      minVersion: '1.0.0',
      changelog: 'Initial release for seed data',
    })),
  });

  console.log(`Seeded ${agentVersions.count} agent versions`);
}
```

**Acceptance Criteria:**
- [x] `seed.ts` uploads placeholder binaries to MinIO before creating agent version records
- [x] Agent version records have `filePath: agents/v1.0.0/<binary-name>`
- [x] MinIO bucket `patchiq-agents` is auto-created if it doesn't exist
- [x] Seed logs upload progress (success/warning for each file)

#### R3: Document real binary setup

For developers who want real agent binaries (not placeholders), add documentation:

**In `backend/src/db/prisma/README.md` (or `seed.ts` comment):**

```markdown
## Agent Binary Setup (Optional)

The seed script uploads placeholder agent binaries to MinIO. For testing real agent installations, build and upload actual binaries:

### Build Real Agent Binaries

```bash
cd agent
make release  # Builds for all platforms in agent/dist/
```

### Replace Placeholders with Real Binaries

Copy built binaries to seed-helpers directory:

```bash
cp agent/dist/patchify-agent-windows-amd64.exe backend/src/db/prisma/seed-helpers/patchify-agent-windows-x64.exe
cp agent/dist/patchify-agent-windows-386.exe backend/src/db/prisma/seed-helpers/patchify-agent-windows-x86.exe
cp agent/dist/patchify-agent-linux-amd64 backend/src/db/prisma/seed-helpers/patchify-agent-linux-x64
cp agent/dist/patchify-agent-linux-arm64 backend/src/db/prisma/seed-helpers/patchify-agent-linux-arm64
cp agent/dist/patchify-agent-darwin-arm64 backend/src/db/prisma/seed-helpers/patchify-agent-macos-arm64
```

Then re-run seed:

```bash
make db-reset  # Drops DB, migrates, seeds (with real binaries)
```
```

**Acceptance Criteria:**
- [x] Documentation explains how to build real agent binaries
- [x] Documentation explains how to replace placeholders
- [x] Documentation is in `backend/src/db/prisma/README.md` or `seed.ts` comments

#### R4: Verify agent download works

**Manual smoke test:**

**Acceptance Criteria:**
- [x] Navigate to Settings → Agent Versions
- [x] Click "Download" on any agent version
- [x] Verify: File downloads successfully (not 404)
- [x] Verify: Downloaded file contains expected content (placeholder text or real binary)

---

### Nice-to-Have (P1)

#### R5: Seed script checks if real binaries exist, uses them if available

```typescript
const realBinaryPath = path.join(__dirname, '../../../agent/dist/', binary.file);
const placeholderPath = path.join(seedHelpersDir, binary.file);

const localPath = fs.existsSync(realBinaryPath) ? realBinaryPath : placeholderPath;
```

**Acceptance Criteria:**
- [ ] If `agent/dist/` has real binaries, seed uses them
- [ ] Otherwise, falls back to placeholders

#### R6: Add file size metadata to agent version records

```typescript
const stats = fs.statSync(localPath);

await prisma.agentVersion.create({
  data: {
    // ... existing fields
    fileSize: stats.size, // Bytes
    sha256Checksum: computeSHA256(localPath), // For integrity verification
  },
});
```

**Acceptance Criteria:**
- [ ] Agent version records include file size
- [ ] Agent version records include SHA256 checksum (if field exists in schema)

---

## 6. Success Metrics

| Metric | Target | Measure |
|--------|--------|---------|
| Agent download success rate | 100% | No 404 errors when downloading agents after seed |
| Seed execution time | <5 seconds added | Placeholder uploads are fast (<1 KB each) |
| Documentation completeness | Clear instructions | New developers can set up real binaries in <10 minutes |

---

## 7. Test Plan

### Manual Smoke Tests

```
Test: Download agent binary after seed (placeholder)
  Given: Fresh database (make dev-fresh)
  When: User navigates to Settings → Agent Versions
  And: Clicks "Download" on Windows x64 agent
  Then: File downloads successfully
  And: File contains "PatchIQ Agent v1.0.0 Windows x64 (placeholder)"
  And: No 404 or MinIO errors

Test: Download agent from DownloadAgentModal
  Given: Fresh database
  When: User navigates to Assets → All Assets
  And: Clicks "Download Agent" button
  And: Selects Windows x64
  Then: File downloads successfully
  And: Modal closes after download

Test: Seed with real binaries (manual setup)
  Given: Developer has built real agent binaries (`make agent-release`)
  And: Copied binaries to seed-helpers/
  When: Developer runs `make db-reset`
  Then: Seed uploads real binaries (5-20 MB each)
  And: Agent download works
  And: Downloaded file is an executable binary (not placeholder text)

Test: MinIO bucket auto-creation
  Given: MinIO is running but `patchiq-agents` bucket doesn't exist
  When: Seed script runs
  Then: Bucket is created automatically
  And: Agent binaries are uploaded successfully
```

---

## 8. Implementation Notes

### File Structure

```
backend/src/db/prisma/
├── seed.ts (modified)
├── seed-helpers/ (new)
│   ├── patchify-agent-windows-x64.exe
│   ├── patchify-agent-windows-x86.exe
│   ├── patchify-agent-linux-x64
│   ├── patchify-agent-linux-arm64
│   └── patchify-agent-macos-arm64
└── README.md (new or updated)
```

### MinIO Service Usage

The existing `minioService` (at `backend/src/shared/services/minio.service.ts`) should have:

```typescript
async uploadFile(
  bucketName: string,
  objectName: string,
  stream: Readable,
  metadata?: Record<string, string>
): Promise<void>
```

If not, add this method (likely already exists from Phase 2 refactor).

### Seed Modifications

**Before (current):**
```typescript
const agentVersions = await prisma.agentVersion.createMany({
  data: [
    { version: '1.0.0', platform: 'windows', architecture: 'x64', filePath: null, /* ... */ },
    // ... 4 more with filePath: null
  ],
});
```

**After:**
```typescript
// Step 1: Upload binaries to MinIO
await uploadAgentBinariesToMinIO();

// Step 2: Create agent version records with valid filePaths
const agentVersions = await prisma.agentVersion.createMany({
  data: [
    { version: '1.0.0', platform: 'windows', architecture: 'x64', filePath: 'agents/v1.0.0/patchify-agent-windows-x64.exe', /* ... */ },
    // ... 4 more with non-null filePaths
  ],
});
```

### Placeholder Binary Generation Script

Create a helper script to generate placeholders:

**`backend/src/db/prisma/seed-helpers/generate-placeholders.sh`:**

```bash
#!/bin/bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Generating placeholder agent binaries..."

echo "PatchIQ Agent v1.0.0 Windows x64 (placeholder - not a real binary)" > "$DIR/patchify-agent-windows-x64.exe"
echo "PatchIQ Agent v1.0.0 Windows x86 (placeholder - not a real binary)" > "$DIR/patchify-agent-windows-x86.exe"
echo "PatchIQ Agent v1.0.0 Linux x64 (placeholder - not a real binary)" > "$DIR/patchify-agent-linux-x64"
echo "PatchIQ Agent v1.0.0 Linux ARM64 (placeholder - not a real binary)" > "$DIR/patchify-agent-linux-arm64"
echo "PatchIQ Agent v1.0.0 macOS ARM64 (placeholder - not a real binary)" > "$DIR/patchify-agent-macos-arm64"

echo "✅ Placeholders generated in $DIR"
```

Run once during initial setup:
```bash
cd backend/src/db/prisma/seed-helpers
./generate-placeholders.sh
```

Or integrate into seed.ts to auto-generate if missing.

### Estimated Effort

4-6 hours
- 1 hour: Create seed-helpers directory, generate placeholder binaries
- 2 hours: Modify seed.ts to upload binaries to MinIO before creating records
- 1 hour: Test end-to-end (download from UI, verify file contents)
- 1 hour: Document real binary setup process
- 1 hour: Handle edge cases (MinIO connection failures, missing files)

---

## 9. Open Questions

**Q1:** Should placeholders be committed to git or generated dynamically?
- **Answer:** Generate dynamically or via a setup script. Don't commit binaries (even fake ones) to git. Add `seed-helpers/*.exe` and `seed-helpers/patchify-agent-*` to `.gitignore`, commit the generation script.

**Q2:** What if MinIO is not running when seed executes?
- **Answer:** Seed script should catch MinIO connection errors and log a warning, but not fail entirely (other seed data should still be created). Document in README that MinIO must be running for full seed.

**Q3:** Should we use real agent binaries from a release archive?
- **Answer:** Not for Sprint 1. Placeholder approach is faster and doesn't require cross-compilation setup. Real binaries can be added manually for QA testing.

**Q4:** What about agent version updates (1.0.1, 1.0.2)?
- **Answer:** Out of scope for Sprint 1 seed. Seed creates 1.0.0 only. Future versions can be uploaded via the Admin UI or additional seed logic in Sprint 2.

---

## 10. Dependencies

**Blocks:**
- Agent registration testing
- Agent download UX demos

**Blocked by:**
- None (can start immediately)

**Related:**
- B.8 (Seed Data) — should be done together for consistency

---

## 11. Definition of Done

- [x] `backend/src/db/prisma/seed-helpers/` directory created with 5 placeholder binaries
- [x] `seed.ts` uploads placeholder binaries to MinIO before creating agent version records
- [x] Agent version records have `filePath: agents/v1.0.0/<binary-name>` (non-null)
- [x] Manual test: Download agent from Settings → Agent Versions succeeds
- [x] Manual test: Download agent from DownloadAgentModal succeeds
- [x] Documentation added to `backend/src/db/prisma/README.md` explaining real binary setup
- [x] Placeholder generation script committed (or instructions in README)
- [x] `make db-reset` completes successfully with no MinIO errors
- [x] Git commit: "feat(seed): populate agent version file paths with MinIO placeholders"
- [x] PR merged to `sprint-1/track-b` branch
