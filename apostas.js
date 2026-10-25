// Aba Mercado de apostas: Polymarket (ao vivo no navegador, gamma-api) + Kalshi (API bloqueia navegador → apostas.json,
// gerado por tools/gerar_apostas.py a cada publicação). Atualiza a cada 60 s só com a aba aberta. NÃO é pesquisa.
(function(){
const $=i=>document.getElementById(i);
const TZ="America/Sao_Paulo";
const hora=iso=>{const d=new Date(iso);return isNaN(d)?"—":d.toLocaleString("pt-BR",{timeZone:TZ,day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).replace(","," às")};
const pct=p=>p==null?"—":(Math.round(p*1000)/10).toFixed(1).replace(".",",").replace(/,0$/,"")+"%";
const mi=v=>(v/1e6).toFixed(1).replace(".",",")+" mi";
let res=null,timer=null,kalshiVivo=true;
async function pm(){const r=await fetch("https://gamma-api.polymarket.com/events?slug=brazil-presidential-election",{cache:"no-store"});
 const e=(await r.json())[0],o={volume:+e.volume||0,atualizado:new Date().toISOString(),vivo:1};
 for(const m of e.markets){if(m.closed||!m.outcomePrices)continue;const p=+JSON.parse(m.outcomePrices)[0],n=m.groupItemTitle||"";
  if(n.includes("Flávio"))o.flavio=p;if(n.includes("Lula"))o.lula=p}
 if(o.flavio==null||o.lula==null)throw 0;return o}
async function ks(){const r=await fetch("https://api.elections.kalshi.com/trade-api/v2/markets?event_ticker=KXBRPRES-26",{cache:"no-store"});
 const ms=(await r.json()).markets,o={contratos:0,atualizado:new Date().toISOString(),vivo:1};
 for(const m of ms){o.contratos+=+m.volume_fp||0;if(m.ticker.endsWith("-FBOL"))o.flavio=+m.last_price_dollars;if(m.ticker.endsWith("-LULA"))o.lula=+m.last_price_dollars}
 if(o.flavio==null)throw 0;return o}
function cartao(nome,cls,url,d,volTxt){
 if(!d)return `<div class="ap-card ${cls}"><div class="ap-cab"><b>${nome}</b></div><p class="nota">Sem dados agora.</p></div>`;
 const lin=(n,c,v)=>`<div class="ap-cand"><div class="ap-linha"><span class="ap-nome ${c}">${n}</span><span class="ap-pct ${c}">${pct(v)}</span></div><div class="ap-trilho"><i class="${c==="az"?"f":"l"}" style="width:${Math.max(0,Math.min(100,(v||0)*100))}%"></i></div></div>`;
 return `<div class="ap-card ${cls}"><div class="ap-cab"><b>${nome}</b><span class="ap-tag${d.vivo?" vivo":""}">${d.vivo?"● ao vivo":"última leitura"}</span></div>
 ${lin("Flávio B.","az",d.flavio)}${lin("Lula","vm",d.lula)}
 <div class="ap-info">${volTxt}</div><div class="ap-info">Atualizado: <b>${hora(d.atualizado)}</b> (Brasília)</div>
 <a class="ap-link" href="${url}" target="_blank" rel="noopener">Ver no ${nome} ↗</a></div>`}
function desenhar(){if(!res)return;const p=res.polymarket,k=res.kalshi;
 $("apCards").innerHTML=cartao("Polymarket","pm","https://polymarket.com/event/brazil-presidential-election",p,p?`Volume apostado: <b>US$ ${mi(p.volume)}</b> (evento todo)`:"")
  +cartao("Kalshi","ks","https://kalshi.com/markets/kxbrpres/brazil-presidency/kxbrpres-26",k,k?`Negociado: <b>${mi(k.contratos)} de contratos</b> (evento todo)`:"");
 $("apRod").textContent="Chance = preço do contrato \"Sim\" (US$ 0 a 1). Atualiza sozinho a cada 1 min com a aba aberta."}
async function carregar(){
 let base={};try{base=await (await fetch("apostas.json?t="+Date.now(),{cache:"no-store"})).json()}catch(_){}
 res={polymarket:(res&&res.polymarket&&res.polymarket.vivo&&res.polymarket)||base.polymarket||(res&&res.polymarket),kalshi:(res&&res.kalshi&&res.kalshi.vivo&&res.kalshi)||base.kalshi||(res&&res.kalshi)};desenhar();
 try{res.polymarket=await pm()}catch(_){}
 if(kalshiVivo){try{res.kalshi=await ks()}catch(_){kalshiVivo=false}}
 desenhar()}
window.carregarApostas=function(){carregar();clearInterval(timer);timer=setInterval(()=>{if(location.hash==="#apostas"&&!document.hidden)carregar();else clearInterval(timer)},60000)};
if(location.hash==="#apostas")window.carregarApostas();
})();
