const BASE = "/huginn-korvila";
const SHELL = [
  `${BASE}/`,
  `${BASE}/import/`,
  `${BASE}/regler/`,
  `${BASE}/installningar/`,
  `${BASE}/foretag/`,
  `${BASE}/forare/`,
  `${BASE}/fordon/`,
  `${BASE}/kom-igang/`,
  `${BASE}/manifest.webmanifest`,
  `${BASE}/favicon.ico`,
  `${BASE}/favicon-32.png`,
  `${BASE}/apple-touch-icon.png`,
  `${BASE}/icons/icon-192.png`,
  `${BASE}/icons/icon-512.png`,
  `${BASE}/icons/icon-maskable-192.png`,
  `${BASE}/icons/icon-maskable-512.png`,
  `${BASE}/brand/emblem-512.png`,
  `${BASE}/brand/emblem-256.png`,
  `${BASE}/brand/emblem-ljus-512.png`,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open("huginn-shell-v1");
      await Promise.all(
        SHELL.map(async (url) => {
          try {
            const res = await fetch(url);
            if (res.ok) await cache.put(url, res);
          } catch {
            /* En saknad fil ska inte fälla installationen. */
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set(["huginn-shell-v1", "huginn-runtime-v1"]);
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => !keep.has(key)).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(BASE)) return;
  event.respondWith(route(req, url));
});

async function route(req, url) {
  const asset = url.pathname.includes("/_next/static/");
  if (asset) {
    const hit = await caches.match(req);
    if (hit) return hit;
  }
  try {
    const res = await fetch(req);
    if (res.ok) {
      const cache = await caches.open(asset ? "huginn-runtime-v1" : "huginn-shell-v1");
      cache.put(req, res.clone());
    }
    return res;
  } catch {
    const hit = await caches.match(req);
    if (hit) return hit;
    if (req.mode === "navigate") {
      const shell = await caches.match(`${BASE}/`);
      if (shell) return shell;
    }
    return Response.error();
  }
}
