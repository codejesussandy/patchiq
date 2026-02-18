# PatchIQ v0.1.0 — Test Infrastructure Full Rewrite

**Branch**: `dev-0.1.0`
**Goal**: Zero-defect confidence. When all tests pass, the platform works — no schema mismatches, no type errors, no broken buttons, no console errors, no contract drift.

**Strategy**: Implement phase by phase. After each phase, run tests, fix failures, verify coverage. Don't move to next phase until current phase is green.

---

## Table of Contents

- [Phase 1: Foundation — Test Database & Setup Layer](#phase-1-foundation--test-database--setup-layer)
- [Phase 2: Backend Unit Tests](#phase-2-backend-unit-tests)
- [Phase 3: Backend Integration Tests](#phase-3-backend-integration-tests)
- [Phase 4: Backend Contract Tests](#phase-4-backend-contract-tests)
- [Phase 5: Agent Unit Tests](#phase-5-agent-unit-tests)
- [Phase 6: Agent Contract & Live Tests](#phase-6-agent-contract--live-tests)
- [Phase 7: Frontend Unit Tests](#phase-7-frontend-unit-tests)
- [Phase 8: Frontend E2E Tests (Playwright)](#phase-8-frontend-e2e-tests-playwright)
- [Phase 9: Makefile, CI/CD & Final Validation](#phase-9-makefile-cicd--final-validation)

---

## Phase 1: Foundation — Test Database & Setup Layer

### 1.1 Isolated Test Database

**Problem**: Tests currently use `patchiq_dev` on port 3002 (wrong port — docker-compose exposes 4500). Tests pollute dev data.

**Create** `docker-compose.test.yml`:
```yaml
services:
  postgres-test:
    image: postgres:16-alpine
    container_name: patchiq_test_db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: patchiq_test
    ports:
      - "4510:5432"
    tmpfs: /var/lib/postgresql/data  # RAM disk for speed
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 3s
      timeout: 3s
      retries: 5

  redis-test:
    image: redis:7-alpine
    container_name: patchiq_test_redis
    ports:
      - "4511:6379"
```

**Rewrite** `backend/.env.test`:
```env
NODE_ENV=test
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:4510/patchiq_test
REDIS_URL=redis://localhost:4511
JWT_SECRET=test-jwt-secret-key-for-testing-only-min-32-chars
ENCRYPTION_KEY=test-32-byte-encryption-key-here!
USE_MOCK_NVD=true
USE_MOCK_EMAIL=true
USE_MOCK_LDAP=true
USE_MOCK_PATCHES=true
LOG_LEVEL=error
RATE_LIMIT_ENABLED=false
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=patchiq-test
```

### 1.2 Backend Test Setup Layer

**Delete** all existing test setup files and replace with:

```
backend/tests/
  setup/
    global-setup.ts        # Run before ALL tests: start test DB, prisma db push, seed
    global-teardown.ts     # Run after ALL tests: disconnect, optionally drop
    test-db.ts             # Export prisma client configured for patchiq_test
    test-app.ts            # createTestApp() — returns supertest-wrapped Express app
    test-auth.ts           # Token generators for all roles
    seed-test-db.ts        # Minimal deterministic seed data
  fixtures/
    index.ts               # Re-export all fixtures
    agent.fixture.ts       # buildAgent(), buildAgentRegistration(), buildHeartbeat()
    asset.fixture.ts       # buildAsset(), buildHardware(), buildSoftware()
    user.fixture.ts        # buildUser(), buildRole()
    patch.fixture.ts       # buildPatch(), buildPatchTest()
    job.fixture.ts         # buildPatchJob(), buildSoftwareJob()
    deployment.fixture.ts  # buildDeployment(), buildDeploymentTask()
    vulnerability.fixture.ts
    hub.fixture.ts         # buildPackage(), buildBundle()
    discovery.fixture.ts   # buildIPRange(), buildCredential()
    settings.fixture.ts    # buildOrganization(), buildBranch(), buildLocation()
    notification.fixture.ts
    report.fixture.ts
```

**`setup/test-auth.ts`** must provide:
```typescript
generateAdminToken()      // Full admin access
generateViewerToken()     // Read-only role
generateAgentToken(agentId)  // Agent JWT with X-Agent-Id
generateExpiredToken()    // For 401 tests
generateInvalidToken()   // Malformed JWT
```

**`setup/seed-test-db.ts`** must create:
- 1 organization (TEST_ORG)
- 1 admin user (admin@test.patchiq.io)
- 1 viewer user (viewer@test.patchiq.io)
- All required roles (Admin, Viewer, User) with correct permissions
- Agent config defaults (heartbeat interval, telemetry interval, etc.)

### 1.3 Jest Config Rewrite

**Rewrite** `backend/jest.config.js` → `backend/jest.config.ts`:

3 projects:
- `unit` — `tests/unit/**/*.test.ts` — 30s timeout, no DB needed
- `integration` — `tests/integration/**/*.test.ts` — 60s timeout, needs test DB
- `e2e` — `tests/e2e/**/*.test.ts` — 120s timeout, needs full stack

Global setup/teardown pointing to `tests/setup/global-setup.ts`.

### 1.4 Files to Create/Modify

| Action | File |
|--------|------|
| Create | `docker-compose.test.yml` |
| Rewrite | `backend/.env.test` |
| Create | `backend/tests/setup/global-setup.ts` |
| Create | `backend/tests/setup/global-teardown.ts` |
| Create | `backend/tests/setup/test-db.ts` |
| Create | `backend/tests/setup/test-app.ts` |
| Create | `backend/tests/setup/test-auth.ts` |
| Create | `backend/tests/setup/seed-test-db.ts` |
| Create | `backend/tests/fixtures/*.ts` (13 files) |
| Rewrite | `backend/jest.config.js` → `backend/jest.config.ts` |
| Delete | `backend/tests/setup.ts` (old) |
| Delete | `backend/tests/e2e/setup.ts` (old) |
| Delete | `backend/tests/utils/testHelpers.ts` (old, replaced by setup/) |

### 1.5 Validation

- [ ] `docker compose -f docker-compose.test.yml up -d` starts test DB
- [ ] `cd backend && npx prisma db push` succeeds against patchiq_test
- [ ] Seed script creates required data
- [ ] `createTestApp()` returns working supertest instance
- [ ] Token generators produce valid JWTs
- [ ] `npx jest --selectProjects unit --listTests` shows correct paths
- [ ] Dev database (patchiq_dev) has zero test data

---

## Phase 2: Backend Unit Tests

Pure unit tests. No database, no network. Mock everything external.

### 2.1 Middleware Tests

```
backend/tests/unit/middleware/
  auth.test.ts
  rbac.test.ts
  validation.test.ts
  error-handler.test.ts
  rate-limit.test.ts
  audit.test.ts
  request-logger.test.ts
```

**`auth.test.ts`** — Test `authenticate` middleware:
- Valid Bearer token → sets `req.user`, calls `next()`
- Missing Authorization header → 401
- Malformed token (not JWT) → 401
- Expired token → 401
- Token with invalid signature → 401
- `optionalAuth` with no token → calls `next()` with no user
- `optionalAuth` with valid token → sets `req.user`
- `requireAdmin` with admin role → passes
- `requireAdmin` with user role → 403
- `requireRole('viewer')` with viewer → passes
- `requireRole('admin')` with viewer → 403

**`rbac.test.ts`** — Test `checkPermission` middleware:
- Admin user with `agents:view` permission → passes
- Viewer user with `agents:delete` permission → 403
- Unknown module → 403
- Unknown action → 403
- Cache behavior: same user, same permission, second call uses cache
- Cache expiry: after 60s, permission re-evaluated

**`validation.test.ts`** — Test `validateBody`, `validateQuery`, `validateParams`:
- Valid body passes through
- Invalid body → 400 with Zod error details (field names, expected types)
- Extra fields stripped (Zod strip mode)
- Nested object validation
- Array validation
- `validateQuery` with valid query params → passes
- `validateQuery` with invalid params → 400
- `validateParams` with valid UUID → passes
- `validateParams` with non-UUID string → 400

**`error-handler.test.ts`** — Test global error handler:
- `HttpError(400, 'Bad Request')` → `{ success: false, error: { message: 'Bad Request', statusCode: 400 } }`
- `HttpError(404)` → 404 response
- `HttpError(409)` → 409 response
- `HttpError(500)` → 500 response
- Unknown Error → 500 with generic message (no stack leak)
- Prisma `P2002` (unique constraint) → 409
- Prisma `P2025` (record not found) → 404
- Zod validation error → 400 with field-level errors
- JSON parse error → 400

**`rate-limit.test.ts`**:
- Under limit → passes
- Over limit → 429 with `Retry-After` header
- `authRateLimiter`: 100 requests pass, 101st blocked
- Rate limit disabled when `RATE_LIMIT_ENABLED=false`

**`audit.test.ts`**:
- Successful response → audit log created with action, resource, user, IP
- Failed response (4xx/5xx) → no audit log
- Correct AuditAction and AuditResource constants used
- Async nature: response sent before audit log written

**`request-logger.test.ts`**:
- Adds `X-Request-ID` to request if not present
- Preserves existing `X-Request-ID`
- Logs request method, path, duration
- Correlation ID flows through

### 2.2 Validator Tests

One test file per module's validators. Every Zod schema must be tested.

```
backend/tests/unit/validators/
  agents.test.ts
  auth.test.ts
  assets.test.ts
  patches.test.ts
  deployments.test.ts
  jobs.test.ts
  vulnerabilities.test.ts
  discovery.test.ts
  dashboard.test.ts
  hub.test.ts
  alerts.test.ts
  notifications.test.ts
  reports.test.ts
  settings.test.ts
  patch-repository.test.ts
  patch-templates.test.ts
  ai.test.ts
```

**For EACH Zod schema** (e.g., `registerAgentSchema`, `heartbeatSchema`, `createAssetSchema`):
- Valid input → `safeParse` succeeds
- Each required field missing → `safeParse` fails with that field name in error
- Each enum field with wrong value → fails
- String fields: empty string behavior (allowed or not?)
- Number fields: negative numbers, zero, very large numbers
- UUID fields: valid UUID passes, non-UUID fails
- Optional fields: omitted → succeeds
- Extra fields: stripped or rejected (depends on schema config)
- Edge cases specific to schema (e.g., IP address format, email format, date format)

**`agents.test.ts`** specifically must test:
- `registerAgentSchema`: machineId (required string), hostname, os (enum: WINDOWS/LINUX/MACOS), osVersion, ipAddress, agentVersion
- `heartbeatSchema`: status, cpuUsage (number 0-100), memoryUsage (number 0-100), diskUsage (number 0-100), uptime, errorMessage (optional)
- `commandResultSchema`: commandId (UUID), status (enum), output, errorMessage, executedAt
- `inventorySchema`: hardware (object), software (array), network (object), security (object)
- `telemetrySchema`: cpuUsage, memoryUsage, diskUsage, networkIO, processes

### 2.3 Service Layer Tests

```
backend/tests/unit/services/
  base-crud.test.ts
  logger.test.ts
  minio.test.ts
  email.test.ts
  sse.test.ts
```

**`base-crud.test.ts`** — Test abstract `BaseCrudService`:
- `findAll()` with pagination → returns `{ data, total, page, limit }`
- `findAll()` with search → filters applied
- `findAll()` with sorting → orderBy applied
- `findById()` with valid ID → returns record
- `findById()` with non-existent ID → throws 404
- `create()` with valid data → returns created record
- `update()` with valid data → returns updated record
- `update()` non-existent → throws 404
- `delete()` → deletes record
- `delete()` non-existent → throws 404
- `transform()` override → output transformed correctly
- `withTransaction()` → operations wrapped in transaction

**`logger.test.ts`**:
- `createLogger('module-name')` returns pino instance
- Log level respects `LOG_LEVEL` env var
- Request ID included in log output when available
- Child loggers inherit parent config

### 2.4 Utility Tests

```
backend/tests/unit/utils/
  jwt.test.ts
  crypto.test.ts
  pagination.test.ts
  date.test.ts
  version-compare.test.ts
```

**`jwt.test.ts`**:
- `generateTokenPair()` returns { accessToken, refreshToken }
- Access token expires in configured time
- Refresh token expires in configured time
- Token contains correct claims (userId, email, role)
- Agent token contains agentId claim
- `verifyToken()` with valid token → decoded payload
- `verifyToken()` with expired token → throws
- `verifyToken()` with invalid signature → throws

**`crypto.test.ts`**:
- Encrypt → decrypt roundtrip
- Different plaintext → different ciphertext
- Invalid key → throws
- Empty string encryption
- Long string encryption

**`pagination.test.ts`**:
- Default page=1, limit=20
- Custom page and limit
- `buildPaginationMeta(total, page, limit)` → correct totalPages
- Edge: page > totalPages → empty data, correct meta
- Edge: limit=0 → handled gracefully
- Edge: negative page → defaults to 1

### 2.5 Files to Create

| File | Tests |
|------|-------|
| `tests/unit/middleware/auth.test.ts` | ~12 |
| `tests/unit/middleware/rbac.test.ts` | ~6 |
| `tests/unit/middleware/validation.test.ts` | ~8 |
| `tests/unit/middleware/error-handler.test.ts` | ~9 |
| `tests/unit/middleware/rate-limit.test.ts` | ~4 |
| `tests/unit/middleware/audit.test.ts` | ~4 |
| `tests/unit/middleware/request-logger.test.ts` | ~4 |
| `tests/unit/validators/*.test.ts` | ~17 files, ~10-30 tests each |
| `tests/unit/services/base-crud.test.ts` | ~12 |
| `tests/unit/services/logger.test.ts` | ~4 |
| `tests/unit/services/minio.test.ts` | ~6 |
| `tests/unit/services/email.test.ts` | ~4 |
| `tests/unit/utils/jwt.test.ts` | ~8 |
| `tests/unit/utils/crypto.test.ts` | ~5 |
| `tests/unit/utils/pagination.test.ts` | ~6 |
| `tests/unit/utils/date.test.ts` | ~5 |
| `tests/unit/utils/version-compare.test.ts` | ~6 |

**Estimated total: ~250-350 unit tests**

### 2.6 Validation

- [ ] `npx jest --selectProjects unit` passes 100%
- [ ] No database connection made during unit tests
- [ ] Coverage report shows middleware, validators, utils at 90%+

---

## Phase 3: Backend Integration Tests

Hit real endpoints against test database. Every endpoint in every module.

### 3.1 Standard Test Pattern

Every integration test file follows this exact pattern:

```typescript
import { createTestApp } from '../setup/test-app';
import { generateAdminToken, generateViewerToken } from '../setup/test-auth';
import { prisma } from '../setup/test-db';
import { buildAgent } from '../fixtures/agent.fixture';

describe('Module: Agents (Admin API)', () => {
  const { app } = createTestApp();
  let adminToken: string;
  let viewerToken: string;

  beforeAll(async () => {
    adminToken = await generateAdminToken();
    viewerToken = await generateViewerToken();
  });

  afterEach(async () => {
    // Clean up test data created during tests
    await prisma.agent.deleteMany({ where: { machineId: { startsWith: 'INT-TEST-' } } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Tests here...
});
```

### 3.2 Test Files — All 17+ Modules

#### `tests/integration/auth.test.ts`

```
POST /v1/auth/login
  ✓ Valid credentials → 200 + { accessToken, refreshToken, user }
  ✓ Invalid password → 401
  ✓ Non-existent email → 401
  ✓ Missing email field → 400
  ✓ Missing password field → 400
  ✓ Rate limited after 100 attempts → 429

POST /v1/auth/refresh
  ✓ Valid refresh token → new token pair
  ✓ Expired refresh token → 401
  ✓ Invalid refresh token → 401

POST /v1/auth/logout
  ✓ Valid token → 200
  ✓ No token → 401

POST /v1/auth/forgot-password
  ✓ Valid email → 200 (even if email doesn't exist, no leak)
  ✓ Invalid email format → 400
  ✓ Rate limited after 3 attempts → 429

POST /v1/auth/reset-password
  ✓ Valid reset token + new password → 200
  ✓ Expired reset token → 400
  ✓ Invalid reset token → 400
  ✓ Weak password → 400

GET /v1/user/me
  ✓ Valid token → user profile
  ✓ No token → 401
```

#### `tests/integration/agents.test.ts` (Admin API)

```
GET /v1/agents
  ✓ Returns paginated list → { success: true, data: { data: [...], total, page, limit } }
  ✓ Default pagination: page=1, limit=20
  ✓ Custom pagination: page=2, limit=5
  ✓ Filter by status=CONNECTED
  ✓ Filter by status=DISCONNECTED
  ✓ Filter by os=WINDOWS
  ✓ Filter by os=LINUX
  ✓ Filter by os=MACOS
  ✓ Search by hostname (partial match)
  ✓ Search by name (partial match)
  ✓ Empty result set → { data: [], total: 0 }
  ✓ No auth → 401
  ✓ Viewer role → 200 (has view permission)

GET /v1/agents/:id
  ✓ Existing agent → full details
  ✓ Non-existent UUID → 404
  ✓ Invalid UUID format → 400
  ✓ No auth → 401

PUT /v1/agents/:id
  ✓ Update name → 200
  ✓ Update tags → 200
  ✓ Non-existent → 404
  ✓ No auth → 401
  ✓ Viewer role → 403 (no edit permission)

DELETE /v1/agents/:id
  ✓ Existing agent → 200
  ✓ Verify agent no longer in list
  ✓ Non-existent → 404
  ✓ No auth → 401
  ✓ Viewer role → 403 (no delete permission)

GET /v1/agents/:id/commands
  ✓ Returns command history
  ✓ Empty history → []
  ✓ No auth → 401

POST /v1/agents/:id/collect
  ✓ Creates inventory_full command → 200
  ✓ Non-existent agent → 404
  ✓ No auth → 401

POST /v1/agents/:id/update
  ✓ Creates agent_update command → 200
  ✓ No auth → 401

GET /v1/agents/downloads
  ✓ Returns available downloads list
  ✓ No auth → 401

GET /v1/agents/errors
  ✓ Returns failed commands list
  ✓ Filter by agentId
  ✓ Filter by commandType
  ✓ Pagination works
  ✓ No auth → 401

POST /v1/agents/bulk-update
  ✓ Creates update commands for all CONNECTED agents
  ✓ Returns { agentsQueued: N }
  ✓ Optional versionId parameter
  ✓ No auth → 401
  ✓ Viewer role → 403

GET /v1/agents/:id/telemetry/latest
  ✓ Returns latest telemetry data
  ✓ No telemetry → empty/null
  ✓ No auth → 401

GET /v1/agents/:id/logs
  ✓ Returns uploaded logs
  ✓ No logs → null/empty
  ✓ No auth → 401
```

#### `tests/integration/agent-api.test.ts` (Agent-facing API)

```
POST /api/agent/register
  ✓ New agent → 201 + { agentId, accessToken, refreshToken, config }
  ✓ Re-register (same machineId) → 200 + { isReRegistration: true }
  ✓ Missing machineId → 400
  ✓ Missing hostname → 400
  ✓ Invalid OS value → 400
  ✓ Response contains valid JWT tokens
  ✓ Agent appears in GET /v1/agents list after registration

POST /api/agent/token/refresh
  ✓ Valid refresh token → new token pair
  ✓ Invalid token → 401

POST /api/agent/heartbeat
  ✓ Valid heartbeat → { acknowledged: true, serverTime, commandsPending }
  ✓ With error message → stored on agent record
  ✓ Updates lastHeartbeat timestamp
  ✓ No agent token → 401
  ✓ Missing X-Agent-Id → 401
  ✓ Invalid agent token → 401

GET /api/agent/commands
  ✓ No pending commands → []
  ✓ With pending commands → returns them ordered by priority
  ✓ No auth → 401

POST /api/agent/commands/:id/result
  ✓ Success result → command marked completed
  ✓ Failure result → command marked failed
  ✓ Non-existent command ID → 404
  ✓ No auth → 401

GET /api/agent/config
  ✓ Returns config → { heartbeatIntervalSeconds, inventoryScheduleCron, telemetryIntervalSeconds }
  ✓ No auth → 401

POST /api/agent/inventory
  ✓ Valid inventory → 200
  ✓ Creates/updates asset record linked to agent
  ✓ Hardware data stored
  ✓ Software data stored
  ✓ No auth → 401

POST /api/agent/telemetry
  ✓ Valid telemetry → 200
  ✓ No auth → 401

POST /api/agent/logs
  ✓ Valid log upload → 200
  ✓ Retrievable via GET /v1/agents/:id/logs (admin API)
  ✓ Subsequent upload overwrites previous
  ✓ No auth → 401
```

#### `tests/integration/assets.test.ts`

```
ASSETS CRUD:
GET /v1/assets
  ✓ Paginated list with default params
  ✓ Filter by category
  ✓ Filter by subcategory
  ✓ Filter by tag
  ✓ Filter by os
  ✓ Filter by status
  ✓ Search by hostname
  ✓ Search by IP address
  ✓ Sorting by name ASC/DESC
  ✓ No auth → 401

POST /v1/assets
  ✓ Create asset with required fields → 201
  ✓ Missing required fields → 400
  ✓ Duplicate → 409 (if applicable)
  ✓ No auth → 401

GET /v1/assets/:id
  ✓ Returns full asset details
  ✓ Non-existent → 404
  ✓ Invalid UUID → 400

GET /v1/assets/:id/full
  ✓ Returns asset with all related data (hardware, software, network, security)

PUT /v1/assets/:id
  ✓ Update fields → 200
  ✓ Partial update → only specified fields changed
  ✓ Non-existent → 404

DELETE /v1/assets/:id
  ✓ Deletes asset → 200
  ✓ Cascading: related records cleaned up
  ✓ Non-existent → 404

ASSET DETAIL TABS:
GET /v1/assets/:id/lifecycle → lifecycle events
GET /v1/assets/:id/hardware → hardware details
GET /v1/assets/:id/hardware/expanded → expanded hardware
GET /v1/assets/:id/software → installed software list
GET /v1/assets/:id/security → security status
GET /v1/assets/:id/network → network interfaces
GET /v1/assets/:id/peripherals → connected peripherals
GET /v1/assets/:id/telemetry → current telemetry
GET /v1/assets/:id/telemetry/history → historical telemetry
GET /v1/assets/:id/errors → asset-specific errors
GET /v1/assets/:id/audit-log → audit trail
GET /v1/assets/:id/alerts → asset alerts
GET /v1/assets/:id/patches → applied patches
GET /v1/assets/:id/patch-recommendations → recommended patches
GET /v1/assets/:id/vulnerabilities → asset vulnerabilities
GET /v1/assets/:id/deployments → deployment history
  ✓ Each returns 200 with correct shape
  ✓ Each returns 404 for non-existent asset
  ✓ Each requires auth

POST /v1/assets/:id/refresh
  ✓ Triggers inventory re-collection → 200
  ✓ Non-existent → 404

TAGS:
POST /v1/assets/:id/tags → add tag to asset
DELETE /v1/assets/:id/tags/:tagId → remove tag

CATEGORIES:
GET /v1/categories → list
POST /v1/categories → create
GET /v1/categories/:id → get
PUT /v1/categories/:id → update
DELETE /v1/categories/:id → delete
GET /v1/categories/:id/assets → assets in category

SUBCATEGORIES: (same CRUD pattern)

TAGS:
GET /v1/tags → list
GET /v1/tags/popular → popular tags
GET /v1/tags/search?q= → search tags
POST /v1/tags → create
PUT /v1/tags/:id → update
DELETE /v1/tags/:id → delete
POST /v1/tags/bulk-assign → assign tags to multiple assets
POST /v1/tags/bulk-remove → remove tags from multiple assets

SOFTWARE INVENTORY:
GET /v1/software-inventory → paginated list
GET /v1/software-inventory/:id → details
POST /v1/software-inventory/import → CSV import

SOFTWARE LICENSES: (CRUD pattern)
OS LICENSES: (CRUD pattern)
```

#### `tests/integration/patches.test.ts`

```
PATCHES CRUD:
GET /v1/patches → paginated, filterable (severity, status, os, vendor)
POST /v1/patches → create
GET /v1/patches/:id → details
PUT /v1/patches/:id → update
DELETE /v1/patches/:id → delete

RELATED DATA:
GET /v1/patches/:id/affected-softwares → list
POST /v1/patches/:id/affected-softwares → add
DELETE /v1/patches/:id/affected-softwares/:productId → remove
GET /v1/patches/:id/vulnerabilities → linked CVEs
POST /v1/patches/:id/scan-endpoints → trigger scan
GET /v1/patches/:id/endpoints → affected endpoints

SUPERSEDENCE:
GET /v1/patches/:id/superseded → patches this one replaces
GET /v1/patches/:id/superseding → patches that replace this
POST /v1/patches/:id/supersede/:targetId → create supersedence
DELETE /v1/patches/:id/supersede/:targetId → remove

TEST & APPROVAL WORKFLOW:
POST /v1/patches/:id/test → submit for testing
POST /v1/patches/:id/approve → approve patch
POST /v1/patches/:id/reject → reject patch
  ✓ State transitions: PENDING → TESTING → APPROVED/REJECTED
  ✓ Cannot approve without testing first
  ✓ Cannot re-approve already approved

PATCH TESTS: (CRUD pattern)
ZERO TOUCH CONFIGS: (CRUD pattern)

PATCH RECOMMENDATIONS:
GET /v1/patch-recommendations/dashboard → stats
GET /v1/patch-recommendations → paginated list
GET /v1/patch-recommendations/:id → details
POST /v1/patch-recommendations/:id/accept → accept
POST /v1/patch-recommendations/:id/reject → reject
POST /v1/patch-recommendations/:id/deploy → deploy
POST /v1/patch-recommendations/bulk-accept → bulk
POST /v1/patch-recommendations/bulk-reject → bulk
POST /v1/patch-recommendations/bulk-deploy → bulk
```

#### `tests/integration/deployments.test.ts`

```
GENERIC:
GET /v1/deployments → list all deployments
POST /v1/deployments → create
GET /v1/deployments/:id → details
PUT /v1/deployments/:id → update
DELETE /v1/deployments/:id → delete
GET /v1/deployments/:id/preview → preview targets
POST /v1/deployments/:id/execute → execute
POST /v1/deployments/:id/cancel → cancel

SOFTWARE DEPLOYMENTS:
GET /v1/deployments/software → list
POST /v1/deployments/software → create with package reference
GET /v1/deployments/software/:id → details with tasks
POST /v1/deployments/software/:id/cancel → cancel
POST /v1/deployments/software/:id/tasks/:taskId/rollback → rollback specific task

PATCH DEPLOYMENTS:
POST /v1/deployments/patch → create
GET /v1/deployments/patch → list
GET /v1/deployments/patch/:id → details
POST /v1/deployments/patch/:id/cancel → cancel
POST /v1/deployments/patch/:id/retry → retry failed

CONFIG DEPLOYMENTS:
POST /v1/deployments/config → create
GET /v1/deployments/config/:id → details

State transitions tested:
  PENDING → IN_PROGRESS → COMPLETED/FAILED
  PENDING → CANCELLED
  FAILED → RETRYING → COMPLETED/FAILED
```

#### `tests/integration/jobs.test.ts`

```
PATCH JOBS: (CRUD pattern)
VULNERABILITY JOBS: (CRUD + db-sync endpoints)
SOFTWARE DEPLOYMENTS: (list + tasks)
CONFIG CATALOG: (CRUD pattern)
CONFIG BUNDLES: (CRUD pattern)
CONFIG DEPLOYMENTS: (list + create + tasks)
DEPLOYMENT POLICIES: (CRUD pattern)
```

#### `tests/integration/vulnerabilities.test.ts`

```
GET /v1/vulnerabilities → paginated list
GET /v1/vulnerabilities/:id → details
GET /v1/vulnerabilities/stats → { total, critical, high, medium, low }
GET /v1/vulnerabilities/types → type breakdown
GET /v1/vulnerabilities/endpoints → affected endpoints
GET /v1/vulnerabilities/network → network vulns
GET /v1/vulnerabilities/zero-day → zero-day list
GET /v1/vulnerabilities/cve-suggest?q= → autocomplete
GET /v1/vulnerabilities/cpe-stats → CPE mapping stats
GET /v1/vulnerabilities/unmatched-software → unmapped software

EXCEPTIONS:
GET /v1/vulnerabilities/exceptions → list
POST /v1/vulnerabilities/exceptions → create
PUT /v1/vulnerabilities/exceptions/:id → update
DELETE /v1/vulnerabilities/exceptions/:id → delete

CVE SYNC:
GET /v1/vulnerabilities/sync/status → sync status
POST /v1/vulnerabilities/sync → trigger incremental sync
POST /v1/vulnerabilities/sync/full → trigger full sync
GET /v1/vulnerabilities/cve/:cveId → get CVE details
POST /v1/vulnerabilities/scan/asset/:assetId → scan specific asset
```

#### `tests/integration/discovery.test.ts`

```
IP RANGES: (CRUD + scan trigger)
CREDENTIALS: (CRUD + test connectivity)
SCANS: (get details + results)
DEVICES: (list + enroll)
```

#### `tests/integration/dashboard.test.ts`

```
GET /v1/dashboard → overview data
POST /v1/dashboard/refresh → refresh cache
GET /v1/dashboard/stats → statistics
GET /v1/dashboard/compliance → compliance data
GET /v1/dashboard/top-vulnerabilities → top N vulns
GET /v1/dashboard/charts/patches → chart data
GET /v1/dashboard/charts/assets → chart data
GET /v1/dashboard/charts/vulnerabilities → chart data
GET /v1/dashboard/agents → agent summary
GET /v1/dashboard/recent-activity → activity feed
```

#### `tests/integration/hub.test.ts`

```
STATS: GET /v1/hub/stats
PACKAGES: CRUD + upload + download-url + bundle + execution-payload
BUNDLES: CRUD
PUBLIC: GET /v1/bundles/:packageId/download (no auth required)
```

#### `tests/integration/alerts.test.ts`

```
GET /v1/alerts → paginated list
GET /v1/alerts/:id → details
PUT /v1/alerts/:id/acknowledge → acknowledge
PUT /v1/alerts/:id/resolve → resolve
PUT /v1/alerts/bulk-acknowledge → bulk
DELETE /v1/alerts/bulk → bulk delete
```

#### `tests/integration/notifications.test.ts`

```
GET /v1/notifications → list
GET /v1/notifications/unread-count → { count: N }
PUT /v1/notifications/:id/read → mark read
PUT /v1/notifications/mark-all-read → mark all
PUT /v1/notifications/bulk-read → bulk mark read
DELETE /v1/notifications/:id → delete
DELETE /v1/notifications/bulk → bulk delete
DELETE /v1/notifications → clear all
GET /v1/notifications/history → paginated history
GET /v1/notifications/preferences → user preferences
PUT /v1/notifications/preferences → update preferences
GET /v1/notifications/stream → SSE connection (test connect + receive event)
```

#### `tests/integration/reports.test.ts`

```
TEMPLATES: GET /v1/reports/templates
REPORTS: CRUD + download + regenerate + send
SCHEDULES: CRUD
```

#### `tests/integration/settings.test.ts`

This is the largest module. Split into sub-describes:

```
ORGANIZATIONS: CRUD + org-tree + delete-impact
BRANCHES: CRUD + delete-impact
DEPARTMENTS: CRUD + delete-impact
LOCATIONS: CRUD + delete-impact

USERS: CRUD + invite + suspend + activate + reset-password + audit-log + import + bulk operations

ROLES: CRUD (with permissions grid)

ALERT CONFIGS: CRUD
PASSWORD POLICY: GET + PUT
SERVER SETTINGS: GET + PUT
AGENT CONFIGURATION: GET + PUT + reset
AGENT APPROVALS: list + approve + reject
AGENT APPROVAL SETTINGS: GET + PUT
ENROLL SECRETS: CRUD

LDAP:
  CRUD + test connection
  GROUP MAPPINGS: CRUD + discover groups
  SYNC: trigger + get jobs + get job details

BRANDING: GET + POST (with file upload) + GET /logo (public)
VENDOR LOGOS: CRUD (with file upload)
MAIL SERVER: GET + PUT + test
PROXY SERVER: GET + PUT + test
RISK SCORE: GET + PUT
REMOTE DESKTOP: GET + PUT + reset
VULNERABILITY PREFERENCE: GET + PUT + sync
PLATFORM LICENSE: GET + PUT
COMPUTER GROUPS: CRUD + available-endpoints
DEPLOYMENT POLICIES: CRUD
DISTRIBUTION SERVERS: CRUD
PATCH PREFERENCES: GET + PUT + sync
PATCH MANAGEMENT: GET + PUT
INTEGRATIONS: CRUD + toggle + test
REDHAT NOMINATIONS: CRUD
AUDIT LOGS: GET + filter-options
```

#### `tests/integration/patch-repository.test.ts`

```
SOURCES: CRUD + toggle
DOWNLOADS: CRUD + bulk + retry + cancel
PATCHES: download + agent-downloads
REPOSITORY: stats + sync + validate-url
QUEUE: stats + pause + resume + clean + start-pending
```

#### `tests/integration/patch-templates.test.ts`

```
GET /v1/patch-templates → list
GET /v1/patch-templates/:id/latest → latest version
POST /v1/patch-templates/sync → sync all
POST /v1/patch-templates/:id/sync → sync one
```

#### `tests/integration/ai.test.ts`

```
POST /v1/ai/chat → chat response (mocked AI service)
GET /v1/ai/health → service health (admin only)
```

#### `tests/integration/health.test.ts`

```
GET /health → { status: 'ok' }
GET /v1 → API info
```

### 3.3 Cross-Cutting Concerns (tested in EVERY module)

Every integration test file must include these standard checks:
1. **Auth enforcement**: Endpoints that require auth return 401 without token
2. **RBAC enforcement**: Endpoints with `checkPermission` return 403 for wrong role
3. **Response envelope**: Every response matches `{ success: boolean, data: ..., error?: ... }`
4. **Pagination shape**: List endpoints return `{ data: T[], total, page, limit }`
5. **404 handling**: Non-existent UUID returns 404, not 500
6. **400 handling**: Invalid UUID format returns 400
7. **Audit trail**: State-changing operations create audit log entries

### 3.4 Estimated Test Count

| Module | Estimated Tests |
|--------|----------------|
| auth | 18 |
| agents (admin) | 35 |
| agent-api | 25 |
| assets | 80+ |
| patches | 50+ |
| deployments | 30 |
| jobs | 40 |
| vulnerabilities | 30 |
| discovery | 25 |
| dashboard | 12 |
| hub | 20 |
| alerts | 8 |
| notifications | 15 |
| reports | 15 |
| settings | 100+ |
| patch-repository | 25 |
| patch-templates | 5 |
| ai | 3 |
| health | 2 |
| **TOTAL** | **~540** |

### 3.5 Validation

- [ ] `npx jest --selectProjects integration --runInBand` passes 100%
- [ ] Every endpoint returns `{ success: true/false, ... }` envelope
- [ ] All 401/403/404/400 error paths verified
- [ ] Test database contains only test data, never leaks to dev

---

## Phase 4: Backend Contract Tests

Ensure response shapes are locked and agent-backend communication is type-safe.

### 4.1 Response Envelope Consistency Test

**File**: `tests/contract/envelope-consistency.test.ts`

Hit EVERY endpoint and verify the response follows `{ success: boolean, data: ... }`:

```typescript
const ENDPOINTS = [
  { method: 'GET', path: '/v1/agents', auth: 'admin' },
  { method: 'GET', path: '/v1/assets', auth: 'admin' },
  // ... ALL endpoints
];

describe('Response Envelope Consistency', () => {
  ENDPOINTS.forEach(({ method, path, auth }) => {
    it(`${method} ${path} returns standard envelope`, async () => {
      const res = await request(app)[method.toLowerCase()](path)
        .set('Authorization', `Bearer ${tokens[auth]}`);

      expect(res.body).toHaveProperty('success');
      if (res.status < 400) {
        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('data');
      } else {
        expect(res.body.success).toBe(false);
      }
    });
  });
});
```

### 4.2 Agent Payload Contract Tests

**File**: `tests/contract/agent-contract.test.ts`

Validate that payloads matching Go agent structs pass Zod validation:

```
tests/contract/
  agent-payloads/
    registration.json      # Matches Go client.RegisterRequest
    heartbeat.json         # Matches Go client.HeartbeatRequest
    inventory.json         # Matches Go full inventory payload
    telemetry.json         # Matches Go telemetry payload
    command-result.json    # Matches Go command result payload
```

**Tests**:
```
Agent Registration Contract:
  ✓ Full registration payload passes registerAgentSchema
  ✓ Minimal registration payload (required fields only) passes
  ✓ Every field in Go struct has a corresponding Zod field
  ✓ Go enum values (WINDOWS, LINUX, MACOS) match Zod enum

Agent Heartbeat Contract:
  ✓ Full heartbeat payload passes heartbeatSchema
  ✓ Heartbeat with error message passes
  ✓ Heartbeat with zero values passes (cpuUsage: 0, etc.)

Agent Inventory Contract:
  ✓ Full inventory with hardware + software + network + security passes
  ✓ Partial inventory (hardware only) passes
  ✓ Software array with 100+ items passes

Agent Telemetry Contract:
  ✓ Full telemetry payload passes
  ✓ Telemetry with all zeros passes

Agent Command Result Contract:
  ✓ Success result passes commandResultSchema
  ✓ Failure result with errorMessage passes
  ✓ All status enum values match backend expectations
```

### 4.3 Zod Schema Export for Go Tests

**File**: `backend/scripts/export-schemas.ts`

Export Zod schemas as JSON Schema for use in Go contract tests:

```typescript
import { zodToJsonSchema } from 'zod-to-json-schema';
import { registerAgentSchema, heartbeatSchema, ... } from '../src/modules/agents/agents.validators';

const schemas = {
  registerAgent: zodToJsonSchema(registerAgentSchema),
  heartbeat: zodToJsonSchema(heartbeatSchema),
  inventory: zodToJsonSchema(inventorySchema),
  telemetry: zodToJsonSchema(telemetrySchema),
  commandResult: zodToJsonSchema(commandResultSchema),
};

// Write to agent/test/contract/testdata/schemas/
fs.writeFileSync('path/to/schemas.json', JSON.stringify(schemas, null, 2));
```

Add npm script: `"export:schemas": "ts-node scripts/export-schemas.ts"`

### 4.4 Pagination Contract Test

**File**: `tests/contract/pagination-contract.test.ts`

```
Every paginated endpoint:
  ✓ Returns { data: Array, total: number, page: number, limit: number }
  ✓ data is always an array (even when empty)
  ✓ total >= 0
  ✓ page >= 1
  ✓ limit > 0
  ✓ ?page=1&limit=5 returns max 5 items
  ✓ ?page=999 returns empty data with correct total
```

### 4.5 Files to Create

| File | Purpose |
|------|---------|
| `tests/contract/envelope-consistency.test.ts` | All endpoints use standard envelope |
| `tests/contract/agent-contract.test.ts` | Go payloads match Zod schemas |
| `tests/contract/pagination-contract.test.ts` | Pagination shape consistent |
| `tests/contract/agent-payloads/registration.json` | Go registration fixture |
| `tests/contract/agent-payloads/heartbeat.json` | Go heartbeat fixture |
| `tests/contract/agent-payloads/inventory.json` | Go inventory fixture |
| `tests/contract/agent-payloads/telemetry.json` | Go telemetry fixture |
| `tests/contract/agent-payloads/command-result.json` | Go command result fixture |
| `backend/scripts/export-schemas.ts` | Zod → JSON Schema exporter |

### 4.6 Validation

- [ ] All contract tests pass
- [ ] Every endpoint uses consistent envelope
- [ ] Agent JSON fixtures validated against Zod
- [ ] JSON Schema files generated successfully

---

## Phase 5: Agent Unit Tests

Rewrite Go tests with comprehensive coverage.

### 5.1 Client Tests

```
agent/internal/client/
  client_test.go
  credentials_test.go
  machineid_test.go
```

**`client_test.go`**:
```
New():
  ✓ Creates client with baseURL
  ✓ Sets 30s timeout
  ✓ Configures TLS 1.2+ minimum

Register():
  ✓ Sends POST /api/agent/register with correct JSON body
  ✓ Includes machineId, hostname, os, osVersion, ipAddress, agentVersion
  ✓ Stores returned agentId, accessToken, refreshToken
  ✓ Sets Authorization header for subsequent requests
  ✓ Handles 400 error (invalid payload)
  ✓ Handles 500 error (server down)
  ✓ Handles network timeout

Heartbeat():
  ✓ Sends POST /api/agent/heartbeat with metrics
  ✓ Includes Authorization and X-Agent-Id headers
  ✓ Parses response: acknowledged, serverTime, commandsPending
  ✓ Handles 401 (expired token)

RefreshToken():
  ✓ Sends POST /api/agent/token/refresh
  ✓ Updates stored tokens
  ✓ Handles invalid refresh token

GetPendingCommands():
  ✓ Sends GET /api/agent/commands
  ✓ Returns array of PendingCommand
  ✓ Empty array when no commands

ReportCommandResult():
  ✓ Sends POST /api/agent/commands/{id}/result
  ✓ Correct JSON body with status, output, errorMessage

SubmitInventory():
  ✓ Sends POST /api/agent/inventory with full payload
  ✓ Hardware, software, network, security sections included

SubmitTelemetry():
  ✓ Sends POST /api/agent/telemetry

GetConfig():
  ✓ Returns heartbeat interval, inventory cron, telemetry interval

Proxy:
  ✓ HTTP proxy configured correctly
  ✓ HTTPS proxy configured correctly
  ✓ NoProxy exclusions work
  ✓ Proxy auth (username:password) embedded in URL
```

**`credentials_test.go`**:
```
  ✓ SaveCredentials writes to correct path
  ✓ LoadCredentials reads saved values
  ✓ Missing file → returns empty/defaults
  ✓ Corrupted file → handled gracefully
  ✓ File permissions set correctly (0600)
```

### 5.2 Collector Tests

One test file per collector. Test using mock/stub system data.

```
agent/internal/collectors/
  hardware_test.go
  software_test.go
  network_test.go
  security_test.go
  peripheral_test.go
  telemetry_test.go
```

**Each collector test**:
```
Collect():
  ✓ Returns non-nil result
  ✓ Result contains expected fields (not empty strings)
  ✓ Numeric values in valid ranges (e.g., CPU cores > 0)
  ✓ Handles permission errors gracefully (doesn't crash)
  ✓ Returns partial data if some collection fails
  ✓ Timeout after configured duration
```

### 5.3 Executor Tests

```
agent/internal/executors/
  patch_linux_test.go / patch_darwin_test.go / patch_windows_test.go
  software_linux_test.go / software_darwin_test.go / software_windows_test.go
  script_executor_test.go
  rollback_test.go
```

**Patch executor**:
```
  ✓ InstallPatch builds correct OS command
  ✓ UninstallPatch builds correct command
  ✓ ListAvailablePatches parses output correctly
  ✓ CheckRebootRequired returns true/false
  ✓ Handles command failure gracefully
  ✓ Respects context cancellation
```

**Script executor**:
```
  ✓ ExecuteBundle downloads, extracts, runs correct script
  ✓ ExecuteInlineScript runs script with correct interpreter
  ✓ Environment variables passed correctly
  ✓ Root/sudo handling for needsRoot=true
  ✓ Script timeout enforced
  ✓ Cleanup after execution
```

### 5.4 Backend Manager Tests

```
agent/internal/backend/
  backend_test.go
```

```
Manager lifecycle:
  ✓ New() creates manager with all required fields
  ✓ Start() launches heartbeat, inventory, telemetry, cleanup goroutines
  ✓ Stop() gracefully shuts down all goroutines within 30s

Registration:
  ✓ register() calls client.Register()
  ✓ Sets registered=true on success
  ✓ Retries with backoff on failure
  ✓ Re-registers after 5 consecutive heartbeat failures

Heartbeat:
  ✓ heartbeatLoop sends at configured interval
  ✓ Resets backoff on success
  ✓ Increments consecutiveErrors on failure
  ✓ Triggers token refresh at 80% of lifetime

Command execution:
  ✓ fetchAndExecuteCommands queues commands sorted by priority
  ✓ commandWorker processes from queue
  ✓ executeCommandWithRetry retries up to maxRetries
  ✓ Exponential backoff between retries (1s, 2s, 4s)
  ✓ Reports result after execution
  ✓ Priority ordering: agent_update=1, inventory=2, patches=3, scripts=4

Inventory:
  ✓ submitInventoryNow sends only when checksum changed
  ✓ Forces send on inventory_full command
  ✓ submitTelemetryNow sends real-time metrics

Log upload:
  ✓ uploadLogs sends every 10 heartbeats
  ✓ Sends last 500 lines of log file
```

### 5.5 Other Package Tests

```
agent/internal/crypto/encryption_test.go
  ✓ Encrypt/decrypt roundtrip
  ✓ Different keys produce different output
  ✓ Corrupted ciphertext → error

agent/internal/download/download_test.go
  ✓ Download file from URL
  ✓ Rate limiting works
  ✓ SHA256 checksum verification
  ✓ Resume partial download (HTTP Range)
  ✓ Progress callback invoked

agent/internal/update/update_test.go
  ✓ CheckForUpdate detects newer version
  ✓ PerformUpdate downloads and replaces binary
  ✓ Rollback reverts to previous version
  ✓ manifest_test.go: parse manifest, version comparison

agent/internal/config/config_test.go
  ✓ Load from file
  ✓ CLI flags override file
  ✓ Default values when no config

agent/internal/storage/storage_test.go
  ✓ SQLite job store: save, retrieve, list, cleanup
  ✓ Retention policy: old jobs deleted after threshold
```

### 5.6 Validation

- [ ] `cd agent && go test ./internal/... -count=1 -v` passes 100%
- [ ] `cd agent && go test -race ./internal/...` — no race conditions
- [ ] `cd agent && go test -cover ./internal/...` — 70%+ coverage

---

## Phase 6: Agent Contract & Live Binary Tests

### 6.1 Agent Contract Tests (Go → JSON Schema)

**Prerequisites**: Phase 4 must generate JSON Schema files via `npm run export:schemas`.

**Add dependency**: `go get github.com/xeipuuv/gojsonschema`

**File**: `agent/test/contract/contract_test.go`

```go
func TestRegistrationPayloadMatchesSchema(t *testing.T) {
    // Build the exact payload the agent sends during registration
    payload := client.RegisterRequest{
        MachineID:    "test-machine-001",
        Hostname:     "test-host.local",
        OS:           "LINUX",
        OSVersion:    "Ubuntu 22.04",
        IPAddress:    "192.168.1.100",
        AgentVersion: "0.1.0",
        Capabilities: []string{"inventory", "patching", "remote"},
    }
    validateAgainstSchema(t, payload, "registerAgent")
}

func TestHeartbeatPayloadMatchesSchema(t *testing.T) { ... }
func TestInventoryPayloadMatchesSchema(t *testing.T) { ... }
func TestTelemetryPayloadMatchesSchema(t *testing.T) { ... }
func TestCommandResultPayloadMatchesSchema(t *testing.T) { ... }
```

**Each test**:
- Builds a realistic Go struct exactly as the agent would
- Marshals to JSON
- Validates against the JSON Schema exported from Zod
- If validation fails → test reports which fields don't match

**Test cases per payload**:
```
Registration:
  ✓ Full payload with all fields
  ✓ Minimal payload (required fields only)
  ✓ All OS enum values: WINDOWS, LINUX, MACOS

Heartbeat:
  ✓ Normal heartbeat (all metrics populated)
  ✓ Heartbeat with error message
  ✓ Heartbeat with zero metrics
  ✓ Heartbeat with max values (CPU 100%, Memory 100%)

Inventory:
  ✓ Full inventory (hardware + software + network + security + peripherals)
  ✓ Empty software list
  ✓ Large software list (100+ entries)
  ✓ All hardware field types

Command Result:
  ✓ Success status with output
  ✓ Failure status with error message
  ✓ All status enum values match backend
```

### 6.2 Agent Live Binary Tests

**File**: `agent/test/live/live_test.go` (build tag: `//go:build live`)

**These tests require**: Test backend running on port 3001 against patchiq_test DB.

```
Full Agent Lifecycle:
  ✓ Build agent binary with test server URL (ldflags)
  ✓ Start agent as subprocess
  ✓ Agent registers within 10s (poll GET /v1/agents for new machineId)
  ✓ Agent appears in list with status CONNECTED
  ✓ Heartbeat received within configured interval (check lastHeartbeat)
  ✓ Send inventory command via POST /v1/agents/:id/collect
  ✓ Inventory data appears in asset record within 30s
  ✓ Send agent_update command (mock update binary)
  ✓ Stop agent → status changes to DISCONNECTED after missed heartbeats
  ✓ Cleanup: delete test agent

Error Scenarios:
  ✓ Agent with wrong server URL → logs error, retries with backoff
  ✓ Agent with invalid token → re-registers automatically
  ✓ Backend goes down → agent queues data, reconnects when back
```

### 6.3 Files to Create

| File | Purpose |
|------|---------|
| `agent/test/contract/contract_test.go` | Go payloads vs JSON Schema |
| `agent/test/contract/testdata/schemas/` | JSON Schema files (generated) |
| `agent/test/live/live_test.go` | Live binary integration tests |

### 6.4 Validation

- [ ] `cd agent && go test ./test/contract/... -v` passes
- [ ] `make test-agent-live` passes (with test backend running)
- [ ] Any Zod schema change in backend breaks agent contract tests (desired!)

---

## Phase 7: Frontend Unit Tests (Vitest)

### 7.1 Test Setup Rewrite

**Rewrite** `frontend/vitest.config.ts`:
- Environment: jsdom
- Setup files: `src/__tests__/setup.ts`
- Coverage thresholds: 80%
- Path aliases match tsconfig

**Rewrite** `frontend/src/__tests__/setup.ts`:
- Start MSW server with all handlers
- Mock browser APIs (matchMedia, IntersectionObserver, ResizeObserver, scrollTo, getComputedStyle)
- **CRITICAL**: Add `console.error` and `console.warn` traps:
```typescript
const originalError = console.error;
const originalWarn = console.warn;

beforeEach(() => {
  console.error = (...args: any[]) => {
    originalError(...args);
    throw new Error(`console.error called: ${args.join(' ')}`);
  };
  console.warn = (...args: any[]) => {
    originalWarn(...args);
    throw new Error(`console.warn called: ${args.join(' ')}`);
  };
});

afterEach(() => {
  console.error = originalError;
  console.warn = originalWarn;
});
```

This ensures ANY console error/warning in any component fails the test.

**Rewrite** `frontend/src/__tests__/mocks/handlers.ts`:
- One handler group per service
- Every API endpoint mocked with realistic response data
- Error handlers for 401/403/404/500 scenarios

### 7.2 Shared Component Tests

```
frontend/src/__tests__/unit/components/
  DataTable.test.tsx
  FormModal.test.tsx
  ConfirmModal.test.tsx
  FilterDrawer.test.tsx
  ActionMenu.test.tsx
  BulkActionBar.test.tsx
  EmptyState.test.tsx
  ErrorState.test.tsx
  StatusBadge.test.tsx
  SkeletonLoader.test.tsx
  RiskScoreDisplay.test.tsx
  ErrorBoundary.test.tsx
  MainLayout.test.tsx
  NotificationDropdown.test.tsx
  AgentDetailsDrawer.test.tsx
```

**`DataTable.test.tsx`**:
```
Rendering:
  ✓ Renders with columns and data
  ✓ Shows loading skeleton when loading=true
  ✓ Shows empty state when data=[]
  ✓ Shows error state on error

Pagination:
  ✓ Shows page size selector
  ✓ Changes page on click
  ✓ Calls onChange with correct params

Sorting:
  ✓ Click column header → sort ascending
  ✓ Click again → sort descending
  ✓ Sort indicator shown

Selection:
  ✓ Checkbox selects row
  ✓ Select all checkbox
  ✓ BulkActionBar appears when rows selected

Actions:
  ✓ Row action buttons render
  ✓ Click action triggers callback
  ✓ Action menu renders with correct items
```

**`FormModal.test.tsx`**:
```
  ✓ Renders with title and form fields
  ✓ Opens when visible=true
  ✓ Closes on cancel button click
  ✓ Closes on X button click
  ✓ Submit button disabled when form invalid
  ✓ Submit calls onSubmit with form data
  ✓ Shows loading state during submission
  ✓ Shows validation errors on invalid fields
  ✓ Resets form on close
```

**`ConfirmModal.test.tsx`**:
```
  ✓ Renders with title, message, confirm/cancel buttons
  ✓ Calls onConfirm when confirm clicked
  ✓ Calls onCancel when cancel clicked
  ✓ Shows danger variant for destructive actions
  ✓ Confirm button shows loading state
```

**`FilterDrawer.test.tsx`**:
```
  ✓ Opens from right side
  ✓ Renders filter fields
  ✓ Apply button sends filter values
  ✓ Reset button clears all filters
  ✓ Close button closes drawer
```

### 7.3 Hook Tests

```
frontend/src/__tests__/unit/hooks/
  useAgents.test.ts
  useAssets.test.ts
  useAuth.test.ts
  useDashboard.test.ts
  useDiscovery.test.ts
  useHub.test.ts
  useJobs.test.ts
  useNotifications.test.ts
  usePatches.test.ts
  usePatchRecommendations.test.ts
  useReports.test.ts
  useSettings.test.ts
  useVulnerabilities.test.ts
  useTableParams.test.ts
  useDebouncedSearch.test.ts
  useModal.test.ts
  usePolling.test.ts
  useExport.test.ts
  useNotificationSSE.test.ts
```

**Pattern for each data hook** (e.g., `useAgents.test.ts`):
```
useAgents():
  ✓ Returns loading=true initially
  ✓ Returns data after API response
  ✓ Returns error on API failure
  ✓ Refetches on invalidation

useAgentDetails(id):
  ✓ Fetches correct endpoint with ID
  ✓ Returns agent details
  ✓ Returns error for non-existent ID

useDeleteAgent():
  ✓ Calls DELETE endpoint
  ✓ Invalidates agent list cache on success
  ✓ Returns error on failure
```

**Utility hook tests**:

**`useTableParams.test.ts`**:
```
  ✓ Default page=1, pageSize=20
  ✓ setPage updates page
  ✓ setPageSize updates pageSize and resets page to 1
  ✓ setSort updates sortField and sortOrder
  ✓ setSearch updates search and resets page to 1
  ✓ setFilters updates filters and resets page to 1
  ✓ resetAll resets everything to defaults
  ✓ Syncs with URL query params (if applicable)
```

**`useDebouncedSearch.test.ts`**:
```
  ✓ Initial value is empty string (or provided initial)
  ✓ Returns current input value immediately
  ✓ Debounced value updates after delay
  ✓ Rapid typing only triggers one debounced update
  ✓ Clear resets both values
```

**`useModal.test.ts`**:
```
  ✓ Initially closed (isVisible=false)
  ✓ open() sets isVisible=true
  ✓ close() sets isVisible=false
  ✓ open(data) passes data to modal
```

**`usePolling.test.ts`**:
```
  ✓ Calls callback at specified interval
  ✓ Stops polling when enabled=false
  ✓ Cleans up interval on unmount
  ✓ Restarts when interval changes
```

### 7.4 Service Tests

```
frontend/src/__tests__/unit/services/
  agent.service.test.ts
  asset.service.test.ts
  auth.service.test.ts
  dashboard.service.test.ts
  discovery.service.test.ts
  hub.service.test.ts
  jobs.service.test.ts
  notification.service.test.ts
  patch.service.test.ts
  patch-recommendation.service.test.ts
  reports.service.test.ts
  settings.service.test.ts
  vulnerability.service.test.ts
  api.service.test.ts
```

**`api.service.test.ts`** (base API client):
```
  ✓ Sets base URL from env
  ✓ Adds Authorization header when token exists
  ✓ Auto-unwraps { success, data } envelope
  ✓ 401 response → redirects to login
  ✓ 401 response → clears stored token
  ✓ Network error → throws with message
  ✓ Timeout → throws with timeout message
```

**Pattern for each service** (e.g., `agent.service.test.ts`):
```
getAgents():
  ✓ Calls GET /v1/agents
  ✓ Passes query params for pagination
  ✓ Returns agent array

getAgentDetails(id):
  ✓ Calls GET /v1/agents/{id}
  ✓ Returns agent object

deleteAgent(id):
  ✓ Calls DELETE /v1/agents/{id}
  ✓ Returns success response
```

### 7.5 Page Component Tests (Render + Basic Interaction)

Test that each page renders without errors and key elements are present:

```
frontend/src/__tests__/unit/pages/
  Dashboard.test.tsx
  Login.test.tsx
  Agents.test.tsx
  AllAssets.test.tsx
  AssetDetails.test.tsx
  AllPatches.test.tsx
  PatchDetails.test.tsx
  Vulnerabilities.test.tsx
  Hub.test.tsx
  Reports.test.tsx
  Settings.test.tsx   (covers all settings sub-pages)
```

**Pattern**:
```
Dashboard:
  ✓ Renders without console errors
  ✓ Shows stats cards
  ✓ Shows charts section
  ✓ Shows recent activity
  ✓ Shows loading state

Login:
  ✓ Renders email and password fields
  ✓ Submit button disabled when fields empty
  ✓ Shows error on invalid credentials
  ✓ Redirects on success
```

### 7.6 Integration Tests (Component + Hook + Service together)

```
frontend/src/__tests__/integration/
  asset-crud.test.tsx       # Create, view, edit, delete asset flow
  agent-management.test.tsx  # View agents, see details, delete
  patch-workflow.test.tsx    # Create patch, test, approve, deploy
  auth-flow.test.tsx         # Login, get user, token refresh, logout
  form-validation.test.tsx   # Form field validation across modules
  data-table-filters.test.tsx # Filter, sort, paginate, search
  notification-flow.test.tsx # Receive, read, clear notifications
```

### 7.7 Estimated Test Count

| Area | Estimated |
|------|-----------|
| Shared components | 80 |
| Hooks (20 files) | 120 |
| Services (14 files) | 100 |
| Page renders | 40 |
| Integrations | 30 |
| **TOTAL** | **~370** |

### 7.8 Validation

- [ ] `cd frontend && npm run test:unit` passes 100%
- [ ] Zero console.error or console.warn during any test
- [ ] Coverage report shows 80%+ on hooks and services

---

## Phase 8: Frontend E2E Tests (Playwright)

### 8.1 Page Object Pattern

```
frontend/e2e/
  page-objects/
    BasePage.ts              # Common methods: navigate, waitForLoad, getToast
    LoginPage.ts             # login(email, password), assertLoggedIn()
    DashboardPage.ts         # assertStatsVisible(), assertChartsLoaded()
    AgentsPage.ts            # getAgentList(), openAgentDetails(), deleteAgent()
    AssetsPage.ts            # getAssetList(), openAsset(), createAsset(), filterBy()
    AssetDetailsPage.ts      # getTab(), switchTab(), assertHardwareLoaded()
    PatchesPage.ts           # getPatchList(), createPatch(), approvePatch()
    PatchDetailsPage.ts      # assertDetailsLoaded(), deploy()
    VulnerabilitiesPage.ts   # getVulnList(), filterBySeverity(), createException()
    HubPage.ts               # getPackageList(), uploadPackage(), createBundle()
    JobsPage.ts              # getPatchJobs(), getSoftwareJobs(), createJob()
    DeploymentsPage.ts       # getDeployments(), cancelDeployment()
    DiscoveryPage.ts         # getIPRanges(), scanRange(), getDevices()
    ReportsPage.ts           # getReports(), createReport(), downloadReport()
    NotificationsPage.ts     # getNotifications(), markAllRead()
    SettingsPage.ts          # navigateToSection(), updateSetting()
    NavigationSidebar.ts     # navigateTo(section), assertActiveItem()
    HeaderBar.ts             # getUserMenu(), logout(), getNotificationBell()
  fixtures/
    auth.fixture.ts          # Authenticated page fixture
  specs/
    (see below)
  global-setup.ts            # Create auth state file
  playwright.config.ts       # Rewritten config
```

**`BasePage.ts`**:
```typescript
export class BasePage {
  constructor(protected page: Page) {}

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  async assertNoConsoleErrors() {
    // Collected via page.on('console') in fixture
  }

  async getToastMessage(): Promise<string> {
    return this.page.locator('.ant-message-notice').textContent();
  }
}
```

### 8.2 Console Error Trapping

**In `auth.fixture.ts`**:
```typescript
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
      if (msg.type() === 'warning') {
        errors.push(`[WARN] ${msg.text()}`);
      }
    });

    page.on('pageerror', err => {
      errors.push(err.message);
    });

    // Login
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'admin@patchiq.io');
    await page.fill('[data-testid="password"]', 'admin123');
    await page.click('[data-testid="login-submit"]');
    await page.waitForURL('/dashboard');

    await use(page);

    // After test: fail if any console errors
    if (errors.length > 0) {
      throw new Error(`Console errors detected:\n${errors.join('\n')}`);
    }
  },
});
```

### 8.3 Test Specs — Every Page, Every Button

#### `specs/auth.spec.ts`
```
Login page:
  ✓ Page renders with email and password fields
  ✓ Login with valid credentials → redirects to dashboard
  ✓ Login with invalid credentials → shows error message
  ✓ Login with empty fields → submit button disabled or shows validation
  ✓ "Forgot Password" link navigates to forgot-password page
  ✓ Password field shows/hides toggle works

Forgot Password:
  ✓ Submit email → shows success message
  ✓ Invalid email → shows validation error
  ✓ "Back to Login" link works

Logout:
  ✓ User menu → Logout → redirects to login
  ✓ After logout, accessing /dashboard redirects to /login
```

#### `specs/dashboard.spec.ts`
```
  ✓ Page loads without errors
  ✓ Stats cards show numeric values (not NaN, not "undefined")
  ✓ Charts render (canvas/SVG elements present)
  ✓ Agent status widget shows connected/disconnected counts
  ✓ Recent activity list shows entries
  ✓ Refresh button triggers data reload
  ✓ Clicking stat card navigates to relevant page
  ✓ All navigation sidebar items clickable
```

#### `specs/agents.spec.ts`
```
Agent List:
  ✓ Page loads with agent table
  ✓ Table shows columns: Name, OS, Status, Last Heartbeat, Version
  ✓ Search input filters agents
  ✓ Status filter works (Connected/Disconnected)
  ✓ OS filter works (Windows/Linux/macOS)
  ✓ Pagination controls work
  ✓ Click agent row opens details drawer

Agent Details Drawer:
  ✓ Shows agent name, OS, version, IP, hostname
  ✓ Shows last heartbeat time
  ✓ Commands tab shows command history
  ✓ Telemetry tab shows metrics
  ✓ Logs tab shows uploaded logs (or empty state)
  ✓ "Collect Inventory" button triggers command
  ✓ "Update Agent" button triggers update
  ✓ "Delete" button shows confirmation → deletes agent
  ✓ Close button closes drawer

Agent Downloads:
  ✓ Download section shows available platforms
  ✓ Download buttons trigger file download
```

#### `specs/assets.spec.ts`
```
Asset List:
  ✓ Page loads with asset table
  ✓ Table shows columns: Name, OS, IP, Category, Status, Last Seen
  ✓ Search by name/hostname/IP
  ✓ Filter by category
  ✓ Filter by OS
  ✓ Filter by status
  ✓ Bulk select → bulk action bar appears
  ✓ "Add Asset" button opens form modal
  ✓ Create asset with required fields → appears in list
  ✓ Pagination works
  ✓ Click row navigates to asset details

Asset Details:
  ✓ Header shows asset name, OS icon, status badge
  ✓ Details tab: shows all asset fields
  ✓ Hardware tab: CPU, memory, disk info displayed
  ✓ Software tab: installed software table
  ✓ Network tab: interfaces, IP addresses
  ✓ Security tab: firewall, antivirus status
  ✓ Peripherals tab: connected devices
  ✓ Telemetry tab: charts for CPU/memory/disk
  ✓ Patches tab: applied patches list
  ✓ Vulnerabilities tab: CVE list
  ✓ Audit Log tab: change history
  ✓ Alerts tab: asset-specific alerts
  ✓ "Refresh Inventory" button works
  ✓ Edit button → edit form modal → save updates
  ✓ Delete button → confirmation → deletes → redirects to list
  ✓ Tag management: add tag, remove tag
  ✓ Category assignment works

Software Inventory:
  ✓ Page loads with software table
  ✓ Search works
  ✓ Import CSV button works

Software Licenses:
  ✓ CRUD: create, view, edit, delete license
  ✓ Import button works

Categories:
  ✓ Category manager: create, rename, delete
  ✓ Subcategory CRUD
  ✓ Assign asset to category
```

#### `specs/patches.spec.ts`
```
Patch List:
  ✓ Table with columns: ID, Title, Severity, Status, OS, Vendor
  ✓ Filter by severity (Critical/High/Medium/Low)
  ✓ Filter by status
  ✓ Filter by OS
  ✓ Search by title/KB number
  ✓ "Create Patch" button → form modal
  ✓ Create patch → appears in list

Patch Details:
  ✓ Shows all patch fields
  ✓ Affected products tab
  ✓ Linked vulnerabilities
  ✓ Affected endpoints
  ✓ Supersedence info
  ✓ "Test" button → starts test workflow
  ✓ "Approve" button (after test) → approves
  ✓ "Reject" button → rejects with reason
  ✓ "Deploy" button → deployment modal
  ✓ Edit → save changes
  ✓ Delete → confirmation → removed

Patch Recommendations:
  ✓ Dashboard stats cards
  ✓ Recommendations table
  ✓ Accept/Reject/Deploy individual
  ✓ Bulk accept/reject/deploy
  ✓ Filter by severity/status

Test & Approve:
  ✓ Test queue shows pending tests
  ✓ Approve test → status changes
  ✓ View test details

Zero Touch:
  ✓ Config list
  ✓ Create config → works
  ✓ Edit/delete config
```

#### `specs/deployments.spec.ts`
```
  ✓ Deployment list shows all deployments
  ✓ Create software deployment → modal → targets → schedule
  ✓ Create patch deployment
  ✓ View deployment details with task status
  ✓ Cancel deployment
  ✓ Retry failed deployment
  ✓ Rollback task
  ✓ Preview deployment targets
```

#### `specs/vulnerabilities.spec.ts`
```
  ✓ Vulnerability list with severity colors
  ✓ Filter by severity
  ✓ Search by CVE ID
  ✓ Click vulnerability → details page
  ✓ Details: affected endpoints, affected software
  ✓ "Scan" button triggers vulnerability scan
  ✓ Exception management: create, edit, delete exception
  ✓ Zero-day section shows zero-day vulns
  ✓ Stats cards show correct counts
```

#### `specs/hub.spec.ts`
```
  ✓ Stats cards
  ✓ Package list (grouped view toggle)
  ✓ Create package → upload file → shows in list
  ✓ Package details drawer
  ✓ Bundle upload
  ✓ Deploy from hub
  ✓ Delete package
  ✓ Download URL generation
```

#### `specs/jobs.spec.ts`
```
Patch Jobs:
  ✓ List patch jobs
  ✓ Create patch job → appears in list
  ✓ Delete job

Vulnerability Jobs:
  ✓ List vulnerability jobs
  ✓ DB Sync config: view, update, trigger now
  ✓ Create scan job

Software Jobs:
  ✓ Catalog CRUD
  ✓ Bundle CRUD
  ✓ Deployed: list + tasks view

Config Jobs:
  ✓ Catalog CRUD
  ✓ Bundle CRUD
  ✓ Deployed: list + tasks

Deployment Policies:
  ✓ CRUD with schedule configuration
```

#### `specs/discovery.spec.ts`
```
IP Discovery:
  ✓ IP range list
  ✓ Create IP range
  ✓ Edit/delete IP range
  ✓ Trigger scan → shows progress
  ✓ Scan results displayed

Device Credentials:
  ✓ Credential list
  ✓ Create credential (masked password)
  ✓ Edit/delete credential
  ✓ Test connectivity button

Agents (Discovery page):
  ✓ Same as agents.spec.ts but from discovery route
```

#### `specs/reports.spec.ts`
```
  ✓ Report list
  ✓ Create report wizard (multi-step)
  ✓ Download generated report
  ✓ Regenerate report
  ✓ Send report via email
  ✓ Schedule CRUD
  ✓ Template selection
```

#### `specs/notifications.spec.ts`
```
  ✓ Notification bell shows unread count
  ✓ Click bell → dropdown with notifications
  ✓ Click notification → navigates to relevant page
  ✓ Mark as read
  ✓ Mark all as read
  ✓ Notification page: full list
  ✓ Bulk actions: read, delete
  ✓ Clear all
  ✓ Preferences: toggle notification types
```

#### `specs/settings/*.spec.ts` (split by section)

**`specs/settings/user-management.spec.ts`**:
```
Organization:
  ✓ Org tree displays
  ✓ Create org → appears in tree
  ✓ Edit org name
  ✓ Delete org (with impact warning)

Branches: CRUD
Locations: CRUD
Departments: CRUD

Users:
  ✓ User list with status badges
  ✓ Create user → appears in list
  ✓ Edit user details
  ✓ Delete user → confirmation
  ✓ Suspend/Activate user
  ✓ Reset password
  ✓ Invite user
  ✓ Import users from CSV
  ✓ Bulk suspend/activate/delete
  ✓ View user audit log

Roles:
  ✓ Role list
  ✓ Create role with permissions grid
  ✓ Edit role permissions
  ✓ Delete role
  ✓ Cannot delete built-in roles

Password Policies:
  ✓ View current policy
  ✓ Update policy (min length, complexity, expiry)
```

**`specs/settings/system.spec.ts`**:
```
Branding:
  ✓ View current branding
  ✓ Upload logo
  ✓ Save changes

Mail Server:
  ✓ View config
  ✓ Update SMTP settings
  ✓ Test connection button

Proxy Server:
  ✓ View/update config
  ✓ Test connection

LDAP:
  ✓ LDAP config CRUD
  ✓ Test connection
  ✓ Group mapping CRUD
  ✓ Discover groups
  ✓ Trigger sync
  ✓ View sync job status

Risk Score: view + update
Remote Desktop: view + update + reset
Server Settings: view + update
Vendor Logos: CRUD with upload
```

**`specs/settings/agent-management.spec.ts`**:
```
Agent Approvals:
  ✓ Pending approvals list
  ✓ Approve agent
  ✓ Reject agent
  ✓ Approval settings page

Agent Versions:
  ✓ Version list
  ✓ Upload new version
  ✓ Download version
  ✓ Set latest version

Agent Configuration:
  ✓ View config (heartbeat, telemetry intervals)
  ✓ Update config
  ✓ Reset to defaults

Enroll Secrets:
  ✓ Secret list
  ✓ Create new secret
  ✓ Edit/delete secret

Red Hat Nominations: view + update
```

**`specs/settings/patch-policy.spec.ts`**:
```
Computer Groups: CRUD + endpoint assignment
Deployment Policies: CRUD with schedule
Patch Preferences: view + update + sync
Distribution Servers: CRUD
Patch Management: view + update
```

**`specs/settings/other.spec.ts`**:
```
Notification Preferences: toggle types
Vulnerability Preference: view + update + sync
Audit Logs: list + filter + detail view
Platform License: view + update
Integrations: CRUD + toggle + test
```

#### `specs/navigation.spec.ts`
```
Sidebar:
  ✓ All menu items render
  ✓ Click each top-level item → navigates correctly
  ✓ Submenu expands/collapses
  ✓ Active item highlighted
  ✓ Sidebar collapse/expand toggle works

Header:
  ✓ User avatar/name displayed
  ✓ Profile menu opens
  ✓ Notification bell shows count
  ✓ Search bar works (if present)
  ✓ AI chat panel opens (if present)
```

### 8.4 Estimated Test Count

| Spec File | Estimated Tests |
|-----------|----------------|
| auth | 12 |
| dashboard | 10 |
| agents | 20 |
| assets | 50 |
| patches | 40 |
| deployments | 10 |
| vulnerabilities | 15 |
| hub | 10 |
| jobs | 25 |
| discovery | 15 |
| reports | 10 |
| notifications | 10 |
| settings/user-management | 30 |
| settings/system | 25 |
| settings/agent-management | 15 |
| settings/patch-policy | 15 |
| settings/other | 15 |
| navigation | 10 |
| **TOTAL** | **~337** |

### 8.5 Validation

- [ ] `cd frontend && npx playwright test` passes 100%
- [ ] Zero console errors across all tests
- [ ] Every page loads without error
- [ ] Every button triggers expected action
- [ ] Every form validates and submits
- [ ] Every modal opens and closes
- [ ] Every table paginates, sorts, filters
- [ ] Screenshots on failure captured for debugging

---

## Phase 9: Makefile, CI/CD & Final Validation

### 9.1 Makefile Targets

Add to `Makefile`:

```makefile
# =====================
# Test Infrastructure
# =====================

test-infra-up:
	@echo "Starting test infrastructure..."
	@docker compose -f docker-compose.yml -f docker-compose.test.yml up -d postgres-test redis-test
	@echo "Waiting for test DB..."
	@sleep 3
	@cd backend && DATABASE_URL=postgresql://postgres:postgres@localhost:4510/patchiq_test \
		npx prisma db push --schema src/db/prisma/schema.prisma --skip-generate
	@cd backend && DATABASE_URL=postgresql://postgres:postgres@localhost:4510/patchiq_test \
		npx ts-node tests/setup/seed-test-db.ts
	@echo "Test infrastructure ready."

test-infra-down:
	@docker compose -f docker-compose.yml -f docker-compose.test.yml down -v --remove-orphans 2>/dev/null || true

# =====================
# Backend Tests
# =====================

test-backend-unit:
	cd backend && npx jest --selectProjects unit --forceExit

test-backend-integration: test-infra-up
	cd backend && npx jest --selectProjects integration --runInBand --forceExit

test-backend-contract: test-infra-up
	cd backend && npx jest tests/contract --runInBand --forceExit

test-backend-e2e: test-infra-up
	cd backend && npx jest tests/e2e --runInBand --forceExit

test-backend: test-backend-unit test-backend-integration test-backend-contract

# =====================
# Agent Tests
# =====================

test-agent-unit:
	cd agent && go test ./internal/... -count=1 -timeout=60s

test-agent-contract:
	cd backend && npm run export:schemas
	cd agent && go test ./test/contract/... -count=1 -v -timeout=60s

test-agent-live: test-infra-up
	cd agent && go test -tags=live ./test/live/... -count=1 -v -timeout=120s

test-agent: test-agent-unit test-agent-contract

# =====================
# Frontend Tests
# =====================

test-frontend-unit:
	cd frontend && npx vitest run

test-frontend-e2e:
	cd frontend && npx playwright test

test-frontend: test-frontend-unit

# =====================
# Combined Targets
# =====================

test: test-backend test-agent test-frontend
	@echo "All tests passed!"

test-ci: test-backend-unit test-agent-unit test-frontend-unit
	@echo "CI tests passed!"

test-full: test test-backend-e2e test-agent-live test-frontend-e2e
	@echo "Full test suite passed!"

# =====================
# Quality Gates
# =====================

check-all: check-types check-lint test
	@echo "All quality gates passed!"

export-schemas:
	cd backend && npm run export:schemas
```

### 9.2 CI/CD Workflow

**File**: `.github/workflows/test.yml`

```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  backend-unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '18' }
      - run: cd backend && npm ci
      - run: cd shared && npm ci
      - run: cd backend && npx jest --selectProjects unit --forceExit

  backend-integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: patchiq_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports: ['5432:5432']
        options: --health-cmd pg_isready --health-interval 3s --health-timeout 3s --health-retries 5
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: cd backend && npm ci && cd ../shared && npm ci
      - run: cd backend && DATABASE_URL=postgresql://postgres:postgres@localhost:5432/patchiq_test npx prisma db push --skip-generate
      - run: cd backend && npx jest --selectProjects integration --runInBand --forceExit
    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/patchiq_test
      REDIS_URL: redis://localhost:6379
      NODE_ENV: test

  agent-unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with: { go-version: '1.22' }
      - run: cd agent && go test ./internal/... -count=1 -timeout=60s

  agent-contract:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with: { go-version: '1.22' }
      - uses: actions/setup-node@v4
      - run: cd backend && npm ci && cd ../shared && npm ci
      - run: cd backend && npm run export:schemas
      - run: cd agent && go test ./test/contract/... -count=1 -v

  frontend-unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: cd frontend && npm ci && cd ../shared && npm ci
      - run: cd frontend && npx vitest run

  frontend-e2e:
    runs-on: ubuntu-latest
    needs: [backend-integration]  # Needs backend working first
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: cd frontend && npm ci
      - run: cd frontend && npx playwright install --with-deps
      - run: cd frontend && npx playwright test
```

### 9.3 Final Validation Phase

After all phases are implemented:

```
FULL VALIDATION CHECKLIST:

Infrastructure:
  [ ] docker compose -f docker-compose.test.yml up -d → test DB starts
  [ ] patchiq_test database created and schema applied
  [ ] patchiq_dev has ZERO test data pollution

Backend:
  [ ] make test-backend-unit → 250+ tests pass, 90%+ coverage
  [ ] make test-backend-integration → 540+ tests pass, all endpoints covered
  [ ] make test-backend-contract → envelope consistency + agent payloads verified
  [ ] Every 4xx/5xx error path tested
  [ ] Every response uses { success, data } envelope

Agent:
  [ ] make test-agent-unit → all Go tests pass, no race conditions
  [ ] make test-agent-contract → Go payloads match JSON Schema from Zod
  [ ] make test-agent-live → agent registers, heartbeats, executes commands

Frontend:
  [ ] make test-frontend-unit → 370+ tests pass, zero console errors
  [ ] make test-frontend-e2e → 337+ Playwright tests pass
  [ ] Every page renders without console errors
  [ ] Every button does what it's supposed to
  [ ] Every form validates and submits
  [ ] Every table paginates, sorts, filters, searches

Full Suite:
  [ ] make test → ALL pass
  [ ] make test-full → ALL pass including live agent + Playwright
  [ ] make check-all → types + lint + tests pass

Regression Safety:
  [ ] Change a Zod schema → agent contract test breaks ✓
  [ ] Change a response shape → envelope test breaks ✓
  [ ] Add console.error to component → Vitest + Playwright break ✓
  [ ] Change an API endpoint path → integration test breaks ✓
  [ ] Change Go struct field → contract test breaks ✓
```

### 9.4 Test Count Summary

| Phase | Layer | Test Count |
|-------|-------|-----------|
| 2 | Backend Unit | ~300 |
| 3 | Backend Integration | ~540 |
| 4 | Backend Contract | ~50 |
| 5 | Agent Unit | ~100 |
| 6 | Agent Contract + Live | ~30 |
| 7 | Frontend Unit | ~370 |
| 8 | Frontend E2E (Playwright) | ~337 |
| **TOTAL** | | **~1,727** |

---

## Implementation Notes

1. **Do not write all tests at once**. Implement phase by phase, run, fix, verify, then move on.
2. **Read the actual code before writing tests**. Don't guess endpoints or response shapes from route files alone — read the controller and service to understand every code path.
3. **Each phase should be a separate PR/commit** so regressions are easy to bisect.
4. **The console error trapping is the most impactful single change** — it will surface dozens of hidden issues in the frontend immediately.
5. **Contract tests are the second most impactful** — they prevent the agent-backend drift that has caused repeated pain.
6. **Settings module is the largest** (~100+ endpoints). Consider splitting `settings.test.ts` into multiple files by section.
