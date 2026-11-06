// Aba "Governo do Estado do Rio" — trocas (entrou/saiu) no 1º escalão estadual.
// Dados: governo.json (a rotina externa só mexe nesse arquivo).
// Cada item: data, titulo, texto, texto_completo, fonte, url, novo;
// opcional: tipo, pessoa_entrou, pessoa_saiu, cargo, orgao, rev, esfera, natureza.
// Escopo: Secretário e Subsecretário de Estado + presidente de autarquia/empresa estadual (inclui CEDAE).
// Águas do Rio: concessionária privada — selo próprio, sem atribuir nomeação ao governador.
// Fora: vices, diretores (exceto presidente), cargos menores, Alerj, municípios.
// NOVIDADES: "novo": true + novidade_id; ! some ao LER o item (lerUm). O menu só rola.
(function(){
const $=i=>document.getElementById(i),e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const par=t=>String(t||'').split(/\n\s*\n/).map(p=>'<p>'+e(p)+'</p>').join('');
const VAZIO='Nenhuma troca de secretário, subsecretário de Estado ou presidente de autarquia/empresa estadual no período varrido.';
function modal(){let m=$('ntModal');if(m)return m;m=document.createElement('div');m.id='ntModal';m.className='nt-fundo';m.hidden=true;
 m.innerHTML='<div class="nt-caixa" role="dialog" aria-modal="true"><button class="nt-x" aria-label="Fechar">×</button><div id="ntCorpo"></div></div>';
 document.body.appendChild(m);m.addEventListener('click',ev=>{if(ev.target===m||ev.target.closest('.nt-x')){m.hidden=true;document.body.classList.remove('nt-aberto')}});return m}
if(!window.abrirNoticia)window.abrirNoticia=function(a,nova){const m=modal();
 $('ntCorpo').innerHTML=(nova?'<b class="adexc nt-exc" title="novidade">!</b>':'')+`<span class="dt">${e(a.data)}</span>${nova?' <span class="nt-novo">NOVA</span>':''}<h3>${e(a.titulo)}</h3><div class="nt-txt">${par(a.texto_completo||a.texto)}</div><div class="nota">Fonte: ${a.url?`<a href="${e(a.url)}" target="_blank" rel="noopener">${e(a.fonte)}</a>`:e(a.fonte)}</div>`;
 m.hidden=false;document.body.classList.add('nt-aberto');m.querySelector('.nt-caixa').scrollTop=0};
function privada(a){
 if(a.natureza==='concessionaria_privada'||a.concessionaria_privada===true)return true;
 return /[áa]guas do rio/i.test([a.orgao,a.titulo,a.empresa].filter(Boolean).join(' '));
}
function fora(a){
 if(a.fora===true||a.no_escopo===false)return true;
 const c=String(a.cargo||'');
 if(/\bvice\b/i.test(c))return true;
 if(/\bdiretor\b/i.test(c)&&!/presidente/i.test(c))return true;
 const esf=String(a.esfera||a.poder||'');
 if(/alerj|municip|c[âa]mara/i.test(esf))return true;
 return false;
}
function completar(a){
 if(!privada(a))return a;
 const base=a.texto_completo||a.texto||'';
 if(/concession[aá]ria privada/i.test(base))return a;
 return Object.assign({},a,{texto_completo:base+'\n\nConcessionária privada. Este ato não é nomeação do governador.'});
}
const VK='governo_vistos',NK='governo_novidade_lida';
const vistos=()=>{try{return JSON.parse(localStorage.getItem(VK)||'[]')}catch(_){return[]}};
const chave=(D,a)=>a.data+'|'+a.titulo+(a.rev?'|'+a.rev:''), chS=(D,k)=>'status|'+k+'|'+((D&&D.status&&D.status[k])||'');
const visto=k=>{const v=vistos();return v.some(x=>x===k||(k.indexOf('status|')!==0&&x.endsWith('|'+k)))};
let DD=null,ult=0;
const novoI=a=>!fora(a)&&a.novo&&DD.novidade_id&&localStorage.getItem(NK)!==DD.novidade_id&&!visto(chave(DD,a)), novoS=k=>DD.novidade_id&&localStorage.getItem(NK)!==DD.novidade_id&&(DD.status_novos||[]).includes(k)&&!visto(chS(DD,k));
function ponto(D){DD=D;const el=$('pontoGoverno');if(!el)return;
 if(D.novidade_id&&localStorage.getItem(NK)===D.novidade_id){el.hidden=true;return}
 el.hidden=!((D.itens||[]).some(novoI)||Object.keys(D.status||{}).some(novoS))}
function apagarAlerta(){
 if(!DD||!DD.novidade_id)return;
 const v=vistos();
 (DD.itens||[]).forEach(a=>{if(a.novo&&!fora(a)){const k=chave(DD,a);if(!v.includes(k))v.push(k)}});
 (DD.status_novos||[]).forEach(k=>{const ck=chS(DD,k);if(!v.includes(ck))v.push(ck)});
 localStorage.setItem(VK,JSON.stringify(v.slice(-300)));
 localStorage.setItem(NK,DD.novidade_id);
 const root=$('aba-governo');if(root)root.querySelectorAll('.adnovo').forEach(el=>{el.classList.remove('adnovo','nov-flash');el.querySelector('.adexc')?.remove()});
 ponto(DD)}
function lerUm(el,k){const v=vistos();if(!v.includes(k)){v.push(k);localStorage.setItem(VK,JSON.stringify(v.slice(-300)))}if(el){el.classList.remove('adnovo','nov-flash');el.querySelector('.adexc')?.remove()}if(!(DD.itens||[]).some(novoI)&&!Object.keys(DD.status||{}).some(novoS))localStorage.setItem(NK,DD.novidade_id);ponto(DD)}
window._lerNovidade=window._lerNovidade||{};window._lerNovidade.governo=apagarAlerta;
const fonteHtml=a=>a.url?`<a href="${e(a.url)}" target="_blank" rel="noopener">${e(a.fonte||'DOERJ')}</a>`:e(a.fonte||'');
const item=(a,i)=>{const nv=novoI(a);const meta=[a.cargo,a.orgao].filter(Boolean).map(e).join(' · ');
 const priv=privada(a);
 return `<div class="cd gecd${nv?' adnovo':''}" data-i="${i}" role="button" tabindex="0">${nv?'<b class="adexc" title="novidade">!</b>':''}<span class="dt">${e(a.data)}</span>${priv?'<div><span class="ge-priv">Concessionária privada</span><span class="ge-nao-gov">Não é nomeação do governador</span></div>':''}<h3>${e(a.titulo)}</h3>${meta?`<div class="ge-meta">${meta}</div>`:''}<div class="v">${e(a.texto)}</div><div class="nota">Fonte: ${fonteHtml(a)} · <b class="ge-ler">Toque para ler a notícia completa ›</b></div></div>`};
document.addEventListener('click',ev=>{if(!DD)return;
 const s=ev.target.closest&&ev.target.closest('.gest.adnovo');if(s){lerUm(s,chS(DD,s.dataset.k));return}
 const c=ev.target.closest&&ev.target.closest('.gecd');if(!c)return;const a=(DD.itens||[])[+c.dataset.i];if(!a||fora(a))return;
 const nv=novoI(a)||c.classList.contains('adnovo');
 if(ev.target.closest('a')){if(nv)lerUm(c,chave(DD,a));return}
 window.abrirNoticia(completar(a),nv);if(nv)lerUm(c,chave(DD,a))});
function sinc(){if(!DD)return;document.querySelectorAll('.gecd.adnovo').forEach(c=>{const a=(DD.itens||[])[+c.dataset.i];if(a&&!novoI(a)){c.classList.remove('adnovo');c.querySelector('.adexc')?.remove()}});document.querySelectorAll('.gest.adnovo').forEach(s=>{if(!novoS(s.dataset.k)){s.classList.remove('adnovo');s.querySelector('.adexc')?.remove()}});ponto(DD)}
window.addEventListener('storage',ev=>{if(ev.key===VK||ev.key===NK)sinc()});document.addEventListener('visibilitychange',()=>{if(!document.hidden)sinc()});window.addEventListener('pageshow',sinc);
document.addEventListener('keydown',ev=>{if((ev.key==='Enter'||ev.key===' ')&&ev.target.closest&&ev.target.closest('.gecd')){ev.preventDefault();ev.target.click()}});
fetch('governo.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()).then(ponto).catch(()=>{});
function carregar(forcar){
 if(!forcar&&Date.now()-ult<60000)return;ult=Date.now();
 fetch('governo.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()).then(D=>{ponto(D);
  $('geRes').textContent=D.resumo||'';if(D.contra)$('geContra').textContent=D.contra;$('geAss').innerHTML=D.assunto?'<b>Assunto:</b> '+e(D.assunto):'';
  $('geSt').innerHTML=Object.entries(D.status||{}).map(([k,v])=>{const n=novoS(k);return `<div class="gest${n?' adnovo':''}" data-k="${e(k)}">${n?'<b class="adexc" title="novidade">!</b>':''}${e(k)}<b>${e(v)}</b></div>`}).join('');
  const html=(D.itens||[]).map((a,i)=>fora(a)?'':item(a,i)).join('');
  $('geLin').innerHTML=html||'<p class="nota" id="geVazio">'+e(D.vazio||VAZIO)+'</p>';
  $('geAtu').innerHTML='Atualizado em <b>'+e(D.atualizado_em)+'</b> (horário de Brasília)';
  if(window.novidadeAbaPronta)window.novidadeAbaPronta('governo');
 }).catch(()=>{ult=0;if($('geAtu'))$('geAtu').textContent='Sem conexão. Tente de novo.'})}
function abrir(){const on=location.hash=='#governo',m=$('aba-governo');if(!m)return;
 if(on){for(const x of document.querySelectorAll('main.aba'))x.hidden=x!==m;for(const a of document.querySelectorAll('#nav a'))a.classList.toggle('atual',a.dataset.aba==='governo');const stale=!$('aba-governo').querySelector('.adnovo')&&localStorage.getItem(NK)!==(DD&&DD.novidade_id);carregar(!!stale||!DD);if(window.novidadeAbaPronta)window.novidadeAbaPronta('governo')}else m.hidden=true}
window.addEventListener('hashchange',abrir);abrir();
})();
