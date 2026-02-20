import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/services/notification.service', () => ({
  notificationService: {
    getNotifications: vi.fn().mockResolvedValue([{ id: 'n1', title: 'Alert', read: false }]),
    getUnreadCount: vi.fn().mockResolvedValue({ count: 3 }),
    getHistory: vi.fn().mockResolvedValue([]),
    getPreferences: vi.fn().mockResolvedValue({}),
    markAsRead: vi.fn().mockResolvedValue({}),
    markAllAsRead: vi.fn().mockResolvedValue({}),
    deleteNotification: vi.fn().mockResolvedValue({}),
    clearAll: vi.fn().mockResolvedValue({}),
  },
}));

import {
  useNotifications,
  useUnreadCount,
  useNotificationHistory,
  useNotificationPreferences,
  notificationKeys,
} from '@/hooks/useNotifications';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe('useNotifications hooks', () => {
  it('useNotifications should return loading initially', () => {
    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('useNotifications should return data on success', async () => {
    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([{ id: 'n1', title: 'Alert', read: false }]);
  });

  it('useUnreadCount should return loading initially', () => {
    const { result } = renderHook(() => useUnreadCount(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('useNotificationHistory should return loading initially', () => {
    const { result } = renderHook(() => useNotificationHistory(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('useNotificationPreferences should return loading initially', () => {
    const { result } = renderHook(() => useNotificationPreferences(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  describe('query keys', () => {
    it('notificationKeys should generate correct keys', () => {
      expect(notificationKeys.all).toEqual(['notifications']);
      expect(notificationKeys.lists()).toEqual(['notifications', 'list']);
      expect(notificationKeys.unreadCount()).toEqual(['notifications', 'unread-count']);
      expect(notificationKeys.preferences()).toEqual(['notifications', 'preferences']);
    });
  });
});
