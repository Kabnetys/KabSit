import { test, expect } from '@playwright/test';

test.describe('Contact form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#contact');
    await page.locator('#contact').scrollIntoViewIfNeeded();
  });

  test('form fields are present', async ({ page }) => {
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('textarea[name="message"]')).toBeVisible();
  });

  test('validates required fields', async ({ page }) => {
    await page.locator('button[type="submit"]').click();
    // Browser native validation prevents submission
    const nameField = page.locator('input[name="name"]');
    await expect(nameField).toBeFocused();
  });

  test('validates email format', async ({ page }) => {
    await page.locator('input[name="name"]').fill('Test User');
    await page.locator('input[name="email"]').fill('not-an-email');
    await page.locator('textarea[name="message"]').fill('Hello');
    await page.locator('button[type="submit"]').click();
    const emailField = page.locator('input[name="email"]');
    await expect(emailField).toBeFocused();
  });

  test('API returns 422 on empty body', async ({ request }) => {
    const res = await request.post('/api/contact', {
      data: {},
    });
    expect(res.status()).toBe(422);
  });

  test('API returns 422 on invalid email', async ({ request }) => {
    const res = await request.post('/api/contact', {
      data: { name: 'Test', email: 'bad', message: 'Hello world' },
    });
    expect(res.status()).toBe(422);
  });
});
