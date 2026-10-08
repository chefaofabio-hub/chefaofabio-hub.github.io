// Service worker: guarda o "casco" do app para abrir rápido/offline.
// Dados (TSE e pesquisas.json) NUNCA vêm do cache se a rede responder.
const VERSAO = "apuracao-pres-v16";
const CASCO = ["./", "index.html", "style.css?v=16", "app.js?v=16", "manifest.json",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", "icons/favicon-32.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSAO).then(c => c.addAll(CASCO)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))
  .then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;     // TSE e fontes: direto da rede
  if (url.pathname.endsWith("pesquisas.json")) {                                // dados: rede primeiro, cache só se offline
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(VERSAO).then(ca => ca.put("pesquisas.json", c)); return r; })
      .catch(() => caches.match("pesquisas.json")));
    return;
  }
  // casco: rede primeiro (pega versão nova), cai para o cache sem internet
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(VERSAO).then(ca => ca.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request, {ignoreSearch: false}).then(m => m || caches.match("index.html"))));
});
