/**
 * R4 Vulnerability Preferences RBAC Validation Script
 *
 * Validates all vulnerability-related endpoints work correctly with RBAC per PRD R4.
 * Tests view/add/edit/delete permissions across different roles.
 *
 * Usage: DATABASE_URL="..." npx tsx backend/scripts/validate-r4-vulnerabilities.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@patchiq.io';
const ADMIN_PASSWORD = 'admin123';
const TEST_PASSWORD = 'TestPass123!';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Result {
  id: string;
  description: string;
  expected: string;
  actual: string;
  status: 'PASS' | 'FAIL';
}

interface TokenMap {
  admin: string;
  user: string;
  vulnViewOnly: string;
  vulnFull: string;
  noPerms: string;
  settingsEditor: string;
}

const RESULTS: Result[] = [];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function api(
  method: string,
  path: string,
  token?: string,
  body?: unknown,
): Promise<{ status: number; data: any }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: any;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  return { status: res.status, data };
}

function record(
  id: string,
  description: string,
  expected: string,
  actual: number | string,
  pass: boolean,
): void {
  const status = pass ? 'PASS' : 'FAIL';
  const actualStr = typeof actual === 'number' ? `${actual}` : actual;
  RESULTS.push({ id, description, expected, actual: actualStr, status });
  const icon = pass ? '✓' : '✗';
  console.log(`  ${icon} ${id}: ${description} (expected: ${expected}, got: ${actualStr})`);
}

function perm(view: boolean, add: boolean, edit: boolean, del: boolean) {
  return { view, add, edit, delete: del };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

async function preCleanup(): Promise<void> {
  console.log('\nPre-cleanup: removing leftover test data...');

  // Hard-delete leftover test users
  const deletedUsers = await prisma.user.deleteMany({
    where: { email: { startsWith: 'r4-vuln-', endsWith: '@test.io' } },
  });
  if (deletedUsers.count > 0) {
    console.log(`  Hard-deleted ${deletedUsers.count} leftover test user(s)`);
  }

  // Hard-delete leftover test roles
  const deletedRoles = await prisma.role.deleteMany({
    where: { name: { startsWith: 'r4-vuln-test-' }, isSystem: false },
  });
  if (deletedRoles.count > 0) {
    console.log(`  Hard-deleted ${deletedRoles.count} leftover test role(s)`);
  }

  // Hard-delete leftover test exceptions
  const deletedExceptions = await prisma.vulnerabilityException.deleteMany({
    where: {
      OR: [
        { cveIds: { has: 'CVE-9999-0001' } },
        { reason: { contains: 'R4 Test Exception' } },
      ]
    },
  });
  if (deletedExceptions.count > 0) {
    console.log(`  Hard-deleted ${deletedExceptions.count} leftover test exception(s)`);
  }
}

async function setup(adminToken: string): Promise<{
  roleIds: Record<string, string>;
  userIds: Record<string, string>;
}> {
  await preCleanup();

  console.log('\nSetting up test data...');

  // Create custom test roles
  const vulnViewOnlyPerms = {
    vulnerabilities: perm(true, false, false, false),
    dashboard: perm(true, false, false, false),
  };

  const vulnFullPerms = {
    vulnerabilities: perm(true, true, true, true),
    dashboard: perm(true, false, false, false),
  };

  const settingsEditorPerms = {
    settings: perm(true, true, true, false),
  };

  const roleDefs = [
    { name: 'r4-vuln-test-view-only', permissions: vulnViewOnlyPerms },
    { name: 'r4-vuln-test-full', permissions: vulnFullPerms },
    { name: 'r4-vuln-test-no-perms', permissions: {} },
    { name: 'r4-vuln-test-settings', permissions: settingsEditorPerms },
  ];

  const roleIds: Record<string, string> = {};

  for (const def of roleDefs) {
    const res = await api('POST', '/v1/settings/roles', adminToken, {
      name: def.name,
      description: `R4 Test role for vulnerability RBAC validation`,
      permissions: def.permissions,
    });
    if (res.status === 201 || res.status === 200) {
      const role = res.data?.data || res.data;
      roleIds[def.name] = role.id;
      console.log(`  Created role: ${def.name} (${role.id})`);
    } else {
      console.error(`  ERROR creating role ${def.name}: ${res.status} ${JSON.stringify(res.data)}`);
      process.exit(1);
    }
  }

  // Create test users
  const userDefs = [
    { email: 'r4-vuln-user@test.io', name: 'R4 User', role: 'user' },
    { email: 'r4-vuln-view-only@test.io', name: 'R4 View Only', role: 'r4-vuln-test-view-only' },
    { email: 'r4-vuln-full@test.io', name: 'R4 Full Access', role: 'r4-vuln-test-full' },
    { email: 'r4-vuln-no-perms@test.io', name: 'R4 No Perms', role: 'r4-vuln-test-no-perms' },
    { email: 'r4-vuln-settings@test.io', name: 'R4 Settings', role: 'r4-vuln-test-settings' },
  ];

  const userIds: Record<string, string> = {};

  for (const def of userDefs) {
    const res = await api('POST', '/v1/settings/users', adminToken, {
      email: def.email,
      name: def.name,
      password: TEST_PASSWORD,
      role: def.role,
    });
    if (res.status === 201 || res.status === 200) {
      const user = res.data?.data || res.data;
      userIds[def.email] = user.id;
      console.log(`  Created user: ${def.email} (${user.id})`);
    } else {
      console.error(
        `  ERROR creating user ${def.email}: ${res.status} ${JSON.stringify(res.data)}`,
      );
      process.exit(1);
    }
  }

  return { roleIds, userIds };
}

async function loginAs(email: string, password: string): Promise<string> {
  const res = await api('POST', '/v1/auth/login', undefined, { email, password });
  if (res.status !== 200) {
    throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(res.data)}`);
  }
  const d = res.data?.data || res.data;
  return d.accessToken;
}

async function getTokens(): Promise<TokenMap> {
  console.log('\nLogging in as test users...');

  const admin = await loginAs(ADMIN_EMAIL, ADMIN_PASSWORD);
  console.log('  Logged in as admin');

  const user = await loginAs('r4-vuln-user@test.io', TEST_PASSWORD);
  console.log('  Logged in as user');

  const vulnViewOnly = await loginAs('r4-vuln-view-only@test.io', TEST_PASSWORD);
  console.log('  Logged in as vuln-view-only');

  const vulnFull = await loginAs('r4-vuln-full@test.io', TEST_PASSWORD);
  console.log('  Logged in as vuln-full');

  const noPerms = await loginAs('r4-vuln-no-perms@test.io', TEST_PASSWORD);
  console.log('  Logged in as no-perms');

  const settingsEditor = await loginAs('r4-vuln-settings@test.io', TEST_PASSWORD);
  console.log('  Logged in as settings-editor');

  return {
    admin,
    user,
    vulnViewOnly,
    vulnFull,
    noPerms,
    settingsEditor,
  };
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

async function cleanup(): Promise<void> {
  console.log('\nCleaning up...');

  // Hard-delete test exceptions first
  const deletedExceptions = await prisma.vulnerabilityException.deleteMany({
    where: {
      OR: [
        { cveIds: { has: 'CVE-9999-0001' } },
        { reason: { contains: 'R4 Test Exception' } },
      ]
    },
  });
  if (deletedExceptions.count > 0) {
    console.log(`  Hard-deleted ${deletedExceptions.count} test exception(s)`);
  }

  // Hard-delete test users
  const deletedUsers = await prisma.user.deleteMany({
    where: { email: { startsWith: 'r4-vuln-', endsWith: '@test.io' } },
  });
  console.log(`  Hard-deleted ${deletedUsers.count} test user(s)`);

  // Hard-delete test roles
  const deletedRoles = await prisma.role.deleteMany({
    where: { name: { startsWith: 'r4-vuln-test-' }, isSystem: false },
  });
  console.log(`  Hard-deleted ${deletedRoles.count} test role(s)`);
}

// ---------------------------------------------------------------------------
// R4 Validation Scenarios
// ---------------------------------------------------------------------------

async function runScenarios(tokens: TokenMap): Promise<void> {
  console.log('\n==================================');
  console.log('Running R4 Vulnerability Validation Scenarios...');
  console.log('==================================\n');

  // T4.1: GET /v1/vulnerabilities with view permission → 200
  console.log('T4.1: GET /v1/vulnerabilities (vulnerabilities:view) → 200');
  {
    const res = await api('GET', '/v1/vulnerabilities', tokens.user);
    record('T4.1a', 'User can list vulnerabilities', '200', res.status, res.status === 200);
  }
  {
    const res = await api('GET', '/v1/vulnerabilities', tokens.vulnViewOnly);
    record('T4.1b', 'View-only can list vulnerabilities', '200', res.status, res.status === 200);
  }
  {
    const res = await api('GET', '/v1/vulnerabilities', tokens.vulnFull);
    record('T4.1c', 'Full access can list vulnerabilities', '200', res.status, res.status === 200);
  }

  // T4.2: GET /v1/vulnerabilities/zero-day with view permission → 200
  console.log('\nT4.2: GET /v1/vulnerabilities/zero-day (vulnerabilities:view) → 200');
  {
    const res = await api('GET', '/v1/vulnerabilities/zero-day', tokens.user);
    record('T4.2a', 'User can list zero-day', '200', res.status, res.status === 200);
  }
  {
    const res = await api('GET', '/v1/vulnerabilities/zero-day', tokens.vulnViewOnly);
    record('T4.2b', 'View-only can list zero-day', '200', res.status, res.status === 200);
  }

  // T4.3: GET /v1/vulnerabilities/stats with view permission → 200
  console.log('\nT4.3: GET /v1/vulnerabilities/stats (vulnerabilities:view) → 200');
  {
    const res = await api('GET', '/v1/vulnerabilities/stats', tokens.user);
    record('T4.3a', 'User can get stats', '200', res.status, res.status === 200);
  }
  {
    const res = await api('GET', '/v1/vulnerabilities/stats', tokens.vulnFull);
    record('T4.3b', 'Full access can get stats', '200', res.status, res.status === 200);
  }

  // T4.4: GET /v1/vulnerabilities/sync/status with view permission → 200
  console.log('\nT4.4: GET /v1/vulnerabilities/sync/status (vulnerabilities:view) → 200');
  {
    const res = await api('GET', '/v1/vulnerabilities/sync/status', tokens.user);
    record('T4.4a', 'User can get sync status', '200', res.status, res.status === 200);
  }
  {
    const res = await api('GET', '/v1/vulnerabilities/sync/status', tokens.vulnViewOnly);
    record('T4.4b', 'View-only can get sync status', '200', res.status, res.status === 200);
  }

  // T4.5: POST /v1/vulnerabilities/sync with edit permission → 200/202
  console.log('\nT4.5: POST /v1/vulnerabilities/sync (vulnerabilities:edit) → 200/202');
  {
    const res = await api('POST', '/v1/vulnerabilities/sync', tokens.vulnFull);
    const pass = res.status === 200 || res.status === 202;
    record('T4.5a', 'Full access can trigger sync', '200/202', res.status, pass);
  }

  // T4.6: POST /v1/vulnerabilities/sync/full with edit permission → 200/202
  console.log('\nT4.6: POST /v1/vulnerabilities/sync/full (vulnerabilities:edit) → 200/202');
  {
    const res = await api('POST', '/v1/vulnerabilities/sync/full', tokens.vulnFull);
    const pass = res.status === 200 || res.status === 202;
    record('T4.6a', 'Full access can trigger full sync', '200/202', res.status, pass);
  }

  // T4.7: POST /v1/vulnerabilities/exceptions with add permission → 201
  console.log('\nT4.7: POST /v1/vulnerabilities/exceptions (vulnerabilities:add) → 201');
  let exceptionId: string | null = null;
  {
    const res = await api('POST', '/v1/vulnerabilities/exceptions', tokens.vulnFull, {
      cveIds: ['CVE-9999-0001'],
      assetIds: [],
      reason: 'R4 Test Exception - False Positive',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const pass = res.status === 201 || res.status === 200;
    record('T4.7a', 'Full access can create exception', '201', res.status, pass);
    if (pass) {
      const d = res.data?.data || res.data;
      exceptionId = Array.isArray(d) ? d[0]?.id : d?.id;
    }
  }

  // T4.8: PUT /v1/vulnerabilities/exceptions/:id with edit permission → 200
  console.log('\nT4.8: PUT /v1/vulnerabilities/exceptions/:id (vulnerabilities:edit) → 200');
  if (exceptionId) {
    const res = await api('PUT', `/v1/vulnerabilities/exceptions/${exceptionId}`, tokens.vulnFull, {
      reason: 'R4 Test Exception - Updated Reason',
    });
    record('T4.8a', 'Full access can update exception', '200', res.status, res.status === 200);
  } else {
    record('T4.8a', 'Full access can update exception', '200', 'SKIP', false);
  }

  // T4.9: DELETE /v1/vulnerabilities/exceptions/:id with delete permission → 200
  console.log('\nT4.9: DELETE /v1/vulnerabilities/exceptions/:id (vulnerabilities:delete) → 200');
  if (exceptionId) {
    const res = await api('DELETE', `/v1/vulnerabilities/exceptions/${exceptionId}`, tokens.vulnFull);
    const pass = res.status === 200 || res.status === 204;
    record('T4.9a', 'Full access can delete exception', '200/204', res.status, pass);
  } else {
    record('T4.9a', 'Full access can delete exception', '200/204', 'SKIP', false);
  }

  // T4.10: POST /v1/vulnerabilities/scan with edit permission → 200/202
  console.log('\nT4.10: POST /v1/vulnerabilities/scan (vulnerabilities:edit) → 200/202');
  {
    const res = await api('POST', '/v1/vulnerabilities/scan', tokens.vulnFull, {
      assetIds: [],
    });
    const pass = res.status === 200 || res.status === 202 || res.status === 400; // 400 OK if no assets
    record('T4.10a', 'Full access can trigger scan', '200/202/400', res.status, pass);
  }

  // T4.11: GET /v1/settings/vulnerability-preference with settings:view → 200
  console.log('\nT4.11: GET /v1/settings/vulnerability-preference (settings:view) → 200');
  {
    const res = await api('GET', '/v1/settings/vulnerability-preference', tokens.admin);
    record('T4.11a', 'Admin can view vuln preferences', '200', res.status, res.status === 200);
  }
  {
    const res = await api('GET', '/v1/settings/vulnerability-preference', tokens.settingsEditor);
    record('T4.11b', 'Settings editor can view vuln preferences', '200', res.status, res.status === 200);
  }

  // T4.12: PUT /v1/settings/vulnerability-preference with settings:edit → 200
  console.log('\nT4.12: PUT /v1/settings/vulnerability-preference (settings:edit) → 200');
  {
    const res = await api('PUT', '/v1/settings/vulnerability-preference', tokens.admin, {
      enableAutoSync: true,
      syncFrequency: 'DAILY',
    });
    record('T4.12a', 'Admin can update vuln preferences', '200', res.status, res.status === 200);
  }
  {
    const res = await api('PUT', '/v1/settings/vulnerability-preference', tokens.settingsEditor, {
      enableAutoSync: false,
    });
    record('T4.12b', 'Settings editor can update vuln preferences', '200', res.status, res.status === 200);
  }

  // T4.13: User role denied on write operations → 403
  console.log('\nT4.13: User role denied on write operations → 403');
  {
    const res = await api('POST', '/v1/vulnerabilities/sync', tokens.user);
    record('T4.13a', 'User denied sync', '403', res.status, res.status === 403);
  }
  {
    const res = await api('POST', '/v1/vulnerabilities/exceptions', tokens.user, {
      cveIds: ['CVE-9999-0002'],
      assetIds: [],
      reason: 'Should fail',
    });
    record('T4.13b', 'User denied create exception', '403', res.status, res.status === 403);
  }
  {
    const res = await api('POST', '/v1/vulnerabilities/scan', tokens.user, { assetIds: [] });
    record('T4.13c', 'User denied scan', '403', res.status, res.status === 403);
  }

  // T4.14: View-only custom role denied on write operations → 403
  console.log('\nT4.14: View-only custom role denied on write operations → 403');
  {
    const res = await api('POST', '/v1/vulnerabilities/sync', tokens.vulnViewOnly);
    record('T4.14a', 'View-only denied sync', '403', res.status, res.status === 403);
  }
  {
    const res = await api('POST', '/v1/vulnerabilities/exceptions', tokens.vulnViewOnly, {
      cveIds: ['CVE-9999-0003'],
      assetIds: [],
      reason: 'Should fail',
    });
    record('T4.14b', 'View-only denied create exception', '403', res.status, res.status === 403);
  }
  {
    const res = await api(
      'DELETE',
      '/v1/vulnerabilities/exceptions/00000000-0000-0000-0000-000000000000',
      tokens.vulnViewOnly,
    );
    record('T4.14c', 'View-only denied delete exception', '403', res.status, res.status === 403);
  }

  // T4.15: No permissions role denied on all operations → 403
  console.log('\nT4.15: No permissions role denied on all operations → 403');
  {
    const res = await api('GET', '/v1/vulnerabilities', tokens.noPerms);
    record('T4.15a', 'No-perms denied list vulnerabilities', '403', res.status, res.status === 403);
  }
  {
    const res = await api('GET', '/v1/vulnerabilities/stats', tokens.noPerms);
    record('T4.15b', 'No-perms denied stats', '403', res.status, res.status === 403);
  }
  {
    const res = await api('POST', '/v1/vulnerabilities/sync', tokens.noPerms);
    record('T4.15c', 'No-perms denied sync', '403', res.status, res.status === 403);
  }

  // T4.16: Vuln user cannot access settings → 403
  console.log('\nT4.16: Vuln user cannot access settings → 403');
  {
    const res = await api('GET', '/v1/settings/vulnerability-preference', tokens.vulnFull);
    record('T4.16a', 'Vuln-full denied settings view', '403', res.status, res.status === 403);
  }
  {
    const res = await api('PUT', '/v1/settings/vulnerability-preference', tokens.vulnFull, {
      enableAutoSync: true,
    });
    record('T4.16b', 'Vuln-full denied settings edit', '403', res.status, res.status === 403);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('==================================');
  console.log('R4 Vulnerability Preferences RBAC Validation');
  console.log('==================================');

  // 1. Health check
  try {
    const healthRes = await api('POST', '/v1/auth/login', undefined, {
      email: 'health-check@test.io',
      password: 'x',
    });
    if (!healthRes.status) {
      console.error('Backend is not reachable at', BASE_URL);
      process.exit(1);
    }
    console.log('Backend is reachable.');
  } catch {
    console.error('Backend is not reachable at', BASE_URL);
    process.exit(1);
  }

  // 2. Login as admin
  const adminToken = await loginAs(ADMIN_EMAIL, ADMIN_PASSWORD);
  console.log('Admin login successful.');

  try {
    // 3. Setup
    await setup(adminToken);

    // 4. Get tokens
    const tokens = await getTokens();

    // 5. Run scenarios
    await runScenarios(tokens);
  } finally {
    // 6. Cleanup
    await cleanup();
    await prisma.$disconnect();
  }

  // 7. Print summary
  console.log('\n==================================');
  console.log('R4 Vulnerability RBAC Validation Summary');
  console.log('==================================');

  const passed = RESULTS.filter((r) => r.status === 'PASS').length;
  const failed = RESULTS.filter((r) => r.status === 'FAIL').length;

  console.log(`\nTotal: ${RESULTS.length} tests`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n❌ Failed tests:');
    for (const r of RESULTS.filter((r) => r.status === 'FAIL')) {
      console.log(`  ${r.id}: ${r.description}`);
      console.log(`    Expected: ${r.expected}, Got: ${r.actual}`);
    }
    console.log('\n==================================');
    console.error('R4 validation FAILED');
    process.exit(1);
  }

  console.log('\n==================================');
  console.log('✅ All R4 vulnerability RBAC tests PASSED!');
  console.log('==================================');
  process.exit(0);
}

main().catch(async (err) => {
  console.error('Fatal error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
