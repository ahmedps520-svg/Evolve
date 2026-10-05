import { expect, test } from '@playwright/test';
import { onboard } from './helpers';

test('landing page introduces the game', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('REAL LIFE.');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('NOW WITH XP.');
  await expect(page.getByRole('button', { name: /view demo/i }).first()).toBeVisible();
  await page.getByRole('button', { name: /start your journey/i }).first().click();
  await expect(page.getByText('Turn your real life into a game.')).toBeVisible();
  await expect(page.getByRole('button', { name: /begin journey/i })).toBeVisible();
});

test('onboarding creates a level 1 character with starter quests, coins and an achievement', async ({ page }) => {
  await onboard(page, { name: 'Ahmed' });

  for (const title of ['Study Session', 'Move', 'Read']) await expect(page.getByRole('article', { name: title })).toBeVisible();
  await expect(page.getByRole('article', { name: 'Study Session' })).toContainText('+100 XP');
  await expect(page.getByRole('article', { name: 'Move' })).toContainText('+80 XP');
  await expect(page.getByRole('article', { name: 'Read' })).toContainText('+50 XP');

  await expect(page.getByText('0 total XP')).toBeVisible();
  await expect(page.getByLabel('100 coins').filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByLabel('Level 1').first()).toBeAttached();

  await page.goto('#/character/achievements');
  await expect(page.getByRole('listitem', { name: /the journey begins.*unlocked/i })).toBeVisible();
});

test('the name step requires a name and the goals step requires a goal', async ({ page }) => {
  await page.goto('#/onboarding');
  await page.getByRole('button', { name: /begin journey/i }).click();
  await expect(page.getByRole('button', { name: /continue/i })).toBeDisabled();
  await page.getByLabel('Your name').fill('   ');
  await expect(page.getByRole('button', { name: /continue/i })).toBeDisabled();
  await page.getByLabel('Your name').fill('Sam');
  await page.getByRole('button', { name: /continue/i }).click();
  await expect(page.getByRole('button', { name: /pick at least one/i })).toBeDisabled();
});

test('progress is saved on the device and survives a reload', async ({ page }) => {
  await onboard(page, { name: 'Persist' });
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: /persist/i })).toBeVisible();
  await expect(page.getByRole('article', { name: 'Study Session' })).toBeVisible();
});
