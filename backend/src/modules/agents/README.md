# Module: agents

## Responsibility

Manages Go agent lifecycle: registration, heartbeat processing, inventory collection, telemetry streaming, command dispatch, and agent binary version management. Exposes both a frontend-facing API (/v1/agents) and an agent-facing API (/api/agent).

## Endpoints

### Frontend API (authenticated via user JWT)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/agents | List all agents (with filtering) | Yes |
| GET | /v1/agents/downloads | Get agent download links | Yes |
| GET | /v1/agents/:id | Get agent details | Yes |
| PUT | /v1/agents/:id | Update agent | Yes |
| DELETE | /v1/agents/:id | Delete agent | Yes |
| GET | /v1/agents/:id/commands | Get agent command history | Yes |
| POST | /v1/agents/:id/collect | Trigger on-demand inventory collection | Yes |
| POST | /v1/agents/:id/update | Trigger agent self-update | Yes |
| GET | /v1/agents/:id/telemetry/latest | Get latest telemetry | Yes |
| GET | /v1/agents/:id/telemetry/stream | SSE stream for real-time telemetry | Yes |

### Agent Versions API (authenticated via user JWT)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/agent-versions | List all agent versions | Yes |
| GET | /v1/agent-versions/:id/download | Download agent binary | Yes |
| POST | /v1/agent-versions/:id/upload | Upload agent binary (admin) | Yes |

### Agent API (authenticated via agent JWT + X-Agent-Id header)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/agent/register | Agent registration | No |
| POST | /api/agent/token/refresh | Refresh agent token | No (uses refresh token) |
| GET | /api/agent/update/binary/:versionId | Download agent binary for self-update | No (UUID as token) |
| POST | /api/agent/heartbeat | Agent heartbeat | Agent JWT |
| GET | /api/agent/commands | Get pending commands | Agent JWT |
| POST | /api/agent/commands/:id/result | Report command result | Agent JWT |
| GET | /api/agent/config | Get agent configuration | Agent JWT |
| POST | /api/agent/inventory | Submit inventory data | Agent JWT |
| POST | /api/agent/telemetry | Submit telemetry data | Agent JWT |

## Data Flow

```
Request → Controller → Validator (Zod) → Service → Prisma → Response
```

Agent registration: register -> issue agent JWT -> create Agent record.
Heartbeat: update lastSeen + status -> evaluate telemetry alerts -> return pending commands.
Inventory: upsert hardware/software/network/security/peripheral data -> evaluate security alerts.

## Key Files

- `agents.controller.ts` — Frontend-facing handlers (list, get, update, delete, commands, telemetry)
- `agent-api.controller.ts` — Agent-facing handlers (register, heartbeat, inventory, telemetry, commands)
- `agents.service.ts` — Business logic for both APIs
- `agents.validators.ts` — Zod schemas for all endpoints
- `agents.routes.ts` — Frontend routes (/v1/agents)
- `agent-api.routes.ts` — Agent routes (/api/agent) with custom agent JWT auth
- `agent-versions.routes.ts` — Agent version management routes

## Dependencies

- **Depends on:** alerts (evaluateAlertsForAsset, evaluateSecurityAlertsForAsset), notifications (broadcast), shared/utils (JWT)
- **Depended on by:** deployments (sends commands to agents), assets (agents create assets via inventory)

## Notes

- Agent API uses a custom `authenticateAgent` middleware (not the standard user `authenticate`), verifying agent JWT + X-Agent-Id header match
- `/api/agent/register` is public (no auth) -- agents register themselves
- `/api/agent/update/binary/:versionId` uses the version UUID as implicit authorization (no JWT)
- SSE telemetry stream at `/v1/agents/:id/telemetry/stream` for real-time monitoring
