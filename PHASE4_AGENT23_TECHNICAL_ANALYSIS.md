# Phase 4 Agent 23: Reports Module - Technical Analysis

## Architecture Overview

### Component Hierarchy

```
App.tsx
└── Routes
    └── /reports
        ├── MainLayout
        └── Reports.tsx (Main page)
            ├── DataTable (shared component)
            ├── CreateReportWizard.tsx (Modal)
            │   ├── Step 1: Type selection
            │   ├── Step 2: Columns & Filters
            │   └── Step 3: Format & Schedule
            ├── ScheduleReportModal.tsx
            ├── SendReportModal.tsx
            └── Details Drawer
```

### Data Flow Architecture

```
Frontend                      Backend                    Database/Storage
─────────────────────────────────────────────────────────────────────────

User Action
    ↓
React Component
    ↓
React Query Hook
    ↓
API Service
    ↓
HTTP Request  ────────────→  Express Router
                                    ↓
                            RBAC Middleware (checkPermission)
                                    ↓
                            Validation (Zod)
                                    ↓
                            Controller
                                    ↓
                            Service Layer
                                    ├────→ Prisma ORM ────→ PostgreSQL
                                    ├────→ MinIO Client  ────→ MinIO
                                    └────→ Email Service ────→ SMTP

                            Response
                ←────────────────────
Cache Update (React Query)
    ↓
Component Re-render
    ↓
UI Update
```

---

## State Management

### React Query Configuration

```typescript
// Query Keys Structure
reportKeys = {
  all: ['reports'],
  lists: (params) => [...reportKeys.all, 'list', params],
  detail: (id) => [...reportKeys.all, 'detail', id],
  preview: (id) => [...reportKeys.all, 'preview', id],
  templates: () => [...reportKeys.all, 'templates'],
  schedules: () => [...reportKeys.all, 'schedules'],
  vulnerabilityReports: () => [...reportKeys.all, 'vulnerability'],
}
```

### Local Component State

```typescript
// Reports.tsx Local State
const [searchText, setSearchText] = useState('');                    // Search filter
const [pagination, setPagination] = useState({                       // Pagination
  current: 1,
  pageSize: 20
});
const [filterType, setFilterType] = useState<ReportType>();         // Type filter
const [filterFormat, setFilterFormat] = useState<ReportFormat>();   // Format filter
const [filterStatus, setFilterStatus] = useState<ReportStatus>();   // Status filter
const [dateRange, setDateRange] = useState(null);                    // Date range filter

// Modal/Drawer State
const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
const [selectedReport, setSelectedReport] = useState<Report | null>(null);
const [createModalOpen, setCreateModalOpen] = useState(false);
const [editModalOpen, setEditModalOpen] = useState(false);
const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
const [sendModalOpen, setSendModalOpen] = useState(false);
```

### Wizard State

```typescript
// CreateReportWizard.tsx State
const [currentStep, setCurrentStep] = useState(0);        // Current wizard step (0-2)
const [reportId, setReportId] = useState<string | null>(); // Draft report ID
const [availableColumns, setAvailableColumns] = useState(); // Dynamic columns per type
const [availableFilters, setAvailableFilters] = useState(); // Dynamic filters per type
const [selectedColumns, setSelectedColumns] = useState();   // User-selected columns
```

---

## API Contract Specifications

### GET /v1/reports

**Request**:
```typescript
interface ListReportsParams {
  page?: number;              // Default: 1
  limit?: number;             // Default: 20, Max: 100
  search?: string;            // Search name, description, creator
  type?: ReportType;          // Filter by type
  format?: ReportFormat;      // Filter by format
  status?: ReportStatus;      // Filter by status
  sortBy?: string;            // name|type|status|createdAt|generatedAt
  sortOrder?: 'asc'|'desc';   // Sort direction
  startDate?: string;         // ISO date string
  endDate?: string;           // ISO date string
}
```

**Response**:
```typescript
interface PaginatedReportsResponse {
  data: Report[];             // Array of reports
  total: number;              // Total count
  page: number;               // Current page
  limit: number;              // Page size
  totalPages: number;         // Total pages available
}

interface Report {
  id: string;                 // UUID
  name: string;
  description?: string;
  type: ReportType;           // VULNERABILITY|PATCH|ASSET|COMPLIANCE|AUDIT|CUSTOM
  format: ReportFormat;       // PDF|CSV|XLSX|JSON
  status: ReportStatus;       // PENDING|PROCESSING|COMPLETED|FAILED
  filters?: ReportFilters;
  columns?: string[];
  schedule?: ReportSchedule;
  filePath?: string;
  fileSize?: number;          // Bytes
  generatedAt?: string;       // ISO datetime
  errorMessage?: string;      // If status === FAILED
  createdBy?: string;
  createdAt: string;          // ISO datetime
  updatedAt?: string;         // ISO datetime
}
```

---

### POST /v1/reports

**Request Variants**:

**Variant 1: Simple Creation (All-in-one)**
```typescript
interface CreateReportData {
  name: string;
  type: ReportType;
  description?: string;
  format: ReportFormat;
  filters?: ReportFilters;
  columns?: string[];
  schedule?: Partial<ReportSchedule>;
}
```

**Variant 2: Wizard Step 1**
```typescript
{
  step: 1,
  data: {
    type: ReportType;
    name: string;
    description?: string;
  }
}
```

**Response**:
```typescript
{
  reportId: string;              // New draft report ID
  availableColumns: string[];
  availableFilters: string[];
}
```

**Variant 3: Wizard Step 2**
```typescript
{
  step: 2,
  reportId: string;
  data: {
    filters?: ReportFilters;
    columns?: string[];
  }
}
```

**Response**:
```typescript
{
  reportId: string;
  preview: ReportPreview;        // Data preview
}
```

**Variant 4: Wizard Step 3**
```typescript
{
  step: 3,
  reportId: string;
  data: {
    format: ReportFormat;
    schedule?: Partial<ReportSchedule>;
  }
}
```

**Response**: Full Report object (triggers generation)

---

### GET /v1/reports/:id/download

**Request**:
```
GET /v1/reports/{reportId}/download?format=PDF
Accept: application/octet-stream
```

**Response**:
- Content-Type: application/pdf (or appropriate MIME type)
- Content-Disposition: attachment; filename="{reportName}.{ext}"
- Body: Binary file data (Blob)

---

### POST /v1/reports/:id/regenerate

**Request**:
```
POST /v1/reports/{reportId}/regenerate
```

**Response**:
```typescript
{
  status: 'PROCESSING',      // Status updated to PROCESSING
  generatedAt: null,         // Cleared for new generation
}
```

---

### POST /v1/reports/:id/send

**Request**:
```typescript
interface SendReportData {
  recipients: string[];      // Email addresses
  subject?: string;          // Custom subject
  message?: string;          // Custom message
  format?: ReportFormat;     // Override format
}
```

**Response**:
```typescript
{
  success: true,
  emailsSent: number;
  failedRecipients: string[];
}
```

---

### Schedule Endpoints

**POST /v1/reports/schedules**
```typescript
interface CreateScheduleData {
  reportId: string;
  enabled: boolean;
  frequency: 'DAILY'|'WEEKLY'|'MONTHLY';
  time?: string;             // HH:mm format
  dayOfWeek?: number;        // 0-6 for WEEKLY
  dayOfMonth?: number;       // 1-31 for MONTHLY
  recipients: string[];      // Email addresses
}
```

**Response**: ScheduledReport object with nextRunAt calculated

---

## Type System

### Type Hierarchy

```typescript
// Shared types (from @shared/types)
type ReportType = 'VULNERABILITY' | 'PATCH' | 'ASSET' | 'COMPLIANCE' | 'AUDIT' | 'CUSTOM';
type ReportFormat = 'PDF' | 'CSV' | 'XLSX' | 'JSON';
type ReportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
type ReportFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

// Filter Types
interface ReportFilters {
  [key: string]: unknown;    // Dynamic based on report type
  dateRange?: { start: string; end: string };
  severity?: string[];
  status?: string[];
  category?: string[];
  // ... other dynamic filters
}

// Schedule Types
interface ReportSchedule {
  enabled: boolean;
  frequency: ReportFrequency;
  time?: string;             // HH:mm
  dayOfWeek?: number;        // For WEEKLY
  dayOfMonth?: number;       // For MONTHLY
  recipients: string[];
  nextRunAt?: string;        // Calculated
  lastRunAt?: string;        // From execution
}
```

---

## Validation Rules

### Zod Schemas (Backend)

```typescript
// Report Creation Validation
reportBodySchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['VULNERABILITY', 'PATCH', 'ASSET', 'COMPLIANCE', 'AUDIT', 'CUSTOM']),
  description: z.string().optional(),
  format: z.enum(['PDF', 'CSV', 'XLSX', 'JSON']),
  filters: z.record(z.unknown()).optional(),
  columns: z.array(z.string()).optional(),
  schedule: z.object({
    enabled: z.boolean(),
    frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional(),
    time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    recipients: z.array(z.string().email()).optional()
  }).optional()
});

// Schedule Creation Validation
scheduleBodySchema = z.object({
  reportId: z.string().uuid(),
  enabled: z.boolean(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  dayOfWeek: z.number().min(0).max(6).optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
  recipients: z.array(z.string().email()).min(1, 'At least one recipient required')
});

// Send Report Validation
sendReportBodySchema = z.object({
  recipients: z.array(z.string().email()).min(1),
  subject: z.string().optional(),
  message: z.string().optional(),
  format: z.enum(['PDF', 'CSV', 'XLSX', 'JSON']).optional()
});
```

### Frontend Form Validation

```typescript
// Ant Design Form Rules
<Form.Item
  name="name"
  rules={[
    { required: true, message: 'Report name is required' },
    { min: 1, message: 'Name cannot be empty' },
    { max: 255, message: 'Name cannot exceed 255 characters' }
  ]}
>
  <Input />
</Form.Item>

<Form.Item
  name="recipients"
  rules={[
    { required: true, message: 'At least one recipient required' },
    {
      validator: (_, value) => {
        if (!value || value.every(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
          return Promise.resolve();
        }
        return Promise.reject(new Error('Invalid email addresses'));
      }
    }
  ]}
>
  <Select mode="multiple" />
</Form.Item>
```

---

## Error Handling

### Backend Error Responses

```typescript
// Standard API Error Format
interface ErrorResponse {
  success: false;
  error: {
    code: string;           // ERROR_CODE
    message: string;        // User-friendly message
    details?: unknown;      // Additional context
  }
}

// Common Error Codes
'REPORT_NOT_FOUND'          // 404
'REPORT_GENERATION_FAILED'  // 500
'INVALID_REPORT_TYPE'       // 400
'INVALID_FILTERS'           // 400
'INVALID_EMAIL'             // 400
'INSUFFICIENT_PERMISSIONS'  // 403
'UNAUTHORIZED'              // 401
```

### Frontend Error Handling

```typescript
// In React Components
try {
  const response = await reportsService.createReport(data);
  message.success('Report created');
} catch (error) {
  if (error.response?.status === 400) {
    message.error(error.response.data.error.message);
  } else if (error.response?.status === 403) {
    message.error('Insufficient permissions');
  } else {
    message.error('Failed to create report');
  }
}

// In React Query
const mutation = useMutation({
  mutationFn: createReport,
  onError: (error) => {
    const message = error.response?.data?.error?.message || 'Operation failed';
    toast.error(message);
  }
});
```

---

## Performance Optimization Strategies

### Query Optimization

```typescript
// 1. Lazy Loading
const { data, isLoading } = useReports(
  { page: 1, limit: 20 },
  { enabled: isVisible }  // Only fetch when visible
);

// 2. Pagination
// Load only 20 items by default, not all 10,000

// 3. Selective Fetching
// Request only needed fields (if API supports projection)

// 4. Caching
// React Query default cache: 5 minutes
// Manual invalidation only on mutations
```

### Rendering Optimization

```typescript
// 1. Component Memoization
const ReportRow = memo(({ report, onAction }) => (
  <Table.Row key={report.id}>...</Table.Row>
));

// 2. Virtual Scrolling
// For large lists, could implement react-window

// 3. Debounced Search
const [searchText, setSearchText] = useState('');
useEffect(() => {
  const timer = setTimeout(() => {
    refetch({ search: searchText });
  }, 300);
  return () => clearTimeout(timer);
}, [searchText]);
```

### Auto-Refresh Optimization

```typescript
// Current Implementation
const hasGenerating = reports.some(r => r.status === 'PROCESSING');
useEffect(() => {
  if (!hasGenerating) return;
  const id = setInterval(() => refetch(), 5000);
  return () => clearInterval(id);
}, [hasGenerating, refetch]);

// Potential Optimization
// 1. Use WebSocket for real-time updates
// 2. Exponential backoff: 5s → 10s → 15s
// 3. Stop polling when tab not active
// 4. Server-Sent Events (SSE) alternative
```

---

## Testing Strategy

### Unit Tests

```typescript
// Test: handleExport function
describe('handleExport', () => {
  test('should generate CSV with correct headers', () => {
    const reports = [
      { name: 'Test', type: 'VULNERABILITY', status: 'COMPLETED' }
    ];
    const csv = generateCSV(reports);
    expect(csv).toContain('Name,Description,Type,Format,Status');
  });

  test('should escape special characters', () => {
    const report = { name: 'Test, Report' };
    const csv = generateCSV([report]);
    expect(csv).toContain('"Test, Report"');
  });

  test('should handle empty reports', () => {
    expect(() => generateCSV([])).not.toThrow();
  });
});

// Test: calculateNextRun function
describe('calculateNextRun', () => {
  test('DAILY schedule should add 1 day', () => {
    const result = calculateNextRun('DAILY', null);
    expect(result.isSame(dayjs().add(1, 'day'), 'day')).toBe(true);
  });

  test('WEEKLY schedule should respect dayOfWeek', () => {
    const result = calculateNextRun('WEEKLY', 3);  // Wednesday
    expect(result.day()).toBe(3);
  });

  test('Time selection should override default time', () => {
    const result = calculateNextRun('DAILY', null, '14:30');
    expect(result.format('HH:mm')).toBe('14:30');
  });
});
```

### Integration Tests

```typescript
// Test: Full report creation flow
describe('Report Creation Flow', () => {
  test('should create report through 3-step wizard', async () => {
    const user = userEvent.setup();

    // Step 1: Select type
    await user.click(screen.getByText('Create'));
    await user.selectOption(screen.getByName('type'), 'VULNERABILITY');
    await user.type(screen.getByName('name'), 'Test Report');
    await user.click(screen.getByText('Next'));

    // Step 2: Select columns
    await user.click(screen.getByLabelText('CVE'));
    await user.click(screen.getByText('Next'));

    // Step 3: Set format
    await user.selectOption(screen.getByName('format'), 'PDF');
    await user.click(screen.getByText('Generate'));

    // Verify
    await waitFor(() => {
      expect(screen.getByText('Report created successfully')).toBeInTheDocument();
    });
  });
});

// Test: API integration
describe('Reports API', () => {
  test('POST /reports should create and return report', async () => {
    const response = await api.post('/reports', {
      name: 'Test',
      type: 'VULNERABILITY',
      format: 'PDF'
    });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('id');
    expect(response.data.status).toBe('PENDING');
  });

  test('Should auto-start generation on step 3', async () => {
    const report = await createReportStep3(reportId, {
      format: 'PDF',
      schedule: { enabled: false }
    });

    expect(report.status).toBe('PROCESSING');
  });
});
```

### E2E Tests

```typescript
// Test: User creates and downloads report
test('User can create and download vulnerability report', async ({ page }) => {
  // Login
  await page.goto('http://localhost:5173/login');
  await page.fill('input[type="email"]', 'admin@patchiq.io');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button:has-text("Sign In")');

  // Navigate to Reports
  await page.goto('http://localhost:5173/reports');

  // Create Report
  await page.click('button:has-text("Create")');
  await page.selectOption('[name="type"]', 'VULNERABILITY');
  await page.fill('[name="name"]', 'Test Report');
  await page.click('button:has-text("Next")');

  // Select Columns
  await page.click('[aria-label*="CVE"]');
  await page.click('button:has-text("Next")');

  // Set Format and Generate
  await page.selectOption('[name="format"]', 'PDF');
  await page.click('button:has-text("Generate")');

  // Wait for Completion
  await page.waitForTimeout(10000);  // Wait for processing
  await page.reload();

  // Download
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('button[title="Download"]')
  ]);

  expect(download.suggestedFilename()).toContain('.pdf');
});
```

---

## Deployment Considerations

### Environment Variables

```bash
# .env
VITE_API_BASE_URL=http://localhost:3000/v1
VITE_REPORTS_PAGE_SIZE=20

# Backend
REPORTS_STORAGE_TYPE=minio
REPORTS_MINIO_BUCKET=reports
REPORTS_EMAIL_ENABLED=true
REPORTS_GENERATION_TIMEOUT=300000
REPORTS_AUTO_CLEANUP_DAYS=90
```

### Production Deployment

```bash
# Build Frontend
cd frontend && npm run build

# Build Backend
cd backend && npm run build

# Start Services
docker-compose -f docker-compose.prod.yml up

# Database Migration
npx prisma migrate deploy

# Seed (optional)
npm run seed:prod
```

### Monitoring & Logging

```typescript
// Logger Integration
import { createLogger } from '@shared/services/logger';

const logger = createLogger('reports');

logger.info('Report creation started', { reportId, userId });
logger.error('Report generation failed', { reportId, error });
logger.warn('Report generation took longer than expected', { reportId, duration });
```

### Performance Monitoring

```typescript
// Track generation times
logger.info('Report generated', {
  reportId,
  duration: endTime - startTime,
  recordCount: data.length,
  format: report.format
});
```

---

## Future Enhancement Roadmap

### Phase 1: Core Enhancements
- [ ] Report preview before generation
- [ ] Bulk operations (delete, export)
- [ ] Saved filter presets
- [ ] Report comparison tool

### Phase 2: Advanced Features
- [ ] Custom report builder UI
- [ ] Report templates management
- [ ] Team sharing and permissions
- [ ] Report version history

### Phase 3: Performance & Scale
- [ ] Background job queue for generation
- [ ] Report caching strategy
- [ ] Large file streaming (> 100MB)
- [ ] Incremental report updates

### Phase 4: Integration
- [ ] Webhook notifications
- [ ] Third-party integrations (Slack, Teams)
- [ ] API rate limiting
- [ ] OAuth/SAML for sharing

---

**Document Version**: 1.0
**Last Updated**: 2026-02-17
**Status**: COMPLETE

