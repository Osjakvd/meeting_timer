const showErr=m=>{let d=document.getElementById('err');if(!d){d=document.createElement('div');d.id='err';d.style.cssText='background:#d32f2f;color:#fff;padding:10px 14px;font-size:13px;white-space:pre-wrap';document.body.prepend(d)}d.textContent=m};
window.addEventListener('error',e=>showErr('Error: '+e.message+' ('+String(e.filename||'').split('/').pop()+':'+e.lineno+')'));
window.addEventListener('unhandledrejection',e=>showErr('Error: '+((e.reason&&e.reason.message)||e.reason)));
const $=s=>document.querySelector(s),LS=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},SV=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let weeks=LS('mt_weeks',[]),cur=null,A=null,tick=null,lock=null;
const show=id=>['plan','live','sum','his'].forEach(x=>$('#'+x).classList.toggle('hide',x!==id));
const startMin=()=>LS('mt_start',1080),tot=s=>s.reduce((a,x)=>a+x.s,0);
const save=()=>SV('mt_weeks',weeks);
async function addIssue(buf,issue){
  const w=await readEpub(buf,issue);if(!w.length)throw Error('El archivo no tiene semanas');
  for(const x of w){const i=weeks.findIndex(y=>y.issue===x.issue&&y.start===x.start);if(i<0)weeks.push(x)}save();return w.length}
async function download(issue){
  const px=LS('mt_proxy','');
  if(px){const r=await fetch(px+(px.includes('?')?'&':'?')+'issue='+issue);if(!r.ok)throw Error('Guía '+issue+' no disponible ('+r.status+')');return addIssue(await r.arrayBuffer(),issue)}
  const j=await(await fetch('https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS?output=json&pub=mwb&fileformat=EPUB&alllangs=0&langwritten=S&issue='+issue)).json();
  const u=j.files?.S?.EPUB?.[0]?.file?.url;if(!u)throw Error('Guía '+issue+' no disponible');
  return addIssue(await(await fetch(u)).arrayBuffer(),issue)}
const find=()=>{const n=Date.now();return weeks.find(w=>n>=w.start&&n<=w.end)};
async function load(){
  cur=find();
  if(!cur){const e=[];for(const c of [issueFor(new Date()),prevIssue(issueFor(new Date()))]){try{await download(c);cur=find();if(cur)break}catch(x){e.push(c+': '+x.message)}}
    if(!cur){$('#pb').innerHTML='<div class="w"><b>'+(e.length?'No se pudo descargar la guía automáticamente.':'La guía descargada no incluye esta fecha.')+'</b>'+(e.length?'<p class="mu">'+esc(e.join(' · '))+'</p>':'')+'<p>Descarga el EPUB de la guía en tu iPhone (en la página de jw.org, opción EPUB) y tócalo en <b>Importar</b>.</p><p><button class="pr" id="im2">Importar guía (EPUB)</button></p><p><a href="https://www.jw.org/es/biblioteca/guia-actividades-reunion-testigos-jehova/">Abrir guías en jw.org</a></p></div>';$('#im2').onclick=()=>$('#fl').click();return}}
  render()}
function render(){
  show('plan');const w=cur,p=tot(w.segs),m=TARGET-p,st=new Date();st.setHours(0,startMin(),0,0);
  $('#ttl').textContent=w.label;let o='<div class="w"><b>'+esc(w.book)+'</b><div class="mu">Plan '+fc(p*1000)+' / '+fc(TARGET*1000)+' · '+(m>=0?'margen '+fc(m*1000):'<b>excede '+fc(-m*1000)+'</b>')+'</div><div style="margin-top:8px">Inicio <input type="time" id="stt" value="'+String(Math.floor(startMin()/60)).padStart(2,'0')+':'+String(startMin()%60).padStart(2,'0')+'"> · fin estimado '+hm(+st+p*1000)+'</div></div>';
  let acc=0,prev='';
  w.segs.forEach((s,i)=>{const c=col(s.sec);if(c&&s.sec!==prev)o+='<div class="ban" style="background:'+c[0]+'">'+c[1]+' '+esc(s.sec)+'</div>';prev=s.sec;
    o+='<div class="row" data-i="'+i+'" style="'+(c?'background:'+c[0]+'22':'')+'"><div class="t">'+esc(s.t)+'</div><div class="r">'+(s.s%60?fc(s.s*1000):s.s/60+' min')+'<div class="mu">'+hm(+st+acc*1000)+'–'+hm(+st+(acc+s.s)*1000)+'</div></div></div>';acc+=s.s});
  o+='<div class="w"><button id="ad">+ Agregar parte</button> <button id="rl">Recargar semana</button> <button class="pr" id="go" style="float:right">Iniciar reunión</button></div><div class="mu w">Toca una parte para editarla.</div>';
  $('#pb').innerHTML=o;
  $('#stt').onchange=e=>{const[h,mi]=e.target.value.split(':');SV('mt_start',+h*60+ +mi);render()};
  document.querySelectorAll('.row').forEach(r=>r.onclick=()=>edit(+r.dataset.i));
  $('#ad').onclick=()=>edit(-1);$('#go').onclick=begin;
  $('#rl').onclick=async()=>{if(!confirm('Se volverá a descargar la guía y se perderán tus cambios de esta semana.'))return;try{const k=cur.issue;weeks=weeks.filter(x=>x.issue!==k);save();await download(k);cur=find();render()}catch(e){alert(e.message+'\nUsa Importar con el EPUB.');weeks=LS('mt_weeks',[])}}}
function edit(i){
  const s=i<0?{t:'',s:300,k:'extra',sec:'EXTRA'}:cur.segs[i],t=prompt('Título (vacío = eliminar)',s.t);if(t===null)return;
  if(!t.trim()&&i>=0){cur.segs.splice(i,1)}else{const m=prompt('Duración en minutos (admite 1.5)',s.s/60);if(m===null)return;s.t=t.trim();s.s=Math.round(parseFloat(m.replace(',','.'))*60)||0;if(i<0)cur.segs.push(s)}
  save();render()}
/* ---------- cronómetro ---------- */
const el=()=>(A.end||A.pa||Date.now())-A.t0-A.pt;
const persist=()=>SV('mt_act',A);
function begin(){A={plan:cur.segs.map(s=>({t:s.t,s:s.s,sec:s.sec})),label:cur.label+' · '+cur.book,t0:Date.now(),pt:0,pa:null,end:null,i:0,cs:0,laps:[]};persist();live()}
function live(){show('live');$('#lt').textContent=A.label;lines();clearInterval(tick);tick=setInterval(upd,250);upd();try{navigator.wakeLock?.request('screen').then(l=>lock=l).catch(()=>{})}catch{}}
function lines(){let acc=0,o='';A.plan.forEach((s,i)=>{const l=A.laps.find(x=>x.i===i),c=col(s.sec);o+='<div class="row" data-i="'+i+'" style="'+(c?'background:'+c[0]+'22':'')+(i===A.i?';font-weight:700':'')+'"><span>'+(l?'✅':i===A.i?'▶️':'⚪')+'</span><div class="t">'+esc(s.t)+'<div class="mu">'+hm(A.t0+acc*1000)+'–'+hm(A.t0+(acc+s.s)*1000)+'</div></div><div class="r">'+(l?fc(l.b-l.a)+' / ':'')+fc(s.s*1000)+'</div></div>';acc+=s.s});
  $('#ll').innerHTML=o;document.querySelectorAll('#ll .row').forEach(r=>r.onclick=()=>{const i=+r.dataset.i;if(i>A.i&&!A.pa){close();A.i=i;A.cs=el();persist();lines()}});
  $('#nx').textContent=A.i===A.plan.length-1?'Terminar última parte':'Siguiente parte';$('#nx').disabled=!!A.pa;$('#pa').textContent=A.pa?'Reanudar':'Pausa';$('#un').disabled=!A.laps.length}
function upd(){if(!A)return;const s=A.plan[A.i],lap=el()-A.cs,pl=s.s*1000,r=pl?lap/pl:0,c=r<.9?'#2e9e4f':r<1?'#d99a00':'#d32f2f';
  $('#clk').textContent=fc(el());const pS=A.plan.slice(0,A.i).reduce((a,x)=>a+x.s,0)*1000,b=A.cs-pS;$('#beh').textContent='Plan '+fc(tot(A.plan)*1000)+' · '+(b>0?'atraso ':'adelanto ')+fc(Math.abs(b));
  $('#csec').textContent=s.sec;$('#ctit').textContent=s.t;$('#clap').textContent=fc(lap);$('#clap').style.color=c;$('#cinf').textContent='de '+fc(pl)+' · '+(lap<=pl?'quedan '+fc(pl-lap):'excede '+fc(lap-pl));$('#cbar').style.cssText='width:'+Math.min(100,r*100)+'%;background:'+c}
function close(){const s=A.plan[A.i];A.laps.push({i:A.i,t:s.t,p:s.s,a:A.cs,b:el()})}
$('#nx').onclick=()=>{if(A.pa)return;close();if(A.i===A.plan.length-1)return fin();A.i++;A.cs=A.laps[A.laps.length-1].b;persist();lines()};
$('#un').onclick=()=>{const l=A.laps.pop();if(l){A.i=l.i;A.cs=l.a;persist();lines()}};
$('#pa').onclick=()=>{if(A.pa){A.pt+=Date.now()-A.pa;A.pa=null}else A.pa=Date.now();persist();lines()};
$('#fi').onclick=()=>{const p=A.plan.length-A.laps.length;if(confirm(p>0?'Quedan '+p+' partes sin cronometrar. ¿Terminar ahora?':'¿Terminar la reunión?')){if(A.laps.length<A.plan.length&&!A.laps.some(l=>l.i===A.i))close();fin()}};
function fin(){A.end=A.pa||Date.now();clearInterval(tick);lock?.release?.();const h=LS('mt_hist',[]);const r={id:Date.now(),label:A.label,t0:A.t0,total:A.end-A.t0-A.pt,laps:A.laps};h.unshift(r);SV('mt_hist',h);localStorage.removeItem('mt_act');A=null;summary(r,true)}
function summary(r,fresh){show('sum');const d=r.total-TARGET*1000;let o='<div class="w"><b>'+esc(r.label)+'</b><div class="mu">'+new Date(r.t0).toLocaleString('es')+'</div><div class="big" style="text-align:left">'+fc(r.total)+'</div><div style="color:'+(d>0?'#d32f2f':'#2e9e4f')+'">Objetivo '+fc(TARGET*1000)+' · '+(d>=0?'+':'-')+fc(Math.abs(d))+'</div></div>';
  r.laps.forEach(l=>{const a=l.b-l.a,x=a-l.p*1000;o+='<div class="row"><div class="t">'+esc(l.t)+'<div class="mu">Plan '+fc(l.p*1000)+'</div></div><div class="r">'+fc(a)+'<div style="font-size:12px;color:'+(x>0?'#d32f2f':'#2e9e4f')+'">'+(x>=0?'+':'-')+fc(Math.abs(x))+'</div></div></div>'});
  $('#sb2').innerHTML=o;$('#sb').onclick=()=>fresh?(show('plan'),render()):hist()}
function hist(){show('his');const h=LS('mt_hist',[]);$('#hl').innerHTML=h.length?h.map((r,i)=>'<div class="row" data-i="'+i+'"><div class="t">'+esc(r.label)+'<div class="mu">'+new Date(r.t0).toLocaleDateString('es')+'</div></div><div class="r">'+fc(r.total)+'</div><button data-d="'+i+'">🗑</button></div>').join(''):'<div class="w mu">Aún no hay reuniones cronometradas.</div>';
  document.querySelectorAll('#hl .row').forEach(r=>r.onclick=e=>{const i=+r.dataset.i;if(e.target.dataset.d!==undefined){if(confirm('¿Eliminar esta reunión del historial?')){h.splice(i,1);SV('mt_hist',h);hist()}return}summary(h[i],false)})}
$('#fl').removeAttribute('accept');
{const b=document.createElement('button');b.textContent='⚙';b.title='Descarga automática';b.onclick=()=>{const v=prompt('URL de tu Worker de descarga (vacío = desactivar)',LS('mt_proxy',''));if(v!==null){SV('mt_proxy',v.trim());load()}};$('#plan header').append(b)}
$('#bh').onclick=hist;$('#hb').onclick=()=>{show('plan')};$('#bi').onclick=()=>$('#fl').click();
$('#fl').onchange=async e=>{const f=e.target.files[0];if(!f)return;const m=f.name.match(/(\d{6})/);const is=m?m[1]:prompt('Número de la guía (AAAAMM, p. ej. 202611)');if(!is)return;try{await addIssue(await f.arrayBuffer(),is);alert('Guía importada');load()}catch(x){alert('No se pudo importar: '+x.message)}e.target.value=''};
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
document.addEventListener('visibilitychange',()=>{if(A&&!document.hidden)live()});
A=LS('mt_act',null);if(A)live();else load();
