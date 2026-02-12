export type { User } from './user.types';

// Re-export shared API types
export type {
  LoginRequest,
  LoginResponseData,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  OnboardingRequest,
  OnboardingResponseData,
  MessageResponse,
  ErrorResponse as ApiError,
} from '@shared/types';

// UI-only type
export type AuthContextType = {
  user: import('./user.types').User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string, confirmPassword: string) => Promise<void>;
  completeOnboarding: (name: string, contactNumber: string, password: string, confirmPassword: string) => Promise<void>;
};
