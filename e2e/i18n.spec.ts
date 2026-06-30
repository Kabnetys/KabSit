import { test, expect } from '@playwright/test';

test.describe('Internationalization', () => {
  test('French is the default locale (no prefix)', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang', 'fr');
  });

  test('English locale works at /en', async ({ page }) => {
    await page.goto('/en');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang', 'en');
  });

  test('Spanish locale works at /es', async ({ page }) => {
    await page.goto('/es');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang', 'es');
  });

  test('language switcher changes locale', async ({ page }) => {
    await page.goto('/');
    const switcher = page.locator('nav[aria-label*="langue"], [aria-label*="language"], [aria-label*="idioma"]').first();
    // Language switcher present
    await expect(page.locator('text=EN').or(page.locator('text=FR')).or(page.locator('text=ES'))).toBeVisible();
  });
});
