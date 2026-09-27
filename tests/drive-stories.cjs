'use strict';
// Production core and production North Berwick geometry, not a second implementation.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]),context=vm.createContext({console});
vm.runInContext(scripts.find(s=>s.includes('else root.RebornCore = api')),context);
const C=context.RebornCore,D=C.DriveStories,T=C.Town,clone=x=>JSON.parse(JSON.stringify(x));
const world=C.createNorthBerwickWorld(JSON.parse(fs.readFileSync(path.join(root,'assets/worlds/north-berwick/world.json'),'utf8')));
let tests=0;const test=(name,fn)=>{fn();tests++;console.log('PASS passenger stories: '+name);};
const fresh=raw=>new D.Director(raw,world);
function ctx(at=500,overrides={}){return {active:true,at,car:{x:0,z:0,yaw:0,vx:0,vz:0,forwardSpeed:0,lateralSpeed:0},vehicle:C.defaultVehicle(),input:{brake:0},roadName:'Main Street',grip:1,distanceM:0,...overrides};}
function parked(p){return {...p,vx:0,vz:0,forwardSpeed:0,lateralSpeed:0};}
function beginRide(d,id,choice,at=500){
 assert.equal(d.begin(id,at).ok,true);const point=d.currentTarget();
 d.tick(C.DT,ctx(at+.1,{car:parked(point),roadName:point.road}));
 assert.equal(d.state.active.phase,'ride');assert.equal(d.state.active.prompt.id,d.story().prompts[0]);
 assert.equal(d.choose(choice,at+.2).ok,true);return at+1;
}
function finishRoute(d,at=510){
 // Arrival positions are test fixtures. Each stop and conversation still goes
 // through production tick/choose/complete; no direct completion bypass.
 let attempts=0;
 while(d.state.active&&attempts++<12){
  const p=d.currentTarget();d.tick(C.DT,ctx(at,{car:parked(p),roadName:p.road}));
  if(d.state.active?.prompt)d.choose('silence',at+.1);
  at+=4;
 }
 assert.equal(d.state.active,null,'Route must have a reachable ending');
 return d.state.lastResult;
}
function completeStory(d,id,choice,at=500){beginRide(d,id,choice,at);return finishRoute(d,at+10);}

test('three fictional characters and three ordered North Berwick journeys',()=>{
 assert.equal(D.STORIES.length,3);assert.deepEqual(Object.keys(D.PASSENGERS),['mara','eli','nora']);
 for(const s of D.STORIES){assert.ok(s.pickup&&s.stops.length);assert.ok(D.PASSENGERS[s.passenger]);assert.equal(s.prompts.length,2);assert.ok(!/Justin|Amanda|Parker/i.test(JSON.stringify(s)));}
});
test('v1 migration preserves Living Car, town, road history and save identity',()=>{
 const s=C.validateSave({version:1,bestRun:44,vehicle:{fuel:37},town:{...T.defaults(),trust:63},journal:[{kind:'drive',miles:2}],roadKnowledge:{'Elm Street':{distanceM:99}}});
 assert.equal(s.bestRun,44);assert.equal(s.vehicle.fuel,37);assert.equal(s.town.trust,63);assert.equal(s.roadKnowledge['Elm Street'].distanceM,99);assert.equal(s.journeys.completed.length,0);assert.equal(s.journeys.relationships.mara.trust,50);assert.equal(s.version,1);
});
test('malformed, enormous and prototype-named records are bounded/rejected',()=>{
 const raw={completed:['long-way-home','first-snow'],relationships:{mara:{trust:999,__proto__:{polluted:true}}},active:{id:'bad'},history:Array.from({length:500},(_,i)=>({id:'x'+i,story:'long-way-home',outcome:'x'.repeat(400)})),choiceHistory:Array.from({length:500},()=>({story:'long-way-home',prompt:'mara-route',choice:'silence',at:Infinity})),stats:{started:Infinity}};
 const s=D.sanitize(raw);assert.deepEqual(clone(s.completed),['long-way-home']);assert.equal(s.active,null);assert.equal(s.relationships.mara.trust,100);assert.equal(s.history.length,64);assert.equal(s.choiceHistory.length,96);assert.equal(s.stats.started,0);assert.equal(Object.prototype.polluted,undefined);
 for(const id of ['__proto__','constructor','toString']){
  const a=D.sanitize({active:{id:'long-way-home',phase:'ride',prompt:{id},seen:[id]},choiceHistory:[{story:'long-way-home',prompt:id,choice:'silence'}]});
  assert.equal(a.active.prompt,null);assert.equal(a.choiceHistory.length,0);
 }
});
test('active record cannot bypass chapter order or load another passenger prompt',()=>{
 assert.equal(D.sanitize({active:{id:'first-snow',phase:'ride'}}).active,null);
 const s=D.sanitize({active:{id:'long-way-home',phase:'ride',prompt:{id:'nora-call'},commitment:'plowed',passengerAboard:false}});
 assert.equal(s.active.prompt,null);assert.equal(s.active.commitment,'');assert.equal(s.active.passengerAboard,true);
});
test('all pickup and destination anchors project onto real road segments',()=>{
 const d=fresh();for(const s of D.STORIES){for(const id of [s.pickup,...s.stops,...(s.route?.avoidNear?[s.route.avoidNear]:[])]){
  const p=d.point(id);assert.ok(p,id);assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.z)&&Number.isFinite(p.yaw));assert.ok(world.roads.some(r=>r.name===p.road));assert.ok(p.distanceFromLandmark<1500,id+' lacks road access');
 }}
 assert.equal(D.project({landmarks:[{id:'x',x:Infinity,z:0}],roads:world.roads},'x'),null);
});
test('missing mandatory road anchor fails a launch rather than making an impossible drive',()=>{
 const d=new D.Director(null,{...world,landmarks:[]});assert.equal(d.begin('long-way-home',500).ok,false);assert.equal(d.state.active,null);
});
test('pickup needs a nearby stopped car; route question appears on boarding, independent of FPS',()=>{
 const d=fresh();d.begin('long-way-home',500);const point=d.currentTarget();
 d.tick(C.DT,ctx(500.1,{car:{...parked(point),vx:12,forwardSpeed:12}}));assert.equal(d.state.active.phase,'pickup');
 d.tick(C.DT,ctx(500.2,{car:parked(point)}));assert.equal(d.state.active.phase,'ride');assert.equal(d.state.active.prompt.id,'mara-route');
 const rides=d.state.relationships.mara.rides;d.board(501);assert.equal(d.state.relationships.mara.rides,rides);
});
test('all three routes complete through every stop and unlock the next drive',()=>{
 let d=fresh();assert.deepEqual(clone(d.available().map(x=>x.unlocked)),[true,false,false]);
 completeStory(d,'long-way-home','long');d=fresh(clone(d.state));assert.deepEqual(clone(d.available().map(x=>x.unlocked)),[true,true,false]);
 completeStory(d,'last-part','safe',700);d=fresh(clone(d.state));assert.deepEqual(clone(d.available().map(x=>x.unlocked)),[true,true,true]);
 completeStory(d,'first-snow','plowed',900);assert.deepEqual(clone(d.state.completed),clone(D.STORIES.map(s=>s.id)));assert.equal(d.state.stats.completed,3);
});
test('cannot complete remotely, while moving, before an intermediate stop or with a pending answer',()=>{
 const d=fresh();d.begin('long-way-home',500);assert.equal(d.complete(ctx(501)),null);
 d.board(501);assert.equal(d.complete(ctx(502,{car:parked(d.currentTarget())})),null);
 d.choose('long',502);assert.equal(d.complete(ctx(504)),null);
 d.openPrompt('mara-arrival',505);d.choose('drive',506);
 assert.equal(d.complete(ctx(507,{car:{...parked(d.currentTarget()),vx:5}})),null);
 assert.ok(d.complete(ctx(507,{car:parked(d.currentTarget())})));
 const relay=fresh({completed:['long-way-home']});beginRide(relay,'last-part','safe');relay.openPrompt('eli-temp',502);relay.choose('silence',503);
 assert.equal(relay.complete(ctx(504,{car:parked(relay.point('riverside-farm-stand'))})),null);
});
test('early final arrival offers the second conversation instead of skipping it',()=>{
 const d=fresh();beginRide(d,'long-way-home','long');d.tick(C.DT,ctx(501,{car:parked(d.currentTarget())}));
 assert.ok(d.state.active);assert.equal(d.state.active.prompt.id,'mara-arrival');assert.equal(d.state.completed.length,0);
});
test('explicit silence and expired silence both answer once; stale/unknown answers do nothing',()=>{
 const d=fresh();d.begin('long-way-home',500);d.board(501);assert.equal(d.choose('unknown',502).ok,false);d.tick(.05,ctx(514));
 assert.equal(d.state.active.prompt,null);assert.equal(d.state.stats.silences,1);assert.equal(d.state.active.commitment,'avoid-mill');assert.equal(d.choose('long',515).ok,false);
 const expired=fresh();expired.begin('long-way-home',500);expired.board(501);expired.choose('long',515);assert.equal(expired.state.choiceHistory[0].choice,'silence');
});
test('reload re-presents the exact unanswered prompt without restarting its timer',()=>{
 let d=fresh();d.begin('long-way-home',500);d.board(501);const deadline=d.state.active.prompt.expiresAt;d=fresh(clone(d.state));d.resume();
 const p=d.takeEvents().find(e=>e.type==='prompt');assert.equal(p.id,'mara-route');assert.equal(p.expiresAt,deadline);assert.equal(d.state.stats.choices,0);
});
test('pause, negative dt and backwards town clocks cannot advance a passenger drive',()=>{
 const d=fresh();beginRide(d,'long-way-home','long');d.tick(.05,ctx(505));const before=clone(d.state);
 for(const [dt,c] of [[.05,ctx(900,{active:false})],[-1,ctx(900)],[NaN,ctx(900)],[.05,ctx(400)]])d.tick(dt,c);
 assert.deepEqual(clone(d.state),before);
});
test('Mara remembers the mill corridor and the ending does not congratulate a broken promise',()=>{
 const d=fresh();beginRide(d,'long-way-home','long');d.tick(.05,ctx(503,{car:parked(d.point('olde-woolen-mill')),roadName:'Canal Street'}));assert.equal(d.state.active.routeViolation,true);
 d.takeEvents();finishRoute(d,510);assert.equal(d.state.relationships.mara.broken,1);assert.ok(d.state.relationships.mara.trust<50);
 const lines=d.takeEvents().filter(e=>e.type==='line');assert.ok(lines.some(e=>e.text.includes('not the drive you promised')));
});
test('actual braking, body damage and road grip alter relationship results',()=>{
 const safe=fresh({completed:['long-way-home']});beginRide(safe,'last-part','safe');finishRoute(safe);
 const rough=fresh({completed:['long-way-home']});beginRide(rough,'last-part','safe');
 for(let i=0;i<6;i++){rough.tick(.1,ctx(503+i,{car:{x:0,z:0,yaw:0,vx:12,vz:0,forwardSpeed:12,lateralSpeed:5},vehicle:{...C.defaultVehicle(),body:94},input:{brake:1},grip:.3,distanceM:1}));rough.tick(.1,ctx(503.1+i));}
 assert.equal(rough.state.active.metrics.hardBrakes,6);finishRoute(rough,520);assert.equal(rough.state.relationships.eli.broken,1);assert.ok(safe.state.relationships.eli.trust>rough.state.relationships.eli.trust);
});
test('relay clock promise uses active driving seconds, not town-clock jumps',()=>{
 const d=fresh({completed:['long-way-home']});beginRide(d,'last-part','fast');d.state.active.metrics.rideSeconds=299;finishRoute(d,5000);assert.equal(d.state.relationships.eli.kept,1);
 const late=fresh({completed:['long-way-home']});beginRide(late,'last-part','fast');late.state.active.metrics.rideSeconds=301;finishRoute(late);assert.equal(late.state.relationships.eli.broken,1);
});
test('Eli decisions never create imaginary temperature repairs',()=>{
 const d=fresh({completed:['long-way-home']});beginRide(d,'last-part','safe');d.openPrompt('eli-temp',502);const choice=d.choose('ease',503);assert.ok(choice.ok);assert.equal(choice.choice.vehicle,undefined);
 for(let i=0;i<40;i++)d.tick(.1,ctx(504+i/10,{vehicle:{...C.defaultVehicle(),engineTempC:108},input:{throttle:1}}));
 assert.ok(d.state.active.metrics.strainSeconds>3);finishRoute(d,520);assert.equal(d.state.relationships.eli.broken,1);
});
test('winter wider-road promises detect the actual shortcut road names',()=>{
 let d=fresh({completed:['long-way-home','last-part']});beginRide(d,'first-snow','plowed');d.tick(.05,ctx(503,{roadName:'Old County Road'}));assert.equal(d.state.active.routeViolation,true);
 d=fresh(clone(d.state));assert.equal(d.state.active.routeEvidence,'Old County Road');finishRoute(d,510);assert.equal(d.state.relationships.nora.broken,1);
});
test('shortcut commitment needs actual shortcut evidence, not simply the chosen button',()=>{
 const d=fresh({completed:['long-way-home','last-part']});beginRide(d,'first-snow','shortcut');finishRoute(d);assert.equal(d.state.relationships.nora.kept,0);
 const yes=fresh({completed:['long-way-home','last-part']});beginRide(yes,'first-snow','shortcut');yes.tick(.05,ctx(503,{roadName:'Old County Road'}));finishRoute(yes);assert.equal(yes.state.relationships.nora.kept,1);
});
test('Nora report reward cannot be farmed by replay or reload',()=>{
 let d=fresh({completed:['long-way-home','last-part']});beginRide(d,'first-snow','plowed');d.openPrompt('nora-call',502);d.choose('call',503);assert.equal(d.takeEvents().filter(e=>e.townTrust===1).length,1);finishRoute(d);
 d=fresh(clone(d.state));beginRide(d,'first-snow','plowed',800);d.openPrompt('nora-call',802);d.choose('call',803);assert.equal(d.takeEvents().filter(e=>e.townTrust===1).length,0);
});
test('waiting for the porch light requires waiting while parked',()=>{
 const d=fresh();beginRide(d,'long-way-home','long');d.openPrompt('mara-arrival',502);d.choose('wait',503);
 assert.equal(d.complete(ctx(504,{car:parked(d.currentTarget())})),null);assert.ok(d.complete(ctx(507,{car:parked(d.currentTarget())})));
});
test('unsafe onward transport and pre-pickup cancellation do not punish the player',()=>{
 const d=fresh();beginRide(d,'long-way-home','long');d.abort('Safe onward transport',510,true);assert.equal(d.state.relationships.mara.trust,50);assert.equal(d.state.relationships.mara.broken,0);assert.equal(d.state.completed.length,0);
 const a=fresh();a.begin('long-way-home',500);a.abort('Cancelled',501);assert.equal(a.state.relationships.mara.trust,50);
 const b=fresh();beginRide(b,'long-way-home','long');b.abort('Commitment abandoned',505);assert.equal(b.state.relationships.mara.trust,48);
});
test('responses to unsafe driving are bounded and do not interrupt an unanswered prompt',()=>{
 const d=fresh();beginRide(d,'long-way-home','long');d.takeEvents();for(let i=0;i<100;i++)d.tick(.05,ctx(502+i/20,{vehicle:{...C.defaultVehicle(),engineTempC:120}}));
 assert.equal(d.takeEvents().filter(e=>e.type==='line'&&e.text.includes('Getting home')).length,1);
});
test('fuel used, road distance and actual last position survive reload',()=>{
 let d=fresh();beginRide(d,'long-way-home','long');d.tick(.05,ctx(502,{car:{...parked(d.point('allards-market')),vx:4,forwardSpeed:4},vehicle:{...C.defaultVehicle(),fuel:98},distanceM:4,roadName:'Elm Street'}));d=fresh(clone(d.state));
 assert.equal(d.state.active.metrics.fuelUsed,2);assert.equal(d.state.active.metrics.distanceM,4);assert.equal(d.state.active.lastRoad,'Elm Street');assert.ok(Number.isFinite(d.state.active.lastPosition.x));
});
test('200 repeated complete journeys produce finite bounded histories and queues',()=>{
 let d=fresh();let maxBytes=0;for(let i=0;i<200;i++){completeStory(d,'long-way-home','silence',500+i*50);assert.ok(d.events.length<=16);maxBytes=Math.max(maxBytes,JSON.stringify(d.state).length);if(i%7===0)d=fresh(clone(d.state));}
 assert.ok(d.state.history.length<=64);assert.ok(d.state.choiceHistory.length<=96);assert.ok(maxBytes<80000);assert.ok(Number.isFinite(d.state.relationships.mara.trust));
 console.log(JSON.stringify({repeatedJourneys:200,maxStateBytes:maxBytes}));
});
test('journey journal migration preserves its distinct entry kind',()=>{const s=C.validateSave({version:1,journal:[{id:'j',kind:'journey',reason:'Mara / complete',miles:3}]});assert.equal(s.journal[0].kind,'journey');assert.equal(s.stats.trips,1);});
test('modules, safe text, manual inputs and project boundary remain intact',()=>{
 for(const name of ['drive-stories','drive-stories-ui']){const source=fs.readFileSync(path.join(root,'src',name+'.js'),'utf8');assert.ok(html.includes(source));assert.ok(!/Carpooling to Hell|Grand Prix|named rivals/.test(source));assert.ok(!/fetch\(|https?:\/\//.test(source));}
 for(const token of ["KeyE:'pulse'","KeyF:'town'",'/^Digit[123]$/','id="passenger-choice"','id="passenger-open"','id="passenger-exit"'])assert.ok(html.includes(token),token);
});
test('world and vehicle checksums and immutable checkpoint remain unchanged',()=>{
 for(const [file,expected] of [['assets/worlds/north-berwick/world.json','8588954fcc6ed3c88a7336c89ea36e65213a7561e8c7a9dfdb7ad3bb7c4d0b52'],['assets/vehicles/jetta-mkiv/volkswagen-bora-jetta-mk4-2005.cc-by-4.0.glb','ac9f1d907807e5cdb0cb02beeb676f2f4ebe6c53f363d5fec3cbe183604d2e3f']])assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),expected);
 assert.ok(fs.existsSync(path.join(root,'legacy/99-5-REBORN-Build-004-PLAY.html')));
});
console.log(JSON.stringify({pass:5,stories:3,passengers:3,tests,historyLimit:64,choicesLimit:96,worldAndVehicle:'SHA256 unchanged'}));
