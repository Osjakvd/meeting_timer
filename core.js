const MON={enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,setiembre:9,octubre:10,noviembre:11,diciembre:12};
const SONG=300,COM=60,TARGET=6300;
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
  return{issue,label,book,start:r.start,end:r.end,segs:out};
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
if(typeof module!=='undefined')module.exports={rangeOf,parseWeek,readEpub,issueFor,prevIssue,fc,hm,col};
