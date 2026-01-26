import { test, expect, clearStorage, waitForPageReady } from './test-helpers';

test.describe('Onboarding Tour', () => {
  test('should have data-tour attributes on key elements', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    // Check for tour targets
    await expect(page.locator('[data-tour="theme-toggle"]')).toBeVisible();
    await expect(page.locator('[data-tour="sign-in"]')).toBeVisible();
  });

  test('should not show onboarding when disabled', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    // Check localStorage has aishark-onboarding-completed
    const completed = await page.evaluate(() => 
      localStorage.getItem('aishark-onboarding-completed')
    );
    expect(completed).toBe('true');
  });
});
