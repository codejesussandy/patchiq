# Backend Implementation Gaps Analysis

This document identifies gaps between the frontend implementation and backend-debt documentation. All items listed need to be added or clarified in the backend-debt documentation.

---

## 1. Authentication (AUTH-IMPLEMENTATION.md)

### Missing Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/auth/refresh` | POST | Token refresh - rotates accessToken/refreshToken |

### Inconsistencies

- **Endpoint naming**: Docs say `/v1/auth/complete-onboarding` but frontend uses `/v1/user/onboarding`
- Recommend standardizing to `/v1/auth/complete-onboarding`

### Missing Fields in User Model

```typescript
interface User {
  // Add these fields
  isOnboarded: boolean;        // Track if user completed onboarding
  contactNumber?: string;      // Phone/contact number
}
```

### Missing Business Logic

1. **Token Refresh Flow**
```gherkin
Scenario: Refresh expired access token
  Given I have a valid refresh token
  When I POST to /v1/auth/refresh with:
    { "refreshToken": "valid-refresh-token" }
  Then the response should contain:
    - New accessToken (15 min expiry)
    - New refreshToken (7 day expiry, rotated)
  And the old refresh token should be invalidated
```

2. **Session Management**
   - Check for existing active sessions before login
   - Option to terminate other sessions

---

## 2. Assets (ASSETS-IMPLEMENTATION.md)

### Missing Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/assets/:id/health` | GET | Asset health status with metrics |
| `/v1/assets/:id/vulnerabilities` | GET | Vulnerabilities affecting this asset |
| `/v1/assets/:id/events` | GET | Asset event history/timeline |
| `/v1/assets/:id/remediations` | GET | Remediation history for asset |
| `/v1/assets/:id/audit` | GET | Audit log for this asset |
| `/v1/assets/export` | GET | Export assets to CSV |

### Missing Fields in Asset Model

```typescript
interface Asset {
  // Add these fields
  agentVersion?: string;       // Agent software version
  loggedInUser?: string;       // Currently logged in user on device
  lifecycleInfo?: {
    purchaseDate?: string;
    warrantyExpiry?: string;
    purchasePrice?: number;
    vendor?: string;
    assetTag?: string;
    depreciationValue?: number;
  };
}
```

### Missing Business Logic

1. **Asset Health Score Calculation**
```typescript
// Algorithm needed:
healthScore = (
  (patchCompliance * 0.3) +
  (vulnerabilityScore * 0.3) +
  (agentConnectivity * 0.2) +
  (lastScanRecency * 0.2)
) * 100;
```

2. **Patch Compliance Per Asset**
```gherkin
Scenario: Calculate asset patch compliance
  Given asset has 100 applicable patches
  And 85 patches are installed
  Then compliance should be 85%
  And missing patches should be categorized by severity
```

---

## 3. Discovery (DISCOVERY-IMPLEMENTATION.md)

### Missing Endpoints - IP Discovery

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/discovery/ip-ranges` | GET | List configured IP ranges |
| `/v1/discovery/ip-ranges` | POST | Add new IP range for scanning |
| `/v1/discovery/ip-ranges/:id` | PUT | Update IP range |
| `/v1/discovery/ip-ranges/:id` | DELETE | Delete IP range |
| `/v1/discovery/scan` | POST | Trigger network scan |
| `/v1/discovery/scan/:id` | GET | Get scan status |
| `/v1/discovery/scan/:id/results` | GET | Get scan results |

### Missing Endpoints - Device Credentials

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/discovery/credentials` | GET | List saved credentials |
| `/v1/discovery/credentials` | POST | Create credential (encrypted) |
| `/v1/discovery/credentials/:id` | PUT | Update credential |
| `/v1/discovery/credentials/:id` | DELETE | Delete credential |
| `/v1/discovery/credentials/:id/test` | POST | Test credential against device |

### Data Models Needed

```typescript
interface IPRange {
  id: string;
  name: string;
  startIP: string;
  endIP: string;
  subnet?: string;
  credentialId?: string;
  scanSchedule?: {
    type: 'once' | 'daily' | 'weekly';
    time?: string;
    dayOfWeek?: number;
  };
  lastScan?: string;
  discoveredDevices: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

interface DeviceCredential {
  id: string;
  name: string;
  type: 'SSH' | 'WMI' | 'SNMP' | 'WinRM';
  username?: string;
  // password stored encrypted, never returned in GET
  domain?: string;
  snmpCommunity?: string;
  snmpVersion?: 'v2c' | 'v3';
  port?: number;
  createdBy: string;
  createdAt: string;
}
```

### Business Logic Needed

1. **Credential Encryption** - Store credentials encrypted at rest using AES-256
2. **Network Scan Logic** - ICMP ping sweep, port scanning, device type detection
3. **Auto-Discovery** - Automatically create assets from discovered devices

---

## 4. Jobs (JOBS-IMPLEMENTATION.md) - MAJOR GAPS

The current JOBS-IMPLEMENTATION.md needs significant expansion. Add the following:

### 4.1 Software Jobs

#### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/jobs/software/catalog` | GET | List software catalog items |
| `/v1/jobs/software/catalog` | POST | Add software to catalog |
| `/v1/jobs/software/catalog/:id` | GET | Get software details |
| `/v1/jobs/software/catalog/:id` | PUT | Update software entry |
| `/v1/jobs/software/catalog/:id` | DELETE | Delete from catalog |
| `/v1/jobs/software/bundles` | GET | List software bundles |
| `/v1/jobs/software/bundles` | POST | Create bundle |
| `/v1/jobs/software/bundles/:id` | GET | Get bundle details |
| `/v1/jobs/software/bundles/:id` | PUT | Update bundle |
| `/v1/jobs/software/bundles/:id` | DELETE | Delete bundle |
| `/v1/jobs/software/deployed` | GET | List software deployments |
| `/v1/jobs/software/deployed` | POST | Create deployment |
| `/v1/jobs/software/deployed/:id` | GET | Get deployment status |
| `/v1/jobs/software/deployed/:id` | DELETE | Cancel/delete deployment |
| `/v1/jobs/software/deployed/:id/tasks` | GET | Get deployment tasks per endpoint |

#### Data Models

```typescript
interface SoftwareCatalogItem {
  id: string;
  deploymentId: string;           // e.g., "SWP-017"
  applicationName: string;
  description: string;
  tags?: string[];
  os: 'Windows' | 'Mac' | 'Linux';
  version: string;
  applicationLocationType: 'Local Directory' | 'Network Share' | 'URL';
  installationCommand?: string;
  uninstallationCommand?: string;
  upgradeCommand?: string;
  iconUrl?: string;
  selfService: boolean;
  architecture: 'x64' | 'x86' | 'ARM64';
  applicationType: 'MSI' | 'EXE' | 'APPLICATION' | 'ZIP';
  applicationFileUrl?: string;
  createdBy: string;
  createdOn: string;
}

interface SoftwareBundle {
  id: string;
  bundleId: string;               // e.g., "BND-001"
  bundleName: string;
  os: 'Windows' | 'Mac' | 'Linux';
  description: string;
  applications: string[];         // Array of software catalog IDs
  createdBy: string;
  createdOn: string;
}

interface SoftwareDeployment {
  id: string;
  deploymentId: string;           // e.g., "ADR-007"
  deploymentName: string;
  description: string;
  deploymentType: 'install' | 'uninstall' | 'upgrade';
  selectionType: 'application' | 'bundle';
  selectedItems: string[];
  scope: 'all' | 'windows' | 'mac' | 'linux';
  endpoints?: string[];
  deploymentPolicy: string;
  retryCount: number;
  notifyTo: 'admin' | 'user';
  stage: 'COMPLETED' | 'IN_PROGRESS' | 'INSTALLED' | 'FAILED';
  pending: number;
  succeeded: number;
  failed: number;
  createdBy: string;
  createdOn: string;
}

interface DeploymentTask {
  id: number;
  deploymentId: string;
  endpoint: {
    name: string;
    os: 'Windows' | 'MacOS' | 'Ubuntu' | 'Linux';
    status: string;
  };
  name: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'IN_PROGRESS';
  createdBy: string;
  lastUpdated: string;
  createdOn: string;
}
```

### 4.2 Configuration Jobs

#### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/jobs/config/catalog` | GET | List config catalog |
| `/v1/jobs/config/catalog` | POST | Add configuration |
| `/v1/jobs/config/catalog/:id` | GET | Get config details |
| `/v1/jobs/config/catalog/:id` | PUT | Update configuration |
| `/v1/jobs/config/catalog/:id` | DELETE | Delete configuration |
| `/v1/jobs/config/bundles` | GET | List config bundles |
| `/v1/jobs/config/bundles` | POST | Create bundle |
| `/v1/jobs/config/bundles/:id` | PUT | Update bundle |
| `/v1/jobs/config/bundles/:id` | DELETE | Delete bundle |
| `/v1/jobs/config/deployed` | GET | List config deployments |
| `/v1/jobs/config/deployed` | POST | Create deployment |
| `/v1/jobs/config/deployed/:id/tasks` | GET | Get deployment tasks |
| `/v1/jobs/config/deployed/:id` | DELETE | Delete deployment |

#### Data Models

```typescript
interface ConfigCatalogItem {
  id: string;
  configurationId: string;        // e.g., "CFG-001"
  name: string;
  os: 'Windows' | 'Mac' | 'Linux';
  description: string;
  tags?: string[];
  configurationType: 'command' | 'policy' | 'script';
  architecture: 'x64' | 'x86' | 'ARM64';
  isRemediation: boolean;
  commandType: 'powershell' | 'cmd' | 'bash' | 'sh';
  command: string;
  createdBy: string;
  createdOn: string;
}

interface ConfigBundle {
  id: string;
  bundleId: string;
  bundleName: string;
  os: 'Windows' | 'Mac' | 'Linux';
  description: string;
  configurations: string[];
  createdBy: string;
  createdOn: string;
}

interface ConfigDeployment {
  id: string;
  deploymentId: string;
  deploymentName: string;
  description: string;
  selectionType: 'configuration' | 'bundle';
  selectedItems: string[];
  scope: 'all' | 'windows' | 'mac' | 'linux';
  endpoints?: string[];
  deploymentPolicy: string;
  retryCount: number;
  notifyTo: 'admin' | 'user';
  stage: 'COMPLETED' | 'IN_PROGRESS' | 'INSTALLED' | 'FAILED';
  pending: number;
  succeeded: number;
  failed: number;
  createdBy: string;
  createdOn: string;
}
```

### 4.3 Patch Jobs

#### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/jobs/patch` | GET | List patch jobs |
| `/v1/jobs/patch` | POST | Create patch job |
| `/v1/jobs/patch/:id` | GET | Get patch job details |
| `/v1/jobs/patch/:id` | DELETE | Delete patch job |

#### Data Model

```typescript
interface PatchJob {
  id: string;
  policyId: string;
  name: string;
  description: string;
  type: 'SCHEDULE' | 'INSTANT';
  configType: 'INSTALL' | 'ROLLBACK';
  scope: 'Global' | 'Group' | 'Endpoint';
  endpoints?: string[];
  patches: string[];
  deploymentPolicy: string;
  retryCount: number;
  batchSize?: number;
  notifyTo?: string[];
  createdBy: string;
  createdOn: string;
}
```

### 4.4 Vulnerability Jobs

#### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/jobs/vulnerability` | GET | List vulnerability scan jobs |
| `/v1/jobs/vulnerability` | POST | Create vulnerability scan job |
| `/v1/jobs/vulnerability/:id` | GET | Get scan job details |
| `/v1/jobs/vulnerability/:id` | DELETE | Delete scan job |
| `/v1/jobs/vulnerability/db-sync` | GET | Get CVE database sync config |
| `/v1/jobs/vulnerability/db-sync` | PUT | Update sync config |
| `/v1/jobs/vulnerability/db-sync/now` | POST | Trigger immediate sync |

#### Data Model

```typescript
interface VulnerabilityJob {
  id: string;
  jobId: string;
  name: string;
  description: string;
  scope: 'Global' | 'Group' | 'Endpoint';
  endpoints?: string[];
  scanType: 'instant' | 'scheduled';
  scheduleDate?: string;
  scheduleTime?: string;
  recurrence?: 'once' | 'daily' | 'weekly' | 'monthly';
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SCHEDULED';
  scheduledTime?: string;
  lastRun?: string;
  nextRun?: string;
  createdBy: string;
  createdOn: string;
}

interface VulnerabilityDBSync {
  scanJobInterval: number;
  scanJobUnit: 'Hour' | 'Day' | 'Week';
  databaseSyncTime: string;
  lastSync?: string;
  totalCVE: number;
}
```

---

## 5. Patches (PATCHES-IMPLEMENTATION.md)

### Missing Endpoints - Test & Approve Workflow

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/patches/test-approve` | GET | List patches pending test/approval |
| `/v1/patches/:id/test` | POST | Mark patch as tested (pass/fail) |
| `/v1/patches/:id/approve` | POST | Approve patch for deployment |
| `/v1/patches/:id/reject` | POST | Reject patch with reason |

### Missing Endpoints - Zero Touch Deployment

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/patches/zero-touch` | GET | Get zero touch deployment config |
| `/v1/patches/zero-touch` | PUT | Update zero touch config |
| `/v1/patches/zero-touch/deploy` | POST | Trigger zero touch deployment |

### Missing Endpoints - Deployment

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/patches/deployed` | GET | Deployment history |
| `/v1/patches/deployed/:id` | GET | Deployment details with task status |

### Additional Fields for Patch Model

```typescript
interface Patch {
  // Add these fields for test/approve workflow
  testStatus?: 'pending' | 'passed' | 'failed';
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  testedBy?: string;
  testedAt?: string;
  testNotes?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
}
```

### TDD Scenarios Needed

```gherkin
Scenario: Test a patch
  Given a patch "KB123456" exists with testStatus="pending"
  When I POST to /v1/patches/KB123456/test with:
    { "status": "passed", "notes": "Tested on 5 machines, no issues" }
  Then the response status should be 200
  And the patch testStatus should be "passed"
  And testedBy should be current user
  And testedAt should be current timestamp
  And an audit log entry should be created

Scenario: Approve a tested patch
  Given a patch "KB123456" exists with testStatus="passed"
  When I POST to /v1/patches/KB123456/approve
  Then the response status should be 200
  And the patch approvalStatus should be "approved"
  And the patch should be available for deployment

Scenario: Reject a patch with reason
  Given a patch "KB123456" exists with testStatus="failed"
  When I POST to /v1/patches/KB123456/reject with:
    { "reason": "Causes system instability on Windows Server" }
  Then the response status should be 200
  And the patch approvalStatus should be "rejected"
  And the patch should NOT be available for deployment
```

### Zero Touch Deployment Logic

```typescript
interface ZeroTouchConfig {
  enabled: boolean;
  scheduleTime: string;           // e.g., "14:00:00"
  targetGroups: string[];
  severityFilter: ('Critical' | 'Important' | 'Moderate' | 'Low')[];
  autoReboot: boolean;
  rebootDelay: number;            // minutes
  excludedPatches: string[];
  maintenanceWindow?: {
    startTime: string;
    endTime: string;
    daysOfWeek: number[];
  };
}
```

---

## 6. Vulnerability (VULNERABILITY-IMPLEMENTATION.md)

### Missing Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/vulnerabilities/network` | GET | Network vulnerabilities |
| `/v1/vulnerabilities/endpoints` | GET | Endpoint vulnerabilities with stats |
| `/v1/vulnerabilities/types` | GET | Vulnerability type counts |
| `/v1/vulnerabilities/stats` | GET | Statistics with age breakdown |

### Response Format for Stats Endpoint

```typescript
interface VulnerabilityStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  zeroDayCount: number;
  exceptionsCount: number;
  publishedStats: {
    range: string;          // e.g., "> 90 days", "60-90 days"
    critical: number;
    high: number;
    medium: number;
    low: number;
  }[];
  discoveredStats: {
    range: string;
    critical: number;
    high: number;
    medium: number;
    low: number;
  }[];
}
```

### Missing Query Parameters

For `/v1/vulnerabilities` and `/v1/vulnerabilities/zero-day`:
- `severity` - filter by severity
- `search` - search in CVE, title, description
- `exploitable` - filter by exploitability
- `page` / `limit` - pagination

---

## 7. Settings (SETTINGS-EXTENDED-IMPLEMENTATION.md)

### Missing Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/settings/ldap-configs/:id/test` | POST | Test LDAP connection |
| `/v1/settings/platform-license/validate` | POST | Validate license key |
| `/v1/settings/audit/export` | GET | Export audit logs to CSV |

### Missing Business Logic Documentation

#### 1. LDAP Authentication Flow

```gherkin
Scenario: Authenticate user via LDAP
  Given LDAP config exists with server "ldap.company.com"
  When user logs in with username "jsmith" and password
  Then system should:
    1. Bind to LDAP server using service account
    2. Search for user DN using baseDN and filter
    3. Attempt bind with user DN and password
    4. If successful, fetch user attributes (email, groups)
    5. Map LDAP groups to local roles
    6. Create/update local user record
    7. Issue JWT tokens
```

#### 2. License Validation Algorithm

```typescript
interface LicenseValidation {
  valid: boolean;
  licenseTo?: string;
  expiresOn?: string;
  numberOfEndpoints?: number;
  errorMessage?: string;
}

// Validation steps:
// 1. Decode license key (base64)
// 2. Verify digital signature
// 3. Check expiration date
// 4. Verify product code matches
// 5. Return license details or error
```

#### 3. Session Timeout Handling

```gherkin
Scenario: Session timeout enforcement
  Given server settings have sessionTimeoutMinutes=30
  And sessionIdleTimeoutMinutes=15
  When user's token was issued 31 minutes ago
  Then the token should be rejected with 401
  And user should be redirected to login

Scenario: Idle timeout enforcement
  Given user's last activity was 16 minutes ago
  When user makes an API request
  Then the request should be rejected with 401
  And message should indicate "Session expired due to inactivity"
```

#### 4. Audit Log Retention

```gherkin
Scenario: Audit log retention policy
  Given retention policy is 365 days
  When nightly cleanup job runs
  Then audit logs older than 365 days should be archived/deleted
  And a summary should be logged
```

---

## Summary of Priority Items

### High Priority (Core Functionality)

1. **Jobs Documentation** - Software, Config, Patch, Vulnerability jobs need complete documentation
2. **Patch Test/Approve Workflow** - Critical for enterprise patch management
3. **Token Refresh Endpoint** - Security requirement
4. **Discovery Endpoints** - IP Discovery and Device Credentials

### Medium Priority (Enhanced Features)

5. **Asset Detail Endpoints** - Health, vulnerabilities, events
6. **Zero Touch Deployment** - Automation feature
7. **Vulnerability Stats Endpoint** - Reporting

### Low Priority (Nice to Have)

8. **LDAP Test Connection** - Admin convenience
9. **License Validation** - Already handled in basic PUT
10. **Audit Export** - Reporting feature

---

## Next Steps

1. Update JOBS-IMPLEMENTATION.md with complete documentation for all job types
2. Add DISCOVERY-EXTENDED-IMPLEMENTATION.md for IP Discovery and Credentials
3. Update PATCHES-IMPLEMENTATION.md with test/approve workflow and zero-touch
4. Update VULNERABILITY-IMPLEMENTATION.md with missing endpoints
5. Add token refresh to AUTH-IMPLEMENTATION.md
6. Add missing asset endpoints to ASSETS-IMPLEMENTATION.md
