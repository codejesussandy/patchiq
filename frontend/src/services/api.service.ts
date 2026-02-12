import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';
import { STORAGE_KEYS } from '@/constants/storage.constants';
import type { ApiError } from '../types/auth.types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/v1';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem(STORAGE_KEYS.AUTH.ACCESS_TOKEN);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    /**
     * Response interceptor: unwraps standard envelope and handles errors
     *
     * IMPORTANT: This interceptor automatically unwraps API responses.
     * Service methods should access response.data directly (already unwrapped).
     *
     * Non-paginated: { success: true, data: T } → response.data = T
     * Paginated: { success: true, data: T[], meta: {...} } → response.data = { data: T[], total, page, limit, totalPages }
     *
     * Examples:
     * - Non-paginated: return response.data (not response.data.data)
     * - Paginated list: return response.data.data (to get the array from pagination object)
     * - Paginated full: return response.data (to get { data: [], total, page, ... })
     */
    this.api.interceptors.response.use(
      (response) => {
        // Unwrap standard API envelope: { success: true, data: T } → T
        // Also handles paginated: { success: true, data: T[], meta: {...} }
        const body = response.data;
        if (body && typeof body === 'object' && 'success' in body && body.success === true) {
          // For paginated responses, preserve meta alongside data
          if ('meta' in body) {
            response.data = { data: body.data, ...body.meta };
          } else {
            response.data = body.data;
          }
        }
        return response;
      },
      (error: AxiosError<ApiError>) => {
        if (error.response?.status === 401) {
          // Clear tokens and redirect to login
          localStorage.removeItem(STORAGE_KEYS.AUTH.ACCESS_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.AUTH.REFRESH_TOKEN);
          window.location.href = '/login';
        }
        // Unwrap error envelope: { success: false, error: { code, message, details? } }
        const body = error.response?.data as Record<string, unknown> | undefined;
        if (body && typeof body === 'object' && 'success' in body && body.success === false && body.error) {
          const errObj = body.error as Record<string, unknown>;
          error.message = (typeof errObj.message === 'string' ? errObj.message : undefined) || error.message;
        }
        return Promise.reject(error);
      }
    );
  }

  public getApi(): AxiosInstance {
    return this.api;
  }
}

export const apiService = new ApiService();
export const api = apiService.getApi();
