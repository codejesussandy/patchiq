/**
 * R4 Unit Tests: Vulnerability Scan Version-Aware Matching
 *
 * Tests that isVersionVulnerable() from version-compare.ts correctly
 * determines whether a software version falls within a CVE's vulnerable range.
 * This is the core matching logic used by checkAssetVulnerabilities().
 */
import { isVersionVulnerable } from '@shared/utils/version-compare';

describe('R4: Vulnerability Scan — Version-Aware Matching', () => {
  // T4.1: Firefox 115.0 with range [100.0, 116.0) → Detected
  it('T4.1: detects Firefox 115.0 within range [100.0, 116.0)', () => {
    const result = isVersionVulnerable('115.0', '100.0', 'including', '116.0', 'excluding');
    expect(result).toBe(true);
  });

  // T4.2: Firefox 120.0 with range [100.0, 116.0) → Not detected
  it('T4.2: Firefox 120.0 is NOT within range [100.0, 116.0)', () => {
    const result = isVersionVulnerable('120.0', '100.0', 'including', '116.0', 'excluding');
    expect(result).toBe(false);
  });

  // T4.3: OpenSSL 3.0.19 with range [3.0.1, 3.0.19) → Not detected (boundary excluded)
  it('T4.3: OpenSSL 3.0.19 is NOT within range [3.0.1, 3.0.19) — excluded boundary', () => {
    const result = isVersionVulnerable('3.0.19', '3.0.1', 'including', '3.0.19', 'excluding');
    expect(result).toBe(false);
  });

  // T4.4: OpenSSL 3.0.8 with range [3.0.1, 3.0.19) → Detected
  it('T4.4: detects OpenSSL 3.0.8 within range [3.0.1, 3.0.19)', () => {
    const result = isVersionVulnerable('3.0.8', '3.0.1', 'including', '3.0.19', 'excluding');
    expect(result).toBe(true);
  });

  // T4.5: 7-Zip 24.09 with range (*, 24.09] → Detected (inclusive upper bound)
  it('T4.5: detects 7-Zip 24.09 within range (*, 24.09]', () => {
    const result = isVersionVulnerable('24.09', undefined, undefined, '24.09', 'including');
    expect(result).toBe(true);
  });

  // T4.6: 7-Zip 25.00 with range (*, 24.09] → Not detected
  it('T4.6: 7-Zip 25.00 is NOT within range (*, 24.09]', () => {
    const result = isVersionVulnerable('25.00', undefined, undefined, '24.09', 'including');
    expect(result).toBe(false);
  });

  // T4.7: No version constraints → Not detected (conservative rule)
  it('T4.7: no version constraints returns false (conservative)', () => {
    const result = isVersionVulnerable('20.10.0', undefined, undefined, undefined, undefined);
    expect(result).toBe(false);
  });

  // T4.10: Notepad++ 8.8.9 with range (*, 8.8.9) → Not detected (boundary excluded)
  it('T4.10: Notepad++ 8.8.9 is NOT within range (*, 8.8.9) — excluded boundary', () => {
    const result = isVersionVulnerable('8.8.9', undefined, undefined, '8.8.9', 'excluding');
    expect(result).toBe(false);
  });

  // T4.11: Notepad++ 8.8.8 with range (*, 8.8.9) → Detected
  it('T4.11: detects Notepad++ 8.8.8 within range (*, 8.8.9)', () => {
    const result = isVersionVulnerable('8.8.8', undefined, undefined, '8.8.9', 'excluding');
    expect(result).toBe(true);
  });
});
