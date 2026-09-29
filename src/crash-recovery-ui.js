// Build 020: local interrupted-session review. Nothing is restored automatically.
const CR=C.CrashRecovery;
const crashRecoveryId=CR.makeId();
const crashRecoveryLocal=new CR.Journal(()=>localStorage,{id:crashRecoveryId});
const crashRecoverySession=new CR.Journal(()=>sessionStorage,{id:crashRecoveryId});
let crashRecoveryClock=0,crashRecoveryLast={ok:false,reason:'idle'},crashRecoveryCandidate=null;
let crashRecoveryInitialized=false,crashRecoveryRestoring=false;

function crashRecoveryBackup(){
 captureSessionSave();
 return {format:'REBORN_BACKUP_V1',exportedAt:new Date().toISOString(),save:C.validateSave(save),story:S.validateProgress(director.progress)};
}
function crashRecoveryRuntime(){
 let road=currentRoadName||lastRoadName||'';
 if(!road&&sim.world?.northBerwick){const near=C.nearestRoad(sim.world,sim.car.x,sim.car.z,45);road=near?.road?.name||'';}
 return {world:sim.world?.northBerwick?'North Berwick, Maine':'Blackwater County',mode:state==='replay'?'replay':sim.mode||state,road,odometer:vehicle.odometerMiles,fuel:vehicle.fuel,activeTrip:!!activeTrip,recordingSeconds:memoryRecorder?.draft?.duration||0};
}
function crashRecoveryActive(){
 return !!(activeTrip||memoryReplay||memoryRecorder?.draft||passengerDirector?.state?.active||echoDirector?.state?.active||['play','replay'].includes(state));
}
function crashRecoveryCheckpoint(reason='heartbeat'){
 if(crashRecoveryRestoring)return {ok:false,reason:'restoring'};
 let backup;try{backup=crashRecoveryBackup();}catch{return crashRecoveryLast={ok:false,reason:'invalid'};}
 const value={backup,reason,state,build:C.VERSION,baseFingerprint:C.CrashRecovery.pairFingerprint(...sessionSave.expected),runtime:crashRecoveryRuntime()};
 let result=crashRecoveryLocal.checkpoint(value),source='local';
 if(!result.ok){result=crashRecoverySession.checkpoint(value);source='session';}
 crashRecoveryLast={...result,source,at:Date.now()};
 crashRecoveryRender();
 return crashRecoveryLast;
}
function crashRecoveryAfterMainSave(){
 if(crashRecoveryInitialized&&crashRecoveryActive())crashRecoveryCheckpoint('main-save');
}
function crashRecoveryClearCurrent(){
 const a=crashRecoveryLocal.clear(),b=crashRecoverySession.clear();
 crashRecoveryLast={ok:a||b,reason:a||b?'cleared':'unavailable',at:Date.now()};
 crashRecoveryRender();return a||b;
}
function crashRecoveryRecords(){
 const local=crashRecoveryLocal.list().map(record=>({record,source:'local'}));
 const session=crashRecoverySession.list().map(record=>({record,source:'session'}));
 const sourceById=new Map();for(const item of [...session,...local])sourceById.set(item.record.id,item.source);
 return CR.candidates([...local,...session].map(item=>item.record),...sessionSave.expected,crashRecoveryId).map(record=>({...record,source:sourceById.get(record.id)||'local'}));
}
function crashRecoveryDiscard(record){
 if(!record)return false;
 // Remove both copies if a storage fallback left the same record in both stores.
 const a=crashRecoveryLocal.discard(record.id),b=crashRecoverySession.discard(record.id);
 return a||b;
}
function crashRecoveryCurrent(){
 return crashRecoveryLocal.list(false).find(r=>r.id===crashRecoveryId)||crashRecoverySession.list(false).find(r=>r.id===crashRecoveryId)||null;
}
function crashRecoveryStoredFingerprint(){
 try{const current=sessionSave.read();return CR.pairFingerprint(...current.pair);}catch{return '';}
}
function crashRecoveryCanRestore(record){
 const status=sessionSave.status(),fingerprint=crashRecoveryStoredFingerprint();
 return !!record&&status.canWrite&&!saveLoadBlocked&&fingerprint&&record.baseFingerprint===fingerprint;
}
function crashRecoveryWhen(ms){
 const seconds=Math.max(0,Math.round((Date.now()-ms)/1000));
 if(seconds<60)return seconds+' seconds ago';const minutes=Math.round(seconds/60);if(minutes<60)return minutes+' minutes ago';const hours=Math.round(minutes/60);return hours+' hours ago';
}
function crashRecoverySummary(record){
 const r=record?.runtime||{},where=r.road||r.world||'the previous drive',odo=Number(r.odometer||record?.backup?.save?.vehicle?.odometerMiles||0).toFixed(1);
 return 'Interrupted '+(record?.state||'session')+' · '+where+' · '+odo+' mi · '+crashRecoveryWhen(record.updatedAt)+'. Recovery returns persistent progress to the garage; it does not resume the exact road position.';
}
function crashRecoveryDownload(record=crashRecoveryCandidate){
 if(!record)return false;releaseDownload(JSON.stringify(record.backup,null,2),'REBORN-interrupted-session-'+record.id+'.json');return true;
}
function crashRecoveryRender(){
 if(!crashRecoveryInitialized)return;
 const records=crashRecoveryRecords();crashRecoveryCandidate=records[0]||null;
 const banner=$('crash-recovery-banner'),message=$('crash-recovery-message'),details=$('crash-recovery-details');
 if(banner){banner.hidden=!crashRecoveryCandidate;if(crashRecoveryCandidate){details.textContent=crashRecoverySummary(crashRecoveryCandidate);const can=crashRecoveryCanRestore(crashRecoveryCandidate);$('crash-recovery-restore').disabled=!can;$('crash-recovery-restore').title=can?'Restore this reviewed local checkpoint':'Close other game tabs and ensure the stored game has not changed since this checkpoint';message.textContent=can?'Review, download, or restore this local checkpoint. Nothing changes until you choose.':sessionSave.status().canWrite?'Stored progress changed after this checkpoint. Download it for review; automatic overwrite is blocked.':'Another tab owns the stored save. Download this checkpoint or close the other tab before restoring.';}}
 const current=crashRecoveryCurrent(),status=$('crash-recovery-current-status'),exportButton=$('crash-recovery-current-export');
 if(status){status.textContent=current?'Local emergency checkpoint · '+crashRecoveryWhen(current.updatedAt)+' · '+(crashRecoveryLast.source==='session'?'temporary tab storage':'browser storage'):'No active interrupted-session checkpoint. One is created during a drive or replay.';exportButton.disabled=!current;}
 if($('crash-recovery-count'))$('crash-recovery-count').textContent=records.length>1?records.length+' interrupted sessions found. The newest is shown.':'';
}
function crashRecoveryRestore(){
 const record=crashRecoveryCandidate;if(!record)return;
 if(!crashRecoveryCanRestore(record)){crashRecoveryRender();return;}
 if(!confirm('Restore this interrupted session to the garage? The current stored game will be preserved as the pre-restore recovery copy.'))return;
 crashRecoveryRestoring=true;
 const result=releaseRestoreBackup(record.backup,{resultNode:'crash-recovery-message',beforeReload:()=>{crashRecoveryDiscard(record);crashRecoveryClearCurrent();}});
 if(!result?.ok){crashRecoveryRestoring=false;crashRecoveryRender();}
}
function crashRecoveryTick(dt){
 if(!crashRecoveryInitialized||!crashRecoveryActive()||crashRecoveryRestoring)return;
 crashRecoveryClock+=Math.max(0,Number(dt)||0);if(crashRecoveryClock>=3){crashRecoveryClock=0;crashRecoveryCheckpoint('heartbeat');}
}
function crashRecoveryBeforeExit(event){
 if(event?.persisted){crashRecoveryCheckpoint('bfcache');return false;}
 const saved=persist();if(saved)crashRecoveryClearCurrent();else crashRecoveryCheckpoint('page-exit-unsaved');return saved;
}
function crashRecoverySnapshot(){
 const records=crashRecoveryRecords(),current=crashRecoveryCurrent();
 const small=record=>record?{id:record.id,updatedAt:record.updatedAt,reason:record.reason,state:record.state,baseMatches:record.baseFingerprint===crashRecoveryStoredFingerprint(),runtime:{...record.runtime}}:null;
 return {id:crashRecoveryId,last:{...crashRecoveryLast,record:undefined},current:small(current),candidates:records.length,candidate:small(records[0])};
}
function initCrashRecovery(){
 const banner=document.createElement('aside');banner.id='crash-recovery-banner';banner.className='crash-recovery-card';banner.hidden=true;banner.setAttribute('aria-label','Interrupted session recovery');
 banner.innerHTML='<strong>INTERRUPTED SESSION FOUND</strong><p id="crash-recovery-details"></p><p id="crash-recovery-message" role="status" aria-live="polite"></p><p id="crash-recovery-count"></p><div class="crash-recovery-actions"><button id="crash-recovery-download" class="secondary" type="button">DOWNLOAD RECOVERY</button><button id="crash-recovery-restore" class="primary" type="button">RESTORE TO GARAGE</button><button id="crash-recovery-discard" class="quiet" type="button">KEEP STORED GAME</button></div>';
 document.querySelector('.launch-panel').prepend(banner);
 const panel=document.createElement('section');panel.id='crash-recovery-current';panel.className='crash-recovery-card crash-recovery-settings';panel.innerHTML='<strong>LOCAL INTERRUPTION RECOVERY</strong><p id="crash-recovery-current-status"></p><p>While a drive or replay is active, REBORN keeps one bounded local checkpoint for this tab. A normal successful exit removes it.</p><div class="crash-recovery-actions"><button id="crash-recovery-current-export" class="secondary" type="button">EXPORT CURRENT CHECKPOINT</button><button id="crash-recovery-checkpoint" class="secondary" type="button">CHECKPOINT NOW</button></div>';
 document.querySelector('#pause .ux-settings-body').append(panel);
 $('crash-recovery-download').addEventListener('click',()=>crashRecoveryDownload());
 $('crash-recovery-restore').addEventListener('click',crashRecoveryRestore);
 $('crash-recovery-discard').addEventListener('click',()=>{if(crashRecoveryCandidate&&confirm('Keep the current stored game and discard this interrupted-session checkpoint?')){crashRecoveryDiscard(crashRecoveryCandidate);crashRecoveryRender();}});
 $('crash-recovery-current-export').addEventListener('click',()=>crashRecoveryDownload(crashRecoveryCurrent()));
 $('crash-recovery-checkpoint').addEventListener('click',()=>crashRecoveryCheckpoint('manual'));
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&crashRecoveryActive())crashRecoveryCheckpoint('hidden');});
 document.addEventListener('freeze',()=>crashRecoveryCheckpoint('freeze'));
 window.addEventListener('pageshow',event=>{if(event.persisted){crashRecoveryClearCurrent();crashRecoveryClock=0;}crashRecoveryRender();});
 crashRecoveryInitialized=true;crashRecoveryRender();
}
