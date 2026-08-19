async function start(){
  try{
    state.data=await loadData();
    state.episodeMap=new Map((state.data.episodes||[]).map(e=>[Number(e.number),e]));
    state.items=flattenData(state.data);
    state.index=buildIndex(state.items);
    buildDf(state.index);
    buildCorpusRelations(state.index);
    applyLanguage();
    const nonq=state.items.filter(i=>i.type==='nonquestion').length;
    $('#status').textContent=state.lang==='sk'
      ?`Načítané: ${state.data.questions.length} otázok + ${nonq} neotázok · naučených ${state.relationStats.conceptEdges} vzťahov pojmov a ${state.relationStats.itemEdges} väzieb medzi položkami`
      :`Načteno: ${state.data.questions.length} otázek + ${nonq} neotázek · naučeno ${state.relationStats.conceptEdges} vztahů pojmů a ${state.relationStats.itemEdges} vazeb mezi položkami`;
    render();
  }catch(error){
    $('#status').textContent=(state.lang==='sk'?'Dáta sa nepodarilo načítať: ':'Data se nepodařilo načíst: ')+error.message;
    $('#status').classList.add('status-error');
    $('#results').innerHTML=`<div class="empty">Pokud otevíráš soubor bez internetu, potřebuje datový balík <code>content-v2.json</code> vedle HTML. Online se ho pokusí stáhnout přímo z repozitáře Vedator.</div>`;
  }
}

function applyLanguage(){
  document.documentElement.lang=state.lang==='sk'?'sk':'cs';
  $$('.language button').forEach(b=>b.classList.toggle('active',b.dataset.lang===state.lang));
  $('#heading').textContent=state.lang==='sk'?'Vedátorský podcast – inteligentné hľadanie':'Vedátorský podcast – chytré hledání';
  $('#search').placeholder=state.lang==='sk'
    ?'Zadaj pojem alebo otázku – napríklad fotón, čierna diera…'
    :'Zadej pojem nebo otázku – třeba foton, černá díra…';
  $('#searchButton').textContent=state.lang==='sk'?'Hľadať':'Hledat';
  $('#clear').setAttribute('aria-label',state.lang==='sk'?'Vymazať hľadanie':'Smazat vyhledávání');
  const labels=state.lang==='sk'?['Všetko','Otázky','Neotázky']:['Vše','Otázky','Neotázky'];
  $$('.tab').forEach((b,i)=>b.textContent=labels[i]);
  $('#more').textContent=state.lang==='sk'?'Zobraziť ďalšie':'Zobrazit další';
  if(state.data)render();
}

function setLanguage(lang){
  state.lang=lang==='sk'?'sk':'cz';
  try{localStorage.setItem('vedator-ui-language-v1',state.lang)}catch{}
  applyLanguage();
}

function fmtTime(value){
  const n=Math.max(0,Math.floor(Number(value)||0)),h=Math.floor(n/3600),m=Math.floor(n%3600/60),s=n%60;
  return h?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${m}:${String(s).padStart(2,'0')}`;
}

function playItem(id){
  const item=state.items.find(x=>x.id===id);if(!item)return;
  const episode=state.episodeMap.get(Number(item.episode));if(!episode?.enclosure)return;
  const audio=$('#audio'),c=copy(item);
  state.currentItem=item;
  $('#playerTitle').textContent=c.title||`Díl ${item.episode}`;
  $('#playerSub').textContent=`${state.lang==='sk'?'Diel':'Díl'} ${item.episode}${item.time?' · '+item.time:''}`;
  $('#player').classList.remove('hidden');
  const src=episode.enclosure;
  const seekTo=Math.max(0,Number(item.seconds)||0);
  if(audio.src!==src){
    audio.src=src;audio.load();
    const once=()=>{
      try{audio.currentTime=seekTo}catch{}
      audio.play().catch(()=>{});
      audio.removeEventListener('loadedmetadata',once);
    };
    audio.addEventListener('loadedmetadata',once);
  }else{
    try{audio.currentTime=seekTo}catch{}
    audio.play().catch(()=>{});
  }
}

const audio=$('#audio');
audio.addEventListener('play',()=>$('#playPause').textContent=state.lang==='sk'?'Pauza':'Pauza');
audio.addEventListener('pause',()=>$('#playPause').textContent=state.lang==='sk'?'Prehrať':'Přehrát');
audio.addEventListener('timeupdate',()=>{
  $('#current').textContent=fmtTime(audio.currentTime);
  $('#seek').max=String(Math.max(1,Math.floor(audio.duration)||1));
  $('#seek').value=String(Math.floor(audio.currentTime)||0);
});
audio.addEventListener('durationchange',()=>$('#duration').textContent=Number.isFinite(audio.duration)?fmtTime(audio.duration):'–:––');
$('#seek').addEventListener('input',()=>$('#current').textContent=fmtTime($('#seek').value));
$('#seek').addEventListener('change',()=>{try{audio.currentTime=Number($('#seek').value)||0}catch{}});
$('#playPause').addEventListener('click',()=>{if(audio.paused)audio.play().catch(()=>{});else audio.pause()});
$('#back10').addEventListener('click',()=>{try{audio.currentTime=Math.max(0,audio.currentTime-10)}catch{}});
$('#forward10').addEventListener('click',()=>{try{audio.currentTime=Math.min(audio.duration||Infinity,audio.currentTime+10)}catch{}});
$('#closePlayer').addEventListener('click',()=>$('#player').classList.add('hidden'));

let debounce;
$('#search').addEventListener('input',()=>{
  clearTimeout(debounce);debounce=setTimeout(doSearch,110);
});
$('#search').addEventListener('keydown',e=>{if(e.key==='Enter'){clearTimeout(debounce);doSearch()}});
$('#searchButton').addEventListener('click',doSearch);
$('#clear').addEventListener('click',()=>{$('#search').value='';doSearch();$('#search').focus()});
$$('.tab').forEach(b=>b.addEventListener('click',()=>{
  $$('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');
  state.filter=b.dataset.filter;doSearch();
}));
$$('.suggestion').forEach(b=>b.addEventListener('click',()=>{
  $('#search').value=b.textContent.trim();doSearch();
}));
$$('.language button').forEach(b=>b.addEventListener('click',()=>setLanguage(b.dataset.lang)));
$('#more').addEventListener('click',()=>{state.visible+=30;render()});
$('#theme').addEventListener('click',()=>{
  const next=document.documentElement.dataset.theme==='dark'?'light':'dark';
  document.documentElement.dataset.theme=next;
  try{localStorage.setItem('vedator-ui-theme-v1',next)}catch{}
  $('#theme').textContent=next==='dark'?'☀':'☾';
});
$('#theme').textContent=document.documentElement.dataset.theme==='dark'?'☀':'☾';

start();
