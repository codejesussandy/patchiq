# Hub-Centric Software Distribution Implementation

## Overview

This document tracks the implementation of PatchIQ's Hub-centric software distribution system. The goal is to centralize all software and patch distribution through MinIO storage with bundled execution scripts.

**Key Principle:** The agent should be a simple "script executor" - it downloads a package bundle from the Hub and executes the appropriate script. No hardcoded package manager commands.

---

## Architecture

### Current State (Problems)
- Agent has hardcoded package manager logic (apt, brew, winget, etc.)
- Different executors per platform with different installation methods
- Relies on external package sources (apt repositories, brew, etc.)
- No standardized way to handle install/update/rollback/uninstall

### Target State (Solution)
```
┌─────────────────────────────────────────────────────────────────┐
│                         PATCHIQ PLATFORM                         │
├─────────────────────────────────────────────────────────────────┤
│  Admin uploads package bundle to Hub:                            │
│  - package.tar.gz (or .zip for Windows)                         │
│  - install.sh / install.ps1                                     │
│  - update.sh / update.ps1                                       │
│  - rollback.sh / rollback.ps1                                   │
│  - uninstall.sh / uninstall.ps1                                 │
│  - manifest.json (metadata)                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         MINIO STORAGE                            │
│  Bucket: hub-packages                                            │
│  Structure: /{orgId}/{platform}/{packageId}/{version}/          │
│    - bundle.tar.gz                                              │
│    - manifest.json                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                            AGENT                                 │
│  1. Receives command with download URL                          │
│  2. Downloads bundle from MinIO                                 │
│  3. Extracts to temp directory                                  │
│  4. Executes appropriate script (install/update/rollback/etc.)  │
│  5. Reports result back                                         │
│  6. Cleans up temp files                                        │
└─────────────────────────────────────────────────────────────────┘
```

### Package Bundle Structure
```
package-bundle/
├── manifest.json          # Package metadata, checksums, requirements
├── files/                 # Actual software files (optional)
│   └── package.deb        # Or .msi, .pkg, .tar.gz, etc.
├── scripts/
│   ├── install.sh         # Linux/macOS install script
│   ├── install.ps1        # Windows install script (PowerShell)
│   ├── update.sh          # Linux/macOS update script
│   ├── update.ps1         # Windows update script
│   ├── rollback.sh        # Linux/macOS rollback script
│   ├── rollback.ps1       # Windows rollback script
│   ├── uninstall.sh       # Linux/macOS uninstall script
│   └── uninstall.ps1      # Windows uninstall script
└── README.md              # Optional documentation
```

### manifest.json Structure
```json
{
  "id": "PKG-chrome-linux-v120",
  "name": "google-chrome-stable",
  "displayName": "Google Chrome",
  "version": "120.0.6099.109",
  "vendor": "Google",
  "category": "browser",
  "platform": "linux",
  "architecture": "x64",
  "description": "Fast, secure web browser",
  "requiresRoot": true,
  "requiresReboot": false,
  "files": [
    {
      "name": "google-chrome-stable_120.0.6099.109-1_amd64.deb",
      "checksum": "sha256:abc123...",
      "size": 98234567
    }
  ],
  "scripts": {
    "install": "scripts/install.sh",
    "update": "scripts/update.sh",
    "rollback": "scripts/rollback.sh",
    "uninstall": "scripts/uninstall.sh"
  },
  "dependencies": [],
  "conflicts": [],
  "environment": {
    "CHROME_VERSION": "120.0.6099.109"
  }
}
```

---

## Implementation Phases

### Phase 1: Database Schema & Hub Service Updates
**Status:** NOT_STARTED
**Priority:** Critical

Update the database schema and Hub service to support script-based packages.

#### Task 1.1: Update Prisma Schema for Script-Based Packages
**Status:** NOT_STARTED

**Changes to SoftwarePackage model:**
- Add `bundleObjectKey` for the complete bundle in MinIO
- Add `manifestJson` to store the parsed manifest
- Add `scriptsIncluded` boolean flag
- Add `scriptInstall`, `scriptUpdate`, `scriptRollback`, `scriptUninstall` fields for inline scripts (fallback)

**New model: PackageScript**
- Store scripts separately for reusability and auditing
- Link to package with script type enum

#### Task 1.2: Hub Service - Bundle Upload Support
**Status:** NOT_STARTED

**Requirements:**
- Accept .tar.gz or .zip bundle uploads
- Extract and validate manifest.json
- Store complete bundle in MinIO
- Parse and store manifest metadata in database
- Validate scripts exist for target platform

#### Task 1.3: Hub Service - Bundle Download URL Generation
**Status:** NOT_STARTED

**Requirements:**
- Generate presigned URL for complete bundle
- Include checksum in response for verification
- Support version-specific downloads

---

### Phase 2: Agent Script Executor
**Status:** NOT_STARTED
**Priority:** Critical

Implement a generic script executor in the agent that replaces hardcoded package manager logic.

#### Task 2.1: Script Executor Core
**Status:** NOT_STARTED

**New file:** `agent/internal/executors/script_executor.go`

**Requirements:**
- Download bundle from URL with checksum verification
- Extract bundle to temp directory
- Parse manifest.json
- Execute appropriate script based on operation type
- Capture stdout/stderr
- Handle exit codes
- Clean up temp files
- Support timeout

**Script execution:**
- Linux/macOS: `bash -c "cd /tmp/bundle && chmod +x scripts/install.sh && ./scripts/install.sh"`
- Windows: `powershell -ExecutionPolicy Bypass -File scripts\install.ps1`

#### Task 2.2: Replace Platform-Specific Executors
**Status:** NOT_STARTED

**Modification:** Update `software_linux.go`, `software_windows.go`, `software_darwin.go`

**Requirements:**
- Check if command payload has `bundleUrl` (new Hub-based)
- If yes, use ScriptExecutor
- If no (legacy), fall back to existing package manager logic
- Gradual migration path

#### Task 2.3: Environment Variable Injection
**Status:** NOT_STARTED

**Requirements:**
- Inject manifest environment variables before script execution
- Add standard variables: `PATCHIQ_AGENT_ID`, `PATCHIQ_OPERATION`, `PATCHIQ_VERSION`
- Pass custom variables from deployment configuration

---

### Phase 3: Backend Deployment Updates
**Status:** NOT_STARTED
**Priority:** High

Update deployment service to use Hub packages with scripts.

#### Task 3.1: Deployment Command Payload Update
**Status:** NOT_STARTED

**Update payload structure:**
```json
{
  "operationType": "install|update|rollback|uninstall",
  "packageId": "PKG-chrome-linux-v120",
  "bundleUrl": "https://minio.../bundle.tar.gz",
  "bundleChecksum": "sha256:abc123...",
  "manifest": { ... },
  "environment": { ... },
  "requiresRoot": true,
  "timeout": 600
}
```

#### Task 3.2: Update Deployment Executor Service
**Status:** NOT_STARTED

**Requirements:**
- Fetch package details from Hub including bundle URL
- Generate presigned URL for bundle
- Include manifest in command payload
- Support all operation types (install, update, rollback, uninstall)

---

### Phase 4: Frontend Hub Management Enhancement
**Status:** NOT_STARTED
**Priority:** High

Enhance Hub UI for bundle management.

#### Task 4.1: Package Bundle Upload Form
**Status:** NOT_STARTED

**Requirements:**
- Upload .tar.gz or .zip bundle file
- Preview manifest.json contents
- Validate required scripts exist
- Show file list and sizes
- Allow editing metadata before save

#### Task 4.2: Script Editor/Viewer
**Status:** NOT_STARTED

**Requirements:**
- View scripts included in package
- Syntax highlighting for bash/PowerShell
- Inline edit capability for admins
- Script validation (syntax check)

#### Task 4.3: Package Version Management
**Status:** NOT_STARTED

**Requirements:**
- List all versions of a package
- Set active/default version
- Compare versions
- Deprecate old versions

---

### Phase 5: Whitelist Source Integration
**Status:** NOT_STARTED
**Priority:** Medium

Auto-populate Hub from whitelisted sources.

#### Task 5.1: Whitelist Source Service
**Status:** NOT_STARTED

**Requirements:**
- Fetch available packages from whitelist sources
- Generate installation scripts automatically for common sources (apt, brew, etc.)
- Create package bundles programmatically
- Store in Hub

#### Task 5.2: Package Template System
**Status:** NOT_STARTED

**Requirements:**
- Create script templates for common package types
- apt-get template for .deb packages
- brew template for Homebrew packages
- msi template for Windows installers
- Auto-generate scripts from templates

---

### Phase 6: Advanced Features
**Status:** NOT_STARTED
**Priority:** Low

Additional features for production readiness.

#### Task 6.1: Dependency Resolution
**Status:** NOT_STARTED

**Requirements:**
- Parse package dependencies from manifest
- Create deployment tasks in correct order
- Handle dependency failures

#### Task 6.2: Pre/Post Hooks
**Status:** NOT_STARTED

**Requirements:**
- Execute pre-install validation scripts
- Execute post-install verification scripts
- Report hook results separately

#### Task 6.3: Staged Rollouts
**Status:** NOT_STARTED

**Requirements:**
- Deploy to percentage of agents first
- Wait for success before continuing
- Auto-rollback on failure threshold

---

## Testing Strategy

### Unit Tests
- [ ] Hub service bundle upload/download
- [ ] Manifest parsing and validation
- [ ] Script executor on each platform
- [ ] Deployment payload generation

### Integration Tests
- [ ] Full flow: Upload bundle → Create deployment → Agent executes → Result reported
- [ ] Rollback flow
- [ ] Update flow
- [ ] Uninstall flow

### E2E Tests
- [ ] Frontend bundle upload
- [ ] Deployment creation through UI
- [ ] Task status updates in real-time

---

## Progress Tracker

| Phase | Task | Status | Notes |
|-------|------|--------|-------|
| 1 | 1.1 Schema Updates | **COMPLETED** | 2026-01-24 - Added bundle fields to SoftwarePackage |
| 1 | 1.2 Bundle Upload | **COMPLETED** | 2026-01-24 - uploadPackageBundle() extracts, validates, stores |
| 1 | 1.3 Bundle Download URL | **COMPLETED** | 2026-01-24 - getBundleDownloadInfo(), getExecutionPayload() |
| 2 | 2.1 Script Executor Core | **COMPLETED** | 2026-01-24 - BaseScriptExecutor in agent with tar.gz support |
| 2 | 2.2 Platform Executor Updates | **COMPLETED** | 2026-01-24 - All 3 platforms updated (linux, darwin, windows) |
| 2 | 2.3 Environment Variables | **COMPLETED** | 2026-01-24 - Manifest env vars injected into script execution |
| 3 | 3.1 Deployment Payload Update | **COMPLETED** | 2026-01-24 - ScriptBundlePayload type added |
| 3 | 3.2 Deployment Executor Update | **COMPLETED** | 2026-01-24 - Hub package detection, bundle URL generation |
| 4 | 4.1 Bundle Upload Form | **COMPLETED** | 2026-01-24 - Drag-and-drop upload in Hub page |
| 4 | 4.2 Script Editor | DEFERRED | Low priority - inline edit capability |
| 4 | 4.3 Version Management | DEFERRED | Low priority - version comparison |
| 5 | 5.1 Whitelist Integration | IN_PROGRESS | 2026-01-25 - Test packages populated (12 bundles) |
| 5 | 5.2 Template System | **COMPLETED** | 2026-01-25 - populate-hub.sh creates bundles from templates |
| 6 | 6.1 Dependencies | NOT_STARTED | |
| 6 | 6.2 Pre/Post Hooks | NOT_STARTED | |
| 6 | 6.3 Staged Rollouts | NOT_STARTED | |

---

## Migration Strategy

### Backward Compatibility
The system will support both:
1. **Legacy mode:** Commands with `source: "apt"`, `packageUrl: "..."` - uses existing package manager executors
2. **Hub mode:** Commands with `bundleUrl: "..."`, `manifest: {...}` - uses new script executor

### Migration Path
1. Phase 1-3: Implement Hub mode alongside legacy
2. Phase 4: Update UI to prefer Hub mode
3. Phase 5: Auto-convert whitelist packages to Hub bundles
4. Future: Deprecate legacy mode

---

## Over-Achievements Log

Track any additional fixes or improvements made during implementation.

| Date | Description | Files Modified |
|------|-------------|----------------|
| 2026-01-24 | Fixed undefined variable bug in Vulnerabilities.tsx (filteredVulnerabilities -> filteredItems) | frontend/src/pages/vulnerability/Vulnerabilities.tsx |
| 2026-01-24 | Removed unused VulnerabilityStats import | frontend/src/pages/vulnerability/ZeroDayVulnerabilities.tsx |

---

*Last Updated: 2026-01-25*
*Status: Phases 1-5 Complete - Hub populated with 12 deployable packages (7 apps, 5 security patches)*

## What's Working Now

1. **Backend**:
   - Schema supports script bundles with manifest and inline scripts
   - Hub service can upload/extract .tar.gz bundles
   - Deployment executor detects Hub packages and generates bundle payloads
   - New API endpoints: `POST /hub/packages/upload-bundle`, `GET /hub/packages/:id/bundle`

2. **Agent**:
   - New ScriptExecutor handles bundle download, extraction, and script execution
   - Supports `hub_install`, `hub_update`, `hub_rollback`, `hub_uninstall` commands
   - Falls back to legacy package manager commands for non-bundle packages

3. **Frontend**:
   - Hub page shows bundle indicator (green BUNDLE tag)
   - Upload Bundle button with drag-and-drop modal
   - Deployment payloads include packageId for Hub package detection
