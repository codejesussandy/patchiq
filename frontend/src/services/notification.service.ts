import { api } from './api.service';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export type Notification = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
  link?: string;
};

export const notificationService = {
  async getNotifications(): Promise<Notification[]> {
    const response = await api.get(`/notifications`);
    return response.data;
  },

  async getUnreadCount(): Promise<number> {
    const response = await api.get(`/notifications/unread-count`);
    return response.data.count;
  },

  async markAsRead(id: string): Promise<void> {
    await api.put(`/notifications/${id}/read`);
  },

  async markAllAsRead(): Promise<void> {
    await api.put(`/notifications/mark-all-read`);
  },

  async deleteNotification(id: string): Promise<void> {
    await api.delete(`/notifications/${id}`);
  },

  async clearAll(): Promise<void> {
    await api.delete(`/notifications`);
  },
};
