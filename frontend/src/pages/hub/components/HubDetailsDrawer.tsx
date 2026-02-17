import {
  RocketOutlined,
  DownloadOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  FileOutlined,
  CodeOutlined,
  WindowsOutlined,
  AppleOutlined,
  LinuxOutlined,
  CloudOutlined,
} from '@ant-design/icons';
import {
  Drawer,
  Space,
  Tag,
  Row,
  Col,
  Typography,
  Divider,
  Badge,
  Tooltip,
  Button,
  Popconfirm,
  Tabs,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DataTable } from '../../../components/shared/DataTable';
import type { GroupedPackageResponse, PackageVersionSummary } from '../../../types/hub.types';

const { Text } = Typography;

const getPlatformIcon = (platform: string) => {
  switch (platform) {
    case 'windows': return <WindowsOutlined style={{ color: '#1890ff' }} />;
    case 'macos': return <AppleOutlined style={{ color: '#000' }} />;
    case 'linux': return <LinuxOutlined style={{ color: '#f9a825' }} />;
    default: return <CloudOutlined style={{ color: '#1890ff' }} />;
  }
};

interface HubDetailsDrawerProps {
  open: boolean;
  selectedGroup: GroupedPackageResponse | null;
  onClose: () => void;
  onDeployGroup: (group: GroupedPackageResponse) => void;
  onDeployVersion: (version: PackageVersionSummary) => void;
  onDownload: (packageId: string) => void;
  onDeletePackage: (packageId: string) => void;
}

export const HubDetailsDrawer = ({
  open,
  selectedGroup,
  onClose,
  onDeployGroup,
  onDeployVersion,
  onDownload,
  onDeletePackage,
}: HubDetailsDrawerProps) => {
  const versionColumns: ColumnsType<PackageVersionSummary> = [
    {
      title: 'Version', dataIndex: 'version', key: 'version',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Status', key: 'status', width: 100,
      render: (_, record) => (
        <Space>
          {record.isActive ? <Tag color="green">Active</Tag> : <Tag color="default">Inactive</Tag>}
          {record.isVerified && <Tooltip title="Verified"><CheckCircleOutlined style={{ color: '#1890ff' }} /></Tooltip>}
        </Space>
      ),
    },
    {
      title: 'Source', dataIndex: 'installSource', key: 'installSource', width: 90,
      render: (source, record) => record.hasBundle
        ? <Tag icon={<CodeOutlined />} color="green">BUNDLE</Tag>
        : <Tag color="purple">{source.toUpperCase()}</Tag>,
    },
    {
      title: 'File', key: 'file', width: 80,
      render: (_, record) => record.hasFile
        ? <Tag icon={<FileOutlined />} color="green">{record.fileSize || 'Yes'}</Tag>
        : <Tag color="orange">No</Tag>,
    },
    {
      title: 'Actions', key: 'actions', width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Deploy">
            <Button type="text" size="small" icon={<RocketOutlined />} style={{ color: '#1890ff' }} onClick={() => onDeployVersion(record)} />
          </Tooltip>
          {record.hasFile && (
            <Tooltip title="Download">
              <Button type="text" size="small" icon={<DownloadOutlined />} onClick={() => onDownload(record.packageId)} />
            </Tooltip>
          )}
          <Popconfirm title="Delete this version?" description="This will permanently remove this package version." onConfirm={() => onDeletePackage(record.packageId)} okText="Yes" cancelText="No">
            <Tooltip title="Delete">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Drawer
      title={
        selectedGroup ? (
          <Space>
            {getPlatformIcon(selectedGroup.platform)}
            <span>{selectedGroup.displayName}</span>
          </Space>
        ) : 'Package Details'
      }
      placement="right"
      styles={{ wrapper: { width: 600 } }}
      open={open}
      onClose={onClose}
    >
      {selectedGroup && (
        <Tabs
          defaultActiveKey="details"
          items={[
            {
              key: 'details',
              label: 'Details',
              children: (
                <div>
                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <Text type="secondary">Latest Package ID</Text>
                      <div><Text code>{selectedGroup.latestPackageId}</Text></div>
                    </Col>
                    <Col span={12}>
                      <Text type="secondary">Latest Version</Text>
                      <div><Text strong>{selectedGroup.latestVersion}</Text></div>
                    </Col>
                    <Col span={12}>
                      <Text type="secondary">Platform</Text>
                      <div><Tag>{selectedGroup.platform}</Tag></div>
                    </Col>
                    <Col span={12}>
                      <Text type="secondary">Total Versions</Text>
                      <div><Badge count={selectedGroup.totalVersions} style={{ backgroundColor: '#1890ff' }} /></div>
                    </Col>
                    <Col span={12}>
                      <Text type="secondary">Category</Text>
                      <div>{selectedGroup.category ? <Tag color="blue">{selectedGroup.category}</Tag> : '-'}</div>
                    </Col>
                    <Col span={12}>
                      <Text type="secondary">Vendor</Text>
                      <div>{selectedGroup.vendor || '-'}</div>
                    </Col>
                  </Row>
                  <Divider />
                  <Text type="secondary">Description</Text>
                  <div style={{ marginTop: 8 }}>{selectedGroup.description || 'No description provided'}</div>
                  <Divider />
                  <Text type="secondary">Tags</Text>
                  <div style={{ marginTop: 8 }}>
                    {selectedGroup.tags && selectedGroup.tags.length > 0 ? (
                      <Space wrap>{selectedGroup.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</Space>
                    ) : '-'}
                  </div>
                  <Divider />
                  <Space>
                    <Button type="primary" icon={<RocketOutlined />} onClick={() => onDeployGroup(selectedGroup)}>
                      Deploy Latest
                    </Button>
                  </Space>
                </div>
              ),
            },
            {
              key: 'versions',
              label: `Versions (${selectedGroup.totalVersions})`,
              children: (
                <DataTable columns={versionColumns} data={selectedGroup.versions} rowKey="id" size="small" pagination={false} scroll={{ x: 500 }} />
              ),
            },
          ]}
        />
      )}
    </Drawer>
  );
};
