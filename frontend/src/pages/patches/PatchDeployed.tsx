import { useState, useEffect } from 'react';
import {
  Table,
  Input,
  Button,
  Dropdown,
  Space,
  Typography,
  Modal,
  message,
  Tag,
  Form,
  Select,
  DatePicker,
  Steps,
  Checkbox,
  Card,
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
  PlusOutlined,
  MoreOutlined,
  ReloadOutlined,
  ExportOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { OSIcon } from '../../components/patches';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import { patchService, type Deployment, type Patch } from '../../services/patch.service';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export const PatchDeployed = () => {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Create Deployment Modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();

  // Preview Modal
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  // Patches for step 2
  const [patches, setPatches] = useState<Patch[]>([]);
  const [selectedPatches, setSelectedPatches] = useState<string[]>([]);

  // Tasks Modal
  const [tasksModalVisible, setTasksModalVisible] = useState(false);
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksSearchText, setTasksSearchText] = useState('');
  const [tasksFilter, setTasksFilter] = useState<string>('All');

  useEffect(() => {
    fetchDeployments();
    fetchPatches();
  }, []);

  const fetchDeployments = async () => {
    setLoading(true);
    try {
      const data = await patchService.getDeployments();
      setDeployments(data);
    } catch (error) {
      message.error('Failed to fetch deployments');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatches = async () => {
    try {
      const data = await patchService.getPatches();
      setPatches(data);
    } catch (error) {
      message.error('Failed to fetch patches');
    }
  };

  // Task type for deployment tasks
  type DeploymentTask = {
    id: number;
    endpoint: {
      name: string;
      os: 'Windows' | 'MacOS' | 'Ubuntu' | 'Linux';
      status: string;
    };
    name: string;
    status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'IN_PROGRESS';
    createdBy: string;
    lastUpdated: string;
    createdOn: string;
  };

  const fetchTasks = async (_deploymentId: string) => {
    setTasksLoading(true);
    try {
      // In real implementation, fetch tasks from API
      // For now, using mock data
      const mockTasks: DeploymentTask[] = [
        {
          id: 855,
          endpoint: { name: 'DESKTOP-7CC6ETJ', os: 'Ubuntu', status: 'Online' },
          name: 'ubuntu-drivers-cc',
          status: 'SUCCESS',
          createdBy: 'Admin',
          lastUpdated: '2026/01/12 02:02:08 PM',
          createdOn: '2026/01/12 02:01:36 PM',
        },
        {
          id: 854,
          endpoint: { name: 'DESKTOP-7CC6ETJ', os: 'Ubuntu', status: 'Online' },
          name: 'gir1.2-nm-1.0',
          status: 'SUCCESS',
          createdBy: 'Admin',
          lastUpdated: '2026/01/12 02:01:46 PM',
          createdOn: '2026/01/12 02:01:29 PM',
        },
        {
          id: 853,
          endpoint: { name: 'DESKTOP-7CC6ETJ', os: 'Ubuntu', status: 'Online' },
          name: 'libnm0',
          status: 'SUCCESS',
          createdBy: 'Admin',
          lastUpdated: '2026/01/12 02:01:36 PM',
          createdOn: '2026/01/12 02:01:23 PM',
        },
        {
          id: 852,
          endpoint: { name: 'DESKTOP-7CC6ETJ', os: 'Ubuntu', status: 'Online' },
          name: 'network-manager',
          status: 'SUCCESS',
          createdBy: 'Admin',
          lastUpdated: '2026/01/12 02:01:27 PM',
          createdOn: '2026/01/12 02:00:54 PM',
        },
        {
          id: 851,
          endpoint: { name: 'DESKTOP-7CC6ETJ', os: 'Ubuntu', status: 'Online' },
          name: 'network-manager',
          status: 'SUCCESS',
          createdBy: 'Admin',
          lastUpdated: '2026/01/12 02:01:09 PM',
          createdOn: '2026/01/12 02:00:27 PM',
        },
        {
          id: 850,
          endpoint: { name: 'DESKTOP-7CC6ETJ', os: 'Ubuntu', status: 'Online' },
          name: 'snapd',
          status: 'SUCCESS',
          createdBy: 'Admin',
          lastUpdated: '2026/01/12 02:01:05 PM',
          createdOn: '2026/01/12 02:00:00 PM',
        },
      ];
      setTasks(mockTasks);
      // await patchService.getDeploymentTasks(deploymentId);
    } catch (error) {
      message.error('Failed to fetch tasks');
    } finally {
      setTasksLoading(false);
    }
  };

  const handleViewDeployment = (deployment: Deployment) => {
    setSelectedDeployment(deployment);
    setTasksSearchText('');
    setTasksFilter('All');
    fetchTasks(deployment.id);
    setTasksModalVisible(true);
  };

  const handleTasksRefresh = () => {
    if (selectedDeployment) {
      fetchTasks(selectedDeployment.id);
    }
  };

  const handleTasksExport = () => {
    try {
      const dataToExport = filteredTasks.length > 0 ? filteredTasks : tasks;
      
      if (dataToExport.length === 0) {
        message.warning('No data to export');
        return;
      }

      const exportData = dataToExport.map((item) => ({
        Id: item.id,
        Endpoint: item.endpoint.name,
        Name: item.name,
        Status: item.status,
        'Created By': item.createdBy,
        'Last Updated': item.lastUpdated,
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
      link.setAttribute('download', `deployment_tasks_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('Tasks exported successfully');
    } catch (error) {
      message.error('Failed to export data');
      console.error('Export error:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'success';
      case 'FAILED':
        return 'error';
      case 'PENDING':
        return 'warning';
      case 'IN_PROGRESS':
        return 'processing';
      default:
        return 'default';
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = 
      task.id.toString().includes(tasksSearchText.toLowerCase()) ||
      task.name.toLowerCase().includes(tasksSearchText.toLowerCase()) ||
      task.endpoint.name.toLowerCase().includes(tasksSearchText.toLowerCase());
    
    const matchesFilter = tasksFilter === 'All' || task.status === tasksFilter.toUpperCase();
    
    return matchesSearch && matchesFilter;
  });

  const getActionMenuItems = (deployment: Deployment): MenuProps['items'] => [
    {
      key: 'view',
      label: 'View Details',
      icon: <EyeOutlined />,
      onClick: () => handleViewDeployment(deployment),
    },
  ];

  const columns: ColumnsType<Deployment> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'ID',
      dataIndex: 'deploymentId',
      key: 'deploymentId',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'INSTALL' ? 'blue' : 'red'}>{type}</Tag>
      ),
      filters: [
        { text: 'INSTALL', value: 'INSTALL' },
        { text: 'ROLLBACK', value: 'ROLLBACK' },
      ],
      onFilter: (value, record) => record.type === value,
    },
    {
      title: 'Stage',
      dataIndex: 'stage',
      key: 'stage',
      render: (stage: string) => {
        const colors: Record<string, string> = {
          INSTALLED: 'blue',
          COMPLETED: 'green',
          IN_PROGRESS: 'orange',
          FAILED: 'red',
        };
        return <Tag color={colors[stage] || 'default'}>{stage}</Tag>;
      },
      filters: [
        { text: 'INSTALLED', value: 'INSTALLED' },
        { text: 'COMPLETED', value: 'COMPLETED' },
        { text: 'IN_PROGRESS', value: 'IN_PROGRESS' },
        { text: 'FAILED', value: 'FAILED' },
      ],
      onFilter: (value, record) => record.stage === value,
    },
    {
      title: 'Pending',
      dataIndex: 'pending',
      key: 'pending',
      align: 'center',
      width: 100,
    },
    {
      title: 'Succeeded',
      dataIndex: 'succeeded',
      key: 'succeeded',
      align: 'center',
      width: 120,
    },
    {
      title: 'Failed',
      dataIndex: 'failed',
      key: 'failed',
      align: 'center',
      width: 100,
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

  const filteredDeployments = deployments.filter((deployment) =>
    deployment.name.toLowerCase().includes(searchText.toLowerCase()) ||
    deployment.deploymentId.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleCreateDeployment = async () => {
    if (currentStep === 0) {
      try {
        await form.validateFields(['name', 'description', 'type', 'schedule', 'targetGroups']);
        setCurrentStep(1);
      } catch (error) {
        // Validation failed
      }
    } else {
      // Show preview
      try {
        const values = form.getFieldsValue();
        setPreviewData({
          ...values,
          selectedPatches: patches.filter(p => selectedPatches.includes(p.id)),
        });
        setPreviewModalVisible(true);
      } catch (error) {
        message.error('Failed to create preview');
      }
    }
  };

  const handleConfirmDeployment = async () => {
    try {
      const values = form.getFieldsValue();
      await patchService.createDeployment({
        ...values,
        patches: selectedPatches,
      });
      message.success('Deployment created successfully');
      setCreateModalVisible(false);
      setPreviewModalVisible(false);
      setCurrentStep(0);
      setSelectedPatches([]);
      form.resetFields();
      fetchDeployments();
    } catch (error) {
      message.error('Failed to create deployment');
    }
  };

  const renderCreateDeploymentStep1 = () => (
    <Form form={form} layout="vertical">
      <Form.Item
        name="name"
        label="Name"
        rules={[{ required: true, message: 'Please enter deployment name' }]}
      >
        <Input placeholder="Enter deployment name" />
      </Form.Item>

      <Form.Item
        name="description"
        label="Description"
        rules={[{ required: true, message: 'Please enter description' }]}
      >
        <TextArea rows={3} placeholder="Enter description" />
      </Form.Item>

      <Form.Item
        name="type"
        label="Deployment Type"
        rules={[{ required: true, message: 'Please select type' }]}
        initialValue="INSTALL"
      >
        <Select>
          <Option value="INSTALL">Install</Option>
          <Option value="ROLLBACK">Rollback</Option>
        </Select>
      </Form.Item>

      <Form.Item
        name="schedule"
        label="Schedule"
        rules={[{ required: true, message: 'Please select schedule' }]}
      >
        <DatePicker showTime style={{ width: '100%' }} placeholder="Select date and time" />
      </Form.Item>

      <Form.Item
        name="targetGroups"
        label="Target Groups"
        rules={[{ required: true, message: 'Please select target groups' }]}
      >
        <Select mode="multiple" placeholder="Select groups">
          <Option value="all">All Endpoints</Option>
          <Option value="windows">Windows Endpoints</Option>
          <Option value="macos">MacOS Endpoints</Option>
          <Option value="linux">Linux Endpoints</Option>
        </Select>
      </Form.Item>
    </Form>
  );

  const renderCreateDeploymentStep2 = () => (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Input
          placeholder="Search patches"
          prefix={<SearchOutlined />}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        <Checkbox.Group
          value={selectedPatches}
          onChange={(checkedValues) => setSelectedPatches(checkedValues as string[])}
          style={{ width: '100%' }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            {patches.map((patch) => (
              <Card key={patch.id} size="small" style={{ marginBottom: 8 }}>
                <Checkbox value={patch.id}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{patch.software}</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {patch.patchId} | {patch.os} | Severity: {patch.severity}
                    </Text>
                  </div>
                </Checkbox>
              </Card>
            ))}
          </Space>
        </Checkbox.Group>
      </div>

      <div style={{ marginTop: 16 }}>
        <Text strong>{selectedPatches.length} patches selected</Text>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>
          Patch Deployed
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>
          Create
        </Button>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <Space>
          <Input
            placeholder="Search"
            prefix={<SearchOutlined />}
            style={{ width: 320 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <Button icon={<FilterOutlined />}>Filter</Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={filteredDeployments}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: false,
          showTotal: (total) => `Total ${total} assets found`,
        }}
        scroll={{ x: 1200 }}
        style={{ marginBottom: '16px' }}
      />

      {/* Create Deployment Modal */}
      <Modal
        title="Create Deployment"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          setCurrentStep(0);
          setSelectedPatches([]);
          form.resetFields();
        }}
        width={800}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {currentStep > 0 && (
              <Button onClick={() => setCurrentStep(0)}>Back</Button>
            )}
            <div style={{ marginLeft: 'auto' }}>
              <Button onClick={() => {
                setCreateModalVisible(false);
                setCurrentStep(0);
                setSelectedPatches([]);
                form.resetFields();
              }}>
                Cancel
              </Button>
              <Button type="primary" onClick={handleCreateDeployment} style={{ marginLeft: 8 }}>
                {currentStep === 0 ? 'Next' : 'Preview Deployment'}
              </Button>
            </div>
          </div>
        }
      >
        <Steps
          current={currentStep}
          style={{ marginBottom: 24 }}
          items={[
            { title: 'Deployment Details' },
            { title: 'Select Patches' },
          ]}
        />
        {currentStep === 0 ? renderCreateDeploymentStep1() : renderCreateDeploymentStep2()}
      </Modal>

      {/* Preview Deployment Modal */}
      <Modal
        title="Preview Deployment"
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        onOk={handleConfirmDeployment}
        okText="Execute Deployment"
        width={700}
      >
        {previewData && (
          <div>
            <Card title="Deployment Details" bordered={false} style={{ marginBottom: 16 }}>
              <p><strong>Name:</strong> {previewData.name}</p>
              <p><strong>Description:</strong> {previewData.description}</p>
              <p><strong>Type:</strong> <Tag color={previewData.type === 'INSTALL' ? 'blue' : 'red'}>{previewData.type}</Tag></p>
              <p><strong>Schedule:</strong> {previewData.schedule?.format('YYYY-MM-DD HH:mm')}</p>
              <p><strong>Target Groups:</strong> {previewData.targetGroups?.join(', ')}</p>
            </Card>

            <Card title="Selected Patches" bordered={false}>
              <p><strong>Total Patches:</strong> {previewData.selectedPatches?.length}</p>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {previewData.selectedPatches?.map((patch: Patch) => (
                  <div key={patch.id} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ fontWeight: 500 }}>{patch.software}</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {patch.patchId} | {patch.os} | {patch.severity}
                    </Text>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </Modal>

      {/* Tasks Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={() => {
                  setTasksModalVisible(false);
                  setTasksSearchText('');
                  setTasksFilter('All');
                }}
                style={{ padding: 0, marginRight: 8 }}
              />
              <Title level={4} style={{ margin: 0 }}>Tasks.</Title>
            </div>
          </div>
        }
        open={tasksModalVisible}
        onCancel={() => {
          setTasksModalVisible(false);
          setTasksSearchText('');
          setTasksFilter('All');
        }}
        width={1200}
        footer={null}
        closeIcon={null}
      >
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Input
            placeholder="Search..."
            prefix={<SearchOutlined />}
            suffix={<SearchOutlined style={{ color: 'rgba(0, 0, 0, 0.25)' }} />}
            value={tasksSearchText}
            onChange={(e) => setTasksSearchText(e.target.value)}
            style={{ width: 300 }}
          />
          <Space>
            <Select
              value={tasksFilter}
              onChange={setTasksFilter}
              style={{ width: 120 }}
            >
              <Option value="All">All</Option>
              <Option value="SUCCESS">Success</Option>
              <Option value="FAILED">Failed</Option>
              <Option value="PENDING">Pending</Option>
              <Option value="IN_PROGRESS">In Progress</Option>
            </Select>
            <Button icon={<ReloadOutlined />} onClick={handleTasksRefresh} loading={tasksLoading}>
              Refresh
            </Button>
            <Button icon={<ExportOutlined />} onClick={handleTasksExport}>
              Export
            </Button>
          </Space>
        </div>

        <Table<DeploymentTask>
          dataSource={filteredTasks}
          rowKey="id"
          loading={tasksLoading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total, range) =>
              `showing ${range[0]}-${range[1]} of ${total} items`,
          }}
          columns={[
            {
              title: 'Id',
              dataIndex: 'id',
              key: 'id',
              sorter: (a, b) => a.id - b.id,
            },
            {
              title: 'Endpoint',
              dataIndex: 'endpoint',
              key: 'endpoint',
              sorter: (a, b) => a.endpoint.name.localeCompare(b.endpoint.name),
              render: (endpoint: DeploymentTask['endpoint']) => (
                <Space>
                  <OSIcon os={endpoint.os} />
                  <Text>{endpoint.name}</Text>
                </Space>
              ),
            },
            {
              title: 'Name',
              dataIndex: 'name',
              key: 'name',
              sorter: (a, b) => a.name.localeCompare(b.name),
              render: (name: string) => (
                <Space>
                  <span style={{ 
                    width: 24, 
                    height: 24, 
                    borderRadius: '50%', 
                    backgroundColor: '#1890ff', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: 12
                  }}>
                    {name.charAt(0).toUpperCase()}
                  </span>
                  <Text>{name}</Text>
                </Space>
              ),
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              sorter: (a, b) => a.status.localeCompare(b.status),
              render: (status: string) => (
                <Tag color={getStatusColor(status)}>{status}</Tag>
              ),
            },
            {
              title: 'Created By',
              dataIndex: 'createdBy',
              key: 'createdBy',
              sorter: (a, b) => a.createdBy.localeCompare(b.createdBy),
            },
            {
              title: 'Last Updated',
              dataIndex: 'lastUpdated',
              key: 'lastUpdated',
              sorter: (a, b) => new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime(),
              render: (text: string) => (
                <div>
                  <div>{text.split(', ')[0]}</div>
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>{text.split(', ')[1]}</div>
                </div>
              ),
            },
            {
              title: 'Created On',
              dataIndex: 'createdOn',
              key: 'createdOn',
              sorter: (a, b) => new Date(a.createdOn).getTime() - new Date(b.createdOn).getTime(),
              render: (text: string) => (
                <div>
                  <div>{text.split(', ')[0]}</div>
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>{text.split(', ')[1]}</div>
                </div>
              ),
            },
          ]}
          scroll={{ x: 'max-content' }}
        />
      </Modal>
    </div>
  );
};
