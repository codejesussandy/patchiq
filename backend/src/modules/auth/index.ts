// Routes
export { authRoutes } from './auth.routes';
export { userRoutes } from './user.routes';

// Service
export { AuthService, authService } from './auth.service';

// Controller
export { AuthController, authController } from './auth.controller';

// Types
export type {
  LoginResponse,
  RefreshResponse,
  UserPublic,
  UserMeResponse,
  OnboardingResponse,
  MessageResponse,
  UserWithRelations,
} from './auth.types';

// Validators
export {
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  completeOnboardingSchema,
  type LoginInput,
  type RefreshTokenInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
  type CompleteOnboardingInput,
} from './auth.validators';
