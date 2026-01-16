import { useState } from 'react';
import {
  Input,
  Button,
  Table,
  Space,
  Tag,
  Typography,
  Modal,
  Form,
  Select,
  Checkbox,
  Row,
  Col,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  ExportOutlined,
  WindowsOutlined,
  AppleOutlined,
  LinuxOutlined,
  RightOutlined,
  LeftOutlined,
  CloseOutlined,
} from '@ant-design/icons';

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

type ConfigurationDeployedItem = {
  id: string;
  deploymentId: string;
  name: string;
  stage: 'COMPLETED' | 'IN_PROGRESS' | 'INSTALLED' | 'FAILED';
  pending: { current: number; total: number };
  succeeded: { current: number; total: number };
  failed: { current: number; total: number };
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

type ConfigurationBundleItem = {
  key: string;
  bundleId: string;
  name: string;
  os: string[];
};

// Mock configurations - these would come from the catalog
const mockConfigurations: ConfigurationItem[] = [
  { key: '1', configurationId: 'CNF-023', title: 'Turns off Automated Adobe Acrol', os: ['Windows'], architecture: 'x64' },
  { key: '2', configurationId: 'CNF-022', title: 'Turns off Automated Adobe', os: ['Windows'], architecture: 'x64' },
  { key: '3', configurationId: 'CNF-021', title: 'Turns off Automated Adobe', os: ['Windows'], architecture: 'x64' },
  { key: '4', configurationId: 'CNF-020', title: 'Turns off automated Adobe', os: ['Windows'], architecture: 'x64' },
  { key: '5', configurationId: 'CNF-019', title: 'Turns off Automated Adobe', os: ['Windows'], architecture: 'x64' },
  { key: '6', configurationId: 'CNF-018', title: 'Turns off Automated Adobe', os: ['Windows'], architecture: 'x64' },
  { key: '7', configurationId: 'CNF-017', title: 'Turns Off Automated Adobe Read', os: ['Windows'], architecture: 'x64' },
  { key: '8', configurationId: 'CNF-016', title: 'Turns off automatic updates for Ac', os: ['Windows'], architecture: 'x64' },
  { key: '9', configurationId: 'CNF-015', title: 'Stop Auto Update of Google Chro', os: ['Windows'], architecture: 'x64' },
  { key: '10', configurationId: 'CNF-014', title: 'Stop Automated App Updates', os: ['Windows'], architecture: 'x64' },
  { key: '11', configurationId: 'CNF-013', title: 'Stop Automatic Delivery of IE 10', os: ['Windows'], architecture: 'x64' },
  { key: '12', configurationId: 'CNF-012', title: 'Turn Off Automated upgrade of IE', os: ['Windows'], architecture: 'x64' },
  { key: '13', configurationId: 'CNF-011', title: 'Turn Off automatic updates for Wi', os: ['Windows'], architecture: 'x64' },
  { key: '14', configurationId: 'CNF-010', title: 'Stop Automated Java Updates', os: ['Windows'], architecture: 'x64' },
  { key: '15', configurationId: 'CNF-009', title: 'Turns off Automated Adobe Acrobat X Updater', os: ['Windows'], architecture: 'x64' },
  { key: '16', configurationId: 'CNF-008', title: 'Turns off Automated Adobe Acrobat XI Updater', os: ['Windows'], architecture: 'x64' },
  { key: '17', configurationId: 'CNF-007', title: 'Turns off Automated Adobe Acrobat Reader DC updater', os: ['Windows'], architecture: 'x64' },
  { key: '18', configurationId: 'CNF-006', title: 'Turns off automated Adobe AIR Updater', os: ['Windows'], architecture: 'x64' },
  { key: '19', configurationId: 'CNF-005', title: 'Turns off Automated Adobe Reader 10 updater', os: ['Windows'], architecture: 'x64' },
  { key: '20', configurationId: 'CNF-004', title: 'Turns off Automated Adobe Reader 11 update', os: ['Windows'], architecture: 'x64' },
  { key: '21', configurationId: 'CNF-003', title: 'Disable Windows Update Auto Restart', os: ['Windows'], architecture: 'x64' },
  { key: '22', configurationId: 'CNF-002', title: 'Configure Windows Firewall', os: ['Windows'], architecture: 'x64' },
  { key: '23', configurationId: 'CNF-001', title: 'Enable BitLocker Drive Encryption', os: ['Windows'], architecture: 'x64' },
];

// Mock bundles - these would come from the bundle page
const mockBundles: ConfigurationBundleItem[] = [
  { key: 'b1', bundleId: 'BND-001', name: 'Security Hardening for Windows', os: ['Windows'] },
  { key: 'b2', bundleId: 'BND-002', name: 'Mac Security Bundle', os: ['Mac'] },
  { key: 'b3', bundleId: 'BND-003', name: 'Linux Compliance Bundle', os: ['Linux'] },
];

// Start with empty array to show "No data" state
const mockDeployedItems: ConfigurationDeployedItem[] = [];

export const ConfigurationJobsDeployed = () => {
  const [searchText, setSearchText] = useState('');
  const [deployedItems, setDeployedItems] = useState<ConfigurationDeployedItem[]>(mockDeployedItems);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [selectionType, setSelectionType] = useState<'configuration' | 'bundle'>('configuration');
  const [selectedConfigurations, setSelectedConfigurations] = useState<string[]>([]);
  const [availableSearch, setAvailableSearch] = useState('');
  const [selectedSearch, setSelectedSearch] = useState('');
  const [selectedAvailableKeys, setSelectedAvailableKeys] = useState<string[]>([]);
  const [selectedSelectedKeys, setSelectedSelectedKeys] = useState<string[]>([]);

  const handleCreate = () => {
    setCreateModalVisible(true);
    form.resetFields();
    setSelectedConfigurations([]);
    setSelectedAvailableKeys([]);
    setSelectedSelectedKeys([]);
    setAvailableSearch('');
    setSelectedSearch('');
    setSelectionType('configuration');
  };

  const handleCancel = () => {
    setCreateModalVisible(false);
    form.resetFields();
    setSelectedConfigurations([]);
    setSelectedAvailableKeys([]);
    setSelectedSelectedKeys([]);
    setAvailableSearch('');
    setSelectedSearch('');
  };

  const handleSubmit = async () => {
    try {
      await form.validateFields();
      const values = form.getFieldsValue();
      
      // Create new deployment
      const newDeployment: ConfigurationDeployedItem = {
        id: Date.now().toString(),
        deploymentId: `CFG-ADR-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
        name: values.deploymentName,
        stage: 'IN_PROGRESS',
        pending: { current: selectedConfigurations.length, total: selectedConfigurations.length },
        succeeded: { current: 0, total: selectedConfigurations.length },
        failed: { current: 0, total: selectedConfigurations.length },
        createdBy: 'Current User', // In real app, get from auth context
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

      setDeployedItems([newDeployment, ...deployedItems]);
      setCreateModalVisible(false);
      form.resetFields();
      setSelectedConfigurations([]);
      message.success('Configuration deployment created successfully');
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      // In real implementation, fetch data from API
      message.success('Data refreshed successfully');
    } catch (error) {
      message.error('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    try {
      const dataToExport = filteredItems.length > 0 ? filteredItems : deployedItems;
      
      if (dataToExport.length === 0) {
        message.warning('No data to export');
        return;
      }

      const exportData = dataToExport.map((item) => ({
        ID: item.deploymentId,
        Name: item.name,
        Stage: item.stage,
        Pending: `${item.pending.current}/${item.pending.total}`,
        Succeeded: `${item.succeeded.current}/${item.succeeded.total}`,
        Failed: `${item.failed.current}/${item.failed.total}`,
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
      link.setAttribute('download', `configuration_deployed_jobs_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('Deployed jobs exported successfully');
    } catch (error) {
      message.error('Failed to export data');
      console.error('Export error:', error);
    }
  };

  // Get available and selected items (configurations or bundles)
  const currentItems = selectionType === 'configuration' 
    ? mockConfigurations 
    : mockBundles;
  
  const availableItems = currentItems.filter(item => !selectedConfigurations.includes(item.key));
  const selectedItems = currentItems.filter(item => selectedConfigurations.includes(item.key));

  // Filter by search
  const filteredAvailableItems = availableItems.filter(item => {
    const searchLower = availableSearch.toLowerCase();
    if (selectionType === 'configuration') {
      const config = item as ConfigurationItem;
      return config.title.toLowerCase().includes(searchLower) ||
             config.configurationId.toLowerCase().includes(searchLower);
    } else {
      const bundle = item as ConfigurationBundleItem;
      return bundle.name.toLowerCase().includes(searchLower) ||
             bundle.bundleId.toLowerCase().includes(searchLower);
    }
  });

  const filteredSelectedItems = selectedItems.filter(item => {
    const searchLower = selectedSearch.toLowerCase();
    if (selectionType === 'configuration') {
      const config = item as ConfigurationItem;
      return config.title.toLowerCase().includes(searchLower) ||
             config.configurationId.toLowerCase().includes(searchLower);
    } else {
      const bundle = item as ConfigurationBundleItem;
      return bundle.name.toLowerCase().includes(searchLower) ||
             bundle.bundleId.toLowerCase().includes(searchLower);
    }
  });

  // Render Transfer list
  const renderTransferList = (direction: 'left' | 'right') => {
    const isLeft = direction === 'left';
    const items = isLeft ? filteredAvailableItems : filteredSelectedItems;
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

              if (selectionType === 'configuration') {
                const config = item as ConfigurationItem;
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
                        {config.configurationId}: {config.title}
                      </div>
                      <div style={{ fontSize: 11, color: '#999' }}>({config.architecture})</div>
                    </div>
                  </div>
                );
              } else {
                const bundle = item as ConfigurationBundleItem;
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
                        {bundle.bundleId}: {bundle.name}
                      </div>
                    </div>
                  </div>
                );
              }
            })
          )}
        </div>
      </div>
    );
  };

  const renderStatusCell = (
    current: number,
    total: number,
    backgroundColor: string
  ) => {
    return (
      <div
        style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: 4,
          backgroundColor,
          textAlign: 'center',
          minWidth: 50,
        }}
      >
        {current}/{total}
      </div>
    );
  };

  const columns: ColumnsType<ConfigurationDeployedItem> = [
    {
      title: 'ID',
      dataIndex: 'deploymentId',
      key: 'deploymentId',
      sorter: (a, b) => a.deploymentId.localeCompare(b.deploymentId),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Stage',
      dataIndex: 'stage',
      key: 'stage',
      sorter: (a, b) => a.stage.localeCompare(b.stage),
      render: (stage: string) => {
        const colors: Record<string, string> = {
          COMPLETED: 'green',
          IN_PROGRESS: 'orange',
          INSTALLED: 'blue',
          FAILED: 'red',
        };
        return <Tag color={colors[stage] || 'default'}>{stage}</Tag>;
      },
      filters: [
        { text: 'COMPLETED', value: 'COMPLETED' },
        { text: 'IN_PROGRESS', value: 'IN_PROGRESS' },
        { text: 'INSTALLED', value: 'INSTALLED' },
        { text: 'FAILED', value: 'FAILED' },
      ],
      onFilter: (value, record) => record.stage === value,
    },
    {
      title: 'Pending',
      dataIndex: 'pending',
      key: 'pending',
      align: 'center',
      sorter: (a, b) => a.pending.current - b.pending.current,
      render: (pending: { current: number; total: number }) =>
        renderStatusCell(pending.current, pending.total, '#fff7e6'),
    },
    {
      title: 'Succeeded',
      dataIndex: 'succeeded',
      key: 'succeeded',
      align: 'center',
      sorter: (a, b) => a.succeeded.current - b.succeeded.current,
      render: (succeeded: { current: number; total: number }) =>
        renderStatusCell(succeeded.current, succeeded.total, '#f6ffed'),
    },
    {
      title: 'Failed',
      dataIndex: 'failed',
      key: 'failed',
      align: 'center',
      sorter: (a, b) => a.failed.current - b.failed.current,
      render: (failed: { current: number; total: number }) =>
        renderStatusCell(failed.current, failed.total, '#fff1f0'),
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
  ];

  const filteredItems = deployedItems.filter(
    item =>
      item.name.toLowerCase().includes(searchText.toLowerCase()) ||
      item.deploymentId.toLowerCase().includes(searchText.toLowerCase()) ||
      item.createdBy.toLowerCase().includes(searchText.toLowerCase())
  );

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
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} htmlType="button">
            Create
          </Button>
        </Space>
      </div>

      {/* Table */}
      <Table
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
        locale={{
          emptyText: (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>📁</div>
              <Text type="secondary">No data</Text>
            </div>
          ),
        }}
      />

      {/* Create Configuration Deployment Modal */}
      <Modal
        title={
          <Space>
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={handleCancel}
              style={{ marginLeft: -16, marginRight: -8 }}
            />
            <Text strong style={{ fontSize: 16 }}>
              Create Configuration Deployment
            </Text>
          </Space>
        }
        open={createModalVisible}
        onCancel={handleCancel}
        width={900}
        footer={[
          <Button key="reset" onClick={() => form.resetFields()}>
            Reset
          </Button>,
          <Button key="draft" onClick={handleCancel}>
            Save As Draft
          </Button>,
          <Button key="publish" type="primary" onClick={handleSubmit}>
            Publish
          </Button>,
        ]}
        closable={false}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="deploymentName"
            label={
              <span>
                Deployment Name <Text type="danger">*</Text>
              </span>
            }
            rules={[{ required: true, message: 'Please enter deployment name' }]}
          >
            <Input placeholder="Name" />
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

          <Form.Item label="Selection Type">
            <Space>
              <Button
                type={selectionType === 'configuration' ? 'primary' : 'default'}
                onClick={() => setSelectionType('configuration')}
              >
                Configuration
              </Button>
              <Button
                type={selectionType === 'bundle' ? 'primary' : 'default'}
                onClick={() => setSelectionType('bundle')}
              >
                Configuration Bundle
              </Button>
            </Space>
          </Form.Item>

          <Form.Item
            name="scope"
            label={
              <span>
                Scope <Text type="danger">*</Text>
              </span>
            }
            rules={[{ required: true, message: 'Please select scope' }]}
          >
            <Select placeholder="Select One" style={{ width: '100%' }}>
              <Option value="all">All</Option>
              <Option value="windows">Windows</Option>
              <Option value="mac">Mac</Option>
              <Option value="linux">Linux</Option>
            </Select>
          </Form.Item>

          <Form.Item name="endpoints" label="Endpoints">
            <Select placeholder="Please Select" style={{ width: '100%' }}>
              <Option value="endpoint1">Endpoint 1</Option>
              <Option value="endpoint2">Endpoint 2</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label={
              <span>
                Select Configurations <Text type="danger">*</Text>
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
            name="deploymentPolicy"
            label={
              <span>
                Deployment Policy <Text type="danger">*</Text>
              </span>
            }
            rules={[{ required: true, message: 'Please select deployment policy' }]}
          >
            <Select placeholder="Please Select" style={{ width: '100%' }}>
              <Option value="policy1">Policy 1</Option>
              <Option value="policy2">Policy 2</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="retryCount"
            label={
              <span>
                Retry Count <Text type="danger">*</Text>
              </span>
            }
            initialValue={1}
            rules={[{ required: true, message: 'Please enter retry count' }]}
          >
            <Input type="number" min={0} />
          </Form.Item>

          <Form.Item
            name="notifyTo"
            label={
              <span>
                Notify to <Text type="danger">*</Text>
              </span>
            }
            rules={[{ required: true, message: 'Please select notify to' }]}
          >
            <Select placeholder="Please Select" style={{ width: '100%' }}>
              <Option value="admin">Admin</Option>
              <Option value="user">User</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
