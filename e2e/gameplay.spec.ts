import { expect, test } from '@playwright/test';
import { dismissCelebrations, logActivity, onboard, totalXP } from './helpers';

test('completing a quest awards XP, levels up and unlocks achievements', async ({ page }) => {
  await onboard(page);
  const read = page.getByRole('article', { name: 'Read' });
  await read.getByRole('button', { name: 'Log time for Read' }).click();
  const sheet = page.getByRole('dialog', { name: /log progress/i });
  await expect(sheet).toContainText('For “Read”');
  await sheet.getByRole('button', { name: /^log 15m/i }).click();

  // Quest complete toast, then the level-up celebration (+50 coins).
  await expect(page.getByRole('status').filter({ hasText: /quest complete/i })).toBeVisible();
  const levelUp = page.getByRole('dialog', { name: /level up! you reached level 2/i });
  await expect(levelUp).toBeVisible();
  await expect(levelUp).toContainText(/\+50 coins/i);
  await levelUp.getByRole('button', { name: 'Continue' }).click();
  await dismissCelebrations(page);

  await expect(page.getByRole('article', { name: 'Read, completed' })).toBeVisible();
  expect(await totalXP(page)).toBeGreaterThanOrEqual(100);

  await page.goto('#/character/achievements');
  await expect(page.getByRole('listitem', { name: /first step.*unlocked/i })).toBeVisible();
  await expect(page.getByRole('listitem', { name: /field notes.*unlocked/i })).toBeVisible();

  // The streak starts on the first active day.
  await page.goto('#/progress/streaks');
  await expect(page.getByText('days in a row')).toBeVisible();
  await expect(page.getByRole('main')).toContainText(/1\s*days in a row|1\s*day/i);
});

test('reaching the daily goal pays a bonus', async ({ page }) => {
  await onboard(page, { difficulty: 'Casual' });
  await expect(page.getByText('200 XP to go')).toBeVisible();
  // ~104 XP: 30 min of reading also completes the (casual) "Read" quest and unlocks two achievements.
  await logActivity(page, { category: 'Reading', minutes: 30 });
  await dismissCelebrations(page);
  await expect(page.getByText(/daily goal complete/i)).toHaveCount(0);
  // ~126 XP more (with a small momentum bonus) crosses the 200 XP goal.
  await logActivity(page, { category: 'Coding', minutes: 120 });
  await expect(page.getByRole('status').filter({ hasText: /daily goal complete/i })).toBeVisible();
  await dismissCelebrations(page);
  await page.goto('#/progress/history');
  await expect(page.getByText('Daily goal complete').first()).toBeVisible();
});

test('custom quests are created with honest XP limits and can be completed', async ({ page }) => {
  await onboard(page);
  await page.goto('#/quests');
  await page.getByRole('button', { name: /create quest/i }).first().click();
  const sheet = page.getByRole('dialog', { name: /create quest/i });
  await sheet.getByLabel('Quest name').fill('Drink water');
  await sheet.getByRole('radio', { name: 'Easy' }).click();
  await sheet.getByRole('spinbutton', { name: 'XP reward' }).fill('500000');
  await sheet.getByRole('spinbutton', { name: 'XP reward' }).blur();
  // Easy quests are capped at 60 XP.
  await expect(sheet.getByRole('button', { name: /create quest · \+60 xp/i })).toBeVisible();
  await sheet.getByRole('button', { name: /create quest · \+60 xp/i }).click();
  await expect(sheet).toBeHidden();

  await page.goto('#/quests/all');
  const quest = page.getByRole('article', { name: 'Drink water' });
  await expect(quest).toContainText('+60 XP');
  await quest.getByRole('button', { name: /complete/i }).click();
  await expect(page.getByRole('status').filter({ hasText: /quest complete/i })).toBeVisible();
});

test('weekly challenges and the boss fight are on the quest board', async ({ page }) => {
  await onboard(page);
  await page.goto('#/quests/weekly');
  await expect(page.getByText(/resets in \d day/i)).toBeVisible();
  await expect(page.getByText(/weekly boss/i).first()).toBeVisible();
  await expect(page.getByText(/bounty/i).first()).toBeVisible();
});

test('statistics fill in after playing', async ({ page }) => {
  await onboard(page);
  await logActivity(page, { category: 'Reading', minutes: 30 });
  await dismissCelebrations(page);
  await page.goto('#/progress');
  await expect(page.getByText('XP earned').first()).toBeVisible();
  await expect(page.getByText('Active days').first()).toBeVisible();
  // Every chart offers a data table alternative.
  const tableToggle = page.getByRole('button', { name: /table/i }).first();
  await tableToggle.click();
  await expect(page.getByRole('table').first()).toBeVisible();
});

test('keyboard shortcuts open the log sheet and navigate', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Desktop keyboard shortcuts');
  await onboard(page);
  await page.keyboard.press('l');
  await expect(page.getByRole('dialog', { name: /log activity/i })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: /log activity/i })).toBeHidden();
  await page.keyboard.press('3');
  await expect(page).toHaveURL(/#\/progress/);
});
