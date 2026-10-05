import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const PAGES = ['home', 'quests', 'quests/weekly', 'quests/goals', 'progress', 'progress/streaks', 'progress/skills', 'progress/journal', 'progress/history', 'character', 'character/achievements', 'character/wardrobe', 'character/shop', 'character/party', 'settings'];

async function audit(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const report = serious.map((v) => `${v.id} (${v.impact}): ${v.help}\n${v.nodes.slice(0, 4).map((n) => `   - ${n.target.join(' ')} ${n.failureSummary?.split('\n')[1] ?? ''}`).join('\n')}`).join('\n');
  expect(serious, `${label}\n${report}`).toEqual([]);
}

for (const theme of ['dark', 'light'] as const) {
  test.describe(`${theme} theme`, () => {
    test.use({ colorScheme: theme });

    test('landing and onboarding have no serious accessibility violations', async ({ page }) => {
      await page.goto('./');
      await page.waitForTimeout(600);
      await audit(page, 'landing');
      await page.goto('#/onboarding');
      await page.waitForTimeout(600);
      await audit(page, 'onboarding');
    });

    test('every app screen has no serious accessibility violations', async ({ page }) => {
      test.setTimeout(120_000);
      await page.goto('#/demo');
      await expect(page).toHaveURL(/#\/home/, { timeout: 20_000 });
      if (theme === 'light') {
        await page.goto('#/settings');
        await page.getByRole('radio', { name: 'Light' }).click();
      }
      for (const path of PAGES) {
        await page.goto(`#/${path}`);
        await page.waitForTimeout(700);
        await audit(page, path);
      }
    });
  });
}
