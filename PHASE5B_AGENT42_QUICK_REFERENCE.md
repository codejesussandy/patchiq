# Phase 5B - Agent 42: Quick Reference

**Real-Time Features Performance Profiling Summary**

---

## 🎯 Overall Status: **PASS**

The real-time features are well-implemented with minor optimization opportunities.

---

## 📊 Key Findings

### ✅ What's Working Well

1. **SSE Implementation**
   - Proper headers and keepalive (30s)
   - Clean connection management
   - Auto-cleanup on disconnect
   - User-friendly reconnection UX

2. **Polling Strategy**
   - No global auto-polling (prevents battery drain)
   - Manual refresh for heavy dashboards
   - Reasonable intervals (30s for telemetry)
   - User controls (toggle switches)

3. **Memory Management**
   - Proper cleanup in useEffect
   - No evidence of memory leaks
   - React Query handles interval cleanup

4. **React Query Config**
   - Good defaults (30s staleTime, retry: 1)
   - Focus refetch enabled
   - No global polling interval

### ⚠️ Areas for Improvement

| Issue | Priority | Impact | Effort |
|-------|----------|--------|--------|
| No Page Visibility API | HIGH | 30-50% wasted requests | LOW |
| Fixed SSE reconnect (5s) | MEDIUM | Thundering herd risk | LOW |
| Full payload refresh | MEDIUM | Bandwidth waste | MEDIUM |
| No deployment real-time updates | LOW | UX issue | MEDIUM |
| SSE token in query string | LOW | Security concern | HIGH |

---

## 🔧 Quick Fixes (Copy-Paste Ready)

### 1. Enable Page Visibility API (HIGH PRIORITY)

**File:** `/frontend/src/App.tsx`

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: true,
      refetchIntervalInBackground: false, // ADD THIS LINE
    },
  },
});
```

**Impact:** Stops all polling when tab is inactive, saves 30-50% of polling requests.

---

### 2. Exponential Backoff for SSE Reconnect (MEDIUM PRIORITY)

**File:** `/frontend/src/hooks/useNotificationSSE.ts`

```typescript
// Add helper function
const getBackoffDelay = (attempts: number) => {
  return Math.min(5000 * Math.pow(2, attempts - 1), 60000);
};

// Replace line 76
es.onerror = () => {
  setIsConnected(false);
  es.close();
  esRef.current = null;

  setReconnectAttempts((prev) => {
    const newAttempts = prev + 1;
    if (newAttempts === 1) {
      message.warning('Notification connection lost. Reconnecting...', 3);
    }

    const delay = getBackoffDelay(newAttempts);
    reconnectTimerRef.current = setTimeout(connect, delay);

    return newAttempts;
  });
};
```

**Impact:** Prevents thundering herd on mass disconnect (5s, 10s, 20s, 40s, 60s).

---

### 3. Conditional Polling for Active Deployments (LOW PRIORITY)

**File:** `/frontend/src/hooks/usePatches.ts`

```typescript
export function useDeployments() {
  const { data = [] } = useQuery({
    queryKey: ['deployments'],
    queryFn: patchService.getDeployments,
  });

  const hasActiveDeployments = data.some(
    d => d.status === 'IN_PROGRESS'
  );

  return useQuery({
    queryKey: ['deployments'],
    queryFn: patchService.getDeployments,
    refetchInterval: hasActiveDeployments ? 10_000 : false,
  });
}
```

**Impact:** Real-time updates only when needed, stops polling when all complete.

---

## 📈 Performance Metrics (Static Analysis)

### SSE Connection
- Keepalive: 30s ✅
- Reconnect: Fixed 5s ⚠️
- CPU idle: ~1-2% (estimated) ✅
- Memory growth: ~2-5MB/30min (estimated) ✅

### Polling
- Dashboard: Manual only ✅
- Asset Telemetry: 30s ✅
- Vuln Sync: 2s (conditional) ⚠️
- Page Visibility: Not implemented ❌

### React Query
- staleTime: 30s ✅
- retry: 1 ✅
- refetchOnWindowFocus: true ✅
- refetchIntervalInBackground: default (true) ⚠️

---

## 🧪 Runtime Testing Checklist

### SSE Test (30 minutes)
```bash
# Open Chrome DevTools > Network
# Navigate to any page
# Filter: /notifications/stream
# Verify: Connection stays open
# Check: Keepalive every 30s
# Memory: Take snapshots at T=0, T=15, T=30
# Expected: < 10MB growth
```

### Polling Test
```bash
# Navigate to /assets/:id
# Enable auto-refresh toggle
# Network tab: Verify 30s interval
# Switch tab: Check if polling continues (should with current code)
# Performance: Check FPS (target: 55-60)
```

### Memory Leak Test
```bash
# DevTools > Memory > Take snapshot
# Navigate between 10 pages
# Return to start
# Take second snapshot
# Force GC
# Take third snapshot
# Expected: Returns to near baseline
```

---

## 📁 Key Files

### Backend
- SSE Service: `/backend/src/shared/services/sse.service.ts`
- SSE Controller: `/backend/src/modules/notifications/notifications.controller.ts`

### Frontend
- SSE Hook: `/frontend/src/hooks/useNotificationSSE.ts`
- Polling Hook: `/frontend/src/hooks/usePolling.ts`
- React Query Config: `/frontend/src/App.tsx` (line ~758)
- Dashboard: `/frontend/src/pages/Dashboard.tsx`
- Asset Telemetry: `/frontend/src/pages/assets/components/tabs/DetailsTab.tsx`

---

## 🎓 Polling Intervals Reference

| Feature | Interval | Conditional | File |
|---------|----------|-------------|------|
| Dashboard | Manual | - | `Dashboard.tsx` |
| Asset Telemetry (Details) | 30s | Toggle switch | `DetailsTab.tsx:30` |
| Asset Telemetry (Tab) | 30s | Always | `TelemetryTab.tsx:34` |
| Vuln DB Sync | 2s | Only when syncing | `VulnerabilityJobsDBSync.tsx:32` |
| Deployments | None | - | `PatchDeployed.tsx` |

---

## 🚀 Recommended Rollout Plan

### Week 1: Quick Wins
- [ ] Add `refetchIntervalInBackground: false` to QueryClient
- [ ] Test in dev environment
- [ ] Validate no regressions
- [ ] Deploy to production

### Week 2: SSE Improvements
- [ ] Implement exponential backoff
- [ ] Add unit tests for reconnect logic
- [ ] Test with network throttling
- [ ] Deploy to production

### Week 3: Conditional Polling
- [ ] Add conditional polling for deployments
- [ ] Update vulnerability sync to respect visibility
- [ ] Performance testing
- [ ] Deploy to production

### Month 2: Advanced Features
- [ ] Implement delta updates for telemetry
- [ ] Consider SSE for deployment status
- [ ] Evaluate WebSocket migration
- [ ] Load testing (100+ concurrent connections)

---

## 📞 Support

**Full Report:** `/PHASE5B_AGENT42_REALTIME_PROFILING.md`

**Questions?** See Appendix A in full report for runtime profiling instructions.

---

**Agent 42 | 2026-02-17**
