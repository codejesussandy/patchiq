// @ts-nocheck
/**
 * Integration tests for /v1/notifications endpoints
 * SSE stream test is skipped (hard to test via supertest).
 */
import { getAgent, getAdminToken, prisma } from './test-setup';

describe('Notifications API - /v1/notifications', () => {
  let adminToken;
  let agent;
  let createdNotificationId;

  beforeAll(async () => {
    agent = getAgent();
    adminToken = await getAdminToken();

    // Create a test notification directly via prisma
    const admin = await prisma.user.findFirst({ where: { email: 'admin@patchiq.io' } });
    if (admin) {
      const notif = await prisma.notification.create({
        data: {
          userId: admin.id,
          title: 'INTTEST-Notification',
          message: 'Integration test notification',
          type: 'INFO',
          category: 'SYSTEM',
          read: false,
        },
      });
      createdNotificationId = notif.id;
    }
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({
      where: {
        OR: [
          { title: { startsWith: 'INTTEST-' } },
          { id: createdNotificationId ?? '' },
        ],
      },
    }).catch(() => {});
  });

  describe('GET /v1/notifications', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.get('/v1/notifications');
      expect(res.status).toBe(401);
    });

    it('returns list of notifications', async () => {
      const res = await agent
        .get('/v1/notifications')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('filters by read=false', async () => {
      const res = await agent
        .get('/v1/notifications?read=false')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('filters by type=INFO', async () => {
      const res = await agent
        .get('/v1/notifications?type=INFO')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('rejects invalid type', async () => {
      const res = await agent
        .get('/v1/notifications?type=BADTYPE')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /v1/notifications/unread-count', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.get('/v1/notifications/unread-count');
      expect(res.status).toBe(401);
    });

    it('returns unread count', async () => {
      const res = await agent
        .get('/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(typeof res.body.data.count).toBe('number');
    });
  });

  describe('GET /v1/notifications/history', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.get('/v1/notifications/history');
      expect(res.status).toBe(401);
    });

    it('returns notification history', async () => {
      const res = await agent
        .get('/v1/notifications/history')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('accepts sortBy and sortOrder params', async () => {
      const res = await agent
        .get('/v1/notifications/history?sortBy=createdAt&sortOrder=asc')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('PUT /v1/notifications/mark-all-read', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.put('/v1/notifications/mark-all-read');
      expect(res.status).toBe(401);
    });

    it('marks all notifications as read', async () => {
      const res = await agent
        .put('/v1/notifications/mark-all-read')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Verify DB state - the test notification should be marked as read
      expect(createdNotificationId).toBeDefined();
      const dbNotif = await prisma.notification.findUnique({ where: { id: createdNotificationId } });
      expect(dbNotif).not.toBeNull();
      expect(dbNotif.read).toBe(true);
    });
  });

  describe('PUT /v1/notifications/:id/read', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.put(`/v1/notifications/${createdNotificationId}/read`);
      expect(res.status).toBe(401);
    });

    it('returns 400 for non-UUID id', async () => {
      const res = await agent
        .put('/v1/notifications/not-a-uuid/read')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 404 for non-existent notification', async () => {
      const res = await agent
        .put('/v1/notifications/00000000-0000-0000-0000-000000000000/read')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('marks a notification as read', async () => {
      const res = await agent
        .put(`/v1/notifications/${createdNotificationId}/read`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Verify DB state
      const dbNotif = await prisma.notification.findUnique({ where: { id: createdNotificationId } });
      expect(dbNotif).not.toBeNull();
      expect(dbNotif!.read).toBe(true);
    });
  });

  describe('PUT /v1/notifications/bulk-read', () => {
    it('returns 400 for missing ids', async () => {
      const res = await agent
        .put('/v1/notifications/bulk-read')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('bulk marks notifications as read', async () => {
      const res = await agent
        .put('/v1/notifications/bulk-read')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: [createdNotificationId] });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /v1/notifications/preferences', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.get('/v1/notifications/preferences');
      expect(res.status).toBe(401);
    });

    it('returns notification preferences', async () => {
      const res = await agent
        .get('/v1/notifications/preferences')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('PUT /v1/notifications/preferences', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.put('/v1/notifications/preferences');
      expect(res.status).toBe(401);
    });

    it('returns 400 for unknown preference keys', async () => {
      const res = await agent
        .put('/v1/notifications/preferences')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ smsNotification: true });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('updates notification preferences', async () => {
      const res = await agent
        .put('/v1/notifications/preferences')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ agentInApp: true, deploymentEmail: false });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('DELETE /v1/notifications/:id', () => {
    it('returns 400 for non-UUID id', async () => {
      const res = await agent
        .delete('/v1/notifications/not-a-uuid')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 404 for non-existent notification', async () => {
      const res = await agent
        .delete('/v1/notifications/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('deletes a notification', async () => {
      const res = await agent
        .delete(`/v1/notifications/${createdNotificationId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(204);
      // Verify DB state
      const dbNotif = await prisma.notification.findUnique({ where: { id: createdNotificationId } });
      expect(dbNotif).toBeNull();
      createdNotificationId = null;
    });
  });

  describe('DELETE /v1/notifications/bulk', () => {
    it('returns 400 for missing ids', async () => {
      const res = await agent
        .delete('/v1/notifications/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('bulk deletes notifications with empty valid ids array', async () => {
      // Create a notification to delete
      const admin = await prisma.user.findFirst({ where: { email: 'admin@patchiq.io' } });
      const notif = await prisma.notification.create({
        data: {
          userId: admin.id,
          title: 'INTTEST-BulkDelete',
          message: 'For bulk delete test',
          type: 'INFO',
          category: 'SYSTEM',
          read: false,
        },
      });
      const res = await agent
        .delete('/v1/notifications/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: [notif.id] });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('DELETE /v1/notifications (clear all)', () => {
    it('returns 401 without auth', async () => {
      const res = await agent.delete('/v1/notifications');
      expect(res.status).toBe(401);
    });

    it('clears all notifications', async () => {
      const res = await agent
        .delete('/v1/notifications')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(204);
    });
  });
});
