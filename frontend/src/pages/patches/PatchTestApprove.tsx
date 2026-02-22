import { useState } from 'react';
import { SearchOutlined, PlusOutlined, MoreOutlined, CheckOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { App, Input, Button, Dropdown, Space, Typography, Modal, Tag, Empty, Form, Select } from 'antd';
import type { MenuProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ConfirmModal } from '../../components/shared/ConfirmModal';
import { DataTable } from '../../components/shared/DataTable';
import { useSoftwareInventory, useAssets } from '../../hooks/useAssets';
import { useModal } from '../../hooks/useModal';
import { usePatchTests, useCreatePatchTest, useApprovePatchTest, useDeletePatchTest } from '../../hooks/usePatches';
import { useComputerGroups } from '../../hooks/useSettings';
import { type PatchTest } from '../../services/patch.service';
import { PatchTestForm } from './components/PatchTestForm';
import { ViewTestModal } from './components/ViewTestModal';

const { Title, Text } = Typography;

export const PatchTestApprove = () => {
  const { message } = App.useApp();
  const { data: tests = [], isLoading: loading } = usePatchTests();
  const createTestMutation = useCreatePatchTest();
  const approveTestMutation = useApprovePatchTest();
  const deleteTestMutation = useDeletePatchTest();
  const deleteModal = useModal<PatchTest>();
  const [searchText, setSearchText] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('ALL');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [viewingTest, setViewingTest] = useState<PatchTest | null>(null);

  const { data: applications = [] } = useSoftwareInventory();
  const { data: computers = [] } = useAssets();
  const { data: groups = [] } = useComputerGroups();

  const handleCreateTest = async () => {
    try {
      const values = await form.validateFields();
      await createTestMutation.mutateAsync(values);
      message.success('Test created successfully');
      setCreateModalVisible(false);
      form.resetFields();
    } catch { message.error('Failed to create test'); }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.selectedItem) return;
    try {
      await deleteTestMutation.mutateAsync(deleteModal.selectedItem.id);
      message.success('Test deleted successfully');
      deleteModal.onClose();
    } catch { message.error('Failed to delete test'); }
  };

  const getActionMenuItems = (test: PatchTest): MenuProps['items'] => [
    { key: 'view', label: 'View Details', icon: <EyeOutlined />, onClick: () => { setViewingTest(test); setViewModalVisible(true); } },
    { key: 'approve', label: 'Approve', icon: <CheckOutlined />, onClick: async () => {
      try { await approveTestMutation.mutateAsync(test.id); message.success('Test approved successfully'); }
      catch { message.error('Failed to approve test'); }
    }},
    { type: 'divider' },
    { key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true, onClick: () => deleteModal.onOpen(test) },
  ];

  const columns: ColumnsType<PatchTest> = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    { title: 'Platform', dataIndex: 'platform', key: 'platform', render: (p: string) => <Tag color="purple">{p || 'ALL'}</Tag> },
    { title: 'Application Type', dataIndex: 'applicationType', key: 'applicationType', render: (type: string) => <Tag color="blue">{type}</Tag> },
    { title: 'Scope', dataIndex: 'scope', key: 'scope', render: (scope: string) => <Tag color="green">{scope.replace(/_/g, ' ')}</Tag> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => {
      const colors: Record<string, string> = { PENDING: 'orange', APPROVED: 'green', REJECTED: 'red', IN_PROGRESS: 'blue' };
      return <Tag color={colors[status] || 'default'}>{status}</Tag>;
    }},
    { title: 'Created by', dataIndex: 'createdBy', key: 'createdBy', width: 120 },
    { title: 'Created on', dataIndex: 'createdOn', key: 'createdOn', width: 150 },
    { title: '', key: 'action', width: 60, fixed: 'right', render: (_, record) => (
      <Dropdown menu={{ items: getActionMenuItems(record) }} trigger={['click']}><Button type="text" icon={<MoreOutlined />} /></Dropdown>) },
  ];

  const filteredTests = tests.filter((test) =>
    test.name.toLowerCase().includes(searchText.toLowerCase()) &&
    (platformFilter === 'ALL' || test.platform === platformFilter)
  );

  const header = (
    <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Title level={3} style={{ margin: 0 }}>Patch Test and Approve</Title>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>Create</Button>
    </div>
  );

  const modals = (
    <>
      <Modal title="Create Patch Test" open={createModalVisible} onCancel={() => { setCreateModalVisible(false); form.resetFields(); }}
        onOk={handleCreateTest} okText="Create Test" width={800}>
        <PatchTestForm form={form} applications={applications} computers={computers} groups={groups} />
      </Modal>
      <ConfirmModal title="Delete Test" description={`Are you sure you want to delete ${deleteModal.selectedItem?.name}?`}
        open={deleteModal.open} onConfirm={handleDeleteConfirm} onCancel={deleteModal.onClose}
        loading={deleteTestMutation.isPending} confirmText="Delete" danger />
      <ViewTestModal open={viewModalVisible} test={viewingTest} onClose={() => { setViewModalVisible(false); setViewingTest(null); }} />
    </>
  );

  if (!loading && tests.length === 0) {
    return (
      <div>
        {header}
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <Empty description={
            <Space direction="vertical" size="large">
              <Text style={{ fontSize: 16, color: '#8c8c8c' }}>No patch tests configured yet</Text>
              <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => setCreateModalVisible(true)}>Create Test</Button>
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
      <div style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
        <Input placeholder="Search tests" prefix={<SearchOutlined />} style={{ width: 320 }} value={searchText} onChange={(e) => setSearchText(e.target.value)} />
        <Select value={platformFilter} onChange={setPlatformFilter} style={{ width: 180 }}>
          <Select.Option value="ALL">All Platforms</Select.Option>
          <Select.Option value="WINDOWS">Windows</Select.Option>
          <Select.Option value="MACOS">MacOS</Select.Option>
          <Select.Option value="UBUNTU">Ubuntu</Select.Option>
          <Select.Option value="LINUX">Linux</Select.Option>
        </Select>
      </div>
      <DataTable columns={columns} data={filteredTests} rowKey="id" loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (total) => `Total ${total} tests found` }}
        scroll={{ x: 1200 }} />
      {modals}
    </div>
  );
};
