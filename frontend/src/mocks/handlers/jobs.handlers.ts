import { http, HttpResponse, delay } from 'msw';
import type {
  PatchJob,
  VulnerabilityJob,
  VulnerabilityDBSync,
  SoftwareCatalogItem,
  SoftwareBundle,
  SoftwareDeployment,
  ConfigCatalogItem,
  ConfigBundle,
  ConfigDeployment,
  DeploymentTask,
  DeploymentPolicy,
} from '../../types/jobs.types';

// ============ Mock Data ============

// Patch Jobs
let mockPatchJobs: PatchJob[] = [
  {
    id: '1',
    policyId: 'POLICY-2',
    name: 'Scheduled Patch Deployment',
    description: 'Scheduled Patch Deployment policy for automated updates',
    type: 'SCHEDULE',
    configType: 'INSTALL',
    scope: 'Global',
    patches: ['patch-1', 'patch-2'],
    deploymentPolicy: 'policy-1',
    retryCount: 3,
    batchSize: 10,
    createdBy: 'Admin',
    createdOn: '2026/01/12 12:14:27 PM',
  },
  {
    id: '2',
    policyId: 'POLICY-1',
    name: 'OOB Instant deployment policy',
    description: '',
    type: 'INSTANT',
    configType: 'INSTALL',
    scope: 'Global',
    patches: ['patch-3'],
    deploymentPolicy: 'policy-2',
    retryCount: 1,
    createdBy: 'Admin',
    createdOn: '2025/11/27 10:15:32 PM',
  },
];

// Vulnerability Jobs
let mockVulnerabilityJobs: VulnerabilityJob[] = [
  {
    id: '1',
    jobId: 'VULN-JOB-001',
    name: 'Daily Vulnerability Scan',
    description: 'Automated daily scan for all endpoints',
    scope: 'Global',
    scanType: 'scheduled',
    status: 'SCHEDULED',
    scheduledTime: '02:00 AM',
    nextRun: '2026/01/16 02:00:00 AM',
    createdBy: 'Admin',
    createdOn: '2026/01/10 10:30:00 AM',
  },
  {
    id: '2',
    jobId: 'VULN-JOB-002',
    name: 'Weekly Full Scan',
    description: 'Comprehensive vulnerability scan for all assets',
    scope: 'Global',
    scanType: 'scheduled',
    recurrence: 'weekly',
    status: 'COMPLETED',
    lastRun: '2026/01/15 02:00:00 AM',
    nextRun: '2026/01/22 02:00:00 AM',
    createdBy: 'Admin',
    createdOn: '2026/01/05 09:15:00 AM',
  },
];

let mockVulnerabilityDBSync: VulnerabilityDBSync = {
  scanJobInterval: 2,
  scanJobUnit: 'Hour',
  databaseSyncTime: '01:00:00',
  lastSync: '2026/01/15 06:38:30 AM',
  totalCVE: 311639,
};

// Software Catalog
let mockSoftwareCatalog: SoftwareCatalogItem[] = [
  {
    id: '1',
    deploymentId: 'SWP-017',
    applicationName: 'TightVNC',
    description: 'TightVNC remote desktop software',
    os: 'Windows',
    version: 'latest',
    applicationLocationType: 'URL',
    selfService: true,
    architecture: 'x64',
    applicationType: 'MSI',
    createdBy: 'Admin',
    createdOn: '2026/01/10 10:00:00 AM',
  },
  {
    id: '2',
    deploymentId: 'SWP-016',
    applicationName: 'Google Chrome',
    description: 'Google Chrome for Ubuntu',
    os: 'Linux',
    version: 'latest',
    applicationLocationType: 'URL',
    selfService: true,
    architecture: 'x64',
    applicationType: 'APPLICATION',
    createdBy: 'Admin',
    createdOn: '2026/01/09 09:30:00 AM',
  },
  {
    id: '3',
    deploymentId: 'SWP-015',
    applicationName: 'TEST',
    description: 'Test application installer',
    os: 'Windows',
    version: '7.4.0.1658',
    applicationLocationType: 'Local Directory',
    selfService: false,
    architecture: 'x64',
    applicationType: 'EXE',
    createdBy: 'Admin',
    createdOn: '2026/01/08 14:00:00 PM',
  },
  {
    id: '4',
    deploymentId: 'SWP-014',
    applicationName: 'Zoom desktop client',
    description: 'Install Zoom desktop client for Meetings x64',
    os: 'Windows',
    version: 'latest',
    applicationLocationType: 'URL',
    selfService: true,
    architecture: 'x64',
    applicationType: 'MSI',
    createdBy: 'Admin',
    createdOn: '2026/01/07 11:30:00 AM',
  },
  {
    id: '5',
    deploymentId: 'SWP-013',
    applicationName: 'WinRAR',
    description: 'Install winrar x64 700',
    os: 'Windows',
    version: '700',
    applicationLocationType: 'URL',
    selfService: true,
    architecture: 'x64',
    applicationType: 'EXE',
    createdBy: 'Admin',
    createdOn: '2026/01/06 10:15:00 AM',
  },
  {
    id: '6',
    deploymentId: 'SWP-012',
    applicationName: 'VLC For Mac',
    description: 'Install VLC 3.0.20',
    os: 'Mac',
    version: '3.0.20',
    applicationLocationType: 'URL',
    selfService: true,
    architecture: 'x64',
    applicationType: 'APPLICATION',
    createdBy: 'Admin',
    createdOn: '2026/01/05 09:00:00 AM',
  },
];

// Software Bundles
let mockSoftwareBundles: SoftwareBundle[] = [
  {
    id: 'b1',
    bundleId: 'BND-001',
    bundleName: 'HR Team Bundle',
    os: 'Windows',
    description: 'Essential software for HR team',
    applications: ['1', '4', '5'],
    createdBy: 'Admin',
    createdOn: '2026/01/10 10:00:00 AM',
  },
  {
    id: 'b2',
    bundleId: 'BND-002',
    bundleName: 'Development Tools',
    os: 'Windows',
    description: 'Development environment setup',
    applications: ['2', '3'],
    createdBy: 'Admin',
    createdOn: '2026/01/09 09:30:00 AM',
  },
  {
    id: 'b3',
    bundleId: 'BND-003',
    bundleName: 'Productivity Suite',
    os: 'Windows',
    description: 'Office productivity applications',
    applications: ['1', '2', '4'],
    createdBy: 'Admin',
    createdOn: '2026/01/08 14:00:00 PM',
  },
];

// Software Deployments
let mockSoftwareDeployments: SoftwareDeployment[] = [
  {
    id: '1',
    deploymentId: 'ADR-007',
    deploymentName: 'Test3',
    description: 'Test deployment 3',
    deploymentType: 'install',
    selectionType: 'application',
    selectedItems: ['1'],
    scope: 'all',
    deploymentPolicy: 'policy-1',
    retryCount: 1,
    notifyTo: 'admin',
    stage: 'COMPLETED',
    pending: 0,
    succeeded: 1,
    failed: 0,
    createdBy: 'Abhijeet Tiwari',
    createdOn: '2025/12/02 11:13:44 AM',
  },
  {
    id: '2',
    deploymentId: 'ADR-006',
    deploymentName: 'Test2',
    description: 'Test deployment 2',
    deploymentType: 'install',
    selectionType: 'application',
    selectedItems: ['2'],
    scope: 'all',
    deploymentPolicy: 'policy-1',
    retryCount: 1,
    notifyTo: 'admin',
    stage: 'COMPLETED',
    pending: 0,
    succeeded: 1,
    failed: 0,
    createdBy: 'Abhijeet Tiwari',
    createdOn: '2025/12/02 11:11:07 AM',
  },
  {
    id: '3',
    deploymentId: 'ADR-005',
    deploymentName: 'TEST1',
    description: 'Test deployment 1',
    deploymentType: 'install',
    selectionType: 'application',
    selectedItems: ['3'],
    scope: 'all',
    deploymentPolicy: 'policy-1',
    retryCount: 1,
    notifyTo: 'admin',
    stage: 'COMPLETED',
    pending: 0,
    succeeded: 1,
    failed: 0,
    createdBy: 'Abhijeet Tiwari',
    createdOn: '2025/12/01 12:00:31 PM',
  },
];

// Configuration Catalog
let mockConfigCatalog: ConfigCatalogItem[] = [
  {
    id: '1',
    configurationId: 'CFG-001',
    name: 'Turns off Automated Adobe Acrobat X Updater',
    description: 'Disables the automatic updates of Adobe Acrobat X',
    os: 'Windows',
    configurationType: 'command',
    architecture: 'x64',
    isRemediation: false,
    commandType: 'powershell',
    command: 'Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Adobe\\Acrobat\\10" -Name "UpdaterAuto" -Value 0',
    createdBy: 'Admin',
    createdOn: '2026/01/10 10:00:00 AM',
  },
  {
    id: '2',
    configurationId: 'CFG-002',
    name: 'Turns off Automated Adobe Acrobat XI Updater',
    description: 'Disables the automatic updates of Adobe Acrobat XI',
    os: 'Windows',
    configurationType: 'command',
    architecture: 'x64',
    isRemediation: false,
    commandType: 'powershell',
    command: 'Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Adobe\\Acrobat\\11" -Name "UpdaterAuto" -Value 0',
    createdBy: 'Admin',
    createdOn: '2026/01/09 09:30:00 AM',
  },
  {
    id: '3',
    configurationId: 'CFG-003',
    name: 'Disable USB Storage',
    description: 'Security policy to disable USB storage devices',
    os: 'Windows',
    configurationType: 'command',
    architecture: 'x64',
    isRemediation: false,
    commandType: 'powershell',
    command: 'Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\USBSTOR" -Name "Start" -Value 4',
    createdBy: 'Admin',
    createdOn: '2026/01/08 14:00:00 PM',
  },
];

// Configuration Bundles
let mockConfigBundles: ConfigBundle[] = [
  {
    id: 'cb1',
    bundleId: 'CBND-001',
    bundleName: 'Security Policies',
    os: 'Windows',
    description: 'Essential security configurations',
    configurations: ['1', '2', '3'],
    createdBy: 'Admin',
    createdOn: '2026/01/10 10:00:00 AM',
  },
  {
    id: 'cb2',
    bundleId: 'CBND-002',
    bundleName: 'Update Policies',
    os: 'Windows',
    description: 'Update management configurations',
    configurations: ['1', '2'],
    createdBy: 'Admin',
    createdOn: '2026/01/09 09:30:00 AM',
  },
];

// Configuration Deployments
let mockConfigDeployments: ConfigDeployment[] = [
  {
    id: '1',
    deploymentId: 'CDR-003',
    deploymentName: 'Security Config Deployment',
    description: 'Deploy security configurations to all endpoints',
    selectionType: 'configuration',
    selectedItems: ['1', '2'],
    scope: 'all',
    deploymentPolicy: 'policy-1',
    retryCount: 1,
    notifyTo: 'admin',
    stage: 'COMPLETED',
    pending: 0,
    succeeded: 15,
    failed: 0,
    createdBy: 'Admin',
    createdOn: '2025/12/01 10:00:00 AM',
  },
];

// Deployment Policies
let mockDeploymentPolicies: DeploymentPolicy[] = [
  {
    id: '1',
    policyId: 'DPOL-001',
    name: 'Immediate Deploy',
    description: 'Deploy immediately without scheduling',
    type: 'INSTANT',
    supportedModule: 'All',
    relatedType: 'No Relation',
    createdBy: 'Admin',
    createdOn: '2026/01/01 10:00:00 AM',
  },
  {
    id: '2',
    policyId: 'DPOL-002',
    name: 'Maintenance Window',
    description: 'Deploy during maintenance window (2-5 AM)',
    type: 'SCHEDULE',
    supportedModule: 'Patch',
    relatedType: 'Critical',
    createdBy: 'Admin',
    createdOn: '2026/01/01 10:00:00 AM',
  },
  {
    id: '3',
    policyId: 'DPOL-003',
    name: 'Weekend Deploy',
    description: 'Deploy on weekends only',
    type: 'SCHEDULE',
    supportedModule: 'All',
    relatedType: 'Optional',
    createdBy: 'Admin',
    createdOn: '2026/01/01 10:00:00 AM',
  },
];

// Deployment Tasks
const mockDeploymentTasks: Record<string, DeploymentTask[]> = {
  'ADR-007': [
    {
      id: 62,
      deploymentId: 'ADR-007',
      endpoint: { name: 'K TightVNC', os: 'Windows', status: 'Online' },
      name: 'TightVNC Installation',
      status: 'SUCCESS',
      createdBy: 'Abhijeet Tiwari',
      lastUpdated: '2025/12/02 11:13:56 AM',
      createdOn: '2025/12/02 11:13:44 AM',
    },
  ],
  'ADR-006': [
    {
      id: 61,
      deploymentId: 'ADR-006',
      endpoint: { name: 'Ubuntu-Dev', os: 'Ubuntu', status: 'Online' },
      name: 'Google Chrome Installation',
      status: 'SUCCESS',
      createdBy: 'Abhijeet Tiwari',
      lastUpdated: '2025/12/02 11:12:07 AM',
      createdOn: '2025/12/02 11:11:07 AM',
    },
  ],
  'CDR-003': [
    {
      id: 70,
      deploymentId: 'CDR-003',
      endpoint: { name: 'DESKTOP-001', os: 'Windows', status: 'Online' },
      name: 'Adobe Acrobat Updater Disable',
      status: 'SUCCESS',
      createdBy: 'Admin',
      lastUpdated: '2025/12/01 10:05:00 AM',
      createdOn: '2025/12/01 10:00:00 AM',
    },
  ],
};

// Helper function to generate ID
const generateId = () => Math.random().toString(36).substring(2, 15);
const generateDisplayId = (prefix: string, items: { id: string }[]) =>
  `${prefix}-${String(items.length + 1).padStart(3, '0')}`;

const formatDate = (date: Date = new Date()) => {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).replace(',', '');
};

// ============ Handlers ============

export const jobsHandlers = [
  // ============ Patch Jobs ============

  // GET /v1/jobs/patch - List patch jobs
  http.get('/v1/jobs/patch', async () => {
    await delay(300);
    return HttpResponse.json({
      data: mockPatchJobs,
      total: mockPatchJobs.length,
    });
  }),

  // POST /v1/jobs/patch - Create patch job
  http.post('/v1/jobs/patch', async ({ request }) => {
    await delay(300);
    const body = await request.json() as Partial<PatchJob>;

    const newJob: PatchJob = {
      id: generateId(),
      policyId: generateDisplayId('POLICY', mockPatchJobs),
      name: body.name || 'New Patch Job',
      description: body.description || '',
      type: body.type || 'SCHEDULE',
      configType: body.configType || 'INSTALL',
      scope: body.scope || 'Global',
      endpoints: body.endpoints,
      patches: body.patches || [],
      deploymentPolicy: body.deploymentPolicy || '',
      retryCount: body.retryCount || 1,
      batchSize: body.batchSize,
      notifyTo: body.notifyTo,
      createdBy: 'Admin',
      createdOn: formatDate(),
    };

    mockPatchJobs.unshift(newJob);

    return HttpResponse.json(newJob, { status: 201 });
  }),

  // GET /v1/jobs/patch/:id - Get patch job details
  http.get('/v1/jobs/patch/:id', async ({ params }) => {
    await delay(200);
    const job = mockPatchJobs.find(j => j.id === params.id || j.policyId === params.id);

    if (!job) {
      return HttpResponse.json({ error: 'Patch job not found' }, { status: 404 });
    }

    return HttpResponse.json(job);
  }),

  // DELETE /v1/jobs/patch/:id - Delete patch job
  http.delete('/v1/jobs/patch/:id', async ({ params }) => {
    await delay(200);
    const index = mockPatchJobs.findIndex(j => j.id === params.id || j.policyId === params.id);

    if (index === -1) {
      return HttpResponse.json({ error: 'Patch job not found' }, { status: 404 });
    }

    mockPatchJobs.splice(index, 1);
    return HttpResponse.json({ message: 'Patch job deleted successfully' });
  }),

  // ============ Vulnerability Jobs ============

  // GET /v1/jobs/vulnerability - List vulnerability jobs
  http.get('/v1/jobs/vulnerability', async () => {
    await delay(300);
    return HttpResponse.json({
      data: mockVulnerabilityJobs,
      total: mockVulnerabilityJobs.length,
    });
  }),

  // POST /v1/jobs/vulnerability - Create vulnerability job
  http.post('/v1/jobs/vulnerability', async ({ request }) => {
    await delay(300);
    const body = await request.json() as Partial<VulnerabilityJob>;

    const newJob: VulnerabilityJob = {
      id: generateId(),
      jobId: generateDisplayId('VULN-JOB', mockVulnerabilityJobs),
      name: body.name || 'New Vulnerability Scan',
      description: body.description || '',
      scope: body.scope || 'Global',
      endpoints: body.endpoints,
      scanType: body.scanType || 'instant',
      scheduleDate: body.scheduleDate,
      scheduleTime: body.scheduleTime,
      recurrence: body.recurrence,
      status: body.scanType === 'instant' ? 'RUNNING' : 'SCHEDULED',
      scheduledTime: body.scheduleTime,
      nextRun: body.scheduleDate && body.scheduleTime
        ? `${body.scheduleDate} ${body.scheduleTime}`
        : undefined,
      createdBy: 'Admin',
      createdOn: formatDate(),
    };

    mockVulnerabilityJobs.unshift(newJob);

    return HttpResponse.json(newJob, { status: 201 });
  }),

  // GET /v1/jobs/vulnerability/:id - Get vulnerability job details
  http.get('/v1/jobs/vulnerability/:id', async ({ params }) => {
    await delay(200);
    const job = mockVulnerabilityJobs.find(j => j.id === params.id || j.jobId === params.id);

    if (!job) {
      return HttpResponse.json({ error: 'Vulnerability job not found' }, { status: 404 });
    }

    return HttpResponse.json(job);
  }),

  // DELETE /v1/jobs/vulnerability/:id - Delete vulnerability job
  http.delete('/v1/jobs/vulnerability/:id', async ({ params }) => {
    await delay(200);
    const index = mockVulnerabilityJobs.findIndex(j => j.id === params.id || j.jobId === params.id);

    if (index === -1) {
      return HttpResponse.json({ error: 'Vulnerability job not found' }, { status: 404 });
    }

    mockVulnerabilityJobs.splice(index, 1);
    return HttpResponse.json({ message: 'Vulnerability job deleted successfully' });
  }),

  // GET /v1/jobs/vulnerability/db-sync - Get DB sync config
  http.get('/v1/jobs/vulnerability/db-sync', async () => {
    await delay(200);
    return HttpResponse.json(mockVulnerabilityDBSync);
  }),

  // PUT /v1/jobs/vulnerability/db-sync - Update DB sync config
  http.put('/v1/jobs/vulnerability/db-sync', async ({ request }) => {
    await delay(300);
    const body = await request.json() as Partial<VulnerabilityDBSync>;

    mockVulnerabilityDBSync = {
      ...mockVulnerabilityDBSync,
      ...body,
    };

    return HttpResponse.json({
      message: 'DB sync config updated successfully',
      ...mockVulnerabilityDBSync,
    });
  }),

  // POST /v1/jobs/vulnerability/db-sync/now - Trigger immediate sync
  http.post('/v1/jobs/vulnerability/db-sync/now', async () => {
    await delay(2000); // Simulate sync time

    mockVulnerabilityDBSync.lastSync = formatDate();
    mockVulnerabilityDBSync.totalCVE += Math.floor(Math.random() * 100); // Simulate new CVEs

    return HttpResponse.json({
      message: 'Database sync initiated',
      jobId: `sync-${generateId()}`,
    }, { status: 202 });
  }),

  // ============ Software Catalog ============

  // GET /v1/jobs/software/catalog - List software catalog
  http.get('/v1/jobs/software/catalog', async () => {
    await delay(300);
    return HttpResponse.json({
      data: mockSoftwareCatalog,
      total: mockSoftwareCatalog.length,
    });
  }),

  // POST /v1/jobs/software/catalog - Create software entry
  http.post('/v1/jobs/software/catalog', async ({ request }) => {
    await delay(300);
    const body = await request.json() as Partial<SoftwareCatalogItem>;

    const newItem: SoftwareCatalogItem = {
      id: generateId(),
      deploymentId: generateDisplayId('SWP', mockSoftwareCatalog),
      applicationName: body.applicationName || 'New Application',
      description: body.description || '',
      tags: body.tags,
      os: body.os || 'Windows',
      version: body.version || 'latest',
      applicationLocationType: body.applicationLocationType || 'URL',
      installationCommand: body.installationCommand,
      uninstallationCommand: body.uninstallationCommand,
      upgradeCommand: body.upgradeCommand,
      iconUrl: body.iconUrl,
      selfService: body.selfService ?? true,
      architecture: body.architecture || 'x64',
      applicationType: body.applicationType || 'EXE',
      applicationFileUrl: body.applicationFileUrl,
      createdBy: 'Admin',
      createdOn: formatDate(),
    };

    mockSoftwareCatalog.unshift(newItem);

    return HttpResponse.json(newItem, { status: 201 });
  }),

  // PUT /v1/jobs/software/catalog/:id - Update software entry
  http.put('/v1/jobs/software/catalog/:id', async ({ params, request }) => {
    await delay(300);
    const body = await request.json() as Partial<SoftwareCatalogItem>;
    const index = mockSoftwareCatalog.findIndex(i => i.id === params.id || i.deploymentId === params.id);

    if (index === -1) {
      return HttpResponse.json({ error: 'Software not found' }, { status: 404 });
    }

    mockSoftwareCatalog[index] = {
      ...mockSoftwareCatalog[index],
      ...body,
    };

    return HttpResponse.json(mockSoftwareCatalog[index]);
  }),

  // DELETE /v1/jobs/software/catalog/:id - Delete software entry
  http.delete('/v1/jobs/software/catalog/:id', async ({ params }) => {
    await delay(200);
    const index = mockSoftwareCatalog.findIndex(i => i.id === params.id || i.deploymentId === params.id);

    if (index === -1) {
      return HttpResponse.json({ error: 'Software not found' }, { status: 404 });
    }

    mockSoftwareCatalog.splice(index, 1);
    return HttpResponse.json({ message: 'Software deleted successfully' });
  }),

  // ============ Software Bundles ============

  // GET /v1/jobs/software/bundles - List software bundles
  http.get('/v1/jobs/software/bundles', async () => {
    await delay(300);
    return HttpResponse.json({
      data: mockSoftwareBundles,
      total: mockSoftwareBundles.length,
    });
  }),

  // POST /v1/jobs/software/bundles - Create bundle
  http.post('/v1/jobs/software/bundles', async ({ request }) => {
    await delay(300);
    const body = await request.json() as Partial<SoftwareBundle>;

    const newBundle: SoftwareBundle = {
      id: generateId(),
      bundleId: generateDisplayId('BND', mockSoftwareBundles),
      bundleName: body.bundleName || 'New Bundle',
      os: body.os || 'Windows',
      description: body.description || '',
      applications: body.applications || [],
      createdBy: 'Admin',
      createdOn: formatDate(),
    };

    mockSoftwareBundles.unshift(newBundle);

    return HttpResponse.json(newBundle, { status: 201 });
  }),

  // PUT /v1/jobs/software/bundles/:id - Update bundle
  http.put('/v1/jobs/software/bundles/:id', async ({ params, request }) => {
    await delay(300);
    const body = await request.json() as Partial<SoftwareBundle>;
    const index = mockSoftwareBundles.findIndex(b => b.id === params.id || b.bundleId === params.id);

    if (index === -1) {
      return HttpResponse.json({ error: 'Bundle not found' }, { status: 404 });
    }

    mockSoftwareBundles[index] = {
      ...mockSoftwareBundles[index],
      ...body,
    };

    return HttpResponse.json(mockSoftwareBundles[index]);
  }),

  // DELETE /v1/jobs/software/bundles/:id - Delete bundle
  http.delete('/v1/jobs/software/bundles/:id', async ({ params }) => {
    await delay(200);
    const index = mockSoftwareBundles.findIndex(b => b.id === params.id || b.bundleId === params.id);

    if (index === -1) {
      return HttpResponse.json({ error: 'Bundle not found' }, { status: 404 });
    }

    mockSoftwareBundles.splice(index, 1);
    return HttpResponse.json({ message: 'Bundle deleted successfully' });
  }),

  // ============ Software Deployments ============

  // GET /v1/jobs/software/deployed - List software deployments
  http.get('/v1/jobs/software/deployed', async () => {
    await delay(300);
    return HttpResponse.json({
      data: mockSoftwareDeployments,
      total: mockSoftwareDeployments.length,
    });
  }),

  // POST /v1/jobs/software/deployed - Create deployment
  http.post('/v1/jobs/software/deployed', async ({ request }) => {
    await delay(300);
    const body = await request.json() as Partial<SoftwareDeployment>;

    const newDeployment: SoftwareDeployment = {
      id: generateId(),
      deploymentId: generateDisplayId('ADR', mockSoftwareDeployments),
      deploymentName: body.deploymentName || 'New Deployment',
      description: body.description || '',
      deploymentType: body.deploymentType || 'install',
      selectionType: body.selectionType || 'application',
      selectedItems: body.selectedItems || [],
      scope: body.scope || 'all',
      endpoints: body.endpoints,
      deploymentPolicy: body.deploymentPolicy || '',
      retryCount: body.retryCount || 1,
      notifyTo: body.notifyTo || 'admin',
      stage: 'IN_PROGRESS',
      pending: body.selectedItems?.length || 0,
      succeeded: 0,
      failed: 0,
      createdBy: 'Admin',
      createdOn: formatDate(),
    };

    mockSoftwareDeployments.unshift(newDeployment);

    return HttpResponse.json(newDeployment, { status: 201 });
  }),

  // GET /v1/jobs/software/deployed/:id/tasks - Get deployment tasks
  http.get('/v1/jobs/software/deployed/:id/tasks', async ({ params }) => {
    await delay(300);
    const deployment = mockSoftwareDeployments.find(
      d => d.id === params.id || d.deploymentId === params.id
    );

    if (!deployment) {
      return HttpResponse.json({ error: 'Deployment not found' }, { status: 404 });
    }

    const tasks = mockDeploymentTasks[deployment.deploymentId] || [];

    return HttpResponse.json({
      data: tasks,
      total: tasks.length,
    });
  }),

  // DELETE /v1/jobs/software/deployed/:id - Delete deployment
  http.delete('/v1/jobs/software/deployed/:id', async ({ params }) => {
    await delay(200);
    const index = mockSoftwareDeployments.findIndex(
      d => d.id === params.id || d.deploymentId === params.id
    );

    if (index === -1) {
      return HttpResponse.json({ error: 'Deployment not found' }, { status: 404 });
    }

    mockSoftwareDeployments.splice(index, 1);
    return HttpResponse.json({ message: 'Deployment deleted successfully' });
  }),

  // ============ Configuration Catalog ============

  // GET /v1/jobs/config/catalog - List config catalog
  http.get('/v1/jobs/config/catalog', async () => {
    await delay(300);
    return HttpResponse.json({
      data: mockConfigCatalog,
      total: mockConfigCatalog.length,
    });
  }),

  // POST /v1/jobs/config/catalog - Create config entry
  http.post('/v1/jobs/config/catalog', async ({ request }) => {
    await delay(300);
    const body = await request.json() as Partial<ConfigCatalogItem>;

    const newItem: ConfigCatalogItem = {
      id: generateId(),
      configurationId: generateDisplayId('CFG', mockConfigCatalog),
      name: body.name || 'New Configuration',
      os: body.os || 'Windows',
      description: body.description || '',
      tags: body.tags,
      configurationType: body.configurationType || 'command',
      architecture: body.architecture || 'x64',
      isRemediation: body.isRemediation ?? false,
      commandType: body.commandType || 'powershell',
      command: body.command || '',
      createdBy: 'Admin',
      createdOn: formatDate(),
    };

    mockConfigCatalog.unshift(newItem);

    return HttpResponse.json(newItem, { status: 201 });
  }),

  // PUT /v1/jobs/config/catalog/:id - Update config entry
  http.put('/v1/jobs/config/catalog/:id', async ({ params, request }) => {
    await delay(300);
    const body = await request.json() as Partial<ConfigCatalogItem>;
    const index = mockConfigCatalog.findIndex(
      i => i.id === params.id || i.configurationId === params.id
    );

    if (index === -1) {
      return HttpResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    mockConfigCatalog[index] = {
      ...mockConfigCatalog[index],
      ...body,
    };

    return HttpResponse.json(mockConfigCatalog[index]);
  }),

  // DELETE /v1/jobs/config/catalog/:id - Delete config entry
  http.delete('/v1/jobs/config/catalog/:id', async ({ params }) => {
    await delay(200);
    const index = mockConfigCatalog.findIndex(
      i => i.id === params.id || i.configurationId === params.id
    );

    if (index === -1) {
      return HttpResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    mockConfigCatalog.splice(index, 1);
    return HttpResponse.json({ message: 'Configuration deleted successfully' });
  }),

  // ============ Configuration Bundles ============

  // GET /v1/jobs/config/bundles - List config bundles
  http.get('/v1/jobs/config/bundles', async () => {
    await delay(300);
    return HttpResponse.json({
      data: mockConfigBundles,
      total: mockConfigBundles.length,
    });
  }),

  // POST /v1/jobs/config/bundles - Create bundle
  http.post('/v1/jobs/config/bundles', async ({ request }) => {
    await delay(300);
    const body = await request.json() as Partial<ConfigBundle>;

    const newBundle: ConfigBundle = {
      id: generateId(),
      bundleId: generateDisplayId('CBND', mockConfigBundles),
      bundleName: body.bundleName || 'New Bundle',
      os: body.os || 'Windows',
      description: body.description || '',
      configurations: body.configurations || [],
      createdBy: 'Admin',
      createdOn: formatDate(),
    };

    mockConfigBundles.unshift(newBundle);

    return HttpResponse.json(newBundle, { status: 201 });
  }),

  // PUT /v1/jobs/config/bundles/:id - Update bundle
  http.put('/v1/jobs/config/bundles/:id', async ({ params, request }) => {
    await delay(300);
    const body = await request.json() as Partial<ConfigBundle>;
    const index = mockConfigBundles.findIndex(b => b.id === params.id || b.bundleId === params.id);

    if (index === -1) {
      return HttpResponse.json({ error: 'Bundle not found' }, { status: 404 });
    }

    mockConfigBundles[index] = {
      ...mockConfigBundles[index],
      ...body,
    };

    return HttpResponse.json(mockConfigBundles[index]);
  }),

  // DELETE /v1/jobs/config/bundles/:id - Delete bundle
  http.delete('/v1/jobs/config/bundles/:id', async ({ params }) => {
    await delay(200);
    const index = mockConfigBundles.findIndex(b => b.id === params.id || b.bundleId === params.id);

    if (index === -1) {
      return HttpResponse.json({ error: 'Bundle not found' }, { status: 404 });
    }

    mockConfigBundles.splice(index, 1);
    return HttpResponse.json({ message: 'Bundle deleted successfully' });
  }),

  // ============ Configuration Deployments ============

  // GET /v1/jobs/config/deployed - List config deployments
  http.get('/v1/jobs/config/deployed', async () => {
    await delay(300);
    return HttpResponse.json({
      data: mockConfigDeployments,
      total: mockConfigDeployments.length,
    });
  }),

  // POST /v1/jobs/config/deployed - Create deployment
  http.post('/v1/jobs/config/deployed', async ({ request }) => {
    await delay(300);
    const body = await request.json() as Partial<ConfigDeployment>;

    const newDeployment: ConfigDeployment = {
      id: generateId(),
      deploymentId: generateDisplayId('CDR', mockConfigDeployments),
      deploymentName: body.deploymentName || 'New Deployment',
      description: body.description || '',
      selectionType: body.selectionType || 'configuration',
      selectedItems: body.selectedItems || [],
      scope: body.scope || 'all',
      endpoints: body.endpoints,
      deploymentPolicy: body.deploymentPolicy || '',
      retryCount: body.retryCount || 1,
      notifyTo: body.notifyTo || 'admin',
      stage: 'IN_PROGRESS',
      pending: body.selectedItems?.length || 0,
      succeeded: 0,
      failed: 0,
      createdBy: 'Admin',
      createdOn: formatDate(),
    };

    mockConfigDeployments.unshift(newDeployment);

    return HttpResponse.json(newDeployment, { status: 201 });
  }),

  // GET /v1/jobs/config/deployed/:id/tasks - Get deployment tasks
  http.get('/v1/jobs/config/deployed/:id/tasks', async ({ params }) => {
    await delay(300);
    const deployment = mockConfigDeployments.find(
      d => d.id === params.id || d.deploymentId === params.id
    );

    if (!deployment) {
      return HttpResponse.json({ error: 'Deployment not found' }, { status: 404 });
    }

    const tasks = mockDeploymentTasks[deployment.deploymentId] || [];

    return HttpResponse.json({
      data: tasks,
      total: tasks.length,
    });
  }),

  // DELETE /v1/jobs/config/deployed/:id - Delete deployment
  http.delete('/v1/jobs/config/deployed/:id', async ({ params }) => {
    await delay(200);
    const index = mockConfigDeployments.findIndex(
      d => d.id === params.id || d.deploymentId === params.id
    );

    if (index === -1) {
      return HttpResponse.json({ error: 'Deployment not found' }, { status: 404 });
    }

    mockConfigDeployments.splice(index, 1);
    return HttpResponse.json({ message: 'Deployment deleted successfully' });
  }),

  // ============ Deployment Policies ============

  // GET /v1/deployment-policies - List policies
  http.get('/v1/deployment-policies', async () => {
    await delay(300);
    return HttpResponse.json({
      data: mockDeploymentPolicies,
      total: mockDeploymentPolicies.length,
    });
  }),

  // POST /v1/deployment-policies - Create policy
  http.post('/v1/deployment-policies', async ({ request }) => {
    await delay(300);
    const body = await request.json() as Partial<DeploymentPolicy>;

    const newPolicy: DeploymentPolicy = {
      id: generateId(),
      policyId: generateDisplayId('DPOL', mockDeploymentPolicies),
      name: body.name || 'New Policy',
      description: body.description || '',
      type: body.type || 'INSTANT',
      supportedModule: body.supportedModule || 'All',
      relatedType: body.relatedType || 'No Relation',
      createdBy: 'Admin',
      createdOn: formatDate(),
    };

    mockDeploymentPolicies.unshift(newPolicy);

    return HttpResponse.json(newPolicy, { status: 201 });
  }),

  // PUT /v1/deployment-policies/:id - Update policy
  http.put('/v1/deployment-policies/:id', async ({ params, request }) => {
    await delay(300);
    const body = await request.json() as Partial<DeploymentPolicy>;
    const index = mockDeploymentPolicies.findIndex(
      p => p.id === params.id || p.policyId === params.id
    );

    if (index === -1) {
      return HttpResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    mockDeploymentPolicies[index] = {
      ...mockDeploymentPolicies[index],
      ...body,
    };

    return HttpResponse.json(mockDeploymentPolicies[index]);
  }),

  // DELETE /v1/deployment-policies/:id - Delete policy
  http.delete('/v1/deployment-policies/:id', async ({ params }) => {
    await delay(200);
    const index = mockDeploymentPolicies.findIndex(
      p => p.id === params.id || p.policyId === params.id
    );

    if (index === -1) {
      return HttpResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    mockDeploymentPolicies.splice(index, 1);
    return HttpResponse.json({ message: 'Policy deleted successfully' });
  }),
];
