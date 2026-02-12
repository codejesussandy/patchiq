import { Router } from 'express';
import { authenticate, requireUser } from '@middleware/auth';
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

// All routes require authentication
router.use(authenticate);
router.use(requireUser);

// ============================================
// Templates (must be before :id routes)
// ============================================

// GET /v1/reports/templates - Get available report templates
router.get('/templates', controller.getTemplates);

// ============================================
// Schedules
// ============================================

// GET /v1/reports/schedules - List report schedules
router.get('/schedules', validateQuery(listSchedulesQuerySchema), controller.listSchedules);

// POST /v1/reports/schedules - Create schedule
router.post('/schedules', validateBody(createScheduleBodySchema), controller.createSchedule);

// PUT /v1/reports/schedules/:id - Update schedule
router.put(
  '/schedules/:id',
  validateParams(scheduleParamsSchema),
  validateBody(updateScheduleBodySchema),
  controller.updateSchedule
);

// DELETE /v1/reports/schedules/:id - Delete schedule
router.delete('/schedules/:id', validateParams(scheduleParamsSchema), controller.deleteSchedule);

// ============================================
// Reports CRUD
// ============================================

// GET /v1/reports - List reports
router.get('/', validateQuery(listReportsQuerySchema), controller.listReports);

// POST /v1/reports - Create report (wizard or simple)
router.post('/', controller.createReport);

// GET /v1/reports/:id - Get report by ID
router.get('/:id', validateParams(reportParamsSchema), controller.getReportById);

// PUT /v1/reports/:id - Update report
router.put(
  '/:id',
  validateParams(reportParamsSchema),
  validateBody(updateReportBodySchema),
  controller.updateReport
);

// DELETE /v1/reports/:id - Delete report
router.delete('/:id', validateParams(reportParamsSchema), controller.deleteReport);

// GET /v1/reports/:id/download - Download report file
router.get('/:id/download', validateParams(reportParamsSchema), controller.downloadReport);

// POST /v1/reports/:id/regenerate - Regenerate report
router.post('/:id/regenerate', validateParams(reportParamsSchema), controller.regenerateReport);

// POST /v1/reports/:id/send - Send report via email
router.post('/:id/send', validateParams(reportParamsSchema), validateBody(sendReportBodySchema), controller.sendReport);

export default router;
