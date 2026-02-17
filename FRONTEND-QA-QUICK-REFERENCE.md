# Frontend QA - Quick Reference Card

> **Full Documentation:** See `FRONTEND-QUALITY-ASSURANCE-PLAN.md`

---

## ⚡ Quick Commands

### Before Every Commit
```bash
cd frontend
npm run lint              # Code quality
npm run type-check        # TypeScript
# Test your changes manually
```

### Before Creating PR
```bash
cd frontend
npm run validate:standard  # 30-45 min automated validation
```

### Before Release
```bash
cd frontend
npm run validate:complete  # 2-3 hour full validation
```

---

## 🎯 Validation Levels

| Level | Command | Time | When to Use |
|-------|---------|------|-------------|
| **Quick** | `npm run validate:quick` | 5-10 min | Every commit |
| **Standard** | `npm run validate:standard` | 30-45 min | Every PR |
| **Complete** | `npm run validate:complete` | 2-3 hours | Every release |

### Individual Tests
```bash
npm run validate:security       # Security audit + XSS tests
npm run validate:critical-path  # Core feature tests only
```

---

## 🧪 Testing Commands

```bash
# All tests
npm test

# Specific test file
npm test -- e2e/phase4-agent31-form-validation.spec.ts

# Interactive mode
npm run test:ui

# Debug mode
npm run test:debug

# By pattern
npm test -- --grep "validation"
```

---

## 🔒 XSS Test Payloads

**Test these in ALL user input fields before release:**

```html
<script>alert('XSS')</script>
<img src=x onerror=alert('XSS')>
<svg/onload=alert('XSS')>
javascript:alert('XSS')
<iframe src='javascript:alert(1)'></iframe>
```

### Critical Forms to Test
- ✅ Add Asset → Asset Name
- ✅ Create Patch → Description
- ✅ Add User → Name, Email
- ✅ Schedule Report → Recipients

**Expected:** All should be sanitized/blocked

---

## 📋 Manual Testing Checklist

### 5-Minute Smoke Test
- [ ] Login works
- [ ] Dashboard loads
- [ ] Navigate to Assets → List loads
- [ ] Create new asset → Saves successfully
- [ ] Browser console has no errors (F12)

### 15-Minute Feature Test
- [ ] Authentication (login/logout)
- [ ] Assets CRUD
- [ ] Patches CRUD
- [ ] XSS prevention (3 forms)
- [ ] Empty states
- [ ] SSE notifications

### Before Release
- [ ] All automated tests passing (`npm test`)
- [ ] XSS testing in all forms
- [ ] Cross-browser (Chrome, Firefox, Safari)
- [ ] Mobile responsive (DevTools)
- [ ] Performance (Lighthouse > 90)
- [ ] Accessibility (keyboard navigation)

---

## 🚨 Common Issues

### ESLint Errors
```bash
npm run lint:fix    # Auto-fix
```

### TypeScript Errors
```bash
npm run type-check  # See all errors
```

### Bundle Too Large
```bash
npm run build
du -sh dist         # Check size
# Target: < 2MB
```

### Tests Failing
```bash
npm run test:ui     # Debug in UI mode
npm run test:debug  # Step through test
```

---

## 📊 Quality Gates

### Must Pass Before Commit
- [ ] Zero ESLint errors
- [ ] Zero TypeScript errors
- [ ] Manual test your changes

### Must Pass Before PR
- [ ] All automated tests passing
- [ ] Code reviewed
- [ ] No console.log statements
- [ ] Performance impact assessed

### Must Pass Before Release
- [ ] Complete validation passing
- [ ] Security audit clean
- [ ] Cross-browser tested
- [ ] Performance benchmarks met
- [ ] Stakeholder approval

---

## 🔧 Useful Scripts

### Development
```bash
cd frontend
npm run dev          # Start dev server (port 5173)
npm run build        # Production build
npm run preview      # Preview production build
```

### Code Quality
```bash
npm run lint         # Check code quality
npm run lint:fix     # Auto-fix issues
npm run type-check   # TypeScript validation
```

### Testing
```bash
npm test                    # All tests
npm run test:ui             # Interactive mode
npm run validate:quick      # Quick validation
npm run validate:standard   # Standard validation
npm run validate:complete   # Complete validation
```

---

## 🎯 Performance Targets

| Metric | Target |
|--------|--------|
| Bundle Size | < 2MB |
| Page Load | < 3s |
| Time to Interactive | < 5s |
| Lighthouse Performance | > 90 |
| Lighthouse Accessibility | > 90 |

---

## 📞 When to Escalate

| Severity | Response Time | Example |
|----------|--------------|---------|
| **P0** | Immediate | App crashes, security breach |
| **P1** | 24 hours | Major feature broken |
| **P2** | 1 week | Minor feature broken |
| **P3** | When possible | Cosmetic issues |

---

## 🔗 Quick Links

- **Full QA Plan:** `FRONTEND-QUALITY-ASSURANCE-PLAN.md`
- **Project Conventions:** `CLAUDE.md`
- **Backend Conventions:** `backend/src/CONVENTIONS.md`
- **Roadmap:** `docs/sprint-0/ROADMAP.md`

---

## 📝 Test Credentials

```
Admin:  admin@patchiq.io  / admin123
Demo:   demo@patchiq.io   / demo123
```

---

## 🎨 Browser DevTools Shortcuts

```
F12          - Open DevTools
Cmd+Shift+M  - Toggle mobile view
Cmd+Shift+C  - Inspect element
Cmd+Shift+P  - Command palette
```

---

**Quick Start:**
```bash
cd frontend
npm run validate:quick  # Before commit
npm run validate:standard  # Before PR
```

**Security Test:**
```bash
npm run validate:security
# Then manually test XSS payloads in forms
```

**Full Validation:**
```bash
npm run validate:complete
# Takes 2-3 hours, run before release
```

---

**Last Updated:** 2026-02-17
**See Full Plan:** `FRONTEND-QUALITY-ASSURANCE-PLAN.md` (50+ pages)
