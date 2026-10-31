const DEFAULT_PROXY='https://dry-pond-b30d.superd-jy.workers.dev'; // <- pega aquí la dirección de tu Worker, p. ej. 'https://tu-worker.workers.dev'
const showErr=m=>{let d=document.getElementById('err');if(!d){d=document.createElement('div');d.id='err';d.style.cssText='background:#d32f2f;color:#fff;padding:10px 14px;font-size:13px;white-space:pre-wrap';document.body.prepend(d)}d.textContent=m};
window.addEventListener('error',e=>showErr('Error: '+e.message+' ('+String(e.filename||'').split('/').pop()+':'+e.lineno+')'));
window.addEventListener('unhandledrejection',e=>showErr('Error: '+((e.reason&&e.reason.message)||e.reason)));
const $=s=>document.querySelector(s),LS=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},SV=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let weeks=LS('mt_weeks',[]),cur=null,A=null,tick=null,lock=null;
const show=id=>['plan','live','sum','his','evw','evn','bk'].forEach(x=>$('#'+x).classList.toggle('hide',x!==id));
const startMin=()=>LS('mt_start',1080),tot=s=>s.reduce((a,x)=>a+x.s,0);
const save=()=>SV('mt_weeks',weeks);
async function addIssue(buf,issue){
  const w=await readEpub(buf,issue);if(!w.length)throw Error('El archivo no tiene semanas');
  for(const x of w){const i=weeks.findIndex(y=>y.issue===x.issue&&y.start===x.start);if(i<0)weeks.push(x)}save();return w.length}
async function download(issue){
  const px=LS('mt_proxy',DEFAULT_PROXY);
  if(px){const r=await fetch(px+(px.includes('?')?'&':'?')+'issue='+issue);if(!r.ok)throw Error('Guía '+issue+' no disponible ('+r.status+')');return addIssue(await r.arrayBuffer(),issue)}
  const j=await(await fetch('https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS?output=json&pub=mwb&fileformat=EPUB&alllangs=0&langwritten=S&issue='+issue)).json();
  const u=j.files?.S?.EPUB?.[0]?.file?.url;if(!u)throw Error('Guía '+issue+' no disponible');
  return addIssue(await(await fetch(u)).arrayBuffer(),issue)}
const find=()=>{const n=Date.now();return weeks.find(w=>w.origin!=='event'&&n>=w.start&&n<=w.end)};
async function load(){
  cur=find();
  if(!cur){const e=[];for(const c of [issueFor(new Date()),prevIssue(issueFor(new Date()))]){try{await download(c);cur=find();if(cur)break}catch(x){e.push(c+': '+x.message)}}
    if(!cur){$('#pb').innerHTML='<div class="w"><b>'+(e.length?'No se pudo descargar la guía automáticamente.':'La guía descargada no incluye esta fecha.')+'</b>'+(e.length?'<p class="mu">'+esc(e.join(' · '))+'</p>':'')+'<p>Descarga el EPUB de la guía en tu iPhone (en la página de jw.org, opción EPUB) y tócalo en <b>Importar</b>.</p><p><button class="pr" id="im2">Importar guía (EPUB)</button></p><p><a href="https://www.jw.org/es/biblioteca/guia-actividades-reunion-testigos-jehova/">Abrir guías en jw.org</a></p></div>';$('#im2').onclick=()=>$('#fl').click();return}}
  render()}
const hmp=t=>hm(t)+(new Date(t).getHours()>=12?' p. m.':' a. m.');
const ymd=t=>{const d=new Date(t);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
async function goTo(ts){
  let w=weeks.find(x=>x.origin!=='event'&&ts>=x.start&&ts<=x.end);
  if(!w){const c=issueFor(new Date(ts));for(const k of [c,prevIssue(c)]){if(w)break;try{await download(k);w=weeks.find(x=>x.origin!=='event'&&ts>=x.start&&ts<=x.end)}catch(e){}}}
  if(!w){alert('No hay una guía para esa fecha. Si no se descarga sola, usa Importar con el EPUB.');return}
  cur=w;render()}
function navBar(){const n=find(),isNow=n&&n.start===cur.start;
  return '<div class="w" style="display:flex;gap:8px;align-items:center;border-bottom:1px solid var(--ln)"><button id="wp">‹</button><input type="date" id="dt" value="'+ymd(cur.start)+'" style="flex:1;font:inherit;min-width:0"><button id="wn">›</button>'+(isNow?'':'<button id="td">Hoy</button>')+'</div>'}
function render(){
  fixSec();show('plan');const w=cur,ev=w.origin==='event',T=w.target||TARGET,p=tot(w.segs),m=T-p,st=ev?new Date(w.start):new Date();if(!ev)st.setHours(0,startMin(),0,0);
  $('#ttl').textContent=w.label;let o=(ev?'<div class="w"><button id="eb">‹ Eventos</button></div>':navBar())+'<div class="w"><b>'+esc(w.book)+'</b><div class="mu">Plan '+fc(p*1000)+' / '+fc(T*1000)+' · '+(m>=0?'margen '+fc(m*1000):'<b>excede '+fc(-m*1000)+'</b>')+'</div><div style="margin-top:8px">'+(ev?'Inicio '+hmp(st):'Inicio <input type="time" id="stt" value="'+String(Math.floor(startMin()/60)).padStart(2,'0')+':'+String(startMin()%60).padStart(2,'0')+'">')+' · fin estimado '+hm(+st+p*1000)+'</div></div>';
  let acc=0,prev='';
  w.segs.forEach((s,i)=>{const c=col(s.sec);if(c&&s.sec!==prev)o+='<div class="ban" style="background:'+c[0]+'">'+c[1]+' '+esc(s.sec)+'</div>';prev=s.sec;
    o+='<div class="row" data-i="'+i+'" style="'+(c?'background:'+c[0]+'22':'')+'"><div class="t">'+esc(s.t)+'</div><div class="r">'+(s.s%60?fc(s.s*1000):s.s/60+' min')+'<div class="mu">'+hm(+st+acc*1000)+'–'+hm(+st+(acc+s.s)*1000)+'</div></div>'+(s.k==='extra'?'<span style="display:flex;flex-direction:column;gap:4px"><button data-m="-1" style="padding:2px 10px">▲</button><button data-m="1" style="padding:2px 10px">▼</button></span>':'')+'</div>';acc+=s.s});
  o+='<div class="w"><button id="ad">+ Agregar parte</button> '+(ev?'':'<button id="rl">Recargar semana</button>')+' <button class="pr" id="go" style="float:right">Iniciar reunión</button></div><div class="mu w">Toca una parte para editarla.</div>';
  $('#pb').innerHTML=o;
  if(ev)$('#eb').onclick=evList;else{$('#wp').onclick=()=>goTo(cur.start-86400000);$('#wn').onclick=()=>goTo(cur.end+86400000);
  $('#dt').onchange=e=>{if(e.target.value)goTo(new Date(e.target.value+'T12:00:00').getTime())};
  if($('#td'))$('#td').onclick=()=>{cur=find()||cur;render()};
  $('#stt').onchange=e=>{const[h,mi]=e.target.value.split(':');SV('mt_start',+h*60+ +mi);render()};
  }
  document.querySelectorAll('.row').forEach(r=>r.onclick=()=>edit(+r.dataset.i));
  document.querySelectorAll('[data-m]').forEach(b=>b.onclick=e=>{e.stopPropagation();move(+b.closest('.row').dataset.i,+b.dataset.m)});
  $('#ad').onclick=()=>edit(-1);$('#go').onclick=begin;
  if($('#rl'))$('#rl').onclick=async()=>{if(!confirm('Se volverá a descargar la guía y se perderán tus cambios de esta semana.'))return;try{const k=cur.issue;weeks=weeks.filter(x=>x.issue!==k);save();await download(k);cur=find();render()}catch(e){alert(e.message+'\nUsa Importar con el EPUB.');weeks=LS('mt_weeks',[])}}}
/* Las partes agregadas (k==='extra') toman la sección de la parte de arriba, o la de abajo si van primeras. */
function fixSec(){const s=cur.segs,f=s.find(x=>x.k!=='extra');let prev=null;for(const x of s){if(x.k==='extra')x.sec=prev||(f?f.sec:x.sec);prev=x.sec}}
function move(i,d){const j=i+d,s=cur.segs;if(j<0||j>=s.length)return;[s[i],s[j]]=[s[j],s[i]];cur.upd=Date.now();fixSec();save();render()}
function edit(i){
  const s=i<0?{t:'',s:300,k:'extra',sec:'EXTRA'}:cur.segs[i],t=prompt('Título (vacío = eliminar)',s.t);if(t===null)return;
  if(!t.trim()&&i>=0){cur.segs.splice(i,1)}else{const m=prompt('Duración en minutos (admite 1.5)',s.s/60);if(m===null)return;s.t=t.trim();s.s=Math.round(parseFloat(m.replace(',','.'))*60)||0;if(i<0){const L=cur.segs[cur.segs.length-1],aux=/^(presentaci|comentario)/i.test(s.t);if(L&&L.k!=='comment'&&!aux&&cur.origin!=='event')cur.segs.push({k:'extra',sec:'EXTRA',t:'Presentación',s:20});cur.segs.push(s)}}
  cur.upd=Date.now();fixSec();save();render()}
/* ---------- cronómetro ---------- */
const el=()=>(A.end||A.pa||Date.now())-A.t0-A.pt;
const persist=()=>SV('mt_act',A);
function begin(){A={plan:cur.segs.map(s=>({t:s.t,s:s.s,sec:s.sec})),label:cur.label+' · '+cur.book,t0:Date.now(),pt:0,pa:null,end:null,i:0,cs:0,laps:[],tg:cur.target||TARGET};persist();live()}
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
function fin(){A.end=A.pa||Date.now();clearInterval(tick);lock?.release?.();const h=LS('mt_hist',[]);const r={id:Date.now(),label:A.label,t0:A.t0,total:A.end-A.t0-A.pt,target:A.tg||TARGET,laps:A.laps};h.unshift(r);SV('mt_hist',h);localStorage.removeItem('mt_act');A=null;summary(r,true)}
function summary(r,fresh){show('sum');const TG=(r.target||TARGET)*1000,d=r.total-TG;let o='<div class="w"><b>'+esc(r.label)+'</b><div class="mu">'+new Date(r.t0).toLocaleString('es')+'</div><div class="big" style="text-align:left">'+fc(r.total)+'</div><div style="color:'+(d>0?'#d32f2f':'#2e9e4f')+'">Objetivo '+fc(TG)+' · '+(d>=0?'+':'-')+fc(Math.abs(d))+'</div></div>';
  r.laps.forEach(l=>{const a=l.b-l.a,x=a-l.p*1000;o+='<div class="row"><div class="t">'+esc(l.t)+'<div class="mu">Plan '+fc(l.p*1000)+'</div></div><div class="r">'+fc(a)+'<div style="font-size:12px;color:'+(x>0?'#d32f2f':'#2e9e4f')+'">'+(x>=0?'+':'-')+fc(Math.abs(x))+'</div></div></div>'});
  $('#sb2').innerHTML=o;$('#sb').onclick=()=>fresh?(show('plan'),render()):hist()}
function hist(){show('his');const h=LS('mt_hist',[]);$('#hl').innerHTML=h.length?h.map((r,i)=>'<div class="row" data-i="'+i+'"><div class="t">'+esc(r.label)+'<div class="mu">'+new Date(r.t0).toLocaleDateString('es')+'</div></div><div class="r">'+fc(r.total)+'</div><button data-d="'+i+'">🗑</button></div>').join(''):'<div class="w mu">Aún no hay reuniones cronometradas.</div>';
  document.querySelectorAll('#hl .row').forEach(r=>r.onclick=e=>{const i=+r.dataset.i;if(e.target.dataset.d!==undefined){if(confirm('¿Eliminar esta reunión del historial?')){h.splice(i,1);SV('mt_hist',h);hist()}return}summary(h[i],false)})}
$('#fl').removeAttribute('accept');
{const b=document.createElement('button');b.textContent='⚙';b.title='Descarga automática';b.onclick=()=>{const v=prompt('URL de tu Worker de descarga (vacío = desactivar)',LS('mt_proxy',DEFAULT_PROXY));if(v!==null){SV('mt_proxy',v.trim());load()}};$('#plan header').append(b)}
$('#bh').onclick=hist;$('#hb').onclick=()=>{show('plan')};$('#bi').onclick=()=>$('#fl').click();
$('#fl').onchange=async e=>{const f=e.target.files[0];if(!f)return;const m=f.name.match(/(\d{6})/);const is=m?m[1]:prompt('Número de la guía (AAAAMM, p. ej. 202611)');if(!is)return;try{await addIssue(await f.arrayBuffer(),is);alert('Guía importada');load()}catch(x){alert('No se pudo importar: '+x.message)}e.target.value=''};
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
let hid=0;
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){hid=Date.now();return}
  if(A){live();return}
  if(hid&&Date.now()-hid>300000&&cur&&!$('#plan').classList.contains('hide')){const n=find();if(n&&n.start!==cur.start){cur=n;render()}}
});
/* ---------- Eventos especiales (asambleas) ---------- */
let SQLP=null;const sqlj=()=>SQLP||(SQLP=initSqlJs({locateFile:f=>f}));
const rnd=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
const svy=d=>d.getMonth()>=8?d.getFullYear()+1:d.getFullYear(),yy=y=>String(y%100).padStart(2,'0');
const ETYPES=[['Asamblea de circuito (con representante de la sucursal)',d=>'CA-brpgm'+yy(svy(d))],['Asamblea de circuito (con superintendente de circuito)',d=>'CA-copgm'+yy(svy(d))],['Asamblea regional',d=>'CO-pgm'+yy(d.getFullYear())]];
function saveEvent(ev,first){const days=[];ev.sessions.forEach(s=>{if(!days.includes(s.day))days.push(s.day)});const now=Date.now();
  ev.sessions.forEach(s=>{const d=new Date(first.getFullYear(),first.getMonth(),first.getDate()+days.indexOf(s.day)),st=new Date(d.getFullYear(),d.getMonth(),d.getDate(),Math.floor(s.start/60),s.start%60).getTime(),label=s.day?s.day+' · '+s.name:s.name;
    const old=weeks.findIndex(w=>w.issue===ev.symbol&&w.start===st),segs=s.items.map(i=>({k:i.kind,sec:label,t:i.t,s:i.d,det:i.detail}));
    const w={issue:ev.symbol,label,book:ev.title,start:st,end:new Date(d.getFullYear(),d.getMonth(),d.getDate(),23,59,59).getTime(),origin:'event',target:segs.reduce((a,x)=>a+x.s,0),uuid:old>=0&&weeks[old].uuid||rnd(),upd:now,segs};
    if(old>=0)weeks[old]=w;else weeks.push(w)});
  save();return ev.sessions.length}
function evList(){show('evw');const ev=weeks.filter(w=>w.origin==='event').sort((a,b)=>a.start-b.start),g={};ev.forEach(w=>(g[w.issue]=g[w.issue]||[]).push(w));
  $('#el').innerHTML=ev.length?Object.entries(g).map(([k,a])=>'<div class="ban" style="background:var(--ln);color:var(--fg);display:flex;align-items:center"><span style="flex:1">'+esc(a[0].book)+'<div class="mu" style="font-weight:400">'+esc(k)+'</div></span><button data-x="'+esc(k)+'">🗑</button></div>'+a.map(w=>'<div class="row" data-s="'+weeks.indexOf(w)+'"><div class="t">'+esc(w.label)+'<div class="mu">'+new Date(w.start).toLocaleDateString('es')+' · inicia '+hmp(w.start)+'</div></div><div class="r">'+Math.round(tot(w.segs)/60)+' min</div></div>').join('')).join(''):'<div class="w mu">Aún no hay eventos. Toca Nuevo para descargar el programa de una asamblea.</div>';
  document.querySelectorAll('#el .row').forEach(r=>r.onclick=()=>{cur=weeks[+r.dataset.s];render()});
  document.querySelectorAll('#el [data-x]').forEach(b=>b.onclick=()=>{const k=b.dataset.x;if(confirm('Se eliminarán las sesiones de '+k+' (el historial no se borra).')){weeks=weeks.filter(w=>!(w.origin==='event'&&w.issue===k));save();evList()}})}
function evNew(){show('evn');let ed=false;
  $('#ef').innerHTML='<label>Tipo de evento<br><select id="et" style="width:100%;font:inherit;padding:8px;border-radius:10px;background:var(--ln);color:var(--fg);border:1px solid var(--ln)">'+ETYPES.map((t,i)=>'<option value="'+i+'">'+esc(t[0])+'</option>').join('')+'</select></label><p><label>Primer día<br><input type="date" id="ed" value="'+ymd(Date.now())+'"></label></p><p><label>Símbolo del programa en jw.org<br><input id="es" style="width:100%"></label><span class="mu">Se calcula solo; corrígelo si no coincide.</span></p><p><button class="pr" id="evd">Descargar</button> <button id="evf">Elegir archivo JWPUB</button></p><p class="mu" id="est"></p>';
  const dt=()=>new Date($('#ed').value+'T12:00:00'),auto=()=>{if(!ed)$('#es').value=ETYPES[+$('#et').value][1](dt())};
  $('#et').onchange=auto;$('#ed').onchange=auto;$('#es').oninput=()=>{ed=true};auto();
  const go=async f=>{$('#est').textContent='Procesando…';try{const SQL=await sqlj();let buf;
      if(f)buf=await f.arrayBuffer();else{const px=LS('mt_proxy',DEFAULT_PROXY);if(!px)throw Error('No hay Worker configurado: descarga el JWPUB y usa "Elegir archivo JWPUB".');
        const r=await fetch(px+(px.includes('?')?'&':'?')+'pub='+encodeURIComponent($('#es').value.trim())+'&format=JWPUB');if(!r.ok)throw Error('Programa no disponible ('+r.status+'). Usa "Elegir archivo JWPUB".');buf=await r.arrayBuffer()}
      const ev=parseEvent(await readJwpub(buf,SQL));if(!ev.sessions.length)throw Error('No se encontraron sesiones en el programa');
      const n=saveEvent(ev,dt());alert('Evento importado: '+n+' sesiones');evList()}catch(e){$('#est').textContent='Error: '+e.message}};
  $('#evd').onclick=()=>go(null);$('#evf').onclick=()=>$('#fj').click();$('#fj').onchange=e=>{const f=e.target.files[0];e.target.value='';if(f)go(f)};$('#enb').onclick=evList}
/* ---------- Respaldo (mismo formato JSON que la app de Android/Windows) ---------- */
const wuuid=w=>w.uuid||('w_'+w.issue+'_'+ymd(w.start).replace(/-/g,''));
function backupJson(){return{format:'meeting_timer_backup',version:1,exportedAt:new Date().toISOString(),settings:{startMinutes:startMin(),updatedAt:LS('mt_su',0)},
  weeks:weeks.map(w=>({uuid:wuuid(w),updatedAt:w.upd||0,issueCode:w.issue,dateLabel:w.label,weekStart:w.start,weekEnd:w.end,bibleReading:w.book,origin:w.origin||'epub',targetSec:w.target||TARGET,segments:w.segs.map((s,i)=>({orderIndex:i,section:s.sec,title:s.t,detail:s.det||'',plannedSec:s.s,kind:s.k,isCustom:s.k==='extra'}))})),
  sessions:LS('mt_hist',[]).map(r=>({uuid:r.uuid||String(r.id),updatedAt:r.t0,weekLabel:r.label,startedAt:r.t0,endedAt:r.t0+r.total,totalMs:r.total,targetSec:r.target||TARGET,notes:'',laps:r.laps.map((l,i)=>({orderIndex:i,segmentId:null,title:l.t,section:'',plannedSec:l.p,startMs:l.a,endMs:l.b}))}))}}
function restoreJson(j){
  weeks=(j.weeks||[]).map(w=>({issue:w.issueCode,label:w.dateLabel,book:w.bibleReading,start:w.weekStart,end:w.weekEnd,origin:w.origin==='epub'?undefined:w.origin,target:w.targetSec,uuid:w.uuid,upd:w.updatedAt,segs:(w.segments||[]).slice().sort((a,b)=>a.orderIndex-b.orderIndex).map(s=>({k:s.isCustom?'extra':s.kind,sec:s.section,t:s.title,s:s.plannedSec,det:s.detail}))}));
  SV('mt_hist',(j.sessions||[]).map(r=>({id:r.startedAt,uuid:r.uuid,label:r.weekLabel,t0:r.startedAt,total:r.totalMs,target:r.targetSec,laps:(r.laps||[]).slice().sort((a,b)=>a.orderIndex-b.orderIndex).map((l,i)=>({i,t:l.title,p:l.plannedSec,a:l.startMs,b:l.endMs}))})).sort((a,b)=>b.t0-a.t0));
  if(j.settings){SV('mt_start',j.settings.startMinutes);SV('mt_su',j.settings.updatedAt||0)}save()}
async function saveFile(name,text){const f=new File([text],name,{type:'application/json'});
  try{if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f]});return}}catch(e){if(e.name==='AbortError')return}
  const a=document.createElement('a');a.href=URL.createObjectURL(f);a.download=name;document.body.append(a);a.click();a.remove()}
function bkView(){show('bk');$('#bkb').innerHTML='<div class="w"><b>Respaldo local</b><p class="mu">Un archivo JSON con tu historial, semanas editadas y ajustes, en el mismo formato que la app de Android/Windows. <b>Restaurar reemplaza todo</b> lo que hay en esta app.</p><button class="pr" id="bkx">Exportar</button> <button id="bkr">Restaurar</button></div>';
  $('#bkx').onclick=()=>saveFile('respaldo_reuniones_'+ymd(Date.now()).replace(/-/g,'')+'.json',JSON.stringify(backupJson(),null,1));$('#bkr').onclick=()=>$('#fr').click()}
$('#fr').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
  try{const j=JSON.parse(await f.text());if(!j||j.format!=='meeting_timer_backup')throw Error('El archivo no es un respaldo de esta app');
    if(!confirm('Se REEMPLAZARÁ todo lo que hay en esta app por el respaldo ('+(j.weeks||[]).length+' semanas y '+(j.sessions||[]).length+' reuniones). ¿Continuar?'))return;
    restoreJson(j);cur=null;alert('Restaurado');show('plan');await load()}catch(x){alert('No se pudo restaurar: '+x.message)}};
$('#be').onclick=evList;$('#bk0').onclick=bkView;$('#eb0').onclick=()=>show('plan');$('#en').onclick=evNew;$('#bkk').onclick=()=>show('plan');
A=LS('mt_act',null);if(A)live();else load();
