# Phase 5B - Agent 50: Firefox Testing Quick Start

## 5-Minute Setup

```bash
# 1. Install Firefox (macOS)
brew install firefox

# 2. Start app stack
make dev-fresh

# 3. Wait for services (backend + frontend ready)
# Check: http://localhost:5173 loads

# 4. Open Firefox
firefox http://localhost:5173

# 5. Press F12 to open DevTools
# Keep side-by-side with browser window
```

## Quick Test Checklist (20 min)

### Phase 1: Auth (2 min)
- [ ] Login with `admin@patchiq.io` / `admin123`
- [ ] Verify token in DevTools > Storage > Local Storage
- [ ] Check Dashboard loads
- [ ] Logout

### Phase 2: Dashboard (3 min)
- [ ] View stats cards (should show numbers)
- [ ] Hover over charts (tooltips appear)
- [ ] Check all colors visible (no rendering issues)
- [ ] Scroll down (all sections visible)

### Phase 3: Assets (5 min)
- [ ] Click Assets in sidebar
- [ ] Wait for table to load
- [ ] Search for "server" (results filter)
- [ ] Click pagination "Next" (new rows load)
- [ ] Click one asset (detail view opens)

### Phase 4: Patches (4 min)
- [ ] Click Patches in sidebar
- [ ] Verify table displays
- [ ] Click one patch (detail opens)
- [ ] Check CVE links are clickable
- [ ] Verify CVSS score colors (red/orange/yellow/green)

### Phase 5: Vulnerabilities (3 min)
- [ ] Click Vulnerabilities in sidebar
- [ ] Verify table displays
- [ ] Check severity colors (critical = red)
- [ ] Use search to find "CVE-2024"
- [ ] Click one CVE (detail opens)

### Phase 6: Settings & Theme (2 min)
- [ ] Click Settings in sidebar
- [ ] Toggle theme to Dark mode
- [ ] Verify UI updates (watch for flashing)
- [ ] Toggle back to Light mode
- [ ] Verify localStorage updated (DevTools > Storage)

### Phase 7: Real-Time (1 min)
- [ ] Keep on Dashboard
- [ ] Monitor Network tab (look for `/api/notifications/events`)
- [ ] Should show "SSE" or "eventsource" connection
- [ ] Connection should remain open (Status 200)

## Console Check

After each module, check DevTools Console:

```javascript
// Copy-paste in console to verify:
localStorage.getItem('auth-token')  // Should return JWT
// Expected: "eyJhbGciOiJIUzI1NiIs..."
```

If you see ERRORS (red text), note them for the report.

## Key Screenshots to Capture

1. **Login page** - Before submitting
2. **Dashboard** - After successful login
3. **Assets list** - Table view
4. **Patches list** - With CVSS colors visible
5. **Vulnerabilities** - Severity color coding
6. **Settings** - Dark theme applied
7. **DevTools Console** - After full test (should be clean)

Save all to: `/screenshots/firefox/`

## Quick Issue Log

If you find problems, document as:

```
ISSUE: [Title]
Location: [Page/Module]
Steps: 1. [Step 1] 2. [Step 2] 3. [Step 3]
Expected: [What should happen]
Actual: [What actually happened]
Severity: [Critical/High/Medium/Low]
Firefox-Only: [YES/NO]
Screenshot: [filename]
```

## Expected Results

| Module | Expected | Status |
|--------|----------|--------|
| Auth | Login works, logout works | ? |
| Dashboard | Charts render, colors show | ? |
| Assets | List loads, search works, pagination works | ? |
| Patches | List loads, CVSS colors visible | ? |
| Vulnerabilities | List loads, colors visible, search works | ? |
| Settings | Theme toggle works, persists | ? |
| Real-Time | SSE connection stable (stays open) | ? |
| Console | No errors (only minor warnings OK) | ? |

## Common Issues & Quick Fixes

| Problem | Quick Check |
|---------|------------|
| Page blank | F5 refresh, check Network tab for 404s |
| Login fails | Check DevTools Console for error, verify backend running |
| Charts don't show | Hard refresh (Ctrl+Shift+R), check Network for chart JS file |
| Buttons don't work | Check Console for JavaScript errors |
| Theme doesn't toggle | Check localStorage cleared, try incognito mode |
| Notifications don't appear | Check Network tab for SSE connection, verify it says "200" |

## Performance Baseline (compare to Chrome)

Use DevTools Performance tab:

```
Dashboard Load Time:
  Chrome: _____ ms
  Firefox: _____ ms

Asset List with 100+ rows, scroll performance:
  Chrome: _____ fps
  Firefox: _____ fps

Memory usage (idle):
  Chrome: _____ MB
  Firefox: _____ MB
```

## Next Steps

1. Run through all 7 phases above
2. Capture screenshots in `/screenshots/firefox/`
3. Document any issues found
4. Open the full report: `PHASE5B_AGENT50_FIREFOX_TESTING.md`
5. Complete the comparison table in Part 7 with actual results

**Estimated Time**: 20-30 minutes for full quick test
**Expected Result**: All PASS if Firefox compatibility good

---

**Last Updated**: 2026-02-17
**For**: Phase 5B - Agent 50: Firefox Browser Testing
