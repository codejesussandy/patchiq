import { useEffect, useRef, useCallback } from 'react';

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
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onNotificationRef = useRef(onNotification);
  onNotificationRef.current = onNotification;

  const connect = useCallback(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/v1';
    const url = `${baseUrl}/notifications/stream?token=${encodeURIComponent(token)}`;

    const es = new EventSource(url);
    esRef.current = es;

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
      es.close();
      esRef.current = null;
      // Reconnect after 5 seconds
      reconnectTimerRef.current = setTimeout(connect, 5000);
    };
  }, []);

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
