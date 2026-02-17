import { useState } from 'react';
import { SearchOutlined, DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, DownloadOutlined, FilterOutlined } from '@ant-design/icons';
import { App, Input, Button, Typography, Modal, Form, Space, Tooltip, Switch } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ConfirmModal } from '../../components/shared/ConfirmModal';
import { DataTable } from '../../components/shared/DataTable';
import { FormModal } from '../../components/shared/FormModal';
import { useModal } from '../../hooks/useModal';
import { useOrganizations, useCreateOrganization, useUpdateOrganization, useDeleteOrganization } from '../../hooks/useSettings';
import { ColumnFilterModal } from './components/ColumnFilterModal';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface Organization { id: string; name: string; description?: string; createdAt?: string; isDefault?: boolean; }
interface FilterState { showId: boolean; showName: boolean; showDescription: boolean; }

const DEFAULT_FILTERS: FilterState = { showId: true, showName: true, showDescription: true };
const FILTER_COLUMNS = [
  { key: 'showId', label: 'Show ID' }, { key: 'showName', label: 'Show Name' }, { key: 'showDescription', label: 'Show Description' },
];

export const Organization = () => {
  const { message } = App.useApp();
  const { data: rawOrganizations, isLoading: loading, refetch } = useOrganizations();
  const createOrgMutation = useCreateOrganization();
  const updateOrgMutation = useUpdateOrganization();
  const deleteOrgMutation = useDeleteOrganization();
  const createEditModal = useModal<Organization>();
  const deleteModal = useModal<Organization>();

  const [searchText, setSearchText] = useState('');
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [isViewModalEditing, setIsViewModalEditing] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [viewingOrg, setViewingOrg] = useState<Organization | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [form] = Form.useForm();
  const [viewForm] = Form.useForm();
  const [filterForm] = Form.useForm();
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });

  const organizations = (() => {
    const data = Array.isArray(rawOrganizations)
      ? rawOrganizations.map((org: Record<string, unknown>, index: number) => ({
          ...org, id: (org.id as string) || String(index), name: org.name as string,
          description: org.description as string | undefined, createdAt: org.createdAt as string | undefined,
          isDefault: (org.isDefault as boolean) ?? false }))
      : [];
    data.sort((a: Organization, b: Organization) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return a.name.localeCompare(b.name);
    });
    return data;
  })();

  const handleViewOrganization = (org: Organization) => {
    setViewingOrg(org); setIsViewModalEditing(false);
    viewForm.setFieldsValue({ name: org.name, description: org.description, isDefault: org.isDefault ?? false });
    setViewModalVisible(true);
  };

  const handleViewModalSave = async () => {
    try {
      const values = await viewForm.validateFields();
      if (viewingOrg) { await updateOrgMutation.mutateAsync({ id: viewingOrg.id, data: values }); message.success('Organization updated successfully'); setViewModalVisible(false); setIsViewModalEditing(false); viewForm.resetFields(); }
    } catch { message.error('Failed to update organization'); }
  };

  const handleViewModalCancel = () => {
    setIsViewModalEditing(false);
    viewForm.setFieldsValue({ name: viewingOrg?.name, description: viewingOrg?.description, isDefault: viewingOrg?.isDefault ?? false });
  };

  const handleDelete = (org: Organization) => { if (org.isDefault) { message.error('Cannot delete the global organization'); return; } deleteModal.onOpen(org); };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.selectedItem) return;
    try { await deleteOrgMutation.mutateAsync(deleteModal.selectedItem.id); message.success('Organization deleted successfully'); deleteModal.onClose(); }
    catch { message.error('Failed to delete organization'); }
  };

  const handleFormSubmit = async (values: Record<string, unknown>) => {
    try {
      if (createEditModal.selectedItem) { await updateOrgMutation.mutateAsync({ id: createEditModal.selectedItem.id, data: values }); message.success('Organization updated successfully'); }
      else { await createOrgMutation.mutateAsync(values); message.success('Organization created successfully'); }
      createEditModal.onClose();
    } catch { message.error(`Failed to ${createEditModal.selectedItem ? 'update' : 'create'} organization`); }
  };

  const handleApplyFilters = () => {
    const v = filterForm.getFieldsValue();
    setFilters(Object.fromEntries(Object.keys(DEFAULT_FILTERS).map(k => [k, v[k] !== undefined ? v[k] : true])) as FilterState);
    setPagination({ ...pagination, current: 1 }); setFilterModalVisible(false); message.success('Columns updated');
  };
  const handleResetFilters = () => { filterForm.resetFields(); setFilters(DEFAULT_FILTERS); setPagination({ ...pagination, current: 1 }); message.success('All columns shown'); };
  const handleOpenFilterModal = () => { filterForm.setFieldsValue(filters); setFilterModalVisible(true); };
  const hasHiddenColumns = Object.values(filters).some(v => !v);

  const handleExport = () => {
    const csv = [['ID', 'Name', 'Description', 'Created On'], ...filteredOrganizations.map((org) => [org.id, org.name, org.description || '', org.createdAt || ''])]
      .map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' }); const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'organizations.csv'; a.click(); window.URL.revokeObjectURL(url);
    message.success('Organizations exported successfully');
  };

  const allColumns: ColumnsType<Organization> = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80, sorter: (a, b) => (parseInt(a.id) || 0) - (parseInt(b.id) || 0) },
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text: string, record: Organization) => <a href="#" onClick={(e) => { e.preventDefault(); handleViewOrganization(record); }}>{text}</a> },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true, render: (text: string) => text || '—' },
    { title: 'Created On', dataIndex: 'createdAt', key: 'createdAt',
      render: (text: string) => text ? new Date(text).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : '—' },
    { title: 'Actions', key: 'actions', width: 100, align: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit"><Button type="text" size="small" icon={<EditOutlined />} onClick={() => createEditModal.onOpen(record)} /></Tooltip>
          <Tooltip title={record.isDefault ? 'Cannot delete default organization' : 'Delete'}>
            <Button type="text" size="small" danger icon={<DeleteOutlined />} disabled={record.isDefault} onClick={() => handleDelete(record)} />
          </Tooltip>
        </Space>
      ) },
  ];

  const columns = allColumns.filter((col) => {
    if (col.key === 'id') return filters.showId; if (col.key === 'name') return filters.showName;
    if (col.key === 'description') return filters.showDescription; return true;
  });

  const filteredOrganizations = organizations.filter((org) => {
    if (!searchText) return true; const s = searchText.toLowerCase();
    return org.id.toLowerCase().includes(s) || org.name.toLowerCase().includes(s) || (org.description && org.description.toLowerCase().includes(s));
  });
  const paginatedData = filteredOrganizations.slice((pagination.current - 1) * pagination.pageSize, pagination.current * pagination.pageSize);
  const editingOrg = createEditModal.selectedItem;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '32px' }}><Title level={2}>Organization</Title></div>

      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Input placeholder="Search by name or description" prefix={<SearchOutlined />} style={{ flex: 1, maxWidth: '400px' }} value={searchText}
          onChange={(e) => { setSearchText(e.target.value); setPagination({ ...pagination, current: 1 }); }} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <Tooltip title="Refresh"><Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={loading} /></Tooltip>
          <Tooltip title="Export"><Button icon={<DownloadOutlined />} onClick={handleExport} disabled={organizations.length === 0} /></Tooltip>
          <Tooltip title={hasHiddenColumns ? `${Object.values(filters).filter(v => v).length} filter(s) active` : 'Filter'}>
            <Button icon={<FilterOutlined />} onClick={handleOpenFilterModal} type={hasHiddenColumns ? 'primary' : 'default'} />
          </Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => createEditModal.onOpen()}>Create</Button>
        </div>
      </div>

      <DataTable size="middle" columns={columns} data={paginatedData} rowKey="id" loading={loading}
        pagination={{ pageSize: pagination.pageSize, current: pagination.current, total: filteredOrganizations.length,
          onChange: (page, pageSize) => setPagination({ current: page, pageSize }), showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `showing ${range[0]}-${range[1]} of ${total} items` }}
        style={{ marginBottom: '24px' }} />

      <FormModal title={editingOrg ? 'Edit Organization' : 'Create Organization'} open={createEditModal.open} onClose={createEditModal.onClose}
        onSubmit={handleFormSubmit} loading={createOrgMutation.isPending || updateOrgMutation.isPending}
        initialValues={editingOrg ? { name: editingOrg.name, description: editingOrg.description, isDefault: editingOrg.isDefault ?? false } : undefined}
        okText={editingOrg ? 'Update Organization' : 'Create Organization'} form={form}>
        <Form.Item label="Organization Name" name="name" rules={[{ required: true, message: 'Please enter organization name' }, { min: 2, message: 'Name must be at least 2 characters' }]}>
          <Input placeholder="Enter organization name" disabled={editingOrg?.isDefault} />
        </Form.Item>
        <Form.Item label="Description" name="description"><TextArea rows={4} placeholder="Enter organization description (optional)" disabled={editingOrg?.isDefault} /></Form.Item>
        <Form.Item label="Set as Default" name="isDefault" valuePropName="checked"><Switch disabled={editingOrg?.isDefault} /></Form.Item>
        {editingOrg?.isDefault && <Text type="warning">Note: The default organization cannot be modified.</Text>}
      </FormModal>

      <ConfirmModal title="Delete Organization" description={`Are you sure you want to delete "${deleteModal.selectedItem?.name}"?`}
        open={deleteModal.open} onConfirm={handleDeleteConfirm} onCancel={deleteModal.onClose} loading={deleteOrgMutation.isPending} confirmText="Delete" danger />

      <Modal title="Organization Details" open={viewModalVisible}
        onCancel={() => { setViewModalVisible(false); setViewingOrg(null); setIsViewModalEditing(false); viewForm.resetFields(); }}
        footer={[
          <Button key="close-or-cancel" onClick={() => { if (isViewModalEditing) handleViewModalCancel(); else { setViewModalVisible(false); setViewingOrg(null); viewForm.resetFields(); } }}>
            {isViewModalEditing ? 'Cancel' : 'Close'}
          </Button>,
          !isViewModalEditing && <Button key="edit" type="primary" onClick={() => setIsViewModalEditing(true)} disabled={viewingOrg?.isDefault}>Edit</Button>,
          isViewModalEditing && <Button key="save" type="primary" onClick={handleViewModalSave}>Save</Button>,
        ]} width={600}>
        {viewingOrg && (
          <Form form={viewForm} layout="vertical" style={{ marginTop: '24px' }}>
            <Form.Item label="Organization Name" name="name" rules={[{ required: true, message: 'Please enter organization name' }, { min: 2, message: 'Name must be at least 2 characters' }]}>
              <Input placeholder="Enter organization name" disabled={!isViewModalEditing || viewingOrg.isDefault} />
            </Form.Item>
            <Form.Item label="Description" name="description"><TextArea placeholder="Enter organization description (optional)" disabled={!isViewModalEditing || viewingOrg.isDefault} rows={4} /></Form.Item>
            <Form.Item label="Set as Default" name="isDefault" valuePropName="checked"><Switch disabled={!isViewModalEditing || viewingOrg.isDefault} /></Form.Item>
            {viewingOrg.isDefault && <Text type="warning">Note: The default organization cannot be modified.</Text>}
          </Form>
        )}
      </Modal>

      <ColumnFilterModal open={filterModalVisible} form={filterForm} columns={FILTER_COLUMNS}
        onApply={handleApplyFilters} onReset={handleResetFilters} onClose={() => setFilterModalVisible(false)} />
    </div>
  );
};
