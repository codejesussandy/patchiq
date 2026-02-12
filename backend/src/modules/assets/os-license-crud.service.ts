import { Prisma } from '@prisma/client';
import { BaseCrudService, type ListQuery } from '@shared/services/base-crud.service';
import type { OSLicenseResponse } from './assets.types';
import type { OSLicenseCreateInput, OSLicenseUpdateInput } from './assets.validators';

type OSLicenseModel = Prisma.OSLicenseGetPayload<object>;

export class OSLicenseCrudService extends BaseCrudService<
  OSLicenseModel,
  OSLicenseCreateInput,
  OSLicenseUpdateInput,
  OSLicenseResponse,
  ListQuery
> {
  constructor() {
    super({
      modelName: 'oSLicense',
      entityName: 'OS license',
      defaultOrderBy: { createdAt: 'desc' },
      searchFields: ['licenseName', 'osType'],
    });
  }

  protected transform(license: OSLicenseModel): OSLicenseResponse {
    return {
      id: license.id,
      licenseName: license.licenseName,
      osType: license.osType,
      status: license.status,
      licenseCount: license.licenseCount,
      vendorName: license.vendorName,
      licenseKey: license.licenseKey,
      purchaseDate: license.purchaseDate?.toISOString()?.split('T')[0] ?? null,
      expiryDate: license.expiryDate?.toISOString()?.split('T')[0] ?? null,
      publisher: license.publisher,
      cost: license.cost,
      notes: license.notes,
      createdAt: license.createdAt instanceof Date ? license.createdAt.toISOString() : license.createdAt,
    };
  }

  /** Override create to handle date string → Date conversion */
  override async create(data: OSLicenseCreateInput): Promise<OSLicenseResponse> {
    const record = await this.delegate.create({
      data: {
        licenseName: data.licenseName,
        osType: data.osType,
        status: data.status,
        licenseCount: data.licenseCount,
        vendorName: data.vendorName,
        licenseKey: data.licenseKey || null,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        publisher: data.publisher || null,
        cost: data.cost || null,
        notes: data.notes || null,
      },
    });
    return this.transform(record as OSLicenseModel);
  }

  /** Override update to handle date string → Date conversion */
  override async update(id: string, data: OSLicenseUpdateInput): Promise<OSLicenseResponse> {
    await this.ensureExists(id);

    const record = await this.delegate.update({
      where: { id },
      data: {
        licenseName: data.licenseName ?? undefined,
        osType: data.osType ?? undefined,
        status: data.status ?? undefined,
        licenseCount: data.licenseCount ?? undefined,
        vendorName: data.vendorName ?? undefined,
        licenseKey: data.licenseKey ?? undefined,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
        publisher: data.publisher ?? undefined,
        cost: data.cost ?? undefined,
        notes: data.notes ?? undefined,
      },
    });
    return this.transform(record as OSLicenseModel);
  }
}

export const osLicenseCrudService = new OSLicenseCrudService();
