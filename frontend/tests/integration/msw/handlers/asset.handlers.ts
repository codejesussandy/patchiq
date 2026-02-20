import { http, HttpResponse } from 'msw';

const mockAssets = [
  { id: 'asset-1', name: 'Server-01', assetId: 'AST-001', hostname: 'srv-01.local', ipAddress: '192.168.1.10', osType: 'WINDOWS', status: 'IN_USE', operationalStatus: 'CONNECTED', categoryId: 'cat-1', subCategoryId: 'sub-1', manufacturer: 'Dell', model: 'PowerEdge R740', tagIds: ['tag-1'], createdAt: '2024-01-01T00:00:00Z', agent: { id: 'agent-1' } },
  { id: 'asset-2', name: 'Workstation-01', assetId: 'AST-002', hostname: 'ws-01.local', ipAddress: '192.168.1.20', osType: 'LINUX', status: 'AVAILABLE', operationalStatus: 'DISCONNECTED', categoryId: null, subCategoryId: null, manufacturer: 'Lenovo', model: 'ThinkPad T14', tagIds: [], createdAt: '2024-02-01T00:00:00Z', agent: null },
];

const mockSoftwareInventory = [
  { id: 'sw-1', softwareName: 'Visual Studio Code', version: '1.85.0', softwareType: 'Application', manufacturer: 'Microsoft', totalInstances: 45 },
  { id: 'sw-2', softwareName: 'Google Chrome', version: '120.0', softwareType: 'Browser', manufacturer: 'Google', totalInstances: 150 },
];

const mockSoftwareLicenses = [
  { id: 'sl-1', licenseName: 'Office 365 Enterprise', softwareName: 'Microsoft Office', status: 'ALLOCATED', licenseCount: 100, vendorName: 'Microsoft', purchaseDate: '2024-01-01', expiryDate: '2025-01-01' },
  { id: 'sl-2', licenseName: 'Adobe CC Team', softwareName: 'Adobe Creative Cloud', status: 'AVAILABLE', licenseCount: 25, vendorName: 'Adobe', purchaseDate: '2024-03-01', expiryDate: '2025-03-01' },
];

const mockOSLicenses = [
  { id: 'ol-1', licenseName: 'Windows Server 2022', osType: 'Windows', status: 'ALLOCATED', licenseCount: 10, vendorName: 'Microsoft', purchaseDate: '2024-01-01', expiryDate: '2025-12-31' },
  { id: 'ol-2', licenseName: 'RHEL 9 Standard', osType: 'Linux', status: 'AVAILABLE', licenseCount: 5, vendorName: 'Red Hat', purchaseDate: '2024-06-01', expiryDate: '2025-06-01' },
];

export const assetHandlers = [
  // GET /assets (paginated)
  http.get('*/assets', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const search = url.searchParams.get('search') || '';
    let filtered = [...mockAssets];
    if (search) filtered = filtered.filter(a => a.name.toLowerCase().includes(search.toLowerCase()) || a.hostname.toLowerCase().includes(search.toLowerCase()));
    return HttpResponse.json({ success: true, data: filtered, meta: { page, limit, total: filtered.length, totalPages: Math.ceil(filtered.length / limit) } });
  }),

  // POST /assets
  http.post('*/assets', async ({ request }) => {
    const body = await request.json();
    const newAsset = { id: 'asset-new', ...body, createdAt: new Date().toISOString() };
    return HttpResponse.json({ success: true, data: newAsset });
  }),

  // GET /assets/:id
  http.get('*/assets/:id', ({ params }) => {
    const asset = mockAssets.find(a => a.id === params.id);
    if (!asset) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Asset not found' } }, { status: 404 });
    return HttpResponse.json({ success: true, data: asset });
  }),

  // PUT /assets/:id
  http.put('*/assets/:id', async ({ params, request }) => {
    const body = await request.json();
    const asset = mockAssets.find(a => a.id === params.id);
    if (!asset) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Asset not found' } }, { status: 404 });
    return HttpResponse.json({ success: true, data: { ...asset, ...body } });
  }),

  // DELETE /assets/:id
  http.delete('*/assets/:id', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  // POST /assets/bulk
  http.post('*/assets/bulk', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: body });
  }),

  // Asset detail endpoints
  http.get('*/assets/:id/full', ({ params }) => {
    const asset = mockAssets.find(a => a.id === params.id);
    return HttpResponse.json({ success: true, data: asset || mockAssets[0] });
  }),

  http.get('*/assets/:id/hardware', () => {
    return HttpResponse.json({ success: true, data: { processor: 'Intel Xeon E5', memory: '32GB', storage: '1TB SSD' } });
  }),

  http.get('*/assets/:id/software', () => {
    return HttpResponse.json({ success: true, data: { installedSoftware: mockSoftwareInventory } });
  }),

  http.get('*/assets/:id/security', () => {
    return HttpResponse.json({ success: true, data: { antivirus: 'Active', firewall: 'Enabled', encryption: 'BitLocker' } });
  }),

  http.get('*/assets/:id/network', () => {
    return HttpResponse.json({ success: true, data: { ipAddress: '192.168.1.10', macAddress: 'AA:BB:CC:DD:EE:FF', gateway: '192.168.1.1' } });
  }),

  http.get('*/assets/:id/peripherals', () => {
    return HttpResponse.json({ success: true, data: { devices: [] } });
  }),

  http.get('*/assets/:id/telemetry', () => {
    return HttpResponse.json({ success: true, data: { cpuUsage: 45, memoryUsage: 60, diskUsage: 70 } });
  }),

  http.get('*/assets/:id/errors', () => {
    return HttpResponse.json({ success: true, data: { errors: [] } });
  }),

  http.get('*/assets/:id/audit-log', () => {
    return HttpResponse.json({ success: true, data: [{ id: 'log-1', action: 'CREATED', timestamp: '2024-01-01T00:00:00Z', user: 'admin' }] });
  }),

  http.get('*/assets/:id/alerts', () => {
    return HttpResponse.json({ success: true, data: { data: [], summary: { total: 0, critical: 0, warning: 0, info: 0, clear: 0, open: 0, resolved: 0 } } });
  }),

  http.get('*/assets/:id/patches', () => {
    return HttpResponse.json({ success: true, data: { data: [], summary: null } });
  }),

  http.get('*/assets/:id/vulnerabilities', () => {
    return HttpResponse.json({ success: true, data: { data: [], summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0, open: 0, resolved: 0 } } });
  }),

  http.get('*/assets/:id/deployments', () => {
    return HttpResponse.json({ success: true, data: [] });
  }),

  http.get('*/assets/:id/lifecycle', () => {
    return HttpResponse.json({ success: true, data: { purchaseDate: '2023-01-01', warrantyExpiry: '2026-01-01', endOfLife: '2028-01-01' } });
  }),

  // Tags on assets
  http.post('*/assets/:id/tags', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  http.delete('*/assets/:id/tags/:tagId', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  // Refresh
  http.post('*/assets/:id/refresh', () => {
    return HttpResponse.json({ success: true, data: { message: 'Refresh initiated', commandId: 'cmd-1', status: 'PENDING' } });
  }),

  // Telemetry history
  http.get('*/assets/:id/telemetry/history', () => {
    return HttpResponse.json({ success: true, data: { history: [] } });
  }),

  // Hardware expanded
  http.get('*/assets/:id/hardware/expanded', () => {
    return HttpResponse.json({ success: true, data: { processor: 'Intel Xeon E5', memory: '32GB', storage: '1TB SSD', details: {} } });
  }),

  // Attachments
  http.post('*/assets/:id/attachments', () => {
    return HttpResponse.json({ success: true, data: { id: 'att-1', fileName: 'file.pdf', uploadedAt: new Date().toISOString() } });
  }),

  // Asset patch recommendations
  http.get('*/assets/:id/patch-recommendations', () => {
    return HttpResponse.json({ success: true, data: [] });
  }),

  // Software Inventory
  http.get('*/software-inventory', () => {
    return HttpResponse.json({ success: true, data: mockSoftwareInventory });
  }),

  http.get('*/software-inventory/:id', ({ params }) => {
    const item = mockSoftwareInventory.find(s => s.id === params.id);
    return HttpResponse.json({ success: true, data: item || mockSoftwareInventory[0] });
  }),

  // Software Licenses
  http.get('*/software-licenses', () => {
    return HttpResponse.json({ success: true, data: mockSoftwareLicenses });
  }),

  http.post('*/software-licenses', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: 'sl-new', ...body } });
  }),

  http.put('*/software-licenses/:id', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: 'sl-1', ...body } });
  }),

  http.delete('*/software-licenses/:id', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  // OS Licenses
  http.get('*/os-licenses', () => {
    return HttpResponse.json({ success: true, data: mockOSLicenses });
  }),

  http.post('*/os-licenses', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: 'ol-new', ...body } });
  }),

  http.put('*/os-licenses/:id', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: 'ol-1', ...body } });
  }),

  http.delete('*/os-licenses/:id', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  // Import endpoints
  http.post('*/software-inventory/import', () => {
    return HttpResponse.json({ success: true, data: { imported: 0, skipped: 0 } });
  }),

  http.post('*/software-licenses/import', () => {
    return HttpResponse.json({ success: true, data: { imported: 0, skipped: 0 } });
  }),

  http.post('*/os-licenses/import', () => {
    return HttpResponse.json({ success: true, data: { imported: 0, skipped: 0 } });
  }),
];

export { mockAssets, mockSoftwareInventory, mockSoftwareLicenses, mockOSLicenses };
