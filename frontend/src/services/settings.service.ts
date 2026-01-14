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
};
