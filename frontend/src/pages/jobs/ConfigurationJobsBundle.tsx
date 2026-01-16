import { useState } from 'react';
import {
  Input,
  Button,
  Table,
  Space,
  Tag,
  Typography,
  Dropdown,
  Modal,
  Form,
  Select,
  Popconfirm,
  message,
  Badge,
  Row,
  Col,
  Checkbox,
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
  ExportOutlined,
  FilterOutlined,
  RightOutlined,
  LeftOutlined,
  CloseOutlined,
} from '@ant-design/icons';

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

type ConfigurationBundleItem = {
  id: string;
  name: string;
  description: string;
  os: ('Windows' | 'Mac' | 'Linux')[];
  configurations: number;
  configurationsList?: string[]; // IDs of configurations
  createdBy: string;
  createdOn: string;
};

type ConfigurationItem = {
  key: string;
  configurationId: string;
  title: string;
  os: string[];
  architecture: string;
};

const mockBundleItems: ConfigurationBundleItem[] = [
  {
    id: '1',
    name: 'Security Hardening for Windows',
    description: 'Security Hardening for Windows endpoints with comprehensive policies',
    os: ['Windows'],
    configurations: 6,
    configurationsList: ['1', '2', '3', '4', '5', '6'],
    createdBy: 'Admin',
    createdOn: '2026/01/12 12:27:44 PM',
  },
  {
    id: '2',
    name: 'Mac Security Bundle',
    description: 'Security configurations for Mac endpoints',
    os: ['Mac'],
    configurations: 4,
    configurationsList: ['1', '2', '3', '4'],
    createdBy: 'Admin',
    createdOn: '2026/01/11 10:15:30 AM',
  },
  {
    id: '3',
    name: 'Linux Compliance Bundle',
    description: 'Compliance and security configurations for Linux systems',
    os: ['Linux'],
    configurations: 5,
    configurationsList: ['1', '2', '3', '4', '5'],
    createdBy: 'Admin',
    createdOn: '2026/01/10 09:20:15 AM',
  },
];

// Mock configurations - these would come from the catalog
const mockConfigurations: ConfigurationItem[] = [
  { key: '1', configurationId: 'CNF-017', title: 'Turns Off Automated Adobe Read', os: ['Windows'], architecture: 'x64' },
  { key: '2', configurationId: 'CNF-016', title: 'Turns off automatic updates for Ac', os: ['Windows'], architecture: 'x64' },
  { key: '3', configurationId: 'CNF-015', title: 'Stop Auto Update of Google Chro', os: ['Windows'], architecture: 'x64' },
  { key: '4', configurationId: 'CNF-014', title: 'Stop Automated App Updates', os: ['Windows'], architecture: 'x64' },
  { key: '5', configurationId: 'CNF-013', title: 'Stop Automatic Delivery of IE 10', os: ['Windows'], architecture: 'x64' },
  { key: '6', configurationId: 'CNF-012', title: 'Turn Off Automated upgrade of IE', os: ['Windows'], architecture: 'x64' },
  { key: '7', configurationId: 'CNF-011', title: 'Turn Off automatic updates for Wi', os: ['Windows'], architecture: 'x64' },
  { key: '8', configurationId: 'CNF-010', title: 'Stop Automated Java Updates', os: ['Windows'], architecture: 'x64' },
  { key: '9', configurationId: 'CNF-009', title: 'Turns off Automated Adobe Acrobat X Updater', os: ['Windows'], architecture: 'x64' },
  { key: '10', configurationId: 'CNF-008', title: 'Turns off Automated Adobe Acrobat XI Updater', os: ['Windows'], architecture: 'x64' },
  { key: '11', configurationId: 'CNF-007', title: 'Turns off Automated Adobe Acrobat Reader DC updater', os: ['Windows'], architecture: 'x64' },
  { key: '12', configurationId: 'CNF-006', title: 'Turns off automated Adobe AIR Updater', os: ['Windows'], architecture: 'x64' },
  { key: '13', configurationId: 'CNF-005', title: 'Turns off Automated Adobe Reader 10 updater', os: ['Windows'], architecture: 'x64' },
  { key: '14', configurationId: 'CNF-004', title: 'Turns off Automated Adobe Reader 11 update', os: ['Windows'], architecture: 'x64' },
  { key: '15', configurationId: 'CNF-003', title: 'Disable Windows Update Auto Restart', os: ['Windows'], architecture: 'x64' },
  { key: '16', configurationId: 'CNF-002', title: 'Configure Windows Firewall', os: ['Windows'], architecture: 'x64' },
  { key: '17', configurationId: 'CNF-001', title: 'Enable BitLocker Drive Encryption', os: ['Windows'], architecture: 'x64' },
  { key: '18', configurationId: 'CNF-023', title: 'Turns off Automated Adobe', os: ['Windows'], architecture: 'x64' },
  { key: '19', configurationId: 'CNF-022', title: 'Turns off Automated Adobe', os: ['Windows'], architecture: 'x64' },
  { key: '20', configurationId: 'CNF-021', title: 'Turns off Automated Adobe', os: ['Windows'], architecture: 'x64' },
  { key: '21', configurationId: 'CNF-020', title: 'Turns off automated Adobe', os: ['Windows'], architecture: 'x64' },
  { key: '22', configurationId: 'CNF-019', title: 'Turns off Automated Adobe', os: ['Windows'], architecture: 'x64' },
  { key: '23', configurationId: 'CNF-018', title: 'Turns off Automated Adobe', os: ['Windows'], architecture: 'x64' },
];

export const ConfigurationJobsBundle = () => {
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [bundleItems, setBundleItems] = useState<ConfigurationBundleItem[]>(mockBundleItems);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ConfigurationBundleItem | null>(null);
  const [form] = Form.useForm();
  const [selectedConfigurations, setSelectedConfigurations] = useState<string[]>([]);
  const [availableSearch, setAvailableSearch] = useState('');
  const [selectedSearch, setSelectedSearch] = useState('');
  const [selectedAvailableKeys, setSelectedAvailableKeys] = useState<string[]>([]);
  const [selectedSelectedKeys, setSelectedSelectedKeys] = useState<string[]>([]);

  const handleDelete = (id: string) => {
    setBundleItems(bundleItems.filter(item => item.id !== id));
    message.success('Bundle deleted successfully');
    setSelectedRowKeys([]);
  };

  const handleEdit = (record: ConfigurationBundleItem) => {
    setEditingItem(record);
    form.setFieldsValue({
      bundleName: record.name,
      os: record.os.length === 1 ? record.os[0] : record.os[0],
      description: record.description,
    });
    setSelectedConfigurations(record.configurationsList || []);
    setSelectedAvailableKeys([]);
    setSelectedSelectedKeys([]);
    setAvailableSearch('');
    setSelectedSearch('');
    setCreateModalVisible(true);
  };

  const handleModalClose = () => {
    setCreateModalVisible(false);
    setEditingItem(null);
    setSelectedConfigurations([]);
    setSelectedAvailableKeys([]);
    setSelectedSelectedKeys([]);
    setAvailableSearch('');
    setSelectedSearch('');
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      await form.validateFields();
      
      if (selectedConfigurations.length === 0) {
        message.error('Please select at least one configuration');
        return;
      }

      const values = form.getFieldsValue();

      if (editingItem) {
        // Update existing bundle
        const updatedItems = bundleItems.map(item =>
          item.id === editingItem.id
            ? {
                ...item,
                name: values.bundleName,
                description: values.description || '',
                os: Array.isArray(values.os) ? values.os : [values.os],
                configurations: selectedConfigurations.length,
                configurationsList: selectedConfigurations,
              }
            : item
        );
        setBundleItems(updatedItems);
        message.success('Bundle updated successfully');
      } else {
        // Create new bundle
        const newItem: ConfigurationBundleItem = {
          id: String(bundleItems.length + 1),
          name: values.bundleName,
          description: values.description || '',
          os: Array.isArray(values.os) ? values.os : [values.os],
          configurations: selectedConfigurations.length,
          configurationsList: selectedConfigurations,
          createdBy: 'Admin',
          createdOn: new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          }).replace(',', ''),
        };
        setBundleItems([newItem, ...bundleItems]);
        message.success('Bundle created successfully');
      }
      handleModalClose();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  // Filter configurations based on selected OS
  const getFilteredConfigurations = () => {
    const osValue = form.getFieldValue('os');
    if (!osValue) return mockConfigurations;
    return mockConfigurations.filter(config => config.os.includes(osValue));
  };

  // Get available and selected configurations
  const availableConfigs = getFilteredConfigurations().filter(config => !selectedConfigurations.includes(config.key));
  const selectedConfigs = getFilteredConfigurations().filter(config => selectedConfigurations.includes(config.key));

  // Filter by search
  const filteredAvailableConfigs = availableConfigs.filter(config =>
    config.title.toLowerCase().includes(availableSearch.toLowerCase()) ||
    config.configurationId.toLowerCase().includes(availableSearch.toLowerCase())
  );

  const filteredSelectedConfigs = selectedConfigs.filter(config =>
    config.title.toLowerCase().includes(selectedSearch.toLowerCase()) ||
    config.configurationId.toLowerCase().includes(selectedSearch.toLowerCase())
  );

  // Render Transfer list
  const renderTransferList = (direction: 'left' | 'right') => {
    const isLeft = direction === 'left';
    const items = isLeft ? filteredAvailableConfigs : filteredSelectedConfigs;
    const searchValue = isLeft ? availableSearch : selectedSearch;
    const setSearch = isLeft ? setAvailableSearch : setSelectedSearch;
    const selectedKeys = isLeft ? selectedAvailableKeys : selectedSelectedKeys;
    const setSelectedKeys = isLeft ? setSelectedAvailableKeys : setSelectedSelectedKeys;

    const handleItemSelect = (key: string) => {
      if (selectedKeys.includes(key)) {
        setSelectedKeys(selectedKeys.filter(k => k !== key));
      } else {
        setSelectedKeys([...selectedKeys, key]);
      }
    };

    const handleSelectAll = (checked: boolean) => {
      if (checked) {
        setSelectedKeys(items.map(item => item.key));
      } else {
        setSelectedKeys([]);
      }
    };

    return (
      <div style={{ border: '1px solid #d9d9d9', borderRadius: 6, padding: 8, height: 400, display: 'flex', flexDirection: 'column' }}>
        {/* Header with checkbox and count */}
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', marginBottom: 8, flexShrink: 0 }}>
          <Checkbox
            indeterminate={selectedKeys.length > 0 && selectedKeys.length < items.length}
            checked={items.length > 0 && selectedKeys.length === items.length}
            onChange={(e) => handleSelectAll(e.target.checked)}
          >
            <Text strong style={{ marginLeft: 8 }}>
              {items.length} item{items.length !== 1 ? 's' : ''}
            </Text>
          </Checkbox>
        </div>

        {/* Search bar */}
        <div style={{ padding: '0 12px 8px 12px', flexShrink: 0 }}>
          <Input
            placeholder="Search here"
            prefix={<SearchOutlined />}
            value={searchValue}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
              <div>No data</div>
            </div>
          ) : (
            items.map((item) => {
              const isSelected = selectedKeys.includes(item.key);
              const getOSIcon = () => {
                if (item.os.includes('Windows')) return <WindowsOutlined style={{ color: '#1890ff' }} />;
                if (item.os.includes('Mac')) return <AppleOutlined />;
                if (item.os.includes('Linux')) return <LinuxOutlined />;
                return null;
              };

              return (
                <div
                  key={item.key}
                  onClick={() => handleItemSelect(item.key)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#e6f7ff' : 'transparent',
                    borderBottom: '1px solid #f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Checkbox checked={isSelected} />
                  {getOSIcon()}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      {item.configurationId}: {item.title}
                    </div>
                    <div style={{ fontSize: 11, color: '#999' }}>({item.architecture})</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      message.success('Data refreshed successfully');
    } catch (error) {
      message.error('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    try {
      const dataToExport = filteredItems.length > 0 ? filteredItems : bundleItems;
      
      if (dataToExport.length === 0) {
        message.warning('No data to export');
        return;
      }

      const exportData = dataToExport.map((item) => ({
        Name: item.name,
        Description: item.description,
        OS: item.os.join(', '),
        Configurations: item.configurations,
        'Created By': item.createdBy,
        'Created On': item.createdOn,
      }));

      const headers = Object.keys(exportData[0] || {});
      const csvContent = [
        headers.join(','),
        ...exportData.map((row) =>
          headers.map((header) => {
            const value = row[header as keyof typeof row] || '';
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        ),
      ].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `configuration_bundle_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('Bundle data exported successfully');
    } catch (error) {
      message.error('Failed to export data');
      console.error('Export error:', error);
    }
  };

  const getOSIcons = (os: string[]) => {
    return (
      <Space>
        {os.map((o) => {
          switch (o) {
            case 'Windows':
              return <WindowsOutlined key={o} style={{ fontSize: 18, color: '#1890ff' }} />;
            case 'Mac':
              return <AppleOutlined key={o} style={{ fontSize: 18, color: '#000' }} />;
            case 'Linux':
              return <LinuxOutlined key={o} style={{ fontSize: 18, color: '#000' }} />;
            default:
              return null;
          }
        })}
      </Space>
    );
  };

  const filteredItems = bundleItems.filter(
    item =>
      item.name.toLowerCase().includes(searchText.toLowerCase()) ||
      item.description.toLowerCase().includes(searchText.toLowerCase()) ||
      item.createdBy.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns: ColumnsType<ConfigurationBundleItem> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text: string) => (
        <Text style={{ color: '#1890ff', cursor: 'pointer' }}>{text}</Text>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      sorter: (a, b) => a.description.localeCompare(b.description),
      render: (text: string) => (
        <Text ellipsis style={{ maxWidth: 300 }}>
          {text}
        </Text>
      ),
    },
    {
      title: 'OS',
      dataIndex: 'os',
      key: 'os',
      render: (os: string[]) => getOSIcons(os),
    },
    {
      title: 'Configurations',
      dataIndex: 'configurations',
      key: 'configurations',
      align: 'center',
      sorter: (a, b) => a.configurations - b.configurations,
      render: (count: number) => (
        <Badge
          count={count}
          style={{ backgroundColor: '#1890ff' }}
        />
      ),
    },
    {
      title: 'Created By',
      dataIndex: 'createdBy',
      key: 'createdBy',
      sorter: (a, b) => a.createdBy.localeCompare(b.createdBy),
    },
    {
      title: 'Created On',
      dataIndex: 'createdOn',
      key: 'createdOn',
      sorter: (a, b) => new Date(a.createdOn).getTime() - new Date(b.createdOn).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: ConfigurationBundleItem) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            style={{ color: '#1890ff' }}
          />
          <Popconfirm
            title="Delete bundle"
            description="Are you sure you want to delete this bundle?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
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

  const filterMenuItems: MenuProps['items'] = [
    { key: '1', label: 'Filter Option 1' },
    { key: '2', label: 'Filter Option 2' },
  ];

  return (
    <div>
      {/* Top Controls */}
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
          placeholder="Search..."
          prefix={<SearchOutlined />}
          style={{ width: 300 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <Space>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
            Refresh
          </Button>
          <Button icon={<ExportOutlined />} onClick={handleExport}>
            Export
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setCreateModalVisible(true);
              setSelectedConfigurations([]);
              setSelectedAvailableKeys([]);
              setSelectedSelectedKeys([]);
              setAvailableSearch('');
              setSelectedSearch('');
              form.resetFields();
            }}
            htmlType="button"
          >
            Create
          </Button>
        </Space>
      </div>

      {/* Table */}
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

      {/* Create/Edit Modal */}
      <Modal
        title={
          <Space>
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={handleModalClose}
              style={{ marginLeft: -16, marginRight: -8 }}
            />
            <Text strong style={{ fontSize: 16 }}>
              {editingItem ? 'Edit Configuration Bundle' : 'Create Configuration Bundle'}
            </Text>
          </Space>
        }
        open={createModalVisible}
        onCancel={handleModalClose}
        footer={[
          <Button key="reset" onClick={() => form.resetFields()}>
            Reset
          </Button>,
          <Button key="update" type="primary" onClick={handleSubmit}>
            {editingItem ? 'Update' : 'Create'}
          </Button>,
        ]}
        width={900}
        closable={false}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="bundleName"
            label={
              <span>
                Bundle Name <Text type="danger">*</Text>
              </span>
            }
            rules={[{ required: true, message: 'Please enter bundle name' }]}
          >
            <Input placeholder="Bundle Name" />
          </Form.Item>

          <Form.Item
            name="os"
            label={
              <span>
                OS <Text type="danger">*</Text>
              </span>
            }
            rules={[{ required: true, message: 'Please select OS' }]}
          >
            <Select placeholder="Please select">
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
            label={
              <span>
                Configurations <Text type="danger">*</Text>
              </span>
            }
            rules={[
              {
                validator: () => {
                  if (selectedConfigurations.length === 0) {
                    return Promise.reject(new Error('Please select at least one configuration'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Row gutter={16}>
              {/* Available Configurations */}
              <Col span={11}>
                {renderTransferList('left')}
              </Col>

              {/* Transfer Buttons */}
              <Col span={2} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                <Button
                  type="primary"
                  icon={<RightOutlined />}
                  onClick={() => {
                    setSelectedConfigurations([...selectedConfigurations, ...selectedAvailableKeys]);
                    setSelectedAvailableKeys([]);
                  }}
                  disabled={selectedAvailableKeys.length === 0}
                />
                <Button
                  type="primary"
                  icon={<LeftOutlined />}
                  onClick={() => {
                    setSelectedConfigurations(selectedConfigurations.filter(k => !selectedSelectedKeys.includes(k)));
                    setSelectedSelectedKeys([]);
                  }}
                  disabled={selectedSelectedKeys.length === 0}
                />
              </Col>

              {/* Selected Configurations */}
              <Col span={11}>
                {renderTransferList('right')}
              </Col>
            </Row>
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
        </Form>
      </Modal>
    </div>
  );
};
