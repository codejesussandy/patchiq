#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const API_BASE = 'http://localhost:3000/v1';

async function main() {
  console.log('=== Test Enrollment Secret Increment ===\n');

  // 1. Login as admin
  const loginRes = await axios.post(`${API_BASE}/auth/login`, {
    email: 'admin@patchiq.io',
    password: 'admin123',
  });
  const token = loginRes.data.data.accessToken;
  console.log('✓ Logged in as admin');

  // 2. Create enrollment secret with maxUses=2
  const createRes = await axios.post(
    `${API_BASE}/settings/enroll-secrets`,
    {
      name: 'Test Increment Secret',
      maxUses: 2,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const secretData = createRes.data.data;
  const secretId = secretData.id;
  const secretValue = secretData.secret;
  console.log(`✓ Created secret: id=${secretId}, maxUses=2, usedCount=${secretData.usedCount}`);

  // 3. Register first agent
  try {
    const reg1Res = await axios.post(`${API_BASE}/agents/register`, {
      machineId: `test-machine-${Date.now()}-1`,
      hostname: 'test-host-1',
      os: 'Windows',
      osVersion: '11',
      architecture: 'amd64',
      agentVersion: '1.0.0',
      enrollSecret: secretValue,
    });
    console.log(`✓ First registration: status=${reg1Res.status}`);
  } catch (error: any) {
    console.log(`✗ First registration failed: ${error.response?.status} ${error.response?.data?.error?.message}`);
    throw error;
  }

  // 4. Check usedCount after first registration
  const check1Res = await axios.get(`${API_BASE}/settings/enroll-secrets/${secretId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const check1Data = check1Res.data.data;
  console.log(`  usedCount after first registration: ${check1Data.usedCount} (expected: 1)`);

  // 5. Register second agent
  const reg2Res = await axios.post(`${API_BASE}/agents/register`, {
    machineId: `test-machine-${Date.now()}-2`,
    hostname: 'test-host-2',
    os: 'Windows',
    osVersion: '11',
    architecture: 'amd64',
    agentVersion: '1.0.0',
    enrollSecret: secretValue,
  });
  console.log(`✓ Second registration: status=${reg2Res.status}`);

  // 6. Check usedCount after second registration
  const check2Res = await axios.get(`${API_BASE}/settings/enroll-secrets/${secretId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const check2Data = check2Res.data.data;
  console.log(`  usedCount after second registration: ${check2Data.usedCount} (expected: 2)`);

  // 7. Try third registration (should fail)
  try {
    const reg3Res = await axios.post(`${API_BASE}/agents/register`, {
      machineId: `test-machine-${Date.now()}-3`,
      hostname: 'test-host-3',
      os: 'Windows',
      osVersion: '11',
      architecture: 'amd64',
      agentVersion: '1.0.0',
      enrollSecret: secretValue,
    });
    console.log(`✗ Third registration succeeded when it should have failed! status=${reg3Res.status}`);
  } catch (error: any) {
    if (error.response?.status === 401) {
      console.log(`✓ Third registration correctly rejected: 401 ${error.response.data.error.message}`);
    } else {
      console.log(`✗ Third registration failed with unexpected error: ${error.message}`);
    }
  }

  // 8. Cleanup
  await axios.delete(`${API_BASE}/settings/enroll-secrets/${secretId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`✓ Cleaned up test secret`);

  await prisma.$disconnect();
  console.log('\n=== Test Complete ===');
}

main().catch(console.error);
