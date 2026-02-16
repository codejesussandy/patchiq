# Logger Package

Structured logging implementation using zerolog for the PatchIQ agent.

## Features

- **Structured JSON logging** by default
- **Human-readable text format** option for development
- **Configurable log levels**: trace, debug, info, warn, error, fatal, panic
- **Correlation IDs** via `WithCommandID()`
- **Component tagging** via `WithComponent()`
- **Caller information** automatically included (file and line number)
- **Timestamps** in RFC3339 format

## Configuration

Configure via `config.json` or environment variables:

```json
{
  "logLevel": "info",      // trace, debug, info, warn, error, fatal, panic
  "logFormat": "json",     // "json" or "text"
  "logFile": ""            // optional: path to log file (empty = stdout)
}
```

Environment variables:
- `PATCHIQ_LOG_LEVEL` - Override log level
- `PATCHIQ_LOG_FORMAT` - Override log format

## Usage Examples

### Basic Initialization (already done in main.go)

```go
import "github.com/patchify/agent/internal/logger"

// Initialize logger (called once at startup)
if err := logger.Init(cfg.LogLevel, cfg.LogFormat, cfg.LogFile); err != nil {
    log.Fatalf("Failed to initialize logger: %v", err)
}
```

### Future Usage (Phase 2 - not implemented yet)

Once we migrate existing log calls, usage will look like:

```go
import (
    "github.com/rs/zerolog/log"
    "github.com/patchify/agent/internal/logger"
)

// Simple logging
log.Info().Msg("Agent started")
log.Debug().Str("url", serverURL).Msg("Connecting to server")
log.Error().Err(err).Msg("Failed to connect")

// Component-specific logger
compLogger := logger.WithComponent("heartbeat")
compLogger.Info().Msg("Sending heartbeat")

// Command correlation
cmdLogger := logger.WithCommandID(commandID)
cmdLogger.Info().Str("action", "install").Msg("Executing command")

// Custom fields
fieldsLogger := logger.WithFields(map[string]interface{}{
    "agentID": agentID,
    "version": version,
})
fieldsLogger.Info().Msg("Agent registered")
```

## Log Formats

### JSON Format (default)
```json
{"level":"info","component":"heartbeat","time":"2026-02-14T15:07:00Z","caller":"backend/manager.go:123","message":"Heartbeat sent"}
```

### Text Format (development)
```
2026-02-14T15:07:00Z INF backend/manager.go:123 > Heartbeat sent component=heartbeat
```

## Migration Status

**Phase 1: COMPLETE**
- ✅ zerolog dependency added
- ✅ logger package created
- ✅ Config updated with LogFormat field
- ✅ Logger initialized in main.go
- ✅ Build verified successful

**Phase 2: NOT STARTED**
- ⏸️ Migrate existing `log.Printf()` calls to zerolog
- ⏸️ Add component-specific loggers
- ⏸️ Add correlation IDs to command execution
- ⏸️ Add structured fields to key operations

## Testing

Test with different log formats:

```bash
# JSON format (default)
./patchify-agent --version

# Text format (human-readable)
PATCHIQ_LOG_FORMAT=text ./patchify-agent --version

# Debug level
PATCHIQ_LOG_LEVEL=debug ./patchify-agent --version
```

## Notes

- Existing `log.Printf()` calls still work but are not structured
- Actual migration to zerolog will be done in a separate focused task
- The logger infrastructure is ready for gradual migration
