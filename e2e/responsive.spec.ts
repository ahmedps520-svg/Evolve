import { expect, test, type Page } from '@playwright/test';
import { onboard } from './helpers';

const PAGES = ['#/home', '#/quests', '#/quests/weekly', '#/quests/goals', '#/progress', '#/progress/streaks', '#/progress/skills', '#/progress/history', '#/character', '#/character/achievements', '#/character/wardrobe', '#/character/shop', '#/character/party', '#/settings'];

async function expectNoSideScroll(page: Page) {
  for (const path of PAGES) {
    await page.goto(path);
    await page.waitForTimeout(250);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${path} scrolls sideways`).toBeLessThanOrEqual(0);
  }
}

test('navigation adapts to the screen and nothing scrolls sideways', async ({ page, isMobile }) => {
  await onboard(page);
  const sidebarHome = page.getByRole('link', { name: 'Evolve home' });
  if (isMobile) await expect(sidebarHome).toBeHidden();
  else await expect(sidebarHome).toBeVisible();
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: /quests/i }).click();
  await expect(page).toHaveURL(/#\/quests/);
  await expectNoSideScroll(page);
});

test.describe('tablet', () => {
  test.use({ viewport: { width: 820, height: 1180 }, isMobile: false });
  test('tablet layout has no sideways scrolling', async ({ page }) => {
    await onboard(page);
    await expectNoSideScroll(page);
  });
});

test('switching sections starts the new page at the top', async ({ page }) => {
  await onboard(page);
  await page.goto('#/settings');
  await page.getByRole('heading', { name: 'About' }).scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(200);
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: /home/i }).click();
  await expect(page).toHaveURL(/#\/home/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});
