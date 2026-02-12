import {
  SearchOutlined,
  ReloadOutlined,
  ExportOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Input, Button, Space } from 'antd';

interface JobToolbarProps {
  searchText: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onExport?: () => void;
  onCreate?: () => void;
  createLabel?: string;
  loading?: boolean;
  extraButtons?: React.ReactNode;
  searchPlaceholder?: string;
}

export function JobToolbar({
  searchText,
  onSearchChange,
  onRefresh,
  onExport,
  onCreate,
  createLabel = 'Create',
  loading = false,
  extraButtons,
  searchPlaceholder = 'Search...',
}: JobToolbarProps) {
  return (
    <div
      style={{
        marginBottom: 16,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
      }}
    >
      <Input
        placeholder={searchPlaceholder}
        prefix={<SearchOutlined />}
        style={{ width: 300 }}
        value={searchText}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <Space>
        {extraButtons}
        <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
          Refresh
        </Button>
        {onExport && (
          <Button icon={<ExportOutlined />} onClick={onExport}>
            Export
          </Button>
        )}
        {onCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={onCreate} htmlType="button">
            {createLabel}
          </Button>
        )}
      </Space>
    </div>
  );
}
