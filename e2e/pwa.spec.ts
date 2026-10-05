import { expect, test } from '@playwright/test';
import { onboard } from './helpers';

test('the web app manifest and icons are valid', async ({ request }) => {
  const res = await request.get('manifest.json');
  expect(res.ok()).toBeTruthy();
  const manifest = await res.json();
  expect(manifest.short_name).toBe('Evolve');
  expect(manifest.display).toBe('standalone');
  expect(manifest.start_url).toBeTruthy();
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
  for (const icon of manifest.icons as { src: string }[]) expect((await request.get(icon.src)).ok(), icon.src).toBeTruthy();
  expect((await request.get('icons/apple-touch-icon.png')).ok()).toBeTruthy();
  expect((await request.get('sw.js')).ok()).toBeTruthy();
});

test('the app works offline after the first visit', async ({ page, context }) => {
  await page.goto('./');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await onboard(page, { name: 'Offline Hero' });

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: /offline hero/i })).toBeVisible();
  await expect(page.getByText(/offline — everything still works/i)).toBeVisible();

  // Lazily loaded screens come from the precache too.
  await page.goto('#/character/shop');
  await expect(page.getByRole('heading', { name: /featured/i })).toBeVisible();
  await page.goto('#/progress/streaks');
  await expect(page.getByText('days in a row')).toBeVisible();
  await context.setOffline(false);
});
