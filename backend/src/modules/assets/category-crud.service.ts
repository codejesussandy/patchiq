import { Prisma } from '@prisma/client';
import { BadRequestError } from '@shared/errors';
import { BaseCrudService, type ListQuery } from '@shared/services/base-crud.service';
import type { CategoryResponse } from './assets.types';
import type { CategoryCreateInput, CategoryUpdateInput } from './assets.validators';

type CategoryModel = Prisma.CategoryGetPayload<{ include: { subCategories: true } }>;

export class CategoryCrudService extends BaseCrudService<
  CategoryModel,
  CategoryCreateInput,
  CategoryUpdateInput,
  CategoryResponse,
  ListQuery
> {
  constructor() {
    super({
      modelName: 'category',
      entityName: 'Category',
      defaultInclude: { subCategories: true },
      defaultOrderBy: { name: 'asc' },
      searchFields: ['name'],
    });
  }

  protected transform(category: CategoryModel): CategoryResponse {
    return {
      id: category.id,
      name: category.name,
      color: category.color,
      description: category.description,
      isDefault: category.isDefault ?? false,
      createdAt: category.createdAt instanceof Date ? category.createdAt.toISOString() : category.createdAt,
      subCategories: category.subCategories?.map((sub) => ({
        id: sub.id,
        categoryId: sub.categoryId,
        name: sub.name,
        criticality: sub.criticality,
        description: sub.description,
        createdAt: sub.createdAt instanceof Date ? sub.createdAt.toISOString() : sub.createdAt,
      })),
    };
  }

  protected override async beforeCreate(data: CategoryCreateInput): Promise<void> {
    await this.ensureUnique('name', data.name);
  }

  protected override async beforeUpdate(id: string, data: CategoryUpdateInput, existing: CategoryModel): Promise<void> {
    if (data.name && data.name !== existing.name) {
      await this.ensureUnique('name', data.name, id);
    }
  }

  protected override async beforeDelete(_id: string, existing: CategoryModel): Promise<void> {
    if (existing.subCategories && existing.subCategories.length > 0) {
      throw new BadRequestError('Cannot delete category that has subcategories');
    }
  }
}

export const categoryCrudService = new CategoryCrudService();
