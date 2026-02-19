import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { CategoryManager } from '../../../pages/assets/components/CategoryManager';

describe('CategoryManager Component', () => {
  const mockOnCategorySelect = vi.fn();

  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
    mockOnCategorySelect.mockClear();
  });

  it('renders Categories heading', async () => {
    render(
      <CategoryManager onCategorySelect={mockOnCategorySelect} selectedCategoryId={null} />,
      { initialEntries: ['/assets'] }
    );
    await waitFor(() => {
      expect(screen.getByText('Categories')).toBeInTheDocument();
    });
  });

  it('renders All Assets menu item', async () => {
    render(
      <CategoryManager onCategorySelect={mockOnCategorySelect} selectedCategoryId={null} />,
      { initialEntries: ['/assets'] }
    );
    expect(await screen.findByText('All Assets')).toBeInTheDocument();
  });

  it('renders categories from API', async () => {
    render(
      <CategoryManager onCategorySelect={mockOnCategorySelect} selectedCategoryId={null} />,
      { initialEntries: ['/assets'] }
    );
    expect(await screen.findByText('Servers')).toBeInTheDocument();
    expect(await screen.findByText('Workstations')).toBeInTheDocument();
  });

  it('calls onCategorySelect when All Assets clicked', async () => {
    const user = userEvent.setup();
    render(
      <CategoryManager onCategorySelect={mockOnCategorySelect} selectedCategoryId={null} />,
      { initialEntries: ['/assets'] }
    );
    const allAssets = await screen.findByText('All Assets');
    await user.click(allAssets);
    expect(mockOnCategorySelect).toHaveBeenCalledWith(null);
  });
});
