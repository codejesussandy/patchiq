// @ts-nocheck
/**
 * Integration tests for /v1/patch-templates endpoints
 */
import { getAgent, getAdminToken } from './test-setup';

describe('Patch Templates API - /v1/patch-templates', () => {
  let adminToken;
  let agent;
  let firstTemplateId;

  beforeAll(async () => {
    agent = getAgent();
    adminToken = await getAdminToken();
  });

  describe('GET /v1/patch-templates', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.get('/v1/patch-templates');
      expect(res.status).toBe(401);
    });

    it('returns list of patch templates', async () => {
      const res = await agent
        .get('/v1/patch-templates')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      if (res.body.data.length > 0) {
        firstTemplateId = res.body.data[0].id;
      }
    });

    it('returns templates with expected shape when data exists', async () => {
      const res = await agent
        .get('/v1/patch-templates')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      if (res.body.data.length > 0) {
        const template = res.body.data[0];
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
      }
    });
  });

  describe('GET /v1/patch-templates/:id/latest', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.get('/v1/patch-templates/some-id/latest');
      expect(res.status).toBe(401);
    });

    it('returns 404 for non-existent template', async () => {
      const res = await agent
        .get('/v1/patch-templates/nonexistent-template-id/latest')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('returns latest version if templates exist', async () => {
      expect(firstTemplateId).toBeDefined();
      const res = await agent
        .get(`/v1/patch-templates/${firstTemplateId}/latest`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('accepts platform query param', async () => {
      expect(firstTemplateId).toBeDefined();
      const res = await agent
        .get(`/v1/patch-templates/${firstTemplateId}/latest?platform=WINDOWS`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });
  });
});
