# Deployment Test Plan

## Overview

This document outlines comprehensive deployment testing for the PatchIQ agent across all supported platforms. The goal is to validate that software packages, patches, and script bundles deploy successfully with a 95%+ success rate.

---

## Test Scope

### Platforms to Test
- **Windows:** 10, 11, Server 2019, Server 2022
- **macOS:** 12 (Intel/Silicon), 13 (Intel/Silicon), 14 (Intel/Silicon)
- **Linux:** Ubuntu 20.04/22.04/24.04, Debian 11/12, RHEL 8/9, Fedora 39/40, Rocky 8/9

### Deployment Types
1. **Software Packages** - Install/update applications
2. **Patches** - OS security/feature updates
3. **Script Bundles** - Hub-centric packages with custom scripts
4. **Rollback** - Revert failed/unwanted deployments

### Success Criteria
- **Overall Success Rate:** 95%+ across all platforms
- **Concurrent Deployments:** 10 simultaneous without conflicts
- **Rollback Success:** 100% on supported packages
- **Performance:** Deployment completion within expected time

---

## Test Scenarios

### Scenario 1: Single Package Deployment

**Objective:** Deploy one package successfully

**Steps:**
1. Select agent
2. Choose package from test package list
3. Trigger deployment
4. Monitor deployment status
5. Verify installation success
6. Verify package functional

**Expected Result:**
- Deployment status: Success
- Package installed and working
- Completion time: < 5 minutes (small packages)

**Test Matrix:** Execute on 3 agents per platform (Windows, macOS, Linux)

---

### Scenario 2: Multiple Package Deployment (Sequential)

**Objective:** Deploy 5 packages sequentially to one agent

**Steps:**
1. Select agent
2. Deploy package 1, wait for completion
3. Deploy package 2, wait for completion
4. Deploy package 3, wait for completion
5. Deploy package 4, wait for completion
6. Deploy package 5, wait for completion
7. Verify all 5 installed

**Expected Result:**
- All 5 deployments succeed
- No interference between deployments
- All packages functional

**Test Matrix:** 1 agent per platform

---

### Scenario 3: Concurrent Package Deployment (Same Agent)

**Objective:** Deploy 10 packages simultaneously to one agent

**Steps:**
1. Select agent
2. Trigger 10 deployments simultaneously
3. Monitor queue/parallel execution
4. Verify completion of all 10
5. Check for conflicts/failures

**Expected Result:**
- Agent queues deployments appropriately
- All 10 complete successfully (or queued properly)
- No resource conflicts
- Completion time: reasonable based on queue strategy

**Test Matrix:** 1 agent per platform

---

### Scenario 4: Concurrent Multi-Agent Deployment

**Objective:** Deploy same package to 10 agents simultaneously

**Steps:**
1. Select 10 agents (mixed platforms)
2. Trigger deployment to all 10
3. Monitor all deployments
4. Verify all complete

**Expected Result:**
- All 10 agents receive deployment
- 95%+ success rate
- Backend handles load
- Completion time: < 10 minutes

**Test Matrix:** 10 agents (3-4 per platform)

---

### Scenario 5: Patch Deployment (OS Updates)

**Objective:** Deploy OS security/feature updates

**Platforms:**
- **Windows:** Windows Update via PSWindowsUpdate or similar
- **macOS:** softwareupdate CLI
- **Linux:** apt/dnf upgrade

**Steps:**
1. Check available updates
2. Select specific patch/update
3. Trigger deployment
4. Monitor installation
5. Verify patch applied
6. Check for reboot requirement

**Expected Result:**
- Patch installs successfully
- System remains stable
- Reboot handled gracefully (if required)

**Test Matrix:** 1 agent per platform

---

### Scenario 6: Script Bundle Deployment (Hub-Centric)

**Objective:** Deploy custom package with bundled scripts

**Package Structure:**
```
test-app-bundle/
├── manifest.yaml
├── test-app-1.0.0.tar.gz
├── install.sh / install.ps1
├── update.sh / update.ps1
├── rollback.sh / rollback.ps1
└── uninstall.sh / uninstall.ps1
```

**Steps:**
1. Upload bundle to MinIO hub
2. Create deployment pointing to bundle
3. Agent downloads bundle
4. Agent executes install script
5. Verify app installed via custom script
6. Test update script
7. Test rollback script
8. Test uninstall script

**Expected Result:**
- Bundle downloads successfully
- All scripts execute correctly
- Scripts have appropriate permissions
- Logs captured

**Test Matrix:** All platforms (use cross-platform bundle or platform-specific)

---

### Scenario 7: Failed Deployment Handling

**Objective:** Verify agent handles failures gracefully

**Failure Scenarios:**
- Package not found (404)
- Checksum mismatch
- Insufficient disk space
- Insufficient permissions
- Package incompatible with OS
- Network timeout during download

**Steps:**
1. Trigger deployment with intentional failure
2. Monitor agent behavior
3. Verify failure reported to backend
4. Verify logs contain error details
5. Verify agent remains healthy

**Expected Result:**
- Failure detected and reported
- Error message clear and actionable
- Agent doesn't crash
- No partial installations left behind

**Test Matrix:** 2-3 failure scenarios per platform

---

### Scenario 8: Rollback Deployment

**Objective:** Rollback a deployed package

**Steps:**
1. Deploy package version 1.0
2. Verify installed
3. Deploy package version 2.0 (update)
4. Verify updated to 2.0
5. Trigger rollback to 1.0
6. Verify rolled back to 1.0

**Expected Result:**
- Rollback succeeds
- System reverts to previous state
- No data loss (if applicable)
- Rollback completes in reasonable time

**Test Matrix:** 1 agent per platform (with rollback-capable packages)

**Note:** Not all package managers support rollback natively

---

### Scenario 9: Large Package Deployment

**Objective:** Deploy large package (500 MB - 2 GB)

**Examples:**
- Microsoft Office
- Adobe Creative Cloud
- Large game
- Database software

**Steps:**
1. Trigger large package deployment
2. Monitor download progress
3. Monitor installation progress
4. Verify completion
5. Check disk space usage

**Expected Result:**
- Download completes (may take 10-30 min)
- Installation succeeds
- Progress reported accurately
- Temp files cleaned up

**Test Matrix:** 1 agent per platform

---

### Scenario 10: Deployment with Reboot

**Objective:** Deploy package requiring reboot

**Examples:**
- Windows updates
- Kernel updates (Linux)
- macOS system updates

**Steps:**
1. Deploy package requiring reboot
2. Verify reboot scheduled/required
3. Agent handles reboot gracefully
4. Verify package completes post-reboot
5. Verify agent reconnects after reboot

**Expected Result:**
- Reboot requirement detected
- Reboot executed (or scheduled)
- Deployment completes post-reboot
- Agent heartbeat resumes

**Test Matrix:** 1 agent per platform

---

## Test Package Lists

See dedicated package list files:
- `test/fixtures/windows-packages.json` - Windows test packages
- `test/fixtures/macos-packages.json` - macOS test packages
- `test/fixtures/linux-packages.json` - Linux test packages

Each list contains 10-20 packages per platform with:
- Package name
- Version
- Size
- Expected install time
- Rollback support (yes/no)

---

## Test Execution

### Prerequisites
1. All agents registered and online
2. Backend running and accessible
3. MinIO hub configured with test packages
4. Test packages uploaded to hub
5. Test credentials configured

### Execution Order
1. **Scenario 1:** Single deployments (validate basic functionality)
2. **Scenario 2:** Sequential deployments (validate multiple deployments)
3. **Scenario 3:** Concurrent same-agent (validate queuing)
4. **Scenario 4:** Concurrent multi-agent (validate scale)
5. **Scenario 5:** Patch deployment (validate OS updates)
6. **Scenario 6:** Script bundles (validate hub-centric model)
7. **Scenario 7:** Failure handling (validate error cases)
8. **Scenario 8:** Rollback (validate rollback mechanism)
9. **Scenario 9:** Large packages (validate performance)
10. **Scenario 10:** Reboot handling (validate reboot flow)

### Test Scripts
- `test/e2e/deployment-test.sh` - Main deployment test runner
- `test/e2e/concurrent-deploy-test.sh` - Concurrent deployment test
- `test/e2e/rollback-test.sh` - Rollback test

---

## Success Metrics

### Deployment Success Rate
- **Target:** 95%+ overall
- **Calculation:** (Successful Deployments / Total Deployments) × 100
- **Breakdown by Platform:**
  - Windows: 95%+
  - macOS: 95%+
  - Linux: 95%+

### Performance Metrics
- **Small Package (< 50 MB):** < 2 minutes
- **Medium Package (50-200 MB):** < 5 minutes
- **Large Package (200 MB - 1 GB):** < 15 minutes
- **Very Large Package (1-2 GB):** < 30 minutes

### Rollback Success Rate
- **Target:** 100% for supported packages
- **Note:** Some package managers don't support rollback

### Concurrent Deployment
- **10 concurrent to 1 agent:** Queued or parallel, no failures
- **Same package to 10 agents:** All succeed within 10 minutes

---

## Failure Analysis

### Acceptable Failures
- Package incompatible with OS version
- Insufficient disk space
- Network interruption (with retry)
- Package repository unavailable

### Unacceptable Failures
- Agent crash during deployment
- Partial installation (not rolled back)
- Deployment succeeds but package non-functional
- Data corruption
- Agent stops responding

---

## Test Results Template

### Per-Scenario Results
```
Scenario: [Name]
Platform: [Windows/macOS/Linux]
Agent: [Agent ID]
Package: [Package Name]
Start Time: [Timestamp]
End Time: [Timestamp]
Duration: [Seconds]
Status: [Success/Failure]
Error (if any): [Error Message]
Logs: [Link to logs]
```

### Summary Results
```
Total Deployments: [Number]
Successful: [Number] ([Percentage]%)
Failed: [Number] ([Percentage]%)
Success Rate: [Percentage]%

By Platform:
- Windows: [Success Rate]%
- macOS: [Success Rate]%
- Linux: [Success Rate]%

By Type:
- Software: [Success Rate]%
- Patches: [Success Rate]%
- Bundles: [Success Rate]%
- Rollback: [Success Rate]%
```

---

## Known Limitations

### Windows
- Windows Store apps require special handling (UWP apps)
- Some installers require interactive GUI (not supported)
- Windows Update requires admin privileges

### macOS
- Mac App Store apps require Apple ID (cannot automate)
- Some PKGs require user interaction
- Gatekeeper may block unsigned apps
- Full Disk Access required for some installations

### Linux
- Different package managers across distros
- Some packages require interactive configuration (debconf)
- Repository availability varies
- Snap/Flatpak may have sandboxing issues

---

## Troubleshooting

### Deployment Stuck in "In Progress"
1. Check agent logs for errors
2. Check agent is online
3. Check network connectivity
4. Check if installer is waiting for user input

### Deployment Fails with "Checksum Mismatch"
1. Verify package not corrupted in MinIO
2. Re-upload package
3. Check manifest.yaml checksum

### Deployment Succeeds but Package Not Working
1. Check if package requires additional configuration
2. Check if dependencies missing
3. Check if package compatible with OS version
4. Review installer logs

### Rollback Fails
1. Verify package manager supports rollback
2. Check if original package cached
3. Review rollback script logs
4. Verify sufficient disk space

---

## Test Environment Requirements

### Infrastructure
- **Agents:** 21+ VMs (1 per platform + extras for concurrent tests)
- **Backend:** Production-like configuration
- **MinIO:** Sufficient storage for test packages (10-20 GB)
- **Network:** Stable, sufficient bandwidth

### Test Data
- Test packages uploaded to MinIO
- Test bundles created with scripts
- Test credentials configured
- Test organization setup

### Monitoring
- Backend API logs
- Agent logs
- Database query logs
- MinIO access logs
- Network traffic monitoring

---

## Execution Timeline

- **Setup:** 2 hours (prepare VMs, upload packages)
- **Scenario 1-4:** 4 hours (basic deployment testing)
- **Scenario 5-6:** 2 hours (patches and bundles)
- **Scenario 7-8:** 2 hours (failures and rollback)
- **Scenario 9-10:** 2 hours (large packages, reboots)
- **Analysis:** 2 hours (review results, document issues)
- **Total:** 12-14 hours

---

## Sign-Off Criteria

- [ ] All 10 scenarios executed
- [ ] Success rate ≥ 95% overall
- [ ] Success rate ≥ 95% per platform
- [ ] Concurrent deployments work
- [ ] Rollback mechanism validated
- [ ] Failure handling validated
- [ ] Performance targets met
- [ ] All test results documented
- [ ] Known issues documented
- [ ] Test artifacts archived

---

**Document Status:** Approved
**Last Updated:** 2026-02-14
**Version:** 1.0
