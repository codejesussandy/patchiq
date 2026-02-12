import { useState } from 'react';
import { SearchOutlined, DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, DownloadOutlined, FilterOutlined } from '@ant-design/icons';
import { App, Input, Button, Typography, Modal, Form, Space, Tooltip, Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ConfirmModal } from '../../components/shared/ConfirmModal';
import { DataTable } from '../../components/shared/DataTable';
import { useModal } from '../../hooks/useModal';
import { useSettingsDeploymentPolicies, useCreateSettingsDeploymentPolicy, useUpdateSettingsDeploymentPolicy, useDeleteSettingsDeploymentPolicy } from '../../hooks/useSettings';
import type { DeploymentPolicy } from '../../types/settings.types';
import { ColumnFilterModal } from './components/ColumnFilterModal';

const { Title } = Typography;

interface FilterState { showId: boolean; showName: boolean; showDescription: boolean; showType: boolean; }
const DEFAULT_FILTERS: FilterState = { showId: true, showName: true, showDescription: true, showType: true };
const FILTER_COLUMNS = [
  { key: 'showId', label: 'Show ID' }, { key: 'showName', label: 'Show Name' },
  { key: 'showDescription', label: 'Show Description' }, { key: 'showType', label: 'Show Type' },
];

const formatDate = (text: string) => {
  if (!text) return '—';
  try { const d = new Date(text); return isNaN(d.getTime()) ? text : `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`; }
  catch { return text; }
};

export const DeploymentPolicies = () => {
  const { message } = App.useApp();
  const { data: rawPolicies, isLoading: loading, refetch } = useSettingsDeploymentPolicies();
  const createPolicyMutation = useCreateSettingsDeploymentPolicy();
  const updatePolicyMutation = useUpdateSettingsDeploymentPolicy();
  const deletePolicyMutation = useDeleteSettingsDeploymentPolicy();
  const deleteModal = useModal<DeploymentPolicy>();

  const [searchText, setSearchText] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'view' | 'edit' | 'create'>('view');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<DeploymentPolicy | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [drawerForm] = Form.useForm();
  const [filterForm] = Form.useForm();
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });

  const policies = Array.isArray(rawPolicies) ? rawPolicies.map((p: DeploymentPolicy, i: number) => ({ ...p, id: p.id || String(i) })) : [];

  const setFormFromPolicy = (policy: DeploymentPolicy) => {
    drawerForm.setFieldsValue({ name: policy.name, description: policy.description, type: policy.type, supportedModule: policy.supportedModule, relatedType: policy.relatedType });
  };

  const handleCreatePolicy = () => { setEditingPolicy(null); setDrawerMode('create'); drawerForm.resetFields(); setDrawerVisible(true); };
  const handleEditPolicy = (policy: DeploymentPolicy) => { setEditingPolicy(policy); setDrawerMode('edit'); setFormFromPolicy(policy); setDrawerVisible(true); };
  const handleViewPolicy = (policy: DeploymentPolicy) => { setEditingPolicy(policy); setDrawerMode('view'); setFormFromPolicy(policy); setDrawerVisible(true); };
  const handleDrawerClose = () => { setDrawerVisible(false); setEditingPolicy(null); drawerForm.resetFields(); };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.selectedItem) return;
    try { await deletePolicyMutation.mutateAsync(deleteModal.selectedItem.id); message.success('Job deleted successfully'); deleteModal.onClose(); }
    catch { message.error('Failed to delete job'); }
  };

  const handleDrawerSubmit = async () => {
    try {
      const values = await drawerForm.validateFields();
      if (editingPolicy && drawerMode === 'edit') { await updatePolicyMutation.mutateAsync({ id: editingPolicy.id, data: values }); message.success('Job updated successfully'); }
      else if (drawerMode === 'create') { await createPolicyMutation.mutateAsync(values); message.success('Job created successfully'); }
      handleDrawerClose();
    } catch { message.error(`Failed to ${editingPolicy && drawerMode === 'edit' ? 'update' : 'create'} job`); }
  };

  const handleApplyFilters = () => {
    const v = filterForm.getFieldsValue();
    setFilters(Object.fromEntries(Object.keys(DEFAULT_FILTERS).map(k => [k, v[k] !== undefined ? v[k] : true])) as FilterState);
    setPagination({ ...pagination, current: 1 }); setFilterModalVisible(false); message.success('Columns updated');
  };
  const handleResetFilters = () => { filterForm.resetFields(); setFilters(DEFAULT_FILTERS); setPagination({ ...pagination, current: 1 }); message.success('Columns reset to default'); };
  const handleOpenFilterModal = () => { filterForm.setFieldsValue(filters); setFilterModalVisible(true); };
  const hasHiddenColumns = Object.values(filters).some(v => !v);

  const handleExport = () => {
    const csv = [['ID', 'Name', 'Description', 'Type', 'Created By', 'Created On'], ...filteredPolicies.map((p) => [p.id, p.name, p.description, p.type, p.createdBy, p.createdAt])]
      .map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' }); const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'jobs.csv'; a.click(); window.URL.revokeObjectURL(url);
    message.success('Jobs exported successfully');
  };

  const allColumns: ColumnsType<DeploymentPolicy> = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 100, sorter: (a, b) => a.id.localeCompare(b.id) },
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name),
      render: (_, record: DeploymentPolicy) => <a href="#" onClick={(e) => { e.preventDefault(); handleViewPolicy(record); }} style={{ color: '#1890ff' }}>{record.name}</a> },
    { title: 'Description', dataIndex: 'description', key: 'description', render: (text: string) => text || '—' },
    { title: 'Type', dataIndex: 'type', key: 'type',
      render: (text: string) => <span style={{ backgroundColor: text === 'SCHEDULE' ? '#e6f7ff' : '#f6f8fb', color: text === 'SCHEDULE' ? '#1890ff' : '#666', padding: '4px 8px', borderRadius: '2px', fontSize: '12px' }}>{text}</span> },
    { title: 'Created By', dataIndex: 'createdBy', key: 'createdBy' },
    { title: 'Created On', dataIndex: 'createdAt', key: 'createdAt', render: (text: string) => formatDate(text) },
    { title: 'Actions', key: 'actions', width: 100, align: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit"><Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEditPolicy(record)} /></Tooltip>
          <Tooltip title="Delete"><Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => deleteModal.onOpen(record)} /></Tooltip>
        </Space>
      ) },
  ];

  const columns = allColumns.filter((col) => {
    if (col.key === 'id') return filters.showId; if (col.key === 'name') return filters.showName;
    if (col.key === 'description') return filters.showDescription; if (col.key === 'type') return filters.showType; return true;
  });

  const filteredPolicies = policies.filter((p) => {
    if (!searchText) return true; const s = searchText.toLowerCase();
    return p.id.toLowerCase().includes(s) || p.name.toLowerCase().includes(s) || p.description.toLowerCase().includes(s) || p.type.toLowerCase().includes(s) || p.createdBy.toLowerCase().includes(s);
  });
  const paginatedData = filteredPolicies.slice((pagination.current - 1) * pagination.pageSize, pagination.current * pagination.pageSize);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '32px' }}><Title level={2}>Jobs</Title></div>

      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Input placeholder="Search..." prefix={<SearchOutlined />} style={{ flex: 1, maxWidth: '400px' }} value={searchText}
          onChange={(e) => { setSearchText(e.target.value); setPagination({ ...pagination, current: 1 }); }} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <Tooltip title="Refresh"><Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={loading} /></Tooltip>
          <Tooltip title="Export"><Button icon={<DownloadOutlined />} onClick={handleExport} disabled={policies.length === 0} /></Tooltip>
          <Tooltip title={hasHiddenColumns ? `${Object.values(filters).filter(v => v).length} filter(s) active` : 'Filter'}>
            <Button icon={<FilterOutlined />} onClick={handleOpenFilterModal} type={hasHiddenColumns ? 'primary' : 'default'} />
          </Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreatePolicy}>Create</Button>
        </div>
      </div>

      <DataTable columns={columns} data={paginatedData} rowKey="id" loading={loading}
        pagination={{ pageSize: pagination.pageSize, current: pagination.current, total: filteredPolicies.length,
          onChange: (page, pageSize) => setPagination({ current: page, pageSize }), showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `showing ${range[0]}-${range[1]} of ${total} items` }}
        style={{ marginBottom: '24px' }} />

      <Modal title={drawerMode === 'create' ? 'Create Job' : drawerMode === 'edit' ? 'Edit Job' : 'View Job'} open={drawerVisible}
        onCancel={handleDrawerClose} width={600}
        footer={drawerMode !== 'view' ? [
          <Button key="cancel" onClick={handleDrawerClose}>Cancel</Button>,
          <Button key="submit" type="primary" onClick={handleDrawerSubmit}>{drawerMode === 'create' ? 'Create' : 'Update'} Job</Button>,
        ] : [
          <Button key="close" onClick={handleDrawerClose}>Close</Button>,
          <Button key="edit" type="primary" onClick={() => setDrawerMode('edit')}>Edit</Button>,
        ]}>
        <Form form={drawerForm} layout="vertical" autoComplete="off">
          <Form.Item label="Job Name" name="name" rules={[{ required: true, message: 'Please enter job name' }]}>
            <Input placeholder="Job Name" disabled={drawerMode === 'view'} />
          </Form.Item>
          <Form.Item label="Description" name="description" rules={[{ required: true, message: 'Please enter description' }]}>
            <Input.TextArea placeholder="Description" disabled={drawerMode === 'view'} rows={3} />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item label="Supported module" name="supportedModule" rules={[{ required: true, message: 'Please select module' }]}>
              <Select placeholder="Select Module" disabled={drawerMode === 'view'} options={[{ label: 'All', value: 'All' }, { label: 'Patch', value: 'Patch' }, { label: 'Update', value: 'Update' }, { label: 'Security', value: 'Security' }]} />
            </Form.Item>
            <Form.Item label="Type" name="type" rules={[{ required: true, message: 'Please select type' }]}>
              <Select placeholder="Select Type" disabled={drawerMode === 'view'} options={[{ label: 'Schedule', value: 'SCHEDULE' }, { label: 'Instant', value: 'INSTANT' }]} />
            </Form.Item>
          </div>
          <Form.Item label="Related Type" name="relatedType" rules={[{ required: true, message: 'Please select related type' }]}>
            <Select placeholder="Select Related Type" disabled={drawerMode === 'view'} options={[{ label: 'No Relation', value: 'No Relation' }, { label: 'Critical', value: 'Critical' }, { label: 'Important', value: 'Important' }, { label: 'Optional', value: 'Optional' }]} />
          </Form.Item>
        </Form>
      </Modal>

      <ConfirmModal title="Delete Job" description={`Are you sure you want to delete "${deleteModal.selectedItem?.name}"?`}
        open={deleteModal.open} onConfirm={handleDeleteConfirm} onCancel={deleteModal.onClose} loading={deletePolicyMutation.isPending} confirmText="Delete" danger />

      <ColumnFilterModal open={filterModalVisible} form={filterForm} columns={FILTER_COLUMNS}
        onApply={handleApplyFilters} onReset={handleResetFilters} onClose={() => setFilterModalVisible(false)} />
    </div>
  );
};
