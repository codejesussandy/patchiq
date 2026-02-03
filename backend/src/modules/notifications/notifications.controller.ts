import { Request, Response, NextFunction } from 'express';
import { notificationsService } from './notifications.service';
import type { ListNotificationsQuery } from './notifications.validators';

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
}

export const notificationsController = new NotificationsController();
