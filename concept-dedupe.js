'use strict';

// Sloučí skloňované, české a slovenské varianty stejného výrazu do jednoho pojmu.
// Např. hvezda / hviezda / hvezd / hviezd se ve skóre započítají pouze jednou.
(()=>{
  if(globalThis.__vedatorConceptDedupe)return;
  globalThis.__vedatorConceptDedupe=true;

  const originalTermSet=termSet;
  const parent=new Map();
  const depth=new Map();

  const add=value=>{
    const key=String(value||'').trim();
    if(key&&!parent.has(key)){parent.set(key,key);depth.set(key,0)}
    return key;
  };
  const find=value=>{
    const key=add(value);
    if(!key)return'';
    const p=parent.get(key);
    if(p!==key)parent.set(key,find(p));
    return parent.get(key);
  };
  const union=(a,b)=>{
    let ra=find(a),rb=find(b);
    if(!ra||!rb||ra===rb)return;
    const da=depth.get(ra)||0,db=depth.get(rb)||0;
    if(da<db)[ra,rb]=[rb,ra];
    parent.set(rb,ra);
    if(da===db)depth.set(ra,da+1);
  };
  const forms=value=>{
    const normalized=norm(value);
    if(!normalized)return[];
    const tokens=normalized.split(/\s+/).filter(Boolean);
    const stemmed=tokens.map(stem).join(' ');
    return [...new Set([normalized,stemmed].filter(Boolean))];
  };

  // Nejdřív vytvoříme propojené skupiny. Sdílený kořen spojí i jednotné a množné číslo.
  for(const group of EQUIV){
    const variants=group.flatMap(forms);
    for(const variant of variants)add(variant);
    for(let i=1;i<variants.length;i++)union(variants[0],variants[i]);
  }

  // Jako zobrazovaný klíč použijeme první (zpravidla českou) variantu první skupiny.
  const labelByRoot=new Map();
  for(const group of EQUIV){
    const first=forms(group[0])[0];
    const root=find(first);
    if(root&&!labelByRoot.has(root))labelByRoot.set(root,norm(group[0]));
  }
  const aliases=new Map();
  for(const variant of parent.keys()){
    const root=find(variant);
    aliases.set(variant,labelByRoot.get(root)||variant);
  }

  function canonicalConcept(value){
    const normalized=norm(value);
    if(!normalized)return'';
    const stemmed=normalized.split(/\s+/).filter(Boolean).map(stem).join(' ');
    return aliases.get(normalized)||aliases.get(stemmed)||stemmed||normalized;
  }
  function canonicalConceptSet(values){
    return new Set([...values].map(canonicalConcept).filter(Boolean));
  }

  termSet=function(...texts){
    return canonicalConceptSet(originalTermSet(...texts));
  };

  globalThis.vedatorCanonicalConcept=canonicalConcept;
})();
