import { http, HttpResponse } from 'msw';
import type {
  Patch,
  AffectedSoftware,
  FileDetail,
  Vulnerability,
  Endpoint,
  EndpointDetails,
  Deployment,
  PatchTest,
  ZeroTouchConfig,
  Asset,
} from '../../services/patch.service';

const API_BASE_URL = 'http://localhost:3000/v1';

let mockPatches: Patch[] = [
  {
    id: '1',
    software: '2025-08 Cumulative Update for Windows 10 Version 22H2 for x64-based Systems',
    patchId: 'ZPH-W-5416',
    endpoints: 1,
    os: 'Windows',
    severity: 'CRITICAL',
    operationalStatusSince: 'May 05, 2025 3:45pm',
    platform: 'Windows',
    description: 'Install this update to resolve issues in Windows. For a complete listing of the issues that are included in this update, see the associated Microsoft Knowledge Base article for more information. After you install this item, you may have to restart your computer.',
    category: 'Security Updates',
    bulletinId: '--',
    kbNumber: '5063709',
    releaseDate: '2025/08/12',
    rebootRequired: true,
    supportUninstallation: true,
    architecture: '64 BIT',
    referenceUrl: 'https://notepad-plus-plus.org/downloads/',
    languagesSupported: ['English', 'Spanish', 'French'],
    tags: ['Third Party'],
    approvalStatus: 'Approved',
    testStatus: 'Not Tested',
    cveNumbers: [
      'CVE-2025-53718', 'CVE-2025-53778', 'CVE-2025-49761', 'CVE-2025-50154', 'CVE-2025-53716',
      'CVE-2025-53723', 'CVE-2025-53726', 'CVE-2025-53766', 'CVE-2025-53149', 'CVE-2025-50172',
      'CVE-2025-50173', 'CVE-2025-50177', 'CVE-2025-53115', 'CVE-2025-53152', 'CVE-2025-53151',
      'CVE-2025-53724', 'CVE-2025-49743', 'CVE-2025-50161', 'CVE-2025-50166', 'CVE-2025-53152',
    ],
    status: 'Draft',
    downloadStatus: 'None',
    size: '721.1 MB',
    createdAt: '2025/08/15 02:32:55 PM',
    lastUpdatedAt: '--',
    source: 'Scanning',
    releasedOn: '2025/08/12 10:30:00 PM',
    downloadedOn: '--',
    supersededBy: [],
    supersedes: ['5063159', '5063709'],
  },
  {
    id: '2',
    software: 'Notepad++(8.8.4)',
    patchId: 'xxx-x-xxxx',
    endpoints: 1,
    os: 'MacOS',
    severity: 'UNSPECIFIED',
    operationalStatusSince: 'May 05, 2025 3:45pm',
    platform: 'MacOS',
    description: 'Notepad++ version 8.8.4 update with bug fixes and performance improvements.',
    category: 'Application Updates',
    bulletinId: '--',
    kbNumber: 'NPP-884',
    releaseDate: '2025/05/01',
    rebootRequired: false,
    supportUninstallation: true,
    architecture: 'Universal',
    referenceUrl: 'https://notepad-plus-plus.org',
    languagesSupported: ['English'],
    tags: ['Third Party'],
    cveNumbers: [],
  },
  {
    id: '3',
    software: 'TeamViewer(15.68.6)',
    patchId: 'xxx-x-xxxx',
    endpoints: 2,
    os: 'Windows',
    severity: 'Low',
    operationalStatusSince: 'May 05, 2025 3:45pm',
    platform: 'Windows',
    description: 'TeamViewer remote access software update.',
    category: 'Application Updates',
    bulletinId: '--',
    kbNumber: 'TV-15686',
    releaseDate: '2025/04/28',
    rebootRequired: false,
    supportUninstallation: true,
    architecture: '64 BIT',
    referenceUrl: 'https://teamviewer.com',
    languagesSupported: ['English', 'German'],
    tags: [],
    cveNumbers: [],
  },
  {
    id: '4',
    software: 'Reader(25.001.20623)',
    patchId: 'xxx-x-xxxx',
    endpoints: 1,
    os: 'Ubuntu',
    severity: 'CRITICAL',
    operationalStatusSince: 'May 05, 2025 3:45pm',
    platform: 'Linux',
    description: 'Adobe Acrobat Reader security update.',
    category: 'Security Updates',
    bulletinId: 'APSB25-15',
    kbNumber: 'APSB25-15',
    releaseDate: '2025/04/15',
    rebootRequired: false,
    supportUninstallation: true,
    architecture: '64 BIT',
    referenceUrl: 'https://adobe.com',
    languagesSupported: ['English'],
    tags: [],
    cveNumbers: ['CVE-2025-21234', 'CVE-2025-21235'],
  },
  {
    id: '5',
    software: '2025-08 .NET 8.0.19 Update for x64 Systems',
    patchId: 'xxx-x-xxxx',
    endpoints: 1,
    os: 'Windows',
    severity: 'High',
    operationalStatusSince: 'May 06, 2025 10:15am',
    platform: 'Windows',
    description: '.NET Framework security and quality rollup.',
    category: 'Security Updates',
    bulletinId: '--',
    kbNumber: '5063810',
    releaseDate: '2025/08/13',
    rebootRequired: true,
    supportUninstallation: true,
    architecture: '64 BIT',
    referenceUrl: 'https://microsoft.com/net',
    languagesSupported: ['English'],
    tags: [],
    cveNumbers: ['CVE-2025-30001', 'CVE-2025-30002'],
  },
  {
    id: '6',
    software: 'Google Chrome (125.0.6422.113)',
    patchId: 'xxx-x-xxxx',
    endpoints: 5,
    os: 'Windows',
    severity: 'CRITICAL',
    operationalStatusSince: 'May 10, 2025 2:30pm',
    platform: 'Windows',
    description: 'Chrome browser security update with critical fixes.',
    category: 'Security Updates',
    bulletinId: '--',
    kbNumber: 'CHR-125',
    releaseDate: '2025/05/10',
    rebootRequired: false,
    supportUninstallation: false,
    architecture: '64 BIT',
    referenceUrl: 'https://chrome.google.com',
    languagesSupported: ['English', 'Spanish', 'French', 'German', 'Chinese'],
    tags: ['Critical', 'Browser'],
    cveNumbers: ['CVE-2025-40001', 'CVE-2025-40002', 'CVE-2025-40003'],
  },
  {
    id: '7',
    software: 'Mozilla Firefox (126.0.1)',
    patchId: 'xxx-x-xxxx',
    endpoints: 3,
    os: 'MacOS',
    severity: 'High',
    operationalStatusSince: 'May 12, 2025 9:00am',
    platform: 'MacOS',
    description: 'Firefox browser update with security enhancements.',
    category: 'Security Updates',
    bulletinId: 'MFSA2025-20',
    kbNumber: 'MFSA2025-20',
    releaseDate: '2025/05/12',
    rebootRequired: false,
    supportUninstallation: true,
    architecture: 'Universal',
    referenceUrl: 'https://mozilla.org',
    languagesSupported: ['English'],
    tags: ['Browser'],
    cveNumbers: ['CVE-2025-50001'],
  },
  {
    id: '8',
    software: 'VLC Media Player (3.0.21)',
    patchId: 'xxx-x-xxxx',
    endpoints: 2,
    os: 'Linux',
    severity: 'Medium',
    operationalStatusSince: 'May 14, 2025 4:20pm',
    platform: 'Linux',
    description: 'VLC media player bug fixes and improvements.',
    category: 'Application Updates',
    bulletinId: '--',
    kbNumber: 'VLC-3021',
    releaseDate: '2025/05/14',
    rebootRequired: false,
    supportUninstallation: true,
    architecture: '64 BIT',
    referenceUrl: 'https://videolan.org',
    languagesSupported: ['English', 'French'],
    tags: ['Media'],
    cveNumbers: [],
  },
  {
    id: '9',
    software: 'Microsoft Office 2021 Update',
    patchId: 'xxx-x-xxxx',
    endpoints: 8,
    os: 'Windows',
    severity: 'High',
    operationalStatusSince: 'May 15, 2025 11:45am',
    platform: 'Windows',
    description: 'Security update for Microsoft Office 2021.',
    category: 'Security Updates',
    bulletinId: '--',
    kbNumber: '5063920',
    releaseDate: '2025/05/15',
    rebootRequired: false,
    supportUninstallation: true,
    architecture: '64 BIT',
    referenceUrl: 'https://microsoft.com/office',
    languagesSupported: ['English', 'Spanish'],
    tags: ['Office'],
    cveNumbers: ['CVE-2025-60001', 'CVE-2025-60002'],
  },
  {
    id: '10',
    software: 'Zoom Client (5.17.5)',
    patchId: 'xxx-x-xxxx',
    endpoints: 4,
    os: 'MacOS',
    severity: 'Low',
    operationalStatusSince: 'May 16, 2025 3:10pm',
    platform: 'MacOS',
    description: 'Zoom video conferencing client update.',
    category: 'Application Updates',
    bulletinId: '--',
    kbNumber: 'ZOOM-5175',
    releaseDate: '2025/05/16',
    rebootRequired: false,
    supportUninstallation: true,
    architecture: 'Universal',
    referenceUrl: 'https://zoom.us',
    languagesSupported: ['English'],
    tags: ['Communication'],
    cveNumbers: [],
  },
];

const mockAffectedSoftwares: AffectedSoftware[] = [
  {
    id: '1',
    softwareName: 'Microsoft Windows 10 Pro',
    version: '22H2 (Build 19045)',
    vendor: 'Microsoft Corporation',
    installedOn: 45,
    platform: 'Windows',
  },
  {
    id: '2',
    softwareName: 'Microsoft Windows 10 Enterprise',
    version: '21H2 (Build 19044)',
    vendor: 'Microsoft Corporation',
    installedOn: 23,
    platform: 'Windows',
  },
  {
    id: '3',
    softwareName: 'Microsoft Windows 10 Home',
    version: '22H2 (Build 19045)',
    vendor: 'Microsoft Corporation',
    installedOn: 12,
    platform: 'Windows',
  },
  {
    id: '4',
    softwareName: 'Microsoft .NET Framework 4.8',
    version: '4.8.04084',
    vendor: 'Microsoft Corporation',
    installedOn: 78,
    platform: 'Windows',
  },
  {
    id: '5',
    softwareName: 'Visual C++ Redistributable 2019',
    version: '14.28.29325.2',
    vendor: 'Microsoft Corporation',
    installedOn: 65,
    platform: 'Windows',
  },
];

const mockFileDetails: FileDetail[] = [
  {
    id: '1',
    fileName: 'windows10.0-kb5063709-x64.msu',
    version: '10.0.19045.5063',
    size: '721.1 MB',
    path: 'C:\\Windows\\Updates',
  },
  {
    id: '2',
    fileName: 'update.cab',
    version: '10.0.19045.5063',
    size: '650.2 MB',
    path: 'C:\\Windows\\Updates\\Temp',
  },
];

const mockVulnerabilities: Vulnerability[] = [
  {
    id: '1',
    cveNumber: 'CVE-2025-53718',
    severity: 'Critical',
    description: 'Remote Code Execution vulnerability in Windows kernel',
    publishedDate: '2025/08/10',
  },
  {
    id: '2',
    cveNumber: 'CVE-2025-53778',
    severity: 'High',
    description: 'Elevation of Privilege vulnerability in Windows User Account Control',
    publishedDate: '2025/08/10',
  },
  {
    id: '3',
    cveNumber: 'CVE-2025-49761',
    severity: 'High',
    description: 'Information Disclosure vulnerability in Windows Graphics Component',
    publishedDate: '2025/08/09',
  },
];

const mockEndpoints: Endpoint[] = [
  {
    id: '1',
    name: 'DESKTOP-7CC6ETJ',
    os: 'Windows 10 Pro',
    status: 'Online',
    lastSeen: '2 mins ago',
  },
  {
    id: '2',
    name: 'LAPTOP-9XK2PLM',
    os: 'Windows 11 Pro',
    status: 'Online',
    lastSeen: '5 mins ago',
  },
  {
    id: '3',
    name: 'WORKSTATION-5YT8QWE',
    os: 'Windows 10 Enterprise',
    status: 'Offline',
    lastSeen: '2 hours ago',
  },
];

const mockEndpointDetails: Record<string, EndpointDetails> = {
  '1': {
    id: '1',
    name: 'DESKTOP-7CC6ETJ',
    os: 'Windows 10 Pro',
    osVersion: '22H2 Build 19045',
    status: 'Online',
    lastSeen: '2 mins ago',
    agentId: 'agent-001',
    agentName: 'Patchify Agent',
    agentVersion: '2.5.1',
    agentStatus: 'Connected',
    assetId: 'asset-001',
    assetName: 'DESKTOP-7CC6ETJ',
    groups: [
      { id: 'grp-1', name: 'Windows Workstations' },
      { id: 'grp-2', name: 'Engineering Department' },
    ],
    ipAddress: '192.168.1.101',
    macAddress: '00:1A:2B:3C:4D:5E',
    hostname: 'DESKTOP-7CC6ETJ.contoso.com',
    manufacturer: 'Hewlett-Packard',
    model: 'HP EliteBook Folio 9470m',
    serialNumber: 'CNU4152L3X',
    location: 'Building A, Floor 2',
    department: 'Engineering',
    owner: 'John Smith',
    patchSummary: {
      total: 15,
      installed: 10,
      missing: 3,
      failed: 1,
      pending: 1,
      criticalMissing: 1,
      securityMissing: 2,
      lastScanDate: 'Dec 13, 2025 10:30 AM',
      lastScanRelative: '1 day ago',
      compliancePercent: 66.7,
    },
    relatedPatches: [
      {
        id: '1',
        name: '2025-08 Cumulative Update for Windows 10',
        severity: 'CRITICAL',
        status: 'Missing',
        kbNumber: 'KB5063709',
      },
      {
        id: '5',
        name: '2025-08 .NET 8.0.19 Update',
        severity: 'High',
        status: 'Installed',
        kbNumber: 'KB5063810',
      },
      {
        id: '6',
        name: 'Google Chrome (125.0.6422.113)',
        severity: 'CRITICAL',
        status: 'Pending',
        kbNumber: 'CHR-125',
      },
      {
        id: '9',
        name: 'Microsoft Office 2021 Update',
        severity: 'High',
        status: 'Failed',
        kbNumber: 'KB5063920',
      },
    ],
    recentDeployments: [
      {
        id: 'dep-1',
        patchId: '5',
        patchName: '2025-08 .NET 8.0.19 Update',
        date: 'Dec 12, 2025',
        status: 'Success',
      },
      {
        id: 'dep-2',
        patchId: '9',
        patchName: 'Microsoft Office 2021 Update',
        date: 'Dec 11, 2025',
        status: 'Failed',
      },
      {
        id: 'dep-3',
        patchId: '3',
        patchName: 'TeamViewer (15.68.6)',
        date: 'Dec 10, 2025',
        status: 'Success',
      },
    ],
  },
  '2': {
    id: '2',
    name: 'LAPTOP-9XK2PLM',
    os: 'Windows 11 Pro',
    osVersion: '23H2 Build 22631',
    status: 'Online',
    lastSeen: '5 mins ago',
    agentId: 'agent-002',
    agentName: 'Patchify Agent',
    agentVersion: '2.5.1',
    agentStatus: 'Connected',
    assetId: 'asset-002',
    assetName: 'LAPTOP-9XK2PLM',
    groups: [
      { id: 'grp-1', name: 'Windows Workstations' },
      { id: 'grp-3', name: 'Sales Department' },
    ],
    ipAddress: '192.168.1.102',
    macAddress: '00:1A:2B:3C:4D:5F',
    hostname: 'LAPTOP-9XK2PLM.contoso.com',
    manufacturer: 'Dell',
    model: 'Latitude 7420',
    serialNumber: 'DELL7420X9K2',
    location: 'Building B, Floor 1',
    department: 'Sales',
    owner: 'Jane Doe',
    patchSummary: {
      total: 12,
      installed: 11,
      missing: 1,
      failed: 0,
      pending: 0,
      criticalMissing: 0,
      securityMissing: 1,
      lastScanDate: 'Dec 14, 2025 8:15 AM',
      lastScanRelative: '2 hours ago',
      compliancePercent: 91.7,
    },
    relatedPatches: [
      {
        id: '1',
        name: '2025-08 Cumulative Update for Windows 10',
        severity: 'CRITICAL',
        status: 'Missing',
        kbNumber: 'KB5063709',
      },
      {
        id: '6',
        name: 'Google Chrome (125.0.6422.113)',
        severity: 'CRITICAL',
        status: 'Installed',
        kbNumber: 'CHR-125',
      },
    ],
    recentDeployments: [
      {
        id: 'dep-4',
        patchId: '6',
        patchName: 'Google Chrome (125.0.6422.113)',
        date: 'Dec 13, 2025',
        status: 'Success',
      },
      {
        id: 'dep-5',
        patchId: '5',
        patchName: '2025-08 .NET 8.0.19 Update',
        date: 'Dec 12, 2025',
        status: 'Success',
      },
    ],
  },
  '3': {
    id: '3',
    name: 'WORKSTATION-5YT8QWE',
    os: 'Windows 10 Enterprise',
    osVersion: '21H2 Build 19044',
    status: 'Offline',
    lastSeen: '2 hours ago',
    agentId: 'agent-003',
    agentName: 'Patchify Agent',
    agentVersion: '2.4.8',
    agentStatus: 'Disconnected',
    assetId: 'asset-003',
    assetName: 'WORKSTATION-5YT8QWE',
    groups: [
      { id: 'grp-4', name: 'Data Center Servers' },
    ],
    ipAddress: '192.168.2.50',
    macAddress: '00:1A:2B:3C:4D:60',
    hostname: 'WORKSTATION-5YT8QWE.contoso.com',
    manufacturer: 'Lenovo',
    model: 'ThinkStation P350',
    serialNumber: 'LEN5YT8QWE',
    location: 'Data Center',
    department: 'IT Operations',
    owner: 'Mike Johnson',
    patchSummary: {
      total: 20,
      installed: 14,
      missing: 5,
      failed: 0,
      pending: 1,
      criticalMissing: 2,
      securityMissing: 3,
      lastScanDate: 'Dec 12, 2025 6:00 PM',
      lastScanRelative: '2 days ago',
      compliancePercent: 70.0,
    },
    relatedPatches: [
      {
        id: '1',
        name: '2025-08 Cumulative Update for Windows 10',
        severity: 'CRITICAL',
        status: 'Missing',
        kbNumber: 'KB5063709',
      },
      {
        id: '4',
        name: 'Reader (25.001.20623)',
        severity: 'CRITICAL',
        status: 'Missing',
        kbNumber: 'APSB25-15',
      },
      {
        id: '5',
        name: '2025-08 .NET 8.0.19 Update',
        severity: 'High',
        status: 'Pending',
        kbNumber: 'KB5063810',
      },
    ],
    recentDeployments: [
      {
        id: 'dep-6',
        patchId: '9',
        patchName: 'Microsoft Office 2021 Update',
        date: 'Dec 10, 2025',
        status: 'Success',
      },
    ],
  },
};

let mockDeployments: Deployment[] = [
  {
    id: '1',
    name: 'Defender Patch Deployment',
    deploymentId: 'xxx-xxxx',
    type: 'INSTALL',
    stage: 'INSTALLED',
    pending: 1,
    succeeded: 1,
    failed: 1,
    createdBy: 'Admin',
    createdOn: 'May 05, 2025',
  },
  {
    id: '2',
    name: 'Defender Patch',
    deploymentId: 'xxx-xxxx',
    type: 'INSTALL',
    stage: 'COMPLETED',
    pending: 1,
    succeeded: 1,
    failed: 1,
    createdBy: 'Admin',
    createdOn: 'May 05, 2025',
  },
  {
    id: '3',
    name: 'Ultra viewer Install',
    deploymentId: 'xxx-xxxx',
    type: 'INSTALL',
    stage: 'COMPLETED',
    pending: 2,
    succeeded: 2,
    failed: 2,
    createdBy: 'Admin',
    createdOn: 'May 05, 2025',
  },
  {
    id: '4',
    name: 'Auto Patch Deploy - Windows Defender',
    deploymentId: 'xxx-xxxx',
    type: 'ROLLBACK',
    stage: 'COMPLETED',
    pending: 1,
    succeeded: 1,
    failed: 1,
    createdBy: 'Admin',
    createdOn: 'May 05, 2025',
  },
];

let mockPatchTests: PatchTest[] = [];

let mockZeroTouchConfigs: ZeroTouchConfig[] = [];

export const patchHandlers = [
  // Patches
  http.get(`${API_BASE_URL}/patches`, () => {
    return HttpResponse.json(mockPatches);
  }),

  http.get(`${API_BASE_URL}/patches/:id`, ({ params }) => {
    const { id } = params;
    const patch = mockPatches.find((p) => p.id === id);
    if (!patch) {
      return HttpResponse.json({ error: 'Patch not found' }, { status: 404 });
    }
    return HttpResponse.json(patch);
  }),

  http.post(`${API_BASE_URL}/patches`, async ({ request }) => {
    const newPatch = (await request.json()) as Partial<Patch>;
    const patch: Patch = {
      id: String(mockPatches.length + 1),
      software: newPatch.software || '',
      patchId: `ZPH-${Math.random().toString(36).substr(2, 9)}`,
      endpoints: 0,
      os: newPatch.os || 'Windows',
      severity: newPatch.severity || 'UNSPECIFIED',
      operationalStatusSince: new Date().toLocaleString(),
      platform: newPatch.platform || '',
      description: newPatch.description || '',
      category: newPatch.category || '',
      bulletinId: newPatch.bulletinId || '',
      kbNumber: newPatch.kbNumber || '',
      releaseDate: newPatch.releaseDate || '',
      rebootRequired: newPatch.rebootRequired || false,
      supportUninstallation: newPatch.supportUninstallation || false,
      architecture: newPatch.architecture || '',
      referenceUrl: newPatch.referenceUrl || '',
      languagesSupported: newPatch.languagesSupported || [],
      tags: newPatch.tags || [],
    };
    mockPatches.push(patch);
    return HttpResponse.json(patch);
  }),

  http.put(`${API_BASE_URL}/patches/:id`, async ({ params, request }) => {
    const { id } = params;
    const updates = (await request.json()) as Partial<Patch>;
    const index = mockPatches.findIndex((p) => p.id === id);
    if (index === -1) {
      return HttpResponse.json({ error: 'Patch not found' }, { status: 404 });
    }
    mockPatches[index] = { ...mockPatches[index], ...updates };
    return HttpResponse.json(mockPatches[index]);
  }),

  http.delete(`${API_BASE_URL}/patches/:id`, ({ params }) => {
    const { id } = params;
    mockPatches = mockPatches.filter((p) => p.id !== id);
    return HttpResponse.json({ success: true });
  }),

  http.get(`${API_BASE_URL}/patches/:id/affected-softwares`, () => {
    return HttpResponse.json(mockAffectedSoftwares);
  }),

  http.post(`${API_BASE_URL}/patches/:id/scan-endpoints`, () => {
    return HttpResponse.json({ success: true });
  }),

  http.get(`${API_BASE_URL}/patches/:id/file-details`, () => {
    return HttpResponse.json(mockFileDetails);
  }),

  http.get(`${API_BASE_URL}/patches/:id/vulnerabilities`, () => {
    return HttpResponse.json(mockVulnerabilities);
  }),

  http.get(`${API_BASE_URL}/patches/:id/endpoints`, () => {
    return HttpResponse.json(mockEndpoints);
  }),

  // Endpoint Details
  http.get(`${API_BASE_URL}/endpoints/:id`, ({ params }) => {
    const { id } = params;
    const endpointDetails = mockEndpointDetails[id as string];
    if (!endpointDetails) {
      return HttpResponse.json({ error: 'Endpoint not found' }, { status: 404 });
    }
    return HttpResponse.json(endpointDetails);
  }),

  // Deployments
  http.get(`${API_BASE_URL}/deployments`, () => {
    return HttpResponse.json(mockDeployments);
  }),

  http.get(`${API_BASE_URL}/deployments/:id`, ({ params }) => {
    const { id } = params;
    const deployment = mockDeployments.find((d) => d.id === id);
    if (!deployment) {
      return HttpResponse.json({ error: 'Deployment not found' }, { status: 404 });
    }
    return HttpResponse.json(deployment);
  }),

  http.post(`${API_BASE_URL}/deployments`, async ({ request }) => {
    const newDeployment = (await request.json()) as Partial<Deployment>;
    const deployment: Deployment = {
      id: String(mockDeployments.length + 1),
      name: newDeployment.name || '',
      deploymentId: `DEP-${Math.random().toString(36).substr(2, 9)}`,
      type: newDeployment.type || 'INSTALL',
      stage: 'IN_PROGRESS',
      pending: 0,
      succeeded: 0,
      failed: 0,
      createdBy: 'Admin',
      createdOn: new Date().toLocaleDateString(),
    };
    mockDeployments.push(deployment);
    return HttpResponse.json(deployment);
  }),

  http.delete(`${API_BASE_URL}/deployments/:id`, ({ params }) => {
    const { id } = params;
    mockDeployments = mockDeployments.filter((d) => d.id !== id);
    return HttpResponse.json({ success: true });
  }),

  http.get(`${API_BASE_URL}/deployments/:id/preview`, ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      deploymentId: id,
      patches: mockPatches.slice(0, 2),
      targetEndpoints: 10,
      estimatedDuration: '30 minutes',
    });
  }),

  http.post(`${API_BASE_URL}/deployments/:id/execute`, () => {
    return HttpResponse.json({ success: true });
  }),

  // Patch Tests
  http.get(`${API_BASE_URL}/patch-tests`, () => {
    return HttpResponse.json(mockPatchTests);
  }),

  http.get(`${API_BASE_URL}/patch-tests/:id`, ({ params }) => {
    const { id } = params;
    const test = mockPatchTests.find((t) => t.id === id);
    if (!test) {
      return HttpResponse.json({ error: 'Test not found' }, { status: 404 });
    }
    return HttpResponse.json(test);
  }),

  http.post(`${API_BASE_URL}/patch-tests`, async ({ request }) => {
    const newTest = (await request.json()) as Partial<PatchTest>;
    const test: PatchTest = {
      id: String(mockPatchTests.length + 1),
      name: newTest.name || '',
      description: newTest.description || '',
      applicationType: newTest.applicationType || 'ALL',
      applications: newTest.applications || [],
      scope: newTest.scope || 'ALL_COMPUTERS',
      computers: newTest.computers || [],
      groups: newTest.groups || [],
      status: 'Pending',
      createdBy: 'Admin',
      createdOn: new Date().toLocaleDateString(),
    };
    mockPatchTests.push(test);
    return HttpResponse.json(test);
  }),

  http.put(`${API_BASE_URL}/patch-tests/:id/approve`, ({ params }) => {
    const { id } = params;
    const index = mockPatchTests.findIndex((t) => t.id === id);
    if (index === -1) {
      return HttpResponse.json({ error: 'Test not found' }, { status: 404 });
    }
    mockPatchTests[index].status = 'Approved';
    return HttpResponse.json(mockPatchTests[index]);
  }),

  http.delete(`${API_BASE_URL}/patch-tests/:id`, ({ params }) => {
    const { id } = params;
    mockPatchTests = mockPatchTests.filter((t) => t.id !== id);
    return HttpResponse.json({ success: true });
  }),

  // Zero Touch
  http.get(`${API_BASE_URL}/zero-touch-configs`, () => {
    return HttpResponse.json(mockZeroTouchConfigs);
  }),

  http.get(`${API_BASE_URL}/zero-touch-configs/:id`, ({ params }) => {
    const { id } = params;
    const config = mockZeroTouchConfigs.find((c) => c.id === id);
    if (!config) {
      return HttpResponse.json({ error: 'Config not found' }, { status: 404 });
    }
    return HttpResponse.json(config);
  }),

  http.post(`${API_BASE_URL}/zero-touch-configs`, async ({ request }) => {
    const newConfig = (await request.json()) as Partial<ZeroTouchConfig>;
    const config: ZeroTouchConfig = {
      id: String(mockZeroTouchConfigs.length + 1),
      name: newConfig.name || '',
      description: newConfig.description || '',
      applicationType: newConfig.applicationType || 'ALL',
      applications: newConfig.applications || [],
      scope: newConfig.scope || 'ALL_COMPUTERS',
      computers: newConfig.computers || [],
      groups: newConfig.groups || [],
      autoDeploymentRules: newConfig.autoDeploymentRules || {
        severity: [],
        approvalRequired: false,
        schedule: '',
      },
      status: 'Active',
      createdBy: 'Admin',
      createdOn: new Date().toLocaleDateString(),
    };
    mockZeroTouchConfigs.push(config);
    return HttpResponse.json(config);
  }),

  http.put(`${API_BASE_URL}/zero-touch-configs/:id`, async ({ params, request }) => {
    const { id } = params;
    const updates = (await request.json()) as Partial<ZeroTouchConfig>;
    const index = mockZeroTouchConfigs.findIndex((c) => c.id === id);
    if (index === -1) {
      return HttpResponse.json({ error: 'Config not found' }, { status: 404 });
    }
    mockZeroTouchConfigs[index] = { ...mockZeroTouchConfigs[index], ...updates };
    return HttpResponse.json(mockZeroTouchConfigs[index]);
  }),

  http.delete(`${API_BASE_URL}/zero-touch-configs/:id`, ({ params }) => {
    const { id } = params;
    mockZeroTouchConfigs = mockZeroTouchConfigs.filter((c) => c.id !== id);
    return HttpResponse.json({ success: true });
  }),
];
