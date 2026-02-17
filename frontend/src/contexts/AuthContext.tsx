import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { App } from 'antd';
import { STORAGE_KEYS } from '@/constants/storage.constants';
import { authService } from '../services/auth.service';
import type { User, AuthContextType } from '../types/auth.types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { message } = App.useApp();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const initAuth = async () => {
      const token = localStorage.getItem(STORAGE_KEYS.AUTH.ACCESS_TOKEN);
      if (token) {
        try {
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
        } catch {
          localStorage.removeItem(STORAGE_KEYS.AUTH.ACCESS_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.AUTH.REFRESH_TOKEN);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password });
      setUser(response.user as unknown as User);
      message.success('Login successful');
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage = axiosErr.response?.data?.error?.message || 'Login failed';
      message.error(errorMessage);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      message.success('Logged out successfully');
    } catch (error) {
      message.error('Logout failed');
      throw error;
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      const response = await authService.forgotPassword({ email });
      message.success(response.message);
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage = axiosErr.response?.data?.error?.message || 'Failed to send reset email';
      message.error(errorMessage);
      throw error;
    }
  };

  const resetPassword = async (token: string, password: string, confirmPassword: string) => {
    try {
      const response = await authService.resetPassword({ token, password, confirmPassword });
      message.success(response.message);
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage = axiosErr.response?.data?.error?.message || 'Failed to reset password';
      message.error(errorMessage);
      throw error;
    }
  };

  const completeOnboarding = async (name: string, contactNumber: string, password: string, confirmPassword: string) => {
    try {
      const response = await authService.completeOnboarding({ name, contactNumber, password, confirmPassword });
      // OnboardingResponseData has { message, user: { id, email, name, ... } }
      // The User type in AuthContext is broader; construct from available fields
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      message.success(response.message);
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage = axiosErr.response?.data?.error?.message || 'Failed to complete onboarding';
      message.error(errorMessage);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    forgotPassword,
    resetPassword,
    completeOnboarding,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
