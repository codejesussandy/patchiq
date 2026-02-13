/**
 * RBAC Validation Script
 *
 * Validates all 35 RBAC scenarios end-to-end against a running PatchIQ backend.
 * Creates test roles + users, runs scenarios, cleans up, and reports results.
 *
 * Usage: DATABASE_URL="..." npx tsx backend/scripts/validate-rbac.ts
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
  status: 'PASS' | 'FAIL';
  details: string;
}

interface TokenMap {
  admin: string;
  user: string;
  patchmgr: string;
  viewer: string;
  empty: string;
  settings: string;
}

interface IdMap {
  // Role IDs
  adminRoleId: string;
  userRoleId: string;
  patchMgrRoleId: string;
  viewerRoleId: string;
  emptyRoleId: string;
  settingsRoleId: string;
  // User IDs
  userUserId: string;
  patchmgrUserId: string;
  viewerUserId: string;
  emptyUserId: string;
  settingsUserId: string;
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

function record(id: string, description: string, pass: boolean, details: string): void {
  const status = pass ? 'PASS' : 'FAIL';
  RESULTS.push({ id, description, status, details });
  const icon = pass ? '[PASS]' : '[FAIL]';
  console.log(`  ${icon} ${id}: ${description} -- ${details}`);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Full module permission helper
function perm(view: boolean, add: boolean, edit: boolean, del: boolean) {
  return { view, add, edit, delete: del };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

async function preCleanup(): Promise<void> {
  console.log('\nPre-cleanup: removing leftover test data...');

  // Hard-delete leftover test users (including soft-deleted ones) directly via Prisma.
  // The settings API only lists active users, so soft-deleted leftovers from previous
  // runs can't be cleaned up via API — and they block new user creation (unique email).
  const deletedUsers = await prisma.user.deleteMany({
    where: { email: { startsWith: 'rbac-', endsWith: '@test.io' } },
  });
  if (deletedUsers.count > 0) {
    console.log(`  Hard-deleted ${deletedUsers.count} leftover test user(s)`);
  }

  // Hard-delete leftover test roles
  const deletedRoles = await prisma.role.deleteMany({
    where: { name: { startsWith: 'rbac-test-' }, isSystem: false },
  });
  if (deletedRoles.count > 0) {
    console.log(`  Hard-deleted ${deletedRoles.count} leftover test role(s)`);
  }
}

async function setup(adminToken: string): Promise<IdMap> {
  // Pre-cleanup to handle leftover data from previous failed runs
  await preCleanup();

  console.log('\nSetting up test data...');

  // 1. Find system roles (admin and user)
  const rolesRes = await api('GET', '/v1/settings/roles', adminToken);
  const roles = rolesRes.data?.data || rolesRes.data;
  const adminRole = (Array.isArray(roles) ? roles : []).find(
    (r: any) => r.name === 'admin' && r.isSystem,
  );
  const userRole = (Array.isArray(roles) ? roles : []).find(
    (r: any) => r.name === 'user' && r.isSystem,
  );

  if (!adminRole || !userRole) {
    console.error('  ERROR: Could not find system admin/user roles. Aborting.');
    process.exit(1);
  }

  console.log(`  Found system role: admin (${adminRole.id})`);
  console.log(`  Found system role: user (${userRole.id})`);

  // 2. Create custom test roles
  const patchMgrPerms = {
    patches: perm(true, true, true, false),
    assets: perm(true, false, false, false),
    dashboard: perm(true, false, false, false),
    vulnerabilities: perm(true, false, false, false),
  };

  const viewerPerms = {
    dashboard: perm(true, false, false, false),
    assets: perm(true, false, false, false),
    vulnerabilities: perm(true, false, false, false),
  };

  const settingsEditorPerms = {
    settings: perm(true, true, true, false),
  };

  const roleDefs = [
    { name: 'rbac-test-patch-manager', permissions: patchMgrPerms },
    { name: 'rbac-test-viewer', permissions: viewerPerms },
    { name: 'rbac-test-empty', permissions: {} },
    { name: 'rbac-test-settings-editor', permissions: settingsEditorPerms },
  ];

  const roleIds: Record<string, string> = {};

  for (const def of roleDefs) {
    const res = await api('POST', '/v1/settings/roles', adminToken, {
      name: def.name,
      description: `Test role for RBAC validation`,
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

  // 3. Create test users
  const userDefs = [
    { email: 'rbac-user@test.io', name: 'RBAC User', role: 'user' },
    { email: 'rbac-patchmgr@test.io', name: 'RBAC PatchMgr', role: 'rbac-test-patch-manager' },
    { email: 'rbac-viewer@test.io', name: 'RBAC Viewer', role: 'rbac-test-viewer' },
    { email: 'rbac-empty@test.io', name: 'RBAC Empty', role: 'rbac-test-empty' },
    { email: 'rbac-settings@test.io', name: 'RBAC Settings', role: 'rbac-test-settings-editor' },
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

  return {
    adminRoleId: adminRole.id,
    userRoleId: userRole.id,
    patchMgrRoleId: roleIds['rbac-test-patch-manager'],
    viewerRoleId: roleIds['rbac-test-viewer'],
    emptyRoleId: roleIds['rbac-test-empty'],
    settingsRoleId: roleIds['rbac-test-settings-editor'],
    userUserId: userIds['rbac-user@test.io'],
    patchmgrUserId: userIds['rbac-patchmgr@test.io'],
    viewerUserId: userIds['rbac-viewer@test.io'],
    emptyUserId: userIds['rbac-empty@test.io'],
    settingsUserId: userIds['rbac-settings@test.io'],
  };
}

async function loginAs(email: string, password: string): Promise<{ token: string; data: any }> {
  const res = await api('POST', '/v1/auth/login', undefined, { email, password });
  if (res.status !== 200) {
    throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(res.data)}`);
  }
  const d = res.data?.data || res.data;
  return { token: d.accessToken, data: d };
}

async function getTokens(): Promise<TokenMap> {
  console.log('\nLogging in as test users...');

  const admin = await loginAs(ADMIN_EMAIL, ADMIN_PASSWORD);
  console.log('  Logged in as admin');

  const user = await loginAs('rbac-user@test.io', TEST_PASSWORD);
  console.log('  Logged in as user');

  const patchmgr = await loginAs('rbac-patchmgr@test.io', TEST_PASSWORD);
  console.log('  Logged in as patchmgr');

  const viewer = await loginAs('rbac-viewer@test.io', TEST_PASSWORD);
  console.log('  Logged in as viewer');

  const empty = await loginAs('rbac-empty@test.io', TEST_PASSWORD);
  console.log('  Logged in as empty');

  const settings = await loginAs('rbac-settings@test.io', TEST_PASSWORD);
  console.log('  Logged in as settings');

  return {
    admin: admin.token,
    user: user.token,
    patchmgr: patchmgr.token,
    viewer: viewer.token,
    empty: empty.token,
    settings: settings.token,
  };
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

async function cleanup(): Promise<void> {
  console.log('\nCleaning up...');

  // Hard-delete test users via Prisma (avoids soft-delete FK issues)
  const deletedUsers = await prisma.user.deleteMany({
    where: { email: { startsWith: 'rbac-', endsWith: '@test.io' } },
  });
  console.log(`  Hard-deleted ${deletedUsers.count} test user(s)`);

  // Hard-delete test roles via Prisma
  const deletedRoles = await prisma.role.deleteMany({
    where: { name: { startsWith: 'rbac-test-' }, isSystem: false },
  });
  console.log(`  Hard-deleted ${deletedRoles.count} test role(s)`);
}

// ---------------------------------------------------------------------------
// Validation scenarios
// ---------------------------------------------------------------------------

async function runScenarios(tokens: TokenMap, ids: IdMap): Promise<void> {
  console.log('\nRunning validation scenarios...');

  // V1: Admin can list settings
  {
    const res = await api('GET', '/v1/settings/roles', tokens.admin);
    record('V1', 'Admin can list settings', res.status === 200, `${res.status}`);
  }

  // V2: Admin can create role
  {
    const res = await api('POST', '/v1/settings/roles', tokens.admin, {
      name: 'rbac-test-v2-temp',
      description: 'Temp role for V2',
      permissions: {},
    });
    const pass = res.status === 201 || res.status === 200;
    record('V2', 'Admin can create role', pass, `${res.status}`);
    // Cleanup the temp role
    if (pass) {
      const role = res.data?.data || res.data;
      await api('DELETE', `/v1/settings/roles/${role.id}`, tokens.admin);
    }
  }

  // V3: Admin can delete custom role
  {
    // Create a temp role to delete
    const createRes = await api('POST', '/v1/settings/roles', tokens.admin, {
      name: 'rbac-test-v3-temp',
      description: 'Temp role for V3 delete test',
      permissions: {},
    });
    const role = createRes.data?.data || createRes.data;
    const delRes = await api('DELETE', `/v1/settings/roles/${role.id}`, tokens.admin);
    record(
      'V3',
      'Admin can delete custom role',
      delRes.status === 200 || delRes.status === 204,
      `${delRes.status}`,
    );
  }

  // V4: Admin cannot delete system role
  {
    const res = await api('DELETE', `/v1/settings/roles/${ids.adminRoleId}`, tokens.admin);
    record('V4', 'Admin cannot delete system role', res.status === 400, `${res.status}`);
  }

  // V5: Admin cannot rename system role
  {
    const res = await api('PUT', `/v1/settings/roles/${ids.adminRoleId}`, tokens.admin, {
      name: 'renamed-admin',
    });
    record('V5', 'Admin cannot rename system role', res.status === 400, `${res.status}`);
  }

  // V6: User denied settings
  {
    const res = await api('GET', '/v1/settings/roles', tokens.user);
    record('V6', 'User denied settings', res.status === 403, `${res.status}`);
  }

  // V7: User denied settings write
  {
    const res = await api('POST', '/v1/settings/users', tokens.user, {
      email: 'should-not-create@test.io',
      name: 'Nope',
      password: TEST_PASSWORD,
      role: 'user',
    });
    record('V7', 'User denied settings write', res.status === 403, `${res.status}`);
  }

  // V8: User allowed dashboard view
  {
    const res = await api('GET', '/v1/dashboard/stats', tokens.user);
    record('V8', 'User allowed dashboard view', res.status === 200, `${res.status}`);
  }

  // V9: User allowed asset view
  {
    const res = await api('GET', '/v1/assets', tokens.user);
    record('V9', 'User allowed asset view', res.status === 200, `${res.status}`);
  }

  // V10: User denied asset create
  {
    const res = await api('POST', '/v1/assets', tokens.user, {
      hostname: 'test-host',
      ipAddress: '10.0.0.1',
    });
    record('V10', 'User denied asset create', res.status === 403, `${res.status}`);
  }

  // V11: User allowed vulnerability view
  {
    const res = await api('GET', '/v1/vulnerabilities', tokens.user);
    record('V11', 'User allowed vulnerability view', res.status === 200, `${res.status}`);
  }

  // V12: User denied vulnerability delete
  {
    const res = await api(
      'DELETE',
      '/v1/vulnerabilities/exceptions/00000000-0000-0000-0000-000000000000',
      tokens.user,
    );
    record('V12', 'User denied vulnerability delete', res.status === 403, `${res.status}`);
  }

  // V13: Patch mgr can list patches
  {
    const res = await api('GET', '/v1/patches', tokens.patchmgr);
    record('V13', 'Patch mgr can list patches', res.status === 200, `${res.status}`);
  }

  // V14: Patch mgr can create patch (should NOT be 403)
  {
    const res = await api('POST', '/v1/patches', tokens.patchmgr, {
      name: 'test-patch',
    });
    record(
      'V14',
      'Patch mgr can create patch (not 403)',
      res.status !== 403,
      `${res.status} (any non-403 is OK)`,
    );
  }

  // V15: Patch mgr cannot delete patch
  {
    const res = await api(
      'DELETE',
      '/v1/patches/00000000-0000-0000-0000-000000000000',
      tokens.patchmgr,
    );
    record('V15', 'Patch mgr cannot delete patch', res.status === 403, `${res.status}`);
  }

  // V16: Patch mgr denied settings
  {
    const res = await api('GET', '/v1/settings/roles', tokens.patchmgr);
    record('V16', 'Patch mgr denied settings', res.status === 403, `${res.status}`);
  }

  // V17: Patch mgr can view assets
  {
    const res = await api('GET', '/v1/assets', tokens.patchmgr);
    record('V17', 'Patch mgr can view assets', res.status === 200, `${res.status}`);
  }

  // V18: Patch mgr cannot create asset
  {
    const res = await api('POST', '/v1/assets', tokens.patchmgr, {
      hostname: 'test-host',
      ipAddress: '10.0.0.1',
    });
    record('V18', 'Patch mgr cannot create asset', res.status === 403, `${res.status}`);
  }

  // V19: Viewer can view dashboard
  {
    const res = await api('GET', '/v1/dashboard/stats', tokens.viewer);
    record('V19', 'Viewer can view dashboard', res.status === 200, `${res.status}`);
  }

  // V20: Viewer denied patch create
  {
    const res = await api('POST', '/v1/patches', tokens.viewer, { name: 'test' });
    record('V20', 'Viewer denied patch create', res.status === 403, `${res.status}`);
  }

  // V21: Viewer denied any write
  {
    const res = await api(
      'PUT',
      '/v1/assets/00000000-0000-0000-0000-000000000000',
      tokens.viewer,
      { hostname: 'hacked' },
    );
    record('V21', 'Viewer denied any write', res.status === 403, `${res.status}`);
  }

  // V22: Empty role denied everything (dashboard)
  {
    const res = await api('GET', '/v1/dashboard/stats', tokens.empty);
    record('V22', 'Empty role denied dashboard', res.status === 403, `${res.status}`);
  }

  // V23: Empty role denied everything (assets)
  {
    const res = await api('GET', '/v1/assets', tokens.empty);
    record('V23', 'Empty role denied assets', res.status === 403, `${res.status}`);
  }

  // V24: Empty role denied everything (agents)
  {
    const res = await api('GET', '/v1/agents', tokens.empty);
    record('V24', 'Empty role denied agents', res.status === 403, `${res.status}`);
  }

  // V25: Settings editor view settings
  {
    const res = await api('GET', '/v1/settings/roles', tokens.settings);
    record('V25', 'Settings editor view settings', res.status === 200, `${res.status}`);
  }

  // V26: Settings editor create role
  {
    const res = await api('POST', '/v1/settings/roles', tokens.settings, {
      name: 'rbac-test-v26-temp',
      description: 'Temp role created by settings editor',
      permissions: {},
    });
    const pass = res.status === 201 || res.status === 200;
    record('V26', 'Settings editor create role', pass, `${res.status}`);
    // Cleanup - use admin token since settings editor can't delete
    if (pass) {
      const role = res.data?.data || res.data;
      await api('DELETE', `/v1/settings/roles/${role.id}`, tokens.admin);
    }
  }

  // V27: Settings editor cannot delete role
  {
    // Create a temp role with admin, then try deleting with settings editor
    const createRes = await api('POST', '/v1/settings/roles', tokens.admin, {
      name: 'rbac-test-v27-temp',
      description: 'Temp role for V27',
      permissions: {},
    });
    const role = createRes.data?.data || createRes.data;
    const delRes = await api('DELETE', `/v1/settings/roles/${role.id}`, tokens.settings);
    record('V27', 'Settings editor cannot delete role', delRes.status === 403, `${delRes.status}`);
    // Cleanup with admin
    await api('DELETE', `/v1/settings/roles/${role.id}`, tokens.admin);
  }

  // V28: Invalid permissions JSON rejected
  {
    const res = await api('POST', '/v1/settings/roles', tokens.admin, {
      name: 'rbac-test-v28-bad',
      permissions: { assets: { view: 'yes', add: 123, edit: null } },
    });
    record('V28', 'Invalid permissions JSON rejected', res.status === 400, `${res.status}`);
  }

  // V29: Missing action keys rejected
  {
    const res = await api('POST', '/v1/settings/roles', tokens.admin, {
      name: 'rbac-test-v29-bad',
      permissions: { assets: { view: true } },
    });
    record('V29', 'Missing action keys rejected', res.status === 400, `${res.status}`);
  }

  // V30: Dynamic role change - viewer to patch-manager
  {
    // Update viewer user's role to patch-manager
    await api('PUT', `/v1/settings/users/${ids.viewerUserId}`, tokens.admin, {
      role: 'rbac-test-patch-manager',
    });
    // Re-login as viewer to get fresh token with new role
    await sleep(500);
    const newLogin = await loginAs('rbac-viewer@test.io', TEST_PASSWORD);
    const res = await api('POST', '/v1/patches', newLogin.token, { name: 'dynamic-test' });
    record(
      'V30',
      'Dynamic: viewer -> patch-manager can create patch',
      res.status !== 403,
      `${res.status} (any non-403 is OK)`,
    );
    // Restore viewer role
    await api('PUT', `/v1/settings/users/${ids.viewerUserId}`, tokens.admin, {
      role: 'rbac-test-viewer',
    });
  }

  // V31: Dynamic role change - patchmgr to empty
  {
    // Update patchmgr user's role to empty
    await api('PUT', `/v1/settings/users/${ids.patchmgrUserId}`, tokens.admin, {
      role: 'rbac-test-empty',
    });
    // Re-login as patchmgr to get fresh token with new role
    await sleep(500);
    const newLogin = await loginAs('rbac-patchmgr@test.io', TEST_PASSWORD);
    const res = await api('GET', '/v1/patches', newLogin.token);
    record(
      'V31',
      'Dynamic: patchmgr -> empty denied patches',
      res.status === 403,
      `${res.status}`,
    );
    // Restore patchmgr role
    await api('PUT', `/v1/settings/users/${ids.patchmgrUserId}`, tokens.admin, {
      role: 'rbac-test-patch-manager',
    });
  }

  // V32: Login response includes permissions
  {
    const loginRes = await loginAs('rbac-patchmgr@test.io', TEST_PASSWORD);
    const user = loginRes.data?.user;
    const hasPerm =
      user?.roleInfo?.permissions?.patches?.view === true;
    record(
      'V32',
      'Login includes permissions',
      hasPerm,
      `patches.view=${user?.roleInfo?.permissions?.patches?.view}`,
    );
  }

  // V33: Me endpoint includes role info
  {
    const res = await api('GET', '/v1/user/me', tokens.viewer);
    const d = res.data?.data || res.data;
    const hasRoleInfo = d?.roleInfo !== undefined || d?.role !== undefined;
    record('V33', 'Me includes role info', hasRoleInfo, `has roleInfo=${!!d?.roleInfo}`);
  }

  // V34: Login remains public (no auth required)
  {
    const res = await api('POST', '/v1/auth/login', undefined, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    record('V34', 'Login remains public', res.status === 200, `${res.status}`);
  }

  // V35: Profile works for empty role
  {
    const res = await api('GET', '/v1/user/me', tokens.empty);
    record('V35', 'Profile works for empty role', res.status === 200, `${res.status}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('RBAC Validation Script');
  console.log('==================================');

  // 1. Health check
  try {
    const res = await fetch(`${BASE_URL}/v1/auth/login`, { method: 'OPTIONS' }).catch(() => null);
    if (!res) {
      // Try a simple GET to make sure backend is up
      const healthRes = await api('POST', '/v1/auth/login', undefined, {
        email: 'health-check@test.io',
        password: 'x',
      });
      if (!healthRes.status) {
        console.error('Backend is not reachable at', BASE_URL);
        process.exit(1);
      }
    }
    console.log('Backend is reachable.');
  } catch {
    console.error('Backend is not reachable at', BASE_URL);
    process.exit(1);
  }

  // 2. Login as admin
  const adminLogin = await loginAs(ADMIN_EMAIL, ADMIN_PASSWORD);
  const adminToken = adminLogin.token;
  console.log('Admin login successful.');

  let ids: IdMap | null = null;

  try {
    // 3. Setup
    ids = await setup(adminToken);

    // 4. Get tokens
    const tokens = await getTokens();

    // 5. Run scenarios
    await runScenarios(tokens, ids);
  } finally {
    // 6. Cleanup
    await cleanup();
    await prisma.$disconnect();
  }

  // 7. Print summary
  console.log('\n==================================');
  const passed = RESULTS.filter((r) => r.status === 'PASS').length;
  const failed = RESULTS.filter((r) => r.status === 'FAIL').length;
  console.log(`Results: ${passed}/${RESULTS.length} PASS, ${failed} FAIL`);

  if (failed > 0) {
    console.log('\nFailed scenarios:');
    for (const r of RESULTS.filter((r) => r.status === 'FAIL')) {
      console.log(`  ${r.id}: ${r.description} -- ${r.details}`);
    }
    process.exit(1);
  }

  console.log('\nAll 35 RBAC scenarios validated successfully!');
  process.exit(0);
}

main().catch(async (err) => {
  console.error('Fatal error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
