import { prisma } from '@/db/client';
import { NotFoundError, BadRequestError } from '@shared/errors';
import { paginate, getPaginationParams } from '@shared/utils/pagination';
import type { Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import type {
  Report,
  ReportTemplate,
  ReportType,
  ReportFormat,
  ReportFilters,
  ReportSchedule,
  REPORT_COLUMNS,
  REPORT_FILTERS,
} from './reports.types';
import type {
  ListReportsQuery,
  SimpleCreateReportBody,
  UpdateReportBody,
  ListSchedulesQuery,
  CreateScheduleBody,
  UpdateScheduleBody,
} from './reports.validators';

// Reports directory
const REPORTS_DIR = process.env.REPORTS_DIR || path.join(process.cwd(), 'reports');

// Content types for different formats
const CONTENT_TYPES: Record<ReportFormat, string> = {
  PDF: 'application/pdf',
  CSV: 'text/csv',
  Excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

// File extensions
const FILE_EXTENSIONS: Record<ReportFormat, string> = {
  PDF: 'pdf',
  CSV: 'csv',
  Excel: 'xlsx',
};

export class ReportsService {
  /**
   * List reports with filters and pagination
   */
  async listReports(params: ListReportsQuery) {
    const where: Prisma.ReportWhereInput = {};

    if (params.type) {
      where.type = params.type;
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { type: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const paginationParams = { page: params.page, limit: params.limit };

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...getPaginationParams(paginationParams),
      }),
      prisma.report.count({ where }),
    ]);

    return paginate(
      reports.map((r) => this.transformReport(r)),
      total,
      paginationParams
    );
  }

  /**
   * Get report by ID
   */
  async getReportById(id: string): Promise<Report> {
    const report = await prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    return this.transformReport(report);
  }

  /**
   * Create a new report
   */
  async createReport(data: SimpleCreateReportBody, userId?: string): Promise<Report> {
    const report = await prisma.report.create({
      data: {
        name: data.name,
        type: data.type,
        format: data.format,
        status: 'draft',
        parameters: {
          filters: data.filters || {},
          columns: data.columns || [],
          schedule: data.schedule,
        } as Prisma.InputJsonValue,
        createdBy: userId,
      },
    });

    // Start report generation asynchronously
    this.generateReport(report.id).catch((err) => {
      console.error(`Failed to generate report ${report.id}:`, err);
    });

    return this.transformReport(report);
  }

  /**
   * Create report step 1 - Select type and name
   */
  async createReportStep1(data: { type: ReportType; name: string; description?: string }, userId?: string) {
    const report = await prisma.report.create({
      data: {
        name: data.name,
        type: data.type,
        format: 'CSV', // Default, will be updated in step 3
        status: 'draft',
        parameters: {
          description: data.description,
        },
        createdBy: userId,
      },
    });

    // Import column and filter definitions
    const { REPORT_COLUMNS, REPORT_FILTERS } = await import('./reports.types');

    return {
      reportId: report.id,
      availableColumns: REPORT_COLUMNS[data.type as keyof typeof REPORT_COLUMNS] || [],
      availableFilters: REPORT_FILTERS[data.type as keyof typeof REPORT_FILTERS] || [],
    };
  }

  /**
   * Create report step 2 - Configure filters and columns
   */
  async createReportStep2(reportId: string, data: { filters?: ReportFilters; columns?: string[] }) {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    const currentParams = (report.parameters as Record<string, unknown>) || {};

    await prisma.report.update({
      where: { id: reportId },
      data: {
        parameters: {
          ...currentParams,
          filters: data.filters || {},
          columns: data.columns || [],
        } as Prisma.InputJsonValue,
      },
    });

    // Get preview data
    const preview = await this.getReportPreview(reportId, data.filters || {}, 5);

    return {
      reportId,
      preview,
    };
  }

  /**
   * Create report step 3 - Set format and schedule
   */
  async createReportStep3(
    reportId: string,
    data: { format: ReportFormat; schedule?: ReportSchedule }
  ) {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    const currentParams = (report.parameters as Record<string, unknown>) || {};

    const updatedReport = await prisma.report.update({
      where: { id: reportId },
      data: {
        format: data.format,
        status: 'generating',
        parameters: {
          ...currentParams,
          schedule: data.schedule,
        } as Prisma.InputJsonValue,
      },
    });

    // Create schedule if enabled
    if (data.schedule?.enabled) {
      await this.createScheduleForReport(reportId, data.schedule);
    }

    // Start report generation
    this.generateReport(reportId).catch((err) => {
      console.error(`Failed to generate report ${reportId}:`, err);
    });

    return {
      id: reportId,
      name: report.name,
      status: 'generating',
      message: 'Report generation started',
    };
  }

  /**
   * Update an existing report
   */
  async updateReport(id: string, data: UpdateReportBody, userId?: string): Promise<Report> {
    const report = await prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    const currentParams = (report.parameters as Record<string, unknown>) || {};

    const updatedReport = await prisma.report.update({
      where: { id },
      data: {
        name: data.name,
        parameters: {
          ...currentParams,
          description: data.description !== undefined ? data.description : currentParams.description,
          filters: data.filters !== undefined ? data.filters : currentParams.filters,
          columns: data.columns !== undefined ? data.columns : currentParams.columns,
          schedule: data.schedule !== undefined ? data.schedule : currentParams.schedule,
        } as Prisma.InputJsonValue,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        resource: 'Report',
        resourceId: id,
        details: data as Prisma.InputJsonValue,
      },
    });

    return this.transformReport(updatedReport);
  }

  /**
   * Delete a report
   */
  async deleteReport(id: string, userId?: string): Promise<{ message: string }> {
    const report = await prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    // Delete file if exists
    if (report.filePath) {
      const fullPath = path.join(REPORTS_DIR, report.filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    await prisma.report.delete({
      where: { id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE',
        resource: 'Report',
        resourceId: id,
        details: { name: report.name },
      },
    });

    return { message: 'Report deleted successfully' };
  }

  /**
   * Download a generated report
   */
  async downloadReport(id: string): Promise<{
    path: string;
    filename: string;
    contentType: string;
  }> {
    const report = await prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    if (report.status === 'generating') {
      throw new BadRequestError('Report is still generating');
    }

    if (report.status === 'failed') {
      throw new BadRequestError('Report generation failed');
    }

    if (!report.filePath) {
      throw new NotFoundError('Report file not found');
    }

    const fullPath = path.join(REPORTS_DIR, report.filePath);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundError('Report file not found on disk');
    }

    const format = report.format as ReportFormat;
    const extension = FILE_EXTENSIONS[format] || 'csv';

    return {
      path: fullPath,
      filename: `${report.name.replace(/[^a-zA-Z0-9]/g, '_')}.${extension}`,
      contentType: CONTENT_TYPES[format] || 'application/octet-stream',
    };
  }

  /**
   * Regenerate a report
   */
  async regenerateReport(id: string): Promise<Report> {
    const report = await prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    if (report.status === 'generating') {
      throw new BadRequestError('Report is already generating');
    }

    // Delete old file if exists
    if (report.filePath) {
      const fullPath = path.join(REPORTS_DIR, report.filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    // Update status to generating
    await prisma.report.update({
      where: { id },
      data: {
        status: 'generating',
        filePath: null,
        fileSize: null,
        generatedAt: null,
      },
    });

    // Trigger async generation
    this.generateReport(id).catch((error) => {
      console.error('Report regeneration failed:', error);
    });

    // Return updated report
    const updatedReport = await prisma.report.findUnique({
      where: { id },
    });

    return this.transformReport(updatedReport!);
  }

  /**
   * Get available report templates
   */
  async getTemplates(): Promise<ReportTemplate[]> {
    const { REPORT_COLUMNS, REPORT_FILTERS } = await import('./reports.types');

    const templates: ReportTemplate[] = [
      {
        id: 'patch-template',
        name: 'Patch Status Report',
        type: 'patch',
        description: 'Comprehensive report of patch status across all endpoints',
        availableColumns: REPORT_COLUMNS.patch,
        defaultColumns: ['patchId', 'software', 'severity', 'status', 'installedEndpoints'],
        availableFilters: REPORT_FILTERS.patch,
      },
      {
        id: 'asset-template',
        name: 'Asset Inventory Report',
        type: 'asset',
        description: 'Complete inventory of all managed assets',
        availableColumns: REPORT_COLUMNS.asset,
        defaultColumns: ['name', 'category', 'status', 'osType', 'ipAddress'],
        availableFilters: REPORT_FILTERS.asset,
      },
      {
        id: 'vulnerability-template',
        name: 'Vulnerability Assessment Report',
        type: 'vulnerability',
        description: 'Detailed vulnerability analysis across the environment',
        availableColumns: REPORT_COLUMNS.vulnerability,
        defaultColumns: ['cve', 'severity', 'cvss3BaseScore', 'endpoints', 'published'],
        availableFilters: REPORT_FILTERS.vulnerability,
      },
      {
        id: 'compliance-template',
        name: 'Compliance Status Report',
        type: 'compliance',
        description: 'Compliance posture summary for all assets',
        availableColumns: REPORT_COLUMNS.compliance,
        defaultColumns: ['assetName', 'complianceScore', 'patchesInstalled', 'criticalVulnerabilities'],
        availableFilters: REPORT_FILTERS.compliance,
      },
      {
        id: 'audit-template',
        name: 'Audit Trail Report',
        type: 'audit',
        description: 'Complete audit trail of system activities',
        availableColumns: REPORT_COLUMNS.audit,
        defaultColumns: ['timestamp', 'module', 'operation', 'user', 'status'],
        availableFilters: REPORT_FILTERS.audit,
      },
    ];

    return templates;
  }

  // ==================== Schedules ====================

  /**
   * List report schedules
   */
  async listSchedules(params: ListSchedulesQuery) {
    const paginationParams = { page: params.page, limit: params.limit };

    const [schedules, total] = await Promise.all([
      prisma.scheduledReport.findMany({
        orderBy: { createdAt: 'desc' },
        ...getPaginationParams(paginationParams),
      }),
      prisma.scheduledReport.count(),
    ]);

    return paginate(schedules, total, paginationParams);
  }

  /**
   * Create a report schedule
   */
  async createSchedule(data: CreateScheduleBody, userId?: string) {
    const nextRunAt = this.calculateNextRun(data.frequency, data.time, data.dayOfWeek, data.dayOfMonth);

    const schedule = await prisma.scheduledReport.create({
      data: {
        name: data.name,
        type: 'custom', // Will be linked to report
        format: 'CSV',
        frequency: data.frequency,
        parameters: {
          time: data.time,
          dayOfWeek: data.dayOfWeek,
          dayOfMonth: data.dayOfMonth,
        },
        recipients: data.recipients,
        isActive: data.enabled,
        nextRunAt,
        createdBy: userId,
      },
    });

    return schedule;
  }

  /**
   * Update a schedule
   */
  async updateSchedule(id: string, data: UpdateScheduleBody, userId?: string) {
    const schedule = await prisma.scheduledReport.findUnique({
      where: { id },
    });

    if (!schedule) {
      throw new NotFoundError('Schedule not found');
    }

    const currentParams = (schedule.parameters as Record<string, unknown>) || {};
    const frequency = data.frequency || schedule.frequency;
    const time = data.time || (currentParams.time as string);
    const dayOfWeek = data.dayOfWeek ?? (currentParams.dayOfWeek as number);
    const dayOfMonth = data.dayOfMonth ?? (currentParams.dayOfMonth as number);

    const nextRunAt = this.calculateNextRun(frequency, time, dayOfWeek, dayOfMonth);

    const updatedSchedule = await prisma.scheduledReport.update({
      where: { id },
      data: {
        name: data.name,
        frequency: data.frequency,
        parameters: {
          ...currentParams,
          time: data.time !== undefined ? data.time : currentParams.time,
          dayOfWeek: data.dayOfWeek !== undefined ? data.dayOfWeek : currentParams.dayOfWeek,
          dayOfMonth: data.dayOfMonth !== undefined ? data.dayOfMonth : currentParams.dayOfMonth,
        } as Prisma.InputJsonValue,
        recipients: data.recipients,
        isActive: data.enabled,
        nextRunAt,
      },
    });

    return updatedSchedule;
  }

  /**
   * Delete a schedule
   */
  async deleteSchedule(id: string, userId?: string): Promise<{ message: string }> {
    const schedule = await prisma.scheduledReport.findUnique({
      where: { id },
    });

    if (!schedule) {
      throw new NotFoundError('Schedule not found');
    }

    await prisma.scheduledReport.delete({
      where: { id },
    });

    return { message: 'Schedule deleted successfully' };
  }

  // ==================== Private Methods ====================

  /**
   * Generate report file
   */
  private async generateReport(reportId: string): Promise<void> {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) return;

    try {
      // Update status to generating
      await prisma.report.update({
        where: { id: reportId },
        data: { status: 'generating' },
      });

      const params = (report.parameters as Record<string, unknown>) || {};
      const filters = (params.filters as ReportFilters) || {};
      const columns = (params.columns as string[]) || [];

      // Fetch data based on report type
      const data = await this.getReportData(report.type as ReportType, filters);

      // Generate file based on format
      let filePath: string;
      switch (report.format) {
        case 'CSV':
          filePath = await this.generateCsvReport(report, data, columns);
          break;
        case 'Excel':
          filePath = await this.generateExcelReport(report, data, columns);
          break;
        case 'PDF':
          filePath = await this.generatePdfReport(report, data, columns);
          break;
        default:
          filePath = await this.generateCsvReport(report, data, columns);
      }

      // Update report with file path
      const fileStats = fs.statSync(path.join(REPORTS_DIR, filePath));
      await prisma.report.update({
        where: { id: reportId },
        data: {
          status: 'completed',
          filePath,
          fileSize: BigInt(fileStats.size),
          generatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error(`Report generation failed for ${reportId}:`, error);
      await prisma.report.update({
        where: { id: reportId },
        data: {
          status: 'failed',
        },
      });
    }
  }

  /**
   * Get report data based on type
   */
  private async getReportData(type: ReportType, filters: ReportFilters): Promise<unknown[]> {
    switch (type) {
      case 'patch':
        return this.getPatchReportData(filters);
      case 'asset':
        return this.getAssetReportData(filters);
      case 'vulnerability':
        return this.getVulnerabilityReportData(filters);
      case 'audit':
        return this.getAuditReportData(filters);
      case 'compliance':
        return this.getComplianceReportData(filters);
      default:
        return [];
    }
  }

  private async getPatchReportData(filters: ReportFilters): Promise<unknown[]> {
    const where: Prisma.PatchWhereInput = {};

    if (filters.severity?.length) {
      where.severity = { in: filters.severity };
    }
    if (filters.status?.length) {
      where.approvalStatus = { in: filters.status };
    }

    return prisma.patch.findMany({
      where,
      take: 10000,
    });
  }

  private async getAssetReportData(filters: ReportFilters): Promise<unknown[]> {
    const where: Prisma.AssetWhereInput = {};

    if (filters.status?.length) {
      where.status = { in: filters.status };
    }
    if (filters.category?.length) {
      where.type = { in: filters.category };
    }

    return prisma.asset.findMany({
      where,
      take: 10000,
    });
  }

  private async getVulnerabilityReportData(filters: ReportFilters): Promise<unknown[]> {
    const where: Prisma.VulnerabilityWhereInput = {};

    if (filters.severity?.length) {
      where.severity = { in: filters.severity };
    }

    return prisma.vulnerability.findMany({
      where,
      include: {
        affectedAssets: { select: { id: true } },
        affectedSoftware: { select: { id: true } },
      },
      take: 10000,
    });
  }

  private async getAuditReportData(filters: ReportFilters): Promise<unknown[]> {
    const where: Prisma.AuditLogWhereInput = {};

    if (filters.dateRange) {
      where.timestamp = {
        gte: new Date(filters.dateRange.start),
        lte: new Date(filters.dateRange.end),
      };
    }

    return prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { timestamp: 'desc' },
      take: 10000,
    });
  }

  private async getComplianceReportData(filters: ReportFilters): Promise<unknown[]> {
    return prisma.asset.findMany({
      include: {
        vulnerabilities: {
          include: { vulnerability: { select: { severity: true } } },
        },
        patchTasks: { select: { status: true } },
      },
      take: 10000,
    });
  }

  /**
   * Generate CSV report
   */
  private async generateCsvReport(
    report: { id: string; name: string },
    data: unknown[],
    columns: string[]
  ): Promise<string> {
    // Ensure reports directory exists
    fs.mkdirSync(REPORTS_DIR, { recursive: true });

    const headers = columns.length > 0 ? columns : Object.keys((data[0] as Record<string, unknown>) || {});

    // UTF-8 BOM for Excel compatibility
    const bom = '\ufeff';
    const headerRow = headers.join(',');

    const rows = data.map((row) => {
      const record = row as Record<string, unknown>;
      return headers
        .map((h) => {
          const value = record[h];
          if (value === null || value === undefined) return '';
          const str = String(value);
          // Escape quotes and wrap in quotes if contains comma or quote
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',');
    });

    const csv = bom + [headerRow, ...rows].join('\n');
    const filename = `${report.id}.csv`;
    const filePath = path.join(REPORTS_DIR, filename);

    fs.writeFileSync(filePath, csv, 'utf-8');

    return filename;
  }

  /**
   * Generate Excel report using ExcelJS
   */
  private async generateExcelReport(
    report: { id: string; name: string },
    data: unknown[],
    columns: string[]
  ): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PatchIQ';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(report.name.substring(0, 31)); // Sheet name max 31 chars

    // Set up columns with headers
    worksheet.columns = columns.map((col) => ({
      header: col.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()),
      key: col,
      width: 15,
    }));

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Add data rows
    data.forEach((record: any) => {
      const row: Record<string, unknown> = {};
      columns.forEach((col) => {
        row[col] = record[col] ?? '';
      });
      worksheet.addRow(row);
    });

    // Auto-filter on header row
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columns.length },
    };

    const filename = `${report.id}.xlsx`;
    const filePath = path.join(REPORTS_DIR, filename);

    await workbook.xlsx.writeFile(filePath);

    return filename;
  }

  /**
   * Generate PDF report using pdfkit
   */
  private async generatePdfReport(
    report: { id: string; name: string },
    data: unknown[],
    columns: string[]
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const filename = `${report.id}.pdf`;
      const filePath = path.join(REPORTS_DIR, filename);
      const writeStream = fs.createWriteStream(filePath);

      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 50,
      });

      doc.pipe(writeStream);

      // Title
      doc.fontSize(20).font('Helvetica-Bold').text(report.name, { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toISOString()}`, { align: 'center' });
      doc.moveDown(2);

      // Table configuration
      const pageWidth = doc.page.width - 100; // Account for margins
      const columnWidth = Math.min(120, pageWidth / columns.length);
      const rowHeight = 20;
      const headerHeight = 25;
      let yPosition = doc.y;
      const startX = 50;

      // Format column headers
      const headers = columns.map((col) =>
        col.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())
      );

      // Draw header row
      doc.font('Helvetica-Bold').fontSize(9);
      doc.fillColor('#333333');

      // Header background
      doc.rect(startX, yPosition, columnWidth * columns.length, headerHeight)
        .fill('#E0E0E0');

      doc.fillColor('#000000');
      headers.forEach((header, i) => {
        doc.text(
          header.substring(0, 15), // Truncate long headers
          startX + i * columnWidth + 5,
          yPosition + 7,
          { width: columnWidth - 10, lineBreak: false }
        );
      });

      yPosition += headerHeight;

      // Draw data rows
      doc.font('Helvetica').fontSize(8);
      let rowCount = 0;
      const maxRowsPerPage = Math.floor((doc.page.height - yPosition - 50) / rowHeight);

      data.forEach((record: any, index) => {
        // Check if we need a new page
        if (rowCount >= maxRowsPerPage) {
          doc.addPage();
          yPosition = 50;
          rowCount = 0;

          // Redraw headers on new page
          doc.font('Helvetica-Bold').fontSize(9);
          doc.rect(startX, yPosition, columnWidth * columns.length, headerHeight)
            .fill('#E0E0E0');
          doc.fillColor('#000000');
          headers.forEach((header, i) => {
            doc.text(
              header.substring(0, 15),
              startX + i * columnWidth + 5,
              yPosition + 7,
              { width: columnWidth - 10, lineBreak: false }
            );
          });
          yPosition += headerHeight;
          doc.font('Helvetica').fontSize(8);
        }

        // Alternate row background
        if (index % 2 === 1) {
          doc.rect(startX, yPosition, columnWidth * columns.length, rowHeight)
            .fill('#F8F8F8');
          doc.fillColor('#000000');
        }

        // Draw row data
        columns.forEach((col, i) => {
          const value = String(record[col] ?? '').substring(0, 20); // Truncate long values
          doc.text(
            value,
            startX + i * columnWidth + 5,
            yPosition + 5,
            { width: columnWidth - 10, lineBreak: false }
          );
        });

        yPosition += rowHeight;
        rowCount++;
      });

      // Footer with row count
      doc.moveDown(2);
      doc.fontSize(10).text(`Total Records: ${data.length}`, { align: 'right' });

      doc.end();

      writeStream.on('finish', () => resolve(filename));
      writeStream.on('error', reject);
    });
  }

  /**
   * Get report preview data
   */
  private async getReportPreview(
    reportId: string,
    filters: ReportFilters,
    limit: number = 5
  ): Promise<{ rowCount: number; sampleData: unknown[] }> {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    const allData = await this.getReportData(report.type as ReportType, filters);

    return {
      rowCount: allData.length,
      sampleData: allData.slice(0, limit),
    };
  }

  /**
   * Create schedule for a report
   */
  private async createScheduleForReport(reportId: string, schedule: ReportSchedule): Promise<void> {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) return;

    const nextRunAt = this.calculateNextRun(
      schedule.frequency,
      schedule.time,
      schedule.dayOfWeek,
      schedule.dayOfMonth
    );

    await prisma.scheduledReport.create({
      data: {
        name: `${report.name} - Scheduled`,
        type: report.type,
        format: report.format,
        frequency: schedule.frequency,
        parameters: {
          reportId,
          filters: (report.parameters as Record<string, unknown>)?.filters,
          columns: (report.parameters as Record<string, unknown>)?.columns,
        } as Prisma.InputJsonValue,
        recipients: schedule.recipients,
        isActive: schedule.enabled,
        nextRunAt,
        createdBy: report.createdBy,
      },
    });
  }

  /**
   * Calculate next run time for scheduled reports
   */
  private calculateNextRun(
    frequency: string,
    time?: string,
    dayOfWeek?: number,
    dayOfMonth?: number
  ): Date {
    const now = new Date();
    const [hours, minutes] = (time || '00:00').split(':').map(Number);

    switch (frequency) {
      case 'daily':
        const nextDaily = new Date(now);
        nextDaily.setHours(hours, minutes, 0, 0);
        if (nextDaily <= now) {
          nextDaily.setDate(nextDaily.getDate() + 1);
        }
        return nextDaily;

      case 'weekly':
        const nextWeekly = new Date(now);
        nextWeekly.setHours(hours, minutes, 0, 0);
        const targetDay = dayOfWeek ?? 1; // Monday default
        const daysUntilTarget = (targetDay - now.getDay() + 7) % 7 || 7;
        nextWeekly.setDate(nextWeekly.getDate() + daysUntilTarget);
        return nextWeekly;

      case 'monthly':
        const nextMonthly = new Date(now);
        nextMonthly.setHours(hours, minutes, 0, 0);
        const targetDate = dayOfMonth ?? 1;
        nextMonthly.setDate(targetDate);
        if (nextMonthly <= now) {
          nextMonthly.setMonth(nextMonthly.getMonth() + 1);
        }
        return nextMonthly;

      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Transform prisma report to API response
   */
  private transformReport(report: {
    id: string;
    name: string;
    type: string;
    format: string;
    status: string;
    parameters: unknown;
    filePath: string | null;
    fileSize: bigint | null;
    generatedAt: Date | null;
    createdBy: string | null;
    createdAt: Date;
  }): Report {
    const params = (report.parameters as Record<string, unknown>) || {};

    return {
      id: report.id,
      name: report.name,
      description: params.description as string | undefined,
      type: report.type as ReportType,
      format: report.format as ReportFormat,
      status: report.status as Report['status'],
      filters: params.filters as ReportFilters | undefined,
      columns: params.columns as string[] | undefined,
      schedule: params.schedule as ReportSchedule | undefined,
      fileUrl: report.filePath ? `/v1/reports/${report.id}/download` : undefined,
      generatedAt: report.generatedAt?.toISOString(),
      createdBy: report.createdBy || 'System',
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.createdAt.toISOString(),
    };
  }
}

export const reportsService = new ReportsService();
