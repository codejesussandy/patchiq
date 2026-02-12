import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patchTemplateService } from '../services/patch-template.service';

export const patchTemplateKeys = {
  all: ['patch-templates'] as const,
  lists: () => [...patchTemplateKeys.all, 'list'] as const,
  latestVersion: (templateId: string, os: string, arch: string) =>
    [...patchTemplateKeys.all, 'latest', templateId, os, arch] as const,
};

export function usePatchTemplates() {
  return useQuery({
    queryKey: patchTemplateKeys.lists(),
    queryFn: () => patchTemplateService.listTemplates(),
  });
}

export function usePatchTemplateLatestVersion(templateId: string, os: string, arch: string = 'x64') {
  return useQuery({
    queryKey: patchTemplateKeys.latestVersion(templateId, os, arch),
    queryFn: () => patchTemplateService.getLatestVersion(templateId, os, arch),
    enabled: !!templateId && !!os,
  });
}

export function useSyncOneToHub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, os, arch, force }: { templateId: string; os?: string; arch?: string; force?: boolean }) =>
      patchTemplateService.syncOneToHub(templateId, os, arch, force),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: patchTemplateKeys.all });
    },
  });
}
