import { useState, useEffect } from 'react';
import {
  App,
  Table,
  Input,
  Button,
  Modal,
  Form,
  Space,
  Typography,
  Tooltip,
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
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { discoveryService } from '../../services/discovery.service';
import type { IPRange, IPRangeFilterState } from '../../types/discovery.types';

const { Title, Text } = Typography;

export const IPDiscovery = () => {
  const { message } = App.useApp();
  // Data
  const [ranges, setRanges] = useState<IPRange[]>([]);
  const [loading, setLoading] = useState(false);

  // Search & Filters
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<IPRangeFilterState>({
    showId: true,
    showName: true,
    showRange: true,
    showDescription: true,
    showLastScanned: true,
    showDeviceCount: true,
  });

  // Modal visibility
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Edit states
  const [editingRange, setEditingRange] = useState<IPRange | null>(null);
  const [viewingRange, setViewingRange] = useState<IPRange | null>(null);
  const [isViewModalEditing, setIsViewModalEditing] = useState(false);

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
    fetchRanges();
  }, []);

  const fetchRanges = async () => {
    setLoading(true);
    try {
      const data = await discoveryService.getIPRanges();
      setRanges(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error('Failed to fetch IP ranges');
      setRanges([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingRange(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (range: IPRange) => {
    setEditingRange(range);
    form.setFieldsValue(range);
    setModalVisible(true);
  };

  const handleViewItem = (range: IPRange) => {
    setViewingRange(range);
    setIsViewModalEditing(false);
    viewForm.setFieldsValue(range);
    setViewModalVisible(true);
  };

  const handleDelete = (range: IPRange) => {
    Modal.confirm({
      title: 'Delete IP Range',
      content: `Are you sure you want to delete "${range.name}"?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await discoveryService.deleteIPRange(range.id);
          message.success('IP range deleted successfully');
          fetchRanges();
        } catch (error) {
          message.error('Failed to delete IP range');
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingRange) {
        await discoveryService.updateIPRange(editingRange.id, values);
        message.success('IP range updated successfully');
      } else {
        await discoveryService.createIPRange(values);
        message.success('IP range created successfully');
      }

      setModalVisible(false);
      form.resetFields();
      fetchRanges();
    } catch (error) {
      message.error(`Failed to ${editingRange ? 'update' : 'create'} IP range`);
    }
  };

  const handleViewModalEdit = () => {
    setIsViewModalEditing(true);
  };

  const handleViewModalCancel = () => {
    if (viewingRange) {
      viewForm.setFieldsValue(viewingRange);
    }
    setIsViewModalEditing(false);
  };

  const handleViewModalSave = async () => {
    try {
      const values = await viewForm.validateFields();
      if (viewingRange) {
        await discoveryService.updateIPRange(viewingRange.id, values);
        message.success('IP range updated successfully');
        setViewModalVisible(false);
        setViewingRange(null);
        setIsViewModalEditing(false);
        viewForm.resetFields();
        fetchRanges();
      }
    } catch (error) {
      message.error('Failed to update IP range');
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['ID', 'Name', 'Range', 'Description', 'Last Scanned', 'Device Count'],
      ...filteredRanges.map((range) => [
        range.id,
        range.name,
        range.range,
        range.description || '',
        range.lastScanned || '—',
        range.deviceCount,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ip-ranges.csv';
    link.click();
    window.URL.revokeObjectURL(url);
    message.success('IP ranges exported successfully');
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
      showRange: values.showRange !== undefined ? values.showRange : true,
      showDescription: values.showDescription !== undefined ? values.showDescription : true,
      showLastScanned: values.showLastScanned !== undefined ? values.showLastScanned : true,
      showDeviceCount: values.showDeviceCount !== undefined ? values.showDeviceCount : true,
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
      showRange: true,
      showDescription: true,
      showLastScanned: true,
      showDeviceCount: true,
    });
    setPagination({ ...pagination, current: 1 });
    message.success('All columns shown');
  };

  const hasHiddenColumns = !filters.showId || !filters.showName || !filters.showRange || !filters.showDescription || !filters.showLastScanned || !filters.showDeviceCount;

  const allColumns: ColumnsType<IPRange> = [
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
      render: (text: string, record: IPRange) => (
        <a href="#" onClick={(e) => {
          e.preventDefault();
          handleViewItem(record);
        }}>
          {text}
        </a>
      ),
    },
    {
      title: 'IP Range',
      dataIndex: 'range',
      key: 'range',
      render: (text: string) => <span style={{ fontFamily: 'monospace' }}>{text}</span>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string) => text || '—',
    },
    {
      title: 'Last Scanned',
      dataIndex: 'lastScanned',
      key: 'lastScanned',
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
      title: 'Devices Found',
      dataIndex: 'deviceCount',
      key: 'deviceCount',
      width: 100,
      sorter: (a, b) => a.deviceCount - b.deviceCount,
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

  const columns = allColumns.filter((col) => {
    if (col.key === 'id') return filters.showId;
    if (col.key === 'name') return filters.showName;
    if (col.key === 'range') return filters.showRange;
    if (col.key === 'description') return filters.showDescription;
    if (col.key === 'lastScanned') return filters.showLastScanned;
    if (col.key === 'deviceCount') return filters.showDeviceCount;
    return true;
  });

  const filteredRanges = ranges.filter((range) => {
    if (!searchText) return true;

    const searchLower = searchText.toLowerCase();
    return (
      range.id.toLowerCase().includes(searchLower) ||
      range.name.toLowerCase().includes(searchLower) ||
      range.range.toLowerCase().includes(searchLower) ||
      (range.description && range.description.toLowerCase().includes(searchLower))
    );
  });

  const paginatedData = filteredRanges.slice(
    (pagination.current! - 1) * pagination.pageSize!,
    pagination.current! * pagination.pageSize!
  );

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <Title level={2}>IP Discovery</Title>
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
              onClick={fetchRanges}
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
            Create IP Range
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
          total: filteredRanges.length,
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
        title={editingRange ? 'Edit IP Range' : 'Create IP Range'}
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
            {editingRange ? 'Update' : 'Create'} IP Range
          </Button>,
        ]}
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: '24px' }}>
          <Form.Item
            name="name"
            label="Range Name"
            rules={[{ required: true, message: 'Please enter range name' }]}
          >
            <Input placeholder="e.g., Corporate Network" />
          </Form.Item>

          <Form.Item
            name="range"
            label="IP Range (CIDR)"
            rules={[{ required: true, message: 'Please enter IP range in CIDR notation' }]}
          >
            <Input placeholder="e.g., 192.168.1.0/24" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea placeholder="Optional description" rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* View Modal */}
      <Modal
        title="IP Range Details"
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false);
          setViewingRange(null);
          setIsViewModalEditing(false);
          viewForm.resetFields();
        }}
        footer={[
          <Button key="close-or-cancel" onClick={() => {
            if (isViewModalEditing) {
              handleViewModalCancel();
            } else {
              setViewModalVisible(false);
              setViewingRange(null);
              viewForm.resetFields();
            }
          }}>
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
        <Form form={viewForm} layout="vertical" style={{ marginTop: '24px' }}>
          <Form.Item
            name="name"
            label="Range Name"
            rules={[{ required: true, message: 'Please enter range name' }]}
          >
            <Input disabled={!isViewModalEditing} />
          </Form.Item>

          <Form.Item
            name="range"
            label="IP Range (CIDR)"
            rules={[{ required: true, message: 'Please enter IP range' }]}
          >
            <Input disabled={!isViewModalEditing} />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea disabled={!isViewModalEditing} rows={3} />
          </Form.Item>

          <Form.Item label="Last Scanned">
            <Text type="secondary">
              {viewingRange?.lastScanned
                ? new Date(viewingRange.lastScanned).toLocaleString()
                : '—'}
            </Text>
          </Form.Item>

          <Form.Item label="Devices Found">
            <Text>{viewingRange?.deviceCount || 0}</Text>
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
          <Form.Item name="showRange" valuePropName="checked" style={{ marginBottom: '16px' }}>
            <Checkbox>Show IP Range</Checkbox>
          </Form.Item>
          <Form.Item name="showDescription" valuePropName="checked" style={{ marginBottom: '16px' }}>
            <Checkbox>Show Description</Checkbox>
          </Form.Item>
          <Form.Item name="showLastScanned" valuePropName="checked" style={{ marginBottom: '16px' }}>
            <Checkbox>Show Last Scanned</Checkbox>
          </Form.Item>
          <Form.Item name="showDeviceCount" valuePropName="checked" style={{ marginBottom: '16px' }}>
            <Checkbox>Show Devices Found</Checkbox>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
