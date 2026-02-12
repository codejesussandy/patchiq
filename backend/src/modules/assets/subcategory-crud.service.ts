import { Prisma } from '@prisma/client';
import { NotFoundError, ConflictError } from '@shared/errors';
import { BaseCrudService, type ListQuery } from '@shared/services/base-crud.service';
import { prisma } from '@/db/client';
import type { SubCategoryResponse } from './assets.types';
import type { SubCategoryCreateInput, SubCategoryUpdateInput } from './assets.validators';

type SubCategoryModel = Prisma.SubCategoryGetPayload<{ include: { category: true } }>;

export interface SubCategoryListQuery extends ListQuery {
  categoryId?: string;
}

export class SubCategoryCrudService extends BaseCrudService<
  SubCategoryModel,
  SubCategoryCreateInput,
  SubCategoryUpdateInput,
  SubCategoryResponse,
  SubCategoryListQuery
> {
  constructor() {
    super({
      modelName: 'subCategory',
      entityName: 'Sub-category',
      defaultInclude: { category: true },
      defaultOrderBy: { name: 'asc' },
      searchFields: ['name'],
    });
  }

  protected transform(sc: SubCategoryModel): SubCategoryResponse {
    return {
      id: sc.id,
      categoryId: sc.categoryId,
      categoryName: sc.category?.name,
      name: sc.name,
      criticality: sc.criticality,
      description: sc.description,
      createdAt: sc.createdAt instanceof Date ? sc.createdAt.toISOString() : sc.createdAt,
    };
  }

  protected override buildWhere(query: SubCategoryListQuery): Record<string, unknown> {
    const where = super.buildWhere(query);
    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }
    return where;
  }

  protected override async beforeCreate(data: SubCategoryCreateInput): Promise<void> {
    // Ensure parent category exists
    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) {
      throw new NotFoundError('Category not found');
    }

    // Check duplicate name within the category
    const existing = await this.delegate.findFirst({
      where: {
        categoryId: data.categoryId,
        name: { equals: data.name, mode: 'insensitive' },
      },
    });
    if (existing) {
      throw new ConflictError(
        'Sub-category with this name already exists in this category'
      );
    }
  }

  override async create(data: SubCategoryCreateInput): Promise<SubCategoryResponse> {
    await this.beforeCreate(data);

    const sc = await this.delegate.create({
      data: {
        categoryId: data.categoryId,
        name: data.name,
        criticality: data.criticality || null,
        description: data.description || null,
      },
      include: this.config.defaultInclude,
    });

    return this.transform(sc as SubCategoryModel);
  }

  override async update(id: string, data: SubCategoryUpdateInput): Promise<SubCategoryResponse> {
    await this.ensureExists(id);

    const sc = await this.delegate.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        categoryId: data.categoryId ?? undefined,
        criticality: data.criticality ?? undefined,
        description: data.description ?? undefined,
      },
      include: this.config.defaultInclude,
    });

    return this.transform(sc as SubCategoryModel);
  }

  /**
   * List all subcategories, optionally filtered by categoryId.
   * Returns a flat array (no pagination) to match existing API shape.
   */
  async listAll(categoryId?: string): Promise<SubCategoryResponse[]> {
    const where: Record<string, unknown> = {};
    if (categoryId) where.categoryId = categoryId;

    const records = await this.delegate.findMany({
      where,
      include: this.config.defaultInclude,
      orderBy: { name: 'asc' },
    });

    return (records as SubCategoryModel[]).map((sc) => this.transform(sc));
  }
}

export const subCategoryCrudService = new SubCategoryCrudService();
