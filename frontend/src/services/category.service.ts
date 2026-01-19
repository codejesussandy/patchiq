import { api } from './api.service';
import type { Category, SubCategory } from '../types/asset.types';

export const categoryService = {
  // Get all categories
  async getCategories(): Promise<Category[]> {
    const response = await api.get('/categories');
    return response.data;
  },

  // Get single category with its sub-categories
  async getCategory(categoryId: string): Promise<Category & { subCategories: SubCategory[] }> {
    const response = await api.get(`/categories/${categoryId}`);
    return response.data;
  },

  // Create new category
  async createCategory(category: Omit<Category, 'id'>): Promise<Category> {
    const response = await api.post('/categories', category);
    return response.data;
  },

  // Update category
  async updateCategory(categoryId: string, updates: Partial<Category>): Promise<Category> {
    const response = await api.put(`/categories/${categoryId}`, updates);
    return response.data;
  },

  // Delete category
  async deleteCategory(categoryId: string): Promise<void> {
    await api.delete(`/categories/${categoryId}`);
  },

  // Get all sub-categories
  async getSubCategories(categoryId?: string): Promise<SubCategory[]> {
    const params = categoryId ? { categoryId } : {};
    const response = await api.get('/subcategories', { params });
    return response.data;
  },

  // Get single sub-category
  async getSubCategory(subCategoryId: string): Promise<SubCategory> {
    const response = await api.get(`/subcategories/${subCategoryId}`);
    return response.data;
  },

  // Create new sub-category
  async createSubCategory(subCategory: Omit<SubCategory, 'id'>): Promise<SubCategory> {
    const response = await api.post('/subcategories', subCategory);
    return response.data;
  },

  // Update sub-category
  async updateSubCategory(subCategoryId: string, updates: Partial<SubCategory>): Promise<SubCategory> {
    const response = await api.put(`/subcategories/${subCategoryId}`, updates);
    return response.data;
  },

  // Delete sub-category
  async deleteSubCategory(subCategoryId: string): Promise<void> {
    await api.delete(`/subcategories/${subCategoryId}`);
  },

  // Get assets in a category
  async getAssetsByCategory(categoryId: string): Promise<any[]> {
    const response = await api.get(`/categories/${categoryId}/assets`);
    return response.data;
  },

  // Get assets in a sub-category
  async getAssetsBySubCategory(subCategoryId: string): Promise<any[]> {
    const response = await api.get(`/subcategories/${subCategoryId}/assets`);
    return response.data;
  },
};
