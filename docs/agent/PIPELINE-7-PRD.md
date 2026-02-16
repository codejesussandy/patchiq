# Pipeline 7: Production Validation

## Overview

- **Priority:** Critical
- **Estimated Effort:** 38-46 hours
- **Dependencies:** ALL previous pipelines (1-6)
- **Platform Scope:** All (Windows, Linux, macOS)
- **Target Completion:** Week 6
- **Current Completion:** 0%

## Business Justification

**Production validation is the final gate before shipping to customers.** Without comprehensive validation:
- Unknown bugs reach production
- Performance issues discovered by customers
- Security vulnerabilities undetected
- Scale limitations unknown
- No confidence in production deployment

**Current State:**
- All pipelines implemented (1-6)
- Unit and integration tests passing (270+)
- No end-to-end validation on fresh systems
- No scale testing performed
- No security audit conducted
- No performance benchmarking

**Target State:**
- All platforms tested end-to-end on fresh VMs
- 30+ agent fleet tested (scale)
- 100 concurrent deployments tested (load)
- Security audit passed
- Performance benchmarks documented
- Go/no-go decision made with confidence

**Value Delivered:**
- Production confidence
- Known performance characteristics
- Security assurance
- Identified and fixed edge cases
- Customer-ready product

---

## Requirements

### R1: Fresh Install Testing (All Platforms)

**Description:** Test fresh installation on all target platforms with clean VMs

**Acceptance Criteria:**
- [ ] Test Windows 10/11, Server 2019/2022 (4 platforms)
- [ ] Test macOS 12/13/14 Intel and Apple Silicon (6 platforms)
- [ ] Test Ubuntu 20.04/22.04/24.04 (3 platforms)
- [ ] Test Debian 11/12 (2 platforms)
- [ ] Test RHEL 8/9 (2 platforms)
- [ ] Test Fedora 39/40 (2 platforms)
- [ ] Fresh install from installer (MSI/PKG/DEB/RPM)
- [ ] Service auto-starts on boot
- [ ] Agent registers with backend
- [ ] Heartbeat working
- [ ] Inventory collection succeeds
- [ ] Document any issues found

**Platform:** All
**Priority:** Must Have
**Estimated Hours:** 12-16

---

### R2: Deployment Testing

**Description:** Test software and patch deployment on all platforms

**Acceptance Criteria:**
- [ ] Deploy software packages (10+ packages per platform)
- [ ] Deploy patches (OS updates)
- [ ] Deploy script bundles (hub-centric)
- [ ] Test rollback mechanism
- [ ] Test failed deployment handling
- [ ] Verify all executors work (winget, choco, apt, yum, brew, etc.)
- [ ] Test concurrent deployments (10 at once)
- [ ] Measure deployment success rate (target: 95%+)

**Platform:** All
**Priority:** Must Have
**Estimated Hours:** 8-12

---

### R3: Self-Update Testing

**Description:** Test agent self-update mechanism end-to-end

**Acceptance Criteria:**
- [ ] Deploy v1.0.0 agents
- [ ] Trigger self-update to v1.1.0
- [ ] Verify update manifest downloaded and verified
- [ ] Verify binary checksum validated
- [ ] Verify signature verified (when signed)
- [ ] Verify service restarted successfully
- [ ] Verify health check passed
- [ ] Test rollback on failed update
- [ ] Test phased rollout (10%, 50%, 100%)
- [ ] Verify no downtime during update

**Platform:** All
**Priority:** Must Have
**Estimated Hours:** 6-8

---

### R4: Scale Testing (30+ Agents)

**Description:** Test system behavior with 30+ concurrent agents

**Acceptance Criteria:**
- [ ] Deploy 30 agents across platforms (10 Windows, 10 Linux, 10 macOS)
- [ ] All agents register successfully
- [ ] All agents heartbeat within 60 seconds
- [ ] Backend handles 30 concurrent heartbeats
- [ ] Deploy software to all 30 agents simultaneously
- [ ] Measure backend response time (target: <500ms p95)
- [ ] Measure database query performance
- [ ] Check for memory leaks (backend + agents)
- [ ] Monitor CPU usage (backend + agents)
- [ ] Test agent crash recovery (kill 5 agents, verify restart)

**Platform:** All
**Priority:** Must Have
**Estimated Hours:** 8-10

---

### R5: Load Testing (100 Concurrent Deployments)

**Description:** Test system under high concurrent load

**Acceptance Criteria:**
- [ ] Trigger 100 concurrent deployments
- [ ] Measure deployment completion time
- [ ] Measure backend API response times
- [ ] Measure database query performance under load
- [ ] Check for database connection pool exhaustion
- [ ] Check for rate limiting behavior
- [ ] Verify no deployments failed due to load
- [ ] Monitor MinIO download performance
- [ ] Document performance characteristics
- [ ] Identify bottlenecks

**Platform:** Backend + Agents
**Priority:** Should Have
**Estimated Hours:** 6-8

---

### R6: Security Audit

**Description:** Conduct security audit of agent and backend

**Acceptance Criteria:**
- [ ] Review TLS implementation (enforced, no skip verify)
- [ ] Review credential storage (encrypted at rest)
- [ ] Review API authentication (tokens, expiration)
- [ ] Review file permissions (config, logs, binaries)
- [ ] Test agent as non-root user (Linux/macOS)
- [ ] Review Windows service security (LocalSystem vs NetworkService)
- [ ] Check for SQL injection vulnerabilities
- [ ] Check for command injection vulnerabilities
- [ ] Review update manifest signature verification
- [ ] Test man-in-the-middle attack resistance
- [ ] Document security findings
- [ ] Fix critical/high issues

**Platform:** All
**Priority:** Must Have
**Estimated Hours:** 8-10

---

### R7: Performance Benchmarking

**Description:** Benchmark agent and backend performance

**Acceptance Criteria:**
- [ ] Measure agent CPU usage (idle, active deployment)
- [ ] Measure agent memory usage (idle, active deployment)
- [ ] Measure agent disk I/O (inventory collection, deployment)
- [ ] Measure agent network bandwidth (heartbeat, deployment)
- [ ] Measure backend API response times (all endpoints)
- [ ] Measure database query performance (all queries)
- [ ] Measure MinIO download speeds
- [ ] Benchmark inventory collection time
- [ ] Benchmark deployment time (by package size)
- [ ] Document all benchmarks in report

**Platform:** All
**Priority:** Should Have
**Estimated Hours:** 6-8

---

### R8: Documentation Review & Updates

**Description:** Review and update all documentation based on testing

**Acceptance Criteria:**
- [ ] Review installation docs for accuracy
- [ ] Update troubleshooting docs with discovered issues
- [ ] Document known limitations
- [ ] Update system requirements based on testing
- [ ] Document performance characteristics
- [ ] Update API documentation if needed
- [ ] Create release notes for v1.0.0
- [ ] Create deployment guide for production

**Platform:** All
**Priority:** Should Have
**Estimated Hours:** 4-6

---

## Technical Approach

### Test Infrastructure Setup

**VM Requirements:**

```yaml
Windows VMs (6 total):
  - Windows 10 Pro (21H2)
  - Windows 11 Pro (22H2)
  - Windows Server 2019
  - Windows Server 2022
  - Architecture: amd64

macOS VMs/Systems (6 total):
  - macOS 12 Monterey (Intel)
  - macOS 13 Ventura (Intel)
  - macOS 13 Ventura (Apple Silicon)
  - macOS 14 Sonoma (Intel)
  - macOS 14 Sonoma (Apple Silicon)
  - Note: Apple Silicon requires physical hardware

Linux VMs (9 total):
  - Ubuntu 20.04 LTS
  - Ubuntu 22.04 LTS
  - Ubuntu 24.04 LTS
  - Debian 11
  - Debian 12
  - RHEL 8
  - RHEL 9
  - Fedora 39
  - Fedora 40
  - Architecture: amd64

Total VMs: 21 systems
```

**Cloud Provider Options:**
- AWS EC2 (all platforms)
- Azure VMs (all platforms)
- GCP Compute Engine (all platforms)
- macOS: MacStadium, AWS EC2 Mac instances

---

### Fresh Install Test Script

**File: `test/e2e/fresh-install-test.sh`**

```bash
#!/bin/bash
set -e

PLATFORM="$1"  # windows, macos, debian, ubuntu, rhel, fedora
INSTALLER="$2"  # path to installer

echo "Testing fresh install on $PLATFORM..."

# 1. Install package
case $PLATFORM in
  windows)
    msiexec /i "$INSTALLER" /qn SERVERURL="https://test-hub/api"
    ;;
  macos)
    sudo installer -pkg "$INSTALLER" -target /
    ;;
  debian|ubuntu)
    sudo dpkg -i "$INSTALLER"
    ;;
  rhel|fedora)
    sudo rpm -i "$INSTALLER"
    ;;
esac

# 2. Wait for service to start
sleep 10

# 3. Verify service running
case $PLATFORM in
  windows)
    sc query PatchIQAgent | grep "RUNNING"
    ;;
  macos)
    launchctl list | grep io.patchiq.agent
    ;;
  debian|ubuntu|rhel|fedora)
    systemctl is-active patchiq-agent
    ;;
esac

# 4. Wait for registration
sleep 30

# 5. Check backend for agent
curl -sf "https://test-hub/api/v1/agents" | jq '.data[] | select(.hostname=="'$(hostname)'")'

# 6. Trigger inventory collection
curl -sf -X POST "https://test-hub/api/v1/agents/$AGENT_ID/collect"

# 7. Wait for inventory
sleep 60

# 8. Verify inventory submitted
curl -sf "https://test-hub/api/v1/agents/$AGENT_ID" | jq '.data.lastInventory'

echo "✓ Fresh install test passed on $PLATFORM"
```

---

### Load Testing Script

**File: `test/load/concurrent-deployments.sh`**

```bash
#!/bin/bash

NUM_AGENTS=${1:-30}
NUM_DEPLOYMENTS=${2:-100}

echo "Load testing: $NUM_DEPLOYMENTS concurrent deployments across $NUM_AGENTS agents"

# Get all agent IDs
AGENT_IDS=$(curl -sf "https://test-hub/api/v1/agents" | jq -r '.data[].id' | head -n $NUM_AGENTS)

# Trigger concurrent deployments
START_TIME=$(date +%s)

for i in $(seq 1 $NUM_DEPLOYMENTS); do
  AGENT_ID=$(echo "$AGENT_IDS" | shuf -n 1)  # Random agent

  curl -sf -X POST "https://test-hub/api/v1/agents/$AGENT_ID/deploy" \
    -H "Content-Type: application/json" \
    -d '{"packageId":"test-package-'$i'"}' &
done

wait  # Wait for all to complete

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "Triggered $NUM_DEPLOYMENTS deployments in $DURATION seconds"

# Wait for all deployments to complete
sleep 300

# Check success rate
SUCCESS_COUNT=$(curl -sf "https://test-hub/api/v1/deployments?status=success" | jq '.meta.total')
FAILURE_COUNT=$(curl -sf "https://test-hub/api/v1/deployments?status=failed" | jq '.meta.total')

SUCCESS_RATE=$((SUCCESS_COUNT * 100 / NUM_DEPLOYMENTS))

echo "Success rate: $SUCCESS_RATE% ($SUCCESS_COUNT/$NUM_DEPLOYMENTS)"
echo "Failures: $FAILURE_COUNT"

if [ $SUCCESS_RATE -lt 95 ]; then
  echo "❌ Success rate below 95% threshold"
  exit 1
fi

echo "✓ Load test passed"
```

---

### Performance Benchmarking

**Metrics to Collect:**

```yaml
Agent Metrics:
  CPU Usage:
    - Idle: < 1%
    - Heartbeat: < 2%
    - Inventory Collection: < 10%
    - Active Deployment: < 25%

  Memory Usage:
    - Idle: < 50 MB
    - Active Deployment: < 200 MB

  Network:
    - Heartbeat: < 1 KB/request
    - Inventory: < 100 KB/request
    - Download: Maxes out available bandwidth

  Disk I/O:
    - Logs: < 10 MB/day
    - Temp files: Cleaned up after deployment

Backend Metrics:
  API Response Times (p95):
    - GET /agents: < 200ms
    - POST /agents/register: < 500ms
    - POST /agents/:id/heartbeat: < 100ms
    - POST /agents/:id/deploy: < 200ms
    - GET /agent-versions/current: < 150ms

  Database Query Times (p95):
    - Agent list query: < 100ms
    - Inventory insert: < 200ms
    - Deployment create: < 150ms

  Concurrent Requests:
    - 100 concurrent heartbeats: < 2s total
    - 100 concurrent deployments: < 5s total
```

---

## Implementation Plan

### Task 7.1: Test Infrastructure Setup (4-6 hours)

**Owner:** Teammate 1
**Files:** VMs, test scripts

**Steps:**
1. Provision VMs (AWS/Azure/GCP)
2. Configure backend for testing
3. Build all installers
4. Upload installers to test storage
5. Create test automation scripts
6. Document VM access

---

### Task 7.2: Fresh Install Testing (12-16 hours)

**Owner:** Teammate 1 + Teammate 2
**Platforms:** All 21 VMs

**Test Matrix:**
- Install on each platform
- Verify service auto-start
- Verify registration
- Verify heartbeat
- Verify inventory collection
- Document issues

---

### Task 7.3: Deployment Testing (8-12 hours)

**Owner:** Teammate 2
**Platforms:** Sample of each OS type

**Test Cases:**
- Software deployment (10+ packages per platform)
- Patch deployment
- Script bundles
- Rollback
- Concurrent deployments

---

### Task 7.4: Self-Update Testing (6-8 hours)

**Owner:** Teammate 1
**Platforms:** Sample of each OS type

**Test Cases:**
- Update v1.0.0 → v1.1.0
- Phased rollout (10%, 50%, 100%)
- Failed update rollback
- Manifest verification
- Checksum validation

---

### Task 7.5: Scale & Load Testing (14-18 hours)

**Owner:** Teammate 1 + Teammate 2
**Scale:** 30 agents, 100 concurrent deployments

**Steps:**
1. Deploy 30 agents
2. Monitor backend performance
3. Trigger 100 concurrent deployments
4. Measure response times
5. Check for errors/bottlenecks
6. Document results

---

### Task 7.6: Security Audit (8-10 hours)

**Owner:** Teammate 2
**Scope:** Agent + Backend

**Audit Areas:**
- TLS implementation
- Credential storage
- API authentication
- File permissions
- Injection vulnerabilities
- MITM resistance

---

### Task 7.7: Performance Benchmarking (6-8 hours)

**Owner:** Teammate 1
**Metrics:** CPU, memory, network, disk I/O

**Steps:**
1. Benchmark agent idle
2. Benchmark agent during deployment
3. Benchmark backend APIs
4. Benchmark database queries
5. Document all results

---

### Task 7.8: Documentation & Release (4-6 hours)

**Owner:** Teammate 2
**Deliverables:** Updated docs, release notes

**Steps:**
1. Review installation docs
2. Update troubleshooting
3. Document known limitations
4. Write release notes
5. Create deployment guide

---

## Parallelization Strategy

```
Week 1 (Parallel):
├── Teammate 1: Task 7.1 → 7.2 (half) → 7.4 → 7.5 → 7.7
│   ├── Infrastructure setup (4-6h)
│   ├── Fresh install testing (6-8h, half)
│   ├── Self-update testing (6-8h)
│   ├── Scale/load testing (7-9h, half)
│   └── Performance benchmarking (6-8h)
│   Total: 29-39 hours
│
└── Teammate 2: Task 7.2 (half) → 7.3 → 7.5 → 7.6 → 7.8
    ├── Fresh install testing (6-8h, half)
    ├── Deployment testing (8-12h)
    ├── Scale/load testing (7-9h, half)
    ├── Security audit (8-10h)
    └── Documentation (4-6h)
    Total: 33-45 hours
```

**Total: 62-84 hours with 2 teammates = 31-42 hours per teammate**
**Timeline: ~2 weeks**

---

## Exit Criteria

- [ ] All 21 platforms tested with fresh install
- [ ] All platforms deploy software successfully
- [ ] Self-update works on all platforms
- [ ] 30-agent scale test passed
- [ ] 100-deployment load test passed (95%+ success rate)
- [ ] Security audit completed (no critical issues)
- [ ] Performance benchmarks documented
- [ ] Documentation updated
- [ ] Release notes written
- [ ] Go/no-go decision made

---

## Success Metrics

**Installation:**
- Fresh install success rate: 100% (21/21 platforms)
- Service auto-start rate: 100%

**Deployment:**
- Deployment success rate: 95%+ across all platforms
- Rollback success rate: 100% on failures

**Scale:**
- 30 agents: All register and heartbeat
- Backend response times: p95 < 500ms

**Load:**
- 100 concurrent deployments: 95%+ success
- No backend errors under load

**Security:**
- 0 critical vulnerabilities
- 0 high-priority vulnerabilities

**Performance:**
- Agent CPU idle: < 1%
- Agent memory idle: < 50 MB
- Backend API p95: < 500ms

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| VM provisioning costs | Medium | Use spot instances, terminate after testing |
| macOS testing access | High | Use MacStadium or AWS Mac instances |
| Testing takes longer than estimated | Medium | Prioritize critical platforms first |
| Critical bugs discovered | High | Fix immediately, re-test |
| Performance below targets | Medium | Optimize bottlenecks, re-benchmark |

---

## Timeline

- **Planning:** 4 hours
- **Infrastructure Setup:** 4-6 hours
- **Testing:** 40-54 hours (with 2 teammates: 20-27 hours each)
- **Analysis & Fixes:** 8 hours
- **Documentation:** 4-6 hours
- **Buffer:** 8 hours
- **Total:** 46 hours = **2 weeks** with 2 teammates

---

## Dependencies

**Internal:**
- All pipelines 1-6 must be complete
- Installers must be built
- Backend must be running

**External:**
- VM infrastructure (AWS/Azure/GCP)
- macOS access (physical or cloud)
- Test accounts and credentials

---

**Document Status:** APPROVED
**Last Updated:** 2026-02-14
**Implementation Start:** Now (final pipeline!)
