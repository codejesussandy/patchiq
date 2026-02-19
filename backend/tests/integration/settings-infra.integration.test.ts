// @ts-nocheck
import { getAgent, getAdminToken, prisma } from './test-setup';

const FAKE_UUID = '00000000-0000-0000-0000-000000000000';

// ============================================
// Server Settings
// ============================================
describe('Settings - Server Settings', () => {
  it('GET /v1/settings/server returns server settings', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent.get('/v1/settings/server').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('logLevel');
    expect(res.body.data).toHaveProperty('sessionTimeoutMinutes');
  });

  it('GET /v1/settings/server returns 401 without token', async () => {
    const res = await getAgent().get('/v1/settings/server');
    expect(res.status).toBe(401);
  });

  it('PUT /v1/settings/server updates server settings', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .put('/v1/settings/server')
      .set('Authorization', `Bearer ${token}`)
      .send({ logLevel: 'Debug', sessionTimeoutMinutes: 90 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.logLevel).toBe('Debug');
  });

  it('PUT /v1/settings/server returns 400 with invalid logLevel', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .put('/v1/settings/server')
      .set('Authorization', `Bearer ${token}`)
      .send({ logLevel: 'INVALID_LEVEL' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ============================================
// Agent Configuration
// ============================================
describe('Settings - Agent Configuration', () => {
  it('GET /v1/settings/agent-configuration returns agent config', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent.get('/v1/settings/agent-configuration').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('GET /v1/settings/agent-configuration returns 401 without token', async () => {
    const res = await getAgent().get('/v1/settings/agent-configuration');
    expect(res.status).toBe(401);
  });

  it('PUT /v1/settings/agent-configuration updates agent config', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .put('/v1/settings/agent-configuration')
      .set('Authorization', `Bearer ${token}`)
      .send({ agentRefreshCycle: 300, allowedBandwidth: 100 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('PUT /v1/settings/agent-configuration returns 400 with invalid value', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .put('/v1/settings/agent-configuration')
      .set('Authorization', `Bearer ${token}`)
      .send({ agentRefreshCycle: 5 }); // min is 60
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /v1/settings/agent-configuration/reset resets to defaults', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post('/v1/settings/agent-configuration/reset')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ============================================
// Enroll Secrets
// ============================================
describe('Settings - Enroll Secrets', () => {
  let createdSecretId = null;

  afterAll(async () => {
    await prisma.enrollSecret.deleteMany({ where: { name: { startsWith: 'INTTEST-' } } });
  });

  it('GET /v1/settings/enroll-secrets returns list', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent.get('/v1/settings/enroll-secrets').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /v1/settings/enroll-secrets returns 401 without token', async () => {
    const res = await getAgent().get('/v1/settings/enroll-secrets');
    expect(res.status).toBe(401);
  });

  it('POST /v1/settings/enroll-secrets creates a secret', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post('/v1/settings/enroll-secrets')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'INTTEST-Secret-1' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('INTTEST-Secret-1');
    createdSecretId = res.body.data.id;
  });

  it('POST /v1/settings/enroll-secrets returns 400 with missing name', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post('/v1/settings/enroll-secrets')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /v1/settings/enroll-secrets/:id returns secret', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .get(`/v1/settings/enroll-secrets/${createdSecretId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(createdSecretId);
  });

  it('GET /v1/settings/enroll-secrets/:id returns 404 for non-existent', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .get(`/v1/settings/enroll-secrets/${FAKE_UUID}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('PUT /v1/settings/enroll-secrets/:id updates secret', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .put(`/v1/settings/enroll-secrets/${createdSecretId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'INTTEST-Secret-Updated', isActive: false });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('INTTEST-Secret-Updated');
  });

  it('DELETE /v1/settings/enroll-secrets/:id deletes secret', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .delete(`/v1/settings/enroll-secrets/${createdSecretId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
    createdSecretId = null;
  });
});

// ============================================
// Password Policy
// ============================================
describe('Settings - Password Policy', () => {
  it('GET /v1/settings/password-policy returns policy', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent.get('/v1/settings/password-policy').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('PUT /v1/settings/password-policy updates policy', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .put('/v1/settings/password-policy')
      .set('Authorization', `Bearer ${token}`)
      .send({ minCharacterCount: 10, minNumbers: true });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ============================================
// Proxy Server
// ============================================
describe('Settings - Proxy Server', () => {
  it('GET /v1/settings/proxy-server returns proxy config', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent.get('/v1/settings/proxy-server').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('enabled');
  });

  it('PUT /v1/settings/proxy-server updates proxy with disabled state', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .put('/v1/settings/proxy-server')
      .set('Authorization', `Bearer ${token}`)
      .send({ enabled: false });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('PUT /v1/settings/proxy-server returns 400 when enabled without host/port', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .put('/v1/settings/proxy-server')
      .set('Authorization', `Bearer ${token}`)
      .send({ enabled: true });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ============================================
// Mail Server
// ============================================
describe('Settings - Mail Server', () => {
  it('GET /v1/settings/mail-server returns mail config', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent.get('/v1/settings/mail-server').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('PUT /v1/settings/mail-server updates mail config', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .put('/v1/settings/mail-server')
      .set('Authorization', `Bearer ${token}`)
      .send({ host: 'smtp.example.com', port: 587, protocol: 'TLS', fromAddress: 'noreply@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('PUT /v1/settings/mail-server returns 400 with invalid email', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .put('/v1/settings/mail-server')
      .set('Authorization', `Bearer ${token}`)
      .send({ host: 'smtp.example.com', port: 587, protocol: 'TLS', fromAddress: 'not-email' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ============================================
// Audit Logs
// ============================================
describe('Settings - Audit Logs', () => {
  it('GET /v1/settings/audit returns audit logs', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent.get('/v1/settings/audit').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /v1/settings/audit returns 401 without token', async () => {
    const res = await getAgent().get('/v1/settings/audit');
    expect(res.status).toBe(401);
  });

  it('GET /v1/settings/audit/filter-options returns filter options', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent.get('/v1/settings/audit/filter-options').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ============================================
// Platform License
// ============================================
describe('Settings - Platform License', () => {
  it('GET /v1/settings/platform-license returns license info', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent.get('/v1/settings/platform-license').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ============================================
// Vulnerability Preference
// ============================================
describe('Settings - Vulnerability Preference', () => {
  it('GET /v1/settings/vulnerability-preference returns preference', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent.get('/v1/settings/vulnerability-preference').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('PUT /v1/settings/vulnerability-preference updates preference', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .put('/v1/settings/vulnerability-preference')
      .set('Authorization', `Bearer ${token}`)
      .send({ scanJobInterval: 7, scanJobUnit: 'Day' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ============================================
// Risk Score
// ============================================
describe('Settings - Risk Score', () => {
  it('GET /v1/settings/risk-score returns risk score settings', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent.get('/v1/settings/risk-score').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('PUT /v1/settings/risk-score updates with defaults flag', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .put('/v1/settings/risk-score')
      .set('Authorization', `Bearer ${token}`)
      .send({ applyDefaultSettings: true });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ============================================
// Remote Desktop
// ============================================
describe('Settings - Remote Desktop', () => {
  it('GET /v1/settings/remote-desktop returns settings', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent.get('/v1/settings/remote-desktop').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('PUT /v1/settings/remote-desktop updates settings', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .put('/v1/settings/remote-desktop')
      .set('Authorization', `Bearer ${token}`)
      .send({ connectionType: 'Local', userConsent: true });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('PUT /v1/settings/remote-desktop returns 400 with invalid connectionType', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .put('/v1/settings/remote-desktop')
      .set('Authorization', `Bearer ${token}`)
      .send({ connectionType: 'InvalidType' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ============================================
// Patch Management
// ============================================
describe('Settings - Patch Management', () => {
  it('GET /v1/settings/patch-management returns settings', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent.get('/v1/settings/patch-management').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('PUT /v1/settings/patch-management updates settings', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .put('/v1/settings/patch-management')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ============================================
// Patch Preferences
// ============================================
describe('Settings - Patch Preferences', () => {
  it('GET /v1/settings/patch-preferences returns preferences', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent.get('/v1/settings/patch-preferences').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('PUT /v1/settings/patch-preferences updates preferences', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .put('/v1/settings/patch-preferences')
      .set('Authorization', `Bearer ${token}`)
      .send({ enablePatching: true, patchApprovalPolicy: 'PreApproved' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ============================================
// Computer Groups
// ============================================
describe('Settings - Computer Groups', () => {
  let createdGroupId = null;

  afterAll(async () => {
    await prisma.computerGroup.deleteMany({ where: { name: { startsWith: 'INTTEST-' } } });
  });

  it('GET /v1/settings/computer-groups returns paginated list', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent.get('/v1/settings/computer-groups').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('data');
    expect(Array.isArray(res.body.data.data)).toBe(true);
  });

  it('GET /v1/settings/computer-groups returns 401 without token', async () => {
    const res = await getAgent().get('/v1/settings/computer-groups');
    expect(res.status).toBe(401);
  });

  it('POST /v1/settings/computer-groups creates a group', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post('/v1/settings/computer-groups')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'INTTEST-Group-1', description: 'Test group', endpoints: [] });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('INTTEST-Group-1');
    createdGroupId = res.body.data.id;
  });

  it('POST /v1/settings/computer-groups returns 400 with missing name', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post('/v1/settings/computer-groups')
      .set('Authorization', `Bearer ${token}`)
      .send({ endpoints: [] });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /v1/settings/computer-groups/:id returns group', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .get(`/v1/settings/computer-groups/${createdGroupId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(createdGroupId);
  });

  it('GET /v1/settings/computer-groups/:id returns 404 for non-existent', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .get(`/v1/settings/computer-groups/${FAKE_UUID}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('PUT /v1/settings/computer-groups/:id updates group', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .put(`/v1/settings/computer-groups/${createdGroupId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'INTTEST-Group-Updated' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('INTTEST-Group-Updated');
  });

  it('DELETE /v1/settings/computer-groups/:id deletes group', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .delete(`/v1/settings/computer-groups/${createdGroupId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
    createdGroupId = null;
  });
});

// ============================================
// Deployment Policies
// ============================================
describe('Settings - Deployment Policies', () => {
  let createdPolicyId = null;

  afterAll(async () => {
    if (createdPolicyId) {
      await prisma.deploymentPolicy.deleteMany({ where: { name: { startsWith: 'INTTEST-' } } });
    }
  });

  it('GET /v1/settings/deployment-policies returns paginated list', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent.get('/v1/settings/deployment-policies').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('data');
    expect(Array.isArray(res.body.data.data)).toBe(true);
  });

  it('GET /v1/settings/deployment-policies returns 401 without token', async () => {
    const res = await getAgent().get('/v1/settings/deployment-policies');
    expect(res.status).toBe(401);
  });

  it('POST /v1/settings/deployment-policies creates a policy', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post('/v1/settings/deployment-policies')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'INTTEST-Policy-1', type: 'INSTANT', supportedModule: 'All' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('INTTEST-Policy-1');
    createdPolicyId = res.body.data.id;
  });

  it('POST /v1/settings/deployment-policies returns 400 with missing name', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post('/v1/settings/deployment-policies')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'INSTANT' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /v1/settings/deployment-policies/:id returns policy', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .get(`/v1/settings/deployment-policies/${createdPolicyId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(createdPolicyId);
  });

  it('PUT /v1/settings/deployment-policies/:id updates policy', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .put(`/v1/settings/deployment-policies/${createdPolicyId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'INTTEST-Policy-Updated' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('INTTEST-Policy-Updated');
  });

  it('DELETE /v1/settings/deployment-policies/:id deletes policy', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .delete(`/v1/settings/deployment-policies/${createdPolicyId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
    createdPolicyId = null;
  });
});

// ============================================
// Distribution Servers
// ============================================
describe('Settings - Distribution Servers', () => {
  let createdServerId = null;

  afterAll(async () => {
    await prisma.distributionServer.deleteMany({ where: { name: { startsWith: 'INTTEST-' } } });
  });

  it('GET /v1/settings/distribution-servers returns list', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent.get('/v1/settings/distribution-servers').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /v1/settings/distribution-servers creates a server', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post('/v1/settings/distribution-servers')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'INTTEST-Server-1', url: 'https://dist.example.com', status: 'Active' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('INTTEST-Server-1');
    createdServerId = res.body.data.id;
  });

  it('POST /v1/settings/distribution-servers returns 400 with invalid URL', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post('/v1/settings/distribution-servers')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'INTTEST-Bad-Server', url: 'not-a-url' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /v1/settings/distribution-servers/:id returns server', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .get(`/v1/settings/distribution-servers/${createdServerId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(createdServerId);
  });

  it('GET /v1/settings/distribution-servers/:id returns 404 for non-existent', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .get(`/v1/settings/distribution-servers/${FAKE_UUID}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('PUT /v1/settings/distribution-servers/:id updates server', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .put(`/v1/settings/distribution-servers/${createdServerId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'INTTEST-Server-Updated', status: 'Maintenance' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('INTTEST-Server-Updated');
  });

  it('DELETE /v1/settings/distribution-servers/:id deletes server', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .delete(`/v1/settings/distribution-servers/${createdServerId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
    createdServerId = null;
  });
});

// ============================================
// Branding
// ============================================
describe('Settings - Branding', () => {
  it('GET /v1/settings/branding returns branding info', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent.get('/v1/settings/branding').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('GET /v1/settings/branding returns 401 without token', async () => {
    const res = await getAgent().get('/v1/settings/branding');
    expect(res.status).toBe(401);
  });
});

// ============================================
// Integrations
// ============================================
describe('Settings - Integrations', () => {
  let createdIntegrationId = null;

  afterAll(async () => {
    await prisma.integration.deleteMany({ where: { name: { startsWith: 'INTTEST-' } } });
  });

  it('GET /v1/settings/integrations returns list', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent.get('/v1/settings/integrations').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /v1/settings/integrations returns 401 without token', async () => {
    const res = await getAgent().get('/v1/settings/integrations');
    expect(res.status).toBe(401);
  });

  it('POST /v1/settings/integrations creates an integration', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post('/v1/settings/integrations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'INTTEST-Integration-1', type: 'siem', enabled: false });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('INTTEST-Integration-1');
    createdIntegrationId = res.body.data.id;
  });

  it('POST /v1/settings/integrations returns 400 with invalid type', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post('/v1/settings/integrations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'INTTEST-Bad-Type', type: 'invalid_type' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /v1/settings/integrations/:id returns integration', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .get(`/v1/settings/integrations/${createdIntegrationId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(createdIntegrationId);
  });

  it('GET /v1/settings/integrations/:id returns 404 for non-existent', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .get(`/v1/settings/integrations/${FAKE_UUID}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('PUT /v1/settings/integrations/:id updates integration', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .put(`/v1/settings/integrations/${createdIntegrationId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'INTTEST-Integration-Updated' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('INTTEST-Integration-Updated');
  });

  it('PUT /v1/settings/integrations/:id/toggle toggles integration status', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .put(`/v1/settings/integrations/${createdIntegrationId}/toggle`)
      .set('Authorization', `Bearer ${token}`)
      .send({ enabled: true });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('DELETE /v1/settings/integrations/:id deletes integration', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .delete(`/v1/settings/integrations/${createdIntegrationId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
    createdIntegrationId = null;
  });
});

// ============================================
// Vendor Logos (read-only — skip upload tests)
// ============================================
describe('Settings - Vendor Logos', () => {
  it('GET /v1/settings/vendor-logos returns list', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent.get('/v1/settings/vendor-logos').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /v1/settings/vendor-logos returns 401 without token', async () => {
    const res = await getAgent().get('/v1/settings/vendor-logos');
    expect(res.status).toBe(401);
  });

  it('GET /v1/settings/vendor-logos/:id returns 404 for non-existent', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .get(`/v1/settings/vendor-logos/${FAKE_UUID}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

// ============================================
// Agent Approvals
// ============================================
describe('Settings - Agent Approvals', () => {
  it('GET /v1/settings/agent-approvals returns list', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent.get('/v1/settings/agent-approvals').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /v1/settings/agent-approvals returns 401 without token', async () => {
    const res = await getAgent().get('/v1/settings/agent-approvals');
    expect(res.status).toBe(401);
  });

  it('POST /v1/settings/agent-approvals/:id/approve returns 404 for non-existent', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post(`/v1/settings/agent-approvals/${FAKE_UUID}/approve`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('POST /v1/settings/agent-approvals/:id/reject returns 404 for non-existent', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post(`/v1/settings/agent-approvals/${FAKE_UUID}/reject`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

// ============================================
// Agent Approval Settings
// ============================================
describe('Settings - Agent Approval Settings', () => {
  it('GET /v1/settings/agent-approval-settings returns settings', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent.get('/v1/settings/agent-approval-settings').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('PUT /v1/settings/agent-approval-settings updates settings', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .put('/v1/settings/agent-approval-settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ approvalType: 'AUTO', autoApprovalBasedOn: 'ALL' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('PUT /v1/settings/agent-approval-settings returns 400 with invalid approvalType', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .put('/v1/settings/agent-approval-settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ approvalType: 'INVALID' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ============================================
// RedHat Nominations
// ============================================
describe('Settings - RedHat Nominations', () => {
  let createdNominationId = null;
  let agentId = null;

  beforeAll(async () => {
    // Find an existing agent to use for nomination
    const existingAgent = await prisma.agent.findFirst();
    if (existingAgent) {
      agentId = existingAgent.id;
    }
  });

  afterAll(async () => {
    if (createdNominationId) {
      await prisma.redHatNomination.deleteMany({ where: { id: createdNominationId } });
    }
  });

  it('GET /v1/settings/redhat-nominations returns list', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent.get('/v1/settings/redhat-nominations').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /v1/settings/redhat-nominations returns 401 without token', async () => {
    const res = await getAgent().get('/v1/settings/redhat-nominations');
    expect(res.status).toBe(401);
  });

  it('POST /v1/settings/redhat-nominations returns 400 or 404 for non-RHEL agent', async () => {
    if (!agentId) {
      return; // skip if no agents in db
    }
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post('/v1/settings/redhat-nominations')
      .set('Authorization', `Bearer ${token}`)
      .send({ agentId, name: 'INTTEST-Nomination-1' });
    // Seed agents typically have non-RHEL OS, so expect 400 (bad request for OS mismatch)
    // OR 201 if the seed agent happens to be RHEL
    expect([400, 409, 201]).toContain(res.status);
    if (res.status === 201) {
      createdNominationId = res.body.data.id;
    }
  });

  it('POST /v1/settings/redhat-nominations returns 400 with invalid agentId', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .post('/v1/settings/redhat-nominations')
      .set('Authorization', `Bearer ${token}`)
      .send({ agentId: 'not-a-uuid', name: 'INTTEST-Bad' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /v1/settings/redhat-nominations/:id returns 404 for non-existent', async () => {
    const agent = getAgent();
    const token = await getAdminToken();
    const res = await agent
      .get(`/v1/settings/redhat-nominations/${FAKE_UUID}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
