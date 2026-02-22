import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { CategoryPanel } from '@/components/layout/CategoryPanel';

describe('CategoryPanel', () => {
  const defaultProps = {
    sidebarTitle: 'Assets',
    sidebarWidth: 64,
    categories: [],
    subCategories: [],
    selectedSideMenu: [] as string[],
    expandedAssetSections: [] as string[],
    onSideMenuClick: vi.fn(),
    onExpandedSectionsChange: vi.fn(),
    collapsed: false,
    onToggleCollapse: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Platforms header', () => {
    render(<CategoryPanel {...defaultProps} />);
    expect(screen.getByText('Platforms')).toBeInTheDocument();
  });

  it('renders Windows OS item', () => {
    render(<CategoryPanel {...defaultProps} />);
    expect(screen.getByText('Windows')).toBeInTheDocument();
  });

  it('renders macOS item', () => {
    render(<CategoryPanel {...defaultProps} />);
    expect(screen.getByText('macOS')).toBeInTheDocument();
  });

  it('renders Linux OS item', () => {
    render(<CategoryPanel {...defaultProps} />);
    expect(screen.getByText('Linux')).toBeInTheDocument();
  });

  it('calls onSideMenuClick when an OS item is clicked', async () => {
    const onSideMenuClick = vi.fn();
    render(<CategoryPanel {...defaultProps} onSideMenuClick={onSideMenuClick} />);
    await userEvent.click(screen.getByText('Windows'));
    expect(onSideMenuClick).toHaveBeenCalledWith('os-windows');
  });

  it('calls onSideMenuClick with correct key for macOS', async () => {
    const onSideMenuClick = vi.fn();
    render(<CategoryPanel {...defaultProps} onSideMenuClick={onSideMenuClick} />);
    await userEvent.click(screen.getByText('macOS'));
    expect(onSideMenuClick).toHaveBeenCalledWith('os-macos');
  });

  it('calls onSideMenuClick with correct key for Linux', async () => {
    const onSideMenuClick = vi.fn();
    render(<CategoryPanel {...defaultProps} onSideMenuClick={onSideMenuClick} />);
    await userEvent.click(screen.getByText('Linux'));
    expect(onSideMenuClick).toHaveBeenCalledWith('os-linux');
  });


  it('renders Custom Groups section when categories exist', () => {
    const categories = [{ id: '1', name: 'Servers' }];
    render(
      <CategoryPanel
        {...defaultProps}
        categories={categories as any}
        subCategories={[]}
      />,
    );
    expect(screen.getByText('Custom Groups')).toBeInTheDocument();
    expect(screen.getByText('Servers')).toBeInTheDocument();
  });

  it('does not render Custom Groups when categories are empty', () => {
    render(<CategoryPanel {...defaultProps} />);
    expect(screen.queryByText('Custom Groups')).not.toBeInTheDocument();
  });

  it('does not render Custom Groups when sidebarTitle is Patches', () => {
    const categories = [{ id: '1', name: 'Servers' }];
    render(
      <CategoryPanel
        {...defaultProps}
        sidebarTitle="Patches"
        categories={categories as any}
      />,
    );
    expect(screen.queryByText('Custom Groups')).not.toBeInTheDocument();
  });
});
