import { api } from './api.service';
import type {
  Branch,
  BranchFormData,
  User,
  UserFormData,
  InviteUserFormData,
  Role,
  RoleFormData,
  Policy,
  PolicyFormData,
  DeploymentPolicy,
  DeploymentPolicyFormData,
  MailServerConfig,
  ProxyServerConfig,
  LDAPServerConfig,
  LDAPServerFormData,
  RiskScore,
  RiskScoreFormData,
  RemoteDesktopSettings,
  RemoteDesktopSettingsFormData,
  ServerSettings,
  ServerSettingsFormData,
  Integration,
  IntegrationFormData,
  AgentApprovalSettings,
  AgentApprovalSettingsFormData,
  VulnerabilityPreference,
  VulnerabilityPreferenceFormData,
  AgentConfiguration,
  AgentConfigurationFormData,
  AgentApproval,
  EnrollSecret,
  EnrollSecretFormData,
  RedHatAgentNomination,
  ComputerGroup,
  ComputerGroupFormData,
  EndpointOption,
  PatchPreference,
  PatchPreferenceFormData,
  DistributionServer,
  DistributionServerFormData,
} from '../types/settings.types';

export const settingsService = {
  // Branch Location APIs
  async getBranches(): Promise<Branch[]> {
    const response = await api.get(`/settings/branches`);
    return response.data;
  },

  async getBranch(id: string): Promise<Branch> {
    const response = await api.get(`/settings/branches/${id}`);
    return response.data;
  },

  async createBranch(data: BranchFormData): Promise<Branch> {
    const response = await api.post(`/settings/branches`, data);
    return response.data;
  },

  async updateBranch(id: string, data: Partial<BranchFormData>): Promise<Branch> {
    const response = await api.put(`/settings/branches/${id}`, data);
    return response.data;
  },

  async deleteBranch(id: string): Promise<void> {
    await api.delete(`/settings/branches/${id}`);
  },

  // User Management APIs
  async getUsers(): Promise<User[]> {
    const response = await api.get(`/settings/users`);
    return response.data;
  },

  async getUser(id: string): Promise<User> {
    const response = await api.get(`/settings/users/${id}`);
    return response.data;
  },

  async createUser(data: UserFormData): Promise<User> {
    const response = await api.post(`/settings/users`, data);
    return response.data;
  },

  async updateUser(id: string, data: Partial<UserFormData>): Promise<User> {
    const response = await api.put(`/settings/users/${id}`, data);
    return response.data;
  },

  async deleteUser(id: string): Promise<void> {
    await api.delete(`/settings/users/${id}`);
  },

  async inviteUser(data: InviteUserFormData): Promise<void> {
    await api.post(`/settings/users/invite`, data);
  },

  async resetPassword(id: string): Promise<void> {
    await api.post(`/settings/users/${id}/reset-password`);
  },

  async suspendUser(id: string): Promise<void> {
    await api.post(`/settings/users/${id}/suspend`);
  },

  async getAuditLog(id: string): Promise<any[]> {
    const response = await api.get(`/settings/users/${id}/audit-log`);
    return response.data;
  },

  // Role Management APIs
  async getRoles(): Promise<Role[]> {
    const response = await api.get(`/settings/roles`);
    return response.data;
  },

  async getRole(id: string): Promise<Role> {
    const response = await api.get(`/settings/roles/${id}`);
    return response.data;
  },

  async createRole(data: RoleFormData): Promise<Role> {
    const response = await api.post(`/settings/roles`, data);
    return response.data;
  },

  async updateRole(id: string, data: Partial<RoleFormData>): Promise<Role> {
    const response = await api.put(`/settings/roles/${id}`, data);
    return response.data;
  },

  async deleteRole(id: string): Promise<void> {
    await api.delete(`/settings/roles/${id}`);
  },

  // Policy Management APIs
  async getPolicies(): Promise<Policy[]> {
    const response = await api.get(`/settings/policies`);
    return response.data;
  },

  async getPolicy(id: string): Promise<Policy> {
    const response = await api.get(`/settings/policies/${id}`);
    return response.data;
  },

  async createPolicy(data: PolicyFormData): Promise<Policy> {
    const response = await api.post(`/settings/policies`, data);
    return response.data;
  },

  async updatePolicy(id: string, data: Partial<PolicyFormData>): Promise<Policy> {
    const response = await api.put(`/settings/policies/${id}`, data);
    return response.data;
  },

  async deletePolicy(id: string): Promise<void> {
    await api.delete(`/settings/policies/${id}`);
  },

  async clonePolicy(id: string): Promise<Policy> {
    const response = await api.post(`/settings/policies/${id}/clone`);
    return response.data;
  },

  async disablePolicy(id: string): Promise<void> {
    await api.post(`/settings/policies/${id}/disable`);
  },

  async getAffectedUsers(id: string): Promise<User[]> {
    const response = await api.get(`/settings/policies/${id}/affected-users`);
    return response.data;
  },

  async getPolicyAudit(id: string): Promise<any[]> {
    const response = await api.get(`/settings/policies/${id}/audit`);
    return response.data;
  },

  // Organization Management APIs
  async getOrganizations(): Promise<any[]> {
    const response = await api.get(`/settings/organizations`);
    return response.data;
  },

  async getOrganization(id: string): Promise<any> {
    const response = await api.get(`/settings/organizations/${id}`);
    return response.data;
  },

  async createOrganization(data: any): Promise<any> {
    const response = await api.post(`/settings/organizations`, data);
    return response.data;
  },

  async updateOrganization(id: string, data: any): Promise<any> {
    const response = await api.put(`/settings/organizations/${id}`, data);
    return response.data;
  },

  async deleteOrganization(id: string): Promise<void> {
    await api.delete(`/settings/organizations/${id}`);
  },

  // Location Management APIs
  async getLocations(): Promise<any[]> {
    const response = await api.get(`/settings/locations`);
    return response.data;
  },

  async getLocation(id: string): Promise<any> {
    const response = await api.get(`/settings/locations/${id}`);
    return response.data;
  },

  async createLocation(data: any): Promise<any> {
    const response = await api.post(`/settings/locations`, data);
    return response.data;
  },

  async updateLocation(id: string, data: any): Promise<any> {
    const response = await api.put(`/settings/locations/${id}`, data);
    return response.data;
  },

  async deleteLocation(id: string): Promise<void> {
    await api.delete(`/settings/locations/${id}`);
  },

  // Department Management APIs
  async getDepartments(): Promise<any[]> {
    const response = await api.get(`/settings/departments`);
    return response.data;
  },

  async getDepartment(id: string): Promise<any> {
    const response = await api.get(`/settings/departments/${id}`);
    return response.data;
  },

  async createDepartment(data: any): Promise<any> {
    const response = await api.post(`/settings/departments`, data);
    return response.data;
  },

  async updateDepartment(id: string, data: any): Promise<any> {
    const response = await api.put(`/settings/departments/${id}`, data);
    return response.data;
  },

  async deleteDepartment(id: string): Promise<void> {
    await api.delete(`/settings/departments/${id}`);
  },

  // Branding Management APIs
  async getBrandingSettings(): Promise<any> {
    const response = await api.get(`/settings/branding`);
    return response.data;
  },

  async updateBrandingSettings(data: FormData): Promise<any> {
    const response = await api.post(`/settings/branding`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Mail Server Configuration APIs
  async getMailServerConfig(): Promise<MailServerConfig> {
    const response = await api.get(`/settings/mail-server`);
    return response.data;
  },

  async updateMailServerConfig(data: MailServerConfig): Promise<MailServerConfig> {
    const response = await api.put(`/settings/mail-server`, data);
    return response.data;
  },

  async testMailServerConfig(data: MailServerConfig): Promise<any> {
    const response = await api.post(`/settings/mail-server/test`, data);
    return response.data;
  },

  // Proxy Server Configuration APIs
  async getProxyServerConfig(): Promise<ProxyServerConfig> {
    const response = await api.get(`/settings/proxy-server`);
    return response.data;
  },

  async updateProxyServerConfig(data: ProxyServerConfig): Promise<ProxyServerConfig> {
    const response = await api.put(`/settings/proxy-server`, data);
    return response.data;
  },

  async testProxyServerConfig(data: ProxyServerConfig): Promise<any> {
    const response = await api.post(`/settings/proxy-server/test`, data);
    return response.data;
  },

  // Vendor Logo APIs
  async getVendorLogos(): Promise<any[]> {
    const response = await api.get(`/settings/vendor-logos`);
    return response.data;
  },

  async getVendorLogo(id: string): Promise<any> {
    const response = await api.get(`/settings/vendor-logos/${id}`);
    return response.data;
  },

  async createVendorLogo(data: FormData): Promise<any> {
    const response = await api.post(`/settings/vendor-logos`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async updateVendorLogo(id: string, data: FormData): Promise<any> {
    const response = await api.put(`/settings/vendor-logos/${id}`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async deleteVendorLogo(id: string): Promise<void> {
    await api.delete(`/settings/vendor-logos/${id}`);
  },

  // LDAP Server Configuration APIs
  async getLDAPServerConfigs(): Promise<LDAPServerConfig[]> {
    const response = await api.get(`/settings/ldap-configs`);
    return response.data;
  },

  async getLDAPServerConfig(id: string): Promise<LDAPServerConfig> {
    const response = await api.get(`/settings/ldap-configs/${id}`);
    return response.data;
  },

  async createLDAPServerConfig(data: LDAPServerFormData): Promise<LDAPServerConfig> {
    const response = await api.post(`/settings/ldap-configs`, data);
    return response.data;
  },

  async updateLDAPServerConfig(id: string, data: Partial<LDAPServerFormData>): Promise<LDAPServerConfig> {
    const response = await api.put(`/settings/ldap-configs/${id}`, data);
    return response.data;
  },

  async deleteLDAPServerConfig(id: string): Promise<void> {
    await api.delete(`/settings/ldap-configs/${id}`);
  },

  async testLDAPServerConfig(data: LDAPServerFormData): Promise<any> {
    const response = await api.post(`/settings/ldap-configs/test`, data);
    return response.data;
  },

  // Risk Score APIs
  async getRiskScore(): Promise<RiskScore> {
    const response = await api.get(`/settings/risk-score`);
    return response.data;
  },

  async updateRiskScore(data: RiskScoreFormData): Promise<RiskScore> {
    const response = await api.put(`/settings/risk-score`, data);
    return response.data;
  },

  // Remote Desktop Settings APIs
  async getRemoteDesktopSettings(): Promise<RemoteDesktopSettings> {
    const response = await api.get(`/settings/remote-desktop`);
    return response.data;
  },

  async updateRemoteDesktopSettings(data: RemoteDesktopSettingsFormData): Promise<RemoteDesktopSettings> {
    const response = await api.put(`/settings/remote-desktop`, data);
    return response.data;
  },

  async resetRemoteDesktopSettings(): Promise<void> {
    await api.post(`/settings/remote-desktop/reset`);
  },

  // Server Settings APIs
  async getServerSettings(): Promise<ServerSettings> {
    const response = await api.get(`/settings/server`);
    return response.data;
  },

  async updateServerSettings(data: ServerSettingsFormData): Promise<ServerSettings> {
    const response = await api.put(`/settings/server`, data);
    return response.data;
  },

  // Marketplace/Integration APIs
  async getIntegrations(): Promise<Integration[]> {
    const response = await api.get(`/settings/integrations`);
    return response.data;
  },

  async getIntegration(id: string): Promise<Integration> {
    const response = await api.get(`/settings/integrations/${id}`);
    return response.data;
  },

  async createIntegration(data: IntegrationFormData): Promise<Integration> {
    const response = await api.post(`/settings/integrations`, data);
    return response.data;
  },

  async updateIntegration(id: string, data: Partial<IntegrationFormData>): Promise<Integration> {
    const response = await api.put(`/settings/integrations/${id}`, data);
    return response.data;
  },

  async toggleIntegrationStatus(id: string, status: boolean): Promise<Integration> {
    const response = await api.patch(`/settings/integrations/${id}/status`, { status });
    return response.data;
  },

  async deleteIntegration(id: string): Promise<void> {
    await api.delete(`/settings/integrations/${id}`);
  },

  // Agent Approval Settings APIs
  async getAgentApprovalSettings(): Promise<AgentApprovalSettings> {
    const response = await api.get(`/settings/agent-approval`);
    return response.data;
  },

  async updateAgentApprovalSettings(
    data: AgentApprovalSettingsFormData
  ): Promise<AgentApprovalSettings> {
    const response = await api.put(`/settings/agent-approval`, data);
    return response.data;
  },

  // Vulnerability Preference APIs
  async getVulnerabilityPreference(): Promise<VulnerabilityPreference> {
    const response = await api.get(`/settings/vulnerability-preference`);
    return response.data;
  },

  async updateVulnerabilityPreference(
    data: VulnerabilityPreferenceFormData
  ): Promise<VulnerabilityPreference> {
    const response = await api.put(`/settings/vulnerability-preference`, data);
    return response.data;
  },

  async syncVulnerabilityDatabase(): Promise<{ message: string }> {
    const response = await api.post(`/settings/vulnerability-preference/sync`);
    return response.data;
  },

  // Agent Configuration APIs
  async getAgentConfiguration(): Promise<AgentConfiguration> {
    const response = await api.get(`/settings/agent-configuration`);
    return response.data;
  },

  async updateAgentConfiguration(data: AgentConfigurationFormData): Promise<AgentConfiguration> {
    const response = await api.put(`/settings/agent-configuration`, data);
    return response.data;
  },

  // Agent Approval APIs
  async getAgentApprovals(): Promise<AgentApproval[]> {
    const response = await api.get(`/settings/agent-approvals`);
    return response.data;
  },

  async approveAgent(id: string): Promise<AgentApproval> {
    const response = await api.post(`/settings/agent-approvals/${id}/approve`);
    return response.data;
  },

  async rejectAgent(id: string): Promise<AgentApproval> {
    const response = await api.post(`/settings/agent-approvals/${id}/reject`);
    return response.data;
  },

  async exportAgentApprovals(format: 'csv' | 'json'): Promise<Blob> {
    const response = await api.get(`/settings/agent-approvals/export?format=${format}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Enroll Secret APIs
  async getEnrollSecrets(): Promise<EnrollSecret[]> {
    const response = await api.get(`/settings/enroll-secrets`);
    return response.data;
  },

  async getEnrollSecret(id: string): Promise<EnrollSecret> {
    const response = await api.get(`/settings/enroll-secrets/${id}`);
    return response.data;
  },

  async createEnrollSecret(data: EnrollSecretFormData): Promise<EnrollSecret> {
    const response = await api.post(`/settings/enroll-secrets`, data);
    return response.data;
  },

  async updateEnrollSecret(
    id: string,
    data: Partial<EnrollSecretFormData>
  ): Promise<EnrollSecret> {
    const response = await api.put(`/settings/enroll-secrets/${id}`, data);
    return response.data;
  },

  async deleteEnrollSecret(id: string): Promise<void> {
    await api.delete(`/settings/enroll-secrets/${id}`);
  },

  async exportEnrollSecrets(format: 'csv' | 'json'): Promise<Blob> {
    const response = await api.get(`/settings/enroll-secrets/export?format=${format}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Deployment Policy APIs
  async getDeploymentPolicies(): Promise<DeploymentPolicy[]> {
    const response = await api.get(`/settings/deployment-policies`);
    return response.data;
  },

  async getDeploymentPolicy(id: string): Promise<DeploymentPolicy> {
    const response = await api.get(`/settings/deployment-policies/${id}`);
    return response.data;
  },

  async createDeploymentPolicy(data: DeploymentPolicyFormData): Promise<DeploymentPolicy> {
    const response = await api.post(`/settings/deployment-policies`, data);
    return response.data;
  },

  async updateDeploymentPolicy(
    id: string,
    data: Partial<DeploymentPolicyFormData>
  ): Promise<DeploymentPolicy> {
    const response = await api.put(`/settings/deployment-policies/${id}`, data);
    return response.data;
  },

  async deleteDeploymentPolicy(id: string): Promise<void> {
    await api.delete(`/settings/deployment-policies/${id}`);
  },

  // Red Hat Agent Nomination APIs
  async getRedHatAgentNominations(): Promise<RedHatAgentNomination[]> {
    const response = await api.get(`/settings/red-hat-nominations`);
    return response.data;
  },

  async getRedHatAgentNomination(id: string): Promise<RedHatAgentNomination> {
    const response = await api.get(`/settings/red-hat-nominations/${id}`);
    return response.data;
  },

  async updateRedHatAgentNomination(
    id: string,
    data: Partial<RedHatAgentNomination>
  ): Promise<RedHatAgentNomination> {
    const response = await api.put(`/settings/red-hat-nominations/${id}`, data);
    return response.data;
  },

  async exportRedHatAgentNominations(format: 'csv' | 'json'): Promise<Blob> {
    const response = await api.get(`/settings/red-hat-nominations/export?format=${format}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Computer Group APIs
  async getComputerGroups(): Promise<ComputerGroup[]> {
    const response = await api.get(`/settings/computer-groups`);
    return response.data;
  },

  async getComputerGroup(id: string): Promise<ComputerGroup> {
    const response = await api.get(`/settings/computer-groups/${id}`);
    return response.data;
  },

  async createComputerGroup(data: ComputerGroupFormData): Promise<ComputerGroup> {
    const response = await api.post(`/settings/computer-groups`, data);
    return response.data;
  },

  async updateComputerGroup(id: string, data: Partial<ComputerGroupFormData>): Promise<ComputerGroup> {
    const response = await api.put(`/settings/computer-groups/${id}`, data);
    return response.data;
  },

  async deleteComputerGroup(id: string): Promise<void> {
    await api.delete(`/settings/computer-groups/${id}`);
  },

  async getAvailableEndpoints(): Promise<EndpointOption[]> {
    const response = await api.get(`/settings/computer-groups/available-endpoints`);
    return response.data;
  },

  // Patch Preferences APIs
  async getPatchPreference(): Promise<PatchPreference> {
    const response = await api.get(`/settings/patch-preferences`);
    return response.data;
  },

  async updatePatchPreference(data: PatchPreferenceFormData): Promise<PatchPreference> {
    const response = await api.put(`/settings/patch-preferences`, data);
    return response.data;
  },

  async syncPatchNow(): Promise<{ message: string }> {
    const response = await api.post(`/settings/patch-preferences/sync`);
    return response.data;
  },

  // Audit Log APIs
  async getAuditLogs(): Promise<any[]> {
    const response = await api.get(`/settings/audit-logs`);
    return response.data;
  },

  async getAuditFilterOptions(): Promise<{
    modules: string[];
    users: string[];
    operations: string[];
  }> {
    const response = await api.get(`/settings/audit-logs/filter-options`);
    return response.data;
  },

  // Platform License APIs
  async getPlatformLicense(): Promise<any> {
    const response = await api.get(`/settings/platform-license`);
    return response.data;
  },

  async updatePlatformLicense(data: { licenseCode: string }): Promise<any> {
    const response = await api.put(`/settings/platform-license`, data);
    return response.data;
  },

  // Distribution Server APIs
  async getDistributionServers(): Promise<DistributionServer[]> {
    const response = await api.get(`/settings/distribution-servers`);
    return response.data;
  },

  async getDistributionServer(id: string): Promise<DistributionServer> {
    const response = await api.get(`/settings/distribution-servers/${id}`);
    return response.data;
  },

  async createDistributionServer(data: DistributionServerFormData): Promise<DistributionServer> {
    const response = await api.post(`/settings/distribution-servers`, data);
    return response.data;
  },

  async updateDistributionServer(
    id: string,
    data: Partial<DistributionServerFormData>
  ): Promise<DistributionServer> {
    const response = await api.put(`/settings/distribution-servers/${id}`, data);
    return response.data;
  },

  async deleteDistributionServer(id: string): Promise<void> {
    await api.delete(`/settings/distribution-servers/${id}`);
  },

  async exportDistributionServers(format: 'csv' | 'json'): Promise<Blob> {
    const response = await api.get(`/settings/distribution-servers/export?format=${format}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async downloadDistributionServer(): Promise<Blob> {
    const response = await api.get(`/settings/distribution-servers/download`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
