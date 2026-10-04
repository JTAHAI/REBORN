// Build 018 application adapter. State transitions, not CSS, own paused work.
let releaseInitialized=false,releaseGroup='jetta',releaseRouter=null,releaseRoute=null;
let releaseRouteWorld=null,releaseMapReturn=null,releaseDialogReturn=null,releaseImport=null;
let releaseRenderStamp=0,releaseRenderFrames=0,releaseSkippedFrames=0,releaseChoiceHeld=false;
let releaseAlertRevision='',releaseCaptionRevision='',releaseHubScroll=new Map(),releaseNotifications=[];
const hubGroups=Object.freeze({drive:{label:'Drive',tabs:['stories','echoes']},jetta:{label:'Jetta',tabs:['overview','workshop']},town:{label:'Town',tabs:['town']},journal:{label:'Journal',tabs:['journal','memories']}});
const releaseGroupFor=name=>Object.keys(hubGroups).find(k=>hubGroups[k].tabs.includes(name))||'jetta';
function releaseSelectGroup(group){if(!hubGroups[group])return;const remembered=document.querySelector('[data-hub-group="'+group+'"]')?.dataset.lastTab;selectDriverTab(remembered||hubGroups[group].tabs[0],true);}
function releaseSyncHub(name){
 if(!releaseInitialized)return;
 const group=releaseGroupFor(name);releaseGroup=group;const primary=document.querySelector('[data-hub-group="'+group+'"]');if(primary)primary.dataset.lastTab=name;
 for(const button of document.querySelectorAll('[data-hub-group]')){button.setAttribute('aria-pressed',String(button.dataset.hubGroup===group));}
 for(const button of document.querySelectorAll('[data-ux-tab]'))button.hidden=releaseGroupFor(button.dataset.uxTab)!==group;
 $('hub-section-select').value=group;
 $('hub-map-open').hidden=group!=='town';
 $('hub-task-note').textContent={drive:'Choose a passenger journey or a quiet Echo Roads drive. Your existing campaign and activities stay in the garage.',jetta:'Inspect first, then repair. Routine service never removes an undiagnosed component fault.',town:'Fictional town activity and observed conditions. Open the map to browse public places.',journal:'The drives, promises and memories you have kept. Replays do not advance your live trip.'}[group];
}
function releasePreferences(){
 if(!releaseInitialized)return;document.body.style.setProperty('--reading-scale',settings.textScale||1);
 document.body.dataset.readingScale=String(settings.textScale||1);
 $('ux-text-scale').value=String(settings.textScale||1);$('ux-dialogue-mode').value=settings.dialogueMode||'live';$('ux-diagnostic-captions').checked=settings.diagnosticCaptions!==false;
}
function releaseContinuation(){
 if(passengerDirector?.state.active)return {kind:'passenger',label:'CONTINUE PASSENGER DRIVE',detail:passengerDirector.story().title};
 if(echoDirector?.state.active)return {kind:'echo',label:'CONTINUE MEMORY DRIVE',detail:'Echo Roads · keep your discoveries'};
 return {kind:'free',label:selected==='free'?'DRIVE NORTH BERWICK':uxModeNames[selected].toUpperCase(),detail:selected==='free'?'No clock. Your hometown. Your car.':'Your selected activity'};
}
function releaseUpdateState(){
 if(!releaseInitialized)return;releasePreferences();releaseSyncHub(uxTab);
 const c=releaseContinuation();$('drive').innerHTML=safeText(c.label)+' <span>→</span>';
 $('drive').disabled=selected==='free'&&!northBerwickWorld;
 $('release-continue-detail').textContent=c.detail;
 $('release-load-status').textContent=northBerwickWorld?'NORTH BERWICK READY':releaseWorldError?'TOWN NOT LOADED · RETRY BELOW':'PREPARING NORTH BERWICK…';
 $('release-load-retry').hidden=!releaseWorldError;$('release-load-detail').textContent=releaseWorldError||'';
 const title=$('ux-save');if(saveLoadBlocked&&title){title.textContent='STORED SAVE NEEDS REVIEW · ORIGINAL RETAINED';title.dataset.error='true';}
 $('release-save-recovery').hidden=!saveLoadBlocked;sessionSaveNotice();
 window.dispatchEvent(new CustomEvent('reborn-safe-state',{detail:{safe:releaseSafeUpdate(),state}}));
}
function releaseQueueNotification(text,duration){
 const busy=state==='play'&&(passengerDirector?.state.active?.prompt||!$('passenger-dialogue')?.hidden||clock<toastUntil);
 if(!busy)return false;if(!releaseNotifications.some(n=>n.text===text)){releaseNotifications.push({text:String(text).slice(0,280),duration:Math.min(6,Math.max(1,duration))});if(releaseNotifications.length>8)releaseNotifications.shift();}return true;
}
function releaseFlushNotifications(){if(state!=='play'||!releaseNotifications.length||clock<toastUntil||passengerDirector?.state.active?.prompt||!$('passenger-dialogue')?.hidden)return;const next=releaseNotifications.shift();$('toast').textContent=next.text;$('toast').classList.add('visible');toastUntil=clock+next.duration;}
function releaseSafeUpdate(){return !graphicsInterruption&&!proDirector?.state.active&&(state==='menu'||state==='pause'||state==='journey'&&journeyReturnState!=='play')&&!passengerDirector?.state.active&&!echoDirector?.state.active&&!memoryReplay&&!saveLoadBlocked&&storageAvailable&&sessionSave.status().canWrite;}
function releaseReadingPause(){
 const active=state==='play'&&!!passengerDirector?.state.active?.prompt&&!$('passenger-choice')?.hidden;
 // The smallest screens and enlarged text use an explicit reading pause. It is
 // never scored as silence and never allows a hidden deadline to run out.
 const held=active&&(settings.dialogueMode==='pause'||(innerWidth<740&&innerHeight<520)||(settings.textScale||1)>1.25);
 if(held!==releaseChoiceHeld){releaseChoiceHeld=held;input.clear();input.blocked=held||state!=='play';document.body.dataset.readingPause=String(held);}
 input.blocked=held||state!=='play';
 return held;
}
function releaseUpdateHUD(){
 if(!releaseInitialized)return;releaseReadingPause();
 const list=C.ReleaseUX.warnings(sim.car,vehicle),key=list.map(x=>x.id+':'+x.level).join('|');
 if(key!==releaseAlertRevision){releaseAlertRevision=key;$('ux-alert').textContent=list[0]?list[0].text+(list.length>1?' · +'+(list.length-1)+' in Jetta status':''):'';}
 $('ux-alert').hidden=!list.length;document.body.dataset.critical=String(list.some(x=>x.level>=3));
 const choice=!!passengerDirector?.state.active?.prompt&&!$('passenger-choice').hidden;
 document.body.dataset.context=choice?'choice':echoDirector?.state.active?'echo':memoryGhost?'ghost':!$('passenger-dialogue').hidden?'dialogue':'none';
 if(releaseChoiceHeld)$('passenger-choice-timer').textContent='READING PAUSE · TAKE YOUR TIME';
 // These are secondary copies of information already in the objective block.
 $('passenger-status').hidden=true;
 const contextBusy=choice||!$('passenger-dialogue').hidden;
 if(contextBusy&&$('town-interact'))$('town-interact').hidden=true;
 document.body.dataset.roadside=String(!!$('town-interact')&&!$('town-interact').hidden);
 $('radio').hidden=$('radio').hidden||contextBusy;
 if(contextBusy)$('ux-driving-tip').hidden=true;
 const levels=memoryDiagnostics(),captions=Object.entries(levels).filter(([,v])=>v>.22).map(([id])=>({bearing:'Wheel-bearing hum',charging:'Electrical strain',cooling:'Cooling fan / heat',clutch:'Clutch slip',brakes:'Brake pressure warning'}[id]||'Mechanical sound')).slice(0,2).join(' · ');
 if(captions!==releaseCaptionRevision){releaseCaptionRevision=captions;$('release-audio-caption').textContent=captions?'SOUND CUE · '+captions:'';}
 $('release-audio-caption').hidden=!settings.diagnosticCaptions||!captions||contextBusy||!!list.length||!!echoDirector?.state.active||!!memoryGhost;
 updateReleaseRouteHUD();
}
function releaseShowDialog(kind){
 releaseDialogReturn={state,focus:document.activeElement};if(state==='play')pause();input.clear();
 $('release-dialog').dataset.kind=kind;$('release-import-view').hidden=kind!=='import';$('release-reset-view').hidden=kind!=='reset';$('release-dialog-result').textContent='';
 $('release-dialog-title').textContent=kind==='reset'?'Reset this car’s history?':'Review a save backup';$('release-dialog').showModal();$('release-dialog-cancel').focus();
}
function releaseCloseDialog(){const d=$('release-dialog');if(d.open)d.close();releaseImport=null;$('release-import-confirm').disabled=true;$('release-import-file').value='';$('release-import-preview').textContent='';releaseDialogReturn?.focus?.focus?.();}
function releaseSessionBackup(){captureSessionSave();return JSON.stringify({format:'REBORN_BACKUP_V1',exportedAt:new Date().toISOString(),save:C.validateSave(save),story:S.validateProgress(director.progress)},null,2);}
function releaseDownload(text,name){const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function releaseRestoreBackup(value){
 if(!value)return;
 let check=sessionSave.check();if(!check.ok){$('release-dialog-result').textContent=check.message;sessionSaveNotice();return;}
 // Capture RAM for export, but do not overwrite the stored original merely to
 // prepare a restore. Preserve its exact raw pair, including absent/corrupt data.
 captureSessionSave();
 const previous={format:'REBORN_RAW_RECOVERY',exportedAt:new Date().toISOString(),save:check.pair[0],story:check.pair[1]};
 const result=sessionSave.write(JSON.stringify(value.save),JSON.stringify(S.validateProgress(value.story)),{key:'995.reborn.before-restore.v1',text:JSON.stringify(previous)});
 if(!result.ok){storageAvailable=false;$('release-dialog-result').textContent=result.message;sessionSaveNotice();return;}
 saveLoadBlocked=true;window.removeEventListener('pagehide',saveOnPageHide);sessionSave.release();location.reload();
}
function releaseBuildRoute(){
 if(!uxDestination||!sim.world.northBerwick){releaseRoute=null;return;}
 if(releaseRouteWorld!==sim.world){releaseRouter=new C.ReleaseUX.Router(sim.world);releaseRouteWorld=sim.world;}
 const profile=$('ux-route-profile')?.value||'direct';
 const surfaces=weatherDirector?.state.zones||{};
 releaseRoute=releaseRouter.route(sim.car,uxDestination,profile,{familiarity:roadKnowledge,surfaces,closures:townDirector?.state.closures||[]});
 releaseDescribeRoute();
}
function releaseDescribeRoute(){
 if(!$('ux-route-summary'))return;const r=releaseRoute;
 $('ux-route-summary').textContent=!uxDestination?'Select a public place or named road. Routes follow mapped roads; they do not model current traffic or private driveway access.':r?.ok?(r.distanceM/1609.344).toFixed(2)+' mi on mapped roads · '+r.approachM.toFixed(0)+' m from the landmark · '+r.profile+' profile':r?.reason||'Pin and straight-line bearing only.';
 $('ux-route-recalculate').disabled=!uxDestination;
}
function updateReleaseRouteHUD(){
 if(!releaseRoute?.ok||releaseRouteWorld!==sim.world||$('ux-navigation').hidden)return;const p=C.ReleaseUX.routeProgress(releaseRoute,sim.car);if(!p)return;
 $('ux-navigation').textContent=p.offRoute?'OFF ROUTE · M to recalculate':p.remainingM<20?'At the mapped road approach · '+uxDestination.name:p.instruction+' · '+(settings.units==='kph'?(p.remainingM/1000).toFixed(1)+' km':(p.remainingM/1609.344).toFixed(1)+' mi');
 $('ux-navigation').title='Static mapped-road guidance. No live traffic or private-driveway access claim.';
}
function drawReleaseRoute(ctx,p){if(!releaseRoute?.ok||releaseRouteWorld!==sim.world||!uxDestination)return;ctx.save();ctx.lineWidth=4;ctx.strokeStyle='#eac48f';ctx.setLineDash([9,4]);ctx.beginPath();for(const s of releaseRoute.segments){const a=p(s.a.x,s.a.z),b=p(s.b.x,s.b.z);ctx.moveTo(...a);ctx.lineTo(...b);}ctx.stroke();ctx.restore();}
function releaseOpenMap(){
 if(!northBerwickWorld){notify('NORTH BERWICK IS STILL PREPARING');return;}
 releaseMapReturn={state,world:sim.world,car:{...sim.car},journey:journeyReturnState};
 if(!sim.world.northBerwick){activateWorld(northBerwickWorld);Object.assign(sim.car,northBerwickWorld.spawn,{vx:0,vz:0,forwardSpeed:0});}
 state='map';input.clear();accumulator=0;showState();drawExpandedMap();$('map-resume').focus();
}
function releaseLeaveMap(){
 if(!releaseMapReturn)return false;const v=releaseMapReturn;releaseMapReturn=null;
 if(sim.world!==v.world){activateWorld(v.world);Object.assign(sim.car,v.car);}
 journeyReturnState=v.journey;state=v.state;input.clear();accumulator=0;showState();if(state==='journey')$('hub-map-open').focus();return true;
}
function releaseRenderDue(timestamp){
 if(document.hidden||renderer.contextLost){releaseSkippedFrames++;return false;}
 const cap=state==='photo'?30:(state==='play'||state==='replay'||state==='inspect')?60:20;
 if(timestamp-releaseRenderStamp<1000/cap-1){releaseSkippedFrames++;return false;}
 releaseRenderStamp=timestamp;releaseRenderFrames++;return true;
}
function releaseSnapshot(){return {build:32,safeToUpdate:releaseSafeUpdate(),queuedNotifications:releaseNotifications.length,hubGroup:releaseGroup,readingPaused:releaseChoiceHeld,textScale:settings.textScale||1,mapReady:!!northBerwickWorld,saveProtected:saveLoadBlocked,route:releaseRoute?{ok:releaseRoute.ok,segments:releaseRoute.segments?.length||0,distanceM:releaseRoute.distanceM||0,profile:releaseRoute.profile,reason:releaseRoute.reason}:null,renderedFrames:releaseRenderFrames,skippedRenderFrames:releaseSkippedFrames,renderCandidates:renderer.releaseCandidateCount||0,saveSession:sessionSaveStatus(),staticObjects:renderer.static?.length||0,renderBufferAllocations:renderer.releaseBufferAllocations||0};}
function initReleaseUX(){
 const chrome=document.querySelector('.ux-hub-chrome')||document.querySelector('.journey-header'),tabs=document.querySelector('.ux-tabs');
 const nav=document.createElement('nav');nav.className='hub-primary';nav.setAttribute('aria-label','Main game sections');nav.innerHTML=Object.entries(hubGroups).map(([id,g])=>'<button type="button" data-hub-group="'+id+'" aria-pressed="false">'+g.label+'</button>').join('');tabs.before(nav);
 nav.addEventListener('click',e=>{const b=e.target.closest('[data-hub-group]');if(b)releaseSelectGroup(b.dataset.hubGroup);});
 nav.insertAdjacentHTML('beforebegin','<label class="hub-mobile-picker">SECTION <select id="hub-section-select">'+Object.entries(hubGroups).map(([id,g])=>'<option value="'+id+'">'+g.label+'</option>').join('')+'</select></label>');$('hub-section-select').addEventListener('change',e=>releaseSelectGroup(e.target.value));
 tabs.after(Object.assign(document.createElement('p'),{id:'hub-task-note'}));$('hub-task-note').after(Object.assign(document.createElement('button'),{id:'hub-map-open',type:'button',textContent:'OPEN NORTH BERWICK MAP',className:'secondary'}));$('hub-map-open').addEventListener('click',releaseOpenMap);
 const title=document.createElement('p');title.id='release-continue-detail';document.querySelector('.launch-row').before(title);
 const load=document.createElement('div');load.id='release-loading';load.innerHTML='<span id="release-load-status"></span><span id="release-load-detail" role="status"></span><button id="release-load-retry" class="secondary" hidden type="button">RETRY TOWN LOAD</button>';document.querySelector('.launch-panel').prepend(load);$('release-load-retry').addEventListener('click',loadNorthBerwick);
 const recovery=document.createElement('aside');recovery.id='release-save-recovery';recovery.innerHTML='<strong>Your stored save was not overwritten.</strong><p>The saved data could not be read. Export the original before restoring a backup or deliberately resetting. Driving now is session-only until resolved.</p><button id="release-export-original" class="secondary" type="button">EXPORT ORIGINAL DATA</button><button id="release-recovery-import" class="secondary" type="button">RESTORE A BACKUP</button>';document.querySelector('.launch-panel').prepend(recovery);
 $('release-export-original').addEventListener('click',()=>releaseDownload(JSON.stringify({format:'REBORN_RAW_RECOVERY',save:rawStoredSave,story:rawStoredStory},null,2),'REBORN-original-recovery.json'));$('release-recovery-import').addEventListener('click',()=>releaseShowDialog('import'));
 document.querySelector('#pause .settings').insertAdjacentHTML('beforeend','<label><span>Reading size<small>Menus and dialogue · large sizes may use a reading pause</small></span><select id="ux-text-scale"><option value="1">100%</option><option value="1.25">125%</option><option value="1.5">150%</option><option value="2">200%</option></select></label><label><span>Passenger choices<small>No story penalty for taking time to read</small></span><select id="ux-dialogue-mode"><option value="live">Keep driving</option><option value="pause">Pause to read</option></select></label><label><span>Mechanical sound captions</span><input type="checkbox" id="ux-diagnostic-captions"></label>');
 $('ux-text-scale').addEventListener('change',e=>{settings.textScale=Number(e.target.value);releasePreferences();persist();});$('ux-dialogue-mode').addEventListener('change',e=>{settings.dialogueMode=e.target.value;persist();});$('ux-diagnostic-captions').addEventListener('change',e=>{settings.diagnosticCaptions=e.target.checked;persist();});
 $('ux-export-save').insertAdjacentHTML('afterend','<button id="ux-export-recovery" type="button" class="secondary">EXPORT PRE-RESTORE COPY</button><button id="ux-import-save" type="button" class="secondary">RESTORE SAVE BACKUP</button>');$('ux-import-save').addEventListener('click',()=>releaseShowDialog('import'));
 $('ux-export-recovery').addEventListener('click',()=>{try{const raw=localStorage.getItem('995.reborn.before-restore.v1');if(!raw){notify('NO PREVIOUS RESTORE COPY');return;}const r=JSON.parse(raw);try{releaseDownload(JSON.stringify({format:'REBORN_BACKUP_V1',exportedAt:r.exportedAt,save:JSON.parse(r.save),story:JSON.parse(r.story)},null,2),'REBORN-pre-restore-backup.json');}catch{releaseDownload(raw,'REBORN-pre-restore-raw.json');}}catch{notify('RECOVERY COPY UNAVAILABLE');}});
 document.body.insertAdjacentHTML('beforeend','<dialog id="release-dialog" aria-labelledby="release-dialog-title"><h2 id="release-dialog-title"></h2><div id="release-import-view"><p>Choose a local JSON backup. The current car is not replaced until you review and confirm.</p><input type="file" id="release-import-file" accept=".json,application/json" aria-label="Choose REBORN backup"><p id="release-import-preview" role="status"></p><button id="release-import-confirm" type="button" class="primary" disabled>RESTORE REVIEWED SAVE</button></div><div id="release-reset-view" hidden><p>This removes this browser’s car history, relationships, roads, Echo discoveries and recordings. It does not affect any other browser. Export a backup first.</p><button id="release-reset-export" type="button" class="secondary">EXPORT BACKUP FIRST</button><label>Type RESET to confirm <input id="release-reset-text" type="text" autocomplete="off"></label><button id="release-reset-confirm" type="button" class="primary" disabled>RESET LOCAL PROGRESS</button></div><p id="release-dialog-result" role="alert"></p><button id="release-dialog-cancel" class="quiet" type="button">CANCEL · KEEP CURRENT SAVE</button></dialog>');
 $('release-dialog-cancel').addEventListener('click',releaseCloseDialog);$('release-dialog').addEventListener('cancel',e=>{e.preventDefault();releaseCloseDialog();});
 $('release-import-file').addEventListener('change',async e=>{releaseImport=null;$('release-import-confirm').disabled=true;const file=e.target.files[0];if(!file)return;try{if(file.size>C.ReleaseUX.LIMITS.backupBytes)throw new Error('Choose a backup smaller than 4 MB.');const value=C.ReleaseUX.backup(await file.text());if(e.target.files[0]!==file)return;releaseImport=value;const s=value.save;$('release-import-preview').textContent='Review: '+s.vehicle.odometerMiles.toFixed(1)+' mi · '+Math.round(s.vehicle.fuel)+'% fuel · '+Object.keys(s.roadKnowledge).length+' roads · '+s.journeys.completed.length+' passenger drives · '+s.memories.recordings.length+' memories. Restoring reloads the game. A recovery copy is kept first.';$('release-import-confirm').disabled=false;sessionSaveNotice();}catch(error){$('release-import-preview').textContent=error.message;}});
 $('release-import-confirm').addEventListener('click',()=>releaseRestoreBackup(releaseImport));
 $('release-reset-export').addEventListener('click',()=>{persist();releaseDownload(releaseSessionBackup(),'REBORN-before-reset.json');});
 $('release-reset-text').addEventListener('input',e=>{$('release-reset-confirm').disabled=e.target.value!=='RESET';sessionSaveNotice();});
 $('release-reset-confirm').addEventListener('click',()=>{if($('release-reset-text').value!=='RESET')return;releaseRestoreBackup({save:C.validateSave(null),story:null});});
 // Capture replaces the old two-click reset, which could erase a save on a stray click.
 $('reset-progress').addEventListener('click',e=>{e.stopImmediatePropagation();$('release-reset-text').value='';$('release-reset-confirm').disabled=true;releaseShowDialog('reset');},true);
 $('hud').insertAdjacentHTML('beforeend','<output id="release-audio-caption" aria-live="polite" hidden></output>');
 const toolbar=document.querySelector('.ux-map-toolbar');toolbar.insertAdjacentHTML('afterend','<div class="release-route-options"><label>ROUTE <select id="ux-route-profile"><option value="direct">Direct</option><option value="cautious">Cautious</option><option value="familiar">Familiar roads</option></select></label><button id="ux-route-recalculate" type="button" class="secondary" disabled>RECALCULATE</button><p id="ux-route-summary" aria-live="polite"></p></div>');
 $('ux-route-profile').addEventListener('change',()=>{releaseBuildRoute();drawExpandedMap();});$('ux-route-recalculate').addEventListener('click',()=>{releaseBuildRoute();drawExpandedMap();});
 $('ux-clear-pin').addEventListener('click',()=>{releaseRoute=null;releaseDescribeRoute();});
 // Click-safe restore/update integration. An updater asks; it cannot reload mid-drive.
 window.addEventListener('reborn-request-safe-update',()=>{const ok=releaseSafeUpdate();if(ok)persist();window.dispatchEvent(new CustomEvent('reborn-safe-update-answer',{detail:{safe:ok&&storageAvailable}}));});
 releaseInitialized=true;releaseDescribeRoute();releaseUpdateState();
}
