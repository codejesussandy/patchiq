import { useState } from 'react';
import { SearchOutlined, MoreOutlined, SafetyOutlined } from '@ant-design/icons';
import { App, Input, Button, Dropdown, Typography, Modal, Form, Select, Space } from 'antd';
import type { MenuProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ConfirmModal } from '../../components/shared/ConfirmModal';
import { DataTable } from '../../components/shared/DataTable';
import { useModal } from '../../hooks/useModal';
import { useRoles, useCreateRole, useUpdateRole, useDeleteRole } from '../../hooks/useSettings';
import type { Role, RoleFormData, Permission } from '../../types/settings.types';
import { isFormValidationError } from '../../utils/error';
import { PermissionsGrid, PERMISSION_MODULES } from './components/PermissionsGrid';

const { Title, Text } = Typography;
const { TextArea } = Input;

export const RolesAndPrivileges = () => {
  const { message } = App.useApp();
  const { data: roles = [], isLoading: loading } = useRoles();
  const createRoleMutation = useCreateRole();
  const updateRoleMutation = useUpdateRole();
  const deleteRoleMutation = useDeleteRole();
  const deleteModal = useModal<Role>();
  const [searchText, setSearchText] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [form] = Form.useForm();

  const handleCreateRole = () => {
    setEditingRole(null); form.resetFields();
    setPermissions(PERMISSION_MODULES.map((m) => ({ module: m.key, actions: [] })));
    setModalVisible(true);
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    form.setFieldsValue({ name: role.name, description: role.description, branch: role.branch });
    setPermissions(role.permissions); setModalVisible(true);
  };

  const handleDelete = (role: Role) => {
    if (role.isSystem) { message.error('Cannot delete system roles'); return; }
    deleteModal.onOpen(role);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.selectedItem) return;
    try { await deleteRoleMutation.mutateAsync(deleteModal.selectedItem.id); message.success(`${deleteModal.selectedItem.name} deleted successfully`); deleteModal.onClose(); }
    catch { message.error('Failed to delete role'); }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const roleData: RoleFormData = { ...values, permissions };
      if (editingRole) { await updateRoleMutation.mutateAsync({ id: editingRole.id, data: roleData }); message.success('Role updated successfully'); }
      else { await createRoleMutation.mutateAsync(roleData); message.success('Role created successfully'); }
      setModalVisible(false); form.resetFields();
    } catch (error: unknown) {
      if (isFormValidationError(error)) message.error('Please fill in all required fields');
      else message.error(`Failed to ${editingRole ? 'update' : 'create'} role`);
    }
  };

  const getActionMenuItems = (role: Role): MenuProps['items'] => [
    { key: 'view', label: 'View', onClick: () => message.info(`Viewing details for ${role.name}`) },
    { key: 'edit', label: 'Edit', onClick: () => handleEdit(role) },
    { type: 'divider' },
    { key: 'delete', label: 'Delete Role', danger: true, disabled: role.isSystem, onClick: () => handleDelete(role) },
  ];

  const columns: ColumnsType<Role> = [
    { title: 'Role', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name: string, record: Role) => <Space><span>{name}</span>{record.isSystem && <Text type="secondary">(System)</Text>}</Space> },
    { title: 'Users', dataIndex: 'users', key: 'users' },
    { title: 'Branch', dataIndex: 'branch', key: 'branch' },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: '', key: 'action', width: 50,
      render: (_, record) => <Dropdown menu={{ items: getActionMenuItems(record) }} trigger={['click']}><Button type="text" icon={<MoreOutlined />} /></Dropdown> },
  ];

  const filteredRoles = roles.filter((role) => {
    const matchesSearch = role.name.toLowerCase().includes(searchText.toLowerCase());
    const matchesBranch = branchFilter === 'all' || role.branch === branchFilter;
    return matchesSearch && matchesBranch;
  });

  const branches = Array.from(new Set(roles.map((r) => r.branch)));

  return (
    <div>
      <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Select value={branchFilter} onChange={setBranchFilter} style={{ width: 180 }}
          options={[{ value: 'all', label: 'All Branches' }, ...branches.map((b) => ({ value: b, label: b }))]} />
        <Input placeholder="Search" prefix={<SearchOutlined />} style={{ width: 280 }} value={searchText} onChange={(e) => setSearchText(e.target.value)} />
        <div style={{ marginLeft: 'auto' }}>
          <Button type="primary" icon={<SafetyOutlined />} onClick={handleCreateRole}>Create New Role</Button>
        </div>
      </div>

      <DataTable size="middle" columns={columns} data={filteredRoles} rowKey="id" loading={loading} pagination={false} style={{ marginBottom: '16px' }} />
      <Text type="secondary">Total {filteredRoles.length} Role{filteredRoles.length !== 1 ? 's' : ''} Found</Text>

      <ConfirmModal title="Delete Role" description={`Are you sure you want to delete ${deleteModal.selectedItem?.name}? This will affect ${deleteModal.selectedItem?.users} user(s).`}
        open={deleteModal.open} onConfirm={handleDeleteConfirm} onCancel={deleteModal.onClose} loading={deleteRoleMutation.isPending} confirmText="Delete" danger />

      <Modal title={<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><SafetyOutlined style={{ color: '#1890ff' }} /><span>{editingRole ? 'Edit' : 'Create New'} Role</span></div>}
        open={modalVisible} onCancel={() => { setModalVisible(false); form.resetFields(); }} width={900}
        footer={[
          <Button key="cancel" onClick={() => { setModalVisible(false); form.resetFields(); }}>Close</Button>,
          <Button key="submit" type="primary" onClick={handleSubmit}>{editingRole ? 'Update' : 'Create'} Role</Button>,
        ]}>
        <Form form={form} layout="vertical" style={{ marginTop: '24px' }}>
          <div style={{ marginBottom: '24px' }}>
            <Title level={5} style={{ marginBottom: '16px' }}>General Details</Title>
            <Form.Item label="Role Name" name="name" rules={[{ required: true, message: 'Please enter role name' }]}>
              <Input placeholder="Enter role name" disabled={editingRole?.isSystem} />
            </Form.Item>
            {!editingRole && (
              <Form.Item label="Select Pre-Existing Template (Optional)" name="template">
                <Select placeholder="Select template" options={[{ value: 'admin', label: 'Admin Template' }, { value: 'manager', label: 'Manager Template' }, { value: 'employee', label: 'Employee Template' }]} allowClear />
              </Form.Item>
            )}
            <Form.Item label="Description" name="description" rules={[{ required: true, message: 'Please enter description' }]}>
              <TextArea rows={3} placeholder="Enter description" />
            </Form.Item>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <Title level={5} style={{ marginBottom: '16px' }}>Assign to Branch</Title>
            <Form.Item label="Select Branch" name="branch" rules={[{ required: true, message: 'Please select a branch' }]}>
              <Select placeholder="Select Branch" options={[{ value: 'Gurugram', label: 'Gurugram (Default)' }, { value: 'Delhi', label: 'Delhi' }, { value: 'Mumbai', label: 'Mumbai' }]} />
            </Form.Item>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <Title level={5} style={{ marginBottom: '16px' }}>Permissions</Title>
            <PermissionsGrid permissions={permissions} onPermissionsChange={setPermissions} />
            <Text type="secondary" style={{ fontSize: '16px', marginTop: '12px', display: 'block' }}>
              Select the permissions that users with this role will have access to.
            </Text>
          </div>
        </Form>
      </Modal>
    </div>
  );
};
