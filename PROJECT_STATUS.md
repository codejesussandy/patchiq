# PatchIQ - Project Status

**Last Updated:** 2026-01-22
**Integration Status:** Complete

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│   Backend   │────▶│  PostgreSQL │
│  React/TS   │     │  Express    │     │   Prisma    │
│  Port 5173  │     │  Port 3000  │     │  Port 5432  │
└─────────────┘     └─────────────┘     └─────────────┘
                           ▲
                           │
                    ┌──────┴──────┐
                    │  Go Agent   │
                    │  Port 8080  │
                    └─────────────┘
```

## What Works

| Feature | Status | Notes |
|---------|--------|-------|
| Authentication | Working | JWT-based |
| Assets CRUD | Working | Full CRUD |
| Agents CRUD | Working | Including approvals |
| Patches CRUD | Working | Full CRUD |
| Deployments CRUD | Working | Records only* |
| Tags/Categories | Working | Full CRUD |
| Users CRUD | Working | Via settings |
| Hardware Data | Working | Agent → Backend → Frontend |
| Telemetry | Working | Real-time from agent |

*Deployments create records but don't execute (business logic pending)

## What's Pending (Backlog)

| Item | Priority | Description |
|------|----------|-------------|
| Deployment Execution | High | Send commands to agents |
| Job Execution | High | Execute scheduled jobs |
| Discovery Scanning | Medium | Actually scan networks |
| Vulnerability Sync | Medium | Sync CVE databases |
| Decimal Transforms | Low | Cost field serialization |
| Antd Warnings | Low | Deprecation fixes |

## How to Run

```bash
# 1. Start database
cd backend && docker-compose up -d

# 2. Start backend
cd backend && npm run dev

# 3. Start frontend
cd frontend && npm run dev

# 4. (Optional) Start agent
./agent/patchify-agent
```

## Test Credentials

- Admin: `admin@patchiq.io` / `admin123`
- Demo: `demo@patchiq.io` / `demo123`

## Documentation

See `/docs/integration/` for detailed integration documentation.
