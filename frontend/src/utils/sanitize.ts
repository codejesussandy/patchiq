import DOMPurify from 'dompurify';

/**
 * Sanitize HTML input to prevent XSS attacks
 * Removes all HTML tags and dangerous attributes
 */
export const sanitizeHTML = (input: string): string => {
  if (!input || typeof input !== 'string') return '';

  // Configure DOMPurify to be very strict
  const config = {
    ALLOWED_TAGS: [], // No tags allowed
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true, // Keep text content
  };

  return DOMPurify.sanitize(input, config);
};

/**
 * Sanitize input for safe storage
 * Removes HTML, scripts, event handlers
 */
export const sanitizeInput = (input: string, allowHTML = false): string => {
  if (!input || typeof input !== 'string') return '';

  if (!allowHTML) {
    return sanitizeHTML(input);
  }

  // For fields that allow HTML (like descriptions), use relaxed config
  const config = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'title', 'target'],
    KEEP_CONTENT: true,
  };

  return DOMPurify.sanitize(input, config);
};

/**
 * Strip all HTML tags from input
 */
export const stripHTML = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  return input.replace(/<[^>]*>/g, '');
};

/**
 * Encode special characters for safe display
 */
export const encodeHTML = (input: string): string => {
  if (!input || typeof input !== 'string') return '';

  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return input.replace(/[&<>"']/g, (char) => map[char]);
};
