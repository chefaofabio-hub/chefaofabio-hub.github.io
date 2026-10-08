// Service worker: guarda o "casco" do app para abrir rápido/offline e recebe os alertas de nova pesquisa.
// Dados (TSE, pesquisas.json, push_endpoint.json) NUNCA vêm do cache se a rede responder.
const VERSAO = "apuracao-pres-v21";
const CASCO = ["./", "index.html", "style.css?v=21", "app.js?v=21", "manifest.json",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", "icons/favicon-32.png"];
const PESQ = "https://chefaofabio-hub.github.io/#pesquisas";
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSAO).then(c => c.addAll(CASCO)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))
  .then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;     // TSE, fontes e coletor: direto da rede
  if (url.pathname.endsWith("push_endpoint.json")) return;                       // endereço do coletor: sempre da rede
  if (url.pathname.endsWith("pesquisas.json")) {                                // dados: rede primeiro, cache só se offline
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(VERSAO).then(ca => ca.put("pesquisas.json", c)); return r; })
      .catch(() => caches.match("pesquisas.json")));
    return;
  }
  // casco: rede primeiro (pega versão nova), cai para o cache sem internet
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(VERSAO).then(ca => ca.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request, {ignoreSearch: false}).then(m => m || caches.match("index.html"))));
});

// ---- alerta de nova pesquisa (Web Push) ----
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = {body: e.data ? e.data.text() : ""}; }
  const titulo = d.title || "❗ Nova pesquisa eleitoral";
  const op = {body: d.body || "Toque para ver", icon: "icons/icon-192.png", badge: "icons/icon-192.png",
              tag: d.tag || "nova-pesquisa", renotify: true, data: {url: d.url || PESQ}};
  e.waitUntil((async () => {
    await self.registration.showNotification(titulo, op);
    let badge = false;
    try { if (self.navigator.setAppBadge) { await self.navigator.setAppBadge(1); badge = true; } } catch (x) {}
    const cs = await self.clients.matchAll({type: "window", includeUncontrolled: true});
    for (const c of cs) c.postMessage({tipo: "push", titulo, corpo: op.body, badge});
  })());
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const alvo = (e.notification.data && e.notification.data.url) || PESQ;
  e.waitUntil((async () => {
    const cs = await self.clients.matchAll({type: "window", includeUncontrolled: true});
    for (const c of cs) if (new URL(c.url).origin === location.origin) {
      c.postMessage({tipo: "abrir"});
      return c.focus();
    }
    return self.clients.openWindow(alvo);
  })());
});
