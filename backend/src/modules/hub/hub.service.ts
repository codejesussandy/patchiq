/**
 * Hub Service
 * Manages software packages in the central repository (Hub)
 * Integrates with MinIO for file storage
 */

import { prisma } from '@/db/client';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';
import * as tar from 'tar';
import { NotFoundError, BadRequestError } from '@shared/errors';
import { createLogger } from '@shared/services/logger';
import { minioStorage } from '@shared/services/minio.service';
import { typedJson } from '@shared/utils';
import { withTransaction } from '@shared/utils/transaction';
import {
  CreatePackageInput,
  UpdatePackageInput,
  PackageListFilters,
  PackageResponse,
  PackageDownloadUrl,
  CreateBundleInput,
  BundleResponse,
  PackageManifest,
  BundleUploadResult,
  BundleDownloadResponse,
  ScriptExecutionPayload,
  CreatePackageWithScriptsInput,
  GroupedPackageResponse,
  PackageVersionSummary,
} from './hub.types';

const _pipelineAsync = promisify(pipeline);
const logger = createLogger('hub');

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

  // ============================================
  // Script Bundle Operations (Hub-Centric)
  // ============================================

  /**
   * Upload a package bundle (.tar.gz or .zip) containing scripts and files
   * The bundle is extracted to validate manifest.json and scripts
   */
  async uploadPackageBundle(
    file: Buffer,
    fileName: string,
    createdBy?: string
  ): Promise<BundleUploadResult> {
    // Create temp directory for extraction
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'patchiq-bundle-'));

    try {
      // Write buffer to temp file
      const tempFile = path.join(tempDir, fileName);
      fs.writeFileSync(tempFile, file);

      // Extract based on file type
      const extractDir = path.join(tempDir, 'extracted');
      fs.mkdirSync(extractDir);

      if (fileName.endsWith('.tar.gz') || fileName.endsWith('.tgz')) {
        await tar.extract({
          file: tempFile,
          cwd: extractDir,
        });
      } else if (fileName.endsWith('.zip')) {
        // For zip files, we'd need unzipper package
        // For now, throw an error suggesting tar.gz
        throw new BadRequestError('Please use .tar.gz format for bundles. ZIP support coming soon.');
      } else {
        throw new BadRequestError('Bundle must be .tar.gz or .tgz format');
      }

      // Find manifest.json (might be in root or a subdirectory)
      const manifestPath = this.findFileInDir(extractDir, 'manifest.json');
      if (!manifestPath) {
        throw new BadRequestError('Bundle must contain a manifest.json file');
      }

      // Parse and validate manifest
      const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
      let manifest: PackageManifest;
      try {
        manifest = JSON.parse(manifestContent);
      } catch {
        throw new BadRequestError('Invalid manifest.json: must be valid JSON');
      }

      // Validate required manifest fields
      this.validateManifest(manifest);

      // Check scripts exist
      const bundleDir = path.dirname(manifestPath);
      const scriptsFound: string[] = [];

      if (manifest.scripts.install) {
        const scriptPath = path.join(bundleDir, manifest.scripts.install);
        if (!fs.existsSync(scriptPath)) {
          throw new BadRequestError(`Install script not found: ${manifest.scripts.install}`);
        }
        scriptsFound.push('install');
      }
      if (manifest.scripts.update) {
        const scriptPath = path.join(bundleDir, manifest.scripts.update);
        if (fs.existsSync(scriptPath)) scriptsFound.push('update');
      }
      if (manifest.scripts.rollback) {
        const scriptPath = path.join(bundleDir, manifest.scripts.rollback);
        if (fs.existsSync(scriptPath)) scriptsFound.push('rollback');
      }
      if (manifest.scripts.uninstall) {
        const scriptPath = path.join(bundleDir, manifest.scripts.uninstall);
        if (fs.existsSync(scriptPath)) scriptsFound.push('uninstall');
      }

      // Calculate bundle checksum
      const bundleChecksum = crypto.createHash('sha256').update(file).digest('hex');

      // Generate package ID and object key
      const packageId = `SWP-${uuidv4().slice(0, 8).toUpperCase()}`;
      const vendor = (manifest.vendor || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '-');
      const name = manifest.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const platform = manifest.platform.toLowerCase();
      const bundleObjectKey = `packages/${platform}/${vendor}/${name}/${manifest.version}/bundle.tar.gz`;

      // Upload bundle to MinIO
      await minioStorage.uploadBuffer(bundleObjectKey, file, {
        contentType: 'application/gzip',
        metadata: {
          'x-package-id': packageId,
          'x-package-name': manifest.name,
          'x-package-version': manifest.version,
          'x-checksum-sha256': bundleChecksum,
          'x-manifest': JSON.stringify(manifest),
        },
      });

      // Create package record in database
      await prisma.softwarePackage.create({
        data: {
          packageId,
          name: manifest.name,
          displayName: manifest.displayName,
          version: manifest.version,
          vendor: manifest.vendor,
          category: manifest.category,
          platform: manifest.platform,
          architecture: manifest.architecture,
          installSource: 'bundle',
          requiresReboot: manifest.requiresReboot ?? false,
          requiresRoot: manifest.requiresRoot ?? false,
          description: manifest.description,

          // Bundle storage
          bundleObjectKey,
          bundleChecksum,
          bundleSize: BigInt(file.length),
          manifestJson: JSON.parse(JSON.stringify(manifest)),
          scriptsIncluded: true,

          // Status
          isActive: true,
          isVerified: false,
          supportsRollback: !!manifest.scripts.rollback,
          createdBy,
        },
      });

      return {
        packageId,
        bundleObjectKey,
        bundleChecksum,
        bundleSize: file.length,
        manifest,
        scriptsFound,
      };
    } finally {
      // Cleanup temp directory
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }

  /**
   * Create a package with inline scripts (no bundle file needed)
   */
  async createPackageWithScripts(
    input: CreatePackageWithScriptsInput,
    createdBy?: string
  ): Promise<PackageResponse> {
    const packageId = `SWP-${uuidv4().slice(0, 8).toUpperCase()}`;

    const hasScripts = !!(input.scriptInstall || input.scriptUpdate || input.scriptRollback || input.scriptUninstall);

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
        installSource: hasScripts ? 'bundle' : input.installSource,
        installCommand: input.installCommand,
        installArgs: input.installArgs,
        silentInstall: input.silentInstall ?? true,
        requiresReboot: input.requiresReboot ?? false,
        requiresRoot: input.requiresRoot ?? false,
        downloadUrl: input.downloadUrl,
        description: input.description,
        releaseNotes: input.releaseNotes,
        iconUrl: input.iconUrl,
        tags: input.tags || [],

        // Inline scripts
        scriptInstall: input.scriptInstall,
        scriptUpdate: input.scriptUpdate,
        scriptRollback: input.scriptRollback,
        scriptUninstall: input.scriptUninstall,
        scriptsIncluded: hasScripts,

        // Legacy scripts (for backward compatibility)
        preInstallScript: input.preInstallScript,
        postInstallScript: input.postInstallScript,
        uninstallCommand: input.uninstallCommand,
        supportsRollback: !!input.scriptRollback || input.supportsRollback,
        rollbackCommand: input.rollbackCommand,

        isActive: true,
        isVerified: false,
        createdBy,
      },
    });

    return this.formatPackageResponse(pkg);
  }

  /**
   * Get bundle download info for agent deployment
   * Returns presigned URL, checksum, and manifest for script execution
   */
  async getBundleDownloadInfo(packageId: string): Promise<BundleDownloadResponse> {
    const pkg = await prisma.softwarePackage.findUnique({
      where: { packageId },
    });

    if (!pkg) {
      throw new NotFoundError('Package not found');
    }

    if (!pkg.bundleObjectKey) {
      throw new BadRequestError('Package does not have a bundle. Use inline scripts or upload a bundle first.');
    }

    // Generate presigned URL for bundle (valid for 1 hour)
    const bundleUrl = await minioStorage.getPresignedUrl(
      pkg.bundleObjectKey,
      {
        expirySeconds: 3600,
        responseContentDisposition: `attachment; filename="bundle.tar.gz"`,
      },
      pkg.minioBucket || undefined
    );

    const manifest = typedJson<PackageManifest>(pkg.manifestJson);

    return {
      packageId,
      bundleUrl,
      bundleChecksum: pkg.bundleChecksum || '',
      bundleSize: Number(pkg.bundleSize || 0),
      manifest: manifest!,
      expiresAt: new Date(Date.now() + 3600 * 1000),
    };
  }

  /**
   * Get bundle as a stream for proxy download
   * Used when agents can't directly access MinIO
   */
  async getBundleStream(packageId: string) {
    const pkg = await prisma.softwarePackage.findUnique({
      where: { packageId },
    });

    if (!pkg) {
      throw new NotFoundError('Package not found');
    }

    if (!pkg.bundleObjectKey) {
      throw new BadRequestError('Package does not have a bundle');
    }

    return minioStorage.downloadStream(pkg.bundleObjectKey, pkg.minioBucket || undefined);
  }

  /**
   * Get package file as a stream for proxy download (non-bundle installers: exe, msi)
   * Used when agents can't directly access MinIO
   */
  async getPackageFileStream(packageId: string): Promise<{ stream: NodeJS.ReadableStream; fileName: string; fileSize: bigint | null; checksum: string | null }> {
    const pkg = await prisma.softwarePackage.findUnique({
      where: { packageId },
    });

    if (!pkg) {
      throw new NotFoundError('Package not found');
    }

    if (!pkg.minioObjectKey) {
      throw new BadRequestError('Package does not have a file in MinIO');
    }

    const stream = await minioStorage.downloadStream(pkg.minioObjectKey, pkg.minioBucket || undefined);

    return {
      stream,
      fileName: pkg.fileName || `${pkg.name}-${pkg.version}`,
      fileSize: pkg.fileSize,
      checksum: pkg.checksum,
    };
  }

  /**
   * Get execution payload for agent - supports both bundle and inline script modes
   */
  async getExecutionPayload(
    packageId: string,
    operationType: 'install' | 'update' | 'rollback' | 'uninstall'
  ): Promise<ScriptExecutionPayload> {
    const pkg = await prisma.softwarePackage.findUnique({
      where: { packageId },
    });

    if (!pkg) {
      throw new NotFoundError('Package not found');
    }

    // Check if this is a bundle-based package
    if (pkg.bundleObjectKey && pkg.manifestJson) {
      // Bundle mode: agent will download and extract bundle
      const bundleUrl = await minioStorage.getPresignedUrl(
        pkg.bundleObjectKey,
        { expirySeconds: 3600 },
        pkg.minioBucket || undefined
      );

      const manifest = typedJson<PackageManifest>(pkg.manifestJson);

      return {
        operationType,
        packageId: pkg.packageId,
        packageName: pkg.name,
        version: pkg.version,
        bundleUrl,
        bundleChecksum: pkg.bundleChecksum || undefined,
        manifest: manifest!,
        requiresRoot: pkg.requiresRoot,
        environment: manifest?.environment,
      };
    }

    // Inline script mode: send script content directly
    let script: string | undefined;
    switch (operationType) {
      case 'install':
        script = pkg.scriptInstall || undefined;
        break;
      case 'update':
        script = pkg.scriptUpdate || undefined;
        break;
      case 'rollback':
        script = pkg.scriptRollback || undefined;
        break;
      case 'uninstall':
        script = pkg.scriptUninstall || pkg.uninstallCommand || undefined;
        break;
    }

    if (!script && pkg.installSource !== 'bundle') {
      // Fall back to legacy mode - agent will use package manager commands
      throw new BadRequestError(
        `Package "${pkg.name}" does not have scripts. Legacy mode not supported for ${operationType}.`
      );
    }

    return {
      operationType,
      packageId: pkg.packageId,
      packageName: pkg.name,
      version: pkg.version,
      script,
      requiresRoot: pkg.requiresRoot,
    };
  }

  // ============================================
  // Helper Methods for Bundle Operations
  // ============================================

  private findFileInDir(dir: string, filename: string): string | null {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isFile() && file === filename) {
        return fullPath;
      } else if (stat.isDirectory()) {
        const found = this.findFileInDir(fullPath, filename);
        if (found) return found;
      }
    }

    return null;
  }

  private validateManifest(manifest: PackageManifest): void {
    if (!manifest.name) {
      throw new BadRequestError('Manifest must include "name" field');
    }
    if (!manifest.displayName) {
      throw new BadRequestError('Manifest must include "displayName" field');
    }
    if (!manifest.version) {
      throw new BadRequestError('Manifest must include "version" field');
    }
    if (!manifest.platform) {
      throw new BadRequestError('Manifest must include "platform" field');
    }
    if (!manifest.scripts || !manifest.scripts.install) {
      throw new BadRequestError('Manifest must include "scripts.install" field');
    }

    const validPlatforms = ['windows', 'macos', 'linux', 'cross-platform'];
    if (!validPlatforms.includes(manifest.platform)) {
      throw new BadRequestError(`Invalid platform "${manifest.platform}". Must be one of: ${validPlatforms.join(', ')}`);
    }
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
        logger.error({ err: error }, 'Failed to delete file from MinIO');
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

    // Only show packages that have files in MinIO
    const where: Record<string, unknown> = {
      minioObjectKey: { not: null },
    };

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
   * List packages grouped by name + platform
   * Each group shows the latest version as the representative, with all versions nested
   */
  async listPackagesGrouped(filters: PackageListFilters = {}): Promise<{
    data: GroupedPackageResponse[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;

    // Only show packages that have files in MinIO
    const where: Record<string, unknown> = {
      minioObjectKey: { not: null },
    };

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

    // Fetch all matching packages (we group in-memory since Prisma doesn't support complex groupBy with nested data)
    const allPackages = await prisma.softwarePackage.findMany({
      where,
      orderBy: [{ name: 'asc' }, { version: 'desc' }],
    });

    // Group by name + platform
    const groupMap = new Map<string, typeof allPackages>();
    for (const pkg of allPackages) {
      const key = `${pkg.name}|||${pkg.platform}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push(pkg);
    }

    // Convert to grouped responses and sort by displayName
    const allGroups: GroupedPackageResponse[] = [];
    for (const [, packages] of groupMap) {
      // Sort versions: prefer verified, then by createdAt desc
      const sorted = [...packages].sort((a, b) => {
        if (a.isVerified !== b.isVerified) return a.isVerified ? -1 : 1;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

      const latest = sorted[0];

      const versions: PackageVersionSummary[] = sorted.map(pkg => ({
        id: pkg.id,
        packageId: pkg.packageId,
        version: pkg.version,
        hasFile: !!(pkg.minioObjectKey || pkg.bundleObjectKey),
        hasBundle: !!pkg.bundleObjectKey,
        isActive: pkg.isActive,
        isVerified: pkg.isVerified,
        installSource: pkg.installSource,
        fileSize: this.formatFileSize(pkg.fileSize || pkg.bundleSize || null),
        createdAt: pkg.createdAt.toISOString(),
      }));

      allGroups.push({
        name: latest.name,
        displayName: latest.displayName,
        vendor: latest.vendor,
        category: latest.category,
        platform: latest.platform,
        tags: latest.tags,
        description: latest.description,
        latestVersion: latest.version,
        latestPackageId: latest.packageId,
        totalVersions: packages.length,
        hasFile: packages.some(p => !!(p.minioObjectKey || p.bundleObjectKey)),
        isActive: packages.some(p => p.isActive),
        versions,
      });
    }

    // Sort groups by displayName
    allGroups.sort((a, b) => a.displayName.localeCompare(b.displayName));

    // Paginate at the group level
    const total = allGroups.length;
    const skip = (page - 1) * limit;
    const paginatedGroups = allGroups.slice(skip, skip + limit);

    return {
      data: paginatedGroups,
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

    const bundle = await withTransaction('createBundle', async (tx) => {
      // Verify all packages exist
      const packages = await tx.softwarePackage.findMany({
        where: { id: { in: input.packageIds } },
      });

      if (packages.length !== input.packageIds.length) {
        throw new BadRequestError('Some packages not found');
      }

      return tx.hubBundle.create({
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
    totalApplications: number;
    activePackages: number;
    totalSize: number;
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
      applicationGroups,
    ] = await Promise.all([
      prisma.softwarePackage.count(),
      prisma.softwarePackage.count({ where: { isActive: true } }),
      prisma.softwarePackage.aggregate({
        _sum: { fileSize: true, bundleSize: true },
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
      prisma.softwarePackage.groupBy({
        by: ['name'],
        _count: true,
      }),
    ]);
    const totalApplications = applicationGroups.length;

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
      totalApplications,
      activePackages,
      totalSize: Number((sizeStats._sum.fileSize || BigInt(0)) + (sizeStats._sum.bundleSize || BigInt(0))),
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
    requiresRoot?: boolean;
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
    // Bundle fields
    bundleObjectKey?: string | null;
    bundleChecksum?: string | null;
    bundleSize?: bigint | null;
    scriptsIncluded?: boolean;
    scriptInstall?: string | null;
    scriptUpdate?: string | null;
    scriptRollback?: string | null;
    scriptUninstall?: string | null;
    manifestJson?: unknown;
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
      requiresRoot: pkg.requiresRoot ?? false,
      fileName: pkg.fileName,
      fileSize: this.formatFileSize(pkg.fileSize || pkg.bundleSize || null),
      fileSizeBytes: pkg.fileSize ? Number(pkg.fileSize) : pkg.bundleSize ? Number(pkg.bundleSize) : null,
      hasFile: !!(pkg.minioObjectKey || pkg.bundleObjectKey),
      hasBundle: !!pkg.bundleObjectKey,
      scriptsIncluded: pkg.scriptsIncluded ?? false,
      downloadUrl: pkg.downloadUrl,
      description: pkg.description,
      tags: pkg.tags,
      supportsRollback: pkg.supportsRollback,
      isActive: pkg.isActive,
      isVerified: pkg.isVerified,
      createdAt: pkg.createdAt.toISOString(),
      updatedAt: pkg.updatedAt.toISOString(),
    } as PackageResponse;
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

  private formatFileSize(bytes: bigint | null | undefined): string | null {
    if (!bytes) return null;
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
