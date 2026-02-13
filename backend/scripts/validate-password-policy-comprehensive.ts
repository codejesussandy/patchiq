#!/usr/bin/env ts-node
/**
 * Comprehensive Password Policy Validation Script (R4)
 * Tests all 18 test cases T4.1-T4.18
 */

import axios, { AxiosError } from 'axios';

const API_BASE = process.env.API_BASE || 'http://localhost:3000/v1';
const ADMIN_EMAIL = 'admin@patchiq.io';
const ADMIN_PASSWORD = 'admin123';
const DEMO_EMAIL = 'demo@patchiq.io';
const DEMO_PASSWORD = 'demo123';

interface ApiResponse {
  success: boolean;
  data?: unknown;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

let adminAccessToken = '';
let demoAccessToken = '';
let testEmailCounter = 0;

async function login(email: string, password: string): Promise<string> {
  const response = await axios.post<ApiResponse>(`${API_BASE}/auth/login`, {
    email,
    password,
  });

  if (response.data.success && response.data.data) {
    const { accessToken } = response.data.data as { accessToken: string };
    return accessToken;
  }
  throw new Error(`Login failed for ${email}`);
}

function getTestEmail(): string {
  testEmailCounter++;
  return `test-user-${Date.now()}-${testEmailCounter}@example.com`;
}

async function testT41_GetDefaultPolicy(): Promise<boolean> {
  console.log('\n=== T4.1: GET /password-policy returns default policy ===');
  try {
    const response = await axios.get<ApiResponse>(`${API_BASE}/settings/password-policy`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });

    const policy = response.data.data as any;
    const isDefault =
      policy.minCharacterCount === 8 &&
      policy.minNumbers === true &&
      policy.minLowerCaseCharacters === true &&
      policy.minUpperCaseCharacters === true &&
      policy.minSpecialCharacters === true;

    console.log(isDefault ? '✅ PASS' : '❌ FAIL');
    return isDefault;
  } catch (e) {
    console.log('❌ FAIL:', (e as Error).message);
    return false;
  }
}

async function testT42_UpdatePolicy(): Promise<boolean> {
  console.log('\n=== T4.2: PUT /password-policy updates policy ===');
  try {
    const response = await axios.put<ApiResponse>(
      `${API_BASE}/settings/password-policy`,
      { minCharacterCount: 12, minNumbers: false },
      { headers: { Authorization: `Bearer ${adminAccessToken}` } }
    );

    const updated = response.data.data as any;
    const success =
      updated.minCharacterCount === 12 &&
      updated.minNumbers === false &&
      updated.minLowerCaseCharacters === true; // Should merge with defaults

    console.log(success ? '✅ PASS' : '❌ FAIL');

    // Restore defaults
    await axios.put<ApiResponse>(
      `${API_BASE}/settings/password-policy`,
      {
        minCharacterCount: 8,
        minNumbers: true,
        minLowerCaseCharacters: true,
        minUpperCaseCharacters: true,
        minSpecialCharacters: true,
      },
      { headers: { Authorization: `Bearer ${adminAccessToken}` } }
    );

    return success;
  } catch (e) {
    console.log('❌ FAIL:', (e as Error).message);
    return false;
  }
}

async function testT43_RejectWeakPasswordMinLength(): Promise<boolean> {
  console.log('\n=== T4.3: Reject password < min characters ===');
  try {
    await axios.post<ApiResponse>(`${API_BASE}/auth/register`, {
      email: getTestEmail(),
      password: 'Short1!', // 7 chars, needs 8
      name: 'Test User',
    });

    console.log('❌ FAIL: Should have rejected short password');
    return false;
  } catch (error) {
    const axiosError = error as AxiosError<ApiResponse>;
    if (axiosError.response?.status === 400) {
      const err = axiosError.response.data.error as any;
      const hasViolation = err?.details?.details?.some(
        (v: any) => v.message.includes('at least 8 characters')
      );
      console.log(hasViolation ? '✅ PASS' : '❌ FAIL');
      return hasViolation;
    }
    console.log('❌ FAIL: Wrong error status');
    return false;
  }
}

async function testT44_RejectPasswordNoNumbers(): Promise<boolean> {
  console.log('\n=== T4.4: Reject password without numbers ===');
  try {
    await axios.post<ApiResponse>(`${API_BASE}/auth/register`, {
      email: getTestEmail(),
      password: 'OnlyLetters!A', // No numbers
      name: 'Test User',
    });

    console.log('❌ FAIL: Should have rejected password without numbers');
    return false;
  } catch (error) {
    const axiosError = error as AxiosError<ApiResponse>;
    if (axiosError.response?.status === 400) {
      const err = axiosError.response.data.error as any;
      const hasViolation = err?.details?.details?.some(
        (v: any) => v.message.includes('number')
      );
      console.log(hasViolation ? '✅ PASS' : '❌ FAIL');
      return hasViolation;
    }
    console.log('❌ FAIL: Wrong error status');
    return false;
  }
}

async function testT45_RejectPasswordNoLowercase(): Promise<boolean> {
  console.log('\n=== T4.5: Reject password without lowercase ===');
  try {
    await axios.post<ApiResponse>(`${API_BASE}/auth/register`, {
      email: getTestEmail(),
      password: 'ONLYUPPERS1!', // No lowercase
      name: 'Test User',
    });

    console.log('❌ FAIL: Should have rejected password without lowercase');
    return false;
  } catch (error) {
    const axiosError = error as AxiosError<ApiResponse>;
    if (axiosError.response?.status === 400) {
      const err = axiosError.response.data.error as any;
      const hasViolation = err?.details?.details?.some(
        (v: any) => v.message.includes('lowercase')
      );
      console.log(hasViolation ? '✅ PASS' : '❌ FAIL');
      return hasViolation;
    }
    console.log('❌ FAIL: Wrong error status');
    return false;
  }
}

async function testT46_RejectPasswordNoUppercase(): Promise<boolean> {
  console.log('\n=== T4.6: Reject password without uppercase ===');
  try {
    await axios.post<ApiResponse>(`${API_BASE}/auth/register`, {
      email: getTestEmail(),
      password: 'onlysmall1!', // No uppercase
      name: 'Test User',
    });

    console.log('❌ FAIL: Should have rejected password without uppercase');
    return false;
  } catch (error) {
    const axiosError = error as AxiosError<ApiResponse>;
    if (axiosError.response?.status === 400) {
      const err = axiosError.response.data.error as any;
      const hasViolation = err?.details?.details?.some(
        (v: any) => v.message.includes('uppercase')
      );
      console.log(hasViolation ? '✅ PASS' : '❌ FAIL');
      return hasViolation;
    }
    console.log('❌ FAIL: Wrong error status');
    return false;
  }
}

async function testT47_RejectPasswordNoSpecialChar(): Promise<boolean> {
  console.log('\n=== T4.7: Reject password without special characters ===');
  try {
    await axios.post<ApiResponse>(`${API_BASE}/auth/register`, {
      email: getTestEmail(),
      password: 'NoSpecial1A', // No special chars
      name: 'Test User',
    });

    console.log('❌ FAIL: Should have rejected password without special chars');
    return false;
  } catch (error) {
    const axiosError = error as AxiosError<ApiResponse>;
    if (axiosError.response?.status === 400) {
      const err = axiosError.response.data.error as any;
      const hasViolation = err?.details?.details?.some(
        (v: any) => v.message.includes('special')
      );
      console.log(hasViolation ? '✅ PASS' : '❌ FAIL');
      return hasViolation;
    }
    console.log('❌ FAIL: Wrong error status');
    return false;
  }
}

async function testT48_MultipleViolations(): Promise<boolean> {
  console.log('\n=== T4.8: Return multiple violations at once ===');
  try {
    await axios.post<ApiResponse>(`${API_BASE}/auth/register`, {
      email: getTestEmail(),
      password: 'abc', // Missing: length, numbers, uppercase, special
      name: 'Test User',
    });

    console.log('❌ FAIL: Should have rejected password with multiple violations');
    return false;
  } catch (error) {
    const axiosError = error as AxiosError<ApiResponse>;
    if (axiosError.response?.status === 400) {
      const err = axiosError.response.data.error as any;
      const details = err?.details?.details as any[];
      const violationCount = details?.length || 0;
      const multipleViolations = violationCount >= 2;

      console.log(`Found ${violationCount} violations`);
      details?.forEach((v: any) => console.log(`  - ${v.message}`));
      console.log(multipleViolations ? '✅ PASS' : '❌ FAIL');
      return multipleViolations;
    }
    console.log('❌ FAIL: Wrong error status');
    return false;
  }
}

async function testT49_AcceptValidPassword(): Promise<boolean> {
  console.log('\n=== T4.9: Accept valid strong password ===');
  try {
    const email = getTestEmail();
    const response = await axios.post<ApiResponse>(`${API_BASE}/auth/register`, {
      email,
      password: 'ValidP@ss1234',
      name: 'Test User',
    });

    if (response.data.success) {
      // Clean up
      try {
        const userId = (response.data.data as any).id;
        await axios.delete(`${API_BASE}/settings/users/${userId}`, {
          headers: { Authorization: `Bearer ${adminAccessToken}` },
        });
      } catch {
        // Ignore cleanup errors
      }
      console.log('✅ PASS');
      return true;
    }
    console.log('❌ FAIL: Registration failed');
    return false;
  } catch (e) {
    console.log('❌ FAIL:', (e as Error).message);
    return false;
  }
}

async function testT410_EnforceAtCreateUser(): Promise<boolean> {
  console.log('\n=== T4.10: Enforce at POST /settings/users ===');
  try {
    await axios.post<ApiResponse>(
      `${API_BASE}/settings/users`,
      {
        email: getTestEmail(),
        name: 'Test',
        password: 'weak', // Weak password
        role: 'user',
      },
      { headers: { Authorization: `Bearer ${adminAccessToken}` } }
    );

    console.log('❌ FAIL: Should have rejected weak password');
    return false;
  } catch (error) {
    const axiosError = error as AxiosError<ApiResponse>;
    if (axiosError.response?.status === 400) {
      console.log('✅ PASS');
      return true;
    }
    console.log('❌ FAIL: Wrong error status');
    return false;
  }
}

async function testT411_PolicyChangeImmediate(): Promise<boolean> {
  console.log('\n=== T4.11: Policy changes take effect immediately ===');
  try {
    // Set stricter policy (16 chars)
    await axios.put<ApiResponse>(
      `${API_BASE}/settings/password-policy`,
      { minCharacterCount: 16 },
      { headers: { Authorization: `Bearer ${adminAccessToken}` } }
    );

    // Try to register with 12 chars (now invalid)
    try {
      await axios.post<ApiResponse>(`${API_BASE}/auth/register`, {
        email: getTestEmail(),
        password: 'ValidPass1234!X', // 15 chars, needs 16
        name: 'Test',
      });

      console.log('❌ FAIL: Should have rejected password under new policy');

      // Restore default
      await axios.put<ApiResponse>(
        `${API_BASE}/settings/password-policy`,
        { minCharacterCount: 8 },
        { headers: { Authorization: `Bearer ${adminAccessToken}` } }
      );

      return false;
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      if (axiosError.response?.status === 400) {
        // Restore default
        await axios.put<ApiResponse>(
          `${API_BASE}/settings/password-policy`,
          { minCharacterCount: 8 },
          { headers: { Authorization: `Bearer ${adminAccessToken}` } }
        );

        console.log('✅ PASS');
        return true;
      }
      throw error;
    }
  } catch (e) {
    console.log('❌ FAIL:', (e as Error).message);
    return false;
  }
}

async function testT412_OptionalConstraints(): Promise<boolean> {
  console.log('\n=== T4.12: Support optional constraints ===');
  try {
    // Make numbers optional
    await axios.put<ApiResponse>(
      `${API_BASE}/settings/password-policy`,
      { minNumbers: false },
      { headers: { Authorization: `Bearer ${adminAccessToken}` } }
    );

    // Try password without numbers
    try {
      const response = await axios.post<ApiResponse>(`${API_BASE}/auth/register`, {
        email: getTestEmail(),
        password: 'NoNumbers!ABC', // No numbers, but that's OK now
        name: 'Test',
      });

      // Clean up
      try {
        const userId = (response.data.data as any).id;
        await axios.delete(`${API_BASE}/settings/users/${userId}`, {
          headers: { Authorization: `Bearer ${adminAccessToken}` },
        });
      } catch {
        // Ignore
      }

      // Restore default
      await axios.put<ApiResponse>(
        `${API_BASE}/settings/password-policy`,
        { minNumbers: true },
        { headers: { Authorization: `Bearer ${adminAccessToken}` } }
      );

      console.log('✅ PASS');
      return true;
    } catch {
      // Restore default
      await axios.put<ApiResponse>(
        `${API_BASE}/settings/password-policy`,
        { minNumbers: true },
        { headers: { Authorization: `Bearer ${adminAccessToken}` } }
      );

      console.log('❌ FAIL: Password should have been accepted');
      return false;
    }
  } catch (e) {
    console.log('❌ FAIL:', (e as Error).message);
    return false;
  }
}

async function testT413_AdminCreateUserEnforces(): Promise<boolean> {
  console.log('\n=== T4.13: Admin creating user enforces policy ===');
  try {
    const response = await axios.post<ApiResponse>(
      `${API_BASE}/settings/users`,
      {
        email: getTestEmail(),
        name: 'Strong User',
        password: 'StrongP@ss1234',
        role: 'user',
      },
      { headers: { Authorization: `Bearer ${adminAccessToken}` } }
    );

    if (response.data.success) {
      // Clean up
      try {
        const userId = (response.data.data as any).id;
        await axios.delete(`${API_BASE}/settings/users/${userId}`, {
          headers: { Authorization: `Bearer ${adminAccessToken}` },
        });
      } catch {
        // Ignore
      }
      console.log('✅ PASS');
      return true;
    }
    console.log('❌ FAIL');
    return false;
  } catch (e) {
    console.log('❌ FAIL:', (e as Error).message);
    return false;
  }
}

async function testT414_SpecialCharsAccepted(): Promise<boolean> {
  console.log('\n=== T4.14: All special characters accepted ===');
  try {
    const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*'];
    for (const char of specialChars) {
      const response = await axios.post<ApiResponse>(`${API_BASE}/auth/register`, {
        email: getTestEmail(),
        password: `ValidPass1${char}`,
        name: 'Test',
      });

      if (response.data.success) {
        try {
          const userId = (response.data.data as any).id;
          await axios.delete(`${API_BASE}/settings/users/${userId}`, {
            headers: { Authorization: `Bearer ${adminAccessToken}` },
          });
        } catch {
          // Ignore
        }
      } else {
        console.log(`❌ FAIL: Special char '${char}' not accepted`);
        return false;
      }
    }
    console.log('✅ PASS');
    return true;
  } catch (e) {
    console.log('❌ FAIL:', (e as Error).message);
    return false;
  }
}

async function testT415_ConstraintBoundaries(): Promise<boolean> {
  console.log('\n=== T4.15: Boundary values work correctly ===');
  try {
    // Test exactly at boundary (8 chars)
    const response = await axios.post<ApiResponse>(`${API_BASE}/auth/register`, {
      email: getTestEmail(),
      password: 'ValidP@1', // Exactly 8 chars
      name: 'Test',
    });

    if (response.data.success) {
      try {
        const userId = (response.data.data as any).id;
        await axios.delete(`${API_BASE}/settings/users/${userId}`, {
          headers: { Authorization: `Bearer ${adminAccessToken}` },
        });
      } catch {
        // Ignore
      }
      console.log('✅ PASS');
      return true;
    }
    console.log('❌ FAIL');
    return false;
  } catch (e) {
    console.log('❌ FAIL:', (e as Error).message);
    return false;
  }
}

async function testT416_PolicyPersists(): Promise<boolean> {
  console.log('\n=== T4.16: Policy persists across requests ===');
  try {
    // Set custom policy
    await axios.put<ApiResponse>(
      `${API_BASE}/settings/password-policy`,
      { minCharacterCount: 10 },
      { headers: { Authorization: `Bearer ${adminAccessToken}` } }
    );

    // Fetch it again
    const response = await axios.get<ApiResponse>(`${API_BASE}/settings/password-policy`, {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });

    const policy = response.data.data as any;
    const persisted = policy.minCharacterCount === 10;

    // Restore default
    await axios.put<ApiResponse>(
      `${API_BASE}/settings/password-policy`,
      { minCharacterCount: 8 },
      { headers: { Authorization: `Bearer ${adminAccessToken}` } }
    );

    console.log(persisted ? '✅ PASS' : '❌ FAIL');
    return persisted;
  } catch (e) {
    console.log('❌ FAIL:', (e as Error).message);
    return false;
  }
}

async function testT417_ErrorMessageClarity(): Promise<boolean> {
  console.log('\n=== T4.17: Error messages are clear ===');
  try {
    await axios.post<ApiResponse>(`${API_BASE}/auth/register`, {
      email: getTestEmail(),
      password: 'weak',
      name: 'Test',
    });

    console.log('❌ FAIL: Should have rejected');
    return false;
  } catch (error) {
    const axiosError = error as AxiosError<ApiResponse>;
    if (axiosError.response?.status === 400) {
      const err = axiosError.response.data.error as any;
      const details = err?.details?.details as any[];
      const hasMessages = details?.every((d: any) => d.message && d.field);

      console.log(hasMessages ? '✅ PASS' : '❌ FAIL');
      return hasMessages;
    }
    console.log('❌ FAIL: Wrong status');
    return false;
  }
}

async function testT418_CaseSensitivity(): Promise<boolean> {
  console.log('\n=== T4.18: Case sensitivity works correctly ===');
  try {
    // Password with mixed case should work
    const response = await axios.post<ApiResponse>(`${API_BASE}/auth/register`, {
      email: getTestEmail(),
      password: 'MixedCaSe123!@#',
      name: 'Test',
    });

    if (response.data.success) {
      try {
        const userId = (response.data.data as any).id;
        await axios.delete(`${API_BASE}/settings/users/${userId}`, {
          headers: { Authorization: `Bearer ${adminAccessToken}` },
        });
      } catch {
        // Ignore
      }
      console.log('✅ PASS');
      return true;
    }
    console.log('❌ FAIL');
    return false;
  } catch (e) {
    console.log('❌ FAIL:', (e as Error).message);
    return false;
  }
}

async function main(): Promise<void> {
  console.log('\n========================================');
  console.log('Password Policy Comprehensive Validation');
  console.log('Test Cases T4.1 - T4.18');
  console.log('========================================');

  try {
    // Login
    adminAccessToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Admin logged in');

    // Run all tests
    const results: { test: string; result: boolean }[] = [];

    results.push({ test: 'T4.1', result: await testT41_GetDefaultPolicy() });
    results.push({ test: 'T4.2', result: await testT42_UpdatePolicy() });
    results.push({ test: 'T4.3', result: await testT43_RejectWeakPasswordMinLength() });
    results.push({ test: 'T4.4', result: await testT44_RejectPasswordNoNumbers() });
    results.push({ test: 'T4.5', result: await testT45_RejectPasswordNoLowercase() });
    results.push({ test: 'T4.6', result: await testT46_RejectPasswordNoUppercase() });
    results.push({ test: 'T4.7', result: await testT47_RejectPasswordNoSpecialChar() });
    results.push({ test: 'T4.8', result: await testT48_MultipleViolations() });
    results.push({ test: 'T4.9', result: await testT49_AcceptValidPassword() });
    results.push({ test: 'T4.10', result: await testT410_EnforceAtCreateUser() });
    results.push({ test: 'T4.11', result: await testT411_PolicyChangeImmediate() });
    results.push({ test: 'T4.12', result: await testT412_OptionalConstraints() });
    results.push({ test: 'T4.13', result: await testT413_AdminCreateUserEnforces() });
    results.push({ test: 'T4.14', result: await testT414_SpecialCharsAccepted() });
    results.push({ test: 'T4.15', result: await testT415_ConstraintBoundaries() });
    results.push({ test: 'T4.16', result: await testT416_PolicyPersists() });
    results.push({ test: 'T4.17', result: await testT417_ErrorMessageClarity() });
    results.push({ test: 'T4.18', result: await testT418_CaseSensitivity() });

    // Summary
    console.log('\n========================================');
    console.log('SUMMARY');
    console.log('========================================');
    const passed = results.filter((r) => r.result).length;
    const total = results.length;

    results.forEach((r) => {
      console.log(`${r.test}: ${r.result ? '✅ PASS' : '❌ FAIL'}`);
    });

    console.log(`\n${passed}/${total} tests passed`);

    if (passed === total) {
      console.log('\n✅ ALL TESTS PASSED');
      process.exit(0);
    } else {
      console.log(`\n❌ ${total - passed} tests failed`);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error);
    process.exit(1);
  }
}

main();
