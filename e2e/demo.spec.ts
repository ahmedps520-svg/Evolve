import { expect, test } from '@playwright/test';

test('the demo hero is a seasoned level 18 character', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: /view demo/i }).first().click();
  await expect(page).toHaveURL(/#\/home/, { timeout: 20_000 });
  await expect(page.getByText('12,480 total XP')).toBeVisible();
  await expect(page.getByText(/demo/i).first()).toBeVisible();

  await page.goto('#/character');
  await expect(page.getByLabel('Level 18').first()).toBeAttached();
  const tiles = page.getByRole('main');
  await expect(tiles).toContainText('73');
  await expect(tiles).toContainText(/18\/\d+/);
  await expect(page.getByLabel('14-day streak').filter({ visible: true }).first()).toBeVisible();

  await page.goto('#/progress');
  await expect(page.getByText('XP earned').first()).toBeVisible();
});
