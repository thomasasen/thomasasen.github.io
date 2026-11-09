/* Casino Noir card deck editor and reveal view. Depends on card-engine.js. */
(function (root) {
  'use strict';
  const E=root.CasinoNoirCardEngine;
  const KEY='casino-noir-card-decks-v1', $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clone=v=>JSON.parse(JSON.stringify(v));
  const number=n=>Number(n).toLocaleString('de-DE');
  const percent=n=>n.toLocaleString('de-DE',{maximumFractionDigits:2})+' %';
  const download=(data,name)=>{
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  function create(options) {
    let data,broken=false,selected='',dragged=null,drawing=false,returnFocus=null,animationTimer=0;
    try{data=E.store(JSON.parse(localStorage.getItem(KEY)||'null'));}
    catch(error){
      broken=true;data=E.store(null);
      options.notify('Kartenspeicher beschädigt. Original bleibt erhalten; kein Überschreiben möglich: '+error.message);
    }
    const selectedDeck=()=>data.decks.find(d=>d.id===selected);
    function commit(candidate,{render=true}={}){
      if(broken)throw Error('Kartenspeicher ist beschädigt. Bitte zuvor exportieren oder im Browser sichern.');
      const next=E.store(candidate);
      // Changes are visible only AFTER a successful durable write.
      localStorage.setItem(KEY,JSON.stringify(next));
      data=next;
      if(render)renderAll();
    }
    function safe(fn){
      if(options.isSpinning?.())return;
      try{return fn();}catch(error){options.notify(error.message||'Kartendeck konnte nicht gespeichert werden.');}
    }
    function links(id){
      return options.getProfiles().reduce((n,p)=>n+(p.config?.segments||[]).filter(s=>s.action==='deck'&&s.deckId===id).length,0);
    }
    function renderSelector(){
      $('deckSelect').innerHTML=data.decks.map(d=>'<option value="'+esc(d.id)+'">'+esc(d.name)+'</option>').join('');
      if(!data.decks.some(d=>d.id===selected))selected=data.decks[0]?.id||'';
      $('deckSelect').value=selected;
      const d=selectedDeck();
      $('deckDetails').hidden=!d;
      $('deckEmptyNotice').hidden=!!d;
      $('deckCount').textContent=number(data.decks.length);
      $('deckSelect').disabled=!d;
      $('deckDuplicate').disabled=!d;
      $('deckDelete').disabled=!d;
      $('deckExportOne').disabled=!d;
      $('deckReset').disabled=!d;
      if(!d)return;
      const s=E.stats(d);
      $('deckName').value=d.name;
      $('deckMode').value=d.mode;
      $('deckExhaustion').value=d.exhaustion;
      $('deckStats').textContent=number(s.types)+' Kartentypen · '+number(s.available)+' / '+number(s.configured)+' Exemplare · Runde '+d.state.round;
      $('deckLinks').textContent=links(d.id)+' Segmentzuordnung(en)';
    }
    function renderCards(){
      const d=selectedDeck();if(!d)return;
      const s=E.stats(d);
      $('deckCards').innerHTML=s.rows.map((c,i)=>'<article class="deck-card-row" draggable="true" data-card-id="'+esc(c.id)+'">'+
        '<div class="deck-card-toolbar"><span class="deck-grip" aria-hidden="true">⠿</span><strong>Karte '+(i+1)+'</strong>'+
        '<span class="deck-probability" data-prob="'+esc(c.id)+'">'+percent(c.currentChance)+'</span>'+
        '<button type="button" class="icon-action" data-card-action="up" aria-label="Karte nach oben" '+(i===0?'disabled':'')+'>↑</button>'+
        '<button type="button" class="icon-action" data-card-action="down" aria-label="Karte nach unten" '+(i===s.rows.length-1?'disabled':'')+'>↓</button>'+
        '<button type="button" class="icon-action" data-card-action="duplicate" aria-label="Karte duplizieren">⧉</button>'+
        '<button type="button" class="icon-action" data-card-action="delete" aria-label="Karte löschen">×</button></div>'+
        '<label>Kartentitel (optional)<input data-card-field="title" maxlength="100" value="'+esc(c.title)+'" placeholder="z. B. Joker"></label>'+
        '<label>Karteninhalt<textarea data-card-field="text" maxlength="1200" rows="3" required>'+esc(c.text)+'</textarea></label>'+
        '<div class="deck-card-options"><label>Häufigkeit<select data-card-field="frequency"><option value="once" '+(c.frequency==='once'?'selected':'')+'>Nur einmal</option><option value="multiple" '+(c.frequency==='multiple'?'selected':'')+'>Mehrfach im Deck</option></select></label>'+
        '<label>Multiplikator<input type="number" min="1" max="1000" step="1" data-card-field="copies" value="'+c.copies+'" '+(c.frequency==='once'?'disabled':'')+'></label>'+
        '<label>Farbe<input type="color" data-card-field="color" value="'+esc(c.color||'#b68b51')+'"></label>'+
        '<button type="button" class="btn btn-quiet deck-icon-button" data-card-action="icon" title="Material-Symbol auswählen">'+(c.icon?'Symbol: '+esc(c.icon):'＋ Symbol')+'</button></div>'+
        '<p class="deck-card-chances" data-card-chances="'+esc(c.id)+'">Ursprünglich '+c.copies+' · verfügbar '+c.available+' · Anfang '+percent(c.originalChance)+' · aktuell '+percent(c.currentChance)+'</p>'+
        '</article>').join('');
      $('deckAddCard').disabled=d.cards.length>=E.limits.MAX_CARDS;
    }
    function renderAll(){renderSelector();renderCards();options.refreshSegments();renderPending();}
    function changeDeck(id,transform){
      const candidate=clone(data),i=candidate.decks.findIndex(d=>d.id===id);
      if(i<0)throw Error('Deck nicht gefunden.');
      candidate.decks[i]=transform(candidate.decks[i]);commit(candidate);
    }
    function replaceCard(id,change){
      const d=selectedDeck();if(!d)return;
      changeDeck(d.id,current=>{
        const next=clone(current),index=next.cards.findIndex(c=>c.id===id);
        if(index<0)throw Error('Karte nicht gefunden.');
        change(next.cards[index],next.cards,index);
        return E.reconcile(current,next);
      });
    }
    function addDeck(){
      if(data.decks.length>=E.limits.MAX_DECKS)throw Error('Maximal 100 Kartendecks.');
      const d=E.makeDeck();
      commit({...data,decks:[...data.decks,d]});selected=d.id;renderAll();
      $('deckName').focus();
      return d.id;
    }
    function deleteDeck(){
      const d=selectedDeck();if(!d)return;
      if(links(d.id))throw Error('Dieses Deck wird noch von Segmenten genutzt. Bitte zuerst alle Zuordnungen entfernen.');
      if(data.pending?.deckId===d.id)throw Error('Eine Kartenziehung aus diesem Deck ist noch offen.');
      if(!confirm('Kartendeck „'+d.name+'“ einschließlich Spielstand dauerhaft löschen?'))return;
      commit({...data,decks:data.decks.filter(x=>x.id!==d.id)});
    }
    function setField(deckField,value){
      const d=selectedDeck();if(!d)return;
      if(deckField==='mode'){
        if(value===d.mode)return;
        if(!confirm('Ziehmodus ändern und den Vorrat dieses Decks ausdrücklich neu mischen?')){renderSelector();return;}
        changeDeck(d.id,current=>E.reset(E.deck({...current,mode:value},{keepState:false})));
        return;
      }
      changeDeck(d.id,current=>E.deck({...current,[deckField]:value}));
    }
    $('deckSelect').addEventListener('change',ev=>{selected=ev.target.value;renderAll();});
    $('deckNew').addEventListener('click',()=>safe(addDeck));
    $('deckDuplicate').addEventListener('click',()=>safe(()=>{
      const d=selectedDeck();if(!d)return;
      if(data.decks.length>=E.limits.MAX_DECKS)throw Error('Maximal 100 Kartendecks.');
      const copy=E.deck({...clone(d),id:E.id('deck'),name:(d.name+' (Kopie)').slice(0,80),
        cards:d.cards.map(c=>({...c,id:E.id('card')})),state:undefined},{keepState:false});
      commit({...data,decks:[...data.decks,copy]});selected=copy.id;renderAll();
    }));
    $('deckDelete').addEventListener('click',()=>safe(deleteDeck));
    $('deckName').addEventListener('change',ev=>safe(()=>setField('name',ev.target.value.trim())));
    $('deckMode').addEventListener('change',ev=>safe(()=>setField('mode',ev.target.value)));
    $('deckExhaustion').addEventListener('change',ev=>safe(()=>setField('exhaustion',ev.target.value)));
    $('deckAddCard').addEventListener('click',()=>safe(()=>{
      const d=selectedDeck();if(!d)return;
      if(d.cards.length>=E.limits.MAX_CARDS)throw Error('Maximal 100 Karten pro Deck.');
      changeDeck(d.id,current=>E.reconcile(current,{...current,cards:[...current.cards,E.makeCard()]}));
      $('deckCards').lastElementChild?.querySelector('textarea')?.focus();
    }));
    const cardsEl=$('deckCards');
    cardsEl.addEventListener('change',ev=>safe(()=>{
      const row=ev.target.closest('[data-card-id]'),field=ev.target.dataset.cardField;
      if(!row||!field)return;
      replaceCard(row.dataset.cardId,c=>{
        if(field==='copies'){
          const n=Number(ev.target.value);
          if(!Number.isSafeInteger(n)||n<1||n>1000)throw Error('Multiplikator muss ganzzahlig zwischen 1 und 1.000 liegen.');
          c.copies=n;
        }else if(field==='frequency'){
          c.frequency=ev.target.value;
          if(c.frequency==='once')c.copies=1;
        }else c[field]=ev.target.value;
      });
    }));
    cardsEl.addEventListener('click',ev=>safe(()=>{
      const btn=ev.target.closest('button[data-card-action]');if(!btn)return;
      const row=btn.closest('[data-card-id]'),id=row?.dataset.cardId;
      const d=selectedDeck();if(!d||!id)return;
      const action=btn.dataset.cardAction;
      if(action==='icon'){options.pickIcon(id);return;}
      replaceCard(id,(_card,all,index)=>{
        if(action==='delete'){if(!confirm('Karte und ihren bisherigen Vorrat entfernen?'))return;all.splice(index,1);}
        if(action==='duplicate'){
          if(all.length>=E.limits.MAX_CARDS)throw Error('Maximal 100 Kartentypen.');
          all.splice(index+1,0,{...all[index],id:E.id('card')});
        }
        if(action==='up'&&index>0)[all[index-1],all[index]]=[all[index],all[index-1]];
        if(action==='down'&&index<all.length-1)[all[index+1],all[index]]=[all[index],all[index+1]];
      });
    }));
    cardsEl.addEventListener('dragstart',ev=>{
      if(!ev.target.matches('[data-card-id]'))return;
      dragged=ev.target.dataset.cardId;ev.dataTransfer.effectAllowed='move';
      ev.dataTransfer.setData('text/plain',dragged);ev.target.classList.add('deck-dragging');
    });
    cardsEl.addEventListener('dragover',ev=>{
      if(!dragged)return;ev.preventDefault();ev.dataTransfer.dropEffect='move';
      cardsEl.querySelectorAll('.deck-drop-target').forEach(el=>el.classList.remove('deck-drop-target'));
      ev.target.closest('[data-card-id]')?.classList.add('deck-drop-target');
    });
    cardsEl.addEventListener('dragend',()=>{dragged=null;cardsEl.querySelectorAll('.deck-dragging,.deck-drop-target').forEach(el=>el.classList.remove('deck-dragging','deck-drop-target'));});
    cardsEl.addEventListener('drop',ev=>safe(()=>{
      ev.preventDefault();
      const target=ev.target.closest('[data-card-id]')?.dataset.cardId,source=dragged;
      dragged=null;if(!target||!source||target===source)return;
      const d=selectedDeck();if(!d)return;
      changeDeck(d.id,current=>{
        const next=clone(current),from=next.cards.findIndex(c=>c.id===source),to=next.cards.findIndex(c=>c.id===target);
        if(from<0||to<0)return current;
        next.cards.splice(to,0,next.cards.splice(from,1)[0]);
        return E.reconcile(current,next);
      });
    }));
    $('deckReset').addEventListener('click',()=>safe(()=>{
      const d=selectedDeck();if(!d||!confirm('Alle Karten dieses Decks neu mischen? Bereits gezogene Karten werden wieder verfügbar.'))return;
      if(data.pending?.deckId===d.id)throw Error('Zuerst die offene Kartenziehung abschließen.');
      changeDeck(d.id,current=>E.reset(current));
    }));
    $('deckResetAll').addEventListener('click',()=>safe(()=>{
      if(data.pending)throw Error('Zuerst die offene Kartenziehung abschließen.');
      if(!confirm('Alle Kartendecks neu mischen und bisherige Ziehungen zurücksetzen?'))return;
      commit({...data,decks:data.decks.map(E.reset)});
    }));
    $('deckExportOne').addEventListener('click',()=>safe(()=>{
      const d=selectedDeck();if(d)download({format:'casino-noir-deck-v1',deck:clone(d)},
        'casino-noir-deck-'+d.name.toLowerCase().replace(/[^a-z0-9-]+/g,'-')+'.json');
    }));
    $('deckExportAll').addEventListener('click',()=>safe(()=>download({format:'casino-noir-decks-v1',decks:clone(data.decks)},
      'casino-noir-decks.json')));
    $('deckImport').addEventListener('click',()=>{$('deckImportFile').value='';$('deckImportFile').click();});
    $('deckImportFile').addEventListener('change',async ev=>{
      const file=ev.target.files?.[0];if(!file)return;
      if(file.size>2*1024*1024){options.notify('Maximal 2 MB pro JSON-Datei.');return;}
      try{const parsed=JSON.parse(await file.text());importDecks(parsed);options.notify('Kartendecks importiert.');}
      catch(error){options.notify('Deckimport fehlgeschlagen: '+error.message);}
    });
    function importDecks(parsed,{keepState=false}={}){
      const input=Array.isArray(parsed?.decks)?parsed.decks:parsed?.deck?[parsed.deck]:null;
      if(!input||!input.length||input.length+data.decks.length>E.limits.MAX_DECKS)
        throw Error('Keine gültigen Kartendecks oder Decklimit überschritten.');
      const ids=new Set(),map={};
      const imported=input.map(raw=>{
        if(ids.has(raw.id))throw Error('Doppelte Deck-ID im Import.');
        ids.add(raw.id);
        const d=E.deck(raw,{keepState});
        const newId=E.id('deck');map[d.id]=newId;
        return {...d,id:newId};
      });
      commit({...data,decks:[...data.decks,...imported]});
      selected=imported[0].id;renderAll();
      return map;
    }
    function setCardIcon(id,icon){
      safe(()=>replaceCard(id,c=>{c.icon=icon;}));
    }
    function availableDecks(){return data.decks.map(d=>({id:d.id,name:d.name}));}
    function makePending(segment,profileId){
      if(data.pending)return;
      const d=data.decks.find(x=>x.id===segment.deckId);
      if(!d){options.notify('Zugeordnetes Kartendeck fehlt. Bitte Segmentzuordnung prüfen.');return;}
      commit({...data,pending:{deckId:d.id,profileId,segmentId:segment.id,phase:'ready',card:null}},{render:false});
      setTimeout(()=>{if(data.pending?.segmentId===segment.id)renderPending();},900);
    }
    function showOverlay(){
      const p=data.pending,overlay=$('cardOverlay');
      clearTimeout(animationTimer);
      overlay.hidden=!p;
      if(!p){document.body.classList.remove('card-overlay-open');return;}
      document.body.classList.add('card-overlay-open');
      const d=data.decks.find(x=>x.id===p.deckId);
      $('cardDeckName').textContent=d?.name||'Kartendeck';
      const s=d?E.stats(d):null;
      $('cardRemaining').textContent=s?number(s.available)+' Karten verfügbar · Runde '+d.state.round:'Deck nicht verfügbar';
      const revealed=p.phase==='revealed';
      const canDraw=Boolean(s&&(s.available>0||(d.exhaustion==='auto'&&s.configured>0)));
      $('drawCard').hidden=revealed||!canDraw;
      $('nextRound').hidden=!revealed&&canDraw;
      $('nextRound').textContent=revealed?'Weiter zum Glücksrad':'Weiter ohne Karte';
      const face=$('cardFront'),inner=$('cardFlip');
      face.querySelector('.card-face-title').textContent=revealed?(p.card.title||'CASINO NOIR'):'';
      face.querySelector('.card-face-text').textContent=revealed?p.card.text:'';
      const emblem=face.querySelector('.card-face-icon');
      const emblemIcon=revealed&&p.card.icon?options.resolveCardIcon?.(p.card.icon):null;
      emblem.classList.toggle('material-symbols-rounded',Boolean(emblemIcon?.material));
      emblem.textContent=revealed?(emblemIcon?.glyph||'✦'):'';
      inner.style.setProperty('--picked-color',revealed?(p.card.color||'#d6b679'):'#d6b679');
      inner.classList.remove('is-revealed');
      if(revealed){
        // Set the hidden face before flipping; refresh restores the already drawn card.
        requestAnimationFrame(()=>inner.classList.add('is-revealed'));
      }
      if(!returnFocus)returnFocus=document.activeElement;
      (revealed||!canDraw?$('nextRound'):$('drawCard')).focus({preventScroll:true});
    }
    function renderPending(){
      if(data.pending)showOverlay();
      else if(!$('cardOverlay').hidden)showOverlay();
    }
    $('drawCard').addEventListener('click',()=>safe(()=>{
      if(drawing||data.pending?.phase!=='ready')return;
      drawing=true;
      try{
        const p=data.pending,index=data.decks.findIndex(d=>d.id===p.deckId);
        if(index<0)throw Error('Kartendeck nicht mehr verfügbar.');
        const outcome=E.draw(data.decks[index]);
        if(!outcome.card){options.notify('Deck erschöpft. Bitte in der Deckverwaltung neu mischen.');return;}
        const next=clone(data);
        next.decks[index]=outcome.deck;
        next.pending={...p,phase:'revealed',card:outcome.card};
        commit(next,{render:false});
        if(outcome.reshuffled)options.notify('Neue Deckrunde begonnen.');
        showOverlay();renderSelector();renderCards();
      }finally{drawing=false;}
    }));
    $('nextRound').addEventListener('click',()=>safe(()=>{
      if(!data.pending||data.pending.phase==='ready'&&$('nextRound').hidden)return;
      commit({...data,pending:null},{render:false});
      showOverlay();renderSelector();renderCards();options.refreshSegments();
      $('spinHub').focus({preventScroll:true});returnFocus=null;
    }));
    $('cardOverlay').addEventListener('keydown',ev=>{
      if(ev.key!=='Tab')return;
      const els=[...$('cardOverlay').querySelectorAll('button:not([hidden]):not(:disabled)')];
      if(!els.length)return;
      const i=els.indexOf(document.activeElement);
      if(ev.shiftKey&&(i<=0)){ev.preventDefault();els[els.length-1].focus();}
      else if(!ev.shiftKey&&i===els.length-1){ev.preventDefault();els[0].focus();}
    });
    renderAll();
    return {
      availableDecks,hasDeck:id=>data.decks.some(d=>d.id===id),
      isBlocking:()=>Boolean(data.pending),
      makePending,render:renderAll,setCardIcon,
      createFromSegment:()=>safe(()=>{const id=addDeck();$('deckDetails').scrollIntoView({behavior:'smooth',block:'nearest'});return id;}),
      importDecks,exportData:({includeSession=false,referencedIds=null}={})=>({
        decks:clone(data.decks.filter(d=>!referencedIds||referencedIds.includes(d.id))
          .map(d=>includeSession?d:{...d,state:undefined})),
        sessionState:includeSession
      }),
      get pending(){return data.pending;}
    };
  }
  root.CasinoNoirDeckUI=Object.freeze({create});
})(typeof window!=='undefined'?window:globalThis);
