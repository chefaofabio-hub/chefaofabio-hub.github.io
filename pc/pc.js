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
  m.append(esq, dir); m.classList.add("pc-grid");
  document.querySelector('#nav a[data-aba="regioes"]')?.remove();
  if (location.hash === "#regioes") history.replaceState(null, "", "#apuracao");
})();
// Ao trocar de aba, volta ao topo (evita o navegador rolar até a âncora).
addEventListener("hashchange", () => scrollTo(0, 0));
addEventListener("load", () => setTimeout(() => scrollTo(0, 0), 50));
