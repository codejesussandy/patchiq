# Implementation Plan: B.7 — Patch Supersedence Management UI

> **Sprint:** 1 | **Track:** B (Frontend) | **Owner:** Dev 2
> **Priority:** P1 (Should Have) | **Effort:** 2-3 days
> **Status:** 🔄 IN PLANNING
> **Date:** 2026-02-13

---

## 1. Executive Summary

**Problem:** The backend has full CRUD endpoints for patch supersedence relationships (`/patches/:id/supersede/...`), and the frontend shows supersedence as read-only tags in `PatchDetails.tsx:215-226`. But there is **no UI to create or delete** supersedence relationships. Admins must use direct API calls to manage which patches supersede which.

**Goal:** Build a complete UI for managing patch supersedence relationships, allowing admins to mark patches as superseded and remove incorrect relationships through a user-friendly interface.

**Success Criteria:**
- Admins can add supersedence relationships from PatchDetails page
- Admins can remove supersedence relationships with confirmation
- Patch search works for finding patches to supersede
- Real-time UI updates after relationship changes
- No regressions in existing patch details display

---

## 2. Discovery Phase

### 2.1 Backend API Endpoints (Already Exist)

**Verified endpoints in `backend/src/modules/patches/patches.routes.ts:161-190`:**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/v1/patches/:id/superseded` | Get patches superseded by this patch |
| GET | `/v1/patches/:id/superseding` | Get patches that supersede this patch |
| POST | `/v1/patches/:id/supersede/:targetId` | Mark targetId as superseded by this patch |
| DELETE | `/v1/patches/:id/supersede/:targetId` | Remove supersedence relationship |

**Key Insight:** Backend is complete. We only need to add frontend service methods and UI.

### 2.2 Current Frontend State

**Read-only display in `PatchDetails.tsx:215-230`:**
```tsx
{((patch.supersededBy && patch.supersededBy.length > 0) ||
  (patch.supersedes && patch.supersedes.length > 0)) && (
  <>
    <Divider style={{ margin: '16px 0' }} />
    <Text strong style={{ display: 'block', marginBottom: 12 }}>Supersedence</Text>
    <Row gutter={24}>
      {patch.supersededBy && patch.supersededBy.length > 0 && (
        <Col span={12}>
          <Text type="secondary">Replaced By</Text>
          <Space wrap>{patch.supersededBy.map((kb) => <Tag key={kb}>{kb}</Tag>)}</Space>
        </Col>
      )}
      {patch.supersedes && patch.supersedes.length > 0 && (
        <Col span={12}>
          <Text type="secondary">Replaces</Text>
          <Space wrap>{patch.supersedes.map((kb) => <Tag key={kb}>{kb}</Tag>)}</Space>
        </Col>
      )}
    </Row>
  </>
)}
```

**Problems:**
- Tags are purely display — no click handlers
- No "Add" or "Manage" button
- No way to remove relationships
- No patch search functionality

### 2.3 Supersedence Data Model

**From `schema.prisma` (Patch model):**
```prisma
model Patch {
  // ... other fields
  supersedes     String[]  // Array of patch IDs this patch supersedes
  supersededBy   String[]  // Array of patch IDs that supersede this patch
  supersededAt   DateTime? // When this patch was superseded
}
```

**Key Fields:**
- `supersedes` — Array of KB/patch IDs that this patch replaces
- `supersededBy` — Array of KB/patch IDs that replace this patch
- Both are stored as string arrays, displayed as tags

---

## 3. Technical Analysis

### 3.1 User Flow: Add Supersedence

**Scenario:** Admin viewing Patch A wants to mark it as superseding Patch B (older patch).

1. Click "Manage Supersedence" button in PatchDetails
2. Modal/drawer opens with two sections:
   - **This patch supersedes:** (list of patches A replaces)
   - **This patch is superseded by:** (list of patches that replace A)
3. Click "+ Add Supersedes" button
4. Search modal opens with patch search
5. Type patch title/KB number (e.g., "KB5034441")
6. Select patch from results
7. Confirm action
8. POST `/v1/patches/{patchA.id}/supersede/{patchB.id}`
9. Modal closes, PatchDetails refreshes, new tag appears

### 3.2 User Flow: Remove Supersedence

**Scenario:** Admin wants to remove incorrect supersedence relationship.

1. In "Manage Supersedence" modal, see existing relationships
2. Click "×" button next to a tag
3. Confirmation dialog: "Remove supersedence relationship with KB5034441?"
4. Confirm
5. DELETE `/v1/patches/{patchA.id}/supersede/{patchB.id}`
6. Tag disappears from list

### 3.3 Component Architecture

**Proposed Structure:**

```
PatchDetails.tsx (parent)
  └─ SupersedenceSection (new component)
       ├─ Read-only tags display (existing)
       ├─ "Manage Supersedence" button (new)
       └─ SupersedenceManagerModal (new)
            ├─ SupersededByList (displays patches that supersede this one)
            ├─ SupersedesList (displays patches this one supersedes)
            └─ PatchSearchModal (for adding new relationships)
```

**Alternative (Simpler):**
Inline "Add" buttons next to each section instead of a separate modal. Clicking "Add" opens patch search directly.

**Recommendation:** Use inline approach for v1 (simpler, less UI layers).

---

## 4. Refactor Strategy

### 4.1 Phase 1: Add Service Methods (Agent Task)

**Agent:** Implementation agent
**Duration:** 30 minutes

**File:** `frontend/src/services/patch.service.ts`

**Add methods:**
```typescript
/**
 * Get patches that this patch supersedes (replaces)
 */
async getSupersededPatches(patchId: string): Promise<Patch[]> {
  const response = await api.get(`/patches/${patchId}/superseded`);
  return response.data;
}

/**
 * Get patches that supersede (replace) this patch
 */
async getSupersedingPatches(patchId: string): Promise<Patch[]> {
  const response = await api.get(`/patches/${patchId}/superseding`);
  return response.data;
}

/**
 * Mark a patch as superseded by the current patch
 * @param patchId - The current patch ID (the newer one)
 * @param targetId - The patch being superseded (the older one)
 */
async addSupersedence(patchId: string, targetId: string): Promise<void> {
  await api.post(`/patches/${patchId}/supersede/${targetId}`);
}

/**
 * Remove a supersedence relationship
 * @param patchId - The current patch ID
 * @param targetId - The patch to remove from supersedence
 */
async removeSupersedence(patchId: string, targetId: string): Promise<void> {
  await api.delete(`/patches/${patchId}/supersede/${targetId}`);
}
```

**Note:** Check if double-unwrap is needed (likely not, based on B.11 pattern).

### 4.2 Phase 2: Create Patch Search Component (Agent Task)

**Agent:** Implementation agent
**Duration:** 1-2 hours

**File:** `frontend/src/components/PatchSearchSelect.tsx` (NEW)

**Purpose:** Reusable patch search component with autocomplete/select functionality.

**Features:**
- Search patches by title, KB number, or ID
- Debounced search (500ms)
- Shows patch title + KB + severity in dropdown
- Returns selected patch object
- Used in multiple contexts (supersedence, related patches, etc.)

**API Usage:**
```typescript
// Use existing patches search endpoint
GET /v1/patches?search={query}&limit=20
```

**Props:**
```typescript
interface PatchSearchSelectProps {
  value?: string;           // Selected patch ID
  onChange: (patchId: string, patch: Patch) => void;
  placeholder?: string;
  excludeIds?: string[];    // Don't show these patches in results
  disabled?: boolean;
}
```

**Implementation Notes:**
- Use Ant Design `Select` with `showSearch` and `filterOption={false}`
- Use `usePatchesQuery` hook for data fetching (if exists) or create one
- Handle loading, empty states, and errors
- Minimum 2 characters to trigger search

### 4.3 Phase 3: Build Supersedence Management UI (Agent Task)

**Agent:** Implementation agent
**Duration:** 2-3 hours

**File:** `frontend/src/pages/patches/PatchDetails.tsx`

**Changes to existing supersedence section (lines 215-230):**

**Replace read-only tags with interactive UI:**

```tsx
{/* Supersedence Section */}
<Divider style={{ margin: '16px 0' }} />
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
  <Text strong>Supersedence</Text>
  <Button
    icon={<EditOutlined />}
    size="small"
    onClick={() => setSupersedenceModalOpen(true)}
  >
    Manage
  </Button>
</div>

{/* Superseded By Section */}
{patch.supersededBy && patch.supersededBy.length > 0 && (
  <div style={{ marginBottom: 16 }}>
    <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
      Replaced By
    </Text>
    <Space wrap>
      {patch.supersededBy.map((kb) => (
        <Tag
          key={kb}
          closable
          onClose={(e) => {
            e.preventDefault();
            handleRemoveSupersedence(kb, 'supersededBy');
          }}
        >
          {kb}
        </Tag>
      ))}
    </Space>
  </div>
)}

{/* Supersedes Section */}
<div style={{ marginBottom: 16 }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
    <Text type="secondary">Replaces</Text>
    <Button
      type="link"
      size="small"
      icon={<PlusOutlined />}
      onClick={() => setAddSupersedenceModalOpen(true)}
    >
      Add
    </Button>
  </div>
  <Space wrap>
    {patch.supersedes && patch.supersedes.length > 0 ? (
      patch.supersedes.map((kb) => (
        <Tag
          key={kb}
          closable
          onClose={(e) => {
            e.preventDefault();
            handleRemoveSupersedence(kb, 'supersedes');
          }}
        >
          {kb}
        </Tag>
      ))
    ) : (
      <Text type="secondary" italic>No patches superseded</Text>
    )}
  </Space>
</div>

{/* Add Supersedence Modal */}
<Modal
  title="Add Supersedence Relationship"
  open={addSupersedenceModalOpen}
  onCancel={() => {
    setAddSupersedenceModalOpen(false);
    setSelectedPatchId(null);
  }}
  onOk={handleAddSupersedence}
  okText="Add"
  okButtonProps={{ disabled: !selectedPatchId }}
>
  <p style={{ marginBottom: 16 }}>
    Select a patch that <strong>{patch.title}</strong> supersedes (replaces):
  </p>
  <PatchSearchSelect
    value={selectedPatchId}
    onChange={(patchId) => setSelectedPatchId(patchId)}
    excludeIds={[patch.id, ...(patch.supersedes || [])]}
    placeholder="Search by patch title or KB number..."
  />
</Modal>
```

**Add state and handlers:**

```typescript
const [addSupersedenceModalOpen, setAddSupersedenceModalOpen] = useState(false);
const [selectedPatchId, setSelectedPatchId] = useState<string | null>(null);

const handleAddSupersedence = async () => {
  if (!selectedPatchId) return;

  try {
    await patchService.addSupersedence(patch.id, selectedPatchId);
    message.success('Supersedence relationship added');
    setAddSupersedenceModalOpen(false);
    setSelectedPatchId(null);
    refetch(); // Refresh patch details
  } catch (error) {
    message.error('Failed to add supersedence relationship');
    console.error(error);
  }
};

const handleRemoveSupersedence = (targetKb: string, type: 'supersedes' | 'supersededBy') => {
  Modal.confirm({
    title: 'Remove Supersedence Relationship',
    content: `Are you sure you want to remove the supersedence relationship with ${targetKb}?`,
    okText: 'Remove',
    okType: 'danger',
    onOk: async () => {
      try {
        // Need to find patch ID from KB number
        // For now, assume KB === patch ID or fetch from API
        await patchService.removeSupersedence(patch.id, targetKb);
        message.success('Supersedence relationship removed');
        refetch();
      } catch (error) {
        message.error('Failed to remove supersedence relationship');
        console.error(error);
      }
    },
  });
};
```

**Important:**
- The `supersedes` and `supersededBy` arrays contain KB numbers (strings), not patch IDs
- Need to handle KB → patch ID mapping for API calls
- Option 1: Store patch IDs in arrays instead of KB (backend change)
- Option 2: Add a lookup service method to resolve KB → ID
- **Recommendation:** Check backend response format first

### 4.4 Phase 4: Handle KB vs ID Mapping (Investigation)

**Agent:** Discovery agent
**Duration:** 15-30 minutes

**Task:**
1. Check backend `/patches/:id/superseded` response format
2. Verify if `supersedes` array contains IDs or KB numbers
3. Check Prisma schema — is `supersedes` storing IDs or KB strings?
4. Determine if we need a KB→ID lookup service

**If KB lookup needed:**
```typescript
// Add to patch.service.ts
async getPatchByKbNumber(kb: string): Promise<Patch | null> {
  const response = await api.get('/patches', { params: { kbNumber: kb } });
  return response.data[0] || null;
}
```

### 4.5 Phase 5: Testing (Agent Task)

**Agent:** QA agent
**Duration:** 1-2 hours

**Test Plan:**

1. **Add Supersedence Relationship:**
   - Open patch details for Patch A
   - Click "+ Add" under "Replaces" section
   - Search for Patch B by title
   - Select and confirm
   - Verify new tag appears under "Replaces"
   - Verify Patch B shows Patch A under "Replaced By"

2. **Remove Supersedence Relationship:**
   - Click "×" on a supersedence tag
   - Confirm removal
   - Verify tag disappears
   - Verify relationship removed from related patch

3. **Search Functionality:**
   - Test search by patch title (partial match)
   - Test search by KB number
   - Test empty search results
   - Verify excluded patches don't appear

4. **Edge Cases:**
   - Try to add supersedence to self (should be blocked)
   - Try to add duplicate supersedence (should be blocked)
   - Test with patches that have no supersedence data
   - Test with patches that have many supersedence relationships

5. **Error Handling:**
   - Simulate API failure (network error)
   - Verify error messages display correctly
   - Verify UI doesn't break on error

6. **Regression Check:**
   - Verify existing read-only display still works
   - Verify patch details page loads correctly
   - Verify no TypeScript errors
   - Verify no console warnings

---

## 5. Implementation Steps

### Step 1: Backend API Investigation
**Duration:** 15-30 minutes
**Agent:** Discovery agent

- Verify API endpoints work
- Test response formats
- Check KB vs ID usage
- Document findings

### Step 2: Add Service Methods
**Duration:** 30 minutes
**Agent:** Implementation agent

- Add 4 methods to `patch.service.ts`
- Add KB lookup if needed
- Test with Postman/curl

### Step 3: Create Patch Search Component
**Duration:** 1-2 hours
**Agent:** Implementation agent

- Create `PatchSearchSelect.tsx`
- Implement debounced search
- Add loading/error states
- Test standalone

### Step 4: Update PatchDetails UI
**Duration:** 2-3 hours
**Agent:** Implementation agent

- Add interactive tags (closable)
- Add "+ Add" button
- Implement modals
- Add state management
- Wire up service calls
- Handle errors

### Step 5: QA Validation
**Duration:** 1-2 hours
**Agent:** QA agent

- Execute test plan
- Document issues
- Verify acceptance criteria

### Step 6: Commit & Update PRD
**Duration:** 10 minutes (Manual)

- Git commit with detailed message
- Update PRD-TRACK-B.md to mark B.7 complete
- Document what was changed

---

## 6. Acceptance Criteria

### Must-Have (P0)

- [ ] **AC1:** Service methods exist
  - `getSupersededPatches()`, `getSupersedingPatches()`, `addSupersedence()`, `removeSupersedence()` in `patch.service.ts`
  - All methods call correct backend endpoints
  - Error handling implemented

- [ ] **AC2:** Patch search component works
  - Debounced search with 500ms delay
  - Shows patch title + KB + severity
  - Excludes specified patch IDs
  - Returns selected patch

- [ ] **AC3:** Add supersedence works
  - "+ Add" button opens patch search
  - Selected patch added to "Replaces" list
  - API call succeeds
  - UI updates immediately
  - Success message displays

- [ ] **AC4:** Remove supersedence works
  - "×" button on tags triggers confirmation
  - Confirmed removal calls DELETE API
  - Tag disappears from UI
  - Related patch updates correctly

- [ ] **AC5:** No regressions
  - Existing read-only display preserved
  - TypeScript compilation succeeds
  - ESLint passes
  - No console errors on PatchDetails page

### Nice-to-Have (P1)

- [ ] **AC6:** Supersedence chain visualization
  - Show full chain (A → B → C)
  - Visual tree or list format
  - Collapsible for long chains

- [ ] **AC7:** Bulk supersedence management
  - Select multiple patches to mark as superseded
  - Batch API calls
  - Progress indicator

---

## 7. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| KB vs ID mismatch breaks API calls | Medium | High | Discovery phase validates data format first |
| Patch search performance with large datasets | Low | Medium | Add pagination, limit results to 20 |
| Circular supersedence relationships | Low | Medium | Backend validation should prevent; document if not |
| Double-unwrap issues in new service methods | Low | Low | Follow B.11 pattern, use axios instance |
| User adds supersedence to wrong patch | Medium | Low | Show patch details in confirmation modal |

---

## 8. Rollback Plan

If issues found after merge:

1. **Immediate:** Revert commits with `git revert {commit-hash}`
2. **Identify:** Check which part broke (service, UI, search)
3. **Fix:** Update plan and re-implement affected component
4. **Test:** More thorough QA before re-merging

**Partial Rollback:**
- If search is broken, hide "Add" buttons temporarily
- If deletion is broken, make tags read-only again
- Service methods can be left as-is (no UI impact if not called)

---

## 9. Success Metrics

**Quantitative:**
- Service methods added: 4 (target)
- API endpoints covered: 4/4 (100%)
- TypeScript errors introduced: 0
- Components created: 1-2 (PatchSearchSelect + inline UI)

**Qualitative:**
- Admin workflow: Clear and intuitive
- Error handling: User-friendly messages
- Code maintainability: Reusable search component
- Performance: Search responds < 500ms

---

## 10. Dependencies

**Depends On:**
- ✅ Backend supersedence endpoints (already exist)
- ⏳ Patch search endpoint (assuming `/v1/patches?search=...` exists)

**Blocks:**
- None (B.7 is independent)

**Related Work:**
- May benefit from B.5 (service layer double-unwrap fixes)
- Could enhance with B.12 (if patch management settings need supersedence)

---

## 11. Team Coordination

**Dev 1 (Track A):** No coordination needed — pure frontend work

**Dev 2 (Track B):** Owner of this task

**Timeline:**
- Backend investigation: 30 min
- Service methods: 30 min
- Patch search component: 1-2 hours
- PatchDetails UI: 2-3 hours
- QA: 1-2 hours
- Commit: 10 min
- **Total: 5-8 hours (~1 day)**

---

## 12. Execution Plan with Teammates

### Agent 1: Discovery Agent (Explore)
**Task:** Verify backend API endpoints and data format
**Duration:** 15-30 minutes
**Deliverable:**
- API endpoint verification report
- KB vs ID usage documentation
- Sample response payloads

### Agent 2: Implementation Agent (General-purpose)
**Task:**
1. Add service methods to `patch.service.ts`
2. Create `PatchSearchSelect` component
3. Update `PatchDetails.tsx` with interactive UI
**Duration:** 3-5 hours
**Deliverable:** Working supersedence management UI, ready for QA

### Agent 3: QA Agent (General-purpose)
**Task:** Validate implementation against acceptance criteria
**Duration:** 1-2 hours
**Deliverable:** QA report with PASS/FAIL status

---

## 13. File Structure

**New Files:**
```
frontend/src/
  components/
    PatchSearchSelect.tsx  (NEW)  - Reusable patch search component
```

**Modified Files:**
```
frontend/src/
  services/
    patch.service.ts        - Add 4 supersedence methods
  pages/patches/
    PatchDetails.tsx        - Add interactive supersedence UI (lines 215-230)
```

**Documentation:**
```
docs/sprint-1/
  PLAN-B7-SUPERSEDENCE-UI.md           (NEW) - This file
  IMPLEMENTATION-B7-SUMMARY.md         (NEW) - Implementation summary
  QA-REPORT-B7.md                      (NEW) - QA validation report
```

---

## 14. Key Design Decisions

### Decision 1: Inline UI vs Separate Modal

**Chosen:** Inline "+ Add" buttons and closable tags

**Why:**
- Fewer UI layers (no nested modals)
- Clearer action context
- Simpler state management
- Better UX for quick edits

**Alternative (rejected):**
```
"Manage Supersedence" button → Modal with full list → Edit actions
```
Too many clicks, adds complexity.

### Decision 2: PatchSearchSelect as Reusable Component

**Chosen:** Standalone `PatchSearchSelect.tsx` component

**Why:**
- Reusable across features (related patches, patch comparison, etc.)
- Encapsulates search logic and debouncing
- Easier to test independently
- Consistent UX across app

**Alternative (rejected):**
Inline Select component in PatchDetails — would duplicate code.

### Decision 3: Closable Tags vs Button List

**Chosen:** Ant Design closable `<Tag>` with "×" icon

**Why:**
- Familiar pattern (like email tags, chip inputs)
- Clear affordance (× means remove)
- Compact UI
- Native Ant Design support

**Alternative (rejected):**
List items with separate "Delete" buttons — takes more space.

### Decision 4: Confirmation on Delete

**Chosen:** Always show confirmation modal before removing

**Why:**
- Prevents accidental deletions
- Explains what will happen
- Standard UX pattern for destructive actions
- No undo functionality available

---

## 15. API Contract

### Endpoint Details

**1. GET /v1/patches/:id/superseded**
```typescript
Response: {
  success: true,
  data: Patch[]  // Array of patches this patch supersedes
}
```

**2. GET /v1/patches/:id/superseding**
```typescript
Response: {
  success: true,
  data: Patch[]  // Array of patches that supersede this patch
}
```

**3. POST /v1/patches/:id/supersede/:targetId**
```typescript
Request: No body needed (relationship defined in URL params)

Response: {
  success: true,
  data: {
    message: 'Supersedence relationship created'
  }
}
```

**4. DELETE /v1/patches/:id/supersede/:targetId**
```typescript
Request: No body needed

Response: {
  success: true,
  data: {
    message: 'Supersedence relationship removed'
  }
}
```

**5. GET /v1/patches (with search)**
```typescript
Query params: {
  search: string,
  limit: number
}

Response: {
  success: true,
  data: Patch[],
  meta: {
    total: number,
    page: number,
    limit: number
  }
}
```

---

## 16. Open Questions

**Q1:** Do `supersedes` and `supersededBy` arrays store patch IDs or KB numbers?
- **Impact:** Affects how we call DELETE endpoint
- **Owner:** Discovery Agent
- **Priority:** BLOCKING

**Q2:** Is there a `/patches?kbNumber=...` lookup endpoint?
- **Impact:** Needed if arrays store KB numbers
- **Owner:** Discovery Agent
- **Priority:** HIGH

**Q3:** Can backend prevent circular supersedence (A supersedes B, B supersedes A)?
- **Impact:** Frontend validation needed if not
- **Owner:** Dev 1 (or check existing backend code)
- **Priority:** MEDIUM

**Q4:** Should we show patch severity/status in search results?
- **Impact:** Helps users choose correct patch
- **Owner:** UX decision (Dev 2)
- **Priority:** LOW (nice-to-have)

---

## 17. Next Steps

1. ✅ Plan document created (this file)
2. ⏳ Spawn Discovery Agent → Verify API endpoints and data format
3. ⏳ Review findings → Resolve KB vs ID question
4. ⏳ Spawn Implementation Agent → Build service methods + UI
5. ⏳ Spawn QA Agent → Validate implementation
6. ⏳ Manual review → Final checks
7. ⏳ Commit & update PRD → Mark B.7 complete

---

**Plan Status:** ✅ READY FOR EXECUTION
**Estimated Completion:** 1 day (5-8 hours) from start
**Confidence Level:** Medium-High (depends on KB vs ID resolution, but UI patterns are proven)
