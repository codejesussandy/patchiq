// Dashboard Types

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
}

export interface VulnerabilityClassification {
  source: string;
  target: string;
  value: number;
}

export interface EndpointDistribution {
  name: string;
  value: number;
  color?: string;
  [key: string]: unknown;
}

export interface VulnerabilityTrend {
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

export interface CVEEntry {
  cve: string;
  score: number;
  affectedEndpoints: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description?: string;
  publishedDate?: string;
}

export interface TopVulnerabilities {
  byCVSS: CVEEntry[];
  byEPSS: CVEEntry[];
}

export interface ChartData {
  name: string;
  value: number;
  color?: string;
  [key: string]: unknown;
}

export interface SeveritySplitData {
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  '>90days': number;
  '60-90days': number;
  '30-60days': number;
  '<30days': number;
}

export interface AlertData {
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  count: number;
  [key: string]: unknown;
}

export interface PlatformAlertData {
  platform: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface ModuleAlertData {
  module: string;
  critical: number;
  high: number;
  medium: number;
}

export interface DayWiseDetection {
  day: string;
  count: number;
}

export interface DashboardData {
  stats: DashboardStats;
  vulnerabilityClassification: VulnerabilityClassification[];
  endpointDistribution: EndpointDistribution[];
  vulnerabilityByPublishedDate: VulnerabilityTrend[];
  vulnerabilityByDiscoveredDate: VulnerabilityTrend[];
  vulnerabilityBySeverityTable: SeveritySplitData[];
  vulnerabilityByPublishedDateTable: VulnerabilityByDateTable[];
  topVulnerabilities: TopVulnerabilities;
  patchCompliance: {
    compliant: number;
    nonCompliant: number;
    pending: number;
  };
  recentActivity: {
    patchesDeployed: number;
    patchesFailed: number;
    endpointsScanned: number;
    lastScanTime: string;
  };
  expiredCertificates: ChartData[];
  maliciousProcessesByPlatform: ChartData[];
  totalSoftwareByPlatform: ChartData[];
  riskScoreByEndpoints: ChartData[];
  alertCountBySeverity: AlertData[];
  alertSeverityCountByPlatform: PlatformAlertData[];
  dayWiseVulnerabilityDetection: DayWiseDetection[];
  alertSeverityCountByModule: ModuleAlertData[];
}
