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
  Spin,
} from 'antd';
import {
  SearchOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  DownloadOutlined,
  FilterOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { settingsService } from '../../services/settings.service';
import type { ComputerGroup, EndpointOption } from '../../types/settings.types';

const { Title } = Typography;

interface FilterState {
  showName: boolean;
  showDescription: boolean;
  showEndpoints: boolean;
}

export const ComputerGroups = () => {
  const { message } = App.useApp();
  const [groups, setGroups] = useState<ComputerGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ComputerGroup | null>(null);
  const [endpoints, setEndpoints] = useState<EndpointOption[]>([]);
  const [endpointsLoading, setEndpointsLoading] = useState(false);

  const [modalForm] = Form.useForm();
  const [filterForm] = Form.useForm();
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    pageSize: 20,
    current: 1,
  });

  const [filters, setFilters] = useState<FilterState>({
    showName: true,
    showDescription: true,
    showEndpoints: true,
  });

  useEffect(() => {
    fetchGroups();
    fetchAvailableEndpoints();
  }, []);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const data = await settingsService.getComputerGroups();
      const formattedData = Array.isArray(data)
        ? data.map((group: any, index: number) => ({
            ...group,
            id: group.id || String(index),
          }))
        : [];
      setGroups(formattedData);
    } catch (error) {
      console.error('Error fetching computer groups:', error);
      message.error('Failed to fetch computer groups');
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableEndpoints = async () => {
    setEndpointsLoading(true);
    try {
      const data = await settingsService.getAvailableEndpoints();
      setEndpoints(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching available endpoints:', error);
      setEndpoints([]);
    } finally {
      setEndpointsLoading(false);
    }
  };

  const handleCreateGroup = () => {
    setEditingGroup(null);
    setModalMode('create');
    modalForm.resetFields();
    setModalVisible(true);
  };

  const handleEditGroup = (group: ComputerGroup) => {
    setEditingGroup(group);
    setModalMode('edit');
    modalForm.setFieldsValue({
      name: group.name,
      description: group.description,
      endpoints: group.endpoints,
    });
    setModalVisible(true);
  };

  const handleViewGroup = (group: ComputerGroup) => {
    setEditingGroup(group);
    setModalMode('view');
    modalForm.setFieldsValue({
      name: group.name,
      description: group.description,
      endpoints: group.endpoints,
    });
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setEditingGroup(null);
    modalForm.resetFields();
  };

  const handleDelete = (group: ComputerGroup) => {
    Modal.confirm({
      title: 'Delete Computer Group',
      content: `Are you sure you want to delete "${group.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await settingsService.deleteComputerGroup(group.id);
          message.success('Computer group deleted successfully');
          fetchGroups();
        } catch (error) {
          message.error('Failed to delete computer group');
        }
      },
    });
  };

  const handleModalSubmit = async () => {
    try {
      const values = await modalForm.validateFields();

      if (editingGroup && modalMode === 'edit') {
        await settingsService.updateComputerGroup(editingGroup.id, values);
        message.success('Computer group updated successfully');
      } else if (modalMode === 'create') {
        await settingsService.createComputerGroup(values);
        message.success('Computer group created successfully');
      }

      handleModalClose();
      fetchGroups();
    } catch (error) {
      message.error(
        `Failed to ${editingGroup && modalMode === 'edit' ? 'update' : 'create'} computer group`
      );
    }
  };

  const handleOpenFilterModal = () => {
    filterForm.setFieldsValue({
      showName: filters.showName,
      showDescription: filters.showDescription,
      showEndpoints: filters.showEndpoints,
    });
    setFilterModalVisible(true);
  };

  const handleApplyFilters = () => {
    const values = filterForm.getFieldsValue();
    setFilters({
      showName: values.showName !== undefined ? values.showName : true,
      showDescription: values.showDescription !== undefined ? values.showDescription : true,
      showEndpoints: values.showEndpoints !== undefined ? values.showEndpoints : true,
    });
    setPagination({ ...pagination, current: 1 });
    setFilterModalVisible(false);
    message.success('Columns updated');
  };

  const handleResetFilters = () => {
    filterForm.resetFields();
    setFilters({
      showName: true,
      showDescription: true,
      showEndpoints: true,
    });
    setPagination({ ...pagination, current: 1 });
    message.success('Columns reset to default');
  };

  const hasHiddenColumns = !filters.showName || !filters.showDescription || !filters.showEndpoints;

  const handleExport = () => {
    const csvContent = [
      ['Name', 'Description', 'Endpoint Count', 'Created By', 'Created At'],
      ...filteredGroups.map((group) => [
        group.name,
        group.description,
        String(group.endpointCount),
        group.createdBy,
        formatDate(group.createdAt),
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'computer-groups.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  };

  const filteredGroups = groups.filter((group) => {
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    return (
      group.name.toLowerCase().includes(searchLower) ||
      group.description.toLowerCase().includes(searchLower)
    );
  });

  const columns: ColumnsType<ComputerGroup> = [
    ...(filters.showName
      ? [
          {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            width: 200,
            sorter: (a: ComputerGroup, b: ComputerGroup) => a.name.localeCompare(b.name),
            render: (_: any, record: ComputerGroup) => (
              <a href="#" onClick={(e) => {
                e.preventDefault();
                handleViewGroup(record);
              }}>
                {record.name}
              </a>
            ),
          },
        ]
      : []),
    ...(filters.showDescription
      ? [
          {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            render: (text: string) => text || '—',
          },
        ]
      : []),
    ...(filters.showEndpoints
      ? [
          {
            title: 'Endpoints',
            dataIndex: 'endpointCount',
            key: 'endpointCount',
            width: 120,
            render: (count: number) => `${count} endpoint${count !== 1 ? 's' : ''}`,
          },
        ]
      : []),
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      align: 'right' as const,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditGroup(record)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>Computer Groups</Title>
      </div>

      {/* Action Bar */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Input
          placeholder="Search..."
          prefix={<SearchOutlined />}
          style={{ flex: 1, maxWidth: '400px' }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <Tooltip title="Refresh">
            <Button icon={<ReloadOutlined />} onClick={fetchGroups} />
          </Tooltip>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            Export
          </Button>
          <Tooltip title={hasHiddenColumns ? 'Some columns are hidden' : 'Show/hide columns'}>
            <Button
              icon={<FilterOutlined />}
              onClick={handleOpenFilterModal}
              style={hasHiddenColumns ? { color: '#1890ff' } : {}}
            />
          </Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateGroup}>
            Create
          </Button>
        </div>
      </div>

      {/* Table */}
      <Spin spinning={loading}>
        {filteredGroups.length === 0 && !loading ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 24px',
            background: '#fafafa',
            borderRadius: '8px',
          }}>
            <FolderOutlined style={{ fontSize: '48px', color: '#bfbfbf', marginBottom: '16px', display: 'block' }} />
            <Typography.Text type="secondary">No computer groups found</Typography.Text>
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={filteredGroups}
            rowKey="id"
            pagination={pagination}
            onChange={(newPagination) => setPagination(newPagination as TablePaginationConfig)}
            style={{ background: '#fff', borderRadius: '8px' }}
          />
        )}
      </Spin>

      {/* Modal */}
      <Modal
        title={
          modalMode === 'create'
            ? 'Create Computer Group'
            : modalMode === 'edit'
            ? 'Edit Computer Group'
            : 'View Computer Group'
        }
        open={modalVisible}
        onCancel={handleModalClose}
        width={600}
        footer={
          modalMode !== 'view'
            ? [
                <Button key="cancel" onClick={handleModalClose}>
                  Cancel
                </Button>,
                <Button key="submit" type="primary" onClick={handleModalSubmit}>
                  {modalMode === 'create' ? 'Create' : 'Update'}
                </Button>,
              ]
            : [
                <Button key="close" onClick={handleModalClose}>
                  Close
                </Button>,
                <Button key="edit" type="primary" onClick={() => setModalMode('edit')}>
                  Edit
                </Button>,
              ]
        }
      >
        <Form
          form={modalForm}
          layout="vertical"
          disabled={modalMode === 'view'}
        >
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input placeholder="Enter computer group name" />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
            rules={[{ required: true, message: 'Please enter a description' }]}
          >
            <Input.TextArea
              placeholder="Enter computer group description"
              rows={3}
            />
          </Form.Item>

          <Form.Item
            label="Endpoints"
            name="endpoints"
            rules={[{ required: true, message: 'Please select at least one endpoint' }]}
          >
            <Select
              mode="multiple"
              placeholder="Select endpoints to add to this group"
              loading={endpointsLoading}
              optionLabelProp="label"
              options={endpoints.map((endpoint) => ({
                label: `${endpoint.name} (${endpoint.ipAddress || 'N/A'})`,
                value: endpoint.id,
              }))}
            />
          </Form.Item>

          {modalMode === 'view' && editingGroup && (
            <>
              <Form.Item label="Created By">
                <Input value={editingGroup.createdBy} disabled />
              </Form.Item>
              <Form.Item label="Created At">
                <Input value={formatDate(editingGroup.createdAt)} disabled />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>

      {/* Filter Modal */}
      <Modal
        title="Show/Hide Columns"
        open={filterModalVisible}
        onCancel={() => setFilterModalVisible(false)}
        width={400}
        footer={[
          <Button key="reset" onClick={handleResetFilters}>
            Reset to Default
          </Button>,
          <Button key="cancel" onClick={() => setFilterModalVisible(false)}>
            Cancel
          </Button>,
          <Button key="submit" type="primary" onClick={handleApplyFilters}>
            Apply
          </Button>,
        ]}
      >
        <Form form={filterForm} layout="vertical">
          <Form.Item name="showName" valuePropName="checked">
            <Checkbox>Name</Checkbox>
          </Form.Item>
          <Form.Item name="showDescription" valuePropName="checked">
            <Checkbox>Description</Checkbox>
          </Form.Item>
          <Form.Item name="showEndpoints" valuePropName="checked">
            <Checkbox>Endpoints</Checkbox>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
