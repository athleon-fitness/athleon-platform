const { expect } = require('@playwright/test');

class AuthHelper {
  constructor(page) {
    this.page = page;
  }

  async loginAs(email, password) {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
    
    // Check if already logged in by looking for user menu or backoffice link
    const isLoggedIn = await this.page.locator('[data-testid="user-menu"], a[href*="/backoffice"], button:has-text("Backoffice")').count();
    if (isLoggedIn > 0) {
      console.log('Already logged in');
      return;
    }

    // Try to find and click Sign In button (handle mobile menu if needed)
    const signInButton = this.page.locator('button:has-text("Sign In"), a:has-text("Sign In"), .auth-link:has-text("Sign In")').first();
    
    // Check if button is visible, if not try opening mobile menu
    const isVisible = await signInButton.isVisible().catch(() => false);
    if (!isVisible) {
      // Try opening mobile hamburger menu
      const menuButton = this.page.locator('button[aria-label="Menu"], button.hamburger, button.menu-toggle, [data-testid="mobile-menu-button"]').first();
      if (await menuButton.count() > 0) {
        await menuButton.click();
        await this.page.waitForTimeout(500);
      }
    }
    
    await signInButton.click({ timeout: 10000 });
    
    // Wait for login form to appear (could be modal or redirect)
    await this.page.waitForSelector('input[name="username"], input[type="email"], input[placeholder*="email" i]', { timeout: 10000 });
    
    // Fill login form
    const emailInput = this.page.locator('input[name="username"], input[type="email"], input[placeholder*="email" i]').first();
    const passwordInput = this.page.locator('input[name="password"], input[type="password"], input[placeholder*="password" i]').first();
    
    await emailInput.clear();
    await emailInput.fill(email);
    await passwordInput.clear();
    await passwordInput.fill(password);
    
    console.log('Credentials filled, attempting submit...');
    
    // Try multiple submit strategies
    const submitButton = this.page.locator('button[type="submit"]').first();
    
    // Strategy 1: Direct click
    try {
      await submitButton.click({ timeout: 5000 });
      console.log('Submit button clicked');
    } catch (e) {
      console.log('Direct click failed, trying alternative methods...');
      
      // Strategy 2: Force click
      try {
        await submitButton.click({ force: true, timeout: 5000 });
        console.log('Force click succeeded');
      } catch (e2) {
        // Strategy 3: Press Enter on password field
        console.log('Force click failed, trying Enter key...');
        await passwordInput.press('Enter');
        console.log('Enter key pressed');
      }
    }
    
    // Wait for navigation away from login page
    console.log('Waiting for navigation...');
    
    // Give Cognito time to process and redirect
    await this.page.waitForTimeout(3000);
    
    const currentUrl = this.page.url();
    console.log('Current URL after submit:', currentUrl);
    
    // Check if we're still on login page
    if (currentUrl.includes('/login') || currentUrl.includes('/auth')) {
      // Check if there's an error message
      const errorMsg = await this.page.locator('.error, [role="alert"], .amplify-alert').textContent().catch(() => '');
      if (errorMsg) {
        throw new Error(`Login failed: ${errorMsg}`);
      }
      
      // Wait a bit more for slow redirects
      console.log('Still on login page, waiting for redirect...');
      try {
        await this.page.waitForURL(url => !url.includes('/login') && !url.includes('/auth'), { 
          timeout: 10000 
        });
      } catch (e) {
        throw new Error('Login failed - did not navigate away from login page. Check credentials.');
      }
    }
    
    // Wait for page to fully load
    await this.page.waitForLoadState('networkidle');
    console.log('Login successful, final URL:', this.page.url());
  }

  async logout() {
    const userMenu = await this.page.locator('[data-testid="user-menu"]').count();
    if (userMenu > 0) {
      await this.page.click('[data-testid="user-menu"]');
      await this.page.click('[data-testid="logout-button"]');
      await this.page.waitForSelector('[data-testid="sign-in-form"]', { timeout: 10000 });
    }
  }

  async loginAsSuperAdmin() {
    await this.loginAs(
      process.env.TEST_SUPER_ADMIN_EMAIL,
      process.env.TEST_SUPER_ADMIN_PASSWORD
    );
  }

  async loginAsOrganizer() {
    await this.loginAs(
      process.env.TEST_ORGANIZER_EMAIL,
      process.env.TEST_ORGANIZER_PASSWORD
    );
  }

  async loginAsAthlete() {
    await this.loginAs(
      process.env.TEST_ATHLETE_EMAIL,
      process.env.TEST_ATHLETE_PASSWORD
    );
  }
}

module.exports = { AuthHelper };
