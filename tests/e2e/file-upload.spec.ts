import { test, expect, waitForPageReady, disableOnboarding } from './test-helpers';
import path from 'path';

test.describe('File Upload', () => {
  test.beforeEach(async ({ page }) => {
    await disableOnboarding(page);
  });

  test('should show file upload area', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    // Check if file input label exists (input itself is hidden)
    const fileLabel = page.locator('label[for="file-upload"]');
    await expect(fileLabel).toBeVisible();
  });

  test('should have sample PCAP files in project', async () => {
    const fs = await import('fs');
    const sampleFile = path.join(process.cwd(), 'sample1.pcapng');
    const exists = fs.existsSync(sampleFile);
    expect(exists).toBe(true);
  });
});
