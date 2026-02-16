import { Router } from 'express';
import { authenticate } from '@middleware/auth';
import { audit, AuditAction, AuditResource } from '@middleware/audit';
import { checkPermission } from '@middleware/rbac';
import { validateQuery, validateParams, validateBody } from '@middleware/validation';
import * as controller from './reports.controller';
import {
  listReportsQuerySchema,
  reportParamsSchema,
  updateReportBodySchema,
  sendReportBodySchema,
  listSchedulesQuerySchema,
  scheduleParamsSchema,
  createScheduleBodySchema,
  updateScheduleBodySchema,
} from './reports.validators';

const router = Router();

// All routes require authentication + RBAC permission checks
router.use(authenticate);

// ============================================
// Templates (must be before :id routes)
// ============================================

// GET /v1/reports/templates - Get available report templates
router.get('/templates', checkPermission('reports', 'view'), controller.getTemplates);

// ============================================
// Schedules
// ============================================

// GET /v1/reports/schedules - List report schedules
router.get('/schedules', checkPermission('reports', 'view'), validateQuery(listSchedulesQuerySchema), controller.listSchedules);

// POST /v1/reports/schedules - Create schedule
router.post('/schedules', checkPermission('reports', 'add'), validateBody(createScheduleBodySchema), audit({ action: AuditAction.CREATE, resource: AuditResource.REPORT_SCHEDULE }), controller.createSchedule);

// PUT /v1/reports/schedules/:id - Update schedule
router.put(
  '/schedules/:id',
  checkPermission('reports', 'edit'),
  validateParams(scheduleParamsSchema),
  validateBody(updateScheduleBodySchema),
  audit({ action: AuditAction.UPDATE, resource: AuditResource.REPORT_SCHEDULE, getResourceId: (req) => req.params.id }),
  controller.updateSchedule
);

// DELETE /v1/reports/schedules/:id - Delete schedule
router.delete('/schedules/:id', checkPermission('reports', 'delete'), validateParams(scheduleParamsSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.REPORT_SCHEDULE, getResourceId: (req) => req.params.id }), controller.deleteSchedule);

// ============================================
// Reports CRUD
// ============================================

// GET /v1/reports - List reports
router.get('/', checkPermission('reports', 'view'), validateQuery(listReportsQuerySchema), controller.listReports);

// POST /v1/reports - Create report (wizard or simple)
router.post('/', checkPermission('reports', 'add'), audit({ action: AuditAction.CREATE, resource: AuditResource.REPORT }), controller.createReport);

// GET /v1/reports/:id - Get report by ID
router.get('/:id', checkPermission('reports', 'view'), validateParams(reportParamsSchema), controller.getReportById);

// PUT /v1/reports/:id - Update report
router.put(
  '/:id',
  checkPermission('reports', 'edit'),
  validateParams(reportParamsSchema),
  validateBody(updateReportBodySchema),
  audit({ action: AuditAction.UPDATE, resource: AuditResource.REPORT, getResourceId: (req) => req.params.id }),
  controller.updateReport
);

// DELETE /v1/reports/:id - Delete report
router.delete('/:id', checkPermission('reports', 'delete'), validateParams(reportParamsSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.REPORT, getResourceId: (req) => req.params.id }), controller.deleteReport);

// GET /v1/reports/:id/download - Download report file
router.get('/:id/download', checkPermission('reports', 'view'), validateParams(reportParamsSchema), controller.downloadReport);

// POST /v1/reports/:id/regenerate - Regenerate report
router.post('/:id/regenerate', checkPermission('reports', 'edit'), validateParams(reportParamsSchema), audit({ action: AuditAction.REFRESH, resource: AuditResource.REPORT, getResourceId: (req) => req.params.id }), controller.regenerateReport);

// POST /v1/reports/:id/send - Send report via email
router.post('/:id/send', checkPermission('reports', 'edit'), validateParams(reportParamsSchema), validateBody(sendReportBodySchema), audit({ action: AuditAction.SEND, resource: AuditResource.REPORT, getResourceId: (req) => req.params.id }), controller.sendReport);

export default router;
