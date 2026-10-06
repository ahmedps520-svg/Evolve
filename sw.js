/* Evolve service worker — offline-first app shell.
 * The precache list and version are injected at build time (see vite.config.ts). */
const VERSION = '6d3c264b04ba';
const PRECACHE = ["./","assets/Achievements-wOOet-ZD.js","assets/AnimatePresence-32BIJlNi.js","assets/Avatar-D4SCiT78.js","assets/Button-3LIkZgPO.js","assets/Character-DWKAlO8H.js","assets/Display-BAaALe7U.js","assets/Focus-B_WPfJQ1.js","assets/FocusSetupSheet-CzICKOCR.js","assets/GeneratorSheet-D8ST-Wy3.js","assets/GoalFormSheet-AwU_zc3I.js","assets/History-C5eBVRjE.js","assets/Journal-hZ-SAKGg.js","assets/JournalSheet-BJKGJ_-E.js","assets/Landing-D7su4nVF.js","assets/Onboarding-DfjN6DdO.js","assets/Party-CpErNY86.js","assets/PartySheet-BoR6KjSe.js","assets/Progress-BiTek_nS.js","assets/QuestFormSheet-LxnXxJQ1.js","assets/Quests-DSf0aWp1.js","assets/Radar-BzvxptCp.js","assets/RestDaySheet-Bf9zowuQ.js","assets/Settings-CQ3KEk78.js","assets/Shop-BZ2LRKEi.js","assets/Skills-BRaW3N6T.js","assets/Streaks-CPcNWeOG.js","assets/Wardrobe-TiHUQE8b.js","assets/attributes-D_zuEc82.js","assets/backup-VUlmVHt4.js","assets/index-CTz16kgZ.js","assets/index-Dow9A8ib.css","assets/inter-latin-ext-wght-normal-DO1Apj_S.woff2","assets/inter-latin-wght-normal-Dx4kXJAl.woff2","assets/motion-DQhQCURZ.js","assets/oxanium-latin-ext-wght-normal-C7ptlTmX.woff2","assets/oxanium-latin-wght-normal-BwpvAp5U.woff2","assets/single-value-9PSxCYUy.js","icons/apple-touch-icon.png","icons/badge-96.png","icons/favicon-32.png","icons/favicon.svg","icons/icon-192.png","icons/icon-512.png","icons/maskable-512.png","index.html","manifest.json"];
const CACHE = `evolve-${VERSION}`;
const SCOPE = self.registration.scope;
const INDEX = new URL('./', SCOPE).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(PRECACHE.map((path) => new Request(new URL(path, SCOPE).href, { cache: 'reload' }))),
    ),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('evolve-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // App navigations always get the cached shell (hash routing does the rest).
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(INDEX, { ignoreSearch: true }).then((cached) => cached || fetch(request).catch(() => caches.match(INDEX))),
    );
    return;
  }

  // Static assets: cache first, then network (and remember it for next time).
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(
      (cached) =>
        cached ||
        fetch(request)
          .then((response) => {
            if (response.ok && (url.pathname.includes('/assets/') || url.pathname.includes('/icons/'))) {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached),
    ),
  );
});

/* ───────────── Notifications ───────────── */

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || './', SCOPE).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.startsWith(SCOPE) && 'focus' in client) {
          client.navigate(target).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});

/* Daily reminder via Periodic Background Sync (supported on some installed PWAs).
 * Reads only the settings and last-seen day from local storage — nothing leaves the device. */
function readKV(key) {
  return new Promise((resolve) => {
    const open = indexedDB.open('evolve');
    // Never create the database from here — only the app may do that (with its schema).
    open.onupgradeneeded = () => open.transaction.abort();
    open.onerror = () => resolve(null);
    open.onsuccess = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains('kv')) return resolve(null);
      const req = db.transaction('kv').objectStore('kv').get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => resolve(null);
    };
  });
}

function localDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag !== 'evolve-daily-reminder') return;
  event.waitUntil(
    Promise.all([readKV('settings'), readKV('meta')]).then(async ([settings, meta]) => {
      const n = settings && settings.notifications;
      if (!n || !n.enabled || !n.dailyReminder || !meta) return;
      const now = new Date();
      const today = localDateKey(now);
      if (meta.lastSeenDate === today) return; // already opened today
      const [h, m] = String(n.reminderTime || '18:00').split(':').map(Number);
      if (now.getHours() * 60 + now.getMinutes() < h * 60 + m) return;
      const shown = await self.registration.getNotifications({ tag: 'evolve-daily' });
      if (shown.length) return;
      await self.registration.showNotification('Your daily quest is waiting', {
        body: 'A new quest board is ready. Even one quest counts.',
        tag: 'evolve-daily',
        icon: './icons/icon-192.png',
        badge: './icons/badge-96.png',
        data: { url: './#/quests' },
      });
    }),
  );
});
