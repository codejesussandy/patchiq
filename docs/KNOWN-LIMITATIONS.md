# Known Limitations

## Version 1.0.0

**Last Updated:** 2026-02-14

This document outlines known limitations, constraints, and edge cases in PatchIQ v1.0.0. These limitations are documented for transparency and to help users set appropriate expectations.

---

## Platform Limitations

### Windows

#### Windows Store (UWP) Apps
- **Limitation:** Windows Store (UWP) applications cannot be deployed via agent
- **Reason:** UWP apps require Microsoft Store infrastructure
- **Workaround:** Use winget (Windows Package Manager) for supported apps
- **Planned:** Future support via Microsoft Store for Business API

#### Windows Update Integration
- **Limitation:** Windows Update patches require PSWindowsUpdate module or similar
- **Reason:** Native Windows Update API requires specialized handling
- **Workaround:** Pre-install PSWindowsUpdate module on agents
- **Planned:** Native Windows Update integration in v1.1

#### Interactive Installers
- **Limitation:** Installers requiring GUI interaction not supported
- **Reason:** Agent runs as background service
- **Workaround:** Use silent installation flags (/S, /silent, /quiet)
- **Planned:** No plans to support interactive installers

---

### macOS

#### Mac App Store Apps
- **Limitation:** Mac App Store apps cannot be deployed automatically
- **Reason:** Requires Apple ID and cannot be automated
- **Workaround:** Use Homebrew casks for equivalent apps where available
- **Planned:** No plans to support (Apple restriction)

#### Gatekeeper & Unsigned Apps
- **Limitation:** Unsigned apps may be blocked by Gatekeeper
- **Reason:** macOS security policy
- **Workaround:** Code sign all internal apps, or manually allow in System Preferences
- **Note:** Production agent is signed with Developer ID

#### Full Disk Access
- **Limitation:** Must be manually granted via System Preferences
- **Reason:** macOS privacy controls (cannot be automated from installer)
- **Workaround:** Document requirement, provide user instructions
- **Planned:** Prompt user during first run (notification)

#### System Integrity Protection (SIP)
- **Limitation:** Agent cannot modify SIP-protected files/folders
- **Reason:** macOS security feature (intended behavior)
- **Workaround:** None (do not disable SIP)
- **Note:** This is correct and secure behavior

---

### Linux

#### Package Manager Diversity
- **Limitation:** Different package managers across distributions
- **Reason:** Linux ecosystem diversity
- **Workaround:** Agent detects package manager automatically
- **Supported:** apt, dnf, yum, zypper, pacman, Homebrew, Snap, Flatpak
- **Note:** Some packages may be named differently across distros

#### SELinux Policy
- **Limitation:** May require custom SELinux policy on first run
- **Reason:** SELinux enforcing mode restricts new binaries
- **Workaround:** Audit SELinux denials and create policy with `audit2allow`
- **Planned:** Provide pre-built SELinux policies for common distros

#### Snap Confinement
- **Limitation:** Snap apps run in confined environment
- **Reason:** Snap security model
- **Impact:** May limit agent access to snap-installed software data
- **Workaround:** Use classic confinement flag if needed
- **Note:** Expected behavior for sandboxed apps

---

## Deployment Limitations

### Rollback Support

#### Package Manager Dependent
- **Limitation:** Rollback only supported on package managers that support it
- **Supported Rollback:**
  - Linux: apt, dnf (with version pinning)
  - macOS: Homebrew formulae (not casks)
  - Windows: Chocolatey
- **No Rollback Support:**
  - Windows: winget (no native rollback)
  - macOS: Homebrew casks
  - Manual installers (MSI, PKG, EXE, DMG)
- **Workaround:** Use hub-centric bundles with custom rollback scripts
- **Planned:** Enhanced rollback tracking and custom rollback scripts

#### State Caching
- **Limitation:** Rollback requires original package to be cached
- **Reason:** Some package managers don't retain old versions
- **Workaround:** Agent caches package metadata, but may need to re-download
- **Note:** Documented in rollback flow

---

### Concurrent Deployments

#### Per-Agent Queuing
- **Limitation:** Multiple deployments to same agent are queued
- **Reason:** Prevent package manager conflicts
- **Behavior:** Deployments execute sequentially, not in parallel
- **Performance:** Acceptable for typical use cases
- **Planned:** Optional parallel execution for independent packages (v1.2)

---

### Large Packages

#### Download Time
- **Limitation:** Very large packages (> 2 GB) may take significant time
- **Example:** Microsoft Office, Adobe Creative Cloud, large games
- **Impact:** Deployment may timeout on slow connections
- **Workaround:** Increase deployment timeout, deploy during off-hours
- **Note:** Download speed depends on network bandwidth

---

## Inventory Collection Limitations

### Detection Coverage

#### Containerized Applications
- **Limitation:** Docker containers not inventoried by default
- **Reason:** Requires Docker API access
- **Workaround:** Enable Docker collector explicitly
- **Planned:** Docker and Kubernetes inventory support (v1.1)

#### Portable/ZIP Apps
- **Limitation:** Portable apps (not installed) may not be detected
- **Reason:** Not registered with OS package manager
- **Workaround:** Applications in common locations are scanned
- **Note:** User-specific portable apps may not appear

#### Custom/Internal Software
- **Limitation:** Internal proprietary software may not be recognized
- **Workaround:** Software name/version detected if properly installed
- **Note:** Metadata depends on installer quality

---

### Collection Frequency

#### Resource Usage
- **Limitation:** Full inventory collection is resource-intensive
- **Default:** Every 24 hours
- **Impact:** CPU/memory spike during collection
- **Workaround:** Schedule during off-peak hours
- **Configurable:** Adjust collection interval as needed

---

## Network & Connectivity Limitations

### Proxy Support

#### HTTP/HTTPS Proxy
- **Limitation:** Proxy support not yet implemented in v1.0
- **Impact:** Agents behind corporate proxy cannot connect to backend
- **Workaround:** Configure firewall to allow direct HTTPS to backend
- **Planned:** Proxy support in v1.1 (HTTP_PROXY, HTTPS_PROXY env vars)

#### SOCKS Proxy
- **Limitation:** SOCKS proxy not supported
- **Planned:** Evaluate based on customer demand

---

### Offline Operation

#### Internet Connectivity Required
- **Limitation:** Agent requires internet connectivity to function
- **Reason:** Backend communication, package downloads
- **Impact:** Offline agents appear as "Offline" in dashboard
- **Behavior:** Agent queues operations until connectivity restored
- **Note:** By design (hub-centric architecture)

---

## Security Limitations

### Code Signing

#### Windows Authenticode
- **Status:** Implemented (v1.0)
- **Limitation:** Requires valid code signing certificate
- **Cost:** Code signing certificate ($300-500/year)
- **Note:** Required for production deployment

#### macOS Notarization
- **Status:** Implemented (v1.0)
- **Limitation:** Requires Apple Developer account ($99/year)
- **Requirement:** Mandatory for macOS 10.15+
- **Note:** Without notarization, Gatekeeper blocks agent

#### Linux Binary Signing
- **Status:** Not implemented (v1.0)
- **Limitation:** No standard code signing mechanism for Linux binaries
- **Workaround:** Use package repository signatures (RPM/DEB)
- **Planned:** GPG signing for standalone binaries (v1.1)

---

### Certificate Management

#### Auto-Renewal
- **Limitation:** Code signing certificates must be renewed manually
- **Frequency:** Annually
- **Impact:** Expired certificates cause Gatekeeper/SmartScreen warnings
- **Workaround:** Calendar reminder 30 days before expiration
- **Planned:** Automated renewal notifications (v1.1)

---

## Performance Limitations

### Scalability

#### Tested Scale
- **Agents:** Tested with 30 concurrent agents
- **Deployments:** Tested with 100 concurrent deployments
- **Performance:** Backend handles 30 agents with p95 response time < 500ms
- **Database:** Tested with PostgreSQL on 4 vCPUs, 8 GB RAM

#### Untested Scale
- **Agents:** Not tested with > 100 agents
- **Reason:** Requires larger test infrastructure
- **Recommendation:** Conduct internal scale testing before deploying to > 100 agents
- **Planned:** Horizontal scaling documentation (v1.1)

---

### Database

#### Connection Pool
- **Limitation:** Database connection pool size is finite
- **Default:** 100 connections
- **Impact:** Requests fail if pool exhausted
- **Workaround:** Increase pool size, optimize slow queries
- **Recommendation:** Monitor connection pool usage

---

## Feature Limitations

### Web UI

#### Real-Time Updates
- **Limitation:** Dashboard refreshes every 30-60 seconds (polling)
- **Reason:** No WebSocket implementation yet
- **Impact:** Agent status may appear stale
- **Workaround:** Manual refresh
- **Planned:** WebSocket support for real-time updates (v1.2)

#### Mobile Responsive Design
- **Limitation:** UI optimized for desktop (1920x1080)
- **Impact:** May not render well on mobile devices
- **Workaround:** Use desktop browser
- **Planned:** Mobile-responsive redesign (v2.0)

---

### Reporting

#### Custom Reports
- **Limitation:** Pre-built reports only
- **Impact:** Custom reporting requires SQL queries
- **Workaround:** Export data to CSV, analyze with external tools
- **Planned:** Custom report builder (v1.3)

---

### Multi-Tenancy

#### Single Organization
- **Limitation:** v1.0 supports single organization only
- **Impact:** Cannot separate agents by department/customer
- **Workaround:** Use tags for logical grouping
- **Planned:** Full multi-tenancy in v2.0

---

## API Limitations

### Rate Limiting

#### Default Limits
- **Registration:** 10 requests/hour per IP
- **Heartbeat:** 120 requests/hour per agent
- **Deployments:** 100 requests/hour per agent
- **Inventory:** 24 requests/day per agent

**Impact:** Exceeding limits results in 429 (Too Many Requests)
**Workaround:** Respect rate limits, implement exponential backoff
**Configurable:** Limits can be adjusted in backend config

---

### API Versioning

#### Breaking Changes
- **Limitation:** No API versioning in v1.0
- **Impact:** Future updates may introduce breaking changes
- **Mitigation:** Semantic versioning will be followed
- **Planned:** API versioning (/v1/, /v2/) in v1.1

---

## Documentation Limitations

### Language Support

#### English Only
- **Limitation:** Documentation only available in English
- **Impact:** Non-English users may struggle
- **Planned:** Translations based on demand

---

### Video Tutorials

#### Not Available
- **Limitation:** No video tutorials yet
- **Impact:** Users prefer video over text
- **Planned:** Video tutorials for common tasks (v1.1)

---

## Third-Party Dependencies

### Package Managers

#### Homebrew (macOS)
- **Limitation:** Requires Homebrew to be pre-installed
- **Impact:** Agent cannot install Homebrew automatically
- **Workaround:** Install Homebrew before deploying agent
- **Note:** Documented in installation guide

#### Chocolatey (Windows)
- **Limitation:** Requires Chocolatey to be pre-installed
- **Impact:** Agent cannot install Chocolatey automatically
- **Workaround:** Install Chocolatey before using Chocolatey packages
- **Note:** Winget is preferred (native to Windows 10/11)

---

## Summary

This document will be updated with each release. Limitations marked as "Planned" indicate features scheduled for future versions.

For questions or workarounds not listed here, please contact support@patchiq.io.

---

**Document Status:** Published
**Version:** 1.0.0
**Last Updated:** 2026-02-14
