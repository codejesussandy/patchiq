import { NotFoundError } from '@shared/errors';
import { minioStorage } from '@shared/services/minio.service';
import { parseCsv } from '@shared/utils/csv-parser';
import { prisma } from '@/db/client';
import type {
  SoftwareInventoryResponse,
  SoftwareLicenseResponse,
  OSLicenseResponse,
} from './assets.types';
import type {
  SoftwareLicenseCreateInput as SoftwareLicenseCreateZod,
  SoftwareLicenseUpdateInput as SoftwareLicenseUpdateZod,
  OSLicenseCreateInput as OSLicenseCreateZod,
  OSLicenseUpdateInput as OSLicenseUpdateZod,
} from './assets.validators';
import {
  softwareInventoryCsvRowSchema,
  softwareLicenseCsvRowSchema,
  osLicenseCsvRowSchema,
} from './assets.validators';
import { osLicenseCrudService } from './os-license-crud.service';
import { softwareLicenseCrudService } from './software-license-crud.service';

// ============================================
// Software Inventory Service
// ============================================

export async function listSoftwareInventory(): Promise<SoftwareInventoryResponse[]> {
  // Aggregate software across all assets
  const software = await prisma.assetSoftware.groupBy({
    by: ['name', 'version', 'vendor'],
    _count: { _all: true },
  });

  return software.map((s, i) => ({
    id: `sw-${i + 1}`,
    softwareName: s.name,
    version: s.version,
    softwareType: 'Application',
    manufacturer: s.vendor,
    totalInstances: s._count._all,
    createdAt: new Date().toISOString(),
  }));
}

// Software Licenses — delegated to BaseCrudService (see software-license-crud.service.ts)
export async function listSoftwareLicenses(): Promise<SoftwareLicenseResponse[]> {
  const result = await softwareLicenseCrudService.findMany({ limit: 1000 });
  return result.data;
}
export const getSoftwareLicenseById = (id: string) => softwareLicenseCrudService.findById(id);
export const createSoftwareLicense = (data: SoftwareLicenseCreateZod) => softwareLicenseCrudService.create(data);
export const updateSoftwareLicense = (id: string, data: SoftwareLicenseUpdateZod) => softwareLicenseCrudService.update(id, data);
export const deleteSoftwareLicense = (id: string) => softwareLicenseCrudService.delete(id);

// OS Licenses — delegated to BaseCrudService (see os-license-crud.service.ts)
export async function listOSLicenses(): Promise<OSLicenseResponse[]> {
  const result = await osLicenseCrudService.findMany({ limit: 1000 });
  return result.data;
}
export const getOSLicenseById = (id: string) => osLicenseCrudService.findById(id);
export const createOSLicense = (data: OSLicenseCreateZod) => osLicenseCrudService.create(data);
export const updateOSLicense = (id: string, data: OSLicenseUpdateZod) => osLicenseCrudService.update(id, data);
export const deleteOSLicense = (id: string) => osLicenseCrudService.delete(id);

// ============================================
// File Upload & CSV Import
// ============================================

interface ImportResult {
  imported: number;
  failed: number;
  errors: Array<{ row: number; field?: string; message: string }>;
}

const ATTACHMENT_BUCKET = 'asset-attachments';

export async function uploadAttachment(
  assetId: string,
  file: { originalname: string; buffer: Buffer; mimetype: string; size: number },
  userId?: string
): Promise<{ id: string; fileName: string; fileSize: number; downloadUrl: string }> {
  // Verify asset exists
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  await minioStorage.ensureBucket(ATTACHMENT_BUCKET);

  const storageKey = `${assetId}/${Date.now()}-${file.originalname}`;
  await minioStorage.uploadBuffer(storageKey, file.buffer, {
    bucket: ATTACHMENT_BUCKET,
    contentType: file.mimetype,
  });

  const attachment = await prisma.assetAttachment.create({
    data: {
      assetId,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      storageKey,
      uploadedBy: userId,
    },
  });

  const downloadUrl = await minioStorage.getPresignedUrl(
    storageKey,
    { responseContentDisposition: `attachment; filename="${file.originalname}"` },
    ATTACHMENT_BUCKET
  );

  return {
    id: attachment.id,
    fileName: attachment.fileName,
    fileSize: attachment.fileSize,
    downloadUrl,
  };
}

export async function importSoftwareInventory(fileBuffer: Buffer, assetId?: string): Promise<ImportResult> {
  const rows = parseCsv(fileBuffer);
  const result: ImportResult = { imported: 0, failed: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const parsed = softwareInventoryCsvRowSchema.safeParse(rows[i]);
    if (!parsed.success) {
      result.failed++;
      for (const issue of parsed.error.issues) {
        result.errors.push({ row: i + 2, field: issue.path.join('.'), message: issue.message });
      }
      continue;
    }

    const row = parsed.data;
    await prisma.assetSoftware.create({
      data: {
        assetId: assetId || '00000000-0000-0000-0000-000000000000',
        name: row.name,
        version: row.version,
        vendor: row.vendor,
        installDate: row.installDate ? new Date(row.installDate) : undefined,
        installPath: row.installPath || undefined,
        category: row.category || undefined,
      },
    });
    result.imported++;
  }

  return result;
}

export async function importSoftwareLicenses(fileBuffer: Buffer): Promise<ImportResult> {
  const rows = parseCsv(fileBuffer);
  const result: ImportResult = { imported: 0, failed: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const parsed = softwareLicenseCsvRowSchema.safeParse(rows[i]);
    if (!parsed.success) {
      result.failed++;
      for (const issue of parsed.error.issues) {
        result.errors.push({ row: i + 2, field: issue.path.join('.'), message: issue.message });
      }
      continue;
    }

    const row = parsed.data;
    await prisma.softwareLicense.create({
      data: {
        licenseName: row.licenseName,
        softwareName: row.softwareName,
        vendorName: row.vendorName,
        licenseKey: row.licenseKey || undefined,
        publisher: row.publisher || undefined,
        purchaseDate: row.purchaseDate ? new Date(row.purchaseDate) : undefined,
        expiryDate: row.expiryDate ? new Date(row.expiryDate) : undefined,
        licenseCount: row.licenseCount ? parseInt(row.licenseCount, 10) : 1,
        cost: row.cost ? parseFloat(row.cost) : undefined,
        status: row.status || 'AVAILABLE',
        notes: row.notes || undefined,
      },
    });
    result.imported++;
  }

  return result;
}

export async function importOSLicenses(fileBuffer: Buffer): Promise<ImportResult> {
  const rows = parseCsv(fileBuffer);
  const result: ImportResult = { imported: 0, failed: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const parsed = osLicenseCsvRowSchema.safeParse(rows[i]);
    if (!parsed.success) {
      result.failed++;
      for (const issue of parsed.error.issues) {
        result.errors.push({ row: i + 2, field: issue.path.join('.'), message: issue.message });
      }
      continue;
    }

    const row = parsed.data;
    await prisma.oSLicense.create({
      data: {
        licenseName: row.licenseName,
        osType: row.osType,
        vendorName: row.vendorName,
        licenseKey: row.licenseKey || undefined,
        purchaseDate: row.purchaseDate ? new Date(row.purchaseDate) : undefined,
        expiryDate: row.expiryDate ? new Date(row.expiryDate) : undefined,
        licenseCount: row.licenseCount ? parseInt(row.licenseCount, 10) : 1,
        publisher: row.publisher || undefined,
        cost: row.cost || undefined,
        status: row.status || 'AVAILABLE',
        notes: row.notes || undefined,
      },
    });
    result.imported++;
  }

  return result;
}
