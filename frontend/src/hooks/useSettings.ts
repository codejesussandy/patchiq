import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsService } from '../services/settings.service';
import type {
  BranchFormData,
  UserFormData,
  InviteUserFormData,
  RoleFormData,
  PolicyFormData,
  MailServerConfig,
  ProxyServerConfig,
  LDAPServerFormData,
  RiskScoreFormData,
  RemoteDesktopSettingsFormData,
  ServerSettingsFormData,
  IntegrationFormData,
  AgentApprovalSettingsFormData,
  VulnerabilityPreferenceFormData,
  AgentConfigurationFormData,
  EnrollSecretFormData,
  ComputerGroupFormData,
  PatchPreferenceFormData,
  DeploymentPolicyFormData,
  DistributionServerFormData,
} from '../types/settings.types';

// ============================================
// Query Keys
// ============================================

export const settingsKeys = {
  branches: () => ['settings', 'branches'] as const,
  branch: (id: string) => ['settings', 'branches', id] as const,
  users: () => ['settings', 'users'] as const,
  user: (id: string) => ['settings', 'users', id] as const,
  userAudit: (id: string) => ['settings', 'users', 'audit', id] as const,
  roles: () => ['settings', 'roles'] as const,
  role: (id: string) => ['settings', 'roles', id] as const,
  policies: () => ['settings', 'policies'] as const,
  policy: (id: string) => ['settings', 'policies', id] as const,
  policyAudit: (id: string) => ['settings', 'policies', 'audit', id] as const,
  affectedUsers: (id: string) => ['settings', 'policies', 'affected-users', id] as const,
  organizations: () => ['settings', 'organizations'] as const,
  organization: (id: string) => ['settings', 'organizations', id] as const,
  locations: () => ['settings', 'locations'] as const,
  location: (id: string) => ['settings', 'locations', id] as const,
  departments: () => ['settings', 'departments'] as const,
  department: (id: string) => ['settings', 'departments', id] as const,
  branding: () => ['settings', 'branding'] as const,
  vendorLogos: () => ['settings', 'vendor-logos'] as const,
  vendorLogo: (id: string) => ['settings', 'vendor-logos', id] as const,
  mailServer: () => ['settings', 'mail-server'] as const,
  proxyServer: () => ['settings', 'proxy-server'] as const,
  ldapConfigs: () => ['settings', 'ldap-configs'] as const,
  ldapConfig: (id: string) => ['settings', 'ldap-configs', id] as const,
  riskScore: () => ['settings', 'risk-score'] as const,
  remoteDesktop: () => ['settings', 'remote-desktop'] as const,
  serverSettings: () => ['settings', 'server'] as const,
  integrations: () => ['settings', 'integrations'] as const,
  integration: (id: string) => ['settings', 'integrations', id] as const,
  agentApprovalSettings: () => ['settings', 'agent-approval'] as const,
  vulnerabilityPreference: () => ['settings', 'vulnerability-preference'] as const,
  agentConfiguration: () => ['settings', 'agent-configuration'] as const,
  agentApprovals: () => ['settings', 'agent-approvals'] as const,
  enrollSecrets: () => ['settings', 'enroll-secrets'] as const,
  enrollSecret: (id: string) => ['settings', 'enroll-secrets', id] as const,
  deploymentPolicies: () => ['settings', 'deployment-policies'] as const,
  deploymentPolicy: (id: string) => ['settings', 'deployment-policies', id] as const,
  redHatNominations: () => ['settings', 'red-hat-nominations'] as const,
  redHatNomination: (id: string) => ['settings', 'red-hat-nominations', id] as const,
  computerGroups: () => ['settings', 'computer-groups'] as const,
  computerGroup: (id: string) => ['settings', 'computer-groups', id] as const,
  availableEndpoints: () => ['settings', 'available-endpoints'] as const,
  patchPreference: () => ['settings', 'patch-preferences'] as const,
  auditLogs: () => ['settings', 'audit'] as const,
  auditFilterOptions: () => ['settings', 'audit', 'filter-options'] as const,
  platformLicense: () => ['settings', 'platform-license'] as const,
  distributionServers: () => ['settings', 'distribution-servers'] as const,
  distributionServer: (id: string) => ['settings', 'distribution-servers', id] as const,
};

// ============================================
// Branch Queries & Mutations
// ============================================

export function useBranches() {
  return useQuery({ queryKey: settingsKeys.branches(), queryFn: () => settingsService.getBranches() });
}

export function useBranch(id: string) {
  return useQuery({ queryKey: settingsKeys.branch(id), queryFn: () => settingsService.getBranch(id), enabled: !!id });
}

export function useCreateBranch() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: BranchFormData) => settingsService.createBranch(data), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.branches() }); } });
}

export function useUpdateBranch() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<BranchFormData> }) => settingsService.updateBranch(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.branches() }); } });
}

export function useDeleteBranch() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => settingsService.deleteBranch(id), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.branches() }); } });
}

// ============================================
// User Queries & Mutations
// ============================================

export function useUsers() {
  return useQuery({ queryKey: settingsKeys.users(), queryFn: () => settingsService.getUsers() });
}

export function useUser(id: string) {
  return useQuery({ queryKey: settingsKeys.user(id), queryFn: () => settingsService.getUser(id), enabled: !!id });
}

export function useUserAuditLog(id: string) {
  return useQuery({ queryKey: settingsKeys.userAudit(id), queryFn: () => settingsService.getAuditLog(id), enabled: !!id });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: UserFormData) => settingsService.createUser(data), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.users() }); } });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<UserFormData> }) => settingsService.updateUser(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.users() }); } });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => settingsService.deleteUser(id), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.users() }); } });
}

export function useInviteUser() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: InviteUserFormData) => settingsService.inviteUser(data), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.users() }); } });
}

export function useResetPassword() {
  return useMutation({ mutationFn: (id: string) => settingsService.resetPassword(id) });
}

export function useSuspendUser() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => settingsService.suspendUser(id), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.users() }); } });
}

// ============================================
// Role Queries & Mutations
// ============================================

export function useRoles() {
  return useQuery({ queryKey: settingsKeys.roles(), queryFn: () => settingsService.getRoles() });
}

export function useRole(id: string) {
  return useQuery({ queryKey: settingsKeys.role(id), queryFn: () => settingsService.getRole(id), enabled: !!id });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: RoleFormData) => settingsService.createRole(data), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.roles() }); } });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<RoleFormData> }) => settingsService.updateRole(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.roles() }); } });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => settingsService.deleteRole(id), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.roles() }); } });
}

// ============================================
// Alert Policy Queries & Mutations
// ============================================

export function useAlertPolicies() {
  return useQuery({ queryKey: settingsKeys.policies(), queryFn: () => settingsService.getPolicies() });
}

export function useAlertPolicy(id: string) {
  return useQuery({ queryKey: settingsKeys.policy(id), queryFn: () => settingsService.getPolicy(id), enabled: !!id });
}

export function useAlertPolicyAudit(id: string) {
  return useQuery({ queryKey: settingsKeys.policyAudit(id), queryFn: () => settingsService.getPolicyAudit(id), enabled: !!id });
}

export function useAffectedUsers(policyId: string) {
  return useQuery({ queryKey: settingsKeys.affectedUsers(policyId), queryFn: () => settingsService.getAffectedUsers(policyId), enabled: !!policyId });
}

export function useCreateAlertPolicy() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: PolicyFormData) => settingsService.createPolicy(data), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.policies() }); } });
}

export function useUpdateAlertPolicy() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<PolicyFormData> }) => settingsService.updatePolicy(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.policies() }); } });
}

export function useDeleteAlertPolicy() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => settingsService.deletePolicy(id), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.policies() }); } });
}

export function useCloneAlertPolicy() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => settingsService.clonePolicy(id), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.policies() }); } });
}

export function useDisableAlertPolicy() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => settingsService.disablePolicy(id), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.policies() }); } });
}

// ============================================
// Organization Queries & Mutations
// ============================================

export function useOrganizations() {
  return useQuery({ queryKey: settingsKeys.organizations(), queryFn: () => settingsService.getOrganizations() });
}

export function useOrganization(id: string) {
  return useQuery({ queryKey: settingsKeys.organization(id), queryFn: () => settingsService.getOrganization(id), enabled: !!id });
}

export function useCreateOrganization() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: Record<string, unknown>) => settingsService.createOrganization(data), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.organizations() }); } });
}

export function useUpdateOrganization() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => settingsService.updateOrganization(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.organizations() }); } });
}

export function useDeleteOrganization() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => settingsService.deleteOrganization(id), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.organizations() }); } });
}

// ============================================
// Location Queries & Mutations
// ============================================

export function useLocations() {
  return useQuery({ queryKey: settingsKeys.locations(), queryFn: () => settingsService.getLocations() });
}

export function useCreateLocation() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: Record<string, unknown>) => settingsService.createLocation(data), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.locations() }); } });
}

export function useUpdateLocation() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => settingsService.updateLocation(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.locations() }); } });
}

export function useDeleteLocation() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => settingsService.deleteLocation(id), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.locations() }); } });
}

// ============================================
// Department Queries & Mutations
// ============================================

export function useDepartments() {
  return useQuery({ queryKey: settingsKeys.departments(), queryFn: () => settingsService.getDepartments() });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: Record<string, unknown>) => settingsService.createDepartment(data), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.departments() }); } });
}

export function useUpdateDepartment() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => settingsService.updateDepartment(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.departments() }); } });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => settingsService.deleteDepartment(id), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.departments() }); } });
}

// ============================================
// Branding & Vendor Logo
// ============================================

export function useBrandingSettings() {
  return useQuery({ queryKey: settingsKeys.branding(), queryFn: () => settingsService.getBrandingSettings() });
}

export function useUpdateBranding() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: FormData) => settingsService.updateBrandingSettings(data), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.branding() }); } });
}

export function useVendorLogos() {
  return useQuery({ queryKey: settingsKeys.vendorLogos(), queryFn: () => settingsService.getVendorLogos() });
}

export function useCreateVendorLogo() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: FormData) => settingsService.createVendorLogo(data), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.vendorLogos() }); } });
}

export function useUpdateVendorLogo() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: FormData }) => settingsService.updateVendorLogo(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.vendorLogos() }); } });
}

export function useDeleteVendorLogo() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => settingsService.deleteVendorLogo(id), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.vendorLogos() }); } });
}

// ============================================
// Mail Server
// ============================================

export function useMailServerConfig() {
  return useQuery({ queryKey: settingsKeys.mailServer(), queryFn: () => settingsService.getMailServerConfig() });
}

export function useUpdateMailServerConfig() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: MailServerConfig) => settingsService.updateMailServerConfig(data), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.mailServer() }); } });
}

export function useTestMailServerConfig() {
  return useMutation({ mutationFn: (data: MailServerConfig) => settingsService.testMailServerConfig(data) });
}

// ============================================
// Proxy Server
// ============================================

export function useProxyServerConfig() {
  return useQuery({ queryKey: settingsKeys.proxyServer(), queryFn: () => settingsService.getProxyServerConfig() });
}

export function useUpdateProxyServerConfig() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: ProxyServerConfig) => settingsService.updateProxyServerConfig(data), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.proxyServer() }); } });
}

export function useTestProxyServerConfig() {
  return useMutation({ mutationFn: (data: ProxyServerConfig) => settingsService.testProxyServerConfig(data) });
}

// ============================================
// LDAP Server
// ============================================

export function useLDAPServerConfigs() {
  return useQuery({ queryKey: settingsKeys.ldapConfigs(), queryFn: () => settingsService.getLDAPServerConfigs() });
}

export function useLDAPServerConfig(id: string) {
  return useQuery({ queryKey: settingsKeys.ldapConfig(id), queryFn: () => settingsService.getLDAPServerConfig(id), enabled: !!id });
}

export function useCreateLDAPServerConfig() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: LDAPServerFormData) => settingsService.createLDAPServerConfig(data), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.ldapConfigs() }); } });
}

export function useUpdateLDAPServerConfig() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<LDAPServerFormData> }) => settingsService.updateLDAPServerConfig(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.ldapConfigs() }); } });
}

export function useDeleteLDAPServerConfig() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => settingsService.deleteLDAPServerConfig(id), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.ldapConfigs() }); } });
}

export function useTestLDAPServerConfig() {
  return useMutation({ mutationFn: (id: string) => settingsService.testLDAPServerConfig(id) });
}

// ============================================
// Risk Score
// ============================================

export function useRiskScore() {
  return useQuery({ queryKey: settingsKeys.riskScore(), queryFn: () => settingsService.getRiskScore() });
}

export function useUpdateRiskScore() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: RiskScoreFormData) => settingsService.updateRiskScore(data), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.riskScore() }); } });
}

// ============================================
// Remote Desktop
// ============================================

export function useRemoteDesktopSettings() {
  return useQuery({ queryKey: settingsKeys.remoteDesktop(), queryFn: () => settingsService.getRemoteDesktopSettings() });
}

export function useUpdateRemoteDesktopSettings() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: RemoteDesktopSettingsFormData) => settingsService.updateRemoteDesktopSettings(data), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.remoteDesktop() }); } });
}

export function useResetRemoteDesktopSettings() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => settingsService.resetRemoteDesktopSettings(), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.remoteDesktop() }); } });
}

// ============================================
// Server Settings
// ============================================

export function useServerSettings() {
  return useQuery({ queryKey: settingsKeys.serverSettings(), queryFn: () => settingsService.getServerSettings() });
}

export function useUpdateServerSettings() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: ServerSettingsFormData) => settingsService.updateServerSettings(data), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.serverSettings() }); } });
}

// ============================================
// Integrations (Marketplace)
// ============================================

export function useIntegrations() {
  return useQuery({ queryKey: settingsKeys.integrations(), queryFn: () => settingsService.getIntegrations() });
}

export function useIntegration(id: string) {
  return useQuery({ queryKey: settingsKeys.integration(id), queryFn: () => settingsService.getIntegration(id), enabled: !!id });
}

export function useCreateIntegration() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: IntegrationFormData) => settingsService.createIntegration(data), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.integrations() }); } });
}

export function useUpdateIntegration() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<IntegrationFormData> }) => settingsService.updateIntegration(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.integrations() }); } });
}

export function useToggleIntegrationStatus() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, status }: { id: string; status: boolean }) => settingsService.toggleIntegrationStatus(id, status), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.integrations() }); } });
}

export function useDeleteIntegration() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => settingsService.deleteIntegration(id), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.integrations() }); } });
}

// ============================================
// Agent Approval Settings
// ============================================

export function useAgentApprovalSettings() {
  return useQuery({ queryKey: settingsKeys.agentApprovalSettings(), queryFn: () => settingsService.getAgentApprovalSettings() });
}

export function useUpdateAgentApprovalSettings() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: AgentApprovalSettingsFormData) => settingsService.updateAgentApprovalSettings(data), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.agentApprovalSettings() }); } });
}

// ============================================
// Vulnerability Preference
// ============================================

export function useVulnerabilityPreference() {
  return useQuery({ queryKey: settingsKeys.vulnerabilityPreference(), queryFn: () => settingsService.getVulnerabilityPreference() });
}

export function useUpdateVulnerabilityPreference() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: VulnerabilityPreferenceFormData) => settingsService.updateVulnerabilityPreference(data), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.vulnerabilityPreference() }); } });
}

export function useSyncVulnerabilityDatabase() {
  return useMutation({ mutationFn: () => settingsService.syncVulnerabilityDatabase() });
}

// ============================================
// Agent Configuration
// ============================================

export function useAgentConfiguration() {
  return useQuery({ queryKey: settingsKeys.agentConfiguration(), queryFn: () => settingsService.getAgentConfiguration() });
}

export function useUpdateAgentConfiguration() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: AgentConfigurationFormData) => settingsService.updateAgentConfiguration(data), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.agentConfiguration() }); } });
}

// ============================================
// Agent Approvals
// ============================================

export function useAgentApprovals() {
  return useQuery({ queryKey: settingsKeys.agentApprovals(), queryFn: () => settingsService.getAgentApprovals() });
}

export function useApproveAgent() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => settingsService.approveAgent(id), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.agentApprovals() }); } });
}

export function useRejectAgent() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => settingsService.rejectAgent(id), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.agentApprovals() }); } });
}

// ============================================
// Enroll Secrets
// ============================================

export function useEnrollSecrets() {
  return useQuery({ queryKey: settingsKeys.enrollSecrets(), queryFn: () => settingsService.getEnrollSecrets() });
}

export function useEnrollSecret(id: string) {
  return useQuery({ queryKey: settingsKeys.enrollSecret(id), queryFn: () => settingsService.getEnrollSecret(id), enabled: !!id });
}

export function useCreateEnrollSecret() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: EnrollSecretFormData) => settingsService.createEnrollSecret(data), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.enrollSecrets() }); } });
}

export function useUpdateEnrollSecret() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<EnrollSecretFormData> }) => settingsService.updateEnrollSecret(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.enrollSecrets() }); } });
}

export function useDeleteEnrollSecret() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => settingsService.deleteEnrollSecret(id), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.enrollSecrets() }); } });
}

// ============================================
// Settings Deployment Policies
// ============================================

export function useSettingsDeploymentPolicies() {
  return useQuery({ queryKey: settingsKeys.deploymentPolicies(), queryFn: () => settingsService.getDeploymentPolicies() });
}

export function useSettingsDeploymentPolicy(id: string) {
  return useQuery({ queryKey: settingsKeys.deploymentPolicy(id), queryFn: () => settingsService.getDeploymentPolicy(id), enabled: !!id });
}

export function useCreateSettingsDeploymentPolicy() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: DeploymentPolicyFormData) => settingsService.createDeploymentPolicy(data), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.deploymentPolicies() }); } });
}

export function useUpdateSettingsDeploymentPolicy() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<DeploymentPolicyFormData> }) => settingsService.updateDeploymentPolicy(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.deploymentPolicies() }); } });
}

export function useDeleteSettingsDeploymentPolicy() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => settingsService.deleteDeploymentPolicy(id), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.deploymentPolicies() }); } });
}

// ============================================
// Red Hat Agent Nominations
// ============================================

export function useRedHatAgentNominations() {
  return useQuery({ queryKey: settingsKeys.redHatNominations(), queryFn: () => settingsService.getRedHatAgentNominations() });
}

export function useUpdateRedHatAgentNomination() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<import('../types/settings.types').RedHatAgentNomination> }) => settingsService.updateRedHatAgentNomination(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.redHatNominations() }); } });
}

// ============================================
// Computer Groups
// ============================================

export function useComputerGroups() {
  return useQuery({ queryKey: settingsKeys.computerGroups(), queryFn: () => settingsService.getComputerGroups() });
}

export function useComputerGroup(id: string) {
  return useQuery({ queryKey: settingsKeys.computerGroup(id), queryFn: () => settingsService.getComputerGroup(id), enabled: !!id });
}

export function useAvailableEndpoints() {
  return useQuery({ queryKey: settingsKeys.availableEndpoints(), queryFn: () => settingsService.getAvailableEndpoints() });
}

export function useCreateComputerGroup() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: ComputerGroupFormData) => settingsService.createComputerGroup(data), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.computerGroups() }); } });
}

export function useUpdateComputerGroup() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<ComputerGroupFormData> }) => settingsService.updateComputerGroup(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.computerGroups() }); } });
}

export function useDeleteComputerGroup() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => settingsService.deleteComputerGroup(id), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.computerGroups() }); } });
}

// ============================================
// Patch Preferences
// ============================================

export function usePatchPreference() {
  return useQuery({ queryKey: settingsKeys.patchPreference(), queryFn: () => settingsService.getPatchPreference() });
}

export function useUpdatePatchPreference() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: PatchPreferenceFormData) => settingsService.updatePatchPreference(data), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.patchPreference() }); } });
}

export function useSyncPatchNow() {
  return useMutation({ mutationFn: () => settingsService.syncPatchNow() });
}

// ============================================
// Audit Logs
// ============================================

export function useAuditLogs() {
  return useQuery({ queryKey: settingsKeys.auditLogs(), queryFn: () => settingsService.getAuditLogs() });
}

export function useAuditFilterOptions() {
  return useQuery({ queryKey: settingsKeys.auditFilterOptions(), queryFn: () => settingsService.getAuditFilterOptions() });
}

// ============================================
// Platform License
// ============================================

export function usePlatformLicense() {
  return useQuery({ queryKey: settingsKeys.platformLicense(), queryFn: () => settingsService.getPlatformLicense() });
}

export function useUpdatePlatformLicense() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: { licenseCode: string }) => settingsService.updatePlatformLicense(data), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.platformLicense() }); } });
}

// ============================================
// Distribution Servers
// ============================================

export function useDistributionServers() {
  return useQuery({ queryKey: settingsKeys.distributionServers(), queryFn: () => settingsService.getDistributionServers() });
}

export function useDistributionServer(id: string) {
  return useQuery({ queryKey: settingsKeys.distributionServer(id), queryFn: () => settingsService.getDistributionServer(id), enabled: !!id });
}

export function useCreateDistributionServer() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: DistributionServerFormData) => settingsService.createDistributionServer(data), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.distributionServers() }); } });
}

export function useUpdateDistributionServer() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<DistributionServerFormData> }) => settingsService.updateDistributionServer(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.distributionServers() }); } });
}

export function useDeleteDistributionServer() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => settingsService.deleteDistributionServer(id), onSuccess: () => { qc.invalidateQueries({ queryKey: settingsKeys.distributionServers() }); } });
}
