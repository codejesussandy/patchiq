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
  Drawer,
} from 'antd';
import {
  SearchOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  DownloadOutlined,
  FilterOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { settingsService } from '../../services/settings.service';

const { Title } = Typography;
const { TextArea } = Input;

interface UserRole {
  id: string;
  name: string;
  description?: string;
  capabilities?: string[];
  createdAt?: string;
  isSystem?: boolean;
}

interface FilterState {
  showId: boolean;
  showName: boolean;
  showDescription: boolean;
}

type DrawerMode = 'create' | 'edit' | 'view' | null;

// Capabilities structure with categories
interface CapabilityCategory {
  name: string;
  capabilities: { label: string; key: string }[];
}

const CAPABILITIES_CATEGORIES: CapabilityCategory[] = [
  {
    name: 'Inventory',
    capabilities: [
      { label: 'View Inventory', key: 'view_inventory' },
      { label: 'Create Inventory', key: 'create_inventory' },
      { label: 'Delete Inventory', key: 'delete_inventory' },
      { label: 'Manage Inventory', key: 'manage_inventory' },
      { label: 'Update Inventory', key: 'update_inventory' },
    ],
  },
  {
    name: 'Remote Desktop',
    capabilities: [{ label: 'Remote Desktop', key: 'remote_desktop' }],
  },
  {
    name: 'File Explorer',
    capabilities: [{ label: 'File Explorer', key: 'file_explorer' }],
  },
  {
    name: 'Terminal',
    capabilities: [{ label: 'Terminal', key: 'terminal' }],
  },
  {
    name: 'Wake On LAN',
    capabilities: [{ label: 'Wake On LAN', key: 'wake_on_lan' }],
  },
  {
    name: 'Add User',
    capabilities: [{ label: 'Add User', key: 'add_user' }],
  },
  {
    name: 'Change Password',
    capabilities: [{ label: 'Change Password', key: 'change_password' }],
  },
  {
    name: 'Dashboard',
    capabilities: [
      { label: 'View Dashboard', key: 'view_dashboard' },
      { label: 'Create Dashboard', key: 'create_dashboard' },
      { label: 'Delete Dashboard', key: 'delete_dashboard' },
      { label: 'Manage Dashboard', key: 'manage_dashboard' },
      { label: 'Update Dashboard', key: 'update_dashboard' },
    ],
  },
  {
    name: 'Vulnerability',
    capabilities: [
      { label: 'View Vulnerability', key: 'view_vulnerability' },
      { label: 'View Manage Exceptions', key: 'view_manage_exceptions' },
    ],
  },
  {
    name: 'Report',
    capabilities: [
      { label: 'View Report', key: 'view_report' },
      { label: 'Create Report', key: 'create_report' },
      { label: 'Delete Report', key: 'delete_report' },
      { label: 'Manage Report', key: 'manage_report' },
      { label: 'Update Report', key: 'update_report' },
    ],
  },
  {
    name: 'Endpoint Vitals',
    capabilities: [
      { label: 'View Endpoint Vitals', key: 'view_endpoint_vitals' },
      { label: 'Create Endpoint Vitals', key: 'create_endpoint_vitals' },
      { label: 'Delete Endpoint Vitals', key: 'delete_endpoint_vitals' },
      { label: 'Manage Endpoint Vitals', key: 'manage_endpoint_vitals' },
      { label: 'Update Endpoint Vitals', key: 'update_endpoint_vitals' },
    ],
  },
  {
    name: 'Settings',
    capabilities: [
      { label: 'View Settings', key: 'view_settings' },
      { label: 'Create Settings', key: 'create_settings' },
      { label: 'Delete Settings', key: 'delete_settings' },
      { label: 'Manage Settings', key: 'manage_settings' },
      { label: 'Update Settings', key: 'update_settings' },
    ],
  },
  {
    name: 'Widget',
    capabilities: [
      { label: 'View Widget', key: 'view_widget' },
      { label: 'Create Widget', key: 'create_widget' },
      { label: 'Delete Widget', key: 'delete_widget' },
      { label: 'Manage Widget', key: 'manage_widget' },
      { label: 'Update Widget', key: 'update_widget' },
    ],
  },
  {
    name: 'Alert',
    capabilities: [
      { label: 'View Alert', key: 'view_alert' },
      { label: 'Create Alert', key: 'create_alert' },
      { label: 'Delete Alert', key: 'delete_alert' },
      { label: 'Manage Alert', key: 'manage_alert' },
      { label: 'Update Alert', key: 'update_alert' },
    ],
  },
  {
    name: 'Audit',
    capabilities: [{ label: 'View Audit', key: 'view_audit' }],
  },
  {
    name: 'Patch',
    capabilities: [
      { label: 'View Patch', key: 'view_patch' },
      { label: 'Create Patch', key: 'create_patch' },
      { label: 'Delete Patch', key: 'delete_patch' },
      { label: 'Manage Patch', key: 'manage_patch' },
      { label: 'Update Patch', key: 'update_patch' },
    ],
  },
  {
    name: 'System Action',
    capabilities: [
      { label: 'Kill Process', key: 'kill_process' },
      { label: 'Delete Files', key: 'delete_files' },
      { label: 'Reboot', key: 'reboot' },
      { label: 'Shutdown', key: 'shutdown' },
      { label: 'Block IP Address', key: 'block_ip_address' },
      { label: 'Block Port', key: 'block_port' },
      { label: 'Delete User', key: 'delete_user' },
      { label: 'Format Drive', key: 'format_drive' },
      { label: 'Remote Wipe Out', key: 'remote_wipe_out' },
      { label: 'Enable Service', key: 'enable_service' },
      { label: 'Disable Service', key: 'disable_service' },
    ],
  },
];

export const UserRoles = () => {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);
  const [viewingRole, setViewingRole] = useState<UserRole | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    showId: true,
    showName: true,
    showDescription: true,
  });
  const [form] = Form.useForm();
  const [filterForm] = Form.useForm();
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    pageSize: 20,
    current: 1,
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const data = await settingsService.getRoles();
      const formattedData = Array.isArray(data)
        ? data.map((role: any, index: number) => ({
            ...role,
            id: role.id || String(index),
          }))
        : [];
      setRoles(formattedData);
    } catch (error) {
      console.error('Error fetching roles:', error);
      message.error('Failed to fetch roles');
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingRole(null);
    setViewingRole(null);
    setDrawerMode('create');
    setSelectedCapabilities([]);
    form.resetFields();
    setDrawerVisible(true);
  };

  const handleEdit = (role: UserRole) => {
    setEditingRole(role);
    setViewingRole(null);
    setDrawerMode('edit');
    setSelectedCapabilities(role.capabilities || []);
    form.setFieldsValue({
      name: role.name,
      description: role.description,
    });
    setDrawerVisible(true);
  };

  const handleViewRole = (role: UserRole) => {
    setViewingRole(role);
    setEditingRole(null);
    setDrawerMode('view');
    setSelectedCapabilities(role.capabilities || []);
    form.setFieldsValue({
      name: role.name,
      description: role.description,
    });
    setDrawerVisible(true);
  };

  const handleEditFromView = () => {
    if (viewingRole) {
      setDrawerMode('edit');
      setEditingRole(viewingRole);
      setViewingRole(null);
    }
  };

  const handleDelete = (role: UserRole) => {
    if (role.isSystem) {
      message.error('Cannot delete system roles');
      return;
    }

    Modal.confirm({
      title: 'Delete Role',
      content: `Are you sure you want to delete "${role.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await settingsService.deleteRole(role.id);
          message.success('Role deleted successfully');
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

      const roleData = {
        ...values,
        capabilities: selectedCapabilities,
      };

      if (editingRole) {
        await settingsService.updateRole(editingRole.id, roleData);
        message.success('Role updated successfully');
      } else {
        await settingsService.createRole(roleData);
        message.success('Role created successfully');
      }

      setDrawerVisible(false);
      setDrawerMode(null);
      setEditingRole(null);
      setSelectedCapabilities([]);
      form.resetFields();
      fetchRoles();
    } catch (error) {
      message.error(`Failed to ${editingRole ? 'update' : 'create'} role`);
    }
  };

  const handleReset = () => {
    if (editingRole) {
      form.setFieldsValue({
        name: editingRole.name,
        description: editingRole.description,
      });
    } else {
      form.resetFields();
    }
  };

  const handleOpenFilterModal = () => {
    filterForm.setFieldsValue({
      showId: filters.showId,
      showName: filters.showName,
      showDescription: filters.showDescription,
    });
    setFilterModalVisible(true);
  };

  const handleApplyFilters = () => {
    const values = filterForm.getFieldsValue();
    setFilters({
      showId: values.showId !== undefined ? values.showId : true,
      showName: values.showName !== undefined ? values.showName : true,
      showDescription: values.showDescription !== undefined ? values.showDescription : true,
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
      showDescription: true,
    });
    setPagination({ ...pagination, current: 1 });
    message.success('All columns shown');
  };

  const hasHiddenColumns = !filters.showId || !filters.showName || !filters.showDescription;

  const handleExport = () => {
    const csvContent = [
      ['ID', 'Name', 'Description', 'Created On'],
      ...filteredRoles.map((role) => [
        role.id,
        role.name,
        role.description || '',
        role.createdAt || '',
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'user-roles.csv';
    link.click();
    window.URL.revokeObjectURL(url);
    message.success('Roles exported successfully');
  };

  const allColumns: ColumnsType<UserRole> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      sorter: (a, b) => {
        const aNum = parseInt(a.id) || 0;
        const bNum = parseInt(b.id) || 0;
        return aNum - bNum;
      },
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text: string, record: UserRole) => (
        <a href="#" onClick={(e) => {
          e.preventDefault();
          handleViewRole(record);
        }}>
          {text}
        </a>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string) => text || '—',
    },
    {
      title: 'Created On',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => {
        if (!text) return '—';
        const date = new Date(text);
        return date.toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });
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
              icon={<EditOutlined style={{ color: '#1890ff' }} />}
              onClick={() => handleEdit(record)}
              disabled={record.isSystem}
            />
          </Tooltip>
          <Tooltip title={record.isSystem ? 'Cannot delete system role' : 'Delete'}>
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={record.isSystem}
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
    if (col.key === 'description') return filters.showDescription;
    return true; // Always show actions column
  });

  const filteredRoles = roles.filter((role) => {
    if (!searchText) return true;

    const searchLower = searchText.toLowerCase();
    return (
      role.id.toLowerCase().includes(searchLower) ||
      role.name.toLowerCase().includes(searchLower) ||
      (role.description && role.description.toLowerCase().includes(searchLower))
    );
  });

  const paginatedData = filteredRoles.slice(
    (pagination.current! - 1) * pagination.pageSize!,
    pagination.current! * pagination.pageSize!
  );

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <Title level={2}>User Roles</Title>
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
              onClick={() => fetchRoles()}
              loading={loading}
            />
          </Tooltip>

          <Tooltip title="Export">
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
              disabled={roles.length === 0}
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
            onClick={handleCreate}
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
          total: filteredRoles.length,
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

      {/* Create/Edit/View Drawer */}
      <Drawer
        title={
          drawerMode === 'create'
            ? 'Create New Role'
            : drawerMode === 'edit'
            ? 'Edit Role'
            : 'View Role'
        }
        placement="right"
        onClose={() => {
          setDrawerVisible(false);
          setDrawerMode(null);
          setEditingRole(null);
          setViewingRole(null);
          setSelectedCapabilities([]);
          form.resetFields();
        }}
        open={drawerVisible}
        closable={true}
        closeIcon={<CloseOutlined />}
        width={800}
        footer={
          drawerMode === 'view'
            ? null
            : [
                <Button
                  key="reset"
                  onClick={() => {
                    handleReset();
                    setSelectedCapabilities(editingRole?.capabilities || []);
                  }}
                >
                  Reset
                </Button>,
                <Button
                  key="cancel"
                  onClick={() => {
                    setDrawerVisible(false);
                    setDrawerMode(null);
                    setEditingRole(null);
                    setSelectedCapabilities([]);
                    form.resetFields();
                  }}
                >
                  Cancel
                </Button>,
                <Button
                  key="submit"
                  type="primary"
                  onClick={handleSubmit}
                >
                  {drawerMode === 'create' ? 'Create' : 'Update'}
                </Button>,
              ]
        }
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: '24px' }}
        >
          <Form.Item
            label={
              <span>
                Name {drawerMode !== 'view' && <span style={{ color: 'red' }}>*</span>}
              </span>
            }
            name="name"
            rules={
              drawerMode === 'view'
                ? []
                : [
                    { required: true, message: 'Please enter role name' },
                    { min: 2, message: 'Name must be at least 2 characters' },
                  ]
            }
          >
            <Input
              placeholder="Enter role name"
              disabled={drawerMode === 'view'}
            />
          </Form.Item>

          <Form.Item
            label={
              <span>
                Description {drawerMode !== 'view' && <span style={{ color: 'red' }}>*</span>}
              </span>
            }
            name="description"
            rules={
              drawerMode === 'view'
                ? []
                : [
                    { required: true, message: 'Please enter description' },
                  ]
            }
          >
            <TextArea
              rows={4}
              placeholder="Enter role description"
              disabled={drawerMode === 'view'}
            />
          </Form.Item>

          <Form.Item
            label={
              <span>
                Capabilities
              </span>
            }
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                border: '1px solid #d9d9d9',
                borderRadius: '6px',
                height: '400px',
                backgroundColor: '#fafafa',
              }}
            >
              {/* Left column - All available capabilities with categories */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  borderRight: '1px solid #d9d9d9',
                  overflow: 'hidden',
                }}
              >
                {/* Sticky header */}
                <div style={{ fontWeight: 600, padding: '12px 12px 8px 12px', color: '#1890ff', fontSize: '12px', backgroundColor: '#fafafa', zIndex: 10, flexShrink: 0 }}>
                  {CAPABILITIES_CATEGORIES.reduce((acc, cat) => acc + cat.capabilities.length, 0)} Items
                </div>
                {/* Scrollable content */}
                <div style={{ overflowY: 'auto', padding: '0 12px 12px 12px', flex: 1 }}>
                  {CAPABILITIES_CATEGORIES.map((category) => (
                  <div key={category.name} style={{ marginBottom: '14px' }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: '12px',
                        color: '#262626',
                        marginBottom: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {category.name}
                    </div>
                    {category.capabilities.map((cap) => (
                      <div
                        key={cap.key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '6px 8px',
                          fontSize: '13px',
                          marginBottom: '2px',
                          borderRadius: '3px',
                          transition: 'background-color 0.2s',
                          backgroundColor: selectedCapabilities.includes(cap.key)
                            ? '#e6f7ff'
                            : 'transparent',
                        }}
                      >
                        <Checkbox
                          checked={selectedCapabilities.includes(cap.key)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCapabilities([...selectedCapabilities, cap.key]);
                            } else {
                              setSelectedCapabilities(
                                selectedCapabilities.filter((c) => c !== cap.key)
                              );
                            }
                          }}
                          disabled={drawerMode === 'view'}
                          style={{ marginRight: '8px' }}
                        />
                        <span style={{ color: '#262626' }}>{cap.label}</span>
                      </div>
                    ))}
                  </div>
                ))}
                </div>
              </div>

              {/* Right column - Selected capabilities */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: '#ffffff',
                  overflow: 'hidden',
                }}
              >
                {/* Sticky header */}
                <div style={{ fontWeight: 600, padding: '12px 12px 8px 12px', color: '#1890ff', fontSize: '12px', backgroundColor: '#ffffff', zIndex: 10, flexShrink: 0 }}>
                  {selectedCapabilities.length} Items
                </div>
                {/* Scrollable content */}
                <div style={{ overflowY: 'auto', padding: '0 12px 12px 12px', flex: 1 }}>
                {selectedCapabilities.length === 0 ? (
                  <div
                    style={{
                      color: '#bfbfbf',
                      fontSize: '12px',
                      paddingTop: '16px',
                      textAlign: 'center',
                      fontStyle: 'italic',
                    }}
                  >
                    No capabilities selected
                  </div>
                ) : (
                  selectedCapabilities.map((cap) => (
                    <div
                      key={cap}
                      style={{
                        padding: '6px 8px',
                        fontSize: '13px',
                        color: '#262626',
                        marginBottom: '4px',
                        backgroundColor: '#f5f5f5',
                        borderRadius: '3px',
                        borderLeft: '3px solid #1890ff',
                      }}
                    >
                      {cap
                        .split('_')
                        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(' ')}
                    </div>
                  ))
                )}
                </div>
              </div>
            </div>
          </Form.Item>
        </Form>

        {drawerMode === 'view' && (
          <div style={{ marginTop: '24px' }}>
            <Button
              type="primary"
              block
              onClick={handleEditFromView}
            >
              Edit
            </Button>
          </div>
        )}
      </Drawer>

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

          <Form.Item name="showDescription" valuePropName="checked" style={{ marginBottom: '16px' }}>
            <Checkbox>Show Description</Checkbox>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
