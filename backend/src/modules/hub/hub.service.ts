/**
 * Hub Service
 * Manages software packages in the central repository (Hub)
 * Integrates with MinIO for file storage
 */

import { prisma } from '@/db/client';
import { v4 as uuidv4 } from 'uuid';
import { minioStorage } from '@shared/services/minio.service';
import { NotFoundError, BadRequestError } from '@shared/errors';
import {
  CreatePackageInput,
  UpdatePackageInput,
  PackageListFilters,
  PackageResponse,
  PackageDownloadUrl,
  CreateBundleInput,
  BundleResponse,
} from './hub.types';
import crypto from 'crypto';

class HubService {
  // ============================================
  // Package CRUD Operations
  // ============================================

  /**
   * Create a new software package
   */
  async createPackage(input: CreatePackageInput, createdBy?: string): Promise<PackageResponse> {
    const packageId = `SWP-${uuidv4().slice(0, 8).toUpperCase()}`;

    const pkg = await prisma.softwarePackage.create({
      data: {
        packageId,
        name: input.name,
        displayName: input.displayName,
        version: input.version,
        vendor: input.vendor,
        category: input.category,
        platform: input.platform,
        architecture: input.architecture,
        installSource: input.installSource,
        installCommand: input.installCommand,
        installArgs: input.installArgs,
        silentInstall: input.silentInstall ?? true,
        requiresReboot: input.requiresReboot ?? false,
        downloadUrl: input.downloadUrl,
        description: input.description,
        releaseNotes: input.releaseNotes,
        iconUrl: input.iconUrl,
        tags: input.tags || [],
        preInstallScript: input.preInstallScript,
        postInstallScript: input.postInstallScript,
        uninstallCommand: input.uninstallCommand,
        supportsRollback: input.supportsRollback ?? false,
        rollbackCommand: input.rollbackCommand,
        isActive: true,
        isVerified: false,
        createdBy,
      },
    });

    return this.formatPackageResponse(pkg);
  }

  /**
   * Upload a file for a package to MinIO
   */
  async uploadPackageFile(
    packageId: string,
    file: Buffer,
    fileName: string,
    contentType: string
  ): Promise<{ objectKey: string; checksum: string; size: bigint }> {
    const pkg = await prisma.softwarePackage.findUnique({
      where: { packageId },
    });

    if (!pkg) {
      throw new NotFoundError('Package not found');
    }

    // Generate object key: platform/vendor/name/version/filename
    const vendor = pkg.vendor?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'unknown';
    const name = pkg.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const platform = pkg.platform.toLowerCase();
    const objectKey = `${platform}/${vendor}/${name}/${pkg.version}/${fileName}`;

    // Calculate checksum
    const checksum = crypto.createHash('sha256').update(file).digest('hex');

    // Upload to MinIO
    await minioStorage.uploadBuffer(objectKey, file, {
      contentType,
      metadata: {
        'x-package-id': packageId,
        'x-package-name': pkg.name,
        'x-package-version': pkg.version,
        'x-checksum-sha256': checksum,
      },
    });

    // Update package with file info
    await prisma.softwarePackage.update({
      where: { id: pkg.id },
      data: {
        minioObjectKey: objectKey,
        minioBucket: 'patchiq', // Default bucket
        fileName,
        fileSize: BigInt(file.length),
        checksum,
        checksumType: 'sha256',
      },
    });

    return {
      objectKey,
      checksum,
      size: BigInt(file.length),
    };
  }

  /**
   * Get a package by ID
   */
  async getPackage(packageId: string): Promise<PackageResponse> {
    const pkg = await prisma.softwarePackage.findUnique({
      where: { packageId },
    });

    if (!pkg) {
      throw new NotFoundError('Package not found');
    }

    return this.formatPackageResponse(pkg);
  }

  /**
   * Get package by internal ID
   */
  async getPackageById(id: string): Promise<PackageResponse> {
    const pkg = await prisma.softwarePackage.findUnique({
      where: { id },
    });

    if (!pkg) {
      throw new NotFoundError('Package not found');
    }

    return this.formatPackageResponse(pkg);
  }

  /**
   * Update a package
   */
  async updatePackage(packageId: string, input: UpdatePackageInput): Promise<PackageResponse> {
    const existing = await prisma.softwarePackage.findUnique({
      where: { packageId },
    });

    if (!existing) {
      throw new NotFoundError('Package not found');
    }

    const pkg = await prisma.softwarePackage.update({
      where: { id: existing.id },
      data: {
        ...input,
        tags: input.tags !== undefined ? input.tags : undefined,
      },
    });

    return this.formatPackageResponse(pkg);
  }

  /**
   * Delete a package
   */
  async deletePackage(packageId: string): Promise<void> {
    const pkg = await prisma.softwarePackage.findUnique({
      where: { packageId },
    });

    if (!pkg) {
      throw new NotFoundError('Package not found');
    }

    // Delete file from MinIO if exists
    if (pkg.minioObjectKey) {
      try {
        await minioStorage.deleteObject(pkg.minioObjectKey);
      } catch (error) {
        console.error('Failed to delete file from MinIO:', error);
        // Continue with package deletion even if file deletion fails
      }
    }

    await prisma.softwarePackage.delete({
      where: { id: pkg.id },
    });
  }

  /**
   * List packages with filtering
   */
  async listPackages(filters: PackageListFilters = {}): Promise<{
    data: PackageResponse[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (filters.platform) where.platform = filters.platform;
    if (filters.category) where.category = filters.category;
    if (filters.vendor) where.vendor = filters.vendor;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { displayName: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { vendor: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [packages, total] = await Promise.all([
      prisma.softwarePackage.findMany({
        where,
        orderBy: [{ displayName: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.softwarePackage.count({ where }),
    ]);

    return {
      data: packages.map(pkg => this.formatPackageResponse(pkg)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get presigned download URL for a package
   */
  async getPackageDownloadUrl(packageId: string): Promise<PackageDownloadUrl> {
    const pkg = await prisma.softwarePackage.findUnique({
      where: { packageId },
    });

    if (!pkg) {
      throw new NotFoundError('Package not found');
    }

    if (!pkg.minioObjectKey) {
      // If no file, return external download URL
      if (pkg.downloadUrl) {
        return {
          packageId,
          fileName: pkg.fileName || pkg.name,
          presignedUrl: pkg.downloadUrl,
          expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000), // External URLs don't expire
          checksum: null,
          checksumType: null,
        };
      }
      throw new BadRequestError('Package has no downloadable file');
    }

    // Generate presigned URL (valid for 1 hour)
    const presignedUrl = await minioStorage.getPresignedUrl(
      pkg.minioObjectKey,
      {
        expirySeconds: 3600,
        responseContentDisposition: `attachment; filename="${pkg.fileName || pkg.name}"`,
      },
      pkg.minioBucket || undefined
    );

    return {
      packageId,
      fileName: pkg.fileName || pkg.name,
      presignedUrl,
      expiresAt: new Date(Date.now() + 3600 * 1000),
      checksum: pkg.checksum,
      checksumType: pkg.checksumType,
    };
  }

  /**
   * Get download URLs for multiple packages (for deployments)
   */
  async getPackageDownloadUrls(packageIds: string[]): Promise<PackageDownloadUrl[]> {
    const results: PackageDownloadUrl[] = [];

    for (const packageId of packageIds) {
      try {
        const url = await this.getPackageDownloadUrl(packageId);
        results.push(url);
      } catch {
        // Skip packages that can't be downloaded
        continue;
      }
    }

    return results;
  }

  // ============================================
  // Bundle Operations
  // ============================================

  /**
   * Create a bundle of packages
   */
  async createBundle(input: CreateBundleInput, createdBy?: string): Promise<BundleResponse> {
    const bundleId = `HUB-${uuidv4().slice(0, 8).toUpperCase()}`;

    // Verify all packages exist
    const packages = await prisma.softwarePackage.findMany({
      where: { id: { in: input.packageIds } },
    });

    if (packages.length !== input.packageIds.length) {
      throw new BadRequestError('Some packages not found');
    }

    const bundle = await prisma.hubBundle.create({
      data: {
        bundleId,
        name: input.name,
        description: input.description,
        platform: input.platform,
        createdBy,
        items: {
          create: input.packageIds.map((pkgId, index) => ({
            packageId: pkgId,
            order: index,
          })),
        },
      },
      include: {
        items: {
          include: { package: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    return this.formatBundleResponse(bundle);
  }

  /**
   * Get a bundle by ID
   */
  async getBundle(bundleId: string): Promise<BundleResponse> {
    const bundle = await prisma.hubBundle.findUnique({
      where: { bundleId },
      include: {
        items: {
          include: { package: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!bundle) {
      throw new NotFoundError('Bundle not found');
    }

    return this.formatBundleResponse(bundle);
  }

  /**
   * List all bundles
   */
  async listBundles(platform?: string): Promise<BundleResponse[]> {
    const where: Record<string, unknown> = {};
    if (platform) where.platform = platform;

    const bundles = await prisma.hubBundle.findMany({
      where,
      include: {
        items: {
          include: { package: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return bundles.map(b => this.formatBundleResponse(b));
  }

  /**
   * Delete a bundle
   */
  async deleteBundle(bundleId: string): Promise<void> {
    const bundle = await prisma.hubBundle.findUnique({
      where: { bundleId },
    });

    if (!bundle) {
      throw new NotFoundError('Bundle not found');
    }

    await prisma.hubBundle.delete({
      where: { id: bundle.id },
    });
  }

  // ============================================
  // Statistics
  // ============================================

  /**
   * Get hub statistics
   */
  async getStats(): Promise<{
    totalPackages: number;
    activePackages: number;
    totalSize: bigint;
    byPlatform: Record<string, number>;
    byCategory: Record<string, number>;
    totalBundles: number;
  }> {
    const [
      totalPackages,
      activePackages,
      sizeStats,
      platformStats,
      categoryStats,
      totalBundles,
    ] = await Promise.all([
      prisma.softwarePackage.count(),
      prisma.softwarePackage.count({ where: { isActive: true } }),
      prisma.softwarePackage.aggregate({
        _sum: { fileSize: true },
      }),
      prisma.softwarePackage.groupBy({
        by: ['platform'],
        _count: true,
      }),
      prisma.softwarePackage.groupBy({
        by: ['category'],
        _count: true,
        where: { category: { not: null } },
      }),
      prisma.hubBundle.count(),
    ]);

    const byPlatform: Record<string, number> = {};
    platformStats.forEach(stat => {
      byPlatform[stat.platform] = stat._count;
    });

    const byCategory: Record<string, number> = {};
    categoryStats.forEach(stat => {
      if (stat.category) {
        byCategory[stat.category] = stat._count;
      }
    });

    return {
      totalPackages,
      activePackages,
      totalSize: sizeStats._sum.fileSize || BigInt(0),
      byPlatform,
      byCategory,
      totalBundles,
    };
  }

  // ============================================
  // Helper Methods
  // ============================================

  private formatPackageResponse(pkg: {
    id: string;
    packageId: string;
    name: string;
    displayName: string;
    version: string;
    vendor: string | null;
    category: string | null;
    platform: string;
    architecture: string | null;
    installSource: string;
    silentInstall: boolean;
    requiresReboot: boolean;
    minioObjectKey: string | null;
    fileName: string | null;
    fileSize: bigint | null;
    downloadUrl: string | null;
    description: string | null;
    tags: string[];
    supportsRollback: boolean;
    isActive: boolean;
    isVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): PackageResponse {
    return {
      id: pkg.id,
      packageId: pkg.packageId,
      name: pkg.name,
      displayName: pkg.displayName,
      version: pkg.version,
      vendor: pkg.vendor,
      category: pkg.category,
      platform: pkg.platform,
      architecture: pkg.architecture,
      installSource: pkg.installSource,
      silentInstall: pkg.silentInstall,
      requiresReboot: pkg.requiresReboot,
      fileName: pkg.fileName,
      fileSize: pkg.fileSize ? this.formatFileSize(pkg.fileSize) : null,
      fileSizeBytes: pkg.fileSize,
      hasFile: !!pkg.minioObjectKey,
      downloadUrl: pkg.downloadUrl,
      description: pkg.description,
      tags: pkg.tags,
      supportsRollback: pkg.supportsRollback,
      isActive: pkg.isActive,
      isVerified: pkg.isVerified,
      createdAt: pkg.createdAt.toISOString(),
      updatedAt: pkg.updatedAt.toISOString(),
    };
  }

  private formatBundleResponse(bundle: {
    id: string;
    bundleId: string;
    name: string;
    description: string | null;
    platform: string;
    createdAt: Date;
    updatedAt: Date;
    items: Array<{
      order: number;
      package: {
        id: string;
        packageId: string;
        name: string;
        displayName: string;
        version: string;
      };
    }>;
  }): BundleResponse {
    return {
      id: bundle.id,
      bundleId: bundle.bundleId,
      name: bundle.name,
      description: bundle.description,
      platform: bundle.platform,
      packages: bundle.items.map(item => ({
        id: item.package.id,
        packageId: item.package.packageId,
        name: item.package.name,
        displayName: item.package.displayName,
        version: item.package.version,
        order: item.order,
      })),
      createdAt: bundle.createdAt.toISOString(),
      updatedAt: bundle.updatedAt.toISOString(),
    };
  }

  private formatFileSize(bytes: bigint): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = Number(bytes);
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}

export const hubService = new HubService();
