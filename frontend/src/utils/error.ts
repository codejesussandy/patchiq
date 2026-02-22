/**
 * Extract error message from an unknown error (typically an Axios error).
 * Usage: catch (error: unknown) { message.error(getErrorMessage(error, 'Fallback message')); }
 */
export function getErrorMessage(error: unknown, fallback: string = 'An error occurred'): string {
  if (error && typeof error === 'object') {
    // Axios error shape: { response: { data: { message?, error? } } }
    const axiosErr = error as { response?: { data?: { message?: string; error?: string } }; message?: string };
    return axiosErr.response?.data?.message
      || axiosErr.response?.data?.error
      || axiosErr.message
      || fallback;
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
