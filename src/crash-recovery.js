// Build 020: bounded, local-only interrupted-session checkpoints.
// Every tab owns a unique record; normal page exit removes it after a successful
// main save. A browser/renderer crash leaves the record for explicit review.
const CrashRecovery = (() => {
 'use strict';
 const FORMAT='REBORN_EMERGENCY_V1';
 const PREFIX='995.reborn.emergency.v1.';
 const MAX_RECORDS=3;
 const MAX_AGE_MS=7*24*60*60*1000;
 const MAX_BYTES=3*1024*1024;
 const text=v=>v==null?'':String(v);
 function fingerprint(value){
  const s=text(value);let h=2166136261;
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}
  return (h>>>0).toString(16).padStart(8,'0')+':'+s.length;
 }
 const pairFingerprint=(saveText,storyText)=>fingerprint(text(saveText)+'\u0000'+text(storyText));
 function backupPair(backup){
  if(!backup||backup.format!=='REBORN_BACKUP_V1'||backup.save?.version!==1)return null;
  try{return [JSON.stringify(backup.save),JSON.stringify(backup.story??null)];}catch{return null;}
 }
 function backupFingerprint(backup){const pair=backupPair(backup);return pair?pairFingerprint(...pair):'';}
 function validId(id){return typeof id==='string'&&/^[a-zA-Z0-9._-]{8,96}$/.test(id);}
 function makeId(now=Date.now(),random=Math.random){return Math.floor(now).toString(36)+'-'+Math.floor(random()*0x100000000).toString(36).padStart(7,'0')+'-'+Math.floor(random()*0x100000000).toString(36).padStart(7,'0');}
 function normalize(raw,now=Date.now()){
  if(!raw||raw.format!==FORMAT||!validId(raw.id)||!Number.isFinite(raw.updatedAt))return null;
  if(raw.updatedAt>now+60000||now-raw.updatedAt>MAX_AGE_MS)return null;
  const pair=backupPair(raw.backup);if(!pair)return null;
  const state=typeof raw.state==='string'?raw.state.slice(0,32):'unknown';
  const runtime=raw.runtime&&typeof raw.runtime==='object'?{
   world:typeof raw.runtime.world==='string'?raw.runtime.world.slice(0,80):'',
   mode:typeof raw.runtime.mode==='string'?raw.runtime.mode.slice(0,24):'',
   road:typeof raw.runtime.road==='string'?raw.runtime.road.slice(0,100):'',
   odometer:Number.isFinite(raw.runtime.odometer)?Math.max(0,raw.runtime.odometer):0,
   fuel:Number.isFinite(raw.runtime.fuel)?Math.max(0,Math.min(100,raw.runtime.fuel)):0,
   activeTrip:!!raw.runtime.activeTrip,
   recordingSeconds:Number.isFinite(raw.runtime.recordingSeconds)?Math.max(0,raw.runtime.recordingSeconds):0
  }:{};
  return {format:FORMAT,id:raw.id,updatedAt:raw.updatedAt,startedAt:Number.isFinite(raw.startedAt)?raw.startedAt:raw.updatedAt,reason:typeof raw.reason==='string'?raw.reason.slice(0,80):'checkpoint',state,build:typeof raw.build==='string'?raw.build.slice(0,80):'',baseFingerprint:typeof raw.baseFingerprint==='string'?raw.baseFingerprint.slice(0,80):'',backupFingerprint:backupFingerprint(raw.backup),backup:{format:'REBORN_BACKUP_V1',exportedAt:typeof raw.backup.exportedAt==='string'?raw.backup.exportedAt.slice(0,40):'',save:raw.backup.save,story:raw.backup.story??null},runtime};
 }
 class Journal {
  constructor(getStorage,options={}){
   this.getStorage=getStorage;this.prefix=options.prefix||PREFIX;this.now=options.now||Date.now;this.id=options.id||makeId(this.now(),options.random||Math.random);this.startedAt=this.now();this.last={ok:false,reason:'empty'};
  }
  key(id=this.id){return this.prefix+id;}
  storage(){const s=this.getStorage();if(!s)throw new Error('storage unavailable');return s;}
  list(prune=true){
   let storage;try{storage=this.storage();}catch{return [];}
   const now=this.now(),records=[];let keys=[];
   try{for(let i=0;i<storage.length;i++){const key=storage.key(i);if(key?.startsWith(this.prefix))keys.push(key);}}
   catch{return [];}
   for(const key of keys){let record=null;try{const raw=storage.getItem(key);if(raw&&raw.length<=MAX_BYTES)record=normalize(JSON.parse(raw),now);}catch{}
    if(record)records.push(record);else if(prune)try{storage.removeItem(key);}catch{}
   }
   return records.sort((a,b)=>b.updatedAt-a.updatedAt||a.id.localeCompare(b.id));
  }
  checkpoint(value={}){
   let storage;try{storage=this.storage();}catch{return this.last={ok:false,reason:'unavailable'};}
   const backup=value.backup,pair=backupPair(backup);if(!pair)return this.last={ok:false,reason:'invalid'};
   const record={format:FORMAT,id:this.id,startedAt:this.startedAt,updatedAt:this.now(),reason:text(value.reason||'checkpoint').slice(0,80),state:text(value.state||'unknown').slice(0,32),build:text(value.build||'').slice(0,80),baseFingerprint:text(value.baseFingerprint||'').slice(0,80),backupFingerprint:pairFingerprint(...pair),backup,runtime:value.runtime&&typeof value.runtime==='object'?value.runtime:{}};
   let body;try{body=JSON.stringify(record);}catch{return this.last={ok:false,reason:'invalid'};}
   if(body.length>MAX_BYTES)return this.last={ok:false,reason:'too-large',bytes:body.length};
   try{storage.setItem(this.key(),body);}catch{return this.last={ok:false,reason:'unavailable',bytes:body.length};}
   const keep=new Set(this.list(false).slice(0,MAX_RECORDS).map(r=>r.id));keep.add(this.id);
   try{for(let i=storage.length-1;i>=0;i--){const key=storage.key(i);if(key?.startsWith(this.prefix)&&!keep.has(key.slice(this.prefix.length)))storage.removeItem(key);}}catch{}
   return this.last={ok:true,reason:'saved',bytes:body.length,record:normalize(record,this.now())};
  }
  clear(){try{this.storage().removeItem(this.key());this.last={ok:true,reason:'cleared'};return true;}catch{this.last={ok:false,reason:'unavailable'};return false;}}
  discard(id){if(!validId(id))return false;try{this.storage().removeItem(this.key(id));return true;}catch{return false;}}
 }
 function candidates(records,currentSaveText,currentStoryText,currentId=''){
  const current=pairFingerprint(currentSaveText,currentStoryText),map=new Map();
  for(const raw of records||[]){const record=normalize(raw);if(!record||record.id===currentId||record.backupFingerprint===current)continue;const old=map.get(record.id);if(!old||old.updatedAt<record.updatedAt)map.set(record.id,record);}
  return [...map.values()].sort((a,b)=>b.updatedAt-a.updatedAt||a.id.localeCompare(b.id));
 }
 return Object.freeze({FORMAT,PREFIX,MAX_RECORDS,MAX_AGE_MS,MAX_BYTES,fingerprint,pairFingerprint,backupFingerprint,makeId,normalize,Journal,candidates});
})();
