import { Request, Response, NextFunction } from 'express';
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
      const query = req.query as unknown as ListIPRangesQuery;
      const result = await this.discoveryService.listIPRanges({
        page: query.page,
        limit: query.limit,
        search: query.search,
        status: query.status,
      });
      res.json(result);
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
      res.json(range);
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
      res.status(201).json(range);
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
      res.json(range);
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
      res.json({ success: true, message: 'IP range deleted successfully' });
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
      res.status(202).json(result);
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
      res.json(scan);
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
      const query = req.query as unknown as GetScanResultsQuery;
      const result = await this.discoveryService.getScanResults(id, {
        page: query.page,
        limit: query.limit,
      });
      res.json(result);
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
      const query = req.query as unknown as ListCredentialsQuery;
      const result = await this.discoveryService.listCredentials({
        page: query.page,
        limit: query.limit,
        search: query.search,
        type: query.type,
      });
      res.json(result);
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
      const showPassword = req.query.showPassword === 'true';
      const credential = await this.discoveryService.getCredentialById(id, showPassword);
      res.json(credential);
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
      res.status(201).json(credential);
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
      res.json(credential);
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
      res.json({ success: true, message: 'Credential deleted successfully' });
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
      res.json(result);
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
      const query = req.query as unknown as ListDiscoveredDevicesQuery;
      const result = await this.discoveryService.listDiscoveredDevices({
        page: query.page,
        limit: query.limit,
        ipRangeId: query.ipRangeId,
        status: query.status,
        search: query.search,
      });
      res.json(result);
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
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };
}

export const discoveryController = new DiscoveryController();
