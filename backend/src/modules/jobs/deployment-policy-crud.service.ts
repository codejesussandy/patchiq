import { Prisma } from '@prisma/client';
import { NotFoundError } from '@shared/errors';
import { BaseCrudService } from '@shared/services/base-crud.service';
import type { PaginatedResponse } from '@shared/types';
import { formatDate } from '@shared/utils/date';
import { getPaginationParams, paginate } from '@shared/utils/pagination';
import { prisma } from '@/db/client';
import type {
  CreateDeploymentPolicyInput,
  UpdateDeploymentPolicyInput,
  DeploymentPolicyListQuery,
} from './jobs.validators';

type DeploymentPolicyModel = Prisma.DeploymentPolicyGetPayload<object>;

interface DeploymentPolicyResponse {
  id: string;
  policyId: string;
  name: string;
  description: string | null;
  type: string;
  supportedModule: string;
  relatedType: string;
  createdBy: string | null;
  createdOn: string;
}

export class DeploymentPolicyCrudService extends BaseCrudService<
  DeploymentPolicyModel,
  CreateDeploymentPolicyInput,
  UpdateDeploymentPolicyInput,
  DeploymentPolicyResponse,
  DeploymentPolicyListQuery
> {
  constructor() {
    super({
      modelName: 'deploymentPolicy',
      entityName: 'Policy',
      defaultOrderBy: { createdAt: 'desc' },
      searchFields: ['name'],
    });
  }

  protected transform(policy: DeploymentPolicyModel): DeploymentPolicyResponse {
    return {
      id: policy.id,
      policyId: policy.policyId,
      name: policy.name,
      description: policy.description,
      type: policy.type,
      supportedModule: policy.supportedModule,
      relatedType: policy.relatedType,
      createdBy: policy.createdBy,
      createdOn: formatDate(policy.createdAt),
    };
  }

  /**
   * List with the legacy paginate() response format (matches existing API shape).
   */
  async listPaginated(query: DeploymentPolicyListQuery): Promise<PaginatedResponse<DeploymentPolicyResponse>> {
    const where = this.buildWhere(query);
    const orderBy = this.buildOrderBy(query);

    const [records, total] = await Promise.all([
      this.delegate.findMany({
        where,
        orderBy,
        ...getPaginationParams(query),
      }),
      this.delegate.count({ where }),
    ]);

    return paginate(
      (records as DeploymentPolicyModel[]).map((r) => this.transform(r)),
      total,
      query,
    );
  }

  protected override buildWhere(query: DeploymentPolicyListQuery): Record<string, unknown> {
    const where = super.buildWhere(query);
    if (query.type) where.type = query.type;
    return where;
  }

  /**
   * Find by ID or policyId (e.g. "DPOL-001").
   * Overrides findById to support dual-lookup.
   */
  override async findById(id: string): Promise<DeploymentPolicyResponse> {
    const policy = await this.delegate.findFirst({
      where: { OR: [{ id }, { policyId: id }] },
    });
    if (!policy) {
      throw new NotFoundError('Policy not found');
    }
    return this.transform(policy as DeploymentPolicyModel);
  }

  /**
   * Create with auto-generated policyId.
   */
  async createWithUser(data: CreateDeploymentPolicyInput, userId: string): Promise<DeploymentPolicyResponse> {
    const count = await prisma.deploymentPolicy.count();
    const policyId = `DPOL-${String(count + 1).padStart(3, '0')}`;

    const policy = await this.delegate.create({
      data: {
        policyId,
        name: data.name,
        description: data.description,
        type: data.type,
        supportedModule: data.supportedModule,
        relatedType: data.relatedType,
        createdBy: userId,
      },
    });

    return this.transform(policy as DeploymentPolicyModel);
  }

  /**
   * Update by ID or policyId.
   */
  async updateByIdOrPolicyId(id: string, data: UpdateDeploymentPolicyInput): Promise<DeploymentPolicyResponse> {
    const existing = await this.delegate.findFirst({
      where: { OR: [{ id }, { policyId: id }] },
    });
    if (!existing) {
      throw new NotFoundError('Policy not found');
    }

    const updated = await this.delegate.update({
      where: { id: (existing as DeploymentPolicyModel).id },
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        supportedModule: data.supportedModule,
        relatedType: data.relatedType,
      },
    });

    return this.transform(updated as DeploymentPolicyModel);
  }

  /**
   * Delete by ID or policyId.
   */
  async deleteByIdOrPolicyId(id: string): Promise<{ message: string }> {
    const existing = await this.delegate.findFirst({
      where: { OR: [{ id }, { policyId: id }] },
    });
    if (!existing) {
      throw new NotFoundError('Policy not found');
    }

    await this.delegate.delete({ where: { id: (existing as DeploymentPolicyModel).id } });
    return { message: 'Policy deleted successfully' };
  }
}

export const deploymentPolicyCrudService = new DeploymentPolicyCrudService();
