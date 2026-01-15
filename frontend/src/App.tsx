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

// Jobs
import { SoftwareJobs } from './pages/jobs/SoftwareJobs';
import { ConfigurationJobs } from './pages/jobs/ConfigurationJobs';
import { PatchJobs } from './pages/jobs/PatchJobs';
import { VulnerabilityJobs } from './pages/jobs/VulnerabilityJobs';

// Settings
import { BranchLocation } from './pages/settings/BranchLocation';
import { UserManagement } from './pages/settings/UserManagement';
import { Policies } from './pages/settings/Policies';

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

      {/* Jobs */}
      <Route
        path="/jobs/software-jobs/*"
        element={
          <ProtectedRoute>
            <MainLayout>
              <SoftwareJobs />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/jobs/configuration-jobs"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ConfigurationJobs />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/jobs/patch-jobs"
        element={
          <ProtectedRoute>
            <MainLayout>
              <PatchJobs />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/jobs/vulnerability-jobs"
        element={
          <ProtectedRoute>
            <MainLayout>
              <VulnerabilityJobs />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/jobs"
        element={<Navigate to="/jobs/software-jobs/catalog" replace />}
      />

      {/* Settings */}
      <Route
        path="/settings/branch-location"
        element={
          <ProtectedRoute>
            <MainLayout>
              <BranchLocation />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/user-management"
        element={
          <ProtectedRoute>
            <MainLayout>
              <UserManagement />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/policies"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Policies />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={<Navigate to="/settings/branch-location" replace />}
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
