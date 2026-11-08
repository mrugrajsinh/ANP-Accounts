// App files: network-first (so GitHub updates show up), cache fallback when offline.
// Firebase / Excel libraries: cache-first (their URLs are versioned).
const CACHE = 'anp-accounts-v30';
const ASSETS = ['./', './index.html', './firebase-config.js', './manifest.json', './apple-touch-icon.png', './icon-192.png', './icon-512.png', './logo.jpg'];
const LIBS = ['www.gstatic.com', 'cdn.sheetjs.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  if (LIBS.includes(url.hostname)) {
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }))
    );
    return;
  }

  if (url.origin !== location.origin) return; // Firebase data calls go straight to the network

  e.respondWith(
    fetch(e.request, {cache: 'no-cache'})   // always check GitHub for the newest version
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, {ignoreSearch: true}).then(r => r || caches.match('./index.html')))
  );
});

// Tapping a notification opens the app (or brings it to the front) on the right screen
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './?go=tasks', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(list => {
    for (const c of list) {
      if (c.url.startsWith(self.registration.scope)) { c.postMessage({go: new URL(url).searchParams.get('go') || 'tasks'}); return c.focus(); }
    }
    return self.clients.openWindow(url);
  }));
});

// Push messages (for alerts when the app is closed / phone locked)
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = {notification: {title: 'ANP Accounts', body: e.data ? e.data.text() : ''}}; }
  const n = d.notification || d.data || {};
  e.waitUntil(self.registration.showNotification(n.title || 'ANP Accounts', {
    body: n.body || '', icon: 'icon-192.png', badge: 'icon-192.png', tag: n.tag || undefined,
    data: {url: (d.data && d.data.url) || './?go=tasks'}
  }));
});
