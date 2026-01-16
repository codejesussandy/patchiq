import { http, HttpResponse } from 'msw';
import type { Tag, AssetTag } from '../../types/asset.types';

const API_BASE_URL = '/v1';

// Mock tags with rich metadata
let tags: Tag[] = [
  {
    id: 'tag-1',
    name: 'Production',
    description: 'Assets in production environment',
    color: 'red',
    icon: 'fire',
    owner: 'DevOps Team',
    manager: 'Alex Chen',
    priority: 'Critical',
    status: 'Active',
    assetCount: 45,
    usageCount: 120,
    lastUsed: '2025-12-12T10:30:00Z',
    createdAt: '2024-01-15T00:00:00Z',
    complianceRequired: true,
    complianceTags: ['SOC2', 'ISO27001'],
    budget: '$250,000',
  },
  {
    id: 'tag-2',
    name: 'Development',
    description: 'Development and testing assets',
    color: 'blue',
    icon: 'code',
    owner: 'Engineering',
    manager: 'Sarah Johnson',
    priority: 'High',
    status: 'Active',
    assetCount: 32,
    usageCount: 85,
    lastUsed: '2025-12-11T15:20:00Z',
    createdAt: '2024-01-15T00:00:00Z',
    complianceRequired: false,
    budget: '$100,000',
  },
  {
    id: 'tag-3',
    name: 'Critical Infrastructure',
    description: 'Business-critical systems',
    color: 'volcano',
    icon: 'warning',
    owner: 'Infrastructure Team',
    manager: 'Mike Davis',
    priority: 'Critical',
    status: 'Active',
    assetCount: 18,
    usageCount: 54,
    lastUsed: '2025-12-12T09:00:00Z',
    createdAt: '2024-02-01T00:00:00Z',
    complianceRequired: true,
    complianceTags: ['HIPAA', 'SOC2', 'PCI-DSS'],
    budget: '$500,000',
  },
  {
    id: 'tag-4',
    name: 'Remote Work',
    description: 'Assets assigned to remote employees',
    color: 'cyan',
    icon: 'home',
    owner: 'IT Support',
    manager: 'Tom Brown',
    priority: 'Medium',
    status: 'Active',
    assetCount: 67,
    usageCount: 201,
    lastUsed: '2025-12-12T11:45:00Z',
    createdAt: '2024-03-10T00:00:00Z',
    complianceRequired: false,
    budget: '$150,000',
  },
  {
    id: 'tag-5',
    name: 'End of Life',
    description: 'Assets approaching end of life',
    color: 'orange',
    icon: 'clock-circle',
    owner: 'Asset Management',
    manager: 'Emma Wilson',
    priority: 'High',
    status: 'Active',
    assetCount: 12,
    usageCount: 35,
    lastUsed: '2025-12-10T14:00:00Z',
    createdAt: '2024-04-20T00:00:00Z',
    complianceRequired: false,
    budget: '$25,000',
  },
];

// Junction table for many-to-many relationship
let assetTags: AssetTag[] = [
  { assetId: '1', tagId: 'tag-1', assignedAt: '2025-01-10T00:00:00Z', assignedBy: 'admin' },
  { assetId: '1', tagId: 'tag-4', assignedAt: '2025-01-15T00:00:00Z', assignedBy: 'admin' },
  { assetId: '2', tagId: 'tag-2', assignedAt: '2025-02-01T00:00:00Z', assignedBy: 'admin' },
  { assetId: '2', tagId: 'tag-3', assignedAt: '2025-02-05T00:00:00Z', assignedBy: 'admin' },
];

export const tagHandlers = [
  // Get all tags
  http.get(`${API_BASE_URL}/tags`, () => {
    return HttpResponse.json(tags);
  }),

  // Get single tag
  http.get(`${API_BASE_URL}/tags/:tagId`, ({ params }) => {
    const tag = tags.find((t) => t.id === params.tagId);
    if (!tag) {
      return HttpResponse.json({ error: 'Tag not found' }, { status: 404 });
    }
    return HttpResponse.json(tag);
  }),

  // Create tag
  http.post(`${API_BASE_URL}/tags`, async ({ request }) => {
    const body: any = await request.json();
    const newTag: Tag = {
      id: `tag-${Date.now()}`,
      name: body.name,
      description: body.description,
      color: body.color || 'blue',
      icon: body.icon,
      owner: body.owner,
      manager: body.manager,
      priority: body.priority || 'Medium',
      status: body.status || 'Active',
      assetCount: 0,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      complianceRequired: body.complianceRequired || false,
      complianceTags: body.complianceTags || [],
      budget: body.budget,
      metadata: body.metadata,
    };
    tags.push(newTag);
    return HttpResponse.json(newTag, { status: 201 });
  }),

  // Update tag
  http.put(`${API_BASE_URL}/tags/:tagId`, async ({ params, request }) => {
    const tag = tags.find((t) => t.id === params.tagId);
    if (!tag) {
      return HttpResponse.json({ error: 'Tag not found' }, { status: 404 });
    }
    const body: any = await request.json();
    const updated = { ...tag, ...body, updatedAt: new Date().toISOString() };
    const index = tags.findIndex((t) => t.id === params.tagId);
    tags[index] = updated;
    return HttpResponse.json(updated);
  }),

  // Delete tag
  http.delete(`${API_BASE_URL}/tags/:tagId`, ({ params }) => {
    // Remove tag
    tags = tags.filter((t) => t.id !== params.tagId);
    // Remove all asset-tag relationships
    assetTags = assetTags.filter((at) => at.tagId !== params.tagId);
    return HttpResponse.json({ success: true }, { status: 204 });
  }),

  // Get tags for an asset
  http.get(`${API_BASE_URL}/assets/:assetId/tags`, ({ params }) => {
    const tagIds = assetTags
      .filter((at) => at.assetId === params.assetId)
      .map((at) => at.tagId);
    const assetTagList = tags.filter((t) => tagIds.includes(t.id));
    return HttpResponse.json(assetTagList);
  }),

  // Get assets for a tag
  http.get(`${API_BASE_URL}/tags/:tagId/assets`, ({ params }) => {
    const assetIds = assetTags
      .filter((at) => at.tagId === params.tagId)
      .map((at) => at.assetId);
    // In real implementation, fetch actual assets
    // For now, return asset IDs
    return HttpResponse.json(assetIds.map((id) => ({ id })));
  }),

  // Assign tags to asset
  http.post(`${API_BASE_URL}/assets/:assetId/tags`, async ({ params, request }) => {
    const body: any = await request.json();
    const { tagIds } = body;

    // Remove existing tags for this asset
    assetTags = assetTags.filter((at) => at.assetId !== params.assetId);

    // Add new tags
    tagIds.forEach((tagId: string) => {
      assetTags.push({
        assetId: params.assetId as string,
        tagId,
        assignedAt: new Date().toISOString(),
        assignedBy: 'current-user',
      });

      // Update tag usage count and last used
      const tag = tags.find((t) => t.id === tagId);
      if (tag) {
        tag.lastUsed = new Date().toISOString();
        tag.usageCount = (tag.usageCount || 0) + 1;
      }
    });

    // Update asset counts for all tags
    tags.forEach((tag) => {
      tag.assetCount = assetTags.filter((at) => at.tagId === tag.id).length;
    });

    return HttpResponse.json({ success: true });
  }),

  // Remove tag from asset
  http.delete(`${API_BASE_URL}/assets/:assetId/tags/:tagId`, ({ params }) => {
    assetTags = assetTags.filter(
      (at) => !(at.assetId === params.assetId && at.tagId === params.tagId)
    );

    // Update asset count for the tag
    const tag = tags.find((t) => t.id === params.tagId);
    if (tag) {
      tag.assetCount = assetTags.filter((at) => at.tagId === params.tagId).length;
    }

    return HttpResponse.json({ success: true }, { status: 204 });
  }),

  // Bulk assign tags
  http.post(`${API_BASE_URL}/tags/bulk-assign`, async ({ request }) => {
    const body: any = await request.json();
    const { assetIds, tagIds } = body;

    assetIds.forEach((assetId: string) => {
      tagIds.forEach((tagId: string) => {
        // Check if relationship already exists
        const exists = assetTags.some(
          (at) => at.assetId === assetId && at.tagId === tagId
        );
        if (!exists) {
          assetTags.push({
            assetId,
            tagId,
            assignedAt: new Date().toISOString(),
            assignedBy: 'current-user',
          });
        }
      });
    });

    // Update asset counts
    tags.forEach((tag) => {
      tag.assetCount = assetTags.filter((at) => at.tagId === tag.id).length;
    });

    return HttpResponse.json({ success: true });
  }),

  // Bulk remove tags
  http.post(`${API_BASE_URL}/tags/bulk-remove`, async ({ request }) => {
    const body: any = await request.json();
    const { assetIds, tagIds } = body;

    assetTags = assetTags.filter(
      (at) => !(assetIds.includes(at.assetId) && tagIds.includes(at.tagId))
    );

    // Update asset counts
    tags.forEach((tag) => {
      tag.assetCount = assetTags.filter((at) => at.tagId === tag.id).length;
    });

    return HttpResponse.json({ success: true });
  }),

  // Search tags
  http.get(`${API_BASE_URL}/tags/search`, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q')?.toLowerCase() || '';

    const filtered = tags.filter(
      (tag) =>
        tag.name.toLowerCase().includes(query) ||
        tag.description?.toLowerCase().includes(query)
    );

    return HttpResponse.json(filtered);
  }),

  // Get popular tags
  http.get(`${API_BASE_URL}/tags/popular`, ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');

    const sorted = [...tags].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
    return HttpResponse.json(sorted.slice(0, limit));
  }),
];
