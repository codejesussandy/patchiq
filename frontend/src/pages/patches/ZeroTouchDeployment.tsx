import { useState, useEffect } from 'react';
import {
  App,
  Table,
  Input,
  Button,
  Dropdown,
  Space,
  Typography,
  Modal,
  Tag,
  Form,
  Select,
  Radio,
  Empty,
  Card,
  Checkbox,
  Switch,
  Row,
  Col,
  Divider,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import { patchService, type ZeroTouchConfig } from '../../services/patch.service';
import { settingsService } from '../../services/settings.service';
import { assetService } from '../../services/asset.service';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export const ZeroTouchDeployment = () => {
  const { message } = App.useApp();
  const [configs, setConfigs] = useState<ZeroTouchConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Create Config Modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Edit Config Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ZeroTouchConfig | null>(null);
  const [editForm] = Form.useForm();

  // View Details Modal
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [viewingConfig, setViewingConfig] = useState<ZeroTouchConfig | null>(null);

  // Dynamic option lists
  const [applications, setApplications] = useState<any[]>([]);
  const [computers, setComputers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);

  useEffect(() => {
    fetchConfigs();
    const fetchOptions = async () => {
      try {
        const [appsData, assetsData, groupsData] = await Promise.all([
          assetService.getSoftwareInventory(),
          assetService.getAssets(),
          settingsService.getComputerGroups(),
        ]);
        setApplications(appsData);
        setComputers(assetsData);
        setGroups(groupsData);
      } catch {
        // Silently fail
      }
    };
    fetchOptions();
  }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const data = await patchService.getZeroTouchConfigs();
      setConfigs(data);
    } catch (error) {
      message.error('Failed to fetch configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConfig = async () => {
    try {
      const values = await form.validateFields();
      await patchService.createZeroTouchConfig(values);
      message.success('Configuration created successfully');
      setCreateModalVisible(false);
      form.resetFields();
      fetchConfigs();
    } catch (error) {
      message.error('Failed to create configuration');
    }
  };

  const handleEditConfig = (config: ZeroTouchConfig) => {
    setEditingConfig(config);
    editForm.setFieldsValue(config);
    setEditModalVisible(true);
  };

  const handleUpdateConfig = async () => {
    try {
      const values = await editForm.validateFields();
      if (editingConfig) {
        await patchService.updateZeroTouchConfig(editingConfig.id, values);
        message.success('Configuration updated successfully');
        setEditModalVisible(false);
        editForm.resetFields();
        setEditingConfig(null);
        fetchConfigs();
      }
    } catch (error) {
      message.error('Failed to update configuration');
    }
  };

  const handleViewConfig = (config: ZeroTouchConfig) => {
    setViewingConfig(config);
    setViewModalVisible(true);
  };

  const handleDeleteConfig = (config: ZeroTouchConfig) => {
    Modal.confirm({
      title: 'Delete Configuration',
      content: `Are you sure you want to delete ${config.name}?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await patchService.deleteZeroTouchConfig(config.id);
          message.success('Configuration deleted successfully');
          fetchConfigs();
        } catch (error) {
          message.error('Failed to delete configuration');
        }
      },
    });
  };

  const getActionMenuItems = (config: ZeroTouchConfig): MenuProps['items'] => [
    {
      key: 'view',
      label: 'View Details',
      icon: <EyeOutlined />,
      onClick: () => handleViewConfig(config),
    },
    {
      key: 'edit',
      label: 'Edit',
      icon: <EditOutlined />,
      onClick: () => handleEditConfig(config),
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => handleDeleteConfig(config),
    },
  ];

  const columns: ColumnsType<ZeroTouchConfig> = [
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
    },
    {
      title: 'Application Type',
      dataIndex: 'applicationType',
      key: 'applicationType',
      render: (type: string) => (
        <Tag color="blue">{type}</Tag>
      ),
    },
    {
      title: 'Scope',
      dataIndex: 'scope',
      key: 'scope',
      render: (scope: string) => (
        <Tag color="green">{scope.replace(/_/g, ' ')}</Tag>
      ),
    },
    {
      title: 'Auto Deploy',
      key: 'autoDeploy',
      render: (_, record) => (
        <Tag color="cyan">
          {record.autoDeploymentRules.severity.length} Severity Levels
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: Record<string, string> = {
          'Active': 'green',
          'Inactive': 'default',
          'Paused': 'orange',
        };
        return <Tag color={colors[status] || 'default'}>{status}</Tag>;
      },
    },
    {
      title: 'Created by',
      dataIndex: 'createdBy',
      key: 'createdBy',
      width: 120,
    },
    {
      title: 'Created on',
      dataIndex: 'createdOn',
      key: 'createdOn',
      width: 150,
    },
    {
      title: '',
      key: 'action',
      width: 60,
      fixed: 'right',
      render: (_, record) => (
        <Dropdown menu={{ items: getActionMenuItems(record) }} trigger={['click']}>
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  const filteredConfigs = configs.filter((config) =>
    config.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderEmptyState = () => (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <Empty
        description={
          <Space orientation="vertical" size="large">
            <Text style={{ fontSize: 16, color: '#8c8c8c' }}>
              No zero-touch configurations set up yet
            </Text>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
              onClick={() => setCreateModalVisible(true)}
            >
              Create Configuration
            </Button>
          </Space>
        }
      />
    </div>
  );

  const renderConfigForm = (formInstance: any) => (
    <Form form={formInstance} layout="vertical">
      <Form.Item
        name="name"
        label="Configuration Name"
        rules={[{ required: true, message: 'Please enter configuration name' }]}
      >
        <Input placeholder="Enter configuration name" />
      </Form.Item>

      <Form.Item
        name="description"
        label="Description"
        rules={[{ required: true, message: 'Please enter description' }]}
      >
        <TextArea rows={3} placeholder="Enter description" />
      </Form.Item>

      <Form.Item
        name="applicationType"
        label="Application Type"
        rules={[{ required: true, message: 'Please select application type' }]}
        initialValue="ALL"
      >
        <Radio.Group>
          <Space orientation="vertical">
            <Radio value="ALL">All Applications</Radio>
            <Radio value="INCLUDE">Include Specific Applications</Radio>
            <Radio value="EXCLUDE">Exclude Specific Applications</Radio>
          </Space>
        </Radio.Group>
      </Form.Item>

      <Form.Item
        noStyle
        shouldUpdate={(prevValues, currentValues) =>
          prevValues.applicationType !== currentValues.applicationType
        }
      >
        {({ getFieldValue }) =>
          getFieldValue('applicationType') !== 'ALL' && (
            <Form.Item
              name="applications"
              label="Select Applications"
              rules={[{ required: true, message: 'Please select applications' }]}
            >
              <Select mode="multiple" placeholder="Select applications">
                {applications.map((app) => (
                  <Option key={app.id} value={app.name || app.softwareName}>{app.name || app.softwareName}</Option>
                ))}
              </Select>
            </Form.Item>
          )
        }
      </Form.Item>

      <Form.Item
        name="scope"
        label="Scope"
        rules={[{ required: true, message: 'Please select scope' }]}
        initialValue="ALL_COMPUTERS"
      >
        <Radio.Group>
          <Space orientation="vertical">
            <Radio value="ALL_COMPUTERS">All Computers</Radio>
            <Radio value="SCOPE">Scope</Radio>
            <Radio value="SPECIFIC_GROUPS">Specific Groups</Radio>
          </Space>
        </Radio.Group>
      </Form.Item>

      <Form.Item
        noStyle
        shouldUpdate={(prevValues, currentValues) =>
          prevValues.scope !== currentValues.scope
        }
      >
        {({ getFieldValue }) =>
          getFieldValue('scope') === 'SCOPE' && (
            <Form.Item
              name="computers"
              label="Select Computers"
              rules={[{ required: true, message: 'Please select computers' }]}
            >
              <Select
                mode="multiple"
                placeholder="Search and select computers"
                showSearch
                filterOption={(input, option) =>
                  String(option?.label ?? option?.value ?? '').toLowerCase().includes(input.toLowerCase())
                }
              >
                {computers.map((c) => (
                  <Option key={c.id} value={c.id}>{c.hostname || c.name || c.id}</Option>
                ))}
              </Select>
            </Form.Item>
          )
        }
      </Form.Item>

      <Form.Item
        noStyle
        shouldUpdate={(prevValues, currentValues) =>
          prevValues.scope !== currentValues.scope
        }
      >
        {({ getFieldValue }) =>
          getFieldValue('scope') === 'SPECIFIC_GROUPS' && (
            <Form.Item
              name="groups"
              label="Select Groups"
              rules={[{ required: true, message: 'Please select groups' }]}
            >
              <Select mode="multiple" placeholder="Select groups">
                {groups.map((g) => (
                  <Option key={g.id} value={g.id}>{g.name}</Option>
                ))}
              </Select>
            </Form.Item>
          )
        }
      </Form.Item>

      <Card title="Auto-Deployment Rules" bordered={false} style={{ marginTop: 16, backgroundColor: '#fafafa' }}>
        <Form.Item
          name={['autoDeploymentRules', 'severity']}
          label="Auto-Deploy for Severity Levels"
          rules={[{ required: true, message: 'Please select at least one severity level' }]}
        >
          <Checkbox.Group>
            <Space orientation="vertical">
              <Checkbox value="CRITICAL">CRITICAL</Checkbox>
              <Checkbox value="High">High</Checkbox>
              <Checkbox value="Medium">Medium</Checkbox>
              <Checkbox value="Low">Low</Checkbox>
            </Space>
          </Checkbox.Group>
        </Form.Item>

        <Form.Item
          name={['autoDeploymentRules', 'approvalRequired']}
          label="Require Approval Before Deployment"
          valuePropName="checked"
          initialValue={false}
        >
          <Switch />
        </Form.Item>

        <Form.Item
          name={['autoDeploymentRules', 'schedule']}
          label="Deployment Schedule"
          rules={[{ required: true, message: 'Please select schedule' }]}
          initialValue="Immediate"
        >
          <Select>
            <Option value="Immediate">Deploy Immediately</Option>
            <Option value="Daily">Daily</Option>
            <Option value="Weekly">Weekly</Option>
            <Option value="Monthly">Monthly</Option>
          </Select>
        </Form.Item>
      </Card>
    </Form>
  );

  if (!loading && configs.length === 0) {
    return (
      <div>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>
            Zero Touch Deployment
          </Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>
            Create
          </Button>
        </div>

        {renderEmptyState()}

        {/* Create Config Modal */}
        <Modal
          title="Create Zero Touch Configuration"
          open={createModalVisible}
          onCancel={() => {
            setCreateModalVisible(false);
            form.resetFields();
          }}
          onOk={handleCreateConfig}
          okText="Create Configuration"
          width={800}
        >
          {renderConfigForm(form)}
        </Modal>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>
          Zero Touch Deployment
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>
          Create
        </Button>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <Input
          placeholder="Search configurations"
          prefix={<SearchOutlined />}
          style={{ width: 320 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      <Table
        columns={columns}
        dataSource={filteredConfigs}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: false,
          showTotal: (total) => `Total ${total} configurations found`,
        }}
        scroll={{ x: 1200 }}
      />

      {/* Create Config Modal */}
      <Modal
        title="Create Zero Touch Configuration"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        onOk={handleCreateConfig}
        okText="Create Configuration"
        width={800}
      >
        {renderConfigForm(form)}
      </Modal>

      {/* Edit Config Modal */}
      <Modal
        title="Edit Zero Touch Configuration"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
          setEditingConfig(null);
        }}
        onOk={handleUpdateConfig}
        okText="Update Configuration"
        width={800}
      >
        {renderConfigForm(editForm)}
      </Modal>

      {/* View Config Details Modal */}
      <Modal
        title="Configuration Details"
        open={viewModalVisible}
        onCancel={() => { setViewModalVisible(false); setViewingConfig(null); }}
        footer={[
          <Button key="close" onClick={() => { setViewModalVisible(false); setViewingConfig(null); }}>
            Close
          </Button>,
        ]}
        width={700}
      >
        {viewingConfig && (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text type="secondary">Name</Text>
                <div><strong>{viewingConfig.name}</strong></div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Status</Text>
                <div><Tag color={
                  viewingConfig.status === 'Active' ? 'green' :
                  viewingConfig.status === 'Paused' ? 'orange' : 'default'
                }>{viewingConfig.status}</Tag></div>
              </Col>
            </Row>
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              <Col span={24}>
                <Text type="secondary">Description</Text>
                <div><strong>{viewingConfig.description || 'N/A'}</strong></div>
              </Col>
            </Row>
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              <Col span={12}>
                <Text type="secondary">Application Type</Text>
                <div><Tag color="blue">{viewingConfig.applicationType}</Tag></div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Scope</Text>
                <div><Tag color="green">{viewingConfig.scope?.replace(/_/g, ' ')}</Tag></div>
              </Col>
            </Row>

            <Divider />

            <Card title="Auto-Deployment Rules" bordered={false} style={{ backgroundColor: '#fafafa' }}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Text type="secondary">Severity Levels</Text>
                  <div style={{ marginTop: 4 }}>
                    {viewingConfig.autoDeploymentRules?.severity?.map((s) => (
                      <Tag key={s} color="red" style={{ marginBottom: 4 }}>{s}</Tag>
                    )) || 'None'}
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Schedule</Text>
                  <div><strong>{viewingConfig.autoDeploymentRules?.schedule || 'N/A'}</strong></div>
                </Col>
              </Row>
              <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col span={12}>
                  <Text type="secondary">Approval Required</Text>
                  <div><strong>{viewingConfig.autoDeploymentRules?.approvalRequired ? 'Yes' : 'No'}</strong></div>
                </Col>
              </Row>
            </Card>

            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              <Col span={12}>
                <Text type="secondary">Created By</Text>
                <div><strong>{viewingConfig.createdBy || 'N/A'}</strong></div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Created On</Text>
                <div><strong>{viewingConfig.createdOn || 'N/A'}</strong></div>
              </Col>
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
};
