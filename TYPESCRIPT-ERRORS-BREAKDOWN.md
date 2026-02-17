# TypeScript Errors - Comprehensive Breakdown

**Date:** 2026-02-17
**Total Errors:** 333
**Status:** Analysis Complete

---

## 📊 Error Categories

### 1. DataTablePagination Missing Properties (~80 errors)

**Issue:** DataTablePagination interface missing commonly used properties

**Examples:**
```typescript
// Error: 'showSizeChanger' does not exist in type 'DataTablePagination'
pagination={{
  current: 1,
  pageSize: 10,
  total: 100,
  onChange: handleChange,
  showSizeChanger: true,  // ❌ Not in interface
  showTotal: (total) => `Total ${total}`,  // ❌ Not in interface
  pageSizeOptions: ['10', '20', '50'],  // ❌ Not in interface
  showQuickJumper: true,  // ❌ Not in interface
}}
```

**Fix:**
```typescript
export interface DataTablePagination {
  current: number;
  pageSize: number;
  total: number;
  onChange: (page: number, pageSize: number) => void;
  // Add these:
  showSizeChanger?: boolean;
  showTotal?: (total: number, range: [number, number]) => React.ReactNode;
  pageSizeOptions?: string[] | number[];
  showQuickJumper?: boolean;
  size?: 'default' | 'small';
}
```

**Files Affected:** ~40 files (all DataTable usages with pagination)

---

### 2. DataTable Type Constraint Issues (~100 errors)

**Issue:** DataTable requires `T extends Record<string, unknown>` but typed arrays don't satisfy this

**Examples:**
```typescript
// Error: Type 'AssetRelatedPatch[]' is not assignable to type 'Record<string, unknown>[]'
<DataTable
  data={assetPatches}  // AssetRelatedPatch[] ❌
  columns={columns}
/>

// Error: Type 'PatchRecommendation[]' is not assignable to type 'Record<string, unknown>[]'
<DataTable
  data={recommendations}  // PatchRecommendation[] ❌
  columns={columns}
/>
```

**Root Cause:** TypeScript interfaces without explicit index signatures don't satisfy `Record<string, unknown>`

**Fix Options:**

**Option A:** Make DataTable fully generic (Recommended)
```typescript
export interface DataTableProps<T = any> {
  data: T[] | undefined;
  columns: DataTableColumn<T>[];
  // ...
}

export function DataTable<T = any>({ ... }) { ... }
```

**Option B:** Add type assertions at call sites (~100 locations)
```typescript
<DataTable
  data={assetPatches as Record<string, unknown>[]}
  columns={columns as DataTableColumn<Record<string, unknown>>[]}
/>
```

**Option C:** Add index signatures to all interfaces (not recommended)
```typescript
interface AssetRelatedPatch {
  id: string;
  name: string;
  // ...
  [key: string]: unknown;  // Makes it satisfy Record<string, unknown>
}
```

---

### 3. Partial Pagination Objects (~40 errors)

**Issue:** Pagination objects missing required fields

**Examples:**
```typescript
// Error: Type '{ pageSize: number }' missing: current, total, onChange
pagination={{ pageSize: 10 }}

// Error: Type '{ current: number; pageSize: number }' missing: total, onChange
pagination={{ current: 1, pageSize: 20 }}
```

**Fix Options:**

**Option A:** Make DataTablePagination fields optional
```typescript
export interface DataTablePagination {
  current?: number;
  pageSize?: number;
  total?: number;
  onChange?: (page: number, pageSize: number) => void;
}
```

**Option B:** Provide default values in DataTable component
```typescript
const paginationConfig = pagination ? {
  current: pagination.current ?? 1,
  pageSize: pagination.pageSize ?? 10,
  total: pagination.total ?? 0,
  onChange: pagination.onChange ?? (() => {}),
  ...pagination
} : false;
```

**Option C:** Fix all call sites to provide complete pagination (~40 locations)

---

### 4. Null vs Undefined Mismatches (~30 errors)

**Issue:** Backend returns `null`, TypeScript types expect `undefined`

**Examples:**
```typescript
// Error: Type 'string | null' is not assignable to type 'string | undefined'
const mitreAttack: MitreAttack = {
  tactic: vulnerability.tactic,  // string | null ❌
  technique: vulnerability.technique,  // string | null ❌
};

// Error in VulnerabilityDetail
Types of property 'lastModified' are incompatible.
  Type 'string | null' is not assignable to type 'string | undefined'
```

**Fix Options:**

**Option A:** Update type definitions to allow null
```typescript
interface MitreAttack {
  tactic: string | null | undefined;
  technique: string | null | undefined;
  subTechnique: string | null | undefined;
  description: string | null | undefined;
}
```

**Option B:** Add null coalescing at call sites
```typescript
const mitreAttack: MitreAttack = {
  tactic: vulnerability.tactic ?? undefined,
  technique: vulnerability.technique ?? undefined,
};
```

---

### 5. Enum Value Mismatches (~25 errors)

**Issue:** String comparisons with wrong enum casing

**Examples:**
```typescript
// Error: Types '"PENDING" | "COMPLETED" | "FAILED"' and '"SUCCESS"' have no overlap
if (deployment.status === 'SUCCESS') { }  // ❌ Wrong case

// Error: Types '"failed" | "recommended"' and '"RECOMMENDED"' have no overlap
if (recommendation.status === 'RECOMMENDED') { }  // ❌ Wrong case
```

**Fix:** Use correct enum values
```typescript
// Check actual enum definition:
enum DeploymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  // No 'SUCCESS'!
}

// Fix comparisons:
if (deployment.status === DeploymentStatus.COMPLETED) { }
if (recommendation.status === 'recommended') { }  // lowercase
```

---

### 6. Menu onClick Handler Type Mismatches (~15 errors)

**Issue:** ActionMenu/MenuItem onClick handler signature mismatch

**Examples:**
```typescript
// Error: Type incompatible with MenuClickEventHandler
const items = [
  {
    key: '1',
    label: 'Edit',
    onClick: (info: { domEvent: React.MouseEvent }) => handleEdit(),  // ❌
  }
];
```

**Fix:** Use correct Ant Design menu item type
```typescript
import type { MenuProps } from 'antd';

const items: MenuProps['items'] = [
  {
    key: '1',
    label: 'Edit',
    onClick: ({ domEvent }) => handleEdit(),  // ✅
  }
];
```

---

### 7. Implicit Any Types (~20 errors)

**Issue:** Parameters without explicit types

**Examples:**
```typescript
// Error: Parameter 'total' implicitly has an 'any' type
showTotal: (total, range) => `Total ${total} items`

// Error: Parameter 'keys' implicitly has an 'any' type
onSelectionChange: (keys, rows) => setSelectedKeys(keys)
```

**Fix:** Add explicit types
```typescript
showTotal: (total: number, range: [number, number]) => `Total ${total} items`
onSelectionChange: (keys: React.Key[], rows: Asset[]) => setSelectedKeys(keys)
```

---

### 8. Missing Properties (~20 errors)

**Issue:** Properties used that don't exist in type definitions

**Examples:**
```typescript
// Error: Property 'title' does not exist on type 'Patch'
const patchTitle = patch.title;  // ❌

// Error: Property 'subCategories' does not exist on type 'Category'
const subs = category.subCategories;  // ❌

// Error: 'targetAgentIds' does not exist in type 'Partial<Deployment>'
const deployment = { targetAgentIds: [1, 2, 3] };  // ❌
```

**Fix:** Add missing properties to type definitions or use correct property names

---

### 9. Unused Type Imports in shared/types/api.ts (~15 errors)

**Issue:** Types imported but never used in file

**Examples:**
```typescript
// Error: 'DeploymentStatus' is declared but never used
import type {
  DeploymentStatus,  // ❌ Imported but not used
  DeploymentType,    // ❌ Imported but not used
  // ... 13 more
} from './enums';
```

**Fix Options:**

**Option A:** Remove unused imports
**Option B:** Add `// @ts-expect-error` for each
**Option C:** Use `// eslint-disable-next-line @typescript-eslint/no-unused-vars` per import
**Option D:** Export them if they're meant to be re-exported

---

### 10. Type Assertion Issues (~15 errors)

**Issue:** Type conversions without proper checks

**Examples:**
```typescript
// Error: Type 'Record<string, unknown>[]' not assignable to 'Organization[]'
const orgs = apiResponse.data as Organization[];  // ❌ Unsafe

// Error: Type 'unknown' is not assignable to type 'string'
const name = license.name;  // ❌ license is unknown
```

**Fix:** Add proper type guards or assertions
```typescript
const orgs = apiResponse.data as Organization[];  // Add runtime validation
if (typeof license.name === 'string') {
  const name = license.name;  // ✅ Type-safe
}
```

---

### 11. Other Miscellaneous (~13 errors)

- Ref type mismatches (HTMLInputElement vs InputRef)
- Empty object `{}` assigned to ReactNode
- ChatMessage role string literal issues
- Form onChange handler signatures
- Possibly undefined property accesses

---

## 🎯 Recommended Fix Strategy

### Phase 1: DataTable Core (Fixes ~180 errors)

**Time:** 30 minutes

1. **Update DataTablePagination interface:**
   ```typescript
   export interface DataTablePagination {
     current?: number;
     pageSize?: number;
     total?: number;
     onChange?: (page: number, pageSize: number) => void;
     showSizeChanger?: boolean;
     showTotal?: (total: number, range: [number, number]) => React.ReactNode;
     pageSizeOptions?: string[] | number[];
     showQuickJumper?: boolean;
     size?: 'default' | 'small';
   }
   ```

2. **Make DataTable fully generic:**
   ```typescript
   export interface DataTableProps<T = any> { ... }
   export function DataTable<T = any>({ ... }) { ... }
   ```

**Impact:** Fixes ~180/333 errors (54%)

---

### Phase 2: Enum Fixes (Fixes ~25 errors)

**Time:** 20 minutes

1. Find and fix all enum comparison issues
2. Use correct enum values (case-sensitive)
3. Import enums where needed

---

### Phase 3: Null/Undefined (Fixes ~30 errors)

**Time:** 30 minutes

1. Update type definitions to allow both null and undefined
2. Or add null coalescing operators at usage sites

---

### Phase 4: Type Annotations (Fixes ~35 errors)

**Time:** 20 minutes

1. Add explicit types to callback parameters
2. Fix MenuItem onClick signatures
3. Add missing type annotations

---

### Phase 5: Cleanup (~63 remaining errors)

**Time:** 1-2 hours

1. Fix missing properties
2. Remove/annotate unused imports
3. Fix type assertions
4. Handle miscellaneous issues

---

## ⏱️ Time Estimates

| Approach | Time | Errors Fixed | Trade-offs |
|----------|------|--------------|------------|
| **Phase 1 Only** | 30 min | ~180 (54%) | Quick wins, most impactful |
| **Phases 1-4** | 2 hours | ~270 (81%) | Most errors fixed |
| **All Phases** | 3-4 hours | ~333 (100%) | Complete fix |
| **Strategic** | 1 hour | ~220 (66%) | Phase 1 + @ts-expect-error rest |

---

## 💡 Recommended Approach

**Execute Phase 1** (30 minutes) - Highest impact

This single change fixes 180 errors (54%) by:
- Making DataTable flexible with generics
- Adding missing pagination properties
- Allowing optional pagination fields

Then reassess whether to continue or ship with remaining errors documented.

---

## 📝 Alternative: Ship Now

If timeline is critical:

1. ✅ Security fixes are complete and working
2. ✅ Dev server runs fine (errors don't affect runtime)
3. ✅ ESLint is passing
4. 📋 Create ticket: "Fix 333 TypeScript errors" with this breakdown
5. 🚀 Ship security fixes
6. 🔧 Fix TypeScript incrementally

---

**Next Step:** Choose approach and I'll execute it!
