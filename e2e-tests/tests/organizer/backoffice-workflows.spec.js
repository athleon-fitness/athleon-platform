const { test, expect } = require('@playwright/test');
const { AuthHelper } = require('../utils/auth');
const { TestDataHelper } = require('../utils/testData');

test.describe('Organization User - Backoffice Workflows', () => {
  let authHelper;
  let createdEventIds = [];

  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000); // Increase timeout for login
    authHelper = new AuthHelper(page);
    await authHelper.loginAsOrganizer();
  });

  test.afterEach(async ({ page }) => {
    // Cleanup
    for (const eventId of createdEventIds) {
      try {
        await page.goto(`/backoffice/events/${eventId}`);
        await page.click('[data-testid="delete-event-button"]');
        await page.click('[data-testid="confirm-delete"]');
      } catch (error) {
        console.warn(`Failed to cleanup event ${eventId}:`, error.message);
      }
    }
    createdEventIds = [];
    
    await authHelper.logout();
  });

  test('should access backoffice dashboard', async ({ page }) => {
    test.skip(!process.env.TEST_ORGANIZER_EMAIL, 'Organizer credentials not configured');
    
    await page.goto('/backoffice');
    
    // Should see dashboard elements
    await expect(page.locator('h1, h2')).toContainText(/Dashboard|Events|Overview/i);
    
    // Should have navigation menu
    await expect(page.locator('[data-testid="nav-menu"], nav')).toBeVisible();
  });

  test('should NOT see organization management (permission check)', async ({ page }) => {
    test.skip(!process.env.TEST_ORGANIZER_EMAIL, 'Organizer credentials not configured');
    
    await page.goto('/backoffice');
    
    // Organization users should not see org management
    const orgLink = page.locator('a:has-text("Organizations"), [href*="/organizations"]');
    await expect(orgLink).toHaveCount(0);
    
    // Direct access should be forbidden
    await page.goto('/backoffice/organizations');
    await expect(page.locator('body')).toContainText(/Forbidden|Access Denied|403|Not Authorized/i);
  });

  test('should create complete event workflow', async ({ page }) => {
    test.skip(!process.env.TEST_ORGANIZER_EMAIL, 'Organizer credentials not configured');
    
    const timestamp = Date.now();
    const testEvent = {
      name: `E2E Test Event ${timestamp}`,
      description: 'Complete workflow test',
      startDate: '2025-12-01',
      endDate: '2025-12-03',
      location: 'Test Venue'
    };
    
    // Step 1: Create event
    await page.goto('/backoffice/events');
    await page.click('[data-testid="create-event-button"], button:has-text("Create Event")');
    
    await page.fill('[data-testid="event-name"], input[name="name"]', testEvent.name);
    await page.fill('[data-testid="event-description"], textarea[name="description"]', testEvent.description);
    await page.fill('[data-testid="event-start-date"], input[name="startDate"]', testEvent.startDate);
    await page.fill('[data-testid="event-end-date"], input[name="endDate"]', testEvent.endDate);
    await page.fill('[data-testid="event-location"], input[name="location"]', testEvent.location);
    
    await page.click('[data-testid="save-event-button"], button[type="submit"]:has-text("Save")');
    
    await page.waitForURL(/\/backoffice\/events\/.*/);
    const url = page.url();
    const eventId = url.split('/').pop();
    createdEventIds.push(eventId);
    
    // Step 2: Add categories
    await page.click('[data-testid="categories-tab"], a:has-text("Categories")');
    await page.click('[data-testid="add-category-button"], button:has-text("Add Category")');
    
    await page.fill('[data-testid="category-name"], input[name="name"]', 'RX Male');
    await page.fill('[data-testid="category-min-age"], input[name="minAge"]', '18');
    await page.fill('[data-testid="category-max-age"], input[name="maxAge"]', '99');
    await page.selectOption('[data-testid="category-gender"], select[name="gender"]', 'male');
    
    await page.click('[data-testid="save-category-button"], button[type="submit"]:has-text("Save")');
    
    // Step 3: Add WODs
    await page.click('[data-testid="wods-tab"], a:has-text("WODs")');
    await page.click('[data-testid="add-wod-button"], button:has-text("Add WOD")');
    
    await page.fill('[data-testid="wod-name"], input[name="name"]', 'WOD 1');
    await page.fill('[data-testid="wod-description"], textarea[name="description"]', 'For Time: 21-15-9 Thrusters & Pull-ups');
    await page.selectOption('[data-testid="wod-scoring"], select[name="scoringType"]', 'time');
    
    await page.click('[data-testid="save-wod-button"], button[type="submit"]:has-text("Save")');
    
    // Step 4: Generate schedule
    await page.click('[data-testid="schedule-tab"], a:has-text("Schedule")');
    await page.click('[data-testid="generate-schedule-button"], button:has-text("Generate Schedule")');
    
    // Configure schedule settings
    await page.fill('[data-testid="schedule-start-time"], input[name="startTime"]', '09:00');
    await page.fill('[data-testid="schedule-heat-duration"], input[name="heatDuration"]', '20');
    await page.fill('[data-testid="schedule-break-duration"], input[name="breakDuration"]', '5');
    
    await page.click('[data-testid="confirm-generate-schedule"], button:has-text("Generate")');
    
    // Wait for schedule generation
    await page.waitForSelector('[data-testid="schedule-generated"], .schedule-view', { timeout: 30000 });
    
    // Should show schedule
    await expect(page.locator('[data-testid="schedule-view"]')).toBeVisible();
    
    // Step 5: Publish event
    await page.click('[data-testid="event-details-tab"], a:has-text("Details")');
    await page.click('[data-testid="publish-event-button"], button:has-text("Publish")');
    await page.click('[data-testid="confirm-publish"], button:has-text("Confirm")');
    
    // Should show published status
    await expect(page.locator('[data-testid="event-status"]')).toContainText('Published');
  });

  test('should manage athletes registration', async ({ page }) => {
    test.skip(!process.env.TEST_ORGANIZER_EMAIL, 'Organizer credentials not configured');
    
    const timestamp = Date.now();
    
    // Create event first
    await page.goto('/backoffice/events');
    await page.click('[data-testid="create-event-button"]');
    
    await page.fill('[data-testid="event-name"]', `Athlete Test ${timestamp}`);
    await page.fill('[data-testid="event-start-date"]', '2025-12-01');
    await page.fill('[data-testid="event-end-date"]', '2025-12-01');
    
    await page.click('[data-testid="save-event-button"]');
    await page.waitForURL(/\/backoffice\/events\/.*/);
    
    const url = page.url();
    const eventId = url.split('/').pop();
    createdEventIds.push(eventId);
    
    // Go to athletes tab
    await page.click('[data-testid="athletes-tab"], a:has-text("Athletes")');
    
    // Should see athletes list (may be empty)
    await expect(page.locator('[data-testid="athletes-list"], .athletes-list')).toBeVisible();
    
    // Should have option to add athlete
    const addButton = page.locator('[data-testid="add-athlete-button"], button:has-text("Add Athlete")');
    if (await addButton.count() > 0) {
      await expect(addButton).toBeVisible();
    }
  });

  test('should view and export results', async ({ page }) => {
    test.skip(!process.env.TEST_ORGANIZER_EMAIL || !process.env.TEST_EVENT_ID, 'Test data not configured');
    
    const eventId = process.env.TEST_EVENT_ID;
    
    await page.goto(`/backoffice/events/${eventId}`);
    
    // Go to results/leaderboard tab
    await page.click('[data-testid="results-tab"], a:has-text("Results"), a:has-text("Leaderboard")');
    
    // Should see results
    await expect(page.locator('[data-testid="results-view"], .leaderboard')).toBeVisible();
    
    // Should have export option
    const exportButton = page.locator('[data-testid="export-results-button"], button:has-text("Export")');
    if (await exportButton.count() > 0) {
      await expect(exportButton).toBeVisible();
    }
  });

  test('should manage event settings', async ({ page }) => {
    test.skip(!process.env.TEST_ORGANIZER_EMAIL, 'Organizer credentials not configured');
    
    const timestamp = Date.now();
    
    // Create event
    await page.goto('/backoffice/events');
    await page.click('[data-testid="create-event-button"]');
    
    await page.fill('[data-testid="event-name"]', `Settings Test ${timestamp}`);
    await page.fill('[data-testid="event-start-date"]', '2025-12-01');
    await page.fill('[data-testid="event-end-date"]', '2025-12-01');
    
    await page.click('[data-testid="save-event-button"]');
    await page.waitForURL(/\/backoffice\/events\/.*/);
    
    const url = page.url();
    const eventId = url.split('/').pop();
    createdEventIds.push(eventId);
    
    // Go to settings
    await page.click('[data-testid="settings-tab"], a:has-text("Settings")');
    
    // Toggle registration
    const registrationToggle = page.locator('[data-testid="registration-enabled"], input[name="registrationEnabled"]');
    if (await registrationToggle.count() > 0) {
      await registrationToggle.click();
      await page.click('[data-testid="save-settings-button"], button:has-text("Save")');
      
      // Should show success message
      await expect(page.locator('.success-message, .toast-success')).toBeVisible({ timeout: 5000 });
    }
  });
});
