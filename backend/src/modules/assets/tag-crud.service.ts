import { Prisma } from '@prisma/client';
import { BaseCrudService, type ListQuery } from '@shared/services/base-crud.service';
import { prisma } from '@/db/client';
import type { TagResponse } from './assets.types';
import type { TagCreateInput, TagUpdateInput } from './assets.validators';

type TagModel = Prisma.TagGetPayload<object>;

export interface TagListQuery extends ListQuery {
  search?: string;
}

export class TagCrudService extends BaseCrudService<
  TagModel,
  TagCreateInput,
  TagUpdateInput,
  TagResponse,
  TagListQuery
> {
  constructor() {
    super({
      modelName: 'tag',
      entityName: 'Tag',
      defaultOrderBy: [{ priority: 'desc' }, { name: 'asc' }],
      defaultLimit: 50,
      searchFields: ['name', 'description'],
    });
  }

  protected transform(tag: TagModel): TagResponse {
    return {
      id: tag.id,
      name: tag.name,
      color: tag.color,
      icon: tag.icon,
      description: tag.description,
      priority: tag.priority,
      compliance: tag.compliance,
      assetCount: 0, // Overridden in transformMany
      createdAt: tag.createdAt instanceof Date ? tag.createdAt.toISOString() : tag.createdAt,
      updatedAt: tag.updatedAt instanceof Date ? tag.updatedAt.toISOString() : tag.updatedAt,
    };
  }

  /** Batch-fetch asset counts for all tags in one query */
  protected override async transformMany(records: TagModel[]): Promise<TagResponse[]> {
    if (records.length === 0) return [];

    const tagIds = records.map((t) => t.id);
    const counts = await prisma.assetTag.groupBy({
      by: ['tagId'],
      where: { tagId: { in: tagIds } },
      _count: { tagId: true },
    });

    const countMap = new Map(counts.map((c) => [c.tagId, c._count.tagId]));

    return records.map((tag) => ({
      ...this.transform(tag),
      assetCount: countMap.get(tag.id) || 0,
    }));
  }

  protected override async beforeCreate(data: TagCreateInput): Promise<void> {
    await this.ensureUnique('name', data.name);
  }

  protected override async beforeUpdate(id: string, data: TagUpdateInput, existing: TagModel): Promise<void> {
    if (data.name && data.name !== existing.name) {
      await this.ensureUnique('name', data.name, id);
    }
  }

  /** Delete tag associations and tag in a transaction */
  override async delete(id: string): Promise<void> {
    await this.ensureExists(id);

    await this.withTx('delete', async (tx) => {
      await (tx as unknown as Record<string, { deleteMany: (args: unknown) => Promise<unknown> }>).assetTag.deleteMany({ where: { tagId: id } });
      await this.txDelegate(tx).delete({ where: { id } });
    });
  }

  /** Find by ID with asset count */
  override async findById(id: string): Promise<TagResponse> {
    const tag = await this.ensureExists(id);
    const assetCount = await prisma.assetTag.count({ where: { tagId: id } });
    return {
      ...this.transform(tag),
      assetCount,
    };
  }
}

export const tagCrudService = new TagCrudService();
