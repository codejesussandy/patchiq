# PRD: Phase 2 — Backend Discipline

> **Owner:** Engineering Team
> **Status:** COMPLETED
> **Last Updated:** 2026-02-12
> **Roadmap Reference:** Phase 2 (Now / Must Have)
> **Dependency:** Phase 1 (Type Safety & Shared Contracts) — COMPLETED

---

## 1. Problem Statement

PatchIQ's backend has no observability, inconsistent data integrity guarantees, and heavy code duplication across 20 service files totalling 20,634 lines. This causes:

- **Blind debugging** — 325 `console.log/error/warn` calls with no structure, no log levels, and no request correlation. When a deployment fails, there's no way to trace the request through the system. Developers grep logs by guessing module prefixes like `[VulnerabilityJob]`.
- **Data integrity risks** — Only 19 `prisma.$transaction()` calls exist despite 15-20 identified multi-step operations that run without atomicity. Example: `updateAgent` deletes tag relations, then creates new ones across 5 sequential queries — if step 3 fails, the agent loses all tags with no rollback.
- **Massive code duplication** — 80% of CRUD operations across 18 modules follow identical patterns (findMany with pagination, findById with NotFoundError, create with duplicate check, update, delete). Each module reimplements this from scratch. `assets.service.ts` alone is 2,997 lines.
- **Validation gaps** — While 85-90% of routes have Zod validation, ~5-10 query parameter access points bypass validation entirely (e.g., `req.query.categoryId as string`). No strict enum validation on some endpoints.

**Cost of not solving:** Without structured logging, production incidents are diagnosed by guesswork. Without transactions, every multi-step API call is a potential data corruption event. Without CRUD abstraction, every new module adds 500+ lines of copy-pasted boilerplate.

---

## 2. Goals

| # | Goal | Measurement |
|---|------|-------------|
| G1 | Complete request observability | Every API request has a unique ID traceable through all log entries |
| G2 | Zero `console.log` in production code | `grep -r "console\." backend/src/ \| grep -v node_modules \| grep -v ".test." \| wc -l` returns 0 |
| G3 | Atomic multi-step operations | All identified multi-step operations wrapped in transactions |
| G4 | Reduce service boilerplate by 40%+ | Total service LOC drops from 20,634; new modules require <100 lines for standard CRUD |
| G5 | 100% Zod validation coverage | Every `req.body`, `req.query`, `req.params` access goes through Zod validation |

---

## 3. Non-Goals

| Non-Goal | Reason |
|----------|--------|
| Log aggregation infrastructure (ELK, Datadog) | Infrastructure concern — solved separately when deploying to production |
| Service file splitting / decomposition | That's a refactoring concern; base class reduces new code, doesn't restructure existing files |
| Frontend changes | Backend-only phase; frontend unaffected |
| New feature development | Discipline before features |
| Performance optimization | Not related to backend discipline |
| Test coverage improvements | That's Phase 4 |

---

## 4. User Stories

**As a developer debugging a production issue**, I want every log entry to include a request ID, timestamp, log level, and module name so that I can trace a failing request end-to-end without guessing.

**As a developer investigating a data corruption report**, I want all multi-step database operations to be atomic so that partial failures never leave orphaned or inconsistent records.

**As a developer building a new module**, I want to inherit standard CRUD operations from a base service so that I write only the business logic unique to my module — not another 500 lines of findMany/findById/create/update/delete.

**As a developer reviewing a PR**, I want TypeScript to guarantee that every request parameter is Zod-validated so that I don't need to manually check for missing validation.

**As an on-call engineer**, I want structured JSON logs with severity levels so that I can filter for errors and warnings without reading thousands of info-level lines.

---

## 5. Requirements

### Must Have (P0)

#### R1: Structured logging with Pino

**Description:** Replace all 325 `console.*` calls with a structured logging library. Every log entry includes timestamp, level, module, and request context.

**Approach:**
1. Install `pino` + `pino-pretty` (dev) — fast, JSON-native, standard in Express ecosystem
2. Create a central logger factory: `createLogger(module: string)` returns a child logger with module context
3. Add request ID middleware that generates a unique ID per request and attaches it to the logger
4. Replace all `console.log` → `logger.info`, `console.error` → `logger.error`, `console.warn` → `logger.warn`
5. Add request/response logging middleware (method, path, status, duration)

**Logger API:**
```typescript
// /backend/src/shared/services/logger.ts
import pino from 'pino';

const rootLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});

export function createLogger(module: string) {
  return rootLogger.child({ module });
}

// Usage in any service:
const logger = createLogger('agents');
logger.info({ agentId }, 'Agent registered successfully');
logger.error({ err, jobId }, 'Job execution failed');
```

**Request ID middleware:**
```typescript
// Generates unique request ID, attaches to req and logger
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  req.log = rootLogger.child({ requestId: req.id });
  res.setHeader('x-request-id', req.id);
  next();
});
```

**Console.log distribution (current state):**

| Area | Count | Notes |
|------|-------|-------|
| Modules (services + controllers) | 123 | Primary target |
| server.ts | 40 | Startup/shutdown logs |
| shared/services/ | 41 | CVE database (38), MinIO (3) |
| middleware/ | 3 | Error handler, audit |
| db/prisma/ (seeds/scripts) | 72 | Seeds can keep console.log |
| **Total to migrate** | **253** | Excluding seeds/scripts |

**Acceptance Criteria:**
- [ ] `pino` installed and configured with development pretty-printing and production JSON output
- [ ] `createLogger(module)` factory function available in `@shared/services/logger`
- [ ] Request ID middleware generates UUID per request, passes via `x-request-id` header
- [ ] Request/response logging middleware logs method, path, status code, and duration
- [ ] All 253 `console.*` calls in production code replaced with appropriate pino calls
- [ ] Log entries include: timestamp, level, module, requestId (when in request context), and structured data
- [ ] `LOG_LEVEL` environment variable controls verbosity (default: `info`)
- [ ] Zero `console.log/error/warn` in `backend/src/` (excluding `db/prisma/seeds/` and `db/prisma/scripts/`)
- [ ] Existing log context preserved (module prefixes like `[VulnerabilityJob]` become `{ module: 'vulnerability-job' }`)

---

#### R2: Generic CRUD base service

**Description:** Extract a reusable `BaseCrudService<T>` that provides standard CRUD operations. Modules inherit and override only what's unique.

**Approach:**
```typescript
// /backend/src/shared/services/base-crud.service.ts
export abstract class BaseCrudService<
  TModel,
  TCreateInput,
  TUpdateInput,
  TResponse,
  TListQuery extends PaginationQuery = PaginationQuery
> {
  protected abstract readonly model: PrismaDelegate;
  protected abstract readonly entityName: string;

  // Override these for custom behavior
  protected defaultInclude?: object;
  protected defaultOrderBy?: object;
  protected searchFields?: string[];

  // Standard operations — override any for custom logic
  async findMany(query: TListQuery): Promise<PaginatedResult<TResponse>>;
  async findById(id: string): Promise<TResponse>;
  async create(data: TCreateInput): Promise<TResponse>;
  async update(id: string, data: TUpdateInput): Promise<TResponse>;
  async delete(id: string): Promise<void>;
  async count(where?: object): Promise<number>;

  // Built-in helpers
  protected async ensureExists(id: string): Promise<TModel>;
  protected async ensureUnique(field: string, value: string, excludeId?: string): Promise<void>;
  protected transform(model: TModel): TResponse; // Identity by default
}
```

**Modules that benefit most (repeated CRUD patterns):**

| Module | Repeated CRUD Sets | Current LOC | Estimated Reduction |
|--------|-------------------|-------------|-------------------|
| assets | Categories, SubCategories, Tags, Assets | 2,997 | ~800 lines |
| patches | Patches, PatchBundles | 2,522 | ~400 lines |
| jobs | 7 entity types (Patch/Vuln/Software/Config jobs) | 1,215 | ~500 lines |
| settings | Users, Roles, Orgs, Policies | 1,377 | ~400 lines |
| agents | Agents | 1,322 | ~200 lines |
| vulnerabilities | Vulnerabilities | 1,122 | ~200 lines |

**Acceptance Criteria:**
- [ ] `BaseCrudService` abstract class created with findMany, findById, create, update, delete, count
- [ ] Built-in pagination support (page, limit, sort, search) matching existing query patterns
- [ ] Built-in existence check (`ensureExists`) that throws `NotFoundError`
- [ ] Built-in uniqueness check (`ensureUnique`) that throws `ConflictError`
- [ ] Transform hook for mapping Prisma models to response shapes
- [ ] At least 4 modules refactored to use `BaseCrudService` as proof of adoption
- [ ] New module can implement full CRUD in <100 lines (excluding business logic)
- [ ] No behavior change in API responses — all existing endpoints return same data

---

#### R3: Prisma transaction wrappers for multi-step operations

**Description:** Wrap all identified multi-step database operations in transactions to guarantee atomicity.

**Operations to wrap (identified risks):**

| Service | Operation | Steps | Risk Without Transaction |
|---------|-----------|-------|------------------------|
| agents.service | `updateAgent` | Update agent → delete tags → find tags → create tags → fetch final | Agent loses all tags on step 3/4 failure |
| agents.service | `processInventory` | Delete software → create software → upsert inventory | Asset has no software on step 2 failure |
| agents.service | `registerAgent` (re-reg) | Create asset → update agent | Orphaned asset on update failure |
| patches.service | `createPatch` + supersedence | Create patch → update superseded patches | Inconsistent supersedence chain |
| jobs.service | `createDeploymentJob` | Create job → create tasks → update assets | Orphaned tasks on asset update failure |
| hub.service | `publishBundle` | Create bundle → upload to MinIO → update status | Bundle marked published but no file in storage |
| settings.service | `updateRole` + permissions | Update role → delete permissions → create permissions | Role with no permissions on failure |
| discovery.service | `processDiscoveryResults` | Create/update assets → create agents → link relations | Partial discovery results |

**Approach:**
```typescript
// Transaction helper utility
export async function withTransaction<T>(
  fn: (tx: PrismaTransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(fn, {
    maxWait: 5000,
    timeout: 10000,
  });
}

// Usage:
async function updateAgent(id: string, data: UpdateAgentInput) {
  return withTransaction(async (tx) => {
    const agent = await tx.agent.update({ where: { id }, data });
    await tx.agentTagRelation.deleteMany({ where: { agentId: id } });
    // ... all steps in same transaction
    return agent;
  });
}
```

**Acceptance Criteria:**
- [ ] `withTransaction()` helper created with configurable timeout and error handling
- [ ] All 8 identified multi-step operations wrapped in transactions
- [ ] Transaction failures trigger full rollback — no partial state changes
- [ ] Transaction errors logged with full context (operation name, entity IDs, step that failed)
- [ ] Existing 19 transaction usages reviewed and standardized to use the helper
- [ ] No new multi-step operation introduced without transaction wrapper (documented convention)

---

#### R4: Complete Zod validation coverage

**Description:** Ensure every API endpoint validates all inputs through Zod schemas. Close the 5-10 identified validation gaps.

**Current state:** 85-90% coverage. Gaps are primarily in query parameter access.

**Gaps to fix:**

| Location | Gap | Fix |
|----------|-----|-----|
| Query params accessed as `req.query.X as string` | No Zod validation | Add query schemas to validators |
| Optional filter params | Silently ignored if wrong type | Add `.optional()` Zod schemas |
| Enum values in query strings | Not validated against enum | Add `.enum()` validation |
| Pagination params | Some endpoints accept any value | Standardize with shared pagination schema |

**Approach:**
1. Audit every controller for direct `req.query`, `req.body`, `req.params` access
2. Create missing Zod schemas in corresponding `*.validators.ts` files
3. Add `validateQuery` middleware to routes missing query validation
4. Create shared pagination schema reused across all list endpoints
5. Add strict enum validation for all enum query params

**Shared pagination schema:**
```typescript
// /backend/src/shared/validators/pagination.ts
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  search: z.string().optional(),
});
```

**Acceptance Criteria:**
- [ ] Every route has explicit Zod validation for body, query, AND params
- [ ] Shared pagination schema used by all list endpoints
- [ ] All enum query params validated against their enum values
- [ ] No direct `req.query.X as string` access in any controller
- [ ] `req.body` type comes from Zod inference (`z.infer<typeof schema>`), not manual type assertions
- [ ] Validation errors return standard envelope with field-specific details

---

### Should Have (P1)

#### R5: Request/response audit logging middleware

**Description:** Middleware that logs every API request and response for observability, building on R1's logging infrastructure.

**What to log:**
```typescript
// Request (on entry)
{ level: 'info', requestId, method, path, query, userId, ip, userAgent }

// Response (on completion)
{ level: 'info', requestId, method, path, statusCode, duration_ms }

// Error (on failure)
{ level: 'error', requestId, method, path, statusCode, duration_ms, error }
```

**Acceptance Criteria:**
- [ ] Every API request logged on entry with method, path, and authenticated user
- [ ] Every API response logged on completion with status code and duration
- [ ] Errors logged with full error context (stack trace in development, message in production)
- [ ] Sensitive fields excluded from logs (passwords, tokens, authorization headers)
- [ ] Health check endpoints (`/health`, `/ready`) excluded from request logging to reduce noise
- [ ] Duration tracking accurate to milliseconds

---

#### R6: Service architecture guidelines

**Description:** Document conventions so new modules follow consistent patterns. Not a code change — a development guide.

**Guidelines to document:**
- When to use `BaseCrudService` vs custom service functions
- Transaction requirements (when to use `withTransaction`)
- Logging conventions (what to log at each level)
- Error handling patterns (when to throw vs return)
- Service file size guidance (<500 lines recommended; split into sub-services if larger)

**Acceptance Criteria:**
- [ ] Guidelines documented in `backend/src/CONVENTIONS.md`
- [ ] Covers: service patterns, transactions, logging, error handling, validation
- [ ] Includes examples from actual codebase
- [ ] Reviewed by team

---

## 6. Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| `console.*` in production code | 0 | `grep -r "console\." backend/src/ \| grep -v seeds \| grep -v scripts \| grep -v node_modules \| wc -l` |
| Structured log entries | 100% of API requests | Review pino output for request/response entries |
| Transaction-wrapped multi-step ops | 100% | Code audit of all multi-step operations |
| Zod validation coverage | 100% of endpoints | Audit all route definitions for validation middleware |
| CRUD boilerplate reduction | 40%+ reduction in new module LOC | Compare LOC of new module using BaseCrudService vs current average |
| Service LOC (total) | <18,000 (from 20,634) | `wc -l backend/src/modules/**/*.service.ts` |

---

## 7. Open Questions

| # | Question | Owner | Blocking? |
|---|----------|-------|-----------|
| Q1 | Should we add log rotation configuration or leave that to deployment? | DevOps | No — default to no rotation in app; handle at infrastructure level |
| Q2 | Should `BaseCrudService` support soft deletes (`deletedAt` field)? | Engineering | No — implement if needed later; current models use hard deletes |
| Q3 | Should we migrate existing 19 transaction usages to use `withTransaction` helper? | Engineering | No — can be done alongside new wrapping work |
| Q4 | What transaction timeout is appropriate for bulk operations (e.g., inventory sync)? | Engineering | No — start with 10s default, tune per-operation |

---

## 8. Implementation Order

```
R1 (Structured logging) → R3 (Transactions) → R4 (Zod validation) → R2 (Base CRUD) → R5 (Audit middleware) → R6 (Guidelines)
```

**Rationale:**
1. **Logging first** — every subsequent requirement benefits from structured logs. Transaction failures, validation errors, and CRUD operations all need proper logging.
2. **Transactions next** — data integrity is the highest-risk item. Can be done independently per service.
3. **Zod validation** — closes remaining gaps. Straightforward and parallelizable.
4. **Base CRUD** — depends on logging (base class logs operations) and transactions (base class wraps in transactions). Most impactful for code reduction but needs the infrastructure from R1+R3.
5. **Audit middleware** — builds on R1's logger. Nice-to-have timing allows it to be done last.
6. **Guidelines** — written after patterns are established, not before.

---

## 9. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Logging migration breaks error handling | Medium | Low | Replace one module at a time; test error paths |
| Transaction wrapping changes behavior | High | Medium | Test each wrapped operation thoroughly; some queries may need `isolationLevel` tuning |
| BaseCrudService doesn't fit all modules | Medium | Medium | Keep it optional — modules with unique patterns keep custom services |
| Zod validation rejects previously-accepted requests | Medium | Low | Add validation gradually; log warnings before enforcing |

---

*This PRD should be reviewed and approved before implementation begins.*
