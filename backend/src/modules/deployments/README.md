# Module: deployments

## Responsibility

Executes software, patch, and configuration deployments to target agents. Manages the deployment lifecycle: scheduling, command dispatch, status tracking, cancellation, rollback. This is the "how to deploy" module.

## Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /v1/deployments/software | Create software deployment | Yes |
| GET | /v1/deployments/software | List software deployments | Yes |
| GET | /v1/deployments/software/:deploymentId | Get software deployment status | Yes |
| POST | /v1/deployments/software/:deploymentId/cancel | Cancel software deployment | Yes |
| POST | /v1/deployments/software/:deploymentId/tasks/:taskId/rollback | Trigger rollback | Yes |
| POST | /v1/deployments/config | Create config deployment | Yes |
| GET | /v1/deployments/config/:deploymentId | Get config deployment status | Yes |
| POST | /v1/deployments/patch | Create patch deployment | Yes |
| GET | /v1/deployments/patch | List patch deployments | Yes |
| GET | /v1/deployments/patch/:deploymentId | Get patch deployment status | Yes |
| POST | /v1/deployments/patch/:deploymentId/cancel | Cancel patch deployment | Yes |

## Data Flow

```
Request → Controller → Validator (Zod) → Service (DeploymentExecutorService) → Agent Commands → Prisma → Response
```

Deployment execution: create deployment record -> resolve target agents -> create DeploymentTask per agent -> dispatch agent commands -> agent downloads from Hub/MinIO -> agent executes scripts -> reports result.

## Key Files

- `deployment.controller.ts` — Route handlers (singleton `deploymentController`)
- `deployment-executor.service.ts` — Core execution logic (singleton `deploymentExecutorService`)
- `deployment-executor.types.ts` — Type definitions for deployment payloads
- `deployment.routes.ts` — Standalone deployment routes
- `deployment.validators.ts` — Zod schemas

## Dependencies

- **Depends on:** hub (hubService -- resolves package bundles and execution payloads), notifications (broadcast deployment status), agents (dispatches commands to agents)
- **Depended on by:** patches (delegates deployment execution), jobs (deployment definitions reference this executor)

## Notes

- The deployment controller is also mounted via `patches.routes.ts` at `/v1/deployments/*` -- both route files register the same controller methods
- `deployment.routes.ts` is a standalone route file also mounted in `app.ts` -- the patches module re-exports these routes for backward compatibility
- Rollback is per-task (individual agent), not per-deployment
- Uses Hub's execution payload system: agent gets script + package bundle info, downloads from MinIO, executes locally
