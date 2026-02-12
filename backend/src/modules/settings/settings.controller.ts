import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendError, typedQuery } from '@shared/utils';
import { alertConfigCrudService } from './alert-config-crud.service';
import { organizationsService } from './organizations.service';
import { settingsService } from './settings.service';
import type {
  CreateOrganizationInput,
  UpdateOrganizationInput,
  ListOrganizationsQuery,
  CreateBranchInput,
  UpdateBranchInput,
  ListBranchesQuery,
  CreateDepartmentInput,
  UpdateDepartmentInput,
  ListDepartmentsQuery,
  AuditLogQueryInput,
  UserListQuery,
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
  UpdateLicenseInput,
  UpdateVulnerabilityPreferenceInput,
} from './settings.validators';
import { usersService } from './users.service';

export class SettingsController {
  // ============================================
  // Organizations
  // ============================================

  async listOrganizations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = typedQuery<ListOrganizationsQuery>(req);
      const result = await organizationsService.listOrganizations({
        page: query.page,
        limit: query.limit,
        search: query.search,
      });
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await organizationsService.getOrganization(req.params.id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async createOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as CreateOrganizationInput;
      const result = await organizationsService.createOrganization(input);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  async updateOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as UpdateOrganizationInput;
      const result = await organizationsService.updateOrganization(req.params.id, input);
      sendSuccess(res, result);
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
      const query = typedQuery<ListBranchesQuery>(req);
      const result = await organizationsService.listBranches({
        page: query.page,
        limit: query.limit,
        search: query.search,
        organizationId: query.organizationId,
      });
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getBranch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await organizationsService.getBranch(req.params.id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async createBranch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as CreateBranchInput;
      const result = await organizationsService.createBranch(input);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  async updateBranch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as UpdateBranchInput;
      const result = await organizationsService.updateBranch(req.params.id, input);
      sendSuccess(res, result);
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
      const query = typedQuery<ListDepartmentsQuery>(req);
      const result = await organizationsService.listDepartments({
        page: query.page,
        limit: query.limit,
        search: query.search,
        branchId: query.branchId,
      });
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await organizationsService.getDepartment(req.params.id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async createDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as CreateDepartmentInput;
      const result = await organizationsService.createDepartment(input);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  async updateDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as UpdateDepartmentInput;
      const result = await organizationsService.updateDepartment(req.params.id, input);
      sendSuccess(res, result);
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
      const query = typedQuery<ListOrganizationsQuery>(req);
      const result = await organizationsService.listLocations({
        page: query.page,
        limit: query.limit,
        search: query.search,
      });
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await organizationsService.getLocation(req.params.id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async createLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as CreateLocationInput;
      const result = await organizationsService.createLocation(input);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  async updateLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as UpdateLocationInput;
      const result = await organizationsService.updateLocation(req.params.id, input);
      sendSuccess(res, result);
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
      const query = typedQuery<UserListQuery>(req);
      const result = await usersService.listUsers({
        page: query.page,
        limit: query.limit,
        search: query.search,
        status: query.status,
        role: query.role,
        organizationId: query.organizationId,
      });
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await usersService.getUser(req.params.id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as CreateUserInput;
      const result = await usersService.createUser(input, req.user?.id);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as UpdateUserInput;
      const result = await usersService.updateUser(req.params.id, input, req.user?.id);
      sendSuccess(res, result);
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
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async suspendUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await usersService.suspendUser(req.params.id, req.user?.id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async activateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await usersService.activateUser(req.params.id, req.user?.id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await usersService.resetPassword(req.params.id, req.user?.id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getUserAuditLog(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = typedQuery<ListOrganizationsQuery>(req);
      const result = await usersService.getUserAuditLog(req.params.id, {
        page: query.page,
        limit: query.limit,
      });
      sendSuccess(res, result);
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
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await usersService.getRole(req.params.id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async createRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as CreateRoleInput;
      const result = await usersService.createRole(input);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  async updateRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as UpdateRoleInput;
      const result = await usersService.updateRole(req.params.id, input);
      sendSuccess(res, result);
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
  // Alert Configurations (via BaseCrudService)
  // ============================================

  async listAlertConfigs(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await alertConfigCrudService.findMany();
      sendSuccess(res, result.data);
    } catch (error) {
      next(error);
    }
  }

  async getAlertConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await alertConfigCrudService.findById(req.params.id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async createAlertConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as CreateAlertConfigInput;
      const result = await alertConfigCrudService.create(input);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  async updateAlertConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as UpdateAlertConfigInput;
      const result = await alertConfigCrudService.update(req.params.id, input);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async deleteAlertConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await alertConfigCrudService.delete(req.params.id);
      sendSuccess(res, { message: 'Alert configuration deleted successfully' });
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
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getLdapConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.getLdapConfig(req.params.id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async createLdapConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as CreateLdapConfigInput;
      const result = await settingsService.createLdapConfig(input);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  async updateLdapConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as UpdateLdapConfigInput;
      const result = await settingsService.updateLdapConfig(req.params.id, input);
      sendSuccess(res, result);
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
      sendSuccess(res, result);
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
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async updateServerSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as UpdateServerSettingsInput;
      const result = await settingsService.updateServerSettings(input);
      sendSuccess(res, result);
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
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async updateAgentConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as UpdateAgentConfigInput;
      const result = await settingsService.updateAgentConfig(input);
      sendSuccess(res, result);
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
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async updateProxyServer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as UpdateProxyServerInput;
      const result = await settingsService.updateProxyServer(input);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async testProxyServer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as TestProxyServerInput;
      const result = await settingsService.testProxyServer(input);
      sendSuccess(res, result);
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
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async updateMailServer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as UpdateMailServerInput;
      const result = await settingsService.updateMailServer(input);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async testMailServer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as TestMailServerInput;
      const result = await settingsService.testMailServer(input);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // Audit Logs
  // ============================================

  async listAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = typedQuery<AuditLogQueryInput>(req);
      const result = await settingsService.listAuditLogs({
        page: query.page,
        limit: query.limit,
        sortOrder: query.sortOrder,
        sortBy: query.sortBy,
        action: query.action,
        resource: query.resource,
        userId: query.userId,
        startDate: query.startDate,
        endDate: query.endDate,
        search: query.search,
      });
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getAuditLogFilters(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.getAuditLogFilters();
      sendSuccess(res, result);
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
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async updateVulnerabilityPreference(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as UpdateVulnerabilityPreferenceInput;
      const result = await settingsService.updateVulnerabilityPreference(input);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async syncVulnerabilityDatabase(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.syncVulnerabilityDatabase();
      sendSuccess(res, result);
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
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async updatePlatformLicense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as UpdateLicenseInput;
      const result = await settingsService.updatePlatformLicense(input.licenseCode);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // Agent Approvals
  // ============================================

  async listAgentApprovals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = typedQuery<ListOrganizationsQuery>(req);
      const result = await settingsService.listAgentApprovals({
        page: query.page,
        limit: query.limit,
        search: query.search,
      });
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async approveAgent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.approveAgent(req.params.id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async rejectAgent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.rejectAgent(req.params.id);
      sendSuccess(res, result);
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
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getComputerGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.getComputerGroup(req.params.id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async createComputerGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.createComputerGroup(req.body);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  async updateComputerGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.updateComputerGroup(req.params.id, req.body);
      sendSuccess(res, result);
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
      sendSuccess(res, result);
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
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getDeploymentPolicy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.getDeploymentPolicy(req.params.id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async createDeploymentPolicy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.createDeploymentPolicy(req.body);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  async updateDeploymentPolicy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.updateDeploymentPolicy(req.params.id, req.body);
      sendSuccess(res, result);
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
      sendSuccess(res, result);
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
      sendSuccess(res, result);
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
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async updateRiskScoreSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.updateRiskScoreSettings(req.body);
      sendSuccess(res, result);
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
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async updateRemoteDesktopSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.updateRemoteDesktopSettings(req.body);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async resetRemoteDesktopSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.resetRemoteDesktopSettings();
      sendSuccess(res, result);
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
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getVendorLogo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.getVendorLogo(req.params.id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async createVendorLogo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        sendError(res, 400, 'BAD_REQUEST', 'Logo file is required');
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
      sendSuccess(res, result, 201);
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
      sendSuccess(res, result);
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
  // ============================================
  // Patch Management Settings
  // ============================================

  async getPatchManagementSettings(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.getPatchManagementSettings();
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async updatePatchManagementSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.updatePatchManagementSettings(req.body);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const settingsController = new SettingsController();
