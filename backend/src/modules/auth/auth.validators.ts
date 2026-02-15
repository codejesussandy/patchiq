import { z } from 'zod';
import { passwordSchema, phoneSchema } from '@shared/validators/common';

// Re-export commonly used schemas
export {
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  type LoginInput,
  type RefreshTokenInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from '@shared/validators/auth';

// Complete onboarding schema for authenticated users (no token required - uses JWT)
export const completeOnboardingSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must be less than 100 characters'),
    contactNumber: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm password is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;

// Onboard with token schema for invited users (no auth required - uses token from email)
export const onboardSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: passwordSchema,
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
});

export type OnboardInput = z.infer<typeof onboardSchema>;
