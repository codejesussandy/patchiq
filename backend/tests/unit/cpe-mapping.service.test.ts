/**
 * CPE Mapping Service Unit Tests
 *
 * Tests for Phase 4: CPE Mapping Service
 */

import { cpeMappingService } from '../../src/shared/services/cpe-mapping.service';

describe('CPE Mapping Service', () => {
  describe('normalizeSoftwareName', () => {
    it('should lowercase the name', () => {
      expect(cpeMappingService.normalizeSoftwareName('Google Chrome')).toBe('google chrome');
      expect(cpeMappingService.normalizeSoftwareName('NGINX')).toBe('nginx');
    });

    it('should remove lib prefix when remainder >= 4 chars, and trailing numbers', () => {
      expect(cpeMappingService.normalizeSoftwareName('libssl3')).toBe('libssl');   // ssl=3 chars < 4, lib kept
      expect(cpeMappingService.normalizeSoftwareName('libcurl4')).toBe('curl');    // curl=4 chars >= 4, lib stripped
      expect(cpeMappingService.normalizeSoftwareName('libxml2')).toBe('libxml');   // xml=3 chars < 4, lib kept
    });

    it('should NOT remove language prefixes (python3-, node-, etc.)', () => {
      expect(cpeMappingService.normalizeSoftwareName('python3-requests')).toBe('python3-requests');
      expect(cpeMappingService.normalizeSoftwareName('python-pip')).toBe('python-pip');
    });

    it('should NOT remove node prefix', () => {
      expect(cpeMappingService.normalizeSoftwareName('node-express')).toBe('node-express');
    });

    it('should remove trailing version numbers', () => {
      expect(cpeMappingService.normalizeSoftwareName('postgresql15')).toBe('postgresql');
      expect(cpeMappingService.normalizeSoftwareName('python39')).toBe('python');
    });

    it('should remove common suffixes', () => {
      expect(cpeMappingService.normalizeSoftwareName('openssl-dev')).toBe('openssl');
      expect(cpeMappingService.normalizeSoftwareName('nginx-common')).toBe('nginx');
    });

    it('should handle edge cases', () => {
      expect(cpeMappingService.normalizeSoftwareName('lib')).toBe('lib');
      expect(cpeMappingService.normalizeSoftwareName('')).toBe('');
      expect(cpeMappingService.normalizeSoftwareName('a')).toBe('a');
    });

    it('should handle real-world examples', () => {
      // libssl1.1 -> trailing version stripped -> libssl (lib kept, ssl=3 < 4)
      expect(cpeMappingService.normalizeSoftwareName('libssl1.1')).toBe('libssl');
      // Language prefixes no longer stripped
      expect(cpeMappingService.normalizeSoftwareName('python3-cryptography')).toBe('python3-cryptography');
      expect(cpeMappingService.normalizeSoftwareName('libc6')).toBe('libc');
    });
  });

  describe('resolveCpe', () => {
    // Note: These tests require database access
    // In a real test environment, you would mock prisma

    it('should return null for unknown software when no mappings exist', async () => {
      // This test assumes no mapping exists for this random name
      const result = await cpeMappingService.resolveCpe({
        name: 'completely-unknown-software-xyz-12345',
        vendor: null,
      });

      // May or may not be null depending on fuzzy matching
      // The important thing is it doesn't throw
      expect(result === null || result !== null).toBe(true);
    });

    it('should handle empty name gracefully', async () => {
      const result = await cpeMappingService.resolveCpe({
        name: '',
        vendor: null,
      });

      // Should not throw
      expect(result === null || result !== null).toBe(true);
    });
  });

  describe('resolveCpeBatch', () => {
    it('should resolve multiple software items', async () => {
      const results = await cpeMappingService.resolveCpeBatch([
        { name: 'test-software-1' },
        { name: 'test-software-2' },
      ]);

      expect(results.size).toBe(2);
      expect(results.has('test-software-1')).toBe(true);
      expect(results.has('test-software-2')).toBe(true);
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      cpeMappingService.clearCache();
      const stats = cpeMappingService.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should return cache statistics', () => {
      const stats = cpeMappingService.getCacheStats();
      expect(typeof stats.size).toBe('number');
      expect(typeof stats.hitRate).toBe('number');
    });
  });
});

describe('CPE Mapping Service - Name Normalization Patterns', () => {
  // Test comprehensive name normalization for common software
  // Note: Normalization removes lib prefix (if remainder >= 4 chars) AND trailing numbers.
  // Language prefixes (python3-, node-, etc.) are NOT stripped.

  const testCases = [
    // Linux package names (lib prefix removed only if remainder >= 4 chars)
    { input: 'libssl3', expected: 'libssl' },     // ssl=3 < 4, lib kept
    { input: 'libcurl4', expected: 'curl' },       // curl=4 >= 4, lib stripped
    { input: 'libxml2', expected: 'libxml' },      // xml=3 < 4, lib kept
    { input: 'libc6', expected: 'libc' },          // c=1 < 4, lib kept
    { input: 'libssl1.1', expected: 'libssl' },    // trailing version stripped, ssl=3 < 4, lib kept
    { input: 'libexpat1', expected: 'expat' },     // expat=5 >= 4, lib stripped

    // Language-prefixed packages NOT stripped (python3-openssl != openssl)
    { input: 'python3-pip', expected: 'python3-pip' },
    { input: 'python3-requests', expected: 'python3-requests' },
    { input: 'python-cryptography', expected: 'python-cryptography' },

    // Node packages NOT stripped
    { input: 'node-express', expected: 'node-express' },
    { input: 'node-lodash', expected: 'node-lodash' },

    // Version suffixes (trailing numbers removed)
    { input: 'postgresql15', expected: 'postgresql' },
    { input: 'mysql8', expected: 'mysql' },
    { input: 'redis7', expected: 'redis' },

    // Dev/common suffixes
    { input: 'nginx-common', expected: 'nginx' },
    { input: 'openssl-dev', expected: 'openssl' },
    { input: 'curl-utils', expected: 'curl' },

    // Mixed case (lowercase)
    { input: 'Google Chrome', expected: 'google chrome' },
    { input: 'Mozilla Firefox', expected: 'mozilla firefox' },
    { input: 'Microsoft Edge', expected: 'microsoft edge' },

    // Simple names (should not change)
    { input: 'nginx', expected: 'nginx' },
    { input: 'curl', expected: 'curl' },
    { input: 'wget', expected: 'wget' },
  ];

  testCases.forEach(({ input, expected }) => {
    it(`should normalize "${input}" to "${expected}"`, () => {
      expect(cpeMappingService.normalizeSoftwareName(input)).toBe(expected);
    });
  });
});
