import { http, HttpResponse } from 'msw';
import type { DashboardData, DashboardStats } from '../../types/dashboard.types';

const mockStats: DashboardStats = {
  totalEndpoints: 11,
  dataLossEndpoints: 9,
  windowsEndpoints: 2,
  linuxEndpoints: 7,
  macEndpoints: 2,
  totalAgents: 0,
  totalVulnerabilities: 3165,
  unmitigatedVulnerabilities: 9063,
  criticalVulnerabilities: 127,
  highVulnerabilities: 1181,
  mediumVulnerabilities: 1542,
  lowVulnerabilities: 315,
};

const mockDashboardData: DashboardData = {
  stats: mockStats,
  vulnerabilityClassification: [
    { source: 'Critical', target: 'Remote Code Execution', value: 45 },
    { source: 'Critical', target: 'Privilege Escalation', value: 32 },
    { source: 'Critical', target: 'Authentication Bypass', value: 28 },
    { source: 'Critical', target: 'SQL Injection', value: 22 },
    { source: 'High', target: 'Remote Code Execution', value: 234 },
    { source: 'High', target: 'Cross-Site Scripting', value: 189 },
    { source: 'High', target: 'Privilege Escalation', value: 156 },
    { source: 'High', target: 'Information Disclosure', value: 312 },
    { source: 'High', target: 'Denial of Service', value: 290 },
    { source: 'Medium', target: 'Cross-Site Scripting', value: 423 },
    { source: 'Medium', target: 'Information Disclosure', value: 389 },
    { source: 'Medium', target: 'Denial of Service', value: 356 },
    { source: 'Medium', target: 'Path Traversal', value: 374 },
    { source: 'Low', target: 'Information Disclosure', value: 156 },
    { source: 'Low', target: 'Configuration Issues', value: 89 },
    { source: 'Low', target: 'Other', value: 70 },
  ],
  endpointDistribution: [
    { name: 'Windows 10', value: 1, color: '#5B8FF9' },
    { name: 'Windows 7', value: 1, color: '#5AD8A6' },
    { name: 'Ubuntu 20.04', value: 3, color: '#F6BD16' },
    { name: 'Ubuntu 18.04', value: 2, color: '#E8684A' },
    { name: 'CentOS 7', value: 2, color: '#6DC8EC' },
    { name: 'macOS Ventura', value: 1, color: '#9270CA' },
    { name: 'macOS Monterey', value: 1, color: '#FF9D4D' },
  ],
  vulnerabilityByPublishedDate: [
    { date: '< 30 days', critical: 12, high: 89, medium: 156, low: 45 },
    { date: '30-60 days', critical: 23, high: 134, medium: 234, low: 67 },
    { date: '60-90 days', critical: 18, high: 112, medium: 189, low: 52 },
    { date: '90-180 days', critical: 34, high: 245, medium: 378, low: 89 },
    { date: '> 180 days', critical: 40, high: 601, medium: 585, low: 62 },
  ],
  vulnerabilityByDiscoveredDate: [
    { date: '< 30 days', critical: 8, high: 67, medium: 123, low: 34 },
    { date: '30-60 days', critical: 15, high: 98, medium: 187, low: 45 },
    { date: '60-90 days', critical: 22, high: 145, medium: 234, low: 56 },
    { date: '90-180 days', critical: 38, high: 312, medium: 456, low: 78 },
    { date: '> 180 days', critical: 44, high: 559, medium: 542, low: 102 },
  ],
  vulnerabilityBySeverityTable: [
    { severity: 'Critical', '>90days': 45, '60-90days': 28, '30-60days': 18, '<30days': 9 },
    { severity: 'High', '>90days': 312, '60-90days': 198, '30-60days': 112, '<30days': 67 },
    { severity: 'Medium', '>90days': 589, '60-90days': 378, '30-60days': 234, '<30days': 156 },
    { severity: 'Low', '>90days': 156, '60-90days': 89, '30-60days': 52, '<30days': 18 },
  ],
  vulnerabilityByPublishedDateTable: [
    { dateRange: '> 90 days', critical: 316, high: 1161, medium: 1545, low: 137 },
    { dateRange: '60-90 days', critical: 8, high: 27, medium: 10, low: 4 },
    { dateRange: '30-60 days', critical: 4, high: 20, medium: 18, low: 1 },
    { dateRange: '< 30 days', critical: 3, high: 70, medium: 32, low: 3 },
  ],
  topVulnerabilities: {
    byCVSS: [
      { cve: 'CVE-2017-12617', score: 9.2, affectedEndpoints: 1, severity: 'critical', description: 'Apache Tomcat RCE' },
      { cve: 'CVE-2017-15715', score: 9.2, affectedEndpoints: 1, severity: 'critical', description: 'Apache HTTP Server RCE' },
      { cve: 'CVE-2021-3493', score: 8.9, affectedEndpoints: 2, severity: 'high', description: 'Linux Kernel Privilege Escalation' },
      { cve: 'CVE-2017-7481', score: 8.65, affectedEndpoints: 1, severity: 'high', description: 'Ansible Privilege Escalation' },
      { cve: 'CVE-2023-0386', score: 8.6, affectedEndpoints: 8, severity: 'high', description: 'Linux Kernel OverlayFS' },
      { cve: 'CVE-2021-44228', score: 10.0, affectedEndpoints: 3, severity: 'critical', description: 'Log4j Remote Code Execution' },
      { cve: 'CVE-2022-22965', score: 9.8, affectedEndpoints: 2, severity: 'critical', description: 'Spring4Shell RCE' },
      { cve: 'CVE-2021-26855', score: 9.8, affectedEndpoints: 1, severity: 'critical', description: 'Microsoft Exchange ProxyLogon' },
      { cve: 'CVE-2020-1472', score: 10.0, affectedEndpoints: 2, severity: 'critical', description: 'Zerologon' },
      { cve: 'CVE-2019-19781', score: 9.8, affectedEndpoints: 1, severity: 'critical', description: 'Citrix ADC RCE' },
    ],
    byEPSS: [
      { cve: 'CVE-2020-11651', score: 94.42, affectedEndpoints: 1, severity: 'critical', description: 'SaltStack Auth Bypass' },
      { cve: 'CVE-2020-1472', score: 94.38, affectedEndpoints: 2, severity: 'critical', description: 'Zerologon' },
      { cve: 'CVE-2017-12617', score: 94.36, affectedEndpoints: 1, severity: 'critical', description: 'Apache Tomcat RCE' },
      { cve: 'CVE-2020-11652', score: 94.27, affectedEndpoints: 1, severity: 'critical', description: 'SaltStack Directory Traversal' },
      { cve: 'CVE-2019-11043', score: 94.11, affectedEndpoints: 1, severity: 'critical', description: 'PHP-FPM RCE' },
      { cve: 'CVE-2021-44228', score: 93.89, affectedEndpoints: 3, severity: 'critical', description: 'Log4j RCE' },
      { cve: 'CVE-2017-5638', score: 93.45, affectedEndpoints: 1, severity: 'critical', description: 'Apache Struts RCE' },
      { cve: 'CVE-2019-0708', score: 92.78, affectedEndpoints: 2, severity: 'critical', description: 'BlueKeep RCE' },
      { cve: 'CVE-2018-7600', score: 91.23, affectedEndpoints: 1, severity: 'critical', description: 'Drupalgeddon2' },
      { cve: 'CVE-2017-0144', score: 90.56, affectedEndpoints: 2, severity: 'critical', description: 'EternalBlue' },
    ],
  },
  patchCompliance: {
    compliant: 4,
    nonCompliant: 5,
    pending: 2,
  },
  recentActivity: {
    patchesDeployed: 23,
    patchesFailed: 3,
    endpointsScanned: 11,
    lastScanTime: new Date().toISOString(),
  },
  expiredCertificates: [
    { name: 'Windows 10', value: 3 },
    { name: 'Ubuntu 20.04', value: 2 },
    { name: 'CentOS 7', value: 1 },
    { name: 'macOS Ventura', value: 1 },
  ],
  maliciousProcessesByPlatform: [
    { name: 'Windows 10 Pro', value: 12 },
    { name: 'Ubuntu 20.04', value: 8 },
    { name: 'CentOS 7', value: 5 },
    { name: 'macOS Monterey', value: 2 },
  ],
  totalSoftwareByPlatform: [
    { name: 'Windows', value: 156 },
    { name: 'Linux', value: 234 },
    { name: 'macOS', value: 78 },
  ],
  riskScoreByEndpoints: [
    { name: 'Endpoint-01', value: 8.5 },
    { name: 'Endpoint-02', value: 7.2 },
    { name: 'Endpoint-03', value: 9.1 },
    { name: 'Endpoint-04', value: 6.8 },
    { name: 'Endpoint-05', value: 8.9 },
  ],
  alertCountBySeverity: [
    { severity: 'Critical', count: 12 },
    { severity: 'High', count: 45 },
    { severity: 'Medium', count: 78 },
    { severity: 'Low', count: 156 },
  ],
  alertSeverityCountByPlatform: [
    { platform: 'Windows 10 Pro', critical: 3, high: 12, medium: 25, low: 48 },
    { platform: 'Ubuntu 20.04', critical: 5, high: 18, medium: 32, low: 62 },
    { platform: 'CentOS 7', critical: 2, high: 8, medium: 15, low: 28 },
    { platform: 'macOS Monterey', critical: 2, high: 7, medium: 6, low: 18 },
  ],
  dayWiseVulnerabilityDetection: [
    { day: 'Mon', count: 45 },
    { day: 'Tue', count: 38 },
    { day: 'Wed', count: 52 },
    { day: 'Thu', count: 41 },
    { day: 'Fri', count: 67 },
    { day: 'Sat', count: 23 },
    { day: 'Sun', count: 15 },
  ],
  alertSeverityCountByModule: [
    { module: 'MongoDB - 20', critical: 2, high: 8, medium: 15 },
    { module: 'Windows 10', critical: 3, high: 12, medium: 25 },
    { module: 'Ubuntu - 18', critical: 1, high: 6, medium: 12 },
    { module: 'Windows 11', critical: 2, high: 10, medium: 18 },
  ],
};

const API_BASE_URL = '/v1';

export const dashboardHandlers = [
  http.get(`${API_BASE_URL}/dashboard`, () => {
    return HttpResponse.json(mockDashboardData);
  }),

  http.get(`${API_BASE_URL}/dashboard/stats`, () => {
    return HttpResponse.json(mockStats);
  }),

  http.get(`${API_BASE_URL}/dashboard/top-vulnerabilities`, () => {
    return HttpResponse.json(mockDashboardData.topVulnerabilities);
  }),

  http.post(`${API_BASE_URL}/dashboard/refresh`, () => {
    return HttpResponse.json(mockDashboardData);
  }),
];
