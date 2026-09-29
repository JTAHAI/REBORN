'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../src/crash-recovery.js'),'utf8')+'\nthis.CrashRecovery=CrashRecovery;';
const context=vm.createContext({Date,Math,JSON,Object,Number,String,Set,Map});vm.runInContext(source,context);const C=context.CrashRecovery;
class Storage{
 constructor(limit=Infinity){this.m=new Map();this.limit=limit;}
 get length(){return this.m.size;}key(i){return [...this.m.keys()][i]??null;}getItem(k){return this.m.has(k)?this.m.get(k):null;}
 setItem(k,v){v=String(v);if(v.length>this.limit)throw Error('quota');this.m.set(String(k),v);}removeItem(k){this.m.delete(String(k));}
}
const save=n=>({format:'REBORN_BACKUP_V1',exportedAt:'2026-09-29T00:00:00Z',save:{version:1,vehicle:{odometerMiles:n}},story:{version:1}});
let now=1000000,storage=new Storage(),journal=new C.Journal(()=>storage,{id:'session-00000001',now:()=>now});
let result=journal.checkpoint({backup:save(10),reason:'heartbeat',state:'play',build:'Build 020',baseFingerprint:C.pairFingerprint('a','b'),runtime:{world:'North Berwick, Maine',road:'Main Street',odometer:10,fuel:80,activeTrip:true}});
assert.equal(result.ok,true);assert.equal(journal.list().length,1);assert.equal(journal.list()[0].runtime.road,'Main Street');
console.log('PASS crash recovery: valid checkpoint round-trips');
now+=1000;journal.checkpoint({backup:save(11),reason:'hidden',state:'pause',runtime:{odometer:11}});assert.equal(journal.list()[0].reason,'hidden');assert.equal(journal.list()[0].backup.save.vehicle.odometerMiles,11);
console.log('PASS crash recovery: same tab updates one bounded record');
for(let i=2;i<7;i++){now+=1000;new C.Journal(()=>storage,{id:'session-0000000'+i,now:()=>now}).checkpoint({backup:save(i),runtime:{odometer:i}});}
assert.equal(journal.list().length,C.MAX_RECORDS);assert.equal(JSON.stringify(journal.list().map(r=>r.backup.save.vehicle.odometerMiles)),JSON.stringify([6,5,4]));
console.log('PASS crash recovery: oldest records are pruned deterministically');
const current=JSON.stringify(save(6).save),story=JSON.stringify(save(6).story),records=journal.list();
assert.equal(C.candidates(records,current,story).some(r=>r.backup.save.vehicle.odometerMiles===6),false);
assert.equal(C.candidates(records,'different','story','session-00000005').some(r=>r.id==='session-00000005'),false);
console.log('PASS crash recovery: current stored pair and current tab are excluded');
assert.equal(journal.discard('bad id'),false);assert.equal(journal.discard(records[0].id),true);
console.log('PASS crash recovery: explicit discard is ID-bounded');
const denied=new C.Journal(()=>{throw Error('denied');},{id:'session-denied01'});assert.equal(denied.checkpoint({backup:save(1)}).reason,'unavailable');assert.equal(denied.list().length,0);
console.log('PASS crash recovery: denied storage fails closed');
const tiny=new C.Journal(()=>new Storage(20),{id:'session-quota001'});assert.equal(tiny.checkpoint({backup:save(1)}).reason,'unavailable');
console.log('PASS crash recovery: quota failures do not report success');
const oldStorage=new Storage();const old=new C.Journal(()=>oldStorage,{id:'session-expired1',now:()=>0});old.checkpoint({backup:save(1)});now=C.MAX_AGE_MS+1000;const reader=new C.Journal(()=>oldStorage,{id:'session-reader01',now:()=>now});assert.equal(reader.list().length,0);assert.equal(oldStorage.length,0);
console.log('PASS crash recovery: expired or malformed records are removed');
assert.equal(C.normalize({format:C.FORMAT,id:'session-valid01',updatedAt:now,backup:{format:'bad'}}),null);
assert.equal(C.backupFingerprint(save(42)),C.pairFingerprint(JSON.stringify(save(42).save),JSON.stringify(save(42).story)));
console.log(JSON.stringify({crashRecoveryChecks:8,result:'passed'}));
