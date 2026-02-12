import { Request, Response, NextFunction } from 'express';
import { sseManager } from '@shared/services/sse.service';
import { sendSuccess, sendError, typedQuery } from '@shared/utils';
import { verifyToken } from '@shared/utils/jwt';
import { notificationsService } from './notifications.service';
import type { ListNotificationsQuery, NotificationHistoryQuery, SseTokenQuery } from './notifications.validators';

export class NotificationsController {
  listNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const params = typedQuery<ListNotificationsQuery>(req);
      const notifications = await notificationsService.getNotifications(userId, params);
      sendSuccess(res, notifications);
    } catch (error) {
      next(error);
    }
  };

  getUnreadCount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const result = await notificationsService.getUnreadCount(userId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  markAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      await notificationsService.markAsRead(userId, req.params.id);
      sendSuccess(res, { success: true });
    } catch (error) {
      next(error);
    }
  };

  markAllAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      await notificationsService.markAllAsRead(userId);
      sendSuccess(res, { success: true });
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
    const { token } = typedQuery<SseTokenQuery>(req);
    if (!token) {
      sendError(res, 401, 'UNAUTHORIZED', 'Token required');
      return;
    }

    let userId: string;
    try {
      const payload = verifyToken(token);
      if (payload.type !== 'access') {
        sendError(res, 401, 'UNAUTHORIZED', 'Invalid token');
        return;
      }
      userId = payload.userId;
    } catch {
      sendError(res, 401, 'UNAUTHORIZED', 'Invalid token');
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
      const params = typedQuery<NotificationHistoryQuery>(req);
      const result = await notificationsService.getHistory(userId, params);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  bulkMarkAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      await notificationsService.bulkMarkAsRead(userId, req.body.ids);
      sendSuccess(res, { success: true });
    } catch (error) {
      next(error);
    }
  };

  bulkDelete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      await notificationsService.bulkDelete(userId, req.body.ids);
      sendSuccess(res, { success: true });
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
      sendSuccess(res, prefs);
    } catch (error) {
      next(error);
    }
  };

  updatePreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      await notificationsService.updatePreferences(userId, req.body);
      const prefs = await notificationsService.getPreferences(userId);
      sendSuccess(res, prefs);
    } catch (error) {
      next(error);
    }
  };
}

export const notificationsController = new NotificationsController();
