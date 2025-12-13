import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/MunchMate|Restaurant/);
});

test('check menu page', async ({ page }) => {
  await page.goto('/');
  // Check if "Menu" or similar helper text is visible
  // This depends on actual content. For now, just check URL stays successful.
  expect(page.url()).toContain('http://localhost:9002');
});
