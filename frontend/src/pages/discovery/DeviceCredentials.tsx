import { useState, useEffect } from 'react';
import {
  Table,
  Input,
  Button,
  Modal,
  Form,
  message,
  Space,
  Typography,
  Tooltip,
  Select,
  Checkbox,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  DownloadOutlined,
  FilterOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { discoveryService } from '../../services/discovery.service';
import type { DeviceCredential, CredentialFilterState } from '../../types/discovery.types';

const { Title, Text } = Typography;

export const DeviceCredentials = () => {
  // Data
  const [credentials, setCredentials] = useState<DeviceCredential[]>([]);
  const [loading, setLoading] = useState(false);

  // Search & Filters
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<CredentialFilterState>({
    showId: true,
    showName: true,
    showType: true,
    showUsername: true,
    showLastUsed: true,
  });

  // Modal visibility
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Edit states
  const [editingCred, setEditingCred] = useState<DeviceCredential | null>(null);
  const [viewingCred, setViewingCred] = useState<DeviceCredential | null>(null);
  const [isViewModalEditing, setIsViewModalEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Forms
  const [form] = Form.useForm();
  const [viewForm] = Form.useForm();
  const [filterForm] = Form.useForm();

  // Pagination
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    pageSize: 20,
    current: 1,
  });

  useEffect(() => {
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    setLoading(true);
    try {
      const data = await discoveryService.getCredentials();
      setCredentials(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error('Failed to fetch credentials');
      setCredentials([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingCred(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (cred: DeviceCredential) => {
    setEditingCred(cred);
    form.setFieldsValue(cred);
    setModalVisible(true);
  };

  const handleViewItem = (cred: DeviceCredential) => {
    setViewingCred(cred);
    setIsViewModalEditing(false);
    setShowPassword(false);
    viewForm.setFieldsValue(cred);
    setViewModalVisible(true);
  };

  const handleDelete = (cred: DeviceCredential) => {
    Modal.confirm({
      title: 'Delete Credential',
      content: `Are you sure you want to delete "${cred.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await discoveryService.deleteCredential(cred.id);
          message.success('Credential deleted successfully');
          fetchCredentials();
        } catch (error) {
          message.error('Failed to delete credential');
        }
      },
    });
  };

  const handleTestCredential = async (cred: DeviceCredential) => {
    try {
      await discoveryService.testCredential(cred.id);
      message.success('Credential test passed');
    } catch (error) {
      message.error('Credential test failed');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingCred) {
        await discoveryService.updateCredential(editingCred.id, values);
        message.success('Credential updated successfully');
      } else {
        await discoveryService.createCredential(values);
        message.success('Credential created successfully');
      }

      setModalVisible(false);
      form.resetFields();
      fetchCredentials();
    } catch (error) {
      message.error(`Failed to ${editingCred ? 'update' : 'create'} credential`);
    }
  };

  const handleViewModalEdit = () => {
    setIsViewModalEditing(true);
  };

  const handleViewModalCancel = () => {
    if (viewingCred) {
      viewForm.setFieldsValue(viewingCred);
    }
    setIsViewModalEditing(false);
    setShowPassword(false);
  };

  const handleViewModalSave = async () => {
    try {
      const values = await viewForm.validateFields();
      if (viewingCred) {
        await discoveryService.updateCredential(viewingCred.id, values);
        message.success('Credential updated successfully');
        setViewModalVisible(false);
        setViewingCred(null);
        setIsViewModalEditing(false);
        setShowPassword(false);
        viewForm.resetFields();
        fetchCredentials();
      }
    } catch (error) {
      message.error('Failed to update credential');
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['ID', 'Name', 'Type', 'Username', 'Last Used'],
      ...filteredCredentials.map((cred) => [
        cred.id,
        cred.name,
        cred.type,
        cred.username,
        cred.lastUsed || '—',
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'credentials.csv';
    link.click();
    window.URL.revokeObjectURL(url);
    message.success('Credentials exported successfully');
  };

  const handleOpenFilterModal = () => {
    filterForm.setFieldsValue(filters);
    setFilterModalVisible(true);
  };

  const handleApplyFilters = () => {
    const values = filterForm.getFieldsValue();
    setFilters({
      showId: values.showId !== undefined ? values.showId : true,
      showName: values.showName !== undefined ? values.showName : true,
      showType: values.showType !== undefined ? values.showType : true,
      showUsername: values.showUsername !== undefined ? values.showUsername : true,
      showLastUsed: values.showLastUsed !== undefined ? values.showLastUsed : true,
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
      showType: true,
      showUsername: true,
      showLastUsed: true,
    });
    setPagination({ ...pagination, current: 1 });
    message.success('All columns shown');
  };

  const hasHiddenColumns = !filters.showId || !filters.showName || !filters.showType || !filters.showUsername || !filters.showLastUsed;

  const allColumns: ColumnsType<DeviceCredential> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
      sorter: (a, b) => parseInt(a.id) - parseInt(b.id),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text: string, record: DeviceCredential) => (
        <a href="#" onClick={(e) => {
          e.preventDefault();
          handleViewItem(record);
        }}>
          {text}
        </a>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      filters: [
        { text: 'SSH', value: 'SSH' },
        { text: 'Windows', value: 'Windows' },
        { text: 'SNMP', value: 'SNMP' },
      ],
      onFilter: (value, record) => record.type === value,
    },
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
      render: (text: string) => text || '—',
    },
    {
      title: 'Last Used',
      dataIndex: 'lastUsed',
      key: 'lastUsed',
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
      width: 120,
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

  const columns = allColumns.filter((col) => {
    if (col.key === 'id') return filters.showId;
    if (col.key === 'name') return filters.showName;
    if (col.key === 'type') return filters.showType;
    if (col.key === 'username') return filters.showUsername;
    if (col.key === 'lastUsed') return filters.showLastUsed;
    return true;
  });

  const filteredCredentials = credentials.filter((cred) => {
    if (!searchText) return true;

    const searchLower = searchText.toLowerCase();
    return (
      cred.id.toLowerCase().includes(searchLower) ||
      cred.name.toLowerCase().includes(searchLower) ||
      cred.username.toLowerCase().includes(searchLower) ||
      (cred.description && cred.description.toLowerCase().includes(searchLower))
    );
  });

  const paginatedData = filteredCredentials.slice(
    (pagination.current! - 1) * pagination.pageSize!,
    pagination.current! * pagination.pageSize!
  );

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <Title level={2}>Device Credentials</Title>
      </div>

      {/* Toolbar */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Input
          placeholder="Search"
          prefix={<SearchOutlined />}
          style={{ width: 320 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Tooltip title="Refresh">
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={fetchCredentials}
              loading={loading}
            />
          </Tooltip>
          <Tooltip title="Export">
            <Button type="text" icon={<DownloadOutlined />} onClick={handleExport} />
          </Tooltip>
          <Tooltip title="Filter columns">
            <Button
              type="text"
              icon={<FilterOutlined />}
              onClick={handleOpenFilterModal}
              style={{ color: hasHiddenColumns ? '#1890ff' : undefined }}
            />
          </Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Add Credential
          </Button>
        </div>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={paginatedData}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: pagination.pageSize,
          current: pagination.current,
          total: filteredCredentials.length,
          onChange: (page, pageSize) => {
            setPagination({ current: page, pageSize });
          },
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) =>
            `showing ${range[0]}–${range[1]} of ${total} items`,
        }}
      />

      {/* Create/Edit Modal */}
      <Modal
        title={editingCred ? 'Edit Credential' : 'Add Credential'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setModalVisible(false);
            form.resetFields();
          }}>
            Cancel
          </Button>,
          <Button key="submit" type="primary" onClick={handleSubmit}>
            {editingCred ? 'Update' : 'Add'} Credential
          </Button>,
        ]}
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: '24px' }}>
          <Form.Item
            name="name"
            label="Credential Name"
            rules={[{ required: true, message: 'Please enter credential name' }]}
          >
            <Input placeholder="e.g., Windows Admin" />
          </Form.Item>

          <Form.Item
            name="type"
            label="Credential Type"
            rules={[{ required: true, message: 'Please select credential type' }]}
          >
            <Select placeholder="Select type">
              <Select.Option value="SSH">SSH</Select.Option>
              <Select.Option value="Windows">Windows</Select.Option>
              <Select.Option value="SNMP">SNMP</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: 'Please enter username' }]}
          >
            <Input placeholder="e.g., admin" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Please enter password' }]}
          >
            <Input.Password placeholder="Enter password" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea placeholder="Optional description" rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* View Modal */}
      <Modal
        title="Credential Details"
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false);
          setViewingCred(null);
          setIsViewModalEditing(false);
          setShowPassword(false);
          viewForm.resetFields();
        }}
        footer={[
          <Button key="close-or-cancel" onClick={() => {
            if (isViewModalEditing) {
              handleViewModalCancel();
            } else {
              setViewModalVisible(false);
              setViewingCred(null);
              setShowPassword(false);
              viewForm.resetFields();
            }
          }}>
            {isViewModalEditing ? 'Cancel' : 'Close'}
          </Button>,
          !isViewModalEditing && (
            <Button key="test" onClick={() => viewingCred && handleTestCredential(viewingCred)}>
              Test Credential
            </Button>
          ),
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
        <Form form={viewForm} layout="vertical" style={{ marginTop: '24px' }}>
          <Form.Item
            name="name"
            label="Credential Name"
            rules={[{ required: true, message: 'Please enter credential name' }]}
          >
            <Input disabled={!isViewModalEditing} />
          </Form.Item>

          <Form.Item
            name="type"
            label="Credential Type"
            rules={[{ required: true, message: 'Please select credential type' }]}
          >
            <Select disabled={!isViewModalEditing}>
              <Select.Option value="SSH">SSH</Select.Option>
              <Select.Option value="Windows">Windows</Select.Option>
              <Select.Option value="SNMP">SNMP</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: 'Please enter username' }]}
          >
            <Input disabled={!isViewModalEditing} />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Please enter password' }]}
          >
            <Input
              type={showPassword ? 'text' : 'password'}
              disabled={!isViewModalEditing}
              suffix={
                !isViewModalEditing ? (
                  <Button
                    type="text"
                    size="small"
                    icon={showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                    onClick={() => setShowPassword(!showPassword)}
                  />
                ) : null
              }
            />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea disabled={!isViewModalEditing} rows={3} />
          </Form.Item>

          <Form.Item label="Last Used">
            <Text type="secondary">
              {viewingCred?.lastUsed
                ? new Date(viewingCred.lastUsed).toLocaleString()
                : '—'}
            </Text>
          </Form.Item>
        </Form>
      </Modal>

      {/* Filter Modal */}
      <Modal
        title="Show/Hide Columns"
        open={filterModalVisible}
        onCancel={() => setFilterModalVisible(false)}
        footer={[
          <Button key="reset" onClick={handleResetFilters}>
            Show All
          </Button>,
          <Button key="cancel" onClick={() => setFilterModalVisible(false)}>
            Cancel
          </Button>,
          <Button key="apply" type="primary" onClick={handleApplyFilters}>
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
          <Form.Item name="showType" valuePropName="checked" style={{ marginBottom: '16px' }}>
            <Checkbox>Show Type</Checkbox>
          </Form.Item>
          <Form.Item name="showUsername" valuePropName="checked" style={{ marginBottom: '16px' }}>
            <Checkbox>Show Username</Checkbox>
          </Form.Item>
          <Form.Item name="showLastUsed" valuePropName="checked" style={{ marginBottom: '16px' }}>
            <Checkbox>Show Last Used</Checkbox>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
