# Module: auth

## Responsibility

Handles user authentication (login, logout, token refresh), password reset flows, and first-time onboarding. Issues JWT access and refresh tokens.

## Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /v1/auth/login | Authenticate user and return tokens | No (rate limited) |
| POST | /v1/auth/refresh | Refresh access token using refresh token | No (rate limited) |
| POST | /v1/auth/forgot-password | Request password reset email | No (rate limited) |
| POST | /v1/auth/reset-password | Reset password using token from email | No (rate limited) |
| POST | /v1/auth/logout | Logout user and revoke refresh tokens | Yes |
| POST | /v1/auth/complete-onboarding | Complete first-time user setup | Yes |
| GET | /v1/user/me | Get current authenticated user | Yes |
| POST | /v1/user/onboarding | Alias for complete-onboarding (frontend expects this path) | Yes |

## Data Flow

```
Request → Controller → Validator (Zod) → Service → Prisma → Response
```

Login flow: validate credentials -> generate JWT pair (access + refresh) -> return tokens.
Password reset: generate reset token -> send email -> validate token -> update password.

## Key Files

- `auth.controller.ts` — Route handlers for login, logout, refresh, password reset, onboarding
- `auth.service.ts` — JWT generation, credential validation, password hashing
- `auth.validators.ts` — Zod schemas (loginSchema, refreshTokenSchema, forgotPasswordSchema, etc.)
- `auth.routes.ts` — Public auth routes (/v1/auth/*)
- `user.routes.ts` — Protected user routes (/v1/user/*)

## Dependencies

- **Depends on:** shared/utils (JWT helpers), middleware (rate limiting, audit)
- **Depended on by:** All modules (via authenticate middleware)

## Notes

- Rate limiting is applied to public routes (authRateLimiter, passwordResetRateLimiter)
- Audit logging on login, logout, password reset, and onboarding
- `/v1/user/onboarding` is an alias for `/v1/auth/complete-onboarding` for frontend compatibility
