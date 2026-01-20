import { useState, useEffect } from 'react';
import {
  Table,
  Input,
  Button,
  Dropdown,
  Typography,
  Modal,
  Form,
  message,
  Select,
  Checkbox,
  Space,
} from 'antd';
import {
  SearchOutlined,
  MoreOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import { settingsService } from '../../services/settings.service';
import type { Role, RoleFormData, Permission } from '../../types/settings.types';

const { Title, Text } = Typography;
const { TextArea } = Input;

// Permission modules and actions configuration
const PERMISSION_MODULES = [
  { key: 'patches', label: 'Patches' },
  { key: 'assets', label: 'Assets' },
  { key: 'discovery', label: 'Discovery' },
  { key: 'reports', label: 'Reports' },
  { key: 'settings', label: 'Settings' },
];

const PERMISSION_ACTIONS = ['view', 'add', 'edit', 'delete'];

export const RolesAndPrivileges = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const data = await settingsService.getRoles();
      setRoles(data);
    } catch (error) {
      message.error('Failed to fetch roles');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = () => {
    setEditingRole(null);
    form.resetFields();
    // Initialize with no permissions
    const initialPermissions: Permission[] = PERMISSION_MODULES.map((module) => ({
      module: module.key,
      actions: [],
    }));
    setPermissions(initialPermissions);
    setModalVisible(true);
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    form.setFieldsValue({
      name: role.name,
      description: role.description,
      branch: role.branch,
    });
    setPermissions(role.permissions);
    setModalVisible(true);
  };

  const handleView = (role: Role) => {
    message.info(`Viewing details for ${role.name}`);
  };

  const handleDelete = (role: Role) => {
    if (role.isSystem) {
      message.error('Cannot delete system roles');
      return;
    }

    Modal.confirm({
      title: 'Delete Role',
      content: `Are you sure you want to delete ${role.name}? This will affect ${role.users} user(s).`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await settingsService.deleteRole(role.id);
          message.success(`${role.name} deleted successfully`);
          fetchRoles();
        } catch (error) {
          message.error('Failed to delete role');
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const roleData: RoleFormData = {
        ...values,
        permissions,
      };

      if (editingRole) {
        await settingsService.updateRole(editingRole.id, roleData);
        message.success('Role updated successfully');
      } else {
        await settingsService.createRole(roleData);
        message.success('Role created successfully');
      }

      setModalVisible(false);
      form.resetFields();
      fetchRoles();
    } catch (error: any) {
      if (error.errorFields) {
        message.error('Please fill in all required fields');
      } else {
        message.error(`Failed to ${editingRole ? 'update' : 'create'} role`);
      }
    }
  };

  const handlePermissionChange = (moduleKey: string, action: string, checked: boolean) => {
    setPermissions((prevPermissions) => {
      const newPermissions = [...prevPermissions];
      const moduleIndex = newPermissions.findIndex((p) => p.module === moduleKey);

      if (moduleIndex >= 0) {
        if (checked) {
          if (!newPermissions[moduleIndex].actions.includes(action)) {
            newPermissions[moduleIndex].actions = [...newPermissions[moduleIndex].actions, action];
          }
        } else {
          newPermissions[moduleIndex].actions = newPermissions[moduleIndex].actions.filter(
            (a) => a !== action
          );
        }
      } else {
        newPermissions.push({
          module: moduleKey,
          actions: checked ? [action] : [],
        });
      }

      return newPermissions;
    });
  };

  const isPermissionChecked = (moduleKey: string, action: string): boolean => {
    const modulePermission = permissions.find((p) => p.module === moduleKey);
    return modulePermission ? modulePermission.actions.includes(action) : false;
  };

  const handleSelectAllModule = (moduleKey: string, checked: boolean) => {
    setPermissions((prevPermissions) => {
      const newPermissions = [...prevPermissions];
      const moduleIndex = newPermissions.findIndex((p) => p.module === moduleKey);

      if (checked) {
        if (moduleIndex >= 0) {
          newPermissions[moduleIndex].actions = [...PERMISSION_ACTIONS];
        } else {
          newPermissions.push({
            module: moduleKey,
            actions: [...PERMISSION_ACTIONS],
          });
        }
      } else {
        if (moduleIndex >= 0) {
          newPermissions[moduleIndex].actions = [];
        }
      }

      return newPermissions;
    });
  };

  const isModuleFullySelected = (moduleKey: string): boolean => {
    const modulePermission = permissions.find((p) => p.module === moduleKey);
    if (!modulePermission) return false;
    return PERMISSION_ACTIONS.every((action) => modulePermission.actions.includes(action));
  };

  const getActionMenuItems = (role: Role): MenuProps['items'] => [
    {
      key: 'view',
      label: 'View',
      onClick: () => handleView(role),
    },
    {
      key: 'edit',
      label: 'Edit',
      onClick: () => handleEdit(role),
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      label: 'Delete Role',
      danger: true,
      disabled: role.isSystem,
      onClick: () => handleDelete(role),
    },
  ];

  const columns: ColumnsType<Role> = [
    {
      title: 'Role',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name: string, record: Role) => (
        <Space>
          <span>{name}</span>
          {record.isSystem && <Text type="secondary">(System)</Text>}
        </Space>
      ),
    },
    {
      title: 'Users',
      dataIndex: 'users',
      key: 'users',
    },
    {
      title: 'Branch',
      dataIndex: 'branch',
      key: 'branch',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '',
      key: 'action',
      width: 50,
      render: (_, record) => (
        <Dropdown menu={{ items: getActionMenuItems(record) }} trigger={['click']}>
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
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
        <Select
          value={branchFilter}
          onChange={setBranchFilter}
          style={{ width: 180 }}
          options={[
            { value: 'all', label: 'All Branches' },
            ...branches.map((b) => ({ value: b, label: b })),
          ]}
        />
        <Input
          placeholder="Search"
          prefix={<SearchOutlined />}
          style={{ width: 280 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <div style={{ marginLeft: 'auto' }}>
          <Button type="primary" icon={<SafetyOutlined />} onClick={handleCreateRole}>
            Create New Role
          </Button>
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={filteredRoles}
        rowKey="id"
        loading={loading}
        pagination={false}
        style={{ marginBottom: '16px' }}
      />

      <Text type="secondary">
        Total {filteredRoles.length} Role{filteredRoles.length !== 1 ? 's' : ''} Found
      </Text>

      {/* Create/Edit Role Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SafetyOutlined style={{ color: '#1890ff' }} />
            <span>{editingRole ? 'Edit' : 'Create New'} Role</span>
          </div>
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setModalVisible(false);
              form.resetFields();
            }}
          >
            Close
          </Button>,
          <Button key="submit" type="primary" onClick={handleSubmit}>
            {editingRole ? 'Update' : 'Create'} Role
          </Button>,
        ]}
        width={900}
      >
        <Form form={form} layout="vertical" style={{ marginTop: '24px' }}>
          <div style={{ marginBottom: '24px' }}>
            <Title level={5} style={{ marginBottom: '16px' }}>
              General Details
            </Title>

            <Form.Item
              label="Role Name"
              name="name"
              rules={[{ required: true, message: 'Please enter role name' }]}
            >
              <Input placeholder="Enter role name" disabled={editingRole?.isSystem} />
            </Form.Item>

            {!editingRole && (
              <Form.Item label="Select Pre-Existing Template (Optional)" name="template">
                <Select
                  placeholder="Select template"
                  options={[
                    { value: 'admin', label: 'Admin Template' },
                    { value: 'manager', label: 'Manager Template' },
                    { value: 'employee', label: 'Employee Template' },
                  ]}
                  allowClear
                />
              </Form.Item>
            )}

            <Form.Item
              label="Description"
              name="description"
              rules={[{ required: true, message: 'Please enter description' }]}
            >
              <TextArea rows={3} placeholder="Enter description" />
            </Form.Item>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <Title level={5} style={{ marginBottom: '16px' }}>
              Assign to Branch
            </Title>

            <Form.Item
              label="Select Branch"
              name="branch"
              rules={[{ required: true, message: 'Please select a branch' }]}
            >
              <Select
                placeholder="Select Branch"
                options={[
                  { value: 'Gurugram', label: 'Gurugram (Default)' },
                  { value: 'Delhi', label: 'Delhi' },
                  { value: 'Mumbai', label: 'Mumbai' },
                ]}
              />
            </Form.Item>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <Title level={5} style={{ marginBottom: '16px' }}>
              Permissions
            </Title>

            <div
              style={{
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                padding: '16px',
              }}
            >
              {/* Header row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '200px repeat(4, 1fr) 80px',
                  gap: '12px',
                  marginBottom: '12px',
                  fontWeight: 500,
                }}
              >
                <div>Module</div>
                <div style={{ textAlign: 'center' }}>View</div>
                <div style={{ textAlign: 'center' }}>Add</div>
                <div style={{ textAlign: 'center' }}>Edit</div>
                <div style={{ textAlign: 'center' }}>Delete</div>
                <div style={{ textAlign: 'center' }}>Select All</div>
              </div>

              {/* Permission rows */}
              {PERMISSION_MODULES.map((module) => (
                <div
                  key={module.key}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '200px repeat(4, 1fr) 80px',
                    gap: '12px',
                    marginBottom: '8px',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <Text strong>{module.label}</Text>
                  </div>
                  {PERMISSION_ACTIONS.map((action) => (
                    <div key={action} style={{ textAlign: 'center' }}>
                      <Checkbox
                        checked={isPermissionChecked(module.key, action)}
                        onChange={(e) =>
                          handlePermissionChange(module.key, action, e.target.checked)
                        }
                      />
                    </div>
                  ))}
                  <div style={{ textAlign: 'center' }}>
                    <Checkbox
                      checked={isModuleFullySelected(module.key)}
                      onChange={(e) => handleSelectAllModule(module.key, e.target.checked)}
                    />
                  </div>
                </div>
              ))}
            </div>

            <Text type="secondary" style={{ fontSize: '12px', marginTop: '12px', display: 'block' }}>
              Select the permissions that users with this role will have access to.
            </Text>
          </div>
        </Form>
      </Modal>
    </div>
  );
};
