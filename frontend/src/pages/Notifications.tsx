import { useState, useEffect, useCallback } from 'react';
import {
  Table, Typography, Tag, Button, Space, Input, Select, DatePicker, App, Tooltip,
} from 'antd';
import {
  SearchOutlined, DeleteOutlined, CheckOutlined, ReloadOutlined,
  CheckCircleFilled, WarningFilled, InfoCircleFilled, CloseCircleFilled,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  notificationService,
  type Notification,
  type NotificationType,
  type NotificationCategory,
  type NotificationHistoryParams,
} from '../services/notification.service';

dayjs.extend(relativeTime);

const { Title } = Typography;
const { RangePicker } = DatePicker;

const typeOptions = [
  { label: 'Info', value: 'info' },
  { label: 'Success', value: 'success' },
  { label: 'Warning', value: 'warning' },
  { label: 'Error', value: 'error' },
];

const categoryOptions = [
  { label: 'Agent', value: 'agent' },
  { label: 'Deployment', value: 'deployment' },
  { label: 'Vulnerability', value: 'vulnerability' },
  { label: 'Alert', value: 'alert' },
  { label: 'System', value: 'system' },
];

const getTypeIcon = (type: NotificationType) => {
  const s = { fontSize: 14 };
  switch (type) {
    case 'success': return <CheckCircleFilled style={{ ...s, color: '#52c41a' }} />;
    case 'warning': return <WarningFilled style={{ ...s, color: '#faad14' }} />;
    case 'error': return <CloseCircleFilled style={{ ...s, color: '#ff4d4f' }} />;
    default: return <InfoCircleFilled style={{ ...s, color: '#1890ff' }} />;
  }
};

const categoryColor: Record<string, string> = {
  agent: 'blue',
  deployment: 'green',
  vulnerability: 'red',
  alert: 'orange',
  system: 'default',
};

export const Notifications = () => {
  const { message } = App.useApp();
  const [data, setData] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<NotificationType | undefined>();
  const [categoryFilter, setCategoryFilter] = useState<NotificationCategory | undefined>();
  const [readFilter, setReadFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [pagination, setPagination] = useState<TablePaginationConfig>({ current: 1, pageSize: 20 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: NotificationHistoryParams = {
        page: pagination.current || 1,
        limit: pagination.pageSize || 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (readFilter) params.read = readFilter;
      if (dateRange?.[0]) params.dateFrom = dateRange[0].toISOString();
      if (dateRange?.[1]) params.dateTo = dateRange[1].toISOString();

      const result = await notificationService.getHistory(params);
      setData(Array.isArray(result.data) ? result.data : []);
      setTotal(result.total || 0);
    } catch {
      message.error('Failed to fetch notifications');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, search, typeFilter, categoryFilter, readFilter, dateRange, message]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBulkMarkRead = async () => {
    try {
      await notificationService.bulkMarkAsRead(selectedRowKeys as string[]);
      message.success(`Marked ${selectedRowKeys.length} notifications as read`);
      setSelectedRowKeys([]);
      fetchData();
    } catch {
      message.error('Failed to mark notifications as read');
    }
  };

  const handleBulkDelete = async () => {
    try {
      await notificationService.bulkDelete(selectedRowKeys as string[]);
      message.success(`Deleted ${selectedRowKeys.length} notifications`);
      setSelectedRowKeys([]);
      fetchData();
    } catch {
      message.error('Failed to delete notifications');
    }
  };

  const handleMarkSingleRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setData((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch {
      message.error('Failed to mark as read');
    }
  };

  const handleDeleteSingle = async (id: string) => {
    try {
      await notificationService.deleteNotification(id);
      setData((prev) => prev.filter((n) => n.id !== id));
      setTotal((t) => t - 1);
    } catch {
      message.error('Failed to delete notification');
    }
  };

  const columns: ColumnsType<Notification> = [
    {
      title: 'Type',
      dataIndex: 'type',
      width: 60,
      align: 'center',
      render: (type: NotificationType) => getTypeIcon(type),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      width: 120,
      render: (cat: string) => cat ? <Tag color={categoryColor[cat] || 'default'}>{cat}</Tag> : '-',
    },
    {
      title: 'Title',
      dataIndex: 'title',
      ellipsis: true,
      render: (title: string, record: Notification) => (
        <span style={{ fontWeight: record.read ? 'normal' : 600 }}>{title}</span>
      ),
    },
    {
      title: 'Message',
      dataIndex: 'message',
      ellipsis: true,
      render: (msg: string) => (
        <Tooltip title={msg}>
          <span style={{ color: '#666' }}>{msg}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'read',
      width: 80,
      align: 'center',
      render: (read: boolean) => read
        ? <Tag>Read</Tag>
        : <Tag color="blue">Unread</Tag>,
    },
    {
      title: 'Time',
      dataIndex: 'createdAt',
      width: 140,
      render: (date: string) => (
        <Tooltip title={dayjs(date).format('YYYY-MM-DD HH:mm:ss')}>
          {dayjs(date).fromNow()}
        </Tooltip>
      ),
    },
    {
      title: 'Actions',
      width: 80,
      align: 'center',
      render: (_: unknown, record: Notification) => (
        <Space size={4}>
          {!record.read && (
            <Button
              type="text"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => handleMarkSingleRead(record.id)}
              title="Mark as read"
            />
          )}
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteSingle(record.id)}
            title="Delete"
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Notification History</Title>
        <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>
      </div>

      {/* Filters */}
      <Space wrap style={{ marginBottom: 16 }}>
        <Input
          placeholder="Search title or message..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPagination((p) => ({ ...p, current: 1 })); }}
          style={{ width: 240 }}
          allowClear
        />
        <Select
          placeholder="Type"
          options={typeOptions}
          value={typeFilter}
          onChange={(v) => { setTypeFilter(v); setPagination((p) => ({ ...p, current: 1 })); }}
          allowClear
          style={{ width: 120 }}
        />
        <Select
          placeholder="Category"
          options={categoryOptions}
          value={categoryFilter}
          onChange={(v) => { setCategoryFilter(v); setPagination((p) => ({ ...p, current: 1 })); }}
          allowClear
          style={{ width: 140 }}
        />
        <Select
          placeholder="Read status"
          options={[
            { label: 'Unread', value: 'false' },
            { label: 'Read', value: 'true' },
          ]}
          value={readFilter}
          onChange={(v) => { setReadFilter(v); setPagination((p) => ({ ...p, current: 1 })); }}
          allowClear
          style={{ width: 120 }}
        />
        <RangePicker
          onChange={(dates) => {
            setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null);
            setPagination((p) => ({ ...p, current: 1 }));
          }}
        />
      </Space>

      {/* Bulk actions */}
      {selectedRowKeys.length > 0 && (
        <Space style={{ marginBottom: 12 }}>
          <span>{selectedRowKeys.length} selected</span>
          <Button size="small" icon={<CheckOutlined />} onClick={handleBulkMarkRead}>
            Mark Read
          </Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={handleBulkDelete}>
            Delete
          </Button>
        </Space>
      )}

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        pagination={{
          ...pagination,
          total,
          showSizeChanger: true,
          showTotal: (t) => `${t} notifications`,
        }}
        onChange={(pag) => setPagination(pag)}
        size="middle"
      />
    </div>
  );
};
