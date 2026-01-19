# Task 12: Tags & Onboarding Module

## Overview
Implement tag management for assets and user onboarding flow.

**Priority:** P2 - Supporting Feature
**Dependencies:** Tasks 03, 05
**Estimated Complexity:** Low
**Parallel:** Yes (with Tasks 11, 13)

---

## Reference Documents

| Document | Path | Purpose |
|----------|------|---------|
| Tags Implementation | `backend-debt/TAGS-IMPLEMENTATION.md` | Tag management |
| Onboarding | `backend-debt/ONBOARDING-IMPLEMENTATION.md` | User onboarding |

---

## Tags Endpoints

```
GET    /v1/tags                      - List all tags
POST   /v1/tags                      - Create tag
GET    /v1/tags/:id                  - Get tag details
PUT    /v1/tags/:id                  - Update tag
DELETE /v1/tags/:id                  - Delete tag
GET    /v1/tags/popular              - Popular tags by usage
POST   /v1/assets/:id/tags           - Add tags to asset
DELETE /v1/assets/:id/tags/:tagId    - Remove tag from asset
POST   /v1/assets/bulk-tags          - Bulk assign tags
```

---

## Data Models

### Tag

```typescript
interface Tag {
  id: string;
  name: string;
  description?: string;
  color?: string;              // Hex color for UI
  icon?: string;               // Icon name for UI
  priority: number;            // Sort order
  compliance: boolean;         // Is this a compliance tag?
  assetCount: number;          // Number of assets with this tag
  createdAt: string;
  updatedAt: string;
}
```

---

## Service Implementation

**src/modules/tags/tags.service.ts:**
```typescript
import { prisma } from '@/db/client';
import { NotFoundError, ConflictError } from '@shared/errors/httpErrors';
import { paginate, getPaginationParams } from '@shared/utils/pagination';

export class TagsService {
  async listTags(params: { search?: string; page: number; limit: number }) {
    const where: any = {};
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [tags, total] = await Promise.all([
      prisma.tag.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { name: 'asc' }],
        ...getPaginationParams(params),
      }),
      prisma.tag.count({ where }),
    ]);

    // Get asset counts for each tag
    const tagsWithCounts = await Promise.all(
      tags.map(async (tag) => {
        const count = await prisma.assetTag.count({
          where: { tagId: tag.id },
        });
        return { ...tag, assetCount: count };
      })
    );

    return paginate(tagsWithCounts, total, params);
  }

  async createTag(data: any) {
    // Check for duplicate name
    const existing = await prisma.tag.findUnique({
      where: { name: data.name },
    });
    if (existing) {
      throw new ConflictError('Tag name already exists');
    }

    return prisma.tag.create({
      data: {
        name: data.name,
        description: data.description,
        color: data.color,
        icon: data.icon,
        priority: data.priority || 0,
        compliance: data.compliance || false,
      },
    });
  }

  async updateTag(id: string, data: any) {
    const existing = await prisma.tag.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Tag not found');
    }

    // Check for duplicate name (if changing)
    if (data.name && data.name !== existing.name) {
      const duplicate = await prisma.tag.findUnique({
        where: { name: data.name },
      });
      if (duplicate) {
        throw new ConflictError('Tag name already exists');
      }
    }

    return prisma.tag.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        color: data.color,
        icon: data.icon,
        priority: data.priority,
        compliance: data.compliance,
      },
    });
  }

  async deleteTag(id: string) {
    const existing = await prisma.tag.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Tag not found');
    }

    // Delete tag and all associations
    await prisma.$transaction([
      prisma.assetTag.deleteMany({ where: { tagId: id } }),
      prisma.tag.delete({ where: { id } }),
    ]);
  }

  async getPopularTags(limit: number = 10) {
    const popular = await prisma.assetTag.groupBy({
      by: ['tagId'],
      _count: true,
      orderBy: { _count: { tagId: 'desc' } },
      take: limit,
    });

    const tagIds = popular.map((p) => p.tagId);
    const tags = await prisma.tag.findMany({
      where: { id: { in: tagIds } },
    });

    return tags.map((tag) => ({
      ...tag,
      assetCount: popular.find((p) => p.tagId === tag.id)?._count || 0,
    }));
  }

  async addTagsToAsset(assetId: string, tagIds: string[]) {
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) {
      throw new NotFoundError('Asset not found');
    }

    // Verify all tags exist
    const tags = await prisma.tag.findMany({
      where: { id: { in: tagIds } },
    });
    if (tags.length !== tagIds.length) {
      throw new NotFoundError('One or more tags not found');
    }

    // Add tags (ignore duplicates)
    await prisma.assetTag.createMany({
      data: tagIds.map((tagId) => ({ assetId, tagId })),
      skipDuplicates: true,
    });

    return this.getAssetTags(assetId);
  }

  async removeTagFromAsset(assetId: string, tagId: string) {
    await prisma.assetTag.delete({
      where: {
        assetId_tagId: { assetId, tagId },
      },
    });
  }

  async getAssetTags(assetId: string) {
    const assetTags = await prisma.assetTag.findMany({
      where: { assetId },
      include: { tag: true },
    });

    return assetTags.map((at) => at.tag);
  }

  async bulkAssignTags(assetIds: string[], tagIds: string[]) {
    const data = assetIds.flatMap((assetId) =>
      tagIds.map((tagId) => ({ assetId, tagId }))
    );

    await prisma.assetTag.createMany({
      data,
      skipDuplicates: true,
    });

    return { message: `Tags assigned to ${assetIds.length} assets` };
  }
}
```

---

## TDD Test Scenarios

```typescript
describe('Tags API', () => {
  describe('CRUD', () => {
    it('should create tag', async () => {
      const response = await request(app)
        .post('/v1/tags')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Production',
          color: '#ff0000',
          compliance: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Production');
    });

    it('should reject duplicate name', async () => {
      await request(app)
        .post('/v1/tags')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Duplicate' });

      const response = await request(app)
        .post('/v1/tags')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Duplicate' });

      expect(response.status).toBe(409);
    });

    it('should return tags with asset counts', async () => {
      const response = await request(app)
        .get('/v1/tags')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((tag: any) => {
        expect(tag).toHaveProperty('assetCount');
      });
    });
  });

  describe('Asset Tags', () => {
    it('should add tags to asset', async () => {
      const response = await request(app)
        .post(`/v1/assets/${assetId}/tags`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ tagIds: [tag1Id, tag2Id] });

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
    });

    it('should remove tag from asset', async () => {
      const response = await request(app)
        .delete(`/v1/assets/${assetId}/tags/${tagId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    it('should bulk assign tags', async () => {
      const response = await request(app)
        .post('/v1/assets/bulk-tags')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          assetIds: [asset1Id, asset2Id],
          tagIds: [tagId],
        });

      expect(response.status).toBe(200);
    });
  });
});
```

---

## Verification Checklist

- [ ] Tag CRUD works
- [ ] Unique name constraint enforced
- [ ] Asset counts calculated correctly
- [ ] Popular tags sorted by usage
- [ ] Add/remove tags from assets works
- [ ] Bulk tag assignment works
- [ ] Delete tag removes associations
- [ ] Search by name/description works
