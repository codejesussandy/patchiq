import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendError, typedQuery } from '@shared/utils';
import { NotFoundError } from '@shared/errors';
import { alertConfigCrudService } from './alert-config-crud.service';
import { integrationCrudService } from './integration-crud.service';
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
  CreateGroupMappingInput,
  UpdateGroupMappingInput,
  UpdateServerSettingsInput,
  UpdateAgentConfigInput,
  UpdateProxyServerInput,
  TestProxyServerInput,
  UpdateMailServerInput,
  TestMailServerInput,
  UpdateLicenseInput,
  UpdateVulnerabilityPreferenceInput,
  ListIntegrationsQuery,
  BulkImportInput,
  BulkUserActionInput,
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
      const cascade = req.query.cascade === 'true';
      const reassignTo = req.query.reassignTo as string | undefined;
      await organizationsService.deleteOrganization(req.params.id, { cascade, reassignTo });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async getOrganizationDeleteImpact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await organizationsService.getOrganizationDeleteImpact(req.params.id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getOrgTree(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await organizationsService.getOrgTree();
      sendSuccess(res, result);
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
      const cascade = req.query.cascade === 'true';
      await organizationsService.deleteBranch(req.params.id, { cascade });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async getBranchDeleteImpact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await organizationsService.getBranchDeleteImpact(req.params.id);
      sendSuccess(res, result);
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
      const cascade = req.query.cascade === 'true';
      await organizationsService.deleteDepartment(req.params.id, { cascade });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async getDepartmentDeleteImpact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await organizationsService.getDepartmentDeleteImpact(req.params.id);
      sendSuccess(res, result);
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

  async getLocationDeleteImpact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await organizationsService.getLocationDeleteImpact(req.params.id);
      sendSuccess(res, result);
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

  async bulkImportUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await usersService.bulkImportUsers(req.body as BulkImportInput, req.user?.id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getImportTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const template = usersService.getImportTemplate();
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=user-import-template.csv');
      res.send(template);
    } catch (error) {
      next(error);
    }
  }

  async bulkSuspendUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await usersService.bulkSuspendUsers(req.body as BulkUserActionInput, req.user?.id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async bulkActivateUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await usersService.bulkActivateUsers(req.body as BulkUserActionInput);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async bulkDeleteUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await usersService.bulkDeleteUsers(req.body as BulkUserActionInput, req.user?.id);
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
  // LDAP Group Mappings
  // ============================================

  async listGroupMappings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.listGroupMappings(req.params.id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async createGroupMapping(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as CreateGroupMappingInput;
      const result = await settingsService.createGroupMapping(req.params.id, input);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  async updateGroupMapping(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as UpdateGroupMappingInput;
      const result = await settingsService.updateGroupMapping(req.params.mapId, input);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async deleteGroupMapping(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await settingsService.deleteGroupMapping(req.params.mapId);
      sendSuccess(res, { message: 'Group mapping deleted' });
    } catch (error) {
      next(error);
    }
  }

  async discoverGroups(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.discoverGroups(req.params.id);
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
      const result = await settingsService.testMailServer(input.testEmail);
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
      const result = await settingsService.listComputerGroups(req.query as Record<string, string>);
      sendSuccess(res, { data: result.data, meta: result.meta });
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
      const result = await settingsService.createComputerGroup(req.body, req.user?.id);
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
      const result = await settingsService.listDeploymentPolicies(req.query as Record<string, string>);
      sendSuccess(res, { data: result.data, meta: result.meta });
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
      const result = await settingsService.createDeploymentPolicy(req.body, req.user?.id);
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
      // XSS validation: reject HTML tags in companyName
      if (req.body.companyName && /<[^>]*>/.test(req.body.companyName)) {
        sendError(res, 400, 'VALIDATION_ERROR', 'Company name must not contain HTML tags');
        return;
      }

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

  async getBrandingLogo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const logoUrl = await settingsService.getBrandingLogo();

      if (!logoUrl) {
        return next(new NotFoundError('No branding logo configured'));
      }

      // Redirect to the MinIO presigned URL (1-hour expiry)
      res.redirect(302, logoUrl);
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

  // ============================================
  // Patch Preferences (R3)
  // ============================================
  async getPatchPreferences(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const result = await settingsService.getPatchPreferences(); sendSuccess(res, result); } catch (error) { next(error); }
  }
  async updatePatchPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const result = await settingsService.updatePatchPreferences(req.body); sendSuccess(res, result); } catch (error) { next(error); }
  }
  async syncPatchNow(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const result = await settingsService.syncPatchNow(); sendSuccess(res, result); } catch (error) { next(error); }
  }

  // ============================================
  // Distribution Servers (R4)
  // ============================================
  async listDistributionServers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const result = await settingsService.listDistributionServers(req.query as Record<string, string>); sendSuccess(res, result); } catch (error) { next(error); }
  }
  async getDistributionServer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const result = await settingsService.getDistributionServer(req.params.id); sendSuccess(res, result); } catch (error) { next(error); }
  }
  async createDistributionServer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const result = await settingsService.createDistributionServer(req.body, req.user?.id); sendSuccess(res, result, 201); } catch (error) { next(error); }
  }
  async updateDistributionServer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { const result = await settingsService.updateDistributionServer(req.params.id, req.body); sendSuccess(res, result); } catch (error) { next(error); }
  }
  async deleteDistributionServer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { await settingsService.deleteDistributionServer(req.params.id); res.status(204).send(); } catch (error) { next(error); }
  }

  // ============================================
  // Password Policy
  // ============================================

  async getPasswordPolicy(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const policy = await settingsService.getPasswordPolicy();
      sendSuccess(res, policy);
    } catch (error) {
      next(error);
    }
  }

  async updatePasswordPolicy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const policy = await settingsService.updatePasswordPolicy(req.body);
      sendSuccess(res, policy);
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // LDAP Sync
  // ============================================

  async triggerSync(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const job = await settingsService.triggerLdapSync(id);
      sendSuccess(res, job, 202);
    } catch (error) {
      next(error);
    }
  }

  async listSyncJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const jobs = await settingsService.listSyncJobs(id);
      sendSuccess(res, jobs);
    } catch (error) {
      next(error);
    }
  }

  async getSyncJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { jobId } = req.params;
      const job = await settingsService.getSyncJob(jobId);
      sendSuccess(res, job);
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // Agent Config Reset — Pipeline 2E R3
  // ============================================

  async resetAgentConfig(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.resetAgentConfig();
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // Agent Approval Settings — Pipeline 2E R2
  // ============================================

  async getAgentApprovalSettings(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.getAgentApprovalSettings();
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async updateAgentApprovalSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.updateAgentApprovalSettings(req.body);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // Enroll Secrets — Pipeline 2E R1
  // ============================================

  async listEnrollSecrets(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.listEnrollSecrets();
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getEnrollSecret(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.getEnrollSecret(req.params.id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async createEnrollSecret(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.createEnrollSecret(req.body, req.user?.id || '');
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  async updateEnrollSecret(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.updateEnrollSecret(req.params.id, req.body);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async deleteEnrollSecret(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await settingsService.deleteEnrollSecret(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // RedHat Nominations — Pipeline 2E R5
  // ============================================

  async listRedHatNominations(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.listRedHatNominations();
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getRedHatNomination(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.getRedHatNomination(req.params.id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async createRedHatNomination(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.createRedHatNomination(req.body, req.user?.id || '');
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  async updateRedHatNomination(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.updateRedHatNomination(req.params.id, req.body, req.user?.id || '');
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async deleteRedHatNomination(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await settingsService.deleteRedHatNomination(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // Integrations (R5 — Marketplace CRUD)
  // ============================================

  async listIntegrations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = typedQuery<ListIntegrationsQuery>(req);
      const result = await integrationCrudService.findMany({
        page: query.page,
        limit: query.limit,
        search: query.search,
        type: query.type,
        enabled: query.enabled,
      });
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getIntegration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await integrationCrudService.findById(req.params.id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async createIntegration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await integrationCrudService.create(req.body);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  async updateIntegration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await integrationCrudService.update(req.params.id, req.body);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async deleteIntegration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await integrationCrudService.delete(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async toggleIntegration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { enabled } = req.body;
      const result = await integrationCrudService.toggle(req.params.id, enabled);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async testIntegration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await integrationCrudService.testConnection(req.params.id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const settingsController = new SettingsController();
