# Scale Test Procedure

## Overview

This document outlines the procedure for conducting scale testing with 30+ concurrent agents to validate system behavior under realistic production load.

---

## Test Objectives

1. **Agent Registration:** Validate 30+ agents can register simultaneously
2. **Heartbeat Handling:** Verify backend handles 30+ concurrent heartbeats
3. **Inventory Collection:** Test 30+ simultaneous inventory submissions
4. **Deployment Distribution:** Deploy software to all 30 agents simultaneously
5. **Backend Performance:** Measure API response times under scale
6. **Database Performance:** Monitor query times and connection pool usage
7. **Resource Usage:** Track CPU, memory, disk I/O on backend and agents
8. **Network Bandwidth:** Monitor network utilization
9. **Failure Recovery:** Validate agent crash recovery and reconnection

---

## Infrastructure Requirements

### Agent VMs

**Total: 30 agents minimum**

Distribution:
- **10 Windows agents:**
  - 5x Windows 10/11
  - 5x Windows Server 2019/2022

- **10 macOS agents:**
  - 5x macOS 13 (3 Intel, 2 Apple Silicon)
  - 5x macOS 14 (3 Intel, 2 Apple Silicon)

- **10 Linux agents:**
  - 3x Ubuntu 22.04/24.04
  - 2x Debian 11/12
  - 2x RHEL 8/9
  - 2x Fedora 39/40
  - 1x Rocky Linux 8/9

**VM Specifications (per agent):**
- **CPU:** 2 vCPUs
- **Memory:** 4 GB RAM
- **Disk:** 50 GB
- **Network:** 1 Gbps

### Backend Infrastructure

**Production-like Configuration:**
- **Backend API:** 4 vCPUs, 8 GB RAM
- **PostgreSQL:** 4 vCPUs, 8 GB RAM, SSD storage
- **Redis:** 2 vCPUs, 4 GB RAM
- **MinIO:** 2 vCPUs, 4 GB RAM, 100 GB storage
- **Network:** 10 Gbps

### Monitoring Infrastructure

- **Prometheus:** Metrics collection
- **Grafana:** Visualization dashboards
- **ELK Stack:** Log aggregation (optional)
- **Network Monitor:** Bandwidth tracking

---

## Pre-Test Setup

### 1. Provision VMs

**Cloud Provider Options:**
- AWS EC2
- Azure VMs
- GCP Compute Engine
- DigitalOcean Droplets

**Example: AWS EC2**
```bash
# Create 30 VMs using Terraform or AWS CLI
# Windows: ami-xxxxxxxxx (Windows Server 2022)
# macOS: EC2 Mac instances
# Linux: ami-xxxxxxxxx (Ubuntu 22.04)

# Tag all VMs for easy management
aws ec2 create-tags --resources $INSTANCE_ID \
    --tags Key=Project,Value=PatchIQ-ScaleTest \
           Key=TestRun,Value=$(date +%Y%m%d)
```

### 2. Install Agents

**Automated Installation Script:**
```bash
#!/bin/bash
# install-agents.sh - Deploy agents to all VMs

AGENTS_FILE="agent-hosts.txt" # List of IP addresses
INSTALLER_URL="https://releases.patchiq.io/agent/patchiq-agent-1.0.0.rpm"
SERVER_URL="https://test-hub.patchiq.io/api"

while IFS= read -r host; do
    echo "Installing agent on $host..."

    # For Linux
    ssh root@$host "
        curl -L -o /tmp/agent.rpm '$INSTALLER_URL'
        rpm -ivh /tmp/agent.rpm
        sed -i 's|server_url:.*|server_url: $SERVER_URL|' /etc/patchiq/agent.yaml
        systemctl enable --now patchiq-agent
    "

    # For Windows (use WinRM or PSRemoting)
    # For macOS (use SSH with similar commands)

done < "$AGENTS_FILE"
```

### 3. Configure Backend

**Update Configuration for Scale:**

```yaml
# backend/config.yaml
database:
  pool:
    min: 10
    max: 100 # Increased for 30+ concurrent connections
  timeout: 30s

redis:
  pool:
    max: 50

api:
  rateLimit:
    enabled: true
    maxRequests: 1000 # Per minute
    burstSize: 200

heartbeat:
  interval: 60 # seconds
  timeout: 180 # seconds
```

### 4. Set Up Monitoring

**Prometheus Configuration:**
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'patchiq-backend'
    static_configs:
      - targets: ['backend:3000']
    scrape_interval: 15s

  - job_name: 'patchiq-agents'
    file_sd_configs:
      - files:
        - '/etc/prometheus/agents.json'
    scrape_interval: 30s

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:9121']
```

**Grafana Dashboards:**
- Backend API Performance
- Database Performance
- Agent Health Overview
- Network Traffic
- Resource Utilization

---

## Test Execution

### Phase 1: Agent Registration (0-10 minutes)

**Objective:** Verify all 30 agents register successfully

**Steps:**
1. Start all 30 agents simultaneously
2. Monitor backend logs for registration requests
3. Track agent status in dashboard
4. Verify all agents appear in backend

**Metrics to Collect:**
- Time to first registration
- Time for all 30 to register
- Registration success rate
- Backend API response time (POST /v1/agents/register)
- Database connection pool usage
- CPU/memory on backend

**Pass Criteria:**
- [x] 100% registration success (30/30 agents)
- [x] All agents register within 5 minutes
- [x] Backend API response time < 500ms (p95)
- [x] No backend errors or crashes
- [x] Database connections < 80% of pool max

**Commands:**
```bash
# Monitor agent registration
watch -n 1 'curl -s -H "Authorization: Bearer $TOKEN" \
    https://test-hub/api/v1/agents | jq ".meta.total"'

# Check backend logs
tail -f /var/log/patchiq/backend.log | grep "agent.register"

# Check database connections
psql -U patchiq -c "SELECT count(*) FROM pg_stat_activity;"
```

### Phase 2: Heartbeat Load (10-20 minutes)

**Objective:** Verify backend handles 30+ concurrent heartbeats

**Steps:**
1. Wait for all agents to establish heartbeat
2. Monitor heartbeat requests for 10 minutes
3. Track backend performance
4. Verify no missed heartbeats

**Metrics to Collect:**
- Heartbeat request rate (requests/sec)
- Backend API response time (POST /v1/agents/:id/heartbeat)
- Database query time (UPDATE agents SET last_heartbeat)
- Redis operations (session cache)
- Network bandwidth usage
- Agent heartbeat success rate

**Pass Criteria:**
- [x] All agents maintain heartbeat (no dropped agents)
- [x] Backend API response time < 100ms (p95)
- [x] Database query time < 50ms (p95)
- [x] No backend errors
- [x] CPU usage < 60% on backend

**Commands:**
```bash
# Monitor heartbeat rate
# Expect ~30 heartbeats per minute (one per agent)
tail -f /var/log/patchiq/backend.log | grep "heartbeat" | pv -l -i 60 > /dev/null

# Check database performance
psql -U patchiq -c "
    SELECT query, mean_exec_time, calls
    FROM pg_stat_statements
    WHERE query LIKE '%heartbeat%'
    ORDER BY mean_exec_time DESC
    LIMIT 10;
"

# Monitor CPU/memory
htop # or use Grafana dashboard
```

### Phase 3: Inventory Collection (20-40 minutes)

**Objective:** Test 30 simultaneous inventory submissions

**Steps:**
1. Trigger inventory collection on all 30 agents simultaneously
2. Monitor inventory submission progress
3. Measure completion time
4. Verify all inventory data received

**Metrics to Collect:**
- Inventory collection time (per agent)
- Inventory submission time
- Payload size (per agent)
- Backend API response time (POST /v1/agents/:id/inventory)
- Database insert time (bulk inserts)
- Disk I/O on database server
- Network bandwidth during upload

**Pass Criteria:**
- [x] All 30 agents complete inventory collection
- [x] All inventory data submitted successfully
- [x] Backend API response time < 200ms (p95)
- [x] Database insert time < 500ms (p95)
- [x] No timeout errors
- [x] Total completion < 10 minutes

**Commands:**
```bash
# Trigger inventory on all agents
curl -s -H "Authorization: Bearer $TOKEN" \
    https://test-hub/api/v1/agents | jq -r '.data[].id' | \
while read agent_id; do
    curl -X POST -H "Authorization: Bearer $TOKEN" \
        "https://test-hub/api/v1/agents/$agent_id/collect" &
done
wait

# Monitor completion
watch -n 5 'curl -s -H "Authorization: Bearer $TOKEN" \
    "https://test-hub/api/v1/agents" | \
    jq "[.data[] | select(.lastInventory != null)] | length"'

# Check database size
psql -U patchiq -c "
    SELECT
        pg_size_pretty(pg_total_relation_size('inventory')) as inventory_size,
        count(*) as inventory_count
    FROM inventory;
"
```

### Phase 4: Deployment Distribution (40-70 minutes)

**Objective:** Deploy software to all 30 agents simultaneously

**Steps:**
1. Select test package (e.g., 7-Zip, curl, git)
2. Create deployment for all 30 agents
3. Monitor deployment progress
4. Track completion time and success rate

**Metrics to Collect:**
- Deployment creation time
- Download speed (agent side)
- Installation time (per agent)
- Total completion time
- Deployment success rate
- Backend API response time (POST /v1/agents/:id/deployments)
- MinIO download performance
- Network bandwidth (backend → agents)

**Pass Criteria:**
- [x] 95%+ deployment success rate (28/30 minimum)
- [x] All deployments complete within 30 minutes
- [x] Backend API response time < 200ms (p95)
- [x] MinIO download speed > 10 MB/s per agent
- [x] No backend/MinIO errors
- [x] No agent crashes during deployment

**Commands:**
```bash
# Trigger deployment to all agents
PACKAGE_ID="7zip.7zip" # Example Windows package

curl -s -H "Authorization: Bearer $TOKEN" \
    https://test-hub/api/v1/agents | jq -r '.data[].id' | \
while read agent_id; do
    curl -X POST -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"packageId\": \"$PACKAGE_ID\", \"action\": \"install\"}" \
        "https://test-hub/api/v1/agents/$agent_id/deployments" &
done
wait

# Monitor deployment status
watch -n 10 'curl -s -H "Authorization: Bearer $TOKEN" \
    "https://test-hub/api/v1/deployments?status=success" | jq ".meta.total"'

# Calculate success rate
SUCCESS=$(curl -s -H "Authorization: Bearer $TOKEN" \
    "https://test-hub/api/v1/deployments?status=success" | jq ".meta.total")
FAILED=$(curl -s -H "Authorization: Bearer $TOKEN" \
    "https://test-hub/api/v1/deployments?status=failed" | jq ".meta.total")
echo "Success: $SUCCESS, Failed: $FAILED, Rate: $(($SUCCESS * 100 / ($SUCCESS + $FAILED)))%"
```

### Phase 5: Agent Crash Recovery (70-90 minutes)

**Objective:** Test agent resilience and automatic recovery

**Steps:**
1. Select 5 agents randomly
2. Kill agent processes forcefully
3. Monitor agent auto-restart (systemd/launchd/service)
4. Verify agents reconnect to backend
5. Verify heartbeat resumes

**Metrics to Collect:**
- Time to detect agent crash (backend)
- Time to restart (OS service manager)
- Time to reconnect to backend
- Time to resume heartbeat
- Total recovery time

**Pass Criteria:**
- [x] All 5 agents auto-restart
- [x] All 5 agents reconnect within 2 minutes
- [x] Heartbeat resumes automatically
- [x] Agent state preserved (inventory, deployments)
- [x] No data loss

**Commands:**
```bash
# Kill 5 random agents
AGENTS_TO_KILL=5
curl -s -H "Authorization: Bearer $TOKEN" \
    https://test-hub/api/v1/agents | jq -r '.data[].id' | \
    shuf | head -n $AGENTS_TO_KILL | \
while read agent_id; do
    # Get agent hostname/IP and kill process
    # (Implementation depends on access method: SSH, WinRM, etc.)
    echo "Killing agent: $agent_id"
done

# Monitor recovery
watch -n 5 'curl -s -H "Authorization: Bearer $TOKEN" \
    "https://test-hub/api/v1/agents?status=online" | jq ".meta.total"'
```

---

## Post-Test Analysis

### 1. Collect All Metrics

```bash
# Export Prometheus metrics
curl -s http://prometheus:9090/api/v1/query_range \
    -d 'query=backend_api_response_time_seconds{quantile="0.95"}' \
    -d 'start=2026-02-14T10:00:00Z' \
    -d 'end=2026-02-14T12:00:00Z' \
    -d 'step=60s' > metrics.json

# Export database stats
psql -U patchiq -o db-stats.txt -c "
    SELECT * FROM pg_stat_statements
    ORDER BY total_exec_time DESC LIMIT 50;
"

# Export agent logs
for agent in $(cat agent-hosts.txt); do
    ssh root@$agent "cat /var/log/patchiq/agent.log" > logs/agent-$agent.log
done
```

### 2. Generate Performance Report

Create comprehensive report with:
- Executive summary
- Test configuration
- Metrics collected
- Performance graphs
- Bottlenecks identified
- Recommendations
- Pass/fail status

### 3. Identify Bottlenecks

Common bottlenecks:
- Database connection pool exhaustion
- Database query slow (missing indexes)
- Backend CPU saturation
- Redis memory limits
- Network bandwidth limits
- MinIO disk I/O limits
- Agent memory leaks

---

## Cleanup

### 1. Stop All Agents
```bash
while IFS= read -r host; do
    ssh root@$host "systemctl stop patchiq-agent" &
done < agent-hosts.txt
wait
```

### 2. Archive Results
```bash
# Archive all logs and metrics
tar -czf scale-test-results-$(date +%Y%m%d).tar.gz \
    logs/ metrics/ reports/

# Upload to S3 or similar
aws s3 cp scale-test-results-*.tar.gz s3://patchiq-test-results/
```

### 3. Terminate VMs
```bash
# Terminate AWS instances
aws ec2 terminate-instances --instance-ids $(cat instance-ids.txt)

# Or via cloud provider CLI
```

---

## Success Criteria Summary

- [ ] 30/30 agents registered (100%)
- [ ] All agents maintain heartbeat for 10+ minutes
- [ ] Backend API p95 response time < 500ms
- [ ] Database query p95 time < 200ms
- [ ] Deployment success rate ≥ 95% (28/30)
- [ ] Agent crash recovery 100% (5/5)
- [ ] Backend CPU usage < 60% under load
- [ ] Database connection usage < 80% of pool
- [ ] No backend crashes or errors
- [ ] No data loss or corruption

---

**Document Status:** Approved
**Last Updated:** 2026-02-14
**Estimated Duration:** 90 minutes
