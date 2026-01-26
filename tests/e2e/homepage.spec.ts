import { test, expect, waitForPageReady, disableOnboarding } from './test-helpers';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await disableOnboarding(page);
  });

  test('should load the homepage successfully', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    // Check for main heading - use exact match
    await expect(page.getByRole('heading', { name: 'AIShark', exact: true })).toBeVisible();
    await expect(page.getByText('AI-Powered PCAP Analysis')).toBeVisible();
  });

  test('should display upload section', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    // Check for upload label or button (file input is hidden)
    await expect(page.locator('label[for="file-upload"]')).toBeVisible();
  });

  test('should display feature cards', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    // Check for feature cards
    await expect(page.getByText('Smart Analysis')).toBeVisible();
    await expect(page.getByText('Advanced Filtering')).toBeVisible();
  });

  test('should have theme toggle button', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    // Theme toggle should be visible
    const themeToggle = page.locator('[data-tour="theme-toggle"]');
    await expect(themeToggle).toBeVisible();
  });

  test('should have sign-in button', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    // Sign in button should be visible
    const signInButton = page.locator('[data-tour="sign-in"]');
    await expect(signInButton).toBeVisible();
  });
});

test.describe('Dark Mode', () => {
  test('should have dark mode capability', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    // Just verify theme toggle exists
    const themeToggle = page.locator('[data-tour="theme-toggle"]');
    await expect(themeToggle).toBeVisible();
  });
});

test.describe('Responsive Design', () => {
  test('should be mobile responsive', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await waitForPageReady(page);
    
    // Check that content is visible on mobile
    await expect(page.getByRole('heading', { name: 'AIShark', exact: true })).toBeVisible();
  });
});
