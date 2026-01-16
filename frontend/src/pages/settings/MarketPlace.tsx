import { useState, useEffect } from 'react';
import {
  Table,
  Input,
  Button,
  Typography,
  Modal,
  Form,
  message,
  Space,
  Tooltip,
  Switch,
  Row,
  Col,
  Select,
  Divider,
} from 'antd';
import {
  SearchOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { settingsService } from '../../services/settings.service';
import type { Integration } from '../../types/settings.types';

const { Title } = Typography;

interface IntegrationWithKey extends Integration {
  key: string;
}

export const MarketPlace = () => {
  const [integrations, setIntegrations] = useState<IntegrationWithKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'view' | 'edit' | 'create'>('view');
  const [editingIntegration, setEditingIntegration] = useState<IntegrationWithKey | null>(null);
  const [drawerForm] = Form.useForm();
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    pageSize: 20,
    current: 1,
  });

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    setLoading(true);
    try {
      const data = await settingsService.getIntegrations();
      const formattedData = Array.isArray(data)
        ? data.map((integration: Integration, index: number) => ({
            ...integration,
            key: integration.id || String(index),
          }))
        : [];
      setIntegrations(formattedData);
    } catch (error) {
      console.error('Error fetching integrations:', error);
      message.error('Failed to fetch integrations');
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIntegration = () => {
    setEditingIntegration(null);
    setDrawerMode('create');
    drawerForm.resetFields();
    setDrawerVisible(true);
  };

  const handleEditIntegration = (integration: IntegrationWithKey) => {
    setEditingIntegration(integration);
    setDrawerMode('edit');
    drawerForm.setFieldsValue({
      name: integration.name,
      description: integration.description,
      type: integration.type,
      enabled: integration.status,
      recipients: integration.recipients || [],
    });
    setDrawerVisible(true);
  };

  const handleViewIntegration = (integration: IntegrationWithKey) => {
    setEditingIntegration(integration);
    setDrawerMode('view');
    drawerForm.setFieldsValue({
      name: integration.name,
      description: integration.description,
      type: integration.type,
      enabled: integration.status,
      recipients: integration.recipients || [],
    });
    setDrawerVisible(true);
  };

  const handleDrawerClose = () => {
    setDrawerVisible(false);
    setEditingIntegration(null);
    drawerForm.resetFields();
  };

  const handleDelete = (integration: IntegrationWithKey) => {
    Modal.confirm({
      title: 'Delete Integration',
      content: `Are you sure you want to delete "${integration.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await settingsService.deleteIntegration(integration.id);
          message.success('Integration deleted successfully');
          fetchIntegrations();
        } catch (error) {
          message.error('Failed to delete integration');
        }
      },
    });
  };

  const handleDrawerSubmit = async () => {
    try {
      const values = await drawerForm.validateFields();

      if (editingIntegration && drawerMode === 'edit') {
        await settingsService.updateIntegration(editingIntegration.id, values);
        message.success('Integration updated successfully');
      } else if (drawerMode === 'create') {
        await settingsService.createIntegration(values);
        message.success('Integration created successfully');
      }

      handleDrawerClose();
      fetchIntegrations();
    } catch (error) {
      message.error(`Failed to ${editingIntegration && drawerMode === 'edit' ? 'update' : 'create'} integration`);
    }
  };

  const handleStatusChange = async (integration: IntegrationWithKey, status: boolean) => {
    try {
      await settingsService.toggleIntegrationStatus(integration.id, status);
      message.success(`Integration ${status ? 'enabled' : 'disabled'} successfully`);
      fetchIntegrations();
    } catch (error) {
      message.error('Failed to update integration status');
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Integration Name', 'Description', 'Integration Type', 'Status', 'Created By', 'Created On'],
      ...filteredIntegrations.map((integration) => [
        integration.name,
        integration.description,
        integration.type,
        integration.status ? 'Enabled' : 'Disabled',
        integration.createdBy,
        integration.createdAt || '',
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'integrations.csv';
    link.click();
    window.URL.revokeObjectURL(url);
    message.success('Integrations exported successfully');
  };

  const columns: ColumnsType<IntegrationWithKey> = [
    {
      title: 'Integration Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (_, record: IntegrationWithKey) => (
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            handleViewIntegration(record);
          }}
          style={{ color: '#1890ff' }}
        >
          {record.name}
        </a>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Integration Type',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: 'Status',
      key: 'status',
      width: 80,
      render: (_, record) => (
        <Switch
          checked={record.status}
          onChange={(checked) => handleStatusChange(record, checked)}
        />
      ),
    },
    {
      title: 'Created By',
      dataIndex: 'createdBy',
      key: 'createdBy',
    },
    {
      title: 'Created On',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => {
        if (!text) return '—';
        const date = new Date(text);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}/${month}/${day}`;
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
              onClick={() => handleEditIntegration(record)}
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

  const filteredIntegrations = integrations.filter((integration) => {
    if (!searchText) return true;

    const searchLower = searchText.toLowerCase();
    return (
      integration.name.toLowerCase().includes(searchLower) ||
      integration.description.toLowerCase().includes(searchLower) ||
      integration.type.toLowerCase().includes(searchLower)
    );
  });

  const paginatedData = filteredIntegrations.slice(
    (pagination.current! - 1) * pagination.pageSize!,
    pagination.current! * pagination.pageSize!
  );

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <Title level={2}>Market Place</Title>
      </div>

      {/* Search and Action Controls */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Input
          placeholder="Search..."
          prefix={<SearchOutlined />}
          style={{ flex: 1, maxWidth: '400px' }}
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value);
            setPagination({ ...pagination, current: 1 });
          }}
        />

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <Tooltip title="Defaults">
            <Button onClick={() => message.info('Restore defaults')}>Defaults</Button>
          </Tooltip>

          <Tooltip title="Export">
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
              disabled={integrations.length === 0}
            >
              Export
            </Button>
          </Tooltip>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateIntegration}
          >
            Create
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <Table
        columns={columns}
        dataSource={paginatedData}
        rowKey="key"
        loading={loading}
        pagination={{
          pageSize: pagination.pageSize,
          current: pagination.current,
          total: filteredIntegrations.length,
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

      {/* Integration Modal */}
      <Modal
        title={drawerMode === 'create' ? 'Create Integration' : drawerMode === 'edit' ? 'Edit Integration' : 'View Integration'}
        open={drawerVisible}
        onCancel={handleDrawerClose}
        width={700}
        footer={
          drawerMode !== 'view' ? [
            <Button key="cancel" onClick={handleDrawerClose}>
              Cancel
            </Button>,
            <Button
              key="submit"
              type="primary"
              onClick={handleDrawerSubmit}
            >
              {drawerMode === 'create' ? 'Create' : 'Update'} Integration
            </Button>,
          ] : [
            <Button key="close" onClick={handleDrawerClose}>
              Close
            </Button>,
            <Button
              key="edit"
              type="primary"
              onClick={() => {
                setDrawerMode('edit');
              }}
            >
              Edit
            </Button>,
          ]
        }
      >
        <Form
          form={drawerForm}
          layout="vertical"
          autoComplete="off"
        >
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="Integration Name"
                name="name"
                rules={[{ required: true, message: 'Please enter integration name' }]}
              >
                <Input
                  placeholder="Enter integration name"
                  disabled={drawerMode === 'view'}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="Description"
                name="description"
                rules={[{ required: true, message: 'Please enter description' }]}
              >
                <Input.TextArea
                  placeholder="Enter description"
                  disabled={drawerMode === 'view'}
                  rows={3}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Integration Type"
                name="type"
                rules={[{ required: true, message: 'Please select integration type' }]}
              >
                <Input
                  placeholder="Enter type"
                  disabled={drawerMode === 'view'}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ marginBottom: '8px', fontWeight: 500 }}>Status</div>
                <Form.Item
                  name="enabled"
                  valuePropName="checked"
                  style={{ marginBottom: 0 }}
                >
                  <Switch disabled={drawerMode === 'view'} />
                </Form.Item>
              </div>
            </Col>
          </Row>

          {/* Email Settings Section */}
          <Divider>Email Settings</Divider>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="Recipients"
                name="recipients"
              >
                <Select
                  mode="multiple"
                  placeholder="Select Contacts"
                  disabled={drawerMode === 'view'}
                  options={[
                    { label: 'Admin', value: 'admin@infraon.com' },
                    { label: 'Support', value: 'support@infraon.com' },
                    { label: 'Team Lead', value: 'teamlead@infraon.com' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};
