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
  showId: boolean;
  showName: boolean;
  showDescription: boolean;
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
    showId: true,
    showName: true,
    showDescription: true,
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
      const data = await settingsService.getOrganizations();
      const formattedData = Array.isArray(data)
        ? data.map((org: any, index: number) => ({
            ...org,
            id: org.id || String(index),
            isDefault: org.name === 'Global Organization',
          }))
        : [];
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

  const allColumns: ColumnsType<Organization> = [
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

  const columns = allColumns.filter((col) => {
    if (col.key === 'id') return filters.showId;
    if (col.key === 'name') return filters.showName;
    if (col.key === 'description') return filters.showDescription;
    return true; // Always show actions column
  });

  const filteredOrganizations = organizations.filter((org) => {
    if (!searchText) return true;

    const searchLower = searchText.toLowerCase();
    return (
      org.id.toLowerCase().includes(searchLower) ||
      org.name.toLowerCase().includes(searchLower) ||
      (org.description && org.description.toLowerCase().includes(searchLower))
    );
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
