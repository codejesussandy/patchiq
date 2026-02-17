# PatchIQ Status Badges

This file contains all the badge configurations for the PatchIQ project. Copy these into your README.md.

## GitHub Actions Workflow Badges

### Main Test Workflows

```markdown
[![Frontend Tests](https://github.com/YOUR_ORG/PatchIQ/actions/workflows/frontend-tests.yml/badge.svg?branch=main)](https://github.com/YOUR_ORG/PatchIQ/actions/workflows/frontend-tests.yml)
[![Backend Tests](https://github.com/YOUR_ORG/PatchIQ/actions/workflows/backend-tests.yml/badge.svg?branch=main)](https://github.com/YOUR_ORG/PatchIQ/actions/workflows/backend-tests.yml)
[![Full Stack Tests](https://github.com/YOUR_ORG/PatchIQ/actions/workflows/full-stack-tests.yml/badge.svg?branch=main)](https://github.com/YOUR_ORG/PatchIQ/actions/workflows/full-stack-tests.yml)
[![Type Safety](https://github.com/YOUR_ORG/PatchIQ/actions/workflows/type-safety.yml/badge.svg?branch=main)](https://github.com/YOUR_ORG/PatchIQ/actions/workflows/type-safety.yml)
```

### Agent Workflows

```markdown
[![Agent Tests](https://github.com/YOUR_ORG/PatchIQ/actions/workflows/agent-tests.yml/badge.svg?branch=main)](https://github.com/YOUR_ORG/PatchIQ/actions/workflows/agent-tests.yml)
[![Agent Release](https://github.com/YOUR_ORG/PatchIQ/actions/workflows/agent-release.yml/badge.svg)](https://github.com/YOUR_ORG/PatchIQ/actions/workflows/agent-release.yml)
```

## Custom Coverage Badges

### Using shields.io with Codecov

If you have Codecov integration:

```markdown
[![Frontend Coverage](https://img.shields.io/codecov/c/github/YOUR_ORG/PatchIQ/main?flag=frontend&label=Frontend%20Coverage)](https://codecov.io/gh/YOUR_ORG/PatchIQ)
[![Backend Coverage](https://img.shields.io/codecov/c/github/YOUR_ORG/PatchIQ/main?flag=backend&label=Backend%20Coverage)](https://codecov.io/gh/YOUR_ORG/PatchIQ)
```

### Manual Coverage Badges

Create dynamic badges using GitHub Actions (stored in branch):

```markdown
![Frontend Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/YOUR_USERNAME/GIST_ID/raw/frontend-coverage.json)
![Backend Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/YOUR_USERNAME/GIST_ID/raw/backend-coverage.json)
```

## Technology Stack Badges

```markdown
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql)](https://www.postgresql.org/)
[![Go](https://img.shields.io/badge/Go-1.22-00ADD8?logo=go)](https://go.dev/)
```

## Framework & Library Badges

```markdown
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite)](https://vitejs.dev/)
[![Ant Design](https://img.shields.io/badge/Ant%20Design-6-0170FE?logo=ant-design)](https://ant.design/)
[![Express](https://img.shields.io/badge/Express-4-000000?logo=express)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma)](https://www.prisma.io/)
[![React Query](https://img.shields.io/badge/React%20Query-5-FF4154?logo=react-query)](https://tanstack.com/query)
```

## Testing Badges

```markdown
[![Playwright](https://img.shields.io/badge/E2E-Playwright-2EAD33?logo=playwright)](https://playwright.dev/)
[![Vitest](https://img.shields.io/badge/Unit-Vitest-6E9F18?logo=vitest)](https://vitest.dev/)
[![Jest](https://img.shields.io/badge/Backend-Jest-C21325?logo=jest)](https://jestjs.io/)
```

## Quality & Standards Badges

```markdown
[![Code Style](https://img.shields.io/badge/code%20style-ESLint-4B32C3?logo=eslint)](https://eslint.org/)
[![Type Safety](https://img.shields.io/badge/type%20safety-100%25-brightgreen)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-Proprietary-red)](LICENSE)
```

## Full Badge Set for README

Here's a complete example for your README.md header:

```markdown
# PatchIQ

> Enterprise Patch and Vulnerability Management Platform

[![Frontend Tests](https://github.com/YOUR_ORG/PatchIQ/actions/workflows/frontend-tests.yml/badge.svg)](https://github.com/YOUR_ORG/PatchIQ/actions/workflows/frontend-tests.yml)
[![Backend Tests](https://github.com/YOUR_ORG/PatchIQ/actions/workflows/backend-tests.yml/badge.svg)](https://github.com/YOUR_ORG/PatchIQ/actions/workflows/backend-tests.yml)
[![Type Safety](https://github.com/YOUR_ORG/PatchIQ/actions/workflows/type-safety.yml/badge.svg)](https://github.com/YOUR_ORG/PatchIQ/actions/workflows/type-safety.yml)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql)](https://www.postgresql.org/)
[![Go](https://img.shields.io/badge/Go-1.22-00ADD8?logo=go)](https://go.dev/)
```

## Dynamic Coverage Badge Setup

### Step 1: Create GitHub Gist

1. Go to https://gist.github.com/
2. Create new gist with filename: `patchiq-badges.json`
3. Note the Gist ID from URL

### Step 2: Add Workflow to Update Badge

Create `.github/workflows/update-badges.yml`:

```yaml
name: Update Coverage Badges

on:
  push:
    branches: [main]
  workflow_run:
    workflows: ["Frontend Tests", "Backend Tests"]
    types: [completed]

jobs:
  update-badges:
    runs-on: ubuntu-latest
    if: github.event.workflow_run.conclusion == 'success'

    steps:
      - name: Download coverage
        uses: actions/download-artifact@v4
        with:
          name: frontend-unit-coverage
          path: ./coverage-frontend

      - name: Create badge JSON
        run: |
          COVERAGE=$(cat coverage-frontend/coverage-summary.json | jq -r '.total.lines.pct')

          # Determine color
          if (( $(echo "$COVERAGE >= 80" | bc -l) )); then
            COLOR="brightgreen"
          elif (( $(echo "$COVERAGE >= 70" | bc -l) )); then
            COLOR="yellow"
          else
            COLOR="red"
          fi

          # Create shields.io endpoint JSON
          cat > frontend-coverage.json <<EOF
          {
            "schemaVersion": 1,
            "label": "coverage",
            "message": "${COVERAGE}%",
            "color": "$COLOR"
          }
          EOF

      - name: Update Gist
        uses: exuanbo/actions-deploy-gist@v1
        with:
          token: ${{ secrets.GIST_TOKEN }}
          gist_id: YOUR_GIST_ID
          file_path: frontend-coverage.json
```

### Step 3: Create GIST_TOKEN Secret

1. GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with `gist` scope
3. Add to repository secrets as `GIST_TOKEN`

## Badge Display Variations

### Compact (Single Line)

```markdown
[![Tests](https://github.com/YOUR_ORG/PatchIQ/actions/workflows/frontend-tests.yml/badge.svg)](https://github.com/YOUR_ORG/PatchIQ/actions/workflows/frontend-tests.yml) [![Coverage](https://img.shields.io/endpoint?url=...)](https://codecov.io/gh/YOUR_ORG/PatchIQ)
```

### Grouped by Category

```markdown
**Build & Tests**
[![Frontend](https://github.com/YOUR_ORG/PatchIQ/actions/workflows/frontend-tests.yml/badge.svg)](...)
[![Backend](https://github.com/YOUR_ORG/PatchIQ/actions/workflows/backend-tests.yml/badge.svg)](...)

**Coverage**
![Frontend](https://img.shields.io/endpoint?url=...)
![Backend](https://img.shields.io/endpoint?url=...)

**Tech Stack**
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![React](https://img.shields.io/badge/React-19-61dafb)
```

### Table Format

```markdown
| Category | Badge |
|----------|-------|
| Frontend Tests | [![Frontend](https://github.com/YOUR_ORG/PatchIQ/actions/workflows/frontend-tests.yml/badge.svg)](https://github.com/YOUR_ORG/PatchIQ/actions/workflows/frontend-tests.yml) |
| Backend Tests | [![Backend](https://github.com/YOUR_ORG/PatchIQ/actions/workflows/backend-tests.yml/badge.svg)](https://github.com/YOUR_ORG/PatchIQ/actions/workflows/backend-tests.yml) |
| Type Safety | [![Type Safety](https://github.com/YOUR_ORG/PatchIQ/actions/workflows/type-safety.yml/badge.svg)](https://github.com/YOUR_ORG/PatchIQ/actions/workflows/type-safety.yml) |
```

## Custom Badge Generator

You can create custom badges at https://shields.io/

Example URLs:

```
# Static badge
https://img.shields.io/badge/status-stable-green

# Dynamic badge from endpoint
https://img.shields.io/endpoint?url=https://example.com/badge.json

# GitHub Actions badge
https://img.shields.io/github/actions/workflow/status/YOUR_ORG/PatchIQ/frontend-tests.yml

# Coverage badge (requires Codecov)
https://img.shields.io/codecov/c/github/YOUR_ORG/PatchIQ
```

## Tips

1. **Replace placeholders**: Change `YOUR_ORG` and `YOUR_USERNAME` to actual values
2. **Test badges**: Click each badge to verify it works
3. **Keep updated**: Update badges when versions change
4. **Optimize placement**: Put most important badges at top
5. **Link badges**: Make badges clickable to relevant pages

## Troubleshooting

**Badge shows "unknown"**:
- Workflow hasn't run yet
- Workflow name doesn't match
- Branch doesn't exist

**Badge shows wrong status**:
- Clear cache: Add `?no-cache=1` to URL temporarily
- Wait for workflow to complete

**Gist badge not updating**:
- Verify GIST_TOKEN has correct permissions
- Check Gist ID is correct
- Verify workflow ran successfully

---

**Note**: Remember to replace all placeholder values (`YOUR_ORG`, `YOUR_USERNAME`, `GIST_ID`) with your actual GitHub organization, username, and gist IDs.
