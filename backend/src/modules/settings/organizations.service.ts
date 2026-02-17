import { NotFoundError, BadRequestError, ConflictError } from '@shared/errors';
import { paginate, getPaginationParams } from '@shared/utils/pagination';
import { prisma } from '@db/client';
import type {
  OrganizationResponse,
  BranchResponse,
  DepartmentResponse,
  LocationResponse,
  OrgTreeResponse,
  DeleteImpactResponse,
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

    // Batch-query counts for all organizations
    const orgIds = organizations.map(o => o.id);

    const [branchCounts, userCounts, assetCounts] = await Promise.all([
      prisma.branch.groupBy({
        by: ['organizationId'],
        where: { organizationId: { in: orgIds } },
        _count: true,
      }),
      prisma.user.groupBy({
        by: ['organizationId'],
        where: {
          organizationId: { in: orgIds },
          deletedAt: null,
        },
        _count: true,
      }),
      prisma.asset.groupBy({
        by: ['organizationId'],
        where: { organizationId: { in: orgIds } },
        _count: true,
      }),
    ]);

    // Create maps for quick lookup
    const branchCountMap = new Map(branchCounts.map(b => [b.organizationId, b._count]));
    const userCountMap = new Map(userCounts.map(u => [u.organizationId, u._count]));
    const assetCountMap = new Map(assetCounts.map(a => [a.organizationId, a._count]));

    const data = organizations.map((o) =>
      this.transformOrganization(o, {
        branchCount: branchCountMap.get(o.id) ?? 0,
        userCount: userCountMap.get(o.id) ?? 0,
        assetCount: assetCountMap.get(o.id) ?? 0,
      })
    );
    return paginate(data, total, params);
  }

  async getOrganization(id: string): Promise<OrganizationResponse> {
    const org = await prisma.organization.findUnique({
      where: { id },
    });

    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    // Query real counts for this organization
    const [branchCount, userCount, assetCount] = await Promise.all([
      prisma.branch.count({ where: { organizationId: id } }),
      prisma.user.count({
        where: {
          organizationId: id,
          deletedAt: null,
        },
      }),
      prisma.asset.count({ where: { organizationId: id } }),
    ]);

    return this.transformOrganization(org, {
      branchCount,
      userCount,
      assetCount,
    });
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

  async deleteOrganization(id: string, options?: { cascade?: boolean; reassignTo?: string }): Promise<void> {
    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        branches: {
          include: {
            departments: true,
          },
        },
        users: { where: { deletedAt: null } },
      },
    });

    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    if (org.isDefault) {
      throw new BadRequestError('Cannot delete default organization');
    }

    // Default behavior (no options): Block if children exist
    if (!options?.cascade && !options?.reassignTo) {
      const branchCount = org.branches.length;
      const deptCount = org.branches.reduce((sum, b) => sum + b.departments.length, 0);
      const userCount = org.users.length;

      if (branchCount > 0 || deptCount > 0 || userCount > 0) {
        throw new BadRequestError(
          `Cannot delete organization with ${branchCount} branches, ${deptCount} departments, and ${userCount} users. Use cascade=true or reassignTo parameter.`
        );
      }
    }

    // Cascade deletion
    if (options?.cascade) {
      const defaultOrg = await prisma.organization.findFirst({
        where: { isDefault: true },
      });
      if (!defaultOrg) {
        throw new BadRequestError('Default organization not found for reassignment');
      }

      await prisma.$transaction(async (tx) => {
        // Reassign users to default org
        await tx.user.updateMany({
          where: { organizationId: id, deletedAt: null },
          data: { organizationId: defaultOrg.id, departmentId: null },
        });

        // Delete all departments in all branches
        const departmentIds = org.branches.flatMap(b => b.departments.map(d => d.id));
        if (departmentIds.length > 0) {
          await tx.department.deleteMany({
            where: { id: { in: departmentIds } },
          });
        }

        // Delete all branches
        await tx.branch.deleteMany({
          where: { organizationId: id },
        });

        // Delete the organization
        await tx.organization.delete({
          where: { id },
        });
      });
      return;
    }

    // Reassignment to target org
    if (options?.reassignTo) {
      const targetOrg = await prisma.organization.findUnique({
        where: { id: options.reassignTo },
      });
      if (!targetOrg) {
        throw new NotFoundError('Target organization not found');
      }
      if (targetOrg.id === id) {
        throw new BadRequestError('Cannot reassign to the same organization');
      }

      await prisma.$transaction(async (tx) => {
        // Move all branches to target org
        await tx.branch.updateMany({
          where: { organizationId: id },
          data: { organizationId: targetOrg.id },
        });

        // Delete the organization
        await tx.organization.delete({
          where: { id },
        });
      });
      return;
    }

    // Fallback: no children, simple delete
    await prisma.organization.delete({
      where: { id },
    });
  }

  async getOrganizationDeleteImpact(id: string): Promise<DeleteImpactResponse> {
    const org = await prisma.organization.findUnique({
      where: { id },
    });

    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    if (org.isDefault) {
      return {
        canDelete: false,
        blockedReason: 'Cannot delete default organization',
        impact: {
          branches: 0,
          departments: 0,
          users: 0,
          assets: 0,
        },
        affectedItems: {
          branches: [],
          departments: [],
          users: [],
        },
      };
    }

    const [branches, users, assets] = await Promise.all([
      prisma.branch.findMany({
        where: { organizationId: id },
        select: { id: true, name: true },
        take: 20,
      }),
      prisma.user.findMany({
        where: { organizationId: id, deletedAt: null },
        select: { id: true, email: true, name: true },
        take: 20,
      }),
      prisma.asset.count({ where: { organizationId: id } }),
    ]);

    const branchIds = branches.map(b => b.id);
    const [departments, branchCount, deptCount, userCount] = await Promise.all([
      prisma.department.findMany({
        where: { branchId: { in: branchIds } },
        select: { id: true, name: true },
        take: 20,
      }),
      prisma.branch.count({ where: { organizationId: id } }),
      prisma.department.count({ where: { branchId: { in: branchIds } } }),
      prisma.user.count({ where: { organizationId: id, deletedAt: null } }),
    ]);

    return {
      canDelete: true,
      impact: {
        branches: branchCount,
        departments: deptCount,
        users: userCount,
        assets,
      },
      affectedItems: {
        branches,
        departments,
        users,
      },
    };
  }

  async getOrgTree(): Promise<OrgTreeResponse> {
    // Fetch orgs with nested branches and departments
    const orgs = await prisma.organization.findMany({
      include: {
        branches: {
          include: {
            departments: true,
          },
          orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
        },
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    // Batch count queries
    const [orgUserCounts, orgAssetCounts, deptUserCounts, locationData] = await Promise.all([
      prisma.user.groupBy({ by: ['organizationId'], where: { deletedAt: null }, _count: true }),
      prisma.asset.groupBy({ by: ['organizationId'], _count: true }),
      prisma.user.groupBy({ by: ['departmentId'], where: { deletedAt: null }, _count: true }),
      prisma.location.findMany({
        include: {
          _count: { select: { users: { where: { deletedAt: null } }, assets: true } },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    // Build maps
    const orgUserMap = new Map(orgUserCounts.map(c => [c.organizationId ?? '', c._count]));
    const orgAssetMap = new Map(orgAssetCounts.map(c => [c.organizationId ?? '', c._count]));
    const deptUserMap = new Map(deptUserCounts.map(c => [c.departmentId ?? '', c._count]));

    let totalBranches = 0;
    let totalDepartments = 0;

    const organizations = orgs.map(org => {
      const orgUserCount = orgUserMap.get(org.id) ?? 0;
      const orgAssetCount = orgAssetMap.get(org.id) ?? 0;

      const branches = org.branches.map(branch => {
        totalBranches++;
        const departments = branch.departments.map(dept => {
          totalDepartments++;
          return {
            id: dept.id,
            name: dept.name,
            description: dept.description,
            userCount: deptUserMap.get(dept.id) ?? 0,
          };
        });

        const branchUserCount = departments.reduce((sum, d) => sum + d.userCount, 0);

        return {
          id: branch.id,
          name: branch.name,
          description: branch.description,
          isDefault: branch.isDefault,
          userCount: branchUserCount,
          assetCount: orgAssetCount, // org-level approximation
          departments,
        };
      });

      return {
        id: org.id,
        name: org.name,
        description: org.description,
        isDefault: org.isDefault,
        branchCount: branches.length,
        userCount: orgUserCount,
        assetCount: orgAssetCount,
        branches,
      };
    });

    const totalUsers = [...orgUserMap.values()].reduce((sum, c) => sum + c, 0);
    const totalAssets = [...orgAssetMap.values()].reduce((sum, c) => sum + c, 0);

    const locations = locationData.map(loc => ({
      id: loc.id,
      name: loc.name,
      city: loc.city,
      country: loc.country,
      userCount: loc._count.users,
      assetCount: loc._count.assets,
    }));

    return {
      organizations,
      locations,
      summary: {
        totalOrganizations: orgs.length,
        totalBranches,
        totalDepartments,
        totalLocations: locations.length,
        totalUsers,
        totalAssets,
      },
    };
  }

  private transformOrganization(
    org: {
      id: string;
      name: string;
      description: string | null;
      isDefault: boolean;
      createdAt: Date;
      updatedAt: Date;
    },
    counts?: {
      branchCount?: number;
      userCount?: number;
      assetCount?: number;
    }
  ): OrganizationResponse {
    return {
      id: org.id,
      name: org.name,
      description: org.description,
      isDefault: org.isDefault,
      branchCount: counts?.branchCount,
      userCount: counts?.userCount,
      assetCount: counts?.assetCount,
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
    const orgIds = branches.map(b => b.organizationId);

    const [userCounts, assetCounts] = await Promise.all([
      prisma.user.groupBy({
        by: ['departmentId'],
        where: {
          department: {
            branchId: { in: branchIds },
          },
          deletedAt: null,
        },
        _count: true,
      }),
      prisma.asset.groupBy({
        by: ['organizationId'],
        where: { organizationId: { in: orgIds } },
        _count: true,
      }),
    ]);

    // Create maps for quick lookup
    const userCountMap = new Map<string, number>();
    for (const branch of branches) {
      const departmentIds = branch.departments.map(d => d.id);
      const count = userCounts
        .filter(uc => uc.departmentId && departmentIds.includes(uc.departmentId))
        .reduce((sum, uc) => sum + uc._count, 0);
      userCountMap.set(branch.id, count);
    }

    const assetCountMap = new Map(assetCounts.map(a => [a.organizationId, a._count]));

    const data = branches.map(branch =>
      this.transformBranch(branch, userCountMap.get(branch.id) ?? 0, assetCountMap.get(branch.organizationId) ?? 0)
    );
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

    // Get user and asset counts for this branch
    const [userCount, assetCount] = await Promise.all([
      prisma.user.count({
        where: {
          department: { branchId: id },
          deletedAt: null,
        },
      }),
      prisma.asset.count({
        where: { organizationId: branch.organizationId },
      }),
    ]);

    return this.transformBranch(branch, userCount, assetCount);
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

    // Get asset count for the organization
    const assetCount = await prisma.asset.count({
      where: { organizationId: input.organizationId },
    });

    return this.transformBranch(branch, 0, assetCount);
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

    const [userCount, assetCount] = await Promise.all([
      prisma.user.count({
        where: {
          department: { branchId: id },
          deletedAt: null,
        },
      }),
      prisma.asset.count({
        where: { organizationId: updated.organizationId },
      }),
    ]);

    return this.transformBranch(updated, userCount, assetCount);
  }

  async deleteBranch(id: string, options?: { cascade?: boolean }): Promise<void> {
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

    const departmentIds = branch.departments.map(d => d.id);
    const userCount = await prisma.user.count({
      where: { departmentId: { in: departmentIds }, deletedAt: null },
    });

    // Default behavior: block if children exist
    if (!options?.cascade) {
      if (branch.departments.length > 0 || userCount > 0) {
        throw new BadRequestError(
          `Cannot delete branch with ${branch.departments.length} departments and ${userCount} users`
        );
      }
    }

    // Cascade deletion
    if (options?.cascade) {
      await prisma.$transaction(async (tx) => {
        // Set users' departmentId to null
        if (departmentIds.length > 0) {
          await tx.user.updateMany({
            where: { departmentId: { in: departmentIds }, deletedAt: null },
            data: { departmentId: null },
          });

          // Delete departments
          await tx.department.deleteMany({
            where: { branchId: id },
          });
        }

        // Delete branch
        await tx.branch.delete({
          where: { id },
        });
      });
      return;
    }

    // Fallback: no children, simple delete
    await prisma.branch.delete({
      where: { id },
    });
  }

  async getBranchDeleteImpact(id: string): Promise<DeleteImpactResponse> {
    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        organization: true,
      },
    });

    if (!branch) {
      throw new NotFoundError('Branch not found');
    }

    if (branch.isDefault) {
      return {
        canDelete: false,
        blockedReason: 'Cannot delete default branch',
        impact: {
          departments: 0,
          users: 0,
          assets: 0,
        },
        affectedItems: {
          departments: [],
          users: [],
        },
      };
    }

    const [departments, assets] = await Promise.all([
      prisma.department.findMany({
        where: { branchId: id },
        select: { id: true, name: true },
        take: 20,
      }),
      prisma.asset.count({ where: { organizationId: branch.organizationId } }),
    ]);

    const departmentIds = departments.map(d => d.id);
    const [users, deptCount, userCount] = await Promise.all([
      prisma.user.findMany({
        where: { departmentId: { in: departmentIds }, deletedAt: null },
        select: { id: true, email: true, name: true },
        take: 20,
      }),
      prisma.department.count({ where: { branchId: id } }),
      prisma.user.count({ where: { departmentId: { in: departmentIds }, deletedAt: null } }),
    ]);

    return {
      canDelete: true,
      impact: {
        departments: deptCount,
        users: userCount,
        assets,
      },
      affectedItems: {
        departments,
        users,
      },
    };
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
    userCount: number,
    assetCount: number
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
      assets: assetCount,
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

    // Batch-query user counts for all departments
    const departmentIds = departments.map(d => d.id);

    const userCounts = await prisma.user.groupBy({
      by: ['departmentId'],
      where: {
        departmentId: { in: departmentIds },
        deletedAt: null,
      },
      _count: true,
    });

    const userCountMap = new Map(userCounts.map(u => [u.departmentId, u._count]));

    const data = departments.map((d) =>
      this.transformDepartment(d, userCountMap.get(d.id) ?? 0)
    );
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

    // Query user count for this department
    const userCount = await prisma.user.count({
      where: {
        departmentId: id,
        deletedAt: null,
      },
    });

    return this.transformDepartment(department, userCount);
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

    return this.transformDepartment(department, 0);
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

    // Query user count for this department
    const userCount = await prisma.user.count({
      where: {
        departmentId: id,
        deletedAt: null,
      },
    });

    return this.transformDepartment(updated, userCount);
  }

  async deleteDepartment(id: string, options?: { cascade?: boolean }): Promise<void> {
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        users: { where: { deletedAt: null } },
      },
    });

    if (!department) {
      throw new NotFoundError('Department not found');
    }

    // Default behavior: block if children exist
    if (!options?.cascade) {
      if (department.users.length > 0) {
        throw new BadRequestError(`Cannot delete department with ${department.users.length} users`);
      }
    }

    // Cascade deletion
    if (options?.cascade) {
      await prisma.$transaction(async (tx) => {
        // Set users' departmentId to null
        await tx.user.updateMany({
          where: { departmentId: id, deletedAt: null },
          data: { departmentId: null },
        });

        // Delete enroll secrets tied to this department
        await tx.enrollSecret.deleteMany({
          where: { departmentId: id },
        });

        // Delete department
        await tx.department.delete({
          where: { id },
        });
      });
      return;
    }

    // Fallback: no children, simple delete
    await prisma.department.delete({
      where: { id },
    });
  }

  async getDepartmentDeleteImpact(id: string): Promise<DeleteImpactResponse> {
    const department = await prisma.department.findUnique({
      where: { id },
    });

    if (!department) {
      throw new NotFoundError('Department not found');
    }

    const [users, userCount, enrollSecretCount] = await Promise.all([
      prisma.user.findMany({
        where: { departmentId: id, deletedAt: null },
        select: { id: true, email: true, name: true },
        take: 20,
      }),
      prisma.user.count({
        where: { departmentId: id, deletedAt: null },
      }),
      prisma.enrollSecret.count({
        where: { departmentId: id },
      }),
    ]);

    return {
      canDelete: true,
      impact: {
        users: userCount,
        assets: 0,
        enrollSecrets: enrollSecretCount,
      },
      affectedItems: {
        users,
      },
    };
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
  }, userCount?: number): DepartmentResponse {
    return {
      id: department.id,
      name: department.name,
      description: department.description,
      branchId: department.branchId,
      branchName: department.branch.name,
      organizationName: department.branch.organization.name,
      userCount,
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

  async getLocationDeleteImpact(id: string): Promise<DeleteImpactResponse> {
    const location = await prisma.location.findUnique({
      where: { id },
    });

    if (!location) {
      throw new NotFoundError('Location not found');
    }

    const [users, userCount, assetCount] = await Promise.all([
      prisma.user.findMany({
        where: { locationId: id, deletedAt: null },
        select: { id: true, email: true, name: true },
        take: 20,
      }),
      prisma.user.count({
        where: { locationId: id, deletedAt: null },
      }),
      prisma.asset.count({
        where: { locationId: id },
      }),
    ]);

    return {
      canDelete: true,
      impact: {
        users: userCount,
        assets: assetCount,
      },
      affectedItems: {
        users,
      },
    };
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
