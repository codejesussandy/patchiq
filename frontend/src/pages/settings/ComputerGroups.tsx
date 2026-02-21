import { useState } from 'react';
import {
  SearchOutlined, DeleteOutlined, EditOutlined, PlusOutlined,
  ReloadOutlined, DownloadOutlined, FilterOutlined, FolderOutlined,
} from '@ant-design/icons';
import {
  App, Input, Button, Typography, Space, Tooltip, Spin, Form,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ConfirmModal } from '../../components/shared/ConfirmModal';
import { DataTable } from '../../components/shared/DataTable';
import { useModal } from '../../hooks/useModal';
import { useComputerGroups, useAvailableEndpoints, useCreateComputerGroup, useUpdateComputerGroup, useDeleteComputerGroup } from '../../hooks/useSettings';
import type { ComputerGroup } from '../../types/settings.types';
import { sanitizeInput } from '../../utils/sanitize';
import { ColumnFilterModal } from './components/ColumnFilterModal';
import { ComputerGroupFormModal } from './components/ComputerGroupFormModal';

const { Title, Text } = Typography;

interface FilterState { showName: boolean; showDescription: boolean; showEndpoints: boolean }

const COLUMN_FILTER_CONFIG = [
  { key: 'showName', label: 'Name' },
  { key: 'showDescription', label: 'Description' },
  { key: 'showEndpoints', label: 'Endpoints' },
];

const formatDate = (dateString: string) => {
  if (!dateString) return '\u2014';
  const date = new Date(dateString);
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
};

export const ComputerGroups = () => {
  const { message } = App.useApp();
  const { data: rawGroups, isLoading: loading, refetch: refetchGroups } = useComputerGroups();
  const { data: rawEndpoints, isLoading: endpointsLoading } = useAvailableEndpoints();
  const createGroupMutation = useCreateComputerGroup();
  const updateGroupMutation = useUpdateComputerGroup();
  const deleteGroupMutation = useDeleteComputerGroup();
  const deleteModal = useModal<ComputerGroup>();
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ComputerGroup | null>(null);
  const [modalForm] = Form.useForm();
  const [filterForm] = Form.useForm();
  const [pagination, setPagination] = useState<{ pageSize: number; current: number }>({ pageSize: 20, current: 1 });
  const [filters, setFilters] = useState<FilterState>({ showName: true, showDescription: true, showEndpoints: true });

  const groups = Array.isArray(rawGroups) ? rawGroups.map((group: ComputerGroup, index: number) => ({ ...group, id: group.id || String(index) })) : [];
  const endpoints = Array.isArray(rawEndpoints) ? rawEndpoints : [];

  const handleCreateGroup = () => { setEditingGroup(null); setModalMode('create'); modalForm.resetFields(); setModalVisible(true); };

  const handleEditGroup = (group: ComputerGroup) => {
    setEditingGroup(group); setModalMode('edit');
    modalForm.setFieldsValue({ name: group.name, description: group.description, endpoints: group.endpoints });
    setModalVisible(true);
  };

  const handleViewGroup = (group: ComputerGroup) => {
    setEditingGroup(group); setModalMode('view');
    modalForm.setFieldsValue({ name: group.name, description: group.description, endpoints: group.endpoints });
    setModalVisible(true);
  };

  const handleModalClose = () => { setModalVisible(false); setEditingGroup(null); modalForm.resetFields(); };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.selectedItem) return;
    try { await deleteGroupMutation.mutateAsync(deleteModal.selectedItem.id); message.success('Computer group deleted successfully'); deleteModal.onClose(); }
    catch { message.error('Failed to delete computer group'); }
  };

  const handleModalSubmit = async () => {
    try {
      const values = await modalForm.validateFields();

      // Sanitize string fields to prevent XSS
      const sanitizedValues = {
        ...values,
        name: sanitizeInput(values.name),
        description: sanitizeInput(values.description),
      };

      if (editingGroup && modalMode === 'edit') { await updateGroupMutation.mutateAsync({ id: editingGroup.id, data: sanitizedValues }); message.success('Computer group updated successfully'); }
      else if (modalMode === 'create') { await createGroupMutation.mutateAsync(sanitizedValues); message.success('Computer group created successfully'); }
      handleModalClose();
    } catch { message.error(`Failed to ${editingGroup && modalMode === 'edit' ? 'update' : 'create'} computer group`); }
  };

  const handleApplyFilters = () => {
    const values = filterForm.getFieldsValue();
    setFilters({
      showName: values.showName !== undefined ? values.showName : true,
      showDescription: values.showDescription !== undefined ? values.showDescription : true,
      showEndpoints: values.showEndpoints !== undefined ? values.showEndpoints : true,
    });
    setPagination({ ...pagination, current: 1 });
    setFilterModalVisible(false);
    message.success('Columns updated');
  };

  const handleResetFilters = () => {
    filterForm.resetFields();
    setFilters({ showName: true, showDescription: true, showEndpoints: true });
    setPagination({ ...pagination, current: 1 });
    message.success('Columns reset to default');
  };

  const handleExport = () => {
    const csvContent = [
      ['Name', 'Description', 'Endpoint Count', 'Created By', 'Created At'],
      ...filteredGroups.map((group) => [group.name, group.description, String(group.endpointCount), group.createdBy, formatDate(group.createdAt)]),
    ].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = 'computer-groups.csv'; link.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredGroups = groups.filter((group) => {
    if (!searchText) return true;
    const s = searchText.toLowerCase();
    return group.name.toLowerCase().includes(s) || group.description.toLowerCase().includes(s);
  });

  const hasHiddenColumns = !filters.showName || !filters.showDescription || !filters.showEndpoints;

  const columns: ColumnsType<ComputerGroup> = [
    ...(filters.showName ? [{
      title: 'Name', dataIndex: 'name', key: 'name', width: 200,
      sorter: (a: ComputerGroup, b: ComputerGroup) => a.name.localeCompare(b.name),
      render: (_: unknown, record: ComputerGroup) => <a href="#" onClick={(e) => { e.preventDefault(); handleViewGroup(record); }}>{record.name}</a>,
    }] : []),
    ...(filters.showDescription ? [{ title: 'Description', dataIndex: 'description', key: 'description', render: (text: string) => text || '\u2014' }] : []),
    ...(filters.showEndpoints ? [{ title: 'Endpoints', dataIndex: 'endpointCount', key: 'endpointCount', width: 120, render: (count: number) => `${count} endpoint${count !== 1 ? 's' : ''}` }] : []),
    { title: 'Actions', key: 'actions', width: 100, align: 'right' as const,
      render: (_: unknown, record: ComputerGroup) => (
        <Space size="small">
          <Tooltip title="Edit"><Button type="text" icon={<EditOutlined />} onClick={() => handleEditGroup(record)} /></Tooltip>
          <Tooltip title="Delete"><Button type="text" danger icon={<DeleteOutlined />} onClick={() => deleteModal.onOpen(record)} /></Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Computer Groups</Title>
        <Text type="secondary" style={{ fontSize: 14 }}>Organize assets into logical groups</Text>
      </div>

      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Input placeholder="Search..." prefix={<SearchOutlined />} style={{ flex: 1, maxWidth: '400px' }} value={searchText} onChange={(e) => setSearchText(e.target.value)} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <Tooltip title="Refresh"><Button icon={<ReloadOutlined />} onClick={() => refetchGroups()} /></Tooltip>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>Export</Button>
          <Tooltip title={hasHiddenColumns ? 'Some columns are hidden' : 'Show/hide columns'}>
            <Button icon={<FilterOutlined />} onClick={() => { filterForm.setFieldsValue(filters); setFilterModalVisible(true); }} style={hasHiddenColumns ? { color: '#1890ff' } : {}} />
          </Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateGroup}>Create</Button>
        </div>
      </div>

      <Spin spinning={loading}>
        {filteredGroups.length === 0 && !loading ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', background: '#fafafa', borderRadius: '8px' }}>
            <FolderOutlined style={{ fontSize: '48px', color: '#bfbfbf', marginBottom: '16px', display: 'block' }} />
            <Typography.Text type="secondary">No computer groups found</Typography.Text>
          </div>
        ) : (
          <DataTable size="middle" columns={columns} data={filteredGroups} rowKey="id" pagination={pagination}
            onChange={(newPagination) => setPagination(newPagination as { pageSize: number; current: number })}
            style={{ background: '#fff', borderRadius: '8px' }} />
        )}
      </Spin>

      <ComputerGroupFormModal open={modalVisible} mode={modalMode} form={modalForm}
        endpoints={endpoints} endpointsLoading={endpointsLoading} editingGroup={editingGroup}
        formatDate={formatDate} onClose={handleModalClose} onSubmit={handleModalSubmit}
        onSwitchToEdit={() => setModalMode('edit')} />

      <ConfirmModal title="Delete Computer Group" description={`Are you sure you want to delete "${deleteModal.selectedItem?.name}"?`}
        open={deleteModal.open} onConfirm={handleDeleteConfirm} onCancel={deleteModal.onClose}
        loading={deleteGroupMutation.isPending} confirmText="Delete" danger />

      <ColumnFilterModal open={filterModalVisible} form={filterForm} columns={COLUMN_FILTER_CONFIG}
        onApply={handleApplyFilters} onReset={handleResetFilters} onClose={() => setFilterModalVisible(false)} />
    </div>
  );
};
