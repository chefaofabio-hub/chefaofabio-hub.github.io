// Aba "Flávio Bolsonaro" (linha do tempo do caso). Dados: flavio.json (a vigia só mexe nesse arquivo).
// Cabeçalho: "contra" (2ª linha, ex.: "× Alexandre de Moraes") e "assunto" (3ª linha, curto e factual; manter atualizado).
// Cada item: data, titulo, texto (resumo do card), texto_completo (relato completo, abre na caixa ao tocar), fonte, url, novo.
// NOVIDADES (❗ vermelho): item novo leva "novo": true; linhas de situação novas vão em "status_novos": ["Passaporte", ...];
// "novidade_id" no topo muda a cada novidade (ex.: "2026-10-27 06:00"). O ❗ some ao LER a notícia nova (localStorage "flavio_vistos");
// ao ler, apaga TODO o alerta da novidade atual (! da aba + destaques). Próxima novidade (novo novidade_id) traz o ❗ de novo.
(function(){
const $=i=>document.getElementById(i),e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const par=t=>String(t||'').split(/\n\s*\n/).map(p=>'<p>'+e(p)+'</p>').join('');
function modal(){let m=$('ntModal');if(m)return m;m=document.createElement('div');m.id='ntModal';m.className='nt-fundo';m.hidden=true;
 m.innerHTML='<div class="nt-caixa" role="dialog" aria-modal="true"><button class="nt-x" aria-label="Fechar">×</button><div id="ntCorpo"></div></div>';
 document.body.appendChild(m);m.addEventListener('click',ev=>{if(ev.target===m||ev.target.closest('.nt-x')){m.hidden=true;document.body.classList.remove('nt-aberto')}});return m}
window.abrirNoticia=function(a,nova){const m=modal();
 $('ntCorpo').innerHTML=(nova?'<b class="adexc nt-exc" title="novidade">!</b>':'')+`<span class="dt">${e(a.data)}</span>${nova?' <span class="nt-novo">NOVA</span>':''}<h3>${e(a.titulo)}</h3><div class="nt-txt">${par(a.texto_completo||a.texto)}</div><div class="nota">Fonte: ${a.url&&!/portal\.stf\.jus\.br/i.test(a.url)?`<a href="${e(a.url)}" target="_blank" rel="noopener">${e(a.fonte)}</a>`:e(a.fonte)}</div>`;
 m.hidden=false;document.body.classList.add('nt-aberto');m.querySelector('.nt-caixa').scrollTop=0};
const VK='flavio_vistos',NK='flavio_novidade_lida';
const vistos=()=>{try{return JSON.parse(localStorage.getItem(VK)||'[]')}catch(_){return[]}};
const marca=k=>{const v=vistos();if(!v.includes(k)){v.push(k);localStorage.setItem(VK,JSON.stringify(v.slice(-300)))}};
const chave=(D,a)=>a.data+'|'+a.titulo+(a.rev?'|'+a.rev:''), chS=(D,k)=>'status|'+k+'|'+((D&&D.status&&D.status[k])||'');
const visto=k=>{const v=vistos();return v.some(x=>x===k||(k.indexOf('status|')!==0&&x.endsWith('|'+k)))};
let DD=null,ult=0;
const novoI=a=>a.novo&&DD.novidade_id&&localStorage.getItem(NK)!==DD.novidade_id&&!visto(chave(DD,a)), novoS=k=>DD.novidade_id&&localStorage.getItem(NK)!==DD.novidade_id&&(DD.status_novos||[]).includes(k)&&!visto(chS(DD,k));
function ponto(D){DD=D;const el=$('pontoFlavio');if(!el)return;
 if(D.novidade_id&&localStorage.getItem(NK)===D.novidade_id){el.hidden=true;return}
 el.hidden=!((D.itens||[]).some(novoI)||Object.keys(D.status||{}).some(novoS))}
/** Marca a novidade atual como lida neste aparelho: some ! da aba e todos os destaques. */
function apagarAlerta(){
 if(!DD||!DD.novidade_id)return;
 const v=vistos();
 (DD.itens||[]).forEach(a=>{if(a.novo){const k=chave(DD,a);if(!v.includes(k))v.push(k)}});
 (DD.status_novos||[]).forEach(k=>{const ck=chS(DD,k);if(!v.includes(ck))v.push(ck)});
 localStorage.setItem(VK,JSON.stringify(v.slice(-300)));
 localStorage.setItem(NK,DD.novidade_id);
 const root=$('aba-flavio');if(root)root.querySelectorAll('.adnovo').forEach(el=>{el.classList.remove('adnovo','nov-flash');el.querySelector('.adexc')?.remove()});
 ponto(DD)}
function lerUm(el,k){const v=vistos();if(!v.includes(k)){v.push(k);localStorage.setItem(VK,JSON.stringify(v.slice(-300)))}if(el){el.classList.remove('adnovo','nov-flash');el.querySelector('.adexc')?.remove()}if(!(DD.itens||[]).some(novoI)&&!Object.keys(DD.status||{}).some(novoS))localStorage.setItem(NK,DD.novidade_id);ponto(DD)}
window._lerNovidade=window._lerNovidade||{};window._lerNovidade.flavio=apagarAlerta;
const item=(a,i)=>{const nv=novoI(a);return `<div class="cd fbcd${nv?' adnovo':''}" data-i="${i}" role="button" tabindex="0">${nv?'<b class="adexc" title="novidade">!</b>':''}<span class="dt">${e(a.data)}</span><h3>${e(a.titulo)}</h3><div class="v">${e(a.texto)}</div><div class="nota">Fonte: ${e(a.fonte)} · <b class="fb-ler">Toque para ler a notícia completa ›</b></div></div>`};
document.addEventListener('click',ev=>{if(!DD)return;
 const s=ev.target.closest&&ev.target.closest('.fbst.adnovo');if(s){lerUm(s,chS(DD,s.dataset.k));return}
 const c=ev.target.closest&&ev.target.closest('.fbcd');if(!c)return;const a=(DD.itens||[])[+c.dataset.i];if(!a)return;
 const nv=novoI(a)||c.classList.contains('adnovo');window.abrirNoticia(a,nv);if(nv)lerUm(c,chave(DD,a))});
function sinc(){if(!DD)return;document.querySelectorAll('.fbcd.adnovo').forEach(c=>{const a=(DD.itens||[])[+c.dataset.i];if(a&&!novoI(a)){c.classList.remove('adnovo');c.querySelector('.adexc')?.remove()}});document.querySelectorAll('.fbst.adnovo').forEach(s=>{if(!novoS(s.dataset.k)){s.classList.remove('adnovo');s.querySelector('.adexc')?.remove()}});ponto(DD)}
window.addEventListener('storage',ev=>{if(ev.key===VK||ev.key===NK)sinc()});document.addEventListener('visibilitychange',()=>{if(!document.hidden)sinc()});window.addEventListener('pageshow',sinc);
document.addEventListener('keydown',ev=>{if((ev.key==='Enter'||ev.key===' ')&&ev.target.closest&&ev.target.closest('.fbcd')){ev.preventDefault();ev.target.click()}});
fetch('flavio.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()).then(ponto).catch(()=>{});
function carregar(forcar){
 if(!forcar&&Date.now()-ult<60000)return;ult=Date.now();
 fetch('flavio.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()).then(D=>{ponto(D);
  $('fbRes').textContent=D.resumo||'';if(D.contra)$('fbContra').textContent=D.contra;$('fbAss').innerHTML=D.assunto?'<b>Assunto:</b> '+e(D.assunto):'';
  $('fbSt').innerHTML=Object.entries(D.status||{}).map(([k,v])=>{const n=novoS(k);return `<div class="fbst${n?' adnovo':''}" data-k="${e(k)}">${n?'<b class="adexc" title="novidade">!</b>':''}${e(k)}<b>${e(v)}</b></div>`}).join('');
  $('fbLin').innerHTML=(D.itens||[]).map(item).join('');
  $('fbAtu').innerHTML='Atualizado em <b>'+e(D.atualizado_em)+'</b> (horário de Brasília)';
  if(window.novidadeAbaPronta)window.novidadeAbaPronta('flavio');
 }).catch(()=>{ult=0;$('fbAtu').textContent='Sem conexão. Tente de novo.'})}
function abrir(){const h=location.hash.slice(1),on=h=='flavio'||!['adpf','ruas','prefeitura','paes'].includes(h),m=$('aba-flavio');if(!m)return;
 if(on){for(const x of document.querySelectorAll('main.aba'))x.hidden=x!==m;for(const a of document.querySelectorAll('#nav a'))a.classList.toggle('atual',a.dataset.aba==='flavio');const stale=!$('aba-flavio').querySelector('.adnovo')&&localStorage.getItem(NK)!== (DD&&DD.novidade_id);carregar(!!stale||!DD);if(window.novidadeAbaPronta)window.novidadeAbaPronta('flavio')}else m.hidden=true}
window.addEventListener('hashchange',abrir);abrir();
})();
