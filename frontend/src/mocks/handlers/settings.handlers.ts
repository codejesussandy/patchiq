import { http, HttpResponse } from 'msw';
import type { Branch, User, Role, Policy } from '../../types/settings.types';

const API_BASE_URL = 'http://localhost:3000/v1';

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
    id: '1',
    firstName: 'Alice',
    lastName: 'Johnson',
    email: 'alice.johnson@example.com',
    phone: '+1234567890',
    branch: 'Gurugram',
    role: 'Admin',
    status: 'Active',
    lastLogin: 'March 5 2024, 09:45 am',
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    firstName: 'Bob',
    lastName: 'Smith',
    email: 'bob.smith@example.com',
    phone: '+1234567891',
    branch: 'Gurugram',
    role: 'Team Manager',
    status: 'Invite Sent',
    lastLogin: 'March 5 2024, 09:45 am',
    createdAt: '2024-01-20T10:00:00Z',
  },
  {
    id: '3',
    firstName: 'Charlie',
    lastName: 'Brown',
    email: 'charlie.brown@example.com',
    phone: '+1234567892',
    branch: 'Gurugram',
    role: 'Team Manager',
    status: 'New Account',
    lastLogin: 'March 5 2024, 09:45 am',
    createdAt: '2024-02-01T10:00:00Z',
  },
  {
    id: '4',
    firstName: 'Diana',
    lastName: 'Prince',
    email: 'bob.smith@example.com',
    phone: '+1234567893',
    branch: 'Gurugram',
    role: 'Employee',
    status: 'Active',
    lastLogin: 'March 5 2024, 09:45 am',
    createdAt: '2024-02-10T10:00:00Z',
  },
  {
    id: '5',
    firstName: 'Ethan',
    lastName: 'Hunt',
    email: 'ethan.hunt@example.com',
    phone: '+1234567894',
    branch: 'Gurugram',
    role: 'Employee',
    status: 'In Active',
    lastLogin: 'March 5 2024, 09:45 am',
    createdAt: '2024-02-15T10:00:00Z',
  },
  {
    id: '6',
    firstName: 'Fiona',
    lastName: 'Gallagher',
    email: 'fiona.gallagher@example.com',
    phone: '+1234567895',
    branch: 'Gurugram',
    role: 'Admin',
    status: 'In Active',
    lastLogin: 'March 5 2024, 09:45 am',
    createdAt: '2024-02-20T10:00:00Z',
  },
];

// Mock data for roles
let mockRoles: Role[] = [
  {
    id: '1',
    name: 'Admin',
    description: 'Curabitur pretium tincidunt lacus.',
    users: 3,
    branch: 'Gurugram',
    permissions: [
      { module: 'Patches', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'Assets', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'Discovery', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'Reports', actions: ['view', 'create'] },
      { module: 'Settings', actions: ['view', 'create', 'edit', 'delete'] },
    ],
    isSystem: true,
  },
  {
    id: '2',
    name: 'Team Manager',
    description: 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip...',
    users: 1,
    branch: 'Gurugram',
    permissions: [
      { module: 'Patches', actions: ['view', 'create', 'edit'] },
      { module: 'Assets', actions: ['view', 'create'] },
      { module: 'Discovery', actions: ['view'] },
      { module: 'Reports', actions: ['view'] },
    ],
    isSystem: true,
  },
  {
    id: '3',
    name: 'IT Team',
    description: 'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    users: 3,
    branch: 'Gurugram',
    permissions: [
      { module: 'Patches', actions: ['view', 'create'] },
      { module: 'Assets', actions: ['view'] },
    ],
    isSystem: false,
  },
  {
    id: '4',
    name: 'Employee',
    description: 'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserun...',
    users: 12,
    branch: 'Gurugram',
    permissions: [
      { module: 'Patches', actions: ['view'] },
      { module: 'Assets', actions: ['view'] },
      { module: 'Discovery', actions: ['view'] },
    ],
    isSystem: true,
  },
  {
    id: '5',
    name: 'System Manager',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    users: 1,
    branch: 'Gurugram',
    permissions: [
      { module: 'Patches', actions: ['view', 'edit'] },
      { module: 'Assets', actions: ['view', 'edit'] },
      { module: 'Settings', actions: ['view'] },
    ],
    isSystem: false,
  },
  {
    id: '6',
    name: 'IT Lead',
    description: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugi...',
    users: 2,
    branch: 'Gurugram',
    permissions: [
      { module: 'Patches', actions: ['view', 'create', 'edit'] },
      { module: 'Assets', actions: ['view', 'create', 'edit'] },
      { module: 'Discovery', actions: ['view', 'create'] },
    ],
    isSystem: false,
  },
];

// Mock data for policies
let mockPolicies: Policy[] = [
  {
    id: '1',
    name: '<Policy name>',
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
      id: String(Date.now()),
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
      id: String(Date.now()),
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
      id: String(Date.now()),
      ...data,
      users: 0,
      isSystem: false,
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
    mockRoles[index] = { ...mockRoles[index], ...data };
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

  // Policy APIs
  http.get(`${API_BASE_URL}/settings/policies`, () => {
    return HttpResponse.json(mockPolicies);
  }),

  http.get(`${API_BASE_URL}/settings/policies/:id`, ({ params }) => {
    const { id } = params;
    const policy = mockPolicies.find((p) => p.id === id);
    if (!policy) {
      return HttpResponse.json({ error: 'Policy not found' }, { status: 404 });
    }
    return HttpResponse.json(policy);
  }),

  http.post(`${API_BASE_URL}/settings/policies`, async ({ request }) => {
    const data = (await request.json()) as any;
    const newPolicy: Policy = {
      id: String(Date.now()),
      ...data,
      users: 0,
      status: 'Active',
      createdBy: 'Current User',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockPolicies.push(newPolicy);
    return HttpResponse.json(newPolicy, { status: 201 });
  }),

  http.put(`${API_BASE_URL}/settings/policies/:id`, async ({ params, request }) => {
    const { id } = params;
    const data = (await request.json()) as any;
    const index = mockPolicies.findIndex((p) => p.id === id);
    if (index === -1) {
      return HttpResponse.json({ error: 'Policy not found' }, { status: 404 });
    }
    mockPolicies[index] = {
      ...mockPolicies[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(mockPolicies[index]);
  }),

  http.delete(`${API_BASE_URL}/settings/policies/:id`, ({ params }) => {
    const { id } = params;
    mockPolicies = mockPolicies.filter((p) => p.id !== id);
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
      id: String(Date.now()),
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
      id: String(Date.now()),
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
      id: String(Date.now()),
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
      id: String(Date.now()),
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
];
