import { useState } from 'react';
import {
  SearchOutlined,
  ReloadOutlined,
  FileTextOutlined,
  PlusOutlined,
  DeleteOutlined } from '@ant-design/icons';
import {
  App,
  Input,
  Button,
  Typography,
  Space,
  Tooltip,
  Popconfirm,
  Form,
  Select,
  Modal } from 'antd';
import type { ColumnsType} from 'antd/es/table';
import { DataTable } from '../../components/shared/DataTable';
import { FormModal } from '../../components/shared/FormModal';
import { useModal } from '../../hooks/useModal';
import { useEnrollSecrets, useCreateEnrollSecret, useDeleteEnrollSecret, useOrganizations, useDepartments } from '../../hooks/useSettings';
import type { EnrollSecret as EnrollSecretType } from '../../types/settings.types';

const { Title } = Typography;

export const EnrollSecret = () => {
  const { message } = App.useApp();
  const { data: rawSecrets, isLoading: loading, refetch } = useEnrollSecrets();
  const { data: rawOrganizations } = useOrganizations();
  const { data: rawDepartments } = useDepartments();
  const createSecretMutation = useCreateEnrollSecret();
  const deleteSecretMutation = useDeleteEnrollSecret();
  const [searchText, setSearchText] = useState('');
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [_selectedSecret, setSelectedSecret] = useState<EnrollSecretType | null>(null);
  const createModal = useModal();
  const [form] = Form.useForm();
  const [viewForm] = Form.useForm();
  const [pagination, setPagination] = useState({
    pageSize: 10,
    current: 1 });

  const secrets = Array.isArray(rawSecrets)
    ? rawSecrets.map((secret: EnrollSecretType) => ({
        ...secret,
        key: secret.id }))
    : [];
  const organizations = rawOrganizations || [];
  const departments = rawDepartments || [];

  const handleRefresh = () => {
    refetch();
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
    createModal.onOpen();
  };

  const handleCreateSubmit = async (values: Record<string, unknown>) => {
    try {
      await createSecretMutation.mutateAsync({
        name: values.name as string,
        secret: `${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}`,
        organization: values.organization as string,
        department: values.department as string });

      message.success('Enroll secret created successfully');
      createModal.onClose();
    } catch {
      message.error('Failed to create enroll secret');
    }
  };

  const handleOpenViewModal = (secret: EnrollSecretType) => {
    setSelectedSecret(secret);
    viewForm.setFieldsValue({
      name: secret.name,
      secret: secret.secret,
      organization: secret.organization,
      department: secret.department });
    setViewModalVisible(true);
  };

  const handleViewModalClose = () => {
    setViewModalVisible(false);
    setSelectedSecret(null);
    viewForm.resetFields();
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSecretMutation.mutateAsync(id);
      message.success('Enroll secret deleted successfully');
    } catch {
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
      sorter: (a, b) => a.name.localeCompare(b.name) },
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
      } },
    {
      title: 'Organization',
      dataIndex: 'organization',
      key: 'organization',
      sorter: (a, b) => a.organization.localeCompare(b.organization) },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      sorter: (a, b) => a.department.localeCompare(b.department) },
    {
      title: 'Created On',
      dataIndex: 'createdOn',
      key: 'createdOn',
      render: (date: string) => {
        return new Date(date).toLocaleString();
      },
      sorter: (a, b) =>
        new Date(a.createdOn).getTime() - new Date(b.createdOn).getTime() },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_text: unknown, record: EnrollSecretType) => (
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
      ) },
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
          gap: '12px' }}
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
      <DataTable
        columns={columns}
        data={filteredSecrets}
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: filteredSecrets.length,
          onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
        }}
        rowKey="id"
        size="small"
        style={{ backgroundColor: 'white', borderRadius: '4px' }}
      />

      {/* Create Modal */}
      <FormModal
        title="Create Enroll Secret"
        open={createModal.open}
        onClose={createModal.onClose}
        onSubmit={handleCreateSubmit}
        loading={createSecretMutation.isPending}
        okText="Create"
        form={form}
      >
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
                label: org.name }))}
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
              label: dept.name }))}
          />
        </Form.Item>
      </FormModal>

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
