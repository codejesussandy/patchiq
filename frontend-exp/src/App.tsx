import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AppLayout } from "@/components/layout"
import {
  Dashboard,
  Login,
  Vulnerabilities,
  PlaceholderPage,
  Reports,
  AllPatches,
  DeployedPatches,
  TestApprove,
  ZeroTouch,
  AllAssets,
  SoftwareInventory,
  SoftwareLicenses,
  PatchJobs,
  SoftwareJobs,
  ConfigJobs,
  VulnerabilityJobs,
  Marketplace,
  UserManagement,
  SystemSettings,
  AgentConfig,
  SecuritySettings,
  IPDiscovery,
  DeviceCredentials,
  DiscoveryAgents,
} from "@/pages"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected Routes with Layout */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Patches */}
          <Route path="/patches/all" element={<AllPatches />} />
          <Route path="/patches/deployed" element={<DeployedPatches />} />
          <Route path="/patches/test-approve" element={<TestApprove />} />
          <Route path="/patches/zero-touch" element={<ZeroTouch />} />

          {/* Assets */}
          <Route path="/assets/all" element={<AllAssets />} />
          <Route path="/assets/software" element={<SoftwareInventory />} />
          <Route path="/assets/licenses" element={<SoftwareLicenses />} />

          {/* Vulnerability */}
          <Route path="/vulnerability/zero-day" element={<PlaceholderPage title="Zero Day Vulnerabilities" description="Critical zero-day vulnerability tracking" />} />
          <Route path="/vulnerability/all" element={<Vulnerabilities />} />
          <Route path="/vulnerability/exceptions" element={<PlaceholderPage title="Manage Exceptions" description="Configure vulnerability exceptions and waivers" />} />

          {/* Discovery */}
          <Route path="/discovery/ip" element={<IPDiscovery />} />
          <Route path="/discovery/credentials" element={<DeviceCredentials />} />
          <Route path="/discovery/agents" element={<DiscoveryAgents />} />

          {/* Jobs */}
          <Route path="/jobs/patch" element={<PatchJobs />} />
          <Route path="/jobs/software" element={<SoftwareJobs />} />
          <Route path="/jobs/config" element={<ConfigJobs />} />
          <Route path="/jobs/vulnerability" element={<VulnerabilityJobs />} />

          {/* Reports */}
          <Route path="/reports" element={<Reports />} />

          {/* Settings */}
          <Route path="/settings/users" element={<UserManagement />} />
          <Route path="/settings/system" element={<SystemSettings />} />
          <Route path="/settings/marketplace" element={<Marketplace />} />
          <Route path="/settings/agents" element={<AgentConfig />} />
          <Route path="/settings/security" element={<SecuritySettings />} />
        </Route>

        {/* Redirects */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
