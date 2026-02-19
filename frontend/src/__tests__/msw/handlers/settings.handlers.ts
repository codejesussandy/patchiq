import { http, HttpResponse } from 'msw';

const mockOrganizations = [
  { id: 'org-1', name: 'Global Org', description: 'Default organization', isDefault: true, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'org-2', name: 'Branch Office', description: 'Secondary', isDefault: false, createdAt: '2024-02-01T00:00:00Z' },
];

const mockLocations = [
  { id: 'loc-1', name: 'HQ', description: 'Headquarters', organizationId: 'org-1', organizationName: 'Global Org', isDefault: true, usersCount: 5, departmentsCount: 2, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'loc-2', name: 'Remote Office', description: 'Remote', organizationId: 'org-2', organizationName: 'Branch Office', isDefault: false, usersCount: 2, departmentsCount: 1, createdAt: '2024-03-01T00:00:00Z' },
];

const mockDepartments = [
  { id: 'dept-1', name: 'Engineering', description: 'Dev team', organizationId: 'org-1', organizationName: 'Global Org', createdAt: '2024-01-01T00:00:00Z' },
  { id: 'dept-2', name: 'Operations', description: 'Ops team', organizationId: 'org-1', organizationName: 'Global Org', createdAt: '2024-02-01T00:00:00Z' },
];

const mockUsers = [
  { id: 'user-1', firstName: 'John', lastName: 'Doe', email: 'john@patchiq.io', phone: '555-0101', status: 'ACTIVE', organizationId: 'org-1', organizationName: 'Global Org', departmentId: 'dept-1', departmentName: 'Engineering', roleId: 'role-1', roleName: 'Admin', branchId: 'loc-1', branchName: 'HQ', loginAllowed: true, endpointAssignmentAllowed: true, createdAt: '2024-01-01T00:00:00Z', isSuperAdmin: false, isSystem: false },
  { id: 'user-2', firstName: 'Jane', lastName: 'Smith', email: 'jane@patchiq.io', phone: '555-0102', status: 'ACTIVE', organizationId: 'org-1', organizationName: 'Global Org', departmentId: 'dept-2', departmentName: 'Operations', roleId: 'role-2', roleName: 'Viewer', branchId: 'loc-1', branchName: 'HQ', loginAllowed: true, endpointAssignmentAllowed: false, createdAt: '2024-02-01T00:00:00Z', isSuperAdmin: false, isSystem: false },
];

const mockRoles = [
  { id: 'role-1', name: 'Admin', description: 'Full access', isBuiltIn: true, permissions: { dashboard: { view: true, edit: true }, assets: { view: true, edit: true }, patches: { view: true, edit: true } }, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'role-2', name: 'Viewer', description: 'Read-only', isBuiltIn: true, permissions: { dashboard: { view: true, edit: false }, assets: { view: true, edit: false }, patches: { view: true, edit: false } }, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'role-3', name: 'Custom Role', description: 'Custom permissions', isBuiltIn: false, permissions: { dashboard: { view: true, edit: true }, assets: { view: true, edit: false } }, createdAt: '2024-03-01T00:00:00Z' },
];

const mockBranches = [
  { id: 'branch-1', name: 'Main Branch', description: 'Primary', createdAt: '2024-01-01T00:00:00Z' },
];

const mockMailServerConfig = { host: 'smtp.example.com', port: 587, username: 'admin', password: '***', encryption: 'TLS', fromEmail: 'noreply@patchiq.io', fromName: 'PatchIQ', enabled: true };

const mockProxyServerConfig = { host: 'proxy.example.com', port: 8080, username: 'proxy-user', password: '***', enabled: false, bypassList: ['localhost', '127.0.0.1'] };

const mockLDAPConfigs = [
  { id: 'ldap-1', name: 'Corporate LDAP', host: 'ldap.corp.com', port: 389, bindDN: 'cn=admin,dc=corp,dc=com', baseDN: 'dc=corp,dc=com', enabled: true, createdAt: '2024-01-01T00:00:00Z' },
];

const mockRiskScore = { criticalWeight: 40, highWeight: 30, mediumWeight: 20, lowWeight: 10 };

const mockRemoteDesktopSettings = { enabled: true, port: 3389, protocol: 'RDP', maxSessions: 5 };

const mockServerSettings = { serverUrl: 'https://patchiq.example.com', serverPort: 443, autoUpdate: true };

const mockIntegrations = [
  { id: 'int-1', name: 'Slack', type: 'NOTIFICATION', status: true, config: { webhookUrl: 'https://hooks.slack.com/test' }, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'int-2', name: 'Jira', type: 'TICKETING', status: false, config: { baseUrl: 'https://jira.example.com' }, createdAt: '2024-02-01T00:00:00Z' },
];

const mockAgentApprovalSettings = { approvalMode: 'AUTOMATIC', autoApproveNewAgents: true };

const mockVulnerabilityPreference = { scanEnabled: true, scanFrequency: 'DAILY', autoRemediate: false, severityThreshold: 'HIGH', lastSyncAt: '2024-06-01T00:00:00Z' };

const mockAgentConfiguration = { agentRefreshCycle: 60, systemResourcesRefreshCycle: 300, endpointVlanRefreshCycle: 3600, patchScanningRefreshCycle: 7200, softwareMeterRefreshCycle: 60, networkRefreshCycle: 30, allowedBandwidth: 100 };

const mockAgentApprovals = [
  { id: 'approval-1', hostname: 'new-server-01', ipAddress: '192.168.1.50', platform: 'WINDOWS', status: 'PENDING', requestedAt: '2024-06-01T00:00:00Z' },
  { id: 'approval-2', hostname: 'new-server-02', ipAddress: '192.168.1.51', platform: 'LINUX', status: 'APPROVED', requestedAt: '2024-05-01T00:00:00Z' },
];

const mockEnrollSecrets = [
  { id: 'secret-1', name: 'Production Key', secret: 'ENROLL-PROD-abc123', description: 'Production enrollment', expiresAt: '2025-12-31T00:00:00Z', createdAt: '2024-01-01T00:00:00Z' },
  { id: 'secret-2', name: 'Dev Key', secret: 'ENROLL-DEV-xyz789', description: 'Development enrollment', expiresAt: '2025-06-30T00:00:00Z', createdAt: '2024-03-01T00:00:00Z' },
];

const mockDeploymentPolicies = [
  { id: 'dp-1', name: 'Standard Policy', description: 'Default deployment policy', schedule: 'IMMEDIATE', rebootPolicy: 'IF_REQUIRED', maintenanceWindow: null, enabled: true, createdAt: '2024-01-01T00:00:00Z' },
];

const mockComputerGroups = [
  { id: 'cg-1', name: 'All Servers', description: 'All server endpoints', endpointIds: ['asset-1'], endpointCount: 1, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'cg-2', name: 'Windows Workstations', description: 'All Windows workstations', endpointIds: ['asset-2'], endpointCount: 1, createdAt: '2024-02-01T00:00:00Z' },
];

const mockAvailableEndpoints = [
  { id: 'asset-1', name: 'Server-01', hostname: 'srv-01.local', ipAddress: '192.168.1.10', osType: 'WINDOWS' },
  { id: 'asset-2', name: 'Workstation-01', hostname: 'ws-01.local', ipAddress: '192.168.1.20', osType: 'LINUX' },
];

const mockPatchPreference = { autoDownload: true, autoApprove: false, patchSources: ['MICROSOFT', 'LINUX'], excludedKBs: [], lastSyncAt: '2024-06-01T00:00:00Z' };

const mockAuditLogs = [
  { id: 'audit-1', resource: 'users', action: 'CREATE', userEmail: 'admin@patchiq.io', details: 'Created user john@patchiq.io', timestamp: '2024-06-01T10:00:00Z', resourceId: 'user-1' },
  { id: 'audit-2', resource: 'settings', action: 'UPDATE', userEmail: 'admin@patchiq.io', details: 'Updated mail server configuration', timestamp: '2024-06-01T09:00:00Z', resourceId: null },
];

const mockAuditFilterOptions = { resources: ['users', 'settings', 'assets', 'patches'], actions: ['CREATE', 'UPDATE', 'DELETE'], users: ['admin@patchiq.io', 'jane@patchiq.io'] };

const mockPlatformLicense = { id: 'lic-1', licenseKey: 'XXXX-XXXX-XXXX', status: 'ACTIVE', type: 'ENTERPRISE', maxEndpoints: 1000, usedEndpoints: 150, expiresAt: '2025-12-31T00:00:00Z', features: ['patch-management', 'vulnerability-scanning', 'remote-desktop'] };

const mockDistributionServers = [
  { id: 'ds-1', name: 'Primary DS', host: 'ds1.patchiq.local', port: 8443, status: 'ONLINE', endpointsServed: 50, createdAt: '2024-01-01T00:00:00Z' },
];

const mockPolicies = [
  { id: 'policy-1', name: 'Critical Alert', description: 'Alert on critical events', type: 'THRESHOLD', severity: 'CRITICAL', enabled: true, conditions: { metric: 'cpu_usage', operator: '>', value: 90 }, actions: ['email', 'slack'], createdAt: '2024-01-01T00:00:00Z' },
];

const mockBrandingSettings = { logoUrl: '/logo.png', primaryColor: '#1890ff', companyName: 'PatchIQ Inc.' };

const mockVendorLogos = [
  { id: 'vl-1', name: 'Vendor Logo 1', fileName: 'vendor1.png', fileUrl: '/uploads/vendor1.png', createdAt: '2024-01-01T00:00:00Z' },
];

const mockRedHatNominations = [
  { id: 'rh-1', hostname: 'rhel-server-01', platform: 'LINUX', subscriptionId: 'SUB-001', status: 'NOMINATED', createdAt: '2024-01-01T00:00:00Z' },
];

const mockNotificationPreferences = { agentInApp: true, agentEmail: false, deploymentInApp: true, deploymentEmail: true, vulnerabilityInApp: true, vulnerabilityEmail: false, alertInApp: true, alertEmail: true, systemInApp: true, systemEmail: false };

const mockPasswordPolicy = { minLength: 8, requireUppercase: true, requireLowercase: true, requireNumbers: true, requireSpecial: true, maxAge: 90, historyCount: 5 };

export const settingsHandlers = [
  // Organizations
  http.get('*/settings/organizations', () => {
    return HttpResponse.json({ success: true, data: { data: mockOrganizations, total: mockOrganizations.length, page: 1, limit: 20, totalPages: 1 } });
  }),
  http.post('*/settings/organizations', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: 'org-new', ...body, createdAt: new Date().toISOString() } });
  }),
  http.put('*/settings/organizations/:id', async ({ params, request }) => {
    const body = await request.json();
    const org = mockOrganizations.find(o => o.id === params.id);
    return HttpResponse.json({ success: true, data: { ...org, ...body } });
  }),
  http.delete('*/settings/organizations/:id', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  // Locations
  http.get('*/settings/locations', () => {
    return HttpResponse.json({ success: true, data: { data: mockLocations, total: mockLocations.length, page: 1, limit: 20, totalPages: 1 } });
  }),
  http.post('*/settings/locations', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: 'loc-new', ...body, createdAt: new Date().toISOString() } });
  }),
  http.put('*/settings/locations/:id', async ({ params, request }) => {
    const body = await request.json();
    const loc = mockLocations.find(l => l.id === params.id);
    return HttpResponse.json({ success: true, data: { ...loc, ...body } });
  }),
  http.delete('*/settings/locations/:id', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  // Departments
  http.get('*/settings/departments', () => {
    return HttpResponse.json({ success: true, data: { data: mockDepartments, total: mockDepartments.length, page: 1, limit: 20, totalPages: 1 } });
  }),
  http.post('*/settings/departments', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: 'dept-new', ...body, createdAt: new Date().toISOString() } });
  }),
  http.put('*/settings/departments/:id', async ({ params, request }) => {
    const body = await request.json();
    const dept = mockDepartments.find(d => d.id === params.id);
    return HttpResponse.json({ success: true, data: { ...dept, ...body } });
  }),
  http.delete('*/settings/departments/:id', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  // Users - specific sub-paths first, then parameterized
  http.post('*/settings/users/invite', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { message: 'Invitation sent', ...body } });
  }),
  http.get('*/settings/users/:id/audit-log', ({ params }) => {
    return HttpResponse.json({ success: true, data: [{ id: 'audit-u-1', action: 'CREATED', timestamp: '2024-01-01T00:00:00Z', user: 'admin' }] });
  }),
  http.post('*/settings/users/:id/reset-password', () => {
    return HttpResponse.json({ success: true, data: { message: 'Password reset email sent' } });
  }),
  http.post('*/settings/users/:id/suspend', () => {
    return HttpResponse.json({ success: true, data: { message: 'User suspended' } });
  }),
  http.get('*/settings/users', () => {
    return HttpResponse.json({ success: true, data: { data: mockUsers, total: mockUsers.length, page: 1, limit: 20, totalPages: 1 } });
  }),
  http.get('*/settings/users/:id', ({ params }) => {
    const user = mockUsers.find(u => u.id === params.id);
    if (!user) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, { status: 404 });
    return HttpResponse.json({ success: true, data: user });
  }),
  http.post('*/settings/users', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: 'user-new', ...body, createdAt: new Date().toISOString() } });
  }),
  http.put('*/settings/users/:id', async ({ params, request }) => {
    const body = await request.json();
    const user = mockUsers.find(u => u.id === params.id);
    return HttpResponse.json({ success: true, data: { ...user, ...body } });
  }),
  http.delete('*/settings/users/:id', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  // Roles
  http.get('*/settings/roles', () => {
    return HttpResponse.json({ success: true, data: { data: mockRoles, total: mockRoles.length, page: 1, limit: 20, totalPages: 1 } });
  }),
  http.get('*/settings/roles/:id', ({ params }) => {
    const role = mockRoles.find(r => r.id === params.id);
    if (!role) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Role not found' } }, { status: 404 });
    return HttpResponse.json({ success: true, data: role });
  }),
  http.post('*/settings/roles', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: 'role-new', ...body, createdAt: new Date().toISOString() } });
  }),
  http.put('*/settings/roles/:id', async ({ params, request }) => {
    const body = await request.json();
    const role = mockRoles.find(r => r.id === params.id);
    return HttpResponse.json({ success: true, data: { ...role, ...body } });
  }),
  http.delete('*/settings/roles/:id', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  // Branches
  http.get('*/settings/branches', () => {
    return HttpResponse.json({ success: true, data: { data: mockBranches, total: mockBranches.length, page: 1, limit: 20, totalPages: 1 } });
  }),
  http.post('*/settings/branches', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: 'branch-new', ...body, createdAt: new Date().toISOString() } });
  }),
  http.put('*/settings/branches/:id', async ({ params, request }) => {
    const body = await request.json();
    const branch = mockBranches.find(b => b.id === params.id);
    return HttpResponse.json({ success: true, data: { ...branch, ...body } });
  }),
  http.delete('*/settings/branches/:id', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  // Alert Policies - specific sub-paths first
  http.post('*/settings/alerts/:id/clone', ({ params }) => {
    const policy = mockPolicies.find(p => p.id === params.id);
    return HttpResponse.json({ success: true, data: { ...policy, id: 'policy-clone', name: `${policy?.name} (Copy)` } });
  }),
  http.post('*/settings/alerts/:id/disable', () => {
    return HttpResponse.json({ success: true, data: { message: 'Policy disabled' } });
  }),
  http.get('*/settings/alerts/:id/affected-users', () => {
    return HttpResponse.json({ success: true, data: mockUsers });
  }),
  http.get('*/settings/alerts/:id/audit', () => {
    return HttpResponse.json({ success: true, data: [{ id: 'audit-p-1', action: 'CREATED', timestamp: '2024-01-01T00:00:00Z', user: 'admin' }] });
  }),
  http.get('*/settings/alerts', () => {
    return HttpResponse.json({ success: true, data: { data: mockPolicies, total: mockPolicies.length, page: 1, limit: 20, totalPages: 1 } });
  }),
  http.get('*/settings/alerts/:id', ({ params }) => {
    const policy = mockPolicies.find(p => p.id === params.id);
    if (!policy) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Policy not found' } }, { status: 404 });
    return HttpResponse.json({ success: true, data: policy });
  }),
  http.post('*/settings/alerts', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: 'policy-new', ...body, createdAt: new Date().toISOString() } });
  }),
  http.put('*/settings/alerts/:id', async ({ params, request }) => {
    const body = await request.json();
    const policy = mockPolicies.find(p => p.id === params.id);
    return HttpResponse.json({ success: true, data: { ...policy, ...body } });
  }),
  http.delete('*/settings/alerts/:id', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  // Branding
  http.get('*/settings/branding', () => {
    return HttpResponse.json({ success: true, data: mockBrandingSettings });
  }),
  http.post('*/settings/branding', () => {
    return HttpResponse.json({ success: true, data: mockBrandingSettings });
  }),

  // Vendor Logos
  http.get('*/settings/vendor-logos', () => {
    return HttpResponse.json({ success: true, data: { data: mockVendorLogos, total: mockVendorLogos.length, page: 1, limit: 20, totalPages: 1 } });
  }),
  http.get('*/settings/vendor-logos/:id', ({ params }) => {
    const logo = mockVendorLogos.find(v => v.id === params.id);
    if (!logo) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Vendor logo not found' } }, { status: 404 });
    return HttpResponse.json({ success: true, data: logo });
  }),
  http.post('*/settings/vendor-logos', () => {
    return HttpResponse.json({ success: true, data: { id: 'vl-new', name: 'New Logo', fileName: 'new.png', fileUrl: '/uploads/new.png', createdAt: new Date().toISOString() } });
  }),
  http.put('*/settings/vendor-logos/:id', async ({ params }) => {
    const logo = mockVendorLogos.find(v => v.id === params.id);
    return HttpResponse.json({ success: true, data: logo || mockVendorLogos[0] });
  }),
  http.delete('*/settings/vendor-logos/:id', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  // Mail Server
  http.get('*/settings/mail-server', () => {
    return HttpResponse.json({ success: true, data: mockMailServerConfig });
  }),
  http.put('*/settings/mail-server', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { ...mockMailServerConfig, ...body } });
  }),
  http.post('*/settings/mail-server/test', () => {
    return HttpResponse.json({ success: true, data: { message: 'Test email sent successfully', success: true } });
  }),

  // Proxy Server
  http.get('*/settings/proxy-server', () => {
    return HttpResponse.json({ success: true, data: mockProxyServerConfig });
  }),
  http.put('*/settings/proxy-server', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { ...mockProxyServerConfig, ...body } });
  }),
  http.post('*/settings/proxy-server/test', () => {
    return HttpResponse.json({ success: true, data: { message: 'Proxy connection successful', success: true } });
  }),

  // LDAP Configs
  http.get('*/settings/ldap-configs', () => {
    return HttpResponse.json({ success: true, data: { data: mockLDAPConfigs, total: mockLDAPConfigs.length, page: 1, limit: 20, totalPages: 1 } });
  }),
  http.get('*/settings/ldap-configs/:id', ({ params }) => {
    const config = mockLDAPConfigs.find(l => l.id === params.id);
    if (!config) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'LDAP config not found' } }, { status: 404 });
    return HttpResponse.json({ success: true, data: config });
  }),
  http.post('*/settings/ldap-configs', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: 'ldap-new', ...body, createdAt: new Date().toISOString() } });
  }),
  http.put('*/settings/ldap-configs/:id', async ({ params, request }) => {
    const body = await request.json();
    const config = mockLDAPConfigs.find(l => l.id === params.id);
    return HttpResponse.json({ success: true, data: { ...config, ...body } });
  }),
  http.delete('*/settings/ldap-configs/:id', () => {
    return HttpResponse.json({ success: true, data: null });
  }),
  http.post('*/settings/ldap-configs/:id/test', () => {
    return HttpResponse.json({ success: true, data: { message: 'LDAP connection successful', success: true } });
  }),

  // Risk Score
  http.get('*/settings/risk-score', () => {
    return HttpResponse.json({ success: true, data: mockRiskScore });
  }),
  http.put('*/settings/risk-score', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { ...mockRiskScore, ...body } });
  }),

  // Remote Desktop
  http.get('*/settings/remote-desktop', () => {
    return HttpResponse.json({ success: true, data: mockRemoteDesktopSettings });
  }),
  http.put('*/settings/remote-desktop', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { ...mockRemoteDesktopSettings, ...body } });
  }),
  http.post('*/settings/remote-desktop/reset', () => {
    return HttpResponse.json({ success: true, data: { message: 'Remote desktop settings reset' } });
  }),

  // Server Settings
  http.get('*/settings/server', () => {
    return HttpResponse.json({ success: true, data: mockServerSettings });
  }),
  http.put('*/settings/server', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { ...mockServerSettings, ...body } });
  }),

  // Integrations
  http.get('*/settings/integrations', () => {
    return HttpResponse.json({ success: true, data: { data: mockIntegrations, total: mockIntegrations.length, page: 1, limit: 20, totalPages: 1 } });
  }),
  http.get('*/settings/integrations/:id', ({ params }) => {
    const integration = mockIntegrations.find(i => i.id === params.id);
    if (!integration) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Integration not found' } }, { status: 404 });
    return HttpResponse.json({ success: true, data: integration });
  }),
  http.post('*/settings/integrations', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: 'int-new', ...body, createdAt: new Date().toISOString() } });
  }),
  http.put('*/settings/integrations/:id', async ({ params, request }) => {
    const body = await request.json();
    const integration = mockIntegrations.find(i => i.id === params.id);
    return HttpResponse.json({ success: true, data: { ...integration, ...body } });
  }),
  http.patch('*/settings/integrations/:id/status', async ({ params, request }) => {
    const body = await request.json();
    const integration = mockIntegrations.find(i => i.id === params.id);
    return HttpResponse.json({ success: true, data: { ...integration, status: body.status } });
  }),
  http.delete('*/settings/integrations/:id', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  // Agent Approval Settings
  http.get('*/settings/agent-approval', () => {
    return HttpResponse.json({ success: true, data: mockAgentApprovalSettings });
  }),
  http.put('*/settings/agent-approval', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { ...mockAgentApprovalSettings, ...body } });
  }),

  // Agent Configuration
  http.get('*/settings/agent-configuration', () => {
    return HttpResponse.json({ success: true, data: mockAgentConfiguration });
  }),
  http.put('*/settings/agent-configuration', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { ...mockAgentConfiguration, ...body } });
  }),

  // Agent Approvals
  http.get('*/settings/agent-approvals', () => {
    return HttpResponse.json({ success: true, data: { data: mockAgentApprovals, total: mockAgentApprovals.length, page: 1, limit: 20, totalPages: 1 } });
  }),
  http.post('*/settings/agent-approvals/:id/approve', ({ params }) => {
    const approval = mockAgentApprovals.find(a => a.id === params.id);
    return HttpResponse.json({ success: true, data: { ...approval, status: 'APPROVED' } });
  }),
  http.post('*/settings/agent-approvals/:id/reject', ({ params }) => {
    const approval = mockAgentApprovals.find(a => a.id === params.id);
    return HttpResponse.json({ success: true, data: { ...approval, status: 'REJECTED' } });
  }),

  // Enroll Secrets
  http.get('*/settings/enroll-secrets', () => {
    return HttpResponse.json({ success: true, data: { data: mockEnrollSecrets, total: mockEnrollSecrets.length, page: 1, limit: 20, totalPages: 1 } });
  }),
  http.get('*/settings/enroll-secrets/:id', ({ params }) => {
    const secret = mockEnrollSecrets.find(s => s.id === params.id);
    if (!secret) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Enroll secret not found' } }, { status: 404 });
    return HttpResponse.json({ success: true, data: secret });
  }),
  http.post('*/settings/enroll-secrets', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: 'secret-new', ...body, secret: 'ENROLL-NEW-secret', createdAt: new Date().toISOString() } });
  }),
  http.put('*/settings/enroll-secrets/:id', async ({ params, request }) => {
    const body = await request.json();
    const secret = mockEnrollSecrets.find(s => s.id === params.id);
    return HttpResponse.json({ success: true, data: { ...secret, ...body } });
  }),
  http.delete('*/settings/enroll-secrets/:id', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  // Deployment Policies
  http.get('*/settings/deployment-policies', () => {
    return HttpResponse.json({ success: true, data: { data: mockDeploymentPolicies, total: mockDeploymentPolicies.length, page: 1, limit: 20, totalPages: 1 } });
  }),
  http.get('*/settings/deployment-policies/:id', ({ params }) => {
    const policy = mockDeploymentPolicies.find(p => p.id === params.id);
    if (!policy) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Deployment policy not found' } }, { status: 404 });
    return HttpResponse.json({ success: true, data: policy });
  }),
  http.post('*/settings/deployment-policies', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: 'dp-new', ...body, createdAt: new Date().toISOString() } });
  }),
  http.put('*/settings/deployment-policies/:id', async ({ params, request }) => {
    const body = await request.json();
    const policy = mockDeploymentPolicies.find(p => p.id === params.id);
    return HttpResponse.json({ success: true, data: { ...policy, ...body } });
  }),
  http.delete('*/settings/deployment-policies/:id', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  // Red Hat Nominations
  http.get('*/settings/red-hat-nominations', () => {
    return HttpResponse.json({ success: true, data: { data: mockRedHatNominations, total: mockRedHatNominations.length, page: 1, limit: 20, totalPages: 1 } });
  }),
  http.get('*/settings/red-hat-nominations/:id', ({ params }) => {
    const nomination = mockRedHatNominations.find(r => r.id === params.id);
    if (!nomination) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Red Hat nomination not found' } }, { status: 404 });
    return HttpResponse.json({ success: true, data: nomination });
  }),
  http.put('*/settings/red-hat-nominations/:id', async ({ params, request }) => {
    const body = await request.json();
    const nomination = mockRedHatNominations.find(r => r.id === params.id);
    return HttpResponse.json({ success: true, data: { ...nomination, ...body } });
  }),

  // Computer Groups - available-endpoints must come before :id
  http.get('*/settings/computer-groups/available-endpoints', () => {
    return HttpResponse.json({ success: true, data: { data: mockAvailableEndpoints, total: mockAvailableEndpoints.length, page: 1, limit: 20, totalPages: 1 } });
  }),
  http.get('*/settings/computer-groups', () => {
    return HttpResponse.json({ success: true, data: { data: mockComputerGroups, total: mockComputerGroups.length, page: 1, limit: 20, totalPages: 1 } });
  }),
  http.get('*/settings/computer-groups/:id', ({ params }) => {
    const group = mockComputerGroups.find(g => g.id === params.id);
    if (!group) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Computer group not found' } }, { status: 404 });
    return HttpResponse.json({ success: true, data: group });
  }),
  http.post('*/settings/computer-groups', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: 'cg-new', ...body, endpointCount: 0, createdAt: new Date().toISOString() } });
  }),
  http.put('*/settings/computer-groups/:id', async ({ params, request }) => {
    const body = await request.json();
    const group = mockComputerGroups.find(g => g.id === params.id);
    return HttpResponse.json({ success: true, data: { ...group, ...body } });
  }),
  http.delete('*/settings/computer-groups/:id', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  // Vulnerability Preference
  http.get('*/settings/vulnerability-preference', () => {
    return HttpResponse.json({ success: true, data: mockVulnerabilityPreference });
  }),
  http.put('*/settings/vulnerability-preference', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { ...mockVulnerabilityPreference, ...body } });
  }),
  http.post('*/settings/vulnerability-preference/sync', () => {
    return HttpResponse.json({ success: true, data: { message: 'Vulnerability database sync initiated' } });
  }),

  // Patch Preferences
  http.get('*/settings/patch-preferences', () => {
    return HttpResponse.json({ success: true, data: mockPatchPreference });
  }),
  http.put('*/settings/patch-preferences', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { ...mockPatchPreference, ...body } });
  }),
  http.post('*/settings/patch-preferences/sync', () => {
    return HttpResponse.json({ success: true, data: { message: 'Patch sync initiated' } });
  }),

  // Audit
  http.get('*/settings/audit/filter-options', () => {
    return HttpResponse.json({ success: true, data: mockAuditFilterOptions });
  }),
  http.get('*/settings/audit', () => {
    return HttpResponse.json({ success: true, data: { data: mockAuditLogs, total: mockAuditLogs.length, page: 1, limit: 20, totalPages: 1 } });
  }),

  // Platform License
  http.get('*/settings/platform-license', () => {
    return HttpResponse.json({ success: true, data: mockPlatformLicense });
  }),
  http.put('*/settings/platform-license', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { ...mockPlatformLicense, ...body } });
  }),

  // Distribution Servers
  http.get('*/settings/distribution-servers', () => {
    return HttpResponse.json({ success: true, data: { data: mockDistributionServers, total: mockDistributionServers.length, page: 1, limit: 20, totalPages: 1 } });
  }),
  http.get('*/settings/distribution-servers/:id', ({ params }) => {
    const server = mockDistributionServers.find(d => d.id === params.id);
    if (!server) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Distribution server not found' } }, { status: 404 });
    return HttpResponse.json({ success: true, data: server });
  }),
  http.post('*/settings/distribution-servers', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { id: 'ds-new', ...body, status: 'ONLINE', endpointsServed: 0, createdAt: new Date().toISOString() } });
  }),
  http.put('*/settings/distribution-servers/:id', async ({ params, request }) => {
    const body = await request.json();
    const server = mockDistributionServers.find(d => d.id === params.id);
    return HttpResponse.json({ success: true, data: { ...server, ...body } });
  }),
  http.delete('*/settings/distribution-servers/:id', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  // Password Policy
  http.get('*/settings/password-policy', () => {
    return HttpResponse.json({ success: true, data: mockPasswordPolicy });
  }),
  http.put('*/settings/password-policy', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { ...mockPasswordPolicy, ...body } });
  }),

  // Notification Preferences (settings route)
  http.get('*/notifications/preferences', () => {
    return HttpResponse.json({ success: true, data: mockNotificationPreferences });
  }),
  http.put('*/notifications/preferences', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, data: { ...mockNotificationPreferences, ...body } });
  }),
];

export {
  mockOrganizations,
  mockLocations,
  mockDepartments,
  mockUsers,
  mockRoles,
  mockBranches,
  mockMailServerConfig,
  mockProxyServerConfig,
  mockLDAPConfigs,
  mockRiskScore,
  mockRemoteDesktopSettings,
  mockServerSettings,
  mockIntegrations,
  mockAgentApprovalSettings,
  mockVulnerabilityPreference,
  mockAgentConfiguration,
  mockAgentApprovals,
  mockEnrollSecrets,
  mockDeploymentPolicies,
  mockComputerGroups,
  mockAvailableEndpoints,
  mockPatchPreference,
  mockAuditLogs,
  mockAuditFilterOptions,
  mockPlatformLicense,
  mockDistributionServers,
  mockPolicies,
  mockBrandingSettings,
  mockVendorLogos,
  mockRedHatNominations,
  mockNotificationPreferences,
  mockPasswordPolicy,
};
