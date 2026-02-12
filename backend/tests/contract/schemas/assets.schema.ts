import { z } from 'zod';

export const assetItemSchema = z.object({
  id: z.string(),
  assetId: z.string(),
  name: z.string(),
  status: z.string(),
  operationalStatus: z.string(),
  ipAddress: z.string().nullable().optional(),
  macAddress: z.string().nullable().optional(),
  hostname: z.string().nullable().optional(),
  serialNumber: z.string().nullable().optional(),
  manufacturer: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  osType: z.string().nullable().optional(),
  osVersion: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
