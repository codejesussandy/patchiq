import 'express-async-errors';
import YAML from 'yaml';
import { auditLoggerMiddleware } from '@middleware/audit-logger';
import { apiReference } from '@scalar/express-api-reference';
import cors from 'cors';
import express, { Application } from 'express';
import helmet from 'helmet';
import { swaggerSpec } from './swagger';
import { agentsRoutes, agentApiRoutes, agentVersionsRoutes } from '@modules/agents';
import { assetsRoutes } from '@modules/assets';
import { authRoutes, userRoutes } from '@modules/auth';
import { dashboardRoutes } from '@modules/dashboard';
import { discoveryRoutes } from '@modules/discovery';
import { hubRoutes } from '@modules/hub';
import { jobsRoutes, deploymentPoliciesRoutes } from '@modules/jobs';
import { notificationsRoutes, notificationsController } from '@modules/notifications';
import { patchRepositoryRoutes } from '@modules/patch-repository';
import { patchTemplateRoutes } from '@modules/patch-templates';
import { patchRoutes, patchTestRoutes, zeroTouchConfigRoutes, assetPatchRecommendationRoutes } from '@modules/patches';
import { deploymentRoutes } from '@modules/deployments';
import { reportsRoutes } from '@modules/reports';
import { settingsRoutes } from '@modules/settings';
import { aiRoutes } from '@modules/ai';
import { alertRoutes } from '@modules/alerts';
import { vulnerabilityRoutes } from '@modules/vulnerabilities';
import cveSyncRoutes from '@modules/vulnerabilities/cve-sync.routes';
import { createLogger } from '@shared/services/logger';
import { config } from '@config/index';
import { errorHandler, notFoundHandler, defaultRateLimiter } from '@middleware/index';
import { authenticate } from '@middleware/auth';
import { requestIdMiddleware } from '@middleware/request-logger';

const logger = createLogger('app');

export function createApp(): Application {
  const app = express();
  app.set('trust proxy', 1);

  // Security middleware - configure CSP to allow Scalar API docs
  app.use(
    helmet({
      contentSecurityPolicy: config.isDevelopment
        ? false // Disable CSP in dev to allow Scalar to load
        : undefined,
    })
  );
  app.use(
    cors({
      // In development, allow all origins. In production, use configured origin
      origin: config.isDevelopment ? true : config.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Agent-Id', 'X-Agent-Version'],
    })
  );

  // Request ID middleware (early, before everything else that logs)
  app.use(requestIdMiddleware);
  app.use(auditLoggerMiddleware);

  // Rate limiting
  app.use(defaultRateLimiter);

  // Parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: config.nodeEnv,
    });
  });

  // API version info
  app.get(`/${config.apiVersion}`, (_req, res) => {
    res.json({
      message: 'PatchIQ API',
      version: config.apiVersion,
      documentation: '/api-docs',
    });
  });

  // OpenAPI spec endpoint - auto-generated from route annotations
  app.get('/openapi.yaml', (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${config.port}`;
    const serverUrl = `${protocol}://${host}`;

    const spec = { ...swaggerSpec, servers: [{ url: serverUrl, description: 'Current Server' }] };
    res.type('text/yaml').send(YAML.stringify(spec));
  });

  // Also serve as JSON for programmatic access
  app.get('/openapi.json', (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${config.port}`;
    const serverUrl = `${protocol}://${host}`;

    const spec = { ...swaggerSpec, servers: [{ url: serverUrl, description: 'Current Server' }] };
    res.json(spec);
  });

  // Scalar API Documentation
  app.use(
    '/api-docs',
    apiReference({
      spec: {
        url: '/openapi.yaml',
      },
      theme: 'purple',
      layout: 'modern',
      darkMode: true,
      metaData: {
        title: 'PatchIQ API Documentation',
      },
    })
  );

  // ============================================
  // API Routes - Will be added by other modules
  // ============================================

  // Auth routes
  app.use(`/${config.apiVersion}/auth`, authRoutes);

  // User routes
  app.use(`/${config.apiVersion}/user`, userRoutes);

  // Agents routes (frontend)
  app.use(`/${config.apiVersion}/agents`, agentsRoutes);

  // Agent versions routes (frontend)
  app.use(`/${config.apiVersion}/agent-versions`, agentVersionsRoutes);

  // Agent API routes (for agents to communicate)
  app.use('/api/agent', agentApiRoutes);

  // Public package file download proxy (for agents to download exe/msi installers from MinIO)
  app.get(`/${config.apiVersion}/packages/:packageId/download`, (req, res, next) => {
    logger.info({ packageId: req.params.packageId }, 'Public package file download request');
    import('@modules/hub/hub.service').then(({ hubService }) => {
      const { packageId } = req.params;
      return hubService.getPackageFileStream(packageId).then(({ stream, fileName, fileSize, checksum }) => {
        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        const contentTypes: Record<string, string> = {
          exe: 'application/x-msdownload', msi: 'application/x-msi',
          dmg: 'application/x-apple-diskimage', pkg: 'application/x-newton-compatible-pkg',
          deb: 'application/x-debian-package', rpm: 'application/x-rpm',
        };
        res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        if (fileSize) res.setHeader('Content-Length', fileSize.toString());
        if (checksum) res.setHeader('X-Checksum-SHA256', checksum);
        stream.pipe(res);
      });
    }).catch(next);
  });

  // Public bundle download endpoint (must be before assets routes which have global auth)
  app.get(`/${config.apiVersion}/bundles/:packageId/download`, (req, res, next) => {
    logger.info({ packageId: req.params.packageId }, 'Public bundle download request');
    import('@modules/hub/hub.service').then(({ hubService }) => {
      const { packageId } = req.params;
      return hubService.getBundleStream(packageId).then((stream) => {
        res.setHeader('Content-Type', 'application/gzip');
        res.setHeader('Content-Disposition', `attachment; filename="${packageId}-bundle.tar.gz"`);
        stream.pipe(res);
      });
    }).catch(next);
  });

  // Public patch bundle stream (for agents to download installers without auth)
  app.get(`/${config.apiVersion}/patches/:id/bundle/stream`, (req, res, next) => {
    logger.info({ patchId: req.params.id }, 'Patch bundle download request');
    import('@modules/patches/patches.service').then(({ getPatchBundleByPatchId }) => {
      return getPatchBundleByPatchId(req.params.id).then(async (bundle) => {
        if (!bundle?.bundleObjectKey) {
          res.status(404).json({ error: 'No downloadable bundle for this patch' });
          return;
        }
        const { minioStorage } = await import('@shared/services/minio.service');
        const stream = await minioStorage.downloadStream(bundle.bundleObjectKey);
        const filename = bundle.bundleObjectKey.split('/').pop() || 'patch-bundle';
        const ext = filename.split('.').pop()?.toLowerCase() || '';
        const contentTypes: Record<string, string> = {
          exe: 'application/x-msdownload', msi: 'application/x-msi',
          deb: 'application/x-debian-package', rpm: 'application/x-rpm',
          dmg: 'application/x-apple-diskimage', pkg: 'application/x-newton-compatible-pkg',
        };
        res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        stream.pipe(res);
      });
    }).catch(next);
  });

  // SSE stream — mounted before assets routes (which have global authenticate)
  // EventSource can't send headers, so SSE uses query-param token auth
  app.get(`/${config.apiVersion}/notifications/stream`, notificationsController.sseStream);

  // Assets module routes (includes assets, categories, subcategories, tags, licenses)
  app.use(`/${config.apiVersion}`, assetsRoutes);

  // Patches routes
  app.use(`/${config.apiVersion}/patches`, patchRoutes);

  // Deployments routes
  app.use(`/${config.apiVersion}/deployments`, deploymentRoutes);

  // Patch recommendations routes
  app.use(`/${config.apiVersion}/patch-recommendations`, assetPatchRecommendationRoutes);

  // Patch tests routes
  app.use(`/${config.apiVersion}/patch-tests`, patchTestRoutes);

  // Zero touch configs routes
  app.use(`/${config.apiVersion}/zero-touch-configs`, zeroTouchConfigRoutes);

  // Vulnerabilities routes
  app.use(`/${config.apiVersion}/vulnerabilities`, vulnerabilityRoutes);

  // CVE Sync routes
  app.use(`/${config.apiVersion}/vulnerabilities/sync`, cveSyncRoutes);

  // Jobs routes
  app.use(`/${config.apiVersion}/jobs`, jobsRoutes);

  // Deployment policies routes
  app.use(`/${config.apiVersion}/deployment-policies`, deploymentPoliciesRoutes);

  // Discovery routes
  app.use(`/${config.apiVersion}/discovery`, discoveryRoutes);

  // Dashboard routes
  app.use(`/${config.apiVersion}/dashboard`, dashboardRoutes);

  // Reports routes
  app.use(`/${config.apiVersion}/reports`, reportsRoutes);

  // Settings routes
  app.use(`/${config.apiVersion}/settings`, settingsRoutes);

  // AI routes
  app.use(`/${config.apiVersion}/ai`, aiRoutes);

  // Patch Repository routes (Central patch storage with MinIO)
  app.use(`/${config.apiVersion}/patch-repository`, patchRepositoryRoutes);

  // Patch Template routes (Software catalog with vendor API fetching)
  app.use(`/${config.apiVersion}/patch-templates`, patchTemplateRoutes);

  // Hub routes (Software package repository with MinIO)
  app.use(`/${config.apiVersion}/hub`, hubRoutes);

  // Notifications routes
  app.use(`/${config.apiVersion}/notifications`, notificationsRoutes);

  // Alerts routes (cross-asset alert management)
  app.use(`/${config.apiVersion}/alerts`, authenticate, alertRoutes);

  // Tags routes (included in assets module)

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
