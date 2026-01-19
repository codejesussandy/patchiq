# Task 13: End-to-End Testing

## Overview
Implement comprehensive E2E tests to verify the entire backend works with the frontend.

**Priority:** Final Phase
**Dependencies:** All previous tasks
**Estimated Complexity:** Medium
**Parallel:** No - requires all features complete

---

## Objectives

1. Verify all API endpoints match MSW handler expectations
2. Test complete user flows (login → use features → logout)
3. Test agent communication flows
4. Verify error handling across all modules
5. Performance testing for critical paths

---

## Test Structure

```
tests/
├── e2e/
│   ├── setup.ts                 # E2E test setup
│   ├── teardown.ts              # Cleanup
│   ├── auth.e2e.test.ts         # Auth flows
│   ├── agents.e2e.test.ts       # Agent lifecycle
│   ├── assets.e2e.test.ts       # Asset management
│   ├── patches.e2e.test.ts      # Patch workflow
│   ├── vulnerabilities.e2e.test.ts
│   ├── jobs.e2e.test.ts         # Job execution
│   └── full-workflow.e2e.test.ts # Complete user journey
├── integration/
│   └── ... (module-specific)
└── performance/
    ├── api-benchmark.test.ts
    └── database-queries.test.ts
```

---

## Key E2E Test Scenarios

### 1. Complete Authentication Flow

```typescript
// tests/e2e/auth.e2e.test.ts
describe('E2E: Authentication', () => {
  it('should complete full auth lifecycle', async () => {
    // 1. Login
    const loginRes = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'admin@patchiq.io', password: 'admin123' });

    expect(loginRes.status).toBe(200);
    const { accessToken, refreshToken, user } = loginRes.body;

    // 2. Access protected resource
    const meRes = await request(app)
      .get('/v1/user/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.email).toBe(user.email);

    // 3. Refresh token
    const refreshRes = await request(app)
      .post('/v1/auth/refresh')
      .send({ refreshToken });

    expect(refreshRes.status).toBe(200);
    const newToken = refreshRes.body.accessToken;

    // 4. Old token should still work briefly (not revoked until used)
    // 5. Logout
    const logoutRes = await request(app)
      .post('/v1/auth/logout')
      .set('Authorization', `Bearer ${newToken}`);

    expect(logoutRes.status).toBe(200);

    // 6. Old refresh token should be revoked
    const failedRefresh = await request(app)
      .post('/v1/auth/refresh')
      .send({ refreshToken });

    expect(failedRefresh.status).toBe(401);
  });

  it('should handle password reset flow', async () => {
    // 1. Request password reset
    await request(app)
      .post('/v1/auth/forgot-password')
      .send({ email: 'test@example.com' });

    // 2. Get reset token from database (in real test, would be from email)
    const resetToken = await getResetTokenFromDb('test@example.com');

    // 3. Reset password
    const resetRes = await request(app)
      .post('/v1/auth/reset-password')
      .send({
        token: resetToken,
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      });

    expect(resetRes.status).toBe(200);

    // 4. Login with new password
    const loginRes = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'test@example.com', password: 'NewPassword123' });

    expect(loginRes.status).toBe(200);
  });
});
```

### 2. Agent Lifecycle

```typescript
// tests/e2e/agents.e2e.test.ts
describe('E2E: Agent Lifecycle', () => {
  it('should complete agent registration and heartbeat', async () => {
    // 1. Register agent
    const registerRes = await request(app)
      .post('/api/agent/register')
      .set('X-Agent-Version', '1.0.0')
      .send({
        machineId: 'E2E-TEST-MACHINE-001',
        hostname: 'e2e-test-host',
        os: 'MacOS',
        osVersion: '14.5',
        architecture: 'arm64',
        agentVersion: '1.0.0',
      });

    expect(registerRes.status).toBe(201);
    const { agentId, assetId, accessToken, config } = registerRes.body;

    expect(agentId).toBeDefined();
    expect(assetId).toBeDefined();
    expect(config.heartbeatIntervalSeconds).toBe(60);

    // 2. Send heartbeat
    const heartbeatRes = await request(app)
      .post('/api/agent/heartbeat')
      .set('X-Agent-Id', agentId)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        timestamp: new Date().toISOString(),
        status: 'healthy',
        uptime: 3600,
        agentUptime: 60,
        cpuUsage: 15.5,
        memoryUsage: 45.2,
        diskUsage: 60.0,
        pendingReboot: false,
      });

    expect(heartbeatRes.status).toBe(200);
    expect(heartbeatRes.body.acknowledged).toBe(true);

    // 3. Verify agent appears in list
    const listRes = await request(app)
      .get('/v1/agents')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    const agent = listRes.body.find((a: any) => a.id === agentId);
    expect(agent).toBeDefined();
    expect(agent.status).toBe('Connected');

    // 4. Cleanup
    await request(app)
      .delete(`/v1/agents/${agentId}`)
      .set('Authorization', `Bearer ${adminToken}`);
  });
});
```

### 3. Patch Management Workflow

```typescript
// tests/e2e/patches.e2e.test.ts
describe('E2E: Patch Management', () => {
  it('should complete test-approve-deploy workflow', async () => {
    // 1. Create a patch
    const createRes = await request(app)
      .post('/v1/patches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        patchId: 'KB-E2E-TEST-001',
        title: 'E2E Test Security Patch',
        severity: 'High',
        releaseDate: new Date().toISOString(),
        rebootRequired: false,
      });

    expect(createRes.status).toBe(201);
    const patchId = createRes.body.id;

    // 2. Test the patch
    const testRes = await request(app)
      .post(`/v1/patches/${patchId}/test`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'passed',
        notes: 'Tested on 5 endpoints, no issues',
      });

    expect(testRes.status).toBe(200);
    expect(testRes.body.testStatus).toBe('passed');

    // 3. Approve the patch
    const approveRes = await request(app)
      .post(`/v1/patches/${patchId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.approvalStatus).toBe('approved');

    // 4. Create deployment
    const deployRes = await request(app)
      .post('/v1/patches/deployed')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'E2E Test Deployment',
        type: 'INSTANT',
        configType: 'INSTALL',
        scope: 'Endpoint',
        endpoints: ['test-endpoint-1'],
        patchIds: [patchId],
      });

    expect(deployRes.status).toBe(201);
    expect(deployRes.body.status).toBe('IN_PROGRESS');

    // 5. Check deployment tasks
    const tasksRes = await request(app)
      .get(`/v1/patches/deployed/${deployRes.body.id}/tasks`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(tasksRes.status).toBe(200);
  });
});
```

### 4. Full User Journey

```typescript
// tests/e2e/full-workflow.e2e.test.ts
describe('E2E: Complete User Journey', () => {
  let authToken: string;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'admin@patchiq.io', password: 'admin123' });
    authToken = loginRes.body.accessToken;
  });

  it('should complete full security workflow', async () => {
    // 1. View dashboard
    const dashboardRes = await request(app)
      .get('/v1/dashboard')
      .set('Authorization', `Bearer ${authToken}`);

    expect(dashboardRes.status).toBe(200);
    expect(dashboardRes.body.stats).toBeDefined();

    // 2. View vulnerabilities
    const vulnsRes = await request(app)
      .get('/v1/vulnerabilities?severity=CRITICAL')
      .set('Authorization', `Bearer ${authToken}`);

    expect(vulnsRes.status).toBe(200);

    // 3. View patches
    const patchesRes = await request(app)
      .get('/v1/patches')
      .set('Authorization', `Bearer ${authToken}`);

    expect(patchesRes.status).toBe(200);

    // 4. View assets
    const assetsRes = await request(app)
      .get('/v1/assets')
      .set('Authorization', `Bearer ${authToken}`);

    expect(assetsRes.status).toBe(200);

    // 5. View agents
    const agentsRes = await request(app)
      .get('/v1/agents')
      .set('Authorization', `Bearer ${authToken}`);

    expect(agentsRes.status).toBe(200);

    // 6. Generate report
    const reportRes = await request(app)
      .post('/v1/reports')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'E2E Test Report',
        type: 'Vulnerability',
        format: 'CSV',
      });

    expect(reportRes.status).toBe(201);
  });
});
```

---

## MSW Handler Verification

```typescript
// tests/e2e/msw-compatibility.e2e.test.ts
import * as fs from 'fs';
import * as path from 'path';

describe('MSW Handler Compatibility', () => {
  // Load MSW handlers from frontend
  const handlersDir = path.join(__dirname, '../../../frontend/src/mocks/handlers');

  it('should match all MSW handler response shapes', async () => {
    // For each MSW handler, verify backend returns same shape
    // This ensures frontend can switch from MSW to real API seamlessly

    // Example: agents handlers
    const agentsRes = await request(app)
      .get('/v1/agents')
      .set('Authorization', `Bearer ${authToken}`);

    // Verify response matches MSW mock shape
    expect(agentsRes.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          machineId: expect.any(String),
          name: expect.any(String),
          status: expect.stringMatching(/Connected|Disconnected|Pending|Error/),
          os: expect.stringMatching(/Windows|MacOS|Linux/),
        }),
      ])
    );
  });
});
```

---

## Performance Tests

```typescript
// tests/performance/api-benchmark.test.ts
describe('API Performance', () => {
  it('should handle 100 concurrent requests', async () => {
    const requests = Array(100).fill(null).map(() =>
      request(app)
        .get('/v1/assets')
        .set('Authorization', `Bearer ${authToken}`)
    );

    const start = Date.now();
    const responses = await Promise.all(requests);
    const duration = Date.now() - start;

    responses.forEach((res) => {
      expect(res.status).toBe(200);
    });

    // Should complete in under 5 seconds
    expect(duration).toBeLessThan(5000);
  });

  it('should respond within 200ms for simple queries', async () => {
    const start = Date.now();
    await request(app)
      .get('/v1/user/me')
      .set('Authorization', `Bearer ${authToken}`);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(200);
  });
});
```

---

## Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npm run test:e2e -- auth.e2e.test.ts

# Run with real external services
REAL_SERVICES=true npm run test:e2e

# Run with coverage
npm run test:e2e:coverage
```

---

## Verification Checklist

- [ ] All auth flows work end-to-end
- [ ] Agent registration and heartbeat work
- [ ] Patch test/approve/deploy workflow works
- [ ] All CRUD operations work for every module
- [ ] Error responses match expected format
- [ ] API responses match MSW handler shapes
- [ ] Performance targets met
- [ ] Concurrent request handling works
- [ ] Rate limiting works correctly
