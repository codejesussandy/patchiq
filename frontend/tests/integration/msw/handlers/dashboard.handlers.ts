import { http, HttpResponse } from 'msw';

const mockDashboardData = {
  stats: {
    totalEndpoints: 150,
    linuxEndpoints: 60,
    windowsEndpoints: 80,
    macEndpoints: 10,
    totalVulnerabilities: 245,
    unmitigatedVulnerabilities: 89,
    criticalVulnerabilities: 12,
    highVulnerabilities: 45,
    mediumVulnerabilities: 98,
    lowVulnerabilities: 90,
    exploitableVulnerabilities: { critical: 5, high: 20, medium: 30, low: 10 },
    nonExploitableVulnerabilities: { critical: 7, high: 25, medium: 68, low: 80 },
  },
  vulnerabilityClassification: [],
  endpointDistribution: [
    { name: 'Windows', value: 80 },
    { name: 'Linux', value: 60 },
    { name: 'macOS', value: 10 },
  ],
  vulnerabilityByPublishedDate: [],
  vulnerabilityByDiscoveredDate: [],
  vulnerabilityBySeverityTable: [],
  vulnerabilityByPublishedDateTable: [
    { dateRange: '2024-01', critical: 3, high: 10, medium: 20, low: 15 },
  ],
  topVulnerabilities: {
    byCVSS: [
      { cve: 'CVE-2024-0001', score: 9.8, affectedEndpoints: 45, severity: 'critical' },
      { cve: 'CVE-2024-0002', score: 8.5, affectedEndpoints: 30, severity: 'high' },
    ],
    byAffectedEndpoints: [],
  },
  patchCompliance: { compliant: 100, nonCompliant: 30, pending: 20 },
  recentActivity: { patchesDeployed: 50, patchesFailed: 5, endpointsScanned: 150, lastScanTime: '2024-01-15T10:00:00Z' },
  expiredCertificates: [{ name: 'Expired', value: 5 }, { name: 'Valid', value: 95 }],
  maliciousProcessesByPlatform: [{ name: 'Windows', value: 12 }, { name: 'Linux', value: 3 }],
  totalSoftwareByPlatform: [{ name: 'Windows', value: 500 }, { name: 'Linux', value: 300 }],
  riskScoreByEndpoints: [{ name: 'Server-1', value: 7.5 }, { name: 'Server-2', value: 4.2 }],
  alertCountBySeverity: [
    { severity: 'Critical', count: 5 },
    { severity: 'High', count: 15 },
    { severity: 'Medium', count: 30 },
    { severity: 'Low', count: 20 },
  ],
  alertSeverityCountByPlatform: [{ platform: 'Windows', critical: 3, high: 8, medium: 15, low: 10 }],
  dayWiseVulnerabilityDetection: [{ day: 'Mon', count: 10 }, { day: 'Tue', count: 15 }],
  alertSeverityCountByModule: [{ module: 'Network', critical: 2, high: 5, medium: 10 }],
};

export const dashboardHandlers = [
  http.get('*/dashboard', () => {
    return HttpResponse.json({ success: true, data: mockDashboardData });
  }),

  http.get('*/dashboard/stats', () => {
    return HttpResponse.json({ success: true, data: mockDashboardData.stats });
  }),

  http.get('*/dashboard/top-vulnerabilities', () => {
    return HttpResponse.json({ success: true, data: mockDashboardData.topVulnerabilities });
  }),

  http.post('*/dashboard/refresh', () => {
    return HttpResponse.json({ success: true, data: mockDashboardData });
  }),
];

export { mockDashboardData };
