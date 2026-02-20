import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { NavigationSidebar } from '@/components/layout/NavigationSidebar';

describe('NavigationSidebar', () => {
  const defaultProps = {
    sidebarConfig: {
      title: 'Patches',
      items: [],
    },
    selectedPatchTab: 'all-patches',
    selectedAssetTab: 'all-assets',
    selectedSideMenu: [] as string[],
    expandedMenus: [] as string[],
    onPatchTabChange: vi.fn(),
    onAssetTabChange: vi.fn(),
    onSideMenuClick: vi.fn(),
    onExpandedMenusChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders navigation landmark role', () => {
    render(<NavigationSidebar {...defaultProps} />);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('renders Pin sidebar button when collapsed', () => {
    render(<NavigationSidebar {...defaultProps} />);
    expect(screen.getByLabelText('Pin sidebar')).toBeInTheDocument();
  });

  it('renders Patches menu items when sidebarConfig title is Patches', () => {
    render(<NavigationSidebar {...defaultProps} />);
    // Menu items are rendered via Ant Menu, check for the labels
    expect(screen.getByText('All Patches')).toBeInTheDocument();
  });

  it('renders Assets menu items when sidebarConfig title is Assets', () => {
    const props = {
      ...defaultProps,
      sidebarConfig: { title: 'Assets', items: [] },
    };
    render(<NavigationSidebar {...props} />);
    expect(screen.getByText('All Assets')).toBeInTheDocument();
  });

  it('renders Settings menu items when sidebarConfig has items and sidebar is pinned', async () => {
    const props = {
      ...defaultProps,
      sidebarConfig: {
        title: 'Settings',
        items: [
          { key: 'setting-1', label: 'General Settings' },
          { key: 'setting-2', label: 'Security Settings' },
        ],
      },
    };
    render(<NavigationSidebar {...props} />);
    // Pin the sidebar to expand it
    await userEvent.click(screen.getByLabelText('Pin sidebar'));
    expect(screen.getByText('General Settings')).toBeInTheDocument();
    expect(screen.getByText('Security Settings')).toBeInTheDocument();
  });

  it('calls onPatchTabChange when a patch tab is clicked', async () => {
    const onPatchTabChange = vi.fn();
    render(
      <NavigationSidebar {...defaultProps} onPatchTabChange={onPatchTabChange} />,
    );
    await userEvent.click(screen.getByText('All Patches'));
    expect(onPatchTabChange).toHaveBeenCalledWith('all-patches');
  });

  it('calls onAssetTabChange when an asset tab is clicked', async () => {
    const onAssetTabChange = vi.fn();
    const props = {
      ...defaultProps,
      sidebarConfig: { title: 'Assets', items: [] },
      onAssetTabChange,
    };
    render(<NavigationSidebar {...props} />);
    await userEvent.click(screen.getByText('All Assets'));
    expect(onAssetTabChange).toHaveBeenCalledWith('all-assets');
  });

  it('toggles pin state when pin button is clicked', async () => {
    render(<NavigationSidebar {...defaultProps} />);
    const pinButton = screen.getByLabelText('Pin sidebar');
    await userEvent.click(pinButton);
    // After pinning, it should show "Unpin sidebar"
    expect(screen.getByLabelText('Unpin sidebar')).toBeInTheDocument();
  });

  it('shows sidebar title when expanded (pinned)', async () => {
    render(<NavigationSidebar {...defaultProps} />);
    // Pin the sidebar to expand it
    await userEvent.click(screen.getByLabelText('Pin sidebar'));
    expect(screen.getByText('Patches')).toBeInTheDocument();
  });
});
