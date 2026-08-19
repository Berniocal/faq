
function copy(item){return state.lang==='sk'?item.sk:item.cs;}
function typeLabel(type){return type==='question'?'Otázka':'Neotázka';}
function reasonLabel(result){
  const sk=state.lang==='sk';
  const labels={
    'exact-title':sk?'Presná zhoda v názve':'Přesná shoda v názvu',
    'exact-any':sk?'Presná zhoda v texte':'Přesná shoda v textu',
    'same-meaning':sk?'Rovnaký význam / synonymum':'Stejný význam / synonymum',
    'direct':sk?'Priama vecná zhoda':'Přímá věcná shoda',
    'semantic':sk?'Príbuzné téma':'Příbuzné téma',
    'weak-direct':sk?'Slabšia priama zhoda':'Slabší přímá shoda',
    'distant-semantic':sk?'Vzdialenejšia súvislosť':'Vzdálenější souvislost'
  };
  return labels[result.reason]||'';
}
function scorePercent(r){
  const cap=r.reason==='semantic'?.69:r.reason==='distant-semantic'?.49:1;
  return Math.max(1,Math.round(Math.min(cap,r.score)*100));
}
function directUrl(item){
  const kind=item.type==='question'?'question':'nonquestion';
  return `https://bernio.cz/vedator/#${kind}=${item.episode}:${item.order}`;
}

function render(){
  const results=$('#results'),more=$('#more');
  if(!state.query.trim()){
    results.innerHTML=`<div class="empty">${state.lang==='sk'
      ?'<strong>Zadaj dotaz a potvrď ho.</strong><br>Hľadanie sa spustí až po Enteri alebo tlačidle Hľadať.'
      :'<strong>Zadej dotaz a potvrď ho.</strong><br>Vyhledávání se spustí až po Enteru nebo tlačítku Hledat.'}</div>`;
    $('#count').textContent='';more.classList.add('hidden');return;
  }
  const visible=state.ranked.slice(0,state.visible);
  if(!visible.length){
    results.innerHTML=`<div class="empty">${state.lang==='sk'?'Nenašiel som použiteľnú zhodu.':'Nenašel jsem použitelnou shodu.'}</div>`;
    $('#count').textContent='0';more.classList.add('hidden');return;
  }
  results.innerHTML=visible.map(result=>{
    const item=result.entry.item,c=copy(item),points=c.points||[];
    const directTags=result.matchedDirect.slice(0,4);
    const semanticTags=[...new Set(result.semantic.matches)].slice(0,3);
    return `<article class="card" data-id="${esc(item.id)}">
      <div class="result-head">
        <div class="meta"><span class="type-badge">${esc(typeLabel(item.type))}</span> · ${state.lang==='sk'?'Diel':'Díl'} ${item.episode}${item.time?' · '+esc(item.time):''}</div>
        <span class="score">${scorePercent(result)} %</span>
      </div>
      <h2>${esc(c.title||'(bez názvu)')}</h2>
      ${points.length?`<div class="answer collapsed"><ul>${points.map(p=>`<li>${esc(p)}</li>`).join('')}</ul></div>`:''}
      <div class="tags">
        <span class="tag ${result.tier>=4?'semantic':'direct'}">${esc(reasonLabel(result))}</span>
        ${directTags.map(x=>`<span class="tag direct">${esc(x)}</span>`).join('')}
        ${semanticTags.map(x=>`<span class="tag semantic">${esc(x)}</span>`).join('')}
      </div>
      <div class="actions">
        <button type="button" class="play" data-play="${esc(item.id)}">▶ ${state.lang==='sk'?'Prehrať':'Přehrát'}</button>
        ${points.length?`<button type="button" class="secondary more-answer">${state.lang==='sk'?'Čítať viac':'Číst více'}</button>`:''}
        <a class="secondary" href="${esc(directUrl(item))}" target="_blank" rel="noopener">${state.lang==='sk'?'Otvoriť vo Vedatore':'Otevřít ve Vedatoru'} ↗</a>
      </div>
    </article>`;
  }).join('');
  $('#count').textContent=state.lang==='sk'?`${state.ranked.length} výsledkov`:`${state.ranked.length} výsledků`;
  more.classList.toggle('hidden',state.visible>=state.ranked.length);
  bindCards();
}

function doSearch(){
  const value=$('#search').value.trim();
  if(!state.ready){
    $('#status').textContent=state.lang==='sk'?'Dáta sa ešte pripravujú…':'Data se ještě připravují…';
    return;
  }
  state.query=value;state.visible=30;
  const started=performance.now();
  state.ranked=rank(value);
  render();
  if(value){
    const ms=Math.round(performance.now()-started);
    $('#status').textContent=state.lang==='sk'?`Hľadanie hotové · ${ms} ms`:`Hledání hotové · ${ms} ms`;
  }
}

function bindCards(){
  $$('.play').forEach(b=>b.addEventListener('click',()=>playItem(b.dataset.play)));
  $$('.more-answer').forEach(b=>b.addEventListener('click',()=>{
    const answer=b.closest('.card')?.querySelector('.answer');if(!answer)return;
    const collapsed=answer.classList.toggle('collapsed');
    b.textContent=collapsed?(state.lang==='sk'?'Čítať viac':'Číst více'):(state.lang==='sk'?'Čítať menej':'Číst méně');
  }));
}

async function loadData(){
  let lastError;
  for(const url of DATA_URLS){
    try{
      const r=await fetch(url,{cache:'default'});
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const data=await r.json();
      if(!Array.isArray(data.episodes)||!Array.isArray(data.questions))throw new Error('Neplatný datový balík');
      return data;
    }catch(e){lastError=e;}
  }
  throw lastError||new Error('Data se nepodařilo načíst');
}

async function start(){
  applyLanguage();render();
  // UI se vykreslí dřív, než začne zpracování velkého JSONu.
  await new Promise(resolve=>requestAnimationFrame(()=>resolve()));
  try{
    const started=performance.now();
    state.data=await loadData();
    state.episodeMap=new Map((state.data.episodes||[]).map(e=>[Number(e.number),e]));
    state.items=flattenData(state.data);
    state.index=buildIndex(state.items);
    state.ready=true;
    const nonq=state.items.filter(i=>i.type==='nonquestion').length;
    const ms=Math.round(performance.now()-started);
    $('#status').textContent=state.lang==='sk'
      ?`Pripravené: ${state.data.questions.length} otázok + ${nonq} neotázok · ${ms} ms`
      :`Připraveno: ${state.data.questions.length} otázek + ${nonq} neotázek · ${ms} ms`;
  }catch(error){
    $('#status').textContent=(state.lang==='sk'?'Dáta sa nepodarilo načítať: ':'Data se nepodařilo načíst: ')+error.message;
    $('#status').classList.add('status-error');
  }
}

function applyLanguage(){
  document.documentElement.lang=state.lang==='sk'?'sk':'cs';
  $$('.language button').forEach(b=>b.classList.toggle('active',b.dataset.lang===state.lang));
  $('#heading').textContent=state.lang==='sk'?'Vedátorský podcast – inteligentné hľadanie':'Vedátorský podcast – chytré hledání';
  $('#search').placeholder=state.lang==='sk'?'Zadaj pojem alebo otázku a potvrď Enterom…':'Zadej pojem nebo otázku a potvrď Enterem…';
  $('#searchButton').textContent=state.lang==='sk'?'Hľadať':'Hledat';
  $('#clear').setAttribute('aria-label',state.lang==='sk'?'Vymazať hľadanie':'Smazat vyhledávání');
  const labels=state.lang==='sk'?['Všetko','Otázky','Neotázky']:['Vše','Otázky','Neotázky'];
  $$('.tab').forEach((b,i)=>b.textContent=labels[i]);
  $('#more').textContent=state.lang==='sk'?'Zobraziť ďalšie':'Zobrazit další';
  if(state.query)render();
}
function setLanguage(lang){
  state.lang=lang==='sk'?'sk':'cz';
  try{localStorage.setItem('vedator-ui-language-v1',state.lang);}catch{}
  applyLanguage();
}

function fmtTime(value){
  const n=Math.max(0,Math.floor(Number(value)||0)),h=Math.floor(n/3600),m=Math.floor(n%3600/60),s=n%60;
  return h?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${m}:${String(s).padStart(2,'0')}`;
}
function playItem(id){
  const item=state.items.find(x=>x.id===id);if(!item)return;
  const episode=state.episodeMap.get(Number(item.episode));if(!episode?.enclosure)return;
  const audio=$('#audio'),c=copy(item);state.currentItem=item;
  $('#playerTitle').textContent=c.title||`Díl ${item.episode}`;
  $('#playerSub').textContent=`${state.lang==='sk'?'Diel':'Díl'} ${item.episode}${item.time?' · '+item.time:''}`;
  $('#player').classList.remove('hidden');
  const src=episode.enclosure,seekTo=Math.max(0,Number(item.seconds)||0);
  if(audio.src!==src){
    audio.src=src;audio.load();
    const once=()=>{try{audio.currentTime=seekTo;}catch{} audio.play().catch(()=>{});audio.removeEventListener('loadedmetadata',once);};
    audio.addEventListener('loadedmetadata',once);
  }else{try{audio.currentTime=seekTo;}catch{} audio.play().catch(()=>{});}
}

const audio=$('#audio');
audio.addEventListener('play',()=>$('#playPause').textContent='Pauza');
audio.addEventListener('pause',()=>$('#playPause').textContent=state.lang==='sk'?'Prehrať':'Přehrát');
audio.addEventListener('timeupdate',()=>{
  $('#current').textContent=fmtTime(audio.currentTime);
  $('#seek').max=String(Math.max(1,Math.floor(audio.duration)||1));
  $('#seek').value=String(Math.floor(audio.currentTime)||0);
});
audio.addEventListener('durationchange',()=>$('#duration').textContent=Number.isFinite(audio.duration)?fmtTime(audio.duration):'–:––');
$('#seek').addEventListener('input',()=>$('#current').textContent=fmtTime($('#seek').value));
$('#seek').addEventListener('change',()=>{try{audio.currentTime=Number($('#seek').value)||0;}catch{}});
$('#playPause').addEventListener('click',()=>{if(audio.paused)audio.play().catch(()=>{});else audio.pause();});
$('#back10').addEventListener('click',()=>{try{audio.currentTime=Math.max(0,audio.currentTime-10);}catch{}});
$('#forward10').addEventListener('click',()=>{try{audio.currentTime=Math.min(audio.duration||Infinity,audio.currentTime+10);}catch{}});
$('#closePlayer').addEventListener('click',()=>$('#player').classList.add('hidden'));

// Záměrně ŽÁDNÉ vyhledávání na input. Jen Enter / tlačítko / klik na návrh.
$('#search').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();doSearch();}});
$('#searchButton').addEventListener('click',doSearch);
$('#clear').addEventListener('click',()=>{
  $('#search').value='';state.query='';state.ranked=[];state.visible=30;render();$('#search').focus();
});
$$('.tab').forEach(b=>b.addEventListener('click',()=>{
  $$('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.filter=b.dataset.filter;
  if(state.query)doSearch();
}));
$$('.suggestion').forEach(b=>b.addEventListener('click',()=>{$('#search').value=b.textContent.trim();doSearch();}));
$$('.language button').forEach(b=>b.addEventListener('click',()=>setLanguage(b.dataset.lang)));
$('#more').addEventListener('click',()=>{state.visible+=30;render();});
$('#theme').addEventListener('click',()=>{
  const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;
  try{localStorage.setItem('vedator-ui-theme-v1',next);}catch{}
  $('#theme').textContent=next==='dark'?'☀':'☾';
});
$('#theme').textContent=document.documentElement.dataset.theme==='dark'?'☀':'☾';

start();
