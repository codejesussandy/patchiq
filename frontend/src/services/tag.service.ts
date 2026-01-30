import { api } from './api.service';
import type { Tag } from '../types/asset.types';

export const tagService = {
  // Tag CRUD
  async getTags(): Promise<Tag[]> {
    const response = await api.get('/tags');
    return response.data?.data ?? response.data;
  },

  async getTag(tagId: string): Promise<Tag> {
    const response = await api.get(`/tags/${tagId}`);
    return response.data;
  },

  async createTag(tag: Omit<Tag, 'id' | 'assetCount' | 'createdAt'>): Promise<Tag> {
    const response = await api.post('/tags', tag);
    return response.data;
  },

  async updateTag(tagId: string, updates: Partial<Tag>): Promise<Tag> {
    const response = await api.put(`/tags/${tagId}`, updates);
    return response.data;
  },

  async deleteTag(tagId: string): Promise<void> {
    await api.delete(`/tags/${tagId}`);
  },

  // Asset-Tag relationships (many-to-many)
  async getAssetTags(assetId: string): Promise<Tag[]> {
    const response = await api.get(`/assets/${assetId}/tags`);
    return response.data;
  },

  async getTagAssets(tagId: string): Promise<any[]> {
    const response = await api.get(`/tags/${tagId}/assets`);
    return response.data;
  },

  async assignTagsToAsset(assetId: string, tagIds: string[]): Promise<void> {
    await api.post(`/assets/${assetId}/tags`, { tagIds });
  },

  async removeTagFromAsset(assetId: string, tagId: string): Promise<void> {
    await api.delete(`/assets/${assetId}/tags/${tagId}`);
  },

  // Bulk operations
  async bulkAssignTags(assetIds: string[], tagIds: string[]): Promise<void> {
    await api.post('/tags/bulk-assign', { assetIds, tagIds });
  },

  async bulkRemoveTags(assetIds: string[], tagIds: string[]): Promise<void> {
    await api.post('/tags/bulk-remove', { assetIds, tagIds });
  },

  // Search and filter
  async searchTags(query: string): Promise<Tag[]> {
    const response = await api.get('/tags/search', { params: { q: query } });
    return response.data;
  },

  async getPopularTags(limit: number = 10): Promise<Tag[]> {
    const response = await api.get('/tags/popular', { params: { limit } });
    return response.data;
  },
};
