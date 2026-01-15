import { useState } from 'react';
import {
  Input,
  Button,
  Table,
  Space,
  Tag,
  Typography,
  Dropdown,
  Select,
  Modal,
  Form,
  Popconfirm,
  message,
  Checkbox,
  Row,
  Col,
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
  RightOutlined,
  LeftOutlined,
} from '@ant-design/icons';

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

type BundleItem = {
  id: string;
  name: string;
  description: string;
  os: ('Windows' | 'Mac' | 'Linux')[];
  softwares: number;
  softwaresList?: string[]; // IDs of applications
  createdBy: string;
  createdOn: string;
};

type ApplicationItem = {
  key: string;
  title: string;
  description: string;
  os: string[];
  type: string;
};

const mockBundleItems: BundleItem[] = [
  {
    id: '1',
    name: 'HR Team',
    description: 'HR team Software bundle',
    os: ['Windows'],
    softwares: 3,
    softwaresList: ['1', '4', '5'],
    createdBy: 'Admin',
    createdOn: '2026/01/12 12:25:41 PM',
  },
];

// Mock applications - these would come from the catalog
const mockApplications: ApplicationItem[] = [
  { key: '1', title: 'TightVNC', description: 'TightVNC', os: ['Windows'], type: 'MSI' },
  { key: '2', title: 'Google Chrome', description: 'Google Chrome for Ubuntu', os: ['Linux'], type: 'APPLICATION' },
  { key: '3', title: 'TEST', description: 'Test application installer', os: ['Windows'], type: 'EXE' },
  { key: '4', title: 'Zoom desktop client', description: 'Install Zoom desktop client for Meetings x64', os: ['Windows'], type: 'MSI' },
  { key: '5', title: 'WinRAR', description: 'Install winrar x64 700', os: ['Windows'], type: 'EXE' },
  { key: '6', title: 'VLC For Mac', description: 'Install VLC 3.0.20', os: ['Mac'], type: 'APPLICATION' },
  { key: '7', title: 'VLC', description: 'Install VLC 3.0.20 x64', os: ['Windows'], type: 'EXE' },
  { key: '8', title: 'Slack Windows', description: 'Install Slack for Window 64 bit', os: ['Windows'], type: 'EXE' },
  { key: '9', title: 'O365 Mac', description: 'Install Mac Office 365 Setup', os: ['Mac'], type: 'APPLICATION' },
  { key: '10', title: 'O365 Windows', description: 'Install Microsoft Office 365 Setup', os: ['Windows'], type: 'EXE' },
  { key: '11', title: 'Notepad++', description: 'Install Notepad++ v8.6.4 x64', os: ['Windows'], type: 'EXE' },
  { key: '12', title: 'Microsoft Teams', description: 'Install Microsoft Teams x64', os: ['Windows'], type: 'MSI' },
  { key: '13', title: 'Firefox', description: 'Mozilla Firefox Browser', os: ['Windows', 'Mac', 'Linux'], type: 'EXE' },
];

export const SoftwareJobsBundle = () => {
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [bundleItems, setBundleItems] = useState<BundleItem[]>(mockBundleItems);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<BundleItem | null>(null);
  const [form] = Form.useForm();
  const [selectedApplications, setSelectedApplications] = useState<string[]>([]);
  const [availableSearch, setAvailableSearch] = useState('');
  const [selectedSearch, setSelectedSearch] = useState('');
  const [selectedAvailableKeys, setSelectedAvailableKeys] = useState<string[]>([]);
  const [selectedSelectedKeys, setSelectedSelectedKeys] = useState<string[]>([]);

  const handleDelete = (id: string) => {
    setBundleItems(bundleItems.filter(item => item.id !== id));
    message.success('Bundle deleted successfully');
    setSelectedRowKeys([]);
  };

  const handleEdit = (record: BundleItem) => {
    setEditingItem(record);
    form.setFieldsValue({
      bundleName: record.name,
      os: record.os.length === 1 ? record.os[0] : record.os[0],
      description: record.description,
    });
    setSelectedApplications(record.softwaresList || []);
    setCreateModalVisible(true);
  };

  const handleModalClose = () => {
    setCreateModalVisible(false);
    setEditingItem(null);
    setSelectedApplications([]);
    setAvailableSearch('');
    setSelectedSearch('');
    setSelectedAvailableKeys([]);
    setSelectedSelectedKeys([]);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (selectedApplications.length === 0) {
        message.error('Please select at least one application');
        return;
      }

      if (editingItem) {
        // Update existing bundle
        const updatedItems = bundleItems.map(item =>
          item.id === editingItem.id
            ? {
                ...item,
                name: values.bundleName,
                description: values.description || '',
                os: Array.isArray(values.os) ? values.os : [values.os],
                softwares: selectedApplications.length,
                softwaresList: selectedApplications,
              }
            : item
        );
        setBundleItems(updatedItems);
        message.success('Bundle updated successfully');
      } else {
        // Create new bundle
        const newItem: BundleItem = {
          id: String(bundleItems.length + 1),
          name: values.bundleName,
          description: values.description || '',
          os: Array.isArray(values.os) ? values.os : [values.os],
          softwares: selectedApplications.length,
          softwaresList: selectedApplications,
          createdBy: 'Admin',
          createdOn: new Date().toLocaleString(),
        };
        setBundleItems([newItem, ...bundleItems]);
        message.success('Bundle created successfully');
      }
      handleModalClose();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      // In a real application, this would fetch from an API
      message.success('Data refreshed successfully');
      setBundleItems([...mockBundleItems]);
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
        Softwares: item.softwares,
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
      link.setAttribute('download', `software_bundle_${new Date().toISOString().split('T')[0]}.csv`);
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

  const endpointsMenuItems: MenuProps['items'] = [
    { key: '1', label: 'All Endpoints' },
    { key: '2', label: 'Windows Endpoints' },
    { key: '3', label: 'Mac Endpoints' },
    { key: '4', label: 'Linux Endpoints' },
  ];

  const columns: ColumnsType<BundleItem> = [
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
    },
    {
      title: 'OS',
      dataIndex: 'os',
      key: 'os',
      render: (os: string[]) => getOSIcons(os),
    },
    {
      title: 'Softwares',
      dataIndex: 'softwares',
      key: 'softwares',
      align: 'center',
      sorter: (a, b) => a.softwares - b.softwares,
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
      title: '',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(record);
            }}
          />
          <Popconfirm
            title="Delete bundle"
            description="Are you sure you want to delete this bundle?"
            onConfirm={(e) => {
              e?.stopPropagation();
              handleDelete(record.id);
            }}
            onCancel={(e) => e?.stopPropagation()}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => e.stopPropagation()}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const filteredItems = bundleItems.filter(
    item =>
      item.name.toLowerCase().includes(searchText.toLowerCase()) ||
      item.description.toLowerCase().includes(searchText.toLowerCase())
  );

  const rowSelection = {
    type: 'radio' as const,
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedRowKeys(selectedKeys);
    },
  };

  // Filter applications based on selected OS
  const getFilteredApplications = () => {
    const osValue = form.getFieldValue('os');
    if (!osValue) return mockApplications;
    return mockApplications.filter(app => app.os.includes(osValue));
  };

  // Get available and selected applications for Transfer
  const availableApps = getFilteredApplications().filter(app => !selectedApplications.includes(app.key));
  const selectedApps = getFilteredApplications().filter(app => selectedApplications.includes(app.key));

  // Filter by search
  const filteredAvailableApps = availableApps.filter(app =>
    app.title.toLowerCase().includes(availableSearch.toLowerCase()) ||
    app.description.toLowerCase().includes(availableSearch.toLowerCase())
  );

  const filteredSelectedApps = selectedApps.filter(app =>
    app.title.toLowerCase().includes(selectedSearch.toLowerCase()) ||
    app.description.toLowerCase().includes(selectedSearch.toLowerCase())
  );

  // Render Transfer list
  const renderTransferList = (direction: 'left' | 'right') => {
    const isLeft = direction === 'left';
    const items = isLeft ? filteredAvailableApps : filteredSelectedApps;
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
                    <div style={{ fontSize: 12, color: '#666' }}>{item.key}</div>
                    <div style={{ fontWeight: 500 }}>{item.title}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

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

      {/* Create/Edit Bundle Modal */}
      <Modal
        title={editingItem ? 'Edit Application Bundle' : 'Create Application Bundle'}
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
        width={1000}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            name="bundleName"
            label={
              <span>
                Bundle Name <Text type="danger">*</Text>
              </span>
            }
            rules={[{ required: true, message: 'Please enter bundle name' }]}
          >
            <Input placeholder="Name" />
          </Form.Item>

          <Form.Item
            name="os"
            label={
              <span>
                OS <Text type="danger">*</Text>
              </span>
            }
            rules={[{ required: true, message: 'Please select OS' }]}
            initialValue="Windows"
          >
            <Select
              placeholder="Select OS"
              onChange={() => {
                // Reset selected applications when OS changes
                setSelectedApplications([]);
                setSelectedAvailableKeys([]);
                setSelectedSelectedKeys([]);
              }}
            >
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
                Applications <Text type="danger">*</Text>
              </span>
            }
            rules={[
              {
                validator: () => {
                  if (selectedApplications.length === 0) {
                    return Promise.reject(new Error('Please select at least one application'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Row gutter={16}>
              {/* Available Applications */}
              <Col span={11}>
                {renderTransferList('left')}
              </Col>

              {/* Transfer Buttons */}
              <Col span={2} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                <Button
                  type="primary"
                  icon={<RightOutlined />}
                  onClick={() => {
                    // Move selected items from available to selected
                    setSelectedApplications([...selectedApplications, ...selectedAvailableKeys]);
                    setSelectedAvailableKeys([]);
                  }}
                  disabled={selectedAvailableKeys.length === 0}
                />
                <Button
                  type="primary"
                  icon={<LeftOutlined />}
                  onClick={() => {
                    // Move selected items from selected to available
                    setSelectedApplications(selectedApplications.filter(k => !selectedSelectedKeys.includes(k)));
                    setSelectedSelectedKeys([]);
                  }}
                  disabled={selectedSelectedKeys.length === 0}
                />
              </Col>

              {/* Selected Applications */}
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
