# Backend API Fields Reference

## Authentication

### POST /v1/auth/login
**Request:** `email`, `password`
**Response:** `user`, `accessToken`, `refreshToken`

### POST /v1/auth/forgot-password
**Request:** `email`

### POST /v1/auth/reset-password
**Request:** `token`, `password`, `confirmPassword`

### POST /v1/auth/onboarding
**Request:** `name`, `contactNumber`, `password`, `confirmPassword`

---

## User

| Field | Description |
|-------|-------------|
| id | Unique identifier |
| email | User email address |
| username | Optional username |
| firstName | First name |
| lastName | Last name |
| role | admin/user/manager |
| avatar | Profile picture URL |
| phone | Contact number |
| gender | Male/Female/Others |
| timezone | User timezone |
| branch | Branch location ID |
| orgUnit | Organization unit |
| dashboard | Default dashboard |
| status | Active/Invite Sent/New Account/In Active |
| lastLogin | Last login timestamp |
| isOnboarded | Onboarding completion flag |
| organizationId | Organization reference |
| departmentId | Department reference |
| locationId | Location reference |

---

## Dashboard

### GET /v1/dashboard
| Field | Description |
|-------|-------------|
| stats.totalEndpoints | Total endpoint count |
| stats.dataLossEndpoints | Endpoints with data loss risk |
| stats.windowsEndpoints | Windows endpoint count |
| stats.linuxEndpoints | Linux endpoint count |
| stats.macEndpoints | Mac endpoint count |
| stats.totalAgents | Total agent count |
| stats.totalVulnerabilities | Total vulnerability count |
| stats.unmitigatedVulnerabilities | Unmitigated count |
| stats.criticalVulnerabilities | Critical severity count |
| stats.highVulnerabilities | High severity count |
| stats.mediumVulnerabilities | Medium severity count |
| stats.lowVulnerabilities | Low severity count |
| vulnerabilityClassification[] | Sankey chart data: source, target, value |
| endpointDistribution[] | Pie chart: name, value, color |
| vulnerabilityByPublishedDate[] | Trend: date, critical, high, medium, low |
| vulnerabilityByDiscoveredDate[] | Trend: date, critical, high, medium, low |
| vulnerabilityBySeverityTable[] | Table: severity, >90days, 60-90days, 30-60days, <30days |
| topVulnerabilities.byCVSS[] | CVE list: cve, score, affectedEndpoints, severity |
| topVulnerabilities.byEPSS[] | CVE list: cve, score, affectedEndpoints, severity |
| patchCompliance | compliant, nonCompliant, pending counts |
| recentActivity | patchesDeployed, patchesFailed, endpointsScanned, lastScanTime |
| expiredCertificates[] | Chart: name, value |
| alertCountBySeverity[] | Chart: severity, count |
| alertSeverityCountByPlatform[] | Table: platform, critical, high, medium, low |
| dayWiseVulnerabilityDetection[] | Chart: day, count |

---

## Assets

### GET /v1/assets
| Field | Description |
|-------|-------------|
| id | Unique identifier |
| name | Asset name |
| assetId | Display ID |
| operationalStatus | Connected/Disconnected |
| status | In Use/Available/Under Maintenance/Retired |
| assetType | Computer/Server/Laptop/etc. |
| assetTag | Asset tag identifier |
| serialNumber | Hardware serial |
| branchLocation | Location name |
| manufacturer | Device manufacturer |
| model | Device model |
| purchaseDate | Purchase date |
| warrantyExpiry | Warranty expiration |
| osType | Windows 11 Pro/MacOS/Linux/etc. |
| osVersion | OS version string |
| osBuild | OS build number |
| architecture | x64/ARM/etc. |
| ipAddress | IPv4 address |
| macAddress | MAC address |
| hostname | Network hostname |
| categoryId | Category reference |
| subCategoryId | SubCategory reference |
| tagIds[] | Array of tag IDs |

### Asset.owner
| Field | Description |
|-------|-------------|
| name | Owner name |
| email | Owner email |
| phone | Owner phone |

### Asset.processor
| Field | Description |
|-------|-------------|
| name | CPU name |
| cores | Core count |
| speed | Clock speed |

### Asset.ram
| Field | Description |
|-------|-------------|
| size | RAM size (e.g., "16GB") |
| type | RAM type (DDR4/DDR5) |

### Asset.storage
| Field | Description |
|-------|-------------|
| type | HDD/SSD/NVMe |
| size | Storage size |

### Asset.performance
| Field | Description |
|-------|-------------|
| systemUptime | Uptime string |
| memoryUtilization | Memory % |
| cpuUtilization | CPU % |
| diskUtilization | Disk % |

### Asset.location
| Field | Description |
|-------|-------------|
| base.address | Base location address |
| base.latitude | Latitude |
| base.longitude | Longitude |
| installed.address | Installed location |
| installed.latitude | Latitude |
| installed.longitude | Longitude |

### Asset.procurement
| Field | Description |
|-------|-------------|
| amcCost | AMC cost |
| amcExpiryDate | AMC expiry |
| amcVendor | AMC vendor |
| endOfLife | EOL date |
| expiryDate | General expiry |
| warrantyExpiryDate | Warranty expiry |

### Asset.cost
| Field | Description |
|-------|-------------|
| age | Asset age |
| cost | Purchase cost |
| currency | Currency code |
| currentCost | Depreciated value |
| depreciationType | Depreciation method |
| invoiceNumber | Invoice reference |
| purchaseDate | Purchase date |
| salvageValue | Salvage value |

### Asset.agent (linked agent)
| Field | Description |
|-------|-------------|
| agentId | Agent ID |
| agentName | Agent name |
| agentVersion | Agent version |
| agentStatus | Connected/Disconnected/Pending/Error |
| lastHeartbeat | Last heartbeat timestamp |
| registeredAt | Registration timestamp |

### Asset.patchSummary
| Field | Description |
|-------|-------------|
| total | Total patches |
| installed | Installed count |
| missing | Missing count |
| failed | Failed count |
| pending | Pending count |
| criticalMissing | Critical missing count |
| securityMissing | Security missing count |
| lastScanDate | Last scan timestamp |
| compliancePercent | Compliance percentage |

---

## Asset Hardware Tab

### GET /v1/assets/:id/hardware
| Field | Description |
|-------|-------------|
| bios.name | BIOS name |
| bios.biosVersion | BIOS version |
| bios.manufacturer | BIOS manufacturer |
| bios.secureBootState | Secure boot status |
| bios.serialNumber | BIOS serial |
| processor.name | CPU name |
| processor.logicalProcessors | Logical processor count |
| processor.numberOfCores | Physical core count |
| processor.processorSpeed | Clock speed |
| baseBoard.name | Motherboard name |
| baseBoard.serialNumber | MB serial |
| storage[].name | Drive name |
| storage[].drive | Drive letter |
| storage[].capacity | Total capacity |
| storage[].used | Used space |
| storage[].format | File system |
| storage[].type | Drive type |
| memory[].slot | Memory slot |
| memory[].capacity | Module capacity |
| memory[].memoryType | DDR type |
| networkAdapters[].name | Adapter name |
| networkAdapters[].macAddress | MAC address |
| networkAdapters[].ipAddressV4 | IPv4 |
| battery.health | Battery health |
| battery.cycleCount | Charge cycles |
| battery.chargeLevel | Current charge % |

---

## Asset Software Tab

### GET /v1/assets/:id/software
| Field | Description |
|-------|-------------|
| os.name | OS name |
| os.version | OS version |
| licenseDetails.buildNumber | Build number |
| licenseDetails.licenseStatus | License status |
| licenseDetails.productKey | Product key |
| applications[].name | App name |
| applications[].vendor | App vendor |
| applications[].version | App version |
| applications[].patchStatus | Available/Not Available |
| services[].name | Service name |
| services[].state | Running/Stopped |
| services[].status | OK/Error/Warning |

---

## Asset Security Tab

### GET /v1/assets/:id/security
| Field | Description |
|-------|-------------|
| collectedAt | Data collection timestamp |
| encryption.driveEncryptionEnabled | Encryption enabled flag |
| encryption.encryptionType | BitLocker/FileVault/LUKS/None |
| encryption.drives[].mountPoint | Drive mount point |
| encryption.drives[].encrypted | Is encrypted |
| encryption.drives[].status | Encryption status |
| firewall.enabled | Firewall enabled |
| firewall.productName | Firewall product |
| firewall.profiles[].name | Profile name |
| firewall.profiles[].enabled | Profile enabled |
| antivirus.installed | AV installed |
| antivirus.products[].name | AV name |
| antivirus.products[].realTimeProtection | RTP enabled |
| antivirus.products[].definitionDate | Definition date |
| userAccounts.localAdminCount | Local admin count |
| userAccounts.guestAccountEnabled | Guest enabled |
| patchStatus.pendingUpdates | Pending update count |
| patchStatus.criticalUpdates | Critical update count |
| secureBootEnabled | Secure boot flag |
| uacEnabled | UAC enabled |

---

## Asset Network Tab

### GET /v1/assets/:id/network
| Field | Description |
|-------|-------------|
| identity.hostname | Hostname |
| identity.fqdn | FQDN |
| identity.domainName | Domain |
| identity.isDomainJoined | Domain joined flag |
| adapters[].name | Adapter name |
| adapters[].type | Ethernet/WiFi/Virtual |
| adapters[].macAddress | MAC address |
| adapters[].status | Up/Down |
| adapters[].speedMbps | Speed in Mbps |
| adapters[].ipConfiguration.ipv4Address | IPv4 |
| adapters[].ipConfiguration.ipv4Gateway | Gateway |
| adapters[].ipConfiguration.dhcpEnabled | DHCP flag |
| adapters[].ipConfiguration.dnsServers[] | DNS servers |
| wifiConnection.ssid | WiFi SSID |
| wifiConnection.signalStrength | Signal % |
| wifiConnection.securityType | WPA2/WPA3/etc. |
| publicIpAddress | Public IP |
| vpnConnected | VPN status |

---

## Asset Peripherals Tab

### GET /v1/assets/:id/peripherals
| Field | Description |
|-------|-------------|
| monitors[].name | Monitor name |
| monitors[].manufacturer | Manufacturer |
| monitors[].resolution | Current resolution |
| monitors[].connectionType | HDMI/DisplayPort/etc. |
| monitors[].isPrimary | Primary display flag |
| usbDevices[].name | Device name |
| usbDevices[].deviceClass | HID/MassStorage/etc. |
| usbDevices[].manufacturer | Manufacturer |
| printers[].name | Printer name |
| printers[].status | Ready/Offline/Error |
| printers[].isDefault | Default printer |
| audioDevices[].name | Audio device name |
| audioDevices[].type | Output/Input/Both |
| bluetoothDevices[].name | BT device name |
| bluetoothDevices[].connected | Connection status |
| webcams[].name | Webcam name |

---

## Asset Telemetry Tab

### GET /v1/assets/:id/telemetry
| Field | Description |
|-------|-------------|
| timestamp | Telemetry timestamp |
| cpu.usagePercent | CPU usage % |
| cpu.perCoreUsage[] | Per-core usage |
| cpu.temperature | CPU temp |
| memory.usagePercent | Memory usage % |
| memory.usedBytes | Used memory |
| memory.availableBytes | Available memory |
| disk.drives[].mountPoint | Mount point |
| disk.drives[].usagePercent | Disk usage % |
| network.totalBytesSentPerSec | Upload rate |
| network.totalBytesReceivedPerSec | Download rate |
| processes.topByCpu[] | Top CPU processes |
| processes.topByMemory[] | Top memory processes |
| errors.applicationCrashCount24h | Crash count |
| systemUptime | System uptime seconds |
| pendingReboot | Reboot pending flag |

---

## Categories

### GET /v1/categories
| Field | Description |
|-------|-------------|
| id | Unique identifier |
| name | Category name |
| description | Category description |
| color | Display color |
| icon | Icon name |
| assetCount | Assets in category |
| owner | Category owner |
| status | Active/Inactive |

### SubCategory
| Field | Description |
|-------|-------------|
| id | Unique identifier |
| categoryId | Parent category ID |
| name | SubCategory name |
| description | Description |
| assetCount | Asset count |

---

## Tags

### GET /v1/tags
| Field | Description |
|-------|-------------|
| id | Unique identifier |
| name | Tag name |
| description | Tag description |
| color | Display color |
| assetCount | Tagged asset count |
| createdAt | Creation timestamp |

---

## Patches

### GET /v1/patches
| Field | Description |
|-------|-------------|
| id | Unique identifier |
| software | Software/patch name |
| patchId | Display ID (ZPH-W-xxxx) |
| endpoints | Affected endpoint count |
| os | Windows/MacOS/Ubuntu/Linux |
| severity | CRITICAL/High/Medium/Low/UNSPECIFIED |
| platform | Target platform |
| description | Patch description |
| category | Security Updates/Application Updates |
| bulletinId | Security bulletin ID |
| kbNumber | KB article number |
| releaseDate | Release date |
| rebootRequired | Reboot flag |
| supportUninstallation | Can uninstall |
| architecture | 64 BIT/32 BIT/Universal |
| referenceUrl | Reference URL |
| languagesSupported[] | Supported languages |
| tags[] | Patch tags |
| approvalStatus | Approved/Pending/Rejected |
| testStatus | Tested/Not Tested |
| cveNumbers[] | Related CVEs |
| status | Draft/Published |
| downloadStatus | Downloaded/Pending/None |
| size | File size |
| source | Scanning/Manual |
| supersededBy[] | Superseding patches |
| supersedes[] | Superseded patches |

### GET /v1/patches/:id/affected-softwares
| Field | Description |
|-------|-------------|
| softwareName | Software name |
| version | Version string |
| vendor | Vendor name |
| installedOn | Endpoint count |
| platform | Platform |

### GET /v1/patches/:id/endpoints
| Field | Description |
|-------|-------------|
| id | Endpoint ID |
| name | Endpoint name |
| os | Operating system |
| status | Online/Offline |
| lastSeen | Last seen time |

### GET /v1/patches/:id/vulnerabilities
| Field | Description |
|-------|-------------|
| cveNumber | CVE ID |
| severity | Severity level |
| description | CVE description |
| publishedDate | Publish date |

---

## Deployments

### GET /v1/deployments
| Field | Description |
|-------|-------------|
| id | Unique identifier |
| name | Deployment name |
| deploymentId | Display ID |
| type | INSTALL/ROLLBACK |
| stage | INSTALLED/COMPLETED/IN_PROGRESS/FAILED |
| pending | Pending count |
| succeeded | Success count |
| failed | Failed count |
| createdBy | Creator username |
| createdOn | Creation date |

---

## Zero Touch Config

### GET /v1/zero-touch-configs
| Field | Description |
|-------|-------------|
| id | Unique identifier |
| name | Config name |
| description | Description |
| applicationType | ALL/INCLUDE/EXCLUDE |
| applications[] | Application list |
| scope | ALL_COMPUTERS/SCOPE/SPECIFIC_GROUPS |
| computers[] | Computer list |
| groups[] | Group list |
| autoDeploymentRules.severity[] | Severity filters |
| autoDeploymentRules.approvalRequired | Approval flag |
| autoDeploymentRules.schedule | Schedule string |
| status | Active/Inactive |
| createdBy | Creator |
| createdOn | Creation date |

---

## Agents

### GET /v1/agents
| Field | Description |
|-------|-------------|
| id | Unique identifier |
| machineId | Machine identifier |
| name | Agent/machine name |
| status | Connected/Disconnected/Pending/Error |
| os | Windows/MacOS/Linux |
| osVersion | OS version |
| agentVersion | Agent version |
| lastHeartbeat | Last heartbeat ISO timestamp |
| lastHeartbeatRelative | "2 minutes ago" |
| registeredAt | Registration timestamp |
| ipAddress | IP address |
| hostname | Hostname |
| serialNumber | Hardware serial |
| assetId | Linked asset ID |
| tags[] | Agent tags |
| groups[] | Group memberships: {id, name} |
| capabilities[] | Agent capabilities |

### GET /v1/agents/downloads
| Field | Description |
|-------|-------------|
| os | Windows 11/MacOS/Linux |
| version | Agent version |
| releaseDate | Release date |
| downloadUrl | Download URL |

### GET /v1/agents/versions
| Field | Description |
|-------|-------------|
| platform | Linux/Windows/Mac |
| architecture | x64/ARM/etc. |
| version | Version string |
| lastUpdatedAt | Last update timestamp |

---

## Discovery

### IP Ranges (GET /v1/discovery/ip-ranges)
| Field | Description |
|-------|-------------|
| id | Unique identifier |
| name | Range name |
| range | IP range string |
| description | Description |
| lastScanned | Last scan timestamp |
| deviceCount | Discovered device count |

### Device Credentials (GET /v1/discovery/credentials)
| Field | Description |
|-------|-------------|
| id | Unique identifier |
| name | Credential name |
| type | SSH/Windows/SNMP |
| username | Username |
| description | Description |
| lastUsed | Last used timestamp |

---

## Vulnerabilities

### GET /v1/vulnerabilities
| Field | Description |
|-------|-------------|
| id | Unique identifier |
| cve | CVE number |
| severity | CRITICAL/HIGH/MEDIUM/LOW |
| epss | EPSS score (0-100) |
| exploitable | Has known exploit |
| title | Vulnerability title |
| description | Description |
| riskScore | Risk score (0-100) |
| cvss3BaseScore | CVSS v3 score |
| cvss2BaseScore | CVSS v2 score |
| endpoints | Affected endpoint count |
| affectedSoftwares | Affected software count |
| published | Published date |
| isZeroDay | Zero-day flag |

### GET /v1/vulnerabilities/zero-day
Same fields as above, filtered for zero-day

### GET /v1/vulnerabilities/exceptions
| Field | Description |
|-------|-------------|
| id | Exception ID |
| cve | CVE number |
| exceptionType | Exception type |
| reasonForExclusion | Reason text |
| createdBy | Creator |
| scope | Scope (all/specific) |
| endpoints[] | Affected endpoints |
| source | zeroDay/vulnerabilities |
| createdAt | Creation timestamp |

### GET /v1/vulnerabilities/stats
| Field | Description |
|-------|-------------|
| total | Total count |
| critical | Critical count |
| high | High count |
| medium | Medium count |
| low | Low count |
| zeroDayCount | Zero-day count |
| exceptionsCount | Exception count |

---

## Jobs

### Patch Jobs (GET /v1/jobs/patch)
| Field | Description |
|-------|-------------|
| id | Unique identifier |
| policyId | Policy display ID |
| name | Job name |
| description | Description |
| type | SCHEDULE/INSTANT |
| configType | INSTALL/ROLLBACK |
| scope | Global/Group/Endpoint |
| endpoints[] | Target endpoints |
| patches[] | Patch IDs |
| deploymentPolicy | Policy reference |
| retryCount | Retry count |
| batchSize | Batch size |
| notifyTo[] | Notification recipients |
| createdBy | Creator |
| createdOn | Creation date |

### Vulnerability Jobs (GET /v1/jobs/vulnerability)
| Field | Description |
|-------|-------------|
| id | Unique identifier |
| jobId | Display ID |
| name | Job name |
| scope | Global/Group/Endpoint |
| scanType | instant/scheduled |
| scheduleDate | Schedule date |
| scheduleTime | Schedule time |
| recurrence | once/daily/weekly/monthly |
| status | RUNNING/COMPLETED/FAILED/SCHEDULED |
| lastRun | Last run timestamp |
| nextRun | Next run timestamp |
| createdBy | Creator |
| createdOn | Creation date |

### DB Sync (GET /v1/jobs/vulnerability/db-sync)
| Field | Description |
|-------|-------------|
| scanJobInterval | Interval number |
| scanJobUnit | Hour/Day/Week |
| databaseSyncTime | Sync time (HH:mm:ss) |
| lastSync | Last sync timestamp |
| totalCVE | Total CVE count |

### Software Catalog (GET /v1/jobs/software/catalog)
| Field | Description |
|-------|-------------|
| id | Unique identifier |
| deploymentId | Display ID |
| applicationName | App name |
| description | Description |
| tags[] | Tags |
| os | Windows/Mac/Linux |
| version | Version |
| applicationLocationType | Local Directory/Network Share/URL |
| installationCommand | Install command |
| uninstallationCommand | Uninstall command |
| selfService | Self-service flag |
| architecture | x64/x86/ARM64 |
| applicationType | MSI/EXE/APPLICATION/ZIP |
| applicationFileUrl | File URL |
| createdBy | Creator |
| createdOn | Creation date |

### Software Bundles (GET /v1/jobs/software/bundles)
| Field | Description |
|-------|-------------|
| id | Unique identifier |
| bundleId | Display ID |
| bundleName | Bundle name |
| os | Target OS |
| description | Description |
| applications[] | Application IDs |
| createdBy | Creator |
| createdOn | Creation date |

### Software Deployments (GET /v1/jobs/software/deployed)
| Field | Description |
|-------|-------------|
| id | Unique identifier |
| deploymentId | Display ID |
| deploymentName | Name |
| deploymentType | install/uninstall/upgrade |
| selectionType | application/bundle |
| selectedItems[] | Selected IDs |
| scope | all/windows/mac/linux |
| deploymentPolicy | Policy reference |
| retryCount | Retry count |
| notifyTo | admin/user |
| stage | COMPLETED/IN_PROGRESS/INSTALLED/FAILED |
| pending | Pending count |
| succeeded | Success count |
| failed | Failed count |
| createdBy | Creator |
| createdOn | Creation date |

### Config Catalog (GET /v1/jobs/config/catalog)
| Field | Description |
|-------|-------------|
| id | Unique identifier |
| configurationId | Display ID |
| name | Config name |
| os | Target OS |
| description | Description |
| configurationType | command/policy/script |
| architecture | x64/x86/ARM64 |
| isRemediation | Remediation flag |
| commandType | powershell/cmd/bash/sh |
| command | Command string |
| createdBy | Creator |
| createdOn | Creation date |

### Config Bundles (GET /v1/jobs/config/bundles)
Same structure as Software Bundles with `configurations[]`

### Config Deployments (GET /v1/jobs/config/deployed)
Same structure as Software Deployments

### Deployment Policies (GET /v1/deployment-policies)
| Field | Description |
|-------|-------------|
| id | Unique identifier |
| policyId | Display ID |
| name | Policy name |
| description | Description |
| type | SCHEDULE/INSTANT |
| supportedModule | All/Patch/Update/Security |
| relatedType | No Relation/Critical/Important/Optional |
| createdBy | Creator |
| createdOn | Creation date |

---

## Reports

### GET /v1/reports
| Field | Description |
|-------|-------------|
| id | Unique identifier |
| name | Report name |
| type | vulnerability/patch/compliance/asset/endpoint/hardware |
| status | completed/scheduled/failed |
| createdDate | Creation date |
| completedDate | Completion date |
| description | Description |
| createdBy | Creator |
| downloadUrl | Download URL |
| format | pdf/csv/json |
| downloadFormats[] | Available formats |

---

## Settings

### Branches (GET /v1/settings/branches)
| Field | Description |
|-------|-------------|
| id | Unique identifier |
| name | Branch name |
| status | Default/Active/Inactive |
| users | User count |
| assets | Asset count |
| address | Street address |
| city | City |
| state | State |
| country | Country |
| postalCode | Postal code |
| phone | Phone number |
| email | Email |
| manager | Manager name |
| isDefault | Default flag |

### Roles (GET /v1/settings/roles)
| Field | Description |
|-------|-------------|
| id | Unique identifier |
| name | Role name |
| description | Description |
| users | User count |
| branch | Branch reference |
| permissions[] | {module, actions[]} |
| isSystem | System role flag |
| capabilities[] | Role capabilities |

### Policies (GET /v1/settings/policies)
| Field | Description |
|-------|-------------|
| id | Unique identifier |
| name | Policy name |
| type | Policy type |
| orgUnit | Org unit |
| users | Affected user count |
| description | Description |
| configuration | Policy config object |
| affectedRoles[] | Role IDs |
| status | Active/Inactive/Draft |
| createdBy | Creator |
| createdAt | Creation timestamp |

### Mail Server (GET /v1/settings/mail-server)
| Field | Description |
|-------|-------------|
| smtpHost | SMTP host |
| smtpPort | SMTP port |
| protocol | NONE/SSL/TLS |
| email | Sender email |
| enableAuthentication | Auth flag |
| username | SMTP username |
| password | SMTP password |

### Proxy Server (GET /v1/settings/proxy-server)
| Field | Description |
|-------|-------------|
| enabled | Proxy enabled |
| host | Proxy host |
| port | Proxy port |
| protocol | HTTP/HTTPS/SOCKS5 |
| username | Proxy username |
| noProxyList[] | Bypass list |

### LDAP Server (GET /v1/settings/ldap)
| Field | Description |
|-------|-------------|
| id | Unique identifier |
| name | Config name |
| host | LDAP host |
| port | LDAP port |
| fqdn | FQDN |
| baseDN | Base DN |
| username | Bind username |
| groupBase | Group base DN |
| protocol | LDAP/LDAPS |
| enabled | Enabled flag |
| enableAutoSync | Auto-sync flag |
| autoSyncInterval | Sync interval |

### Vulnerability Preference (GET /v1/settings/vulnerability-preference)
| Field | Description |
|-------|-------------|
| lastSyncAt | Last sync timestamp |
| scanJobInterval | Scan interval |
| scanJobUnit | Hour/Day/Week |
| databaseSyncTime | Sync time (HH:mm:ss) |
| totalCveCount | Total CVE count |

### Agent Configuration (GET /v1/settings/agent-configuration)
| Field | Description |
|-------|-------------|
| allowedBandwidth | Bandwidth limit |
| agentRefreshCycle | Agent refresh (seconds) |
| systemActionRefreshCycle | System action refresh |
| patchScanningRefreshCycle | Patch scan refresh |
| networkRefreshCycle | Network refresh |
| certificateRefreshCycle | Cert refresh |
| systemResourcesRefreshCycle | Resources refresh |

### Agent Approvals (GET /v1/settings/agent-approvals)
| Field | Description |
|-------|-------------|
| id | Unique identifier |
| uuid | Agent UUID |
| hostName | Hostname |
| ipAddresses[] | IP addresses |
| createdOn | Request date |
| performedBy | Approved by |
| status | Pending/Approved/Rejected |

### Enroll Secrets (GET /v1/settings/enroll-secrets)
| Field | Description |
|-------|-------------|
| id | Unique identifier |
| name | Secret name |
| secret | Secret value |
| organization | Organization |
| department | Department |
| createdOn | Creation date |

### Patch Preferences (GET /v1/settings/patch-preferences)
| Field | Description |
|-------|-------------|
| enablePatching | Patching enabled |
| corridorOnlyApprovedPatch | Approved only flag |
| patchSyncForOS[] | OS list for sync |
| patchApprovalPolicy | PreApproved/ManuallyApproves/TestAndApprove |
| enableThirdPartyPatching | 3rd party flag |
| patchApprovalScheduleTime | Approval schedule |
| scheduleTime | Sync schedule |
| zeroTouchDeploymentScheduleTime | Zero-touch schedule |
| lastSyncedAt | Last sync timestamp |

### Distribution Servers (GET /v1/settings/distribution-servers)
| Field | Description |
|-------|-------------|
| id | Unique identifier |
| name | Server name |
| description | Description |
| location | Location |
| url | Server URL |
| version | Server version |
| createdOn | Creation date |

### Computer Groups (GET /v1/settings/computer-groups)
| Field | Description |
|-------|-------------|
| id | Unique identifier |
| name | Group name |
| description | Description |
| endpoints[] | Endpoint IDs |
| endpointCount | Endpoint count |
| createdBy | Creator |
| createdAt | Creation timestamp |

### Red Hat Agent Nomination (GET /v1/settings/redhat-agent-nomination)
| Field | Description |
|-------|-------------|
| id | Unique identifier |
| name | Name |
| status | pending/approved/rejected |
| endpoint | Endpoint count |
| scheduledTime | Schedule time |
| lastSyncTime | Last sync timestamp |
| updatedBy | Updated by |
| updatedAt | Update timestamp |

---

## Notifications

### GET /v1/notifications
| Field | Description |
|-------|-------------|
| id | Unique identifier |
| title | Notification title |
| message | Message body |
| type | info/warning/error/success |
| read | Read status |
| createdAt | Creation timestamp |
