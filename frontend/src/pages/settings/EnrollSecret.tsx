import { useState, useEffect } from 'react';
import {
  Table,
  Input,
  Button,
  Typography,
  message,
  Space,
  Tooltip,
  Popconfirm,
  Modal,
  Form,
  Select,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  FileTextOutlined,
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { settingsService } from '../../services/settings.service';
import type { EnrollSecret as EnrollSecretType } from '../../types/settings.types';

const { Title } = Typography;

export const EnrollSecret = () => {
  const [secrets, setSecrets] = useState<EnrollSecretType[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedSecret, setSelectedSecret] = useState<EnrollSecretType | null>(null);
  const [form] = Form.useForm();
  const [viewForm] = Form.useForm();
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    pageSize: 10,
    current: 1,
  });

  useEffect(() => {
    fetchEnrollSecrets();
    fetchOrganizationsAndDepartments();
  }, []);

  const fetchOrganizationsAndDepartments = async () => {
    try {
      const [orgs, depts] = await Promise.all([
        settingsService.getOrganizations(),
        settingsService.getDepartments(),
      ]);
      setOrganizations(orgs || []);
      setDepartments(depts || []);
    } catch (error) {
      console.error('Error fetching organizations and departments:', error);
    }
  };

  const fetchEnrollSecrets = async () => {
    setLoading(true);
    try {
      const data = await settingsService.getEnrollSecrets();
      const formattedData = Array.isArray(data)
        ? data.map((secret: EnrollSecretType) => ({
            ...secret,
            key: secret.id,
          }))
        : [];
      setSecrets(formattedData);
    } catch (error) {
      console.error('Error fetching enroll secrets:', error);
      message.error('Failed to fetch enroll secrets');
      setSecrets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchEnrollSecrets();
  };

  const handleExport = () => {
    if (filteredSecrets.length === 0) {
      message.warning('No data to export');
      return;
    }

    // Prepare CSV headers
    const headers = ['Name', 'Secret', 'Organization', 'Department', 'Created On'];

    // Prepare CSV rows
    const rows = filteredSecrets.map((secret) => [
      secret.name,
      secret.secret,
      secret.organization,
      secret.department,
      new Date(secret.createdOn).toLocaleString(),
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `enroll-secrets-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('Enroll secrets exported successfully');
  };

  const handleOpenCreateModal = () => {
    form.resetFields();
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    form.resetFields();
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      await settingsService.createEnrollSecret({
        name: values.name,
        secret: `${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}`,
        organization: values.organization,
        department: values.department,
      });

      message.success('Enroll secret created successfully');
      handleModalClose();
      fetchEnrollSecrets();
    } catch (error) {
      console.error('Error creating enroll secret:', error);
      if (error instanceof Error && 'errorFields' in error) {
        // Form validation error, already shown by Form component
      } else {
        message.error('Failed to create enroll secret');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
  };

  const handleOpenViewModal = (secret: EnrollSecretType) => {
    setSelectedSecret(secret);
    viewForm.setFieldsValue({
      name: secret.name,
      secret: secret.secret,
      organization: secret.organization,
      department: secret.department,
    });
    setViewModalVisible(true);
  };

  const handleViewModalClose = () => {
    setViewModalVisible(false);
    setSelectedSecret(null);
    viewForm.resetFields();
  };

  const handleDelete = async (id: string) => {
    try {
      await settingsService.deleteEnrollSecret(id);
      message.success('Enroll secret deleted successfully');
      fetchEnrollSecrets();
    } catch (error) {
      console.error('Error deleting enroll secret:', error);
      message.error('Failed to delete enroll secret');
    }
  };

  const filteredSecrets = secrets.filter((secret) =>
    Object.values(secret).some((value) =>
      String(value).toLowerCase().includes(searchText.toLowerCase())
    )
  );

  const columns: ColumnsType<EnrollSecretType> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: EnrollSecretType) => (
        <span
          style={{ color: '#1890ff', cursor: 'pointer' }}
          onClick={() => handleOpenViewModal(record)}
        >
          {name}
        </span>
      ),
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Secret',
      dataIndex: 'secret',
      key: 'secret',
      render: (secret: string) => {
        // Mask the secret, show first 5 and last 5 characters
        const masked =
          secret.length > 10
            ? `${secret.substring(0, 5)}${'*'.repeat(secret.length - 10)}${secret.substring(secret.length - 5)}`
            : '*'.repeat(secret.length);
        return <span>{masked}</span>;
      },
    },
    {
      title: 'Organization',
      dataIndex: 'organization',
      key: 'organization',
      sorter: (a, b) => a.organization.localeCompare(b.organization),
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      sorter: (a, b) => a.department.localeCompare(b.department),
    },
    {
      title: 'Created On',
      dataIndex: 'createdOn',
      key: 'createdOn',
      render: (date: string) => {
        return new Date(date).toLocaleString();
      },
      sorter: (a, b) =>
        new Date(a.createdOn).getTime() - new Date(b.createdOn).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_text: any, record: EnrollSecretType) => (
        <Tooltip title="Delete">
          <Popconfirm
            title="Delete Enroll Secret"
            description="Are you sure you want to delete this enroll secret?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Tooltip>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '32px' }}>
        <Title level={2}>Enroll Secret</Title>
      </div>

      {/* Search and Actions Bar */}
      <div
        style={{
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <Input
          placeholder="Search"
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: '250px' }}
        />

        <Space>
          <Button onClick={handleRefresh} icon={<ReloadOutlined />}>
            Refresh
          </Button>
          <Button onClick={handleExport} icon={<FileTextOutlined />}>
            Export
          </Button>
          <Button
            type="primary"
            onClick={handleOpenCreateModal}
            icon={<PlusOutlined />}
          >
            Create
          </Button>
        </Space>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={filteredSecrets}
        loading={loading}
        pagination={pagination}
        onChange={(newPagination) => setPagination(newPagination)}
        rowKey="id"
        size="small"
        style={{ backgroundColor: 'white', borderRadius: '4px' }}
      />

      {/* Create Modal */}
      <Modal
        title="Create Enroll Secret"
        open={modalVisible}
        width={600}
        onCancel={handleModalClose}
        footer={[
          <Button key="reset" onClick={handleReset}>
            Reset
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={submitting}
            onClick={handleCreate}
          >
            Create
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical" style={{ marginTop: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item
              label={<span>Name <span style={{ color: 'red' }}>*</span></span>}
              name="name"
              rules={[
                { required: true, message: 'Please enter enroll secret name' },
                { min: 2, message: 'Name must be at least 2 characters' },
              ]}
            >
              <Input placeholder="Name" />
            </Form.Item>

            <Form.Item
              label={<span>Organization <span style={{ color: 'red' }}>*</span></span>}
              name="organization"
              rules={[{ required: true, message: 'Please select organization' }]}
            >
              <Select
                placeholder="Please Select"
                options={organizations.map((org) => ({
                  value: org.name,
                  label: org.name,
                }))}
              />
            </Form.Item>
          </div>

          <Form.Item
            label={<span>Department <span style={{ color: 'red' }}>*</span></span>}
            name="department"
            rules={[{ required: true, message: 'Please select department' }]}
          >
            <Select
              placeholder="Please Select"
              options={departments.map((dept) => ({
                value: dept.name,
                label: dept.name,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* View Modal */}
      <Modal
        title="Enroll Secret Details"
        open={viewModalVisible}
        width={600}
        onCancel={handleViewModalClose}
        footer={[
          <Button key="close" onClick={handleViewModalClose}>
            Close
          </Button>,
        ]}
      >
        <Form form={viewForm} layout="vertical" style={{ marginTop: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item label="Name" name="name">
              <Input disabled />
            </Form.Item>

            <Form.Item label="Organization" name="organization">
              <Input disabled />
            </Form.Item>
          </div>

          <Form.Item label="Department" name="department">
            <Input disabled />
          </Form.Item>

          <Form.Item label="Secret" name="secret">
            <Input disabled />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
