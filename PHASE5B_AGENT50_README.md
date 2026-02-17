# Phase 5B - Agent 50: Firefox Browser Testing

## Start Here

Welcome! This document guides you through Firefox testing for PatchIQ. You'll compare Firefox against a Chrome baseline to ensure cross-browser compatibility.

---

## Prerequisites

**Before you start, ensure:**
- [ ] Agent 49 (Chrome baseline) is COMPLETE
- [ ] Chrome baseline screenshots exist in `/screenshots/chrome/`
- [ ] Firefox 120+ is installed
- [ ] Backend is running (`make dev-backend`)
- [ ] Frontend is running (`make dev-frontend`)
- [ ] Database has test data

**Quick check**:
```bash
# Check Firefox installed
firefox --version

# Check backend running
curl http://localhost:3000/api/health

# Check frontend running
open http://localhost:5173
```

---

## The 5 Documents You Need

### 1. **Read First** (5 min)
**`PHASE5B_AGENTS49-50_BROWSER_TESTING_INDEX.md`**
- Overview of entire initiative
- Quick reference for both agents
- Success criteria
- Timeline expectations

### 2. **Quick Test** (20 min)
**`PHASE5B_AGENT50_FIREFOX_QUICK_START.md`**
- 5-minute setup
- 20-minute testing checklist
- Common issues & fixes
- Good for rapid validation

### 3. **Full Test** (2-3 hours)
**`PHASE5B_AGENT50_FIREFOX_TESTING.md`** ← MAIN REPORT
- Comprehensive testing framework
- 40+ test cases with detailed steps
- Known Firefox issues
- DevTools tips
- Success criteria

### 4. **Deep Dive** (reference)
**`PHASE5B_AGENT50_FIREFOX_TECHNICAL_ANALYSIS.md`**
- Technical details on Firefox
- Known compatibility issues
- Code examples for fixes
- Remediation strategies

### 5. **Chrome Baseline** (reference)
**`PHASE5B_AGENT49_CHROME_BASELINE_TEMPLATE.md`**
- What Agent 49 completed
- Baseline results for comparison
- Color values and performance metrics

---

## Three Ways to Test

### Option 1: Quick Validation (20 minutes)
Best for: Rapid compatibility check
```
1. Read: PHASE5B_AGENT50_FIREFOX_QUICK_START.md
2. Install Firefox 120+
3. Run through quick checklist
4. Take 4-5 key screenshots
5. Done! (Good for sprint testing)
```

### Option 2: Standard Testing (3-4 hours)
Best for: Normal QA cycle
```
1. Read: PHASE5B_AGENT50_FIREFOX_TESTING.md (Part 1-2)
2. Set up Firefox and DevTools
3. Execute 40+ test cases (follow the checklist)
4. Capture 20 screenshots
5. Fill in comparison matrix (Part 7)
6. Document findings
```

### Option 3: Comprehensive Analysis (5+ hours)
Best for: Final release testing
```
1. Do Standard Testing (above)
2. Read: PHASE5B_AGENT50_FIREFOX_TECHNICAL_ANALYSIS.md
3. Deep-dive testing for known Firefox issues
4. Extended real-time testing (30+ minutes for SSE)
5. Performance profiling
6. Create detailed remediation plan if issues found
```

---

## Execution Workflow

### Step 1: Quick Setup (5 minutes)

```bash
# 1. Install Firefox (if needed)
# macOS
brew install firefox

# Windows
# Download from mozilla.org/firefox

# Linux
sudo apt-get install firefox

# 2. Verify installation
firefox --version

# 3. Open Firefox to test app
firefox http://localhost:5173

# 4. Open DevTools (F12)
# Keep DevTools visible in separate window
```

### Step 2: Test Execution (Follow Checklist)

**For Quick Test** (20 min):
1. Open `PHASE5B_AGENT50_FIREFOX_QUICK_START.md`
2. Go through 7 phases (Auth, Dashboard, Assets, etc.)
3. Check "PASS" or "FAIL" for each
4. Take 4 key screenshots
5. Note any issues

**For Standard Test** (3 hours):
1. Open `PHASE5B_AGENT50_FIREFOX_TESTING.md`
2. Part 3: Execute each module's test cases
3. For each test:
   - Follow steps exactly
   - Check all boxes
   - Take required screenshot
   - Note console errors
   - Compare with Chrome baseline
4. Part 7: Fill in Comparison Matrix
5. Part 9: Capture required deliverables

### Step 3: Screenshot Organization

Create directory structure:
```
/screenshots/firefox/
├── 01_login_page.png
├── 02_dashboard.png
├── 03_dashboard_charts.png
├── 04_assets_list.png
├── 05_assets_detail.png
├── 06_patches_list.png
├── 07_patches_cvss_colors.png
├── 08_patches_detail.png
├── 09_vulnerabilities_list.png
├── 10_vulnerabilities_colors.png
├── 11_vulnerabilities_detail.png
├── 12_settings_users.png
├── 13_settings_organization.png
├── 14_theme_dark_mode.png
├── 15_hub_packages.png (if exists)
├── 16_discovery_graph.png (if exists)
├── 17_notification_toast.png
├── 18_devtools_console.png
├── 19_devtools_network.png
└── 20_performance_profile.png
```

### Step 4: Document Findings

Create a Firefox test log:
```markdown
# Firefox Testing Log - [Date]

## Browser Info
Firefox Version: 125.0.6422.142
Platform: macOS 13.5
Resolution: 1920x1080

## Results Summary
- Tests Passed: 40/40
- Issues Found: 0
- Firefox-Specific Bugs: 0
- Performance: Within ±10% of Chrome

## Comparison vs Chrome
[Use Part 7 matrix from main report]

## Issues (if any)
[Document each with severity]

## Conclusion
✓ Firefox fully compatible with Chrome baseline
```

### Step 5: Final Report

Fill in `PHASE5B_AGENT50_FIREFOX_TESTING.md`:
- Part 1: Browser information (complete)
- Part 3: Test results (complete)
- Part 7: Comparison matrix (complete)
- Part 10: Success criteria assessment
- Screenshots: All 20 captured

---

## What You'll Be Testing

### Nine Modules
1. **Authentication** - Login, logout, session
2. **Dashboard** - Stats, charts, real-time
3. **Assets** - List, search, filter, CRUD
4. **Patches** - List, sort, colors, details
5. **Vulnerabilities** - List, colors, details
6. **Settings** - Users, theme, organization
7. **Hub** - Package manager (if exists)
8. **Discovery** - Network visualization (if exists)
9. **Real-Time** - SSE/WebSocket, notifications

### Key Areas to Focus On

**Must Work Same as Chrome**:
- Form validation messages
- Color rendering (especially CVSS scores)
- External link opening
- API data loading
- Modal positioning
- Search/filter functionality

**Known Firefox Differences** (acceptable):
- Scrollbar styling (native vs custom)
- Date picker UI (looks different but works)
- Font rendering (platform difference)
- Animation timing (±50ms)

**Watch Carefully**:
- SSE connection stability (monitor 15+ min)
- Theme toggle speed (<100ms)
- Memory usage (should match Chrome)
- Real-time notifications (appear promptly)

---

## Real-Time Testing (Critical for Firefox)

Firefox has known SSE issues. Test thoroughly:

### SSE Connection Test
```
1. Open Dashboard
2. Open DevTools > Network tab
3. Filter for "eventsource"
4. Look for request to /api/notifications/events
5. Verify status = 200
6. Leave open for 15+ minutes
7. Check if connection remains active
8. Monitor for auto-reconnect if drops
```

**Expected Behavior**:
- Connection opens immediately
- Stays open indefinitely
- Reconnects if drops
- Notifications appear within 100ms

**Firefox Specific Issue**:
- May disconnect after 5-45 minutes of inactivity
- If found: This is a known Firefox limitation
- Mitigation: Server should implement keep-alive heartbeat

---

## Console Monitoring

Keep DevTools Console open during all testing:

### What's OK (Acceptable):
- `Storage API denied for cross-origin` (vendor warning)
- `Some cookies require sameSite` (vendor warning)
- `Deprecated API: XMLHttpRequest.synchronous` (if not our code)

### What's BAD (Must Fix):
- `TypeError: Cannot read property X of undefined`
- `Uncaught Promise rejection`
- `401 Unauthorized` on API calls
- `CORS error`
- `ReferenceError: Y is not defined`

### Console Keyboard Shortcut
- F12: Open DevTools
- Ctrl+Shift+K (Win/Linux) or Cmd+Option+K (Mac): Open Console directly
- Ctrl+Shift+E (Win/Linux) or Cmd+Option+E (Mac): Open Network tab

---

## Performance Comparison

Use DevTools to measure:

### Load Times
```javascript
// In DevTools Console
// Check Network tab "Finish" time for each page load
Dashboard: ___ ms (compare with Chrome)
Assets: ___ ms
Patches: ___ ms
```

### Memory Usage
```
DevTools > Performance tab > Record > Click action > Stop
Note memory usage line
Expected: Similar to Chrome ±20%
```

### Rendering Performance
```
Scroll assets list with 500+ rows
Expected: 60 FPS (or at least 30 FPS minimum)
Check DevTools Performance tab for FPS metric
```

---

## Common Issues & Quick Fixes

### Page Blank
**Quick Fix**:
1. F5 refresh
2. Check Network tab for 404 errors
3. Try hard refresh (Ctrl+Shift+R)
4. Check backend running

### Login Fails
**Quick Fix**:
1. Check DevTools Console for error
2. Check Network tab - POST /auth/login should return 200
3. Try clearing localStorage: `localStorage.clear()`
4. Verify username/password correct
5. Check backend running on port 3000

### Charts Don't Show
**Quick Fix**:
1. Hard refresh (Ctrl+Shift+R)
2. Check Network tab for chart library JS files
3. Look for JavaScript errors in Console
4. Check if data loaded from API

### Theme Toggle Stuck
**Quick Fix**:
1. Open DevTools > Storage > Local Storage
2. Check theme preference saved
3. Try incognito/private window
4. Clear cache and try again

### SSE Connection Down
**Quick Fix**:
1. Check Network tab for EventSource connection
2. Should show status 200 and "eventsource"
3. If disconnected: Page automatically should reconnect
4. If not: This is the known Firefox SSE issue
5. Backend needs keep-alive heartbeat implementation

---

## DevTools Tips

### Finding API Requests
```
Network tab > Filter: "api"
Expand request > Headers tab
Look for:
- Status: Should be 200 (not 4xx/5xx)
- Authorization: Should have "Bearer [token]"
- Response: Should have data
```

### Finding Real-Time Events
```
Network tab > Filter: "eventsource"
Look for request to /api/notifications/events
Status should be 200
Should remain open during test
```

### Checking Colors
```
Inspector tab > Right-click element with color
> Inspect Element
Look for color values in CSS
Compare exact hex values: #f5222d, #fa8c16, etc.
```

### Performance Profiling
```
Performance tab > Red record button
Perform action (load page, scroll, etc.)
Stop recording
Look for:
- Main thread blocking (should be low)
- FPS meter (should be 30+)
- Memory line (should be stable)
```

---

## Success Indicators

### Quick Test Success
- [x] All pages load
- [x] Search/filter works
- [x] Forms submit successfully
- [x] Colors look correct
- [x] No console errors

### Full Test Success
- [x] All 40+ tests pass
- [x] All 20 screenshots captured
- [x] Comparison matrix complete
- [x] Performance within ±20% of Chrome
- [x] SSE stable for 15+ minutes
- [x] No critical console errors
- [x] All Firefox-specific issues documented

---

## When You Find an Issue

Document it as:
```
ISSUE: [Title]
Location: [Page/Module]
Severity: [Critical/High/Medium/Low]
Steps to Reproduce:
  1. [Step 1]
  2. [Step 2]
  3. [Step 3]
Expected: [What should happen]
Actual: [What actually happened]
Firefox-Specific: [YES/NO]
Console Error: [Copy error if present]
Screenshot: [filename]
```

### Issue Severity Guide
- **Critical**: Feature doesn't work, user can't complete task
- **High**: Major visual issue, confusing behavior
- **Medium**: Minor visual issue, workaround available
- **Low**: Cosmetic difference, no functional impact

---

## Document Locations

All files in: `/Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/`

```
Main Report (Read this):
└── PHASE5B_AGENT50_FIREFOX_TESTING.md (41 KB)

Supporting Docs:
├── PHASE5B_AGENT50_FIREFOX_QUICK_START.md (4.5 KB)
├── PHASE5B_AGENT50_FIREFOX_TECHNICAL_ANALYSIS.md (23 KB)
├── PHASE5B_AGENTS49-50_BROWSER_TESTING_INDEX.md (14 KB)
├── PHASE5B_AGENT49_CHROME_BASELINE_TEMPLATE.md (15 KB)
└── PHASE5B_AGENT50_README.md (this file)

Screenshots:
├── /screenshots/chrome/ (Agent 49 baseline)
└── /screenshots/firefox/ (your screenshots)
```

---

## Timeline

- **Quick Test**: 20 minutes
- **Standard Test**: 3-4 hours
- **Comprehensive Test**: 5+ hours

### Recommended Schedule
```
Day 1 (Morning): Read documents & setup
Day 1 (Afternoon): Quick test (20 min) or start standard test
Day 2 (Full): Complete standard/comprehensive test
Day 3 (Morning): Analysis, documentation, sign-off
```

---

## Questions? Check These First

1. **"How do I install Firefox?"**
   → See Quick Setup section above

2. **"Where are the Chrome results I'm comparing to?"**
   → `/screenshots/chrome/` (Agent 49 should have completed)

3. **"What if I find an issue?"**
   → Document it following "When You Find an Issue" section

4. **"How do I know if Firefox-specific or general issue?"**
   → Compare screenshot with Chrome baseline
   → If Chrome doesn't have issue, it's Firefox-specific

5. **"Is this really 4-5 hours?"**
   → Yes, if doing full test (40+ test cases)
   → Quick test is 20 min if you just want basics

6. **"Do I need to run every test case?"**
   → Recommended: Yes (comprehensive coverage)
   → Minimum: Quick test (20 min) is acceptable

7. **"What if browser crashes or SSE disconnects?"**
   → Document it
   → Screenshot if possible
   → Note in report as Firefox-specific issue

---

## Ready to Begin?

### **START HERE:**

1. Open this file: `PHASE5B_AGENT50_README.md` ← You are here
2. Then read: `PHASE5B_AGENT50_FIREFOX_QUICK_START.md` (20 min test)
3. Then read: `PHASE5B_AGENT50_FIREFOX_TESTING.md` (full test)
4. Execute tests in Firefox
5. Capture screenshots
6. Fill in comparison matrix
7. Done!

---

**Good luck! You've got this.**

For detailed technical information, refer to:
- `PHASE5B_AGENT50_FIREFOX_TECHNICAL_ANALYSIS.md` (known issues)
- `PHASE5B_AGENTS49-50_BROWSER_TESTING_INDEX.md` (overview)

**Questions about specific issues?** Check `PHASE5B_AGENT50_FIREFOX_TESTING.md` Part 8 (DevTools Tips) or Part 4 (Known Firefox Issues).

---

**Status**: Ready for Execution
**Generated**: 2026-02-17
**For**: Agent 50 - Firefox Browser Testing Lead
