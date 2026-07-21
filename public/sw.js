const CACHE_NAME = "clinichms-shell-v2";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([OFFLINE_URL])).catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

function shouldBypass(request) {
  if (request.method !== "GET") return true;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return true;
  if (url.pathname.startsWith("/api/")) return true;
  if (url.pathname.startsWith("/_next/")) return true;
  if (url.pathname === "/sw.js") return true;
  if (url.pathname.endsWith(".webmanifest")) return true;

  // Next.js App Router flight / prefetch requests must not go through the SW.
  if (request.headers.get("RSC")) return true;
  if (request.headers.get("Next-Router-Prefetch")) return true;
  if (request.headers.get("Next-Router-State-Tree")) return true;
  if (url.searchParams.has("_rsc")) return true;

  return false;
}

self.addEventListener("fetch", (event) => {
  if (shouldBypass(event.request)) return;

  // Only handle top-level page navigations; everything else goes to the network directly.
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      const offline = await cache.match(OFFLINE_URL);
      return offline || Response.error();
    })
  );
});
