# Module: notifications

## Responsibility

Manages user notifications with real-time delivery via Server-Sent Events (SSE), notification preferences, bulk operations, and history tracking.

## Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/notifications/stream | SSE stream for real-time notifications | Token via query param |
| GET | /v1/notifications | List notifications | Yes |
| GET | /v1/notifications/unread-count | Get unread notification count | Yes |
| PUT | /v1/notifications/mark-all-read | Mark all as read | Yes |
| GET | /v1/notifications/history | Get notification history | Yes |
| PUT | /v1/notifications/bulk-read | Bulk mark as read | Yes |
| DELETE | /v1/notifications/bulk | Bulk delete notifications | Yes |
| GET | /v1/notifications/preferences | Get notification preferences | Yes |
| PUT | /v1/notifications/preferences | Update notification preferences | Yes |
| PUT | /v1/notifications/:id/read | Mark single notification as read | Yes |
| DELETE | /v1/notifications/:id | Delete single notification | Yes |
| DELETE | /v1/notifications | Clear all notifications | Yes |

## Data Flow

```
Request → Controller → Validator (Zod) → Service → Prisma → Response
```

SSE flow: client connects with token query param -> server keeps connection open -> `notificationsService.broadcast()` pushes events to all connected clients.

## Key Files

- `notifications.controller.ts` — Route handlers + SSE stream handler (singleton `notificationsController`)
- `notifications.service.ts` — CRUD, broadcast logic, SSE client management (singleton `notificationsService`)
- `notifications.validators.ts` — Zod schemas
- `notifications.routes.ts` — Route definitions

## Dependencies

- **Depends on:** (none -- standalone notification service)
- **Depended on by:** agents (broadcasts agent events), alerts (broadcasts alert events), deployments (broadcasts deployment status)

## Notes

- SSE stream is also mounted early in `app.ts` to bypass the assets router's global auth middleware
- SSE uses query-param token authentication because EventSource API cannot send custom headers
- Static routes (unread-count, mark-all-read, history, bulk-read, bulk, preferences) must be defined before parameterized `:id` routes
- `notificationsService.broadcast()` is used by other modules to send real-time notifications
