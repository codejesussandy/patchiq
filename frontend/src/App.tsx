import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ConfigProvider, App as AntApp, Spin } from 'antd';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary, RootErrorBoundary } from './components/ErrorBoundary';
import { MainLayout } from './components/MainLayout';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// --- Lazy-loaded page components ---
// Named exports use .then(m => ({ default: m.X })) adapter for React.lazy()

// Core pages
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const UserOnboarding = lazy(() => import('./pages/UserOnboarding').then(m => ({ default: m.UserOnboarding })));
const Notifications = lazy(() => import('./pages/Notifications').then(m => ({ default: m.Notifications })));
const Reports = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const CreateReport = lazy(() => import('./pages/reports/CreateReport').then(m => ({ default: m.CreateReport })));

// Assets
const AllAssets = lazy(() => import('./pages/assets/AllAssets').then(m => ({ default: m.AllAssets })));
const AssetDetails = lazy(() => import('./pages/assets/components/AssetDetails').then(m => ({ default: m.AssetDetails })));
const SoftwareInventory = lazy(() => import('./pages/assets/SoftwareInventory').then(m => ({ default: m.SoftwareInventory })));
const SoftwareLicense = lazy(() => import('./pages/assets/SoftwareLicense').then(m => ({ default: m.SoftwareLicense })));
const Hub = lazy(() => import('./pages/hub/Hub').then(m => ({ default: m.Hub })));

// Patches
const AllPatches = lazy(() => import('./pages/patches/AllPatches').then(m => ({ default: m.AllPatches })));
const PatchDetails = lazy(() => import('./pages/patches/PatchDetails').then(m => ({ default: m.PatchDetails })));
const PatchRecommendations = lazy(() => import('./pages/patches/PatchRecommendations'));
const PatchTestApprove = lazy(() => import('./pages/patches/PatchTestApprove').then(m => ({ default: m.PatchTestApprove })));
const ZeroTouchDeployment = lazy(() => import('./pages/patches/ZeroTouchDeployment').then(m => ({ default: m.ZeroTouchDeployment })));
const PatchJobs = lazy(() => import('./pages/jobs/PatchJobs').then(m => ({ default: m.PatchJobs })));
const PatchJobsDeployed = lazy(() => import('./pages/jobs/PatchJobsDeployed').then(m => ({ default: m.PatchJobsDeployed })));

// Vulnerability
const Vulnerabilities = lazy(() => import('./pages/vulnerability/Vulnerabilities').then(m => ({ default: m.Vulnerabilities })));
const ZeroDayVulnerabilities = lazy(() => import('./pages/vulnerability/ZeroDayVulnerabilities').then(m => ({ default: m.ZeroDayVulnerabilities })));
const ManageException = lazy(() => import('./pages/vulnerability/ManageException').then(m => ({ default: m.ManageException })));
const VulnerabilityDetail = lazy(() => import('./pages/vulnerability/VulnerabilityDetail').then(m => ({ default: m.VulnerabilityDetail })));
const VulnerabilityJobs = lazy(() => import('./pages/jobs/VulnerabilityJobs').then(m => ({ default: m.VulnerabilityJobs })));

// Discovery
const IPDiscovery = lazy(() => import('./pages/discovery/IPDiscovery').then(m => ({ default: m.IPDiscovery })));
const DeviceCredentials = lazy(() => import('./pages/discovery/DeviceCredentials').then(m => ({ default: m.DeviceCredentials })));
const Agents = lazy(() => import('./pages/discovery/Agents').then(m => ({ default: m.Agents })));

// Settings — User Management
const Organization = lazy(() => import('./pages/settings/Organization').then(m => ({ default: m.Organization })));
const UserLocation = lazy(() => import('./pages/settings/UserLocation').then(m => ({ default: m.UserLocation })));
const UserRoles = lazy(() => import('./pages/settings/UserRoles').then(m => ({ default: m.UserRoles })));
const RolesAndPrivileges = lazy(() => import('./pages/settings/RolesAndPrivileges').then(m => ({ default: m.RolesAndPrivileges })));
const Users = lazy(() => import('./pages/settings/Users').then(m => ({ default: m.Users })));
const PasswordPolicies = lazy(() => import('./pages/settings/PasswordPolicies').then(m => ({ default: m.PasswordPolicies })));

// Settings — System
const Branding = lazy(() => import('./pages/settings/Branding').then(m => ({ default: m.Branding })));
const VendorLogo = lazy(() => import('./pages/settings/VendorLogo').then(m => ({ default: m.VendorLogo })));
const MailServerConfiguration = lazy(() => import('./pages/settings/MailServerConfiguration').then(m => ({ default: m.MailServerConfiguration })));
const ProxyServerConfiguration = lazy(() => import('./pages/settings/ProxyServerConfiguration').then(m => ({ default: m.ProxyServerConfiguration })));
const LDAPServerConfiguration = lazy(() => import('./pages/settings/LDAPServerConfiguration').then(m => ({ default: m.LDAPServerConfiguration })));
const RiskScoreSettings = lazy(() => import('./pages/settings/RiskScoreSettings').then(m => ({ default: m.RiskScoreSettings })));
const RemoteDesktopSettings = lazy(() => import('./pages/settings/RemoteDesktopSettings').then(m => ({ default: m.RemoteDesktopSettings })));
const ServerSettings = lazy(() => import('./pages/settings/ServerSettings').then(m => ({ default: m.ServerSettings })));

// Settings — Agent Management
const AgentApprovals = lazy(() => import('./pages/settings/AgentApprovals').then(m => ({ default: m.AgentApprovals })));
const AgentApprovalSettings = lazy(() => import('./pages/settings/AgentApprovalSettings').then(m => ({ default: m.AgentApprovalSettings })));
const AgentVersions = lazy(() => import('./pages/settings/AgentVersions').then(m => ({ default: m.AgentVersions })));
const AgentConfiguration = lazy(() => import('./pages/settings/AgentConfiguration').then(m => ({ default: m.AgentConfiguration })));
const EnrollSecret = lazy(() => import('./pages/settings/EnrollSecret').then(m => ({ default: m.EnrollSecret })));
const RedHatAgentNomination = lazy(() => import('./pages/settings/RedHatAgentNomination').then(m => ({ default: m.RedHatAgentNomination })));

// Settings — Patch & Policy
const DeploymentPolicies = lazy(() => import('./pages/settings/DeploymentPolicies').then(m => ({ default: m.DeploymentPolicies })));
const ComputerGroups = lazy(() => import('./pages/settings/ComputerGroups').then(m => ({ default: m.ComputerGroups })));
const PatchPreferences = lazy(() => import('./pages/settings/PatchPreferences').then(m => ({ default: m.PatchPreferences })));
const DistributionServer = lazy(() => import('./pages/settings/DistributionServer').then(m => ({ default: m.DistributionServer })));
const PatchManagement = lazy(() => import('./pages/settings/PatchManagement').then(m => ({ default: m.PatchManagement })));
const PolicyManagement = lazy(() => import('./pages/settings/PolicyManagement').then(m => ({ default: m.PolicyManagement })));

// Settings — Other
const NotificationPreferences = lazy(() => import('./pages/settings/NotificationPreferences').then(m => ({ default: m.NotificationPreferences })));
const VulnerabilityPreference = lazy(() => import('./pages/settings/VulnerabilityPreference').then(m => ({ default: m.VulnerabilityPreference })));
const MarketPlace = lazy(() => import('./pages/settings/MarketPlace').then(m => ({ default: m.MarketPlace })));
const Audit = lazy(() => import('./pages/settings/Audit').then(m => ({ default: m.Audit })));
const PlatformLicense = lazy(() => import('./pages/settings/PlatformLicense').then(m => ({ default: m.PlatformLicense })));

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// Public route wrapper (redirect to dashboard if already authenticated)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
  }

  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <Spin size="large" />
  </div>
);

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <ForgotPassword />
          </PublicRoute>
        }
      />
      <Route
        path="/onboarding"
        element={
          <PublicRoute>
            <UserOnboarding />
          </PublicRoute>
        }
      />
      {/* Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Dashboard />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Reports */}
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Reports />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/create"
        element={
          <ProtectedRoute>
            <MainLayout>
              <CreateReport />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Patches */}
      <Route
        path="/patches"
        element={
          <ProtectedRoute>
            <MainLayout>
              <AllPatches />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patch-recommendations"
        element={
          <ProtectedRoute>
            <MainLayout>
              <PatchRecommendations />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patches/:id"
        element={
          <ProtectedRoute>
            <MainLayout>
              <PatchDetails />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patches/deployed/*"
        element={
          <ProtectedRoute>
            <MainLayout>
              <PatchJobsDeployed />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patches/test-approve"
        element={
          <ProtectedRoute>
            <MainLayout>
              <PatchTestApprove />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patches/zero-touch"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ZeroTouchDeployment />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patches/patch-jobs"
        element={
          <ProtectedRoute>
            <MainLayout>
              <PatchJobs />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Assets */}
      <Route
        path="/assets"
        element={
          <ProtectedRoute>
            <MainLayout>
              <AllAssets />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assets/:id"
        element={
          <ProtectedRoute>
            <MainLayout>
              <AssetDetails />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assets/software-inventory"
        element={
          <ProtectedRoute>
            <MainLayout>
              <SoftwareInventory />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assets/software-license"
        element={
          <ProtectedRoute>
            <MainLayout>
              <SoftwareLicense />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      {/* OS licenses merged into /assets/software-license */}

      {/* Vulnerability */}
      <Route
        path="/vulnerability/zero-day-vulnerabilities"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ZeroDayVulnerabilities />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/vulnerability/vulnerabilities"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Vulnerabilities />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/vulnerability/manage-exception"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ManageException />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/vulnerability/vulnerability-jobs/*"
        element={
          <ProtectedRoute>
            <MainLayout>
              <VulnerabilityJobs />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/vulnerability"
        element={<Navigate to="/vulnerability/zero-day-vulnerabilities" replace />}
      />
      <Route
        path="/vulnerability/:id"
        element={
          <ProtectedRoute>
            <MainLayout>
              <VulnerabilityDetail />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Discovery */}
      <Route
        path="/discovery/ip-discovery"
        element={
          <ProtectedRoute>
            <MainLayout>
              <IPDiscovery />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/discovery/device-credentials"
        element={
          <ProtectedRoute>
            <MainLayout>
              <DeviceCredentials />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/discovery/agents"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Agents />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/discovery"
        element={<Navigate to="/discovery/ip-discovery" replace />}
      />

      {/* Jobs - backwards compat redirects */}
      <Route
        path="/jobs/software-jobs/*"
        element={<Navigate to="/hub" replace />}
      />
      <Route
        path="/jobs"
        element={<Navigate to="/hub" replace />}
      />

      {/* Hub - Software Package Repository (under Assets) */}
      <Route
        path="/assets/hub"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Hub />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route path="/hub" element={<Navigate to="/assets/hub" replace />} />

      {/* Notifications */}
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Notifications />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/notification-preferences"
        element={
          <ProtectedRoute>
            <MainLayout>
              <NotificationPreferences />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Settings - User Management Sub-pages */}
      <Route
        path="/settings/user-management/organization"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Organization />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/user-management/location"
        element={
          <ProtectedRoute>
            <MainLayout>
              <UserLocation />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/user-management/user-roles"
        element={
          <ProtectedRoute>
            <MainLayout>
              <UserRoles />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/user-management/roles"
        element={
          <ProtectedRoute>
            <MainLayout>
              <RolesAndPrivileges />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/user-management/users"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Users />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/user-management/password-policies"
        element={
          <ProtectedRoute>
            <MainLayout>
              <PasswordPolicies />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/user-management"
        element={<Navigate to="/settings/user-management/organization" replace />}
      />
      <Route
        path="/settings/system-settings/branding"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Branding />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/system-settings/vendor-logo"
        element={
          <ProtectedRoute>
            <MainLayout>
              <VendorLogo />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/system-settings/mail-server"
        element={
          <ProtectedRoute>
            <MainLayout>
              <MailServerConfiguration />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/system-settings/proxy-server"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ProxyServerConfiguration />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/system-settings/ldap-server"
        element={
          <ProtectedRoute>
            <MainLayout>
              <LDAPServerConfiguration />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/system-settings/risk-score"
        element={
          <ProtectedRoute>
            <MainLayout>
              <RiskScoreSettings />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/system-settings/remote-desktop"
        element={
          <ProtectedRoute>
            <MainLayout>
              <RemoteDesktopSettings />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/system-settings/server-settings"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ServerSettings />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/system-settings"
        element={<Navigate to="/settings/system-settings/branding" replace />}
      />
      <Route
        path="/settings/vulnerability-preference"
        element={
          <ProtectedRoute>
            <MainLayout>
              <VulnerabilityPreference />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/market-place"
        element={
          <ProtectedRoute>
            <MainLayout>
              <MarketPlace />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/agent-management/approvals"
        element={
          <ProtectedRoute>
            <MainLayout>
              <AgentApprovals />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/agent-management/approval-settings"
        element={
          <ProtectedRoute>
            <MainLayout>
              <AgentApprovalSettings />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/agent-management/versions"
        element={
          <ProtectedRoute>
            <MainLayout>
              <AgentVersions />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/agent-management/configuration"
        element={
          <ProtectedRoute>
            <MainLayout>
              <AgentConfiguration />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/agent-management/enroll-secret"
        element={
          <ProtectedRoute>
            <MainLayout>
              <EnrollSecret />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/agent-management/red-hat-nomination"
        element={
          <ProtectedRoute>
            <MainLayout>
              <RedHatAgentNomination />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/agent-management"
        element={<Navigate to="/settings/agent-management/approval-settings" replace />}
      />
      <Route
        path="/settings/jobs"
        element={
          <ProtectedRoute>
            <MainLayout>
              <DeploymentPolicies />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/patch-management/computer-groups"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ComputerGroups />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/patch-management/patch-preferences"
        element={
          <ProtectedRoute>
            <MainLayout>
              <PatchPreferences />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/patch-management/distribution-server"
        element={
          <ProtectedRoute>
            <MainLayout>
              <DistributionServer />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/patch-management"
        element={
          <ProtectedRoute>
            <MainLayout>
              <PatchManagement />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/policy-management"
        element={
          <ProtectedRoute>
            <MainLayout>
              <PolicyManagement />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/audit"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Audit />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/platform-license"
        element={
          <ProtectedRoute>
            <MainLayout>
              <PlatformLicense />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={<Navigate to="/settings/user-management/organization" replace />}
      />

      {/* Default route */}
      <Route path="/" element={<Navigate to="/login" replace />} />
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
    },
  },
});

function App() {
  return (
    <RootErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: '#1890ff',
              borderRadius: 8,
              // Space tokens (8px grid system)
              marginXS: 4,      // --space-1
              marginSM: 8,      // --space-2
              margin: 12,       // --space-3
              marginMD: 16,     // --space-4
              marginLG: 24,     // --space-6
              marginXL: 32,     // --space-8
              marginXXL: 48,    // --space-12
              padding: 16,      // default padding
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
    </RootErrorBoundary>
  );
}

export default App;
