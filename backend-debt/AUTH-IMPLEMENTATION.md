# Authentication & User Management Implementation Guide

## API Contract
**Spec**: `backend-debt/auth-api.yaml`

## Endpoints Overview
```
POST   /v1/auth/login              - User login
POST   /v1/auth/logout             - User logout
POST   /v1/auth/refresh            - Refresh tokens
POST   /v1/auth/forgot-password    - Request password reset
POST   /v1/auth/reset-password     - Reset password with token
POST   /v1/auth/complete-onboarding - Complete first-time setup
GET    /v1/user/me                 - Get current user
```

## Reference Implementation
- **Login**: `frontend/src/pages/Login.tsx`
- **Forgot Password**: `frontend/src/pages/ForgotPassword.tsx`
- **Onboarding**: `frontend/src/pages/UserOnboarding.tsx`
- **Service**: `frontend/src/services/auth.service.ts`
- **Mock**: `frontend/src/mocks/handlers/auth.handlers.ts`
- **Types**: `frontend/src/types/auth.types.ts`

---

## Data Models

### User
```typescript
{
  id: string;                    // UUID
  email: string;                 // unique, indexed
  name: string;
  contactNumber?: string;
  role: string;                  // admin, user, etc.
  organizationId?: string;       // FK to organizations
  departmentId?: string;         // FK to departments
  locationId?: string;           // FK to locations
  isActive: boolean;
  isOnboarded: boolean;          // false for first-time login
  createdAt: string;             // ISO 8601
  updatedAt: string;
}
```

### RefreshToken
```typescript
{
  id: string;
  userId: string;
  tokenHash: string;             // hashed token
  expiresAt: string;
  deviceInfo?: string;
  revokedAt?: string;
  createdAt: string;
}
```

---

## TDD Scenarios

### POST /v1/auth/login

**Request**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success (200)**
```json
{
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "admin",
    "isOnboarded": true
  }
}
```

**Error Cases**
| Case | Status | Response |
|------|--------|----------|
| Missing email | 400 | `{ "error": "Email is required" }` |
| Invalid email format | 400 | `{ "error": "Invalid email format" }` |
| Missing password | 400 | `{ "error": "Password is required" }` |
| Wrong credentials | 401 | `{ "error": "Invalid email or password" }` |
| Account disabled | 403 | `{ "error": "Account is disabled" }` |
| Rate limited | 429 | `{ "error": "Too many attempts" }` |

**Special Behavior**
- If `isOnboarded: false`, frontend redirects to `/onboarding`
- Rate limit: 5 attempts per 15 min per IP

---

### POST /v1/auth/forgot-password

**Request**
```json
{
  "email": "user@example.com"
}
```

**Success (200)**
```json
{
  "message": "Password reset instructions sent to email"
}
```

**Error Cases**
| Case | Status | Response |
|------|--------|----------|
| Missing email | 400 | `{ "error": "Email is required" }` |
| Invalid format | 400 | `{ "error": "Invalid email format" }` |
| Email not found | 200 | Same success response (security) |

**Notes**
- Always return success for security (don't reveal if email exists)
- Generate reset token (UUID), store hashed, expires in 1 hour
- Send email with reset link: `/reset-password?token=xxx`

---

### POST /v1/auth/reset-password

**Request**
```json
{
  "token": "reset_token_uuid",
  "password": "newPassword123",
  "confirmPassword": "newPassword123"
}
```

**Success (200)**
```json
{
  "message": "Password reset successfully"
}
```

**Error Cases**
| Case | Status | Response |
|------|--------|----------|
| Missing token | 400 | `{ "error": "Token is required" }` |
| Missing password | 400 | `{ "error": "Password is required" }` |
| Passwords don't match | 400 | `{ "error": "Passwords do not match" }` |
| Invalid token | 400 | `{ "error": "Invalid or expired token" }` |
| Expired token | 400 | `{ "error": "Invalid or expired token" }` |

---

### POST /v1/auth/complete-onboarding

**Request**
```json
{
  "name": "John Doe",
  "contactNumber": "+1234567890",
  "password": "newPassword123",
  "confirmPassword": "newPassword123"
}
```

**Success (200)**
```json
{
  "message": "Onboarding completed successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "contactNumber": "+1234567890",
    "isOnboarded": true
  }
}
```

**Error Cases**
| Case | Status | Response |
|------|--------|----------|
| Missing name | 400 | `{ "error": "Name is required" }` |
| Missing contact | 400 | `{ "error": "Contact number is required" }` |
| Missing password | 400 | `{ "error": "Password is required" }` |
| Passwords don't match | 400 | `{ "error": "Passwords do not match" }` |
| Already onboarded | 400 | `{ "error": "User already onboarded" }` |

**Validations**
- Name: min 2 chars, max 100 chars
- Contact: valid phone format
- Password: enforce password policy from settings

---

### POST /v1/auth/refresh

**Request**
```json
{
  "refreshToken": "refresh_token_here"
}
```

**Success (200)**
```json
{
  "accessToken": "new_jwt_token",
  "refreshToken": "new_refresh_token"
}
```

**Error Cases**
| Case | Status | Response |
|------|--------|----------|
| Missing token | 400 | `{ "error": "Refresh token required" }` |
| Invalid token | 401 | `{ "error": "Invalid refresh token" }` |
| Expired token | 401 | `{ "error": "Refresh token expired" }` |
| Revoked token | 401 | `{ "error": "Token has been revoked" }` |

**Notes**
- Rotate refresh token on each use
- Invalidate old refresh token

---

### POST /v1/auth/logout

**Headers**: `Authorization: Bearer <accessToken>`

**Success (200)**
```json
{
  "message": "Logged out successfully"
}
```

**Error Cases**
| Case | Status | Response |
|------|--------|----------|
| Missing token | 401 | `{ "error": "Authentication required" }` |
| Invalid token | 401 | `{ "error": "Invalid token" }` |

**Notes**
- Revoke refresh token in database
- Optionally blacklist access token until expiry

---

### GET /v1/user/me

**Headers**: `Authorization: Bearer <accessToken>`

**Success (200)**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "contactNumber": "+1234567890",
  "role": "admin",
  "organizationId": "org_uuid",
  "departmentId": "dept_uuid",
  "locationId": "loc_uuid",
  "isOnboarded": true,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**Error Cases**
| Case | Status | Response |
|------|--------|----------|
| Missing token | 401 | `{ "error": "Authentication required" }` |
| Invalid token | 401 | `{ "error": "Invalid token" }` |
| User deleted | 404 | `{ "error": "User not found" }` |

---

## Database Schema

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  contact_number VARCHAR(20),
  role VARCHAR(50) DEFAULT 'user',
  organization_id UUID REFERENCES organizations(id),
  department_id UUID REFERENCES departments(id),
  location_id UUID REFERENCES locations(id),
  is_active BOOLEAN DEFAULT true,
  is_onboarded BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  device_info TEXT,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);

CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Security Requirements

1. **Password Hashing**: bcrypt with 10+ rounds
2. **JWT**:
   - Algorithm: HS256 or RS256
   - Access token: 15 min expiry
   - Refresh token: 7 days expiry
3. **Rate Limiting**: 5 login attempts per 15 min per IP
4. **CORS**: Allow frontend origins only
5. **HTTPS**: Required in production
6. **Password Policy**: Configurable via settings

---

## Implementation Order

1. User model + password hashing
2. JWT utilities (sign, verify)
3. POST /v1/auth/login
4. Auth middleware
5. GET /v1/user/me
6. POST /v1/auth/logout
7. POST /v1/auth/refresh
8. POST /v1/auth/forgot-password
9. POST /v1/auth/reset-password
10. POST /v1/auth/complete-onboarding
