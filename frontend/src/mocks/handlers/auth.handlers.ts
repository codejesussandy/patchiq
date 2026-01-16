import { http, HttpResponse } from 'msw';
import type { LoginRequest, ForgotPasswordRequest, ResetPasswordRequest, OnboardingRequest } from '../../types/auth.types';

const API_BASE_URL = '/v1';

// Mock user data
const mockUser = {
  id: 'usr_123456789',
  email: 'sharma@mail.com',
  firstName: 'Sharma',
  lastName: 'Patel',
  role: 'user' as const,
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sharma',
  createdAt: '2024-01-15T10:30:00Z',
  updatedAt: '2024-01-20T14:45:00Z',
};

const mockTokens = {
  accessToken: 'mock_access_token_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
  refreshToken: 'mock_refresh_token_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
};

export const authHandlers = [
  // Login endpoint
  http.post(`${API_BASE_URL}/auth/login`, async ({ request }) => {
    const body = await request.json() as LoginRequest;

    // Simulate validation
    if (!body.email || !body.password) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email and password are required',
          },
        },
        { status: 422 }
      );
    }

    // Simulate successful login for any email/password combination
    // In a real scenario, you'd validate credentials
    if (body.email === 'test@example.com' && body.password === 'wrongpassword') {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          },
        },
        { status: 401 }
      );
    }

    // Successful login
    return HttpResponse.json(
      {
        success: true,
        data: {
          user: mockUser,
          ...mockTokens,
        },
        message: 'Login successful',
      },
      { status: 200 }
    );
  }),

  // Forgot password endpoint
  http.post(`${API_BASE_URL}/auth/forgot-password`, async ({ request }) => {
    const body = await request.json() as ForgotPasswordRequest;

    if (!body.email) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email is required',
          },
        },
        { status: 422 }
      );
    }

    // Simulate successful password reset email
    return HttpResponse.json(
      {
        success: true,
        message: 'Password reset link sent to your email',
      },
      { status: 200 }
    );
  }),

  // Reset password endpoint
  http.post(`${API_BASE_URL}/auth/reset-password`, async ({ request }) => {
    const body = await request.json() as ResetPasswordRequest;

    if (!body.token || !body.password || !body.confirmPassword) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'All fields are required',
          },
        },
        { status: 422 }
      );
    }

    if (body.password !== body.confirmPassword) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Passwords do not match',
          },
        },
        { status: 422 }
      );
    }

    // Simulate successful password reset
    return HttpResponse.json(
      {
        success: true,
        message: 'Password reset successful',
      },
      { status: 200 }
    );
  }),

  // Logout endpoint
  http.post(`${API_BASE_URL}/auth/logout`, () => {
    return HttpResponse.json(
      {
        success: true,
        message: 'Logout successful',
      },
      { status: 200 }
    );
  }),

  // Get current user endpoint
  http.get(`${API_BASE_URL}/user/me`, ({ request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      );
    }

    return HttpResponse.json(
      {
        success: true,
        data: mockUser,
      },
      { status: 200 }
    );
  }),

  // User onboarding endpoint
  http.post(`${API_BASE_URL}/user/onboarding`, async ({ request }) => {
    const body = await request.json() as OnboardingRequest;

    // Validate required fields
    if (!body.name || !body.password || !body.confirmPassword) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Name, password, and confirm password are required',
          },
        },
        { status: 422 }
      );
    }

    // Validate password match
    if (body.password !== body.confirmPassword) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Passwords do not match',
          },
        },
        { status: 422 }
      );
    }

    // Validate password strength
    if (body.password.length < 8) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Password must be at least 8 characters',
          },
        },
        { status: 422 }
      );
    }

    // Update mock user with onboarding data
    const [firstName, ...lastNameParts] = body.name.split(' ');
    const updatedUser = {
      ...mockUser,
      firstName,
      lastName: lastNameParts.join(' ') || firstName,
      updatedAt: new Date().toISOString(),
    };

    // Simulate successful onboarding
    return HttpResponse.json(
      {
        success: true,
        data: {
          user: updatedUser,
        },
        message: 'Onboarding completed successfully',
      },
      { status: 200 }
    );
  }),
];
