import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from '../test-utils';
import { ProtectedRoute, PublicRoute } from '../../components/ProtectedRoute';

describe('ProtectedRoute', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders children when authenticated', async () => {
    localStorage.setItem('accessToken', 'mock-access-token');
    render(
      <ProtectedRoute><div>Protected Content</div></ProtectedRoute>,
      { initialEntries: ['/dashboard'] }
    );
    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  it('redirects to /login when unauthenticated', async () => {
    render(
      <ProtectedRoute><div>Protected Content</div></ProtectedRoute>,
      { initialEntries: ['/dashboard'] }
    );
    await waitFor(() => {
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  it('shows loader while auth is loading', () => {
    localStorage.setItem('accessToken', 'mock-access-token');
    render(
      <ProtectedRoute><div>Protected Content</div></ProtectedRoute>,
      { initialEntries: ['/dashboard'] }
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});

describe('PublicRoute', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders children when unauthenticated', async () => {
    render(
      <PublicRoute><div>Login Page</div></PublicRoute>,
      { initialEntries: ['/login'] }
    );
    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });

  it('redirects to /dashboard when authenticated', async () => {
    localStorage.setItem('accessToken', 'mock-access-token');
    render(
      <PublicRoute><div>Login Page</div></PublicRoute>,
      { initialEntries: ['/login'] }
    );
    await waitFor(() => {
      expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    });
  });
});
