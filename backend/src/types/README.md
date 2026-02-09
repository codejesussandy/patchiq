# PatchIQ Type Definitions

This directory contains TypeScript type definitions for the PatchIQ backend.

## Files

- **`patch-correlation.d.ts`** - Complete type definitions for the 5-stage patch correlation pipeline
- **`index.ts`** - Central export file for easy importing

## Usage

### Importing Types

```typescript
// Import from central types export
import {
  CpeResolution,
  VulnerabilityMatch,
  AssetPatchRecommendation,
  RecommendationStatus
} from '@/types';

// Or import directly from specific file
import type { ICpeMappingService } from '@/types/patch-correlation';
```

### Using Types in Services

```typescript
import { AgentSoftware, CpeResolution } from '@/types';

class MyCpeMappingService implements ICpeMappingService {
  async resolveCpe(software: AgentSoftware): Promise<CpeResolution | null> {
    // Implementation
  }
}
```

### Using Types in Controllers

```typescript
import { AssetPatchRecommendation, RecommendationStatus } from '@/types';

export async function getRecommendations(
  req: Request,
  res: Response
): Promise<void> {
  const recommendations: AssetPatchRecommendation[] = await service.list();
  res.json({ data: recommendations });
}
```

### Using Enum Types

```typescript
import { VulnerabilitySeverity, RecommendationStatus } from '@/types';

function filterBySeverity(severity: VulnerabilitySeverity) {
  // TypeScript will enforce that severity is one of:
  // 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNSPECIFIED'
}

function updateStatus(status: RecommendationStatus) {
  // TypeScript will enforce that status is one of:
  // 'recommended' | 'accepted' | 'rejected' | 'deployed' | 'verified' | 'failed'
}
```

## Type Hierarchy

### Stage 1: CPE Resolution
```
AgentSoftware → ICpeMappingService.resolveCpe() → CpeResolution
                        ↓
                  CpeMapping (database)
                        ↓
                UnmatchedSoftware (tracking)
```

### Stage 2: Vulnerability Detection
```
CpeResolution → ICveDatabaseService.checkAssetVulnerabilities() → VulnerabilityMatch[]
                        ↓
                  Vulnerability
                        ↓
                VulnerabilitySoftware
                        ↓
                AssetVulnerability
```

### Stage 3: Patch Recommendations
```
AssetVulnerability → IAssetPatchRecommendationService.createRecommendations() → AssetPatchRecommendation
                        ↓
                    Patch
                        ↓
                  PatchBundle
```

### Stage 4: Deployment
```
AssetPatchRecommendation → createPatchDeployment() → PatchDeployment
                        ↓
                PatchDeploymentTask
                        ↓
                  AgentCommand
```

## Type Safety Features

### 1. Discriminated Unions for Status

```typescript
type RecommendationStatus =
  | 'recommended'
  | 'accepted'
  | 'rejected'
  | 'deployed'
  | 'verified'
  | 'failed';

// TypeScript will catch typos
const status: RecommendationStatus = 'verfied'; // Error: Did you mean 'verified'?
```

### 2. Nullable Types

```typescript
interface CpeResolution {
  cpeVendor: string;        // Required
  cpeProduct: string;       // Required
  confidence: number;       // Required
  mappingId?: string;       // Optional (string | undefined)
}

interface AgentSoftware {
  name: string;             // Required
  vendor?: string | null;   // Explicitly nullable
  version?: string | null;  // Explicitly nullable
}
```

### 3. Service Interfaces

```typescript
interface ICpeMappingService {
  resolveCpe(software: AgentSoftware): Promise<CpeResolution | null>;
  resolveCpeBatch(softwareList: AgentSoftware[]): Promise<Map<string, CpeResolution | null>>;
  normalizeSoftwareName(name: string): string;
  // ... more methods
}

// Implementations must satisfy interface
class CpeMappingService implements ICpeMappingService {
  // Must implement all methods with correct signatures
}
```

### 4. Generic Pagination

```typescript
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Usage
const response: PaginatedResponse<AssetPatchRecommendation> = {
  data: [...],
  total: 100,
  page: 1,
  limit: 50,
  totalPages: 2
};
```

## Best Practices

### 1. Always Use Type Annotations for Public APIs

```typescript
// Good ✓
export async function getRecommendations(
  assetId: string
): Promise<AssetPatchRecommendation[]> {
  return await service.list({ assetId });
}

// Bad ✗ (implicit any return type)
export async function getRecommendations(assetId: string) {
  return await service.list({ assetId });
}
```

### 2. Use Type Guards for Runtime Checks

```typescript
import { RecommendationStatus } from '@/types';

function isValidStatus(status: string): status is RecommendationStatus {
  return ['recommended', 'accepted', 'rejected', 'deployed', 'verified', 'failed']
    .includes(status);
}

// Usage
const status = req.body.status;
if (isValidStatus(status)) {
  // TypeScript knows status is RecommendationStatus here
  await service.updateStatus(status);
}
```

### 3. Use Utility Types for Transformations

```typescript
// Pick subset of fields
type RecommendationSummary = Pick<
  AssetPatchRecommendation,
  'id' | 'status' | 'severity' | 'riskScore'
>;

// Make all fields optional
type PartialRecommendation = Partial<AssetPatchRecommendation>;

// Make all fields required
type RequiredRecommendation = Required<AssetPatchRecommendation>;

// Omit specific fields
type RecommendationWithoutTimestamps = Omit<
  AssetPatchRecommendation,
  'createdAt' | 'updatedAt'
>;
```

### 4. Use Const Assertions for Literal Types

```typescript
const SEVERITY_LEVELS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNSPECIFIED'] as const;
type VulnerabilitySeverity = typeof SEVERITY_LEVELS[number];
// 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNSPECIFIED'
```

## IDE Support

These type definitions enable:

1. **Auto-completion** - IDE suggests available fields and methods
2. **Type checking** - Catch errors before runtime
3. **IntelliSense** - Hover documentation for types
4. **Refactoring** - Rename symbols safely across files
5. **Go to definition** - Jump to type definitions

## Validation vs Type Checking

**Important:** TypeScript types are compile-time only. For runtime validation, use validators:

```typescript
import { z } from 'zod';
import type { AgentSoftware } from '@/types';

// Runtime validation schema
const AgentSoftwareSchema = z.object({
  name: z.string(),
  vendor: z.string().nullable().optional(),
  version: z.string().nullable().optional(),
  platform: z.enum(['windows', 'darwin', 'linux']).nullable().optional(),
  packageManager: z.string().nullable().optional(),
});

// Type matches schema
type ValidatedAgentSoftware = z.infer<typeof AgentSoftwareSchema>;

// Use for API validation
app.post('/api/software', async (req, res) => {
  const software: AgentSoftware = AgentSoftwareSchema.parse(req.body);
  // Now safely typed and validated
});
```

## Testing with Types

```typescript
import type { AssetPatchRecommendation, RecommendationStatus } from '@/types';

// Mock factory with correct types
function mockRecommendation(
  overrides?: Partial<AssetPatchRecommendation>
): AssetPatchRecommendation {
  return {
    id: 'rec-123',
    assetId: 'asset-456',
    vulnerabilityId: 'vuln-789',
    patchId: 'patch-012',
    status: 'recommended',
    severity: 'HIGH',
    riskScore: 85,
    recommendedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides, // Type-safe overrides
  };
}

// Test with typed mock
describe('AssetPatchRecommendationService', () => {
  it('should accept recommendation', async () => {
    const recommendation = mockRecommendation();
    const result = await service.acceptRecommendation(recommendation.id);
    expect(result.status).toBe('accepted');
  });
});
```

## Maintenance

When updating types:

1. **Update `patch-correlation.d.ts`** with new types
2. **Export from `index.ts`** if commonly used
3. **Update this README** with usage examples
4. **Run type checker** - `npm run typecheck`
5. **Update tests** to use new types

## Related Documentation

- [PATCH_CORRELATION_LOGIC.md](../../../PATCH_CORRELATION_LOGIC.md) - Detailed logic explanation
- [Prisma Schema](../db/prisma/schema.prisma) - Database models
- [API Documentation](http://localhost:3000/api-docs) - REST API endpoints

## Questions?

For questions about these types, consult:
- TypeScript documentation: https://www.typescriptlang.org/docs/
- PatchIQ architecture docs: `/CLAUDE.md`, `/PATCH_CORRELATION_LOGIC.md`
- Team leads or senior developers
