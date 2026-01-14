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

const { Title, Text } = Typography;
const { TextArea } = Input;

interface Organization {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  isDefault?: boolean;
}

interface FilterState {
  id: string;
  name: string;
  description: string;
  dateRange: [Dayjs | null, Dayjs | null] | null;
  enableId: boolean;
  enableName: boolean;
  enableDescription: boolean;
  enableDateRange: boolean;
}

export const Organization = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [isViewModalEditing, setIsViewModalEditing] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [viewingOrg, setViewingOrg] = useState<Organization | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    id: '',
    name: '',
    description: '',
    dateRange: null,
    enableId: false,
    enableName: false,
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
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      console.log('Fetching organizations...');
      const data = await settingsService.getOrganizations();
      console.log('Data received:', data);
      const formattedData = Array.isArray(data)
        ? data.map((org: any, index: number) => ({
            ...org,
            id: org.id || String(index),
            isDefault: org.name === 'Global Organization',
          }))
        : [];
      console.log('Formatted data:', formattedData);
      setOrganizations(formattedData);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      message.error('Failed to fetch organizations');
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingOrg(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (org: Organization) => {
    setEditingOrg(org);
    form.setFieldsValue({
      name: org.name,
      description: org.description,
    });
    setModalVisible(true);
  };

  const handleViewOrganization = (org: Organization) => {
    setViewingOrg(org);
    setIsViewModalEditing(false);
    viewForm.setFieldsValue({
      name: org.name,
      description: org.description,
    });
    setViewModalVisible(true);
  };

  const handleViewModalEdit = () => {
    setIsViewModalEditing(true);
  };

  const handleViewModalSave = async () => {
    try {
      const values = await viewForm.validateFields();

      if (viewingOrg) {
        await settingsService.updateOrganization(viewingOrg.id, values);
        message.success('Organization updated successfully');
        setViewModalVisible(false);
        setIsViewModalEditing(false);
        viewForm.resetFields();
        fetchOrganizations();
      }
    } catch (error) {
      message.error('Failed to update organization');
    }
  };

  const handleViewModalCancel = () => {
    setIsViewModalEditing(false);
    viewForm.setFieldsValue({
      name: viewingOrg?.name,
      description: viewingOrg?.description,
    });
  };

  const handleDelete = (org: Organization) => {
    if (org.isDefault) {
      message.error('Cannot delete the global organization');
      return;
    }

    Modal.confirm({
      title: 'Delete Organization',
      content: `Are you sure you want to delete "${org.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await settingsService.deleteOrganization(org.id);
          message.success(`Organization deleted successfully`);
          fetchOrganizations();
        } catch (error) {
          message.error('Failed to delete organization');
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingOrg) {
        await settingsService.updateOrganization(editingOrg.id, values);
        message.success('Organization updated successfully');
      } else {
        await settingsService.createOrganization(values);
        message.success('Organization created successfully');
      }

      setModalVisible(false);
      form.resetFields();
      fetchOrganizations();
    } catch (error) {
      message.error(`Failed to ${editingOrg ? 'update' : 'create'} organization`);
    }
  };

  const handleOpenFilterModal = () => {
    filterForm.setFieldsValue({
      id: filters.id,
      enableId: filters.enableId,
      name: filters.name,
      enableName: filters.enableName,
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
        description: values.description || '',
        dateRange: values.dateRange || null,
        enableId: values.enableId || false,
        enableName: values.enableName || false,
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
      description: '',
      dateRange: null,
      enableId: false,
      enableName: false,
      enableDescription: false,
      enableDateRange: false,
    });
    setPagination({ ...pagination, current: 1 });
    message.success('Filters reset');
  };

  const hasActiveFilters = filters.enableId || filters.enableName || filters.enableDescription || filters.enableDateRange;

  const handleExport = () => {
    const csvContent = [
      ['ID', 'Name', 'Description', 'Created On'],
      ...filteredOrganizations.map((org) => [
        org.id,
        org.name,
        org.description || '',
        org.createdAt || '',
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'organizations.csv';
    link.click();
    window.URL.revokeObjectURL(url);
    message.success('Organizations exported successfully');
  };

  const columns: ColumnsType<Organization> = [
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
      render: (text: string, record: Organization) => (
        <a href="#" onClick={(e) => {
          e.preventDefault();
          handleViewOrganization(record);
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
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title={record.isDefault ? 'Cannot delete default organization' : 'Delete'}>
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={record.isDefault}
              onClick={() => handleDelete(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const filteredOrganizations = organizations.filter((org) => {
    // Search filter
    const matchesSearch = org.name.toLowerCase().includes(searchText.toLowerCase()) ||
                         (org.description && org.description.toLowerCase().includes(searchText.toLowerCase()));

    // Advanced filters (only apply if enabled)
    const matchesId = !filters.enableId || !filters.id || org.id.toLowerCase().includes(filters.id.toLowerCase());
    const matchesName = !filters.enableName || !filters.name || org.name.toLowerCase().includes(filters.name.toLowerCase());
    const matchesDescription = !filters.enableDescription || !filters.description ||
                              (org.description && org.description.toLowerCase().includes(filters.description.toLowerCase()));

    let matchesDateRange = true;
    if (filters.enableDateRange && filters.dateRange && filters.dateRange[0] && filters.dateRange[1] && org.createdAt) {
      const orgDate = new Date(org.createdAt).getTime();
      const fromDate = filters.dateRange[0].toDate().getTime();
      const toDate = filters.dateRange[1].toDate().getTime();
      matchesDateRange = orgDate >= fromDate && orgDate <= toDate;
    }

    return matchesSearch && matchesId && matchesName && matchesDescription && matchesDateRange;
  });

  const paginatedData = filteredOrganizations.slice(
    (pagination.current! - 1) * pagination.pageSize!,
    pagination.current! * pagination.pageSize!
  );

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <Title level={2}>Organization</Title>
      </div>

      {/* Search and Action Controls */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Input
          placeholder="Search by name or description"
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
              onClick={() => fetchOrganizations()}
              loading={loading}
            />
          </Tooltip>

          <Tooltip title="Export">
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
              disabled={organizations.length === 0}
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
          total: filteredOrganizations.length,
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
        title={editingOrg ? 'Edit Organization' : 'Create Organization'}
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
            {editingOrg ? 'Update' : 'Create'} Organization
          </Button>,
        ]}
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: '24px' }}>
          <Form.Item
            label="Organization Name"
            name="name"
            rules={[
              { required: true, message: 'Please enter organization name' },
              { min: 2, message: 'Name must be at least 2 characters' },
            ]}
          >
            <Input
              placeholder="Enter organization name"
              disabled={editingOrg?.isDefault}
            />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
          >
            <TextArea
              rows={4}
              placeholder="Enter organization description (optional)"
              disabled={editingOrg?.isDefault}
            />
          </Form.Item>

          {editingOrg?.isDefault && (
            <Text type="warning">
              Note: The Global Organization is a system default and cannot be modified.
            </Text>
          )}
        </Form>
      </Modal>

      {/* View Organization Modal */}
      <Modal
        title="Organization Details"
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false);
          setViewingOrg(null);
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
                setViewingOrg(null);
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
              disabled={viewingOrg?.isDefault}
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
        {viewingOrg && (
          <Form form={viewForm} layout="vertical" style={{ marginTop: '24px' }}>
            <Form.Item
              label="Organization Name"
              name="name"
              rules={[
                { required: true, message: 'Please enter organization name' },
                { min: 2, message: 'Name must be at least 2 characters' },
              ]}
            >
              <Input
                placeholder="Enter organization name"
                disabled={!isViewModalEditing || viewingOrg.isDefault}
              />
            </Form.Item>

            <Form.Item
              label="Description"
              name="description"
            >
              <TextArea
                placeholder="Enter organization description (optional)"
                disabled={!isViewModalEditing || viewingOrg.isDefault}
                rows={4}
              />
            </Form.Item>

            {viewingOrg.isDefault && (
              <Text type="warning">
                Note: The Global Organization is a system default and cannot be modified.
              </Text>
            )}
          </Form>
        )}
      </Modal>

      {/* Filter Modal */}
      <Modal
        title="Filter Organizations"
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
    </div>
  );
};
