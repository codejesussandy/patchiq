import { useState } from 'react';
import { SearchOutlined, PlusOutlined, MoreOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { App, Input, Button, Dropdown, Space, Typography, Modal, Tag, Empty, Form } from 'antd';
import type { MenuProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DataTable } from '../../components/shared/DataTable';
import { useSoftwareInventory, useAssets } from '../../hooks/useAssets';
import { useZeroTouchConfigs, useCreateZeroTouchConfig, useUpdateZeroTouchConfig, useDeleteZeroTouchConfig } from '../../hooks/usePatches';
import { useComputerGroups } from '../../hooks/useSettings';
import { type ZeroTouchConfig } from '../../services/patch.service';
import { ViewConfigModal } from './components/ViewConfigModal';
import { ZeroTouchConfigForm } from './components/ZeroTouchConfigForm';

const { Title, Text } = Typography;

export const ZeroTouchDeployment = () => {
  const { message } = App.useApp();
  const { data: configs = [], isLoading: loading } = useZeroTouchConfigs();
  const createConfigMutation = useCreateZeroTouchConfig();
  const updateConfigMutation = useUpdateZeroTouchConfig();
  const deleteConfigMutation = useDeleteZeroTouchConfig();
  const [searchText, setSearchText] = useState('');

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ZeroTouchConfig | null>(null);
  const [editForm] = Form.useForm();
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [viewingConfig, setViewingConfig] = useState<ZeroTouchConfig | null>(null);

  const { data: applications = [] } = useSoftwareInventory();
  const { data: computers = [] } = useAssets();
  const { data: groups = [] } = useComputerGroups();

  const handleCreateConfig = async () => {
    try {
      const values = await form.validateFields();
      await createConfigMutation.mutateAsync(values);
      message.success('Configuration created successfully');
      setCreateModalVisible(false);
      form.resetFields();
    } catch { message.error('Failed to create configuration'); }
  };

  const handleUpdateConfig = async () => {
    try {
      const values = await editForm.validateFields();
      if (editingConfig) {
        await updateConfigMutation.mutateAsync({ id: editingConfig.id, config: values });
        message.success('Configuration updated successfully');
        setEditModalVisible(false);
        editForm.resetFields();
        setEditingConfig(null);
      }
    } catch { message.error('Failed to update configuration'); }
  };

  const getActionMenuItems = (config: ZeroTouchConfig): MenuProps['items'] => [
    { key: 'view', label: 'View Details', icon: <EyeOutlined />, onClick: () => { setViewingConfig(config); setViewModalVisible(true); } },
    { key: 'edit', label: 'Edit', icon: <EditOutlined />, onClick: () => { setEditingConfig(config); editForm.setFieldsValue(config); setEditModalVisible(true); } },
    { type: 'divider' },
    { key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true, onClick: () => {
      Modal.confirm({
        title: 'Delete Configuration', content: `Are you sure you want to delete ${config.name}?`,
        okText: 'Delete', okType: 'danger',
        onOk: async () => {
          try { await deleteConfigMutation.mutateAsync(config.id); message.success('Configuration deleted successfully'); }
          catch { message.error('Failed to delete configuration'); }
        },
      });
    }},
  ];

  const columns: ColumnsType<ZeroTouchConfig> = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    { title: 'Application Type', dataIndex: 'applicationType', key: 'applicationType', render: (type: string) => <Tag color="blue">{type}</Tag> },
    { title: 'Scope', dataIndex: 'scope', key: 'scope', render: (scope: string) => <Tag color="green">{scope.replace(/_/g, ' ')}</Tag> },
    { title: 'Auto Deploy', key: 'autoDeploy', render: (_, record) => <Tag color="cyan">{record.autoDeploymentRules.severity.length} Severity Levels</Tag> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => {
      const colors: Record<string, string> = { ACTIVE: 'green', INACTIVE: 'default', PAUSED: 'orange' };
      return <Tag color={colors[status] || 'default'}>{status}</Tag>;
    }},
    { title: 'Created by', dataIndex: 'createdBy', key: 'createdBy', width: 120 },
    { title: 'Created on', dataIndex: 'createdOn', key: 'createdOn', width: 150 },
    { title: '', key: 'action', width: 60, fixed: 'right', render: (_, record) => (
      <Dropdown menu={{ items: getActionMenuItems(record) }} trigger={['click']}><Button type="text" icon={<MoreOutlined />} /></Dropdown>) },
  ];

  const filteredConfigs = configs.filter((c) => c.name.toLowerCase().includes(searchText.toLowerCase()));

  const header = (
    <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Title level={3} style={{ margin: 0 }}>Zero Touch Deployment</Title>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>Create</Button>
    </div>
  );

  const modals = (
    <>
      <Modal title="Create Zero Touch Configuration" open={createModalVisible}
        onCancel={() => { setCreateModalVisible(false); form.resetFields(); }}
        onOk={handleCreateConfig} okText="Create Configuration" width={800}>
        <ZeroTouchConfigForm form={form} applications={applications} computers={computers} groups={groups} />
      </Modal>
      <Modal title="Edit Zero Touch Configuration" open={editModalVisible}
        onCancel={() => { setEditModalVisible(false); editForm.resetFields(); setEditingConfig(null); }}
        onOk={handleUpdateConfig} okText="Update Configuration" width={800}>
        <ZeroTouchConfigForm form={editForm} applications={applications} computers={computers} groups={groups} />
      </Modal>
      <ViewConfigModal open={viewModalVisible} config={viewingConfig}
        onClose={() => { setViewModalVisible(false); setViewingConfig(null); }} />
    </>
  );

  if (!loading && configs.length === 0) {
    return (
      <div>
        {header}
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <Empty description={
            <Space direction="vertical" size="large">
              <Text style={{ fontSize: 16, color: '#8c8c8c' }}>No zero-touch configurations set up yet</Text>
              <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => setCreateModalVisible(true)}>Create Configuration</Button>
            </Space>
          } />
        </div>
        {modals}
      </div>
    );
  }

  return (
    <div>
      {header}
      <div style={{ marginBottom: '16px' }}>
        <Input placeholder="Search configurations" prefix={<SearchOutlined />} style={{ width: 320 }} value={searchText} onChange={(e) => setSearchText(e.target.value)} />
      </div>
      <DataTable columns={columns} data={filteredConfigs} rowKey="id" loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (total) => `Total ${total} configurations found` }}
        scroll={{ x: 1200 }} />
      {modals}
    </div>
  );
};
