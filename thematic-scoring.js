'use strict';

// Tematické filtrování a vyvážené skóre podobnosti.
// 100 % znamená: stejné tematické pojmy a stejný počet tematických pojmů.
(()=>{
  if(globalThis.__vedatorThematicScoring)return;
  globalThis.__vedatorThematicScoring=true;

  // Jen uzavřené gramatické třídy a netematické tázací výrazy.
  // Přídavná jména (fyzikální, viditelný, pozorovatelný, největší...) zde úmyslně nejsou.
  const FUNCTION_WORDS=`
  a i ani nebo anebo ci či ale avsak avšak vsak však nybrz nýbrž protoze protože ponevadz poněvadž jelikoz jelikož kdyz když kdyby jestli jestlize jestliže pokud aby takze takže tedy tudiz tudíž proto presto přesto zatimco zatímco
  v ve na do od z ze s se k ke ku u o po pro proti pres přes skrz pred před za pod nad mezi kolem okolo bez kvuli kvůli diky díky podle behem během mimo vedle
  jak proc proč kdy kde kam odkud kudy co kdo koho komu cim čím cem čem ktery který ktera která ktere které kteri kteří jaky jaký jaka jaká jake jaké ci čí kolik zda zdali
  ten ta to ti ty te té tom tim tím tento tato toto tihle tyhle tohle tamten tamta tamto
  ja já ty on ona ono my vy oni ony me mě mne mi mně tebe te tě ti jej jeho ji jí nam nám vas vás jim
  se si svuj svůj svoje sve své
  jen jenom pouze take také taky jeste ještě uz už jiz již prave právě vubec vůbec vlastne vlastně proste prostě prece přece snad asi mozna možná treba třeba
  ano ne nikoli
  by bych bys bychom byste bude budou byl byla bylo byli byt být jsem jsi jsme jste jsou je
  ma má mam mám mas máš maji mají mel měl mela měla meli měli mit mít
  muze může mohou mohl mohla mohli lze

  a aj ani alebo ci či ale avsak avšak vsak však lebo pretoze pretože ked keď keby ak pokial pokiaľ aby takze takže teda cize čiže preto napriek zatialco zatiaľčo
  v vo na do od z zo s so k ku u o po pre proti cez skrz pred za pod nad medzi okolo bez kvoli kvôli vdaka vďaka podla podľa pocas počas mimo vedla vedľa
  ako preco prečo kedy kde kam odkial odkiaľ kadial kadiaľ co čo kto koho komu cim čím com čom ktory ktorý ktora ktorá ktore ktoré ktorí aky aký aka aká ake aké ci čí kolko koľko ci či
  ten ta to ti tie tej tom tym tým tento tato táto toto títo tieto tamten tamta tamto
  ja ty on ona ono my vy oni ony ma mna mňa mi teba ta ťa ti jej jeho ju nam nám vas vás im
  sa si svoj svoje
  len iba tiez tiež este ešte uz už prave práve vobec vôbec vlastne vlastne jednoducho proste predsa snad snáď asi mozno možno napriklad napríklad
  ano áno nie
  by som si sme ste bude budu budú bol bola bolo boli byt byť je su sú
  ma má mam mám mas máš maju majú mal mala mali mat mať
  moze môže mozu môžu mohol mohla mohli da sa dá
  `.split(/\s+/).map(norm).filter(Boolean);

  for(const word of FUNCTION_WORDS)STOP.add(word);

  const canonical=value=>{
    const normalized=norm(value);
    if(!normalized)return'';
    return typeof globalThis.vedatorCanonicalConcept==='function'
      ?globalThis.vedatorCanonicalConcept(normalized)
      :stem(normalized);
  };

  function conceptBundle(text){
    const tokens=String(text||'').match(/[\p{L}\p{N}]+/gu)||[];
    const seen=new Set(),out=[];
    for(const raw of tokens){
      const normalized=norm(raw);
      if(!normalized||normalized.length<2||STOP.has(normalized))continue;
      const key=canonical(normalized);
      if(!key||STOP.has(key)||seen.has(key))continue;
      seen.add(key);
      out.push({key,label:raw.toLocaleLowerCase('cs-CZ')});
    }
    return out;
  }

  function conceptSimilarity(a,b){
    if(a===b)return 1;
    if(Math.min(a.length,b.length)<5)return 0;
    const similarity=dice(ngrams(a,2),ngrams(b,2));
    return similarity>=0.84?similarity:0;
  }

  function matchConcepts(queryConcepts,candidateConcepts){
    const available=new Set(candidateConcepts.map((_,index)=>index));
    const matches=[];

    // Nejdřív přesné shody.
    for(const query of queryConcepts){
      const index=candidateConcepts.findIndex((candidate,i)=>available.has(i)&&candidate.key===query.key);
      if(index>=0){available.delete(index);matches.push(query);}
    }

    // Potom jen velmi blízké překlepy; jeden pojem lze použít pouze jednou.
    for(const query of queryConcepts){
      if(matches.includes(query))continue;
      let bestIndex=-1,bestScore=0;
      for(const index of available){
        const score=conceptSimilarity(query.key,candidateConcepts[index].key);
        if(score>bestScore){bestScore=score;bestIndex=index;}
      }
      if(bestIndex>=0){available.delete(bestIndex);matches.push(query);}
    }
    return matches;
  }

  function evaluateVariant(queryConcepts,queryChargrams,candidateText){
    const candidateConcepts=conceptBundle(candidateText);
    const matches=matchConcepts(queryConcepts,candidateConcepts);
    const matchedCount=matches.length;
    const queryCount=queryConcepts.length;
    const candidateCount=candidateConcepts.length;
    const coverage=queryCount?matchedCount/queryCount:0;
    const precision=candidateCount?matchedCount/candidateCount:0;

    // Harmonický průměr pokrytí a přesnosti (F1 / Sørensen–Dice).
    // Trestá chybějící pojmy i nadbytečné pojmy dlouhé nalezené otázky.
    const score=(coverage+precision)?2*coverage*precision/(coverage+precision):0;
    const lengthBalance=queryCount&&candidateCount
      ?Math.min(queryCount,candidateCount)/Math.max(queryCount,candidateCount)
      :0;
    const characterSimilarity=dice(queryChargrams,ngrams(candidateText));

    return{
      score,
      coverage,
      precision,
      lengthBalance,
      characterSimilarity,
      matches,
      matchedCount,
      queryCount,
      candidateCount
    };
  }

  rank=function(query){
    const queryConcepts=conceptBundle(query);
    const queryChargrams=ngrams(query);

    return questions.map(question=>{
      // Českou a slovenskou verzi hodnotíme odděleně, aby se jejich slova
      // nesčítala a uměle neprodlužovala nalezenou otázku.
      const variants=[question.question_cs,question.question_sk]
        .map(value=>String(value||'').trim())
        .filter((value,index,array)=>value&&array.indexOf(value)===index)
        .map(text=>({...evaluateVariant(queryConcepts,queryChargrams,text),text}));

      const best=(variants.length?variants:[evaluateVariant(queryConcepts,queryChargrams,'')])
        .sort((a,b)=>
          b.score-a.score||
          b.matchedCount-a.matchedCount||
          b.lengthBalance-a.lengthBalance||
          b.characterSimilarity-a.characterSimilarity
        )[0];

      return{
        q:question,
        ...best,
        matched:best.matches.map(item=>item.label)
      };
    }).sort((a,b)=>
      b.score-a.score||
      b.matchedCount-a.matchedCount||
      b.lengthBalance-a.lengthBalance||
      b.coverage-a.coverage||
      b.characterSimilarity-a.characterSimilarity||
      b.q.episode-a.q.episode
    ).slice(0,5);
  };

  renderResults=function(query){
    const list=rank(query);
    const queryCount=list[0]?.queryCount||0;
    if(!queryCount){
      $('#results').innerHTML='<div class="warning">Otázka neobsahuje žádný tematický pojem. Doplňte například objekt, jev nebo odborný výraz.</div>';
      return;
    }
    $('#results').innerHTML=list.map((result,index)=>`<article class="result"><div class="result-head"><div><div class="meta">${index+1}. místo · díl ${result.q.episode} · ${esc(result.q.time||'bez času')}</div><h3>${esc(result.q.question_cs||result.q.question_sk)}</h3>${result.q.question_sk&&result.q.question_sk!==result.q.question_cs?`<div class="muted small">${esc(result.q.question_sk)}</div>`:''}</div><span class="score">${(100*result.score).toFixed(1)} %</span></div><div class="muted small" style="margin-top:8px">Společné pojmy: ${result.matchedCount} · položená otázka: ${result.queryCount} · nalezená otázka: ${result.candidateCount}.</div><div class="chips">${result.matched.length?result.matched.map(value=>`<span class="chip">${esc(value)}</span>`).join(''):'<span class="muted small">Nebyl nalezen žádný společný tematický pojem.</span>'}</div><div class="actions result-actions"><a class="question-link" href="${esc(directQuestionUrl(result.q))}" target="_blank" rel="noopener">Otevřít konkrétní otázku ↗</a></div></article>`).join('');
  };

  // Při rychlém načtení z localStorage mohla být databáze sestavena ještě před tímto filtrem.
  // Přepočítáme proto klíčová slova i tabulku jednou znovu.
  if(Array.isArray(questions)&&questions.length){
    const rows=questions.map(question=>({
      episode:question.episode,order:question.order,time:question.time,
      link_seconds:question.link_seconds,title:question.title,
      question_cs:question.question_cs,question_sk:question.question_sk,
      source:question.source
    }));
    questions=buildIndex(rows);
    if(typeof renderTable==='function')renderTable(questions);
    const visible=$('#visibleCount');
    if(visible)visible.textContent=`${questions.length} položek`;
  }
})();
