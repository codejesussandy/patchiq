import { useState } from 'react';
import {
  Input,
  Button,
  Card,
  Space,
  Tag,
  Row,
  Col,
  Table,
  Dropdown,
  Select,
  Typography,
  Modal,
  Form,
  Upload,
  Switch,
  Popconfirm,
  message,
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
  UploadOutlined,
  MoreOutlined,
} from '@ant-design/icons';

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

type SoftwareItem = {
  id: string;
  deploymentId: string;
  name: string;
  description: string;
  version: string;
  type: 'MSI' | 'EXE' | 'APPLICATION' | 'ZIP';
  os: ('Windows' | 'Mac' | 'Linux')[];
  logo?: string;
  tags?: string[];
  createdBy: string;
};

const mockSoftwareItems: SoftwareItem[] = [
  {
    id: '1',
    deploymentId: 'SWP-017',
    name: 'TightVNC',
    description: 'TightVNC',
    version: 'latest',
    type: 'MSI',
    os: ['Windows'],
    createdBy: 'Admi',
  },
  {
    id: '2',
    deploymentId: 'SWP-016',
    name: 'Google Chrome',
    description: 'Google Chrome for Ubuntu',
    version: 'latest',
    type: 'APPLICATION',
    os: ['Linux'],
    createdBy: 'Admi',
  },
  {
    id: '3',
    deploymentId: 'SWP-015',
    name: 'TEST',
    description: 'Test application installer',
    version: '7.4.0.1658',
    type: 'EXE',
    os: ['Windows'],
    createdBy: 'Abhij',
  },
  {
    id: '4',
    deploymentId: 'SWP-014',
    name: 'Zoom desktop client',
    description: 'Install Zoom desktop client for Meetings x64',
    version: 'latest',
    type: 'MSI',
    os: ['Windows'],
    createdBy: 'Admi',
  },
  {
    id: '5',
    deploymentId: 'SWP-013',
    name: 'WinRAR',
    description: 'Install winrar x64 700',
    version: '700',
    type: 'EXE',
    os: ['Windows'],
    createdBy: 'Admi',
  },
  {
    id: '6',
    deploymentId: 'SWP-012',
    name: 'VLC For Mac',
    description: 'Install VLC 3.0.20',
    version: '3.0.20',
    type: 'APPLICATION',
    os: ['Mac'],
    createdBy: 'Admi',
  },
  {
    id: '7',
    deploymentId: 'SWP-011',
    name: 'VLC',
    description: 'Install VLC 3.0.20 x64',
    version: '3.0.20',
    type: 'EXE',
    os: ['Windows'],
    createdBy: 'Admi',
  },
  {
    id: '8',
    deploymentId: 'SWP-010',
    name: 'Slack Windows',
    description: 'Install Slack for Window 64 bit',
    version: '1',
    type: 'EXE',
    os: ['Windows'],
    createdBy: 'Admi',
  },
  {
    id: '9',
    deploymentId: 'SWP-009',
    name: 'O365 Mac',
    description: 'Install Mac Office 365 Setup',
    version: '1',
    type: 'APPLICATION',
    os: ['Mac'],
    createdBy: 'Admi',
  },
  {
    id: '10',
    deploymentId: 'SWP-008',
    name: 'O365 Windows',
    description: 'Install Microsoft Office 365 Setup',
    version: '1',
    type: 'EXE',
    os: ['Windows'],
    createdBy: 'Admi',
  },
  {
    id: '11',
    deploymentId: 'SWP-007',
    name: 'Notepad++',
    description: 'Install Notepad++ v8.6.4 x64',
    version: '8.6.4',
    type: 'EXE',
    os: ['Windows'],
    createdBy: 'Admi',
  },
  {
    id: '12',
    deploymentId: 'SWP-006',
    name: 'Microsoft Teams',
    description: 'Install Microsoft Teams x64',
    version: 'latest',
    type: 'MSI',
    os: ['Windows'],
    createdBy: 'Admi',
  },
];

export const SoftwareJobsCatalog = () => {
  const [searchText, setSearchText] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [softwareItems, setSoftwareItems] = useState<SoftwareItem[]>(mockSoftwareItems);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<SoftwareItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const handleDelete = (id: string) => {
    setSoftwareItems(softwareItems.filter(item => item.id !== id));
    message.success('Software item deleted successfully');
  };

  const handleEdit = (id: string) => {
    const item = softwareItems.find(i => i.id === id);
    if (item) {
      setEditingItem(item);
      // Pre-fill form with item data
      form.setFieldsValue({
        applicationName: item.name,
        description: item.description,
        tags: item.tags || [],
        os: item.os.length === 1 ? item.os[0] : item.os,
        version: item.version,
        applicationType: item.type,
        // Note: Other fields like architecture, applicationLocationType, etc.
        // would need to be stored in the SoftwareItem type if they exist
      });
      setCreateModalVisible(true);
    }
  };

  const handleModalClose = () => {
    setCreateModalVisible(false);
    setEditingItem(null);
    form.resetFields();
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      // In a real application, this would fetch from an API
      // For now, we'll simulate a refresh by resetting to mock data
      // await fetchSoftwareItems(); // Replace with actual API call
      message.success('Data refreshed successfully');
      // For demonstration, just reload the mock data
      setSoftwareItems([...mockSoftwareItems]);
    } catch (error) {
      message.error('Failed to refresh data');
    } finally {
      setLoading(false);
    }
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

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingItem) {
        // Update existing item
        const updatedItems = softwareItems.map(item =>
          item.id === editingItem.id
            ? {
                ...item,
                name: values.applicationName,
                description: values.description || '',
                version: values.version || 'latest',
                type: values.applicationType || 'EXE',
                os: Array.isArray(values.os) ? values.os : [values.os],
                tags: values.tags || [],
              }
            : item
        );
        setSoftwareItems(updatedItems);
        message.success('Application updated successfully');
      } else {
        // Create new item
        const newItem: SoftwareItem = {
          id: `SWP-${String(softwareItems.length + 1).padStart(3, '0')}`,
          deploymentId: `SWP-${String(softwareItems.length + 1).padStart(3, '0')}`,
          name: values.applicationName,
          description: values.description || '',
          version: values.version || 'latest',
          type: values.applicationType || 'EXE',
          os: Array.isArray(values.os) ? values.os : [values.os],
          createdBy: 'Admin',
          tags: values.tags || [],
        };
        setSoftwareItems([newItem, ...softwareItems]);
        message.success('Application created successfully');
      }
      handleModalClose();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

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
    { key: '1', label: 'Edit', icon: <EditOutlined /> },
    { key: '2', label: 'Delete', icon: <DeleteOutlined />, danger: true },
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
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
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
      title: '',
      key: 'action',
      width: 60,
      fixed: 'right',
      render: (_, record) => (
        <Dropdown
          menu={{
            items: tableActionMenuItems,
            onClick: ({ key }) => {
              if (key === '1') {
                handleEdit(record.id);
              } else if (key === '2') {
                handleDelete(record.id);
              }
            },
          }}
          trigger={['click']}
        >
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
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
          <Button icon={<UploadOutlined />} onClick={handleExport}>
            Export
          </Button>
          <Button
            type="primary"
            htmlType="button"
            icon={<PlusOutlined />}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setCreateModalVisible(true);
            }}
          >
            Create
          </Button>
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
                {/* Edit and Delete Buttons */}
                <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4 }}>
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => handleEdit(item.id)}
                    style={{ padding: '4px 8px' }}
                  />
                  <Popconfirm
                    title="Delete software item"
                    description="Are you sure you want to delete this item?"
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
                    {item.name}
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

      {/* Create/Edit Application Modal */}
      <Modal
        title={editingItem ? 'Edit Application' : 'Create Application'}
        open={createModalVisible}
        onCancel={handleModalClose}
        footer={[
          <Button key="reset" onClick={() => form.resetFields()}>
            Reset
          </Button>,
          <Button key="submit" type="primary" onClick={handleSubmit}>
            {editingItem ? 'Update' : 'Create'}
          </Button>,
        ]}
        width={900}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Row gutter={24}>
            {/* Left Column */}
            <Col span={12}>
              <Form.Item
                name="applicationName"
                label={
                  <span>
                    Application Name <Text type="danger">*</Text>
                  </span>
                }
                rules={[{ required: true, message: 'Please enter application name' }]}
              >
                <Input placeholder="displayName" />
              </Form.Item>

              <Form.Item
                name="description"
                label={
                  <span>
                    Description <Text type="danger">*</Text>
                  </span>
                }
                rules={[{ required: true, message: 'Please enter description' }]}
              >
                <TextArea rows={3} placeholder="Description" />
              </Form.Item>

              <Form.Item name="tags" label="Tags">
                <Select mode="tags" placeholder="Please select" />
              </Form.Item>

              <Form.Item
                name="os"
                label={
                  <span>
                    OS <Text type="danger">*</Text>
                  </span>
                }
                rules={[{ required: true, message: 'Please select OS' }]}
                initialValue="Linux"
              >
                <Select placeholder="Select OS">
                  <Option value="Windows">
                    <Space>
                      <WindowsOutlined />
                      Windows
                    </Space>
                  </Option>
                  <Option value="Mac">
                    <Space>
                      <AppleOutlined />
                      Mac
                    </Space>
                  </Option>
                  <Option value="Linux">
                    <Space>
                      <LinuxOutlined />
                      Linux
                    </Space>
                  </Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="version"
                label={
                  <span>
                    Version <Text type="danger">*</Text>
                  </span>
                }
                rules={[{ required: true, message: 'Please enter version' }]}
              >
                <Input placeholder="ex. 1.0.0" />
              </Form.Item>

              <Form.Item
                name="applicationLocationType"
                label={
                  <span>
                    Application Location Type <Text type="danger">*</Text>
                  </span>
                }
                rules={[{ required: true, message: 'Please select location type' }]}
                initialValue="Local Directory"
              >
                <Select placeholder="Select location type">
                  <Option value="Local Directory">Local Directory</Option>
                  <Option value="Network Share">Network Share</Option>
                  <Option value="URL">URL</Option>
                </Select>
              </Form.Item>

              <Form.Item name="installationCommand" label="Installation Command">
                <Input placeholder="Installation Command" />
              </Form.Item>

              <Form.Item name="uninstallationCommand" label="Uninstallation Command">
                <Input placeholder="Uninstallation Command" />
              </Form.Item>

              <Form.Item name="upgradeCommand" label="Upgrade Command">
                <Input placeholder="Upgrade Command" />
              </Form.Item>
            </Col>

            {/* Right Column */}
            <Col span={12}>
              <Form.Item name="iconFile" label="Icon File">
                <Upload maxCount={1}>
                  <Button icon={<UploadOutlined />}>Upload (Max: 1)</Button>
                </Upload>
              </Form.Item>

              <Form.Item name="selfService" label="Self Service" valuePropName="checked" initialValue={true}>
                <Switch />
              </Form.Item>

              <Form.Item
                name="architecture"
                label={
                  <span>
                    Architecture <Text type="danger">*</Text>
                  </span>
                }
                rules={[{ required: true, message: 'Please select architecture' }]}
                initialValue="x64"
              >
                <Select placeholder="Select architecture">
                  <Option value="x64">x64</Option>
                  <Option value="x86">x86</Option>
                  <Option value="ARM64">ARM64</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="applicationType"
                label={
                  <span>
                    Application Type <Text type="danger">*</Text>
                  </span>
                }
                rules={[{ required: true, message: 'Please select application type' }]}
                initialValue="zip"
              >
                <Select placeholder="Select application type">
                  <Option value="MSI">MSI</Option>
                  <Option value="EXE">EXE</Option>
                  <Option value="APPLICATION">APPLICATION</Option>
                  <Option value="ZIP">ZIP</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="applicationFile"
                label={
                  <span>
                    Application File <Text type="danger">*</Text>
                  </span>
                }
                rules={[{ required: true, message: 'Please upload application file' }]}
              >
                <Upload maxCount={1}>
                  <Button icon={<UploadOutlined />}>Upload (Max: 1)</Button>
                </Upload>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};
