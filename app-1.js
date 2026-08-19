
'use strict';

/* ============================================================
   Vedátor – chytré hledání
   Základ: princip matcheru z dřívějšího FAQ / Google-Sheets řešení:
   normalizace -> stopslova -> stemming/tvary -> ekvivalence ->
   IDF váha odborných pojmů -> strukturní podobnost.
   Nová vrstva: tematický graf příbuzných pojmů s nižší vahou.
   ============================================================ */

const DATA_URLS = [
  './content-v2.json',
  'https://raw.githubusercontent.com/Berniocal/vedator/main/content-v2.json',
  'https://cdn.jsdelivr.net/gh/Berniocal/vedator@main/content-v2.json'
];

const state = {
  data:null, items:[], index:[], episodeMap:new Map(), df:new Map(), corpusSize:1,
  corpusGraph:new Map(), neighborGraph:new Map(), relationStats:{conceptEdges:0,itemEdges:0},
  lang:(()=>{try{return localStorage.getItem('vedator-ui-language-v1')==='sk'?'sk':'cz'}catch{return'cz'}})(),
  filter:'all', query:'', ranked:[], visible:30, currentItem:null
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
ktera ktere ktery ku ma maji mezi mi mit mne mnou muze na nad nam nami ne nebo nech neni nez nic
o od on ona oni ono pak po pod podle pokud pro proc proto pri pred pres se si sice svoji sve svuj
ta tak take tam ten tento te tim to toto tu ty u uz v vam vami ve velmi vy z za ze ze
ako ano az bez bude budu bol bola boli bolo byt by som sme ste co ci do ho ich im inak je jej jeho
len medzi ma maju mi moct moze na nad nam nami ne nie alebo nic o od on ona oni ono po pod podla
pokial pre preco preto pri pred cez sa si sme som svoj svoje ta tak tam ten tento tej tym to toto
tu tie u uz v vam vami vo vy z za zo
`).split(/\s+/).filter(Boolean));

const SUFFIXES = `
ovymi evymi ovych evych oveho eveho ovemu evemu ovami evami ovou evou
ami emi imi omi ach ech ich och iach iami atami enami
ovani ovaní anie enie enia eniu
ujeme ujete ujem uje ujici ujuci
aju ali ala alo ate eti ity oti eni ena eno ily ila ilo ete ite
skymi ckymi skeho ckeho skemu ckemu skych ckych
nosti nostiach
eho iho ymi imi ami omu ych ach ech och ou em am ym im om um
ovy ova ove ovi ovu ev sk ck
u a e i y o ia ie iu
`.trim().split(/\s+/).map(norm).filter(Boolean).sort((a,b)=>b.length-a.length);

function stem(word){
  let w=norm(word);
  if(w.length<5)return w;
  for(const s of SUFFIXES){
    if(s && w.endsWith(s) && w.length-s.length>=4){ w=w.slice(0,-s.length); break; }
  }
  return w;
}

const FUNCTION_WORDS = norm(`
a i ani nebo anebo ci ale avsak vsak nybrz protoze ponevadz jelikoz kdyz kdyby jestli pokud aby
takze tedy tudiz proto presto zatimco v ve na do od z ze s se k ke ku u o po pro proti pres skrz
pred za pod nad mezi kolem okolo bez kvuli diky podle behem mimo vedle jak proc kdy kde kam odkud
kudy co kdo koho komu cim cem ktery ktera ktere kteri jaky jaka jake ci kolik zda zdali ten ta to
ti ty te tom tim tento tato toto tamten tamta tamto ja ty on ona ono my vy oni ony me mne mi tebe
te ti jej jeho ji nam vas jim se si svuj svoje sve jen jenom pouze take taky jeste uz jiz prave
vubec vlastne proste prece snad asi mozna treba ano ne nikoli by bych bys bychom byste bude budou
byl byla bylo byli byt jsem jsi jsme jste jsou je ma mam mas maji mel mela meli mit muze mohou mohl
mohla mohli lze
aj alebo avsak lebo pretoze ked keby ak pokial takze teda cize napriek zatialco vo zo so pre cez
kvoli vdaka podla pocas vedla ako preco kedy odkial kadial co kto com ktory ktora ktore ktori aky
aka ake kolko tie tej tym tato tito tieto mna teba jej ju im sa svoj len iba tiez este prave vobec
predsa snad mozno napriklad ano nie som sme ste budu bol bola bolo boli su maju mal mala mali mat
moze mozu mohol mohla mohli da
`).split(/\s+/).filter(Boolean);
for(const word of FUNCTION_WORDS) STOP.add(word);

const EQUIV_GROUPS = [
  ['cerna dira',['cerna dira','cerne diry','cernych der','cierna diera','cierne diery','black hole','black holes']],
  ['vesmir',['vesmir','kosmos','kozmos','universe']],
  ['hvezd',['hvezda','hvezdy','hvezdny','hviezda','hviezdy','hviezdny','star','stars']],
  ['slunc',['slunce','slunecni','slnko','slnecny','sun']],
  ['mesic',['mesic','mesice','mesicni','mesiac','mesacny','moon']],
  ['zem',['zeme','zemsky','zem','earth']],
  ['casoprostor',['casoprostor','casopriestor','spacetime']],
  ['umela inteligence',['umela inteligence','umela inteligencia','ai','artificial intelligence']],
  ['svetl',['svetlo','svetelny','svetelný','svetlo','light']],
  ['foton',['foton','fotony','fotonovy','fotonova','photon','photons']],
  ['kvant',['kvantum','kvanta','kvantovy','kvantova','quantum']],
  ['gravit',['gravitace','gravitacni','gravitacia','gravitacny','gravity']],
  ['relativ',['relativita','relativisticky','relativity']],
  ['einstein',['einstein','albert einstein']],
  ['elektromagnet',['elektromagneticke zareni','elektromagneticke vlneni','elektromagneticke ziarenie','electromagnetic radiation']],
  ['zareni',['zareni','ziarenie','radiation']],
  ['optik',['optika','opticky','optika','opticky','optics']],
  ['vln',['vlna','vlny','vlnova','vlneni','vlnenie','wave','waves']],
  ['energ',['energie','energia','energy']],
  ['elektron',['elektron','elektrony','elektronovy','electron','electrons']],
  ['proton',['proton','protony','protonovy','protons']],
  ['neutron',['neutron','neutrony','neutronovy','neutrons']],
  ['kvark',['kvark','kvarky','kvarkovy','quark','quarks']],
  ['atom',['atom','atomy','atomovy','atoms']],
  ['molekul',['molekula','molekuly','molekularni','molecule','molecules']],
  ['castic',['castice','castica','castice','particle','particles']],
  ['jadr',['jadro','jaderny','jadrovy','nucleus','nuclear']],
  ['magnet',['magnet','magneticky','magnetic']],
  ['elektr',['elektrina','elektricky','elektrina','electric']],
  ['tepl',['teplo','tepelny','teplota','thermal','temperature']],
  ['zvuk',['zvuk','zvukovy','sound']],
  ['evoluc',['evoluce','evolucni','evolucia','evolucny','evolution']],
  ['gen',['gen','geny','geneticky','gene','genes','genetics']],
  ['dna',['dna','deoxyribonukleova kyselina']],
  ['bunk',['bunka','bunky','bunka','cell','cells']],
  ['klimat',['klima','klimaticky','klimaticka zmena','climate']],
  ['sklenik',['sklenikovy efekt','sklenikovy plyn','greenhouse']],
  ['co2',['co2','oxid uhlicity','oxid uhlicity','carbon dioxide']],
  ['pocitac',['pocitac','pocitace','pocitacovy','computer','computers']],
  ['algoritm',['algoritmus','algoritmy','algorithm','algorithms']],
  ['neuron',['neuron','neurony','neuronova sit','neural network']],
  ['laser',['laser','lasery','laserovy']],
  ['horizont udalosti',['horizont udalosti','event horizon']],
  ['singularit',['singularita','singularity']],
  ['hawking',['hawking','hawkingovo zareni','hawking radiation']],
  ['galaxi',['galaxie','galaxia','galaxy','galaxies']],
  ['planet',['planeta','planety','planetarni','planetarny','planet','planets']],
  ['obeh',['obeh','orbita','orbitalni draha','orbit']],
  ['rychlost svetla',['rychlost svetla','speed of light']],
  ['velky tresk',['velky tresk','big bang']],
  ['temna hmota',['temna hmota','tmava hmota','dark matter']],
  ['temna energie',['temna energie','tmava energia','dark energy']]
];

const ALIAS = new Map();
for(const [canonical,forms] of EQUIV_GROUPS){
  const c=norm(canonical);
  ALIAS.set(c,c); ALIAS.set(stem(c),c);
  for(const f of forms){
    const n=norm(f); ALIAS.set(n,c); ALIAS.set(stem(n),c);
  }
}

const PHRASE_ALIASES = [...ALIAS.entries()]
  .filter(([k])=>k.includes(' '))
  .sort((a,b)=>b[0].length-a[0].length);

const DERIVATION_SUFFIXES = `
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
`.trim().split(/\s+/).map(norm).filter(Boolean).sort((a,b)=>b.length-a.length);

function rawDerivationRoot(value){
  let current=norm(value);
  if(!current)return'';
  if(current.includes(' '))return current.split(/\s+/).map(rawDerivationRoot).filter(Boolean).join(' ');
  if(ALIAS.has(current))return ALIAS.get(current);
  for(const suffix of DERIVATION_SUFFIXES){
    if(current.endsWith(suffix)&&current.length-suffix.length>=3){
      current=current.slice(0,-suffix.length);break;
    }
  }
  current=stem(current);
  const rewrites={kniz:'knih',jader:'jadr',tepel:'tepl',slunec:'slunc',vede:'ved',energet:'energ',elektrin:'elektr',opt:'optik'};
  current=rewrites[current]||current;
  return ALIAS.get(current)||current;
}

function canonicalConcept(value){
  const n=norm(value);
  if(!n)return'';
  return ALIAS.get(n)||ALIAS.get(stem(n))||rawDerivationRoot(n);
}

const GENERIC_MODIFIERS=new Set(norm(`
velky maly nejvetsi nejmensi dlouhy kratky vysoky nizky siroky uzky tezky lehky
rychly pomaly silny slaby stary novy mlady teply studeny horky chladny
viditelny neviditelny pozorovatelny znamy neznamy mozny nemozny skutecny realny
bezny obvykly zvlastni hlavni vedlejsi dalsi jiny stejny prvni posledni jediny
blizky vzdaleny nejblizsi nejvzdalenejsi spravny spatny dobry nejlepsi horsi
cerna cierna bily bila biela modry cerveny zeleny
`).split(/\s+/).map(canonicalConcept).filter(Boolean));

const PHRASE_ROOT_PATTERNS=(()=>{
  const patterns=[],seen=new Set();
  for(const [canonical,forms] of EQUIV_GROUPS){
    const c=norm(canonical);
    for(const form of [canonical,...forms]){
      const parts=norm(form).split(/\s+/).filter(Boolean);
      if(parts.length<2)continue;
      const roots=parts.map(part=>rawDerivationRoot(part));
      const sig=roots.join(' ');
      const key=c+'\u0001'+sig;
      if(seen.has(key))continue;
      seen.add(key);patterns.push({canonical:c,roots,length:roots.length});
    }
  }
  return patterns.sort((a,b)=>b.length-a.length);
})();

function phraseConcepts(text){
  const normalized=' '+norm(text)+' ';
  const out=[],seen=new Set();

  // 1) Přesné víceslovné aliasy.
  for(const [phrase,canonical] of PHRASE_ALIASES){
    if(normalized.includes(' '+phrase+' ')&&!seen.has(canonical)){
      seen.add(canonical);
      out.push({key:canonical,label:phrase,phrase:true,modifier:false});
    }
  }

  // 2) Stejná fráze v jiném pádu/tvaru:
  // "černá díra" == "černou dírou", "černých děr" apod.
  const rawTokens=norm(text).split(/\s+/).filter(Boolean);
  const roots=rawTokens.map(rawDerivationRoot);
  for(const pattern of PHRASE_ROOT_PATTERNS){
    if(seen.has(pattern.canonical))continue;
    for(let i=0;i<=roots.length-pattern.length;i++){
      let ok=true;
      for(let j=0;j<pattern.length;j++){
        if(roots[i+j]!==pattern.roots[j]){ok=false;break}
      }
      if(ok){
        seen.add(pattern.canonical);
        out.push({
          key:pattern.canonical,
          label:rawTokens.slice(i,i+pattern.length).join(' '),
          phrase:true,modifier:false
        });
        break;
      }
    }
  }
  return out;
}

function conceptBundle(text,{query=false}={}){
  const phrases=phraseConcepts(text);
  const phraseWords=new Set(phrases.flatMap(p=>p.key.split(' ')));
  const tokens=String(text||'').match(/[\p{L}\p{N}]+/gu)||[];
  const seen=new Set(phrases.map(p=>p.key));
  const out=[...phrases];
  for(let tokenIndex=0;tokenIndex<tokens.length;tokenIndex++){
    const raw=tokens[tokenIndex], normalized=norm(raw);
    if(!normalized||normalized.length<2||STOP.has(normalized))continue;
    const key=canonicalConcept(normalized);
    if(!key||STOP.has(key)||seen.has(key))continue;
    if(query && phrases.length && phraseWords.has(key))continue;
    seen.add(key);
    out.push({
      key,label:raw.toLocaleLowerCase('cs-CZ'),tokenIndex,
      contentIndex:out.length,phrase:false,modifier:GENERIC_MODIFIERS.has(key)
    });
  }
  return out;
}

function ngrams(text,n=3){
  const s=norm(text).replace(/\s+/g,' '),out=new Set();
  if(s.length<n){if(s)out.add(s);return out}
  for(let i=0;i<=s.length-n;i++)out.add(s.slice(i,i+n));
  return out;
}
function dice(a,b){
  if(!a.size&&!b.size)return 1;
  if(!a.size||!b.size)return 0;
  let common=0;
  for(const x of a)if(b.has(x))common++;
  return 2*common/(a.size+b.size);
}
function conceptSimilarity(a,b){
  if(a.key===b.key)return 1;
  if(Math.min(a.key.length,b.key.length)<4)return 0;
  const s=dice(ngrams(a.key,2),ngrams(b.key,2));
  return s>=0.88?s:0;
}

/* Tematický graf: hrany jsou ZÁMĚRNĚ slabší než přímá shoda. */
const SEMANTIC_EDGES = [
  ['foton','svetl',.78],['foton','elektromagnet',.68],['foton','kvant',.64],['foton','zareni',.62],['foton','energ',.50],['foton','vln',.46],['foton','optik',.54],
  ['svetl','optik',.78],['svetl','elektromagnet',.72],['svetl','vln',.68],['svetl','laser',.63],['svetl','rychlost svetla',.58],['svetl','energ',.44],
  ['cerna dira','gravit',.86],['cerna dira','relativ',.82],['cerna dira','casoprostor',.80],['cerna dira','horizont udalosti',.94],
  ['cerna dira','singularit',.91],['cerna dira','hawking',.82],['cerna dira','galaxi',.50],['cerna dira','hvezd',.56],
  ['gravit','relativ',.79],['gravit','casoprostor',.78],['gravit','obeh',.68],['gravit','planet',.58],['gravit','hvezd',.55],
  ['relativ','einstein',.90],['relativ','casoprostor',.88],['relativ','rychlost svetla',.72],['relativ','gravit',.79],
  ['horizont udalosti','relativ',.70],['horizont udalosti','gravit',.72],['singularit','relativ',.62],['hawking','zareni',.79],['hawking','kvant',.68],
  ['kvant','castic',.78],['kvant','atom',.67],['kvant','elektron',.68],['kvant','foton',.64],['kvant','vln',.60],
  ['castic','elektron',.80],['castic','proton',.80],['castic','neutron',.80],['castic','kvark',.78],['castic','foton',.62],['castic','jadr',.55],
  ['atom','elektron',.80],['atom','proton',.73],['atom','neutron',.73],['atom','molekul',.72],['atom','jadr',.68],
  ['jadr','proton',.76],['jadr','neutron',.76],['jadr','radioaktiv',.62],
  ['elektromagnet','zareni',.92],['elektromagnet','vln',.82],['elektromagnet','svetl',.72],['elektromagnet','elektr',.50],['elektromagnet','magnet',.50],
  ['laser','foton',.64],['laser','svetl',.72],['laser','optik',.65],
  ['vesmir','galaxi',.78],['vesmir','hvezd',.75],['vesmir','planet',.70],['vesmir','velky tresk',.62],['vesmir','temna hmota',.58],['vesmir','temna energie',.58],
  ['galaxi','hvezd',.72],['galaxi','cerna dira',.48],['planet','obeh',.72],['planet','hvezd',.58],
  ['velky tresk','vesmir',.80],['velky tresk','relativ',.45],['temna hmota','gravit',.56],['temna hmota','galaxi',.56],['temna energie','vesmir',.58],
  ['evoluc','gen',.68],['evoluc','dna',.60],['gen','dna',.88],['gen','bunk',.62],['dna','bunk',.66],
  ['klimat','sklenik',.78],['klimat','co2',.70],['klimat','tepl',.60],['sklenik','co2',.80],
  ['umela inteligence','algoritm',.80],['umela inteligence','neuron',.78],['umela inteligence','pocitac',.62],['algoritm','pocitac',.58]
];

const semanticGraph=new Map();
function addSemantic(a,b,w){
  a=canonicalConcept(a);b=canonicalConcept(b);
  if(!semanticGraph.has(a))semanticGraph.set(a,new Map());
  const m=semanticGraph.get(a);m.set(b,Math.max(m.get(b)||0,w));
}
for(const [a,b,w] of SEMANTIC_EDGES){addSemantic(a,b,w);addSemantic(b,a,w*.92)}

function semanticCandidates(key){
  const direct=semanticGraph.get(key)||new Map();
  const out=new Map(direct);
  // 2. krok v grafu, výrazně utlumený.
  for(const [mid,w1] of direct){
    const second=semanticGraph.get(mid);
    if(!second)continue;
    for(const [end,w2] of second){
      if(end===key)continue;
      const w=Math.min(.36,w1*w2*.45);
      if(w>(out.get(end)||0))out.set(end,w);
    }
  }
  return out;
}

