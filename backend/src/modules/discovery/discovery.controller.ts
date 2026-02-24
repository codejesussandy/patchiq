import { Request, Response, NextFunction } from 'express';
import { sendSuccess, typedQuery } from '@shared/utils';
import { DiscoveryService } from './discovery.service';
import type {
  ListIPRangesQuery,
  CreateIPRangeInput,
  UpdateIPRangeInput,
  ListCredentialsQuery,
  CreateCredentialInput,
  UpdateCredentialInput,
  TestCredentialInput,
  GetScanResultsQuery,
  ListDiscoveredDevicesQuery,
  EnrollDeviceInput,
  GetCredentialQuery,
} from './discovery.validators';

export class DiscoveryController {
  private discoveryService: DiscoveryService;

  constructor() {
    this.discoveryService = new DiscoveryService();
  }

  // ==================== IP Ranges ====================

  /**
   * GET /v1/discovery/ip-ranges
   * List all IP ranges
   */
  listIPRanges = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = typedQuery<ListIPRangesQuery>(req);
      const result = await this.discoveryService.listIPRanges({
        page: query.page,
        limit: query.limit,
        search: query.search,
        status: query.status,
      });
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /v1/discovery/ip-ranges/:id
   * Get a single IP range
   */
  getIPRange = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const range = await this.discoveryService.getIPRangeById(id);
      sendSuccess(res, range);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /v1/discovery/ip-ranges
   * Create a new IP range
   */
  createIPRange = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = req.body as CreateIPRangeInput;
      const range = await this.discoveryService.createIPRange(data);
      sendSuccess(res, range, 201);
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /v1/discovery/ip-ranges/:id
   * Update an IP range
   */
  updateIPRange = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const data = req.body as UpdateIPRangeInput;
      const range = await this.discoveryService.updateIPRange(id, data);
      sendSuccess(res, range);
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /v1/discovery/ip-ranges/:id
   * Delete an IP range
   */
  deleteIPRange = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      await this.discoveryService.deleteIPRange(id);
      sendSuccess(res, { message: 'IP range deleted successfully' });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /v1/discovery/ip-ranges/:id/scan
   * Trigger a scan for an IP range
   */
  triggerScan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.discoveryService.triggerScan(id);
      sendSuccess(res, result, 202);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /v1/discovery/scans/:id
   * Get scan status
   */
  getScanStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const scan = await this.discoveryService.getScanStatus(id);
      sendSuccess(res, scan);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /v1/discovery/scans/:id/cancel
   * Cancel a running or pending scan
   */
  cancelScan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.discoveryService.cancelScan(id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /v1/discovery/scans/:id/results
   * Get scan results
   */
  getScanResults = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const query = typedQuery<GetScanResultsQuery>(req);
      const result = await this.discoveryService.getScanResults(id, {
        page: query.page,
        limit: query.limit,
      });
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  // ==================== Device Credentials ====================

  /**
   * GET /v1/discovery/credentials
   * List all credentials
   */
  listCredentials = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = typedQuery<ListCredentialsQuery>(req);
      const result = await this.discoveryService.listCredentials({
        page: query.page,
        limit: query.limit,
        search: query.search,
        type: query.type,
      });
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /v1/discovery/credentials/:id
   * Get a single credential
   */
  getCredential = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { showPassword } = typedQuery<GetCredentialQuery>(req);
      const credential = await this.discoveryService.getCredentialById(id, showPassword ?? false);
      sendSuccess(res, credential);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /v1/discovery/credentials
   * Create a new credential
   */
  createCredential = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = req.body as CreateCredentialInput;
      const userId = req.user?.id;
      const credential = await this.discoveryService.createCredential(data, userId);
      sendSuccess(res, credential, 201);
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /v1/discovery/credentials/:id
   * Update a credential
   */
  updateCredential = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const data = req.body as UpdateCredentialInput;
      const credential = await this.discoveryService.updateCredential(id, data);
      sendSuccess(res, credential);
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /v1/discovery/credentials/:id
   * Delete a credential
   */
  deleteCredential = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      await this.discoveryService.deleteCredential(id);
      sendSuccess(res, { message: 'Credential deleted successfully' });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /v1/discovery/credentials/:id/test
   * Test a credential against a target host
   */
  testCredential = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const data = req.body as TestCredentialInput;
      const result = await this.discoveryService.testCredential(id, data);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  // ==================== Discovered Devices ====================

  /**
   * GET /v1/discovery/devices
   * List discovered devices
   */
  listDiscoveredDevices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = typedQuery<ListDiscoveredDevicesQuery>(req);
      const result = await this.discoveryService.listDiscoveredDevices({
        page: query.page,
        limit: query.limit,
        ipRangeId: query.ipRangeId,
        status: query.status,
        search: query.search,
      });
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /v1/discovery/devices/:id/enroll
   * Enroll a discovered device as an asset
   */
  enrollDevice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const data = req.body as EnrollDeviceInput;
      const result = await this.discoveryService.enrollDevice(id, data);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  };
}

export const discoveryController = new DiscoveryController();
