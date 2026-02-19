import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from '../test-utils';
import { MainLayout } from '../../components/MainLayout';

describe('MainLayout', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders header with app name', async () => {
    render(
      <MainLayout><div>Page Content</div></MainLayout>,
      { initialEntries: ['/dashboard'] }
    );

    await waitFor(() => {
      expect(screen.getByText('Patch Manager')).toBeInTheDocument();
    });
  });

  it('renders children content', async () => {
    render(
      <MainLayout><div>Page Content</div></MainLayout>,
      { initialEntries: ['/dashboard'] }
    );

    await waitFor(() => {
      expect(screen.getByText('Page Content')).toBeInTheDocument();
    });
  });

  it('renders header with user profile area', async () => {
    render(
      <MainLayout><div>Content</div></MainLayout>,
      { initialEntries: ['/dashboard'] }
    );

    await waitFor(() => {
      expect(screen.getByLabelText('User profile menu')).toBeInTheDocument();
    });
  });

  it('renders main content area with correct role', async () => {
    render(
      <MainLayout><div>Content</div></MainLayout>,
      { initialEntries: ['/dashboard'] }
    );

    await waitFor(() => {
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  it('renders header banner', async () => {
    render(
      <MainLayout><div>Content</div></MainLayout>,
      { initialEntries: ['/dashboard'] }
    );

    await waitFor(() => {
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });
  });

  it('shows user display name in header', async () => {
    render(
      <MainLayout><div>Content</div></MainLayout>,
      { initialEntries: ['/dashboard'] }
    );

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });
  });
});
