import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { ForgotPassword } from './pages/ForgotPassword';
import { UserOnboarding } from './pages/UserOnboarding';
import { Dashboard } from './pages/Dashboard';
import { Reports } from './pages/Reports';
import { CreateReport } from './pages/reports/CreateReport';
import { MainLayout } from './components/MainLayout';

// Patches
import { AllPatches } from './pages/patches/AllPatches';
import { PatchDetails } from './pages/patches/PatchDetails';
import { PatchDeployed } from './pages/patches/PatchDeployed';
import { PatchTestApprove } from './pages/patches/PatchTestApprove';
import { ZeroTouchDeployment } from './pages/patches/ZeroTouchDeployment';

// Assets
import { AllAssets } from './pages/assets/AllAssets';
import { AssetDetails } from './pages/assets/components/AssetDetails';
import { SoftwareInventory } from './pages/assets/SoftwareInventory';
import { SoftwareLicense } from './pages/assets/SoftwareLicense';
import { OSLicenses } from './pages/assets/OSLicenses';

// Vulnerabilities
import { EndpointsVulnerabilities, NetworkVulnerabilities } from './pages/vulnerabilities';

// Discovery
import { IPDiscovery } from './pages/discovery/IPDiscovery';
import { DeviceCredentials } from './pages/discovery/DeviceCredentials';
import { Agents } from './pages/discovery/Agents';

// Settings
import { Organization } from './pages/settings/Organization';
import { Department } from './pages/settings/Department';
import { UserLocation } from './pages/settings/UserLocation';
import { UserRoles } from './pages/settings/UserRoles';
import { RolesAndPrivileges } from './pages/settings/RolesAndPrivileges';
import { Users } from './pages/settings/Users';
import { PasswordPolicies } from './pages/settings/PasswordPolicies';
import { SystemSettings } from './pages/settings/SystemSettings';
import { VulnerabilityPreference } from './pages/settings/VulnerabilityPreference';
import { MarketPlace } from './pages/settings/MarketPlace';
import { AgentManagement } from './pages/settings/AgentManagement';
import { AgentApprovals } from './pages/settings/AgentApprovals';
import { AgentApprovalSettings } from './pages/settings/AgentApprovalSettings';
import { AgentVersions } from './pages/settings/AgentVersions';
import { AgentConfiguration } from './pages/settings/AgentConfiguration';
import { EnrollSecret } from './pages/settings/EnrollSecret';
import { RedHatAgentNomination } from './pages/settings/RedHatAgentNomination';
import { DeploymentPolicies } from './pages/settings/DeploymentPolicies';
import { PatchManagement } from './pages/settings/PatchManagement';
import { PolicyManagement } from './pages/settings/PolicyManagement';
import { Audit } from './pages/settings/Audit';
import { PlatformLicense } from './pages/settings/PlatformLicense';
import { Branding } from './pages/settings/Branding';
import { VendorLogo } from './pages/settings/VendorLogo';
import { MailServerConfiguration } from './pages/settings/MailServerConfiguration';
import { ProxyServerConfiguration } from './pages/settings/ProxyServerConfiguration';
import { LDAPServerConfiguration } from './pages/settings/LDAPServerConfiguration';
import { RiskScoreSettings } from './pages/settings/RiskScoreSettings';
import { RemoteDesktopSettings } from './pages/settings/RemoteDesktopSettings';
import { ServerSettings } from './pages/settings/ServerSettings';
import { ComputerGroups } from './pages/settings/ComputerGroups';
import { PatchPreferences } from './pages/settings/PatchPreferences';
import { DistributionServer } from './pages/settings/DistributionServer';

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
        path="/patches/deployed"
        element={
          <ProtectedRoute>
            <MainLayout>
              <PatchDeployed />
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
      <Route
        path="/assets/os-license"
        element={
          <ProtectedRoute>
            <MainLayout>
              <OSLicenses />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Vulnerabilities */}
      <Route
        path="/vulnerabilities"
        element={
          <ProtectedRoute>
            <MainLayout>
              <EndpointsVulnerabilities />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/vulnerabilities/endpoints"
        element={
          <ProtectedRoute>
            <MainLayout>
              <EndpointsVulnerabilities />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/vulnerabilities/network"
        element={
          <ProtectedRoute>
            <MainLayout>
              <NetworkVulnerabilities />
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
        path="/settings/user-management/department"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Department />
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

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 8,
        },
      }}
    >
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
