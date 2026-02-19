// @ts-nocheck
/**
 * Integration tests for /v1/ai endpoints
 * AI chat will likely fail without a real AI key - we test auth, shape, and error handling.
 */
import { getAgent, getAdminToken } from './test-setup';

describe('AI API - /v1/ai', () => {
  let adminToken;
  let agent;

  beforeAll(async () => {
    agent = getAgent();
    adminToken = await getAdminToken();
  });

  describe('POST /v1/ai/chat', () => {
    it('returns 401 without auth', async () => {
      const res = await agent
        .post('/v1/ai/chat')
        .send({ message: 'Hello' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for missing message field', async () => {
      const res = await agent
        .post('/v1/ai/chat')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for empty message string', async () => {
      const res = await agent
        .post('/v1/ai/chat')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ message: '   ' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for message exceeding 4000 chars', async () => {
      const res = await agent
        .post('/v1/ai/chat')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ message: 'a'.repeat(4001) });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for invalid conversationHistory shape', async () => {
      const res = await agent
        .post('/v1/ai/chat')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          message: 'Hello',
          conversationHistory: [{ role: 'invalid-role', content: 'Hi' }],
        });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('accepts valid request shape (may fail on AI key)', async () => {
      const res = await agent
        .post('/v1/ai/chat')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          message: 'What is PatchIQ?',
          conversationHistory: [],
        });
      // Without an AI key the service may return 500/503, but must not be 401/400
      expect([200, 500, 503]).toContain(res.status);
      expect(res.body.success !== undefined).toBe(true);
    });

    it('accepts request with valid conversationHistory', async () => {
      const res = await agent
        .post('/v1/ai/chat')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          message: 'Tell me more',
          conversationHistory: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there!' },
          ],
        });
      // Without AI key may be 500/503
      expect([200, 500, 503]).toContain(res.status);
    });
  });

  describe('GET /v1/ai/health', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.get('/v1/ai/health');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns health status for admin', async () => {
      const res = await agent
        .get('/v1/ai/health')
        .set('Authorization', `Bearer ${adminToken}`);
      // 200 if AI configured, 500/503 if not, but never 401 for admin
      expect([200, 500, 503]).toContain(res.status);
      expect(res.body.success !== undefined).toBe(true);
    });
  });
});
