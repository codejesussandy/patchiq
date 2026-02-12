import { z } from 'zod';

export const agentItemSchema = z.object({
  id: z.string(),
  machineId: z.string(),
  name: z.string().nullable(),
  status: z.string(),
  os: z.string().nullable(),
  osVersion: z.string().nullable().optional(),
  agentVersion: z.string().nullable().optional(),
  lastHeartbeat: z.string().nullable().optional(),
  registeredAt: z.string(),
  ipAddress: z.string().nullable().optional(),
  hostname: z.string().nullable().optional(),
  assetId: z.string().nullable().optional(),
});
