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
    onOpenCategoryModal: vi.fn(),
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

  it('shows Add Category button (plus icon) when sidebarTitle is Assets', () => {
    const { container } = render(<CategoryPanel {...defaultProps} sidebarTitle="Assets" />);
    expect(container.querySelector('.anticon-plus')).toBeInTheDocument();
  });

  it('shows Manage Categories button (edit icon) when sidebarTitle is Assets', () => {
    const { container } = render(<CategoryPanel {...defaultProps} sidebarTitle="Assets" />);
    expect(container.querySelector('.anticon-edit')).toBeInTheDocument();
  });

  it('does not show category management buttons when sidebarTitle is Patches', () => {
    const { container } = render(<CategoryPanel {...defaultProps} sidebarTitle="Patches" />);
    expect(container.querySelector('.anticon-plus')).not.toBeInTheDocument();
    expect(container.querySelector('.anticon-edit')).not.toBeInTheDocument();
  });

  it('calls onOpenCategoryModal when Add Category button is clicked', async () => {
    const onOpenCategoryModal = vi.fn();
    const { container } = render(
      <CategoryPanel {...defaultProps} onOpenCategoryModal={onOpenCategoryModal} />,
    );
    const plusIcon = container.querySelector('.anticon-plus')!;
    const button = plusIcon.closest('button')!;
    await userEvent.click(button);
    expect(onOpenCategoryModal).toHaveBeenCalledOnce();
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
