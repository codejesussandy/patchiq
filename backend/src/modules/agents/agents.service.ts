import { agentsRegistrationService } from './agents-registration.service';
import { agentsInventoryService } from './agents-inventory.service';
import { agentsCommandsService } from './agents-commands.service';
import { agentsCrudService } from './agents-crud.service';
import type {
  AgentResponse,
  AgentDownloadResponse,
  AgentVersionResponse,
  CommandResponse,
  ListAgentsParams,
  RegisterAgentResponse,
  HeartbeatResponse,
  AgentConfig,
  PendingCommand,
} from './agents.types';
import type {
  RegisterAgentInput,
  HeartbeatInput,
  CommandResultInput,
  InventoryInput,
  CreateAgentVersionInput,
  UpdateAgentVersionInput,
} from './agents.validators';

/**
 * Orchestrator class that delegates to focused sub-services.
 * Preserves the original public API so consumers need zero changes.
 */
export class AgentsService {
  // --- Registration & Heartbeat ---
  registerAgent(input: RegisterAgentInput): Promise<RegisterAgentResponse> {
    return agentsRegistrationService.registerAgent(input);
  }

  processHeartbeat(agentId: string, input: HeartbeatInput, agentVersion?: string): Promise<Omit<HeartbeatResponse, 'acknowledged' | 'serverTime'>> {
    return agentsRegistrationService.processHeartbeat(agentId, input, agentVersion);
  }

  refreshAgentToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    return agentsRegistrationService.refreshAgentToken(refreshToken);
  }

  // --- CRUD ---
  listAgents(params: ListAgentsParams) {
    return agentsCrudService.listAgents(params);
  }

  getAgentById(id: string): Promise<AgentResponse> {
    return agentsCrudService.getAgentById(id);
  }

  updateAgent(id: string, data: { name?: string; tags?: string[] }): Promise<AgentResponse> {
    return agentsCrudService.updateAgent(id, data);
  }

  deleteAgent(id: string): Promise<void> {
    return agentsCrudService.deleteAgent(id);
  }

  getAgentConfig(agentId: string): Promise<AgentConfig> {
    return agentsCrudService.getAgentConfig(agentId);
  }

  getAgentDownloads(): Promise<AgentDownloadResponse[]> {
    return agentsCrudService.getAgentDownloads();
  }

  getAgentVersions(): Promise<AgentVersionResponse[]> {
    return agentsCrudService.getAgentVersions();
  }

  getLatestAgentVersion(platform: string) {
    return agentsCrudService.getLatestAgentVersion(platform);
  }

  getAgentVersionById(id: string) {
    return agentsCrudService.getAgentVersionById(id);
  }

  updateAgentVersionFile(id: string, filePath: string, fileSize: number, checksum?: string) {
    return agentsCrudService.updateAgentVersionFile(id, filePath, fileSize, checksum);
  }

  createAgentVersion(input: CreateAgentVersionInput): Promise<AgentVersionResponse> {
    return agentsCrudService.createAgentVersion(input);
  }

  updateAgentVersion(id: string, input: UpdateAgentVersionInput): Promise<AgentVersionResponse> {
    return agentsCrudService.updateAgentVersion(id, input);
  }

  deleteAgentVersion(id: string) {
    return agentsCrudService.deleteAgentVersion(id);
  }

  getLatestAgentVersionForPlatform(platform: string, architecture: string): Promise<AgentVersionResponse> {
    return agentsCrudService.getLatestAgentVersionForPlatform(platform, architecture);
  }

  listAgentVersionsFiltered(params: { platform?: string; deprecated?: string }) {
    return agentsCrudService.listAgentVersionsFiltered(params);
  }

  incrementDownloadCount(id: string) {
    return agentsCrudService.incrementDownloadCount(id);
  }

  // --- Commands ---
  getAgentCommands(agentId: string): Promise<CommandResponse[]> {
    return agentsCommandsService.getAgentCommands(agentId);
  }

  getAgentErrors(filters: {
    agentId?: string;
    commandType?: string;
    from?: string;
    to?: string;
    page: number;
    limit: number;
  }) {
    return agentsCommandsService.getAgentErrors(filters);
  }

  getPendingCommands(agentId: string): Promise<PendingCommand[]> {
    return agentsCommandsService.getPendingCommands(agentId);
  }

  updateCommandResult(commandId: string, input: CommandResultInput): Promise<void> {
    return agentsCommandsService.updateCommandResult(commandId, input);
  }

  queueInventoryRefresh(agentId: string): Promise<{ id: string; status: string }> {
    return agentsCommandsService.queueInventoryRefresh(agentId);
  }

  triggerCollection(agentId: string, type?: string): Promise<{ commandId: string; status: string; type: string }> {
    return agentsCommandsService.triggerCollection(agentId, type);
  }

  triggerAgentUpdate(agentId: string, input: {
    downloadUrl: string;
    checksum: string;
    version: string;
  }): Promise<{ commandId: string; status: string }> {
    return agentsCommandsService.triggerAgentUpdate(agentId, input);
  }

  bulkUpdateAgents(versionId?: string): Promise<{ agentsQueued: number; warnings?: string[] }> {
    return agentsCommandsService.bulkUpdateAgents(versionId);
  }

  storeAgentLogs(agentId: string, logData: Record<string, unknown>): Promise<void> {
    return agentsCommandsService.storeAgentLogs(agentId, logData);
  }

  getAgentLogs(agentId: string): Promise<unknown> {
    return agentsCommandsService.getAgentLogs(agentId);
  }

  createCommand(
    agentId: string,
    type: string,
    payload?: Record<string, unknown>,
    scheduledAt?: Date
  ): Promise<{ id: string; type: string; status: string }> {
    return agentsCommandsService.createCommand(agentId, type, payload, scheduledAt);
  }

  createBatchCommands(
    commands: Array<{
      agentId: string;
      type: string;
      payload?: Record<string, unknown>;
    }>
  ): Promise<Map<string, string>> {
    return agentsCommandsService.createBatchCommands(commands);
  }

  // --- Inventory & Telemetry ---
  processInventory(agentId: string, inventory: InventoryInput): Promise<void> {
    return agentsInventoryService.processInventory(agentId, inventory);
  }

  processTelemetry(agentId: string, telemetry: Record<string, unknown>): Promise<void> {
    return agentsInventoryService.processTelemetry(agentId, telemetry);
  }

  getLatestTelemetry(agentId: string) {
    return agentsInventoryService.getLatestTelemetry(agentId);
  }
}

export const agentsService = new AgentsService();
