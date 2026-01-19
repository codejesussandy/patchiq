# Patches Module - Backend Implementation Guide

## Overview
This guide provides Test-Driven Development (TDD) scenarios and implementation details for the Patches module backend APIs. The frontend implementation is complete with MSW mocks. Follow this guide to implement the actual backend endpoints.

## Technology Stack
- **Framework**: Express.js / NestJS (choose based on project standard)
- **Database**: PostgreSQL with TypeORM / Prisma
- **Authentication**: JWT tokens (existing auth system)
- **Validation**: class-validator or Joi
- **Testing**: Jest + Supertest

## Database Schema

### Patches Table
```sql
CREATE TABLE patches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  software VARCHAR(500) NOT NULL,
  patch_id VARCHAR(100) UNIQUE NOT NULL,
  endpoints INTEGER DEFAULT 0,
  os VARCHAR(50) NOT NULL CHECK (os IN ('Windows', 'MacOS', 'Ubuntu', 'Linux')),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('CRITICAL', 'High', 'Medium', 'Low', 'UNSPECIFIED')),
  operational_status_since TIMESTAMP,
  platform VARCHAR(100),
  description TEXT,
  category VARCHAR(100),
  bulletin_id VARCHAR(100),
  kb_number VARCHAR(100),
  release_date DATE,
  reboot_required BOOLEAN DEFAULT false,
  support_uninstallation BOOLEAN DEFAULT false,
  architecture VARCHAR(50),
  reference_url TEXT,
  languages_supported TEXT[], -- PostgreSQL array
  tags TEXT[],
  approval_status VARCHAR(50),
  test_status VARCHAR(50),
  cve_numbers TEXT[],
  status VARCHAR(50),
  download_status VARCHAR(50),
  size VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  source VARCHAR(100),
  released_on DATE,
  downloaded_on DATE,
  superseded_by TEXT[],
  supersedes TEXT[],
  INDEX idx_patches_severity (severity),
  INDEX idx_patches_os (os),
  INDEX idx_patches_category (category)
);
```

### Deployments Table
```sql
CREATE TABLE deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  deployment_id VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('INSTALL', 'ROLLBACK')),
  stage VARCHAR(50) NOT NULL CHECK (stage IN ('INSTALLED', 'COMPLETED', 'IN_PROGRESS', 'FAILED')),
  pending INTEGER DEFAULT 0,
  succeeded INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  description TEXT,
  schedule TIMESTAMP,
  target_groups TEXT[],
  created_by VARCHAR(100),
  created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_deployments_stage (stage),
  INDEX idx_deployments_type (type)
);
```

### Deployment Patches (Junction Table)
```sql
CREATE TABLE deployment_patches (
  deployment_id UUID REFERENCES deployments(id) ON DELETE CASCADE,
  patch_id UUID REFERENCES patches(id) ON DELETE CASCADE,
  PRIMARY KEY (deployment_id, patch_id)
);
```

### Patch Tests Table
```sql
CREATE TABLE patch_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  application_type VARCHAR(20) CHECK (application_type IN ('ALL', 'INCLUDE', 'EXCLUDE')),
  applications TEXT[],
  scope VARCHAR(50) CHECK (scope IN ('ALL_COMPUTERS', 'SCOPE', 'SPECIFIC_GROUPS')),
  computers TEXT[],
  groups TEXT[],
  status VARCHAR(50),
  created_by VARCHAR(100),
  created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Zero Touch Configurations Table
```sql
CREATE TABLE zero_touch_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  application_type VARCHAR(20) CHECK (application_type IN ('ALL', 'INCLUDE', 'EXCLUDE')),
  applications TEXT[],
  scope VARCHAR(50) CHECK (scope IN ('ALL_COMPUTERS', 'SCOPE', 'SPECIFIC_GROUPS')),
  computers TEXT[],
  groups TEXT[],
  auto_deployment_rules JSONB NOT NULL,
  status VARCHAR(50),
  created_by VARCHAR(100),
  created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Supporting Tables
```sql
CREATE TABLE affected_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patch_id UUID REFERENCES patches(id) ON DELETE CASCADE,
  host_name VARCHAR(200),
  location VARCHAR(200),
  vendor VARCHAR(100),
  hardware_model VARCHAR(100)
);

CREATE TABLE file_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patch_id UUID REFERENCES patches(id) ON DELETE CASCADE,
  file_name VARCHAR(200),
  version VARCHAR(50),
  size VARCHAR(50),
  path TEXT
);

CREATE TABLE vulnerabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patch_id UUID REFERENCES patches(id) ON DELETE CASCADE,
  cve_number VARCHAR(50),
  severity VARCHAR(50),
  description TEXT,
  published_date DATE
);

CREATE TABLE endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patch_id UUID REFERENCES patches(id) ON DELETE CASCADE,
  name VARCHAR(200),
  os VARCHAR(50),
  status VARCHAR(50),
  last_seen TIMESTAMP
);
```

---

## Test-Driven Development Scenarios

## Module 1: Patches CRUD Operations

### Test Scenario 1.1: Create Patch
**Endpoint**: `POST /v1/patches`

**Given**: User is authenticated
**When**: User submits valid patch data
**Then**:
- Patch is created in database
- Returns 201 with patch object
- patch_id is auto-generated
- created_at timestamp is set

**Test Cases**:
```typescript
describe('POST /v1/patches', () => {
  it('should create a new patch with valid data', async () => {
    const patchData = {
      software: '2025-08 Cumulative Update for Windows 10',
      platform: 'Windows',
      severity: 'CRITICAL',
      category: 'Security Updates',
      bulletinId: 'MS25-001',
      kbNumber: 'KB5041571',
      releaseDate: '2025-08-13',
      architecture: '64 BIT',
      referenceUrl: 'https://support.microsoft.com/kb/5041571',
      languagesSupported: ['English'],
      tags: ['Security'],
      rebootRequired: true,
      supportUninstallation: false
    };

    const response = await request(app)
      .post('/v1/patches')
      .set('Authorization', `Bearer ${validToken}`)
      .send(patchData)
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.software).toBe(patchData.software);
    expect(response.body.patchId).toMatch(/ZPH-W-\d+/);
  });

  it('should return 400 for missing required fields', async () => {
    const response = await request(app)
      .post('/v1/patches')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ software: 'Test' })
      .expect(400);

    expect(response.body.message).toContain('required');
  });

  it('should return 401 for unauthenticated requests', async () => {
    await request(app)
      .post('/v1/patches')
      .send({})
      .expect(401);
  });
});
```

### Test Scenario 1.2: Get All Patches with Filtering
**Endpoint**: `GET /v1/patches`

**Test Cases**:
```typescript
describe('GET /v1/patches', () => {
  beforeEach(async () => {
    // Seed database with test patches
    await createTestPatches();
  });

  it('should return all patches', async () => {
    const response = await request(app)
      .get('/v1/patches')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(response.body).toBeInstanceOf(Array);
    expect(response.body.length).toBeGreaterThan(0);
  });

  it('should filter patches by severity', async () => {
    const response = await request(app)
      .get('/v1/patches?severity=CRITICAL')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(response.body.every(p => p.severity === 'CRITICAL')).toBe(true);
  });

  it('should filter patches by OS', async () => {
    const response = await request(app)
      .get('/v1/patches?os=Windows')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(response.body.every(p => p.os === 'Windows')).toBe(true);
  });

  it('should search patches by software name', async () => {
    const response = await request(app)
      .get('/v1/patches?search=Windows')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(response.body.every(p =>
      p.software.toLowerCase().includes('windows')
    )).toBe(true);
  });

  it('should paginate results', async () => {
    const response = await request(app)
      .get('/v1/patches?page=1&limit=5')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(response.body.length).toBeLessThanOrEqual(5);
  });
});
```

### Test Scenario 1.3: Update Patch
**Endpoint**: `PUT /v1/patches/:id`

**Test Cases**:
```typescript
describe('PUT /v1/patches/:id', () => {
  let patchId: string;

  beforeEach(async () => {
    const patch = await createTestPatch();
    patchId = patch.id;
  });

  it('should update patch successfully', async () => {
    const updateData = {
      severity: 'High',
      testStatus: 'Tested',
      approvalStatus: 'Approved'
    };

    const response = await request(app)
      .put(`/v1/patches/${patchId}`)
      .set('Authorization', `Bearer ${validToken}`)
      .send(updateData)
      .expect(200);

    expect(response.body.severity).toBe('High');
    expect(response.body.testStatus).toBe('Tested');
  });

  it('should return 404 for non-existent patch', async () => {
    await request(app)
      .put(`/v1/patches/00000000-0000-0000-0000-000000000000`)
      .set('Authorization', `Bearer ${validToken}`)
      .send({ severity: 'Low' })
      .expect(404);
  });
});
```

### Test Scenario 1.4: Delete Patch
**Endpoint**: `DELETE /v1/patches/:id`

**Test Cases**:
```typescript
describe('DELETE /v1/patches/:id', () => {
  it('should delete patch and cascade related data', async () => {
    const patch = await createTestPatch();
    await createAffectedProducts(patch.id);

    await request(app)
      .delete(`/v1/patches/${patch.id}`)
      .set('Authorization', `Bearer ${validToken}`)
      .expect(204);

    const deletedPatch = await Patch.findByPk(patch.id);
    expect(deletedPatch).toBeNull();
  });

  it('should return 404 for non-existent patch', async () => {
    await request(app)
      .delete(`/v1/patches/00000000-0000-0000-0000-000000000000`)
      .set('Authorization', `Bearer ${validToken}`)
      .expect(404);
  });
});
```

---

## Module 2: Patch Related Data

### Test Scenario 2.1: Get Affected Products
**Endpoint**: `GET /v1/patches/:id/affected-products`

**Test Cases**:
```typescript
describe('GET /v1/patches/:id/affected-products', () => {
  it('should return affected products for patch', async () => {
    const patch = await createTestPatch();
    await createAffectedProducts(patch.id, 3);

    const response = await request(app)
      .get(`/v1/patches/${patch.id}/affected-products`)
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(response.body).toHaveLength(3);
    expect(response.body[0]).toHaveProperty('hostName');
    expect(response.body[0]).toHaveProperty('vendor');
  });

  it('should return empty array for patch with no affected products', async () => {
    const patch = await createTestPatch();

    const response = await request(app)
      .get(`/v1/patches/${patch.id}/affected-products`)
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(response.body).toEqual([]);
  });
});
```

### Test Scenario 2.2: Scan Endpoints
**Endpoint**: `POST /v1/patches/:id/scan-endpoints`

**Test Cases**:
```typescript
describe('POST /v1/patches/:id/scan-endpoints', () => {
  it('should initiate endpoint scan', async () => {
    const patch = await createTestPatch();
    const scanRequest = {
      scope: 'All End Points',
      endpointIds: []
    };

    const response = await request(app)
      .post(`/v1/patches/${patch.id}/scan-endpoints`)
      .set('Authorization', `Bearer ${validToken}`)
      .send(scanRequest)
      .expect(202);

    expect(response.body).toHaveProperty('message', 'Scan initiated');
    // Verify scan job was queued
  });

  it('should scan specific endpoints', async () => {
    const patch = await createTestPatch();
    const scanRequest = {
      scope: 'Specific Groups',
      endpointIds: ['endpoint-1', 'endpoint-2']
    };

    await request(app)
      .post(`/v1/patches/${patch.id}/scan-endpoints`)
      .set('Authorization', `Bearer ${validToken}`)
      .send(scanRequest)
      .expect(202);
  });
});
```

---

## Module 3: Deployments

### Test Scenario 3.1: Create Deployment
**Endpoint**: `POST /v1/deployments`

**Test Cases**:
```typescript
describe('POST /v1/deployments', () => {
  it('should create deployment with patches', async () => {
    const patches = await createTestPatches(3);
    const deploymentData = {
      name: 'Critical Security Patches - Aug 2025',
      description: 'Deploy critical security patches',
      type: 'INSTALL',
      schedule: '2025-08-20T10:00:00Z',
      targetGroups: ['all', 'windows'],
      patches: patches.map(p => p.id)
    };

    const response = await request(app)
      .post('/v1/deployments')
      .set('Authorization', `Bearer ${validToken}`)
      .send(deploymentData)
      .expect(201);

    expect(response.body.name).toBe(deploymentData.name);
    expect(response.body.deploymentId).toMatch(/DEP-\d+/);
    expect(response.body.stage).toBe('IN_PROGRESS');
  });

  it('should auto-generate deployment ID', async () => {
    const deploymentData = {
      name: 'Test Deployment',
      type: 'INSTALL',
      patches: []
    };

    const response = await request(app)
      .post('/v1/deployments')
      .set('Authorization', `Bearer ${validToken}`)
      .send(deploymentData)
      .expect(201);

    expect(response.body.deploymentId).toBeTruthy();
  });
});
```

### Test Scenario 3.2: Execute Deployment
**Endpoint**: `POST /v1/deployments/:id/execute`

**Test Cases**:
```typescript
describe('POST /v1/deployments/:id/execute', () => {
  it('should execute deployment and update status', async () => {
    const deployment = await createTestDeployment();

    const response = await request(app)
      .post(`/v1/deployments/${deployment.id}/execute`)
      .set('Authorization', `Bearer ${validToken}`)
      .expect(202);

    expect(response.body.message).toBe('Deployment execution initiated');

    // Verify deployment stage updated
    const updated = await Deployment.findByPk(deployment.id);
    expect(updated.stage).toBe('IN_PROGRESS');
  });
});
```

---

## Module 4: Patch Tests

### Test Scenario 4.1: Create Patch Test
**Endpoint**: `POST /v1/patch-tests`

**Test Cases**:
```typescript
describe('POST /v1/patch-tests', () => {
  it('should create patch test configuration', async () => {
    const testData = {
      name: 'Engineering Dept Test',
      description: 'Test patches on engineering computers',
      applicationType: 'ALL',
      scope: 'SPECIFIC_GROUPS',
      groups: ['Engineering']
    };

    const response = await request(app)
      .post('/v1/patch-tests')
      .set('Authorization', `Bearer ${validToken}`)
      .send(testData)
      .expect(201);

    expect(response.body.name).toBe(testData.name);
    expect(response.body.status).toBe('Pending');
  });

  it('should validate application type and scope combination', async () => {
    const invalidData = {
      name: 'Test',
      applicationType: 'INCLUDE',
      scope: 'SCOPE'
      // Missing required applications and computers
    };

    await request(app)
      .post('/v1/patch-tests')
      .set('Authorization', `Bearer ${validToken}`)
      .send(invalidData)
      .expect(400);
  });
});
```

### Test Scenario 4.2: Approve Patch Test
**Endpoint**: `PUT /v1/patch-tests/:id/approve`

**Test Cases**:
```typescript
describe('PUT /v1/patch-tests/:id/approve', () => {
  it('should approve patch test', async () => {
    const test = await createTestPatchTest();

    const response = await request(app)
      .put(`/v1/patch-tests/${test.id}/approve`)
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(response.body.status).toBe('Approved');
  });

  it('should only allow approval by authorized users', async () => {
    const test = await createTestPatchTest();

    await request(app)
      .put(`/v1/patch-tests/${test.id}/approve`)
      .set('Authorization', `Bearer ${unauthorizedToken}`)
      .expect(403);
  });
});
```

---

## Module 5: Zero Touch Configurations

### Test Scenario 5.1: Create Zero Touch Config
**Endpoint**: `POST /v1/zero-touch-configs`

**Test Cases**:
```typescript
describe('POST /v1/zero-touch-configs', () => {
  it('should create zero-touch configuration', async () => {
    const configData = {
      name: 'Auto-Deploy Critical Patches',
      description: 'Automatically deploy critical security patches',
      applicationType: 'ALL',
      scope: 'ALL_COMPUTERS',
      autoDeploymentRules: {
        severity: ['CRITICAL', 'High'],
        approvalRequired: false,
        schedule: 'Immediate'
      }
    };

    const response = await request(app)
      .post('/v1/zero-touch-configs')
      .set('Authorization', `Bearer ${validToken}`)
      .send(configData)
      .expect(201);

    expect(response.body.name).toBe(configData.name);
    expect(response.body.status).toBe('Active');
  });

  it('should validate auto-deployment rules', async () => {
    const invalidConfig = {
      name: 'Test',
      autoDeploymentRules: {
        // Missing required severity field
        schedule: 'Immediate'
      }
    };

    await request(app)
      .post('/v1/zero-touch-configs')
      .set('Authorization', `Bearer ${validToken}`)
      .send(invalidConfig)
      .expect(400);
  });
});
```

---

## Error Handling Scenarios

### Test Scenario E.1: Validation Errors
```typescript
describe('Validation Errors', () => {
  it('should return 400 for invalid severity value', async () => {
    const response = await request(app)
      .post('/v1/patches')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ severity: 'INVALID' })
      .expect(400);

    expect(response.body.errors).toContainEqual(
      expect.objectContaining({ field: 'severity' })
    );
  });

  it('should return 400 for invalid date format', async () => {
    await request(app)
      .post('/v1/patches')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ releaseDate: 'invalid-date' })
      .expect(400);
  });
});
```

### Test Scenario E.2: Database Errors
```typescript
describe('Database Errors', () => {
  it('should return 409 for duplicate patch ID', async () => {
    await createTestPatch({ patchId: 'ZPH-W-1234' });

    await request(app)
      .post('/v1/patches')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ patchId: 'ZPH-W-1234', /* other fields */ })
      .expect(409);
  });
});
```

---

---

## Module 6: Patch Test & Approval Workflow (Individual Patches)

### Additional Endpoints for Individual Patch Approval

These endpoints supplement the batch patch test configurations and allow for individual patch management:

**Endpoint**: `GET /v1/patches/test-approve`
Returns patches that are pending test or approval.

**Test Cases**:
```typescript
describe('GET /v1/patches/test-approve', () => {
  it('should return patches pending test', async () => {
    const response = await request(app)
      .get('/v1/patches/test-approve?status=pending-test')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(response.body.every(p => p.testStatus === 'Not Tested')).toBe(true);
  });

  it('should return patches pending approval', async () => {
    const response = await request(app)
      .get('/v1/patches/test-approve?status=pending-approval')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(response.body.every(p =>
      p.testStatus === 'Tested' && p.approvalStatus === 'Pending'
    )).toBe(true);
  });
});
```

**Endpoint**: `POST /v1/patches/:id/test`
Mark an individual patch as tested (pass/fail).

**Test Cases**:
```typescript
describe('POST /v1/patches/:id/test', () => {
  it('should mark patch as tested with pass', async () => {
    const patch = await createTestPatch({ testStatus: 'Not Tested' });

    const response = await request(app)
      .post(`/v1/patches/${patch.id}/test`)
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        status: 'passed',
        notes: 'Tested on 5 machines successfully',
        testEnvironment: 'Windows 10 22H2'
      })
      .expect(200);

    expect(response.body.testStatus).toBe('Tested');
    expect(response.body.testResult).toBe('passed');
    expect(response.body.testedBy).toBeTruthy();
    expect(response.body.testedAt).toBeTruthy();
  });

  it('should mark patch as tested with fail', async () => {
    const patch = await createTestPatch({ testStatus: 'Not Tested' });

    const response = await request(app)
      .post(`/v1/patches/${patch.id}/test`)
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        status: 'failed',
        notes: 'Causes BSOD on certain configurations',
        testEnvironment: 'Windows Server 2019'
      })
      .expect(200);

    expect(response.body.testStatus).toBe('Test Failed');
    expect(response.body.testResult).toBe('failed');
  });
});
```

**Endpoint**: `POST /v1/patches/:id/approve`
Approve a tested patch for deployment.

**Test Cases**:
```typescript
describe('POST /v1/patches/:id/approve', () => {
  it('should approve a tested patch', async () => {
    const patch = await createTestPatch({
      testStatus: 'Tested',
      testResult: 'passed',
      approvalStatus: 'Pending'
    });

    const response = await request(app)
      .post(`/v1/patches/${patch.id}/approve`)
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(response.body.approvalStatus).toBe('Approved');
    expect(response.body.approvedBy).toBeTruthy();
    expect(response.body.approvedAt).toBeTruthy();
  });

  it('should reject approving untested patch', async () => {
    const patch = await createTestPatch({ testStatus: 'Not Tested' });

    await request(app)
      .post(`/v1/patches/${patch.id}/approve`)
      .set('Authorization', `Bearer ${validToken}`)
      .expect(400);
  });

  it('should reject approving failed test patch', async () => {
    const patch = await createTestPatch({
      testStatus: 'Test Failed',
      testResult: 'failed'
    });

    await request(app)
      .post(`/v1/patches/${patch.id}/approve`)
      .set('Authorization', `Bearer ${validToken}`)
      .expect(400);
  });
});
```

**Endpoint**: `POST /v1/patches/:id/reject`
Reject a patch with reason.

**Test Cases**:
```typescript
describe('POST /v1/patches/:id/reject', () => {
  it('should reject a patch with reason', async () => {
    const patch = await createTestPatch({ approvalStatus: 'Pending' });

    const response = await request(app)
      .post(`/v1/patches/${patch.id}/reject`)
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        reason: 'Known compatibility issues with our software',
        notes: 'Will re-evaluate after vendor fix'
      })
      .expect(200);

    expect(response.body.approvalStatus).toBe('Rejected');
    expect(response.body.rejectionReason).toBe('Known compatibility issues with our software');
    expect(response.body.rejectedBy).toBeTruthy();
    expect(response.body.rejectedAt).toBeTruthy();
  });

  it('should require rejection reason', async () => {
    const patch = await createTestPatch({ approvalStatus: 'Pending' });

    await request(app)
      .post(`/v1/patches/${patch.id}/reject`)
      .set('Authorization', `Bearer ${validToken}`)
      .send({})
      .expect(400);
  });
});
```

### Additional Fields for Patch Model

```sql
ALTER TABLE patches ADD COLUMN test_result VARCHAR(20) CHECK (test_result IN ('passed', 'failed'));
ALTER TABLE patches ADD COLUMN tested_by VARCHAR(100);
ALTER TABLE patches ADD COLUMN tested_at TIMESTAMP;
ALTER TABLE patches ADD COLUMN test_notes TEXT;
ALTER TABLE patches ADD COLUMN test_environment VARCHAR(200);
ALTER TABLE patches ADD COLUMN approved_by VARCHAR(100);
ALTER TABLE patches ADD COLUMN approved_at TIMESTAMP;
ALTER TABLE patches ADD COLUMN rejected_by VARCHAR(100);
ALTER TABLE patches ADD COLUMN rejected_at TIMESTAMP;
ALTER TABLE patches ADD COLUMN rejection_reason TEXT;
ALTER TABLE patches ADD COLUMN rejection_notes TEXT;

CREATE INDEX idx_patches_test_status ON patches(test_status);
CREATE INDEX idx_patches_approval_status ON patches(approval_status);
```

### Business Rules

1. **Test Workflow**:
   - Patches start with `testStatus = 'Not Tested'`
   - After testing: `testStatus = 'Tested'` or `testStatus = 'Test Failed'`
   - Test result and notes are required when marking tested

2. **Approval Workflow**:
   - Only patches with `testStatus = 'Tested'` and `testResult = 'passed'` can be approved
   - Patches with `testStatus = 'Test Failed'` cannot be approved (must be rejected or retested)
   - Approved patches have `approvalStatus = 'Approved'`
   - Only approved patches can be included in deployments

3. **Rejection Workflow**:
   - Rejection reason is required
   - Rejected patches have `approvalStatus = 'Rejected'`
   - Rejected patches cannot be deployed
   - Rejected patches can be re-tested and re-approved later

4. **Audit Trail**:
   - All test/approve/reject actions are logged with user, timestamp, and details
   - History is preserved even if status changes later

---

## Module 7: Zero Touch Deployment Configuration

### Enhanced Zero Touch Config Model

```typescript
interface ZeroTouchConfig {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;

  // Schedule
  scheduleTime: string;           // HH:mm:ss format
  daysOfWeek?: number[];          // 0-6 for Sunday-Saturday
  maintenanceWindow?: {
    startTime: string;
    endTime: string;
  };

  // Target Selection
  scope: 'ALL_COMPUTERS' | 'SCOPE' | 'SPECIFIC_GROUPS';
  targetGroups?: string[];
  excludedGroups?: string[];

  // Patch Selection
  severityFilter: ('CRITICAL' | 'High' | 'Medium' | 'Low')[];
  categoryFilter?: string[];
  autoApprove: boolean;
  excludedPatches?: string[];

  // Deployment Options
  autoReboot: boolean;
  rebootDelay?: number;           // minutes before reboot
  notifyUsers: boolean;
  notificationMessage?: string;

  // Status
  status: 'Active' | 'Inactive' | 'Draft';
  lastExecution?: string;
  nextExecution?: string;

  createdBy: string;
  createdOn: string;
}
```

### Zero Touch Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/zero-touch-configs` | GET | List all zero touch configurations |
| `/v1/zero-touch-configs` | POST | Create new configuration |
| `/v1/zero-touch-configs/:id` | GET | Get configuration details |
| `/v1/zero-touch-configs/:id` | PUT | Update configuration |
| `/v1/zero-touch-configs/:id` | DELETE | Delete configuration |
| `/v1/zero-touch-configs/:id/enable` | POST | Enable configuration |
| `/v1/zero-touch-configs/:id/disable` | POST | Disable configuration |
| `/v1/zero-touch-configs/:id/execute` | POST | Manually trigger execution |

---

## Implementation Checklist

### Phase 1: Database Setup
- [ ] Create PostgreSQL database schema
- [ ] Set up migrations
- [ ] Create seed data for testing
- [ ] Set up indexes for performance

### Phase 2: Core Patches API
- [ ] Implement POST /v1/patches
- [ ] Implement GET /v1/patches with filtering
- [ ] Implement GET /v1/patches/:id
- [ ] Implement PUT /v1/patches/:id
- [ ] Implement DELETE /v1/patches/:id
- [ ] Write unit tests for all endpoints
- [ ] Write integration tests

### Phase 3: Patch Related Data
- [ ] Implement GET /v1/patches/:id/affected-products
- [ ] Implement POST /v1/patches/:id/scan-endpoints
- [ ] Implement GET /v1/patches/:id/file-details
- [ ] Implement GET /v1/patches/:id/vulnerabilities
- [ ] Implement GET /v1/patches/:id/endpoints

### Phase 4: Deployments API
- [ ] Implement POST /v1/deployments
- [ ] Implement GET /v1/deployments
- [ ] Implement GET /v1/deployments/:id
- [ ] Implement DELETE /v1/deployments/:id
- [ ] Implement GET /v1/deployments/:id/preview
- [ ] Implement POST /v1/deployments/:id/execute
- [ ] Create background job for deployment execution

### Phase 5: Patch Tests API
- [ ] Implement POST /v1/patch-tests
- [ ] Implement GET /v1/patch-tests
- [ ] Implement GET /v1/patch-tests/:id
- [ ] Implement PUT /v1/patch-tests/:id/approve
- [ ] Implement DELETE /v1/patch-tests/:id

### Phase 6: Zero Touch API
- [ ] Implement POST /v1/zero-touch-configs
- [ ] Implement GET /v1/zero-touch-configs
- [ ] Implement GET /v1/zero-touch-configs/:id
- [ ] Implement PUT /v1/zero-touch-configs/:id
- [ ] Implement DELETE /v1/zero-touch-configs/:id
- [ ] Create scheduler for auto-deployments

### Phase 7: Integration & Performance
- [ ] Add request validation middleware
- [ ] Add error handling middleware
- [ ] Optimize database queries
- [ ] Add caching layer (Redis)
- [ ] Set up API rate limiting
- [ ] Add logging and monitoring

### Phase 8: Documentation & Deployment
- [ ] Generate Swagger documentation from OpenAPI spec
- [ ] Write API usage examples
- [ ] Create postman collection
- [ ] Set up CI/CD pipeline
- [ ] Deploy to staging environment
- [ ] Conduct load testing

---

## Performance Considerations

1. **Database Indexing**
   - Add indexes on frequently queried fields (severity, os, category)
   - Use composite indexes for multi-field filters
   - Monitor slow queries and optimize

2. **Caching Strategy**
   - Cache GET /v1/patches results (TTL: 5 minutes)
   - Invalidate cache on POST/PUT/DELETE operations
   - Use Redis for distributed caching

3. **Pagination**
   - Default page size: 10
   - Maximum page size: 100
   - Use cursor-based pagination for large datasets

4. **Query Optimization**
   - Use eager loading for related data
   - Implement GraphQL for flexible data fetching
   - Add database connection pooling

---

## Security Considerations

1. **Authentication & Authorization**
   - Verify JWT tokens on all endpoints
   - Implement role-based access control
   - Restrict delete operations to admins only

2. **Input Validation**
   - Sanitize all user inputs
   - Validate file uploads (CSV/Excel for bulk add)
   - Prevent SQL injection with parameterized queries

3. **Rate Limiting**
   - Limit API requests per user per minute
   - Implement exponential backoff for retries
   - Block suspicious IP addresses

---

## Testing Strategy

1. **Unit Tests** (>80% coverage)
   - Test all service methods
   - Test validation logic
   - Test error handling

2. **Integration Tests**
   - Test all API endpoints
   - Test database transactions
   - Test authentication flows

3. **E2E Tests**
   - Test complete user workflows
   - Test deployment execution
   - Test zero-touch automation

4. **Load Tests**
   - Test with 1000+ concurrent users
   - Test with 100,000+ patches
   - Measure response times under load

---

## Deployment Notes

1. **Environment Variables**
   ```
   DATABASE_URL=postgresql://user:pass@host:5432/patchify
   JWT_SECRET=<secret-key>
   REDIS_URL=redis://localhost:6379
   API_PORT=3000
   ```

2. **Database Migrations**
   ```bash
   npm run migrate:up
   npm run seed
   ```

3. **Health Check Endpoint**
   ```
   GET /v1/health
   Response: { status: 'ok', database: 'connected', redis: 'connected' }
   ```

---

## Support & Troubleshooting

For issues or questions:
1. Check API logs in `/var/log/patchify/api.log`
2. Review OpenAPI spec in `backend-debt/patches-api.yaml`
3. Contact backend team via Slack #patches-backend

---

**Implementation Timeline**: 3-4 weeks (1 week per phase for phases 1-4, 1 week for phases 5-8)
