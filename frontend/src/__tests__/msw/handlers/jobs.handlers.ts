import { http, HttpResponse } from 'msw';

const mockConfigCatalog = [
  { id: 'cc-1', configurationId: 'CFG-001', name: 'Enable Firewall', os: 'Windows', description: 'Enable Windows firewall', tags: ['security'], configurationType: 'command', architecture: 'x64', isRemediation: false, commandType: 'powershell', command: 'Set-NetFirewallProfile -Enabled True', createdBy: 'admin', createdOn: '2024-01-10T00:00:00Z' },
  { id: 'cc-2', configurationId: 'CFG-002', name: 'Update Packages', os: 'Linux', description: 'Update all packages', tags: ['maintenance'], configurationType: 'command', architecture: 'x64', isRemediation: false, commandType: 'bash', command: 'apt-get update && apt-get upgrade -y', createdBy: 'admin', createdOn: '2024-02-15T00:00:00Z' },
];

const mockConfigBundles = [
  { id: 'cb-1', bundleId: 'BDL-001', bundleName: 'Security Hardening', name: 'Security Hardening', os: 'Windows', description: 'Security hardening bundle', configurations: ['cc-1'], configurationCount: 1, createdBy: 'admin', createdOn: '2024-01-15T00:00:00Z' },
];

const mockConfigDeployments = [
  { id: 'cd-1', deploymentId: 'DEP-001', name: 'Security Update Deployment', description: 'Deploy security configs', status: 'COMPLETED', pending: 0, succeeded: 5, failed: 0, createdBy: 'admin', createdOn: '2024-03-01T00:00:00Z' },
  { id: 'cd-2', deploymentId: 'DEP-002', name: 'Firewall Setup', description: 'Enable firewall on all machines', status: 'IN_PROGRESS', pending: 3, succeeded: 2, failed: 1, createdBy: 'admin', createdOn: '2024-03-10T00:00:00Z' },
];

const mockDeploymentPolicies = [
  { id: 'dp-1', policyId: 'POL-001', name: 'Maintenance Window Policy', description: 'Deploy during maintenance windows only', type: 'SCHEDULE', schedule: '0 2 * * 0', createdBy: 'admin', createdOn: '2024-01-05T00:00:00Z', createdAt: '2024-01-05T00:00:00Z' },
  { id: 'dp-2', policyId: 'POL-002', name: 'Immediate Deploy Policy', description: 'Deploy immediately', type: 'INSTANT', createdBy: 'admin', createdOn: '2024-02-01T00:00:00Z', createdAt: '2024-02-01T00:00:00Z' },
];

const mockVulnerabilityJobs = [
  { id: 'vj-1', jobId: 'VJOB-001', name: 'Weekly Vulnerability Scan', description: 'Scan all endpoints weekly', scope: 'GLOBAL', scanType: 'SCHEDULED', recurrence: 'WEEKLY', status: 'SCHEDULED', scheduledTime: '2024-04-01T02:00:00Z', lastRun: '2024-03-25T02:00:00Z', nextRun: '2024-04-01T02:00:00Z', result: { assetsScanned: 150, vulnerabilitiesFound: 45 }, createdBy: 'admin', createdOn: '2024-01-01T00:00:00Z' },
  { id: 'vj-2', jobId: 'VJOB-002', name: 'Ad-hoc Scan', description: 'One-time scan', scope: 'ENDPOINT', scanType: 'INSTANT', recurrence: 'ONCE', status: 'COMPLETED', lastRun: '2024-03-20T10:00:00Z', result: { assetsScanned: 10, vulnerabilitiesFound: 5 }, createdBy: 'analyst', createdOn: '2024-03-20T00:00:00Z' },
];

const mockPatchJobs = [
  { id: 'pj-1', policyId: 'POL-001', name: 'March Security Patches', description: 'Deploy March patches', type: 'SCHEDULE', status: 'COMPLETED', createdBy: 'admin', createdOn: '2024-03-01T00:00:00Z' },
];

const mockSoftwareDeployments = [
  { id: 'sd-1', deploymentId: 'SDEP-001', name: 'Chrome Update', description: 'Update Chrome to latest', type: 'INSTALL', status: 'COMPLETED', pending: 0, succeeded: 10, failed: 0, total: 10, progress: 100, createdBy: 'admin', createdAt: '2024-03-01T00:00:00Z', updatedAt: '2024-03-01T01:00:00Z' },
  { id: 'sd-2', deploymentId: 'SDEP-002', name: 'VS Code Install', description: 'Install VS Code', type: 'INSTALL', status: 'IN_PROGRESS', pending: 3, succeeded: 5, failed: 2, total: 10, progress: 50, createdBy: 'admin', createdAt: '2024-03-10T00:00:00Z', updatedAt: '2024-03-10T00:30:00Z' },
];

export const jobsHandlers = [
  // Config Catalog
  http.get('*/jobs/config/catalog', () => {
    return HttpResponse.json({ success: true, data: mockConfigCatalog, meta: { page: 1, limit: 20, total: mockConfigCatalog.length, totalPages: 1 } });
  }),
  http.get('*/jobs/config/catalog/:id', () => {
    return HttpResponse.json({ success: true, data: mockConfigCatalog[0] });
  }),
  http.post('*/jobs/config/catalog', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: 'cc-new', configurationId: 'CFG-NEW', ...body, createdBy: 'admin', createdOn: new Date().toISOString() } });
  }),
  http.put('*/jobs/config/catalog/:id', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { ...mockConfigCatalog[0], ...body } });
  }),
  http.delete('*/jobs/config/catalog/:id', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  // Config Bundles
  http.get('*/jobs/config/bundles', () => {
    return HttpResponse.json({ success: true, data: mockConfigBundles, meta: { page: 1, limit: 20, total: mockConfigBundles.length, totalPages: 1 } });
  }),
  http.get('*/jobs/config/bundles/:id', () => {
    return HttpResponse.json({ success: true, data: mockConfigBundles[0] });
  }),
  http.post('*/jobs/config/bundles', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: 'cb-new', bundleId: 'BDL-NEW', ...body, configurationCount: 0, createdBy: 'admin', createdOn: new Date().toISOString() } });
  }),
  http.put('*/jobs/config/bundles/:id', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { ...mockConfigBundles[0], ...body } });
  }),
  http.delete('*/jobs/config/bundles/:id', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  // Config Deployments
  http.get('*/jobs/config/deployed', () => {
    return HttpResponse.json({ success: true, data: mockConfigDeployments, meta: { page: 1, limit: 20, total: mockConfigDeployments.length, totalPages: 1 } });
  }),
  http.post('*/jobs/config/deployed', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: 'cd-new', deploymentId: 'DEP-NEW', ...body, status: 'PENDING', pending: 0, succeeded: 0, failed: 0, createdBy: 'admin' } });
  }),
  http.get('*/jobs/config/deployed/:id/tasks', () => {
    return HttpResponse.json({ success: true, data: { tasks: [{ id: 'task-1', agentId: 'agent-1', status: 'COMPLETED', output: 'Success' }] } });
  }),
  http.delete('*/jobs/config/deployed/:id', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  // Patch Jobs
  http.get('*/jobs/patch', () => {
    return HttpResponse.json({ success: true, data: mockPatchJobs, meta: { page: 1, limit: 20, total: mockPatchJobs.length, totalPages: 1 } });
  }),
  http.get('*/jobs/patch/:id', () => {
    return HttpResponse.json({ success: true, data: mockPatchJobs[0] });
  }),
  http.delete('*/jobs/patch/:id', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  // Deployment Policies
  http.get('*/deployment-policies', () => {
    return HttpResponse.json({ success: true, data: mockDeploymentPolicies, meta: { page: 1, limit: 20, total: mockDeploymentPolicies.length, totalPages: 1 } });
  }),
  http.get('*/deployment-policies/:id', () => {
    return HttpResponse.json({ success: true, data: mockDeploymentPolicies[0] });
  }),
  http.post('*/deployment-policies', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: 'dp-new', policyId: 'POL-NEW', ...body, createdBy: 'admin', createdOn: new Date().toISOString() } });
  }),
  http.put('*/deployment-policies/:id', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { ...mockDeploymentPolicies[0], ...body } });
  }),
  http.delete('*/deployment-policies/:id', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  // Vulnerability Jobs
  http.get('*/jobs/vulnerability', () => {
    return HttpResponse.json({ success: true, data: mockVulnerabilityJobs, meta: { page: 1, limit: 20, total: mockVulnerabilityJobs.length, totalPages: 1 } });
  }),
  http.get('*/jobs/vulnerability/:id', ({ params }) => {
    if (params.id === 'db-sync') return;
    return HttpResponse.json({ success: true, data: mockVulnerabilityJobs[0] });
  }),
  http.post('*/jobs/vulnerability', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: 'vj-new', jobId: 'VJOB-NEW', ...body, status: 'SCHEDULED', createdBy: 'admin', createdOn: new Date().toISOString() } });
  }),
  http.delete('*/jobs/vulnerability/:id', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  // Software Deployments
  http.get('*/jobs/software/deployed', () => {
    return HttpResponse.json({ success: true, data: mockSoftwareDeployments, meta: { page: 1, limit: 20, total: mockSoftwareDeployments.length, totalPages: 1 } });
  }),
  http.get('*/jobs/software/deployed/:id/tasks', () => {
    return HttpResponse.json({ success: true, data: { tasks: [{ id: 'st-1', agentId: 'agent-1', agentName: 'Server-01', packageName: 'Chrome', status: 'COMPLETED', startedAt: '2024-03-01T00:00:00Z', completedAt: '2024-03-01T00:05:00Z' }] } });
  }),

  // Software deployments via deployments/software endpoint
  http.get('*/deployments/software', () => {
    return HttpResponse.json({ success: true, data: mockSoftwareDeployments, meta: { page: 1, limit: 20, total: mockSoftwareDeployments.length, totalPages: 1 } });
  }),
  http.get('*/deployments/software/:id', () => {
    return HttpResponse.json({ success: true, data: { ...mockSoftwareDeployments[0], tasks: [{ id: 'st-1', agentId: 'agent-1', agentName: 'Server-01', packageName: 'Chrome', status: 'COMPLETED', startedAt: '2024-03-01T00:00:00Z', completedAt: '2024-03-01T00:05:00Z', createdAt: '2024-03-01T00:00:00Z', updatedAt: '2024-03-01T00:05:00Z' }] } });
  }),
  http.post('*/deployments/software', async () => {
    return HttpResponse.json({ success: true, data: { deploymentId: 'SDEP-NEW', tasksCreated: 3, commandsCreated: 3, status: 'PENDING' } });
  }),
  http.post('*/deployments/software/:id/cancel', () => {
    return HttpResponse.json({ success: true, data: null });
  }),
  http.post('*/deployments/software/:deploymentId/tasks/:taskId/rollback', () => {
    return HttpResponse.json({ success: true, data: { commandId: 'cmd-rb-1', status: 'PENDING' } });
  }),
];

export { mockConfigCatalog, mockConfigBundles, mockConfigDeployments, mockDeploymentPolicies, mockVulnerabilityJobs, mockPatchJobs, mockSoftwareDeployments };
