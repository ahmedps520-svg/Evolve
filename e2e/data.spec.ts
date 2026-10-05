import { readFile, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { dismissCelebrations, logActivity, onboard, totalXP } from './helpers';

test('export a backup, reset everything, then restore it', async ({ page }, testInfo) => {
  await onboard(page, { name: 'Backup Hero' });
  await logActivity(page, { category: 'Reading', minutes: 20 });
  await dismissCelebrations(page);
  const xpBefore = await totalXP(page);
  expect(xpBefore).toBeGreaterThan(0);

  await page.goto('#/settings');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /export json/i }).click()]);
  expect(download.suggestedFilename()).toMatch(/^evolve-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const file = testInfo.outputPath('backup.json');
  await download.saveAs(file);
  const backup = JSON.parse(await readFile(file, 'utf8'));
  expect(backup.app).toBe('evolve');
  expect(backup.data.profile.name).toBe('Backup Hero');
  expect(backup.data.activities).toHaveLength(1);

  // Reset only goes through after typing RESET exactly.
  await page.getByRole('button', { name: /^reset$/i }).click();
  const dialog = page.getByRole('alertdialog', { name: /reset all progress/i });
  const confirm = dialog.getByRole('button', { name: /reset everything/i });
  await expect(confirm).toBeDisabled();
  await dialog.getByRole('textbox').fill('reset');
  await expect(confirm).toBeDisabled();
  await dialog.getByRole('textbox').fill('RESET');
  await confirm.click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('REAL LIFE.');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('REAL LIFE.');

  // Restore from the first onboarding screen.
  await page.goto('#/onboarding');
  await page.locator('input[type=file]').setInputFiles(file);
  await expect(page.getByRole('heading', { level: 1, name: /backup hero/i })).toBeVisible();
  expect(await totalXP(page)).toBe(xpBefore);
});

test('importing a file that is not a backup shows a friendly error', async ({ page }, testInfo) => {
  await onboard(page);
  await page.goto('#/settings');
  const bad = testInfo.outputPath('not-a-backup.json');
  await writeFile(bad, JSON.stringify({ hello: 'world' }));
  await page.locator('input[type=file]').setInputFiles(bad);
  await expect(page.getByRole('alert').filter({ hasText: /couldn.t import/i })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText(/doesn.t look like an evolve backup/i);
});
