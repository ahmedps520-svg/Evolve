/**
 * Captures store-style screenshots of the demo hero for the web app manifest (richer install UI)
 * and the README. Builds nothing: run `npm run build` first. Usage: `npm run screenshots`.
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = fileURLToPath(new URL('..', import.meta.url));
const PORT = 4183;
const base = `http://localhost:${PORT}/`;

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'ignore' });
const stop = () => server.kill('SIGTERM');
process.on('exit', stop);

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(base)).ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Preview server did not start. Run `npm run build` first.');
}

const shots = [
  // Manifest screenshots (install dialogs).
  { file: 'public/screenshots/wide-home.jpg', viewport: { width: 1280, height: 800 }, scale: 1, route: 'home' },
  { file: 'public/screenshots/narrow-home.jpg', viewport: { width: 390, height: 844 }, scale: 2, route: 'home', mobile: true },
  // README.
  { file: 'docs/screenshots/desktop-home.jpg', viewport: { width: 1440, height: 900 }, scale: 1, route: 'home' },
  { file: 'docs/screenshots/desktop-progress.jpg', viewport: { width: 1440, height: 900 }, scale: 1, route: 'progress' },
  { file: 'docs/screenshots/desktop-character.jpg', viewport: { width: 1440, height: 900 }, scale: 1, route: 'character' },
  { file: 'docs/screenshots/mobile-quests.jpg', viewport: { width: 390, height: 844 }, scale: 2, route: 'quests', mobile: true },
  { file: 'docs/screenshots/mobile-streaks.jpg', viewport: { width: 390, height: 844 }, scale: 2, route: 'progress/streaks', mobile: true },
  { file: 'docs/screenshots/light-weekly.jpg', viewport: { width: 1440, height: 900 }, scale: 1, route: 'quests/weekly', light: true },
];

mkdirSync(join(root, 'public/screenshots'), { recursive: true });
mkdirSync(join(root, 'docs/screenshots'), { recursive: true });

await waitForServer();
const browser = await chromium.launch();
for (const s of shots) {
  const context = await browser.newContext({ viewport: s.viewport, deviceScaleFactor: s.scale, isMobile: !!s.mobile, hasTouch: !!s.mobile, colorScheme: s.light ? 'light' : 'dark' });
  const page = await context.newPage();
  await page.goto(`${base}#/demo`);
  await page.waitForURL(/#\/home/, { timeout: 30_000 });
  if (s.light) {
    await page.goto(`${base}#/settings`);
    await page.getByRole('radio', { name: 'Light' }).click();
  }
  await page.goto(`${base}#/${s.route}`);
  // Hide the demo banner: screenshots show the app as a player sees it.
  await page.addStyleTag({ content: '[data-demo-banner] { display: none !important; }' });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: join(root, s.file), type: 'jpeg', quality: 86 });
  console.log('  ✓', s.file);
  await context.close();
}
await browser.close();
stop();
