# Module: discovery

## Responsibility

Manages network device discovery via IP range scanning, device credential management, and enrollment of discovered devices as managed assets.

## Endpoints

### IP Ranges

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/discovery/ip-ranges | List all IP ranges | Yes |
| GET | /v1/discovery/ip-ranges/:id | Get IP range by ID | Yes |
| POST | /v1/discovery/ip-ranges | Create IP range | Yes |
| PUT | /v1/discovery/ip-ranges/:id | Update IP range | Yes |
| DELETE | /v1/discovery/ip-ranges/:id | Delete IP range | Yes |
| POST | /v1/discovery/ip-ranges/:id/scan | Trigger network scan | Yes |

### Scans

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/discovery/scans/:id | Get scan status | Yes |
| GET | /v1/discovery/scans/:id/results | Get scan results | Yes |

### Device Credentials

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/discovery/credentials | List credentials | Yes |
| GET | /v1/discovery/credentials/:id | Get credential by ID | Yes |
| POST | /v1/discovery/credentials | Create credential | Yes |
| PUT | /v1/discovery/credentials/:id | Update credential | Yes |
| DELETE | /v1/discovery/credentials/:id | Delete credential | Yes |
| POST | /v1/discovery/credentials/:id/test | Test credential connectivity | Yes |

### Discovered Devices

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /v1/discovery/devices | List discovered devices | Yes |
| POST | /v1/discovery/devices/:id/enroll | Enroll device as managed asset | Yes |

## Data Flow

```
Request → Controller → Validator (Zod) → Service → Prisma → Response
```

Discovery flow: define IP range -> trigger scan -> discover devices -> enroll as managed assets.

## Key Files

- `discovery.controller.ts` — Route handlers
- `discovery.service.ts` — Scan execution, device detection, enrollment logic
- `discovery.validators.ts` — Zod schemas
- `discovery.routes.ts` — Route definitions
- `discovery.types.ts` — Type definitions

## Dependencies

- **Depends on:** assets (enrolling discovered devices creates assets)
- **Depended on by:** (none)

## Notes

- Credential passwords are stored and handled securely
- Test credential endpoint validates connectivity before saving
- Enrollment converts a discovered device into a managed asset in the assets module
