// SPDX-License-Identifier: CPAL-1.0
// Application adapter: tours and photo mode share the existing simulation and guarded save.
const PD=C.HometownDrives;
let proDirector=null,proPhoto=null,proInitialized=false,proRouteClock=0,proPhotoURL=null,proPhotoBusy=false;
let proCaptureCount=0,proLastCompletion=null;
function proEligible(){return !!northBerwickWorld&&sim.world===northBerwickWorld&&sim.mode==='free'&&!director.active&&!passengerDirector?.state.active&&!echoDirector?.state.active;}
function proConflict(){return passengerDirector?.state.active?'Finish or end the passenger drive first.':echoDirector?.state.active?'End Echo Roads first; your progress will remain.':director.active?'Return to the garage before choosing a hometown drive.':'';}
function proWorldReady(){
 if(!northBerwickWorld)return;
 const router=new C.ReleaseUX.Router(northBerwickWorld);
 proDirector=new PD.Director(save.hometown,PD.catalog(northBerwickWorld,router));save.hometown=proDirector.state;
 if(proInitialized)proRenderTours();
}
function proGoal(){return proEligible()?proDirector?.goal():null;}
function proSyncGoal(){
 const g=proGoal();if(!g)return;
 uxDestination={...g,proTour:true};uxLastWorld=sim.world;releaseBuildRoute();$('ux-clear-pin').disabled=false;proRouteClock=0;
}
function proClearPin(){if(uxDestination?.proTour){uxDestination=null;releaseRoute=null;$('ux-clear-pin').disabled=true;releaseDescribeRoute();}}
function proTick(dt){
 if(!proDirector)return;
 const event=proDirector.tick(dt,sim.car,proEligible()&&state==='play',!!C.roadAt(sim.world,sim.car.x,sim.car.z,2));
 if(event){
  save.hometown=proDirector.state;markMemory('place',event.type==='stop'?event.place:event.title);
  if(event.type==='complete'){proLastCompletion=event;proClearPin();notify('DRIVE COMPLETE · '+event.badge.toUpperCase(),6);}
  else{proSyncGoal();notify('PLACE REMEMBERED · '+event.place.toUpperCase(),4);}
  persist();proRenderTours();
 }
 if(proGoal()){
  proRouteClock+=dt;
  if(proRouteClock>=5){proRouteClock=0;const progress=C.ReleaseUX.routeProgress(releaseRoute,sim.car);if(!releaseRoute?.ok||progress?.offRoute)proSyncGoal();}
 }
}
function proHUD(){
 const g=proGoal(),r=proDirector?.route(),a=proDirector?.state.active;
 if(!g||!r||!a)return;
 const d=Math.hypot(g.x-sim.car.x,g.z-sim.car.z);
 $('chapter-kicker').hidden=false;$('chapter-kicker').textContent='HOMETOWN DRIVE · '+(a.index+1)+' / '+r.stops.length;
 $('objective').textContent=r.title;
 $('objective-detail').textContent=g.name+' · '+(d<20?'EASE BELOW 8 MPH TO REMEMBER THIS PLACE':Math.round(d)+' m to the road approach');
 $('mission-progress').querySelector('span').style.width=(a.index/r.stops.length*100)+'%';
}
function proOpenTours(){
 if(!proInitialized||state==='error'||renderer.contextLost||state==='photo')return;
 if(state==='replay'){notify('EXIT THE REPLAY BEFORE CHOOSING A DRIVE');return;}
 if(state==='play')pause();
 if(!['menu','pause'].includes(state)){notify('OPEN HOMETOWN DRIVES FROM THE GARAGE OR PAUSE MENU');return;}
 proRenderTours();$('pro-drive-dialog').showModal();$('pro-drive-close').focus();input.clear();
}
function proRenderTours(){
 if(!proInitialized)return;
 const list=$('pro-route-list');list.replaceChildren();
 const current=proDirector?.state||save.hometown,active=current?.active,conflict=proConflict();
 $('pro-route-status').textContent=conflict||(!proDirector?'North Berwick is loading. Try again in a moment.':active?'Your itinerary is remembered. Resume the next stop, or end it to choose another.':'Three drives. No countdown. Reach each road approach and slow down to remember it.');
 $('pro-tour-cancel').hidden=!active;
 for(const route of proDirector?.routes||[]){
  const done=current.completed[route.id],own=active?.id===route.id;
  const card=document.createElement('article');card.className='pro-route-card';card.dataset.route=route.id;
  const kicker=document.createElement('small');kicker.textContent=route.tag;
  const title=document.createElement('h3');title.textContent=route.title;
  const desc=document.createElement('p');desc.textContent=route.description;
  const meta=document.createElement('p');meta.className='pro-route-meta';meta.textContent=route.stops.length+' PLACES · '+(route.distanceM/1609.344).toFixed(1)+' MI FROM THE USUAL START';
  const preview=document.createElement('canvas');preview.width=580;preview.height=170;preview.setAttribute('aria-label',route.title+' stop preview, not a navigation map');
  const stops=document.createElement('p');stops.className='pro-route-stops';stops.textContent=route.stops.map(x=>x.name.replace('North Berwick ','')).join(' → ');
  const badge=document.createElement('p');badge.className='pro-badge';badge.textContent=done?'✓ '+route.badge+' · '+done.runs+' completed':own?'IN PROGRESS · NEXT STOP '+(active.index+1):'REMEMBER THE DRIVE · '+route.badge;
  const button=document.createElement('button');button.className=own?'primary':'secondary';button.type='button';button.dataset.startTour=route.id;button.textContent=own?'RESUME THIS ITINERARY':done?'DRIVE IT AGAIN':'START THIS DRIVE';button.disabled=!!conflict||!route.available||!!active&&!own;
  button.addEventListener('click',()=>proBeginTour(route.id));
  card.append(kicker,title,preview,desc,meta,stops,badge,button);list.append(card);proRoutePreview(preview,route);
 }
 $('pro-tour-record').textContent=Object.keys(current?.completed||{}).length+' / 3 DRIVES REMEMBERED · '+(current?.visited?.length||0)+' DISTINCT PLACES';
}
function proRoutePreview(canvas,route){
 const ctx=canvas.getContext('2d');ctx.fillStyle='#0c1b24';ctx.fillRect(0,0,canvas.width,canvas.height);
 if(!route.stops.length)return;
 const points=[northBerwickWorld.spawn,...route.stops],xs=points.map(p=>p.x),zs=points.map(p=>p.z),minX=Math.min(...xs),minZ=Math.min(...zs),maxX=Math.max(...xs),maxZ=Math.max(...zs),s=Math.min(520/Math.max(1,maxX-minX),122/Math.max(1,maxZ-minZ));
 const project=p=>[canvas.width/2+(p.x-(minX+maxX)/2)*s,canvas.height/2+(p.z-(minZ+maxZ)/2)*s];
 ctx.lineWidth=1;ctx.strokeStyle='#25414e';ctx.beginPath();for(const r of northBerwickWorld.roads){const a=project({x:r.x1,z:r.z1}),b=project({x:r.x2,z:r.z2});ctx.moveTo(...a);ctx.lineTo(...b);}ctx.stroke();
 ctx.setLineDash([5,5]);ctx.strokeStyle='#dcb57c';ctx.lineWidth=2;ctx.beginPath();points.forEach((p,i)=>{const xy=project(p);i?ctx.lineTo(...xy):ctx.moveTo(...xy);});ctx.stroke();ctx.setLineDash([]);
 points.forEach((p,i)=>{const[x,y]=project(p);ctx.fillStyle=i?'#e7bf83':'#7fd4ca';ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.fill();ctx.fillStyle='#10212a';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(i||'S',x,y);});
}
function proBeginTour(id){
 const conflict=proConflict();if(conflict||!proDirector){$('pro-route-status').textContent=conflict||'Town still loading.';return;}
 if(!proDirector.begin(id))return;
 $('pro-drive-dialog').close();save.hometown=proDirector.state;
 if(!proEligible()||state==='menu'||pausedFromMenu)start('free');else if(state==='pause')resume();
 if(state!=='play')return;
 proDirector.resetContinuity();proSyncGoal();persist();proHUD();notify(proDirector.route().title.toUpperCase()+' · FOLLOW THE GOLD ROUTE',4);
}
function proEndTour(){proDirector?.end();save.hometown=proDirector?.state||PD.defaults();proClearPin();persist();proRenderTours();}
function proPhotoCamera(){
 if(!proPhoto)return;
 const p=proPhoto,a=p.angle,d=p.distance,target=[sim.car.x,.85,sim.car.z];
 renderer.setCamera([sim.car.x+Math.sin(a)*d,p.height,sim.car.z+Math.cos(a)*d],target);
}
function proOpenPhoto(){
 if(!['play','pause','inspect','replay'].includes(state)||renderer.contextLost||document.querySelector('dialog[open]'))return;
 if(state==='pause'&&pausedFromMenu){notify('INSPECT THE JETTA OR START A DRIVE TO TAKE A PHOTO');return;}
 if(state==='replay')pauseMemoryReplay();
 proPhoto={from:state,angle:sim.car.yaw+Math.PI*.75,distance:7.2,height:2.4,presentation:renderer.presentation,focus:document.activeElement};
 state='photo';input.clear();accumulator=0;showState();renderer.presentation=proPhoto.presentation;proPhotoControls();$('pro-photo-export').focus();
}
function proPhotoControls(){
 if(!proPhoto)return;
 $('pro-photo-angle').value=Math.round(proPhoto.angle*180/Math.PI)%360;
 $('pro-photo-distance').value=proPhoto.distance;$('pro-photo-height').value=proPhoto.height;
}
function proClosePhoto(interrupted=false){
 if(!proPhoto)return;const previous=proPhoto;proPhoto=null;
 state=previous.from==='play'?'pause':previous.from;pausedFromMenu=false;input.clear();accumulator=0;lastFrame=0;cameraEye=null;cameraTarget=null;showState();
 if(state==='pause'){$('resume').textContent='BACK TO THE ROAD';$('resume').focus();}
 else previous.focus?.focus?.();
 if(interrupted&&state==='inspect'){state='pause';showState();}
}
function proCapturePhoto(){
 if(!proPhoto||renderer.contextLost||proPhotoBusy)return;
 proPhotoBusy=true;const button=$('pro-photo-export');button.disabled=true;$('pro-photo-status').textContent='Capturing the actual game frame…';
 try{
  proPhotoCamera();renderer.storyGoal=null;renderer.update(sim,0,weatherRenderSettings());renderer.render();
  const source=renderer.canvas,ratio=Number($('pro-photo-ratio').value),w=source.width,h=source.height;
  let sw=w,sh=h;if(w/h>ratio)sw=Math.floor(h*ratio);else sh=Math.floor(w/ratio);
  const output=document.createElement('canvas');output.width=sw;output.height=sh;const x=output.getContext('2d');
  x.drawImage(source,(w-sw)/2,(h-sh)/2,sw,sh,0,0,sw,sh);
  if($('pro-photo-caption').checked){const size=Math.max(12,Math.round(sw/65));x.fillStyle='rgba(5,14,20,.76)';x.fillRect(0,sh-size*3.6,sw,size*3.6);x.fillStyle='#edc68d';x.font='600 '+size+'px sans-serif';x.fillText('99½ REBORN  /  '+(sim.world.northBerwick?'NORTH BERWICK, MAINE':'BUTTERCUP'),size,sh-size*1.8);x.fillStyle='#dae6e3';x.font=Math.max(10,size*.8)+'px sans-serif';x.fillText('In loving memory — Buttercup, Justin Tahai\'s 99.5 mkIV',size,sh-size*.6);}
  output.toBlob(blob=>{
   proPhotoBusy=false;button.disabled=false;
   if(!blob){$('pro-photo-status').textContent='Capture unavailable. Try a smaller view.';return;}
   if(proPhotoURL)URL.revokeObjectURL(proPhotoURL);proPhotoURL=URL.createObjectURL(blob);
   const a=document.createElement('a');a.href=proPhotoURL;a.download='REBORN-North-Berwick-'+new Date().toISOString().replace(/[:.]/g,'-')+'.png';a.click();proCaptureCount++;
   $('pro-photo-status').textContent=sw+' × '+sh+' PNG saved. Only this frame was exported; no save data or location access.';
  },'image/png');
 }catch(e){proPhotoBusy=false;button.disabled=false;$('pro-photo-status').textContent='Photo export failed: '+e.message;}
}
function proSyncState(){
 if(!proInitialized)return;
 $('pro-photo').hidden=state!=='photo';if(state==='photo')$('hud').hidden=true;
 $('pro-photo-button').hidden=!['play','pause'].includes(state);
 const interrupted=renderer.contextLost||!!graphicsInterruption;
 if(interrupted){input.blocked=true;$('pro-photo-button').disabled=true;}else $('pro-photo-button').disabled=false;
 if(state!=='play')proDirector?.resetContinuity();
}
function proSnapshot(){return {hometown:proDirector?.snapshot()||{state:save.hometown},photo:{active:state==='photo',captures:proCaptureCount},build:32};}
function initProDrive(){
 document.querySelector('.launch-row').insertAdjacentHTML('beforeend','<button id="pro-drives-menu" class="secondary" type="button">HOMETOWN DRIVES ↗</button>');
 document.querySelector('#pause .modal-buttons').insertAdjacentHTML('beforeend','<button id="pro-drives-pause" class="secondary" type="button">H · HOMETOWN DRIVES</button><button id="pro-photo-pause" class="secondary" type="button">P · PHOTO MODE</button>');
 document.querySelector('.hud-right').insertAdjacentHTML('afterbegin','<button id="pro-photo-button" class="square" type="button" aria-label="Open photo mode. P" title="Photo mode · P">PHOTO</button>');
 document.body.insertAdjacentHTML('beforeend',`<dialog id="pro-drive-dialog" aria-labelledby="pro-drive-title"><header><div><small>99½ REBORN / NORTH BERWICK</small><h2 id="pro-drive-title">Take the long way.</h2><p>Not every drive needs a finish line.</p></div><button id="pro-drive-close" class="secondary" type="button">CLOSE</button></header><p id="pro-route-status" role="status"></p><div id="pro-route-list"></div><footer><strong id="pro-tour-record"></strong><button id="pro-tour-cancel" class="quiet" type="button" hidden>END THIS ITINERARY</button><p>In-game roadside approaches from the bundled map, not visitor directions or access permission. Starting a drive never adds a countdown or takes the wheel away.</p></footer></dialog>
 <section id="pro-photo" aria-label="Photo mode, simulation paused" hidden><div id="pro-photo-stage" aria-hidden="true"></div><header><small>99½ REBORN / PHOTO MODE</small><h2>A moment worth keeping.</h2><p>Simulation paused. Drag the scene to orbit. Your car and progress stay put.</p></header><div id="pro-photo-controls" role="group" aria-label="Photo controls"><label>Orbit<input id="pro-photo-angle" type="range" min="-360" max="360" step="1"></label><label>Distance<input id="pro-photo-distance" type="range" min="3.5" max="18" step=".1"></label><label>Height<input id="pro-photo-height" type="range" min=".6" max="7" step=".1"></label><label>Frame<select id="pro-photo-ratio"><option value="1.7777777778">16:9 / Landscape</option><option value="1">1:1 / Square</option><option value="2.39">2.39:1 / Cinema</option></select></label><label class="pro-check"><input id="pro-photo-caption" type="checkbox" checked> Dedication caption</label><div class="pro-photo-actions"><button id="pro-photo-export" class="primary" type="button">SAVE PNG</button><button id="pro-photo-close" class="secondary" type="button">BACK · ESC</button></div><output id="pro-photo-status" role="status">Photos are local downloads, not uploads.</output></div></section>`);
 for(const id of ['pro-drives-menu','pro-drives-pause'])$(id).addEventListener('click',proOpenTours);
 for(const id of ['pro-photo-button','pro-photo-pause'])$(id).addEventListener('click',proOpenPhoto);
 $('pro-drive-close').addEventListener('click',()=>$('pro-drive-dialog').close());$('pro-drive-dialog').addEventListener('cancel',()=>input.clear());
 $('pro-tour-cancel').addEventListener('click',proEndTour);$('pro-photo-close').addEventListener('click',()=>proClosePhoto());$('pro-photo-export').addEventListener('click',proCapturePhoto);
 for(const [id,key]of [['pro-photo-angle','angle'],['pro-photo-height','height'],['pro-photo-distance','distance']])$(id).addEventListener('input',e=>{if(proPhoto)proPhoto[key]=Number(e.target.value)*(key==='angle'?Math.PI/180:1);});
 const stage=$('pro-photo-stage');let drag=null;
 stage.addEventListener('pointerdown',e=>{if(!proPhoto)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};stage.setPointerCapture(e.pointerId);e.preventDefault();});
 stage.addEventListener('pointermove',e=>{if(!proPhoto||drag?.id!==e.pointerId)return;proPhoto.angle-=(e.clientX-drag.x)*.008;proPhoto.height=C.clamp(proPhoto.height+(e.clientY-drag.y)*.015,.6,7);drag.x=e.clientX;drag.y=e.clientY;proPhotoControls();});
 for(const name of ['pointerup','pointercancel','lostpointercapture'])stage.addEventListener(name,()=>drag=null);
 document.addEventListener('keydown',e=>{
  if(state==='photo'){
   if(e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();proClosePhoto();return;}
   if(e.code==='Tab'){const all=[...$('pro-photo-controls').querySelectorAll('button,input,select')].filter(x=>!x.disabled);const i=all.indexOf(document.activeElement);if(i<0||e.shiftKey&&i===0||!e.shiftKey&&i===all.length-1){e.preventDefault();(e.shiftKey?all.at(-1):all[0]).focus();}return;}
  }
  if(e.repeat||e.ctrlKey||e.altKey||e.metaKey||e.target?.matches?.('input,textarea,select,[contenteditable=true]')||document.querySelector('dialog[open]'))return;
  if(e.code==='KeyP'&&['play','pause','inspect','replay'].includes(state)){e.preventDefault();e.stopImmediatePropagation();proOpenPhoto();}
  if(e.code==='KeyH'&&['play','pause','menu'].includes(state)){e.preventDefault();e.stopImmediatePropagation();proOpenTours();}
 },true);
 window.addEventListener('pagehide',()=>{if(proPhotoURL)URL.revokeObjectURL(proPhotoURL);});
 document.body.insertAdjacentHTML('beforeend',`<dialog id="pro-graphics-dialog" aria-labelledby="pro-graphics-title"><small>99½ REBORN / GRAPHICS RECOVERY</small><h2 id="pro-graphics-title">Your drive is paused.</h2><p id="pro-graphics-message"></p><p>Reload reopens the stored game, not this exact moment. A session-only tab should export first. No browser data is cleared.</p><div id="pro-graphics-actions"><button id="pro-graphics-export" class="secondary" type="button">EXPORT THIS SESSION</button><button id="pro-graphics-reload" class="secondary" type="button">RESTART GAME…</button><button id="pro-graphics-continue" class="primary" type="button" hidden>CONTINUE PAUSED</button></div></dialog>`);
 $('pro-graphics-export').addEventListener('click',()=>releaseDownload(releaseSessionBackup(),'REBORN-graphics-session.json'));
 $('pro-graphics-reload').addEventListener('click',sessionReloadLatest);
 $('pro-graphics-continue').addEventListener('click',()=>{if(!renderer.contextLost){$('pro-graphics-dialog').close();input.clear();showState();}});
 $('pro-graphics-dialog').addEventListener('cancel',e=>{if(renderer.contextLost)e.preventDefault();input.clear();});
 window.addEventListener('reborn-context-lost',proGraphicsLost);
 window.addEventListener('reborn-context-restored',proGraphicsRestored);
 window.addEventListener('reborn-context-failed',proGraphicsLost);
 proInitialized=true;proRenderTours();
}
function proGraphicsLost(){
 if(!proInitialized)return;
 if(proPhoto)proClosePhoto(true);
 input.clear();input.blocked=true;accumulator=0;
 const dialog=$('pro-graphics-dialog');
 for(const other of document.querySelectorAll('dialog[open]'))if(other!==dialog)other.close();
 $('pro-graphics-title').textContent='Your drive is paused.';
 $('pro-graphics-message').textContent='The browser interrupted its graphics context. Nothing continues driving behind the blank frame. Wait for recovery, or export this session before restarting.';
 $('pro-graphics-continue').hidden=true;
 if(!dialog.open)dialog.showModal();$('pro-graphics-export').focus();
}
function proGraphicsRestored(){
 if(!proInitialized)return;
 $('pro-graphics-title').textContent='Graphics restored.';
 $('pro-graphics-message').textContent='The renderer has rebuilt its resources. Your drive or replay stays paused. Close this panel when ready; resume manually.';
 $('pro-graphics-continue').hidden=false;
}
