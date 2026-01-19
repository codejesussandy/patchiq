import { User, Organization, Department, Location } from '@prisma/client';

// User with relations
export type UserWithRelations = User & {
  organization?: Organization | null;
  department?: Department | null;
  location?: Location | null;
};

// Login response
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserPublic;
}

// Refresh token response
export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

// Public user data (safe to expose)
export interface UserPublic {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isOnboarded: boolean;
  organizationId?: string | null;
  departmentId?: string | null;
  locationId?: string | null;
}

// User me response (more detailed)
export interface UserMeResponse {
  id: string;
  email: string;
  name: string | null;
  contactNumber: string | null;
  role: string;
  organizationId: string | null;
  departmentId: string | null;
  locationId: string | null;
  isOnboarded: boolean;
  createdAt: string;
}

// Onboarding response
export interface OnboardingResponse {
  message: string;
  user: {
    id: string;
    email: string;
    name: string;
    contactNumber: string | null;
    isOnboarded: boolean;
  };
}

// Message response
export interface MessageResponse {
  message: string;
}
