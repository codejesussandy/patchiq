import type {
  PatchRecommendation,
  PatchRecommendationDashboardStats,
  ListRecommendationsParams,
  ListRecommendationsResponse,
} from '../types/patch-recommendation.types';
import { api } from './api.service';

export const patchRecommendationService = {
  // List all recommendations with filters
  async listRecommendations(
    params?: ListRecommendationsParams
  ): Promise<ListRecommendationsResponse> {
    const response = await api.get('/patch-recommendations', { params });
    return response.data;
  },

  // Get single recommendation with full details
  async getRecommendation(id: string): Promise<PatchRecommendation> {
    const response = await api.get(`/patch-recommendations/${id}`);
    // Non-paginated response, interceptor unwraps envelope
    return response.data;
  },

  // Get dashboard statistics
  async getDashboardStats(): Promise<PatchRecommendationDashboardStats> {
    const response = await api.get('/patch-recommendations/dashboard');
    // Non-paginated response, interceptor unwraps envelope
    return response.data;
  },

  // Get recommendations for specific asset
  async getAssetRecommendations(
    assetId: string,
    params?: ListRecommendationsParams
  ): Promise<ListRecommendationsResponse> {
    const response = await api.get(`/assets/${assetId}/patch-recommendations`, { params });
    return response.data;
  },

  // Get recommendations for specific patch (which assets need it)
  async getPatchRecommendations(
    patchId: string,
    params?: ListRecommendationsParams
  ): Promise<ListRecommendationsResponse> {
    const response = await api.get(`/patches/${patchId}/recommendations`, { params });
    return response.data;
  },

  // Accept recommendation
  async acceptRecommendation(id: string, reason?: string): Promise<PatchRecommendation> {
    const response = await api.post(`/patch-recommendations/${id}/accept`, { reason });
    // Non-paginated response, interceptor unwraps envelope
    return response.data;
  },

  // Reject recommendation
  async rejectRecommendation(id: string, reason: string): Promise<PatchRecommendation> {
    const response = await api.post(`/patch-recommendations/${id}/reject`, { reason });
    // Non-paginated response, interceptor unwraps envelope
    return response.data;
  },

  // Deploy recommendation
  async deployRecommendation(
    id: string
  ): Promise<{ recommendation: PatchRecommendation; deployment: Record<string, unknown> }> {
    const response = await api.post(`/patch-recommendations/${id}/deploy`);
    // Non-paginated response, interceptor unwraps envelope
    return response.data;
  },
};
