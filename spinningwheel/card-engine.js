/* Casino Noir cards: pure, versioned data model and finite weighted drawing. */
(function (root) {
  'use strict';
  const MAX_DECKS=100,MAX_CARDS=100,MAX_COPIES=1000,MAX_TOTAL=50000;
  const validId=v=>typeof v==='string'&&/^[a-z0-9_-]{1,100}$/i.test(v);
  const id=(kind='card')=>kind+'-'+(root.crypto?.randomUUID?.()||
    Array.from(root.crypto?.getRandomValues?.(new Uint32Array(4))||[Date.now(),Math.random()*1e9],
      n=>Math.trunc(n).toString(36)).join(''));
  function text(value,max,required=false){
    if(typeof value!=='string'||value.length>max||(required&&!value.trim()))throw Error('Ungültiger oder zu langer Kartentext.');
    return value;
  }
  function card(raw) {
    if(!raw||!validId(raw.id))throw Error('Ungültige Karten-ID.');
    const frequency=raw.frequency==='once'?'once':raw.frequency==='multiple'?'multiple':null;
    if(!frequency)throw Error('Ungültiger Häufigkeitsmodus.');
    if(!Number.isSafeInteger(raw.copies)||raw.copies<1||raw.copies>MAX_COPIES||
      (frequency==='once'&&raw.copies!==1))throw Error('Kartenmultiplikator muss ganzzahlig von 1 bis 1.000 sein.');
    const icon=raw.icon||'';
    if(typeof icon!=='string'||(icon&&!/^[a-z0-9_]{1,80}$/.test(icon)))throw Error('Ungültiges Symbol.');
    const color=raw.color||'';
    if(typeof color!=='string'||(color&&!/^#[a-f0-9]{6}$/i.test(color)))throw Error('Ungültige Kartenfarbe.');
    return {id:raw.id,title:text(raw.title??'',100),text:text(raw.text,1200,true),
      icon,color,frequency,copies:raw.copies};
  }
  function freshState(cards,round=1){
    return {round,remaining:Object.fromEntries(cards.map(c=>[c.id,c.copies]))};
  }
  function deck(raw,{keepState=true}={}) {
    if(!raw||!validId(raw.id))throw Error('Ungültige Deck-ID.');
    const name=text(raw.name,80,true);
    if(!Array.isArray(raw.cards)||raw.cards.length>MAX_CARDS)throw Error('Maximal 100 Kartentypen pro Deck.');
    const cards=raw.cards.map(card),ids=new Set(cards.map(c=>c.id));
    if(ids.size!==cards.length)throw Error('Doppelte Karten-ID.');
    if(cards.reduce((a,c)=>a+c.copies,0)>MAX_TOTAL)throw Error('Maximal 50.000 Exemplare pro Deck.');
    if(!['without','with'].includes(raw.mode)||!['manual','auto'].includes(raw.exhaustion))throw Error('Ungültiger Deckmodus.');
    const s=raw.state;
    let state=freshState(cards);
    if(keepState&&s){
      if(!Number.isSafeInteger(s.round)||s.round<1||s.round>1000000||
        !s.remaining||typeof s.remaining!=='object'||Array.isArray(s.remaining))
        throw Error('Ungültiger Deckrundenzustand.');
      state={round:s.round,remaining:{}};
      for(const c of cards){
        const n=s.remaining[c.id];
        if(!Number.isSafeInteger(n)||n<0||n>c.copies)throw Error('Ungültiger verbleibender Kartenvorrat.');
        state.remaining[c.id]=n;
      }
    }
    return {id:raw.id,name,cards,mode:raw.mode,exhaustion:raw.exhaustion,state};
  }
  function store(raw) {
    if(raw==null)return {version:1,decks:[],pending:null};
    if(raw.version!==1||!Array.isArray(raw.decks)||raw.decks.length>MAX_DECKS)
      throw Error('Nicht unterstütztes oder beschädigtes Kartendeck-Format.');
    const decks=raw.decks.map(d=>deck(d)),ids=new Set(decks.map(d=>d.id));
    if(ids.size!==decks.length)throw Error('Doppelte Deck-ID.');
    let pending=null;
    if(raw.pending!=null){
      const p=raw.pending;
      if(!p||!validId(p.deckId)||!validId(p.profileId)||!validId(p.segmentId)||
        !['ready','revealed'].includes(p.phase)||!ids.has(p.deckId))
        throw Error('Ungültiger gespeicherter Ziehvorgang.');
      const snapshot=p.phase==='revealed'?card(p.card):null;
      pending={deckId:p.deckId,profileId:p.profileId,segmentId:p.segmentId,phase:p.phase,card:snapshot};
    }
    return {version:1,decks,pending};
  }
  function makeDeck(name='Neues Kartendeck'){
    return deck({id:id('deck'),name,cards:[],mode:'without',exhaustion:'manual'});
  }
  function makeCard(){
    return {id:id('card'),title:'',text:'Neue Karte',icon:'',color:'',
      frequency:'once',copies:1};
  }
  function stats(d) {
    const configured=d.cards.reduce((s,c)=>s+c.copies,0);
    const rows=d.cards.map(c=>({...c,available:d.state.remaining[c.id]??0}));
    const available=rows.reduce((s,c)=>s+c.available,0);
    return {types:rows.length,configured,available,rows:rows.map(c=>({
      ...c,originalChance:configured?c.copies/configured*100:0,
      currentChance:available?c.available/available*100:0
    }))};
  }
  function reset(d) {
    return {...d,state:freshState(d.cards,(d.state?.round||0)+1)};
  }
  function reconcile(previous,next){
    const clean=deck({...next,state:undefined},{keepState:false});
    if(previous.mode!==clean.mode)throw Error('Ziehmoduswechsel erfordert explizites Zurücksetzen.');
    const old=new Map(previous.cards.map(c=>[c.id,c]));
    clean.state={round:previous.state.round,remaining:{}};
    for(const c of clean.cards){
      const prior=old.get(c.id);
      if(!prior){clean.state.remaining[c.id]=c.copies;continue;}
      const used=prior.copies-(previous.state.remaining[c.id]??prior.copies);
      clean.state.remaining[c.id]=clean.mode==='with'&&c.frequency==='multiple'
        ?c.copies:Math.max(0,c.copies-used);
      if(prior.frequency==='once'&&c.frequency==='multiple'&&clean.mode==='with')
        clean.state.remaining[c.id]=c.copies;
    }
    return deck(clean);
  }
  function uniformInt(max,random=root.crypto){
    if(!Number.isSafeInteger(max)||max<1||max>MAX_TOTAL)throw Error('Ungültige Zufallsgrenze.');
    if(random?.getRandomValues){
      const limit=Math.floor(4294967296/max)*max,arr=new Uint32Array(1);
      let value;
      do{random.getRandomValues(arr);value=arr[0];}while(value>=limit);
      return value%max;
    }
    return Math.floor(Math.random()*max);
  }
  function draw(original,random) {
    let d=deck(original),reshuffled=false;
    let s=stats(d);
    if(!s.available&&d.exhaustion==='auto'&&d.cards.length){
      d=reset(d);s=stats(d);reshuffled=true;
    }
    if(!s.available)return {deck:d,card:null,reshuffled};
    let ticket=uniformInt(s.available,random),chosen=null;
    for(const row of s.rows){
      if(ticket<row.available){chosen=row;break;}
      ticket-=row.available;
    }
    if(!chosen)throw Error('Keine Karte für den Zufallswert.');
    const current=d.state.remaining[chosen.id];
    if(d.mode==='without'||chosen.frequency==='once')d.state.remaining[chosen.id]=current-1;
    return {deck:d,card:card(chosen),reshuffled};
  }
  root.CasinoNoirCardEngine=Object.freeze({
    id,card,deck,store,makeCard,makeDeck,stats,reset,reconcile,draw,uniformInt,
    limits:{MAX_DECKS,MAX_CARDS,MAX_COPIES,MAX_TOTAL}
  });
  if(typeof module!=='undefined'&&module.exports)module.exports=root.CasinoNoirCardEngine;
})(typeof window!=='undefined'?window:globalThis);
