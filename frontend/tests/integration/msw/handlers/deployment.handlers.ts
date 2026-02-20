import { http, HttpResponse } from 'msw';

export const deploymentHandlers = [
  // GET /v1/deployments/patch/:id
  http.get('*/v1/deployments/patch/:id', () => {
    return HttpResponse.json({
      success: true,
      data: {
        id: 'dep-001',
        name: 'Test Deployment',
        status: 'PENDING',
        targetAgentIds: [],
        patches: [],
        createdAt: new Date().toISOString(),
      },
    });
  }),

  // POST /v1/deployments/patch/:id/cancel
  http.post('*/v1/deployments/patch/:id/cancel', () => {
    return HttpResponse.json({ success: true, data: { message: 'Deployment cancelled' } });
  }),

  // POST /v1/deployments/patch/:id/retry
  http.post('*/v1/deployments/patch/:id/retry', () => {
    return HttpResponse.json({ success: true, data: { message: 'Deployment retried' } }, { status: 201 });
  }),
];
