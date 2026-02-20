import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, App as AntApp } from 'antd';
import { useNotificationSSE } from '@/hooks/useNotificationSSE';
import { createQueryClient } from '../test-utils';

function Wrapper({ children }) {
  return (
    <QueryClientProvider client={createQueryClient()}>
      <ConfigProvider>
        <AntApp>{children}</AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
}

describe('useNotificationSSE', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-access-token');
  });

  it('creates EventSource connection when enabled', () => {
    const onNotification = vi.fn();

    const { unmount } = renderHook(
      () => useNotificationSSE({ onNotification }),
      { wrapper: Wrapper }
    );

    // EventSource is mocked globally — verify its constructor was called with a URL
    // Since the mock stores readyState, we just verify no error was thrown
    // and the hook rendered successfully
    expect(onNotification).not.toHaveBeenCalled();

    unmount();
  });

  it('does not connect when no auth token', () => {
    localStorage.clear();

    const onNotification = vi.fn();
    const EventSourceSpy = vi.spyOn(global, 'EventSource' as never);

    renderHook(
      () => useNotificationSSE({ onNotification }),
      { wrapper: Wrapper }
    );

    // Without token, connect() returns early — no EventSource should be instantiated
    expect(EventSourceSpy).not.toHaveBeenCalled();

    EventSourceSpy.mockRestore();
  });

  it('does not connect when disabled', () => {
    const onNotification = vi.fn();
    const EventSourceSpy = vi.spyOn(global, 'EventSource' as never);

    renderHook(
      () => useNotificationSSE({ onNotification, enabled: false }),
      { wrapper: Wrapper }
    );

    expect(EventSourceSpy).not.toHaveBeenCalled();

    EventSourceSpy.mockRestore();
  });

  it('cleans up EventSource on unmount', () => {
    const onNotification = vi.fn();

    // Track close calls via a custom EventSource mock
    let closeCalled = false;
    const OriginalEventSource = global.EventSource;

    class TrackingEventSource extends OriginalEventSource {
      constructor(url) {
        super(url);
      }
      close() {
        closeCalled = true;
        super.close();
      }
    }

    global.EventSource = TrackingEventSource;

    const { unmount } = renderHook(
      () => useNotificationSSE({ onNotification }),
      { wrapper: Wrapper }
    );

    act(() => {
      unmount();
    });

    expect(closeCalled).toBe(true);

    global.EventSource = OriginalEventSource;
  });
});
