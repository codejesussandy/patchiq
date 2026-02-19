/**
 * Integration tests: Patch Recommendations
 * Covers: dashboard, list, get, accept/reject/bulk actions
 *
 * Recommendations are created by the system when vulnerabilities are detected.
 * We seed test data directly via Prisma to ensure recommendations exist.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { getAgent, getAdminToken, prisma } from './test-setup';

const REC_BASE = '/v1/patch-recommendations';
const TS = Date.now();

let seededRecommendationId: string;
let seededPatchId: string;
let seededAssetId: string;
let seededVulnId: string;

async function getFirstOrg() {
  const org = await prisma.organization.findFirst();
  if (!org) throw new Error('No organization found in test DB');
  return org;
}

beforeAll(async () => {
  // Find or create a patch and asset to attach recommendations to
  const org = await getFirstOrg();

  // Use an existing patch from seed data
  const existingPatch = await prisma.patch.findFirst({
    where: { approvalStatus: 'APPROVED' },
  });

  // Use an existing asset
  const existingAsset = await prisma.asset.findFirst({
    where: { organizationId: org.id },
  });

  if (!existingPatch || !existingAsset) {
    // Create a minimal patch for testing if none exist
    const patch = await prisma.patch.create({
      data: {
        patchId: `INTTEST-KB-${TS}`,
        software: `INTTEST-REC-Software-${TS}`,
        title: `INTTEST-REC-Patch-${TS}`,
        severity: 'HIGH',
        approvalStatus: 'APPROVED',
        testStatus: 'TESTED',
        operationalStatusSince: new Date(),
      },
    });
    seededPatchId = patch.id;
  } else {
    seededPatchId = existingPatch.id;
  }

  if (existingAsset) {
    seededAssetId = existingAsset.id;
  }

  // Find an existing vulnerability or create one
  const existingVuln = await prisma.vulnerability.findFirst();
  if (existingVuln) {
    seededVulnId = existingVuln.id;
  } else {
    const vuln = await prisma.vulnerability.create({
      data: {
        cveId: `CVE-INTTEST-${TS}`,
        title: `INTTEST Vulnerability ${TS}`,
        severity: 'HIGH',
      },
    });
    seededVulnId = vuln.id;
  }

  // Create a recommendation directly via Prisma if we have an asset
  if (seededAssetId) {
    const rec = await prisma.assetPatchRecommendation.upsert({
      where: {
        assetId_vulnerabilityId_patchId: {
          assetId: seededAssetId,
          vulnerabilityId: seededVulnId,
          patchId: seededPatchId,
        },
      },
      update: {
        status: 'RECOMMENDED',
        severity: 'HIGH',
        riskScore: 7.5,
      },
      create: {
        assetId: seededAssetId,
        patchId: seededPatchId,
        vulnerabilityId: seededVulnId,
        status: 'RECOMMENDED',
        severity: 'HIGH',
        riskScore: 7.5,
      },
    });
    seededRecommendationId = rec.id;
  }
});

afterAll(async () => {
  // Cleanup seeded recommendations first (FK constraints), then patches and vulnerabilities
  await prisma.assetPatchRecommendation.deleteMany({
    where: { patchId: seededPatchId, assetId: seededAssetId },
  });
  await prisma.patch.deleteMany({
    where: { patchId: { startsWith: 'INTTEST-' } },
  });
  await prisma.vulnerability.deleteMany({
    where: { cveId: { startsWith: 'CVE-INTTEST-' } },
  });
});

// ============================================
// Auth
// ============================================

describe('Patch Recommendations - Auth', () => {
  it('GET /v1/patch-recommendations returns 401 without token', async () => {
    const res = await getAgent().get(REC_BASE);
    expect(res.status).toBe(401);
  });

  it('GET /v1/patch-recommendations/dashboard returns 401 without token', async () => {
    const res = await getAgent().get(`${REC_BASE}/dashboard`);
    expect(res.status).toBe(401);
  });
});

// ============================================
// Dashboard
// ============================================

describe('GET /v1/patch-recommendations/dashboard', () => {
  it('returns dashboard statistics', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .get(`${REC_BASE}/dashboard`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(typeof res.body.data.totalRecommendations).toBe('number');
    expect(res.body.data.byStatus).toBeDefined();
    expect(res.body.data.bySeverity).toBeDefined();
  });
});

// ============================================
// List Recommendations
// ============================================

describe('GET /v1/patch-recommendations', () => {
  it('returns paginated list of recommendations', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .get(REC_BASE)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // sendPaginated returns { success, data, meta }
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toBeDefined();
    expect(typeof res.body.meta.total).toBe('number');
    expect(typeof res.body.meta.page).toBe('number');
    expect(typeof res.body.meta.limit).toBe('number');
  });

  it('supports status filter', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .get(`${REC_BASE}?status=RECOMMENDED`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    for (const rec of res.body.data as any[]) {
      expect(rec.status).toBe('RECOMMENDED');
    }
  });

  it('supports severity filter', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .get(`${REC_BASE}?severity=HIGH`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('supports pagination params', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .get(`${REC_BASE}?page=1&limit=5`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(5);
    expect(res.body.meta.limit).toBe(5);
    expect(res.body.meta.page).toBe(1);
  });

  it('supports sortBy parameter', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .get(`${REC_BASE}?sortBy=riskScore&sortOrder=desc`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ============================================
// Get Single Recommendation
// ============================================

describe('GET /v1/patch-recommendations/:id', () => {
  it('returns a recommendation by ID', async () => {
    if (!seededRecommendationId) {
      console.warn('No seeded recommendation available - skipping get by ID test');
      return;
    }

    const token = await getAdminToken();
    const res = await getAgent()
      .get(`${REC_BASE}/${seededRecommendationId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(seededRecommendationId);
    expect(res.body.data.patchId).toBe(seededPatchId);
  });

  it('returns 400 for non-existent recommendation', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .get(`${REC_BASE}/00000000-0000-0000-0000-000000000099`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body.success).toBe(false);
  });
});

// ============================================
// Accept Recommendation
// ============================================

describe('POST /v1/patch-recommendations/:id/accept', () => {
  let acceptRecId: string;

  beforeAll(async () => {
    if (!seededAssetId) return;

    // Create a fresh vulnerability so we avoid the unique constraint (assetId, vulnerabilityId, patchId)
    const acceptVuln = await prisma.vulnerability.create({
      data: {
        cveId: `CVE-INTTEST-ACCEPT-${TS}`,
        title: `INTTEST Accept Vulnerability ${TS}`,
        severity: 'MEDIUM',
      },
    });

    const rec = await prisma.assetPatchRecommendation.create({
      data: {
        assetId: seededAssetId,
        patchId: seededPatchId,
        vulnerabilityId: acceptVuln.id,
        status: 'RECOMMENDED',
        severity: 'MEDIUM',
        riskScore: 5.0,
      },
    });
    acceptRecId = rec.id;
  });

  afterAll(async () => {
    if (acceptRecId) {
      const rec = await prisma.assetPatchRecommendation.findUnique({ where: { id: acceptRecId } });
      if (rec) {
        await prisma.assetPatchRecommendation.delete({ where: { id: acceptRecId } });
        await prisma.vulnerability.deleteMany({ where: { cveId: { startsWith: 'CVE-INTTEST-ACCEPT-' } } });
      }
    }
  });

  it('accepts a recommendation', async () => {
    if (!acceptRecId) {
      console.warn('No asset available to create recommendation - skipping');
      return;
    }

    const token = await getAdminToken();
    const res = await getAgent()
      .post(`${REC_BASE}/${acceptRecId}/accept`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Approved for deployment' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ACCEPTED');
  });
});

// ============================================
// Reject Recommendation
// ============================================

describe('POST /v1/patch-recommendations/:id/reject', () => {
  let rejectRecId: string;

  beforeAll(async () => {
    if (!seededAssetId) return;

    // Create a fresh vulnerability so we avoid the unique constraint (assetId, vulnerabilityId, patchId)
    const rejectVuln = await prisma.vulnerability.create({
      data: {
        cveId: `CVE-INTTEST-REJECT-${TS}`,
        title: `INTTEST Reject Vulnerability ${TS}`,
        severity: 'LOW',
      },
    });

    const rec = await prisma.assetPatchRecommendation.create({
      data: {
        assetId: seededAssetId,
        patchId: seededPatchId,
        vulnerabilityId: rejectVuln.id,
        status: 'RECOMMENDED',
        severity: 'LOW',
        riskScore: 3.0,
      },
    });
    rejectRecId = rec.id;
  });

  afterAll(async () => {
    if (rejectRecId) {
      const rec = await prisma.assetPatchRecommendation.findUnique({ where: { id: rejectRecId } });
      if (rec) {
        await prisma.assetPatchRecommendation.delete({ where: { id: rejectRecId } });
        await prisma.vulnerability.deleteMany({ where: { cveId: { startsWith: 'CVE-INTTEST-REJECT-' } } });
      }
    }
  });

  it('rejects a recommendation with a reason', async () => {
    if (!rejectRecId) {
      console.warn('No asset available to create recommendation - skipping');
      return;
    }

    const token = await getAdminToken();
    const res = await getAgent()
      .post(`${REC_BASE}/${rejectRecId}/reject`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Not applicable to this environment' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('REJECTED');
  });

  it('returns 400 when reason is missing', async () => {
    if (!seededRecommendationId) return;

    const token = await getAdminToken();
    const res = await getAgent()
      .post(`${REC_BASE}/${seededRecommendationId}/reject`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ============================================
// Bulk Accept
// ============================================

describe('POST /v1/patch-recommendations/bulk-accept', () => {
  it('bulk accepts recommendations by IDs', async () => {
    if (!seededRecommendationId) {
      console.warn('No seeded recommendation - skipping bulk accept test');
      return;
    }

    const token = await getAdminToken();
    const res = await getAgent()
      .post(`${REC_BASE}/bulk-accept`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: [seededRecommendationId], reason: 'Bulk approval' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('returns 400 when ids is empty', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .post(`${REC_BASE}/bulk-accept`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: [] });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when ids is missing', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .post(`${REC_BASE}/bulk-accept`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'No IDs' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when ids contains non-UUIDs', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .post(`${REC_BASE}/bulk-accept`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: ['not-a-uuid'] });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ============================================
// Bulk Reject
// ============================================

describe('POST /v1/patch-recommendations/bulk-reject', () => {
  it('returns 400 when reason is missing', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .post(`${REC_BASE}/bulk-reject`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: ['00000000-0000-0000-0000-000000000099'] });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when ids is empty', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .post(`${REC_BASE}/bulk-reject`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: [], reason: 'Not needed' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('bulk rejects recommendations by IDs', async () => {
    if (!seededAssetId || !seededRecommendationId) {
      console.warn('No asset/recommendation - skipping bulk reject test');
      return;
    }

    // Reset the seeded recommendation back to RECOMMENDED so we can bulk-reject it
    await prisma.assetPatchRecommendation.update({
      where: { id: seededRecommendationId },
      data: { status: 'RECOMMENDED' },
    });

    const token = await getAdminToken();
    const res = await getAgent()
      .post(`${REC_BASE}/bulk-reject`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: [seededRecommendationId], reason: 'Bulk rejection test' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ============================================
// Bulk Deploy
// ============================================

describe('POST /v1/patch-recommendations/bulk-deploy', () => {
  it('returns 401 without auth', async () => {
    const res = await getAgent()
      .post(`${REC_BASE}/bulk-deploy`)
      .send({ ids: ['00000000-0000-0000-0000-000000000001'] });

    expect(res.status).toBe(401);
  });

  it('returns 400 when ids is empty', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .post(`${REC_BASE}/bulk-deploy`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: [] });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when ids is missing', async () => {
    const token = await getAdminToken();
    const res = await getAgent()
      .post(`${REC_BASE}/bulk-deploy`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
