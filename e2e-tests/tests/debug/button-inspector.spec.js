const { test, expect } = require('@playwright/test');
const { AuthHelper } = require('../utils/auth');

test.describe('Debug - Button Inspector', () => {
  let authHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
  });

  test('inspect create organization button', async ({ page }) => {
    test.skip(!process.env.TEST_SUPER_ADMIN_EMAIL, 'Super admin credentials not configured');
    
    await authHelper.loginAsSuperAdmin();
    await page.goto('/backoffice/organizations');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    console.log('=== Page URL ===');
    console.log(page.url());
    
    console.log('\n=== Page Title ===');
    console.log(await page.title());
    
    // Find all buttons on the page
    console.log('\n=== All Buttons ===');
    const allButtons = await page.locator('button').all();
    for (let i = 0; i < allButtons.length; i++) {
      const button = allButtons[i];
      const text = await button.textContent();
      const classes = await button.getAttribute('class');
      const disabled = await button.isDisabled();
      const visible = await button.isVisible();
      console.log(`Button ${i + 1}:`, {
        text: text?.trim(),
        classes,
        disabled,
        visible
      });
    }
    
    // Look for create button specifically
    console.log('\n=== Looking for Create Button ===');
    const createButtonSelectors = [
      'button.btn-create-org',
      'button.btn-primary',
      '[data-testid="create-org-button"]',
      'button:has-text("Create")',
      'button:has-text("New")',
      'button:has-text("Add")'
    ];
    
    for (const selector of createButtonSelectors) {
      const count = await page.locator(selector).count();
      console.log(`Selector "${selector}": ${count} matches`);
      
      if (count > 0) {
        const button = page.locator(selector).first();
        const text = await button.textContent();
        const classes = await button.getAttribute('class');
        const disabled = await button.isDisabled();
        const visible = await button.isVisible();
        const boundingBox = await button.boundingBox();
        
        console.log('  Details:', {
          text: text?.trim(),
          classes,
          disabled,
          visible,
          position: boundingBox
        });
        
        // Try to get computed styles
        const styles = await button.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            display: computed.display,
            visibility: computed.visibility,
            opacity: computed.opacity,
            pointerEvents: computed.pointerEvents
          };
        });
        console.log('  Computed styles:', styles);
      }
    }
    
    // Check for any error messages
    console.log('\n=== Error Messages ===');
    const errorSelectors = ['.error', '.alert-error', '[role="alert"]', '.toast-error'];
    for (const selector of errorSelectors) {
      const errors = await page.locator(selector).all();
      for (const error of errors) {
        const text = await error.textContent();
        if (text?.trim()) {
          console.log('Error found:', text.trim());
        }
      }
    }
    
    // Take screenshot
    await page.screenshot({ path: 'e2e-tests/debug-organizations-page.png', fullPage: true });
    console.log('\n=== Screenshot saved to e2e-tests/debug-organizations-page.png ===');
    
    // Get page HTML for inspection
    const html = await page.content();
    const fs = require('fs');
    fs.writeFileSync('e2e-tests/debug-organizations-page.html', html);
    console.log('=== HTML saved to e2e-tests/debug-organizations-page.html ===');
  });

  test('try clicking create button with different strategies', async ({ page }) => {
    test.skip(!process.env.TEST_SUPER_ADMIN_EMAIL, 'Super admin credentials not configured');
    
    await authHelper.loginAsSuperAdmin();
    await page.goto('/backoffice/organizations');
    await page.waitForLoadState('networkidle');
    
    const strategies = [
      { name: 'Class selector', selector: 'button.btn-create-org' },
      { name: 'Primary button', selector: 'button.btn-primary' },
      { name: 'Test ID', selector: '[data-testid="create-org-button"]' },
      { name: 'Text content', selector: 'button:has-text("Create")' },
      { name: 'Text content (New)', selector: 'button:has-text("New")' },
      { name: 'Any button with Create', selector: 'button:text-matches("create", "i")' }
    ];
    
    for (const strategy of strategies) {
      console.log(`\n=== Trying: ${strategy.name} ===`);
      
      try {
        const button = page.locator(strategy.selector).first();
        const count = await page.locator(strategy.selector).count();
        
        console.log(`Found ${count} elements`);
        
        if (count > 0) {
          const isVisible = await button.isVisible();
          const isDisabled = await button.isDisabled();
          
          console.log(`Visible: ${isVisible}, Disabled: ${isDisabled}`);
          
          if (isVisible && !isDisabled) {
            console.log('Attempting click...');
            await button.click({ timeout: 5000 });
            
            // Wait a bit to see what happens
            await page.waitForTimeout(2000);
            
            const newUrl = page.url();
            console.log(`After click, URL: ${newUrl}`);
            
            // Check if modal or form appeared
            const modalVisible = await page.locator('.modal, [role="dialog"]').isVisible().catch(() => false);
            const formVisible = await page.locator('form').isVisible().catch(() => false);
            
            console.log(`Modal visible: ${modalVisible}, Form visible: ${formVisible}`);
            
            if (modalVisible || formVisible || newUrl.includes('create') || newUrl.includes('new')) {
              console.log('✅ SUCCESS! Button click worked with this strategy');
              return;
            }
          }
        }
      } catch (error) {
        console.log(`❌ Failed: ${error.message}`);
      }
    }
    
    console.log('\n=== All strategies failed ===');
  });

  test('check JavaScript console errors', async ({ page }) => {
    test.skip(!process.env.TEST_SUPER_ADMIN_EMAIL, 'Super admin credentials not configured');
    
    const consoleMessages = [];
    const errors = [];
    
    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });
    
    page.on('pageerror', error => {
      errors.push(error.message);
    });
    
    await authHelper.loginAsSuperAdmin();
    await page.goto('/backoffice/organizations');
    await page.waitForLoadState('networkidle');
    
    // Try to click the button
    try {
      await page.click('button.btn-create-org', { timeout: 5000 });
    } catch (error) {
      console.log('Click failed:', error.message);
    }
    
    console.log('\n=== Console Messages ===');
    consoleMessages.forEach(msg => {
      console.log(`[${msg.type}]`, msg.text);
    });
    
    console.log('\n=== JavaScript Errors ===');
    errors.forEach(error => {
      console.log('ERROR:', error);
    });
  });
});
