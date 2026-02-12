# Module: alerts

## Responsibility

Evaluates alert conditions against asset telemetry and security data. Creates and auto-resolves AssetAlert records when conditions are met or no longer met. No HTTP endpoints -- this is a service-only module.

## Endpoints

This module has no HTTP endpoints. It is a background service consumed by other modules.

## Data Flow

```
Agent telemetry/inventory → agents.service → evaluateAlertsForAsset / evaluateSecurityAlertsForAsset → Prisma → Notification broadcast
```

Alert evaluation: load enabled AlertConfig records (with 30s cache) -> evaluate conditions against telemetry data -> create/resolve AssetAlert records -> broadcast notifications.

## Key Files

- `alert-evaluation.service.ts` — Alert evaluation logic with condition matching and auto-resolve

## Dependencies

- **Depends on:** notifications (broadcasts alert/resolve events)
- **Depended on by:** agents (calls evaluateAlertsForAsset and evaluateSecurityAlertsForAsset from heartbeat and inventory processing)

## Notes

- AlertConfig records are managed via the settings module (`/v1/settings/alerts/*`)
- In-memory cache with 30s TTL avoids repeated DB queries for enabled configs
- Supports numeric conditions (CPU, memory, disk) and boolean conditions (firewall, antivirus, pending reboot)
- All conditions within a config use AND logic -- all must match to trigger
- Auto-resolves open alerts when conditions are no longer met
