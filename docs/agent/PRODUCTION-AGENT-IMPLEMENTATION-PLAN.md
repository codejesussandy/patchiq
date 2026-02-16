# Production-Grade PatchIQ Agent Implementation Plan

> **Mission:** Build production-grade PatchIQ agents with full deployment capabilities across Windows, Linux, and macOS.

**Status:** 🚀 IN PROGRESS
**Started:** 2026-02-14
**Target Completion:** TBD based on Phase 1 analysis

---

## Executive Summary

**Current State:**
- PatchIQ Go agent exists but lacks complete functionality
- Windows agent is non-functional
- Binaries not built for all platforms
- Deployment capabilities incomplete
- Self-update mechanism needs validation

**Goal:**
- 100% functional agents across Windows, Linux, and macOS
- Complete deployment pipelines (software + patches)
- Robust communication and telemetry
- Self-update capability
- Production-grade quality with comprehensive testing

**Approach:**
1. **Phase 1:** Comprehensive analysis of current state
2. **Phase 2:** Strategic planning with defined pipelines
3. **Phase 3:** Pipeline-by-pipeline implementation
4. **Phase 4:** Binary production and distribution
5. **Phase 5:** Production validation

---

## Phase 1: Comprehensive Analysis

**Status:** 🔄 IN PROGRESS
**Owner:** Explore Agent
**Estimated Duration:** 2-3 hours

### 1.1 Architecture Analysis

**Objective:** Understand the current agent implementation across all dimensions.

#### 1.1.1 Deployment Capabilities

**Questions to Answer:**

1. **Patch Deployment:**
   - What's the current state of patch deployment? (install/uninstall/rollback)
   - Which executors are implemented vs stubbed?
   - What's the success/failure handling?
   - Is rollback functional?

2. **Software Deployment:**
   - What's the current state of software deployment? (install/delete/upgrade)
   - Which package managers are supported?
     - Windows: winget, chocolatey, MSI, EXE
     - Linux: apt, yum, dnf, snap, flatpak, deb, rpm
     - macOS: brew, mas, pkg, dmg
   - Are all methods fully implemented?

3. **Hub-Centric Architecture:**
   - Does the agent download from MinIO?
   - Are deployment scripts used? (install.sh, uninstall.sh, rollback.sh)
   - How are packages bundled?
   - What's the security model? (checksums, signatures)

#### 1.1.2 Communication Layer

**Questions to Answer:**

1. **Telemetry Collection:**
   - What telemetry is currently collected?
   - What's sent vs what's available?
   - Is streaming working?
   - What's the update frequency?

2. **Agent-Hub Communication:**
   - How does heartbeat work?
   - What's the command polling mechanism?
   - How are results reported?
   - Are there silent failures?

3. **Inventory Submission:**
   - What inventory data is collected? (hardware/software/network/security)
   - How often is it submitted?
   - Is deduplication working?
   - What triggers full vs incremental updates?

#### 1.1.3 Self-Update Mechanism

**Questions to Answer:**

1. **Update Process:**
   - Does self-update work on all platforms?
   - How is version checking done?
   - How are binaries downloaded?
   - Is checksum validation working?

2. **Safety & Rollback:**
   - Is there rollback for failed updates?
   - How is the old binary preserved?
   - What happens to running services?
   - How are permissions handled?

3. **Distribution:**
   - Where are update binaries stored? (MinIO paths)
   - How does the agent find new versions?
   - Is there phased rollout support?

#### 1.1.4 Platform-Specific Implementation

**Per Platform Analysis:**

**Windows:**
- What's broken?
- Which executors fail?
- What errors occur?
- Which Windows versions are tested? (10/11/Server 2019/2022)
- Is the service installation working?

**Linux:**
- Which distributions are supported?
- Are package manager integrations complete?
- Any systemd issues?
- Which architectures? (amd64/arm64)

**macOS:**
- Intel vs Apple Silicon differences?
- Is code signing/notarization handled?
- LaunchDaemon installation working?
- Which macOS versions supported? (13+)

#### 1.1.5 Network & Ports

**Questions to Answer:**

1. **Port Configuration:**
   - What ports does the agent use?
   - Are there conflicts with default ports?
   - How does nginx proxy agent communication?
   - Is SSL/TLS properly configured?

2. **Connectivity:**
   - How are network failures handled?
   - Is there retry logic with backoff?
   - Are timeouts configured properly?
   - Can the agent work behind proxies?

#### 1.1.6 Error Handling & Recovery

**Questions to Answer:**

1. **Deployment Failures:**
   - What happens when deployment fails?
   - Are partial installations cleaned up?
   - Is there transaction-like behavior?
   - How are dependencies handled?

2. **Logging & Observability:**
   - What's logged?
   - What's missing from logs?
   - Are error codes standardized?
   - Is debug mode available?

### 1.2 Gap Analysis

**Objective:** Identify what's missing or broken.

**Deliverables:**

1. **Non-Functional Features List** (per platform)
   - Feature name
   - Platform affected
   - Severity (Critical/High/Medium/Low)
   - Current state (Stub/Broken/Partial)

2. **Stub Code Inventory**
   - File path
   - Function name
   - What needs implementation
   - Complexity estimate

3. **Platform-Specific Issues**
   - Platform
   - Issue description
   - Impact
   - Workaround (if any)

4. **Missing Integration Points**
   - Integration point
   - Current state
   - Required work

5. **Security Gaps**
   - Gap description
   - Risk level
   - Mitigation needed

6. **Performance Bottlenecks**
   - Bottleneck location
   - Impact
   - Optimization needed

7. **Missing Tests**
   - Test type (unit/integration/E2E)
   - Coverage gap
   - Priority

### 1.3 Binary Build Analysis

**Questions to Answer:**

1. **Current Binaries:**
   - Which binaries exist?
   - Where are they located?
   - What's their build date?
   - What versions?

2. **Build Process:**
   - What's the build process? (Makefile targets)
   - Are cross-platform builds working?
   - What dependencies are required?
   - How long does a full build take?

3. **Distribution Format:**
   - Are binaries signed?
   - Are binaries notarized? (macOS)
   - Are there installers?
     - MSI for Windows?
     - PKG for macOS?
     - DEB/RPM for Linux?

4. **Missing Binaries:**
   - Which platform/arch combinations are missing?
   - What's blocking their creation?

### 1.4 Deliverables

**Required Outputs:**

1. **`AGENT-ANALYSIS.md`** - Comprehensive analysis document
   - Current state assessment per platform
   - What works, what doesn't
   - Root cause analysis for failures

2. **`AGENT-GAP-ANALYSIS.md`** - Gap analysis
   - Complete list of missing/broken features
   - Prioritized by impact
   - Dependency mapping

3. **`AGENT-RISK-ASSESSMENT.md`** - Risk analysis
   - Critical gaps that block production
   - High-risk areas (complex/unstable)
   - Nice-to-have features

4. **`AGENT-DEPENDENCY-MAP.md`** - Dependency visualization
   - What depends on what
   - Critical path identification
   - Parallel work opportunities

---

## Phase 2: Strategic Planning

**Status:** 📋 PENDING (starts after Phase 1)
**Owner:** Plan Agent
**Estimated Duration:** 4-6 hours

### 2.1 Pipeline Definition

**Objective:** Structure work into logical, manageable pipelines.

**Pipeline Template:**

```
Pipeline N: [Name]
├── Description: What does this pipeline deliver?
├── Priority: Critical / High / Medium / Low
├── Dependencies: Which pipelines must complete first?
├── Platform Scope: Windows / Linux / macOS / All
├── Requirements:
│   ├── R1: [Requirement description]
│   ├── R2: [Requirement description]
│   └── R3: [Requirement description]
├── Exit Criteria:
│   ├── [ ] Criterion 1
│   ├── [ ] Criterion 2
│   └── [ ] Criterion 3
└── Validation Plan:
    ├── Unit Tests: [description]
    ├── Integration Tests: [description]
    └── E2E Tests: [description]
```

**Candidate Pipelines:**

#### Pipeline 1: Core Deployment Engine (CRITICAL)

**Description:** Implement complete patch and software deployment on all platforms.

**Requirements:**
- R1: Patch install/uninstall/rollback on Windows/Linux/macOS
- R2: Software install/delete/upgrade on Windows/Linux/macOS
- R3: Package download from MinIO with checksum verification
- R4: Script execution framework (install.sh, uninstall.sh, etc.)
- R5: Error handling with proper classification
- R6: Transaction-like cleanup on failure

**Exit Criteria:**
- [ ] All platform executors fully implemented (no stubs)
- [ ] 100% success rate on test matrix (10 packages × 3 platforms)
- [ ] Rollback works correctly on all platforms
- [ ] No orphaned files/registry entries after uninstall
- [ ] All errors properly logged and reported

**Platform Scope:** All (Windows, Linux, macOS)

**Dependencies:** None (foundational)

---

#### Pipeline 2: Communication & Telemetry (CRITICAL)

**Description:** Ensure robust agent-hub communication with complete telemetry.

**Requirements:**
- R1: Stable heartbeat with exponential backoff on failures
- R2: Reliable command polling and execution
- R3: Complete inventory submission (hardware/software/network/security)
- R4: Real-time telemetry streaming
- R5: Result reporting for all operations
- R6: Error propagation to Hub

**Exit Criteria:**
- [ ] Heartbeat survives 24-hour network outage test
- [ ] Commands execute and report 100% of the time
- [ ] Inventory deduplication reduces bandwidth by 75%+
- [ ] Telemetry streams without data loss
- [ ] No silent failures in communication

**Platform Scope:** All

**Dependencies:** None (foundational)

---

#### Pipeline 3: Self-Update Mechanism (HIGH)

**Description:** Safe, reliable agent self-update on all platforms.

**Requirements:**
- R1: Version checking against Hub
- R2: Binary download with checksum validation
- R3: Safe update with automatic rollback on failure
- R4: Service restart handling (Windows Service, systemd, LaunchDaemon)
- R5: Phased rollout support
- R6: Update status reporting

**Exit Criteria:**
- [ ] Agent updates from v1.0 → v1.1 on all platforms
- [ ] Rollback works when update fails
- [ ] Service automatically restarts post-update
- [ ] No downtime > 30 seconds during update
- [ ] Update survives interrupted connection

**Platform Scope:** All

**Dependencies:** Pipeline 2 (communication)

---

#### Pipeline 4: Windows Platform Hardening (HIGH)

**Description:** Fix all Windows-specific bugs and complete Windows support.

**Requirements:**
- R1: Fix all identified Windows bugs from Phase 1
- R2: Windows Update integration
- R3: winget and chocolatey support
- R4: MSI installer creation
- R5: Windows Service management
- R6: Registry handling

**Exit Criteria:**
- [ ] All Windows executors working
- [ ] Windows 10/11 support verified
- [ ] Windows Server 2019/2022 support verified
- [ ] MSI installer installs and uninstalls cleanly
- [ ] Service starts automatically on boot

**Platform Scope:** Windows only

**Dependencies:** Pipeline 1 (deployment engine)

---

#### Pipeline 5: Package Manager Integration (MEDIUM)

**Description:** Complete integration with all major package managers.

**Requirements:**
- R1: apt/dpkg (Debian/Ubuntu)
- R2: yum/dnf (RHEL/Fedora/AlmaLinux)
- R3: brew/mas (macOS)
- R4: snap/flatpak (Linux universal)
- R5: chocolatey/winget (Windows)
- R6: Native installers (MSI, PKG, DEB, RPM, DMG, EXE)

**Exit Criteria:**
- [ ] All package managers tested with 10+ packages each
- [ ] Dependency resolution working
- [ ] Conflict detection working
- [ ] Uninstall cleans up dependencies (where supported)
- [ ] Version pinning supported

**Platform Scope:** All

**Dependencies:** Pipeline 1 (deployment engine)

---

#### Pipeline 6: Security & Validation (HIGH)

**Description:** Production-grade security for agent deployment.

**Requirements:**
- R1: Code signing (all platforms)
- R2: Binary checksum validation
- R3: Secure token handling (encryption at rest)
- R4: Permission validation before execution
- R5: Audit logging for all operations
- R6: TLS for all Hub communication

**Exit Criteria:**
- [ ] All binaries signed with valid certificates
- [ ] Invalid checksums rejected 100% of the time
- [ ] Credentials encrypted on disk
- [ ] Unauthorized commands rejected
- [ ] Full audit trail available

**Platform Scope:** All

**Dependencies:** Pipeline 1, Pipeline 2

---

#### Pipeline 7: Production Packaging (MEDIUM)

**Description:** Professional installers for all platforms.

**Requirements:**
- R1: MSI installer for Windows (WiX Toolset)
- R2: PKG installer for macOS (signed and notarized)
- R3: DEB packages for Debian/Ubuntu
- R4: RPM packages for RHEL/Fedora
- R5: Auto-update manifests
- R6: Installation documentation

**Exit Criteria:**
- [ ] MSI installs as Windows Service
- [ ] PKG passes Gatekeeper on macOS
- [ ] DEB/RPM install via package manager
- [ ] All installers include uninstall
- [ ] User documentation complete

**Platform Scope:** All

**Dependencies:** Pipeline 6 (security)

---

### 2.2 Prioritization Matrix

**Ranking Criteria:**

1. **Business Criticality** (1-5): Can't ship without it
2. **User Impact** (1-5): Directly affects end-users
3. **Technical Dependencies** (1-5): Blocks other work
4. **Risk Level** (1-5): Complexity or unknowns
5. **Effort** (1-5): Time to complete

**Priority Calculation:**
```
Priority Score = (Business Criticality × 3) + (User Impact × 2) + (Technical Dependencies × 2) - (Risk × 0.5) - (Effort × 0.5)
```

Higher score = Higher priority

**Expected Order:**
1. Pipeline 1: Core Deployment Engine
2. Pipeline 2: Communication & Telemetry
3. Pipeline 4: Windows Platform Hardening
4. Pipeline 3: Self-Update Mechanism
5. Pipeline 6: Security & Validation
6. Pipeline 5: Package Manager Integration
7. Pipeline 7: Production Packaging

(To be confirmed after Phase 1 analysis)

### 2.3 Timeline Estimation

**Per Pipeline:**
- Planning: 2-4 hours
- Implementation: 8-24 hours (depending on complexity)
- Testing: 4-8 hours
- QA: 2-4 hours
- Buffer: 20% contingency

**Total Estimate:** TBD after Phase 1

### 2.4 Deliverables

**Required Outputs:**

1. **`AGENT-ROADMAP.md`** - Implementation roadmap
   - All pipelines defined
   - Prioritization complete
   - Dependencies mapped
   - Timeline estimated

2. **`PIPELINE-N-PRD.md`** (per pipeline) - Product requirements
   - Detailed requirements
   - Acceptance criteria
   - Test plan
   - Risk assessment

---

## Phase 3: Pipeline Implementation

**Status:** 📋 PENDING (starts after Phase 2)
**Duration:** Variable per pipeline

### Implementation Workflow (Per Pipeline)

#### Step 1: Detailed Planning

**Use Plan Agent to create pipeline-specific plan:**

**Inputs:**
- Analysis from Phase 1
- PRD from Phase 2
- Current codebase state

**Outputs:**
- `PIPELINE-N-IMPLEMENTATION-PLAN.md`
  - Task breakdown (with file paths)
  - Implementation sequence
  - Parallelization strategy
  - Test strategy
  - Risk mitigation
  - Estimated hours per task

**Task Template:**
```
Task N.M: [Task Name]
├── Description: What does this task do?
├── Files to Modify: [list]
├── Files to Create: [list]
├── Dependencies: [other tasks]
├── Acceptance Criteria: [checklist]
├── Tests Required: [list]
├── Estimated Hours: X-Y
└── Assigned To: Teammate N
```

#### Step 2: Parallel Implementation

**Use 3-5 General-Purpose Agents as Teammates:**

**Parallelization Strategy:**

**Example for Pipeline 1 (Core Deployment):**

```
Teammate 1: Windows Executor
├── Implement patch_windows.go
├── Implement software_windows.go
├── Handle MSI/EXE installers
├── Windows Update integration
└── Unit tests

Teammate 2: Linux Executor
├── Implement patch_linux.go
├── Implement software_linux.go
├── Handle apt/yum/dnf
├── DEB/RPM support
└── Unit tests

Teammate 3: macOS Executor
├── Implement patch_darwin.go
├── Implement software_darwin.go
├── Handle brew/mas/pkg/dmg
├── Code signing checks
└── Unit tests

Teammate 4: Integration Framework
├── MinIO download logic
├── Checksum validation
├── Script executor
├── Error classification
└── Integration tests

Teammate 5: Documentation & Testing
├── Update README
├── Write E2E tests
├── Create test matrix
└── QA preparation
```

**Critical Rules for Implementation:**

1. **Type Safety:**
   - No `as any` or `@ts-ignore`
   - No unsafe casts
   - Fix underlying type issues

2. **Error Handling:**
   - All errors handled explicitly
   - Use error codes from models.go
   - Log all errors with context
   - No silent failures

3. **Code Quality:**
   - Follow existing patterns
   - No stub code (implement fully or create TODO issue)
   - Add comments for complex logic
   - Keep functions under 50 lines

4. **Testing:**
   - Write tests as you code
   - Aim for 60%+ coverage on new code
   - Test happy path + error scenarios
   - Add platform-specific tests

5. **Logging:**
   - Use structured logging (zerolog)
   - Include correlation IDs
   - Log entry/exit of major functions
   - Include context in errors

#### Step 3: Integration & Testing

**Use General-Purpose Agent for comprehensive testing:**

**Unit Tests:**
```bash
cd agent && go test -v -cover ./internal/...
# Target: 60%+ coverage on new code
```

**Integration Tests:**

**Test Matrix Template:**

| Test Case | Windows | Linux | macOS | Status |
|-----------|---------|-------|-------|--------|
| Install patch | ⏳ | ⏳ | ⏳ | Pending |
| Uninstall patch | ⏳ | ⏳ | ⏳ | Pending |
| Rollback patch | ⏳ | ⏳ | ⏳ | Pending |
| Install software | ⏳ | ⏳ | ⏳ | Pending |
| Upgrade software | ⏳ | ⏳ | ⏳ | Pending |
| Uninstall software | ⏳ | ⏳ | ⏳ | Pending |

**Functional Tests:**

1. **Deployment Tests:**
   - Install 10 different packages (per platform)
   - Upgrade 5 packages
   - Uninstall 5 packages
   - Rollback 3 failed deployments
   - Verify no orphaned files/registry entries

2. **Communication Tests:**
   - Heartbeat survives 1-hour network outage
   - Commands execute within 5 seconds
   - Inventory submits in < 30 seconds
   - Telemetry streams at 5-second intervals

3. **Self-Update Tests:**
   - Update from v1.0 → v1.1
   - Interrupted update (kill during download)
   - Corrupted binary (bad checksum)
   - Rollback on failed update

4. **Error Scenario Tests:**
   - Network failure during download
   - Insufficient permissions
   - Disk full
   - Corrupted package
   - Conflicting package versions
   - Missing dependencies

**Load Tests:**
- 100 concurrent deployments
- 24-hour continuous operation
- 1000 packages in inventory
- Memory profiling (detect leaks)
- CPU profiling (find hotspots)

**Security Tests:**
- Invalid checksums rejected
- Unauthorized commands blocked
- Credentials encrypted at rest
- No secrets in logs
- TLS validation working

#### Step 4: Quality Assurance

**Dedicated QA Pass (Manual + Automated):**

**QA Checklist Template:**

**Functionality:**
- [ ] All requirements from PRD met
- [ ] No regressions in existing features
- [ ] Error handling complete and correct
- [ ] Logging adequate for debugging
- [ ] Performance meets benchmarks

**Cross-Platform Verification:**

**Windows:**
- [ ] Windows 10 (21H2+) working
- [ ] Windows 11 working
- [ ] Windows Server 2019 working
- [ ] Windows Server 2022 working

**Linux:**
- [ ] Ubuntu 22.04 LTS working
- [ ] Ubuntu 24.04 LTS working
- [ ] Debian 12 working
- [ ] RHEL 9 working
- [ ] Fedora 39+ working

**macOS:**
- [ ] macOS 13 (Ventura) Intel working
- [ ] macOS 13 (Ventura) Apple Silicon working
- [ ] macOS 14 (Sonoma) Intel working
- [ ] macOS 14 (Sonoma) Apple Silicon working
- [ ] macOS 15 (Sequoia) working

**Performance Benchmarks:**
- [ ] Startup time < 5 seconds
- [ ] Memory usage < 100MB idle
- [ ] Memory usage < 500MB active
- [ ] CPU usage < 5% idle
- [ ] CPU usage < 25% during deployment
- [ ] Deployment speed acceptable (< 5 min for typical package)

**Documentation:**
- [ ] User guide updated
- [ ] Admin guide updated
- [ ] API documentation current
- [ ] Troubleshooting guide complete
- [ ] Release notes written
- [ ] CHANGELOG updated

**Deliverables:**

1. **`PIPELINE-N-QA-REPORT.md`**
   - Test results (pass/fail per platform)
   - Performance benchmarks
   - Known issues/limitations
   - Workarounds for known issues
   - Sign-off for production

2. **Test Artifacts:**
   - Test logs
   - Screenshots/videos of key tests
   - Performance profiles
   - Coverage reports

---

## Phase 4: Binary Production & Distribution

**Status:** 📋 PENDING
**Duration:** 4-6 hours per full release

### 4.1 Build Binaries

**Objective:** Build production-ready binaries for all platforms.

**Build Process:**

```bash
# Clean previous builds
make clean

# Build all platform binaries
make agent-release

# Expected outputs in agent/dist/:
# - patchiq-agent-windows-amd64.exe      (~15-20 MB)
# - patchiq-agent-linux-amd64            (~12-15 MB)
# - patchiq-agent-linux-arm64            (~11-14 MB)
# - patchiq-agent-darwin-amd64           (~14-17 MB)
# - patchiq-agent-darwin-arm64           (~13-16 MB)
```

**Build Verification:**

For each binary:
```bash
# Verify binary is executable
chmod +x agent/dist/patchiq-agent-*

# Check version
./agent/dist/patchiq-agent-<platform> --version

# Check size
ls -lh agent/dist/patchiq-agent-<platform>

# Verify not stripped (for debugging)
file agent/dist/patchiq-agent-<platform>

# Calculate checksum
sha256sum agent/dist/patchiq-agent-<platform>
```

### 4.2 Create Installers

**Objective:** Professional installers for each platform.

#### Windows MSI Installer

**Using WiX Toolset:**

```xml
<!-- agent/installer/windows/patchiq-agent.wxs -->
<?xml version="1.0" encoding="UTF-8"?>
<Wix xmlns="http://schemas.microsoft.com/wix/2006/wi">
  <Product Id="*"
           Name="PatchIQ Agent"
           Language="1033"
           Version="1.0.0"
           Manufacturer="PatchIQ"
           UpgradeCode="PUT-GUID-HERE">

    <Package InstallerVersion="200" Compressed="yes" InstallScope="perMachine" />

    <MediaTemplate EmbedCab="yes" />

    <!-- Install to Program Files -->
    <Directory Id="TARGETDIR" Name="SourceDir">
      <Directory Id="ProgramFilesFolder">
        <Directory Id="INSTALLFOLDER" Name="PatchIQ Agent" />
      </Directory>
    </Directory>

    <!-- Components -->
    <ComponentGroup Id="ProductComponents" Directory="INSTALLFOLDER">
      <Component Id="AgentBinary">
        <File Id="AgentEXE" Source="../../dist/patchiq-agent-windows-amd64.exe" KeyPath="yes" />
      </Component>
    </ComponentGroup>

    <!-- Install as Windows Service -->
    <Component Id="ServiceInstaller" Directory="INSTALLFOLDER">
      <ServiceInstall Id="PatchIQAgentService"
                      Type="ownProcess"
                      Name="PatchIQAgent"
                      DisplayName="PatchIQ Agent"
                      Description="PatchIQ patch and software management agent"
                      Start="auto"
                      Account="LocalSystem"
                      ErrorControl="normal" />
      <ServiceControl Id="StartService" Start="install" Stop="both" Remove="uninstall" Name="PatchIQAgent" Wait="yes" />
    </Component>

    <Feature Id="ProductFeature" Title="PatchIQ Agent" Level="1">
      <ComponentGroupRef Id="ProductComponents" />
      <ComponentRef Id="ServiceInstaller" />
    </Feature>
  </Product>
</Wix>
```

**Build MSI:**
```bash
cd agent/installer/windows
candle patchiq-agent.wxs
light -out patchiq-agent-v1.0.0.msi patchiq-agent.wixobj
```

**Test MSI:**
```powershell
# Install
msiexec /i patchiq-agent-v1.0.0.msi /qn /l*v install.log

# Verify service
Get-Service PatchIQAgent

# Uninstall
msiexec /x patchiq-agent-v1.0.0.msi /qn /l*v uninstall.log
```

#### macOS PKG Installer

**Create installer structure:**

```bash
agent/installer/macos/
├── scripts/
│   ├── preinstall       # Pre-installation checks
│   ├── postinstall      # Install LaunchDaemon, start service
│   └── preinstall       # Stop service before upgrade
├── payload/
│   └── usr/local/bin/patchiq-agent
└── Library/LaunchDaemons/
    └── com.patchiq.agent.plist
```

**LaunchDaemon plist:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.patchiq.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/patchiq-agent</string>
        <string>start</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/var/log/patchiq-agent.log</string>
    <key>StandardErrorPath</key>
    <string>/var/log/patchiq-agent-error.log</string>
</dict>
</plist>
```

**Build PKG:**

```bash
# Create package
pkgbuild --root payload \
         --scripts scripts \
         --identifier com.patchiq.agent \
         --version 1.0.0 \
         --install-location / \
         patchiq-agent-v1.0.0.pkg

# Sign package (required for macOS 10.15+)
productsign --sign "Developer ID Installer: Your Company" \
            patchiq-agent-v1.0.0.pkg \
            patchiq-agent-v1.0.0-signed.pkg

# Notarize (submit to Apple)
xcrun notarytool submit patchiq-agent-v1.0.0-signed.pkg \
                        --apple-id "your@email.com" \
                        --password "app-specific-password" \
                        --team-id "TEAMID" \
                        --wait

# Staple notarization ticket
xcrun stapler staple patchiq-agent-v1.0.0-signed.pkg
```

**Test PKG:**

```bash
# Install
sudo installer -pkg patchiq-agent-v1.0.0-signed.pkg -target /

# Verify
launchctl list | grep patchiq

# Uninstall (create uninstall script)
sudo launchctl unload /Library/LaunchDaemons/com.patchiq.agent.plist
sudo rm /usr/local/bin/patchiq-agent
sudo rm /Library/LaunchDaemons/com.patchiq.agent.plist
```

#### Linux DEB Package

**Create package structure:**

```bash
agent/installer/linux/deb/
├── DEBIAN/
│   ├── control          # Package metadata
│   ├── postinst         # Post-install script
│   ├── prerm            # Pre-removal script
│   └── postrm           # Post-removal script
├── usr/
│   └── local/
│       └── bin/
│           └── patchiq-agent
└── etc/
    └── systemd/
        └── system/
            └── patchiq-agent.service
```

**control file:**

```
Package: patchiq-agent
Version: 1.0.0
Section: admin
Priority: optional
Architecture: amd64
Maintainer: PatchIQ <support@patchiq.io>
Description: PatchIQ patch and software management agent
 Automated patch and software deployment agent that communicates
 with PatchIQ Hub for centralized management.
```

**systemd service:**

```ini
[Unit]
Description=PatchIQ Agent
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/patchiq-agent start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**Build DEB:**

```bash
# Build package
dpkg-deb --build agent/installer/linux/deb patchiq-agent_1.0.0_amd64.deb

# Test install
sudo dpkg -i patchiq-agent_1.0.0_amd64.deb
sudo systemctl status patchiq-agent

# Test remove
sudo dpkg -r patchiq-agent
```

#### Linux RPM Package

**Create spec file:**

```spec
Name:           patchiq-agent
Version:        1.0.0
Release:        1%{?dist}
Summary:        PatchIQ patch and software management agent
License:        Proprietary
URL:            https://patchiq.io
Source0:        patchiq-agent-linux-amd64

%description
Automated patch and software deployment agent that communicates
with PatchIQ Hub for centralized management.

%install
mkdir -p %{buildroot}/usr/local/bin
install -m 755 %{SOURCE0} %{buildroot}/usr/local/bin/patchiq-agent
mkdir -p %{buildroot}/etc/systemd/system
install -m 644 patchiq-agent.service %{buildroot}/etc/systemd/system/

%post
systemctl daemon-reload
systemctl enable patchiq-agent
systemctl start patchiq-agent

%preun
systemctl stop patchiq-agent
systemctl disable patchiq-agent

%postun
systemctl daemon-reload

%files
/usr/local/bin/patchiq-agent
/etc/systemd/system/patchiq-agent.service
```

**Build RPM:**

```bash
rpmbuild -ba patchiq-agent.spec
```

### 4.3 Upload to MinIO

**Objective:** Make binaries downloadable from PatchIQ Hub.

**Upload Process:**

```bash
# Authenticate
TOKEN=$(curl -sf "http://localhost:3500/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@patchiq.io","password":"admin123"}' \
  | jq -r '.data.accessToken')

# Get agent version IDs
VERSIONS=$(curl -sf "http://localhost:3500/v1/agent-versions" \
  -H "Authorization: Bearer $TOKEN")

# Upload function
upload_binary() {
  PLATFORM=$1
  ARCH=$2
  FILE=$3

  VERSION_ID=$(echo "$VERSIONS" | jq -r \
    ".data[] | select(.platform==\"$PLATFORM\" and .architecture==\"$ARCH\") | .id")

  curl -X POST "http://localhost:3500/v1/agent-versions/$VERSION_ID/upload" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/octet-stream" \
    --data-binary "@$FILE"
}

# Upload all binaries
upload_binary "Windows" "amd64" "agent/dist/patchiq-agent-windows-amd64.exe"
upload_binary "Linux" "amd64" "agent/dist/patchiq-agent-linux-amd64"
upload_binary "Linux" "arm64" "agent/dist/patchiq-agent-linux-arm64"
upload_binary "Mac" "amd64" "agent/dist/patchiq-agent-darwin-amd64"
upload_binary "Mac" "arm64" "agent/dist/patchiq-agent-darwin-arm64"
```

**Or use Makefile:**

```bash
make agent-upload
```

### 4.4 Verify Distribution

**Objective:** Confirm downloads work from UI.

**Verification Checklist:**

- [ ] Windows agent downloads from UI
- [ ] Linux agent downloads from UI
- [ ] macOS agent downloads from UI
- [ ] All downloads are ZIP files
- [ ] ZIP contains correct binary
- [ ] Checksums match database
- [ ] File sizes match database
- [ ] Download URLs work without auth (public access)

**Test Script:**

```bash
#!/bin/bash

# Test downloads
for platform in "Windows/amd64" "Linux/amd64" "Mac/arm64"; do
  IFS='/' read -r PLAT ARCH <<< "$platform"

  echo "Testing $PLAT/$ARCH download..."

  VERSION_ID=$(curl -sf "http://localhost:3500/v1/agent-versions" | jq -r \
    ".data[] | select(.platform==\"$PLAT\" and .architecture==\"$ARCH\") | .id")

  curl -sS "http://localhost:3500/v1/agent-versions/$VERSION_ID/download" \
    -o "/tmp/agent-$PLAT-$ARCH.zip"

  if [ -f "/tmp/agent-$PLAT-$ARCH.zip" ]; then
    echo "✅ $PLAT/$ARCH download successful"
    unzip -l "/tmp/agent-$PLAT-$ARCH.zip"
  else
    echo "❌ $PLAT/$ARCH download failed"
  fi
done
```

---

## Phase 5: Production Validation

**Status:** 📋 PENDING
**Duration:** 8-12 hours

### 5.1 Fresh Install Testing

**Objective:** Verify complete install-to-operation flow on all platforms.

**Test Procedure (Per Platform):**

1. **Prepare Clean VM:**
   - Windows: Fresh Windows 10/11 VM
   - Linux: Fresh Ubuntu 22.04 VM
   - macOS: Fresh macOS 14 VM

2. **Download Installer:**
   - Open PatchIQ UI in browser
   - Navigate to agent download page
   - Click "Download [Platform] Agent"
   - Verify ZIP downloads

3. **Extract & Install:**
   - Extract ZIP file
   - Run installer (MSI/PKG/DEB)
   - Verify installation completes
   - Verify no errors in install log

4. **Verify Service:**
   - Check service is running
     - Windows: `Get-Service PatchIQAgent`
     - Linux: `systemctl status patchiq-agent`
     - macOS: `launchctl list | grep patchiq`
   - Verify auto-start enabled

5. **Agent Registration:**
   - Agent should auto-register with Hub
   - Verify agent appears in PatchIQ UI
   - Status should be "Online"
   - Hostname should match

6. **Inventory Collection:**
   - Trigger inventory collection from UI
   - Verify inventory appears in UI
   - Check hardware details
   - Check software list
   - Check network info

7. **Patch Deployment:**
   - Create patch deployment task
   - Assign to agent
   - Monitor deployment
   - Verify patch installs
   - Check for errors

8. **Software Deployment:**
   - Create software deployment task
   - Assign to agent
   - Monitor deployment
   - Verify software installs
   - Check application works

9. **Agent Self-Update:**
   - Trigger agent update from UI
   - Monitor update progress
   - Verify agent restarts
   - Verify new version active
   - Verify no data loss

10. **Clean Uninstall:**
    - Uninstall agent via installer
    - Verify service stopped
    - Verify binary removed
    - Verify no leftover files
    - Verify registry clean (Windows)

**Pass Criteria:**
- All steps complete without errors
- Agent fully functional
- Clean install and uninstall

### 5.2 Scale Testing

**Objective:** Verify agent works at scale.

**Test Setup:**

Deploy agents to:
- 10 Windows machines (mix of 10/11/Server)
- 10 Linux machines (mix of Ubuntu/RHEL/Debian)
- 10 macOS machines (mix of Intel/Apple Silicon)

**Total: 30 agents**

**Scale Test Scenarios:**

1. **Mass Deployment:**
   - Deploy same patch to all 30 agents
   - Verify all install successfully
   - Monitor Hub performance
   - Check for race conditions

2. **Concurrent Operations:**
   - 10 agents installing patches
   - 10 agents installing software
   - 10 agents submitting inventory
   - Verify no conflicts

3. **Heartbeat Load:**
   - All 30 agents heartbeating every 60s
   - Monitor Hub CPU/memory
   - Verify no heartbeats missed
   - Check database performance

4. **Inventory Flood:**
   - All 30 agents submit inventory simultaneously
   - Verify all submissions processed
   - Check deduplication working
   - Monitor MinIO storage

5. **Update Rollout:**
   - Phased update: 10 agents at a time
   - Monitor for failures
   - Verify staggered deployment
   - Check rollback if needed

**Performance Metrics:**

- Hub CPU usage: < 80%
- Hub memory usage: < 4GB
- Database connections: < 100
- MinIO throughput: > 10MB/s
- Agent response time: < 5s
- Deployment success rate: > 95%

**Pass Criteria:**
- All 30 agents operational
- No crashes or hangs
- Performance within limits
- No data loss

### 5.3 Monitoring & Alerting

**Objective:** Production monitoring setup.

**Prometheus Metrics:**

**Agent Metrics (per agent):**
- `agent_up` - Agent running (1/0)
- `agent_heartbeat_success_total` - Successful heartbeats
- `agent_heartbeat_failure_total` - Failed heartbeats
- `agent_commands_executed_total{type, status}` - Commands by type/status
- `agent_deployments_total{type, status}` - Deployments by type/status
- `agent_inventory_submission_duration_seconds` - Inventory time
- `agent_memory_bytes` - Memory usage
- `agent_cpu_percent` - CPU usage

**Hub Metrics (aggregate):**
- `hub_agents_total` - Total agents
- `hub_agents_online` - Online agents
- `hub_agents_offline` - Offline agents
- `hub_deployments_active` - Active deployments
- `hub_deployments_success_rate` - Deployment success %

**Alerting Rules:**

```yaml
groups:
  - name: patchiq_agent_alerts
    rules:
      - alert: AgentDown
        expr: agent_up == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Agent {{ $labels.agent_id }} is down"

      - alert: HeartbeatFailures
        expr: rate(agent_heartbeat_failure_total[5m]) > 0.1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High heartbeat failure rate for {{ $labels.agent_id }}"

      - alert: DeploymentFailures
        expr: rate(agent_deployments_total{status="failed"}[1h]) > 0.2
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: "High deployment failure rate for {{ $labels.agent_id }}"

      - alert: AgentMemoryHigh
        expr: agent_memory_bytes > 500000000  # 500MB
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Agent {{ $labels.agent_id }} memory usage > 500MB"
```

**Dashboard Setup:**

**Grafana Dashboard Panels:**

1. **Agent Fleet Overview:**
   - Total agents
   - Online/offline count
   - Map of agent locations

2. **Health Status:**
   - Heartbeat success rate (last 24h)
   - Average response time
   - Error rate

3. **Deployment Activity:**
   - Active deployments
   - Success rate
   - Average deployment time
   - Failure breakdown by type

4. **Resource Usage:**
   - CPU usage (per agent)
   - Memory usage (per agent)
   - Network bandwidth

5. **Top Issues:**
   - Most common errors
   - Slowest deployments
   - Agents needing attention

### 5.4 Production Checklist

**Final Pre-Launch Verification:**

**Functionality:**
- [ ] All 7 pipelines complete
- [ ] All platform tests pass
- [ ] No critical bugs
- [ ] No high-priority bugs blocking launch

**Performance:**
- [ ] Startup time < 5s on all platforms
- [ ] Memory usage < 100MB idle
- [ ] CPU usage < 5% idle
- [ ] Deployment speed acceptable

**Security:**
- [ ] All binaries signed
- [ ] Credentials encrypted at rest
- [ ] TLS for all Hub communication
- [ ] No secrets in logs
- [ ] Audit logging working

**Distribution:**
- [ ] All binaries built
- [ ] All installers created
- [ ] All uploaded to MinIO
- [ ] All downloadable from UI
- [ ] Download links working

**Documentation:**
- [ ] User installation guide
- [ ] Admin deployment guide
- [ ] Troubleshooting guide
- [ ] API documentation
- [ ] Release notes
- [ ] CHANGELOG updated

**Monitoring:**
- [ ] Prometheus metrics working
- [ ] Grafana dashboards created
- [ ] Alerts configured
- [ ] Runbooks created
- [ ] On-call rotation defined

**Support:**
- [ ] Support team trained
- [ ] Known issues documented
- [ ] Escalation path defined
- [ ] Bug reporting process

**Rollback Plan:**
- [ ] Previous version preserved
- [ ] Rollback procedure documented
- [ ] Rollback tested
- [ ] Communication plan

---

## Success Metrics

### Overall Success Criteria

**Functionality:**
- ✅ 100% of required features working on all platforms
- ✅ 0 critical bugs
- ✅ 0 high-priority bugs blocking production

**Reliability:**
- ✅ 99.9% agent uptime
- ✅ 95%+ deployment success rate
- ✅ <1% heartbeat loss

**Performance:**
- ✅ <5s agent startup time
- ✅ <100MB memory usage idle
- ✅ <5% CPU usage idle
- ✅ <5 min average deployment time

**Quality:**
- ✅ 60%+ test coverage on new code
- ✅ All E2E tests passing
- ✅ All integration tests passing

**Documentation:**
- ✅ Complete user guide
- ✅ Complete admin guide
- ✅ Complete API docs
- ✅ Complete troubleshooting guide

**Distribution:**
- ✅ All binaries available for download
- ✅ All installers working
- ✅ Clean install/uninstall

### When Can We Ship?

**Production Release Criteria:**

1. **Phase 1-5 Complete:**
   - [ ] Analysis complete
   - [ ] All pipelines implemented
   - [ ] All binaries built and distributed
   - [ ] Production validation passed

2. **Quality Gates Passed:**
   - [ ] All QA checklists complete
   - [ ] All platforms verified
   - [ ] Scale testing passed
   - [ ] Monitoring operational

3. **Documentation Complete:**
   - [ ] All guides written
   - [ ] All API docs current
   - [ ] Release notes ready

4. **Support Ready:**
   - [ ] Team trained
   - [ ] Runbooks created
   - [ ] On-call rotation live

5. **Stakeholder Sign-Off:**
   - [ ] Engineering approved
   - [ ] Product approved
   - [ ] Security approved
   - [ ] Leadership approved

**Ship Date:** TBD after Phase 1 analysis

---

## Execution Strategy

### Teammate Coordination

**Phase 1 - Analysis:**
- **1 Explore Agent:** Deep codebase analysis

**Phase 2 - Planning:**
- **1 Plan Agent per pipeline:** Detailed planning

**Phase 3 - Implementation:**
- **3-5 General-Purpose Agents:** Parallel implementation
- **1 coordinator:** Integration and oversight

**Phase 4 - Testing:**
- **1 General-Purpose Agent:** Comprehensive QA
- **Manual:** Final validation

**Phase 5 - Production:**
- **Manual:** Deployment and monitoring setup

### Communication Cadence

**Daily:**
- Progress update per active pipeline
- Blocker identification and resolution
- Risk assessment update

**Weekly:**
- Demo of completed features
- Retrospective on previous week
- Planning for upcoming week

**Bi-Weekly:**
- Architecture review
- Security review
- Stakeholder update

---

## Risk Management

### Known Risks

**Technical Risks:**

1. **Windows Platform Complexity**
   - Risk: Windows-specific bugs harder to debug
   - Mitigation: Dedicated Windows VM for testing
   - Contingency: Hire Windows expert if needed

2. **macOS Notarization Delays**
   - Risk: Apple notarization can take hours/days
   - Mitigation: Start notarization early, have backup plan
   - Contingency: Ship without notarization for internal testing

3. **Cross-Platform Parity**
   - Risk: Features work differently on each platform
   - Mitigation: Common interface, platform-specific tests
   - Contingency: Document platform differences

4. **Performance Under Load**
   - Risk: Agent or Hub degrades with 100+ agents
   - Mitigation: Load testing early, profiling
   - Contingency: Optimize hot paths, add caching

**Schedule Risks:**

1. **Underestimated Complexity**
   - Risk: Tasks take longer than estimated
   - Mitigation: 20% buffer in estimates
   - Contingency: Reduce scope, prioritize must-haves

2. **Dependency Delays**
   - Risk: Waiting for external dependencies
   - Mitigation: Identify early, work in parallel
   - Contingency: Stub out dependencies, integrate later

**Quality Risks:**

1. **Insufficient Testing**
   - Risk: Bugs slip to production
   - Mitigation: Comprehensive test plan, dedicated QA
   - Contingency: Phased rollout, quick rollback

2. **Platform-Specific Edge Cases**
   - Risk: Rare OS configurations cause failures
   - Mitigation: Test on diverse OS versions
   - Contingency: Community testing, beta program

### Rollback Strategy

**If Production Issues Occur:**

1. **Immediate:**
   - Stop agent updates
   - Assess impact (how many agents affected?)
   - Communicate to users

2. **Short-Term:**
   - Roll back to previous stable version
   - Update download links to previous binaries
   - Investigate root cause

3. **Long-Term:**
   - Fix root cause
   - Add regression test
   - Plan hotfix release

---

## Appendices

### A. File Structure Reference

```
agent/
├── cmd/
│   └── agent/
│       ├── main.go                 # Entry point
│       └── setup.go                # Setup wizard
├── internal/
│   ├── collectors/                 # Inventory collectors
│   │   ├── hardware.go
│   │   ├── software.go
│   │   ├── network.go
│   │   └── security.go
│   ├── executors/                  # Deployment executors
│   │   ├── executor.go             # Interface
│   │   ├── patch_windows.go
│   │   ├── patch_linux.go
│   │   ├── patch_darwin.go
│   │   ├── software_windows.go
│   │   ├── software_linux.go
│   │   ├── software_darwin.go
│   │   ├── script_executor.go
│   │   └── rollback.go
│   ├── backend/                    # Hub communication
│   │   └── backend.go
│   ├── server/                     # Local WebUI
│   │   └── server.go
│   ├── config/                     # Configuration
│   │   └── config.go
│   ├── models/                     # Data models
│   │   ├── execution.go
│   │   └── telemetry.go
│   ├── logger/                     # Structured logging
│   │   └── logger.go
│   ├── metrics/                    # Prometheus metrics
│   │   └── metrics.go
│   ├── storage/                    # Job persistence
│   │   └── job_store.go
│   └── crypto/                     # Token encryption
│       ├── encryption_windows.go
│       ├── encryption_linux.go
│       └── encryption_darwin.go
├── installer/                      # Platform installers
│   ├── windows/
│   │   └── patchiq-agent.wxs
│   ├── macos/
│   │   ├── scripts/
│   │   └── payload/
│   └── linux/
│       ├── deb/
│       └── rpm/
├── dist/                           # Build outputs
├── docs/                           # Documentation
└── Makefile                        # Build automation
```

### B. Technology Stack

**Languages:**
- Go 1.22+ (agent)
- TypeScript (backend/frontend)

**Frameworks:**
- Express.js (backend API)
- React 19 (frontend)
- Prisma (database ORM)

**Storage:**
- PostgreSQL (metadata)
- MinIO (binary storage)
- Redis (caching, sessions)
- SQLite (agent local storage)

**Observability:**
- Prometheus (metrics)
- Grafana (dashboards)
- Pino/Zerolog (logging)

**Infrastructure:**
- Docker (development)
- Docker Compose (orchestration)
- Nginx (reverse proxy)

**Build Tools:**
- Go toolchain
- Make
- WiX Toolset (Windows MSI)
- pkgbuild (macOS PKG)
- dpkg/rpmbuild (Linux packages)

### C. Platform Requirements

**Windows:**
- Windows 10 (21H2+)
- Windows 11
- Windows Server 2019
- Windows Server 2022

**Linux:**
- Ubuntu 22.04 LTS, 24.04 LTS
- Debian 12
- RHEL 9
- Fedora 39+
- AlmaLinux 9

**macOS:**
- macOS 13 (Ventura)
- macOS 14 (Sonoma)
- macOS 15 (Sequoia)
- Intel and Apple Silicon

**Architectures:**
- x86_64 (amd64)
- ARM64 (aarch64)

---

## Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-02-14 | 1.0.0 | Initial plan created | Claude Code |
| | | | |
| | | | |

---

## Sign-Off

**Plan Approval:**

- [ ] Engineering Lead
- [ ] Product Manager
- [ ] Security Team
- [ ] DevOps Lead

**Production Release Approval:**

- [ ] Engineering Lead
- [ ] Product Manager
- [ ] Security Team
- [ ] VP Engineering

---

**Document Status:** 🚀 ACTIVE
**Last Updated:** 2026-02-14
**Next Review:** After Phase 1 completion
