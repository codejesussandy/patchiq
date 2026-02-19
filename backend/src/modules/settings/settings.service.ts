import { prisma } from '@db/client';
import type {
  AlertConfigResponse,
  LdapConfigResponse,
  AuditLogResponse,
  AuditLogFilterOptions,
  PaginatedResponse,
  SuccessResponse,
  AgentApprovalResponse,
} from './settings.types';
import type {
  CreateAlertConfigInput,
  UpdateAlertConfigInput,
  CreateLdapConfigInput,
  UpdateLdapConfigInput,
  AuditLogQueryInput,
} from './settings.validators';

import * as infra from './settings-infrastructure.service';
import * as ldap from './settings-ldap.service';
import * as agent from './settings-agent.service';
import * as patch from './settings-patch.service';
import * as audit from './settings-audit.service';
import * as license from './settings-license.service';

export class SettingsService {
  // ============================================
  // Alert Configurations
  // ============================================

  async listAlertConfigs(): Promise<AlertConfigResponse[]> {
    return infra.listAlertConfigs();
  }

  async getAlertConfigById(id: string): Promise<AlertConfigResponse> {
    return infra.getAlertConfigById(id);
  }

  async createAlertConfig(input: CreateAlertConfigInput): Promise<AlertConfigResponse> {
    return infra.createAlertConfig(input);
  }

  async updateAlertConfigById(id: string, input: UpdateAlertConfigInput): Promise<AlertConfigResponse> {
    return infra.updateAlertConfigById(id, input);
  }

  async deleteAlertConfig(id: string): Promise<void> {
    return infra.deleteAlertConfig(id);
  }

  // ============================================
  // LDAP Configurations
  // ============================================

  async listLdapConfigs(): Promise<LdapConfigResponse[]> {
    return ldap.listLdapConfigs();
  }

  async getLdapConfig(id: string): Promise<LdapConfigResponse> {
    return ldap.getLdapConfig(id);
  }

  async createLdapConfig(input: CreateLdapConfigInput): Promise<LdapConfigResponse> {
    return ldap.createLdapConfig(input);
  }

  async updateLdapConfig(id: string, input: UpdateLdapConfigInput): Promise<LdapConfigResponse> {
    return ldap.updateLdapConfig(id, input);
  }

  async deleteLdapConfig(id: string): Promise<void> {
    return ldap.deleteLdapConfig(id);
  }

  async testLdapConfig(id: string): Promise<SuccessResponse> {
    return ldap.testLdapConfig(id);
  }

  // ============================================
  // Singleton Settings (using Setting table)
  // ============================================

  async getServerSettings(): Promise<Record<string, unknown>> {
    return infra.getServerSettings();
  }

  async updateServerSettings(input: Record<string, unknown>, userId?: string, ipAddress?: string): Promise<Record<string, unknown>> {
    return infra.updateServerSettings(input, userId, ipAddress);
  }

  async getAgentConfig(): Promise<Record<string, unknown>> {
    return agent.getAgentConfig();
  }

  async updateAgentConfig(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return agent.updateAgentConfig(input);
  }

  async resetAgentConfig(): Promise<Record<string, unknown>> {
    return agent.resetAgentConfig();
  }

  async getProxyServer(): Promise<Record<string, unknown>> {
    return infra.getProxyServer();
  }

  async updateProxyServer(input: Record<string, unknown>, userId?: string, ipAddress?: string): Promise<Record<string, unknown>> {
    return infra.updateProxyServer(input, userId, ipAddress);
  }

  async testProxyServer(input: Record<string, unknown>): Promise<SuccessResponse> {
    return infra.testProxyServer(input);
  }

  async getMailServer(): Promise<Record<string, unknown>> {
    return infra.getMailServer();
  }

  async updateMailServer(input: Record<string, unknown>, userId?: string, ipAddress?: string): Promise<Record<string, unknown>> {
    return infra.updateMailServer(input, userId, ipAddress);
  }

  async testMailServer(testEmail: string): Promise<SuccessResponse> {
    return infra.testMailServer(testEmail);
  }

  // ============================================
  // Audit Logs
  // ============================================

  async listAuditLogs(params: AuditLogQueryInput): Promise<PaginatedResponse<AuditLogResponse>> {
    return audit.listAuditLogs(params);
  }

  async getAuditLogFilters(): Promise<AuditLogFilterOptions> {
    return audit.getAuditLogFilters();
  }

  // ============================================
  // Vulnerability Preference
  // ============================================

  async getVulnerabilityPreference(): Promise<Record<string, unknown>> {
    return license.getVulnerabilityPreference();
  }

  async updateVulnerabilityPreference(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return license.updateVulnerabilityPreference(input);
  }

  async syncVulnerabilityDatabase(): Promise<SuccessResponse> {
    return license.syncVulnerabilityDatabase();
  }

  // ============================================
  // Platform License
  // ============================================

  async getPlatformLicense(): Promise<Record<string, unknown>> {
    return license.getPlatformLicense();
  }

  async updatePlatformLicense(licenseCode: string): Promise<Record<string, unknown>> {
    return license.updatePlatformLicense(licenseCode);
  }

  // ============================================
  // Agent Approvals
  // ============================================

  async listAgentApprovals(params: { page: number; limit: number; search?: string }): Promise<PaginatedResponse<AgentApprovalResponse>> {
    return agent.listAgentApprovals(params);
  }

  async approveAgent(id: string) {
    return agent.approveAgent(id);
  }

  async rejectAgent(id: string) {
    return agent.rejectAgent(id);
  }

  // ============================================
  // Computer Groups
  // ============================================

  async listComputerGroups(params: { page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: string }) {
    return patch.listComputerGroups(params);
  }

  async getComputerGroup(id: string) {
    return patch.getComputerGroup(id);
  }

  async createComputerGroup(data: { name: string; description?: string | null; endpoints?: string[] }, userId?: string) {
    return patch.createComputerGroup(data, userId);
  }

  async updateComputerGroup(id: string, data: { name?: string; description?: string | null; endpoints?: string[] }) {
    return patch.updateComputerGroup(id, data);
  }

  async deleteComputerGroup(id: string) {
    return patch.deleteComputerGroup(id);
  }

  async getAvailableEndpoints() {
    return patch.getAvailableEndpoints();
  }

  // ============================================
  // Deployment Policies
  // ============================================

  async listDeploymentPolicies(params: { page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: string; type?: string }) {
    return patch.listDeploymentPolicies(params);
  }

  async getDeploymentPolicy(id: string) {
    return patch.getDeploymentPolicy(id);
  }

  async createDeploymentPolicy(data: { name: string; description?: string; type?: string; supportedModule?: string; relatedType?: string }, userId?: string) {
    return patch.createDeploymentPolicy(data, userId);
  }

  async updateDeploymentPolicy(id: string, data: { name?: string; description?: string; type?: string; supportedModule?: string; relatedType?: string }) {
    return patch.updateDeploymentPolicy(id, data);
  }

  async deleteDeploymentPolicy(id: string) {
    return patch.deleteDeploymentPolicy(id);
  }

  // ============================================
  // Patch Preferences
  // ============================================

  async getPatchPreferences() {
    return patch.getPatchPreferences();
  }

  async updatePatchPreferences(input: Record<string, unknown>) {
    return patch.updatePatchPreferences(input);
  }

  async syncPatchNow() {
    return patch.syncPatchNow();
  }

  // ============================================
  // Distribution Servers
  // ============================================

  async listDistributionServers(params: { page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: string }) {
    return patch.listDistributionServers(params);
  }

  async getDistributionServer(id: string) {
    return patch.getDistributionServer(id);
  }

  async createDistributionServer(data: { name: string; description?: string | null; location?: string | null; url: string; version?: string | null; status?: string }, userId?: string) {
    return patch.createDistributionServer(data, userId);
  }

  async updateDistributionServer(id: string, data: { name?: string; description?: string | null; location?: string | null; url?: string; version?: string | null; status?: string }) {
    return patch.updateDistributionServer(id, data);
  }

  async deleteDistributionServer(id: string) {
    return patch.deleteDistributionServer(id);
  }

  // ============================================
  // Branding
  // ============================================

  async getBranding(): Promise<Record<string, unknown>> {
    return infra.getBranding();
  }

  async getBrandingLogo(): Promise<string | null> {
    return infra.getBrandingLogo();
  }

  async updateBranding(
    input: { companyName?: string },
    logoFile?: { buffer: Buffer; originalname: string; mimetype: string },
    userId?: string,
    ipAddress?: string
  ): Promise<Record<string, unknown>> {
    return infra.updateBranding(input, logoFile, userId, ipAddress);
  }

  // ============================================
  // Risk Score Settings
  // ============================================

  async getRiskScoreSettings(): Promise<Record<string, unknown>> {
    return infra.getRiskScoreSettings();
  }

  async updateRiskScoreSettings(input: Record<string, unknown>, userId?: string, ipAddress?: string): Promise<Record<string, unknown>> {
    return infra.updateRiskScoreSettings(input, userId, ipAddress);
  }

  // ============================================
  // Remote Desktop Settings
  // ============================================

  async getRemoteDesktopSettings(): Promise<Record<string, unknown>> {
    return infra.getRemoteDesktopSettingsData();
  }

  async updateRemoteDesktopSettings(input: Record<string, unknown>, userId?: string, ipAddress?: string): Promise<Record<string, unknown>> {
    return infra.updateRemoteDesktopSettings(input, userId, ipAddress);
  }

  async resetRemoteDesktopSettings(): Promise<Record<string, unknown>> {
    return infra.resetRemoteDesktopSettings();
  }

  // ============================================
  // Vendor Logos
  // ============================================

  async listVendorLogos() {
    return infra.listVendorLogos();
  }

  async getVendorLogo(id: string) {
    return infra.getVendorLogo(id);
  }

  async getVendorLogoImage(id: string): Promise<string | null> {
    return infra.getVendorLogoImage(id);
  }

  async createVendorLogo(
    data: { name: string; type: string },
    logoFile: { buffer: Buffer; originalname: string; mimetype: string },
    userId?: string,
    ipAddress?: string
  ) {
    return infra.createVendorLogo(data, logoFile, userId, ipAddress);
  }

  async updateVendorLogo(
    id: string,
    data: { name?: string; type?: string },
    logoFile?: { buffer: Buffer; originalname: string; mimetype: string },
    userId?: string,
    ipAddress?: string
  ) {
    return infra.updateVendorLogo(id, data, logoFile, userId, ipAddress);
  }

  async deleteVendorLogo(id: string, userId?: string, ipAddress?: string) {
    return infra.deleteVendorLogo(id, userId, ipAddress);
  }

  // ============================================
  // Patch Management Settings
  // ============================================

  async getPatchManagementSettings(): Promise<Record<string, unknown>> {
    return patch.getPatchManagementSettings();
  }

  async updatePatchManagementSettings(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return patch.updatePatchManagementSettings(input);
  }

  async getPasswordPolicy(): Promise<Record<string, unknown>> {
    return license.getPasswordPolicy();
  }

  async updatePasswordPolicy(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return license.updatePasswordPolicy(input);
  }

  // ============================================
  // LDAP Group Mappings
  // ============================================

  async listGroupMappings(ldapConfigId: string) {
    return ldap.listGroupMappings(ldapConfigId);
  }

  async createGroupMapping(ldapConfigId: string, input: { ldapGroupDn: string; roleId: string; priority?: number }) {
    return ldap.createGroupMapping(ldapConfigId, input);
  }

  async updateGroupMapping(mappingId: string, input: { ldapGroupDn?: string; roleId?: string; priority?: number }) {
    return ldap.updateGroupMapping(mappingId, input);
  }

  async deleteGroupMapping(mappingId: string) {
    return ldap.deleteGroupMapping(mappingId);
  }

  async discoverGroups(ldapConfigId: string) {
    return ldap.discoverGroups(ldapConfigId);
  }

  // ============================================
  // LDAP Sync
  // ============================================

  async triggerLdapSync(ldapConfigId: string) {
    return ldap.triggerLdapSync(ldapConfigId);
  }

  async listSyncJobs(ldapConfigId: string) {
    return ldap.listSyncJobs(ldapConfigId);
  }

  async getSyncJob(jobId: string) {
    return ldap.getSyncJob(jobId);
  }

  // ============================================
  // Enroll Secrets
  // ============================================

  async createEnrollSecret(data: { name: string; organizationId?: string; departmentId?: string; expiresAt?: string | null; maxUses?: number | null }, userId: string) {
    return agent.createEnrollSecret(data, userId);
  }

  async listEnrollSecrets() {
    return agent.listEnrollSecrets();
  }

  async getEnrollSecret(id: string) {
    return agent.getEnrollSecret(id);
  }

  async updateEnrollSecret(id: string, data: Record<string, unknown>) {
    return agent.updateEnrollSecret(id, data);
  }

  async deleteEnrollSecret(id: string) {
    return agent.deleteEnrollSecret(id);
  }

  async validateEnrollSecret(secretValue: string | undefined) {
    return agent.validateEnrollSecret(secretValue);
  }

  async incrementEnrollSecretUsage(secretId: string): Promise<void> {
    return agent.incrementEnrollSecretUsage(secretId);
  }

  // ============================================
  // Agent Approval Settings
  // ============================================

  async getAgentApprovalSettings() {
    return agent.getAgentApprovalSettings();
  }

  async updateAgentApprovalSettings(data: Record<string, unknown>) {
    return agent.updateAgentApprovalSettings(data);
  }

  // ============================================
  // RedHat Nominations
  // ============================================

  async createRedHatNomination(data: { agentId: string; name: string; scheduledTime?: string | null; endpoint?: number }, userId: string) {
    return infra.createRedHatNomination(data, userId);
  }

  async listRedHatNominations() {
    return infra.listRedHatNominations();
  }

  async getRedHatNomination(id: string) {
    return infra.getRedHatNomination(id);
  }

  async updateRedHatNomination(id: string, data: Record<string, unknown>, userId: string) {
    return infra.updateRedHatNomination(id, data, userId);
  }

  async deleteRedHatNomination(id: string) {
    return infra.deleteRedHatNomination(id);
  }
}

export const settingsService = new SettingsService();

// ============================================
// Standalone Consumer Functions (R5 + R6)
// ============================================

export async function getRemoteDesktopSettings(): Promise<{
  connectionType: string;
  remoteSessionIndicator: boolean;
  userConsent: boolean;
}> {
  const result = await settingsService.getRemoteDesktopSettings();
  return {
    connectionType: (result.connectionType as string) || 'Local',
    remoteSessionIndicator: (result.remoteSessionIndicator as boolean) ?? false,
    userConsent: (result.userConsent as boolean) ?? false,
  };
}

export async function getRiskScoreWeights(): Promise<{
  applyDefaultSettings: boolean;
  vulnerabilityScoreWeight: number;
  vulnerabilitySeverityWeight: number;
  threatsWeight: number;
  endpointVisitsWeight: number;
}> {
  const result = await settingsService.getRiskScoreSettings();
  const applyDefault = (result.applyDefaultSettings as boolean) ?? true;
  if (applyDefault) {
    return {
      applyDefaultSettings: true,
      vulnerabilityScoreWeight: 0.25,
      vulnerabilitySeverityWeight: 0.25,
      threatsWeight: 0.25,
      endpointVisitsWeight: 0.25,
    };
  }
  return {
    applyDefaultSettings: false,
    vulnerabilityScoreWeight: (result.vulnerabilityScoreWeight as number) ?? 0.25,
    vulnerabilitySeverityWeight: (result.vulnerabilitySeverityWeight as number) ?? 0.25,
    threatsWeight: (result.threatsWeight as number) ?? 0.25,
    endpointVisitsWeight: (result.endpointVisitsWeight as number) ?? 0.25,
  };
}

const SEVERITY_SCORES: Record<string, number> = {
  CRITICAL: 1.0, HIGH: 0.75, MEDIUM: 0.5, LOW: 0.25,
};

export async function computeAssetRiskScores(): Promise<void> {
  const weights = await getRiskScoreWeights();
  const assets = await prisma.asset.findMany({
    where: { vulnerabilities: { some: { status: 'Open' } } },
    select: {
      id: true,
      vulnerabilities: {
        where: { status: 'Open' },
        select: {
          vulnerability: {
            select: { epss: true, cvss3BaseScore: true, severity: true, exploitable: true },
          },
        },
      },
    },
  });
  for (const asset of assets) {
    const vulns = asset.vulnerabilities.map((av) => av.vulnerability);
    if (vulns.length === 0) continue;
    const scores = vulns.map((v) => {
      if (v.epss != null) return v.epss / 100;
      if (v.cvss3BaseScore != null) return v.cvss3BaseScore / 10;
      return 0;
    });
    const vulnScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const severityScore = Math.max(...vulns.map((v) => SEVERITY_SCORES[v.severity.toUpperCase()] ?? 0));
    const threatScore = vulns.some((v) => v.exploitable) ? 1.0 : 0.0;
    const endpointVisitsScore = 0.5;
    const riskScore =
      vulnScore * weights.vulnerabilityScoreWeight +
      severityScore * weights.vulnerabilitySeverityWeight +
      threatScore * weights.threatsWeight +
      endpointVisitsScore * weights.endpointVisitsWeight;
    await prisma.asset.update({
      where: { id: asset.id },
      data: { riskScore: Math.round(riskScore * 1000) / 1000 },
    });
  }
}
