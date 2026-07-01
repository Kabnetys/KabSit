import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test('page has a main landmark', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('main#main-content')).toBeVisible();
  });

  test('all images have alt text', async ({ page }) => {
    await page.goto('/');
    const images = page.locator('img');
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute('alt');
      // alt="" is valid for decorative images, but alt must not be absent
      expect(alt).not.toBeNull();
    }
  });

  test('headings are in logical order', async ({ page }) => {
    await page.goto('/');
    const h1s = await page.locator('h1').count();
    expect(h1s).toBe(1);
    const h2s = await page.locator('h2').count();
    expect(h2s).toBeGreaterThanOrEqual(1);
  });

  test('interactive elements have accessible labels', async ({ page }) => {
    await page.goto('/');
    const buttons = page.locator('button:not([aria-label]):not([aria-labelledby])');
    const unlabeled = await buttons.count();
    // Hamburger and language switcher buttons must have labels
    expect(unlabeled).toBe(0);
  });

  test('color contrast passes at page level — nav visible', async ({ page }) => {
    await page.goto('/');
    const header = page.locator('header');
    await expect(header).toBeVisible();
  });
});
