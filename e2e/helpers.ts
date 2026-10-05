import { expect, type Page } from '@playwright/test';

export interface OnboardOptions {
  name?: string;
  goals?: string[];
  difficulty?: 'Casual' | 'Normal' | 'Hardcore';
  className?: string;
}

/** Walks through the six onboarding screens and lands on the dashboard. */
export async function onboard(page: Page, { name = 'Ahmed', goals = ['Fitness', 'Studying', 'Reading'], difficulty = 'Normal', className = 'Scholar' }: OnboardOptions = {}) {
  await page.goto('#/onboarding');
  await page.getByRole('button', { name: /begin journey/i }).click();

  await expect(page.getByRole('heading', { name: /what should we call you/i })).toBeVisible();
  await page.getByLabel('Your name').fill(name);
  await page.getByRole('button', { name: /continue/i }).click();

  for (const goal of goals) await page.getByRole('button', { name: goal, exact: true }).click();
  await page.getByRole('button', { name: /continue/i }).click();

  await page.getByRole('radio', { name: new RegExp(difficulty, 'i') }).click();
  await page.getByRole('button', { name: /continue/i }).click();

  await expect(page.getByText('UNDEFINED', { exact: false })).toBeVisible();
  await page.getByRole('radio', { name: new RegExp(className) }).click();
  await page.locator('form button[type=submit]').click();

  await expect(page.getByRole('heading', { name: /your journey begins/i })).toBeVisible();
  await page.getByRole('button', { name: /enter/i }).click();
  await expect(page).toHaveURL(/#\/home/);
  await expect(page.getByRole('heading', { level: 1, name: new RegExp(name, 'i') })).toBeVisible();
}

/** Total XP from the hero card ("1,234 total XP"). */
export async function totalXP(page: Page): Promise<number> {
  await page.goto('#/home');
  const text = await page.getByText(/total XP$/).first().innerText();
  return Number(text.replace(/[^0-9]/g, ''));
}

/** Logs an activity through the Log sheet (opened with the `L` shortcut or the FAB). */
export async function logActivity(page: Page, { category, minutes }: { category: string; minutes: number }) {
  await page.getByRole('button', { name: 'Log activity' }).first().click();
  const sheet = page.getByRole('dialog', { name: /log activity/i });
  await expect(sheet).toBeVisible();
  await sheet.getByRole('radio', { name: category, exact: true }).click();
  await sheet.getByRole('spinbutton', { name: 'Duration in minutes' }).fill(String(minutes));
  await sheet.getByRole('spinbutton', { name: 'Duration in minutes' }).blur();
  await sheet.getByRole('button', { name: /^log \d/i }).click();
  await expect(sheet).toBeHidden();
}

/** Closes celebration modals (level up, achievement, loot) until none are left. */
export async function dismissCelebrations(page: Page) {
  const dialogs = page.getByRole('dialog').filter({ has: page.getByRole('button', { name: 'Continue' }) });
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(350);
    const dialog = dialogs.first();
    // A dialog that is already animating out may vanish between these calls.
    if (!(await dialog.isVisible().catch(() => false))) return;
    const name = await dialog.getAttribute('aria-label', { timeout: 1000 }).catch(() => null);
    await dialog.getByRole('button', { name: 'Continue' }).click({ timeout: 2000 }).catch(() => undefined);
    if (name) await expect(page.getByRole('dialog', { name, exact: true })).toHaveCount(0);
  }
}
