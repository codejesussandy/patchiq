import { useState } from 'react';
import {
  SearchOutlined, DeleteOutlined, CheckOutlined, ReloadOutlined,
  CheckCircleFilled, WarningFilled, InfoCircleFilled, CloseCircleFilled } from '@ant-design/icons';
import {
  Typography, Tag, Button, Space, Input, Select, DatePicker, App, Tooltip } from 'antd';
import type { ColumnsType} from 'antd/es/table';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { DataTable } from '../components/shared/DataTable';
import {
  useNotificationHistory,
  useMarkAsRead,
  useDeleteNotification,
  useBulkMarkAsRead,
  useBulkDeleteNotifications } from '../hooks/useNotifications';
import type {
  Notification,
  NotificationType,
  NotificationCategory,
  NotificationHistoryParams } from '../services/notification.service';

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
  system: 'default' };

export const Notifications = () => {
  const { message } = App.useApp();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<NotificationType | undefined>();
  const [categoryFilter, setCategoryFilter] = useState<NotificationCategory | undefined>();
  const [readFilter, setReadFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });

  // Build query params
  const queryParams: NotificationHistoryParams = {
    page: pagination.current || 1,
    limit: pagination.pageSize || 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    ...(search && { search }),
    ...(typeFilter && { type: typeFilter }),
    ...(categoryFilter && { category: categoryFilter }),
    ...(readFilter && { read: readFilter }),
    ...(dateRange?.[0] && { dateFrom: dateRange[0].toISOString() }),
    ...(dateRange?.[1] && { dateTo: dateRange[1].toISOString() }) };

  const { data: historyResponse, isLoading: loading, refetch } = useNotificationHistory(queryParams);
  const data = Array.isArray(historyResponse?.data) ? historyResponse.data : [];
  const total = historyResponse?.total || 0;

  const markAsReadMutation = useMarkAsRead();
  const deleteNotificationMutation = useDeleteNotification();
  const bulkMarkAsReadMutation = useBulkMarkAsRead();
  const bulkDeleteMutation = useBulkDeleteNotifications();

  const handleBulkMarkRead = async () => {
    try {
      await bulkMarkAsReadMutation.mutateAsync(selectedRowKeys as string[]);
      message.success(`Marked ${selectedRowKeys.length} notifications as read`);
      setSelectedRowKeys([]);
    } catch {
      message.error('Failed to mark notifications as read');
    }
  };

  const handleBulkDelete = async () => {
    try {
      await bulkDeleteMutation.mutateAsync(selectedRowKeys as string[]);
      message.success(`Deleted ${selectedRowKeys.length} notifications`);
      setSelectedRowKeys([]);
    } catch {
      message.error('Failed to delete notifications');
    }
  };

  const handleMarkSingleRead = async (id: string) => {
    try {
      await markAsReadMutation.mutateAsync(id);
    } catch {
      message.error('Failed to mark as read');
    }
  };

  const handleDeleteSingle = async (id: string) => {
    try {
      await deleteNotificationMutation.mutateAsync(id);
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
      render: (type: NotificationType) => getTypeIcon(type) },
    {
      title: 'Category',
      dataIndex: 'category',
      width: 120,
      render: (cat: string) => cat ? <Tag color={categoryColor[cat] || 'default'}>{cat}</Tag> : '-' },
    {
      title: 'Title',
      dataIndex: 'title',
      ellipsis: true,
      render: (title: string, record: Notification) => (
        <span style={{ fontWeight: record.read ? 'normal' : 600 }}>{title}</span>
      ) },
    {
      title: 'Message',
      dataIndex: 'message',
      ellipsis: true,
      render: (msg: string) => (
        <Tooltip title={msg}>
          <span style={{ color: '#666' }}>{msg}</span>
        </Tooltip>
      ) },
    {
      title: 'Status',
      dataIndex: 'read',
      width: 80,
      align: 'center',
      render: (read: boolean) => read
        ? <Tag>Read</Tag>
        : <Tag color="blue">Unread</Tag> },
    {
      title: 'Time',
      dataIndex: 'createdAt',
      width: 140,
      render: (date: string) => (
        <Tooltip title={dayjs(date).format('YYYY-MM-DD HH:mm:ss')}>
          {dayjs(date).fromNow()}
        </Tooltip>
      ) },
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
      ) },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Notification History</Title>
        <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Refresh</Button>
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

      <DataTable
        rowKey="id"
        columns={columns}
        data={data}
        loading={loading}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys }}
        pagination={{
          ...pagination,
          total,
          showSizeChanger: true,
          showTotal: (t) => `${t} notifications` }}
        onChange={(pag) => setPagination(pag)}
        size="middle"
      />
    </div>
  );
};
