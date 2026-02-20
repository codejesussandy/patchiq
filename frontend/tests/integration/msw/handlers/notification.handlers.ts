import { http, HttpResponse } from 'msw';

const mockNotifications = [
  { id: 'notif-1', title: 'Agent Connected', message: 'Agent srv-01 connected successfully', type: 'success', category: 'agent', read: false, createdAt: '2024-06-01T10:00:00Z', link: '/assets/asset-1' },
  { id: 'notif-2', title: 'Deployment Complete', message: 'Patch KB123 deployed to 5 endpoints', type: 'info', category: 'deployment', read: true, createdAt: '2024-06-01T09:00:00Z', link: '/patches/patch-1' },
  { id: 'notif-3', title: 'Critical Vulnerability', message: 'CVE-2024-1234 detected on 3 endpoints', type: 'error', category: 'vulnerability', read: false, createdAt: '2024-06-01T08:00:00Z', link: '/vulnerability/vuln-1' },
];

const mockNotificationPreferences = {
  agentInApp: true,
  agentEmail: false,
  deploymentInApp: true,
  deploymentEmail: true,
  vulnerabilityInApp: true,
  vulnerabilityEmail: false,
  alertInApp: true,
  alertEmail: true,
  systemInApp: true,
  systemEmail: false,
};

export const notificationHandlers = [
  // GET /notifications/unread-count - must come before /notifications
  http.get('*/notifications/unread-count', () => {
    const unreadCount = mockNotifications.filter(n => !n.read).length;
    return HttpResponse.json({ count: unreadCount });
  }),

  // GET /notifications/history - must come before /notifications
  http.get('*/notifications/history', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    return HttpResponse.json({
      data: mockNotifications,
      total: mockNotifications.length,
      page,
      limit,
    });
  }),

  // PUT /notifications/mark-all-read
  http.put('*/notifications/mark-all-read', () => {
    return HttpResponse.json({ success: true, data: { message: 'All notifications marked as read' } });
  }),

  // PUT /notifications/bulk-read
  http.put('*/notifications/bulk-read', () => {
    return HttpResponse.json({ success: true, data: { message: 'Notifications marked as read' } });
  }),

  // DELETE /notifications/bulk
  http.delete('*/notifications/bulk', () => {
    return HttpResponse.json({ success: true, data: { message: 'Notifications deleted' } });
  }),

  // GET /notifications/preferences
  http.get('*/notifications/preferences', () => {
    return HttpResponse.json(mockNotificationPreferences);
  }),

  // PUT /notifications/preferences
  http.put('*/notifications/preferences', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ ...mockNotificationPreferences, ...body });
  }),

  // GET /notifications - returns plain array
  http.get('*/notifications', () => {
    return HttpResponse.json(mockNotifications);
  }),

  // PUT /notifications/:id/read
  http.put('*/notifications/:id/read', ({ params }) => {
    const notification = mockNotifications.find(n => n.id === params.id);
    return HttpResponse.json({ success: true, data: { ...notification, read: true } });
  }),

  // DELETE /notifications/:id
  http.delete('*/notifications/:id', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  // DELETE /notifications (clear all)
  http.delete('*/notifications', () => {
    return HttpResponse.json({ success: true, data: { message: 'All notifications cleared' } });
  }),
];

export { mockNotifications, mockNotificationPreferences };
