import { http, HttpResponse } from 'msw';

const mockHubStats = {
  totalPackages: 42,
  totalApplications: 28,
  activePackages: 35,
  totalSize: '15728640',
  byPlatform: { windows: 15, linux: 18, macos: 5, 'cross-platform': 4 },
  byCategory: { browser: 5, utility: 8, enterprise: 10, runtime: 5 },
  totalBundles: 12,
};

const mockGroupedPackages = [
  { name: 'google-chrome', displayName: 'Google Chrome', platform: 'linux', latestVersion: '120.0.6099.130', latestPackageId: 'pkg-1', totalVersions: 3, category: 'browser', vendor: 'Google', description: 'Web browser', tags: ['browser', 'google'], hasFile: true, isActive: true, isVerified: true,
    versions: [
      { id: 'v1', packageId: 'pkg-1', version: '120.0.6099.130', installSource: 'apt', isActive: true, isVerified: true, hasBundle: false, hasFile: true, fileSize: '95MB' },
      { id: 'v2', packageId: 'pkg-2', version: '119.0.6045.199', installSource: 'apt', isActive: false, isVerified: true, hasBundle: false, hasFile: true, fileSize: '94MB' },
    ] },
  { name: 'vscode', displayName: 'Visual Studio Code', platform: 'cross-platform', latestVersion: '1.85.2', latestPackageId: 'pkg-3', totalVersions: 2, category: 'development', vendor: 'Microsoft', description: 'Code editor', tags: ['editor', 'development'], hasFile: true, isActive: true, isVerified: true,
    versions: [
      { id: 'v3', packageId: 'pkg-3', version: '1.85.2', installSource: 'bundle', isActive: true, isVerified: true, hasBundle: true, hasFile: true, fileSize: '120MB' },
    ] },
];

const mockBundles = [
  { id: 'bundle-1', name: 'Dev Tools Bundle', platform: 'linux', description: 'Development tools', packageIds: ['pkg-1', 'pkg-3'], createdAt: '2024-01-01T00:00:00Z' },
];

export const hubHandlers = [
  // Hub Stats
  http.get('*/hub/stats', () => {
    return HttpResponse.json({ success: true, data: mockHubStats });
  }),

  // Packages (paginated list)
  http.get('*/hub/packages/grouped', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const search = url.searchParams.get('search') || '';
    let filtered = [...mockGroupedPackages];
    if (search) filtered = filtered.filter(p => p.displayName.toLowerCase().includes(search.toLowerCase()) || p.name.toLowerCase().includes(search.toLowerCase()));
    return HttpResponse.json({ success: true, data: { data: filtered, total: filtered.length, page, limit, totalPages: Math.ceil(filtered.length / limit) } });
  }),

  http.get('*/hub/packages/upload-bundle', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  http.get('*/hub/packages/:id/bundle', () => {
    return HttpResponse.json({ success: true, data: { packageId: 'pkg-1', bundleUrl: 'https://example.com/bundle.tar.gz', bundleChecksum: 'abc123', bundleSize: 1024, expiresAt: '2024-12-31T00:00:00Z' } });
  }),

  http.get('*/hub/packages/:id/download-url', () => {
    return HttpResponse.json({ success: true, data: { presignedUrl: 'https://example.com/download/pkg-1', expiresAt: '2024-12-31T00:00:00Z' } });
  }),

  http.get('*/hub/packages/:id', () => {
    return HttpResponse.json({ success: true, data: { id: 'pkg-1', packageId: 'pkg-1', name: 'google-chrome', displayName: 'Google Chrome', version: '120.0.6099.130', vendor: 'Google', category: 'browser', platform: 'linux', architecture: 'x64', installSource: 'apt', silentInstall: true, requiresReboot: false, requiresRoot: true, fileName: 'chrome.deb', fileSize: '95MB', fileSizeBytes: 99614720, hasFile: true, hasBundle: false, scriptsIncluded: false, downloadUrl: null, description: 'Web browser', tags: ['browser'], supportsRollback: false, isActive: true, isVerified: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-03-01T00:00:00Z' } });
  }),

  http.get('*/hub/packages', ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    return HttpResponse.json({ success: true, data: [{ id: 'pkg-1', packageId: 'pkg-1', name: 'google-chrome', displayName: 'Google Chrome', version: '120.0.6099.130', platform: 'linux', installSource: 'apt', isActive: true }], meta: { page: 1, limit, total: 1, totalPages: 1 } });
  }),

  http.post('*/hub/packages', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: 'pkg-new', packageId: 'pkg-new', ...body, hasFile: false, hasBundle: false, isActive: true, isVerified: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } });
  }),

  http.put('*/hub/packages/:id', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: 'pkg-1', packageId: 'pkg-1', ...body, updatedAt: new Date().toISOString() } });
  }),

  http.delete('*/hub/packages/:id', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  http.post('*/hub/packages/upload-bundle', () => {
    return HttpResponse.json({ success: true, data: { packageId: 'pkg-bundle', bundleObjectKey: 'bundles/pkg-bundle.tar.gz', bundleChecksum: 'abc123', bundleSize: 2048, manifest: { name: 'test-app', displayName: 'Test App', version: '1.0.0', platform: 'linux' }, scriptsFound: ['install.sh', 'uninstall.sh'] } });
  }),

  // Bundles
  http.get('*/hub/bundles', () => {
    return HttpResponse.json({ success: true, data: mockBundles });
  }),
  http.get('*/hub/bundles/:id', () => {
    return HttpResponse.json({ success: true, data: mockBundles[0] });
  }),
  http.post('*/hub/bundles', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: 'bundle-new', ...body, createdAt: new Date().toISOString() } });
  }),
  http.delete('*/hub/bundles/:id', () => {
    return HttpResponse.json({ success: true, data: null });
  }),
];

export { mockHubStats, mockGroupedPackages, mockBundles };
