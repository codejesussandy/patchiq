# PRD: A.2 — Wire Email Service into Workflows

> **Track:** A (Backend & Platform)
> **Priority:** Must Have (Week 2)
> **Status:** COMPLETED
> **Last Updated:** 2026-02-12

---

## 1. Problem Statement

PatchIQ has a fully functional email service (`shared/services/email.service.ts` — 170 lines, Nodemailer with SMTP config, connection testing, and test email sending) and a notification email helper (`shared/services/notification-email.service.ts` — loads config from Settings DB table). However, three critical workflows have `// TODO` stubs instead of actual email sending:

1. **Password reset** (`auth.service.ts:220`) — `forgotPassword()` generates a reset token and stores it in the DB, but never sends the email. Users who forget their password are permanently locked out.
2. **User invitation** (`settings/users.service.ts:307`) — `inviteUser()` creates the user record, generates an invite token, but never sends the email. Admins think invitations were sent; new users never receive them.
3. **Report delivery** (`reports.controller.ts:166`) — `sendReport` handler validates recipients and checks report status, but returns a hardcoded mock message: `"Email service not configured"`. Report email delivery is completely non-functional.

**Who is affected:** Every admin who invites users, every user who forgets their password, every user who tries to email a report. These are core platform operations.

**Cost of not solving:** Users cannot recover accounts without admin DB intervention. User onboarding requires manual password sharing. Report email distribution is dead — users must download and forward manually.

---

## 2. Goals

| # | Goal | Success Metric |
|---|------|----------------|
| G1 | Password reset emails are delivered end-to-end | User receives email within 60s of submitting forgot-password form, and the reset link works |
| G2 | Invitation emails are delivered to new users | Invited user receives onboarding email with valid link within 60s |
| G3 | Reports can be emailed to recipients | Report email reaches all specified recipients with correct attachment/content |
| G4 | Mock mode works for development without SMTP | When `USE_MOCK_EMAIL=true`, all flows succeed without sending real emails (logged to console) |
| G5 | Graceful degradation when SMTP is not configured | Flows don't crash if no mail server is set up — they log a warning and return a clear message |

---

## 3. Non-Goals

| # | Non-Goal | Why |
|---|----------|-----|
| N1 | Email template engine (Handlebars, MJML, etc.) | Inline HTML is sufficient for Sprint 1. Template engine is Sprint 2+ polish. |
| N2 | Email queue / retry via BullMQ | Fire-and-forget with logging is adequate. BullMQ email queue is a later optimization. |
| N3 | Email delivery tracking (open/click rates) | Not needed for an internal platform tool. |
| N4 | Frontend changes to password reset / onboarding pages | Frontend pages (`ForgotPassword.tsx`, `UserOnboarding.tsx`) already work — they just need the backend to actually send emails. |
| N5 | LDAP-based password reset flow | Out of scope — A.11 (LDAP auth) is a separate Sprint 2 item. |
| N6 | Report attachment download URLs in emails | Sprint 1 reports email just needs inline info + a link to the report in PatchIQ. Actual PDF/CSV attachment is future work. |

---

## 4. User Stories

### US1: Password Reset
**As a** PatchIQ user who forgot their password,
**I want** to receive a password reset email when I submit my email on the forgot-password page,
**so that** I can reset my password and regain access to my account.

### US2: User Invitation
**As an** admin,
**I want** new users to receive an invitation email with an onboarding link when I invite them,
**so that** they can set up their account without me having to share credentials manually.

### US3: Report Email Delivery
**As a** user who generated a report,
**I want** to send the report to one or more email recipients from the Reports page,
**so that** stakeholders receive the report without me having to download and forward it.

### US4: Development Without SMTP
**As a** developer running PatchIQ locally,
**I want** email flows to work in mock mode (logging instead of sending),
**so that** I can test workflows without setting up an SMTP server.

### US5: Missing SMTP Configuration
**As an** admin who hasn't configured a mail server yet,
**I want** clear feedback when email-dependent features are used,
**so that** I know I need to configure SMTP in Settings, rather than seeing cryptic errors.

---

## 5. Requirements

### Must Have (P0)

#### R1: Create a unified `sendEmail` helper

Create a new function in `shared/services/email.service.ts` (or a new `workflow-email.service.ts`) that:

- Loads SMTP config from the Settings DB table (reuse `loadMailConfig()` pattern from `notification-email.service.ts`)
- Falls back to env-based SMTP config (`config.smtp.*`) if no DB settings exist
- Checks `config.externalServices.useMockEmail` — if `true`, logs the email details and returns success without sending
- If no SMTP config is available at all (neither DB nor env), logs a warning and returns a structured error (not an exception)
- Sends the email via Nodemailer when real config is available

**Files:** `backend/src/shared/services/email.service.ts`

**Acceptance Criteria:**
- [x] Function accepts `{ to, subject, html, text? }` and returns `{ success: boolean; message: string; error?: string }`
- [x] Loads mail config from Settings DB table first, falls back to env vars
- [x] When `USE_MOCK_EMAIL=true`, logs email to Pino logger at `info` level with subject and recipient, returns `{ success: true }`
- [x] When no SMTP config exists, returns `{ success: false, message: 'Mail server not configured' }` (no thrown error)
- [x] When SMTP config exists and `USE_MOCK_EMAIL=false`, sends real email via Nodemailer

#### R2: Wire password reset email into `auth.service.ts`

Replace the TODO at `auth.service.ts:220` with actual email sending.

**Files:** `backend/src/modules/auth/auth.service.ts`

**What to send:**
- **To:** User's email
- **Subject:** `PatchIQ — Password Reset`
- **Body:** HTML email with:
  - Greeting (user's name or email)
  - Reset link: `{CORS_ORIGIN}/reset-password?token={resetToken}` (use `config.corsOrigin` as the base URL)
  - Expiry notice: "This link expires in 1 hour"
  - Security note: "If you didn't request this, ignore this email"
  - PatchIQ footer branding

**Acceptance Criteria:**
- [x] `forgotPassword()` sends email after creating the reset token (not before)
- [x] Email contains a working reset link with the raw token (not the hash)
- [x] Reset link points to the frontend reset-password route
- [x] If email sending fails, the reset token is still created (fire-and-forget — don't roll back the token)
- [x] Existing security behavior preserved: no error thrown for non-existent email
- [x] Logger records whether email was sent, mocked, or failed

#### R3: Wire invitation email into `users.service.ts`

Replace the TODO at `settings/users.service.ts:307` with actual email sending.

**Files:** `backend/src/modules/settings/users.service.ts`

**What to send:**
- **To:** Invited user's email
- **Subject:** `You've been invited to PatchIQ`
- **Body:** HTML email with:
  - Welcome message
  - Who invited them (inviter's name/email if available)
  - Their assigned role
  - Onboarding link: `{CORS_ORIGIN}/onboarding?token={inviteToken}`
  - Expiry notice: "This invitation expires in 7 days"
  - PatchIQ footer branding

**Acceptance Criteria:**
- [x] `inviteUser()` sends email after creating the user record and invite token
- [x] Email contains a working onboarding link with the raw token
- [x] If email sending fails, the user record is still created (fire-and-forget)
- [x] The response message should indicate whether the email was actually sent or mocked
- [x] Logger records invitation email status

#### R4: Wire admin password reset email into `users.service.ts`

Replace the TODO at `settings/users.service.ts:398` with actual email sending.

**Files:** `backend/src/modules/settings/users.service.ts`

**What to send:**
- **To:** Target user's email
- **Subject:** `PatchIQ — Password Reset Requested`
- **Body:** HTML email with:
  - Notice that an admin has requested a password reset for their account
  - Reset link: `{CORS_ORIGIN}/reset-password?token={resetToken}`
  - Expiry notice: "This link expires in 24 hours"
  - Security note: "If you didn't expect this, contact your administrator"

**Acceptance Criteria:**
- [x] `resetPassword()` (admin-initiated) sends email after creating the reset token
- [x] Email contains a working reset link with the raw token
- [x] Fire-and-forget — token is still created even if email fails

#### R5: Wire report email into `reports.controller.ts`

Replace the TODO at `reports.controller.ts:166` with actual email sending.

**Files:** `backend/src/modules/reports/reports.controller.ts`

**What to send:**
- **To:** Each recipient in the `recipients` array
- **Subject:** Custom subject from request body (or default: `PatchIQ Report: {reportName}`)
- **Body:** HTML email with:
  - Custom message from request body (if provided)
  - Report name and type
  - Generated date
  - Link to view/download the report in PatchIQ: `{CORS_ORIGIN}/reports/{reportId}`
  - PatchIQ footer branding

**Acceptance Criteria:**
- [x] Sends to all recipients in the array
- [x] Uses `subject` from request body if provided, falls back to default
- [x] Uses `message` from request body as email body content if provided
- [x] Returns accurate response: `"Report sent to N recipient(s)"` (real) or `"Report email logged (mock mode)"` (mock)
- [x] Validates email format for each recipient before sending
- [x] Does not crash if one recipient fails — continues to remaining recipients

### Nice to Have (P1)

#### R6: Shared HTML email templates

Create reusable HTML builders for consistent email styling:
- `buildPasswordResetEmailHtml(name, resetLink, expiresIn)`
- `buildInvitationEmailHtml(name, inviterName, role, onboardingLink, expiresIn)`
- `buildReportEmailHtml(reportName, reportType, generatedDate, message?, viewLink)`

Place in `backend/src/shared/services/email-templates.ts`.

**Acceptance Criteria:**
- [x] All emails share consistent branding (PatchIQ logo/header, footer, color scheme matching `notification-email.service.ts` style)
- [x] All links are clickable buttons (not raw URLs)
- [x] Responsive HTML that renders in major email clients (Gmail, Outlook, Apple Mail)

#### R7: Zod validation for report send endpoint

The `sendReport` handler (`reports.controller.ts:150`) currently does manual array validation. Add a proper Zod schema.

**Files:** `backend/src/modules/reports/reports.validators.ts`, `reports.routes.ts`

**Acceptance Criteria:**
- [x] Zod schema validates `recipients` (array of emails, min 1), `subject` (optional string), `message` (optional string), `format` (optional enum)
- [x] Schema is wired into the route via `validateBody()`

### Future Considerations (P2)

| # | Item | Notes |
|---|------|-------|
| F1 | BullMQ email queue with retry | Fire-and-forget is fine for Sprint 1. Queue + retry is Sprint 2. |
| F2 | Email templates with MJML | Inline HTML for now. MJML compilation for better client compatibility later. |
| F3 | Report attachment (PDF/CSV) in email | Sprint 1 sends a link. Sprint 2 can attach the actual file. |
| F4 | Email delivery receipts / bounce handling | Out of scope for internal tool. |

---

## 6. Technical Design Notes

### Config Resolution Order

```
1. Settings DB table (category: 'mail') — set via Settings > Mail Server UI
2. Environment variables (SMTP_HOST, SMTP_PORT, etc.)
3. No config → graceful degradation (log warning, return failure)
```

The `notification-email.service.ts` already implements step 1 via `loadMailConfig()`. The new `sendEmail` helper should reuse this function and add step 2 as fallback.

### Mock Mode

When `USE_MOCK_EMAIL=true` (default in dev):
```
[INFO] [email] MOCK: Would send email
  to: "user@example.com"
  subject: "PatchIQ — Password Reset"
  (email body logged at debug level)
```

This allows full workflow testing in development without SMTP infrastructure.

### Frontend URL Construction

Use `config.corsOrigin` (from `CORS_ORIGIN` env var) as the frontend base URL:
- Reset link: `${config.corsOrigin}/reset-password?token=${resetToken}`
- Onboarding link: `${config.corsOrigin}/onboarding?token=${inviteToken}`
- Report link: `${config.corsOrigin}/reports/${reportId}`

The frontend already has routes for `/forgot-password` and `/onboarding`. A `/reset-password` route needs to exist (verify in `App.tsx`).

### Error Handling Strategy

All email sends are **fire-and-forget**:
- The primary operation (create token, create user, etc.) succeeds regardless of email outcome
- Email failures are logged at `warn` level
- The API response indicates the primary operation succeeded
- Email status is secondary info in the response (e.g., `"Password reset email sent"` vs `"Password reset initiated (email delivery failed)"`)

### Existing Infrastructure to Reuse

| Component | Location | What it does |
|-----------|----------|-------------|
| `createTransporter()` | `email.service.ts:24` | Creates Nodemailer transport from config |
| `loadMailConfig()` | `notification-email.service.ts:9` | Loads SMTP config from Settings DB |
| `decrypt()` | `shared/utils/crypto.ts` | Decrypts stored SMTP password |
| `buildNotificationEmailHtml()` | `notification-email.service.ts:47` | Example of HTML email builder |
| `config.externalServices.useMockEmail` | `config/index.ts:42` | Mock mode flag |
| `config.smtp.*` | `config/index.ts:48-54` | Env-based SMTP fallback |
| `config.corsOrigin` | `config/index.ts:9` | Frontend base URL |

---

## 7. Test Plan

### Unit Tests

**File:** `backend/src/shared/services/__tests__/email.service.test.ts`

#### `sendEmail` helper tests:

| # | Test | Given | When | Then |
|---|------|-------|------|------|
| T1 | Mock mode skips sending | `USE_MOCK_EMAIL=true` | `sendEmail()` is called | Returns `{ success: true }`, no Nodemailer transport created, email logged at info level |
| T2 | No config returns failure | No DB settings, no env SMTP config | `sendEmail()` is called | Returns `{ success: false, message: 'Mail server not configured' }` |
| T3 | DB config is used when available | Settings DB has mail config | `sendEmail()` is called | `createTransporter()` called with DB config values |
| T4 | Env config fallback works | No DB settings, env has SMTP_HOST | `sendEmail()` is called | `createTransporter()` called with env config values |
| T5 | SMTP error handled gracefully | Valid config, transporter throws | `sendEmail()` is called | Returns `{ success: false, error: '...' }`, no exception thrown |

**File:** `backend/src/modules/auth/__tests__/auth.service.test.ts`

#### Password reset email tests:

| # | Test | Given | When | Then |
|---|------|-------|------|------|
| T6 | Email sent after token creation | Valid user email | `forgotPassword()` called | `sendEmail()` called with user's email, subject contains "Password Reset", body contains reset link |
| T7 | Reset token created even if email fails | Valid user, email service returns failure | `forgotPassword()` called | Token is in DB, no exception thrown, function resolves |
| T8 | No email for non-existent user | Email not in DB | `forgotPassword()` called | `sendEmail()` NOT called, function resolves silently |
| T9 | Reset link contains raw token | Valid user | `forgotPassword()` called | Email body contains the raw token (not the hash), URL matches `CORS_ORIGIN/reset-password?token=` |

**File:** `backend/src/modules/settings/__tests__/users.service.test.ts`

#### Invitation email tests:

| # | Test | Given | When | Then |
|---|------|-------|------|------|
| T10 | Invitation email sent | Valid invite input | `inviteUser()` called | `sendEmail()` called with invitee's email, subject contains "invited", body contains onboarding link |
| T11 | User created even if email fails | Valid input, email service fails | `inviteUser()` called | User record exists in DB, function returns success message |
| T12 | Invite link uses correct token | Valid invite | `inviteUser()` called | Email body contains the raw invite token, URL matches `CORS_ORIGIN/onboarding?token=` |

#### Admin password reset email tests:

| # | Test | Given | When | Then |
|---|------|-------|------|------|
| T13 | Admin reset email sent | Valid user ID | `resetPassword()` called | `sendEmail()` called with user's email, subject contains "Password Reset", body contains reset link |
| T14 | Token created even if email fails | Valid user, email fails | `resetPassword()` called | Token is in DB, response returned successfully |

**File:** `backend/src/modules/reports/__tests__/reports.controller.test.ts`

#### Report email tests:

| # | Test | Given | When | Then |
|---|------|-------|------|------|
| T15 | Report email sent to all recipients | Completed report, 3 recipients | `POST /reports/:id/send` | `sendEmail()` called 3 times, response says "3 recipient(s)" |
| T16 | Invalid recipient email rejected | Recipient list contains "not-an-email" | `POST /reports/:id/send` | 400 error with validation message |
| T17 | Report not completed | Report status is DRAFT | `POST /reports/:id/send` | 400 error: "Report must be completed before sending" |
| T18 | Partial failure handled | 3 recipients, 1 fails | `POST /reports/:id/send` | Remaining 2 succeed, response indicates partial failure |

### Integration Tests

**File:** `backend/src/modules/auth/__tests__/auth.integration.test.ts`

| # | Test | Given | When | Then |
|---|------|-------|------|------|
| T19 | Forgot password flow (mock mode) | `USE_MOCK_EMAIL=true`, existing user | `POST /v1/auth/forgot-password` | 200 response, reset token in DB, email logged (not sent) |
| T20 | Forgot password non-existent email | Non-existent email | `POST /v1/auth/forgot-password` | 200 response (security: no email enumeration), no token created |

**File:** `backend/src/modules/settings/__tests__/users.integration.test.ts`

| # | Test | Given | When | Then |
|---|------|-------|------|------|
| T21 | Invite user flow (mock mode) | `USE_MOCK_EMAIL=true`, valid invite data | `POST /v1/settings/users/invite` | 200 response, user created with `isOnboarded: false`, invite token in DB |
| T22 | Admin reset password flow | `USE_MOCK_EMAIL=true`, existing user | `POST /v1/settings/users/:id/reset-password` | 200 response, reset token in DB |

### Manual Smoke Tests

| # | Test | Steps | Expected |
|---|------|-------|----------|
| S1 | Full password reset flow | 1. Go to /forgot-password 2. Enter admin email 3. Check logs for email 4. Copy token from logs 5. Navigate to /reset-password?token=... 6. Enter new password 7. Login with new password | All steps succeed, can login with new password |
| S2 | Full invitation flow | 1. Go to Settings > Users 2. Click "Invite User" 3. Fill in details 4. Check logs for email 5. Copy onboarding link from logs 6. Navigate to onboarding URL 7. Complete setup 8. Login as new user | All steps succeed, new user can login |
| S3 | Report email (mock) | 1. Generate a report 2. Click "Send" on completed report 3. Enter recipient emails 4. Submit | Response says "sent to N recipients" (mock mode logged) |
| S4 | Real SMTP test | 1. Configure SMTP in Settings > Mail Server 2. Set `USE_MOCK_EMAIL=false` 3. Trigger forgot-password 4. Check real inbox | Actual email received with proper formatting |

---

## 8. Open Questions

| # | Question | Who | Blocking? | Proposed Answer |
|---|----------|-----|-----------|----------------|
| Q1 | Does the frontend have a `/reset-password` route that reads `?token=` from URL? | Frontend (Dev 2) | No — verify in App.tsx, but this is a B-track concern | Verify and add if missing as part of B-track |
| Q2 | Should invitation email include a temporary password or just the onboarding link? | Product | No | Just the onboarding link — user sets their own password during onboarding (current flow already works this way) |
| Q3 | For report emails, should we attach the report file or just link to it? | Product | No | Link only for Sprint 1 (see N6). Attachment in Sprint 2 if needed. |
| Q4 | Should we add a `FRONTEND_URL` env var separate from `CORS_ORIGIN`? | Engineering | No | Use `CORS_ORIGIN` for Sprint 1 — it already has the frontend URL. Separate var can be added later if needed. |

---

## 9. Implementation Order

```
R1 (sendEmail helper)         ← Foundation, everything depends on this
  ├── R2 (password reset)     ← Highest user impact
  ├── R4 (admin reset)        ← Same pattern as R2, quick follow-up
  ├── R3 (invitation)         ← Second highest impact
  └── R5 (report email)       ← Different pattern (multiple recipients)
R6 (HTML templates)           ← Nice-to-have, can be done inline first
R7 (report Zod validation)    ← Nice-to-have cleanup
```

Estimated effort: **2-3 days** (as noted in roadmap Week 2 plan)

---

## 10. Dependencies

| Dependency | Direction | Status |
|-----------|-----------|--------|
| A.1 (Missing API routes) | Must complete before A.2 starts | `COMPLETED` |
| `email.service.ts` | Exists, reuse `createTransporter()` | Ready |
| `notification-email.service.ts` | Exists, reuse `loadMailConfig()` pattern | Ready |
| Settings mail server CRUD | Exists (`settings.routes.ts:170-172`) | Ready |
| Frontend forgot-password page | Exists (`ForgotPassword.tsx`) | Ready |
| Frontend onboarding page | Exists (`UserOnboarding.tsx`) | Ready |
| Frontend reset-password page with token param | **Needs verification** (Q1) | Unknown — B-track concern |

---

*This PRD is a living document. Update as implementation progresses.*
