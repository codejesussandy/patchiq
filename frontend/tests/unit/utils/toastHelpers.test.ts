import { describe, it, expect, vi } from 'vitest';
import type { MessageInstance } from 'antd/es/message/interface';
import {
  calculateToastDuration,
  showSuccess,
  showError,
  showWarning,
  showInfo,
  showLoading,
} from '@/utils/toastHelpers';

const createMockMessageApi = (): MessageInstance => ({
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
  loading: vi.fn().mockReturnValue(() => {}),
  open: vi.fn(),
  destroy: vi.fn(),
});

describe('toastHelpers', () => {
  describe('calculateToastDuration', () => {
    it('should return base seconds for empty/falsy message', () => {
      expect(calculateToastDuration('')).toBe(3);
      expect(calculateToastDuration('', 5)).toBe(5);
    });

    it('should return minimum 2 seconds for a short message', () => {
      // "Hi" = 2 chars, wordCount = ceil(2/5) = 1, readingTime = ceil(1/4) = 1, duration = max(2, min(10, 1+1)) = 2
      expect(calculateToastDuration('Hi')).toBe(2);
    });

    it('should return calculated duration for a medium message', () => {
      // 50 chars: wordCount = ceil(50/5) = 10, readingTime = ceil(10/4) = 3, duration = max(2, min(10, 3+1)) = 4
      const message = 'A'.repeat(50);
      expect(calculateToastDuration(message)).toBe(4);
    });

    it('should cap at 10 seconds for very long messages', () => {
      // Very long message should hit the max of 10
      const message = 'A'.repeat(500);
      expect(calculateToastDuration(message)).toBeLessThanOrEqual(10);
    });

    it('should not go below 2 seconds', () => {
      expect(calculateToastDuration('a')).toBeGreaterThanOrEqual(2);
    });

    it('should use custom baseSeconds for empty message', () => {
      expect(calculateToastDuration('', 7)).toBe(7);
    });

    it('should calculate correctly for a message of 20 characters', () => {
      // 20 chars: wordCount = ceil(20/5) = 4, readingTime = ceil(4/4) = 1, duration = max(2, min(10, 1+1)) = 2
      expect(calculateToastDuration('12345678901234567890')).toBe(2);
    });

    it('should calculate correctly for a message of 100 characters', () => {
      // 100 chars: wordCount = ceil(100/5) = 20, readingTime = ceil(20/4) = 5, duration = max(2, min(10, 5+1)) = 6
      const message = 'A'.repeat(100);
      expect(calculateToastDuration(message)).toBe(6);
    });
  });

  describe('showSuccess', () => {
    it('should call messageApi.success with content and calculated duration', () => {
      const api = createMockMessageApi();
      showSuccess(api, 'Operation successful');
      expect(api.success).toHaveBeenCalledTimes(1);
      expect(api.success).toHaveBeenCalledWith(
        'Operation successful',
        expect.any(Number)
      );
    });

    it('should use custom duration when provided', () => {
      const api = createMockMessageApi();
      showSuccess(api, 'Done', 5);
      expect(api.success).toHaveBeenCalledWith('Done', 5);
    });
  });

  describe('showError', () => {
    it('should call messageApi.error with content and calculated duration', () => {
      const api = createMockMessageApi();
      showError(api, 'Something went wrong');
      expect(api.error).toHaveBeenCalledTimes(1);
      expect(api.error).toHaveBeenCalledWith(
        'Something went wrong',
        expect.any(Number)
      );
    });

    it('should use custom duration when provided', () => {
      const api = createMockMessageApi();
      showError(api, 'Error', 8);
      expect(api.error).toHaveBeenCalledWith('Error', 8);
    });

    it('should use base of 4 seconds for error duration calculation', () => {
      const api = createMockMessageApi();
      // Empty content should use base of 4 for errors
      showError(api, '');
      expect(api.error).toHaveBeenCalledWith('', 4);
    });
  });

  describe('showWarning', () => {
    it('should call messageApi.warning with content and calculated duration', () => {
      const api = createMockMessageApi();
      showWarning(api, 'Be careful');
      expect(api.warning).toHaveBeenCalledTimes(1);
      expect(api.warning).toHaveBeenCalledWith(
        'Be careful',
        expect.any(Number)
      );
    });

    it('should use custom duration when provided', () => {
      const api = createMockMessageApi();
      showWarning(api, 'Warning', 6);
      expect(api.warning).toHaveBeenCalledWith('Warning', 6);
    });
  });

  describe('showInfo', () => {
    it('should call messageApi.info with content and calculated duration', () => {
      const api = createMockMessageApi();
      showInfo(api, 'FYI: update available');
      expect(api.info).toHaveBeenCalledTimes(1);
      expect(api.info).toHaveBeenCalledWith(
        'FYI: update available',
        expect.any(Number)
      );
    });

    it('should use custom duration when provided', () => {
      const api = createMockMessageApi();
      showInfo(api, 'Info', 4);
      expect(api.info).toHaveBeenCalledWith('Info', 4);
    });
  });

  describe('showLoading', () => {
    it('should call messageApi.loading with content and duration 0', () => {
      const api = createMockMessageApi();
      showLoading(api, 'Loading...');
      expect(api.loading).toHaveBeenCalledTimes(1);
      expect(api.loading).toHaveBeenCalledWith('Loading...', 0);
    });

    it('should return the dismiss function from messageApi.loading', () => {
      const dismissFn = vi.fn();
      const api = createMockMessageApi();
      (api.loading as ReturnType<typeof vi.fn>).mockReturnValue(dismissFn);

      const result = showLoading(api, 'Processing...');
      expect(result).toBe(dismissFn);
    });
  });
});
