'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8'),scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(x=>x[1]);
const context=vm.createContext({console});vm.runInContext(scripts.find(s=>s.includes('else root.RebornCore = api')),context);
const C=context.RebornCore,W=C.WorkshopMemories,clone=x=>JSON.parse(JSON.stringify(x));
let count=0;function test(name,run){run();count++;console.log('PASS driveway memory: '+name);}
test('bounded defaults and old save migration retain existing mechanics',()=>{
 const source={version:1,vehicle:{fuel:48,odometerMiles:995.5},town:{trust:64},journal:[{id:'kept',kind:'drive',miles:2}]};
 const save=C.validateSave(source);assert.equal(save.vehicle.fuel,48);assert.equal(save.vehicle.odometerMiles,995.5);assert.equal(save.town.trust,64);assert.equal(save.journal[0].id,'kept');assert.deepEqual(clone(save.workshopMemories),{schemaVersion:1,completed:false,language:'mild',asides:true});
});
test('malformed and oversize story data cannot expand the save',()=>{
 const s=W.sanitize({schemaVersion:999,completed:'yes',language:'script',asides:false,extra:Array(10000).fill('noise')});assert.equal(JSON.stringify(s).length<120,true);assert.equal(s.completed,false);assert.equal(s.language,'mild');assert.equal(s.asides,false);assert.equal(s.extra,undefined);
 for(const raw of [null,undefined,[],42,'bad'])assert.equal(W.sanitize(raw).completed,false);
});
test('all branches complete in three choices with no failure or precision gate',()=>{
 for(const first of ['optimist','toolbox'])for(const second of ['negotiate','sailor']){
  let state=W.defaults(),a=W.choose(0,first,state);assert.equal(a.ok,true);assert.equal(a.stage,1);
  let b=W.choose(a.stage,second,a.state);assert.equal(b.ok,true);assert.equal(b.stage,2);
  let c=W.choose(b.stage,'keep',b.state);assert.equal(c.finished,true);assert.equal(c.state.completed,true);
 }
});
test('skip and full experience keep the same memory without punishment',()=>{
 const skip=clone(W.skip(W.defaults())),full=clone(W.choose(2,'keep',W.defaults()).state);assert.deepEqual(skip,full);
 assert.deepEqual(Object.keys(skip).sort(),['asides','completed','language','schemaVersion']);
});
test('story decisions do not modify provided mechanical or progress data',()=>{
 const save=C.validateSave({version:1,vehicle:{fuel:50,oil:65},town:{trust:61}}),before=JSON.stringify(save);
 W.choose(0,'optimist',save.workshopMemories);W.skip(save.workshopMemories);assert.equal(JSON.stringify(save),before);
});
test('owner facts retained and dramatized language is optional',()=>{
 const intro=W.scene(0),middle=W.scene(1);assert.match(intro.text,/red AEM/);assert.match(intro.text,/alone, in the driveway/);assert.match(intro.text,/underneath the engine/);assert.match(intro.text,/other side/);
 assert.doesNotMatch(middle.quote,/fucking/);assert.match(W.scene(1,'sailor').quote,/fucking/);assert.match(W.scene(2).quote,/cold air.*hot language/);
});
test('asides require completion and can be disabled',()=>{
 assert.equal(W.aside('repair',W.defaults()),'');assert.ok(W.aside('repair',W.skip(W.defaults())).length>10);assert.equal(W.aside('repair',{completed:true,asides:false}),'');
});
test('completed story and vocabulary setting survive save round-trip',()=>{
 const save=C.validateSave({version:1,workshopMemories:{completed:true,language:'sailor',asides:false}});const again=C.validateSave(clone(save));assert.deepEqual(clone(again.workshopMemories),clone(save.workshopMemories));
});
test('replaying 500 times has no accumulating rewards or growing history',()=>{
 let s=W.defaults();for(let i=0;i<500;i++){s=W.choose(0,'optimist',s).state;s=W.choose(1,'sailor',s).state;s=W.choose(2,'keep',s).state;}
 assert.deepEqual(clone(s),clone(W.skip(W.defaults())));
});
test('adapter is embedded, optional, non-timed and isolated from repairs',()=>{
 for(const f of ['workshop-memories.js','workshop-memory-ui.js','workshop-memory-ui.css'])assert.ok(html.includes(fs.readFileSync('src/'+f,'utf8')),f);
 const ui=fs.readFileSync('src/workshop-memory-ui.js','utf8');assert.match(ui,/dialogue is dramatized/);assert.match(ui,/no cost, wear, missed reward or repair delay/);assert.doesNotMatch(ui,/setTimeout|setInterval|vehicle\.|sim\.step|fetch\(/);
 assert.match(ui,/Back to the workshop/);assert.match(ui,/Skip to the good part/);assert.match(html,/workshopMemoryAside\(testId\)/);assert.match(html,/workshopMemoryAside\('repair'\)/);
});
console.log(JSON.stringify({workshopMemoryChecks:count,choices:'all succeed',mechanicalEffects:'none',timers:0}));
