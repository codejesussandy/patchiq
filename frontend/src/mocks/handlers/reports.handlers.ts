import { http, HttpResponse } from 'msw';
import type { Report, VulnerabilityReport, VulnerabilityReportData } from '../../types/reports.types';

const API_BASE_URL = '/v1';

// Mock vulnerability report data (from reference page)
const vulnerabilityReportsByCvss: VulnerabilityReport[] = [
  {
    id: '1',
    cve: 'CVE-2017-12617',
    title: 'Apache Tomcat RCE',
    severity: 'CRITICAL',
    cvssScore: 92,
    epssScore: 94.36,
    affectedEndpoints: 1,
    publishedDate: '2017-09-19',
    discoveredDate: '2017-09-20',
    remediated: false,
  },
  {
    id: '2',
    cve: 'CVE-2017-15715',
    title: 'Apache HTTP Server',
    severity: 'CRITICAL',
    cvssScore: 92,
    epssScore: 94.02,
    affectedEndpoints: 1,
    publishedDate: '2017-10-29',
    discoveredDate: '2017-10-30',
    remediated: false,
  },
  {
    id: '3',
    cve: 'CVE-2021-3493',
    title: 'OverlayFS Privilege Escalation',
    severity: 'HIGH',
    cvssScore: 89,
    epssScore: 85.5,
    affectedEndpoints: 2,
    publishedDate: '2021-04-28',
    discoveredDate: '2021-05-01',
    remediated: false,
  },
  {
    id: '4',
    cve: 'CVE-2017-7481',
    title: 'Ansible Vulnerability',
    severity: 'HIGH',
    cvssScore: 86.5,
    epssScore: 80.2,
    affectedEndpoints: 1,
    publishedDate: '2017-04-27',
    discoveredDate: '2017-04-28',
    remediated: true,
  },
  {
    id: '5',
    cve: 'CVE-2023-0386',
    title: 'OverlayFS Vulnerability',
    severity: 'HIGH',
    cvssScore: 86,
    epssScore: 82.1,
    affectedEndpoints: 8,
    publishedDate: '2023-01-18',
    discoveredDate: '2023-01-20',
    remediated: false,
  },
  {
    id: '6',
    cve: 'CVE-2018-5391',
    title: 'Denial of Service',
    severity: 'HIGH',
    cvssScore: 82.5,
    epssScore: 78.5,
    affectedEndpoints: 1,
    publishedDate: '2018-08-06',
    discoveredDate: '2018-08-07',
    remediated: true,
  },
  {
    id: '7',
    cve: 'CVE-2025-32463',
    title: 'Remote Code Execution',
    severity: 'CRITICAL',
    cvssScore: 82.5,
    epssScore: 88.3,
    affectedEndpoints: 7,
    publishedDate: '2025-01-10',
    discoveredDate: '2025-01-12',
    remediated: false,
  },
  {
    id: '8',
    cve: 'CVE-2026-20805',
    title: 'Application Vulnerability',
    severity: 'HIGH',
    cvssScore: 78.5,
    epssScore: 75.2,
    affectedEndpoints: 1,
    publishedDate: '2026-01-01',
    discoveredDate: '2026-01-02',
    remediated: false,
  },
  {
    id: '9',
    cve: 'CVE-2017-15705',
    title: 'Apache Server Flaw',
    severity: 'MEDIUM',
    cvssScore: 78.5,
    epssScore: 72.1,
    affectedEndpoints: 1,
    publishedDate: '2017-10-31',
    discoveredDate: '2017-11-01',
    remediated: true,
  },
  {
    id: '10',
    cve: 'CVE-2019-10149',
    title: 'Exim Mail Server',
    severity: 'CRITICAL',
    cvssScore: 77,
    epssScore: 93.93,
    affectedEndpoints: 1,
    publishedDate: '2019-06-05',
    discoveredDate: '2019-06-06',
    remediated: false,
  },
];

// Top 10 by EPSS
const vulnerabilityReportsByEpss: VulnerabilityReport[] = [
  {
    id: '1',
    cve: 'CVE-2020-11651',
    title: 'Salt Master RCE',
    severity: 'CRITICAL',
    cvssScore: 88,
    epssScore: 94.42,
    affectedEndpoints: 1,
    publishedDate: '2020-04-30',
    discoveredDate: '2020-05-01',
    remediated: false,
  },
  {
    id: '2',
    cve: 'CVE-2020-1472',
    title: 'Netlogon Elevation',
    severity: 'CRITICAL',
    cvssScore: 85,
    epssScore: 94.38,
    affectedEndpoints: 2,
    publishedDate: '2020-08-11',
    discoveredDate: '2020-08-12',
    remediated: false,
  },
  {
    id: '3',
    cve: 'CVE-2017-12617',
    title: 'Apache Tomcat RCE',
    severity: 'CRITICAL',
    cvssScore: 92,
    epssScore: 94.36,
    affectedEndpoints: 1,
    publishedDate: '2017-09-19',
    discoveredDate: '2017-09-20',
    remediated: false,
  },
  {
    id: '4',
    cve: 'CVE-2020-11652',
    title: 'Salt API RCE',
    severity: 'CRITICAL',
    cvssScore: 87,
    epssScore: 94.27,
    affectedEndpoints: 1,
    publishedDate: '2020-04-30',
    discoveredDate: '2020-05-01',
    remediated: false,
  },
  {
    id: '5',
    cve: 'CVE-2019-11043',
    title: 'PHP FPM RCE',
    severity: 'CRITICAL',
    cvssScore: 89,
    epssScore: 94.11,
    affectedEndpoints: 1,
    publishedDate: '2019-06-27',
    discoveredDate: '2019-06-28',
    remediated: true,
  },
  {
    id: '6',
    cve: 'CVE-2020-7247',
    title: 'Lychee RCE',
    severity: 'HIGH',
    cvssScore: 80,
    epssScore: 94.08,
    affectedEndpoints: 1,
    publishedDate: '2020-02-09',
    discoveredDate: '2020-02-10',
    remediated: false,
  },
  {
    id: '7',
    cve: 'CVE-2023-4863',
    title: 'WebP Buffer Overflow',
    severity: 'HIGH',
    cvssScore: 88,
    epssScore: 94.08,
    affectedEndpoints: 1,
    publishedDate: '2023-09-14',
    discoveredDate: '2023-09-15',
    remediated: true,
  },
  {
    id: '8',
    cve: 'CVE-2017-15715',
    title: 'Apache HTTP Server',
    severity: 'CRITICAL',
    cvssScore: 92,
    epssScore: 94.02,
    affectedEndpoints: 1,
    publishedDate: '2017-10-29',
    discoveredDate: '2017-10-30',
    remediated: false,
  },
  {
    id: '9',
    cve: 'CVE-2018-19518',
    title: 'Wordpress Vulnerability',
    severity: 'HIGH',
    cvssScore: 78,
    epssScore: 93.96,
    affectedEndpoints: 1,
    publishedDate: '2018-11-29',
    discoveredDate: '2018-11-30',
    remediated: false,
  },
  {
    id: '10',
    cve: 'CVE-2019-10149',
    title: 'Exim Mail Server',
    severity: 'CRITICAL',
    cvssScore: 77,
    epssScore: 93.93,
    affectedEndpoints: 1,
    publishedDate: '2019-06-05',
    discoveredDate: '2019-06-06',
    remediated: false,
  },
];

// Mock report list matching the design (mutable for CRUD operations)
let mockReports: Report[] = [
  {
    id: '1',
    name: 'Endpoint Summary Report',
    type: 'endpoint',
    status: 'completed',
    createdDate: '2026-01-01',
    description: 'This is system generated report on the...',
    createdBy: 'Admin',
    downloadUrl: 'reports/endpoint-summary.pdf',
    format: 'pdf',
    downloadFormats: ['pdf'],
  },
  {
    id: '2',
    name: 'Vulnerability Report',
    type: 'vulnerability',
    status: 'completed',
    createdDate: '2026-01-05',
    description: 'Vulnerability Report',
    createdBy: 'Admin',
    downloadUrl: 'reports/vulnerability.pdf',
    format: 'pdf',
    downloadFormats: ['pdf', 'excel'],
  },
  {
    id: '3',
    name: 'Patch Compliance Report',
    type: 'patch',
    status: 'completed',
    createdDate: '2026-01-10',
    description: 'This report is design to provide inform...',
    createdBy: 'Admin',
    downloadUrl: 'reports/patch-compliance.pdf',
    format: 'pdf',
    downloadFormats: ['pdf'],
  },
  {
    id: '4',
    name: 'Hardware Inventory Report',
    type: 'hardware',
    status: 'completed',
    createdDate: '2026-01-12',
    description: 'The report provides the information on...',
    createdBy: 'Admin',
    downloadUrl: 'reports/hardware-inventory.pdf',
    format: 'pdf',
    downloadFormats: ['pdf', 'excel'],
  },
];

export const reportHandlers = [
  // Get all reports
  http.get(`${API_BASE_URL}/reports`, () => {
    return HttpResponse.json(mockReports);
  }),

  // Get vulnerability report data (must come before :id route)
  http.get(`${API_BASE_URL}/reports/vulnerabilities`, () => {
    const data: VulnerabilityReportData = {
      byCvss: vulnerabilityReportsByCvss,
      byEpss: vulnerabilityReportsByEpss,
    };
    return HttpResponse.json(data);
  }),

  // Get single report
  http.get(`${API_BASE_URL}/reports/:id`, ({ params }) => {
    const report = mockReports.find(r => r.id === params.id);
    if (report) {
      return HttpResponse.json(report);
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Download report
  http.get(`${API_BASE_URL}/reports/:id/download`, ({ params, request }) => {
    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'pdf';
    const report = mockReports.find(r => r.id === params.id);

    if (!report) {
      return new HttpResponse(null, { status: 404 });
    }

    // Return mock file based on format
    const content = `Report: ${report.name}\n\n${report.description}`;
    return new HttpResponse(content, {
      headers: {
        'Content-Type': format === 'csv' ? 'text/csv' : 'application/pdf',
        'Content-Disposition': `attachment; filename="report-${report.id}.${format}"`,
      },
    });
  }),

  // Create report
  http.post(`${API_BASE_URL}/reports`, async ({ request }) => {
    const body = await request.json() as any;
    const newReport: Report = {
      id: Date.now().toString(),
      name: body.name || 'New Report',
      type: body.type || 'vulnerability',
      status: 'completed',
      createdDate: new Date().toISOString().split('T')[0],
      description: body.description || '',
      format: body.format || 'pdf',
      createdBy: body.createdBy || 'Admin',
      downloadFormats: body.downloadFormats || ['pdf'],
    };
    mockReports.unshift(newReport);
    return HttpResponse.json(newReport, { status: 201 });
  }),

  // Update report
  http.put(`${API_BASE_URL}/reports/:id`, async ({ params, request }) => {
    const body = await request.json() as any;
    const index = mockReports.findIndex(r => r.id === params.id);

    if (index === -1) {
      return new HttpResponse(null, { status: 404 });
    }

    mockReports[index] = {
      ...mockReports[index],
      name: body.name ?? mockReports[index].name,
      type: body.type ?? mockReports[index].type,
      description: body.description ?? mockReports[index].description,
      downloadFormats: body.downloadFormats ?? mockReports[index].downloadFormats,
    };

    return HttpResponse.json(mockReports[index]);
  }),

  // Delete report
  http.delete(`${API_BASE_URL}/reports/:id`, ({ params }) => {
    const index = mockReports.findIndex(r => r.id === params.id);

    if (index === -1) {
      return new HttpResponse(null, { status: 404 });
    }

    mockReports.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // Schedule report (legacy endpoint)
  http.post(`${API_BASE_URL}/reports/schedule`, async ({ request }) => {
    const body = await request.json() as any;
    const newReport: Report = {
      id: Date.now().toString(),
      name: body.name || 'New Report',
      type: body.type || 'vulnerability',
      status: 'scheduled',
      createdDate: new Date().toISOString(),
      description: body.description || '',
      format: body.format || 'pdf',
      createdBy: 'Admin',
      downloadFormats: ['pdf'],
    };
    mockReports.unshift(newReport);
    return HttpResponse.json(newReport, { status: 201 });
  }),
];
