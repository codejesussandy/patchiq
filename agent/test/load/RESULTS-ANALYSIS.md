# Load Test Results Analysis Guide

## Overview

This document provides guidance on interpreting load test results, identifying performance issues, and making data-driven optimization decisions.

---

## Metrics Interpretation

### API Response Times

**Metrics to Review:**
- p50 (median)
- p95 (95th percentile)
- p99 (99th percentile)
- max (worst case)

**Thresholds:**
| Endpoint | p50 Target | p95 Target | p99 Target |
|----------|-----------|-----------|-----------|
| POST /agents/register | < 200ms | < 500ms | < 1s |
| POST /agents/:id/heartbeat | < 50ms | < 100ms | < 200ms |
| POST /agents/:id/deployments | < 100ms | < 200ms | < 500ms |
| POST /agents/:id/inventory | < 150ms | < 300ms | < 1s |
| GET /agents | < 50ms | < 150ms | < 300ms |

**Analysis:**

**Good Performance Example:**
```
Endpoint: POST /agents/:id/deployments
p50: 85ms
p95: 180ms
p99: 320ms
max: 450ms
```
✓ All metrics within targets, no action needed.

**Concerning Performance Example:**
```
Endpoint: POST /agents/:id/deployments
p50: 250ms
p95: 850ms
p99: 2.5s
max: 5.2s
```
✗ p95 and p99 exceed targets significantly.

**Actions:**
1. Check database query performance
2. Review backend logs for slow operations
3. Identify database connection pool exhaustion
4. Check for network latency
5. Review code for N+1 query problems

---

### Database Performance

#### Query Execution Times

**Query from pg_stat_statements:**
```sql
SELECT
    query,
    calls,
    mean_exec_time as avg_ms,
    min_exec_time as min_ms,
    max_exec_time as max_ms,
    stddev_exec_time as stddev_ms,
    total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

**Interpretation:**

| avg_ms | Assessment | Action |
|--------|------------|--------|
| < 10ms | Excellent | No action |
| 10-50ms | Good | Monitor |
| 50-200ms | Concerning | Investigate |
| > 200ms | Poor | Optimize immediately |

**Common Slow Queries:**
- Missing indexes
- Full table scans
- Complex JOINs
- Suboptimal WHERE clauses
- Large result sets

**Example Analysis:**
```
Query: SELECT * FROM agents WHERE last_heartbeat > NOW() - INTERVAL '5 minutes'
Calls: 15,000
Avg: 180ms
Max: 850ms

Issue: No index on last_heartbeat
Solution: CREATE INDEX idx_agents_last_heartbeat ON agents(last_heartbeat);
```

#### Connection Pool Utilization

**Healthy Pattern:**
```
Max connections: 100
Active connections: 40-60 (40-60% utilization)
Idle connections: 10-20
Peak utilization: 75%
```
✓ Adequate headroom for spikes

**Concerning Pattern:**
```
Max connections: 100
Active connections: 95-100 (95-100% utilization)
Idle connections: 0
Peak utilization: 100%
Wait events: many "Client:ClientRead"
```
✗ Connection pool exhausted, requests queuing

**Actions:**
1. Increase connection pool size
2. Optimize slow queries (reduces connection hold time)
3. Implement connection pooling (e.g., pgBouncer)
4. Review application for connection leaks

#### Transaction Rate

**Healthy Pattern:**
```
Transactions/sec: 200-300
Commit ratio: > 99%
Rollback ratio: < 1%
```

**Concerning Pattern:**
```
Transactions/sec: 50-100 (lower than expected)
Commit ratio: 85%
Rollback ratio: 15%
```
✗ High rollback rate indicates application errors or deadlocks

**Actions:**
1. Review application logs for errors
2. Check for deadlocks: `SELECT * FROM pg_stat_database WHERE datname = 'patchiq';`
3. Investigate transaction conflicts

---

### System Resource Utilization

#### CPU Usage

**Backend API:**
| Utilization | Assessment | Action |
|------------|------------|--------|
| < 40% | Under-utilized | Scale down or accept more load |
| 40-60% | Optimal | No action |
| 60-80% | High | Monitor, prepare to scale |
| > 80% | Saturated | Scale horizontally or optimize |

**Database:**
| Utilization | Assessment | Action |
|------------|------------|--------|
| < 50% | Good | No action |
| 50-70% | Moderate | Monitor |
| 70-90% | High | Optimize queries, consider scaling |
| > 90% | Saturated | Immediate action required |

**Analysis Tips:**
- Check for single-threaded bottlenecks
- Review CPU wait time (should be low)
- Identify CPU-intensive operations (sorting, regex, etc.)

#### Memory Usage

**Backend API:**
```
Total: 8 GB
Used: 3.2 GB (40%)
Free: 4.8 GB
Swap: 0 (no swapping)
```
✓ Healthy memory usage

**Database:**
```
Total: 8 GB
Shared buffers: 2 GB (25%)
Cache: 4 GB (50%)
Free: 2 GB (25%)
Swap: 500 MB (swapping!)
```
✗ Database swapping indicates insufficient memory

**Actions:**
1. Increase shared_buffers (typically 25% of RAM)
2. Tune work_mem for complex queries
3. Add more RAM to server
4. Review for memory leaks in application

#### Disk I/O

**Healthy Pattern:**
```
Read IOPS: 500-1000
Write IOPS: 200-500
Disk latency: < 10ms
Disk utilization: 40-60%
```

**Concerning Pattern:**
```
Read IOPS: 5000+ (saturated)
Write IOPS: 2000+ (saturated)
Disk latency: 50-100ms
Disk utilization: 95-100%
```
✗ Disk I/O bottleneck

**Actions:**
1. Move to SSD (if using HDD)
2. Add read replicas for read-heavy workloads
3. Tune database checkpoint settings
4. Review query plans for sequential scans
5. Implement caching (Redis) for frequently accessed data

---

## Performance Regression Detection

### Comparing Test Runs

**Method 1: Side-by-Side Comparison**
```
Metric                  | Baseline | Test Run | Change
------------------------|----------|----------|--------
API p95 (ms)            | 180      | 320      | +78%  ⚠
DB query p95 (ms)       | 85       | 90       | +6%   ✓
Success rate (%)        | 98       | 96       | -2%   ⚠
Deployment time avg (s) | 120      | 135      | +12%  ⚠
```

**Method 2: Time Series Analysis**
- Graph metrics over time
- Identify trends (gradual degradation vs sudden spike)
- Correlate with code changes, config changes, or data growth

**Example:**
```
Deployment success rate over 4 weeks:
Week 1: 98%
Week 2: 97%
Week 3: 95%
Week 4: 93%
```
✗ Gradual degradation, investigate root cause

---

## Common Performance Patterns

### Pattern 1: Linear Degradation

**Symptoms:**
- Response time increases linearly with load
- Example: 10 concurrent = 100ms, 20 concurrent = 200ms, 30 concurrent = 300ms

**Cause:**
- Single-threaded bottleneck
- Global lock contention
- Serial processing

**Solution:**
- Parallelize operations
- Remove global locks
- Implement async processing

### Pattern 2: Step Function Degradation

**Symptoms:**
- Performance stable until threshold, then sudden degradation
- Example: 50 concurrent = 100ms, 51 concurrent = 500ms

**Cause:**
- Resource limit hit (connection pool, thread pool, etc.)
- Cache eviction threshold

**Solution:**
- Increase resource limits
- Optimize resource usage
- Implement graceful degradation

### Pattern 3: Exponential Degradation

**Symptoms:**
- Response time increases exponentially with load
- Example: 10 concurrent = 100ms, 20 concurrent = 300ms, 30 concurrent = 900ms

**Cause:**
- Database locking/contention
- Deadlocks
- Inefficient algorithms (O(n²))

**Solution:**
- Optimize locking strategy
- Fix deadlocks
- Rewrite algorithms

---

## Red Flags

### Critical Issues (Fix Immediately)

1. **Success Rate < 95%**
   - Indicates system instability
   - User-impacting errors

2. **Database Connection Pool 100% Utilized**
   - Requests failing or timing out
   - System cannot scale further

3. **Backend/Database Crashes**
   - Unacceptable in production
   - Memory leaks, OOM errors

4. **Response Time p99 > 5s**
   - Extremely poor user experience
   - Likely timeouts

5. **Swap Usage > 0**
   - Performance degradation
   - System thrashing

### Warning Signs (Investigate Soon)

1. **Success Rate 95-98%**
   - Acceptable but monitor closely
   - Investigate failure reasons

2. **API p95 > 500ms**
   - User experience degrading
   - Optimize before it worsens

3. **Database query p95 > 200ms**
   - Slow queries impacting performance
   - Add indexes or optimize

4. **CPU > 70%**
   - Limited headroom for spikes
   - Plan for scaling

5. **Memory > 80%**
   - Risk of OOM
   - Monitor for leaks

---

## Optimization Workflow

### 1. Identify Bottleneck

Use BOTTLENECK-GUIDE.md to identify primary bottleneck.

### 2. Measure Baseline

Before optimization:
```bash
# Run test
./load-test.sh > baseline-results.txt

# Record metrics
echo "Baseline: p95 = 320ms, success rate = 96%"
```

### 3. Implement Fix

Example: Add database index
```sql
CREATE INDEX idx_agents_last_heartbeat ON agents(last_heartbeat);
ANALYZE agents;
```

### 4. Re-Test

```bash
# Run test again
./load-test.sh > optimized-results.txt

# Compare
diff baseline-results.txt optimized-results.txt
```

### 5. Verify Improvement

```
Before: p95 = 320ms, success rate = 96%
After:  p95 = 180ms, success rate = 98%

Improvement: -44% latency, +2% success rate ✓
```

### 6. Deploy to Production

After verification:
1. Deploy fix to production
2. Monitor production metrics
3. Verify improvement in production
4. Document change

---

## Reporting Template

```markdown
# Load Test Results - [Date]

## Executive Summary
- Test passed/failed
- Overall success rate: X%
- Key findings: [bullet points]
- Recommendations: [bullet points]

## Test Configuration
- Agents: 30
- Concurrent deployments: 100
- Test duration: 40 minutes
- Package distribution: 40 small, 40 medium, 20 large

## Results

### API Performance
- p50: Xms
- p95: Xms
- p99: Xms
- Success rate: X%

### Database Performance
- Query p95: Xms
- Connection pool utilization: X%
- Slow queries: X

### System Resources
- Backend CPU: X%
- Backend memory: X GB
- Database CPU: X%
- Database memory: X GB

## Bottlenecks Identified
1. [Bottleneck description]
   - Impact: [severity]
   - Recommendation: [action]

2. [Bottleneck description]
   - Impact: [severity]
   - Recommendation: [action]

## Recommendations
1. [High priority recommendations]
2. [Medium priority recommendations]
3. [Low priority recommendations]

## Appendix
- Detailed metrics: [link]
- Grafana dashboards: [link]
- Raw logs: [link]
```

---

**Document Status:** Approved
**Last Updated:** 2026-02-14
