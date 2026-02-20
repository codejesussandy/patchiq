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

    it('returns fallback response when AI is not configured', async () => {
      const res = await agent
        .post('/v1/ai/chat')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          message: 'What is PatchIQ?',
          conversationHistory: [],
        });
      expect(res.status).toBe(200);
      // Without AI key, the service returns a fallback message
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('AI assistant is not configured');
      expect(res.body.data.model).toBe('fallback');
    });

    it('returns fallback response with valid conversationHistory', async () => {
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
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /v1/ai/health', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.get('/v1/ai/health');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns not_configured health status when AI key is missing', async () => {
      const res = await agent
        .get('/v1/ai/health')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('not_configured');
      expect(res.body.data.configured).toBe(false);
    });
  });
});
