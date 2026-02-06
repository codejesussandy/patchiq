import { api } from './api.service';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type NotificationCategory = 'agent' | 'deployment' | 'vulnerability' | 'alert' | 'system';

export type Notification = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  category?: NotificationCategory;
  read: boolean;
  createdAt: string;
  link?: string;
};

export interface NotificationHistoryParams {
  page?: number;
  limit?: number;
  type?: NotificationType;
  category?: NotificationCategory;
  read?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'createdAt' | 'type' | 'category';
  sortOrder?: 'asc' | 'desc';
}

export interface NotificationHistoryResponse {
  data: Notification[];
  total: number;
  page: number;
  limit: number;
}

export interface NotificationPreferences {
  agentInApp: boolean;
  agentEmail: boolean;
  deploymentInApp: boolean;
  deploymentEmail: boolean;
  vulnerabilityInApp: boolean;
  vulnerabilityEmail: boolean;
  alertInApp: boolean;
  alertEmail: boolean;
  systemInApp: boolean;
  systemEmail: boolean;
}

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

  async getHistory(params: NotificationHistoryParams = {}): Promise<NotificationHistoryResponse> {
    const response = await api.get(`/notifications/history`, { params });
    return response.data;
  },

  async bulkMarkAsRead(ids: string[]): Promise<void> {
    await api.put(`/notifications/bulk-read`, { ids });
  },

  async bulkDelete(ids: string[]): Promise<void> {
    await api.delete(`/notifications/bulk`, { data: { ids } });
  },

  async getPreferences(): Promise<NotificationPreferences> {
    const response = await api.get(`/notifications/preferences`);
    return response.data;
  },

  async updatePreferences(prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const response = await api.put(`/notifications/preferences`, prefs);
    return response.data;
  },
};
