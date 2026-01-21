import { useState, useEffect } from 'react';
import {
  Table,
  Input,
  Button,
  Typography,
  Modal,
  Form,
  message,
  Space,
  Tooltip,
  Checkbox,
  Select,
  Switch,
  Upload,
  Divider,
  Row,
  Col,
} from 'antd';
import {
  SearchOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  DownloadOutlined,
  FilterOutlined,
  ImportOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { settingsService } from '../../services/settings.service';

const { Title } = Typography;
const { Dragger } = Upload;

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  createdAt?: string;
  username?: string;
  password?: string;
  timezone?: string;
  organization?: string;
  department?: string;
  branch?: string;
  role?: string;
  loginAllowed?: boolean;
  endpointAssignmentAllowed?: boolean;
  avatar?: string;
  status?: string;
}

interface FilterState {
  showId: boolean;
  showName: boolean;
  showEmail: boolean;
  showPhone: boolean;
}

export const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'view' | 'edit' | 'create'>('view');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [uploadedFile, setUploadedFile] = useState<any>(null);
  const [importFile, setImportFile] = useState<any>(null);

  // Dropdown data
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);

  const [filters, setFilters] = useState<FilterState>({
    showId: true,
    showName: true,
    showEmail: true,
    showPhone: false,
  });
  const [drawerForm] = Form.useForm();
  const [filterForm] = Form.useForm();
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    pageSize: 20,
    current: 1,
  });

  useEffect(() => {
    fetchUsers();
    fetchDropdownData();
  }, []);

  const fetchDropdownData = async () => {
    try {
      const [orgs, depts, userRoles] = await Promise.all([
        settingsService.getOrganizations(),
        settingsService.getDepartments(),
        settingsService.getRoles(),
      ]);
      setOrganizations(Array.isArray(orgs) ? orgs : []);
      setDepartments(Array.isArray(depts) ? depts : []);
      setRoles(Array.isArray(userRoles) ? userRoles : []);
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await settingsService.getUsers();
      const formattedData = Array.isArray(data)
        ? data.map((user: any, index: number) => ({
            ...user,
            id: user.id || String(index),
          }))
        : [];
      setUsers(formattedData);
    } catch (error) {
      console.error('Error fetching users:', error);
      message.error('Failed to fetch users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setDrawerMode('create');
    drawerForm.resetFields();
    setUploadedFile(null);
    setDrawerVisible(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setDrawerMode('edit');
    drawerForm.setFieldsValue({
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username || '',
      email: user.email,
      phone: user.phone || '',
      timezone: user.timezone || undefined,
      organization: user.organization || undefined,
      department: user.department || undefined,
      role: user.role || undefined,
      loginAllowed: user.loginAllowed ?? true,
      endpointAssignmentAllowed: user.endpointAssignmentAllowed ?? true,
    });
    setUploadedFile(null);
    setDrawerVisible(true);
  };

  const handleViewUser = (user: User) => {
    setEditingUser(user);
    setDrawerMode('view');
    drawerForm.setFieldsValue({
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username || '',
      email: user.email,
      phone: user.phone || '',
      timezone: user.timezone || undefined,
      organization: user.organization || undefined,
      department: user.department || undefined,
      role: user.role || undefined,
      loginAllowed: user.loginAllowed ?? true,
      endpointAssignmentAllowed: user.endpointAssignmentAllowed ?? true,
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
    Modal.confirm({
      title: 'Delete User',
      content: `Are you sure you want to delete "${user.firstName} ${user.lastName}"?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await settingsService.deleteUser(user.id);
          message.success(`User deleted successfully`);
          fetchUsers();
        } catch (error) {
          message.error('Failed to delete user');
        }
      },
    });
  };

  const handleDrawerSubmit = async () => {
    try {
      const values = await drawerForm.validateFields();

      // Handle file upload if present
      if (uploadedFile) {
        values.avatar = uploadedFile.name;
      }

      if (editingUser && drawerMode === 'edit') {
        await settingsService.updateUser(editingUser.id, values);
        message.success('User updated successfully');
      } else if (drawerMode === 'create') {
        await settingsService.createUser(values);
        message.success('User created successfully');
      }

      handleDrawerClose();
      fetchUsers();
    } catch (error) {
      message.error(`Failed to ${editingUser && drawerMode === 'edit' ? 'update' : 'create'} user`);
    }
  };

  const handleOpenFilterModal = () => {
    filterForm.setFieldsValue({
      showId: filters.showId,
      showName: filters.showName,
      showEmail: filters.showEmail,
      showPhone: filters.showPhone,
    });
    setFilterModalVisible(true);
  };

  const handleApplyFilters = () => {
    const values = filterForm.getFieldsValue();
    setFilters({
      showId: values.showId !== undefined ? values.showId : true,
      showName: values.showName !== undefined ? values.showName : true,
      showEmail: values.showEmail !== undefined ? values.showEmail : true,
      showPhone: values.showPhone !== undefined ? values.showPhone : true,
    });
    setPagination({ ...pagination, current: 1 });
    setFilterModalVisible(false);
    message.success('Columns updated');
  };

  const handleResetFilters = () => {
    filterForm.resetFields();
    setFilters({
      showId: true,
      showName: true,
      showEmail: true,
      showPhone: false,
    });
    setPagination({ ...pagination, current: 1 });
    message.success('Columns reset to default');
  };

  const hasHiddenColumns = !filters.showId || !filters.showName || !filters.showEmail || !filters.showPhone;

  const handleExport = () => {
    const csvContent = [
      ['ID', 'Name', 'Email', 'Phone', 'Created On'],
      ...filteredUsers.map((user) => [
        user.id,
        `${user.firstName} ${user.lastName}`,
        user.email,
        user.phone || '',
        user.createdAt || '',
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'users.csv';
    link.click();
    window.URL.revokeObjectURL(url);
    message.success('Users exported successfully');
  };

  const handleImport = () => {
    setImportModalVisible(true);
    setImportFile(null);
  };

  const handleDownloadSampleCSV = () => {
    const headers = ['firstName', 'lastName', 'email', 'phone', 'username', 'timezone', 'organization', 'department', 'role'];
    const sampleData = [headers.join(',')];
    const csvContent = sampleData.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample_user.csv';
    link.click();
    window.URL.revokeObjectURL(url);
    message.success('Sample CSV downloaded');
  };

  const handleImportFile = async (file: any) => {
    setImportFile(file);
    return false;
  };

  const handleImportSubmit = async () => {
    if (!importFile) {
      message.error('Please select a CSV file');
      return;
    }

    try {
      setLoading(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        const csv = e.target?.result as string;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());

        const newUsers: User[] = [];
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const values = lines[i].split(',').map(v => v.trim());
          const user: User = {
            id: String(Date.now() + i),
            firstName: values[headers.indexOf('firstName')] || '',
            lastName: values[headers.indexOf('lastName')] || '',
            email: values[headers.indexOf('email')] || '',
            phone: values[headers.indexOf('phone')] || '',
            username: values[headers.indexOf('username')] || '',
            timezone: values[headers.indexOf('timezone')] || 'IST',
            organization: values[headers.indexOf('organization')] || '',
            department: values[headers.indexOf('department')] || '',
            role: values[headers.indexOf('role')] || '',
          };
          newUsers.push(user);
        }

        setUsers([...users, ...newUsers]);
        message.success(`${newUsers.length} users imported successfully`);
        setImportModalVisible(false);
        setImportFile(null);
      };
      reader.readAsText(importFile);
    } catch (error) {
      message.error('Error importing CSV file');
    } finally {
      setLoading(false);
    }
  };

  const handleImportReset = () => {
    setImportFile(null);
  };

  const getNameDisplay = (user: User) => {
    const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
    const colors = ['#ff7a45', '#ffc069', '#1890ff', '#52c41a', '#722ed1'];
    const color = colors[parseInt(user.id) % colors.length];

    return (
      <Space>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '12px',
          }}
        >
          {initials}
        </div>
        <span>{`${user.firstName} ${user.lastName}`}</span>
      </Space>
    );
  };

  const allColumns: ColumnsType<User> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
      sorter: (a, b) => {
        const aNum = parseInt(a.id) || 0;
        const bNum = parseInt(b.id) || 0;
        return aNum - bNum;
      },
    },
    {
      title: 'Name',
      dataIndex: 'firstName',
      key: 'name',
      sorter: (a, b) => {
        const aName = `${a.firstName} ${a.lastName}`;
        const bName = `${b.firstName} ${b.lastName}`;
        return aName.localeCompare(bName);
      },
      render: (_, record: User) => (
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            handleViewUser(record);
          }}
          style={{ color: '#1890ff' }}
        >
          {getNameDisplay(record)}
        </a>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (text: string) => text || '—',
    },
    {
      title: 'Created On',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => {
        if (!text) return '—';
        const date = new Date(text);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
        const displayHours = String(date.getHours() % 12 || 12).padStart(2, '0');
        return `${year}/${month}/${day} ${displayHours}:${minutes}:${seconds} ${ampm}`;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      align: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditUser(record)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const columns = allColumns.filter((col) => {
    if (col.key === 'id') return filters.showId;
    if (col.key === 'name') return filters.showName;
    if (col.key === 'email') return filters.showEmail;
    if (col.key === 'phone') return filters.showPhone;
    return true; // Always show actions column
  });

  const filteredUsers = users.filter((user) => {
    if (!searchText) return true;

    const searchLower = searchText.toLowerCase();
    return (
      user.id.toLowerCase().includes(searchLower) ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      (user.phone && user.phone.toLowerCase().includes(searchLower))
    );
  });

  const paginatedData = filteredUsers.slice(
    (pagination.current! - 1) * pagination.pageSize!,
    pagination.current! * pagination.pageSize!
  );

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <Title level={2}>Users</Title>
      </div>

      {/* Search and Action Controls */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Input
          placeholder="Search..."
          prefix={<SearchOutlined />}
          style={{ flex: 1, maxWidth: '400px' }}
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value);
            setPagination({ ...pagination, current: 1 });
          }}
        />

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <Tooltip title="Refresh">
            <Button
              icon={<ReloadOutlined />}
              onClick={() => fetchUsers()}
              loading={loading}
            />
          </Tooltip>

          <Tooltip title="Export">
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
              disabled={users.length === 0}
            />
          </Tooltip>

          <Tooltip title="Import">
            <Button
              icon={<ImportOutlined />}
              onClick={handleImport}
            />
          </Tooltip>

          <Tooltip title={hasHiddenColumns ? `${Object.values(filters).filter(v => v).length} filter(s) active` : 'Filter'}>
            <Button
              icon={<FilterOutlined />}
              onClick={handleOpenFilterModal}
              type={hasHiddenColumns ? 'primary' : 'default'}
            />
          </Tooltip>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateUser}
          >
            Create
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <Table
        columns={columns}
        dataSource={paginatedData}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: pagination.pageSize,
          current: pagination.current,
          total: filteredUsers.length,
          onChange: (page, pageSize) => {
            setPagination({ current: page, pageSize });
          },
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) =>
            `showing ${range[0]}–${range[1]} of ${total} items`,
        }}
        style={{ marginBottom: '24px' }}
      />

      {/* Enhanced User Modal */}
      <Modal
        title={drawerMode === 'create' ? 'Create User' : drawerMode === 'edit' ? 'Edit User' : 'View User'}
        open={drawerVisible}
        onCancel={handleDrawerClose}
        width={700}
        footer={
          drawerMode !== 'view' ? [
            <Button key="cancel" onClick={handleDrawerClose}>
              Cancel
            </Button>,
            <Button
              key="submit"
              type="primary"
              onClick={handleDrawerSubmit}
            >
              {drawerMode === 'create' ? 'Create' : 'Update'} User
            </Button>,
          ] : [
            <Button key="close" onClick={handleDrawerClose}>
              Close
            </Button>,
            <Button
              key="edit"
              type="primary"
              onClick={() => {
                setDrawerMode('edit');
              }}
            >
              Edit
            </Button>,
          ]
        }
      >
        <Form
          form={drawerForm}
          layout="vertical"
          autoComplete="off"
        >
          {/* Name and Username Row */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Name"
                required
              >
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  <Form.Item
                    name="firstName"
                    rules={[{ required: true, message: 'Please enter first name' }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Input
                      placeholder="First Name"
                      disabled={drawerMode === 'view'}
                    />
                  </Form.Item>
                  <Form.Item
                    name="lastName"
                    rules={[{ required: true, message: 'Please enter last name' }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Input
                      placeholder="Last Name"
                      disabled={drawerMode === 'view'}
                    />
                  </Form.Item>
                </Space>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Username"
                name="username"
              >
                <Input
                  placeholder="username"
                  disabled={drawerMode === 'view'}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Email and Phone Row */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: 'Please enter email' },
                  { type: 'email', message: 'Please enter valid email' },
                ]}
              >
                <Input disabled={drawerMode === 'view'} placeholder="admin@infraon.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Phone"
                name="phone"
              >
                <Input disabled={drawerMode === 'view'} placeholder="Enter phone" />
              </Form.Item>
            </Col>
          </Row>

          {/* Password Section */}
          {drawerMode !== 'view' && (
            <>
              <Divider>Password</Divider>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="Password"
                    name="password"
                  >
                    <Input.Password
                      placeholder="Enter password"
                      iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="Confirm Password"
                    name="confirmPassword"
                  >
                    <Input.Password
                      placeholder="Confirm password"
                      iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          {/* Timezone and Status Row */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Timezone"
                name="timezone"
              >
                <Select
                  placeholder="Please Select"
                  disabled={drawerMode === 'view'}
                  options={[
                    { label: 'UTC', value: 'UTC' },
                    { label: 'IST (India Standard Time)', value: 'IST' },
                    { label: 'EST', value: 'EST' },
                    { label: 'PST', value: 'PST' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              {/* Status toggles placeholder */}
            </Col>
          </Row>

          {/* Status Toggles */}
          <Row gutter={16}>
            <Col span={12}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ marginBottom: '8px', fontWeight: 500 }}>Login Allowed</div>
                <Form.Item
                  name="loginAllowed"
                  valuePropName="checked"
                  style={{ marginBottom: 0 }}
                >
                  <Switch disabled={drawerMode === 'view'} />
                </Form.Item>
              </div>
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ marginBottom: '8px', fontWeight: 500 }}>Endpoint Assignment Allowed</div>
                <Form.Item
                  name="endpointAssignmentAllowed"
                  valuePropName="checked"
                  style={{ marginBottom: 0 }}
                >
                  <Switch disabled={drawerMode === 'view'} />
                </Form.Item>
              </div>
            </Col>
          </Row>

          {/* File Upload Section */}
          {drawerMode !== 'view' && (
            <>
              <Divider>Avatar</Divider>
              <Form.Item>
                <Dragger
                  maxCount={1}
                  accept=".png,.jpg,.jpeg,.gif"
                  onChange={(info) => {
                    if (info.fileList.length > 0) {
                      setUploadedFile(info.fileList[0]);
                    } else {
                      setUploadedFile(null);
                    }
                  }}
                  onDrop={() => {
                    // Handle file drop
                  }}
                >
                  <p style={{ fontSize: '16px', marginBottom: 0 }}>
                    <InboxOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
                  </p>
                  <p>Click or drag file to this area to upload</p>
                  <p style={{ color: '#999', fontSize: '12px' }}>Support for a single upload</p>
                </Dragger>
              </Form.Item>
            </>
          )}

          {/* Organization, Department, Role Section */}
          <Divider>Organization</Divider>
          <Form.Item
            label="Organization"
            name="organization"
          >
            <Select
              placeholder="Global Organization"
              disabled={drawerMode === 'view'}
              options={organizations.map((org) => ({
                label: org.name,
                value: org.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="Department"
            name="department"
          >
            <Select
              placeholder="Global Department"
              disabled={drawerMode === 'view'}
              options={departments.map((dept) => ({
                label: dept.name,
                value: dept.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="Role"
            name="role"
          >
            <Select
              placeholder="Select Role"
              disabled={drawerMode === 'view'}
              options={roles.map((role) => ({
                label: role.name,
                value: role.id,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Filter Modal */}
      <Modal
        title="Show/Hide Columns"
        open={filterModalVisible}
        onCancel={() => {
          setFilterModalVisible(false);
        }}
        footer={[
          <Button
            key="reset"
            onClick={handleResetFilters}
          >
            Show All
          </Button>,
          <Button
            key="cancel"
            onClick={() => {
              setFilterModalVisible(false);
            }}
          >
            Cancel
          </Button>,
          <Button
            key="apply"
            type="primary"
            onClick={handleApplyFilters}
          >
            Apply
          </Button>,
        ]}
        width={400}
      >
        <Form form={filterForm} layout="vertical" style={{ marginTop: '24px' }}>
          <Form.Item name="showId" valuePropName="checked" style={{ marginBottom: '16px' }}>
            <Checkbox>Show ID</Checkbox>
          </Form.Item>

          <Form.Item name="showName" valuePropName="checked" style={{ marginBottom: '16px' }}>
            <Checkbox>Show Name</Checkbox>
          </Form.Item>

          <Form.Item name="showEmail" valuePropName="checked" style={{ marginBottom: '16px' }}>
            <Checkbox>Show Email</Checkbox>
          </Form.Item>

          <Form.Item name="showPhone" valuePropName="checked" style={{ marginBottom: '16px' }}>
            <Checkbox>Show Phone</Checkbox>
          </Form.Item>
        </Form>
      </Modal>

      {/* Import Users Modal */}
      <Modal
        title="Import Users"
        open={importModalVisible}
        onCancel={() => {
          setImportModalVisible(false);
          setImportFile(null);
        }}
        width={600}
        footer={[
          <Button
            key="reset"
            onClick={handleImportReset}
          >
            Reset
          </Button>,
          <Button
            key="cancel"
            onClick={() => {
              setImportModalVisible(false);
              setImportFile(null);
            }}
          >
            Cancel
          </Button>,
          <Button
            key="import"
            type="primary"
            loading={loading}
            onClick={handleImportSubmit}
          >
            Import
          </Button>,
        ]}
      >
        <div style={{ marginBottom: '32px' }}>
          <div style={{ marginBottom: '12px' }}>
            <span style={{ fontWeight: 500, fontSize: '14px' }}>Download Sample CSV</span>
          </div>
          <a onClick={handleDownloadSampleCSV} style={{ color: '#1890ff' }}>
            sample_user.csv
          </a>
        </div>

        <div>
          <div style={{ marginBottom: '12px' }}>
            <span style={{ fontWeight: 500, fontSize: '14px' }}>Select CSV File</span>
          </div>
          <Dragger
            accept=".csv"
            maxCount={1}
            beforeUpload={handleImportFile}
            fileList={importFile ? [importFile] : []}
            onRemove={() => setImportFile(null)}
          >
            <p style={{ fontSize: '32px', marginBottom: '12px' }}>
              <InboxOutlined style={{ color: '#1890ff' }} />
            </p>
            <p style={{ fontSize: '14px', color: '#000' }}>
              Click or drag file to this area to upload
            </p>
            <p style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '8px' }}>
              Please select CSV file containing Malicious Hashes
            </p>
            <p style={{ fontSize: '12px', color: '#8c8c8c' }}>
              Support for a single upload.
            </p>
          </Dragger>
        </div>
      </Modal>
    </div>
  );
};
