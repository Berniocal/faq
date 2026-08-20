'use strict';
/*
  Žluté zvýraznění shod ve výsledcích.
  Přímé synonymum i skutečně použitý tematicky příbuzný pojem se zvýrazní
  v názvu i v popisku. Pokud je zásah níž ve sbaleném popisku, zobrazí se
  krátký výřez s nalezeným místem — bez vnitřního scrollování karty.
*/
(()=>{
  if(typeof window.render!=='function')return;
  const baseRender=window.render;

  const formsByKey=new Map();
  for(const [canonicalRaw,forms] of MAPS.equivalents||[]){
    const key=canon(canonicalRaw);
    if(!formsByKey.has(key))formsByKey.set(key,new Set());
    const set=formsByKey.get(key);
    set.add(String(canonicalRaw));
    for(const form of forms||[])set.add(String(form));
  }

  function highlightKeys(result){
    const keys=new Set();
    const qTerms=extractTerms(state.query,{query:true});
    for(const q of qTerms){
      if(result.entry.termSet.has(q.key))keys.add(q.key);
      for(const [related] of semanticGraph.get(q.key)||[]){
        if(result.entry.termSet.has(related))keys.add(related);
      }
    }
    return keys;
  }

  function tokenKeysFor(result){
    const out=new Set();
    const keys=highlightKeys(result);
    const addToken=token=>{
      const n=norm(token);
      if(!n||n.length<2)return;
      out.add(canon(n));
      out.add(n);
    };
    for(const key of keys){
      addToken(key);
      const forms=formsByKey.get(key);
      if(forms){
        for(const form of forms){
          for(const token of String(form).match(/[\p{L}\p{N}]+/gu)||[])addToken(token);
        }
      }else{
        for(const token of String(key).match(/[\p{L}\p{N}]+/gu)||[])addToken(token);
      }
    }
    for(const q of extractTerms(state.query,{query:true}))addToken(q.label);
    return out;
  }

  function markText(root,keys){
    if(!root||!keys.size)return 0;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{
      acceptNode(node){
        if(!node.nodeValue?.trim())return NodeFilter.FILTER_REJECT;
        if(node.parentElement?.closest('mark.search-hit'))return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    let total=0;
    for(const node of nodes){
      const text=node.nodeValue;
      const re=/[\p{L}\p{N}]+/gu;
      const matches=[...text.matchAll(re)].filter(m=>{
        const raw=m[0],n=norm(raw),c=canon(raw);
        return raw.length>=2&&(keys.has(c)||keys.has(n));
      });
      if(!matches.length)continue;
      const frag=document.createDocumentFragment();
      let pos=0;
      for(const m of matches){
        const at=m.index??0;
        frag.append(document.createTextNode(text.slice(pos,at)));
        const mark=document.createElement('mark');
        mark.className='search-hit';
        mark.textContent=m[0];
        frag.append(mark);
        pos=at+m[0].length;
        total++;
      }
      frag.append(document.createTextNode(text.slice(pos)));
      node.replaceWith(frag);
    }
    return total;
  }

  function removePreview(card){
    card?.querySelector(':scope > .match-preview')?.remove();
  }

  function ensureMatchPreview(card,answer){
    removePreview(card);
    if(!card||!answer||!answer.classList.contains('collapsed'))return;
    const hit=answer.querySelector('mark.search-hit');
    if(!hit)return;

    requestAnimationFrame(()=>{
      if(!answer.isConnected||!answer.classList.contains('collapsed'))return;
      const a=answer.getBoundingClientRect();
      const h=hit.getBoundingClientRect();
      const clipped=h.bottom>a.bottom+1||h.top<a.top-1;
      if(!clipped)return;

      const preview=document.createElement('div');
      preview.className='match-preview';
      const label=document.createElement('div');
      label.className='match-preview-label';
      label.textContent=state.lang==='sk'?'Nájdené v popise':'Nalezeno v popisku';
      preview.append(label);

      const li=hit.closest('li');
      if(li){
        const ul=document.createElement('ul');
        ul.append(li.cloneNode(true));
        preview.append(ul);
      }else{
        const line=document.createElement('div');
        line.className='match-preview-text';
        line.append(hit.parentElement?.cloneNode(true)||hit.cloneNode(true));
        preview.append(line);
      }
      answer.before(preview);
    });
  }

  function enhanceCards(){
    if(!state.query)return;
    const visible=state.ranked.slice(0,state.visible);
    const byId=new Map(visible.map(r=>[r.entry.item.id,r]));
    for(const card of $$('#results .card[data-id]')){
      const result=byId.get(card.dataset.id);
      if(!result)continue;
      const keys=tokenKeysFor(result);
      markText(card.querySelector('h2'),keys);
      const answer=card.querySelector('.answer');
      const answerHits=markText(answer,keys);
      if(answerHits)ensureMatchPreview(card,answer);

      const button=card.querySelector('.more-answer');
      if(button&&answer){
        button.addEventListener('click',()=>{
          requestAnimationFrame(()=>{
            if(answer.classList.contains('collapsed'))ensureMatchPreview(card,answer);
            else removePreview(card);
          });
        });
      }
    }
  }

  window.render=function(){
    baseRender();
    enhanceCards();
  };
})();
