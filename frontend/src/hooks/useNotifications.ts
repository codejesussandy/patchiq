import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../services/notification.service';
import type { NotificationHistoryParams } from '../services/notification.service';

export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
  history: (params?: NotificationHistoryParams) => [...notificationKeys.all, 'history', params] as const,
  preferences: () => [...notificationKeys.all, 'preferences'] as const,
};

export function useNotifications() {
  return useQuery({ queryKey: notificationKeys.lists(), queryFn: () => notificationService.getNotifications() });
}

export function useUnreadCount() {
  return useQuery({ queryKey: notificationKeys.unreadCount(), queryFn: () => notificationService.getUnreadCount() });
}

export function useNotificationHistory(params?: NotificationHistoryParams) {
  return useQuery({ queryKey: notificationKeys.history(params), queryFn: () => notificationService.getHistory(params) });
}

export function useNotificationPreferences() {
  return useQuery({ queryKey: notificationKeys.preferences(), queryFn: () => notificationService.getPreferences() });
}

// ============================================
// Mutations
// ============================================

export function useMarkAsRead() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => notificationService.markAsRead(id), onSuccess: () => { qc.invalidateQueries({ queryKey: notificationKeys.all }); } });
}

export function useMarkAllAsRead() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => notificationService.markAllAsRead(), onSuccess: () => { qc.invalidateQueries({ queryKey: notificationKeys.all }); } });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => notificationService.deleteNotification(id), onSuccess: () => { qc.invalidateQueries({ queryKey: notificationKeys.all }); } });
}

export function useClearAllNotifications() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => notificationService.clearAll(), onSuccess: () => { qc.invalidateQueries({ queryKey: notificationKeys.all }); } });
}

export function useBulkMarkAsRead() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (ids: string[]) => notificationService.bulkMarkAsRead(ids), onSuccess: () => { qc.invalidateQueries({ queryKey: notificationKeys.all }); } });
}

export function useBulkDeleteNotifications() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (ids: string[]) => notificationService.bulkDelete(ids), onSuccess: () => { qc.invalidateQueries({ queryKey: notificationKeys.all }); } });
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (prefs: Partial<import('../services/notification.service').NotificationPreferences>) => notificationService.updatePreferences(prefs), onSuccess: () => { qc.invalidateQueries({ queryKey: notificationKeys.preferences() }); } });
}
