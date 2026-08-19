'use strict';

const MAPS = window.VEDATOR_SEARCH_MAPS || {equivalents:[],queryPhrases:[],semanticEdges:[]};
const DATA_URLS = [
  'https://cdn.jsdelivr.net/gh/Berniocal/vedator@main/content-v2.json',
  'https://raw.githubusercontent.com/Berniocal/vedator/main/content-v2.json',
  './content-v2.json'
];

const state = {
  data:null,
  items:[],
  index:[],
  episodeMap:new Map(),
  df:new Map(),
  postings:new Map(),
  corpusSize:1,
  lang:(()=>{try{return localStorage.getItem('vedator-ui-language-v1')==='sk'?'sk':'cz'}catch{return'cz'}})(),
  filter:'all',
  query:'',
  ranked:[],
  visible:30,
  currentItem:null,
  ready:false
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = v => String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = value => String(value??'')
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

const STOP = new Set(norm(`
a aby aj ale anebo ani ano asi az bez bude budou byl byla byli bylo by bych bychom byste
co coz ci do ho i jak jako je jej jeho jejich jen jenom ji jich jim jimi jinak jiz k kam kde kdy kdo
ktera ktere ktery kterou kterym kterych jaky jaka jake jakou jakem jakeho jakych kolik ku ma maji mezi mi mit mne mnou muze na nad nam nami ne nebo nech neni nez nic
o od on ona oni ono pak po pod podle pokud pro proc proto pri pred pres se si sice svoji sve svuj
ta tak take tam ten tento te tim to toto tu ty u uz v vam vami ve velmi vy z za ze priblizne zhruba asi
a ako ano bez bude budu bol bola boli bolo byt som sme ste co ci ich im inak jej jeho len medzi
ma maju moct moze nie alebo podla pokial pre preco preto pri pred cez sa svoj svoje vo zo aky aka ake aku akou akom akeho ktory ktora ktore kolko približne priblizne
`).split(/\s+/).filter(Boolean));

const SUFFIXES = `
ovymi evymi ovych evych oveho eveho ovemu evemu ovami evami ovou evou
ami emi imi omi ach ech ich och iach iami atami enami
ovani anie enie enia eniu ujeji ujici ujuci
ujeme ujete ujem uje aju ali ala alo ate eti ity oti eni ena eno ily ila ilo ete ite
skymi ckymi skeho ckeho skemu ckemu skych ckych
nosti nostiach eho iho ymi imi omu ych ou em am ym im om um
ovy ova ove ovi ovu ev sk ck y i a e u o
`.trim().split(/\s+/).map(norm).filter(Boolean).sort((a,b)=>b.length-a.length);

function stem(word){
  let w=norm(word);
  if(w.length<5)return w;
  for(const s of SUFFIXES){
    if(w.endsWith(s) && w.length-s.length>=4){w=w.slice(0,-s.length);break;}
  }
  return w;
}

const alias=new Map();
const phraseAliases=[];
for(const [canonicalRaw,forms] of MAPS.equivalents){
  const canonical=norm(canonicalRaw);
  const all=[canonicalRaw,...forms];
  alias.set(canonical,canonical);
  alias.set(stem(canonical),canonical);
  for(const formRaw of all){
    const form=norm(formRaw);
    if(!form)continue;
    if(form.includes(' ')) phraseAliases.push([form,canonical]);
    else {
      alias.set(form,canonical);
      alias.set(stem(form),canonical);
    }
  }
}
phraseAliases.sort((a,b)=>b[0].length-a[0].length);

const queryPhrases=[];
for(const [canonicalRaw,forms] of MAPS.queryPhrases){
  const canonical=norm(canonicalRaw);
  for(const formRaw of forms){
    const form=norm(formRaw);
    if(form)queryPhrases.push([form,canonical]);
  }
}
queryPhrases.sort((a,b)=>b[0].length-a[0].length);

const semanticGraph=new Map();
function addSemantic(a,b,w){
  a=canon(a);b=canon(b);
  if(!semanticGraph.has(a))semanticGraph.set(a,new Map());
  const m=semanticGraph.get(a);
  m.set(b,Math.max(m.get(b)||0,w));
}
for(const [a,b,w] of MAPS.semanticEdges){addSemantic(a,b,w);addSemantic(b,a,w*.94);}

function canon(value){
  const n=norm(value);
  return alias.get(n)||alias.get(stem(n))||stem(n);
}

function hasPhrase(haystack,phrase){
  return (` ${haystack} `).includes(` ${phrase} `);
}

function extractTerms(text,{query=false}={}){
  const normalized=norm(text);
  if(!normalized)return[];
  const out=[],seen=new Set();
  const add=(key,label,kind='word')=>{
    key=canon(key);
    if(!key||seen.has(key))return;
    seen.add(key);out.push({key,label:label||key,kind});
  };

  // Nejprve víceslovné odborné ekvivalence.
  for(const [phrase,key] of phraseAliases){
    if(hasPhrase(normalized,phrase))add(key,phrase,'phrase');
  }

  // Potom význam otázky: „kolik váží“ = hmotnost, „jak dlouho“ = trvání atd.
  if(query){
    for(const [phrase,key] of queryPhrases){
      if(hasPhrase(normalized,phrase))add(key,phrase,'intent');
    }
  }

  const tokens=normalized.split(/\s+/).filter(Boolean);
  for(const token of tokens){
    if(token.length<2||STOP.has(token))continue;
    const key=canon(token);
    if(!key||STOP.has(key))continue;
    add(key,token,'word');
  }
  return out;
}

function parseTime(value){
  const p=String(value||'').match(/\d{1,2}:\d{2}(?::\d{2})?/)?.[0].split(':').map(Number);
  if(!p)return 0;
  return p.length===3?p[0]*3600+p[1]*60+p[2]:p[0]*60+p[1];
}

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

function buildIndex(items){
  state.df=new Map();
  state.postings=new Map();
  const index=items.map((item,idx)=>{
    const title=[item.cs.title,item.sk.title].join(' ');
    const full=[item.cs.title,...item.cs.points,item.sk.title,...item.sk.points].join(' ');
    const titleTerms=extractTerms(title,{query:true});
    const bodyTerms=extractTerms(full);
    const byKey=new Map();
    for(const t of [...titleTerms,...bodyTerms])if(!byKey.has(t.key))byKey.set(t.key,t);
    const terms=[...byKey.values()];
    const termSet=new Set(terms.map(t=>t.key));
    const titleSet=new Set(titleTerms.map(t=>t.key));
    for(const key of termSet){
      state.df.set(key,(state.df.get(key)||0)+1);
      if(!state.postings.has(key))state.postings.set(key,[]);
      state.postings.get(key).push(idx);
    }
    return {item,title,full,normTitle:norm(title),normFull:norm(full),terms,termSet,titleSet};
  });
  state.corpusSize=Math.max(1,index.length);
  return index;
}

function idf(key){
  const df=state.df.get(key)||0;
  return Math.max(1,Math.min(5.2,Math.log((state.corpusSize+1)/(df+1))+1));
}

const INTENT_IMPORTANCE=new Map([
  ['hmotnost',.95],['trvani',.92],['vzdalenost',.92],['rychlost',.92],['vek',.90],
  ['velikost',.90],['delka',.92],['vyska',.92],['hloubka',.92],['sirka',.92],['plocha',.90],['objem',.90],
  ['teplota',.92],['pocet',.88],['frekvence',.90],['cena',.90],['spotreba',.90],['produkce',.88],
  ['slozeni',.72],['material',.72],['princip',.72],['ucel',.66],['definice',.45],['pricina',.66],['vznik',.70],
  ['poloha',.66],['rozdil',.72],['moznost',.52],['dusledek',.64],['mereni',.68],['vypocet',.68],
  ['nazev',.55],['puvod',.62],['vliv',.68],['metoda',.62]
]);
function queryWeight(term){
  return idf(term.key)*(term.kind==='intent'?(INTENT_IMPORTANCE.get(term.key)??.70):1);
}

function queryCandidates(qTerms,qNorm){
  const ids=new Set();
  const keys=qTerms.map(t=>t.key);
  for(const key of keys){
    for(const id of state.postings.get(key)||[])ids.add(id);
    for(const [related] of semanticGraph.get(key)||[]){
      for(const id of state.postings.get(related)||[])ids.add(id);
    }
  }

  // Přesná fráze má absolutní prioritu, proto ji dohledáme i mimo postings.
  if(qNorm.length>=3){
    state.index.forEach((e,i)=>{
      if(e.normTitle.includes(qNorm)||e.normFull.includes(qNorm))ids.add(i);
    });
  }

  // U velmi krátkého/obecného dotazu raději zkontrolujeme vše.
  if(!ids.size || ids.size<8){
    for(let i=0;i<state.index.length;i++)ids.add(i);
  }
  return ids;
}

function semanticScore(qTerms,entry){
  let weighted=0,total=0;const matches=[];
  for(const q of qTerms){
    const qw=queryWeight(q);total+=qw;
    if(entry.termSet.has(q.key))continue;
    let best=0,bestKey='';
    for(const [related,w] of semanticGraph.get(q.key)||[]){
      if(entry.termSet.has(related)&&w>best){best=w;bestKey=related;}
    }
    if(best){weighted+=qw*best;matches.push(`${q.label} → ${bestKey}`);}
  }
  return {score:total?weighted/total:0,matches};
}

function rank(query){
  const qNorm=norm(query);
  if(!qNorm)return[];
  const qTerms=extractTerms(query,{query:true});
  if(!qTerms.length)return[];
  const candidates=queryCandidates(qTerms,qNorm);
  const qWeightTotal=qTerms.reduce((s,t)=>s+queryWeight(t),0)||1;
  const results=[];

  for(const idx of candidates){
    const entry=state.index[idx],item=entry.item;
    if(state.filter!=='all'&&item.type!==state.filter)continue;

    const exactTitle=entry.normTitle.includes(qNorm);
    const exactAny=entry.normFull.includes(qNorm);
    let directWeight=0,titleWeight=0,directCount=0;
    const matched=[];
    for(const q of qTerms){
      const w=queryWeight(q);
      if(entry.termSet.has(q.key)){
        directWeight+=w;directCount++;matched.push(q.label);
        if(entry.titleSet.has(q.key))titleWeight+=w;
      }
    }
    const coverage=directWeight/qWeightTotal;
    const titleCoverage=titleWeight/qWeightTotal;
    const semantic=semanticScore(qTerms,entry);

    let tier=99,reason='';
    if(exactTitle){tier=0;reason='exact-title';}
    else if(exactAny){tier=1;reason='exact-any';}
    else if(coverage>=.78){tier=2;reason='same-meaning';}
    else if(coverage>=.42 && directCount>=1){tier=3;reason='direct';}
    else if(semantic.score>=.42){tier=4;reason='semantic';}
    else if(coverage>=.18 && directCount>=1){tier=5;reason='weak-direct';}
    else if(semantic.score>=.20){tier=6;reason='distant-semantic';}
    if(tier===99)continue;

    let score=.68*coverage+.20*titleCoverage+.12*semantic.score;
    if(exactAny)score=Math.max(score,.86);
    if(exactTitle)score=Math.max(score,.97);
    if(reason==='same-meaning')score=Math.max(score,.72+.18*titleCoverage);
    score=Math.min(1,score);
    results.push({entry,score,tier,reason,coverage,titleCoverage,semantic,matchedDirect:[...new Set(matched)]});
  }

  return results.sort((a,b)=>
    a.tier-b.tier || b.score-a.score || b.titleCoverage-a.titleCoverage ||
    b.coverage-a.coverage || b.entry.item.episode-a.entry.item.episode || a.entry.item.order-b.entry.item.order
  );
}
