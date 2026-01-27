/**
 * Dashboard Module Types
 */

export interface DashboardStats {
  totalEndpoints: number;
  dataLossEndpoints: number;
  windowsEndpoints: number;
  linuxEndpoints: number;
  macEndpoints: number;
  totalAgents: number;
  totalVulnerabilities: number;
  unmitigatedVulnerabilities: number;
  criticalVulnerabilities: number;
  highVulnerabilities: number;
  mediumVulnerabilities: number;
  lowVulnerabilities: number;
  // Exploitability breakdown
  exploitableVulnerabilities: ExploitabilityBreakdown;
  nonExploitableVulnerabilities: ExploitabilityBreakdown;
}

export interface ExploitabilityBreakdown {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

export interface SankeyLink {
  source: 'Critical' | 'High' | 'Medium' | 'Low';
  target: string;
  value: number;
}

export interface DistributionItem {
  name: string;
  value: number;
  color?: string;
}

export interface VulnerabilityByDate {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface VulnerabilityByDateTable {
  dateRange: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface TopVulnerability {
  cve: string;
  score: number;
  affectedEndpoints: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
}

export interface TopVulnerabilities {
  byCVSS: TopVulnerability[];
  byEPSS: TopVulnerability[];
}

export interface PatchCompliance {
  compliant: number;
  nonCompliant: number;
  pending: number;
}

export interface RecentActivity {
  patchesDeployed: number;
  patchesFailed: number;
  endpointsScanned: number;
  lastScanTime: string;
}

export interface AlertSeverityByPlatform {
  platform: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface DayWiseVulnerability {
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  count: number;
}

export interface AlertSeverityByModule {
  module: string;
  critical: number;
  high: number;
  medium: number;
}

export interface DashboardData {
  stats: DashboardStats;
  vulnerabilityClassification: SankeyLink[];
  endpointDistribution: DistributionItem[];
  vulnerabilityByPublishedDate: VulnerabilityByDate[];
  vulnerabilityByDiscoveredDate: VulnerabilityByDate[];
  vulnerabilityByPublishedDateTable: VulnerabilityByDateTable[];
  topVulnerabilities: TopVulnerabilities;
  patchCompliance: PatchCompliance;
  recentActivity: RecentActivity;
  expiredCertificates: DistributionItem[];
  maliciousProcessesByPlatform: DistributionItem[];
  totalSoftwareByPlatform: DistributionItem[];
  riskScoreByEndpoints: DistributionItem[];
  alertCountBySeverity: { severity: string; count: number }[];
  alertSeverityCountByPlatform: AlertSeverityByPlatform[];
  dayWiseVulnerabilityDetection: DayWiseVulnerability[];
  alertSeverityCountByModule: AlertSeverityByModule[];
}

export interface ChartData {
  labels: string[];
  data: number[];
  colors: string[];
}

export interface ChartQueryParams {
  groupBy?: 'severity' | 'os' | 'status';
  dateRange?: 'week' | 'month' | 'quarter' | 'year';
}
