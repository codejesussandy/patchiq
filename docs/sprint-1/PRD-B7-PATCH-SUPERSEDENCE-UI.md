# PRD: B.7 — Patch Supersedence Management UI

> **Sprint 1 Track B** | **Priority:** Should Have (Week 3-4) | **Owner:** Dev 2
> **Status:** PENDING
> **Sprint 2 Prerequisite:** Complete patch lifecycle management required for AI recommendations
> **Dependencies:** None (backend CRUD exists)

---

## 1. Problem Statement

The backend has full CRUD operations for patch supersedence relationships at `/patches/:id/supersede/...` (routes exist in `patches.routes.ts`). However, the frontend only displays supersedence as **read-only tags** in `PatchDetails.tsx:215-226`. There is no UI to:
- Add a new supersedence relationship (marking one patch as superseding another)
- Remove an existing supersedence relationship
- Search for patches to create relationships

**What's broken:**
- Patch supersedence data can only be modified via direct API calls or database edits
- Users cannot maintain patch lifecycle relationships through the UI
- The "Replaced By" and "Replaces" tags on patch detail pages are decorative, not functional
- Admins cannot document that a new patch supersedes an old one

**Who is affected:** Platform admins managing patch catalogs and establishing patch upgrade paths.

**Cost of not solving:** Patch supersedence data becomes stale or inaccurate. Users cannot track which patches replace others, leading to confusion during patch selection and deployment. Sprint 2's AI recommendation engine cannot suggest "this patch is outdated, use X instead" without accurate supersedence data.

---

## 2. Goals

| # | Goal | Measure |
|---|------|------------|
| G1 | Create supersedence relationships via UI | Users can mark Patch A as superseding Patch B from the Patch Detail page |
| G2 | Remove supersedence relationships via UI | Users can delete relationships with confirmation |
| G3 | Search for patches when creating relationships | Autocomplete search shows patches by title, KB number, or patchId |
| G4 | Bidirectional relationships are maintained | When A supersedes B, both A's "Replaces" list and B's "Replaced By" list update |

---

## 3. Non-Goals

| # | Non-Goal | Why |
|---|----------|-----|
| N1 | Bulk supersedence operations | Single relationship management is sufficient for Sprint 1 |
| N2 | Supersedence conflict detection | Advanced validation (circular dependencies, etc.) is Sprint 2 scope |
| N3 | Supersedence timeline/history | Audit log of when relationships were created is Sprint 2 |
| N4 | Auto-suggest supersedence based on versions | AI-powered recommendations are Sprint 2 AI/MCP theme |

---

## 4. User Stories

- As a **patch admin**, I want to mark a new patch as superseding an older patch so that users know which patch to deploy instead.
- As a **patch admin**, I want to remove incorrect supersedence relationships so that the patch catalog remains accurate.
- As a **deployment engineer**, I want to see which patches have been superseded so that I avoid deploying outdated patches.
- As a **security analyst**, I want to find superseding patches when a CVE requires an update so that I can identify the correct patch to deploy.

---

## 5. Requirements

### Must-Have (P0)

#### R1: Add "Manage Supersedence" UI section to Patch Detail page

**Location:** `frontend/src/pages/patches/PatchDetails.tsx` (currently lines 215-226 show read-only tags)

**Current UI:**
```tsx
{/* Read-only display */}
<div>
  <strong>Replaced By:</strong>
  {patch.supersededBy.map(p => (
    <Tag color="red" key={p.id}>{p.title} ({p.kbNumber})</Tag>
  ))}
</div>
<div>
  <strong>Replaces:</strong>
  {patch.supersedes.map(p => (
    <Tag color="green" key={p.id}>{p.title} ({p.kbNumber})</Tag>
  ))}
</div>
```

**New UI:**
```tsx
<Card title="Supersedence Relationships" extra={<Button icon={<PlusOutlined />} onClick={openAddModal}>Add Relationship</Button>}>
  {/* Replaced By Section */}
  <div style={{ marginBottom: 16 }}>
    <Text strong>Replaced By:</Text> <Text type="secondary">(Newer patches that supersede this one)</Text>
    <Space wrap style={{ marginTop: 8 }}>
      {patch.supersededBy.map(p => (
        <Tag
          key={p.id}
          color="red"
          closable
          onClose={() => handleRemoveSupersededBy(p.id)}
        >
          {p.title} ({p.kbNumber})
        </Tag>
      ))}
      {patch.supersededBy.length === 0 && <Text type="secondary">None</Text>}
    </Space>
  </div>

  {/* Replaces Section */}
  <div>
    <Text strong>Replaces:</Text> <Text type="secondary">(Older patches that this one supersedes)</Text>
    <Space wrap style={{ marginTop: 8 }}>
      {patch.supersedes.map(p => (
        <Tag
          key={p.id}
          color="green"
          closable
          onClose={() => handleRemoveSupersedes(p.id)}
        >
          {p.title} ({p.kbNumber})
        </Tag>
      ))}
      {patch.supersedes.length === 0 && <Text type="secondary">None</Text>}
    </Space>
  </div>
</Card>
```

**Acceptance Criteria:**
- [x] Tags are closable (show X icon on hover)
- [x] "Add Relationship" button opens a modal
- [x] Empty states show "None" instead of blank space
- [x] Section is collapsible or uses a Card for visual separation

#### R2: Create "Add Supersedence" modal

**Component:** `frontend/src/components/patches/AddSupersedenceModal.tsx` (new)

**Modal UI:**
```
Title: Add Supersedence Relationship

[ Radio: This patch supersedes (replaces) another patch ]
[ Radio: This patch is superseded by (replaced by) another patch ]

Search for patch:
[AutoComplete: Type patch title, KB number, or ID...        ]
                                        [suggestions dropdown]

Selected: [Tag: Windows 10 Security Update (KB5005033) [x]]

                                     [Cancel] [Add Relationship]
```

**Acceptance Criteria:**
- [x] Radio buttons choose direction: "This supersedes X" or "X supersedes this"
- [x] AutoComplete search queries `/patches/search?q=...` (debounced 500ms)
- [x] Search results show title, KB number, patchId
- [x] Selected patch displays as a tag with remove option
- [x] "Add Relationship" button disabled until a patch is selected
- [x] Success → modal closes, detail page refetches, success message displays
- [x] Error → displays error message, modal stays open

#### R3: Add patch search endpoint service method

**File:** `frontend/src/services/patch.service.ts` (add new method)

```typescript
async searchPatches(query: string): Promise<Patch[]> {
  const response = await api.get('/patches/search', { params: { q: query, limit: 10 } });
  return response.data;
}
```

**Backend:** Verify `/patches/search` endpoint exists. If not, this becomes a Track A dependency (add to notes).

**Acceptance Criteria:**
- [x] Service method queries backend with search string
- [x] Returns array of Patch objects
- [x] Used by AutoComplete in modal

#### R4: Add supersedence service methods

**File:** `frontend/src/services/patch.service.ts` (add 4 new methods)

```typescript
// Get patches this patch supersedes (replaces)
async getSupersededPatches(patchId: string): Promise<Patch[]> {
  const response = await api.get(`/patches/${patchId}/supersedes`);
  return response.data;
}

// Get patches that supersede this patch (newer patches)
async getSupersedingPatches(patchId: string): Promise<Patch[]> {
  const response = await api.get(`/patches/${patchId}/superseded-by`);
  return response.data;
}

// Add supersedence relationship
async addSupersedence(
  patchId: string,
  targetPatchId: string,
  direction: 'supersedes' | 'superseded-by'
): Promise<void> {
  await api.post(`/patches/${patchId}/supersede/${direction}`, { targetPatchId });
}

// Remove supersedence relationship
async removeSupersedence(
  patchId: string,
  targetPatchId: string,
  direction: 'supersedes' | 'superseded-by'
): Promise<void> {
  await api.delete(`/patches/${patchId}/supersede/${direction}/${targetPatchId}`);
}
```

**Acceptance Criteria:**
- [x] 4 methods added to patch.service.ts
- [x] Methods match existing backend routes (verify in `patches.routes.ts`)
- [x] Used in PatchDetails handlers

#### R5: Implement add/remove handlers in PatchDetails

**Handlers:**

```typescript
const [isModalVisible, setIsModalVisible] = useState(false);

const handleAddSupersedence = async (targetPatchId: string, direction: 'supersedes' | 'superseded-by') => {
  try {
    await patchService.addSupersedence(patch.id, targetPatchId, direction);
    message.success('Supersedence relationship added');
    refetch(); // Refetch patch details
    setIsModalVisible(false);
  } catch (error) {
    message.error('Failed to add supersedence relationship');
  }
};

const handleRemoveSupersedes = async (targetPatchId: string) => {
  Modal.confirm({
    title: 'Remove Supersedence',
    content: 'Are you sure you want to remove this relationship?',
    onOk: async () => {
      try {
        await patchService.removeSupersedence(patch.id, targetPatchId, 'supersedes');
        message.success('Relationship removed');
        refetch();
      } catch (error) {
        message.error('Failed to remove relationship');
      }
    },
  });
};

const handleRemoveSupersededBy = async (targetPatchId: string) => {
  Modal.confirm({
    title: 'Remove Supersedence',
    content: 'Are you sure you want to remove this relationship?',
    onOk: async () => {
      try {
        await patchService.removeSupersedence(patch.id, targetPatchId, 'superseded-by');
        message.success('Relationship removed');
        refetch();
      } catch (error) {
        message.error('Failed to remove relationship');
      }
    },
  });
};
```

**Acceptance Criteria:**
- [x] Add handler accepts direction and creates relationship
- [x] Remove handlers show confirmation modal before deleting
- [x] Success → refetch patch details, display success message
- [x] Error → display error message

#### R6: Verify backend routes exist

**Check `backend/src/modules/patches/patches.routes.ts`:**

Expected routes:
- `GET /patches/search` — search patches by query
- `GET /patches/:id/supersedes` — get patches this patch replaces
- `GET /patches/:id/superseded-by` — get patches that replace this one
- `POST /patches/:id/supersede/supersedes` — add "this supersedes target"
- `POST /patches/:id/supersede/superseded-by` — add "target supersedes this"
- `DELETE /patches/:id/supersede/supersedes/:targetId` — remove relationship
- `DELETE /patches/:id/supersede/superseded-by/:targetId` — remove relationship

**Acceptance Criteria:**
- [x] Verify all routes exist in backend
- [x] If any are missing, document as Track A dependency (likely they exist based on ROADMAP)

---

### Nice-to-Have (P1)

#### R7: Display supersedence chain visualization

- [ ] Show supersedence as a tree or timeline (Patch A → Patch B → Patch C)
- [ ] Helps users understand multi-level supersedence chains

#### R8: Prevent circular supersedence

- [ ] Frontend validates that Patch A cannot supersede itself
- [ ] Frontend validates against obvious cycles (A supersedes B, B supersedes A)
- [ ] Backend likely already prevents this, but frontend can provide immediate feedback

---

## 6. Success Metrics

| Metric | Target | Measure |
|--------|--------|---------|
| Supersedence management adoption | >50% of patches have relationships | Track patch.supersedes / patch.supersededBy count |
| UI usability | <5 clicks to add relationship | Add modal, search, select, confirm |
| Error rate | <5% failed operations | Backend 400/500 responses for supersedence endpoints |
| User feedback | Positive | Admins report easier patch lifecycle management |

---

## 7. Test Plan

### Manual Smoke Tests

```
Test: Add "this patch supersedes another" relationship
  Given: User is viewing Patch A detail page
  When: User clicks "Add Relationship"
  And: Selects radio "This patch supersedes (replaces) another"
  And: Searches for "Patch B" in autocomplete
  And: Selects Patch B from results
  And: Clicks "Add Relationship"
  Then: Modal closes
  And: Patch A's "Replaces" section shows Patch B (green tag)
  And: Success message appears
  When: User navigates to Patch B detail page
  Then: Patch B's "Replaced By" section shows Patch A (red tag)

Test: Add "another patch supersedes this" relationship
  Given: User is viewing Patch A detail page
  When: User clicks "Add Relationship"
  And: Selects radio "This patch is superseded by (replaced by) another"
  And: Searches for "Patch C"
  And: Selects Patch C
  And: Clicks "Add Relationship"
  Then: Patch A's "Replaced By" section shows Patch C (red tag)

Test: Remove supersedence relationship with confirmation
  Given: Patch A supersedes Patch B (relationship exists)
  When: User views Patch A detail
  And: Hovers over Patch B tag in "Replaces" section
  And: Clicks the X icon
  Then: Confirmation modal appears: "Remove Supersedence?"
  When: User clicks "OK"
  Then: Tag disappears from "Replaces" section
  And: Success message appears
  When: User navigates to Patch B detail
  Then: Patch A no longer appears in "Replaced By" section

Test: Cancel remove supersedence
  Given: Patch A supersedes Patch B
  When: User clicks X on Patch B tag
  And: Clicks "Cancel" in confirmation modal
  Then: Modal closes
  And: Tag remains in "Replaces" section

Test: Search patch autocomplete
  Given: User opens "Add Relationship" modal
  When: User types "Windows" in search field
  Then: Autocomplete shows patches matching "Windows" (title, KB, ID)
  And: Results display within 500ms of typing
  When: User types "KB5005"
  Then: Results filter to patches with KB numbers matching "5005"

Test: Error handling for failed API calls
  Given: Backend is unavailable
  When: User attempts to add a relationship
  Then: Error message appears: "Failed to add supersedence relationship"
  And: Modal remains open (user can retry)
```

---

## 8. Implementation Notes

### Component Structure

```
frontend/src/
├── pages/patches/
│   └── PatchDetails.tsx (modify — add management UI, handlers)
├── components/patches/
│   └── AddSupersedenceModal.tsx (new — modal component)
└── services/
    └── patch.service.ts (modify — add 5 new methods)
```

### AutoComplete Search Implementation

Use Ant Design's `AutoComplete` component with debounced search:

```tsx
import { AutoComplete } from 'antd';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';

const [searchQuery, setSearchQuery] = useState('');
const debouncedQuery = useDebouncedSearch(searchQuery, 500);

const { data: searchResults, isLoading } = useQuery(
  ['patches', 'search', debouncedQuery],
  () => patchService.searchPatches(debouncedQuery),
  { enabled: debouncedQuery.length > 2 }
);

<AutoComplete
  value={searchQuery}
  onChange={setSearchQuery}
  options={searchResults?.map(p => ({
    value: p.id,
    label: `${p.title} (${p.kbNumber}) - ${p.patchId}`,
  }))}
  placeholder="Type patch title, KB number, or ID..."
  loading={isLoading}
  onSelect={handleSelectPatch}
/>
```

### Backend Route Verification

Verify these routes exist in `backend/src/modules/patches/patches.routes.ts`:

```typescript
router.get('/patches/search', authenticate, patchesController.searchPatches);
router.get('/patches/:id/supersedes', authenticate, patchesController.getSupersedes);
router.get('/patches/:id/superseded-by', authenticate, patchesController.getSupersededBy);
router.post('/patches/:id/supersede/:direction', authenticate, patchesController.addSupersedence);
router.delete('/patches/:id/supersede/:direction/:targetId', authenticate, patchesController.removeSupersedence);
```

If any are missing, coordinate with Track A (Dev 1) to add them.

### Estimated Effort

8-12 hours
- 2 hours: Service methods (patch.service.ts — 5 methods)
- 3 hours: AddSupersedenceModal component with autocomplete
- 2 hours: Update PatchDetails with new UI (tags, handlers, confirmation)
- 1 hour: Verify backend routes exist, test API calls
- 2 hours: Manual testing across add/remove flows
- 1 hour: Handle edge cases (empty states, errors, duplicate relationships)

---

## 9. Open Questions

**Q1:** What if backend routes for supersedence don't exist?
- **Answer:** Check backend during implementation. If missing, this becomes blocked by a new Track A item. Coordinate with Dev 1.

**Q2:** Should we show supersedence chains (A → B → C) visually?
- **Answer:** Nice-to-have (P1). Start with simple list display. Chain visualization is Sprint 2 enhancement.

**Q3:** Can a patch supersede multiple patches? Can it be superseded by multiple patches?
- **Answer:** Yes (based on schema: `supersedes: Patch[]`, `supersededBy: Patch[]`). UI should handle multiple relationships.

**Q4:** Should we validate against circular supersedence in the frontend?
- **Answer:** Backend likely validates this. Frontend can add basic checks (cannot supersede itself) but comprehensive cycle detection is Sprint 2.

---

## 10. Dependencies

**Blocks:**
- Sprint 2 AI recommendations (AI needs accurate supersedence data to suggest patch upgrades)

**Blocked by:**
- None (backend routes likely exist based on ROADMAP mention of "Backend has full CRUD")
- If backend routes are missing, becomes blocked by a new Track A item

---

## 11. Definition of Done

- [x] `AddSupersedenceModal.tsx` component created with autocomplete search
- [x] `PatchDetails.tsx` updated with closable tags and "Add Relationship" button
- [x] `patch.service.ts` has 5 new methods (search, get supersedes, get superseded-by, add, remove)
- [x] Add handler creates relationship and refetches patch details
- [x] Remove handler shows confirmation modal before deleting
- [x] Manual tests pass (add/remove in both directions, bidirectional updates work)
- [x] Backend routes verified to exist (or documented as Track A dependency)
- [x] `npm run check-types` passes
- [x] `npm run lint` passes
- [x] Git commit: "feat(patches): add supersedence relationship management UI"
- [x] PR merged to `sprint-1/track-b` branch
