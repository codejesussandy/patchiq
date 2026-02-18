import { useEffect, useRef, useCallback, useState } from 'react';
import { App } from 'antd';
import { STORAGE_KEYS } from '@/constants/storage.constants';

export interface SSENotification {
  id?: string;
  title: string;
  message: string;
  type: string;
  category?: string;
  read?: boolean;
  link?: string;
  createdAt?: string;
}

interface UseNotificationSSEOptions {
  onNotification: (notification: SSENotification) => void;
  enabled?: boolean;
}

export function useNotificationSSE({ onNotification, enabled = true }: UseNotificationSSEOptions) {
  const { message } = App.useApp();
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onNotificationRef = useRef(onNotification);
  const reconnectAttemptsRef = useRef(0);
  const [, setIsConnected] = useState(false);
  onNotificationRef.current = onNotification;

  const connect = useCallback(() => {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH.ACCESS_TOKEN);
    if (!token) return;

    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/v1';
    // Note: EventSource doesn't support custom headers, so auth token is passed via query param.
    // This is a known limitation. Consider using fetch+ReadableStream if backend adds header auth support.
    const url = `${baseUrl}/notifications/stream?token=${encodeURIComponent(token)}`;

    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
      if (reconnectAttemptsRef.current > 0) {
        message.success('Notifications reconnected', 2);
        reconnectAttemptsRef.current = 0;
      }
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'notification' && data.notification) {
          onNotificationRef.current(data.notification);
        }
      } catch {
        // Ignore parse errors (keepalive comments, etc.)
      }
    };

    es.onerror = () => {
      setIsConnected(false);
      es.close();
      esRef.current = null;

      const attempts = reconnectAttemptsRef.current;
      reconnectAttemptsRef.current = attempts + 1;

      if (attempts === 0) {
        message.warning('Notification connection lost. Reconnecting...', 3);
      }

      // Exponential backoff: min(5000 * 2^attempts, 30000)
      const delay = Math.min(5000 * Math.pow(2, attempts), 30000);
      reconnectTimerRef.current = setTimeout(connect, delay);
    };
  }, [message]);

  useEffect(() => {
    if (!enabled) return;

    connect();

    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [enabled, connect]);
}
