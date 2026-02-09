export interface PatchRecommendation {
  id: string;
  assetId: string;
  vulnerabilityId: string;
  patchId: string;
  status: 'recommended' | 'accepted' | 'rejected' | 'deployed' | 'verified' | 'failed';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  cvssScore: number | null;
  epssScore: number | null;
  riskScore: number | null;
  reason: string | null;
  affectedSoftware: string | null;
  deploymentTaskId: string | null;

  // Timestamps
  recommendedAt: string;
  acceptedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  deployedAt: string | null;
  verifiedAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;

  // Relations (included in API responses)
  asset: {
    id: string;
    name: string;
    os: string;
    hostname: string | null;
  };
  vulnerability: {
    id: string;
    cveId: string;
    title: string;
    severity: string;
    cvss3BaseScore: number | null;
  };
  patch: {
    id: string;
    patchId: string;
    title: string;
    severity: string;
  };
}

export interface PatchRecommendationDashboardStats {
  totalRecommendations: number;
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  byStatus: {
    recommended: number;
    accepted: number;
    rejected: number;
    deployed: number;
    verified: number;
    failed: number;
  };
  averageRiskScore: number;
  topRisks: PatchRecommendation[];
}

export interface ListRecommendationsParams {
  status?: string;
  severity?: string | string[];
  sortBy?: 'riskScore' | 'severity' | 'recommendedAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ListRecommendationsResponse {
  data: PatchRecommendation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
