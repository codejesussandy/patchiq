#!/usr/bin/env tsx

/**
 * Validation script for R1: Server Settings — Runtime Enforcement
 *
 * Tests all 11 acceptance criteria:
 * - V1-V2: Session timeout enforcement in JWT exp claim
 * - V3-V5: Validation edge cases (idle > session, out-of-range)
 * - V6-V8: Log level settings persistence and validation
 * - V9: GET returns current values, not hardcoded defaults
 * - V10-V11: RBAC enforcement (user vs admin)
 */

import jwt from 'jsonwebtoken';

const BASE_URL = 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@patchiq.io';
const ADMIN_PASSWORD = 'admin123';
const DB_URL = 'postgresql://postgres:postgres@localhost:4500/patchiq_dev';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function pass(name: string, message: string) {
  results.push({ name, passed: true, message });
  console.log(`✅ ${name}: ${message}`);
}

function fail(name: string, message: string) {
  results.push({ name, passed: false, message });
  console.error(`❌ ${name}: ${message}`);
}

async function makeRequest(
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

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: any;
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  return { status: response.status, data };
}

async function login(email: string, password: string): Promise<string> {
  const { status, data } = await makeRequest('POST', '/v1/auth/login', undefined, {
    email,
    password,
  });

  if (status !== 200 || !data.success || !data.data?.accessToken) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`);
  }

  return data.data.accessToken;
}

function decodeJWT(token: string): any {
  return jwt.decode(token);
}

function getExpMinutesFromNow(token: string): number {
  const decoded = decodeJWT(token);
  if (!decoded?.exp) throw new Error('No exp claim in JWT');
  const now = Math.floor(Date.now() / 1000);
  const diff = decoded.exp - now;
  return Math.floor(diff / 60);
}

function isWithinTolerance(actual: number, expected: number, tolerance: number): boolean {
  return Math.abs(actual - expected) <= tolerance;
}

async function updateServerSettings(token: string, body: any): Promise<{ status: number; data: any }> {
  return makeRequest('PUT', '/v1/settings/server', token, body);
}

async function getServerSettings(token: string): Promise<{ status: number; data: any }> {
  return makeRequest('GET', '/v1/settings/server', token);
}

async function createTestUser(adminToken: string): Promise<{ id: string; email: string; password: string }> {
  const testEmail = `test-user-${Date.now()}@patchiq.io`;
  const testPassword = 'TestUser123!';

  const { status, data } = await makeRequest('POST', '/v1/settings/users', adminToken, {
    email: testEmail,
    name: 'Test User',
    password: testPassword,
    role: 'user', // Use role name, not ID
  });

  if (status !== 201 || !data.success || !data.data?.id) {
    throw new Error(`Failed to create test user: ${JSON.stringify(data)}`);
  }

  return { id: data.data.id, email: testEmail, password: testPassword };
}

async function deleteTestUser(adminToken: string, userId: string) {
  await makeRequest('DELETE', `/v1/settings/users/${userId}`, adminToken);
}

async function restoreDefaultSettings(adminToken: string) {
  console.log('\n🔄 Restoring default server settings...');
  await updateServerSettings(adminToken, {
    sessionTimeout: true,
    sessionTimeoutMinutes: 60,
    sessionIdleTimeoutMinutes: 15,
    logLevel: 'Info',
    endpointOnlineStatusTimeoutHours: 1,
    endpointScanJobTimeoutHours: 1,
  });
  console.log('✓ Default settings restored\n');
}

async function main() {
  console.log('🚀 Starting R1: Server Settings validation\n');

  let adminToken: string;
  let testUserId: string | undefined;

  try {
    // Login as admin
    console.log('🔐 Logging in as admin...');
    adminToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✓ Admin login successful\n');

    // =======================================================
    // V1: Session timeout enabled, 10 minutes
    // =======================================================
    console.log('📋 V1: Testing sessionTimeoutMinutes=10 enforcement...');
    const v1Update = await updateServerSettings(adminToken, {
      sessionTimeout: true,
      sessionTimeoutMinutes: 10,
    });

    if (v1Update.status !== 200) {
      fail('V1', `Failed to update settings: ${v1Update.status}`);
    } else {
      // Login again to get new JWT
      const newToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
      const expMinutes = getExpMinutesFromNow(newToken);

      if (isWithinTolerance(expMinutes, 10, 0.5)) {
        pass('V1', `JWT exp is ~${expMinutes} minutes from now (expected ~10)`);
      } else {
        fail('V1', `JWT exp is ${expMinutes} minutes from now, expected ~10 (±30s)`);
      }
    }

    // =======================================================
    // V2: Session timeout disabled (24h default)
    // =======================================================
    console.log('📋 V2: Testing sessionTimeout=false (24h default)...');
    const v2Update = await updateServerSettings(adminToken, {
      sessionTimeout: false,
    });

    if (v2Update.status !== 200) {
      fail('V2', `Failed to update settings: ${v2Update.status}`);
    } else {
      const newToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
      const expMinutes = getExpMinutesFromNow(newToken);

      if (isWithinTolerance(expMinutes, 1440, 5)) {
        pass('V2', `JWT exp is ~${expMinutes} minutes from now (expected ~1440)`);
      } else {
        fail('V2', `JWT exp is ${expMinutes} minutes from now, expected ~1440 (24h)`);
      }
    }

    // =======================================================
    // V3: Validation — idle > session should fail
    // =======================================================
    console.log('📋 V3: Testing idle > session validation (should 400)...');
    const v3Update = await updateServerSettings(adminToken, {
      sessionIdleTimeoutMinutes: 120,
      sessionTimeoutMinutes: 60,
    });

    if (v3Update.status === 400) {
      pass('V3', 'Correctly rejected idle > session with 400');
    } else {
      fail('V3', `Expected 400, got ${v3Update.status}`);
    }

    // =======================================================
    // V4: Validation — sessionTimeoutMinutes=0 should fail
    // =======================================================
    console.log('📋 V4: Testing sessionTimeoutMinutes=0 (should 400)...');
    const v4Update = await updateServerSettings(adminToken, {
      sessionTimeoutMinutes: 0,
    });

    if (v4Update.status === 400) {
      pass('V4', 'Correctly rejected sessionTimeoutMinutes=0 with 400');
    } else {
      fail('V4', `Expected 400, got ${v4Update.status}`);
    }

    // =======================================================
    // V5: Validation — sessionTimeoutMinutes=1441 should fail
    // =======================================================
    console.log('📋 V5: Testing sessionTimeoutMinutes=1441 (should 400)...');
    const v5Update = await updateServerSettings(adminToken, {
      sessionTimeoutMinutes: 1441,
    });

    if (v5Update.status === 400) {
      pass('V5', 'Correctly rejected sessionTimeoutMinutes=1441 with 400');
    } else {
      fail('V5', `Expected 400, got ${v5Update.status}`);
    }

    // =======================================================
    // V6: Log level = Debug
    // =======================================================
    console.log('📋 V6: Testing logLevel=Debug...');
    const v6Update = await updateServerSettings(adminToken, {
      logLevel: 'Debug',
    });

    if (v6Update.status === 200) {
      // Verify by GET
      const getResult = await getServerSettings(adminToken);
      if (getResult.data?.data?.logLevel === 'Debug') {
        pass('V6', 'logLevel=Debug saved and verified');
      } else {
        fail('V6', `GET returned logLevel=${getResult.data?.data?.logLevel}, expected Debug`);
      }
    } else {
      fail('V6', `Failed to set logLevel=Debug: ${v6Update.status}`);
    }

    // =======================================================
    // V7: Log level = Error
    // =======================================================
    console.log('📋 V7: Testing logLevel=Error...');
    const v7Update = await updateServerSettings(adminToken, {
      logLevel: 'Error',
    });

    if (v7Update.status === 200) {
      const getResult = await getServerSettings(adminToken);
      if (getResult.data?.data?.logLevel === 'Error') {
        pass('V7', 'logLevel=Error saved and verified');
      } else {
        fail('V7', `GET returned logLevel=${getResult.data?.data?.logLevel}, expected Error`);
      }
    } else {
      fail('V7', `Failed to set logLevel=Error: ${v7Update.status}`);
    }

    // =======================================================
    // V8: Invalid log level (should 400)
    // =======================================================
    console.log('📋 V8: Testing logLevel=TRACE (invalid, should 400)...');
    const v8Update = await updateServerSettings(adminToken, {
      logLevel: 'TRACE',
    });

    if (v8Update.status === 400) {
      pass('V8', 'Correctly rejected invalid logLevel with 400');
    } else {
      fail('V8', `Expected 400, got ${v8Update.status}`);
    }

    // =======================================================
    // V9: GET returns current values, not defaults
    // =======================================================
    console.log('📋 V9: Testing GET returns current values...');
    // Set a unique value
    await updateServerSettings(adminToken, {
      sessionTimeoutMinutes: 77,
      logLevel: 'Warning',
    });

    const v9Get = await getServerSettings(adminToken);
    const v9Data = v9Get.data?.data;

    if (v9Data?.sessionTimeoutMinutes === 77 && v9Data?.logLevel === 'Warning') {
      pass('V9', 'GET returns current saved values (not hardcoded defaults)');
    } else {
      fail('V9', `GET returned sessionTimeoutMinutes=${v9Data?.sessionTimeoutMinutes}, logLevel=${v9Data?.logLevel}`);
    }

    // =======================================================
    // V10: User role cannot GET settings (403)
    // =======================================================
    console.log('📋 V10: Testing RBAC — user role should get 403 on GET...');
    const testUser = await createTestUser(adminToken);
    testUserId = testUser.id;

    const userToken = await login(testUser.email, testUser.password);
    const v10Get = await getServerSettings(userToken);

    if (v10Get.status === 403) {
      pass('V10', 'User role correctly denied GET with 403');
    } else {
      fail('V10', `Expected 403, got ${v10Get.status}`);
    }

    // =======================================================
    // V11: Admin role can PUT settings (200)
    // =======================================================
    console.log('📋 V11: Testing RBAC — admin can PUT settings...');
    const v11Update = await updateServerSettings(adminToken, {
      sessionTimeoutMinutes: 45,
    });

    if (v11Update.status === 200) {
      pass('V11', 'Admin successfully updated settings with 200');
    } else {
      fail('V11', `Expected 200, got ${v11Update.status}`);
    }

    // Clean up test user
    if (testUserId) {
      console.log('\n🧹 Cleaning up test user...');
      await deleteTestUser(adminToken, testUserId);
    }

    // Restore defaults
    await restoreDefaultSettings(adminToken);

  } catch (error: any) {
    console.error('\n💥 Fatal error:', error.message);
    process.exit(1);
  }

  // =======================================================
  // Summary
  // =======================================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 VALIDATION SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`PASS: ${passed}/11 | FAIL: ${failed}/11\n`);

  results.forEach(r => {
    const icon = r.passed ? '✅' : '❌';
    console.log(`${icon} ${r.name}: ${r.message}`);
  });

  console.log('\n' + '='.repeat(60));

  if (failed > 0) {
    console.log('\n❌ Validation FAILED\n');
    process.exit(1);
  } else {
    console.log('\n✅ All validations PASSED\n');
  }
}

main();
