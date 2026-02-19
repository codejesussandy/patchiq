import { http, HttpResponse } from 'msw';

const mockTags = [
  { id: 'tag-1', name: 'Production', color: 'red', description: 'Production assets', assetCount: 15, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'tag-2', name: 'Critical', color: 'orange', description: 'Critical infrastructure', assetCount: 8, createdAt: '2024-02-01T00:00:00Z' },
  { id: 'tag-3', name: 'Development', color: 'blue', description: 'Development assets', assetCount: 25, createdAt: '2024-03-01T00:00:00Z' },
];

export const tagHandlers = [
  http.get('*/tags', () => {
    return HttpResponse.json({ success: true, data: mockTags });
  }),

  http.get('*/tags/search', ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q') || '';
    const filtered = mockTags.filter(t => t.name.toLowerCase().includes(q.toLowerCase()));
    return HttpResponse.json({ success: true, data: filtered });
  }),

  http.get('*/tags/popular', () => {
    return HttpResponse.json({ success: true, data: mockTags });
  }),

  http.get('*/tags/:id', ({ params }) => {
    const tag = mockTags.find(t => t.id === params.id);
    return HttpResponse.json({ success: true, data: tag });
  }),

  http.post('*/tags', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: 'tag-new', ...body, assetCount: 0, createdAt: new Date().toISOString() } });
  }),

  http.put('*/tags/:id', async ({ request, params }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: params.id, ...body } });
  }),

  http.delete('*/tags/:id', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  http.get('*/tags/:id/assets', () => {
    return HttpResponse.json({ success: true, data: [] });
  }),

  http.post('*/assets/bulk-tags', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  http.post('*/tags/bulk-remove', () => {
    return HttpResponse.json({ success: true, data: null });
  }),
];

export { mockTags };
