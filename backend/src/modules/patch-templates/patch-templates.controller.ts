import { Request, Response, NextFunction } from 'express';
import { createLogger } from '@shared/services/logger';
import { sendSuccess, sendError, typedQuery } from '@shared/utils';
import { SOFTWARE_CATALOG } from './catalog';
import { syncSingleTemplate } from './catalog-sync.service';
import type { GetLatestVersionQuery } from './patch-templates.validators';
import { fetchLatestVersion } from './vendor-fetchers';

const logger = createLogger('patch-templates');

export class PatchTemplatesController {
  /**
   * GET /v1/patch-templates
   * List all available software templates
   */
  listTemplates = async (_req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const templates = SOFTWARE_CATALOG.map((t) => ({
      id: t.id,
      name: t.name,
      vendor: t.vendor,
      product: t.product,
      category: t.category,
      supportedOs: t.supportedOs,
      defaultSeverity: t.defaultSeverity,
      defaultCategory: t.defaultCategory,
      description: t.description,
      referenceUrl: t.referenceUrl,
    }));
    sendSuccess(res, templates);
  };

  /**
   * GET /v1/patch-templates/:id/latest?os=Windows&arch=x64
   * Fetch the latest version from the vendor API and return pre-filled patch fields
   */
  getLatestVersion = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const template = SOFTWARE_CATALOG.find((t) => t.id === req.params.id);
      if (!template) {
        sendError(res, 404, 'NOT_FOUND', 'Template not found');
        return;
      }

      const { os, arch } = typedQuery<GetLatestVersionQuery>(req);

      const result = await fetchLatestVersion(template, os, arch);

      // Return data shaped for the patch creation form
      sendSuccess(res, {
        // Pre-filled patch fields
        software: `${template.name} ${result.latestVersion}`,
        title: `${template.name} ${result.latestVersion} Update (${os})`,
        vendor: template.vendor,
        product: template.product,
        os,
        architecture: result.architecture || arch,
        downloadUrl: result.downloadUrl,
        referenceUrl: template.referenceUrl,
        severity: template.defaultSeverity,
        category: template.defaultCategory,
        releaseDate: result.releaseDate,
        // Vendor data for reference
        vendorData: {
          version: result.latestVersion,
          fileName: result.fileName,
          checksumSha256: result.checksumSha256,
          fileSize: result.fileSize,
          releaseNotes: result.releaseNotes,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ templateId: req.params.id, error: message }, 'Failed to fetch latest version');
      sendError(res, 502, 'VENDOR_FETCH_ERROR', `Failed to fetch latest version: ${message}`);
    }
  };

  /**
   * POST /v1/patch-templates/sync
   * Download software from vendor CDNs and add to Hub
   * Body: { templateIds?: string[], os?: string, arch?: string, force?: boolean }
   */
  syncToHub = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const { templateIds, os, arch, force } = req.body;
      const userId = req.user?.id;

      res.writeHead(200, {
        'Content-Type': 'application/x-ndjson',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      });

      // If syncing specific templates, do them and stream results
      if (templateIds && templateIds.length > 0) {
        for (const id of templateIds) {
          const tmpl = SOFTWARE_CATALOG.find((t) => t.id === id);
          if (!tmpl) {
            res.write(JSON.stringify({ templateId: id, status: 'FAILED', error: 'Template not found' }) + '\n');
            continue;
          }
          const result = await syncSingleTemplate(tmpl, os || 'Windows', arch || 'x64', force, userId);
          res.write(JSON.stringify(result) + '\n');
        }
      } else {
        // Sync all compatible templates
        const templatesToSync = SOFTWARE_CATALOG.filter((t) =>
          t.supportedOs.some((o) => o.toLowerCase() === (os || 'Windows').toLowerCase())
        );
        for (const tmpl of templatesToSync) {
          const result = await syncSingleTemplate(tmpl, os || 'Windows', arch || 'x64', force, userId);
          res.write(JSON.stringify(result) + '\n');
        }
      }

      res.end();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ error: message }, 'Catalog sync failed');
      if (!res.headersSent) {
        sendError(res, 500, 'SYNC_FAILED', message);
      } else {
        res.write(JSON.stringify({ status: 'error', error: message }) + '\n');
        res.end();
      }
    }
  };

  /**
   * POST /v1/patch-templates/:id/sync
   * Download a single software and add to Hub
   * Body: { os?: string, arch?: string, force?: boolean }
   */
  syncOneToHub = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    try {
      const template = SOFTWARE_CATALOG.find((t) => t.id === req.params.id);
      if (!template) {
        sendError(res, 404, 'NOT_FOUND', 'Template not found');
        return;
      }

      const { os: targetOs = 'Windows', arch = 'x64', force = false } = req.body;
      const userId = req.user?.id;

      const result = await syncSingleTemplate(template, targetOs, arch, force, userId);
      sendSuccess(res, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ templateId: req.params.id, error: message }, 'Single template sync failed');
      sendError(res, 500, 'SYNC_FAILED', message);
    }
  };
}
