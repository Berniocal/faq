
'use strict';

// Tematické filtrování, odvozené tvary a priorita věcných pojmů.
// Odborný / věcný pojem (např. foton) má výrazně vyšší váhu než obecný popis
// (např. velký). Skloňování, množné číslo a častá odvozená přídavná jména se
// převádějí na společný základ: kniha/knihy/knižní, foton/fotony/fotonový apod.
(()=>{
  if(globalThis.__vedatorThematicScoring)return;
  globalThis.__vedatorThematicScoring=true;

  const FUNCTION_WORDS=`
  a i ani nebo anebo ci či ale avsak avšak vsak však nybrz nýbrž protoze protože ponevadz poněvadž jelikoz jelikož kdyz když kdyby jestli jestlize jestliže pokud aby takze takže tedy tudiz tudíž proto presto přesto zatimco
  v ve na do od z ze s se k ke ku u o po pro proti pres přes skrz pred před za pod nad mezi kolem okolo bez kvuli kvůli diky díky podle behem během mimo vedle
  jak proc proč kdy kde kam odkud kudy co kdo koho komu cim čím cem čem ktery který ktera která ktere které kteri kteří jaky jaký jaka jaká jake jaké ci čí kolik zda zdali
  ten ta to ti ty te té tom tim tím tento tato toto tihle tyhle tohle tamten tamta tamto
  ja já ty on ona ono my vy oni ony me mě mne mi mně tebe te tě ti jej jeho ji jí nam nám vas vás jim
  se si svuj svůj svoje sve své jen jenom pouze take také taky jeste ještě uz už jiz již prave právě vubec vůbec vlastne vlastně proste prostě prece přece snad asi mozna možná treba třeba ano ne nikoli
  by bych bys bychom byste bude budou byl byla bylo byli byt být jsem jsi jsme jste jsou je ma má mam mám mas máš maji mají mel měl mela měla meli měli mit mít muze může mohou mohl mohla mohli lze
  aj alebo avsak lebo pretoze pretože ked keď keby ak pokial pokiaľ takze takže teda cize čiže napriek zatialco zatiaľčo
  vo zo so pre cez kvoli kvôli vdaka vďaka podla podľa pocas počas vedla vedľa
  ako preco prečo kedy odkial odkiaľ kadial kadiaľ čo kto čom ktory ktorý ktora ktorá ktore ktoré ktorí aky aký aka aká ake aké kolko koľko
  tie tej tym tým táto títo tieto mna mňa teba ťa jej ju im sa svoj len iba tiez tiež este ešte prave práve vobec vôbec predsa snáď mozno možno napriklad napríklad áno nie
  som sme ste budu budú bol bola bolo boli su sú maju majú mal mala mali mat mať moze môže mozu môžu mohol mohla mohli da dá
  `.split(/\s+/).map(norm).filter(Boolean);
  for(const word of FUNCTION_WORDS)STOP.add(word);

  const DERIVATION_SUFFIXES=`
  alniho alniemu alnemu alnich alnych alnimi alnymi alnim alnym alni alny
  arniho arniemu arnemu arnich arnych arnimi arnymi arnim arnym arni arny
  erniho erniemu ernemu ernich ernych ernimi ernymi ernim ernym erni erny
  acniho acniemu acnemu acnich acnych acnimi acnymi acnim acnym acni acny
  icniho icniemu icnemu icnich icnych icnimi icnymi icnim icnym icni icny
  ecniho ecniemu ecnemu ecnich ecnych ecnimi ecnymi ecnim ecnym ecni ecny
  ovniho ovniemu ovnemu ovnich ovnych ovnimi ovnymi ovnim ovnym ovni ovny
  evniho evniemu evnemu evnich evnych evnimi evnymi evnim evnym evni evny
  ickeho ickemu ickych ickymi ickou ickem icky icka icke
  skeho skemu skych skymi skou skem sky ska ske
  ckeho ckemu ckych ckymi ckou ckem cky cka cke
  oveho ovemu ovych ovymi ovou ovem ovi ova ove ovy
  eveho evemu evych evymi evou evem evi eva eve evy
  niho niemu nemu nich nymi nimi nim nou ny na ne ni
  telneho telnych telnymi telnou telny telna telne telni
  itelneho itelnych itelnymi itelnou itelny itelna itelne itelni
  `.trim().split(/\s+/).sort((a,b)=>b.length-a.length);

  const DERIVATION_GROUPS=[
    ['knih',['kniha','knihy','knizni','knizny','knihovni','knizne']],
    ['foton',['foton','fotony','fotonovy']], ['elektron',['elektron','elektrony','elektronovy']],
    ['proton',['proton','protony','protonovy']], ['neutron',['neutron','neutrony','neutronovy']],
    ['kvark',['kvark','kvarky','kvarkovy']], ['atom',['atom','atomy','atomovy']],
    ['molekul',['molekula','molekuly','molekularni']], ['castic',['castice','castice','casticovy']],
    ['kvant',['kvantum','kvanta','kvantovy']], ['fyzik',['fyzika','fyzikalni','fyzikalny']],
    ['chem',['chemie','chemicky','chemicky']], ['biolog',['biologie','biologicky','biologicky']],
    ['astronom',['astronomie','astronomicky','astronomicky']], ['kosm',['kosmos','kosmicky','kozmicky']],
    ['vesmir',['vesmir','vesmirny']], ['hvezd',['hvezda','hvezdy','hvezdny','hviezda','hviezdy','hviezdny']],
    ['planet',['planeta','planety','planetarni','planetarny']], ['slunc',['slunce','slunecni','slnko','slnecny']],
    ['mesic',['mesic','mesice','mesicni','mesiac','mesacny']], ['zem',['zeme','zemsky','zem','zemsky']],
    ['gravit',['gravitace','gravitacni','gravitacia','gravitacny']],
    ['relativ',['relativita','relativisticky','relativisticky']],
    ['energ',['energie','energeticky','energia','energeticky']], ['magnet',['magnet','magneticky']],
    ['elektr',['elektrina','elektricky','elektrina','elektricky']], ['jadr',['jadro','jaderny','jadrovy']],
    ['tepl',['teplo','tepelny','tepelny']], ['svetl',['svetlo','svetelny','svetelny']],
    ['zvuk',['zvuk','zvukovy']], ['optik',['optika','opticky']], ['radioaktiv',['radioaktivita','radioaktivni']],
    ['evoluc',['evoluce','evolucni','evolucia','evolucny']], ['gen',['gen','geny','geneticky']],
    ['klimat',['klima','klimaticky']], ['pocas',['pocasi','pocasie','povetrnostni']],
    ['ved',['veda','vedecky','veda','vedecky']], ['vyzkum',['vyzkum','vyzkumny']],
    ['histor',['historie','historicky','historia','historicky']], ['spolec',['spolecnost','spolecensky','spolocnost','spolocensky']],
    ['clovek',['clovek','lide','lidsky','clovek','ludia','ludsky']], ['dit',['dite','deti','detsky','dieta','deti','detsky']],
    ['prirod',['priroda','prirodni','priroda','prirodny']], ['technolog',['technologie','technologicky','technologia','technologicky']],
    ['pocitac',['pocitac','pocitace','pocitacovy']], ['internet',['internet','internetovy']],
    ['film',['film','filmy','filmovy']], ['hr',['hra','hry','herni','hra','hry','herny']]
  ];

  function rawDerivationRoot(value){
    let current=norm(value);
    if(!current)return'';
    if(current.includes(' '))return current.split(/\s+/).map(rawDerivationRoot).filter(Boolean).join(' ');
    for(const suffix of DERIVATION_SUFFIXES){
      if(current.endsWith(suffix)&&current.length-suffix.length>=3){current=current.slice(0,-suffix.length);break;}
    }
    current=stem(current);
    const rewrites={kniz:'knih',jader:'jadr',tepel:'tepl',slunec:'slunc',vede:'ved',energet:'energ',elektrin:'elektr',opt:'optik'};
    return rewrites[current]||current;
  }

  const DERIVATION_ALIASES=(()=>{
    const map=new Map();
    for(const [key,forms] of DERIVATION_GROUPS){
      const canonical=norm(key);
      map.set(canonical,canonical);
      for(const form of forms){
        const normalized=norm(form);
        map.set(normalized,canonical);
        map.set(stem(normalized),canonical);
        map.set(rawDerivationRoot(normalized),canonical);
      }
    }
    return map;
  })();

  function canonicalConcept(value){
    const normalized=norm(value);
    if(!normalized)return'';
    if(DERIVATION_ALIASES.has(normalized))return DERIVATION_ALIASES.get(normalized);
    const preCanonical=typeof globalThis.vedatorCanonicalConcept==='function'
      ?globalThis.vedatorCanonicalConcept(normalized)
      :normalized;
    if(DERIVATION_ALIASES.has(preCanonical))return DERIVATION_ALIASES.get(preCanonical);
    const root=rawDerivationRoot(preCanonical);
    return DERIVATION_ALIASES.get(root)||root;
  }

  const GENERIC_MODIFIERS=new Set(`
    velky maly nejvetsi nejmensi dlouhy kratky vysoky nizky siroky uzky tezky lehky
    rychly pomaly silny slaby stary novy mlady teply studeny horky chladny
    viditelny neviditelny pozorovatelny znamy neznamy mozny nemozny skutecny realny
    bezny obvykly zvlastni hlavni vedlejsi dalsi jiny stejny prvni posledni jediny
    blizky vzdaleny nejblizsi nejvzdalenejsi spravny spatny dobry nejlepsi horsi
  `.split(/\s+/).map(canonicalConcept).filter(Boolean));

  function conceptBundle(text){
    const tokens=String(text||'').match(/[\p{L}\p{N}]+/gu)||[];
    const seen=new Set(),out=[];
    for(let tokenIndex=0;tokenIndex<tokens.length;tokenIndex++){
      const raw=tokens[tokenIndex],normalized=norm(raw);
      if(!normalized||normalized.length<2||STOP.has(normalized))continue;
      const key=canonicalConcept(normalized);
      if(!key||STOP.has(key)||seen.has(key))continue;
      seen.add(key);
      out.push({key,label:raw.toLocaleLowerCase('cs-CZ'),tokenIndex,contentIndex:out.length,modifier:GENERIC_MODIFIERS.has(key)});
    }
    return out;
  }

  function conceptSimilarity(a,b){
    if(a.key===b.key)return 1;
    if(Math.min(a.key.length,b.key.length)<4)return 0;
    const similarity=dice(ngrams(a.key,2),ngrams(b.key,2));
    return similarity>=0.88?similarity:0;
  }

  let statsSignature='',thematicDf=new Map(),thematicCorpusSize=1;
  function ensureThematicStats(){
    const signature=`${questions.length}|${questions[0]?.id||''}|${questions[questions.length-1]?.id||''}`;
    if(signature===statsSignature)return;
    statsSignature=signature;thematicDf=new Map();thematicCorpusSize=Math.max(1,questions.length);
    for(const question of questions){
      const keys=new Set();
      for(const text of [question.question_cs,question.question_sk])for(const concept of conceptBundle(text))keys.add(concept.key);
      for(const key of keys)thematicDf.set(key,(thematicDf.get(key)||0)+1);
    }
  }

  function rarityWeight(key){
    ensureThematicStats();
    const frequency=thematicDf.get(key)||0;
    const idf=Math.log((thematicCorpusSize+1)/(frequency+1))+1;
    return Math.max(1,Math.min(5.5,idf));
  }

  function queryConceptWeight(concept,index,total){
    const position=total<=1?1:1.15-0.15*(index/(total-1));
    const role=concept.modifier?0.28:1.55;
    return rarityWeight(concept.key)*position*role;
  }

  function matchConcepts(queryConcepts,candidateConcepts){
    const available=new Set(candidateConcepts.map((_,index)=>index));
    const matchedQueries=new Set(),matches=[];
    queryConcepts.forEach((query,qIndex)=>{
      const cIndex=candidateConcepts.findIndex((candidate,index)=>available.has(index)&&candidate.key===query.key);
      if(cIndex<0)return;
      available.delete(cIndex);matchedQueries.add(qIndex);
      matches.push({query,candidate:candidateConcepts[cIndex],qIndex,cIndex,similarity:1});
    });
    queryConcepts.forEach((query,qIndex)=>{
      if(matchedQueries.has(qIndex))return;
      let bestIndex=-1,bestScore=0;
      for(const cIndex of available){
        const score=conceptSimilarity(query,candidateConcepts[cIndex]);
        if(score>bestScore){bestScore=score;bestIndex=cIndex;}
      }
      if(bestIndex<0)return;
      available.delete(bestIndex);
      matches.push({query,candidate:candidateConcepts[bestIndex],qIndex,cIndex:bestIndex,similarity:bestScore});
    });
    return matches.sort((a,b)=>a.qIndex-b.qIndex);
  }

  function structuralSimilarity(matches,queryCount,candidateCount){
    if(!matches.length)return 0;
    if(matches.length===1)return 0.55;
    let ordered=0,pairs=0;
    for(let i=0;i<matches.length;i++)for(let j=i+1;j<matches.length;j++){pairs++;if(matches[i].cIndex<matches[j].cIndex)ordered++;}
    const orderScore=pairs?ordered/pairs:1;
    let gapScore=0;
    for(let i=1;i<matches.length;i++){
      const qGap=Math.abs(matches[i].qIndex-matches[i-1].qIndex)/Math.max(1,queryCount-1);
      const cGap=Math.abs(matches[i].cIndex-matches[i-1].cIndex)/Math.max(1,candidateCount-1);
      gapScore+=Math.max(0,1-Math.abs(qGap-cGap));
    }
    gapScore/=Math.max(1,matches.length-1);
    let positionScore=0;
    for(const match of matches){
      const qp=match.qIndex/Math.max(1,queryCount-1),cp=match.cIndex/Math.max(1,candidateCount-1);
      positionScore+=Math.max(0,1-Math.abs(qp-cp));
    }
    positionScore/=matches.length;
    return 0.45*orderScore+0.30*gapScore+0.25*positionScore;
  }

  function evaluateVariant(queryConcepts,queryChargrams,candidateText){
    const candidateConcepts=conceptBundle(candidateText),matches=matchConcepts(queryConcepts,candidateConcepts);
    const queryCount=queryConcepts.length,candidateCount=candidateConcepts.length;
    const weights=queryConcepts.map((concept,index)=>queryConceptWeight(concept,index,queryCount));
    const totalWeight=weights.reduce((sum,value)=>sum+value,0)||1;
    const matchedWeight=matches.reduce((sum,match)=>sum+weights[match.qIndex]*match.similarity,0);
    const weightedCoverage=matchedWeight/totalWeight;
    const coreIndices=queryConcepts.map((concept,index)=>concept.modifier?-1:index).filter(index=>index>=0);
    const matchedCore=new Set(matches.filter(match=>!match.query.modifier).map(match=>match.qIndex));
    const coreCoverage=coreIndices.length?matchedCore.size/coreIndices.length:1;
    const lengthBalance=queryCount&&candidateCount?Math.min(queryCount,candidateCount)/Math.max(queryCount,candidateCount):0;
    const structure=structuralSimilarity(matches,queryCount,candidateCount);
    const characterSimilarity=dice(queryChargrams,ngrams(candidateText));
    const lengthFactor=0.62+0.38*lengthBalance;
    const structureFactor=0.86+0.14*structure;
    const coreFactor=coreIndices.length?0.08+0.92*coreCoverage:1;
    let score=Math.max(0,Math.min(1,weightedCoverage*lengthFactor*structureFactor*coreFactor));
    if(coreIndices.length&&!matchedCore.size)score=Math.min(score,0.06);
    return{score,weightedCoverage,coreCoverage,lengthBalance,structure,characterSimilarity,matches,matchedCount:matches.length,queryCount,candidateCount};
  }

  rank=function(query){
    const queryConcepts=conceptBundle(query),queryChargrams=ngrams(query);
    if(!queryConcepts.length)return[];
    return questions.map(question=>{
      const variants=[question.question_cs,question.question_sk]
        .map(value=>String(value||'').trim()).filter((value,index,array)=>value&&array.indexOf(value)===index)
        .map(text=>({...evaluateVariant(queryConcepts,queryChargrams,text),text}));
      const best=(variants.length?variants:[evaluateVariant(queryConcepts,queryChargrams,'')]).sort((a,b)=>
        b.score-a.score||b.coreCoverage-a.coreCoverage||b.weightedCoverage-a.weightedCoverage||b.matchedCount-a.matchedCount||b.lengthBalance-a.lengthBalance||b.structure-a.structure||b.characterSimilarity-a.characterSimilarity
      )[0];
      return{q:question,...best,matched:best.matches.map(item=>item.query.label)};
    }).sort((a,b)=>
      b.score-a.score||b.coreCoverage-a.coreCoverage||b.weightedCoverage-a.weightedCoverage||b.matchedCount-a.matchedCount||b.lengthBalance-a.lengthBalance||b.structure-a.structure||b.characterSimilarity-a.characterSimilarity||b.q.episode-a.q.episode
    ).slice(0,5);
  };

  renderResults=function(query){
    const list=rank(query),queryCount=list[0]?.queryCount||0;
    if(!queryCount){$('#results').innerHTML='<div class="warning">Otázka neobsahuje žádný tematický pojem. Doplňte například objekt, jev nebo odborný výraz.</div>';return;}
    $('#results').innerHTML=list.map((result,index)=>`<article class="result"><div class="result-head"><div><div class="meta">${index+1}. místo · díl ${result.q.episode} · ${esc(result.q.time||'bez času')}</div><h3>${esc(result.q.question_cs||result.q.question_sk)}</h3>${result.q.question_sk&&result.q.question_sk!==result.q.question_cs?`<div class="muted small">${esc(result.q.question_sk)}</div>`:''}</div><span class="score">${(100*result.score).toFixed(1)} %</span></div><div class="muted small" style="margin-top:8px">Společné pojmy: ${result.matchedCount} · položená otázka: ${result.queryCount} · nalezená otázka: ${result.candidateCount}.</div><div class="chips">${result.matched.length?result.matched.map(value=>`<span class="chip">${esc(value)}</span>`).join(''):'<span class="muted small">Nebyl nalezen žádný společný tematický pojem.</span>'}</div><div class="actions result-actions"><a class="question-link" href="${esc(directQuestionUrl(result.q))}" target="_blank" rel="noopener">Otevřít konkrétní otázku ↗</a></div></article>`).join('');
  };
})();
