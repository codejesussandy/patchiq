import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentService } from '../services/agent.service';

export const agentKeys = {
  all: ['agents'] as const,
  lists: () => [...agentKeys.all, 'list'] as const,
  details: () => [...agentKeys.all, 'detail'] as const,
  detail: (id: string) => [...agentKeys.details(), id] as const,
  commands: (id: string) => [...agentKeys.all, 'commands', id] as const,
  downloads: () => [...agentKeys.all, 'downloads'] as const,
  versions: () => ['agent-versions'] as const,
  errors: (params?: Record<string, unknown>) => [...agentKeys.all, 'errors', params] as const,
};

export function useAgents() {
  return useQuery({
    queryKey: agentKeys.lists(),
    queryFn: () => agentService.getAgents(),
  });
}

export function useAgentDetails(id: string) {
  return useQuery({
    queryKey: agentKeys.detail(id),
    queryFn: () => agentService.getAgentDetails(id),
    enabled: !!id,
  });
}

export function useAgentCommands(id: string) {
  return useQuery({
    queryKey: agentKeys.commands(id),
    queryFn: () => agentService.getAgentCommands(id),
    enabled: !!id,
  });
}

export function useAgentDownloads() {
  return useQuery({
    queryKey: agentKeys.downloads(),
    queryFn: () => agentService.getAgentDownloads(),
  });
}

export function useAgentVersions() {
  return useQuery({
    queryKey: agentKeys.versions(),
    queryFn: () => agentService.getAgentVersions(),
  });
}

export function useAgentErrors(params?: {
  agentId?: string;
  commandType?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: agentKeys.errors(params),
    queryFn: () => agentService.getAgentErrors(params),
    refetchInterval: 30000,
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => agentService.deleteAgent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentKeys.all });
    },
  });
}
