# PatchIQ Tender Gap Analysis

## GAIL Patch Management Solution (3.B) - 206 Clauses

This document analyzes PatchIQ's current feature coverage against the GAIL tender requirements for a comprehensive Patch Management Solution.

---

## Executive Summary

| Category | Total Requirements | Implemented | Missing |
|----------|-------------------|-------------|---------|
| Patch Management | 31 | ~20 | ~11 |
| Agents | 14 | ~8 | ~6 |
| Asset/Inventory | 23 | ~20 | ~3 |
| Vulnerability | 7 | ~3 | ~4 |
| Browser Security | 9 | 0 | 9 |
| Application Control | 7 | 0 | 7 |
| Device Control | 8 | 0 | 8 |
| Endpoint Analytics | 5 | 0 | 5 |
| Remote Control | 15 | 0 | 15 |
| Security Policy | 14 | ~4 | ~10 |
| License/Usage | 17 | ~5 | ~12 |
| Reporting | 15 | ~10 | ~5 |
| Infrastructure | 28 | ~15 | ~13 |

**Estimated Coverage: ~55-60% of tender requirements**

---

## Not Implemented (Major Modules)

### Browser Security (Clauses 117-125)

| Clause | Requirement | Priority |
|--------|-------------|----------|
| 117 | Proxy environment support for all browser features | HIGH |
| 118 | Browser extension/plugin installation and usage control | HIGH |
| 119 | Website access control (allow/deny specific sites) | HIGH |
| 120 | File download restrictions from unauthorized websites | HIGH |
| 121 | Legacy browser auto-redirection for legacy web apps | MEDIUM |
| 122 | Java version assignment per web application | MEDIUM |
| 123 | Bookmark management, default browser, browser policy configuration | MEDIUM |
| 124 | Kiosk/restricted browser mode (approved sites only) | MEDIUM |
| 125 | Browser security compliance status discovery | HIGH |

### Application Control (Clauses 126-132)

| Clause | Requirement | Priority |
|--------|-------------|----------|
| 126 | Application allowlisting based on prerequisites | CRITICAL |
| 127 | Application blocklisting for non-business/malicious executables | CRITICAL |
| 128 | Privilege elevation attack prevention (application-specific access) | CRITICAL |
| 129 | Flexible application control policy enforcement levels | HIGH |
| 130 | Temporary application/privileged access with auto-revoke | HIGH |
| 131 | Global policies for child process execution control | HIGH |
| 132 | User application access request and approval workflow | MEDIUM |

### Device Control (Clauses 133-140)

| Clause | Requirement | Priority |
|--------|-------------|----------|
| 133 | Port control and removable device management | CRITICAL |
| 134 | Role-based access (read-only, block copy) for devices | CRITICAL |
| 135 | File transfer limits (max size, file type restrictions) | HIGH |
| 136 | Trusted device list management | HIGH |
| 137 | Temporary device access creation | MEDIUM |
| 138 | File mirroring/shadow copies on data transfer | HIGH |
| 139 | Real-time file action monitoring with detailed logging | HIGH |
| 140 | Data Loss Prevention - copy original files on USB transfer | CRITICAL |

### Endpoint Analytics (Clauses 141-145)

| Clause | Requirement | Priority |
|--------|-------------|----------|
| 141 | Device and application performance metrics collection | HIGH |
| 142 | Predefined root cause analysis capabilities | HIGH |
| 143 | Freestyle workflows for automated issue remediation | MEDIUM |
| 144 | Employee experience scoring based on metrics | MEDIUM |
| 145 | Custom data collection for business-specific metrics | LOW |

### Remote Control (Clauses 146-160)

| Clause | Requirement | Priority |
|--------|-------------|----------|
| 146 | Full desktop remote control of Windows desktops/servers | CRITICAL |
| 147 | Wake-on-LAN to remotely power on devices | HIGH |
| 148 | Wake-on-LAN across different network subnets | HIGH |
| 149 | Remote process kill/stop on endpoint | HIGH |
| 150 | Remote Windows system tools (processes, services, software) | HIGH |
| 151 | Bulk announcements to users/computers | MEDIUM |
| 152 | Security features with pre-defined policy and authorization | CRITICAL |
| 153 | 256-bit AES encryption for remote access | CRITICAL |
| 154a | Full control via client-server and web | CRITICAL |
| 154b | Monitor-only mode | HIGH |
| 154c | Keyboard/mouse locking of remote PC | MEDIUM |
| 154d | Interactive chat with session logging | MEDIUM |
| 154e | File transfer support | HIGH |
| 155-156 | Policy-based authorization with centrally defined rules | CRITICAL |
| 157 | Role-based remote control (Control, Monitor, Reboot, File Transfer) | HIGH |
| 158 | User prompt to relinquish control, regain control anytime | HIGH |
| 159 | Target lists/groups for restricted administrator access | HIGH |
| 160a | Web browser interface for remote control | HIGH |
| 160b | Central logging (controller ID, host, policies, events, chat) | HIGH |
| 160c | Collaboration and escalation for problem resolution | MEDIUM |
| 160d | AD/LDAP authentication and data sync | HIGH |
| 160e | Full data stream encryption | CRITICAL |
| 160f | Auto session logoff on inactivity | MEDIUM |
| 160g | Guidance tools (drawing, highlighting on remote screen) | LOW |
| 160h | Audit trail for sensitive data access compliance | HIGH |
| 160i | Session handover between help desk agents | MEDIUM |
| 160j | Multi-agent collaboration for complex problems | MEDIUM |

### BitLocker/Encryption Management (Clauses 170-174)

| Clause | Requirement | Priority |
|--------|-------------|----------|
| 170 | Automated BitLocker scanning and encryption assessment | HIGH |
| 171 | TPM availability and status scanning | HIGH |
| 172 | Flexible drive encryption (OS drive, used space, full disk) | HIGH |
| 173 | Recovery key management with AD backup and auto-renewal | CRITICAL |
| 174 | Boot password protection implementation | HIGH |

---

## Partially Implemented (Gaps Identified)

### Patch Management Gaps

| Clause | Missing Feature | Current Status |
|--------|-----------------|----------------|
| 8 | Zero-day workaround rapid deployment across enterprise | Zero-day tracking exists, no workaround deployment |
| 10 | Checksum/integrity verification for downloaded content | Not implemented |
| 16 | Pre-download payload caching before scheduled window | Not implemented |
| 50 | Corrupt patch detection (vulnerable files replacement) | Not implemented |
| 59 | Action validity period with auto-deactivation | Not implemented |
| 64 | Spread deployment over time for bandwidth reduction | Not implemented |
| 65 | Customizable pop-up message before patch installation | Not implemented |
| 66 | User postponement of patch deployment | Not implemented |
| 68 | User postponement of computer restart | Not implemented |
| 69 | Auto re-deploy on failed installation | Not implemented |
| 70 | Auto re-deploy if user uninstalls patch | Not implemented |
| 79 | EOL Windows OS identification among managed devices | Not implemented |
| 80 | Out-of-window deployment support | Not implemented |
| 81 | Patch rollback identification, monitoring, and reporting | Basic rollback exists, no monitoring |

### Agent Management Gaps

| Clause | Missing Feature | Current Status |
|--------|-----------------|----------------|
| 14 | Native bandwidth throttling (up/downstream, static/dynamic) | Not implemented |
| 15 | Content caching at remote distribution points | Not implemented |
| 16 | Pre-download payload before scheduled action time | Not implemented |
| 18 | Offline policy enforcement (disconnected devices) | Not implemented |
| 19 | Agent quiet periods configuration | Not implemented |
| 21 | Remote agent deployment utility (AD, NT Domains, Local Admin) | Not implemented |
| 22a | Agent deployment via AD Group Policies | Not implemented |
| 22b | Agent deployment via login scripts | Not implemented |
| 22c | Email installation instructions for remote users | Not implemented |
| 23 | Gold image inclusion procedures documentation | Not documented |
| 37 | Dynamic failover to nearest distribution point | Not implemented |
| 38 | Hide agent from Add/Remove Programs | Not implemented |

### Vulnerability Management Gaps

| Clause | Missing Feature | Current Status |
|--------|-----------------|----------------|
| 111 | CIS benchmark auditing and compliance | Not implemented |
| 113 | Web server flaw detection (SSL expiry, web root access) | Not implemented |
| 114 | Unsafe/unauthorized/unsupported software analysis & uninstall | Partial - no uninstall |
| 115 | Antivirus/EDR status reporting (absent, inactive, outdated) | Not implemented |
| 116 | Port monitoring with running processes | Not implemented |

### Security Policy Management Gaps (Clauses 161-169)

| Clause | Missing Feature | Current Status |
|--------|-----------------|----------------|
| 161 | Identify and uninstall specific applications | Not implemented |
| 162 | Remote service start/stop without user knowledge | Not implemented |
| 163 | Remote machine shutdown/restart | Partial |
| 164 | Certificate distribution to endpoints | Not implemented |
| 165 | File/folder/registry permission management | Not implemented |
| 166 | Windows Firewall custom rule deployment | Not implemented |
| 167 | Script deployment for custom security requirements | Not implemented |
| 168a | Windows desktop appearance and settings control | Not implemented |
| 168b | Custom screensaver and wallpaper deployment | Not implemented |
| 168c | Internet Explorer restrictions | Not implemented |
| 168d | Network settings control | Not implemented |
| 168e | Control Panel access restrictions | Not implemented |
| 168f | Task Manager access restrictions | Not implemented |
| 168g | Windows Start menu control and restrictions | Not implemented |
| 169 | 3rd party bot removal tool deployment (Cyber Swachhta Kendra) | Not implemented |

### Software License Management Gaps (Clauses 175-191)

| Clause | Missing Feature | Current Status |
|--------|-----------------|----------------|
| 175 | Installed application tracking per agent | Implemented |
| 176 | Standalone executable tracking (non-installed apps) | Not implemented |
| 177a-d | Publisher, title, version, computer count | Implemented |
| 177e | Total runs count | Not implemented |
| 177f | Total usage time | Not implemented |
| 177g | Average runs | Not implemented |
| 177h | Last used time | Not implemented |
| 181 | Software ID Catalog with standard publishers/vendors | Not implemented |
| 182 | Custom software title entry in catalog | Not implemented |
| 183 | Custom classification of standard applications | Not implemented |
| 185 | License contracts (cost, count, dates, entitlements) | Partial |
| 186 | Custom contract fields (PO Number, Vendor, Asset Number) | Not implemented |
| 187 | Custom field types (selection list, checkbox, radio, text) | Not implemented |
| 188 | License compliance reports from contracts | Not implemented |
| 190 | Windows OS license compliance reports | Not implemented |
| 191 | Software usage metering reports | Not implemented |

### Reporting Gaps (Clauses 192-206)

| Clause | Missing Feature | Current Status |
|--------|-----------------|----------------|
| 195a | Vulnerabilities detected by month | Partial |
| 195c | Top 10 most common vulnerabilities | Implemented |
| 196 | Graphic reports (pie, bar, line charts) | Partial - dashboard only |
| 205 | Rendered status visualization (colors by status) | Not implemented |
| 206 | Hierarchy-based display (AD path, IP subnet) | Not implemented |

---

## Infrastructure Gaps

| Clause | Missing Feature | Current Status |
|--------|-----------------|----------------|
| 2 | On-premises single agent certification (no cloud) | Not certified |
| 3 | VPN and internet-connected user support | Not documented |
| 4 | Non-domain/non-AD computer support | Not documented |
| 5 | Windows 11 Pro as distribution server at remote sites | Not implemented |
| 6 | Low-speed connection optimization | Not implemented |
| 13 | Hub and Spoke site support (2Mbps+ links) | Not implemented |
| 17 | Configurable ports documentation | Not documented |
| 26 | Native encryption without 3rd party certificates | Not documented |
| 27 | Failover capability without additional software | Not implemented |
| 28 | Air-gap network support | Not implemented |

---

## Implementation Priority Matrix

### Phase 1 - Critical Security Features

1. **Application Control** - Allowlisting, blocklisting, privilege control
2. **Device Control** - USB/removable device management, DLP
3. **Remote Control** - Full remote desktop with security features

### Phase 2 - Enterprise Management Features

1. **Browser Security** - Extension control, website filtering
2. **BitLocker Management** - Encryption assessment and management
3. **Bandwidth Throttling** - Network optimization for distributed sites

### Phase 3 - Advanced Analytics & Compliance

1. **Endpoint Analytics** - Performance metrics, experience scoring
2. **CIS Benchmark Compliance** - Security configuration auditing
3. **Software Usage Metering** - License compliance and usage tracking

### Phase 4 - Infrastructure Enhancements

1. **Distribution Point Caching** - Pre-download and offline support
2. **Air-gap Network Support** - Isolated network deployment
3. **Hub and Spoke Architecture** - Multi-site optimization

---

## Recommended Next Steps

1. **Prioritize Security Modules** - Application Control, Device Control, and Remote Control are critical for enterprise security compliance

2. **Document Infrastructure Capabilities** - Many infrastructure features may exist but need formal documentation for tender compliance

3. **Implement CIS Benchmarking** - Required for security compliance auditing

4. **Add Usage Metering** - Essential for license compliance reporting

5. **Develop Browser Security Module** - Increasingly important for web-based threat protection

---

## Appendix: Tender Clause Reference

- Clauses 1-28: Infrastructure & Architecture
- Clauses 29-42: Agent Management
- Clauses 43-50: Patch Detection
- Clauses 51-81: Patch Deployment & Rollback
- Clauses 82-87: Asset Discovery
- Clauses 88-104: Hardware/Software Inventory
- Clauses 105-109: Software Distribution
- Clauses 110-116: Vulnerability Management
- Clauses 117-125: Browser Security
- Clauses 126-132: Application Control
- Clauses 133-140: Device Control
- Clauses 141-145: Endpoint Analytics
- Clauses 146-160: Remote Control
- Clauses 161-174: Security Policy Management
- Clauses 175-191: Software Usage & License Management
- Clauses 192-206: Reporting Requirements
