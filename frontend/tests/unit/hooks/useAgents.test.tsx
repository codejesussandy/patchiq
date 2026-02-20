import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/services/agent.service', () => ({
  agentService: {
    getAgents: vi.fn().mockResolvedValue([{ id: 'a1', hostname: 'agent-01', status: 'online' }]),
    getAgentDetails: vi.fn().mockResolvedValue({ id: 'a1' }),
    getAgentCommands: vi.fn().mockResolvedValue([]),
    getAgentDownloads: vi.fn().mockResolvedValue([]),
    getAgentVersions: vi.fn().mockResolvedValue([]),
    getAgentErrors: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    deleteAgent: vi.fn().mockResolvedValue({}),
  },
}));

import {
  useAgents,
  useAgentDownloads,
  useAgentVersions,
  agentKeys,
} from '@/hooks/useAgents';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe('useAgents hooks', () => {
  it('useAgents should return loading initially', () => {
    const { result } = renderHook(() => useAgents(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('useAgents should return data on success', async () => {
    const { result } = renderHook(() => useAgents(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([{ id: 'a1', hostname: 'agent-01', status: 'online' }]);
  });

  it('useAgentDownloads should return loading initially', () => {
    const { result } = renderHook(() => useAgentDownloads(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('useAgentVersions should return loading initially', () => {
    const { result } = renderHook(() => useAgentVersions(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  describe('query keys', () => {
    it('agentKeys should generate correct keys', () => {
      expect(agentKeys.all).toEqual(['agents']);
      expect(agentKeys.lists()).toEqual(['agents', 'list']);
      expect(agentKeys.detail('a1')).toEqual(['agents', 'detail', 'a1']);
      expect(agentKeys.downloads()).toEqual(['agents', 'downloads']);
      expect(agentKeys.versions()).toEqual(['agent-versions']);
    });
  });
});
