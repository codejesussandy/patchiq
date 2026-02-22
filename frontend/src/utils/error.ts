/**
 * Extract error message from an unknown error (typically an Axios error).
 * Usage: catch (error: unknown) { message.error(getErrorMessage(error, 'Fallback message')); }
 */
export function getErrorMessage(error: unknown, fallback: string = 'An error occurred'): string {
  if (error && typeof error === 'object') {
    // Backend shape: { response: { data: { success: false, error: { code, message } } } }
    const axiosErr = error as { response?: { data?: { message?: string; error?: unknown } }; message?: string };
    const errField = axiosErr.response?.data?.error;
    if (errField && typeof errField === 'object') {
      const nestedMsg = (errField as { message?: string }).message;
      if (nestedMsg) return nestedMsg;
    }
    return axiosErr.response?.data?.message
      || (typeof errField === 'string' ? errField : undefined)
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
