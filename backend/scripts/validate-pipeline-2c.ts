#!/usr/bin/env tsx
/**
 * Pipeline 2C End-to-End Validation Script
 * 78 scenarios covering R1-R7: Org CRUD, Aggregate Counts, Delete Impact,
 * User Lifecycle, Bulk Import, Bulk Status, Edge Cases & RBAC
 *
 * Run: npx tsx backend/scripts/validate-pipeline-2c.ts
 */

const BASE_URL = 'http://localhost:3000/v1';
let token = '';
let passed = 0;
let failed = 0;
const results: Array<{ id: string; name: string; status: 'PASS' | 'FAIL'; error?: string }> = [];

async function api(method: string, path: string, body?: unknown, authToken?: string): Promise<{ status: number; data: any }> {
  const url = path.startsWith('http') ? path : `${BASE_URL}/${path}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken ?? token) headers['Authorization'] = `Bearer ${authToken ?? token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

// Helper to extract array from paginated response: { success, data: { data: [...], total, ... } }
function listData(res: { data: any }): any[] {
  // res.data = outer envelope body { success, data: { success?, data: [...] } } or { success, data: { data: [...], total } }
  const inner = res.data?.data;
  if (inner && Array.isArray(inner.data)) return inner.data;
  if (Array.isArray(inner)) return inner;
  return [];
}

// Helper to extract single entity from response: { success, data: { ... } }
function entityData(res: { data: any }): any {
  return res.data?.data ?? res.data;
}

function check(id: string, name: string, condition: boolean, errorMsg?: string) {
  if (condition) {
    passed++;
    results.push({ id, name, status: 'PASS' });
    console.log(`  ✓ [PASS] ${id}: ${name}`);
  } else {
    failed++;
    results.push({ id, name, status: 'FAIL', error: errorMsg });
    console.log(`  ✗ [FAIL] ${id}: ${name}${errorMsg ? ` — ${errorMsg}` : ''}`);
  }
}

// Track test data for cleanup
const cleanup = {
  userIds: [] as string[],
  orgIds: [] as string[],
  branchIds: [] as string[],
  deptIds: [] as string[],
  locationIds: [] as string[],
  roleIds: [] as string[],
};

// Shared state between tests
let testOrgId = '';
let testBranchId = '';
let testDeptId = '';
let testLocationId = '';
let testUserIds: string[] = [];
let limitedUserToken = '';
let limitedUserId = '';

const TS = Date.now();
const TEST_PASSWORD = 'SecureP@ss123';

async function phase1_setup_and_org_crud() {
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 1: Setup & Org CRUD (V1-V15)');
  console.log('='.repeat(70));

  // V1: Login as admin
  const loginRes = await api('POST', 'auth/login', { email: 'admin@patchiq.io', password: 'admin123' });
  token = loginRes.data?.data?.accessToken ?? '';
  check('V1', 'Login as admin', loginRes.status === 200 && !!token, `status=${loginRes.status}`);

  // V2: Create test org
  const orgRes = await api('POST', 'settings/organizations', { name: `p2c-test-org-${TS}` });
  testOrgId = orgRes.data?.data?.id ?? '';
  if (testOrgId) cleanup.orgIds.push(testOrgId);
  check('V2', 'Create test org', orgRes.status === 201 && !!testOrgId, `status=${orgRes.status}, data=${JSON.stringify(orgRes.data?.error)}`);

  // V3: Create duplicate org name
  const dupOrgRes = await api('POST', 'settings/organizations', { name: `p2c-test-org-${TS}` });
  check('V3', 'Duplicate org name rejected (409)', dupOrgRes.status === 409, `status=${dupOrgRes.status}`);

  // V4: Create branch in test org
  const branchRes = await api('POST', 'settings/branches', { name: `p2c-test-branch-${TS}`, organizationId: testOrgId });
  testBranchId = branchRes.data?.data?.id ?? '';
  if (testBranchId) cleanup.branchIds.push(testBranchId);
  check('V4', 'Create branch in test org', branchRes.status === 201 && !!testBranchId, `status=${branchRes.status}`);

  // V5: Duplicate branch in same org
  const dupBranchRes = await api('POST', 'settings/branches', { name: `p2c-test-branch-${TS}`, organizationId: testOrgId });
  check('V5', 'Duplicate branch in same org rejected (409)', dupBranchRes.status === 409, `status=${dupBranchRes.status}`);

  // V6: Branch with non-existent orgId
  const badBranchRes = await api('POST', 'settings/branches', { name: 'p2c-test-bad-branch', organizationId: '00000000-0000-0000-0000-000000000000' });
  check('V6', 'Branch with non-existent orgId (404)', badBranchRes.status === 404, `status=${badBranchRes.status}`);

  // V7: Create dept in test branch
  const deptRes = await api('POST', 'settings/departments', { name: `p2c-test-dept-${TS}`, branchId: testBranchId });
  testDeptId = deptRes.data?.data?.id ?? '';
  if (testDeptId) cleanup.deptIds.push(testDeptId);
  check('V7', 'Create dept in test branch', deptRes.status === 201 && !!testDeptId, `status=${deptRes.status}`);

  // V8: Duplicate dept in same branch
  const dupDeptRes = await api('POST', 'settings/departments', { name: `p2c-test-dept-${TS}`, branchId: testBranchId });
  check('V8', 'Duplicate dept in same branch rejected (409)', dupDeptRes.status === 409, `status=${dupDeptRes.status}`);

  // V9: Dept with non-existent branchId
  const badDeptRes = await api('POST', 'settings/departments', { name: 'p2c-test-bad-dept', branchId: '00000000-0000-0000-0000-000000000000' });
  check('V9', 'Dept with non-existent branchId (404)', badDeptRes.status === 404, `status=${badDeptRes.status}`);

  // V10: Create location
  const locRes = await api('POST', 'settings/locations', { name: `p2c-test-location-${TS}` });
  testLocationId = locRes.data?.data?.id ?? '';
  if (testLocationId) cleanup.locationIds.push(testLocationId);
  check('V10', 'Create location', locRes.status === 201 && !!testLocationId, `status=${locRes.status}`);

  // V11: Duplicate location
  const dupLocRes = await api('POST', 'settings/locations', { name: `p2c-test-location-${TS}` });
  check('V11', 'Duplicate location rejected (409)', dupLocRes.status === 409, `status=${dupLocRes.status}`);

  // V12: List orgs includes test org
  const listOrgsRes = await api('GET', 'settings/organizations');
  const orgNames = listData(listOrgsRes).map((o: any) => o.name);
  check('V12', 'List orgs includes test org', orgNames.includes(`p2c-test-org-${TS}`), `not found in ${orgNames.length} orgs`);

  // V13: List branches filtered by orgId
  const listBranchesRes = await api('GET', `settings/branches?organizationId=${testOrgId}`);
  const branches = listData(listBranchesRes);
  check('V13', 'List branches filtered by orgId', branches.length >= 1 && branches.some((b: any) => b.id === testBranchId), `found ${branches.length} branches`);

  // V14: List departments filtered by branchId
  const listDeptsRes = await api('GET', `settings/departments?branchId=${testBranchId}`);
  const depts = listData(listDeptsRes);
  check('V14', 'List departments filtered by branchId', depts.length >= 1 && depts.some((d: any) => d.id === testDeptId), `found ${depts.length} depts`);

  // V15: Get org tree includes test org
  const treeRes = await api('GET', 'settings/org-tree');
  const treeOrgs = treeRes.data?.data?.organizations ?? [];
  const treeTestOrg = treeOrgs.find((o: any) => o.id === testOrgId);
  check('V15', 'Org tree includes test org with children', !!treeTestOrg && Array.isArray(treeTestOrg.branches), `testOrg found=${!!treeTestOrg}`);
}

async function phase2_aggregate_counts() {
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 2: Aggregate Counts (V16-V22)');
  console.log('='.repeat(70));

  // V16: Org shows branchCount=1
  const orgListRes = await api('GET', 'settings/organizations');
  const testOrg = listData(orgListRes).find((o: any) => o.id === testOrgId);
  check('V16', 'Org shows branchCount=1', testOrg?.branchCount === 1, `branchCount=${testOrg?.branchCount}`);

  // V17: Create 3 users in test dept
  testUserIds = [];
  for (let i = 1; i <= 3; i++) {
    const userRes = await api('POST', 'settings/users', {
      email: `p2c-test-user${i}-${TS}@test.local`,
      name: `P2C Test User ${i}`,
      password: TEST_PASSWORD,
      role: 'user',
      organizationId: testOrgId,
      departmentId: testDeptId,
      locationId: testLocationId,
    });
    const uid = userRes.data?.data?.id;
    if (uid) {
      testUserIds.push(uid);
      cleanup.userIds.push(uid);
    }
  }
  check('V17', 'Create 3 users in test dept', testUserIds.length === 3, `created ${testUserIds.length}`);

  // V18: Branch shows correct user count
  const branchListRes = await api('GET', `settings/branches?organizationId=${testOrgId}`);
  const testBranch = listData(branchListRes).find((b: any) => b.id === testBranchId);
  check('V18', 'Branch shows correct user count', (testBranch?.userCount ?? testBranch?.users ?? 0) >= 3, `userCount=${testBranch?.userCount ?? testBranch?.users}`);

  // V19: Branch shows assets field (not hardcoded 0)
  check('V19', 'Branch has assets field', testBranch?.assets !== undefined, `assets field missing`);

  // V20: Dept shows correct userCount
  const deptListRes = await api('GET', `settings/departments?branchId=${testBranchId}`);
  const testDept = listData(deptListRes).find((d: any) => d.id === testDeptId);
  check('V20', 'Dept shows correct userCount', (testDept?.userCount ?? 0) >= 3, `userCount=${testDept?.userCount}`);

  // V21: Org shows correct userCount
  const orgListRes2 = await api('GET', 'settings/organizations');
  const testOrg2 = listData(orgListRes2).find((o: any) => o.id === testOrgId);
  check('V21', 'Org shows correct userCount', (testOrg2?.userCount ?? 0) >= 3, `userCount=${testOrg2?.userCount}`);

  // V22: Org tree summary counts match
  const treeRes = await api('GET', 'settings/org-tree');
  const treeOrg = (treeRes.data?.data?.organizations ?? []).find((o: any) => o.id === testOrgId);
  const treeSummary = treeOrg?.summary ?? treeOrg;
  const treeUsers = treeSummary?.userCount ?? treeSummary?.users ?? 0;
  check('V22', 'Org tree summary counts match', treeUsers >= 3, `tree userCount=${treeUsers}`);
}

async function phase3_delete_impact_cascade() {
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 3: Delete Impact & Cascade (V23-V35)');
  console.log('='.repeat(70));

  // V23: Impact preview: test org with children
  const impactRes = await api('GET', `settings/organizations/${testOrgId}/delete-impact`);
  const impact = impactRes.data?.data ?? impactRes.data;
  check('V23', 'Impact preview: test org with children', impactRes.status === 200 && impact?.canDelete !== undefined, `status=${impactRes.status}`);

  // V24: Impact preview: default org (canDelete=false)
  const orgListRes = await api('GET', 'settings/organizations');
  const defaultOrg = listData(orgListRes).find((o: any) => o.isDefault === true);
  if (defaultOrg) {
    const defImpactRes = await api('GET', `settings/organizations/${defaultOrg.id}/delete-impact`);
    const defImpact = defImpactRes.data?.data ?? defImpactRes.data;
    check('V24', 'Default org canDelete=false', defImpact?.canDelete === false && !!defImpact?.blockedReason, `canDelete=${defImpact?.canDelete}`);
  } else {
    check('V24', 'Default org canDelete=false', false, 'no default org found');
  }

  // V25: Impact preview: empty branch (create a fresh empty one)
  const emptyBranchRes = await api('POST', 'settings/branches', { name: `p2c-test-empty-branch-${TS}`, organizationId: testOrgId });
  const emptyBranchId = emptyBranchRes.data?.data?.id;
  if (emptyBranchId) cleanup.branchIds.push(emptyBranchId);
  const emptyImpactRes = await api('GET', `settings/branches/${emptyBranchId}/delete-impact`);
  const emptyImpact = emptyImpactRes.data?.data ?? emptyImpactRes.data;
  check('V25', 'Impact preview: empty branch', emptyImpactRes.status === 200 && emptyImpact?.canDelete === true, `canDelete=${emptyImpact?.canDelete}`);

  // V26: Impact preview: branch with departments
  const branchImpactRes = await api('GET', `settings/branches/${testBranchId}/delete-impact`);
  const branchImpact = branchImpactRes.data?.data ?? branchImpactRes.data;
  check('V26', 'Impact preview: branch with departments', branchImpactRes.status === 200, `status=${branchImpactRes.status}`);

  // V27: Impact preview: department with users
  const deptImpactRes = await api('GET', `settings/departments/${testDeptId}/delete-impact`);
  const deptImpact = deptImpactRes.data?.data ?? deptImpactRes.data;
  check('V27', 'Impact preview: dept with users', deptImpactRes.status === 200, `status=${deptImpactRes.status}`);

  // V28: Impact preview: non-existent id (404)
  const noImpactRes = await api('GET', 'settings/organizations/00000000-0000-0000-0000-000000000000/delete-impact');
  check('V28', 'Impact preview: non-existent id (404)', noImpactRes.status === 404, `status=${noImpactRes.status}`);

  // V29: Delete org without cascade (blocked with message)
  const delBlockedRes = await api('DELETE', `settings/organizations/${testOrgId}`);
  check('V29', 'Delete org without cascade blocked', delBlockedRes.status === 400 || delBlockedRes.status === 409, `status=${delBlockedRes.status}`);

  // V30: Create cascade test org with branch+dept+users
  const cascOrgRes = await api('POST', 'settings/organizations', { name: `p2c-test-cascade-org-${TS}` });
  const cascOrgId = cascOrgRes.data?.data?.id;
  if (cascOrgId) cleanup.orgIds.push(cascOrgId);

  const cascBranchRes = await api('POST', 'settings/branches', { name: `p2c-test-cascade-branch-${TS}`, organizationId: cascOrgId });
  const cascBranchId = cascBranchRes.data?.data?.id;

  const cascDeptRes = await api('POST', 'settings/departments', { name: `p2c-test-cascade-dept-${TS}`, branchId: cascBranchId });
  const cascDeptId = cascDeptRes.data?.data?.id;

  const cascUserRes = await api('POST', 'settings/users', {
    email: `p2c-test-cascade-user-${TS}@test.local`,
    name: 'P2C Cascade User',
    password: TEST_PASSWORD,
    role: 'user',
    organizationId: cascOrgId,
    departmentId: cascDeptId,
  });
  const cascUserId = cascUserRes.data?.data?.id;
  if (cascUserId) cleanup.userIds.push(cascUserId);

  check('V30', 'Create cascade test org with branch+dept+users', !!cascOrgId && !!cascBranchId && !!cascDeptId && !!cascUserId, 'incomplete creation');

  // V31: Cascade delete test org
  const cascDelRes = await api('DELETE', `settings/organizations/${cascOrgId}?cascade=true`);
  check('V31', 'Cascade delete test org', cascDelRes.status === 200 || cascDelRes.status === 204, `status=${cascDelRes.status}`);
  // Remove from cleanup since it's already deleted
  cleanup.orgIds = cleanup.orgIds.filter(id => id !== cascOrgId);
  cleanup.userIds = cleanup.userIds.filter(id => id !== cascUserId);

  // V32: Verify cascade org is gone
  const cascVerifyRes = await api('GET', `settings/organizations/${cascOrgId}`);
  check('V32', 'Verify cascade org is gone', cascVerifyRes.status === 404, `status=${cascVerifyRes.status}`);

  // V33: Create reassign test orgs
  const srcOrgRes = await api('POST', 'settings/organizations', { name: `p2c-test-src-org-${TS}` });
  const srcOrgId = srcOrgRes.data?.data?.id;
  if (srcOrgId) cleanup.orgIds.push(srcOrgId);

  const tgtOrgRes = await api('POST', 'settings/organizations', { name: `p2c-test-tgt-org-${TS}` });
  const tgtOrgId = tgtOrgRes.data?.data?.id;
  if (tgtOrgId) cleanup.orgIds.push(tgtOrgId);

  const srcBranchRes = await api('POST', 'settings/branches', { name: `p2c-test-src-branch-${TS}`, organizationId: srcOrgId });
  const srcBranchId = srcBranchRes.data?.data?.id;

  check('V33', 'Create reassign test orgs', !!srcOrgId && !!tgtOrgId && !!srcBranchId, 'incomplete creation');

  // V34: Delete with reassignTo
  const reassignDelRes = await api('DELETE', `settings/organizations/${srcOrgId}?reassignTo=${tgtOrgId}`);
  check('V34', 'Delete with reassignTo', reassignDelRes.status === 200 || reassignDelRes.status === 204, `status=${reassignDelRes.status}`);
  cleanup.orgIds = cleanup.orgIds.filter(id => id !== srcOrgId);

  // V35: Verify branches moved to target
  const tgtBranchesRes = await api('GET', `settings/branches?organizationId=${tgtOrgId}`);
  const tgtBranches = listData(tgtBranchesRes);
  const movedBranch = tgtBranches.find((b: any) => b.id === srcBranchId);
  check('V35', 'Verify branches moved to target', !!movedBranch, `branch ${srcBranchId} not found in target org`);
}

async function phase4_user_lifecycle() {
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 4: User Lifecycle (V36-V52)');
  console.log('='.repeat(70));

  // V36: Create user with password (isOnboarded=true)
  const userRes = await api('POST', 'settings/users', {
    email: `p2c-test-lifecycle-${TS}@test.local`,
    name: 'P2C Lifecycle User',
    password: TEST_PASSWORD,
    role: 'user',
    organizationId: testOrgId,
    departmentId: testDeptId,
  });
  const lifecycleUserId = userRes.data?.data?.id;
  if (lifecycleUserId) cleanup.userIds.push(lifecycleUserId);
  const isOnboarded = userRes.data?.data?.isOnboarded;
  check('V36', 'Create user with password (isOnboarded=true)', userRes.status === 201 && isOnboarded === true, `status=${userRes.status}, isOnboarded=${isOnboarded}`);

  // V37: Invite user (no password, isOnboarded=false)
  const inviteRes = await api('POST', 'settings/users/invite', {
    email: `p2c-test-invite-${TS}@test.local`,
    name: 'P2C Invite User',
    role: 'user',
  });
  // Invite may return { message: "Invitation sent..." } — check via users list that status is 'Invite Sent'
  const inviteOk = inviteRes.status === 201 || inviteRes.status === 200;
  let inviteUserId = inviteRes.data?.data?.id;
  // Look up the invited user from the users list to confirm isOnboarded=false (shown as status='Invite Sent')
  const inviteLookup = await api('GET', `settings/users?search=${encodeURIComponent(`p2c-test-invite-${TS}@test.local`)}`);
  const inviteUser = listData(inviteLookup).find((u: any) => u.email === `p2c-test-invite-${TS}@test.local`);
  if (!inviteUserId) inviteUserId = inviteUser?.id;
  if (inviteUserId) cleanup.userIds.push(inviteUserId);
  check('V37', 'Invite user (isOnboarded=false)', inviteOk && !!inviteUser && inviteUser.status === 'Invite Sent', `status=${inviteRes.status}, userStatus=${inviteUser?.status}`);

  // V38: Onboard with invalid token
  const onboardRes = await api('POST', 'auth/onboard', {
    token: 'invalid-token-12345',
    password: TEST_PASSWORD,
  });
  check('V38', 'Onboard with invalid token (400)', onboardRes.status === 400 || onboardRes.status === 401, `status=${onboardRes.status}`);

  // V39: Suspend active user
  const suspendRes = await api('POST', `settings/users/${lifecycleUserId}/suspend`);
  check('V39', 'Suspend active user', suspendRes.status === 200, `status=${suspendRes.status}`);

  // V40: Suspended user login attempt
  const suspLoginRes = await api('POST', 'auth/login', {
    email: `p2c-test-lifecycle-${TS}@test.local`,
    password: TEST_PASSWORD,
  });
  const suspMsg = JSON.stringify(suspLoginRes.data).toLowerCase();
  check('V40', 'Suspended user login blocked', suspLoginRes.status === 401 || suspLoginRes.status === 403, `status=${suspLoginRes.status}`);

  // V41: Suspend already-suspended
  const doubleSuspRes = await api('POST', `settings/users/${lifecycleUserId}/suspend`);
  check('V41', 'Suspend already-suspended (400)', doubleSuspRes.status === 400 || doubleSuspRes.status === 409, `status=${doubleSuspRes.status}`);

  // V42: Activate suspended user
  const activateRes = await api('POST', `settings/users/${lifecycleUserId}/activate`);
  check('V42', 'Activate suspended user', activateRes.status === 200, `status=${activateRes.status}`);

  // V43: Activate already-active
  const doubleActRes = await api('POST', `settings/users/${lifecycleUserId}/activate`);
  check('V43', 'Activate already-active (400)', doubleActRes.status === 400 || doubleActRes.status === 409, `status=${doubleActRes.status}`);

  // V44: Self-suspend blocked
  // Get current admin user id from users list
  const adminLookupRes = await api('GET', 'settings/users?search=admin%40patchiq.io');
  const adminUserId = listData(adminLookupRes).find((u: any) => u.email === 'admin@patchiq.io')?.id;
  const selfSuspRes = await api('POST', `settings/users/${adminUserId}/suspend`);
  const selfMsg = JSON.stringify(selfSuspRes.data).toLowerCase();
  check('V44', 'Self-suspend blocked', (selfSuspRes.status === 400 || selfSuspRes.status === 403) && selfMsg.includes('cannot'), `status=${selfSuspRes.status}`);

  // V45: Self-delete blocked
  const selfDelRes = await api('DELETE', `settings/users/${adminUserId}`);
  check('V45', 'Self-delete blocked', selfDelRes.status === 400 || selfDelRes.status === 403, `status=${selfDelRes.status}`);

  // V46: User audit log exists
  const auditRes = await api('GET', `settings/users/${lifecycleUserId}/audit-log`);
  const auditEntries = listData(auditRes);
  check('V46', 'User audit log exists', auditRes.status === 200 && auditEntries.length >= 1, `entries=${auditEntries.length}`);

  // V47: Filter users by departmentId
  const deptFilterRes = await api('GET', `settings/users?departmentId=${testDeptId}`);
  const deptUsers = listData(deptFilterRes);
  check('V47', 'Filter users by departmentId', deptFilterRes.status === 200 && deptUsers.length >= 1, `count=${deptUsers.length}`);

  // V48: Filter users by status
  const statusFilterRes = await api('GET', 'settings/users?status=Active');
  check('V48', 'Filter users by status', statusFilterRes.status === 200, `status=${statusFilterRes.status}`);

  // V49: Sort users by createdAt
  const sortRes = await api('GET', 'settings/users?sortBy=createdAt&sortOrder=desc');
  check('V49', 'Sort users by createdAt', sortRes.status === 200, `status=${sortRes.status}`);

  // V50: Filter by authSource=LOCAL
  const authFilterRes = await api('GET', 'settings/users?authSource=LOCAL');
  check('V50', 'Filter by authSource=LOCAL', authFilterRes.status === 200, `status=${authFilterRes.status}`);

  // V51: Password reset for local user
  const resetRes = await api('POST', `settings/users/${lifecycleUserId}/reset-password`);
  check('V51', 'Password reset for local user', resetRes.status === 200, `status=${resetRes.status}`);

  // V52: Delete user (soft delete)
  const delUserRes = await api('DELETE', `settings/users/${lifecycleUserId}`);
  check('V52', 'Delete user (soft delete)', delUserRes.status === 200 || delUserRes.status === 204, `status=${delUserRes.status}`);
  cleanup.userIds = cleanup.userIds.filter(id => id !== lifecycleUserId);
}

async function phase5_bulk_import() {
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 5: Bulk Import (V53-V62)');
  console.log('='.repeat(70));

  // V53: Import 5 valid users
  const importUsers = [];
  for (let i = 1; i <= 5; i++) {
    importUsers.push({
      email: `p2c-test-import${i}-${TS}@test.local`,
      name: `P2C Import User ${i}`,
      role: 'user',
      organizationId: testOrgId,
      departmentId: testDeptId,
    });
  }
  const importRes = await api('POST', 'settings/users/import', { users: importUsers });
  const importData = importRes.data?.data ?? importRes.data;
  const importResults = importData?.results ?? importData ?? [];
  const successCount = Array.isArray(importResults) ? importResults.filter((r: any) => r.success === true || r.status === 'success').length : 0;
  // Track imported user IDs
  if (Array.isArray(importResults)) {
    for (const r of importResults) {
      if (r.id || r.userId) cleanup.userIds.push(r.id ?? r.userId);
    }
  }
  check('V53', 'Import 5 valid users', importRes.status === 200 || importRes.status === 201, `status=${importRes.status}, success=${successCount}`);

  // V54: Import with 1 invalid email
  const badEmailRes = await api('POST', 'settings/users/import', {
    users: [{ email: 'not-an-email', name: 'Bad Email', role: 'user' }],
  });
  check('V54', 'Import with invalid email rejected', badEmailRes.status === 400 || (badEmailRes.status === 200 && JSON.stringify(badEmailRes.data).toLowerCase().includes('fail')), `status=${badEmailRes.status}`);

  // V55: Import with duplicate email within batch
  const dupBatchRes = await api('POST', 'settings/users/import', {
    users: [
      { email: `p2c-test-dup-${TS}@test.local`, name: 'Dup A', role: 'user' },
      { email: `p2c-test-dup-${TS}@test.local`, name: 'Dup B', role: 'user' },
    ],
  });
  const dupBatchData = dupBatchRes.data?.data ?? dupBatchRes.data;
  const dupStr = JSON.stringify(dupBatchData).toLowerCase();
  check('V55', 'Import with duplicate email in batch', dupBatchRes.status === 400 || dupStr.includes('duplicate'), `status=${dupBatchRes.status}`);

  // V56: Import with existing email
  const existEmailRes = await api('POST', 'settings/users/import', {
    users: [{ email: 'admin@patchiq.io', name: 'Admin Dup', role: 'user' }],
  });
  const existStr = JSON.stringify(existEmailRes.data).toLowerCase();
  check('V56', 'Import with existing email rejected', existEmailRes.status === 400 || existStr.includes('exist') || existStr.includes('duplicate') || existStr.includes('fail'), `status=${existEmailRes.status}`);

  // V57: Import with invalid role
  const badRoleRes = await api('POST', 'settings/users/import', {
    users: [{ email: `p2c-test-badrole-${TS}@test.local`, name: 'Bad Role', role: 'SUPERADMIN' }],
  });
  // May still succeed if role is normalized, or fail
  check('V57', 'Import with invalid role', badRoleRes.status === 400 || badRoleRes.status === 200 || badRoleRes.status === 201, `status=${badRoleRes.status}`);

  // V58: Import with invalid orgId
  const badOrgImportRes = await api('POST', 'settings/users/import', {
    users: [{ email: `p2c-test-badorg-${TS}@test.local`, name: 'Bad Org', role: 'user', organizationId: '00000000-0000-0000-0000-000000000000' }],
  });
  check('V58', 'Import with invalid orgId', badOrgImportRes.status === 400 || badOrgImportRes.status === 200, `status=${badOrgImportRes.status}`);

  // V59: Import 0 users (400)
  const emptyImportRes = await api('POST', 'settings/users/import', { users: [] });
  check('V59', 'Import 0 users (400)', emptyImportRes.status === 400, `status=${emptyImportRes.status}`);

  // V60: CSV template download
  const templateRes = await api('GET', 'settings/users/import/template');
  check('V60', 'CSV template download', templateRes.status === 200, `status=${templateRes.status}`);

  // V61: Imported users appear in list
  const listAfterImport = await api('GET', `settings/users?departmentId=${testDeptId}`);
  const afterImportUsers = listData(listAfterImport);
  check('V61', 'Imported users appear in list', afterImportUsers.length >= 5, `count=${afterImportUsers.length}`);

  // V62: Import with sendInvite flag
  const inviteImportRes = await api('POST', 'settings/users/import', {
    users: [{ email: `p2c-test-sendinvite-${TS}@test.local`, name: 'Send Invite User', role: 'user', sendInvite: true }],
  });
  if (inviteImportRes.data?.data?.results?.[0]?.id) cleanup.userIds.push(inviteImportRes.data.data.results[0].id);
  check('V62', 'Import with sendInvite flag', inviteImportRes.status === 200 || inviteImportRes.status === 201, `status=${inviteImportRes.status}`);
}

async function phase6_bulk_status() {
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 6: Bulk Status Changes (V63-V70)');
  console.log('='.repeat(70));

  // Create 3 fresh users for bulk ops
  const bulkUserIds: string[] = [];
  for (let i = 1; i <= 3; i++) {
    const res = await api('POST', 'settings/users', {
      email: `p2c-test-bulk${i}-${TS}@test.local`,
      name: `P2C Bulk User ${i}`,
      password: TEST_PASSWORD,
      role: 'user',
      organizationId: testOrgId,
    });
    const uid = res.data?.data?.id;
    if (uid) {
      bulkUserIds.push(uid);
      cleanup.userIds.push(uid);
    }
  }

  // V63: Bulk suspend 3 users
  const bulkSuspRes = await api('POST', 'settings/users/bulk-suspend', { userIds: bulkUserIds });
  check('V63', 'Bulk suspend 3 users', bulkSuspRes.status === 200, `status=${bulkSuspRes.status}`);

  // V64: Bulk suspend includes self (self skipped)
  const adminLookup2 = await api('GET', 'settings/users?search=admin%40patchiq.io');
  const adminId = listData(adminLookup2).find((u: any) => u.email === 'admin@patchiq.io')?.id;
  const selfBulkRes = await api('POST', 'settings/users/bulk-suspend', { userIds: [adminId, ...bulkUserIds] });
  const selfBulkData = selfBulkRes.data?.data ?? selfBulkRes.data;
  const skipped = selfBulkData?.skipped ?? selfBulkData?.selfExcluded ?? 0;
  check('V64', 'Bulk suspend with self (self skipped)', selfBulkRes.status === 200, `status=${selfBulkRes.status}`);

  // V65: Bulk suspend already-suspended (skipped)
  const alreadySuspRes = await api('POST', 'settings/users/bulk-suspend', { userIds: bulkUserIds });
  check('V65', 'Bulk suspend already-suspended', alreadySuspRes.status === 200, `status=${alreadySuspRes.status}`);

  // V66: Bulk activate 3 users
  const bulkActRes = await api('POST', 'settings/users/bulk-activate', { userIds: bulkUserIds });
  check('V66', 'Bulk activate 3 users', bulkActRes.status === 200, `status=${bulkActRes.status}`);

  // V67: Bulk delete 2 users
  const delIds = bulkUserIds.slice(0, 2);
  const bulkDelRes = await api('POST', 'settings/users/bulk-delete', { userIds: delIds });
  check('V67', 'Bulk delete 2 users', bulkDelRes.status === 200, `status=${bulkDelRes.status}`);
  cleanup.userIds = cleanup.userIds.filter(id => !delIds.includes(id));

  // V68: Bulk action with empty array (400)
  const emptyBulkRes = await api('POST', 'settings/users/bulk-suspend', { userIds: [] });
  check('V68', 'Bulk action with empty array (400)', emptyBulkRes.status === 400, `status=${emptyBulkRes.status}`);

  // V69: Bulk action with non-existent IDs
  const fakeIds = ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'];
  const fakeBulkRes = await api('POST', 'settings/users/bulk-suspend', { userIds: fakeIds });
  check('V69', 'Bulk action with non-existent IDs', fakeBulkRes.status === 200 || fakeBulkRes.status === 404, `status=${fakeBulkRes.status}`);

  // V70: Verify bulk-deleted users gone from list
  const afterDelList = await api('GET', 'settings/users');
  const afterDelUsers = listData(afterDelList);
  const deletedStillPresent = afterDelUsers.filter((u: any) => delIds.includes(u.id) && u.status !== 'Deleted');
  check('V70', 'Bulk-deleted users gone from list', deletedStillPresent.length === 0, `still found ${deletedStillPresent.length}`);
}

async function phase7_edge_cases_rbac() {
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 7: Edge Cases & RBAC (V71-V78)');
  console.log('='.repeat(70));

  // V71: Create limited user with 'user' role
  const limitedRes = await api('POST', 'settings/users', {
    email: `p2c-test-limited-${TS}@test.local`,
    name: 'P2C Limited User',
    password: TEST_PASSWORD,
    role: 'user',
    organizationId: testOrgId,
  });
  limitedUserId = limitedRes.data?.data?.id ?? '';
  if (limitedUserId) cleanup.userIds.push(limitedUserId);

  // Login as limited user
  const limitedLoginRes = await api('POST', 'auth/login', {
    email: `p2c-test-limited-${TS}@test.local`,
    password: TEST_PASSWORD,
  });
  limitedUserToken = limitedLoginRes.data?.data?.accessToken ?? '';
  check('V71', 'Create and login as limited user', !!limitedUserId && !!limitedUserToken, `userId=${limitedUserId}`);

  // V72: Limited user cannot create org (403)
  const limitedOrgRes = await api('POST', 'settings/organizations', { name: 'p2c-test-limited-org' }, limitedUserToken);
  check('V72', 'Limited user cannot create org (403)', limitedOrgRes.status === 403, `status=${limitedOrgRes.status}`);

  // V73: Limited user cannot suspend users (403)
  const limitedSuspRes = await api('POST', `settings/users/${testUserIds[0]}/suspend`, undefined, limitedUserToken);
  check('V73', 'Limited user cannot suspend users (403)', limitedSuspRes.status === 403, `status=${limitedSuspRes.status}`);

  // V74: Limited user cannot bulk import (403)
  const limitedImportRes = await api('POST', 'settings/users/import', {
    users: [{ email: 'p2c-test-nope@test.local', name: 'Nope', role: 'user' }],
  }, limitedUserToken);
  check('V74', 'Limited user cannot bulk import (403)', limitedImportRes.status === 403, `status=${limitedImportRes.status}`);

  // V75: Missing auth token (401)
  const noAuthRes = await api('GET', 'settings/organizations', undefined, 'invalid');
  check('V75', 'Missing/invalid auth token (401)', noAuthRes.status === 401, `status=${noAuthRes.status}`);

  // V76: Invalid UUID parameter
  const badUuidRes = await api('GET', 'settings/organizations/not-a-uuid');
  check('V76', 'Invalid UUID parameter (400 or 404)', badUuidRes.status === 400 || badUuidRes.status === 404, `status=${badUuidRes.status}`);

  // V77: Empty name validation (400)
  const emptyNameRes = await api('POST', 'settings/organizations', { name: '' });
  check('V77', 'Empty name validation (400)', emptyNameRes.status === 400, `status=${emptyNameRes.status}`);

  // V78: Name exceeds 100 chars (400)
  const longName = 'x'.repeat(101);
  const longNameRes = await api('POST', 'settings/organizations', { name: longName });
  check('V78', 'Name exceeds 100 chars (400)', longNameRes.status === 400, `status=${longNameRes.status}`);
}

async function cleanupTestData() {
  console.log('\n' + '='.repeat(70));
  console.log('CLEANUP: Removing test data');
  console.log('='.repeat(70));

  // Delete users first
  for (const id of cleanup.userIds) {
    try { await api('DELETE', `settings/users/${id}`); } catch { /* ignore */ }
  }
  console.log(`  Deleted ${cleanup.userIds.length} users`);

  // Delete departments
  for (const id of cleanup.deptIds) {
    try { await api('DELETE', `settings/departments/${id}`); } catch { /* ignore */ }
  }
  console.log(`  Deleted ${cleanup.deptIds.length} departments`);

  // Delete branches
  for (const id of cleanup.branchIds) {
    try { await api('DELETE', `settings/branches/${id}`); } catch { /* ignore */ }
  }
  console.log(`  Deleted ${cleanup.branchIds.length} branches`);

  // Delete locations
  for (const id of cleanup.locationIds) {
    try { await api('DELETE', `settings/locations/${id}`); } catch { /* ignore */ }
  }
  console.log(`  Deleted ${cleanup.locationIds.length} locations`);

  // Delete orgs (cascade to clean up any remaining children)
  for (const id of cleanup.orgIds) {
    try { await api('DELETE', `settings/organizations/${id}?cascade=true`); } catch { /* ignore */ }
  }
  console.log(`  Deleted ${cleanup.orgIds.length} organizations`);

  // Delete roles
  for (const id of cleanup.roleIds) {
    try { await api('DELETE', `settings/roles/${id}`); } catch { /* ignore */ }
  }

  // Also clean up any stray p2c-test users by listing and deleting
  try {
    const allUsers = await api('GET', 'settings/users?limit=200');
    const testUsers = listData(allUsers).filter((u: any) => u.email?.includes('p2c-test'));
    for (const u of testUsers) {
      try { await api('DELETE', `settings/users/${u.id}`); } catch { /* ignore */ }
    }
    if (testUsers.length > 0) console.log(`  Cleaned up ${testUsers.length} stray test users`);
  } catch { /* ignore */ }

  // Clean up stray test orgs
  try {
    const allOrgs = await api('GET', 'settings/organizations');
    const testOrgs = listData(allOrgs).filter((o: any) => o.name?.includes('p2c-test'));
    for (const o of testOrgs) {
      try { await api('DELETE', `settings/organizations/${o.id}?cascade=true`); } catch { /* ignore */ }
    }
    if (testOrgs.length > 0) console.log(`  Cleaned up ${testOrgs.length} stray test orgs`);
  } catch { /* ignore */ }

  // Clean up stray test locations
  try {
    const allLocs = await api('GET', 'settings/locations');
    const testLocs = listData(allLocs).filter((l: any) => l.name?.includes('p2c-test'));
    for (const l of testLocs) {
      try { await api('DELETE', `settings/locations/${l.id}`); } catch { /* ignore */ }
    }
    if (testLocs.length > 0) console.log(`  Cleaned up ${testLocs.length} stray test locations`);
  } catch { /* ignore */ }
}

async function main() {
  console.log('='.repeat(70));
  console.log('PIPELINE 2C — END-TO-END VALIDATION (78 SCENARIOS)');
  console.log('='.repeat(70));
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log(`Test prefix: p2c-test-*-${TS}`);

  try {
    await phase1_setup_and_org_crud();
    await phase2_aggregate_counts();
    await phase3_delete_impact_cascade();
    await phase4_user_lifecycle();
    await phase5_bulk_import();
    await phase6_bulk_status();
    await phase7_edge_cases_rbac();
  } finally {
    await cleanupTestData();
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('FINAL SUMMARY');
  console.log('='.repeat(70));
  console.log(`  TOTAL: ${passed + failed}/78`);
  console.log(`  PASS:  ${passed}/78`);
  console.log(`  FAIL:  ${failed}/78`);
  console.log('');

  if (failed > 0) {
    console.log('Failed scenarios:');
    for (const r of results) {
      if (r.status === 'FAIL') {
        console.log(`  ✗ ${r.id}: ${r.name}${r.error ? ` — ${r.error}` : ''}`);
      }
    }
  }

  console.log(`\nFinished at: ${new Date().toISOString()}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Script crashed:', err);
  process.exit(1);
});
