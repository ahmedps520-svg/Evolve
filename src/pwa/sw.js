/* Evolve service worker — offline-first app shell.
 * The precache list and version are injected at build time (see vite.config.ts). */
const VERSION = '__SW_VERSION__';
const PRECACHE = self.__PRECACHE_MANIFEST__;
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
