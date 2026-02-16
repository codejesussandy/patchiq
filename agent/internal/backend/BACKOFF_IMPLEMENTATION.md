# Exponential Backoff Implementation for Heartbeat Failures

## Summary
Implemented exponential backoff with jitter for heartbeat failures in the PatchIQ Go agent to reduce log spam and server load during outages.

## Changes Made

### 1. Added `math/rand` Import
- Added `"math/rand"` to the import block for jitter calculation

### 2. Extended Manager Struct
Added three new fields to the `Manager` struct:
```go
// Exponential backoff for heartbeat failures
backoffDuration time.Duration
maxBackoff      time.Duration
backoffMutex    sync.RWMutex
```

### 3. Initialized Backoff Fields in `New()`
```go
backoffDuration: 0,
maxBackoff:      5 * time.Minute,
```

### 4. Modified `heartbeatLoop()` Function
Enhanced the heartbeat error handling with exponential backoff logic:

**On Failure:**
- Starts with 5-second backoff
- Doubles on each consecutive failure (5s → 10s → 20s → 40s → 80s → 160s → 300s max)
- Adds ±10% jitter to prevent thundering herd
- Logs the backoff duration for observability
- Remains responsive to stop signal during backoff sleep

**On Success:**
- Resets backoff to 0
- Logs recovery message for observability

## Backoff Progression

| Failure # | Base Backoff | With Jitter Range |
|-----------|--------------|-------------------|
| 1         | 5s           | 4.5s - 5.5s      |
| 2         | 10s          | 9s - 11s         |
| 3         | 20s          | 18s - 22s        |
| 4         | 40s          | 36s - 44s        |
| 5         | 80s          | 72s - 88s        |
| 6         | 160s         | 144s - 176s      |
| 7+        | 300s (max)   | 270s - 330s      |

## Thread Safety
- `backoffMutex` (sync.RWMutex) protects concurrent access to backoff fields
- Separate from main `mu` to avoid lock contention
- Minimal critical sections for performance

## Observability
- Logs backoff duration on each retry: `"Heartbeat failed, backing off for %v"`
- Logs recovery: `"Heartbeat recovered, resetting backoff"`
- Works with existing consecutive errors counter

## Backward Compatibility
- Preserves all existing heartbeat behavior
- Re-registration logic unchanged (auth errors, 5 consecutive failures)
- Respects `stopCh` for clean shutdown
- No breaking changes to API

## Build Status
✅ Compiles successfully with `go build ./...`

## Files Modified
- `/agent/internal/backend/backend.go` (lines 3-21, 60-70, 95-102, 255-346)
