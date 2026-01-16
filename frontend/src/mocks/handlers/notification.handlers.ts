import { http, HttpResponse } from 'msw';
import type { Notification } from '../../services/notification.service';

const API_BASE_URL = '/v1';

let mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Deployment Completed',
    message: 'Windows Security Update deployment completed successfully on 45 endpoints.',
    type: 'success',
    read: false,
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 mins ago
    link: '/patches/deployed',
  },
  {
    id: '2',
    title: 'Critical Patch Available',
    message: 'New critical security patch KB5063709 is available for Windows 10.',
    type: 'warning',
    read: false,
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 mins ago
    link: '/patches',
  },
  {
    id: '3',
    title: 'Agent Disconnected',
    message: 'Agent on WORKSTATION-5YT8QWE has been offline for 2 hours.',
    type: 'error',
    read: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    link: '/discovery/agents',
  },
  {
    id: '4',
    title: 'Scan Completed',
    message: 'Vulnerability scan completed. 3 new vulnerabilities detected.',
    type: 'info',
    read: true,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
  },
  {
    id: '5',
    title: 'License Expiring Soon',
    message: 'Microsoft Office license expires in 7 days.',
    type: 'warning',
    read: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    link: '/assets/software-license',
  },
];

export const notificationHandlers = [
  // Get all notifications
  http.get(`${API_BASE_URL}/notifications`, () => {
    return HttpResponse.json(mockNotifications);
  }),

  // Get unread count
  http.get(`${API_BASE_URL}/notifications/unread-count`, () => {
    const count = mockNotifications.filter((n) => !n.read).length;
    return HttpResponse.json({ count });
  }),

  // Mark single notification as read
  http.put(`${API_BASE_URL}/notifications/:id/read`, ({ params }) => {
    const { id } = params;
    const notification = mockNotifications.find((n) => n.id === id);
    if (notification) {
      notification.read = true;
    }
    return HttpResponse.json({ success: true });
  }),

  // Mark all as read
  http.put(`${API_BASE_URL}/notifications/mark-all-read`, () => {
    mockNotifications.forEach((n) => {
      n.read = true;
    });
    return HttpResponse.json({ success: true });
  }),

  // Delete single notification
  http.delete(`${API_BASE_URL}/notifications/:id`, ({ params }) => {
    const { id } = params;
    mockNotifications = mockNotifications.filter((n) => n.id !== id);
    return HttpResponse.json({ success: true });
  }),

  // Clear all notifications
  http.delete(`${API_BASE_URL}/notifications`, () => {
    mockNotifications = [];
    return HttpResponse.json({ success: true });
  }),
];
