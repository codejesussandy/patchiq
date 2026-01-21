# Frontend Integration Documentation

## Overview

This document describes the frontend integration completed to connect the React frontend to the real backend API, replacing MSW (Mock Service Worker) mocks.

## Changes Made

### 1. MSW Removal

**Files Deleted:**
- `frontend/src/mocks/` directory (14 handler files)
- `frontend/public/mockServiceWorker.js`

**Dependencies Removed:**
- `msw` package uninstalled from devDependencies
- `msw` configuration section removed from package.json

**Code Cleanup:**
- `frontend/src/main.tsx` - Removed MSW initialization code

### 2. API Configuration

**Environment Variables (`frontend/.env.development`):**
```
VITE_API_BASE_URL=http://localhost:3000/v1
```

**API Service (`frontend/src/services/api.service.ts`):**
- Base URL from environment variable
- Request interceptor for auth token
- Response interceptor for 401 handling

### 3. Path Aliases Configured

**tsconfig.app.json:**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@shared/*": ["../shared/*"]
    }
  },
  "include": ["src", "../shared"]
}
```

**vite.config.ts:**
```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
    '@shared': path.resolve(__dirname, '../shared'),
  },
}
```

## Services Updated

All frontend services are configured to work with the real backend API. They handle both array and paginated responses:

| Service | File | Status |
|---------|------|--------|
| Auth | `auth.service.ts` | Ready |
| Assets | `asset.service.ts` | Ready |
| Agents | `agent.service.ts` | Ready |
| Discovery | `discovery.service.ts` | Ready |
| Patches | `patch.service.ts` | Ready |
| Vulnerabilities | `vulnerability.service.ts` | Ready |
| Dashboard | `dashboard.service.ts` | Ready |
| Reports | `reports.service.ts` | Ready |
| Settings | `settings.service.ts` | Ready |
| Category | `category.service.ts` | Ready |
| Tag | `tag.service.ts` | Ready |
| Notification | `notification.service.ts` | Ready |

## API Response Handling

Services handle paginated responses from the backend:

```typescript
// List endpoints return paginated data
async getAssets(): Promise<Asset[]> {
  const response = await api.get(`/assets`);
  // Backend returns { data, total, page, limit, totalPages }
  return response.data.data || [];
}

// Single item endpoints return the item directly
async getAsset(id: string): Promise<Asset> {
  const response = await api.get(`/assets/${id}`);
  return response.data;
}
```

## Endpoint Mappings

All endpoints use the `/v1` prefix (configured in base URL):

| Frontend Service Method | Backend Endpoint |
|------------------------|------------------|
| `authService.login()` | `POST /v1/auth/login` |
| `assetService.getAssets()` | `GET /v1/assets` |
| `assetService.getAsset(id)` | `GET /v1/assets/:id` |
| `assetService.getAssetHardware(id)` | `GET /v1/assets/:id/hardware` |
| `assetService.getAssetSoftware(id)` | `GET /v1/assets/:id/software` |
| `assetService.getAssetTelemetry(id)` | `GET /v1/assets/:id/telemetry` |
| `agentService.getAgents()` | `GET /v1/agents` |
| `patchService.getPatches()` | `GET /v1/patches` |
| `vulnerabilityService.getVulnerabilities()` | `GET /v1/vulnerabilities` |

## Authentication Flow

1. User submits login form with email/password
2. `authService.login()` calls `POST /v1/auth/login`
3. Backend returns `{ accessToken, refreshToken, user }`
4. Tokens stored in localStorage
5. All subsequent API calls include `Authorization: Bearer <token>` header
6. 401 responses trigger logout and redirect to login page

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@patchiq.io | admin123 |
| Demo | demo@patchiq.io | demo123 |

## Running the Application

```bash
# Terminal 1: Start Backend
cd backend && npm run dev

# Terminal 2: Start Frontend
cd frontend && npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:3000

## Verification Checklist

- [x] MSW mocks folder deleted
- [x] MSW uninstalled from package.json
- [x] No MSW references in source code
- [x] Frontend builds without errors
- [x] API base URL configured via environment variable
- [x] Auth token interceptor working
- [x] Path aliases configured for shared types

## Known Issues / Future Work

1. **CORS**: If CORS errors occur, ensure backend has proper CORS configuration for localhost:5173
2. **Empty Data**: Some pages may show empty data until database is seeded
3. **Type Mismatches**: Some frontend types may need updates as backend evolves

## Type System

The frontend can import shared types from `@shared/types`:

```typescript
import type { Asset, User } from '@shared/types';
```

Local frontend types are in `frontend/src/types/` and may have additional UI-specific fields.
