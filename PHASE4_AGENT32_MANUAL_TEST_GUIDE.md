# PHASE 4 - AGENT 32: Manual RBAC Permission Testing Guide

**Last Updated**: February 17, 2026
**Environment**: Local Development (http://localhost:5173)
**Test Duration**: ~30-45 minutes for full suite

---

## Quick Start

### Prerequisites
- Backend services running (PostgreSQL, Redis, MinIO)
- Frontend running (http://localhost:5173)
- Backend API running (http://localhost:3000)
- Postman or curl available for API testing
- Browser DevTools open (Chrome/Firefox)

### Service Startup
```bash
# Terminal 1: Start infrastructure
make dev-services

# Terminal 2: Start backend
cd backend && npm run dev

# Terminal 3: Start frontend
cd frontend && npm run dev

# Verify:
# - Frontend: http://localhost:5173 (login page)
# - Backend: http://localhost:3000/api-docs (API docs)
# - PostgreSQL: localhost:4500
# - Redis: localhost:4501
```

---

## Test Execution Plan

### Phase 1: Admin User Baseline (15 minutes)

#### Step 1.1: Login as Admin
1. Navigate to http://localhost:5173/login
2. Enter: `admin@patchiq.io` / `admin123`
3. Click "Login"
4. **Expected**: Dashboard loads without errors
5. **Screenshot**: `admin-01-dashboard-login.png`

#### Step 1.2: Verify Admin Role Display
1. Look for user menu (top-right corner)
2. Check if role displays as "admin" or similar
3. **Expected**: Role visible in user profile
4. **Screenshot**: `admin-02-user-profile.png`

#### Step 1.3: Test Assets Module (Admin)
1. Navigate to http://localhost:5173/assets
2. **Verify Present**:
   - [ ] Table/list of assets loads
   - [ ] "Create Asset" or "Add Asset" button visible
   - [ ] Edit button visible in table rows
   - [ ] Delete button visible in table rows
3. **Screenshot**: `admin-03-assets-full-access.png`

#### Step 1.4: Test Settings Module (Admin)
1. Navigate to http://localhost:5173/settings
2. **Verify Present**:
   - [ ] Settings page loads (no 403 error)
   - [ ] Organization settings form visible
   - [ ] User management section accessible
   - [ ] All forms are editable (not disabled)
3. **Screenshot**: `admin-04-settings-full-access.png`

#### Step 1.5: Test Patches Module (Admin)
1. Navigate to http://localhost:5173/patches
2. **Verify Present**:
   - [ ] Patch list loads
   - [ ] "Create Patch" or "Deploy" button visible
   - [ ] Edit/Delete options available
3. **Screenshot**: `admin-05-patches-full-access.png`

#### Step 1.6: Logout Admin
1. Click user menu (top-right)
2. Click "Logout"
3. **Expected**: Redirect to /login page
4. **Screenshot**: `admin-06-logout-redirect.png`

---

### Phase 2: Read-Only User Permission Tests (20 minutes)

#### Step 2.1: Login as Demo (Read-Only)
1. Navigate to http://localhost:5173/login
2. Enter: `demo@patchiq.io` / `demo123`
3. Click "Login"
4. **Expected**: Dashboard loads
5. **Screenshot**: `demo-01-dashboard-login.png`

#### Step 2.2: Verify Demo Role Display
1. Look for user menu
2. Check role display (should not show "admin")
3. **Expected**: Role shows as "user", "demo", or "read-only"
4. **Screenshot**: `demo-02-user-profile.png`

#### Step 2.3: Test Assets Module (Demo) - Read Access

**Test Case**: View Assets (Should Work)
1. Navigate to http://localhost:5173/assets
2. **Verify Present**:
   - [ ] Asset list/table loads and displays data
   - [ ] Can see existing assets
3. **Expected**: Read access works
4. **Screenshot**: `demo-03-assets-list-visible.png`

#### Step 2.4: Test Assets Module (Demo) - Create Button

**Test Case**: Create Asset Button (Should Be Hidden/Disabled)
1. Still on `/assets` page
2. Look for "Create Asset" button
3. **If Button Exists**:
   - [ ] Check if it's disabled (grayed out, no cursor)
   - **Screenshot**: `demo-04-assets-create-disabled.png`
4. **If Button Missing**:
   - [ ] Button is not in DOM
   - **Screenshot**: `demo-04-assets-create-hidden.png`
5. **If Button is Clickable** (possible but shouldn't happen):
   - Proceed to Step 2.5

#### Step 2.5: Test Asset Create API Permission

**Prerequisite**: Have at least one asset in the system

1. Open DevTools (F12 → Network tab)
2. Click "Create Asset" button (if it's clickable)
3. Fill in a test asset name: "Test Asset - Permission Check"
4. Open Network tab to watch request
5. Click "Create" button
6. **Observe Network Tab**:
   - Look for `POST /v1/assets` request
   - Check Response Status
   - Check Response Body

**Expected Network Response**:
```
Request: POST /v1/assets
Status: 403 Forbidden
Response Body:
{
  "success": false,
  "error": {
    "code": "Forbidden",
    "message": "You do not have permission to add assets"
  }
}
```

**Alternative Behavior** (if UI is blocking):
- No request appears in Network tab
- UI shows error toast/modal: "You do not have permission to create assets"

7. **Screenshots**:
   - `demo-05-assets-create-api-403.png` (Network tab)
   - `demo-05b-assets-create-error-message.png` (Toast/modal)

#### Step 2.6: Test Asset Edit Button

1. On `/assets` page, click any asset row or "Details" button
2. Look for "Edit" button
3. **If Button Missing**:
   - [ ] Blocked at UI level
   - **Screenshot**: `demo-06-assets-edit-hidden.png`
4. **If Button Disabled**:
   - [ ] Blocked at UI level
   - **Screenshot**: `demo-06-assets-edit-disabled.png`
5. **If Button Clickable**:
   - Open Network tab
   - Click "Edit"
   - **Expected**: 403 error or error message
   - **Screenshots**: Network tab + error message

#### Step 2.7: Test Asset Delete Button

1. Still on asset details
2. Look for "Delete" button (usually red/danger colored)
3. **If Button Missing**:
   - [ ] Blocked at UI level
   - **Screenshot**: `demo-07-assets-delete-hidden.png`
4. **If Button Disabled**:
   - [ ] Grayed out, no cursor change
   - **Screenshot**: `demo-07-assets-delete-disabled.png`
5. **If Button Clickable**:
   - Open Network tab
   - Click "Delete"
   - **Expected**: 403 error or confirmation modal with error
   - **Screenshots**: Network tab + error message

#### Step 2.8: Test Patch Deployment

1. Navigate to http://localhost:5173/patches
2. **Verify**: Patch list loads (read access should work)
3. **Screenshot**: `demo-08-patches-list-visible.png`
4. Look for "Deploy" button or create patch option
5. **If Button Missing**:
   - [ ] Blocked at UI level (good)
   - **Screenshot**: `demo-08-patches-deploy-hidden.png`
6. **If Button Disabled**:
   - [ ] Disabled (good)
   - **Screenshot**: `demo-08-patches-deploy-disabled.png`
7. **If Button Clickable**:
   - Open Network tab
   - Try to create/deploy patch
   - **Expected**: 403 error
   - **Screenshot**: Network response

#### Step 2.9: Test Settings Access (Should Be Blocked)

1. Navigate to http://localhost:5173/settings
2. **Observe Behavior**:
   - **Option A**: Page loads but shows "Access Denied" message
   - **Option B**: Redirect to home/dashboard automatically
   - **Option C**: 403 error page
3. **Expected**: NOT showing settings forms
4. **Screenshot**: `demo-09-settings-access-denied.png`
5. Open Network tab to check for 403:
   - If page loads, look for GET `/v1/settings*` requests
   - **Expected**: Any settings API calls should return 403
   - **Screenshot**: `demo-09-settings-api-403.png` (Network tab)

#### Step 2.10: Test User Management (Settings Sub-section)

1. Navigate to http://localhost:5173/settings/users
2. **Expected**: Same as Step 2.9 (denied)
3. **Screenshot**: `demo-10-users-settings-denied.png`

#### Step 2.11: Test Hub Access (Should Be Blocked)

1. Navigate to http://localhost:5173/hub (if route exists)
2. **Expected**: Access denied or 403 page
3. **Screenshot**: `demo-11-hub-access-denied.png`
4. Check Network tab for API calls:
   - Look for `/v1/hub*` requests
   - **Expected**: 403 responses
   - **Screenshot**: Network tab

#### Step 2.12: Test Dashboard Access (Should Work)

1. Navigate to http://localhost:5173 (dashboard)
2. **Expected**: Dashboard loads with data
3. **Verify Read-Only**:
   - [ ] Can view statistics/cards
   - [ ] Cannot click "Create" buttons if present
4. **Screenshot**: `demo-12-dashboard-visible.png`

#### Step 2.13: Test Vulnerabilities Module (Demo)

1. Navigate to http://localhost:5173/vulnerabilities
2. **Expected**: Can view vulnerability list
3. Look for "Create" or management buttons
4. **Expected**: Buttons hidden or disabled
5. **Screenshot**: `demo-13-vulnerabilities-read-only.png`

#### Step 2.14: Test Session Logout (Demo)

1. Click user menu (top-right)
2. Click "Logout"
3. **Expected**: Redirect to /login
4. **Screenshot**: `demo-14-logout-redirect.png`

#### Step 2.15: Test Post-Logout Access (Important!)

1. After logout, try direct navigation: http://localhost:5173/assets
2. **Expected**: Redirect to /login (not 403, not crash)
3. **Observation**:
   - [ ] Redirects to login successfully
   - [ ] No "404 Page Not Found" error
   - [ ] No crash or blank page
4. **Screenshot**: `demo-15-direct-nav-redirect-to-login.png`

---

### Phase 3: API Testing with Postman/Curl (10 minutes)

#### Setup: Collect Auth Tokens

**Get Admin Token**:
```bash
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@patchiq.io",
    "password": "admin123"
  }' | jq '.data.accessToken' > admin-token.txt
```

**Get Demo Token**:
```bash
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@patchiq.io",
    "password": "demo123"
  }' | jq '.data.accessToken' > demo-token.txt
```

#### Test 3.1: Admin Can Create Asset

```bash
ADMIN_TOKEN=$(cat admin-token.txt | tr -d '"')

curl -X POST http://localhost:3000/v1/assets \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin Test Asset",
    "type": "SERVER"
  }'
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "asset-123",
    "name": "Admin Test Asset",
    "createdAt": "2026-02-17T..."
  }
}
```

**Screenshot**: Save response

---

#### Test 3.2: Demo Cannot Create Asset (403)

```bash
DEMO_TOKEN=$(cat demo-token.txt | tr -d '"')

curl -X POST http://localhost:3000/v1/assets \
  -H "Authorization: Bearer $DEMO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Demo Test Asset",
    "type": "SERVER"
  }'
```

**Expected Response** (403 Forbidden):
```json
{
  "success": false,
  "error": {
    "code": "Forbidden",
    "message": "You do not have permission to add assets"
  }
}
```

**Screenshot**: Save response

---

#### Test 3.3: Demo Can View Assets (200)

```bash
DEMO_TOKEN=$(cat demo-token.txt | tr -d '"')

curl -X GET "http://localhost:3000/v1/assets?limit=10&offset=0" \
  -H "Authorization: Bearer $DEMO_TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "asset-123",
      "name": "Some Asset",
      "type": "SERVER"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

**Screenshot**: Save response

---

#### Test 3.4: Admin Can Access Settings API

```bash
ADMIN_TOKEN=$(cat admin-token.txt | tr -d '"')

curl -X GET http://localhost:3000/v1/settings/organizations \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "org-123",
      "name": "Default Organization"
    }
  ]
}
```

**Screenshot**: Save response

---

#### Test 3.5: Demo Cannot Access Settings API (403)

```bash
DEMO_TOKEN=$(cat demo-token.txt | tr -d '"')

curl -X GET http://localhost:3000/v1/settings/organizations \
  -H "Authorization: Bearer $DEMO_TOKEN"
```

**Expected Response** (403 Forbidden):
```json
{
  "success": false,
  "error": {
    "code": "Forbidden",
    "message": "You do not have permission to view settings"
  }
}
```

**Screenshot**: Save response

---

### Phase 4: Error Message Quality Assessment (5 minutes)

Review all screenshots from Phase 2-3 and rate error messages:

#### Criteria

| Aspect | Good | Okay | Poor |
|--------|------|------|------|
| **Clarity** | User understands instantly | Takes a moment | Confusing |
| **Actionability** | User knows what to do | User unsure | No guidance |
| **Tone** | Professional, empathetic | Neutral | Harsh, technical |
| **Details** | Explains why (no tech jargon) | Generic message | Stack traces, internal errors |

#### Error Message Examples to Rate

**Example 1**: "You do not have permission to add assets"
- Rating: ✅ **GOOD**
- Why: Clear, specific action, no jargon

**Example 2**: "403: Forbidden"
- Rating: ❌ **POOR**
- Why: Too technical, no context

**Example 3**: "Access denied. Please contact your administrator to request permission for this action."
- Rating: ✅ **GOOD**
- Why: Clear, actionable, empathetic

**Example 4**: "Error: Cannot read property 'permissions' of undefined at /middleware/rbac.ts:142"
- Rating: ❌ **POOR**
- Why: Technical stack trace leaked

#### Your Ratings

Review each screenshot and rate error messages:

| Screenshot | Message | Rating | Notes |
|-----------|---------|--------|-------|
| demo-05-assets-create-error | `[Copy message here]` | [Good/Okay/Poor] | |
| demo-09-settings-access-denied | `[Copy message here]` | [Good/Okay/Poor] | |
| (Others) | | | |

---

## Test Result Documentation

### Testing Checklist

**Phase 1: Admin Access** (✓ when complete)
- [ ] Admin login successful
- [ ] Role displays correctly
- [ ] Assets module fully accessible (create/edit/delete)
- [ ] Settings module fully accessible
- [ ] Patches module fully accessible
- [ ] Logout works

**Phase 2: Read-Only Access** (✓ when complete)
- [ ] Demo login successful
- [ ] Role displays correctly
- [ ] Assets read access works
- [ ] Assets create/edit/delete buttons blocked
- [ ] Patch deploy blocked
- [ ] Settings access blocked
- [ ] Hub access blocked
- [ ] Dashboard readable
- [ ] Vulnerabilities readable
- [ ] Logout works
- [ ] Post-logout redirect works

**Phase 3: API Permission** (✓ when complete)
- [ ] Admin can create asset (200 OK)
- [ ] Demo cannot create asset (403)
- [ ] Demo can view assets (200 OK)
- [ ] Admin can access settings (200 OK)
- [ ] Demo cannot access settings (403)

**Phase 4: Error Quality** (✓ when complete)
- [ ] Error messages reviewed
- [ ] All messages are user-friendly
- [ ] No stack traces in UI
- [ ] All messages rated

---

## Screenshots Directory Structure

Create this directory for screenshots:
```
/frontend/screenshots/rbac-permissions/
├── admin-01-dashboard-login.png
├── admin-02-user-profile.png
├── admin-03-assets-full-access.png
├── admin-04-settings-full-access.png
├── admin-05-patches-full-access.png
├── admin-06-logout-redirect.png
├── demo-01-dashboard-login.png
├── demo-02-user-profile.png
├── demo-03-assets-list-visible.png
├── demo-04-assets-create-hidden.png
├── demo-05-assets-create-api-403.png
├── demo-05b-assets-create-error-message.png
├── demo-06-assets-edit-hidden.png
├── demo-07-assets-delete-hidden.png
├── demo-08-patches-list-visible.png
├── demo-08-patches-deploy-hidden.png
├── demo-09-settings-access-denied.png
├── demo-09-settings-api-403.png
├── demo-10-users-settings-denied.png
├── demo-11-hub-access-denied.png
├── demo-12-dashboard-visible.png
├── demo-13-vulnerabilities-read-only.png
├── demo-14-logout-redirect.png
└── demo-15-direct-nav-redirect-to-login.png
```

---

## Common Issues & Troubleshooting

### Issue 1: Login Page Never Loads

**Symptoms**: Blank page or timeout at http://localhost:5173/login

**Solutions**:
1. Check frontend is running: `curl http://localhost:5173`
2. Check backend API is running: `curl http://localhost:3000`
3. Check network tab for failed requests
4. Clear browser cache (Ctrl+Shift+Del)
5. Hard refresh (Ctrl+Shift+R)

---

### Issue 2: Login Fails (Invalid Credentials)

**Symptoms**: "Invalid email or password" error

**Solutions**:
1. Verify database was seeded: `make db-seed`
2. Check database has admin and demo users:
   ```bash
   make db-studio  # Open Prisma Studio
   # Look for admin@patchiq.io and demo@patchiq.io users
   ```
3. Verify backend auth module is working
4. Check backend logs for auth errors

---

### Issue 3: Permission Check Not Working (User Can Create Asset)

**Symptoms**: Demo user can click "Create Asset" and it works

**Solutions**:
1. Verify RBAC middleware is attached to routes:
   ```bash
   grep -n "checkPermission.*add" /backend/src/modules/assets/assets.routes.ts
   ```
2. Check demo user has correct role ID
3. Verify role permissions in database are set correctly
4. Clear backend cache: Restart backend service
5. Check for any route bypasses (routes without middleware)

---

### Issue 4: 500 Error When Creating Asset

**Symptoms**: API returns 500 instead of 403

**Solutions**:
1. Check backend logs for error details
2. Verify middleware is wrapping errors correctly
3. Check database connection is working
4. Restart backend service
5. Check for null/undefined values in role data

---

### Issue 5: User Menu Not Showing Logout

**Symptoms**: Can't find logout button

**Solutions**:
1. Look for user avatar/menu in top-right corner
2. Click it to open menu
3. If menu doesn't appear, check browser console for errors
4. Try mobile view (might be hidden in hamburger menu)
5. Check auth token is stored: Open DevTools → Application → LocalStorage

---

## Performance Notes

### Expected Response Times

| Endpoint | Expected Time | With Cache |
|----------|---|---|
| Login | 100-200ms | N/A |
| GET /assets | 50-100ms | 10-20ms |
| POST /assets (allowed) | 100-300ms | 100-300ms |
| POST /assets (403) | 50-75ms | 10-20ms |
| Settings view (403) | 30-50ms | 5-10ms |

**Note**: First request to a role will do database lookup. Subsequent requests use 60-second cache.

---

## Reporting Results

### Summary Format

```markdown
## RBAC Permission Testing Results

**Test Date**: [Date]
**Tester**: [Name]
**Environment**: Local Dev
**Duration**: [X minutes]

### Overall Status
- Admin User: ✅ PASS
- Demo User: ✅ PASS
- API Permissions: ✅ PASS
- Error Messages: ✅ PASS

### Issues Found
- [List any issues]

### Screenshots
- [Links to screenshot files]

### Recommendations
- [Any recommendations]
```

---

## Automated Testing

When services are running, execute the Playwright test suite:

```bash
cd frontend

# Run the test suite
npm test -- phase4-agent32-rbac-permissions.spec.ts

# Run with UI mode for debugging
npm run test:ui -- phase4-agent32-rbac-permissions.spec.ts

# Run with debug mode
npm run test:debug -- phase4-agent32-rbac-permissions.spec.ts
```

Expected output:
```
 ✓ 1 [setup] › e2e/auth.setup.ts (5s)
 ✓ 2 [chromium] › phase4-agent32-rbac-permissions.spec.ts (30s)
 ✓ 3 [chromium] › ... (admin user permissions test)
 ✓ 4 [chromium] › ... (logout test)

3 passed (45s)
```

---

## Sign-Off

Once all tests pass, sign off:

```
RBAC Permission Testing - SIGN OFF

Date: [Date]
Tester: [Name]
Status: ✅ PASS

All RBAC permission tests passed successfully:
✅ Admin user has full access
✅ Demo user has read-only access
✅ Permission denials return 403 Forbidden
✅ Error messages are user-friendly
✅ No security bypasses detected
✅ Session logout works correctly

Approved for Production: YES / NO
```

---

**Test Guide Version**: 1.0
**Last Updated**: 2026-02-17
**Framework**: Playwright + Manual Testing
**Next Phase**: Phase 5 - Advanced RBAC Features
