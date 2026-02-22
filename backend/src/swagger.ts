import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.1.0',
    info: {
      title: 'PatchIQ API',
      description: `PatchIQ - Enterprise Patch Management System API

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
\`\`\`
Authorization: Bearer <access_token>
\`\`\`

## Agent API
The Agent API (\`/api/agent/*\`) is used by PatchIQ agents to communicate with the backend.
These endpoints use agent-specific authentication via X-Agent-Id and X-Agent-Version headers.`,
      version: '1.0.0',
      contact: {
        name: 'PatchIQ Support',
        email: 'support@patchiq.io',
      },
      license: {
        name: 'Proprietary',
      },
    },
    servers: [
      { url: 'http://localhost:3007', description: 'Local Development' },
      { url: 'https://api.patchiq.io', description: 'Production' },
    ],
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'User', description: 'Current user management' },
      { name: 'Assets', description: 'Asset management' },
      { name: 'Categories', description: 'Asset category management' },
      { name: 'Tags', description: 'Asset tag management' },
      { name: 'Software Inventory', description: 'Software inventory management' },
      { name: 'Software Licenses', description: 'Software license management' },
      { name: 'OS Licenses', description: 'OS license management' },
      { name: 'Agents', description: 'Agent management (frontend)' },
      { name: 'Agent API', description: 'Agent communication endpoints' },
      { name: 'Agent Versions', description: 'Agent version management' },
      { name: 'Patches', description: 'Patch management' },
      { name: 'Patch Tests', description: 'Patch testing workflow' },
      { name: 'Zero Touch', description: 'Zero-touch deployment configurations' },
      { name: 'Patch Recommendations', description: 'AI-powered patch recommendations' },
      { name: 'Patch Repository', description: 'Central patch storage and downloads' },
      { name: 'Patch Templates', description: 'Software catalog with vendor API fetching' },
      { name: 'Deployments', description: 'Deployment management' },
      { name: 'Deployment Policies', description: 'Deployment policy management' },
      { name: 'Vulnerabilities', description: 'Vulnerability tracking' },
      { name: 'CVE Sync', description: 'CVE database synchronization' },
      { name: 'Jobs', description: 'Job queue management' },
      { name: 'Hub', description: 'Software package repository' },
      { name: 'Discovery', description: 'Network discovery' },
      { name: 'Dashboard', description: 'Dashboard statistics' },
      { name: 'Reports', description: 'Report generation' },
      { name: 'Settings', description: 'System settings' },
      { name: 'Notifications', description: 'Notification management' },
      { name: 'Alerts', description: 'Alert management' },
      { name: 'AI', description: 'AI chat assistant' },
      { name: 'Health', description: 'System health checks' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token from /v1/auth/login',
        },
        agentAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Agent-Id',
          description: 'Agent identifier for agent API endpoints',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'array', items: {} },
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
          },
        },
      },
    },
  },
  apis: [
    path.join(__dirname, 'modules/**/*.routes.ts'),
    path.join(__dirname, 'modules/**/*.routes.js'),
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
