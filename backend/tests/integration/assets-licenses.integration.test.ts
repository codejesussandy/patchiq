// @ts-nocheck
import { getAgent, getAdminToken, prisma } from './test-setup';

const PREFIX = 'INTTEST-LIC';
const UNKNOWN_ID = '00000000-0000-0000-0000-000000000000';

describe('Software Licenses', () => {
  let token;
  let softwareLicenseId;

  beforeAll(async () => {
    token = await getAdminToken();
  });

  afterAll(async () => {
    await prisma.softwareLicense.deleteMany({ where: { licenseName: { startsWith: PREFIX } } });
  });

  // ---- List ----
  it('GET /v1/software-licenses returns list', async () => {
    const res = await getAgent()
      .get('/v1/software-licenses')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    const items = res.body.data.data ?? res.body.data;
    expect(Array.isArray(items)).toBe(true);
  });

  it('GET /v1/software-licenses 401 without auth', async () => {
    const res = await getAgent().get('/v1/software-licenses');
    expect(res.status).toBe(401);
  });

  // ---- Create ----
  it('POST /v1/software-licenses creates a software license', async () => {
    const res = await getAgent()
      .post('/v1/software-licenses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        licenseName: `${PREFIX}-Office365`,
        softwareName: 'Microsoft Office 365',
        publisher: 'Microsoft',
        vendorName: 'Microsoft Corp',
        licenseKey: 'XXXX-YYYY-ZZZZ-AAAA',
        licenseCount: 50,
        status: 'AVAILABLE',
        cost: 999.99,
        notes: 'Integration test license',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.licenseName).toBe(`${PREFIX}-Office365`);
    expect(res.body.data.licenseCount).toBe(50);
    expect(res.body.data.status).toBe('AVAILABLE');
    softwareLicenseId = res.body.data.id;
  });

  it('POST /v1/software-licenses 400 on missing licenseName', async () => {
    const res = await getAgent()
      .post('/v1/software-licenses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        softwareName: 'SomeApp',
        vendorName: 'Vendor',
        licenseCount: 10,
        status: 'AVAILABLE',
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /v1/software-licenses 400 on missing softwareName', async () => {
    const res = await getAgent()
      .post('/v1/software-licenses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        licenseName: `${PREFIX}-NoSoftware`,
        vendorName: 'Vendor',
        licenseCount: 10,
        status: 'AVAILABLE',
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /v1/software-licenses 400 on invalid status', async () => {
    const res = await getAgent()
      .post('/v1/software-licenses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        licenseName: `${PREFIX}-BadStatus`,
        softwareName: 'App',
        vendorName: 'Vendor',
        licenseCount: 5,
        status: 'INVALID',
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /v1/software-licenses 400 on licenseCount less than 1', async () => {
    const res = await getAgent()
      .post('/v1/software-licenses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        licenseName: `${PREFIX}-ZeroCount`,
        softwareName: 'App',
        vendorName: 'Vendor',
        licenseCount: 0,
        status: 'AVAILABLE',
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ---- Get by ID ----
  it('GET /v1/software-licenses/:id returns the license', async () => {
    const res = await getAgent()
      .get(`/v1/software-licenses/${softwareLicenseId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(softwareLicenseId);
    expect(res.body.data.licenseName).toBe(`${PREFIX}-Office365`);
  });

  it('GET /v1/software-licenses/:id 404 for unknown ID', async () => {
    const res = await getAgent()
      .get(`/v1/software-licenses/${UNKNOWN_ID}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // ---- Update ----
  it('PUT /v1/software-licenses/:id updates the license', async () => {
    const res = await getAgent()
      .put(`/v1/software-licenses/${softwareLicenseId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ licenseCount: 100, status: 'ALLOCATED', notes: 'Updated notes' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.licenseCount).toBe(100);
    expect(res.body.data.status).toBe('ALLOCATED');
    expect(res.body.data.notes).toBe('Updated notes');
  });

  it('PUT /v1/software-licenses/:id 404 for unknown ID', async () => {
    const res = await getAgent()
      .put(`/v1/software-licenses/${UNKNOWN_ID}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ licenseCount: 5 });
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // ---- Delete ----
  it('DELETE /v1/software-licenses/:id deletes the license', async () => {
    const res = await getAgent()
      .delete(`/v1/software-licenses/${softwareLicenseId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);

    const getRes = await getAgent()
      .get(`/v1/software-licenses/${softwareLicenseId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(404);
  });

  it('DELETE /v1/software-licenses/:id 404 for unknown ID', async () => {
    const res = await getAgent()
      .delete(`/v1/software-licenses/${UNKNOWN_ID}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('OS Licenses', () => {
  let token;
  let osLicenseId;

  beforeAll(async () => {
    token = await getAdminToken();
  });

  afterAll(async () => {
    await prisma.oSLicense.deleteMany({ where: { licenseName: { startsWith: PREFIX } } });
  });

  // ---- List ----
  it('GET /v1/os-licenses returns list', async () => {
    const res = await getAgent()
      .get('/v1/os-licenses')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    const items = res.body.data.data ?? res.body.data;
    expect(Array.isArray(items)).toBe(true);
  });

  it('GET /v1/os-licenses 401 without auth', async () => {
    const res = await getAgent().get('/v1/os-licenses');
    expect(res.status).toBe(401);
  });

  // ---- Create ----
  it('POST /v1/os-licenses creates an OS license', async () => {
    const res = await getAgent()
      .post('/v1/os-licenses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        licenseName: `${PREFIX}-Win11-Pro`,
        osType: 'WINDOWS',
        vendorName: 'Microsoft',
        licenseCount: 25,
        status: 'AVAILABLE',
        licenseKey: 'WIN-KEY-1234',
        cost: '199.99',
        notes: 'Integration test OS license',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.licenseName).toBe(`${PREFIX}-Win11-Pro`);
    expect(res.body.data.licenseCount).toBe(25);
    expect(res.body.data.status).toBe('AVAILABLE');
    osLicenseId = res.body.data.id;
  });

  it('POST /v1/os-licenses 400 on missing licenseName', async () => {
    const res = await getAgent()
      .post('/v1/os-licenses')
      .set('Authorization', `Bearer ${token}`)
      .send({ osType: 'WINDOWS', vendorName: 'Microsoft', licenseCount: 5, status: 'AVAILABLE' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /v1/os-licenses 400 on missing osType', async () => {
    const res = await getAgent()
      .post('/v1/os-licenses')
      .set('Authorization', `Bearer ${token}`)
      .send({ licenseName: `${PREFIX}-NoOS`, vendorName: 'Microsoft', licenseCount: 5, status: 'AVAILABLE' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /v1/os-licenses 400 on invalid status', async () => {
    const res = await getAgent()
      .post('/v1/os-licenses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        licenseName: `${PREFIX}-BadStatus`,
        osType: 'LINUX',
        vendorName: 'Canonical',
        licenseCount: 10,
        status: 'PENDING',
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ---- Get by ID ----
  it('GET /v1/os-licenses/:id returns the OS license', async () => {
    const res = await getAgent()
      .get(`/v1/os-licenses/${osLicenseId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(osLicenseId);
    expect(res.body.data.licenseName).toBe(`${PREFIX}-Win11-Pro`);
  });

  it('GET /v1/os-licenses/:id 404 for unknown ID', async () => {
    const res = await getAgent()
      .get(`/v1/os-licenses/${UNKNOWN_ID}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // ---- Update ----
  it('PUT /v1/os-licenses/:id updates the OS license', async () => {
    const res = await getAgent()
      .put(`/v1/os-licenses/${osLicenseId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ licenseCount: 50, status: 'ALLOCATED' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.licenseCount).toBe(50);
    expect(res.body.data.status).toBe('ALLOCATED');
  });

  it('PUT /v1/os-licenses/:id 404 for unknown ID', async () => {
    const res = await getAgent()
      .put(`/v1/os-licenses/${UNKNOWN_ID}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ licenseCount: 1 });
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // ---- Delete ----
  it('DELETE /v1/os-licenses/:id deletes the OS license', async () => {
    const res = await getAgent()
      .delete(`/v1/os-licenses/${osLicenseId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);

    const getRes = await getAgent()
      .get(`/v1/os-licenses/${osLicenseId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(404);
  });

  it('DELETE /v1/os-licenses/:id 404 for unknown ID', async () => {
    const res = await getAgent()
      .delete(`/v1/os-licenses/${UNKNOWN_ID}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('Software Inventory Import', () => {
  let token;

  beforeAll(async () => {
    token = await getAdminToken();
  });

  describe('POST /v1/software-inventory/import', () => {
    it('returns 401 without auth', async () => {
      const res = await getAgent()
        .post('/v1/software-inventory/import')
        .attach('file', Buffer.from('name,version\nTestApp,1.0'), 'import.csv');
      expect(res.status).toBe(401);
    });

    it('returns 400 when no file is provided', async () => {
      const res = await getAgent()
        .post('/v1/software-inventory/import')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 200 or 400 with a CSV file', async () => {
      const csvContent = 'name,version,publisher\nINTTEST-App,1.0.0,INTTEST-Publisher';
      const res = await getAgent()
        .post('/v1/software-inventory/import')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from(csvContent), 'software-inventory.csv');
      // The endpoint processes CSV - success or validation error are both acceptable
      expect([200, 400]).toContain(res.status);
    });
  });
});

describe('Software Licenses Import', () => {
  let token;

  beforeAll(async () => {
    token = await getAdminToken();
  });

  describe('POST /v1/software-licenses/import', () => {
    it('returns 401 without auth', async () => {
      const res = await getAgent()
        .post('/v1/software-licenses/import')
        .attach('file', Buffer.from('name,version\nTestApp,1.0'), 'import.csv');
      expect(res.status).toBe(401);
    });

    it('returns 400 when no file is provided', async () => {
      const res = await getAgent()
        .post('/v1/software-licenses/import')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 200 or 400 with a CSV file', async () => {
      const csvContent = 'licenseName,softwareName,vendorName,licenseCount,status\nINTTEST-Lic,App,Vendor,10,AVAILABLE';
      const res = await getAgent()
        .post('/v1/software-licenses/import')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from(csvContent), 'software-licenses.csv');
      expect([200, 400]).toContain(res.status);
    });
  });
});

describe('OS Licenses Import', () => {
  let token;

  beforeAll(async () => {
    token = await getAdminToken();
  });

  describe('POST /v1/os-licenses/import', () => {
    it('returns 401 without auth', async () => {
      const res = await getAgent()
        .post('/v1/os-licenses/import')
        .attach('file', Buffer.from('name,version\nTestApp,1.0'), 'import.csv');
      expect(res.status).toBe(401);
    });

    it('returns 400 when no file is provided', async () => {
      const res = await getAgent()
        .post('/v1/os-licenses/import')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 200 or 400 with a CSV file', async () => {
      const csvContent = 'licenseName,osType,vendorName,licenseCount,status\nINTTEST-OSLic,WINDOWS,Microsoft,5,AVAILABLE';
      const res = await getAgent()
        .post('/v1/os-licenses/import')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from(csvContent), 'os-licenses.csv');
      expect([200, 400]).toContain(res.status);
    });
  });
});
