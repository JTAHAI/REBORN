// Build 018: one cooperating writer per origin, plus raw-pair stale-save checks.
// Web Locks excludes other Build 018 writers. Older clients do not honor that
// lock; comparing the expected raw pair is defense-in-depth, not a transaction.
const SessionSaves = (() => {
 'use strict';
 const messages={pending:'Checking which game tab may save…',other:'Another REBORN tab is saving. This tab is session-only.',conflict:'Stored progress changed in another tab. This session will not overwrite it.',unavailable:'Browser storage is unavailable. Export this session before closing.',unknown:'The original stored pair could not be read. Reload before enabling saves.',released:'This page is no longer the saving tab. Reload before enabling saves.'};
 class Guard {
  constructor(getStorage,saveKey,storyKey,saveText,storyText,known=true){
   this.getStorage=getStorage;this.keys=[saveKey,storyKey];this.expected=[saveText,storyText];this.known=known;
   this.mode='pending';this.conflict=false;this.last={ok:false,reason:'pending',message:messages.pending};this.generation=0;this.finish=null;this.changed=()=>{};
  }
  fail(reason){this.last={ok:false,reason,message:messages[reason]||messages.unavailable};return this.last;}
  status(){return {mode:this.mode,conflict:this.conflict,reason:this.last.reason||'',canWrite:!this.conflict&&this.known&&['owner','fallback'].includes(this.mode),message:this.last.message||''};}
  // Called once on startup, and explicitly on BFCache restoration only. A busy
  // tab never silently acquires ownership when the other page later disappears.
  begin(locks,onChange=()=>{}){
   this.release();this.changed=onChange;const generation=++this.generation;
   this.mode='pending';this.fail('pending');this.changed();
   if(!locks?.request){this.mode='fallback';this.check();this.changed();return;}
   try{Promise.resolve(locks.request('995.reborn.save-writer.v1',{mode:'exclusive',ifAvailable:true},lock=>{
    if(generation!==this.generation)return;
    if(!lock){this.mode='other';this.fail('other');this.changed();return;}
    this.mode='owner';const held=new Promise(resolve=>{this.finish=resolve;});this.check();this.changed();return held;
   })).catch(()=>{if(generation===this.generation){this.mode='unavailable';this.fail('unavailable');this.changed();}});}
   catch{this.mode='unavailable';this.fail('unavailable');this.changed();}
  }
  release(){++this.generation;const finish=this.finish;this.finish=null;this.mode='released';this.fail('released');if(finish)finish();}
  read(){const storage=this.getStorage();return {storage,pair:this.keys.map(k=>storage.getItem(k))};}
  check(){
   if(this.conflict)return this.fail('conflict');
   if(!this.known)return this.fail('unknown');
   if(!['owner','fallback'].includes(this.mode))return this.fail(this.mode);
   try{const current=this.read();if(current.pair.some((v,i)=>v!==this.expected[i])){this.conflict=true;return this.fail('conflict');}this.last={ok:true};return {...this.last,...current};}
   catch{return this.fail('unavailable');}
  }
  write(saveText,storyText,recovery=null){
   const check=this.check();if(!check.ok)return check;
   const storage=check.storage,pair=[saveText,storyText],changes=[];
   const put=(key,value)=>{const before=storage.getItem(key);if(before===value)return;storage.setItem(key,value);changes.push({key,before,value});};
   try{
    if(recovery)put(recovery.key,recovery.text);
    pair.forEach((value,i)=>put(this.keys[i],value));
    // Also observe a non-cooperating writer interleaving with this attempt.
    if(this.keys.some((k,i)=>storage.getItem(k)!==pair[i])){this.conflict=true;return this.fail('conflict');}
    this.expected=pair;this.last={ok:true};return this.last;
   }catch{
    let restored=true;
    for(const c of changes.reverse())try{
     const current=storage.getItem(c.key);
     if(current===c.value){if(c.before===null)storage.removeItem(c.key);else storage.setItem(c.key,c.before);}
     else if(current!==c.before)restored=false; // Do not roll back somebody else's new value.
    }catch{restored=false;}
    if(!restored){this.conflict=true;this.last={ok:false,reason:'conflict',restored:false,message:'Storage refused the write and complete recovery. Export this session and inspect stored data before reloading.'};}
    else this.last={ok:false,reason:'unavailable',restored:true,message:'Save failed. Previous stored progress and recovery copy were retained. Export this session before closing.'};
    return this.last;
   }
  }
 }
 return Object.freeze({Guard});
})();
