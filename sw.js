// Service worker minimo: cachea el app shell para que el dashboard sea instalable
// (PWA / TWA de Google Play) y funcione offline. Navegaciones (el HTML) usan network-first
// para no pisar el chequeo de version que ya hace index.html (ver checkVersion) -- solo se
// sirve desde cache si no hay conexion. Assets estaticos usan cache-first con revalidacion
// en segundo plano.
var CACHE_NAME = "redplus-dashboard-v1";
var APP_SHELL = ["./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) { return cache.addAll(APP_SHELL); })
      .then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== CACHE_NAME; }).map(function(k) { return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(event) {
  var req = event.request;
  if (req.method !== "GET") return;

  if (req.mode === "navigate" || req.destination === "document") {
    event.respondWith(
      fetch(req).then(function(res) {
        var copy = res.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(req, copy); });
        return res;
      }).catch(function() {
        return caches.match(req).then(function(cached) { return cached || caches.match("./index.html"); });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(function(cached) {
      var network = fetch(req).then(function(res) {
        caches.open(CACHE_NAME).then(function(cache) { cache.put(req, res.clone()); });
        return res;
      }).catch(function() { return cached; });
      return cached || network;
    })
  );
});
