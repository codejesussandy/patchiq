# Jobs & Deployments Implementation Guide

## API Contract
**Spec**: `backend-debt/jobs-api.yaml`

## Endpoints Overview
```
# Patch Jobs
GET    /v1/jobs/patch                    - List patch jobs
POST   /v1/jobs/patch                    - Create patch deployment job
GET    /v1/jobs/patch/:id                - Get patch job details
DELETE /v1/jobs/patch/:id                - Delete patch job

# Vulnerability Jobs
GET    /v1/jobs/vulnerability            - List vulnerability jobs
POST   /v1/jobs/vulnerability            - Create vulnerability scan job
GET    /v1/jobs/vulnerability/:id        - Get vulnerability job details
DELETE /v1/jobs/vulnerability/:id        - Delete vulnerability job
GET    /v1/jobs/vulnerability/db-sync    - Get DB sync config
PUT    /v1/jobs/vulnerability/db-sync    - Update DB sync config
POST   /v1/jobs/vulnerability/db-sync/now - Trigger immediate sync

# Software Jobs - Catalog
GET    /v1/jobs/software/catalog         - List software catalog
POST   /v1/jobs/software/catalog         - Create software entry
PUT    /v1/jobs/software/catalog/:id     - Update software entry
DELETE /v1/jobs/software/catalog/:id     - Delete software entry

# Software Jobs - Bundles
GET    /v1/jobs/software/bundles         - List software bundles
POST   /v1/jobs/software/bundles         - Create bundle
PUT    /v1/jobs/software/bundles/:id     - Update bundle
DELETE /v1/jobs/software/bundles/:id     - Delete bundle

# Software Jobs - Deployed
GET    /v1/jobs/software/deployed        - List software deployments
POST   /v1/jobs/software/deployed        - Create deployment
GET    /v1/jobs/software/deployed/:id/tasks - Get deployment tasks
DELETE /v1/jobs/software/deployed/:id    - Delete deployment

# Configuration Jobs - Catalog
GET    /v1/jobs/config/catalog           - List config catalog
POST   /v1/jobs/config/catalog           - Create config entry
PUT    /v1/jobs/config/catalog/:id       - Update config entry
DELETE /v1/jobs/config/catalog/:id       - Delete config entry

# Configuration Jobs - Bundles
GET    /v1/jobs/config/bundles           - List config bundles
POST   /v1/jobs/config/bundles           - Create bundle
PUT    /v1/jobs/config/bundles/:id       - Update bundle
DELETE /v1/jobs/config/bundles/:id       - Delete bundle

# Configuration Jobs - Deployed
GET    /v1/jobs/config/deployed          - List config deployments
POST   /v1/jobs/config/deployed          - Create deployment
GET    /v1/jobs/config/deployed/:id/tasks - Get deployment tasks
DELETE /v1/jobs/config/deployed/:id      - Delete deployment

# Deployment Policies (Shared)
GET    /v1/deployment-policies           - List policies
POST   /v1/deployment-policies           - Create policy
PUT    /v1/deployment-policies/:id       - Update policy
DELETE /v1/deployment-policies/:id       - Delete policy
```

## Reference Implementation
- **Patch Jobs**: `frontend/src/pages/jobs/PatchJobs.tsx`
- **Vulnerability Jobs**: `frontend/src/pages/jobs/VulnerabilityJobs*.tsx`
- **Software Jobs**: `frontend/src/pages/jobs/SoftwareJobs*.tsx`
- **Config Jobs**: `frontend/src/pages/jobs/ConfigurationJobs*.tsx`
- **Mock**: `frontend/src/mocks/handlers/jobs.handlers.ts`

---

## Data Models

### PatchJob (Policy-based)
```typescript
{
  id: string;
  policyId: string;               // Display ID
  name: string;
  description?: string;
  type: 'SCHEDULE' | 'INSTANT';
  configType: 'INSTALL' | 'ROLLBACK';
  scope: 'Global' | 'Group' | 'Endpoint';
  endpoints?: string[];
  patches: string[];              // Patch IDs
  deploymentPolicy: string;       // Policy ID
  retryCount: number;
  batchSize?: number;
  notifyTo?: string[];            // User IDs
  createdBy: string;
  createdOn: string;
}
```

### VulnerabilityJob
```typescript
{
  id: string;
  jobId: string;                  // Display ID
  name: string;
  description?: string;
  scope: 'Global' | 'Group' | 'Endpoint';
  endpoints?: string[];
  scanType: 'instant' | 'scheduled';
  scheduleDate?: string;
  scheduleTime?: string;
  recurrence?: 'once' | 'daily' | 'weekly' | 'monthly';
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SCHEDULED';
  lastRun?: string;
  nextRun?: string;
  createdBy: string;
  createdOn: string;
}
```

### VulnerabilityDBSync
```typescript
{
  scanJobInterval: number;        // 1-999
  scanJobUnit: 'Hour' | 'Day' | 'Week';
  databaseSyncTime: string;       // HH:mm:ss format
  lastSync?: string;              // ISO datetime
  totalCVE: number;               // e.g., 311639
}
```

### SoftwareCatalogItem
```typescript
{
  id: string;
  deploymentId: string;           // Display ID
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
  applicationFileUrl: string;
  createdBy: string;
  createdOn: string;
}
```

### SoftwareBundle
```typescript
{
  id: string;
  bundleName: string;
  os: 'Windows' | 'Mac' | 'Linux';
  description: string;
  applications: string[];         // Software catalog IDs
  createdBy: string;
  createdOn: string;
}
```

### SoftwareDeployment
```typescript
{
  id: string;
  deploymentId: string;
  deploymentName: string;
  description: string;
  deploymentType: 'install' | 'uninstall' | 'upgrade';
  selectionType: 'application' | 'bundle';
  selectedItems: string[];        // App or Bundle IDs
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

### DeploymentTask
```typescript
{
  id: number;
  deploymentId: string;
  endpoint: {
    name: string;
    os: 'Windows' | 'MacOS' | 'Ubuntu' | 'Linux';
    status: string;
  };
  name: string;                   // Package/config name
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'IN_PROGRESS';
  createdBy: string;
  lastUpdated: string;
  createdOn: string;
}
```

### ConfigCatalogItem
```typescript
{
  id: string;
  configurationId: string;        // Display ID
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
```

### ConfigBundle
```typescript
{
  id: string;
  bundleName: string;
  os: 'Windows' | 'Mac' | 'Linux';
  description: string;
  configurations: string[];       // Config catalog IDs
  createdBy: string;
  createdOn: string;
}
```

### DeploymentPolicy
```typescript
{
  id: string;
  policyId: string;               // Display ID
  name: string;
  description: string;
  type: 'SCHEDULE' | 'INSTANT';
  supportedModule: 'All' | 'Patch' | 'Update' | 'Security';
  relatedType: 'No Relation' | 'Critical' | 'Important' | 'Optional';
  createdBy: string;
  createdOn: string;
}
```

---

## TDD Scenarios

### Patch Jobs

**GET /v1/jobs/patch**
```json
Response (200):
{
  "data": [
    {
      "id": "uuid",
      "policyId": "POL-001",
      "name": "Critical Patches Deploy",
      "description": "Deploy critical security patches",
      "type": "SCHEDULE",
      "createdBy": "Admin",
      "createdOn": "2024/01/15 10:00:00 AM"
    }
  ],
  "total": 25
}
```

**POST /v1/jobs/patch**
```json
Request:
{
  "name": "Monthly Security Update",
  "description": "January security patches",
  "type": "SCHEDULE",
  "configType": "INSTALL",
  "scope": "Global",
  "patches": ["patch-uuid-1", "patch-uuid-2"],
  "deploymentPolicy": "policy-uuid",
  "retryCount": 3,
  "batchSize": 10
}

Response (201):
{
  "id": "new-uuid",
  "policyId": "POL-002",
  "name": "Monthly Security Update",
  "type": "SCHEDULE",
  "createdBy": "Admin"
}
```

---

### Vulnerability Jobs

**POST /v1/jobs/vulnerability**
```json
Request:
{
  "name": "Weekly Security Scan",
  "description": "Comprehensive vulnerability scan",
  "scope": "Global",
  "scanType": "scheduled",
  "scheduleDate": "2024-01-20",
  "scheduleTime": "02:00",
  "recurrence": "weekly"
}

Response (201):
{
  "id": "uuid",
  "jobId": "VSCAN-001",
  "status": "SCHEDULED",
  "nextRun": "2024-01-20T02:00:00Z"
}
```

**GET /v1/jobs/vulnerability/db-sync**
```json
Response (200):
{
  "scanJobInterval": 24,
  "scanJobUnit": "Hour",
  "databaseSyncTime": "02:00:00",
  "lastSync": "2024-01-15T02:00:00Z",
  "totalCVE": 311639
}
```

**POST /v1/jobs/vulnerability/db-sync/now**
```json
Response (202):
{
  "message": "Database sync initiated",
  "jobId": "sync-job-uuid"
}
```

---

### Software Catalog

**POST /v1/jobs/software/catalog**
```json
Request (multipart/form-data):
{
  "applicationName": "Google Chrome",
  "description": "Web browser",
  "os": "Windows",
  "version": "120.0.6099.130",
  "applicationLocationType": "URL",
  "installationCommand": "msiexec /i chrome.msi /quiet",
  "selfService": true,
  "architecture": "x64",
  "applicationType": "MSI",
  "applicationFile": <file>,
  "iconFile": <file>
}

Response (201):
{
  "id": "uuid",
  "deploymentId": "SW-001",
  "applicationName": "Google Chrome"
}
```

---

### Software Bundles

**POST /v1/jobs/software/bundles**
```json
Request:
{
  "bundleName": "Developer Tools",
  "os": "Windows",
  "description": "Essential developer software",
  "applications": ["sw-uuid-1", "sw-uuid-2", "sw-uuid-3"]
}

Response (201):
{
  "id": "uuid",
  "bundleName": "Developer Tools",
  "os": "Windows",
  "applications": ["sw-uuid-1", "sw-uuid-2", "sw-uuid-3"]
}
```

---

### Software Deployments

**POST /v1/jobs/software/deployed**
```json
Request:
{
  "deploymentName": "Chrome Rollout",
  "description": "Deploy Chrome to all Windows machines",
  "deploymentType": "install",
  "selectionType": "application",
  "selectedItems": ["sw-uuid-chrome"],
  "scope": "windows",
  "deploymentPolicy": "policy-uuid",
  "retryCount": 2,
  "notifyTo": "admin"
}

Response (201):
{
  "id": "uuid",
  "deploymentId": "DEP-SW-001",
  "stage": "IN_PROGRESS",
  "pending": 150,
  "succeeded": 0,
  "failed": 0
}
```

**GET /v1/jobs/software/deployed/:id/tasks**
```json
Response (200):
{
  "data": [
    {
      "id": 1,
      "endpoint": {
        "name": "DESKTOP-ABC",
        "os": "Windows",
        "status": "Online"
      },
      "name": "Google Chrome",
      "status": "SUCCESS",
      "createdBy": "Admin",
      "lastUpdated": "2024/01/15 02:02:08 PM",
      "createdOn": "2024/01/15 02:01:36 PM"
    }
  ],
  "total": 150
}
```

---

### Configuration Jobs

**POST /v1/jobs/config/catalog**
```json
Request:
{
  "name": "Disable USB Storage",
  "os": "Windows",
  "description": "Security policy to disable USB",
  "configurationType": "command",
  "architecture": "x64",
  "isRemediation": false,
  "commandType": "powershell",
  "command": "Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\USBSTOR' -Name 'Start' -Value 4"
}

Response (201):
{
  "id": "uuid",
  "configurationId": "CFG-001",
  "name": "Disable USB Storage"
}
```

---

### Deployment Policies

**GET /v1/deployment-policies**
```json
Response (200):
{
  "data": [
    {
      "id": "uuid",
      "policyId": "DPOL-001",
      "name": "Immediate Deploy",
      "description": "Deploy immediately without scheduling",
      "type": "INSTANT",
      "supportedModule": "All",
      "createdBy": "Admin"
    }
  ],
  "total": 5
}
```

**POST /v1/deployment-policies**
```json
Request:
{
  "name": "Maintenance Window",
  "description": "Deploy during maintenance window",
  "type": "SCHEDULE",
  "supportedModule": "Patch",
  "relatedType": "Critical"
}

Response (201):
{
  "id": "uuid",
  "policyId": "DPOL-002",
  "name": "Maintenance Window"
}
```

---

## Database Schema

```sql
-- Patch Jobs
CREATE TABLE patch_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(20) NOT NULL,
  config_type VARCHAR(20) NOT NULL,
  scope VARCHAR(20) NOT NULL,
  deployment_policy_id UUID REFERENCES deployment_policies(id),
  retry_count INTEGER DEFAULT 1,
  batch_size INTEGER,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Vulnerability Jobs
CREATE TABLE vulnerability_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  scope VARCHAR(20) NOT NULL,
  scan_type VARCHAR(20) NOT NULL,
  schedule_date DATE,
  schedule_time TIME,
  recurrence VARCHAR(20),
  status VARCHAR(20) DEFAULT 'SCHEDULED',
  last_run TIMESTAMP,
  next_run TIMESTAMP,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Vulnerability DB Sync Config
CREATE TABLE vulnerability_db_sync_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_job_interval INTEGER NOT NULL,
  scan_job_unit VARCHAR(20) NOT NULL,
  database_sync_time TIME NOT NULL,
  last_sync TIMESTAMP,
  total_cve INTEGER DEFAULT 0
);

-- Software Catalog
CREATE TABLE software_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id VARCHAR(50) UNIQUE NOT NULL,
  application_name VARCHAR(255) NOT NULL,
  description TEXT,
  os VARCHAR(20) NOT NULL,
  version VARCHAR(100),
  application_location_type VARCHAR(50),
  installation_command TEXT,
  uninstallation_command TEXT,
  upgrade_command TEXT,
  icon_url TEXT,
  self_service BOOLEAN DEFAULT true,
  architecture VARCHAR(20),
  application_type VARCHAR(20),
  application_file_url TEXT,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Software Bundles
CREATE TABLE software_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_name VARCHAR(255) NOT NULL,
  os VARCHAR(20) NOT NULL,
  description TEXT,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Software Bundle Items
CREATE TABLE software_bundle_items (
  bundle_id UUID REFERENCES software_bundles(id) ON DELETE CASCADE,
  software_id UUID REFERENCES software_catalog(id) ON DELETE CASCADE,
  PRIMARY KEY (bundle_id, software_id)
);

-- Software Deployments
CREATE TABLE software_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id VARCHAR(50) UNIQUE NOT NULL,
  deployment_name VARCHAR(255) NOT NULL,
  description TEXT,
  deployment_type VARCHAR(20) NOT NULL,
  selection_type VARCHAR(20) NOT NULL,
  scope VARCHAR(20) NOT NULL,
  deployment_policy_id UUID REFERENCES deployment_policies(id),
  retry_count INTEGER DEFAULT 1,
  notify_to VARCHAR(20),
  stage VARCHAR(20) DEFAULT 'IN_PROGRESS',
  pending INTEGER DEFAULT 0,
  succeeded INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Config Catalog (similar structure to software)
CREATE TABLE config_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  configuration_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  os VARCHAR(20) NOT NULL,
  description TEXT,
  configuration_type VARCHAR(20) NOT NULL,
  architecture VARCHAR(20),
  is_remediation BOOLEAN DEFAULT false,
  command_type VARCHAR(20),
  command TEXT,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Deployment Policies
CREATE TABLE deployment_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(20) NOT NULL,
  supported_module VARCHAR(20),
  related_type VARCHAR(50),
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Deployment Tasks (shared across all deployment types)
CREATE TABLE deployment_tasks (
  id SERIAL PRIMARY KEY,
  deployment_id UUID NOT NULL,
  deployment_type VARCHAR(20) NOT NULL,   -- 'software', 'config', 'patch'
  endpoint_id UUID REFERENCES assets(id),
  endpoint_name VARCHAR(255),
  endpoint_os VARCHAR(50),
  item_name VARCHAR(255),
  status VARCHAR(20) DEFAULT 'PENDING',
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_deployment_tasks ON deployment_tasks(deployment_id, deployment_type);
```

---

## Export Format

All job lists support CSV export with these columns:
- ID, Name, Description, Type, Status, Created By, Created On

Tasks export includes:
- ID, Endpoint, Name, Status, Created By, Last Updated, Created On

---

## Pagination

- Default: 20 items per page
- Vulnerability jobs: 30 items per page
- Tasks: 20 items per page
- Options: [10, 20, 30, 50, 100]

---

## Implementation Order

1. Deployment Policies CRUD
2. Patch Jobs CRUD
3. Vulnerability Jobs CRUD
4. Vulnerability DB Sync config
5. Software Catalog CRUD (with file upload)
6. Software Bundles CRUD
7. Software Deployments + Tasks
8. Config Catalog CRUD
9. Config Bundles CRUD
10. Config Deployments + Tasks
11. Background job execution engine
12. Progress tracking and notifications
