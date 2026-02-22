import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BellOutlined,
  CheckOutlined,
  DeleteOutlined,
  CheckCircleFilled,
  WarningFilled,
  InfoCircleFilled,
  CloseCircleFilled,
  MoreOutlined,
} from '@ant-design/icons';
import { Badge, Typography, Button, Empty, Spin, Popover, Segmented } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useNotificationSSE } from '../hooks/useNotificationSSE';
import { notificationService, type Notification, type NotificationType } from '../services/notification.service';

const { Text } = Typography;

const TYPE_CONFIG: Record<NotificationType, { icon: React.ReactNode; color: string; bg: string }> = {
  success: { icon: <CheckCircleFilled />, color: '#52c41a', bg: '#f6ffed' },
  warning: { icon: <WarningFilled />, color: '#faad14', bg: '#fffbe6' },
  error: { icon: <CloseCircleFilled />, color: '#ff4d4f', bg: '#fff2f0' },
  info: { icon: <InfoCircleFilled />, color: '#1677ff', bg: '#e6f4ff' },
};

const CATEGORY_LABELS: Record<string, string> = {
  agent: 'Agent',
  deployment: 'Deployment',
  vulnerability: 'Vulnerability',
  alert: 'Alert',
  system: 'System',
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
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const isToday = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  return date.toDateString() === now.toDateString();
};

export const NotificationDropdown = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval>>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // silently ignore
    }
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationService.getNotifications();
      const list = Array.isArray(data) ? data : [];
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.read).length);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useNotificationSSE({
    onNotification: (sseNotif) => {
      const newNotif: Notification = {
        id: sseNotif.id || crypto.randomUUID(),
        title: sseNotif.title,
        message: sseNotif.message,
        type: (sseNotif.type as NotificationType) || 'info',
        category: sseNotif.category as Notification['category'],
        read: false,
        createdAt: sseNotif.createdAt || new Date().toISOString(),
        link: sseNotif.link,
      };
      setNotifications((prev) => [newNotif, ...prev].slice(0, 20));
      setUnreadCount((c) => c + 1);
    },
  });

  useEffect(() => {
    fetchUnreadCount();
    pollRef.current = setInterval(fetchUnreadCount, 60_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open]);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* silently fail */ }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const wasUnread = notifications.find((n) => n.id === id && !n.read);
      await notificationService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* silently fail */ }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch { /* silently fail */ }
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

  const filtered = filter === 'unread'
    ? notifications.filter((n) => !n.read)
    : notifications;

  // Group into today / earlier
  const todayItems = filtered.filter((n) => isToday(n.createdAt));
  const earlierItems = filtered.filter((n) => !isToday(n.createdAt));

  const renderItem = (item: Notification) => {
    const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.info;
    const isHovered = hoveredId === item.id;

    return (
      <div
        key={item.id}
        onClick={() => handleNotificationClick(item)}
        onMouseEnter={() => setHoveredId(item.id)}
        onMouseLeave={() => setHoveredId(null)}
        style={{
          display: 'flex',
          gap: 12,
          padding: '12px 16px',
          cursor: item.link ? 'pointer' : 'default',
          background: isHovered ? '#fafafa' : 'transparent',
          transition: 'background 0.15s',
          position: 'relative',
        }}
      >
        {/* Unread dot */}
        {!item.read && (
          <div
            style={{
              position: 'absolute',
              left: 6,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#1677ff',
            }}
          />
        )}

        {/* Icon */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: config.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 15,
            color: config.color,
            flexShrink: 0,
          }}
        >
          {config.icon}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <Text
              strong={!item.read}
              style={{ fontSize: 13, lineHeight: '18px', flex: 1 }}
              ellipsis
            >
              {item.title}
            </Text>
            <Text
              type="secondary"
              style={{ fontSize: 11, flexShrink: 0, whiteSpace: 'nowrap' }}
            >
              {formatTime(item.createdAt)}
            </Text>
          </div>
          <Text
            type="secondary"
            style={{ fontSize: 12, lineHeight: '18px', display: 'block', marginTop: 2 }}
            ellipsis={{ rows: 2 }}
          >
            {item.message}
          </Text>
          {item.category && (
            <span
              style={{
                display: 'inline-block',
                marginTop: 4,
                fontSize: 10,
                fontWeight: 500,
                color: '#8c8c8c',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              {CATEGORY_LABELS[item.category] || item.category}
            </span>
          )}
        </div>

        {/* Actions on hover */}
        {isHovered && (
          <div
            style={{
              display: 'flex',
              gap: 2,
              flexShrink: 0,
              alignSelf: 'center',
            }}
          >
            {!item.read && (
              <Button
                type="text"
                size="small"
                icon={<CheckOutlined style={{ fontSize: 12 }} />}
                onClick={(e) => handleMarkAsRead(item.id, e)}
                title="Mark as read"
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  color: '#8c8c8c',
                }}
              />
            )}
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined style={{ fontSize: 12 }} />}
              onClick={(e) => handleDelete(item.id, e)}
              title="Delete"
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                color: '#8c8c8c',
              }}
            />
          </div>
        )}
      </div>
    );
  };

  const renderSection = (label: string, items: Notification[]) => {
    if (items.length === 0) return null;
    return (
      <div key={label}>
        <div
          style={{
            padding: '8px 16px 4px',
            fontSize: 11,
            fontWeight: 600,
            color: '#8c8c8c',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          {label}
        </div>
        {items.map(renderItem)}
      </div>
    );
  };

  const dropdownContent = (
    <div
      style={{
        width: 400,
        maxHeight: 540,
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 12px 28px rgba(0, 0, 0, 0.12), 0 4px 10px rgba(0, 0, 0, 0.06)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 16px 12px',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text strong style={{ fontSize: 15 }}>Notifications</Text>
          {unreadCount > 0 && (
            <Button
              type="link"
              size="small"
              onClick={handleMarkAllAsRead}
              style={{ padding: 0, fontSize: 12, height: 'auto' }}
            >
              Mark all read
            </Button>
          )}
        </div>
        <Segmented
          size="small"
          value={filter}
          onChange={(v) => setFilter(v as 'all' | 'unread')}
          options={[
            { label: 'All', value: 'all' },
            { label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}`, value: 'unread' },
          ]}
          block
          style={{ fontSize: 12 }}
        />
      </div>

      {/* Content */}
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <Spin size="small" />
          </div>
        ) : filtered.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={filter === 'unread' ? 'No unread notifications' : 'No notifications'}
            style={{ padding: '40px 0' }}
          />
        ) : (
          <>
            {renderSection('Today', todayItems)}
            {renderSection('Earlier', earlierItems)}
            {/* If all items are from one group, render without headers */}
            {todayItems.length === 0 && earlierItems.length === 0 && filtered.map(renderItem)}
          </>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '8px 16px',
          borderTop: '1px solid #f0f0f0',
          textAlign: 'center',
          background: '#fafafa',
        }}
      >
        <Button
          type="link"
          size="small"
          onClick={() => { setOpen(false); navigate('/notifications'); }}
          style={{ fontSize: 12, color: '#595959' }}
        >
          View all notifications
        </Button>
      </div>
    </div>
  );

  return (
    <Popover
      content={dropdownContent}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
      arrow={false}
      overlayInnerStyle={{ padding: 0, borderRadius: 12 }}
    >
      <div
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          borderRadius: 8,
          transition: 'background 0.15s',
          background: open ? '#f0f0f0' : 'transparent',
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = '#f5f5f5'; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = 'transparent'; }}
      >
        <Badge count={unreadCount} size="small" offset={[-2, 2]}>
          <BellOutlined style={{ fontSize: 18, color: '#595959' }} />
        </Badge>
      </div>
    </Popover>
  );
};
