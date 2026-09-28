// Build 018: save ownership is independent of driving, inputs and story clocks.
function captureSessionSave(){
 if(memoryRecorder)save.memories=memoryRecorder.export();if(echoDirector)save.echoes=echoDirector.state;if(passengerDirector)save.journeys=passengerDirector.state;if(townDirector)save.town=townDirector.state;if(weatherDirector)save.climate=weatherDirector.state;
 save.vehicle=vehicle;save.roadKnowledge=roadKnowledge;save.journal=driveJournal;save.serviceHistory=serviceHistory;
}
function sessionSaveStatus(){return sessionSave.status();}
function sessionSaveNotice(){
 const status=sessionSave.status(),banner=$('session-save-banner'),label=$('session-save-message');
 if(!banner)return;
 const problem=!sessionSave.last.ok&&status.reason!=='pending';
 banner.hidden=!problem;if(label)label.textContent=sessionSave.last.message;
 for(const id of ['session-export','session-export-stored','session-reload'])$(id).disabled=status.reason==='pending';
 const canRestore=status.canWrite&&status.reason!=='unavailable';
 if($('release-import-confirm'))$('release-import-confirm').disabled=!releaseImport||!canRestore;
 if($('release-reset-confirm'))$('release-reset-confirm').disabled=$('release-reset-text').value!=='RESET'||!canRestore;
 const node=$('ux-save');if(node&&!sessionSave.last.ok){node.textContent=status.reason==='pending'?'CHECKING SAVE OWNERSHIP':status.reason==='other'?'OTHER TAB SAVING · SESSION ONLY':status.conflict?'NEWER STORED SAVE · SESSION ONLY':'SAVE UNAVAILABLE · EXPORT SESSION';node.dataset.error=String(problem);}
 document.body.dataset.saveSession=problem?'protected':'ready';
 $('pause-button').title=problem?'Save protected — pause to export this session':'Pause and settings';
 window.dispatchEvent(new CustomEvent('reborn-safe-state',{detail:{safe:releaseSafeUpdate(),state}}));
}
function sessionBeginSaving(){
 let locks;try{locks=navigator.locks;}catch{locks={request(){throw new Error('Lock access denied');}};}
 sessionSave.begin(locks,()=>{if(sessionSave.last.ok&&!saveLoadBlocked)persist();else storageAvailable=false;sessionSaveNotice();});
}
function sessionReloadLatest(){
 // The button means discard this RAM session in favor of the stored pair. A
 // separate export action is always available first. No pagehide write follows.
 if(!confirm('Reload the stored game? Unsaved changes in this tab will be discarded. Export this session first to keep them.'))return;
 saveLoadBlocked=true;window.removeEventListener('pagehide',saveOnPageHide);sessionSave.release();location.reload();
}
function initSessionSaves(){
 const banner=document.createElement('section');banner.id='session-save-banner';banner.hidden=true;banner.setAttribute('aria-label','Save protection');
 banner.innerHTML='<strong>YOUR SAVE IS PROTECTED</strong><p id="session-save-message" role="status" aria-live="polite"></p><p>Keep playing here without changing stored progress, or export this session first. Close other game tabs before reloading the stored game.</p><div class="session-save-actions"><button id="session-export" type="button" class="secondary">EXPORT THIS SESSION</button><button id="session-export-stored" type="button" class="secondary">EXPORT STORED ORIGINALS</button><button id="session-reload" type="button" class="secondary">RELOAD STORED GAME…</button></div>';
 document.querySelector('#pause .ux-settings-body').prepend(banner);
 $('session-export').addEventListener('click',()=>releaseDownload(releaseSessionBackup(),'REBORN-session-backup.json'));
 $('session-export-stored').addEventListener('click',()=>{try{const raw=sessionSave.read();releaseDownload(JSON.stringify({format:'REBORN_RAW_RECOVERY',exportedAt:new Date().toISOString(),save:raw.pair[0],story:raw.pair[1]},null,2),'REBORN-stored-originals.json');}catch{$('session-save-message').textContent='The browser denied access to stored data. Export this session instead.';}});
 $('session-reload').addEventListener('click',sessionReloadLatest);
 // Null key is localStorage.clear(). Other apps/keys and sessionStorage do not
 // affect this writer. The guard compares actual current bytes, not event order.
 window.addEventListener('storage',event=>{try{if(event.storageArea!==localStorage||event.key!==null&&!sessionSave.keys.includes(event.key))return;}catch{return;}if(['owner','fallback'].includes(sessionSave.mode)){const result=sessionSave.check();if(!result.ok)storageAvailable=false;sessionSaveNotice();}});
 window.addEventListener('pagehide',()=>sessionSave.release());
 window.addEventListener('pageshow',event=>{if(event.persisted)sessionBeginSaving();});
 sessionBeginSaving();
}
