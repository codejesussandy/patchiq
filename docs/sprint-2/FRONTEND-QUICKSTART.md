# Frontend Sprint 2 — Quick Start Guide

**For:** Frontend Developer (Dev 2)
**Goal:** Get started on Sprint 2 Frontend Track in <30 minutes
**Status:** Ready to execute

---

## Setup (15 minutes)

### 1. Install New Dependencies
```bash
cd frontend

# XSS fix (choose one):
npm install react-markdown remark-gfm rehype-raw  # Recommended
# OR
npm install dompurify @types/dompurify            # Alternative

# Performance tooling
npm install --save-dev eslint-plugin-react-memo

# Accessibility testing
npm install --save-dev @axe-core/react
```

### 2. Update ESLint Config
```bash
# frontend/eslint.config.js
export default [
  // ... existing config
  {
    plugins: {
      'react-memo': reactMemoPlugin,
    },
    rules: {
      'react-hooks/exhaustive-deps': 'error',       // Enforce dependency arrays
      'react-memo/require-memo': 'warn',            // Suggest React.memo
      'react-memo/require-usememo': 'warn',         // Suggest useMemo
    },
  },
];
```

### 3. Add Accessibility Testing to Dev Mode
```tsx
// frontend/src/main.tsx (development only)
if (import.meta.env.DEV) {
  import('@axe-core/react').then((axe) => {
    axe.default(React, ReactDOM, 1000);
  });
}
```

### 4. Verify Backend APIs
```bash
# Test if required endpoints exist
curl http://localhost:3000/v1/vulnerabilities/CVE-2024-1234/affected-assets
curl http://localhost:3000/v1/patches/1/vulnerabilities
curl http://localhost:3000/v1/patch-recommendations/bulk-accept -X POST -d '{"ids":[]}'

# If 404, coordinate with backend dev or create mocks
```

---

## Week 1: Security & Performance (Days 1-5)

### Day 1: Fix XSS Vulnerability (F.1)

**File:** `frontend/src/components/chat/AIChatPanel.tsx`

**Current (VULNERABLE):**
```tsx
// Line 157
<div
  dangerouslySetInnerHTML={{ __html: message.content }}
/>
```

**Fix (Option 1 — react-markdown, RECOMMENDED):**
```tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Replace line 157 with:
<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  components={{
    // Custom renderers (optional)
    a: ({ node, ...props }) => (
      <a {...props} target="_blank" rel="noopener noreferrer" />
    ),
    code: ({ node, inline, ...props }) => (
      inline
        ? <code style={{ background: '#f0f0f0', padding: '2px 4px', borderRadius: 3 }} {...props} />
        : <pre style={{ background: '#f0f0f0', padding: 12, borderRadius: 4 }}><code {...props} /></pre>
    ),
  }}
>
  {message.content}
</ReactMarkdown>
```

**Test:**
1. Open chat panel
2. Send message with markdown: `**bold** _italic_ [link](https://example.com)`
3. Verify formatting renders correctly
4. Try XSS payload: `<script>alert('XSS')</script>` — should render as text, not execute
5. Run: `npm audit` — should show 0 high/critical vulnerabilities

**Commit:**
```bash
git add frontend/src/components/chat/AIChatPanel.tsx frontend/package.json
git commit -m "fix(security): remove XSS vulnerability in AI chat (F.1)

- Replace dangerouslySetInnerHTML with react-markdown
- Sanitize all user-generated content before rendering
- Add custom renderers for links and code blocks

Security: OWASP ZAP scan now passes
"
```

---

### Day 2: Add Error Boundaries (F.2)

**Create:** `frontend/src/components/ErrorBoundary.tsx`

```tsx
import React, { Component, ReactNode } from 'react';
import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundary caught:', error, errorInfo);
    // TODO: Send to monitoring service (Sentry, LogRocket, etc.)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback onReset={() => this.setState({ hasError: false, error: undefined })} />;
    }

    return this.props.children;
  }
}

const ErrorFallback = ({ onReset }: { onReset: () => void }) => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: 48, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Result
        status="error"
        title="Something went wrong"
        subTitle="An unexpected error occurred. You can try refreshing the page or return to the dashboard."
        extra={[
          <Button type="primary" onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </Button>,
          <Button onClick={() => window.location.reload()}>
            Refresh Page
          </Button>,
        ]}
      />
    </div>
  );
};

export default ErrorBoundary;
```

**Update:** `frontend/src/App.tsx`

```tsx
import ErrorBoundary from './components/ErrorBoundary';

// Wrap entire app
<ErrorBoundary>
  <ConfigProvider theme={...}>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Routes */}
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </ConfigProvider>
</ErrorBoundary>

// Wrap each route (for granular error handling)
<Routes>
  <Route path="/dashboard" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
  <Route path="/assets" element={<ErrorBoundary><AllAssets /></ErrorBoundary>} />
  {/* ... wrap all routes */}
</Routes>
```

**Test:**
1. Add deliberate error: `throw new Error('Test error')` in Dashboard component
2. Verify error fallback shows, not white screen
3. Click "Go to Dashboard" — app recovers, no refresh needed
4. Remove test error

**Commit:**
```bash
git add frontend/src/components/ErrorBoundary.tsx frontend/src/App.tsx
git commit -m "feat(stability): add error boundaries to prevent crashes (F.2)

- Create ErrorBoundary component with fallback UI
- Wrap all routes with error boundaries
- Add recovery actions (go to dashboard, refresh)
- Log errors for monitoring (TODO: Sentry integration)

UX: No more white screen on errors
"
```

---

### Day 3-4: Implement Lazy Loading (F.3)

**Update:** `frontend/src/App.tsx`

```tsx
import { lazy, Suspense } from 'react';
import { Spin } from 'antd';

// Critical routes (preload on auth)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AllAssets = lazy(() => import('./pages/assets/AllAssets'));
const AllPatches = lazy(() => import('./pages/patches/AllPatches'));
const PatchDetail = lazy(() => import('./pages/patches/PatchDetail'));

// Lazy routes (load on demand)
const Settings = lazy(() => import('./pages/settings'));
const Reports = lazy(() => import('./pages/reports'));
const Discovery = lazy(() => import('./pages/discovery'));
// ... convert all 50+ imports to lazy

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <Spin size="large" tip="Loading..." />
  </div>
);

// In Routes:
<Suspense fallback={<PageLoader />}>
  <Routes>
    <Route path="/dashboard" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
    <Route path="/assets" element={<ErrorBoundary><AllAssets /></ErrorBoundary>} />
    {/* ... all routes */}
  </Routes>
</Suspense>
```

**Optimize Bundle (vite.config.ts):**
```ts
// frontend/vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-antd': ['antd', '@ant-design/icons'],
          'vendor-query': ['@tanstack/react-query'],
        },
      },
    },
    chunkSizeWarningLimit: 500, // Warn if chunk >500KB
  },
});
```

**Test:**
1. Build: `npm run build`
2. Check output:
   ```
   dist/assets/index-abc123.js       120 KB (should be <150KB)
   dist/assets/Dashboard-def456.js    45 KB
   dist/assets/AllAssets-ghi789.js    38 KB
   ```
3. Run Lighthouse audit (Chrome DevTools):
   - Performance score ≥85
   - First Contentful Paint <1.5s
   - Time to Interactive <2.5s
4. Network tab: Verify chunks load on route change

**Commit:**
```bash
git add frontend/src/App.tsx frontend/vite.config.ts
git commit -m "perf(bundle): implement lazy loading for all routes (F.3)

- Convert 50+ static imports to React.lazy()
- Add Suspense boundary with loading spinner
- Configure manual chunks (React, Ant Design, React Query)
- Set chunk size warning limit (500KB)

Performance:
- Initial bundle: 500KB → 120KB (76% reduction)
- FCP: <1.5s, TTI: <2.5s
- Lighthouse score: 90+ (desktop)
"
```

---

## Week 2: Refactoring (Days 5-10)

### Day 5-7: Refactor MainLayout (F.4)

**Step 1: Extract OrganizationSwitcher (Simplest)**

**Create:** `frontend/src/components/layout/OrganizationSwitcher.tsx`
```tsx
import { Select } from 'antd';
import { useOrganizations } from '@/hooks/useOrganizations';

export const OrganizationSwitcher = () => {
  const { data: organizations } = useOrganizations();
  const [currentOrg, setCurrentOrg] = useState(localStorage.getItem('selectedOrg'));

  const handleChange = (orgId: string) => {
    setCurrentOrg(orgId);
    localStorage.setItem('selectedOrg', orgId);
    window.location.reload(); // Or use context to update app-wide
  };

  return (
    <Select
      value={currentOrg}
      onChange={handleChange}
      style={{ width: 200 }}
      options={organizations?.map(org => ({ label: org.name, value: org.id }))}
    />
  );
};
```

**Step 2: Create LayoutContext**

**Create:** `frontend/src/components/layout/LayoutContext.tsx`
```tsx
import { createContext, useContext, useState, ReactNode } from 'react';

interface LayoutContextValue {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
}

const LayoutContext = createContext<LayoutContextValue | undefined>(undefined);

export const LayoutProvider = ({ children }: { children: ReactNode }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <LayoutContext.Provider
      value={{
        sidebarCollapsed,
        setSidebarCollapsed,
        selectedCategory,
        setSelectedCategory,
        chatOpen,
        setChatOpen,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
};

export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) throw new Error('useLayout must be used within LayoutProvider');
  return context;
};
```

**Step 3: Extract NavigationSidebar, ProfileMenu, CategoryPanel**

(Similar pattern — extract components, use `useLayout()` hook for shared state)

**Step 4: Update MainLayout to Compose**

```tsx
// frontend/src/components/MainLayout.tsx (reduced to ~200 lines)
import { LayoutProvider } from './layout/LayoutContext';
import { NavigationSidebar } from './layout/NavigationSidebar';
import { ProfileMenu } from './layout/ProfileMenu';
import { CategoryPanel } from './layout/CategoryPanel';

export const MainLayout = ({ children }: { children: ReactNode }) => {
  return (
    <LayoutProvider>
      <Layout style={{ minHeight: '100vh' }}>
        <NavigationSidebar />
        <Layout>
          <Header style={{ background: '#fff', padding: '0 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h1>PatchIQ</h1>
              <ProfileMenu />
            </div>
          </Header>
          <Content style={{ margin: 24 }}>
            {children}
          </Content>
        </Layout>
        <CategoryPanel />
        <AIChatPanel />
      </Layout>
    </LayoutProvider>
  );
};
```

**Test:**
1. Navigate through all pages — verify navigation works
2. Toggle sidebar — verify no re-render of content area (React DevTools Profiler)
3. Switch organization — verify app updates
4. Measure render time: <50ms (was 120ms)

**Commit:**
```bash
git add frontend/src/components/layout/* frontend/src/components/MainLayout.tsx
git commit -m "refactor(arch): split MainLayout into 5 focused components (F.4)

Components created:
- LayoutContext.tsx (shared state provider)
- OrganizationSwitcher.tsx (org dropdown)
- NavigationSidebar.tsx (menu + routing)
- ProfileMenu.tsx (user dropdown)
- CategoryPanel.tsx (category management)

Impact:
- MainLayout: 1,084 lines → 200 lines (81% reduction)
- Render time: 120ms → 45ms (62% improvement)
- Each component <250 lines, single responsibility

Performance: Profile changes no longer re-render sidebar
"
```

---

### Day 8-9: Add Server-Side Pagination (F.5)

**Update Hook:** `frontend/src/hooks/useAssets.ts`
```tsx
export const useAssets = (options?: {
  page?: number;
  limit?: number;
  filters?: AssetFilters;
}) => {
  const { page = 1, limit = 50, filters } = options || {};

  return useQuery({
    queryKey: ['assets', page, limit, filters],
    queryFn: () => assetService.listAssets({ page, limit, ...filters }),
    keepPreviousData: true, // Show stale data while loading next page
  });
};
```

**Update Service:** `frontend/src/services/asset.service.ts`
```tsx
export const listAssets = async (params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}) => {
  const response = await api.get('/assets', { params });
  return {
    items: response.data.data,      // Current page items
    total: response.data.meta.total, // Total count
    page: response.data.meta.page,
    limit: response.data.meta.limit,
  };
};
```

**Update Component:** `frontend/src/pages/assets/AllAssets.tsx`
```tsx
const [page, setPage] = useState(1);
const pageSize = 50;

const { data, isLoading } = useAssets({ page, limit: pageSize, filters });

// In DataTable:
<DataTable
  data={data?.items || []}
  columns={columns}
  loading={isLoading}
  pagination={{
    current: page,
    pageSize,
    total: data?.total || 0,
    showSizeChanger: true,
    showTotal: (total) => `Total ${total} assets`,
    onChange: (newPage, newPageSize) => {
      setPage(newPage);
      if (newPageSize !== pageSize) {
        setPageSize(newPageSize);
        setPage(1); // Reset to page 1 when changing page size
      }
    },
  }}
/>
```

**Test:**
1. Navigate to /assets
2. Verify loads 50 items in <500ms
3. Click "Next Page" — loads page 2 in <500ms
4. Change page size to 100 — resets to page 1
5. Verify total count displayed: "Total 1,234 assets"

**Commit:**
```bash
git add frontend/src/hooks/useAssets.ts frontend/src/services/asset.service.ts frontend/src/pages/assets/AllAssets.tsx
git commit -m "perf(data): add server-side pagination to asset list (F.5)

- Update useAssets hook to accept page + limit params
- Add keepPreviousData for smooth transitions
- Display total count, page controls
- Default page size: 50 items

Performance:
- Asset list load time: 2-3s → 450ms (84% improvement)
- Supports 10,000+ assets without freeze
"
```

---

## Week 3-4: UX & Accessibility

*(Follow similar pattern for F.6-F.12 — create feature branch, implement, test, commit)*

### Quick Reference: Remaining Features

**F.6 — Vulnerability Detail Page** (2 days)
- Create: `pages/vulnerabilities/VulnerabilityDetail.tsx`
- Service: `vulnerability.service.ts` → `getVulnerabilityDetail(cveId)`
- Route: `/vulnerabilities/:cveId`

**F.7 — Patch Vulnerabilities Tab** (1 day)
- Update: `pages/patches/PatchDetails.tsx` (add tab)
- Hook: `usePatchVulnerabilities(patchId)`

**F.8 — Patch Supersedence** (2 days)
- Update: `PatchDetails.tsx` (add section)
- Update: `recommendationColumns.tsx` (add column)
- Filter: "Hide superseded patches" checkbox

**F.9 — Risk Score Tooltip** (1 day)
- Create: `components/shared/RiskScoreTooltip.tsx`
- Update: `recommendationColumns.tsx` (add tooltip)

**F.10 — ARIA Labels** (1 day)
- Search: `grep -r '<Button icon=' frontend/src/`
- Add: `aria-label` and `title` to all icon buttons

**F.11 — Severity Indicators** (1 day)
- Create: `components/shared/SeverityIndicator.tsx`
- Replace: All color-only severity displays (8+ files)

**F.12 — Keyboard Navigation** (2 days)
- Add: Skip-to-content link in MainLayout
- Test: Complete workflow without mouse
- Fix: Focus traps, tab order issues

---

## Testing Checklist

### After Each Feature
- [ ] Feature works as expected (manual test)
- [ ] No console errors
- [ ] TypeScript compiles (`npm run type-check`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Commit with descriptive message

### End of Week 2 (Phase 1 Complete)
- [ ] Run Lighthouse audit: Performance ≥85
- [ ] Bundle size check: `npm run build` → `dist/assets/*.js` < 150KB initial
- [ ] Security scan: `npm audit` → 0 high/critical
- [ ] Manual smoke test: Login → view asset → view patch → deploy

### End of Week 4 (Phase 2 Complete)
- [ ] axe-core scan: `npm run axe` → 0 critical/serious violations
- [ ] Keyboard navigation test: Complete workflow without mouse (30 min)
- [ ] Screen reader test: NVDA/JAWS announces all elements (20 min)
- [ ] Color contrast check: All text meets 4.5:1 ratio

### End of Week 6 (Phase 3 Complete)
- [ ] Bulk operations test: Accept 10 recommendations in <3s
- [ ] Tablet test: Open app on iPad (768px), verify usable
- [ ] Performance audit: React DevTools Profiler → top 10 components <50ms
- [ ] Full regression test: All 20+ pages load without errors

---

## Daily Workflow

### Morning (30 min)
1. Pull latest: `git pull origin full-dev-sandy-v2`
2. Review PRD feature: Read acceptance criteria, understand requirements
3. Create feature branch: `git checkout -b feat/F.X-feature-name`
4. Plan implementation: Identify files to change, dependencies, tests

### Development (6 hours)
1. Implement feature: Write code, test locally
2. Commit frequently: Small, atomic commits with clear messages
3. Test as you go: Manual test, check console, verify acceptance criteria
4. Refactor: Clean up code, add comments, remove debug logs

### Afternoon (1.5 hours)
1. Final testing: Run full test suite, manual smoke test
2. Code review (self): Check ESLint, TypeScript, accessibility
3. Commit & push: `git push origin feat/F.X-feature-name`
4. Merge to main: Create PR (or merge directly if solo)
5. Update roadmap: Mark feature status as `COMPLETED`

---

## Commands Reference

```bash
# Development
npm run dev              # Start dev server (http://localhost:5173)
npm run build            # Production build
npm run preview          # Preview production build
npm run type-check       # TypeScript validation
npm run lint             # ESLint check
npm run lint:fix         # Auto-fix lint issues

# Testing
npm run test             # Playwright E2E tests (when added)
npm run axe              # Accessibility scan (when added)
npm audit                # Security vulnerability check

# Git
git checkout -b feat/F.X-name   # Create feature branch
git add .
git commit -m "type(scope): message"
git push origin feat/F.X-name
git checkout full-dev-sandy-v2
git merge feat/F.X-name --no-ff
git push origin full-dev-sandy-v2

# Analysis
npx vite-bundle-visualizer  # Visualize bundle size
npx lighthouse http://localhost:5173 --view  # Performance audit
```

---

## Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature (F.1, F.2, etc.)
- `fix`: Bug fix
- `refactor`: Code restructuring (no behavior change)
- `perf`: Performance improvement
- `docs`: Documentation update
- `test`: Test addition/update
- `chore`: Build/tool changes

**Example:**
```
feat(security): remove XSS vulnerability in AI chat (F.1)

- Replace dangerouslySetInnerHTML with react-markdown
- Sanitize all user-generated content before rendering
- Add custom renderers for links and code blocks

Security: OWASP ZAP scan now passes
Closes: #45
```

---

## Questions?

- **PRD:** See [PRD-FRONTEND-OVERHAUL.md](./PRD-FRONTEND-OVERHAUL.md) for detailed requirements
- **Roadmap:** See [ROADMAP-FRONTEND.md](./ROADMAP-FRONTEND.md) for full implementation plan
- **Summary:** See [FRONTEND-EXECUTIVE-SUMMARY.md](./FRONTEND-EXECUTIVE-SUMMARY.md) for quick overview

**Stuck on something?** Check:
1. PRD acceptance criteria for the feature
2. Roadmap code examples
3. Existing similar components (DataTable, FormModal, etc.)
4. Ant Design docs: https://ant.design/components/

---

**Ready to start? Let's ship Sprint 2! 🚀**
