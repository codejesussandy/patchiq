import { http, HttpResponse } from 'msw';

const mockDashboardStats = {
  total: 50,
  bySeverity: { critical: 5, high: 15, medium: 20, low: 10 },
  byStatus: { recommended: 25, accepted: 10, rejected: 5, deployed: 8, verified: 2 },
};

const mockRecommendations = [
  { id: 'rec-1', severity: 'CRITICAL', status: 'RECOMMENDED', riskScore: 9.5, affectedSoftware: 'Windows 11', vulnerability: { id: 'vuln-1', cveId: 'CVE-2024-0001' }, asset: { id: 'asset-1', name: 'Server-01', os: 'Windows' }, patch: { id: 'patch-1', patchId: 'KB5034441', software: 'Windows 11 Cumulative Update' }, createdAt: '2024-01-15T00:00:00Z' },
  { id: 'rec-2', severity: 'HIGH', status: 'ACCEPTED', riskScore: 7.2, affectedSoftware: 'Ubuntu 22.04', vulnerability: { id: 'vuln-2', cveId: 'CVE-2024-0002' }, asset: { id: 'asset-2', name: 'Workstation-01', os: 'Linux' }, patch: { id: 'patch-2', patchId: 'KB5034442', software: 'Ubuntu 22.04 Security Patch' }, createdAt: '2024-02-01T00:00:00Z' },
  { id: 'rec-3', severity: 'MEDIUM', status: 'RECOMMENDED', riskScore: 5.0, affectedSoftware: 'Chrome', vulnerability: { id: 'vuln-3', cveId: 'CVE-2024-0003' }, asset: { id: 'asset-1', name: 'Server-01', os: 'Windows' }, patch: { id: 'patch-1', patchId: 'KB5034441', software: 'Windows 11 Cumulative Update' }, createdAt: '2024-03-01T00:00:00Z' },
];

export const patchRecommendationHandlers = [
  http.get('*/patch-recommendations', () => {
    return HttpResponse.json({ success: true, data: { data: mockRecommendations, total: mockRecommendations.length, page: 1, limit: 1000, totalPages: 1 } });
  }),

  http.get('*/patch-recommendations/dashboard', () => {
    return HttpResponse.json({ success: true, data: mockDashboardStats });
  }),

  http.get('*/patch-recommendations/:id', ({ params }) => {
    const rec = mockRecommendations.find(r => r.id === params.id);
    return HttpResponse.json({ success: true, data: rec });
  }),

  http.post('*/patch-recommendations/:id/accept', () => {
    return HttpResponse.json({ success: true, data: { ...mockRecommendations[0], status: 'ACCEPTED' } });
  }),

  http.post('*/patch-recommendations/:id/reject', () => {
    return HttpResponse.json({ success: true, data: { ...mockRecommendations[0], status: 'REJECTED' } });
  }),

  http.post('*/patch-recommendations/:id/deploy', () => {
    return HttpResponse.json({ success: true, data: { recommendation: { ...mockRecommendations[0], status: 'DEPLOYED' }, deployment: { deploymentId: 'DEP-REC-1' } } });
  }),

  http.post('*/patch-recommendations/bulk-accept', () => {
    return HttpResponse.json({ success: true, data: { accepted: 2, skipped: 0 } });
  }),

  http.post('*/patch-recommendations/bulk-reject', () => {
    return HttpResponse.json({ success: true, data: { rejected: 2, skipped: 0 } });
  }),

  http.post('*/patch-recommendations/bulk-deploy', () => {
    return HttpResponse.json({ success: true, data: { deployed: 2, skipped: 0, deployments: ['dep-1', 'dep-2'] } });
  }),
];

export { mockDashboardStats, mockRecommendations };
