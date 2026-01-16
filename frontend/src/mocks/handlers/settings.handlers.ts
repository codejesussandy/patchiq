import { http, HttpResponse } from 'msw';
import type { Branch, User, Role, Policy, DeploymentPolicy, MailServerConfig, ProxyServerConfig, LDAPServerConfig, RiskScore, RemoteDesktopSettings, ServerSettings, Integration, IntegrationFormData, AgentApprovalSettings, AgentApprovalSettingsFormData, VulnerabilityPreference, VulnerabilityPreferenceFormData, AgentConfiguration, AgentConfigurationFormData, AgentApproval, EnrollSecret, EnrollSecretFormData, RedHatAgentNomination, ComputerGroup, ComputerGroupFormData, EndpointOption, PatchPreference, PatchPreferenceFormData, DistributionServer, DistributionServerFormData } from '../../types/settings.types';

const API_BASE_URL = '/v1';

// Mock data for branches
let mockBranches: Branch[] = [
  {
    id: '1',
    name: 'Gurugram (Default)',
    status: 'Default',
    users: 10,
    assets: 10,
    address: '123 Main Street, Sector 44',
    city: 'Gurugram',
    state: 'Haryana',
    country: 'India',
    postalCode: '122003',
    phone: '+91 9876543210',
    email: 'gurugram@example.com',
    manager: 'user1',
    isDefault: true,
    description: 'Main branch location in Gurugram',
  },
];

// Mock data for users
let mockUsers: User[] = [
  {
    id: '0',
    firstName: 'Admin',
    lastName: '',
    email: 'admin@infraon.com',
    phone: '+91-9876543210',
    username: 'admin',
    branch: 'Gurugram',
    role: 'Super Admin',
    status: 'Active',
    lastLogin: 'March 5 2024, 09:45 am',
    createdAt: '2025-11-28T10:00:00Z',
    timezone: 'IST',
    organization: 'Global Organization',
    department: 'Global Department',
    loginAllowed: true,
    endpointAssignmentAllowed: true,
  },
  {
    id: '1',
    firstName: 'Gajendra',
    lastName: 'Kumar',
    email: 'gajendra.kumar@kogta.in',
    phone: '+91-9812345678',
    username: 'gajendra.kumar',
    branch: 'Gurugram',
    role: 'L2',
    status: 'Active',
    lastLogin: 'March 5 2024, 09:45 am',
    createdAt: '2025-11-28T10:21:34Z',
    timezone: 'IST',
    organization: 'Kogta Financial (I) Limited',
    department: 'Accounts',
    loginAllowed: true,
    endpointAssignmentAllowed: true,
  },
  {
    id: '2',
    firstName: 'Abhijeet',
    lastName: 'Tiwari',
    email: 'abhijeet.tiwari@kogta.in',
    phone: '+91-9823456789',
    username: 'abhijeet.tiwari',
    branch: 'Gurugram',
    role: 'L1',
    status: 'Active',
    lastLogin: 'March 5 2024, 09:45 am',
    createdAt: '2025-11-28T12:45:48Z',
    timezone: 'IST',
    organization: 'Kogta Financial (I) Limited',
    department: 'Administration',
    loginAllowed: true,
    endpointAssignmentAllowed: true,
  },
  {
    id: '3',
    firstName: 'Surendra',
    lastName: 'Kumar Sah',
    email: 'surendra@kogta.in',
    phone: '+91-9834567890',
    username: 'surendra.sah',
    branch: 'Gurugram',
    role: 'L1',
    status: 'Active',
    lastLogin: 'March 5 2024, 09:45 am',
    createdAt: '2025-11-28T12:46:40Z',
    timezone: 'IST',
    organization: 'Kogta Financial (I) Limited',
    department: 'Audit',
    loginAllowed: true,
    endpointAssignmentAllowed: false,
  },
  {
    id: '4',
    firstName: 'Girraj',
    lastName: 'Prasad Sharma',
    email: 'girraj.prasad@kogta.in',
    phone: '+91-9845678901',
    username: 'girraj.sharma',
    branch: 'Gurugram',
    role: 'Read_Only',
    status: 'Active',
    lastLogin: 'March 5 2024, 09:45 am',
    createdAt: '2025-11-28T12:47:46Z',
    timezone: 'IST',
    organization: 'Kogta Financial (I) Limited',
    department: 'Branding',
    loginAllowed: true,
    endpointAssignmentAllowed: true,
  },
  {
    id: '5',
    firstName: 'Rajveer',
    lastName: 'Singh',
    email: 'rajveer.rajawat@kogta.in',
    phone: '+91-9856789012',
    username: 'rajveer.singh',
    branch: 'Gurugram',
    role: 'Read_Only',
    status: 'Invite Sent',
    lastLogin: 'Never',
    createdAt: '2025-11-28T12:48:34Z',
    timezone: 'IST',
    organization: 'Kogta Financial (I) Limited',
    department: 'CMS & Banking',
    loginAllowed: false,
    endpointAssignmentAllowed: false,
  },
];

// Mock data for roles
let mockRoles: Role[] = [
  {
    id: '0',
    name: 'Super Admin',
    description: '',
    users: 0,
    branch: 'Gurugram',
    permissions: [
      { module: 'Patches', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'Assets', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'Discovery', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'Reports', actions: ['view', 'create'] },
      { module: 'Settings', actions: ['view', 'create', 'edit', 'delete'] },
    ],
    isSystem: true,
    createdAt: '2025-11-28T12:30:00Z',
    capabilities: [
      'view_inventory', 'create_inventory', 'delete_inventory', 'manage_inventory', 'update_inventory',
      'remote_desktop', 'file_explorer', 'terminal', 'wake_on_lan', 'add_user', 'change_password',
      'view_dashboard', 'create_dashboard', 'delete_dashboard', 'manage_dashboard', 'update_dashboard',
      'view_vulnerability', 'view_manage_exceptions',
      'view_report', 'create_report', 'delete_report', 'manage_report', 'update_report',
      'view_endpoint_vitals', 'create_endpoint_vitals', 'delete_endpoint_vitals', 'manage_endpoint_vitals', 'update_endpoint_vitals',
      'view_settings', 'create_settings', 'delete_settings', 'manage_settings', 'update_settings',
      'view_widget', 'create_widget', 'delete_widget', 'manage_widget', 'update_widget',
      'view_alert', 'create_alert', 'delete_alert', 'manage_alert', 'update_alert',
      'view_audit', 'view_patch', 'create_patch', 'delete_patch', 'manage_patch', 'update_patch',
      'kill_process', 'delete_files', 'reboot', 'shutdown', 'block_ip_address', 'block_port',
      'delete_user', 'format_drive', 'remote_wipe_out', 'enable_service', 'disable_service',
    ],
  },
  {
    id: '1',
    name: 'Read_Only',
    description: 'Read_Only',
    users: 0,
    branch: 'Gurugram',
    permissions: [
      { module: 'Patches', actions: ['view'] },
      { module: 'Assets', actions: ['view'] },
      { module: 'Discovery', actions: ['view'] },
      { module: 'Reports', actions: ['view'] },
    ],
    isSystem: false,
    createdAt: '2025-11-28T12:38:00Z',
    capabilities: [
      'view_inventory', 'view_dashboard', 'view_vulnerability', 'view_manage_exceptions',
      'view_report', 'view_endpoint_vitals', 'view_settings', 'view_widget', 'view_alert', 'view_audit', 'view_patch',
    ],
  },
  {
    id: '2',
    name: 'L1',
    description: 'L1',
    users: 0,
    branch: 'Gurugram',
    permissions: [
      { module: 'Patches', actions: ['view', 'create'] },
      { module: 'Assets', actions: ['view'] },
    ],
    isSystem: false,
    createdAt: '2025-11-28T12:41:43Z',
    capabilities: [
      'view_inventory', 'create_inventory', 'remote_desktop', 'file_explorer', 'terminal',
      'view_dashboard', 'create_dashboard', 'view_vulnerability', 'view_report', 'view_endpoint_vitals',
      'view_settings', 'view_widget', 'view_alert', 'view_audit', 'view_patch',
    ],
  },
  {
    id: '3',
    name: 'L2',
    description: 'L2',
    users: 0,
    branch: 'Gurugram',
    permissions: [
      { module: 'Patches', actions: ['view', 'create', 'edit'] },
      { module: 'Assets', actions: ['view', 'create'] },
      { module: 'Discovery', actions: ['view'] },
    ],
    isSystem: false,
    createdAt: '2025-11-28T12:43:15Z',
    capabilities: [
      'view_inventory', 'create_inventory', 'delete_inventory', 'manage_inventory', 'update_inventory',
      'remote_desktop', 'file_explorer', 'terminal', 'view_dashboard', 'create_dashboard', 'delete_dashboard',
      'manage_dashboard', 'update_dashboard', 'view_vulnerability', 'view_manage_exceptions',
      'view_report', 'create_report', 'delete_report', 'manage_report', 'update_report',
      'view_endpoint_vitals', 'create_endpoint_vitals', 'delete_endpoint_vitals', 'manage_endpoint_vitals', 'update_endpoint_vitals',
      'view_settings', 'create_settings', 'delete_settings', 'manage_settings', 'update_settings',
      'view_widget', 'create_widget', 'delete_widget', 'manage_widget', 'update_widget',
      'view_alert', 'create_alert', 'delete_alert', 'manage_alert', 'update_alert', 'view_audit',
      'view_patch', 'create_patch', 'delete_patch', 'manage_patch', 'update_patch',
    ],
  },
];

// Mock data for policies
let mockPolicies: Policy[] = [
  {
    id: '1',
    name: 'Default Password Policy',
    type: 'Password',
    orgUnit: 'Gurugram (Default)',
    users: 10,
    description: 'Default password policy for all users',
    configuration: {
      resetDuration: 'Days',
      changeEveryDays: 90,
      lastNPasswordHistory: 5,
      minCharacterCount: 8,
      maxCharacterCount: 128,
      minLowerCaseCharacters: 1,
      minUpperCaseCharacters: 1,
      minNumbers: 1,
      minSpecialCharacters: 1,
    },
    affectedRoles: ['Admin', 'Employee'],
    status: 'Active',
    createdBy: 'Alice Johnson',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
];

// Mock data for alert configurations
let mockAlertConfigurations: any[] = [
  {
    id: '1',
    name: 'Critical Patch Alert',
    type: 'Email',
    channel: 'SMTP',
    recipients: 'admin@company.com, security@company.com',
    enabled: true,
    createdAt: '2025-01-10T08:30:00Z',
  },
  {
    id: '2',
    name: 'Patch Deployment Failed',
    type: 'Email',
    channel: 'SMTP',
    recipients: 'ops@company.com',
    enabled: true,
    createdAt: '2025-01-12T10:15:00Z',
  },
  {
    id: '3',
    name: 'Slack Notification',
    type: 'Slack',
    channel: 'Webhook',
    recipients: '#patches-channel',
    enabled: true,
    createdAt: '2025-01-08T14:45:00Z',
  },
  {
    id: '4',
    name: 'SMS Alert',
    type: 'SMS',
    channel: 'AWS SNS',
    recipients: '+1-555-0123',
    enabled: false,
    createdAt: '2025-01-05T09:20:00Z',
  },
  {
    id: '5',
    name: 'Webhook Alert',
    type: 'Webhook',
    channel: 'HTTP',
    recipients: 'https://api.company.com/alerts',
    enabled: true,
    createdAt: '2025-01-15T16:00:00Z',
  },
];

// Mock data for deployment policies
let mockDeploymentPolicies: DeploymentPolicy[] = [
  {
    id: 'POLICY-2',
    name: 'Scheduled Patch Deployment',
    description: 'Scheduled Patch Deployment',
    type: 'SCHEDULE',
    supportedModule: 'All',
    relatedType: 'No Relation',
    createdBy: 'Admin',
    createdAt: '2025-01-12T12:14:27 PM',
    updatedAt: '2025-01-12T12:14:27 PM',
  },
  {
    id: 'POLICY-1',
    name: 'OOS Instant deployment policy',
    description: 'OOS Instance deployment policy',
    type: 'INSTANT',
    supportedModule: 'All',
    relatedType: 'No Relation',
    createdBy: 'Admin',
    createdAt: '2025-01-07T10:16:32 PM',
    updatedAt: '2025-01-07T10:16:32 PM',
  },
];

// Mock data for organizations
let mockOrganizations: any[] = [
  {
    id: '0',
    name: 'Global Organization',
    description: '',
    createdAt: '',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '1',
    name: 'Kogta Financial (I) Limited',
    description: 'Kogta Financial (I) Limited',
    createdAt: '2025-11-27T17:52:56Z',
    updatedAt: '2025-11-27T17:52:56Z',
  },
];

// Mock data for departments
let mockDepartments: any[] = [
  {
    id: '0',
    name: 'Global Department',
    organization: 'Global Organization',
    description: 'Default',
    createdAt: '2024-01-10T10:00:00Z',
  },
  {
    id: '1',
    name: 'Accounts',
    organization: 'Kogta Financial (I) Limited',
    description: 'Accounts',
    createdAt: '2025-11-08T10:20:45Z',
  },
  {
    id: '2',
    name: 'Administration',
    organization: 'Kogta Financial (I) Limited',
    description: '',
    createdAt: '2025-11-08T12:15:33Z',
  },
  {
    id: '3',
    name: 'Audit',
    organization: 'Kogta Financial (I) Limited',
    description: 'Audit',
    createdAt: '2025-11-08T12:20:46Z',
  },
  {
    id: '4',
    name: 'Branding',
    organization: 'Kogta Financial (I) Limited',
    description: 'Branding',
    createdAt: '2025-11-08T12:21:28Z',
  },
  {
    id: '5',
    name: 'CMS & Banking',
    organization: 'Kogta Financial (I) Limited',
    description: 'CMS & Banking',
    createdAt: '2025-11-08T12:21:28Z',
  },
  {
    id: '6',
    name: 'Collections',
    organization: 'Kogta Financial (I) Limited',
    description: 'Collections',
    createdAt: '2025-11-08T12:21:13Z',
  },
  {
    id: '7',
    name: 'Credit',
    organization: 'Kogta Financial (I) Limited',
    description: 'Credit',
    createdAt: '2025-11-08T12:21:21Z',
  },
  {
    id: '8',
    name: 'CRM',
    organization: 'Kogta Financial (I) Limited',
    description: '',
    createdAt: '2025-11-08T12:20:58Z',
  },
  {
    id: '9',
    name: 'Finance',
    organization: 'Kogta Financial (I) Limited',
    description: 'Finance',
    createdAt: '2025-11-08T12:21:26Z',
  },
  {
    id: '10',
    name: 'Human Resource',
    organization: 'Kogta Financial (I) Limited',
    description: 'Human Resource',
    createdAt: '2025-11-08T12:21:43Z',
  },
  {
    id: '11',
    name: 'Insurance',
    organization: 'Kogta Financial (I) Limited',
    description: 'Insurance',
    createdAt: '2025-11-08T12:21:04Z',
  },
  {
    id: '12',
    name: 'Legal',
    organization: 'Kogta Financial (I) Limited',
    description: 'Legal',
    createdAt: '2025-11-08T12:22:00Z',
  },
  {
    id: '13',
    name: 'Management',
    organization: 'Kogta Financial (I) Limited',
    description: 'Management',
    createdAt: '2025-11-08T12:28:58Z',
  },
];

// Mock data for locations
let mockLocations: any[] = [
  {
    id: '0',
    name: 'Default Location',
    description: '',
    createdAt: '2025-11-28T12:34:00Z',
  },
  {
    id: '1',
    name: 'Jaipur-Corp',
    description: 'Rajasthan',
    createdAt: '2025-11-28T12:34:00Z',
  },
  {
    id: '2',
    name: 'Gurugram',
    description: 'Haryana',
    createdAt: '2025-11-28T12:34:36Z',
  },
];

// Mock data for vendor logos
let mockVendorLogos: any[] = [
  {
    id: '1',
    name: 'virustotal',
    type: 'integration',
    logoUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMTgiIGZpbGw9IiMxODkwZmYiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIxMiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5WVDwvdGV4dD48L3N2Zz4=',
    fileName: 'virustotal.png',
    fileSize: 12345,
    mimeType: 'image/png',
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    name: 'abuseipdb',
    type: 'integration',
    logoUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMTgiIGZpbGw9IiNmZjRkNGYiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIxMiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5BQjwvdGV4dD48L3N2Zz4=',
    fileName: 'abuseipdb.png',
    fileSize: 23456,
    mimeType: 'image/png',
    createdAt: '2024-01-16T11:30:00Z',
  },
  {
    id: '3',
    name: 'zendesk',
    type: 'integration',
    logoUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMTgiIGZpbGw9IiMwMzM2M2QiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIxMiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5aPC90ZXh0Pjwvc3ZnPg==',
    fileName: 'zendesk.png',
    fileSize: 34567,
    mimeType: 'image/png',
    createdAt: '2024-01-17T09:15:00Z',
  },
  {
    id: '4',
    name: 'hp',
    type: 'vendor',
    logoUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMTgiIGZpbGw9IiMwMDk2ZDYiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIxNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5IUDwvdGV4dD48L3N2Zz4=',
    fileName: 'hp.png',
    fileSize: 45678,
    mimeType: 'image/png',
    createdAt: '2024-01-18T14:20:00Z',
  },
  {
    id: '5',
    name: 'dell inc.',
    type: 'vendor',
    logoUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMTgiIGZpbGw9IiMwMDdkYjgiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIxMiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ERFWL0ZXh0Pjwvc3ZnPg==',
    fileName: 'dell.png',
    fileSize: 56789,
    mimeType: 'image/png',
    createdAt: '2024-01-19T16:45:00Z',
  },
  {
    id: '6',
    name: 'hewlett-packard',
    type: 'vendor',
    logoUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMTgiIGZpbGw9IiMwMDk2ZDYiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIxMCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5IUDwvdGV4dD48L3N2Zz4=',
    fileName: 'hewlett-packard.png',
    fileSize: 67890,
    mimeType: 'image/png',
    createdAt: '2024-01-20T08:30:00Z',
  },
  {
    id: '7',
    name: 'windows',
    type: 'os',
    logoUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiB4PSIyIiB5PSIyIiBmaWxsPSIjMDBhNGVmIi8+PHJlY3Qgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiB4PSIyMiIgeT0iMiIgZmlsbD0iIzAwYTRlZiIvPjxyZWN0IHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgeD0iMiIgeT0iMjIiIGZpbGw9IiMwMGE0ZWYiLz48cmVjdCB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHg9IjIyIiB5PSIyMiIgZmlsbD0iIzAwYTRlZiIvPjwvc3ZnPg==',
    fileName: 'windows.png',
    fileSize: 78901,
    mimeType: 'image/png',
    createdAt: '2024-01-21T10:00:00Z',
  },
  {
    id: '8',
    name: 'apple inc.',
    type: 'vendor',
    logoUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMTgiIGZpbGw9IiM1NTU1NTUiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIxOCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7igaI8L3RleHQ+PC9zdmc+',
    fileName: 'apple.png',
    fileSize: 89012,
    mimeType: 'image/png',
    createdAt: '2024-01-22T11:15:00Z',
  },
  {
    id: '9',
    name: 'macos',
    type: 'os',
    logoUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMTgiIGZpbGw9IiM1NTU1NTUiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIxOCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7igaI8L3RleHQ+PC9zdmc+',
    fileName: 'macos.png',
    fileSize: 90123,
    mimeType: 'image/png',
    createdAt: '2024-01-23T13:30:00Z',
  },
  {
    id: '10',
    name: 'vmware, inc.',
    type: 'vendor',
    logoUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMTgiIGZpbGw9IiM2MDdkOGIiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIxMCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5WTTwvdGV4dD48L3N2Zz4=',
    fileName: 'vmware.png',
    fileSize: 10234,
    mimeType: 'image/png',
    createdAt: '2024-01-24T15:00:00Z',
  },
  {
    id: '11',
    name: 'acer',
    type: 'vendor',
    logoUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMTgiIGZpbGw9IiM4M2Q0MDMiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIxMiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5BPC90ZXh0Pjwvc3ZnPg==',
    fileName: 'acer.png',
    fileSize: 11234,
    mimeType: 'image/png',
    createdAt: '2024-01-25T16:20:00Z',
  },
  {
    id: '12',
    name: 'cisco',
    type: 'vendor',
    logoUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMTgiIGZpbGw9IiMwNDljOWUiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIxMiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5DPC90ZXh0Pjwvc3ZnPg==',
    fileName: 'cisco.png',
    fileSize: 12345,
    mimeType: 'image/png',
    createdAt: '2024-01-26T09:00:00Z',
  },
  {
    id: '13',
    name: 'intel',
    type: 'vendor',
    logoUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMTgiIGZpbGw9IiMwMDcxYzUiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIxMiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JPC90ZXh0Pjwvc3ZnPg==',
    fileName: 'intel.png',
    fileSize: 13456,
    mimeType: 'image/png',
    createdAt: '2024-01-27T10:30:00Z',
  },
  {
    id: '14',
    name: 'ubuntu',
    type: 'os',
    logoUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMTgiIGZpbGw9IiNlOTU0MjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIxMiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5VPC90ZXh0Pjwvc3ZnPg==',
    fileName: 'ubuntu.png',
    fileSize: 14567,
    mimeType: 'image/png',
    createdAt: '2024-01-28T11:45:00Z',
  },
];

// Mock data for integrations
let mockIntegrations: Integration[] = [
  {
    id: '1',
    name: 'Email Action',
    description: 'Email Action',
    type: 'Email',
    status: true,
    createdBy: 'admin@infraon.com',
    createdAt: '2024-01-15T10:00:00Z',
    recipients: ['admin@infraon.com', 'support@infraon.com'],
  },
  {
    id: '2',
    name: 'Zendesk Integration',
    description: 'Zendesk',
    type: 'Incident',
    status: true,
    createdBy: 'admin@infraon.com',
    createdAt: '2024-01-16T10:00:00Z',
    recipients: ['teamlead@infraon.com'],
  },
  {
    id: '3',
    name: 'AcunetixPDI Integration',
    description: 'AcunetixPDI',
    type: 'Threat Intelligence',
    status: false,
    createdBy: 'admin@infraon.com',
    createdAt: '2024-01-17T10:00:00Z',
    recipients: [],
  },
  {
    id: '4',
    name: 'Virus Total Integration',
    description: 'Virus Total',
    type: 'Threat Intelligence',
    status: true,
    createdBy: 'admin@infraon.com',
    createdAt: '2024-01-18T10:00:00Z',
    recipients: ['admin@infraon.com'],
  },
  {
    id: '5',
    name: 'OpenAI',
    description: 'OpenAI',
    type: 'AI',
    status: false,
    createdBy: 'admin@infraon.com',
    createdAt: '2024-01-19T10:00:00Z',
    recipients: [],
  },
];

// Mock data for mail server configuration
let mockMailServerConfig: MailServerConfig = {
  smtpHost: 'smtp.gmail.com',
  smtpPort: 587,
  protocol: 'TLS',
  email: 'noreply@example.com',
  enableAuthentication: true,
  username: 'user@example.com',
  password: 'encrypted_password',
};

// Mock data for proxy server configuration
let mockProxyServerConfig: ProxyServerConfig = {
  enabled: false,
  host: undefined,
  port: undefined,
  protocol: 'HTTP',
  username: undefined,
  password: undefined,
  noProxyList: [],
};

// Mock data for LDAP server configurations
let mockLDAPServerConfigs: LDAPServerConfig[] = [];

// Mock data for risk score settings
let mockRiskScore: RiskScore = {
  id: '1',
  applyDefaultSettings: true,
  vulnerabilityScoreWeight: 0.3,
  vulnerabilitySeverityWeight: 0.3,
  threatsWeight: 0.2,
  endpointVisitsWeight: 0.2,
  createdAt: '2024-01-15T10:00:00Z',
};

// Mock data for remote desktop settings
let mockRemoteDesktopSettings: RemoteDesktopSettings = {
  id: '1',
  connectionType: 'Local',
  remoteSessionIndicator: true,
  userConsent: false,
  createdAt: '2024-01-15T10:00:00Z',
};

// Mock data for server settings
let mockServerSettings: ServerSettings = {
  id: '1',
  sessionTimeout: true,
  sessionTimeoutMinutes: 60,
  sessionIdleTimeoutMinutes: 0,
  endpointOnlineStatusTimeoutHours: 1,
  endpointScanJobTimeoutHours: 1,
  logLevel: 'Debug',
  createdAt: '2024-01-15T10:00:00Z',
};

// Mock data for agent approval settings
let mockAgentApprovalSettings: AgentApprovalSettings = {
  id: '1',
  approvalType: 'auto',
  autoApprovalBasedOn: 'all',
  createdAt: '2024-01-15T10:00:00Z',
};

// Mock data for vulnerability preference
let mockVulnerabilityPreference: VulnerabilityPreference = {
  id: '1',
  lastSyncAt: '2025-01-15T06:38:30Z',
  scanJobInterval: 2,
  scanJobUnit: 'Hour',
  databaseSyncTime: '01:00:00',
  totalCveCount: 311639,
  createdAt: '2024-01-15T10:00:00Z',
};

// Mock data for patch preferences
let mockPatchPreference: PatchPreference = {
  id: '1',
  enablePatching: true,
  corridorOnlyApprovedPatch: false,
  patchSyncForOS: ['Windows', 'Ubuntu'],
  patchApprovalPolicy: 'PreApproved',
  enableThirdPartyPatching: true,
  patchApprovalScheduleTime: '03:00:00',
  scheduleTime: '00:00:00',
  zeroTouchDeploymentScheduleTime: '14:00:00',
  lastSyncedAt: '2025/01/16 06:00:07 AM',
  createdAt: '2024-01-15T10:00:00Z',
};

// Mock data for distribution servers
let mockDistributionServers: DistributionServer[] = [];

// Mock data for agent configuration
let mockAgentConfiguration: AgentConfiguration = {
  id: '1',
  allowedBandwidth: 0,
  agentRefreshCycle: 10,
  systemActionRefreshCycle: 10,
  endpointVlanRefreshCycle: 10,
  patchScanningRefreshCycle: 2160,
  ssdmRefreshCycle: 300,
  processRefreshCycle: 300,
  networkRefreshCycle: 300,
  certificateRefreshCycle: 300,
  startupItemsRefreshCycle: 300,
  usersRefreshCycle: 300,
  systemResourcesRefreshCycle: 300,
  systemServicesRefreshCycle: 300,
  fimEventsRefreshCycle: 300,
  softwareMeterRefreshCycle: 300,
  createdAt: '2024-01-15T10:00:00Z',
};

// Mock data for enroll secrets
let mockEnrollSecrets: EnrollSecret[] = [
  {
    id: '1',
    name: 'Default Secret Key',
    secret: 'e0e6d9e6-30d4-488c-8dd2-91d6ca84d9c8',
    organization: 'Global Organization',
    department: 'Global Department',
    createdOn: '2025-11-28T03:55:19Z',
  },
  {
    id: '2',
    name: 'Kopla Financial',
    secret: 'c80ca9fe-4f76-6b4c-7a31',
    organization: 'Kopla Financial (3) Limited',
    department: 'Default',
    createdOn: '2025-11-28T10:24:04Z',
  },
];

// Mock data for agent approvals
let mockAgentApprovals: AgentApproval[] = [
  {
    id: '1',
    uuid: 'aef1b8e4-c173-a943-b30',
    hostName: 'XFS1TDHCPQA81',
    ipAddresses: ['172.17.2.100'],
    createdOn: '2025-10-01 01:55:19 PM',
    performedBy: 'Admin',
    status: 'Approved',
  },
  {
    id: '2',
    uuid: 'af-VI0005-0TCN',
    hostName: 'THOL',
    ipAddresses: ['10.10.10.12'],
    createdOn: '2025-10-01 01:28:51 PM',
    performedBy: 'Admin',
    status: 'Approved',
  },
  {
    id: '3',
    uuid: 'affaacf-dffe-44b-adc-1114',
    hostName: 'L20-HOSTAFLSV',
    ipAddresses: ['10.15.16.113'],
    createdOn: '2025-10-01 12:07:08 PM',
    performedBy: 'Admin',
    status: 'Approved',
  },
  {
    id: '4',
    uuid: 'a3180518-08e-4u2f-ab3',
    hostName: 'L20SOLSR85',
    ipAddresses: ['172.17.12.116, 10.0.8.106'],
    createdOn: '2025-10-01 12:02:42 AM',
    performedBy: 'Admin',
    status: 'Approved',
  },
  {
    id: '5',
    uuid: 'afa03e05-5e23-4947-959d-6b66',
    hostName: 'SR2625XXXX',
    ipAddresses: ['192.168.29.12'],
    createdOn: '2025-11-08 01:41:51 AM',
    performedBy: 'Admin',
    status: 'Approved',
  },
  {
    id: '6',
    uuid: '1854299646-f467-bb97-a85',
    hostName: 'officeinfra-ubk80-020k-n',
    ipAddresses: ['10.16.18.80'],
    createdOn: '2025-11-08 12:01:09 AM',
    performedBy: 'Admin',
    status: 'Approved',
  },
  {
    id: '7',
    uuid: 'f5424960-a08c-5487-98f9-a2f',
    hostName: 'e5211d95-4467-387-089-d02',
    ipAddresses: ['10.16.18.80'],
    createdOn: '2025-11-08 11:33:44 AM',
    performedBy: 'Admin',
    status: 'Approved',
  },
  {
    id: '8',
    uuid: '1f429a9d-6da4-46f7-989f-e05',
    hostName: '0241bad-ca01-dd91-aa5-00',
    ipAddresses: ['10.16.18.61'],
    createdOn: '2025-11-08 12:02:08 AM',
    performedBy: 'Admin',
    status: 'Approved',
  },
  {
    id: '9',
    uuid: '01f1462-2001-f1e0-0b04-0b',
    hostName: 'a04164d6e7',
    ipAddresses: ['10.16.18.61'],
    createdOn: '2025-11-08 12:02:05 AM',
    performedBy: 'Admin',
    status: 'Approved',
  },
  {
    id: '10',
    uuid: 'f5224858-c9ed-44b7-9897-d07',
    hostName: 'a0298d31-f0e3-1e0d-1e02-e2c',
    ipAddresses: ['10.16.18.61'],
    createdOn: '2025-11-08 12:01:39 AM',
    performedBy: 'Admin',
    status: 'Approved',
  },
  {
    id: '11',
    uuid: '1034c0e2-0cb4-1e0a-1e01-e8d',
    hostName: 'a0e162d6e7-e0e2',
    ipAddresses: ['10.16.18.61'],
    createdOn: '2025-11-08 12:00:58 AM',
    performedBy: 'Admin',
    status: 'Approved',
  },
  {
    id: '12',
    uuid: 'f5208b99-d9c3-4457-98f-a0e',
    hostName: 'L022d962-02b5-44ce-a9ce-1e00-000',
    ipAddresses: ['10.16.18.61'],
    createdOn: '2025-11-08 11:33:04 AM',
    performedBy: 'Admin',
    status: 'Approved',
  },
  {
    id: '13',
    uuid: 'e8bf42d01-2124-446f-b088-2c50-000e',
    ipAddresses: ['10.16.18.80'],
    createdOn: '2025-10-01 09:45:19 AM',
    performedBy: 'Admin',
    status: 'Approved',
    hostName: '',
  },
  {
    id: '14',
    uuid: 'e1422b6e1-d3af-44b1-82ed-c4e',
    hostName: 'a002e8d99-f0e3-1e0d-1e02-e2c',
    ipAddresses: ['10.16.18.80'],
    createdOn: '2025-10-01 01:41:51 AM',
    performedBy: 'Admin',
    status: 'Approved',
  },
  {
    id: '15',
    uuid: 'f5284b23-37f1-40f1-1e01-e01-e7e',
    hostName: '0100e9b4-201f-11e8-06b0-000',
    ipAddresses: ['10.16.18.61'],
    createdOn: '2025-11-08 11:31:02 AM',
    performedBy: 'Admin',
    status: 'Approved',
  },
  {
    id: '16',
    uuid: 'f5204d2b1-11e1-44f7-1e01-a2a',
    hostName: 'a002f9d3c-f0e1-0e0c-0e01-0c0',
    ipAddresses: ['10.16.18.61'],
    createdOn: '2025-11-08 11:32:09 AM',
    performedBy: 'Admin',
    status: 'Approved',
  },
  {
    id: '17',
    uuid: 'f5208e2d-3e5c-41f7-98d4-a1b',
    hostName: 'a0116d6e7-f0e1-0e0c-0e01-0c0',
    ipAddresses: ['10.16.18.61'],
    createdOn: '2025-11-08 11:32:09 AM',
    performedBy: 'Admin',
    status: 'Approved',
  },
];

// Mock data for Red Hat agent nominations
let mockRedHatNominations: RedHatAgentNomination[] = [
  {
    id: '1',
    name: 'Red Hat Workstation',
    status: 'pending',
    endpoint: 0,
    scheduledTime: '14:30',
    lastSyncTime: '2025-01-07 10:15:32 PM',
    updatedBy: 'Admin',
    updatedAt: '2025-01-07 10:15:32 PM',
  },
  {
    id: '2',
    name: 'Red Hat Server',
    status: 'pending',
    endpoint: 0,
    scheduledTime: '18:00',
    lastSyncTime: '',
    updatedBy: 'Admin',
    updatedAt: '2025-01-07 10:15:32 PM',
  },
];

export const settingsHandlers = [
  // Branch APIs
  http.get(`${API_BASE_URL}/settings/branches`, () => {
    return HttpResponse.json(mockBranches);
  }),

  http.get(`${API_BASE_URL}/settings/branches/:id`, ({ params }) => {
    const { id } = params;
    const branch = mockBranches.find((b) => b.id === id);
    if (!branch) {
      return HttpResponse.json({ error: 'Branch not found' }, { status: 404 });
    }
    return HttpResponse.json(branch);
  }),

  http.post(`${API_BASE_URL}/settings/branches`, async ({ request }) => {
    const data = (await request.json()) as any;

    // If marking as default, unset other defaults
    if (data.isDefault) {
      mockBranches = mockBranches.map(b => ({ ...b, isDefault: false, status: 'Active' as const }));
    }

    const newBranch: Branch = {
      id: String(mockBranches.length),
      ...data,
      users: 0,
      assets: 0,
      status: data.isDefault ? 'Default' : 'Active',
    };
    mockBranches.push(newBranch);
    return HttpResponse.json(newBranch, { status: 201 });
  }),

  http.put(`${API_BASE_URL}/settings/branches/:id`, async ({ params, request }) => {
    const { id } = params;
    const data = (await request.json()) as any;

    const index = mockBranches.findIndex((b) => b.id === id);
    if (index === -1) {
      return HttpResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    // If marking as default, unset other defaults
    if (data.isDefault) {
      mockBranches = mockBranches.map(b => ({ ...b, isDefault: false, status: 'Active' as const }));
    }

    mockBranches[index] = {
      ...mockBranches[index],
      ...data,
      status: data.isDefault ? 'Default' : mockBranches[index].status,
    };
    return HttpResponse.json(mockBranches[index]);
  }),

  http.delete(`${API_BASE_URL}/settings/branches/:id`, ({ params }) => {
    const { id } = params;
    const branch = mockBranches.find((b) => b.id === id);
    if (branch?.isDefault) {
      return HttpResponse.json({ error: 'Cannot delete default branch' }, { status: 400 });
    }
    mockBranches = mockBranches.filter((b) => b.id !== id);
    return HttpResponse.json({ success: true });
  }),

  // User APIs
  http.get(`${API_BASE_URL}/settings/users`, () => {
    return HttpResponse.json(mockUsers);
  }),

  http.get(`${API_BASE_URL}/settings/users/:id`, ({ params }) => {
    const { id } = params;
    const user = mockUsers.find((u) => u.id === id);
    if (!user) {
      return HttpResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return HttpResponse.json(user);
  }),

  http.post(`${API_BASE_URL}/settings/users`, async ({ request }) => {
    const data = (await request.json()) as any;
    const newUser: User = {
      id: String(mockUsers.length),
      ...data,
      status: 'Active',
      lastLogin: 'Never',
      createdAt: new Date().toISOString(),
    };
    mockUsers.push(newUser);
    return HttpResponse.json(newUser, { status: 201 });
  }),

  http.put(`${API_BASE_URL}/settings/users/:id`, async ({ params, request }) => {
    const { id } = params;
    const data = (await request.json()) as any;
    const index = mockUsers.findIndex((u) => u.id === id);
    if (index === -1) {
      return HttpResponse.json({ error: 'User not found' }, { status: 404 });
    }
    mockUsers[index] = { ...mockUsers[index], ...data };
    return HttpResponse.json(mockUsers[index]);
  }),

  http.delete(`${API_BASE_URL}/settings/users/:id`, ({ params }) => {
    const { id } = params;
    mockUsers = mockUsers.filter((u) => u.id !== id);
    return HttpResponse.json({ success: true });
  }),

  http.post(`${API_BASE_URL}/settings/users/invite`, async ({ request }) => {
    const data = (await request.json()) as any;
    return HttpResponse.json({ success: true, message: 'Invitation sent' });
  }),

  http.post(`${API_BASE_URL}/settings/users/:id/reset-password`, ({ params }) => {
    return HttpResponse.json({ success: true, message: 'Password reset email sent' });
  }),

  http.post(`${API_BASE_URL}/settings/users/:id/suspend`, ({ params }) => {
    const { id } = params;
    const index = mockUsers.findIndex((u) => u.id === id);
    if (index !== -1) {
      mockUsers[index].status = 'In Active';
    }
    return HttpResponse.json({ success: true });
  }),

  http.get(`${API_BASE_URL}/settings/users/:id/audit-log`, ({ params }) => {
    return HttpResponse.json([
      { action: 'Created', timestamp: '2024-01-15T10:00:00Z', by: 'System' },
      { action: 'Login', timestamp: '2024-03-05T09:45:00Z', by: 'User' },
    ]);
  }),

  // Role APIs
  http.get(`${API_BASE_URL}/settings/roles`, () => {
    return HttpResponse.json(mockRoles);
  }),

  http.get(`${API_BASE_URL}/settings/roles/:id`, ({ params }) => {
    const { id } = params;
    const role = mockRoles.find((r) => r.id === id);
    if (!role) {
      return HttpResponse.json({ error: 'Role not found' }, { status: 404 });
    }
    return HttpResponse.json(role);
  }),

  http.post(`${API_BASE_URL}/settings/roles`, async ({ request }) => {
    const data = (await request.json()) as any;
    const newRole: Role = {
      id: String(mockRoles.length),
      ...data,
      users: 0,
      isSystem: false,
      branch: data.branch || 'Gurugram',
      permissions: data.permissions || [],
      createdAt: new Date().toISOString(),
      capabilities: data.capabilities || [],
    };
    mockRoles.push(newRole);
    return HttpResponse.json(newRole, { status: 201 });
  }),

  http.put(`${API_BASE_URL}/settings/roles/:id`, async ({ params, request }) => {
    const { id } = params;
    const data = (await request.json()) as any;
    const index = mockRoles.findIndex((r) => r.id === id);
    if (index === -1) {
      return HttpResponse.json({ error: 'Role not found' }, { status: 404 });
    }
    if (mockRoles[index].isSystem) {
      return HttpResponse.json({ error: 'Cannot modify system role' }, { status: 400 });
    }
    mockRoles[index] = {
      ...mockRoles[index],
      ...data,
      capabilities: data.capabilities || mockRoles[index].capabilities || [],
    };
    return HttpResponse.json(mockRoles[index]);
  }),

  http.delete(`${API_BASE_URL}/settings/roles/:id`, ({ params }) => {
    const { id } = params;
    const role = mockRoles.find((r) => r.id === id);
    if (role?.isSystem) {
      return HttpResponse.json({ error: 'Cannot delete system role' }, { status: 400 });
    }
    mockRoles = mockRoles.filter((r) => r.id !== id);
    return HttpResponse.json({ success: true });
  }),

  // Policy APIs - Returns Alert Configurations
  http.get(`${API_BASE_URL}/settings/policies`, () => {
    return HttpResponse.json(mockAlertConfigurations);
  }),

  http.get(`${API_BASE_URL}/settings/policies/:id`, ({ params }) => {
    const { id } = params;
    const alert = mockAlertConfigurations.find((a) => a.id === id);
    if (!alert) {
      return HttpResponse.json({ error: 'Alert configuration not found' }, { status: 404 });
    }
    return HttpResponse.json(alert);
  }),

  http.post(`${API_BASE_URL}/settings/policies`, async ({ request }) => {
    const data = (await request.json()) as any;
    const newId = String(Math.max(...mockAlertConfigurations.map((a) => parseInt(a.id) || 0), 0) + 1);
    const newAlert = {
      id: newId,
      ...data,
      createdAt: new Date().toISOString(),
    };
    mockAlertConfigurations.push(newAlert);
    return HttpResponse.json(newAlert, { status: 201 });
  }),

  http.put(`${API_BASE_URL}/settings/policies/:id`, async ({ params, request }) => {
    const { id } = params;
    const data = (await request.json()) as any;
    const index = mockAlertConfigurations.findIndex((a) => a.id === id);
    if (index === -1) {
      return HttpResponse.json({ error: 'Alert configuration not found' }, { status: 404 });
    }
    mockAlertConfigurations[index] = {
      ...mockAlertConfigurations[index],
      ...data,
    };
    return HttpResponse.json(mockAlertConfigurations[index]);
  }),

  http.delete(`${API_BASE_URL}/settings/policies/:id`, ({ params }) => {
    const { id } = params;
    mockAlertConfigurations = mockAlertConfigurations.filter((a) => a.id !== id);
    return HttpResponse.json({ success: true });
  }),

  http.post(`${API_BASE_URL}/settings/policies/:id/clone`, ({ params }) => {
    const { id } = params;
    const policy = mockPolicies.find((p) => p.id === id);
    if (!policy) {
      return HttpResponse.json({ error: 'Policy not found' }, { status: 404 });
    }
    const clonedPolicy: Policy = {
      ...policy,
      id: String(mockPolicies.length),
      name: `${policy.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockPolicies.push(clonedPolicy);
    return HttpResponse.json(clonedPolicy, { status: 201 });
  }),

  http.post(`${API_BASE_URL}/settings/policies/:id/disable`, ({ params }) => {
    const { id } = params;
    const index = mockPolicies.findIndex((p) => p.id === id);
    if (index !== -1) {
      mockPolicies[index].status = 'Inactive';
    }
    return HttpResponse.json({ success: true });
  }),

  http.get(`${API_BASE_URL}/settings/policies/:id/affected-users`, ({ params }) => {
    return HttpResponse.json(mockUsers.slice(0, 5));
  }),

  http.get(`${API_BASE_URL}/settings/policies/:id/audit`, ({ params }) => {
    return HttpResponse.json([
      { action: 'Created', timestamp: '2024-01-15T10:00:00Z', by: 'Alice Johnson' },
      { action: 'Modified', timestamp: '2024-02-01T10:00:00Z', by: 'Alice Johnson' },
    ]);
  }),

  // Organization APIs
  http.get(`${API_BASE_URL}/settings/organizations`, () => {
    return HttpResponse.json(mockOrganizations);
  }),

  http.get(`${API_BASE_URL}/settings/organizations/:id`, ({ params }) => {
    const { id } = params;
    const org = mockOrganizations.find((o) => o.id === id);
    if (!org) {
      return HttpResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    return HttpResponse.json(org);
  }),

  http.post(`${API_BASE_URL}/settings/organizations`, async ({ request }) => {
    const data = (await request.json()) as any;
    const newOrg = {
      id: String(mockOrganizations.length),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockOrganizations.push(newOrg);
    return HttpResponse.json(newOrg, { status: 201 });
  }),

  http.put(`${API_BASE_URL}/settings/organizations/:id`, async ({ params, request }) => {
    const { id } = params;
    const data = (await request.json()) as any;
    const index = mockOrganizations.findIndex((o) => o.id === id);
    if (index === -1) {
      return HttpResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    mockOrganizations[index] = {
      ...mockOrganizations[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(mockOrganizations[index]);
  }),

  http.delete(`${API_BASE_URL}/settings/organizations/:id`, ({ params }) => {
    const { id } = params;
    mockOrganizations = mockOrganizations.filter((o) => o.id !== id);
    return HttpResponse.json({ success: true });
  }),

  // Department APIs
  http.get(`${API_BASE_URL}/settings/departments`, () => {
    return HttpResponse.json(mockDepartments);
  }),

  http.get(`${API_BASE_URL}/settings/departments/:id`, ({ params }) => {
    const { id } = params;
    const dept = mockDepartments.find((d) => d.id === id);
    if (!dept) {
      return HttpResponse.json({ error: 'Department not found' }, { status: 404 });
    }
    return HttpResponse.json(dept);
  }),

  http.post(`${API_BASE_URL}/settings/departments`, async ({ request }) => {
    const data = (await request.json()) as any;
    const newDept = {
      id: String(mockDepartments.length),
      ...data,
      createdAt: new Date().toISOString(),
    };
    mockDepartments.push(newDept);
    return HttpResponse.json(newDept, { status: 201 });
  }),

  http.put(`${API_BASE_URL}/settings/departments/:id`, async ({ params, request }) => {
    const { id } = params;
    const data = (await request.json()) as any;
    const index = mockDepartments.findIndex((d) => d.id === id);
    if (index === -1) {
      return HttpResponse.json({ error: 'Department not found' }, { status: 404 });
    }
    mockDepartments[index] = { ...mockDepartments[index], ...data };
    return HttpResponse.json(mockDepartments[index]);
  }),

  http.delete(`${API_BASE_URL}/settings/departments/:id`, ({ params }) => {
    const { id } = params;
    mockDepartments = mockDepartments.filter((d) => d.id !== id);
    return HttpResponse.json({ success: true });
  }),

  // Location APIs
  http.get(`${API_BASE_URL}/settings/locations`, () => {
    return HttpResponse.json(mockLocations);
  }),

  http.get(`${API_BASE_URL}/settings/locations/:id`, ({ params }) => {
    const { id } = params;
    const location = mockLocations.find((l) => l.id === id);
    if (!location) {
      return HttpResponse.json({ error: 'Location not found' }, { status: 404 });
    }
    return HttpResponse.json(location);
  }),

  http.post(`${API_BASE_URL}/settings/locations`, async ({ request }) => {
    const data = (await request.json()) as any;
    const newLocation = {
      id: String(mockLocations.length),
      ...data,
      createdAt: new Date().toISOString(),
    };
    mockLocations.push(newLocation);
    return HttpResponse.json(newLocation, { status: 201 });
  }),

  http.put(`${API_BASE_URL}/settings/locations/:id`, async ({ params, request }) => {
    const { id } = params;
    const data = (await request.json()) as any;
    const index = mockLocations.findIndex((l) => l.id === id);
    if (index === -1) {
      return HttpResponse.json({ error: 'Location not found' }, { status: 404 });
    }
    mockLocations[index] = { ...mockLocations[index], ...data };
    return HttpResponse.json(mockLocations[index]);
  }),

  http.delete(`${API_BASE_URL}/settings/locations/:id`, ({ params }) => {
    const { id } = params;
    mockLocations = mockLocations.filter((l) => l.id !== id);
    return HttpResponse.json({ success: true });
  }),

  // Branding APIs
  http.get(`${API_BASE_URL}/settings/branding`, () => {
    return HttpResponse.json({
      companyName: 'SkenzerIQ',
      logoUrl: null,
    });
  }),

  http.post(`${API_BASE_URL}/settings/branding`, async ({ request }) => {
    const formData = await request.formData();
    const logoFile = formData.get('logo') as File | null;
    const companyName = formData.get('companyName') as string || 'SkenzerIQ';

    if (!logoFile) {
      return HttpResponse.json(
        { error: 'Logo file is required' },
        { status: 400 }
      );
    }

    // Convert file to data URL for storage
    const arrayBuffer = await logoFile.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const binaryString = String.fromCharCode(...uint8Array);
    const base64 = btoa(binaryString);
    const mimeType = logoFile.type || 'image/png';
    const logoUrl = `data:${mimeType};base64,${base64}`;

    return HttpResponse.json(
      {
        success: true,
        companyName,
        logoUrl,
        message: 'Branding settings updated successfully',
      },
      { status: 200 }
    );
  }),

  // Mail Server Configuration APIs
  http.get(`${API_BASE_URL}/settings/mail-server`, () => {
    return HttpResponse.json(mockMailServerConfig);
  }),

  http.put(`${API_BASE_URL}/settings/mail-server`, async ({ request }) => {
    const data = (await request.json()) as MailServerConfig;
    mockMailServerConfig = {
      ...mockMailServerConfig,
      ...data,
    };
    return HttpResponse.json(mockMailServerConfig);
  }),

  http.post(`${API_BASE_URL}/settings/mail-server/test`, async ({ request }) => {
    const data = (await request.json()) as MailServerConfig;
    // Simulate connection test
    if (data.smtpHost && data.smtpPort) {
      return HttpResponse.json({
        success: true,
        message: 'Mail server connection test successful',
      });
    }
    return HttpResponse.json(
      { error: 'Mail server connection failed' },
      { status: 400 }
    );
  }),

  // Proxy Server Configuration APIs
  http.get(`${API_BASE_URL}/settings/proxy-server`, () => {
    return HttpResponse.json(mockProxyServerConfig);
  }),

  http.put(`${API_BASE_URL}/settings/proxy-server`, async ({ request }) => {
    const data = (await request.json()) as ProxyServerConfig;
    mockProxyServerConfig = {
      ...mockProxyServerConfig,
      ...data,
    };
    return HttpResponse.json(mockProxyServerConfig);
  }),

  http.post(`${API_BASE_URL}/settings/proxy-server/test`, async ({ request }) => {
    const data = (await request.json()) as ProxyServerConfig;
    // Simulate connection test
    if (data.enabled && data.host && data.port) {
      return HttpResponse.json({
        success: true,
        message: 'Proxy server connection test successful',
      });
    }
    if (!data.enabled) {
      return HttpResponse.json({
        success: true,
        message: 'Proxy server is disabled',
      });
    }
    return HttpResponse.json(
      { error: 'Proxy server connection failed' },
      { status: 400 }
    );
  }),

  // Vendor Logo APIs
  http.get(`${API_BASE_URL}/settings/vendor-logos`, () => {
    return HttpResponse.json(mockVendorLogos);
  }),

  http.get(`${API_BASE_URL}/settings/vendor-logos/:id`, ({ params }) => {
    const { id } = params;
    const logo = mockVendorLogos.find((l: any) => l.id === id);
    if (!logo) {
      return HttpResponse.json({ error: 'Vendor logo not found' }, { status: 404 });
    }
    return HttpResponse.json(logo);
  }),

  http.post(`${API_BASE_URL}/settings/vendor-logos`, async ({ request }) => {
    const formData = await request.formData();
    const logoFile = formData.get('logo') as File | null;
    const name = formData.get('name') as string;
    const type = formData.get('type') as string;

    if (!logoFile) {
      return HttpResponse.json({ error: 'Logo file is required' }, { status: 400 });
    }

    // Convert file to base64 data URL
    const arrayBuffer = await logoFile.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const binaryString = String.fromCharCode(...uint8Array);
    const base64 = btoa(binaryString);
    const mimeType = logoFile.type || 'image/png';
    const logoUrl = `data:${mimeType};base64,${base64}`;

    const newLogo = {
      id: String(mockVendorLogos.length + 1),
      name,
      type,
      logoUrl,
      fileName: logoFile.name,
      fileSize: logoFile.size,
      mimeType,
      createdAt: new Date().toISOString(),
    };

    mockVendorLogos.push(newLogo);
    return HttpResponse.json(newLogo, { status: 201 });
  }),

  http.put(`${API_BASE_URL}/settings/vendor-logos/:id`, async ({ params, request }) => {
    const { id } = params;
    const formData = await request.formData();
    const index = mockVendorLogos.findIndex((l: any) => l.id === id);

    if (index === -1) {
      return HttpResponse.json({ error: 'Vendor logo not found' }, { status: 404 });
    }

    const logoFile = formData.get('logo') as File | null;
    const name = formData.get('name') as string;
    const type = formData.get('type') as string;

    let logoUrl = mockVendorLogos[index].logoUrl;
    let fileName = mockVendorLogos[index].fileName;
    let fileSize = mockVendorLogos[index].fileSize;
    let mimeType = mockVendorLogos[index].mimeType;

    // If new file uploaded, update file data
    if (logoFile) {
      const arrayBuffer = await logoFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const binaryString = String.fromCharCode(...uint8Array);
      const base64 = btoa(binaryString);
      mimeType = logoFile.type || 'image/png';
      logoUrl = `data:${mimeType};base64,${base64}`;
      fileName = logoFile.name;
      fileSize = logoFile.size;
    }

    mockVendorLogos[index] = {
      ...mockVendorLogos[index],
      name,
      type,
      logoUrl,
      fileName,
      fileSize,
      mimeType,
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json(mockVendorLogos[index]);
  }),

  http.delete(`${API_BASE_URL}/settings/vendor-logos/:id`, ({ params }) => {
    const { id } = params;
    mockVendorLogos = mockVendorLogos.filter((l: any) => l.id !== id);
    return HttpResponse.json({ success: true });
  }),

  // LDAP Server Configuration APIs
  http.get(`${API_BASE_URL}/settings/ldap-configs`, () => {
    return HttpResponse.json(mockLDAPServerConfigs);
  }),

  http.get(`${API_BASE_URL}/settings/ldap-configs/:id`, ({ params }) => {
    const { id } = params;
    const config = mockLDAPServerConfigs.find((c) => c.id === id);
    if (!config) {
      return HttpResponse.json({ error: 'LDAP configuration not found' }, { status: 404 });
    }
    return HttpResponse.json(config);
  }),

  http.post(`${API_BASE_URL}/settings/ldap-configs`, async ({ request }) => {
    const data = (await request.json()) as any;
    const newConfig: LDAPServerConfig = {
      id: String(mockLDAPServerConfigs.length),
      ...data,
      createdAt: new Date().toISOString(),
    };
    mockLDAPServerConfigs.push(newConfig);
    return HttpResponse.json(newConfig, { status: 201 });
  }),

  http.put(`${API_BASE_URL}/settings/ldap-configs/:id`, async ({ params, request }) => {
    const { id } = params;
    const data = (await request.json()) as any;

    const index = mockLDAPServerConfigs.findIndex((c) => c.id === id);
    if (index === -1) {
      return HttpResponse.json({ error: 'LDAP configuration not found' }, { status: 404 });
    }

    mockLDAPServerConfigs[index] = {
      ...mockLDAPServerConfigs[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(mockLDAPServerConfigs[index]);
  }),

  http.delete(`${API_BASE_URL}/settings/ldap-configs/:id`, ({ params }) => {
    const { id } = params;
    mockLDAPServerConfigs = mockLDAPServerConfigs.filter((c) => c.id !== id);
    return HttpResponse.json({ success: true });
  }),

  // Risk Score APIs
  http.get(`${API_BASE_URL}/settings/risk-score`, () => {
    return HttpResponse.json(mockRiskScore);
  }),

  http.put(`${API_BASE_URL}/settings/risk-score`, async ({ request }) => {
    const data = (await request.json()) as any;
    mockRiskScore = {
      ...mockRiskScore,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(mockRiskScore);
  }),

  // Remote Desktop Settings APIs
  http.get(`${API_BASE_URL}/settings/remote-desktop`, () => {
    return HttpResponse.json(mockRemoteDesktopSettings);
  }),

  http.put(`${API_BASE_URL}/settings/remote-desktop`, async ({ request }) => {
    const data = (await request.json()) as any;
    mockRemoteDesktopSettings = {
      ...mockRemoteDesktopSettings,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(mockRemoteDesktopSettings);
  }),

  http.post(`${API_BASE_URL}/settings/remote-desktop/reset`, () => {
    mockRemoteDesktopSettings = {
      id: '1',
      connectionType: 'Local',
      remoteSessionIndicator: true,
      userConsent: false,
      createdAt: '2024-01-15T10:00:00Z',
    };
    return HttpResponse.json({ success: true, message: 'Remote Desktop Settings reset to defaults' });
  }),

  // Server Settings APIs
  http.get(`${API_BASE_URL}/settings/server`, () => {
    return HttpResponse.json(mockServerSettings);
  }),

  http.put(`${API_BASE_URL}/settings/server`, async ({ request }) => {
    const data = (await request.json()) as any;
    mockServerSettings = {
      ...mockServerSettings,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(mockServerSettings);
  }),

  // Marketplace/Integration APIs
  http.get(`${API_BASE_URL}/settings/integrations`, () => {
    return HttpResponse.json(mockIntegrations);
  }),

  http.get(`${API_BASE_URL}/settings/integrations/:id`, ({ params }) => {
    const { id } = params;
    const integration = mockIntegrations.find(i => i.id === id);
    if (!integration) {
      return HttpResponse.json({ error: 'Integration not found' }, { status: 404 });
    }
    return HttpResponse.json(integration);
  }),

  http.post(`${API_BASE_URL}/settings/integrations`, async ({ request }) => {
    const data = (await request.json()) as IntegrationFormData;
    const newIntegration: Integration = {
      id: String(Date.now()),
      ...data,
      status: data.enabled ?? true,
      createdBy: 'admin@infraon.com',
      createdAt: new Date().toISOString(),
    };
    mockIntegrations.push(newIntegration);
    return HttpResponse.json(newIntegration);
  }),

  http.put(`${API_BASE_URL}/settings/integrations/:id`, async ({ params, request }) => {
    const { id } = params;
    const data = (await request.json()) as Partial<IntegrationFormData>;
    const index = mockIntegrations.findIndex(i => i.id === id);
    if (index === -1) {
      return HttpResponse.json({ error: 'Integration not found' }, { status: 404 });
    }
    mockIntegrations[index] = {
      ...mockIntegrations[index],
      ...data,
      status: data.enabled ?? mockIntegrations[index].status,
    };
    return HttpResponse.json(mockIntegrations[index]);
  }),

  http.patch(`${API_BASE_URL}/settings/integrations/:id/status`, async ({ params, request }) => {
    const { id } = params;
    const { status } = (await request.json()) as { status: boolean };
    const index = mockIntegrations.findIndex(i => i.id === id);
    if (index === -1) {
      return HttpResponse.json({ error: 'Integration not found' }, { status: 404 });
    }
    mockIntegrations[index].status = status;
    return HttpResponse.json(mockIntegrations[index]);
  }),

  http.delete(`${API_BASE_URL}/settings/integrations/:id`, ({ params }) => {
    const { id } = params;
    const index = mockIntegrations.findIndex(i => i.id === id);
    if (index === -1) {
      return HttpResponse.json({ error: 'Integration not found' }, { status: 404 });
    }
    mockIntegrations.splice(index, 1);
    return HttpResponse.json({ success: true });
  }),

  // Agent Approval Settings APIs
  http.get(`${API_BASE_URL}/settings/agent-approval`, () => {
    return HttpResponse.json(mockAgentApprovalSettings);
  }),

  http.put(`${API_BASE_URL}/settings/agent-approval`, async ({ request }) => {
    const data = (await request.json()) as AgentApprovalSettingsFormData;
    mockAgentApprovalSettings = {
      ...mockAgentApprovalSettings,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(mockAgentApprovalSettings);
  }),

  // Vulnerability Preference APIs
  http.get(`${API_BASE_URL}/settings/vulnerability-preference`, () => {
    return HttpResponse.json(mockVulnerabilityPreference);
  }),

  http.put(`${API_BASE_URL}/settings/vulnerability-preference`, async ({ request }) => {
    const data = (await request.json()) as VulnerabilityPreferenceFormData;
    mockVulnerabilityPreference = {
      ...mockVulnerabilityPreference,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(mockVulnerabilityPreference);
  }),

  http.post(`${API_BASE_URL}/settings/vulnerability-preference/sync`, () => {
    mockVulnerabilityPreference.lastSyncAt = new Date().toISOString();
    // Simulate slight increase in CVE count
    mockVulnerabilityPreference.totalCveCount =
      (mockVulnerabilityPreference.totalCveCount || 0) + Math.floor(Math.random() * 100);
    return HttpResponse.json({
      success: true,
      message: 'Vulnerability database sync initiated successfully',
    });
  }),

  // Agent Configuration APIs
  http.get(`${API_BASE_URL}/settings/agent-configuration`, () => {
    return HttpResponse.json(mockAgentConfiguration);
  }),

  http.put(`${API_BASE_URL}/settings/agent-configuration`, async ({ request }) => {
    const data = (await request.json()) as AgentConfigurationFormData;
    mockAgentConfiguration = {
      ...mockAgentConfiguration,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(mockAgentConfiguration);
  }),

  // Agent Approvals APIs
  http.get(`${API_BASE_URL}/settings/agent-approvals`, () => {
    return HttpResponse.json(mockAgentApprovals);
  }),

  http.post(`${API_BASE_URL}/settings/agent-approvals/:id/approve`, ({ params }) => {
    const { id } = params;
    const index = mockAgentApprovals.findIndex((a) => a.id === id);
    if (index === -1) {
      return HttpResponse.json({ error: 'Agent approval not found' }, { status: 404 });
    }
    mockAgentApprovals[index].status = 'Approved';
    return HttpResponse.json(mockAgentApprovals[index]);
  }),

  http.post(`${API_BASE_URL}/settings/agent-approvals/:id/reject`, ({ params }) => {
    const { id } = params;
    const index = mockAgentApprovals.findIndex((a) => a.id === id);
    if (index === -1) {
      return HttpResponse.json({ error: 'Agent approval not found' }, { status: 404 });
    }
    mockAgentApprovals[index].status = 'Rejected';
    return HttpResponse.json(mockAgentApprovals[index]);
  }),

  http.get(`${API_BASE_URL}/settings/agent-approvals/export`, async ({ request }) => {
    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'csv';

    let content = '';
    if (format === 'csv') {
      content = 'UUID,Host Name,IP Addresses,Created On,Performed By,Status\n';
      mockAgentApprovals.forEach((approval) => {
        content += `"${approval.uuid}","${approval.hostName}","${approval.ipAddresses.join(', ')}","${approval.createdOn}","${approval.performedBy}","${approval.status}"\n`;
      });
    } else {
      content = JSON.stringify(mockAgentApprovals, null, 2);
    }

    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'application/json' });
    return HttpResponse.arrayBuffer(await blob.arrayBuffer(), {
      headers: {
        'Content-Type': format === 'csv' ? 'text/csv' : 'application/json',
        'Content-Disposition': `attachment; filename="agent-approvals.${format}"`,
      },
    });
  }),

  // Enroll Secret APIs
  http.get(`${API_BASE_URL}/settings/enroll-secrets`, () => {
    return HttpResponse.json(mockEnrollSecrets);
  }),

  http.get(`${API_BASE_URL}/settings/enroll-secrets/:id`, ({ params }) => {
    const { id } = params;
    const secret = mockEnrollSecrets.find(s => s.id === id);
    if (!secret) {
      return HttpResponse.json({ error: 'Enroll secret not found' }, { status: 404 });
    }
    return HttpResponse.json(secret);
  }),

  http.post(`${API_BASE_URL}/settings/enroll-secrets`, async ({ request }) => {
    const data = (await request.json()) as EnrollSecretFormData;
    const newSecret: EnrollSecret = {
      id: String(Date.now()),
      ...data,
      createdOn: new Date().toISOString(),
    };
    mockEnrollSecrets.push(newSecret);
    return HttpResponse.json(newSecret);
  }),

  http.put(`${API_BASE_URL}/settings/enroll-secrets/:id`, async ({ params, request }) => {
    const { id } = params;
    const data = (await request.json()) as Partial<EnrollSecretFormData>;
    const index = mockEnrollSecrets.findIndex(s => s.id === id);
    if (index === -1) {
      return HttpResponse.json({ error: 'Enroll secret not found' }, { status: 404 });
    }
    mockEnrollSecrets[index] = {
      ...mockEnrollSecrets[index],
      ...data,
    };
    return HttpResponse.json(mockEnrollSecrets[index]);
  }),

  http.delete(`${API_BASE_URL}/settings/enroll-secrets/:id`, ({ params }) => {
    const { id } = params;
    const index = mockEnrollSecrets.findIndex(s => s.id === id);
    if (index === -1) {
      return HttpResponse.json({ error: 'Enroll secret not found' }, { status: 404 });
    }
    mockEnrollSecrets.splice(index, 1);
    return HttpResponse.json({ success: true });
  }),

  // Export endpoint must come before :id route
  http.get(`${API_BASE_URL}/settings/enroll-secrets/export`, async ({ request }) => {
    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'csv';

    let content = '';
    if (format === 'csv') {
      content = 'Name,Secret,Organization,Department,Created On\n';
      mockEnrollSecrets.forEach((secret) => {
        content += `"${secret.name}","${secret.secret}","${secret.organization}","${secret.department}","${new Date(secret.createdOn).toLocaleString()}"\n`;
      });
    } else {
      content = JSON.stringify(mockEnrollSecrets, null, 2);
    }

    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'application/json' });
    return HttpResponse.arrayBuffer(await blob.arrayBuffer(), {
      headers: {
        'Content-Type': format === 'csv' ? 'text/csv' : 'application/json',
        'Content-Disposition': `attachment; filename="enroll-secrets.${format}"`,
      },
    });
  }),

  // Deployment Policy APIs
  http.get(`${API_BASE_URL}/settings/deployment-policies`, () => {
    return HttpResponse.json(mockDeploymentPolicies);
  }),

  http.get(`${API_BASE_URL}/settings/deployment-policies/:id`, ({ params }) => {
    const { id } = params;
    const policy = mockDeploymentPolicies.find((p) => p.id === id);
    if (!policy) {
      return HttpResponse.json({ error: 'Deployment policy not found' }, { status: 404 });
    }
    return HttpResponse.json(policy);
  }),

  http.post(`${API_BASE_URL}/settings/deployment-policies`, async ({ request }) => {
    const data = (await request.json()) as any;
    const newPolicy: DeploymentPolicy = {
      id: `POLICY-${mockDeploymentPolicies.length + 1}`,
      ...data,
      createdBy: 'Current User',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockDeploymentPolicies.push(newPolicy);
    return HttpResponse.json(newPolicy, { status: 201 });
  }),

  http.put(`${API_BASE_URL}/settings/deployment-policies/:id`, async ({ params, request }) => {
    const { id } = params;
    const data = (await request.json()) as any;
    const index = mockDeploymentPolicies.findIndex((p) => p.id === id);
    if (index === -1) {
      return HttpResponse.json({ error: 'Deployment policy not found' }, { status: 404 });
    }
    mockDeploymentPolicies[index] = {
      ...mockDeploymentPolicies[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(mockDeploymentPolicies[index]);
  }),

  http.delete(`${API_BASE_URL}/settings/deployment-policies/:id`, ({ params }) => {
    const { id } = params;
    mockDeploymentPolicies = mockDeploymentPolicies.filter((p) => p.id !== id);
    return HttpResponse.json({ success: true });
  }),

  // Red Hat Agent Nomination APIs
  http.get(`${API_BASE_URL}/settings/red-hat-nominations`, () => {
    return HttpResponse.json(mockRedHatNominations);
  }),

  // Export endpoint must come before :id route to avoid matching /:id with /export
  http.get(`${API_BASE_URL}/settings/red-hat-nominations/export`, async ({ request }) => {
    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'csv';

    let content = '';
    if (format === 'csv') {
      content = 'Name,Status,Endpoint,Last Sync Time,Updated By,Updated At\n';
      mockRedHatNominations.forEach((nomination) => {
        content += `"${nomination.name}","${nomination.status}","${nomination.endpoint}","${nomination.lastSyncTime}","${nomination.updatedBy}","${nomination.updatedAt}"\n`;
      });
    } else {
      content = JSON.stringify(mockRedHatNominations, null, 2);
    }

    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'application/json' });
    return HttpResponse.arrayBuffer(await blob.arrayBuffer(), {
      headers: {
        'Content-Type': format === 'csv' ? 'text/csv' : 'application/json',
        'Content-Disposition': `attachment; filename="red-hat-nominations.${format}"`,
      },
    });
  }),

  http.get(`${API_BASE_URL}/settings/red-hat-nominations/:id`, ({ params }) => {
    const { id } = params;
    const nomination = mockRedHatNominations.find((n) => n.id === id);
    if (!nomination) {
      return HttpResponse.json({ error: 'Red Hat nomination not found' }, { status: 404 });
    }
    return HttpResponse.json(nomination);
  }),

  http.put(`${API_BASE_URL}/settings/red-hat-nominations/:id`, async ({ params, request }) => {
    const { id } = params;
    const data = (await request.json()) as Partial<RedHatAgentNomination>;
    const index = mockRedHatNominations.findIndex((n) => n.id === id);
    if (index === -1) {
      return HttpResponse.json({ error: 'Red Hat nomination not found' }, { status: 404 });
    }
    mockRedHatNominations[index] = {
      ...mockRedHatNominations[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(mockRedHatNominations[index]);
  }),

  // Computer Group APIs - Mock data
  http.get(`${API_BASE_URL}/settings/computer-groups`, () => {
    const mockComputerGroups: ComputerGroup[] = [
      {
        id: '1',
        name: 'Production Servers',
        description: 'All production environment servers',
        endpoints: ['endpoint-1', 'endpoint-2', 'endpoint-3'],
        endpointCount: 3,
        createdBy: 'admin@infraon.com',
        createdAt: '2024-01-15T10:00:00Z',
      },
      {
        id: '2',
        name: 'Development Workstations',
        description: 'Developer machines',
        endpoints: ['endpoint-4', 'endpoint-5'],
        endpointCount: 2,
        createdBy: 'admin@infraon.com',
        createdAt: '2024-01-20T14:30:00Z',
      },
    ];
    return HttpResponse.json(mockComputerGroups);
  }),

  http.get(`${API_BASE_URL}/settings/computer-groups/available-endpoints`, () => {
    const mockEndpoints: EndpointOption[] = [
      { id: 'endpoint-1', name: 'SERVER-PROD-01', ipAddress: '192.168.1.10', status: 'Online' },
      { id: 'endpoint-2', name: 'SERVER-PROD-02', ipAddress: '192.168.1.11', status: 'Online' },
      { id: 'endpoint-3', name: 'SERVER-PROD-03', ipAddress: '192.168.1.12', status: 'Offline' },
      { id: 'endpoint-4', name: 'DEV-WORK-01', ipAddress: '192.168.2.10', status: 'Online' },
      { id: 'endpoint-5', name: 'DEV-WORK-02', ipAddress: '192.168.2.11', status: 'Online' },
      { id: 'endpoint-6', name: 'SERVER-TEST-01', ipAddress: '192.168.3.10', status: 'Online' },
    ];
    return HttpResponse.json(mockEndpoints);
  }),

  http.get(`${API_BASE_URL}/settings/computer-groups/:id`, ({ params }) => {
    const { id } = params;
    const mockComputerGroups: ComputerGroup[] = [
      {
        id: '1',
        name: 'Production Servers',
        description: 'All production environment servers',
        endpoints: ['endpoint-1', 'endpoint-2', 'endpoint-3'],
        endpointCount: 3,
        createdBy: 'admin@infraon.com',
        createdAt: '2024-01-15T10:00:00Z',
      },
      {
        id: '2',
        name: 'Development Workstations',
        description: 'Developer machines',
        endpoints: ['endpoint-4', 'endpoint-5'],
        endpointCount: 2,
        createdBy: 'admin@infraon.com',
        createdAt: '2024-01-20T14:30:00Z',
      },
    ];
    const group = mockComputerGroups.find((g) => g.id === id);
    if (!group) {
      return HttpResponse.json({ error: 'Computer group not found' }, { status: 404 });
    }
    return HttpResponse.json(group);
  }),

  http.post(`${API_BASE_URL}/settings/computer-groups`, async ({ request }) => {
    const data = (await request.json()) as ComputerGroupFormData;
    const newGroup: ComputerGroup = {
      id: String(Date.now()),
      ...data,
      endpointCount: data.endpoints.length,
      createdBy: 'admin@infraon.com',
      createdAt: new Date().toISOString(),
    };
    return HttpResponse.json(newGroup, { status: 201 });
  }),

  http.put(`${API_BASE_URL}/settings/computer-groups/:id`, async ({ params, request }) => {
    const { id } = params;
    const data = (await request.json()) as Partial<ComputerGroupFormData>;
    const mockComputerGroups: ComputerGroup[] = [
      {
        id: '1',
        name: 'Production Servers',
        description: 'All production environment servers',
        endpoints: ['endpoint-1', 'endpoint-2', 'endpoint-3'],
        endpointCount: 3,
        createdBy: 'admin@infraon.com',
        createdAt: '2024-01-15T10:00:00Z',
      },
      {
        id: '2',
        name: 'Development Workstations',
        description: 'Developer machines',
        endpoints: ['endpoint-4', 'endpoint-5'],
        endpointCount: 2,
        createdBy: 'admin@infraon.com',
        createdAt: '2024-01-20T14:30:00Z',
      },
    ];
    const index = mockComputerGroups.findIndex((g) => g.id === id);
    if (index === -1) {
      return HttpResponse.json({ error: 'Computer group not found' }, { status: 404 });
    }
    const updatedGroup: ComputerGroup = {
      ...mockComputerGroups[index],
      ...data,
      endpointCount: data.endpoints ? data.endpoints.length : mockComputerGroups[index].endpointCount,
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(updatedGroup);
  }),

  http.delete(`${API_BASE_URL}/settings/computer-groups/:id`, ({ params }) => {
    const { id } = params;
    // Simulate deletion
    if (id === '999') {
      return HttpResponse.json({ error: 'Computer group not found' }, { status: 404 });
    }
    return HttpResponse.json({ success: true });
  }),

  // Patch Preferences APIs
  http.get(`${API_BASE_URL}/settings/patch-preferences`, () => {
    return HttpResponse.json(mockPatchPreference);
  }),

  http.put(`${API_BASE_URL}/settings/patch-preferences`, async ({ request }) => {
    const data = (await request.json()) as PatchPreferenceFormData;
    mockPatchPreference = {
      ...mockPatchPreference,
      ...data,
      lastSyncedAt: mockPatchPreference.lastSyncedAt,
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(mockPatchPreference);
  }),

  http.post(`${API_BASE_URL}/settings/patch-preferences/sync`, () => {
    mockPatchPreference = {
      ...mockPatchPreference,
      lastSyncedAt: new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }),
    };
    return HttpResponse.json({ message: 'Patch sync initiated successfully' });
  }),

  // Audit Logs APIs
  http.get(`${API_BASE_URL}/settings/audit-logs`, () => {
    const mockAuditLogs = [
      {
        id: '1',
        module: 'User',
        operation: 'Login',
        user: 'admin',
        status: 'success',
        message: 'User logged in from the machine',
        createdAt: '2026/01/16 08:10 PM',
      },
      {
        id: '2',
        module: 'User',
        operation: 'Login',
        user: 'admin',
        status: 'success',
        message: 'User logged in from the machine',
        createdAt: '2026/01/16 08:10 PM',
      },
      {
        id: '3',
        module: 'User',
        operation: 'Login',
        user: 'admin',
        status: 'success',
        message: 'User logged in from the machine',
        createdAt: '2026/01/16 08:10 PM',
      },
      {
        id: '4',
        module: 'User',
        operation: 'Login',
        user: 'admin',
        status: 'success',
        message: 'User logged in from the machine',
        createdAt: '2026/01/16 08:10 PM',
      },
      {
        id: '5',
        module: 'Patch-Performance',
        operation: 'Updates',
        user: 'admin',
        status: 'success',
        message: 'Patch-Performance modified (1 %)',
        createdAt: '2026/01/16 08:10 PM',
      },
      {
        id: '6',
        module: 'User',
        operation: 'Login',
        user: 'admin',
        status: 'success',
        message: 'User logged in from the machine',
        createdAt: '2026/01/16 08:10 PM',
      },
      {
        id: '7',
        module: 'User',
        operation: 'Login',
        user: 'admin',
        status: 'success',
        message: 'User logged in from the machine',
        createdAt: '2026/01/16 08:10 PM',
      },
      {
        id: '8',
        module: 'User',
        operation: 'Login',
        user: 'admin',
        status: 'success',
        message: 'User logged in from the machine',
        createdAt: '2026/01/16 08:10 PM',
      },
      {
        id: '9',
        module: 'User',
        operation: 'Login',
        user: 'admin',
        status: 'success',
        message: 'User logged in from the machine',
        createdAt: '2026/01/16 08:10 PM',
      },
      {
        id: '10',
        module: 'Admin',
        operation: 'Patch-Performance-modified',
        user: 'admin',
        status: 'success',
        message: 'Infra Computer Group Infra',
        createdAt: '2026/01/16 08:10 PM',
      },
      {
        id: '11',
        module: 'Admin',
        operation: 'Patch-Performance-modified',
        user: 'admin',
        status: 'success',
        message: 'Failed to update test Computer',
        createdAt: '2026/01/16 08:10 PM',
      },
      {
        id: '12',
        module: 'User',
        operation: 'Login',
        user: 'admin',
        status: 'success',
        message: 'User logged in from the machine',
        createdAt: '2026/01/16 08:10 PM',
      },
      {
        id: '13',
        module: 'User',
        operation: 'Login',
        user: 'admin',
        status: 'success',
        message: 'User logged in from the machine',
        createdAt: '2026/01/16 08:10 PM',
      },
      {
        id: '14',
        module: 'User',
        operation: 'Login',
        user: 'admin',
        status: 'success',
        message: 'User logged in from the machine',
        createdAt: '2026/01/16 08:10 PM',
      },
      {
        id: '15',
        module: 'User',
        operation: 'Login',
        user: 'admin',
        status: 'success',
        message: 'User logged in from the machine',
        createdAt: '2026/01/16 08:10 PM',
      },
      {
        id: '16',
        module: 'User',
        operation: 'Login',
        user: 'ADMIN',
        status: 'success',
        message: 'User logged in from the machine',
        createdAt: '2026/01/16 08:10 PM',
      },
      {
        id: '17',
        module: 'User',
        operation: 'Login',
        user: 'ADMIN',
        status: 'success',
        message: 'User logged in from the machine',
        createdAt: '2026/01/16 08:10 PM',
      },
      {
        id: '18',
        module: 'User',
        operation: 'Login',
        user: 'ADMIN',
        status: 'success',
        message: 'User logged in from the machine',
        createdAt: '2026/01/16 08:10 PM',
      },
      {
        id: '19',
        module: 'User',
        operation: 'Login',
        user: 'ADMIN',
        status: 'success',
        message: 'User logged in from the machine',
        createdAt: '2026/01/16 08:10 PM',
      },
      {
        id: '20',
        module: 'User',
        operation: 'Login',
        user: 'ADMIN',
        status: 'success',
        message: 'User logged in from the machine',
        createdAt: '2026/01/16 08:10 PM',
      },
    ];
    return HttpResponse.json(mockAuditLogs);
  }),

  http.get(`${API_BASE_URL}/settings/audit-logs/filter-options`, () => {
    return HttpResponse.json({
      modules: ['User', 'Admin', 'Patch-Performance', 'Policy', 'System', 'Agent', 'Patch', 'Computer Group'],
      users: ['admin', 'ADMIN', 'zirozen', 'user1', 'user2'],
      operations: ['Login', 'Create', 'Update', 'Delete', 'Export', 'Import', 'Updates', 'Patch-Performance-modified'],
    });
  }),

  // Platform License APIs
  http.get(`${API_BASE_URL}/settings/platform-license`, () => {
    const mockLicense = {
      licenseTo: 'EverestIMS',
      productCode: 'Infraon Patch Plus',
      licenseType: 'FREE',
      productVersion: '5.0.8',
      poNumber: '—',
      invoiceNumber: '—',
      email: '—',
      partner: '—',
      issueDate: '2026/01/12 12:05:20 PM',
      expiresOn: '2026/04/12 11:59:59 PM',
      numberOfEndpoints: 100,
      usedEndpoints: 11,
      activationCode: 'oqD2PCBF3DDo5wT06Xz/NaY04U4uA7MeOwn6e4o5Ek46gV7koPG3vW2gxyN4+idd',
      remainingDays: 86,
      remainingEndpoints: 89,
    };
    return HttpResponse.json(mockLicense);
  }),

  http.put(`${API_BASE_URL}/settings/platform-license`, async ({ request }) => {
    const data = (await request.json()) as { licenseCode: string };
    const mockLicense = {
      licenseTo: 'EverestIMS',
      productCode: 'Infraon Patch Plus',
      licenseType: 'PROFESSIONAL',
      productVersion: '5.0.8',
      poNumber: 'PO-2024-001',
      invoiceNumber: 'INV-2024-001',
      email: 'info@everestims.com',
      partner: 'Infraon Partner',
      issueDate: '2026/01/12 12:05:20 PM',
      expiresOn: '2027/01/12 11:59:59 PM',
      numberOfEndpoints: 500,
      usedEndpoints: 11,
      activationCode: 'oqD2PCBF3DDo5wT06Xz/NaY04U4uA7MeOwn6e4o5Ek46gV7koPG3vW2gxyN4+idd',
      remainingDays: 365,
      remainingEndpoints: 489,
      licenseCode: data.licenseCode,
    };
    return HttpResponse.json(mockLicense);
  }),

  // Distribution Server APIs
  http.get(`${API_BASE_URL}/settings/distribution-servers`, () => {
    return HttpResponse.json(mockDistributionServers);
  }),

  http.get(`${API_BASE_URL}/settings/distribution-servers/:id`, ({ params }) => {
    const { id } = params;
    const server = mockDistributionServers.find(s => s.id === id);
    if (!server) {
      return HttpResponse.json({ error: 'Distribution server not found' }, { status: 404 });
    }
    return HttpResponse.json(server);
  }),

  http.post(`${API_BASE_URL}/settings/distribution-servers`, async ({ request }) => {
    const data = (await request.json()) as DistributionServerFormData;
    const newServer: DistributionServer = {
      id: String(Date.now()),
      ...data,
      createdOn: new Date().toISOString(),
    };
    mockDistributionServers.push(newServer);
    return HttpResponse.json(newServer, { status: 201 });
  }),

  http.put(`${API_BASE_URL}/settings/distribution-servers/:id`, async ({ params, request }) => {
    const { id } = params;
    const data = (await request.json()) as Partial<DistributionServerFormData>;
    const index = mockDistributionServers.findIndex(s => s.id === id);
    if (index === -1) {
      return HttpResponse.json({ error: 'Distribution server not found' }, { status: 404 });
    }
    mockDistributionServers[index] = {
      ...mockDistributionServers[index],
      ...data,
    };
    return HttpResponse.json(mockDistributionServers[index]);
  }),

  http.delete(`${API_BASE_URL}/settings/distribution-servers/:id`, ({ params }) => {
    const { id } = params;
    const index = mockDistributionServers.findIndex(s => s.id === id);
    if (index === -1) {
      return HttpResponse.json({ error: 'Distribution server not found' }, { status: 404 });
    }
    mockDistributionServers.splice(index, 1);
    return HttpResponse.json({ success: true });
  }),

  // Export endpoint must come before :id route
  http.get(`${API_BASE_URL}/settings/distribution-servers/export`, async ({ request }) => {
    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'csv';

    let content = '';
    if (format === 'csv') {
      content = 'Name,Description,Location,URL,Version,Created On\n';
      mockDistributionServers.forEach((server) => {
        content += `"${server.name}","${server.description}","${server.location}","${server.url}","${server.version}","${new Date(server.createdOn).toLocaleString()}"\n`;
      });
    } else {
      content = JSON.stringify(mockDistributionServers, null, 2);
    }

    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'application/json' });
    return HttpResponse.arrayBuffer(await blob.arrayBuffer(), {
      headers: {
        'Content-Type': format === 'csv' ? 'text/csv' : 'application/json',
        'Content-Disposition': `attachment; filename="distribution-servers.${format}"`,
      },
    });
  }),

  // Download Distribution Server
  http.get(`${API_BASE_URL}/settings/distribution-servers/download`, async () => {
    const content = mockDistributionServers.length > 0
      ? JSON.stringify(mockDistributionServers, null, 2)
      : '';

    const blob = new Blob([content], { type: 'application/json' });
    return HttpResponse.arrayBuffer(await blob.arrayBuffer(), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="distribution-server.json"',
      },
    });
  }),
];
