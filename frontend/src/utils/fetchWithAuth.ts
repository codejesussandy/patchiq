/**
 * Fetch helper with automatic auth header injection.
 * Use for streaming responses or special cases where axios is not suitable.
 *
 * @param url - Relative URL path (e.g., '/v1/patch-templates/sync')
 * @param options - Standard fetch options (method, headers, body)
 * @returns Native fetch Response object
 *
 * @example
 * ```typescript
 * const response = await fetchWithAuth('/v1/endpoint', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify(data),
 * });
 * ```
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = localStorage.getItem('accessToken');

  if (!token) {
    throw new Error('No authentication token found. Please log in.');
  }

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    },
  });
}
