function setProgress(done,total,text){$('#progressBar').style.width=`${Math.round(100*done/Math.max(1,total))}%`;if(text)$('#statusText').textContent=text}
async function poolMap(list,limit,fn){const out=new Array(list.length);let at=0,done=0;async function worker(){while(true){const i=at++;if(i>=list.length)return;try{out[i]=await fn(list[i],i)}catch(e){out[i]={path:list[i],error:String(e)}}done++;setProgress(done,list.length,`Načteno ${done} z ${list.length} datových souborů…`)}}await Promise.all(Array.from({length:Math.min(limit,list.length)},worker));return out}
async function loadAll(){try{let questionsView='';try{questionsView=await fetchText('questions-view.js')}catch(_){}const discoveredFaq=extractFaqEpisodes(questionsView);faqEpisodes=discoveredFaq.length?discoveredFaq:[...DEFAULT_FAQ_EPISODES];let assets=[];try{assets=extractAssets(await fetchText('sw.js'))}catch(_){assets=[]}if(!assets.length)assets=[...FALLBACK_ASSETS];assets=[...new Set([...assets,...FALLBACK_ASSETS])];const translationFiles=assets.filter(x=>/^question-translations.*\.js$/i.test(x));const summaryFiles=assets.filter(x=>/^episode-\d+(?:-\d+)*-(?:summary|chapters)\.js$/i.test(x));const first=[...translationFiles,...summaryFiles,'index.html'];loadedAssets=first;const fetched=await poolMap(first,8,async path=>({path,text:await fetchText(path)}));for(const f of fetched)if(f?.text&&/^question-translations/i.test(f.path))parsePairs(f.text);const candidates=[];
for(const f of fetched){
  if(!f?.text)continue;
  if(f.path==='index.html')candidates.push(...parseInline300(f.text).map(q=>({...q,kind:'inline'})));
  else if(/^episode-/i.test(f.path)){
    const kind=/-summary\.js$/i.test(f.path)?'summary':'chapter';
    if(kind==='summary')candidates.push(...parseGeneric(f.path,f.text).map(q=>({...q,kind})));
    else{
      const grouped=parseChapterGroups(f.path,f.text);
      if(grouped.length)candidates.push(...grouped.map(q=>({...q,kind:'chapter'})));
      else if(/^episode-\d+-(?:chapters)\.js$/i.test(f.path))candidates.push(...parseGeneric(f.path,f.text).map(q=>({...q,kind:'chapter'})));
    }
  }
}
// Pro každý díl zvol nejúplnější zdroj. Při shodném počtu má přednost shrnutí, poté inline data a kapitoly.
function selectBest(items){const priority={summary:3,inline:2,chapter:1};const groups=new Map();for(const q of items){const key=`${q.episode}|${q.source}`;(groups.get(key)||groups.set(key,[]).get(key)).push(q)}const chosen=[];for(const ep of faqEpisodes){const options=[...groups.values()].filter(g=>g[0]?.episode===ep).map(g=>dedupe(g));options.sort((a,b)=>b.length-a.length||(priority[b[0]?.kind]||0)-(priority[a[0]?.kind]||0));if(options[0])chosen.push(...options[0])}return dedupe(chosen)}
let parsed=selectBest(candidates).filter(x=>faqEpisodes.includes(x.episode));questions=[];questions=buildIndex(parsed);
// Druhý pokus: načti dynamicky přidávané soubory, které nemusely být uvedené v service workeru.
{
  let controls='';try{controls=await fetchText('question-controls-stability.js')}catch(_){}
  const dynamic=[...controls.matchAll(/["']\.\/(episode-[^"']+\.js)["']/g)].map(m=>m[1]);
  const extra=[...new Set([...dynamic,...assets.filter(x=>/^episode-/i.test(x))])].filter(x=>!first.includes(x));
  if(extra.length){const more=await poolMap(extra,6,async path=>({path,text:await fetchText(path)}));for(const f of more){if(!f?.text)continue;const kind=/-summary\.js$/i.test(f.path)?'summary':'chapter';if(kind==='summary')candidates.push(...parseGeneric(f.path,f.text).map(q=>({...q,kind})));else{const grouped=parseChapterGroups(f.path,f.text);if(grouped.length)candidates.push(...grouped.map(q=>({...q,kind:'chapter'})));else if(/^episode-\d+-chapters\.js$/i.test(f.path))candidates.push(...parseGeneric(f.path,f.text).map(q=>({...q,kind:'chapter'})))}}parsed=selectBest(candidates).filter(x=>faqEpisodes.includes(x.episode));questions=buildIndex(parsed)}}
finishLoad()}catch(e){failLoad(e)}}
function finishLoad(source='network'){const ok=questions.length>0;$('#statusDot').className='dot '+(ok?'good':'bad');$('#statusTitle').textContent=ok?`Hotovo: připraveno ${questions.length} otázek`:'Nebyla nalezena žádná otázka';$('#statusTitle').className=ok?'success':'error';const labels={embedded:'Databáze byla načtena přímo z tohoto HTML. Nebylo potřeba připojení k internetu.',cache:'Databáze byla načtena z úložiště prohlížeče. Spuštění je nyní okamžité.',network:'Databáze byla stažena z GitHubu a uložena pro příští okamžité spuštění.'};$('#statusText').textContent=ok?(labels[source]||labels.network):'Repozitář mohl změnit formát datových souborů.';$('#progressBar').style.width='100%';for(const id of ['searchBtn','demoBtn','csvBtn','jsonBtn','offlineBtn','filter'])$('#'+id).disabled=!questions.length;renderTable(questions);$('#visibleCount').textContent=`${questions.length} položek`;$('#results').innerHTML='<div class="muted">Napište novou otázku a spusťte hledání.</div>';if(source==='network'&&questions.length)storeCache()}
function failLoad(e){$('#statusDot').className='dot bad';$('#statusTitle').textContent='Data se nepodařilo načíst';$('#statusTitle').className='error';$('#statusText').textContent=String(e?.message||e);$('#progressBar').style.width='100%';$('#sourceNote').innerHTML='Zkontrolujte připojení k internetu. Ve firemní síti může být blokovaný <code>raw.githubusercontent.com</code> nebo <code>cdn.jsdelivr.net</code>.'}
