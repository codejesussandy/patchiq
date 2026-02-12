// Dashboard Types

// Re-export shared API types that match
export type {
  ExploitabilityBreakdown,
  DashboardStats,
  VulnerabilityByDateTable,
  TopVulnerabilities,
  PatchCompliance,
  RecentActivity,
  AlertSeverityByPlatform,
  DayWiseVulnerability,
  AlertSeverityByModule,
  SankeyLink as VulnerabilityClassification,
  DistributionItem as EndpointDistribution,
  VulnerabilityByDate as VulnerabilityTrend,
} from '@shared/types';

// UI-specific types (differ from shared or used only in frontend charts)

export interface CVEEntry {
  cve: string;
  score: number;
  affectedEndpoints: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description?: string;
  publishedDate?: string;
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

// UI-specific dashboard data shape (differs from shared DashboardData)
export interface DashboardData {
  stats: import('@shared/types').DashboardStats;
  vulnerabilityClassification: import('@shared/types').SankeyLink[];
  endpointDistribution: import('@shared/types').DistributionItem[];
  vulnerabilityByPublishedDate: import('@shared/types').VulnerabilityByDate[];
  vulnerabilityByDiscoveredDate: import('@shared/types').VulnerabilityByDate[];
  vulnerabilityBySeverityTable: SeveritySplitData[];
  vulnerabilityByPublishedDateTable: import('@shared/types').VulnerabilityByDateTable[];
  topVulnerabilities: import('@shared/types').TopVulnerabilities;
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
