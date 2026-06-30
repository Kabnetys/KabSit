import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('homepage loads with hero section', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#hero')).toBeVisible();
    await expect(page.locator('header')).toBeVisible();
  });

  test('nav links are present', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav[aria-label="Navigation principale"]');
    await expect(nav).toBeVisible();
  });

  test('all sections visible on scroll', async ({ page }) => {
    await page.goto('/');
    for (const id of ['services', 'method', 'team', 'contact']) {
      await page.locator(`#${id}`).scrollIntoViewIfNeeded();
      await expect(page.locator(`#${id}`)).toBeVisible();
    }
  });

  test('skip to main content link available', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#main-content')).toBeAttached();
  });
});
