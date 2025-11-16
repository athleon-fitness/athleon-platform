# E2E Testing Guide

## Setup

1. Install dependencies:
```bash
cd e2e-tests
npm install
npx playwright install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your test credentials:
```env
BASE_URL=https://your-app-url.com

# Super Admin credentials
TEST_SUPER_ADMIN_EMAIL=admin@example.com
TEST_SUPER_ADMIN_PASSWORD=your-password

# Organization User credentials
TEST_ORGANIZER_EMAIL=organizer@example.com
TEST_ORGANIZER_PASSWORD=your-password

# Athlete credentials
TEST_ATHLETE_EMAIL=athlete@example.com
TEST_ATHLETE_PASSWORD=your-password

# Optional: Test data IDs
TEST_ORGANIZATION_ID=org-123
TEST_EVENT_ID=evt-456
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run specific test suites

**Super Admin tests:**
```bash
npx playwright test tests/admin/
```

**Organization User tests:**
```bash
npx playwright test tests/organizer/
```

**Debug button issue:**
```bash
npx playwright test tests/debug/button-inspector.spec.js
```

### Run with UI mode (recommended for debugging)
```bash
npm run test:ui
```

### Run in headed mode (see browser)
```bash
npm run test:headed
```

### Run specific test
```bash
npx playwright test tests/admin/organization-management.spec.js
```

### Run with specific browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Debugging the Create Organization Button

If the create organization button is not working, run the debug inspector:

```bash
npx playwright test tests/debug/button-inspector.spec.js --headed
```

This will:
1. List all buttons on the page
2. Try different selectors to find the create button
3. Attempt multiple click strategies
4. Capture console errors
5. Save screenshots and HTML for inspection

Check the output files:
- `e2e-tests/debug-organizations-page.png` - Screenshot of the page
- `e2e-tests/debug-organizations-page.html` - Full HTML of the page

## Test Structure

### Admin Tests (`tests/admin/`)
- `organization-management.spec.js` - Super admin organization CRUD operations

### Organizer Tests (`tests/organizer/`)
- `event-management.spec.js` - Event creation and management
- `backoffice-workflows.spec.js` - Complete backoffice workflows

### Debug Tests (`tests/debug/`)
- `button-inspector.spec.js` - Debug UI element issues

## Common Issues

### Button Not Clickable

If a button is not clickable, check:

1. **Element is visible**: The button might be hidden by CSS
2. **Element is enabled**: Check if `disabled` attribute is set
3. **Overlapping elements**: Another element might be covering the button
4. **Wrong selector**: The class or ID might have changed

Use the debug inspector to diagnose:
```bash
npx playwright test tests/debug/button-inspector.spec.js
```

### Authentication Issues

If tests fail with authentication errors:

1. Verify credentials in `.env` file
2. Check if Cognito user pool is accessible
3. Ensure test users have correct permissions
4. Try logging in manually first

### Timeout Errors

If tests timeout:

1. Increase timeout in test:
```javascript
test('my test', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  // ...
});
```

2. Check network conditions
3. Verify API endpoints are responding

## Writing New Tests

### Basic Test Template

```javascript
const { test, expect } = require('@playwright/test');
const { AuthHelper } = require('../utils/auth');

test.describe('My Feature', () => {
  let authHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    await authHelper.loginAsSuperAdmin(); // or loginAsOrganizer()
  });

  test.afterEach(async ({ page }) => {
    await authHelper.logout();
  });

  test('should do something', async ({ page }) => {
    await page.goto('/my-page');
    
    // Your test logic
    await page.click('[data-testid="my-button"]');
    await expect(page.locator('h1')).toContainText('Expected Text');
  });
});
```

### Best Practices

1. **Use data-testid attributes** for stable selectors
2. **Clean up test data** in afterEach hooks
3. **Use meaningful test names** that describe the behavior
4. **Add skip conditions** for tests requiring specific setup
5. **Wait for network idle** before interacting with dynamic content
6. **Take screenshots** on failure for debugging

### Selector Priority

Use selectors in this order of preference:

1. `[data-testid="element-id"]` - Most stable
2. `button:has-text("Click Me")` - Semantic
3. `.specific-class` - Less stable
4. `#element-id` - Can change
5. XPath - Last resort

## Viewing Test Reports

After running tests, view the HTML report:

```bash
npm run report
```

This opens an interactive report showing:
- Test results
- Screenshots
- Videos of failures
- Trace files for debugging

## CI/CD Integration

Tests are configured to run in CI with:
- Retries on failure (2 retries)
- Single worker (no parallelization)
- JSON and HTML reports

Set `CI=true` environment variable in your CI pipeline.

## Troubleshooting

### Tests pass locally but fail in CI

- Check BASE_URL is correct for CI environment
- Verify test credentials are set in CI secrets
- Ensure API endpoints are accessible from CI
- Check for timing issues (add waits if needed)

### Flaky tests

- Add explicit waits: `await page.waitForSelector()`
- Use `waitForLoadState('networkidle')`
- Increase timeouts for slow operations
- Check for race conditions

### Permission errors

- Verify user roles in Cognito
- Check API Gateway authorizers
- Ensure test users have correct group memberships

## Support

For issues or questions:
1. Check the debug inspector output
2. Review test-results/ directory
3. Check CloudWatch logs for API errors
4. Review browser console in headed mode
