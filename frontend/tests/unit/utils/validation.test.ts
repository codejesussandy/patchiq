import { describe, it, expect } from 'vitest';
import {
  detectXSSPayload,
  detectSQLInjection,
  validateHostname,
  validateEmail,
  validateIPAddress,
  validateMACAddress,
  validateAssetName,
  validateURL,
  validateAndSanitize,
} from '@/utils/validation';

describe('validation', () => {
  describe('detectXSSPayload', () => {
    it('should detect <script> tags', () => {
      expect(detectXSSPayload('<script>alert("xss")</script>')).toBe(true);
    });

    it('should detect <script> tags case-insensitively', () => {
      expect(detectXSSPayload('<SCRIPT>alert(1)</SCRIPT>')).toBe(true);
    });

    it('should detect event handler attributes (onclick)', () => {
      expect(detectXSSPayload('<div onclick="alert(1)">')).toBe(true);
    });

    it('should detect event handler attributes (onerror)', () => {
      expect(detectXSSPayload('<img onerror="alert(1)">')).toBe(true);
    });

    it('should detect onmouseover event handler', () => {
      expect(detectXSSPayload('onmouseover="doSomething()"')).toBe(true);
    });

    it('should detect <iframe> tags', () => {
      expect(detectXSSPayload('<iframe src="evil.com"></iframe>')).toBe(true);
    });

    it('should detect <object> tags', () => {
      expect(detectXSSPayload('<object data="evil.swf">')).toBe(true);
    });

    it('should detect <embed> tags', () => {
      expect(detectXSSPayload('<embed src="evil.swf">')).toBe(true);
    });

    it('should detect <img> with event handlers', () => {
      expect(detectXSSPayload('<img src=x onerror=alert(1)>')).toBe(true);
    });

    it('should detect <svg> with event handlers', () => {
      expect(detectXSSPayload('<svg onload=alert(1)>')).toBe(true);
    });

    it('should detect javascript: protocol', () => {
      expect(detectXSSPayload('javascript:alert(1)')).toBe(true);
    });

    it('should detect javascript: protocol case-insensitively', () => {
      expect(detectXSSPayload('JAVASCRIPT:alert(1)')).toBe(true);
    });

    it('should detect data:text/html payloads', () => {
      expect(detectXSSPayload('data:text/html,<script>alert(1)</script>')).toBe(true);
    });

    it('should return false for clean strings', () => {
      expect(detectXSSPayload('Hello World')).toBe(false);
    });

    it('should return false for normal HTML-like content', () => {
      expect(detectXSSPayload('a > b and c < d')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(detectXSSPayload('')).toBe(false);
    });

    it('should return false for null', () => {
      expect(detectXSSPayload(null as unknown as string)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(detectXSSPayload(undefined as unknown as string)).toBe(false);
    });

    it('should return false for non-string', () => {
      expect(detectXSSPayload(42 as unknown as string)).toBe(false);
    });
  });

  describe('detectSQLInjection', () => {
    it('should detect DROP TABLE', () => {
      expect(detectSQLInjection('; DROP TABLE users')).toBe(true);
    });

    it('should detect DELETE statement', () => {
      expect(detectSQLInjection('; DELETE FROM users')).toBe(true);
    });

    it('should detect INSERT statement', () => {
      expect(detectSQLInjection('; INSERT INTO users VALUES(1)')).toBe(true);
    });

    it('should detect UPDATE statement', () => {
      expect(detectSQLInjection("; UPDATE users SET name='hacked'"  )).toBe(true);
    });

    it('should detect SELECT statement', () => {
      expect(detectSQLInjection('; SELECT * FROM users')).toBe(true);
    });

    it('should detect EXEC statement', () => {
      expect(detectSQLInjection('; EXEC sp_executesql')).toBe(true);
    });

    it('should detect OR-based injection with single quotes', () => {
      expect(detectSQLInjection("' OR '1'='1")).toBe(true);
    });

    it('should detect OR-based injection with double quotes', () => {
      expect(detectSQLInjection('" OR "1"="1')).toBe(true);
    });

    it('should detect SQL comments (--)', () => {
      expect(detectSQLInjection('admin --')).toBe(true);
    });

    it('should detect block comments (/* */)', () => {
      expect(detectSQLInjection('value /* comment */')).toBe(true);
    });

    it('should detect encoded OR injection (%27)', () => {
      expect(detectSQLInjection('%27 OR 1=1')).toBe(true);
    });

    it('should detect encoded UNION injection (%27)', () => {
      expect(detectSQLInjection('%27 UNION SELECT')).toBe(true);
    });

    it('should detect xp_ procedures', () => {
      expect(detectSQLInjection('xp_cmdshell')).toBe(true);
    });

    it('should detect sp_ procedures', () => {
      expect(detectSQLInjection('sp_executesql')).toBe(true);
    });

    it('should return false for clean strings', () => {
      expect(detectSQLInjection('Hello World')).toBe(false);
    });

    it('should return false for normal text with semicolons', () => {
      expect(detectSQLInjection('Hello; how are you?')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(detectSQLInjection('')).toBe(false);
    });

    it('should return false for null', () => {
      expect(detectSQLInjection(null as unknown as string)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(detectSQLInjection(undefined as unknown as string)).toBe(false);
    });
  });

  describe('validateHostname', () => {
    it('should return null for a valid simple hostname', () => {
      expect(validateHostname('myserver')).toBeNull();
    });

    it('should return null for a valid FQDN', () => {
      expect(validateHostname('server.example.com')).toBeNull();
    });

    it('should return null for hostname with hyphens', () => {
      expect(validateHostname('my-server-01')).toBeNull();
    });

    it('should return null for single character hostname', () => {
      expect(validateHostname('a')).toBeNull();
    });

    it('should return null for empty string (no validation needed)', () => {
      expect(validateHostname('')).toBeNull();
    });

    it('should return error for hostname starting with hyphen', () => {
      expect(validateHostname('-invalid')).not.toBeNull();
    });

    it('should return error for hostname ending with hyphen', () => {
      expect(validateHostname('invalid-')).not.toBeNull();
    });

    it('should return error for hostname with spaces', () => {
      expect(validateHostname('my server')).not.toBeNull();
    });

    it('should return error for hostname with special characters', () => {
      expect(validateHostname('my@server!')).not.toBeNull();
    });

    it('should return error for hostname exceeding 255 characters', () => {
      // Build a valid-format hostname that exceeds 255 chars
      // Each segment is max 63 chars, separated by dots
      const segment = 'a'.repeat(63);
      const longHostname = [segment, segment, segment, segment, 'a'].join('.');
      // Total: 63*4 + 4 dots + 1 = 257
      expect(longHostname.length).toBe(257);
      expect(validateHostname(longHostname)).toContain('255');
    });

    it('should return null for hostname of exactly 255 characters', () => {
      // Must match the regex: alphanumeric only (no dots, segments <= 63 chars each)
      const hostname = 'a'.repeat(63) + '.' + 'b'.repeat(63) + '.' + 'c'.repeat(63) + '.' + 'd'.repeat(63);
      // Total = 63*4 + 3 dots = 255
      expect(hostname.length).toBe(255);
      expect(validateHostname(hostname)).toBeNull();
    });
  });

  describe('validateEmail', () => {
    it('should return null for a valid email', () => {
      expect(validateEmail('user@example.com')).toBeNull();
    });

    it('should return null for email with subdomain', () => {
      expect(validateEmail('user@mail.example.com')).toBeNull();
    });

    it('should return null for email with plus sign', () => {
      expect(validateEmail('user+tag@example.com')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(validateEmail('')).toBeNull();
    });

    it('should return error for email without @', () => {
      expect(validateEmail('userexample.com')).not.toBeNull();
    });

    it('should return error for email without domain', () => {
      expect(validateEmail('user@')).not.toBeNull();
    });

    it('should return error for email without TLD', () => {
      expect(validateEmail('user@example')).not.toBeNull();
    });

    it('should return error for email with spaces', () => {
      expect(validateEmail('user @example.com')).not.toBeNull();
    });

    it('should return error for email exceeding 255 characters', () => {
      const longEmail = 'a'.repeat(250) + '@b.com';
      expect(validateEmail(longEmail)).toContain('255');
    });
  });

  describe('validateIPAddress', () => {
    it('should return null for valid IPv4 address', () => {
      expect(validateIPAddress('192.168.1.1')).toBeNull();
    });

    it('should return null for IPv4 0.0.0.0', () => {
      expect(validateIPAddress('0.0.0.0')).toBeNull();
    });

    it('should return null for IPv4 255.255.255.255', () => {
      expect(validateIPAddress('255.255.255.255')).toBeNull();
    });

    it('should return null for valid IPv6 address', () => {
      expect(validateIPAddress('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(validateIPAddress('')).toBeNull();
    });

    it('should return error for invalid IPv4 (octet > 255)', () => {
      expect(validateIPAddress('256.1.1.1')).not.toBeNull();
    });

    it('should return error for incomplete IPv4', () => {
      expect(validateIPAddress('192.168.1')).not.toBeNull();
    });

    it('should return error for random string', () => {
      expect(validateIPAddress('not-an-ip')).not.toBeNull();
    });

    it('should return error for IPv4 with extra octet', () => {
      expect(validateIPAddress('192.168.1.1.1')).not.toBeNull();
    });
  });

  describe('validateMACAddress', () => {
    it('should return null for valid MAC with colons', () => {
      expect(validateMACAddress('00:1A:2B:3C:4D:5E')).toBeNull();
    });

    it('should return null for valid MAC with hyphens', () => {
      expect(validateMACAddress('00-1A-2B-3C-4D-5E')).toBeNull();
    });

    it('should return null for valid MAC lowercase', () => {
      expect(validateMACAddress('aa:bb:cc:dd:ee:ff')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(validateMACAddress('')).toBeNull();
    });

    it('should return error for MAC with wrong format', () => {
      expect(validateMACAddress('001A2B3C4D5E')).not.toBeNull();
    });

    it('should return error for MAC with too few groups', () => {
      expect(validateMACAddress('00:1A:2B:3C:4D')).not.toBeNull();
    });

    it('should return error for MAC with invalid characters', () => {
      expect(validateMACAddress('00:1A:2B:3C:4D:GG')).not.toBeNull();
    });

    it('should return error for random string', () => {
      expect(validateMACAddress('not-a-mac')).not.toBeNull();
    });
  });

  describe('validateAssetName', () => {
    it('should return null for a valid asset name', () => {
      expect(validateAssetName('My Server 01')).toBeNull();
    });

    it('should return error for empty string', () => {
      expect(validateAssetName('')).toContain('required');
    });

    it('should return error for name exceeding 255 characters', () => {
      expect(validateAssetName('a'.repeat(256))).toContain('255');
    });

    it('should return error for name with XSS payload', () => {
      expect(validateAssetName('<script>alert(1)</script>')).not.toBeNull();
    });

    it('should return error for name with SQL injection', () => {
      expect(validateAssetName("; DROP TABLE users")).not.toBeNull();
    });

    it('should return null for a name with special but safe characters', () => {
      expect(validateAssetName('Server (Production) #1')).toBeNull();
    });

    it('should return null for exactly 255 character name', () => {
      expect(validateAssetName('a'.repeat(255))).toBeNull();
    });
  });

  describe('validateURL', () => {
    it('should return null for valid HTTPS URL', () => {
      expect(validateURL('https://example.com')).toBeNull();
    });

    it('should return null for valid HTTP URL', () => {
      expect(validateURL('http://example.com')).toBeNull();
    });

    it('should return null for URL with path', () => {
      expect(validateURL('https://example.com/path/to/resource')).toBeNull();
    });

    it('should return null for URL with query parameters', () => {
      expect(validateURL('https://example.com?foo=bar&baz=qux')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(validateURL('')).toBeNull();
    });

    it('should return error for string without protocol', () => {
      expect(validateURL('example.com')).not.toBeNull();
    });

    it('should return error for random text', () => {
      expect(validateURL('not a url at all')).not.toBeNull();
    });

    it('should return error for partial URL', () => {
      expect(validateURL('http://')).not.toBeNull();
    });
  });

  describe('validateAndSanitize', () => {
    it('should validate and sanitize a clean text field', () => {
      const result = validateAndSanitize('Hello World', 'text');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
      expect(result.sanitized).toBe('Hello World');
    });

    it('should trim whitespace on valid input', () => {
      const result = validateAndSanitize('  hello  ', 'text');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('hello');
    });

    it('should detect XSS in any field type', () => {
      const result = validateAndSanitize('<script>alert(1)</script>', 'text');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('invalid');
    });

    it('should detect SQL injection in any field type', () => {
      const result = validateAndSanitize('; DROP TABLE users', 'text');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('invalid');
    });

    it('should enforce text field max length of 255', () => {
      const result = validateAndSanitize('a'.repeat(256), 'text');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('255');
    });

    it('should validate email field type', () => {
      const valid = validateAndSanitize('user@example.com', 'email');
      expect(valid.isValid).toBe(true);

      const invalid = validateAndSanitize('not-an-email', 'email');
      expect(invalid.isValid).toBe(false);
    });

    it('should validate hostname field type', () => {
      const valid = validateAndSanitize('myserver.example.com', 'hostname');
      expect(valid.isValid).toBe(true);

      const invalid = validateAndSanitize('my server!', 'hostname');
      expect(invalid.isValid).toBe(false);
    });

    it('should validate ip field type', () => {
      const valid = validateAndSanitize('192.168.1.1', 'ip');
      expect(valid.isValid).toBe(true);

      const invalid = validateAndSanitize('999.999.999.999', 'ip');
      expect(invalid.isValid).toBe(false);
    });

    it('should validate mac field type', () => {
      const valid = validateAndSanitize('00:1A:2B:3C:4D:5E', 'mac');
      expect(valid.isValid).toBe(true);

      const invalid = validateAndSanitize('not-a-mac', 'mac');
      expect(invalid.isValid).toBe(false);
    });

    it('should validate url field type', () => {
      const valid = validateAndSanitize('https://example.com', 'url');
      expect(valid.isValid).toBe(true);

      const invalid = validateAndSanitize('not-a-url', 'url');
      expect(invalid.isValid).toBe(false);
    });

    it('should validate name field type', () => {
      const valid = validateAndSanitize('My Server', 'name');
      expect(valid.isValid).toBe(true);

      const invalid = validateAndSanitize('', 'name');
      expect(invalid.isValid).toBe(false);
    });

    it('should prioritize XSS error over field-specific errors', () => {
      const result = validateAndSanitize('<script>alert(1)</script>', 'email');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('invalid characters or scripts');
    });

    it('should not sanitize (trim) the value when there is an error', () => {
      const result = validateAndSanitize('<script>bad</script>', 'text');
      expect(result.isValid).toBe(false);
      // sanitized should be the original value since there's an error
      expect(result.sanitized).toBe('<script>bad</script>');
    });
  });
});
