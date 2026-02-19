// @ts-nocheck
import { getAgent, getAdminToken, prisma } from './test-setup';

const PREFIX = 'INTTEST-VULN';

describe('Vulnerabilities Module', () => {
  let token;
  let seededVulnId;
  let createdExceptionId;

  beforeAll(async () => {
    token = await getAdminToken();
    // Find a seeded vulnerability to use across tests
    const vuln = await prisma.vulnerability.findFirst({
      where: { cveId: 'CVE-2021-44228' },
    });
    seededVulnId = vuln?.id;
  });

  afterAll(async () => {
    // Clean up exceptions created during tests (by reasonForExclusion prefix)
    await prisma.vulnerabilityException.deleteMany({
      where: { reasonForExclusion: { startsWith: PREFIX } },
    });
  });

  // ---- Auth guard ----

  it('401 without token on GET /v1/vulnerabilities', async () => {
    const res = await getAgent().get('/v1/vulnerabilities');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('401 without token on GET /v1/vulnerabilities/stats', async () => {
    const res = await getAgent().get('/v1/vulnerabilities/stats');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('401 without token on GET /v1/vulnerabilities/exceptions', async () => {
    const res = await getAgent().get('/v1/vulnerabilities/exceptions');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // ---- List vulnerabilities ----
  // The service returns paginate() which returns { success, data, total, page, limit, totalPages }
  // sendSuccess wraps it as { success: true, data: { ... } }
  // So res.body.data.data is the items array

  it('GET /v1/vulnerabilities returns paginated list', async () => {
    const res = await getAgent()
      .get('/v1/vulnerabilities')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.data)).toBe(true);
    expect(typeof res.body.data.total).toBe('number');
    expect(typeof res.body.data.page).toBe('number');
    expect(typeof res.body.data.limit).toBe('number');
    expect(typeof res.body.data.totalPages).toBe('number');
  });

  it('GET /v1/vulnerabilities supports page and limit params', async () => {
    const res = await getAgent()
      .get('/v1/vulnerabilities?page=1&limit=2')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.data.length).toBeLessThanOrEqual(2);
    expect(res.body.data.limit).toBe(2);
    expect(res.body.data.page).toBe(1);
  });

  it('GET /v1/vulnerabilities supports search param', async () => {
    const res = await getAgent()
      .get('/v1/vulnerabilities?search=Log4j')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.data)).toBe(true);
  });

  it('GET /v1/vulnerabilities supports severity filter', async () => {
    const res = await getAgent()
      .get('/v1/vulnerabilities?severity=CRITICAL')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    for (const v of res.body.data.data) {
      expect(v.severity).toBe('CRITICAL');
    }
  });

  it('GET /v1/vulnerabilities 400 on invalid limit (over max)', async () => {
    const res = await getAgent()
      .get('/v1/vulnerabilities?limit=999')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /v1/vulnerabilities supports cvss3Min filter', async () => {
    const res = await getAgent()
      .get('/v1/vulnerabilities?cvss3Min=9')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    for (const v of res.body.data.data) {
      expect(v.cvss3BaseScore).toBeGreaterThanOrEqual(9);
    }
  });

  it('GET /v1/vulnerabilities supports order param', async () => {
    const res = await getAgent()
      .get('/v1/vulnerabilities?sort=cvss3BaseScore&order=asc')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.data)).toBe(true);
  });

  // ---- Get by ID ----

  it('GET /v1/vulnerabilities/:id returns vulnerability', async () => {
    expect(seededVulnId).toBeDefined();
    const res = await getAgent()
      .get(`/v1/vulnerabilities/${seededVulnId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(seededVulnId);
    // transformVulnerabilityDetails maps cveId -> cve
    expect(res.body.data.cve).toBe('CVE-2021-44228');
    expect(res.body.data.severity).toBe('CRITICAL');
  });

  it('GET /v1/vulnerabilities/:id 404 for unknown ID', async () => {
    const res = await getAgent()
      .get('/v1/vulnerabilities/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
  });

  // ---- Stats ----

  it('GET /v1/vulnerabilities/stats returns stats object', async () => {
    const res = await getAgent()
      .get('/v1/vulnerabilities/stats')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.total).toBe('number');
    expect(typeof res.body.data.critical).toBe('number');
    expect(typeof res.body.data.high).toBe('number');
  });

  it('GET /v1/vulnerabilities/stats with affectsAssets=true', async () => {
    const res = await getAgent()
      .get('/v1/vulnerabilities/stats?affectsAssets=true')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.total).toBe('number');
  });

  // ---- Types ----

  it('GET /v1/vulnerabilities/types returns type counts', async () => {
    const res = await getAgent()
      .get('/v1/vulnerabilities/types')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  // ---- Endpoints & Network ----

  it('GET /v1/vulnerabilities/endpoints returns data', async () => {
    const res = await getAgent()
      .get('/v1/vulnerabilities/endpoints')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('GET /v1/vulnerabilities/network returns data', async () => {
    const res = await getAgent()
      .get('/v1/vulnerabilities/network')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  // ---- Zero-Day ----

  it('GET /v1/vulnerabilities/zero-day returns paginated list', async () => {
    const res = await getAgent()
      .get('/v1/vulnerabilities/zero-day')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // paginate() result is returned via sendSuccess -> res.body.data
    expect(Array.isArray(res.body.data.data)).toBe(true);
    expect(typeof res.body.data.total).toBe('number');
  });

  it('GET /v1/vulnerabilities/zero-day supports pagination', async () => {
    const res = await getAgent()
      .get('/v1/vulnerabilities/zero-day?page=1&limit=5')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.data.length).toBeLessThanOrEqual(5);
    expect(res.body.data.limit).toBe(5);
  });

  // ---- CVE Suggest ----

  it('GET /v1/vulnerabilities/cve-suggest returns suggestions', async () => {
    const res = await getAgent()
      .get('/v1/vulnerabilities/cve-suggest?software=Log4j')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /v1/vulnerabilities/cve-suggest 400 without software param', async () => {
    const res = await getAgent()
      .get('/v1/vulnerabilities/cve-suggest')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ---- CPE Stats ----

  it('GET /v1/vulnerabilities/cpe-stats returns stats', async () => {
    const res = await getAgent()
      .get('/v1/vulnerabilities/cpe-stats')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.totalMappings).toBe('number');
    expect(typeof res.body.data.totalUnmatched).toBe('number');
    expect(typeof res.body.data.matchRate).toBe('number');
    expect(res.body.data.matchRate).toBeGreaterThanOrEqual(0);
    expect(res.body.data.matchRate).toBeLessThanOrEqual(100);
  });

  // ---- Unmatched Software ----

  it('GET /v1/vulnerabilities/unmatched-software returns list', async () => {
    const res = await getAgent()
      .get('/v1/vulnerabilities/unmatched-software')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Controller returns { data, total, limit, offset } via sendSuccess
    expect(Array.isArray(res.body.data.data)).toBe(true);
    expect(typeof res.body.data.total).toBe('number');
  });

  it('GET /v1/vulnerabilities/unmatched-software supports resolved filter', async () => {
    const res = await getAgent()
      .get('/v1/vulnerabilities/unmatched-software?resolved=true')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    for (const item of res.body.data.data) {
      expect(item.resolved).toBe(true);
    }
  });

  // ---- CVE-specific endpoints ----

  it('GET /v1/vulnerabilities/:cve/endpoints returns paginated result', async () => {
    const res = await getAgent()
      .get('/v1/vulnerabilities/CVE-2021-44228/endpoints')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.data)).toBe(true);
    expect(typeof res.body.data.total).toBe('number');
  });

  it('GET /v1/vulnerabilities/:cve/software returns paginated result', async () => {
    const res = await getAgent()
      .get('/v1/vulnerabilities/CVE-2021-44228/software')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.data)).toBe(true);
    expect(typeof res.body.data.total).toBe('number');
  });

  it('GET /v1/vulnerabilities/:cve/endpoints 400 with invalid CVE format', async () => {
    const res = await getAgent()
      .get('/v1/vulnerabilities/INVALID-CVE/endpoints')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ---- Exceptions CRUD ----

  it('GET /v1/vulnerabilities/exceptions returns list', async () => {
    const res = await getAgent()
      .get('/v1/vulnerabilities/exceptions')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // getExceptions returns { data: [...], total } via sendSuccess
    expect(Array.isArray(res.body.data.data)).toBe(true);
    expect(typeof res.body.data.total).toBe('number');
  });

  it('POST /v1/vulnerabilities/exceptions creates exception', async () => {
    expect(seededVulnId).toBeDefined();
    const res = await getAgent()
      .post('/v1/vulnerabilities/exceptions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vulnerabilityIds: [seededVulnId],
        exceptionType: 'ACCEPTABLE_RISK',
        reasonForExclusion: `${PREFIX}-test-reason`,
        scope: 'GLOBAL',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    // createExceptions returns { data: [...], message } via sendSuccess
    expect(Array.isArray(res.body.data.data)).toBe(true);
    expect(res.body.data.data.length).toBeGreaterThan(0);
    expect(res.body.data.message).toContain('exception');
    createdExceptionId = res.body.data.data[0].id;
  });

  it('POST /v1/vulnerabilities/exceptions 400 with empty vulnerabilityIds', async () => {
    const res = await getAgent()
      .post('/v1/vulnerabilities/exceptions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vulnerabilityIds: [],
        exceptionType: 'ACCEPTABLE_RISK',
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /v1/vulnerabilities/exceptions 400 with invalid exceptionType', async () => {
    const res = await getAgent()
      .post('/v1/vulnerabilities/exceptions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vulnerabilityIds: [seededVulnId],
        exceptionType: 'INVALID_TYPE',
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('PUT /v1/vulnerabilities/exceptions/:id updates exception', async () => {
    expect(createdExceptionId).toBeDefined();
    const res = await getAgent()
      .put(`/v1/vulnerabilities/exceptions/${createdExceptionId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        exceptionType: 'NOT_APPLICABLE',
        reasonForExclusion: `${PREFIX}-updated-reason`,
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.exceptionType).toBe('NOT_APPLICABLE');
  });

  it('PUT /v1/vulnerabilities/exceptions/:id 400 on invalid UUID', async () => {
    const res = await getAgent()
      .put('/v1/vulnerabilities/exceptions/not-a-uuid')
      .set('Authorization', `Bearer ${token}`)
      .send({ exceptionType: 'NOT_APPLICABLE' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('DELETE /v1/vulnerabilities/exceptions/:id deletes exception', async () => {
    expect(createdExceptionId).toBeDefined();
    const res = await getAgent()
      .delete(`/v1/vulnerabilities/exceptions/${createdExceptionId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify exception is gone: list exceptions and confirm id not present
    const listRes = await getAgent()
      .get('/v1/vulnerabilities/exceptions')
      .set('Authorization', `Bearer ${token}`);
    const ids = listRes.body.data.data.map((e) => e.id);
    expect(ids).not.toContain(createdExceptionId);
  });

  it('DELETE /v1/vulnerabilities/exceptions/:id 400 on invalid UUID', async () => {
    const res = await getAgent()
      .delete('/v1/vulnerabilities/exceptions/not-a-uuid')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ---- Scan ----

  it('POST /v1/vulnerabilities/scan accepts scope ALL', async () => {
    const res = await getAgent()
      .post('/v1/vulnerabilities/scan')
      .set('Authorization', `Bearer ${token}`)
      .send({ scope: 'ALL' });
    expect([200, 202]).toContain(res.status);
    expect(res.body.success).toBe(true);
  });

  it('POST /v1/vulnerabilities/scan 400 on invalid scope', async () => {
    const res = await getAgent()
      .post('/v1/vulnerabilities/scan')
      .set('Authorization', `Bearer ${token}`)
      .send({ scope: 'INVALID' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
