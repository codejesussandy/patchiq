import { MoreOutlined } from '@ant-design/icons';
import { formatEnum } from '@shared/types';
import { Tag, Tooltip, Button, Dropdown } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { ColumnConfig } from '../../../../components/ColumnSettingsDrawer';
import type { Asset } from '../../../../types/asset.types';

interface Category {
  id: string;
  name: string;
  color?: string;
}

interface SubCategory {
  id: string;
  name: string;
  categoryId: string;
  criticality?: string;
}

interface AssetColumnsConfig {
  visibleColumns: ColumnConfig[];
  categories: Category[];
  subCategories: SubCategory[];
  onCategoryEdit: (asset: Asset) => void;
  onNavigate: (path: string) => void;
  onDelete: (asset: Asset) => void;
}

export const defaultColumnConfig: ColumnConfig[] = [
  { key: 'assetId', title: 'Asset ID', visible: true, pinned: false, width: 200, group: 'Basic' },
  { key: 'name', title: 'Asset Name', visible: false, pinned: false, width: 120, group: 'Basic' },
  { key: 'networkIdentity', title: 'Network Identity', visible: true, pinned: false, width: 180, group: 'Basic' },
  { key: 'category', title: 'Category', visible: true, pinned: false, width: 180, group: 'Organization' },
  { key: 'operationalStatus', title: 'Operational Status', visible: true, pinned: false, width: 150, group: 'Status' },
  { key: 'status', title: 'Status', visible: true, pinned: false, width: 150, group: 'Status' },
  { key: 'operationalStatusSince', title: 'Op. Status Since', visible: true, pinned: false, width: 140, group: 'Status' },
  { key: 'operationalStatusDuration', title: 'Op. Status Duration', visible: true, pinned: false, width: 160, group: 'Status' },
  { key: 'action', title: 'Actions', visible: true, pinned: false, required: true, width: 50, group: 'Actions' },
];

export const STORAGE_KEY = 'assets_column_config_v3';

export function buildAssetColumns({ visibleColumns, categories, subCategories, onCategoryEdit, onNavigate, onDelete }: AssetColumnsConfig): ColumnsType<Asset> {
  return visibleColumns.map((col) => {
    if (col.key === 'networkIdentity') {
      return {
        title: col.title, key: col.key, width: col.width,
        render: (_: unknown, record: Asset) => {
          const identity = record.hostname || record.ipAddress || '-';
          return (
            <Tooltip title={record.hostname && record.ipAddress ? `IP: ${record.ipAddress}` : undefined}>
              <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{identity}</span>
            </Tooltip>
          );
        },
      };
    }

    if (col.key === 'operationalStatus') {
      return {
        title: col.title, dataIndex: col.key, key: col.key, width: col.width,
        render: (text: string) => <Tag color={text === 'CONNECTED' ? 'green' : 'red'}>{formatEnum(text)}</Tag>,
      };
    }

    if (col.key === 'status') {
      return {
        title: col.title, dataIndex: col.key, key: col.key, width: col.width,
        render: (text: string) => {
          const color = text === 'IN_USE' ? 'blue' : text === 'RETIRED' ? 'orange' : 'default';
          return <Tag color={color}>{formatEnum(text)}</Tag>;
        },
      };
    }

    if (col.key === 'category') {
      return {
        title: col.title, key: 'category', width: col.width,
        render: (_: unknown, record: Asset) => {
          const category = categories.find((c) => c.id === record.categoryId);
          const subCategory = subCategories.find((s) => s.id === record.subCategoryId);
          return (
            <div onClick={(e) => { e.stopPropagation(); onCategoryEdit(record); }}
              style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '4px' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f0f0f0'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
              {category ? (
                <div>
                  <Tag color={category.color || 'blue'}>{category.name}</Tag>
                  {subCategory && <span style={{ marginLeft: '8px', fontSize: '16px', color: '#666' }}>→ {subCategory.name}</span>}
                </div>
              ) : (
                <span style={{ color: '#999' }}>Unassigned</span>
              )}
            </div>
          );
        },
      };
    }

    if (col.key === 'action') {
      return {
        title: '', key: 'action', width: col.width,
        render: (_: unknown, record: Asset) => {
          const actionMenuItems = [
            { key: 'edit', label: 'Edit', onClick: (info: { domEvent: React.MouseEvent }) => { info.domEvent.stopPropagation(); onNavigate(`/assets/${record.id}`); } },
            { key: 'delete', label: 'Delete', danger: true, onClick: (info: { domEvent: React.MouseEvent }) => { info.domEvent.stopPropagation(); onDelete(record); } },
          ];
          return (
            <Dropdown menu={{ items: actionMenuItems }} trigger={['click']}>
              <Button type="text" size="small" icon={<MoreOutlined />} onClick={(e) => { e.stopPropagation(); e.preventDefault(); }} />
            </Dropdown>
          );
        },
      };
    }

    return { title: col.title, dataIndex: col.key, key: col.key, width: col.width };
  });
}
