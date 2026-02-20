// @ts-nocheck
/**
 * Integration tests for /v1/reports endpoints
 */
import { getAgent, getAdminToken, prisma } from './test-setup';

describe('Reports API - /v1/reports', () => {
  let adminToken;
  let agent;
  let createdReportId;
  let createdScheduleId;

  beforeAll(async () => {
    agent = getAgent();
    adminToken = await getAdminToken();
  });

  afterAll(async () => {
    if (createdReportId) {
      await prisma.report.deleteMany({ where: { id: createdReportId } }).catch(() => {});
    }
    if (createdScheduleId) {
      await prisma.scheduledReport.deleteMany({ where: { id: createdScheduleId } }).catch(() => {});
    }
    await prisma.report.deleteMany({ where: { name: { startsWith: 'INTTEST-' } } }).catch(() => {});
    await prisma.scheduledReport.deleteMany({ where: { name: { startsWith: 'INTTEST-' } } }).catch(() => {});
  });

  describe('GET /v1/reports/templates', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.get('/v1/reports/templates');
      expect(res.status).toBe(401);
    });

    it('returns available report templates', async () => {
      const res = await agent
        .get('/v1/reports/templates')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /v1/reports', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.get('/v1/reports');
      expect(res.status).toBe(401);
    });

    it('returns paginated list of reports', async () => {
      const res = await agent
        .get('/v1/reports')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // listReports returns paginate() object, sendSuccess wraps it: res.body.data.data is array
      expect(res.body.data).toBeDefined();
    });

    it('supports filtering by type', async () => {
      const res = await agent
        .get('/v1/reports?type=PATCH')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('rejects invalid type', async () => {
      const res = await agent
        .get('/v1/reports?type=INVALID')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /v1/reports', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.post('/v1/reports').send({});
      expect(res.status).toBe(401);
    });

    it('creates a report (step 1 wizard)', async () => {
      const res = await agent
        .post('/v1/reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          step: 1,
          data: {
            type: 'PATCH',
            name: 'INTTEST-Report-Step1',
            description: 'Integration test report',
          },
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Step 1 returns { reportId, availableColumns, availableFilters }
      createdReportId = res.body.data.reportId;
    });

    it('creates a report (simple all-in-one)', async () => {
      const res = await agent
        .post('/v1/reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'INTTEST-Report-Simple',
          type: 'ASSET',
          format: 'PDF',
          description: 'Simple integration test report',
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      // cleanup
      if (res.body.data && res.body.data.id) {
        await prisma.report.deleteMany({ where: { id: res.body.data.id } }).catch(() => {});
      }
    });
  });

  describe('GET /v1/reports/:id', () => {
    it('returns 400 for non-UUID id', async () => {
      const res = await agent
        .get('/v1/reports/not-a-uuid')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 404 for non-existent report', async () => {
      const res = await agent
        .get('/v1/reports/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('returns report by ID', async () => {
      const res = await agent
        .get(`/v1/reports/${createdReportId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdReportId);
    });
  });

  describe('PUT /v1/reports/:id', () => {

    it('returns 404 for non-existent report', async () => {
      const res = await agent
        .put('/v1/reports/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated' });
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('updates a report', async () => {
      const res = await agent
        .put(`/v1/reports/${createdReportId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'INTTEST-Report-Updated', description: 'Updated description' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('INTTEST-Report-Updated');
    });
  });

  describe('GET /v1/reports/:id/download', () => {
    it('returns 404 for non-existent report', async () => {
      const res = await agent
        .get('/v1/reports/00000000-0000-0000-0000-000000000000/download')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('returns appropriate response for report without file', async () => {
      const res = await agent
        .get(`/v1/reports/${createdReportId}/download`)
        .set('Authorization', `Bearer ${adminToken}`);
      // Report exists but has no file generated yet, server returns 404
      expect(res.status).toBe(404);
    });
  });

  describe('POST /v1/reports/:id/regenerate', () => {
    it('returns 404 for non-existent report', async () => {
      const res = await agent
        .post('/v1/reports/00000000-0000-0000-0000-000000000000/regenerate')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('triggers regeneration of a report', async () => {
      const res = await agent
        .post(`/v1/reports/${createdReportId}/regenerate`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect([200, 202]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      }
    });
  });

  describe('DELETE /v1/reports/:id', () => {
    it('returns 404 for non-existent report', async () => {
      const res = await agent
        .delete('/v1/reports/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });

    it('deletes a report', async () => {
      const res = await agent
        .delete(`/v1/reports/${createdReportId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      createdReportId = null;
    });
  });

  // ==================== Schedules ====================

  describe('GET /v1/reports/schedules', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.get('/v1/reports/schedules');
      expect(res.status).toBe(401);
    });

    it('returns list of schedules', async () => {
      const res = await agent
        .get('/v1/reports/schedules')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('POST /v1/reports/schedules', () => {
    it('returns 400 for missing required fields', async () => {
      const res = await agent
        .post('/v1/reports/schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('creates a schedule', async () => {
      const res = await agent
        .post('/v1/reports/schedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'INTTEST-Schedule',
          frequency: 'WEEKLY',
          dayOfWeek: 1,
          time: '08:00',
          recipients: ['test@example.com'],
          enabled: true,
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      createdScheduleId = res.body.data.id;
    });
  });

  describe('PUT /v1/reports/schedules/:id', () => {
    it('returns 400 for non-UUID id', async () => {
      const res = await agent
        .put('/v1/reports/schedules/not-a-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 404 for non-existent schedule', async () => {
      const res = await agent
        .put('/v1/reports/schedules/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated' });
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('updates a schedule', async () => {
      const res = await agent
        .put(`/v1/reports/schedules/${createdScheduleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'INTTEST-Schedule-Updated', enabled: false });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('DELETE /v1/reports/schedules/:id', () => {
    it('returns 404 for non-existent schedule', async () => {
      const res = await agent
        .delete('/v1/reports/schedules/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });

    it('deletes a schedule', async () => {
      const res = await agent
        .delete(`/v1/reports/schedules/${createdScheduleId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      createdScheduleId = null;
    });
  });
});
