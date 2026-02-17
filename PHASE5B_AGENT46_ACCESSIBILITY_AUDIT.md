# PHASE5B - Agent 46: Accessibility Audit Report

**Generated:** 2026-02-17T14:46:52.869Z
**Standard:** WCAG 2.1 Level AA
**Tool:** axe-core via Playwright

## Executive Summary

### Summary Table

| Page | Critical | Serious | Moderate | Minor | Total | Score |
|------|----------|---------|----------|-------|-------|-------|
| Login | 1 | 2 | 0 | 0 | 3 | 80/100 |
| Dashboard | 1 | 2 | 0 | 0 | 3 | 80/100 |
| Assets List | 0 | 1 | 0 | 0 | 1 | 95/100 |
| Asset Detail | 0 | 1 | 0 | 0 | 1 | 95/100 |
| Patches List | 0 | 1 | 0 | 0 | 1 | 95/100 |
| Patch Detail | 0 | 2 | 0 | 0 | 2 | 90/100 |
| Vulnerabilities List | 0 | 1 | 0 | 0 | 1 | 95/100 |
| Vulnerability Detail | 0 | 0 | 0 | 0 | 0 | 100/100 |
| Settings - User Management | 0 | 1 | 0 | 0 | 1 | 95/100 |
| Hub | 0 | 1 | 0 | 0 | 1 | 95/100 |
| **TOTAL** | **2** | **12** | **0** | **0** | **14** | **92/100** |

### Overall Assessment: ❌ FAIL

- **Total Violations:** 14
- **Average Score:** 92/100 (Target: >= 90)
- **Critical Issues:** 2 (Target: 0)
- **Status:** ❌ Has blocking issues

---

## 1. Critical Violations (Target: 0)

### Login

#### 1. Form elements must have labels

- **Rule ID:** label
- **Impact:** Critical
- **Description:** Ensure every form element has a label
- **WCAG Criteria:** [View Details](https://dequeuniversity.com/rules/axe/4.11/label?application=playwright)
- **Affected Elements:** 1

**Element 1:**
- **Selector:** `#_r_17_`
- **HTML:** `<input id="_r_17_" readonly="" autocomplete="off" class="ant-select-input" role="combobox" aria-expa...`
- **Issue:** Fix any of the following:
  Element does not have an implicit (wrapped) <label>
  Element does not have an explicit <label>
  aria-label attribute does not exist or is empty
  aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty
  Element has no title attribute
  Element has no placeholder attribute
  Element's default semantics were not overridden with role="none" or role="presentation"

### Dashboard

#### 1. Form elements must have labels

- **Rule ID:** label
- **Impact:** Critical
- **Description:** Ensure every form element has a label
- **WCAG Criteria:** [View Details](https://dequeuniversity.com/rules/axe/4.11/label?application=playwright)
- **Affected Elements:** 1

**Element 1:**
- **Selector:** `#_r_1o_`
- **HTML:** `<input id="_r_1o_" readonly="" autocomplete="off" class="ant-select-input" role="combobox" aria-expa...`
- **Issue:** Fix any of the following:
  Element does not have an implicit (wrapped) <label>
  Element does not have an explicit <label>
  aria-label attribute does not exist or is empty
  aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty
  Element has no title attribute
  Element has no placeholder attribute
  Element's default semantics were not overridden with role="none" or role="presentation"

## 2. Serious Violations (Target: < 5 total)

### Login

#### 1. Elements must meet minimum color contrast ratio thresholds

- **Rule ID:** color-contrast
- **Impact:** Serious
- **Description:** Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
- **WCAG Criteria:** [View Details](https://dequeuniversity.com/rules/axe/4.11/color-contrast?application=playwright)
- **Affected Elements:** 31

**Element 1:**
- **Selector:** `.ant-menu-item-selected > .ant-menu-title-content`
- **HTML:** `<span class="ant-menu-title-content">Dashboard</span>`
- **Issue:** Fix any of the following:
  Element has insufficient color contrast of 3.24 (foreground color: #1890ff, background color: #ffffff, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1

**Element 2:**
- **Selector:** `div[aria-label="User profile menu"] > div > div:nth-child(2)`
- **HTML:** `<div style="font-size: 11px; color: rgb(140, 140, 140); white-space: nowrap; overflow: hidden; text-...`
- **Issue:** Fix any of the following:
  Element has insufficient color contrast of 3.36 (foreground color: #8c8c8c, background color: #ffffff, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1

_... and 29 more elements_

#### 2. Interactive controls must not be nested

- **Rule ID:** nested-interactive
- **Impact:** Serious
- **Description:** Ensure interactive controls are not nested as they are not always announced by screen readers or can cause focus problems for assistive technologies
- **WCAG Criteria:** [View Details](https://dequeuniversity.com/rules/axe/4.11/nested-interactive?application=playwright)
- **Affected Elements:** 1

**Element 1:**
- **Selector:** `div[aria-label="Search"]`
- **HTML:** `<div role="button" tabindex="0" aria-label="Search" style="display: flex; align...">`
- **Issue:** Fix any of the following:
  Element has focusable descendants

### Dashboard

#### 1. Elements must meet minimum color contrast ratio thresholds

- **Rule ID:** color-contrast
- **Impact:** Serious
- **Description:** Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
- **WCAG Criteria:** [View Details](https://dequeuniversity.com/rules/axe/4.11/color-contrast?application=playwright)
- **Affected Elements:** 31

**Element 1:**
- **Selector:** `.ant-menu-item-selected > .ant-menu-title-content`
- **HTML:** `<span class="ant-menu-title-content">Dashboard</span>`
- **Issue:** Fix any of the following:
  Element has insufficient color contrast of 3.24 (foreground color: #1890ff, background color: #ffffff, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1

**Element 2:**
- **Selector:** `div[aria-label="User profile menu"] > div > div:nth-child(2)`
- **HTML:** `<div style="font-size: 11px; color: rgb(140, 140, 140); white-space: nowrap; overflow: hidden; text-...`
- **Issue:** Fix any of the following:
  Element has insufficient color contrast of 3.36 (foreground color: #8c8c8c, background color: #ffffff, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1

_... and 29 more elements_

#### 2. Interactive controls must not be nested

- **Rule ID:** nested-interactive
- **Impact:** Serious
- **Description:** Ensure interactive controls are not nested as they are not always announced by screen readers or can cause focus problems for assistive technologies
- **WCAG Criteria:** [View Details](https://dequeuniversity.com/rules/axe/4.11/nested-interactive?application=playwright)
- **Affected Elements:** 1

**Element 1:**
- **Selector:** `div[aria-label="Search"]`
- **HTML:** `<div role="button" tabindex="0" aria-label="Search" style="display: flex; align...">`
- **Issue:** Fix any of the following:
  Element has focusable descendants

### Assets List

#### 1. Elements must meet minimum color contrast ratio thresholds

- **Rule ID:** color-contrast
- **Impact:** Serious
- **Description:** Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
- **WCAG Criteria:** [View Details](https://dequeuniversity.com/rules/axe/4.11/color-contrast?application=playwright)
- **Affected Elements:** 2

**Element 1:**
- **Selector:** `.ant-result-subtitle`
- **HTML:** `<div class="ant-result-subtitle">Failed to fetch dynamically imported module: http://localhost:3500/...`
- **Issue:** Fix any of the following:
  Element has insufficient color contrast of 3.29 (foreground color: #878787, background color: #f5f5f5, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1

**Element 2:**
- **Selector:** `.ant-btn-primary > span`
- **HTML:** `<span>Try Again</span>`
- **Issue:** Fix any of the following:
  Element has insufficient color contrast of 3.24 (foreground color: #ffffff, background color: #1890ff, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1

### Asset Detail

#### 1. Elements must meet minimum color contrast ratio thresholds

- **Rule ID:** color-contrast
- **Impact:** Serious
- **Description:** Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
- **WCAG Criteria:** [View Details](https://dequeuniversity.com/rules/axe/4.11/color-contrast?application=playwright)
- **Affected Elements:** 2

**Element 1:**
- **Selector:** `.ant-result-subtitle`
- **HTML:** `<div class="ant-result-subtitle">Failed to fetch dynamically imported module: http://localhost:3500/...`
- **Issue:** Fix any of the following:
  Element has insufficient color contrast of 3.29 (foreground color: #878787, background color: #f5f5f5, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1

**Element 2:**
- **Selector:** `.ant-btn-primary > span`
- **HTML:** `<span>Try Again</span>`
- **Issue:** Fix any of the following:
  Element has insufficient color contrast of 3.24 (foreground color: #ffffff, background color: #1890ff, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1

### Patches List

#### 1. Elements must meet minimum color contrast ratio thresholds

- **Rule ID:** color-contrast
- **Impact:** Serious
- **Description:** Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
- **WCAG Criteria:** [View Details](https://dequeuniversity.com/rules/axe/4.11/color-contrast?application=playwright)
- **Affected Elements:** 2

**Element 1:**
- **Selector:** `.ant-result-subtitle`
- **HTML:** `<div class="ant-result-subtitle">Failed to fetch dynamically imported module: http://localhost:3500/...`
- **Issue:** Fix any of the following:
  Element has insufficient color contrast of 3.29 (foreground color: #878787, background color: #f5f5f5, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1

**Element 2:**
- **Selector:** `.ant-btn-primary > span`
- **HTML:** `<span>Try Again</span>`
- **Issue:** Fix any of the following:
  Element has insufficient color contrast of 3.24 (foreground color: #ffffff, background color: #1890ff, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1

### Patch Detail

#### 1. Elements must meet minimum color contrast ratio thresholds

- **Rule ID:** color-contrast
- **Impact:** Serious
- **Description:** Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
- **WCAG Criteria:** [View Details](https://dequeuniversity.com/rules/axe/4.11/color-contrast?application=playwright)
- **Affected Elements:** 4

**Element 1:**
- **Selector:** `li[aria-describedby="_r_1a_"] > .ant-menu-title-content`
- **HTML:** `<span class="ant-menu-title-content">Patches</span>`
- **Issue:** Fix any of the following:
  Element has insufficient color contrast of 3.24 (foreground color: #1890ff, background color: #ffffff, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1

**Element 2:**
- **Selector:** `div[aria-label="User profile menu"] > div > div:nth-child(2)`
- **HTML:** `<div style="font-size: 11px; color: rgb(140, 140, 140); white-space: nowrap; overflow: hidden; text-...`
- **Issue:** Fix any of the following:
  Element has insufficient color contrast of 3.36 (foreground color: #8c8c8c, background color: #ffffff, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1

_... and 2 more elements_

#### 2. Interactive controls must not be nested

- **Rule ID:** nested-interactive
- **Impact:** Serious
- **Description:** Ensure interactive controls are not nested as they are not always announced by screen readers or can cause focus problems for assistive technologies
- **WCAG Criteria:** [View Details](https://dequeuniversity.com/rules/axe/4.11/nested-interactive?application=playwright)
- **Affected Elements:** 1

**Element 1:**
- **Selector:** `div[aria-label="Search"]`
- **HTML:** `<div role="button" tabindex="0" aria-label="Search" style="display: flex; align...">`
- **Issue:** Fix any of the following:
  Element has focusable descendants

### Vulnerabilities List

#### 1. Elements must meet minimum color contrast ratio thresholds

- **Rule ID:** color-contrast
- **Impact:** Serious
- **Description:** Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
- **WCAG Criteria:** [View Details](https://dequeuniversity.com/rules/axe/4.11/color-contrast?application=playwright)
- **Affected Elements:** 2

**Element 1:**
- **Selector:** `.ant-result-subtitle`
- **HTML:** `<div class="ant-result-subtitle">Failed to fetch dynamically imported module: http://localhost:3500/...`
- **Issue:** Fix any of the following:
  Element has insufficient color contrast of 3.29 (foreground color: #878787, background color: #f5f5f5, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1

**Element 2:**
- **Selector:** `.ant-btn-primary > span`
- **HTML:** `<span>Try Again</span>`
- **Issue:** Fix any of the following:
  Element has insufficient color contrast of 3.24 (foreground color: #ffffff, background color: #1890ff, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1

### Settings - User Management

#### 1. Elements must meet minimum color contrast ratio thresholds

- **Rule ID:** color-contrast
- **Impact:** Serious
- **Description:** Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
- **WCAG Criteria:** [View Details](https://dequeuniversity.com/rules/axe/4.11/color-contrast?application=playwright)
- **Affected Elements:** 2

**Element 1:**
- **Selector:** `.ant-result-subtitle`
- **HTML:** `<div class="ant-result-subtitle">Failed to fetch dynamically imported module: http://localhost:3500/...`
- **Issue:** Fix any of the following:
  Element has insufficient color contrast of 3.29 (foreground color: #878787, background color: #f5f5f5, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1

**Element 2:**
- **Selector:** `.ant-btn-primary > span`
- **HTML:** `<span>Try Again</span>`
- **Issue:** Fix any of the following:
  Element has insufficient color contrast of 3.24 (foreground color: #ffffff, background color: #1890ff, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1

### Hub

#### 1. Elements must meet minimum color contrast ratio thresholds

- **Rule ID:** color-contrast
- **Impact:** Serious
- **Description:** Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
- **WCAG Criteria:** [View Details](https://dequeuniversity.com/rules/axe/4.11/color-contrast?application=playwright)
- **Affected Elements:** 2

**Element 1:**
- **Selector:** `.ant-result-subtitle`
- **HTML:** `<div class="ant-result-subtitle">Failed to fetch dynamically imported module: http://localhost:3500/...`
- **Issue:** Fix any of the following:
  Element has insufficient color contrast of 3.29 (foreground color: #878787, background color: #f5f5f5, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1

**Element 2:**
- **Selector:** `.ant-btn-primary > span`
- **HTML:** `<span>Try Again</span>`
- **Issue:** Fix any of the following:
  Element has insufficient color contrast of 3.24 (foreground color: #ffffff, background color: #1890ff, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1

## 3. Moderate Violations

✅ **No moderate violations found!**

## 4. Minor Violations

✅ **No minor violations found!**

## 5. Common Issues Summary

### Top 10 Most Common Issues

| Issue | Impact | Occurrences | Fix |
|-------|--------|-------------|-----|
| Elements must meet minimum color contrast ratio thresholds | serious | 78 | [Link](https://dequeuniversity.com/rules/axe/4.11/color-contrast?application=playwright) |
| Interactive controls must not be nested | serious | 3 | [Link](https://dequeuniversity.com/rules/axe/4.11/nested-interactive?application=playwright) |
| Form elements must have labels | critical | 2 | [Link](https://dequeuniversity.com/rules/axe/4.11/label?application=playwright) |

## 6. Color Contrast Issues

⚠️ **78 elements with color contrast issues:**

### Issue 1: Elements must meet minimum color contrast ratio thresholds

1. `.ant-menu-item-selected > .ant-menu-title-content`
   - Fix any of the following:
  Element has insufficient color contrast of 3.24 (foreground color: #1890ff, background color: #ffffff, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1
2. `div[aria-label="User profile menu"] > div > div:nth-child(2)`
   - Fix any of the following:
  Element has insufficient color contrast of 3.36 (foreground color: #8c8c8c, background color: #ffffff, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1
3. `.ant-btn-primary.ant-btn-color-primary.ant-btn-variant-solid > span:nth-child(2)`
   - Fix any of the following:
  Element has insufficient color contrast of 3.24 (foreground color: #ffffff, background color: #1890ff, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1
4. `.ant-col-xs-12.ant-col-sm-8.ant-col-md-4:nth-child(1) > .ant-card.ant-card-bordered.css-var-_r_0_ > .ant-card-body > .ant-typography-secondary.ant-typography.css-var-_r_0_`
   - Fix any of the following:
  Element has insufficient color contrast of 3.36 (foreground color: #8c8c8c, background color: #ffffff, font size: 12.0pt (16px), font weight: normal). Expected contrast ratio of 4.5:1
5. `.ant-col-xs-12.ant-col-sm-8.ant-col-md-4:nth-child(2) > .ant-card.ant-card-bordered.css-var-_r_0_ > .ant-card-body > .ant-typography-secondary.ant-typography.css-var-_r_0_`
   - Fix any of the following:
  Element has insufficient color contrast of 3.36 (foreground color: #8c8c8c, background color: #ffffff, font size: 12.0pt (16px), font weight: normal). Expected contrast ratio of 4.5:1

_... and 26 more elements_

### Issue 2: Elements must meet minimum color contrast ratio thresholds

1. `.ant-menu-item-selected > .ant-menu-title-content`
   - Fix any of the following:
  Element has insufficient color contrast of 3.24 (foreground color: #1890ff, background color: #ffffff, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1
2. `div[aria-label="User profile menu"] > div > div:nth-child(2)`
   - Fix any of the following:
  Element has insufficient color contrast of 3.36 (foreground color: #8c8c8c, background color: #ffffff, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1
3. `.ant-btn-primary.ant-btn-color-primary.ant-btn-variant-solid > span:nth-child(2)`
   - Fix any of the following:
  Element has insufficient color contrast of 3.24 (foreground color: #ffffff, background color: #1890ff, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1
4. `.ant-col-xs-12.ant-col-sm-8.ant-col-md-4:nth-child(1) > .ant-card.ant-card-bordered.css-var-_r_0_ > .ant-card-body > .ant-typography-secondary.ant-typography.css-var-_r_0_`
   - Fix any of the following:
  Element has insufficient color contrast of 3.36 (foreground color: #8c8c8c, background color: #ffffff, font size: 12.0pt (16px), font weight: normal). Expected contrast ratio of 4.5:1
5. `.ant-col-xs-12.ant-col-sm-8.ant-col-md-4:nth-child(2) > .ant-card.ant-card-bordered.css-var-_r_0_ > .ant-card-body > .ant-typography-secondary.ant-typography.css-var-_r_0_`
   - Fix any of the following:
  Element has insufficient color contrast of 3.36 (foreground color: #8c8c8c, background color: #ffffff, font size: 12.0pt (16px), font weight: normal). Expected contrast ratio of 4.5:1

_... and 26 more elements_

### Issue 3: Elements must meet minimum color contrast ratio thresholds

1. `.ant-result-subtitle`
   - Fix any of the following:
  Element has insufficient color contrast of 3.29 (foreground color: #878787, background color: #f5f5f5, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1
2. `.ant-btn-primary > span`
   - Fix any of the following:
  Element has insufficient color contrast of 3.24 (foreground color: #ffffff, background color: #1890ff, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1

### Issue 4: Elements must meet minimum color contrast ratio thresholds

1. `.ant-result-subtitle`
   - Fix any of the following:
  Element has insufficient color contrast of 3.29 (foreground color: #878787, background color: #f5f5f5, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1
2. `.ant-btn-primary > span`
   - Fix any of the following:
  Element has insufficient color contrast of 3.24 (foreground color: #ffffff, background color: #1890ff, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1

### Issue 5: Elements must meet minimum color contrast ratio thresholds

1. `.ant-result-subtitle`
   - Fix any of the following:
  Element has insufficient color contrast of 3.29 (foreground color: #878787, background color: #f5f5f5, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1
2. `.ant-btn-primary > span`
   - Fix any of the following:
  Element has insufficient color contrast of 3.24 (foreground color: #ffffff, background color: #1890ff, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1

### Issue 6: Elements must meet minimum color contrast ratio thresholds

1. `li[aria-describedby="_r_1a_"] > .ant-menu-title-content`
   - Fix any of the following:
  Element has insufficient color contrast of 3.24 (foreground color: #1890ff, background color: #ffffff, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1
2. `div[aria-label="User profile menu"] > div > div:nth-child(2)`
   - Fix any of the following:
  Element has insufficient color contrast of 3.36 (foreground color: #8c8c8c, background color: #ffffff, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1
3. `.ant-layout-has-sider > div:nth-child(2) > div:nth-child(1) > span`
   - Fix any of the following:
  Element has insufficient color contrast of 3.36 (foreground color: #8c8c8c, background color: #ffffff, font size: 12.0pt (16px), font weight: normal). Expected contrast ratio of 4.5:1
4. `main > div > .ant-btn-primary.ant-btn-color-primary.ant-btn-variant-solid > span`
   - Fix any of the following:
  Element has insufficient color contrast of 3.24 (foreground color: #ffffff, background color: #1890ff, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1

### Issue 7: Elements must meet minimum color contrast ratio thresholds

1. `.ant-result-subtitle`
   - Fix any of the following:
  Element has insufficient color contrast of 3.29 (foreground color: #878787, background color: #f5f5f5, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1
2. `.ant-btn-primary > span`
   - Fix any of the following:
  Element has insufficient color contrast of 3.24 (foreground color: #ffffff, background color: #1890ff, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1

### Issue 8: Elements must meet minimum color contrast ratio thresholds

1. `.ant-result-subtitle`
   - Fix any of the following:
  Element has insufficient color contrast of 3.29 (foreground color: #878787, background color: #f5f5f5, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1
2. `.ant-btn-primary > span`
   - Fix any of the following:
  Element has insufficient color contrast of 3.24 (foreground color: #ffffff, background color: #1890ff, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1

### Issue 9: Elements must meet minimum color contrast ratio thresholds

1. `.ant-result-subtitle`
   - Fix any of the following:
  Element has insufficient color contrast of 3.29 (foreground color: #878787, background color: #f5f5f5, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1
2. `.ant-btn-primary > span`
   - Fix any of the following:
  Element has insufficient color contrast of 3.24 (foreground color: #ffffff, background color: #1890ff, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1

**Required Ratios:**
- Normal text: 4.5:1
- Large text (18pt+ or 14pt+ bold): 3:1
- UI components and graphics: 3:1

## 7. Form Accessibility Assessment

⚠️ **2 form-related issues detected:**

1. Form elements must have labels - 1 element(s)
2. Form elements must have labels - 1 element(s)

**Checklist:**
- [ ] All form inputs have associated labels
- [ ] Error messages associated with fields (needs manual test)
- [ ] Required fields indicated (needs manual test)
- [ ] Form validation accessible (needs manual test)

## 8. Keyboard & ARIA Assessment

✅ No automated keyboard or ARIA issues detected

## 9. Recommendations

### 🔴 Critical Priority

1. **Fix all 2 critical violations immediately** - These are blocking issues for users with disabilities
2. Run manual testing with screen readers (NVDA, JAWS, VoiceOver)
3. Test keyboard navigation on all critical paths

### 🟡 High Priority

1. Address 12 serious violations (Target: < 5)
2. Focus on form labels, color contrast, and heading structure
3. Implement automated accessibility testing in CI/CD

### General Recommendations

1. **Automated Testing:** Integrate `@axe-core/playwright` into CI/CD pipeline
2. **Manual Testing:** Conduct screen reader testing (catches ~60-70% of remaining issues)
3. **Keyboard Testing:** Test all interactive elements with keyboard only
4. **Design System:** Add accessibility guidelines to component library
5. **Training:** Provide WCAG 2.1 training for development team

## 10. Detailed Results by Page

### Login

- **URL:** http://localhost:3500/login
- **Score:** 80/100
- **Total Violations:** 3
- **Breakdown:** 1 critical, 2 serious, 0 moderate, 0 minor
- **Status:** ❌ FAIL

### Dashboard

- **URL:** http://localhost:3500/dashboard
- **Score:** 80/100
- **Total Violations:** 3
- **Breakdown:** 1 critical, 2 serious, 0 moderate, 0 minor
- **Status:** ❌ FAIL

### Assets List

- **URL:** http://localhost:3500/assets
- **Score:** 95/100
- **Total Violations:** 1
- **Breakdown:** 0 critical, 1 serious, 0 moderate, 0 minor
- **Status:** ✅ PASS

### Asset Detail

- **URL:** http://localhost:3500/assets/1
- **Score:** 95/100
- **Total Violations:** 1
- **Breakdown:** 0 critical, 1 serious, 0 moderate, 0 minor
- **Status:** ✅ PASS

### Patches List

- **URL:** http://localhost:3500/patches
- **Score:** 95/100
- **Total Violations:** 1
- **Breakdown:** 0 critical, 1 serious, 0 moderate, 0 minor
- **Status:** ✅ PASS

### Patch Detail

- **URL:** http://localhost:3500/patches/1
- **Score:** 90/100
- **Total Violations:** 2
- **Breakdown:** 0 critical, 2 serious, 0 moderate, 0 minor
- **Status:** ✅ PASS

### Vulnerabilities List

- **URL:** http://localhost:3500/vulnerability/vulnerabilities
- **Score:** 95/100
- **Total Violations:** 1
- **Breakdown:** 0 critical, 1 serious, 0 moderate, 0 minor
- **Status:** ✅ PASS

### Vulnerability Detail

- **URL:** http://localhost:3500/vulnerability/vulnerabilities/1
- **Score:** 100/100
- **Total Violations:** 0
- **Breakdown:** 0 critical, 0 serious, 0 moderate, 0 minor
- **Status:** ✅ PASS

### Settings - User Management

- **URL:** http://localhost:3500/settings/user-management/users
- **Score:** 95/100
- **Total Violations:** 1
- **Breakdown:** 0 critical, 1 serious, 0 moderate, 0 minor
- **Status:** ✅ PASS

### Hub

- **URL:** http://localhost:3500/hub
- **Score:** 95/100
- **Total Violations:** 1
- **Breakdown:** 0 critical, 1 serious, 0 moderate, 0 minor
- **Status:** ✅ PASS

## 11. Conclusion

❌ **Overall Assessment: FAIL**

The application requires accessibility improvements to meet WCAG 2.1 Level AA standards.

**2 critical violations must be fixed immediately.**

---

**Note:** Automated testing catches approximately 30-40% of accessibility issues. Manual testing with assistive technologies is strongly recommended.

**Report Generated:** 2/17/2026, 8:16:52 PM
