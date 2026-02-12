/**
 * Centralized localStorage key constants.
 * DO NOT hardcode storage keys - always import from here.
 */
export const STORAGE_KEYS = {
  // Authentication
  AUTH: {
    ACCESS_TOKEN: 'accessToken',
    REFRESH_TOKEN: 'refreshToken',
  },

  // Table configurations (dynamic keys)
  TABLE: {
    COLUMN_CONFIG: (tableName: string) => `column-config-${tableName}`,
  },
} as const;

// Type-safe helper
export type StorageKey =
  | typeof STORAGE_KEYS.AUTH[keyof typeof STORAGE_KEYS.AUTH]
  | string; // Allow dynamic keys like table configs
