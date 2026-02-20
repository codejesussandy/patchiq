import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { ConfigProvider, App as AntApp } from 'antd';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0,
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function renderWithProviders(
  ui: React.ReactElement,
  {
    initialEntries = ['/'],
    queryClient = createQueryClient(),
    ...renderOptions
  } = {} as {
    initialEntries?: string[];
    queryClient?: QueryClient;
    [key: string]: unknown;
  }
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <HelmetProvider>
          <ConfigProvider>
            <AntApp>
              <MemoryRouter initialEntries={initialEntries}>
                <AuthProvider>{children}</AuthProvider>
              </MemoryRouter>
            </AntApp>
          </ConfigProvider>
        </HelmetProvider>
      </QueryClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}

export * from '@testing-library/react';
export { renderWithProviders as render };
