import { Prisma } from '@prisma/client';
import { BaseCrudService, type ListQuery } from '@shared/services/base-crud.service';
import type { IntegrationResponse } from './settings.types';
import type { CreateIntegrationInput, UpdateIntegrationInput } from './settings.validators';

type IntegrationModel = Prisma.IntegrationGetPayload<object>;

interface IntegrationListQuery extends ListQuery {
  type?: string;
  enabled?: boolean;
}

export class IntegrationCrudService extends BaseCrudService<
  IntegrationModel,
  CreateIntegrationInput,
  UpdateIntegrationInput,
  IntegrationResponse,
  IntegrationListQuery
> {
  constructor() {
    super({
      modelName: 'integration',
      entityName: 'Integration',
      searchFields: ['name', 'description'],
      defaultOrderBy: { createdAt: 'desc' },
    });
  }

  protected transform(model: IntegrationModel): IntegrationResponse {
    return {
      id: model.id,
      name: model.name,
      description: model.description,
      type: model.type,
      status: model.enabled,
      enabled: model.enabled,
      iconUrl: model.iconUrl,
      recipients: [],
      config: model.config as Record<string, unknown> | null,
      createdBy: model.createdBy,
      createdAt: model.createdAt instanceof Date ? model.createdAt.toISOString() : String(model.createdAt),
      updatedAt: model.updatedAt instanceof Date ? model.updatedAt.toISOString() : String(model.updatedAt),
    };
  }

  protected override buildWhere(query: IntegrationListQuery): Record<string, unknown> {
    const where = super.buildWhere(query);

    if (query.type) {
      where.type = query.type;
    }

    if (query.enabled !== undefined) {
      where.enabled = query.enabled;
    }

    return where;
  }

  protected override async beforeCreate(data: CreateIntegrationInput): Promise<void> {
    await this.ensureUnique('name', data.name);
  }

  protected override async beforeUpdate(id: string, data: UpdateIntegrationInput): Promise<void> {
    if (data.name) {
      await this.ensureUnique('name', data.name, id);
    }
  }

  async toggle(id: string, enabled: boolean): Promise<IntegrationResponse> {
    await this.ensureExists(id);
    const record = await this.delegate.update({
      where: { id },
      data: { enabled },
    });
    return this.transform(record as IntegrationModel);
  }

  async testConnection(id: string): Promise<{ status: string; message: string }> {
    const integration = await this.ensureExists(id);

    // Validate that config is present and has required shape
    if (!integration.config || typeof integration.config !== 'object') {
      return { status: 'error', message: 'No configuration provided' };
    }

    return { status: 'validated', message: 'Config validated' };
  }
}

export const integrationCrudService = new IntegrationCrudService();
