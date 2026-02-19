import { http, HttpResponse } from 'msw';

const mockCategories = [
  { id: 'cat-1', name: 'Servers', color: 'blue', description: 'Physical and virtual servers' },
  { id: 'cat-2', name: 'Workstations', color: 'green', description: 'Desktop and laptop workstations' },
];

const mockSubCategories = [
  { id: 'sub-1', name: 'Production Servers', criticality: 'HIGH', description: 'Production environment', categoryId: 'cat-1' },
  { id: 'sub-2', name: 'Development Servers', criticality: 'LOW', description: 'Dev environment', categoryId: 'cat-1' },
];

export const categoryHandlers = [
  http.get('*/categories', () => {
    return HttpResponse.json({ success: true, data: mockCategories });
  }),

  http.get('*/categories/:id', ({ params }) => {
    const cat = mockCategories.find(c => c.id === params.id);
    const subs = mockSubCategories.filter(s => s.categoryId === params.id);
    return HttpResponse.json({ success: true, data: { ...cat, subCategories: subs } });
  }),

  http.post('*/categories', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: 'cat-new', ...body } });
  }),

  http.put('*/categories/:id', async ({ request, params }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: params.id, ...body } });
  }),

  http.delete('*/categories/:id', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  http.get('*/categories/:id/assets', () => {
    return HttpResponse.json({ success: true, data: [] });
  }),

  http.get('*/subcategories', () => {
    return HttpResponse.json({ success: true, data: mockSubCategories });
  }),

  http.get('*/subcategories/:id', ({ params }) => {
    const sub = mockSubCategories.find(s => s.id === params.id);
    return HttpResponse.json({ success: true, data: sub });
  }),

  http.post('*/subcategories', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: 'sub-new', ...body } });
  }),

  http.put('*/subcategories/:id', async ({ request, params }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: params.id, ...body } });
  }),

  http.delete('*/subcategories/:id', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  http.get('*/subcategories/:id/assets', () => {
    return HttpResponse.json({ success: true, data: [] });
  }),
];

export { mockCategories, mockSubCategories };
