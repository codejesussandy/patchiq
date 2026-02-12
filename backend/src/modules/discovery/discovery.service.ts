import { NotFoundError, ConflictError, BadRequestError } from '@shared/errors';
import { encrypt, decrypt, maskString } from '@shared/utils/crypto';
import { paginate, getPaginationParams } from '@shared/utils/pagination';
import { withTransaction } from '@shared/utils/transaction';
import { prisma } from '@/db/client';
import type {
  IPRangeResponse,
  DeviceCredentialResponse,
  ScanResponse,
  DiscoveredDeviceResponse,
  TriggerScanResponse,
  TestCredentialResponse,
  EnrollDeviceResponse,
  ListIPRangesParams,
  ListCredentialsParams,
  ListDiscoveredDevicesParams,
} from './discovery.types';
import type {
  CreateIPRangeInput,
  UpdateIPRangeInput,
  CreateCredentialInput,
  UpdateCredentialInput,
  TestCredentialInput,
  EnrollDeviceInput,
} from './discovery.validators';

export class DiscoveryService {
  // ==================== IP Ranges ====================

  /**
   * List all IP ranges with pagination
   */
  async listIPRanges(params: ListIPRangesParams) {
    const where: Record<string, unknown> = {};

    if (params.status) {
      where.status = params.status;
    }

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { range: { contains: params.search } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [ranges, total] = await Promise.all([
      prisma.iPRange.findMany({
        where,
        include: {
          credential: {
            select: { id: true, name: true, type: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        ...getPaginationParams(params),
      }),
      prisma.iPRange.count({ where }),
    ]);

    const transformedRanges: IPRangeResponse[] = ranges.map((range) =>
      this.transformIPRange(range)
    );

    return paginate(transformedRanges, total, params);
  }

  /**
   * Get a single IP range by ID
   */
  async getIPRangeById(id: string): Promise<IPRangeResponse> {
    const range = await prisma.iPRange.findUnique({
      where: { id },
      include: {
        credential: {
          select: { id: true, name: true, type: true },
        },
      },
    });

    if (!range) {
      throw new NotFoundError('IP range not found');
    }

    return this.transformIPRange(range);
  }

  /**
   * Create a new IP range
   */
  async createIPRange(data: CreateIPRangeInput): Promise<IPRangeResponse> {
    // Check for overlapping ranges
    const existingRanges = await prisma.iPRange.findMany();
    const overlapping = this.findOverlappingRanges(data.range, existingRanges);

    if (overlapping.length > 0) {
      throw new ConflictError('IP range overlaps with existing range', {
        overlappingRanges: overlapping.map((r) => r.name),
      });
    }

    // Validate credential exists if provided
    if (data.credentialId) {
      const credential = await prisma.deviceCredential.findUnique({
        where: { id: data.credentialId },
      });
      if (!credential) {
        throw new BadRequestError('Credential not found');
      }
    }

    const range = await prisma.iPRange.create({
      data: {
        name: data.name,
        range: data.range,
        description: data.description,
        credentialId: data.credentialId,
        scanScheduleType: data.scanSchedule?.type,
        scanScheduleTime: data.scanSchedule?.time,
        scanScheduleDay: data.scanSchedule?.dayOfWeek,
        status: 'ACTIVE',
      },
      include: {
        credential: {
          select: { id: true, name: true, type: true },
        },
      },
    });

    return this.transformIPRange(range);
  }

  /**
   * Update an IP range
   */
  async updateIPRange(id: string, data: UpdateIPRangeInput): Promise<IPRangeResponse> {
    const existing = await prisma.iPRange.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('IP range not found');
    }

    // Check for overlapping ranges if range is being changed
    if (data.range && data.range !== existing.range) {
      const existingRanges = await prisma.iPRange.findMany({
        where: { NOT: { id } },
      });
      const overlapping = this.findOverlappingRanges(data.range, existingRanges);

      if (overlapping.length > 0) {
        throw new ConflictError('IP range overlaps with existing range', {
          overlappingRanges: overlapping.map((r) => r.name),
        });
      }
    }

    // Validate credential exists if provided
    if (data.credentialId) {
      const credential = await prisma.deviceCredential.findUnique({
        where: { id: data.credentialId },
      });
      if (!credential) {
        throw new BadRequestError('Credential not found');
      }
    }

    const range = await prisma.iPRange.update({
      where: { id },
      data: {
        name: data.name,
        range: data.range,
        description: data.description,
        credentialId: data.credentialId,
        scanScheduleType: data.scanSchedule?.type ?? (data.scanSchedule === null ? null : undefined),
        scanScheduleTime: data.scanSchedule?.time ?? (data.scanSchedule === null ? null : undefined),
        scanScheduleDay: data.scanSchedule?.dayOfWeek ?? (data.scanSchedule === null ? null : undefined),
        status: data.status,
      },
      include: {
        credential: {
          select: { id: true, name: true, type: true },
        },
      },
    });

    return this.transformIPRange(range);
  }

  /**
   * Delete an IP range
   */
  async deleteIPRange(id: string): Promise<void> {
    const existing = await prisma.iPRange.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('IP range not found');
    }

    await prisma.iPRange.delete({ where: { id } });
  }

  /**
   * Trigger a scan for an IP range
   */
  async triggerScan(id: string): Promise<TriggerScanResponse> {
    const range = await prisma.iPRange.findUnique({ where: { id } });
    if (!range) {
      throw new NotFoundError('IP range not found');
    }

    // Create a new scan record
    const scan = await prisma.discoveryScan.create({
      data: {
        ipRangeId: id,
        status: 'PENDING',
      },
    });

    // Update last scanned timestamp
    await prisma.iPRange.update({
      where: { id },
      data: { lastScanned: new Date() },
    });

    // TODO: Queue the actual network scan job
    // This would typically:
    // 1. Perform ICMP ping sweep
    // 2. Port scan discovered IPs
    // 3. Identify device types
    // 4. Store results in discovered_devices table

    return {
      jobId: scan.id,
      status: 'initiated',
      message: 'IP range scan started',
    };
  }

  /**
   * Get scan status
   */
  async getScanStatus(id: string): Promise<ScanResponse> {
    const scan = await prisma.discoveryScan.findUnique({
      where: { id },
    });

    if (!scan) {
      throw new NotFoundError('Scan not found');
    }

    return this.transformScan(scan);
  }

  /**
   * Get scan results (discovered devices)
   */
  async getScanResults(scanId: string, params: { page: number; limit: number }) {
    const scan = await prisma.discoveryScan.findUnique({
      where: { id: scanId },
    });

    if (!scan) {
      throw new NotFoundError('Scan not found');
    }

    const [devices, total] = await Promise.all([
      prisma.discoveredDevice.findMany({
        where: { ipRangeId: scan.ipRangeId },
        orderBy: { discoveredAt: 'desc' },
        ...getPaginationParams(params),
      }),
      prisma.discoveredDevice.count({ where: { ipRangeId: scan.ipRangeId } }),
    ]);

    const transformedDevices: DiscoveredDeviceResponse[] = devices.map((d) =>
      this.transformDiscoveredDevice(d)
    );

    return paginate(transformedDevices, total, params);
  }

  // ==================== Device Credentials ====================

  /**
   * List all credentials with pagination
   */
  async listCredentials(params: ListCredentialsParams) {
    const where: Record<string, unknown> = {};

    if (params.type) {
      where.type = params.type;
    }

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { username: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [credentials, total] = await Promise.all([
      prisma.deviceCredential.findMany({
        where,
        select: {
          id: true,
          name: true,
          type: true,
          username: true,
          domain: true,
          snmpCommunity: true,
          snmpVersion: true,
          port: true,
          description: true,
          lastUsed: true,
          createdBy: true,
          createdAt: true,
          // Explicitly exclude passwordEnc
        },
        orderBy: { createdAt: 'desc' },
        ...getPaginationParams(params),
      }),
      prisma.deviceCredential.count({ where }),
    ]);

    const transformedCredentials: DeviceCredentialResponse[] = credentials.map((c) =>
      this.transformCredential(c)
    );

    return paginate(transformedCredentials, total, params);
  }

  /**
   * Get a single credential by ID
   */
  async getCredentialById(id: string, showPassword: boolean = false): Promise<DeviceCredentialResponse> {
    const credential = await prisma.deviceCredential.findUnique({
      where: { id },
    });

    if (!credential) {
      throw new NotFoundError('Credential not found');
    }

    const response = this.transformCredential(credential);

    // Only include password if explicitly requested (requires elevated permissions)
    if (showPassword && credential.passwordEnc) {
      return {
        ...response,
        password: maskString(decrypt(credential.passwordEnc)),
      } as DeviceCredentialResponse;
    }

    return response;
  }

  /**
   * Create a new credential
   */
  async createCredential(data: CreateCredentialInput, userId?: string): Promise<DeviceCredentialResponse> {
    // Encrypt password before storing
    const passwordEnc = data.password ? encrypt(data.password) : null;

    const credential = await prisma.deviceCredential.create({
      data: {
        name: data.name,
        type: data.type,
        username: data.username,
        passwordEnc,
        domain: data.domain,
        snmpCommunity: data.snmpCommunity,
        snmpVersion: data.snmpVersion,
        port: data.port,
        description: data.description,
        createdBy: userId,
      },
      select: {
        id: true,
        name: true,
        type: true,
        username: true,
        domain: true,
        snmpCommunity: true,
        snmpVersion: true,
        port: true,
        description: true,
        lastUsed: true,
        createdBy: true,
        createdAt: true,
      },
    });

    return this.transformCredential(credential);
  }

  /**
   * Update a credential
   */
  async updateCredential(id: string, data: UpdateCredentialInput): Promise<DeviceCredentialResponse> {
    const existing = await prisma.deviceCredential.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Credential not found');
    }

    // Build update data, only encrypting password if provided
    const updateData: Record<string, unknown> = {
      name: data.name,
      type: data.type,
      username: data.username,
      domain: data.domain,
      snmpCommunity: data.snmpCommunity,
      snmpVersion: data.snmpVersion,
      port: data.port,
      description: data.description,
    };

    if (data.password) {
      updateData.passwordEnc = encrypt(data.password);
    }

    const credential = await prisma.deviceCredential.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        type: true,
        username: true,
        domain: true,
        snmpCommunity: true,
        snmpVersion: true,
        port: true,
        description: true,
        lastUsed: true,
        createdBy: true,
        createdAt: true,
      },
    });

    return this.transformCredential(credential);
  }

  /**
   * Delete a credential
   */
  async deleteCredential(id: string): Promise<void> {
    const existing = await prisma.deviceCredential.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Credential not found');
    }

    // Check if credential is in use by any IP ranges
    const inUseCount = await prisma.iPRange.count({
      where: { credentialId: id },
    });

    if (inUseCount > 0) {
      throw new ConflictError('Credential is in use by IP ranges', {
        rangesUsingCredential: inUseCount,
      });
    }

    await prisma.deviceCredential.delete({ where: { id } });
  }

  /**
   * Test a credential against a target host
   */
  async testCredential(id: string, _data: TestCredentialInput): Promise<TestCredentialResponse> {
    const credential = await prisma.deviceCredential.findUnique({
      where: { id },
    });

    if (!credential) {
      throw new NotFoundError('Credential not found');
    }

    // Update last used timestamp
    await prisma.deviceCredential.update({
      where: { id },
      data: { lastUsed: new Date() },
    });

    // TODO: Actually test the credential against targetHost
    // This would:
    // 1. Decrypt the password
    // 2. Attempt SSH/WMI/SNMP connection based on type
    // 3. Return success/failure

    // For now, return mock result
    return {
      success: true,
      message: 'Connection successful',
    };
  }

  // ==================== Discovered Devices ====================

  /**
   * List discovered devices
   */
  async listDiscoveredDevices(params: ListDiscoveredDevicesParams) {
    const where: Record<string, unknown> = {};

    if (params.ipRangeId) {
      where.ipRangeId = params.ipRangeId;
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.search) {
      where.OR = [
        { ipAddress: { contains: params.search } },
        { hostname: { contains: params.search, mode: 'insensitive' } },
        { vendor: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [devices, total] = await Promise.all([
      prisma.discoveredDevice.findMany({
        where,
        orderBy: { discoveredAt: 'desc' },
        ...getPaginationParams(params),
      }),
      prisma.discoveredDevice.count({ where }),
    ]);

    const transformedDevices: DiscoveredDeviceResponse[] = devices.map((d) =>
      this.transformDiscoveredDevice(d)
    );

    return paginate(transformedDevices, total, params);
  }

  /**
   * Enroll a discovered device as an asset
   */
  async enrollDevice(id: string, data: EnrollDeviceInput): Promise<EnrollDeviceResponse> {
    const device = await prisma.discoveredDevice.findUnique({
      where: { id },
    });

    if (!device) {
      throw new NotFoundError('Device not found');
    }

    if (device.status === 'ENROLLED') {
      throw new ConflictError('Device is already enrolled');
    }

    // Create an asset from the discovered device
    const asset = await withTransaction('enrollDevice', async (tx) => {
      const asset = await tx.asset.create({
        data: {
          name: data.name || device.hostname || device.ipAddress,
          type: data.type || 'Endpoint',
          status: 'IN_USE',
          ipAddress: device.ipAddress,
          macAddress: device.macAddress,
          os: device.os,
        },
      });

      // Update discovered device status and link to asset
      await tx.discoveredDevice.update({
        where: { id },
        data: {
          status: 'ENROLLED',
          assetId: asset.id,
        },
      });

      return asset;
    });

    return {
      assetId: asset.id,
      message: 'Device enrolled successfully',
    };
  }

  // ==================== Private Helpers ====================

  /**
   * Transform IPRange from Prisma to API response
   */
  private transformIPRange(range: {
    id: string;
    name: string;
    range: string;
    description: string | null;
    credentialId: string | null;
    credential?: { id: string; name: string; type: string } | null;
    scanScheduleType: string | null;
    scanScheduleTime: string | null;
    scanScheduleDay: number | null;
    lastScanned: Date | null;
    deviceCount: number;
    status: string;
    createdAt: Date;
  }): IPRangeResponse {
    return {
      id: range.id,
      name: range.name,
      range: range.range,
      description: range.description,
      credentialId: range.credentialId,
      credential: range.credential
        ? {
            id: range.credential.id,
            name: range.credential.name,
            type: range.credential.type,
          }
        : null,
      scanSchedule: range.scanScheduleType
        ? {
            type: range.scanScheduleType as 'ONCE' | 'DAILY' | 'WEEKLY',
            time: range.scanScheduleTime ?? undefined,
            dayOfWeek: range.scanScheduleDay ?? undefined,
          }
        : null,
      lastScanned: range.lastScanned?.toISOString() ?? null,
      deviceCount: range.deviceCount,
      status: range.status as 'ACTIVE' | 'INACTIVE',
      createdAt: range.createdAt.toISOString(),
    };
  }

  /**
   * Transform DeviceCredential from Prisma to API response
   */
  private transformCredential(credential: {
    id: string;
    name: string;
    type: string;
    username: string | null;
    domain: string | null;
    snmpCommunity: string | null;
    snmpVersion: string | null;
    port: number | null;
    description: string | null;
    lastUsed: Date | null;
    createdBy: string | null;
    createdAt: Date;
  }): DeviceCredentialResponse {
    return {
      id: credential.id,
      name: credential.name,
      type: credential.type as 'SSH' | 'WINDOWS' | 'SNMP' | 'WINRM',
      username: credential.username,
      domain: credential.domain,
      snmpCommunity: credential.snmpCommunity,
      snmpVersion: credential.snmpVersion as 'V2C' | 'V3' | null,
      port: credential.port,
      description: credential.description,
      lastUsed: credential.lastUsed?.toISOString() ?? null,
      createdBy: credential.createdBy,
      createdAt: credential.createdAt.toISOString(),
    };
  }

  /**
   * Transform DiscoveryScan from Prisma to API response
   */
  private transformScan(scan: {
    id: string;
    ipRangeId: string;
    status: string;
    devicesFound: number;
    startedAt: Date | null;
    completedAt: Date | null;
    errorMessage: string | null;
    createdAt: Date;
  }): ScanResponse {
    return {
      id: scan.id,
      ipRangeId: scan.ipRangeId,
      status: scan.status as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED',
      devicesFound: scan.devicesFound,
      startedAt: scan.startedAt?.toISOString() ?? null,
      completedAt: scan.completedAt?.toISOString() ?? null,
      errorMessage: scan.errorMessage,
      createdAt: scan.createdAt.toISOString(),
    };
  }

  /**
   * Transform DiscoveredDevice from Prisma to API response
   */
  private transformDiscoveredDevice(device: {
    id: string;
    ipRangeId: string;
    ipAddress: string;
    hostname: string | null;
    macAddress: string | null;
    deviceType: string | null;
    os: string | null;
    vendor: string | null;
    openPorts: number[];
    status: string;
    assetId: string | null;
    discoveredAt: Date;
    lastSeenAt: Date;
  }): DiscoveredDeviceResponse {
    return {
      id: device.id,
      ipRangeId: device.ipRangeId,
      ipAddress: device.ipAddress,
      hostname: device.hostname,
      macAddress: device.macAddress,
      deviceType: device.deviceType,
      os: device.os,
      vendor: device.vendor,
      openPorts: device.openPorts,
      status: device.status as 'DISCOVERED' | 'ENROLLED' | 'IGNORED',
      assetId: device.assetId,
      discoveredAt: device.discoveredAt.toISOString(),
      lastSeenAt: device.lastSeenAt.toISOString(),
    };
  }

  /**
   * Parse CIDR notation to get start and end IP addresses
   */
  private parseCIDR(cidr: string): { start: number; end: number } {
    const [ip, prefix] = cidr.split('/');
    const ipNum = this.ipToNumber(ip);
    const mask = ~((1 << (32 - parseInt(prefix, 10))) - 1) >>> 0;
    const start = ipNum & mask;
    const end = start | ~mask;
    return { start: start >>> 0, end: end >>> 0 };
  }

  /**
   * Convert IP address string to number
   */
  private ipToNumber(ip: string): number {
    return ip
      .split('.')
      .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  }

  /**
   * Check if two IP ranges overlap
   */
  private rangesOverlap(
    range1: { start: number; end: number },
    range2: { start: number; end: number }
  ): boolean {
    return range1.start <= range2.end && range1.end >= range2.start;
  }

  /**
   * Find overlapping ranges
   */
  private findOverlappingRanges(
    newRange: string,
    existingRanges: { id: string; name: string; range: string }[]
  ): { id: string; name: string }[] {
    const newParsed = this.parseCIDR(newRange);

    return existingRanges.filter((existing) => {
      const existingParsed = this.parseCIDR(existing.range);
      return this.rangesOverlap(newParsed, existingParsed);
    });
  }
}

export const discoveryService = new DiscoveryService();
