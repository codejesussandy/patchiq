import { useState, useEffect } from 'react';
import {
  App,
  Input,
  Button,
  Card,
  Space,
  Tag,
  Row,
  Col,
  Table,
  Dropdown,
  Typography,
  Popconfirm,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  WindowsOutlined,
  AppleOutlined,
  LinuxOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  ExportOutlined,
  MoreOutlined,
  RocketOutlined,
  CloudServerOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { hubService } from '../../services/hub.service';
import type { SoftwarePackage } from '../../types/hub.types';

const { Text } = Typography;

type SoftwareItem = {
  id: string;
  packageId: string;  // Hub packageId
  deploymentId: string;  // Alias for display
  name: string;
  displayName: string;
  description: string;
  version: string;
  type: 'MSI' | 'EXE' | 'APPLICATION' | 'ZIP' | 'BUNDLE';
  os: ('Windows' | 'Mac' | 'Linux')[];
  logo?: string;
  tags?: string[];
  createdBy: string;
  hasBundle: boolean;  // Whether this has Hub scripts
  installSource: string;
};

export const SoftwareJobsCatalog = () => {
  const { message } = App.useApp();
  const [searchText, setSearchText] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [softwareItems, setSoftwareItems] = useState<SoftwareItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const navigate = useNavigate();

  // Convert Hub platform to display OS
  const platformToOs = (platform: string): ('Windows' | 'Mac' | 'Linux')[] => {
    switch (platform) {
      case 'windows': return ['Windows'];
      case 'macos': return ['Mac'];
      case 'linux': return ['Linux'];
      case 'cross-platform': return ['Windows', 'Mac', 'Linux'];
      default: return ['Linux'];
    }
  };

  // Convert install source to display type
  const installSourceToType = (source: string): 'MSI' | 'EXE' | 'APPLICATION' | 'ZIP' | 'BUNDLE' => {
    switch (source) {
      case 'msi': return 'MSI';
      case 'exe': return 'EXE';
      case 'zip': return 'ZIP';
      case 'bundle': return 'BUNDLE';
      default: return 'APPLICATION';
    }
  };

  // Fetch software packages from Hub
  const fetchSoftwareCatalog = async () => {
    setLoading(true);
    try {
      const response = await hubService.listPackages({ limit: 100 });
      const packages = response.data || [];
      const mapped: SoftwareItem[] = packages.map((pkg: SoftwarePackage) => ({
        id: pkg.id,
        packageId: pkg.packageId,
        deploymentId: pkg.packageId,  // Use packageId for display
        name: pkg.name,
        displayName: pkg.displayName,
        description: pkg.description || '',
        version: pkg.version,
        type: installSourceToType(pkg.installSource),
        os: platformToOs(pkg.platform),
        tags: pkg.tags || [],
        createdBy: pkg.vendor || 'System',
        hasBundle: pkg.hasBundle || pkg.scriptsIncluded,
        installSource: pkg.installSource,
      }));
      setSoftwareItems(mapped);
    } catch (error) {
      console.error('Failed to fetch software packages:', error);
      message.error('Failed to load software packages from Hub');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSoftwareCatalog();
  }, []);

  const handleDelete = async (id: string) => {
    const item = softwareItems.find(i => i.id === id);
    if (!item) return;

    try {
      await hubService.deletePackage(item.packageId);
      setSoftwareItems(softwareItems.filter(item => item.id !== id));
      message.success('Software package deleted successfully');
    } catch (error) {
      console.error('Failed to delete software:', error);
      message.error('Failed to delete software package');
    }
  };

  const handleEdit = (id: string) => {
    const item = softwareItems.find(i => i.id === id);
    if (item) {
      // For Hub packages, navigate to Hub page for editing
      message.info('Redirecting to Hub for package editing...');
      navigate('/hub');
    }
  };

  // Navigate to Software Deployed page with package pre-selected
  const handleDeploy = (item: SoftwareItem) => {
    // Navigate to software deployed page with deployment context
    // The SoftwareJobsDeployed page will handle deployment creation
    navigate('/jobs/software/deployed', {
      state: {
        createDeployment: true,
        selectedPackage: {
          id: item.id,
          packageId: item.packageId,
          name: item.name,
          displayName: item.displayName,
          version: item.version,
          installSource: item.installSource,
          hasBundle: item.hasBundle,
        },
      },
    });
  };


  const handleRefresh = async () => {
    await fetchSoftwareCatalog();
    message.success('Data refreshed successfully');
  };

  const handleExport = () => {
    try {
      // Prepare data for export - use filtered items or all items
      const dataToExport = filteredItems.length > 0 ? filteredItems : softwareItems;
      
      if (dataToExport.length === 0) {
        message.warning('No data to export');
        return;
      }

      const exportData = dataToExport.map((item) => ({
        ID: item.deploymentId,
        Name: item.name,
        Description: item.description,
        OS: item.os.join(', '),
        Version: item.version,
        Type: item.type,
        Tags: item.tags?.join(', ') || '',
        'Created By': item.createdBy,
      }));

      // Convert to CSV
      const headers = Object.keys(exportData[0] || {});
      const csvContent = [
        headers.join(','), // Header row
        ...exportData.map((row) =>
          headers.map((header) => {
            const value = row[header as keyof typeof row] || '';
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        ),
      ].join('\n');

      // Create blob and download
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `software_catalog_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('Software catalog exported successfully');
    } catch (error) {
      message.error('Failed to export data');
      console.error('Export error:', error);
    }
  };

  // Package creation/editing is handled via Hub page
  // This catalog is now read-only with deploy actions

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

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'MSI':
        return 'blue';
      case 'EXE':
        return 'cyan';
      case 'APPLICATION':
        return 'cyan';
      case 'ZIP':
        return 'orange';
      case 'BUNDLE':
        return 'green';
      default:
        return 'default';
    }
  };

  const filteredItems = softwareItems.filter(item =>
    item.name.toLowerCase().includes(searchText.toLowerCase()) ||
    item.description.toLowerCase().includes(searchText.toLowerCase()) ||
    item.deploymentId.toLowerCase().includes(searchText.toLowerCase())
  );

  const endpointsMenuItems: MenuProps['items'] = [
    { key: '1', label: 'All Endpoints' },
    { key: '2', label: 'Windows Endpoints' },
    { key: '3', label: 'Mac Endpoints' },
    { key: '4', label: 'Linux Endpoints' },
  ];

  const tableActionMenuItems: MenuProps['items'] = [
    { key: 'deploy', label: 'Deploy', icon: <RocketOutlined /> },
    { key: 'edit', label: 'Edit in Hub', icon: <EditOutlined /> },
    { key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true },
  ];


  const columns: ColumnsType<SoftwareItem> = [
    {
      title: 'ID',
      dataIndex: 'deploymentId',
      key: 'deploymentId',
      width: 100,
      sorter: (a, b) => a.deploymentId.localeCompare(b.deploymentId),
    },
    {
      title: '',
      key: 'logo',
      width: 80,
      render: (_, record) => (
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 8,
            background: '#f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px dashed #d9d9d9',
          }}
        >
          <Text type="secondary" style={{ fontSize: 10 }}>
            {record.logo || 'Add Logo'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Name',
      key: 'name',
      sorter: (a, b) => (a.displayName || a.name).localeCompare(b.displayName || b.name),
      render: (_, record) => (
        <Space>
          <Text>{record.displayName || record.name}</Text>
          {record.hasBundle && (
            <Tooltip title="Hub-managed with deployment scripts">
              <Tag color="green" style={{ fontSize: 10 }}>
                <CloudServerOutlined /> BUNDLE
              </Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      sorter: (a, b) => a.description.localeCompare(b.description),
      render: (text: string) => (
        <Text ellipsis style={{ maxWidth: 200 }}>
          {text}
        </Text>
      ),
    },
    {
      title: 'OS',
      dataIndex: 'os',
      key: 'os',
      render: (os: string[]) => (
        <Space>
          {os.map((o) => (
            <span key={o}>{getOSIcon(o)}</span>
          ))}
        </Space>
      ),
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      sorter: (a, b) => a.version.localeCompare(b.version),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={getTypeColor(type)}>{type}</Tag>
      ),
    },
    {
      title: 'Tags',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) => tags && tags.length > 0 ? tags.join(', ') : '-',
    },
    {
      title: 'Created By',
      dataIndex: 'createdBy',
      key: 'createdBy',
      sorter: (a, b) => a.createdBy.localeCompare(b.createdBy),
    },
    {
      title: 'Actions',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="Deploy this package">
            <Button
              type="primary"
              size="small"
              icon={<RocketOutlined />}
              onClick={() => handleDeploy(record)}
            >
              Deploy
            </Button>
          </Tooltip>
          <Dropdown
            menu={{
              items: tableActionMenuItems,
              onClick: ({ key }) => {
                if (key === 'deploy') {
                  handleDeploy(record);
                } else if (key === 'edit') {
                  handleEdit(record.id);
                } else if (key === 'delete') {
                  handleDelete(record.id);
                }
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

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedRowKeys(selectedKeys);
    },
  };

  return (
    <div>
      {/* Top Controls */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', flex: 1 }}>
          <Input
            placeholder="Search..."
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <Dropdown menu={{ items: endpointsMenuItems }} trigger={['click']}>
            <Button>
              Endpoints <span style={{ marginLeft: 4 }}>▼</span>
            </Button>
          </Dropdown>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
            Refresh
          </Button>
          <Button icon={<ExportOutlined />} onClick={handleExport}>
            Export
          </Button>
          <Tooltip title="Add new packages via Hub">
            <Button
              type="primary"
              htmlType="button"
              icon={<PlusOutlined />}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate('/hub');
              }}
            >
              Add Package
            </Button>
          </Tooltip>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            type={viewMode === 'list' ? 'primary' : 'default'}
            icon={<UnorderedListOutlined />}
            onClick={() => setViewMode('list')}
          />
          <Button
            type={viewMode === 'grid' ? 'primary' : 'default'}
            icon={<AppstoreOutlined />}
            onClick={() => setViewMode('grid')}
          />
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'grid' ? (
        <Row gutter={[16, 16]}>
          {filteredItems.map((item) => (
            <Col key={item.id} xs={24} sm={12} md={8} lg={6} xl={6}>
              <Card
                hoverable
                style={{ height: '100%', position: 'relative' }}
                bodyStyle={{ padding: 16 }}
              >
                {/* Action Buttons */}
                <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4 }}>
                  <Tooltip title="Deploy this package">
                    <Button
                      type="primary"
                      size="small"
                      icon={<RocketOutlined />}
                      onClick={() => handleDeploy(item)}
                      style={{ padding: '4px 8px' }}
                    />
                  </Tooltip>
                  <Popconfirm
                    title="Delete software package"
                    description="Are you sure you want to delete this package?"
                    onConfirm={() => handleDelete(item.id)}
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

                {/* Bundle indicator */}
                {item.hasBundle && (
                  <div style={{ position: 'absolute', top: 8, left: 8 }}>
                    <Tooltip title="Hub-managed with deployment scripts">
                      <Tag color="green" style={{ fontSize: 10 }}>
                        <CloudServerOutlined /> BUNDLE
                      </Tag>
                    </Tooltip>
                  </div>
                )}

                {/* Logo Placeholder */}
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 8,
                    background: '#f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                    border: '1px dashed #d9d9d9',
                  }}
                >
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {item.logo || 'Add Logo'}
                  </Text>
                </div>

                {/* Name */}
                <div style={{ marginBottom: 8 }}>
                  <Text strong style={{ fontSize: 14 }}>
                    {item.displayName || item.name}
                  </Text>
                </div>

                {/* Description */}
                <div style={{ marginBottom: 12, minHeight: 40 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {item.description}
                  </Text>
                </div>

                {/* Tags */}
                <div style={{ marginBottom: 12 }}>
                  <Space size={[0, 8]} wrap>
                    <Tag color="default">{item.version}</Tag>
                    <Tag color={getTypeColor(item.type)}>{item.type}</Tag>
                  </Space>
                </div>

                {/* OS Icons */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {item.os.map((os) => (
                    <span key={os}>{getOSIcon(os)}</span>
                  ))}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={filteredItems}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total, range) =>
              `showing ${range[0]}-${range[1]} of ${total} items`,
          }}
          scroll={{ x: 'max-content' }}
        />
      )}

    </div>
  );
};
