// Application adapter for Echo Roads. No external assets, accounts, or history claims.
let echoDirector=null,echoAudio=null,echoPanelRevision=-1;
function echoAvailable(){return !!echoDirector&&sim.world.northBerwick&&sim.mode==='free'&&!director.active&&!passengerDirector?.state.active;}
function echoObjective(){return echoAvailable()?echoDirector.objective():null;}
function openEchoHub(){openJourney();selectDriverTab('echoes',true);renderEchoPanel(true);}
function renderEchoPanel(force=false){
  if(!$('echo-panel'))return;const s=echoDirector?.state||save.echoes;
  const rev=[s.revision,!!passengerDirector?.state.active,!!echoDirector,s.active].join(':');if(!force&&echoPanelRevision===rev)return;echoPanelRevision=rev;
  const count=C.EchoRoads.ANCHORS.filter(a=>s.visits[a.id]?.choice).length;
  $('echo-progress').textContent=count+' / 6 places remembered'+(s.completed?' · EVERY ROAD REMEMBERS':s.active?' · Drive active':' · No timer. No score.');
  $('echo-begin').textContent=s.active?'RESUME THE MEMORY DRIVE →':s.completed?'REVISIT THE MEMORY DRIVE →':'BEGIN A MEMORY DRIVE →';$('echo-begin').disabled=!echoDirector||!!passengerDirector?.state.active;
  $('echo-stop').hidden=!s.active;$('echo-sound').checked=s.audio;
  $('echo-blocked').textContent=passengerDirector?.state.active?'A passenger is counting on you. Finish or end that drive before entering Echo Roads.':'';
  const list=$('echo-places');list.replaceChildren();
  for(const [i,a] of C.EchoRoads.ANCHORS.entries()){
    const v=s.visits[a.id]||{},detail=echoDirector?.anchors.find(b=>b.id===a.id)?.detail||a.detail,card=document.createElement('article');card.className='echo-card'+(v.choice?' remembered':'');
    const small=document.createElement('small');small.textContent=String(i+1).padStart(2,'0')+' / '+detail;card.append(small);
    const h=document.createElement('h4');h.textContent=a.title;card.append(h);
    const status=document.createElement('p');status.className='echo-stamps';status.textContent=(v.present?'✓':'○')+' Today   /   '+(v.memory?'✓':'○')+' 1999½ memory';card.append(status);
    for(const era of ['present','memory']){const p=document.createElement('p');p.className='echo-passage';p.textContent=v[era]?a[era]:era==='present'?'Slow below 6 mph near this place to notice it today.':'Use V nearby to compare the imagined earlier evening.';card.append(p);}
    const actions=document.createElement('div');actions.className='echo-card-actions';const pin=document.createElement('button');pin.type='button';pin.className='secondary';pin.textContent=s.focus===a.id?'CURRENT DESTINATION':'MAKE NEXT STOP';pin.disabled=!s.active||!echoDirector;pin.addEventListener('click',()=>{echoDirector.focus(a.id);echoEvents();renderEchoPanel(true);});actions.append(pin);
    if(v.choice){const p=document.createElement('strong');p.className='echo-kept';p.textContent=C.EchoRoads.CHOICES[v.choice];actions.append(p);}
    else if(v.present&&v.memory){for(const [id,label] of Object.entries(C.EchoRoads.CHOICES)){const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent=label;b.dataset.echoRemember=a.id;b.dataset.echoChoice=id;b.disabled=!s.active;b.addEventListener('click',()=>{echoDirector.remember(a.id,id);echoEvents();renderEchoPanel(true);});actions.append(b);}}
    card.append(actions);list.append(card);
  }
  $('echo-finale').hidden=!s.completed;
}
function launchEcho(){
  if(!echoDirector)return;const result=echoDirector.begin(!!passengerDirector?.state.active);if(!result.ok){notify(result.reason);return;}
  if(state==='journey')closeJourney();if(state!=='play'||!sim.world.northBerwick)start('free');
  echoDirector.enabled=echoAvailable();save.echoes=echoDirector.state;persist();updateEchoHUD();
  notify('ECHO ROADS / V COMPARES ERAS · SLOW DOWN TO NOTICE A PLACE',5);
}
function endEcho(){if(!echoDirector)return;echoDirector.end();echoEvents();updateEchoHUD();renderEchoPanel(true);}
function compareEcho(){if(state!=='play'||!echoAvailable()||!echoDirector.state.active)return;echoDirector.toggle();echoEvents();updateEchoHUD();}
function echoEvents(){if(!echoDirector)return;for(const e of echoDirector.takeEvents()){
  if(e.type==='persist'){save.echoes=echoDirector.state;persist();}
  else if(e.type==='observed'){notify((e.era==='memory'?'1999½ MEMORY / ':'TODAY / ')+e.title+' · J TO READ',4);}
  else if(e.type==='remembered'){
    appendJournal({id:'echo-'+(++save.stats.sequence),kind:'echo',endedAt:new Date().toISOString(),mode:'free',world:'NORTH BERWICK / ECHO ROADS',reason:e.title+' · '+e.choice,seconds:0,miles:0,roads:1,startRoad:e.road,endRoad:e.road,fuelUsed:0,bodyLoss:0,maxMph:0});persist();
  }else if(e.type==='complete'){
    appendJournal({id:'echo-'+(++save.stats.sequence),kind:'echo',endedAt:new Date().toISOString(),mode:'free',world:'NORTH BERWICK / ECHO ROADS',reason:'Every road remembers. Six places; one hometown.',seconds:e.seconds,miles:e.miles,roads:6,startRoad:'Main Street',endRoad:currentRoadName,fuelUsed:0,bodyLoss:0,maxMph:0});persist();notify(e.text,7);
  }
}}
function tickEcho(dt){if(!echoDirector)return;echoDirector.tick(dt,{available:echoAvailable(),passenger:!!passengerDirector?.state.active,running:state==='play',car:sim.car,reducedMotion:settings.reducedMotion});echoEvents();}
function updateEchoHUD(){
  if(!$('echo-strip'))return;const active=echoAvailable()&&echoDirector.state.active;
  $('echo-strip').hidden=!active;if(!active)return;$('echo-strip').dataset.incident=String(!!townDirector?.nearest(sim.car));const d=echoDirector,s=d.state,a=d.nearest(sim.car),v=s.visits[a?.id]||{};
  $('echo-era').textContent=d.mix(sim.car)<.01&&s.targetEra==='memory'?'OUTSIDE THE MEMORY CORRIDOR':d.era()==='transition'?'THE ROAD REMEMBERS…':d.era()==='memory'?'1999½ · IMAGINED MEMORY':'TODAY · NORTH BERWICK';
  $('echo-toggle').textContent=s.targetEra==='memory'?'V · RETURN TO TODAY':'V · ENTER MEMORY';
  $('echo-near').textContent=a?(v.choice?'Memory kept · Choose another stop in J':(v.present&&v.memory)?'Both views noticed · J to keep a memory':Math.hypot(sim.car.vx,sim.car.vz)>2.5?(settings.units==='kph'?'Slow below 9 km/h to notice this place':'Slow below 6 mph to notice this place'):'Stay a moment. Let the place come into view.'):'Follow a copper map marker · No time limit';
}
function drawEchoMap(ctx,p){if(!echoAvailable()||!echoDirector.state.active)return;ctx.save();ctx.lineWidth=2;for(const [i,a] of echoDirector.anchors.entries()){
  const [x,y]=p(a.point.x,a.point.z),v=echoDirector.state.visits[a.id];ctx.strokeStyle=v?.choice?'#9dc9b5':'#e5b889';ctx.fillStyle=ctx.strokeStyle;ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.stroke();
  if(v?.choice)ctx.fill();if(echoDirector.state.focus===a.id){ctx.beginPath();ctx.arc(x,y,11,0,Math.PI*2);ctx.stroke();}
  ctx.font='600 11px Arial';ctx.fillText(String(i+1),x+10,y+4);
}ctx.restore();}
function updateEchoAudio(){
  const active=echoAvailable()&&echoDirector.state.active&&state==='play'&&settings.sound&&echoDirector.state.audio,mix=active?echoDirector.mix(sim.car):0;
  if(!audio.context||!audio.master)return;
  if(!echoAudio&&mix>.02){const a=audio.context,g=a.createGain(),f=a.createBiquadFilter();g.gain.value=0;f.type='lowpass';f.frequency.value=950;g.connect(f);f.connect(audio.master);
    const nodes=[146.83,220,293.66].map((frequency,i)=>{const o=a.createOscillator();o.type=i?'sine':'triangle';o.frequency.value=frequency;o.connect(g);o.start();return o;});echoAudio={gain:g,filter:f,nodes};
  }
  if(echoAudio){echoAudio.gain.gain.setTargetAtTime(mix*.065,audio.context.currentTime,.3);for(const [i,o] of echoAudio.nodes.entries())o.detune.setTargetAtTime(Math.sin(sim.time*.42+i)*mix*2,audio.context.currentTime,.2);}
}
function initEchoUI(){
  const tab=document.createElement('button');tab.id='ux-tab-echoes';tab.type='button';tab.dataset.uxTab='echoes';tab.setAttribute('role','tab');tab.setAttribute('aria-controls','ux-panel-echoes');tab.textContent='Echo Roads';tab.tabIndex=-1;tab.setAttribute('aria-selected','false');tab.addEventListener('click',()=>{selectDriverTab('echoes');renderEchoPanel(true);});document.querySelector('.ux-tabs').append(tab);
  const panel=document.createElement('div');panel.id='ux-panel-echoes';panel.className='ux-tab-panel';panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',tab.id);panel.hidden=true;
  panel.innerHTML='<section id="echo-panel" class="journey-panel journal-span"><div class="echo-heading"><small>ONE HOMETOWN. TWO WAYS OF SEEING IT.</small><h3>ECHO ROADS</h3><p>The same streets. The same Jetta. Notice six places today, then drift into an imagined 1999½ view. Choose what you want to carry home.</p></div><p class="echo-disclaimer">MEMORY INTERPRETATION — not an exact historical reconstruction. Road geometry and landmark shells remain mapped; earlier street furniture, finishes, traffic dressing and sound are authored. No claim is made that a prop or façade existed here in 1999.</p><div class="echo-actions"><button id="echo-begin" class="primary" type="button">BEGIN A MEMORY DRIVE →</button><button id="echo-stop" class="secondary" type="button" hidden>END MEMORY DRIVE · KEEP DISCOVERIES</button><label><input id="echo-sound" type="checkbox" checked> Original memory soundscape</label></div><p id="echo-blocked" role="status"></p><p id="echo-progress"></p><div id="echo-finale" hidden><h4>Every road remembers.</h4><p>You did not win the town. You paid attention to it. The places, the feeling, the things left unspoken—those are yours to bring home.</p></div><div id="echo-places"></div></section>';
  document.querySelector('.journey-grid').append(panel);$('echo-begin').addEventListener('click',launchEcho);$('echo-stop').addEventListener('click',endEcho);$('echo-sound').addEventListener('change',()=>{if(echoDirector)echoDirector.state.audio=$('echo-sound').checked;save.echoes.audio=$('echo-sound').checked;persist();});
  $('hud').insertAdjacentHTML('beforeend','<aside id="echo-strip" hidden><div><strong id="echo-era"></strong><small id="echo-near"></small></div><button id="echo-toggle" type="button">V · ENTER MEMORY</button><button id="echo-read" type="button" aria-label="Open Echo Roads journal">J · JOURNAL</button></aside>');$('echo-toggle').addEventListener('click',compareEcho);$('echo-read').addEventListener('click',openEchoHub);
  document.addEventListener('keydown',e=>{if(e.code==='KeyV'&&!e.repeat&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&!e.target?.matches?.('input,textarea,select,[contenteditable=true]')&&state==='play'&&echoAvailable()&&echoDirector.state.active){e.preventDefault();e.stopImmediatePropagation();compareEcho();}},true);
  selectDriverTab(uxTab);renderEchoPanel(true);
}
