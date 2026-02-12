import {
  registerAgentSchema,
  heartbeatSchema,
  commandResultSchema,
  listAgentsQuerySchema,
  inventorySchema,
  telemetrySchema,
} from '@modules/agents/agents.validators';

describe('Agent Validators', () => {
  describe('registerAgentSchema', () => {
    const validRegistration = {
      machineId: 'MACH-001',
      hostname: 'my-computer',
      os: 'Windows' as const,
      osVersion: '11 Pro',
      architecture: 'x64',
      agentVersion: '1.0.0',
    };

    it('should validate valid registration data', () => {
      const result = registerAgentSchema.safeParse(validRegistration);
      expect(result.success).toBe(true);
    });

    it('should accept optional fields', () => {
      const withOptional = {
        ...validRegistration,
        serialNumber: 'SN12345',
        manufacturer: 'Dell',
        model: 'XPS 15',
        ipAddress: '192.168.1.100',
        macAddress: 'AA:BB:CC:DD:EE:FF',
        timezone: 'America/New_York',
        locale: 'en-US',
      };
      const result = registerAgentSchema.safeParse(withOptional);
      expect(result.success).toBe(true);
    });

    it('should reject empty machineId', () => {
      const result = registerAgentSchema.safeParse({
        ...validRegistration,
        machineId: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid OS', () => {
      const result = registerAgentSchema.safeParse({
        ...validRegistration,
        os: 'FreeBSD',
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid OS values', () => {
      for (const os of ['Windows', 'MacOS', 'Linux']) {
        const result = registerAgentSchema.safeParse({
          ...validRegistration,
          os,
        });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid IP address', () => {
      const result = registerAgentSchema.safeParse({
        ...validRegistration,
        ipAddress: 'not-an-ip',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('heartbeatSchema', () => {
    const validHeartbeat = {
      timestamp: new Date().toISOString(),
      status: 'healthy' as const,
      uptime: 86400,
      agentUptime: 3600,
      cpuUsage: 25.5,
      memoryUsage: 60.0,
      diskUsage: 45.0,
      pendingReboot: false,
    };

    it('should validate valid heartbeat data', () => {
      const result = heartbeatSchema.safeParse(validHeartbeat);
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const result = heartbeatSchema.safeParse({
        ...validHeartbeat,
        status: 'invalid',
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid status values', () => {
      for (const status of ['healthy', 'degraded', 'error']) {
        const result = heartbeatSchema.safeParse({
          ...validHeartbeat,
          status,
        });
        expect(result.success).toBe(true);
      }
    });

    it('should reject cpuUsage over 100', () => {
      const result = heartbeatSchema.safeParse({
        ...validHeartbeat,
        cpuUsage: 150,
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative cpuUsage', () => {
      const result = heartbeatSchema.safeParse({
        ...validHeartbeat,
        cpuUsage: -10,
      });
      expect(result.success).toBe(false);
    });

    it('should accept optional ipAddress', () => {
      const result = heartbeatSchema.safeParse({
        ...validHeartbeat,
        ipAddress: '192.168.1.100',
      });
      expect(result.success).toBe(true);
    });

    it('should accept optional lastError', () => {
      const result = heartbeatSchema.safeParse({
        ...validHeartbeat,
        lastError: 'Connection timeout',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('commandResultSchema', () => {
    it('should validate completed status', () => {
      const result = commandResultSchema.safeParse({
        status: 'COMPLETED',
        result: 'Success',
      });
      expect(result.success).toBe(true);
    });

    it('should validate failed status', () => {
      const result = commandResultSchema.safeParse({
        status: 'FAILED',
        errorMessage: 'Command timed out',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const result = commandResultSchema.safeParse({
        status: 'PENDING',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('listAgentsQuerySchema', () => {
    it('should accept empty query', () => {
      const result = listAgentsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should accept valid status filter', () => {
      const result = listAgentsQuerySchema.safeParse({ status: 'CONNECTED' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid status filter', () => {
      const result = listAgentsQuerySchema.safeParse({ status: 'Invalid' });
      expect(result.success).toBe(false);
    });

    it('should accept valid OS filter', () => {
      const result = listAgentsQuerySchema.safeParse({ os: 'Windows' });
      expect(result.success).toBe(true);
    });

    it('should coerce page to number', () => {
      const result = listAgentsQuerySchema.safeParse({ page: '2' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
      }
    });

    it('should enforce max limit of 100', () => {
      const result = listAgentsQuerySchema.safeParse({ limit: '150' });
      expect(result.success).toBe(false);
    });

    it('should accept search parameter', () => {
      const result = listAgentsQuerySchema.safeParse({ search: 'test' });
      expect(result.success).toBe(true);
    });
  });

  describe('inventorySchema', () => {
    it('should validate basic inventory', () => {
      const result = inventorySchema.safeParse({
        collectedAt: new Date().toISOString(),
      });
      expect(result.success).toBe(true);
    });

    it('should accept hardware data', () => {
      const result = inventorySchema.safeParse({
        collectedAt: new Date().toISOString(),
        hardware: {
          cpu: 'Intel i7',
          cpuCores: 8,
          ramTotal: 16000000000,
        },
      });
      expect(result.success).toBe(true);
    });

    it('should accept security data', () => {
      const result = inventorySchema.safeParse({
        collectedAt: new Date().toISOString(),
        security: {
          antivirusInstalled: true,
          antivirusName: 'Windows Defender',
          firewallEnabled: true,
        },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('telemetrySchema', () => {
    it('should validate basic telemetry', () => {
      const result = telemetrySchema.safeParse({
        collectedAt: new Date().toISOString(),
      });
      expect(result.success).toBe(true);
    });

    it('should accept cpu data', () => {
      const result = telemetrySchema.safeParse({
        collectedAt: new Date().toISOString(),
        cpu: { usage: 25.5, temperature: 65 },
      });
      expect(result.success).toBe(true);
    });

    it('should accept memory data', () => {
      const result = telemetrySchema.safeParse({
        collectedAt: new Date().toISOString(),
        memory: { usage: 60.0, available: 8000000000 },
      });
      expect(result.success).toBe(true);
    });
  });
});
