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
    return data.map((v,i) => ({ id:makeId(), label:v[0], icon:v[1], showLabel:v[2], showIcon:v[3], color:PALETTES.noir[i%2] }));
  }
  function defaultConfig() { return {version:1, segments:initialSegments(), duration:6, coast:65, sound:true, winnerEffect:'cinematic', winnerStrength:'refined', winnerSound:'chime', palette:'noir'}; }
  function validColor(v) { return /^#[0-9a-f]{6}$/i.test(v || ''); }
  function validIcon(v) { return isValidMaterialSymbolName(v); }
  function saneConfig(raw) {
    if (!raw || !Array.isArray(raw.segments)) throw new Error('Die JSON-Datei enthält keine Segmentliste.');
    if (raw.segments.length > 5000) throw new Error('Mehr als 5.000 Segmente können nicht auf einmal importiert werden.');
    const palette = PALETTES[raw.palette] ? raw.palette : 'noir';
    return {
      version:1, palette,
      duration: Number.isFinite(Number(raw.duration)) ? Math.min(30,Math.max(3,Math.round(Number(raw.duration)))) : 6,
      coast: Number.isFinite(Number(raw.coast)) ? Math.min(100,Math.max(0,Math.round(Number(raw.coast)))) : 65,
      sound:raw.sound !== false,
      winnerEffect: WINNER_EFFECTS.includes(raw.winnerEffect) ? raw.winnerEffect : 'cinematic',
      winnerStrength: WINNER_STRENGTHS.includes(raw.winnerStrength) ? raw.winnerStrength : 'refined',
      winnerSound: WINNER_SOUNDS.includes(raw.winnerSound) ? raw.winnerSound : 'chime',
      segments:raw.segments.map((s,i) => ({
        id:makeId(), label: String(s?.label ?? '').slice(0,80),
        icon:validIcon(normalizeIconName(s?.icon)) ? normalizeIconName(s.icon) : 'star',
        showLabel:s?.showLabel !== false, showIcon:s?.showIcon !== false,
        color:validColor(s?.color) ? s.color : PALETTES[palette][i%2]
      }))
    };
  }
  let config;
  try { const saved=localStorage.getItem(STORAGE_KEY); config=saved?saneConfig(JSON.parse(saved)):defaultConfig(); }
  catch { config=defaultConfig(); }
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
  }
  // All winner geometry lives inside the rotating SVG group, so it remains
  // registered to the actual winning wedge at any sector count or stop angle.
  function showWinnerHighlight(index){
    const group=$('winnerHighlight'),n=config.segments.length;
    if(!group||!Number.isInteger(index)||index<0||index>=n)return;
    highlightedWinner=index;
    group.classList.remove('is-visible');
    group.replaceChildren();
    const step=360/n, center=-90+index*step;
    const effect=config.winnerEffect, strength=config.winnerStrength;
    const multiplier={subtle:.65,refined:1,show:1.35}[strength];
    group.dataset.effect=effect;
    group.dataset.strength=strength;
    group.style.setProperty('--winner-dim',String(({subtle:.22,refined:.39,show:.57})[strength]));
    group.style.setProperty('--winner-fill',String(({subtle:.11,refined:.19,show:.3})[strength]));
    group.style.setProperty('--winner-stroke',String(2.5*multiplier));
    const sectorPath=(r)=>n===1?null:wedgePath(center-step/2,center+step/2,r);
    // Other sectors are dimmed without putting a dark shape over the winning
    // sector or hiding its label. Only the disk, not the golden rim, is shaded.
    if(effect==='spotlight'||effect==='cinematic'){
      const shade=e('g',{class:'winner-shade','clip-path':'url(#faceClip)'},group);
      if(n>100){
        // For very dense wheels, one even-odd path replaces thousands of
        // individual shadow wedges and cuts out the selected sector exactly.
        const disk='M585 320 A265 265 0 1 0 55 320 A265 265 0 1 0 585 320 Z';
        e('path',{d:disk+' '+sectorPath(265),class:'winner-shade-sector','fill-rule':'evenodd'},shade);
      }else{
        for(let j=0;j<n;j++){
          if(j===index)continue;
          const mid=-90+j*step;
          if(n===1)continue;
          e('path',{d:wedgePath(mid-step/2,mid+step/2,265),class:'winner-shade-sector'},shade);
        }
      }
    }
    // Lift duplicates the exact wedge and its SVG label/icon within an offset
    // group, preventing an artificial highlight border detached from the text.
    if(effect==='lift'){
      const offset=7*multiplier,rad=center*Math.PI/180;
      const [dx,dy]=[Math.cos(rad)*offset,Math.sin(rad)*offset];
      const lift=e('g',{class:'winner-lift',transform:`translate(${dx.toFixed(3)} ${dy.toFixed(3)})`},group);
      if(n===1)e('circle',{cx:320,cy:320,r:258,fill:config.segments[index].color,class:'winner-lift-face'},lift);
      else e('path',{d:sectorPath(258),fill:config.segments[index].color,class:'winner-lift-face'},lift);
      const original=wheel.querySelector(`[data-wheel-item="${index}"]`);
      if(original)lift.appendChild(original.cloneNode(true));
    }
    // Always retain a clear selection, even after animated effects finish.
    if(n===1)e('circle',{cx:320,cy:320,r:264,class:'winner-highlight-surface'},group);
    else e('path',{d:sectorPath(264),class:'winner-highlight-surface','stroke-width':n>80?1:n>24?1.7:2.5*multiplier},group);
    if(effect==='lights'||effect==='cinematic'){
      const studs=e('g',{class:'winner-studs'},group);
      const count=56;
      const distance=(a,b)=>Math.abs((((a-b)%360)+540)%360-180);
      let selected=[];
      for(let j=0;j<count;j++){
        const angle=j*360/count-90;
        if(n===1||distance(angle,center)<=step/2+0.2)selected.push(j);
      }
      // Very narrow sectors still get a luminous stud at their center.
      if(!selected.length)selected=[Math.round(((center+90)/360)*count)%count];
      selected.forEach((j,k)=>{
        const [x,y]=polar(291,j*360/count-90);
        const bulb=e('circle',{cx:x,cy:y,r:5.4*multiplier,class:'winner-stud'},studs);
        bulb.style.animationDelay=`${Math.min(k,20)*70}ms`;
      });
    }
    if(effect==='celebration'){
      const glitters=e('g',{class:'winner-particles'},group),amount=Math.round(16*multiplier);
      const arc=Math.min(45,Math.max(7,step*.43));
      for(let i=0;i<amount;i++){
        const phi=center+((i/Math.max(1,amount-1))-.5)*arc*2;
        const [x,y]=polar(230+(i%5)*8,phi);
        const particle=e('path',{d:'M0 -5 L1.5 -1.5 L5 0 L1.5 1.5 L0 5 L-1.5 1.5 L-5 0 L-1.5 -1.5Z',transform:`translate(${x.toFixed(2)} ${y.toFixed(2)})`,class:'winner-particle'},glitters);
        const offset=phi*Math.PI/180;
        particle.style.setProperty('--spark-x',`${(Math.cos(offset)*(13+i%6*5)).toFixed(2)}px`);
        particle.style.setProperty('--spark-y',`${(Math.sin(offset)*(13+i%6*5)).toFixed(2)}px`);
        particle.style.animationDelay=`${i%6*95}ms`;
      }
    }
    // Reading and clicking stays possible: all overlays ignore pointer events.
    void group.getBoundingClientRect();
    group.classList.add('is-visible');
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
      const step=360/n;
      config.segments.forEach((s,i)=>{
        const center=-90+i*step;
        const path=n===1?e('circle',{cx:320,cy:320,r:267,fill:s.color},wheelSurface):e('path',{d:wedgePath(center-step/2,center+step/2,267),fill:s.color,stroke:'#c69456','stroke-width':n>72?.6:n>26?1:1.9,'stroke-linejoin':'round'},wheelSurface);
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
      const step=360/n;
      config.segments.forEach((s,i)=>{
        const center=-90+i*step;
        if(n>72) return;
        if(n>20){
          const [x,y]=polar(220,center);
          // Beschriftungen folgen der Segmentachse. Sobald das Segment unter
          // dem Zeiger bei 12 Uhr steht, erscheint die Nummer aufrecht.
          const labelGroup=e('g',{'data-wheel-item':i,transform:`translate(${x.toFixed(3)} ${y.toFixed(3)}) rotate(${(i*step).toFixed(5)})`},wheel);
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
        const tilt=i*step;
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
    $('stageCount').textContent=String(n).padStart(2,'0')+' SEGMENTE';
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
        <span class="segment-index" title="Segment ${i+1}">${String(i+1).padStart(2,'0')}</span>
        <label class="segment-color" title="Segmentfarbe wählen"><input type="color" data-field="color" value="${escapeHtml(s.color)}" aria-label="Farbe für Segment ${i+1}"></label>
        <input class="segment-label" type="text" data-field="label" aria-label="Beschriftung für Segment ${i+1}" placeholder="Beschriftung …" maxlength="80" value="${escapeHtml(s.label)}" ${!s.showLabel?'disabled':''}>
        <button class="segment-icon-btn" type="button" data-action="icon" aria-label="Symbol für Segment ${i+1} auswählen" title="Material-Symbol auswählen">${materialIconMarkup(s.icon)}</button>
        <button class="segment-delete" type="button" data-action="delete" aria-label="Segment ${i+1} löschen" title="Segment entfernen">×</button>
      </div>
      <div class="segment-controls">
        <label class="pill-check"><input type="checkbox" data-field="showLabel" ${s.showLabel?'checked':''}><span>Text</span></label>
        <label class="pill-check"><input type="checkbox" data-field="showIcon" ${s.showIcon?'checked':''}><span>Symbol</span></label>
        <span class="spacer"></span>
        <button class="icon-action" type="button" data-action="up" aria-label="Segment ${i+1} nach oben" title="Nach oben" ${i===0?'disabled':''}>↑</button>
        <button class="icon-action" type="button" data-action="down" aria-label="Segment ${i+1} nach unten" title="Nach unten" ${i===config.segments.length-1?'disabled':''}>↓</button>
        <button class="icon-action" type="button" data-action="duplicate" aria-label="Segment ${i+1} duplizieren" title="Duplizieren">⧉</button>
      </div>
    </div>`).join('');
    if(isSpinning) lockEditor(true);
  }
  function renderSettings(){ $('spinDuration').value=config.duration; $('durationLabel').textContent=config.duration+' s'; $('coastIntensity').value=config.coast; $('coastLabel').textContent=config.coast+' %'; $('soundEnabled').checked=config.sound; $('winnerEffect').value=config.winnerEffect; $('winnerStrength').value=config.winnerStrength; $('winnerSound').value=config.winnerSound; $('paletteSelect').value=config.palette; }
  function render(){drawWheel();renderSegments();renderSettings();}
  function save(){
    try {localStorage.setItem(STORAGE_KEY,JSON.stringify(config));saveOk=true;$('saveIndicator').textContent='● Lokal gespeichert';$('saveIndicator').style.color='';}
    catch {saveOk=false;$('saveIndicator').textContent='⚠ Speicherung nicht möglich';$('saveIndicator').style.color='#ffb4a0';}
  }
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
  list.addEventListener('change',ev=>{
    if(isSpinning)return;
    const el=ev.target,field=el.dataset.field;
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
    if(action==='icon'){openIconPicker(card.dataset.id);return;}
    if(action==='delete'){config.segments.splice(idx,1);}
    else if(action==='duplicate'){const clone={...config.segments[idx],id:makeId()};config.segments.splice(idx+1,0,clone);}
    else if(action==='up'&&idx>0){[config.segments[idx],config.segments[idx-1]]=[config.segments[idx-1],config.segments[idx]];}
    else if(action==='down'&&idx<config.segments.length-1){[config.segments[idx],config.segments[idx+1]]=[config.segments[idx+1],config.segments[idx]];}
    renderSegments();mutate();
  });
  $('addSegment').addEventListener('click',()=>{
    if(isSpinning)return;
    const n=config.segments.length;
    config.segments.push({id:makeId(),label:`Segment ${n+1}`,icon:'star',showLabel:true,showIcon:true,color:PALETTES[config.palette][n%2]});
    renderSegments();mutate();list.scrollTop=list.scrollHeight;
  });
  $('spinDuration').addEventListener('input',ev=>{config.duration=Number(ev.target.value);$('durationLabel').textContent=config.duration+' s';save();});
  $('coastIntensity').addEventListener('input',ev=>{config.coast=Number(ev.target.value);$('coastLabel').textContent=config.coast+' %';save();});
  $('soundEnabled').addEventListener('change',ev=>{config.sound=ev.target.checked;save();});
  $('winnerEffect').addEventListener('change',ev=>{if(isSpinning)return;config.winnerEffect=ev.target.value;save();if(highlightedWinner!==null)showWinnerHighlight(highlightedWinner);});
  $('winnerStrength').addEventListener('change',ev=>{if(isSpinning)return;config.winnerStrength=ev.target.value;save();if(highlightedWinner!==null)showWinnerHighlight(highlightedWinner);});
  $('winnerSound').addEventListener('change',ev=>{if(isSpinning)return;config.winnerSound=ev.target.value;save();});
  $('previewWinnerEffect').addEventListener('click',()=>{if(!isSpinning&&config.segments.length)showWinnerHighlight(highlightedWinner??0);});
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
    const data={version:1,segments:config.segments.map(({id,...rest})=>rest),duration:config.duration,coast:config.coast,sound:config.sound,winnerEffect:config.winnerEffect,winnerStrength:config.winnerStrength,winnerSound:config.winnerSound,palette:config.palette};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='casino-noir-konfiguration.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    toast('Konfiguration als JSON exportiert.');
  });
  $('importJson').addEventListener('click',()=>{if(!isSpinning){$('importFile').value='';$('importFile').click();}});
  $('importFile').addEventListener('change',async ev=>{
    const file=ev.target.files?.[0];if(!file)return;
    if(file.size>2*1024*1024){toast('Die JSON-Datei ist zu groß (maximal 2 MB).');return;}
    try{const parsed=JSON.parse(await file.text());config=saneConfig(parsed);rotation=0;clearWinnerHighlight();render();save();toast(`${config.segments.length} Segmente importiert.`);}
    catch(err){toast('Import fehlgeschlagen: '+err.message);}
  });
  function openIconPicker(id){
    currentIconTarget=id;lastFocusedElement=document.activeElement;
    modal.hidden=false;activeCategory='Alle';$('iconSearch').value='';$('customIconName').value='';renderIconPicker();$('iconSearch').focus();
    if(!fullCatalogReady) loadIconCatalog();
  }
  function closeIconPicker(){modal.hidden=true;currentIconTarget=null;lastFocusedElement?.focus?.();}
  $('closeIconModal').addEventListener('click',closeIconPicker);
  modal.addEventListener('click',ev=>{if(ev.target===modal)closeIconPicker();});
  document.addEventListener('keydown',ev=>{if(ev.key==='Escape'){if(!modal.hidden)closeIconPicker();else if(!presentation.hidden)closePresentation();else if(!editorPanel.hidden)setEditorOpen(false);}});
  function iconColumnCount(){return window.matchMedia('(max-width: 520px)').matches?4:5;}
  function paintVisibleIconRows(){
    const grid=$('iconGrid');
    const names=iconMatches;
    if(!names.length){
      grid.innerHTML='<div class="stage-notice" role="status">Keine passenden Symbole gefunden. Die Suche verwendet die englischen Google-Symbolnamen, z. B. diamond, favorite oder castle.</div>';
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
    $('retryIconCatalog').hidden=fullCatalogReady&&!iconCatalogError;
    const q=normalizeSearchText($('iconSearch').value);
    const pool=activeCategory==='Alle'?current:ICON_GROUPS[activeCategory];
    iconMatches=pool.filter(name=>!q||normalizeSearchText(name).includes(q)||normalizeSearchText(SEARCH_SYNONYMS[name]).includes(q));
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
  $('retryIconCatalog').addEventListener('click',()=>loadIconCatalog(true));
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
  function openPresentation(){if(isSpinning)return;if(!editorPanel.hidden)setEditorOpen(false);presentation.hidden=false;$('presentationTarget').appendChild(assembly);$('presentationResult').textContent='Auf die goldene Mitte klicken, um zu drehen';$('spinHub').focus();}
  function closePresentation(){if(isSpinning)return;presentation.hidden=true;wheelStage.appendChild(assembly);$('showOnlyWheel').focus();}
  $('showOnlyWheel').addEventListener('click',openPresentation);
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
  function tick(){
    if(!config.sound)return;
    try{
      const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return;
      if(!audioContext)audioContext=new Ctx();if(audioContext.state==='suspended')audioContext.resume();
      const oscillator=audioContext.createOscillator(),gain=audioContext.createGain(),now=audioContext.currentTime;
      oscillator.type='triangle';oscillator.frequency.setValueAtTime(870,now);oscillator.frequency.exponentialRampToValueAtTime(340,now+.035);
      gain.gain.setValueAtTime(.065,now);gain.gain.exponentialRampToValueAtTime(.001,now+.04);
      oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.start(now);oscillator.stop(now+.04);
    }catch{/* Sound ist optional und darf die Drehung nie blockieren. */}
  }
  function currentIndex(angle,n){return ((Math.round(-normalized(angle)/(360/n))%n)+n)%n;}
  // The control changes when the wheel crosses its final segment boundary.
  // A high coast value deliberately leaves more angular distance late in the spin.
  // Values are strictly monotonic, reaching exactly the chosen segment centre.
  function coastExponent(coast){return 3.9-2.55*Math.max(0,Math.min(100,coast))/100;}
  function spinEase(t,coast){return 1-Math.pow(1-Math.max(0,Math.min(1,t)),coastExponent(coast));}
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
  function spin(){
    const n=config.segments.length;if(isSpinning||!n)return;
    clearWinnerHighlight();
    const power=powerAt(performance.now());
    displayPower(power); // Capture at the actual click, not at the previous frame.
    isSpinning=true;if(config.winnerSound!=='off'||config.sound)ensureAudioContext();powerMeter.classList.add('is-locked');
    lockEditor(true);$('spinHub').disabled=true;$('spinHub').classList.add('is-spinning');
    const percent=Math.round(power*100);
    $('statusText').textContent=`Drehkraft ${percent} % · Das Rad dreht sich …`;
    $('presentationResult').textContent='';
    const winner=Math.floor(rand()*n),step=360/n;
    // Sektor 0 liegt zu Beginn mittig unter dem feststehenden Zeiger bei 12 Uhr.
    // Exakt auf die Sektormitte zielen: So steht die Gewinner-Beschriftung
    // beim Stillstand horizontal statt zufällig schräg zum Zeiger.
    const finalModulo=normalized(-winner*step);
    const forward=normalized(finalModulo-normalized(rotation));
    // Stronger timing increases both revolutions and duration. The winner is
    // selected independently of power, so the gauge never manipulates odds.
    const turns=2+Math.round(power*8); // 2 to 10 full revolutions
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // For people requesting reduced motion, avoid rapid multiple rotations.
    const visibleTurns=reduced?0:turns;
    const from=rotation,delta=visibleTurns*360+forward,finish=from+delta;
    const duration=reduced?280:config.duration*1000*(.35+.65*power);
    const start=performance.now();lastTickAt=0;lastTickSector=currentIndex(from,n);
    function frame(now){
      const t=Math.min(1,(now-start)/duration),ease=spinEase(t,config.coast);
      const angle=from+delta*ease;
      wheel.style.transform=`rotate(${angle}deg)`;
      const sector=currentIndex(angle,n);
      if(sector!==lastTickSector&&now-lastTickAt>38){lastTickSector=sector;lastTickAt=now;tick();svg.classList.remove('pointer-tick');void svg.getBoundingClientRect();svg.classList.add('pointer-tick');}
      if(t<1){raf=requestAnimationFrame(frame);return;}
      rotation=finish;wheel.style.transform=`rotate(${rotation}deg)`;
      isSpinning=false;powerMeter.classList.remove('is-locked');powerEpoch=performance.now()-310;
      lockEditor(false);$('spinHub').disabled=false;$('spinHub').classList.remove('is-spinning');
      showWinnerHighlight(winner);playWinnerSound(config.winnerSound);
      const selected=config.segments[winner],result=safeText(selected.label);
      $('statusText').textContent=`Ergebnis: ${result} · Feld ${winner+1} von ${n}`;
      $('presentationResult').textContent=`✦ ${result} ✦`;
      // Debugwerte erleichtern die Regressionstests und die Prüfung der Zeiger-/Ergebniszuordnung.
      Object.assign(window.__casinoNoirDebug,{lastWinner:winner,lastRotation:rotation,spinning:false,lastPower:power,lastTurns:visibleTurns,lastDurationMs:duration,lastCoast:config.coast,lastEasingExponent:coastExponent(config.coast)});
    }
    Object.assign(window.__casinoNoirDebug,{spinning:true,lastWinner:null});
    raf=requestAnimationFrame(frame);
  }
  $('spinHub').addEventListener('click',spin);
  window.__casinoNoirDebug={get config(){return config;},get rotation(){return rotation;},get isSpinning(){return isSpinning;},get power(){return powerLevel;},get powerPeriodMs(){return POWER_PERIOD_MS;},get highlightedWinner(){return highlightedWinner;},showWinnerHighlight,playWinnerSound,get spinEase(){return spinEase;},get iconFontReady(){return iconFontReady;},get iconCatalogReady(){return fullCatalogReady;},get iconCatalogCount(){return ICONS.length;},get iconMatches(){return iconMatchCount;},get iconMatchingNames(){return [...iconMatches];},get iconCodepointMap(){return Object.fromEntries(ICON_CODEPOINTS);},loadIconCatalog,lastWinner:null,lastRotation:0,spinning:false,stop(){cancelAnimationFrame(raf);}};
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