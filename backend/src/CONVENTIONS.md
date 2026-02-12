# Backend Service Conventions

> Established during Phase 2 — Backend Discipline. All new code must follow these conventions.

---

## 1. Service Patterns

### When to use `BaseCrudService`

Use `BaseCrudService` for any entity with standard CRUD operations (list, get, create, update, delete):

```typescript
// backend/src/modules/assets/category-crud.service.ts
class CategoryCrudService extends BaseCrudService<Category, CreateCategoryInput, UpdateCategoryInput, CategoryResponse> {
  constructor() {
    super({
      modelName: 'category',
      entityName: 'Category',
      searchFields: ['name'],
      defaultOrderBy: { name: 'asc' },
    });
  }

  // Override only what's unique to this entity
  protected transform(model: Category): CategoryResponse {
    return { id: model.id, name: model.name, description: model.description };
  }
}

export const categoryCrudService = new CategoryCrudService();
```

**Use BaseCrudService when:**
- Entity has standard list/get/create/update/delete operations
- Pagination, search, and sorting follow standard patterns
- You want automatic logging, existence checks, and uniqueness validation

**Use custom service functions when:**
- Operations don't fit CRUD patterns (e.g., `processInventory`, `syncCVEs`)
- Complex multi-entity workflows
- Batch operations with custom logic

### Service file size

- **Target: <500 lines per service file**
- If a service exceeds 500 lines, split into sub-services (e.g., `category-crud.service.ts`, `tag-crud.service.ts`)
- Keep the main service file as a facade that delegates to sub-services

---

## 2. Transactions

### When to use `withTransaction`

**Always wrap in a transaction when:**
- An operation performs 2+ sequential database writes
- Failure of step N would leave steps 1..N-1 in an inconsistent state
- Deleting and recreating related records (e.g., tag associations)

**Do NOT wrap in a transaction when:**
- Single read-only query
- Single write operation
- Fire-and-forget async operations (CVE checks, patch applicability)

### How to use

```typescript
import { withTransaction } from '@shared/utils/transaction';

async function updateAgent(id: string, data: UpdateAgentInput) {
  return withTransaction('updateAgent', async (tx) => {
    const agent = await tx.agent.update({ where: { id }, data });
    await tx.agentTagRelation.deleteMany({ where: { agentId: id } });
    await tx.agentTagRelation.createMany({ data: newTags });
    return agent;
  });
}
```

### Key rules

- First argument is the **operation name** — used in error logs
- Use `tx` (transaction client) for ALL queries inside the callback, not `prisma`
- Keep fire-and-forget operations **outside** the transaction
- Default timeout: 10s. Override for long operations: `withTransaction('bulkSync', fn, { timeout: 30000 })`
- Transaction failures are automatically logged with operation name and error context

---

## 3. Logging

### Logger setup

Every module creates a logger with `createLogger`:

```typescript
import { createLogger } from '@shared/services/logger';
const logger = createLogger('agents');
```

Module names use **kebab-case**: `'agents'`, `'patch-repository'`, `'cve-database'`, `'deployment-executor'`

### Log levels

| Level | When to use | Example |
|-------|-------------|---------|
| `error` | Operation failed, needs attention | `logger.error({ err, agentId }, 'Agent registration failed')` |
| `warn` | Unexpected but handled condition | `logger.warn({ patchId }, 'Patch superseded during deployment')` |
| `info` | Significant business events | `logger.info({ agentId }, 'Agent registered successfully')` |
| `debug` | Diagnostic details for debugging | `logger.debug({ query }, 'Executing search query')` |

### Structured logging format

```typescript
// GOOD — structured data as first arg, message as second
logger.info({ agentId, status: 'ONLINE' }, 'Agent heartbeat received');
logger.error({ err: error, jobId }, 'Job execution failed');

// BAD — string interpolation
logger.info(`Agent ${agentId} heartbeat received`);
logger.error('Error: ' + error.message);
```

### Error logging

Always use `err` as the key for Error objects — pino serializes them with stack traces:

```typescript
logger.error({ err: error, context: 'additional data' }, 'Description of what failed');
```

### Request context

In controllers, use `req.log` to include the request ID automatically:

```typescript
export async function getAgent(req: Request, res: Response) {
  req.log.info({ agentId: req.params.id }, 'Fetching agent');
  // ...
}
```

---

## 4. Error Handling

### Error types

| Error | HTTP Status | When to use |
|-------|-------------|-------------|
| `NotFoundError` | 404 | Entity not found by ID |
| `BadRequestError` | 400 | Invalid input that passed Zod validation |
| `ConflictError` | 409 | Duplicate unique field (name, email, etc.) |
| `UnauthorizedError` | 401 | Missing or invalid auth token |
| `ForbiddenError` | 403 | Insufficient permissions |

### Throw, don't return

Services **throw errors** — the error middleware catches them and returns the standard envelope:

```typescript
// GOOD — service throws
async function getAgent(id: string) {
  const agent = await prisma.agent.findUnique({ where: { id } });
  if (!agent) throw new NotFoundError('Agent not found');
  return agent;
}

// BAD — service returns error object
async function getAgent(id: string) {
  const agent = await prisma.agent.findUnique({ where: { id } });
  if (!agent) return { error: 'Not found' };  // Don't do this
  return agent;
}
```

### Error flow

```
Controller → Service (throws) → Error Middleware → Standard envelope response
```

The error middleware handles serialization. Services never call `res.json()` directly.

---

## 5. Validation

### Every route must have Zod validation

```typescript
// routes file
router.get('/agents', validateQuery(agentListQuerySchema), controller.listAgents);
router.post('/agents', validateBody(createAgentSchema), controller.createAgent);
router.get('/agents/:id', validateParams(idParamSchema), controller.getAgent);
```

### Shared schemas

- **Pagination**: Use `paginationSchema` from `@shared/validators/pagination` for all list endpoints
- **ID params**: Use `z.object({ id: z.string().uuid() })` for ID path params
- Extend shared schemas for module-specific filters:

```typescript
import { paginationSchema } from '@shared/validators/pagination';

export const agentListQuerySchema = paginationSchema.extend({
  status: z.enum(['ONLINE', 'OFFLINE']).optional(),
  os: z.string().optional(),
});
```

### Controller access

Use `typedQuery<T>(req)` to get validated, typed query params:

```typescript
const { page, limit, search, status } = typedQuery<AgentListQuery>(req);
```

**Never** use `req.query.X as string` — always go through Zod validation.

---

## 6. API Response Envelope

All endpoints return the standard envelope:

```typescript
import { sendSuccess } from '@shared/utils/response';

// Success
sendSuccess(res, data);           // { success: true, data }
sendSuccess(res, data, { meta }); // { success: true, data, meta }

// Errors are handled by error middleware automatically
// { success: false, error: { message, code, details? } }
```

---

## 7. Module Documentation

Every module in `backend/src/modules/` has a `README.md` documenting:

- **Responsibility** — What the module does (1-2 sentences)
- **Endpoints** — Table of all HTTP endpoints (Method, Path, Description, Auth)
- **Data Flow** — Request lifecycle through the module
- **Key Files** — Controller, service, validator, routes, and other important files
- **Dependencies** — What it depends on and what depends on it
- **Notes** — Edge cases, gotchas, non-obvious behavior

When adding a new module or modifying endpoints, **update the module's README.md** to keep documentation in sync.

---

## Quick Reference

| Pattern | Where | Import |
|---------|-------|--------|
| Logger | `@shared/services/logger` | `createLogger('module-name')` |
| Transactions | `@shared/utils/transaction` | `withTransaction('opName', fn)` |
| Base CRUD | `@shared/services/base-crud.service` | `extends BaseCrudService<...>` |
| Validation | `@middleware/validation` | `validateQuery`, `validateBody`, `validateParams` |
| Errors | `@shared/errors` | `NotFoundError`, `ConflictError`, etc. |
| Response | `@shared/utils/response` | `sendSuccess(res, data)` |
| Pagination | `@shared/validators/pagination` | `paginationSchema` |
