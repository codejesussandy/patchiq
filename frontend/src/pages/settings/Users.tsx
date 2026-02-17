import { useState } from 'react';
import {
  SearchOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  DownloadOutlined,
  FilterOutlined,
  ImportOutlined,
} from '@ant-design/icons';
import {
  App,
  Input,
  Button,
  Typography,
  Space,
  Tooltip,
  Form,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ConfirmModal } from '../../components/shared/ConfirmModal';
import { DataTable } from '../../components/shared/DataTable';
import { useModal } from '../../hooks/useModal';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, useOrganizations, useDepartments, useRoles, useBranches } from '../../hooks/useSettings';
import { ColumnFilterModal } from './components/ColumnFilterModal';
import { UserFormModal } from './components/UserFormModal';
import { UserImportModal } from './components/UserImportModal';

const { Title } = Typography;

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  createdAt?: string;
  password?: string;
  timezone?: string;
  organizationId?: string;
  organizationName?: string;
  departmentId?: string;
  departmentName?: string;
  branchId?: string;
  branchName?: string;
  roleId?: string;
  roleName?: string;
  loginAllowed?: boolean;
  endpointAssignmentAllowed?: boolean;
  avatar?: string;
  status?: string;
  isSuperAdmin?: boolean;
  isSystem?: boolean;
}

interface FilterState {
  showId: boolean;
  showName: boolean;
  showEmail: boolean;
  showPhone: boolean;
  showOrganization: boolean;
  showRole: boolean;
  showBranch: boolean;
  showDepartment: boolean;
}

const FILTER_COLUMNS = [
  { key: 'showId', label: 'Show ID' },
  { key: 'showName', label: 'Show Name' },
  { key: 'showEmail', label: 'Show Email' },
  { key: 'showPhone', label: 'Show Phone' },
  { key: 'showOrganization', label: 'Show Organization' },
  { key: 'showRole', label: 'Show Role' },
  { key: 'showBranch', label: 'Show Branch/Location' },
  { key: 'showDepartment', label: 'Show Department' },
];

export const Users = () => {
  const { message } = App.useApp();
  const { data: rawUsers, isLoading: loading, refetch } = useUsers();
  const { data: rawOrganizations } = useOrganizations();
  const { data: rawDepartments } = useDepartments();
  const { data: rawRoles } = useRoles();
  const { data: rawBranches } = useBranches();
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();
  const deleteModal = useModal<User>();
  const [searchText, setSearchText] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'view' | 'edit' | 'create'>('view');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);

  const users: User[] = Array.isArray(rawUsers)
    ? rawUsers.map((user: Record<string, unknown>, index: number) => ({
        ...user,
        id: (user.id as string) || String(index) } as User))
    : [];
  const organizations = Array.isArray(rawOrganizations) ? rawOrganizations : [];
  const departments = Array.isArray(rawDepartments) ? rawDepartments : [];
  const roles = Array.isArray(rawRoles) ? rawRoles : [];
  const branches = Array.isArray(rawBranches) ? rawBranches : [];

  const [filters, setFilters] = useState<FilterState>({
    showId: true, showName: true, showEmail: true, showPhone: false,
    showOrganization: true, showRole: true, showBranch: true, showDepartment: true,
  });
  const [drawerForm] = Form.useForm();
  const [filterForm] = Form.useForm();
  const [pagination, setPagination] = useState({ pageSize: 20, current: 1 });

  const handleCreateUser = () => {
    setEditingUser(null);
    setDrawerMode('create');
    drawerForm.resetFields();
    setUploadedFile(null);
    setDrawerVisible(true);
  };

  const handleEditUser = (user: User) => {
    if (user.isSuperAdmin || user.isSystem) {
      message.warning('Super Admin user cannot be edited by non-super admin users');
      return;
    }
    setEditingUser(user);
    setDrawerMode('edit');
    drawerForm.setFieldsValue({
      firstName: user.firstName, lastName: user.lastName, email: user.email,
      phone: user.phone || '', timezone: user.timezone || undefined,
      organizationId: user.organizationId || undefined, departmentId: user.departmentId || undefined,
      branchId: user.branchId || undefined, roleId: user.roleId || undefined,
      loginAllowed: user.loginAllowed ?? true, endpointAssignmentAllowed: user.endpointAssignmentAllowed ?? true,
    });
    setUploadedFile(null);
    setDrawerVisible(true);
  };

  const handleViewUser = (user: User) => {
    setEditingUser(user);
    setDrawerMode('view');
    drawerForm.setFieldsValue({
      firstName: user.firstName, lastName: user.lastName, email: user.email,
      phone: user.phone || '', timezone: user.timezone || undefined,
      organizationId: user.organizationId || undefined, departmentId: user.departmentId || undefined,
      branchId: user.branchId || undefined, roleId: user.roleId || undefined,
      loginAllowed: user.loginAllowed ?? true, endpointAssignmentAllowed: user.endpointAssignmentAllowed ?? true,
    });
    setUploadedFile(null);
    setDrawerVisible(true);
  };

  const handleDrawerClose = () => {
    setDrawerVisible(false);
    setEditingUser(null);
    drawerForm.resetFields();
    setUploadedFile(null);
  };

  const handleDelete = (user: User) => {
    if (user.isSuperAdmin || user.isSystem) { message.error('Super Admin user cannot be deleted'); return; }
    deleteModal.onOpen(user);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.selectedItem) return;
    try {
      await deleteUserMutation.mutateAsync(deleteModal.selectedItem.id);
      message.success('User deleted successfully');
      deleteModal.onClose();
    } catch { message.error('Failed to delete user'); }
  };

  const handleDrawerSubmit = async () => {
    try {
      const values = await drawerForm.validateFields();
      if (uploadedFile) values.avatar = uploadedFile.name;
      if (editingUser && drawerMode === 'edit') {
        await updateUserMutation.mutateAsync({ id: editingUser.id, data: values });
        message.success('User updated successfully');
      } else if (drawerMode === 'create') {
        await createUserMutation.mutateAsync(values);
        message.success('User created successfully');
      }
      handleDrawerClose();
    } catch { message.error(`Failed to ${editingUser && drawerMode === 'edit' ? 'update' : 'create'} user`); }
  };

  const handleOpenFilterModal = () => {
    filterForm.setFieldsValue(filters);
    setFilterModalVisible(true);
  };

  const handleApplyFilters = () => {
    const values = filterForm.getFieldsValue();
    const newFilters = {} as FilterState;
    for (const key of Object.keys(filters) as (keyof FilterState)[]) {
      newFilters[key] = values[key] !== undefined ? values[key] : true;
    }
    setFilters(newFilters);
    setPagination({ ...pagination, current: 1 });
    setFilterModalVisible(false);
    message.success('Columns updated');
  };

  const handleResetFilters = () => {
    filterForm.resetFields();
    setFilters({ showId: true, showName: true, showEmail: true, showPhone: false, showOrganization: true, showRole: true, showBranch: true, showDepartment: true });
    setPagination({ ...pagination, current: 1 });
    message.success('Columns reset to default');
  };

  const hasHiddenColumns = Object.values(filters).some(v => !v);

  const handleExport = () => {
    const csvContent = [
      ['ID', 'Name', 'Email', 'Phone', 'Organization', 'Role', 'Branch/Location', 'Department', 'Created On'],
      ...filteredUsers.map((user) => [user.id, `${user.firstName} ${user.lastName}`, user.email, user.phone || '', user.organizationName || '', user.roleName || '', user.branchName || '', user.departmentName || '', user.createdAt || '']),
    ].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'users.csv'; link.click();
    window.URL.revokeObjectURL(url);
    message.success('Users exported successfully');
  };

  const handleDownloadSampleCSV = () => {
    const headers = ['firstName', 'lastName', 'email', 'phone', 'timezone', 'organization', 'department', 'role'];
    const blob = new Blob([headers.join(',')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'sample_user.csv'; link.click();
    window.URL.revokeObjectURL(url);
    message.success('Sample CSV downloaded');
  };

  const getNameDisplay = (user: User) => {
    const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
    const colors = ['#ff7a45', '#ffc069', '#1890ff', '#52c41a', '#722ed1'];
    const color = colors[parseInt(user.id) % colors.length];
    return (
      <Space>
        <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '12px' }}>
          {initials}
        </div>
        <span>{`${user.firstName} ${user.lastName}`}</span>
      </Space>
    );
  };

  const allColumns: ColumnsType<User> = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60, sorter: (a, b) => (parseInt(a.id) || 0) - (parseInt(b.id) || 0) },
    { title: 'Name', dataIndex: 'firstName', key: 'name', sorter: (a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`), render: (_, record: User) => (<a href="#" onClick={(e) => { e.preventDefault(); handleViewUser(record); }} style={{ color: '#1890ff' }}>{getNameDisplay(record)}</a>) },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone', render: (text: string) => text || '\u2014' },
    { title: 'Organization', dataIndex: 'organizationName', key: 'organization', render: (text: string) => text || '\u2014' },
    { title: 'Role', dataIndex: 'roleName', key: 'role', render: (text: string) => text || '\u2014' },
    { title: 'Branch/Location', dataIndex: 'branchName', key: 'branch', render: (text: string) => text || '\u2014' },
    { title: 'Department', dataIndex: 'departmentName', key: 'department', render: (text: string) => text || '\u2014' },
    { title: 'Created On', dataIndex: 'createdAt', key: 'createdAt', render: (text: string) => {
      if (!text) return '\u2014';
      const date = new Date(text);
      const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0'); const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0'); const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
      const displayHours = String(date.getHours() % 12 || 12).padStart(2, '0');
      return `${year}/${month}/${day} ${displayHours}:${minutes}:${seconds} ${ampm}`;
    }},
    { title: 'Actions', key: 'actions', width: 100, align: 'right', render: (_, record) => (
      <Space>
        <Tooltip title={record.isSuperAdmin || record.isSystem ? 'Cannot edit Super Admin user' : 'Edit'}>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEditUser(record)} disabled={record.isSuperAdmin || record.isSystem} />
        </Tooltip>
        <Tooltip title={record.isSuperAdmin || record.isSystem ? 'Cannot delete Super Admin user' : 'Delete'}>
          <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} disabled={record.isSuperAdmin || record.isSystem} />
        </Tooltip>
      </Space>
    )},
  ];

  const columns = allColumns.filter((col) => {
    const key = col.key as string;
    if (key === 'id') return filters.showId;
    if (key === 'name') return filters.showName;
    if (key === 'email') return filters.showEmail;
    if (key === 'phone') return filters.showPhone;
    if (key === 'organization') return filters.showOrganization;
    if (key === 'role') return filters.showRole;
    if (key === 'branch') return filters.showBranch;
    if (key === 'department') return filters.showDepartment;
    return true;
  });

  const filteredUsers = users.filter((user) => {
    if (!searchText) return true;
    const s = searchText.toLowerCase();
    return user.id.toLowerCase().includes(s) || `${user.firstName} ${user.lastName}`.toLowerCase().includes(s) || user.email.toLowerCase().includes(s) || (user.phone && user.phone.toLowerCase().includes(s)) || (user.organizationName && user.organizationName.toLowerCase().includes(s)) || (user.roleName && user.roleName.toLowerCase().includes(s)) || (user.branchName && user.branchName.toLowerCase().includes(s)) || (user.departmentName && user.departmentName.toLowerCase().includes(s));
  });

  const paginatedData = filteredUsers.slice((pagination.current! - 1) * pagination.pageSize!, pagination.current! * pagination.pageSize!);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '32px' }}><Title level={2}>Users</Title></div>

      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Input placeholder="Search by name, email, phone, organization, role, branch, or department" prefix={<SearchOutlined />} style={{ flex: 1, maxWidth: '400px' }} value={searchText} onChange={(e) => { setSearchText(e.target.value); setPagination({ ...pagination, current: 1 }); }} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <Tooltip title="Refresh"><Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={loading} /></Tooltip>
          <Tooltip title="Export"><Button icon={<DownloadOutlined />} onClick={handleExport} disabled={users.length === 0} /></Tooltip>
          <Tooltip title="Import"><Button icon={<ImportOutlined />} onClick={() => { setImportModalVisible(true); setImportFile(null); }} /></Tooltip>
          <Tooltip title={hasHiddenColumns ? `${Object.values(filters).filter(v => v).length} filter(s) active` : 'Filter'}><Button icon={<FilterOutlined />} onClick={handleOpenFilterModal} type={hasHiddenColumns ? 'primary' : 'default'} /></Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateUser}>Create</Button>
        </div>
      </div>

      <DataTable size="middle" columns={columns} data={paginatedData} rowKey="id" loading={loading} pagination={{ pageSize: pagination.pageSize, current: pagination.current, total: filteredUsers.length, onChange: (page, pageSize) => setPagination({ current: page, pageSize }), showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], showTotal: (total, range) => `showing ${range[0]}\u2013${range[1]} of ${total} items` }} style={{ marginBottom: '24px' }} />

      <UserFormModal open={drawerVisible} mode={drawerMode} editingUser={editingUser} form={drawerForm} organizations={organizations} departments={departments} roles={roles} branches={branches} onClose={handleDrawerClose} onSubmit={handleDrawerSubmit} onSwitchToEdit={() => setDrawerMode('edit')} onFileChange={(file) => setUploadedFile(file as File | null)} />

      <ConfirmModal title="Delete User" description={`Are you sure you want to delete "${deleteModal.selectedItem?.firstName} ${deleteModal.selectedItem?.lastName}"?`} open={deleteModal.open} onConfirm={handleDeleteConfirm} onCancel={deleteModal.onClose} loading={deleteUserMutation.isPending} confirmText="Delete" danger />

      <ColumnFilterModal open={filterModalVisible} form={filterForm} columns={FILTER_COLUMNS} onApply={handleApplyFilters} onReset={handleResetFilters} onClose={() => setFilterModalVisible(false)} />

      <UserImportModal open={importModalVisible} loading={loading} importFile={importFile} onClose={() => { setImportModalVisible(false); setImportFile(null); }} onImportFile={(file: File) => { setImportFile(file); return false; }} onRemoveFile={() => setImportFile(null)} onSubmit={() => { message.info('Import functionality pending'); }} onReset={() => setImportFile(null)} onDownloadSample={handleDownloadSampleCSV} />
    </div>
  );
};
