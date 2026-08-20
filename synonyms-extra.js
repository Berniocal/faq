'use strict';
/* Velké rozšíření odborných synonym, jazykových ekvivalentů a významů dotazů. */
(()=>{
  const M=window.VEDATOR_SEARCH_MAPS;if(!M)return;
  const parseEq=text=>text.trim().split(/\n+/).map(x=>x.trim()).filter(x=>x&&!x.startsWith('#')).map(line=>{const [key,forms='']=line.split('|');return[key.trim(),forms.split(';').map(x=>x.trim()).filter(Boolean)]});
  const parseEdges=text=>text.trim().split(/\n+/).map(x=>x.trim()).filter(x=>x&&!x.startsWith('#')).map(line=>{const [a,b,w]=line.split('|');return[a.trim(),b.trim(),Number(w)]});

  M.equivalents.push(...parseEq(`
# mechanika a veličiny
zrychleni|zrychlení;zrýchlenie;akcelerace;acceleration
sila|síla;force
prace|práce;mechanická práce;mechanická práca;work
vykon|výkon;příkon;príkon;power
hybnost|hybnost;momentum
moment hybnosti|moment hybnosti;úhlová hybnost;angular momentum
tlak|tlak;pressure;pascal
hustota|hustota;měrná hmotnost;density
vztlak|vztlak;vztlaková síla;buoyancy
treni|tření;trenie;friction
pruznost|pružnost;elasticita;elasticity
setrvacnost|setrvačnost;zotrvačnosť;inertia
rotace|rotace;otáčení;rotácia;rotation
moment sily|moment síly;krouticí moment;točivý moment;torque
teziste|těžiště;ťažisko;centrum hmotnosti;center of mass
volny pad|volný pád;voľný pád;free fall
odpor prostredi|odpor prostředí;odpor vzduchu;aerodynamický odpor;drag;air resistance
terminalni rychlost|terminální rychlost;ustálená pádová rychlost;terminal velocity
kineticka energie|kinetická energie;pohybová energie;kinetic energy
potencialni energie|potenciální energie;polohová energie;potential energy
mechanicka energie|mechanická energie;mechanical energy
zakon zachovani energie|zákon zachování energie;zachování energie;conservation of energy
zakon zachovani hybnosti|zákon zachování hybnosti;zachování hybnosti;conservation of momentum

# kmity, vlny a optika
perioda|perioda;doba kmitu;period
kmitani|kmitání;oscilace;oscilácia;vibrace;oscillation
rezonance|rezonance;resonance
amplituda|amplituda;výchylka;amplitude
vlnova delka|vlnová délka;vlnová dĺžka;wavelength
interference|interference;skládání vln;interference vln
difrakce|difrakce;ohyb vln;ohyb světla;diffraction
polarizace|polarizace;polarizácia;polarization
odraz|odraz;reflexe;reflection
lom|lom;refrakce;refraction
index lomu|index lomu;refrakční index;refractive index
disperze|disperze;rozklad světla;dispersion
spektrum|spektrum;spektroskopie;spectrum;spectroscopy
doppleruv jev|Dopplerův jev;Dopplerov jev;doppler effect

# elektřina a magnetismus
elektricky proud|elektrický proud;elektrický prúd;proud;prúd;current;ampér
napeti|napětí;napätie;voltage;volt
odpor|elektrický odpor;odpor vodiče;rezistence;resistance;ohm
vodivost|vodivost;konduktivita;conductivity
elektricky naboj|elektrický náboj;náboj;charge;coulomb
elektricke pole|elektrické pole;electric field
magneticke pole|magnetické pole;magnetic field
elektromagnetismus|elektromagnetismus;elektromagnetizmus;electromagnetism
indukce|elektromagnetická indukce;indukce;indukcia;electromagnetic induction
kapacita|kapacita;elektrická kapacita;capacitance;farad
kondenzator|kondenzátor;capacitor
civka|cívka;induktor;inductor;coil
transformator|transformátor;transformer
stridavy proud|střídavý proud;striedavý prúd;AC;alternating current
stejnosmerny proud|stejnosměrný proud;jednosmerný prúd;DC;direct current

# moderní a jaderná fyzika
radioaktivita|radioaktivita;radioaktivní rozpad;radioactivity
izotop|izotop;isotope
polo cas|poločas rozpadu;half-life
jadrena stepeni|jaderné štěpení;jadrové štiepenie;nuclear fission;fission
jadrena fuze|jaderná fúze;jadrová fúzia;nuclear fusion;fusion
neutrino|neutrino;neutríno;neutrinos
antihmota|antihmota;antimatter
hmota|hmota;materie;matter
higgsuv boson|Higgsův boson;Higgsov bozón;Higgs boson
standardni model|standardní model;štandardný model;standard model
boson|boson;bozón;bosons
fermion|fermion;fermions
supervodivost|supravodivost;supervodivost;superconductivity
plazma|plazma;plasma
vakuum|vakuum;vacuum
entropie|entropie;entropy
termodynamika|termodynamika;thermodynamics
skupenske teplo|skupenské teplo;latent heat
fazovy prechod|fázový přechod;phase transition

# astronomie a kosmologie
supernova|supernova;výbuch supernovy
neutronova hvezda|neutronová hvězda;neutrónová hviezda;neutron star
bily trpaslik|bílý trpaslík;biely trpaslík;white dwarf
cerveny obr|červený obr;červený gigant;red giant
pulsar|pulsar;pulzar
kvazar|kvazar;quasar
kosmicke zareni|kosmické záření;kozmické žiarenie;cosmic rays;cosmic radiation
slunecni vitr|sluneční vítr;slnečný vietor;solar wind
polarni zare|polární záře;severní záře;aurora;aurora borealis
zatmeni|zatmění;zatmenie;eclipse
kometa|kometa;comet
asteroid|asteroid;planetka;minor planet
meteoroid|meteoroid;meteoroidy
meteor|meteor;padající hvězda;shooting star
meteorit|meteorit;meteorite
teleskop|teleskop;dalekohled;ďalekohľad;telescope
radioteleskop|radioteleskop;rádiový dalekohled;radio telescope
cerveny posuv|červený posuv;rudý posuv;redshift
gravitacni vlna|gravitační vlna;gravitačná vlna;gravitational wave
kosmologie|kosmologie;kozmológia;cosmology
astronomie|astronomie;astronómia;astronomy
astrofyzika|astrofyzika;astrophysics
svetelny rok|světelný rok;svetelný rok;light-year;light year
parsek|parsek;parsec

# Země, klima a energetika
atmosfera|atmosféra;ovzduší;atmosphere
pocasi|počasí;počasie;weather
klimaticka zmena|klimatická změna;klimatická zmena;climate change
globalni oteplovani|globální oteplování;globálne otepľovanie;global warming
ozon|ozon;ozón;ozonová vrstva;ozone
ocean|oceán;moře;more;sea;ocean
ledovec|ledovec;ľadovec;glacier
sopka|sopka;vulkán;volcano
zemetreseni|zemětřesení;zemetrasenie;earthquake
deskovatektonika|desková tektonika;tektonika desek;plate tectonics
geotermalni energie|geotermální energie;geotermálna energia;geothermal energy
fosilni paliva|fosilní paliva;fossil fuels
obnovitelne zdroje|obnovitelné zdroje;renewables;renewable energy
solarni energie|solární energie;sluneční energie;solar energy
vetrna energie|větrná energie;wind energy
jadrena energie|jaderná energie;jadrová energia;nuclear energy

# chemie
chemicky prvek|chemický prvek;prvek;prvok;element;chemical element
periodicka tabulka|periodická tabulka;periodická soustava;periodic table
chemicka vazba|chemická vazba;chemical bond
ion|ion;iont;ión;ions
kyselina|kyselina;acid
zasada|zásada;báze;base;alkali
ph|pH;kyselost;acidita;alkalita
oxidace|oxidace;oxidácia;oxidation
redukce|redukce;redukcia;reduction
redox|redox;redoxní reakce;oxidačně redukční
katalyzator|katalyzátor;catalyst
chemicka reakce|chemická reakce;reakce;reaction
roztok|roztok;solution
rozpoustedlo|rozpouštědlo;solvent
rozpustena latka|rozpuštěná látka;solute
koncentrace|koncentrace;molarita;concentration;molarity
vodik|vodík;hydrogen;H2
kyslik|kyslík;oxygen;O2
dusik|dusík;nitrogen;N2
uhlik|uhlík;carbon
voda|voda;H2O;water
metan|metan;methane;CH4

# biologie, genetika a medicína
rna|RNA;ribonukleová kyselina
chromozom|chromozom;chromosom;chromosome
genom|genom;genome
mutace|mutace;mutácia;mutation
prirodni vyber|přírodní výběr;přirozený výběr;natural selection
protein|protein;bílkovina;proteín
 enzyma|enzym;enzyme
mitochondrie|mitochondrie;mitochondria
ribozom|ribozom;ribosom;ribosome
bakterie|bakterie;baktérie;bacteria
virus|virus;viry;vírus;viruses
houba|houba;plíseň;fungus;fungi
imunita|imunita;imunitní systém;imunitný systém;immune system
vakcina|vakcína;očkování;očkovanie;vaccination;vaccine
protilatka|protilátka;antibody
hormon|hormon;hormone
mozek|mozek;mozog;brain
neuron|neuron;neurón;nerve cell
nervova soustava|nervová soustava;nervový systém;nervous system
krev|krev;krv;blood
srdce|srdce;heart
plice|plíce;pľúca;lungs
ledvina|ledvina;ledviny;oblička;kidney
jatra|játra;pečeň;liver
traveni|trávení;trávenie;digestion
metabolismus|metabolismus;metabolizmus;metabolism
spermie|spermie;spermatozoid;sperm cell
vajicko|vajíčko;oocyt;ovum;egg cell
oplodneni|oplodnění;fertilizace;fertilization
tehotenstvi|těhotenství;gravidita;pregnancy
plodnost|plodnost;fertilita;fertility
rakovina|rakovina;nádorové onemocnění;cancer
nador|nádor;tumor;tumour
infekce|infekce;infection
nemoc|nemoc;choroba;onemocnění;disease;illness
antibiotikum|antibiotikum;antibiotika;antibiotic
mikrobiom|mikrobiom;mikroflóra;microbiome
fotosynteza|fotosyntéza;photosynthesis
bunecne dychani|buněčné dýchání;cellular respiration
organismus|organismus;organizmus;organism
druh|biologický druh;species
ekosystem|ekosystém;ecosystem
spanek|spánek;spánok;sleep
vedomi|vědomí;vedomie;consciousness
pamet|paměť;pamäť;memory
stres|stres;stress
deprese|deprese;depresia;depression
uzkost|úzkost;anxiety
placebo|placebo;placebo efekt;placebo effect
bolest|bolest;pain
horecka|horečka;horúčka;fever
zanet|zánět;zápal;inflammation
prevence|prevence;prevencia;prevention
lecba|léčba;liečba;terapie;therapy;treatment
diagnoza|diagnóza;diagnosis
priznak|příznak;symptom

# technologie a AI
strojove uceni|strojové učení;machine learning;ML
hluboke uceni|hluboké učení;deep learning
generativni ai|generativní AI;generative AI
jazykovy model|jazykový model;velký jazykový model;LLM;large language model
robot|robot;robotika;robotics
internet|internet;internetová síť
web|web;WWW;world wide web;webová stránka
blockchain|blockchain;blokový řetězec
kvantovy pocitac|kvantový počítač;quantum computer;quantum computing
tranzistor|tranzistor;transistor
polovodic|polovodič;semiconductor
dioda|dioda;diode
baterie|baterie;akumulátor;battery
solarni clanek|solární článek;fotovoltaický článek;solar cell
fotovoltaika|fotovoltaika;fotovoltaický jev;photovoltaics;PV
fotoelektricky jev|fotoelektrický jev;photoelectric effect
senzor|senzor;čidlo;sensor
gps|GPS;globální polohový systém;Global Positioning System
raketa|raketa;nosná raketa;rocket;launch vehicle
kosmicka lod|kosmická loď;vesmírná loď;spacecraft;spaceship
sonda|sonda;kosmická sonda;space probe
dezinformace|dezinformace;misinformation;disinformation
konspirace|konspirace;konspirační teorie;conspiracy theory
socialni site|sociální sítě;sociálne siete;social media

# další typy významu dotazu
historie|historie;dějiny;history
objevitel|objevitel;vynálezce;discoverer;inventor
priklad|příklad;example
vyhoda|výhoda;benefit;advantage
nevyhoda|nevýhoda;drawback;disadvantage
riziko|riziko;nebezpečí;risk;danger
dukaz|důkaz;evidence;proof
pozorovani|pozorování;detekce;observation;detection
zdroj|zdroj;source
struktura|struktura;stavba;structure
funkce|funkce;role;function
`));

  M.queryPhrases.push(...parseEq(`
zrychleni|jaké má zrychlení;jak rychle zrychluje;ako rýchlo zrýchľuje
hustota|jakou má hustotu;jaká je hustota;aká je hustota
tlak|jaký je tlak;jaký tlak;aký je tlak
vykon|jaký má výkon;kolik má wattů;jaký je příkon
energie|kolik má energie;jaká je energie
elektricky proud|jaký teče proud;jak velký proud;kolik ampér
napeti|jaké je napětí;kolik voltů
odpor|jaký má odpor;kolik ohmů
perioda|jaká je perioda;jak dlouho trvá jeden kmit
vlnova delka|jaká je vlnová délka;jakou má vlnovou délku
koncentrace|jaká je koncentrace;kolik látky je v roztoku
ph|jaké má pH;jak je kyselé;jaká je kyselost
lecba|jak se léčí;ako sa lieči;jaká je léčba
prevence|jak tomu předejít;jak se tomu vyhnout;jak tomu zabránit
priznak|jaké jsou příznaky;jak se to projevuje;jaké má symptomy
diagnoza|jak se to pozná;jak se diagnostikuje;jak zjistit jestli
historie|kdy vznikl;kdy vznikla;kdy bylo objeveno;kdy byla objevena;od kdy existuje
objevitel|kdo objevil;kdo vynalezl;kdo přišel na;kto objavil
priklad|uveď příklad;jaký je příklad;například
vyhoda|jaké jsou výhody;v čem je výhoda
nevyhoda|jaké jsou nevýhody;v čem je nevýhoda
riziko|jaké je riziko;jak nebezpečné;je to nebezpečné
dukaz|jaký je důkaz;jak to víme;čím je to doloženo
pozorovani|jak to pozorovat;jak to vidět;jak se to sleduje;jak to detekovat
zdroj|odkud se bere;jaký je zdroj;z čeho pochází
struktura|jakou má strukturu;jak je uspořádaný;jak je stavěný
funkce|jakou má funkci;co dělá;jaká je jeho role
rychlost svetla|jak rychlé je světlo;jakou rychlost má světlo
svetelny rok|kolik je světelný rok;jak dlouhý je světelný rok
`));

  M.semanticEdges.push(...parseEdges(`
sila|zrychleni|0.75
sila|hmotnost|0.58
sila|prace|0.60
prace|energie|0.86
prace|vykon|0.76
vykon|energie|0.66
rotace|moment sily|0.72
rotace|moment hybnosti|0.72
volny pad|gravitace|0.86
volny pad|zrychleni|0.72
terminalni rychlost|odpor prostredi|0.84
kineticka energie|energie|0.92
potencialni energie|energie|0.92
mechanicka energie|kineticka energie|0.82
mechanicka energie|potencialni energie|0.82
kmitani|perioda|0.82
kmitani|frekvence|0.82
kmitani|amplituda|0.74
kmitani|rezonance|0.68
vlna|vlnova delka|0.84
vlna|frekvence|0.80
vlna|perioda|0.72
vlna|interference|0.70
vlna|difrakce|0.68
svetlo|interference|0.68
svetlo|difrakce|0.68
svetlo|polarizace|0.68
svetlo|odraz|0.64
svetlo|lom|0.70
lom|index lomu|0.90
svetlo|disperze|0.62
svetlo|spektrum|0.66
doppleruv jev|frekvence|0.72
doppleruv jev|vlna|0.76
elektricky proud|napeti|0.82
elektricky proud|odpor|0.78
napeti|odpor|0.70
elektricky naboj|elektricke pole|0.84
elektricky proud|magneticke pole|0.62
elektromagnetismus|elektricke pole|0.82
elektromagnetismus|magneticke pole|0.82
indukce|magneticke pole|0.86
indukce|elektricky proud|0.68
kondenzator|kapacita|0.92
civka|indukce|0.70
transformator|stridavy proud|0.86
radioaktivita|izotop|0.82
radioaktivita|polo cas|0.84
jadrena stepeni|jadro|0.82
jadrena fuze|jadro|0.80
jadrena fuze|hvezda|0.72
higgsuv boson|standardni model|0.86
supervodivost|kvantum|0.66
termodynamika|entropie|0.82
termodynamika|teplota|0.72
supernova|hvezda|0.90
supernova|neutronova hvezda|0.74
neutronova hvezda|pulsar|0.88
cerveny obr|hvezda|0.86
bily trpaslik|hvezda|0.86
kvazar|cerna dira|0.72
kosmicke zareni|zareni|0.82
slunecni vitr|slunce|0.86
polarni zare|slunecni vitr|0.76
polarni zare|magneticke pole|0.70
zatmeni|slunce|0.60
zatmeni|mesic|0.70
kometa|slunecni soustava|0.72
asteroid|slunecni soustava|0.72
meteor|meteoroid|0.84
meteorit|meteoroid|0.84
teleskop|astronomie|0.74
radioteleskop|teleskop|0.90
cerveny posuv|vesmir|0.70
cerveny posuv|doppleruv jev|0.62
gravitacni vlna|gravitace|0.84
gravitacni vlna|relativita|0.74
kosmologie|vesmir|0.88
astrofyzika|astronomie|0.86
svetelny rok|vzdalenost|0.90
parsek|vzdalenost|0.90
chemicky prvek|periodicka tabulka|0.90
chemicky prvek|atom|0.82
chemicka vazba|atom|0.76
ion|elektron|0.72
kyselina|ph|0.84
zasada|ph|0.84
oxidace|redukce|0.90
redox|oxidace|0.92
redox|redukce|0.92
katalyzator|chemicka reakce|0.84
roztok|rozpoustedlo|0.78
roztok|rozpustena latka|0.78
roztok|koncentrace|0.72
dna|rna|0.82
dna|chromozom|0.84
dna|genom|0.80
gen|chromozom|0.84
gen|mutace|0.78
evoluce|prirodni vyber|0.88
protein|gen|0.72
protein|enzyma|0.76
mitochondrie|bunka|0.82
ribozom|protein|0.72
bakterie|mikrobiom|0.72
virus|infekce|0.80
bakterie|infekce|0.74
imunita|vakcina|0.82
imunita|protilatka|0.86
mozek|neuron|0.86
neuron|nervova soustava|0.86
srdce|krev|0.78
traveni|metabolismus|0.68
spermie|vajicko|0.72
spermie|oplodneni|0.80
vajicko|oplodneni|0.82
oplodneni|tehotenstvi|0.80
plodnost|spermie|0.72
rakovina|nador|0.92
nemoc|diagnoza|0.68
nemoc|lecba|0.68
nemoc|priznak|0.70
infekce|zanet|0.66
antibiotikum|bakterie|0.82
fotosynteza|energie|0.58
fotosynteza|co2|0.60
atmosfera|pocasi|0.80
atmosfera|klima|0.74
klimaticka zmena|klima|0.94
globalni oteplovani|klimaticka zmena|0.90
globalni oteplovani|sklenikovy efekt|0.78
ozon|atmosfera|0.72
ocean|klima|0.68
ledovec|klimaticka zmena|0.72
deskovatektonika|zemetreseni|0.82
deskovatektonika|sopka|0.80
fosilni paliva|co2|0.72
obnovitelne zdroje|solarni energie|0.72
obnovitelne zdroje|vetrna energie|0.72
jadrena energie|jadrena stepeni|0.82
strojove uceni|umela inteligence|0.90
hluboke uceni|strojove uceni|0.92
neuronova sit|hluboke uceni|0.86
generativni ai|umela inteligence|0.90
jazykovy model|generativni ai|0.84
jazykovy model|umela inteligence|0.82
robot|umela inteligence|0.62
internet|web|0.82
kvantovy pocitac|kvantum|0.82
tranzistor|polovodic|0.88
dioda|polovodic|0.86
baterie|elektrina|0.64
solarni clanek|fotovoltaika|0.94
fotovoltaika|fotoelektricky jev|0.76
fotoelektricky jev|foton|0.82
gps|druzice|0.86
raketa|kosmicka lod|0.62
sonda|kosmicka lod|0.76
dezinformace|konspirace|0.64
socialni site|dezinformace|0.58
`));
})();
