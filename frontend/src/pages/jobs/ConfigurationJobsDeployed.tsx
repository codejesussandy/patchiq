import { useState, useEffect } from 'react';
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
import { jobsService } from '../../services/jobs.service';

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

export const ConfigurationJobsDeployed = () => {
  const [searchText, setSearchText] = useState('');
  const [deployedItems, setDeployedItems] = useState<ConfigurationDeployedItem[]>([]);
  const [configurations, setConfigurations] = useState<ConfigurationItem[]>([]);
  const [bundles, setBundles] = useState<ConfigurationBundleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [selectionType, setSelectionType] = useState<'configuration' | 'bundle'>('configuration');
  const [selectedConfigurations, setSelectedConfigurations] = useState<string[]>([]);
  const [availableSearch, setAvailableSearch] = useState('');
  const [selectedSearch, setSelectedSearch] = useState('');
  const [selectedAvailableKeys, setSelectedAvailableKeys] = useState<string[]>([]);
  const [selectedSelectedKeys, setSelectedSelectedKeys] = useState<string[]>([]);

  const fetchDeployments = async () => {
    setLoading(true);
    try {
      const data = await jobsService.getConfigDeployments();
      const mapped: ConfigurationDeployedItem[] = data.map((d: any) => ({
        id: d.id,
        deploymentId: d.deploymentId || d.id,
        name: d.name,
        stage: d.status || 'IN_PROGRESS',
        pending: { current: d.pending || 0, total: d.pending + d.succeeded + d.failed || 0 },
        succeeded: { current: d.succeeded || 0, total: d.pending + d.succeeded + d.failed || 0 },
        failed: { current: d.failed || 0, total: d.pending + d.succeeded + d.failed || 0 },
        createdBy: d.createdBy || 'System',
        createdOn: d.createdOn || d.createdAt || '',
      }));
      setDeployedItems(mapped);
    } catch (error) {
      console.error('Failed to fetch deployments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConfigurationsAndBundles = async () => {
    try {
      const [configData, bundleData] = await Promise.all([
        jobsService.getConfigCatalog(),
        jobsService.getConfigBundles(),
      ]);

      const mappedConfigs: ConfigurationItem[] = configData.map((c: any) => ({
        key: c.id,
        configurationId: c.configurationId || c.id,
        title: c.name,
        os: [c.os || 'Windows'],
        architecture: c.architecture || 'x64',
      }));
      setConfigurations(mappedConfigs);

      const mappedBundles: ConfigurationBundleItem[] = bundleData.map((b: any) => ({
        key: b.id,
        bundleId: b.bundleId || b.id,
        name: b.bundleName || b.name,
        os: [b.os || 'Windows'],
      }));
      setBundles(mappedBundles);
    } catch (error) {
      console.error('Failed to fetch configurations/bundles:', error);
    }
  };

  useEffect(() => {
    fetchDeployments();
    fetchConfigurationsAndBundles();
  }, []);

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

      const apiData = {
        name: values.deploymentName,
        description: values.description || '',
        configurationIds: selectionType === 'configuration' ? selectedConfigurations : undefined,
        bundleIds: selectionType === 'bundle' ? selectedConfigurations : undefined,
        targetAgentIds: values.targetAgentIds || [],
      };

      await jobsService.createConfigDeployment(apiData);
      setCreateModalVisible(false);
      form.resetFields();
      setSelectedConfigurations([]);
      message.success('Configuration deployment created successfully');
      fetchDeployments();
    } catch (error) {
      console.error('Submission failed:', error);
      message.error('Failed to create deployment');
    }
  };

  const handleRefresh = async () => {
    await fetchDeployments();
    await fetchConfigurationsAndBundles();
    message.success('Data refreshed successfully');
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
    ? configurations
    : bundles;
  
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
