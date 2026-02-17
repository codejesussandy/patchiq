import type { MessageInstance } from 'antd/es/message/interface';

/**
 * Calculate optimal toast duration based on message length
 * Ensures users have enough time to read the message
 */
export const calculateToastDuration = (message: string, baseSeconds = 3): number => {
  if (!message) return baseSeconds;

  // Average reading speed: 250 words per minute = ~4 words per second
  // Average word length: 5 characters
  const wordsPerSecond = 4;
  const avgWordLength = 5;

  const wordCount = Math.ceil(message.length / avgWordLength);
  const readingTime = Math.ceil(wordCount / wordsPerSecond);

  // Minimum 2 seconds, maximum 10 seconds
  const duration = Math.max(2, Math.min(10, readingTime + 1));

  return duration;
};

/**
 * Show success message with smart duration
 */
export const showSuccess = (messageApi: MessageInstance, content: string, customDuration?: number) => {
  const duration = customDuration ?? calculateToastDuration(content, 3);
  messageApi.success(content, duration);
};

/**
 * Show error message with smart duration
 * Errors get slightly longer duration as they're more important
 */
export const showError = (messageApi: MessageInstance, content: string, customDuration?: number) => {
  const duration = customDuration ?? calculateToastDuration(content, 4);
  messageApi.error(content, duration);
};

/**
 * Show warning message with smart duration
 */
export const showWarning = (messageApi: MessageInstance, content: string, customDuration?: number) => {
  const duration = customDuration ?? calculateToastDuration(content, 3);
  messageApi.warning(content, duration);
};

/**
 * Show info message with smart duration
 */
export const showInfo = (messageApi: MessageInstance, content: string, customDuration?: number) => {
  const duration = customDuration ?? calculateToastDuration(content, 3);
  messageApi.info(content, duration);
};

/**
 * Show loading message (stays until dismissed)
 * Returns a function to dismiss the loading message
 */
export const showLoading = (messageApi: MessageInstance, content: string) => {
  return messageApi.loading(content, 0);
};
