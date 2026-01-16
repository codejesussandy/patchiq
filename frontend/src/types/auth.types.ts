export { User } from './user.types';

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  success: boolean;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
  message: string;
};

export type ForgotPasswordRequest = {
  email: string;
};

export type ForgotPasswordResponse = {
  success: boolean;
  message: string;
};

export type ResetPasswordRequest = {
  token: string;
  password: string;
  confirmPassword: string;
};

export type ResetPasswordResponse = {
  success: boolean;
  message: string;
};

export type OnboardingRequest = {
  name: string;
  contactNumber: string;
  password: string;
  confirmPassword: string;
};

export type OnboardingResponse = {
  success: boolean;
  data: {
    user: User;
  };
  message: string;
};

export type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{
      field: string;
      message: string;
    }>;
  };
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
