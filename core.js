const MON={enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,setiembre:9,octubre:10,noviembre:11,diciembre:12};
const SONG=300,COM=60,PRES=20,TARGET=6300;
const issueFor=d=>{const m=d.getMonth()+1;return ''+d.getFullYear()+String(m%2?m:m-1).padStart(2,'0')};
const prevIssue=c=>{let y=+c.slice(0,4),m=+c.slice(4)-2;if(m<1){m+=12;y--}return ''+y+String(m).padStart(2,'0')};
function rangeOf(raw,issue){
  const s=raw.toLowerCase().replace(/\s+/g,' ').trim(),iy=+issue.slice(0,4),im=+issue.slice(4);
  let a=s.match(/^(\d{1,2})\s*-\s*(\d{1,2}) de ([a-záéíóúñ]+)$/),d1,m1,d2,m2;
  if(a){d1=+a[1];d2=+a[2];m1=m2=MON[a[3]]}
  else{a=s.match(/^(\d{1,2}) de ([a-záéíóúñ]+) a (\d{1,2}) de ([a-záéíóúñ]+)$/);if(!a)return null;d1=+a[1];m1=MON[a[2]];d2=+a[3];m2=MON[a[4]]}
  if(!m1||!m2)return null;
  const sy=m1-im>6?iy-1:iy,ey=m2<m1?sy+1:sy;
  return{start:new Date(sy,m1-1,d1).getTime(),end:new Date(ey,m2-1,d2,23,59,59).getTime()};
}
const clean=s=>s.replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
function parseWeek(doc,issue){
  const h1=doc.querySelector('header h1'),body=doc.querySelector('.bodyTxt');if(!h1||!body)return null;
  const label=clean(h1.textContent),r=rangeOf(label,issue);if(!r)return null;
  const h2=doc.querySelector('header h2'),book=h2?clean(h2.textContent):'';
  let sec='APERTURA',draft=null;const segs=[];
  const push=(k,s,t,m)=>segs.push({k,sec:s,t,s:m});
  const flush=()=>{if(draft){push('part',draft.sec,draft.t,draft.m||0);draft=null}};
  const song=t=>{const m=t.match(/Canci[oó]n\s+(\d+)/);return m?m[1]:''};
  const mins=t=>{const m=t.match(/\(\s*(\d+)\s*mins?\.\s*\)/);return m?+m[1]*60:null};
  for(const el of body.querySelectorAll('h2, h3, p, li')){
    const tag=el.localName,t=clean(el.textContent);if(!t)continue;
    if(tag==='h2'){flush();sec=t;continue}
    if(tag==='h3'){flush();
      if(t.includes('Palabras de introducción')){push('song','APERTURA',('Canción '+song(t)+' y oración').replace('  ',' '),SONG);push('intro','APERTURA','Palabras de introducción',mins(t)??60)}
      else if(t.includes('Palabras de conclusión')){push('closing','CONCLUSIÓN','Palabras de conclusión',mins(t)??180);push('song','CONCLUSIÓN',('Canción '+song(t)+' y oración').replace('  ',' '),SONG)}
      else if(/Canci[oó]n\s+\d+/.test(t))push('song',sec,'Canción '+song(t),SONG);
      else{const n=t.match(/^(\d+)\.\s*(.+)$/);if(n)draft={sec,t:n[1]+'. '+n[2].trim(),m:null}}
      continue}
    if(draft&&draft.m==null){const m=t.match(/^\(\s*(\d+)\s*mins?\.\s*\)/);if(m)draft.m=+m[1]*60}
  }
  flush();
  const out=[];
  for(const s of segs){out.push(s);
    if(s.k==='part'&&(s.t.includes('Lectura de la Biblia')||s.sec.toUpperCase().includes('MAESTROS')))out.push({k:'comment',sec:s.sec,t:'Comentario',s:COM})}
  /* Presentación (20 s) antes de cada parte salvo: 1ª canción, introducción, conclusión, punto 1, última canción, comentarios y partes con comentario antes.
     Esos segundos se restan por igual de los cánticos. */
  const fs=out.findIndex(x=>x.k==='song'),ls=out.map(x=>x.k).lastIndexOf('song'),o2=[];let tp=0;
  out.forEach((s,i)=>{const p=out[i-1];
    if(!(i===fs||i===ls||s.k==='intro'||s.k==='closing'||s.k==='comment'||/^1\.\s/.test(s.t)||(p&&p.k==='comment'))){o2.push({k:'presentation',sec:s.sec,t:'Presentación',s:PRES});tp+=PRES}
    o2.push(s)});
  const sg=o2.filter(x=>x.k==='song');
  if(sg.length&&tp){const b=Math.floor(tp/sg.length),r2=tp%sg.length;sg.forEach((x,j)=>{x.s-=b+(j<r2?1:0)})}
  return{issue,label,book,start:r.start,end:r.end,segs:o2};
}
async function readEpub(buf,issue){
  const z=await JSZip.loadAsync(buf),weeks=[];
  for(const n of Object.keys(z.files).filter(n=>/(^|\/)\d+\.xhtml$/.test(n)).sort()){
    const w=parseWeek(new DOMParser().parseFromString(await z.files[n].async('string'),'text/html'),issue);if(w)weeks.push(w)}
  return weeks;
}
const fc=ms=>{const n=ms<0,s=Math.floor(Math.abs(ms)/1000),h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=String(s%60).padStart(2,'0');return(n?'-':'')+(h?h+':'+String(m).padStart(2,'0'):String(m).padStart(2,'0'))+':'+x};
const hm=d=>{d=new Date(d);return String(d.getHours()%12||12).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')};
const col=s=>{s=s.toLowerCase();return s.includes('tesoros')?['#3c7f8b','💎']:s.includes('maestros')?['#d68f00','🌾']:s.includes('vida cristiana')?['#bf2f13','🐑']:null};

/* ---------- Eventos especiales (JWPUB de asambleas) ---------- */
const XORK='11cbb5587e32846d4c26790c633da289f66fe5842a3a585ce1bc3a294af5ada7';
const inflateZ=async u8=>new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
/* JWPUB = ZIP con "contents" (ZIP con una base SQLite). Cada documento va en zlib + AES-128-CBC; clave derivada de idioma_símbolo_año. */
async function readJwpub(buf,SQL){
  const outer=await JSZip.loadAsync(buf),cf=outer.file('contents');if(!cf)throw Error('El archivo no es un JWPUB válido');
  const inner=await JSZip.loadAsync(await cf.async('uint8array')),dn=Object.keys(inner.files).find(n=>n.toLowerCase().endsWith('.db'));if(!dn)throw Error('El JWPUB no trae base de datos');
  const db=new SQL.Database(await inner.file(dn).async('uint8array'));
  try{
    const[lang,symbol,year,issue,title]=db.exec('SELECT MepsLanguageIndex,Symbol,Year,IssueTagNumber,Title FROM Publication')[0].values[0];
    const card=lang+'_'+symbol+'_'+year+(+issue?'_'+issue:'');
    const h=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(card))),x=Uint8Array.from(XORK.match(/../g),(b,i)=>parseInt(b,16)^h[i]);
    const key=await crypto.subtle.importKey('raw',x.slice(0,16),'AES-CBC',false,['decrypt']),docs=[];
    for(const[id,t,blob]of db.exec('SELECT DocumentId,Title,Content FROM Document ORDER BY DocumentId')[0].values){if(!blob)continue;
      const plain=new Uint8Array(await crypto.subtle.decrypt({name:'AES-CBC',iv:x.slice(16,32)},key,blob));
      docs.push({id,title:t||'',html:new TextDecoder().decode(await inflateZ(plain))})}
    return{symbol,year,title,docs}
  }catch(e){throw Error('No se pudo leer el JWPUB: '+e.message)}finally{db.close()}
}
const tidy=s=>s.replace(/\(\s+/g,'(').replace(/\s+\)/g,')');
/* El programa solo trae la hora de INICIO: duración = diferencia con la siguiente; la última de cada sesión usa `last`. Las series se reparten en partes iguales. */
function buildSession(day,name,raw,last){
  const pm=/tarde/i.test(name);raw.forEach(r=>{r.st=(r.h===12?12:pm?r.h+12:r.h)*60+r.m});const items=[];
  raw.forEach((r,i)=>{const nx=raw[i+1],dur=nx?(nx.st-r.st)*60:last;let t=r.rest,det=[];
    if(r.lines.length){if(t.endsWith(':')){t+=' '+r.lines[0];det=r.lines.slice(1)}else det=r.lines}
    t=tidy(t);if(!nx)det=[...det,'Duración estimada (el programa no trae hora de fin)'];
    if(r.subs.length){const n=r.subs.length,b=Math.floor(dur/n),rem=dur%n;let acc=0;r.subs.forEach((s2,j)=>{const d=b+(j<rem?1:0);items.push({st:r.st+Math.floor(acc/60),t:tidy(s2),d,kind:'part',detail:t});acc+=d})}
    else items.push({st:r.st,t,d:dur,kind:t.startsWith('Canción')?'song':'part',detail:det.join('\n')})});
  return{day,name,start:raw[0].st,items}
}
function parseEvent(c,last=300){
  const ds=c.docs.filter(d=>d.html.includes('<h2')),multi=ds.length>1,sessions=[];
  for(const d of ds){const day=multi?clean(d.title):'',doc=new DOMParser().parseFromString(d.html,'text/html');let name=null,raw=[];
    const flush=()=>{if(name!=null&&raw.length)sessions.push(buildSession(day,name,raw,last));raw=[]};
    for(const el of doc.querySelectorAll('h2, p')){const t=clean(el.textContent);if(!t)continue;
      if(el.localName==='h2'){flush();name=t;continue}
      if(name==null)continue;
      const m=t.match(/^(\d{1,2}):(\d{2})\s+(.+)$/);
      if(m)raw.push({h:+m[1],m:+m[2],rest:m[3],subs:[],lines:[]});
      else if(!raw.length)continue;
      else if(t[0]==='•'||t[0]==='·')raw[raw.length-1].subs.push(t.slice(1).trim());
      else raw[raw.length-1].lines.push(t)}
    flush()}
  return{symbol:c.symbol,title:c.title,sessions}
}
if(typeof module!=='undefined')module.exports={rangeOf,parseWeek,readEpub,issueFor,prevIssue,fc,hm,col,readJwpub,parseEvent};
