/**
 * Renders Evolve's PWA icons, favicons and iOS launch screens with headless Chromium.
 * Run with `npm run icons`. Output goes to public/icons and public/splash.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = fileURLToPath(new URL('..', import.meta.url));
const pub = (...p) => join(root, 'public', ...p);

const BG = '#06070a';
const ACCENT = '#8b7bff';
const ACCENT_2 = '#4fa3ff';
const FG = '#eef0f6';

const oxanium = readFileSync(join(root, 'src/assets/fonts/oxanium-latin-wght-normal.woff2')).toString('base64');

/** The Evolve mark (hex crest + rising chevrons) on a 64×64 grid. */
function mark({ id = 'g', mono = null, glow = true } = {}) {
  const paint = mono ?? `url(#${id})`;
  return `
    <defs>
      <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${ACCENT_2}" />
        <stop offset="1" stop-color="${ACCENT}" />
      </linearGradient>
      ${glow ? `<filter id="${id}-glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2.2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>` : ''}
    </defs>
    <g ${glow ? `filter="url(#${id}-glow)"` : ''}>
      <path d="M32 4.5 55.8 18.2v27.6L32 59.5 8.2 45.8V18.2z" fill="${mono ? 'none' : paint}" fill-opacity="${mono ? 0 : 0.14}" stroke="${paint}" stroke-width="3" stroke-linejoin="round" />
      <path d="M20 40.5 32 28.5l12 12" fill="none" stroke="${paint}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M20 30.5 32 18.5l12 12" fill="none" stroke="${paint}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="${mono ? 1 : 0.55}" />
    </g>`;
}

const BACKDROP_GRADIENT = `
  <radialGradient id="bg" cx="50%" cy="38%" r="70%">
    <stop offset="0" stop-color="#1a1840" />
    <stop offset="0.55" stop-color="#0c0e1c" />
    <stop offset="1" stop-color="${BG}" />
  </radialGradient>`;

/** A square app icon. `shape`: rounded tile, full-bleed square, or maskable (mark inside the safe zone). */
function iconSVG(size, shape) {
  const scale = shape === 'maskable' ? 0.5 : shape === 'square' ? 0.6 : 0.62;
  const m = size * scale;
  const off = (size - m) / 2;
  const radius = shape === 'tile' ? size * 0.225 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>${BACKDROP_GRADIENT}</defs>
    <rect width="${size}" height="${size}" rx="${radius}" fill="url(#bg)" />
    ${shape === 'tile' ? `<rect x="0.5" y="0.5" width="${size - 1}" height="${size - 1}" rx="${radius}" fill="none" stroke="rgba(255,255,255,0.08)" />` : ''}
    <svg x="${off}" y="${off}" width="${m}" height="${m}" viewBox="0 0 64 64" overflow="visible">${mark({ glow: size >= 64 })}</svg>
  </svg>`;
}

/** Vector favicon: the tile icon, crisp at any size. */
function faviconSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${ACCENT_2}" /><stop offset="1" stop-color="${ACCENT}" /></linearGradient>
    <radialGradient id="bg" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="#1a1840" /><stop offset="1" stop-color="${BG}" /></radialGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="url(#bg)" />
  <g transform="translate(9.5 9.5) scale(0.703)">
    <path d="M32 4.5 55.8 18.2v27.6L32 59.5 8.2 45.8V18.2z" fill="url(#g)" fill-opacity="0.14" stroke="url(#g)" stroke-width="3.6" stroke-linejoin="round" />
    <path d="M20 40.5 32 28.5l12 12" fill="none" stroke="url(#g)" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M20 30.5 32 18.5l12 12" fill="none" stroke="url(#g)" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.55" />
  </g>
</svg>
`;
}

function splashHTML(w, h) {
  const m = Math.round(Math.min(w, h) * 0.2);
  const font = Math.round(m * 0.26);
  return `<!doctype html><html><head><style>
    @font-face { font-family: Oxanium; src: url(data:font/woff2;base64,${oxanium}) format('woff2'); font-weight: 200 800; }
    html, body { margin: 0; width: ${w}px; height: ${h}px; background: ${BG}; overflow: hidden; }
    .wrap { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: ${Math.round(m * 0.32)}px; }
    /* A small glow keeps the launch image light: flat color compresses to almost nothing. */
    .glow { position: absolute; left: 50%; top: 50%; width: ${m * 2.4}px; height: ${m * 2.4}px; transform: translate(-50%, -60%); border-radius: 50%;
      background: radial-gradient(circle, rgba(139,123,255,0.16), rgba(139,123,255,0) 68%); }
    .word { font-family: Oxanium; font-weight: 700; font-size: ${font}px; letter-spacing: 0.42em; padding-left: 0.42em; color: ${FG}; opacity: 0.92; }
  </style></head><body><div class="glow"></div><div class="wrap">
    <svg width="${m}" height="${m}" viewBox="0 0 64 64" overflow="visible">${mark()}</svg>
    <div class="word">EVOLVE</div>
  </div></body></html>`;
}

const SPLASH = [
  [1320, 2868],
  [1290, 2796],
  [1206, 2622],
  [1179, 2556],
  [1170, 2532],
  [1284, 2778],
  [1125, 2436],
  [828, 1792],
  [750, 1334],
  [1640, 2360],
  [1668, 2388],
  [2048, 2732],
];

async function render(page, html, width, height, path, transparent = false) {
  await page.setViewportSize({ width, height });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path, omitBackground: transparent, clip: { x: 0, y: 0, width, height } });
  console.log('  ✓', path.replace(root, ''));
}

const svgPage = (svg, w, h, bg = 'transparent') => `<!doctype html><html><head><style>html,body{margin:0;width:${w}px;height:${h}px;background:${bg};overflow:hidden}svg{display:block}</style></head><body>${svg}</body></html>`;

mkdirSync(pub('icons'), { recursive: true });
mkdirSync(pub('splash'), { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ deviceScaleFactor: 1 });

console.log('Icons');
writeFileSync(pub('icons', 'favicon.svg'), faviconSVG());
console.log('  ✓ public/icons/favicon.svg');
await render(page, svgPage(faviconSVG().replace('<svg ', '<svg width="32" height="32" '), 32, 32), 32, 32, pub('icons', 'favicon-32.png'), true);
await render(page, svgPage(iconSVG(180, 'square'), 180, 180, BG), 180, 180, pub('icons', 'apple-touch-icon.png'));
await render(page, svgPage(iconSVG(192, 'tile'), 192, 192), 192, 192, pub('icons', 'icon-192.png'), true);
await render(page, svgPage(iconSVG(512, 'tile'), 512, 512), 512, 512, pub('icons', 'icon-512.png'), true);
await render(page, svgPage(iconSVG(512, 'maskable'), 512, 512, BG), 512, 512, pub('icons', 'maskable-512.png'));
await render(
  page,
  svgPage(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="-6 -6 76 76">${mark({ mono: '#ffffff', glow: false })}</svg>`, 96, 96),
  96,
  96,
  pub('icons', 'badge-96.png'),
  true,
);

console.log('Splash screens');
for (const [w, h] of SPLASH) await render(page, splashHTML(w, h), w, h, pub('splash', `apple-splash-${w}-${h}.png`));

await browser.close();
