/**
 * Comprehensive input validation functions
 */

/**
 * Detect XSS payload patterns
 */
export const detectXSSPayload = (value: string): boolean => {
  if (!value || typeof value !== 'string') return false;

  const xssPatterns = [
    /<script[^>]*>[\s\S]*?<\/script>/gi,
    /on\w+\s*=\s*["']?[^"']*["']?/gi,
    /<iframe[^>]*>/gi,
    /<object[^>]*>/gi,
    /<embed[^>]*>/gi,
    /<img[^>]*on\w+/gi,
    /<svg[^>]*on\w+/gi,
    /javascript:/gi,
    /data:text\/html/gi,
  ];

  return xssPatterns.some((pattern) => pattern.test(value));
};

/**
 * Detect SQL injection patterns
 */
export const detectSQLInjection = (value: string): boolean => {
  if (!value || typeof value !== 'string') return false;

  const sqlPatterns = [
    /;\s*(DROP|DELETE|INSERT|UPDATE|EXEC|SELECT|ALTER|CREATE|MODIFY)/i,
    /('\s*OR\s*'|"\s*OR\s*"|'=|"=)/,
    /--\s*$/,
    /%27\s*(OR|UNION)/i,
    /\/\*.*\*\//,
    /xp_/i,
    /sp_/i,
  ];

  return sqlPatterns.some((pattern) => pattern.test(value));
};

/**
 * Validate hostname format
 * Allows: alphanumeric, dash, dot
 * Pattern: subdomain.domain.extension (flexible)
 */
export const validateHostname = (value: string): string | null => {
  if (!value) return null;

  const hostnameRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;

  if (!hostnameRegex.test(value)) {
    return 'Hostname can only contain letters, numbers, hyphens, and dots';
  }

  if (value.length > 255) {
    return 'Hostname must be 255 characters or less';
  }

  return null;
};

/**
 * Validate email format
 */
export const validateEmail = (value: string): string | null => {
  if (!value) return null;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(value)) {
    return 'Please enter a valid email address (e.g., user@example.com)';
  }

  if (value.length > 255) {
    return 'Email address must be 255 characters or less';
  }

  return null;
};

/**
 * Validate IP address format
 */
export const validateIPAddress = (value: string): string | null => {
  if (!value) return null;

  const ipv4Regex = /^((25[0-5]|(2[0-4]|1\d)?[0-9]|[1-9]?)\.){3}(25[0-5]|(2[0-4]|1\d)?[0-9]|[1-9]?)$/;
  const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4})$/;

  if (!ipv4Regex.test(value) && !ipv6Regex.test(value)) {
    return 'Please enter a valid IPv4 or IPv6 address';
  }

  return null;
};

/**
 * Validate MAC address format
 */
export const validateMACAddress = (value: string): string | null => {
  if (!value) return null;

  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;

  if (!macRegex.test(value)) {
    return 'Please enter a valid MAC address (e.g., 00:1A:2B:3C:4D:5E)';
  }

  return null;
};

/**
 * Validate asset name
 */
export const validateAssetName = (value: string): string | null => {
  if (!value) return 'Asset name is required';

  if (value.length < 1) {
    return 'Asset name is required';
  }

  if (value.length > 255) {
    return 'Asset name must be 255 characters or less';
  }

  if (detectXSSPayload(value)) {
    return 'Asset name contains invalid characters or patterns';
  }

  if (detectSQLInjection(value)) {
    return 'Asset name contains invalid characters';
  }

  return null;
};

/**
 * Validate URL format
 */
export const validateURL = (value: string): string | null => {
  if (!value) return null;

  try {
    new URL(value);
    return null;
  } catch {
    return 'Please enter a valid URL (e.g., https://example.com)';
  }
};

/**
 * Sanitize and validate input
 * Returns: { isValid: boolean, error: string | null, sanitized: string }
 */
export const validateAndSanitize = (
  value: string,
  fieldType: 'text' | 'email' | 'hostname' | 'ip' | 'mac' | 'url' | 'name'
): { isValid: boolean; error: string | null; sanitized: string } => {
  let error: string | null = null;
  let sanitized = value;

  // Check for XSS
  if (detectXSSPayload(value)) {
    error = 'Input contains invalid characters or scripts';
  }

  // Check for SQL injection
  if (detectSQLInjection(value)) {
    error = error || 'Input contains invalid characters';
  }

  // Field-specific validation
  switch (fieldType) {
    case 'email':
      error = error || validateEmail(value);
      break;
    case 'hostname':
      error = error || validateHostname(value);
      break;
    case 'ip':
      error = error || validateIPAddress(value);
      break;
    case 'mac':
      error = error || validateMACAddress(value);
      break;
    case 'url':
      error = error || validateURL(value);
      break;
    case 'name':
      error = error || validateAssetName(value);
      break;
    case 'text':
    default:
      if (value.length > 255) {
        error = error || 'Field must be 255 characters or less';
      }
      break;
  }

  // Sanitize if valid
  if (!error) {
    sanitized = value.trim();
  }

  return {
    isValid: error === null,
    error,
    sanitized,
  };
};
