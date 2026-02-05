import { z } from 'zod';

// Query schema for list endpoint
export const listAgentsQuerySchema = z.object({
  status: z.enum(['Connected', 'Disconnected', 'Pending', 'Error']).optional(),
  os: z.enum(['Windows', 'MacOS', 'Linux']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(20),
});

// Agent registration schema
export const registerAgentSchema = z.object({
  machineId: z.string().min(1),
  hostname: z.string().min(1),
  os: z.enum(['Windows', 'MacOS', 'Linux']),
  osVersion: z.string(),
  osBuild: z.string().optional(),
  architecture: z.string(),
  agentVersion: z.string(),
  serialNumber: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  ipAddress: z.string().ip().optional(),
  macAddress: z.string().optional(),
  timezone: z.string().optional(),
  locale: z.string().optional(),
});

// Heartbeat schema
export const heartbeatSchema = z.object({
  timestamp: z.string().datetime(),
  status: z.enum(['healthy', 'degraded', 'error']),
  uptime: z.number(),
  agentUptime: z.number(),
  cpuUsage: z.number().min(0).max(100),
  memoryUsage: z.number().min(0).max(100),
  diskUsage: z.number().min(0).max(100),
  pendingReboot: z.boolean(),
  ipAddress: z.string().optional(),
  lastError: z.string().nullable().optional(),
});

// Command result schema
export const commandResultSchema = z.object({
  status: z.enum(['completed', 'failed']),
  result: z.string().optional(),
  errorMessage: z.string().optional(),
  output: z.string().optional(),
});

// Inventory schema
export const inventorySchema = z.object({
  collectedAt: z.string().datetime(),
  hardware: z.object({}).passthrough().optional(),
  software: z.object({}).passthrough().optional(),
  network: z.object({}).passthrough().optional(),
  security: z.object({}).passthrough().optional(),
  peripherals: z.object({}).passthrough().optional(),
});

// Telemetry schema - use passthrough to preserve all fields from agent
export const telemetrySchema = z.object({
  collectedAt: z.string().datetime(),
  cpu: z.object({}).passthrough().optional(),
  memory: z.object({}).passthrough().optional(),
  disk: z.object({}).passthrough().optional(),
  network: z.object({}).passthrough().optional(),
  processes: z.object({}).passthrough().optional(),
  systemUptime: z.object({}).passthrough().optional(),
  thermal: z.object({}).passthrough().optional(),
  power: z.object({}).passthrough().optional(),
  agentUtilization: z.object({}).passthrough().optional(),
  systemErrors: z.object({}).passthrough().optional(),
}).passthrough();

// Type exports
export type ListAgentsQuery = z.infer<typeof listAgentsQuerySchema>;
export type RegisterAgentInput = z.infer<typeof registerAgentSchema>;
export type HeartbeatInput = z.infer<typeof heartbeatSchema>;
export type CommandResultInput = z.infer<typeof commandResultSchema>;
export type InventoryInput = z.infer<typeof inventorySchema>;
export type TelemetryInput = z.infer<typeof telemetrySchema>;
