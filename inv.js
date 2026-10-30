// Visual celular alinhado ao PC (fundo claro). Mantém carimbos CAPTADO e alerta de novidade.
(function(){
if(document.body.classList.contains('pc')&&!document.body.dataset.inv)return;
document.body.classList.add('inv');
// NÃO troca mais o logo pelo "olho de câmera" — cabeçalho igual ao do PC (pedido Fabio 30/10).
const P=['pontoFlavio','pontoAdpf','pontoRuas','pontoPrefeitura'];
const ativo=()=>P.some(i=>{const x=document.getElementById(i);return x&&!x.hidden});
function chk(){document.body.classList.toggle('inv-alerta',ativo())}
const mo=new MutationObserver(chk);P.forEach(i=>{const x=document.getElementById(i);if(x)mo.observe(x,{attributes:true,attributeFilter:['hidden']})});
const H={};['flavio','adpf','ruas'].forEach(n=>fetch(n+'.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()).then(D=>{const m=/(\d{2}\/\d{2})\/\d{4}\s+(\d{2}:\d{2})/.exec(D.atualizado_em||'');H[n]=m?{d:m[1],h:m[2]}:{};car()}).catch(()=>{}));
function car(){if(Object.keys(H).length<3)return;document.querySelectorAll('.fbcd .dt,.adcd .dt,.rscd .dt,#ntCorpo .dt').forEach(d=>{if(d.dataset.inv)return;const raw=d.textContent.trim(),m=/^(\d{2})\/(\d{2})\/\d{4}$/.exec(raw);
 const card=d.closest('.cd'),n=card?(card.classList.contains('fbcd')?'flavio':card.classList.contains('rscd')?'ruas':'adpf'):'';
 const dd=m?m[1]+'/'+m[2]:'',hh=H[n]||{},h=card&&card.classList.contains('adnovo')&&hh.h&&hh.d===dd?hh.h+' · ':'';d.dataset.inv=1;d.textContent='CAPTADO '+h+raw})}
new MutationObserver(()=>{car();chk()}).observe(document.body,{childList:true,subtree:true});
chk();car();
})();
