import { http, HttpResponse } from 'msw';
import type { DiscoveryAgent, IPRange, DeviceCredential } from '../../types/discovery.types';

const API_BASE_URL = '/v1';

// Mock data for agents (using simplified DiscoveryAgent type for mock data)
let mockAgents: DiscoveryAgent[] = [
  {
    id: '1',
    name: 'MacOS 01',
    status: 'Connected',
    lastConnectedTime: '45 minutes ago',
    os: 'MacOS',
    version: 'OS0.1',
    createdAt: '2025-01-10T10:00:00Z',
  },
  {
    id: '2',
    name: 'Windows 01',
    status: 'Connected',
    lastConnectedTime: '45 minutes ago',
    os: 'Win',
    version: 'WIN0.1',
    createdAt: '2025-01-09T14:30:00Z',
  },
  {
    id: '3',
    name: 'Linux Agent',
    status: 'Disconnected',
    lastConnectedTime: '2 hours ago',
    os: 'Linux',
    version: 'LIN0.2',
    createdAt: '2025-01-08T09:15:00Z',
  },
];

// Mock data for IP ranges
let mockIPRanges: IPRange[] = [
  {
    id: '1',
    name: 'Corporate Network',
    range: '192.168.1.0/24',
    description: 'Main office network',
    lastScanned: '2025-01-14T15:30:00Z',
    deviceCount: 45,
    createdAt: '2025-01-05T10:00:00Z',
  },
  {
    id: '2',
    name: 'Development Lab',
    range: '10.0.0.0/16',
    description: 'Development and testing environment',
    lastScanned: '2025-01-13T10:15:00Z',
    deviceCount: 23,
    createdAt: '2025-01-06T14:45:00Z',
  },
  {
    id: '3',
    name: 'Remote Offices',
    range: '172.16.0.0/12',
    description: 'Branch office networks',
    lastScanned: '2025-01-12T08:00:00Z',
    deviceCount: 67,
    createdAt: '2025-01-07T11:30:00Z',
  },
];

// Mock data for credentials
let mockCredentials: DeviceCredential[] = [
  {
    id: '1',
    name: 'Windows Admin',
    type: 'Windows',
    username: 'admin',
    password: 'encrypted_password_1',
    description: 'Windows domain administrator account',
    lastUsed: '2025-01-14T09:30:00Z',
    createdAt: '2025-01-01T10:00:00Z',
  },
  {
    id: '2',
    name: 'SSH Root',
    type: 'SSH',
    username: 'root',
    password: 'encrypted_password_2',
    description: 'SSH root access for Linux systems',
    lastUsed: '2025-01-13T16:45:00Z',
    createdAt: '2025-01-02T12:00:00Z',
  },
  {
    id: '3',
    name: 'SNMP Public',
    type: 'SNMP',
    username: 'public',
    password: 'encrypted_password_3',
    description: 'SNMP community string for monitoring',
    lastUsed: '2025-01-14T11:20:00Z',
    createdAt: '2025-01-03T09:30:00Z',
  },
];

export const discoveryHandlers = [
  // Agent APIs
  http.get(`${API_BASE_URL}/discovery/agents`, () => {
    return HttpResponse.json(mockAgents);
  }),

  http.get(`${API_BASE_URL}/discovery/agents/:id`, ({ params }) => {
    const { id } = params;
    const agent = mockAgents.find((a) => a.id === id);
    if (!agent) {
      return HttpResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    return HttpResponse.json(agent);
  }),

  http.post(`${API_BASE_URL}/discovery/agents`, async ({ request }) => {
    const data = (await request.json()) as Record<string, unknown>;
    const newAgent: DiscoveryAgent = {
      id: String(mockAgents.length + 1),
      name: (data.name as string) || '',
      os: (data.os as string) || '',
      version: (data.version as string) || '',
      status: 'Disconnected',
      lastConnectedTime: 'Never',
      createdAt: new Date().toISOString(),
    };
    mockAgents.push(newAgent);
    return HttpResponse.json(newAgent, { status: 201 });
  }),

  http.put(`${API_BASE_URL}/discovery/agents/:id`, async ({ params, request }) => {
    const { id } = params;
    const data = (await request.json()) as any;
    const index = mockAgents.findIndex((a) => a.id === id);
    if (index === -1) {
      return HttpResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    mockAgents[index] = { ...mockAgents[index], ...data };
    return HttpResponse.json(mockAgents[index]);
  }),

  http.delete(`${API_BASE_URL}/discovery/agents/:id`, ({ params }) => {
    const { id } = params;
    mockAgents = mockAgents.filter((a) => a.id !== id);
    return HttpResponse.json({ success: true });
  }),

  // IP Range APIs
  http.get(`${API_BASE_URL}/discovery/ip-ranges`, () => {
    return HttpResponse.json(mockIPRanges);
  }),

  http.get(`${API_BASE_URL}/discovery/ip-ranges/:id`, ({ params }) => {
    const { id } = params;
    const range = mockIPRanges.find((r) => r.id === id);
    if (!range) {
      return HttpResponse.json({ error: 'IP Range not found' }, { status: 404 });
    }
    return HttpResponse.json(range);
  }),

  http.post(`${API_BASE_URL}/discovery/ip-ranges`, async ({ request }) => {
    const data = (await request.json()) as any;
    const newRange: IPRange = {
      id: String(mockIPRanges.length + 1),
      ...data,
      deviceCount: 0,
      lastScanned: undefined,
      createdAt: new Date().toISOString(),
    };
    mockIPRanges.push(newRange);
    return HttpResponse.json(newRange, { status: 201 });
  }),

  http.put(`${API_BASE_URL}/discovery/ip-ranges/:id`, async ({ params, request }) => {
    const { id } = params;
    const data = (await request.json()) as any;
    const index = mockIPRanges.findIndex((r) => r.id === id);
    if (index === -1) {
      return HttpResponse.json({ error: 'IP Range not found' }, { status: 404 });
    }
    mockIPRanges[index] = { ...mockIPRanges[index], ...data };
    return HttpResponse.json(mockIPRanges[index]);
  }),

  http.delete(`${API_BASE_URL}/discovery/ip-ranges/:id`, ({ params }) => {
    const { id } = params;
    mockIPRanges = mockIPRanges.filter((r) => r.id !== id);
    return HttpResponse.json({ success: true });
  }),

  http.post(`${API_BASE_URL}/discovery/ip-ranges/:id/scan`, ({ params }) => {
    const { id } = params;
    const range = mockIPRanges.find((r) => r.id === id);
    if (!range) {
      return HttpResponse.json({ error: 'IP Range not found' }, { status: 404 });
    }
    return HttpResponse.json({ success: true, message: 'Scan started' });
  }),

  // Device Credential APIs
  http.get(`${API_BASE_URL}/discovery/credentials`, () => {
    return HttpResponse.json(mockCredentials);
  }),

  http.get(`${API_BASE_URL}/discovery/credentials/:id`, ({ params }) => {
    const { id } = params;
    const credential = mockCredentials.find((c) => c.id === id);
    if (!credential) {
      return HttpResponse.json({ error: 'Credential not found' }, { status: 404 });
    }
    return HttpResponse.json(credential);
  }),

  http.post(`${API_BASE_URL}/discovery/credentials`, async ({ request }) => {
    const data = (await request.json()) as any;
    const newCredential: DeviceCredential = {
      id: String(mockCredentials.length + 1),
      ...data,
      lastUsed: undefined,
      createdAt: new Date().toISOString(),
    };
    mockCredentials.push(newCredential);
    return HttpResponse.json(newCredential, { status: 201 });
  }),

  http.put(`${API_BASE_URL}/discovery/credentials/:id`, async ({ params, request }) => {
    const { id } = params;
    const data = (await request.json()) as any;
    const index = mockCredentials.findIndex((c) => c.id === id);
    if (index === -1) {
      return HttpResponse.json({ error: 'Credential not found' }, { status: 404 });
    }
    mockCredentials[index] = { ...mockCredentials[index], ...data };
    return HttpResponse.json(mockCredentials[index]);
  }),

  http.delete(`${API_BASE_URL}/discovery/credentials/:id`, ({ params }) => {
    const { id } = params;
    mockCredentials = mockCredentials.filter((c) => c.id !== id);
    return HttpResponse.json({ success: true });
  }),

  http.post(`${API_BASE_URL}/discovery/credentials/:id/test`, ({ params }) => {
    const { id } = params;
    const credential = mockCredentials.find((c) => c.id === id);
    if (!credential) {
      return HttpResponse.json({ error: 'Credential not found' }, { status: 404 });
    }
    return HttpResponse.json({ success: true, message: 'Credential test passed' });
  }),
];
