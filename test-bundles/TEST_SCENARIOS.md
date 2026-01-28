# Hub-Centric Deployment Test Scenarios

This document outlines test scenarios to verify the complete Hub-centric deployment pipeline.

## Prerequisites

1. **Backend running**: `cd backend && npm run dev`
2. **Frontend running**: `cd frontend && npm run dev`
3. **Agent running**: `cd agent && go run ./cmd/agent`
4. **Services running**: `make dev-services` (PostgreSQL, Redis, MinIO)

## Build Test Bundles

```bash
cd test-bundles
chmod +x build-bundles.sh
./build-bundles.sh
```

This creates:
- `dist/hello-world.tar.gz` - Simple test package (no root required)
- `dist/nginx.tar.gz` - Real package (requires root)
- `dist/mock-patch.tar.gz` - Simulated security patch (requires root)

---

## Test Scenario 1: Bundle Upload (Hello World)

**Purpose**: Verify bundle upload, manifest parsing, and package creation.

### Steps:

1. **Navigate to Hub**: Open http://localhost:5173/hub

2. **Click "Upload Bundle"** button

3. **Upload** `test-bundles/dist/hello-world.tar.gz`

4. **Expected Result**:
   - Success message: "Bundle uploaded successfully! Package Hello World Test Package v1.0.0 created. Scripts found: install, update, rollback, uninstall"
   - New package appears in table with:
     - Name: "Hello World Test Package"
     - Version: "1.0.0"
     - Platform: "Linux"
     - Source: Green "BUNDLE" tag (not purple "APT" etc.)

### API Verification:
```bash
curl -X GET http://localhost:3000/api/v1/hub/packages \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.data[] | select(.name == "hello-world")'
```

Expected fields:
- `installSource`: "bundle"
- `scriptsIncluded`: true
- `hasBundle`: true

---

## Test Scenario 2: Deploy Bundle Package (Hello World)

**Purpose**: Verify end-to-end deployment using Hub bundles.

### Prerequisites:
- Package uploaded (Scenario 1)
- At least one Linux agent connected

### Steps:

1. **In Hub page**, find "Hello World Test Package"

2. **Click Deploy icon** (rocket)

3. **Fill deployment form**:
   - Name: "Test Hello World Deploy"
   - Type: "Install"
   - Select at least one Linux endpoint

4. **Click Deploy**

5. **Expected Result**:
   - Success message with deployment ID
   - Navigate to Jobs > Software Deployed

6. **Verify Deployment**:
   - Status should progress: PENDING -> IN_PROGRESS -> SUCCESS
   - Click on deployment to see tasks
   - Task output should show the install script output

### Agent-Side Verification:
```bash
# On the agent machine
cat /tmp/hello-world/version.txt
# Should show: "Installed version: 1.0.0"

/tmp/hello-world/hello.sh
# Should output: "Hello from PatchIQ Hub!"
```

---

## Test Scenario 3: Update Operation

**Purpose**: Verify update script execution.

### Steps:

1. **In Hub page**, find "Hello World Test Package"

2. **Click Deploy icon**

3. **Select Type: "Upgrade"**

4. **Select same endpoint(s) from Scenario 2**

5. **Click Deploy**

6. **Expected Result**:
   - New deployment created
   - Agent executes `update.sh`
   - Task completes with SUCCESS

### Agent-Side Verification:
```bash
cat /tmp/hello-world/version.txt
# Should show: "Installed version: 1.1.0"
# And: "Updated from: 1.0.0"

cat /tmp/hello-world/.status
# Should show: "UPDATED"
```

---

## Test Scenario 4: Rollback Operation

**Purpose**: Verify rollback functionality.

### Steps:

1. **Navigate to Jobs > Software Deployed**

2. **Find the update deployment from Scenario 3**

3. **Click to view tasks**

4. **Click "Rollback" button** on a successful task

5. **Expected Result**:
   - Rollback command created
   - Agent executes `rollback.sh`
   - Task status changes to ROLLBACK_IN_PROGRESS, then SUCCESS

### Agent-Side Verification:
```bash
cat /tmp/hello-world/.status
# Should show: "ROLLED_BACK"

cat /tmp/hello-world/version.txt
# Should show: "Installed version: 1.0.0"
```

---

## Test Scenario 5: Uninstall Operation

**Purpose**: Verify uninstall script execution.

### Steps:

1. **In Hub page**, find "Hello World Test Package"

2. **Click Deploy icon**

3. **Select Type: "Uninstall"**

4. **Select same endpoint(s)**

5. **Click Deploy**

6. **Expected Result**:
   - Deployment created
   - Agent executes `uninstall.sh`
   - Task completes with SUCCESS

### Agent-Side Verification:
```bash
ls /tmp/hello-world
# Should return: "No such file or directory"
```

---

## Test Scenario 6: Nginx Real Package (Requires Root)

**Purpose**: Verify real package installation with sudo.

### Steps:

1. **Upload** `test-bundles/dist/nginx.tar.gz` to Hub

2. **Deploy to Linux endpoint**:
   - Type: "Install"
   - This will require sudo on the agent

3. **Expected Result**:
   - Nginx installed via apt/dnf/yum
   - Service started

### Agent-Side Verification:
```bash
nginx -v
# Should show: "nginx version: nginx/X.X.X"

systemctl status nginx
# Should show: "active (running)"
```

4. **Uninstall Test**:
   - Create uninstall deployment
   - Verify nginx removed

---

## Test Scenario 7: Mock Patch Installation

**Purpose**: Verify patch-style deployment.

### Steps:

1. **Upload** `test-bundles/dist/mock-patch.tar.gz` to Hub

2. **Deploy to endpoint**:
   - Type: "Install"

3. **Expected Result**:
   - Patch record created at `/var/lib/patchiq/patches/`

### Agent-Side Verification:
```bash
cat /var/lib/patchiq/patches/MOCK-2024-01.installed
# Should show patch details with Status: INSTALLED
```

4. **Rollback Test**:
   - Trigger rollback
   - Verify status changes to ROLLED_BACK

5. **Uninstall Test**:
   - Create uninstall deployment
   - Verify patch file removed

---

## Test Scenario 8: Legacy Package (Non-Bundle)

**Purpose**: Verify backward compatibility with legacy packages.

### Steps:

1. **Create package manually** (Add Package button):
   - Name: "htop"
   - Display Name: "Htop Process Viewer"
   - Version: "3.0.0"
   - Platform: "Linux"
   - Install Source: "APT" (not Bundle)

2. **Deploy to endpoint**

3. **Expected Result**:
   - Agent uses traditional `apt-get install htop`
   - NOT script-based execution

### API Verification:
```bash
# Check command type
curl -X GET http://localhost:3000/api/v1/agents/YOUR_AGENT_ID/commands \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.[-1].type'
# Should be: "software_install" (not "hub_install")
```

---

## Test Scenario 9: API Endpoints Verification

### Bundle Upload API:
```bash
curl -X POST http://localhost:3000/api/v1/hub/packages/upload-bundle \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test-bundles/dist/hello-world.tar.gz"
```

Expected response:
```json
{
  "success": true,
  "data": {
    "packageId": "SWP-XXXXXXXX",
    "bundleObjectKey": "packages/linux/patchiq/hello-world/1.0.0/bundle.tar.gz",
    "bundleChecksum": "sha256:...",
    "bundleSize": 1234,
    "manifest": { ... },
    "scriptsFound": ["install", "update", "rollback", "uninstall"]
  }
}
```

### Bundle Download API:
```bash
curl -X GET http://localhost:3000/api/v1/hub/packages/SWP-XXXXXXXX/bundle \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected response:
```json
{
  "success": true,
  "data": {
    "packageId": "SWP-XXXXXXXX",
    "bundleUrl": "https://minio:9000/...(presigned URL)",
    "bundleChecksum": "sha256:...",
    "bundleSize": 1234,
    "manifest": { ... },
    "expiresAt": "2024-01-25T..."
  }
}
```

### Execution Payload API:
```bash
curl -X GET http://localhost:3000/api/v1/hub/packages/SWP-XXXXXXXX/execution-payload/install \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Test Scenario 10: Error Handling

### Invalid Bundle:
1. Create a .tar.gz without manifest.json
2. Upload to Hub
3. **Expected**: Error message "Bundle must contain a manifest.json file"

### Missing Install Script:
1. Create manifest.json with `scripts.install: "scripts/missing.sh"`
2. Package and upload
3. **Expected**: Error message "Install script not found: scripts/missing.sh"

### Agent Offline:
1. Create deployment for offline agent
2. **Expected**: Task stays in PENDING until agent comes online

### Script Failure:
1. Create bundle with failing install.sh (exit 1)
2. Deploy
3. **Expected**: Task status FAILED with error output captured

---

## Verification Checklist

- [ ] Bundle upload creates package with scriptsIncluded=true
- [ ] Hub UI shows green "BUNDLE" tag for script packages
- [ ] Deployment creates `hub_install` command (not `software_install`)
- [ ] Agent downloads bundle from MinIO
- [ ] Agent extracts and executes correct script
- [ ] Script output captured in task results
- [ ] Rollback uses bundle's rollback.sh script
- [ ] Uninstall uses bundle's uninstall.sh script
- [ ] Legacy packages still work with traditional commands
- [ ] Frontend deployment includes packageId in payload

---

## Troubleshooting

### Bundle not downloading:
- Check MinIO is running: `docker ps | grep minio`
- Check presigned URL expiry (1 hour by default)

### Script not executing:
- Check agent logs for "Executing script" messages
- Verify scripts have execute permission in bundle
- Check if `requiresRoot: true` but agent lacks sudo

### Task stuck in PENDING:
- Verify agent is online (check heartbeat)
- Check backend logs for command creation
- Verify agentId matches target

### Type mismatches:
- Compare manifest.json fields with expected types
- Check backend validation errors in logs
