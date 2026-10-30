// Aba ADPF 1362 (ação do PSD no STF). Dados: adpf.json (a vigia ADPF atualiza só esse arquivo).
// NOVIDADES (❗ vermelho): a vigia marca o andamento novo com "novo": true e troca "novidade_id" no topo
// do adpf.json. Ao LER a notícia nova (toque no card/status), apaga TODO o alerta neste aparelho
// (! da aba + destaques). Próxima novidade (novo novidade_id) traz o ❗ de novo. localStorage "adpf_vistos".
(function(){
const $=i=>document.getElementById(i),e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const EXT='<div class="adpf-ext">Arguição de Descumprimento de Preceito Fundamental</div>';
const stf=u=>/portal\.stf\.jus\.br/i.test(u||'');
const fonte=a=>stf(a.url)||!a.url?e(a.fonte):`<a href="${e(a.url)}" target="_blank" rel="noopener">${e(a.fonte)}</a>`;
let alvo=null,timer=null,ult=0;
function cont(){if(!alvo)return;const d=alvo-Date.now();if(d<=0){$('adCont').innerHTML='<div><b>0</b><small>dias</small></div>';return}
const t=[Math.floor(d/864e5),Math.floor(d/36e5)%24,Math.floor(d/6e4)%60,Math.floor(d/1e3)%60];
$('adCont').innerHTML=t.map((v,i)=>`<div><b>${v}</b><small>${['dias','horas','min','seg'][i]}</small></div>`).join('')}
const item=a=>{const nv=a.novo&&DD&&!visto(chave(DD,a))&&!(DD.novidade_id&&localStorage.getItem(NK)===DD.novidade_id);const ix=IT.push(a)-1;return `<div class="cd adcd${nv?' adnovo':''}" data-ix="${ix}" role="button" tabindex="0" data-k="${e(DD?chave(DD,a):'')}">${nv?'<b class="adexc" title="novidade">!</b>':''}<span class="dt">${e(a.data)}</span><h3>${e(a.titulo)}</h3>${/\bADPF\b/i.test(a.titulo)?EXT:''}<div class="v">${e(a.texto)}</div><div class="nota">Fonte: ${e(a.fonte)} · <b class="fb-ler">Toque para ler a notícia completa ›</b></div></div>`};
const kv=(k,v,sk)=>{const n=sk&&novoS(sk);return `<div class="cd${sk?' adst':''}${n?' adnovo':''}"${sk?` data-s="${sk}"`:''}>${n?exc:''}<div class="k">${k}</div><div class="v">${v}</div></div>`};
const sb=(lab,val,sk)=>{const n=novoS(sk);return `<div class="adst${n?' adnovo':''}" data-s="${sk}">${n?exc:''}${lab}<b>${val}</b></div>`};
const VK='adpf_vistos',NK='adpf_novidade_lida',vistos=()=>{try{return JSON.parse(localStorage.getItem(VK)||'[]')}catch(_){return[]}};
const chave=(D,a)=>a.data+'|'+a.titulo;
const visto=(k,v)=>(v||vistos()).some(x=>x===k||(k.indexOf('status|')!==0&&x.endsWith('|'+k)));
let DD=null,IT=[];
const ckS=k=>'status|'+k+'|'+((DD&&DD.novidade_id)||''), novoS=k=>DD&&DD.novidade_id&&(DD.status_novos||[]).includes(k)&&!visto(ckS(k))&&localStorage.getItem(NK)!==DD.novidade_id;
const exc='<b class="adexc" title="novidade">!</b>';
function ponto(D){const el=$('pontoAdpf');if(!el)return;
 if(D.novidade_id&&localStorage.getItem(NK)===D.novidade_id){el.hidden=true;return}
 const v=vistos();
 el.hidden=!(D.novidade_id&&([...(D.andamentos||[]),...(D.contexto||[]),...(D.segundo_turno||[])].some(a=>a.novo&&!visto(chave(D,a),v))||(D.status_novos||[]).some(k=>!visto('status|'+k+'|'+D.novidade_id,v))))}
function apagarAlerta(){
 if(!DD||!DD.novidade_id)return;
 const v=vistos();
 [...(DD.andamentos||[]),...(DD.contexto||[]),...(DD.segundo_turno||[])].forEach(a=>{if(a.novo){const k=chave(DD,a);if(!v.includes(k))v.push(k)}});
 (DD.status_novos||[]).forEach(k=>{const ck=ckS(k);if(!v.includes(ck))v.push(ck)});
 localStorage.setItem(VK,JSON.stringify(v.slice(-200)));
 localStorage.setItem(NK,DD.novidade_id);
 const root=$('aba-adpf');if(root)root.querySelectorAll('.adnovo').forEach(el=>{el.classList.remove('adnovo','nov-flash');el.querySelector('.adexc')?.remove()});
 ponto(DD)}
function lerUm(el,k){const v=vistos();if(k&&!v.includes(k)){v.push(k);localStorage.setItem(VK,JSON.stringify(v.slice(-200)))}if(el){el.classList.remove('adnovo','nov-flash');el.querySelector('.adexc')?.remove()}if(!document.querySelector('#aba-adpf .adnovo'))localStorage.setItem(NK,DD.novidade_id);ponto(DD)}
window._lerNovidade=window._lerNovidade||{};window._lerNovidade.adpf=apagarAlerta;
document.addEventListener('click',ev=>{if(!DD||!ev.target.closest)return;
 const st=ev.target.closest('.adst.adnovo');if(st){lerUm(st,ckS(st.dataset.s));return}
 const c=ev.target.closest('.adcd');if(!c)return;const a=IT[+c.dataset.ix];const nv=c.classList.contains('adnovo');
 if(a&&window.abrirNoticia)window.abrirNoticia(a,nv);
 if(nv)lerUm(c,c.dataset.k)});
function sinc(){if(!DD)return;document.querySelectorAll('.adcd.adnovo').forEach(c=>{if(visto(c.dataset.k)||(DD.novidade_id&&localStorage.getItem(NK)===DD.novidade_id)){c.classList.remove('adnovo');c.querySelector('.adexc')?.remove()}});document.querySelectorAll('.adst.adnovo').forEach(x=>{if(!novoS(x.dataset.s)){x.classList.remove('adnovo');x.querySelector('.adexc')?.remove()}});ponto(DD)}
window.addEventListener('storage',ev=>{if(ev.key===VK||ev.key===NK)sinc()});document.addEventListener('visibilitychange',()=>{if(!document.hidden)sinc()});window.addEventListener('pageshow',sinc);
document.addEventListener('keydown',ev=>{if((ev.key==='Enter'||ev.key===' ')&&ev.target.closest&&ev.target.closest('.adcd')){ev.preventDefault();ev.target.click()}});
fetch('adpf.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()).then(D=>{DD=D;ponto(D)}).catch(()=>{});
const FK='adpf_faixa_lida';
function faixa(D){const el=$('adFaixa');if(!el)return;const s=D.status||{},l=String(s.liminar||'').trim();
 if(!l||/sem decis|aguard|pendente/i.test(l)){el.hidden=true;el.innerHTML='';return}
 const d=s.decisao||{},k=(d.data||'')+'|'+l+'|'+(d.texto||'').slice(0,80),lida=localStorage.getItem(FK)===k;
 const txt=d.texto||(l+(s.situacao?' — '+s.situacao:'')),src=d.url&&!stf(d.url)?`<a href="${e(d.url)}" target="_blank" rel="noopener">${e(d.fonte||'Fonte')}</a>`:e(d.fonte||'');
 el.hidden=false;el.className=lida?'adfx lida':'adfx';el.dataset.k=k;
 el.innerHTML=`<div class="adfx-bar" role="button" tabindex="0"><span class="adfx-tag">AO VIVO</span><b>DECISÃO TOMADA</b><small>Min. Cristiano Zanin · toque para ler</small></div><div class="adfx-txt"><div class="adfx-h">DECISÃO DO MIN. CRISTIANO ZANIN${d.data?' · '+e(d.data):''}</div><div class="adfx-l">Liminar: <b>${e(l)}</b></div><p>${e(txt)}</p>${src?'<div class="adfx-f">Fonte: '+src+'</div>':''}</div>`;
 el.querySelector('.adfx-bar').onclick=()=>{localStorage.setItem(FK,k);el.classList.add('lida')}}
window.carregarADPF=function(forcar){
 if(!forcar&&Date.now()-ult<60000){if(window.novidadeAbaPronta)window.novidadeAbaPronta('adpf');return;} ult=Date.now();
 fetch('adpf.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()).then(D=>{
  DD=D;ponto(D);const abaEl=$('aba-adpf');if(abaEl)abaEl.dataset.nid=D.novidade_id||'';const s=D.status||{},p=D.processo||{};alvo=new Date(D.data_alvo||'2026-10-25T08:00:00-03:00');cont();if(!timer)timer=setInterval(()=>{if(!$('aba-adpf').hidden)cont()},1000);
  const n=(s.numero_adpf||'').trim();$('adNum').innerHTML='<span>Número do processo:</span><b>'+e(n&&!/^n[ãa]o divulgado$/i.test(n)?n:'ADPF 1362')+'</b>';
  faixa(D);
  IT=[];$('adSt').innerHTML=sb('Relator',e(s.relator),'relator')+sb('Liminar',e(s.liminar),'liminar')+sb('Número único',e(p.numero_unico||'—'),'numero_unico')+sb('Protocolo',e(p.protocolo||'—'),'protocolo');
  $('adProc').innerHTML=kv('Situação',e(s.situacao),'situacao')+kv('Classe','ADPF'+EXT)+kv('Número',e(s.numero_adpf))+kv('Número único',e(p.numero_unico||'—'))+kv('Tribunal',e(p.tribunal))+kv('Requerente',e(p.autor))+kv('Advogado',e(p.advogado||'—'))+kv('Interessado',e(p.interessado||'—'))+kv('Assunto',e(p.assunto||'—'))+kv('Protocolo',e(p.protocolo))+kv('Relator',e(s.relator),'relator')+kv('Liminar',e(s.liminar),'liminar')+kv('Pedido','<ul>'+(p.pedido||[]).map(x=>'<li>'+e(x)+'</li>').join('')+'</ul>')+kv('Tese',e(p.tese))+(p.citacao?kv('Citação do PSD','<q>'+e(p.citacao)+'</q>'):'')+(p.alternativa?kv('Se não houver decisão',e(p.alternativa)):'');
  $('adAnd').innerHTML=(D.andamentos||[]).map(item).join('');
  if($('ad2t'))$('ad2t').innerHTML=(D.segundo_turno||[]).map(item).join('');
  $('adCtx').innerHTML=(D.contexto||[]).map(item).join('');
  const M=D.ministros||[];
  $('adMin').innerHTML='<p class="nota">Indicados pelo PSD para o sorteio</p>'+M.filter(m=>m.grupo=='pedido').map(m=>`<div class="cd"><h3>${e(m.nome)}</h3><div class="v">${e(m.status)}</div></div>`).join('')+'<p class="nota">Excluídos no pedido</p>'+M.filter(m=>m.grupo!='pedido').map(m=>`<div class="cd ex"><h3>${e(m.nome)}</h3><div class="v">${e(m.status)}</div></div>`).join('');
  $('adFon').innerHTML=(D.fontes||[]).filter(f=>!stf(f.url)).map(f=>`<div class="cd"><a href="${e(f.url)}" target="_blank" rel="noopener">${e(f.nome)}</a></div>`).join('');
  $('adAtu').innerHTML='Atualizado em <b>'+e(D.atualizado_em)+'</b> (horário de Brasília)';
  if(window.novidadeAbaPronta)window.novidadeAbaPronta('adpf');
 }).catch(()=>{ult=0;$('adAtu').textContent='Sem conexão. Tente de novo.'});
};
if(location.hash=='#adpf')window.carregarADPF();
})();
