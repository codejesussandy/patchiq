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
  DatePicker,
  Select,
  Checkbox,
} from 'antd';
import {
  SearchOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  DownloadOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import { settingsService } from '../../services/settings.service';

const { Title } = Typography;
const { TextArea } = Input;

interface Department {
  id: string;
  name: string;
  description?: string;
  organization?: string;
  createdAt?: string;
}

interface Organization {
  id: string;
  name: string;
  description?: string;
}

interface FilterState {
  id: string;
  name: string;
  organization: string;
  description: string;
  dateRange: [Dayjs | null, Dayjs | null] | null;
  enableId: boolean;
  enableName: boolean;
  enableOrganization: boolean;
  enableDescription: boolean;
  enableDateRange: boolean;
}

export const Department = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [isViewModalEditing, setIsViewModalEditing] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [viewingDept, setViewingDept] = useState<Department | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    id: '',
    name: '',
    organization: '',
    description: '',
    dateRange: null,
    enableId: false,
    enableName: false,
    enableOrganization: false,
    enableDescription: false,
    enableDateRange: false,
  });
  const [form] = Form.useForm();
  const [viewForm] = Form.useForm();
  const [filterForm] = Form.useForm();
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    pageSize: 20,
    current: 1,
  });

  useEffect(() => {
    fetchDepartments();
    fetchOrganizations();
  }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const data = await settingsService.getDepartments();
      setDepartments(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error('Failed to fetch departments');
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const data = await settingsService.getOrganizations();
      setOrganizations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    }
  };

  const handleCreate = () => {
    setEditingDept(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (dept: Department) => {
    setEditingDept(dept);
    form.setFieldsValue({
      name: dept.name,
      organization: dept.organization,
      description: dept.description,
    });
    setModalVisible(true);
  };

  const handleViewDepartment = (dept: Department) => {
    setViewingDept(dept);
    setIsViewModalEditing(false);
    viewForm.setFieldsValue({
      name: dept.name,
      organization: dept.organization,
      description: dept.description,
    });
    setViewModalVisible(true);
  };

  const handleViewModalEdit = () => {
    setIsViewModalEditing(true);
  };

  const handleViewModalSave = async () => {
    try {
      const values = await viewForm.validateFields();

      if (viewingDept) {
        await settingsService.updateDepartment(viewingDept.id, values);
        message.success('Department updated successfully');
        setViewModalVisible(false);
        setIsViewModalEditing(false);
        viewForm.resetFields();
        fetchDepartments();
      }
    } catch (error) {
      message.error('Failed to update department');
    }
  };

  const handleViewModalCancel = () => {
    setIsViewModalEditing(false);
    viewForm.setFieldsValue({
      name: viewingDept?.name,
      organization: viewingDept?.organization,
      description: viewingDept?.description,
    });
  };

  const handleDelete = (dept: Department) => {
    Modal.confirm({
      title: 'Delete Department',
      content: `Are you sure you want to delete "${dept.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await settingsService.deleteDepartment(dept.id);
          message.success('Department deleted successfully');
          fetchDepartments();
        } catch (error) {
          message.error('Failed to delete department');
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingDept) {
        await settingsService.updateDepartment(editingDept.id, values);
        message.success('Department updated successfully');
      } else {
        await settingsService.createDepartment(values);
        message.success('Department created successfully');
      }

      setModalVisible(false);
      form.resetFields();
      fetchDepartments();
    } catch (error) {
      message.error(`Failed to ${editingDept ? 'update' : 'create'} department`);
    }
  };

  const handleOpenFilterModal = () => {
    filterForm.setFieldsValue({
      id: filters.id,
      enableId: filters.enableId,
      name: filters.name,
      enableName: filters.enableName,
      organization: filters.organization,
      enableOrganization: filters.enableOrganization,
      description: filters.description,
      enableDescription: filters.enableDescription,
      dateRange: filters.dateRange,
      enableDateRange: filters.enableDateRange,
    });
    setFilterModalVisible(true);
  };

  const handleApplyFilters = async () => {
    try {
      const values = await filterForm.validateFields();
      setFilters({
        id: values.id || '',
        name: values.name || '',
        organization: values.organization || '',
        description: values.description || '',
        dateRange: values.dateRange || null,
        enableId: values.enableId || false,
        enableName: values.enableName || false,
        enableOrganization: values.enableOrganization || false,
        enableDescription: values.enableDescription || false,
        enableDateRange: values.enableDateRange || false,
      });
      setPagination({ ...pagination, current: 1 });
      setFilterModalVisible(false);
      message.success('Filters applied');
    } catch (error) {
      message.error('Please fill valid filter criteria');
    }
  };

  const handleResetFilters = () => {
    filterForm.resetFields();
    setFilters({
      id: '',
      name: '',
      organization: '',
      description: '',
      dateRange: null,
      enableId: false,
      enableName: false,
      enableOrganization: false,
      enableDescription: false,
      enableDateRange: false,
    });
    setPagination({ ...pagination, current: 1 });
    message.success('Filters reset');
  };

  const hasActiveFilters = filters.enableId || filters.enableName || filters.enableOrganization || filters.enableDescription || filters.enableDateRange;

  const handleExport = () => {
    const csvContent = [
      ['ID', 'Name', 'Description', 'Organization', 'Created On'],
      ...filteredDepartments.map((dept) => [
        dept.id,
        dept.name,
        dept.description || '',
        dept.organization || '',
        dept.createdAt || '',
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'departments.csv';
    link.click();
    window.URL.revokeObjectURL(url);
    message.success('Departments exported successfully');
  };

  const columns: ColumnsType<Department> = [
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
      render: (text: string, record: Department) => (
        <a href="#" onClick={(e) => {
          e.preventDefault();
          handleViewDepartment(record);
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
      title: 'Organization',
      dataIndex: 'organization',
      key: 'organization',
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
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
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

  const filteredDepartments = departments.filter((dept) => {
    // Search filter
    const matchesSearch = dept.name.toLowerCase().includes(searchText.toLowerCase()) ||
                         (dept.description && dept.description.toLowerCase().includes(searchText.toLowerCase())) ||
                         (dept.organization && dept.organization.toLowerCase().includes(searchText.toLowerCase()));

    // Advanced filters (only apply if enabled)
    const matchesId = !filters.enableId || !filters.id || dept.id.toLowerCase().includes(filters.id.toLowerCase());
    const matchesName = !filters.enableName || !filters.name || dept.name.toLowerCase().includes(filters.name.toLowerCase());
    const matchesOrganization = !filters.enableOrganization || !filters.organization ||
                                (dept.organization && dept.organization.toLowerCase().includes(filters.organization.toLowerCase()));
    const matchesDescription = !filters.enableDescription || !filters.description ||
                              (dept.description && dept.description.toLowerCase().includes(filters.description.toLowerCase()));

    let matchesDateRange = true;
    if (filters.enableDateRange && filters.dateRange && filters.dateRange[0] && filters.dateRange[1] && dept.createdAt) {
      const deptDate = new Date(dept.createdAt).getTime();
      const fromDate = filters.dateRange[0].toDate().getTime();
      const toDate = filters.dateRange[1].toDate().getTime();
      matchesDateRange = deptDate >= fromDate && deptDate <= toDate;
    }

    return matchesSearch && matchesId && matchesName && matchesOrganization && matchesDescription && matchesDateRange;
  });

  const paginatedData = filteredDepartments.slice(
    (pagination.current! - 1) * pagination.pageSize!,
    pagination.current! * pagination.pageSize!
  );

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <Title level={2}>Department</Title>
      </div>

      {/* Search and Action Controls */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Input
          placeholder="Search by name, description or organization"
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
              onClick={() => fetchDepartments()}
              loading={loading}
            />
          </Tooltip>

          <Tooltip title="Export">
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
              disabled={departments.length === 0}
            />
          </Tooltip>

          <Tooltip title={hasActiveFilters ? `${Object.values(filters).filter(v => v).length} filter(s) active` : 'Filter'}>
            <Button
              icon={<FilterOutlined />}
              onClick={handleOpenFilterModal}
              type={hasActiveFilters ? 'primary' : 'default'}
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
          total: filteredDepartments.length,
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

      {/* Create/Edit Modal */}
      <Modal
        title={editingDept ? 'Edit Department' : 'Create Department'}
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
            Cancel
          </Button>,
          <Button key="submit" type="primary" onClick={handleSubmit}>
            {editingDept ? 'Update' : 'Create'} Department
          </Button>,
        ]}
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: '24px' }}>
          <Form.Item
            label="Organization"
            name="organization"
            rules={[{ required: true, message: 'Please select an organization' }]}
          >
            <Select
              placeholder="Select Organization"
              options={organizations.map((org) => ({
                value: org.name,
                label: org.name,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="Department Name"
            name="name"
            rules={[{ required: true, message: 'Please enter department name' }]}
          >
            <Input placeholder="Enter department name" />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
          >
            <TextArea rows={4} placeholder="Enter description (optional)" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Filter Modal */}
      <Modal
        title="Filter Departments"
        open={filterModalVisible}
        onCancel={() => {
          setFilterModalVisible(false);
        }}
        footer={[
          <Button
            key="reset"
            onClick={handleResetFilters}
            disabled={!hasActiveFilters}
          >
            Reset Filters
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
            Apply Filters
          </Button>,
        ]}
        width={600}
      >
        <Form form={filterForm} layout="vertical" style={{ marginTop: '24px' }}>
          <Form.Item style={{ marginBottom: '16px' }}>
            <Form.Item name="enableId" valuePropName="checked" style={{ margin: 0, marginBottom: '8px' }}>
              <Checkbox>Filter by ID</Checkbox>
            </Form.Item>
            <Form.Item name="id" style={{ margin: 0 }}>
              <Input
                placeholder="Enter ID to filter"
                disabled={!filterForm.getFieldValue('enableId')}
              />
            </Form.Item>
          </Form.Item>

          <Form.Item style={{ marginBottom: '16px' }}>
            <Form.Item name="enableName" valuePropName="checked" style={{ margin: 0, marginBottom: '8px' }}>
              <Checkbox>Filter by Name</Checkbox>
            </Form.Item>
            <Form.Item name="name" style={{ margin: 0 }}>
              <Input
                placeholder="Enter name to filter"
                disabled={!filterForm.getFieldValue('enableName')}
              />
            </Form.Item>
          </Form.Item>

          <Form.Item style={{ marginBottom: '16px' }}>
            <Form.Item name="enableOrganization" valuePropName="checked" style={{ margin: 0, marginBottom: '8px' }}>
              <Checkbox>Filter by Organization</Checkbox>
            </Form.Item>
            <Form.Item name="organization" style={{ margin: 0 }}>
              <Select
                placeholder="Select organization to filter"
                allowClear
                disabled={!filterForm.getFieldValue('enableOrganization')}
                options={organizations.map((org) => ({
                  value: org.name,
                  label: org.name,
                }))}
              />
            </Form.Item>
          </Form.Item>

          <Form.Item style={{ marginBottom: '16px' }}>
            <Form.Item name="enableDescription" valuePropName="checked" style={{ margin: 0, marginBottom: '8px' }}>
              <Checkbox>Filter by Description</Checkbox>
            </Form.Item>
            <Form.Item name="description" style={{ margin: 0 }}>
              <Input
                placeholder="Enter description to filter"
                disabled={!filterForm.getFieldValue('enableDescription')}
              />
            </Form.Item>
          </Form.Item>

          <Form.Item>
            <Form.Item name="enableDateRange" valuePropName="checked" style={{ margin: 0, marginBottom: '8px' }}>
              <Checkbox>Filter by Date Range</Checkbox>
            </Form.Item>
            <Form.Item name="dateRange" style={{ margin: 0 }}>
              <DatePicker.RangePicker
                style={{ width: '100%' }}
                disabled={!filterForm.getFieldValue('enableDateRange')}
              />
            </Form.Item>
          </Form.Item>
        </Form>
      </Modal>

      {/* View Department Modal */}
      <Modal
        title="Department Details"
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false);
          setViewingDept(null);
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
                setViewingDept(null);
                viewForm.resetFields();
              }
            }}
          >
            {isViewModalEditing ? 'Cancel' : 'Close'}
          </Button>,
          !isViewModalEditing && (
            <Button
              key="edit"
              type="primary"
              onClick={handleViewModalEdit}
            >
              Edit
            </Button>
          ),
          isViewModalEditing && (
            <Button
              key="save"
              type="primary"
              onClick={handleViewModalSave}
            >
              Save
            </Button>
          ),
        ]}
        width={600}
      >
        {viewingDept && (
          <Form form={viewForm} layout="vertical" style={{ marginTop: '24px' }}>
            <Form.Item
              label="Organization"
              name="organization"
              rules={[{ required: true, message: 'Please select an organization' }]}
            >
              <Select
                placeholder="Select Organization"
                disabled={!isViewModalEditing}
                options={organizations.map((org) => ({
                  value: org.name,
                  label: org.name,
                }))}
              />
            </Form.Item>

            <Form.Item
              label="Department Name"
              name="name"
              rules={[{ required: true, message: 'Please enter department name' }]}
            >
              <Input
                placeholder="Enter department name"
                disabled={!isViewModalEditing}
              />
            </Form.Item>

            <Form.Item
              label="Description"
              name="description"
            >
              <TextArea
                placeholder="Enter description (optional)"
                disabled={!isViewModalEditing}
                rows={4}
              />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
};
