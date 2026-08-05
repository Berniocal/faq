function keywordWeight(t){const idf=Math.log((corpusSize+1)/((df.get(t)||0)+1))+1;return idf*(1+Math.min(8,t.length)/16)}
function vector(terms){const v=new Map();let sum=0;for(const t of terms){const w=Math.log((corpusSize+1)/((df.get(t)||0)+1))+1;v.set(t,w);sum+=w*w}const mag=Math.sqrt(sum)||1;for(const [k,w] of v)v.set(k,w/mag);return v}
function cosineMap(a,b){let s=0;const [small,large]=a.size<b.size?[a,b]:[b,a];for(const [k,v] of small)if(large.has(k))s+=v*large.get(k);return s}
function weightedJaccard(a,b){let inter=0,uni=0;const all=new Set([...a,...b]);for(const t of all){const w=Math.log((corpusSize+1)/((df.get(t)||0)+1))+1;uni+=w;if(a.has(t)&&b.has(t))inter+=w}return uni?inter/uni:0}
function numberBoost(a,b){const na=new Set(norm(a).match(/\b\d+(?:\.\d+)?\b/g)||[]),nb=new Set(norm(b).match(/\b\d+(?:\.\d+)?\b/g)||[]);if(!na.size||!nb.size)return 0;for(const x of na)if(nb.has(x))return .08;return-.03}
function rank(query){const qt=termSet(query),qv=vector(qt),qg=ngrams(query);return questions.map(q=>{const cos=cosineMap(qv,q.vector),jac=weightedJaccard(qt,q.terms),chr=dice(qg,q.chargrams),boost=numberBoost(query,`${q.question_cs} ${q.question_sk}`);const exact=norm(`${q.question_cs} ${q.question_sk}`).includes(norm(query))||norm(query).includes(norm(q.question_cs))?.1:0;const score=Math.max(0,Math.min(1,.56*cos+.22*jac+.22*chr+boost+exact));const matched=[...qt].filter(t=>q.terms.has(t)).sort((a,b)=>keywordWeight(b)-keywordWeight(a)).slice(0,8);return{q,score,matched}}).sort((a,b)=>b.score-a.score).slice(0,5)}
function toSec(t){const p=String(t||'').split(':').map(Number);return p.length===3?p[0]*3600+p[1]*60+p[2]:p.length===2?p[0]*60+p[1]:0}
function directQuestionUrl(q){const seconds=Math.max(0,Math.floor(Number(q?.link_seconds)));const key=`${Number(q?.episode)||0}-matcher@${seconds}`;return `${PUBLIC_BASE}#question=${encodeURIComponent(key)}`}
function compactRows(){return questions.map(q=>({episode:q.episode,order:q.order,time:q.time,link_seconds:q.link_seconds,title:q.title,question_cs:q.question_cs,question_sk:q.question_sk,source:q.source||'vložená databáze'}))}
function storeCache(){try{localStorage.setItem(CACHE_KEY,JSON.stringify({version:5,count:questions.length,saved_at:new Date().toISOString(),rows:compactRows()}))}catch(error){console.warn('Databázi se nepodařilo uložit do prohlížeče.',error)}}
function readCache(){try{const parsed=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');return parsed&&Array.isArray(parsed.rows)&&parsed.rows.length?parsed:null}catch(_){return null}}
function clearCache(){try{localStorage.removeItem(CACHE_KEY)}catch(_){}}
function useStoredRows(rows,source){questions=buildIndex(rows.map(row=>({...row})));finishLoad(source)}
function utf8Base64(value){const bytes=new TextEncoder().encode(value);let binary='';const size=0x8000;for(let i=0;i<bytes.length;i+=size)binary+=String.fromCharCode(...bytes.subarray(i,i+size));return btoa(binary)}
function offlineHtml(){
  const clone=document.documentElement.cloneNode(true);
  clone.querySelector('#tbody').innerHTML='<tr><td colspan="7" class="muted">Připravuji vloženou databázi…</td></tr>';
  clone.querySelector('#results').innerHTML='<div class="muted">Napište novou otázku a spusťte hledání.</div>';
  clone.querySelector('#query').textContent='';clone.querySelector('#filter').setAttribute('value','');
  const statusTitle=clone.querySelector('#statusTitle'),statusText=clone.querySelector('#statusText'),dot=clone.querySelector('#statusDot');
  statusTitle.textContent='Připravuji vloženou databázi…';statusTitle.removeAttribute('class');statusText.textContent='Všechna data jsou uložena přímo v tomto souboru.';dot.setAttribute('class','dot');
  clone.querySelector('#progressBar').setAttribute('style','width:0');
  for(const id of ['searchBtn','demoBtn','csvBtn','jsonBtn','offlineBtn','filter'])clone.querySelector('#'+id)?.setAttribute('disabled','');
  const encoded=utf8Base64(JSON.stringify(compactRows()));
  let source='<!doctype html>\n'+clone.outerHTML;
  const replacement=`const EMBEDDED_DATA=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob('${encoded}'),c=>c.charCodeAt(0))));`;
  source=source.replace('const EMBEDDED_DATA=null;',replacement);
  return source;
}
