"use strict";
const $ = id => document.getElementById(id);
const TSE = "https://resultados.tse.jus.br/oficial/ele2026/6257/dados/";
const num = s => Number(String(s ?? "0").replace(",", ".")) || 0;
const fint = n => Math.round(n).toLocaleString("pt-BR");
const fpct = (x, d = 2) => x.toLocaleString("pt-BR", {minimumFractionDigits: d, maximumFractionDigits: d}) + "%";
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
const CORES = {"22": "#1f4fa8", "13": "#c8102e"};
const PALETA = ["#f08c00", "#2b9348", "#7b2cbf", "#0096c7", "#d6336c", "#8d6e63", "#5c940d", "#e8590c", "#495057", "#ae3ec9"];
const cor = (n, i) => CORES[n] || PALETA[i % PALETA.length];
const titulo = s => s.toLowerCase().replace(/(^|\s)(\p{L})/gu, (m, a, b) => a + b.toUpperCase()).replace(/\bDo\b|\bDa\b|\bDe\b/g, w => w.toLowerCase());
const UFS = {ac:"N",am:"N",ap:"N",pa:"N",ro:"N",rr:"N",to:"N",al:"NE",ba:"NE",ce:"NE",ma:"NE",pb:"NE",pe:"NE",pi:"NE",rn:"NE",se:"NE",
  df:"CO",go:"CO",mt:"CO",ms:"CO",es:"SE",mg:"SE",rj:"SE",sp:"SE",pr:"S",rs:"S",sc:"S"};
const REGIOES = [["N","Norte"],["NE","Nordeste"],["SE","Sudeste"],["S","Sul"],["CO","Centro-Oeste"]];

async function pegar(cod) {
  try { const r = await fetch(`${TSE}${cod}/${cod}-c0001-e006257-u.json`, {cache: "no-cache"}); if (!r.ok) throw 0; return [await r.json(), true]; }
  catch (e) { const r = await fetch(`snap/${cod}.json`); return [await r.json(), false]; }
}
function ler(d) {
  const cands = [];
  for (const a of d.carg[0].agr) for (const p of a.par) for (const c of p.cand)
    cands.push({n: c.n, nome: c.n === "22" ? "Flávio Bolsonaro" : titulo(c.nmu), v: num(c.vap), p: num(c.pvapn), st: c.st, part: p.sg});
  cands.sort((a, b) => b.v - a.v);
  const so2 = cands.filter(c => c.n === "22" || c.n === "13");
  const e = d.e, v = d.v, s = d.s;
  return {cands: so2, pu: num(s.pstn), vv: num(v.vv), vb: num(v.vb), pvb: num(v.pvbn), vn: num(v.tvn), pvn: num(v.ptvnn),
    comp: num(e.c), pcomp: num(e.pcn), abst: num(e.a), pabst: num(e.pan), te: num(e.te), hora: `${d.dt} às ${d.ht}`};
}
let BR = null; const UF = {};

function desenharBR(r, aoVivo) {
  $("pu").textContent = fpct(r.pu); $("puBar").style.width = r.pu + "%";
  const seg = r.cands.filter(c => /2º turno/i.test(c.st));
  $("segt").innerHTML = seg.length ? `➡️ Foram para o 2º turno: <b class="az">${esc(seg[0].nome)}</b> e <b class="vm">${esc(seg[1]?.nome || "")}</b>` : "";
  $("segt").hidden = !seg.length;
  $("lista").innerHTML = r.cands.map((c, i) => `<div class="c1${i < 2 ? " top" : ""}">
    <div class="linha1"><span class="nome" style="color:${cor(c.n, i)}">${esc(c.nome)} <small>${esc(c.part)}</small>${/2º turno/i.test(c.st) ? '<span class="tag2">2º TURNO</span>' : ""}</span>
    <span class="vt">${fint(c.v)} <small>votos</small></span></div>
    <div class="linha2"><div class="trilho"><div class="barra" style="width:${Math.max(c.p, .4)}%;background:${cor(c.n, i)}"></div></div><span class="pct">${fpct(c.p)}</span></div></div>`).join("");
  const ex = (t, n, p) => `<div class="ex"><span>${t}</span><b>${fint(n)}</b>${p != null ? `<small>${fpct(p)}</small>` : ""}</div>`;
  $("extras").innerHTML = `<div class="extras2">${ex("Votos válidos", r.vv)}${ex("Brancos", r.vb, r.pvb)}${ex("Nulos", r.vn, r.pvn)}${ex("Comparecimento", r.comp, r.pcomp)}${ex("Abstenção", r.abst, r.pabst)}${ex("Eleitorado", r.te)}</div>`
    + (aoVivo ? "" : `<div class="fonteaviso">Sem conexão com o TSE: mostrando cópia salva do resultado oficial.</div>`);
  $("linhaHora").textContent = `· totalizado em ${r.hora}`;
}
async function carregarBR() {
  try { const [d, ok] = await pegar("br"); BR = ler(d); desenharBR(BR, ok); }
  catch (e) { $("lista").innerHTML = '<div class="vazio">Não foi possível carregar. Tente de novo.</div>'; }
}
let ufCarregado = false;
async function carregarUFs() {
  if (ufCarregado) return; ufCarregado = true;
  await Promise.all(Object.keys(UFS).map(async u => { try { UF[u] = ler((await pegar(u))[0]); } catch (e) {} }));
  desenharRegioes();
}
function desenharRegioes() {
  $("regioes").innerHTML = REGIOES.map(([cod, nome]) => {
    const tot = {}, info = {}; let vv = 0;
    for (const [u, r] of Object.entries(UFS)) { if (r !== cod || !UF[u]) continue; vv += UF[u].vv;
      for (const c of UF[u].cands) { tot[c.n] = (tot[c.n] || 0) + c.v; info[c.n] = c; } }
    const ord = Object.entries(tot).sort((a, b) => b[1] - a[1]).filter(([n]) => n === "22" || n === "13");
    const idx = n => BR ? BR.cands.findIndex(c => c.n === n) : 0;
    return `<div class="rg"><h3>${nome}<small>${fint(vv)} votos válidos</small></h3>${ord.map(([n, v]) =>
      `<div class="rgl"><span class="n" style="color:${cor(n, idx(n))}">${n === "22" ? "Flávio" : "Lula"}</span><span class="t"><i style="width:${100 * v / vv}%;background:${cor(n, idx(n))}"></i></span><span class="p">${fpct(100 * v / vv)}</span></div>`).join("")}</div>`;
  }).join("");
}
function desenharEstados() {
  let wf = 0, wl = 0;
  const linhas = Object.keys(UFS).sort().map(u => { const r = UF[u]; if (!r) return "";
    const f = r.cands.find(c => c.n === "22"), l = r.cands.find(c => c.n === "13"), top = r.cands[0];
    if (top.n === "22") wf++; else if (top.n === "13") wl++;
    const t = f.p + l.p;
    return `<div class="uf"><span class="s">${u.toUpperCase()}</span><span class="w" style="color:${cor(top.n, 2)}">${top.n === "22" ? "Flávio" : top.n === "13" ? "Lula" : esc(top.nome)}</span>
      <span class="sp"><i style="width:${100 * f.p / t}%;background:#1f4fa8"></i><i style="width:${100 * l.p / t}%;background:#c8102e"></i></span>
      <span class="nums"><b class="az">${fpct(f.p, 1)}</b> · <b class="vm">${fpct(l.p, 1)}</b></span></div>`; }).join("");
  $("placar").innerHTML = `<div style="background:#1f4fa8">Flávio venceu em<b>${wf} estados</b></div><div style="background:#c8102e">Lula venceu em<b>${wl} estados</b></div>`;
  $("estados").innerHTML = linhas;
}
const ABAS = ["resultado", "regioes"];
function irAba() {
  const a = ABAS.includes(location.hash.slice(1)) ? location.hash.slice(1) : "resultado";
  ABAS.forEach(x => $("aba-" + x).hidden = x !== a);
  document.querySelectorAll("#nav a").forEach(l => l.classList.toggle("atual", l.dataset.aba === a));
  if (a !== "resultado") carregarUFs();
}
addEventListener("hashchange", irAba);

/* instalar */
let promptInst = null;
const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone;
function mostrarInst() { if (!standalone() && !localStorage.getItem("instFechado1t")) $("inst").hidden = false; }
addEventListener("beforeinstallprompt", e => { e.preventDefault(); promptInst = e; mostrarInst(); });
addEventListener("appinstalled", () => $("inst").hidden = true);
$("instX").onclick = () => { localStorage.setItem("instFechado1t", "1"); $("inst").hidden = true; };
$("btnInst").onclick = async () => {
  if (promptInst) { promptInst.prompt(); await promptInst.userChoice; promptInst = null; return; }
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  $("sheetC").innerHTML = ios ? "<ol class='passos'><li>Abra este link no <b>Safari</b></li><li>Toque em <b>Compartilhar</b> (quadrado com seta)</li><li>Escolha <b>Adicionar à Tela de Início</b></li></ol>"
    : "<ol class='passos'><li>Abra o menu do navegador (⋮)</li><li>Toque em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b></li></ol>";
  $("sheet").hidden = false;
};
$("sheetX").onclick = () => $("sheet").hidden = true;
if (/iphone|ipad|ipod/i.test(navigator.userAgent)) mostrarInst();

irAba(); carregarBR();
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js", {scope: "./", updateViaCache: "none"}).catch(() => {});
