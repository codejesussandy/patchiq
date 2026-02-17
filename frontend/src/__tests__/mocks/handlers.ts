import { http, HttpResponse } from 'msw';
import type { Asset } from '../../types/asset.types';

// Mock data factories
export const createMockAsset = (overrides?: Partial<Asset>): Asset => ({
  id: 'test-asset-1',
  name: 'Test Asset',
  assetType: 'DESKTOP',
  status: 'ACTIVE',
  operationalStatus: 'OPERATIONAL',
  manufacturer: 'Dell',
  model: 'OptiPlex 7090',
  serialNumber: 'TEST123',
  ipAddress: '192.168.1.100',
  macAddress: '00:11:22:33:44:55',
  operatingSystem: 'Windows 11 Pro',
  osVersion: '22H2',
  osArchitecture: 'x64',
  categoryId: 'cat-1',
  categoryName: 'Desktop',
  subCategoryId: 'subcat-1',
  subCategoryName: 'Workstation',
  location: 'Office',
  assignedTo: 'John Doe',
  department: 'IT',
  notes: '',
  tags: [],
  lastSeenAt: new Date().toISOString(),
  registeredAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  agentId: 'agent-1',
  agentStatus: 'ONLINE',
  agentVersion: '1.0.0',
  patchesInstalled: 10,
  patchesPending: 5,
  vulnerabilities: 2,
  criticalVulnerabilities: 1,
  ...overrides,
});

export const createMockPatch = (overrides?: {
  id?: string;
  title?: string;
  severity?: string;
  status?: string;
}) => ({
  id: overrides?.id || 'patch-1',
  patchId: overrides?.id || 'patch-1',
  title: overrides?.title || 'Security Update for Windows',
  description: 'Critical security update',
  severity: overrides?.severity || 'CRITICAL',
  category: 'SECURITY',
  status: overrides?.status || 'AVAILABLE',
  kbArticle: 'KB5001234',
  releaseDate: new Date().toISOString(),
  installDate: null,
  installedVersion: null,
  availableVersion: '1.0.1',
  size: 102400,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const createMockVulnerability = (overrides?: {
  id?: string;
  severity?: string;
  cveId?: string;
}) => ({
  id: overrides?.id || 'vuln-1',
  cveId: overrides?.cveId || 'CVE-2024-1234',
  title: 'Critical Vulnerability',
  description: 'A critical security vulnerability',
  severity: overrides?.severity || 'CRITICAL',
  cvssScore: 9.8,
  epss: 0.95,
  exploitable: true,
  riskScore: 95,
  status: 'OPEN',
  detectedAt: new Date().toISOString(),
  resolvedAt: null,
  publishedDate: new Date().toISOString(),
  affectedSoftwareCount: 1,
});

// Base URL for API - matches VITE_API_BASE_URL
const API_BASE = '/v1';

// MSW Request Handlers
export const handlers = [
  // Assets - GET all (paginated)
  http.get(`${API_BASE}/assets`, async ({ request }) => {
    // Simulate network delay for realistic testing
    await new Promise((resolve) => setTimeout(resolve, 50));

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const search = url.searchParams.get('search');

    let assets = [
      createMockAsset({ id: '1', name: 'Asset 1' }),
      createMockAsset({ id: '2', name: 'Asset 2' }),
      createMockAsset({ id: '3', name: 'Asset 3' }),
    ];

    // Apply search filter
    if (search) {
      assets = assets.filter((asset) =>
        asset.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    return HttpResponse.json({
      success: true,
      data: {
        data: assets,
        total: assets.length,
        page,
        limit,
        totalPages: Math.ceil(assets.length / limit),
      },
    });
  }),

  // Assets - GET single
  http.get(`${API_BASE}/assets/:id`, async ({ params }) => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    const { id } = params;
    return HttpResponse.json({
      success: true,
      data: createMockAsset({ id: id as string, name: `Asset ${id}` }),
    });
  }),

  // Assets - POST create
  http.post(`${API_BASE}/assets`, async ({ request }) => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const body = (await request.json()) as Partial<Asset>;
    const newAsset = createMockAsset({
      id: `new-${Date.now()}`,
      name: body.name,
      assetType: body.assetType,
      manufacturer: body.manufacturer,
      model: body.model,
    });

    return HttpResponse.json({
      success: true,
      data: newAsset,
    });
  }),

  // Assets - PUT update
  http.put(`${API_BASE}/assets/:id`, async ({ params, request }) => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const { id } = params;
    const body = (await request.json()) as Partial<Asset>;
    const updatedAsset = createMockAsset({
      id: id as string,
      ...body,
    });

    return HttpResponse.json({
      success: true,
      data: updatedAsset,
    });
  }),

  // Assets - DELETE
  http.delete(`${API_BASE}/assets/:id`, async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return HttpResponse.json({
      success: true,
      data: { message: 'Asset deleted successfully' },
    });
  }),

  // Patches - GET all
  http.get(`${API_BASE}/patches`, async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return HttpResponse.json({
      success: true,
      data: {
        data: [
          createMockPatch({ id: '1', title: 'Patch 1' }),
          createMockPatch({ id: '2', title: 'Patch 2' }),
          createMockPatch({ id: '3', title: 'Patch 3' }),
        ],
        total: 3,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
    });
  }),

  // Vulnerabilities - GET all
  http.get(`${API_BASE}/vulnerabilities`, async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return HttpResponse.json({
      success: true,
      data: {
        data: [
          createMockVulnerability({ id: '1', cveId: 'CVE-2024-0001' }),
          createMockVulnerability({ id: '2', cveId: 'CVE-2024-0002' }),
        ],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
    });
  }),

  // Categories - GET all
  http.get(`${API_BASE}/categories`, async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: 'cat-1',
          name: 'Desktop',
          description: 'Desktop computers',
          subCategories: [
            { id: 'subcat-1', name: 'Workstation' },
            { id: 'subcat-2', name: 'Standard Desktop' },
          ],
        },
        {
          id: 'cat-2',
          name: 'Laptop',
          description: 'Laptop computers',
          subCategories: [
            { id: 'subcat-3', name: 'Business Laptop' },
          ],
        },
      ],
    });
  }),

  // Tags - GET all
  http.get(`${API_BASE}/tags`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        { id: 'tag-1', name: 'Production', color: '#ff0000', assetCount: 10 },
        { id: 'tag-2', name: 'Development', color: '#00ff00', assetCount: 5 },
      ],
    });
  }),

  // Error handler for testing error states
  http.get(`${API_BASE}/error`, () => {
    return HttpResponse.json(
      {
        success: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_ERROR',
        },
      },
      { status: 500 }
    );
  }),
];

// Error handlers for specific test scenarios
export const errorHandlers = [
  http.get(`${API_BASE}/assets`, () => {
    return HttpResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to fetch assets',
          code: 'FETCH_ERROR',
        },
      },
      { status: 500 }
    );
  }),
];

export default handlers;
