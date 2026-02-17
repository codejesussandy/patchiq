# Agent 38: Color System Implementation Guide

**Date:** February 17, 2026
**Goal:** Reduce 89 colors to 35-40, standardize semantic colors, eliminate color palette bloat

---

## Phase 1: Foundation (2-3 hours)

### Step 1.1: Create Color System Files

Create `/frontend/src/styles/colors.css`:

```css
:root {
  /* ============================================
     SEMANTIC COLORS - Primary Color System
     ============================================ */

  /* Primary - Main brand color for buttons, links */
  --color-primary: #1890ff;
  --color-primary-hover: #40a9ff;
  --color-primary-active: #096dd9;

  /* Success - Positive actions, valid states */
  --color-success: #52c41a;
  --color-success-hover: #73d13d;
  --color-success-active: #389e0d;
  --color-success-bg: #f6ffed;
  --color-success-border: #b7eb8f;

  /* Error - Errors, dangerous actions */
  --color-error: #ff4d4f;
  --color-error-hover: #ff7875;
  --color-error-active: #d9363e;
  --color-error-bg: #fff1f0;
  --color-error-border: #ffccc7;

  /* Warning - Warnings, caution states */
  --color-warning: #faad14;
  --color-warning-hover: #ffc53d;
  --color-warning-active: #d48806;
  --color-warning-bg: #fffbe6;
  --color-warning-border: #ffe7ba;

  /* Info - Information, neutral states */
  --color-info: #1890ff;
  --color-info-hover: #40a9ff;
  --color-info-active: #096dd9;
  --color-info-bg: #e6f7ff;
  --color-info-border: #91d5ff;

  /* ============================================
     TEXT COLORS
     ============================================ */

  --color-text: #000000;
  --color-text-primary: rgba(0, 0, 0, 0.85);     /* Primary text - headings, body */
  --color-text-secondary: rgba(0, 0, 0, 0.65);   /* Secondary text - labels, descriptions */
  --color-text-tertiary: rgba(0, 0, 0, 0.45);    /* Tertiary text - hints */
  --color-text-disabled: rgba(0, 0, 0, 0.25);    /* Disabled text */
  --color-text-inverse: #ffffff;

  /* ============================================
     BACKGROUND COLORS
     ============================================ */

  --color-background: #ffffff;                    /* Default/card background */
  --color-background-light: #fafafa;              /* Light alternative */
  --color-background-lighter: #f5f5f5;            /* Even lighter alternative */
  --color-background-page: #f0f2f5;               /* Page background */
  --color-background-disabled: #f5f5f5;           /* Disabled element background */

  /* ============================================
     BORDER COLORS
     ============================================ */

  --color-border: #d9d9d9;                        /* Default border */
  --color-border-light: #f0f0f0;                  /* Light border */
  --color-border-lighter: #fafafa;                /* Lightest border */

  /* ============================================
     GRAYSCALE PALETTE (Ant Design Standard)
     ============================================ */

  --color-black: #000000;
  --color-gray-1: #141414;                        /* Darkest */
  --color-gray-2: #262626;
  --color-gray-3: #434343;
  --color-gray-4: #595959;
  --color-gray-5: #8c8c8c;
  --color-gray-6: #bfbfbf;
  --color-gray-7: #d9d9d9;
  --color-gray-8: #f0f0f0;
  --color-gray-9: #f5f5f5;
  --color-gray-10: #fafafa;
  --color-white: #ffffff;

  /* ============================================
     SEVERITY LEVELS (for patches/vulnerabilities)
     ============================================ */

  --color-severity-critical: #ff4d4f;             /* Critical = Error red */
  --color-severity-high: #ff4d4f;                 /* High = Error red */
  --color-severity-medium: #faad14;               /* Medium = Warning orange */
  --color-severity-low: #52c41a;                  /* Low = Success green */
  --color-severity-info: #1890ff;                 /* Info = Info blue */

  /* ============================================
     DEPRECATED - DO NOT USE
     ============================================ */
  /* These are kept for reference during migration */
  /* Remove after all components are updated */

  /* Non-standard grays (eliminate) */
  /* #1a1a1a, #303030, #333, #555, #888, #999, #a0a0a0,
     #d0d0d0, #e0e0e0, #e8e8e8, #f5f7fa, #f6f6f6, #f6f8fa, #f9f9f9 */

  /* Non-standard reds (eliminate) */
  /* #ff6b72, #ff7a45, #ff0000 */

  /* Non-standard greens (eliminate) */
  /* #87d068, #00b96b, #73d13d */

  /* Non-standard oranges (eliminate) */
  /* #fa8c16, #ffa940, #f9a825, #ffbf00 */

  /* Non-standard blues (eliminate) */
  /* #0078d4 (Windows blue), #0050b3, #40a9ff, #13c2c2, #096dd9,
     #2db7f5, #108ee9, and old backgrounds like #E3F2FD, #BBDEFB, #90CAF9 */
}

/* ============================================
   DARK MODE SUPPORT (Future)
   ============================================ */

@media (prefers-color-scheme: dark) {
  :root {
    /* Invert text colors for dark mode */
    --color-text-primary: rgba(255, 255, 255, 0.85);
    --color-text-secondary: rgba(255, 255, 255, 0.65);
    --color-text-tertiary: rgba(255, 255, 255, 0.45);
    --color-text-disabled: rgba(255, 255, 255, 0.25);

    /* Adjust backgrounds for dark mode */
    --color-background: #141414;
    --color-background-light: #262626;
    --color-background-lighter: #434343;
    --color-background-page: #000000;
  }
}
```

Create `/frontend/src/styles/colors.ts` (for TypeScript usage):

```typescript
/**
 * Color palette constants - Single source of truth
 * Aligned with Ant Design color system
 */

export const COLORS = {
  // Semantic Colors
  primary: '#1890ff',
  success: '#52c41a',
  error: '#ff4d4f',
  warning: '#faad14',
  info: '#1890ff',

  // Text Colors
  text: {
    primary: 'rgba(0, 0, 0, 0.85)',
    secondary: 'rgba(0, 0, 0, 0.65)',
    tertiary: 'rgba(0, 0, 0, 0.45)',
    disabled: 'rgba(0, 0, 0, 0.25)',
  },

  // Background Colors
  background: {
    default: '#ffffff',
    light: '#fafafa',
    lighter: '#f5f5f5',
    page: '#f0f2f5',
    disabled: '#f5f5f5',
  },

  // Border Colors
  border: {
    default: '#d9d9d9',
    light: '#f0f0f0',
    lighter: '#fafafa',
  },

  // Grayscale
  gray: {
    black: '#000000',
    1: '#141414',
    2: '#262626',
    3: '#434343',
    4: '#595959',
    5: '#8c8c8c',
    6: '#bfbfbf',
    7: '#d9d9d9',
    8: '#f0f0f0',
    9: '#f5f5f5',
    10: '#fafafa',
    white: '#ffffff',
  },

  // Severity Levels
  severity: {
    critical: '#ff4d4f',
    high: '#ff4d4f',
    medium: '#faad14',
    low: '#52c41a',
    info: '#1890ff',
  },

  // Status Colors (for semantic meaning)
  status: {
    success: '#52c41a',
    warning: '#faad14',
    error: '#ff4d4f',
    processing: '#1890ff',
  },

  // Background Variants (for status colors)
  statusBg: {
    successBg: '#f6ffed',
    errorBg: '#fff1f0',
    warningBg: '#fffbe6',
    infoBg: '#e6f7ff',
  },
} as const;

export type ColorKey = keyof typeof COLORS;
```

### Step 1.2: Import Color System in Main App

Update `/frontend/src/index.css`:

```css
/* Import color system */
@import './styles/colors.css';

/* Use color variables */
body {
  color: var(--color-text-primary);
  background-color: var(--color-background-page);
}

/* ... rest of global styles ... */
```

### Step 1.3: Update TypeScript Config Path Alias (Optional)

Add to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@colors": ["./src/styles/colors.ts"],
      "@styles": ["./src/styles"]
    }
  }
}
```

---

## Phase 2: Critical Fixes (3-4 hours)

### Step 2.1: Fix SeverityBadge.tsx (CRITICAL)

**File:** `/frontend/src/components/patches/SeverityBadge.tsx`

```typescript
import { Tag } from 'antd';
import { COLORS } from '@colors';

type SeverityBadgeProps = {
  severity: string;
  showIcon?: boolean;
};

const severityConfig: Record<string, { color: string; icon: string; label: string }> = {
  CRITICAL: {
    color: COLORS.severity.critical,  // #ff4d4f
    icon: '●',
    label: 'Critical severity'
  },
  HIGH: {
    color: COLORS.severity.high,       // #ff4d4f (same as critical)
    icon: '▲',
    label: 'High severity'
  },
  MEDIUM: {
    color: COLORS.severity.medium,     // #faad14
    icon: '■',
    label: 'Medium severity'
  },
  LOW: {
    color: COLORS.severity.low,        // #52c41a
    icon: '◆',
    label: 'Low severity'
  },
  UNSPECIFIED: {
    color: COLORS.severity.info,       // #1890ff
    icon: '○',
    label: 'Unspecified severity'
  },
};

export const SeverityBadge = ({ severity, showIcon = true }: SeverityBadgeProps) => {
  const key = severity.toUpperCase();
  const config = severityConfig[key] || {
    color: COLORS.gray[7],              // #d9d9d9
    icon: '○',
    label: `${severity} severity`
  };

  return (
    <Tag
      color={config.color}
      style={{ border: 'none', fontWeight: 500 }}
      role="status"
      aria-label={config.label}
    >
      {showIcon && <span aria-hidden="true" style={{ marginRight: 4 }}>{config.icon}</span>}
      {severity}
    </Tag>
  );
};
```

**Changes:**
- HIGH: #ff7a45 → #ff4d4f
- MEDIUM: #ffa940 → #faad14
- Use color constants from `COLORS`

### Step 2.2: Remove Windows Blue #0078d4

**Search across entire project:**

```bash
grep -r "#0078d4" frontend/src --include="*.tsx" --include="*.ts"
```

**Files to update:**
1. `/components/patches/OSIcon.tsx` - Keep for Windows icon, but mark as OS-specific
2. `/pages/assets/components/AddAssetModalSteps.tsx` - Replace with #1890ff
3. `/pages/settings/AgentConfiguration.tsx` - Replace with #1890ff

**Example replacement:**

```typescript
// BEFORE:
<WindowsOutlined style={{ color: '#0078d4', fontSize: '16px' }} />

// AFTER:
<WindowsOutlined style={{ color: COLORS.primary, fontSize: '16px' }} />
```

### Step 2.3: Standardize Scrollbar Colors in index.css

**File:** `/frontend/src/index.css`

```css
/* Table scrollbars - use standard grays */
.ant-table-wrapper .ant-table .ant-table-container .ant-table-content::-webkit-scrollbar-thumb:hover {
  background: var(--color-gray-5) !important;  /* #8c8c8c instead of #999 */
}
```

---

## Phase 3: Component Migration (6-8 hours)

### Step 3.1: Top Priority Files (Complete this sprint)

Follow this pattern for each file:

1. Import color constants
2. Replace hardcoded hex values with color variables
3. Test for visual regressions
4. Update any tests

**Template for migration:**

```typescript
// BEFORE:
const colorMap = {
  success: '#52c41a',
  error: '#ff4d4f',
  warning: '#faad14',
};

// AFTER:
import { COLORS } from '@colors';

const colorMap = {
  success: COLORS.success,
  error: COLORS.error,
  warning: COLORS.warning,
};
```

### Step 3.2: File Priority Order

**Batch 1 (Already fixed in Phase 2):**
- [ ] `components/patches/SeverityBadge.tsx`
- [ ] `components/patches/OSIcon.tsx`
- [ ] `components/patches/EndpointDetailsDrawer.tsx` (verify consistency)

**Batch 2 (Next - 2-3 hours):**
- [ ] `components/chat/AIChatPanel.css` (33 colors - large refactor)
- [ ] `pages/Dashboard.tsx` (23 colors)
- [ ] `pages/assets/components/tabs/PatchesSummaryCards.tsx` (19 colors)

**Batch 3 (Following - 2-3 hours):**
- [ ] `pages/assets/components/tabs/TelemetryTab.tsx` (17 colors)
- [ ] `pages/assets/components/tabs/LifecycleTab.tsx` (17 colors)
- [ ] `components/NotificationDropdown.tsx` (15 colors)
- [ ] `pages/settings/components/RoleCapabilitiesPicker.tsx` (15 colors)

**Batch 4 (Future - 2-3 hours):**
- [ ] `components/ColumnSettingsDrawer.tsx` (15 colors)
- [ ] `components/AvatarWithInitials.tsx` (15 colors)
- [ ] `pages/vulnerability/components/VulnerabilityStatsCards.tsx` (12 colors)
- [ ] All remaining 30+ files with hardcoded colors

### Step 3.3: Migration Example - AIChatPanel.css

**Before:**
```css
.ai-chat-button {
  color: #1890ff;
  background-color: #ffffff;
  border-color: #d9d9d9;
}

.ai-chat-button:hover {
  color: #40a9ff;
  background-color: #fafafa;
}

.ai-chat-message {
  color: #262626;
  background-color: #f5f5f5;
}
```

**After:**
```css
.ai-chat-button {
  color: var(--color-primary);
  background-color: var(--color-background);
  border-color: var(--color-border);
}

.ai-chat-button:hover {
  color: var(--color-primary-hover);
  background-color: var(--color-background-light);
}

.ai-chat-message {
  color: var(--color-text-primary);
  background-color: var(--color-background-lighter);
}
```

---

## Phase 4: Validation & Documentation (1-2 hours)

### Step 4.1: Create Color Validation Script

Create `/frontend/scripts/validate-colors.mjs`:

```javascript
import { execSync } from 'child_process';
import fs from 'fs';

const INVALID_COLORS = [
  '#1a1a1a', '#303030', '#333', '#555', '#888', '#999', '#a0a0a0',
  '#d0d0d0', '#e0e0e0', '#e8e8e8', '#f5f7fa', '#f6f6f6', '#f6f8fa', '#f9f9f9',
  '#ff6b72', '#ff7a45', '#ff0000', '#87d068', '#00b96b', '#73d13d',
  '#fa8c16', '#ffa940', '#f9a825', '#ffbf00',
  '#0078d4', '#0050b3', '#40a9ff', '#13c2c2', '#096dd9', '#2db7f5', '#108ee9'
];

console.log('🔍 Validating color palette...\n');

let issues = 0;

for (const color of INVALID_COLORS) {
  try {
    const result = execSync(`grep -r "${color}" frontend/src --include="*.tsx" --include="*.ts" --include="*.css" 2>/dev/null`,
      { encoding: 'utf-8' });

    if (result) {
      console.log(`❌ Found non-standard color: ${color}`);
      const files = result.split('\n').filter(l => l).length;
      console.log(`   ${files} instance(s)\n`);
      issues += files;
    }
  } catch (e) {
    // Color not found, which is good
  }
}

if (issues === 0) {
  console.log('✅ All colors are standardized!');
  process.exit(0);
} else {
  console.log(`\n⚠️  ${issues} non-standard color(s) still in use`);
  process.exit(1);
}
```

**Run validation:**
```bash
node frontend/scripts/validate-colors.mjs
```

### Step 4.2: Update Documentation

Add to `backend/src/CONVENTIONS.md`:

```markdown
## Color System

### Using the Color System

All UI colors must come from the standardized color palette defined in:
- CSS: `frontend/src/styles/colors.css`
- TypeScript: `frontend/src/styles/colors.ts`

### Semantic Colors (Required)

- **Primary (#1890ff):** Buttons, links, focus states
- **Success (#52c41a):** Success messages, positive states
- **Error (#ff4d4f):** Errors, dangerous actions, delete
- **Warning (#faad14):** Warnings, caution states
- **Info (#1890ff):** Informational messages, neutral feedback

### Grayscale (Use only these)

```
#000000 (black)
#141414, #262626, #434343, #595959, #8c8c8c, #bfbfbf, #d9d9d9,
#f0f0f0, #f5f5f5, #fafafa, #ffffff (white)
```

### Severity Levels

- **Critical:** #ff4d4f (error red)
- **High:** #ff4d4f (same as critical)
- **Medium:** #faad14 (warning orange)
- **Low:** #52c41a (success green)

### Usage Examples

**CSS:**
```css
.button {
  color: var(--color-primary);
  background-color: var(--color-background);
}

.error {
  color: var(--color-error);
}
```

**TypeScript:**
```typescript
import { COLORS } from '@colors';

<Tag color={COLORS.success}>Active</Tag>
<Icon style={{ color: COLORS.error }} />
```

### Deprecated (DO NOT USE)

Never use these colors:
- #0078d4 (Windows blue - use #1890ff)
- #1a1a1a, #303030, #333, #555, #888, #999 (non-standard grays)
- #ff7a45, #ff0000 (non-standard reds)
- #87d068, #00b96b (non-standard greens)
- #fa8c16, #ffa940 (non-standard oranges)
```

### Step 4.3: Pre-commit Hook (Optional)

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Validate colors
node frontend/scripts/validate-colors.mjs
if [ $? -ne 0 ]; then
  echo "❌ Color validation failed. Fix non-standard colors before committing."
  exit 1
fi

# Continue with other checks...
```

---

## Testing Checklist

### Visual Testing
- [ ] Dashboard displays with correct colors
- [ ] Severity badges show correct colors (CRITICAL, HIGH, MEDIUM, LOW)
- [ ] All buttons use primary blue (#1890ff)
- [ ] Success states display green (#52c41a)
- [ ] Error states display red (#ff4d4f)
- [ ] Warning states display orange (#faad14)
- [ ] All grays are from standard palette
- [ ] No #0078d4 (Windows blue) in UI elements

### Accessibility Testing
- [ ] All text meets WCAG AA contrast ratios
- [ ] Error text is not red-only (has icon or text descriptor)
- [ ] Color blind friendly (not using red/green only)

### Component Testing
- [ ] SeverityBadge shows correct colors for all severity levels
- [ ] NotificationDropdown uses standard colors
- [ ] Asset detail tabs use standard colors
- [ ] All pages render without console errors

### Automated Testing
- [ ] Run color validation script: `node frontend/scripts/validate-colors.mjs`
- [ ] Run unit tests: `npm test`
- [ ] Run E2E tests: `npm run test:e2e`
- [ ] Check for visual regressions in screenshot tests

---

## Rollback Plan

If critical issues occur during migration:

1. **Revert changes:**
   ```bash
   git revert <commit-hash>
   ```

2. **Partial rollback (file by file):**
   ```bash
   git checkout HEAD~1 frontend/src/components/patches/SeverityBadge.tsx
   ```

3. **Hotfix procedure:**
   - Document the issue
   - Fix on new branch `hotfix/color-system-issue`
   - Test thoroughly before merging

---

## Success Criteria

- [ ] Color count: 89 → 35-40 (60% reduction)
- [ ] Grayscale shades: 29 → 13 (55% reduction)
- [ ] Semantic color variations: 37 → 5 (86% reduction)
- [ ] All pages tested and visually consistent
- [ ] No console errors related to colors
- [ ] Accessibility compliance validated
- [ ] Documentation updated
- [ ] Team trained on new color system

---

## Timeline

**Week 1 (Phase 1-2):**
- Day 1: Create color system files, update imports
- Days 2-3: Fix SeverityBadge, remove Windows blue
- Day 4-5: Test and validate Phase 1-2

**Week 2 (Phase 3):**
- Days 1-3: Migrate Batch 1 files
- Days 4-5: Migrate Batch 2 files
- Test and document

**Week 3 (Phase 4):**
- Days 1-2: Migrate Batch 3 files
- Days 3-4: Validation and documentation
- Day 5: Final testing and launch

**Future:**
- Continue Batch 4 migrations incrementally
- Monitor for any color-related issues
- Update design system documentation

---

**Status:** Ready for implementation
**Next Step:** Start Phase 1 (Foundation setup)
