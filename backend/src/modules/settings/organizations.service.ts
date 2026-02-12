import { NotFoundError, BadRequestError, ConflictError } from '@shared/errors';
import { paginate, getPaginationParams } from '@shared/utils/pagination';
import { prisma } from '@db/client';
import type {
  OrganizationResponse,
  BranchResponse,
  DepartmentResponse,
  LocationResponse,
  PaginatedResponse,
} from './settings.types';
import type {
  CreateOrganizationInput,
  UpdateOrganizationInput,
  CreateBranchInput,
  UpdateBranchInput,
  CreateDepartmentInput,
  UpdateDepartmentInput,
  CreateLocationInput,
  UpdateLocationInput,
} from './settings.validators';

export class OrganizationsService {
  // ============================================
  // Organizations
  // ============================================

  async listOrganizations(params: { page: number; limit: number; search?: string }): Promise<PaginatedResponse<OrganizationResponse>> {
    const where: Record<string, unknown> = {};

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [organizations, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
        ...getPaginationParams(params),
      }),
      prisma.organization.count({ where }),
    ]);

    const data = organizations.map((o) => this.transformOrganization(o));
    return paginate(data, total, params);
  }

  async getOrganization(id: string): Promise<OrganizationResponse> {
    const org = await prisma.organization.findUnique({
      where: { id },
    });

    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    return this.transformOrganization(org);
  }

  async createOrganization(input: CreateOrganizationInput): Promise<OrganizationResponse> {
    // Check for duplicate name
    const existing = await prisma.organization.findUnique({
      where: { name: input.name },
    });

    if (existing) {
      throw new ConflictError('Organization name already exists');
    }

    // If setting as default, unset the current default
    if (input.isDefault) {
      await prisma.organization.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const org = await prisma.organization.create({
      data: {
        name: input.name,
        description: input.description,
        isDefault: input.isDefault ?? false,
      },
    });

    return this.transformOrganization(org);
  }

  async updateOrganization(id: string, input: UpdateOrganizationInput): Promise<OrganizationResponse> {
    const org = await prisma.organization.findUnique({
      where: { id },
    });

    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    // Cannot modify default organization name
    if (org.isDefault && input.name && input.name !== org.name) {
      throw new BadRequestError('Cannot modify default organization name');
    }

    // Check for duplicate name
    if (input.name && input.name !== org.name) {
      const existing = await prisma.organization.findUnique({
        where: { name: input.name },
      });
      if (existing) {
        throw new ConflictError('Organization name already exists');
      }
    }

    const updated = await prisma.organization.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
      },
    });

    return this.transformOrganization(updated);
  }

  async deleteOrganization(id: string): Promise<void> {
    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        branches: true,
        users: true,
      },
    });

    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    if (org.isDefault) {
      throw new BadRequestError('Cannot delete default organization');
    }

    if (org.branches.length > 0) {
      throw new BadRequestError('Cannot delete organization with branches');
    }

    if (org.users.length > 0) {
      throw new BadRequestError('Cannot delete organization with users');
    }

    await prisma.organization.delete({
      where: { id },
    });
  }

  private transformOrganization(org: {
    id: string;
    name: string;
    description: string | null;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): OrganizationResponse {
    return {
      id: org.id,
      name: org.name,
      description: org.description,
      isDefault: org.isDefault,
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
    };
  }

  // ============================================
  // Branches
  // ============================================

  async listBranches(params: { page: number; limit: number; search?: string; organizationId?: string }): Promise<PaginatedResponse<BranchResponse>> {
    const where: Record<string, unknown> = {};

    if (params.organizationId) {
      where.organizationId = params.organizationId;
    }

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [branches, total] = await Promise.all([
      prisma.branch.findMany({
        where,
        include: {
          organization: { select: { name: true } },
          departments: { select: { id: true } },
        },
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
        ...getPaginationParams(params),
      }),
      prisma.branch.count({ where }),
    ]);

    // Get user and asset counts for each branch
    const branchIds = branches.map(b => b.id);

    const userCounts = await prisma.user.groupBy({
      by: ['departmentId'],
      where: {
        department: {
          branchId: { in: branchIds },
        },
        deletedAt: null,
      },
      _count: true,
    });

    // Create a map of branchId -> user count
    const userCountMap = new Map<string, number>();
    for (const branch of branches) {
      const departmentIds = branch.departments.map(d => d.id);
      const count = userCounts
        .filter(uc => uc.departmentId && departmentIds.includes(uc.departmentId))
        .reduce((sum, uc) => sum + uc._count, 0);
      userCountMap.set(branch.id, count);
    }

    const data = branches.map(branch => this.transformBranch(branch, userCountMap.get(branch.id) ?? 0));
    return paginate(data, total, params);
  }

  async getBranch(id: string): Promise<BranchResponse> {
    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        organization: { select: { name: true } },
        departments: { select: { id: true } },
      },
    });

    if (!branch) {
      throw new NotFoundError('Branch not found');
    }

    // Get user count for this branch
    const userCount = await prisma.user.count({
      where: {
        department: { branchId: id },
        deletedAt: null,
      },
    });

    return this.transformBranch(branch, userCount);
  }

  async createBranch(input: CreateBranchInput): Promise<BranchResponse> {
    // Check organization exists
    const org = await prisma.organization.findUnique({
      where: { id: input.organizationId },
    });

    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    // Check for duplicate name within organization
    const existing = await prisma.branch.findUnique({
      where: {
        organizationId_name: {
          organizationId: input.organizationId,
          name: input.name,
        },
      },
    });

    if (existing) {
      throw new ConflictError('Branch name already exists in this organization');
    }

    // If setting as default, unset the current default in the organization
    if (input.isDefault) {
      await prisma.branch.updateMany({
        where: {
          organizationId: input.organizationId,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    const branch = await prisma.branch.create({
      data: {
        name: input.name,
        description: input.description,
        organizationId: input.organizationId,
        isDefault: input.isDefault ?? false,
      },
      include: {
        organization: { select: { name: true } },
        departments: { select: { id: true } },
      },
    });

    return this.transformBranch(branch, 0);
  }

  async updateBranch(id: string, input: UpdateBranchInput): Promise<BranchResponse> {
    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        organization: { select: { name: true } },
        departments: { select: { id: true } },
      },
    });

    if (!branch) {
      throw new NotFoundError('Branch not found');
    }

    // Cannot modify default branch name
    if (branch.isDefault && input.name && input.name !== branch.name) {
      throw new BadRequestError('Cannot modify default branch name');
    }

    // Check for duplicate name
    if (input.name && input.name !== branch.name) {
      const existing = await prisma.branch.findUnique({
        where: {
          organizationId_name: {
            organizationId: branch.organizationId,
            name: input.name,
          },
        },
      });
      if (existing) {
        throw new ConflictError('Branch name already exists in this organization');
      }
    }

    // If setting as default, unset the current default
    if (input.isDefault && !branch.isDefault) {
      await prisma.branch.updateMany({
        where: {
          organizationId: branch.organizationId,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.branch.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        isDefault: input.isDefault,
      },
      include: {
        organization: { select: { name: true } },
        departments: { select: { id: true } },
      },
    });

    const userCount = await prisma.user.count({
      where: {
        department: { branchId: id },
        deletedAt: null,
      },
    });

    return this.transformBranch(updated, userCount);
  }

  async deleteBranch(id: string): Promise<void> {
    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        departments: true,
      },
    });

    if (!branch) {
      throw new NotFoundError('Branch not found');
    }

    if (branch.isDefault) {
      throw new BadRequestError('Cannot delete default branch');
    }

    if (branch.departments.length > 0) {
      throw new BadRequestError('Cannot delete branch with departments');
    }

    await prisma.branch.delete({
      where: { id },
    });
  }

  private transformBranch(
    branch: {
      id: string;
      name: string;
      description: string | null;
      organizationId: string;
      isDefault: boolean;
      createdAt: Date;
      updatedAt: Date;
      organization: { name: string };
    },
    userCount: number
  ): BranchResponse {
    return {
      id: branch.id,
      name: branch.name,
      description: branch.description,
      organizationId: branch.organizationId,
      organizationName: branch.organization.name,
      isDefault: branch.isDefault,
      status: branch.isDefault ? 'Default' : 'Active',
      users: userCount,
      assets: 0, // TODO: Compute from assets
      createdAt: branch.createdAt.toISOString(),
      updatedAt: branch.updatedAt.toISOString(),
    };
  }

  // ============================================
  // Departments
  // ============================================

  async listDepartments(params: { page: number; limit: number; search?: string; branchId?: string }): Promise<PaginatedResponse<DepartmentResponse>> {
    const where: Record<string, unknown> = {};

    if (params.branchId) {
      where.branchId = params.branchId;
    }

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [departments, total] = await Promise.all([
      prisma.department.findMany({
        where,
        include: {
          branch: {
            select: {
              name: true,
              organization: { select: { name: true } },
            },
          },
        },
        orderBy: { name: 'asc' },
        ...getPaginationParams(params),
      }),
      prisma.department.count({ where }),
    ]);

    const data = departments.map((d) => this.transformDepartment(d));
    return paginate(data, total, params);
  }

  async getDepartment(id: string): Promise<DepartmentResponse> {
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        branch: {
          select: {
            name: true,
            organization: { select: { name: true } },
          },
        },
      },
    });

    if (!department) {
      throw new NotFoundError('Department not found');
    }

    return this.transformDepartment(department);
  }

  async createDepartment(input: CreateDepartmentInput): Promise<DepartmentResponse> {
    // Check branch exists
    const branch = await prisma.branch.findUnique({
      where: { id: input.branchId },
      include: { organization: { select: { name: true } } },
    });

    if (!branch) {
      throw new NotFoundError('Branch not found');
    }

    // Check for duplicate name within branch
    const existing = await prisma.department.findUnique({
      where: {
        branchId_name: {
          branchId: input.branchId,
          name: input.name,
        },
      },
    });

    if (existing) {
      throw new ConflictError('Department name already exists in this branch');
    }

    const department = await prisma.department.create({
      data: {
        name: input.name,
        description: input.description,
        branchId: input.branchId,
      },
      include: {
        branch: {
          select: {
            name: true,
            organization: { select: { name: true } },
          },
        },
      },
    });

    return this.transformDepartment(department);
  }

  async updateDepartment(id: string, input: UpdateDepartmentInput): Promise<DepartmentResponse> {
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        branch: {
          select: {
            name: true,
            organization: { select: { name: true } },
          },
        },
      },
    });

    if (!department) {
      throw new NotFoundError('Department not found');
    }

    // Check for duplicate name
    if (input.name && input.name !== department.name) {
      const existing = await prisma.department.findUnique({
        where: {
          branchId_name: {
            branchId: department.branchId,
            name: input.name,
          },
        },
      });
      if (existing) {
        throw new ConflictError('Department name already exists in this branch');
      }
    }

    const updated = await prisma.department.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
      },
      include: {
        branch: {
          select: {
            name: true,
            organization: { select: { name: true } },
          },
        },
      },
    });

    return this.transformDepartment(updated);
  }

  async deleteDepartment(id: string): Promise<void> {
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        users: true,
      },
    });

    if (!department) {
      throw new NotFoundError('Department not found');
    }

    if (department.users.length > 0) {
      throw new BadRequestError('Cannot delete department with users');
    }

    await prisma.department.delete({
      where: { id },
    });
  }

  private transformDepartment(department: {
    id: string;
    name: string;
    description: string | null;
    branchId: string;
    createdAt: Date;
    updatedAt: Date;
    branch: {
      name: string;
      organization: { name: string };
    };
  }): DepartmentResponse {
    return {
      id: department.id,
      name: department.name,
      description: department.description,
      branchId: department.branchId,
      branchName: department.branch.name,
      organizationName: department.branch.organization.name,
      createdAt: department.createdAt.toISOString(),
      updatedAt: department.updatedAt.toISOString(),
    };
  }

  // ============================================
  // Locations
  // ============================================

  async listLocations(params: { page: number; limit: number; search?: string }): Promise<PaginatedResponse<LocationResponse>> {
    const where: Record<string, unknown> = {};

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { address: { contains: params.search, mode: 'insensitive' } },
        { city: { contains: params.search, mode: 'insensitive' } },
        { country: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [locations, total] = await Promise.all([
      prisma.location.findMany({
        where,
        orderBy: { name: 'asc' },
        ...getPaginationParams(params),
      }),
      prisma.location.count({ where }),
    ]);

    const data = locations.map((l) => this.transformLocation(l));
    return paginate(data, total, params);
  }

  async getLocation(id: string): Promise<LocationResponse> {
    const location = await prisma.location.findUnique({
      where: { id },
    });

    if (!location) {
      throw new NotFoundError('Location not found');
    }

    return this.transformLocation(location);
  }

  async createLocation(input: CreateLocationInput): Promise<LocationResponse> {
    // Check for duplicate name
    const existing = await prisma.location.findUnique({
      where: { name: input.name },
    });

    if (existing) {
      throw new ConflictError('Location name already exists');
    }

    const location = await prisma.location.create({
      data: {
        name: input.name,
        address: input.address,
        city: input.city,
        country: input.country,
        timezone: input.timezone,
      },
    });

    return this.transformLocation(location);
  }

  async updateLocation(id: string, input: UpdateLocationInput): Promise<LocationResponse> {
    const location = await prisma.location.findUnique({
      where: { id },
    });

    if (!location) {
      throw new NotFoundError('Location not found');
    }

    // Check for duplicate name
    if (input.name && input.name !== location.name) {
      const existing = await prisma.location.findUnique({
        where: { name: input.name },
      });
      if (existing) {
        throw new ConflictError('Location name already exists');
      }
    }

    const updated = await prisma.location.update({
      where: { id },
      data: {
        name: input.name,
        address: input.address,
        city: input.city,
        country: input.country,
        timezone: input.timezone,
      },
    });

    return this.transformLocation(updated);
  }

  async deleteLocation(id: string): Promise<void> {
    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        users: true,
        assets: true,
      },
    });

    if (!location) {
      throw new NotFoundError('Location not found');
    }

    if (location.users.length > 0) {
      throw new BadRequestError('Cannot delete location with users');
    }

    if (location.assets.length > 0) {
      throw new BadRequestError('Cannot delete location with assets');
    }

    await prisma.location.delete({
      where: { id },
    });
  }

  private transformLocation(location: {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    country: string | null;
    timezone: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): LocationResponse {
    return {
      id: location.id,
      name: location.name,
      address: location.address,
      city: location.city,
      country: location.country,
      timezone: location.timezone,
      createdAt: location.createdAt.toISOString(),
      updatedAt: location.updatedAt.toISOString(),
    };
  }
}

export const organizationsService = new OrganizationsService();
