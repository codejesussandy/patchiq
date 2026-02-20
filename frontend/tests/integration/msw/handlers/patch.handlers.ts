import { http, HttpResponse } from 'msw';

const mockPatches = [
  { id: 'patch-1', patchId: 'KB5034441', software: 'Windows 11 Cumulative Update', description: 'Security update for Windows 11', os: 'WINDOWS', platform: 'WINDOWS', severity: 'CRITICAL', category: 'Security Updates', bulletinId: 'MS24-001', kbNumber: 'KB5034441', publishedAt: '2024-01-15', architecture: '64 BIT', vendor: 'Microsoft', product: 'Windows 11', endpoints: 45, approvalStatus: 'PENDING', testStatus: 'NOT_TESTED', rebootRequired: true, supportUninstallation: true, referenceUrl: 'https://support.microsoft.com/kb5034441', tags: ['security'], cveNumbers: ['CVE-2024-0001'], supersededBy: null, supersedes: [], source: 'MANUAL', createdAt: '2024-01-15T00:00:00Z' },
  { id: 'patch-2', patchId: 'KB5034442', software: 'Ubuntu 22.04 Security Patch', description: 'Kernel security update', os: 'UBUNTU', platform: 'UBUNTU', severity: 'HIGH', category: 'Security Updates', bulletinId: '', kbNumber: '', publishedAt: '2024-02-01', architecture: '64 BIT', vendor: 'Canonical', product: 'Ubuntu', endpoints: 30, approvalStatus: 'APPROVED', testStatus: 'TESTED', rebootRequired: false, supportUninstallation: false, referenceUrl: '', tags: [], cveNumbers: ['CVE-2024-0002'], supersededBy: null, supersedes: [], source: 'DISCOVERED', createdAt: '2024-02-01T00:00:00Z' },
];

const mockDeployments = [
  { id: 'dep-1', deploymentId: 'DEP-001', name: 'January Security Update', type: 'INSTALL', status: 'COMPLETED', pending: 0, succeeded: 40, failed: 2, createdBy: 'admin', createdOn: '2024-01-16', tasks: [] },
  { id: 'dep-2', deploymentId: 'DEP-002', name: 'Kernel Patch Rollout', type: 'INSTALL', status: 'IN_PROGRESS', pending: 10, succeeded: 15, failed: 1, createdBy: 'admin', createdOn: '2024-02-02', tasks: [] },
];

const mockPatchTests = [
  { id: 'pt-1', name: 'Windows Update Test', description: 'Test KB5034441 on staging', applicationType: 'Patch', scope: 'SPECIFIC_COMPUTERS', status: 'PENDING', createdBy: 'admin', createdOn: '2024-01-20' },
  { id: 'pt-2', name: 'Kernel Patch Test', description: 'Test kernel patch', applicationType: 'Patch', scope: 'ALL_COMPUTERS', status: 'APPROVED', createdBy: 'admin', createdOn: '2024-02-05' },
];

const mockZeroTouchConfigs = [
  { id: 'zt-1', name: 'Auto Deploy Critical', description: 'Auto deploy critical patches', applicationType: 'Patch', scope: 'ALL_COMPUTERS', status: 'ACTIVE', autoDeploymentRules: { severity: ['CRITICAL', 'HIGH'] }, createdBy: 'admin', createdOn: '2024-01-01' },
];

const mockVulnerabilities = [
  { id: 'vuln-1', cveNumber: 'CVE-2024-0001', severity: 'CRITICAL', description: 'Remote code execution vulnerability', publishedDate: '2024-01-10' },
];

const mockEndpoints = [
  { id: 'ep-1', name: 'Server-01', os: 'Windows', status: 'Online', lastSeen: '2024-01-20' },
  { id: 'ep-2', name: 'Server-02', os: 'Linux', status: 'Offline', lastSeen: '2024-01-19' },
];

const mockAffectedSoftwares = [
  { id: 'as-1', softwareName: 'Windows 11', version: '23H2', vendor: 'Microsoft', platform: 'Windows', installedOn: 45 },
];

export const patchHandlers = [
  // Patches
  http.get('*/patches', ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    let filtered = [...mockPatches];
    if (search) filtered = filtered.filter(p => p.software.toLowerCase().includes(search.toLowerCase()) || p.patchId.toLowerCase().includes(search.toLowerCase()));
    return HttpResponse.json({ success: true, data: filtered, meta: { page: 1, limit: 20, total: filtered.length, totalPages: 1 } });
  }),

  http.get('*/patches/:id/affected-softwares', () => {
    return HttpResponse.json({ success: true, data: mockAffectedSoftwares });
  }),

  http.post('*/patches/:id/affected-softwares', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: 'as-new', ...body } });
  }),

  http.delete('*/patches/:id/affected-softwares/:productId', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  http.get('*/patches/:id/vulnerabilities', () => {
    return HttpResponse.json({ success: true, data: mockVulnerabilities });
  }),

  http.get('*/patches/:id/endpoints', () => {
    return HttpResponse.json({ success: true, data: mockEndpoints });
  }),

  http.get('*/patches/:id/recommendations', () => {
    return HttpResponse.json({ success: true, data: { data: [], total: 0 } });
  }),

  http.get('*/patches/:id/superseded', () => {
    return HttpResponse.json({ success: true, data: [] });
  }),

  http.get('*/patches/:id/superseding', () => {
    return HttpResponse.json({ success: true, data: [] });
  }),

  http.post('*/patches/:id/supersede/:targetId', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  http.delete('*/patches/:id/supersede/:targetId', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  http.post('*/patches/:id/scan-endpoints', () => {
    return HttpResponse.json({ success: true, data: { jobId: 'scan-1', status: 'STARTED', message: 'Endpoint scan initiated' } });
  }),

  http.get('*/patches/:id', ({ params }) => {
    const patch = mockPatches.find(p => p.id === params.id);
    if (!patch) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Patch not found' } }, { status: 404 });
    return HttpResponse.json({ success: true, data: patch });
  }),

  http.post('*/patches', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: 'patch-new', patchId: 'KB9999999', ...body, createdAt: new Date().toISOString() } });
  }),

  http.put('*/patches/:id', async ({ request, params }) => {
    const body = await request.json();
    const patch = mockPatches.find(p => p.id === params.id);
    return HttpResponse.json({ success: true, data: { ...patch, ...body } });
  }),

  http.delete('*/patches/:id', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  http.post('*/patches/discover', () => {
    return HttpResponse.json({ success: true, data: { success: true, patchesCreated: 3, message: 'Discovered 3 new patches' } });
  }),

  // Deployments
  http.get('*/deployments', () => {
    return HttpResponse.json({ success: true, data: mockDeployments, meta: { page: 1, limit: 20, total: mockDeployments.length, totalPages: 1 } });
  }),

  http.get('*/deployments/patch', () => {
    return HttpResponse.json({ success: true, data: mockDeployments, meta: { page: 1, limit: 20, total: mockDeployments.length, totalPages: 1 } });
  }),

  http.post('*/deployments/patch', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: 'dep-new', deploymentId: 'DEP-NEW', ...body, status: 'PENDING' } });
  }),

  http.get('*/deployments/:id', ({ params }) => {
    const dep = mockDeployments.find(d => d.id === params.id);
    return HttpResponse.json({ success: true, data: dep || { ...mockDeployments[0], tasks: [] } });
  }),

  http.delete('*/deployments/:id', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  http.get('*/deployments/:id/preview', () => {
    return HttpResponse.json({ success: true, data: { endpoints: 10, patches: 1, estimatedTime: '30 minutes' } });
  }),

  http.post('*/deployments/:id/execute', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  // Patch Tests
  http.get('*/patch-tests', () => {
    return HttpResponse.json({ success: true, data: mockPatchTests, meta: { page: 1, limit: 20, total: mockPatchTests.length, totalPages: 1 } });
  }),

  http.get('*/patch-tests/:id', ({ params }) => {
    const test = mockPatchTests.find(t => t.id === params.id);
    return HttpResponse.json({ success: true, data: test });
  }),

  http.post('*/patch-tests', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: 'pt-new', ...body, status: 'PENDING', createdBy: 'admin', createdOn: new Date().toISOString() } });
  }),

  http.put('*/patch-tests/:id/approve', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  http.delete('*/patch-tests/:id', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  // Zero Touch
  http.get('*/zero-touch-configs', () => {
    return HttpResponse.json({ success: true, data: mockZeroTouchConfigs, meta: { page: 1, limit: 20, total: mockZeroTouchConfigs.length, totalPages: 1 } });
  }),

  http.get('*/zero-touch-configs/:id', ({ params }) => {
    const config = mockZeroTouchConfigs.find(c => c.id === params.id);
    return HttpResponse.json({ success: true, data: config });
  }),

  http.post('*/zero-touch-configs', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: 'zt-new', ...body, status: 'ACTIVE' } });
  }),

  http.put('*/zero-touch-configs/:id', async ({ request, params }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: params.id, ...body } });
  }),

  http.delete('*/zero-touch-configs/:id', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  // Endpoints (used by PatchDetails)
  http.get('*/endpoints/:id', ({ params }) => {
    return HttpResponse.json({ success: true, data: { id: params.id, name: 'Server-01', os: 'Windows', status: 'Online' } });
  }),
];

export { mockPatches, mockDeployments, mockPatchTests, mockZeroTouchConfigs, mockVulnerabilities, mockEndpoints, mockAffectedSoftwares };
