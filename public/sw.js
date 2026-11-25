// Offline shell for the installed app.
//
// The public site and the flyer studio are both client-side: the studio keeps
// drafts in IndexedDB and the flyer renders entirely in the browser. Once the
// shell is cached, the app opens without a network connection and the stored
// drafts remain readable.
//
// The cache is deliberately conservative. Only same-origin GET requests are
// cached, and navigation requests prefer the network so a deployed update is
// picked up on the next connection. Nothing here is allowed to break the
// published site or the studio's storage guarantees.

const VERSION = "tirasi-shell-v1";
const SHELL = `${VERSION}-shell`;
const RUNTIME = `${VERSION}-runtime`;

// The shell is the minimum needed to start the app: the document, the icons
// and the manifest. Hashed build assets are picked up at runtime instead,
// because their names change on every build.
const SHELL_URLS = [
  "/",
  "/manifest.webmanifest",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL && key !== RUNTIME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isCacheable(url) {
  return url.origin === self.location.origin && url.protocol === "https:";
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (!isCacheable(url)) return;

  // Navigations go to the network first so a fresh deployment is served as
  // soon as the device is online again; the cached shell is the fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL).then((cache) => cache.put("/", copy));
          return response;
        })
        .catch(() => caches.match("/").then((cached) => cached ?? Response.error())),
    );
    return;
  }

  // Build assets carry a content hash in their name, so a cached copy stays
  // correct for as long as that hash is served.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok && response.type === "basic") {
            const copy = response.clone();
            caches.open(RUNTIME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached ?? Response.error());
    }),
  );
});
