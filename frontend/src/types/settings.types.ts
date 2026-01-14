import { User, UserFormData, InviteUserFormData } from './user.types';

// Branch Location Types
export type Branch = {
  id: string;
  name: string;
  status: 'Default' | 'Active' | 'Inactive';
  users: number;
  assets: number;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  phone: string;
  email: string;
  manager: string;
  isDefault: boolean;
  description?: string;
};

export type BranchFormData = Omit<Branch, 'id' | 'users' | 'assets' | 'status'>;

// Re-export User types for convenience
export type { User, UserFormData, InviteUserFormData } from './user.types';

export type Role = {
  id: string;
  name: string;
  description: string;
  users: number;
  branch: string;
  permissions: Permission[];
  isSystem: boolean;
};

export type Permission = {
  module: string;
  actions: string[]; // ['view', 'create', 'edit', 'delete']
};

export type RoleFormData = {
  name: string;
  description: string;
  branch: string;
  permissions: Permission[];
  template?: string;
};

// Policy Types
export type Policy = {
  id: string;
  name: string;
  type: string;
  orgUnit: string;
  users: number;
  description: string;
  configuration: PolicyConfiguration;
  affectedRoles: string[];
  effectiveDate?: string;
  status: 'Active' | 'Inactive' | 'Draft';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type PolicyConfiguration = {
  // Password Policy
  resetDuration?: string;
  changeEveryDays?: number;
  lastNPasswordHistory?: number;
  minCharacterCount?: number;
  maxCharacterCount?: number;
  minUpperCaseCharacters?: number;
  minNumbers?: number;
  minSpecialCharacters?: number;

  // Other policy types can have different configurations
  [key: string]: any;
};

export type PolicyFormData = {
  name: string;
  type: string;
  branch: string;
  roles: string[];
  description: string;
  configuration: PolicyConfiguration;
};
