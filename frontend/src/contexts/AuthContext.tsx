import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { App } from 'antd';
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
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
        } catch (error) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password });
      setUser(response.data.user);
      message.success(response.message);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Login failed';
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
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to send reset email';
      message.error(errorMessage);
      throw error;
    }
  };

  const resetPassword = async (token: string, password: string, confirmPassword: string) => {
    try {
      const response = await authService.resetPassword({ token, password, confirmPassword });
      message.success(response.message);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to reset password';
      message.error(errorMessage);
      throw error;
    }
  };

  const completeOnboarding = async (name: string, contactNumber: string, password: string, confirmPassword: string) => {
    try {
      const response = await authService.completeOnboarding({ name, contactNumber, password, confirmPassword });
      setUser(response.data.user);
      message.success(response.message);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to complete onboarding';
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
