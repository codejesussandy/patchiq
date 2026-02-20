import { http, HttpResponse } from 'msw';

const mockIPRanges = [
  { id: 'ipr-1', name: 'Corporate Network', range: '192.168.1.0/24', description: 'Main office network', lastScanned: '2024-03-15T10:30:00Z', deviceCount: 45, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'ipr-2', name: 'DMZ Network', range: '10.0.0.0/16', description: 'DMZ servers', lastScanned: null, deviceCount: 0, createdAt: '2024-02-01T00:00:00Z' },
];

const mockCredentials = [
  { id: 'cred-1', name: 'Linux Admin SSH', type: 'SSH', username: 'admin', password: '********', description: 'SSH key for Linux servers', lastUsed: '2024-03-15T10:00:00Z', createdAt: '2024-01-01T00:00:00Z' },
  { id: 'cred-2', name: 'Windows Admin', type: 'Windows', username: 'administrator', password: '********', description: 'Windows admin credentials', lastUsed: null, createdAt: '2024-02-01T00:00:00Z' },
  { id: 'cred-3', name: 'SNMP Community', type: 'SNMP', username: 'public', password: '********', description: 'SNMP read-only', lastUsed: '2024-03-10T08:00:00Z', createdAt: '2024-03-01T00:00:00Z' },
];

export const discoveryHandlers = [
  // IP Ranges
  http.get('*/discovery/ip-ranges', () => {
    return HttpResponse.json({ success: true, data: mockIPRanges, meta: { page: 1, limit: 20, total: mockIPRanges.length, totalPages: 1 } });
  }),
  http.get('*/discovery/ip-ranges/:id', () => {
    return HttpResponse.json({ success: true, data: mockIPRanges[0] });
  }),
  http.post('*/discovery/ip-ranges', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: 'ipr-new', ...body, deviceCount: 0, createdAt: new Date().toISOString() } });
  }),
  http.put('*/discovery/ip-ranges/:id', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { ...mockIPRanges[0], ...body } });
  }),
  http.delete('*/discovery/ip-ranges/:id', () => {
    return HttpResponse.json({ success: true, data: null });
  }),
  http.post('*/discovery/ip-ranges/:id/scan', () => {
    return HttpResponse.json({ success: true, data: { scanId: 'scan-1', status: 'STARTED', message: 'Scan initiated' } });
  }),

  // Credentials
  http.get('*/discovery/credentials', () => {
    return HttpResponse.json({ success: true, data: mockCredentials, meta: { page: 1, limit: 20, total: mockCredentials.length, totalPages: 1 } });
  }),
  http.get('*/discovery/credentials/:id', () => {
    return HttpResponse.json({ success: true, data: mockCredentials[0] });
  }),
  http.post('*/discovery/credentials', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: 'cred-new', ...body, createdAt: new Date().toISOString() } });
  }),
  http.put('*/discovery/credentials/:id', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { ...mockCredentials[0], ...body } });
  }),
  http.delete('*/discovery/credentials/:id', () => {
    return HttpResponse.json({ success: true, data: null });
  }),
  http.post('*/discovery/credentials/:id/test', () => {
    return HttpResponse.json({ success: true, data: { success: true, message: 'Credential test passed' } });
  }),

  // Discovery Agents
  http.get('*/discovery/agents', () => {
    return HttpResponse.json({ success: true, data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });
  }),
  http.post('*/discovery/agents', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: 'agent-new', ...body } });
  }),
  http.delete('*/discovery/agents/:id', () => {
    return HttpResponse.json({ success: true, data: null });
  }),
];

export { mockIPRanges, mockCredentials };
