import { Prisma } from '@prisma/client';
import { BaseCrudService, type ListQuery } from '@shared/services/base-crud.service';
import type { SoftwareLicenseResponse } from './assets.types';
import type { SoftwareLicenseCreateInput, SoftwareLicenseUpdateInput } from './assets.validators';

type SoftwareLicenseModel = Prisma.SoftwareLicenseGetPayload<object>;

export class SoftwareLicenseCrudService extends BaseCrudService<
  SoftwareLicenseModel,
  SoftwareLicenseCreateInput,
  SoftwareLicenseUpdateInput,
  SoftwareLicenseResponse,
  ListQuery
> {
  constructor() {
    super({
      modelName: 'softwareLicense',
      entityName: 'Software license',
      defaultOrderBy: { createdAt: 'desc' },
      searchFields: ['licenseName', 'softwareName'],
    });
  }

  protected transform(license: SoftwareLicenseModel): SoftwareLicenseResponse {
    return {
      id: license.id,
      licenseName: license.licenseName,
      softwareName: license.softwareName,
      publisher: license.publisher,
      licenseKey: license.licenseKey,
      purchaseDate: license.purchaseDate?.toISOString()?.split('T')[0] ?? null,
      expiryDate: license.expiryDate?.toISOString()?.split('T')[0] ?? null,
      licenseCount: license.licenseCount,
      vendorName: license.vendorName,
      cost: license.cost ? Number(license.cost) : null,
      status: license.status,
      notes: license.notes,
      createdAt: license.createdAt instanceof Date ? license.createdAt.toISOString() : license.createdAt,
    };
  }

  /** Override create to handle date string → Date conversion */
  override async create(data: SoftwareLicenseCreateInput): Promise<SoftwareLicenseResponse> {
    const record = await this.delegate.create({
      data: {
        licenseName: data.licenseName,
        softwareName: data.softwareName,
        publisher: data.publisher || null,
        licenseKey: data.licenseKey || null,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        licenseCount: data.licenseCount,
        vendorName: data.vendorName,
        cost: data.cost || null,
        status: data.status,
        notes: data.notes || null,
      },
    });
    return this.transform(record as SoftwareLicenseModel);
  }

  /** Override update to handle date string → Date conversion */
  override async update(id: string, data: SoftwareLicenseUpdateInput): Promise<SoftwareLicenseResponse> {
    await this.ensureExists(id);

    const record = await this.delegate.update({
      where: { id },
      data: {
        licenseName: data.licenseName ?? undefined,
        softwareName: data.softwareName ?? undefined,
        publisher: data.publisher ?? undefined,
        licenseKey: data.licenseKey ?? undefined,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
        licenseCount: data.licenseCount ?? undefined,
        vendorName: data.vendorName ?? undefined,
        cost: data.cost ?? undefined,
        status: data.status ?? undefined,
        notes: data.notes ?? undefined,
      },
    });
    return this.transform(record as SoftwareLicenseModel);
  }
}

export const softwareLicenseCrudService = new SoftwareLicenseCrudService();
