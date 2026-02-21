import { useState } from 'react';
import { SearchOutlined, FilterOutlined, EyeOutlined, PlusOutlined, MoreOutlined } from '@ant-design/icons';
import { App, Input, Button, Dropdown, Space, Typography, Modal, Tag, Form, Select } from 'antd';
import type { MenuProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DataTable } from '../../components/shared/DataTable';
import { useDeployments, usePatches, useCreateDeployment, useDeploymentTasks } from '../../hooks/usePatches';
import { useComputerGroups } from '../../hooks/useSettings';
import { type Deployment } from '../../services/patch.service';
import { CreateDeploymentModal, PreviewDeploymentModal } from './components/CreateDeploymentModal';
import { DeploymentTasksModal, type DeploymentTask } from './components/DeploymentTasksModal';

const { Title, Text } = Typography;
const { Option } = Select;

export const PatchDeployed = () => {
  const { message } = App.useApp();
  const { data: deployments = [], isLoading: loading } = useDeployments();
  const { data: patchesData } = usePatches();
  const patches = patchesData?.data || [];
  const createDeploymentMutation = useCreateDeployment();
  const [searchText, setSearchText] = useState('');

  // Create Deployment Modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, unknown> | null>(null);
  const [selectedPatches, setSelectedPatches] = useState<string[]>([]);

  // Tasks Modal
  const [tasksModalVisible, setTasksModalVisible] = useState(false);
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  const [tasksSearchText, setTasksSearchText] = useState('');
  const [tasksFilter, setTasksFilter] = useState<string>('All');

  // Filter
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filterForm] = Form.useForm();
  const [activeFilters, setActiveFilters] = useState<{ type?: string[]; status?: string[] }>({});

  const { data: groups = [] } = useComputerGroups();
  const { data: rawTasksData = [], isLoading: tasksLoading, refetch: refetchTasks } = useDeploymentTasks(selectedDeployment?.id || '');

  const tasks: DeploymentTask[] = rawTasksData.map((task) => {
    const endpoint = task.endpoint as Record<string, unknown> | undefined;
    const status = typeof task.status === 'string' ? task.status.toUpperCase() : 'PENDING';
    return {
      id: task.id as number,
      endpoint: {
        name: (endpoint?.name as string) || 'Unknown',
        os: (endpoint?.os as 'Windows' | 'MacOS' | 'Ubuntu' | 'Linux') || 'Windows',
        status: (endpoint?.status as string) || 'Unknown',
      },
      name: (task.name as string) || 'Unknown',
      status: status as DeploymentTask['status'],
      createdBy: (task.createdBy as string) || 'System',
      lastUpdated: (task.lastUpdated as string) || (task.updatedAt as string) || '',
      createdOn: (task.createdOn as string) || (task.createdAt as string) || '',
    };
  });

  const handleViewDeployment = (deployment: Deployment) => {
    setSelectedDeployment(deployment);
    setTasksSearchText('');
    setTasksFilter('All');
    setTasksModalVisible(true);
  };

  const getActionMenuItems = (deployment: Deployment): MenuProps['items'] => [
    { key: 'view', label: 'View Details', icon: <EyeOutlined />, onClick: () => handleViewDeployment(deployment) },
  ];

  const columns: ColumnsType<Deployment> = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: 'ID', dataIndex: 'deploymentId', key: 'deploymentId' },
    { title: 'Type', dataIndex: 'type', key: 'type', render: (type: string) => <Tag color={type === 'INSTALL' ? 'blue' : 'red'}>{type}</Tag>,
      filters: [{ text: 'INSTALL', value: 'INSTALL' }, { text: 'ROLLBACK', value: 'ROLLBACK' }], onFilter: (value, record) => record.type === value },
    { title: 'Status', dataIndex: 'status', key: 'status',
      render: (status: string) => {
        const colors: Record<string, string> = { INSTALLED: 'blue', COMPLETED: 'green', IN_PROGRESS: 'orange', FAILED: 'red' };
        return <Tag color={colors[status] || 'default'}>{status}</Tag>;
      },
      filters: [{ text: 'INSTALLED', value: 'INSTALLED' }, { text: 'COMPLETED', value: 'COMPLETED' }, { text: 'IN_PROGRESS', value: 'IN_PROGRESS' }, { text: 'FAILED', value: 'FAILED' }],
      onFilter: (value, record) => record.status === value },
    { title: 'Pending', dataIndex: 'pending', key: 'pending', align: 'center', width: 100 },
    { title: 'Succeeded', dataIndex: 'succeeded', key: 'succeeded', align: 'center', width: 120 },
    { title: 'Failed', dataIndex: 'failed', key: 'failed', align: 'center', width: 100 },
    { title: 'Created by', dataIndex: 'createdBy', key: 'createdBy', width: 120 },
    { title: 'Created on', dataIndex: 'createdOn', key: 'createdOn', width: 150 },
    { title: '', key: 'action', width: 60, fixed: 'right', render: (_, record) => (
      <Dropdown menu={{ items: getActionMenuItems(record) }} trigger={['click']}><Button type="text" icon={<MoreOutlined />} /></Dropdown>) },
  ];

  const filteredDeployments = deployments.filter((d) => {
    const matchesSearch = d.name.toLowerCase().includes(searchText.toLowerCase()) || d.deploymentId.toLowerCase().includes(searchText.toLowerCase());
    if (!matchesSearch) return false;
    if (activeFilters.type && !activeFilters.type.includes(d.type)) return false;
    if (activeFilters.status && !activeFilters.status.includes(d.status)) return false;
    return true;
  });

  const handleCreateDeployment = async () => {
    if (currentStep === 0) {
      try { await form.validateFields(['name', 'description', 'type', 'schedule', 'targetGroups']); setCurrentStep(1); } catch { /* validation failed */ }
    } else {
      const values = form.getFieldsValue();
      setPreviewData({ ...values, selectedPatches: patches.filter(p => selectedPatches.includes(p.id)) });
      setPreviewModalVisible(true);
    }
  };

  const handleConfirmDeployment = async () => {
    try {
      const values = form.getFieldsValue();
      await createDeploymentMutation.mutateAsync({ ...values, patches: selectedPatches });
      message.success('Deployment created successfully');
      setCreateModalVisible(false);
      setPreviewModalVisible(false);
      setCurrentStep(0);
      setSelectedPatches([]);
      form.resetFields();
    } catch { message.error('Failed to create deployment'); }
  };

  const closeCreateModal = () => { setCreateModalVisible(false); setCurrentStep(0); setSelectedPatches([]); form.resetFields(); };
  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length;

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Patch Deployed</Title>
          <Text type="secondary" style={{ fontSize: 14 }}>Track deployment status of applied patches</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>Create</Button>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <Space>
          <Input placeholder="Search" prefix={<SearchOutlined />} style={{ width: 320 }} value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          <Button icon={<FilterOutlined />} onClick={() => setFilterModalVisible(true)}>
            Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Button>
          {activeFilterCount > 0 && <Button type="link" size="small" onClick={() => { filterForm.resetFields(); setActiveFilters({}); }}>Clear filters</Button>}
        </Space>
      </div>

      <DataTable
        size="middle"
        columns={columns} data={filteredDeployments} rowKey="id" loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (total) => `Total ${total} assets found` }}
        scroll={{ x: 1200 }} style={{ marginBottom: '16px' }} />

      <CreateDeploymentModal open={createModalVisible} form={form} currentStep={currentStep}
        patches={patches} selectedPatches={selectedPatches} groups={groups}
        onStepChange={setCurrentStep} onSelectedPatchesChange={setSelectedPatches}
        onNext={handleCreateDeployment} onCancel={closeCreateModal} />

      <PreviewDeploymentModal open={previewModalVisible} previewData={previewData}
        onConfirm={handleConfirmDeployment} onCancel={() => setPreviewModalVisible(false)} />

      <DeploymentTasksModal open={tasksModalVisible} tasks={tasks} loading={tasksLoading}
        searchText={tasksSearchText} filter={tasksFilter}
        onSearchChange={setTasksSearchText} onFilterChange={setTasksFilter}
        onRefresh={() => refetchTasks()} onClose={() => { setTasksModalVisible(false); setTasksSearchText(''); setTasksFilter('All'); }} />

      {/* Filter Modal */}
      <Modal title="Filter Deployments" open={filterModalVisible} onCancel={() => setFilterModalVisible(false)} width={500}
        footer={[
          <Button key="reset" onClick={() => { filterForm.resetFields(); setActiveFilters({}); setFilterModalVisible(false); }}>Reset</Button>,
          <Button key="cancel" onClick={() => setFilterModalVisible(false)}>Cancel</Button>,
          <Button key="apply" type="primary" onClick={() => {
            const values = filterForm.getFieldsValue();
            setActiveFilters({ type: values.type?.length ? values.type : undefined, status: values.status?.length ? values.status : undefined });
            setFilterModalVisible(false);
          }}>Apply Filters</Button>,
        ]}
      >
        <Form form={filterForm} layout="vertical">
          <Form.Item name="type" label="Deployment Type">
            <Select mode="multiple" placeholder="Select types" allowClear>
              <Option value="INSTALL">Install</Option><Option value="ROLLBACK">Rollback</Option>
            </Select>
          </Form.Item>
          <Form.Item name="status" label="Status">
            <Select mode="multiple" placeholder="Select statuses" allowClear>
              <Option value="INSTALLED">Installed</Option><Option value="COMPLETED">Completed</Option>
              <Option value="IN_PROGRESS">In Progress</Option><Option value="FAILED">Failed</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
