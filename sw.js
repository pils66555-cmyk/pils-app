const CACHE = "pils-shell-v2";
const SHELL = ["/", "/index.html", "/app.js", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request)
        .then((res) => {
          if (res && res.status === 200 && e.request.url.startsWith(self.location.origin)) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

/* Notifications envoyées par le serveur push (voir /server) */
self.addEventListener("push", (e) => {
  let data = { title: "Pils.", body: "C'est l'heure de ta pilule" };
  try { if (e.data) data = { ...data, ...e.data.json() }; } catch (err) { }
  e.waitUntil(
    self.registration.showNotification(data.title || "Pils.", {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag || "pils-reminder",
      renotify: true,
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if ("focus" in c) return c.focus();
      if (self.clients.openWindow) return self.clients.openWindow("/");
    })
  );
});

