import { test, expect, waitForPageReady, disableOnboarding } from './test-helpers';

test.describe('Page Structure', () => {
  test.beforeEach(async ({ page }) => {
    await disableOnboarding(page);
  });

  test('should have main analysis features visible', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    // Check for main title with exact match
    await expect(page.getByRole('heading', { name: 'AIShark', exact: true })).toBeVisible();
    
    // Check for file upload label
    await expect(page.locator('label[for="file-upload"]')).toBeVisible();
  });
});
