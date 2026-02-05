import { useState, useEffect, useCallback, useRef } from 'react';
import { Dropdown, Badge, List, Typography, Button, Empty, Spin } from 'antd';
import {
  BellOutlined,
  CheckOutlined,
  DeleteOutlined,
  CheckCircleFilled,
  WarningFilled,
  InfoCircleFilled,
  CloseCircleFilled,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { notificationService, type Notification, type NotificationType } from '../services/notification.service';

const { Text } = Typography;

const getIcon = (type: NotificationType) => {
  const iconStyle = { fontSize: 16 };
  switch (type) {
    case 'success':
      return <CheckCircleFilled style={{ ...iconStyle, color: '#52c41a' }} />;
    case 'warning':
      return <WarningFilled style={{ ...iconStyle, color: '#faad14' }} />;
    case 'error':
      return <CloseCircleFilled style={{ ...iconStyle, color: '#ff4d4f' }} />;
    default:
      return <InfoCircleFilled style={{ ...iconStyle, color: '#1890ff' }} />;
  }
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

export const NotificationDropdown = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const [unreadCount, setUnreadCount] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval>>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // silently ignore — badge just won't update
    }
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationService.getNotifications();
      const list = Array.isArray(data) ? data : [];
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.read).length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch unread count on mount and poll every 30s
  useEffect(() => {
    fetchUnreadCount();
    pollRef.current = setInterval(fetchUnreadCount, 30_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchUnreadCount]);

  // Fetch full list when dropdown opens
  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open]);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const wasUnread = notifications.find((n) => n.id === id && !n.read);
      await notificationService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await notificationService.markAsRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    if (notification.link) {
      setOpen(false);
      navigate(notification.link);
    }
  };

  const dropdownContent = (
    <div
      style={{
        width: 360,
        maxHeight: 480,
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text strong>Notifications</Text>
        {unreadCount > 0 && (
          <Button type="link" size="small" onClick={handleMarkAllAsRead} style={{ padding: 0 }}>
            Mark all as read
          </Button>
        )}
      </div>

      {/* Content */}
      <div style={{ maxHeight: 400, overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <Spin />
          </div>
        ) : notifications.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No notifications"
            style={{ padding: '40px 0' }}
          />
        ) : (
          <List
            dataSource={notifications}
            renderItem={(item) => (
              <div
                onClick={() => handleNotificationClick(item)}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #f5f5f5',
                  cursor: item.link ? 'pointer' : 'default',
                  background: item.read ? '#fff' : '#f6ffed',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (item.link) e.currentTarget.style.background = item.read ? '#fafafa' : '#f0ffe0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = item.read ? '#fff' : '#f6ffed';
                }}
              >
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flexShrink: 0, marginTop: 2 }}>{getIcon(item.type)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Text strong style={{ fontSize: 13 }}>{item.title}</Text>
                      <Text type="secondary" style={{ fontSize: 11, flexShrink: 0, marginLeft: 8 }}>
                        {formatTime(item.createdAt)}
                      </Text>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 2 }}>
                      {item.message}
                    </Text>
                  </div>
                  <div style={{ flexShrink: 0, display: 'flex', gap: 4 }}>
                    {!item.read && (
                      <Button
                        type="text"
                        size="small"
                        icon={<CheckOutlined style={{ fontSize: 12 }} />}
                        onClick={(e) => handleMarkAsRead(item.id, e)}
                        title="Mark as read"
                        style={{ padding: '0 4px', height: 24, width: 24 }}
                      />
                    )}
                    <Button
                      type="text"
                      size="small"
                      icon={<DeleteOutlined style={{ fontSize: 12 }} />}
                      onClick={(e) => handleDelete(item.id, e)}
                      title="Delete"
                      style={{ padding: '0 4px', height: 24, width: 24 }}
                    />
                  </div>
                </div>
              </div>
            )}
          />
        )}
      </div>
    </div>
  );

  return (
    <Dropdown
      popupRender={() => dropdownContent}
      trigger={['click']}
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
    >
      <Badge count={unreadCount} size="small">
        <BellOutlined
          style={{
            fontSize: 18,
            cursor: 'pointer',
            color: '#595959',
          }}
        />
      </Badge>
    </Dropdown>
  );
};
