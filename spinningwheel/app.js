/* Casino Noir – standalone configurable wheel. Material Symbols: Apache-2.0 (Google). */
(() => {
  'use strict';
  const STORAGE_KEY = 'casino-noir-wheel-studio-v1';
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const TWO_PI = Math.PI * 2;
  const $ = (id) => document.getElementById(id);
  const WINNER_EFFECTS = ['outline','spotlight','lift','lights','celebration','cinematic'];
  const WINNER_STRENGTHS = ['subtle','refined','show'];
  const WINNER_SOUNDS = ['off','soft','bell','chime','jackpot','fanfare'];
  const MECHANICAL_SOUNDS = ['subtle','ratchet','metal','casino'];
  const WORKSPACE_KEY = 'casino-noir-wheel-studio-workspace-v2';
  const MAX_WEIGHT = 1000000;
  const PALETTES = {
    noir: ['#981439', '#181318'],
    ruby: ['#b7193d', '#2b1319'],
    emerald: ['#095b51', '#171c1d'],
    midnight: ['#1d365a', '#15141b']
  };
  const ICON_GROUPS = {
    'Highlights': ['star','stars','auto_awesome','diamond','workspace_premium','emoji_events','military_tech','verified','loyalty','favorite','favorite_border','celebration','redeem','card_giftcard','recommend','thumb_up','theater_comedy','whatshot','flare','lightbulb','bolt'],
    'Casino & Gewinne': ['casino','paid','savings','credit_card','wallet','account_balance_wallet','currency_exchange','token','sell','local_offer','shopping_bag','shopping_cart','storefront','local_mall','monetization_on','toll','receipt_long','card_membership','key','lock_open'],
    'Kleidung & Mode': ['apparel','checkroom','dry_cleaning','laundry','styler'],
    'Freizeit': ['local_bar','wine_bar','sports_bar','nightlife','restaurant','coffee','cake','icecream','spa','self_improvement','beach_access','hotel','flight','luggage','directions_car','two_wheeler','sports_esports','games','music_note','headphones','movie','camera_alt','theater_comedy'],
    'Natur & Fantasie': ['sunny','dark_mode','nights_stay','forest','park','pets','cruelty_free','water_drop','eco','nature','flutter_dash','rocket_launch','public','travel_explore','explore','map','magic_button','filter_vintage','psychology_alt'],
    'Menschen & Aktionen': ['person','group','groups','face','sentiment_satisfied','mood','volunteer_activism','handshake','favorite','diversity_1','child_care','alarm','schedule','timer','hourglass_empty','done','check_circle','refresh','replay','shuffle','question_mark','help','info','flag','sports_score'],
    'Technik': ['smartphone','laptop','desktop_windows','devices','tv','watch','smart_toy','memory','science','build','settings','extension','language','cloud','download','upload','print','qr_code','wifi','headset','videogame_asset']
  };
  // Der komplette Rounded-Katalog wird aus Googles offizieller Codepoints-Liste
  // geladen, validiert und im Browser zwischengespeichert. Die Favoriten oben
  // bleiben verfügbar, wenn der externe Katalog zum ersten Mal offline ist.
  const ICON_CATALOG_CACHE_KEY = 'casino-noir-material-symbols-rounded-codepoints-v2';
  const ICON_CATALOG_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
  const ICON_CATALOG_URLS = [
    'https://raw.githubusercontent.com/google/material-design-icons/master/variablefont/MaterialSymbolsRounded%5BFILL%2CGRAD%2Copsz%2Cwght%5D.codepoints',
    'https://cdn.jsdelivr.net/gh/google/material-design-icons@master/variablefont/MaterialSymbolsRounded%5BFILL%2CGRAD%2Copsz%2Cwght%5D.codepoints'
  ];
  const FEATURED_ICONS = Array.from(new Set(Object.values(ICON_GROUPS).flat()));
  let ICONS = FEATURED_ICONS;
  let fullCatalogReady = false;
  let iconCatalogRequest = null;
  let catalogUpdatedAt = 0;
  let iconCatalogError = '';
  // Alle Treffer sind gleichzeitig durchsuchbar und per Scrollen erreichbar.
  // Für die Performance werden nur die aktuell sichtbaren Kacheln in das DOM gesetzt.
  let iconMatches = [];
  let iconMatchCount = 0;
  let iconScrollFrame = 0;
  const ICON_ROW_HEIGHT = 82;
  const ICON_ROW_GAP = 7;
  const ICON_OVERSCAN_ROWS = 3;
  // Official name -> Unicode private-use glyph. Numeric codepoints avoid
  // broken ligatures, which display raw names such as "shirt" as plain text.
  // A few common pictograms have baked-in codepoints for first-load/offline use.
  let ICON_CODEPOINTS = new Map(Object.entries({
    apparel:'ef7b',checkroom:'f19e',dry_cleaning:'ea58',laundry:'e2a8',
    local_laundry_service:'e54a',styler:'e273',star:'f09a',favorite:'e87e',
    diamond:'ead5',casino:'eb40',workspace_premium:'e7af'
  }));
  // Search terms are intentionally separate from real font names. Google has
  // "apparel" but no font icon named "shirt".
  const SEARCH_SYNONYMS = {
    apparel:'shirt t-shirt tshirt t shirt shirtbluse kleidung hemd oberteil pullover sweater clothing clothes mode fashion',
    checkroom:'shirt t-shirt tshirt kleidung hemd jacke mantel wardrobe coat clothes hanger fashion garderobe',
    dry_cleaning:'shirt t-shirt kleidung waschen reinigen wäscherei clothing laundry garment',
    laundry:'kleidung wäsche shirt laundry clothing waschen',
    styler:'shirt kleidung bügeln t shirt wardrobe dryer laundry',
    favorite:'herz liebe heart love', diamond:'diamant edelstein gem',
    casino:'casino spiel glücksspiel würfel', star:'stern star favoriten',
    redeem:'geschenk gift present', local_bar:'cocktail drink getränk bar'
  };
  // Search-tag snapshot from the official Material Symbols metadata.
  // Bundled locally for predictable GitHub Pages and offline standalone use.
  const ICON_SEARCH_INDEX_URL='icon-search-index.json?v=20261109-semantic-v1';
  const SEARCH_SPELLING={laundrey:'laundry',tshirt:'shirt','t shirt':'shirt',tshirts:'shirt'};
  let ICON_SEARCH_TAGS=new Map(),iconSearchReady=false,iconSearchRequest=null,iconSearchError='';
  function installIconSearchIndex(data){
    if(!data||data.version!==1||!Array.isArray(data.icons)||data.icons.length<3800)throw Error('Ungültiger Schlagwortindex');
    const parsed=new Map();
    for(const entry of data.icons){
      if(!Array.isArray(entry)||!isValidMaterialSymbolName(entry[0])||typeof entry[2]!=='string')continue;
      const tags=entry[2].split('|').map(normalizeSearchText).filter(Boolean);
      parsed.set(entry[0],{tags,all:tags.join(' '),popularity:Number(entry[1])||100000,categories:String(entry[3]||'')});
    }
    if(parsed.size<3800)throw Error('Schlagwortindex unvollständig');
    ICON_SEARCH_TAGS=parsed;
    iconSearchReady=true;
    iconSearchError='';
    if(!$('iconModal').hidden)renderIconPicker();
  }
  async function loadIconSearchMetadata(force=false){
    if(iconSearchRequest)return iconSearchRequest;
    if(iconSearchReady&&!force)return;
    iconSearchError='';
    iconSearchRequest=(async()=>{
      try{
        const inline=$('iconSearchIndexData');
        const json=inline?inline.textContent:await fetchCatalogText(ICON_SEARCH_INDEX_URL);
        installIconSearchIndex(JSON.parse(json));
      }catch(error){
        iconSearchError='Schlagwortindex nicht verfügbar';
        console.warn('Material Symbols Such-Tags nicht geladen:',error);
      }
    })();
    try{await iconSearchRequest;}finally{iconSearchRequest=null;if(!$('iconModal').hidden)renderIconPicker();}
  }
  function iconSearchScore(name,query){
    if(!query)return 1;
    const normalized=normalizeSearchText(name);
    const meta=ICON_SEARCH_TAGS.get(name);
    const tags=meta?.tags||[];
    const aliases=normalizeSearchText(SEARCH_SYNONYMS[name]);
    let score=0;
    if(normalized===query)score=1000;
    else if(normalized.startsWith(query))score=920;
    else if(normalized.includes(query))score=800;
    if(tags.includes(query))score=Math.max(score,880);
    else if(tags.some(tag=>tag.startsWith(query)))score=Math.max(score,660);
    else if(tags.some(tag=>tag.includes(query)))score=Math.max(score,460);
    if(aliases.includes(query))score=Math.max(score,350);
    // Multiword searches should match the combined searchable vocabulary.
    if(!score&&query.includes(' ')){
      const parts=query.split(' ').filter(Boolean);
      if(parts.every(part=>(normalized+' '+(meta?.all||'')+' '+aliases).includes(part)))score=260;
    }
    return score;
  }
  const DIRECT_ALIASES = {
    shirt:'apparel',tshirt:'apparel',t_shirt:'apparel',t_shirts:'apparel',
    kleidung:'apparel',hemd:'apparel',oberteil:'apparel',pullover:'apparel',
    clothes:'apparel',clothing:'apparel',coat:'checkroom',jacke:'checkroom'
  };
  function isValidMaterialSymbolName(v) { return /^[a-z0-9][a-z0-9_]{0,79}$/.test(v || ''); }
  function normalizeSearchText(value) {
    return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[_-]+/g,' ').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
  }
  function normalizeIconName(value){
    const raw=String(value||'').toLowerCase().trim().replace(/[\s-]+/g,'_');
    return DIRECT_ALIASES[raw]||raw;
  }
  function actualIconGlyph(icon){
    const hex=ICON_CODEPOINTS.get(icon);
    return hex ? String.fromCodePoint(parseInt(hex,16)) : null;
  }
  function iconFallback(icon){return ICON_FALLBACKS[icon]||'✦';}
  function parseCodepointsCatalog(text) {
    const entries=text.split(/\r?\n/).map(line=>{
      const m=/^([a-z0-9_]+)\s+([0-9a-f]{4,6})$/.exec(line.trim());
      return m&&isValidMaterialSymbolName(m[1])?[m[1],m[2]]:null;
    }).filter(Boolean);
    const unique=new Map(entries);
    if(unique.size<3500)throw new Error('Unvollständiger Material-Symbols-Katalog');
    return [...unique].sort((a,b)=>a[0].localeCompare(b[0]));
  }
  function setCatalog(entries, updatedAt) {
    ICON_CODEPOINTS=new Map([...ICON_CODEPOINTS,...entries]);
    ICONS=entries.map(entry=>entry[0]);
    fullCatalogReady=true;
    catalogUpdatedAt=updatedAt;
    iconCatalogError='';
    if(!isSpinning){drawWheel();renderSegments();}
    if(!$('iconModal').hidden)renderIconPicker();
  }
  function restoreIconCatalog() {
    try{
      const cached=JSON.parse(localStorage.getItem(ICON_CATALOG_CACHE_KEY)||'null');
      if(cached&&Array.isArray(cached.entries)&&cached.entries.length>=3500){
        const clean=cached.entries.filter(entry=>Array.isArray(entry)&&entry.length===2&&
          isValidMaterialSymbolName(entry[0])&&/^[0-9a-f]{4,6}$/.test(entry[1]));
        if(new Set(clean.map(entry=>entry[0])).size>=3500)setCatalog(clean,Number(cached.updatedAt)||0);
      }
    }catch{/* private browsing or legacy cache must not break the editor */}
  }
  async function fetchCatalogText(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8500);
    try {
      const response = await fetch(url, {signal:controller.signal,cache:'no-cache'});
      if(!response.ok) throw new Error('HTTP '+response.status);
      return await response.text();
    } finally { clearTimeout(timer); }
  }
  async function loadIconCatalog(force=false) {
    if (iconCatalogRequest) return iconCatalogRequest;
    if (!force && fullCatalogReady && Date.now()-catalogUpdatedAt < ICON_CATALOG_MAX_AGE) return;
    iconCatalogError='';
    if (!$('iconModal').hidden) renderIconPicker();
    iconCatalogRequest = (async()=>{
      let lastError;
      for (const url of ICON_CATALOG_URLS) {
        try {
          const entries = parseCodepointsCatalog(await fetchCatalogText(url));
          const now=Date.now();
          setCatalog(entries,now);
          try { localStorage.setItem(ICON_CATALOG_CACHE_KEY,JSON.stringify({updatedAt:now,entries})); }
          catch { /* private mode / quota exceeded: picker still works online */ }
          return;
        } catch(err) { lastError=err; }
      }
      iconCatalogError = 'Katalog derzeit nicht erreichbar';
      if (!$('iconModal').hidden) renderIconPicker();
      console.warn('Material-Symbol-Katalog konnte nicht geladen werden:',lastError);
    })();
    try { await iconCatalogRequest; } finally { iconCatalogRequest=null; if (!$('iconModal').hidden) renderIconPicker(); }
  }
  const ICON_FALLBACKS = {
    apparel:'♧',checkroom:'♧',dry_cleaning:'✧',laundry:'◈',styler:'✧',
    star:'★',stars:'✦',auto_awesome:'✧',diamond:'◆',workspace_premium:'✦',emoji_events:'♛',military_tech:'✪',verified:'✓',loyalty:'♥',favorite:'♥',favorite_border:'♡',celebration:'✷',redeem:'✦',card_giftcard:'♜',recommend:'★',thumb_up:'✓',theater_comedy:'◈',whatshot:'♨',flare:'✺',lightbulb:'☀',bolt:'ϟ',casino:'♠',paid:'$',savings:'$',credit_card:'▭',wallet:'▣',account_balance_wallet:'$',currency_exchange:'$',token:'◉',sell:'◇',local_offer:'◇',shopping_bag:'▣',shopping_cart:'▣',storefront:'♜',local_mall:'▣',monetization_on:'$',toll:'◎',receipt_long:'▤',card_membership:'▣',key:'⚿',lock_open:'◈',local_bar:'♧',wine_bar:'♧',sports_bar:'♧',nightlife:'♫',restaurant:'♧',coffee:'☕',cake:'♜',icecream:'♢',spa:'✿',self_improvement:'☯',beach_access:'☀',hotel:'⌂',flight:'✈',luggage:'▣',directions_car:'▰',two_wheeler:'◎',sports_esports:'✦',games:'♟',music_note:'♫',headphones:'♫',movie:'▣',camera_alt:'▣',sunny:'☀',dark_mode:'☾',nights_stay:'☾',forest:'♣',park:'♣',pets:'♟',cruelty_free:'♡',water_drop:'♦',eco:'❧',nature:'❧',flutter_dash:'✦',rocket_launch:'↟',public:'◎',travel_explore:'✧',explore:'✧',map:'♢',magic_button:'✧',filter_vintage:'✿',psychology_alt:'?',person:'♙',group:'♟',groups:'♟',face:'☻',sentiment_satisfied:'☺',mood:'☺',volunteer_activism:'♥',handshake:'⌘',diversity_1:'♡',child_care:'♡',alarm:'◷',schedule:'◷',timer:'◷',hourglass_empty:'⌛',done:'✓',check_circle:'✓',refresh:'↻',replay:'↻',shuffle:'⇄',question_mark:'?',help:'?',info:'i',flag:'⚑',sports_score:'⚑',smartphone:'▯',laptop:'▣',desktop_windows:'▣',devices:'▣',tv:'▣',watch:'◷',smart_toy:'✧',memory:'▦',science:'⚗',build:'⚒',settings:'⚙',extension:'✜',language:'◎',cloud:'☁',download:'↓',upload:'↑',print:'▣',qr_code:'▦',wifi:'≋',headset:'♫',videogame_asset:'✧'
  };
  let idCounter = 0;
  function makeId() { return `seg-${Date.now().toString(36)}-${(idCounter++).toString(36)}`; }
  function initialSegments() {
    const data = [
      ['Hauptgewinn','workspace_premium',true,true],
      ['Cocktail','local_bar',true,true],
      ['Überraschung','redeem',true,true],
      ['Joker','auto_awesome',true,false],
      ['Bonus','star',true,true],
      ['VIP-Abend','diamond',true,true],
      ['Nochmal','refresh',true,true],
      ['Glücksgriff','favorite',false,true]
    ];
    return data.map((v,i) => ({id:makeId(),label:v[0],icon:v[1],showLabel:v[2],showIcon:v[3],color:PALETTES.noir[i%2],weight:1}));
  }
  function defaultConfig(){return {version:2,segments:initialSegments(),duration:6,coast:65,sound:true,winnerEffect:'cinematic',winnerStrength:'refined',winnerSound:'chime',palette:'noir',proportional:false,pointerSpring:55,pointerDamping:62,pointerIntensity:60,mechanicalSound:'casino'};}
  function validColor(v){return typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v);}
  function validIcon(v){return isValidMaterialSymbolName(v);}
  function validWeight(v){return typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=MAX_WEIGHT;}
  function clampSetting(v,fallback){return Number.isFinite(Number(v))?Math.max(0,Math.min(100,Math.round(Number(v)))):fallback;}
  function saneConfig(raw,{strict=false}={}){
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||!Array.isArray(raw.segments))throw Error('Die JSON-Datei enthält keine gültige Segmentliste.');
    if(raw.version!==undefined&&(!Number.isInteger(raw.version)||raw.version<1||raw.version>2))throw Error('Unbekannte Konfigurationsversion.');
    if(raw.segments.length>5000)throw Error('Maximal 5.000 Segmente je Glücksrad.');
    const palette=Object.hasOwn(PALETTES,raw.palette)?raw.palette:'noir';
    const controls=['coast','pointerSpring','pointerDamping','pointerIntensity'];
    if(strict&&raw.version===2){
      if(raw.duration!==undefined&&(!Number.isFinite(raw.duration)||raw.duration<3||raw.duration>30))throw Error('Ungültige Drehdauer.');
      for(const key of controls)if(raw[key]!==undefined&&(!Number.isFinite(raw[key])||raw[key]<0||raw[key]>100))throw Error('Ungültiger Wert für '+key+'.');
      if(raw.proportional!==undefined&&typeof raw.proportional!=='boolean')throw Error('Ungültiger Darstellungsmodus.');
    }
    const seen=new Set();
    return {
      version:2,palette,
      duration:Number.isFinite(Number(raw.duration))?Math.max(3,Math.min(30,Math.round(Number(raw.duration)))):6,
      coast:clampSetting(raw.coast,65),sound:raw.sound!==false,
      winnerEffect:WINNER_EFFECTS.includes(raw.winnerEffect)?raw.winnerEffect:'cinematic',
      winnerStrength:WINNER_STRENGTHS.includes(raw.winnerStrength)?raw.winnerStrength:'refined',
      winnerSound:WINNER_SOUNDS.includes(raw.winnerSound)?raw.winnerSound:'chime',
      proportional:raw.proportional===true,
      pointerSpring:clampSetting(raw.pointerSpring,55),
      pointerDamping:clampSetting(raw.pointerDamping,62),
      pointerIntensity:clampSetting(raw.pointerIntensity,60),
      mechanicalSound:MECHANICAL_SOUNDS.includes(raw.mechanicalSound)?raw.mechanicalSound:'casino',
      segments:raw.segments.map((entry,i)=>{
        if(!entry||typeof entry!=='object'||Array.isArray(entry))throw Error('Ungültiges Segment '+(i+1)+'.');
        if(strict&&entry.weight!==undefined&&!validWeight(entry.weight))throw Error('Ungültiges Gewicht in Segment '+(i+1)+'.');
        const weight=entry.weight===undefined?1:Number(entry.weight);
        if(!validWeight(weight))throw Error('Ungültiges Gewicht in Segment '+(i+1)+'.');
        const normalizedName=normalizeIconName(entry.icon);
        let id=typeof entry.id==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(entry.id)?entry.id:makeId();
        if(seen.has(id))id=makeId();
        seen.add(id);
        return {id,label:String(entry.label??'').slice(0,80),icon:validIcon(normalizedName)?normalizedName:'star',
          showLabel:entry.showLabel!==false,showIcon:entry.showIcon!==false,
          color:validColor(entry.color)?entry.color:PALETTES[palette][i%2],weight};
      })
    };
  }
  function profileId(){return globalThis.crypto?.randomUUID?.() || makeId();}
  function profileName(raw){return String(raw??'').trim().slice(0,60)||'Neues Glücksrad';}
  function makeProfile(name,settings,id=profileId()){return {id,name:profileName(name),config:settings};}
  function loadWorkspace(){
    try{
      const saved=localStorage.getItem(WORKSPACE_KEY);
      if(saved){
        const value=JSON.parse(saved);
        if(value?.version!==2||!Array.isArray(value.items)||!value.items.length||value.items.length>100)throw Error('Ungültiges gespeichertes Profilformat');
        const ids=new Set();
        const items=value.items.map(item=>{
          const id=typeof item.id==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(item.id)&&!ids.has(item.id)?item.id:profileId();
          ids.add(id);
          return makeProfile(item.name,saneConfig(item.config),id);
        });
        return {version:2,activeId:ids.has(value.activeId)?value.activeId:items[0].id,items};
      }
    }catch(error){console.warn('Profilverwaltung wird aus dem bisherigen Speicher wiederhergestellt:',error);}
    let legacy;
    try{const value=localStorage.getItem(STORAGE_KEY);legacy=value?saneConfig(JSON.parse(value)):defaultConfig();}
    catch(error){console.warn('Bisherige lokale Konfiguration ungültig:',error);legacy=defaultConfig();}
    const first=makeProfile('Mein Glücksrad',legacy);
    return {version:2,activeId:first.id,items:[first]};
  }
  let workspace=loadWorkspace();
  let config=workspace.items.find(item=>item.id===workspace.activeId).config;
  function profile(){return workspace.items.find(item=>item.id===workspace.activeId);}
  function activeWeightTotal(){return config.segments.reduce((sum,segment)=>sum+segment.weight,0);}
  function hasEligibleSegments(){return activeWeightTotal()>0;}
  // All geometry derives from one layout in degrees measured clockwise from 12 o'clock.
  // Zero-weight segments are invisible in proportional mode but remain editable.
  function segmentLayout(){
    const n=config.segments.length,total=activeWeightTotal();
    if(!n)return [];
    const firstSpan=config.proportional&&total>0?360*config.segments[0].weight/total:360/n;
    let cursor=0;
    return config.segments.map((segment,i)=>{
      const span=config.proportional&&total>0?360*segment.weight/total:360/n;
      const start=cursor;
      cursor=i===n-1?360:cursor+span;
      const end=cursor;
      return {start,end,span:end-start,center:-90+(start+end)/2-firstSpan/2,index:i};
    });
  }
  function selectedAtRotation(angle,layout=segmentLayout()){
    if(!layout.length)return -1;
    const pointerAngle=normalized(-angle+(layout[0].span/2));
    let lo=0,hi=layout.length-1;
    while(lo<hi){const mid=(lo+hi)>>1;if(pointerAngle>=layout[mid].end)lo=mid+1;else hi=mid;}
    // With a zero-width wedge, never report a sector that has no visible area.
    if(layout[lo].span<1e-10)return layout.findIndex(item=>item.span>1e-10);
    return lo;
  }
  function drawWeightedWinner(){
    const total=activeWeightTotal();
    if(!(total>0))throw Error('Kein Segment ist gewinnberechtigt.');
    if(!globalThis.crypto?.getRandomValues)throw Error('Sicherer Zufall ist in diesem Browser nicht verfügbar.');
    const values=new Uint32Array(2);crypto.getRandomValues(values);
    const r=(values[0]*2097152+(values[1]>>>11))/9007199254740992;
    const target=r*total;
    let lo=0,hi=config.segments.length-1;
    // prefix sums: binary search, not dependent on segment position or spin force.
    const prefix=[];let running=0;
    for(const segment of config.segments){running+=segment.weight;prefix.push(running);}
    while(lo<hi){const mid=(lo+hi)>>1;if(target<prefix[mid])hi=mid;else lo=mid+1;}
    return lo;
  }
  function storageStatus(ok){
    saveOk=ok;
    $('saveIndicator').textContent=ok?'● Lokal gespeichert':'⚠ Speicherung nicht möglich';
    $('saveIndicator').style.color=ok?'':'#ffb4a0';
    const inner=$('profileSaveStatus');if(inner){inner.textContent=ok?'● Alle Änderungen lokal gespeichert':'⚠ Änderungen konnten nicht gespeichert werden. Bitte JSON exportieren.';inner.classList.toggle('is-warning',!ok);}
  }
  function persist(next=workspace){
    try{
      const serialized=JSON.stringify(next);
      localStorage.setItem(WORKSPACE_KEY,serialized);
      // Retain the original single-wheel key as a backwards-compatible backup.
      // The workspace key is the canonical source when both keys exist.
      try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next.items.find(x=>x.id===next.activeId).config));}catch(error){console.warn('Legacy-Backup nicht aktualisiert:',error);}
      storageStatus(true);
      return true;
    }catch(error){console.warn('Lokaler Speicher ist blockiert oder voll:',error);storageStatus(false);return false;}
  }
  let isSpinning=false, rotation=0, iconFontReady=false, currentIconTarget=null;
  let highlightedWinner=null;
  let activeCategory='Alle', lastFocusedElement=null, saveOk=true, audioContext=null, lastTickAt=0, lastTickSector=-1, toastTimer=0;
  const svg=$('wheelSvg'), wheel=$('rotatingWheel'), modal=$('iconModal'), assembly=$('wheelAssembly');
  const wheelStage=document.querySelector('.wheel-stage'), presentation=$('presentation');
  // Closed by default: the wheel gets the full page width and viewport height.
  // The editor is an accessible off-canvas dialog, not a second layout column.
  const editorPanel=$('editorPanel'), editorBackdrop=$('editorBackdrop'), editorToggle=$('toggleEditor');
  let editorFocusReturn=null;
  function setEditorOpen(open) {
    if (open === !editorPanel.hidden) return;
    if (open) editorFocusReturn=document.activeElement;
    editorPanel.hidden=!open;
    editorBackdrop.hidden=!open;
    document.body.classList.toggle('editor-open',open);
    editorToggle.setAttribute('aria-expanded',String(open));
    editorToggle.setAttribute('aria-label',open?'Konfiguration geöffnet':'Konfiguration öffnen');
    if (open) $('closeEditor').focus();
    else (editorFocusReturn?.isConnected ? editorFocusReturn : editorToggle).focus();
  }
  editorToggle.addEventListener('click',()=>setEditorOpen(editorPanel.hidden));
  $('closeEditor').addEventListener('click',()=>setEditorOpen(false));
  editorBackdrop.addEventListener('click',()=>setEditorOpen(false));
  document.addEventListener('keydown',event=>{
    if (event.key!=='Tab'||editorPanel.hidden||!modal.hidden) return;
    const focusables=[...editorPanel.querySelectorAll('button:not(:disabled),input:not(:disabled):not([type="hidden"]),select:not(:disabled),a[href]')].filter(el=>el.getClientRects().length);
    if (!focusables.length) return;
    const first=focusables[0],last=focusables[focusables.length-1];
    if(event.shiftKey && (document.activeElement===first||!editorPanel.contains(document.activeElement))){event.preventDefault();last.focus();}
    else if(!event.shiftKey && (document.activeElement===last||!editorPanel.contains(document.activeElement))){event.preventDefault();first.focus();}
  });
  function escapeHtml(v) { return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function safeText(v) { return String(v ?? '').trim() || 'Ohne Beschriftung'; }
  function wrapText(str,n,secondLine=true) {
    const plain=String(str || '').trim().replace(/\s+/g,' ');
    if (!plain) return [];
    if (plain.length<=n) return [plain];
    if (!secondLine) return [plain.slice(0,Math.max(1,n-1))+'…'];
    let cut=plain.lastIndexOf(' ',n+1); if(cut<n*.45) cut=n;
    const first=plain.slice(0,cut).trim(),rest=plain.slice(cut).trim();
    return [first.slice(0,n),rest.length>n ? rest.slice(0,Math.max(1,n-1))+'…' : rest].filter(Boolean);
  }
  function e(name,attrs={},parent) {
    const node=document.createElementNS(SVG_NS,name);
    for(const [k,v] of Object.entries(attrs)) node.setAttribute(k,String(v));
    if(parent) parent.appendChild(node);
    return node;
  }
  function polar(r,angle){const a=angle*Math.PI/180;return [320+Math.cos(a)*r,320+Math.sin(a)*r];}
  function wedgePath(start,end,r){if(end-start>=359.999999)return circlePath(320,320,r);const p=polar(r,start),q=polar(r,end);return `M 320 320 L ${p[0].toFixed(4)} ${p[1].toFixed(4)} A ${r} ${r} 0 ${end-start>180?1:0} 1 ${q[0].toFixed(4)} ${q[1].toFixed(4)} Z`;}
  // A real vector fallback for the key "shirt" alias (official name: apparel),
  // even if Google Fonts is blocked. Never show a raw ligature name as a glyph.
  const SHIRT_PATH='M8 3.5 10 5.2 Q12 7 14 5.2 L16 3.5 L21 6.3 L19 11 L16.5 9.7 L16.5 21 H7.5 V9.7 L5 11 L3 6.3 Z';
  function fontIconNode(icon,parent,size,baseline=0){
    const glyph=iconFontReady?actualIconGlyph(icon):null;
    if(glyph){
      const node=e('text',{x:0,y:baseline,'text-anchor':'middle','dominant-baseline':'central','font-size':size,class:'face-icon'},parent);
      node.textContent=glyph;
      return node;
    }
    if(icon==='apparel'){
      const group=e('g',{transform:`translate(0 ${baseline}) scale(${(size/25).toFixed(4)})`},parent);
      e('path',{d:SHIRT_PATH,transform:'translate(-12 -12)',fill:'none',stroke:'#f8d593','stroke-width':1.85,'stroke-linecap':'round','stroke-linejoin':'round'},group);
      return group;
    }
    const node=e('text',{x:0,y:baseline,'text-anchor':'middle','dominant-baseline':'central','font-size':Math.round(size*.93),class:'face-fallback'},parent);
    node.textContent=iconFallback(icon);
    return node;
  }
  function clearWinnerHighlight(){
    highlightedWinner=null;
    const group=$('winnerHighlight');
    if(group){group.classList.remove('is-visible');group.replaceChildren();}
    wheel.querySelectorAll('.winner-item-lifted').forEach(node=>node.classList.remove('winner-item-lifted'));
    const stage=$('winnerStage');
    if(stage){stage.hidden=true;stage.classList.remove('is-visible');}
  }
  // All winner geometry lives inside the rotating SVG group, so it remains
  // registered to the actual winning wedge at any sector count or stop angle.
  // Each effect has a distinct visual language; the exact winning sector is
  // the sole geometry source for every overlay. These elements are decorative.
  function showWinnerHighlight(index){
    const group=$('winnerHighlight'),stage=$('winnerStage'),n=config.segments.length;
    if(!group||!Number.isInteger(index)||index<0||index>=n)return;
    highlightedWinner=index;
    group.classList.remove('is-visible');
    group.replaceChildren();
    // Real overlay geometry is grouped as one semantic highlight surface.
    const surface=e('g',{class:'winner-highlight-surface'},group);
    wheel.querySelectorAll('.winner-item-lifted').forEach(node=>node.classList.remove('winner-item-lifted'));
    stage.hidden=true;
    stage.classList.remove('is-visible');
    const sector=segmentLayout()[index],step=sector.span,center=sector.center;
    const effect=config.winnerEffect,strength=config.winnerStrength;
    const mult={subtle:.72,refined:1,show:1.33}[strength]||1;
    const dim={subtle:.40,refined:.62,show:.76}[strength]||.62;
    group.dataset.effect=effect;
    group.dataset.strength=strength;
    group.style.setProperty('--winner-dim',String(dim));
    group.style.setProperty('--winner-stroke',String(2.5*mult));
    const sectorPath=r=>step>=359.999999?circlePath(320,320,r):wedgePath(center-step/2,center+step/2,r);
    const [winnerX,winnerY]=polar(188,center);
    // Shared subtle marker is deliberately omitted: modes must look different.
    if(effect==='outline'){
      const under=e('path',{d:sectorPath(263),class:'winner-outline-rest'},surface);
      const trace=e('path',{d:sectorPath(263),class:'winner-outline-trace'},surface);
      const length=Math.ceil(trace.getTotalLength());
      trace.style.strokeDasharray=`${length} ${length}`;
      trace.style.setProperty('--trace-length',String(length));
      const [p1x,p1y]=polar(260,center-step/2),[p2x,p2y]=polar(260,center+step/2);
      for(const [x,y] of [[p1x,p1y],[p2x,p2y]])e('circle',{cx:x,cy:y,r:4*mult,class:'winner-outline-jewel'},surface);
    }else if(effect==='spotlight'){
      shadeOtherSectors(surface,index,n,step,dim);
      makeSpotBeam(surface,sectorPath,center,mult);
    }else if(effect==='lift'){
      const offset=17*mult,rad=center*Math.PI/180;
      const dx=Math.cos(rad)*offset,dy=Math.sin(rad)*offset;
      e('path',{d:sectorPath(261),class:'winner-lift-groove'},surface);
      const lift=e('g',{class:'winner-lift',transform:`translate(${dx.toFixed(2)} ${dy.toFixed(2)})`},surface);
      const moving=e('g',{class:'winner-lift-motion'},lift);
      moving.style.setProperty('--lift-x',`${-dx.toFixed(2)}px`);
      moving.style.setProperty('--lift-y',`${-dy.toFixed(2)}px`);
      if(n===1)e('circle',{cx:320,cy:320,r:259,fill:config.segments[index].color,class:'winner-lift-face'},moving);
      else e('path',{d:sectorPath(259),fill:config.segments[index].color,class:'winner-lift-face'},moving);
      const original=wheel.querySelector(`[data-wheel-item="${index}"]`);
      if(original){moving.appendChild(original.cloneNode(true));original.classList.add('winner-item-lifted');}
      e('path',{d:sectorPath(259),class:'winner-lift-shimmer'},moving);
    }else if(effect==='lights'){
      makeMarquee(surface,index,n,step,mult);
      e('path',{d:sectorPath(260),class:'winner-lights-wedge'},surface);
    }else if(effect==='celebration'){
      // Keep the winner visually selected once the fireworks have faded.
      e('path',{d:sectorPath(263),class:'winner-celebration-lacquer'},surface);
      makeFireworks(surface,center,step,mult);
      const halo=e('circle',{cx:winnerX,cy:winnerY,r:24,class:'winner-burst-halo'},surface);
      halo.style.setProperty('--halo-scale',String(2.8*mult));
    }else if(effect==='cinematic'){
      shadeOtherSectors(surface,index,n,step,dim*.80);
      makeSpotBeam(surface,sectorPath,center,mult);
      makeMarquee(surface,index,n,step,mult);
      const rings=e('g',{class:'winner-cinema-rings'},surface);
      for(let j=0;j<3;j++){
        const ring=e('circle',{cx:winnerX,cy:winnerY,r:13+j*14,class:'winner-cinema-ring'},rings);
        ring.style.animationDelay=`${j*260}ms`;
      }
      e('path',{d:sectorPath(263),class:'winner-cinema-gold'},surface);
      e('circle',{cx:320,cy:320,r:279,class:'winner-cinema-orbit'},surface);
    }
    const names={outline:'GOLDEN EDGE',spotlight:'CASINO SPOTLIGHT',lift:'GOLDEN LIFT',lights:'JACKPOT LIGHTS',celebration:'GOLDEN CELEBRATION',cinematic:'CASINO CINEMATIC'};
    stage.dataset.effect=effect;
    stage.dataset.strength=strength;
    $('winnerStageKicker').textContent=names[effect]||'GEWINN';
    $('winnerStageTitle').textContent=safeText(config.segments[index].label);
    stage.hidden=false;
    // Restart entrance timelines on repeated previews of the same winner.
    void group.getBoundingClientRect();
    group.classList.add('is-visible');
    void stage.getBoundingClientRect();
    stage.classList.add('is-visible');
  }
  function circlePath(cx,cy,r){return `M ${cx-r} ${cy} a ${r} ${r} 0 1 0 ${2*r} 0 a ${r} ${r} 0 1 0 ${-2*r} 0 Z`;}
  function shadeOtherSectors(group,index,n,step,dim){
    const layout=segmentLayout();
    if(layout[index]?.span>=359.999999)return;
    const shade=e('g',{class:'winner-shade','clip-path':'url(#faceClip)'},group);
    shade.style.setProperty('--winner-dim',String(dim));
    if(n>100){
      const sector=layout[index],disk=circlePath(320,320,265);
      e('path',{d:disk+' '+wedgePath(sector.center-sector.span/2,sector.center+sector.span/2,265),'fill-rule':'evenodd',class:'winner-shade-sector'},shade);
    }else{
      layout.forEach((sector,i)=>{
        if(i!==index&&sector.span>0)e('path',{d:wedgePath(sector.center-sector.span/2,sector.center+sector.span/2,265),class:'winner-shade-sector'},shade);
      });
    }
  }
  function makeSpotBeam(group,sectorPath,center,mult){
    const defs=e('defs',{},group);
    const grad=e('radialGradient',{id:'winner-spot-glow',cx:'45%',cy:'38%',r:'70%'},defs);
    for(const [offset,color,opacity] of [['0%','#fffce5','.92'],['36%','#ffd681','.52'],['100%','#ffe29b','0']])
      e('stop',{offset,'stop-color':color,'stop-opacity':opacity},grad);
    const clip=e('clipPath',{id:'winner-spot-sector'},defs);
    e('path',{d:sectorPath(266)},clip);
    const beam=e('g',{'clip-path':'url(#winner-spot-sector)',class:'winner-spot-beam'},group);
    const [x,y]=polar(178,center);
    e('ellipse',{cx:x,cy:y,rx:100*mult,ry:155*mult,fill:'url(#winner-spot-glow)',class:'winner-spot-core'},beam);
    const [ax,ay]=polar(68,center),[bx,by]=polar(258,center);
    e('path',{d:`M ${ax} ${ay} L ${bx} ${by}`,class:'winner-spot-ray'},beam);
    e('circle',{cx:x,cy:y,r:36*mult,class:'winner-spot-flare'},beam);
  }
  function makeMarquee(group,index,n,step,mult){
    const ring=e('g',{class:'winner-marquee'},group);
    e('circle',{cx:320,cy:320,r:291,class:'winner-marquee-orbit'},ring);
    const center=segmentLayout()[index].center;
    const distance=(a,b)=>Math.abs((((a-b)%360)+540)%360-180);
    let closest=0,smallest=Infinity;
    for(let j=0;j<56;j++){
      const angle=j*360/56-90;
      const gap=distance(angle,center);
      if(gap<smallest){smallest=gap;closest=j;}
    }
    for(let j=0;j<56;j++){
      const angle=j*360/56-90;
      const [x,y]=polar(291,angle);
      const targeted=n===1||distance(angle,center)<=step/2+.01||j===closest;
      const bulb=e('circle',{cx:x,cy:y,r:targeted?5.7*mult:4.1,class:targeted?'winner-marquee-bulb is-target':'winner-marquee-bulb'},ring);
      bulb.style.animationDelay=`${(j*23).toFixed(0)}ms`;
    }
  }
  function makeFireworks(group,center,step,mult){
    const bursts=e('g',{class:'winner-fireworks'},group);
    const amount=Math.round(39*mult);
    const [cx,cy]=polar(193,center);
    const span=Math.min(44,Math.max(9,step*.4));
    for(let i=0;i<amount;i++){
      const phi=(360*i/amount+Math.sin(i*11)*19)*Math.PI/180;
      const drift=50+(i%6)*12;
      const dx=Math.cos(phi)*drift*mult,dy=Math.sin(phi)*drift*mult;
      const shape=i%4===0?'M0 -7 L2 -2 L7 0 L2 2 L0 7 L-2 2 L-7 0 L-2 -2Z':null;
      const orbit=center+(i%7-3)*span/6;
      const [x,y]=polar(184+(i%5)*10,orbit);
      const item=shape?e('path',{d:shape,transform:`translate(${x} ${y})`,class:'winner-firework-star'},bursts):e('circle',{cx:x,cy:y,r:2+(i%3),class:'winner-firework-dot'},bursts);
      item.style.setProperty('--spark-x',`${dx.toFixed(1)}px`);
      item.style.setProperty('--spark-y',`${dy.toFixed(1)}px`);
      item.style.animationDelay=`${(i%9)*65}ms`;
    }
    // Deliberately use a different flash from the casino cinematic light sweep.
    e('circle',{cx,cy,r:12,class:'winner-firework-wave'},bursts);
  }
  function drawWheel(){
    const n=config.segments.length,layout=segmentLayout(),weightTotal=activeWeightTotal();
    wheel.replaceChildren();
    // Metallischer Rahmen und konzentrisch gefasste Ringe – vollständig skalierbares SVG.
    e('circle',{cx:320,cy:320,r:304,fill:'#271510',stroke:'#8c4e24','stroke-width':2},wheel);
    e('circle',{cx:320,cy:320,r:299,fill:'url(#rimMetal)',stroke:'#ffdf9d','stroke-width':3},wheel);
    e('circle',{cx:320,cy:320,r:284,fill:'#311b16',stroke:'#73401e','stroke-width':2.5},wheel);
    e('circle',{cx:320,cy:320,r:277,fill:'url(#rimBevel)',stroke:'#ffebaa','stroke-width':2},wheel);
    e('circle',{cx:320,cy:320,r:269,fill:'#110c0e',stroke:'#6c371d','stroke-width':3},wheel);
    const wheelSurface=e('g',{'clip-path':'url(#faceClip)'},wheel);
    if (!n) {
      e('circle',{cx:320,cy:320,r:267,fill:'#191116'},wheelSurface);
      const t=e('text',{x:320,y:175,'text-anchor':'middle',fill:'#ebbf83','font-size':23,'font-family':'Georgia, serif'},wheelSurface);
      t.textContent='Segmente hinzufügen';
    } else {
      config.segments.forEach((s,i)=>{
        const sector=layout[i];if(sector.span<1e-10||(config.proportional&&s.weight===0))return;
        const path=sector.span>=359.999999?e('circle',{cx:320,cy:320,r:267,fill:s.color},wheelSurface):e('path',{d:wedgePath(sector.center-sector.span/2,sector.center+sector.span/2,267),fill:s.color,'fill-opacity':s.weight===0&&weightTotal>0&&!config.proportional?.25:1,stroke:'#c69456','stroke-width':n>72?.6:n>26?1:1.9,'stroke-linejoin':'round'},wheelSurface);
        path.appendChild(e('title',{},null));path.lastChild.textContent=`Segment ${i+1}: ${safeText(s.label)} · ${(100*s.weight/(weightTotal||1)).toFixed(2)} %`;
      });
    }
    e('circle',{cx:320,cy:320,r:267,fill:'url(#faceShine)','pointer-events':'none'},wheel);
    e('circle',{cx:320,cy:320,r:268,fill:'none',stroke:'#f4d290','stroke-width':3.5},wheel);
    e('circle',{cx:320,cy:320,r:277,fill:'none',stroke:'#512514','stroke-width':1.4},wheel);
    // Echte Nietenoptik, unabhängig von der Segmentanzahl.
    for(let j=0;j<56;j++){
      const [x,y]=polar(291,(j/56)*360-90);
      e('circle',{cx:x,cy:y,r:5.4,fill:'#ffca74',opacity:.34,filter:'url(#studGlow)'},wheel);
      e('circle',{cx:x,cy:y,r:4.6,fill:'url(#studGrad)',stroke:'#703719','stroke-width':.75},wheel);
      e('circle',{cx:x-1.1,cy:y-1.6,r:1.25,fill:'#fff9d8',opacity:.8},wheel);
    }
    if(n){
      config.segments.forEach((s,i)=>{
        const sector=layout[i],center=sector.center,step=sector.span;
        if(n>72||step<3) return;
        if(n>20){
          const [x,y]=polar(220,center);
          // Beschriftungen folgen der Segmentachse. Sobald das Segment unter
          // dem Zeiger bei 12 Uhr steht, erscheint die Nummer aufrecht.
          const labelGroup=e('g',{'data-wheel-item':i,transform:`translate(${x.toFixed(3)} ${y.toFixed(3)}) rotate(${(center+90).toFixed(5)})`},wheel);
          const t=e('text',{x:0,y:0,'text-anchor':'middle','dominant-baseline':'central',class:'face-number','font-size':n>52?8:n>36?10:12},labelGroup);
          t.textContent=String(i+1);return;
        }
        if(!s.showIcon&&!s.showLabel) return;
        // Die kürzere Zeigerspitze endet bei Radius 240. Inhalte nutzen
        // den äußeren Teil des Segmentes, ohne bei 12 Uhr vom Zeiger
        // oder vom inneren Zierring (Radius 267) überlagert zu werden.
        // Staffelung nach Segmentzahl hält auch schmale Keile lesbar.
        const r=n<=8?190:n<=12?198:204;
        const [x,y]=polar(r,center);
        // Die lokale Segmentachse bestimmt die Orientierung, nicht die
        // aktuelle Position des Segments auf der Scheibe. Dadurch sind Text
        // UND Icon beim Erreichen der 12-Uhr-Position immer waagerecht und
        // aufrecht. Eine 180°-Korrektur auf der unteren Radhälfte würde sie
        // nach dem Drehen kopfüber erscheinen lassen.
        const tilt=center+90;
        const content=e('g',{'data-wheel-item':i,transform:`translate(${x.toFixed(3)} ${y.toFixed(3)}) rotate(${tilt.toFixed(5)})`},wheel);
        const title=e('title',{},content);title.textContent=safeText(s.label);
        const both=s.showLabel&&s.showIcon;
        const iconSize=n<=8?43:n<=12?31:22;
        if(s.showIcon) fontIconNode(s.icon,content,iconSize,both?(n<=12?-21:-12):0);
        if(s.showLabel){
          const max=n<=6?14:n<=8?11:n<=12?9:7;
          const lines=wrapText(s.label,max,n<=12);
          const fontSize=n<=6?15:n<=8?13:n<=12?10:9;
          const lineHeight=fontSize+2;
          const start=both?(n<=12?17:14):-((lines.length-1)*lineHeight)/2;
          lines.forEach((line,k)=>{
            const text=e('text',{x:0,y:start+k*lineHeight,'text-anchor':'middle','dominant-baseline':'central','font-size':fontSize,class:'face-label'},content);
            text.textContent=line;
          });
        }
      });
    }
    e('g',{id:'winnerHighlight',class:'winner-highlight','pointer-events':'none','aria-hidden':'true'},wheel);
    if(highlightedWinner!==null) showWinnerHighlight(highlightedWinner);
    e('circle',{cx:320,cy:320,r:61,fill:'url(#rimBevel)',stroke:'#4e2513','stroke-width':2.3},wheel);
    e('circle',{cx:320,cy:320,r:55,fill:'url(#rimMetal)',stroke:'#ffdf95','stroke-width':2.3},wheel);
    e('circle',{cx:320,cy:320,r:47,fill:'#1d1013',stroke:'#6b3e20','stroke-width':1.2},wheel);
    wheel.style.transform=`rotate(${rotation}deg)`;
    $('segmentCount').textContent=n.toLocaleString('de-DE');
    $('stageCount').textContent=String(n).padStart(2,'0')+' SEGMENTE'+(config.proportional?' · PROPORTIONAL':config.segments.some(s=>s.weight!==config.segments[0]?.weight)?' · GEWICHTETE CHANCEN':'');
    $('spinHub').disabled=isSpinning||!hasEligibleSegments();
    const summary=$('probabilitySummary');if(summary){const count=config.segments.filter(item=>item.weight>0).length;summary.textContent=count?`${count} von ${n} Segmenten gewinnberechtigt · Summe der Gewichte: ${activeWeightTotal().toLocaleString('de-DE')}`:'Keine Ziehung möglich: Alle Gewichte sind 0.';summary.classList.toggle('is-warning',!count);}
    const notice=$('densityNotice');
    if(n>72)notice.textContent='Bei mehr als 72 Segmenten zeigt das Rad nur die Farbsegmente. Inhalte bleiben in der Liste und im Ergebnis erhalten.';
    else if(n>20)notice.textContent='Ab 21 Segmenten verwendet das Rad Nummern statt Symbolen und Text, um das Design lesbar zu halten.';
    else if(n>12)notice.textContent='Bei 13–20 Segmenten werden Beschriftungen verkürzt. Der vollständige Text bleibt gespeichert.';
    notice.hidden=n<=12;
  }
  function materialIconMarkup(icon){
    const glyph=iconFontReady?actualIconGlyph(icon):null;
    if(glyph)return `<span class="material-symbols-rounded" aria-hidden="true">${glyph}</span>`;
    if(icon==='apparel')return `<svg class="icon-fallback-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="${SHIRT_PATH}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    return `<span class="symbol-fallback" aria-hidden="true">${escapeHtml(iconFallback(icon))}</span>`;
  }
  function renderSegments(){
    const list=$('segmentList'),weightTotal=activeWeightTotal();
    if(!config.segments.length){list.innerHTML='<div class="stage-notice">Noch keine Segmente. Mit „Hinzufügen“ beginnt dein neues Rad.</div>';return;}
    list.innerHTML=config.segments.map((s,i)=>`<div class="segment-card" data-id="${escapeHtml(s.id)}">
      <div class="segment-top">
        <button type="button" class="segment-drag-handle" data-action="drag" aria-label="Segment ${i+1} verschieben: ziehen oder Pfeiltasten verwenden" title="Ziehen zum Sortieren · Pfeiltasten, Pos1 oder Ende" ${isSpinning?'disabled':''}><span class="drag-grip" aria-hidden="true">⠿</span><span class="drag-number" aria-hidden="true">${String(i+1).padStart(2,'0')}</span></button>
        <label class="segment-color" title="Segmentfarbe wählen"><input type="color" data-field="color" value="${escapeHtml(s.color)}" aria-label="Farbe für Segment ${i+1}"></label>
        <input class="segment-label" type="text" data-field="label" aria-label="Beschriftung für Segment ${i+1}" placeholder="Beschriftung …" maxlength="80" value="${escapeHtml(s.label)}" ${!s.showLabel?'disabled':''}>
        <button class="segment-icon-btn" type="button" data-action="icon" aria-label="Symbol für Segment ${i+1} auswählen" title="Material-Symbol auswählen">${materialIconMarkup(s.icon)}</button>
        <button class="segment-delete" type="button" data-action="delete" aria-label="Segment ${i+1} löschen" title="Segment entfernen">×</button>
      </div>
      <div class="segment-controls">
        <label class="pill-check"><input type="checkbox" data-field="showLabel" ${s.showLabel?'checked':''}><span>Text</span></label>
        <label class="pill-check"><input type="checkbox" data-field="showIcon" ${s.showIcon?'checked':''}><span>Symbol</span></label>
        <label class="weight-control" title="Gewicht 0 bedeutet: kann nicht gewinnen"><span>Gewicht</span><input type="number" min="0" max="1000000" step="any" inputmode="decimal" data-field="weight" aria-label="Gewicht für Segment ${i+1}" value="${s.weight}"></label>
        <output class="segment-chance${s.weight===0?' is-excluded':''}" aria-label="Gewinnchance Segment ${i+1}">${weightTotal>0?(100*s.weight/weightTotal).toLocaleString('de-DE',{maximumFractionDigits:2}):'0'} %</output>
        <span class="spacer"></span>
        <button class="icon-action" type="button" data-action="up" aria-label="Segment ${i+1} nach oben" title="Nach oben" ${i===0?'disabled':''}>↑</button>
        <button class="icon-action" type="button" data-action="down" aria-label="Segment ${i+1} nach unten" title="Nach unten" ${i===config.segments.length-1?'disabled':''}>↓</button>
        <button class="icon-action" type="button" data-action="duplicate" aria-label="Segment ${i+1} duplizieren" title="Duplizieren">⧉</button>
      </div>
    </div>`).join('');
    if(isSpinning) lockEditor(true);
  }
  function renderSettings(){
    $('spinDuration').value=config.duration;$('durationLabel').textContent=config.duration+' s';
    $('coastIntensity').value=config.coast;$('coastLabel').textContent=config.coast+' %';
    $('soundEnabled').checked=config.sound;$('winnerEffect').value=config.winnerEffect;
    $('winnerStrength').value=config.winnerStrength;$('winnerSound').value=config.winnerSound;
    $('paletteSelect').value=config.palette;$('proportionalMode').value=config.proportional?'proportional':'equal';
    for(const key of ['pointerSpring','pointerDamping','pointerIntensity']){$(key).value=config[key];$(key+'Label').textContent=config[key]+' %';}
    $('mechanicalSound').value=config.mechanicalSound;
    $('importMode').value='replace';
    renderProfiles();
  }
  function render(){drawWheel();renderSegments();renderSettings();}
  function save(){profile().config=config;return persist();}
  function mutate(){clearWinnerHighlight();drawWheel();save();}
  function toast(message){const n=$('toast');n.textContent=message;n.classList.add('is-visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>n.classList.remove('is-visible'),2700);}
  function lockEditor(locked){
    $('addSegment').disabled=locked;
    $('spinDuration').disabled=locked;
    $('coastIntensity').disabled=locked;
    $('soundEnabled').disabled=locked;
    for(const id of ['winnerEffect','winnerStrength','winnerSound','previewWinnerEffect','previewWinnerSound'])$(id).disabled=locked;
    $('paletteSelect').disabled=locked;
    $('importJson').disabled=locked;
    $('resetConfig').disabled=locked;
    $('importFile').disabled=locked;
    for(const id of ['proportionalMode','pointerSpring','pointerDamping','pointerIntensity','mechanicalSound','previewMechanicalSound','profilePicker','profileName','newProfile','saveProfile','duplicateProfile','renameProfile','deleteProfile','importMode','exportJson','exportAllJson'])$(id).disabled=locked;
    $('segmentList').querySelectorAll('button,input').forEach(el=>{
      if(!locked && el.dataset.field==='label'){
        const s=config.segments.find(x=>x.id===el.closest('.segment-card')?.dataset.id);
        el.disabled=!s?.showLabel;
      } else if(!locked && el.dataset.action==='up'){
        el.disabled=config.segments[0]?.id===el.closest('.segment-card')?.dataset.id;
      } else if(!locked && el.dataset.action==='down'){
        el.disabled=config.segments.at(-1)?.id===el.closest('.segment-card')?.dataset.id;
      } else el.disabled=locked;
    });
    if(!locked)$('deleteProfile').disabled=workspace.items.length<=1;
  }
  const list=$('segmentList');
  list.addEventListener('input',ev=>{
    if(isSpinning)return;
    const el=ev.target,field=el.dataset.field;
    if(field!=='label'&&field!=='color'&&field!=='weight')return;
    const s=config.segments.find(x=>x.id===el.closest('.segment-card')?.dataset.id);if(!s)return;
    if(field==='color'&&!validColor(el.value))return;
    if(field==='weight'){
      if(el.value.trim()===''||!Number.isFinite(el.valueAsNumber)||el.valueAsNumber<0||el.valueAsNumber>MAX_WEIGHT)return;
      s.weight=el.valueAsNumber;
      // Update odds without recreating the focused number input.
      const total=activeWeightTotal();
      list.querySelectorAll('.segment-card').forEach(card=>{
        const item=config.segments.find(x=>x.id===card.dataset.id),out=card.querySelector('.segment-chance');
        out.textContent=(total>0?100*item.weight/total:0).toLocaleString('de-DE',{maximumFractionDigits:2})+' %';
        out.classList.toggle('is-excluded',item.weight===0);
      });
      mutate();return;
    }
    s[field]=el.value;mutate();
  });
  list.addEventListener('change',ev=>{
    if(isSpinning)return;
    const el=ev.target,field=el.dataset.field;
    if(field==='weight'){
      const card=el.closest('.segment-card'),segment=config.segments.find(x=>x.id===card?.dataset.id);
      if(segment)el.value=String(segment.weight);
      return;
    }
    if(field!=='showLabel'&&field!=='showIcon')return;
    const s=config.segments.find(x=>x.id===el.closest('.segment-card')?.dataset.id);if(!s)return;
    s[field]=el.checked;renderSegments();mutate();
  });
  list.addEventListener('click',ev=>{
    if(isSpinning)return;
    const btn=ev.target.closest('button[data-action]');if(!btn)return;
    const card=btn.closest('.segment-card');const idx=config.segments.findIndex(x=>x.id===card?.dataset.id);
    if(idx<0)return;
    const action=btn.dataset.action;
    if(action==='drag')return; // Pointer/keyboard handlers own the reorder grip.
    if(action==='icon'){openIconPicker(card.dataset.id);return;}
    if(action==='delete'){config.segments.splice(idx,1);}
    else if(action==='duplicate'){const clone={...config.segments[idx],id:makeId()};config.segments.splice(idx+1,0,clone);}
    else if(action==='up'&&idx>0){[config.segments[idx],config.segments[idx-1]]=[config.segments[idx-1],config.segments[idx]];}
    else if(action==='down'&&idx<config.segments.length-1){[config.segments[idx],config.segments[idx+1]]=[config.segments[idx+1],config.segments[idx]];}
    renderSegments();mutate();
  });  // Accessible drag-and-drop: pointer events work with mouse, pen and touch.
  // Data is reordered only after dropping, never while dragging over another card.
  function moveSegment(from,to,{focus=false}={}){
    if(isSpinning||from===to||from<0||to<0||from>=config.segments.length||to>=config.segments.length)return false;
    const [segment]=config.segments.splice(from,1);
    config.segments.splice(to,0,segment);
    renderSegments();mutate(); // Keeps SVG, saved config and wheel sectors in sync.
    if(focus){
      const card=[...list.querySelectorAll('.segment-card')].find(el=>el.dataset.id===segment.id);
      card?.querySelector('.segment-drag-handle')?.focus({preventScroll:true});
    }
    return true;
  }
  // A physical lift-and-place interaction: the actual card follows the pointer,
  // while a full-height placeholder makes the other cards move out of the way.
  // Keep the source node attached so pointer capture works on mouse and touch.
  let dragState=null,dragScrollRaf=0;
  function dragCards(state){
    return [...list.children].filter(el=>el.classList.contains('segment-card')&&el!==state.card);
  }
  function dragDestination(clientY,state){
    const cards=dragCards(state);
    const index=cards.findIndex(el=>clientY<el.getBoundingClientRect().top+el.getBoundingClientRect().height/2);
    return index<0?cards.length:index;
  }
  function updateFloatingCard(state){
    const maxX=Math.max(8,innerWidth-state.card.offsetWidth-8);
    state.card.style.left=`${Math.max(8,Math.min(maxX,state.clientX-state.offsetX))}px`;
    state.card.style.top=`${state.clientY-state.offsetY}px`;
  }
  function movePlaceholder(state,dest){
    const cards=dragCards(state);
    const target=cards[dest]||null;
    // Avoid needless reflows and animations when the target position is unchanged.
    const next=state.placeholder.nextElementSibling;
    const same=target?next===target:!next||next===state.card;
    if(same&&state.dest===dest)return;
    const first=new Map(cards.map(el=>[el,el.getBoundingClientRect().top]));
    if(target)list.insertBefore(state.placeholder,target);
    else list.appendChild(state.placeholder);
    state.dest=dest;
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    for(const card of cards){
      const dy=first.get(card)-card.getBoundingClientRect().top;
      if(Math.abs(dy)>2){
        card.getAnimations().forEach(animation=>animation.cancel());
        card.animate([{transform:`translateY(${dy}px)`},{transform:'translateY(0)'}],{duration:175,easing:'cubic-bezier(.18,.8,.24,1)'});
      }
    }
  }
  function activateDrag(state){
    state.active=true;
    const rect=state.card.getBoundingClientRect();
    const placeholder=document.createElement('div');
    placeholder.className='segment-drop-placeholder';
    placeholder.setAttribute('aria-hidden','true');
    placeholder.style.height=`${rect.height}px`;
    placeholder.innerHTML='<span>Hier ablegen</span>';
    list.insertBefore(placeholder,state.card);
    state.placeholder=placeholder;
    state.card.classList.add('is-dragging');
    state.card.style.width=`${rect.width}px`;
    state.card.style.height=`${rect.height}px`;
    state.offsetX=state.startX-rect.left;
    state.offsetY=state.startY-rect.top;
    updateFloatingCard(state);
    document.body.classList.add('is-segment-dragging');
    dragScrollRaf=requestAnimationFrame(scrollWhileDragging);
  }
  function scrollWhileDragging(){
    dragScrollRaf=0;
    const state=dragState;
    if(!state?.active)return;
    const rect=editorPanel.getBoundingClientRect();
    const pos=state.clientY,edge=68;
    const velocity=pos>rect.bottom-edge?Math.min(20,4+(pos-(rect.bottom-edge))*.25):
      pos<rect.top+edge?-Math.min(20,4+((rect.top+edge)-pos)*.25):0;
    if(velocity){
      editorPanel.scrollTop+=velocity;
      movePlaceholder(state,dragDestination(pos,state));
    }
    dragScrollRaf=requestAnimationFrame(scrollWhileDragging);
  }
  function animateDropGhost(source,rect,id){
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const target=[...list.querySelectorAll('.segment-card')].find(el=>el.dataset.id===id);
    if(!target)return;
    const targetRect=target.getBoundingClientRect();
    const ghost=source.cloneNode(true);
    ghost.className='segment-card segment-drop-flyer';
    ghost.setAttribute('aria-hidden','true');
    ghost.style.left=`${rect.left}px`;
    ghost.style.top=`${rect.top}px`;
    ghost.style.width=`${rect.width}px`;
    ghost.style.height=`${rect.height}px`;
    ghost.querySelectorAll('input,button').forEach(el=>{el.disabled=true;el.tabIndex=-1;});
    document.body.appendChild(ghost);
    target.classList.add('is-drop-arriving');
    let cleaned=false;
    const done=()=>{if(cleaned)return;cleaned=true;ghost.remove();target.classList.remove('is-drop-arriving');};
    if(ghost.animate){
      const animation=ghost.animate([
        {left:`${rect.left}px`,top:`${rect.top}px`,transform:'rotate(-1.4deg) scale(1.035)',opacity:1},
        {left:`${targetRect.left}px`,top:`${targetRect.top}px`,transform:'rotate(0deg) scale(1)',opacity:1}
      ],{duration:190,easing:'cubic-bezier(.17,.84,.35,1)',fill:'forwards'});
      animation.addEventListener('finish',done,{once:true});
      animation.addEventListener('cancel',done,{once:true});
      // Browser/tab throttling must never leave an invisible row or a stale ghost.
      setTimeout(done,300);
    }else done();
  }
  function stopDrag({commit=false}={}){
    const state=dragState;
    if(!state)return;
    dragState=null;
    cancelAnimationFrame(dragScrollRaf);
    dragScrollRaf=0;
    document.body.classList.remove('is-segment-dragging');
    const wasActive=state.active;
    const from=config.segments.findIndex(s=>s.id===state.id);
    const to=wasActive?[...list.children].filter(el=>el===state.placeholder||el.classList.contains('segment-card')&&el!==state.card).indexOf(state.placeholder):from;
    const startRect=wasActive?state.card.getBoundingClientRect():null;
    // Release capture before changing visual state, avoiding a cancel loop.
    try{if(state.handle.hasPointerCapture(state.pointerId))state.handle.releasePointerCapture(state.pointerId)}catch{}
    state.card.classList.remove('is-dragging');
    state.card.style.removeProperty('left');
    state.card.style.removeProperty('top');
    state.card.style.removeProperty('width');
    state.card.style.removeProperty('height');
    state.placeholder?.remove();
    if(commit&&wasActive&&!isSpinning&&to>=0){
      if(moveSegment(from,to,{focus:true}))toast('Segmentreihenfolge aktualisiert.');
      animateDropGhost(state.card,startRect,state.id);
    }
  }
  list.addEventListener('pointerdown',event=>{
    const grip=event.target.closest('.segment-drag-handle');
    if(!grip||grip.disabled||isSpinning||event.button!==0||dragState)return;
    const card=grip.closest('.segment-card');if(!card)return;
    dragState={pointerId:event.pointerId,id:card.dataset.id,handle:grip,card,startX:event.clientX,startY:event.clientY,clientX:event.clientX,clientY:event.clientY,active:false,placeholder:null,dest:config.segments.findIndex(s=>s.id===card.dataset.id)};
    try{grip.setPointerCapture(event.pointerId)}catch{}
    if(event.pointerType!=='mouse')event.preventDefault();
  });
  list.addEventListener('pointermove',event=>{
    const state=dragState;
    if(!state||event.pointerId!==state.pointerId)return;
    state.clientX=event.clientX;state.clientY=event.clientY;
    if(!state.active){
      if(Math.hypot(event.clientX-state.startX,event.clientY-state.startY)<6)return;
      activateDrag(state);
    }
    event.preventDefault();
    updateFloatingCard(state);
    movePlaceholder(state,dragDestination(event.clientY,state));
  });
  list.addEventListener('pointerup',event=>{if(dragState?.pointerId===event.pointerId)stopDrag({commit:true});});
  list.addEventListener('pointercancel',event=>{if(dragState?.pointerId===event.pointerId)stopDrag();});
  list.addEventListener('lostpointercapture',()=>{if(dragState)stopDrag();});
  // Escape abandons a live drag without moving a segment or closing the editor.
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&dragState){event.preventDefault();event.stopImmediatePropagation();stopDrag();}
  },true);
  list.addEventListener('keydown',event=>{
    const grip=event.target.closest('.segment-drag-handle');
    if(!grip||isSpinning)return;
    const from=config.segments.findIndex(s=>s.id===grip.closest('.segment-card')?.dataset.id);
    if(from<0)return;
    const to=event.key==='ArrowUp'?Math.max(0,from-1):event.key==='ArrowDown'?Math.min(config.segments.length-1,from+1):event.key==='Home'?0:event.key==='End'?config.segments.length-1:null;
    if(to===null)return;
    event.preventDefault();
    if(moveSegment(from,to,{focus:true}))toast('Segmentreihenfolge aktualisiert.');
  });
  $('addSegment').addEventListener('click',()=>{
    if(isSpinning)return;
    const n=config.segments.length;
    config.segments.push({id:makeId(),label:`Segment ${n+1}`,icon:'star',showLabel:true,showIcon:true,color:PALETTES[config.palette][n%2],weight:1});
    renderSegments();mutate();list.scrollTop=list.scrollHeight;
  });
  $('spinDuration').addEventListener('input',ev=>{config.duration=Number(ev.target.value);$('durationLabel').textContent=config.duration+' s';save();});
  $('coastIntensity').addEventListener('input',ev=>{config.coast=Number(ev.target.value);$('coastLabel').textContent=config.coast+' %';save();});
  $('proportionalMode').addEventListener('change',ev=>{if(isSpinning)return;config.proportional=ev.target.value==='proportional';mutate();renderSegments();});
  for(const key of ['pointerSpring','pointerDamping','pointerIntensity'])$(key).addEventListener('input',ev=>{config[key]=Number(ev.target.value);$(key+'Label').textContent=config[key]+' %';save();});
  $('mechanicalSound').addEventListener('change',ev=>{config.mechanicalSound=ev.target.value;save();});
  $('previewMechanicalSound').addEventListener('click',()=>{if(!isSpinning)tick(true);});
  $('soundEnabled').addEventListener('change',ev=>{config.sound=ev.target.checked;save();});
  $('winnerEffect').addEventListener('change',ev=>{if(isSpinning)return;config.winnerEffect=ev.target.value;save();if(highlightedWinner!==null)showWinnerHighlight(highlightedWinner);});
  $('winnerStrength').addEventListener('change',ev=>{if(isSpinning)return;config.winnerStrength=ev.target.value;save();if(highlightedWinner!==null)showWinnerHighlight(highlightedWinner);});
  $('winnerSound').addEventListener('change',ev=>{if(isSpinning)return;config.winnerSound=ev.target.value;save();});
  // No modal/full-screen transfer: briefly reveal the real wheel, then restore the editor.
  let previewEffectTimer=0, previewPreviousWinner=null, previewPreviousStatus='';
  function finishEffectPreview(){
    if(!previewEffectTimer)return;
    clearTimeout(previewEffectTimer);
    previewEffectTimer=0;
    // Leave the editor open. Only the preview-specific backdrop override ends.
    editorBackdrop.classList.remove('is-effect-preview');
    if(!isSpinning){
      if(previewPreviousWinner===null)clearWinnerHighlight();
      else if(previewPreviousWinner!==highlightedWinner)showWinnerHighlight(previewPreviousWinner);
      $('spinHub').disabled=!hasEligibleSegments();
    }
    $('statusText').textContent=previewPreviousStatus;
    if(!editorPanel.hidden)$('previewWinnerEffect').focus({preventScroll:true});
  }
  function startEffectPreview(){
    if(isSpinning||!hasEligibleSegments()||!presentation.hidden||editorPanel.hidden)return;
    if(!previewEffectTimer){
      previewPreviousWinner=highlightedWinner;
      previewPreviousStatus=$('statusText').textContent;
    }else clearTimeout(previewEffectTimer);
    // Keep the drawer and its scroll position, but reveal the unblurred wheel.
    editorBackdrop.classList.add('is-effect-preview');
    $('spinHub').disabled=true; // preview must not accidentally trigger a spin
    showWinnerHighlight(previewPreviousWinner??(config.segments[currentIndex(rotation,config.segments.length)]?.weight>0?currentIndex(rotation,config.segments.length):config.segments.findIndex(item=>item.weight>0)));
    $('statusText').textContent='Effektvorschau: Das Rad ist vier Sekunden ohne Blur sichtbar.';
    previewEffectTimer=setTimeout(finishEffectPreview,4000);
  }
  $('previewWinnerEffect').addEventListener('click',startEffectPreview);
  $('previewWinnerSound').addEventListener('click',()=>{if(!isSpinning)playWinnerSound(config.winnerSound);});
  $('paletteSelect').addEventListener('change',ev=>{
    if(isSpinning)return;
    config.palette=ev.target.value;
    config.segments.forEach((s,i)=>{s.color=PALETTES[config.palette][i%2];});
    renderSegments();mutate();toast('Farbpalette übernommen.');
  });
  $('resetConfig').addEventListener('click',()=>{
    if(!confirm('Alle Segmente und Einstellungen auf die Ausgangsversion zurücksetzen?'))return;
    config=defaultConfig();rotation=0;clearWinnerHighlight();render();save();$('statusText').textContent='Auf die goldene Mitte klicken, um zu drehen';toast('Ausgangskonfiguration wiederhergestellt.');
  });
  function renderProfiles(){
    const picker=$('profilePicker');picker.replaceChildren();
    for(const item of workspace.items){const option=document.createElement('option');option.value=item.id;option.textContent=item.name;picker.append(option);}
    picker.value=workspace.activeId;
    if(document.activeElement!==$('profileName'))$('profileName').value=profile().name;
    $('deleteProfile').disabled=isSpinning||workspace.items.length<=1;
  }
  function commitProfileChange(next,message){
    if(!persist(next)){toast('Speichern fehlgeschlagen. Bisherige Glücksräder bleiben erhalten.');return false;}
    workspace=next;
    config=profile().config;
    rotation=0;clearWinnerHighlight();render();
    $('statusText').textContent='Auf die goldene Mitte klicken, um zu drehen';
    if(message)toast(message);
    return true;
  }
  function switchProfile(id){
    if(isSpinning||id===workspace.activeId)return;
    if(!save()){renderProfiles();toast('Wechsel nicht möglich: Änderungen konnten nicht gespeichert werden.');return;}
    if(!workspace.items.some(item=>item.id===id))return;
    commitProfileChange({...workspace,activeId:id},'Glücksrad geladen.');
  }
  $('profilePicker').addEventListener('change',ev=>switchProfile(ev.target.value));
  $('profileName').addEventListener('change',()=>renameCurrentProfile());
  function renameCurrentProfile(){
    if(isSpinning)return;
    const name=profileName($('profileName').value);
    const next=JSON.parse(JSON.stringify(workspace));
    next.items.find(item=>item.id===next.activeId).name=name;
    if(commitProfileChange(next,'Glücksrad umbenannt.'))$('profileName').value=name;
  }
  $('renameProfile').addEventListener('click',renameCurrentProfile);
  $('saveProfile').addEventListener('click',()=>{if(save())toast('Glücksrad gespeichert.');else toast('Lokaler Speicher ist nicht verfügbar.');});
  $('newProfile').addEventListener('click',()=>{
    if(isSpinning||!save())return;
    if(workspace.items.length>=100){toast('Maximal 100 gespeicherte Glücksräder.');return;}
    const name=profileName($('profileName').value);
    const next=JSON.parse(JSON.stringify(workspace)),item=makeProfile(name===profile().name?'Glücksrad '+(workspace.items.length+1):name,defaultConfig());
    next.items.push(item);next.activeId=item.id;
    commitProfileChange(next,'Neues Glücksrad angelegt.');
  });
  $('duplicateProfile').addEventListener('click',()=>{
    if(isSpinning||!save())return;
    if(workspace.items.length>=100){toast('Maximal 100 gespeicherte Glücksräder.');return;}
    const next=JSON.parse(JSON.stringify(workspace));
    const copy=makeProfile(profile().name+' (Kopie)',saneConfig(config));
    next.items.push(copy);next.activeId=copy.id;
    commitProfileChange(next,'Glücksrad dupliziert.');
  });
  $('deleteProfile').addEventListener('click',()=>{
    if(isSpinning||workspace.items.length<=1)return;
    if(!confirm('Glücksrad „'+profile().name+'“ dauerhaft aus diesem Browser löschen? Vorher ggf. exportieren.'))return;
    const next=JSON.parse(JSON.stringify(workspace));
    next.items=next.items.filter(item=>item.id!==workspace.activeId);next.activeId=next.items[0].id;
    commitProfileChange(next,'Glücksrad gelöscht.');
  });
  function downloadJson(data,filename){
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function fileSlug(value){return profileName(value).toLowerCase().normalize('NFKD').replace(/[^a-z0-9äöüß]+/g,'-').replace(/^-|-$/g,'').slice(0,45)||'gluecksrad';}
  function exportDate(){return new Date().toISOString().slice(0,10);}
  $('exportJson').addEventListener('click',()=>{
    downloadJson({...config,id:profile().id,name:profile().name,format:'casino-noir-single',version:2},'casino-noir-'+fileSlug(profile().name)+'-'+exportDate()+'.json');
    toast('Aktuelles Glücksrad exportiert.');
  });
  $('exportAllJson').addEventListener('click',()=>{
    downloadJson({format:'casino-noir-collection',version:2,exportedAt:new Date().toISOString(),activeId:workspace.activeId,configurations:workspace.items},'casino-noir-alle-gluecksraeder-'+exportDate()+'.json');
    toast('Alle Glücksräder exportiert.');
  });
  $('importJson').addEventListener('click',()=>{if(!isSpinning){$('importFile').value='';$('importFile').click();}});
  $('importFile').addEventListener('change',async ev=>{
    const file=ev.target.files?.[0];if(!file||isSpinning)return;
    if(file.size>8*1024*1024){toast('Die JSON-Datei ist zu groß (maximal 8 MB).');return;}
    try{
      const parsed=JSON.parse(await file.text()),mode=$('importMode').value;
      if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error('Keine gültige Konfigurationsdatei.');
      if(parsed.version!==undefined&&(!Number.isInteger(parsed.version)||parsed.version<1||parsed.version>2))throw Error('Unbekannte JSON-Version.');
      const collection=parsed.format==='casino-noir-collection';
      if(parsed.format&& !['casino-noir-collection','casino-noir-single'].includes(parsed.format))throw Error('Unbekanntes Importformat.');
      if(collection&&(!Array.isArray(parsed.configurations)||!parsed.configurations.length||parsed.configurations.length>100))throw Error('Ungültige Sammlung.');
      const input=collection?parsed.configurations:[{id:parsed.id,name:parsed.name,config:parsed}];
      // Validate the complete import before touching the workspace (atomic import).
      const prepared=input.map((item,i)=>{
        if(!item||typeof item!=='object'||!item.config)throw Error('Ungültiger Datensatz '+(i+1)+'.');
        const cfg=saneConfig(item.config,{strict:true});
        const id=typeof item.id==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(item.id)?item.id:profileId();
        return makeProfile(item.name||file.name.replace(/\.json$/i,''),cfg,id);
      });
      const next=JSON.parse(JSON.stringify(workspace));
      let newActive=next.activeId,first=true;
      for(const incoming of prepared){
        const existing=mode==='replace'?(collection?next.items.findIndex(p=>p.id===incoming.id||p.name===incoming.name):next.items.findIndex(p=>p.id===next.activeId)):-1;
        if(existing>=0){const previous=next.items[existing];incoming.id=previous.id;next.items[existing]=incoming;if(first)newActive=incoming.id;}
        else {
          incoming.id=profileId();
          if(next.items.some(p=>p.name===incoming.name))incoming.name+=' (Import)';
          next.items.push(incoming);if(first)newActive=incoming.id;
        }
        first=false;
      }
      if(next.items.length>100)throw Error('Maximal 100 gespeicherte Glücksräder.');
      next.activeId=newActive;
      if(!commitProfileChange(next,prepared.length+' Glücksrad/-räder importiert.'))throw Error('Der Browser konnte die Sammlung nicht speichern.');
    }catch(error){toast('Import fehlgeschlagen: '+error.message);}
    finally{ev.target.value='';} // Re-importing the same filename must trigger change again.
  });
  function openIconPicker(id){
    currentIconTarget=id;lastFocusedElement=document.activeElement;
    modal.hidden=false;activeCategory='Alle';$('iconSearch').value='';$('customIconName').value='';renderIconPicker();$('iconSearch').focus();
    if(!fullCatalogReady) loadIconCatalog();
    if(!iconSearchReady)loadIconSearchMetadata();
  }
  function closeIconPicker(){modal.hidden=true;currentIconTarget=null;lastFocusedElement?.focus?.();}
  $('closeIconModal').addEventListener('click',closeIconPicker);
  modal.addEventListener('click',ev=>{if(ev.target===modal)closeIconPicker();});
  document.addEventListener('keydown',ev=>{if(ev.key==='Escape'){if(!modal.hidden)closeIconPicker();else if(!presentation.hidden)closePresentation();else if(previewEffectTimer)finishEffectPreview();else if(!editorPanel.hidden)setEditorOpen(false);}});
  function iconColumnCount(){return window.matchMedia('(max-width: 520px)').matches?4:5;}
  function paintVisibleIconRows(){
    const grid=$('iconGrid');
    const names=iconMatches;
    if(!names.length){
      grid.innerHTML='<div class="stage-notice" role="status">Keine passenden Symbole gefunden. Suche nach Symbolnamen, englischen Schlagwörtern oder deutschen Begriffen.</div>';
      return;
    }
    const cols=iconColumnCount(), pitch=ICON_ROW_HEIGHT+ICON_ROW_GAP;
    const rows=Math.ceil(names.length/cols);
    const top=Math.max(0,Math.floor(grid.scrollTop/pitch)-ICON_OVERSCAN_ROWS);
    const bottom=Math.min(rows,Math.ceil((grid.scrollTop+grid.clientHeight)/pitch)+ICON_OVERSCAN_ROWS);
    const first=top*cols, last=Math.min(names.length,bottom*cols);
    // Die gesamte Trefferliste ist scrollbar, auch wenn nur die sichtbaren
    // Reihen tatsächlich DOM-Elemente haben (virtuelles Raster).
    const choices=names.slice(first,last).map((icon,j)=>`<button type="button" class="symbol-choice" data-icon="${icon}" title="${escapeHtml(icon)}" aria-label="${escapeHtml(icon.replaceAll('_',' '))}" aria-posinset="${first+j+1}" aria-setsize="${names.length}">${materialIconMarkup(icon)}<small>${escapeHtml(icon.replaceAll('_',' '))}</small></button>`).join('');
    grid.innerHTML=`<div class="icon-virtual-space" style="height:${rows*pitch+14}px"><div class="icon-virtual-items" style="top:${top*pitch+7}px">${choices}</div></div>`;
  }
  function renderIconPicker(){
    const current=ICONS;
    const allCount=fullCatalogReady?current.length.toLocaleString('de-DE'):`${current.length} Favoriten`;
    $('iconCategories').innerHTML=['Alle',...Object.keys(ICON_GROUPS)].map(name=>`<button type="button" class="category-chip" data-category="${escapeHtml(name)}" aria-pressed="${name===activeCategory}">${name==='Alle'?'Alle ('+allCount+')':escapeHtml(name)}</button>`).join('');
    const status=$('iconCatalogStatus');
    if(fullCatalogReady){
      status.textContent=`${current.length.toLocaleString('de-DE')} Material Symbols Rounded durchsuchbar${iconCatalogError?' (gespeicherter Stand)':''}.`;
      status.dataset.status='ready';
    }else if(iconCatalogRequest){
      status.textContent=`Vollständiger Google-Katalog wird geladen … ${FEATURED_ICONS.length} Favoriten sind bereits verfügbar.`;
      status.dataset.status='loading';
    }else if(iconCatalogError){
      status.textContent=`${iconCatalogError}. Derzeit ${FEATURED_ICONS.length} Favoriten. Bitte Verbindung prüfen oder erneut versuchen.`;
      status.dataset.status='error';
    }else{
      status.textContent=`Katalog wird vorbereitet … ${FEATURED_ICONS.length} Favoriten sind verfügbar.`;
      status.dataset.status='loading';
    }
    if(fullCatalogReady){
      status.textContent+=iconSearchReady?' · Google-Schlagwörter aktiv.':
        iconSearchRequest?' · Such-Tags werden geladen …':
        iconSearchError?' · Schlagwörter nicht geladen (Namenssuche bleibt nutzbar).':' · Such-Tags bereit zum Laden.';
    }
    $('retryIconCatalog').hidden=fullCatalogReady&&!iconCatalogError&&(iconSearchReady||!!iconSearchRequest);
    const rawQuery=normalizeSearchText($('iconSearch').value);
    const q=SEARCH_SPELLING[rawQuery]||rawQuery;
    const pool=activeCategory==='Alle'?current:ICON_GROUPS[activeCategory]||[];
    iconMatches=q?pool.map(name=>({name,score:iconSearchScore(name,q)}))
      .filter(entry=>entry.score>0)
      .sort((a,b)=>b.score-a.score||
        (ICON_SEARCH_TAGS.get(a.name)?.popularity??100000)-(ICON_SEARCH_TAGS.get(b.name)?.popularity??100000)||
        a.name.localeCompare(b.name)).map(entry=>entry.name):[...pool];
    iconMatchCount=iconMatches.length;
    const shownCount=iconMatchCount.toLocaleString('de-DE');
    $('iconResultCount').textContent=iconMatchCount?`${shownCount} Treffer – alle über die Liste erreichbar`:'Keine Treffer';
    paintVisibleIconRows();
  }
  $('iconCategories').addEventListener('click',ev=>{
    const btn=ev.target.closest('button[data-category]');
    if(btn){activeCategory=btn.dataset.category;$('iconGrid').scrollTop=0;renderIconPicker();}
  });
  $('iconSearch').addEventListener('input',()=>{$('iconGrid').scrollTop=0;renderIconPicker();});
  $('iconGrid').addEventListener('scroll',()=>{
    if(iconScrollFrame)return;
    iconScrollFrame=requestAnimationFrame(()=>{iconScrollFrame=0;paintVisibleIconRows();});
  },{passive:true});
  window.addEventListener('resize',()=>{if(!modal.hidden)paintVisibleIconRows();});
  $('retryIconCatalog').addEventListener('click',()=>{if(!fullCatalogReady||iconCatalogError)loadIconCatalog(true);if(!iconSearchReady)loadIconSearchMetadata(true);});
  function setIconForCurrent(rawIcon){
    const icon=normalizeIconName(rawIcon);
    if(!validIcon(icon)||!ICONS.includes(icon)){
      toast(fullCatalogReady
        ? `„${String(rawIcon).slice(0,30)}“ gibt es nicht als Material Symbol. Bitte ein angezeigtes Symbol wählen.`
        : 'Der vollständige Google-Katalog ist noch nicht verfügbar. Bitte Symbol aus der Liste wählen.');
      return;
    }
    const s=config.segments.find(s=>s.id===currentIconTarget);if(!s)return;
    s.icon=icon;s.showIcon=true;
    closeIconPicker();renderSegments();mutate();
    if(icon!==String(rawIcon).trim().toLowerCase())toast(`„${rawIcon}“ entspricht dem Google-Symbol „${icon}“.`);
  }
  $('iconGrid').addEventListener('click',ev=>{const btn=ev.target.closest('button[data-icon]');if(btn)setIconForCurrent(btn.dataset.icon);});
  $('useCustomIcon').addEventListener('click',()=>setIconForCurrent($('customIconName').value.trim().toLowerCase()));
  $('customIconName').addEventListener('keydown',ev=>{if(ev.key==='Enter')setIconForCurrent(ev.target.value.trim().toLowerCase());});
  // Präsentationsmodus: nur EINE Radinstanz wird verschoben, sodass Ergebnis,
  // Bedienbarkeit und Animation in beiden Layouts immer synchron bleiben.
  // The effect preview uses the existing full-screen wheel stage. This removes
  // the blurred/dimmed editor backdrop completely, rather than trying to show
  // a winner effect behind the settings drawer.
  let effectPreviewActive=false;
  function openPresentation({winnerPreview=false}={}){
    if(isSpinning)return;
    const returnToEditor=winnerPreview&&!editorPanel.hidden;
    if(!editorPanel.hidden)setEditorOpen(false);
    effectPreviewActive=returnToEditor;
    presentation.hidden=false;
    presentation.classList.toggle('is-effect-preview',winnerPreview);
    $('presentationTarget').appendChild(assembly);
    const closeButton=$('closePresentation');
    closeButton.textContent=winnerPreview?'✕ Zurück zur Konfiguration':'✕ Schließen';
    closeButton.setAttribute('aria-label',winnerPreview?'Zur Konfiguration zurückkehren':'Präsentationsmodus schließen');
    if(winnerPreview){
      const index=highlightedWinner??0;
      $('presentationResult').textContent=`Effektvorschau · ${safeText(config.segments[index]?.label)}`;
      showWinnerHighlight(index);
      closeButton.focus();
    }else{
      $('presentationResult').textContent='Auf die goldene Mitte klicken, um zu drehen';
      $('spinHub').focus();
    }
  }
  function closePresentation(){
    if(isSpinning)return;
    presentation.hidden=true;
    presentation.classList.remove('is-effect-preview');
    wheelStage.appendChild(assembly);
    if(effectPreviewActive){
      effectPreviewActive=false;
      // Return focus to an element in the page *before* reopening the dialog;
      // otherwise the next editor close could target the hidden overlay button.
      editorToggle.focus();
      setEditorOpen(true);
      $('previewWinnerEffect').focus();
    }else{
      $('showOnlyWheel').focus();
    }
  }
  $('showOnlyWheel').addEventListener('click',()=>openPresentation());
  $('closePresentation').addEventListener('click',closePresentation);
  function rand(){if(globalThis.crypto?.getRandomValues){const buf=new Uint32Array(1);crypto.getRandomValues(buf);return buf[0]/4294967296;}return Math.random();}
  function ensureAudioContext(){
    try{
      const Ctx=window.AudioContext||window.webkitAudioContext;
      if(!Ctx)return null;
      if(!audioContext)audioContext=new Ctx();
      if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
      return audioContext;
    }catch{return null;}
  }
  function playWinnerSound(mode){
    if(mode==='off')return;
    const ctx=ensureAudioContext();if(!ctx||ctx.state==='closed')return;
    // Original Web Audio motifs: no external recordings or licensed audio.
    const patterns={
      soft:[[0,523,.34]],
      bell:[[0,659,.7],[.13,988,.6]],
      chime:[[0,523,.23],[.18,659,.23],[.36,784,.55]],
      jackpot:[[0,392,.12],[.13,494,.12],[.26,587,.13],[.4,784,.13],[.55,988,.42],[.69,1175,.58]],
      fanfare:[[0,392,.18],[.20,523,.18],[.40,659,.18],[.62,784,.42],[.85,659,.15],[1.03,1047,.65]]
    };
    const sequence=patterns[mode];if(!sequence)return;
    for(const [offset,freq,length] of sequence){
      try{
        const now=ctx.currentTime+offset,osc=ctx.createOscillator(),gain=ctx.createGain();
        osc.type=mode==='fanfare'?'triangle':mode==='soft'?'sine':'sine';
        osc.frequency.setValueAtTime(freq,now);
        if(mode==='jackpot')osc.frequency.linearRampToValueAtTime(freq*1.018,now+Math.min(length,.12));
        gain.gain.setValueAtTime(.0001,now);
        gain.gain.exponentialRampToValueAtTime(mode==='soft'?.036:.054,now+.022);
        gain.gain.exponentialRampToValueAtTime(.0001,now+length);
        osc.connect(gain);gain.connect(ctx.destination);
        osc.start(now);osc.stop(now+length+.03);
      }catch{/* Audio output is optional; visual result must never fail. */}
    }
  }
  function normalized(angle){return ((angle%360)+360)%360;}
  function tick(force=false){
    if(!force&&!config.sound)return;
    const ctx=ensureAudioContext();if(!ctx||ctx.state==='closed')return;
    const tones={
      subtle:{type:'sine',high:730,low:390,length:.028,gain:.024},
      ratchet:{type:'square',high:1080,low:390,length:.037,gain:.018},
      metal:{type:'triangle',high:1460,low:260,length:.075,gain:.047},
      casino:{type:'triangle',high:890,low:470,length:.043,gain:.030}
    };
    const p=tones[config.mechanicalSound]||tones.casino;
    try{
      const oscillator=ctx.createOscillator(),gain=ctx.createGain(),now=ctx.currentTime;
      oscillator.type=p.type;
      oscillator.frequency.setValueAtTime(p.high,now);
      oscillator.frequency.exponentialRampToValueAtTime(p.low,now+p.length);
      gain.gain.setValueAtTime(p.gain,now);
      gain.gain.exponentialRampToValueAtTime(.0001,now+p.length);
      oscillator.connect(gain);gain.connect(ctx.destination);
      oscillator.start(now);oscillator.stop(now+p.length+.008);
      if(config.mechanicalSound==='metal'){
        const overtone=ctx.createOscillator(),volume=ctx.createGain();
        overtone.type='sine';overtone.frequency.value=2370;
        volume.gain.setValueAtTime(.016,now);
        volume.gain.exponentialRampToValueAtTime(.0001,now+.09);
        overtone.connect(volume);volume.connect(ctx.destination);
        overtone.start(now);overtone.stop(now+.1);
      }
    }catch{/* Optional audio must never block a spin. */}
  }
  function currentIndex(angle,n,layout){return selectedAtRotation(angle,layout||segmentLayout());}
  // Kept as a documented reference for the original coast control.
  function coastExponent(coast){return 3.9-2.55*Math.max(0,Math.min(100,coast))/100;}
  function spinEase(t,coast){return 1-Math.pow(1-Math.max(0,Math.min(1,t)),coastExponent(coast));}
  // Integrate a smooth acceleration ramp followed by monotonic, continuously
  // decreasing velocity. All phases share the same total angular displacement.
  function motionProgress(t,coast){
    const x=Math.max(0,Math.min(1,t)),a=.075,p=coastExponent(coast);
    const rampArea=2*a/Math.PI,brakeArea=(1-a)/p,total=rampArea+brakeArea;
    if(x<=a)return (2*a/Math.PI*(1-Math.cos(Math.PI*x/(2*a))))/total;
    return (rampArea+brakeArea*(1-Math.pow((1-x)/(1-a),p)))/total;
  }
  const pointer=$('fixedPointer');
  let pointerAngle=0,pointerVelocity=0,pointerRaf=0,pointerLastTime=0;
  function setPointerAngle(value){
    pointerAngle=value;
    // SVG transform never reads layout and remains independent of the rotating wheel.
    pointer.setAttribute('transform',`rotate(${pointerAngle.toFixed(3)} 320 16)`);
  }
  function settlePointerStep(dt){
    const omega=12+config.pointerSpring*.22;
    const damping=.12+config.pointerDamping*.012;
    const substeps=Math.max(1,Math.ceil(dt/.012)),h=dt/substeps;
    for(let i=0;i<substeps;i++){
      pointerVelocity+=(-omega*omega*pointerAngle-2*damping*omega*pointerVelocity)*h;
      setPointerAngle(Math.max(-18,Math.min(18,pointerAngle+pointerVelocity*h)));
    }
  }
  function pointerContact(angularVelocity){
    const strength=.2+.8*config.pointerIntensity/100;
    pointerVelocity=Math.max(-320,pointerVelocity-240*strength/(1+angularVelocity/800));
  }
  function finishPointerMovement(){
    cancelAnimationFrame(pointerRaf);
    let frames=0;
    function settle(now){
      if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){setPointerAngle(0);pointerVelocity=0;return;}
      const dt=pointerLastTime?Math.min(.032,(now-pointerLastTime)/1000):.016;
      pointerLastTime=now;settlePointerStep(dt);
      if(++frames>120||(Math.abs(pointerAngle)<.03&&Math.abs(pointerVelocity)<.15)){setPointerAngle(0);pointerVelocity=0;return;}
      pointerRaf=requestAnimationFrame(settle);
    }
    pointerLastTime=0;pointerRaf=requestAnimationFrame(settle);
  }
  // 0 -> 100 -> 0 every 1.6 seconds. A timestamp-based triangle wave keeps
  // the captured power independent of animation frame rate and input latency.
  const POWER_PERIOD_MS=1600;
  const powerMeter=$('powerMeter'), powerFill=$('powerFill'), powerTip=$('powerTip');
  const powerOutput=$('powerValue');
  let powerEpoch=performance.now()-310, powerLevel=0, powerRaf=0, lastAnnouncedPower=-1;
  function powerAt(time){
    const phase=((time-powerEpoch)%POWER_PERIOD_MS+POWER_PERIOD_MS)%POWER_PERIOD_MS/POWER_PERIOD_MS;
    return Math.max(0,Math.min(1,phase<=.5 ? phase*2 : (1-phase)*2));
  }
  function displayPower(level){
    powerLevel=level;
    const value=Math.round(level*100);
    powerFill.style.height=value+'%';
    powerTip.style.bottom=value+'%';
    powerOutput.value=value+'%';
    if(value!==lastAnnouncedPower){
      powerMeter.setAttribute('aria-valuenow',String(value));
      powerMeter.setAttribute('aria-valuetext',value+' Prozent Drehkraft');
      lastAnnouncedPower=value;
    }
  }
  function animatePower(time){
    if(!isSpinning)displayPower(hasEligibleSegments()?powerAt(time):0);
    powerRaf=document.hidden?0:requestAnimationFrame(animatePower);
  }
  if(!document.hidden)powerRaf=requestAnimationFrame(animatePower);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){cancelAnimationFrame(powerRaf);powerRaf=0;}
    else if(!powerRaf)powerRaf=requestAnimationFrame(animatePower);
  });
  let raf=0;
  function spin(){
    const n=config.segments.length;
    if(isSpinning||!hasEligibleSegments())return;
    let winner;
    try{winner=drawWeightedWinner();}
    catch(error){toast(error.message);return;}
    clearWinnerHighlight();
    const power=powerAt(performance.now());
    displayPower(power);
    isSpinning=true;
    if(config.winnerSound!=='off'||config.sound)ensureAudioContext();
    powerMeter.classList.add('is-locked');
    lockEditor(true);$('spinHub').disabled=true;$('spinHub').classList.add('is-spinning');
    const percent=Math.round(power*100);
    $('statusText').textContent=`Drehkraft ${percent} % · Das Rad dreht sich …`;
    $('presentationResult').textContent='';
    const layout=segmentLayout();
    // The winner is sampled before the spin, independently of power. The
    // trajectory is strictly monotonic and lands on the actual winning centre.
    const target=layout[winner],finalModulo=normalized(-(target.center+90));
    const forward=normalized(finalModulo-normalized(rotation));
    const turns=2+Math.round(power*8);
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const visibleTurns=reduced?0:turns;
    const from=rotation,delta=visibleTurns*360+forward,finish=from+delta;
    const duration=reduced?280:config.duration*1000*(.35+.65*power);
    const start=performance.now();
    let lastTime=start,lastAngle=from;
    lastTickAt=0;lastTickSector=currentIndex(from,n,layout);
    cancelAnimationFrame(pointerRaf);pointerRaf=0;pointerLastTime=0;
    if(reduced){setPointerAngle(0);pointerVelocity=0;}
    function frame(now){
      const t=Math.min(1,(now-start)/duration);
      const angle=from+delta*motionProgress(t,config.coast);
      wheel.style.transform=`rotate(${angle}deg)`;
      const dt=Math.min(.04,Math.max(0,(now-lastTime)/1000));
      const speed=dt?Math.abs((angle-lastAngle)/dt):0;
      const sector=currentIndex(angle,n,layout);
      // Coalesce ultra-fast contacts so even 5,000 segments stay responsive.
      if(!reduced&&(sector!==lastTickSector||Math.abs(angle-lastAngle)>360/n)&&now-lastTickAt>=35){
        lastTickSector=sector;lastTickAt=now;
        pointerContact(speed);tick();
      }
      if(!reduced)settlePointerStep(dt);
      lastAngle=angle;lastTime=now;
      if(t<1){raf=requestAnimationFrame(frame);return;}
      rotation=finish;wheel.style.transform=`rotate(${rotation}deg)`;
      isSpinning=false;powerMeter.classList.remove('is-locked');powerEpoch=performance.now()-310;
      lockEditor(false);$('spinHub').disabled=!hasEligibleSegments();$('spinHub').classList.remove('is-spinning');
      if(!reduced)finishPointerMovement();
      showWinnerHighlight(winner);playWinnerSound(config.winnerSound);
      const selected=config.segments[winner],result=safeText(selected.label);
      $('statusText').textContent=`Ergebnis: ${result} · Feld ${winner+1} von ${n}`;
      $('presentationResult').textContent=`✦ ${result} ✦`;
      Object.assign(window.__casinoNoirDebug,{lastWinner:winner,lastRotation:rotation,spinning:false,lastPower:power,lastTurns:visibleTurns,lastDurationMs:duration,lastCoast:config.coast,lastEasingExponent:coastExponent(config.coast)});
    }
    Object.assign(window.__casinoNoirDebug,{spinning:true,lastWinner:null});
    raf=requestAnimationFrame(frame);
  }
  $('spinHub').addEventListener('click',spin);
  window.__casinoNoirDebug={get config(){return config;},get rotation(){return rotation;},get isSpinning(){return isSpinning;},get power(){return powerLevel;},get powerPeriodMs(){return POWER_PERIOD_MS;},get highlightedWinner(){return highlightedWinner;},showWinnerHighlight,playWinnerSound,get spinEase(){return spinEase;},motionProgress,segmentLayout,drawWeightedWinner,get pointerAngle(){return pointerAngle;},get iconFontReady(){return iconFontReady;},get iconCatalogReady(){return fullCatalogReady;},get iconCatalogCount(){return ICONS.length;},get iconSearchMetadataReady(){return iconSearchReady;},get iconSearchMetadataCount(){return ICON_SEARCH_TAGS.size;},get iconMatches(){return iconMatchCount;},get iconMatchingNames(){return [...iconMatches];},get iconCodepointMap(){return Object.fromEntries(ICON_CODEPOINTS);},loadIconCatalog,lastWinner:null,lastRotation:0,spinning:false,stop(){cancelAnimationFrame(raf);}};
  restoreIconCatalog();
  render();
  persist();
  loadIconCatalog();
  // Material Symbols wird offiziell als Webfont über Google Fonts bezogen.
  // Falls Offline-/Privacy-Einstellungen das Laden verhindern, bleiben hochwertige
  // lokale Unicode-Fallbacksymbole sichtbar. Kein Font ist im Paket enthalten.
  if(document.fonts?.load){
    document.fonts.load('24px "Material Symbols Rounded"','favorite').then(faces=>{
      if(!faces.length)return;
      iconFontReady=true;
      if(!isSpinning){drawWheel();renderSegments();}
      if(!modal.hidden)renderIconPicker();
    }).catch(()=>{});
  }
})();

