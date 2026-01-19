# External Dependencies Guide

## Overview

This guide covers how to handle external dependencies in the PatchIQ backend. The goal is to make all external services mockable for development and testing while providing easy integration for production.

---

## External Services

| Service | Purpose | Criticality |
|---------|---------|-------------|
| NIST NVD API | CVE vulnerability data | Required for vulnerability module |
| SMTP Server | Email notifications | Required for password reset, alerts |
| LDAP/AD | Enterprise authentication | Optional |
| Patch Repository | Patch binary downloads | Required for deployment |

---

## Architecture Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                         Backend Service                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────┐     ┌────────────────┐                      │
│  │ External       │     │ Mock           │                      │
│  │ Service Client │ ◄──►│ Implementation │                      │
│  └───────┬────────┘     └────────────────┘                      │
│          │                                                       │
│          │              ┌────────────────┐                      │
│          └─────────────►│ Interface      │◄─────────────────┐   │
│                         └────────────────┘                  │   │
│                                                             │   │
│                         ┌────────────────┐                  │   │
│                         │ Real           │──────────────────┘   │
│                         │ Implementation │                      │
│                         └────────────────┘                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key Principle:** Use dependency injection and interfaces so external services can be swapped with mocks.

---

## 1. NIST NVD API Integration

### Interface

**src/external/nvd/nvd.interface.ts:**
```typescript
export interface NvdService {
  searchCves(params: CveSearchParams): Promise<CveSearchResult>;
  getCveById(cveId: string): Promise<CveDetails | null>;
  syncCves(since: Date): Promise<SyncResult>;
}

export interface CveSearchParams {
  keyword?: string;
  cvssV3Severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  pubStartDate?: Date;
  pubEndDate?: Date;
  resultsPerPage?: number;
  startIndex?: number;
}

export interface CveDetails {
  id: string;
  sourceIdentifier: string;
  published: string;
  lastModified: string;
  vulnStatus: string;
  descriptions: { lang: string; value: string }[];
  metrics: {
    cvssMetricV31?: any[];
    cvssMetricV2?: any[];
  };
  weaknesses: any[];
  references: { url: string; source: string }[];
}
```

### Real Implementation

**src/external/nvd/nvd.service.ts:**
```typescript
import axios from 'axios';
import { NvdService, CveSearchParams, CveDetails, CveSearchResult } from './nvd.interface';

export class RealNvdService implements NvdService {
  private baseUrl = 'https://services.nvd.nist.gov/rest/json/cves/2.0';
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.NIST_NVD_API_KEY;
  }

  async searchCves(params: CveSearchParams): Promise<CveSearchResult> {
    const queryParams = new URLSearchParams();

    if (params.keyword) queryParams.set('keywordSearch', params.keyword);
    if (params.cvssV3Severity) queryParams.set('cvssV3Severity', params.cvssV3Severity);
    if (params.pubStartDate) queryParams.set('pubStartDate', params.pubStartDate.toISOString());
    if (params.pubEndDate) queryParams.set('pubEndDate', params.pubEndDate.toISOString());
    if (params.resultsPerPage) queryParams.set('resultsPerPage', String(params.resultsPerPage));
    if (params.startIndex) queryParams.set('startIndex', String(params.startIndex));

    const headers: any = {};
    if (this.apiKey) {
      headers['apiKey'] = this.apiKey;
    }

    // Rate limiting: without API key, limit is 5 requests/30 seconds
    // With API key: 50 requests/30 seconds
    const response = await axios.get(this.baseUrl, {
      params: queryParams,
      headers,
    });

    return {
      totalResults: response.data.totalResults,
      vulnerabilities: response.data.vulnerabilities?.map((v: any) => v.cve) || [],
    };
  }

  async getCveById(cveId: string): Promise<CveDetails | null> {
    const headers: any = {};
    if (this.apiKey) {
      headers['apiKey'] = this.apiKey;
    }

    try {
      const response = await axios.get(this.baseUrl, {
        params: { cveId },
        headers,
      });

      const vuln = response.data.vulnerabilities?.[0];
      return vuln?.cve || null;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async syncCves(since: Date): Promise<SyncResult> {
    let startIndex = 0;
    const resultsPerPage = 2000;
    let totalFetched = 0;

    while (true) {
      const result = await this.searchCves({
        pubStartDate: since,
        resultsPerPage,
        startIndex,
      });

      // Store CVEs in database
      for (const cve of result.vulnerabilities) {
        await this.upsertCve(cve);
        totalFetched++;
      }

      if (startIndex + resultsPerPage >= result.totalResults) {
        break;
      }

      startIndex += resultsPerPage;

      // Rate limiting delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return { synced: totalFetched };
  }

  private async upsertCve(cve: CveDetails) {
    // Implementation to insert/update CVE in database
    const { prisma } = await import('@/db/client');

    const cvss3 = cve.metrics?.cvssMetricV31?.[0];
    const severity = cvss3?.cvssData?.baseSeverity || 'LOW';

    await prisma.vulnerability.upsert({
      where: { cveId: cve.id },
      create: {
        cveId: cve.id,
        title: cve.descriptions?.[0]?.value?.slice(0, 255) || cve.id,
        description: cve.descriptions?.[0]?.value,
        severity: severity.toUpperCase(),
        cvssScore: cvss3?.cvssData?.baseScore,
        cvssVector: cvss3?.cvssData?.vectorString,
        publishedDate: new Date(cve.published),
        lastModified: new Date(cve.lastModified),
        attackVector: cvss3?.cvssData?.attackVector,
        attackComplexity: cvss3?.cvssData?.attackComplexity,
      },
      update: {
        title: cve.descriptions?.[0]?.value?.slice(0, 255) || cve.id,
        description: cve.descriptions?.[0]?.value,
        severity: severity.toUpperCase(),
        cvssScore: cvss3?.cvssData?.baseScore,
        cvssVector: cvss3?.cvssData?.vectorString,
        lastModified: new Date(cve.lastModified),
      },
    });
  }
}
```

### Mock Implementation

**src/external/nvd/nvd.mock.ts:**
```typescript
import { NvdService, CveSearchParams, CveDetails, CveSearchResult } from './nvd.interface';

export class MockNvdService implements NvdService {
  private mockCves: CveDetails[] = [
    {
      id: 'CVE-2024-12345',
      sourceIdentifier: 'nvd@nist.gov',
      published: '2024-01-01T00:00:00.000Z',
      lastModified: '2024-01-15T00:00:00.000Z',
      vulnStatus: 'Analyzed',
      descriptions: [
        { lang: 'en', value: 'Mock vulnerability for testing purposes' },
      ],
      metrics: {
        cvssMetricV31: [{
          cvssData: {
            baseScore: 9.8,
            baseSeverity: 'CRITICAL',
            vectorString: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
            attackVector: 'NETWORK',
            attackComplexity: 'LOW',
          },
        }],
      },
      weaknesses: [],
      references: [{ url: 'https://example.com', source: 'vendor' }],
    },
    // Add more mock CVEs as needed
  ];

  async searchCves(params: CveSearchParams): Promise<CveSearchResult> {
    let results = [...this.mockCves];

    if (params.keyword) {
      results = results.filter((c) =>
        c.descriptions.some((d) =>
          d.value.toLowerCase().includes(params.keyword!.toLowerCase())
        )
      );
    }

    if (params.cvssV3Severity) {
      results = results.filter((c) =>
        c.metrics.cvssMetricV31?.[0]?.cvssData?.baseSeverity === params.cvssV3Severity
      );
    }

    return {
      totalResults: results.length,
      vulnerabilities: results,
    };
  }

  async getCveById(cveId: string): Promise<CveDetails | null> {
    return this.mockCves.find((c) => c.id === cveId) || null;
  }

  async syncCves(since: Date): Promise<SyncResult> {
    // Mock sync - just return count
    return { synced: this.mockCves.length };
  }
}
```

### Factory

**src/external/nvd/index.ts:**
```typescript
import { NvdService } from './nvd.interface';
import { RealNvdService } from './nvd.service';
import { MockNvdService } from './nvd.mock';

export function createNvdService(): NvdService {
  if (process.env.NODE_ENV === 'test' || process.env.USE_MOCK_NVD === 'true') {
    return new MockNvdService();
  }
  return new RealNvdService();
}

export * from './nvd.interface';
```

---

## 2. Email Service

### Interface

**src/external/email/email.interface.ts:**
```typescript
export interface EmailService {
  send(options: EmailOptions): Promise<void>;
  sendPasswordReset(email: string, token: string): Promise<void>;
  sendInvitation(email: string, token: string): Promise<void>;
  sendAlert(recipients: string[], subject: string, body: string): Promise<void>;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}
```

### Mock Implementation

**src/external/email/email.mock.ts:**
```typescript
export class MockEmailService implements EmailService {
  private sentEmails: EmailOptions[] = [];

  async send(options: EmailOptions): Promise<void> {
    console.log(`[MockEmail] Sending to ${options.to}: ${options.subject}`);
    this.sentEmails.push(options);
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    await this.send({
      to: email,
      subject: 'Password Reset Request',
      html: `<p>Reset your password: <a href="http://localhost:5173/reset-password?token=${token}">Click here</a></p>`,
    });
  }

  async sendInvitation(email: string, token: string): Promise<void> {
    await this.send({
      to: email,
      subject: 'You have been invited to PatchIQ',
      html: `<p>Complete your registration: <a href="http://localhost:5173/onboarding?token=${token}">Click here</a></p>`,
    });
  }

  async sendAlert(recipients: string[], subject: string, body: string): Promise<void> {
    await this.send({
      to: recipients,
      subject,
      html: body,
    });
  }

  // For testing
  getSentEmails(): EmailOptions[] {
    return this.sentEmails;
  }

  clearSentEmails(): void {
    this.sentEmails = [];
  }
}
```

---

## 3. Patch Repository

For patch binaries, you have several options:

### Option A: Local File Storage

Store patch files locally during development:

```
/patches
├── windows/
│   ├── KB5034441.msu
│   └── KB5034442.msu
├── macos/
│   └── macOS14.2-update.pkg
└── linux/
    └── security-update-2024.deb
```

### Option B: S3-Compatible Storage

Use MinIO for local S3-compatible storage:

```yaml
# docker-compose.yml
services:
  minio:
    image: minio/minio
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    environment:
      MINIO_ROOT_USER: admin
      MINIO_ROOT_PASSWORD: password
    command: server /data --console-address ":9001"
```

### Option C: Mock URLs

For development without actual files:

```typescript
export class MockPatchRepository {
  async getDownloadUrl(patchId: string): Promise<string> {
    // Return mock URL that returns 404 or placeholder
    return `http://localhost:3000/mock-patches/${patchId}`;
  }

  async uploadPatch(patchId: string, file: Buffer): Promise<void> {
    console.log(`[MockPatchRepo] Would upload ${patchId} (${file.length} bytes)`);
  }
}
```

---

## Environment Configuration

**.env.development:**
```env
# Use mocks for all external services
USE_MOCK_NVD=true
USE_MOCK_EMAIL=true
USE_MOCK_LDAP=true
USE_MOCK_PATCHES=true
```

**.env.production:**
```env
# Real external services
USE_MOCK_NVD=false
USE_MOCK_EMAIL=false
USE_MOCK_LDAP=false
USE_MOCK_PATCHES=false

NIST_NVD_API_KEY=your-api-key
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user
SMTP_PASS=password
LDAP_HOST=ldap.example.com
PATCH_STORAGE_URL=s3://patches-bucket
```

---

## Testing Strategy

1. **Unit Tests**: Always use mocks
2. **Integration Tests**: Use mocks by default, real services in CI with `--real-services` flag
3. **E2E Tests**: Can use real services in staging environment

```typescript
// tests/setup.ts
import { createNvdService } from '@/external/nvd';
import { createEmailService } from '@/external/email';

// Force mocks in tests
process.env.USE_MOCK_NVD = 'true';
process.env.USE_MOCK_EMAIL = 'true';

export const nvdService = createNvdService();
export const emailService = createEmailService();
```

---

## Graceful Degradation

When external services are unavailable, the system should:

1. **Log the error** with details
2. **Return cached data** if available
3. **Show user-friendly error** if critical
4. **Queue for retry** if possible

```typescript
async function syncVulnerabilities() {
  try {
    const nvd = createNvdService();
    await nvd.syncCves(lastSyncDate);
  } catch (error) {
    console.error('NVD sync failed:', error);

    // Queue for retry
    await jobQueue.add('nvd-sync', { retryAt: Date.now() + 3600000 });

    // Don't fail the application
    return { success: false, error: 'NVD sync failed, will retry' };
  }
}
```
