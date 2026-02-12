import { Prisma } from '@prisma/client';
import { BaseCrudService, type ListQuery } from '@shared/services/base-crud.service';
import type { AlertConfigResponse } from './settings.types';
import type { CreateAlertConfigInput, UpdateAlertConfigInput } from './settings.validators';

type AlertConfigModel = Prisma.AlertConfigGetPayload<object>;

export class AlertConfigCrudService extends BaseCrudService<
  AlertConfigModel,
  CreateAlertConfigInput,
  UpdateAlertConfigInput,
  AlertConfigResponse,
  ListQuery
> {
  constructor() {
    super({
      modelName: 'alertConfig',
      entityName: 'Alert configuration',
      defaultOrderBy: { createdAt: 'desc' },
    });
  }

  protected transform(config: AlertConfigModel): AlertConfigResponse {
    const cfg = (config.config || {}) as Record<string, unknown>;
    return {
      id: config.id,
      name: (cfg.name as string) || '',
      type: config.type,
      channel: (cfg.channel as string) || '',
      recipients: (cfg.recipients as string) || '',
      enabled: config.enabled,
      description: (cfg.description as string) || '',
      module: (cfg.module as string) || '',
      severity: (cfg.severity as string) || '',
      scope: (cfg.scope as string) || '',
      endpoints: (cfg.endpoints as string) || '',
      conditions: (cfg.conditions as Record<string, unknown>[]) || [],
      actions: (cfg.actions as Record<string, unknown>[]) || [],
      remediations: (cfg.remediations as Record<string, unknown>[]) || [],
      createdAt: config.createdAt instanceof Date ? config.createdAt.toISOString() : config.createdAt,
      updatedAt: config.updatedAt instanceof Date ? config.updatedAt.toISOString() : config.updatedAt,
    };
  }

  override async create(data: CreateAlertConfigInput): Promise<AlertConfigResponse> {
    const { name, type, enabled, channel, recipients, description, module, severity, scope, endpoints, conditions, actions, remediations } = data;

    const record = await this.delegate.create({
      data: {
        type,
        enabled: enabled ?? true,
        config: JSON.parse(JSON.stringify({
          name,
          channel: channel || '',
          recipients: recipients || '',
          description: description || '',
          module: module || '',
          severity: severity || '',
          scope: scope || '',
          endpoints: endpoints || '',
          conditions: conditions || [],
          actions: actions || [],
          remediations: remediations || [],
        })),
      },
    });

    return this.transform(record as AlertConfigModel);
  }

  override async update(id: string, data: UpdateAlertConfigInput): Promise<AlertConfigResponse> {
    const existing = await this.ensureExists(id);
    const existingConfig = (existing.config || {}) as Record<string, unknown>;

    const updatedConfig: Record<string, unknown> = { ...existingConfig };
    if (data.name !== undefined) updatedConfig.name = data.name;
    if (data.channel !== undefined) updatedConfig.channel = data.channel;
    if (data.recipients !== undefined) updatedConfig.recipients = data.recipients;
    if (data.description !== undefined) updatedConfig.description = data.description;
    if (data.module !== undefined) updatedConfig.module = data.module;
    if (data.severity !== undefined) updatedConfig.severity = data.severity;
    if (data.scope !== undefined) updatedConfig.scope = data.scope;
    if (data.endpoints !== undefined) updatedConfig.endpoints = data.endpoints;
    if (data.conditions !== undefined) updatedConfig.conditions = data.conditions;
    if (data.actions !== undefined) updatedConfig.actions = data.actions;
    if (data.remediations !== undefined) updatedConfig.remediations = data.remediations;

    const record = await this.delegate.update({
      where: { id },
      data: {
        type: data.type ?? existing.type,
        enabled: data.enabled ?? existing.enabled,
        config: JSON.parse(JSON.stringify(updatedConfig)),
      },
    });

    return this.transform(record as AlertConfigModel);
  }
}

export const alertConfigCrudService = new AlertConfigCrudService();
