import { test as base, Page } from '@playwright/test';

/**
 * Extended test with utilities for AIShark tests
 */
export const test = base.extend<{}, { workerStorageState: string }>({
  // Use the same storage state for all tests in the worker
  storageState: async ({ workerStorageState }, use) => {
    await use(workerStorageState);
  },

  workerStorageState: [async ({}, use) => {
    const storageState = {
      cookies: [],
      origins: [
        {
          origin: 'http://localhost:3000',
          localStorage: [
            {
              name: 'aishark-onboarding-completed',
              value: 'true'
            }
          ]
        }
      ]
    };
    
    const path = './test-storage-state.json';
    const fs = await import('fs');
    fs.writeFileSync(path, JSON.stringify(storageState));
    
    await use(path);
    
    // Cleanup
    if (fs.existsSync(path)) {
      fs.unlinkSync(path);
    }
  }, { scope: 'worker' }],
});

export { expect } from '@playwright/test';

/**
 * Helper to wait for initial page load and hydration
 */
export async function waitForPageReady(page: Page) {
  // Wait for Next.js hydration
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  
  // Ensure onboarding is disabled
  await page.evaluate(() => {
    localStorage.setItem('aishark-onboarding-completed', 'true');
  });
  
  // Wait a bit for React hydration
  await page.waitForTimeout(1000);
}

/**
 * Helper to disable onboarding tour before page navigation
 */
export async function disableOnboarding(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('aishark-onboarding-completed', 'true');
  });
}

/**
 * Helper to clear all localStorage and cookies
 */
export async function clearStorage(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.context().clearCookies();
}
