# Task 13: External Integrations

## Overview

This task implements external service integrations for PatchIQ, including:
- NIST NVD (National Vulnerability Database) for CVE data synchronization
- SMTP for email notifications
- LDAP/Active Directory for authentication

## Dependencies

- Task 03: Auth Module (for authentication middleware)
- Task 07: Vulnerabilities Module (for CVE storage)
- Task 11: Settings Module (for LDAP/SMTP configuration storage)

## Reference Documents

| Document | Location |
|----------|----------|
| Settings API Spec | `backend-debt/settings-api.yaml` |
| Vulnerability Preference API | `backend-debt/VULNERABILITY-PREFERENCE-API.yaml` |
| LDAP Flow | `backend-debt/GAPS-ANALYSIS.md` (Section: LDAP Authentication Flow) |
| Settings Implementation | `backend-debt/SETTINGS-EXTENDED-IMPLEMENTATION.md` |

---

## 1. NIST NVD Integration

### Purpose
Synchronize vulnerability (CVE) data from the National Vulnerability Database to keep the local database up-to-date with the latest security vulnerabilities.

### API Reference
- NVD API 2.0: https://nvd.nist.gov/developers/vulnerabilities
- API Key Registration: https://nvd.nist.gov/developers/request-an-api-key

### Implementation

#### 1.1 NVD Service

```typescript
// src/integrations/nvd/nvd.service.ts

interface NVDConfig {
  apiKey?: string;  // Optional but recommended for higher rate limits
  baseUrl: string;  // https://services.nvd.nist.gov/rest/json/cves/2.0
  requestsPerMinute: number;  // 5 without key, 50 with key
}

interface NVDSyncResult {
  total: number;
  added: number;
  updated: number;
  errors: string[];
}

class NVDService {
  // Fetch CVEs from NVD
  async fetchCVEs(params: {
    lastModStartDate?: Date;
    lastModEndDate?: Date;
    startIndex?: number;
    resultsPerPage?: number;
  }): Promise<NVDResponse>;

  // Parse NVD response to internal format
  parseCVE(nvdCVE: NVDCVEItem): VulnerabilityCreateInput;

  // Sync all CVEs (initial load or full refresh)
  async fullSync(): Promise<NVDSyncResult>;

  // Incremental sync (fetch changes since last sync)
  async incrementalSync(since: Date): Promise<NVDSyncResult>;
}
```

#### 1.2 Rate Limiting

```typescript
// Implement rate limiting for NVD API
class NVDRateLimiter {
  private requestQueue: Promise<void>;
  private requestInterval: number; // ms between requests

  constructor(config: NVDConfig) {
    // With API key: 50/min = 1200ms between requests
    // Without API key: 5/min = 12000ms between requests
    this.requestInterval = config.apiKey ? 1200 : 12000;
  }

  async throttle<T>(fn: () => Promise<T>): Promise<T>;
}
```

#### 1.3 Background Sync Job

```typescript
// Integration with Vulnerability Preference settings
interface VulnerabilityDBSync {
  scanJobInterval: number;  // e.g., 24
  scanJobUnit: 'Hour' | 'Day' | 'Week';
  databaseSyncTime: string;  // e.g., "02:00:00"
  lastSync?: Date;
  totalCVE: number;
}

// Scheduled job using node-cron or similar
class NVDSyncJob {
  async runSync(): Promise<void> {
    const config = await getVulnerabilityPreference();
    const lastSync = config.lastSync;

    if (lastSync) {
      await nvdService.incrementalSync(lastSync);
    } else {
      await nvdService.fullSync();
    }

    await updateLastSyncTime(new Date());
  }
}
```

### TDD Scenarios

```gherkin
Feature: NVD Vulnerability Synchronization

Scenario: Initial full synchronization
  Given NVD service is configured with API key
  And local vulnerability database is empty
  When I trigger a full sync
  Then all CVEs from NVD should be fetched
  And CVEs should be transformed to internal format
  And CVEs should be stored in vulnerability table
  And sync status should be updated

Scenario: Incremental synchronization
  Given last sync was 24 hours ago
  When scheduled sync job runs
  Then only CVEs modified since last sync are fetched
  And new CVEs are added
  And existing CVEs are updated
  And sync timestamp is updated

Scenario: Rate limiting compliance
  Given NVD API has rate limits
  When making multiple API requests
  Then requests should be throttled appropriately
  And no 429 errors should occur

Scenario: Handle NVD API errors
  Given NVD API is temporarily unavailable
  When sync job runs
  Then error should be logged
  And sync should be retried later
  And partial progress should be preserved
```

---

## 2. SMTP Email Integration

### Purpose
Send email notifications for alerts, password resets, reports, and other system events.

### Implementation

#### 2.1 Mail Service

```typescript
// src/integrations/mail/mail.service.ts

interface MailServerConfig {
  smtpHost: string;
  smtpPort: number;
  username?: string;
  password?: string;
  useTLS: boolean;
  fromAddress: string;
  fromName: string;
}

interface SendMailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: MailAttachment[];
  template?: string;
  templateData?: Record<string, unknown>;
}

class MailService {
  // Initialize transporter
  private transporter: nodemailer.Transporter;

  constructor(config: MailServerConfig);

  // Test connection
  async testConnection(): Promise<{ success: boolean; error?: string }>;

  // Send email
  async send(options: SendMailOptions): Promise<void>;

  // Send templated email
  async sendTemplate(template: EmailTemplate, data: TemplateData): Promise<void>;
}
```

#### 2.2 Email Templates

```typescript
// src/integrations/mail/templates/index.ts

enum EmailTemplate {
  PASSWORD_RESET = 'password-reset',
  USER_INVITE = 'user-invite',
  ALERT_NOTIFICATION = 'alert-notification',
  REPORT_READY = 'report-ready',
  PATCH_DEPLOYMENT_COMPLETE = 'patch-deployment-complete',
  CRITICAL_VULNERABILITY = 'critical-vulnerability',
}

// Templates use handlebars or similar
interface PasswordResetTemplateData {
  userName: string;
  resetLink: string;
  expiresIn: string;
}
```

#### 2.3 Mail Queue (Optional for High Volume)

```typescript
// For high-volume email sending, use a queue
class MailQueue {
  async enqueue(mail: SendMailOptions, priority?: number): Promise<string>;
  async process(): Promise<void>;
  async getStatus(jobId: string): Promise<MailJobStatus>;
}
```

### TDD Scenarios

```gherkin
Feature: SMTP Email Integration

Scenario: Test mail server connection
  Given mail server is configured
  When I test the connection via POST /v1/settings/mail-server/test
  Then connection status should be returned
  And if successful, "success: true"
  And if failed, error message should explain why

Scenario: Send password reset email
  Given user requests password reset
  When system generates reset token
  Then email should be sent with reset link
  And email should use password-reset template
  And link should contain valid token

Scenario: Send alert notification
  Given alert configuration exists for email
  And alert condition is triggered
  When notification is sent
  Then email should be sent to configured recipients
  And email should contain alert details

Scenario: Handle SMTP failures gracefully
  Given mail server is unreachable
  When email send is attempted
  Then error should be logged
  And email should be queued for retry
  And user should receive appropriate error message
```

---

## 3. LDAP/Active Directory Integration

### Purpose
Allow users to authenticate using their corporate LDAP/Active Directory credentials and automatically sync user information.

### Implementation

#### 3.1 LDAP Service

```typescript
// src/integrations/ldap/ldap.service.ts

interface LDAPConfig {
  id: string;
  name: string;
  serverUrl: string;          // ldap://ldap.company.com:389
  baseDN: string;             // dc=company,dc=com
  bindDN: string;             // cn=service,dc=company,dc=com
  bindPassword: string;       // Encrypted
  userSearchFilter: string;   // (sAMAccountName={{username}})
  groupSearchFilter: string;  // (member={{userDN}})
  useTLS: boolean;
  tlsCertificate?: string;
  groupMappings: GroupMapping[];
  enabled: boolean;
}

interface GroupMapping {
  ldapGroup: string;    // CN=Admins,OU=Groups,DC=company,DC=com
  localRole: string;    // admin
}

interface LDAPAuthResult {
  success: boolean;
  user?: {
    dn: string;
    email: string;
    name: string;
    groups: string[];
  };
  error?: string;
}

class LDAPService {
  // Test LDAP configuration
  async testConnection(config: LDAPConfig): Promise<{ success: boolean; error?: string }>;

  // Authenticate user via LDAP
  async authenticate(username: string, password: string, configId: string): Promise<LDAPAuthResult>;

  // Search for user
  async searchUser(username: string, config: LDAPConfig): Promise<LDAPUser | null>;

  // Get user groups
  async getUserGroups(userDN: string, config: LDAPConfig): Promise<string[]>;

  // Map LDAP groups to local roles
  mapGroupsToRoles(groups: string[], mappings: GroupMapping[]): string;
}
```

#### 3.2 LDAP Authentication Flow

```typescript
// Integration with auth module

async function loginWithLDAP(username: string, password: string): Promise<AuthResult> {
  // 1. Find active LDAP configs
  const ldapConfigs = await ldapConfigService.findActive();

  for (const config of ldapConfigs) {
    try {
      // 2. Try to authenticate with each config
      const result = await ldapService.authenticate(username, password, config.id);

      if (result.success) {
        // 3. Find or create local user
        let user = await userService.findByEmail(result.user.email);

        if (!user) {
          // Create new user from LDAP data
          user = await userService.create({
            email: result.user.email,
            name: result.user.name,
            role: ldapService.mapGroupsToRoles(result.user.groups, config.groupMappings),
            authProvider: 'ldap',
            ldapDN: result.user.dn,
          });
        }

        // 4. Generate JWT tokens
        return generateTokens(user);
      }
    } catch (error) {
      // Log and try next config
      logger.warn(`LDAP auth failed for config ${config.name}`, error);
    }
  }

  throw new UnauthorizedError('Invalid credentials');
}
```

### TDD Scenarios

```gherkin
Feature: LDAP Authentication Integration

Scenario: Test LDAP connection
  Given LDAP config is saved
  When I POST to /v1/settings/ldap-configs/:id/test
  Then connection should be attempted
  And result should indicate success or failure
  And if failed, error should be descriptive

Scenario: Authenticate user via LDAP
  Given LDAP config exists with server "ldap.company.com"
  When user logs in with username "jsmith" and password
  Then system should bind to LDAP server using service account
  And search for user DN using baseDN and filter
  And attempt bind with user DN and password
  And if successful, fetch user attributes
  And map LDAP groups to local roles
  And create/update local user record
  And issue JWT tokens

Scenario: LDAP group to role mapping
  Given LDAP config has group mappings:
    | LDAP Group                         | Local Role |
    | CN=IT-Admins,OU=Groups,DC=corp     | admin      |
    | CN=IT-Users,OU=Groups,DC=corp      | user       |
  And user belongs to "CN=IT-Admins,OU=Groups,DC=corp"
  When user authenticates
  Then local user should have role "admin"

Scenario: Fallback to local auth when LDAP fails
  Given LDAP server is unreachable
  And user has local password set
  When user attempts login
  Then LDAP auth should timeout
  And local auth should be attempted
  And user should be authenticated locally

Scenario: New LDAP user provisioning
  Given user exists in LDAP but not locally
  When user authenticates via LDAP
  Then local user record should be created
  And user attributes should be synced from LDAP
  And user should receive JWT tokens
```

---

## 4. API Endpoints

### LDAP Configuration Endpoints
```
POST   /v1/settings/ldap-configs/:id/test  - Test LDAP connection
```

### Mail Server Endpoints
```
POST   /v1/settings/mail-server/test       - Test SMTP connection
```

### Vulnerability Preference Endpoints
```
POST   /v1/settings/vulnerability-preference/sync  - Trigger manual NVD sync
```

---

## 5. Error Handling

### External Service Errors
```typescript
// Integration-specific errors
class IntegrationError extends Error {
  constructor(
    public integration: 'nvd' | 'smtp' | 'ldap',
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
  }
}

// Handle gracefully in controllers
try {
  await nvdService.sync();
} catch (error) {
  if (error instanceof IntegrationError) {
    // Log and return user-friendly message
    logger.error(`${error.integration} integration failed`, error);
    return res.status(503).json({
      error: 'ServiceUnavailable',
      message: `${error.integration.toUpperCase()} service temporarily unavailable`,
      retryAfter: 60,
    });
  }
  throw error;
}
```

---

## 6. Configuration Management

### Environment Variables
```env
# NVD Configuration
NVD_API_KEY=your-api-key
NVD_BASE_URL=https://services.nvd.nist.gov/rest/json/cves/2.0
NVD_RATE_LIMIT=50

# SMTP Default (can be overridden in DB)
SMTP_HOST=smtp.company.com
SMTP_PORT=587
SMTP_USER=notifications@company.com
SMTP_PASS=encrypted-password

# LDAP Timeout
LDAP_CONNECT_TIMEOUT=5000
LDAP_OPERATION_TIMEOUT=10000
```

---

## 7. Testing Strategy

### Unit Tests
- Mock external services (NVD, SMTP, LDAP)
- Test transformation logic
- Test error handling

### Integration Tests
- Use test containers for LDAP (OpenLDAP)
- Use test SMTP server (smtp4dev or MailHog)
- Use recorded/mocked NVD responses

### E2E Tests
- Test full authentication flow with mock LDAP
- Test email delivery to test inbox
- Test vulnerability sync with sample data

---

## 8. Implementation Order

1. **SMTP Integration** (simplest, needed for password reset)
   - Mail service with nodemailer
   - Email templates
   - Test connection endpoint

2. **LDAP Integration** (medium complexity)
   - LDAP service with ldapjs
   - Authentication flow
   - Group mapping
   - Test connection endpoint

3. **NVD Integration** (most complex, background job)
   - NVD client with rate limiting
   - CVE parser/transformer
   - Sync job scheduler
   - Manual sync trigger

---

## 9. Dependencies

### NPM Packages
```json
{
  "nodemailer": "^6.9.x",      // SMTP
  "ldapjs": "^3.0.x",          // LDAP
  "node-cron": "^3.0.x",       // Scheduling
  "handlebars": "^4.7.x",      // Email templates
  "axios": "^1.6.x"            // HTTP client for NVD
}
```

---

## 10. Success Criteria

- [ ] SMTP connection test returns accurate status
- [ ] Password reset emails are sent successfully
- [ ] Alert emails are delivered to configured recipients
- [ ] LDAP connection test validates configuration
- [ ] LDAP users can authenticate
- [ ] LDAP groups are mapped to local roles correctly
- [ ] NVD sync fetches and stores CVE data
- [ ] Incremental sync only fetches changed CVEs
- [ ] Rate limiting prevents API abuse
- [ ] All integrations have mock fallbacks for testing
- [ ] Error messages are user-friendly
