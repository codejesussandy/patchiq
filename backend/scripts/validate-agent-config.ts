/**
 * Pipeline 2E Validation Script — Agent Configuration & Enrollment
 *
 * Validates all 45 scenarios end-to-end against a running PatchIQ backend.
 * Creates test secrets, agents, versions, nominations; runs scenarios;
 * cleans up; and reports results.
 *
 * Usage: npx tsx backend/scripts/validate-agent-config.ts
 */

const BASE_URL = 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@patchiq.io';
const ADMIN_PASSWORD = 'admin123';
const PREFIX = 'agent-cfg-test-';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Result {
  id: string;
  description: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

const RESULTS: Result[] = [];

// Track resources for cleanup
const createdSecretIds: string[] = [];
const createdVersionIds: string[] = [];
const createdNominationIds: string[] = [];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function api(
  method: string,
  path: string,
  opts?: {
    token?: string;
    agentToken?: string;
    agentId?: string;
    body?: unknown;
  },
): Promise<{ status: number; data: any }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (opts?.token) {
    headers['Authorization'] = `Bearer ${opts.token}`;
  }
  if (opts?.agentToken) {
    headers['Authorization'] = `Bearer ${opts.agentToken}`;
  }
  if (opts?.agentId) {
    headers['X-Agent-Id'] = opts.agentId;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });

  // 204 No Content — return empty data
  if (res.status === 204) {
    return { status: 204, data: null };
  }

  let data: any;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  return { status: res.status, data };
}

function record(id: string, description: string, pass: boolean, details: string): void {
  const status = pass ? 'PASS' : 'FAIL';
  RESULTS.push({ id, description, status, details });
  const icon = pass ? '[PASS]' : '[FAIL]';
  console.log(`  ${icon} ${id}: ${description} -- ${details}`);
}

function errorMsg(data: any): string {
  if (!data) return '';
  const msg = data.error?.message || data.error?.code || data.message || data.raw || JSON.stringify(data);
  return typeof msg === 'string' ? msg.toLowerCase() : String(msg).toLowerCase();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

async function login(): Promise<string> {
  const res = await api('POST', '/v1/auth/login', {
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  if (res.status !== 200) {
    throw new Error(`Admin login failed: ${res.status} ${JSON.stringify(res.data)}`);
  }
  const d = res.data?.data || res.data;
  return d.accessToken;
}

// ---------------------------------------------------------------------------
// Agent registration helper
// ---------------------------------------------------------------------------

let machineCounter = 0;

function nextMachineId(): string {
  machineCounter++;
  return `${PREFIX}m${machineCounter}`;
}

async function registerAgent(
  enrollSecret?: string,
  overrides?: Partial<{
    machineId: string;
    hostname: string;
    os: string;
    osVersion: string;
    architecture: string;
    agentVersion: string;
  }>,
): Promise<{ status: number; data: any }> {
  const body: any = {
    machineId: overrides?.machineId || nextMachineId(),
    hostname: overrides?.hostname || `${PREFIX}host`,
    os: overrides?.os || 'WINDOWS',
    osVersion: overrides?.osVersion || 'Windows 11 Pro',
    architecture: overrides?.architecture || 'amd64',
    agentVersion: overrides?.agentVersion || '1.0.0',
  };
  if (enrollSecret !== undefined) {
    body.enrollSecret = enrollSecret;
  }
  return api('POST', '/api/agent/register', { body });
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

async function cleanup(token: string): Promise<void> {
  console.log('\nCleaning up test data...');

  // Delete nominations
  for (const id of createdNominationIds) {
    try {
      await api('DELETE', `/v1/settings/redhat-nominations/${id}`, { token });
    } catch { /* ignore */ }
  }
  if (createdNominationIds.length > 0) {
    console.log(`  Deleted ${createdNominationIds.length} nomination(s)`);
  }

  // Delete versions
  for (const id of createdVersionIds) {
    try {
      await api('DELETE', `/v1/agent-versions/${id}`, { token });
    } catch { /* ignore */ }
  }
  if (createdVersionIds.length > 0) {
    console.log(`  Deleted ${createdVersionIds.length} version(s)`);
  }

  // Delete secrets
  for (const id of createdSecretIds) {
    try {
      await api('DELETE', `/v1/settings/enroll-secrets/${id}`, { token });
    } catch { /* ignore */ }
  }
  if (createdSecretIds.length > 0) {
    console.log(`  Deleted ${createdSecretIds.length} secret(s)`);
  }

  // Reset agent config to defaults
  try {
    await api('POST', '/v1/settings/agent-configuration/reset', { token });
    console.log('  Reset agent configuration to defaults');
  } catch { /* ignore */ }

  // Reset approval settings to MANUAL
  try {
    await api('PUT', '/v1/settings/agent-approval-settings', {
      token,
      body: { approvalType: 'MANUAL' },
    });
    console.log('  Reset approval settings to MANUAL');
  } catch { /* ignore */ }

  console.log('  Cleanup complete.');
}

// ---------------------------------------------------------------------------
// Enroll Secret CRUD (V1-V6)
// ---------------------------------------------------------------------------

async function enrollSecretCrud(token: string): Promise<{ secretId1: string; secretId2: string; secretValue: string }> {
  console.log('\n--- Enroll Secret CRUD (V1-V6) ---');

  let secretId1 = '';
  let secretId2 = '';
  let secretValue = '';

  // V1: Create enroll secret
  {
    const res = await api('POST', '/v1/settings/enroll-secrets', {
      token,
      body: { name: `${PREFIX}secret-1` },
    });
    const d = res.data?.data || res.data;
    const pass = res.status === 201 && d?.secret && d.secret.length === 64;
    secretId1 = d?.id || '';
    secretValue = d?.secret || '';
    if (secretId1) createdSecretIds.push(secretId1);
    record('V1', 'Create enroll secret -> 201, 64-char hex', pass,
      `status=${res.status}, secretLen=${d?.secret?.length || 0}`);
  }

  // V2: Create second secret
  {
    const res = await api('POST', '/v1/settings/enroll-secrets', {
      token,
      body: { name: `${PREFIX}secret-2` },
    });
    const d = res.data?.data || res.data;
    const pass = res.status === 201;
    secretId2 = d?.id || '';
    if (secretId2) createdSecretIds.push(secretId2);
    record('V2', 'Create second secret -> 201', pass, `status=${res.status}`);
  }

  // V3: List secrets — all masked
  {
    const res = await api('GET', '/v1/settings/enroll-secrets', { token });
    const d = res.data?.data || res.data;
    const list = Array.isArray(d) ? d : (d?.items || []);
    const hasEnough = list.length >= 2;
    const allMasked = list.every((s: any) => {
      const sec = s.secret || s.maskedSecret || '';
      return sec.includes('...') || sec.includes('*') || sec === '';
    });
    record('V3', 'List secrets -> >=2, all masked', res.status === 200 && hasEnough && allMasked,
      `status=${res.status}, count=${list.length}, allMasked=${allMasked}`);
  }

  // V4: Get secret by ID — masked
  {
    const res = await api('GET', `/v1/settings/enroll-secrets/${secretId1}`, { token });
    const d = res.data?.data || res.data;
    const sec = d?.secret || d?.maskedSecret || '';
    const isMasked = sec.includes('...') || sec.includes('*') || sec === '';
    record('V4', 'Get secret by ID -> masked', res.status === 200 && isMasked,
      `status=${res.status}, masked=${isMasked}`);
  }

  // V5: Deactivate secret
  {
    const res = await api('PUT', `/v1/settings/enroll-secrets/${secretId2}`, {
      token,
      body: { isActive: false },
    });
    const d = res.data?.data || res.data;
    record('V5', 'Deactivate secret -> isActive=false', res.status === 200 && d?.isActive === false,
      `status=${res.status}, isActive=${d?.isActive}`);
  }

  // V6: Delete one secret (delete secret2, keep secret1 for enrollment tests)
  {
    const res = await api('DELETE', `/v1/settings/enroll-secrets/${secretId2}`, { token });
    record('V6', 'Delete secret -> 204', res.status === 204, `status=${res.status}`);
    // Remove from cleanup list since it's already deleted
    const idx = createdSecretIds.indexOf(secretId2);
    if (idx >= 0) createdSecretIds.splice(idx, 1);
  }

  return { secretId1, secretId2: '', secretValue };
}

// ---------------------------------------------------------------------------
// Enrollment Enforcement (V7-V13)
// ---------------------------------------------------------------------------

async function enrollmentEnforcement(
  token: string,
  activeSecret: string,
  activeSecretId: string,
): Promise<{ agentId: string; agentToken: string }> {
  console.log('\n--- Enrollment Enforcement (V7-V13) ---');

  let savedAgentId = '';
  let savedAgentToken = '';

  // V7: Register with valid secret
  {
    const res = await registerAgent(activeSecret);
    const d = res.data?.data || res.data;
    const pass = res.status === 200 || res.status === 201;
    savedAgentId = d?.agentId || '';
    savedAgentToken = d?.accessToken || '';
    record('V7', 'Register with valid secret', pass,
      `status=${res.status}, agentId=${savedAgentId}`);
  }

  // V8: Register with invalid secret
  {
    const res = await registerAgent('0000000000000000000000000000000000000000000000000000000000000000');
    const msg = errorMsg(res.data);
    record('V8', 'Register with invalid secret -> 401 "Invalid"',
      res.status === 401 && msg.includes('invalid'),
      `status=${res.status}, msg=${msg.slice(0, 80)}`);
  }

  // V9: Register without secret (when secrets exist)
  {
    const res = await registerAgent(undefined);
    const msg = errorMsg(res.data);
    record('V9', 'Register without secret -> 401 "required"',
      res.status === 401 && msg.includes('required'),
      `status=${res.status}, msg=${msg.slice(0, 80)}`);
  }

  // V10: Register with expired secret
  {
    const createRes = await api('POST', '/v1/settings/enroll-secrets', {
      token,
      body: {
        name: `${PREFIX}expired`,
        expiresAt: '2020-01-01T00:00:00Z',
      },
    });
    const d = createRes.data?.data || createRes.data;
    const expiredSecret = d?.secret || '';
    if (d?.id) createdSecretIds.push(d.id);

    const res = await registerAgent(expiredSecret);
    const msg = errorMsg(res.data);
    record('V10', 'Register with expired secret -> 401 "expired"',
      res.status === 401 && msg.includes('expired'),
      `status=${res.status}, msg=${msg.slice(0, 80)}`);
  }

  // V11: Register with over-limit secret (maxUses:1)
  {
    const createRes = await api('POST', '/v1/settings/enroll-secrets', {
      token,
      body: {
        name: `${PREFIX}limited`,
        maxUses: 1,
      },
    });
    const d = createRes.data?.data || createRes.data;
    const limitedSecret = d?.secret || '';
    if (d?.id) createdSecretIds.push(d.id);

    // First registration should succeed
    const res1 = await registerAgent(limitedSecret);
    const pass1 = res1.status === 200 || res1.status === 201;

    // Second should fail
    const res2 = await registerAgent(limitedSecret);
    const msg2 = errorMsg(res2.data);
    record('V11', 'Register with over-limit secret -> 401 "limit"',
      pass1 && res2.status === 401 && msg2.includes('limit'),
      `first=${res1.status}, second=${res2.status}, msg=${msg2.slice(0, 80)}`);
  }

  // V12: Register with inactive secret
  {
    const createRes = await api('POST', '/v1/settings/enroll-secrets', {
      token,
      body: { name: `${PREFIX}inactive` },
    });
    const d = createRes.data?.data || createRes.data;
    const inactiveSecret = d?.secret || '';
    if (d?.id) createdSecretIds.push(d.id);

    // Deactivate it
    await api('PUT', `/v1/settings/enroll-secrets/${d?.id}`, {
      token,
      body: { isActive: false },
    });

    const res = await registerAgent(inactiveSecret);
    const msg = errorMsg(res.data);
    record('V12', 'Register with inactive secret -> 401 "inactive"',
      res.status === 401 && msg.includes('inactive'),
      `status=${res.status}, msg=${msg.slice(0, 80)}`);
  }

  // V13: Verify usedCount incremented
  {
    const res = await api('GET', `/v1/settings/enroll-secrets/${activeSecretId}`, { token });
    const d = res.data?.data || res.data;
    const usedCount = d?.usedCount ?? d?.useCount ?? -1;
    record('V13', 'usedCount incremented after registration',
      usedCount >= 1,
      `usedCount=${usedCount}`);
  }

  return { agentId: savedAgentId, agentToken: savedAgentToken };
}

// ---------------------------------------------------------------------------
// Approval Settings (V14-V21)
// ---------------------------------------------------------------------------

async function approvalSettings(token: string): Promise<void> {
  console.log('\n--- Approval Settings (V14-V21) ---');

  // V14: Get default approval settings
  {
    const res = await api('GET', '/v1/settings/agent-approval-settings', { token });
    const d = res.data?.data || res.data;
    record('V14', 'Default approval = MANUAL',
      res.status === 200 && d?.approvalType === 'MANUAL',
      `status=${res.status}, approvalType=${d?.approvalType}`);
  }

  // V15: Set auto-approve ALL
  {
    const res = await api('PUT', '/v1/settings/agent-approval-settings', {
      token,
      body: { approvalType: 'AUTO', autoApprovalBasedOn: 'ALL' },
    });
    record('V15', 'Set auto-approve ALL -> 200', res.status === 200, `status=${res.status}`);
  }

  // V16: Register agent with auto-approve -> CONNECTED
  {
    const res = await registerAgent(undefined);
    const d = res.data?.data || res.data;
    record('V16', 'Register with auto-approve -> CONNECTED',
      (res.status === 200 || res.status === 201) && d?.status === 'CONNECTED',
      `status=${res.status}, agentStatus=${d?.status}`);
  }

  // V17: Set manual-approve
  {
    const res = await api('PUT', '/v1/settings/agent-approval-settings', {
      token,
      body: { approvalType: 'MANUAL' },
    });
    record('V17', 'Set manual-approve -> 200', res.status === 200, `status=${res.status}`);
  }

  // V18: Register with manual -> PENDING_APPROVAL
  let pendingAgentId = '';
  let pendingAgentToken = '';
  {
    const res = await registerAgent(undefined);
    const d = res.data?.data || res.data;
    pendingAgentId = d?.agentId || '';
    pendingAgentToken = d?.accessToken || '';
    record('V18', 'Register with manual -> PENDING_APPROVAL',
      (res.status === 200 || res.status === 201) && d?.status === 'PENDING_APPROVAL',
      `status=${res.status}, agentStatus=${d?.status}`);
  }

  // V19: Approve pending agent
  {
    if (pendingAgentId) {
      const res = await api('POST', `/v1/settings/agent-approvals/${pendingAgentId}/approve`, { token });
      record('V19', 'Approve pending agent -> 200', res.status === 200,
        `status=${res.status}`);
    } else {
      record('V19', 'Approve pending agent', false, 'No pending agent to approve');
    }
  }

  // V20: Reject a pending agent
  let rejectedAgentId = '';
  let rejectedAgentToken = '';
  {
    // Register another agent under manual mode
    const regRes = await registerAgent(undefined);
    const d = regRes.data?.data || regRes.data;
    rejectedAgentId = d?.agentId || '';
    rejectedAgentToken = d?.accessToken || '';

    if (rejectedAgentId) {
      const res = await api('POST', `/v1/settings/agent-approvals/${rejectedAgentId}/reject`, { token });
      record('V20', 'Reject pending agent -> 200', res.status === 200,
        `status=${res.status}`);
    } else {
      record('V20', 'Reject pending agent', false, 'No pending agent to reject');
    }
  }

  // V21: Rejected agent heartbeat -> 403
  {
    if (rejectedAgentId && rejectedAgentToken) {
      const res = await api('POST', '/api/agent/heartbeat', {
        agentToken: rejectedAgentToken,
        agentId: rejectedAgentId,
        body: {
          timestamp: new Date().toISOString(),
          status: 'healthy',
          uptime: 3600,
          agentUptime: 1800,
          cpuUsage: 25,
          memoryUsage: 40,
          diskUsage: 60,
          pendingReboot: false,
        },
      });
      record('V21', 'Rejected agent heartbeat -> 403', res.status === 403,
        `status=${res.status}`);
    } else {
      record('V21', 'Rejected agent heartbeat', false, 'No rejected agent available');
    }
  }
}

// ---------------------------------------------------------------------------
// Agent Configuration (V22-V29)
// ---------------------------------------------------------------------------

async function agentConfiguration(
  token: string,
  agentId: string,
  agentToken: string,
): Promise<void> {
  console.log('\n--- Agent Configuration (V22-V29) ---');

  // V22: Get default config
  {
    const res = await api('GET', '/v1/settings/agent-configuration', { token });
    const d = res.data?.data || res.data;
    const hasFields = d?.allowedBandwidth !== undefined || d?.agentRefreshCycle !== undefined;
    record('V22', 'Get default config -> has expected fields',
      res.status === 200 && hasFields,
      `status=${res.status}, hasFields=${hasFields}`);
  }

  // V23: Update agentRefreshCycle to 120
  {
    const res = await api('PUT', '/v1/settings/agent-configuration', {
      token,
      body: { agentRefreshCycle: 120 },
    });
    record('V23', 'Set agentRefreshCycle=120 -> 200', res.status === 200,
      `status=${res.status}`);
  }

  // V24: Set agentRefreshCycle=30 (below min 60) -> 400
  {
    const res = await api('PUT', '/v1/settings/agent-configuration', {
      token,
      body: { agentRefreshCycle: 30 },
    });
    record('V24', 'agentRefreshCycle=30 (below min) -> 400', res.status === 400,
      `status=${res.status}`);
  }

  // V25: Set allowedBandwidth=0 (below min 1) -> 400
  {
    const res = await api('PUT', '/v1/settings/agent-configuration', {
      token,
      body: { allowedBandwidth: 0 },
    });
    record('V25', 'allowedBandwidth=0 (below min) -> 400', res.status === 400,
      `status=${res.status}`);
  }

  // V26: Set agentRefreshCycle to string -> 400
  {
    const res = await api('PUT', '/v1/settings/agent-configuration', {
      token,
      body: { agentRefreshCycle: 'fast' },
    });
    record('V26', 'agentRefreshCycle="fast" (string) -> 400', res.status === 400,
      `status=${res.status}`);
  }

  // V27: Agent fetches config -> sees 120
  {
    if (agentId && agentToken) {
      const res = await api('GET', '/api/agent/config', {
        agentToken,
        agentId,
      });
      const d = res.data?.data || res.data;
      const cycle = d?.agentRefreshCycle;
      record('V27', 'Agent fetches config -> agentRefreshCycle=120',
        res.status === 200 && cycle === 120,
        `status=${res.status}, agentRefreshCycle=${cycle}`);
    } else {
      record('V27', 'Agent fetches config', false, 'No agent credentials available');
    }
  }

  // V28: Reset config -> 200
  {
    const res = await api('POST', '/v1/settings/agent-configuration/reset', { token });
    record('V28', 'Reset config -> 200', res.status === 200, `status=${res.status}`);
  }

  // V29: Agent fetches config after reset -> default (300)
  {
    if (agentId && agentToken) {
      const res = await api('GET', '/api/agent/config', {
        agentToken,
        agentId,
      });
      const d = res.data?.data || res.data;
      const cycle = d?.agentRefreshCycle;
      record('V29', 'Agent config after reset -> default 300',
        res.status === 200 && cycle === 300,
        `status=${res.status}, agentRefreshCycle=${cycle}`);
    } else {
      record('V29', 'Agent config after reset', false, 'No agent credentials available');
    }
  }
}

// ---------------------------------------------------------------------------
// Agent Versions (V30-V38)
// ---------------------------------------------------------------------------

async function agentVersions(token: string): Promise<void> {
  console.log('\n--- Agent Versions (V30-V38) ---');

  let versionId1 = '';
  let versionId2 = '';

  // V30: Create version 1.0.0 for windows/amd64
  {
    const res = await api('POST', '/v1/agent-versions', {
      token,
      body: {
        platform: 'windows',
        architecture: 'amd64',
        version: '1.0.0',
        releaseNotes: `${PREFIX}v1.0.0 release`,
      },
    });
    const d = res.data?.data || res.data;
    versionId1 = d?.id || '';
    if (versionId1) createdVersionIds.push(versionId1);
    record('V30', 'Create version 1.0.0 windows/amd64 -> 201', res.status === 201,
      `status=${res.status}, id=${versionId1}`);
  }

  // V31: Create version 1.1.0 for windows/amd64
  {
    const res = await api('POST', '/v1/agent-versions', {
      token,
      body: {
        platform: 'windows',
        architecture: 'amd64',
        version: '1.1.0',
        releaseNotes: `${PREFIX}v1.1.0 release`,
      },
    });
    const d = res.data?.data || res.data;
    versionId2 = d?.id || '';
    if (versionId2) createdVersionIds.push(versionId2);
    record('V31', 'Create version 1.1.0 windows/amd64 -> 201', res.status === 201,
      `status=${res.status}, id=${versionId2}`);
  }

  // V32: Create version with invalid semver "1.0"
  {
    const res = await api('POST', '/v1/agent-versions', {
      token,
      body: {
        platform: 'windows',
        architecture: 'amd64',
        version: '1.0',
        releaseNotes: 'bad semver',
      },
    });
    record('V32', 'Invalid semver "1.0" -> 400', res.status === 400,
      `status=${res.status}`);
  }

  // V33: Create duplicate platform+arch+version -> 409
  {
    const res = await api('POST', '/v1/agent-versions', {
      token,
      body: {
        platform: 'windows',
        architecture: 'amd64',
        version: '1.0.0',
        releaseNotes: 'duplicate',
      },
    });
    record('V33', 'Duplicate version -> 409', res.status === 409,
      `status=${res.status}`);
  }

  // V34: Set 1.1.0 as recommended, verify 1.0.0 isRecommended=false
  {
    if (versionId2) {
      const res = await api('PUT', `/v1/agent-versions/${versionId2}`, {
        token,
        body: { isRecommended: true },
      });
      // Now check 1.0.0
      const checkRes = await api('GET', `/v1/agent-versions/${versionId1}`, { token });
      const d = checkRes.data?.data || checkRes.data;
      record('V34', 'Set 1.1.0 recommended -> 1.0.0 not recommended',
        res.status === 200 && d?.isRecommended === false,
        `updateStatus=${res.status}, 1.0.0.isRecommended=${d?.isRecommended}`);
    } else {
      record('V34', 'Set recommended', false, 'No version ID');
    }
  }

  // V35: Get latest for windows/amd64 -> 1.1.0
  {
    const res = await api('GET', '/v1/agent-versions/latest?platform=windows&architecture=amd64', { token });
    const d = res.data?.data || res.data;
    record('V35', 'Latest windows/amd64 -> 1.1.0',
      res.status === 200 && d?.version === '1.1.0',
      `status=${res.status}, version=${d?.version}`);
  }

  // V36: Deprecate 1.0.0
  {
    if (versionId1) {
      const res = await api('PUT', `/v1/agent-versions/${versionId1}`, {
        token,
        body: { isDeprecated: true },
      });
      record('V36', 'Deprecate 1.0.0 -> 200', res.status === 200,
        `status=${res.status}`);
    } else {
      record('V36', 'Deprecate version', false, 'No version ID');
    }
  }

  // V37: List non-deprecated -> 1.0.0 excluded
  {
    const res = await api('GET', '/v1/agent-versions?deprecated=false', { token });
    const d = res.data?.data || res.data;
    const list = Array.isArray(d) ? d : (d?.items || d?.versions || []);
    const has100 = list.some((v: any) => v.version === '1.0.0' && v.platform === 'windows' && v.id === versionId1);
    record('V37', 'List non-deprecated -> 1.0.0 excluded',
      res.status === 200 && !has100,
      `status=${res.status}, count=${list.length}, has1.0.0=${has100}`);
  }

  // V38: Delete version (delete 1.0.0)
  {
    if (versionId1) {
      const res = await api('DELETE', `/v1/agent-versions/${versionId1}`, { token });
      const pass = res.status === 200 || res.status === 204;
      record('V38', 'Delete version -> 200/204', pass, `status=${res.status}`);
      if (pass) {
        const idx = createdVersionIds.indexOf(versionId1);
        if (idx >= 0) createdVersionIds.splice(idx, 1);
      }
    } else {
      record('V38', 'Delete version', false, 'No version ID');
    }
  }
}

// ---------------------------------------------------------------------------
// RedHat Nominations (V39-V44)
// ---------------------------------------------------------------------------

async function redhatNominations(token: string): Promise<void> {
  console.log('\n--- RedHat Nominations (V39-V44) ---');

  // First, set auto-approve so our RHEL agent gets CONNECTED status
  await api('PUT', '/v1/settings/agent-approval-settings', {
    token,
    body: { approvalType: 'AUTO', autoApprovalBasedOn: 'ALL' },
  });

  // Register a RHEL agent
  const rhelReg = await registerAgent(undefined, {
    os: 'LINUX',
    osVersion: 'Red Hat Enterprise Linux 8.6',
    hostname: `${PREFIX}rhel-host`,
  });
  const rhelAgent = rhelReg.data?.data || rhelReg.data;
  const rhelAgentId = rhelAgent?.agentId || '';

  // Register a Windows agent for V41
  const winReg = await registerAgent(undefined, {
    os: 'WINDOWS',
    osVersion: 'Windows 11 Pro',
    hostname: `${PREFIX}win-host`,
  });
  const winAgent = winReg.data?.data || winReg.data;
  const winAgentId = winAgent?.agentId || '';

  // Reset to manual after registration
  await api('PUT', '/v1/settings/agent-approval-settings', {
    token,
    body: { approvalType: 'MANUAL' },
  });

  let nominationId = '';

  // V39: Nominate RHEL agent
  {
    if (rhelAgentId) {
      const res = await api('POST', '/v1/settings/redhat-nominations', {
        token,
        body: {
          agentId: rhelAgentId,
          name: `${PREFIX}rhel-nomination`,
        },
      });
      const d = res.data?.data || res.data;
      nominationId = d?.id || '';
      if (nominationId) createdNominationIds.push(nominationId);
      record('V39', 'Nominate RHEL agent -> 201', res.status === 201,
        `status=${res.status}, id=${nominationId}`);
    } else {
      record('V39', 'Nominate RHEL agent', false, 'No RHEL agent registered');
    }
  }

  // V40: Re-nominate same agent -> 409
  {
    if (rhelAgentId) {
      const res = await api('POST', '/v1/settings/redhat-nominations', {
        token,
        body: {
          agentId: rhelAgentId,
          name: `${PREFIX}rhel-nomination-dup`,
        },
      });
      record('V40', 'Re-nominate same agent -> 409', res.status === 409,
        `status=${res.status}`);
    } else {
      record('V40', 'Re-nominate', false, 'No RHEL agent');
    }
  }

  // V41: Nominate Windows agent -> 400 "Red Hat"
  {
    if (winAgentId) {
      const res = await api('POST', '/v1/settings/redhat-nominations', {
        token,
        body: {
          agentId: winAgentId,
          name: `${PREFIX}win-nomination`,
        },
      });
      const msg = errorMsg(res.data);
      record('V41', 'Nominate Windows agent -> 400 "Red Hat"',
        res.status === 400 && msg.includes('red hat'),
        `status=${res.status}, msg=${msg.slice(0, 80)}`);
    } else {
      record('V41', 'Nominate Windows agent', false, 'No Windows agent');
    }
  }

  // V42: Approve nomination -> PUT status=APPROVED
  {
    if (nominationId) {
      const res = await api('PUT', `/v1/settings/redhat-nominations/${nominationId}`, {
        token,
        body: { status: 'APPROVED' },
      });
      record('V42', 'Approve nomination -> 200', res.status === 200,
        `status=${res.status}`);
    } else {
      record('V42', 'Approve nomination', false, 'No nomination');
    }
  }

  // V43: Set sync time
  {
    if (nominationId) {
      const res = await api('PUT', `/v1/settings/redhat-nominations/${nominationId}`, {
        token,
        body: { scheduledTime: '03:00' },
      });
      record('V43', 'Set scheduledTime="03:00" -> 200', res.status === 200,
        `status=${res.status}`);
    } else {
      record('V43', 'Set sync time', false, 'No nomination');
    }
  }

  // V44: Delete nomination -> 204
  {
    if (nominationId) {
      const res = await api('DELETE', `/v1/settings/redhat-nominations/${nominationId}`, { token });
      record('V44', 'Delete nomination -> 204', res.status === 204,
        `status=${res.status}`);
      const idx = createdNominationIds.indexOf(nominationId);
      if (idx >= 0) createdNominationIds.splice(idx, 1);
    } else {
      record('V44', 'Delete nomination', false, 'No nomination');
    }
  }
}

// ---------------------------------------------------------------------------
// Full Enrollment Flow (V45)
// ---------------------------------------------------------------------------

async function fullEnrollmentFlow(token: string): Promise<void> {
  console.log('\n--- Full Enrollment Flow (V45) ---');

  // Step 1: Create a fresh secret for this flow
  const secretRes = await api('POST', '/v1/settings/enroll-secrets', {
    token,
    body: { name: `${PREFIX}flow-secret` },
  });
  const secretData = secretRes.data?.data || secretRes.data;
  const flowSecret = secretData?.secret || '';
  if (secretData?.id) createdSecretIds.push(secretData.id);

  // Step 2: Set auto-approve
  await api('PUT', '/v1/settings/agent-approval-settings', {
    token,
    body: { approvalType: 'AUTO', autoApprovalBasedOn: 'ALL' },
  });

  // Step 3: Update agent config
  await api('PUT', '/v1/settings/agent-configuration', {
    token,
    body: { agentRefreshCycle: 180 },
  });

  // Step 4: Register agent with the secret
  const regRes = await registerAgent(flowSecret, {
    hostname: `${PREFIX}flow-host`,
  });
  const regData = regRes.data?.data || regRes.data;
  const flowAgentId = regData?.agentId || '';
  const flowAgentToken = regData?.accessToken || '';
  const isConnected = regData?.status === 'CONNECTED';

  // Step 5: Heartbeat
  let heartbeatOk = false;
  if (flowAgentId && flowAgentToken) {
    const hbRes = await api('POST', '/api/agent/heartbeat', {
      agentToken: flowAgentToken,
      agentId: flowAgentId,
      body: {
        timestamp: new Date().toISOString(),
        status: 'healthy',
        uptime: 3600,
        agentUptime: 1800,
        cpuUsage: 15,
        memoryUsage: 35,
        diskUsage: 55,
        pendingReboot: false,
      },
    });
    heartbeatOk = hbRes.status === 200;
  }

  // Step 6: Fetch config
  let configOk = false;
  let configCycle: number | undefined;
  if (flowAgentId && flowAgentToken) {
    const cfgRes = await api('GET', '/api/agent/config', {
      agentToken: flowAgentToken,
      agentId: flowAgentId,
    });
    const cfgData = cfgRes.data?.data || cfgRes.data;
    configCycle = cfgData?.agentRefreshCycle;
    configOk = cfgRes.status === 200 && configCycle === 180;
  }

  const allPass = isConnected && heartbeatOk && configOk;
  record('V45', 'Full flow: secret -> auto-approve -> register -> heartbeat -> config',
    allPass,
    `connected=${isConnected}, heartbeat=${heartbeatOk}, config=${configOk} (cycle=${configCycle})`);

  // Reset config for cleanup
  await api('POST', '/v1/settings/agent-configuration/reset', { token });
  await api('PUT', '/v1/settings/agent-approval-settings', {
    token,
    body: { approvalType: 'MANUAL' },
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('==============================================');
  console.log('  Pipeline 2E: Agent Configuration & Enrollment');
  console.log('  E2E Validation Script (45 scenarios)');
  console.log('==============================================');

  // 1. Health check
  console.log('\nChecking backend availability...');
  try {
    const res = await api('POST', '/v1/auth/login', {
      body: { email: 'health-check@test.io', password: 'x' },
    });
    if (!res.status) {
      console.error('Backend is not reachable at', BASE_URL);
      process.exit(1);
    }
    console.log('Backend is reachable.');
  } catch (err) {
    console.error('Backend is not reachable at', BASE_URL);
    console.error('Error:', (err as Error).message);
    process.exit(1);
  }

  // 2. Login as admin
  console.log('Logging in as admin...');
  const adminToken = await login();
  console.log('Admin login successful.');

  // 3. Pre-cleanup: delete all active enroll secrets so enrollment tests
  //    that require "no active secrets" mode work correctly.
  //    Also delete leftover test data from previous runs.
  console.log('\nPre-cleanup...');

  // Remove any leftover test secrets from previous runs
  {
    const res = await api('GET', '/v1/settings/enroll-secrets', { token: adminToken });
    const d = res.data?.data || res.data;
    const list = Array.isArray(d) ? d : (d?.items || []);
    for (const s of list) {
      if (s.name && s.name.startsWith(PREFIX)) {
        await api('DELETE', `/v1/settings/enroll-secrets/${s.id}`, { token: adminToken });
        console.log(`  Deleted leftover secret: ${s.name}`);
      }
    }
  }

  // Remove leftover test versions
  {
    const res = await api('GET', '/v1/agent-versions', { token: adminToken });
    const d = res.data?.data || res.data;
    const list = Array.isArray(d) ? d : (d?.items || d?.versions || []);
    for (const v of list) {
      if (v.releaseNotes && v.releaseNotes.startsWith(PREFIX)) {
        await api('DELETE', `/v1/agent-versions/${v.id}`, { token: adminToken });
        console.log(`  Deleted leftover version: ${v.version}`);
      }
    }
  }

  // Remove leftover test nominations
  {
    const res = await api('GET', '/v1/settings/redhat-nominations', { token: adminToken });
    const d = res.data?.data || res.data;
    const list = Array.isArray(d) ? d : (d?.items || []);
    for (const n of list) {
      if (n.name && n.name.startsWith(PREFIX)) {
        await api('DELETE', `/v1/settings/redhat-nominations/${n.id}`, { token: adminToken });
        console.log(`  Deleted leftover nomination: ${n.name}`);
      }
    }
  }

  // Remove leftover test agents
  {
    const res = await api('GET', '/v1/agents', { token: adminToken });
    const d = res.data?.data || res.data;
    const list = Array.isArray(d) ? d : (d?.items || []);
    for (const a of list) {
      if (a.machineId && a.machineId.startsWith(PREFIX)) {
        await api('DELETE', `/v1/agents/${a.id}`, { token: adminToken });
        console.log(`  Deleted leftover agent: ${a.machineId}`);
      }
    }
  }

  // Reset agent config and approval settings
  try {
    await api('POST', '/v1/settings/agent-configuration/reset', { token: adminToken });
  } catch { /* ignore */ }
  try {
    await api('PUT', '/v1/settings/agent-approval-settings', {
      token: adminToken,
      body: { approvalType: 'MANUAL' },
    });
  } catch { /* ignore */ }

  console.log('Pre-cleanup complete.');

  try {
    // 4. Run all scenario groups

    // --- V1-V6: Enroll Secret CRUD ---
    const { secretId1, secretValue } = await enrollSecretCrud(adminToken);

    // --- V7-V13: Enrollment Enforcement ---
    // These tests need an active secret to enforce enrollment
    const { agentId: enrolledAgentId, agentToken: enrolledAgentToken } =
      await enrollmentEnforcement(adminToken, secretValue, secretId1);

    // Delete all test secrets before approval tests so agents can register
    // without needing an enroll secret
    console.log('\n  Cleaning secrets before approval tests...');
    for (const id of [...createdSecretIds]) {
      await api('DELETE', `/v1/settings/enroll-secrets/${id}`, { token: adminToken });
      const idx = createdSecretIds.indexOf(id);
      if (idx >= 0) createdSecretIds.splice(idx, 1);
    }

    // --- V14-V21: Approval Settings ---
    await approvalSettings(adminToken);

    // --- V22-V29: Agent Configuration ---
    // For config delivery tests, we need a connected agent.
    // If we have one from enrollment, use it; otherwise register a fresh one.
    let configAgentId = enrolledAgentId;
    let configAgentToken = enrolledAgentToken;

    if (!configAgentId || !configAgentToken) {
      // Set auto-approve, register, then reset
      await api('PUT', '/v1/settings/agent-approval-settings', {
        token: adminToken,
        body: { approvalType: 'AUTO', autoApprovalBasedOn: 'ALL' },
      });
      const reg = await registerAgent(undefined);
      const d = reg.data?.data || reg.data;
      configAgentId = d?.agentId || '';
      configAgentToken = d?.accessToken || '';
      await api('PUT', '/v1/settings/agent-approval-settings', {
        token: adminToken,
        body: { approvalType: 'MANUAL' },
      });
    }

    await agentConfiguration(adminToken, configAgentId, configAgentToken);

    // --- V30-V38: Agent Versions ---
    await agentVersions(adminToken);

    // --- V39-V44: RedHat Nominations ---
    await redhatNominations(adminToken);

    // --- V45: Full Enrollment Flow ---
    await fullEnrollmentFlow(adminToken);

  } finally {
    // 5. Cleanup
    await cleanup(adminToken);
  }

  // 6. Print summary
  console.log('\n==============================================');
  console.log('  VALIDATION SUMMARY');
  console.log('==============================================');
  const passed = RESULTS.filter((r) => r.status === 'PASS').length;
  const failed = RESULTS.filter((r) => r.status === 'FAIL').length;
  console.log(`  ${passed}/${RESULTS.length} PASS, ${failed} FAIL`);
  console.log('==============================================\n');

  if (failed > 0) {
    console.log('Failed scenarios:');
    for (const r of RESULTS.filter((r) => r.status === 'FAIL')) {
      console.log(`  [FAIL] ${r.id}: ${r.description} -- ${r.details}`);
    }
    console.log('');
  }

  if (failed === 0) {
    console.log('All 45 scenarios validated successfully!');
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
