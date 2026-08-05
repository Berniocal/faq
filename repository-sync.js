'use strict';

// Dynamické zjišťování nových souborů s otázkami přímo ze stromu repozitáře.
// Díky tomu není nutné ručně doplňovat každý nový díl do questions-view.js nebo sw.js.
const REPOSITORY_SIGNATURE_KEY='vedator-question-repository-signature-v1';
let repositoryDiscoverySnapshot=null;
let repositoryLoadPromise=null;

function repositoryPathName(path){return String(path||'').split('/').pop()||''}

async function discoverRepositoryFiles(force=false){
  if(repositoryDiscoverySnapshot&&!force)return repositoryDiscoverySnapshot;
  const url=`https://api.github.com/repos/${REPO}/git/trees/${encodeURIComponent(BRANCH)}?recursive=1&v=${Date.now()}`;
  const response=await fetch(url,{cache:'no-store',headers:{Accept:'application/vnd.github+json'}});
  if(!response.ok)throw new Error(`GitHub API vrátilo stav ${response.status}`);
  const payload=await response.json();
  if(!Array.isArray(payload.tree))throw new Error('GitHub neposlal seznam souborů repozitáře.');

  const relevant=payload.tree
    .filter(item=>item?.type==='blob'&&(
      /(?:^|\/)episode-\d+(?:-\d+)*-(?:summary|chapters)\.js$/i.test(item.path)||
      /(?:^|\/)question-translations[^/]*\.js$/i.test(item.path)
    ))
    .map(item=>({path:item.path,sha:String(item.sha||'')}))
    .sort((a,b)=>a.path.localeCompare(b.path,'en'));

  const files=relevant.map(item=>item.path);
  const signature=relevant.map(item=>`${item.path}:${item.sha}`).join('|');
  const summaryEpisodes=[...new Set(files.flatMap(path=>{
    const name=repositoryPathName(path);
    const match=name.match(/^episode-(\d+)-summary\.js$/i);
    return match?[Number(match[1])]:[];
  }))].filter(Number.isFinite).sort((a,b)=>b-a);

  repositoryDiscoverySnapshot={files,signature,summaryEpisodes};
  return repositoryDiscoverySnapshot;
}

function matchingObject(src,open){
  let depth=0,quote='',escaped=false,line=false,block=false;
  for(let i=open;i<src.length;i++){
    const c=src[i],n=src[i+1];
    if(line){if(c==='\n')line=false;continue}
    if(block){if(c==='*'&&n==='/'){block=false;i++}continue}
    if(quote){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c===quote)quote='';continue}
    if(c==='/'&&n==='/'){line=true;i++;continue}
    if(c==='/'&&n==='*'){block=true;i++;continue}
    if(c==='"'||c==="'"||c==='`'){quote=c;continue}
    if(c==='{')depth++;
    else if(c==='}'&&--depth===0)return i;
  }
  return-1;
}

function parseBilingualData(path,src){
  const marker=src.search(/\b(?:const|let|var)\s+DATA\s*=\s*\{/);
  if(marker<0)return[];
  const open=src.indexOf('{',marker),end=matchingObject(src,open);
  if(open<0||end<0)return[];
  let data;
  try{data=JSON.parse(src.slice(open,end+1))}catch(_){return[]}
  if(!data||(!Array.isArray(data.cs)&&!Array.isArray(data.sk)))return[];

  const episode=Number(repositoryPathName(path).match(/^episode-(\d+)/i)?.[1]||0);
  if(!episode)return[];
  const cs=Array.isArray(data.cs)?data.cs:[];
  const sk=Array.isArray(data.sk)?data.sk:[];
  const skByTime=new Map(sk.map((item,index)=>[String(item?.time||`#${index}`),{item,index}]));
  const usedSk=new Set(),out=[];

  const add=(csItem,skItem,index)=>{
    const titleCs=String(csItem?.title||'').trim();
    const titleSk=String(skItem?.title||'').trim();
    const title=titleCs||titleSk;
    const time=String(csItem?.time||skItem?.time||'');
    if(!title||!time)return;
    out.push({
      episode,
      time,
      link_seconds:Math.max(0,toSec(time)-5),
      title,
      question_cs:titleCs,
      question_sk:titleSk,
      source:path,
      offset:index
    });
  };

  cs.forEach((item,index)=>{
    const key=String(item?.time||`#${index}`);
    const match=skByTime.get(key)||{item:sk[index],index};
    if(match?.item)usedSk.add(match.index);
    add(item,match?.item,index);
  });
  sk.forEach((item,index)=>{if(!usedSk.has(index))add(null,item,cs.length+index)});
  return dedupe(out);
}

function parseFlexibleGeneric(path,src,forcedEpisode=null){
  const out=[...parseGeneric(path,src,forcedEpisode)];
  const episode=forcedEpisode||Number(repositoryPathName(path).match(/^episode-(\d+)/i)?.[1]||0);
  if(!episode)return dedupe(out);
  const prerollSeconds=/data-vedator-preroll/i.test(src)?0:5;
  const add=(time,title,offset=0)=>{
    title=String(title||'').replace(/^\s*\d+[.)]\s*/,'').trim();
    const rawTime=String(time||'').trim();
    if(title.length<3||!/^\d{1,2}:\d{2}(?::\d{2})?$/.test(rawTime))return;
    out.push({episode,time:rawTime,link_seconds:Math.max(0,toSec(rawTime)-prerollSeconds),title,source:path,offset});
  };
  const quotedObject=new RegExp(`\\{[\\s\\S]{0,800}?["']?time["']?\\s*:\\s*(${STR})[\\s\\S]{0,800}?["']?title["']?\\s*:\\s*(${STR})`,'g');
  for(const match of src.matchAll(quotedObject))add(decodeJsString(match[1]),decodeJsString(match[2]),match.index||0);
  return dedupe(out);
}

function parseRepositoryQuestionFile(path,text,kind){
  if(kind==='summary'){
    const bilingual=parseBilingualData(path,text);
    if(bilingual.length)return bilingual;
    return parseFlexibleGeneric(path,text).map(question=>({...question,kind:'summary'}));
  }
  const grouped=parseChapterGroups(path,text);
  if(grouped.length)return grouped.map(question=>({...question,kind:'chapter'}));
  return parseFlexibleGeneric(path,text).map(question=>({...question,kind:'chapter'}));
}

function setRepositoryLoadingUi(){
  $('#statusDot').className='dot';
  $('#statusTitle').className='';
  $('#statusTitle').textContent='Aktualizuji databázi…';
  $('#statusText').textContent='Našel jsem změnu v souborech s otázkami a načítám jejich aktuální verzi.';
  $('#progressBar').style.width='0';
  for(const id of ['searchBtn','demoBtn','csvBtn','jsonBtn','offlineBtn','filter'])$('#'+id).disabled=true;
}

window.loadAll=async function loadAllFromRepository(){
  if(repositoryLoadPromise)return repositoryLoadPromise;
  repositoryLoadPromise=(async()=>{
    try{
      let questionsView='';
      try{questionsView=await fetchText('questions-view.js')}catch(_){}
      const discoveredFaq=extractFaqEpisodes(questionsView);

      let repository=null;
      try{repository=await discoverRepositoryFiles()}catch(error){console.warn('Automatické zjištění souborů selhalo, používám záložní seznam.',error)}

      let serviceWorkerAssets=[];
      try{serviceWorkerAssets=extractAssets(await fetchText('sw.js'))}catch(_){}
      const repositoryFiles=repository?.files||[];
      const allAssets=repository?repositoryFiles:[...new Set([...serviceWorkerAssets,...FALLBACK_ASSETS])];
      const translationFiles=allAssets.filter(path=>/^question-translations.*\.js$/i.test(repositoryPathName(path)));
      const summaryFiles=allAssets.filter(path=>/^episode-\d+(?:-\d+)*-(?:summary|chapters)\.js$/i.test(repositoryPathName(path)));

      faqEpisodes=[...new Set([
        ...(repository?.summaryEpisodes||[]),
        ...discoveredFaq,
        ...DEFAULT_FAQ_EPISODES
      ])].sort((a,b)=>b-a);

      const first=[...translationFiles,...summaryFiles,'index.html'];
      loadedAssets=first;
      const fetched=await poolMap(first,8,async path=>({path,text:await fetchText(path)}));
      translations=new Map();
      for(const file of fetched)if(file?.text&&/^question-translations/i.test(repositoryPathName(file.path)))parsePairs(file.text);

      const candidates=[];
      for(const file of fetched){
        if(!file?.text)continue;
        if(file.path==='index.html')candidates.push(...parseInline300(file.text).map(question=>({...question,kind:'inline'})));
        else if(/^episode-/i.test(repositoryPathName(file.path))){
          const kind=/-summary\.js$/i.test(repositoryPathName(file.path))?'summary':'chapter';
          candidates.push(...parseRepositoryQuestionFile(file.path,file.text,kind));
        }
      }

      faqEpisodes=[...new Set([...faqEpisodes,...candidates.map(item=>Number(item.episode)).filter(Number.isFinite)])].sort((a,b)=>b-a);

      function selectBest(items){
        const priority={summary:3,inline:2,chapter:1};
        const groups=new Map();
        for(const question of items){
          const key=`${question.episode}|${question.source}`;
          if(!groups.has(key))groups.set(key,[]);
          groups.get(key).push(question);
        }
        const chosen=[];
        for(const episode of faqEpisodes){
          const options=[...groups.values()].filter(group=>group[0]?.episode===episode).map(group=>dedupe(group));
          options.sort((a,b)=>b.length-a.length||(priority[b[0]?.kind]||0)-(priority[a[0]?.kind]||0));
          if(options[0])chosen.push(...options[0]);
        }
        return dedupe(chosen);
      }

      questions=buildIndex(selectBest(candidates).filter(item=>faqEpisodes.includes(item.episode)));
      finishLoad();
      if(repository?.signature&&questions.length){
        try{localStorage.setItem(REPOSITORY_SIGNATURE_KEY,repository.signature)}catch(_){}
      }
    }catch(error){
      failLoad(error);
    }
  })().finally(()=>{repositoryLoadPromise=null});
  return repositoryLoadPromise;
};

async function synchronizeCachedRepository(){
  try{
    const repository=await discoverRepositoryFiles(true);
    if(repositoryLoadPromise){await repositoryLoadPromise;return}
    const saved=localStorage.getItem(REPOSITORY_SIGNATURE_KEY)||'';
    if(saved===repository.signature&&questions.length)return;
    if(!questions.length)return;
    clearCache();
    questions=[];
    translations=new Map();
    repositoryDiscoverySnapshot=repository;
    setRepositoryLoadingUi();
    await window.loadAll();
  }catch(error){
    console.info('Aktuálnost databáze nyní nelze ověřit; používám uloženou kopii.',error);
  }
}

setTimeout(()=>void synchronizeCachedRepository(),0);
