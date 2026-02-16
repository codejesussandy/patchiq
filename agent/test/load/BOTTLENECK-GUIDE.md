# Bottleneck Identification Guide

## Overview

This guide helps identify, diagnose, and resolve common performance bottlenecks in the PatchIQ system during scale and load testing.

---

## Bottleneck Categories

1. **Database Bottlenecks**
2. **Backend API Bottlenecks**
3. **Network Bottlenecks**
4. **Disk I/O Bottlenecks**
5. **Memory Bottlenecks**
6. **Agent-Side Bottlenecks**

---

## 1. Database Bottlenecks

### 1.1 Connection Pool Exhaustion

**Symptoms:**
```
Error: "remaining connection slots are reserved for non-replication superuser connections"
Error: "FATAL: sorry, too many clients already"
Backend logs: "Database connection timeout"
```

**Diagnosis:**
```sql
-- Check current connections
SELECT
    count(*) as current_connections,
    (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections,
    (count(*) * 100.0 / (SELECT setting::int FROM pg_settings WHERE name = 'max_connections')) as utilization_pct
FROM pg_stat_activity;

-- Expected output:
-- current_connections | max_connections | utilization_pct
-- 95                  | 100             | 95.00  (TOO HIGH!)

-- Identify connection hogs
SELECT
    datname,
    usename,
    count(*) as connection_count
FROM pg_stat_activity
GROUP BY datname, usename
ORDER BY connection_count DESC;
```

**Root Causes:**
- Connection pool size too small for load
- Slow queries holding connections too long
- Connection leaks in application code
- Too many concurrent requests

**Solutions:**

**Short-term:**
```yaml
# Increase connection pool in backend config
database:
  pool:
    max: 150 # Increased from 100
```

```sql
-- Increase PostgreSQL max_connections
ALTER SYSTEM SET max_connections = 200;
SELECT pg_reload_conf();
```

**Long-term:**
- Implement connection pooling (pgBouncer)
- Optimize slow queries
- Implement connection leak detection
- Use read replicas for read-heavy operations

---

### 1.2 Slow Queries

**Symptoms:**
```
Backend logs: "Database query took 2.5s"
High API response times
Database CPU high (> 80%)
```

**Diagnosis:**
```sql
-- Find slowest queries
SELECT
    query,
    calls,
    mean_exec_time,
    max_exec_time,
    total_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100 -- queries averaging > 100ms
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check for missing indexes
SELECT
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    seq_tup_read / NULLIF(seq_scan, 0) as avg_seq_read
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_tup_read DESC
LIMIT 10;

-- High seq_scan indicates missing indexes

-- Analyze specific query
EXPLAIN ANALYZE SELECT * FROM agents WHERE last_heartbeat > NOW() - INTERVAL '5 minutes';

-- Look for "Seq Scan" in output (bad)
-- Want to see "Index Scan" (good)
```

**Root Causes:**
- Missing indexes
- Full table scans
- Inefficient query structure
- Large result sets
- Outdated statistics

**Solutions:**

```sql
-- Add missing indexes
CREATE INDEX idx_agents_last_heartbeat ON agents(last_heartbeat);
CREATE INDEX idx_deployments_status ON deployments(status);
CREATE INDEX idx_inventory_agent_id ON inventory(agent_id);

-- Update statistics
ANALYZE agents;
ANALYZE deployments;
ANALYZE inventory;

-- Optimize queries
-- Before (bad):
SELECT * FROM agents WHERE last_heartbeat::date = CURRENT_DATE;

-- After (good):
SELECT id, hostname, platform FROM agents
WHERE last_heartbeat >= CURRENT_DATE
  AND last_heartbeat < CURRENT_DATE + INTERVAL '1 day';
```

**Query Optimization Checklist:**
- [ ] Use indexed columns in WHERE clauses
- [ ] Avoid functions on indexed columns
- [ ] Limit result set size (LIMIT)
- [ ] Avoid SELECT *, select only needed columns
- [ ] Use appropriate JOIN types
- [ ] Avoid subqueries when possible

---

### 1.3 Lock Contention

**Symptoms:**
```
Database logs: "process X still waiting for ShareLock on transaction Y"
Slow queries that should be fast
Deadlock errors
```

**Diagnosis:**
```sql
-- Check for locks
SELECT
    pg_stat_activity.pid,
    pg_stat_activity.query,
    pg_locks.locktype,
    pg_locks.mode,
    pg_locks.granted
FROM pg_stat_activity
JOIN pg_locks ON pg_stat_activity.pid = pg_locks.pid
WHERE NOT pg_locks.granted
ORDER BY pg_stat_activity.query_start;

-- Check for deadlocks
SELECT * FROM pg_stat_database WHERE datname = 'patchiq';
-- Look at deadlocks column

-- Identify blocking queries
SELECT
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS blocking_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

**Root Causes:**
- Long-running transactions
- Row-level locking on hot rows
- Table-level locks
- Concurrent updates to same rows

**Solutions:**

```typescript
// Use row-level locking appropriately
// Before (locks entire table):
await prisma.$executeRaw`LOCK TABLE agents IN ACCESS EXCLUSIVE MODE`;

// After (locks only specific row):
await prisma.agent.update({
  where: { id: agentId },
  data: { lastHeartbeat: new Date() }
});

// Use SELECT FOR UPDATE for pessimistic locking
const agent = await prisma.$queryRaw`
  SELECT * FROM agents WHERE id = ${agentId} FOR UPDATE NOWAIT
`;

// Reduce transaction scope
// Before (long transaction):
const result = await prisma.$transaction(async (tx) => {
  const agent = await tx.agent.findUnique({ where: { id: agentId } });
  await slowExternalApiCall(); // BAD: Holding lock during slow operation
  await tx.agent.update({ where: { id: agentId }, data: { status: 'online' } });
});

// After (short transaction):
const agent = await prisma.agent.findUnique({ where: { id: agentId } });
await slowExternalApiCall(); // External call outside transaction
await prisma.agent.update({ where: { id: agentId }, data: { status: 'online' } });
```

---

### 1.4 Disk I/O Saturation

**Symptoms:**
```
iostat shows 100% disk utilization
High disk latency (> 20ms)
Database slow despite low CPU
```

**Diagnosis:**
```bash
# Check disk I/O
iostat -x 5

# Look for:
# - %util near 100%
# - await > 20ms
# - r/s + w/s very high

# Check PostgreSQL disk I/O
sudo iotop -p $(pgrep postgres)

# Identify I/O-heavy queries
SELECT
    query,
    calls,
    total_time,
    rows,
    100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
ORDER BY (shared_blks_hit + shared_blks_read) DESC
LIMIT 10;

# Low hit_percent indicates cache misses (disk reads)
```

**Root Causes:**
- Sequential scans on large tables
- Insufficient database cache
- HDD instead of SSD
- Large sorting operations spilling to disk

**Solutions:**

```sql
-- Increase shared_buffers (25% of RAM recommended)
ALTER SYSTEM SET shared_buffers = '2GB';

-- Increase work_mem for sorting
ALTER SYSTEM SET work_mem = '64MB';

-- Increase effective_cache_size (70% of RAM)
ALTER SYSTEM SET effective_cache_size = '6GB';

-- Reload config
SELECT pg_reload_conf();
```

**Infrastructure:**
- Migrate from HDD to SSD
- Use provisioned IOPS (AWS RDS)
- Add more RAM for database cache

---

## 2. Backend API Bottlenecks

### 2.1 CPU Saturation

**Symptoms:**
```
Backend CPU > 90%
High API response times
Slow request processing
```

**Diagnosis:**
```bash
# Check CPU usage
top -p $(pgrep node)

# Profile Node.js application
node --prof server.js
# Generate log: isolate-*-v8.log

# Analyze profile
node --prof-process isolate-*-v8.log > profile.txt

# Look for hot functions (high CPU usage)
```

**Root Causes:**
- CPU-intensive operations (regex, JSON parsing, encryption)
- Single-threaded bottleneck
- Inefficient algorithms
- Blocking I/O on event loop

**Solutions:**

```typescript
// Move CPU-intensive work to worker threads
import { Worker } from 'worker_threads';

async function processInventory(data: any) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./inventory-processor.js', { workerData: data });
    worker.on('message', resolve);
    worker.on('error', reject);
  });
}

// Use efficient data structures
// Before (O(n) lookup):
const agents = await prisma.agent.findMany();
const agent = agents.find(a => a.id === agentId); // Linear search

// After (O(1) lookup):
const agent = await prisma.agent.findUnique({ where: { id: agentId } }); // Indexed lookup

// Cache expensive computations
import Redis from 'ioredis';
const redis = new Redis();

async function getAgentStats(agentId: string) {
  const cached = await redis.get(`agent:${agentId}:stats`);
  if (cached) return JSON.parse(cached);

  const stats = await computeExpensiveStats(agentId);
  await redis.set(`agent:${agentId}:stats`, JSON.stringify(stats), 'EX', 300); // 5 min TTL
  return stats;
}
```

### 2.2 Memory Leaks

**Symptoms:**
```
Backend memory grows over time
Eventually hits memory limit
Process crashes with OOM error
```

**Diagnosis:**
```bash
# Monitor memory over time
while true; do
  ps aux | grep node | grep -v grep | awk '{print $6}'
  sleep 60
done

# Use Node.js heap snapshot
node --inspect server.js
# Connect Chrome DevTools and take heap snapshots over time

# Use clinic.js
npx clinic doctor -- node server.js
```

**Root Causes:**
- Event listeners not removed
- Global variable accumulation
- Closures holding references
- Large objects not garbage collected

**Solutions:**

```typescript
// Remove event listeners
import { EventEmitter } from 'events';

class AgentManager extends EventEmitter {
  async processAgent(agentId: string) {
    const handleHeartbeat = (data: any) => {
      // Process heartbeat
    };

    this.on('heartbeat', handleHeartbeat);

    try {
      // Do work
    } finally {
      // Clean up listener
      this.off('heartbeat', handleHeartbeat);
    }
  }
}

// Limit in-memory caches
import LRU from 'lru-cache';

const cache = new LRU({
  max: 1000, // Max 1000 items
  ttl: 1000 * 60 * 5, // 5 minute TTL
  updateAgeOnGet: true
});

// Stream large responses instead of loading into memory
import { pipeline } from 'stream';
import fs from 'fs';

app.get('/logs', (req, res) => {
  const logStream = fs.createReadStream('/var/log/patchiq/app.log');
  pipeline(logStream, res, (err) => {
    if (err) console.error(err);
  });
});
```

---

## 3. Network Bottlenecks

### 3.1 Bandwidth Saturation

**Symptoms:**
```
Network utilization > 90%
Slow downloads from MinIO
Slow agent inventory uploads
Packet loss
```

**Diagnosis:**
```bash
# Check network bandwidth
iftop -i eth0

# Check network stats
netstat -s | grep -i retrans # Retransmissions indicate congestion

# Monitor MinIO network traffic
curl -s http://minio:9000/minio/v2/metrics/cluster | grep minio_s3_traffic_sent_bytes
```

**Solutions:**
- Upgrade network (1 Gbps → 10 Gbps)
- Implement compression for large payloads
- Use CDN for package distribution
- Throttle concurrent downloads

```typescript
// Compress large responses
import compression from 'compression';
app.use(compression());

// Implement download throttling
import Bottleneck from 'bottleneck';

const downloadLimiter = new Bottleneck({
  maxConcurrent: 10, // Max 10 concurrent downloads
  minTime: 100 // Min 100ms between downloads
});

await downloadLimiter.schedule(() => downloadPackage(packageId));
```

### 3.2 Latency Issues

**Symptoms:**
```
High network latency (> 100ms)
Slow API calls despite low CPU/memory
TimeoutError on agent side
```

**Diagnosis:**
```bash
# Measure latency to backend
ping backend.example.com

# Measure HTTP latency
time curl -w "%{time_total}\n" -o /dev/null -s https://backend/api/health

# Trace route
traceroute backend.example.com
```

**Solutions:**
- Deploy backend closer to agents (regional deployments)
- Use HTTP/2 or HTTP/3
- Implement request multiplexing
- Reduce round trips (batch requests)

---

## 4. Disk I/O Bottlenecks

### 4.1 MinIO Disk I/O

**Symptoms:**
```
Slow package downloads (< 1 MB/s)
MinIO CPU low but requests slow
High disk await time
```

**Diagnosis:**
```bash
# Check disk I/O on MinIO server
iostat -x 5

# Check MinIO metrics
curl -s http://minio:9000/minio/v2/metrics/cluster | grep -i disk
```

**Solutions:**
- Use SSD storage for MinIO
- Increase MinIO cache
- Use multiple drives (RAID 0/10)
- Enable MinIO caching tier

---

## 5. Agent-Side Bottlenecks

### 5.1 Agent CPU/Memory Overload

**Symptoms:**
```
Agent unresponsive
Deployments timeout
High CPU/memory on agent
```

**Diagnosis:**
```bash
# On agent machine
top

# Check agent logs
tail -f /var/log/patchiq/agent.log | grep -i "error\|timeout\|fail"
```

**Solutions:**
- Limit concurrent deployments per agent
- Increase agent timeout values
- Optimize inventory collection (collect less frequently)
- Increase agent resources (CPU/RAM)

```go
// Limit concurrent deployments
var deploymentSem = make(chan struct{}, 3) // Max 3 concurrent

func (a *Agent) Deploy(pkg *Package) error {
    deploymentSem <- struct{}{} // Acquire
    defer func() { <-deploymentSem }() // Release

    return a.executor.Install(pkg)
}
```

---

## Bottleneck Identification Workflow

```
1. Observe symptoms (slow responses, errors, etc.)
   ↓
2. Check system metrics (CPU, memory, disk, network)
   ↓
3. Identify resource saturation (which is at 100%?)
   ↓
4. Drill down into that component
   ↓
5. Review logs and detailed metrics
   ↓
6. Identify root cause
   ↓
7. Implement fix
   ↓
8. Re-test to verify improvement
```

---

## Priority Matrix

| Bottleneck | Impact | Effort to Fix | Priority |
|-----------|---------|---------------|----------|
| Database connection pool exhaustion | High | Low | **Critical** |
| Missing database indexes | High | Low | **Critical** |
| Database lock contention | High | Medium | **High** |
| Memory leaks | High | Medium | **High** |
| CPU saturation | Medium | Medium | **Medium** |
| Network bandwidth | Medium | High | **Medium** |
| Disk I/O (HDD) | High | High | **High** |

---

**Document Status:** Approved
**Last Updated:** 2026-02-14
