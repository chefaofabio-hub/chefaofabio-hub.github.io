// Visual "investigativo" — SÓ na versão celular (index.html). No PC (body.pc) não faz nada.
(function(){
if(document.body.classList.contains('pc')&&!document.body.dataset.inv)return;
document.body.classList.add('inv');
const cab=document.querySelector('.vg-cab');
const SVG='<svg class="inv-cam" width="112" height="98" viewBox="0 0 220 190" aria-hidden="true"><defs><linearGradient id="ivm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a616d"/><stop offset=".5" stop-color="#2a2f37"/><stop offset="1" stop-color="#15181d"/></linearGradient><radialGradient id="ivg" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#3b4a66"/><stop offset=".5" stop-color="#0c1220"/><stop offset="1" stop-color="#000"/></radialGradient><radialGradient id="ivr" cx=".5" cy=".5" r=".5"><stop offset=".55" stop-color="#11151c"/><stop offset=".8" stop-color="#2d333d"/><stop offset="1" stop-color="#6a717d"/></radialGradient></defs><g stroke="#3a4049" stroke-width="6" stroke-linecap="round"><line x1="110" y1="140" x2="62" y2="186"/><line x1="110" y1="140" x2="158" y2="186"/><line x1="110" y1="140" x2="110" y2="188"/></g><rect x="100" y="128" width="20" height="16" rx="3" fill="url(#ivm)"/><g class="inv-head"><rect x="30" y="34" width="160" height="96" rx="16" fill="url(#ivm)" stroke="#6b727e"/><rect x="44" y="24" width="38" height="14" rx="4" fill="#3a4049"/><circle class="inv-led" cx="168" cy="50" r="5"/><circle cx="110" cy="82" r="44" fill="url(#ivr)" stroke="#7a818c" stroke-width="1.5"/><circle cx="110" cy="82" r="30" fill="url(#ivg)"/><circle cx="110" cy="82" r="14" fill="#04060a" stroke="#5b8ae6" stroke-width="1.2"/><ellipse cx="98" cy="70" rx="11" ry="6" fill="#fff" opacity=".55" transform="rotate(-30 98 70)"/><circle cx="122" cy="96" r="3" fill="#5b8ae6" opacity=".7"/></g></svg>';
if(cab){const im=cab.querySelector('img');if(im)im.outerHTML=SVG;const t=cab.querySelector('b');if(t)t.innerHTML='VIGIA<small>LENTE ATIVA</small>'}
const cam=()=>document.querySelector('.inv-cam');
const P=['pontoFlavio','pontoAdpf','pontoRuas'];
const ativo=()=>P.some(i=>{const x=document.getElementById(i);return x&&!x.hidden});
function salto(){const c=cam();if(!c)return;c.classList.remove('salta');void c.getBoundingClientRect();c.classList.add('salta')}
let tinha=false;
function chk(){const a=ativo();document.body.classList.toggle('inv-alerta',a);if(a&&!tinha)salto();tinha=a}
const mo=new MutationObserver(chk);P.forEach(i=>{const x=document.getElementById(i);if(x)mo.observe(x,{attributes:true,attributeFilter:['hidden']})});
document.addEventListener('animationend',ev=>{if(ev.target.classList&&ev.target.classList.contains('salta'))ev.target.classList.remove('salta')});
// carimbos "CAPTADO hh:mm · dd/mm" (hora = atualização do arquivo, só nas fichas novas; demais levam só a data)
const H={};['flavio','adpf','ruas'].forEach(n=>fetch(n+'.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()).then(D=>{const m=/(\d{2}\/\d{2})\/\d{4}\s+(\d{2}:\d{2})/.exec(D.atualizado_em||'');H[n]=m?{d:m[1],h:m[2]}:{};car()}).catch(()=>{}));
function car(){if(Object.keys(H).length<3)return;document.querySelectorAll('.fbcd .dt,.adcd .dt,.rscd .dt,#ntCorpo .dt').forEach(d=>{if(d.dataset.inv)return;const raw=d.textContent.trim(),m=/^(\d{2})\/(\d{2})\/\d{4}$/.exec(raw);
 const card=d.closest('.cd'),n=card?(card.classList.contains('fbcd')?'flavio':card.classList.contains('rscd')?'ruas':'adpf'):'';
 const dd=m?m[1]+'/'+m[2]:'',hh=H[n]||{},h=card&&card.classList.contains('adnovo')&&hh.h&&hh.d===dd?hh.h+' · ':'';d.dataset.inv=1;d.textContent='CAPTADO '+h+raw})}
new MutationObserver(()=>{car();chk()}).observe(document.body,{childList:true,subtree:true});
chk();car();
})();
