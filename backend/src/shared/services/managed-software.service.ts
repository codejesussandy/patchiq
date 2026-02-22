/**
 * Managed Software Service
 * Tracks hub-deployed software per asset via AssetManagedSoftware table
 */
import { prisma } from '@/db/client';
import { createLogger } from '@shared/services/logger';

const logger = createLogger('managed-software');

export class ManagedSoftwareService {
  /**
   * Get all INSTALLED managed software for an asset
   */
  async getManagedSoftwareForAsset(assetId: string) {
    return prisma.assetManagedSoftware.findMany({
      where: { assetId, status: 'INSTALLED' },
    });
  }

  /**
   * Upsert managed software entry on successful deployment
   */
  async recordInstall(params: {
    assetId: string;
    packageId: string;
    name: string;
    displayName: string;
    version: string;
    vendor?: string | null;
    platform: string;
    cpeVendor?: string | null;
    cpeProduct?: string | null;
  }) {
    const { assetId, packageId, name, displayName, version, vendor, platform, cpeVendor, cpeProduct } = params;

    await prisma.assetManagedSoftware.upsert({
      where: { assetId_packageId: { assetId, packageId } },
      update: {
        version,
        status: 'INSTALLED',
        installedAt: new Date(),
        name,
        displayName,
        vendor,
        platform,
        cpeVendor,
        cpeProduct,
      },
      create: {
        assetId,
        packageId,
        name,
        displayName,
        version,
        vendor,
        platform,
        status: 'INSTALLED',
        installedAt: new Date(),
        cpeVendor,
        cpeProduct,
      },
    });

    logger.info({ assetId, packageId, name, version }, 'Managed software installed/upgraded');
  }

  /**
   * Mark managed software as uninstalled
   */
  async recordUninstall(assetId: string, packageId: string) {
    const existing = await prisma.assetManagedSoftware.findUnique({
      where: { assetId_packageId: { assetId, packageId } },
    });

    if (existing) {
      await prisma.assetManagedSoftware.update({
        where: { assetId_packageId: { assetId, packageId } },
        data: { status: 'UNINSTALLED' },
      });
      logger.info({ assetId, packageId }, 'Managed software marked uninstalled');
    }
  }
}

export const managedSoftwareService = new ManagedSoftwareService();
