// Aba ADPF 1362 (ação do PSD no STF). Dados: adpf.json (a vigia ADPF atualiza só esse arquivo).
// NOVIDADES (❗ vermelho): a vigia marca o andamento novo com "novo": true e troca "novidade_id" no topo
// do adpf.json (ex.: "2026-10-25 09:10"). O app mostra ❗ no item marcado e na aba ADPF; o ❗ da aba some
// quando a pessoa abre a aba (localStorage "visto_adpf" = novidade_id) e volta quando o id mudar.
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
const item=a=>`<div class="cd${a.novo?' adnovo':''}">${a.novo?'<b class="adexc" title="novidade">!</b>':''}<span class="dt">${e(a.data)}</span><h3>${e(a.titulo)}</h3>${/\bADPF\b/i.test(a.titulo)?EXT:''}<div class="v">${e(a.texto)}</div><div class="nota">Fonte: ${fonte(a)}</div></div>`;
const kv=(k,v)=>`<div class="cd"><div class="k">${k}</div><div class="v">${v}</div></div>`;
function ponto(D,aberta){const id=(D&&D.novidade_id)||'',el=$('pontoAdpf');if(!el)return;
 if(aberta&&id)localStorage.setItem('visto_adpf',id);el.hidden=!id||localStorage.getItem('visto_adpf')===id}
fetch('adpf.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()).then(D=>ponto(D,!$('aba-adpf').hidden)).catch(()=>{});
window.carregarADPF=function(){
 if(Date.now()-ult<60000)return; ult=Date.now();
 fetch('adpf.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()).then(D=>{
  ponto(D,true);const s=D.status||{},p=D.processo||{};alvo=new Date(D.data_alvo||'2026-10-25T08:00:00-03:00');cont();if(!timer)timer=setInterval(()=>{if(!$('aba-adpf').hidden)cont()},1000);
  const n=(s.numero_adpf||'').trim();$('adNum').innerHTML='<span>Número do processo:</span><b>'+e(n&&!/^n[ãa]o divulgado$/i.test(n)?n:'ADPF 1362')+'</b>';
  $('adSt').innerHTML=`<div>Relator<b>${e(s.relator)}</b></div><div>Liminar<b>${e(s.liminar)}</b></div><div>Número único<b>${e(p.numero_unico||'—')}</b></div><div>Protocolo<b>${e(p.protocolo||'—')}</b></div>`;
  $('adProc').innerHTML=kv('Situação',e(s.situacao))+kv('Classe','ADPF'+EXT)+kv('Número',e(s.numero_adpf))+kv('Número único',e(p.numero_unico||'—'))+kv('Tribunal',e(p.tribunal))+kv('Requerente',e(p.autor))+kv('Advogado',e(p.advogado||'—'))+kv('Interessado',e(p.interessado||'—'))+kv('Assunto',e(p.assunto||'—'))+kv('Protocolo',e(p.protocolo))+kv('Relator',e(s.relator))+kv('Liminar',e(s.liminar))+kv('Pedido','<ul>'+(p.pedido||[]).map(x=>'<li>'+e(x)+'</li>').join('')+'</ul>')+kv('Tese',e(p.tese))+(p.citacao?kv('Citação do PSD','<q>'+e(p.citacao)+'</q>'):'')+(p.alternativa?kv('Se não houver decisão',e(p.alternativa)):'');
  $('adAnd').innerHTML=(D.andamentos||[]).map(item).join('');
  $('adCtx').innerHTML=(D.contexto||[]).map(item).join('');
  const M=D.ministros||[];
  $('adMin').innerHTML='<p class="nota">Indicados pelo PSD para o sorteio</p>'+M.filter(m=>m.grupo=='pedido').map(m=>`<div class="cd"><h3>${e(m.nome)}</h3><div class="v">${e(m.status)}</div></div>`).join('')+'<p class="nota">Excluídos no pedido</p>'+M.filter(m=>m.grupo!='pedido').map(m=>`<div class="cd ex"><h3>${e(m.nome)}</h3><div class="v">${e(m.status)}</div></div>`).join('');
  $('adFon').innerHTML=(D.fontes||[]).filter(f=>!stf(f.url)).map(f=>`<div class="cd"><a href="${e(f.url)}" target="_blank" rel="noopener">${e(f.nome)}</a></div>`).join('');
  $('adAtu').innerHTML='Atualizado em <b>'+e(D.atualizado_em)+'</b> (horário de Brasília)';
 }).catch(()=>{ult=0;$('adAtu').textContent='Sem conexão. Tente de novo.'});
};
if(location.hash=='#adpf')window.carregarADPF();
})();
