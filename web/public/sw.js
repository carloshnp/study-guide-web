/*
 * Minimal service worker: it exists so browsers treat the site as an installable
 * app. It deliberately caches nothing -- chapters are revalidated by the server and
 * reading progress lives in the API, so an offline cache could only show stale
 * content. Add caching here only together with a versioned cache and a purge.
 */
self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()))
// A fetch handler (even a pass-through one) is part of Chrome's install criteria on some versions.
self.addEventListener("fetch", () => {})
