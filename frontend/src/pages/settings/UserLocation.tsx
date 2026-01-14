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
import { settingsService } from '../../services/settings.service';
import './styles.css';

const { Title } = Typography;

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

export const UserLocation = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [form] = Form.useForm();
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
      render: (text: string) => <a style={{ color: '#1890ff' }}>{text}</a>,
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

  const filteredLocations = locations.filter((location) =>
    location.name.toLowerCase().includes(searchText.toLowerCase())
  );

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
            type="default"
            icon={<FilterOutlined />}
            style={{ display: 'flex', alignItems: 'center' }}
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
    </div>
  );
};
