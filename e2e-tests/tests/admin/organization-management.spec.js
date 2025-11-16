const { test, expect } = require('@playwright/test');
const { AuthHelper } = require('../utils/auth');

test.describe('Super Admin - Organization Management', () => {
  let authHelper;
  let createdOrgIds = [];

  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000); // Increase timeout for login
    authHelper = new AuthHelper(page);
    await authHelper.loginAsSuperAdmin();
  });

  test.afterEach(async ({ page }) => {
    // Cleanup created organizations
    for (const orgId of createdOrgIds) {
      try {
        await page.goto(`/backoffice/organizations/${orgId}`);
        await page.click('[data-testid="delete-org-button"]');
        await page.click('[data-testid="confirm-delete"]');
      } catch (error) {
        console.warn(`Failed to cleanup org ${orgId}:`, error.message);
      }
    }
    createdOrgIds = [];
    
    await authHelper.logout();
  });

  test('should create new organization', async ({ page }) => {
    test.skip(!process.env.TEST_SUPER_ADMIN_EMAIL, 'Super admin credentials not configured');
    
    const timestamp = Date.now();
    const testOrg = {
      name: `Test Organization ${timestamp}`,
      description: 'E2E test organization',
      email: `org-${timestamp}@test.com`,
      phone: '+1234567890',
      address: '123 Test Street',
      city: 'Test City',
      country: 'Test Country'
    };
    
    // Navigate to organizations page
    await page.goto('/backoffice/organizations');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Extra wait for React to render
    
    // Click create organization button with multiple strategies
    const createButtonSelectors = [
      'button.btn-create-org',
      'button.btn-primary',
      '[data-testid="create-org-button"]',
      'button:has-text("Create")',
      'button:has-text("New Organization")',
      'a:has-text("Create")'
    ];
    
    let clicked = false;
    for (const selector of createButtonSelectors) {
      const button = page.locator(selector).first();
      const count = await button.count();
      
      if (count > 0) {
        const isVisible = await button.isVisible().catch(() => false);
        if (isVisible) {
          console.log(`Clicking create button with selector: ${selector}`);
          try {
            await button.click({ timeout: 5000 });
            clicked = true;
            break;
          } catch (e) {
            console.log(`Click failed with ${selector}, trying next...`);
          }
        }
      }
    }
    
    if (!clicked) {
      throw new Error('Could not find or click create organization button');
    }
    
    // Fill organization form
    await page.fill('[data-testid="org-name"], input[name="name"]', testOrg.name);
    await page.fill('[data-testid="org-description"], textarea[name="description"]', testOrg.description);
    await page.fill('[data-testid="org-email"], input[name="email"]', testOrg.email);
    await page.fill('[data-testid="org-phone"], input[name="phone"]', testOrg.phone);
    await page.fill('[data-testid="org-address"], input[name="address"]', testOrg.address);
    await page.fill('[data-testid="org-city"], input[name="city"]', testOrg.city);
    await page.fill('[data-testid="org-country"], input[name="country"]', testOrg.country);
    
    // Submit form
    await page.click('[data-testid="save-org-button"], button[type="submit"]:has-text("Save")');
    
    // Wait for success message or redirect
    await page.waitForURL(/\/backoffice\/organizations\/.*/, { timeout: 15000 });
    
    // Should show organization details
    await expect(page.locator('h1, h2')).toContainText(testOrg.name);
    
    // Extract org ID for cleanup
    const url = page.url();
    const orgId = url.split('/').pop();
    createdOrgIds.push(orgId);
  });

  test('should list all organizations', async ({ page }) => {
    test.skip(!process.env.TEST_SUPER_ADMIN_EMAIL, 'Super admin credentials not configured');
    
    await page.goto('/backoffice/organizations');
    
    // Should show organizations table/list
    await expect(page.locator('[data-testid="organizations-list"], table, .org-list')).toBeVisible();
    
    // Should have create button
    await expect(page.locator('button.btn-create-org, button.btn-primary:has-text("Create")')).toBeVisible();
  });

  test('should edit organization', async ({ page }) => {
    test.skip(!process.env.TEST_SUPER_ADMIN_EMAIL, 'Super admin credentials not configured');
    
    const timestamp = Date.now();
    const testOrg = {
      name: `Test Org ${timestamp}`,
      description: 'Original description',
      email: `org-${timestamp}@test.com`
    };
    
    // Create organization first
    await page.goto('/backoffice/organizations');
    await page.click('button.btn-create-org, button.btn-primary:has-text("Create")');
    
    await page.fill('[data-testid="org-name"], input[name="name"]', testOrg.name);
    await page.fill('[data-testid="org-description"], textarea[name="description"]', testOrg.description);
    await page.fill('[data-testid="org-email"], input[name="email"]', testOrg.email);
    
    await page.click('[data-testid="save-org-button"], button[type="submit"]:has-text("Save")');
    await page.waitForURL(/\/backoffice\/organizations\/.*/);
    
    const url = page.url();
    const orgId = url.split('/').pop();
    createdOrgIds.push(orgId);
    
    // Edit organization
    await page.click('[data-testid="edit-org-button"], button:has-text("Edit")');
    
    const updatedDescription = 'Updated description';
    await page.fill('[data-testid="org-description"], textarea[name="description"]', updatedDescription);
    await page.click('[data-testid="save-org-button"], button[type="submit"]:has-text("Save")');
    
    // Should show updated description
    await expect(page.locator('body')).toContainText(updatedDescription);
  });

  test('should add members to organization', async ({ page }) => {
    test.skip(!process.env.TEST_SUPER_ADMIN_EMAIL, 'Super admin credentials not configured');
    
    const timestamp = Date.now();
    const testOrg = {
      name: `Test Org ${timestamp}`,
      email: `org-${timestamp}@test.com`
    };
    
    // Create organization
    await page.goto('/backoffice/organizations');
    await page.click('button.btn-create-org, button.btn-primary:has-text("Create")');
    
    await page.fill('[data-testid="org-name"], input[name="name"]', testOrg.name);
    await page.fill('[data-testid="org-email"], input[name="email"]', testOrg.email);
    await page.click('[data-testid="save-org-button"], button[type="submit"]:has-text("Save")');
    
    await page.waitForURL(/\/backoffice\/organizations\/.*/);
    const url = page.url();
    const orgId = url.split('/').pop();
    createdOrgIds.push(orgId);
    
    // Add member
    await page.click('[data-testid="members-tab"], a:has-text("Members")');
    await page.click('[data-testid="add-member-button"], button:has-text("Add Member")');
    
    const memberEmail = `member-${timestamp}@test.com`;
    await page.fill('[data-testid="member-email"], input[name="email"]', memberEmail);
    await page.selectOption('[data-testid="member-role"], select[name="role"]', 'admin');
    await page.click('[data-testid="save-member-button"], button[type="submit"]:has-text("Add")');
    
    // Should show member in list
    await expect(page.locator('[data-testid="members-list"], .members-list')).toContainText(memberEmail);
  });

  test('should delete organization', async ({ page }) => {
    test.skip(!process.env.TEST_SUPER_ADMIN_EMAIL, 'Super admin credentials not configured');
    
    const timestamp = Date.now();
    const testOrg = {
      name: `Test Org To Delete ${timestamp}`,
      email: `org-delete-${timestamp}@test.com`
    };
    
    // Create organization
    await page.goto('/backoffice/organizations');
    await page.click('button.btn-create-org, button.btn-primary:has-text("Create")');
    
    await page.fill('[data-testid="org-name"], input[name="name"]', testOrg.name);
    await page.fill('[data-testid="org-email"], input[name="email"]', testOrg.email);
    await page.click('[data-testid="save-org-button"], button[type="submit"]:has-text("Save")');
    
    await page.waitForURL(/\/backoffice\/organizations\/.*/);
    
    // Delete organization
    await page.click('[data-testid="delete-org-button"], button:has-text("Delete")');
    await page.click('[data-testid="confirm-delete"], button:has-text("Confirm")');
    
    // Should redirect to organizations list
    await page.waitForURL(/\/backoffice\/organizations$/);
    
    // Should not show deleted organization
    await expect(page.locator('body')).not.toContainText(testOrg.name);
  });
});
