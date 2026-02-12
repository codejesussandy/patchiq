import { User, Organization, Department, Location } from '@prisma/client';

// Re-export shared API types
export type {
  UserPublic,
  UserMeResponse,
  MessageResponse,
} from '@shared/types';

// Keep Prisma-specific internal types
export type UserWithRelations = User & {
  organization?: Organization | null;
  department?: Department | null;
  location?: Location | null;
};

// Keep internal service types (shape matches shared LoginResponseData but name differs)
export type { LoginResponseData as LoginResponse } from '@shared/types';
export type { RefreshTokenResponseData as RefreshResponse } from '@shared/types';
export type { OnboardingResponseData as OnboardingResponse } from '@shared/types';
