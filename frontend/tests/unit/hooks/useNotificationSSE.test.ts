import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNotificationSSE } from '@/hooks/useNotificationSSE';
import type { SSENotification } from '@/hooks/useNotificationSSE';

// Mock antd App.useApp
const mockMessage = {
  loading: vi.fn().mockReturnValue(vi.fn()),
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
};

vi.mock('antd', () => ({
  App: {
    useApp: () => ({
      message: mockMessage,
    }),
  },
}));

// Track the most recently created EventSource instance
let latestES: {
  url: string;
  onopen: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  close: ReturnType<typeof vi.fn>;
  readyState: number;
};

let constructorCallCount: number;

class MockEventSource {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;
  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSED = 2;
  readyState = 0;
  url: string;
  withCredentials = false;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  close = vi.fn();

  constructor(url: string) {
    this.url = url;
    latestES = this;
    constructorCallCount++;
  }

  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() { return false; }
}

describe('useNotificationSSE', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    constructorCallCount = 0;

    global.EventSource = MockEventSource as unknown as typeof EventSource;

    localStorage.setItem('accessToken', 'test-token-123');
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('should create EventSource on mount when enabled', () => {
    const onNotification = vi.fn();

    renderHook(() => useNotificationSSE({ onNotification }));

    expect(constructorCallCount).toBe(1);
    expect(latestES.url).toContain('token=test-token-123');
  });

  it('should not create EventSource when no token in localStorage', () => {
    localStorage.clear();
    const onNotification = vi.fn();

    renderHook(() => useNotificationSSE({ onNotification }));

    expect(constructorCallCount).toBe(0);
  });

  it('should not create EventSource when enabled is false', () => {
    const onNotification = vi.fn();

    renderHook(() =>
      useNotificationSSE({ onNotification, enabled: false }),
    );

    expect(constructorCallCount).toBe(0);
  });

  it('should handle incoming notification messages', () => {
    const onNotification = vi.fn();

    renderHook(() => useNotificationSSE({ onNotification }));

    const notification: SSENotification = {
      id: 'n1',
      title: 'Patch Available',
      message: 'New critical patch',
      type: 'patch',
    };

    // Simulate a message event
    act(() => {
      latestES.onmessage?.({
        data: JSON.stringify({ type: 'notification', notification }),
      } as MessageEvent);
    });

    expect(onNotification).toHaveBeenCalledWith(notification);
  });

  it('should ignore non-notification messages', () => {
    const onNotification = vi.fn();

    renderHook(() => useNotificationSSE({ onNotification }));

    act(() => {
      latestES.onmessage?.({
        data: JSON.stringify({ type: 'keepalive' }),
      } as MessageEvent);
    });

    expect(onNotification).not.toHaveBeenCalled();
  });

  it('should ignore invalid JSON messages', () => {
    const onNotification = vi.fn();

    renderHook(() => useNotificationSSE({ onNotification }));

    act(() => {
      latestES.onmessage?.({
        data: 'not valid json',
      } as MessageEvent);
    });

    expect(onNotification).not.toHaveBeenCalled();
  });

  it('should close EventSource on unmount', () => {
    const onNotification = vi.fn();

    const { unmount } = renderHook(() =>
      useNotificationSSE({ onNotification }),
    );

    const es = latestES;
    unmount();

    expect(es.close).toHaveBeenCalled();
  });

  it('should attempt reconnect on error with backoff', () => {
    const onNotification = vi.fn();

    renderHook(() => useNotificationSSE({ onNotification }));

    expect(constructorCallCount).toBe(1);

    // Simulate error
    act(() => {
      latestES.onerror?.({} as Event);
    });

    expect(latestES.close).toHaveBeenCalled();
    expect(mockMessage.warning).toHaveBeenCalledWith(
      'Notification connection lost. Reconnecting...',
      3,
    );

    // Advance timer by initial backoff (5000ms)
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Should have attempted reconnect
    expect(constructorCallCount).toBe(2);
  });

  it('should show success message on reconnect after error', () => {
    const onNotification = vi.fn();

    renderHook(() => useNotificationSSE({ onNotification }));

    // Simulate error
    act(() => {
      latestES.onerror?.({} as Event);
    });

    // Advance past backoff
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Simulate successful reconnect
    act(() => {
      latestES.onopen?.({} as Event);
    });

    expect(mockMessage.success).toHaveBeenCalledWith(
      'Notifications reconnected',
      2,
    );
  });
});
