# PRD: Phase 3 — Frontend Architecture

> **Owner:** Engineering Team
> **Status:** Approved — Ready for Implementation
> **Last Updated:** 2026-02-12
> **Roadmap Reference:** Phase 3 (Next / Should Have)
> **Dependency:** Phase 2 (Backend Discipline) — COMPLETED

---

## 1. Problem Statement

PatchIQ's frontend has no shared infrastructure for data fetching, tables, forms, or modals. Every page component manually manages loading/error/data state, builds tables from scratch, and implements its own modal logic. This causes:

- **Bloated components** — 19 page components exceed 400 lines. `AssetDetails.tsx` is 3,061 lines. `MainLayout.tsx` is 1,080 lines. `AllPatches.tsx` is 1,434 lines. Developers can't navigate or modify these files without risk.
- **Massive data-fetching boilerplate** — 76 files manually manage `useState`/`useEffect` loading patterns. 176 `useEffect` calls for data fetching. Zero caching, zero deduplication, zero background refresh. Every navigation triggers a full re-fetch.
- **Job page duplication** — 14 job pages totalling 7,780 lines share ~80% identical structure. `ConfigurationJobsDeployed`, `SoftwareJobsDeployed`, and `PatchJobsDeployed` differ only in type definitions and service calls.
- **Inconsistent UX patterns** — 95 inline `<Modal>` implementations, 87 `Form.useForm()` calls, 55 direct `<Table>` usages with manually coded pagination, sorting, and filtering. No two pages handle loading or errors the same way.
- **No shared abstractions** — 14 shared components exist (3,755 lines), but zero shared hooks for data fetching, zero table wrappers, zero form/modal templates. Only 1 custom hook exists in the entire frontend (`useNotificationSSE`).

**Cost of not solving:** Every new page adds 400-800 lines of copy-pasted boilerplate. Bug fixes for table pagination, error handling, or loading states must be applied to 55+ files independently. The 14 job pages are a maintenance nightmare — a UX change requires editing all 14 files.

---

## 2. Goals

| # | Goal | Measurement |
|---|------|-------------|
| G1 | Eliminate manual data-fetching boilerplate | Zero `useState`/`useEffect` patterns for API data; all data fetching through React Query hooks |
| G2 | No page component over 400 lines | `wc -l` on every file in `pages/` returns ≤400 |
| G3 | Job pages consolidated from 14 files to 3-4 generic components | 14 job files → 3-4 generic + config objects |
| G4 | Shared table component used across all list views | Zero inline `<Table>` with manual pagination; all list views use `<DataTable>` |
| G5 | Consistent modal/form patterns | Shared `<FormModal>` and `<ConfirmModal>` replace 95 inline modal implementations |

---

## 3. Non-Goals

| Non-Goal | Reason |
|----------|--------|
| UI/visual redesign | Ant Design 6 UI is functional; this phase is about code architecture, not look-and-feel |
| State management library (Zustand, Redux) | React Query handles server state; local state with `useState` is fine for UI state |
| New features or pages | Architecture before features — no new functionality in this phase |
| Backend changes | Phase 2 established stable API contracts; frontend adapts to existing APIs |
| Test coverage improvements | That's Phase 4; we build infrastructure first |
| Performance optimization (code splitting, lazy routes) | Listed as Later (L.3) in the roadmap |

---

## 4. User Stories

**As a frontend developer building a new list page**, I want to use a shared `<DataTable>` component so that I get pagination, sorting, filtering, column visibility, and loading states in <20 lines of configuration — not 200 lines of manual wiring.

**As a developer modifying job deployment behavior**, I want job pages to share a single generic component so that a UX change is made once, not 14 times across nearly-identical files.

**As a developer adding a data-fetching component**, I want to call `useQuery` with a service function and get automatic caching, deduplication, background refetch, and loading/error states — not manually wire up `useState`, `useEffect`, `try/catch`, and `message.error`.

**As a developer reviewing a PR for a new page**, I want the page to use standardized patterns (DataTable, FormModal, React Query hooks) so that I can focus on reviewing business logic, not boilerplate correctness.

**As a developer debugging a component**, I want page files to be under 400 lines with clear separation (page → table → filters → modals) so that I can quickly find and understand the code I need to change.

---

## 5. Requirements

### Must Have (P0)

#### R1: Add TanStack React Query for all data fetching

**Description:** Replace all manual `useState`/`useEffect` data-fetching patterns with React Query. This provides automatic caching, request deduplication, background refresh, stale-while-revalidate, and built-in loading/error states.

**Current state:** 76 files manually manage loading state. 176 `useEffect` calls for data fetching. Zero caching — every page mount re-fetches all data. 536 manual `message.error`/`message.success` calls for feedback.

**Approach:**
1. Install `@tanstack/react-query` and `@tanstack/react-query-devtools`
2. Create `QueryClientProvider` wrapper in `App.tsx` with sensible defaults
3. Create typed query hooks per module in `frontend/src/hooks/` (e.g., `usePatches`, `useAgents`, `useJobs`)
4. Create typed mutation hooks for create/update/delete operations with automatic cache invalidation
5. Migrate pages module-by-module, replacing `useState`/`useEffect` with query hooks

**Query hook pattern:**
```typescript
// frontend/src/hooks/usePatches.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patchService } from '@/services/patch.service';

export function usePatches(params?: PatchListParams) {
  return useQuery({
    queryKey: ['patches', params],
    queryFn: () => patchService.getPatches(params),
  });
}

export function usePatch(id: string) {
  return useQuery({
    queryKey: ['patches', id],
    queryFn: () => patchService.getPatch(id),
    enabled: !!id,
  });
}

export function useCreatePatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: patchService.createPatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patches'] });
    },
  });
}
```

**Migration scope by module (ordered by impact):**

| Module | Files to Migrate | Current useEffect Count | Priority |
|--------|-----------------|------------------------|----------|
| Jobs | 14 files | 32 | First — most duplication, highest payoff |
| Patches | 7 files | 18 | Second — high traffic pages |
| Assets | 8 files | 22 | Third — complex data dependencies |
| Settings | 12 files | 16 | Fourth — many small pages |
| Vulnerabilities | 4 files | 8 | Fifth — straightforward |
| Discovery/Hub/Dashboard | 6 files | 12 | Sixth — remaining pages |
| Reports/Notifications | 4 files | 6 | Seventh — low complexity |

**QueryClient defaults:**
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,        // 30s before refetch
      retry: 1,                  // One retry on failure
      refetchOnWindowFocus: true, // Refetch when tab regains focus
    },
  },
});
```

**Acceptance Criteria:**
- [ ] `@tanstack/react-query` installed and `QueryClientProvider` wrapping the app
- [ ] React Query Devtools available in development mode
- [ ] Query hooks created for every backend module (patches, agents, assets, jobs, vulnerabilities, settings, hub, deployments, discovery, reports, notifications, dashboard)
- [ ] Mutation hooks created for all create/update/delete operations with cache invalidation
- [ ] All 76 files with manual loading state migrated to use React Query hooks
- [ ] Zero `useState`/`useEffect` patterns for API data fetching (UI-only state like form inputs still use `useState`)
- [ ] Existing polling patterns (e.g., `AssetDetails` 30-second telemetry) converted to `refetchInterval`
- [ ] Error handling standardized — global `onError` callback or per-query error display
- [ ] No behavior change — pages display same data, same loading indicators, same error messages

---

#### R2: Shared `<DataTable>` component

**Description:** A generic, configurable table component that wraps Ant Design's `<Table>` with built-in server-side pagination, sorting, filtering, column visibility, and loading states. Replaces 55 inline table implementations.

**Current state:** 55 files import `<Table>` directly. 122 `ColumnsType` definitions. Every table manually manages pagination state, sort state, and filter state. One existing `ColumnSettingsDrawer` (653 lines) provides column configuration with drag-and-drop — this should be integrated.

**Component API:**
```typescript
// frontend/src/components/shared/DataTable.tsx
interface DataTableProps<T> {
  // Data source — works with React Query
  data: T[] | undefined;
  loading?: boolean;

  // Columns
  columns: DataTableColumn<T>[];

  // Server-side pagination
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };

  // Server-side sorting
  sortable?: boolean;
  defaultSort?: { field: string; order: 'asc' | 'desc' };
  onSortChange?: (field: string, order: 'asc' | 'desc') => void;

  // Filtering & search
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;
  filterBar?: React.ReactNode; // Custom filter components

  // Selection
  selectable?: boolean;
  selectedRowKeys?: React.Key[];
  onSelectionChange?: (keys: React.Key[], rows: T[]) => void;

  // Actions
  toolbar?: React.ReactNode;     // Buttons above the table (Create, Export, etc.)
  rowActions?: (record: T) => React.ReactNode; // Per-row action buttons

  // Column settings integration
  columnSettingsEnabled?: boolean;  // Integrates existing ColumnSettingsDrawer

  // Table identity (for persisting column settings)
  tableId?: string;

  // Sizing
  scroll?: { x?: number; y?: number };
  size?: 'small' | 'middle' | 'large';

  // Row customization
  rowKey?: string | ((record: T) => string);
  expandable?: ExpandableConfig<T>;
  onRow?: (record: T) => React.HTMLAttributes<HTMLElement>;
}
```

**DataTableColumn extends Ant Design's ColumnType with:**
```typescript
interface DataTableColumn<T> extends ColumnType<T> {
  // Column visibility
  hideable?: boolean;      // Can user toggle this column? (default true)
  defaultHidden?: boolean; // Hidden by default?

  // Server-side sort key (differs from dataIndex for nested fields)
  sortKey?: string;
}
```

**Built-in features:**
1. **Pagination bar** with page size selector and total count
2. **Loading skeleton** while data loads (not just a spinner)
3. **Empty state** when no results match filters
4. **Search bar** with debounced input (300ms)
5. **Column settings** integration with existing `ColumnSettingsDrawer`
6. **Responsive** — horizontal scroll on narrow viewports
7. **Row selection** with select-all across pages
8. **URL sync** (optional) — pagination/sort/search reflected in URL query params

**Acceptance Criteria:**
- [ ] `<DataTable>` component created in `frontend/src/components/shared/DataTable.tsx`
- [ ] Supports server-side pagination, sorting, and search
- [ ] Integrates existing `ColumnSettingsDrawer` for column visibility/reordering
- [ ] Provides built-in loading, empty, and error states
- [ ] Row selection with batch action support
- [ ] All 55 inline `<Table>` implementations migrated to `<DataTable>`
- [ ] Existing table behavior preserved — same columns, same data, same actions
- [ ] Reusable across all list views (patches, agents, assets, jobs, vulnerabilities, etc.)
- [ ] Table configuration is declarative — a new list page needs only column definitions and a query hook

---

#### R3: Consolidate Job pages into generic components

**Description:** Replace 14 nearly-identical job page files (7,780 lines) with 3-4 generic components configured via props/config objects.

**Current state:** 14 files in `pages/jobs/` that share ~80% identical structure:

| Job Type | Catalog Page | Bundle Page | Deployed Page |
|----------|-------------|-------------|---------------|
| Patch | *(in AllPatches)* | *(in AllPatches)* | PatchJobsDeployed (641 lines) |
| Software | SoftwareJobsCatalog (594) | SoftwareJobsBundle (700) | SoftwareJobsDeployed (1,490) |
| Configuration | ConfigurationJobsCatalog (562) | ConfigurationJobsBundle (718) | ConfigurationJobsDeployed (759) |
| Vulnerability | VulnerabilityJobsList (773) | — | VulnerabilityJobsDBSync (452) |

**Shared patterns across all job pages:**
- Table with status column (badge), progress column (bar), platform column (icons), actions column
- Create modal with form (select items → select targets → configure options)
- Detail drawer/modal showing deployment progress per agent
- Refresh, export, and batch action toolbar
- Polling for in-progress deployments

**Approach:**
1. Create `<JobCatalogPage>` — generic catalog browser with transfer-list selection
2. Create `<JobBundlePage>` — generic bundle management with table + CRUD modals
3. Create `<JobDeployedPage>` — generic deployment list with progress tracking
4. Each job type provides a configuration object:

```typescript
// Example: Software jobs configuration
const softwareJobsConfig: JobPageConfig = {
  entityName: 'Software Package',
  queryKey: 'software-jobs',
  service: softwareJobsService,
  columns: [...], // Only columns unique to this job type
  createForm: SoftwareJobCreateForm, // Custom form component
  statusEnum: SoftwareDeploymentStatus,
};

// Usage:
<JobDeployedPage config={softwareJobsConfig} />
```

**Target reduction:**
- **Before:** 14 files, 7,780 lines
- **After:** 3-4 generic components (~600 lines each) + 14 config objects (~50 lines each) ≈ 3,100 lines
- **Savings:** ~4,700 lines (60% reduction)

**Acceptance Criteria:**
- [ ] `<JobCatalogPage>` handles catalog browsing for all job types
- [ ] `<JobBundlePage>` handles bundle management for all job types
- [ ] `<JobDeployedPage>` handles deployment lists for all job types
- [ ] Each job type configures the generic component via a config object
- [ ] All existing job page behavior preserved — same UI, same interactions
- [ ] Navigation routes updated to use generic components
- [ ] Total job page code reduced by 50%+ (from 7,780 lines)

---

#### R4: Break up bloated components

**Description:** Decompose the 19 page components that exceed 400 lines into focused sub-components.

**Top targets (by size and complexity):**

| Component | Current Lines | Decomposition Plan |
|-----------|--------------|-------------------|
| `AssetDetails.tsx` | 3,061 | → `AssetDetailsPage` (shell + tabs) + `AssetHeader` + `AssetSummaryCards` + 8 tab components already exist but are themselves too large |
| `Vulnerabilities.tsx` | 1,515 | → `VulnerabilitiesPage` + `VulnerabilityTable` + `VulnerabilityFilters` + `VulnerabilityDetailDrawer` |
| `ZeroDayVulnerabilities.tsx` | 1,503 | → Same pattern as Vulnerabilities |
| `AllPatches.tsx` | 1,434 | → `AllPatchesPage` + `PatchTable` + `PatchFilters` + `PatchDetailModal` + `PatchCreateModal` |
| `Hub.tsx` | 1,191 | → `HubPage` + `HubPackageTable` + `HubUploadModal` + `HubPackageDetail` |
| `MainLayout.tsx` | 1,080 | → `MainLayout` (shell) + `Sidebar` + `Header` + `NavigationMenu` + `UserMenu` + `BreadcrumbNav` |
| `Users.tsx` | 1,126 | → `UsersPage` + `UsersTable` + `UserFormModal` + `UserFilters` |
| `LDAPServerConfiguration.tsx` | 967 | → `LDAPPage` + `LDAPForm` + `LDAPTestConnection` |
| `PatchDetails.tsx` | 958 | → `PatchDetailsPage` + `PatchInfoCard` + `PatchBundlesTab` + `PatchDeploymentsTab` |

**Decomposition rules:**
1. **Page component** — layout shell, tab/route orchestration, max 200 lines
2. **Table component** — column definitions + DataTable config, max 200 lines
3. **Filter component** — search + filter controls, max 100 lines
4. **Modal/Drawer component** — form + submit logic, max 200 lines
5. Sub-components live in a sibling `components/` directory (e.g., `pages/patches/components/`)

**Asset tab decomposition (secondary target):**

| Tab Component | Current Lines | Action |
|---------------|--------------|--------|
| `UnifiedPatchesTab.tsx` | 944 | → `UnifiedPatchesTab` + `PatchRecommendationTable` + `PatchActionModals` |
| `SecurityTab.tsx` | 818 | → `SecurityTab` + `VulnerabilityTable` + `SecuritySummary` |
| `PeripheralsTab.tsx` | 774 | → `PeripheralsTab` + `PeripheralTable` + `PeripheralDetail` |
| `SoftwareTab.tsx` | 639 | → `SoftwareTab` + `SoftwareTable` |
| `PatchesTab.tsx` | 600 | → `PatchesTab` + `PatchTable` |

**Acceptance Criteria:**
- [ ] Every page component in `pages/` is ≤400 lines
- [ ] `MainLayout.tsx` decomposed into `Sidebar`, `Header`, `NavigationMenu`, `UserMenu`, `BreadcrumbNav`
- [ ] `AssetDetails.tsx` reduced to a tab orchestration shell (≤300 lines)
- [ ] All pages with tables decomposed into `Page` + `Table` + `Filters` + `Modals`
- [ ] Sub-components placed in `components/` directory adjacent to the page
- [ ] No behavior changes — all pages render identically before and after
- [ ] Component props are typed — no `any` props

---

### Should Have (P1)

#### R5: Standardize form/modal patterns

**Description:** Create shared `<FormModal>`, `<ConfirmModal>`, and `<FilterDrawer>` components that enforce consistent UX across all pages. Replaces 95 inline modal implementations.

**Current state:** 95 inline `<Modal>` instances, 87 `Form.useForm()` calls. Every page manually manages modal visibility, form state, submission, loading, and error display. No two modals handle these consistently.

**Shared components:**

```typescript
// FormModal — for create/edit entities
<FormModal
  title="Create Patch"
  open={isOpen}
  onClose={onClose}
  onSubmit={handleSubmit}        // Receives form values
  loading={mutation.isPending}   // Submit button loading state
  initialValues={editingPatch}   // Pre-fill for edit mode
>
  <Form.Item name="name" label="Name" rules={[{ required: true }]}>
    <Input />
  </Form.Item>
  {/* ... form fields */}
</FormModal>

// ConfirmModal — for destructive actions
<ConfirmModal
  title="Delete Patch"
  description="This will permanently delete the patch and all associated bundles."
  confirmText="Delete"
  danger
  open={isOpen}
  onConfirm={handleDelete}
  onCancel={onClose}
  loading={mutation.isPending}
/>

// FilterDrawer — for advanced filters on list pages
<FilterDrawer
  open={isOpen}
  onClose={onClose}
  onApply={handleFilter}
  onReset={handleReset}
  activeCount={activeFilterCount}
>
  {/* Filter form fields */}
</FilterDrawer>
```

**Built-in behaviors:**
- `FormModal`: Auto-resets form on close, validates on submit, disables submit while loading, keyboard submit (Enter), focuses first field on open
- `ConfirmModal`: Danger styling, requires explicit confirmation, keyboard shortcut (Escape to cancel)
- `FilterDrawer`: Active filter count badge, reset all, collapsible sections

**Acceptance Criteria:**
- [ ] `<FormModal>` component created with auto-reset, validation, loading states
- [ ] `<ConfirmModal>` component created for destructive action confirmation
- [ ] `<FilterDrawer>` component created for advanced filters
- [ ] At least 20 inline modals migrated to shared components (highest-traffic pages first)
- [ ] Consistent modal behavior: Escape to close, click-outside to close, focus management
- [ ] All shared modal components support React Query mutation integration (loading/error from mutation)

---

#### R6: Custom hooks library

**Description:** Create a library of reusable hooks that encapsulate common UI patterns. Currently only 1 custom hook exists (`useNotificationSSE`).

**Hooks to create:**

| Hook | Purpose | Replaces |
|------|---------|----------|
| `useTableParams` | Manages pagination, sort, search, and filter state with URL sync | Manual `useState` for page/pageSize/sort in 55 files |
| `useDebouncedSearch` | Debounced search input with configurable delay | Manual `setTimeout`/`useRef` debounce patterns |
| `useModal` | Manages modal open/close state and selected item | `const [visible, setVisible] = useState(false)` in 51 files |
| `usePolling` | Configurable polling with pause/resume (wraps React Query's `refetchInterval`) | 20 manual `setInterval`/`setTimeout` instances |
| `useExport` | Handles CSV/Excel export with loading state | Repeated export logic across table pages |

**Acceptance Criteria:**
- [ ] Hooks created in `frontend/src/hooks/`
- [ ] `useTableParams` manages pagination + sort + search state, optionally syncs to URL
- [ ] `useDebouncedSearch` provides debounced value with configurable delay
- [ ] `useModal` returns `{ open, onOpen, onClose, selectedItem }` pattern
- [ ] All hooks are typed with generics where appropriate
- [ ] Hooks documented with usage examples in JSDoc comments

---

### Future Considerations (P2)

#### F1: URL-driven table state

All table parameters (page, pageSize, sort, search, filters) reflected in URL query params. Enables shareable links to specific table views (e.g., "show me page 3 of critical patches sorted by date"). Designed for in R2/R6 via optional `syncUrl` prop, implemented fully later.

#### F2: Optimistic updates

React Query mutations update the UI immediately before the server confirms. Provides instant feedback for create/update/delete operations. Foundation laid in R1 mutation hooks; full implementation can be added per-page later.

#### F3: Global error boundary with retry

A React error boundary that catches rendering errors and offers "Retry" instead of a blank page. Pairs with React Query's error states for a comprehensive error UX.

---

## 6. Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Manual `useState`/`useEffect` for API data | 0 files | Grep for data-fetching `useEffect` patterns |
| Page components over 400 lines | 0 files | `wc -l` on all files in `pages/` |
| Inline `<Table>` usage | 0 files | Grep for direct `<Table` import from antd in pages |
| Job page total LOC | <3,500 (from 7,780) | `wc -l` on all files in `pages/jobs/` |
| React Query adoption | 100% of data-fetching pages | All list/detail pages use `useQuery`/`useMutation` |
| Shared component adoption | 100% of list views use DataTable | Audit all pages that display tabular data |
| Custom hooks count | ≥7 (from 1) | Count files in `hooks/` directory |

---

## 7. Open Questions

| # | Question | Owner | Blocking? |
|---|----------|-------|-----------|
| Q1 | Should `<DataTable>` persist column settings to localStorage or backend? | Engineering | No — start with localStorage, add backend persistence later if needed |
| Q2 | Should React Query devtools be included in production builds? | Engineering | No — dev-only by default; add build-time flag if needed |
| Q3 | Should URL sync for table state be opt-in or opt-out? | Engineering | No — start with opt-in (`syncUrl` prop); make default later based on UX feedback |
| Q4 | Should job page configs be separate files or inline? | Engineering | No — separate files for cleanliness, but either works |
| Q5 | Should we migrate all 95 inline modals in this phase or just the highest-traffic ones? | Engineering | No — migrate at least 20 highest-traffic; remaining can be done incrementally |

---

## 8. Implementation Order

```
R1 (React Query) → R6 (Custom hooks) → R2 (DataTable) → R3 (Job consolidation) → R5 (Form/Modal patterns) → R4 (Break up components)
```

**Rationale:**
1. **React Query first** — every subsequent requirement depends on it. DataTable needs query integration. Job consolidation needs query hooks. Component decomposition is simpler when data fetching is abstracted.
2. **Custom hooks next** — `useTableParams`, `useModal`, `useDebouncedSearch` are building blocks for DataTable and component decomposition. Small scope, high reuse.
3. **DataTable third** — depends on React Query for data source and custom hooks for state management. Once built, makes R3 and R4 much easier.
4. **Job consolidation fourth** — now that DataTable and React Query exist, generic job components are straightforward composition. Largest line-count reduction in the project.
5. **Form/Modal patterns fifth** — standardizes the remaining UI patterns. Can reference established React Query mutation patterns.
6. **Component decomposition last** — easiest with all shared components available. Each large page simply extracts sub-components that use DataTable, FormModal, and query hooks.

---

## 9. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| React Query migration breaks existing behavior | High | Medium | Migrate one module at a time. Compare before/after behavior for each page. |
| DataTable doesn't fit all table variations | Medium | Medium | Keep it flexible via render props and slot props. Pages with truly unique tables can still use Ant Design directly. |
| Job consolidation loses edge-case behavior | Medium | Low | Catalog all per-page customizations before consolidating. Config objects support per-type overrides. |
| Component decomposition introduces prop-drilling | Low | Medium | Keep decomposition shallow (1-2 levels). Use React Query context for data, not prop chains. |
| Large migration creates merge conflicts | Medium | High | Work module-by-module. Complete and merge each module before starting the next. |

---

*This PRD should be reviewed and approved before implementation begins.*
