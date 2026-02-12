import { useState } from 'react';
import { CloseOutlined } from '@ant-design/icons';
import {
  App,
  Input,
  Button,
  Space,
  Tag,
  Typography,
  Modal,
  Form,
  Select,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DataTable } from '../../components/shared/DataTable';
import { useConfigDeployments, useConfigCatalog, useConfigBundles, useCreateConfigDeployment } from '../../hooks/useJobs';
import type { ConfigDeployment, ConfigCatalogItem, ConfigBundle } from '../../services/jobs.service';
import { JobToolbar, DeploymentStatusCell, TransferListPicker, exportToCsv } from './components';
import type { TransferItem } from './components';

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

type ConfigurationDeployedItem = {
  id: string;
  deploymentId: string;
  name: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'FAILED' | 'CANCELLED';
  pending: { current: number; total: number };
  succeeded: { current: number; total: number };
  failed: { current: number; total: number };
  createdBy: string;
  createdOn: string;
};

export const ConfigurationJobsDeployed = () => {
  const { message } = App.useApp();
  const [searchText, setSearchText] = useState('');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [selectionType, setSelectionType] = useState<'configuration' | 'bundle'>('configuration');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const { data: rawDeployments, isLoading: loading, refetch: refetchDeployments } = useConfigDeployments();
  const { data: rawConfigData, refetch: refetchConfigs } = useConfigCatalog();
  const { data: rawBundleData, refetch: refetchBundles } = useConfigBundles();
  const createDeploymentMutation = useCreateConfigDeployment();

  const deployedItems: ConfigurationDeployedItem[] = (rawDeployments || []).map((d: ConfigDeployment) => ({
    id: d.id,
    deploymentId: d.deploymentId || d.id,
    name: d.name,
    status: d.status || 'IN_PROGRESS',
    pending: { current: d.pending || 0, total: d.pending + d.succeeded + d.failed || 0 },
    succeeded: { current: d.succeeded || 0, total: d.pending + d.succeeded + d.failed || 0 },
    failed: { current: d.failed || 0, total: d.pending + d.succeeded + d.failed || 0 },
    createdBy: d.createdBy || 'System',
    createdOn: d.createdOn || d.createdAt || '',
  }));

  const configTransferItems: TransferItem[] = (rawConfigData || []).map((c: ConfigCatalogItem) => ({
    key: c.id,
    title: `${c.configurationId || c.id}: ${c.name}`,
    subtitle: `(${c.architecture || 'x64'})`,
    os: [c.os || 'Windows'],
  }));

  const bundleTransferItems: TransferItem[] = (rawBundleData || []).map((b: ConfigBundle) => ({
    key: b.id,
    title: `${b.bundleId || b.id}: ${b.bundleName || b.name}`,
    os: [b.os || 'Windows'],
  }));

  const handleCreate = () => {
    setCreateModalVisible(true);
    form.resetFields();
    setSelectedKeys([]);
    setSelectionType('configuration');
  };

  const handleCancel = () => {
    setCreateModalVisible(false);
    form.resetFields();
    setSelectedKeys([]);
  };

  const handleSubmit = async () => {
    try {
      await form.validateFields();
      const values = form.getFieldsValue();

      const apiData = {
        name: values.deploymentName,
        description: values.description || '',
        configurationIds: selectionType === 'configuration' ? selectedKeys : undefined,
        bundleIds: selectionType === 'bundle' ? selectedKeys : undefined,
        targetAgentIds: values.targetAgentIds || [],
      };

      createDeploymentMutation.mutate(apiData, {
        onSuccess: () => {
          handleCancel();
          message.success('Configuration deployment created successfully');
        },
        onError: () => message.error('Failed to create deployment'),
      });
    } catch {
      // form validation failed — ant design shows field errors
    }
  };

  const handleRefresh = async () => {
    await Promise.all([refetchDeployments(), refetchConfigs(), refetchBundles()]);
    message.success('Data refreshed successfully');
  };

  const handleExport = () => {
    exportToCsv(
      filteredItems.length > 0 ? filteredItems : deployedItems,
      [
        { header: 'ID', accessor: (i) => i.deploymentId },
        { header: 'Name', accessor: (i) => i.name },
        { header: 'Status', accessor: (i) => i.status },
        { header: 'Pending', accessor: (i) => `${i.pending.current}/${i.pending.total}` },
        { header: 'Succeeded', accessor: (i) => `${i.succeeded.current}/${i.succeeded.total}` },
        { header: 'Failed', accessor: (i) => `${i.failed.current}/${i.failed.total}` },
        { header: 'Created By', accessor: (i) => i.createdBy },
        { header: 'Created On', accessor: (i) => i.createdOn },
      ],
      'configuration_deployed_jobs',
      message,
    );
  };

  const columns: ColumnsType<ConfigurationDeployedItem> = [
    { title: 'ID', dataIndex: 'deploymentId', key: 'deploymentId', sorter: (a, b) => a.deploymentId.localeCompare(b.deploymentId) },
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    {
      title: 'Stage', dataIndex: 'status', key: 'status',
      sorter: (a, b) => a.status.localeCompare(b.status),
      render: (status: string) => {
        const colors: Record<string, string> = { COMPLETED: 'green', IN_PROGRESS: 'orange', INSTALLED: 'blue', FAILED: 'red' };
        return <Tag color={colors[status] || 'default'}>{status}</Tag>;
      },
      filters: [
        { text: 'COMPLETED', value: 'COMPLETED' },
        { text: 'IN_PROGRESS', value: 'IN_PROGRESS' },
        { text: 'INSTALLED', value: 'INSTALLED' },
        { text: 'FAILED', value: 'FAILED' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Pending', dataIndex: 'pending', key: 'pending', align: 'center',
      sorter: (a, b) => a.pending.current - b.pending.current,
      render: (pending: { current: number; total: number }) =>
        <DeploymentStatusCell current={pending.current} total={pending.total} backgroundColor="#fff7e6" />,
    },
    {
      title: 'Succeeded', dataIndex: 'succeeded', key: 'succeeded', align: 'center',
      sorter: (a, b) => a.succeeded.current - b.succeeded.current,
      render: (succeeded: { current: number; total: number }) =>
        <DeploymentStatusCell current={succeeded.current} total={succeeded.total} backgroundColor="#f6ffed" />,
    },
    {
      title: 'Failed', dataIndex: 'failed', key: 'failed', align: 'center',
      sorter: (a, b) => a.failed.current - b.failed.current,
      render: (failed: { current: number; total: number }) =>
        <DeploymentStatusCell current={failed.current} total={failed.total} backgroundColor="#fff1f0" />,
    },
    { title: 'Created By', dataIndex: 'createdBy', key: 'createdBy', sorter: (a, b) => a.createdBy.localeCompare(b.createdBy) },
    { title: 'Created On', dataIndex: 'createdOn', key: 'createdOn', sorter: (a, b) => new Date(a.createdOn).getTime() - new Date(b.createdOn).getTime() },
  ];

  const filteredItems = deployedItems.filter(
    item =>
      item.name.toLowerCase().includes(searchText.toLowerCase()) ||
      item.deploymentId.toLowerCase().includes(searchText.toLowerCase()) ||
      item.createdBy.toLowerCase().includes(searchText.toLowerCase())
  );

  const currentTransferItems = selectionType === 'configuration' ? configTransferItems : bundleTransferItems;

  return (
    <div>
      <JobToolbar
        searchText={searchText}
        onSearchChange={setSearchText}
        onRefresh={handleRefresh}
        onExport={handleExport}
        onCreate={handleCreate}
        loading={loading}
      />

      <DataTable
        columns={columns}
        data={filteredItems}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `showing ${range[0]}-${range[1]} of ${total} items`,
        }}
        scroll={{ x: 'max-content' }}
        locale={{
          emptyText: (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <Text type="secondary">No data</Text>
            </div>
          ),
        }}
      />

      <Modal
        title={
          <Space>
            <Button type="text" icon={<CloseOutlined />} onClick={handleCancel} style={{ marginLeft: -16, marginRight: -8 }} />
            <Text strong style={{ fontSize: 16 }}>Create Configuration Deployment</Text>
          </Space>
        }
        open={createModalVisible}
        onCancel={handleCancel}
        width={900}
        footer={[
          <Button key="reset" onClick={() => form.resetFields()}>Reset</Button>,
          <Button key="draft" onClick={handleCancel}>Save As Draft</Button>,
          <Button key="publish" type="primary" onClick={handleSubmit}>Publish</Button>,
        ]}
        closable={false}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="deploymentName"
            label={<span>Deployment Name <Text type="danger">*</Text></span>}
            rules={[{ required: true, message: 'Please enter deployment name' }]}
          >
            <Input placeholder="Name" />
          </Form.Item>

          <Form.Item
            name="description"
            label={<span>Description <Text type="danger">*</Text></span>}
            rules={[{ required: true, message: 'Please enter description' }]}
          >
            <TextArea rows={3} placeholder="Description" />
          </Form.Item>

          <Form.Item label="Selection Type">
            <Space>
              <Button type={selectionType === 'configuration' ? 'primary' : 'default'} onClick={() => setSelectionType('configuration')}>Configuration</Button>
              <Button type={selectionType === 'bundle' ? 'primary' : 'default'} onClick={() => setSelectionType('bundle')}>Configuration Bundle</Button>
            </Space>
          </Form.Item>

          <Form.Item
            name="scope"
            label={<span>Scope <Text type="danger">*</Text></span>}
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
            label={<span>Select Configurations <Text type="danger">*</Text></span>}
          >
            <TransferListPicker
              selectedKeys={selectedKeys}
              onSelectedKeysChange={setSelectedKeys}
              items={currentTransferItems}
            />
          </Form.Item>

          <Form.Item
            name="deploymentPolicy"
            label={<span>Deployment Policy <Text type="danger">*</Text></span>}
            rules={[{ required: true, message: 'Please select deployment policy' }]}
          >
            <Select placeholder="Please Select" style={{ width: '100%' }}>
              <Option value="policy1">Policy 1</Option>
              <Option value="policy2">Policy 2</Option>
            </Select>
          </Form.Item>

          <Form.Item name="retryCount" label={<span>Retry Count <Text type="danger">*</Text></span>} initialValue={1} rules={[{ required: true, message: 'Please enter retry count' }]}>
            <Input type="number" min={0} />
          </Form.Item>

          <Form.Item name="notifyTo" label={<span>Notify to <Text type="danger">*</Text></span>} rules={[{ required: true, message: 'Please select notify to' }]}>
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
