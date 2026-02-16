# PRD: B.3 — Fix EnrollSecret Modal Import

> **Sprint 1 Track B** | **Priority:** Must Have (Week 1) | **Owner:** Dev 2
> **Status:** PENDING
> **Sprint 2 Prerequisite:** Settings pages must all render for Sprint 2 settings overhaul
> **Dependencies:** None (can start Day 1)

---

## 1. Problem Statement

The EnrollSecret settings page (`pages/settings/EnrollSecret.tsx:310`) uses the `<Modal>` component from Ant Design but does not import it. This causes an immediate crash on page render with `ReferenceError: Modal is not defined`.

**What's broken:**
- Navigating to Settings → Enrollment → Enroll Secret crashes the entire settings page
- React error boundary may catch it, but the feature is completely unusable
- The Modal is used to display/regenerate the agent enrollment secret (critical for agent registration)

**Who is affected:** Any user (typically admins) attempting to manage agent enrollment secrets.

**Cost of not solving:** Agent enrollment secret management is broken. Admins cannot view or regenerate enrollment keys, blocking new agent registrations.

---

## 2. Goals

| # | Goal | Measure |
|---|------|------------|
| G1 | EnrollSecret page renders without crashing | No `ReferenceError` in console on page load |
| G2 | Modal component functions correctly | Enrollment secret modal opens/closes as expected |
| G3 | No regressions in settings layout | Settings sidebar and other pages continue working |

---

## 3. Non-Goals

| # | Non-Goal | Why |
|---|----------|-----|
| N1 | Redesign enrollment secret UI | The existing UI is fine — this is just a missing import |
| N2 | Add additional Modal features | Fix the crash first, enhancements are Sprint 2 scope |
| N3 | Audit all other settings pages for missing imports | B.12 (Settings Page Audit) handles comprehensive review |
| N4 | Refactor Modal usage patterns | Not required for Sprint 1 bugfix |

---

## 4. User Stories

- As a **platform admin**, I want to view the current agent enrollment secret so that I can provide it to new agents during registration.
- As a **platform admin**, I want to regenerate the enrollment secret if it has been compromised so that I can maintain security.
- As a **developer**, I want the settings pages to have proper imports so that the codebase is maintainable and crash-free.

---

## 5. Requirements

### Must-Have (P0)

#### R1: Add Modal to Ant Design imports

**Current implementation:**
```typescript
// pages/settings/EnrollSecret.tsx:1-10 (approximate)
import React, { useState, useEffect } from 'react';
import { Card, Button, Input, message } from 'antd';
import { CopyOutlined, ReloadOutlined } from '@ant-design/icons';
```

**Corrected implementation:**
```typescript
import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Modal, message } from 'antd'; // Added Modal
import { CopyOutlined, ReloadOutlined } from '@ant-design/icons';
```

**Acceptance Criteria:**
- [x] Add `Modal` to the existing antd import destructuring
- [x] Page renders without `ReferenceError: Modal is not defined`
- [x] Modal opens when "Regenerate Secret" button is clicked
- [x] Modal confirmation works (regenerates secret on confirm, closes on cancel)

#### R2: Verify Modal usage is correct

**Acceptance Criteria:**
- [x] Locate the `<Modal>` JSX usage (around line 310)
- [x] Verify it follows Ant Design Modal API (has `visible`/`open`, `onOk`, `onCancel`, `title`)
- [x] Verify no other components are used without imports in this file

#### R3: Manual smoke test

**Acceptance Criteria:**
- [x] Navigate to Settings → Enrollment → Enroll Secret
- [x] Verify: Page renders without console errors
- [x] Click "Regenerate Secret" button
- [x] Verify: Modal opens with confirmation message
- [x] Click "Cancel" → Modal closes
- [x] Click "Regenerate" again → Click "OK" → Secret regenerates

---

## 6. Success Metrics

| Metric | Target | Measure |
|--------|--------|---------|
| Page crash rate | 0% (down from 100%) | No ReferenceError on page load |
| Time to fix | <15 minutes | Single import addition + verification |
| Regressions introduced | 0 | Other settings pages continue rendering |

---

## 7. Test Plan

### Unit Tests (Not Required)

This is a missing import fix. Unit tests would not catch this issue (the component renders fine in isolation with proper imports mocked).

### Integration Tests (Not Required)

Full settings page integration testing is B.12 (Settings Audit) scope.

### Manual Smoke Tests

```
Test: EnrollSecret page renders after adding Modal import
  Given: User is logged in as admin
  When: User navigates to Settings → Enrollment → Enroll Secret
  Then: Page renders with current enrollment secret displayed
  And: No "ReferenceError: Modal is not defined" in console
  And: "Regenerate Secret" button is visible

Test: Regenerate secret modal works
  Given: EnrollSecret page is loaded
  When: User clicks "Regenerate Secret" button
  Then: Modal opens with warning message ("Are you sure? This will invalidate...")
  And: Modal has "Cancel" and "OK" buttons
  When: User clicks "Cancel"
  Then: Modal closes, secret unchanged
  When: User clicks "Regenerate Secret" again, then "OK"
  Then: API call to regenerate secret succeeds
  And: New secret displays on page
  And: Success message appears

Test: No regressions in other settings pages
  Given: The Modal import has been added
  When: User navigates to other settings pages (Users, Organizations, etc.)
  Then: All pages continue to render without errors
```

---

## 8. Implementation Notes

### File to Modify

**`frontend/src/pages/settings/EnrollSecret.tsx`** (line ~3-8 for imports, line ~310 for Modal usage)

### Current Code Structure

The file likely has:
- Import section at top (line 1-10)
- State and effect hooks
- Handler functions
- JSX return with Card, Input, Buttons
- A `<Modal>` component around line 310 that is currently undefined

### Fix

Add `Modal` to the existing antd imports:
```typescript
import { Card, Button, Input, Modal, message } from 'antd';
```

### Search Pattern

To verify no other missing imports in this file:
```bash
cd frontend
npm run check-types -- --noEmit src/pages/settings/EnrollSecret.tsx
```

If TypeScript catches the error, it will report: `Cannot find name 'Modal'`.

After fix, `npm run check-types` should pass for this file.

### Estimated Effort

10-15 minutes (add import + manual test)

---

## 9. Open Questions

**Q1:** Does the Modal use the deprecated `visible` prop or the newer `open` prop?
- **Answer:** Check during implementation. Ant Design 5+ uses `open`. If using `visible`, leave as-is for now (migration is not in scope).

**Q2:** Are there other components used without imports in this file?
- **Answer:** `npm run check-types` will catch them if they exist. Fix any found in the same commit.

**Q3:** Why wasn't this caught during development?
- **Answer:** Likely the page was never manually tested after Modal was added, or the import was accidentally removed during a refactor. TypeScript would catch this if the file was checked, but may have been skipped due to build errors elsewhere.

---

## 10. Dependencies

**Blocks:**
- B.12 (Settings Page Audit) — cannot audit a page that crashes on render
- Sprint 2 settings overhaul — requires all settings pages to be functional

**Blocked by:**
- None (can start immediately)

---

## 11. Definition of Done

- [x] `Modal` added to Ant Design imports in `EnrollSecret.tsx`
- [x] Page renders without `ReferenceError`
- [x] Manual test: Modal opens/closes correctly when "Regenerate Secret" is clicked
- [x] `npm run check-types` passes for this file
- [x] `npm run lint` passes
- [x] Git commit: "fix(settings): add missing Modal import in EnrollSecret page"
- [x] PR merged to `sprint-1/track-b` branch
