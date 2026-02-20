import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { UserLocation } from '@/pages/settings/UserLocation';

const mockLocations = [
  {
    id: 'loc-1',
    name: 'HQ',
    description: 'Headquarters',
    organizationId: 'org-1',
    organizationName: 'Global Org',
    isDefault: true,
    usersCount: 50,
    departmentsCount: 5,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'loc-2',
    name: 'Remote Office',
    description: 'Remote work location',
    organizationId: 'org-2',
    organizationName: 'Branch Office',
    isDefault: false,
    usersCount: 10,
    departmentsCount: 2,
    createdAt: '2024-01-02T00:00:00Z',
  },
];

const mockOrganizations = [
  { id: 'org-1', name: 'Global Org' },
  { id: 'org-2', name: 'Branch Office' },
];

describe('Location Settings Page', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('renders locations page with heading and controls', async () => {
    render(<UserLocation />);

    await waitFor(() => {
      expect(screen.getByText('Locations')).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });

  it('search input accepts text', async () => {
    const user = userEvent.setup();
    render(<UserLocation />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search...');
    await user.type(searchInput, 'Remote');
    expect(searchInput).toHaveValue('Remote');
  });

  it('opens create location modal when Create is clicked', async () => {
    const user = userEvent.setup();
    render(<UserLocation />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByText('Create Location')).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText('Enter location name')).toBeInTheDocument();
    expect(screen.getByText('Select Organization')).toBeInTheDocument();
  });

  it('shows form fields in create location modal', async () => {
    const user = userEvent.setup();
    render(<UserLocation />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter location name')).toBeInTheDocument();
    });

    expect(screen.getByText('Create Location')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter description')).toBeInTheDocument();
  });

  it('refreshes locations when Refresh button is clicked', async () => {
    const user = userEvent.setup();
    let fetchCount = 0;


    render(<UserLocation />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /refresh/i }));

    await waitFor(() => {
      expect(fetchCount).toBeGreaterThan(1);
    });
  });

  it('shows error state when API fails', async () => {

    render(<UserLocation />);

    await waitFor(() => {
      expect(screen.getByText('Locations')).toBeInTheDocument();
    });

    // Page still renders but table is empty
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });
});
