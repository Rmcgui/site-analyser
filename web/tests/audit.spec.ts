import { test, expect } from '@playwright/test';

test.describe('Audit flow', () => {
  test('submitting a URL returns Lighthouse scores', async ({ page }) => {
    await page.goto('/');

    await page.getByPlaceholder(/enter a url/i).fill('https://webdesignbyryan.com');
    await page.getByRole('button', { name: /audit/i }).click();

    const scoreCards = page.locator('.text-sm.text-slate-500.capitalize');
    await expect(scoreCards.filter({ hasText: /performance/i })).toBeVisible({ timeout: 30000 });
    await expect(scoreCards.filter({ hasText: /accessibility/i })).toBeVisible();
    await expect(scoreCards.filter({ hasText: /best practices/i })).toBeVisible();
    await expect(scoreCards.filter({ hasText: /seo/i })).toBeVisible();
  });

  test('score cards display numeric values', async ({ page }) => {
    await page.goto('/');

    await page.getByPlaceholder(/enter a url/i).fill('https://webdesignbyryan.com');
    await page.getByRole('button', { name: /audit/i }).click();

    const scoreCards = page.locator('.text-sm.text-slate-500.capitalize');
    await expect(scoreCards.filter({ hasText: /performance/i })).toBeVisible({ timeout: 30000 });
    await expect(scoreCards).toHaveCount(4);
  });
});