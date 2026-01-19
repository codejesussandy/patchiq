# Task 09: Discovery Module

## Overview
Implement network discovery including IP range scanning, device credentials, and network device management.

**Priority:** P1 - Important Feature
**Dependencies:** Tasks 03, 04, 05
**Estimated Complexity:** Medium
**Parallel:** Yes (with Tasks 08, 10)

---

## Reference Documents

| Document | Path | Purpose |
|----------|------|---------|
| Implementation Guide | `backend-debt/DISCOVERY-IMPLEMENTATION.md` | Specification |
| Gaps Analysis | `backend-debt/GAPS-ANALYSIS.md` | Missing endpoints |

---

## Endpoints to Implement

```
# IP Ranges
GET    /v1/discovery/ip-ranges       - List configured IP ranges
POST   /v1/discovery/ip-ranges       - Add new IP range
PUT    /v1/discovery/ip-ranges/:id   - Update IP range
DELETE /v1/discovery/ip-ranges/:id   - Delete IP range
POST   /v1/discovery/scan            - Trigger network scan
GET    /v1/discovery/scan/:id        - Get scan status
GET    /v1/discovery/scan/:id/results - Get scan results

# Device Credentials
GET    /v1/discovery/credentials     - List saved credentials
POST   /v1/discovery/credentials     - Create credential (encrypted)
PUT    /v1/discovery/credentials/:id - Update credential
DELETE /v1/discovery/credentials/:id - Delete credential
POST   /v1/discovery/credentials/:id/test - Test credential

# Discovered Devices
GET    /v1/discovery/devices         - List discovered devices
POST   /v1/discovery/devices/:id/enroll - Enroll device as asset
```

---

## Key Data Models

### IP Range

```typescript
interface IPRange {
  id: string;
  name: string;
  startIP: string;
  endIP: string;
  subnet?: string;              // CIDR notation
  credentialId?: string;
  scanSchedule?: {
    type: 'once' | 'daily' | 'weekly';
    time?: string;
    dayOfWeek?: number;
  };
  lastScan?: string;
  discoveredDevices: number;
  status: 'active' | 'inactive';
  createdAt: string;
}
```

### Device Credential

```typescript
interface DeviceCredential {
  id: string;
  name: string;
  type: 'SSH' | 'WMI' | 'SNMP' | 'WinRM';
  username?: string;
  // password never returned in GET - stored encrypted
  domain?: string;
  snmpCommunity?: string;
  snmpVersion?: 'v2c' | 'v3';
  port?: number;
  createdBy: string;
  createdAt: string;
}
```

---

## Security Requirements

1. **Credential Encryption**: Store passwords using AES-256 encryption
2. **Password Masking**: Never return passwords in API responses
3. **Audit Logging**: Log all credential access and modifications
4. **TLS 1.3**: Required for agent communication
5. **No Overlapping Ranges**: Validate IP ranges don't overlap

---

## Service Implementation

**src/modules/discovery/discovery.service.ts:**
```typescript
import { prisma } from '@/db/client';
import { NotFoundError, BadRequestError, ConflictError } from '@shared/errors/httpErrors';
import { encrypt, decrypt } from '@shared/utils/crypto';
import { paginate, getPaginationParams } from '@shared/utils/pagination';

export class DiscoveryService {
  // ==================== IP Ranges ====================

  async listIpRanges(params: { page: number; limit: number }) {
    const [ranges, total] = await Promise.all([
      prisma.ipRange.findMany({
        include: { credential: { select: { id: true, name: true, type: true } } },
        ...getPaginationParams(params),
      }),
      prisma.ipRange.count(),
    ]);

    return paginate(ranges.map(this.transformIpRange), total, params);
  }

  async createIpRange(data: any) {
    // Validate no overlapping ranges
    const overlapping = await this.findOverlappingRanges(data.startIp, data.endIp);
    if (overlapping.length > 0) {
      throw new ConflictError('IP range overlaps with existing range');
    }

    return prisma.ipRange.create({
      data: {
        name: data.name,
        startIp: data.startIp,
        endIp: data.endIp,
        subnet: data.subnet,
        credentialId: data.credentialId,
        scanScheduleType: data.scanSchedule?.type,
        scanScheduleTime: data.scanSchedule?.time,
        scanScheduleDay: data.scanSchedule?.dayOfWeek,
        status: 'active',
      },
    });
  }

  async updateIpRange(id: string, data: any) {
    const existing = await prisma.ipRange.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('IP range not found');
    }

    // Validate no overlapping (excluding self)
    const overlapping = await this.findOverlappingRanges(
      data.startIp || existing.startIp,
      data.endIp || existing.endIp,
      id
    );
    if (overlapping.length > 0) {
      throw new ConflictError('IP range overlaps with existing range');
    }

    return prisma.ipRange.update({
      where: { id },
      data: {
        name: data.name,
        startIp: data.startIp,
        endIp: data.endIp,
        subnet: data.subnet,
        credentialId: data.credentialId,
        scanScheduleType: data.scanSchedule?.type,
        scanScheduleTime: data.scanSchedule?.time,
        scanScheduleDay: data.scanSchedule?.dayOfWeek,
        status: data.status,
      },
    });
  }

  async deleteIpRange(id: string) {
    const existing = await prisma.ipRange.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('IP range not found');
    }

    await prisma.ipRange.delete({ where: { id } });
  }

  async triggerScan(rangeId: string) {
    const range = await prisma.ipRange.findUnique({ where: { id: rangeId } });
    if (!range) {
      throw new NotFoundError('IP range not found');
    }

    // TODO: Queue network scan job
    // This would:
    // 1. Perform ICMP ping sweep
    // 2. Port scan discovered IPs
    // 3. Identify device types
    // 4. Store results

    await prisma.ipRange.update({
      where: { id: rangeId },
      data: { lastScan: new Date() },
    });

    return { message: 'Scan started', rangeId };
  }

  private async findOverlappingRanges(startIp: string, endIp: string, excludeId?: string) {
    // Convert IPs to numbers for comparison
    const startNum = this.ipToNumber(startIp);
    const endNum = this.ipToNumber(endIp);

    const ranges = await prisma.ipRange.findMany({
      where: excludeId ? { NOT: { id: excludeId } } : undefined,
    });

    return ranges.filter((range) => {
      const rangeStart = this.ipToNumber(range.startIp);
      const rangeEnd = this.ipToNumber(range.endIp);

      return (startNum <= rangeEnd && endNum >= rangeStart);
    });
  }

  private ipToNumber(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  }

  // ==================== Credentials ====================

  async listCredentials(params: { page: number; limit: number }) {
    const [credentials, total] = await Promise.all([
      prisma.deviceCredential.findMany({
        select: {
          id: true,
          name: true,
          type: true,
          username: true,
          domain: true,
          snmpCommunity: true,
          snmpVersion: true,
          port: true,
          createdBy: true,
          createdAt: true,
          // Explicitly exclude passwordHash
        },
        ...getPaginationParams(params),
      }),
      prisma.deviceCredential.count(),
    ]);

    return paginate(credentials, total, params);
  }

  async createCredential(data: any, userId: string) {
    // Encrypt password before storing
    const passwordHash = data.password ? encrypt(data.password) : null;

    return prisma.deviceCredential.create({
      data: {
        name: data.name,
        type: data.type,
        username: data.username,
        passwordHash,
        domain: data.domain,
        snmpCommunity: data.snmpCommunity,
        snmpVersion: data.snmpVersion,
        port: data.port,
        createdBy: userId,
      },
      select: {
        id: true,
        name: true,
        type: true,
        username: true,
        domain: true,
        port: true,
        createdAt: true,
      },
    });
  }

  async updateCredential(id: string, data: any) {
    const existing = await prisma.deviceCredential.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Credential not found');
    }

    // Only encrypt new password if provided
    const updateData: any = {
      name: data.name,
      type: data.type,
      username: data.username,
      domain: data.domain,
      snmpCommunity: data.snmpCommunity,
      snmpVersion: data.snmpVersion,
      port: data.port,
    };

    if (data.password) {
      updateData.passwordHash = encrypt(data.password);
    }

    return prisma.deviceCredential.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        type: true,
        username: true,
        domain: true,
        port: true,
        updatedAt: true,
      },
    });
  }

  async deleteCredential(id: string) {
    const existing = await prisma.deviceCredential.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Credential not found');
    }

    // Check if credential is in use
    const inUse = await prisma.ipRange.count({
      where: { credentialId: id },
    });

    if (inUse > 0) {
      throw new ConflictError('Credential is in use by IP ranges');
    }

    await prisma.deviceCredential.delete({ where: { id } });
  }

  async testCredential(id: string, targetIp: string) {
    const credential = await prisma.deviceCredential.findUnique({
      where: { id },
    });

    if (!credential) {
      throw new NotFoundError('Credential not found');
    }

    // Decrypt password for testing
    const password = credential.passwordHash
      ? decrypt(credential.passwordHash)
      : null;

    // TODO: Actually test the credential against targetIp
    // This would attempt SSH/WMI/SNMP connection based on type

    // For now, return mock result
    return {
      success: true,
      message: 'Credential test successful',
      targetIp,
    };
  }

  private transformIpRange(range: any) {
    return {
      id: range.id,
      name: range.name,
      startIP: range.startIp,
      endIP: range.endIp,
      subnet: range.subnet,
      credentialId: range.credentialId,
      credential: range.credential ? {
        id: range.credential.id,
        name: range.credential.name,
        type: range.credential.type,
      } : null,
      scanSchedule: range.scanScheduleType ? {
        type: range.scanScheduleType,
        time: range.scanScheduleTime,
        dayOfWeek: range.scanScheduleDay,
      } : null,
      lastScan: range.lastScan?.toISOString(),
      discoveredDevices: range.discoveredDevices,
      status: range.status,
      createdAt: range.createdAt.toISOString(),
    };
  }
}
```

---

## TDD Test Scenarios

```typescript
describe('Discovery API', () => {
  describe('IP Ranges', () => {
    it('should create IP range', async () => {
      const response = await request(app)
        .post('/v1/discovery/ip-ranges')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Office Network',
          startIp: '192.168.1.1',
          endIp: '192.168.1.254',
          subnet: '192.168.1.0/24',
        });

      expect(response.status).toBe(201);
    });

    it('should reject overlapping ranges', async () => {
      // Create first range
      await request(app)
        .post('/v1/discovery/ip-ranges')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Range 1',
          startIp: '10.0.0.1',
          endIp: '10.0.0.100',
        });

      // Try overlapping range
      const response = await request(app)
        .post('/v1/discovery/ip-ranges')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Range 2',
          startIp: '10.0.0.50',
          endIp: '10.0.0.150',
        });

      expect(response.status).toBe(409);
    });
  });

  describe('Credentials', () => {
    it('should create credential without exposing password', async () => {
      const response = await request(app)
        .post('/v1/discovery/credentials')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'SSH Admin',
          type: 'SSH',
          username: 'admin',
          password: 'secret123',
          port: 22,
        });

      expect(response.status).toBe(201);
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('should not return password in list', async () => {
      const response = await request(app)
        .get('/v1/discovery/credentials')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((cred: any) => {
        expect(cred).not.toHaveProperty('password');
        expect(cred).not.toHaveProperty('passwordHash');
      });
    });

    it('should test credential', async () => {
      const response = await request(app)
        .post(`/v1/discovery/credentials/${credentialId}/test`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ targetIp: '192.168.1.1' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
    });
  });
});
```

---

## Verification Checklist

- [ ] IP range CRUD works
- [ ] Overlapping range detection works
- [ ] Credential passwords encrypted at rest
- [ ] Passwords never returned in API responses
- [ ] Credential test endpoint works
- [ ] Network scan can be triggered
- [ ] Audit logs for credential access
- [ ] CIDR notation validation works
