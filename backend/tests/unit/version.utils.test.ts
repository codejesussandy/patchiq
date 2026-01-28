/**
 * Version Utilities Unit Tests
 *
 * Tests for Phase 3: Version Normalization
 */

import {
  normalizeVersion,
  compareVersions,
  isVersionInRange,
  isVersionVulnerable,
  getBaseVersion,
  areVersionsCompatible,
} from '../../src/shared/utils/version.utils';

describe('Version Utilities', () => {
  describe('normalizeVersion', () => {
    describe('Debian/Ubuntu versions', () => {
      it('should remove ubuntu suffix', () => {
        expect(normalizeVersion('3.0.13-1ubuntu3.1')).toBe('3.0.13');
        expect(normalizeVersion('2.31-0ubuntu9.7')).toBe('2.31');
        expect(normalizeVersion('1.2.3-0ubuntu0.22.04.1')).toBe('1.2.3');
      });

      it('should remove build suffix', () => {
        expect(normalizeVersion('1.2.3-1build1')).toBe('1.2.3');
      });

      it('should remove deb suffix', () => {
        expect(normalizeVersion('2.4.57+deb12u1')).toBe('2.4.57');
        expect(normalizeVersion('1.2.3+deb11u2')).toBe('1.2.3');
      });

      it('should remove dfsg suffix', () => {
        expect(normalizeVersion('1.2.3+dfsg')).toBe('1.2.3');
        expect(normalizeVersion('1.2.3~dfsg1-2')).toBe('1.2.3');
      });
    });

    describe('RHEL/CentOS versions', () => {
      it('should remove el suffix', () => {
        expect(normalizeVersion('3.0.13-1.el8')).toBe('3.0.13');
        expect(normalizeVersion('3.0.13-1.el8_5')).toBe('3.0.13');
        expect(normalizeVersion('1.2.3-4.el9')).toBe('1.2.3');
      });
    });

    describe('Fedora versions', () => {
      it('should remove fc suffix', () => {
        expect(normalizeVersion('3.0.13-1.fc38')).toBe('3.0.13');
        expect(normalizeVersion('1.2.3-2.fc39')).toBe('1.2.3');
      });
    });

    describe('Amazon Linux versions', () => {
      it('should remove amzn suffix', () => {
        expect(normalizeVersion('3.0.13-1.amzn2')).toBe('3.0.13');
        expect(normalizeVersion('1.2.3-1.amzn2023')).toBe('1.2.3');
      });
    });

    describe('Alpine versions', () => {
      it('should remove -r suffix', () => {
        expect(normalizeVersion('3.0.13-r0')).toBe('3.0.13');
        expect(normalizeVersion('1.2.3-r5')).toBe('1.2.3');
      });
    });

    describe('Epoch prefix', () => {
      it('should remove epoch prefix', () => {
        expect(normalizeVersion('1:8.5.0-1')).toBe('8.5.0');
        expect(normalizeVersion('2:1.2.3')).toBe('1.2.3');
      });

      it('should not remove non-epoch colons', () => {
        expect(normalizeVersion('12:34:56')).toBe('12:34:56');
      });
    });

    describe('Git suffixes', () => {
      it('should remove git commit suffix', () => {
        expect(normalizeVersion('1.2.3-g1234abc')).toBe('1.2.3');
        expect(normalizeVersion('1.2.3+gabcdef0')).toBe('1.2.3');
      });
    });

    describe('Pre-release versions', () => {
      it('should remove pre-release by default', () => {
        expect(normalizeVersion('1.2.3-rc1')).toBe('1.2.3');
        expect(normalizeVersion('1.2.3-beta2')).toBe('1.2.3');
        expect(normalizeVersion('1.2.3-alpha')).toBe('1.2.3');
        expect(normalizeVersion('1.2.3-dev')).toBe('1.2.3');
      });

      it('should keep pre-release when option set', () => {
        expect(normalizeVersion('1.2.3-rc1', { keepPreRelease: true })).toBe('1.2.3-rc1');
      });
    });

    describe('Edge cases', () => {
      it('should handle null/undefined', () => {
        expect(normalizeVersion(null)).toBe(null);
        expect(normalizeVersion(undefined)).toBe(null);
        expect(normalizeVersion('')).toBe(null);
      });

      it('should handle simple versions', () => {
        expect(normalizeVersion('1.2.3')).toBe('1.2.3');
        expect(normalizeVersion('10.0.0')).toBe('10.0.0');
      });

      it('should handle single number versions', () => {
        expect(normalizeVersion('123')).toBe('123');
      });

      it('should preserve version if normalization removes too much', () => {
        expect(normalizeVersion('abc')).toBe('abc');
      });
    });
  });

  describe('compareVersions', () => {
    it('should compare equal versions', () => {
      expect(compareVersions('1.2.3', '1.2.3')).toBe(0);
      expect(compareVersions('10.0.0', '10.0.0')).toBe(0);
    });

    it('should compare different versions', () => {
      expect(compareVersions('1.2.3', '1.2.4')).toBe(-1);
      expect(compareVersions('1.2.4', '1.2.3')).toBe(1);
    });

    it('should compare major versions', () => {
      expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
      expect(compareVersions('2.0.0', '1.0.0')).toBe(1);
    });

    it('should compare minor versions', () => {
      expect(compareVersions('1.1.0', '1.2.0')).toBe(-1);
      expect(compareVersions('1.2.0', '1.1.0')).toBe(1);
    });

    it('should handle different length versions', () => {
      expect(compareVersions('1.2', '1.2.0')).toBe(0);
      expect(compareVersions('1.2', '1.2.1')).toBe(-1);
      expect(compareVersions('1.2.1', '1.2')).toBe(1);
    });

    it('should compare with normalization', () => {
      expect(compareVersions('3.0.13-1ubuntu3.1', '3.0.14')).toBe(-1);
      expect(compareVersions('3.0.14', '3.0.13-1ubuntu3.1')).toBe(1);
      expect(compareVersions('3.0.13-1ubuntu3.1', '3.0.13')).toBe(0);
    });

    it('should handle null values', () => {
      expect(compareVersions(null, null)).toBe(0);
      expect(compareVersions(null, '1.0.0')).toBe(-1);
      expect(compareVersions('1.0.0', null)).toBe(1);
    });

    it('should handle double-digit version parts', () => {
      expect(compareVersions('1.9.0', '1.10.0')).toBe(-1);
      expect(compareVersions('1.10.0', '1.9.0')).toBe(1);
      expect(compareVersions('120.0.6099.129', '120.0.6099.130')).toBe(-1);
    });
  });

  describe('isVersionInRange', () => {
    describe('inclusive ranges', () => {
      it('should match version at start boundary (including)', () => {
        expect(isVersionInRange('1.0.0', '1.0.0', 'including', '2.0.0', 'excluding')).toBe(true);
      });

      it('should match version at end boundary (including)', () => {
        expect(isVersionInRange('2.0.0', '1.0.0', 'including', '2.0.0', 'including')).toBe(true);
      });
    });

    describe('exclusive ranges', () => {
      it('should not match version at start boundary (excluding)', () => {
        expect(isVersionInRange('1.0.0', '1.0.0', 'excluding', '2.0.0', 'excluding')).toBe(false);
      });

      it('should not match version at end boundary (excluding)', () => {
        expect(isVersionInRange('2.0.0', '1.0.0', 'including', '2.0.0', 'excluding')).toBe(false);
      });
    });

    describe('real-world vulnerability ranges', () => {
      // Chrome example: vulnerable >= 120.0.0.0 and < 120.0.6099.130
      it('should detect vulnerable Chrome version', () => {
        expect(
          isVersionInRange('120.0.6099.129', '120.0.0.0', 'including', '120.0.6099.130', 'excluding')
        ).toBe(true);
      });

      it('should detect fixed Chrome version', () => {
        expect(
          isVersionInRange('120.0.6099.130', '120.0.0.0', 'including', '120.0.6099.130', 'excluding')
        ).toBe(false);
      });

      // OpenSSL example: vulnerable >= 3.0.0 and < 3.0.14
      it('should detect vulnerable OpenSSL version', () => {
        expect(isVersionInRange('3.0.13', '3.0.0', 'including', '3.0.14', 'excluding')).toBe(true);
      });

      it('should detect fixed OpenSSL version', () => {
        expect(isVersionInRange('3.0.14', '3.0.0', 'including', '3.0.14', 'excluding')).toBe(false);
      });

      // With distro suffix
      it('should handle distro suffixes', () => {
        expect(
          isVersionInRange('3.0.13-1ubuntu3.1', '3.0.0', 'including', '3.0.14', 'excluding')
        ).toBe(true);
      });
    });

    describe('unbounded ranges', () => {
      it('should handle no lower bound', () => {
        expect(isVersionInRange('0.9.0', null, null, '1.0.0', 'excluding')).toBe(true);
        expect(isVersionInRange('1.0.0', null, null, '1.0.0', 'excluding')).toBe(false);
      });

      it('should handle no upper bound', () => {
        expect(isVersionInRange('2.0.0', '1.0.0', 'including', null, null)).toBe(true);
        expect(isVersionInRange('0.9.0', '1.0.0', 'including', null, null)).toBe(false);
      });

      it('should handle no bounds (all versions vulnerable)', () => {
        expect(isVersionInRange('999.0.0', null, null, null, null)).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should return false for null version', () => {
        expect(isVersionInRange(null, '1.0.0', 'including', '2.0.0', 'excluding')).toBe(false);
      });
    });
  });

  describe('isVersionVulnerable', () => {
    it('should detect vulnerable version', () => {
      expect(isVersionVulnerable('3.0.13', '3.0.14')).toBe(true);
      expect(isVersionVulnerable('1.0.0', '2.0.0')).toBe(true);
    });

    it('should detect fixed version', () => {
      expect(isVersionVulnerable('3.0.14', '3.0.14')).toBe(false);
      expect(isVersionVulnerable('3.0.15', '3.0.14')).toBe(false);
    });

    it('should handle distro suffixes', () => {
      expect(isVersionVulnerable('3.0.13-1ubuntu3.1', '3.0.14')).toBe(true);
      expect(isVersionVulnerable('3.0.14-1ubuntu1', '3.0.14')).toBe(false);
    });

    it('should assume vulnerable if no fix available', () => {
      expect(isVersionVulnerable('1.0.0', null)).toBe(true);
    });

    it('should return false for null installed version', () => {
      expect(isVersionVulnerable(null, '1.0.0')).toBe(false);
    });
  });

  describe('getBaseVersion', () => {
    it('should extract base version', () => {
      expect(getBaseVersion('1.2.3.4.5')).toBe('1.2.3');
      expect(getBaseVersion('1.2.3-ubuntu1')).toBe('1.2.3');
    });

    it('should handle custom depth', () => {
      expect(getBaseVersion('1.2.3.4.5', 2)).toBe('1.2');
      expect(getBaseVersion('1.2.3.4.5', 4)).toBe('1.2.3.4');
    });

    it('should handle null', () => {
      expect(getBaseVersion(null)).toBe(null);
    });
  });

  describe('areVersionsCompatible', () => {
    it('should detect compatible versions', () => {
      expect(areVersionsCompatible('1.2.3', '1.2.4')).toBe(true);
      expect(areVersionsCompatible('1.2.0', '1.2.99')).toBe(true);
    });

    it('should detect incompatible versions', () => {
      expect(areVersionsCompatible('1.2.3', '1.3.0')).toBe(false);
      expect(areVersionsCompatible('1.2.3', '2.2.3')).toBe(false);
    });

    it('should handle null', () => {
      expect(areVersionsCompatible(null, '1.2.3')).toBe(false);
      expect(areVersionsCompatible('1.2.3', null)).toBe(false);
    });
  });
});
