# Performance Targets

## Overview

This document defines the performance targets for the PatchIQ agent and backend system. These targets guide development, optimization, and production readiness decisions.

**Last Updated:** 2026-02-14
**Status:** Production Targets

---

## Agent Performance Targets

### CPU Usage

| State | Target | Threshold | Notes |
|-------|--------|-----------|-------|
| Idle | < 1% | 2% | Agent should be nearly invisible when idle |
| Heartbeat | < 2% | 5% | Brief spike during 30-second heartbeat |
| Inventory Collection | < 10% | 15% | During full system inventory scan |
| Active Deployment | < 25% | 35% | During package download and installation |
| Peak | < 40% | 50% | Absolute maximum, brief spikes only |

**Measurement Method:**
- Monitor via `top` (Linux/macOS) or Task Manager (Windows)
- Sample every 5 seconds over 5 minutes
- Calculate average and p95

**Failure Criteria:**
- Sustained > 50% CPU for more than 60 seconds
- Idle > 5% CPU average
- CPU not releasing after task completion

---

### Memory Usage

| State | Target | Threshold | Notes |
|-------|--------|-----------|-------|
| Idle | < 50 MB | 75 MB | Minimal footprint when idle |
| Active Deployment | < 200 MB | 300 MB | Includes download buffer and temp files |
| Peak | < 500 MB | 750 MB | Absolute maximum |

**Measurement Method:**
- Monitor RSS (Resident Set Size)
- Track over agent lifecycle (24+ hours)
- Check for memory leaks (increasing trend)

**Failure Criteria:**
- Memory usage grows continuously over time (leak)
- Idle memory > 100 MB
- Active deployment > 500 MB
- OOM kills

---

### Network Bandwidth

| Operation | Target | Threshold | Notes |
|-----------|--------|-----------|-------|
| Heartbeat | < 1 KB/request | 5 KB | Minimal payload |
| Inventory Submission | < 100 KB/request | 250 KB | Compressed JSON |
| Package Download | Maxes out available bandwidth | N/A | Should saturate connection |
| Update Download | Maxes out available bandwidth | N/A | Critical for fast updates |

**Measurement Method:**
- Monitor via `iftop`, `nethogs`, or Windows Resource Monitor
- Measure actual payload sizes via network captures

**Failure Criteria:**
- Downloads not saturating bandwidth
- Excessive heartbeat payload (> 10 KB)
- Inventory payload > 500 KB uncompressed

---

### Disk I/O

| Operation | Target | Threshold | Notes |
|-----------|--------|-----------|-------|
| Log Files | < 10 MB/day | 50 MB/day | With INFO logging |
| Temp Files | Cleaned up after deployment | N/A | No orphaned files |
| Download Cache | Cleaned up after deployment | N/A | Configurable retention |

**Measurement Method:**
- Monitor log directory size
- Check temp directory for orphaned files
- Use `du` or `Get-ChildItem` to measure

**Failure Criteria:**
- Logs > 100 MB/day
- Orphaned temp files
- Disk space exhaustion

---

### Agent Binary Size

| Platform | Target | Threshold | Notes |
|----------|--------|-----------|-------|
| Windows (amd64) | < 20 MB | 25 MB | Compressed: < 8 MB |
| macOS (amd64) | < 19 MB | 24 MB | Compressed: < 7 MB |
| macOS (arm64) | < 18 MB | 23 MB | Compressed: < 7 MB |
| Linux (amd64) | < 21 MB | 26 MB | Compressed: < 8 MB |

**Measurement Method:**
- `ls -lh patchiq-agent*`
- `du -h patchiq-agent*`

**Failure Criteria:**
- Binary > 30 MB
- Compressed > 12 MB

---

## Backend Performance Targets

### API Response Times (p95)

| Endpoint | Target | Threshold | Notes |
|----------|--------|-----------|-------|
| GET /agents | < 200 ms | 300 ms | List all agents |
| POST /agents/register | < 500 ms | 750 ms | Agent registration |
| POST /agents/:id/heartbeat | < 100 ms | 150 ms | Critical path |
| POST /agents/:id/inventory | < 200 ms | 300 ms | Inventory submission |
| POST /deployments | < 200 ms | 300 ms | Create deployment |
| GET /deployments | < 200 ms | 300 ms | List deployments |
| GET /patches | < 250 ms | 400 ms | List patches (may be large) |
| GET /vulnerabilities | < 250 ms | 400 ms | List vulnerabilities |
| GET /agent-versions/current | < 150 ms | 200 ms | Update check |

**Measurement Method:**
- Use load testing tool (k6, Apache Bench, wrk)
- Run with 10 concurrent users
- Calculate p50, p95, p99 over 1000 requests

**Failure Criteria:**
- p95 > threshold for any endpoint
- p99 > 2× threshold
- Timeouts (> 5 seconds)

---

### Database Query Performance (p95)

| Query Type | Target | Threshold | Notes |
|------------|--------|-----------|-------|
| Agent list query | < 100 ms | 150 ms | SELECT with filters |
| Agent by ID | < 50 ms | 100 ms | Indexed lookup |
| Inventory insert | < 200 ms | 300 ms | Large JSON insert |
| Deployment create | < 150 ms | 200 ms | Transaction with relations |
| Patch search | < 200 ms | 300 ms | Full-text search |
| Vulnerability search | < 200 ms | 300 ms | Complex joins |

**Measurement Method:**
- Enable Prisma query logging
- Monitor slow query log in PostgreSQL
- Use `EXPLAIN ANALYZE` for complex queries

**Failure Criteria:**
- Any query > 1 second
- Missing indexes causing full table scans
- Query count growing with data size (N+1 queries)

---

### Concurrent Request Handling

| Scenario | Target | Threshold | Notes |
|----------|--------|-----------|-------|
| 100 concurrent heartbeats | < 2 seconds total | 3 seconds | All complete within window |
| 100 concurrent deployments | < 5 seconds total | 10 seconds | API accepts all requests |
| 1000 concurrent API calls | < 10 seconds total | 15 seconds | Stress test |

**Measurement Method:**
- Use load testing tool
- Fire N concurrent requests
- Measure time until all complete

**Failure Criteria:**
- Requests timing out
- Connection pool exhaustion
- Rate limiting blocking legitimate traffic

---

### Resource Usage (Backend)

| Resource | Target | Threshold | Notes |
|----------|--------|-----------|-------|
| CPU (Idle) | < 5% | 10% | Minimal background processing |
| CPU (Active) | < 50% | 75% | Under normal load (30 agents) |
| CPU (Peak) | < 80% | 90% | During high load (100 deployments) |
| Memory (Idle) | < 500 MB | 750 MB | Node.js + Prisma |
| Memory (Active) | < 2 GB | 3 GB | Under normal load |
| Memory (Peak) | < 4 GB | 6 GB | During high load |

**Measurement Method:**
- Monitor via Docker stats
- Use `htop` or `ps` for native processes
- Check for memory leaks over 24+ hours

**Failure Criteria:**
- Memory leaks (increasing trend)
- CPU not scaling with load
- OOM kills

---

### Database Resource Usage

| Resource | Target | Threshold | Notes |
|----------|--------|-----------|-------|
| CPU | < 30% | 50% | Under normal load |
| Memory | < 2 GB | 4 GB | Includes cache |
| Connections | < 50 | 100 | Connection pool |
| Disk I/O | < 100 IOPS | 200 IOPS | Depends on storage |

**Measurement Method:**
- Monitor via `pg_stat_activity`
- Check connection count
- Use `iostat` for disk I/O

**Failure Criteria:**
- Connection pool exhaustion
- Disk I/O saturation
- Long-running queries blocking others

---

## Scale Targets

### Agent Fleet

| Metric | Target | Threshold | Notes |
|--------|--------|-----------|-------|
| Agents per backend | 1000 | 5000 | Single backend instance |
| Heartbeat interval | 30 seconds | 60 seconds | Configurable |
| Inventory interval | 24 hours | 48 hours | Configurable |

**Measurement Method:**
- Deploy N agents
- Monitor backend performance
- Check for degradation

**Failure Criteria:**
- Backend cannot handle 1000 agents
- Heartbeats delayed > 60 seconds
- Database saturated

---

### Deployment Throughput

| Metric | Target | Threshold | Notes |
|--------|--------|-----------|-------|
| Concurrent deployments | 100 | 500 | Per backend instance |
| Deployment success rate | 95% | 90% | Excluding network failures |
| Average deployment time | < 5 minutes | 10 minutes | For typical packages |

**Measurement Method:**
- Trigger N concurrent deployments
- Measure completion time
- Calculate success rate

**Failure Criteria:**
- Success rate < 90%
- Deployments timing out
- Backend errors under load

---

## Reliability Targets

### Uptime

| Service | Target | Threshold | Notes |
|---------|--------|-----------|-------|
| Agent | 99.9% | 99.5% | Excludes updates |
| Backend | 99.9% | 99.5% | Excludes maintenance |
| Database | 99.95% | 99.9% | Critical dependency |

**Measurement Method:**
- Monitor uptime via health checks
- Calculate SLA over 30 days
- Track downtime incidents

**Failure Criteria:**
- Unplanned downtime > 4.4 hours/month
- Frequent crashes
- No auto-recovery

---

### Error Rates

| Metric | Target | Threshold | Notes |
|--------|--------|-----------|-------|
| Agent crashes | < 0.1% | 1% | Per agent per day |
| Backend API errors | < 1% | 5% | Excluding 4xx client errors |
| Deployment failures | < 5% | 10% | Excluding network failures |

**Measurement Method:**
- Monitor error logs
- Track HTTP 5xx responses
- Count deployment failures

**Failure Criteria:**
- Error rates increasing over time
- Repeated errors for same issue
- No error handling

---

## Data Targets

### Database Size

| Metric | Target | Threshold | Notes |
|--------|--------|-----------|-------|
| Per agent | < 1 MB | 5 MB | Inventory + history |
| Per deployment | < 100 KB | 500 KB | Metadata only |
| Total database | < 10 GB | 50 GB | For 1000 agents |

**Measurement Method:**
- Query database size
- Monitor growth rate
- Plan for data retention

**Failure Criteria:**
- Unbounded growth
- No data cleanup
- Disk space exhaustion

---

### Log Size

| Metric | Target | Threshold | Notes |
|--------|--------|-----------|-------|
| Agent logs | < 10 MB/day | 50 MB/day | INFO level |
| Backend logs | < 100 MB/day | 500 MB/day | INFO level |
| Log retention | 30 days | 7 days | Configurable |

**Measurement Method:**
- Monitor log directory size
- Check rotation policy
- Verify cleanup

**Failure Criteria:**
- Logs filling disk
- No rotation
- Log growth unbounded

---

## Testing Methodology

### Performance Testing

1. **Baseline:** Measure on idle system
2. **Load:** Gradually increase load to target
3. **Stress:** Push beyond target to find limits
4. **Soak:** Run at target load for 24+ hours
5. **Spike:** Test sudden load increases

### Metrics Collection

- Use automated tools (Prometheus, Grafana, DataDog)
- Collect every 5 seconds during tests
- Calculate p50, p95, p99 for all metrics
- Generate reports with graphs

### Pass/Fail Criteria

- **Pass:** All metrics within targets
- **Warning:** Metrics within thresholds but above targets
- **Fail:** Any metric exceeds threshold

---

## Performance Optimization Priorities

If targets not met, optimize in this order:

1. **Critical Path:** Heartbeat, registration, deployment creation
2. **Database:** Indexes, query optimization, connection pooling
3. **API:** Response times, caching, rate limiting
4. **Agent:** CPU/memory usage, network efficiency
5. **Scalability:** Horizontal scaling, load balancing

---

## Review Schedule

- **Weekly:** Review during load testing
- **Monthly:** Update targets based on production data
- **Quarterly:** Major review and adjustments
- **Annually:** Comprehensive performance audit

---

**Document Version:** 1.0
**Approved By:** Engineering Team
**Next Review:** 2026-03-14
