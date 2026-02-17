# Phase 5B - Agent 42: Real-Time Architecture Diagrams

This document provides visual representations of PatchIQ's real-time feature architecture.

---

## 1. Server-Sent Events (SSE) - Notifications Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ NotificationDropdown Component                                  │    │
│  │  - Renders badge with unread count                             │    │
│  │  - Displays notification list                                  │    │
│  │  - Triggers mark as read actions                               │    │
│  └────────────────┬───────────────────────────────────────────────┘    │
│                   │                                                      │
│                   │ uses                                                 │
│                   ▼                                                      │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ useNotificationSSE Hook                                         │    │
│  │                                                                 │    │
│  │  State:                                                         │    │
│  │  ├─ esRef (EventSource instance)                               │    │
│  │  ├─ reconnectTimerRef (setTimeout handle)                      │    │
│  │  ├─ reconnectAttempts (counter)                                │    │
│  │  └─ isConnected (boolean)                                      │    │
│  │                                                                 │    │
│  │  Lifecycle:                                                     │    │
│  │  1. Connect on mount (if enabled)                              │    │
│  │  2. Setup event listeners (onopen, onmessage, onerror)         │    │
│  │  3. Cleanup on unmount (close connection, clear timer)         │    │
│  │                                                                 │    │
│  │  Reconnection Logic:                                           │    │
│  │  - Fixed 5s delay (⚠️ needs exponential backoff)               │    │
│  │  - Shows toast only on first disconnect                        │    │
│  │  - Success message when reconnected                            │    │
│  └────────────────┬───────────────────────────────────────────────┘    │
│                   │                                                      │
└───────────────────┼──────────────────────────────────────────────────────┘
                    │
                    │ EventSource Connection
                    │ GET /v1/notifications/stream?token=<jwt>
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         SERVER (Express.js)                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ NotificationsController.sseStream()                             │    │
│  │                                                                 │    │
│  │  1. Extract token from query string                            │    │
│  │  2. Verify JWT and extract userId                              │    │
│  │  3. Set SSE headers:                                           │    │
│  │     - Content-Type: text/event-stream                          │    │
│  │     - Cache-Control: no-cache                                  │    │
│  │     - Connection: keep-alive                                   │    │
│  │     - X-Accel-Buffering: no (nginx optimization)               │    │
│  │  4. Send initial connected event                               │    │
│  │  5. Setup keepalive interval (30s)                             │    │
│  │  6. Register client with SSEManager                            │    │
│  └────────────────┬───────────────────────────────────────────────┘    │
│                   │                                                      │
│                   │ registers                                            │
│                   ▼                                                      │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ SSEManager (Singleton)                                          │    │
│  │                                                                 │    │
│  │  clients: SSEClient[]                                           │    │
│  │    ├─ userId: string                                           │    │
│  │    └─ res: Response (HTTP stream)                              │    │
│  │                                                                 │    │
│  │  Methods:                                                       │    │
│  │  ├─ addClient(userId, res)                                     │    │
│  │  │   └─ Auto-cleanup on res.on('close')                        │    │
│  │  ├─ send(userId, data)                                         │    │
│  │  │   └─ Target specific user                                   │    │
│  │  └─ broadcast(data, userIds?)                                  │    │
│  │      └─ Send to multiple users                                 │    │
│  │                                                                 │    │
│  │  Keepalive Timer (30s):                                        │    │
│  │    setInterval(() => res.write(': keepalive\n\n'), 30000)     │    │
│  └────────────────┬───────────────────────────────────────────────┘    │
│                   │                                                      │
│                   │ called by                                            │
│                   ▼                                                      │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ NotificationsService                                            │    │
│  │                                                                 │    │
│  │  When creating notification:                                   │    │
│  │  1. Save to database (Prisma)                                  │    │
│  │  2. Call sseManager.send(userId, notification)                 │    │
│  │  3. Real-time delivery to connected clients                    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘

Message Flow:
1. Client opens EventSource connection
2. Server validates token, registers client
3. Keepalive comments sent every 30s
4. When notification created:
   └─> Service saves to DB
   └─> Service calls sseManager.send()
   └─> SSE message sent to client
   └─> Client processes via onmessage handler
   └─> UI updates immediately
```

---

## 2. Polling Architecture - React Query Integration

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    REACT QUERY GLOBAL CONFIG                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  QueryClient Configuration (App.tsx):                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ defaultOptions: {                                                │   │
│  │   queries: {                                                     │   │
│  │     staleTime: 30_000,              // Cache for 30s            │   │
│  │     retry: 1,                        // Single retry            │   │
│  │     refetchOnWindowFocus: true,     // ✅ Refetch on tab focus  │   │
│  │     refetchIntervalInBackground: ?? // ⚠️ NOT SET (defaults true)│   │
│  │   }                                                              │   │
│  │ }                                                                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ provides config to
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      POLLING IMPLEMENTATIONS                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ FEATURE 1: Dashboard Stats                                     │    │
│  │ File: frontend/src/pages/Dashboard.tsx                         │    │
│  │                                                                 │    │
│  │ const { data, refetch } = useDashboardData();                  │    │
│  │                                                                 │    │
│  │ Polling: ❌ NONE (Manual refresh only)                         │    │
│  │ Interval: N/A                                                   │    │
│  │ Trigger: <Button onClick={refetch}>Refresh</Button>            │    │
│  │                                                                 │    │
│  │ Why: Heavy data, infrequent changes, user controls refresh     │    │
│  │ Status: ✅ EXCELLENT                                           │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ FEATURE 2: Asset Telemetry (Details Tab)                       │    │
│  │ File: frontend/src/pages/assets/components/tabs/DetailsTab.tsx │    │
│  │                                                                 │    │
│  │ const TELEMETRY_POLL_INTERVAL = 30_000; // 30 seconds          │    │
│  │ const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);│ │
│  │                                                                 │    │
│  │ const { data: telemetry } = useAssetTelemetry(asset.id, {      │    │
│  │   refetchInterval: autoRefreshEnabled                          │    │
│  │     ? TELEMETRY_POLL_INTERVAL                                  │    │
│  │     : undefined                                                 │    │
│  │ });                                                             │    │
│  │                                                                 │    │
│  │ Polling: ✅ 30 seconds (conditional)                           │    │
│  │ User Control: <Switch onChange={setAutoRefreshEnabled} />      │    │
│  │ Page Visibility: ⚠️ NOT IMPLEMENTED                            │    │
│  │ Status: ⚠️ ACCEPTABLE (needs visibility API)                   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ FEATURE 3: Vulnerability DB Sync Status                        │    │
│  │ File: frontend/src/pages/jobs/VulnerabilityJobsDBSync.tsx      │    │
│  │                                                                 │    │
│  │ const [syncing, setSyncing] = useState(false);                 │    │
│  │                                                                 │    │
│  │ const { data: syncStatus } = useSyncStatus({                   │    │
│  │   refetchInterval: syncing ? 2000 : undefined                  │    │
│  │ });                                                             │    │
│  │                                                                 │    │
│  │ useEffect(() => {                                               │    │
│  │   if (syncStatus?.status === 'COMPLETED') {                    │    │
│  │     setSyncing(false); // Stop polling                         │    │
│  │   }                                                             │    │
│  │ }, [syncStatus]);                                               │    │
│  │                                                                 │    │
│  │ Polling: ⚠️ 2 seconds (aggressive but conditional)             │    │
│  │ Smart Stop: Yes (stops when sync completes)                    │    │
│  │ Page Visibility: ⚠️ NOT IMPLEMENTED                            │    │
│  │ Status: ⚠️ ACCEPTABLE (short-lived operation)                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ FEATURE 4: Deployment Status                                   │    │
│  │ File: frontend/src/pages/patches/PatchDeployed.tsx             │    │
│  │                                                                 │    │
│  │ const { data: deployments } = useDeployments();                │    │
│  │                                                                 │    │
│  │ Polling: ❌ NONE                                               │    │
│  │ Real-time: ❌ NOT IMPLEMENTED                                  │    │
│  │ Status: ⚠️ UX ISSUE (manual refresh required for status)       │    │
│  │ Recommendation: Add conditional polling for IN_PROGRESS        │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘

React Query Polling Flow:
┌─────────────┐
│ Component   │
│ Mount       │
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│ useQuery({              │
│   queryKey,             │
│   queryFn,              │
│   refetchInterval: 30000│ ◄─── Polling configured here
│ })                      │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ React Query Internal Timer          │
│ setInterval(() => {                 │
│   if (enabled && !paused) {         │
│     queryFn()                       │
│       .then(data => updateCache)    │
│       .catch(error => retry?)       │
│   }                                 │
│ }, refetchInterval)                 │
└─────────────────────────────────────┘
       │
       │ Every 30s (or configured interval)
       ▼
┌─────────────────────────┐
│ API Request             │
│ GET /v1/assets/:id/tel. │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Component Re-render     │
│ (React Query triggers)  │
└─────────────────────────┘
```

---

## 3. Custom Polling Hook Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   usePolling Hook (Reusable Pattern)                     │
│                 File: frontend/src/hooks/usePolling.ts                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Interface:                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ function usePolling<T>({                                         │   │
│  │   queryKey: unknown[],                                           │   │
│  │   queryFn: () => Promise<T>,                                     │   │
│  │   interval: number,                    // Polling frequency      │   │
│  │   enabled?: boolean,                   // Master switch          │   │
│  │   onSuccess?: (data: T) => void        // Callback               │   │
│  │ }): {                                                            │   │
│  │   data: T | undefined,                                           │   │
│  │   isPolling: boolean,                  // Active state           │   │
│  │   pause: () => void,                   // Stop polling           │   │
│  │   resume: () => void                   // Restart polling        │   │
│  │ }                                                                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  Internal State Machine:                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │   enabled=true                                                   │   │
│  │   paused=false                                                   │   │
│  │   ┌────────────┐                                                │   │
│  │   │  ACTIVE    │ ◄──────────────┐                              │   │
│  │   │  POLLING   │                │                               │   │
│  │   └─────┬──────┘                │                               │   │
│  │         │                       │                               │   │
│  │         │ pause()               │ resume()                      │   │
│  │         ▼                       │                               │   │
│  │   ┌────────────┐                │                               │   │
│  │   │  PAUSED    │ ───────────────┘                              │   │
│  │   └────────────┘                                                │   │
│  │                                                                  │   │
│  │   enabled=false                                                  │   │
│  │   ┌────────────┐                                                │   │
│  │   │  DISABLED  │                                                │   │
│  │   └────────────┘                                                │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  Implementation:                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ const [paused, setPaused] = useState(false);                     │   │
│  │ const isActive = enabled && !paused;                             │   │
│  │                                                                  │   │
│  │ const query = useQuery({                                         │   │
│  │   queryKey,                                                      │   │
│  │   queryFn,                                                       │   │
│  │   refetchInterval: isActive ? interval : false, // Conditional   │   │
│  │   enabled                                                        │   │
│  │ });                                                              │   │
│  │                                                                  │   │
│  │ useEffect(() => {                                                │   │
│  │   if (query.data && onSuccess) {                                 │   │
│  │     onSuccess(query.data);                                       │   │
│  │   }                                                              │   │
│  │ }, [query.data]);                                                │   │
│  │                                                                  │   │
│  │ return {                                                         │   │
│  │   data: query.data,                                              │   │
│  │   isPolling: isActive && query.isFetching,                       │   │
│  │   pause: () => setPaused(true),                                  │   │
│  │   resume: () => setPaused(false)                                 │   │
│  │ };                                                               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  Usage Example:                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ const { data, isPolling, pause } = usePolling({                  │   │
│  │   queryKey: ['job', jobId],                                      │   │
│  │   queryFn: () => jobService.getStatus(jobId),                    │   │
│  │   interval: 5000,                                                │   │
│  │   onSuccess: (job) => {                                          │   │
│  │     if (job.status === 'COMPLETED') {                            │   │
│  │       pause(); // Auto-stop when done                            │   │
│  │     }                                                            │   │
│  │   }                                                              │   │
│  │ });                                                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  Missing Enhancement: Page Visibility API                                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ // RECOMMENDED ADDITION:                                         │   │
│  │ const [isTabVisible, setIsTabVisible] = useState(true);          │   │
│  │                                                                  │   │
│  │ useEffect(() => {                                                │   │
│  │   const handleVisibilityChange = () => {                         │   │
│  │     setIsTabVisible(!document.hidden);                           │   │
│  │   };                                                             │   │
│  │   document.addEventListener('visibilitychange',                  │   │
│  │     handleVisibilityChange);                                     │   │
│  │   return () => document.removeEventListener('visibilitychange',  │   │
│  │     handleVisibilityChange);                                     │   │
│  │ }, []);                                                          │   │
│  │                                                                  │   │
│  │ const isActive = enabled && !paused && isTabVisible; // Enhanced │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Memory Management & Cleanup Patterns

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      CLEANUP PATTERN: SSE Hook                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Component Lifecycle:                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │  ┌────────────┐                                                │   │
│  │  │ Component  │                                                 │   │
│  │  │   Mount    │                                                 │   │
│  │  └─────┬──────┘                                                 │   │
│  │        │                                                         │   │
│  │        ▼                                                         │   │
│  │  ┌────────────────────────────────────┐                        │   │
│  │  │ useEffect() runs                   │                         │   │
│  │  │ 1. Create EventSource              │                         │   │
│  │  │ 2. Attach listeners                │                         │   │
│  │  │ 3. Store in esRef.current          │                         │   │
│  │  └────────────┬───────────────────────┘                        │   │
│  │               │                                                  │   │
│  │               │ Connection active                                │   │
│  │               │                                                  │   │
│  │  ┌────────────▼───────────────────────┐                        │   │
│  │  │ SSE Connection                     │                         │   │
│  │  │ - esRef.current = EventSource      │                         │   │
│  │  │ - Receives messages                │                         │   │
│  │  │ - Keepalive every 30s              │                         │   │
│  │  └────────────┬───────────────────────┘                        │   │
│  │               │                                                  │   │
│  │               │ Component unmounts or enabled=false              │   │
│  │               │                                                  │   │
│  │  ┌────────────▼───────────────────────┐                        │   │
│  │  │ useEffect() cleanup function       │                         │   │
│  │  │ 1. esRef.current?.close()          │ ◄─── Closes connection │   │
│  │  │ 2. esRef.current = null            │ ◄─── Clears ref        │   │
│  │  │ 3. clearTimeout(reconnectTimer)    │ ◄─── Clears timer      │   │
│  │  │ 4. reconnectTimerRef.current = null│ ◄─── Clears timer ref  │   │
│  │  └────────────┬───────────────────────┘                        │   │
│  │               │                                                  │   │
│  │               ▼                                                  │   │
│  │  ┌────────────────────────────────────┐                        │   │
│  │  │ Backend 'close' event fires        │                         │   │
│  │  │ SSEManager removes client          │                         │   │
│  │  │ from clients array                 │                         │   │
│  │  │ clearInterval(keepalive)           │                         │   │
│  │  └────────────────────────────────────┘                        │   │
│  │                                                                  │   │
│  │  Result: ✅ NO MEMORY LEAK                                      │   │
│  │  - EventSource closed                                            │   │
│  │  - Timers cleared                                                │   │
│  │  - References nulled                                             │   │
│  │  - Backend cleanup automatic                                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                   CLEANUP PATTERN: Polling Hook                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  React Query Automatic Cleanup:                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │  When useQuery unmounts or refetchInterval changes:             │   │
│  │  1. React Query clears internal setInterval                     │   │
│  │  2. Cancels in-flight requests (AbortController)                │   │
│  │  3. Removes query from active subscriptions                     │   │
│  │  4. Keeps data in cache (per staleTime config)                  │   │
│  │                                                                  │   │
│  │  Manual cleanup not required for:                                │   │
│  │  - refetchInterval (React Query handles it)                     │   │
│  │  - Query subscriptions (automatic)                               │   │
│  │  - Cache entries (GC after staleTime + gcTime)                  │   │
│  │                                                                  │   │
│  │  Result: ✅ NO MEMORY LEAK (React Query manages lifecycle)      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                   MEMORY LEAK PREVENTION CHECKLIST                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ✅ EventSource.close() called on unmount                               │
│  ✅ setTimeout/setInterval cleared on unmount                           │
│  ✅ Event listeners removed (res.on('close') self-removes)              │
│  ✅ Refs nulled after cleanup                                           │
│  ✅ React Query manages interval lifecycle                              │
│  ✅ No global variables that accumulate                                 │
│  ✅ Backend SSEManager cleans up on disconnect                          │
│                                                                           │
│  Estimated Memory Growth:                                                │
│  - SSE connection: ~50 KB baseline + ~2-5 MB over 30 min                │
│  - React Query cache: ~5-10 MB (depends on data volume)                 │
│  - Component tree: Normal React overhead                                │
│                                                                           │
│  Total: Expect < 20 MB growth over 30 minutes of active use             │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Page Visibility API Integration (Recommended)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   CURRENT STATE (No Visibility Handling)                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌────────────────┐         ┌────────────────┐                         │
│  │   Active Tab   │         │  Inactive Tab  │                          │
│  │                │         │  (Background)  │                          │
│  └────────┬───────┘         └───────┬────────┘                         │
│           │                         │                                    │
│           ▼                         ▼                                    │
│  ┌─────────────────┐       ┌─────────────────┐                         │
│  │ Polls every 30s │       │ Polls every 30s │ ◄── ⚠️ WASTEFUL         │
│  │ SSE connected   │       │ SSE connected   │ ◄── ⚠️ WASTEFUL         │
│  └─────────────────┘       └─────────────────┘                         │
│                                                                           │
│  Problem:                                                                │
│  - Background tabs consume bandwidth                                     │
│  - Server processes requests for invisible UI                           │
│  - Battery drain on mobile devices                                       │
│  - ~30-50% of requests wasted on inactive tabs                          │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                   RECOMMENDED STATE (With Visibility API)                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌────────────────┐         ┌────────────────┐                         │
│  │   Active Tab   │         │  Inactive Tab  │                          │
│  │ (document.vis  │         │ (document.hid) │                          │
│  │  ible=true)    │         │  den=true)     │                          │
│  └────────┬───────┘         └───────┬────────┘                         │
│           │                         │                                    │
│           ▼                         ▼                                    │
│  ┌─────────────────┐       ┌─────────────────┐                         │
│  │ Polls every 30s │       │ Polling paused  │ ◄── ✅ EFFICIENT        │
│  │ SSE connected   │       │ SSE closed      │ ◄── ✅ EFFICIENT        │
│  └─────────────────┘       └─────────────────┘                         │
│                                     │                                    │
│                                     │ Tab becomes active                 │
│                                     ▼                                    │
│                             ┌─────────────────┐                         │
│                             │ Refetch data    │ ◄── Fresh data on focus │
│                             │ Reconnect SSE   │                          │
│                             └─────────────────┘                         │
│                                                                           │
│  Benefits:                                                               │
│  - Saves 30-50% bandwidth                                                │
│  - Reduces server load                                                   │
│  - Better battery life                                                   │
│  - Fresh data when user returns to tab                                   │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘

Implementation Code:

// Option 1: Global React Query Config (Easiest - 1 line)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: true,
      refetchIntervalInBackground: false, // ◄── ADD THIS
    },
  },
});

// Option 2: Custom Hook (More Control)
function usePageVisibility() {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
}

// Usage in polling hook
const isVisible = usePageVisibility();
const shouldPoll = enabled && !paused && isVisible;

// Usage in SSE hook
useEffect(() => {
  if (!enabled || !isVisible) {
    // Close connection when tab inactive
    if (esRef.current) {
      esRef.current.close();
    }
    return;
  }

  connect(); // Reconnect when tab active

  return cleanup;
}, [enabled, isVisible]);
```

---

## 6. Performance Optimization Opportunities

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    OPTIMIZATION PRIORITY MATRIX                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  High Impact, Low Effort (DO NOW):                                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 1. refetchIntervalInBackground: false                            │   │
│  │    Effort: 1 line change                                         │   │
│  │    Impact: 30-50% reduction in wasted requests                   │   │
│  │                                                                  │   │
│  │ 2. Exponential backoff for SSE                                   │   │
│  │    Effort: 15 minutes                                            │   │
│  │    Impact: Prevents thundering herd                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  High Impact, Medium Effort (NEXT SPRINT):                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 3. Conditional polling for deployments                           │   │
│  │    Effort: 30 minutes                                            │   │
│  │    Impact: Real-time updates, better UX                          │   │
│  │                                                                  │   │
│  │ 4. Delta updates for telemetry                                   │   │
│  │    Effort: 2-4 hours (backend + frontend)                        │   │
│  │    Impact: Reduces payload size by 60-80%                        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  Medium Impact, Low Effort (NICE TO HAVE):                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 5. SSE for deployment status                                     │   │
│  │    Effort: 1-2 hours                                             │   │
│  │    Impact: Replaces polling with push                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  Low Impact, High Effort (BACKLOG):                                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 6. WebSocket migration                                           │   │
│  │    Effort: 1-2 weeks                                             │   │
│  │    Impact: Bidirectional communication, lower latency            │   │
│  │                                                                  │   │
│  │ 7. Migrate SSE to fetch + ReadableStream                         │   │
│  │    Effort: 4-6 hours                                             │   │
│  │    Impact: Header-based auth (security improvement)              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

---

**End of Architecture Diagrams**

*These diagrams provide visual representations of PatchIQ's real-time architecture. Refer to the main profiling report for detailed analysis and recommendations.*
