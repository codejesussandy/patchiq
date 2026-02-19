import { lazy } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../components/MainLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';

// User Management
const Organization = lazy(() => import('../pages/settings/Organization').then(m => ({ default: m.Organization })));
const UserLocation = lazy(() => import('../pages/settings/UserLocation').then(m => ({ default: m.UserLocation })));
const UserRoles = lazy(() => import('../pages/settings/UserRoles').then(m => ({ default: m.UserRoles })));
const RolesAndPrivileges = lazy(() => import('../pages/settings/RolesAndPrivileges').then(m => ({ default: m.RolesAndPrivileges })));
const Users = lazy(() => import('../pages/settings/Users').then(m => ({ default: m.Users })));
const PasswordPolicies = lazy(() => import('../pages/settings/PasswordPolicies').then(m => ({ default: m.PasswordPolicies })));

// System
const Branding = lazy(() => import('../pages/settings/Branding').then(m => ({ default: m.Branding })));
const VendorLogo = lazy(() => import('../pages/settings/VendorLogo').then(m => ({ default: m.VendorLogo })));
const MailServerConfiguration = lazy(() => import('../pages/settings/MailServerConfiguration').then(m => ({ default: m.MailServerConfiguration })));
const ProxyServerConfiguration = lazy(() => import('../pages/settings/ProxyServerConfiguration').then(m => ({ default: m.ProxyServerConfiguration })));
const LDAPServerConfiguration = lazy(() => import('../pages/settings/LDAPServerConfiguration').then(m => ({ default: m.LDAPServerConfiguration })));
const RiskScoreSettings = lazy(() => import('../pages/settings/RiskScoreSettings').then(m => ({ default: m.RiskScoreSettings })));
const RemoteDesktopSettings = lazy(() => import('../pages/settings/RemoteDesktopSettings').then(m => ({ default: m.RemoteDesktopSettings })));
const ServerSettings = lazy(() => import('../pages/settings/ServerSettings').then(m => ({ default: m.ServerSettings })));

// Agent Management
const AgentApprovals = lazy(() => import('../pages/settings/AgentApprovals').then(m => ({ default: m.AgentApprovals })));
const AgentApprovalSettings = lazy(() => import('../pages/settings/AgentApprovalSettings').then(m => ({ default: m.AgentApprovalSettings })));
const AgentVersions = lazy(() => import('../pages/settings/AgentVersions').then(m => ({ default: m.AgentVersions })));
const AgentConfiguration = lazy(() => import('../pages/settings/AgentConfiguration').then(m => ({ default: m.AgentConfiguration })));
const EnrollSecret = lazy(() => import('../pages/settings/EnrollSecret').then(m => ({ default: m.EnrollSecret })));
const RedHatAgentNomination = lazy(() => import('../pages/settings/RedHatAgentNomination').then(m => ({ default: m.RedHatAgentNomination })));

// Patch & Policy
const DeploymentPolicies = lazy(() => import('../pages/settings/DeploymentPolicies').then(m => ({ default: m.DeploymentPolicies })));
const ComputerGroups = lazy(() => import('../pages/settings/ComputerGroups').then(m => ({ default: m.ComputerGroups })));
const PatchPreferences = lazy(() => import('../pages/settings/PatchPreferences').then(m => ({ default: m.PatchPreferences })));
const DistributionServer = lazy(() => import('../pages/settings/DistributionServer').then(m => ({ default: m.DistributionServer })));
const PatchManagement = lazy(() => import('../pages/settings/PatchManagement').then(m => ({ default: m.PatchManagement })));
const PolicyManagement = lazy(() => import('../pages/settings/PolicyManagement').then(m => ({ default: m.PolicyManagement })));

// Other
const NotificationPreferences = lazy(() => import('../pages/settings/NotificationPreferences').then(m => ({ default: m.NotificationPreferences })));
const VulnerabilityPreference = lazy(() => import('../pages/settings/VulnerabilityPreference').then(m => ({ default: m.VulnerabilityPreference })));
const MarketPlace = lazy(() => import('../pages/settings/MarketPlace').then(m => ({ default: m.MarketPlace })));
const Audit = lazy(() => import('../pages/settings/Audit').then(m => ({ default: m.Audit })));
const PlatformLicense = lazy(() => import('../pages/settings/PlatformLicense').then(m => ({ default: m.PlatformLicense })));

export const settingsRoutes = (
  <>
    <Route path="/settings/notification-preferences" element={<ProtectedRoute><MainLayout><NotificationPreferences /></MainLayout></ProtectedRoute>} />

    {/* User Management */}
    <Route path="/settings/user-management/organization" element={<ProtectedRoute><MainLayout><Organization /></MainLayout></ProtectedRoute>} />
    <Route path="/settings/user-management/location" element={<ProtectedRoute><MainLayout><UserLocation /></MainLayout></ProtectedRoute>} />
    <Route path="/settings/user-management/user-roles" element={<ProtectedRoute><MainLayout><UserRoles /></MainLayout></ProtectedRoute>} />
    <Route path="/settings/user-management/roles" element={<ProtectedRoute><MainLayout><RolesAndPrivileges /></MainLayout></ProtectedRoute>} />
    <Route path="/settings/user-management/users" element={<ProtectedRoute><MainLayout><Users /></MainLayout></ProtectedRoute>} />
    <Route path="/settings/user-management/password-policies" element={<ProtectedRoute><MainLayout><PasswordPolicies /></MainLayout></ProtectedRoute>} />
    <Route path="/settings/user-management" element={<Navigate to="/settings/user-management/organization" replace />} />

    {/* System Settings */}
    <Route path="/settings/system-settings/branding" element={<ProtectedRoute><MainLayout><Branding /></MainLayout></ProtectedRoute>} />
    <Route path="/settings/system-settings/vendor-logo" element={<ProtectedRoute><MainLayout><VendorLogo /></MainLayout></ProtectedRoute>} />
    <Route path="/settings/system-settings/mail-server" element={<ProtectedRoute><MainLayout><MailServerConfiguration /></MainLayout></ProtectedRoute>} />
    <Route path="/settings/system-settings/proxy-server" element={<ProtectedRoute><MainLayout><ProxyServerConfiguration /></MainLayout></ProtectedRoute>} />
    <Route path="/settings/system-settings/ldap-server" element={<ProtectedRoute><MainLayout><LDAPServerConfiguration /></MainLayout></ProtectedRoute>} />
    <Route path="/settings/system-settings/risk-score" element={<ProtectedRoute><MainLayout><RiskScoreSettings /></MainLayout></ProtectedRoute>} />
    <Route path="/settings/system-settings/remote-desktop" element={<ProtectedRoute><MainLayout><RemoteDesktopSettings /></MainLayout></ProtectedRoute>} />
    <Route path="/settings/system-settings/server-settings" element={<ProtectedRoute><MainLayout><ServerSettings /></MainLayout></ProtectedRoute>} />
    <Route path="/settings/system-settings" element={<Navigate to="/settings/system-settings/branding" replace />} />

    {/* Vulnerability Preference */}
    <Route path="/settings/vulnerability-preference" element={<ProtectedRoute><MainLayout><VulnerabilityPreference /></MainLayout></ProtectedRoute>} />
    <Route path="/settings/market-place" element={<ProtectedRoute><MainLayout><MarketPlace /></MainLayout></ProtectedRoute>} />

    {/* Agent Management */}
    <Route path="/settings/agent-management/approvals" element={<ProtectedRoute><MainLayout><AgentApprovals /></MainLayout></ProtectedRoute>} />
    <Route path="/settings/agent-management/approval-settings" element={<ProtectedRoute><MainLayout><AgentApprovalSettings /></MainLayout></ProtectedRoute>} />
    <Route path="/settings/agent-management/versions" element={<ProtectedRoute><MainLayout><AgentVersions /></MainLayout></ProtectedRoute>} />
    <Route path="/settings/agent-management/configuration" element={<ProtectedRoute><MainLayout><AgentConfiguration /></MainLayout></ProtectedRoute>} />
    <Route path="/settings/agent-management/enroll-secret" element={<ProtectedRoute><MainLayout><EnrollSecret /></MainLayout></ProtectedRoute>} />
    <Route path="/settings/agent-management/red-hat-nomination" element={<ProtectedRoute><MainLayout><RedHatAgentNomination /></MainLayout></ProtectedRoute>} />
    <Route path="/settings/agent-management" element={<Navigate to="/settings/agent-management/approval-settings" replace />} />

    {/* Patch & Policy */}
    <Route path="/settings/jobs" element={<ProtectedRoute><MainLayout><DeploymentPolicies /></MainLayout></ProtectedRoute>} />
    <Route path="/settings/patch-management/computer-groups" element={<ProtectedRoute><MainLayout><ComputerGroups /></MainLayout></ProtectedRoute>} />
    <Route path="/settings/patch-management/patch-preferences" element={<ProtectedRoute><MainLayout><PatchPreferences /></MainLayout></ProtectedRoute>} />
    <Route path="/settings/patch-management/distribution-server" element={<ProtectedRoute><MainLayout><DistributionServer /></MainLayout></ProtectedRoute>} />
    <Route path="/settings/patch-management" element={<ProtectedRoute><MainLayout><PatchManagement /></MainLayout></ProtectedRoute>} />
    <Route path="/settings/policy-management" element={<ProtectedRoute><MainLayout><PolicyManagement /></MainLayout></ProtectedRoute>} />

    {/* Other */}
    <Route path="/settings/audit" element={<ProtectedRoute><MainLayout><Audit /></MainLayout></ProtectedRoute>} />
    <Route path="/settings/platform-license" element={<ProtectedRoute><MainLayout><PlatformLicense /></MainLayout></ProtectedRoute>} />
    <Route path="/settings" element={<Navigate to="/settings/user-management/organization" replace />} />
  </>
);
