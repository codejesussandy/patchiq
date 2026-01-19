# Dashboard & Reports Implementation Guide

## API Contract
**Spec**: `backend-debt/dashboard-reports-api.yaml`

## Endpoints Overview
```
# Dashboard
GET    /v1/dashboard                     - Get dashboard data
GET    /v1/dashboard/stats               - Get statistics summary
GET    /v1/dashboard/charts/patches      - Patch distribution chart
GET    /v1/dashboard/charts/assets       - Asset status chart
GET    /v1/dashboard/charts/vulnerabilities - Vulnerability trends
GET    /v1/dashboard/recent-activity     - Recent activity feed

# Reports
GET    /v1/reports                       - List reports
GET    /v1/reports/:id                   - Get report details
POST   /v1/reports                       - Create/generate report
PUT    /v1/reports/:id                   - Update report
DELETE /v1/reports/:id                   - Delete report
GET    /v1/reports/:id/download          - Download report file
POST   /v1/reports/schedule              - Schedule recurring report
```

## Reference Implementation
- **Dashboard**: `frontend/src/pages/Dashboard.tsx`
- **Reports**: `frontend/src/pages/Reports.tsx`
- **Create Report**: `frontend/src/pages/CreateReport.tsx`
- **Service**: `frontend/src/services/dashboard.service.ts`, `reports.service.ts`
- **Mock**: `frontend/src/mocks/handlers/dashboard.handlers.ts`, `reports.handlers.ts`
- **Types**: `frontend/src/types/dashboard.types.ts`, `reports.types.ts`

---

## Data Models

### DashboardStats
```typescript
{
  totalEndpoints: number;           // Total number of endpoints
  dataLossEndpoints: number;        // Endpoints with potential data loss
  windowsEndpoints: number;         // Windows OS count
  linuxEndpoints: number;           // Linux OS count
  macEndpoints: number;             // macOS count
  totalAgents: number;              // Total registered agents
  totalVulnerabilities: number;     // Total vulnerabilities detected
  unmitigatedVulnerabilities: number; // Unresolved vulnerabilities
  criticalVulnerabilities: number;
  highVulnerabilities: number;
  mediumVulnerabilities: number;
  lowVulnerabilities: number;
}
```

### DashboardData
```typescript
{
  stats: DashboardStats;

  // Sankey chart data for vulnerability classification
  vulnerabilityClassification: Array<{
    source: 'Critical' | 'High' | 'Medium' | 'Low';
    target: string;                 // e.g., "Remote Code Execution"
    value: number;
  }>;

  // Pie chart for OS distribution
  endpointDistribution: Array<{
    name: string;                   // e.g., "Windows 10"
    value: number;
    color: string;                  // Hex color
  }>;

  // Bar chart data - vulnerabilities by published date
  vulnerabilityByPublishedDate: Array<{
    date: string;                   // e.g., "< 30 days"
    critical: number;
    high: number;
    medium: number;
    low: number;
  }>;

  // Bar chart data - vulnerabilities by discovered date
  vulnerabilityByDiscoveredDate: Array<{
    date: string;                   // e.g., "< 30 days"
    critical: number;
    high: number;
    medium: number;
    low: number;
  }>;

  // Table data - severity breakdown by date range
  vulnerabilityBySeverityTable: Array<{
    severity: string;
    '>90days': number;
    '60-90days': number;
    '30-60days': number;
    '<30days': number;
  }>;

  // Table data - vulnerabilities by published date
  vulnerabilityByPublishedDateTable: Array<{
    dateRange: string;
    critical: number;
    high: number;
    medium: number;
    low: number;
  }>;

  // Top vulnerabilities lists
  topVulnerabilities: {
    byCVSS: Array<{
      cve: string;
      score: number;
      affectedEndpoints: number;
      severity: 'critical' | 'high' | 'medium' | 'low';
      description: string;
    }>;
    byEPSS: Array<{
      cve: string;
      score: number;
      affectedEndpoints: number;
      severity: 'critical' | 'high' | 'medium' | 'low';
      description: string;
    }>;
  };

  // Patch compliance summary
  patchCompliance: {
    compliant: number;
    nonCompliant: number;
    pending: number;
  };

  // Recent activity summary
  recentActivity: {
    patchesDeployed: number;
    patchesFailed: number;
    endpointsScanned: number;
    lastScanTime: string;           // ISO 8601
  };

  // Expired certificates by platform
  expiredCertificates: Array<{
    name: string;
    value: number;
  }>;

  // Malicious processes detected by platform
  maliciousProcessesByPlatform: Array<{
    name: string;
    value: number;
  }>;

  // Total software count by platform
  totalSoftwareByPlatform: Array<{
    name: string;
    value: number;
  }>;

  // Risk score distribution by endpoint
  riskScoreByEndpoints: Array<{
    name: string;
    value: number;                  // Risk score 0-10
  }>;

  // Alert count by severity
  alertCountBySeverity: Array<{
    severity: string;
    count: number;
  }>;

  // Alert severity breakdown by platform
  alertSeverityCountByPlatform: Array<{
    platform: string;
    critical: number;
    high: number;
    medium: number;
    low: number;
  }>;

  // Daily vulnerability detection trend
  dayWiseVulnerabilityDetection: Array<{
    day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
    count: number;
  }>;

  // Alert severity by module
  alertSeverityCountByModule: Array<{
    module: string;
    critical: number;
    high: number;
    medium: number;
  }>;
}
```

### Report
```typescript
{
  id: string;
  name: string;
  description?: string;
  type: 'patch' | 'asset' | 'vulnerability' | 'compliance' | 'audit' | 'custom';
  format: 'PDF' | 'CSV' | 'Excel';
  status: 'draft' | 'generating' | 'completed' | 'failed';
  filters?: {
    dateRange?: { start: string; end: string };
    severity?: string[];
    status?: string[];
    category?: string[];
  };
  columns?: string[];             // Selected columns for report
  schedule?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    time?: string;                // HH:mm format
    dayOfWeek?: number;           // 0-6 for weekly
    dayOfMonth?: number;          // 1-31 for monthly
    recipients: string[];         // Email addresses
  };
  fileUrl?: string;               // Generated report file
  generatedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```

### ReportTemplate
```typescript
{
  id: string;
  name: string;
  type: string;
  description: string;
  availableColumns: string[];
  defaultColumns: string[];
  availableFilters: string[];
}
```

---

## TDD Scenarios

### Dashboard

**GET /v1/dashboard**
Returns complete dashboard data with all widgets.

```json
Response (200):
{
  "stats": {
    "totalEndpoints": 11,
    "dataLossEndpoints": 9,
    "windowsEndpoints": 2,
    "linuxEndpoints": 7,
    "macEndpoints": 2,
    "totalAgents": 0,
    "totalVulnerabilities": 3165,
    "unmitigatedVulnerabilities": 9063,
    "criticalVulnerabilities": 127,
    "highVulnerabilities": 1181,
    "mediumVulnerabilities": 1542,
    "lowVulnerabilities": 315
  },
  "vulnerabilityClassification": [
    { "source": "Critical", "target": "Remote Code Execution", "value": 45 },
    { "source": "Critical", "target": "Privilege Escalation", "value": 32 },
    { "source": "High", "target": "Cross-Site Scripting", "value": 189 }
  ],
  "endpointDistribution": [
    { "name": "Windows 10", "value": 1, "color": "#5B8FF9" },
    { "name": "Ubuntu 20.04", "value": 3, "color": "#F6BD16" },
    { "name": "macOS Ventura", "value": 1, "color": "#9270CA" }
  ],
  "vulnerabilityByPublishedDate": [
    { "date": "< 30 days", "critical": 12, "high": 89, "medium": 156, "low": 45 },
    { "date": "30-60 days", "critical": 23, "high": 134, "medium": 234, "low": 67 },
    { "date": "> 180 days", "critical": 40, "high": 601, "medium": 585, "low": 62 }
  ],
  "vulnerabilityByDiscoveredDate": [
    { "date": "< 30 days", "critical": 8, "high": 67, "medium": 123, "low": 34 },
    { "date": "30-60 days", "critical": 15, "high": 98, "medium": 187, "low": 45 }
  ],
  "vulnerabilityByPublishedDateTable": [
    { "dateRange": "> 90 days", "critical": 316, "high": 1161, "medium": 1545, "low": 137 },
    { "dateRange": "< 30 days", "critical": 3, "high": 70, "medium": 32, "low": 3 }
  ],
  "topVulnerabilities": {
    "byCVSS": [
      { "cve": "CVE-2021-44228", "score": 10.0, "affectedEndpoints": 3, "severity": "critical", "description": "Log4j RCE" },
      { "cve": "CVE-2017-12617", "score": 9.2, "affectedEndpoints": 1, "severity": "critical", "description": "Apache Tomcat RCE" }
    ],
    "byEPSS": [
      { "cve": "CVE-2020-11651", "score": 94.42, "affectedEndpoints": 1, "severity": "critical", "description": "SaltStack Auth Bypass" },
      { "cve": "CVE-2020-1472", "score": 94.38, "affectedEndpoints": 2, "severity": "critical", "description": "Zerologon" }
    ]
  },
  "patchCompliance": {
    "compliant": 4,
    "nonCompliant": 5,
    "pending": 2
  },
  "recentActivity": {
    "patchesDeployed": 23,
    "patchesFailed": 3,
    "endpointsScanned": 11,
    "lastScanTime": "2024-01-15T10:30:00Z"
  },
  "expiredCertificates": [
    { "name": "Windows 10", "value": 3 },
    { "name": "Ubuntu 20.04", "value": 2 }
  ],
  "maliciousProcessesByPlatform": [
    { "name": "Windows 10 Pro", "value": 12 },
    { "name": "Ubuntu 20.04", "value": 8 }
  ],
  "totalSoftwareByPlatform": [
    { "name": "Windows", "value": 156 },
    { "name": "Linux", "value": 234 },
    { "name": "macOS", "value": 78 }
  ],
  "riskScoreByEndpoints": [
    { "name": "Endpoint-01", "value": 8.5 },
    { "name": "Endpoint-03", "value": 9.1 }
  ],
  "alertCountBySeverity": [
    { "severity": "Critical", "count": 12 },
    { "severity": "High", "count": 45 }
  ],
  "alertSeverityCountByPlatform": [
    { "platform": "Windows 10 Pro", "critical": 3, "high": 12, "medium": 25, "low": 48 },
    { "platform": "Ubuntu 20.04", "critical": 5, "high": 18, "medium": 32, "low": 62 }
  ],
  "dayWiseVulnerabilityDetection": [
    { "day": "Mon", "count": 45 },
    { "day": "Fri", "count": 67 }
  ],
  "alertSeverityCountByModule": [
    { "module": "MongoDB - 20", "critical": 2, "high": 8, "medium": 15 },
    { "module": "Windows 10", "critical": 3, "high": 12, "medium": 25 }
  ]
}
```

**GET /v1/dashboard/stats**
Returns just the statistics summary.

```json
Response (200):
{
  "totalEndpoints": 11,
  "dataLossEndpoints": 9,
  "windowsEndpoints": 2,
  "linuxEndpoints": 7,
  "macEndpoints": 2,
  "totalAgents": 0,
  "totalVulnerabilities": 3165,
  "unmitigatedVulnerabilities": 9063,
  "criticalVulnerabilities": 127,
  "highVulnerabilities": 1181,
  "mediumVulnerabilities": 1542,
  "lowVulnerabilities": 315
}
```

**GET /v1/dashboard/top-vulnerabilities**
Returns top vulnerabilities by CVSS and EPSS scores.

```json
Response (200):
{
  "byCVSS": [
    { "cve": "CVE-2021-44228", "score": 10.0, "affectedEndpoints": 3, "severity": "critical", "description": "Log4j RCE" }
  ],
  "byEPSS": [
    { "cve": "CVE-2020-11651", "score": 94.42, "affectedEndpoints": 1, "severity": "critical", "description": "SaltStack Auth Bypass" }
  ]
}
```

**POST /v1/dashboard/refresh**
Triggers a refresh of dashboard data (for real-time updates).

```json
Response (200): [Full dashboard data]
```

**GET /v1/dashboard/charts/patches**

**Query Parameters**
| Param | Type | Description |
|-------|------|-------------|
| groupBy | string | 'severity', 'os', 'status' |
| dateRange | string | 'week', 'month', 'quarter', 'year' |

```json
Response (200):
{
  "labels": ["CRITICAL", "High", "Medium", "Low"],
  "data": [450, 1200, 2500, 1270],
  "colors": ["#ff4d4f", "#fa8c16", "#faad14", "#52c41a"]
}
```

---

### Reports

**GET /v1/reports**

**Query Parameters**
| Param | Type | Description |
|-------|------|-------------|
| type | string | Filter by report type |
| status | string | Filter by status |
| search | string | Search by name |
| page | number | Page number |
| limit | number | Items per page |

```json
Response (200):
{
  "data": [
    {
      "id": "rpt-uuid",
      "name": "Weekly Patch Status",
      "type": "patch",
      "format": "PDF",
      "status": "completed",
      "generatedAt": "2024-01-15T02:00:00Z",
      "fileUrl": "/reports/rpt-uuid.pdf",
      "schedule": {
        "enabled": true,
        "frequency": "weekly",
        "dayOfWeek": 1,
        "time": "02:00",
        "recipients": ["admin@example.com"]
      },
      "createdBy": "Admin"
    }
  ],
  "total": 25
}
```

---

**POST /v1/reports** (Create Report Wizard)

**Step 1: Select Type**
```json
Request:
{
  "step": 1,
  "data": {
    "type": "patch",
    "name": "Monthly Patch Report",
    "description": "Comprehensive patch status for January"
  }
}

Response (200):
{
  "reportId": "draft-uuid",
  "availableColumns": [
    "patchId", "software", "severity", "os", "status",
    "installedEndpoints", "pendingEndpoints", "failedEndpoints",
    "releaseDate"
  ],
  "availableFilters": [
    "severity", "os", "status", "dateRange"
  ]
}
```

**Step 2: Configure Filters & Columns**
```json
Request:
{
  "step": 2,
  "reportId": "draft-uuid",
  "data": {
    "filters": {
      "dateRange": {
        "start": "2024-01-01",
        "end": "2024-01-31"
      },
      "severity": ["CRITICAL", "High"]
    },
    "columns": ["patchId", "software", "severity", "status", "installedEndpoints"]
  }
}

Response (200):
{
  "reportId": "draft-uuid",
  "preview": {
    "rowCount": 150,
    "sampleData": [...]
  }
}
```

**Step 3: Format & Schedule**
```json
Request:
{
  "step": 3,
  "reportId": "draft-uuid",
  "data": {
    "format": "PDF",
    "schedule": {
      "enabled": true,
      "frequency": "monthly",
      "dayOfMonth": 1,
      "time": "08:00",
      "recipients": ["admin@example.com", "manager@example.com"]
    }
  }
}

Response (201):
{
  "id": "rpt-uuid",
  "name": "Monthly Patch Report",
  "status": "generating",
  "message": "Report generation started"
}
```

---

**GET /v1/reports/:id/download**

**Response**
- Content-Type: `application/pdf`, `text/csv`, or `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Content-Disposition: `attachment; filename="report-name.pdf"`
- File content as binary

**Error Cases**
| Case | Status | Response |
|------|--------|----------|
| Report not found | 404 | `{ "error": "Report not found" }` |
| Not yet generated | 400 | `{ "error": "Report is still generating" }` |
| Generation failed | 400 | `{ "error": "Report generation failed" }` |

---

## Report Types & Templates

### Patch Report
**Available Columns:**
- patchId, software, category, severity, os
- status, releaseDate, kbNumber
- affectedEndpoints, installedEndpoints, pendingEndpoints, failedEndpoints

**Available Filters:**
- severity (multi-select)
- os (multi-select)
- status (multi-select)
- category (multi-select)
- dateRange (release date)

### Asset Report
**Available Columns:**
- assetId, name, category, subCategory
- status, operationalStatus
- osType, osVersion
- ipAddress, lastSeen

**Available Filters:**
- category (multi-select)
- status (multi-select)
- operationalStatus (multi-select)
- osType (multi-select)

### Vulnerability Report
**Available Columns:**
- cve, severity, epss, riskScore
- cvss3BaseScore, exploitable
- endpoints, affectedSoftwares
- published

**Available Filters:**
- severity (multi-select)
- exploitable (boolean)
- riskScoreRange (min-max)
- cvssRange (min-max)
- publishedDateRange

### Compliance Report
**Available Columns:**
- assetName, complianceScore
- patches.installed, patches.pending, patches.failed
- vulnerabilities.critical, vulnerabilities.high
- lastAuditDate

**Available Filters:**
- complianceScoreRange (min-max)
- auditDateRange

### Audit Report
**Available Columns:**
- timestamp, module, operation
- user, status, message
- ipAddress

**Available Filters:**
- module (multi-select)
- operation (multi-select)
- user (multi-select)
- status (success/error)
- dateRange

---

## Database Schema

```sql
-- Reports
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL,
  format VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',
  filters JSONB,
  columns TEXT[],
  file_url TEXT,
  generated_at TIMESTAMP,
  error_message TEXT,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_reports_type ON reports(type);
CREATE INDEX idx_reports_status ON reports(status);

-- Report Schedules
CREATE TABLE report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT false,
  frequency VARCHAR(20) NOT NULL,
  time TIME,
  day_of_week INTEGER,
  day_of_month INTEGER,
  recipients TEXT[] NOT NULL,
  next_run_at TIMESTAMP,
  last_run_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_report_schedules_next_run ON report_schedules(next_run_at);

-- Report Templates (seed data)
CREATE TABLE report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  available_columns TEXT[] NOT NULL,
  default_columns TEXT[] NOT NULL,
  available_filters TEXT[] NOT NULL
);

-- Dashboard Widgets (user customization)
CREATE TABLE dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  widget_type VARCHAR(50) NOT NULL,
  position INTEGER NOT NULL,
  config JSONB,
  visible BOOLEAN DEFAULT true,
  UNIQUE(user_id, widget_type)
);
```

---

## Report Generation

### PDF Generation
- Use Puppeteer or PDFKit
- Template-based rendering
- Include charts and tables
- Header with company branding
- Footer with page numbers

### CSV Generation
- UTF-8 BOM for Excel compatibility
- Escape special characters
- Include header row

### Excel Generation
- Use ExcelJS or xlsx library
- Multiple sheets if needed
- Styled headers
- Auto-fit column widths

### Background Job
```typescript
// Report generation job
async function generateReport(reportId: string) {
  const report = await Report.findById(reportId);

  try {
    report.status = 'generating';
    await report.save();

    // Fetch data based on filters
    const data = await fetchReportData(report.type, report.filters);

    // Generate file
    const fileUrl = await generateFile(data, report.format, report.columns);

    report.status = 'completed';
    report.fileUrl = fileUrl;
    report.generatedAt = new Date();
    await report.save();

    // Notify subscribers
    await notifyReportReady(report);

  } catch (error) {
    report.status = 'failed';
    report.errorMessage = error.message;
    await report.save();
  }
}
```

---

## Scheduled Reports

### Cron Job
```typescript
// Run every hour to check scheduled reports
cron.schedule('0 * * * *', async () => {
  const dueReports = await ReportSchedule.find({
    enabled: true,
    nextRunAt: { $lte: new Date() }
  });

  for (const schedule of dueReports) {
    await queueReportGeneration(schedule.reportId);
    await updateNextRunTime(schedule);
  }
});
```

### Calculate Next Run
```typescript
function calculateNextRun(schedule: ReportSchedule): Date {
  const now = new Date();

  switch (schedule.frequency) {
    case 'daily':
      return addDays(now, 1);
    case 'weekly':
      return nextWeekday(schedule.dayOfWeek);
    case 'monthly':
      return nextMonthDay(schedule.dayOfMonth);
  }
}
```

---

## Export Formats

### CSV Headers (Patch Report)
```csv
Patch ID,Software,Severity,OS,Status,Installed,Pending,Failed,Release Date
PATCH-001,Windows Update KB123,CRITICAL,Windows,Completed,150,0,5,2024-01-15
```

### PDF Structure
```
+----------------------------------+
| Company Logo    Report Title     |
| Generated: 2024-01-15 10:00      |
+----------------------------------+
| Summary Statistics               |
| - Total: 500                     |
| - Critical: 50                   |
+----------------------------------+
| Data Table                       |
| [Paginated content]              |
+----------------------------------+
| Page 1 of 10                     |
+----------------------------------+
```

---

## Implementation Order

1. Dashboard data aggregation queries
2. GET /v1/dashboard endpoint
3. Chart data endpoints
4. Reports table + CRUD
5. Report templates (seed data)
6. Report wizard API (steps)
7. CSV generation
8. PDF generation
9. Excel generation
10. Report download endpoint
11. Report scheduling
12. Scheduled job runner
13. Email notifications
14. Dashboard widget customization
