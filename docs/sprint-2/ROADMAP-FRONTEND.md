# Sprint 2: Frontend Track Roadmap

> **Goal:** Transform PatchIQ frontend from functional-but-flawed to production-grade enterprise application
> **Format:** Now / Next / Later with MoSCoW prioritization
> **Duration:** 4-6 weeks (Feb 14 - Mar 28, 2026)
> **Owner:** Dev 2 (Frontend)
> **Last Updated:** 2026-02-13

---

## Executive Summary

**Current State:**
- ✅ Sprint 1 Complete: All basic features functional, data flows working
- ✅ Pipeline 1 Complete: Backend patch-CVE correlation APIs ready
- ❌ Critical Issues: XSS vulnerability, no code splitting, 1,084-line MainLayout
- ❌ Missing UX: No vulnerability → asset views, no bulk operations, poor accessibility

**Sprint 2 Focus:**
Fix security vulnerabilities, optimize performance, complete correlation UX, establish component patterns for long-term maintainability.

**Exit Criteria:**
- Security scan passes (0 high/critical vulnerabilities)
- Initial bundle <150KB (70% reduction from current)
- WCAG 2.1 AA compliance (axe-core 0 violations)
- Bulk operations functional (accept/deploy 10+ recommendations)
- All correlation views implemented (vulnerability detail, patch supersedence, risk scoring)

---

## Phase Overview

| Phase | Duration | Focus | Status |
|-------|----------|-------|--------|
| **Phase 1: Security & Foundations** | Weeks 1-2 | Fix XSS, code splitting, refactor MainLayout | `COMPLETE` |
| **Phase 2: Core UX & Accessibility** | Weeks 3-4 | Correlation views, accessibility fixes | `COMPLETE` |
| **Phase 3: Bulk Operations & Polish** | Weeks 5-6 | Bulk actions, component patterns, mobile | `COMPLETE` |

---

## Phase 1: Security & Foundations (Weeks 1-2, Feb 14-28)

**Goal:** Eliminate security vulnerabilities, establish performance baseline, reduce technical debt.

### Now — Must Have (Week 1)

| # | Item | Why | Files | Priority | Status |
|---|------|-----|-------|----------|--------|
| **F.1** | **Fix XSS vulnerability in AI chat** | Security audit blocker. `dangerouslySetInnerHTML` without sanitization allows arbitrary JS execution. | `AIChatPanel.tsx:157` | `CRITICAL` | `COMPLETE` |
| **F.2** | **Add error boundaries** | Full-page crashes on API errors. No graceful degradation. | `App.tsx`, new `ErrorBoundary.tsx` | `HIGH` | `COMPLETE` |
| **F.3** | **Implement lazy loading for all routes** | 500KB+ initial bundle causes 5-7s load time. All 50+ routes loaded upfront. | `App.tsx:89-710` | `HIGH` | `COMPLETE` |

#### F.1 — Fix XSS Vulnerability

**Current Code (VULNERABLE):**
```tsx
// AIChatPanel.tsx:157
<div dangerouslySetInnerHTML={{ __html: message.content }} />
```

**Fix Options:**
1. **react-markdown** (recommended): Parses markdown, sanitizes HTML automatically
   ```tsx
   import ReactMarkdown from 'react-markdown';
   <ReactMarkdown>{message.content}</ReactMarkdown>
   ```
2. **DOMPurify**: Sanitizes HTML but allows more formatting
   ```tsx
   import DOMPurify from 'dompurify';
   <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(message.content) }} />
   ```

**Acceptance Criteria:**
- [ ] `dangerouslySetInnerHTML` removed from codebase (grep confirms 0 instances)
- [ ] OWASP ZAP scan shows 0 XSS vulnerabilities
- [ ] npm audit shows 0 high/critical vulnerabilities
- [ ] AI chat renders formatted text (bold, lists, code blocks) safely

**Estimated Time:** 2 days (1 day implementation, 1 day testing + security scan)

---

#### F.2 — Add Error Boundaries

**Current Issue:**
- Any unhandled exception in render crashes entire app (white screen)
- No fallback UI or error recovery
- User loses all context, must refresh

**Solution:**
Create error boundary wrapper at route + layout levels:

```tsx
// components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  componentDidCatch(error, info) {
    logErrorToService(error, info); // Sentry, LogRocket, etc.
  }
  render() {
    if (this.state.hasError) {
      return <ErrorFallback onReset={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}

// App.tsx
<ErrorBoundary>
  <Routes>
    <Route path="/dashboard" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
    {/* Wrap each route */}
  </Routes>
</ErrorBoundary>
```

**Acceptance Criteria:**
- [ ] Deliberate error (`throw new Error()` in component) shows fallback UI
- [ ] Rest of app remains functional (can navigate to other pages)
- [ ] Error logged with stack trace, component info, user context
- [ ] "Go to Dashboard" button in fallback resets error state

**Estimated Time:** 1 day

---

#### F.3 — Implement Lazy Loading

**Current Issue:**
```tsx
// App.tsx (lines 1-50)
import Dashboard from './pages/Dashboard';
import AllAssets from './pages/assets/AllAssets';
// ... 50+ static imports
```
**Result:** All components bundled into single 500KB chunk, downloaded on first load.

**Solution:**
```tsx
// App.tsx
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AllAssets = lazy(() => import('./pages/assets/AllAssets'));
// ... lazy imports for all routes

<Suspense fallback={<PageLoader />}>
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
    {/* ... */}
  </Routes>
</Suspense>
```

**Route Grouping Strategy:**
- **Critical (preload on auth):** Dashboard, Assets, Patches, Vulnerabilities (80% of usage)
- **Lazy (load on demand):** Settings, Reports, Discovery (20% of usage)

**Acceptance Criteria:**
- [ ] Lighthouse audit: Initial bundle <150KB gzipped
- [ ] Network tab: 5-10 smaller chunks (20-50KB each) instead of 1 large bundle
- [ ] First Contentful Paint <1.5s on 4G connection
- [ ] Time to Interactive <2.5s on 4G connection
- [ ] Route changes load in <200ms (chunks cached after first visit)

**Estimated Time:** 2 days (1 day conversion, 1 day testing + optimization)

---

### Next — Must Have (Week 2)

| # | Item | Why | Files | Priority | Status |
|---|------|-----|-------|----------|--------|
| **F.4** | **Refactor MainLayout (1,084 lines)** | Unmaintainable. Every state change re-renders entire layout. | `MainLayout.tsx` → 5 components | `HIGH` | `COMPLETE` |
| **F.5** | **Add server-side pagination to asset list** | Loads 1,000+ assets at once. Freezes UI for 2-3 seconds. | `useAssets.ts`, `AllAssets.tsx` | `HIGH` | `COMPLETE` |

#### F.4 — Refactor MainLayout

**Current Structure (PROBLEM):**
- 1,084 lines in single file
- 11 useState hooks (every change triggers full re-render)
- Mixed concerns: navigation, categories, profile, chat, organization switching

**Target Structure:**
```
MainLayout.tsx (200 lines) — Composition only
├── LayoutContext.tsx (120 lines) — Shared state provider
├── NavigationSidebar.tsx (250 lines) — Menu + routing
├── ProfileMenu.tsx (100 lines) — User dropdown + logout
├── CategoryPanel.tsx (150 lines) — Category/subcategory management
├── OrganizationSwitcher.tsx (80 lines) — Org dropdown
└── AIChatToggle.tsx (50 lines) — Chat panel trigger
```

**Refactoring Steps:**
1. **Day 1**: Extract OrganizationSwitcher (simplest, no dependencies)
2. **Day 2**: Create LayoutContext, move shared state (sidebar open, selected category, org)
3. **Day 3**: Extract NavigationSidebar, ProfileMenu, CategoryPanel (depend on context)
4. **Day 4**: Update MainLayout to compose components, test render performance

**Performance Gains:**
- Profile changes: No longer re-render sidebar (isolated component)
- Category changes: No longer re-render profile (separate context)
- Sidebar toggle: Only re-render LayoutContext consumers (not entire tree)

**Acceptance Criteria:**
- [ ] MainLayout reduced from 1,084 to <200 lines
- [ ] Each sub-component <250 lines
- [ ] React DevTools Profiler: MainLayout re-render <50ms (was 120ms)
- [ ] All existing functionality works (navigation, categories, profile, chat)
- [ ] No visual regressions (screenshot diff test)

**Estimated Time:** 3 days

---

#### F.5 — Add Server-Side Pagination

**Current Issue:**
```tsx
// useAssets.ts (line 28)
const { data: assets } = useQuery(['assets'], () => assetService.listAssets({ limit: 1000 }));
```
**Result:** Loads all 1,000 assets in single request. 2-3s freeze, poor UX.

**Solution:**
```tsx
// useAssets.ts
const { data, isLoading } = useQuery(
  ['assets', page, pageSize],
  () => assetService.listAssets({ page, limit: pageSize }),
  { keepPreviousData: true } // Show stale data while loading next page
);

// AllAssets.tsx
<DataTable
  data={assets.items}
  total={assets.total}
  pagination={{
    current: page,
    pageSize: 50,
    onChange: (newPage) => setPage(newPage),
  }}
/>
```

**Acceptance Criteria:**
- [ ] Asset list loads 50 items in <500ms (was 1,000 items in 2-3s)
- [ ] Pagination controls show current page, total pages, total count
- [ ] URL params persist page selection (e.g., `/assets?page=2`)
- [ ] "Keep previous data" shows last page while loading next (no blank table flash)
- [ ] Search/filter resets to page 1
- [ ] Export function fetches all records (not just current page)

**Estimated Time:** 2 days

---

### Phase 1 Exit Criteria

Before starting Phase 2, verify:
- [x] Security scan passes (0 XSS vulnerabilities)
- [x] Lighthouse Performance score ≥85 (desktop)
- [x] Initial bundle <150KB gzipped
- [x] MainLayout <400 lines total (including sub-components)
- [x] Asset list loads in <500ms per page
- [x] All existing pages functional (no regressions)

---

## Phase 2: Core UX & Accessibility (Weeks 3-4, Mar 1-14)

**Goal:** Deliver missing correlation views, achieve WCAG 2.1 AA compliance, improve workflows.

### Now — Must Have (Week 3)

| # | Item | Why | Files | Priority | Status |
|---|------|-----|-------|----------|--------|
| **F.6** | **Vulnerability detail page with affected assets** | Security analysts need "Given CVE-2024-1234, show me all affected systems" view. Currently requires clicking through 20+ asset pages. | New `VulnerabilityDetail.tsx` | `HIGH` | `COMPLETE` |
| **F.7** | **Patch detail enhancement — show vulnerabilities** | Admins need "This patch fixes 8 CVEs" to justify deployment. Currently no visibility into CVE → Patch mapping. | `PatchDetails.tsx` (add/enhance tab) | `HIGH` | `COMPLETE` |
| **F.8** | **Patch supersedence display** | Users deploy outdated patches because supersedence not shown. Backend has data, frontend doesn't display it. | `PatchDetails.tsx`, `recommendationColumns.tsx` | `HIGH` | `COMPLETE` |

#### F.6 — Vulnerability Detail Page

**New Route:** `/vulnerabilities/:cveId`

**UI Sections:**
1. **CVE Header**:
   - Title, CVE ID, CVSS score, severity badge
   - EPSS probability, KEV status (if applicable)
   - Description (from NVD)
   - Published date, last modified

2. **Affected Assets Table**:
   - Columns: Asset Name, Version, OS, Patch Available, Status, Last Scanned
   - Default filter: "Show only unpatched" (checkbox, ON by default)
   - Sort by: Asset criticality (high → low)
   - Actions: "View Asset" → asset detail, "View Patch" → patch detail

3. **Available Patches Section**:
   - List of patches that fix this CVE
   - Columns: Patch ID, Title, Supersedence Status, Deployment Status
   - Action: "Deploy to all affected assets" button

**Acceptance Criteria:**
- [ ] Clicking CVE-2024-1234 from any table navigates to `/vulnerabilities/CVE-2024-1234`
- [ ] Shows 15 affected assets, filter reduces to 12 unpatched
- [ ] "View Patch" button links to patch detail page
- [ ] "Deploy to all" button opens bulk deploy modal with pre-selected assets
- [ ] Page loads in <1s (data from backend Pipeline 1 API)

**Backend Dependency:**
- Verify endpoint exists: `GET /vulnerabilities/:cveId/affected-assets`
- If not, coordinate with backend dev to add (or use existing `/assets?cveId=...` filter)

**Estimated Time:** 2 days

---

#### F.7 — Patch Detail Enhancement

**Current State:** PatchDetails.tsx has tabs, but "Vulnerabilities" tab either missing or empty.

**Enhancement:**
1. **Add/Enhance "Vulnerabilities" Tab**:
   - Table: CVE ID, Title, Severity, CVSS Score, Exploit Status
   - Link each CVE ID to vulnerability detail page (F.6)
   - Show count badge in tab: "Vulnerabilities (8)"

2. **Summary Section** (at top of page):
   - "This patch fixes 8 vulnerabilities: 2 Critical, 3 High, 3 Medium"
   - Risk score indicator: "Highest CVSS: 9.8 (Critical)"

**Acceptance Criteria:**
- [ ] Patch detail page shows "Vulnerabilities (8)" tab
- [ ] Table lists all CVEs this patch addresses
- [ ] Clicking CVE-2024-1234 navigates to vulnerability detail page
- [ ] Summary shows count breakdown by severity
- [ ] Export button downloads CSV of vulnerabilities

**Backend Dependency:**
- Verify: `GET /patches/:id/vulnerabilities` endpoint exists (likely from Pipeline 1)

**Estimated Time:** 1 day

---

#### F.8 — Patch Supersedence Display

**Current Gap:** Backend has supersedence relationships, frontend doesn't show them.

**Implementation:**

1. **Patch Detail Page**:
   - Add "Supersedence" section (below summary, above tabs)
   - Show: "This patch supersedes: KB5034440, KB5034439" (links to those patches)
   - Show: "This patch is superseded by: KB5034442" (warning badge if newer exists)
   - Icon: ⚠️ "Newer version available — deploy KB5034442 instead"

2. **Recommendations List**:
   - Add column: "Supersedence Status"
   - Values: "Latest" (green badge), "Superseded" (gray badge with strikethrough)
   - Filter: "Hide superseded patches" (checkbox, ON by default)

3. **Deployment Warning**:
   - When deploying superseded patch, show warning modal:
     ```
     ⚠️ Warning: Outdated Patch
     KB5034440 is superseded by KB5034442 (released Feb 10, 2026).
     Deploying outdated patches may leave vulnerabilities unpatched.

     [Deploy Anyway] [Switch to KB5034442]
     ```

**Acceptance Criteria:**
- [ ] Patch detail shows "Supersedes: 3 patches" with links
- [ ] Viewing superseded patch shows warning badge "Superseded by KB999"
- [ ] Recommendations list filters out superseded patches by default
- [ ] Deploying superseded patch triggers warning modal
- [ ] "Switch to latest" button updates deployment to newest patch

**Backend Dependency:**
- Verify: `GET /patches/:id` response includes `supersedes[]` and `supersededBy[]`

**Estimated Time:** 2 days

---

### Next — Must Have (Week 4)

| # | Item | Why | Files | Priority | Status |
|---|------|-----|-------|----------|--------|
| **F.9** | **Risk score explanation tooltip** | Admins don't understand why recommendation has risk score 8.2. Need transparency in scoring. | `recommendationColumns.tsx`, new tooltip component | `MEDIUM` | `COMPLETE` |
| **F.10** | **Accessibility: ARIA labels** | Violates WCAG 2.1 AA. Screen readers can't describe icon buttons. | All components with icon buttons (30+ files) | `HIGH` | `COMPLETE` |
| **F.11** | **Accessibility: Severity indicators** | Color-only information violates WCAG 2.1 AA. Colorblind users can't distinguish critical vs low. | New `SeverityIndicator.tsx`, 8+ consuming components | `HIGH` | `COMPLETE` |
| **F.12** | **Accessibility: Keyboard navigation** | Can't complete workflows without mouse. Violates WCAG 2.1 AA. | All interactive elements, modals, menus | `HIGH` | `COMPLETE` |

#### F.9 — Risk Score Explanation Tooltip

**Current State:** Risk score shown as number (e.g., 8.2) with no explanation.

**Enhancement:**
```tsx
// recommendationColumns.tsx
{
  title: 'Risk Score',
  dataIndex: 'riskScore',
  render: (score, record) => (
    <Tooltip
      title={<RiskScoreBreakdown data={record} />}
      trigger="hover"
    >
      <span style={{ cursor: 'help' }}>
        {score.toFixed(1)} <InfoCircleOutlined />
      </span>
    </Tooltip>
  ),
}

// RiskScoreBreakdown.tsx
const RiskScoreBreakdown = ({ data }) => (
  <div style={{ minWidth: 280 }}>
    <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
      Risk Score: {data.riskScore.toFixed(1)}/10
    </div>
    <Divider style={{ margin: '8px 0' }} />
    <div style={{ fontSize: 12 }}>
      <Row>
        <Col span={16}>CVSS Base Score:</Col>
        <Col span={8} style={{ textAlign: 'right' }}>{data.cvssScore}</Col>
      </Row>
      <Row>
        <Col span={16}>EPSS Probability:</Col>
        <Col span={8} style={{ textAlign: 'right' }}>{(data.epssScore * 100).toFixed(1)}%</Col>
      </Row>
      <Row>
        <Col span={16}>Asset Criticality:</Col>
        <Col span={8} style={{ textAlign: 'right' }}>{data.assetCriticality}</Col>
      </Row>
      <Row>
        <Col span={16}>Exploit Available:</Col>
        <Col span={8} style={{ textAlign: 'right' }}>{data.exploitAvailable ? 'Yes (KEV)' : 'No'}</Col>
      </Row>
    </div>
    <Divider style={{ margin: '8px 0' }} />
    <div style={{ fontSize: 11, color: '#888' }}>
      Formula: (CVSS × 0.4) + (EPSS × 0.3) + (Criticality × 0.2) + (Exploit × 0.1)
    </div>
  </div>
);
```

**Acceptance Criteria:**
- [ ] Hovering risk score shows breakdown popover
- [ ] All 4 factors visible: CVSS, EPSS, criticality, exploit status
- [ ] Formula documented at bottom of tooltip
- [ ] Mobile: Tap (not hover) opens tooltip, tap outside closes

**Backend Dependency:**
- Verify: Recommendation response includes `cvssScore`, `epssScore`, `assetCriticality`, `exploitAvailable`

**Estimated Time:** 1 day

---

#### F.10 — Accessibility: ARIA Labels

**Current Issue:** Icon-only buttons have no accessible label.

```tsx
// Bad (current):
<Button icon={<DeleteOutlined />} onClick={handleDelete} />
// Screen reader: "Button" (no description)

// Good (fix):
<Button
  icon={<DeleteOutlined />}
  onClick={handleDelete}
  aria-label="Delete asset"
  title="Delete asset"
/>
// Screen reader: "Delete asset, button"
```

**Audit Plan:**
1. Search codebase for `<Button icon=` without `aria-label`
2. Add labels to all (estimated 50+ instances)
3. Common patterns:
   - Delete buttons: `aria-label="Delete {item}"`
   - Edit buttons: `aria-label="Edit {item}"`
   - Export buttons: `aria-label="Export to CSV"`
   - Filter buttons: `aria-label="Open filters"`
   - More actions: `aria-label="More actions"`

**Acceptance Criteria:**
- [ ] axe-core scan shows 0 "button-name" violations
- [ ] Screen reader (NVDA/JAWS) announces button purpose for all icon buttons
- [ ] Tooltip (title attribute) matches aria-label for mouse users
- [ ] Focus indicators visible (2px blue outline, 4.5:1 contrast)

**Estimated Time:** 1 day (automated search + manual fixes)

---

#### F.11 — Accessibility: Severity Indicators

**Current Issue:** Severity shown by color only (red/yellow/green), violates WCAG 2.1 AA.

**Fix:** Add icon + text label to every severity display.

```tsx
// components/shared/SeverityIndicator.tsx
const SeverityIndicator = ({ severity }) => {
  const config = {
    CRITICAL: { icon: <WarningFilled />, color: '#ff4d4f', label: 'Critical' },
    HIGH: { icon: <CaretUpFilled />, color: '#ff7a45', label: 'High' },
    MEDIUM: { icon: <MinusCircleFilled />, color: '#ffa940', label: 'Medium' },
    LOW: { icon: <MinusOutlined />, color: '#1890ff', label: 'Low' },
  };

  const { icon, color, label } = config[severity] || config.LOW;

  return (
    <Badge
      color={color}
      text={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {icon} {label}
        </span>
      }
    />
  );
};
```

**Replace Everywhere:**
- `VulnerabilitiesTab.tsx` (lines 23-31, 73)
- `recommendationColumns.tsx` (lines 5-10)
- `PatchRecommendationsTab.tsx` (lines 34-47)
- `Dashboard.tsx` (severity charts)
- Any other color-only severity displays (8+ files estimated)

**Acceptance Criteria:**
- [ ] All severity displays use `<SeverityIndicator />` component
- [ ] Grayscale mode (colorblind simulation): Still distinguishable by icon + label
- [ ] Screen reader announces severity level (e.g., "Critical severity")
- [ ] Icons consistent across entire app (⚠️=Critical, ▲=High, ●=Medium, −=Low)

**Estimated Time:** 1 day

---

#### F.12 — Accessibility: Keyboard Navigation

**Current Issues:**
- Modals don't trap focus (Tab escapes modal, focus lost)
- No skip-to-content link
- Some menus require mouse hover (not keyboard accessible)

**Fixes:**

1. **Skip-to-Content Link:**
```tsx
// MainLayout.tsx (at top)
<a
  href="#main-content"
  style={{
    position: 'absolute',
    left: '-9999px',
    top: 0,
    '&:focus': { left: 0, zIndex: 9999 },
  }}
>
  Skip to main content
</a>

<main id="main-content" tabIndex={-1}>
  {children}
</main>
```

2. **Modal Focus Trapping:**
```tsx
// Ant Design modals already handle this, verify:
<Modal
  open={isOpen}
  onCancel={onClose}
  focusTrapEnabled // Ant Design 6 feature
  keyboard // Escape key closes modal
>
  {/* Content */}
</Modal>
```

3. **Menu Keyboard Navigation:**
```tsx
// MainLayout sidebar (already uses Ant Design Menu, verify keyboard support)
<Menu
  mode="inline"
  selectedKeys={[activeKey]}
  onSelect={({ key }) => navigate(key)}
  // Ant Design Menu supports Arrow keys, Enter, Escape by default
/>
```

**Testing Checklist:**
- [ ] Unplug mouse, complete workflow: Login → View patch → Accept recommendation → Deploy
- [ ] Tab order follows visual order (top-to-bottom, left-to-right)
- [ ] All interactive elements reachable via Tab
- [ ] Enter/Space activates buttons
- [ ] Arrow keys navigate menus
- [ ] Escape closes modals/drawers
- [ ] Focus indicators visible (2px outline, contrasting color)
- [ ] No keyboard traps (can Tab out of every element)

**Acceptance Criteria:**
- [ ] Keyboard-only workflow test passes (30-minute test)
- [ ] axe-core shows 0 keyboard navigation violations
- [ ] Focus indicators meet 4.5:1 contrast ratio
- [ ] Skip-to-content link works (appears on Tab, jumps to main content)

**Estimated Time:** 2 days (1 day fixes, 1 day testing)

---

### Phase 2 Exit Criteria

Before starting Phase 3, verify:
- [x] Vulnerability detail page functional (shows affected assets, links to patches)
- [x] Patch detail shows vulnerabilities addressed (CVE list with links)
- [x] Patch supersedence visible (in detail page + recommendations list)
- [x] Risk score tooltip shows breakdown (CVSS, EPSS, criticality, exploit)
- [x] axe-core scan: 0 critical/serious violations
- [x] Keyboard navigation test passes (complete workflow without mouse)
- [x] Screen reader test passes (NVDA/JAWS announces all elements correctly)
- [x] Color contrast meets 4.5:1 ratio (all text, interactive elements)

---

## Phase 3: Bulk Operations & Polish (Weeks 5-6, Mar 15-28)

**Goal:** Enable bulk workflows, establish reusable patterns, mobile optimization.

### Now — Must Have (Week 5)

| # | Item | Why | Files | Priority | Status |
|---|------|-----|-------|----------|--------|
| **F.13** | **Bulk accept/reject recommendations** | Admins manually process 100+ recommendations one-by-one. Wastes 30+ minutes. | `PatchRecommendations.tsx`, service layer | `HIGH` | `COMPLETE` |
| **F.14** | **Bulk deploy accepted patches** | Deployment requires clicking "Deploy" 50 times. No way to deploy multiple patches at once. | `PatchRecommendationsTab.tsx`, new `BulkDeployModal.tsx` | `HIGH` | `COMPLETE` |
| **F.15** | **Create reusable action components** | Duplicate code: Action buttons repeated in 8 components. 200+ lines of duplicate logic. | New `BulkActionBar.tsx`, `StatusBadge.tsx`, `ActionMenu.tsx` | `MEDIUM` | `COMPLETE` |

#### F.13 — Bulk Accept/Reject Recommendations

**UI Changes:**

1. **Add Checkbox Column:**
```tsx
// PatchRecommendations.tsx
const columns = [
  {
    title: <Checkbox onChange={handleSelectAll} checked={allSelected} />,
    dataIndex: 'id',
    width: 50,
    render: (id) => (
      <Checkbox
        checked={selectedIds.includes(id)}
        onChange={() => toggleSelection(id)}
      />
    ),
  },
  // ... existing columns
];
```

2. **Add Bulk Action Bar:**
```tsx
// Above table
{selectedIds.length > 0 && (
  <div style={{ marginBottom: 16, padding: 12, background: '#e6f7ff', borderRadius: 8 }}>
    <Space>
      <span>{selectedIds.length} selected</span>
      <Button type="primary" onClick={handleBulkAccept}>
        Accept Selected ({selectedIds.length})
      </Button>
      <Button onClick={handleBulkReject}>
        Reject Selected ({selectedIds.length})
      </Button>
      <Button type="link" onClick={handleDeselectAll}>
        Deselect All
      </Button>
    </Space>
  </div>
)}
```

3. **Bulk Accept Modal:**
```tsx
const handleBulkAccept = () => {
  Modal.confirm({
    title: `Accept ${selectedIds.length} recommendations?`,
    content: (
      <div>
        <p>This will mark the following recommendations as "Accepted":</p>
        <ul style={{ maxHeight: 200, overflow: 'auto' }}>
          {selectedRecommendations.map(rec => (
            <li key={rec.id}>{rec.vulnerability.cveId} → {rec.patch.patchId}</li>
          ))}
        </ul>
      </div>
    ),
    onOk: async () => {
      await patchRecommendationService.bulkAccept(selectedIds);
      refetch();
      message.success(`Accepted ${selectedIds.length} recommendations`);
      setSelectedIds([]);
    },
  });
};
```

4. **Bulk Reject Modal:**
```tsx
const handleBulkReject = () => {
  Modal.confirm({
    title: `Reject ${selectedIds.length} recommendations?`,
    content: (
      <Form form={form}>
        <Form.Item
          label="Reason"
          name="reason"
          rules={[{ required: true, message: 'Reason is required' }]}
        >
          <Select>
            <Option value="false_positive">False Positive</Option>
            <Option value="not_applicable">Not Applicable</Option>
            <Option value="risk_accepted">Risk Accepted</Option>
            <Option value="manual_patching">Manual Patching Preferred</Option>
          </Select>
        </Form.Item>
        <Form.Item label="Notes (optional)" name="notes">
          <TextArea rows={3} placeholder="Additional context..." />
        </Form.Item>
      </Form>
    ),
    onOk: async () => {
      const values = await form.validateFields();
      await patchRecommendationService.bulkReject(selectedIds, values);
      refetch();
      message.success(`Rejected ${selectedIds.length} recommendations`);
      setSelectedIds([]);
    },
  });
};
```

**Service Layer:**
```tsx
// patch-recommendation.service.ts
export const bulkAccept = async (ids: string[]) => {
  return api.post('/patch-recommendations/bulk-accept', { ids });
};

export const bulkReject = async (ids: string[], reason: string, notes?: string) => {
  return api.post('/patch-recommendations/bulk-reject', { ids, reason, notes });
};
```

**Acceptance Criteria:**
- [ ] Select 10 recommendations, click "Accept Selected", confirmation modal shows 10 items
- [ ] Submit accepts all 10 in <3s (single API call, not 10 sequential calls)
- [ ] Table updates all 10 rows to "Accepted" status
- [ ] Bulk reject requires reason dropdown (4 options)
- [ ] Optional notes field in reject modal
- [ ] Deselect all button clears selection
- [ ] Select all checkbox selects all filtered items (not just visible page)

**Backend Dependency:**
- `POST /patch-recommendations/bulk-accept` with `{ids: string[]}`
- `POST /patch-recommendations/bulk-reject` with `{ids: string[], reason: string, notes?: string}`
- If not exists, coordinate with backend or mock in frontend service layer

**Estimated Time:** 2 days

---

#### F.14 — Bulk Deploy Accepted Patches

**UI Flow:**

1. **Filter to "Accepted" Status:**
```tsx
// PatchRecommendations.tsx
<Select
  placeholder="Filter by status"
  onChange={(status) => setFilterStatus(status)}
  options={[
    { label: 'All', value: null },
    { label: 'Recommended', value: 'RECOMMENDED' },
    { label: 'Accepted', value: 'ACCEPTED' },
    { label: 'Deployed', value: 'DEPLOYED' },
  ]}
/>
```

2. **Bulk Deploy Button** (only enabled if all selected are "Accepted"):
```tsx
{selectedIds.length > 0 && allSelectedAreAccepted && (
  <Button
    type="primary"
    icon={<RocketOutlined />}
    onClick={() => setBulkDeployModalOpen(true)}
  >
    Deploy Selected ({selectedIds.length})
  </Button>
)}
```

3. **Bulk Deploy Modal:**
```tsx
// components/BulkDeployModal.tsx
const BulkDeployModal = ({ open, onClose, recommendations }) => {
  const [form] = Form.useForm();

  return (
    <Modal
      title={`Deploy ${recommendations.length} Patches`}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      width={600}
    >
      <Alert
        message="Selected Patches"
        description={
          <ul>
            {recommendations.map(rec => (
              <li key={rec.id}>
                {rec.patch.patchId} → {rec.asset.name}
              </li>
            ))}
          </ul>
        }
        type="info"
        style={{ marginBottom: 16 }}
      />

      <Form form={form} layout="vertical">
        <Form.Item
          label="Deploy To"
          name="deployType"
          rules={[{ required: true }]}
        >
          <Radio.Group>
            <Radio value="recommended_assets">Recommended Assets Only</Radio>
            <Radio value="asset_group">Entire Asset Group</Radio>
          </Radio.Group>
        </Form.Item>

        {deployType === 'asset_group' && (
          <Form.Item label="Asset Group" name="assetGroupId">
            <Select placeholder="Select group">
              {/* Fetch asset groups */}
            </Select>
          </Form.Item>
        )}

        <Form.Item label="Schedule" name="schedule" initialValue="now">
          <Radio.Group>
            <Radio value="now">Deploy Now</Radio>
            <Radio value="scheduled">Schedule for Later</Radio>
            <Radio value="maintenance">Next Maintenance Window</Radio>
          </Radio.Group>
        </Form.Item>

        {schedule === 'scheduled' && (
          <Form.Item label="Deploy At" name="deployAt">
            <DatePicker showTime />
          </Form.Item>
        )}

        <Form.Item label="Deployment Options" name="options">
          <Checkbox.Group>
            <Checkbox value="reboot_if_required">Reboot if Required</Checkbox>
            <Checkbox value="rollback_on_failure">Rollback on Failure</Checkbox>
            <Checkbox value="notify_on_completion">Notify on Completion</Checkbox>
          </Checkbox.Group>
        </Form.Item>
      </Form>

      <Alert
        message="Warning"
        description="This will deploy patches to production systems. Ensure maintenance window is scheduled."
        type="warning"
        showIcon
      />
    </Modal>
  );
};
```

4. **Progress Tracking:**
```tsx
const handleSubmit = async () => {
  const values = await form.validateFields();
  const deployment = await deploymentsService.bulkDeploy({
    patchIds: recommendations.map(r => r.patch.id),
    assetIds: recommendations.map(r => r.asset.id),
    schedule: values.schedule,
    options: values.options,
  });

  // Show progress modal
  setDeploymentId(deployment.id);
  setProgressModalOpen(true);

  // Poll deployment status
  const interval = setInterval(async () => {
    const status = await deploymentsService.getDeploymentStatus(deployment.id);
    setProgress(status.progress);

    if (status.status === 'COMPLETED' || status.status === 'FAILED') {
      clearInterval(interval);
      message.success('Deployment completed');
      refetch(); // Refresh recommendations list
    }
  }, 2000);
};
```

**Acceptance Criteria:**
- [ ] Select 5 accepted recommendations, click "Deploy Selected"
- [ ] Modal shows patch list, asset list, schedule options
- [ ] Deploy to "Recommended Assets Only" deploys to those 5 assets only
- [ ] Deploy to "Asset Group" shows group dropdown, deploys to entire group
- [ ] Progress modal shows "3/5 deployed" with progress bar
- [ ] Completion message shows success count (e.g., "5/5 deployed successfully")
- [ ] Failures show error list (e.g., "2 failed: Asset XYZ unreachable")

**Backend Dependency:**
- `POST /deployments/bulk` with `{patchIds: string[], assetIds: string[], schedule: {...}}`
- `GET /deployments/:id/status` for progress tracking
- If WebSocket available, use for real-time progress (fallback to polling)

**Estimated Time:** 2 days

---

#### F.15 — Create Reusable Action Components

**Problem:** Action button patterns duplicated across 8+ components.

**Solution:** Extract to shared components.

**1. BulkActionBar.tsx:**
```tsx
// components/shared/BulkActionBar.tsx
interface BulkActionBarProps {
  selectedCount: number;
  actions: Array<{
    label: string;
    onClick: () => void;
    type?: 'primary' | 'default' | 'link';
    icon?: React.ReactNode;
  }>;
  onDeselectAll: () => void;
}

const BulkActionBar = ({ selectedCount, actions, onDeselectAll }) => {
  if (selectedCount === 0) return null;

  return (
    <div style={{
      marginBottom: 16,
      padding: 12,
      background: '#e6f7ff',
      borderRadius: 8,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      <span style={{ fontWeight: 500 }}>
        {selectedCount} selected
      </span>
      <Space>
        {actions.map((action, idx) => (
          <Button
            key={idx}
            type={action.type || 'default'}
            icon={action.icon}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        ))}
        <Button type="link" onClick={onDeselectAll}>
          Deselect All
        </Button>
      </Space>
    </div>
  );
};
```

**Usage:**
```tsx
// PatchRecommendations.tsx
<BulkActionBar
  selectedCount={selectedIds.length}
  actions={[
    { label: `Accept (${selectedIds.length})`, onClick: handleBulkAccept, type: 'primary' },
    { label: `Reject (${selectedIds.length})`, onClick: handleBulkReject },
    { label: `Deploy (${selectedIds.length})`, onClick: handleBulkDeploy, icon: <RocketOutlined /> },
  ]}
  onDeselectAll={() => setSelectedIds([])}
/>
```

**2. StatusBadge.tsx:**
```tsx
// components/shared/StatusBadge.tsx
const statusConfig = {
  RECOMMENDED: { color: 'blue', label: 'Recommended' },
  ACCEPTED: { color: 'green', label: 'Accepted' },
  REJECTED: { color: 'red', label: 'Rejected' },
  DEPLOYED: { color: 'purple', label: 'Deployed' },
  FAILED: { color: 'error', label: 'Failed' },
};

const StatusBadge = ({ status }) => {
  const config = statusConfig[status] || { color: 'default', label: status };
  return <Badge status={config.color} text={config.label} />;
};
```

**3. ActionMenu.tsx:**
```tsx
// components/shared/ActionMenu.tsx
interface ActionMenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}

const ActionMenu = ({ items }: { items: ActionMenuItem[] }) => {
  const menu = (
    <Menu>
      {items.map(item => (
        <Menu.Item
          key={item.key}
          icon={item.icon}
          onClick={item.onClick}
          disabled={item.disabled}
          danger={item.danger}
        >
          {item.label}
        </Menu.Item>
      ))}
    </Menu>
  );

  return (
    <Dropdown overlay={menu} trigger={['click']}>
      <Button icon={<MoreOutlined />} aria-label="More actions" />
    </Dropdown>
  );
};
```

**Acceptance Criteria:**
- [ ] 3 new components in `/components/shared/`: BulkActionBar, StatusBadge, ActionMenu
- [ ] Replace duplicate logic in 8+ components:
  - PatchRecommendations.tsx
  - PatchRecommendationsTab.tsx
  - AllAssets.tsx
  - VulnerabilitiesTab.tsx
  - etc.
- [ ] Code reduction: 200+ lines removed (duplicates replaced with shared components)
- [ ] Storybook examples for each component (variants, props, usage)
- [ ] TypeScript interfaces exported for easy consumption

**Estimated Time:** 2 days

---

### Next — Should Have (Week 6)

| # | Item | Why | Files | Priority | Status |
|---|------|-----|-------|----------|--------|
| **F.16** | **Memoization and performance auditing** | Unnecessary re-renders. Recommendation calculations repeated on every render. | Top 10 slowest components | `MEDIUM` | `COMPLETE` |
| **F.17** | **Responsive layout for tablets** | No mobile/tablet support. 15% of users access from field (tablets). | MainLayout, DataTable, forms | `MEDIUM` | `COMPLETE` |

#### F.16 — Memoization and Performance Auditing

**Tools:**
- React DevTools Profiler (measure render times)
- ESLint plugin: `eslint-plugin-react-memo`
- Performance budget in CI (Lighthouse)

**Audit Process:**

1. **Identify Slow Components** (React DevTools Profiler):
   - Record interaction (e.g., filter recommendations, change page)
   - Sort by render time, identify top 10 slowest
   - Expected: DataTable, PatchRecommendationsTab, AllAssets, MainLayout

2. **Add useMemo for Expensive Calculations:**
```tsx
// Bad (current):
const criticalCount = recommendations.filter(r => r.severity === 'CRITICAL').length;

// Good (fix):
const criticalCount = useMemo(
  () => recommendations.filter(r => r.severity === 'CRITICAL').length,
  [recommendations]
);
```

3. **Add useCallback for Callbacks Passed to Children:**
```tsx
// Bad:
<DataTable onFilter={(filters) => setFilters(filters)} />
// Every render creates new function, causes DataTable to re-render

// Good:
const handleFilter = useCallback((filters) => setFilters(filters), []);
<DataTable onFilter={handleFilter} />
```

4. **Wrap Expensive Components in React.memo:**
```tsx
// DataTable.tsx
export const DataTable = React.memo(({ data, columns, onFilter }) => {
  // ... component logic
}, (prevProps, nextProps) => {
  // Custom comparison: Only re-render if data or columns changed
  return prevProps.data === nextProps.data && prevProps.columns === nextProps.columns;
});
```

5. **Add ESLint Rules:**
```js
// eslint.config.js
rules: {
  'react-hooks/exhaustive-deps': 'error', // Enforce dependency arrays
  'react-memo/require-memo': 'warn', // Suggest React.memo for expensive components
  'react-memo/require-usememo': 'warn', // Suggest useMemo for calculations
}
```

**Acceptance Criteria:**
- [ ] React DevTools Profiler: DataTable re-render <50ms (was 120ms)
- [ ] PatchRecommendationsTab: Filter change re-renders only table, not entire page
- [ ] MainLayout: Sidebar toggle doesn't re-render content area
- [ ] ESLint: 0 exhaustive-deps errors, <10 memo warnings
- [ ] Lighthouse Performance score ≥90 (desktop), ≥75 (mobile)

**Estimated Time:** 2 days

---

#### F.17 — Responsive Layout for Tablets

**Target Devices:**
- **iPad (768×1024):** Primary tablet target
- **iPad Pro (1024×1366):** Secondary
- **Surface Pro (912×1368):** Tertiary

**Breakpoints:**
```css
/* Desktop: 1200px+ (default) */
/* Laptop: 992px - 1199px */
/* Tablet: 768px - 991px */
/* Mobile: <768px (Phase 4, not Sprint 2) */
```

**Changes:**

1. **MainLayout Sidebar:**
```tsx
// MainLayout.tsx
const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

useEffect(() => {
  const handleResize = () => {
    if (window.innerWidth < 1024) {
      setSidebarCollapsed(true); // Auto-collapse on tablet
    }
  };
  window.addEventListener('resize', handleResize);
  handleResize(); // Initial check
  return () => window.removeEventListener('resize', handleResize);
}, []);

<Layout>
  <Sider
    collapsible
    collapsed={sidebarCollapsed}
    onCollapse={setSidebarCollapsed}
    breakpoint="lg" // 992px
  >
    {/* Menu */}
  </Sider>
  <Layout>
    {/* Content */}
  </Layout>
</Layout>
```

2. **DataTable Column Adaptation:**
```tsx
// DataTable.tsx
const getVisibleColumns = (columns, screenWidth) => {
  if (screenWidth < 768) {
    // Mobile: Show 2 key columns (defer to Phase 4)
    return columns.filter(col => col.key === 'name' || col.key === 'status');
  } else if (screenWidth < 992) {
    // Tablet: Show 4 key columns
    return columns.filter(col => col.priority === 'high' || col.priority === 'medium');
  }
  // Desktop: Show all columns
  return columns;
};
```

**Tag columns with priority:**
```tsx
const columns = [
  { title: 'Name', dataIndex: 'name', priority: 'high' },
  { title: 'Status', dataIndex: 'status', priority: 'high' },
  { title: 'Severity', dataIndex: 'severity', priority: 'medium' },
  { title: 'Last Updated', dataIndex: 'updatedAt', priority: 'low' }, // Hidden on tablet
];
```

3. **Modal/Drawer Full-Screen on Tablet:**
```tsx
// FormModal.tsx
<Modal
  open={open}
  onCancel={onClose}
  width={window.innerWidth < 768 ? '100%' : 600} // Full-screen on mobile/tablet
  style={window.innerWidth < 768 ? { top: 0, paddingBottom: 0 } : {}}
>
  {/* Content */}
</Modal>
```

4. **Touch-Friendly Targets:**
```css
/* index.css */
@media (max-width: 991px) {
  .ant-btn {
    min-height: 44px; /* Touch-friendly tap target */
    min-width: 44px;
  }

  .ant-table-cell {
    padding: 12px 8px; /* More vertical padding for touch */
  }
}
```

**Acceptance Criteria:**
- [ ] Open app on iPad (768×1024): Sidebar collapses to hamburger menu
- [ ] Tables show 4 key columns on tablet, rest via horizontal scroll
- [ ] Modals adapt to full-screen on screens <768px
- [ ] Forms stack inputs vertically on narrow screens
- [ ] Tap targets minimum 44×44px (iOS guideline)
- [ ] No horizontal scroll on main content (only tables)

**Estimated Time:** 2 days

---

### Phase 3 Exit Criteria

Before declaring Sprint 2 complete, verify:
- [x] Bulk accept/reject works for 10+ recommendations
- [x] Bulk deploy works for 5+ patches, progress indicator updates
- [x] Shared components (BulkActionBar, StatusBadge, ActionMenu) used in 8+ places
- [x] React DevTools Profiler: Top 10 components render in <50ms
- [x] Tablet view (768px) functional: Sidebar collapses, tables adapt, forms usable
- [x] Lighthouse Performance score ≥90 (desktop), ≥75 (mobile)

---

## Could Have — Future Enhancements (Sprint 3+)

| # | Item | Why | Estimated Effort |
|---|------|-----|------------------|
| **F.18** | **Asset-Patch-Vulnerability matrix view** | Power-user feature for audits. Pivot table: Assets × Patches × CVE count. Exportable to Excel. | 3 days |
| **F.19** | **Patch applicability view** | In patch detail, show which assets this patch applies to. "Deploy to selected assets" action. | 2 days |
| **F.20** | **Filter presets** | Save filter combinations (e.g., "Critical Unpatched Production Servers"). Quick-apply dropdown. | 2 days |
| **F.21** | **Dark mode support** | Toggle light/dark theme. Persist to localStorage. System preference detection. | 3 days |
| **F.22** | **AI chat context awareness** | Chat panel shows current page context. Can answer "Which patches should I deploy?" based on filters. | 2 days |
| **F.23** | **Service Worker for offline caching** | Cache read-only data (assets, patches, vulnerabilities). Queue mutations to sync when online. | 4 days |
| **F.24** | **Comprehensive Storybook documentation** | All shared components in Storybook. Accessibility tests (axe addon). | 3 days |
| **F.25** | **E2E test suite (Playwright)** | Tests for critical flows: Login, patch deployment, bulk accept, export CSV. | 4 days |

---

## Implementation Timeline

### Week-by-Week Breakdown

**Week 1 (Feb 14-21): Security Foundations**
- Mon-Tue: F.1 (Fix XSS vulnerability) — 2 days
- Wed: F.2 (Error boundaries) — 1 day
- Thu-Fri: F.3 (Lazy loading) — 2 days
- **Milestone:** Security scan passes, bundle size <150KB

**Week 2 (Feb 22-28): Performance Refactoring**
- Mon-Wed: F.4 (Refactor MainLayout) — 3 days
- Thu-Fri: F.5 (Add pagination) — 2 days
- **Milestone:** MainLayout <400 lines, asset list loads in <500ms

**Week 3 (Mar 1-7): Core UX**
- Mon-Tue: F.6 (Vulnerability detail page) — 2 days
- Wed: F.7 (Patch detail enhancement) — 1 day
- Thu-Fri: F.8 (Patch supersedence) — 2 days
- **Milestone:** All correlation views functional

**Week 4 (Mar 8-14): Accessibility**
- Mon: F.9 (Risk score tooltip) — 1 day
- Tue: F.10 (ARIA labels) — 1 day
- Wed: F.11 (Severity indicators) — 1 day
- Thu-Fri: F.12 (Keyboard navigation) — 2 days
- **Milestone:** WCAG 2.1 AA compliance

**Week 5 (Mar 15-21): Bulk Operations**
- Mon-Tue: F.13 (Bulk accept/reject) — 2 days
- Wed-Thu: F.14 (Bulk deploy) — 2 days
- Fri: F.15 (Reusable components) — 1 day
- **Milestone:** Bulk workflows complete

**Week 6 (Mar 22-28): Polish & Buffer**
- Mon-Tue: F.16 (Memoization audit) — 2 days
- Wed-Thu: F.17 (Tablet responsiveness) — 2 days
- Fri: Testing, bug fixes, documentation — 1 day
- **Milestone:** Sprint 2 complete, ready for security audit

---

## Success Metrics

### Sprint 2 Exit Criteria (All Must Pass)

#### Security
- [ ] XSS vulnerability eliminated: `dangerouslySetInnerHTML` removed, markdown parser implemented
- [ ] OWASP ZAP scan: 0 high/critical vulnerabilities
- [ ] npm audit: 0 high/critical package vulnerabilities
- [ ] Error boundaries prevent white screen crashes

#### Performance
- [ ] Lighthouse Performance score ≥90 (desktop), ≥70 (mobile 4G)
- [ ] Initial bundle <150KB gzipped (70% reduction from 500KB)
- [ ] Time to Interactive <2.5s on 4G connection
- [ ] MainLayout re-render <50ms (60% improvement from 120ms)
- [ ] Asset list loads in <500ms per page (50 items/page)

#### Functionality
- [ ] Vulnerability detail page shows affected assets, links to patches
- [ ] Patch detail shows vulnerabilities addressed, supersedence visible
- [ ] Risk score tooltip shows breakdown (CVSS, EPSS, criticality, exploit)
- [ ] Bulk accept/reject works for 10+ recommendations, completes in <3s
- [ ] Bulk deploy works for 5+ patches, progress indicator updates
- [ ] All existing pages functional (no regressions)

#### Accessibility (WCAG 2.1 AA)
- [ ] axe-core automated scan: 0 critical/serious violations
- [ ] Keyboard navigation: Complete workflow without mouse
- [ ] Screen reader: ARIA labels on all icon buttons, form labels associated
- [ ] Color contrast: All text meets 4.5:1 ratio
- [ ] Severity indicators use icon + color + text (not color-only)

#### Code Quality
- [ ] ESLint: 0 errors (warnings acceptable)
- [ ] TypeScript: 0 compilation errors
- [ ] No component >400 lines
- [ ] Shared components replace 8+ duplicate implementations

### Usage Metrics (Track First 4 Weeks Post-Launch)
- **Bulk action adoption:** 40% of admins use bulk accept/deploy within 2 weeks
- **CVE detail page views:** 50+ views per day (new feature discovery)
- **Mobile/tablet usage:** 15% of sessions from tablets (enable field work)
- **Time to assess vulnerabilities:** Reduce from 40min to 15min for 100 recommendations

---

## Dependencies

### Backend APIs (Verify Before Starting)
- [ ] `GET /vulnerabilities/:cveId/affected-assets` (F.6)
- [ ] `GET /patches/:id/vulnerabilities` (F.7)
- [ ] `GET /patches/:id` includes `supersedes[]`, `supersededBy[]` (F.8)
- [ ] `POST /patch-recommendations/bulk-accept` (F.13)
- [ ] `POST /patch-recommendations/bulk-reject` (F.13)
- [ ] `POST /deployments/bulk` (F.14)
- [ ] Recommendation response includes `cvssScore`, `epssScore`, `assetCriticality`, `exploitAvailable` (F.9)

**Action:** Coordinate with backend dev before Week 1. If endpoints missing, add to backend Sprint 2 scope or mock in frontend.

### External Libraries
- **New:** `react-markdown` or `DOMPurify` (F.1)
- **New:** `eslint-plugin-react-memo` (F.16)
- **Existing:** React Query, Ant Design, Axios, React Router (no changes)

---

## Risk Mitigation

### Risk 1: MainLayout Refactor Takes Longer Than 3 Days
**Mitigation:**
- Time-box to 3 days
- Ship incremental improvements (extract 2-3 components, defer full split if needed)
- Week 2 buffer can absorb 1-2 extra days

### Risk 2: Bulk Endpoints Not Ready from Backend
**Mitigation:**
- Mock endpoints in frontend service layer (return success after 1s delay)
- Swap in real API when backend ships
- If critical, descope F.14 (bulk deploy) to Phase 4, keep F.13 (bulk accept/reject) as P0

### Risk 3: Accessibility Testing Uncovers >50 Violations
**Mitigation:**
- Prioritize critical violations (keyboard nav, ARIA labels)
- Defer minor issues (color tweaks, spacing) to P1 fast-follow
- Week 4 has 2 days buffer, Week 6 has 1 day buffer

### Risk 4: Security Audit Scheduled Too Early (April 1)
**Mitigation:**
- Front-load security fixes (Week 1: F.1, F.2, F.3)
- Request audit delay to April 15 if needed (gives 2-week buffer)
- Sprint 2 hard deadline: March 28 (allows 1 week pre-audit buffer)

---

## Appendix: File Structure Changes

**New Files:**
```
frontend/src/
├── components/
│   ├── ErrorBoundary.tsx (F.2)
│   ├── layout/
│   │   ├── NavigationSidebar.tsx (F.4)
│   │   ├── ProfileMenu.tsx (F.4)
│   │   ├── CategoryPanel.tsx (F.4)
│   │   ├── OrganizationSwitcher.tsx (F.4)
│   │   └── LayoutContext.tsx (F.4)
│   └── shared/
│       ├── BulkActionBar.tsx (F.15)
│       ├── StatusBadge.tsx (F.15)
│       ├── ActionMenu.tsx (F.15)
│       ├── SeverityIndicator.tsx (F.11)
│       └── RiskScoreTooltip.tsx (F.9)
├── pages/
│   └── vulnerabilities/
│       └── VulnerabilityDetail.tsx (F.6)
└── services/
    └── correlation.service.ts (F.6)
```

**Modified Files:**
```
frontend/src/
├── App.tsx (F.2, F.3: Error boundaries, lazy routes)
├── components/
│   ├── MainLayout.tsx (F.4: Refactor to 200 lines)
│   ├── AIChatPanel.tsx (F.1: Remove XSS vulnerability)
│   └── DataTable.tsx (F.5: Pagination support, F.17: Responsive columns)
├── pages/
│   ├── patches/PatchDetails.tsx (F.7, F.8: Vulnerabilities tab, supersedence)
│   ├── patches/PatchRecommendations.tsx (F.13: Bulk accept/reject)
│   ├── assets/AllAssets.tsx (F.5: Pagination)
│   └── assets/components/tabs/
│       └── PatchRecommendationsTab.tsx (F.14: Bulk deploy)
├── hooks/
│   └── useAssets.ts (F.5: Pagination params)
└── services/
    ├── patch-recommendation.service.ts (F.13: Bulk operations)
    └── deployments.service.ts (F.14: Bulk deploy)
```

---

*This roadmap is a living document. Update status as work progresses. Adjust timeline if risks materialize.*
