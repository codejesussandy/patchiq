import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { ForgotPassword } from './pages/ForgotPassword';
import { UserOnboarding } from './pages/UserOnboarding';
import { Dashboard } from './pages/Dashboard';
import { Reports } from './pages/Reports';
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

// Discovery
import { IPDiscovery } from './pages/discovery/IPDiscovery';
import { DeviceCredentials } from './pages/discovery/DeviceCredentials';
import { Agents } from './pages/discovery/Agents';

// Settings
import { Organization } from './pages/settings/Organization';
import { Department } from './pages/settings/Department';
import { UserLocation } from './pages/settings/UserLocation';
import { RolesAndPrivileges } from './pages/settings/RolesAndPrivileges';
import { Users } from './pages/settings/Users';
import { PasswordPolicies } from './pages/settings/PasswordPolicies';
import { SystemSettings } from './pages/settings/SystemSettings';
import { VulnerabilityPreference } from './pages/settings/VulnerabilityPreference';
import { MarketPlace } from './pages/settings/MarketPlace';
import { AgentManagement } from './pages/settings/AgentManagement';
import { DeploymentPolicies } from './pages/settings/DeploymentPolicies';
import { PatchManagement } from './pages/settings/PatchManagement';
import { PolicyManagement } from './pages/settings/PolicyManagement';
import { Audit } from './pages/settings/Audit';
import { PlatformLicense } from './pages/settings/PlatformLicense';

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
        element={<Navigate to="/discovery/agents" replace />}
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
        path="/settings/system-settings"
        element={
          <ProtectedRoute>
            <MainLayout>
              <SystemSettings />
            </MainLayout>
          </ProtectedRoute>
        }
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
        path="/settings/agent-management"
        element={
          <ProtectedRoute>
            <MainLayout>
              <AgentManagement />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/deployment-policies"
        element={
          <ProtectedRoute>
            <MainLayout>
              <DeploymentPolicies />
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
