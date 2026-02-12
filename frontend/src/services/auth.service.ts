import { STORAGE_KEYS } from '@/constants/storage.constants';
import type {
  LoginRequest,
  LoginResponseData,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  OnboardingRequest,
  OnboardingResponseData,
  MessageResponse,
  User,
} from '../types/auth.types';
import { api } from './api.service';

export const authService = {
  login: async (credentials: LoginRequest): Promise<LoginResponseData> => {
    const response = await api.post<LoginResponseData>('/auth/login', credentials);
    const data = response.data;

    // Store tokens in localStorage
    localStorage.setItem(STORAGE_KEYS.AUTH.ACCESS_TOKEN, data.accessToken);
    localStorage.setItem(STORAGE_KEYS.AUTH.REFRESH_TOKEN, data.refreshToken);

    return data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
    localStorage.removeItem(STORAGE_KEYS.AUTH.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.AUTH.REFRESH_TOKEN);
  },

  forgotPassword: async (data: ForgotPasswordRequest): Promise<MessageResponse> => {
    const response = await api.post<MessageResponse>('/auth/forgot-password', data);
    return response.data;
  },

  resetPassword: async (data: ResetPasswordRequest): Promise<MessageResponse> => {
    const response = await api.post<MessageResponse>('/auth/reset-password', data);
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/user/me');
    return response.data;
  },

  completeOnboarding: async (data: OnboardingRequest): Promise<OnboardingResponseData> => {
    const response = await api.post<OnboardingResponseData>('/user/onboarding', data);
    return response.data;
  },
};
