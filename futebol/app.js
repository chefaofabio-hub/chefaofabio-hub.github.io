const API="https://site.api.espn.com/apis";
const L={bra:"bra.1",lib:"conmebol.libertadores",sul:"conmebol.sudamericana"};
let tab=location.hash.slice(1)||"bra";if(!L[tab])tab="bra";
const cache={};
const ymd=d=>d.toISOString().slice(0,10).replace(/-/g,"");
const fmt=d=>new Date(d).toLocaleString("pt-BR",{weekday:"short",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit",timeZone:"America/Sao_Paulo"});
const j=u=>fetch(u,{cache:"no-cache"}).then(r=>r.ok?r.json():null).catch(()=>null);
const FASES={"semifinals":"Semifinais","quarterfinals":"Quartas de final","round-of-16":"Oitavas de final","final":"Final","knockout-round-play-offs":"Playoffs","group-stage":"Fase de grupos"};
async function jogos(lg,antes,depois){
  const ds=[];for(let i=-antes;i<=depois;i++){const d=new Date(Date.now()+i*864e5);ds.push(ymd(d))}
  const rs=await Promise.all(ds.map(d=>j(`${API}/site/v2/sports/soccer/${lg}/scoreboard?dates=${d}`)));
  const m=new Map();rs.forEach(r=>(r&&r.events||[]).forEach(e=>m.set(e.id,e)));
  return [...m.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
function jogoHTML(e){
  const c=e.competitions[0],h=c.competitors.find(x=>x.homeAway=="home"),a=c.competitors.find(x=>x.homeAway=="away");
  const st=e.status.type,lg=t=>t.team.logo?`<img src="${t.team.logo}" loading="lazy" alt="">`:"";
  let sc;if(st.state=="pre")sc=`<span style="font-size:13px">x</span><small>${new Date(e.date).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit",timeZone:"America/Sao_Paulo"})}</small>`;
  else sc=`${h.score} - ${a.score}<small class="${st.state=="in"?"live":""}">${st.state=="in"?"🔴 "+e.status.displayClock:"Encerrado"}${h.shootoutScore!=null?` (pên. ${h.shootoutScore}-${a.shootoutScore})`:""}</small>`;
  const nota=(c.notes||[]).map(n=>n.headline).join(" ").replace("1st Leg","Ida").replace("2nd Leg","Volta");
  return `<div class="m"><div class="h"><span class="n">${h.team.shortDisplayName||h.team.displayName}</span>${lg(h)}</div><div class="sc">${sc}${nota?`<small>${nota}</small>`:""}</div><div class="a">${lg(a)}<span class="n">${a.team.shortDisplayName||a.team.displayName}</span></div></div>`;
}
function listaJogos(ev,porFase){
  if(!ev.length)return `<div class="card"><div class="err" style="color:#666">Nenhum jogo nesse período.</div></div>`;
  let out="",grp={};
  ev.forEach(e=>{const k=porFase?(FASES[e.season&&e.season.slug]||e.season&&e.season.slug||"Jogos"):"";(grp[k]=grp[k]||[]).push(e)});
  for(const k in grp){if(k)out+=`<h2>${k}</h2>`;let dia="";out+=`<div class="card">`;
    grp[k].forEach(e=>{const d=new Date(e.date).toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"2-digit",timeZone:"America/Sao_Paulo"});if(d!=dia){dia=d;out+=`<div class="dt">${d}</div>`}out+=jogoHTML(e)});out+=`</div>`}
  return out;
}
async function bra(){
  const [s,ev]=await Promise.all([j(`${API}/v2/sports/soccer/bra.1/standings?season=2026`),jogos("bra.1",7,7)]);
  if(!s)throw 0;const en=s.children[0].standings.entries;
  const g=(e,n)=>(e.stats.find(x=>x.name==n)||{}).displayValue;
  en.sort((a,b)=>+g(a,"rank")-+g(b,"rank"));
  let h=`<h2>Classificação – Série A 2026</h2><div class="card"><table><tr><th>#</th><th style="text-align:left">Time</th><th>P</th><th>J</th><th>V</th><th>E</th><th>D</th><th>GP:GC</th><th>SG</th></tr>`;
  en.forEach((e,i)=>{const r=+g(e,"rank");const cl=r<=4?"g4":r<=6?"g4":r<=12?"sa":r>=17?"z":"";
    h+=`<tr class="${r<=6?"g4":r<=12?"sa":r>=17?"z":""}"><td>${r}</td><td class="t"><img src="${(e.team.logos||[{}])[0].href||""}" loading="lazy" alt="">${e.team.shortDisplayName||e.team.displayName}</td><td class="p">${g(e,"points")}</td><td>${g(e,"gamesPlayed")}</td><td>${g(e,"wins")}</td><td>${g(e,"ties")}</td><td>${g(e,"losses")}</td><td>${g(e,"pointsFor")}:${g(e,"pointsAgainst")}</td><td>${g(e,"pointDifferential")}</td></tr>`});
  h+=`</table><div class="leg"><b style="background:#1565c0"></b>Libertadores <b style="background:#f39c12"></b>Sul-Americana <b style="background:#c62828"></b>Rebaixamento</div></div>`;
  const now=Date.now(),pas=ev.filter(e=>e.status.type.state!="pre").slice(-10),fut=ev.filter(e=>e.status.type.state=="pre").slice(0,10);
  return h+`<h2>Últimos resultados</h2>`+listaJogos(pas)+`<h2>Próximos jogos</h2>`+listaJogos(fut);
}
async function copa(lg,nome){
  const ev=await jogos(lg,30,30);
  return `<h2 style="font-size:18px">${nome} 2026</h2>`+listaJogos(ev,true);
}
async function render(force){
  const main=document.getElementById("main");
  document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("on",b.dataset.t==tab));
  if(cache[tab]&&!force)main.innerHTML=cache[tab];else if(!cache[tab])main.innerHTML=`<div class="err" style="color:#666">Carregando…</div>`;
  const t=tab;
  try{const h=t=="bra"?await bra():t=="lib"?await copa(L.lib,"Libertadores"):await copa(L.sul,"Sul-Americana");
    cache[t]=h;if(t==tab)main.innerHTML=h;
    document.getElementById("upd").textContent="Atualizado às "+new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
  }catch(e){if(!cache[t])main.innerHTML=`<div class="err">Não foi possível carregar. Verifique a internet.</div>`}
}
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>{tab=b.dataset.t;history.replaceState(0,"","#"+tab);render()});
render();setInterval(()=>render(true),120000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)render(true)});
if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js",{updateViaCache:"none"});
