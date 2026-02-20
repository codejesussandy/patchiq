import { test as base } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Custom test fixture that loads saved auth state from auth.json.
 */
export const test = base.extend({});

export { expect } from '@playwright/test';

export const AUTH_FILE = path.join(__dirname, '..', 'auth.json');
