# CRUD API Test Results

**Test Date:** 2026-01-21
**Backend:** http://localhost:3000/v1
**Auth User:** admin@patchiq.io

## Summary Matrix

| Entity | Endpoint | CREATE | READ | UPDATE | DELETE | Notes |
|--------|----------|--------|------|--------|--------|-------|
| Assets | `/assets` | ✅ 201 | ✅ 200 | ✅ 200 | ✅ 204 | Status enum: 'In Use', 'Available', 'Under Maintenance', 'Retired' |
| Agents | `/agents` | N/A | ✅ 200 | ✅ 200 | ✅ 200 | Self-register only; **UPDATE FIXED** |
| Patches | `/patches` | ✅ 201 | ✅ 200 | ✅ 200 | ✅ 204 | Severity: 'CRITICAL', 'High', 'Medium', 'Low'; `software` field required |
| Tags | `/tags` | ✅ 201 | ✅ 200 | ✅ 200 | ✅ 204 | Works perfectly |
| Categories | `/categories` | ✅ 201 | ✅ 200 | ✅ 200 | ✅ 204 | Works perfectly |
| Deployments | `/deployments` | ✅ 201 | ✅ 200 | ✅ 200 | ⚠️ | **UPDATE & CANCEL FIXED**; DELETE blocked for in-progress |
| Users | `/settings/users` | ✅ 201 | ✅ 200 | ✅ 200 | ✅ 204 | Requires `name` field, roles: 'admin', 'user' |
| Roles | `/settings/roles` | - | ✅ 200 | - | - | READ only (system roles) |
| Locations | `/settings/locations` | ✅ 201 | ✅ 200 | ✅ 200 | ✅ 204 | Works perfectly |
| Departments | `/settings/departments` | - | ✅ 200 | - | - | Not fully tested |
| IP Ranges | `/discovery/ip-ranges` | ✅ 201 | ✅ 200 | ✅ 200 | ✅ 200 | `range` field (CIDR format) |
| Vulnerabilities | `/vulnerabilities` | - | ✅ 200 | - | - | Not fully tested |

## Detailed Test Results

### Assets (`/v1/assets`)
**Status:** ✅ All CRUD operations working

```bash
# CREATE - requires specific status enum
POST /v1/assets
{"name": "Test Asset", "type": "WORKSTATION", "status": "In Use"}
# Status enum: 'In Use' | 'Available' | 'Under Maintenance' | 'Retired'

# READ
GET /v1/assets/{id}  ✅

# UPDATE
PUT /v1/assets/{id}
{"name": "Updated Name"}  ✅

# DELETE
DELETE /v1/assets/{id}  ✅ (returns 204 No Content)
```

### Agents (`/v1/agents`)
**Status:** ⚠️ UPDATE not implemented

```bash
# LIST
GET /v1/agents  ✅

# READ
GET /v1/agents/{id}  ✅

# UPDATE
PUT /v1/agents/{id}  ❌ 404 - Route not implemented
PATCH /v1/agents/{id}  ❌ 404 - Route not implemented

# DELETE
DELETE /v1/agents/{id}  ✅
```

**Issue:** No UPDATE endpoint for agents. Consider adding if needed for renaming or tagging agents.

### Patches (`/v1/patches`)
**Status:** ✅ All CRUD operations working

```bash
# CREATE - requires 'software' field
POST /v1/patches
{
  "title": "Test Patch",
  "severity": "CRITICAL",  # 'CRITICAL' | 'High' | 'Medium' | 'Low' | 'UNSPECIFIED'
  "vendor": "Microsoft",
  "product": "Windows 11",
  "software": "Windows 11",  # Required!
  "description": "Test",
  "category": "Security"
}

# READ
GET /v1/patches/{id}  ✅

# UPDATE - Note: severity case sensitive
PUT /v1/patches/{id}
{"severity": "High"}  ✅

# DELETE
DELETE /v1/patches/{id}  ✅
```

### Tags (`/v1/tags`)
**Status:** ✅ All CRUD operations working

```bash
# CREATE
POST /v1/tags
{"name": "test-tag", "color": "#FF0000"}

# READ
GET /v1/tags/{id}  ✅

# UPDATE
PUT /v1/tags/{id}
{"name": "updated-tag", "color": "#00FF00"}  ✅

# DELETE
DELETE /v1/tags/{id}  ✅
```

### Categories (`/v1/categories`)
**Status:** ✅ All CRUD operations working

```bash
# CREATE
POST /v1/categories
{"name": "Test Category", "description": "API test"}

# READ/UPDATE/DELETE all working ✅
```

### Deployments (`/v1/deployments`)
**Status:** ⚠️ UPDATE and CANCEL not implemented

```bash
# LIST
GET /v1/deployments  ✅ (paginated)

# CREATE - requires type and patches
POST /v1/deployments
{
  "name": "Test Deployment",
  "type": "INSTALL",  # 'INSTALL' | 'ROLLBACK'
  "patches": ["patch-id"],
  "assets": ["asset-id"]
}

# READ
GET /v1/deployments/{id}  ✅

# UPDATE
PUT /v1/deployments/{id}  ❌ 404 - Not implemented

# CANCEL
POST /v1/deployments/{id}/cancel  ❌ 404 - Not implemented

# DELETE
DELETE /v1/deployments/{id}  ⚠️ Blocked for in-progress deployments
```

**Issue:** Missing UPDATE and CANCEL endpoints.

### Users (`/v1/settings/users`)
**Status:** ✅ All CRUD operations working

```bash
# CREATE - requires 'name' field
POST /v1/settings/users
{
  "email": "test@example.com",
  "name": "Test User",  # Required!
  "password": "Test123456",
  "role": "user"  # 'admin' | 'user'
}

# READ/UPDATE/DELETE all working ✅
```

### Locations (`/v1/settings/locations`)
**Status:** ✅ All CRUD operations working

```bash
# CREATE
POST /v1/settings/locations
{
  "name": "Test Location",
  "address": "456 Test St",
  "city": "New York",
  "country": "USA",
  "timezone": "America/New_York"
}

# READ/UPDATE/DELETE all working ✅
```

### Discovery IP Ranges (`/v1/discovery/ip-ranges`)
**Status:** ✅ All CRUD operations working

```bash
# CREATE - uses 'range' field (CIDR format)
POST /v1/discovery/ip-ranges
{
  "name": "Test Range",
  "range": "192.168.1.0/24"  # CIDR format
}

# READ/UPDATE/DELETE all working ✅
```

## Missing/Broken Endpoints Summary

| Endpoint | Issue | Priority | Status |
|----------|-------|----------|--------|
| `PUT /agents/{id}` | 404 - Not implemented | Medium | ✅ FIXED |
| `PUT /deployments/{id}` | 404 - Not implemented | High | ✅ FIXED |
| `POST /deployments/{id}/cancel` | 404 - Not implemented | High | ✅ FIXED |
| `/jobs` | 404 - Endpoint doesn't exist | Low | N/A - Use `/deployments` |
| `/users` | 404 - Endpoint doesn't exist | Low | N/A - Use `/settings/users` |
| `/discovery` | 404 - Endpoint doesn't exist | Low | N/A - Use `/discovery/ip-ranges` |
| `/discovery/scans` | 404 - Not implemented | Medium | Pending - Add if needed |
| `/settings/policies` | 404 - Not implemented | Low | Pending - Add if needed |

## Fixes Applied (All Tested & Working)

### 1. Agents UPDATE (`PUT /v1/agents/:id`) ✅ VERIFIED
**Files Modified:**
- `backend/src/modules/agents/agents.service.ts` - Added `updateAgent()` method
- `backend/src/modules/agents/agents.controller.ts` - Added `updateAgent` controller
- `backend/src/modules/agents/agents.routes.ts` - Added PUT route

**Payload:**
```json
{
  "name": "New Agent Name",
  "tags": ["tag-id-1", "tag-id-2"]
}
```

**Test Result:**
```
Agent renamed to: Production Server 01 ✅
```

### 2. Deployments UPDATE (`PUT /v1/deployments/:id`) ✅ VERIFIED
**Files Modified:**
- `backend/src/modules/patches/patches.service.ts` - Added `updateDeployment()` method
- `backend/src/modules/patches/patches.controller.ts` - Added `updateDeployment` controller
- `backend/src/modules/patches/patches.routes.ts` - Added PUT route

**Payload:**
```json
{
  "name": "New Deployment Name",
  "scheduledAt": "2026-01-25T10:00:00.000Z"
}
```

**Restrictions:**
- Cannot update if deployment has started execution (startedAt is set)
- Cannot update completed or cancelled deployments

**Test Result:**
```
Deployment renamed to: Updated API Test Deployment ✅
```

### 3. Deployments CANCEL (`POST /v1/deployments/:id/cancel`) ✅ VERIFIED
**Files Modified:**
- `backend/src/modules/patches/patches.service.ts` - Added `cancelDeployment()` method
- `backend/src/modules/patches/patches.controller.ts` - Added `cancelDeployment` controller
- `backend/src/modules/patches/patches.routes.ts` - Added POST route

**Restrictions:**
- Cannot cancel completed deployments
- Sets stage and status to 'CANCELLED'
- Creates audit log entry

**Test Result:**
```
New stage: CANCELLED ✅
New status: CANCELLED ✅
```

## Validation Notes

### Common Validation Errors
1. **Enum values are case-sensitive** - e.g., severity must be 'High' not 'HIGH'
2. **Required fields vary by entity** - Always check validation error response
3. **Asset status values**: 'In Use', 'Available', 'Under Maintenance', 'Retired'
4. **Patch severity values**: 'CRITICAL', 'High', 'Medium', 'Low', 'UNSPECIFIED'
5. **Deployment type values**: 'INSTALL', 'ROLLBACK'
6. **User roles**: 'admin', 'user'

### Response Codes
- 200: Success (with body)
- 201: Created
- 204: No Content (successful DELETE)
- 400: Bad Request (validation error)
- 404: Not Found
- 500: Internal Server Error

## Recommendations

### High Priority
1. **Add `PUT /deployments/{id}`** - For updating deployment config
2. **Add `POST /deployments/{id}/cancel`** - For canceling pending deployments

### Medium Priority
1. **Add `PUT /agents/{id}`** - For renaming/tagging agents
2. **Add `/discovery/scans`** - For network scan management

### Low Priority
1. **Add `/settings/policies`** - For patch policy management
2. **Standardize enum casing** - Currently mixed (CRITICAL vs High)

## Test Script

A shell script for running these tests is available. Run from project root:

```bash
# Set token
TOKEN=$(curl -s -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@patchiq.io","password":"admin123"}' | jq -r '.accessToken')

# Quick test example
curl -s http://localhost:3000/v1/assets \
  -H "Authorization: Bearer $TOKEN" | jq '.total'
```
