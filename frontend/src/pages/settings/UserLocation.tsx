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
  Popconfirm,
  DatePicker,
  Checkbox,
  Row,
  Col,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  DownloadOutlined,
  PlusOutlined,
  FilterOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import { settingsService } from '../../services/settings.service';
import './styles.css';

const { Title } = Typography;
const { TextArea } = Input;

interface Location {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
}

interface TableParams {
  pagination?: TablePaginationConfig;
  sortField?: string;
  sortOrder?: string;
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

export const UserLocation = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [isViewModalEditing, setIsViewModalEditing] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [viewingLocation, setViewingLocation] = useState<Location | null>(null);
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
  const [tableParams, setTableParams] = useState<TableParams>({
    pagination: {
      current: 1,
      pageSize: 20,
    },
  });

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const data = await settingsService.getLocations();
      setLocations(Array.isArray(data) ? data : []);
      setTableParams({
        ...tableParams,
        pagination: {
          current: 1,
          pageSize: 20,
          total: Array.isArray(data) ? data.length : 0,
        },
      });
    } catch (error) {
      message.error('Failed to fetch locations');
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await fetchLocations();
    message.success('Locations refreshed');
  };

  const handleExport = () => {
    const csv = [
      ['ID', 'Name', 'Description', 'Created On'],
      ...filteredLocations.map((loc) => [
        loc.id,
        loc.name,
        loc.description || '',
        formatDateTime(loc.createdAt),
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `locations-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    message.success('Locations exported');
  };

  const handleCreate = () => {
    setEditingLocation(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    form.setFieldsValue({
      name: location.name,
      description: location.description || '',
    });
    setModalVisible(true);
  };

  const handleViewLocation = (location: Location) => {
    setViewingLocation(location);
    setIsViewModalEditing(false);
    viewForm.setFieldsValue({
      name: location.name,
      description: location.description || '',
    });
    setViewModalVisible(true);
  };

  const handleViewModalEdit = () => {
    setIsViewModalEditing(true);
  };

  const handleViewModalSave = async () => {
    try {
      const values = await viewForm.validateFields();

      if (viewingLocation) {
        await settingsService.updateLocation(viewingLocation.id, values);
        message.success('Location updated successfully');
        setViewModalVisible(false);
        setIsViewModalEditing(false);
        viewForm.resetFields();
        fetchLocations();
      }
    } catch (error) {
      message.error('Failed to update location');
    }
  };

  const handleViewModalCancel = () => {
    setIsViewModalEditing(false);
    viewForm.setFieldsValue({
      name: viewingLocation?.name,
      description: viewingLocation?.description,
    });
  };

  const handleDelete = async (location: Location) => {
    try {
      await settingsService.deleteLocation(location.id);
      message.success(`${location.name} deleted successfully`);
      fetchLocations();
    } catch (error) {
      message.error('Failed to delete location');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingLocation) {
        await settingsService.updateLocation(editingLocation.id, values);
        message.success('Location updated successfully');
      } else {
        await settingsService.createLocation(values);
        message.success('Location created successfully');
      }

      setModalVisible(false);
      form.resetFields();
      fetchLocations();
    } catch (error) {
      message.error(`Failed to ${editingLocation ? 'update' : 'create'} location`);
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
      setTableParams({ ...tableParams, pagination: { ...tableParams.pagination, current: 1 } });
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
    setTableParams({ ...tableParams, pagination: { ...tableParams.pagination, current: 1 } });
    message.success('Filters reset');
  };

  const hasActiveFilters = filters.enableId || filters.enableName || filters.enableDescription || filters.enableDateRange;

  const formatDateTime = (dateString?: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return dateString;
    }
  };

  const columns: ColumnsType<Location> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 50,
      sorter: (a, b) => {
        const aNum = parseInt(a.id, 10);
        const bNum = parseInt(b.id, 10);
        return aNum - bNum;
      },
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text: string, record: Location) => (
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            handleViewLocation(record);
          }}
          style={{ color: '#1890ff' }}
        >
          {text}
        </a>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => text || '',
    },
    {
      title: 'Created On',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => formatDateTime(text),
    },
    {
      title: '',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            style={{ color: '#1890ff' }}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Delete Location"
            description={`Are you sure you want to delete ${record.name}?`}
            onConfirm={() => handleDelete(record)}
            okText="Delete"
            okType="danger"
            cancelText="Cancel"
          >
            <Button type="text" icon={<DeleteOutlined />} style={{ color: '#ff4d4f' }} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const filteredLocations = locations.filter((location) => {
    // Search filter
    const matchesSearch = location.name.toLowerCase().includes(searchText.toLowerCase()) ||
                         (location.description && location.description.toLowerCase().includes(searchText.toLowerCase()));

    // Advanced filters (only apply if enabled)
    const matchesId = !filters.enableId || !filters.id || location.id.toLowerCase().includes(filters.id.toLowerCase());
    const matchesName = !filters.enableName || !filters.name || location.name.toLowerCase().includes(filters.name.toLowerCase());
    const matchesDescription = !filters.enableDescription || !filters.description ||
                              (location.description && location.description.toLowerCase().includes(filters.description.toLowerCase()));

    let matchesDateRange = true;
    if (filters.enableDateRange && filters.dateRange && filters.dateRange[0] && filters.dateRange[1] && location.createdAt) {
      const locDate = new Date(location.createdAt).getTime();
      const fromDate = filters.dateRange[0].toDate().getTime();
      const toDate = filters.dateRange[1].toDate().getTime();
      matchesDateRange = locDate >= fromDate && locDate <= toDate;
    }

    return matchesSearch && matchesId && matchesName && matchesDescription && matchesDateRange;
  });

  const handleTableChange = (pagination: TablePaginationConfig) => {
    setTableParams({
      pagination,
    });
  };

  const paginationConfig: TablePaginationConfig = {
    current: tableParams.pagination?.current || 1,
    pageSize: tableParams.pagination?.pageSize || 20,
    total: filteredLocations.length,
    showSizeChanger: true,
    pageSizeOptions: ['10', '20', '50', '100'],
    showTotal: (total, range) => `showing ${range[0]}-${range[1]} of ${total} items`,
  };

  const startIdx = ((paginationConfig.current || 1) - 1) * (paginationConfig.pageSize || 20);
  const endIdx = startIdx + (paginationConfig.pageSize || 20);
  const paginatedLocations = filteredLocations.slice(startIdx, endIdx);

  return (
    <div className="location-container">
      <div className="location-header">
        <Title level={2} style={{ margin: 0 }}>
          Locations
        </Title>
      </div>

      <div className="location-toolbar">
        <div className="toolbar-left">
          <Input
            placeholder="Search..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setTableParams({
                ...tableParams,
                pagination: {
                  ...(tableParams.pagination || {}),
                  current: 1,
                },
              });
            }}
            style={{ width: 250 }}
          />
        </div>

        <div className="toolbar-right">
          <Button
            type="default"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            Refresh
          </Button>
          <Button
            type="default"
            icon={<DownloadOutlined />}
            onClick={handleExport}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            Export
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            Create
          </Button>
          <Button
            type={hasActiveFilters ? 'primary' : 'default'}
            icon={<FilterOutlined />}
            style={{ display: 'flex', alignItems: 'center' }}
            onClick={handleOpenFilterModal}
          />
        </div>
      </div>

      <div className="location-table-wrapper">
        <Table
          columns={columns}
          dataSource={paginatedLocations}
          rowKey="id"
          loading={loading}
          pagination={paginationConfig}
          onChange={handleTableChange}
          className="location-table"
          style={{ marginBottom: '16px' }}
        />
      </div>

      {/* Create/Edit Modal */}
      <Modal
        title={editingLocation ? 'Edit Location' : 'Create Location'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingLocation(null);
        }}
        onOk={handleSubmit}
        okText={editingLocation ? 'Update' : 'Create'}
      >
        <Form form={form} layout="vertical" style={{ marginTop: '24px' }}>
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: 'Please enter location name' }]}
          >
            <Input placeholder="Enter location name" />
          </Form.Item>

          <Form.Item label="Description" name="description">
            <Input placeholder="Enter description" />
          </Form.Item>
        </Form>
      </Modal>

      {/* View Location Modal */}
      <Modal
        title="Location Details"
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false);
          setViewingLocation(null);
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
                setViewingLocation(null);
                viewForm.resetFields();
              }
            }}
          >
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
        {viewingLocation && (
          <Form form={viewForm} layout="vertical" style={{ marginTop: '24px' }}>
            <Form.Item
              label="Name"
              name="name"
              rules={[{ required: true, message: 'Please enter location name' }]}
            >
              <Input
                placeholder="Enter location name"
                disabled={!isViewModalEditing}
              />
            </Form.Item>

            <Form.Item label="Description" name="description">
              <TextArea
                placeholder="Enter location description (optional)"
                disabled={!isViewModalEditing}
                rows={4}
              />
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* Filter Modal */}
      <Modal
        title="Filter Locations"
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
          <Row gutter={[16, 0]} align="middle" style={{ marginBottom: '16px' }}>
            <Col span={4}>
              <Form.Item name="enableId" valuePropName="checked" style={{ margin: 0 }}>
                <Checkbox />
              </Form.Item>
            </Col>
            <Col span={20}>
              <Form.Item name="id" style={{ margin: 0 }}>
                <Input placeholder="Filter by location ID" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]} align="middle" style={{ marginBottom: '16px' }}>
            <Col span={4}>
              <Form.Item name="enableName" valuePropName="checked" style={{ margin: 0 }}>
                <Checkbox />
              </Form.Item>
            </Col>
            <Col span={20}>
              <Form.Item name="name" style={{ margin: 0 }}>
                <Input placeholder="Filter by location name" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]} align="middle" style={{ marginBottom: '16px' }}>
            <Col span={4}>
              <Form.Item name="enableDescription" valuePropName="checked" style={{ margin: 0 }}>
                <Checkbox />
              </Form.Item>
            </Col>
            <Col span={20}>
              <Form.Item name="description" style={{ margin: 0 }}>
                <Input placeholder="Filter by description" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]} align="middle">
            <Col span={4}>
              <Form.Item name="enableDateRange" valuePropName="checked" style={{ margin: 0 }}>
                <Checkbox />
              </Form.Item>
            </Col>
            <Col span={20}>
              <Form.Item name="dateRange" style={{ margin: 0 }}>
                <DatePicker.RangePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};
