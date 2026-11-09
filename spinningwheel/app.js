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
    return data.map((v,i) => ({ id:makeId(), label:v[0], icon:v[1], showLabel:v[2], showIcon:v[3], color:PALETTES.noir[i%2], weight:1 }));
  }
  function defaultConfig() { return {version:1, segments:initialSegments(), duration:6, coast:65, sound:true, winnerEffect:'cinematic', winnerStrength:'refined', winnerSound:'chime', palette:'noir', sizeMode:'equal',spinMode:'physical',pointerSpring:65,pointerDamping:60,pointerIntensity:60,tickStyle:'soft'}; }
  function validColor(v) { return /^#[0-9a-f]{6}$/i.test(v || ''); }
  function validIcon(v) { return isValidMaterialSymbolName(v); }
  function clampSetting(value,fallback){return Number.isFinite(Number(value))&&value!==null?Math.max(0,Math.min(100,Number(value))):fallback;}
  function validWeight(value){
    if(value===''||value===null||typeof value==='boolean')throw new Error('Ungültiges Segmentgewicht.');
    const n=Number(value);
    if(!Number.isFinite(n)||n<0||n>1000000)throw new Error('Gewichte müssen zwischen 0 und 1.000.000 liegen.');
    return n;
  }
  function totalWeight(){return config.segments.reduce((sum,s)=>sum+s.weight,0);}
  function ranges(){
    const n=config.segments.length, total=totalWeight();
    let start=-90-(n?(config.sizeMode==='proportional'&&total>0?360*config.segments[0].weight/total:360/n)/2:0);
    return config.segments.map(s=>{
      const size=config.sizeMode==='proportional'&&total>0?360*s.weight/total:360/n;
      const range={start,end:start+size,center:start+size/2,size};start+=size;return range;
    });
  }
  let controlledWinnerSelections=0;
  function selectWinner(){
    controlledWinnerSelections++;
    const total=totalWeight();
    if(!Number.isFinite(total)||total<=0)throw new Error('Kein Segment ist gewinnberechtigt.');
    const target=rand()*total;
    let sum=0, last=-1;
    for(let i=0;i<config.segments.length;i++){
      const weight=config.segments[i].weight;
      if(weight<=0)continue;
      last=i;sum+=weight;
      if(target<sum)return i;
    }
    return last;
  }
  function saneConfig(raw) {
    if (!raw || !Array.isArray(raw.segments)) throw new Error('Die JSON-Datei enthält keine Segmentliste.');
    if (raw.segments.length > 5000) throw new Error('Mehr als 5.000 Segmente können nicht auf einmal importiert werden.');
    const palette = PALETTES[raw.palette] ? raw.palette : 'noir';
    const ids=new Set();
    return {
      version:2, palette, sizeMode:raw.sizeMode==='proportional'?'proportional':'equal',spinMode:raw.spinMode==='weighted'?'weighted':'physical', pointerSpring:clampSetting(raw.pointerSpring,65),pointerDamping:clampSetting(raw.pointerDamping,60),pointerIntensity:clampSetting(raw.pointerIntensity,60),tickStyle:['soft','mechanical','ratchet','metal'].includes(raw.tickStyle)?raw.tickStyle:'soft',
      duration: Number.isFinite(Number(raw.duration)) ? Math.min(30,Math.max(3,Math.round(Number(raw.duration)))) : 6,
      coast: Number.isFinite(Number(raw.coast)) ? Math.min(100,Math.max(0,Math.round(Number(raw.coast)))) : 65,
      sound:raw.sound !== false,
      winnerEffect: WINNER_EFFECTS.includes(raw.winnerEffect) ? raw.winnerEffect : 'cinematic',
      winnerStrength: WINNER_STRENGTHS.includes(raw.winnerStrength) ? raw.winnerStrength : 'refined',
      winnerSound: WINNER_SOUNDS.includes(raw.winnerSound) ? raw.winnerSound : 'chime',
      segments:raw.segments.map((s,i) => ({
        id:(()=>{const input=s?.id;const id=typeof input==='string'&&/^[a-z0-9-]{1,100}$/i.test(input)&&!ids.has(input)?input:makeId();ids.add(id);return id;})(), label: String(s?.label ?? '').slice(0,80),
        icon:validIcon(normalizeIconName(s?.icon)) ? normalizeIconName(s.icon) : 'star',
        showLabel:s?.showLabel !== false, showIcon:s?.showIcon !== false,
        color:validColor(s?.color) ? s.color : PALETTES[palette][i%2], weight:validWeight(s?.weight ?? 1)
      }))
    };
  }
  let config;
  try { const saved=localStorage.getItem(STORAGE_KEY); config=saved?saneConfig(JSON.parse(saved)):defaultConfig(); }
  catch { config=defaultConfig(); }
  const PROFILES_KEY='casino-noir-wheel-profiles-v2';
  const newProfileId=()=>window.crypto?.randomUUID?.()||makeId();
  let profiles;
  function cloneConfig(value){return saneConfig(JSON.parse(JSON.stringify(value)));}
  try{
    const stored=JSON.parse(localStorage.getItem(PROFILES_KEY)||'null');
    if(stored?.version===2&&Array.isArray(stored.entries)&&stored.entries.length&&stored.entries.length<=100){
      const seen=new Set();
      const entries=stored.entries.map(p=>{
        if(!p||typeof p.id!=='string'||!p.id||seen.has(p.id))throw Error('Ungültiges Profil');
        seen.add(p.id);
        return {id:p.id,name:String(p.name||'Glücksrad').slice(0,60),config:cloneConfig(p.config)};
      });
      profiles={version:2,activeId:entries.some(p=>p.id===stored.activeId)?stored.activeId:entries[0].id,entries};
      config=cloneConfig(entries.find(p=>p.id===profiles.activeId).config);
    }
  }catch(error){console.warn('Profil-Speicher konnte nicht geladen werden, ursprüngliche Konfiguration bleibt erhalten.',error);}
  if(!profiles){const id=newProfileId();profiles={version:2,activeId:id,entries:[{id,name:'Mein Glücksrad',config:cloneConfig(config)}]};}
  function activeProfile(){return profiles.entries.find(p=>p.id===profiles.activeId);}
  function profileStatus(){
    const select=$('profileSelect');
    if(!select)return;
    select.innerHTML=profiles.entries.map(p=>`<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join('');
    select.value=profiles.activeId;
  }
  function switchProfile(id){
    if(isSpinning||id===profiles.activeId)return;
    const target=profiles.entries.find(p=>p.id===id);
    if(!target)return;
    resetPointer();config=cloneConfig(target.config);profiles.activeId=id;rotation=0;wheel.style.transform='rotate(0deg)';
    clearWinnerHighlight();render();save();profileStatus();
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
  function wedgePath(start,end,r){const p=polar(r,start),q=polar(r,end);return `M 320 320 L ${p[0].toFixed(4)} ${p[1].toFixed(4)} A ${r} ${r} 0 ${end-start>180?1:0} 1 ${q[0].toFixed(4)} ${q[1].toFixed(4)} Z`;}
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
    wheel.querySelectorAll('.winner-item-lifted').forEach(node=>node.classList.remove('winner-item-lifted'));
    stage.hidden=true;
    stage.classList.remove('is-visible');
    const sector=ranges()[index],center=sector.center,step=sector.size;
    const effect=config.winnerEffect,strength=config.winnerStrength;
    const mult={subtle:.72,refined:1,show:1.33}[strength]||1;
    const dim={subtle:.40,refined:.62,show:.76}[strength]||.62;
    group.dataset.effect=effect;
    group.dataset.strength=strength;
    group.style.setProperty('--winner-dim',String(dim));
    group.style.setProperty('--winner-stroke',String(2.5*mult));
    const sectorPath=r=>n===1?circlePath(320,320,r):wedgePath(sector.start,sector.end,r);
    const [winnerX,winnerY]=polar(188,center);
    // Shared subtle marker is deliberately omitted: modes must look different.
    if(effect==='outline'){
      const under=e('path',{d:sectorPath(263),class:'winner-outline-rest'},group);
      const trace=e('path',{d:sectorPath(263),class:'winner-outline-trace'},group);
      const length=Math.ceil(trace.getTotalLength());
      trace.style.strokeDasharray=`${length} ${length}`;
      trace.style.setProperty('--trace-length',String(length));
      const [p1x,p1y]=polar(260,sector.start),[p2x,p2y]=polar(260,sector.end);
      for(const [x,y] of [[p1x,p1y],[p2x,p2y]])e('circle',{cx:x,cy:y,r:4*mult,class:'winner-outline-jewel'},group);
    }else if(effect==='spotlight'){
      shadeOtherSectors(group,index,n,step,dim);
      makeSpotBeam(group,sectorPath,center,mult);
    }else if(effect==='lift'){
      const offset=17*mult,rad=center*Math.PI/180;
      const dx=Math.cos(rad)*offset,dy=Math.sin(rad)*offset;
      e('path',{d:sectorPath(261),class:'winner-lift-groove'},group);
      const lift=e('g',{class:'winner-lift',transform:`translate(${dx.toFixed(2)} ${dy.toFixed(2)})`},group);
      const moving=e('g',{class:'winner-lift-motion'},lift);
      moving.style.setProperty('--lift-x',`${-dx.toFixed(2)}px`);
      moving.style.setProperty('--lift-y',`${-dy.toFixed(2)}px`);
      if(n===1)e('circle',{cx:320,cy:320,r:259,fill:config.segments[index].color,class:'winner-lift-face'},moving);
      else e('path',{d:sectorPath(259),fill:config.segments[index].color,class:'winner-lift-face'},moving);
      const original=wheel.querySelector(`[data-wheel-item="${index}"]`);
      if(original){moving.appendChild(original.cloneNode(true));original.classList.add('winner-item-lifted');}
      e('path',{d:sectorPath(259),class:'winner-lift-shimmer'},moving);
    }else if(effect==='lights'){
      makeMarquee(group,index,n,step,mult);
      e('path',{d:sectorPath(260),class:'winner-lights-wedge'},group);
    }else if(effect==='celebration'){
      // Keep the winner visually selected once the fireworks have faded.
      e('path',{d:sectorPath(263),class:'winner-celebration-lacquer'},group);
      makeFireworks(group,center,step,mult);
      const halo=e('circle',{cx:winnerX,cy:winnerY,r:24,class:'winner-burst-halo'},group);
      halo.style.setProperty('--halo-scale',String(2.8*mult));
    }else if(effect==='cinematic'){
      shadeOtherSectors(group,index,n,step,dim*.80);
      makeSpotBeam(group,sectorPath,center,mult);
      makeMarquee(group,index,n,step,mult);
      const rings=e('g',{class:'winner-cinema-rings'},group);
      for(let j=0;j<3;j++){
        const ring=e('circle',{cx:winnerX,cy:winnerY,r:13+j*14,class:'winner-cinema-ring'},rings);
        ring.style.animationDelay=`${j*260}ms`;
      }
      e('path',{d:sectorPath(263),class:'winner-cinema-gold'},group);
      e('circle',{cx:320,cy:320,r:279,class:'winner-cinema-orbit'},group);
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
    if(n===1)return;
    const shade=e('g',{class:'winner-shade','clip-path':'url(#faceClip)'},group);
    shade.style.setProperty('--winner-dim',String(dim));
    if(n>100){
      const disk=circlePath(320,320,265);
      e('path',{d:disk+' '+wedgePath(ranges()[index].start,ranges()[index].end,265),'fill-rule':'evenodd',class:'winner-shade-sector'},shade);
    }else{
      for(let j=0;j<n;j++){
        if(j===index)continue;
        const r=ranges()[j];if(r.size>0)e('path',{d:wedgePath(r.start,r.end,265),class:'winner-shade-sector'},shade);
      }
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
    const center=ranges()[index].center;
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
    const n=config.segments.length;
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
      const geometry=ranges();
      config.segments.forEach((s,i)=>{
        const sector=geometry[i],center=sector.center;
        const path=n===1?e('circle',{cx:320,cy:320,r:267,fill:s.color},wheelSurface):e('path',{d:wedgePath(sector.start,sector.end,267),fill:s.color,stroke:'#c69456','stroke-width':n>72?.6:n>26?1:1.9,'stroke-linejoin':'round'},wheelSurface);
        path.appendChild(e('title',{},null)); path.lastChild.textContent=`Segment ${i+1}: ${safeText(s.label)}${s.showIcon?' · '+s.icon:''}`;
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
      const geometry=ranges();
      config.segments.forEach((s,i)=>{
        const sector=geometry[i],center=sector.center;
        if(n>72) return;
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
    $('stageCount').textContent=String(n).padStart(2,'0')+' SEGMENTE'+(config.sizeMode==='proportional'?' · FLÄCHE = CHANCE':' · GLEICHE FLÄCHEN'+(config.segments.some(s=>s.weight!==config.segments[0]?.weight)?' · GEWICHTETE CHANCEN':''));
    $('spinHub').disabled=isSpinning||n===0;
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
    const list=$('segmentList');
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
        <label class="weight-control" title="Relatives Gewinngewicht"><span>Gewicht</span><input type="number" data-field="weight" min="0" max="1000000" step="any" value="${s.weight}" aria-label="Gewicht für Segment ${i+1}"><small>${segmentChance(i).toLocaleString('de-DE',{maximumFractionDigits:2})} %</small></label><span class="spacer"></span>
        <button class="icon-action" type="button" data-action="up" aria-label="Segment ${i+1} nach oben" title="Nach oben" ${i===0?'disabled':''}>↑</button>
        <button class="icon-action" type="button" data-action="down" aria-label="Segment ${i+1} nach unten" title="Nach unten" ${i===config.segments.length-1?'disabled':''}>↓</button>
        <button class="icon-action" type="button" data-action="duplicate" aria-label="Segment ${i+1} duplizieren" title="Duplizieren">⧉</button>
      </div>
    </div>`).join('');
    if(isSpinning) lockEditor(true);
  }
  for(const key of ['pointerSpring','pointerDamping','pointerIntensity'])$(key).addEventListener('input',event=>{config[key]=clampSetting(event.target.value,60);$(key+'Label').textContent=config[key]+' %';save();});
  $('tickStyle').addEventListener('change',event=>{config.tickStyle=event.target.value;save();});
  $('previewTick').addEventListener('click',()=>{ensureAudioContext();tick(true);});
  $('sizeMode').addEventListener('change',event=>{
    if(isSpinning)return;
    config.sizeMode=event.target.value==='proportional'?'proportional':'equal';
    mutate();updateWeightPercentages();renderMechanicsHint();
  });
  $('spinMode').addEventListener('change',event=>{
    if(isSpinning)return;
    config.spinMode=event.target.value==='weighted'?'weighted':'physical';
    mutate();updateWeightPercentages();renderMechanicsHint();
  });
  function renderMechanicsHint(){
    $('spinModeHint').textContent=config.spinMode==='physical'
      ?config.sizeMode==='proportional'
        ?'Echter Auslauf: Der Gewinner ergibt sich aus der Endposition. Die Sektorflächen entsprechen den Gewichten, die tatsächlichen Häufigkeiten können durch Reibung und Zeigerkontakte abweichen.'
        :'Echter Auslauf: Alle gleich großen Sektoren haben näherungsweise die gleiche Chance. Segmentgewichte beeinflussen hier das Ergebnis nicht.'
      :'Gezielte Gewichtung: Der Gewinner wird vor der Drehung nach den eingestellten Gewichten gezogen. Die Landung in der Sektormitte ist dabei eine gesteuerte Darstellung, keine Physiksimulation.';
  }
  function renderSettings(){ $('spinMode').value=config.spinMode;renderMechanicsHint(); $('sizeMode').value=config.sizeMode;for(const key of ['pointerSpring','pointerDamping','pointerIntensity']){$(key).value=config[key];$(key+'Label').textContent=config[key]+' %';}$('tickStyle').value=config.tickStyle; $('spinDuration').value=config.duration; $('durationLabel').textContent=config.duration+' s'; $('coastIntensity').value=config.coast; $('coastLabel').textContent=config.coast+' %'; $('soundEnabled').checked=config.sound; $('winnerEffect').value=config.winnerEffect; $('winnerStrength').value=config.winnerStrength; $('winnerSound').value=config.winnerSound; $('paletteSelect').value=config.palette; }
  function render(){drawWheel();renderSegments();renderSettings();updateWeightPercentages();}
  function save(){
    try {
      activeProfile().config=cloneConfig(config);
      localStorage.setItem(PROFILES_KEY,JSON.stringify(profiles));
      localStorage.setItem(STORAGE_KEY,JSON.stringify(config));
      saveOk=true;$('saveIndicator').textContent='● Lokal gespeichert';$('saveIndicator').style.color='';}
    catch {saveOk=false;$('saveIndicator').textContent='⚠ Speicherung nicht möglich';$('saveIndicator').style.color='#ffb4a0';}
  }
  $('profileSelect').addEventListener('change',event=>switchProfile(event.target.value));
  $('profileNew').addEventListener('click',()=>{
    if(isSpinning)return;
    const name=prompt('Name für das neue Glücksrad:','Neues Glücksrad');
    if(name===null)return;
    const clean=name.trim().slice(0,60);if(!clean){toast('Bitte einen Namen eingeben.');return;}
    if(profiles.entries.length>=100){toast('Maximal 100 Glücksräder.');return;}
    const id=newProfileId();profiles.entries.push({id,name:clean,config:defaultConfig()});switchProfile(id);
  });
  $('profileDuplicate').addEventListener('click',()=>{
    if(isSpinning)return;
    if(profiles.entries.length>=100){toast('Maximal 100 Glücksräder.');return;}
    const id=newProfileId(),name=(activeProfile().name+' (Kopie)').slice(0,60);
    profiles.entries.push({id,name,config:cloneConfig(config)});switchProfile(id);
  });
  $('profileRename').addEventListener('click',()=>{
    if(isSpinning)return;
    const name=prompt('Glücksrad umbenennen:',activeProfile().name);
    if(name===null)return;
    if(!name.trim()){toast('Bitte einen Namen eingeben.');return;}
    activeProfile().name=name.trim().slice(0,60);save();profileStatus();
  });
  $('profileDelete').addEventListener('click',()=>{
    if(isSpinning)return;
    if(profiles.entries.length===1){toast('Das letzte Glücksrad kann nicht gelöscht werden.');return;}
    if(!confirm('Glücksrad „'+activeProfile().name+'“ dauerhaft löschen?'))return;
    const id=profiles.entries.find(p=>p.id!==profiles.activeId).id;
    profiles.entries=profiles.entries.filter(p=>p.id!==profiles.activeId);switchProfile(id);
  });
  function downloadJson(data,filename){
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  $('profileExportAll').addEventListener('click',()=>{
    const all={...profiles,entries:profiles.entries.map(p=>({...p,config:p.id===profiles.activeId?cloneConfig(config):p.config}))};
    downloadJson(all,'casino-noir-alle-'+new Date().toISOString().slice(0,10)+'.json');
  });
  profileStatus();
  function mutate(){clearWinnerHighlight();drawWheel();save();}
  function toast(message){const n=$('toast');n.textContent=message;n.classList.add('is-visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>n.classList.remove('is-visible'),2700);}
  function lockEditor(locked){
    $('addSegment').disabled=locked;
    $('spinDuration').disabled=locked;
    $('coastIntensity').disabled=locked;
    for(const id of ['spinMode','sizeMode','pointerSpring','pointerDamping','pointerIntensity','tickStyle','previewTick','previewPointer','profileSelect','profileNew','profileDuplicate','profileRename','profileDelete','profileExportAll','profileImportMode'])$(id).disabled=locked;
    $('soundEnabled').disabled=locked;
    for(const id of ['winnerEffect','winnerStrength','winnerSound','previewWinnerEffect','previewWinnerSound'])$(id).disabled=locked;
    $('paletteSelect').disabled=locked;
    $('importJson').disabled=locked;
    $('resetConfig').disabled=locked;
    $('importFile').disabled=locked;
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
  }
  const list=$('segmentList');
  list.addEventListener('input',ev=>{
    if(isSpinning)return;
    const el=ev.target,field=el.dataset.field;
    if(field!=='label'&&field!=='color')return;
    const s=config.segments.find(x=>x.id===el.closest('.segment-card')?.dataset.id);if(!s)return;
    if(field==='color'&&!validColor(el.value))return;
    s[field]=el.value;mutate();
  });
  function segmentChance(index){
    if(index<0)return 0;
    if(config.spinMode==='physical'){
      const geo=ranges()[index];
      return geo?100*geo.size/360:0;
    }
    const total=totalWeight();
    return total?100*config.segments[index].weight/total:0;
  }
  function updateWeightPercentages(){
    const geometry=config.spinMode==='physical'?ranges():null;
    const total=totalWeight();
    const indexes=new Map(config.segments.map((s,i)=>[s.id,i]));
    for(const card of list.querySelectorAll('.segment-card')){
      const i=indexes.get(card.dataset.id),label=card.querySelector('.weight-control small');
      if(i!==undefined&&label){
        const chance=geometry?100*geometry[i].size/360:(total?100*config.segments[i].weight/total:0);
        label.textContent=(config.spinMode==='physical'?'≈ ':'')+chance.toLocaleString('de-DE',{maximumFractionDigits:2})+' %';
        label.title=config.spinMode==='physical'?'Geometrischer Sektoranteil, keine garantierte Gewinnchance':'Gewichtete Gewinnwahrscheinlichkeit';
      }
    }
  }
  list.addEventListener('change',ev=>{
    if(isSpinning)return;
    const el=ev.target,field=el.dataset.field;
    if(field==='weight'){
      const segment=config.segments.find(x=>x.id===el.closest('.segment-card')?.dataset.id);
      if(!segment)return;
      try{segment.weight=validWeight(el.value);mutate();updateWeightPercentages();}catch(error){toast(error.message);el.value=String(segment.weight);}
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
      $('spinHub').disabled=config.segments.length===0;
    }
    $('statusText').textContent=previewPreviousStatus;
    if(!editorPanel.hidden)$('previewWinnerEffect').focus({preventScroll:true});
  }
  function startEffectPreview(){
    if(isSpinning||!config.segments.length||!presentation.hidden||editorPanel.hidden)return;
    if(!previewEffectTimer){
      previewPreviousWinner=highlightedWinner;
      previewPreviousStatus=$('statusText').textContent;
    }else clearTimeout(previewEffectTimer);
    // Keep the drawer and its scroll position, but reveal the unblurred wheel.
    editorBackdrop.classList.add('is-effect-preview');
    $('spinHub').disabled=true; // preview must not accidentally trigger a spin
    showWinnerHighlight(previewPreviousWinner??currentIndex(rotation,config.segments.length));
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
  $('exportJson').addEventListener('click',()=>{
    downloadJson({version:2,name:activeProfile().name,config},'casino-noir-'+activeProfile().name.toLowerCase().replace(/[^a-z0-9äöüß-]+/gi,'-')+'-'+new Date().toISOString().slice(0,10)+'.json');
    toast('Glücksrad exportiert.');
  });
  $('importJson').addEventListener('click',()=>{if(!isSpinning){$('importFile').value='';$('importFile').click();}});
  $('importFile').addEventListener('change',async ev=>{
    const file=ev.target.files?.[0];if(!file)return;
    if(file.size>2*1024*1024){toast('Die JSON-Datei ist zu groß (maximal 2 MB).');return;}
    try{
      const parsed=JSON.parse(await file.text());
      if(parsed?.version>2)throw Error('Neuere, nicht unterstützte Formatversion.');
      let incoming;
      if(parsed?.version===2&&Array.isArray(parsed.entries)){
        if(!parsed.entries.length||parsed.entries.length>100)throw Error('Ungültige Anzahl von Profilen.');
        incoming=parsed.entries.map(p=>({name:String(p?.name||'Import').slice(0,60),config:cloneConfig(p.config)}));
      }else incoming=[{name:String(parsed.name||file.name.replace(/\.json$/i,'')).slice(0,60),config:cloneConfig(parsed.config||parsed)}];
      const mode=$('profileImportMode').value;
      if(mode==='replace'){
        if(incoming.length!==1)throw Error('Zum Ersetzen bitte eine einzelne Konfiguration auswählen.');
        if(!confirm('Aktuelles Glücksrad durch den Import ersetzen?'))return;
        config=incoming[0].config;activeProfile().config=cloneConfig(config);
      }else{
        if(profiles.entries.length+incoming.length>100)throw Error('Maximal 100 Glücksräder möglich.');
        let newest;
        for(const item of incoming){
          newest=newProfileId();profiles.entries.push({id:newest,name:item.name||'Import',config:item.config});
        }
        profiles.activeId=newest;config=cloneConfig(activeProfile().config);
      }
      rotation=0;wheel.style.transform='rotate(0deg)';clearWinnerHighlight();render();save();profileStatus();
      toast(incoming.length+' Glücksrad-Konfiguration(en) importiert.');
    }catch(err){toast('Import fehlgeschlagen: '+err.message);}
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
  function rand(){if(globalThis.crypto?.getRandomValues){const buf=new Uint32Array(2);crypto.getRandomValues(buf);return ((buf[0]>>>5)*67108864+(buf[1]>>>6))/9007199254740992;}return Math.random();}
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
  function tick(preview=false){
    if(!preview&&!config.sound)return;
    try{
      const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return;
      if(!audioContext)audioContext=new Ctx();
      if(audioContext.state==='suspended')audioContext.resume();
      const settings={
        soft:['sine',720,360,.035,.045],
        mechanical:['triangle',1020,390,.073,.033],
        ratchet:['square',720,250,.032,.018],
        metal:['triangle',560,165,.082,.09]
      };
      const [wave,high,low,volume,duration]=settings[config.tickStyle]||settings.soft;
      const osc=audioContext.createOscillator(),gain=audioContext.createGain(),now=audioContext.currentTime;
      osc.type=wave;osc.frequency.setValueAtTime(high,now);
      osc.frequency.exponentialRampToValueAtTime(low,now+duration);
      gain.gain.setValueAtTime(volume,now);
      gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
      osc.connect(gain);gain.connect(audioContext.destination);
      osc.start(now);osc.stop(now+duration+.005);
    }catch{/* Sound darf die Drehung nicht blockieren. */}
  }
  // Mechanical pointer: collisions transfer angular momentum to a hinged,
  // damped spring. SVG rotation uses a fixed viewBox pivot (320, 19), never
  // percentage-based transform origins that vary across browsers.
  let pointerAngle=0,pointerVelocity=0,pointerTime=0,pointerRaf=0;
  let pointerContactCount=0,pointerMaxDeflection=0;
  const pointer=$('fixedPointer');
  const POINTER_HINGE_X=320,POINTER_HINGE_Y=19;
  function drawPointerAngle(angle){
    pointerAngle=Math.max(-17,Math.min(17,angle));
    // Negative rotation bends the tip right as the wheel spins clockwise.
    pointer.setAttribute('transform',`rotate(${pointerAngle.toFixed(3)} ${POINTER_HINGE_X} ${POINTER_HINGE_Y})`);
    pointerMaxDeflection=Math.max(pointerMaxDeflection,Math.abs(pointerAngle));
  }
  function pointerImpulse(speed){
    if(config.pointerIntensity<=0||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return false;
    // Individual contacts are pronounced during the coast and smaller at speed.
    // Multiple closely spaced impacts accumulate with a bounded velocity.
    const velocity=Math.abs(speed);
    const factor=.18+.82/(1+velocity/480);
    const kick=440*(config.pointerIntensity/100)*factor;
    pointerVelocity=Math.max(-360,Math.min(155,pointerVelocity-kick));
    pointerContactCount++;
    if(!pointerRaf){
      pointerTime=performance.now();
      pointerRaf=requestAnimationFrame(pointerFrame);
    }
    return true;
  }
  function pointerFrame(now){
    const dt=Math.min(.032,Math.max(0,(now-pointerTime)/1000));
    pointerTime=now;
    const stiffness=65+config.pointerSpring*1.7;
    const damping=3.5+config.pointerDamping*.19;
    // Semi-implicit Euler is stable for these bounded time steps and preserves
    // natural overshoot, with all movement performed by a single rAF.
    pointerVelocity+=(-stiffness*pointerAngle-damping*pointerVelocity)*dt;
    drawPointerAngle(pointerAngle+pointerVelocity*dt);
    if(Math.abs(pointerAngle)<.025&&Math.abs(pointerVelocity)<.2){
      drawPointerAngle(0);pointerVelocity=0;pointerRaf=0;return;
    }
    pointerRaf=requestAnimationFrame(pointerFrame);
  }
  function resetPointer(){
    cancelAnimationFrame(pointerRaf);pointerRaf=0;
    pointerAngle=0;pointerVelocity=0;
    pointer.removeAttribute('transform');
  }
  // The controls are inside an off-canvas dialog whose backdrop normally blurs
  // the wheel. Temporarily reveal the actual mechanical preview without hiding
  // the editor or starting a draw.
  let pointerPreviewTimer=0;
  $('previewPointer').addEventListener('click',()=>{
    if(isSpinning)return;
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      toast('Zeigeranimation durch die Systemeinstellung für reduzierte Bewegung deaktiviert.');return;
    }
    if(config.pointerIntensity===0){
      toast('Zeigerbewegung steht auf 0 %.');return;
    }
    clearTimeout(pointerPreviewTimer);
    editorBackdrop.classList.add('is-pointer-preview');
    pointerImpulse(85);
    tick();
    pointerPreviewTimer=setTimeout(()=>{
      pointerPreviewTimer=0;
      editorBackdrop.classList.remove('is-pointer-preview');
    },1400);
  });
  function currentIndex(angle,n){ const at=normalized(-90-angle);const rs=ranges();return rs.findIndex(s=>s.size>0&&normalized(at-s.start)<s.size-1e-8); }
  // The control changes when the wheel crosses its final segment boundary.
  // A high coast value deliberately leaves more angular distance late in the spin.
  // Values are strictly monotonic, reaching exactly the chosen segment centre.
  function coastExponent(coast){return 3.9-2.55*Math.max(0,Math.min(100,coast))/100;}
  const coastCache=new Map();
  function spinEase(t,coast){
    const p=Math.max(0,Math.min(1,t)),k=coastExponent(coast);
    let table=coastCache.get(k);
    if(!table){
      const steps=400, values=[0];let area=0;
      const rate=x=>(1-Math.exp(-x/.045))*Math.pow(1-x,k-.9);
      for(let i=1;i<=steps;i++){area+=(rate((i-1)/steps)+rate(i/steps))/(2*steps);values.push(area);}
      table=values.map(v=>v/area);coastCache.set(k,table);
    }
    const x=p*400,i=Math.min(399,Math.floor(x)),f=x-i;
    return i===400?1:table[i]*(1-f)+table[i+1]*f;
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
    if(!isSpinning){displayPower(config.segments.length ? powerAt(time) : 0);}
    powerRaf=requestAnimationFrame(animatePower);
  }
  powerRaf=requestAnimationFrame(animatePower);
  let raf=0;
  let currentPhysicalState=null;
  function completeSpin(winner,angle,details){
    rotation=angle;
    wheel.style.transform=`rotate(${rotation}deg)`;
    isSpinning=false;
    powerMeter.classList.remove('is-locked');
    powerEpoch=performance.now()-310;
    lockEditor(false);
    $('spinHub').disabled=false;
    $('spinHub').classList.remove('is-spinning');
    if(winner<0||winner>=config.segments.length){
      $('statusText').textContent='Kein eindeutiges Segment am Zeiger.';
      return;
    }
    showWinnerHighlight(winner);
    playWinnerSound(config.winnerSound);
    const selected=config.segments[winner],result=safeText(selected.label);
    $('statusText').textContent=`Ergebnis: ${result} · Feld ${winner+1} von ${config.segments.length}`;
    $('presentationResult').textContent=`✦ ${result} ✦`;
    Object.assign(window.__casinoNoirDebug,{
      lastWinner:winner,lastRotation:rotation,spinning:false,
      lastPower:details.power,lastTurns:details.turns,lastDurationMs:details.durationMs,
      lastCoast:config.coast,lastEasingExponent:details.easingExponent??null,
      lastMode:details.mode,lastPhysicsContacts:details.contacts??null,
      lastPhysicalVelocity:details.velocity??null
    });
    currentPhysicalState=null;
  }
  function runMechanicalSpin(power){
    const physics=window.CasinoWheelPhysics;
    if(!physics)throw Error('Die Physik-Engine wurde nicht geladen.');
    const geometry=ranges();
    const state=physics.create({
      angle:rotation,power,duration:config.duration,coast:config.coast,
      pointerIntensity:config.pointerIntensity,pointerSpring:config.pointerSpring,
      geometry,random:rand
    });
    currentPhysicalState=state;
    lastTickAt=0;
    const startAngle=rotation;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function done(){
      const winner=physics.sectorAt(state.angle,geometry);
      completeSpin(winner,state.angle,{
        power,turns:Math.abs(state.angle-startAngle)/360,
        durationMs:state.elapsed*1000,mode:'physical',
        contacts:state.contacts,velocity:state.velocity
      });
    }
    if(reduced){
      // The physical result is still solved, but the long rotation is removed.
      physics.finish(state);
      const start=performance.now();
      function minimizedFrame(now){
        if(now-start<210){raf=requestAnimationFrame(minimizedFrame);return;}
        done();
      }
      raf=requestAnimationFrame(minimizedFrame);
      return;
    }
    let previous=performance.now();
    function frame(now){
      const dt=Math.min(.06,Math.max(0,(now-previous)/1000));previous=now;
      physics.advance(state,dt,speed=>{
        // High-frequency contacts still dissipate energy in the solver.
        // Only the perceptual sound/pointer feedback is throttled.
        if(now-lastTickAt>=36){
          lastTickAt=now;
          tick();
          pointerImpulse(speed);
        }
      });
      wheel.style.transform=`rotate(${state.angle}deg)`;
      if(state.done){done();return;}
      raf=requestAnimationFrame(frame);
    }
    raf=requestAnimationFrame(frame);
  }
  function runControlledSpin(power){
    const n=config.segments.length;
    const winner=selectWinner(), sector=ranges()[winner];
    // Legacy exact-weight mode intentionally targets the selected wedge center.
    // It is not presented as physically free-running motion.
    const finalModulo=normalized(-sector.center-90);
    const forward=normalized(finalModulo-normalized(rotation));
    const turns=2+Math.round(power*8);
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const visibleTurns=reduced?0:turns;
    const from=rotation,delta=visibleTurns*360+forward,finish=from+delta;
    const duration=reduced?280:config.duration*1000*(.35+.65*power);
    const start=performance.now();
    lastTickAt=0;lastTickSector=currentIndex(from,n);
    let lastAngle=from,lastFrameTime=start;
    function frame(now){
      const t=Math.min(1,(now-start)/duration),ease=spinEase(t,config.coast);
      const angle=from+delta*ease;
      wheel.style.transform=`rotate(${angle}deg)`;
      const sector=currentIndex(angle,n);
      if(sector>=0&&sector!==lastTickSector){
        lastTickSector=sector;
        if(now-lastTickAt>=38){
          const speed=(angle-lastAngle)/Math.max(.001,(now-lastFrameTime)/1000);
          lastTickAt=now;
          tick();pointerImpulse(speed);
        }
      }
      lastAngle=angle;lastFrameTime=now;
      if(t<1){raf=requestAnimationFrame(frame);return;}
      completeSpin(winner,finish,{
        power,turns:visibleTurns,durationMs:duration,
        easingExponent:coastExponent(config.coast),mode:'weighted'
      });
    }
    raf=requestAnimationFrame(frame);
  }
  function spin(){
    const n=config.segments.length;
    if(isSpinning||!n)return;
    if(config.spinMode==='weighted'&&totalWeight()<=0){
      toast('Alle Segmentgewichte sind 0.');return;
    }
    resetPointer();
    clearWinnerHighlight();
    const power=powerAt(performance.now());
    displayPower(power);
    isSpinning=true;
    if(config.winnerSound!=='off'||config.sound)ensureAudioContext();
    powerMeter.classList.add('is-locked');
    lockEditor(true);
    $('spinHub').disabled=true;
    $('spinHub').classList.add('is-spinning');
    const percent=Math.round(power*100);
    $('statusText').textContent=config.spinMode==='physical'
      ?`Drehkraft ${percent} % · Das Rad läuft mechanisch aus …`
      :`Drehkraft ${percent} % · Gewichtete Ziehung läuft …`;
    $('presentationResult').textContent='';
    Object.assign(window.__casinoNoirDebug,{spinning:true,lastWinner:null,lastMode:config.spinMode,lastPhysicsContacts:null});
    try{
      if(config.spinMode==='physical')runMechanicalSpin(power);
      else runControlledSpin(power);
    }catch(error){
      console.error('Drehung konnte nicht gestartet werden.',error);
      isSpinning=false;currentPhysicalState=null;
      powerMeter.classList.remove('is-locked');
      lockEditor(false);$('spinHub').disabled=false;
      $('spinHub').classList.remove('is-spinning');
      toast('Drehung fehlgeschlagen: '+error.message);
      Object.assign(window.__casinoNoirDebug,{spinning:false});
    }
  }
  $('spinHub').addEventListener('click',spin);
  window.__casinoNoirDebug={selectWinner, ranges,get controlledWinnerSelections(){return controlledWinnerSelections;},get currentPhysicalState(){return currentPhysicalState?{angle:currentPhysicalState.angle,velocity:currentPhysicalState.velocity,contacts:currentPhysicalState.contacts,elapsed:currentPhysicalState.elapsed}:null;},get pointerAngle(){return pointerAngle;},get pointerContactCount(){return pointerContactCount;},get pointerMaxDeflection(){return pointerMaxDeflection;}, get config(){return config;},get rotation(){return rotation;},get isSpinning(){return isSpinning;},get power(){return powerLevel;},get powerPeriodMs(){return POWER_PERIOD_MS;},get highlightedWinner(){return highlightedWinner;},showWinnerHighlight,playWinnerSound,get spinEase(){return spinEase;},get iconFontReady(){return iconFontReady;},get iconCatalogReady(){return fullCatalogReady;},get iconCatalogCount(){return ICONS.length;},get iconSearchMetadataReady(){return iconSearchReady;},get iconSearchMetadataCount(){return ICON_SEARCH_TAGS.size;},get iconMatches(){return iconMatchCount;},get iconMatchingNames(){return [...iconMatches];},get iconCodepointMap(){return Object.fromEntries(ICON_CODEPOINTS);},loadIconCatalog,lastWinner:null,lastRotation:0,spinning:false,stop(){cancelAnimationFrame(raf);}};
  restoreIconCatalog();
  render();
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

