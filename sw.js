// 오프라인 저장 규칙 (service worker) — 배포 주소에서만 동작합니다.
//   페이지: 인터넷이 되면 항상 새로 받아 저장, 안 되면 저장해 둔 사본을 보여 줌.
//   아이콘·앱 정보: 저장해 둔 것을 먼저 사용.
//   VERSION 은 배포할 때 publish-web.js 가 자동으로 바꿉니다.
const VERSION = '1a073ccdaf';
const CACHE = 'icn-deicing-' + VERSION;
const PAGE = './';
const FILES = [PAGE, './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('icn-deicing-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    // 신호가 약할 때 오래 기다리지 않도록 6초가 지나면 저장본을 보여 줌
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const net = await Promise.race([
          fetch(req, { cache: 'no-store' }),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 6000)),
        ]);
        if (net.ok) cache.put(PAGE, net.clone());
        return net;
      } catch (err) {
        return (await cache.match(PAGE)) || Response.error();
      }
    })());
    return;
  }

  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req)));
});
