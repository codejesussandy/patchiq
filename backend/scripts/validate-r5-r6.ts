#!/usr/bin/env tsx
/**
 * R5 (Remote Desktop) and R6 (Risk Score) Acceptance Criteria Validator
 *
 * Tests:
 * R5 (Remote Desktop):
 *   V43: PUT with connectionType="Remote" → expect 200
 *   V44: PUT with connectionType="VNC" → expect 400
 *   V45: POST reset → expect 200 with defaults
 *   V46: PUT with userConsent="true" (string) → expect 400
 *   V47: USER role try PUT → expect 403
 *
 * R6 (Risk Score):
 *   V48: PUT weights sum to 0.8 → expect 400
 *   V49: PUT vulnerabilityScoreWeight=1.5 → expect 400
 *   V50: PUT threatsWeight=-0.1 → expect 400
 *   V51: PUT valid weights 0.4+0.3+0.2+0.1=1.0 → expect 200
 *   V52: PUT 0.33+0.33+0.33+0.01=1.0 → expect 200 (float tolerance)
 *   V53: PUT applyDefaultSettings=true → expect 200 with 0.25 each
 *   V58: USER role try PUT → expect 403
 */

const BASE_URL = 'http://localhost:3000/v1';
const ADMIN_EMAIL = 'admin@patchiq.io';
const ADMIN_PASSWORD = 'admin123';

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

// Fetch wrapper
async function request(
  method: string,
  path: string,
  token?: string,
  body?: any
): Promise<{ status: number; data: any }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${path}`, options);
  let data: any;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return { status: response.status, data };
}

// Login helper
async function login(email: string, password: string): Promise<string> {
  const { status, data } = await request('POST', '/auth/login', undefined, {
    email,
    password,
  });

  if (status !== 200 || !data?.data?.accessToken) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`);
  }

  return data.data.accessToken;
}

// Create test user
async function createTestUser(adminToken: string): Promise<{ id: string; email: string; password: string }> {
  const timestamp = Date.now();
  const testEmail = `test-user-${timestamp}@patchiq.io`;
  const testPassword = 'TestPassword123!';

  const { status, data } = await request('POST', '/settings/users', adminToken, {
    email: testEmail,
    name: `Test User ${timestamp}`,
    password: testPassword,
    role: 'user', // Role name, not ID
  });

  if (status !== 200 && status !== 201) {
    throw new Error(`Failed to create test user: ${JSON.stringify(data)}`);
  }

  return {
    id: data.data.id,
    email: testEmail,
    password: testPassword,
  };
}

// Delete test user
async function deleteTestUser(adminToken: string, userId: string): Promise<void> {
  await request('DELETE', `/settings/users/${userId}`, adminToken);
}

// Test runner
function addResult(id: string, name: string, passed: boolean, error?: string) {
  results.push({ id, name, passed, error });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${id}: ${name}`);
  if (error) {
    console.log(`  Error: ${error}`);
  }
}

async function runTests() {
  console.log('='.repeat(80));
  console.log('R5 (Remote Desktop) and R6 (Risk Score) Validation Tests');
  console.log('='.repeat(80));
  console.log();

  let adminToken: string;
  let testUserToken: string | undefined;
  let testUserId: string | undefined;

  try {
    // Login as admin
    console.log('Logging in as admin...');
    adminToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✓ Admin login successful');
    console.log();

    // Create test user with USER role
    console.log('Creating test user with USER role...');
    const testUser = await createTestUser(adminToken);
    testUserId = testUser.id;
    console.log(`✓ Test user created: ${testUser.email}`);
    console.log();

    // Login as test user
    console.log('Logging in as test user...');
    testUserToken = await login(testUser.email, testUser.password);
    console.log('✓ Test user login successful');
    console.log();

    // =================================================================
    // R5 Tests: Remote Desktop Settings
    // =================================================================
    console.log('--- R5: Remote Desktop Settings Tests ---');
    console.log();

    // V43: PUT with connectionType="Remote" → expect 200
    try {
      const { status, data } = await request(
        'PUT',
        '/settings/remote-desktop',
        adminToken,
        { connectionType: 'Remote' }
      );

      if (status === 200 && data.data?.connectionType === 'Remote') {
        addResult('V43', 'PUT connectionType=Remote returns 200', true);
      } else {
        addResult('V43', 'PUT connectionType=Remote returns 200', false,
          `Expected 200, got ${status}. Data: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      addResult('V43', 'PUT connectionType=Remote returns 200', false, String(error));
    }

    // V44: PUT with connectionType="VNC" → expect 400
    try {
      const { status, data } = await request(
        'PUT',
        '/settings/remote-desktop',
        adminToken,
        { connectionType: 'VNC' }
      );

      if (status === 400) {
        addResult('V44', 'PUT connectionType=VNC returns 400', true);
      } else {
        addResult('V44', 'PUT connectionType=VNC returns 400', false,
          `Expected 400, got ${status}. Data: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      addResult('V44', 'PUT connectionType=VNC returns 400', false, String(error));
    }

    // V45: POST reset → expect 200 with defaults (connectionType=Local)
    try {
      const { status, data } = await request(
        'POST',
        '/settings/remote-desktop/reset',
        adminToken
      );

      if (status === 200 && data.data?.connectionType === 'Local') {
        addResult('V45', 'POST reset returns 200 with connectionType=Local', true);
      } else {
        addResult('V45', 'POST reset returns 200 with connectionType=Local', false,
          `Expected 200 with connectionType=Local, got ${status}. Data: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      addResult('V45', 'POST reset returns 200 with connectionType=Local', false, String(error));
    }

    // V46: PUT with userConsent="true" (string, not boolean) → expect 400
    try {
      const { status, data } = await request(
        'PUT',
        '/settings/remote-desktop',
        adminToken,
        { userConsent: 'true' } // string instead of boolean
      );

      if (status === 400) {
        addResult('V46', 'PUT userConsent="true" (string) returns 400', true);
      } else {
        addResult('V46', 'PUT userConsent="true" (string) returns 400', false,
          `Expected 400, got ${status}. Data: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      addResult('V46', 'PUT userConsent="true" (string) returns 400', false, String(error));
    }

    // V47: USER role try PUT → expect 403
    try {
      const { status, data } = await request(
        'PUT',
        '/settings/remote-desktop',
        testUserToken,
        { connectionType: 'Local' }
      );

      if (status === 403) {
        addResult('V47', 'USER role PUT returns 403', true);
      } else {
        addResult('V47', 'USER role PUT returns 403', false,
          `Expected 403, got ${status}. Data: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      addResult('V47', 'USER role PUT returns 403', false, String(error));
    }

    console.log();

    // =================================================================
    // R6 Tests: Risk Score Settings
    // =================================================================
    console.log('--- R6: Risk Score Settings Tests ---');
    console.log();

    // V48: PUT weights sum to 0.8 → expect 400
    try {
      const { status, data } = await request(
        'PUT',
        '/settings/risk-score',
        adminToken,
        {
          vulnerabilityScoreWeight: 0.3,
          vulnerabilitySeverityWeight: 0.2,
          threatsWeight: 0.2,
          endpointVisitsWeight: 0.1,
        }
      );

      const hasWeightError = status === 400 && (
        data.error?.message?.includes('Weights must sum to 1.0') ||
        JSON.stringify(data).includes('Weights must sum to 1.0')
      );

      if (hasWeightError) {
        addResult('V48', 'PUT weights sum to 0.8 returns 400', true);
      } else {
        addResult('V48', 'PUT weights sum to 0.8 returns 400', false,
          `Expected 400 with "Weights must sum to 1.0", got ${status}. Data: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      addResult('V48', 'PUT weights sum to 0.8 returns 400', false, String(error));
    }

    // V49: PUT vulnerabilityScoreWeight=1.5 → expect 400
    try {
      const { status, data } = await request(
        'PUT',
        '/settings/risk-score',
        adminToken,
        {
          vulnerabilityScoreWeight: 1.5,
          vulnerabilitySeverityWeight: 0.25,
          threatsWeight: 0.25,
          endpointVisitsWeight: 0.25,
        }
      );

      if (status === 400) {
        addResult('V49', 'PUT vulnerabilityScoreWeight=1.5 returns 400', true);
      } else {
        addResult('V49', 'PUT vulnerabilityScoreWeight=1.5 returns 400', false,
          `Expected 400, got ${status}. Data: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      addResult('V49', 'PUT vulnerabilityScoreWeight=1.5 returns 400', false, String(error));
    }

    // V50: PUT threatsWeight=-0.1 → expect 400
    try {
      const { status, data } = await request(
        'PUT',
        '/settings/risk-score',
        adminToken,
        {
          vulnerabilityScoreWeight: 0.4,
          vulnerabilitySeverityWeight: 0.4,
          threatsWeight: -0.1,
          endpointVisitsWeight: 0.3,
        }
      );

      if (status === 400) {
        addResult('V50', 'PUT threatsWeight=-0.1 returns 400', true);
      } else {
        addResult('V50', 'PUT threatsWeight=-0.1 returns 400', false,
          `Expected 400, got ${status}. Data: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      addResult('V50', 'PUT threatsWeight=-0.1 returns 400', false, String(error));
    }

    // V51: PUT valid weights 0.4+0.3+0.2+0.1=1.0 → expect 200
    try {
      const { status, data } = await request(
        'PUT',
        '/settings/risk-score',
        adminToken,
        {
          vulnerabilityScoreWeight: 0.4,
          vulnerabilitySeverityWeight: 0.3,
          threatsWeight: 0.2,
          endpointVisitsWeight: 0.1,
        }
      );

      if (status === 200) {
        addResult('V51', 'PUT valid weights (0.4+0.3+0.2+0.1) returns 200', true);
      } else {
        addResult('V51', 'PUT valid weights (0.4+0.3+0.2+0.1) returns 200', false,
          `Expected 200, got ${status}. Data: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      addResult('V51', 'PUT valid weights (0.4+0.3+0.2+0.1) returns 200', false, String(error));
    }

    // V52: PUT 0.33+0.33+0.33+0.01=1.0 → expect 200 (float tolerance)
    try {
      const { status, data } = await request(
        'PUT',
        '/settings/risk-score',
        adminToken,
        {
          vulnerabilityScoreWeight: 0.33,
          vulnerabilitySeverityWeight: 0.33,
          threatsWeight: 0.33,
          endpointVisitsWeight: 0.01,
        }
      );

      if (status === 200) {
        addResult('V52', 'PUT weights with float tolerance (0.33+0.33+0.33+0.01) returns 200', true);
      } else {
        addResult('V52', 'PUT weights with float tolerance (0.33+0.33+0.33+0.01) returns 200', false,
          `Expected 200, got ${status}. Data: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      addResult('V52', 'PUT weights with float tolerance (0.33+0.33+0.33+0.01) returns 200', false, String(error));
    }

    // V53: PUT applyDefaultSettings=true → expect 200 with 0.25 each
    try {
      const { status, data } = await request(
        'PUT',
        '/settings/risk-score',
        adminToken,
        { applyDefaultSettings: true }
      );

      const allWeights025 =
        data.data?.vulnerabilityScoreWeight === 0.25 &&
        data.data?.vulnerabilitySeverityWeight === 0.25 &&
        data.data?.threatsWeight === 0.25 &&
        data.data?.endpointVisitsWeight === 0.25;

      if (status === 200 && allWeights025) {
        addResult('V53', 'PUT applyDefaultSettings=true returns 200 with all weights=0.25', true);
      } else {
        addResult('V53', 'PUT applyDefaultSettings=true returns 200 with all weights=0.25', false,
          `Expected 200 with all weights=0.25, got ${status}. Data: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      addResult('V53', 'PUT applyDefaultSettings=true returns 200 with all weights=0.25', false, String(error));
    }

    // V58: USER role try PUT → expect 403
    try {
      const { status, data } = await request(
        'PUT',
        '/settings/risk-score',
        testUserToken,
        { applyDefaultSettings: true }
      );

      if (status === 403) {
        addResult('V58', 'USER role PUT returns 403', true);
      } else {
        addResult('V58', 'USER role PUT returns 403', false,
          `Expected 403, got ${status}. Data: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      addResult('V58', 'USER role PUT returns 403', false, String(error));
    }

    console.log();

    // =================================================================
    // Restore Defaults
    // =================================================================
    console.log('--- Restoring Defaults ---');
    console.log();

    // Restore Remote Desktop defaults
    await request('POST', '/settings/remote-desktop/reset', adminToken);
    console.log('✓ Remote Desktop reset to defaults');

    // Restore Risk Score defaults
    await request('PUT', '/settings/risk-score', adminToken, { applyDefaultSettings: true });
    console.log('✓ Risk Score reset to defaults');

    console.log();

  } catch (error) {
    console.error('Fatal error during test execution:', error);
  } finally {
    // Cleanup: delete test user
    if (testUserId && adminToken) {
      try {
        console.log('Cleaning up test user...');
        await deleteTestUser(adminToken, testUserId);
        console.log('✓ Test user deleted');
        console.log();
      } catch (error) {
        console.error('Failed to delete test user:', error);
      }
    }
  }

  // =================================================================
  // Summary
  // =================================================================
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log();

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`PASS: ${passed}/${total} | FAIL: ${failed}/${total}`);
  console.log();

  if (failed > 0) {
    console.log('Failed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.id}: ${r.name}`);
      if (r.error) {
        console.log(`    ${r.error}`);
      }
    });
    console.log();
  }

  // Exit with error code if any tests failed
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
