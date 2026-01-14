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
  Tag,
  Space,
} from 'antd';
import {
  SearchOutlined,
  MoreOutlined,
  UserAddOutlined,
  MailOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import { settingsService } from '../../services/settings.service';

const { Title, Text } = Typography;

interface User {
  id: string;
  name: string;
  email: string;
  branch: string;
  role: string;
  status: 'Active' | 'Invite Sent' | 'New Account' | 'In Active';
  lastLogin?: string;
  avatar?: string;
  initials?: string;
  color?: string;
}

export const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await settingsService.getUsers();
      const transformedUsers = Array.isArray(data)
        ? data.map((user: any) => ({
            id: user.id,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            email: user.email,
            branch: user.branch,
            role: user.role,
            status: user.status,
            lastLogin: user.lastLogin,
            initials: `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase(),
            color: ['#ff7a45', '#ffc069', '#1890ff', '#52c41a', '#722ed1'][Math.floor(Math.random() * 5)],
          }))
        : [];
      setUsers(transformedUsers);
    } catch (error) {
      message.error('Failed to fetch users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleInviteUser = () => {
    form.resetFields();
    setInviteModalVisible(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({
      name: user.name,
      email: user.email,
      branch: user.branch,
      role: user.role,
      status: user.status,
    });
    setModalVisible(true);
  };

  const handleDelete = (user: User) => {
    Modal.confirm({
      title: 'Delete User',
      content: `Are you sure you want to delete ${user.name}?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await settingsService.deleteUser(user.id);
          message.success(`${user.name} deleted successfully`);
          fetchUsers();
        } catch (error) {
          message.error('Failed to delete user');
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const [firstName, ...lastNameParts] = values.name.split(' ');
      const lastName = lastNameParts.join(' ');

      const submitData = {
        firstName,
        lastName,
        email: values.email,
        branch: values.branch,
        role: values.role,
        ...(editingUser && { status: values.status }),
      };

      if (editingUser) {
        await settingsService.updateUser(editingUser.id, submitData);
        message.success('User updated successfully');
      } else {
        await settingsService.createUser(submitData);
        message.success('User created successfully');
      }

      setModalVisible(false);
      form.resetFields();
      fetchUsers();
    } catch (error) {
      message.error(`Failed to ${editingUser ? 'update' : 'create'} user`);
    }
  };

  const handleInviteSubmit = async () => {
    try {
      const values = await form.validateFields();
      await settingsService.inviteUser(values);
      message.success('Invitation sent successfully');
      setInviteModalVisible(false);
      form.resetFields();
      fetchUsers();
    } catch (error) {
      message.error('Failed to send invitation');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return '#52c41a';
      case 'Invite Sent':
        return '#faad14';
      case 'New Account':
        return '#1890ff';
      case 'In Active':
        return '#d9d9d9';
      default:
        return '#d9d9d9';
    }
  };

  const getActionMenuItems = (user: User): MenuProps['items'] => [
    {
      key: 'edit',
      label: 'Edit',
      onClick: () => handleEdit(user),
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      label: 'Delete',
      danger: true,
      onClick: () => handleDelete(user),
    },
  ];

  const columns: ColumnsType<User> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name: string, record: User) => (
        <Space>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: record.color || '#1890ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '14px',
            }}
          >
            {record.initials || name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </div>
          <span>{name}</span>
        </Space>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Branch',
      dataIndex: 'branch',
      key: 'branch',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)} style={{ borderRadius: '4px' }}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Last Login',
      dataIndex: 'lastLogin',
      key: 'lastLogin',
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

  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.name.toLowerCase().includes(searchText.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchText.toLowerCase());
    const matchesBranch = branchFilter === 'all' || user.branch === branchFilter;
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesBranch && matchesRole && matchesStatus;
  });

  const branches = Array.from(new Set(users.map((u) => u.branch)));
  const roles = Array.from(new Set(users.map((u) => u.role)));

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Title level={4}>User Management</Title>
        <Text type="secondary">Manage user accounts and permissions</Text>
      </div>

      <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Input
          placeholder="Search"
          prefix={<SearchOutlined />}
          style={{ width: 280 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <Select
          value={branchFilter}
          onChange={setBranchFilter}
          style={{ width: 140 }}
          options={[
            { value: 'all', label: 'All Branches' },
            ...branches.map((b) => ({ value: b, label: b })),
          ]}
        />
        <Select
          value={roleFilter}
          onChange={setRoleFilter}
          style={{ width: 140 }}
          options={[
            { value: 'all', label: 'All Roles' },
            ...roles.map((r) => ({ value: r, label: r })),
          ]}
        />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 140 }}
          options={[
            { value: 'all', label: 'All Status' },
            { value: 'Active', label: 'Active' },
            { value: 'Invite Sent', label: 'Invite Sent' },
            { value: 'New Account', label: 'New Account' },
            { value: 'In Active', label: 'In Active' },
          ]}
        />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <Button icon={<MailOutlined />} onClick={handleInviteUser}>
            Send Invite
          </Button>
          <Button type="primary" icon={<UserAddOutlined />} onClick={handleCreateUser}>
            Add New User
          </Button>
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={filteredUsers}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        style={{ marginBottom: '16px' }}
      />

      {/* Create/Edit User Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserAddOutlined style={{ color: '#1890ff' }} />
            <span>{editingUser ? 'Edit' : 'Add New'} User</span>
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
            {editingUser ? 'Update' : 'Create'} User
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical" style={{ marginTop: '24px' }}>
          <Form.Item
            label="Full Name"
            name="name"
            rules={[{ required: true, message: 'Please enter full name' }]}
          >
            <Input placeholder="Enter full name" />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Please enter email' },
              { type: 'email', message: 'Please enter valid email' },
            ]}
          >
            <Input placeholder="Enter email" disabled={!!editingUser} />
          </Form.Item>

          <Form.Item
            label="Branch"
            name="branch"
            rules={[{ required: true, message: 'Please select branch' }]}
          >
            <Select
              placeholder="Select Branch"
              options={[
                { value: 'Gurugram', label: 'Gurugram' },
                { value: 'Delhi', label: 'Delhi' },
                { value: 'Mumbai', label: 'Mumbai' },
              ]}
            />
          </Form.Item>

          <Form.Item
            label="Role"
            name="role"
            rules={[{ required: true, message: 'Please select role' }]}
          >
            <Select
              placeholder="Select Role"
              options={[
                { value: 'Admin', label: 'Admin' },
                { value: 'Team Manager', label: 'Team Manager' },
                { value: 'Employee', label: 'Employee' },
              ]}
            />
          </Form.Item>

          {editingUser && (
            <Form.Item
              label="Status"
              name="status"
              rules={[{ required: true, message: 'Please select status' }]}
            >
              <Select
                placeholder="Select Status"
                options={[
                  { value: 'Active', label: 'Active' },
                  { value: 'In Active', label: 'In Active' },
                ]}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* Invite User Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MailOutlined style={{ color: '#1890ff' }} />
            <span>Invite New User</span>
          </div>
        }
        open={inviteModalVisible}
        onCancel={() => {
          setInviteModalVisible(false);
          form.resetFields();
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setInviteModalVisible(false);
              form.resetFields();
            }}
          >
            Close
          </Button>,
          <Button key="submit" type="primary" onClick={handleInviteSubmit}>
            Send Invite
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical" style={{ marginTop: '24px' }}>
          <Form.Item
            label="Email Address"
            name="email"
            rules={[
              { required: true, message: 'Please enter email' },
              { type: 'email', message: 'Please enter valid email' },
            ]}
          >
            <Input placeholder="Enter email address" />
          </Form.Item>

          <Form.Item
            label="Role"
            name="role"
            rules={[{ required: true, message: 'Please select role' }]}
          >
            <Select
              placeholder="Select Role"
              options={[
                { value: 'Admin', label: 'Admin' },
                { value: 'Team Manager', label: 'Team Manager' },
                { value: 'Employee', label: 'Employee' },
              ]}
            />
          </Form.Item>

          <Form.Item
            label="Branch"
            name="branch"
            rules={[{ required: true, message: 'Please select branch' }]}
          >
            <Select
              placeholder="Select Branch"
              options={[
                { value: 'Gurugram', label: 'Gurugram' },
                { value: 'Delhi', label: 'Delhi' },
                { value: 'Mumbai', label: 'Mumbai' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
