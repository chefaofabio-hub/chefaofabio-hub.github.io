// Service worker: guarda o "casco" do app para abrir rápido/offline e recebe os alertas de nova pesquisa.
// Dados (TSE, pesquisas.json, push_endpoint.json) NUNCA vêm do cache se a rede responder.
const VERSAO = "apuracao-pres-v97";
const CASCO = ["./", "index.html", "style.css?v=86", "app.js?v=85", "adpf.js?v=3", "adpf.css?v=2", "manifest.json",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", "icons/favicon-32.png"];
const PESQ = "https://chefaofabio-hub.github.io/#pesquisas";
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSAO).then(c => c.addAll(CASCO)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))).then(() => ks))
  .then(() => self.clients.claim())); });
async function selo() { try { if (self.navigator.setAppBadge) await self.navigator.setAppBadge(); } catch (x) {} }
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/primeiro-turno/") || url.pathname.startsWith("/futebol/")) return;     // TSE, fontes e coletor: direto da rede
  if (url.pathname.endsWith("push_endpoint.json")) return;                       // endereço do coletor: sempre da rede
  if (url.pathname.endsWith("pesquisas.json") || url.pathname.endsWith("agendas.json") || url.pathname.endsWith("proximas.json") || url.pathname.endsWith("adpf.json")) {                                // dados: rede primeiro, cache só se offline
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(VERSAO).then(ca => ca.put(url.pathname.split("/").pop(), c)); return r; })
      .catch(() => caches.match(url.pathname.split("/").pop())));
    return;
  }
  // casco: rede primeiro (pega versão nova), cai para o cache sem internet
  e.respondWith(fetch(e.request, {cache: "no-cache"}).then(r => { if (r.ok) { const c = r.clone(); caches.open(VERSAO).then(ca => ca.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request, {ignoreSearch: false}).then(m => m || caches.match("index.html"))));
});

// ---- alerta de nova pesquisa (Web Push) ----
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = {body: e.data ? e.data.text() : ""}; }
  if (d.tipo === "atualizacao") {          // app atualizado: selo (ponto) no ícone + aviso curto que substitui o anterior
    e.waitUntil((async () => {
      await self.registration.showNotification(d.title || "Atualização dos números", {body: d.body || "Toque para ver", icon: "icons/icon-192.png",
        badge: "icons/icon-192.png", tag: "atualizacao", renotify: false, silent: true, data: {url: d.url || "https://chefaofabio-hub.github.io/"}});
      await selo();
      try { await self.registration.update(); } catch (x) {}
    })());
    return;
  }
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
  let alvo = (e.notification.data && e.notification.data.url) || PESQ;
  try { alvo = new URL(alvo, PESQ).href; } catch (x) { alvo = PESQ; }
  if (new URL(alvo).origin !== location.origin) alvo = PESQ;           // sempre abre o APP
  e.waitUntil((async () => {
    const cs = await self.clients.matchAll({type: "window", includeUncontrolled: true});
    const app = cs.find(c => { const u = new URL(c.url); return u.origin === location.origin && !u.pathname.startsWith("/primeiro-turno/") && !u.pathname.startsWith("/futebol/"); });
    if (app) {
      try { await app.focus(); } catch (x) {}
      if (new URL(alvo).hash === "#pesquisas") app.postMessage({tipo: "abrir"});
      else if (app.navigate && app.url !== alvo) { try { await app.navigate(alvo); } catch (x) {} }
      return;
    }
    return self.clients.openWindow(alvo);
  })());
});
