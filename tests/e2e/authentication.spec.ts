import { test, expect, waitForPageReady, disableOnboarding } from './test-helpers';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await disableOnboarding(page);
  });

  test('should have sign-in button', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    // Sign in button should be visible
    const signInButton = page.locator('[data-tour="sign-in"]');
    await expect(signInButton).toBeVisible();
  });
});
