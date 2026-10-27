// Aba ADPF 1362 (ação do PSD no STF). Dados: adpf.json (a vigia ADPF atualiza só esse arquivo).
// NOVIDADES (❗ vermelho): a vigia marca o andamento novo com "novo": true e troca "novidade_id" no topo
// do adpf.json (ex.: "2026-10-25 09:10"). O app mostra ❗ no item marcado e na aba ADPF; o ❗ da aba some
// quando TODOS os itens novos forem tocados; o ❗ de cada item some ao tocar nele (localStorage "adpf_vistos").
// Na próxima novidade, tirar "novo" dos itens antigos. novidade_id vazio = nada marcado.
(function(){
const $=i=>document.getElementById(i),e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const EXT='<div class="adpf-ext">Arguição de Descumprimento de Preceito Fundamental</div>';
const stf=u=>/portal\.stf\.jus\.br/i.test(u||'');  // sem link para o portal do STF
const fonte=a=>stf(a.url)||!a.url?e(a.fonte):`<a href="${e(a.url)}" target="_blank" rel="noopener">${e(a.fonte)}</a>`;
let alvo=null,timer=null,ult=0;
function cont(){if(!alvo)return;const d=alvo-Date.now();if(d<=0){$('adCont').innerHTML='<div><b>0</b><small>dias</small></div>';return}
const t=[Math.floor(d/864e5),Math.floor(d/36e5)%24,Math.floor(d/6e4)%60,Math.floor(d/1e3)%60];
$('adCont').innerHTML=t.map((v,i)=>`<div><b>${v}</b><small>${['dias','horas','min','seg'][i]}</small></div>`).join('')}
const item=a=>{const nv=a.novo&&DD&&!visto(chave(DD,a));const ix=IT.push(a)-1;return `<div class="cd adcd${nv?' adnovo':''}" data-ix="${ix}" role="button" tabindex="0" data-k="${e(DD?chave(DD,a):'')}">${nv?'<b class="adexc" title="novidade">!</b>':''}<span class="dt">${e(a.data)}</span><h3>${e(a.titulo)}</h3>${/\bADPF\b/i.test(a.titulo)?EXT:''}<div class="v">${e(a.texto)}</div><div class="nota">Fonte: ${e(a.fonte)} · <b class="fb-ler">Toque para ler a notícia completa ›</b></div></div>`};
const kv=(k,v,sk)=>{const n=sk&&novoS(sk);return `<div class="cd${sk?' adst':''}${n?' adnovo':''}"${sk?` data-s="${sk}"`:''}>${n?exc:''}<div class="k">${k}</div><div class="v">${v}</div></div>`};
const sb=(lab,val,sk)=>{const n=novoS(sk);return `<div class="adst${n?' adnovo':''}" data-s="${sk}">${n?exc:''}${lab}<b>${val}</b></div>`};
const VK='adpf_vistos',vistos=()=>{try{return JSON.parse(localStorage.getItem(VK)||'[]')}catch(_){return[]}};
// chave ESTÁVEL (não depende de novidade_id: antes, cada troca de novidade_id fazia o ❗ voltar em notícias já vistas)
const chave=(D,a)=>a.data+'|'+a.titulo;
const visto=(k,v)=>(v||vistos()).some(x=>x===k||(k.indexOf('status|')!==0&&x.endsWith('|'+k)));
let DD=null,IT=[];
// caixas de situação com ❗: "status_novos": ["liminar","relator","situacao","numero_unico","protocolo", ...] (chaves de status/processo)
const ckS=k=>'status|'+k+'|'+((DD&&DD.novidade_id)||''), novoS=k=>DD&&DD.novidade_id&&(DD.status_novos||[]).includes(k)&&!visto(ckS(k));
const exc='<b class="adexc" title="novidade">!</b>';
function ponto(D){const el=$('pontoAdpf');if(!el)return;const v=vistos();
 el.hidden=!(D.novidade_id&&([...(D.andamentos||[]),...(D.contexto||[]),...(D.segundo_turno||[])].some(a=>a.novo&&!visto(chave(D,a),v))||(D.status_novos||[]).some(k=>!visto('status|'+k+'|'+D.novidade_id,v))))}
document.addEventListener('click',ev=>{if(!DD||!ev.target.closest)return;
 const st=ev.target.closest('.adst.adnovo');if(st){const v=vistos();v.push(ckS(st.dataset.s));localStorage.setItem(VK,JSON.stringify(v.slice(-200)));document.querySelectorAll('.adst[data-s="'+st.dataset.s+'"]').forEach(x=>{x.classList.remove('adnovo');x.querySelector('.adexc')?.remove()});ponto(DD);return}
 const c=ev.target.closest('.adcd');if(!c)return;const a=IT[+c.dataset.ix];const nv=c.classList.contains('adnovo');
 if(a&&window.abrirNoticia)window.abrirNoticia(a,nv);
 if(nv){const v=vistos();if(!v.includes(c.dataset.k)){v.push(c.dataset.k);localStorage.setItem(VK,JSON.stringify(v.slice(-200)))}
 sinc()}});
function sinc(){if(!DD)return;document.querySelectorAll('.adcd.adnovo').forEach(c=>{if(visto(c.dataset.k)){c.classList.remove('adnovo');c.querySelector('.adexc')?.remove()}});document.querySelectorAll('.adst.adnovo').forEach(x=>{if(!novoS(x.dataset.s)){x.classList.remove('adnovo');x.querySelector('.adexc')?.remove()}});ponto(DD)}
window.addEventListener('storage',ev=>{if(ev.key===VK)sinc()});document.addEventListener('visibilitychange',()=>{if(!document.hidden)sinc()});window.addEventListener('pageshow',sinc);
document.addEventListener('keydown',ev=>{if((ev.key==='Enter'||ev.key===' ')&&ev.target.closest&&ev.target.closest('.adcd')){ev.preventDefault();ev.target.click()}});
fetch('adpf.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()).then(D=>{DD=D;ponto(D)}).catch(()=>{});
window.carregarADPF=function(){
 if(Date.now()-ult<60000)return; ult=Date.now();
 fetch('adpf.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()).then(D=>{
  DD=D;ponto(D);const s=D.status||{},p=D.processo||{};alvo=new Date(D.data_alvo||'2026-10-25T08:00:00-03:00');cont();if(!timer)timer=setInterval(()=>{if(!$('aba-adpf').hidden)cont()},1000);
  const n=(s.numero_adpf||'').trim();$('adNum').innerHTML='<span>Número do processo:</span><b>'+e(n&&!/^n[ãa]o divulgado$/i.test(n)?n:'ADPF 1362')+'</b>';
  IT=[];$('adSt').innerHTML=sb('Relator',e(s.relator),'relator')+sb('Liminar',e(s.liminar),'liminar')+sb('Número único',e(p.numero_unico||'—'),'numero_unico')+sb('Protocolo',e(p.protocolo||'—'),'protocolo');
  $('adProc').innerHTML=kv('Situação',e(s.situacao),'situacao')+kv('Classe','ADPF'+EXT)+kv('Número',e(s.numero_adpf))+kv('Número único',e(p.numero_unico||'—'))+kv('Tribunal',e(p.tribunal))+kv('Requerente',e(p.autor))+kv('Advogado',e(p.advogado||'—'))+kv('Interessado',e(p.interessado||'—'))+kv('Assunto',e(p.assunto||'—'))+kv('Protocolo',e(p.protocolo))+kv('Relator',e(s.relator),'relator')+kv('Liminar',e(s.liminar),'liminar')+kv('Pedido','<ul>'+(p.pedido||[]).map(x=>'<li>'+e(x)+'</li>').join('')+'</ul>')+kv('Tese',e(p.tese))+(p.citacao?kv('Citação do PSD','<q>'+e(p.citacao)+'</q>'):'')+(p.alternativa?kv('Se não houver decisão',e(p.alternativa)):'');
  $('adAnd').innerHTML=(D.andamentos||[]).map(item).join('');
  if($('ad2t'))$('ad2t').innerHTML=(D.segundo_turno||[]).map(item).join('');
  $('adCtx').innerHTML=(D.contexto||[]).map(item).join('');
  const M=D.ministros||[];
  $('adMin').innerHTML='<p class="nota">Indicados pelo PSD para o sorteio</p>'+M.filter(m=>m.grupo=='pedido').map(m=>`<div class="cd"><h3>${e(m.nome)}</h3><div class="v">${e(m.status)}</div></div>`).join('')+'<p class="nota">Excluídos no pedido</p>'+M.filter(m=>m.grupo!='pedido').map(m=>`<div class="cd ex"><h3>${e(m.nome)}</h3><div class="v">${e(m.status)}</div></div>`).join('');
  $('adFon').innerHTML=(D.fontes||[]).filter(f=>!stf(f.url)).map(f=>`<div class="cd"><a href="${e(f.url)}" target="_blank" rel="noopener">${e(f.nome)}</a></div>`).join('');
  $('adAtu').innerHTML='Atualizado em <b>'+e(D.atualizado_em)+'</b> (horário de Brasília)';
 }).catch(()=>{ult=0;$('adAtu').textContent='Sem conexão. Tente de novo.'});
};
if(location.hash=='#adpf')window.carregarADPF();
})();
