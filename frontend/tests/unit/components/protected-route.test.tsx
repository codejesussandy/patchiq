import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../test-utils';
import { ProtectedRoute, PublicRoute } from '@/components/ProtectedRoute';

// Create a mutable ref to control mock behavior per-test
const mockAuth = {
  isAuthenticated: false,
  isLoading: false,
  user: null as { email: string } | null,
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockAuth.isAuthenticated = false;
    mockAuth.isLoading = false;
    mockAuth.user = null;
  });

  it('renders children when user is authenticated', () => {
    mockAuth.isAuthenticated = true;
    mockAuth.user = { email: 'test@test.com' };

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
    );
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects to /login when user is not authenticated', () => {
    mockAuth.isAuthenticated = false;

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
      { initialEntries: ['/dashboard'] },
    );
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('shows loading state while auth is loading', () => {
    mockAuth.isLoading = true;

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});

describe('PublicRoute', () => {
  beforeEach(() => {
    mockAuth.isAuthenticated = false;
    mockAuth.isLoading = false;
    mockAuth.user = null;
  });

  it('renders children when user is not authenticated', () => {
    render(
      <PublicRoute>
        <div>Login Page</div>
      </PublicRoute>,
    );
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('redirects to /dashboard when user is authenticated', () => {
    mockAuth.isAuthenticated = true;
    mockAuth.user = { email: 'test@test.com' };

    render(
      <PublicRoute>
        <div>Login Page</div>
      </PublicRoute>,
      { initialEntries: ['/login'] },
    );
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('shows loading state while auth is loading', () => {
    mockAuth.isLoading = true;

    render(
      <PublicRoute>
        <div>Login Page</div>
      </PublicRoute>,
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });
});
