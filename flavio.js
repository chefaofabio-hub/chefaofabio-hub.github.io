// Aba "Flávio Bolsonaro" (linha do tempo do caso). Dados: flavio.json (a vigia só mexe nesse arquivo).
// NOVIDADES (❗ vermelho): igual à ADPF. Item novo leva "novo": true e "novidade_id" no topo muda
// (ex.: "2026-10-27 06:00"). O ❗ do item some ao tocar nele; o da aba some quando todos forem tocados
// (localStorage "flavio_vistos"). Na próxima novidade, tirar "novo" dos itens antigos.
(function(){
const $=i=>document.getElementById(i),e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const VK='flavio_vistos',vistos=()=>{try{return JSON.parse(localStorage.getItem(VK)||'[]')}catch(_){return[]}};
const chave=(D,a)=>((D&&D.novidade_id)||'')+'|'+a.data+'|'+a.titulo;
let DD=null,ult=0;
function ponto(D){const el=$('pontoFlavio');if(!el)return;const v=vistos();el.hidden=!(D.novidade_id&&(D.itens||[]).some(a=>a.novo&&!v.includes(chave(D,a))))}
const item=a=>{const nv=a.novo&&DD.novidade_id&&!vistos().includes(chave(DD,a));return `<div class="cd${nv?' adnovo fbnovo':''}" data-k="${e(chave(DD,a))}">${nv?'<b class="adexc" title="novidade">!</b>':''}<span class="dt">${e(a.data)}</span><h3>${e(a.titulo)}</h3><div class="v">${e(a.texto)}</div><div class="nota">Fonte: ${a.url?`<a href="${e(a.url)}" target="_blank" rel="noopener">${e(a.fonte)}</a>`:e(a.fonte)}</div></div>`};
document.addEventListener('click',ev=>{const c=ev.target.closest&&ev.target.closest('.fbnovo');if(!c||!DD)return;
 const v=vistos();if(!v.includes(c.dataset.k)){v.push(c.dataset.k);localStorage.setItem(VK,JSON.stringify(v.slice(-300)))}
 c.classList.remove('adnovo','fbnovo');const x=c.querySelector('.adexc');if(x)x.remove();ponto(DD)});
fetch('flavio.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()).then(D=>{DD=D;ponto(D)}).catch(()=>{});
function carregar(){
 if(Date.now()-ult<60000)return;ult=Date.now();
 fetch('flavio.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()).then(D=>{DD=D;ponto(D);
  $('fbRes').textContent=D.resumo||'';
  $('fbSt').innerHTML=Object.entries(D.status||{}).map(([k,v])=>`<div>${e(k)}<b>${e(v)}</b></div>`).join('');
  $('fbLin').innerHTML=(D.itens||[]).map(item).join('');
  $('fbAtu').innerHTML='Atualizado em <b>'+e(D.atualizado_em)+'</b> (horário de Brasília)';
 }).catch(()=>{ult=0;$('fbAtu').textContent='Sem conexão. Tente de novo.'})}
// a aba é controlada aqui (app.js não conhece "flavio")
function abrir(){const on=location.hash=='#flavio',m=$('aba-flavio');if(!m)return;
 if(on){for(const x of document.querySelectorAll('main.aba'))x.hidden=x!==m;for(const a of document.querySelectorAll('#nav a'))a.classList.toggle('atual',a.dataset.aba==='flavio');carregar()}else m.hidden=true}
window.addEventListener('hashchange',abrir);abrir();
})();
