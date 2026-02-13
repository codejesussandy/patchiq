const axios = require('axios');

const BASE_URL = 'http://localhost:3000/v1';
let adminToken = '';
let demoToken = '';

const results = [];

function logTest(id, description, passed, details = '') {
  results.push({ id, description, passed, details });
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status} - ${id}: ${description}${details ? ' - ' + details : ''}`);
}

async function login(email, password) {
  const res = await axios.post(`${BASE_URL}/auth/login`, { email, password });
  return res.data.data.accessToken;
}

async function runTests() {
  try {
    // Login as admin
    console.log('\n=== Logging in as admin ===');
    adminToken = await login('admin@patchiq.io', 'admin123');
    console.log('Admin login successful');

    // Login as demo
    console.log('\n=== Logging in as demo user ===');
    demoToken = await login('demo@patchiq.io', 'demo123');
    console.log('Demo user login successful');

    const headers = { Authorization: `Bearer ${adminToken}` };
    const demoHeaders = { Authorization: `Bearer ${demoToken}` };

    // T3.1: Get defaults
    console.log('\n=== T3.1: Get defaults ===');
    try {
      const res = await axios.get(`${BASE_URL}/settings/patch-preferences`, { headers });
      const passed = res.status === 200 && res.data.data.enablePatching !== undefined;
      logTest('T3.1', 'Get defaults', passed, `enablePatching: ${res.data.data.enablePatching}`);
    } catch (e) {
      logTest('T3.1', 'Get defaults', false, e.response?.data?.error?.message || e.message);
    }

    // T3.2: Update single field
    console.log('\n=== T3.2: Update single field ===');
    try {
      const res = await axios.put(`${BASE_URL}/settings/patch-preferences`,
        { enablePatching: false },
        { headers }
      );
      const passed = res.status === 200 && res.data.data.enablePatching === false;
      logTest('T3.2', 'Update single field', passed, `enablePatching: ${res.data.data.enablePatching}`);
    } catch (e) {
      logTest('T3.2', 'Update single field', false, e.response?.data?.error?.message || e.message);
    }

    // T3.3: Update approval policy
    console.log('\n=== T3.3: Update approval policy ===');
    try {
      const res = await axios.put(`${BASE_URL}/settings/patch-preferences`,
        { patchApprovalPolicy: 'PreApproved' },
        { headers }
      );
      const passed = res.status === 200 && res.data.data.patchApprovalPolicy === 'PreApproved';
      logTest('T3.3', 'Update approval policy', passed, `Policy: ${res.data.data.patchApprovalPolicy}`);
    } catch (e) {
      logTest('T3.3', 'Update approval policy', false, e.response?.data?.error?.message || e.message);
    }

    // T3.4: Update OS list
    console.log('\n=== T3.4: Update OS list ===');
    try {
      const res = await axios.put(`${BASE_URL}/settings/patch-preferences`,
        { patchSyncForOS: ['Windows', 'macOS'] },
        { headers }
      );
      const passed = res.status === 200 &&
        JSON.stringify(res.data.data.patchSyncForOS) === JSON.stringify(['Windows', 'macOS']);
      logTest('T3.4', 'Update OS list', passed, `OS: ${JSON.stringify(res.data.data.patchSyncForOS)}`);
    } catch (e) {
      logTest('T3.4', 'Update OS list', false, e.response?.data?.error?.message || e.message);
    }

    // T3.5: Update to empty OS list
    console.log('\n=== T3.5: Update to empty OS list ===');
    try {
      const res = await axios.put(`${BASE_URL}/settings/patch-preferences`,
        { patchSyncForOS: [] },
        { headers }
      );
      const passed = res.status === 200 && res.data.data.patchSyncForOS.length === 0;
      logTest('T3.5', 'Update to empty OS list', passed, `OS: ${JSON.stringify(res.data.data.patchSyncForOS)}`);
    } catch (e) {
      logTest('T3.5', 'Update to empty OS list', false, e.response?.data?.error?.message || e.message);
    }

    // T3.6: Invalid OS value
    console.log('\n=== T3.6: Invalid OS value ===');
    try {
      const res = await axios.put(`${BASE_URL}/settings/patch-preferences`,
        { patchSyncForOS: ['BeOS'] },
        { headers }
      );
      logTest('T3.6', 'Invalid OS value', false, 'Should have returned 400');
    } catch (e) {
      const passed = e.response?.status === 400;
      logTest('T3.6', 'Invalid OS value', passed, e.response?.data?.error?.message || e.message);
    }

    // T3.7: Invalid time format - no seconds
    console.log('\n=== T3.7: Invalid time format - no seconds ===');
    try {
      const res = await axios.put(`${BASE_URL}/settings/patch-preferences`,
        { scheduleTime: '02:00' },
        { headers }
      );
      logTest('T3.7', 'Invalid time format - no seconds', false, 'Should have returned 400');
    } catch (e) {
      const passed = e.response?.status === 400;
      logTest('T3.7', 'Invalid time format - no seconds', passed, e.response?.data?.error?.message || e.message);
    }

    // T3.8: Invalid time - hour 25
    console.log('\n=== T3.8: Invalid time - hour 25 ===');
    try {
      const res = await axios.put(`${BASE_URL}/settings/patch-preferences`,
        { scheduleTime: '25:00:00' },
        { headers }
      );
      logTest('T3.8', 'Invalid time - hour 25', false, 'Should have returned 400');
    } catch (e) {
      const passed = e.response?.status === 400;
      logTest('T3.8', 'Invalid time - hour 25', passed, e.response?.data?.error?.message || e.message);
    }

    // T3.9: Invalid time - minute 60
    console.log('\n=== T3.9: Invalid time - minute 60 ===');
    try {
      const res = await axios.put(`${BASE_URL}/settings/patch-preferences`,
        { scheduleTime: '02:60:00' },
        { headers }
      );
      logTest('T3.9', 'Invalid time - minute 60', false, 'Should have returned 400');
    } catch (e) {
      const passed = e.response?.status === 400;
      logTest('T3.9', 'Invalid time - minute 60', passed, e.response?.data?.error?.message || e.message);
    }

    // T3.10: Valid edge time - midnight
    console.log('\n=== T3.10: Valid edge time - midnight ===');
    try {
      const res = await axios.put(`${BASE_URL}/settings/patch-preferences`,
        { scheduleTime: '00:00:00' },
        { headers }
      );
      const passed = res.status === 200 && res.data.data.scheduleTime === '00:00:00';
      logTest('T3.10', 'Valid edge time - midnight', passed, `Time: ${res.data.data.scheduleTime}`);
    } catch (e) {
      logTest('T3.10', 'Valid edge time - midnight', false, e.response?.data?.error?.message || e.message);
    }

    // T3.11: Valid edge time - end of day
    console.log('\n=== T3.11: Valid edge time - end of day ===');
    try {
      const res = await axios.put(`${BASE_URL}/settings/patch-preferences`,
        { scheduleTime: '23:59:59' },
        { headers }
      );
      const passed = res.status === 200 && res.data.data.scheduleTime === '23:59:59';
      logTest('T3.11', 'Valid edge time - end of day', passed, `Time: ${res.data.data.scheduleTime}`);
    } catch (e) {
      logTest('T3.11', 'Valid edge time - end of day', false, e.response?.data?.error?.message || e.message);
    }

    // T3.12: Invalid approval policy
    console.log('\n=== T3.12: Invalid approval policy ===');
    try {
      const res = await axios.put(`${BASE_URL}/settings/patch-preferences`,
        { patchApprovalPolicy: 'AutoApprove' },
        { headers }
      );
      logTest('T3.12', 'Invalid approval policy', false, 'Should have returned 400');
    } catch (e) {
      const passed = e.response?.status === 400;
      logTest('T3.12', 'Invalid approval policy', passed, e.response?.data?.error?.message || e.message);
    }

    // T3.13: Update all fields
    console.log('\n=== T3.13: Update all fields ===');
    try {
      const payload = {
        enablePatching: true,
        corridorOnlyApprovedPatch: true,
        patchSyncForOS: ['Ubuntu'],
        patchApprovalPolicy: 'TestAndApprove',
        enableThirdPartyPatching: true,
        patchApprovalScheduleTime: '01:00:00',
        scheduleTime: '02:00:00',
        zeroTouchDeploymentScheduleTime: '03:00:00'
      };
      const res = await axios.put(`${BASE_URL}/settings/patch-preferences`, payload, { headers });
      const data = res.data.data;
      const passed = res.status === 200 &&
        data.enablePatching === true &&
        data.corridorOnlyApprovedPatch === true &&
        JSON.stringify(data.patchSyncForOS) === JSON.stringify(['Ubuntu']) &&
        data.patchApprovalPolicy === 'TestAndApprove' &&
        data.enableThirdPartyPatching === true &&
        data.patchApprovalScheduleTime === '01:00:00' &&
        data.scheduleTime === '02:00:00' &&
        data.zeroTouchDeploymentScheduleTime === '03:00:00';
      logTest('T3.13', 'Update all fields', passed, 'All fields updated');
    } catch (e) {
      logTest('T3.13', 'Update all fields', false, e.response?.data?.error?.message || e.message);
    }

    // T3.14: Sync now
    console.log('\n=== T3.14: Sync now ===');
    try {
      const res = await axios.post(`${BASE_URL}/settings/patch-preferences/sync`, {}, { headers });
      const passed = res.status === 200 && res.data.data.message && res.data.data.syncedAt;
      logTest('T3.14', 'Sync now', passed, `Message: ${res.data.data.message}`);
    } catch (e) {
      logTest('T3.14', 'Sync now', false, e.response?.data?.error?.message || e.message);
    }

    // T3.15: Sync updates lastSyncedAt
    console.log('\n=== T3.15: Sync updates lastSyncedAt ===');
    try {
      await axios.post(`${BASE_URL}/settings/patch-preferences/sync`, {}, { headers });
      const res = await axios.get(`${BASE_URL}/settings/patch-preferences`, { headers });
      const lastSynced = res.data.data.lastSyncedAt;
      const isRecent = lastSynced && new Date(lastSynced).getTime() > Date.now() - 5000;
      logTest('T3.15', 'Sync updates lastSyncedAt', isRecent, `lastSyncedAt: ${lastSynced}`);
    } catch (e) {
      logTest('T3.15', 'Sync updates lastSyncedAt', false, e.response?.data?.error?.message || e.message);
    }

    // T3.16: Idempotent PUT
    console.log('\n=== T3.16: Idempotent PUT ===');
    try {
      const payload = { enablePatching: true };
      const res1 = await axios.put(`${BASE_URL}/settings/patch-preferences`, payload, { headers });
      const res2 = await axios.put(`${BASE_URL}/settings/patch-preferences`, payload, { headers });
      const passed = res1.status === 200 && res2.status === 200 &&
        res1.data.data.enablePatching === res2.data.data.enablePatching;
      logTest('T3.16', 'Idempotent PUT', passed, 'Both PUTs returned 200');
    } catch (e) {
      logTest('T3.16', 'Idempotent PUT', false, e.response?.data?.error?.message || e.message);
    }

    // T3.17: Persistence
    console.log('\n=== T3.17: Persistence ===');
    try {
      const payload = { enablePatching: false, patchApprovalPolicy: 'PreApproved' };
      await axios.put(`${BASE_URL}/settings/patch-preferences`, payload, { headers });
      const res = await axios.get(`${BASE_URL}/settings/patch-preferences`, { headers });
      const passed = res.data.data.enablePatching === false &&
        res.data.data.patchApprovalPolicy === 'PreApproved';
      logTest('T3.17', 'Persistence', passed, 'Values persisted after GET');
    } catch (e) {
      logTest('T3.17', 'Persistence', false, e.response?.data?.error?.message || e.message);
    }

    // T3.18: RBAC: user denied PUT
    console.log('\n=== T3.18: RBAC: user denied PUT ===');
    try {
      const res = await axios.put(`${BASE_URL}/settings/patch-preferences`,
        { enablePatching: true },
        { headers: demoHeaders }
      );
      logTest('T3.18', 'RBAC: user denied PUT', false, 'Should have returned 403');
    } catch (e) {
      const passed = e.response?.status === 403;
      logTest('T3.18', 'RBAC: user denied PUT', passed, e.response?.data?.error?.message || e.message);
    }

    // T3.19: RBAC: user allowed GET
    console.log('\n=== T3.19: RBAC: user allowed GET ===');
    try {
      const res = await axios.get(`${BASE_URL}/settings/patch-preferences`, { headers: demoHeaders });
      const passed = res.status === 200;
      logTest('T3.19', 'RBAC: user allowed GET', passed, 'Demo user can view settings');
    } catch (e) {
      logTest('T3.19', 'RBAC: user allowed GET', false, e.response?.data?.error?.message || e.message);
    }

    // T3.20: RBAC: user denied sync
    console.log('\n=== T3.20: RBAC: user denied sync ===');
    try {
      const res = await axios.post(`${BASE_URL}/settings/patch-preferences/sync`, {}, { headers: demoHeaders });
      logTest('T3.20', 'RBAC: user denied sync', false, 'Should have returned 403');
    } catch (e) {
      const passed = e.response?.status === 403;
      logTest('T3.20', 'RBAC: user denied sync', passed, e.response?.data?.error?.message || e.message);
    }

    // T3.21: Empty body PUT
    console.log('\n=== T3.21: Empty body PUT ===');
    try {
      const before = await axios.get(`${BASE_URL}/settings/patch-preferences`, { headers });
      const res = await axios.put(`${BASE_URL}/settings/patch-preferences`, {}, { headers });
      const passed = res.status === 200 &&
        res.data.data.enablePatching === before.data.data.enablePatching;
      logTest('T3.21', 'Empty body PUT', passed, 'No changes made');
    } catch (e) {
      logTest('T3.21', 'Empty body PUT', false, e.response?.data?.error?.message || e.message);
    }

    // T3.22: Extra fields ignored
    console.log('\n=== T3.22: Extra fields ignored ===');
    try {
      const res = await axios.put(`${BASE_URL}/settings/patch-preferences`,
        { enablePatching: true, unknownField: 'x' },
        { headers }
      );
      const hasUnknownField = Object.prototype.hasOwnProperty.call(res.data.data, 'unknownField');
      const passed = res.status === 200 && !hasUnknownField;
      logTest('T3.22', 'Extra fields ignored', passed, 'Extra field stripped');
    } catch (e) {
      logTest('T3.22', 'Extra fields ignored', false, e.response?.data?.error?.message || e.message);
    }

    // T3.23: Enable third-party toggle
    console.log('\n=== T3.23: Enable third-party toggle ===');
    try {
      await axios.put(`${BASE_URL}/settings/patch-preferences`,
        { enableThirdPartyPatching: true },
        { headers }
      );
      const res = await axios.get(`${BASE_URL}/settings/patch-preferences`, { headers });
      const passed = res.data.data.enableThirdPartyPatching === true;
      logTest('T3.23', 'Enable third-party toggle', passed, `Value: ${res.data.data.enableThirdPartyPatching}`);
    } catch (e) {
      logTest('T3.23', 'Enable third-party toggle', false, e.response?.data?.error?.message || e.message);
    }

    // Reset to defaults
    console.log('\n=== Resetting to defaults ===');
    try {
      const defaults = {
        enablePatching: true,
        corridorOnlyApprovedPatch: false,
        patchSyncForOS: ['Windows'],
        patchApprovalPolicy: 'ManuallyApproves',
        enableThirdPartyPatching: false,
        patchApprovalScheduleTime: '02:00:00',
        scheduleTime: '03:00:00',
        zeroTouchDeploymentScheduleTime: '04:00:00'
      };
      await axios.put(`${BASE_URL}/settings/patch-preferences`, defaults, { headers });
      console.log('✓ Reset to defaults complete');
    } catch (e) {
      console.log('✗ Failed to reset to defaults:', e.response?.data?.error?.message || e.message);
    }

    // Print summary
    console.log('\n=== SUMMARY ===');
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    console.log(`Total: ${passed}/${total} tests passed\n`);

    results.forEach(r => {
      const status = r.passed ? '✓ PASS' : '✗ FAIL';
      console.log(`${status} - ${r.id}: ${r.description}`);
    });

    if (passed === total) {
      console.log('\n🎉 All tests passed!');
    } else {
      console.log(`\n⚠️  ${total - passed} test(s) failed`);
    }

  } catch (error) {
    console.error('Fatal error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

runTests();
