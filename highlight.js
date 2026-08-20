'use strict';
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

  function resetAnswerFocus(answer){
    if(!answer)return;
    answer.classList.remove('match-focused');
    answer.style.removeProperty('--match-shift');
  }

  function focusFirstAnswerHit(answer){
    if(!answer||!answer.classList.contains('collapsed')){
      resetAnswerFocus(answer);
      return;
    }
    const hit=answer.querySelector('mark.search-hit');
    if(!hit){
      resetAnswerFocus(answer);
      return;
    }

    answer.classList.add('match-focused');
    answer.style.setProperty('--match-shift','0px');

    requestAnimationFrame(()=>{
      if(!answer.isConnected||!answer.classList.contains('collapsed'))return;
      const content=answer.querySelector(':scope > ul');
      if(!content)return;

      const box=answer.getBoundingClientRect();
      const hitBox=hit.getBoundingClientRect();

      if(hitBox.top>=box.top-1 && hitBox.bottom<=box.bottom+1){
        answer.style.setProperty('--match-shift','0px');
        return;
      }

      const visible=Math.max(1,answer.clientHeight);
      const contentHeight=Math.max(visible,content.scrollHeight);
      const maxShift=Math.max(0,contentHeight-visible);
      const relativeTop=hitBox.top-box.top;
      const desiredTop=Math.max(8,visible*.30);
      const shift=Math.min(maxShift,Math.max(0,relativeTop-desiredTop));
      answer.style.setProperty('--match-shift',`${-Math.round(shift)}px`);
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
      if(answerHits)focusFirstAnswerHit(answer);
      else resetAnswerFocus(answer);

      const button=card.querySelector('.more-answer');
      if(button&&answer){
        button.addEventListener('click',()=>{
          requestAnimationFrame(()=>{
            if(answer.classList.contains('collapsed'))focusFirstAnswerHit(answer);
            else resetAnswerFocus(answer);
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
