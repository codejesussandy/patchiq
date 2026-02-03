import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { apiReference } from '@scalar/express-api-reference';
import { config } from '@config/index';
import { errorHandler, notFoundHandler, defaultRateLimiter } from '@middleware/index';
import { authRoutes, userRoutes } from '@modules/auth';
import { agentsRoutes, agentApiRoutes, agentVersionsRoutes } from '@modules/agents';
import { vulnerabilityRoutes } from '@modules/vulnerabilities';
import cveSyncRoutes from '@modules/vulnerabilities/cve-sync.routes';
import { assetsRoutes } from '@modules/assets';
import { patchRoutes, deploymentRoutes, patchTestRoutes, zeroTouchConfigRoutes } from '@modules/patches';
import { discoveryRoutes } from '@modules/discovery';
import { jobsRoutes, deploymentPoliciesRoutes } from '@modules/jobs';
import { dashboardRoutes } from '@modules/dashboard';
import { reportsRoutes } from '@modules/reports';
import { settingsRoutes } from '@modules/settings';
import { patchRepositoryRoutes } from '@modules/patch-repository';
import { hubRoutes } from '@modules/hub';
import { notificationsRoutes } from '@modules/notifications';

export function createApp(): Application {
  const app = express();

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

  // Rate limiting
  app.use(defaultRateLimiter);

  // Parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Logging (skip in test environment)
  if (!config.isTest) {
    app.use(morgan(config.isDevelopment ? 'dev' : 'combined'));
  }

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

  // OpenAPI spec endpoint
  app.get('/openapi.yaml', (_req, res) => {
    const specPath = path.join(__dirname, 'openapi.yaml');
    if (fs.existsSync(specPath)) {
      res.type('text/yaml').sendFile(specPath);
    } else {
      res.status(404).json({ error: 'OpenAPI spec not found' });
    }
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

  // Public bundle download endpoint (must be before assets routes which have global auth)
  app.get(`/${config.apiVersion}/bundles/:packageId/download`, (req, res, next) => {
    console.log(`[BUNDLE] Public download request for package: ${req.params.packageId}`);
    import('@modules/hub/hub.service').then(({ hubService }) => {
      const { packageId } = req.params;
      return hubService.getBundleStream(packageId).then((stream) => {
        res.setHeader('Content-Type', 'application/gzip');
        res.setHeader('Content-Disposition', `attachment; filename="${packageId}-bundle.tar.gz"`);
        stream.pipe(res);
      });
    }).catch(next);
  });

  // Assets module routes (includes assets, categories, subcategories, tags, licenses)
  app.use(`/${config.apiVersion}`, assetsRoutes);

  // Patches routes
  app.use(`/${config.apiVersion}/patches`, patchRoutes);

  // Deployments routes
  app.use(`/${config.apiVersion}/deployments`, deploymentRoutes);

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

  // Patch Repository routes (Central patch storage with MinIO)
  app.use(`/${config.apiVersion}/patch-repository`, patchRepositoryRoutes);

  // Hub routes (Software package repository with MinIO)
  app.use(`/${config.apiVersion}/hub`, hubRoutes);

  // Notifications routes
  app.use(`/${config.apiVersion}/notifications`, notificationsRoutes);

  // Tags routes (included in assets module)

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
