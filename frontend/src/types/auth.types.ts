// Auth request types - imported from shared package (exact matches)
export type { LoginRequest, ForgotPasswordRequest, ResetPasswordRequest, OnboardingRequest } from '@patchiq/shared-types';
import type { ErrorResponse } from '@patchiq/shared-types';
export type ApiError = ErrorResponse;

import type { User } from './user.types';
export type { User } from './user.types';

export type LoginResponse = {
  success: boolean;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
  message: string;
};

export type ForgotPasswordResponse = {
  success: boolean;
  message: string;
};

export type ResetPasswordResponse = {
  success: boolean;
  message: string;
};

export type OnboardingResponse = {
  success: boolean;
  data: {
    user: User;
  };
  message: string;
};

export type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string, confirmPassword: string) => Promise<void>;
  completeOnboarding: (name: string, contactNumber: string, password: string, confirmPassword: string) => Promise<void>;
};
