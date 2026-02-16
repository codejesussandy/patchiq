/**
 * Typed server settings interface and helper for R1: Server Settings Runtime Enforcement.
 * Separated from settings.service.ts to avoid concurrent edit conflicts.
 */

import { rootLogger } from '@shared/services/logger';
import { settingsService } from './settings.service';

export interface ServerSettings {
  sessionTimeout: boolean;
  sessionTimeoutMinutes: number;
  sessionIdleTimeoutMinutes: number;
  endpointOnlineStatusTimeoutHours: number;
  endpointScanJobTimeoutHours: number;
  logLevel: string;
}

const SERVER_SETTINGS_DEFAULTS: ServerSettings = {
  sessionTimeout: true,
  sessionTimeoutMinutes: 60,
  sessionIdleTimeoutMinutes: 15,
  endpointOnlineStatusTimeoutHours: 1,
  endpointScanJobTimeoutHours: 1,
  logLevel: 'Info',
};

const LOG_LEVEL_MAP: Record<string, string> = {
  Debug: 'debug',
  Info: 'info',
  Warning: 'warn',
  Error: 'error',
};

/**
 * Get server settings with typed return value.
 * Wraps settingsService.getServerSettings() and casts to ServerSettings.
 */
export async function getTypedServerSettings(): Promise<ServerSettings> {
  const raw = await settingsService.getServerSettings();
  return {
    ...SERVER_SETTINGS_DEFAULTS,
    ...raw,
  } as ServerSettings;
}

/**
 * R1C: Apply runtime log level change.
 * Call this after server settings are updated with a new logLevel.
 */
export function applyRuntimeLogLevel(logLevel: string): void {
  const pinoLevel = LOG_LEVEL_MAP[logLevel];
  if (pinoLevel) {
    rootLogger.level = pinoLevel;
  }
}
