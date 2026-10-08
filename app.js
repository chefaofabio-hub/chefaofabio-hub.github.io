"use strict";
/* ===== Apuração Presidente 2026 · 2º turno — PWA estático (sem servidor próprio) =====
   Dados ao vivo: lidos direto do TSE pelo navegador (o TSE libera CORS).
   Pesquisas: arquivo pesquisas.json neste mesmo site. */
const TZ = "America/Sao_Paulo";
const INTERVALO_MS = 30000;
const TSE = "https://resultados.tse.jus.br/oficial";
const CICLO = "ele2026";
const ELE_PADRAO = "6258";                     // 2º turno presidencial (cdt2 da eleição 6257, 1º turno) em ele-c.json
const INICIO = new Date("2026-10-25T17:00:00-03:00");
const NUM_FLAVIO = "22", NUM_LULA = "13";
const qs = new URLSearchParams(location.search);
const TESTE = /^[\w.-]+\.json$/.test(qs.get("teste") || "") ? qs.get("teste") : null;   // JSON local de exemplo
const ELE_FORCADA = /^\d{3,5}$/.test(qs.get("ele") || "") ? qs.get("ele") : null;        // ex.: ?ele=6257 (1º turno real)

const $ = id => document.getElementById(id);
const num = x => { if (x == null || x === "") return 0; const s = String(x);
  return s.includes(",") ? parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0 : parseFloat(s) || 0; };
const fint = n => Math.round(n).toLocaleString("pt-BR");
const fpct = (x, d = 2) => x.toFixed(d).replace(".", ",") + "%";
const fpctUrna = x => (x >= 99.995 && x < 100 ? "99,99" : x.toFixed(2).replace(".", ",")).replace(/,00$/, "") + "%";
const agora = seg => new Date().toLocaleTimeString("pt-BR", {timeZone: TZ, hour: "2-digit", minute: "2-digit", second: seg ? "2-digit" : undefined});
const hojeBR = () => new Date().toLocaleDateString("pt-BR", {timeZone: TZ});
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

/* ---------------- abas ---------------- */
const ABAS = ["apuracao", "regioes", "pesquisas"];
const abaAtual = () => { const h = location.hash.slice(1); return ABAS.includes(h) ? h : "apuracao"; };
function abrirAba() {
  const aba = abaAtual();
  for (const a of document.querySelectorAll("#nav a")) a.classList.toggle("atual", a.dataset.aba === aba);
  for (const x of ABAS) $("aba-" + x).hidden = x !== aba;
  if (aba === "pesquisas") { carregarPesquisas(); limparAviso(); }
  if (aba === "regioes") { desenharRegioes(); if (Date.now() - ufUltima > 20000) atualizarEstados(); }
}
window.addEventListener("hashchange", abrirAba);

/* ---------------- descobrir id da eleição ---------------- */
async function descobrirEleicao() {
  if (ELE_FORCADA) return ELE_FORCADA;
  try {
    const r = await fetch(`${TSE}/comum/config/ele-c.json`, {cache: "no-cache"});
    const cfg = await r.json();
    const pl = (cfg.pl || []).filter(p => p.c === CICLO);
    const temPres = e => (e.abr || []).some(a => (a.cp || []).some(c => /presidente/i.test(c.ds)));
    for (const p of pl) for (const e of p.e || []) if (e.t === "2" && temPres(e)) return e.cd;
    for (const p of pl) for (const e of p.e || []) if (e.t === "1" && temPres(e) && e.cdt2) return e.cdt2;
  } catch (e) { /* usa o padrão */ }
  return ELE_PADRAO;
}
const urlResultado = id => `${TSE}/${CICLO}/${id}/dados/br/br-c0001-e${String(id).padStart(6, "0")}-u.json`;

/* ---------------- apuração ---------------- */
const LINHAS = [
  {chave: "flavio", nome: "Flávio Bolsonaro", partido: "PL", cor: "var(--flavio)", grande: true},
  {chave: "lula",   nome: "Lula",             partido: "PT", cor: "var(--lula)",   grande: true},
];
const lista = $("lista");
for (const l of LINHAS) {
  const d = document.createElement("div");
  d.className = "cand" + (l.grande ? " grande" : "");
  d.dataset.chave = l.chave;
  d.innerHTML = `<div class="linha1"><span class="nome">${l.nome}<span class="selo" hidden>ELEITO</span></span>
    <span class="votos"><span class="v">0</span> <small>votos</small></span></div>
    <div class="linha2"><div class="trilho"><div class="barra" style="background:${l.cor};width:0"></div><div class="m50"></div></div>
    <span class="pct">0,00%</span></div>`;
  lista.appendChild(d);
}
const els = Object.fromEntries([...lista.children].map(e => [e.dataset.chave, e]));

function calcular(d) {
  const cands = [];
  for (const carg of d.carg || []) for (const a of carg.agr || []) for (const p of a.par || [])
    for (const c of p.cand || []) cands.push({n: String(c.n), nome: c.nmu || c.nm || "", v: num(c.vap), st: c.st || "", e: c.e});
  const validos = num((d.v || {}).vv) || cands.reduce((s, c) => s + c.v, 0);
  const pega = n => cands.filter(c => c.n === n);
  const fl = pega(NUM_FLAVIO), lu = pega(NUM_LULA);
  const vf = fl.reduce((s, c) => s + c.v, 0), vl = lu.reduce((s, c) => s + c.v, 0);
  const pc = x => validos ? 100 * x / validos : 0;
  const v = d.v || {}, e = d.e || {}, s = d.s || {};
  let hora = (d.ht || "").slice(0, 5);
  if (hora && d.dt && d.dt !== hojeBR()) hora += ` de ${d.dt.slice(0, 5)}`;
  return {
    linhas: {flavio: {votos: vf, pct: pc(vf), eleito: fl.some(c => /^eleito/i.test(c.st))},
             lula:   {votos: vl, pct: pc(vl), eleito: lu.some(c => /^eleito/i.test(c.st))}},
    validos, pu: num(s.pst), totalizado: num(s.pst) >= 100 || d.tf === "s" && num(s.pst) >= 100,
    brancos: num(v.vb), pbrancos: num(v.pvb), nulos: num(v.tvn), pnulos: num(v.ptvn),
    abst: num(e.a), pabst: num(e.pa), comp: num(e.c), pcomp: num(e.pc), eleitores: num(e.te),
    turno: d.t, hora: hora || "—",
    ele: String(d.ele || ELE || ""), ncand: new Set(cands.map(c => c.n)).size,
    st: num(s.st), ts: num(s.ts), te: num(e.te),
  };
}

let assinatura = "";
function mostrar(r) {
  const ass = JSON.stringify([r.linhas, r.pu]);
  const mudou = assinatura && ass !== assinatura; assinatura = ass;
  mostrarUrnas(r.pu);
  const maxp = Math.max(0, ...Object.values(r.linhas).map(l => l.pct));
  const escala = maxp <= 57 ? 60 : (maxp <= 77 ? 80 : 100);
  for (const [k, l] of Object.entries(r.linhas)) {
    const e = els[k];
    e.querySelector(".v").textContent = fint(l.votos);
    e.querySelector(".pct").textContent = fpct(l.pct);
    const w = Math.min(100, l.pct) / escala * 100;
    e.querySelector(".barra").style.width = (w >= 0.4 ? Math.max(w, 2) : 0) + "%";
    e.querySelector(".m50").style.left = (50 / escala * 100) + "%";
    e.querySelector(".selo").hidden = !l.eleito;
    if (mudou) { e.classList.remove("flash"); void e.offsetWidth; e.classList.add("flash"); }
  }
  $("extras").innerHTML = [
    ["Brancos", r.brancos, r.pbrancos], ["Nulos", r.nulos, r.pnulos],
    ["Abstenção", r.abst, r.pabst], ["Comparecimento", r.comp, r.pcomp],
  ].map(([k, v, p]) => `<div class="extra"><div class="k">${k}</div><div class="v">${fint(v)} <small>${fpct(p)}</small></div></div>`).join("");
  const {flavio: f, lula: l} = r.linhas;
  let st;
  if (f.eleito || l.eleito) st = `${f.eleito ? "FLÁVIO BOLSONARO" : "LULA"} ELEITO PRESIDENTE`;
  else if (f.votos + l.votos === 0) st = "Aguardando os primeiros números do TSE";
  else if (r.turno === "1") st = `1º turno (teste): Flávio ${fpct(f.pct)} · Lula ${fpct(l.pct)}`;
  else if (f.votos === l.votos) st = "Empate exato até agora";
  else { const lid = f.votos > l.votos ? "Flávio" : "Lula";
         st = `${lid} na frente por ${fint(Math.abs(f.votos - l.votos))} votos`; }
  $("status").textContent = st;
  $("hora").textContent = r.hora;
  mostrarEleito(r);
}

/* PRESIDENTE ELEITO: definido quando a diferença entre os dois é MAIOR que todos os votos que ainda podem entrar
   (regra conservadora: todo eleitor das seções ainda não totalizadas vai votar e vota no 2º colocado).
   Ainda podem entrar = eleitorado total (e.te) − comparecimento já apurado (e.c) − abstenção já apurada (e.a);
   com 100% das seções totalizadas (s.st = s.ts) não entra mais nada. O selo "Eleito" do próprio TSE também decide. */
function definicao(r) {
  const f = r.linhas.flavio, l = r.linhas.lula;
  const aplica = r.turno === "2" && r.ncand === 2;
  const restam = r.ts > 0 && r.st >= r.ts ? 0 : Math.max(0, r.te - r.comp - r.abst);
  const dif = Math.abs(f.votos - l.votos);
  const lider = f.votos > l.votos ? "flavio" : l.votos > f.votos ? "lula" : null;
  let venc = null, porTSE = false;
  if (aplica && (f.eleito || l.eleito)) { venc = f.eleito ? "flavio" : "lula"; porTSE = true; }
  else if (aplica && lider && dif > restam) venc = lider;
  return {aplica, restam, dif, lider, venc, porTSE};
}
const NOME_ELEITO = {flavio: "FLÁVIO BOLSONARO", lula: "LULA"};
function mostrarEleito(r) {
  const box = $("eleito"), d = definicao(r);
  box.className = "eleito";
  if (!d.aplica) {
    box.innerHTML = `<div class="el-t">PRESIDENTE ELEITO: <span class="el-ag">aguardando definição matemática</span></div>
      <div class="el-s">(teste) ${r.turno === "1" ? "1º turno" : "eleição sem 2 candidatos"}: o cálculo só vale no 2º turno</div>`;
    return;
  }
  const chave = "eleito_" + r.ele;
  let mem = null; try { mem = JSON.parse(localStorage.getItem(chave) || "null"); } catch (e) {}
  if (d.venc) {
    if (!mem || mem.v !== d.venc) { mem = {v: d.venc, pu: r.pu, tse: d.porTSE}; localStorage.setItem(chave, JSON.stringify(mem)); }
  } else if (mem && mem.v !== d.lider) mem = null;      // dados corrigidos pelo TSE: não mostra vencedor antigo
  const venc = d.venc || (mem && mem.v);
  if (venc) {
    box.className = "eleito ok " + venc;
    box.innerHTML = `<div class="el-t">PRESIDENTE ELEITO:</div><div class="el-nome">${NOME_ELEITO[venc]}</div>
      <div class="el-s">${mem.tse ? "confirmado pelo TSE" : "definido matematicamente"} com <b>${fpctBig(mem.pu)}</b> das urnas apuradas</div>`;
    return;
  }
  box.innerHTML = `<div class="el-t">PRESIDENTE ELEITO: <span class="el-ag">aguardando definição matemática</span></div>
    <div class="el-s">Diferença: <b>${fint(d.dif)}</b> votos · Ainda podem entrar: <b>${fint(d.restam)}</b> votos</div>`;
}
function eleitoEspera() {
  const box = $("eleito"); box.className = "eleito compacto";
  box.innerHTML = `<div class="el-t">PRESIDENTE ELEITO: <span class="el-ag">aguardando definição matemática</span></div>`;
}

const fpctBig = x => x >= 100 ? "100%" : x >= 99.995 ? "99,99%" : fpct(Math.max(0, x));
function mostrarUrnas(pu) {
  $("pu").textContent = fpctBig(pu);
  $("puBar").style.width = Math.min(100, Math.max(0, pu)) + "%";
  $("pf").textContent = fpctBig(Math.max(0, 100 - pu));
  $("ubL2").hidden = pu >= 100;
}
function zerarCandidatos() {          // antes da apuração: candidatos com 0 votos e 0,00%
  for (const e of Object.values(els)) {
    e.querySelector(".v").textContent = "0";
    e.querySelector(".pct").textContent = fpct(0);
    e.querySelector(".barra").style.width = "0";
    e.querySelector(".m50").style.left = (50 / 60 * 100) + "%";
    e.querySelector(".selo").hidden = true;
  }
  mostrarUrnas(0);
}
let timerContagem = null;
function modoEspera(sim) {
  $("espera").hidden = !sim; $("resultado").hidden = sim;
  $("linhaHora").hidden = sim;
  if (sim) { zerarCandidatos(); eleitoEspera(); }
  clearInterval(timerContagem);
  if (sim) { contagem(); timerContagem = setInterval(contagem, 1000); }
}
function contagem() {
  let ms = INICIO - Date.now();
  if (ms <= 0) { $("contagem").innerHTML = "<div><b>já</b><span>começou</span></div>"; return; }
  const d = Math.floor(ms / 864e5); ms -= d * 864e5;
  const h = Math.floor(ms / 36e5); ms -= h * 36e5;
  const m = Math.floor(ms / 6e4); const s = Math.floor((ms - m * 6e4) / 1000);
  $("contagem").innerHTML = [[d, d === 1 ? "dia" : "dias"], [h, "horas"], [m, "min"], [s, "seg"]]
    .map(([v, t]) => `<div><b>${String(v).padStart(2, "0")}</b><span>${t}</span></div>`).join("");
}

let FONTE = null, ELE = null, temDados = false;
async function atualizar() {
  const vivo = $("vivo"), txt = $("vivotxt");
  try {
    if (!FONTE) { if (!TESTE) ELE = await descobrirEleicao(); FONTE = TESTE ? TESTE : urlResultado(ELE); if (!timerEstados) iniciarEstados(); }
    const resp = await fetch(FONTE + (FONTE.includes("?") ? "&" : "?") + "t=" + Date.now(), {cache: "no-store"});
    if (resp.status === 404 || resp.status === 403) {          // arquivo ainda não publicado pelo TSE
      if (!temDados) modoEspera(true);
      vivo.classList.remove("erro");
      txt.textContent = `TSE ainda não publicou o 2º turno · conferido às ${agora(true)}`;
      return;
    }
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    const r = calcular(await resp.json());
    const zerado = r.validos === 0 && r.pu === 0;
    if (zerado && Date.now() < INICIO.getTime() && !temDados) { modoEspera(true); }
    else { temDados = !zerado; modoEspera(false); mostrar(r); }
    vivo.classList.remove("erro");
    txt.textContent = `ao vivo · conferido às ${agora(true)} · atualiza a cada ${INTERVALO_MS / 1000} s`;
  } catch (e) {
    vivo.classList.add("erro");          // mantém os últimos números na tela
    txt.textContent = `TSE não respondeu (${e.message}) · tentando de novo… · ${agora(true)}`;
  }
}

/* ---------------- apuração por região (soma dos arquivos de cada estado) ---------------- */
const INTERVALO_UF_MS = 60000;
const UFS = {   // uf -> região
  ac: "N", am: "N", ap: "N", pa: "N", ro: "N", rr: "N", to: "N",
  al: "NE", ba: "NE", ce: "NE", ma: "NE", pb: "NE", pe: "NE", pi: "NE", rn: "NE", se: "NE",
  es: "SE", mg: "SE", rj: "SE", sp: "SE",
  pr: "S", rs: "S", sc: "S",
  df: "CO", go: "CO", ms: "CO", mt: "CO",
};
const REGIOES = [["N", "Norte"], ["NE", "Nordeste"], ["SE", "Sudeste"], ["S", "Sul"], ["CO", "Centro-Oeste"]];
const dadosUF = {};            // uf -> {f, l, vv, st, ts} | {status:"aguardando"|"erro"}
let timerEstados = null, ufCarregando = false, ufUltima = 0;
const urlUF = (id, uf) => `${TSE}/${CICLO}/${id}/dados/${uf}/${uf}-c0001-e${String(id).padStart(6, "0")}-u.json`;

function lerUF(d) {
  const r = calcular(d), s = d.s || {};
  return {f: r.linhas.flavio.votos, l: r.linhas.lula.votos, vv: r.validos, st: num(s.st), ts: num(s.ts)};
}
async function buscarUF(uf) {
  try {
    const resp = await fetch(urlUF(ELE, uf) + "?t=" + Date.now(), {cache: "no-store"});
    if (resp.status === 404 || resp.status === 403) { if (!dadosUF[uf] || dadosUF[uf].status) dadosUF[uf] = {status: "aguardando"}; return; }
    if (!resp.ok) throw new Error(resp.status);
    dadosUF[uf] = lerUF(await resp.json());
  } catch (e) { if (!dadosUF[uf] || dadosUF[uf].status) dadosUF[uf] = {status: "erro"}; }   // mantém os últimos números se já tinha
}
async function atualizarEstados() {
  if (ufCarregando || !ELE) { desenharRegioes(); return; }
  if (abaAtual() !== "regioes") return;          // só baixa os 27 estados com a aba "Por região" aberta
  ufCarregando = true; ufUltima = Date.now();
  try { await Promise.all(Object.keys(UFS).map(buscarUF)); } finally { ufCarregando = false; }
  desenharRegioes();
  const erros = Object.values(dadosUF).filter(d => d.status === "erro").length;
  $("ufHora").parentElement.classList.toggle("erro", erros > 0);
  const aguard = Object.values(dadosUF).every(d => d.status === "aguardando");
  $("ufHora").textContent = erros ? `${erros} estado(s) sem resposta do TSE · tentando de novo · ${agora(true)}`
    : aguard ? `TSE ainda não publicou o 2º turno · conferido às ${agora(true)}`
    : `ao vivo · conferido às ${agora(true)} · atualiza a cada ${INTERVALO_UF_MS / 1000} s`;
}
function iniciarEstados() { desenharRegioes(); atualizarEstados(); timerEstados = setInterval(atualizarEstados, INTERVALO_UF_MS); }

function cartaoRegiao(cod, nome) {
  let f = 0, l = 0, vv = 0, st = 0, ts = 0, com = 0;
  for (const [uf, r] of Object.entries(UFS)) { if (r !== cod) continue; const d = dadosUF[uf]; if (!d || d.status) continue;
    com++; f += d.f; l += d.l; vv += d.vv; st += d.st; ts += d.ts; }
  const pu = ts ? 100 * st / ts : 0;
  if (!com || (vv === 0 && pu === 0)) return `<div class="regc esp"><div class="rc-top"><span class="rc-n">${nome}</span></div>
      <div class="rc-pu"><b>0%</b><span>urnas apuradas</span></div><div class="rc-prog"><i style="width:0"></i></div>
      <div class="rc-ag">aguardando início da apuração</div></div>`;
  const lid = f > l ? "f" : l > f ? "l" : "";
  const pf = vv ? 100 * f / vv : 0, pl = vv ? 100 * l / vv : 0, t = f + l;
  const frase = lid ? `${lid === "f" ? "Flávio" : "Lula"} na frente por ${fint(Math.abs(f - l))} votos` : "Empate";
  return `<div class="regc ${lid ? "lid-" + lid : ""}"><div class="rc-top"><span class="rc-n">${nome}</span></div>
    <div class="rc-pu"><b>${fpctUrna(pu)}</b><span>urnas apuradas</span></div>
    <div class="rc-prog"><i style="width:${Math.min(100, pu)}%"></i></div>
    <div class="rc-cand"><span class="az${lid === "f" ? " lid" : ""}">Flávio <b>${fpct(pf, 1)}</b></span><span class="vm${lid === "l" ? " lid" : ""}"><b>${fpct(pl, 1)}</b> Lula</span></div>
    <div class="rc-split"><i class="sf" style="width:${t ? 100 * f / t : 0}%"></i><i class="sl" style="width:${t ? 100 * l / t : 0}%"></i><span class="s50"></span></div>
    <div class="rc-lid ${lid === "f" ? "az" : lid === "l" ? "vm" : ""}">${frase}</div></div>`;
}
function desenharRegioes() { const box = $("regioes"); if (box) box.innerHTML = REGIOES.map(([c, n]) => cartaoRegiao(c, n)).join(""); }

/* ---------------- pesquisas: uma linha por instituto ---------------- */
const dataBR = iso => { const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; };
const pv = x => x == null ? "—" : (Number.isInteger(x) ? String(x) : String(x).replace(".", ",")) + "%";
const pp = x => { const r = Math.round(x * 10) / 10; return (Number.isInteger(r) ? String(r) : String(r).replace(".", ",")); };

let pesqCarregando = false;
async function carregarPesquisas() {
  if (pesqCarregando) return; pesqCarregando = true;
  try {
    const r = await fetch("pesquisas.json?t=" + Date.now(), {cache: "no-store"});
    const dados = await r.json();
    const corte = dados.inicio_2turno || "2026-10-05";      // só pesquisas com campo DEPOIS do 1º turno
    const ps = (dados.pesquisas || []).filter(p => p && p.instituto && p.divulgacao && p.flavio != null && p.lula != null
                                               && p.campo_inicio && p.campo_inicio >= corte)
                 .sort((a, b) => b.divulgacao.localeCompare(a.divulgacao));
    const chave = n => String(n).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
    const porInst = new Map();
    for (const p of ps) { const k = chave(p.instituto); if (!porInst.has(k)) porInst.set(k, []); porInst.get(k).push(p); }
    const grupos = [...porInst.values()];     // já em ordem da pesquisa mais recente
    const espera = (dados.institutos || []).map(i => typeof i === "string" ? {nome: i} : i)
                     .filter(i => i && i.nome && !porInst.has(chave(i.nome)));   // institutos sem pesquisa ainda
    $("cartoes").innerHTML = grupos.length || espera.length ? grupos.map(linhaInstituto).join("") + espera.map(linhaEspera).join("") :
      `<div class="vazio">Nenhuma pesquisa cadastrada ainda.</div>`;
    marcarUltima(ps);
    $("pesqRod").innerHTML = `<b>${grupos.length + espera.length} institutos · ${ps.length} pesquisa${ps.length === 1 ? "" : "s"} do 2º turno</b> · lista atualizada em ${esc(dataBR(dados.atualizado_em || ""))}`;
  } catch (e) {
    if (!$("cartoes").innerHTML) $("cartoes").innerHTML = `<div class="vazio">Não consegui carregar as pesquisas agora. Tente de novo em instantes.</div>`;
  } finally { pesqCarregando = false; }
}

function graficoInstituto(lista) {   // lista: pesquisas do instituto, mais recente primeiro
  const base = lista[0].base;
  const ps = lista.filter(p => p.base === base).sort((a, b) => a.divulgacao.localeCompare(b.divulgacao));
  const fora = lista.length - ps.length;
  const W = 320, H = 178, L = 30, R = 22, T = 22, B = 30, n = ps.length;
  const vals = ps.flatMap(p => [p.flavio, p.lula]);
  let y0 = Math.floor(Math.min(...vals) - 3), y1 = Math.ceil(Math.max(...vals) + 3);
  if (y1 - y0 < 8) { const m = (y0 + y1) / 2; y0 = Math.floor(m - 4); y1 = Math.ceil(m + 4); }
  const X = i => n === 1 ? (L + W - R) / 2 : L + 18 + (W - L - R - 36) * i / (n - 1);
  const Y = v => T + (H - T - B) * (1 - (v - y0) / (y1 - y0));
  const passo = (y1 - y0) > 16 ? 5 : 2;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="pq-svg" role="img" aria-label="Evolução das pesquisas ${esc(lista[0].instituto)}" font-family="Inter,system-ui,sans-serif">`;
  for (let y = Math.ceil(y0 / passo) * passo; y <= y1; y += passo)
    s += `<line x1="${L}" x2="${W - 6}" y1="${Y(y)}" y2="${Y(y)}" stroke="#e6eaf2"/><text x="${L - 5}" y="${Y(y) + 3.5}" font-size="10" text-anchor="end" fill="#5f697d" font-weight="600">${y}%</text>`;
  ps.forEach((p, i) => s += `<text x="${X(i)}" y="${H - 10}" font-size="11" text-anchor="middle" fill="#141c2d" font-weight="700">${dataBR(p.divulgacao).slice(0, 5)}</text>`);
  const linha = (k, cor) => n > 1 ? `<polyline points="${ps.map((p, i) => X(i) + "," + Y(p[k])).join(" ")}" fill="none" stroke="${cor}" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round"/>` : "";
  s += linha("flavio", "#1f4fa8") + linha("lula", "#c8102e");
  ps.forEach((p, i) => {
    const fCima = p.flavio >= p.lula;          // o maior fica com o rótulo em cima, o menor embaixo
    for (const [k, cor, cima] of [["flavio", "#1f4fa8", fCima], ["lula", "#c8102e", !fCima]]) {
      const x = X(i), y = Y(p[k]);
      const anc = n > 1 && i === 0 ? "start" : n > 1 && i === n - 1 ? "end" : "middle";
      const dx = anc === "start" ? -4 : anc === "end" ? 4 : 0;
      s += `<circle cx="${x}" cy="${y}" r="4.2" fill="#fff" stroke="${cor}" stroke-width="2.8"/>`;
      s += `<text x="${x + dx}" y="${cima ? y - 9 : y + 17}" font-size="12.5" font-weight="900" text-anchor="${anc}" fill="${cor}">${pv(p[k])}</text>`;
    }
  });
  s += `</svg>`;
  const notas = [n === 1 ? "A linha aparece a partir da 2ª pesquisa deste instituto." : "",
    `Base: ${base === "validos" ? "votos válidos" : "votos totais (como o instituto divulgou)"}.`,
    fora ? `${fora} pesquisa(s) em outra base ficaram fora do gráfico (estão na lista abaixo).` : ""].filter(Boolean).join(" ");
  return `<div class="pq-graf"><div class="pq-gcab"><span>Evolução ${esc(lista[0].instituto)}</span><span class="leg2"><b class="az">●</b> Flávio <b class="vm">●</b> Lula</span></div>${s}<div class="pq-gnota">${notas}</div></div>`;
}

function linhaEspera(i) {   // instituto da lista sem nenhuma pesquisa cadastrada
  return `<div class="pq pq-vazia"><div class="pq-sum">
      <div class="pq-esq"><div class="pq-inst">${esc(i.nome)}</div><div class="pq-ag">aguardando pesquisa do 2º turno</div>${i.prevista ? `<div class="pq-prev">${esc(i.prevista)}</div>` : ""}</div>
      <div class="pq-mini">
        <div class="pq-b"><span class="pq-nm">Flávio</span><div class="pq-t"></div><span>—</span></div>
        <div class="pq-b"><span class="pq-nm">Lula</span><div class="pq-t"></div><span>—</span></div></div></div></div>`;
}
function linhaInstituto(lista) {
  const p = lista[0], d = p.flavio - p.lula;
  const lid = d > 0 ? `<span class="pq-lid az">Flávio na frente (+${pp(d)})</span>` : d < 0 ? `<span class="pq-lid vm">Lula na frente (+${pp(-d)})</span>` : `<span class="pq-lid emp">Empate</span>`;
  const esc100 = Math.max(60, p.flavio, p.lula);
  const mini = `<div class="pq-mini">
      <div class="pq-b"><span class="pq-nm az">Flávio</span><div class="pq-t"><i style="width:${100 * p.flavio / esc100}%;background:var(--flavio)"></i></div><span class="az">${pv(p.flavio)}</span></div>
      <div class="pq-b"><span class="pq-nm vm">Lula</span><div class="pq-t"><i style="width:${100 * p.lula / esc100}%;background:var(--lula)"></i></div><span class="vm">${pv(p.lula)}</span></div></div>`;
  const det = [
    `<span>Base: <b>${p.base === "validos" ? "votos válidos" : "votos totais"}</b></span>`,
    p.contratante ? `<span>Contratante: <b>${esc(p.contratante)}</b></span>` : "",
    p.campo ? `<span>Campo: <b>${esc(p.campo)}</b></span>` : "",
    p.entrevistas ? `<span>Entrevistas: <b>${fint(p.entrevistas)}</b></span>` : "",
    p.base === "validos" ? "" : `<span>Brancos/nulos: <b>${pv(p.brancos_nulos)}</b> · Indecisos: <b>${pv(p.indecisos)}</b></span>`,
    `<span>Margem: <b>${p.margem ? "±" + esc(p.margem) + " p.p." : "—"}</b></span>`,
    `<span>Registro TSE: <b>${esc(p.registro || "não informado")}</b></span>`,
    p.obs ? `<span>${esc(p.obs)}</span>` : "",
    p.fonte ? `<span><a href="${esc(p.fonte)}" target="_blank" rel="noopener">Ver fonte ↗</a></span>` : "",
  ].filter(Boolean).join("");
  const ant = lista.slice(1).map(a => `<li>${dataBR(a.divulgacao).slice(0, 5)}: <b class="az">${pv(a.flavio)}</b> x <b class="vm">${pv(a.lula)}</b>${a.fonte ? ` · <a href="${esc(a.fonte)}" target="_blank" rel="noopener">fonte ↗</a>` : ""}</li>`).join("");
  return `<details class="pq"><summary>
      <div class="pq-esq"><div class="pq-inst">${esc(p.instituto)}</div><div class="pq-data">${dataBR(p.divulgacao)}${p.base === "validos" ? " · válidos" : ""}</div>${lid}</div>
      ${mini}</summary>
    <div class="pq-det">${graficoInstituto(lista)}${det}${ant ? `<div class="pq-ant">Pesquisas anteriores deste instituto:<ul>${ant}</ul></div>` : ""}</div></details>`;
}


/* ---------------- instalação / PWA ---------------- */
const UA = navigator.userAgent;
const IOS = /iphone|ipad|ipod/i.test(UA) || (/Macintosh/.test(UA) && navigator.maxTouchPoints > 1);
const ANDROID = /android/i.test(UA);
const IOS_OUTRO = IOS && /CriOS|FxiOS|EdgiOS|OPiOS|GSA\/|FBAN|FBAV|Instagram|WhatsApp|Line\//i.test(UA);   // iOS fora do Safari
const ANDROID_APP = ANDROID && /; wv\)|WhatsApp|FBAN|FBAV|Instagram|Line\//i.test(UA);                     // navegador interno de app
const instalado = () => matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches || navigator.standalone === true;
const UM_DIA = 864e5;
let promptInstalar = null;
function mostrarBotaoInst() {
  const fechado = +localStorage.getItem("instFechado") || 0;
  $("inst").hidden = instalado() || localStorage.getItem("instalado") === "1" || Date.now() - fechado < UM_DIA;
}
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); promptInstalar = e; mostrarBotaoInst(); });
window.addEventListener("appinstalled", () => { localStorage.setItem("instalado", "1"); $("inst").hidden = true; fecharSheet(); });
matchMedia("(display-mode: standalone)").addEventListener?.("change", mostrarBotaoInst);
$("instX").addEventListener("click", () => { localStorage.setItem("instFechado", String(Date.now())); $("inst").hidden = true; });

const LINK = "https://chefaofabio-hub.github.io/";
const passos = arr => `<ol class="passos">${arr.map(t => `<li>${t}</li>`).join("")}</ol>`;
const botaoCopiar = `<button class="sheet-copiar" id="btnCopiar">Copiar link do app</button><div class="sheet-link">${LINK}</div>`;
const ICO_COMPART = `<svg class="ico" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" fill="none" stroke="#1f6fe5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 10H6.5A1.5 1.5 0 0 0 5 11.5v8A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 17.5 10H16" fill="none" stroke="#1f6fe5" stroke-width="2" stroke-linecap="round"/></svg>`;
function abrirSheet(titulo, html) {
  $("sheetT").textContent = titulo; $("sheetC").innerHTML = html; $("sheet").hidden = false;
  const c = $("btnCopiar");
  if (c) c.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(LINK); c.textContent = "Link copiado ✓"; }
    catch (e) { const r = document.createRange(); r.selectNodeContents(document.querySelector(".sheet-link")); getSelection().removeAllRanges(); getSelection().addRange(r); c.textContent = "Selecione e copie o link abaixo"; }
  });
}
function fecharSheet() { $("sheet").hidden = true; }
$("sheetX").addEventListener("click", fecharSheet);
$("sheet").addEventListener("click", e => { if (e.target === $("sheet")) fecharSheet(); });

$("btnInst").addEventListener("click", async () => {
  if (promptInstalar) {                                     // Android / Chrome / Edge / Samsung: janela nativa
    promptInstalar.prompt();
    const r = await promptInstalar.userChoice.catch(() => null); promptInstalar = null;
    if (r && r.outcome === "accepted") { localStorage.setItem("instalado", "1"); $("inst").hidden = true; }
    return;
  }
  if (IOS && IOS_OUTRO) {
    abrirSheet("Abra no Safari primeiro", `<p>No iPhone, o app só pode ser instalado pelo <b>Safari</b>.</p>` + passos([
      `Toque em <b>⋯</b> ou no ícone da <b>bússola</b> e escolha <b>“Abrir no Safari”</b> (ou copie o link abaixo e cole no Safari).`,
      `No Safari, toque em <b>📲 Instalar app</b> de novo e siga os passos.`]) + botaoCopiar);
  } else if (IOS) {
    abrirSheet("Instalar no iPhone", passos([
      `Toque no botão <b>Compartilhar</b> ${ICO_COMPART} (quadrado com seta para cima), na barra do Safari.`,
      `Role e toque em <b>“Adicionar à Tela de Início”</b>.`,
      `Toque em <b>“Adicionar”</b>. Pronto: o ícone da urna aparece na tela do celular.`]) +
      `<p class="sheet-dica">Abriu pelo WhatsApp? Toque primeiro em <b>⋯</b> / <b>bússola</b> → <b>“Abrir no Safari”</b>.</p>` + botaoCopiar);
  } else if (ANDROID_APP) {
    abrirSheet("Abra no Chrome primeiro", passos([
      `Toque no menu <b>⋮</b> (três pontinhos, no canto de cima).`,
      `Escolha <b>“Abrir no Chrome”</b> (ou “Abrir no navegador”).`,
      `No Chrome, toque em <b>📲 Instalar app</b>.`]) + botaoCopiar);
  } else if (ANDROID) {
    abrirSheet("Instalar no Android", passos([
      `Toque no menu <b>⋮</b> do navegador (canto de cima).`,
      `Escolha <b>“Instalar app”</b> ou <b>“Adicionar à tela inicial”</b>.`,
      `Confirme em <b>“Instalar”</b>. O ícone da urna aparece na tela do celular.`]) +
      `<p class="sheet-dica">Abriu pelo WhatsApp? Use antes <b>⋮ → “Abrir no Chrome”</b>.</p>`);
  } else {
    abrirSheet("Instalar no computador", passos([
      `No Chrome ou Edge, clique no ícone de <b>instalar</b> na barra de endereço (monitor com seta), ou no menu <b>⋮</b> → <b>“Instalar Apuração Presidente 2026”</b>.`,
      `No celular, abra ${LINK} e toque em <b>📲 Instalar app</b>.`]) + botaoCopiar);
  }
});

/* ---------------- alertas de nova pesquisa (Web Push + bolinha no ícone) ---------------- */
const VAPID = "BFe70NXlcfbErji3jzju-T2_kF667r3gsqnkxK9_fkv5byx07Yuoc9nv5gqezaCWtlzuzcNpNu8iAnETxLW1E0E";   // chave PÚBLICA (a privada fica só no servidor do Fábio)
const PUSH_OK = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && location.protocol === "https:";
const idPesq = p => `${p.instituto.trim().toLowerCase()}|${p.divulgacao}|${(p.registro || "").trim()}`;
let ultimaPesq = null;
function marcarUltima(ps) {             // ps: pesquisas válidas do 2º turno, mais recente primeiro
  ultimaPesq = ps.length ? idPesq(ps[0]) : null;
  if (abaAtual() === "pesquisas" && !document.hidden) limparAviso(); else mostrarPonto();
}
function mostrarPonto() { $("pontoPesq").hidden = !ultimaPesq || localStorage.getItem("pesqVista") === ultimaPesq; }
function limparAviso() {
  if (ultimaPesq) localStorage.setItem("pesqVista", ultimaPesq);
  mostrarPonto();
  try { navigator.clearAppBadge?.(); } catch (e) {}
  navigator.serviceWorker?.ready.then(r => r.getNotifications?.({tag: "nova-pesquisa"})).then(ns => (ns || []).forEach(n => n.close())).catch(() => {});
}
async function checarNovas() {          // leve: só para a bolinha "!" na aba Pesquisas
  if (abaAtual() === "pesquisas") return carregarPesquisas();
  try {
    const d = await (await fetch("pesquisas.json?t=" + Date.now(), {cache: "no-store"})).json();
    const corte = d.inicio_2turno || "2026-10-05";
    marcarUltima((d.pesquisas || []).filter(p => p && p.instituto && p.divulgacao && p.flavio != null && p.lula != null && p.campo_inicio && p.campo_inicio >= corte)
      .sort((a, b) => b.divulgacao.localeCompare(a.divulgacao)));
  } catch (e) {}
}
const b64u8 = b => { const s = atob((b + "=".repeat((4 - b.length % 4) % 4)).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(s, c => c.charCodeAt(0)); };
async function enviarInscricao(sub, rota = "subscribe") {
  const ep = await (await fetch("push_endpoint.json?t=" + Date.now(), {cache: "no-store"})).json();
  const r = await fetch(ep.url.replace(/\/$/, "") + "/" + rota, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(sub)});
  if (!r.ok) throw new Error("coletor " + r.status);
  if (rota === "subscribe") localStorage.setItem("alertaEnviado", Date.now() + " " + sub.endpoint);
}
function msgAlerta(t) { const m = $("alertaMsg"); m.innerHTML = t || ""; m.hidden = !t; }
function estadoAlerta() {
  const box = $("alertaBox"), btn = $("btnAlerta");
  const ativo = localStorage.getItem("alertaAtivo") === "1" && PUSH_OK && Notification.permission === "granted";
  box.hidden = false;
  if (ativo) {
    btn.hidden = true;
    let ok = $("alertaOk");
    if (!ok) { ok = document.createElement("div"); ok.id = "alertaOk"; ok.className = "alerta-ok"; box.prepend(ok); }
    ok.hidden = false;
    ok.innerHTML = `✅ Alertas ativados: você será avisado quando sair pesquisa nova <button id="alertaDesl">desativar</button>`;
    $("alertaDesl").onclick = desativarAlertas;
  } else { btn.hidden = false; if ($("alertaOk")) $("alertaOk").hidden = true; }
  const fechado = +localStorage.getItem("alertaFechado") || 0;
  $("alertaTopo").hidden = !(PUSH_OK && instalado() && !ativo && Notification.permission !== "denied" && Date.now() - fechado > UM_DIA);
}
async function ativarAlertas() {
  msgAlerta("");
  if (!PUSH_OK) {
    if (IOS && !instalado()) {
      msgAlerta("No iPhone, <b>instale o app primeiro</b> para ativar alertas: toque em <b>📲 Instalar app</b>, abra pelo ícone da urna e toque aqui de novo.");
      setTimeout(() => $("btnInst").click(), 900);
    } else if (IOS) msgAlerta("Seu iPhone precisa do iOS 16.4 ou mais novo para receber alertas.");
    else msgAlerta("Este navegador não aceita alertas. Abra o app no <b>Chrome</b> (Android) ou no <b>Safari</b> (iPhone).");
    return;
  }
  if (Notification.permission === "denied") { msgAlerta("Os alertas estão <b>bloqueados</b> para este app. Libere em Ajustes/Configurações do celular → Notificações."); return; }
  const btns = [$("btnAlerta"), $("btnAlertaTopo")]; btns.forEach(b => b.disabled = true);
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") { msgAlerta("Sem permissão, não dá para avisar. Se mudar de ideia, toque de novo e escolha <b>Permitir</b>."); return; }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription() || await reg.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: b64u8(VAPID)});
    localStorage.setItem("alertaAtivo", "1"); localStorage.removeItem("alertaEnviado");
    try { await enviarInscricao(sub.toJSON()); } catch (e) { /* tenta de novo na próxima vez que abrir o app */ }
    estadoAlerta();
  } catch (e) {
    msgAlerta("Não consegui ativar agora. Tente de novo em instantes.");
  } finally { btns.forEach(b => b.disabled = false); }
}
async function desativarAlertas() {
  localStorage.removeItem("alertaAtivo"); localStorage.removeItem("alertaEnviado");
  try { const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription();
        if (sub) { const j = sub.toJSON(); await sub.unsubscribe(); enviarInscricao(j, "unsubscribe").catch(() => {}); } } catch (e) {}
  estadoAlerta();
}
async function conferirInscricao() {    // reenvia se o envio falhou, se a inscrição mudou ou a cada 3 dias
  if (!PUSH_OK || localStorage.getItem("alertaAtivo") !== "1" || Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: b64u8(VAPID)});
    const [quando, ep] = (localStorage.getItem("alertaEnviado") || "0 ").split(" ");
    if (ep !== sub.endpoint || Date.now() - +quando > 3 * UM_DIA) await enviarInscricao(sub.toJSON());
  } catch (e) {}
}
$("btnAlerta").addEventListener("click", ativarAlertas);
$("btnAlertaTopo").addEventListener("click", () => { ativarAlertas().then(() => { if ($("alertaMsg").textContent) location.hash = "#pesquisas"; }); });
$("alertaTopoX").addEventListener("click", () => { localStorage.setItem("alertaFechado", String(Date.now())); $("alertaTopo").hidden = true; });
navigator.serviceWorker?.addEventListener("message", e => {
  const d = e.data || {};
  if (d.tipo === "push") { window.__pushes = (window.__pushes || []).concat(d); checarNovas(); }
  if (d.tipo === "abrir") { location.hash = "#pesquisas"; }
});
matchMedia("(display-mode: standalone)").addEventListener?.("change", estadoAlerta);

mostrarBotaoInst();
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});

/* ---------------- início ---------------- */
if (TESTE || ELE_FORCADA) for (const av of document.querySelectorAll(".aviso-teste")) { av.hidden = false; av.textContent = `MODO TESTE: mostrando ${TESTE || "eleição " + ELE_FORCADA} (não é o 2º turno)`; }
abrirAba();
estadoAlerta();
checarNovas();
conferirInscricao();
atualizar();
setInterval(atualizar, INTERVALO_MS);
setInterval(checarNovas, 5 * 60000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) { atualizar(); atualizarEstados(); checarNovas(); conferirInscricao(); } });
