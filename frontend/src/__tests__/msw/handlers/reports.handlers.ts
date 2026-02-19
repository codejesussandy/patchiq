import { http, HttpResponse } from 'msw';

const mockReportTemplates = [
  { id: 'tmpl-1', name: 'Patch Compliance', type: 'PATCH_COMPLIANCE', description: 'Shows patch compliance across endpoints' },
  { id: 'tmpl-2', name: 'Vulnerability Summary', type: 'VULNERABILITY_SUMMARY', description: 'Summary of all vulnerabilities' },
];

const mockReports = [
  { id: 'report-1', name: 'Monthly Patch Report', description: 'January 2024 patches', type: 'PATCH_COMPLIANCE', format: 'PDF', status: 'COMPLETED', fileSize: 1048576, generatedAt: '2024-01-31T12:00:00Z', createdBy: 'admin@patchiq.io', createdAt: '2024-01-31T10:00:00Z', schedule: null },
  { id: 'report-2', name: 'Weekly Vuln Scan', description: 'Weekly vulnerability scan report', type: 'VULNERABILITY_SUMMARY', format: 'CSV', status: 'PROCESSING', fileSize: null, generatedAt: null, createdBy: 'admin@patchiq.io', createdAt: '2024-02-01T08:00:00Z', schedule: { enabled: true, frequency: 'WEEKLY' } },
];

const mockSchedules = [
  { id: 'sched-1', reportId: 'report-2', frequency: 'WEEKLY', recipients: ['admin@patchiq.io'], enabled: true, nextRunAt: '2024-02-08T08:00:00Z', createdAt: '2024-02-01T08:00:00Z' },
];

export const reportsHandlers = [
  // GET /reports (paginated with query params)
  http.get('*/reports', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const search = url.searchParams.get('search') || '';
    const type = url.searchParams.get('type') || '';
    const format = url.searchParams.get('format') || '';
    const status = url.searchParams.get('status') || '';

    let filtered = [...mockReports];
    if (search) filtered = filtered.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));
    if (type) filtered = filtered.filter(r => r.type === type);
    if (format) filtered = filtered.filter(r => r.format === format);
    if (status) filtered = filtered.filter(r => r.status === status);

    return HttpResponse.json({
      success: true,
      data: filtered,
      meta: { page, limit, total: filtered.length, totalPages: Math.ceil(filtered.length / limit) },
    });
  }),

  // GET /reports/templates
  http.get('*/reports/templates', () => {
    return HttpResponse.json({ success: true, data: mockReportTemplates });
  }),

  // GET /reports/schedules
  http.get('*/reports/schedules', () => {
    return HttpResponse.json({ success: true, data: mockSchedules });
  }),

  // POST /reports/schedules
  http.post('*/reports/schedules', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: 'sched-new', ...body, createdAt: new Date().toISOString() } });
  }),

  // PUT /reports/schedules/:id
  http.put('*/reports/schedules/:id', async ({ params, request }) => {
    const body = await request.json();
    const schedule = mockSchedules.find(s => s.id === params.id);
    return HttpResponse.json({ success: true, data: { ...schedule, ...body } });
  }),

  // DELETE /reports/schedules/:id
  http.delete('*/reports/schedules/:id', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  // GET /reports/:id/download
  http.get('*/reports/:id/download', () => {
    return new HttpResponse(new Blob(['mock report content'], { type: 'application/pdf' }), {
      status: 200,
      headers: { 'Content-Type': 'application/pdf' },
    });
  }),

  // POST /reports/:id/regenerate
  http.post('*/reports/:id/regenerate', ({ params }) => {
    const report = mockReports.find(r => r.id === params.id);
    return HttpResponse.json({ success: true, data: { ...report, status: 'PROCESSING', generatedAt: null } });
  }),

  // POST /reports/:id/send
  http.post('*/reports/:id/send', () => {
    return HttpResponse.json({ success: true, data: { message: 'Report sent successfully' } });
  }),

  // GET /reports/:id/preview
  http.get('*/reports/:id/preview', ({ params }) => {
    const report = mockReports.find(r => r.id === params.id);
    return HttpResponse.json({ success: true, data: { ...report, previewUrl: `/preview/${params.id}` } });
  }),

  // GET /reports/:id
  http.get('*/reports/:id', ({ params }) => {
    const report = mockReports.find(r => r.id === params.id);
    if (!report) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Report not found' } }, { status: 404 });
    return HttpResponse.json({ success: true, data: report });
  }),

  // POST /reports
  http.post('*/reports', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: 'report-new', ...body, status: 'PROCESSING', fileSize: null, generatedAt: null, createdAt: new Date().toISOString() } });
  }),

  // PUT /reports/:id
  http.put('*/reports/:id', async ({ params, request }) => {
    const body = await request.json();
    const report = mockReports.find(r => r.id === params.id);
    return HttpResponse.json({ success: true, data: { ...report, ...body } });
  }),

  // DELETE /reports/:id
  http.delete('*/reports/:id', () => {
    return HttpResponse.json({ success: true, data: null });
  }),
];

export { mockReportTemplates, mockReports, mockSchedules };
