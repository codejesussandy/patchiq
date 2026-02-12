import { z } from 'zod';

// Report types enum
const reportTypeEnum = z.enum(['PATCH', 'ASSET', 'VULNERABILITY', 'COMPLIANCE', 'AUDIT', 'CUSTOM']);
const reportFormatEnum = z.enum(['PDF', 'CSV', 'XLSX']);
const reportStatusEnum = z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']);
const frequencyEnum = z.enum(['DAILY', 'WEEKLY', 'MONTHLY']);

// List reports query params
export const listReportsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: reportTypeEnum.optional(),
  status: reportStatusEnum.optional(),
  search: z.string().optional(),
});

export type ListReportsQuery = z.infer<typeof listReportsQuerySchema>;

// Report ID params
export const reportParamsSchema = z.object({
  id: z.string().uuid(),
});

export type ReportParams = z.infer<typeof reportParamsSchema>;

// Report filters schema
const reportFiltersSchema = z
  .object({
    dateRange: z
      .object({
        start: z.string(),
        end: z.string(),
      })
      .optional(),
    severity: z.array(z.string()).optional(),
    status: z.array(z.string()).optional(),
    category: z.array(z.string()).optional(),
  })
  .passthrough();

// Schedule schema
const scheduleSchema = z.object({
  enabled: z.boolean(),
  frequency: frequencyEnum,
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(), // HH:mm format
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  recipients: z.array(z.string().email()),
});

// Step 1: Create report - select type
export const createReportStep1BodySchema = z.object({
  step: z.literal(1),
  data: z.object({
    type: reportTypeEnum,
    name: z.string().min(1).max(255),
    description: z.string().optional(),
  }),
});

export type CreateReportStep1Body = z.infer<typeof createReportStep1BodySchema>;

// Step 2: Configure filters and columns
export const createReportStep2BodySchema = z.object({
  step: z.literal(2),
  reportId: z.string().uuid(),
  data: z.object({
    filters: reportFiltersSchema.optional(),
    columns: z.array(z.string()).optional(),
  }),
});

export type CreateReportStep2Body = z.infer<typeof createReportStep2BodySchema>;

// Step 3: Format and schedule
export const createReportStep3BodySchema = z.object({
  step: z.literal(3),
  reportId: z.string().uuid(),
  data: z.object({
    format: reportFormatEnum,
    schedule: scheduleSchema.optional(),
  }),
});

export type CreateReportStep3Body = z.infer<typeof createReportStep3BodySchema>;

// Combined create report body (for wizard)
export const createReportBodySchema = z.discriminatedUnion('step', [
  createReportStep1BodySchema,
  createReportStep2BodySchema,
  createReportStep3BodySchema,
]);

export type CreateReportBody = z.infer<typeof createReportBodySchema>;

// Simple create report (all-in-one)
export const simpleCreateReportBodySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  type: reportTypeEnum,
  format: reportFormatEnum,
  filters: reportFiltersSchema.optional(),
  columns: z.array(z.string()).optional(),
  schedule: scheduleSchema.optional(),
});

export type SimpleCreateReportBody = z.infer<typeof simpleCreateReportBodySchema>;

// Update report
export const updateReportBodySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  filters: reportFiltersSchema.optional(),
  columns: z.array(z.string()).optional(),
  schedule: scheduleSchema.optional(),
});

export type UpdateReportBody = z.infer<typeof updateReportBodySchema>;

// Send report via email
export const sendReportBodySchema = z.object({
  recipients: z.array(z.string().email()).min(1, 'At least one recipient is required'),
  subject: z.string().optional(),
  message: z.string().optional(),
  format: reportFormatEnum.optional(),
});

export type SendReportBody = z.infer<typeof sendReportBodySchema>;

// ==================== Schedules ====================

// List schedules query params
export const listSchedulesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListSchedulesQuery = z.infer<typeof listSchedulesQuerySchema>;

// Schedule ID params
export const scheduleParamsSchema = z.object({
  id: z.string().uuid(),
});

export type ScheduleParams = z.infer<typeof scheduleParamsSchema>;

// Create schedule
export const createScheduleBodySchema = z.object({
  name: z.string().min(1).max(255),
  reportId: z.string().uuid().optional(),
  frequency: frequencyEnum,
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  recipients: z.array(z.string().email()),
  enabled: z.boolean().default(true),
});

export type CreateScheduleBody = z.infer<typeof createScheduleBodySchema>;

// Update schedule
export const updateScheduleBodySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  frequency: frequencyEnum.optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  recipients: z.array(z.string().email()).optional(),
  enabled: z.boolean().optional(),
});

export type UpdateScheduleBody = z.infer<typeof updateScheduleBodySchema>;
