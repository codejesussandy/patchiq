import { http, HttpResponse } from 'msw';

const mockUser = {
  id: '1',
  email: 'admin@patchiq.io',
  firstName: 'Admin',
  lastName: 'User',
  role: 'ADMIN',
  name: 'Admin User',
  organization: 'PatchIQ',
  organizationId: 'org-1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

export const authHandlers = [
  http.post('*/auth/login', async ({ request }) => {
    const body = await request.json() as { email: string; password: string };
    if (body.email === 'admin@patchiq.io' && body.password === 'admin123') {
      return HttpResponse.json({
        success: true,
        data: {
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          user: mockUser,
        },
      });
    }
    return HttpResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } },
      { status: 401 }
    );
  }),

  http.post('*/auth/logout', () => {
    return HttpResponse.json({ success: true, data: null });
  }),

  http.get('*/user/me', ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (authHeader === 'Bearer mock-access-token') {
      return HttpResponse.json({ success: true, data: mockUser });
    }
    return HttpResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } },
      { status: 401 }
    );
  }),
];
