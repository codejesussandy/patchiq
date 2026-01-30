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
  Tooltip,
  Checkbox,
  Select,
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
import type { DeploymentPolicy } from '../../types/settings.types';

const { Title } = Typography;

interface FilterState {
  showId: boolean;
  showName: boolean;
  showDescription: boolean;
  showType: boolean;
}

export const DeploymentPolicies = () => {
  const { message } = App.useApp();
  const [policies, setPolicies] = useState<DeploymentPolicy[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'view' | 'edit' | 'create'>('view');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<DeploymentPolicy | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    showId: true,
    showName: true,
    showDescription: true,
    showType: true,
  });

  const [drawerForm] = Form.useForm();
  const [filterForm] = Form.useForm();
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    pageSize: 20,
    current: 1,
  });

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const data = await settingsService.getDeploymentPolicies();
      const formattedData = Array.isArray(data)
        ? data.map((policy: any, index: number) => ({
            ...policy,
            id: policy.id || String(index),
          }))
        : [];
      setPolicies(formattedData);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      message.error('Failed to fetch jobs');
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePolicy = () => {
    setEditingPolicy(null);
    setDrawerMode('create');
    drawerForm.resetFields();
    setDrawerVisible(true);
  };

  const handleEditPolicy = (policy: DeploymentPolicy) => {
    setEditingPolicy(policy);
    setDrawerMode('edit');
    drawerForm.setFieldsValue({
      name: policy.name,
      description: policy.description,
      type: policy.type,
      supportedModule: policy.supportedModule,
      relatedType: policy.relatedType,
    });
    setDrawerVisible(true);
  };

  const handleViewPolicy = (policy: DeploymentPolicy) => {
    setEditingPolicy(policy);
    setDrawerMode('view');
    drawerForm.setFieldsValue({
      name: policy.name,
      description: policy.description,
      type: policy.type,
      supportedModule: policy.supportedModule,
      relatedType: policy.relatedType,
    });
    setDrawerVisible(true);
  };

  const handleDrawerClose = () => {
    setDrawerVisible(false);
    setEditingPolicy(null);
    drawerForm.resetFields();
  };

  const handleDelete = (policy: DeploymentPolicy) => {
    Modal.confirm({
      title: 'Delete Job',
      content: `Are you sure you want to delete "${policy.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await settingsService.deleteDeploymentPolicy(policy.id);
          message.success('Job deleted successfully');
          fetchPolicies();
        } catch (error) {
          message.error('Failed to delete job');
        }
      },
    });
  };

  const handleDrawerSubmit = async () => {
    try {
      const values = await drawerForm.validateFields();

      if (editingPolicy && drawerMode === 'edit') {
        await settingsService.updateDeploymentPolicy(editingPolicy.id, values);
        message.success('Job updated successfully');
      } else if (drawerMode === 'create') {
        await settingsService.createDeploymentPolicy(values);
        message.success('Job created successfully');
      }

      handleDrawerClose();
      fetchPolicies();
    } catch (error) {
      message.error(`Failed to ${editingPolicy && drawerMode === 'edit' ? 'update' : 'create'} job`);
    }
  };

  const handleOpenFilterModal = () => {
    filterForm.setFieldsValue({
      showId: filters.showId,
      showName: filters.showName,
      showDescription: filters.showDescription,
      showType: filters.showType,
    });
    setFilterModalVisible(true);
  };

  const handleApplyFilters = () => {
    const values = filterForm.getFieldsValue();
    setFilters({
      showId: values.showId !== undefined ? values.showId : true,
      showName: values.showName !== undefined ? values.showName : true,
      showDescription: values.showDescription !== undefined ? values.showDescription : true,
      showType: values.showType !== undefined ? values.showType : true,
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
      showType: true,
    });
    setPagination({ ...pagination, current: 1 });
    message.success('Columns reset to default');
  };

  const hasHiddenColumns = !filters.showId || !filters.showName || !filters.showDescription || !filters.showType;

  const handleExport = () => {
    const csvContent = [
      ['ID', 'Name', 'Description', 'Type', 'Created By', 'Created On'],
      ...filteredPolicies.map((policy) => [
        policy.id,
        policy.name,
        policy.description,
        policy.type,
        policy.createdBy,
        policy.createdAt,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'jobs.csv';
    link.click();
    window.URL.revokeObjectURL(url);
    message.success('Jobs exported successfully');
  };

  const allColumns: ColumnsType<DeploymentPolicy> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      sorter: (a, b) => a.id.localeCompare(b.id),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (_, record: DeploymentPolicy) => (
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            handleViewPolicy(record);
          }}
          style={{ color: '#1890ff' }}
        >
          {record.name}
        </a>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => text || '—',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (text: string) => (
        <span
          style={{
            backgroundColor: text === 'SCHEDULE' ? '#e6f7ff' : '#f6f8fb',
            color: text === 'SCHEDULE' ? '#1890ff' : '#666',
            padding: '4px 8px',
            borderRadius: '2px',
            fontSize: '12px',
          }}
        >
          {text}
        </span>
      ),
    },
    {
      title: 'Created By',
      dataIndex: 'createdBy',
      key: 'createdBy',
    },
    {
      title: 'Created On',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => {
        if (!text) return '—';
        // Handle different date formats
        try {
          const date = new Date(text);
          if (isNaN(date.getTime())) {
            return text;
          }
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          const seconds = String(date.getSeconds()).padStart(2, '0');
          return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
        } catch {
          return text;
        }
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
              onClick={() => handleEditPolicy(record)}
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
    if (col.key === 'description') return filters.showDescription;
    if (col.key === 'type') return filters.showType;
    return true; // Always show actions column
  });

  const filteredPolicies = policies.filter((policy) => {
    if (!searchText) return true;

    const searchLower = searchText.toLowerCase();
    return (
      policy.id.toLowerCase().includes(searchLower) ||
      policy.name.toLowerCase().includes(searchLower) ||
      policy.description.toLowerCase().includes(searchLower) ||
      policy.type.toLowerCase().includes(searchLower) ||
      policy.createdBy.toLowerCase().includes(searchLower)
    );
  });

  const paginatedData = filteredPolicies.slice(
    (pagination.current! - 1) * pagination.pageSize!,
    pagination.current! * pagination.pageSize!
  );

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <Title level={2}>Jobs</Title>
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
              onClick={() => fetchPolicies()}
              loading={loading}
            />
          </Tooltip>

          <Tooltip title="Export">
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
              disabled={policies.length === 0}
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
            onClick={handleCreatePolicy}
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
          total: filteredPolicies.length,
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
        title={drawerMode === 'create' ? 'Create Job' : drawerMode === 'edit' ? 'Edit Job' : 'View Job'}
        open={drawerVisible}
        onCancel={handleDrawerClose}
        width={600}
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
              {drawerMode === 'create' ? 'Create' : 'Update'} Job
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
          <Form.Item
            label="Job Name"
            name="name"
            rules={[{ required: true, message: 'Please enter job name' }]}
          >
            <Input
              placeholder="Job Name"
              disabled={drawerMode === 'view'}
            />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
            rules={[{ required: true, message: 'Please enter description' }]}
          >
            <Input.TextArea
              placeholder="Description"
              disabled={drawerMode === 'view'}
              rows={3}
            />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item
              label="Supported module"
              name="supportedModule"
              rules={[{ required: true, message: 'Please select module' }]}
            >
              <Select
                placeholder="Select Module"
                disabled={drawerMode === 'view'}
                options={[
                  { label: 'All', value: 'All' },
                  { label: 'Patch', value: 'Patch' },
                  { label: 'Update', value: 'Update' },
                  { label: 'Security', value: 'Security' },
                ]}
              />
            </Form.Item>

            <Form.Item
              label="Type"
              name="type"
              rules={[{ required: true, message: 'Please select type' }]}
            >
              <Select
                placeholder="Select Type"
                disabled={drawerMode === 'view'}
                options={[
                  { label: 'Schedule', value: 'SCHEDULE' },
                  { label: 'Instant', value: 'INSTANT' },
                ]}
              />
            </Form.Item>
          </div>

          <Form.Item
            label="Related Type"
            name="relatedType"
            rules={[{ required: true, message: 'Please select related type' }]}
          >
            <Select
              placeholder="Select Related Type"
              disabled={drawerMode === 'view'}
              options={[
                { label: 'No Relation', value: 'No Relation' },
                { label: 'Critical', value: 'Critical' },
                { label: 'Important', value: 'Important' },
                { label: 'Optional', value: 'Optional' },
              ]}
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

          <Form.Item name="showDescription" valuePropName="checked" style={{ marginBottom: '16px' }}>
            <Checkbox>Show Description</Checkbox>
          </Form.Item>

          <Form.Item name="showType" valuePropName="checked" style={{ marginBottom: '16px' }}>
            <Checkbox>Show Type</Checkbox>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
