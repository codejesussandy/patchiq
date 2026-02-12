import {
  DeleteOutlined,
  RocketOutlined,
  CloudServerOutlined,
  WindowsOutlined,
  AppleOutlined,
  LinuxOutlined,
} from '@ant-design/icons';
import { Card, Tag, Tooltip, Typography, Space, Button, Popconfirm } from 'antd';

const { Text } = Typography;

interface SoftwareItem {
  id: string;
  packageId: string;
  deploymentId: string;
  name: string;
  displayName: string;
  description: string;
  version: string;
  type: 'MSI' | 'EXE' | 'APPLICATION' | 'ZIP' | 'BUNDLE';
  os: ('Windows' | 'Mac' | 'Linux')[];
  logo?: string;
  tags?: string[];
  createdBy: string;
  hasBundle: boolean;
  installSource: string;
}

export type { SoftwareItem };

const getOSIcon = (os: string) => {
  switch (os) {
    case 'Windows':
      return <WindowsOutlined style={{ fontSize: 16, color: '#1890ff' }} />;
    case 'Mac':
      return <AppleOutlined style={{ fontSize: 16, color: '#000' }} />;
    case 'Linux':
      return <LinuxOutlined style={{ fontSize: 16, color: '#000' }} />;
    default:
      return null;
  }
};

// eslint-disable-next-line react-refresh/only-export-components
export { getOSIcon };

// eslint-disable-next-line react-refresh/only-export-components
export const getTypeColor = (type: string) => {
  switch (type) {
    case 'MSI': return 'blue';
    case 'EXE': case 'APPLICATION': return 'cyan';
    case 'ZIP': return 'orange';
    case 'BUNDLE': return 'green';
    default: return 'default';
  }
};

interface SoftwareCatalogCardProps {
  item: SoftwareItem;
  onDeploy: (item: SoftwareItem) => void;
  onDelete: (id: string) => void;
}

export const SoftwareCatalogCard = ({ item, onDeploy, onDelete }: SoftwareCatalogCardProps) => (
  <Card
    hoverable
    style={{ height: '100%', position: 'relative' }}
    styles={{ body: { padding: 16 } }}
  >
    <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4 }}>
      <Tooltip title="Deploy this package">
        <Button
          type="primary"
          size="small"
          icon={<RocketOutlined />}
          onClick={() => onDeploy(item)}
          style={{ padding: '4px 8px' }}
        />
      </Tooltip>
      <Popconfirm
        title="Delete software package"
        description="Are you sure you want to delete this package?"
        onConfirm={() => onDelete(item.id)}
        okText="Yes"
        cancelText="No"
      >
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          style={{ padding: '4px 8px' }}
        />
      </Popconfirm>
    </div>

    {item.hasBundle && (
      <div style={{ position: 'absolute', top: 8, left: 8 }}>
        <Tooltip title="Hub-managed with deployment scripts">
          <Tag color="green" style={{ fontSize: 10 }}>
            <CloudServerOutlined /> BUNDLE
          </Tag>
        </Tooltip>
      </div>
    )}

    <div
      style={{
        width: 64, height: 64, borderRadius: 8, background: '#f0f0f0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 12, border: '1px dashed #d9d9d9',
      }}
    >
      <Text type="secondary" style={{ fontSize: 12 }}>{item.logo || 'Add Logo'}</Text>
    </div>

    <div style={{ marginBottom: 8 }}>
      <Text strong style={{ fontSize: 14 }}>{item.displayName || item.name}</Text>
    </div>

    <div style={{ marginBottom: 12, minHeight: 40 }}>
      <Text type="secondary" style={{ fontSize: 12 }}>{item.description}</Text>
    </div>

    <div style={{ marginBottom: 12 }}>
      <Space size={[0, 8]} wrap>
        <Tag color="default">{item.version}</Tag>
        <Tag color={getTypeColor(item.type)}>{item.type}</Tag>
      </Space>
    </div>

    <div style={{ display: 'flex', gap: 8 }}>
      {item.os.map((os) => (
        <span key={os}>{getOSIcon(os)}</span>
      ))}
    </div>
  </Card>
);
