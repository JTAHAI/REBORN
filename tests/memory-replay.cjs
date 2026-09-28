#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]),box=vm.createContext({console});
vm.runInContext(scripts.find(s=>s.includes('else root.RebornCore = api')),box);const C=box.RebornCore,M=C.MemoryReplay,clone=x=>JSON.parse(JSON.stringify(x));
let tests=0;const test=(name,fn)=>{fn();tests++;console.log('PASS memory replay: '+name);};
const car=(x=10,z=20,yaw=.3)=>({x,z,yaw,vx:5,vz:0});
const context=(t=0)=>({running:true,car:car(10+t,20+t*.3,.3+t*.001),input:{throttle:.6,brake:0},vehicle:{engineTempC:92+t*.01,battery:88-t*.01,brakes:80},speed:8,distanceM:.8,diagnostics:{bearing:.2,charging:.1,cooling:.05,clutch:.3,brakes:.1}});
function recording(id='memory-test',seconds=20){const r=new M.Recorder();r.begin({id,world:'NORTH BERWICK, MAINE',mode:'free',car:car(),createdAt:'2026-09-27T00:00:00Z'});for(let i=0;i<seconds*4;i++)r.sample(.25,context(i/4));r.road('Main Street',{car:car(12,22),road:'Main Street'});r.mark('warning','Coolant temperature high',{car:car(13,23),road:'Main Street'});return r.finish({car:car(30,26),vehicle:{engineTempC:95,battery:86},endRoad:'Elm Street',distanceM:seconds*8,maxMph:32});}
test('core version and module are shipped',()=>{assert.equal(C.VERSION,'0.14.0-hometown-ux-p017');assert.ok(M&&M.Recorder&&M.Player);assert.equal(M.LIMITS.recordings,5);});
test('old version-one save migrates without losing earlier gameplay state',()=>{const s=C.validateSave({version:1,vehicle:{fuel:41,odometerMiles:995},town:{trust:63},journeys:{completed:['long-way-home']},echoes:{active:false},journal:[{kind:'journey',reason:'ride'}]});assert.equal(s.vehicle.fuel,41);assert.equal(s.vehicle.odometerMiles,995);assert.equal(s.town.trust,63);assert.equal(s.journeys.completed.length,1);assert.equal(s.journal.length,1);assert.equal(s.memories.enabled,true);assert.equal(s.memories.recordings.length,0);});
test('malformed state, duplicate IDs and prototype-shaped values are sanitized',()=>{const good=recording('same');const raw={enabled:'yes',diagnosticAudio:false,selectedId:'bad',recordings:[good,{...good},{id:'bad',samples:[[0,Infinity,0,0,0,0,0,20,100],[1,0,0,0,0,0,0,20,100]]},{__proto__:{polluted:true}}],history:Array(1000).fill({type:'unknown'}),stats:{recorded:Infinity}};const s=M.sanitize(raw);assert.equal(s.enabled,true);assert.equal(s.diagnosticAudio,false);assert.equal(s.recordings.length,1);assert.equal(s.selectedId,'same');assert.equal(s.history.length,0);assert.equal(s.stats.recorded,0);assert.equal(Object.prototype.polluted,undefined);});
test('eligible recording captures route, controls, diagnostics and markers',()=>{const rec=recording();assert.ok(rec.samples.length>4);assert.ok(rec.duration>=19);assert.ok(rec.distanceM>100);assert.equal(rec.startRoad,'Main Street');assert.equal(rec.endRoad,'Elm Street');assert.ok(rec.markers.some(m=>m.type==='warning'));assert.ok(rec.diagnostics.clutch>=.3);assert.ok(rec.maxTemp>92);assert.ok(rec.minBattery<88);});
test('short stationary drafts are discarded rather than filling the save',()=>{const r=new M.Recorder();r.begin({id:'tiny',world:'NORTH BERWICK, MAINE',mode:'free',car:car()});r.sample(.2,{...context(),distanceM:0});assert.equal(r.finish({car:car()}),null);assert.equal(r.state.recordings.length,0);});
test('recording list is bounded and newest recordings replace oldest',()=>{const r=new M.Recorder();for(let i=0;i<9;i++){r.begin({id:'m'+i,world:'NORTH BERWICK, MAINE',mode:'free',car:car()});for(let j=0;j<20;j++)r.sample(.5,context(j));r.finish({car:car(30+i,22),distanceM:100,endRoad:'Elm Street'});}assert.equal(r.state.recordings.length,5);assert.equal(r.state.recordings[0].id,'m8');assert.equal(r.state.recordings.at(-1).id,'m4');});
test('long drives downsample adaptively and never exceed sample cap',()=>{const r=new M.Recorder();r.begin({id:'long',world:'NORTH BERWICK, MAINE',mode:'free',car:car()});for(let i=0;i<20000;i++)r.sample(.25,context(i*.1));assert.ok(r.draft.samples.length<=M.LIMITS.samples);assert.ok(r.draft.interval>.75);const rec=r.finish({car:car(2000,2000),distanceM:16000,endRoad:'Elm Street'});assert.ok(rec.samples.length<=M.LIMITS.samples);});
test('markers are deduplicated and bounded',()=>{const r=new M.Recorder();r.begin({id:'marks',world:'NORTH BERWICK, MAINE',mode:'free',car:car()});for(let i=0;i<12;i++)r.sample(.5,context(i));for(let i=0;i<100;i++)r.mark('warning','same',{car:car(i,0),road:'Main Street'});r.mark('warning','different',{car:car(1,1),road:'Elm Street'});const rec=r.finish({car:car(20,20),distanceM:100});assert.ok(rec.markers.length<=M.LIMITS.markers);assert.equal(rec.markers.filter(m=>m.label==='same').length,1);});
test('interpolation follows position and shortest yaw path',()=>{const rec=M.cleanRecording({id:'turn',samples:[[0,0,0,3.1,0,0,0,20,100,0,0,0,0,0],[2,10,4,-3.1,10,1,0,30,90,1,0,0,0,0]]});const s=M.interpolate(rec,1);assert.equal(s.x,5);assert.equal(s.z,2);assert.ok(Math.abs(Math.abs(s.yaw)-Math.PI)<.08);assert.equal(s.speed,5);assert.equal(s.diagnostics.bearing,.5);});
test('route extraction stays bounded and retains endpoints',()=>{const rec=recording('route',400),route=M.route(rec,40);assert.ok(route.length<=41);assert.equal(route[0].t,rec.samples[0][0]);assert.equal(route.at(-1).t,rec.samples.at(-1)[0]);});
test('ghost player pauses, seeks, loops and stops deterministically',()=>{const rec=recording('ghost',10),p=new M.Player(rec,{loop:true});p.tick(2);const t=p.time;p.toggle();p.tick(5);assert.equal(p.time,t);p.toggle();p.seek(.5,true);assert.ok(Math.abs(p.progress()-.5)<.01);p.tick(rec.duration);assert.ok(p.time<rec.duration);assert.ok(p.props().length>3);});
test('cinematic replay speed and camera controls remain bounded',()=>{const p=new M.Player(recording('replay',10),{speed:4,camera:3});assert.equal(p.speed,4);assert.equal(p.camera,3);assert.equal(p.cycleCamera(),0);p.tick(1);assert.equal(p.time,4);p.seek(999);assert.equal(p.finished,true);p.restart();assert.equal(p.time,0);assert.equal(p.finished,false);});
test('diagnostic levels combine faults and brake wear without nonfinite values',()=>{const d=M.diagnosticLevels({brakes:15},{bearing:.6,charging:Infinity,cooling:-2,clutch:.4,brakeHydraulics:.2});assert.equal(d.bearing,.6);assert.equal(d.charging,0);assert.equal(d.cooling,0);assert.equal(d.clutch,.4);assert.ok(d.brakes>.6&&d.brakes<=1);});
test('playback counters and history are bounded and deletion is persistent',()=>{const r=new M.Recorder({recordings:[recording('one')]});const rec=r.selected();for(let i=0;i<100;i++)r.notePlayback(i%2?'ghost':'replay',rec);assert.equal(r.state.history.length,M.LIMITS.history);assert.equal(r.delete(rec.id),true);assert.equal(r.state.recordings.length,0);assert.equal(r.state.stats.deletes,1);});
test('draft state survives export and reload once meaningful samples exist',()=>{let r=new M.Recorder();r.begin({id:'draft',world:'NORTH BERWICK, MAINE',mode:'free',car:car()});for(let i=0;i<20;i++)r.sample(.5,context(i));const exported=r.export();r=new M.Recorder(clone(exported));assert.ok(r.draft);assert.equal(r.draft.id,'draft');const before=r.draft.samples.length;r.sample(1,context(50));assert.ok(r.draft.samples.length>=before);});
test('journal migration preserves memory linkage fields',()=>{const s=C.validateSave({version:1,journal:[{id:'d',kind:'drive',memoryId:'memory-d',memorySamples:120,miles:2}]});assert.equal(s.journal[0].memoryId,'memory-d');assert.equal(s.journal[0].memorySamples,120);});
test('200 generated recordings remain finite, bounded and reload-safe',()=>{let r=new M.Recorder(),max=0;for(let i=0;i<200;i++){r.begin({id:'bulk-'+i,world:'NORTH BERWICK, MAINE',mode:'free',car:car()});for(let j=0;j<30;j++)r.sample(.5,context(j+i));r.finish({car:car(i+30,20),distanceM:200,endRoad:'Elm Street'});if(i%11===0)r=new M.Recorder(clone(r.export()));max=Math.max(max,JSON.stringify(r.export()).length);}const s=r.export();assert.equal(s.recordings.length,5);assert.ok(s.history.length<=M.LIMITS.history);assert.ok(max<700000);for(const rec of s.recordings)for(const sample of rec.samples)for(const v of sample)assert.ok(Number.isFinite(v));console.log(JSON.stringify({recordings:200,maxStateBytes:max}));});
test('source modules are embedded, local-only and project boundary stays clean',()=>{for(const name of ['memory-replay','memory-replay-ui','diagnostic-audio']){const ext=name==='memory-replay-ui'?'js':'js',source=fs.readFileSync(path.join(root,'src',name+'.'+ext),'utf8');assert.ok(html.includes(source));assert.ok(!/Carpooling to Hell|Grand Prix|named rivals/.test(source));assert.ok(!/fetch\(|https?:\/\//.test(source));}for(const token of ['DRIVE MEMORIES','memory-ghost-strip','memory-replay-progress',"KeyG",'Diagnostic mechanical audio'])assert.ok(html.includes(token),token);});
test('canonical world, owner-correct MkIV and immutable Build 004 are unchanged',()=>{for(const [file,expected] of [['assets/worlds/north-berwick/world.json','8588954fcc6ed3c88a7336c89ea36e65213a7561e8c7a9dfdb7ad3bb7c4d0b52'],['assets/vehicles/jetta-mkiv/volkswagen-bora-jetta-mk4-2005.cc-by-4.0.glb','ac9f1d907807e5cdb0cb02beeb676f2f4ebe6c53f363d5fec3cbe183604d2e3f'],['legacy/99-5-REBORN-Build-004-PLAY.html','5ef42f30b501362aa82432b7575d90a928396639cdd672d61d2ae6f8f6caeb4f']])assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),expected);});
// Regression cases added after the independent interrupted-candidate review.
test('finishing a trip never counts its summary mileage twice',()=>{
 const r=new M.Recorder();r.begin({id:'distance',world:'NORTH BERWICK, MAINE',mode:'free',car:car()});
 for(let i=1;i<=20;i++)r.sample(.5,{...context(i),distanceM:1});
 const rec=r.finish({...context(21),distanceM:20});assert.equal(rec.distanceM,20);
});
test('same-time forced end samples replace rather than duplicate the final pose',()=>{
 const r=new M.Recorder();r.begin({id:'final',car:car()});for(let i=0;i<8;i++)r.sample(1,context(i));
 const rec=r.finish(context(8));for(let i=1;i<rec.samples.length;i++)assert.ok(rec.samples[i][0]>rec.samples[i-1][0]);
});
test('invalid times and impossible positions cannot create replay teleports',()=>{
 const raw={id:'times',samples:[[0,0,0,0,1,0,0,20,100],[2,2,0,0,1,0,0,20,100],[NaN,44,0,0,1,0,0,20,100],[1,333,0,0,1,0,0,20,100],[3,1e20,0,0,1,0,0,20,100],[4,4,0,0,1,0,0,20,100]]};
 const r=M.cleanRecording(raw);assert.deepEqual(clone(r.samples.map(s=>s[0])),[0,2,4]);assert.ok(r.samples.every(s=>s[1]<=4));
});
test('multi-revolution headings normalize instead of flattening to a half turn',()=>{
 const r=new M.Recorder();r.begin({id:'yaw',car:car(0,0,Math.PI*4+.3)});for(let i=0;i<4;i++)r.sample(1,{...context(i),car:car(i,0,Math.PI*4+.3)});
 const rec=r.finish();for(const s of rec.samples)assert.ok(Math.abs(s[3]-.3)<.0001);
});
test('route downsampling honors exact caller cap and both endpoints',()=>{
 const rec=recording('bounded-route',400);for(const cap of [2,3,7,40,180]){const points=M.route(rec,cap);assert.ok(points.length<=cap);assert.equal(points[0].t,rec.samples[0][0]);assert.equal(points.at(-1).t,rec.samples.at(-1)[0]);}
 assert.ok(M.route(rec,Infinity).length<=180);
});
test('a recovery creates a discontinuity without a phantom drive across town',()=>{
 const r=new M.Recorder();r.begin({id:'recovery',car:car(0,0)});r.sample(1,{...context(),car:car(1,0),distanceM:1});r.sample(1,{...context(),car:car(600,0),distanceM:1});r.sample(1,{...context(),car:car(601,0),distanceM:1});
 const rec=r.finish();assert.equal(rec.samples[2][14],1);assert.equal(M.interpolate(rec,1.5).x,1);assert.equal(M.interpolate(rec,2).x,600);
 const points=M.route(rec,3);assert.ok(points.some(p=>p.breakBefore));
});
test('downsampling retains recovery breaks even when the original break point is skipped',()=>{
 const r=new M.Recorder();r.begin({id:'downsample-break',car:car(0,0)});for(let i=1;i<=900;i++)r.sample(1,{...context(),car:car(i+(i>=333?1000:0),0)});
 const rec=r.finish();assert.ok(rec.interval>.75);assert.ok(rec.samples.some(s=>s[14]===1));assert.ok(M.route(rec,40).some(p=>p.breakBefore));
});
test('finished replay play button restarts the selected memory',()=>{const p=new M.Player(recording('end',5));p.tick(20);assert.equal(p.finished,true);p.toggle();assert.equal(p.finished,false);assert.equal(p.paused,false);assert.equal(p.time,0);p.tick(.5);assert.equal(p.time,.5);});
test('ghost and replay reject active passenger and Echo Roads commitments',()=>{
 const h=adapterHarness();h.passengerDirector={state:{active:{id:'long-way-home'}}};assert.equal(h.startMemoryGhost(),false);assert.equal(h.startMemoryReplay(),false);assert.equal(h.state,'journey');
 h.passengerDirector=null;h.echoDirector={state:{active:true}};assert.equal(h.startMemoryGhost(),false);assert.equal(h.startMemoryReplay(),false);assert.equal(h.state,'journey');
});
// Execute the production application adapter, substituting only browser/renderer plumbing.
function adapterHarness(){
 const rec=recording('read-only',30);for(const s of rec.samples){s[7]=140;s[8]=8;s[9]=.8;}
 const initial=C.validateSave({version:1,vehicle:{fuel:51,battery:89,engineTempC:83,odometerMiles:411},memories:{recordings:[rec]}});
 const elements={};const get=id=>elements[id]||(elements[id]={id,hidden:false,textContent:'',style:{},value:0,focus(){env.focused=id;}});
 const simulation=new C.Simulation();simulation.time=57;simulation.car.x=25;simulation.car.z=40;
 const env={console,C,save:initial,vehicle:initial.vehicle,sim:simulation,state:'journey',settings:{sound:true,units:'mph'},director:{active:false},passengerDirector:null,echoDirector:null,activeTrip:null,currentRoadName:'Main Street',lastInput:{throttle:0},cameraStyle:2,cameraEye:null,cameraTarget:null,journeyReturnState:'play',accumulator:0,northBerwickWorld:{northBerwick:true,bounds:{minX:-10000,minZ:-10000,maxX:10000,maxZ:10000}},blackwaterWorld:simulation.world,document:{activeElement:{focus(){}}},$ : get,notify(){},faultSeverity(){return 0;},input:{clear(){}},renderCalls:[],audio:{start(){},updateDiagnostics(ctx){env.audioContext=ctx;},diagnosticSnapshot(){return{};}},persist(){env.persisted=JSON.parse(JSON.stringify({vehicle:env.vehicle,time:env.sim.time}));},showState(){},selectDriverTab(){},updateJourneyPanel(){},appendJournal(entry){env.journal.push(entry);},journal:[],escapeHtml:s=>s,closeJourney(){},renderer:{setCamera(eye,target){env.renderCalls.push({eye:[...eye],target:[...target]});}}};
 env.activateWorld=w=>{env.sim.world=w;};vm.createContext(env);vm.runInContext(fs.readFileSync(path.join(root,'src/memory-replay-ui.js'),'utf8')+'\nrenderMemoryPanel=()=>{};',env);return env;
}
test('production replay is read-only for live mechanics, saves and simulation time',()=>{
 const h=adapterHarness(),before=clone(h.vehicle),pose=clone(h.sim.car),world=h.sim.world;
 assert.equal(h.startMemoryReplay('read-only'),true);assert.equal(vm.runInContext('memoryReplay.paused',h),true);vm.runInContext('memoryReplay.toggle()',h);assert.deepEqual(clone(h.vehicle),before);assert.deepEqual(h.persisted.vehicle,before);assert.equal(h.persisted.time,57);
 h.tickMemoryReplay(1);h.persist();assert.deepEqual(h.persisted.vehicle,before);assert.equal(h.sim.time,57);
 h.exitMemoryReplay();assert.deepEqual(clone(h.sim.car),pose);assert.strictEqual(h.sim.world,world);assert.deepEqual(clone(h.vehicle),before);assert.equal(h.focused,'ux-tab-memories');
});
test('production roadside camera remains anchored while the replayed car moves',()=>{
 const h=adapterHarness();h.startMemoryReplay('read-only');vm.runInContext('memoryReplay.toggle();memoryReplay.camera=1;memoryReplay.seek(1)',h);h.tickMemoryReplay(.1);h.updateMemoryReplayCamera(.1);h.tickMemoryReplay(1);h.updateMemoryReplayCamera(.1);
 assert.deepEqual(h.renderCalls[0].eye,h.renderCalls[1].eye);assert.notDeepEqual(h.renderCalls[0].target,h.renderCalls[1].target);
});
test('paused and background replay silence diagnostics and freeze cinematic time',()=>{
 const h=adapterHarness();h.startMemoryReplay('read-only');vm.runInContext('memoryReplay.toggle()',h);h.tickMemoryReplay(1);h.updateDiagnosticAudio();assert.equal(h.audioContext.active,true);h.pauseMemoryReplay();assert.equal(h.audioContext.active,false);const before=vm.runInContext('memoryReplayClock',h);h.tickMemoryReplay(10);assert.equal(vm.runInContext('memoryReplayClock',h),before);
});
test('interrupted drives are archived separately rather than joined to a fresh spawn',()=>{
 const h=adapterHarness();h.sim.world=h.northBerwickWorld;h.sim.mode='free';h.state='play';h.activeTrip={id:'new',startedAt:'2026-09-27T00:00:00Z',world:'NORTH BERWICK, MAINE'};
 vm.runInContext("memoryRecorder.begin({id:'interrupted',world:'NORTH BERWICK, MAINE',mode:'free',car:sim.car});for(let i=0;i<8;i++)memoryRecorder.sample(1,{car:{x:500+i,z:40,yaw:0},distanceM:1,vehicle});",h);
 const before=h.sim.car.x;h.beginMemoryRecording('free');assert.equal(h.sim.car.x,before);assert.equal(h.save.memories.recordings.filter(r=>r.id==='interrupted').length,1);assert.equal(h.journal.length,1);assert.equal(h.journal[0].memoryId,'interrupted');assert.equal(vm.runInContext('memoryRecorder.draft.id',h),'memory-new');
});
function mockAudioEngine(){
 const parameter=()=>({value:0,setTargetAtTime(v){this.value=v;}});let created=0;
 class A{constructor(){this.enabled=true;this.master={};this.context={currentTime:0,createOscillator(){created++;return {frequency:parameter(),connect(){},start(){}};},createGain(){created++;return{gain:parameter(),connect(){}};}};}tone(){}}
 const e={};vm.createContext(e);vm.runInContext(fs.readFileSync(path.join(root,'src/diagnostic-audio.js'),'utf8'),e);e.installDiagnosticAudio(A);return {engine:new A(),created:()=>created};
}
test('diagnostic sound channels allocate once, stay bounded, and mute when disabled',()=>{
 const h=mockAudioEngine(),a=h.engine;
 a.updateDiagnostics({active:false,enabled:true,levels:{bearing:1}});assert.equal(h.created(),0);
 for(let i=0;i<1000;i++)a.updateDiagnostics({active:true,levels:{bearing:.6,charging:.4,cooling:.3,clutch:.2,brakes:.5},speed:20,load:.8,brake:.5,temp:115});
 assert.equal(h.created(),10);assert.ok(Object.values(a.diagnosticSnapshot().levels).every(v=>Number.isFinite(v)&&v>=0&&v<.1));
 a.updateDiagnostics({active:true,enabled:false,levels:{bearing:1}});assert.ok(Object.values(a.diagnosticSnapshot().levels).every(v=>v===0));
});

test('coasting recorder clock stays equal to simulated time across slow rendering and pause',()=>{
 const r=new M.Recorder();r.begin({id:'slow-frames',car:car()});let simulated=0;
 for(let frame=0;frame<320;frame++){for(let i=0;i<9;i++){const dt=1/120;simulated+=dt;r.sample(dt,{...context(simulated),input:{throttle:0,brake:0},distanceM:.01});}}
 assert.ok(r.draft.duration>16);assert.ok(Math.abs(r.draft.duration-simulated)<1e-10);
 const before=r.draft.duration;r.sample(120,{running:false,car:car()});assert.equal(r.draft.duration,before);
 const rec=r.finish();assert.ok(rec.duration>16);assert.ok(rec.samples.length>16);
});
console.log(JSON.stringify({pass:7,tests,recordingLimit:M.LIMITS.recordings,sampleLimit:M.LIMITS.samples,markers:M.LIMITS.markers,remainingPasses:1}));
