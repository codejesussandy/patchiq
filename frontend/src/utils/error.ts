/**
 * Extract error message from an unknown error (typically an Axios error).
 * Usage: catch (error: unknown) { message.error(getErrorMessage(error, 'Fallback message')); }
 */
export function getErrorMessage(error: unknown, fallback: string = 'An error occurred'): string {
  if (error && typeof error === 'object') {
    // Axios error shape: { response: { data: { error: { code, message } } } }
    // This matches the backend's error handler format
    const axiosErr = error as {
      response?: {
        data?: {
          error?: { message?: string; code?: string } | string;
          message?: string;
        };
      };
      message?: string;
    };
    const data = axiosErr.response?.data;
    // Backend format: { error: { code, message } }
    if (data?.error && typeof data.error === 'object' && data.error.message) {
      return data.error.message;
    }
    // Alternative format: { error: "string" }
    if (data?.error && typeof data.error === 'string') {
      return data.error;
    }
    // Alternative format: { message: "string" }
    if (data?.message && typeof data.message === 'string') {
      return data.message;
    }
    // Axios network error message
    if (axiosErr.message) return axiosErr.message;
    return fallback;
  }
  if (typeof error === 'string') return error;
  return fallback;
}

/**
 * Check if an error has form validation errorFields (Ant Design form validation).
 */
export function isFormValidationError(error: unknown): boolean {
  return !!(error && typeof error === 'object' && 'errorFields' in error);
}
