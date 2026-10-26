// Versão PC: usa o mesmo app.js/dados da raiz; só reorganiza a tela.
window.APP_PC = true; window.SW_URL = "/pc/sw.js"; window.SW_SCOPE = "/pc/";
(function () {
  const m = document.getElementById("aba-apuracao");
  const esq = document.createElement("div"); esq.className = "pc-esq";
  while (m.firstChild) esq.appendChild(m.firstChild);
  const dir = document.createElement("div"); dir.className = "pc-dir";
  dir.innerHTML = '<h2 class="pc-h2">VOTAÇÃO POR REGIÃO</h2><div class="subt">% dos votos válidos em cada região · TSE</div>';
  dir.appendChild(document.getElementById("regioes"));
  dir.appendChild(document.getElementById("ufHora").parentElement);
  for (const el of [...esq.querySelectorAll(":scope > #resultado, :scope > .autoria, :scope > .rod, :scope > .vivo, :scope > .aviso-teste")]) dir.appendChild(el);
  m.append(esq, dir); m.classList.add("pc-grid");
  document.querySelector('#nav a[data-aba="regioes"]')?.remove();
  if (location.hash === "#regioes") history.replaceState(null, "", location.pathname + location.search + "#flavio");
})();
// Ao trocar de aba, volta ao topo (evita o navegador rolar até a âncora).
addEventListener("hashchange", () => scrollTo(0, 0));
addEventListener("load", () => setTimeout(() => scrollTo(0, 0), 50));
// Com <base href="../">, links "#aba" iriam para a raiz (app do celular). Mantém tudo em /pc/.
document.addEventListener("click", e => {
  const a = e.target.closest && e.target.closest('a[href^="#"]');
  if (!a || e.ctrlKey || e.metaKey || e.shiftKey) return;
  e.preventDefault();
  const h = a.getAttribute("href");
  if (h.length > 1 && location.hash !== h) location.hash = h; else scrollTo(0, 0);
}, true);
// Título da Confiabilidade em uma linha (só no PC).
(function () { const h = document.querySelector("#aba-confiabilidade .cf-h1"); if (h) h.innerHTML = h.innerHTML.replace(/<br\s*\/?>/i, " "); })();
// Análise: junta o título "Aprovação…" com o gráfico dele numa coluna, ao lado do cartão do governo.
(function () {
  const box = document.getElementById("analise"); if (!box) return;
  const arrumar = () => {
    const k = [...box.children];
    const gv = k.find(x => x.classList.contains("gv3"));
    if (!gv || box.querySelector(":scope > .pc-col")) return;
    const tt = gv.nextElementSibling, gr = tt && tt.nextElementSibling;
    if (!tt || !gr || !tt.classList.contains("an-tt") || !gr.classList.contains("pq-graf")) return;
    const col = document.createElement("div"); col.className = "pc-col";
    gv.after(col); col.append(tt, gr);
  };
  new MutationObserver(arrumar).observe(box, {childList: true}); arrumar();
})();
// 1.7.24: Apuração cabe inteira na janela (escala pela altura útil), sem rolar.
(function () {
  const g = document.getElementById("aba-apuracao"); if (!g) return;
  let pend = false;
  const ajustar = () => {
    pend = false;
    if (g.hidden) { document.documentElement.style.overflowY = ""; return; }
    let z = parseFloat(g.style.zoom) || 0.74;
    for (let i = 0; i < 6; i++) {
      g.style.zoom = z;
      const r = g.getBoundingClientRect(), alt = r.height;
      const disp = innerHeight - r.top - 6;
      if (alt <= 0) return;
      const nz = Math.max(0.45, Math.min(1.1, z * disp / alt));
      if (Math.abs(nz - z) < 0.004) { if (alt > disp) z = nz - 0.004; else break; }
      z = nz;
    }
    z = Math.min(1, z); g.style.zoom = z.toFixed(3);
    for (let i = 0; i < 40 && g.getBoundingClientRect().bottom > innerHeight - 4 && z > 0.45; i++) { z -= 0.01; g.style.zoom = z.toFixed(3); }
  };
  const agendar = () => { if (!pend) { pend = true; requestAnimationFrame(ajustar); } };
  addEventListener("resize", agendar); addEventListener("hashchange", agendar); addEventListener("load", agendar);
  if (document.fonts) document.fonts.ready.then(agendar);
  new MutationObserver(agendar).observe(g, {childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["hidden"]});
  agendar();
})();
// 1.7.26: botão "Instalar no computador" (fica na linha do relógio, sem mudar a altura da tela)
(function () {
  const linha = document.querySelector(".versao-app"); if (!linha) return;
  const inst = () => matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: window-controls-overlay)").matches;
  let prompt = null;
  const b = document.createElement("button"); b.className = "pc-inst"; b.type = "button";
  b.innerHTML = "💻 <b>Instalar no computador</b>";
  const dica = document.createElement("div"); dica.className = "pc-inst-dica"; dica.hidden = true;
  dica.innerHTML = 'Para instalar: clique no ícone <b>⊕ / 🖥️ Instalar</b> na barra de endereço, ou no menu <b>⋮</b> → <b>Transmitir, salvar e compartilhar</b> → <b>Instalar página como app</b> (Chrome/Edge). <button type="button" aria-label="Fechar">×</button>';
  linha.insertBefore(b, linha.lastElementChild); document.body.appendChild(dica);
  const ver = () => { b.hidden = inst(); if (b.hidden) dica.hidden = true; };
  addEventListener("beforeinstallprompt", e => { e.preventDefault(); prompt = e; ver(); });
  addEventListener("appinstalled", () => { b.hidden = true; dica.hidden = true; });
  b.addEventListener("click", async () => {
    if (prompt) { const p = prompt; prompt = null; p.prompt(); try { await p.userChoice; } catch (x) {} ver(); }
    else dica.hidden = !dica.hidden;
  });
  dica.querySelector("button").addEventListener("click", () => { dica.hidden = true; });
  if (/[?&]instalar=1/.test(location.search)) b.classList.add("destaque");
  ver();
})();
