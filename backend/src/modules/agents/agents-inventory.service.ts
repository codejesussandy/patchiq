import { prisma } from '@/db/client';
import { Prisma } from '@prisma/client';
import { NotFoundError } from '@shared/errors';
import { cveDatabase } from '@shared/services/cve-database.service';
import { createLogger } from '@shared/services/logger';
import { withTransaction } from '@shared/utils/transaction';
import { evaluateAlertsForAsset, evaluateSecurityAlertsForAsset } from '@/modules/alerts/alert-evaluation.service';
import type { InventoryInput } from './agents.validators';

const logger = createLogger('agents-inventory');

export class AgentsInventoryService {
  /**
   * Process inventory submission from agent
   */
  async processInventory(agentId: string, inventory: InventoryInput): Promise<void> {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: { asset: true },
    });

    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    // Extract hardware data from agent's nested structure
    const hw = inventory.hardware as Record<string, unknown> | undefined;
    const systemIdentity = hw?.systemIdentity as Record<string, unknown> | undefined;
    const processor = hw?.processor as Record<string, unknown> | undefined;
    const memory = hw?.memory as Record<string, unknown> | undefined;
    const bios = hw?.bios as Record<string, unknown> | undefined;
    const graphicsAdapters = hw?.graphicsAdapters as Array<Record<string, unknown>> | undefined;
    const storageDrives = hw?.storageDrives as Array<Record<string, unknown>> | undefined;
    const _battery = hw?.battery as Record<string, unknown> | undefined;

    // Extract software data
    const sw = inventory.software as Record<string, unknown> | undefined;
    const operatingSystem = sw?.operatingSystem as Record<string, unknown> | undefined;

    // Extract network data for hostname and MAC address
    const net = inventory.network as Record<string, unknown> | undefined;
    const networkIdentity = net?.identity as Record<string, unknown> | undefined;
    const networkAdapters = net?.adapters as Array<Record<string, unknown>> | undefined;

    // Extract MAC address from network adapters (prefer default/first physical adapter)
    let macAddressFromNetwork: string | undefined;
    if (networkAdapters && Array.isArray(networkAdapters)) {
      const defaultAdapter = networkAdapters.find(a => a.isDefault === true);
      const physicalAdapter = networkAdapters.find(a =>
        a.type === 'Ethernet' || a.type === 'WiFi'
      );
      const adapterWithMac = defaultAdapter || physicalAdapter || networkAdapters[0];
      if (adapterWithMac?.macAddress) {
        macAddressFromNetwork = adapterWithMac.macAddress as string;
      }
    }

    // Extract software sub-data for use inside transaction
    const softwareData = inventory.software as Record<string, unknown> | undefined;
    const applications = softwareData ? ((softwareData.applications as Array<Record<string, unknown>>) || []) : [];
    const services = softwareData ? ((softwareData.services as Array<Record<string, unknown>>) || []) : [];

    // Security data
    const sec = inventory.security as Record<string, unknown> | undefined;

    // Peripheral data
    const peripherals = inventory.peripherals as Record<string, unknown> | undefined;

    // Wrap all DB operations in a transaction
    await withTransaction('processInventory', async (tx) => {
      // If agent has no linked asset, create one now from inventory data
      if (!agent.assetId) {
        const hwInit = inventory.hardware as Record<string, unknown> | undefined;
        const sysId = hwInit?.systemIdentity as Record<string, unknown> | undefined;
        const swInit = inventory.software as Record<string, unknown> | undefined;
        const osInit = swInit?.operatingSystem as Record<string, unknown> | undefined;

        const asset = await tx.asset.create({
          data: {
            name: agent.hostname || agentId,
            status: 'IN_USE',
            os: agent.os || (osInit?.name as string) || undefined,
            osVersion: agent.osVersion || (osInit?.version as string) || undefined,
            manufacturer: (sysId?.manufacturer as string) || undefined,
            model: (sysId?.model as string) || undefined,
            serialNumber: agent.serialNumber || (sysId?.serialNumber as string) || undefined,
            ipAddress: agent.ipAddress || undefined,
            macAddress: agent.macAddress || undefined,
          },
        });

        await tx.agent.update({
          where: { id: agent.id },
          data: { assetId: asset.id },
        });

        agent.assetId = asset.id;
      }

      // Update asset with inventory data (manufacturer, model, serial from hardware)
      const assetUpdateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (systemIdentity) {
        if (systemIdentity.manufacturer) assetUpdateData.manufacturer = systemIdentity.manufacturer;
        if (systemIdentity.model) assetUpdateData.model = systemIdentity.model;
        if (systemIdentity.serialNumber) assetUpdateData.serialNumber = systemIdentity.serialNumber;
      }

      if (operatingSystem) {
        if (operatingSystem.name) assetUpdateData.os = operatingSystem.name;
        if (operatingSystem.version) assetUpdateData.osVersion = operatingSystem.version;
      }

      if (macAddressFromNetwork) {
        assetUpdateData.macAddress = macAddressFromNetwork;
      }

      if (networkIdentity?.hostname) {
        assetUpdateData.name = networkIdentity.hostname as string;
      }

      await tx.asset.update({
        where: { id: agent.assetId },
        data: assetUpdateData,
      });

      // Update agent with hostname and macAddress from network data
      const agentUpdateData: Record<string, unknown> = {};
      if (networkIdentity?.hostname) {
        agentUpdateData.hostname = networkIdentity.hostname as string;
        agentUpdateData.name = networkIdentity.hostname as string;
      }
      if (macAddressFromNetwork) {
        agentUpdateData.macAddress = macAddressFromNetwork;
      }
      if (Object.keys(agentUpdateData).length > 0) {
        await tx.agent.update({
          where: { id: agentId },
          data: agentUpdateData,
        });
      }

      // Store hardware data if provided
      if (hw) {
        const ramTotalGB = memory?.totalPhysicalGB as number | undefined;
        const ramTotalBytes = ramTotalGB ? BigInt(Math.floor(ramTotalGB * 1024 * 1024 * 1024)) : undefined;

        let diskTotalBytes: bigint | undefined;
        let diskFreeBytes: bigint | undefined;
        let diskType: string | undefined;
        if (storageDrives && Array.isArray(storageDrives)) {
          let totalSize = 0;
          let totalFree = 0;
          for (const drive of storageDrives) {
            const capacity = (drive.capacityGB ?? drive.sizeGB) as number | undefined;
            const freeSpace = (drive.freeSpaceGB ?? drive.freeGB) as number | undefined;
            if (capacity) totalSize += capacity;
            if (freeSpace) totalFree += freeSpace;
            if (!diskType && drive.type) diskType = drive.type as string;
          }
          if (totalSize > 0) diskTotalBytes = BigInt(Math.floor(totalSize * 1024 * 1024 * 1024));
          if (totalFree > 0) diskFreeBytes = BigInt(Math.floor(totalFree * 1024 * 1024 * 1024));
        }

        const gpuModel = graphicsAdapters?.[0]?.name as string | undefined;
        const gpuMemoryMB = graphicsAdapters?.[0]?.memoryMB as number | undefined;
        const biosVendor = bios?.vendor as string | undefined;
        const biosVersion = bios?.version as string | undefined;
        const systemSKU = (systemIdentity?.sku ?? systemIdentity?.assetTag) as string | undefined;
        const cpuManufacturer = processor?.manufacturer as string | undefined;
        const cpuThreads = processor?.threadCount as number | undefined;
        const cpuSpeedMHz = processor?.clockSpeedMHz as number | undefined;
        const ramSlots = memory?.usedSlots as number | undefined;
        const ramType = memory?.type as string | undefined;
        const manufacturer = systemIdentity?.manufacturer as string | undefined;
        const model = systemIdentity?.model as string | undefined;
        const serialNumber = systemIdentity?.serialNumber as string | undefined;

        const combinedPayload = {
          ...hw,
          networkAdapters: networkAdapters || [],
        };

        await tx.assetHardware.upsert({
          where: { assetId: agent.assetId },
          create: {
            assetId: agent.assetId,
            cpu: processor?.name as string | undefined,
            cpuCores: processor?.coreCount as number | undefined,
            cpuManufacturer,
            cpuThreads,
            cpuSpeedMHz,
            ramTotal: ramTotalBytes,
            ramSlots,
            ramType,
            diskTotal: diskTotalBytes,
            diskFree: diskFreeBytes,
            diskType,
            gpuModel,
            gpuMemoryMB,
            biosVendor,
            biosVersion,
            systemSKU,
            manufacturer,
            model,
            serialNumber,
            rawPayload: combinedPayload as Prisma.InputJsonValue,
            collectedAt: new Date(),
          },
          update: {
            cpu: processor?.name as string | undefined,
            cpuCores: processor?.coreCount as number | undefined,
            cpuManufacturer,
            cpuThreads,
            cpuSpeedMHz,
            ramTotal: ramTotalBytes,
            ramSlots,
            ramType,
            diskTotal: diskTotalBytes,
            diskFree: diskFreeBytes,
            diskType,
            gpuModel,
            gpuMemoryMB,
            biosVendor,
            biosVersion,
            systemSKU,
            manufacturer,
            model,
            serialNumber,
            rawPayload: combinedPayload as Prisma.InputJsonValue,
            collectedAt: new Date(),
          },
        });
      }

      // Store security data if provided
      if (sec) {
        await tx.assetSecurity.upsert({
          where: { assetId: agent.assetId },
          create: {
            assetId: agent.assetId,
            antivirusInstalled: sec.antivirusInstalled as boolean | undefined,
            antivirusName: sec.antivirusName as string | undefined,
            firewallEnabled: sec.firewallEnabled as boolean | undefined,
            encryptionEnabled: sec.encryptionEnabled as boolean | undefined,
          },
          update: {
            antivirusInstalled: sec.antivirusInstalled as boolean | undefined,
            antivirusName: sec.antivirusName as string | undefined,
            firewallEnabled: sec.firewallEnabled as boolean | undefined,
            encryptionEnabled: sec.encryptionEnabled as boolean | undefined,
          },
        });
      }

      // Store software data if provided
      if (inventory.software) {
        await tx.assetSoftware.deleteMany({
          where: { assetId: agent.assetId },
        });

        if (applications.length > 0) {
          await tx.assetSoftware.createMany({
            data: applications.map((app) => ({
              assetId: agent.assetId!,
              name: (app.name as string) || 'Unknown',
              version: app.version as string | undefined,
              vendor: app.vendor as string | undefined,
              installPath: app.path as string | undefined,
              isSystem: app.installSource === 'Pre-installed',
              category: app.category as string | undefined,
            })),
          });
        }

        await tx.assetSoftwareInventory.upsert({
          where: { assetId: agent.assetId },
          create: {
            assetId: agent.assetId,
            osName: operatingSystem?.name as string | undefined,
            osVersion: operatingSystem?.version as string | undefined,
            osBuild: operatingSystem?.build as string | undefined,
            totalApps: applications.length,
            totalServices: services.length,
            rawPayload: softwareData as Prisma.InputJsonValue,
            collectedAt: new Date(),
          },
          update: {
            osName: operatingSystem?.name as string | undefined,
            osVersion: operatingSystem?.version as string | undefined,
            osBuild: operatingSystem?.build as string | undefined,
            totalApps: applications.length,
            totalServices: services.length,
            rawPayload: softwareData as Prisma.InputJsonValue,
            collectedAt: new Date(),
          },
        });
      }

      // Store peripheral data if provided
      if (peripherals) {
        const monitors = (peripherals.monitors as Array<unknown>) || [];
        const usbDevices = (peripherals.usbDevices as Array<unknown>) || [];
        const printers = (peripherals.printers as Array<unknown>) || [];
        const audioDevices = (peripherals.audioDevices as Array<unknown>) || [];
        const bluetoothDevices = (peripherals.bluetoothDevices as Array<unknown>) || [];

        await tx.assetPeripherals.upsert({
          where: { assetId: agent.assetId },
          create: {
            assetId: agent.assetId,
            monitorCount: monitors.length,
            usbDeviceCount: usbDevices.length,
            printerCount: printers.length,
            audioDeviceCount: audioDevices.length,
            bluetoothDeviceCount: bluetoothDevices.length,
            rawPayload: peripherals as Prisma.InputJsonValue,
            collectedAt: new Date(),
          },
          update: {
            monitorCount: monitors.length,
            usbDeviceCount: usbDevices.length,
            printerCount: printers.length,
            audioDeviceCount: audioDevices.length,
            bluetoothDeviceCount: bluetoothDevices.length,
            rawPayload: peripherals as Prisma.InputJsonValue,
            collectedAt: new Date(),
          },
        });
      }
    }, { timeout: 30000 });

    // Fire-and-forget operations OUTSIDE the transaction
    if (sec && agent.assetId) {
      evaluateSecurityAlertsForAsset(agent.assetId, {
        firewallEnabled: sec.firewallEnabled as boolean | undefined,
        antivirusInstalled: sec.antivirusInstalled as boolean | undefined,
      }).catch(() => {});
    }

    if (inventory.software && agent.assetId) {
      cveDatabase.checkAssetVulnerabilities(agent.assetId).catch((err) => {
        logger.error({ err, assetId: agent.assetId }, 'Vulnerability check failed');
      });

      import('@modules/patches/patches.service').then(({ checkPatchApplicabilityForAsset }) => {
        checkPatchApplicabilityForAsset(agent.assetId!).catch((err) => {
          logger.error({ err, assetId: agent.assetId }, 'Patch applicability check failed');
        });
      }).catch(() => {});
    }
  }

  /**
   * Process telemetry submission from agent
   */
  async processTelemetry(agentId: string, telemetry: Record<string, unknown>): Promise<void> {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    const cpu = telemetry.cpu as Record<string, unknown> | undefined;
    const memory = telemetry.memory as Record<string, unknown> | undefined;
    const disk = telemetry.disk as Record<string, unknown> | undefined;
    const network = telemetry.network as Record<string, unknown> | undefined;
    const processes = telemetry.processes as Record<string, unknown> | undefined;
    const systemUptime = telemetry.systemUptime as { uptimeSeconds?: number; uptimeHuman?: string; bootTime?: string } | undefined;
    const telemetryAny = telemetry as Record<string, unknown>;

    const networkInBps = network?.bytesReceivedPerSec as number | undefined;
    const networkOutBps = network?.bytesSentPerSec as number | undefined;
    const processCount = processes?.totalCount as number ?? cpu?.processCount as number | undefined;
    const pendingReboot = telemetryAny.pendingReboot as boolean | undefined;
    const uptime = systemUptime?.uptimeSeconds ?? telemetryAny.uptime as number | undefined;

    await prisma.agentTelemetry.create({
      data: {
        agentId,
        cpuUsage: (cpu?.usagePercent ?? cpu?.usage) as number | undefined,
        memoryUsage: (memory?.usagePercent ?? memory?.usage) as number | undefined,
        diskUsage: (disk?.usagePercent ?? disk?.usage) as number | undefined,
        uptime,
        networkInBps: networkInBps ? BigInt(Math.floor(networkInBps)) : undefined,
        networkOutBps: networkOutBps ? BigInt(Math.floor(networkOutBps)) : undefined,
        processCount,
        pendingReboot,
        rawPayload: telemetry as Prisma.InputJsonValue,
        timestamp: new Date(telemetry.collectedAt as string | number | Date),
      },
    });

    // Fire-and-forget alert evaluation
    if (agent.assetId) {
      evaluateAlertsForAsset(agent.assetId, {
        cpuUsage: (cpu?.usagePercent ?? cpu?.usage) as number | undefined,
        memoryUsage: (memory?.usagePercent ?? memory?.usage) as number | undefined,
        diskUsage: (disk?.usagePercent ?? disk?.usage) as number | undefined,
        pendingReboot,
      }).catch(() => {});
    }
  }

  /**
   * Get latest telemetry for an agent
   */
  async getLatestTelemetry(agentId: string) {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    const telemetry = await prisma.agentTelemetry.findFirst({
      where: { agentId },
      orderBy: { timestamp: 'desc' },
    });

    if (!telemetry) {
      return null;
    }

    return {
      id: telemetry.id,
      agentId: telemetry.agentId,
      cpuUsage: telemetry.cpuUsage,
      memoryUsage: telemetry.memoryUsage,
      diskUsage: telemetry.diskUsage,
      uptime: telemetry.uptime,
      networkInBps: telemetry.networkInBps ? Number(telemetry.networkInBps) : null,
      networkOutBps: telemetry.networkOutBps ? Number(telemetry.networkOutBps) : null,
      processCount: telemetry.processCount,
      pendingReboot: telemetry.pendingReboot,
      rawPayload: telemetry.rawPayload,
      timestamp: telemetry.timestamp.toISOString(),
    };
  }
}

export const agentsInventoryService = new AgentsInventoryService();
