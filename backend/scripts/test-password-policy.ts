#!/usr/bin/env ts-node
/**
 * Test script for password policy enforcement (Task R4)
 *
 * Tests:
 * 1. Default policy is seeded
 * 2. GET /v1/settings/password-policy returns policy
 * 3. PUT /v1/settings/password-policy updates policy
 * 4. Password validation enforced on:
 *    - POST /v1/auth/reset-password
 *    - POST /v1/auth/complete-onboarding
 *    - POST /v1/settings/users (admin creates user)
 */

import axios, { AxiosError } from 'axios';

const API_BASE = process.env.API_BASE || 'http://localhost:3000/v1';
const ADMIN_EMAIL = 'admin@patchiq.io';
const ADMIN_PASSWORD = 'admin123';

interface ApiResponse {
  success: boolean;
  data?: unknown;
  error?: {
    message: string;
    code?: string;
    details?: Array<{ field: string; message: string }>;
  };
}

let adminAccessToken = '';

async function login(): Promise<void> {
  console.log('\n=== LOGIN ===');
  const response = await axios.post<ApiResponse>(`${API_BASE}/auth/login`, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  if (response.data.success && response.data.data) {
    const { accessToken } = response.data.data as { accessToken: string };
    adminAccessToken = accessToken;
    console.log('✅ Admin logged in successfully');
  } else {
    throw new Error('Login failed');
  }
}

async function testGetPasswordPolicy(): Promise<void> {
  console.log('\n=== TEST 1: GET /v1/settings/password-policy ===');
  const response = await axios.get<ApiResponse>(`${API_BASE}/settings/password-policy`, {
    headers: { Authorization: `Bearer ${adminAccessToken}` },
  });

  console.log('Password policy:', JSON.stringify(response.data.data, null, 2));

  const policy = response.data.data as {
    minCharacterCount: number;
    minNumbers: boolean;
    minLowerCaseCharacters: boolean;
    minUpperCaseCharacters: boolean;
    minSpecialCharacters: boolean;
  };

  if (policy.minCharacterCount === 8 &&
      policy.minNumbers === true &&
      policy.minLowerCaseCharacters === true &&
      policy.minUpperCaseCharacters === true &&
      policy.minSpecialCharacters === true) {
    console.log('✅ Default policy is correct');
  } else {
    throw new Error('Default policy is incorrect');
  }
}

async function testUpdatePasswordPolicy(): Promise<void> {
  console.log('\n=== TEST 2: PUT /v1/settings/password-policy ===');

  // Update policy to be less strict (for testing)
  const response = await axios.put<ApiResponse>(
    `${API_BASE}/settings/password-policy`,
    {
      minCharacterCount: 6,
      minNumbers: false,
      minLowerCaseCharacters: true,
      minUpperCaseCharacters: false,
      minSpecialCharacters: false,
    },
    { headers: { Authorization: `Bearer ${adminAccessToken}` } }
  );

  console.log('Updated policy:', JSON.stringify(response.data.data, null, 2));

  const policy = response.data.data as {
    minCharacterCount: number;
    minNumbers: boolean;
    minLowerCaseCharacters: boolean;
    minUpperCaseCharacters: boolean;
    minSpecialCharacters: boolean;
  };

  if (policy.minCharacterCount === 6 && policy.minNumbers === false) {
    console.log('✅ Policy updated successfully');
  } else {
    throw new Error('Policy update failed');
  }

  // Restore default policy
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
  console.log('✅ Policy restored to defaults');
}

async function testPasswordValidationOnResetPassword(): Promise<void> {
  console.log('\n=== TEST 3: Password validation on POST /v1/auth/reset-password ===');

  // First request a password reset
  await axios.post<ApiResponse>(`${API_BASE}/auth/forgot-password`, {
    email: 'demo@patchiq.io',
  });

  console.log('Note: Cannot test reset-password without a real token from email');
  console.log('Manual test required: Use forgot-password flow and try weak password');
  console.log('Expected: 400 with PASSWORD_POLICY_VIOLATION code');
}

async function testPasswordValidationOnCreateUser(): Promise<void> {
  console.log('\n=== TEST 4: Password validation on POST /v1/settings/users ===');

  // Try creating user with weak password (no uppercase)
  try {
    await axios.post<ApiResponse>(
      `${API_BASE}/settings/users`,
      {
        email: 'testuser@example.com',
        name: 'Test User',
        password: 'weakpass123',  // No uppercase, no special chars
        role: 'user',
      },
      { headers: { Authorization: `Bearer ${adminAccessToken}` } }
    );

    throw new Error('Expected validation error but request succeeded');
  } catch (error) {
    const axiosError = error as AxiosError<ApiResponse>;
    if (axiosError.response?.status === 400) {
      const errorData = axiosError.response.data;
      const err = errorData.error as any;
      // Check if PASSWORD_POLICY_VIOLATION is in the error
      const hasPasswordPolicyViolation =
        err?.code === 'PASSWORD_POLICY_VIOLATION' ||
        err?.details?.code === 'PASSWORD_POLICY_VIOLATION';

      if (hasPasswordPolicyViolation) {
        console.log('✅ Password validation rejected weak password');
        console.log('Violations:', err?.details?.details || err?.details || err);
      } else {
        console.log('Error response:', errorData);
        throw new Error('Expected PASSWORD_POLICY_VIOLATION error code');
      }
    } else {
      throw error;
    }
  }

  // Try creating user with strong password
  try {
    const response = await axios.post<ApiResponse>(
      `${API_BASE}/settings/users`,
      {
        email: `testuser-${Date.now()}@example.com`,
        name: 'Test User',
        password: 'StrongPass123!',  // Meets all requirements
        role: 'user',
      },
      { headers: { Authorization: `Bearer ${adminAccessToken}` } }
    );

    if (response.data.success) {
      console.log('✅ Password validation accepted strong password');

      // Clean up - delete the test user
      const userId = (response.data.data as { id: string }).id;
      await axios.delete(`${API_BASE}/settings/users/${userId}`, {
        headers: { Authorization: `Bearer ${adminAccessToken}` },
      });
      console.log('✅ Test user cleaned up');
    }
  } catch (error) {
    console.error('Failed to create user with strong password:', error);
    throw error;
  }
}

async function testPasswordValidationOnCompleteOnboarding(): Promise<void> {
  console.log('\n=== TEST 5: Password validation on POST /v1/auth/complete-onboarding ===');
  console.log('Note: This requires creating an invited user and using their token');
  console.log('Manual test required: Use invite flow and try weak password on onboarding');
  console.log('Expected: 400 with PASSWORD_POLICY_VIOLATION code');
}

async function main(): Promise<void> {
  try {
    console.log('Password Policy Enforcement Test Suite');
    console.log('======================================\n');

    await login();
    await testGetPasswordPolicy();
    await testUpdatePasswordPolicy();
    await testPasswordValidationOnResetPassword();
    await testPasswordValidationOnCreateUser();
    await testPasswordValidationOnCompleteOnboarding();

    console.log('\n======================================');
    console.log('✅ ALL TESTS PASSED');
    console.log('======================================\n');
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  }
}

main();
