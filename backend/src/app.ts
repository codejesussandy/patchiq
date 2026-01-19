import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from '@config/index';
import { errorHandler, notFoundHandler, defaultRateLimiter } from '@middleware/index';
import { authRoutes, userRoutes } from '@modules/auth';
import { agentsRoutes, agentApiRoutes, agentVersionsRoutes } from '@modules/agents';
import { vulnerabilityRoutes } from '@modules/vulnerabilities';
import { assetsRoutes } from '@modules/assets';
import { patchRoutes, deploymentRoutes, patchTestRoutes, zeroTouchConfigRoutes } from '@modules/patches';
import { discoveryRoutes } from '@modules/discovery';
import { jobsRoutes, deploymentPoliciesRoutes } from '@modules/jobs';
import { dashboardRoutes } from '@modules/dashboard';
import { reportsRoutes } from '@modules/reports';
import { settingsRoutes } from '@modules/settings';

export function createApp(): Application {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigin,
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

  // Tags routes (included in assets module)

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
