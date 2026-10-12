// SW do app 1º turno, escopo /primeiro-turno/
const VERSAO = "primeiro-turno-v1";
const CASCO = ["./", "index.html", "style.css?v=1", "extra.css?v=1", "app.js?v=1", "manifest.json", "icons/icon-192.png", "snap/br.json"];
self.addEventListener("install", e => e.waitUntil(caches.open(VERSAO).then(c => c.addAll(CASCO)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("primeiro-turno-") && k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || !url.pathname.startsWith("/primeiro-turno/")) return;
  e.respondWith(fetch(e.request, {cache: "no-cache"}).then(r => { if (r.ok) { const c = r.clone(); caches.open(VERSAO).then(ca => ca.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request).then(m => m || caches.match("index.html"))));
});
