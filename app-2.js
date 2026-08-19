function buildDf(index){
  state.df=new Map();state.corpusSize=Math.max(1,index.length);
  for(const entry of index){
    const keys=new Set(entry.concepts.map(c=>c.key));
    for(const key of keys)state.df.set(key,(state.df.get(key)||0)+1);
  }
}
function rarityWeight(key){
  const frequency=state.df.get(key)||0;
  const idf=Math.log((state.corpusSize+1)/(frequency+1))+1;
  return Math.max(1,Math.min(5.5,idf));
}

function pairKey(a,b){return a<b?`${a}\u0001${b}`:`${b}\u0001${a}`}
function addPairWeight(map,a,b,value){
  if(!a||!b||a===b||value<=0)return;
  const key=pairKey(a,b);map.set(key,(map.get(key)||0)+value);
}
function compactGraph(graph,maxNeighbors=18,minWeight=.10){
  for(const [key,neighbors] of graph){
    const kept=[...neighbors.entries()]
      .filter(([,weight])=>weight>=minWeight)
      .sort((a,b)=>b[1]-a[1])
      .slice(0,maxNeighbors);
    graph.set(key,new Map(kept));
  }
}
function buildCorpusRelations(index){
  /*
    Tato část opravdu projde celý corpus: každou otázku i neotázku.
    Učí dvě různé sítě:
    1) pojem -> pojem podle společného výskytu v položkách a epizodách,
    2) položka -> podobná položka podle váženého překryvu odborných pojmů.
    Obě sítě jsou pouze fallback; přímá textová shoda má vždy vyšší prioritu.
  */
  const pairWeights=new Map(), episodeDocs=new Map(), inverted=new Map(), totals=new Map();

  for(const entry of index){
    const titleKeys=new Set(conceptBundle(entry.title).map(c=>c.key));
    const unique=[...new Map(entry.concepts.map(c=>[c.key,c])).values()]
      .filter(c=>c.key.length>=3 && !c.modifier)
      .sort((a,b)=>{
        const ta=titleKeys.has(a.key)?1:0,tb=titleKeys.has(b.key)?1:0;
        return tb-ta || rarityWeight(b.key)-rarityWeight(a.key);
      })
      .slice(0,16);

    const keys=unique.map(c=>c.key);
    const weightByKey=new Map(keys.map(key=>[
      key,
      rarityWeight(key)*(titleKeys.has(key)?1.35:1)
    ]));

    // Vztahy uvnitř jedné otázky/neotázky jsou nejsilnější datový signál.
    for(let i=0;i<keys.length;i++)for(let j=i+1;j<keys.length;j++){
      const a=keys[i],b=keys[j];
      const titleFactor=titleKeys.has(a)&&titleKeys.has(b)?1:
        (titleKeys.has(a)||titleKeys.has(b)? .82 : .62);
      addPairWeight(pairWeights,a,b,titleFactor);
    }

    // Podklady pro slabší epizodní kontext.
    if(!episodeDocs.has(entry.item.episode))episodeDocs.set(entry.item.episode,new Map());
    const epMap=episodeDocs.get(entry.item.episode);
    for(const key of keys)epMap.set(key,(epMap.get(key)||0)+1);

    // Inverzní index pro item-item podobnost.
    let total=0;
    for(const [key,w] of weightByKey){
      const ww=w*w;total+=ww;
      if(!inverted.has(key))inverted.set(key,[]);
      inverted.get(key).push({id:entry.item.id,w});
    }
    totals.set(entry.item.id,total||1);
  }

  // Pojmy, které se opakují napříč několika částmi stejné epizody,
  // dostanou ještě slabou vazbu. To umí spojit například různé aspekty stejného tématu.
  for(const epMap of episodeDocs.values()){
    const keys=[...epMap.entries()]
      .sort((a,b)=>b[1]*rarityWeight(b[0])-a[1]*rarityWeight(a[0]))
      .slice(0,26);
    for(let i=0;i<keys.length;i++)for(let j=i+1;j<keys.length;j++){
      const [a,ca]=keys[i],[b,cb]=keys[j];
      if(ca<2&&cb<2)continue;
      const epWeight=.13*Math.min(3,Math.sqrt(ca*cb));
      addPairWeight(pairWeights,a,b,epWeight);
    }
  }

  const learned=new Map();
  const addLearned=(a,b,w)=>{
    if(!learned.has(a))learned.set(a,new Map());
    learned.get(a).set(b,Math.max(learned.get(a).get(b)||0,w));
  };
  const N=Math.max(1,index.length);
  for(const [pair,support] of pairWeights){
    const [a,b]=pair.split('\u0001'),fa=state.df.get(a)||1,fb=state.df.get(b)||1;
    const cosine=Math.min(1,support/Math.sqrt(fa*fb));
    const lift=Math.max(0,(support*N)/(fa*fb));
    const liftScore=Math.min(1,Math.log1p(lift)/Math.log(6));
    const supportScore=Math.min(1,Math.log1p(support)/Math.log(4));
    // Jednorázový výskyt může být relevantní, ale nikdy nesmí mít sílu ručně známé vazby.
    let score=.56*cosine+.26*liftScore+.18*supportScore;
    if(support<1.5)score*=.78;
    score=Math.min(.72,score);
    if(score<.14)continue;
    addLearned(a,b,score);addLearned(b,a,score*.97);
  }
  compactGraph(learned,20,.14);
  state.corpusGraph=learned;

  // Naučené hrany přidáme do společného sémantického grafu,
  // ale curated vědecké vazby mohou mít vyšší váhu.
  for(const [a,neighbors] of learned){
    for(const [b,w] of neighbors)addSemantic(a,b,w);
  }
  compactGraph(semanticGraph,26,.12);

  // Item-item síť: vážený kosinový překryv odborných pojmů.
  const accum=new Map();
  const addItemPair=(a,b,value)=>{
    if(a===b)return;
    const key=pairKey(a,b);accum.set(key,(accum.get(key)||0)+value);
  };
  const maxPosting=Math.max(32,Math.min(90,Math.floor(N*.14)));
  for(const [key,posting] of inverted){
    if(posting.length>maxPosting)continue; // příliš obecný pojem
    const rarity=rarityWeight(key);
    const conceptFactor=Math.min(8,rarity*rarity);
    for(let i=0;i<posting.length;i++)for(let j=i+1;j<posting.length;j++){
      addItemPair(posting[i].id,posting[j].id,Math.min(posting[i].w,posting[j].w)*conceptFactor);
    }
  }

  // I dvě položky bez stejného slova mohou být sousedé, pokud jejich odborné pojmy
  // spojuje silná hrana v naučené/kurátorované síti (např. foton ↔ laser/světlo).
  const processedConceptPairs=new Set();
  for(const [key,postingA] of inverted){
    if(postingA.length>maxPosting)continue;
    const related=[...(semanticGraph.get(key)||[])]
      .filter(([,edge])=>edge>=.34)
      .sort((a,b)=>b[1]-a[1]).slice(0,10);
    for(const [other,edge] of related){
      const pair=pairKey(key,other);
      if(processedConceptPairs.has(pair))continue;
      processedConceptPairs.add(pair);
      const postingB=inverted.get(other);
      if(!postingB||postingB.length>maxPosting)continue;
      for(const a of postingA)for(const b of postingB){
        if(a.id===b.id)continue;
        addItemPair(a.id,b.id,Math.min(a.w,b.w)*edge*3.0);
      }
    }
  }
  const neighbors=new Map();
  const addNeighbor=(a,b,w)=>{
    if(!neighbors.has(a))neighbors.set(a,new Map());
    neighbors.get(a).set(b,Math.max(neighbors.get(a).get(b)||0,w));
  };
  for(const [pair,shared] of accum){
    const [a,b]=pair.split('\u0001');
    const sim=shared/Math.sqrt((totals.get(a)||1)*(totals.get(b)||1));
    const score=Math.min(.90,sim*.58); // stále slabší než přímá shoda, ale dost silný pro tematické sousedy
    if(score<.06)continue;
    addNeighbor(a,b,score);addNeighbor(b,a,score);
  }
  compactGraph(neighbors,16,.06);
  state.neighborGraph=neighbors;

  let conceptEdges=0,itemEdges=0;
  for(const m of learned.values())conceptEdges+=m.size;
  for(const m of neighbors.values())itemEdges+=m.size;
  state.relationStats={conceptEdges:Math.floor(conceptEdges/2),itemEdges:Math.floor(itemEdges/2)};
}

function queryConceptWeight(concept,index,total){
  const position=total<=1?1:1.15-0.15*(index/(total-1));
  const role=concept.modifier?.28:(concept.phrase?1.9:1.55);
  return rarityWeight(concept.key)*position*role;
}

function matchConcepts(queryConcepts,candidateConcepts){
  const available=new Set(candidateConcepts.map((_,i)=>i));
  const matchedQueries=new Set(),matches=[];
  queryConcepts.forEach((query,qIndex)=>{
    const cIndex=candidateConcepts.findIndex((c,i)=>available.has(i)&&c.key===query.key);
    if(cIndex<0)return;
    available.delete(cIndex);matchedQueries.add(qIndex);
    matches.push({query,candidate:candidateConcepts[cIndex],qIndex,cIndex,similarity:1});
  });
  queryConcepts.forEach((query,qIndex)=>{
    if(matchedQueries.has(qIndex))return;
    let best=-1,bestScore=0;
    for(const cIndex of available){
      const s=conceptSimilarity(query,candidateConcepts[cIndex]);
      if(s>bestScore){bestScore=s;best=cIndex}
    }
    if(best<0||bestScore<=0)return;
    available.delete(best);
    matches.push({query,candidate:candidateConcepts[best],qIndex,cIndex:best,similarity:bestScore});
  });
  return matches.sort((a,b)=>a.qIndex-b.qIndex);
}

function structuralSimilarity(matches,queryCount,candidateCount){
  if(!matches.length)return 0;
  if(matches.length===1)return .55;
  let ordered=0,pairs=0;
  for(let i=0;i<matches.length;i++)for(let j=i+1;j<matches.length;j++){
    pairs++;if(matches[i].cIndex<matches[j].cIndex)ordered++;
  }
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
    const qp=match.qIndex/Math.max(1,queryCount-1);
    const cp=match.cIndex/Math.max(1,candidateCount-1);
    positionScore+=Math.max(0,1-Math.abs(qp-cp));
  }
  positionScore/=matches.length;
  return .45*orderScore+.30*gapScore+.25*positionScore;
}

function evaluateDirect(queryConcepts,queryChargrams,candidateConcepts,candidateText){
  const matches=matchConcepts(queryConcepts,candidateConcepts);
  const queryCount=queryConcepts.length,candidateCount=candidateConcepts.length;
  const weights=queryConcepts.map((c,i)=>queryConceptWeight(c,i,queryCount));
  const totalWeight=weights.reduce((s,v)=>s+v,0)||1;
  const matchedWeight=matches.reduce((s,m)=>s+weights[m.qIndex]*m.similarity,0);
  const weightedCoverage=matchedWeight/totalWeight;
  const coreIndices=queryConcepts.map((c,i)=>c.modifier?-1:i).filter(i=>i>=0);
  const matchedCore=new Set(matches.filter(m=>!m.query.modifier).map(m=>m.qIndex));
  const coreCoverage=coreIndices.length?matchedCore.size/coreIndices.length:1;
  const lengthBalance=queryCount&&candidateCount?Math.min(queryCount,candidateCount)/Math.max(queryCount,candidateCount):0;
  const structure=structuralSimilarity(matches,queryCount,candidateCount);
  const characterSimilarity=dice(queryChargrams,ngrams(candidateText));
  const lengthFactor=.62+.38*lengthBalance;
  const structureFactor=.86+.14*structure;
  const coreFactor=coreIndices.length?.08+.92*coreCoverage:1;
  let score=Math.max(0,Math.min(1,weightedCoverage*lengthFactor*structureFactor*coreFactor));
  if(coreIndices.length&&!matchedCore.size)score=Math.min(score,.06);
  return{score,weightedCoverage,coreCoverage,lengthBalance,structure,characterSimilarity,matches,queryCount,candidateCount};
}

function evaluateSemantic(queryConcepts,candidateConcepts){
  if(!queryConcepts.length||!candidateConcepts.length)return{score:0,matches:[]};
  const candidateKeys=new Map(candidateConcepts.map(c=>[c.key,c]));
  const weights=queryConcepts.map((c,i)=>queryConceptWeight(c,i,queryConcepts.length));
  const totalWeight=weights.reduce((s,v)=>s+v,0)||1;
  let sum=0;const matches=[];
  queryConcepts.forEach((q,qi)=>{
    if(candidateKeys.has(q.key))return; // přímá shoda patří do direct score
    let bestKey='',bestWeight=0;
    for(const [related,w] of semanticCandidates(q.key)){
      if(candidateKeys.has(related)&&w>bestWeight){bestWeight=w;bestKey=related}
    }
    if(bestKey){
      sum+=weights[qi]*bestWeight;
      matches.push({query:q,candidate:candidateKeys.get(bestKey),weight:bestWeight});
    }
  });
  return{score:Math.min(1,sum/totalWeight),matches};
}

