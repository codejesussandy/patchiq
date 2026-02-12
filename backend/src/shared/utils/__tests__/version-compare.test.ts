import { compareVersions, isVersionVulnerable, normalizeVersion } from '../version-compare';

describe('Version Compare Utility', () => {
  describe('normalizeVersion', () => {
    // T2.11: Normalization with Ubuntu suffix
    it('should remove Ubuntu suffix from version (T2.11)', () => {
      expect(normalizeVersion('3.0.13-1ubuntu3.1')).toBe('3.0.13');
    });

    // T2.12: Normalization with v-prefix
    it('should remove v-prefix from version (T2.12)', () => {
      expect(normalizeVersion('v16.20.0')).toBe('16.20.0');
    });

    // T2.13: Normalization with already clean version
    it('should return clean version as-is (T2.13)', () => {
      expect(normalizeVersion('8.8.9')).toBe('8.8.9');
    });
  });

  describe('compareVersions', () => {
    // T2.1: Basic comparison
    it('should return -1 when first version is less than second (T2.1)', () => {
      expect(compareVersions('1.2.3', '1.2.4')).toBe(-1);
    });

    // T2.2: Major version difference
    it('should return 1 when first version is greater (T2.2)', () => {
      expect(compareVersions('25.00', '24.09')).toBe(1);
    });

    // T2.3: Equal versions
    it('should return 0 when versions are equal (T2.3)', () => {
      expect(compareVersions('8.8.9', '8.8.9')).toBe(0);
    });

    // T2.4: Unequal segments (missing patch version)
    it('should handle missing version segments (T2.4)', () => {
      expect(compareVersions('3.0', '3.0.1')).toBe(-1);
    });

    // T2.5: Zero-padded versions
    it('should treat zero-padded versions correctly (T2.5)', () => {
      expect(compareVersions('24.05', '24.5')).toBe(0);
    });

    // Additional comparison tests from acceptance criteria
    it('should correctly compare 3.0.8 and 3.0.19', () => {
      expect(compareVersions('3.0.8', '3.0.19')).toBe(-1);
    });

    it('should handle different major versions', () => {
      expect(compareVersions('2.0.0', '3.0.0')).toBe(-1);
      expect(compareVersions('10.0.0', '9.9.9')).toBe(1);
    });

    it('should handle multi-digit version parts', () => {
      expect(compareVersions('1.10.5', '1.9.8')).toBe(1);
    });
  });

  describe('isVersionVulnerable', () => {
    // T2.6: Range with including/excluding bounds
    it('should detect vulnerable version within inclusive/exclusive range (T2.6)', () => {
      expect(
        isVersionVulnerable('3.0.8', '3.0.1', 'including', '3.0.19', 'excluding'),
      ).toBe(true);
    });

    // T2.7: Boundary at exclusive upper bound
    it('should exclude version at exclusive boundary (T2.7)', () => {
      expect(
        isVersionVulnerable('3.0.19', '3.0.1', 'including', '3.0.19', 'excluding'),
      ).toBe(false);
    });

    // T2.8: Boundary at inclusive upper bound
    it('should include version at inclusive boundary (T2.8)', () => {
      expect(
        isVersionVulnerable('24.09', undefined, undefined, '24.09', 'including'),
      ).toBe(true);
    });

    // T2.9: Version above upper bound
    it('should exclude version above upper bound (T2.9)', () => {
      expect(
        isVersionVulnerable('25.00', undefined, undefined, '24.09', 'including'),
      ).toBe(false);
    });

    // T2.10: No version constraints
    it('should return false when both bounds are undefined (T2.10)', () => {
      expect(
        isVersionVulnerable('1.0.0', undefined, undefined, undefined, undefined),
      ).toBe(false);
    });

    // T2.14: Only start bound (below range)
    it('should exclude version below start bound (T2.14)', () => {
      expect(
        isVersionVulnerable('2.0.0', '3.0.0', 'including', undefined, undefined),
      ).toBe(false);
    });

    // T2.15: Only start bound (in range)
    it('should include version at or above start bound (T2.15)', () => {
      expect(
        isVersionVulnerable('3.5.0', '3.0.0', 'including', undefined, undefined),
      ).toBe(true);
    });

    // Additional vulnerability tests
    it('should handle only upper bound constraint', () => {
      expect(
        isVersionVulnerable('1.5.0', undefined, undefined, '2.0.0', 'including'),
      ).toBe(true);
      expect(
        isVersionVulnerable('2.0.0', undefined, undefined, '2.0.0', 'excluding'),
      ).toBe(false);
    });

    it('should handle inclusive lower bound', () => {
      expect(
        isVersionVulnerable('3.0.1', '3.0.1', 'including', '3.0.10', 'excluding'),
      ).toBe(true);
    });

    it('should handle exclusive lower bound', () => {
      expect(
        isVersionVulnerable('3.0.1', '3.0.1', 'excluding', '3.0.10', 'excluding'),
      ).toBe(false);
      expect(
        isVersionVulnerable('3.0.2', '3.0.1', 'excluding', '3.0.10', 'excluding'),
      ).toBe(true);
    });

    it('should work with real-world Firefox example', () => {
      // Firefox 115.0 < 115.0.2 (vulnerable)
      expect(
        isVersionVulnerable('115.0', undefined, undefined, '115.0.2', 'excluding'),
      ).toBe(true);
      expect(
        isVersionVulnerable('115.0.2', undefined, undefined, '115.0.2', 'excluding'),
      ).toBe(false);
    });

    it('should work with real-world 7-Zip example', () => {
      // 7-Zip 24.05 <= 24.09 (vulnerable, fixed in 25.00)
      expect(
        isVersionVulnerable('24.05', undefined, undefined, '24.09', 'including'),
      ).toBe(true);
      expect(
        isVersionVulnerable('24.09', undefined, undefined, '24.09', 'including'),
      ).toBe(true);
      expect(
        isVersionVulnerable('25.00', undefined, undefined, '24.09', 'including'),
      ).toBe(false);
    });

    it('should work with real-world OpenSSL example', () => {
      // 3.0.8 >= 3.0.1 AND < 3.0.19 (vulnerable)
      expect(
        isVersionVulnerable('3.0.8', '3.0.1', 'including', '3.0.19', 'excluding'),
      ).toBe(true);
      expect(
        isVersionVulnerable('3.0.1', '3.0.1', 'including', '3.0.19', 'excluding'),
      ).toBe(true);
      expect(
        isVersionVulnerable('3.0.19', '3.0.1', 'including', '3.0.19', 'excluding'),
      ).toBe(false);
    });

    it('should work with real-world Node.js example', () => {
      // Node.js 16.20.0 >= 16.0.0 AND < 16.20.2 (vulnerable)
      expect(
        isVersionVulnerable(
          '16.20.0',
          '16.0.0',
          'including',
          '16.20.2',
          'excluding',
        ),
      ).toBe(true);
      expect(
        isVersionVulnerable(
          '16.20.2',
          '16.0.0',
          'including',
          '16.20.2',
          'excluding',
        ),
      ).toBe(false);
    });
  });

  describe('Integration: Normalize then Compare', () => {
    it('should normalize before comparing', () => {
      expect(compareVersions('v3.0.13-ubuntu', '3.0.13')).toBe(0);
      expect(compareVersions('v3.0.14-ubuntu', '3.0.13')).toBe(1);
    });

    it('should handle complex real-world versions', () => {
      expect(
        isVersionVulnerable(
          '3.0.13-1ubuntu3.1',
          '3.0.1',
          'including',
          '3.0.19',
          'excluding',
        ),
      ).toBe(true);
    });
  });
});
