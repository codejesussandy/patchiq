import { http, HttpResponse } from 'msw';
import type { Agent, Command } from '../../types/agent.types';

const API_BASE_URL = 'http://localhost:3000/v1';

type AgentDownload = {
  os: 'Windows 11' | 'MacOS' | 'Linux';
  version: string;
  releaseDate: string;
  downloadUrl: string;
};

let mockAgents: Agent[] = [
  {
    id: '1',
    machineId: 'MACH-001-ABC',
    name: 'MacOS 01',
    status: 'Connected',
    os: 'MacOS',
    osVersion: '14.5',
    agentVersion: '2.1.0',
    lastHeartbeat: '2024-01-13T10:15:00Z',
    lastHeartbeatRelative: '2 minutes ago',
    registeredAt: '2024-01-01T09:00:00Z',
    ipAddress: '192.168.1.100',
    hostname: 'macbook-pro-01',
    serialNumber: 'C0265B8FGL14',
    assetId: 'ASSET-001',
    tags: ['development', 'team-a'],
    groups: [
      { id: 'g1', name: 'Dev Team' },
      { id: 'g2', name: 'Critical Systems' },
    ],
    capabilities: ['scan', 'deploy', 'reboot'],
  },
  {
    id: '2',
    machineId: 'MACH-002-XYZ',
    name: 'Windows 01',
    status: 'Connected',
    os: 'Windows',
    osVersion: '11 22H2',
    agentVersion: '2.1.0',
    lastHeartbeat: '2024-01-13T10:14:30Z',
    lastHeartbeatRelative: '3 minutes ago',
    registeredAt: '2024-01-02T10:30:00Z',
    ipAddress: '192.168.1.101',
    hostname: 'desktop-windows-01',
    serialNumber: 'PF0BXCLC',
    assetId: 'ASSET-002',
    tags: ['testing', 'team-b'],
    groups: [
      { id: 'g3', name: 'QA Team' },
      { id: 'g2', name: 'Critical Systems' },
    ],
    capabilities: ['scan', 'update'],
  },
  {
    id: '3',
    machineId: 'MACH-003-LINUX',
    name: 'Linux Server',
    status: 'Pending',
    os: 'Linux',
    osVersion: '20.04 LTS',
    agentVersion: '2.0.5',
    lastHeartbeat: '2024-01-13T09:45:00Z',
    lastHeartbeatRelative: '30 minutes ago',
    registeredAt: '2024-01-05T14:20:00Z',
    ipAddress: '192.168.1.50',
    hostname: 'linux-server-01',
    serialNumber: 'SRV-001-LINUX',
    tags: ['production'],
    groups: [{ id: 'g4', name: 'Production Systems' }],
    capabilities: ['scan'],
  },
];

const mockCommands: Record<string, Command[]> = {
  '1': [
    {
      id: 'cmd-1',
      agentId: '1',
      type: 'scan',
      status: 'completed',
      createdAt: '2024-01-13T09:00:00Z',
      executedAt: '2024-01-13T09:02:00Z',
      result: 'Scan completed: 45 patches available',
    },
    {
      id: 'cmd-2',
      agentId: '1',
      type: 'update',
      status: 'completed',
      createdAt: '2024-01-12T14:00:00Z',
      executedAt: '2024-01-12T14:45:00Z',
      result: 'Updated 12 patches successfully',
    },
    {
      id: 'cmd-3',
      agentId: '1',
      type: 'deploy',
      status: 'pending',
      createdAt: '2024-01-13T10:00:00Z',
    },
  ],
  '2': [
    {
      id: 'cmd-4',
      agentId: '2',
      type: 'scan',
      status: 'completed',
      createdAt: '2024-01-13T08:30:00Z',
      executedAt: '2024-01-13T08:35:00Z',
      result: 'Scan completed: 28 patches available',
    },
    {
      id: 'cmd-5',
      agentId: '2',
      type: 'reboot',
      status: 'pending',
      createdAt: '2024-01-13T10:05:00Z',
    },
  ],
  '3': [
    {
      id: 'cmd-6',
      agentId: '3',
      type: 'scan',
      status: 'failed',
      createdAt: '2024-01-12T20:00:00Z',
      executedAt: '2024-01-12T20:05:00Z',
      result: 'Scan failed: Connection timeout',
    },
  ],
};

const mockAgentDownloads: AgentDownload[] = [
  {
    os: 'Windows 11',
    version: '2.1.0',
    releaseDate: '25/12/24',
    downloadUrl: '/downloads/windows-agent.exe',
  },
  {
    os: 'MacOS',
    version: '2.1.0',
    releaseDate: '25/12/24',
    downloadUrl: '/downloads/macos-agent.dmg',
  },
  {
    os: 'Linux',
    version: '2.0.5',
    releaseDate: '20/12/24',
    downloadUrl: '/downloads/linux-agent.deb',
  },
];

export const agentHandlers = [
  // Get all agents
  http.get(`${API_BASE_URL}/agents`, () => {
    return HttpResponse.json(mockAgents);
  }),

  // Get single agent details
  http.get(`${API_BASE_URL}/agents/:id`, ({ params }) => {
    const agent = mockAgents.find((a) => a.id === params.id);
    if (!agent) {
      return HttpResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    return HttpResponse.json(agent);
  }),

  // Get agent commands
  http.get(`${API_BASE_URL}/agents/:id/commands`, ({ params }) => {
    const commands = mockCommands[params.id] || [];
    return HttpResponse.json(commands);
  }),

  // Get agent downloads
  http.get(`${API_BASE_URL}/agents/downloads`, () => {
    return HttpResponse.json(mockAgentDownloads);
  }),

  // Delete agent
  http.delete(`${API_BASE_URL}/agents/:id`, ({ params }) => {
    mockAgents = mockAgents.filter((agent) => agent.id !== params.id);
    return HttpResponse.json({ success: true });
  }),
];
