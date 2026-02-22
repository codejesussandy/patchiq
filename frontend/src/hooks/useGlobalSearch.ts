import { useQueries } from '@tanstack/react-query';
import { assetService } from '../services/asset.service';
import { patchService } from '../services/patch.service';
import { vulnerabilityService } from '../services/vulnerability.service';
import type { Asset } from '../types/asset.types';
import type { Patch } from '../types/patch.types';
import type { VulnerabilityItem } from '../services/vulnerability.service';

export interface GlobalSearchResults {
  assets: Asset[];
  patches: Patch[];
  vulnerabilities: VulnerabilityItem[];
  isLoading: boolean;
  totalResults: number;
}

export function useGlobalSearch(query: string): GlobalSearchResults {
  const enabled = query.length >= 2;

  const results = useQueries({
    queries: [
      {
        queryKey: ['globalSearch', 'assets', query],
        queryFn: () => assetService.getAssetsPaginated({ search: query, limit: 5 }),
        enabled,
        staleTime: 30_000,
      },
      {
        queryKey: ['globalSearch', 'patches', query],
        queryFn: () => patchService.getPatches({ search: query, limit: 5 }),
        enabled,
        staleTime: 30_000,
      },
      {
        queryKey: ['globalSearch', 'vulnerabilities', query],
        queryFn: () => vulnerabilityService.getVulnerabilities({ search: query, limit: 5 }),
        enabled,
        staleTime: 30_000,
      },
    ],
  });

  const assetsResult = results[0].data;
  const assets: Asset[] = Array.isArray(assetsResult) ? assetsResult : (assetsResult?.data || []);

  const patchesResult = results[1].data;
  const patches: Patch[] = Array.isArray(patchesResult) ? patchesResult : (patchesResult?.data || []);

  const vulnResult = results[2].data;
  const vulnerabilities: VulnerabilityItem[] = Array.isArray(vulnResult) ? vulnResult : ((vulnResult as any)?.data || []);

  return {
    assets,
    patches,
    vulnerabilities,
    isLoading: results.some((r) => r.isLoading),
    totalResults: assets.length + patches.length + vulnerabilities.length,
  };
}
