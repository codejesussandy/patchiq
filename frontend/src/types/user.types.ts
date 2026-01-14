// Comprehensive User type combining auth and settings contexts
export type User = {
  // Core fields
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user' | 'manager' | string; // Support both enum and string

  // Profile fields
  avatar?: string;
  phone?: string;
  gender?: 'Male' | 'Female' | 'Others';
  timezone?: string;

  // Employment fields
  branch?: string;
  orgUnit?: string;
  dashboard?: string;

  // Status fields
  status?: 'Active' | 'Invite Sent' | 'New Account' | 'In Active';
  lastLogin?: string;

  // Security
  password?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
};

// Form data types
export type UserFormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  branch?: string;
  role: string;
  gender?: 'Male' | 'Female' | 'Others';
  timezone?: string;
  password?: string;
  dashboard?: string;
  orgUnit?: string;
};

export type InviteUserFormData = {
  email: string;
  role: string;
  orgUnit: string;
  dashboard?: string;
};
