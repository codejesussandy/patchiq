import {
  listVulnerabilitiesQuerySchema,
  listZeroDayQuerySchema,
  cveParamsSchema,
  createExceptionBodySchema,
  updateExceptionBodySchema,
  scanVulnerabilitiesBodySchema,
} from '@modules/vulnerabilities/vulnerabilities.validators';

describe('Vulnerabilities Validators', () => {
  describe('listVulnerabilitiesQuerySchema', () => {
    it('should accept valid query parameters', () => {
      const input = {
        page: '1',
        limit: '30',
        search: 'CVE-2024',
        severity: 'CRITICAL,HIGH',
        exploitable: 'true',
        epssMin: '50',
        epssMax: '100',
        riskScoreMin: '70',
        riskScoreMax: '100',
        cvss3Min: '7.0',
        cvss3Max: '10',
        order: 'desc',
      };

      const result = listVulnerabilitiesQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(30);
        expect(result.data.severity).toBe('CRITICAL,HIGH');
        expect(result.data.exploitable).toBe(true);
        expect(result.data.epssMin).toBe(50);
        expect(result.data.epssMax).toBe(100);
      }
    });

    it('should use defaults when not provided', () => {
      const result = listVulnerabilitiesQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(30);
        expect(result.data.order).toBe('desc');
      }
    });

    it('should coerce string numbers to numbers', () => {
      const result = listVulnerabilitiesQuerySchema.safeParse({
        page: '5',
        limit: '50',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(5);
        expect(result.data.limit).toBe(50);
      }
    });

    it('should cap limit at 100', () => {
      const result = listVulnerabilitiesQuerySchema.safeParse({
        limit: '200',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid EPSS range', () => {
      const result = listVulnerabilitiesQuerySchema.safeParse({
        epssMin: '-1',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('listZeroDayQuerySchema', () => {
    it('should accept valid query parameters', () => {
      const result = listZeroDayQuerySchema.safeParse({
        page: '1',
        limit: '20',
        search: 'Apache',
        severity: 'HIGH',
      });
      expect(result.success).toBe(true);
    });

    it('should use defaults', () => {
      const result = listZeroDayQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(30);
      }
    });
  });

  describe('cveParamsSchema', () => {
    it('should accept valid CVE format', () => {
      const validCves = [
        'CVE-2024-12345',
        'CVE-2024-1234',
        'CVE-2023-123456',
        'CVE-1999-0001',
      ];

      validCves.forEach((cve) => {
        const result = cveParamsSchema.safeParse({ cve });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid CVE formats', () => {
      const invalidCves = [
        'cve-2024-1234', // lowercase
        'CVE-24-1234', // 2-digit year
        'CVE-2024-123', // 3-digit sequence
        'CVE2024-1234', // missing dash
        'CVE-2024', // missing sequence
        'VULNERABILITY-2024-1234', // wrong prefix
        '', // empty
      ];

      invalidCves.forEach((cve) => {
        const result = cveParamsSchema.safeParse({ cve });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('createExceptionBodySchema', () => {
    it('should accept valid exception creation data', () => {
      const result = createExceptionBodySchema.safeParse({
        vulnerabilityIds: ['vuln-1', 'vuln-2'],
        exceptionType: 'Acceptable Risk',
        reasonForExclusion: 'Test reason',
        scope: 'Global',
        source: 'vulnerabilities',
      });
      expect(result.success).toBe(true);
    });

    it('should require at least one vulnerability ID', () => {
      const result = createExceptionBodySchema.safeParse({
        vulnerabilityIds: [],
        exceptionType: 'Acceptable Risk',
      });
      expect(result.success).toBe(false);
    });

    it('should only accept valid exception types', () => {
      const validTypes = ['Acceptable Risk', 'Not Applicable'];
      const invalidTypes = ['Invalid', 'Risk Accepted', 'N/A'];

      validTypes.forEach((type) => {
        const result = createExceptionBodySchema.safeParse({
          vulnerabilityIds: ['vuln-1'],
          exceptionType: type,
        });
        expect(result.success).toBe(true);
      });

      invalidTypes.forEach((type) => {
        const result = createExceptionBodySchema.safeParse({
          vulnerabilityIds: ['vuln-1'],
          exceptionType: type,
        });
        expect(result.success).toBe(false);
      });
    });

    it('should only accept valid scopes', () => {
      const validScopes = ['Global', 'Group', 'Endpoint'];

      validScopes.forEach((scope) => {
        const result = createExceptionBodySchema.safeParse({
          vulnerabilityIds: ['vuln-1'],
          exceptionType: 'Acceptable Risk',
          scope,
        });
        expect(result.success).toBe(true);
      });
    });

    it('should accept optional endpoints for Endpoint scope', () => {
      const result = createExceptionBodySchema.safeParse({
        vulnerabilityIds: ['vuln-1'],
        exceptionType: 'Acceptable Risk',
        scope: 'Endpoint',
        endpoints: ['endpoint-1', 'endpoint-2'],
      });
      expect(result.success).toBe(true);
    });

    it('should use default values', () => {
      const result = createExceptionBodySchema.safeParse({
        vulnerabilityIds: ['vuln-1'],
        exceptionType: 'Acceptable Risk',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.scope).toBe('Global');
        expect(result.data.source).toBe('vulnerabilities');
      }
    });
  });

  describe('updateExceptionBodySchema', () => {
    it('should accept partial updates', () => {
      const result = updateExceptionBodySchema.safeParse({
        exceptionType: 'Not Applicable',
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty update', () => {
      const result = updateExceptionBodySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate exception type if provided', () => {
      const result = updateExceptionBodySchema.safeParse({
        exceptionType: 'Invalid Type',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('scanVulnerabilitiesBodySchema', () => {
    it('should accept "all" scope', () => {
      const result = scanVulnerabilitiesBodySchema.safeParse({
        scope: 'all',
      });
      expect(result.success).toBe(true);
    });

    it('should accept "selected" scope with endpoint IDs', () => {
      const result = scanVulnerabilitiesBodySchema.safeParse({
        scope: 'selected',
        endpointIds: ['endpoint-1', 'endpoint-2'],
      });
      expect(result.success).toBe(true);
    });

    it('should use default "all" scope', () => {
      const result = scanVulnerabilitiesBodySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.scope).toBe('all');
      }
    });

    it('should reject invalid scope', () => {
      const result = scanVulnerabilitiesBodySchema.safeParse({
        scope: 'invalid',
      });
      expect(result.success).toBe(false);
    });
  });
});
