import { Request, Response, NextFunction } from 'express';
import { notificationsService } from './notifications.service';
import { sseManager } from '@shared/services/sse.service';
import { verifyToken } from '@shared/utils/jwt';
import type { ListNotificationsQuery, NotificationHistoryQuery } from './notifications.validators';

export class NotificationsController {
  listNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const params = req.query as unknown as ListNotificationsQuery;
      const notifications = await notificationsService.getNotifications(userId, params);
      res.json(notifications);
    } catch (error) {
      next(error);
    }
  };

  getUnreadCount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const result = await notificationsService.getUnreadCount(userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  markAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      await notificationsService.markAsRead(userId, req.params.id);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  };

  markAllAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      await notificationsService.markAllAsRead(userId);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  };

  deleteNotification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      await notificationsService.deleteNotification(userId, req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  clearAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      await notificationsService.clearAll(userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  // ============================================
  // SSE Stream
  // ============================================

  sseStream = async (req: Request, res: Response): Promise<void> => {
    // Auth via query param (EventSource can't send headers)
    const token = req.query.token as string;
    if (!token) {
      res.status(401).json({ error: 'Token required' });
      return;
    }

    let userId: string;
    try {
      const payload = verifyToken(token);
      if (payload.type !== 'access') {
        res.status(401).json({ error: 'Invalid token' });
        return;
      }
      userId = payload.userId;
    } catch {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    // SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // nginx: don't buffer SSE
    });

    // Initial connected event
    res.write('data: {"type":"connected"}\n\n');

    // Keepalive every 30s
    const keepAlive = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 30_000);

    sseManager.addClient(userId, res);

    req.on('close', () => {
      clearInterval(keepAlive);
    });
  };

  // ============================================
  // History + Bulk
  // ============================================

  getHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const params = req.query as unknown as NotificationHistoryQuery;
      const result = await notificationsService.getHistory(userId, params);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  bulkMarkAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      await notificationsService.bulkMarkAsRead(userId, req.body.ids);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  };

  bulkDelete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      await notificationsService.bulkDelete(userId, req.body.ids);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  };

  // ============================================
  // Preferences
  // ============================================

  getPreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const prefs = await notificationsService.getPreferences(userId);
      res.json(prefs);
    } catch (error) {
      next(error);
    }
  };

  updatePreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      await notificationsService.updatePreferences(userId, req.body);
      const prefs = await notificationsService.getPreferences(userId);
      res.json(prefs);
    } catch (error) {
      next(error);
    }
  };
}

export const notificationsController = new NotificationsController();
