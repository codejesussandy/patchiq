import { useState, useEffect } from 'react';
import {
  Table,
  Input,
  Button,
  Typography,
  Modal,
  Form,
  message,
  Tooltip,
  Select,
  Spin,
  Space,
  Checkbox,
  Row,
  Col,
} from 'antd';
import {
  SearchOutlined,
  DeleteOutlined,
  EditOutlined,
  ReloadOutlined,
  DownloadOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { settingsService } from '../../services/settings.service';

const { Title } = Typography;

interface AlertConfiguration {
  id: string;
  name: string;
  type: string;
  channel: string;
  recipients: string;
  enabled: boolean;
  createdAt: string;
  description?: string;
  module?: string;
  severity?: string;
  scope?: string;
  endpoints?: string;
  conditions?: Condition[];
  actions?: Action[];
  remediations?: Remediation[];
}

interface Condition {
  id: string;
  attribute: string;
  condition: string;
  value: string;
}

interface Action {
  id: string;
  name: string;
}

interface Remediation {
  id: string;
  name: string;
}

export const PolicyManagement = () => {
  const [alerts, setAlerts] = useState<AlertConfiguration[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'view' | 'edit'>('view');
  const [editingAlert, setEditingAlert] = useState<AlertConfiguration | null>(null);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [remediations, setRemediations] = useState<Remediation[]>([]);

  const [modalForm] = Form.useForm();
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    pageSize: 20,
    current: 1,
  });

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const data = await settingsService.getPolicies();
      const formattedData = Array.isArray(data)
        ? data.map((alert: any, index: number) => ({
            id: alert.id || String(index),
            name: alert.name || '',
            type: alert.type || 'Email',
            channel: alert.channel || 'SMTP',
            recipients: Array.isArray(alert.recipients) ? alert.recipients.join(', ') : (alert.recipients || ''),
            enabled: alert.enabled !== false,
            createdAt: alert.createdAt || new Date().toISOString(),
            description: alert.description || '',
            module: alert.module || '',
            severity: Array.isArray(alert.severity) ? alert.severity.join(', ') : (alert.severity || ''),
            scope: alert.scope || '',
            endpoints: alert.endpoints || '',
            conditions: alert.conditions || [],
            actions: alert.actions || [],
            remediations: alert.remediations || [],
          }))
        : [];
      setAlerts(formattedData);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      message.error('Failed to fetch alert configurations');
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlert = () => {
    setEditingAlert(null);
    setModalMode('create');
    setConditions([]);
    setActions([]);
    setRemediations([]);
    modalForm.resetFields();
    modalForm.setFieldsValue({
      enabled: true,
    });
    setModalVisible(true);
  };

  const handleEditAlert = (alert: AlertConfiguration) => {
    setEditingAlert(alert);
    setModalMode('edit');
    setConditions(alert.conditions || []);
    setActions(alert.actions || []);
    setRemediations(alert.remediations || []);
    modalForm.setFieldsValue({
      name: alert.name,
      description: alert.description || '',
      type: alert.type,
      channel: alert.channel,
      recipients: alert.recipients,
      enabled: alert.enabled,
      module: alert.module || '',
      severity: alert.severity || '',
      scope: alert.scope || '',
      endpoints: alert.endpoints || '',
    });
    setModalVisible(true);
  };

  const handleViewAlert = (alert: AlertConfiguration) => {
    setEditingAlert(alert);
    setModalMode('view');
    modalForm.setFieldsValue({
      name: alert.name,
      type: alert.type,
      channel: alert.channel,
      recipients: alert.recipients,
      enabled: alert.enabled,
    });
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setEditingAlert(null);
    setConditions([]);
    setActions([]);
    setRemediations([]);
    modalForm.resetFields();
  };

  const handleDelete = (alert: AlertConfiguration) => {
    Modal.confirm({
      title: 'Delete Alert Configuration',
      content: `Are you sure you want to delete "${alert.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await settingsService.deletePolicy(alert.id);
          message.success('Alert configuration deleted successfully');
          fetchAlerts();
        } catch (error) {
          message.error('Failed to delete alert configuration');
        }
      },
    });
  };

  const handleModalSubmit = async () => {
    try {
      const values = await modalForm.validateFields();
      const payload = {
        ...values,
        conditions,
        actions,
        remediations,
      };

      if (modalMode === 'create') {
        await settingsService.createPolicy(payload);
        message.success('Alert configuration created successfully');
      } else if (editingAlert && modalMode === 'edit') {
        await settingsService.updatePolicy(editingAlert.id, payload);
        message.success('Alert configuration updated successfully');
      }

      handleModalClose();
      fetchAlerts();
    } catch (error) {
      console.error('Error:', error);
      message.error(
        modalMode === 'create'
          ? 'Failed to create alert configuration'
          : 'Failed to update alert configuration'
      );
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Name', 'Type', 'Channel', 'Recipients', 'Enabled', 'Created At'],
      ...filteredAlerts.map((alert) => [
        alert.name,
        alert.type,
        alert.channel,
        alert.recipients,
        alert.enabled ? 'Yes' : 'No',
        formatDate(alert.createdAt),
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'alert-configurations.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    return (
      alert.name.toLowerCase().includes(searchLower) ||
      alert.type.toLowerCase().includes(searchLower) ||
      alert.channel.toLowerCase().includes(searchLower) ||
      alert.recipients.toLowerCase().includes(searchLower)
    );
  });

  const columns: ColumnsType<AlertConfiguration> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      sorter: (a: AlertConfiguration, b: AlertConfiguration) => a.name.localeCompare(b.name),
      render: (text: string, record: AlertConfiguration) => (
        <a onClick={() => handleViewAlert(record)}>{text}</a>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      sorter: (a: AlertConfiguration, b: AlertConfiguration) => a.type.localeCompare(b.type),
    },
    {
      title: 'Channel',
      dataIndex: 'channel',
      key: 'channel',
      width: 120,
      sorter: (a: AlertConfiguration, b: AlertConfiguration) => a.channel.localeCompare(b.channel),
    },
    {
      title: 'Recipients',
      dataIndex: 'recipients',
      key: 'recipients',
      render: (text: string) => text || '—',
    },
    {
      title: 'Status',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 100,
      render: (enabled: boolean) => (
        <span style={{ color: enabled ? '#52c41a' : '#d9d9d9' }}>
          {enabled ? 'Enabled' : 'Disabled'}
        </span>
      ),
    },
    {
      title: 'Created On',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      sorter: (a: AlertConfiguration, b: AlertConfiguration) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      render: (date: string) => formatDate(date),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      align: 'right' as const,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleEditAlert(record)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
              onClick={() => handleDelete(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0 }}>Alert Configurations</Title>
      </div>

      {/* Action Bar */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Input
          placeholder="Search..."
          prefix={<SearchOutlined />}
          style={{ maxWidth: '400px' }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateAlert}
          >
            Create
          </Button>
          <Tooltip title="Refresh">
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchAlerts}
              loading={loading}
            />
          </Tooltip>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
          >
            Export
          </Button>
        </div>
      </div>

      {/* Table */}
      <Spin spinning={loading}>
        <Table
          columns={columns}
          dataSource={filteredAlerts}
          rowKey="id"
          pagination={pagination}
          onChange={(newPagination) => setPagination(newPagination as TablePaginationConfig)}
          style={{ background: '#fff' }}
          locale={{
            emptyText: 'No alert configurations found',
          }}
        />
      </Spin>

      {/* Create/Edit Modal */}
      <Modal
        title={
          modalMode === 'create'
            ? 'Create Alert Configuration'
            : modalMode === 'view'
            ? 'View Alert Configuration'
            : 'Edit Alert Configuration'
        }
        open={modalVisible}
        onCancel={handleModalClose}
        width={750}
        bodyStyle={{ maxHeight: 'calc(90vh - 110px)', overflowY: 'auto', paddingTop: '20px' }}
        footer={
          modalMode === 'view'
            ? [
                <Button key="close" onClick={handleModalClose}>
                  Close
                </Button>,
                <Button key="edit" type="primary" onClick={() => setModalMode('edit')}>
                  Edit
                </Button>,
              ]
            : [
                <Button key="submit" type="primary" onClick={handleModalSubmit}>
                  {modalMode === 'create' ? 'Create' : 'Update'}
                </Button>,
                <Button key="reset" onClick={() => modalForm.resetFields()}>
                  Reset
                </Button>,
              ]
        }
      >
        <Form
          form={modalForm}
          layout="vertical"
          disabled={modalMode === 'view'}
        >
          {/* Basic Information */}
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: 'Please enter a name' }]}
            style={{ marginBottom: '12px' }}
          >
            <Input placeholder="Name" size="large" />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
            style={{ marginBottom: '20px' }}
          >
            <Input.TextArea
              placeholder="Enter description"
              rows={2}
              style={{ fontSize: '14px' }}
            />
          </Form.Item>

          {/* Status & Module Row */}
          <Row gutter={16} style={{ marginBottom: '20px' }}>
            <Col span={12}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  height: '100%',
                }}
              >
                <Form.Item
                  name="enabled"
                  valuePropName="checked"
                  style={{ margin: 0 }}
                >
                  <Checkbox>Enable</Checkbox>
                </Form.Item>
              </div>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Module"
                name="module"
                style={{ marginBottom: 0 }}
              >
                <Select
                  placeholder="Endpoint"
                  options={[
                    { label: 'Endpoint', value: 'Endpoint' },
                    { label: 'Patch', value: 'Patch' },
                    { label: 'Vulnerability', value: 'Vulnerability' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Severity Row */}
          <Form.Item
            label="Severity"
            name="severity"
            style={{ marginBottom: '20px' }}
          >
            <Select
              placeholder="Severity"
              options={[
                { label: 'Critical', value: 'Critical' },
                { label: 'High', value: 'High' },
                { label: 'Medium', value: 'Medium' },
                { label: 'Low', value: 'Low' },
              ]}
            />
          </Form.Item>

          {/* Scope & Endpoints Row */}
          <Row gutter={16} style={{ marginBottom: '20px' }}>
            <Col span={12}>
              <Form.Item
                label="Scope"
                name="scope"
                style={{ marginBottom: 0 }}
              >
                <Select
                  placeholder="Scope"
                  options={[
                    { label: 'All Endpoints', value: 'All Endpoints' },
                    { label: 'Selected Groups', value: 'Selected Groups' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Endpoints"
                name="endpoints"
                style={{ marginBottom: 0 }}
              >
                <Input placeholder="Please Select" />
              </Form.Item>
            </Col>
          </Row>

          {/* Channel & Recipients */}
          <Form.Item
            label="Channel"
            name="channel"
            rules={[{ required: true, message: 'Please select a channel' }]}
            style={{ marginBottom: '12px' }}
          >
            <Select
              placeholder="Select channel"
              options={[
                { label: 'SMTP', value: 'SMTP' },
                { label: 'AWS SNS', value: 'AWS SNS' },
                { label: 'HTTP', value: 'HTTP' },
                { label: 'Custom', value: 'Custom' },
              ]}
            />
          </Form.Item>

          <Form.Item
            label="Recipients"
            name="recipients"
            rules={[{ required: true, message: 'Please enter recipients' }]}
            style={{ marginBottom: '20px' }}
          >
            <Input.TextArea
              placeholder="Enter recipient email addresses or endpoints"
              rows={2}
            />
          </Form.Item>

          {/* Conditions Section */}
          <div style={{ marginTop: '24px', marginBottom: '12px' }}>
            <Typography.Text
              strong
              style={{ fontSize: '14px', color: '#262626' }}
            >
              Conditions
            </Typography.Text>
          </div>

          {conditions.length > 0 ? (
            <div
              style={{
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                padding: '12px',
                marginBottom: '16px',
              }}
            >
              <Table
                columns={[
                  {
                    title: 'Attribute',
                    dataIndex: 'attribute',
                    key: 'attribute',
                    width: '30%',
                    render: (text: string, _: Condition, index: number) =>
                      modalMode === 'view' ? (
                        <span>{text || '—'}</span>
                      ) : (
                        <Input
                          value={text}
                          onChange={(e) => {
                            const updated = [...conditions];
                            updated[index].attribute = e.target.value;
                            setConditions(updated);
                          }}
                          placeholder="Attribute"
                          size="small"
                        />
                      ),
                  },
                  {
                    title: 'Condition',
                    dataIndex: 'condition',
                    key: 'condition',
                    width: '30%',
                    render: (text: string, _: Condition, index: number) =>
                      modalMode === 'view' ? (
                        <span>{text || '—'}</span>
                      ) : (
                        <Input
                          value={text}
                          onChange={(e) => {
                            const updated = [...conditions];
                            updated[index].condition = e.target.value;
                            setConditions(updated);
                          }}
                          placeholder="Condition"
                          size="small"
                        />
                      ),
                  },
                  {
                    title: 'Value',
                    dataIndex: 'value',
                    key: 'value',
                    width: '30%',
                    render: (text: string, _: Condition, index: number) =>
                      modalMode === 'view' ? (
                        <span>{text || '—'}</span>
                      ) : (
                        <Input
                          value={text}
                          onChange={(e) => {
                            const updated = [...conditions];
                            updated[index].value = e.target.value;
                            setConditions(updated);
                          }}
                          placeholder="Value"
                          size="small"
                        />
                      ),
                  },
                  {
                    title: '',
                    key: 'action',
                    width: '10%',
                    render: (_: any, __: Condition, index: number) =>
                      modalMode !== 'view' && (
                        <Button
                          type="text"
                          danger
                          size="small"
                          onClick={() => {
                            setConditions(
                              conditions.filter((_, i) => i !== index)
                            );
                          }}
                          style={{ padding: '0 4px' }}
                        >
                          Delete
                        </Button>
                      ),
                  },
                ]}
                dataSource={conditions}
                rowKey="id"
                pagination={false}
                size="small"
                style={{ marginBottom: '12px' }}
              />
            </div>
          ) : (
            <div
              style={{
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                padding: '40px',
                textAlign: 'center',
                marginBottom: '16px',
                color: '#8c8c8c',
              }}
            >
              No data
            </div>
          )}

          {modalMode !== 'view' && (
            <Button
              type="dashed"
              block
              icon={<PlusOutlined />}
              onClick={() => {
                const newCondition: Condition = {
                  id: Date.now().toString(),
                  attribute: '',
                  condition: '',
                  value: '',
                };
                setConditions([...conditions, newCondition]);
              }}
              style={{ marginBottom: '24px' }}
            >
              Add Condition
            </Button>
          )}

          {/* Add Actions Section */}
          <div style={{ marginTop: '20px', marginBottom: '12px' }}>
            <Typography.Text
              strong
              style={{ fontSize: '14px', color: '#262626' }}
            >
              Add Actions
            </Typography.Text>
          </div>

          {actions.length > 0 ? (
            <div
              style={{
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                padding: '12px',
                marginBottom: '16px',
              }}
            >
              {actions.map((action, index) => (
                <div
                  key={action.id}
                  style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: index === actions.length - 1 ? 0 : '8px',
                    alignItems: 'center',
                  }}
                >
                  <Input
                    value={action.name}
                    onChange={(e) => {
                      const updated = [...actions];
                      updated[index].name = e.target.value;
                      setActions(updated);
                    }}
                    placeholder="Action"
                    size="small"
                    disabled={modalMode === 'view'}
                  />
                  {modalMode !== 'view' && (
                    <Button
                      type="text"
                      danger
                      size="small"
                      onClick={() => {
                        setActions(actions.filter((_, i) => i !== index));
                      }}
                      style={{ padding: '0 4px' }}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                padding: '40px',
                textAlign: 'center',
                marginBottom: '16px',
                color: '#8c8c8c',
              }}
            >
              No data
            </div>
          )}

          {modalMode !== 'view' && (
            <Button
              type="dashed"
              block
              icon={<PlusOutlined />}
              onClick={() => {
                const newAction: Action = {
                  id: Date.now().toString(),
                  name: '',
                };
                setActions([...actions, newAction]);
              }}
              style={{ marginBottom: '24px' }}
            >
              Add Action
            </Button>
          )}

          {/* Add Remediations Section */}
          <div style={{ marginTop: '20px', marginBottom: '12px' }}>
            <Typography.Text
              strong
              style={{ fontSize: '14px', color: '#262626' }}
            >
              Add Remediations
            </Typography.Text>
          </div>

          {remediations.length > 0 ? (
            <div
              style={{
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                padding: '12px',
                marginBottom: '16px',
              }}
            >
              {remediations.map((remediation, index) => (
                <div
                  key={remediation.id}
                  style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: index === remediations.length - 1 ? 0 : '8px',
                    alignItems: 'center',
                  }}
                >
                  <Input
                    value={remediation.name}
                    onChange={(e) => {
                      const updated = [...remediations];
                      updated[index].name = e.target.value;
                      setRemediations(updated);
                    }}
                    placeholder="Remediation"
                    size="small"
                    disabled={modalMode === 'view'}
                  />
                  {modalMode !== 'view' && (
                    <Button
                      type="text"
                      danger
                      size="small"
                      onClick={() => {
                        setRemediations(remediations.filter((_, i) => i !== index));
                      }}
                      style={{ padding: '0 4px' }}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                padding: '40px',
                textAlign: 'center',
                marginBottom: '16px',
                color: '#8c8c8c',
              }}
            >
              No data
            </div>
          )}

          {modalMode !== 'view' && (
            <Button
              type="dashed"
              block
              icon={<PlusOutlined />}
              onClick={() => {
                const newRemediation: Remediation = {
                  id: Date.now().toString(),
                  name: '',
                };
                setRemediations([...remediations, newRemediation]);
              }}
            >
              Add Remediation
            </Button>
          )}
        </Form>
      </Modal>
    </div>
  );
};
