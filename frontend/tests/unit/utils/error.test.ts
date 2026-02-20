import { describe, it, expect } from 'vitest';
import { getErrorMessage, isFormValidationError } from '@/utils/error';

describe('error', () => {
  describe('getErrorMessage', () => {
    it('should extract message from Axios error response.data.message', () => {
      const error = {
        response: {
          data: {
            message: 'Server validation failed',
            error: 'Bad Request',
          },
        },
        message: 'Request failed with status code 400',
      };
      expect(getErrorMessage(error)).toBe('Server validation failed');
    });

    it('should fall back to response.data.error when message is absent', () => {
      const error = {
        response: {
          data: {
            error: 'Unauthorized access',
          },
        },
        message: 'Request failed with status code 401',
      };
      expect(getErrorMessage(error)).toBe('Unauthorized access');
    });

    it('should fall back to error.message when response.data has neither', () => {
      const error = {
        response: {
          data: {},
        },
        message: 'Network Error',
      };
      expect(getErrorMessage(error)).toBe('Network Error');
    });

    it('should fall back to error.message when response is missing', () => {
      const error = {
        message: 'Network Error',
      };
      expect(getErrorMessage(error)).toBe('Network Error');
    });

    it('should fall back to error.message when response.data is missing', () => {
      const error = {
        response: {},
        message: 'Something went wrong',
      };
      expect(getErrorMessage(error)).toBe('Something went wrong');
    });

    it('should return a plain string error directly', () => {
      expect(getErrorMessage('Something broke')).toBe('Something broke');
    });

    it('should return fallback for null error', () => {
      expect(getErrorMessage(null)).toBe('An error occurred');
    });

    it('should return fallback for undefined error', () => {
      expect(getErrorMessage(undefined)).toBe('An error occurred');
    });

    it('should return fallback for a number error', () => {
      expect(getErrorMessage(42)).toBe('An error occurred');
    });

    it('should return fallback for a boolean error', () => {
      expect(getErrorMessage(true)).toBe('An error occurred');
    });

    it('should return custom fallback when provided', () => {
      expect(getErrorMessage(null, 'Custom fallback')).toBe('Custom fallback');
    });

    it('should return fallback for empty object without message', () => {
      expect(getErrorMessage({})).toBe('An error occurred');
    });

    it('should return custom fallback for empty object', () => {
      expect(getErrorMessage({}, 'Nothing found')).toBe('Nothing found');
    });

    it('should handle object with empty response.data.message', () => {
      const error = {
        response: {
          data: {
            message: '',
          },
        },
        message: 'Fallback message',
      };
      // empty string is falsy, so it falls through to error
      expect(getErrorMessage(error)).toBe('Fallback message');
    });

    it('should handle Error instance', () => {
      const error = new Error('Native error');
      expect(getErrorMessage(error)).toBe('Native error');
    });
  });

  describe('isFormValidationError', () => {
    it('should return true for an object with errorFields', () => {
      const error = {
        errorFields: [
          { name: ['email'], errors: ['Email is required'] },
        ],
      };
      expect(isFormValidationError(error)).toBe(true);
    });

    it('should return true for an object with empty errorFields array', () => {
      const error = { errorFields: [] };
      expect(isFormValidationError(error)).toBe(true);
    });

    it('should return false for an object without errorFields', () => {
      const error = { message: 'Some error' };
      expect(isFormValidationError(error)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isFormValidationError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isFormValidationError(undefined)).toBe(false);
    });

    it('should return false for a string', () => {
      expect(isFormValidationError('error')).toBe(false);
    });

    it('should return false for a number', () => {
      expect(isFormValidationError(42)).toBe(false);
    });

    it('should return false for an empty object', () => {
      expect(isFormValidationError({})).toBe(false);
    });
  });
});
