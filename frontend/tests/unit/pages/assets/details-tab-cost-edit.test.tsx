import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '../../test-utils';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { DetailsTab } from '@/pages/assets/components/tabs/DetailsTab';

const mockUpdateAsset = vi.fn().mockResolvedValue({});

vi.mock('@/hooks/useAssets', () => ({
  useAssetHardware: vi.fn(() => ({ data: null })),
  useAssetTelemetry: vi.fn(() => ({ data: null, isLoading: false, dataUpdatedAt: null, refetch: vi.fn() })),
  useRefreshAssetInventory: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useUpdateAsset: vi.fn(() => ({ mutateAsync: mockUpdateAsset })),
}));

vi.mock('@/pages/assets/components/TagDisplay', () => ({ default: () => <div>TagDisplay</div> }));
vi.mock('@/pages/assets/components/TagSelector', () => ({ default: () => <div>TagSelector</div> }));

const mockAsset = {
  id: 'asset-1',
  name: 'DESKTOP-001',
  hostname: 'DESKTOP-001',
  assetId: 'A001',
  assetType: 'Desktop',
  operationalStatus: 'CONNECTED',
  status: 'Active',
  ipAddress: '192.168.1.10',
  osType: 'Windows',
  cost: {
    cost: '1200',
    currency: 'USD',
    currentCost: '900',
    invoiceNumber: 'INV-001',
    purchaseDate: '2023-01-15',
    salvageValue: '100',
    age: '2 years',
  },
} as Parameters<typeof DetailsTab>[0]['asset'];

const defaultProps = {
  asset: mockAsset,
  editingTags: false,
  selectedTags: [],
  onEditTagsToggle: vi.fn(),
  onSelectedTagsChange: vi.fn(),
  onSaveTags: vi.fn(),
};

describe('DetailsTab – cost editing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows Edit button in Cost Properties card', () => {
    render(<DetailsTab {...defaultProps} />);

    const costSection = screen.getByText('Cost Properties').closest('div[style]')!;
    const editButton = costSection.parentElement!.querySelector('button');
    expect(editButton).toBeInTheDocument();
    expect(editButton!.textContent).toMatch(/edit/i);
  });

  it('renders cost properties fields in read-only mode', () => {
    render(<DetailsTab {...defaultProps} />);

    expect(screen.getByText('Cost Properties')).toBeInTheDocument();
    expect(screen.getByText('1200')).toBeInTheDocument();
    expect(screen.getByText('USD')).toBeInTheDocument();
    expect(screen.getByText('900')).toBeInTheDocument();
    expect(screen.getByText('INV-001')).toBeInTheDocument();
    expect(screen.getByText('2 years')).toBeInTheDocument();
  });

  it('switches to edit mode when Edit is clicked', async () => {
    const user = userEvent.setup();
    render(<DetailsTab {...defaultProps} />);

    // Find Edit buttons - Cost Properties Edit comes before Tags Edit
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    // Click the first Edit button (Cost Properties)
    await user.click(editButtons[0]);

    // Should show Save and Cancel buttons
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();

    // Should show input fields
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.length).toBeGreaterThanOrEqual(1);
  });

  it('calls updateAsset with correct mapped fields on Save', async () => {
    const user = userEvent.setup();
    render(<DetailsTab {...defaultProps} />);

    // Enter edit mode - first Edit button is Cost Properties
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    await user.click(editButtons[0]);

    // Click Save
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(mockUpdateAsset).toHaveBeenCalledWith({
      id: 'asset-1',
      data: expect.objectContaining({
        purchaseCost: 1200,
        currentValue: 900,
        salvageValue: 100,
        currency: 'USD',
        invoiceNumber: 'INV-001',
      }),
    });
  });

  it('reverts to read-only mode on Cancel', async () => {
    const user = userEvent.setup();
    render(<DetailsTab {...defaultProps} />);

    // Enter edit mode - first Edit button is Cost Properties
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    await user.click(editButtons[0]);

    // Click Cancel
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    // Should be back to read-only with Edit button
    expect(screen.getByText('1200')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
  });

  it('shows Save and Cancel buttons when tags editing is active', () => {
    render(<DetailsTab {...defaultProps} editingTags={true} />);

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('calls onSaveTags when Save is clicked in tag editing mode', async () => {
    const user = userEvent.setup();
    const onSaveTags = vi.fn();
    render(<DetailsTab {...defaultProps} editingTags={true} onSaveTags={onSaveTags} />);

    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(onSaveTags).toHaveBeenCalled();
  });

  it('calls onEditTagsToggle(false) when Cancel is clicked in tag editing mode', async () => {
    const user = userEvent.setup();
    const onEditTagsToggle = vi.fn();
    render(<DetailsTab {...defaultProps} editingTags={true} onEditTagsToggle={onEditTagsToggle} />);

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onEditTagsToggle).toHaveBeenCalledWith(false);
  });
});
