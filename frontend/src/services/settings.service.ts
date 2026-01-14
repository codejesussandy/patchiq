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
    const response = await api.get(`/api/settings/branches`);
    return response.data;
  },

  async getBranch(id: string): Promise<Branch> {
    const response = await api.get(`/api/settings/branches/${id}`);
    return response.data;
  },

  async createBranch(data: BranchFormData): Promise<Branch> {
    const response = await api.post(`/api/settings/branches`, data);
    return response.data;
  },

  async updateBranch(id: string, data: Partial<BranchFormData>): Promise<Branch> {
    const response = await api.put(`/api/settings/branches/${id}`, data);
    return response.data;
  },

  async deleteBranch(id: string): Promise<void> {
    await api.delete(`/api/settings/branches/${id}`);
  },

  // User Management APIs
  async getUsers(): Promise<User[]> {
    const response = await api.get(`/api/settings/users`);
    return response.data;
  },

  async getUser(id: string): Promise<User> {
    const response = await api.get(`/api/settings/users/${id}`);
    return response.data;
  },

  async createUser(data: UserFormData): Promise<User> {
    const response = await api.post(`/api/settings/users`, data);
    return response.data;
  },

  async updateUser(id: string, data: Partial<UserFormData>): Promise<User> {
    const response = await api.put(`/api/settings/users/${id}`, data);
    return response.data;
  },

  async deleteUser(id: string): Promise<void> {
    await api.delete(`/api/settings/users/${id}`);
  },

  async inviteUser(data: InviteUserFormData): Promise<void> {
    await api.post(`/api/settings/users/invite`, data);
  },

  async resetPassword(id: string): Promise<void> {
    await api.post(`/api/settings/users/${id}/reset-password`);
  },

  async suspendUser(id: string): Promise<void> {
    await api.post(`/api/settings/users/${id}/suspend`);
  },

  async getAuditLog(id: string): Promise<any[]> {
    const response = await api.get(`/api/settings/users/${id}/audit-log`);
    return response.data;
  },

  // Role Management APIs
  async getRoles(): Promise<Role[]> {
    const response = await api.get(`/api/settings/roles`);
    return response.data;
  },

  async getRole(id: string): Promise<Role> {
    const response = await api.get(`/api/settings/roles/${id}`);
    return response.data;
  },

  async createRole(data: RoleFormData): Promise<Role> {
    const response = await api.post(`/api/settings/roles`, data);
    return response.data;
  },

  async updateRole(id: string, data: Partial<RoleFormData>): Promise<Role> {
    const response = await api.put(`/api/settings/roles/${id}`, data);
    return response.data;
  },

  async deleteRole(id: string): Promise<void> {
    await api.delete(`/api/settings/roles/${id}`);
  },

  // Policy Management APIs
  async getPolicies(): Promise<Policy[]> {
    const response = await api.get(`/api/settings/policies`);
    return response.data;
  },

  async getPolicy(id: string): Promise<Policy> {
    const response = await api.get(`/api/settings/policies/${id}`);
    return response.data;
  },

  async createPolicy(data: PolicyFormData): Promise<Policy> {
    const response = await api.post(`/api/settings/policies`, data);
    return response.data;
  },

  async updatePolicy(id: string, data: Partial<PolicyFormData>): Promise<Policy> {
    const response = await api.put(`/api/settings/policies/${id}`, data);
    return response.data;
  },

  async deletePolicy(id: string): Promise<void> {
    await api.delete(`/api/settings/policies/${id}`);
  },

  async clonePolicy(id: string): Promise<Policy> {
    const response = await api.post(`/api/settings/policies/${id}/clone`);
    return response.data;
  },

  async disablePolicy(id: string): Promise<void> {
    await api.post(`/api/settings/policies/${id}/disable`);
  },

  async getAffectedUsers(id: string): Promise<User[]> {
    const response = await api.get(`/api/settings/policies/${id}/affected-users`);
    return response.data;
  },

  async getPolicyAudit(id: string): Promise<any[]> {
    const response = await api.get(`/api/settings/policies/${id}/audit`);
    return response.data;
  },
};
