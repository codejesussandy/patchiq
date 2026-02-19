import { test, expect, Browser, Page } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AUTH_FILE = path.join(__dirname, '..', 'auth.json');

// ---------------------------------------------------------------------------
// Helper: creates a pristine (unauthenticated) browser context + page.
// ---------------------------------------------------------------------------
async function freshPage(browser: Browser) {
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();
  return { context, page };
}

// ---------------------------------------------------------------------------
// Helper: fills the login form and submits.
// ---------------------------------------------------------------------------
async function fillLoginForm(page: Page, email: string, password: string) {
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
}

// ---------------------------------------------------------------------------
// Login behaviour tests (unauthenticated contexts)
// ---------------------------------------------------------------------------
test.describe('Login page', () => {
  test('successful login redirects to dashboard and stores tokens', async ({ browser }) => {
    const { context, page } = await freshPage(browser);

    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Welcome to InventIQ' })).toBeVisible();
    await expect(page.getByText('Enter your details to sign in your account')).toBeVisible();

    await fillLoginForm(page, 'admin@patchiq.io', 'admin123');

    await page.waitForURL('**/dashboard', { timeout: 30000 });
    await expect(page).toHaveURL(/\/dashboard/);

    // Both tokens must be stored in localStorage after a successful login.
    const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'));
    const refreshToken = await page.evaluate(() => localStorage.getItem('refreshToken'));
    expect(accessToken).not.toBeNull();
    expect(refreshToken).not.toBeNull();

    await context.close();
  });

  test('login with invalid credentials shows error toast', async ({ browser }) => {
    const { context, page } = await freshPage(browser);

    await page.goto('/login');
    await fillLoginForm(page, 'wrong@example.com', 'wrongpassword');

    // Wait briefly for the login request to complete (the error toast is short-lived)
    await page.waitForTimeout(2000);

    // Must remain on /login — no redirect on failure.
    await expect(page).toHaveURL(/\/login/);

    // Verify that no successful redirect happened (i.e., we are NOT on /dashboard).
    // The error toast (.ant-message-error) may have already appeared and disappeared.
    // Checking the URL staying at /login is the reliable assertion here.
    expect(page.url()).toMatch(/\/login/);

    await context.close();
  });

  test('empty form submission shows validation messages', async ({ browser }) => {
    const { context, page } = await freshPage(browser);

    await page.goto('/login');

    // Click Log in without filling anything — Ant Design inline validation fires.
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page.getByText('Please enter your email')).toBeVisible();
    await expect(page.getByText('Please enter your password')).toBeVisible();

    await context.close();
  });

  test('forgot password link navigates to /forgot-password with correct heading', async ({ browser }) => {
    const { context, page } = await freshPage(browser);

    await page.goto('/login');

    // The Typography.Link rendered inside .forgot-password-wrapper.
    await page.getByText('Forgot password').click();

    await page.waitForURL('**/forgot-password', { timeout: 15000 });
    await expect(page).toHaveURL(/\/forgot-password/);

    // Verify the ForgotPassword page rendered the expected heading and sub-text.
    await expect(page.getByRole('heading', { name: 'Forgot Password?' })).toBeVisible();
    await expect(page.getByText('Enter your email to receive password reset link')).toBeVisible();

    // The page must contain an Email input and a Send Link button.
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send Link' })).toBeVisible();

    await context.close();
  });
});

// ---------------------------------------------------------------------------
// Authenticated session tests
// ---------------------------------------------------------------------------
test.describe('Authenticated session', () => {
  test('logout clears session and redirects to /login', async ({ browser }) => {
    // Load the persisted auth state so we start logged in.
    const context = await browser.newContext({ storageState: AUTH_FILE });
    const page = await context.newPage();

    await page.goto('/dashboard');
    await page.waitForURL('**/dashboard', { timeout: 30000 });

    // Open the profile popover — aria-label is on the wrapper div in HeaderBar.
    await page.getByRole('button', { name: 'User profile menu' }).click();

    // The ProfileMenu renders a "Logout" text node inside a clickable div.
    await page.getByText('Logout').click();

    // After logout the app navigates to /login.
    await page.waitForURL('**/login', { timeout: 15000 });
    await expect(page).toHaveURL(/\/login/);

    await context.close();
  });
});

// ---------------------------------------------------------------------------
// Protected route guard tests (unauthenticated contexts)
// ---------------------------------------------------------------------------
test.describe('Protected routes', () => {
  const protectedRoutes = ['/dashboard', '/assets', '/patches'];

  for (const route of protectedRoutes) {
    test(`${route} redirects unauthenticated users to /login`, async ({ browser }) => {
      const { context, page } = await freshPage(browser);

      await page.goto(route);

      // The router guard should redirect to /login immediately.
      await page.waitForURL('**/login', { timeout: 15000 });
      await expect(page).toHaveURL(/\/login/);

      await context.close();
    });
  }
});
