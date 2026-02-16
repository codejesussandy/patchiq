# Release Notes: PatchIQ v1.0.0

**Release Date:** 2026-02-20 (Planned)
**Release Type:** Major Release (Production Ready)

---

## Overview

PatchIQ v1.0.0 is the first production-ready release of the PatchIQ patch and vulnerability management platform. This release represents the culmination of 6 development pipelines, comprehensive testing, and security audits.

**Highlights:**
- ✓ Cross-platform agent (Windows, macOS, Linux)
- ✓ Hub-centric deployment model
- ✓ Automated inventory collection
- ✓ Secure self-update mechanism
- ✓ Production-grade installers (MSI, PKG, DEB, RPM)
- ✓ Code-signed binaries
- ✓ Comprehensive testing and security audits

---

## What's New

### Agent Features

#### Platform Support
- **Windows:**
  - Windows 10 (21H2+)
  - Windows 11 (all versions)
  - Windows Server 2019
  - Windows Server 2022
  - Architecture: amd64

- **macOS:**
  - macOS 12 Monterey (Intel + Apple Silicon)
  - macOS 13 Ventura (Intel + Apple Silicon)
  - macOS 14 Sonoma (Intel + Apple Silicon)
  - Architectures: x86_64, arm64

- **Linux:**
  - Ubuntu 20.04 LTS, 22.04 LTS, 24.04 LTS
  - Debian 11, 12
  - RHEL 8, 9
  - Fedora 39, 40
  - Rocky Linux 8, 9 (community supported)
  - Architecture: x86_64

#### Deployment Engine
- **Package Managers Supported:**
  - Windows: winget, Chocolatey
  - macOS: Homebrew (formulae + casks)
  - Linux: apt, dnf, yum, zypper, pacman, Snap, Flatpak

- **Hub-Centric Model:**
  - Download packages from MinIO hub
  - Execute bundled scripts (install/update/rollback/uninstall)
  - Support for MSI, PKG, DEB, RPM, EXE, DMG, ZIP, TAR.GZ

- **Rollback Support:**
  - Supported on apt, dnf, Homebrew formulae, Chocolatey
  - State caching for rollback operations
  - Automatic rollback on installation failure

#### Inventory Collection
- **Hardware:** CPU, memory, disk, network interfaces
- **Software:** Installed packages (200-1000+ per system)
- **Operating System:** Version, build, architecture
- **Network:** IP addresses, MAC addresses, DNS, gateways
- **Security:** Windows Update status, FileVault, SIP, SELinux
- **Peripherals:** USB devices, displays, printers

#### Self-Update Mechanism
- **Secure Updates:**
  - Manifest signature verification (RSA)
  - Binary checksum validation (SHA-256)
  - TLS-only downloads (HTTPS enforced)
  - Automatic rollback on failure

- **Phased Rollout:**
  - 10%, 50%, 100% rollout stages
  - Canary deployments
  - Automatic pause on failure threshold

- **Zero Downtime:**
  - Service restart only (no reboot required)
  - Heartbeat maintained during update
  - Graceful failover to previous version

#### Security
- **Transport Security:**
  - TLS 1.2+ enforced
  - Certificate validation (no skip verify option)
  - Strong cipher suites only (AES-256, ChaCha20)

- **Credential Storage:**
  - Windows: DPAPI encryption
  - macOS: Keychain or AES-256 encrypted file
  - Linux: AES-256-GCM encrypted file (600 permissions)

- **Code Signing:**
  - Windows: Authenticode signed binaries
  - macOS: Developer ID signed and notarized
  - Linux: Package repository signatures (RPM/DEB)

---

### Backend Features

#### API
- **RESTful API:** Comprehensive endpoint coverage
- **Authentication:** JWT tokens with 24-hour expiration
- **Authorization:** Agent isolation, role-based access
- **Rate Limiting:** Configurable per-endpoint limits
- **API Documentation:** Scalar API docs (OpenAPI 3.0)

#### Database
- **PostgreSQL:** Primary database with Prisma ORM
- **Redis:** Session caching and rate limiting
- **Connection Pooling:** Optimized for scale (100 connections default)

#### Storage
- **MinIO:** S3-compatible object storage for packages
- **Hub Model:** Centralized package distribution
- **Bandwidth:** Supports concurrent downloads (tested with 30 agents)

#### Monitoring
- **Structured Logging:** Pino logger with JSON output
- **Metrics:** Prometheus-compatible metrics
- **Health Checks:** `/api/health` endpoint
- **Request Tracing:** Correlation IDs for log chaining

---

### Frontend Features

#### Dashboard
- **Agent Management:** View, filter, search agents
- **Real-Time Status:** Online/offline agent tracking
- **Inventory Viewer:** Hardware, software, network data
- **Deployment Tracker:** Monitor deployment progress

#### Deployment Management
- **Software Deployments:** Deploy to single or multiple agents
- **Patch Management:** Schedule OS updates
- **Bundle Deployments:** Deploy custom packages with scripts
- **Deployment History:** Audit trail of all deployments

#### User Interface
- **Modern UI:** React 19 + Ant Design 6
- **Responsive:** Optimized for desktop (1920x1080)
- **Dark Mode:** (Not yet available, planned for v1.1)

---

## System Requirements

### Agent Requirements

**Minimum:**
- **CPU:** 1 core
- **RAM:** 512 MB
- **Disk:** 1 GB free space
- **Network:** Internet connectivity (HTTPS)

**Recommended:**
- **CPU:** 2 cores
- **RAM:** 2 GB
- **Disk:** 5 GB free space
- **Network:** 10 Mbps+ bandwidth

### Backend Requirements

**Production (30-50 agents):**
- **CPU:** 4 vCPUs
- **RAM:** 8 GB
- **Disk:** 50 GB SSD
- **Database:** PostgreSQL 14+ (separate server recommended)
- **Redis:** 2 GB RAM
- **MinIO:** 100 GB+ (depends on package repository size)

**Large Deployment (100+ agents):**
- Scale horizontally (multiple backend instances)
- Database read replicas
- Load balancer (nginx, HAProxy, or cloud LB)

---

## Installation

### Quick Start

**Agent Installation:**
```bash
# Windows
msiexec /i patchiq-agent-1.0.0-windows-amd64.msi /qn SERVERURL="https://your-backend/api"

# macOS
sudo installer -pkg patchiq-agent-1.0.0-macos-arm64.pkg -target /

# Linux (Debian/Ubuntu)
sudo dpkg -i patchiq-agent-1.0.0-linux-amd64.deb

# Linux (RHEL/Fedora)
sudo rpm -ivh patchiq-agent-1.0.0-linux-amd64.rpm
```

**Backend Installation:**
```bash
# Docker Compose (recommended)
git clone https://github.com/patchiq/patchiq
cd patchiq
cp .env.example .env
# Edit .env with your configuration
make dev
```

For detailed installation instructions, see [INSTALLATION.md](./INSTALLATION.md).

---

## Upgrade Instructions

**From:** N/A (first release)
**To:** v1.0.0

This is the first production release. No upgrade path needed.

**Future Upgrades:**
- Agent: Self-update via backend (automatic)
- Backend: Docker Compose or manual deployment
- Database: Prisma migrations (run before backend update)

---

## Breaking Changes

**From:** N/A (first release)

**Future:** API versioning will be introduced in v1.1 to prevent breaking changes.

---

## Deprecations

None (first release).

---

## Known Issues

See [KNOWN-LIMITATIONS.md](./KNOWN-LIMITATIONS.md) for comprehensive list.

**Critical:**
- None

**High:**
- Proxy support not yet implemented (planned for v1.1)
- Real-time dashboard updates use polling (not WebSockets)

**Medium:**
- Rollback not supported on all package managers (see limitations doc)
- Multi-tenancy not available (single organization only)

**Low:**
- API lacks versioning (planned for v1.1)
- Mobile UI not optimized (desktop only)

---

## Security Updates

**CVE Fixed:** None (first release)

**Security Enhancements:**
- TLS 1.2+ enforcement
- Code signing for all binaries
- Credential encryption at rest
- Input validation on all API endpoints
- SQL injection protection (Prisma ORM)
- Command injection protection (input sanitization)

**Security Audit:** Completed 2026-02-14 (see audit reports)

---

## Performance

**Tested Scale:**
- **Agents:** 30 concurrent agents
- **Deployments:** 100 concurrent deployments
- **Success Rate:** 95%+ deployment success
- **Response Time:** Backend API p95 < 500ms
- **Database:** Query p95 < 200ms

**Resource Usage (Agent):**
- **CPU Idle:** < 1%
- **CPU Active:** < 25% (during deployment)
- **Memory Idle:** < 50 MB
- **Memory Active:** < 200 MB (during deployment)

---

## Testing

**Test Coverage:**
- **Unit Tests:** 270+ tests (backend + agent)
- **Integration Tests:** 60+ tests
- **E2E Tests:** 20+ scenarios
- **Platform Tests:** All 21 platforms tested
- **Security Tests:** SQL injection, XSS, command injection, path traversal
- **Load Tests:** 100 concurrent deployments
- **Scale Tests:** 30 concurrent agents

**Test Results:** All tests passing (100% pass rate)

---

## Documentation

**Available Documentation:**
- Installation Guide (`INSTALLATION.md`)
- Troubleshooting Guide (`TROUBLESHOOTING-INSTALL.md`)
- Uninstallation Guide (`UNINSTALLATION.md`)
- Known Limitations (`KNOWN-LIMITATIONS.md`)
- Production Deployment Guide (`PRODUCTION-DEPLOYMENT-GUIDE.md`)
- Certificate Management (`CERTIFICATE-MANAGEMENT.md`)
- Code Signing (`CODE-SIGNING.md`)
- Update Manifest (`UPDATE-MANIFEST.md`)
- Phased Rollout (`PHASED-ROLLOUT.md`)

**API Documentation:**
- Scalar API Docs: http://localhost:3000/api-docs (when backend running)
- OpenAPI 3.0 spec available

---

## Contributors

PatchIQ v1.0.0 was developed by the PatchIQ engineering team with assistance from Claude Code (Anthropic).

**Special Thanks:**
- All beta testers and early adopters
- Open source community for dependencies
- Anthropic for Claude Code support

---

## Support

**Documentation:** https://docs.patchiq.io
**Community:** https://community.patchiq.io
**Issues:** https://github.com/patchiq/patchiq/issues
**Email:** support@patchiq.io

---

## Roadmap (v1.1 and Beyond)

**Planned for v1.1 (Q2 2026):**
- Proxy support (HTTP/HTTPS)
- API versioning (/v1/, /v2/)
- Enhanced reporting
- Docker/Kubernetes inventory
- Linux binary GPG signing

**Planned for v1.2 (Q3 2026):**
- WebSocket support for real-time updates
- Parallel deployments per agent
- Custom report builder
- Enhanced dashboard widgets

**Planned for v2.0 (Q4 2026):**
- Multi-tenancy
- Mobile-responsive UI
- Advanced automation workflows
- Custom plugin system

---

## License

**License:** Commercial (see LICENSE file)
**Copyright:** © 2026 PatchIQ Inc. All rights reserved.

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for detailed version history.

---

**Release Status:** Production Ready
**Release Date:** 2026-02-20
**Version:** 1.0.0
