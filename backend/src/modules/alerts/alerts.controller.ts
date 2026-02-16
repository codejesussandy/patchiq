import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '@shared/utils';
import { alertsService } from './alerts.service';
import type { ListAlertsQuery, AcknowledgeAlertInput, ResolveAlertInput, BulkAcknowledgeInput, BulkDeleteInput } from './alerts.validators';

export class AlertsController {
  listAlerts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as unknown as ListAlertsQuery;
      const result = await alertsService.listAlerts(query);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  getAlert = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const alert = await alertsService.getAlert(req.params.id);
      sendSuccess(res, alert);
    } catch (error) {
      next(error);
    }
  };

  acknowledgeAlert = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { note } = req.body as AcknowledgeAlertInput;
      const alert = await alertsService.acknowledgeAlert(req.params.id, userId, note);
      sendSuccess(res, alert);
    } catch (error) {
      next(error);
    }
  };

  resolveAlert = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { resolution } = req.body as ResolveAlertInput;
      const alert = await alertsService.resolveAlert(req.params.id, userId, resolution);
      sendSuccess(res, alert);
    } catch (error) {
      next(error);
    }
  };

  bulkAcknowledge = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { ids } = req.body as BulkAcknowledgeInput;
      const result = await alertsService.bulkAcknowledge(ids, userId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  bulkDelete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { ids } = req.body as BulkDeleteInput;
      const result = await alertsService.bulkDelete(ids);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };
}

export const alertsController = new AlertsController();
