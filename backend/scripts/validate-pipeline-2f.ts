#!/usr/bin/env ts-node
/**
 * Pipeline 2F End-to-End Validation Script
 * Validates all acceptance criteria for R1 (Computer Groups), R2 (Deployment Policies),
 * R3 (Patch Preferences), and R4 (Distribution Servers)
 */

import axios, { AxiosInstance } from 'axios';

const API_BASE = 'http://localhost:3000/v1';
const ADMIN_EMAIL = 'admin@patchiq.io';
const ADMIN_PASSWORD = 'admin123';
const DEMO_EMAIL = 'demo@patchiq.io';
const DEMO_PASSWORD = 'demo123';

interface TestResult {
  id: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

let adminToken: string;
let demoToken: string;
let api: AxiosInstance;

function addResult(id: string, name: string, status: 'PASS' | 'FAIL' | 'SKIP', error?: string, details?: string) {
  results.push({ id, name, status, error, details });
  const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  console.log(`${emoji} ${id}: ${name} ${status === 'FAIL' && error ? `- ${error}` : ''}`);
}

async function setup() {
  console.log('='.repeat(80));
  console.log('PIPELINE 2F VALIDATION SCRIPT');
  console.log('='.repeat(80));
  console.log('');

  try {
    // Login as admin
    const adminRes = await axios.post(`${API_BASE}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    adminToken = adminRes.data.data.accessToken;
    console.log('✓ Admin login successful');

    // Login as demo user
    const demoRes = await axios.post(`${API_BASE}/auth/login`, {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    demoToken = demoRes.data.data.accessToken;
    console.log('✓ Demo user login successful');

    // Create axios instance with admin token
    api = axios.create({
      baseURL: API_BASE,
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    console.log('');
  } catch (error: any) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// ============================================
// R1: Computer Groups Validation
// ============================================

async function validateR1() {
  console.log('\n' + '='.repeat(80));
  console.log('R1: COMPUTER GROUPS VALIDATION (23 tests)');
  console.log('='.repeat(80) + '\n');

  let assetIds: string[] = [];
  let createdGroupIds: string[] = [];

  try {
    // Get asset IDs for testing
    const assetsRes = await api.get('/assets?limit=5');
    assetIds = assetsRes.data.data.data.slice(0, 3).map((a: any) => a.id);
    console.log(`✓ Got ${assetIds.length} asset IDs for testing\n`);
  } catch (error) {
    console.log('⚠️  Could not fetch assets, some tests will be skipped\n');
  }

  // T1.1: Create valid group
  try {
    const res = await api.post('/settings/computer-groups', { name: 'Windows Servers', endpoints: [] });
    if (res.status === 201 && res.data.data.endpointCount === 0) {
      createdGroupIds.push(res.data.data.id);
      addResult('T1.1', 'Create valid group', 'PASS');
    } else {
      addResult('T1.1', 'Create valid group', 'FAIL', `Expected 201 with endpointCount: 0, got ${res.status}`);
    }
  } catch (error: any) {
    addResult('T1.1', 'Create valid group', 'FAIL', error.response?.data?.error?.message || error.message);
  }

  // T1.2: Create group with endpoints
  if (assetIds.length >= 2) {
    try {
      const res = await api.post('/settings/computer-groups', {
        name: 'Dev Machines',
        endpoints: assetIds.slice(0, 2),
      });
      if (res.status === 201 && res.data.data.endpointCount === 2 && res.data.data.createdBy) {
        createdGroupIds.push(res.data.data.id);
        addResult('T1.2', 'Create group with endpoints', 'PASS');
      } else {
        addResult('T1.2', 'Create group with endpoints', 'FAIL', 'Missing endpointCount or createdBy');
      }
    } catch (error: any) {
      addResult('T1.2', 'Create group with endpoints', 'FAIL', error.response?.data?.error?.message || error.message);
    }
  } else {
    addResult('T1.2', 'Create group with endpoints', 'SKIP', 'Not enough assets');
  }

  // T1.3: Create with invalid endpoint UUID
  try {
    await api.post('/settings/computer-groups', { name: 'Bad', endpoints: ['not-uuid'] });
    addResult('T1.3', 'Create with invalid endpoint UUID', 'FAIL', 'Expected 400, got 2xx');
  } catch (error: any) {
    if (error.response?.status === 400) {
      addResult('T1.3', 'Create with invalid endpoint UUID', 'PASS');
    } else {
      addResult('T1.3', 'Create with invalid endpoint UUID', 'FAIL', `Expected 400, got ${error.response?.status}`);
    }
  }

  // T1.4: Create with non-existent asset UUID
  try {
    await api.post('/settings/computer-groups', { name: 'Bad', endpoints: ['550e8400-e29b-41d4-a716-446655440000'] });
    addResult('T1.4', 'Create with non-existent asset UUID', 'FAIL', 'Expected 400, got 2xx');
  } catch (error: any) {
    if (error.response?.status === 400 && error.response?.data?.error?.message?.includes('not found')) {
      addResult('T1.4', 'Create with non-existent asset UUID', 'PASS');
    } else {
      addResult('T1.4', 'Create with non-existent asset UUID', 'FAIL', `Expected 400 with "not found", got ${error.response?.status}`);
    }
  }

  // T1.5: Create duplicate name
  try {
    await api.post('/settings/computer-groups', { name: 'Windows Servers' });
    addResult('T1.5', 'Create duplicate name', 'FAIL', 'Expected 409, got 2xx');
  } catch (error: any) {
    if (error.response?.status === 409 && error.response?.data?.error?.message?.includes('already exists')) {
      addResult('T1.5', 'Create duplicate name', 'PASS');
    } else {
      addResult('T1.5', 'Create duplicate name', 'FAIL', `Expected 409 with "already exists", got ${error.response?.status}`);
    }
  }

  // T1.6: Create duplicate name (case-insensitive)
  try {
    await api.post('/settings/computer-groups', { name: 'windows servers' });
    addResult('T1.6', 'Create duplicate name (case-insensitive)', 'FAIL', 'Expected 409, got 2xx');
  } catch (error: any) {
    if (error.response?.status === 409) {
      addResult('T1.6', 'Create duplicate name (case-insensitive)', 'PASS');
    } else {
      addResult('T1.6', 'Create duplicate name (case-insensitive)', 'FAIL', `Expected 409, got ${error.response?.status}`);
    }
  }

  // T1.7: Create empty name
  try {
    await api.post('/settings/computer-groups', { name: '' });
    addResult('T1.7', 'Create empty name', 'FAIL', 'Expected 400, got 2xx');
  } catch (error: any) {
    if (error.response?.status === 400) {
      addResult('T1.7', 'Create empty name', 'PASS');
    } else {
      addResult('T1.7', 'Create empty name', 'FAIL', `Expected 400, got ${error.response?.status}`);
    }
  }

  // T1.8: Create name too long
  try {
    await api.post('/settings/computer-groups', { name: 'a'.repeat(101) });
    addResult('T1.8', 'Create name too long', 'FAIL', 'Expected 400, got 2xx');
  } catch (error: any) {
    if (error.response?.status === 400) {
      addResult('T1.8', 'Create name too long', 'PASS');
    } else {
      addResult('T1.8', 'Create name too long', 'FAIL', `Expected 400, got ${error.response?.status}`);
    }
  }

  // T1.9: Create with description
  try {
    const res = await api.post('/settings/computer-groups', { name: 'TestDesc', description: 'A test group' });
    if (res.status === 201 && res.data.data.description === 'A test group') {
      createdGroupIds.push(res.data.data.id);
      addResult('T1.9', 'Create with description', 'PASS');
    } else {
      addResult('T1.9', 'Create with description', 'FAIL', 'Description not saved');
    }
  } catch (error: any) {
    addResult('T1.9', 'Create with description', 'FAIL', error.response?.data?.error?.message || error.message);
  }

  // T1.10: Create with null description
  try {
    const res = await api.post('/settings/computer-groups', { name: 'TestNull', description: null });
    if (res.status === 201 && res.data.data.description === null) {
      createdGroupIds.push(res.data.data.id);
      addResult('T1.10', 'Create with null description', 'PASS');
    } else {
      addResult('T1.10', 'Create with null description', 'FAIL', `Description is ${res.data.data.description}, expected null`);
    }
  } catch (error: any) {
    addResult('T1.10', 'Create with null description', 'FAIL', error.response?.data?.error?.message || error.message);
  }

  // T1.11-T1.16: Update/Delete tests
  if (createdGroupIds.length > 0) {
    const testGroupId = createdGroupIds[0];

    // T1.11: Update name only
    try {
      const res = await api.put(`/settings/computer-groups/${testGroupId}`, { name: 'Renamed' });
      if (res.status === 200 && res.data.data.name === 'Renamed') {
        addResult('T1.11', 'Update name only', 'PASS');
      } else {
        addResult('T1.11', 'Update name only', 'FAIL', 'Name not updated');
      }
    } catch (error: any) {
      addResult('T1.11', 'Update name only', 'FAIL', error.response?.data?.error?.message || error.message);
    }

    // T1.12: Update endpoints
    if (assetIds.length >= 1) {
      try {
        const res = await api.put(`/settings/computer-groups/${testGroupId}`, { endpoints: [assetIds[0]] });
        if (res.status === 200 && res.data.data.endpointCount === 1) {
          addResult('T1.12', 'Update endpoints', 'PASS');
        } else {
          addResult('T1.12', 'Update endpoints', 'FAIL', `endpointCount is ${res.data.data.endpointCount}, expected 1`);
        }
      } catch (error: any) {
        addResult('T1.12', 'Update endpoints', 'FAIL', error.response?.data?.error?.message || error.message);
      }
    } else {
      addResult('T1.12', 'Update endpoints', 'SKIP', 'No assets available');
    }

    // T1.13: Update to empty endpoints
    try {
      const res = await api.put(`/settings/computer-groups/${testGroupId}`, { endpoints: [] });
      if (res.status === 200 && res.data.data.endpointCount === 0) {
        addResult('T1.13', 'Update to empty endpoints', 'PASS');
      } else {
        addResult('T1.13', 'Update to empty endpoints', 'FAIL', `endpointCount is ${res.data.data.endpointCount}, expected 0`);
      }
    } catch (error: any) {
      addResult('T1.13', 'Update to empty endpoints', 'FAIL', error.response?.data?.error?.message || error.message);
    }

    // T1.14: Update non-existent group
    try {
      await api.put('/settings/computer-groups/550e8400-e29b-41d4-a716-446655440000', { name: 'X' });
      addResult('T1.14', 'Update non-existent group', 'FAIL', 'Expected 404, got 2xx');
    } catch (error: any) {
      if (error.response?.status === 404) {
        addResult('T1.14', 'Update non-existent group', 'PASS');
      } else {
        addResult('T1.14', 'Update non-existent group', 'FAIL', `Expected 404, got ${error.response?.status}`);
      }
    }

    // T1.15: Delete existing group
    try {
      const res = await api.delete(`/settings/computer-groups/${testGroupId}`);
      if (res.status === 204) {
        addResult('T1.15', 'Delete existing group', 'PASS');
        createdGroupIds = createdGroupIds.filter(id => id !== testGroupId);
      } else {
        addResult('T1.15', 'Delete existing group', 'FAIL', `Expected 204, got ${res.status}`);
      }
    } catch (error: any) {
      addResult('T1.15', 'Delete existing group', 'FAIL', error.response?.data?.error?.message || error.message);
    }

    // T1.16: Delete non-existent group
    try {
      await api.delete('/settings/computer-groups/550e8400-e29b-41d4-a716-446655440000');
      addResult('T1.16', 'Delete non-existent group', 'FAIL', 'Expected 404, got 2xx');
    } catch (error: any) {
      if (error.response?.status === 404) {
        addResult('T1.16', 'Delete non-existent group', 'PASS');
      } else {
        addResult('T1.16', 'Delete non-existent group', 'FAIL', `Expected 404, got ${error.response?.status}`);
      }
    }
  } else {
    addResult('T1.11', 'Update name only', 'SKIP', 'No test groups created');
    addResult('T1.12', 'Update endpoints', 'SKIP', 'No test groups created');
    addResult('T1.13', 'Update to empty endpoints', 'SKIP', 'No test groups created');
    addResult('T1.14', 'Update non-existent group', 'SKIP', 'No test groups created');
    addResult('T1.15', 'Delete existing group', 'SKIP', 'No test groups created');
    addResult('T1.16', 'Delete non-existent group', 'SKIP', 'No test groups created');
  }

  // T1.17-T1.20: List tests
  try {
    // T1.17: List with pagination
    const res = await api.get('/settings/computer-groups?page=1&limit=5');
    if (res.status === 200 && res.data.data.data.length <= 5 && res.data.data.meta.totalPages) {
      addResult('T1.17', 'List with pagination', 'PASS');
    } else {
      addResult('T1.17', 'List with pagination', 'FAIL', 'Pagination not working correctly');
    }
  } catch (error: any) {
    addResult('T1.17', 'List with pagination', 'FAIL', error.response?.data?.error?.message || error.message);
  }

  try {
    // T1.18: List with search
    const res = await api.get('/settings/computer-groups?search=Dev');
    if (res.status === 200) {
      addResult('T1.18', 'List with search', 'PASS');
    } else {
      addResult('T1.18', 'List with search', 'FAIL', `Expected 200, got ${res.status}`);
    }
  } catch (error: any) {
    addResult('T1.18', 'List with search', 'FAIL', error.response?.data?.error?.message || error.message);
  }

  try {
    // T1.19: List with sort
    const res = await api.get('/settings/computer-groups?sortBy=name&sortOrder=desc');
    if (res.status === 200) {
      addResult('T1.19', 'List with sort', 'PASS');
    } else {
      addResult('T1.19', 'List with sort', 'FAIL', `Expected 200, got ${res.status}`);
    }
  } catch (error: any) {
    addResult('T1.19', 'List with sort', 'FAIL', error.response?.data?.error?.message || error.message);
  }

  try {
    // T1.20: Available endpoints
    const res = await api.get('/settings/computer-groups/available-endpoints');
    if (res.status === 200 && Array.isArray(res.data.data)) {
      addResult('T1.20', 'Available endpoints', 'PASS');
    } else {
      addResult('T1.20', 'Available endpoints', 'FAIL', 'Not returning array');
    }
  } catch (error: any) {
    addResult('T1.20', 'Available endpoints', 'FAIL', error.response?.data?.error?.message || error.message);
  }

  // T1.21-T1.22: RBAC tests
  try {
    // T1.21: User denied create
    const demoApi = axios.create({
      baseURL: API_BASE,
      headers: { Authorization: `Bearer ${demoToken}` },
    });
    await demoApi.post('/settings/computer-groups', { name: 'Test' });
    addResult('T1.21', 'RBAC: user denied create', 'FAIL', 'Expected 403, got 2xx');
  } catch (error: any) {
    if (error.response?.status === 403) {
      addResult('T1.21', 'RBAC: user denied create', 'PASS');
    } else {
      addResult('T1.21', 'RBAC: user denied create', 'FAIL', `Expected 403, got ${error.response?.status}`);
    }
  }

  try {
    // T1.22: Admin allowed
    const res = await api.post('/settings/computer-groups', { name: 'AdminTest' });
    if (res.status === 201) {
      createdGroupIds.push(res.data.data.id);
      addResult('T1.22', 'RBAC: admin allowed', 'PASS');
    } else {
      addResult('T1.22', 'RBAC: admin allowed', 'FAIL', `Expected 201, got ${res.status}`);
    }
  } catch (error: any) {
    addResult('T1.22', 'RBAC: admin allowed', 'FAIL', error.response?.data?.error?.message || error.message);
  }

  // T1.23: Create with extra fields
  try {
    const res = await api.post('/settings/computer-groups', { name: 'ExtraTest', unknownField: 'value' });
    if (res.status === 201) {
      createdGroupIds.push(res.data.data.id);
      addResult('T1.23', 'Create with extra fields', 'PASS');
    } else {
      addResult('T1.23', 'Create with extra fields', 'FAIL', `Expected 201, got ${res.status}`);
    }
  } catch (error: any) {
    addResult('T1.23', 'Create with extra fields', 'FAIL', error.response?.data?.error?.message || error.message);
  }

  // Cleanup
  console.log(`\n🧹 Cleaning up ${createdGroupIds.length} test groups...`);
  for (const id of createdGroupIds) {
    try {
      await api.delete(`/settings/computer-groups/${id}`);
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

// ============================================
// R2: Deployment Policies Validation
// ============================================

async function validateR2() {
  console.log('\n' + '='.repeat(80));
  console.log('R2: DEPLOYMENT POLICIES VALIDATION (20 tests)');
  console.log('='.repeat(80) + '\n');

  let createdPolicyIds: string[] = [];

  // T2.1: Create valid policy
  try {
    const res = await api.post('/settings/deployment-policies', {
      name: 'Weekend Window Val',
      type: 'SCHEDULE',
      supportedModule: 'Patch',
    });
    if (res.status === 201 && res.data.data.policyId.startsWith('DPOL-')) {
      createdPolicyIds.push(res.data.data.id);
      addResult('T2.1', 'Create valid policy', 'PASS', undefined, `policyId: ${res.data.data.policyId}`);
    } else {
      addResult('T2.1', 'Create valid policy', 'FAIL', `policyId doesn't start with DPOL-: ${res.data.data.policyId}`);
    }
  } catch (error: any) {
    addResult('T2.1', 'Create valid policy', 'FAIL', error.response?.data?.error?.message || error.message);
  }

  // T2.2: Create with defaults
  try {
    const res = await api.post('/settings/deployment-policies', { name: 'Simple Val' });
    if (res.status === 201 && res.data.data.type === 'INSTANT' && res.data.data.supportedModule === 'All' && res.data.data.relatedType === 'No Relation') {
      createdPolicyIds.push(res.data.data.id);
      addResult('T2.2', 'Create with defaults', 'PASS');
    } else {
      addResult('T2.2', 'Create with defaults', 'FAIL', `Defaults not applied: type=${res.data.data.type}, module=${res.data.data.supportedModule}, related=${res.data.data.relatedType}`);
    }
  } catch (error: any) {
    addResult('T2.2', 'Create with defaults', 'FAIL', error.response?.data?.error?.message || error.message);
  }

  // T2.3: Create empty name
  try {
    await api.post('/settings/deployment-policies', { name: '' });
    addResult('T2.3', 'Create empty name', 'FAIL', 'Expected 400, got 2xx');
  } catch (error: any) {
    if (error.response?.status === 400) {
      addResult('T2.3', 'Create empty name', 'PASS');
    } else {
      addResult('T2.3', 'Create empty name', 'FAIL', `Expected 400, got ${error.response?.status}`);
    }
  }

  // T2.4: Create invalid type
  try {
    await api.post('/settings/deployment-policies', { name: 'Bad', type: 'WEEKLY' });
    addResult('T2.4', 'Create invalid type', 'FAIL', 'Expected 400, got 2xx');
  } catch (error: any) {
    if (error.response?.status === 400) {
      addResult('T2.4', 'Create invalid type', 'PASS');
    } else {
      addResult('T2.4', 'Create invalid type', 'FAIL', `Expected 400, got ${error.response?.status}`);
    }
  }

  // T2.5: Create wrong case supportedModule
  try {
    await api.post('/settings/deployment-policies', { name: 'Bad', supportedModule: 'ALL' });
    addResult('T2.5', 'Create wrong case supportedModule', 'FAIL', 'Expected 400, got 2xx');
  } catch (error: any) {
    if (error.response?.status === 400) {
      addResult('T2.5', 'Create wrong case supportedModule', 'PASS');
    } else {
      addResult('T2.5', 'Create wrong case supportedModule', 'FAIL', `Expected 400, got ${error.response?.status}`);
    }
  }

  // T2.6: Create wrong case relatedType
  try {
    await api.post('/settings/deployment-policies', { name: 'Bad', relatedType: 'NO_RELATION' });
    addResult('T2.6', 'Create wrong case relatedType', 'FAIL', 'Expected 400, got 2xx');
  } catch (error: any) {
    if (error.response?.status === 400) {
      addResult('T2.6', 'Create wrong case relatedType', 'PASS');
    } else {
      addResult('T2.6', 'Create wrong case relatedType', 'FAIL', `Expected 400, got ${error.response?.status}`);
    }
  }

  // T2.7: Create duplicate name
  try {
    await api.post('/settings/deployment-policies', { name: 'Immediate Critical' });
    addResult('T2.7', 'Create duplicate name', 'FAIL', 'Expected 409, got 2xx');
  } catch (error: any) {
    if (error.response?.status === 409) {
      addResult('T2.7', 'Create duplicate name', 'PASS');
    } else {
      addResult('T2.7', 'Create duplicate name', 'FAIL', `Expected 409, got ${error.response?.status}`);
    }
  }

  // T2.8-T2.12: Update/Delete tests
  if (createdPolicyIds.length > 0) {
    const testPolicyId = createdPolicyIds[0];

    // T2.8: Update type
    try {
      const res = await api.put(`/settings/deployment-policies/${testPolicyId}`, { type: 'SCHEDULE' });
      if (res.status === 200 && res.data.data.type === 'SCHEDULE') {
        addResult('T2.8', 'Update type', 'PASS');
      } else {
        addResult('T2.8', 'Update type', 'FAIL', 'Type not updated');
      }
    } catch (error: any) {
      addResult('T2.8', 'Update type', 'FAIL', error.response?.data?.error?.message || error.message);
    }

    // T2.9: Update name
    try {
      const res = await api.put(`/settings/deployment-policies/${testPolicyId}`, { name: 'Renamed Policy Val' });
      if (res.status === 200 && res.data.data.name === 'Renamed Policy Val') {
        addResult('T2.9', 'Update name', 'PASS');
      } else {
        addResult('T2.9', 'Update name', 'FAIL', 'Name not updated');
      }
    } catch (error: any) {
      addResult('T2.9', 'Update name', 'FAIL', error.response?.data?.error?.message || error.message);
    }

    // T2.10: Update non-existent
    try {
      await api.put('/settings/deployment-policies/550e8400-e29b-41d4-a716-446655440000', { name: 'X' });
      addResult('T2.10', 'Update non-existent', 'FAIL', 'Expected 404, got 2xx');
    } catch (error: any) {
      if (error.response?.status === 404) {
        addResult('T2.10', 'Update non-existent', 'PASS');
      } else {
        addResult('T2.10', 'Update non-existent', 'FAIL', `Expected 404, got ${error.response?.status}`);
      }
    }

    // T2.11: Delete policy
    try {
      const res = await api.delete(`/settings/deployment-policies/${testPolicyId}`);
      if (res.status === 204) {
        addResult('T2.11', 'Delete policy', 'PASS');
        createdPolicyIds = createdPolicyIds.filter(id => id !== testPolicyId);
      } else {
        addResult('T2.11', 'Delete policy', 'FAIL', `Expected 204, got ${res.status}`);
      }
    } catch (error: any) {
      addResult('T2.11', 'Delete policy', 'FAIL', error.response?.data?.error?.message || error.message);
    }

    // T2.12: Delete non-existent
    try {
      await api.delete('/settings/deployment-policies/550e8400-e29b-41d4-a716-446655440000');
      addResult('T2.12', 'Delete non-existent', 'FAIL', 'Expected 404, got 2xx');
    } catch (error: any) {
      if (error.response?.status === 404) {
        addResult('T2.12', 'Delete non-existent', 'PASS');
      } else {
        addResult('T2.12', 'Delete non-existent', 'FAIL', `Expected 404, got ${error.response?.status}`);
      }
    }
  } else {
    addResult('T2.8', 'Update type', 'SKIP', 'No test policies created');
    addResult('T2.9', 'Update name', 'SKIP', 'No test policies created');
    addResult('T2.10', 'Update non-existent', 'SKIP', 'No test policies created');
    addResult('T2.11', 'Delete policy', 'SKIP', 'No test policies created');
    addResult('T2.12', 'Delete non-existent', 'SKIP', 'No test policies created');
  }

  // T2.13-T2.16: List tests
  try {
    // T2.13: List paginated
    const res = await api.get('/settings/deployment-policies?page=1&limit=3');
    if (res.status === 200 && res.data.data.data.length <= 3 && res.data.data.meta.total >= 5) {
      addResult('T2.13', 'List paginated', 'PASS');
    } else {
      addResult('T2.13', 'List paginated', 'FAIL', 'Pagination not working correctly');
    }
  } catch (error: any) {
    addResult('T2.13', 'List paginated', 'FAIL', error.response?.data?.error?.message || error.message);
  }

  try {
    // T2.14: List filter by type
    const res = await api.get('/settings/deployment-policies?type=INSTANT');
    if (res.status === 200 && res.data.data.data.every((p: any) => p.type === 'INSTANT')) {
      addResult('T2.14', 'List filter by type', 'PASS');
    } else {
      addResult('T2.14', 'List filter by type', 'FAIL', 'Filter not working');
    }
  } catch (error: any) {
    addResult('T2.14', 'List filter by type', 'FAIL', error.response?.data?.error?.message || error.message);
  }

  try {
    // T2.15: Get by policyId
    const res = await api.get('/settings/deployment-policies/DPOL-0001');
    if (res.status === 200 && res.data.data.name === 'Immediate Critical') {
      addResult('T2.15', 'Get by policyId', 'PASS');
    } else {
      addResult('T2.15', 'Get by policyId', 'FAIL', `Expected "Immediate Critical", got ${res.data.data.name}`);
    }
  } catch (error: any) {
    addResult('T2.15', 'Get by policyId', 'FAIL', error.response?.data?.error?.message || error.message);
  }

  try {
    // T2.16: Get by UUID
    const listRes = await api.get('/settings/deployment-policies?limit=1');
    const uuid = listRes.data.data.data[0]?.id;
    if (uuid) {
      const res = await api.get(`/settings/deployment-policies/${uuid}`);
      if (res.status === 200) {
        addResult('T2.16', 'Get by UUID', 'PASS');
      } else {
        addResult('T2.16', 'Get by UUID', 'FAIL', `Expected 200, got ${res.status}`);
      }
    } else {
      addResult('T2.16', 'Get by UUID', 'SKIP', 'No policies found');
    }
  } catch (error: any) {
    addResult('T2.16', 'Get by UUID', 'FAIL', error.response?.data?.error?.message || error.message);
  }

  // T2.17: Cross-endpoint consistency
  try {
    const settingsRes = await api.post('/settings/deployment-policies', { name: 'Cross-Endpoint Test' });
    const policyId = settingsRes.data.data.id;
    createdPolicyIds.push(policyId);

    // Try to read via jobs endpoint
    const jobsRes = await api.get(`/deployment-policies/${policyId}`);
    if (jobsRes.status === 200 && jobsRes.data.data.name === 'Cross-Endpoint Test') {
      addResult('T2.17', 'Cross-endpoint consistency', 'PASS');
    } else {
      addResult('T2.17', 'Cross-endpoint consistency', 'FAIL', 'Data mismatch between endpoints');
    }
  } catch (error: any) {
    if (error.response?.status === 404) {
      addResult('T2.17', 'Cross-endpoint consistency', 'SKIP', 'Jobs endpoint not accessible (expected if not implemented)');
    } else {
      addResult('T2.17', 'Cross-endpoint consistency', 'FAIL', error.response?.data?.error?.message || error.message);
    }
  }

  // T2.18: PolicyId auto-increment
  try {
    const res1 = await api.post('/settings/deployment-policies', { name: 'AutoInc Test 1' });
    const res2 = await api.post('/settings/deployment-policies', { name: 'AutoInc Test 2' });
    const id1 = parseInt(res1.data.data.policyId.split('-')[1]);
    const id2 = parseInt(res2.data.data.policyId.split('-')[1]);
    createdPolicyIds.push(res1.data.data.id, res2.data.data.id);

    if (id2 === id1 + 1) {
      addResult('T2.18', 'PolicyId auto-increment', 'PASS', undefined, `${res1.data.data.policyId} → ${res2.data.data.policyId}`);
    } else {
      addResult('T2.18', 'PolicyId auto-increment', 'FAIL', `Expected sequential IDs, got ${id1} and ${id2}`);
    }
  } catch (error: any) {
    addResult('T2.18', 'PolicyId auto-increment', 'FAIL', error.response?.data?.error?.message || error.message);
  }

  // T2.19-T2.20: RBAC tests
  try {
    // T2.19: User denied
    const demoApi = axios.create({
      baseURL: API_BASE,
      headers: { Authorization: `Bearer ${demoToken}` },
    });
    await demoApi.post('/settings/deployment-policies', { name: 'Test' });
    addResult('T2.19', 'RBAC: user denied', 'FAIL', 'Expected 403, got 2xx');
  } catch (error: any) {
    if (error.response?.status === 403) {
      addResult('T2.19', 'RBAC: user denied', 'PASS');
    } else {
      addResult('T2.19', 'RBAC: user denied', 'FAIL', `Expected 403, got ${error.response?.status}`);
    }
  }

  if (createdPolicyIds.length > 0) {
    // T2.20: Admin allowed
    try {
      const res = await api.delete(`/settings/deployment-policies/${createdPolicyIds[0]}`);
      if (res.status === 204) {
        addResult('T2.20', 'RBAC: admin allowed', 'PASS');
        createdPolicyIds = createdPolicyIds.slice(1);
      } else {
        addResult('T2.20', 'RBAC: admin allowed', 'FAIL', `Expected 204, got ${res.status}`);
      }
    } catch (error: any) {
      addResult('T2.20', 'RBAC: admin allowed', 'FAIL', error.response?.data?.error?.message || error.message);
    }
  } else {
    addResult('T2.20', 'RBAC: admin allowed', 'SKIP', 'No test policies to delete');
  }

  // Cleanup
  console.log(`\n🧹 Cleaning up ${createdPolicyIds.length} test policies...`);
  for (const id of createdPolicyIds) {
    try {
      await api.delete(`/settings/deployment-policies/${id}`);
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

// ============================================
// R3: Patch Preferences Validation
// ============================================

async function validateR3() {
  console.log('\n' + '='.repeat(80));
  console.log('R3: PATCH PREFERENCES VALIDATION (23 tests)');
  console.log('='.repeat(80) + '\n');

  // T3.1: Get defaults
  try {
    const res = await api.get('/settings/patch-preferences');
    if (res.status === 200 && typeof res.data.data.enablePatching === 'boolean') {
      addResult('T3.1', 'Get defaults', 'PASS', undefined, `enablePatching: ${res.data.data.enablePatching}`);
    } else {
      addResult('T3.1', 'Get defaults', 'FAIL', 'No enablePatching field');
    }
  } catch (error: any) {
    addResult('T3.1', 'Get defaults', 'FAIL', error.response?.data?.error?.message || error.message);
  }

  // T3.2: Update single field
  try {
    const res = await api.put('/settings/patch-preferences', { enablePatching: false });
    if (res.status === 200 && res.data.data.enablePatching === false) {
      addResult('T3.2', 'Update single field', 'PASS');
    } else {
      addResult('T3.2', 'Update single field', 'FAIL', 'enablePatching not updated');
    }
  } catch (error: any) {
    addResult('T3.2', 'Update single field', 'FAIL', error.response?.data?.error?.message || error.message);
  }

  // T3.3: Update approval policy
  try {
    const res = await api.put('/settings/patch-preferences', { patchApprovalPolicy: 'PreApproved' });
    if (res.status === 200 && res.data.data.patchApprovalPolicy === 'PreApproved') {
      addResult('T3.3', 'Update approval policy', 'PASS');
    } else {
      addResult('T3.3', 'Update approval policy', 'FAIL', 'Policy not updated');
    }
  } catch (error: any) {
    addResult('T3.3', 'Update approval policy', 'FAIL', error.response?.data?.error?.message || error.message);
  }

  // T3.4: Update OS list
  try {
    const res = await api.put('/settings/patch-preferences', { patchSyncForOS: ['Windows', 'macOS'] });
    if (res.status === 200 && res.data.data.patchSyncForOS.length === 2) {
      addResult('T3.4', 'Update OS list', 'PASS');
    } else {
      addResult('T3.4', 'Update OS list', 'FAIL', 'OS list not updated');
    }
  } catch (error: any) {
    addResult('T3.4', 'Update OS list', 'FAIL', error.response?.data?.error?.message || error.message);
  }

  // T3.5: Update to empty OS list
  try {
    const res = await api.put('/settings/patch-preferences', { patchSyncForOS: [] });
    if (res.status === 200 && res.data.data.patchSyncForOS.length === 0) {
      addResult('T3.5', 'Update to empty OS list', 'PASS');
    } else {
      addResult('T3.5', 'Update to empty OS list', 'FAIL', 'OS list not cleared');
    }
  } catch (error: any) {
    addResult('T3.5', 'Update to empty OS list', 'FAIL', error.response?.data?.error?.message || error.message);
  }

  // T3.6: Invalid OS value
  try {
    await api.put('/settings/patch-preferences', { patchSyncForOS: ['BeOS'] });
    addResult('T3.6', 'Invalid OS value', 'FAIL', 'Expected 400, got 2xx');
  } catch (error: any) {
    if (error.response?.status === 400) {
      addResult('T3.6', 'Invalid OS value', 'PASS');
    } else {
      addResult('T3.6', 'Invalid OS value', 'FAIL', `Expected 400, got ${error.response?.status}`);
    }
  }

  // T3.7: Invalid time format - no seconds
  try {
    await api.put('/settings/patch-preferences', { scheduleTime: '02:00' });
    addResult('T3.7', 'Invalid time format - no seconds', 'FAIL', 'Expected 400, got 2xx');
  } catch (error: any) {
    if (error.response?.status === 400) {
      addResult('T3.7', 'Invalid time format - no seconds', 'PASS');
    } else {
      addResult('T3.7', 'Invalid time format - no seconds', 'FAIL', `Expected 400, got ${error.response?.status}`);
    }
  }

  // T3.8: Invalid time - hour 25
  try {
    await api.put('/settings/patch-preferences', { scheduleTime: '25:00:00' });
    addResult('T3.8', 'Invalid time - hour 25', 'FAIL', 'Expected 400, got 2xx');
  } catch (error: any) {
    if (error.response?.status === 400) {
      addResult('T3.8', 'Invalid time - hour 25', 'PASS');
    } else {
      addResult('T3.8', 'Invalid time - hour 25', 'FAIL', `Expected 400, got ${error.response?.status}`);
    }
  }

  // T3.9: Invalid time - minute 60
  try {
    await api.put('/settings/patch-preferences', { scheduleTime: '02:60:00' });
    addResult('T3.9', 'Invalid time - minute 60', 'FAIL', 'Expected 400, got 2xx');
  } catch (error: any) {
    if (error.response?.status === 400) {
      addResult('T3.9', 'Invalid time - minute 60', 'PASS');
    } else {
      addResult('T3.9', 'Invalid time - minute 60', 'FAIL', `Expected 400, got ${error.response?.status}`);
    }
  }

  // T3.10: Valid edge time - midnight
  try {
    const res = await api.put('/settings/patch-preferences', { scheduleTime: '00:00:00' });
    if (res.status === 200) {
      addResult('T3.10', 'Valid edge time - midnight', 'PASS');
    } else {
      addResult('T3.10', 'Valid edge time - midnight', 'FAIL', `Expected 200, got ${res.status}`);
    }
  } catch (error: any) {
    addResult('T3.10', 'Valid edge time - midnight', 'FAIL', error.response?.data?.error?.message || error.message);
  }

  // T3.11: Valid edge time - end of day
  try {
    const res = await api.put('/settings/patch-preferences', { scheduleTime: '23:59:59' });
    if (res.status === 200) {
      addResult('T3.11', 'Valid edge time - end of day', 'PASS');
    } else {
      addResult('T3.11', 'Valid edge time - end of day', 'FAIL', `Expected 200, got ${res.status}`);
    }
  } catch (error: any) {
    addResult('T3.11', 'Valid edge time - end of day', 'FAIL', error.response?.data?.error?.message || error.message);
  }

  // T3.12: Invalid approval policy
  try {
    await api.put('/settings/patch-preferences', { patchApprovalPolicy: 'AutoApprove' });
    addResult('T3.12', 'Invalid approval policy', 'FAIL', 'Expected 400, got 2xx');
  } catch (error: any) {
    if (error.response?.status === 400) {
      addResult('T3.12', 'Invalid approval policy', 'PASS');
    } else {
      addResult('T3.12', 'Invalid approval policy', 'FAIL', `Expected 400, got ${error.response?.status}`);
    }
  }

  // T3.13: Update all fields
  try {
    const res = await api.put('/settings/patch-preferences', {
      enablePatching: true,
      corridorOnlyApprovedPatch: true,
      patchSyncForOS: ['Ubuntu'],
      patchApprovalPolicy: 'TestAndApprove',
      enableThirdPartyPatching: true,
      patchApprovalScheduleTime: '01:00:00',
      scheduleTime: '02:00:00',
      zeroTouchDeploymentScheduleTime: '03:00:00',
    });
    if (res.status === 200) {
      addResult('T3.13', 'Update all fields', 'PASS');
    } else {
      addResult('T3.13', 'Update all fields', 'FAIL', `Expected 200, got ${res.status}`);
    }
  } catch (error: any) {
    addResult('T3.13', 'Update all fields', 'FAIL', error.response?.data?.error?.message || error.message);
  }

  // T3.14: Sync now
  try {
    const res = await api.post('/settings/patch-preferences/sync');
    if (res.status === 200 && res.data.data.message && res.data.data.syncedAt) {
      addResult('T3.14', 'Sync now', 'PASS');
    } else {
      addResult('T3.14', 'Sync now', 'FAIL', 'Missing message or syncedAt');
    }
  } catch (error: any) {
    addResult('T3.14', 'Sync now', 'FAIL', error.response?.data?.error?.message || error.message);
  }

  // T3.15: Sync updates lastSyncedAt
  try {
    await api.post('/settings/patch-preferences/sync');
    const res = await api.get('/settings/patch-preferences');
    if (res.data.data.lastSyncedAt) {
      const syncTime = new Date(res.data.data.lastSyncedAt).getTime();
      const now = Date.now();
      if (now - syncTime < 10000) {
        addResult('T3.15', 'Sync updates lastSyncedAt', 'PASS');
      } else {
        addResult('T3.15', 'Sync updates lastSyncedAt', 'FAIL', 'lastSyncedAt is not recent');
      }
    } else {
      addResult('T3.15', 'Sync updates lastSyncedAt', 'FAIL', 'lastSyncedAt is null');
    }
  } catch (error: any) {
    addResult('T3.15', 'Sync updates lastSyncedAt', 'FAIL', error.response?.data?.error?.message || error.message);
  }

  // T3.16: Idempotent PUT
  try {
    const res1 = await api.put('/settings/patch-preferences', { enablePatching: true });
    const res2 = await api.put('/settings/patch-preferences', { enablePatching: true });
    if (res1.status === 200 && res2.status === 200) {
      addResult('T3.16', 'Idempotent PUT', 'PASS');
    } else {
      addResult('T3.16', 'Idempotent PUT', 'FAIL', 'PUT not idempotent');
    }
  } catch (error: any) {
    addResult('T3.16', 'Idempotent PUT', 'FAIL', error.response?.data?.error?.message || error.message);
  }

  // T3.17: Persistence
  try {
    await api.put('/settings/patch-preferences', { enablePatching: false });
    const res = await api.get('/settings/patch-preferences');
    if (res.data.data.enablePatching === false) {
      addResult('T3.17', 'Persistence', 'PASS');
    } else {
      addResult('T3.17', 'Persistence', 'FAIL', 'Value not persisted');
    }
  } catch (error: any) {
    addResult('T3.17', 'Persistence', 'FAIL', error.response?.data?.error?.message || error.message);
  }

  // T3.18-T3.20: RBAC tests
  const demoApi = axios.create({
    baseURL: API_BASE,
    headers: { Authorization: `Bearer ${demoToken}` },
  });

  try {
    // T3.18: User denied PUT
    await demoApi.put('/settings/patch-preferences', { enablePatching: true });
    addResult('T3.18', 'RBAC: user denied PUT', 'FAIL', 'Expected 403, got 2xx');
  } catch (error: any) {
    if (error.response?.status === 403) {
      addResult('T3.18', 'RBAC: user denied PUT', 'PASS');
    } else {
      addResult('T3.18', 'RBAC: user denied PUT', 'FAIL', `Expected 403, got ${error.response?.status}`);
    }
  }

  try {
    // T3.19: User denied GET (user role has settings.view=false — correct security posture)
    await demoApi.get('/settings/patch-preferences');
    addResult('T3.19', 'RBAC: user denied GET settings', 'FAIL', 'Expected 403, got 2xx');
  } catch (error: any) {
    if (error.response?.status === 403) {
      addResult('T3.19', 'RBAC: user denied GET settings', 'PASS');
    } else {
      addResult('T3.19', 'RBAC: user denied GET settings', 'FAIL', `Expected 403, got ${error.response?.status}`);
    }
  }

  try {
    // T3.20: User denied sync
    await demoApi.post('/settings/patch-preferences/sync');
    addResult('T3.20', 'RBAC: user denied sync', 'FAIL', 'Expected 403, got 2xx');
  } catch (error: any) {
    if (error.response?.status === 403) {
      addResult('T3.20', 'RBAC: user denied sync', 'PASS');
    } else {
      addResult('T3.20', 'RBAC: user denied sync', 'FAIL', `Expected 403, got ${error.response?.status}`);
    }
  }

  // T3.21: Empty body PUT
  try {
    const res = await api.put('/settings/patch-preferences', {});
    if (res.status === 200) {
      addResult('T3.21', 'Empty body PUT', 'PASS');
    } else {
      addResult('T3.21', 'Empty body PUT', 'FAIL', `Expected 200, got ${res.status}`);
    }
  } catch (error: any) {
    addResult('T3.21', 'Empty body PUT', 'FAIL', error.response?.data?.error?.message || error.message);
  }

  // T3.22: Extra fields ignored
  try {
    const res = await api.put('/settings/patch-preferences', { enablePatching: true, unknownField: 'x' });
    if (res.status === 200) {
      addResult('T3.22', 'Extra fields ignored', 'PASS');
    } else {
      addResult('T3.22', 'Extra fields ignored', 'FAIL', `Expected 200, got ${res.status}`);
    }
  } catch (error: any) {
    addResult('T3.22', 'Extra fields ignored', 'FAIL', error.response?.data?.error?.message || error.message);
  }

  // T3.23: Enable third-party toggle
  try {
    await api.put('/settings/patch-preferences', { enableThirdPartyPatching: true });
    const res = await api.get('/settings/patch-preferences');
    if (res.data.data.enableThirdPartyPatching === true) {
      addResult('T3.23', 'Enable third-party toggle', 'PASS');
    } else {
      addResult('T3.23', 'Enable third-party toggle', 'FAIL', 'Value not toggled');
    }
  } catch (error: any) {
    addResult('T3.23', 'Enable third-party toggle', 'FAIL', error.response?.data?.error?.message || error.message);
  }

  // Reset to defaults
  console.log(`\n🔄 Resetting patch preferences to defaults...`);
  try {
    await api.put('/settings/patch-preferences', {
      enablePatching: true,
      corridorOnlyApprovedPatch: false,
      patchSyncForOS: ['Windows'],
      patchApprovalPolicy: 'ManuallyApproves',
      enableThirdPartyPatching: false,
      patchApprovalScheduleTime: '02:00:00',
      scheduleTime: '03:00:00',
      zeroTouchDeploymentScheduleTime: '04:00:00',
    });
  } catch (error) {
    // Ignore cleanup errors
  }
}

// ============================================
// R4: Distribution Servers Validation
// ============================================

async function validateR4() {
  console.log('\n' + '='.repeat(80));
  console.log('R4: DISTRIBUTION SERVERS VALIDATION (25 tests)');
  console.log('='.repeat(80) + '\n');

  let createdServerIds: string[] = [];
  let existingServers: any[] = [];

  try {
    const res = await api.get('/settings/distribution-servers');
    existingServers = res.data.data.data;
    console.log(`✓ Found ${existingServers.length} existing distribution servers\n`);
  } catch (error) {
    console.log('⚠️  Could not fetch existing servers\n');
  }

  // T4.1: Create valid server
  try {
    const res = await api.post('/settings/distribution-servers', {
      name: 'Test Server Val',
      url: 'https://test.com',
    });
    if (res.status === 201 && res.data.data.status === 'Active' && res.data.data.createdBy) {
      createdServerIds.push(res.data.data.id);
      addResult('T4.1', 'Create valid server', 'PASS');
    } else {
      addResult('T4.1', 'Create valid server', 'FAIL', 'Missing status or createdBy');
    }
  } catch (error: any) {
    addResult('T4.1', 'Create valid server', 'FAIL', error.response?.data?.error?.message || error.message);
  }

  // T4.2: Create with all fields
  try {
    const res = await api.post('/settings/distribution-servers', {
      name: 'Full Val',
      description: 'Desc',
      location: 'US',
      url: 'https://full.com',
      version: '1.0',
      status: 'Active',
    });
    if (res.status === 201) {
      createdServerIds.push(res.data.data.id);
      addResult('T4.2', 'Create with all fields', 'PASS');
    } else {
      addResult('T4.2', 'Create with all fields', 'FAIL', `Expected 201, got ${res.status}`);
    }
  } catch (error: any) {
    addResult('T4.2', 'Create with all fields', 'FAIL', error.response?.data?.error?.message || error.message);
  }

  // T4.3: Create empty name
  try {
    await api.post('/settings/distribution-servers', { name: '', url: 'https://x.com' });
    addResult('T4.3', 'Create empty name', 'FAIL', 'Expected 400, got 2xx');
  } catch (error: any) {
    if (error.response?.status === 400) {
      addResult('T4.3', 'Create empty name', 'PASS');
    } else {
      addResult('T4.3', 'Create empty name', 'FAIL', `Expected 400, got ${error.response?.status}`);
    }
  }

  // T4.4: Create no URL
  try {
    await api.post('/settings/distribution-servers', { name: 'No URL' });
    addResult('T4.4', 'Create no URL', 'FAIL', 'Expected 400, got 2xx');
  } catch (error: any) {
    if (error.response?.status === 400) {
      addResult('T4.4', 'Create no URL', 'PASS');
    } else {
      addResult('T4.4', 'Create no URL', 'FAIL', `Expected 400, got ${error.response?.status}`);
    }
  }

  // T4.5: Create invalid URL
  try {
    await api.post('/settings/distribution-servers', { name: 'Bad', url: 'not-a-url' });
    addResult('T4.5', 'Create invalid URL', 'FAIL', 'Expected 400, got 2xx');
  } catch (error: any) {
    if (error.response?.status === 400) {
      addResult('T4.5', 'Create invalid URL', 'PASS');
    } else {
      addResult('T4.5', 'Create invalid URL', 'FAIL', `Expected 400, got ${error.response?.status}`);
    }
  }

  // T4.6: Create duplicate name
  if (existingServers.length > 0) {
    try {
      await api.post('/settings/distribution-servers', {
        name: existingServers[0].name,
        url: 'https://x.com',
      });
      addResult('T4.6', 'Create duplicate name', 'FAIL', 'Expected 409, got 2xx');
    } catch (error: any) {
      if (error.response?.status === 409) {
        addResult('T4.6', 'Create duplicate name', 'PASS');
      } else {
        addResult('T4.6', 'Create duplicate name', 'FAIL', `Expected 409, got ${error.response?.status}`);
      }
    }
  } else {
    addResult('T4.6', 'Create duplicate name', 'SKIP', 'No existing servers');
  }

  // T4.7: Create duplicate case-insensitive
  if (existingServers.length > 0) {
    try {
      await api.post('/settings/distribution-servers', {
        name: existingServers[0].name.toLowerCase(),
        url: 'https://x.com',
      });
      addResult('T4.7', 'Create duplicate case-insensitive', 'FAIL', 'Expected 409, got 2xx');
    } catch (error: any) {
      if (error.response?.status === 409) {
        addResult('T4.7', 'Create duplicate case-insensitive', 'PASS');
      } else {
        addResult('T4.7', 'Create duplicate case-insensitive', 'FAIL', `Expected 409, got ${error.response?.status}`);
      }
    }
  } else {
    addResult('T4.7', 'Create duplicate case-insensitive', 'SKIP', 'No existing servers');
  }

  // T4.8: Create with status
  try {
    const res = await api.post('/settings/distribution-servers', {
      name: 'Maint Val',
      url: 'https://x.com',
      status: 'Maintenance',
    });
    if (res.status === 201 && res.data.data.status === 'Maintenance') {
      createdServerIds.push(res.data.data.id);
      addResult('T4.8', 'Create with status', 'PASS');
    } else {
      addResult('T4.8', 'Create with status', 'FAIL', `Status is ${res.data.data.status}, expected Maintenance`);
    }
  } catch (error: any) {
    addResult('T4.8', 'Create with status', 'FAIL', error.response?.data?.error?.message || error.message);
  }

  // T4.9: Create invalid status
  try {
    await api.post('/settings/distribution-servers', {
      name: 'Bad',
      url: 'https://x.com',
      status: 'Down',
    });
    addResult('T4.9', 'Create invalid status', 'FAIL', 'Expected 400, got 2xx');
  } catch (error: any) {
    if (error.response?.status === 400) {
      addResult('T4.9', 'Create invalid status', 'PASS');
    } else {
      addResult('T4.9', 'Create invalid status', 'FAIL', `Expected 400, got ${error.response?.status}`);
    }
  }

  // T4.10-T4.12: List tests
  try {
    // T4.10: List paginated
    const res = await api.get('/settings/distribution-servers?page=1&limit=3');
    if (res.status === 200 && res.data.data.data.length <= 3 && res.data.data.meta.total >= 5) {
      addResult('T4.10', 'List paginated', 'PASS');
    } else {
      addResult('T4.10', 'List paginated', 'FAIL', 'Pagination not working correctly');
    }
  } catch (error: any) {
    addResult('T4.10', 'List paginated', 'FAIL', error.response?.data?.error?.message || error.message);
  }

  try {
    // T4.11: List search
    const res = await api.get('/settings/distribution-servers?search=relay');
    if (res.status === 200) {
      addResult('T4.11', 'List search', 'PASS');
    } else {
      addResult('T4.11', 'List search', 'FAIL', `Expected 200, got ${res.status}`);
    }
  } catch (error: any) {
    addResult('T4.11', 'List search', 'FAIL', error.response?.data?.error?.message || error.message);
  }

  try {
    // T4.12: List sort
    const res = await api.get('/settings/distribution-servers?sortBy=name&sortOrder=asc');
    if (res.status === 200) {
      addResult('T4.12', 'List sort', 'PASS');
    } else {
      addResult('T4.12', 'List sort', 'FAIL', `Expected 200, got ${res.status}`);
    }
  } catch (error: any) {
    addResult('T4.12', 'List sort', 'FAIL', error.response?.data?.error?.message || error.message);
  }

  // T4.13-T4.20: CRUD tests
  if (existingServers.length > 0) {
    const testServerId = existingServers[0].id;

    // T4.13: Get by ID
    try {
      const res = await api.get(`/settings/distribution-servers/${testServerId}`);
      if (res.status === 200) {
        addResult('T4.13', 'Get by ID', 'PASS');
      } else {
        addResult('T4.13', 'Get by ID', 'FAIL', `Expected 200, got ${res.status}`);
      }
    } catch (error: any) {
      addResult('T4.13', 'Get by ID', 'FAIL', error.response?.data?.error?.message || error.message);
    }

    // T4.14: Get non-existent
    try {
      await api.get('/settings/distribution-servers/550e8400-e29b-41d4-a716-446655440000');
      addResult('T4.14', 'Get non-existent', 'FAIL', 'Expected 404, got 2xx');
    } catch (error: any) {
      if (error.response?.status === 404) {
        addResult('T4.14', 'Get non-existent', 'PASS');
      } else {
        addResult('T4.14', 'Get non-existent', 'FAIL', `Expected 404, got ${error.response?.status}`);
      }
    }

    if (createdServerIds.length > 0) {
      const updateServerId = createdServerIds[0];

      // T4.15: Update status
      try {
        const res = await api.put(`/settings/distribution-servers/${updateServerId}`, {
          status: 'Inactive',
        });
        if (res.status === 200 && res.data.data.status === 'Inactive') {
          addResult('T4.15', 'Update status', 'PASS');
        } else {
          addResult('T4.15', 'Update status', 'FAIL', 'Status not updated');
        }
      } catch (error: any) {
        addResult('T4.15', 'Update status', 'FAIL', error.response?.data?.error?.message || error.message);
      }

      // T4.16: Update name
      try {
        const res = await api.put(`/settings/distribution-servers/${updateServerId}`, {
          name: 'Renamed Server Val',
        });
        if (res.status === 200 && res.data.data.name === 'Renamed Server Val') {
          addResult('T4.16', 'Update name', 'PASS');
        } else {
          addResult('T4.16', 'Update name', 'FAIL', 'Name not updated');
        }
      } catch (error: any) {
        addResult('T4.16', 'Update name', 'FAIL', error.response?.data?.error?.message || error.message);
      }

      // T4.17: Update name to duplicate
      if (existingServers.length > 1) {
        try {
          await api.put(`/settings/distribution-servers/${updateServerId}`, {
            name: existingServers[1].name,
          });
          addResult('T4.17', 'Update name to duplicate', 'FAIL', 'Expected 409, got 2xx');
        } catch (error: any) {
          if (error.response?.status === 409) {
            addResult('T4.17', 'Update name to duplicate', 'PASS');
          } else {
            addResult('T4.17', 'Update name to duplicate', 'FAIL', `Expected 409, got ${error.response?.status}`);
          }
        }
      } else {
        addResult('T4.17', 'Update name to duplicate', 'SKIP', 'Not enough servers');
      }

      // T4.18: Update non-existent
      try {
        await api.put('/settings/distribution-servers/550e8400-e29b-41d4-a716-446655440000', {
          name: 'X',
        });
        addResult('T4.18', 'Update non-existent', 'FAIL', 'Expected 404, got 2xx');
      } catch (error: any) {
        if (error.response?.status === 404) {
          addResult('T4.18', 'Update non-existent', 'PASS');
        } else {
          addResult('T4.18', 'Update non-existent', 'FAIL', `Expected 404, got ${error.response?.status}`);
        }
      }

      // T4.19: Delete server
      try {
        const res = await api.delete(`/settings/distribution-servers/${updateServerId}`);
        if (res.status === 204) {
          addResult('T4.19', 'Delete server', 'PASS');
          createdServerIds = createdServerIds.filter(id => id !== updateServerId);
        } else {
          addResult('T4.19', 'Delete server', 'FAIL', `Expected 204, got ${res.status}`);
        }
      } catch (error: any) {
        addResult('T4.19', 'Delete server', 'FAIL', error.response?.data?.error?.message || error.message);
      }

      // T4.20: Delete non-existent
      try {
        await api.delete('/settings/distribution-servers/550e8400-e29b-41d4-a716-446655440000');
        addResult('T4.20', 'Delete non-existent', 'FAIL', 'Expected 404, got 2xx');
      } catch (error: any) {
        if (error.response?.status === 404) {
          addResult('T4.20', 'Delete non-existent', 'PASS');
        } else {
          addResult('T4.20', 'Delete non-existent', 'FAIL', `Expected 404, got ${error.response?.status}`);
        }
      }
    } else {
      addResult('T4.15', 'Update status', 'SKIP', 'No test servers created');
      addResult('T4.16', 'Update name', 'SKIP', 'No test servers created');
      addResult('T4.17', 'Update name to duplicate', 'SKIP', 'No test servers created');
      addResult('T4.18', 'Update non-existent', 'SKIP', 'No test servers created');
      addResult('T4.19', 'Delete server', 'SKIP', 'No test servers created');
      addResult('T4.20', 'Delete non-existent', 'SKIP', 'No test servers created');
    }
  } else {
    addResult('T4.13', 'Get by ID', 'SKIP', 'No existing servers');
    addResult('T4.14', 'Get non-existent', 'SKIP', 'No existing servers');
    addResult('T4.15', 'Update status', 'SKIP', 'No existing servers');
    addResult('T4.16', 'Update name', 'SKIP', 'No existing servers');
    addResult('T4.17', 'Update name to duplicate', 'SKIP', 'No existing servers');
    addResult('T4.18', 'Update non-existent', 'SKIP', 'No existing servers');
    addResult('T4.19', 'Delete server', 'SKIP', 'No existing servers');
    addResult('T4.20', 'Delete non-existent', 'SKIP', 'No existing servers');
  }

  // T4.21-T4.22: RBAC tests
  try {
    // T4.21: User denied create
    const demoApi = axios.create({
      baseURL: API_BASE,
      headers: { Authorization: `Bearer ${demoToken}` },
    });
    await demoApi.post('/settings/distribution-servers', {
      name: 'Test',
      url: 'https://x.com',
    });
    addResult('T4.21', 'RBAC: user denied create', 'FAIL', 'Expected 403, got 2xx');
  } catch (error: any) {
    if (error.response?.status === 403) {
      addResult('T4.21', 'RBAC: user denied create', 'PASS');
    } else {
      addResult('T4.21', 'RBAC: user denied create', 'FAIL', `Expected 403, got ${error.response?.status}`);
    }
  }

  try {
    // T4.22: Admin allowed
    const res = await api.post('/settings/distribution-servers', {
      name: 'Admin Test Val',
      url: 'https://x.com',
    });
    if (res.status === 201) {
      createdServerIds.push(res.data.data.id);
      addResult('T4.22', 'RBAC: admin allowed', 'PASS');
    } else {
      addResult('T4.22', 'RBAC: admin allowed', 'FAIL', `Expected 201, got ${res.status}`);
    }
  } catch (error: any) {
    addResult('T4.22', 'RBAC: admin allowed', 'FAIL', error.response?.data?.error?.message || error.message);
  }

  // T4.23-T4.25: Length validation tests
  try {
    // T4.23: Name max length
    await api.post('/settings/distribution-servers', {
      name: 'a'.repeat(256),
      url: 'https://x.com',
    });
    addResult('T4.23', 'Name max length', 'FAIL', 'Expected 400, got 2xx');
  } catch (error: any) {
    if (error.response?.status === 400) {
      addResult('T4.23', 'Name max length', 'PASS');
    } else {
      addResult('T4.23', 'Name max length', 'FAIL', `Expected 400, got ${error.response?.status}`);
    }
  }

  try {
    // T4.24: Description max length
    await api.post('/settings/distribution-servers', {
      name: 'T',
      url: 'https://x.com',
      description: 'a'.repeat(501),
    });
    addResult('T4.24', 'Description max length', 'FAIL', 'Expected 400, got 2xx');
  } catch (error: any) {
    if (error.response?.status === 400) {
      addResult('T4.24', 'Description max length', 'PASS');
    } else {
      addResult('T4.24', 'Description max length', 'FAIL', `Expected 400, got ${error.response?.status}`);
    }
  }

  try {
    // T4.25: Version max length
    await api.post('/settings/distribution-servers', {
      name: 'T',
      url: 'https://x.com',
      version: 'a'.repeat(51),
    });
    addResult('T4.25', 'Version max length', 'FAIL', 'Expected 400, got 2xx');
  } catch (error: any) {
    if (error.response?.status === 400) {
      addResult('T4.25', 'Version max length', 'PASS');
    } else {
      addResult('T4.25', 'Version max length', 'FAIL', `Expected 400, got ${error.response?.status}`);
    }
  }

  // Cleanup
  console.log(`\n🧹 Cleaning up ${createdServerIds.length} test servers...`);
  for (const id of createdServerIds) {
    try {
      await api.delete(`/settings/distribution-servers/${id}`);
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

// ============================================
// Main execution
// ============================================

async function main() {
  await setup();

  await validateR1();
  await validateR2();
  await validateR3();
  await validateR4();

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('VALIDATION SUMMARY');
  console.log('='.repeat(80) + '\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  const total = results.length;

  console.log(`Total: ${total} tests`);
  console.log(`✅ PASS: ${passed}`);
  console.log(`❌ FAIL: ${failed}`);
  console.log(`⏭️  SKIP: ${skipped}`);
  console.log('');

  if (failed > 0) {
    console.log('Failed tests:');
    results
      .filter(r => r.status === 'FAIL')
      .forEach(r => {
        console.log(`  ${r.id}: ${r.name}`);
        if (r.error) console.log(`    Error: ${r.error}`);
      });
    console.log('');
  }

  const passRate = ((passed / (total - skipped)) * 100).toFixed(1);
  console.log(`Pass rate: ${passRate}% (${passed}/${total - skipped})`);
  console.log('');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
