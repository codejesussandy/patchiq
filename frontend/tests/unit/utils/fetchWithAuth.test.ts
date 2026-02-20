import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchWithAuth } from '@/utils/fetchWithAuth';

// Mock the STORAGE_KEYS import
vi.mock('@/constants/storage.constants', () => ({
  STORAGE_KEYS: {
    AUTH: {
      ACCESS_TOKEN: 'accessToken',
      REFRESH_TOKEN: 'refreshToken',
    },
    TABLE: {
      COLUMN_CONFIG: (tableName: string) => `column-config-${tableName}`,
    },
  },
}));

describe('fetchWithAuth', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    global.fetch = mockFetch;
    mockFetch.mockReset();
  });

  it('should throw an error when no auth token is in localStorage', async () => {
    await expect(fetchWithAuth('/v1/test')).rejects.toThrow(
      'No authentication token found. Please log in.'
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should call fetch with Authorization header when token exists', async () => {
    localStorage.setItem('accessToken', 'my-jwt-token');
    const mockResponse = new Response('ok', { status: 200 });
    mockFetch.mockResolvedValue(mockResponse);

    const response = await fetchWithAuth('/v1/test');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('/v1/test', {
      headers: {
        Authorization: 'Bearer my-jwt-token',
      },
    });
    expect(response).toBe(mockResponse);
  });

  it('should merge custom headers with the Authorization header', async () => {
    localStorage.setItem('accessToken', 'my-jwt-token');
    const mockResponse = new Response('ok', { status: 200 });
    mockFetch.mockResolvedValue(mockResponse);

    await fetchWithAuth('/v1/test', {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    expect(mockFetch).toHaveBeenCalledWith('/v1/test', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer my-jwt-token',
      },
    });
  });

  it('should pass through method and body options', async () => {
    localStorage.setItem('accessToken', 'my-jwt-token');
    const mockResponse = new Response('created', { status: 201 });
    mockFetch.mockResolvedValue(mockResponse);

    const body = JSON.stringify({ name: 'test' });
    await fetchWithAuth('/v1/resource', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    expect(mockFetch).toHaveBeenCalledWith('/v1/resource', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer my-jwt-token',
      },
      body,
    });
  });

  it('should use default empty options when none provided', async () => {
    localStorage.setItem('accessToken', 'token123');
    const mockResponse = new Response('ok', { status: 200 });
    mockFetch.mockResolvedValue(mockResponse);

    await fetchWithAuth('/v1/endpoint');

    expect(mockFetch).toHaveBeenCalledWith('/v1/endpoint', {
      headers: {
        Authorization: 'Bearer token123',
      },
    });
  });

  it('should propagate fetch errors', async () => {
    localStorage.setItem('accessToken', 'my-jwt-token');
    mockFetch.mockRejectedValue(new Error('Network failure'));

    await expect(fetchWithAuth('/v1/test')).rejects.toThrow('Network failure');
  });

  it('should return the Response object from fetch', async () => {
    localStorage.setItem('accessToken', 'my-jwt-token');
    const mockResponse = new Response(JSON.stringify({ data: 'value' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    mockFetch.mockResolvedValue(mockResponse);

    const result = await fetchWithAuth('/v1/data');
    expect(result).toBeInstanceOf(Response);
    expect(result.status).toBe(200);
  });

  it('should override Authorization if user passes one in headers (last-write wins)', async () => {
    localStorage.setItem('accessToken', 'my-jwt-token');
    const mockResponse = new Response('ok', { status: 200 });
    mockFetch.mockResolvedValue(mockResponse);

    await fetchWithAuth('/v1/test', {
      headers: {
        Authorization: 'Bearer user-custom-token',
      },
    });

    // The token from localStorage should override because it's spread after options.headers
    expect(mockFetch).toHaveBeenCalledWith('/v1/test', {
      headers: {
        Authorization: 'Bearer my-jwt-token',
      },
    });
  });
});
