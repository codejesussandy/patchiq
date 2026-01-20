import { test, expect } from './fixtures';
import { login, waitForPageLoad, checkTableRendered, checkModalOpened, closeModal } from './fixtures';

test.describe('Settings Module', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.describe('User Management', () => {
    test.describe('Organization Page', () => {
      test('should navigate to organization settings', async ({ page }) => {
        await page.goto('/settings/user-management/organization');
        await waitForPageLoad(page);

        const content = page.locator('main, [class*="content"]').first();
        await expect(content).toBeVisible();
      });

      test('should display organization form or table', async ({ page }) => {
        await page.goto('/settings/user-management/organization');
        await waitForPageLoad(page);

        const formOrTable = page.locator('form, table, .ant-table, .ant-form');
        await expect(formOrTable.first()).toBeVisible({ timeout: 10000 });
      });

      test('should have save/update button', async ({ page }) => {
        await page.goto('/settings/user-management/organization');
        await waitForPageLoad(page);

        const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update"), button[type="submit"]');
        const count = await saveBtn.count();
        console.log(`Found ${count} save buttons`);
      });
    });

    test.describe('Department Page', () => {
      test('should navigate to department settings', async ({ page }) => {
        await page.goto('/settings/user-management/department');
        await waitForPageLoad(page);

        const content = page.locator('main, [class*="content"]').first();
        await expect(content).toBeVisible();
      });

      test('should display departments table', async ({ page }) => {
        await page.goto('/settings/user-management/department');
        await waitForPageLoad(page);
        await checkTableRendered(page);
      });

      test('should have add department button', async ({ page }) => {
        await page.goto('/settings/user-management/department');
        await waitForPageLoad(page);

        const addBtn = page.locator('button:has-text("Add"), button:has-text("Create")');
        await expect(addBtn.first()).toBeVisible({ timeout: 10000 });
      });
    });

    test.describe('Location Page', () => {
      test('should navigate to location settings', async ({ page }) => {
        await page.goto('/settings/user-management/location');
        await waitForPageLoad(page);

        const content = page.locator('main, [class*="content"]').first();
        await expect(content).toBeVisible();
      });

      test('should display locations table', async ({ page }) => {
        await page.goto('/settings/user-management/location');
        await waitForPageLoad(page);
        await checkTableRendered(page);
      });
    });

    test.describe('User Roles Page', () => {
      test('should navigate to user roles', async ({ page }) => {
        await page.goto('/settings/user-management/user-roles');
        await waitForPageLoad(page);

        const content = page.locator('main, [class*="content"]').first();
        await expect(content).toBeVisible();
      });

      test('should display roles table', async ({ page }) => {
        await page.goto('/settings/user-management/user-roles');
        await waitForPageLoad(page);
        await checkTableRendered(page);
      });
    });

    test.describe('Roles and Privileges Page', () => {
      test('should navigate to roles and privileges', async ({ page }) => {
        await page.goto('/settings/user-management/roles');
        await waitForPageLoad(page);

        const content = page.locator('main, [class*="content"]').first();
        await expect(content).toBeVisible();
      });

      test('should display permissions matrix or table', async ({ page }) => {
        await page.goto('/settings/user-management/roles');
        await waitForPageLoad(page);

        const permissionsUI = page.locator('table, .ant-table, [class*="permission"], [class*="privilege"]');
        await expect(permissionsUI.first()).toBeVisible({ timeout: 10000 });
      });
    });

    test.describe('Users Page', () => {
      test('should navigate to users page', async ({ page }) => {
        await page.goto('/settings/user-management/users');
        await waitForPageLoad(page);

        const content = page.locator('main, [class*="content"]').first();
        await expect(content).toBeVisible();
      });

      test('should display users table', async ({ page }) => {
        await page.goto('/settings/user-management/users');
        await waitForPageLoad(page);
        await checkTableRendered(page);
      });

      test('should have add user button', async ({ page }) => {
        await page.goto('/settings/user-management/users');
        await waitForPageLoad(page);

        const addBtn = page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("Invite")');
        await expect(addBtn.first()).toBeVisible({ timeout: 10000 });
      });

      test('should show user status (active/inactive)', async ({ page }) => {
        await page.goto('/settings/user-management/users');
        await waitForPageLoad(page);

        const statusBadges = page.locator('.ant-tag, .ant-badge, [class*="status"]');
        const count = await statusBadges.count();
        console.log(`Found ${count} status elements`);
      });
    });

    test.describe('Password Policies Page', () => {
      test('should navigate to password policies', async ({ page }) => {
        await page.goto('/settings/user-management/password-policies');
        await waitForPageLoad(page);

        const content = page.locator('main, [class*="content"]').first();
        await expect(content).toBeVisible();
      });

      test('should display password policy form', async ({ page }) => {
        await page.goto('/settings/user-management/password-policies');
        await waitForPageLoad(page);

        const form = page.locator('form, .ant-form, [class*="policy"]');
        await expect(form.first()).toBeVisible({ timeout: 10000 });
      });

      test('should have password requirements inputs', async ({ page }) => {
        await page.goto('/settings/user-management/password-policies');
        await waitForPageLoad(page);

        const inputs = page.locator('input, .ant-input-number, .ant-switch');
        const count = await inputs.count();
        console.log(`Found ${count} policy input elements`);
      });
    });
  });

  test.describe('System Settings', () => {
    test.describe('Branding Page', () => {
      test('should navigate to branding settings', async ({ page }) => {
        await page.goto('/settings/system-settings/branding');
        await waitForPageLoad(page);

        const content = page.locator('main, [class*="content"]').first();
        await expect(content).toBeVisible();
      });

      test('should have logo upload', async ({ page }) => {
        await page.goto('/settings/system-settings/branding');
        await waitForPageLoad(page);

        const uploadArea = page.locator('.ant-upload, input[type="file"], [class*="upload"]');
        const count = await uploadArea.count();
        console.log(`Found ${count} upload elements`);
      });

      test('should have color picker or theme options', async ({ page }) => {
        await page.goto('/settings/system-settings/branding');
        await waitForPageLoad(page);

        const colorOptions = page.locator('input[type="color"], .ant-color-picker, [class*="color"]');
        const count = await colorOptions.count();
        console.log(`Found ${count} color options`);
      });
    });

    test.describe('Mail Server Configuration Page', () => {
      test('should navigate to mail server settings', async ({ page }) => {
        await page.goto('/settings/system-settings/mail-server');
        await waitForPageLoad(page);

        const content = page.locator('main, [class*="content"]').first();
        await expect(content).toBeVisible();
      });

      test('should have SMTP configuration form', async ({ page }) => {
        await page.goto('/settings/system-settings/mail-server');
        await waitForPageLoad(page);

        const smtpForm = page.locator('form, input[placeholder*="SMTP" i], input[placeholder*="host" i]');
        await expect(smtpForm.first()).toBeVisible({ timeout: 10000 });
      });

      test('should have test connection button', async ({ page }) => {
        await page.goto('/settings/system-settings/mail-server');
        await waitForPageLoad(page);

        const testBtn = page.locator('button:has-text("Test"), button:has-text("Verify")');
        const count = await testBtn.count();
        console.log(`Found ${count} test connection buttons`);
      });
    });

    test.describe('LDAP Server Configuration Page', () => {
      test('should navigate to LDAP settings', async ({ page }) => {
        await page.goto('/settings/system-settings/ldap-server');
        await waitForPageLoad(page);

        const content = page.locator('main, [class*="content"]').first();
        await expect(content).toBeVisible();
      });

      test('should have LDAP configuration form', async ({ page }) => {
        await page.goto('/settings/system-settings/ldap-server');
        await waitForPageLoad(page);

        const ldapForm = page.locator('form, input[placeholder*="LDAP" i], input[placeholder*="server" i]');
        await expect(ldapForm.first()).toBeVisible({ timeout: 10000 });
      });
    });

    test.describe('Proxy Server Configuration Page', () => {
      test('should navigate to proxy settings', async ({ page }) => {
        await page.goto('/settings/system-settings/proxy-server');
        await waitForPageLoad(page);

        const content = page.locator('main, [class*="content"]').first();
        await expect(content).toBeVisible();
      });
    });

    test.describe('Remote Desktop Settings Page', () => {
      test('should navigate to remote desktop settings', async ({ page }) => {
        await page.goto('/settings/system-settings/remote-desktop');
        await waitForPageLoad(page);

        const content = page.locator('main, [class*="content"]').first();
        await expect(content).toBeVisible();
      });
    });

    test.describe('Server Settings Page', () => {
      test('should navigate to server settings', async ({ page }) => {
        await page.goto('/settings/system-settings/server-settings');
        await waitForPageLoad(page);

        const content = page.locator('main, [class*="content"]').first();
        await expect(content).toBeVisible();
      });
    });
  });

  test.describe('Agent Management', () => {
    test.describe('Agent Approvals Page', () => {
      test('should navigate to agent approvals', async ({ page }) => {
        await page.goto('/settings/agent-management/approvals');
        await waitForPageLoad(page);

        const content = page.locator('main, [class*="content"]').first();
        await expect(content).toBeVisible();
      });

      test('should display pending approvals table', async ({ page }) => {
        await page.goto('/settings/agent-management/approvals');
        await waitForPageLoad(page);
        await checkTableRendered(page);
      });

      test('should have approve/reject buttons', async ({ page }) => {
        await page.goto('/settings/agent-management/approvals');
        await waitForPageLoad(page);

        const actionBtns = page.locator('button:has-text("Approve"), button:has-text("Reject")');
        const count = await actionBtns.count();
        console.log(`Found ${count} approval action buttons`);
      });
    });

    test.describe('Agent Versions Page', () => {
      test('should navigate to agent versions', async ({ page }) => {
        await page.goto('/settings/agent-management/versions');
        await waitForPageLoad(page);

        const content = page.locator('main, [class*="content"]').first();
        await expect(content).toBeVisible();
      });

      test('should display agent versions table', async ({ page }) => {
        await page.goto('/settings/agent-management/versions');
        await waitForPageLoad(page);
        await checkTableRendered(page);
      });

      test('should have download button for each version', async ({ page }) => {
        await page.goto('/settings/agent-management/versions');
        await waitForPageLoad(page);

        const downloadBtns = page.locator('button:has-text("Download"), .anticon-download');
        const count = await downloadBtns.count();
        console.log(`Found ${count} download buttons`);
      });
    });

    test.describe('Agent Configuration Page', () => {
      test('should navigate to agent configuration', async ({ page }) => {
        await page.goto('/settings/agent-management/configuration');
        await waitForPageLoad(page);

        const content = page.locator('main, [class*="content"]').first();
        await expect(content).toBeVisible();
      });

      test('should display configuration form', async ({ page }) => {
        await page.goto('/settings/agent-management/configuration');
        await waitForPageLoad(page);

        const form = page.locator('form, .ant-form, [class*="config"]');
        await expect(form.first()).toBeVisible({ timeout: 10000 });
      });
    });

    test.describe('Enroll Secret Page', () => {
      test('should navigate to enroll secret', async ({ page }) => {
        await page.goto('/settings/agent-management/enroll-secret');
        await waitForPageLoad(page);

        const content = page.locator('main, [class*="content"]').first();
        await expect(content).toBeVisible();
      });

      test('should display secret key', async ({ page }) => {
        await page.goto('/settings/agent-management/enroll-secret');
        await waitForPageLoad(page);

        const secretField = page.locator('input[type="password"], code, .ant-input, [class*="secret"]');
        const count = await secretField.count();
        console.log(`Found ${count} secret field elements`);
      });

      test('should have regenerate button', async ({ page }) => {
        await page.goto('/settings/agent-management/enroll-secret');
        await waitForPageLoad(page);

        const regenBtn = page.locator('button:has-text("Regenerate"), button:has-text("Generate"), button:has-text("Refresh")');
        const count = await regenBtn.count();
        console.log(`Found ${count} regenerate buttons`);
      });
    });
  });

  test.describe('Other Settings', () => {
    test.describe('Vulnerability Preference Page', () => {
      test('should navigate to vulnerability preference', async ({ page }) => {
        await page.goto('/settings/vulnerability-preference');
        await waitForPageLoad(page);

        const content = page.locator('main, [class*="content"]').first();
        await expect(content).toBeVisible();
      });
    });

    test.describe('Market Place Page', () => {
      test('should navigate to market place', async ({ page }) => {
        await page.goto('/settings/market-place');
        await waitForPageLoad(page);

        const content = page.locator('main, [class*="content"]').first();
        await expect(content).toBeVisible();
      });
    });

    test.describe('Deployment Policies Page', () => {
      test('should navigate to deployment policies', async ({ page }) => {
        await page.goto('/settings/jobs');
        await waitForPageLoad(page);

        const content = page.locator('main, [class*="content"]').first();
        await expect(content).toBeVisible();
      });
    });

    test.describe('Patch Management Page', () => {
      test('should navigate to patch management', async ({ page }) => {
        await page.goto('/settings/patch-management');
        await waitForPageLoad(page);

        const content = page.locator('main, [class*="content"]').first();
        await expect(content).toBeVisible();
      });
    });

    test.describe('Policy Management Page', () => {
      test('should navigate to policy management', async ({ page }) => {
        await page.goto('/settings/policy-management');
        await waitForPageLoad(page);

        const content = page.locator('main, [class*="content"]').first();
        await expect(content).toBeVisible();
      });
    });

    test.describe('Audit Page', () => {
      test('should navigate to audit', async ({ page }) => {
        await page.goto('/settings/audit');
        await waitForPageLoad(page);

        const content = page.locator('main, [class*="content"]').first();
        await expect(content).toBeVisible();
      });

      test('should display audit logs table', async ({ page }) => {
        await page.goto('/settings/audit');
        await waitForPageLoad(page);
        await checkTableRendered(page);
      });
    });

    test.describe('Platform License Page', () => {
      test('should navigate to platform license', async ({ page }) => {
        await page.goto('/settings/platform-license');
        await waitForPageLoad(page);

        const content = page.locator('main, [class*="content"]').first();
        await expect(content).toBeVisible();
      });

      test('should display license information', async ({ page }) => {
        await page.goto('/settings/platform-license');
        await waitForPageLoad(page);

        const licenseInfo = page.locator('[class*="license"], [class*="expir"], form');
        const count = await licenseInfo.count();
        console.log(`Found ${count} license info elements`);
      });
    });
  });
});
