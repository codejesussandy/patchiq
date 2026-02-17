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
  const [, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
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
      if (reconnectAttempts > 0) {
        message.success('Notifications reconnected', 2);
        setReconnectAttempts(0);
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

      setReconnectAttempts((prev) => {
        const newAttempts = prev + 1;
        if (newAttempts === 1) {
          message.warning('Notification connection lost. Reconnecting...', 3);
        }
        return newAttempts;
      });

      // Reconnect after 5 seconds
      // eslint-disable-next-line react-hooks/immutability -- self-referencing reconnect pattern
      reconnectTimerRef.current = setTimeout(connect, 5000);
    };
  }, [message, reconnectAttempts]);

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
