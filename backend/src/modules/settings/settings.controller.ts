import { Request, Response, NextFunction } from 'express';
import { organizationsService } from './organizations.service';
import { usersService } from './users.service';
import { settingsService } from './settings.service';
import type {
  CreateOrganizationInput,
  UpdateOrganizationInput,
  CreateBranchInput,
  UpdateBranchInput,
  CreateDepartmentInput,
  UpdateDepartmentInput,
  CreateLocationInput,
  UpdateLocationInput,
  CreateUserInput,
  UpdateUserInput,
  InviteUserInput,
  CreateRoleInput,
  UpdateRoleInput,
  CreateAlertConfigInput,
  UpdateAlertConfigInput,
  CreateLdapConfigInput,
  UpdateLdapConfigInput,
  UpdateServerSettingsInput,
  UpdateAgentConfigInput,
  UpdateProxyServerInput,
  TestProxyServerInput,
  UpdateMailServerInput,
  TestMailServerInput,
  AuditLogQueryInput,
  UpdateLicenseInput,
  UpdateVulnerabilityPreferenceInput,
} from './settings.validators';

export class SettingsController {
  // ============================================
  // Organizations
  // ============================================

  async listOrganizations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page = 1, limit = 10, search } = req.query;
      const result = await organizationsService.listOrganizations({
        page: Number(page),
        limit: Number(limit),
        search: search as string | undefined,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await organizationsService.getOrganization(req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async createOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as CreateOrganizationInput;
      const result = await organizationsService.createOrganization(input);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as UpdateOrganizationInput;
      const result = await organizationsService.updateOrganization(req.params.id, input);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await organizationsService.deleteOrganization(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // Branches
  // ============================================

  async listBranches(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page = 1, limit = 10, search, organizationId } = req.query;
      const result = await organizationsService.listBranches({
        page: Number(page),
        limit: Number(limit),
        search: search as string | undefined,
        organizationId: organizationId as string | undefined,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getBranch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await organizationsService.getBranch(req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async createBranch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as CreateBranchInput;
      const result = await organizationsService.createBranch(input);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateBranch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as UpdateBranchInput;
      const result = await organizationsService.updateBranch(req.params.id, input);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteBranch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await organizationsService.deleteBranch(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // Departments
  // ============================================

  async listDepartments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page = 1, limit = 10, search, branchId } = req.query;
      const result = await organizationsService.listDepartments({
        page: Number(page),
        limit: Number(limit),
        search: search as string | undefined,
        branchId: branchId as string | undefined,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await organizationsService.getDepartment(req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async createDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as CreateDepartmentInput;
      const result = await organizationsService.createDepartment(input);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as UpdateDepartmentInput;
      const result = await organizationsService.updateDepartment(req.params.id, input);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await organizationsService.deleteDepartment(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // Locations
  // ============================================

  async listLocations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page = 1, limit = 10, search } = req.query;
      const result = await organizationsService.listLocations({
        page: Number(page),
        limit: Number(limit),
        search: search as string | undefined,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await organizationsService.getLocation(req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async createLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as CreateLocationInput;
      const result = await organizationsService.createLocation(input);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as UpdateLocationInput;
      const result = await organizationsService.updateLocation(req.params.id, input);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await organizationsService.deleteLocation(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // Users
  // ============================================

  async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page = 1, limit = 10, search, status, role, organizationId } = req.query;
      const result = await usersService.listUsers({
        page: Number(page),
        limit: Number(limit),
        search: search as string | undefined,
        status: status as string | undefined,
        role: role as string | undefined,
        organizationId: organizationId as string | undefined,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await usersService.getUser(req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as CreateUserInput;
      const result = await usersService.createUser(input, req.user?.id);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as UpdateUserInput;
      const result = await usersService.updateUser(req.params.id, input, req.user?.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await usersService.deleteUser(req.params.id, req.user?.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async inviteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as InviteUserInput;
      const result = await usersService.inviteUser(input, req.user?.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async suspendUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await usersService.suspendUser(req.params.id, req.user?.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async activateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await usersService.activateUser(req.params.id, req.user?.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await usersService.resetPassword(req.params.id, req.user?.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getUserAuditLog(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page = 1, limit = 10 } = req.query;
      const result = await usersService.getUserAuditLog(req.params.id, {
        page: Number(page),
        limit: Number(limit),
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // Roles
  // ============================================

  async listRoles(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await usersService.listRoles();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await usersService.getRole(req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async createRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as CreateRoleInput;
      const result = await usersService.createRole(input);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as UpdateRoleInput;
      const result = await usersService.updateRole(req.params.id, input);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await usersService.deleteRole(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // Alert Configurations
  // ============================================

  async listAlertConfigs(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.listAlertConfigs();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getAlertConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.getAlertConfigById(req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async createAlertConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as CreateAlertConfigInput;
      const result = await settingsService.createAlertConfig(input);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateAlertConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as UpdateAlertConfigInput;
      const result = await settingsService.updateAlertConfigById(req.params.id, input);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteAlertConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await settingsService.deleteAlertConfig(req.params.id);
      res.json({ message: 'Alert configuration deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // LDAP Configurations
  // ============================================

  async listLdapConfigs(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.listLdapConfigs();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getLdapConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.getLdapConfig(req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async createLdapConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as CreateLdapConfigInput;
      const result = await settingsService.createLdapConfig(input);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateLdapConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as UpdateLdapConfigInput;
      const result = await settingsService.updateLdapConfig(req.params.id, input);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteLdapConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await settingsService.deleteLdapConfig(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async testLdapConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.testLdapConfig(req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // Server Settings
  // ============================================

  async getServerSettings(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.getServerSettings();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateServerSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as UpdateServerSettingsInput;
      const result = await settingsService.updateServerSettings(input);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // Agent Configuration
  // ============================================

  async getAgentConfig(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.getAgentConfig();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateAgentConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as UpdateAgentConfigInput;
      const result = await settingsService.updateAgentConfig(input);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // Proxy Server
  // ============================================

  async getProxyServer(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.getProxyServer();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateProxyServer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as UpdateProxyServerInput;
      const result = await settingsService.updateProxyServer(input);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async testProxyServer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as TestProxyServerInput;
      const result = await settingsService.testProxyServer(input);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // Mail Server
  // ============================================

  async getMailServer(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.getMailServer();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateMailServer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as UpdateMailServerInput;
      const result = await settingsService.updateMailServer(input);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async testMailServer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as TestMailServerInput;
      const result = await settingsService.testMailServer(input);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // Audit Logs
  // ============================================

  async listAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page = 1, limit = 10, action, resource, userId, startDate, endDate, search, sortBy, sortOrder = 'desc' } = req.query;
      const result = await settingsService.listAuditLogs({
        page: Number(page),
        limit: Number(limit),
        sortOrder: (sortOrder as 'asc' | 'desc'),
        sortBy: sortBy as string | undefined,
        action: action as string | undefined,
        resource: resource as string | undefined,
        userId: userId as string | undefined,
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        search: search as string | undefined,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getAuditLogFilters(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.getAuditLogFilters();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // Vulnerability Preference
  // ============================================

  async getVulnerabilityPreference(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.getVulnerabilityPreference();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateVulnerabilityPreference(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as UpdateVulnerabilityPreferenceInput;
      const result = await settingsService.updateVulnerabilityPreference(input);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async syncVulnerabilityDatabase(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.syncVulnerabilityDatabase();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // Platform License
  // ============================================

  async getPlatformLicense(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.getPlatformLicense();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async updatePlatformLicense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as UpdateLicenseInput;
      const result = await settingsService.updatePlatformLicense(input.licenseCode);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // Agent Approvals
  // ============================================

  async listAgentApprovals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page = 1, limit = 10, search } = req.query;
      const result = await settingsService.listAgentApprovals({
        page: Number(page),
        limit: Number(limit),
        search: search as string | undefined,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async approveAgent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.approveAgent(req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async rejectAgent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.rejectAgent(req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // Computer Groups
  // ============================================

  async listComputerGroups(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.listComputerGroups();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getComputerGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.getComputerGroup(req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async createComputerGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.createComputerGroup(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateComputerGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.updateComputerGroup(req.params.id, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteComputerGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await settingsService.deleteComputerGroup(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async getAvailableEndpoints(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.getAvailableEndpoints();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // Deployment Policies
  // ============================================

  async listDeploymentPolicies(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.listDeploymentPolicies();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getDeploymentPolicy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.getDeploymentPolicy(req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async createDeploymentPolicy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.createDeploymentPolicy(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateDeploymentPolicy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.updateDeploymentPolicy(req.params.id, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteDeploymentPolicy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await settingsService.deleteDeploymentPolicy(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // Branding
  // ============================================

  async getBranding(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.getBranding();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateBranding(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const logoFile = req.file
        ? {
            buffer: req.file.buffer,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
          }
        : undefined;

      const result = await settingsService.updateBranding(
        { companyName: req.body.companyName },
        logoFile
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // Risk Score Settings
  // ============================================

  async getRiskScoreSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.getRiskScoreSettings();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateRiskScoreSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.updateRiskScoreSettings(req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // Remote Desktop Settings
  // ============================================

  async getRemoteDesktopSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.getRemoteDesktopSettings();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateRemoteDesktopSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.updateRemoteDesktopSettings(req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async resetRemoteDesktopSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.resetRemoteDesktopSettings();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // Vendor Logos
  // ============================================

  async listVendorLogos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.listVendorLogos();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getVendorLogo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.getVendorLogo(req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async createVendorLogo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ message: 'Logo file is required' });
        return;
      }

      const result = await settingsService.createVendorLogo(
        { name: req.body.name, type: req.body.type },
        {
          buffer: req.file.buffer,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
        }
      );
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateVendorLogo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const logoFile = req.file
        ? {
            buffer: req.file.buffer,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
          }
        : undefined;

      const result = await settingsService.updateVendorLogo(
        req.params.id,
        { name: req.body.name, type: req.body.type },
        logoFile
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteVendorLogo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await settingsService.deleteVendorLogo(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const settingsController = new SettingsController();
