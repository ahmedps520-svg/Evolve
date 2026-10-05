import { expect, test } from '@playwright/test';
import { dismissCelebrations, onboard } from './helpers';

/** A friend's party card, encoded exactly like the app does (EVO1.<base64url JSON>). */
function partyCode(card: Record<string, unknown>): string {
  return `EVO1.${Buffer.from(JSON.stringify(card)).toString('base64url')}`;
}

test('goals break into milestones that pay XP', async ({ page }) => {
  await onboard(page);
  await page.goto('#/quests/goals');
  await page.getByRole('button', { name: /create goal/i }).click();
  const sheet = page.getByRole('dialog', { name: /new goal/i });
  await sheet.getByLabel('Goal', { exact: true }).fill('Learn Spanish');
  await sheet.getByRole('textbox', { name: 'Milestone 1', exact: true }).fill('Learn 100 words');
  await sheet.getByRole('button', { name: /add milestone/i }).click();
  await sheet.getByRole('textbox', { name: 'Milestone 2', exact: true }).fill('Hold a 5-minute conversation');
  await sheet.getByRole('button', { name: /create goal|save goal|^create/i }).last().click();
  // Creating a goal offers to turn it into quests — close the generator for now.
  const generator = page.getByRole('dialog', { name: /quest generator/i });
  if (await generator.isVisible().catch(() => false)) await page.keyboard.press('Escape');
  await page.goto('#/quests/goals');
  await page.getByRole('button', { name: /learn 100 words/i }).click();
  await expect(page.getByRole('status').filter({ hasText: /milestone reached/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /learn 100 words/i })).toHaveAttribute('aria-pressed', 'true');
});

test('the quest generator suggests realistic quests and refuses harmful ones', async ({ page }) => {
  await onboard(page);
  await page.goto('#/quests');
  await page.getByRole('button', { name: /generate quests/i }).first().click();
  const sheet = page.getByRole('dialog', { name: /quest generator/i });
  await sheet.getByLabel('What do you want to get better at?').fill('I want to get better at coding');
  await sheet.getByRole('button', { name: 'Generate', exact: true }).click();
  await expect(sheet.getByRole('checkbox').first()).toBeVisible();
  const count = await sheet.getByRole('checkbox').count();
  expect(count).toBeGreaterThanOrEqual(3);
  await sheet.getByRole('button', { name: /^add \d+ quests?/i }).click();
  await expect(sheet).toBeHidden();
  await page.goto('#/quests/all');
  await expect(page.getByRole('article').filter({ hasText: /code|coding|program/i }).first()).toBeVisible();

  await page.goto('#/quests');
  await page.getByRole('button', { name: /generate quests/i }).first().click();
  await sheet.getByLabel('What do you want to get better at?').fill('I want to study 20 hours a day and never sleep');
  await sheet.getByRole('button', { name: 'Generate', exact: true }).click();
  await expect(sheet.getByRole('status')).toContainText(/sleep|rest|healthy|burn/i);
});

test('journal entries with a mood and a photo appear on the timeline', async ({ page }) => {
  await onboard(page);
  await page.goto('#/progress/journal');
  await page.getByRole('button', { name: /how did today go/i }).click();
  const sheet = page.getByRole('dialog', { name: /how did today go/i });
  await sheet.getByRole('radio').nth(3).click();
  await sheet.getByLabel('Your entry').fill('Had a really productive day. Finished my study session early.');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await sheet.locator('input[type=file]').setInputFiles({ name: 'sunset.png', mimeType: 'image/png', buffer: png });
  await expect(sheet.getByRole('button', { name: 'Remove photo' })).toBeVisible();
  await sheet.getByRole('button', { name: /save/i }).click();
  await expect(sheet).toBeHidden();
  await dismissCelebrations(page);
  await expect(page.getByRole('article').getByText('Had a really productive day.')).toBeVisible();
  await expect(page.getByRole('img', { name: /photo from/i })).toBeVisible();
});

test('a rest day protects the streak and pays a little XP', async ({ page }) => {
  await onboard(page);
  await page.goto('#/progress/streaks');
  await page.getByRole('button', { name: /take a rest day/i }).click();
  const sheet = page.getByRole('dialog', { name: /rest day/i });
  await sheet.getByRole('button', { name: /take today off/i }).click();
  await expect(page.getByRole('status').filter({ hasText: /rest day/i })).toBeVisible();
});

test('party mode: add a friend by code, see them on the leaderboard and challenge them', async ({ page }) => {
  await onboard(page, { name: 'Ahmed' });
  await page.goto('#/character/party');
  await page.getByRole('button', { name: /turn on party mode/i }).click();
  await page.getByRole('button', { name: /invite or add friends/i }).click();
  const sheet = page.getByRole('dialog', { name: /your party/i });
  await sheet.getByRole('tab', { name: /add a friend/i }).click();
  const code = partyCode({ v: 1, id: 'friend-1', n: 'Player_4821', c: 'athlete', av: { s: 'sigil:bolt', b: 'bg:ember', f: 'frame:hex', a: 'aura:glow' }, l: 7, x: 2400, at: Date.now() - 60_000 });
  await sheet.getByLabel(/paste a party code/i).fill(code);
  await expect(sheet.getByText('Player_4821')).toBeVisible();
  await sheet.getByRole('button', { name: /add to party/i }).click();
  await expect(sheet).toBeHidden();
  await dismissCelebrations(page);

  await expect(page.getByRole('list', { name: /leaderboard/i }).getByText('Player_4821')).toBeVisible();
  await page.getByRole('button', { name: /start challenge/i }).click();
  await expect(page.getByText(/you vs player_4821/i)).toBeVisible();
  await expect(page.getByText(/winner earns 250 coins/i)).toBeVisible();
});

test('the shop sells cosmetics for coins and the wardrobe equips them', async ({ page }) => {
  await page.goto('#/demo');
  await expect(page).toHaveURL(/#\/home/, { timeout: 20_000 });
  await page.goto('#/character/shop');
  const frame = page.locator('[data-shop-item="frame:cyber"]');
  await frame.getByRole('button', { name: 'Buy' }).click();
  await page.getByRole('alertdialog', { name: /buy cyber frame/i }).getByRole('button', { name: 'Buy' }).click();
  await expect(page.getByRole('status').filter({ hasText: /unlocked/i })).toBeVisible();
  await expect(frame.getByText('Owned')).toBeVisible();
  await expect(page.getByLabel('1,465 coins').filter({ visible: true }).first()).toBeVisible();
  await frame.getByRole('button', { name: 'Equip' }).click();
  await expect(frame.getByRole('button', { name: 'Equipped' })).toBeVisible();

  await page.goto('#/character/wardrobe');
  await page.getByRole('tab', { name: 'Titles' }).click();
  await page.getByRole('button', { name: /the novice/i }).click();
  await page.goto('#/character');
  await expect(page.getByRole('heading', { name: /alex the novice/i })).toBeVisible();
});
