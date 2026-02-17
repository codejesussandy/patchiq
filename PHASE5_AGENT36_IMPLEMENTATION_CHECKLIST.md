# Phase 5 - Agent 36: Table Standardization Implementation Checklist

## Phase 1: Primary List Pages (9 files, ~2-3 hours)

These pages are most visible to users and should be fixed first.

### 1. Frontend Assets Page
- [ ] File: `frontend/src/pages/assets/AllAssets.tsx`
- [ ] Find line: `<DataTable`
- [ ] Action: Add `size="middle"` prop
- [ ] Verify: Assets load with 56px row height
- [ ] Test: Pagination works, sorting works, selection works

### 2. All Patches Page
- [ ] File: `frontend/src/pages/patches/AllPatches.tsx`
- [ ] Find line: `<DataTable`
- [ ] Action: Add `size="middle"` prop
- [ ] Verify: Patches load with 56px row height
- [ ] Test: Filtering, sorting, bulk actions work

### 3. Patch Deployed (Scheduled)
- [ ] File: `frontend/src/pages/patches/PatchDeployed.tsx`
- [ ] Find line: `<DataTable columns={columns} data={filteredDeployments}`
- [ ] Action: Add `size="middle"` prop
- [ ] Verify: Row height consistent with other tables
- [ ] Test: Filter and sort functionality

### 4. Patch Recommendations / Patch Jobs
- [ ] File: `frontend/src/pages/patches/PatchRecommendations.tsx`
- [ ] Find line: `<DataTable` (main table)
- [ ] Action: Add `size="middle"` prop
- [ ] Verify: Visual consistency with /patches page
- [ ] Test: Pagination and filtering

### 5. Vulnerabilities List
- [ ] File: `frontend/src/pages/vulnerability/Vulnerabilities.tsx`
- [ ] Find line: `<DataTable` (main vulnerabilities table)
- [ ] Action: Add `size="middle"` prop
- [ ] Verify: Consistent with other list pages
- [ ] Test: Row selection, filtering, search

### 6. Manage Vulnerability Exceptions
- [ ] File: `frontend/src/pages/vulnerability/ManageException.tsx`
- [ ] Find line: `<DataTable`
- [ ] Action: Add `size="middle"` prop
- [ ] Verify: Matches Vulnerabilities page styling
- [ ] Test: Exception creation and filtering

### 7. IP Discovery
- [ ] File: `frontend/src/pages/discovery/IPDiscovery.tsx`
- [ ] Find line: `<DataTable columns={columns} data={paginatedData}`
- [ ] Action: Add `size="middle"` prop
- [ ] Verify: Consistent row height
- [ ] Test: Pagination, search, CRUD operations

### 8. Device Credentials
- [ ] File: `frontend/src/pages/discovery/DeviceCredentials.tsx`
- [ ] Find line: `<DataTable columns={columns} data={paginatedData}`
- [ ] Action: Add `size="middle"` prop
- [ ] Verify: Consistent with IP Discovery
- [ ] Test: Add/edit/delete credentials

### 9. Discovery Agents
- [ ] File: `frontend/src/pages/discovery/Agents.tsx`
- [ ] Find line: `<DataTable columns={columns} data={filteredAgents}`
- [ ] Action: Add `size="middle"` prop
- [ ] Verify: Consistent with other discovery pages
- [ ] Test: Agent filtering and actions

---

## Phase 2: Settings Pages (40+ files, ~3-4 hours)

Settings pages are less frequently used but still important for consistency.

### User Management Section
- [ ] `frontend/src/pages/settings/Users.tsx` - User list table
- [ ] `frontend/src/pages/settings/UserRoles.tsx` - Roles table
- [ ] `frontend/src/pages/settings/UserLocation.tsx` - User location table
- [ ] `frontend/src/pages/settings/RolesAndPrivileges.tsx` - Privileges table

### Patch Management Section
- [ ] `frontend/src/pages/settings/ComputerGroups.tsx` - Computer groups table
- [ ] `frontend/src/pages/settings/PatchPreferences.tsx` - Check for DataTable
- [ ] `frontend/src/pages/settings/DeploymentPolicies.tsx` - Policies table

### Agent Management Section
- [ ] `frontend/src/pages/settings/AgentApprovals.tsx` - Approvals table
- [ ] `frontend/src/pages/settings/AgentVersions.tsx` - Versions table
- [ ] `frontend/src/pages/settings/AgentNomination.tsx` - If has table

### System Settings Section
- [ ] `frontend/src/pages/settings/Audit.tsx` - Audit log table
- [ ] `frontend/src/pages/settings/LDAPServerConfiguration.tsx` - LDAP table
- [ ] `frontend/src/pages/settings/MarketPlace.tsx` - Marketplace table
- [ ] `frontend/src/pages/settings/EnrollSecret.tsx` - Secret table

### Organization & Integration
- [ ] `frontend/src/pages/settings/Organization.tsx` - Organization table
- [ ] `frontend/src/pages/settings/DistributionServer.tsx` - Distribution servers
- [ ] `frontend/src/pages/settings/VendorLogo.tsx` - Vendor logos table
- [ ] `frontend/src/pages/settings/PolicyManagement.tsx` - Policy management

### Other Settings
- [ ] `frontend/src/pages/settings/NotificationPreferences.tsx` - Check tables
- [ ] `frontend/src/pages/settings/components/PolicyFormModal.tsx` - Modal table
- [ ] Any other settings components with tables

---

## Phase 3: Detail & Tab Pages (Review & Decide, ~1-2 hours)

These pages may intentionally use `size="small"` for nested tables.

### Dashboard
- [ ] File: `frontend/src/pages/Dashboard.tsx`
- [ ] Tables: 2 tables with size="small"
- [ ] Decision: Keep small or standardize to middle?
- [ ] Reasoning: [Document your decision]

### Asset Detail Tabs (18 tables with size="small")
- [ ] SoftwareTab.tsx - Applications, services, licenses
- [ ] PatchesTab.tsx - Patches, deployments
- [ ] PeripheralsTab.tsx - Monitors, USB, printers, audio, Bluetooth
- [ ] SecurityTab.tsx - Encryption, firewall, antivirus, users, patches
- [ ] TelemetryTab.tsx - Processes
- [ ] UnifiedPatchesTab.tsx - Multiple patch tables
- [ ] PatchRecommendationsTab.tsx - Recommendations
- [ ] NetworkTab.tsx - If has tables

**Decision**: These are typically nested and context-specific. Options:
- Option A: Keep size="small" (compact, saves vertical space)
- Option B: Standardize to size="middle" (consistency, better readability)
- **Recommendation**: Keep size="small" for asset detail tabs (visual hierarchy)

### Vulnerability Detail Pages
- [ ] File: `frontend/src/pages/vulnerability/components/CveDetailModal.tsx`
- [ ] Tables: 2 with size="small" (endpoints, software)
- [ ] Decision: Keep small or standardize?
- [ ] Reasoning: Modal is already compact, keep size="small"

### Hub Details
- [ ] File: `frontend/src/pages/hub/components/HubDetailsDrawer.tsx`
- [ ] Tables: 1 with size="small" (versions)
- [ ] Decision: Keep small for drawer context

### Patch Details Page
- [ ] File: `frontend/src/pages/patches/PatchDetails.tsx`
- [ ] Tables: 4 tables (endpoints, recommendations, software, vulnerabilities)
- [ ] Decision: Check if size specified, add if missing

---

## Phase 4: Full Testing & Validation (~2-3 hours)

### Visual Regression Testing

#### Main List Pages
- [ ] Navigate to `/assets` - verify 56px row height
- [ ] Navigate to `/patches` - verify 56px row height
- [ ] Navigate to `/vulnerability/vulnerabilities` - verify 56px row height
- [ ] Navigate to `/discovery/ip-discovery` - verify 56px row height
- [ ] Navigate to `/discovery/device-credentials` - verify 56px row height
- [ ] Navigate to `/discovery/agents` - verify 56px row height
- [ ] Navigate to `/patches/deployed/scheduled` - verify 56px row height
- [ ] Navigate to `/vulnerability/manage-exception` - verify 56px row height

#### Settings Pages
- [ ] Navigate to `/settings/user-management/users` - verify consistency
- [ ] Navigate to `/settings/user-management/roles` - verify consistency
- [ ] Navigate to `/settings/patch-management/computer-groups` - verify consistency
- [ ] Spot-check 3-4 more settings pages for consistency

#### Detail Pages
- [ ] Navigate to any `/assets/{id}` - verify nested tables still look good
- [ ] Navigate to any `/patches/{id}` - verify consistency
- [ ] Check `/vulnerability/vulnerabilities` -> click detail modal

### Functional Testing

For each page updated, verify:
- [ ] Table data loads correctly
- [ ] Pagination controls work (next, prev, page size change)
- [ ] Sorting by columns works
- [ ] Filtering (if available) works
- [ ] Row selection (checkboxes) works
- [ ] Bulk actions (if available) work
- [ ] Row click actions (if available) work
- [ ] Horizontal scroll works on narrow screens
- [ ] Responsive behavior unchanged

### Cross-Browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (if on macOS)
- [ ] Edge (if available)

### Performance Testing
- [ ] Check for any layout shifts or re-renders
- [ ] Verify page load time not affected
- [ ] Check DevTools Performance tab for improvements

---

## Phase 5: Special Cases & Edge Handling (~1 hour)

### Tables in Modals
- [ ] PolcyFormModal.tsx - Check and update if needed
- [ ] CveDetailModal.tsx - Verify size="small" is intentional
- [ ] Other modals with tables - Add size prop

### Tables in Drawers
- [ ] HubDetailsDrawer.tsx - Verify sizing
- [ ] Asset detail drawers - Check any tables

### Nested Tables
- [ ] Check no double-nesting issues
- [ ] Verify scroll behavior on nested tables

### Custom Table Components
- [ ] Check if any custom Table usage (not DataTable)
- [ ] Add size prop to any custom tables

---

## Git Workflow

### Before Starting
```bash
cd frontend
git status  # Ensure working tree clean
git pull origin full-dev-sandy-v2  # Get latest
```

### During Implementation
```bash
# Create branch (optional, depends on repo policy)
git checkout -b feature/agent36-table-standardization

# Make changes in batches (e.g., after each phase)
git add frontend/src/pages/assets/AllAssets.tsx
git add frontend/src/pages/patches/AllPatches.tsx
# ... etc ...

# Commit with meaningful message
git commit -m "fix(frontend): standardize table sizing to size='middle' for consistency - Phase 1 priority pages"
```

### After Implementation
```bash
# Final verification
npm run check  # TypeScript check
npm run lint   # Lint check
npm test       # Run tests if available

# Push to branch or PR
git push origin feature/agent36-table-standardization
```

---

## Documentation Updates

After implementation, update:

### 1. DataTable Component Comments
- [ ] Add JSDoc to DataTable.tsx mentioning size recommendations
- [ ] Add example showing size="middle" as default

### 2. Component Guidelines
- [ ] Update `backend/src/CONVENTIONS.md` with table sizing guidelines
- [ ] Add table sizing to frontend component style guide (if exists)

### 3. PR Description
Template for pull request:
```markdown
## Type of Change
- Table styling consistency standardization

## Summary
Standardized 63 DataTable components to use size="middle" for consistent 56px row height
and 16px cell padding across all list and settings pages.

## Affected Pages
- Primary list pages: 9 files
- Settings pages: 40+ files
- Detail/tab pages: 20+ files (reviewed but minimal changes)

## Testing
- [x] Visual regression tested on all main pages
- [x] Pagination verified
- [x] Sorting/filtering verified
- [x] Selection/bulk actions verified
- [x] Responsive behavior verified

## Related Issues
Resolves user concern: "Tables aren't spaced properly"
```

---

## Rollback Plan (In Case of Issues)

If changes cause regressions:

```bash
# Revert all changes for a specific file
git checkout frontend/src/pages/assets/AllAssets.tsx

# Or revert entire commit
git revert <commit-hash>

# Or go back to previous branch state
git reset --hard origin/full-dev-sandy-v2
```

---

## Success Metrics

After all changes:
- [ ] 89 DataTable instances have explicit size prop
- [ ] 63 previously default tables now have size="middle"
- [ ] 26 small tables reviewed and decision documented
- [ ] Visual consistency achieved across all pages
- [ ] No functional regressions
- [ ] User feedback confirms improvement

---

## Estimated Total Effort

| Phase | Time | Cumulative |
|-------|------|------------|
| Phase 1: Priority Pages | 2-3 hrs | 2-3 hrs |
| Phase 2: Settings Pages | 3-4 hrs | 5-7 hrs |
| Phase 3: Review Decision | 1-2 hrs | 6-9 hrs |
| Phase 4: Testing | 2-3 hrs | 8-12 hrs |
| Phase 5: Edge Cases | 1 hr | 9-13 hrs |
| Documentation | 0.5-1 hr | 9.5-14 hrs |

**Total Estimated: 10-14 hours**

---

## Contact & Questions

For questions about this implementation:
1. Refer to `PHASE5_AGENT36_TABLE_AUDIT_REPORT.md` for full analysis
2. Refer to `PHASE5_AGENT36_QUICK_REFERENCE.md` for quick answers
3. Check DataTable component at `frontend/src/components/shared/DataTable.tsx`

---

**Checklist Prepared By:** Phase 5 - Agent 36
**Date:** February 17, 2026
**Status:** READY FOR IMPLEMENTATION
