import { useState, useEffect } from 'react';
import {
  App,
  Table,
  Input,
  Button,
  Typography,
  Modal,
  Form,
  Space,
  Tooltip,
  Checkbox,
  InputNumber,
  Select,
  Row,
  Col,
  Switch,
} from 'antd';
import {
  SearchOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  DownloadOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { settingsService } from '../../services/settings.service';
import type { LDAPServerConfig } from '../../types/settings.types';

const { Title } = Typography;
const { TextArea } = Input;

interface FilterState {
  showId: boolean;
  showName: boolean;
  showHost: boolean;
  showFQDN: boolean;
  showCreatedOn: boolean;
}

export const LDAPServerConfiguration = () => {
  const { message } = App.useApp();
  const [ldapConfigs, setLdapConfigs] = useState<LDAPServerConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [isViewModalEditing, setIsViewModalEditing] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<LDAPServerConfig | null>(null);
  const [viewingConfig, setViewingConfig] = useState<LDAPServerConfig | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    showId: true,
    showName: true,
    showHost: true,
    showFQDN: true,
    showCreatedOn: true,
  });
  const [form] = Form.useForm();
  const [viewForm] = Form.useForm();
  const [filterForm] = Form.useForm();
  const [testLoading, setTestLoading] = useState(false);
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    pageSize: 20,
    current: 1,
  });

  useEffect(() => {
    fetchLdapConfigs();
  }, []);

  const fetchLdapConfigs = async () => {
    setLoading(true);
    try {
      const data = await settingsService.getLDAPServerConfigs();
      setLdapConfigs(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error('Failed to fetch LDAP server configurations');
      setLdapConfigs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingConfig(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (config: LDAPServerConfig) => {
    setEditingConfig(config);
    form.setFieldsValue({
      name: config.name,
      host: config.host,
      port: config.port,
      fqdn: config.fqdn,
      baseDN: config.baseDN,
      username: config.username,
      password: config.password,
      groupBase: config.groupBase,
      protocol: config.protocol || 'LDAP',
      timeout: config.timeout,
      description: config.description,
      enabled: config.enabled ?? true,
      enableAutoSync: config.enableAutoSync ?? false,
      autoSyncInterval: config.autoSyncInterval,
    });
    setModalVisible(true);
  };

  const handleViewConfig = (config: LDAPServerConfig) => {
    setViewingConfig(config);
    setIsViewModalEditing(false);
    viewForm.setFieldsValue({
      name: config.name,
      host: config.host,
      port: config.port,
      fqdn: config.fqdn,
      baseDN: config.baseDN,
      username: config.username,
      password: config.password,
      groupBase: config.groupBase,
      protocol: config.protocol || 'LDAP',
      timeout: config.timeout,
      description: config.description,
      enabled: config.enabled ?? true,
      enableAutoSync: config.enableAutoSync ?? false,
      autoSyncInterval: config.autoSyncInterval,
    });
    setViewModalVisible(true);
  };

  const handleViewModalEdit = () => {
    setIsViewModalEditing(true);
  };

  const handleViewModalSave = async () => {
    try {
      const values = await viewForm.validateFields();

      if (viewingConfig) {
        await settingsService.updateLDAPServerConfig(viewingConfig.id, values);
        message.success('LDAP server configuration updated successfully');
        setViewModalVisible(false);
        setIsViewModalEditing(false);
        viewForm.resetFields();
        fetchLdapConfigs();
      }
    } catch (error) {
      message.error('Failed to update LDAP server configuration');
    }
  };

  const handleViewModalCancel = () => {
    setIsViewModalEditing(false);
    viewForm.setFieldsValue({
      name: viewingConfig?.name,
      host: viewingConfig?.host,
      port: viewingConfig?.port,
      fqdn: viewingConfig?.fqdn,
      baseDN: viewingConfig?.baseDN,
      username: viewingConfig?.username,
      password: viewingConfig?.password,
      groupBase: viewingConfig?.groupBase,
      protocol: viewingConfig?.protocol || 'LDAP',
      timeout: viewingConfig?.timeout,
      description: viewingConfig?.description,
      enabled: viewingConfig?.enabled ?? true,
      enableAutoSync: viewingConfig?.enableAutoSync ?? false,
      autoSyncInterval: viewingConfig?.autoSyncInterval,
    });
  };

  const handleDelete = (config: LDAPServerConfig) => {
    Modal.confirm({
      title: 'Delete LDAP Server Configuration',
      content: `Are you sure you want to delete "${config.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await settingsService.deleteLDAPServerConfig(config.id);
          message.success('LDAP server configuration deleted successfully');
          fetchLdapConfigs();
        } catch (error) {
          message.error('Failed to delete LDAP server configuration');
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingConfig) {
        await settingsService.updateLDAPServerConfig(editingConfig.id, values);
        message.success('LDAP server configuration updated successfully');
      } else {
        await settingsService.createLDAPServerConfig(values);
        message.success('LDAP server configuration created successfully');
      }

      setModalVisible(false);
      form.resetFields();
      fetchLdapConfigs();
    } catch (error) {
      message.error(`Failed to ${editingConfig ? 'update' : 'create'} LDAP server configuration`);
    }
  };

  const handleTestConnection = async () => {
    if (!editingConfig) {
      message.warning('Please save the configuration first, then test the connection.');
      return;
    }

    setTestLoading(true);
    try {
      await settingsService.testLDAPServerConfig(editingConfig.id);
      message.success('LDAP connection test successful!');
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'LDAP connection test failed';
      message.error(errorMessage);
    } finally {
      setTestLoading(false);
    }
  };

  const handleOpenFilterModal = () => {
    filterForm.setFieldsValue({
      showId: filters.showId,
      showName: filters.showName,
      showHost: filters.showHost,
      showFQDN: filters.showFQDN,
      showCreatedOn: filters.showCreatedOn,
    });
    setFilterModalVisible(true);
  };

  const handleApplyFilters = () => {
    const values = filterForm.getFieldsValue();
    setFilters({
      showId: values.showId !== undefined ? values.showId : true,
      showName: values.showName !== undefined ? values.showName : true,
      showHost: values.showHost !== undefined ? values.showHost : true,
      showFQDN: values.showFQDN !== undefined ? values.showFQDN : true,
      showCreatedOn: values.showCreatedOn !== undefined ? values.showCreatedOn : true,
    });
    setPagination({ ...pagination, current: 1 });
    setFilterModalVisible(false);
    message.success('Columns updated');
  };

  const handleResetFilters = () => {
    filterForm.resetFields();
    setFilters({
      showId: true,
      showName: true,
      showHost: true,
      showFQDN: true,
      showCreatedOn: true,
    });
    setPagination({ ...pagination, current: 1 });
    message.success('All columns shown');
  };

  const hasHiddenColumns = !filters.showId || !filters.showName || !filters.showHost || !filters.showFQDN || !filters.showCreatedOn;

  const handleExport = () => {
    const csvContent = [
      ['ID', 'Name', 'Host', 'FQDN', 'Created On'],
      ...filteredConfigs.map((config) => [
        config.id,
        config.name,
        config.host,
        config.fqdn,
        config.createdAt || '',
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ldap-server-configurations.csv';
    link.click();
    window.URL.revokeObjectURL(url);
    message.success('LDAP server configurations exported successfully');
  };

  const allColumns: ColumnsType<LDAPServerConfig> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      sorter: (a, b) => {
        const aNum = parseInt(a.id) || 0;
        const bNum = parseInt(b.id) || 0;
        return aNum - bNum;
      },
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text: string, record: LDAPServerConfig) => (
        <a href="#" onClick={(e) => {
          e.preventDefault();
          handleViewConfig(record);
        }}>
          {text}
        </a>
      ),
    },
    {
      title: 'Host',
      dataIndex: 'host',
      key: 'host',
    },
    {
      title: 'FQDN',
      dataIndex: 'fqdn',
      key: 'fqdn',
    },
    {
      title: 'Created On',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => {
        if (!text) return '—';
        const date = new Date(text);
        return date.toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      align: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const columns = allColumns.filter((col) => {
    if (col.key === 'id') return filters.showId;
    if (col.key === 'name') return filters.showName;
    if (col.key === 'host') return filters.showHost;
    if (col.key === 'fqdn') return filters.showFQDN;
    if (col.key === 'createdAt') return filters.showCreatedOn;
    return true; // Always show actions column
  });

  const filteredConfigs = ldapConfigs.filter((config) => {
    if (!searchText) return true;

    const searchLower = searchText.toLowerCase();
    return (
      config.id.toLowerCase().includes(searchLower) ||
      config.name.toLowerCase().includes(searchLower) ||
      config.host.toLowerCase().includes(searchLower) ||
      config.fqdn.toLowerCase().includes(searchLower) ||
      (config.description && config.description.toLowerCase().includes(searchLower))
    );
  });

  const paginatedData = filteredConfigs.slice(
    (pagination.current! - 1) * pagination.pageSize!,
    pagination.current! * pagination.pageSize!
  );

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <Title level={2}>LDAP Server Configurations</Title>
      </div>

      {/* Search and Action Controls */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Input
          placeholder="Search by name, host, or FQDN"
          prefix={<SearchOutlined />}
          style={{ flex: 1, maxWidth: '400px' }}
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value);
            setPagination({ ...pagination, current: 1 });
          }}
        />

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <Tooltip title="Refresh">
            <Button
              icon={<ReloadOutlined />}
              onClick={() => fetchLdapConfigs()}
              loading={loading}
            />
          </Tooltip>

          <Tooltip title="Export">
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
              disabled={ldapConfigs.length === 0}
            />
          </Tooltip>

          <Tooltip title={hasHiddenColumns ? `${Object.values(filters).filter(v => v).length} filter(s) active` : 'Filter'}>
            <Button
              icon={<FilterOutlined />}
              onClick={handleOpenFilterModal}
              type={hasHiddenColumns ? 'primary' : 'default'}
            />
          </Tooltip>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            Create
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <Table
        columns={columns}
        dataSource={paginatedData}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: pagination.pageSize,
          current: pagination.current,
          total: filteredConfigs.length,
          onChange: (page, pageSize) => {
            setPagination({ current: page, pageSize });
          },
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) =>
            `showing ${range[0]}–${range[1]} of ${total} items`,
        }}
        style={{ marginBottom: '24px' }}
      />

      {/* Create/Edit Modal */}
      <Modal
        title={editingConfig ? 'Edit LDAP Server' : 'Create LDAP Server'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={[
          <Button
            key="reset"
            onClick={() => {
              form.resetFields();
            }}
          >
            Reset
          </Button>,
          <Button
            key="test"
            onClick={handleTestConnection}
            loading={testLoading}
            disabled={!editingConfig}
            title={!editingConfig ? 'Save the configuration first to test' : 'Test LDAP connection'}
          >
            Test
          </Button>,
          <Button key="submit" type="primary" onClick={handleSubmit}>
            {editingConfig ? 'Update' : 'Create'}
          </Button>,
        ]}
        width={900}
      >
        <Form form={form} layout="vertical" style={{ marginTop: '24px' }}>
          {/* Row 1: Name and Host */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Name"
                name="name"
                rules={[{ required: true, message: 'Please enter configuration name' }]}
              >
                <Input placeholder="Name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Host"
                name="host"
                rules={[{ required: true, message: 'Please enter LDAP server host' }]}
              >
                <Input placeholder="Host" />
              </Form.Item>
            </Col>
          </Row>

          {/* Row 2: Port and FQDN */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Port"
                name="port"
                rules={[{ required: true, message: 'Please enter port' }]}
              >
                <InputNumber min={1} max={65535} placeholder="Port" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="FQDN"
                name="fqdn"
                rules={[{ required: true, message: 'Please enter FQDN' }]}
              >
                <Input placeholder="FQDN" />
              </Form.Item>
            </Col>
          </Row>

          {/* Row 3: Username and Password */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Username"
                name="username"
                rules={[{ required: true, message: 'Please enter username' }]}
              >
                <Input placeholder="Username" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Password"
                name="password"
                rules={[{ required: true, message: 'Please enter password' }]}
              >
                <Input.Password placeholder="Password" />
              </Form.Item>
            </Col>
          </Row>

          {/* Row 4: Base DN and Group Base */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Base DN"
                name="baseDN"
                rules={[{ required: true, message: 'Please enter base DN' }]}
              >
                <Input placeholder="Base DN" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Group Base"
                name="groupBase"
              >
                <Input placeholder="Group Base" />
              </Form.Item>
            </Col>
          </Row>

          {/* Row 5: Enable Auto Sync and Auto Sync Interval */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Enable Auto Sync"
                name="enableAutoSync"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Auto Sync Interval"
                name="autoSyncInterval"
              >
                <Select placeholder="Select Interval">
                  <Select.Option value="hourly">Hourly</Select.Option>
                  <Select.Option value="daily">Daily</Select.Option>
                  <Select.Option value="weekly">Weekly</Select.Option>
                  <Select.Option value="monthly">Monthly</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Row 6: Protocol and Timeout */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Protocol"
                name="protocol"
              >
                <Select placeholder="Select protocol">
                  <Select.Option value="LDAP">LDAP</Select.Option>
                  <Select.Option value="LDAPS">LDAPS</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Timeout (seconds)"
                name="timeout"
              >
                <InputNumber min={1} placeholder="e.g., 30" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          {/* Row 7: Description */}
          <Form.Item
            label="Description"
            name="description"
          >
            <TextArea rows={3} placeholder="Enter description (optional)" />
          </Form.Item>

          {/* Row 8: Enabled */}
          <Form.Item
            label="Enabled"
            name="enabled"
            valuePropName="checked"
          >
            <Checkbox>Enable this configuration</Checkbox>
          </Form.Item>
        </Form>
      </Modal>

      {/* Filter Modal */}
      <Modal
        title="Show/Hide Columns"
        open={filterModalVisible}
        onCancel={() => {
          setFilterModalVisible(false);
        }}
        footer={[
          <Button
            key="reset"
            onClick={handleResetFilters}
          >
            Show All
          </Button>,
          <Button
            key="cancel"
            onClick={() => {
              setFilterModalVisible(false);
            }}
          >
            Cancel
          </Button>,
          <Button
            key="apply"
            type="primary"
            onClick={handleApplyFilters}
          >
            Apply
          </Button>,
        ]}
        width={400}
      >
        <Form form={filterForm} layout="vertical" style={{ marginTop: '24px' }}>
          <Form.Item name="showId" valuePropName="checked" style={{ marginBottom: '16px' }}>
            <Checkbox>Show ID</Checkbox>
          </Form.Item>

          <Form.Item name="showName" valuePropName="checked" style={{ marginBottom: '16px' }}>
            <Checkbox>Show Name</Checkbox>
          </Form.Item>

          <Form.Item name="showHost" valuePropName="checked" style={{ marginBottom: '16px' }}>
            <Checkbox>Show Host</Checkbox>
          </Form.Item>

          <Form.Item name="showFQDN" valuePropName="checked" style={{ marginBottom: '16px' }}>
            <Checkbox>Show FQDN</Checkbox>
          </Form.Item>

          <Form.Item name="showCreatedOn" valuePropName="checked" style={{ marginBottom: '16px' }}>
            <Checkbox>Show Created On</Checkbox>
          </Form.Item>
        </Form>
      </Modal>

      {/* View Configuration Modal */}
      <Modal
        title="LDAP Server Configuration Details"
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false);
          setViewingConfig(null);
          setIsViewModalEditing(false);
          viewForm.resetFields();
        }}
        footer={[
          <Button
            key="close-or-cancel"
            onClick={() => {
              if (isViewModalEditing) {
                handleViewModalCancel();
              } else {
                setViewModalVisible(false);
                setViewingConfig(null);
                viewForm.resetFields();
              }
            }}
          >
            {isViewModalEditing ? 'Cancel' : 'Close'}
          </Button>,
          !isViewModalEditing && (
            <Button
              key="edit"
              type="primary"
              onClick={handleViewModalEdit}
            >
              Edit
            </Button>
          ),
          isViewModalEditing && (
            <Button
              key="save"
              type="primary"
              onClick={handleViewModalSave}
            >
              Save
            </Button>
          ),
        ]}
        width={900}
      >
        {viewingConfig && (
          <Form form={viewForm} layout="vertical" style={{ marginTop: '24px' }}>
            {/* Row 1: Name and Host */}
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Name"
                  name="name"
                  rules={[{ required: true, message: 'Please enter configuration name' }]}
                >
                  <Input
                    placeholder="Name"
                    disabled={!isViewModalEditing}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Host"
                  name="host"
                  rules={[{ required: true, message: 'Please enter LDAP server host' }]}
                >
                  <Input
                    placeholder="Host"
                    disabled={!isViewModalEditing}
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* Row 2: Port and FQDN */}
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Port"
                  name="port"
                  rules={[{ required: true, message: 'Please enter port' }]}
                >
                  <InputNumber
                    min={1}
                    max={65535}
                    placeholder="Port"
                    disabled={!isViewModalEditing}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="FQDN"
                  name="fqdn"
                  rules={[{ required: true, message: 'Please enter FQDN' }]}
                >
                  <Input
                    placeholder="FQDN"
                    disabled={!isViewModalEditing}
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* Row 3: Username and Password */}
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Username"
                  name="username"
                  rules={[{ required: true, message: 'Please enter username' }]}
                >
                  <Input
                    placeholder="Username"
                    disabled={!isViewModalEditing}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Password"
                  name="password"
                  rules={[{ required: true, message: 'Please enter password' }]}
                >
                  <Input.Password
                    placeholder="Password"
                    disabled={!isViewModalEditing}
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* Row 4: Base DN and Group Base */}
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Base DN"
                  name="baseDN"
                  rules={[{ required: true, message: 'Please enter base DN' }]}
                >
                  <Input
                    placeholder="Base DN"
                    disabled={!isViewModalEditing}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Group Base"
                  name="groupBase"
                >
                  <Input
                    placeholder="Group Base"
                    disabled={!isViewModalEditing}
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* Row 5: Enable Auto Sync and Auto Sync Interval */}
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Enable Auto Sync"
                  name="enableAutoSync"
                  valuePropName="checked"
                >
                  <Switch disabled={!isViewModalEditing} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Auto Sync Interval"
                  name="autoSyncInterval"
                >
                  <Select placeholder="Select Interval" disabled={!isViewModalEditing}>
                    <Select.Option value="hourly">Hourly</Select.Option>
                    <Select.Option value="daily">Daily</Select.Option>
                    <Select.Option value="weekly">Weekly</Select.Option>
                    <Select.Option value="monthly">Monthly</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {/* Row 6: Protocol and Timeout */}
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Protocol"
                  name="protocol"
                >
                  <Select placeholder="Select protocol" disabled={!isViewModalEditing}>
                    <Select.Option value="LDAP">LDAP</Select.Option>
                    <Select.Option value="LDAPS">LDAPS</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Timeout (seconds)"
                  name="timeout"
                >
                  <InputNumber
                    min={1}
                    placeholder="e.g., 30"
                    disabled={!isViewModalEditing}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* Row 7: Description */}
            <Form.Item
              label="Description"
              name="description"
            >
              <TextArea
                placeholder="Enter description (optional)"
                disabled={!isViewModalEditing}
                rows={3}
              />
            </Form.Item>

            {/* Row 8: Enabled */}
            <Form.Item
              label="Enabled"
              name="enabled"
              valuePropName="checked"
            >
              <Checkbox disabled={!isViewModalEditing}>Enable this configuration</Checkbox>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
};
