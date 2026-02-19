import { Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ConfigProvider, App as AntApp, Spin } from 'antd';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter, Routes } from 'react-router-dom';
import { ErrorBoundary, RootErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import {
  coreRoutes,
  assetsRoutes,
  patchesRoutes,
  vulnerabilityRoutes,
  discoveryRoutes,
  settingsRoutes,
} from './routes';

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <Spin size="large" />
  </div>
);

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
    <Routes>
      {coreRoutes}
      {assetsRoutes}
      {patchesRoutes}
      {vulnerabilityRoutes}
      {discoveryRoutes}
      {settingsRoutes}
    </Routes>
    </Suspense>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: true,
      refetchIntervalInBackground: false,
    },
  },
});

function App() {
  return (
    <RootErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <ConfigProvider
            theme={{
              token: {
                colorPrimary: '#0050b3',
                colorText: '#262626',
                colorTextSecondary: '#595959',
                colorTextTertiary: '#8c8c8c',
                borderRadius: 8,
                marginXS: 4,
                marginSM: 8,
                margin: 12,
                marginMD: 16,
                marginLG: 24,
                marginXL: 32,
                marginXXL: 48,
                padding: 16,
                paddingSM: 12,
                paddingMD: 16,
                paddingLG: 24,
                paddingXL: 32,
              },
            }}
          >
            <AntApp>
              <BrowserRouter>
                <ErrorBoundary>
                  <AuthProvider>
                    <AppRoutes />
                  </AuthProvider>
                </ErrorBoundary>
              </BrowserRouter>
            </AntApp>
          </ConfigProvider>
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </HelmetProvider>
    </RootErrorBoundary>
  );
}

export default App;
