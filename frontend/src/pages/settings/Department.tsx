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
  enableId: boolean;
  enableName: boolean;
  enableOrganization: boolean;
  enableDescription: boolean;
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
    enableId: true,
    enableName: true,
    enableOrganization: true,
    enableDescription: true,
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
      enableId: filters.enableId,
      enableName: filters.enableName,
      enableOrganization: filters.enableOrganization,
      enableDescription: filters.enableDescription,
    });
    setFilterModalVisible(true);
  };

  const handleApplyFilters = () => {
    const values = filterForm.getFieldsValue();
    setFilters({
      enableId: values.enableId !== undefined ? values.enableId : true,
      enableName: values.enableName !== undefined ? values.enableName : true,
      enableOrganization: values.enableOrganization !== undefined ? values.enableOrganization : true,
      enableDescription: values.enableDescription !== undefined ? values.enableDescription : true,
    });
    setPagination({ ...pagination, current: 1 });
    setFilterModalVisible(false);
    message.success('Filters applied');
  };

  const handleResetFilters = () => {
    filterForm.resetFields();
    setFilters({
      enableId: true,
      enableName: true,
      enableOrganization: true,
      enableDescription: true,
    });
    setPagination({ ...pagination, current: 1 });
    message.success('Filters reset');
  };

  const hasActiveFilters = filters.enableId || filters.enableName || filters.enableOrganization || filters.enableDescription;

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
    // If no search text, show all items
    if (!searchText) return true;

    const searchLower = searchText.toLowerCase();

    // Only search in fields that are enabled in filters
    if (!filters.enableId && !filters.enableName && !filters.enableOrganization && !filters.enableDescription) return false;

    let matches = false;
    if (filters.enableId && dept.id.toLowerCase().includes(searchLower)) matches = true;
    if (filters.enableName && dept.name.toLowerCase().includes(searchLower)) matches = true;
    if (filters.enableOrganization && dept.organization && dept.organization.toLowerCase().includes(searchLower)) matches = true;
    if (filters.enableDescription && dept.description && dept.description.toLowerCase().includes(searchLower)) matches = true;

    return matches;
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
        width={400}
      >
        <Form form={filterForm} layout="vertical" style={{ marginTop: '24px' }}>
          <Form.Item name="enableId" valuePropName="checked" style={{ marginBottom: '16px' }}>
            <Checkbox>Filter by ID</Checkbox>
          </Form.Item>

          <Form.Item name="enableName" valuePropName="checked" style={{ marginBottom: '16px' }}>
            <Checkbox>Filter by Name</Checkbox>
          </Form.Item>

          <Form.Item name="enableOrganization" valuePropName="checked" style={{ marginBottom: '16px' }}>
            <Checkbox>Filter by Organization</Checkbox>
          </Form.Item>

          <Form.Item name="enableDescription" valuePropName="checked" style={{ marginBottom: '16px' }}>
            <Checkbox>Filter by Description</Checkbox>
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
