import { expect, test } from '@playwright/test';
import { onboard } from './helpers';

test('light and dark themes apply instantly and persist without a flash', async ({ page }) => {
  await onboard(page);
  await page.goto('#/settings');
  const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.getByRole('radio', { name: 'Light' }).click();
  await expect(page.locator('html')).toHaveClass(/\blight\b/);
  const lightBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(lightBg).not.toBe(darkBg);

  await page.reload();
  // The boot script applies the saved theme before React renders.
  await expect(page.locator('html')).toHaveClass(/\blight\b/);
  await page.getByRole('radio', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveClass(/\bdark\b/);
});

test('reduced motion can be forced on in settings', async ({ page }) => {
  await onboard(page);
  await page.goto('#/settings');
  await page.getByRole('radio', { name: 'Reduced' }).click();
  await expect(page.locator('html')).toHaveClass(/reduce-motion/);
  const duration = await page.getByRole('radio', { name: 'Reduced' }).evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration));
  expect(duration).toBeLessThan(0.01);
});

test.describe('with the system reduced-motion preference', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  test('animations are minimized and the game stays playable', async ({ page }) => {
    await onboard(page);
    const duration = await page.getByRole('link', { name: /home/i }).first().evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration));
    expect(duration).toBeLessThan(0.01);
    await page.getByRole('article', { name: 'Read' }).getByRole('button', { name: 'Log time for Read' }).click();
    await page.getByRole('dialog', { name: /log progress/i }).getByRole('button', { name: /^log 15m/i }).click();
    await expect(page.getByRole('status').filter({ hasText: /quest complete/i })).toBeVisible();
  });
});

test('high contrast mode and accent themes', async ({ page }) => {
  await onboard(page);
  await page.goto('#/settings');
  await page.getByRole('switch', { name: 'High contrast' }).click();
  await expect(page.locator('html')).toHaveClass(/\bhc\b/);
  await page.getByRole('radio', { name: 'Emerald' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-accent', 'emerald');
  // Premium themes stay locked until earned.
  await expect(page.getByRole('radio', { name: /obsidian gold \(locked\)/i })).toBeVisible();
});

test('profile edits and difficulty changes', async ({ page }) => {
  await onboard(page, { name: 'Ahmed' });
  await page.goto('#/settings');
  await page.getByLabel('Name').fill('Ahmed the Bold');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('status').filter({ hasText: /name updated/i })).toBeVisible();
  await page.getByRole('radio', { name: /hardcore/i }).click();
  await expect(page.getByRole('spinbutton', { name: 'Daily XP goal' })).toHaveValue('700');
});
