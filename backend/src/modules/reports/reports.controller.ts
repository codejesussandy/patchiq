import { RequestHandler } from 'express';
import * as fs from 'fs';
import { reportsService } from './reports.service';
import type {
  ListReportsQuery,
  SimpleCreateReportBody,
  CreateReportBody,
  UpdateReportBody,
  ListSchedulesQuery,
  CreateScheduleBody,
  UpdateScheduleBody,
} from './reports.validators';

/**
 * List reports
 * GET /v1/reports
 */
export const listReports: RequestHandler = async (req, res, next) => {
  try {
    const query = req.query as unknown as ListReportsQuery;
    const result = await reportsService.listReports(query);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get report by ID
 * GET /v1/reports/:id
 */
export const getReportById: RequestHandler = async (req, res, next) => {
  try {
    const result = await reportsService.getReportById(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Create report (wizard or simple)
 * POST /v1/reports
 */
export const createReport: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const body = req.body as CreateReportBody | SimpleCreateReportBody;

    // Check if this is a wizard step or simple creation
    if ('step' in body) {
      // Wizard mode
      switch (body.step) {
        case 1:
          const step1Result = await reportsService.createReportStep1(body.data, userId);
          res.json(step1Result);
          break;
        case 2:
          const step2Result = await reportsService.createReportStep2(body.reportId, body.data);
          res.json(step2Result);
          break;
        case 3:
          const step3Result = await reportsService.createReportStep3(body.reportId, body.data);
          res.status(201).json(step3Result);
          break;
      }
    } else {
      // Simple creation mode
      const result = await reportsService.createReport(body, userId);
      res.status(201).json(result);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Update report
 * PUT /v1/reports/:id
 */
export const updateReport: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const body = req.body as UpdateReportBody;
    const result = await reportsService.updateReport(req.params.id, body, userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete report
 * DELETE /v1/reports/:id
 */
export const deleteReport: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const result = await reportsService.deleteReport(req.params.id, userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Download report file
 * GET /v1/reports/:id/download
 */
export const downloadReport: RequestHandler = async (req, res, next) => {
  try {
    const { path: filePath, filename, contentType } = await reportsService.downloadReport(
      req.params.id
    );

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

/**
 * Regenerate report
 * POST /v1/reports/:id/regenerate
 */
export const regenerateReport: RequestHandler = async (req, res, next) => {
  try {
    const result = await reportsService.regenerateReport(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Send report via email
 * POST /v1/reports/:id/send
 */
export const sendReport: RequestHandler = async (req, res, next) => {
  try {
    const { recipients, subject, message, format } = req.body;

    // Validate recipients
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'At least one recipient is required' });
    }

    // Get report to verify it exists and is completed
    const report = await reportsService.getReportById(req.params.id);

    if (report.status !== 'completed') {
      return res.status(400).json({ error: 'Report must be completed before sending' });
    }

    // TODO: Implement actual email sending with nodemailer
    // For now, return a mock success response
    console.log(`[MOCK] Sending report ${report.name} to ${recipients.join(', ')}`);

    res.json({
      success: true,
      message: `Report will be sent to ${recipients.length} recipient(s). (Email service not configured)`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get report templates
 * GET /v1/reports/templates
 */
export const getTemplates: RequestHandler = async (_req, res, next) => {
  try {
    const result = await reportsService.getTemplates();
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
};

// ==================== Schedules ====================

/**
 * List schedules
 * GET /v1/reports/schedules
 */
export const listSchedules: RequestHandler = async (req, res, next) => {
  try {
    const query = req.query as unknown as ListSchedulesQuery;
    const result = await reportsService.listSchedules(query);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Create schedule
 * POST /v1/reports/schedules
 */
export const createSchedule: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const body = req.body as CreateScheduleBody;
    const result = await reportsService.createSchedule(body, userId);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Update schedule
 * PUT /v1/reports/schedules/:id
 */
export const updateSchedule: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const body = req.body as UpdateScheduleBody;
    const result = await reportsService.updateSchedule(req.params.id, body, userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete schedule
 * DELETE /v1/reports/schedules/:id
 */
export const deleteSchedule: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const result = await reportsService.deleteSchedule(req.params.id, userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
