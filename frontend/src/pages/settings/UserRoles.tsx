import { useState } from 'react';
import {
  SearchOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  DownloadOutlined,
  FilterOutlined,
  CloseOutlined } from '@ant-design/icons';
import {
  App,
  Input,
  Button,
  Typography,
  Form,
  Space,
  Tooltip,
  Drawer,
  Select,
  Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ConfirmModal } from '../../components/shared/ConfirmModal';
import { DataTable } from '../../components/shared/DataTable';
import { useModal } from '../../hooks/useModal';
import { useRoles, useCreateRole, useUpdateRole, useDeleteRole, useOrganizations } from '../../hooks/useSettings';
import { ColumnFilterModal } from './components/ColumnFilterModal';
import { RoleCapabilitiesPicker } from './components/RoleCapabilitiesPicker';

const { Title } = Typography;
const { TextArea } = Input;

interface UserRole {
  id: string;
  name: string;
  description?: string;
  capabilities?: string[];
  createdAt?: string;
  isSystem?: boolean;
  organizationId?: string;
  organizationName?: string;
  usersCount?: number;
}

type DrawerMode = 'create' | 'edit' | 'view' | null;

const FILTER_COLUMNS = [
  { key: 'showId', label: 'Show ID' },
  { key: 'showName', label: 'Show Role' },
  { key: 'showUsersCount', label: 'Show Users' },
  { key: 'showOrganization', label: 'Show Organization' },
  { key: 'showDescription', label: 'Show Description' },
];

interface FilterState {
  showId: boolean;
  showName: boolean;
  showDescription: boolean;
  showOrganization: boolean;
  showUsersCount: boolean;
}

const DEFAULT_FILTERS: FilterState = { showId: true, showName: true, showDescription: true, showOrganization: true, showUsersCount: true };

export const UserRoles = () => {
  const { message } = App.useApp();
  const { data: rawRoles = [], isLoading: loading, refetch } = useRoles();
  const { data: rawOrganizations = [] } = useOrganizations();
  const createRoleMutation = useCreateRole();
  const updateRoleMutation = useUpdateRole();
  const deleteRoleMutation = useDeleteRole();
  const deleteModal = useModal<UserRole>();

  const roles: UserRole[] = Array.isArray(rawRoles)
    ? rawRoles.map((role: Record<string, unknown>, index: number) => ({
        ...role,
        id: (role.id as string) || String(index),
        usersCount: (role.usersCount as number) ?? (role.users as number) ?? 0,
      })) as UserRole[]
    : [];
  const organizations = Array.isArray(rawOrganizations) ? rawOrganizations : [];

  const [searchText, setSearchText] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);
  const [viewingRole, setViewingRole] = useState<UserRole | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [form] = Form.useForm();
  const [filterForm] = Form.useForm();
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);
  const [pagination, setPagination] = useState({ pageSize: 20, current: 1 });

  const closeDrawer = () => {
    setDrawerVisible(false);
    setDrawerMode(null);
    setEditingRole(null);
    setViewingRole(null);
    setSelectedCapabilities([]);
    form.resetFields();
  };

  const handleCreate = () => { setEditingRole(null); setViewingRole(null); setDrawerMode('create'); setSelectedCapabilities([]); form.resetFields(); setDrawerVisible(true); };

  const handleEdit = (role: UserRole) => {
    setEditingRole(role); setViewingRole(null); setDrawerMode('edit'); setSelectedCapabilities(role.capabilities || []);
    form.setFieldsValue({ name: role.name, description: role.description, organizationId: role.organizationId || undefined }); setDrawerVisible(true);
  };

  const handleViewRole = (role: UserRole) => {
    setViewingRole(role); setEditingRole(null); setDrawerMode('view'); setSelectedCapabilities(role.capabilities || []);
    form.setFieldsValue({ name: role.name, description: role.description, organizationId: role.organizationId || undefined }); setDrawerVisible(true);
  };

  const handleDelete = (role: UserRole) => { if (role.isSystem) { message.error('Cannot delete system roles'); return; } deleteModal.onOpen(role); };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.selectedItem) return;
    try { await deleteRoleMutation.mutateAsync(deleteModal.selectedItem.id); message.success('Role deleted successfully'); deleteModal.onClose(); }
    catch { message.error('Failed to delete role'); }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const roleData = { ...values, capabilities: selectedCapabilities };
      if (editingRole) { await updateRoleMutation.mutateAsync({ id: editingRole.id, data: roleData }); message.success('Role updated successfully'); }
      else { await createRoleMutation.mutateAsync(roleData); message.success('Role created successfully'); }
      closeDrawer();
    } catch { message.error(`Failed to ${editingRole ? 'update' : 'create'} role`); }
  };

  const handleReset = () => {
    if (editingRole) { form.setFieldsValue({ name: editingRole.name, description: editingRole.description, organizationId: editingRole.organizationId || undefined }); }
    else { form.resetFields(); }
  };

  const handleApplyFilters = () => {
    const values = filterForm.getFieldsValue();
    setFilters({
      showId: values.showId !== undefined ? values.showId : true, showName: values.showName !== undefined ? values.showName : true,
      showDescription: values.showDescription !== undefined ? values.showDescription : true, showOrganization: values.showOrganization !== undefined ? values.showOrganization : true,
      showUsersCount: values.showUsersCount !== undefined ? values.showUsersCount : true,
    });
    setPagination({ ...pagination, current: 1 }); setFilterModalVisible(false); message.success('Columns updated');
  };

  const handleResetFilters = () => { filterForm.resetFields(); setFilters(DEFAULT_FILTERS); setPagination({ ...pagination, current: 1 }); message.success('All columns shown'); };

  const handleOpenFilterModal = () => { filterForm.setFieldsValue(filters); setFilterModalVisible(true); };

  const hasHiddenColumns = Object.values(filters).some(v => !v);

  const handleExport = () => {
    const csvContent = [
      ['ID', 'Name', 'Description', 'Organization', 'Users', 'Created On'],
      ...filteredRoles.map((role) => [role.id, role.name, role.description || '', role.organizationName || '', String(role.usersCount || 0), role.createdAt || '']),
    ].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'user-roles.csv'; link.click();
    window.URL.revokeObjectURL(url); message.success('Roles exported successfully');
  };

  const allColumns: ColumnsType<UserRole> = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80, sorter: (a, b) => (parseInt(a.id) || 0) - (parseInt(b.id) || 0) },
    { title: 'Role', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text: string, record: UserRole) => <a href="#" onClick={(e) => { e.preventDefault(); handleViewRole(record); }}>{text}</a> },
    { title: 'Users', dataIndex: 'usersCount', key: 'usersCount', width: 100, render: (count: number) => <Tag color="blue">{count || 0}</Tag> },
    { title: 'Organization', dataIndex: 'organizationName', key: 'organization', render: (text: string) => text || '—' },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true, render: (text: string) => text || '—' },
    { title: 'Created On', dataIndex: 'createdAt', key: 'createdAt',
      render: (text: string) => text ? new Date(text).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : '—' },
    { title: 'Actions', key: 'actions', width: 100, align: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit"><Button type="text" size="small" icon={<EditOutlined style={{ color: '#1890ff' }} />} onClick={() => handleEdit(record)} disabled={record.isSystem} /></Tooltip>
          <Tooltip title={record.isSystem ? 'Cannot delete system role' : 'Delete'}>
            <Button type="text" size="small" danger icon={<DeleteOutlined />} disabled={record.isSystem} onClick={() => handleDelete(record)} />
          </Tooltip>
        </Space>
      ) },
  ];

  const columns = allColumns.filter((col) => {
    if (col.key === 'id') return filters.showId;
    if (col.key === 'name') return filters.showName;
    if (col.key === 'description') return filters.showDescription;
    if (col.key === 'organization') return filters.showOrganization;
    if (col.key === 'usersCount') return filters.showUsersCount;
    return true;
  });

  const filteredRoles = roles.filter((role) => {
    if (!searchText) return true;
    const s = searchText.toLowerCase();
    return role.id.toLowerCase().includes(s) || role.name.toLowerCase().includes(s) || (role.description && role.description.toLowerCase().includes(s)) || (role.organizationName && role.organizationName.toLowerCase().includes(s));
  });

  const paginatedData = filteredRoles.slice((pagination.current! - 1) * pagination.pageSize!, pagination.current! * pagination.pageSize!);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '32px' }}><Title level={2}>User Roles</Title></div>

      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Input placeholder="Search..." prefix={<SearchOutlined />} style={{ flex: 1, maxWidth: '400px' }} value={searchText}
          onChange={(e) => { setSearchText(e.target.value); setPagination({ ...pagination, current: 1 }); }} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <Tooltip title="Refresh"><Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={loading} /></Tooltip>
          <Tooltip title="Export"><Button icon={<DownloadOutlined />} onClick={handleExport} disabled={roles.length === 0} /></Tooltip>
          <Tooltip title={hasHiddenColumns ? `${Object.values(filters).filter(v => v).length} filter(s) active` : 'Filter'}>
            <Button icon={<FilterOutlined />} onClick={handleOpenFilterModal} type={hasHiddenColumns ? 'primary' : 'default'} />
          </Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>Create</Button>
        </div>
      </div>

      <DataTable size="middle" columns={columns} data={paginatedData} rowKey="id" loading={loading}
        pagination={{ pageSize: pagination.pageSize, current: pagination.current, total: filteredRoles.length,
          onChange: (page, pageSize) => setPagination({ current: page, pageSize }), showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `showing ${range[0]}–${range[1]} of ${total} items` }}
        style={{ marginBottom: '24px' }} />

      <Drawer
        title={drawerMode === 'create' ? 'Create New Role' : drawerMode === 'edit' ? 'Edit Role' : 'View Role'}
        placement="right" onClose={closeDrawer} open={drawerVisible} closable closeIcon={<CloseOutlined />}
        styles={{ wrapper: { width: 800 } }}
        footer={drawerMode === 'view' ? null : [
          <Button key="reset" onClick={() => { handleReset(); setSelectedCapabilities(editingRole?.capabilities || []); }}>Reset</Button>,
          <Button key="cancel" onClick={closeDrawer}>Cancel</Button>,
          <Button key="submit" type="primary" onClick={handleSubmit}>{drawerMode === 'create' ? 'Create' : 'Update'}</Button>,
        ]}
      >
        <Form form={form} layout="vertical" style={{ marginTop: '24px' }}>
          <Form.Item label={<span>Name {drawerMode !== 'view' && <span style={{ color: 'red' }}>*</span>}</span>} name="name"
            rules={drawerMode === 'view' ? [] : [{ required: true, message: 'Please enter role name' }, { min: 2, message: 'Name must be at least 2 characters' }]}>
            <Input placeholder="Enter role name" disabled={drawerMode === 'view'} />
          </Form.Item>
          <Form.Item label={<span>Organization {drawerMode !== 'view' && <span style={{ color: 'red' }}>*</span>}</span>} name="organizationId"
            rules={drawerMode === 'view' ? [] : [{ required: true, message: 'Please select an organization' }]}>
            <Select placeholder="Select Organization" disabled={drawerMode === 'view'} options={organizations.map((org) => ({ label: org.name, value: org.id }))} />
          </Form.Item>
          <Form.Item label={<span>Description {drawerMode !== 'view' && <span style={{ color: 'red' }}>*</span>}</span>} name="description"
            rules={drawerMode === 'view' ? [] : [{ required: true, message: 'Please enter description' }]}>
            <TextArea rows={4} placeholder="Enter role description" disabled={drawerMode === 'view'} />
          </Form.Item>
          <Form.Item label="Permissions">
            <RoleCapabilitiesPicker selectedCapabilities={selectedCapabilities} onCapabilitiesChange={setSelectedCapabilities} disabled={drawerMode === 'view'} />
          </Form.Item>
        </Form>
        {drawerMode === 'view' && (
          <div style={{ marginTop: '24px' }}>
            <Button type="primary" block onClick={() => { if (viewingRole) { setDrawerMode('edit'); setEditingRole(viewingRole); setViewingRole(null); } }}>Edit</Button>
          </div>
        )}
      </Drawer>

      <ConfirmModal title="Delete Role" description={`Are you sure you want to delete "${deleteModal.selectedItem?.name}"?`}
        open={deleteModal.open} onConfirm={handleDeleteConfirm} onCancel={deleteModal.onClose} loading={deleteRoleMutation.isPending} confirmText="Delete" danger />

      <ColumnFilterModal open={filterModalVisible} form={filterForm} columns={FILTER_COLUMNS}
        onApply={handleApplyFilters} onReset={handleResetFilters} onClose={() => setFilterModalVisible(false)} />
    </div>
  );
};
