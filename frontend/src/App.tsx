import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ConfigProvider, App as AntApp } from 'antd';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/MainLayout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AllAssets } from './pages/assets/AllAssets';
import { AssetDetails } from './pages/assets/components/AssetDetails';
import { SoftwareInventory } from './pages/assets/SoftwareInventory';
import { SoftwareLicense } from './pages/assets/SoftwareLicense';
import { Dashboard } from './pages/Dashboard';
import { Agents } from './pages/discovery/Agents';
import { DeviceCredentials } from './pages/discovery/DeviceCredentials';
import { IPDiscovery } from './pages/discovery/IPDiscovery';
import { ForgotPassword } from './pages/ForgotPassword';
import { Hub } from './pages/hub/Hub';
import { PatchJobs } from './pages/jobs/PatchJobs';
import { PatchJobsDeployed } from './pages/jobs/PatchJobsDeployed';
import { VulnerabilityJobs } from './pages/jobs/VulnerabilityJobs';
import { Login } from './pages/Login';
import { Notifications } from './pages/Notifications';
import { AllPatches } from './pages/patches/AllPatches';
import { PatchDetails } from './pages/patches/PatchDetails';
import PatchRecommendations from './pages/patches/PatchRecommendations';
import { PatchTestApprove } from './pages/patches/PatchTestApprove';
import { ZeroTouchDeployment } from './pages/patches/ZeroTouchDeployment';
import { Reports } from './pages/Reports';
import { CreateReport } from './pages/reports/CreateReport';
import { AgentApprovals } from './pages/settings/AgentApprovals';
import { AgentApprovalSettings } from './pages/settings/AgentApprovalSettings';
import { AgentConfiguration } from './pages/settings/AgentConfiguration';
import { AgentVersions } from './pages/settings/AgentVersions';
import { Audit } from './pages/settings/Audit';
import { Branding } from './pages/settings/Branding';
import { ComputerGroups } from './pages/settings/ComputerGroups';
import { DeploymentPolicies } from './pages/settings/DeploymentPolicies';
import { DistributionServer } from './pages/settings/DistributionServer';
import { EnrollSecret } from './pages/settings/EnrollSecret';
import { LDAPServerConfiguration } from './pages/settings/LDAPServerConfiguration';
import { MailServerConfiguration } from './pages/settings/MailServerConfiguration';
import { MarketPlace } from './pages/settings/MarketPlace';
import { NotificationPreferences } from './pages/settings/NotificationPreferences';
import { Organization } from './pages/settings/Organization';
import { PasswordPolicies } from './pages/settings/PasswordPolicies';
import { PatchManagement } from './pages/settings/PatchManagement';
import { PatchPreferences } from './pages/settings/PatchPreferences';
import { PlatformLicense } from './pages/settings/PlatformLicense';
import { PolicyManagement } from './pages/settings/PolicyManagement';
import { ProxyServerConfiguration } from './pages/settings/ProxyServerConfiguration';
import { RedHatAgentNomination } from './pages/settings/RedHatAgentNomination';
import { RemoteDesktopSettings } from './pages/settings/RemoteDesktopSettings';
import { RiskScoreSettings } from './pages/settings/RiskScoreSettings';
import { RolesAndPrivileges } from './pages/settings/RolesAndPrivileges';
import { ServerSettings } from './pages/settings/ServerSettings';
import { UserLocation } from './pages/settings/UserLocation';
import { UserRoles } from './pages/settings/UserRoles';
import { Users } from './pages/settings/Users';
import { VendorLogo } from './pages/settings/VendorLogo';
import { VulnerabilityPreference } from './pages/settings/VulnerabilityPreference';
import { UserOnboarding } from './pages/UserOnboarding';
import { ManageException } from './pages/vulnerability/ManageException';
import { Vulnerabilities } from './pages/vulnerability/Vulnerabilities';
import { ZeroDayVulnerabilities } from './pages/vulnerability/ZeroDayVulnerabilities';

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

function AppRoutes() {
  return (
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
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#1890ff',
            borderRadius: 8,
          },
        }}
      >
        <AntApp>
          <BrowserRouter>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </BrowserRouter>
        </AntApp>
      </ConfigProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
