# Load Test Procedure

## Overview

This document outlines the procedure for conducting load testing with 100 concurrent deployments to validate system performance under high load conditions.

---

## Test Objectives

1. **Concurrent Request Handling:** Verify backend handles 100 simultaneous deployment requests
2. **Database Performance:** Test database under high INSERT/UPDATE load
3. **Queue Management:** Validate deployment queue doesn't overwhelm system
4. **MinIO Performance:** Test object storage download performance under load
5. **Network Throughput:** Measure network bandwidth utilization
6. **Error Handling:** Verify graceful degradation under overload
7. **Resource Limits:** Identify system bottlenecks and breaking points

---

## Infrastructure Requirements

Same as Scale Test (see SCALE-TEST-PROCEDURE.md), minimum:
- 30 agents (for 100 deployments, ~3-4 per agent on average)
- Backend with production configuration
- Monitoring infrastructure

---

## Test Configuration

### Test Parameters

```yaml
concurrentDeployments: 100
agentsUsed: 30
deploymentsPerAgent: 3-4 (distributed)
testDuration: 30 minutes
packageSizes:
  - small: 1-10 MB (40 deployments)
  - medium: 10-50 MB (40 deployments)
  - large: 50-200 MB (20 deployments)
```

### Test Packages

**Small Packages (1-10 MB):**
- curl, git, vim, htop, jq, tree, wget (Linux)
- 7-Zip, PuTTY, Notepad++ (Windows)
- wget, htop, jq, tree (macOS)

**Medium Packages (10-50 MB):**
- Node.js, Python, Git (all platforms)
- VLC (Windows, macOS)
- nginx, postgresql-client (Linux)

**Large Packages (50-200 MB):**
- Visual Studio Code (all platforms)
- Google Chrome, Firefox (all platforms)
- Docker Desktop (Windows, macOS)
- PostgreSQL server (Linux)

---

## Pre-Test Setup

### 1. Ensure All Agents Online

```bash
# Check agent count
AGENT_COUNT=$(curl -s -H "Authorization: Bearer $TOKEN" \
    "$API_URL/v1/agents?status=online" | jq '.meta.total')

if [ "$AGENT_COUNT" -lt 30 ]; then
    echo "ERROR: Only $AGENT_COUNT agents online (need 30)"
    exit 1
fi
```

### 2. Upload Test Packages to MinIO

```bash
# Upload all test packages
for pkg in packages/*.tar.gz; do
    aws s3 cp "$pkg" s3://patchiq-hub/packages/ \
        --endpoint-url http://minio:9000
done

# Verify uploads
aws s3 ls s3://patchiq-hub/packages/ --endpoint-url http://minio:9000
```

### 3. Pre-warm Database Connections

```bash
# Create connection pool
psql -U patchiq -c "SELECT pg_sleep(0);" & # Repeat 20x to warm pool
```

### 4. Reset Metrics

```bash
# Reset Prometheus metrics (optional)
curl -X POST http://prometheus:9090/api/v1/admin/tsdb/clean_tombstones

# Clear Redis cache (optional)
redis-cli FLUSHDB
```

---

## Test Execution

### Phase 1: Baseline Measurement (0-5 minutes)

**Objective:** Establish baseline performance metrics

**Steps:**
1. Deploy 1 package to 1 agent
2. Measure response time
3. Record baseline metrics

**Metrics:**
- API response time (single request)
- Database query time
- MinIO download speed
- Memory usage (baseline)
- CPU usage (baseline)

**Commands:**
```bash
# Single deployment for baseline
time curl -X POST -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"packageId": "curl", "action": "install"}' \
    "$API_URL/v1/agents/$AGENT_ID/deployments"
```

### Phase 2: Ramp-Up Load (5-10 minutes)

**Objective:** Gradually increase load to identify performance degradation

**Steps:**
1. Deploy 10 packages (10 concurrent)
2. Deploy 25 packages (25 concurrent)
3. Deploy 50 packages (50 concurrent)
4. Deploy 75 packages (75 concurrent)
5. Measure performance at each step

**Metrics per Step:**
- API response time (p50, p95, p99)
- Request success rate
- Database connection pool usage
- CPU/memory usage
- Error rate

**Commands:**
```bash
# Ramp-up test script
for concurrency in 10 25 50 75; do
    echo "Testing $concurrency concurrent deployments..."

    # Trigger deployments
    ./trigger-deployments.sh $concurrency

    # Wait for completion
    sleep 120

    # Collect metrics
    ./collect-metrics.sh > metrics-$concurrency.json

    # Cool down
    sleep 60
done
```

### Phase 3: Peak Load - 100 Concurrent Deployments (10-40 minutes)

**Objective:** Test system at peak load (100 concurrent deployments)

**Steps:**
1. Prepare 100 deployment requests
2. Distribute across 30 agents
3. Trigger all 100 simultaneously
4. Monitor system behavior
5. Wait for all to complete (max 30 minutes)
6. Verify success rate

**Detailed Monitoring:**

**1. Backend API Monitoring:**
```bash
# Monitor API response times in real-time
tail -f /var/log/patchiq/backend.log | grep "POST /v1/agents/.*/deployments" | \
    awk '{print $NF}' | # Extract response time
    while read -r time; do
        echo "Response time: ${time}ms"
    done

# Check for errors
tail -f /var/log/patchiq/backend.log | grep -i "error"

# Monitor request rate
tail -f /var/log/patchiq/backend.log | pv -l -i 5 > /dev/null
```

**2. Database Monitoring:**
```bash
# Monitor active connections
watch -n 1 'psql -U patchiq -c "
    SELECT
        count(*) as active_connections,
        max_connections
    FROM pg_stat_activity, (SELECT setting::int as max_connections FROM pg_settings WHERE name = \047max_connections\047) mc
    GROUP BY max_connections;
"'

# Monitor slow queries
psql -U patchiq -c "
    SELECT
        pid,
        now() - query_start as duration,
        query
    FROM pg_stat_activity
    WHERE state = 'active' AND now() - query_start > interval '1 second'
    ORDER BY duration DESC;
"

# Monitor locks
psql -U patchiq -c "
    SELECT
        locktype,
        mode,
        count(*)
    FROM pg_locks
    GROUP BY locktype, mode;
"
```

**3. MinIO Monitoring:**
```bash
# Monitor MinIO bandwidth
# (Via MinIO metrics endpoint or network monitoring)
curl -s http://minio:9000/minio/v2/metrics/cluster | \
    grep minio_s3_requests_total

# Monitor concurrent downloads
netstat -an | grep :9000 | grep ESTABLISHED | wc -l
```

**4. System Resource Monitoring:**
```bash
# Backend CPU/Memory
top -b -n 1 | grep patchiq-backend

# Database CPU/Memory
top -b -n 1 | grep postgres

# Network bandwidth
iftop -i eth0

# Disk I/O
iostat -x 5

# Or use Grafana dashboard for visual monitoring
```

**5. Agent Monitoring:**
```bash
# Monitor agent logs for deployment progress
# (SSH to random agents)
tail -f /var/log/patchiq/agent.log | grep -E "download|install|deploy"

# Check agent resource usage
# (Agents should remain under 25% CPU, 200 MB memory during deployment)
```

### Metrics to Collect

**API Metrics:**
- Request rate (requests/second)
- Response time (p50, p95, p99)
- Success rate
- Error rate and types
- Queue depth (if applicable)

**Database Metrics:**
- Active connections
- Connection pool usage (%)
- Query execution time (p50, p95, p99)
- Slow queries (>1s)
- Lock wait time
- Transaction rate
- Deadlocks

**MinIO Metrics:**
- Download bandwidth (MB/s total)
- Concurrent downloads
- Request rate
- Error rate
- Storage I/O wait

**System Metrics:**
- Backend CPU usage (%)
- Backend memory usage (MB)
- Database CPU usage (%)
- Database memory usage (MB)
- Network throughput (MB/s)
- Disk I/O (IOPS, MB/s)

**Agent Metrics:**
- Deployment queue length (per agent)
- Deployment success rate
- Average deployment time
- Resource usage during deployment

---

## Load Test Script

```bash
#!/bin/bash
# load-test.sh - 100 concurrent deployments

set -euo pipefail

API_URL="${API_URL:-https://test-hub.patchiq.io/api}"
API_TOKEN="${API_TOKEN:-}"
NUM_DEPLOYMENTS=100

echo "==================================================================="
echo "Load Test: $NUM_DEPLOYMENTS Concurrent Deployments"
echo "==================================================================="

# Get agent list
AGENTS=($(curl -s -H "Authorization: Bearer $TOKEN" \
    "$API_URL/v1/agents?status=online" | jq -r '.data[].id'))

AGENT_COUNT=${#AGENTS[@]}
echo "Available agents: $AGENT_COUNT"

# Prepare deployment requests
PACKAGES=(
    # Small packages (40x)
    "curl" "git" "vim" "htop" "jq" "tree" "wget" "unzip"
    "7zip.7zip" "Notepad++.Notepad++" "PuTTY"
    # ... (total 40 small)

    # Medium packages (40x)
    "Git.Git" "Python.Python.3.12" "OpenJS.NodeJS.LTS"
    "VideoLAN.VLC" "nginx" "postgresql-client"
    # ... (total 40 medium)

    # Large packages (20x)
    "Microsoft.VisualStudioCode" "Google.Chrome" "Mozilla.Firefox"
    "Docker.DockerDesktop" "postgresql-server"
    # ... (total 20 large)
)

# Shuffle packages for distribution
PACKAGES=($(printf '%s\n' "${PACKAGES[@]}" | shuf))

# Trigger all deployments
echo "Triggering $NUM_DEPLOYMENTS deployments..."
START_TIME=$(date +%s)

for i in $(seq 0 $((NUM_DEPLOYMENTS-1))); do
    AGENT_INDEX=$((i % AGENT_COUNT))
    AGENT_ID="${AGENTS[$AGENT_INDEX]}"
    PACKAGE="${PACKAGES[$i]}"

    echo "[$i] Deploying $PACKAGE to agent $AGENT_ID"

    curl -s -X POST \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"packageId\": \"$PACKAGE\", \"action\": \"install\"}" \
        "$API_URL/v1/agents/$AGENT_ID/deployments" &

    # Small delay to avoid overwhelming client
    sleep 0.1
done

wait # Wait for all curl commands to complete

TRIGGER_TIME=$(date +%s)
TRIGGER_DURATION=$((TRIGGER_TIME - START_TIME))

echo "All deployments triggered in ${TRIGGER_DURATION}s"
echo "Waiting for deployments to complete..."

# Monitor completion
MAX_WAIT=1800 # 30 minutes
ELAPSED=0

while [ $ELAPSED -lt $MAX_WAIT ]; do
    SUCCESS=$(curl -s -H "Authorization: Bearer $TOKEN" \
        "$API_URL/v1/deployments?status=success" | jq '.meta.total')

    FAILED=$(curl -s -H "Authorization: Bearer $TOKEN" \
        "$API_URL/v1/deployments?status=failed" | jq '.meta.total')

    PENDING=$(curl -s -H "Authorization: Bearer $TOKEN" \
        "$API_URL/v1/deployments?status=in_progress" | jq '.meta.total')

    echo "[${ELAPSED}s] Success: $SUCCESS, Failed: $FAILED, Pending: $PENDING"

    if [ $((SUCCESS + FAILED)) -ge $NUM_DEPLOYMENTS ]; then
        echo "All deployments completed!"
        break
    fi

    sleep 10
    ((ELAPSED+=10))
done

END_TIME=$(date +%s)
TOTAL_DURATION=$((END_TIME - START_TIME))

# Calculate final metrics
SUCCESS_RATE=$(awk "BEGIN {printf \"%.2f\", ($SUCCESS * 100.0 / $NUM_DEPLOYMENTS)}")

echo ""
echo "==================================================================="
echo "Load Test Results"
echo "==================================================================="
echo "Total Deployments: $NUM_DEPLOYMENTS"
echo "Successful: $SUCCESS"
echo "Failed: $FAILED"
echo "Success Rate: $SUCCESS_RATE%"
echo "Total Duration: ${TOTAL_DURATION}s"
echo "Trigger Duration: ${TRIGGER_DURATION}s"
echo "==================================================================="

if (( $(echo "$SUCCESS_RATE >= 95.0" | bc -l) )); then
    echo "✓ Load test PASSED (success rate >= 95%)"
    exit 0
else
    echo "✗ Load test FAILED (success rate < 95%)"
    exit 1
fi
```

---

## Pass Criteria

- [ ] All 100 deployment requests accepted by backend
- [ ] Success rate ≥ 95% (95/100 deployments succeed)
- [ ] Backend API p95 response time < 500ms
- [ ] Backend API p99 response time < 2s
- [ ] Database query p95 time < 200ms
- [ ] No backend crashes or errors
- [ ] Database connection pool < 80% utilized
- [ ] No database deadlocks
- [ ] MinIO download speed > 10 MB/s per agent
- [ ] Backend CPU < 80%
- [ ] Backend memory < 80%
- [ ] All deployments complete within 30 minutes

---

## Post-Test Analysis

### 1. Analyze Performance Degradation

Compare metrics at different load levels:
- 10 concurrent vs baseline
- 25 concurrent vs 10 concurrent
- 50 concurrent vs 25 concurrent
- 100 concurrent vs 50 concurrent

Identify at which point performance degrades significantly.

### 2. Review Errors

```bash
# Extract errors from logs
grep -i "error" /var/log/patchiq/backend.log | \
    awk '{print $NF}' | sort | uniq -c | sort -rn

# Common errors to investigate:
# - Database connection timeout
# - Database query timeout
# - MinIO connection timeout
# - Agent timeout
# - Rate limit exceeded
```

### 3. Identify Bottlenecks

See BOTTLENECK-GUIDE.md for detailed analysis.

### 4. Generate Report

Include:
- Test configuration
- Ramp-up results
- Peak load results
- Performance graphs (Grafana screenshots)
- Bottlenecks identified
- Recommendations for optimization

---

## Cleanup

Same as SCALE-TEST-PROCEDURE.md.

---

**Document Status:** Approved
**Last Updated:** 2026-02-14
**Estimated Duration:** 40 minutes (test), 2 hours (analysis)
