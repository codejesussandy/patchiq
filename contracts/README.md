# Patchify Contracts

This directory contains the **shared contracts** between Frontend, Backend, and Agent components. All teams MUST use these contracts as the source of truth to ensure consistency.

## Directory Structure

```
contracts/
├── schemas/                    # JSON Schema definitions for all data types
│   ├── agent.schema.json       # Agent client definition (registration, status)
│   ├── asset.schema.json       # Device/Asset data collected by agents
│   ├── hardware.schema.json    # Hardware inventory (CPU, RAM, Storage, etc.)
│   ├── software.schema.json    # Software inventory (OS, Apps, Services)
│   ├── network.schema.json     # Network configuration (interfaces, IPs, Wi-Fi)
│   ├── security.schema.json    # Security & compliance (encryption, firewall, AV)
│   ├── peripheral.schema.json  # Peripherals (monitors, USB devices, docking)
│   ├── telemetry.schema.json   # Real-time performance metrics
│   └── patch.schema.json       # Patch scan results and status
│
├── protocols/                  # Communication protocol documentation
│   ├── agent-registration.md   # How agents register with backend
│   ├── agent-heartbeat.md      # Heartbeat interval, payload, timeout handling
│   ├── agent-commands.md       # Command queue and execution protocol
│   └── data-collection.md      # When/how data is collected and transmitted
│
├── api/                        # OpenAPI specifications
│   └── agent-api.yaml          # Agent-facing API (registration, heartbeat, data upload)
│
└── FRONTEND-CONFLICTS.md       # Document of frontend changes required
```

## Key Concepts

### Agent vs Asset vs Endpoint

| Term | Definition |
|------|------------|
| **Agent** | The software client running on endpoints. Responsible for registration, heartbeats, data collection, and command execution. |
| **Asset** | The device data collected BY the agent. Includes hardware, software, security, network, and telemetry data. |
| **Endpoint** | A managed device in the context of patch management. Unified with Asset - same entity, different context. |

### Data Flow

```
┌─────────────┐     Registration      ┌─────────────┐
│   Agent     │ ──────────────────────► │   Backend   │
│  (Client)   │ ◄────────────────────── │   (Server)  │
│             │     Agent Config        │             │
│             │                         │             │
│             │     Heartbeat (30s)     │             │
│             │ ──────────────────────► │             │
│             │                         │             │
│             │     Full Inventory      │             │
│             │ ──────────────────────► │             │
│             │     (scheduled/demand)  │             │
│             │                         │             │
│             │     Telemetry (1-5min)  │             │
│             │ ──────────────────────► │             │
│             │                         │             │
│             │     Poll Commands       │             │
│             │ ──────────────────────► │             │
│             │ ◄────────────────────── │             │
│             │     Command Queue       │             │
│             │                         │             │
│             │     Command Result      │             │
│             │ ──────────────────────► │             │
└─────────────┘                         └─────────────┘
```

## How to Use These Contracts

### For Backend Team
1. Implement APIs exactly as specified in `api/agent-api.yaml`
2. Use schemas in `schemas/` to validate incoming data from agents
3. Store data according to schema definitions
4. Follow protocols in `protocols/` for agent communication

### For Agent Team
1. Implement data collection according to schemas in `schemas/`
2. Follow registration flow in `protocols/agent-registration.md`
3. Implement heartbeat as per `protocols/agent-heartbeat.md`
4. Handle commands as per `protocols/agent-commands.md`

### For Frontend Team
1. Update TypeScript types to match schemas in `schemas/`
2. Review `FRONTEND-CONFLICTS.md` for required changes
3. Update MSW handlers to match new data structures

## Versioning

All contracts are versioned. Current version: **1.0.0**

Breaking changes will increment the major version. All teams must coordinate updates.

## Validation

JSON Schemas can be used for runtime validation in all components:
- Backend: Use `ajv` or similar JSON Schema validator
- Agent: Use platform-appropriate JSON Schema validator
- Frontend: Use `zod` or `yup` schemas derived from JSON Schemas
