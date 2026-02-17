import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'auth-flows.spec.ts',
  fullyParallel: false, // Run tests sequentially for auth flow
  forbidOnly: !!process.env.CI,
  retries: 0, // No retries for clearer results
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report-auth' }],
    ['list'],
    ['json', { outputFile: 'playwright-report-auth/results.json' }]
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],
  // Do not start web server - expect services to be running already
  expect: {
    timeout: 10000,
  },
  timeout: 60000,
});
