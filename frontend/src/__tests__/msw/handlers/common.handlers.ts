import { http, HttpResponse } from 'msw';

export const commonHandlers = [
  http.get('*/categories', () => {
    return HttpResponse.json({ success: true, data: [] });
  }),
  http.get('*/subcategories', () => {
    return HttpResponse.json({ success: true, data: [] });
  }),
  http.get('*/settings/organizations', () => {
    return HttpResponse.json({ success: true, data: [] });
  }),
  http.get('*/notifications', () => {
    return HttpResponse.json({ success: true, data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } });
  }),
  http.get('*/agents', () => {
    return HttpResponse.json({ success: true, data: [
      { id: 'agent-1', name: 'Agent-01', status: 'CONNECTED', os: 'Windows' },
      { id: 'agent-2', name: 'Agent-02', status: 'CONNECTED', os: 'Linux' },
    ], meta: { page: 1, limit: 20, total: 2, totalPages: 1 } });
  }),
  http.get('*/settings/computer-groups', () => {
    return HttpResponse.json({ success: true, data: [
      { id: 'grp-1', name: 'Production Servers' },
      { id: 'grp-2', name: 'Dev Workstations' },
    ] });
  }),
  http.get('*/patch-templates', () => {
    return HttpResponse.json({ success: true, data: [] });
  }),
  http.get('*/vulnerability-suggestions', () => {
    return HttpResponse.json({ success: true, data: [] });
  }),
  http.get('*/patches/search', () => {
    return HttpResponse.json({ success: true, data: [] });
  }),
];
