export const getSeverityColor = (severity: string): string => {
  switch (severity?.toUpperCase()) {
    case 'CRITICAL': return '#ff4d4f';
    case 'HIGH': return '#fa8c16';
    case 'MEDIUM': return '#faad14';
    case 'LOW': return '#52c41a';
    default: return '#d9d9d9';
  }
};

export const getStatusBadgeStatus = (
  status: string
): 'success' | 'processing' | 'error' | 'default' | 'warning' => {
  switch (status) {
    case 'VERIFIED': return 'success';
    case 'DEPLOYED':
    case 'ACCEPTED': return 'processing';
    case 'FAILED':
    case 'REJECTED': return 'error';
    case 'RECOMMENDED': return 'warning';
    default: return 'default';
  }
};

export const formatRiskScore = (score: number | null): string => {
  if (!score) return '-';
  return score.toFixed(0);
};
