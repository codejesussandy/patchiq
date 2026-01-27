# Deployment Pipeline Issues - Diagnostic Report

## Summary

After thorough investigation of the deployment pipeline (Frontend → Backend → Agent → Agent UI), I've identified **multiple critical issues** that are causing the pipeline to fail.

---

## CRITICAL ISSUE 1: Field Name Mismatch (Deployment Creation)

### Location
- **Frontend**: `frontend/src/services/softwareJobs.service.ts:49`
- **Backend**: `backend/src/modules/deployments/deployment.controller.ts:22`

### Problem
The frontend sends `type` but the backend expects `deploymentType`:

**Frontend sends:**
```typescript
{
  type: 'install',  // ← Wrong field name
  ...
}
```

**Backend expects:**
```typescript
const { deploymentType, ... } = req.body;  // ← Expects "deploymentType"
```

### Impact
- `deploymentType` is `undefined` in the backend
- Falls back to 'install' by default (line 29): `deploymentType: deploymentType || 'install'`
- This hides the bug but may cause issues with 'uninstall' or 'upgrade' operations

### Fix Required
Either:
1. Change frontend to send `deploymentType` instead of `type`, OR
2. Change backend to accept `type` as an alias

---

## CRITICAL ISSUE 2: Field Name Mismatch (Task Display)

### Location
- **Backend**: `backend/src/modules/deployments/deployment-executor.service.ts:488-500`
- **Frontend**: `frontend/src/services/softwareJobs.service.ts:27-40`

### Problem
The backend returns different field names than what the frontend expects:

**Backend returns:**
```typescript
{
  endpointId: task.endpointId,      // Agent ID
  endpointName: task.endpointName,  // Agent hostname
  endpointOs: task.endpointOs,      // Agent OS
  itemName: task.itemName,          // Package name
  ...
}
```

**Frontend expects:**
```typescript
interface SoftwareDeploymentTask {
  agentId: string;      // ← Expects 'agentId'
  agentName?: string;   // ← Expects 'agentName'
  agentOs?: string;     // ← Expects 'agentOs'
  packageName: string;  // ← Expects 'packageName'
  ...
}
```

### Impact
- **THIS IS WHY THE DEPLOYMENT DETAILS PAGE GOES BLANK**
- When `convertTask()` runs, it tries to access `t.agentId` but the response has `endpointId`
- All task data becomes undefined, causing the component to fail silently

### Fix Required
Either:
1. Update backend to return frontend-expected field names, OR
2. Update frontend to handle both field names

---

## CRITICAL ISSUE 3: Status Case Mismatch

### Location
- **Backend stores**: `'PENDING'`, `'IN_PROGRESS'`, `'SUCCESS'`, `'FAILED'` (uppercase)
- **Frontend expects**: `'pending'`, `'in_progress'`, `'completed'`, `'failed'` (lowercase)

### Problem
The `convertTask()` function expects lowercase status values:

```typescript
const convertTask = (t: SoftwareDeploymentTask): TaskItem => ({
  ...
  status: (t.status === 'completed' ? 'SUCCESS' :
           t.status === 'failed' ? 'FAILED' :
           t.status === 'in_progress' ? 'IN_PROGRESS' : 'PENDING')
});
```

But backend returns uppercase: `'PENDING'`, `'SUCCESS'`, etc.

### Impact
- Status comparison fails (e.g., `'PENDING' !== 'pending'`)
- All tasks may show wrong status or default to 'PENDING'

---

## ISSUE 4: Variable Use-Before-Definition

### Location
- **File**: `frontend/src/pages/jobs/SoftwareJobsDeployed.tsx:303`

### Problem
```typescript
// Line 303 - uses filteredItems
const handleExport = () => {
  const dataToExport = filteredItems.length > 0 ? filteredItems : deployedItems;
  ...
}

// Line 715 - filteredItems is defined much later
const filteredItems = deployedItems.filter(...)
```

### Impact
- If Export button is clicked early, may cause ReferenceError
- Could cause blank page in some scenarios

---

## ISSUE 5: Agent Jobs Not Showing in Agent UI

### Problem
The agent correctly tracks jobs in memory (`jobHistory`, `activeJobs`), but there may be timing issues:

1. Agent heartbeat interval may be too long (60s default)
2. Commands are fetched async (`go m.fetchAndExecuteCommands()`)
3. No immediate UI refresh after command completion

### Verification Needed
- Check if commands are being created with status 'pending'
- Check if agent is actually calling GET /api/agent/commands
- Check if agent is calling POST /api/agent/commands/:id/result

---

## Pipeline Flow Diagram

```
Frontend (Hub.tsx)
    │
    ├── Creates deployment with wrong field name (type vs deploymentType)
    │
    ▼
Backend (deployment.controller.ts)
    │
    ├── Receives request, deploymentType is undefined
    ├── Falls back to 'install'
    ├── Creates SoftwareDeployment + Tasks + AgentCommands
    │
    ▼
Database (AgentCommand status='pending')
    │
    ▼
Agent Heartbeat
    │
    ├── POST /api/agent/heartbeat
    ├── Response: { commandsPending: true }
    ├── Calls GET /api/agent/commands
    ├── Executes command
    ├── POST /api/agent/commands/:id/result
    │
    ▼
Backend Updates
    │
    ├── Updates AgentCommand status
    ├── Updates SoftwareDeploymentTask status
    ├── Updates SoftwareDeployment counts
    │
    ▼
Frontend (SoftwareJobsDeployed.tsx)
    │
    ├── Calls GET /deployments/software/:id
    ├── Receives tasks with wrong field names (endpointId vs agentId)
    ├── convertTask() fails to map data correctly
    ├── **PAGE GOES BLANK**
```

---

## Quick Diagnostic Commands

### 1. Check if commands are being created
```sql
SELECT id, "agentId", type, status, "createdAt"
FROM "AgentCommand"
ORDER BY "createdAt" DESC
LIMIT 10;
```

### 2. Check deployment tasks
```sql
SELECT t.id, t."endpointId", t."endpointName", t.status, t."commandId", c.status as command_status
FROM "SoftwareDeploymentTask" t
LEFT JOIN "AgentCommand" c ON t."commandId" = c.id
ORDER BY t."createdAt" DESC
LIMIT 10;
```

### 3. Test deployment creation API directly
```bash
curl -X POST http://localhost:3000/v1/deployments/software \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Test Deployment",
    "deploymentType": "install",
    "targetAgentIds": ["<agent-id>"],
    "package": {
      "name": "test-package",
      "source": "apt"
    }
  }'
```

### 4. Check agent logs
```bash
# Look for command fetch/execute logs
grep -i "command" /var/log/patchiq-agent.log
```

---

## Fixes Required (Priority Order)

1. **CRITICAL**: Fix task field mapping in backend OR frontend
2. **CRITICAL**: Fix deployment type field name mismatch
3. **HIGH**: Fix status case sensitivity
4. **MEDIUM**: Fix filteredItems use-before-definition
5. **LOW**: Add better error handling/logging

---

## Files to Modify

### Backend
1. `backend/src/modules/deployments/deployment.controller.ts` - Accept both `type` and `deploymentType`
2. `backend/src/modules/deployments/deployment-executor.service.ts` - Return frontend-compatible field names

### Frontend
1. `frontend/src/services/softwareJobs.service.ts` - Fix field names in interfaces
2. `frontend/src/pages/jobs/SoftwareJobsDeployed.tsx` - Fix convertTask() and handleExport()
