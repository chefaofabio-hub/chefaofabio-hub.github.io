// Aba "Flávio Bolsonaro" (linha do tempo do caso). Dados: ruas.json (a vigia só mexe nesse arquivo).
// Cabeçalho: "contra" (2ª linha, ex.: "× Alexandre de Moraes") e "assunto" (3ª linha, curto e factual; manter atualizado).
// Cada item: data, titulo, texto (resumo do card), texto_completo (relato completo, abre na caixa ao tocar), fonte, url, novo.
// NOVIDADES (❗ vermelho): item novo leva "novo": true; linhas de situação novas vão em "status_novos": ["Passaporte", ...];
// "novidade_id" no topo muda a cada novidade (ex.: "2026-10-27 06:00"). O ❗ some ao tocar (localStorage "ruas_vistos");
// o ❗ da aba some quando tudo que é novo foi tocado. Na próxima novidade, tirar "novo"/status_novos antigos.
(function(){
const $=i=>document.getElementById(i),e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const par=t=>String(t||'').split(/\n\s*\n/).map(p=>'<p>'+e(p)+'</p>').join('');
// caixa (modal) de notícia completa, usada também pela ADPF
function modal(){let m=$('ntModal');if(m)return m;m=document.createElement('div');m.id='ntModal';m.className='nt-fundo';m.hidden=true;
 m.innerHTML='<div class="nt-caixa" role="dialog" aria-modal="true"><button class="nt-x" aria-label="Fechar">×</button><div id="ntCorpo"></div></div>';
 document.body.appendChild(m);m.addEventListener('click',ev=>{if(ev.target===m||ev.target.closest('.nt-x')){m.hidden=true;document.body.classList.remove('nt-aberto')}});return m}
if(!window.abrirNoticia)window.abrirNoticia=function(a,nova){const m=modal();
 $('ntCorpo').innerHTML=(nova?'<b class="adexc nt-exc" title="novidade">!</b>':'')+`<span class="dt">${e(a.data)}</span>${nova?' <span class="nt-novo">NOVA</span>':''}<h3>${e(a.titulo)}</h3><div class="nt-txt">${par(a.texto_completo||a.texto)}</div><div class="nota">Fonte: ${a.url&&!/portal\.stf\.jus\.br/i.test(a.url)?`<a href="${e(a.url)}" target="_blank" rel="noopener">${e(a.fonte)}</a>`:e(a.fonte)}</div>`;
 m.hidden=false;document.body.classList.add('nt-aberto');m.querySelector('.nt-caixa').scrollTop=0};
const VK='ruas_vistos',vistos=()=>{try{return JSON.parse(localStorage.getItem(VK)||'[]')}catch(_){return[]}};
const marca=k=>{const v=vistos();if(!v.includes(k)){v.push(k);localStorage.setItem(VK,JSON.stringify(v.slice(-300)))}};
const chave=(D,a)=>((D&&D.novidade_id)||'')+'|'+a.data+'|'+a.titulo, chS=(D,k)=>((D&&D.novidade_id)||'')+'|status|'+k;
let DD=null,ult=0;
const novoI=a=>a.novo&&DD.novidade_id&&!vistos().includes(chave(DD,a)), novoS=k=>DD.novidade_id&&(DD.status_novos||[]).includes(k)&&!vistos().includes(chS(DD,k));
function ponto(D){DD=D;const el=$('pontoRuas');if(!el)return;el.hidden=!((D.itens||[]).some(novoI)||Object.keys(D.status||{}).some(novoS))}
const item=(a,i)=>{const nv=novoI(a);return `<div class="cd rscd${nv?' adnovo':''}" data-i="${i}" role="button" tabindex="0">${nv?'<b class="adexc" title="novidade">!</b>':''}<span class="dt">${e(a.data)}</span><h3>${e(a.titulo)}</h3><div class="v">${e(a.texto)}</div><div class="nota">Fonte: ${e(a.fonte)} · <b class="fb-ler">Toque para ler a notícia completa ›</b></div></div>`};
document.addEventListener('click',ev=>{if(!DD)return;
 const s=ev.target.closest&&ev.target.closest('.rsst.adnovo');if(s){marca(chS(DD,s.dataset.k));s.classList.remove('adnovo');s.querySelector('.adexc')?.remove();ponto(DD);return}
 const c=ev.target.closest&&ev.target.closest('.rscd');if(!c)return;const a=(DD.itens||[])[+c.dataset.i];if(!a)return;
 const nv=novoI(a);window.abrirNoticia(a,nv);if(nv){marca(chave(DD,a));c.classList.remove('adnovo');c.querySelector('.adexc')?.remove();ponto(DD)}});
fetch('ruas.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()).then(ponto).catch(()=>{});
function carregar(){
 if(Date.now()-ult<60000)return;ult=Date.now();
 fetch('ruas.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()).then(D=>{ponto(D);
  $('rsRes').textContent=D.resumo||'';if(D.contra)$('rsContra').textContent=D.contra;$('rsAss').innerHTML=D.assunto?'<b>Assunto:</b> '+e(D.assunto):'';
  $('rsSt').innerHTML=Object.entries(D.status||{}).map(([k,v])=>{const n=novoS(k);return `<div class="rsst${n?' adnovo':''}" data-k="${e(k)}">${n?'<b class="adexc" title="novidade">!</b>':''}${e(k)}<b>${e(v)}</b></div>`}).join('');
  $('rsLin').innerHTML=(D.itens||[]).map(item).join('');
  $('rsAtu').innerHTML='Atualizado em <b>'+e(D.atualizado_em)+'</b> (horário de Brasília)';
 }).catch(()=>{ult=0;$('rsAtu').textContent='Sem conexão. Tente de novo.'})}
function abrir(){const on=location.hash=='#ruas',m=$('aba-ruas');if(!m)return;
 if(on){for(const x of document.querySelectorAll('main.aba'))x.hidden=x!==m;for(const a of document.querySelectorAll('#nav a'))a.classList.toggle('atual',a.dataset.aba==='ruas');carregar()}else m.hidden=true}
window.addEventListener('hashchange',abrir);abrir();
})();
