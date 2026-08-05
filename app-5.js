function renderResults(query){const list=rank(query);$('#results').innerHTML=list.map((r,i)=>`<article class="result"><div class="result-head"><div><div class="meta">${i+1}. místo · díl ${r.q.episode} · ${esc(r.q.time||'bez času')}</div><h3>${esc(r.q.question_cs||r.q.question_sk)}</h3>${r.q.question_sk&&r.q.question_sk!==r.q.question_cs?`<div class="muted small">${esc(r.q.question_sk)}</div>`:''}</div><span class="score">${(100*r.score).toFixed(1)} %</span></div><div class="chips">${r.matched.length?r.matched.map(x=>`<span class="chip">${esc(x)}</span>`).join(''):'<span class="muted small">Shoda vychází hlavně ze znakové podobnosti.</span>'}</div><div class="actions result-actions"><a class="question-link" href="${esc(directQuestionUrl(r.q))}" target="_blank" rel="noopener">Otevřít konkrétní otázku ↗</a></div></article>`).join('')}
function renderTable(list){$('#tbody').innerHTML=list.map(q=>`<tr><td class="num">${q.id}</td><td class="num">${q.episode}.${q.order}</td><td class="num">${esc(q.time)}</td><td>${esc(q.question_cs||q.title)}</td><td>${esc(q.question_sk)}</td><td>${q.keyword_list.map(x=>`<span class="chip">${esc(x)}</span>`).join(' ')}</td><td><a href="${esc(directQuestionUrl(q))}" target="_blank" rel="noopener">Otevřít ↗</a></td></tr>`).join('')||'<tr><td colspan="7">Nic nenalezeno.</td></tr>'}
function csvEscape(v){const s=String(v??'');return/[";\n\r]/.test(s)?`"${s.replace(/"/g,'""')}"`:s}
function exportRows(){return questions.map(q=>({id:q.id,episode:q.episode,order:q.order,time:q.time,link_seconds:q.link_seconds,direct_url:directQuestionUrl(q),question_cs:q.question_cs,question_sk:q.question_sk,question_original:q.title,normalized:q.normalized,keywords:q.keyword_list.join('|'),search_terms:q.search_terms.join('|'),source:q.source}))}
function download(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1200)}
$('#searchBtn').onclick=()=>{const q=$('#query').value.trim();if(!q){$('#results').innerHTML='<div class="warning">Nejprve napište novou otázku.</div>';return}renderResults(q)};
$('#query').addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')$('#searchBtn').click()});
$('#demoBtn').onclick=()=>{$('#query').value='Prečo svetlo nedokáže uniknúť z čiernej diery a ako s tým súvisí gravitácia?';$('#searchBtn').click()};
$('#filter').addEventListener('input',()=>{const q=norm($('#filter').value);const list=!q?questions:questions.filter(x=>norm(`${x.question_cs} ${x.question_sk} ${x.keyword_list.join(' ')} ${x.episode}`).includes(q));renderTable(list);$('#visibleCount').textContent=`${list.length} z ${questions.length}`});
$('#csvBtn').onclick=()=>{const rows=exportRows(),head=Object.keys(rows[0]||{}),csv='\ufeff'+head.join(';')+'\n'+rows.map(r=>head.map(k=>csvEscape(r[k])).join(';')).join('\n');download('vedator_databaze_otazek_klicova_slova.csv',csv,'text/csv;charset=utf-8')};
$('#jsonBtn').onclick=()=>download('vedator_databaze_otazek_klicova_slova.json',JSON.stringify({generated_at:new Date().toISOString(),repository:REPO,branch:BRANCH,count:questions.length,questions:exportRows()},null,2),'application/json;charset=utf-8');
$('#offlineBtn').onclick=()=>download('vedator_databaze_otazek_PLNE_OFFLINE.html',offlineHtml(),'text/html;charset=utf-8');
$('#refreshBtn').onclick=async()=>{if(!confirm('Stáhnout aktuální databázi z GitHubu a nahradit uloženou kopii?'))return;clearCache();questions=[];translations=new Map();$('#statusDot').className='dot';$('#statusTitle').className='';$('#statusTitle').textContent='Aktualizuji databázi…';$('#statusText').textContent='Čtu aktuální soubory repozitáře Berniocal/vedator.';$('#progressBar').style.width='0';for(const id of ['searchBtn','demoBtn','csvBtn','jsonBtn','offlineBtn','filter'])$('#'+id).disabled=true;await loadAll()};
if('serviceWorker' in navigator && /^https?:$/.test(location.protocol)){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(error=>console.warn('Offline cache aplikace se nepodařilo aktivovat.',error)));
}
async function start(){
  if(Array.isArray(EMBEDDED_DATA)&&EMBEDDED_DATA.length){useStoredRows(EMBEDDED_DATA,'embedded');return}
  const cached=readCache();
  if(cached?.rows?.length){useStoredRows(cached.rows,'cache');return}
  $('#statusTitle').textContent='První načtení databáze…';$('#statusText').textContent='Tentokrát se data stáhnou z GitHubu; potom už budou uložená pro okamžité spuštění.';
  await loadAll();
}
start();
