import { useState, useEffect } from 'react';
import {
  App,
  Table,
  Input,
  Button,
  Typography,
  Modal,
  Form,
  Space,
  Popconfirm,
  Checkbox,
  Select,
  Tag,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  DownloadOutlined,
  PlusOutlined,
  FilterOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { settingsService } from '../../services/settings.service';
import './styles.css';

const { Title } = Typography;
const { TextArea } = Input;

interface Location {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  organizationId?: string;
  organizationName?: string;
  isDefault?: boolean;
  usersCount?: number;
  departmentsCount?: number;
}

interface Organization {
  id: string;
  name: string;
}

interface TableParams {
  pagination?: TablePaginationConfig;
  sortField?: string;
  sortOrder?: string;
}

interface FilterState {
  showId: boolean;
  showName: boolean;
  showOrganization: boolean;
  showDescription: boolean;
  showDefault: boolean;
  showUsersCount: boolean;
  showDepartmentsCount: boolean;
  showCreatedOn: boolean;
}

export const UserLocation = () => {
  const { message } = App.useApp();
  const [locations, setLocations] = useState<Location[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [isViewModalEditing, setIsViewModalEditing] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [viewingLocation, setViewingLocation] = useState<Location | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    showId: true,
    showName: true,
    showOrganization: true,
    showDescription: true,
    showDefault: true,
    showUsersCount: true,
    showDepartmentsCount: true,
    showCreatedOn: true,
  });
  const [form] = Form.useForm();
  const [viewForm] = Form.useForm();
  const [filterForm] = Form.useForm();
  const [tableParams, setTableParams] = useState<TableParams>({
    pagination: {
      current: 1,
      pageSize: 20,
    },
  });

  useEffect(() => {
    fetchLocations();
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const data = await settingsService.getOrganizations();
      setOrganizations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    }
  };

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const data = await settingsService.getLocations();
      setLocations(Array.isArray(data) ? data : []);
      setTableParams({
        ...tableParams,
        pagination: {
          current: 1,
          pageSize: 20,
          total: Array.isArray(data) ? data.length : 0,
        },
      });
    } catch (error) {
      message.error('Failed to fetch locations');
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await fetchLocations();
    message.success('Locations refreshed');
  };

  const handleExport = () => {
    const csv = [
      ['ID', 'Name', 'Description', 'Created On'],
      ...filteredLocations.map((loc) => [
        loc.id,
        loc.name,
        loc.description || '',
        formatDateTime(loc.createdAt),
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `locations-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    message.success('Locations exported');
  };

  const handleCreate = () => {
    setEditingLocation(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    form.setFieldsValue({
      name: location.name,
      description: location.description || '',
      organizationId: location.organizationId || undefined,
    });
    setModalVisible(true);
  };

  const handleViewLocation = (location: Location) => {
    setViewingLocation(location);
    setIsViewModalEditing(false);
    viewForm.setFieldsValue({
      name: location.name,
      description: location.description || '',
      organizationId: location.organizationId || undefined,
    });
    setViewModalVisible(true);
  };

  const handleViewModalEdit = () => {
    setIsViewModalEditing(true);
  };

  const handleViewModalSave = async () => {
    try {
      const values = await viewForm.validateFields();

      if (viewingLocation) {
        await settingsService.updateLocation(viewingLocation.id, values);
        message.success('Location updated successfully');
        setViewModalVisible(false);
        setIsViewModalEditing(false);
        viewForm.resetFields();
        fetchLocations();
      }
    } catch (error) {
      message.error('Failed to update location');
    }
  };

  const handleViewModalCancel = () => {
    setIsViewModalEditing(false);
    viewForm.setFieldsValue({
      name: viewingLocation?.name,
      description: viewingLocation?.description,
      organizationId: viewingLocation?.organizationId || undefined,
    });
  };

  const handleDelete = async (location: Location) => {
    try {
      await settingsService.deleteLocation(location.id);
      message.success(`${location.name} deleted successfully`);
      fetchLocations();
    } catch (error) {
      message.error('Failed to delete location');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingLocation) {
        await settingsService.updateLocation(editingLocation.id, values);
        message.success('Location updated successfully');
      } else {
        await settingsService.createLocation(values);
        message.success('Location created successfully');
      }

      setModalVisible(false);
      form.resetFields();
      fetchLocations();
    } catch (error) {
      message.error(`Failed to ${editingLocation ? 'update' : 'create'} location`);
    }
  };

  const handleOpenFilterModal = () => {
    filterForm.setFieldsValue({
      showId: filters.showId,
      showName: filters.showName,
      showOrganization: filters.showOrganization,
      showDescription: filters.showDescription,
      showDefault: filters.showDefault,
      showUsersCount: filters.showUsersCount,
      showDepartmentsCount: filters.showDepartmentsCount,
      showCreatedOn: filters.showCreatedOn,
    });
    setFilterModalVisible(true);
  };

  const handleApplyFilters = () => {
    const values = filterForm.getFieldsValue();
    setFilters({
      showId: values.showId !== undefined ? values.showId : true,
      showName: values.showName !== undefined ? values.showName : true,
      showOrganization: values.showOrganization !== undefined ? values.showOrganization : true,
      showDescription: values.showDescription !== undefined ? values.showDescription : true,
      showDefault: values.showDefault !== undefined ? values.showDefault : true,
      showUsersCount: values.showUsersCount !== undefined ? values.showUsersCount : true,
      showDepartmentsCount: values.showDepartmentsCount !== undefined ? values.showDepartmentsCount : true,
      showCreatedOn: values.showCreatedOn !== undefined ? values.showCreatedOn : true,
    });
    setTableParams({ ...tableParams, pagination: { ...tableParams.pagination, current: 1 } });
    setFilterModalVisible(false);
    message.success('Columns updated');
  };

  const handleResetFilters = () => {
    filterForm.resetFields();
    setFilters({
      showId: true,
      showName: true,
      showOrganization: true,
      showDescription: true,
      showDefault: true,
      showUsersCount: true,
      showDepartmentsCount: true,
      showCreatedOn: true,
    });
    setTableParams({ ...tableParams, pagination: { ...tableParams.pagination, current: 1 } });
    message.success('All columns shown');
  };

  const hasHiddenColumns = Object.values(filters).some(v => !v);

  const formatDateTime = (dateString?: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return dateString;
    }
  };

  const allColumns: ColumnsType<Location> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 50,
      sorter: (a, b) => {
        const aNum = parseInt(a.id, 10);
        const bNum = parseInt(b.id, 10);
        return aNum - bNum;
      },
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text: string, record: Location) => (
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            handleViewLocation(record);
          }}
          style={{ color: '#1890ff' }}
        >
          {text}
        </a>
      ),
    },
    {
      title: 'Organization',
      dataIndex: 'organizationName',
      key: 'organization',
      render: (text: string) => text || '—',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => text || '',
    },
    {
      title: 'Default',
      dataIndex: 'isDefault',
      key: 'default',
      width: 80,
      render: (val: boolean) => val ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>,
    },
    {
      title: 'Users',
      dataIndex: 'usersCount',
      key: 'usersCount',
      width: 80,
      render: (count: number) => <Tag color="blue">{count || 0}</Tag>,
    },
    {
      title: 'Departments',
      dataIndex: 'departmentsCount',
      key: 'departmentsCount',
      width: 110,
      render: (count: number) => <Tag color="blue">{count || 0}</Tag>,
    },
    {
      title: 'Created On',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => formatDateTime(text),
    },
    {
      title: '',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            style={{ color: '#1890ff' }}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Delete Location"
            description={`Are you sure you want to delete ${record.name}?`}
            onConfirm={() => handleDelete(record)}
            okText="Delete"
            okType="danger"
            cancelText="Cancel"
          >
            <Button type="text" icon={<DeleteOutlined />} style={{ color: '#ff4d4f' }} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Filter columns based on visibility settings
  const columns = allColumns.filter((col) => {
    if (col.key === 'id') return filters.showId;
    if (col.key === 'name') return filters.showName;
    if (col.key === 'organization') return filters.showOrganization;
    if (col.key === 'description') return filters.showDescription;
    if (col.key === 'default') return filters.showDefault;
    if (col.key === 'usersCount') return filters.showUsersCount;
    if (col.key === 'departmentsCount') return filters.showDepartmentsCount;
    if (col.key === 'createdAt') return filters.showCreatedOn;
    return true; // Always show actions column
  });

  const filteredLocations = locations.filter((location) => {
    if (!searchText) return true;

    const searchLower = searchText.toLowerCase();
    return (
      location.id.toLowerCase().includes(searchLower) ||
      location.name.toLowerCase().includes(searchLower) ||
      (location.description && location.description.toLowerCase().includes(searchLower))
    );
  });

  const handleTableChange = (pagination: TablePaginationConfig) => {
    setTableParams({
      pagination,
    });
  };

  const paginationConfig: TablePaginationConfig = {
    current: tableParams.pagination?.current || 1,
    pageSize: tableParams.pagination?.pageSize || 20,
    total: filteredLocations.length,
    showSizeChanger: true,
    pageSizeOptions: ['10', '20', '50', '100'],
    showTotal: (total, range) => `showing ${range[0]}-${range[1]} of ${total} items`,
  };

  const startIdx = ((paginationConfig.current || 1) - 1) * (paginationConfig.pageSize || 20);
  const endIdx = startIdx + (paginationConfig.pageSize || 20);
  const paginatedLocations = filteredLocations.slice(startIdx, endIdx);

  return (
    <div className="location-container">
      <div className="location-header">
        <Title level={2} style={{ margin: 0 }}>
          Locations
        </Title>
      </div>

      <div className="location-toolbar">
        <div className="toolbar-left">
          <Input
            placeholder="Search..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setTableParams({
                ...tableParams,
                pagination: {
                  ...(tableParams.pagination || {}),
                  current: 1,
                },
              });
            }}
            style={{ width: 250 }}
          />
        </div>

        <div className="toolbar-right">
          <Button
            type="default"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            Refresh
          </Button>
          <Button
            type="default"
            icon={<DownloadOutlined />}
            onClick={handleExport}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            Export
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            Create
          </Button>
          <Button
            type={hasHiddenColumns ? 'primary' : 'default'}
            icon={<FilterOutlined />}
            style={{ display: 'flex', alignItems: 'center' }}
            onClick={handleOpenFilterModal}
          />
        </div>
      </div>

      <div className="location-table-wrapper">
        <Table
          columns={columns}
          dataSource={paginatedLocations}
          rowKey="id"
          loading={loading}
          pagination={paginationConfig}
          onChange={handleTableChange}
          className="location-table"
          style={{ marginBottom: '16px' }}
        />
      </div>

      {/* Create/Edit Modal */}
      <Modal
        title={editingLocation ? 'Edit Location' : 'Create Location'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingLocation(null);
        }}
        onOk={handleSubmit}
        okText={editingLocation ? 'Update' : 'Create'}
      >
        <Form form={form} layout="vertical" style={{ marginTop: '24px' }}>
          <Form.Item
            label="Organization"
            name="organizationId"
            rules={[{ required: true, message: 'Please select an organization' }]}
          >
            <Select
              placeholder="Select Organization"
              options={organizations.map((org) => ({
                value: org.id,
                label: org.name,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: 'Please enter location name' }]}
          >
            <Input placeholder="Enter location name" />
          </Form.Item>

          <Form.Item label="Description" name="description">
            <Input placeholder="Enter description" />
          </Form.Item>
        </Form>
      </Modal>

      {/* View Location Modal */}
      <Modal
        title="Location Details"
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false);
          setViewingLocation(null);
          setIsViewModalEditing(false);
          viewForm.resetFields();
        }}
        footer={[
          <Button
            key="close-or-cancel"
            onClick={() => {
              if (isViewModalEditing) {
                handleViewModalCancel();
              } else {
                setViewModalVisible(false);
                setViewingLocation(null);
                viewForm.resetFields();
              }
            }}
          >
            {isViewModalEditing ? 'Cancel' : 'Close'}
          </Button>,
          !isViewModalEditing && (
            <Button key="edit" type="primary" onClick={handleViewModalEdit}>
              Edit
            </Button>
          ),
          isViewModalEditing && (
            <Button key="save" type="primary" onClick={handleViewModalSave}>
              Save
            </Button>
          ),
        ]}
        width={600}
      >
        {viewingLocation && (
          <Form form={viewForm} layout="vertical" style={{ marginTop: '24px' }}>
            <Form.Item
              label="Organization"
              name="organizationId"
              rules={[{ required: true, message: 'Please select an organization' }]}
            >
              <Select
                placeholder="Select Organization"
                disabled={!isViewModalEditing}
                options={organizations.map((org) => ({
                  value: org.id,
                  label: org.name,
                }))}
              />
            </Form.Item>

            <Form.Item
              label="Name"
              name="name"
              rules={[{ required: true, message: 'Please enter location name' }]}
            >
              <Input
                placeholder="Enter location name"
                disabled={!isViewModalEditing}
              />
            </Form.Item>

            <Form.Item label="Description" name="description">
              <TextArea
                placeholder="Enter location description (optional)"
                disabled={!isViewModalEditing}
                rows={4}
              />
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* Column Visibility Modal */}
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

          <Form.Item name="showOrganization" valuePropName="checked" style={{ marginBottom: '16px' }}>
            <Checkbox>Show Organization</Checkbox>
          </Form.Item>

          <Form.Item name="showDescription" valuePropName="checked" style={{ marginBottom: '16px' }}>
            <Checkbox>Show Description</Checkbox>
          </Form.Item>

          <Form.Item name="showDefault" valuePropName="checked" style={{ marginBottom: '16px' }}>
            <Checkbox>Show Default</Checkbox>
          </Form.Item>

          <Form.Item name="showUsersCount" valuePropName="checked" style={{ marginBottom: '16px' }}>
            <Checkbox>Show Users</Checkbox>
          </Form.Item>

          <Form.Item name="showDepartmentsCount" valuePropName="checked" style={{ marginBottom: '16px' }}>
            <Checkbox>Show Departments</Checkbox>
          </Form.Item>

          <Form.Item name="showCreatedOn" valuePropName="checked" style={{ marginBottom: '16px' }}>
            <Checkbox>Show Created On</Checkbox>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
