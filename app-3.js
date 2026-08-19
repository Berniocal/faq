function flattenData(data){
  const items=[];
  for(const q of data.questions||[]){
    const cs=q.i18n?.cs||{title:q.title||'',points:Array.isArray(q.points)?q.points:[]};
    const sk=q.i18n?.sk||{title:q.title||'',points:Array.isArray(q.points)?q.points:[]};
    items.push({
      id:`q:${q.episode}:${q.order}`,type:'question',episode:Number(q.episode)||0,order:Number(q.order)||0,
      seconds:Number(q.seconds)||0,time:q.sourceTime||q.time||'',
      cs:{title:String(cs.title||q.title||''),points:Array.isArray(cs.points)?cs.points.map(String):[]},
      sk:{title:String(sk.title||q.title||''),points:Array.isArray(sk.points)?sk.points.map(String):[]}
    });
  }
  for(const [episode,languages] of Object.entries(data.nonquestions?.episodes||{})){
    const cs=Array.isArray(languages?.cs)?languages.cs:[];
    const sk=Array.isArray(languages?.sk)?languages.sk:[];
    const count=Math.max(cs.length,sk.length);
    for(let i=0;i<count;i++){
      const a=cs[i]||sk[i]||{},b=sk[i]||cs[i]||{};
      items.push({
        id:`n:${episode}:${i}`,type:'nonquestion',episode:Number(episode)||0,order:i,
        seconds:Number(a.seconds??b.seconds)||parseTime(a.time||b.time||'0:00'),
        time:a.sourceTime||a.time||b.sourceTime||b.time||'',
        cs:{title:String(a.title||b.title||''),points:Array.isArray(a.points)?a.points.map(String):[]},
        sk:{title:String(b.title||a.title||''),points:Array.isArray(b.points)?b.points.map(String):[]}
      });
    }
  }
  return items;
}

function parseTime(value){
  const p=String(value||'').match(/\d{1,2}:\d{2}(?::\d{2})?/)?.[0].split(':').map(Number);
  if(!p)return 0;
  return p.length===3?p[0]*3600+p[1]*60+p[2]:p[0]*60+p[1];
}

function buildIndex(items){
  return items.map(item=>{
    const full=[
      item.cs.title,...item.cs.points,item.sk.title,...item.sk.points,
      String(item.episode)
    ].join(' ');
    const title=[item.cs.title,item.sk.title].join(' ');
    return{
      item,full,title,normFull:norm(full),normTitle:norm(title),
      concepts:conceptBundle(full)
    };
  });
}

function rank(query){
  const nq=norm(query);
  const qConcepts=conceptBundle(query,{query:true});
  const qChar=ngrams(query);
  if(!nq||!qConcepts.length)return[];

  // 1) Nejprve spočítáme skutečnou textovou/pojmovou shodu pro všechny položky.
  const base=[];
  for(const entry of state.index){
    const {item}=entry;
    if(state.filter!=='all'&&item.type!==state.filter)continue;
    const direct=evaluateDirect(qConcepts,qChar,entry.concepts,entry.full);
    const exactTitle=entry.normTitle.includes(nq);
    const exactAnywhere=entry.normFull.includes(nq);
    const titleConcepts=conceptBundle(entry.title);
    const titleDirect=evaluateDirect(qConcepts,qChar,titleConcepts,entry.title).score;
    const seedStrength=Math.min(1,
      (exactTitle?.98:exactAnywhere?.86:0)+
      direct.score*.78+titleDirect*.22
    );
    base.push({entry,direct,exactTitle,exactAnywhere,titleDirect,seedStrength});
  }

  // 2) Nejlepší přímé výsledky jsou "semena".
  // Jejich sousedé v síti všech otázek/neotázek mohou být nabídnuti jako příbuzné téma.
  const seeds=base
    .filter(x=>x.exactAnywhere||x.direct.score>=.14||x.titleDirect>=.14)
    .sort((a,b)=>b.seedStrength-a.seedStrength)
    .slice(0,16);

  const propagated=new Map();
  for(const seed of seeds){
    const sourceId=seed.entry.item.id;
    for(const [targetId,edge] of state.neighborGraph.get(sourceId)||[]){
      const value=seed.seedStrength*edge;
      const old=propagated.get(targetId);
      if(!old||value>old.value)propagated.set(targetId,{value,sourceId});
    }
  }

  // 3) Finální skóre. Pořadí vrstev je pevné:
  // přesná fráze > přímý odborný pojem/tvar > související pojem > podobná položka.
  const scored=[];
  const byId=new Map(state.index.map(e=>[e.item.id,e]));
  for(const row of base){
    const {entry,direct,exactTitle,exactAnywhere,titleDirect}=row;
    const semantic=evaluateSemantic(qConcepts,entry.concepts);
    const related=propagated.get(entry.item.id)||{value:0,sourceId:''};

    let score=direct.score*.79+titleDirect*.16+direct.characterSimilarity*.05;
    const semanticContribution=(direct.score<.20?.48:.12)*semantic.score;
    score=Math.min(1,score+semanticContribution+related.value*.16);
    if(exactAnywhere)score=Math.min(1,score+.12);
    if(exactTitle)score=Math.min(1,score+.17);

    let tier=99,reason='';
    if(exactTitle){tier=0;reason='exact-title'}
    else if(exactAnywhere){tier=1;reason='exact-any'}
    else if(direct.score>=.22||titleDirect>=.20){tier=2;reason='direct'}
    else if(semantic.score>=.34){tier=3;reason='semantic'}
    else if(related.value>=.06){tier=4;reason='related-item'}
    else if(semantic.score>=.18){tier=5;reason='distant-semantic'}
    else if(direct.score>=.07&&direct.matches.length){tier=6;reason='weak-direct'}
    if(tier===99)continue;

    const sourceEntry=related.sourceId?byId.get(related.sourceId):null;
    scored.push({
      entry,score,direct,semantic,titleDirect,tier,reason,related,
      relatedSourceTitle:sourceEntry?copy(sourceEntry.item).title:'',
      matchedDirect:direct.matches.map(m=>m.query.label),
      matchedSemantic:semantic.matches.map(m=>`${m.query.label} → ${m.candidate.label}`)
    });
  }

  return scored.sort((a,b)=>
    a.tier-b.tier ||
    b.score-a.score ||
    b.direct.coreCoverage-a.direct.coreCoverage ||
    b.direct.weightedCoverage-a.direct.weightedCoverage ||
    b.semantic.score-a.semantic.score ||
    b.related.value-a.related.value ||
    b.titleDirect-a.titleDirect ||
    b.entry.item.episode-a.entry.item.episode ||
    a.entry.item.order-b.entry.item.order
  );
}

function copy(item){return state.lang==='sk'?item.sk:item.cs}
function typeLabel(type){return type==='question'?(state.lang==='sk'?'Otázka':'Otázka'):(state.lang==='sk'?'Neotázka':'Neotázka')}
function reasonLabel(result){
  if(state.lang==='sk'){
    return result.reason==='exact-title'?'Presná zhoda v názve':
      result.reason==='exact-any'?'Priama zhoda':
      result.reason==='semantic'?'Príbuzný pojem':
      result.reason==='related-item'?'Súvisiaca položka':
      result.reason==='distant-semantic'?'Vzdialenejšia súvislosť':
      result.reason==='weak-direct'?'Slabšia vecná zhoda':'Rovnaký pojem / tvar';
  }
  return result.reason==='exact-title'?'Přesná shoda v názvu':
    result.reason==='exact-any'?'Přímá shoda':
    result.reason==='semantic'?'Příbuzný pojem':
    result.reason==='related-item'?'Související položka':
    result.reason==='distant-semantic'?'Vzdálenější souvislost':
    result.reason==='weak-direct'?'Slabší věcná shoda':'Stejný pojem / tvar';
}
function scorePercent(r){
  // Semantické výsledky mají schválně nižší "relevanci".
  const n=(r.reason==='semantic'||r.reason==='related-item'||r.reason==='distant-semantic')
    ?Math.min(r.reason==='related-item'?.59:r.reason==='distant-semantic'?.49:.69,r.score)
    :r.score;
  return Math.max(1,Math.round(n*100));
}
function directUrl(item){
  // Stejný hash deep-link formát, který používá současný Vedator.
  const base='https://bernio.cz/vedator/';
  const kind=item.type==='question'?'question':'nonquestion';
  return `${base}#${kind}=${item.episode}:${item.order}`;
}

function render(){
  const results=$('#results'),more=$('#more');
  if(!state.query.trim()){
    results.innerHTML=`<div class="empty">${state.lang==='sk'
      ?'<strong>Začni písať.</strong><br>Zadaj odborný pojem alebo celú otázku. Najprv hľadám presnú zhodu a tvary slov, až potom príbuzné témy.'
      :'<strong>Začni psát.</strong><br>Zadej odborný pojem nebo celou otázku. Nejdřív hledám přesnou shodu a tvary slov, teprve potom příbuzná témata.'}</div>`;
    $('#count').textContent='';more.classList.add('hidden');return;
  }
  const visible=state.ranked.slice(0,state.visible);
  if(!visible.length){
    results.innerHTML=`<div class="empty">${state.lang==='sk'
      ?'Nenašiel som použiteľnú zhodu. Skús kratší odborný pojem.'
      :'Nenašel jsem použitelnou shodu. Zkus kratší odborný pojem.'}</div>`;
    $('#count').textContent='0';more.classList.add('hidden');return;
  }
  results.innerHTML=visible.map(result=>{
    const item=result.entry.item,c=copy(item),points=c.points||[];
    const directTags=[...new Set(result.matchedDirect)].slice(0,4);
    const semanticTags=[...new Set(result.matchedSemantic)].slice(0,3);
    const explain=result.reason==='semantic'
      ?(state.lang==='sk'
        ?`Nenašla sa silná priama zhoda. Výsledok je nižšie preto, že obsahuje tematicky súvisiaci pojem.`
        :`Nenašla se silná přímá shoda. Výsledek je níž proto, že obsahuje tematicky příbuzný pojem.`)
      :result.reason==='related-item'
        ?(state.lang==='sk'
          ?`Táto položka nemusí obsahovať hľadané slovo, ale v celom korpuse je obsahovo blízka výsledku „${result.relatedSourceTitle||''}“.`
          :`Tato položka nemusí obsahovat hledané slovo, ale v celém korpusu je obsahově blízká výsledku „${result.relatedSourceTitle||''}“.`)
        :result.reason==='distant-semantic'
          ?(state.lang==='sk'
            ?`Ide o slabšiu, viac-krokovú tematickú súvislosť. Preto je výsledok až za priamymi a blízkymi zhodami.`
            :`Jde o slabší, vícekrokový tematický vztah. Proto je výsledek až za přímými a blízkými shodami.`)
          :'';
    return `<article class="card" data-id="${esc(item.id)}">
      <div class="result-head">
        <div class="meta"><span class="type-badge">${esc(typeLabel(item.type))}</span> · ${state.lang==='sk'?'Diel':'Díl'} ${item.episode}${item.time?' · '+esc(item.time):''}</div>
        <span class="score">${scorePercent(result)} %</span>
      </div>
      <h2>${esc(c.title||'(bez názvu)')}</h2>
      ${points.length?`<div class="answer collapsed"><ul>${points.map(p=>`<li>${esc(p)}</li>`).join('')}</ul></div>`:''}
      ${explain?`<div class="explain">${esc(explain)}</div>`:''}
      <div class="tags">
        <span class="tag ${result.reason==='semantic'||result.reason==='related-item'||result.reason==='distant-semantic'?'semantic':'direct'}">${esc(reasonLabel(result))}</span>
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
  $('#count').textContent=state.lang==='sk'
    ?`${state.ranked.length} výsledkov`
    :`${state.ranked.length} výsledků`;
  more.classList.toggle('hidden',state.visible>=state.ranked.length);
  bindCards();
}

function doSearch(){
  state.query=$('#search').value.trim();
  state.visible=30;
  const started=performance.now();
  state.ranked=rank(state.query);
  render();
  if(state.query){
    const ms=Math.round(performance.now()-started);
    $('#status').textContent=state.lang==='sk'
      ?`Hľadanie hotové · ${ms} ms`
      :`Hledání hotové · ${ms} ms`;
  }
}

function bindCards(){
  $$('.play').forEach(b=>b.addEventListener('click',()=>playItem(b.dataset.play)));
  $$('.more-answer').forEach(b=>b.addEventListener('click',()=>{
    const answer=b.closest('.card')?.querySelector('.answer');
    if(!answer)return;
    const collapsed=answer.classList.toggle('collapsed');
    b.textContent=collapsed?(state.lang==='sk'?'Čítať viac':'Číst více'):(state.lang==='sk'?'Čítať menej':'Číst méně');
  }));
}

async function loadData(){
  let lastError;
  for(const url of DATA_URLS){
    try{
      const r=await fetch(url,{cache:'no-store'});
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const data=await r.json();
      if(!Array.isArray(data.episodes)||!Array.isArray(data.questions))throw new Error('Neplatný datový balík');
      return data;
    }catch(e){lastError=e}
  }
  throw lastError||new Error('Data se nepodařilo načíst');
}

