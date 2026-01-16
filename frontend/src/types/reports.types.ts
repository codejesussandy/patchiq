export interface VulnerabilityReport {
  id: string;
  cve: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  cvssScore: number;
  epssScore: number;
  affectedEndpoints: number;
  publishedDate: string;
  discoveredDate: string;
  remediated: boolean;
}

export interface VulnerabilityReportData {
  byCvss: VulnerabilityReport[];
  byEpss: VulnerabilityReport[];
}

export interface Report {
  id: string;
  name: string;
  type: 'vulnerability' | 'patch' | 'compliance' | 'asset' | 'endpoint' | 'hardware';
  status: 'completed' | 'scheduled' | 'failed';
  createdDate: string;
  createdOn?: string;
  completedDate?: string;
  description: string;
  createdBy: string;
  downloadUrl?: string;
  format: 'pdf' | 'csv' | 'json';
  downloadFormats: ('pdf' | 'excel')[];
}
