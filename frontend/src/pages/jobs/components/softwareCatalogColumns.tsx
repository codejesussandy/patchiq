import {
  EditOutlined,
  DeleteOutlined,
  RocketOutlined,
  MoreOutlined,
  CloudServerOutlined,
} from '@ant-design/icons';
import { Space, Tag, Tooltip, Typography, Button, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { getOSIcon, getTypeColor, type SoftwareItem } from './SoftwareCatalogCard';

const { Text } = Typography;

interface CatalogColumnActions {
  onDeploy: (item: SoftwareItem) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export const getSoftwareCatalogColumns = ({ onDeploy, onEdit, onDelete }: CatalogColumnActions): ColumnsType<SoftwareItem> => {
  const tableActionMenuItems: MenuProps['items'] = [
    { key: 'deploy', label: 'Deploy', icon: <RocketOutlined /> },
    { key: 'edit', label: 'Edit in Hub', icon: <EditOutlined /> },
    { key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true },
  ];

  return [
    {
      title: 'ID', dataIndex: 'deploymentId', key: 'deploymentId', width: 100,
      sorter: (a, b) => a.deploymentId.localeCompare(b.deploymentId),
    },
    {
      title: '', key: 'logo', width: 80,
      render: (_, record) => (
        <div style={{ width: 48, height: 48, borderRadius: 8, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #d9d9d9' }}>
          <Text type="secondary" style={{ fontSize: 10 }}>{record.logo || 'Add Logo'}</Text>
        </div>
      ),
    },
    {
      title: 'Name', key: 'name',
      sorter: (a, b) => (a.displayName || a.name).localeCompare(b.displayName || b.name),
      render: (_, record) => (
        <Space>
          <Text>{record.displayName || record.name}</Text>
          {record.hasBundle && (
            <Tooltip title="Hub-managed with deployment scripts">
              <Tag color="green" style={{ fontSize: 10 }}><CloudServerOutlined /> BUNDLE</Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Description', dataIndex: 'description', key: 'description',
      sorter: (a, b) => a.description.localeCompare(b.description),
      render: (text: string) => <Text ellipsis style={{ maxWidth: 200 }}>{text}</Text>,
    },
    {
      title: 'OS', dataIndex: 'os', key: 'os',
      render: (os: string[]) => <Space>{os.map((o) => <span key={o}>{getOSIcon(o)}</span>)}</Space>,
    },
    {
      title: 'Version', dataIndex: 'version', key: 'version',
      sorter: (a, b) => a.version.localeCompare(b.version),
    },
    {
      title: 'Type', dataIndex: 'type', key: 'type',
      render: (type: string) => <Tag color={getTypeColor(type)}>{type}</Tag>,
    },
    {
      title: 'Tags', dataIndex: 'tags', key: 'tags',
      render: (tags: string[]) => tags && tags.length > 0 ? tags.join(', ') : '-',
    },
    {
      title: 'Created By', dataIndex: 'createdBy', key: 'createdBy',
      sorter: (a, b) => a.createdBy.localeCompare(b.createdBy),
    },
    {
      title: 'Actions', key: 'action', width: 120, fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="Deploy this package">
            <Button type="primary" size="small" icon={<RocketOutlined />} onClick={() => onDeploy(record)}>Deploy</Button>
          </Tooltip>
          <Dropdown
            menu={{
              items: tableActionMenuItems,
              onClick: ({ key }) => {
                if (key === 'deploy') onDeploy(record);
                else if (key === 'edit') onEdit(record.id);
                else if (key === 'delete') onDelete(record.id);
              },
            }}
            trigger={['click']}
          >
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      ),
    },
  ];
};
